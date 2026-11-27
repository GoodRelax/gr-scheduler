// Test helper: reads a numbered spec table from the .md at run time, so no copy can fall behind it.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

const SPEC = join(process.cwd(), 'docs', 'spec')

export interface SpecRow {
  readonly id: string
  readonly cells: readonly string[]
  readonly by: Readonly<Record<string, string>>
}

export interface SpecTable {
  readonly id: string
  readonly caption: string
  readonly file: string
  readonly headings: readonly string[]
  readonly rows: readonly SpecRow[]
}

const FILES = [
  '01-04-requirements.md',
  '05-07-design.md',
  '08-10-test.md',
  'A-appendix.md',
  join('_assets', 'tbl-glossary.md'),
  join('_assets', 'tbl-settings.md'),
  join('_assets', 'tbl-property-items.md'),
  join('_assets', 'tbl-published-entries.md'),
  join('_assets', 'tbl-notice-reasons.md'),
  join('_assets', 'tbl-agent-api-members.md'),
  join('_assets', 'tbl-document-commands.md'),
  join('_assets', 'fig-erd-detail.md'),
  join('_assets', 'fig-erd-overview.md'),
  join('_assets', 'tbl-state-machines.md'),
]

// Why: a Japanese literal, admitted by rule 03 section 5: it is the heading the
// Japanese manuscript writes over the row-ID column, and matching it is this file's job.
const ROW_ID_HEADING = '行 ID'

// Why: a wrapped cell's `<br>` stands where the text had no character, so it is
// dropped, not read as a space; a space would break every quote of a wrapped cell.
const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.replace(/<br\s*\/?>/gi, '').trim())

const isSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line.trim())

export function specTable(id: string): SpecTable {
  const held = TABLES_READ.get(id)
  if (held === undefined) {
    const read = readSpecTable(id)
    TABLES_READ.set(id, read)
    return copyOf(read)
  }
  return copyOf(held)
}

// Why: one read and split per test file, not per call -- the grab-area scans call this
// Why: hundreds of times per case (DFC-2312); each test file still loads its own module.
const LINES_READ = new Map<string, readonly string[]>()
const TABLES_READ = new Map<string, SpecTable>()

// Trap: hand out copies -- a test that edits a cached table would change what later cases read.
const copyOf = (table: SpecTable): SpecTable => ({
  ...table,
  headings: [...table.headings],
  rows: table.rows.map((row) => ({ id: row.id, cells: [...row.cells], by: { ...row.by } })),
})

// Why: an empty read is not kept, so the next call reads the manuscript again (DFC-255).
function manuscriptLines(file: string): readonly string[] | null {
  const held = LINES_READ.get(file)
  if (held !== undefined) return held
  const text = readRepoFile(join(SPEC, file), 'utf8')
  if (text.trim().length === 0) return null
  const lines = text.split('\n')
  LINES_READ.set(file, lines)
  return lines
}

function readSpecTable(id: string): SpecTable {
  const unreadable: string[] = []
  for (const file of FILES) {
    // Why: a manuscript held open by an edit or the syncing folder throws EBUSY; the
    // read is caught and named so the false red does not look like a table defect.
    let lines: readonly string[] | null
    try {
      lines = manuscriptLines(file)
    } catch (cause) {
      unreadable.push(`${file} (${cause instanceof Error ? cause.message : String(cause)})`)
      continue
    }
    // Why: the same moment can also hand back an empty or half-written file, so an
    // empty read is named too.
    if (lines === null) {
      unreadable.push(`${file} (read back empty)`)
      continue
    }
    const at = lines.findIndex((line) => line.startsWith(`**表 ${id} —`))
    if (at < 0) continue

    const caption = lines[at]?.replace(/\*\*/g, '').trim() ?? ''
    let headings: string[] = []
    const rows: SpecRow[] = []

    for (const line of lines.slice(at + 1)) {
      if (line.startsWith('**表 ') || line.startsWith('#')) break
      if (!line.trim().startsWith('|')) continue
      if (isSeparator(line)) continue
      const row = cells(line)
      if (headings.length === 0) {
        // Why: the heading row is searched for, not taken as the first row: T-012a puts
        // a vertex table before its row-ID table under the same caption.
        if (row[0] === ROW_ID_HEADING) headings = row
        continue
      }
      if (row.length !== headings.length) continue
      const first = row[0] ?? ''
      if (!/^[A-Za-z]{1,4}-\d+[a-z]?$/.test(first)) continue
      const by: Record<string, string> = {}
      headings.forEach((heading, i) => {
        by[heading] = row[i] ?? ''
      })
      rows.push({ id: first, cells: row.slice(1), by })
    }

    if (headings.length === 0) {
      throw new Error(
        `table ${id} in ${file}: no markdown row under the caption is headed ` +
          `${JSON.stringify(ROW_ID_HEADING)}, the first column Chapter 1.9 requires (:274)`,
      )
    }
    if (rows.length === 0) {
      throw new Error(`table ${id} in ${file}: no rows with a row ID`)
    }
    return { id, caption, file, headings, rows }
  }
  if (unreadable.length > 0) {
    throw new Error(
      `table ${id} was not found, and ${unreadable.length} of the ` +
        `${FILES.length} manuscript file(s) could not be READ: ` +
        `${unreadable.join('; ')}. That is not a defect in the ` +
        'specification and not a defect in this table -- the file was held ' +
        'open by something else while this run read it. Re-run with nothing ' +
        'writing docs/spec, and give the syncing folder a moment. See DFC-255.',
    )
  }
  throw new Error(`the specification has no table ${id}`)
}

const SPAN = /`([^`]+)`/

// Summary: The texts between two code spans that make both spans one value.
const WELDS: readonly string[] = ['', '＋', '+', '＝', '=', '→', 'が']

// Summary: The texts between two code spans that make the cell list several values, as `Delete` / `Backspace`.
// Trap: re-measure every table before adding a joiner; one that also occurs as
// prose between two spans would split one value into several.
const JOINERS: readonly string[] = ['/', '／', '、', '・', 'と', 'または']

// Why: spec sentences end a line with `<br>` in a row and two spaces elsewhere,
// both where the text has no character; quote a manuscript through this, not raw.
export function unbroken(text: string): string {
  const out: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/<br\s*\/?>/gi, '')
    const previous = out[out.length - 1]
    if (previous !== undefined && previous.endsWith('  ')) {
      out[out.length - 1] = previous.trimEnd() + line.replace(/^(?:\s*>)+\s?/, '')
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

// Why: a rule is a paragraph, not a line: every spec sentence ends a line, so a
// one-line read sees only the first sentence of a rule.
export function paragraphsOf(text: string): readonly string[] {
  const out: string[] = []
  let held: string[] = []
  const flush = (): void => {
    if (held.length > 0) out.push(held.join(''))
    held = []
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('|') || trimmed.startsWith('#')) {
      flush()
      if (trimmed !== '') out.push(trimmed)
      continue
    }
    held.push(trimmed)
  }
  flush()
  return out
}

// Summary: The helper shall return every value a cell states, in order, and shall throw on a welded pair.
export function bareAll(cell: string): readonly string[] {
  const values: string[] = []
  let rest = cell
  for (;;) {
    const span = SPAN.exec(rest)
    if (span === null) {
      if (values.length === 0) return [cell.replace(/\*/g, '').trim()]
      return values
    }
    values.push(span[1] ?? '')
    rest = rest.slice((span.index ?? 0) + span[0].length)
    const next = SPAN.exec(rest)
    if (next === null) return values
    const between = rest.slice(0, next.index).replace(/\*/g, '').trim()
    if (JOINERS.includes(between)) continue
    if (WELDS.includes(between)) {
      throw new Error(
        `a cell whose answer is more than one code span, welded by ` +
          `${JSON.stringify(between)}: ${JSON.stringify(cell)}. ` +
          `${JSON.stringify(span[1] ?? '')} and ` +
          `${JSON.stringify(next[1] ?? '')} are ONE value spelled in two ` +
          `spans, not two values -- see DFC-343. Read the cell raw ` +
          `(row.by['…'] / row.cells[n]) and say in the test what the whole ` +
          `cell means.`,
      )
    }
    return values
  }
}

// Why: it throws rather than return the first of several values: a premise read
// that way is half true, and its test passes while checking half of what it names.
export function bare(cell: string): string {
  const values = bareAll(cell)
  if (values.length > 1) {
    throw new Error(
      `bare() was given a cell that states ${values.length} values, not one: ` +
        `${JSON.stringify(cell)}. Returning ${JSON.stringify(values[0] ?? '')} ` +
        `would drop ${JSON.stringify(values.slice(1).join(', '))} and nothing ` +
        `would say so -- see DFC-351. Call bareAll() and say in the test what ` +
        `the whole cell means.`,
    )
  }
  return values[0] ?? ''
}

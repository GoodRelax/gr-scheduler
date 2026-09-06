// Reads a numbered table out of the specification, so a contract test can be
// driven by the table itself instead of by a copy of it.
//
// Chapter 1.9 of docs/spec/01-04-requirements.md sets the two rules this file
// exists to serve:
//
//   :274 (MUST)   the first column of a table is the row ID -- so that a
//                 failing test names one line of the specification
//   :275 (SHOULD) a test that verifies a requirement pointing at a table is
//                 driven by fixed data copied from that table; one test walks
//                 every row rather than one test per row
//
// "Fixed data copied from the table" is taken literally here: the copy is made
// at read time from the .md itself, so it cannot fall behind the table the way
// a hand-written copy does.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SPEC = join(process.cwd(), 'docs', 'spec')

/** One row of a numbered table: its row ID and the cells after it. */
export interface SpecRow {
  /** The first column. `PV-4` names one line of the specification. */
  readonly id: string
  /** The remaining cells, in the order the table writes them. */
  readonly cells: readonly string[]
  /** Cells by their heading, for a table whose column order may move. */
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
  // ⭐ Table T-016 moved here from 01-04-requirements.md with CR-278, when it
  // became a generated table -- the same road tbl-settings.md took. Five test
  // files stopped finding it in the same commit, which is what this list is
  // for: one place says where a table may live.
  join('_assets', 'tbl-property-items.md'),
  join('_assets', 'fig-erd-detail.md'),
  join('_assets', 'fig-erd-overview.md'),
]

/**
 * The heading Chapter 1.9 (:274) gives the first column of a numbered table.
 *
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- this is the word the
 * Japanese manuscript writes, and matching it is the whole job of this file.
 */
const ROW_ID_HEADING = '行 ID'

const cells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

const isSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line.trim())

/**
 * The table with this ID, wherever in the specification it lives.
 *
 * Throws when the table is missing, when it has no rows, or when nothing under
 * the caption is headed by a row ID -- all three mean the test cannot name a
 * line of the specification when it fails, which is the whole point of driving
 * it here.
 *
 * ⛔ THE HEADING ROW IS SEARCHED FOR, NOT ASSUMED TO BE THE FIRST ONE. Taking
 * the first markdown row as the heading is what made table T-012a unreadable
 * (the ledger's D-216): its caption is followed by a four-vertex table headed
 * 「点」 before the row-ID one, so the helper threw on the vertex table's
 * heading while its own rows were being read correctly. ⚠️ Chapter 1.9 (:274)
 * makes 「行 ID」 the first column of EVERY numbered table, which is what makes
 * the heading findable rather than positional.
 */
export function specTable(id: string): SpecTable {
  const unreadable: string[] = []
  for (const file of FILES) {
    // ⛔⛔ A MANUSCRIPT CAN BE LOCKED WHILE THIS RUNS, and the read then
    // throws rather than returning something short. Measured 2026-09-05 on
    // Windows: rewriting one manuscript while the suite ran took 115 of 158
    // files red at once, and the error was
    // `EBUSY: resource busy or locked`, not an empty string. The file is
    // not damaged -- its bytes are identical afterwards -- so the run is a
    // FALSE red that looks like a defect in whichever table was asked for.
    // ⚠️ It does not take an edit. This repository sits under a syncing
    // folder, and the sync holds a file open for its own moment too, which
    // is the likeliest reading of D-255's rare unreproducible failure.
    // ⭐ So the read is caught and named, and the suite is not run while
    // anything is writing docs/spec.
    let text: string
    try {
      text = readFileSync(join(SPEC, file), 'utf8')
    } catch (cause) {
      unreadable.push(`${file} (${cause instanceof Error ? cause.message : String(cause)})`)
      continue
    }
    // ⚠️ AND THE OTHER HALF OF THE SAME MOMENT: the read can succeed and
    // hand back a file that is empty or still filling. Measured 2026-09-05:
    // both shapes appeared in the same experiment, so both are caught.
    if (text.trim().length === 0) {
      unreadable.push(`${file} (read back empty)`)
      continue
    }
    const lines = text.split('\n')
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
        'writing docs/spec, and give the syncing folder a moment. See D-255.',
    )
  }
  throw new Error(`the specification has no table ${id}`)
}

const SPAN = /`([^`]+)`/

/**
 * What sits between two code spans when they are ONE value the cell split in
 * two, rather than a value followed by its explanation.
 *
 * ⭐ MEASURED over every numbered table on 2026-09-06: 8561 cells, 695 of them
 * carrying two or more code spans. Grouping those by the text between the
 * first two spans separates the shapes cleanly. A joiner or nothing at all --
 * 「`Ctrl` ＋ `R`」, 「`resumeValid` が `false`」, 「`GL-001` / `GL-002`」 --
 * means the answer is BOTH spans. Anything else -- an opening bracket, a
 * requirement UID, a sentence -- means the first span is the answer and the
 * rest is prose about it.
 *
 * ⛔⛔ THE ENUMERATING JOINERS ARE NOT IN THIS LIST YET, AND THE REASON IS A
 * MEASUREMENT, not a judgement that they are safe. Adding 「/」「／」「、」「・」
 * 「と」「または」 was tried first and turned 18 unit files and 1 contract file
 * red, on live cells -- every one of them a test reading half of what it
 * names. Two of the reds are worth naming because they are real drift the
 * halving was hiding:
 *   - `tests/contract/units.contract.test.ts:39` reads 表 T-075's 純粋性 as
 *     'semi-pure-b' where the table says 「`semi-pure-b` ／ `non-pure`」 (UF-41
 *     and UF-51), and the two files it then checks carry only the first half
 *     in their `@purity` header.
 *   - `tests/unit/uf-71-confirmation.test.ts:1407` reads 表 T-109's 面 column
 *     as 'Help Modal' where the cell names six surfaces.
 * ⭐ Closing those is not this file's work -- it is 19 files this round may
 * not touch. ⇒ The list holds the welds that make ONE atomic value, which is
 * exactly the shape `D-343` was raised for, and it lands green. ⚠️ WIDEN IT
 * when the 19 are fixed; do not widen it and absorb the reds.
 */
const WELDS: readonly string[] = ['', '＋', '+', '＝', '=', '→', 'が']

/**
 * The text inside the first `code span` of a cell, or the cell itself.
 *
 * ⛔⛔ IT REFUSES A CELL WHOSE ANSWER IS MORE THAN ONE SPAN (the ledger's
 * `D-343`). Returning the first span out of 「`Ctrl` ＋ `R`」 is 'Ctrl', and
 * out of 「`resumeValid` が `false`」 is 'resumeValid' -- HALF the cell, handed
 * back with no sign that anything was dropped. A premise read that way is
 * silently half true, and the test built on it passes while checking half of
 * what it names.
 *
 * ⚠️ THIS HAS MISLED A MEASUREMENT TWICE, which is why it now throws rather
 * than warns:
 *   - `D-337`: 「先の実測が打った 3 つの鍵では読み直しの門に届いていなかった」
 *     -- the keys came out of a cell that spelled them across two spans.
 *   - `mk-13-the-name-field-is-armed.test.ts`: a regex of the same shape took
 *     the FIRST `PR-n` of a cell, and returned `PR-21` the moment an unrelated
 *     clause was inserted ahead of the one it meant. That test is fixed; this
 *     is the helper being fixed so the trap cannot be laid again.
 *
 * ⭐ WHAT A CALLER DOES INSTEAD. Read the cell raw -- `row.by['作法']` -- and
 * say in the test what the whole cell means. Two contract tests already do
 * exactly that and say why in their own comments; the throw makes that the
 * road everyone takes rather than the one two files happened to find.
 *
 * ⛔ A cell that carries a span and then PROSE is untouched: the first span is
 * the answer there, and 「`AgentApiEndpoint`（`SingleHtmlShell` が実装する）」
 * still returns 'AgentApiEndpoint'. Only a welded pair is refused.
 */
export function bare(cell: string): string {
  const first = SPAN.exec(cell)
  if (first === null) return cell.replace(/\*/g, '').trim()
  const rest = cell.slice((first.index ?? 0) + first[0].length)
  const next = SPAN.exec(rest)
  if (next !== null) {
    const weld = rest.slice(0, next.index).replace(/\*/g, '').trim()
    if (WELDS.includes(weld)) {
      throw new Error(
        `bare() was given a cell whose answer is more than one code span, ` +
          `welded by ${JSON.stringify(weld)}: ${JSON.stringify(cell)}. ` +
          `Returning ${JSON.stringify(first[1] ?? '')} would drop ` +
          `${JSON.stringify(next[1] ?? '')} and everything after it, and ` +
          `nothing would say so -- see D-343. Read the cell raw ` +
          `(row.by['…'] / row.cells[n]) and say in the test what the whole ` +
          `cell means, or split it on the joiner first and call bare() on ` +
          `each part.`,
      )
    }
  }
  return first[1] ?? ''
}

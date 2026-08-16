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
  join('_assets', 'fig-erd-detail.md'),
  join('_assets', 'fig-erd-overview.md'),
]

const cells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

const isSeparator = (line: string): boolean => /^\|[\s:|-]+\|$/.test(line.trim())

/**
 * The table with this ID, wherever in the specification it lives.
 *
 * Throws when the table is missing, when it has no rows, or when its first
 * column is not a row ID -- all three mean the test cannot name a line of the
 * specification when it fails, which is the whole point of driving it here.
 */
export function specTable(id: string): SpecTable {
  for (const file of FILES) {
    const text = readFileSync(join(SPEC, file), 'utf8')
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
        headings = row
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

    if (headings[0] !== '行 ID') {
      throw new Error(
        `table ${id} in ${file}: the first column is ${JSON.stringify(headings[0])}, ` +
          'not the row ID that Chapter 1.9 requires (:274)',
      )
    }
    if (rows.length === 0) {
      throw new Error(`table ${id} in ${file}: no rows with a row ID`)
    }
    return { id, caption, file, headings, rows }
  }
  throw new Error(`the specification has no table ${id}`)
}

/** The text inside the first `code span` of a cell, or the cell itself. */
export function bare(cell: string): string {
  return /`([^`]+)`/.exec(cell)?.[1] ?? cell.replace(/\*/g, '').trim()
}

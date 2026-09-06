// Contract test: the reader every table-driven case stands on reads WHOLE cells.
//
// Unit under test: tests/contract/spec-table.ts -- `bare` and `bareAll`. It is
// not a unit of table T-075 and has no row anywhere in docs/spec: it is the
// tool that turns a numbered table into fixed data, which Chapter 1.9 (:275)
// asks a table-driven case to be built from.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE TWO LEDGER ROWS IT PINS
// ---------------------------------------------------------------------------
//
// `D-343`: 「仕様の表を読む補助が、複数の語を持つ升の最初の 1 語しか返さない」 --
// 「`Ctrl` ＋ `R`」 came back as 'Ctrl' and 「`resumeValid` が `false`」 as
// 'resumeValid'. A premise read that way is silently half true.
//
// `D-351`: 「仕様の表を読む試験が、升の半分しか読んでいない」 -- the same hole for
// the ENUMERATING joiners. MEASURED 2026-09-07: closing it turned 19 unit files
// and 1 contract file red, on live cells, every one of them a case that named a
// whole column and read one value of it.
//
// ⛔⛔ NEITHER DEFECT COULD BE SEEN FROM A GREEN SUITE, because the wrong answer
// was a string of the right shape. The only thing that catches it is asking the
// reader directly what it does with a cell that states more than one thing --
// which is what this file does, and what nothing did before.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// The enumerating cases are driven by the manuscript itself, never by a copy:
// 表 T-036 `SK-3` / `SK-7` / `SK-20`, 表 T-109 `IC-52`, 表 T-075 `UF-41`. If one
// of those cells stops enumerating, the case says so instead of going quietly
// green on a shape that is no longer there. The SHAPE cases -- a span with
// prose after it, a cell with no span at all -- are spelt out here, because
// they are statements about the reader and not about any one row.

import { describe, expect, it } from 'vitest'

import { bare, bareAll, specTable } from './spec-table'

/** One row of a numbered table, or a failure that names the row. */
const rowOf = (table: string, id: string): Readonly<Record<string, string>> => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} no longer has row ${id}`)
  return found.by
}

describe('bareAll -- every value a cell states', () => {
  it('gives one value for an ordinary cell', () => {
    expect(bareAll('`Command Palette`')).toEqual(['Command Palette'])
  })

  it('gives the span and not the prose after it', () => {
    // ⛔ A bracket is prose, not a joiner: the first span is the answer and the
    // rest explains it.
    expect(bareAll('`AgentApiEndpoint`（`SingleHtmlShell` が実装する）')).toEqual([
      'AgentApiEndpoint',
    ])
  })

  it('gives the whole cell when the cell has no span', () => {
    expect(bareAll('**対象外**')).toEqual(['対象外'])
  })

  it('gives BOTH spellings 表 T-036 SK-3 assigns', () => {
    // 「`Delete` / `Backspace`」 -- two spellings of the one key SK-3 assigns.
    expect(bareAll(rowOf('T-036', 'SK-3')['割当'] ?? '')).toEqual(['Delete', 'Backspace'])
  })

  it('gives BOTH spellings 表 T-036 SK-7 assigns', () => {
    expect(bareAll(rowOf('T-036', 'SK-7')['割当'] ?? '')).toEqual(['Ctrl+Y', 'Ctrl+Shift+Z'])
  })

  it('gives all six surfaces 表 T-109 IC-52 stands on', () => {
    // ⭐ THE CELL `D-351` WAS RAISED ON. Sixteen files filtered this column with
    // `===` on a first span, so each of them answered for one surface of six.
    const surfaces = bareAll(rowOf('T-109', 'IC-52')['面'] ?? '')
    expect(surfaces).toHaveLength(6)
    expect(surfaces[0]).toBe('Help Modal')
    expect(surfaces.at(-1)).toBe('Properties Panel')
  })

  it('gives both purities 表 T-075 UF-41 states', () => {
    // ⭐ The manuscript settles what two values in that column mean, under the
    // table: 「本欄はそのユニットが持つ関数の純粋性を重複なく並べたものであり」,
    // and 「`semi-pure-b` と `non-pure` が同じユニットに載ることは `R7.9` に反し
    // ない」. So the column enumerates by design and is not a defect to close.
    expect(bareAll(rowOf('T-075', 'UF-41')['純粋性'] ?? '')).toEqual([
      'semi-pure-b',
      'non-pure',
    ])
  })

  it('⛔ REFUSES a welded cell, where two spans are ONE value (D-343)', () => {
    // 表 T-036 SK-20 -- 「`Ctrl` ＋ `Shift` ＋ `D`」. No list of strings says
    // that faithfully, so the reader hands it back to the caller rather than
    // pretending it is three assignments.
    expect(() => bareAll(rowOf('T-036', 'SK-20')['割当'] ?? '')).toThrow(/welded by/)
    expect(() => bareAll('`resumeValid` が `false`')).toThrow(/welded by/)
  })
})

describe('bare -- the single value a cell states', () => {
  it('still returns that value where there is one', () => {
    expect(bare('`Command Palette`')).toBe('Command Palette')
    expect(bare('`AgentApiEndpoint`（`SingleHtmlShell` が実装する）')).toBe('AgentApiEndpoint')
    expect(bare('**対象外**')).toBe('対象外')
  })

  it('⛔ REFUSES an enumerating cell rather than returning the first of several (D-351)', () => {
    expect(() => bare(rowOf('T-109', 'IC-52')['面'] ?? '')).toThrow(/states 6 values/)
    expect(() => bare(rowOf('T-036', 'SK-3')['割当'] ?? '')).toThrow(/states 2 values/)
    expect(() => bare(rowOf('T-075', 'UF-41')['純粋性'] ?? '')).toThrow(/states 2 values/)
  })

  it('⛔ REFUSES a welded cell (D-343)', () => {
    expect(() => bare('`Ctrl` ＋ `R`')).toThrow(/welded by/)
  })

  it('⭐ names what was dropped, so a failure can be acted on without a debugger', () => {
    // ⚠️ The whole point of the throw is that the caller learns WHICH values it
    // would have lost. A message that only said "more than one" would send the
    // next reader back to the manuscript to find out what.
    expect(() => bare('`Delete` / `Backspace`')).toThrow(/Backspace/)
  })
})

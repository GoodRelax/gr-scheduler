// Contract tests: the spec-table reader reads whole cells, not the first code span.

import { describe, expect, it } from 'vitest'

import { bare, bareAll, specTable } from './spec-table'

const rowOf = (table: string, id: string): Readonly<Record<string, string>> => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} no longer has row ${id}`)
  return found.by
}

// Spec: FR-036, T-036
const assignmentsIn = (cell: string): readonly (readonly string[])[] =>
  cell
    .split('\uff0f')
    .map((one) => [...one.matchAll(/`([^`]+)`/g)].map((span) => span[1] ?? ''))
    .filter((keys) => keys.length > 0)

// Why: a half-read cell is a string of the right shape, so no green suite shows it;
// only asking the reader what it does with a many-valued cell catches it.
describe('bareAll -- every value a cell states', () => {
  it('gives one value for an ordinary cell', () => {
    expect(bareAll('`Command Palette`')).toEqual(['Command Palette'])
  })

  it('gives the span and not the prose after it', () => {
    // Why: a bracket is prose, not a joiner, so only the first span is the answer.
    expect(bareAll('`AgentApiEndpoint`（`SingleHtmlShell` が実装する）')).toEqual([
      'AgentApiEndpoint',
    ])
  })

  it('gives the whole cell when the cell has no span', () => {
    expect(bareAll('**対象外**')).toEqual(['対象外'])
  })

  it('gives BOTH spellings 表 T-036 SK-3 assigns', () => {
    expect(bareAll(rowOf('T-036', 'SK-3')['割当'] ?? '')).toEqual(['Delete', 'Backspace'])
  })

  it('REFUSES 表 T-036 SK-7, whose two assignments are each welded, and the raw cell holds both', () => {
    const cell = rowOf('T-036', 'SK-7')['割当'] ?? ''
    expect(() => bareAll(cell)).toThrow(/welded by/)
    expect(
      assignmentsIn(cell),
      '表 T-036 と 表 T-255 の `割当` の欄が 1 つの欄に 2 つ以上の割当を持つときも、同じ区切りで並べること（MUST）',
    ).toEqual([
      ['Ctrl', 'Y'],
      ['Ctrl', 'Shift', 'Z'],
    ])
  })

  it('gives all eight surfaces 表 T-109 IC-52 stands on', () => {
    const surfaces = bareAll(rowOf('T-109', 'IC-52')['面'] ?? '')
    expect(surfaces).toHaveLength(8)
    expect(surfaces[0]).toBe('Help Modal')
    expect(surfaces.at(-1)).toBe('Holiday Settings')
  })

  // Spec: T-075, UF-41
  it('gives both purities 表 T-075 UF-41 states', () => {
    expect(bareAll(rowOf('T-075', 'UF-41')['純粋性'] ?? '')).toEqual([
      'semi-pure-mutable',
      'non-pure',
    ])
  })

  it('⛔ REFUSES a welded cell, where two spans are ONE value (DFC-343)', () => {
    // Why: no list of strings says one welded key faithfully, so the reader hands
    // the cell back to the caller instead of three assignments.
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

  it('⛔ REFUSES an enumerating cell rather than returning the first of several (DFC-351)', () => {
    expect(() => bare(rowOf('T-109', 'IC-52')['面'] ?? '')).toThrow(/states 8 values/)
    expect(() => bare(rowOf('T-036', 'SK-3')['割当'] ?? '')).toThrow(/states 2 values/)
    expect(() => bare(rowOf('T-075', 'UF-41')['純粋性'] ?? '')).toThrow(/states 2 values/)
  })

  it('⛔ REFUSES a welded cell (DFC-343)', () => {
    expect(() => bare('`Ctrl` ＋ `R`')).toThrow(/welded by/)
  })

  it('⭐ names what was dropped, so a failure can be acted on without a debugger', () => {
    // Why: the throw must name the values it would drop; "more than one" alone
    // would send the next reader back to the manuscript.
    expect(() => bare('`Delete` / `Backspace`')).toThrow(/Backspace/)
  })
})

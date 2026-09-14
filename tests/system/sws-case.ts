// Declares a System case (table T-219) for the tests/system sws generator.

import { expect } from '@playwright/test'
import type { SpecRow, SpecTable } from '../contract/spec-table'

export interface SwsCase {
  readonly sws: string
  readonly level: 'System'
  readonly covers: readonly string[]
  readonly given: string
  readonly when: string
  readonly then: string
}

export interface SwsRegistry {
  swsCase(one: SwsCase): string
  declared(): readonly SwsCase[]
}

// WHY: not one module-level array -- Playwright may run two spec files in one
// worker, and a shared array would let one file's check see the other's.
/** @purity non-pure */
export function swsRegistry(): SwsRegistry {
  const cases: SwsCase[] = []
  return {
    /** @purity non-pure */
    swsCase(one: SwsCase): string {
      cases.push(one)
      return `${one.sws} [${one.covers.join(' ')}] GIVEN ${one.given} WHEN ${one.when} THEN ${one.then}`
    },
    /** @purity semi-pure-b */
    declared(): readonly SwsCase[] {
      return [...cases]
    },
  }
}

// WHY: guards the declarations, not the product -- TW-2 (Chapter 9) has no
// other reader that would catch an empty GIVEN or an unknown row ID.
/** @purity non-pure */
export function expectDeclarationsUsable(
  registry: SwsRegistry,
  knownRowIds: ReadonlySet<string>,
): void {
  const cases = registry.declared()
  expect(cases.length, 'this file declares no case at all').toBeGreaterThan(0)
  for (const one of cases) {
    expect(one.level, `${one.sws} is declared at the wrong level for table T-218 row TS-3`).toBe(
      'System',
    )
    expect(one.covers.length, `${one.sws} covers no row`).toBeGreaterThan(0)
    for (const id of one.covers) {
      expect(knownRowIds.has(id), `${one.sws} names ${id}, which is in none of the tables read here`)
        .toBe(true)
    }
    const fields: ReadonlyArray<readonly [string, string]> = [
      ['given', one.given],
      ['when', one.when],
      ['then', one.then],
    ]
    for (const [field, text] of fields) {
      expect(text.trim().length, `${one.sws} has an empty ${field}`).toBeGreaterThan(0)
    }
  }
}

/** @purity pure */
export function rowOf(table: SpecTable, id: string): SpecRow {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return row
}

// WHY: read by position, not heading -- headings are Japanese and rule 03
// section 5 keeps this tree ASCII; a caller needing another column guards it.
/** @purity pure */
export function lastCellOf(row: SpecRow): string {
  return row.cells[row.cells.length - 1] ?? ''
}

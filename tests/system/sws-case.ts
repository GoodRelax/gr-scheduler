// What a System case of Chapter 9 needs before it can assert anything: the
// declaration table T-219 asks every such case to carry, and the two readers
// that let a case take its expected values out of a specification table.
//
// ⭐ WHY A DECLARATION AT ALL. Table T-219 (row TW-2) has Chapter 9's cases
// GENERATED from the test code and forbids writing them by hand, and Chapter 7
// lists what the generator needs from a case that lives under
// `tests/integration/` or `tests/system/`: the `SW_SPEC` node it hangs from,
// GIVEN, WHEN, THEN, and the test level. Which keys carry those is left to the
// test code. The keys below are the ones
// `tests/integration/schedule-drawing.sws.test.ts` already uses, so that one
// generator reads one literal shape in both places.
//
// To find every case: grep for `swsCase({`. To find one node's cases: grep for
// `sws: 'SWS-8'`.

import { expect } from '@playwright/test'
import type { SpecRow, SpecTable } from '../contract/spec-table'

/** The declaration one case carries. */
export interface SwsCase {
  /** The `SW_SPEC` node of Chapter 6.1 the generated case takes as its parent. */
  readonly sws: string
  /** TEST_LEVEL. Table T-218 gives row TS-3 exactly one. */
  readonly level: 'System'
  /** Row IDs of the specification table the case verifies, e.g. `NS-3`. */
  readonly covers: readonly string[]
  readonly given: string
  readonly when: string
  readonly then: string
}

export interface SwsRegistry {
  /** Declare a case and return the name Playwright prints for it. */
  swsCase(one: SwsCase): string
  /** Every case declared so far, in declaration order. */
  declared(): readonly SwsCase[]
}

/**
 * A registry of its own, for one test file.
 *
 * ⚠️ Deliberately NOT one array at module level. Playwright may load two spec
 * files into the same worker process, and a shared array would then let one
 * file's completeness check see the other file's cases -- so the answer would
 * depend on the order the files happened to load in.
 *
 * @purity non-pure
 */
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

/**
 * Fail unless every declaration in the registry is one a generator could use.
 *
 * ⭐ This is the guard on the declarations themselves, not on the product: an
 * empty GIVEN or a row ID that is in no table would produce a Chapter 9 node
 * that says nothing, and TW-2 has no other reader to catch it.
 *
 * @purity non-pure
 */
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

/**
 * The row with this ID, or a failure that names the table it was looked for in.
 *
 * @purity pure
 */
export function rowOf(table: SpecTable, id: string): SpecRow {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return row
}

/**
 * The last cell of a row.
 *
 * ⭐ Read by position rather than by heading, so that no column name of the
 * manuscript is spelled in this repository -- the headings are Japanese, and
 * rule 03 section 5 keeps this tree ASCII. Every table read from here states
 * its rule in its last column; a caller that needs another column guards the
 * column count itself, so a table that grows a column fails loudly.
 *
 * @purity pure
 */
export function lastCellOf(row: SpecRow): string {
  return row.cells[row.cells.length - 1] ?? ''
}

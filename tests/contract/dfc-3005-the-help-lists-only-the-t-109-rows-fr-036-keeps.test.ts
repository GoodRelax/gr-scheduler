// DFC-3005 spec-only cases: FR-036 -- the Help lists the T-109 rows FR-036 keeps and no other, so no row the table no longer holds (the retired dialogue entrance).

import { describe, expect, it } from 'vitest'

import { LANGUAGES, REQUIREMENTS, T_109_ROWS, drawnHelp, helpOf } from './dfc-3000-help-stage'
import { selfAndDescendants } from '../fixtures/fake-browser'
import { specTable } from './spec-table'

const FR_036_SHOWS_T_109 = 'ヘルプは、`_assets/tbl-glossary.md` の 表 T-109 の行と'
const FR_036_HELP_ONLY = '⭐ 表 T-109 のうち `面` が `Help Modal` だけの行は、段に載せないこと（MUST）'
const FR_036_LEFT_OUT =
  '⛔ 表 T-109 のうち、`面` が `Search Panel`・`Delay Diagnostics Report`・`Properties Panel`・`Resource List`・`Holiday Settings`・`Open Chooser`・`Difference Review` の面だけ（`Help Modal` を併せて持つものを含む）である行と、`IC-52`・`IC-53`・`IC-75` を、段に載せてはならない（MUST NOT）'
const FR_036_MERGED = '⭐ 表 T-109 で `構え` の欄が `AR-3` の行と `IC-50` は、1 つの項目にまとめること（MUST）'

// WHY: the dialogue entrance the row asked to drop is retired from table T-109, so it is caught as an IC row the table does not hold.
const IC_ID = /^IC-\d+$/
const T_109_IDS: ReadonlySet<string> = new Set(T_109_ROWS.map((one) => one.id))

// see FR-036
const LEFT_OUT_SURFACES = new Set([
  'Search Panel',
  'Delay Diagnostics Report',
  'Properties Panel',
  'Resource List',
  'Holiday Settings',
  'Open Chooser',
  'Difference Review',
  'Help Modal',
])
const LEFT_OUT_ROWS = new Set(['IC-52', 'IC-53', 'IC-75'])

// WHY: FR-036 written out -- a row stays unless its surfaces are all left out, or it is one of the three named rows.
const KEPT: readonly string[] = T_109_ROWS.filter(
  (one) => !LEFT_OUT_ROWS.has(one.id) && !one.surfaces.every((surface) => LEFT_OUT_SURFACES.has(surface)),
).map((one) => one.id)

// WHY: FR-036 merges the AR-3 rows and IC-50 into ONE item, so that item stands for every one of them.
const MERGED: ReadonlySet<string> = new Set([
  ...specTable('T-109').rows.filter((one) => (one.by['構え'] ?? '').includes('`AR-3`')).map((one) => one.id),
  'IC-50',
])

const t109RowsIn = (entries: ReturnType<typeof helpOf>['entries']): Set<string> => {
  const ids = new Set(T_109_ROWS.map((one) => one.id))
  const found = new Set<string>()
  for (const entry of entries) {
    if (ids.has(entry.row)) found.add(entry.row)
    if (entry.icon !== null && ids.has(entry.icon)) found.add(entry.icon)
    for (const glyph of entry.glyphs) if (ids.has(glyph)) found.add(glyph)
  }
  if ([...found].some((one) => MERGED.has(one))) for (const one of MERGED) found.add(one)
  return found
}

describe('DFC-3005 -- the manuscript these cases are driven by', () => {
  it('FR-036 still shows table T-109 and states which of its rows the help leaves out', () => {
    expect(REQUIREMENTS).toContain(FR_036_SHOWS_T_109)
    expect(REQUIREMENTS).toContain(FR_036_HELP_ONLY)
    expect(REQUIREMENTS).toContain(FR_036_LEFT_OUT)
    expect(REQUIREMENTS).toContain(FR_036_MERGED)
  })

  it('table T-109 has AR-3 rows to merge with IC-50', () => {
    expect(MERGED.size).toBeGreaterThan(1)
  })
})

describe('DFC-3005 -- FR-036 the T-109 rows in the help', () => {
  it.each(LANGUAGES)('%s: no help item stands on an IC row table T-109 does not hold', (language) => {
    const entries = helpOf(language).entries
    const named = entries.flatMap((one) => [one.row, one.icon ?? ''])
    expect(named.filter((one) => IC_ID.test(one) && !T_109_IDS.has(one))).toEqual([])
  })

  it.each(LANGUAGES)('%s: the drawn help carries no glyph of an IC row table T-109 does not hold', (language) => {
    const { help } = drawnHelp(language)
    const glyphs = selfAndDescendants(help).map((one) => one.getAttribute('data-icon') ?? '')
    expect(glyphs.filter((one) => IC_ID.test(one) && !T_109_IDS.has(one))).toEqual([])
  })

  it.each(LANGUAGES)('%s: every T-109 row the help shows is one FR-036 keeps', (language) => {
    const shown = [...t109RowsIn(helpOf(language).entries)]
    // WHY: IC-102 is the wheel glyph FR-036 draws inside the wheel assignment words, not an item of its own.
    expect(shown.filter((one) => !KEPT.includes(one) && one !== 'IC-102')).toEqual([])
  })

  it.each(LANGUAGES)('%s: every T-109 row FR-036 keeps is shown', (language) => {
    const shown = t109RowsIn(helpOf(language).entries)
    expect(KEPT.filter((one) => !shown.has(one))).toEqual([])
  })
})

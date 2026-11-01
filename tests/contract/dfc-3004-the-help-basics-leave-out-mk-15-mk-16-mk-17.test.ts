// DFC-3004 spec-only cases: FR-036 -- of table T-023 the Help lists MK-2, MK-5 and MK-7 only, and not MK-15, MK-16 or MK-17 (learned by touching).

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { DICTIONARY, LANGUAGES, REQUIREMENTS, drawnHelp, helpOf } from './dfc-3000-help-stage'
import { specTable } from './spec-table'

const FR_036_NAMED = '表 T-023 の `MK-2` / `MK-5` / `MK-7` と、下の 表 T-255 の行を示すこと（MUST）'
const FR_036_TOUCHED = '触れば分かる操作（`MK-1` / `MK-6` / `MK-8` / `MK-11` / `MK-13` / `MK-15` / `MK-16`）'
// WHY: CR-850 retired MK-17; FR-036 now names it as a gap, not as a row learned by touching.
const FR_036_GAP = '欠番（`MK-17`）'

const SHOWN = ['MK-2', 'MK-5', 'MK-7']
const LEFT_OUT = ['MK-15', 'MK-16', 'MK-17']
const LEFT_OUT_WITH_WORDS = ['MK-15', 'MK-16']

const wordsOf = (row: string, language: DisplayLanguage): string => {
  const found = (DICTIONARY.assignments ?? []).find((one) => one.rowId === row)?.text[language]
  if (found === undefined) throw new Error(`the dictionary assignments has no ${row} in ${language}`)
  return found
}

describe('DFC-3004 -- the manuscript these cases are driven by', () => {
  it('FR-036 names MK-2 / MK-5 / MK-7 alone, counts MK-15 / MK-16 as learned by touching and MK-17 as a gap', () => {
    expect(REQUIREMENTS).toContain(FR_036_NAMED)
    expect(REQUIREMENTS).toContain(FR_036_TOUCHED)
    expect(REQUIREMENTS).toContain(FR_036_GAP)
  })

  it('T-023 still holds all six rows (MK-17 as a retired row)', () => {
    const ids = specTable('T-023').rows.map((one) => one.id)
    for (const id of [...SHOWN, ...LEFT_OUT]) expect(ids, id).toContain(id)
  })
})

describe('DFC-3004 -- FR-036 the T-023 rows in the help', () => {
  it.each(LANGUAGES)('%s: the help view carries exactly MK-2, MK-5 and MK-7 of table T-023', (language) => {
    const rows = helpOf(language).entries.filter((one) => /^MK-/.test(one.row)).map((one) => one.row)
    expect([...rows].sort()).toEqual([...SHOWN].sort())
  })

  it.each(LANGUAGES)('%s: the drawn help shows the words of MK-2, MK-5, MK-7 and not of MK-15, MK-16', (language) => {
    const text = drawnHelp(language).help.textContent
    for (const row of SHOWN) expect(text, row).toContain(wordsOf(row, language))
    for (const row of LEFT_OUT_WITH_WORDS) expect(text, row).not.toContain(wordsOf(row, language))
  })

  it('the retired MK-17 has no words in the dictionary, so the help has none to draw', () => {
    expect((DICTIONARY.assignments ?? []).some((one) => one.rowId === 'MK-17')).toBe(false)
  })
})

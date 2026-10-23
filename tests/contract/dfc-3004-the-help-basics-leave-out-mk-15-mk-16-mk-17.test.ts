// DFC-3004 spec-only cases: FR-036 -- of table T-023 the Help lists MK-2, MK-5 and MK-7 only, and not MK-15, MK-16 or MK-17 (learned by touching).

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { DICTIONARY, LANGUAGES, REQUIREMENTS, drawnHelp, helpOf } from './dfc-3000-help-stage'
import { specTable } from './spec-table'

const FR_036_NAMED = '表 T-023 の `MK-2` / `MK-5` / `MK-7` と、下の 表 T-255 の行を示すこと（MUST）'
const FR_036_TOUCHED =
  '触れば分かる操作（`MK-1` / `MK-6` / `MK-8` / `MK-11` / `MK-13` / `MK-15` / `MK-16` / `MK-17`）'

const SHOWN = ['MK-2', 'MK-5', 'MK-7']
const LEFT_OUT = ['MK-15', 'MK-16', 'MK-17']

const wordsOf = (row: string, language: DisplayLanguage): string => {
  const found = (DICTIONARY.assignments ?? []).find((one) => one.rowId === row)?.text[language]
  if (found === undefined) throw new Error(`the dictionary assignments has no ${row} in ${language}`)
  return found
}

describe('DFC-3004 -- the manuscript these cases are driven by', () => {
  it('FR-036 names MK-2 / MK-5 / MK-7 alone and counts MK-15 / MK-16 / MK-17 as learned by touching', () => {
    expect(REQUIREMENTS).toContain(FR_036_NAMED)
    expect(REQUIREMENTS).toContain(FR_036_TOUCHED)
  })

  it('T-023 still holds all six rows', () => {
    const ids = specTable('T-023').rows.map((one) => one.id)
    for (const id of [...SHOWN, ...LEFT_OUT]) expect(ids, id).toContain(id)
  })
})

describe('DFC-3004 -- FR-036 the T-023 rows in the help', () => {
  it.each(LANGUAGES)('%s: the help view carries exactly MK-2, MK-5 and MK-7 of table T-023', (language) => {
    const rows = helpOf(language).entries.filter((one) => /^MK-/.test(one.row)).map((one) => one.row)
    expect([...rows].sort()).toEqual([...SHOWN].sort())
  })

  it.each(LANGUAGES)('%s: the drawn help shows the words of MK-2, MK-5, MK-7 and not of MK-15, MK-16, MK-17', (language) => {
    const text = drawnHelp(language).help.textContent
    for (const row of SHOWN) expect(text, row).toContain(wordsOf(row, language))
    for (const row of LEFT_OUT) expect(text, row).not.toContain(wordsOf(row, language))
  })
})

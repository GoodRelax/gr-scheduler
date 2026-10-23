// DFC-721 spec-only cases: T-280 -- every U row openSurfaceStateMachine.open carries as surfaceName opens the surface table T-103 names for that row, headed by the FR-038 dictionary word, and FR-074 / FR-088 are no surface names.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specText } from './cr-727-stage'
import {
  LANGUAGES,
  OPEN_SURFACE_ROWS,
  SURFACE_HEADINGS,
  T_103_ROWS,
  nameOfRow,
  sessionOpenOn,
  viewOf,
} from './dfc-721-open-surface-stage'

const T_280_OPEN_CARRIES = '`openSurfaceStateMachine.open` —— 運ぶ値 `surfaceName`'
const S_99G_ONE_AT_A_TIME = '⭐ 面は一度に 1 つだけ開いている。'
const DICTIONARY_HOLDS_HEADINGS = 'the headings of the surfaces table T-103 has named'

const HOLIDAY_SETTINGS_ROW = 'U-65'
const NOT_ROWS_OF_T_280 = ['FR-074', 'FR-088'] as const

const DICTIONARY_COMMENT = JSON.stringify(
  (JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as Record<string, unknown>)[
    '$comment'
  ],
)

describe('DFC-721 -- the manuscript these cases are driven by', () => {
  it('T-280, S-99g and FR-038 still state the carried rows, the one open surface and the dictionary headings', () => {
    expect(specText('_assets', 'tbl-state-machines.md')).toContain(T_280_OPEN_CARRIES)
    expect(specText('_assets', 'tbl-settings.md')).toContain(S_99G_ONE_AT_A_TIME)
    expect(DICTIONARY_COMMENT).toContain(DICTIONARY_HOLDS_HEADINGS)
  })

  it('T-280: every carried surfaceName is a U row of table T-103', () => {
    for (const row of OPEN_SURFACE_ROWS) {
      expect(row, row).toMatch(/^U-\d+$/)
      expect(T_103_ROWS, row).toContain(row)
    }
  })

  it('T-280 / T-103: FR-074 and FR-088 are not carried, and the FR-088 surface is U-65 Holiday Settings', () => {
    for (const value of NOT_ROWS_OF_T_280) expect(OPEN_SURFACE_ROWS).not.toContain(value)
    expect(OPEN_SURFACE_ROWS).toContain(HOLIDAY_SETTINGS_ROW)
    expect(nameOfRow(HOLIDAY_SETTINGS_ROW)).toBe('Holiday Settings')
  })
})

describe('DFC-721 -- T-280 openSurfaceStateMachine.open x T-103: each carried row draws its own surface', () => {
  it('every T-280 surfaceName row opens the surface named by its T-103 row, in both display languages', () => {
    for (const row of OPEN_SURFACE_ROWS) {
      for (const language of LANGUAGES) {
        const drawn = viewOf(sessionOpenOn(row, language)).openModal
        expect(drawn, `${row} ${language}`).not.toBeNull()
        expect(drawn?.surface, `${row} ${language}`).toBe(nameOfRow(row))
      }
    }
  })

  it('FR-038: a T-280 row whose T-103 name the dictionary heads is headed by the dictionary word of the display language', () => {
    const headed = OPEN_SURFACE_ROWS.filter((row) => SURFACE_HEADINGS.has(nameOfRow(row)))
    expect(headed).toContain(HOLIDAY_SETTINGS_ROW)
    for (const row of headed) {
      for (const language of LANGUAGES) {
        const words = SURFACE_HEADINGS.get(nameOfRow(row))
        expect(viewOf(sessionOpenOn(row, language)).openModal?.heading, `${row} ${language}`).toBe(words?.[language])
      }
    }
  })

  it('U-65: opening S-99g on U-65 shows Holiday Settings headed by its dictionary word', () => {
    for (const language of LANGUAGES) {
      const drawn = viewOf(sessionOpenOn(HOLIDAY_SETTINGS_ROW, language)).openModal
      expect(drawn?.surface).toBe('Holiday Settings')
      expect(drawn?.heading).toBe(SURFACE_HEADINGS.get('Holiday Settings')?.[language])
    }
  })
})

// DFC-754: the screen colors carry the theme hue in every place a T-236 cell writes the H, none is left standing (FR-041, T-236).

import { describe, expect, it } from 'vitest'

import { themeStyle, type ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { specTable } from './spec-table'

const HUES = [0, 214, 359]
const PREFERENCES = ['light', 'dark'] as const

const stand = (written: string): number => (written.match(/\bH\b/g) ?? []).length

// see T-236
const HUED_CELLS = specTable('T-236').rows.flatMap((row) =>
  [row.by['明るいテーマ'], row.by['暗いテーマ']].filter((cell): cell is string => cell !== undefined && stand(cell.replace(/`/g, '')) > 0),
)

describe('DFC-754: the hue stands for every H of a cell (FR-041)', () => {
  it('T-236 premise: some cells are written with the hue letter H', () => {
    expect(HUED_CELLS.length).toBeGreaterThan(0)
  })

  for (const preference of PREFERENCES) {
    for (const hue of HUES) {
      const theme: ScreenTheme = { preference, hue }
      const written = themeStyle(theme)

      it(`FR-041 no bare H is left in the ${preference} theme at hue ${hue}`, () => {
        expect(stand(written)).toBe(0)
      })

      it(`FR-041 the hue ${hue} is written into the hued colors of the ${preference} theme`, () => {
        expect(written).toContain(`hsl(${hue} `)
      })
    }
  }

  it('FR-041 two hues write two different styles', () => {
    expect(themeStyle({ preference: 'light', hue: 30 })).not.toBe(themeStyle({ preference: 'light', hue: 200 }))
  })
})

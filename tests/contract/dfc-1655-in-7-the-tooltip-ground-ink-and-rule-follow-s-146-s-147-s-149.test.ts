// DFC-1655: a tooltip is painted with the ground S-146, the ink S-147 and the rule S-149 of the theme (IN-7, T-236).

import { describe, expect, it } from 'vitest'

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  paintedColour,
  paintedGround,
  resolved,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { specTable } from './spec-table'

const VIEW = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [{ anchor: { kind: 'task', taskUid: 1 }, text: 'first line\nsecond line', assignment: null, at: { x: 40, y: 60 } }],
} as unknown as ScreenView

// WHY: the table writes a hue-driven colour as `hsl(H 14% 87%)`; the drawn hue stands for the H.
const colourOf = (id: string, theme: 'light' | 'dark', hue: number): string => {
  const row = specTable('T-236').rows.find((one) => one.id === id)
  const cell = row?.by[theme === 'light' ? '明るいテーマ' : '暗いテーマ']
  if (cell === undefined) throw new Error(`table T-236 row ${id} has no ${theme} colour`)
  return cell.replace(/`/g, '').replace(/\bH\b/, String(hue)).replace(/\s+/g, '').toLowerCase()
}

const tipOf = (theme: ScreenTheme): { readonly built: ReturnType<typeof wire>; readonly tip: FakeElement } => {
  const built = wire(theme, { 'App Header': 37 })
  surfaceOf(built).showScreenView(VIEW)
  const layer = selfAndDescendants(built.root()).find((one) => one.getAttribute('data-role') === 'Tooltip')
  const tip = layer === undefined ? undefined : selfAndDescendants(layer).find((one) => one !== layer && (one.textContent ?? '').includes('first line'))
  if (tip === undefined) throw new Error('the tooltip was not drawn')
  return { built, tip }
}

const borderColourOf = (built: ReturnType<typeof wire>, tip: FakeElement): string => {
  const written = styleMap(tip).get('border-color') ?? /(var\([^)]*\)|#[0-9a-f]{3,8}|hsl\([^)]*\))\s*$/i.exec(styleMap(tip).get('border') ?? '')?.[1] ?? ''
  return resolved(built, written)
}

const THEMES: readonly ScreenTheme[] = [
  { preference: 'light', hue: 214 },
  { preference: 'dark', hue: 214 },
  { preference: 'light', hue: 30 },
  { preference: 'dark', hue: 300 },
]

describe('DFC-1655: the tooltip colours are the three rows IN-7 names (T-236 S-146, S-147, S-149)', () => {
  for (const theme of THEMES) {
    const name = `${theme.preference} theme, hue ${theme.hue}`

    it(`IN-7 the ground of a tooltip is S-146 in the ${name}`, () => {
      const { built, tip } = tipOf(theme)
      expect(paintedGround(built, tip)).toBe(colourOf('S-146', theme.preference, theme.hue))
    })

    it(`IN-7 the ink of a tooltip is S-147 in the ${name}`, () => {
      const { built, tip } = tipOf(theme)
      expect(paintedColour(built, tip)).toBe(colourOf('S-147', theme.preference, theme.hue))
    })

    it(`IN-7 the edge of a tooltip is S-149 in the ${name}`, () => {
      const { built, tip } = tipOf(theme)
      expect(borderColourOf(built, tip)).toBe(colourOf('S-149', theme.preference, theme.hue))
    })
  }
})

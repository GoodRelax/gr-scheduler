// CR-418: the ruler text (S-3) and its band (S-2), the row names (S-36) and the row title panel (S-79) grow by half.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { rowTitleFontPxOf } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import { zoomYAtRectangleLabelFont } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  editDocumentSettings,
  type SettingsLimits,
} from '../../src/use-case/edit-document/edit-document-settings'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, S_235, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_039_THE_PANEL_FLOOR_HOLDS =
  '`S-234` のいちばん小さい段 50 の描く比 0.3125 から上のすべての段で成り立ち、既定の 100（描く比 0.625）では左辺 60.6672px に対し右辺 134.164px である。'

const rowOf = (table: string, id: string) => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row
}

// see T-201, T-203, T-206, T-215
const firstNumber = (table: string, id: string, column: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(rowOf(table, id).by[column] ?? '').replace(/`/g, ''))
  if (found === null) throw new Error(`table ${table} row ${id} column ${column} holds no number`)
  return Number(found[0])
}

// see S-3
const RULER_FONT_FACTOR = ((): number => {
  const cell = rowOf('T-201', 'S-3').by['既定値'] ?? ''
  const found = /×\s*(\d+(?:\.\d+)?)/.exec(cell)
  if (found === null) throw new Error(`S-3 states no factor: ${cell}`)
  return Number(found[1])
})()

const FONT_SCALE_SIZES: Readonly<Record<'S' | 'M' | 'L', number>> = {
  S: firstNumber('T-215', 'S-121', '値'),
  M: firstNumber('T-215', 'S-122', '値'),
  L: firstNumber('T-215', 'S-123', '値'),
}
const S_4 = firstNumber('T-201', 'S-4', '既定値')
const S_5 = firstNumber('T-201', 'S-5', '既定値')
const S_7 = firstNumber('T-201', 'S-7', '既定値')
const S_13 = firstNumber('T-201', 'S-13', '既定値')
const S_36 = firstNumber('T-201', 'S-36', '既定値')
const S_37 = firstNumber('T-201', 'S-37', '既定値')
const S_38 = firstNumber('T-201', 'S-38', '既定値')
const S_136 = firstNumber('T-201', 'S-136', '既定値')
const S_79 = firstNumber('T-203', 'S-79', '既定')
const S_125 = firstNumber('T-211', 'S-125', '値')
const S_138 = firstNumber('T-206', 'S-138', '既定')
const S_237 = firstNumber('T-206', 'S-237', '既定')
const S_243 = firstNumber('T-206', 'S-243', '既定')

const rulerFontOf = (scale: 'S' | 'M' | 'L'): number => FONT_SCALE_SIZES[scale] * RULER_FONT_FACTOR
const rulerHeightOf = (scale: 'S' | 'M' | 'L'): number => rulerFontOf(scale) * 3 + S_136 * 3

describe('tables T-201 / T-203 -- the numbers CR-418 set', () => {
  it('multiplies the text size step by 1.5 for S-3, giving S 18 / M 21 / L 24 and S-2 of 60 / 69 / 78', () => {
    expect(RULER_FONT_FACTOR).toBe(1.5)
    expect(['S', 'M', 'L'].map((one) => rulerFontOf(one as 'S'))).toEqual([18, 21, 24])
    expect(['S', 'M', 'L'].map((one) => rulerHeightOf(one as 'S'))).toEqual([60, 69, 78])
  })

  it('holds S-36 at 19.5 and S-79 at 300', () => {
    expect(S_36).toBe(19.5)
    expect(S_79).toBe(300)
  })

  it('states the text-side ceiling 1.760197 as S-36 x S-38 / (S-4 x S-13 x S-5 x S-7)', () => {
    expect((S_36 * S_38) / (S_4 * S_13 * S_5 * S_7)).toBeCloseTo(1.760197, 6)
  })
})

describe('the generated defaults and the startup template follow them', () => {
  const template = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as { documentSettings: Record<string, unknown> }

  it('generates rulerFont and rulerHeight for the default text size M', () => {
    expect(SETTINGS_DEFAULTS['fontScale']).toBe('M')
    expect(SETTINGS_DEFAULTS['rulerFont'], 'S-3').toBe(rulerFontOf('M'))
    expect(SETTINGS_DEFAULTS['rulerHeight'], 'S-2').toBe(rulerHeightOf('M'))
  })

  it('generates rowTitleFont 19.5 and rowTitlePanelWidth 300', () => {
    expect(SETTINGS_DEFAULTS['rowTitleFont'], 'S-36').toBe(S_36)
    expect(SETTINGS_DEFAULTS['rowTitlePanelWidth'], 'S-79').toBe(S_79)
  })

  it('prints the four new defaults into the startup template', () => {
    expect(template.documentSettings['rulerFont']).toBe(rulerFontOf('M'))
    expect(template.documentSettings['rulerHeight']).toBe(rulerHeightOf('M'))
    expect(template.documentSettings['rowTitleFont']).toBe(S_36)
    expect(template.documentSettings['rowTitlePanelWidth']).toBe(S_79)
  })
})

// see T-252
const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    displayScale: DEFAULT_DISPLAY_SCALE,
    ...part,
  }) as unknown as DocumentSettings

const documentOf = (part: Record<string, unknown>): Document => {
  const template = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as Record<string, any>
  return {
    ...template,
    documentSettings: { ...template.documentSettings, ...part },
    changeLog: [],
  } as unknown as Document
}

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

describe('FR-039 -- changing the text size rewrites the stored ruler text and band', () => {
  it.each(['S', 'M', 'L'] as const)('writes rulerFont and rulerHeight for text size %s', (scale) => {
    const start = documentOf({ fontScale: scale === 'L' ? 'M' : 'L' })
    const result = editDocumentSettings(start, { kind: 'setFontScale', scale } as never, LIMITS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.document.documentSettings.rulerFont, 'S-3').toBe(rulerFontOf(scale))
    expect(result.document.documentSettings.rulerHeight, 'S-2').toBe(rulerHeightOf(scale))
  })
})

describe('S-36 / S-38 -- the row names are drawn at the new size', () => {
  it('draws a depth-1 name at 19.5 x 1.3 = 25.35 x the drawn ratio', () => {
    const ratio = displayRatioAt(DEFAULT_DISPLAY_SCALE)
    expect(rowTitleFontPxOf(1, settingsOf())).toBeCloseTo(S_36 * S_38 * ratio, 6)
  })

  it('draws a depth-2 name at 19.5 x the drawn ratio', () => {
    const ratio = displayRatioAt(DEFAULT_DISPLAY_SCALE)
    expect(rowTitleFontPxOf(2, settingsOf())).toBeCloseTo(S_36 * ratio, 6)
  })
})

describe('FR-016 -- the text side of the row-axis ceiling for the default document', () => {
  it('solves to 1.760197, not to the 1.173464 of the old S-36', () => {
    const settings = settingsOf()
    expect(zoomYAtRectangleLabelFont(rowTitleFontPxOf(1, settings), settings)).toBeCloseTo(
      (S_36 * S_38) / (S_4 * S_13 * S_5 * S_7),
      5,
    )
  })
})

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }
const ENTRANCE_OUTER_WIDTH = S_138 + S_243 * 2 + S_237 * 2

describe(`FR-039 -- the row title panel floor: ${FR_039_THE_PANEL_FLOOR_HOLDS}`, () => {
  it('still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(FR_039_THE_PANEL_FLOOR_HOLDS)
  })

  it('draws the default panel S-79 x 0.625 = 187.5px wide', () => {
    const settings = settingsOf()
    expect(regionsFromScreen(ENV, settings).rowTitlePanel.width).toBeCloseTo(
      S_79 * displayRatioAt(DEFAULT_DISPLAY_SCALE),
      6,
    )
  })

  it.each(DISPLAY_SCALE_STEPS)('keeps the depth-5 grip clear of the four row controls at display scale %s', (scale) => {
    const ratio = displayRatioAt(scale)
    const settings = settingsOf({ displayScale: scale })
    const width = regionsFromScreen(ENV, settings).rowTitlePanel.width
    const gripRight = S_37 * S_125 * ratio + S_138 * S_235
    const controlsLeft = width - ENTRANCE_OUTER_WIDTH * S_235 * 4
    expect(controlsLeft, `${FR_039_THE_PANEL_FLOOR_HOLDS} -- step ${scale}`).toBeGreaterThanOrEqual(gripRight - 1e-6)
    expect(width, `step ${scale}: the stored S-79 x ratio stands above the floor`).toBeCloseTo(S_79 * ratio, 6)
  })
})

describe('the document schema and the codec -- rowTitleFont may carry a half', () => {
  it.each([19.5, 13])('accepts rowTitleFont %s under the schema in docs/spec', (value) => {
    expect(validateDocument(documentOf({ rowTitleFont: value })).valid).toBe(true)
  })

  it.each([19.5, 13])('opens a document holding rowTitleFont %s as it stands, clamping nothing', (value) => {
    const read = documentFromJson(JSON.stringify(documentOf({ rowTitleFont: value })))
    expect(read.ok, JSON.stringify(read.ok ? '' : read.faults)).toBe(true)
    if (!read.ok) return
    expect(read.document.documentSettings.rowTitleFont).toBe(value)
    expect(read.clampedCount).toBe(0)
  })
})

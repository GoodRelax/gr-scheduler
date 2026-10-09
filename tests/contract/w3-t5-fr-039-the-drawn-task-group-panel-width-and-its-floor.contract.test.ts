// W3 spec-only tester 5: FR-039 -- the drawn Task Group Panel width is the larger of S-79 times the drawn ratio and the floor.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  displayRatioOf,
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-039
const FR_039_LARGER_OF_THE_TWO = '⭐ 描くタスクグループパネルの幅は、`S-79` に描く比を掛けた値と、次の床の大きい方とすること（MUST）'
const FR_039_THE_FLOOR =
  '床 ＝ `S-37` × 描く比 × 同書の 表 T-211 の `S-125` ＋ タスクグループの掴み代の幅（`S-138` × `S-235`）＋ タスクグループの操作子の 4 列（表 T-051 の `HF-4`）ぶんの入口の外形の幅（`FR-029` が定める外形の幅 × `S-235`）'
const FR_039_THE_OUTER_WIDTH = '53.336 は `S-138` 16 ＋ `S-243` 1 × 2 ＋ `S-237` 1 × 2 ＝ 20px の 4 列に'

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (found === null || !Number.isFinite(value)) throw new Error(`${what} states no number: ${JSON.stringify(cell)}`)
  return value
}

/** @purity pure */
function cellOf(table: string, id: string, column: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const S_37 = numberIn(cellOf('T-201', 'S-37', '既定値'), 'S-37')
const S_125 = numberIn(cellOf('T-211', 'S-125', '値'), 'S-125')
const S_138 = numberIn(cellOf('T-206', 'S-138', '既定'), 'S-138')
const S_235 = numberIn(cellOf('T-206', 'S-235', '既定'), 'S-235')
const S_243 = numberIn(cellOf('T-206', 'S-243', '既定'), 'S-243')
const S_237 = numberIn(cellOf('T-206', 'S-237', '既定'), 'S-237')
const PANEL_WIDTH_KEY = bare(cellOf('T-203', 'S-79', 'キー'))
const DISPLAY_SCALE_KEY = bare(cellOf('T-202', 'S-234', 'キー'))

// see HF-4, FR-029
const ROW_CONTROL_COLUMNS = 4
const OUTER_WIDTH = S_138 + S_243 * 2 + S_237 * 2

/** @purity pure */
function floorAt(ratio: number): number {
  return S_37 * ratio * S_125 + S_138 * S_235 + ROW_CONTROL_COLUMNS * OUTER_WIDTH * S_235
}

const TEMPLATE_TEXT = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')

/** @purity pure */
function settingsWith(panelWidth: number, displayScale: number): DocumentSettings {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template was refused')
  return { ...read.document.documentSettings, [PANEL_WIDTH_KEY]: panelWidth, [DISPLAY_SCALE_KEY]: displayScale } as DocumentSettings
}

// WHY: wide enough that the Task Group Area bound of FR-052 never binds.
const ENV: ScreenEnvironment = { width: 3000, height: 1200, appHeaderHeight: 40, scrollbarThickness: 8, propertyPanelWidth: 0 }

// WHY: half a hundredth of a px is float noise, not a different rule.
const CLOSE = 2

describe('W3-T5 -- the manuscript these cases are driven by', () => {
  it.each([FR_039_LARGER_OF_THE_TWO, FR_039_THE_FLOOR, FR_039_THE_OUTER_WIDTH])('01-04 FR-039 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the outer width of one entrance is the 20px the note adds up', () => {
    expect(OUTER_WIDTH).toBe(20)
  })

  it('the keys are read from the settings tables', () => {
    expect([PANEL_WIDTH_KEY, DISPLAY_SCALE_KEY]).toEqual(['taskGroupPanelWidth', 'displayScale'])
  })
})

describe(`FR-039 "${FR_039_LARGER_OF_THE_TWO}"`, () => {
  // WHY: each pair is (stored S-79, display scale); the first two fall under the floor, the last two clear it.
  it.each([
    [100, 50],
    [100, 200],
    [300, 100],
    [300, 200],
  ])('S-79 %d at display scale %d draws max(S-79 x ratio, floor)', (panelWidth, displayScale) => {
    const settings = settingsWith(panelWidth, displayScale)
    const ratio = displayRatioOf(settings)
    const expected = Math.max(panelWidth * ratio, floorAt(ratio))
    expect(regionsFromScreen(ENV, settings).taskGroupPanel.width, FR_039_LARGER_OF_THE_TWO).toBeCloseTo(expected, CLOSE)
  })

  it('premise: the cases above reach both sides of the floor', () => {
    const under = settingsWith(100, 50)
    const over = settingsWith(300, 100)
    expect(100 * displayRatioOf(under)).toBeLessThan(floorAt(displayRatioOf(under)))
    expect(300 * displayRatioOf(over)).toBeGreaterThan(floorAt(displayRatioOf(over)))
  })
})

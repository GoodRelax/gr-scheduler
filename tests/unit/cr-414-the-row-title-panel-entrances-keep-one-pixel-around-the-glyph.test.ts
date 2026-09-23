// CR-414: an entrance on the Row Title Panel keeps S-243 around its glyph, so the lattice (LF-16, HF-19) is about 24px.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  RowExpander,
  RowTitle,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  rowControlLatticeHeightPx,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { iconEntry, styleMap, surfaceOf, whatWasDrawn, wire, type FakeElement } from '../fixtures/fake-browser'
import { rowNameFont } from '../fixtures/row-name-font'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_029_THE_PANEL_GAP = '⭐ ただし行見出しパネルに載る入口では、その隙間を同表の `S-243` とすること（MUST）'
const FR_029_THE_OUTER_WIDTH =
  '⭐ 入口の外形の幅は、箱の一辺（`S-138`）に、隙間（`S-141`、行見出しパネルでは `S-243`）と枠の線の太さ（`S-237`）を左右のぶん加えた値とすること（MUST）'
const FR_029_EVERY_SURFACE =
  '⭐ 箱の一辺（`S-138`）と隙間（`S-141` / `S-243`）と枠の線の太さ（`S-237`）には、どの面でも同書の 表 T-206 の `S-235` を掛けて描くこと（MUST）'
const HF_19_NOT_A_FLOOR =
  '`HF-1` の格子（`HF-4` の並び、2 段）が縦に取る高さを、行の帯高の下限にしてはならない（MUST NOT）'
const HF_19_OUTER_SIZE = '操作子 1 つの外形は `_assets/tbl-settings.md` の 表 T-206 の `S-138` と `S-243` が決めており、格子はその 2 段ぶんである'

describe('CR-414 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-029 (MUST) -- a Row Title Panel entrance keeps S-243', FR_029_THE_PANEL_GAP],
    ['FR-029 (MUST) -- the outer width reads S-243 on the panel', FR_029_THE_OUTER_WIDTH],
    ['FR-029 (MUST) -- S-235 on every surface, S-243 included', FR_029_EVERY_SURFACE],
    ['HF-19 (MUST NOT) -- the lattice is not the band floor', HF_19_NOT_A_FLOOR],
    ['HF-19 -- one control is S-138 and S-243', HF_19_OUTER_SIZE],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('LF-16 counts one control from S-138 and S-243', () => {
    expect(DESIGN).toContain(HF_19_OUTER_SIZE)
  })
})

// see T-206
const px = (id: string): number => {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by['既定'] ?? ''))
  if (found === null) throw new Error(`table T-206 row ${id} states no number`)
  return Number(found[0])
}

const S_138 = px('S-138')
const S_141 = px('S-141')
const S_235 = px('S-235')
const S_237 = px('S-237')
const S_243 = px('S-243')

// see LF-16, HF-19
const LATTICE = 2 * (S_138 + S_243 * 2) * S_235

// see FR-029
const PANEL_ENTRANCE_OUTER_WIDTH = S_138 + (S_243 + S_237) * 2

describe('S-243 / LF-16 -- the lattice is two controls of S-138 + 2 x S-243, at S-235, and HF-19 floors no band with it', () => {
  it('works out to the 24.0012px the user asked for', () => {
    expect(S_243).toBe(1)
    expect(LATTICE).toBeCloseTo(24.0012, 9)
  })

  it('answers that height from rowControlLatticeHeightPx (PI-35)', () => {
    expect(rowControlLatticeHeightPx(), `${HF_19_OUTER_SIZE} -- ${FR_029_THE_PANEL_GAP}`).toBeCloseTo(LATTICE, 9)
  })

  it.each([DISPLAY_SCALE_STEPS[0]!, DEFAULT_DISPLAY_SCALE])(
    'lays a row holding no Task BELOW the lattice at a low zoomY, at display scale %s',
    (scale) => {
      const settings = {
        ...Object.fromEntries(Object.entries(SETTINGS_DEFAULTS).filter(([key]) => !key.includes('.'))),
        shapeHeightOf: { rectangle: 1, chevron: 1, arrow: 0.5, endpointSpan: 0.5, milestone: 1 },
        scrollDate: '2026-01-01',
        displayScale: scale,
        zoomY: 0.1,
      } as unknown as DocumentSettings
      const empty = {
        project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
        calendars: [],
        resources: [],
        assignments: [],
        highlightBoxes: [],
        commentBoxes: [],
        tasks: [],
        taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
        taskGroupMembers: [],
        taskVisuals: [],
        taskOrigins: [],
        baselineTasks: [],
      } as unknown as Schedule
      const env: ScreenEnvironment = { width: 1400, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }
      const layout = layoutFromSchedule(empty, settings, regionsFromScreen(env, settings))
      const row = layout.rows[0]
      if (row === undefined) throw new Error('the row is not laid out')
      expect(row.height, HF_19_NOT_A_FLOOR).toBeLessThan(LATTICE)
      expect(layout.contentHeight, 'LF-16: the lattice is reserved under the last row instead').toBeCloseTo(LATTICE, 6)
    },
  )
})

describe('FR-039 -- the drawn Row Title Panel floor counts the 20px panel entrance', () => {
  it('stands at S-37 x ratio x S-125 + S-138 x S-235 + (S-138 + 2 x (S-243 + S-237)) x S-235 x 4 at the default step', () => {
    const S_37 = SETTINGS_DEFAULTS['rowTitleIndent'] as number
    const S_125 = SETTINGS_DEFAULTS['maxGroupDepth'] as number
    const settings = {
      ...Object.fromEntries(Object.entries(SETTINGS_DEFAULTS).filter(([key]) => !key.includes('.'))),
      scrollDate: '2026-01-01',
      displayScale: DEFAULT_DISPLAY_SCALE,
      rowTitlePanelWidth: 1,
    } as unknown as DocumentSettings
    const env: ScreenEnvironment = { width: 1400, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }
    const floor =
      S_37 * displayRatioAt(DEFAULT_DISPLAY_SCALE) * S_125 + S_138 * S_235 + PANEL_ENTRANCE_OUTER_WIDTH * S_235 * 4
    expect(PANEL_ENTRANCE_OUTER_WIDTH, FR_029_THE_OUTER_WIDTH).toBe(20)
    expect(regionsFromScreen(env, settings).rowTitlePanel.width, FR_029_THE_OUTER_WIDTH).toBeCloseTo(floor, 6)
  })
})

describe('FR-029 (MUST) -- only the gap changes on the Row Title Panel; the box and the header do not', () => {
  const THEME: ScreenTheme = { preference: 'light', hue: 214 }
  const EXPANDER: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }
  const header: AppHeaderItems = {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [{ icon: 'IC-17', isEnabled: true, isPressed: false, isArmed: false, label: 'IC-17' } as CommandItem],
    language: 'ja',
  }
  const title: RowTitle = {
    groupId: 'RowAlpha',
    depth: 1,
    ...rowNameFont(1),
    indentPx: SETTINGS_DEFAULTS['rowTitleIndent'] as number,
    box: { x: 0, y: 40, width: 170, height: 29 },
    label: 'RowAlpha',
    wholeLabel: 'RowAlpha',
    isLabelTruncated: false,
    expander: EXPANDER,
    isPinned: false,
    isSelected: false,
  }
  const VIEW: ScreenView = {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: header,
    rowTitlePanel: { pinnedTitles: [], titles: [title] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }

  const outerWidthOf = (entry: FakeElement): number => {
    const written = styleMap(entry).get('min-width') ?? styleMap(entry).get('width') ?? ''
    const found = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(written.trim())
    if (found === null) throw new Error(`the entrance states no px width: ${whatWasDrawn(entry)}`)
    return Number(found[1])
  }

  it('draws the IC-58 row control (S-138 + 2 x (S-243 + S-237)) x S-235 wide, and the IC-17 header entrance still with S-141', () => {
    const built = wire(THEME, { 'App Header': 37 })
    surfaceOf(built).showScreenView(VIEW)
    const row = iconEntry(built.root(), 'IC-58')
    const head = iconEntry(built.root(), 'IC-17')
    expect(outerWidthOf(row), `${FR_029_THE_PANEL_GAP} -- ${whatWasDrawn(row)}`).toBeCloseTo(
      PANEL_ENTRANCE_OUTER_WIDTH * S_235,
      3,
    )
    expect(outerWidthOf(head), `${FR_029_EVERY_SURFACE} -- ${whatWasDrawn(head)}`).toBeCloseTo(
      (S_138 + (S_141 + S_237) * 2) * S_235,
      3,
    )
  })
})

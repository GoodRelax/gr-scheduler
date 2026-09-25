// A row name is drawn at the size FR-094 gives its depth: RowTitle.fontPx from UF-63, and the name's font-size on UF-71.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  RowTitle,
  ScreenViewReadings,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'
import {
  oneByRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { rowNameFont, rowNameFontPx } from '../fixtures/row-name-font'
import { bare, specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_094_SIZES_FROM_T_201 =
  '・余白 —— を、`_assets/tbl-settings.md` の表 T-201 に従って決めること（MUST）'

const FR_094_NO_SIZE_OF_ITS_OWN =
  '従って決めること（MUST）。同表に無い寸法を実装が独自に持ってはならない（MUST NOT）'

const HF_5_CONTROLS_THE_SAME_SIZE =
  '行の名前の文字サイズにかかわらず、操作子を同じ大きさで描くこと（MUST）'

const HF_5_NOT_FOLLOWING_THE_TEXT_SIZE =
  '揃えること（MUST）。**⛔ **読む人の文字サイズや宿主の行ボックスに追随させてはならない（MUST NOT）'

const PI_37_ONE_FORMULA_FOR_THE_ROW_NAME =
  '`rowTitleFontPxOf`（行の名前の字の大きさ。深さ 1 は 表 T-201 の `S-36` × `S-38`、ほかは `S-36`。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-094 (MUST) -- the sizes of the drawing, labels included, follow table T-201', FR_094_SIZES_FROM_T_201],
  ['FR-094 (MUST NOT) -- no size the table does not hold', FR_094_NO_SIZE_OF_ITS_OWN],
  ['T-051 HF-5 (MUST) -- the controls are drawn the same size whatever the name size', HF_5_CONTROLS_THE_SAME_SIZE],
  ['T-051 HF-5 (MUST NOT) -- the controls do not follow the text size or the host line box', HF_5_NOT_FOLLOWING_THE_TEXT_SIZE],
]

// see T-201
const t201 = (id: string): number => {
  const row = specTable('T-201').rows.find((one) => one.id === id)
  const value = Number.parseFloat(bare(row?.by['既定値'] ?? ''))
  if (!Number.isFinite(value)) throw new Error(`table T-201 row ${id} states no default`)
  return value
}

const S_36 = t201('S-36')
const S_38 = t201('S-38')
const DEPTH_1_NAME_PX = S_36 * S_38
const DEEPER_NAME_PX = S_36
const RAISED_FONT = 20
const RAISED_TOP_SCALE = 1.5

// see FR-039, T-252
const DRAWN_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

describe('CR-381 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-064 PI-37 still names S-36 x S-38 for depth 1 and S-36 below it', () => {
    expect(DESIGN).toContain(PI_37_ONE_FORMULA_FOR_THE_ROW_NAME)
  })

  it('T-201: S-36 is 19.5 (CR-418, 13 x 1.5) and S-38 is 1.3, so depth 1 is 25.35, and the generated defaults agree', () => {
    expect(S_36).toBe(19.5)
    expect(S_38).toBe(1.3)
    expect(DEPTH_1_NAME_PX).toBeCloseTo(25.35, 9)
    expect(SETTINGS_DEFAULTS['rowTitleFont']).toBe(S_36)
    expect(SETTINGS_DEFAULTS['rowTitleTopScale']).toBe(S_38)
    expect(rowNameFontPx(1)).toBeCloseTo(DEPTH_1_NAME_PX, 9)
    expect(rowNameFontPx(2)).toBe(DEEPER_NAME_PX)
  })

  it('the raised pair used below lies inside the T-201 bounds and moves both answers', () => {
    const bounds = (id: string): readonly [number, number] => {
      const row = specTable('T-201').rows.find((one) => one.id === id)
      return [Number.parseFloat(bare(row?.by['下限'] ?? '')), Number.parseFloat(bare(row?.by['上限'] ?? ''))]
    }
    const [, fontMax] = bounds('S-36')
    const [scaleMin, scaleMax] = bounds('S-38')
    expect(RAISED_FONT).toBeLessThanOrEqual(fontMax)
    expect(RAISED_TOP_SCALE).toBeGreaterThanOrEqual(scaleMin)
    expect(RAISED_TOP_SCALE).toBeLessThanOrEqual(scaleMax)
    expect(rowNameFontPx(1, RAISED_FONT, RAISED_TOP_SCALE)).not.toBeCloseTo(DEPTH_1_NAME_PX, 3)
    expect(rowNameFontPx(2, RAISED_FONT, RAISED_TOP_SCALE)).not.toBeCloseTo(DEEPER_NAME_PX, 3)
  })
})

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, displayScale: DEFAULT_DISPLAY_SCALE, ...part }) as unknown as DocumentSettings

const THEME_HUE = Number(bare(specTable('T-216').rows.find((one) => one.id === 'S-73')?.by['既定'] ?? ''))

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, language: 'ja' },
}

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (groups: readonly TaskGroup[]): Schedule =>
  ({
    project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0 },
    calendars: [],
    tasks: [],
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: [],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({ x, y, width, height })

const THREE_DEPTHS = [
  groupOf({ id: 'g1', label: 'top' }),
  groupOf({ id: 'g2', parentId: 'g1', label: 'below' }),
  groupOf({ id: 'g3', parentId: 'g2', label: 'further' }),
]

const titlesOf = (settings: DocumentSettings): readonly RowTitle[] => {
  const panel = rowTitlePanelFromSchedule(scheduleOf(THREE_DEPTHS), settings, emptySelection(), ROOT, {
    ...READINGS,
    rowBoxes: ['g1', 'g2', 'g3'].map((groupId, index) => ({ groupId, box: rect(0, index * 24, 400, 24) })),
  })
  return [...panel.pinnedTitles, ...panel.titles]
}

const fontPxOf = (title: RowTitle | undefined): unknown =>
  (title as unknown as Record<string, unknown> | undefined)?.['fontPx']

describe('T-064 PI-37 / FR-094 -- RowTitle.fontPx is the size the row name is drawn at', () => {
  it('premise: the three rows are described at depths 1, 2 and 3', () => {
    expect(titlesOf(settingsOf()).map((one) => [one.groupId, one.depth])).toEqual([
      ['g1', 1],
      ['g2', 2],
      ['g3', 3],
    ])
  })

  it('depth 1 carries S-36 x S-38 x the drawn ratio, depths 2 and 3 carry S-36 x the drawn ratio (MUST)', () => {
    const [top, below, further] = titlesOf(settingsOf())
    expect(
      fontPxOf(top),
      `depth 1 = S-36 × S-38 × 描く比（表 T-252 の DS-1）; ${FR_094_SIZES_FROM_T_201}`,
    ).toBeCloseTo(DEPTH_1_NAME_PX * DRAWN_RATIO, 9)
    expect(
      fontPxOf(below),
      `depth 2 = S-36 × 描く比（表 T-252 の DS-1）; ${FR_094_SIZES_FROM_T_201}`,
    ).toBeCloseTo(DEEPER_NAME_PX * DRAWN_RATIO, 9)
    expect(
      fontPxOf(further),
      `depth 3 = S-36 × 描く比（表 T-252 の DS-1）; ${FR_094_SIZES_FROM_T_201}`,
    ).toBeCloseTo(DEEPER_NAME_PX * DRAWN_RATIO, 9)
  })

  it('follows the document settings rather than a size of its own: S-36 20 and S-38 1.5 give 30 and 20, each times the drawn ratio (MUST NOT)', () => {
    const [top, below] = titlesOf(settingsOf({ rowTitleFont: RAISED_FONT, rowTitleTopScale: RAISED_TOP_SCALE }))
    expect(fontPxOf(top), FR_094_NO_SIZE_OF_ITS_OWN).toBeCloseTo(
      RAISED_FONT * RAISED_TOP_SCALE * DRAWN_RATIO,
      9,
    )
    expect(fontPxOf(below), FR_094_NO_SIZE_OF_ITS_OWN).toBeCloseTo(RAISED_FONT * DRAWN_RATIO, 9)
  })
})

const U_23 = bare(specTable('T-103').rows.find((one) => one.id === 'U-23')?.by['確定名（英）'] ?? '')
const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
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
  tooltips: [],
}

const rowTitle = (groupId: string, depth: number, font: { readonly fontPx: number } = rowNameFont(depth)): RowTitle => ({
  groupId,
  depth,
  indentPx: depth * ROW_TITLE_INDENT,
  box: rect(0, 40, 220, 64),
  label: groupId,
  wholeLabel: groupId,
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: true },
  isPinned: false,
  isSelected: false,
  ...font,
})

const treeRowsOf = (titles: readonly RowTitle[]): FakeElement[] => {
  const built = wire({ preference: 'light', hue: THEME_HUE }, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, rowTitlePanel: { pinnedTitles: [], titles } })
  const tree = oneByRole(built.root(), U_23)
  expect(tree.children.length, `the tree drew ${tree.children.length} rows: ${whatWasDrawn(tree)}`).toBe(titles.length)
  return tree.children
}

const nameNodeOf = (row: FakeElement, label: string): FakeElement => {
  const found = selfAndDescendants(row).filter(
    (one) => one !== row && one.textContent === label && one.children.length === 0,
  )
  expect(found.length, `exactly one node holds the name ${label}: ${whatWasDrawn(row)}`).toBe(1)
  return found[0] as FakeElement
}

const pxOf = (written: string | undefined): number | null => {
  const found = /^\s*(-?\d+(?:\.\d+)?)px\s*$/.exec(written ?? '')
  return found === null ? null : Number(found[1])
}

const controlSizesOf = (row: FakeElement): readonly string[] =>
  selfAndDescendants(row)
    .filter((one) => one.getAttribute('data-icon') !== null)
    .map((control) => {
      const chain: string[] = [`${styleMap(control).get('width') ?? '-'} x ${styleMap(control).get('height') ?? '-'}`]
      let at: FakeElement | null = control
      while (at !== null) {
        chain.push(styleMap(at).get('font-size') ?? '-')
        if (at === row) break
        at = at.parentNode
      }
      return chain.join(' < ')
    })

describe('UF-71 -- the name span takes RowTitle.fontPx, and the row box does not (FR-094, T-051 HF-5)', () => {
  it('draws a depth-1 name at S-36 x S-38 and a depth-2 name at S-36 (MUST)', () => {
    const [top, below] = treeRowsOf([rowTitle('RowTop', 1), rowTitle('RowBelow', 2)])
    const topName = nameNodeOf(top as FakeElement, 'RowTop')
    const belowName = nameNodeOf(below as FakeElement, 'RowBelow')
    expect(pxOf(styleMap(topName).get('font-size')), `depth 1: ${FR_094_SIZES_FROM_T_201}: ${whatWasDrawn(topName)}`)
      .toBeCloseTo(DEPTH_1_NAME_PX, 6)
    expect(pxOf(styleMap(belowName).get('font-size')), `depth 2: ${FR_094_SIZES_FROM_T_201}: ${whatWasDrawn(belowName)}`)
      .toBeCloseTo(DEEPER_NAME_PX, 6)
  })

  it('writes whatever RowTitle.fontPx says, not a size the surface holds (MUST NOT)', () => {
    const [top, below] = treeRowsOf([
      rowTitle('RowTop', 1, { fontPx: rowNameFontPx(1, RAISED_FONT, RAISED_TOP_SCALE) }),
      rowTitle('RowBelow', 2, { fontPx: rowNameFontPx(2, RAISED_FONT, RAISED_TOP_SCALE) }),
    ])
    expect(pxOf(styleMap(nameNodeOf(top as FakeElement, 'RowTop')).get('font-size')), FR_094_NO_SIZE_OF_ITS_OWN)
      .toBeCloseTo(RAISED_FONT * RAISED_TOP_SCALE, 6)
    expect(pxOf(styleMap(nameNodeOf(below as FakeElement, 'RowBelow')).get('font-size')), FR_094_NO_SIZE_OF_ITS_OWN)
      .toBeCloseTo(RAISED_FONT, 6)
  })

  it('leaves the row box without the name size, so its controls are declared alike for any name size (MUST, MUST NOT)', () => {
    const [plain] = treeRowsOf([rowTitle('RowAlpha', 1)])
    const [raised] = treeRowsOf([rowTitle('RowAlpha', 1, { fontPx: rowNameFontPx(1, RAISED_FONT, RAISED_TOP_SCALE) })])
    const plainRow = plain as FakeElement
    const raisedRow = raised as FakeElement
    expect(pxOf(styleMap(raisedRow).get('font-size')), `${HF_5_NOT_FOLLOWING_THE_TEXT_SIZE}: ${whatWasDrawn(raisedRow)}`)
      .not.toBe(RAISED_FONT * RAISED_TOP_SCALE)
    expect(styleMap(raisedRow).get('font-size') ?? '-', HF_5_NOT_FOLLOWING_THE_TEXT_SIZE)
      .toBe(styleMap(plainRow).get('font-size') ?? '-')
    expect(controlSizesOf(plainRow).length, `premise: the row draws controls: ${whatWasDrawn(plainRow)}`).toBeGreaterThan(0)
    expect(controlSizesOf(raisedRow), HF_5_CONTROLS_THE_SAME_SIZE).toEqual(controlSizesOf(plainRow))
  })
})

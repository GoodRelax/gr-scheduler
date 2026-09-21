// The clipboard carries a PNG only, the vertical scrollbar meets the panel, and a row name is cut once.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type {
  AppHeaderItems,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
  Scrollbar,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type { ScreenTheme } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  byRole,
  selfAndDescendants,
  styleMap,
  surfaceOf,
  whatWasDrawn,
  wire,
  type FakeElement,
} from '../fixtures/fake-browser'
import { rowNameFont } from '../fixtures/row-name-font'
import { bare, specTable, unbroken } from '../contract/spec-table'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_025_THE_CLIPBOARD_CARRIES_ONE_PNG =
  '⭐ `IO-6` がクリップボードへ載せるのは、`IO-4` と同じ PNG の画像 1 つだけとすること（MUST）。'

const FR_025_NO_SVG_TEXT_BESIDE_IT =
  'SVG の文字をクリップボードへ載せてはならない（MUST NOT） —— 画像と一緒にであっても載せない。'

const FR_025_WHY_TEXT_WILL_NOT_DO =
  '⚠️ 文字を載せると、貼る先が文字を受け取る欄では絵ではなく SVG の文字が貼られ、資料へ貼るという `IO-6` の用途を果たさない。'

const FR_051_THE_BAR_MEETS_THE_PANEL =
  '⭐ 縦の `Scrollbars` は、プロパティパネルを出しているとき（`_assets/tbl-settings.md` の 表 T-206 の `S-99h`）はその左端に、出していないときは `GRS` が占める画面の右端に接して置くこと（MUST）。'

const FR_051_NO_GAP_BESIDE_IT =
  'あいだに隙間を置いてはならない（MUST NOT） —— 帯の右に空いた場所は何にも使われず、日程を描く幅を削るだけである。'

const FR_051_THE_PADDING_GOES_INSIDE =
  '⭐ `canvasPadding`（同書の 表 T-201 の `S-56`）を横に取る場所は、`Row Area` と縦の `Scrollbars` のあいだとすること（MUST） —— `FR-052` の `Row Area` の幅の式は変わらない。'

const FR_085_THE_NAME_IS_CUT_ONCE =
  '⛔ 行の名前を切るのは本段の打ち切りだけとし、描く側が字の実寸で重ねて切り、打ち切りの記号を足してはならない（MUST NOT）'

const FR_085_THE_OVERFLOW_IS_ONLY_HIDDEN =
  '⭐ 概算より実寸が広い名前が、名前に使える幅をはみ出したときは、はみ出したぶんを隠すだけとすること（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-025 (MUST) -- the clipboard carries one PNG, the same one IO-4 writes', FR_025_THE_CLIPBOARD_CARRIES_ONE_PNG],
  ['FR-025 (MUST NOT) -- no SVG text, not even beside the picture', FR_025_NO_SVG_TEXT_BESIDE_IT],
  ['FR-025 -- why text will not do for IO-6', FR_025_WHY_TEXT_WILL_NOT_DO],
  ['FR-051 (MUST) -- the vertical bar meets the properties panel, or the screen edge', FR_051_THE_BAR_MEETS_THE_PANEL],
  ['FR-051 (MUST NOT) -- no gap beside it', FR_051_NO_GAP_BESIDE_IT],
  ['FR-051 (MUST) -- canvasPadding is taken between the Row Area and the bar', FR_051_THE_PADDING_GOES_INSIDE],
  ['FR-085 (MUST NOT) -- the renderer adds no truncation mark of its own', FR_085_THE_NAME_IS_CUT_ONCE],
  ['FR-085 (MUST) -- what overflows is only hidden', FR_085_THE_OVERFLOW_IS_ONLY_HIDDEN],
]

describe('CR-390 / CR-391 / CR-392 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

describe('table T-024 IO-6 -- the clipboard row now names the format', () => {
  it('says the picture handed to another app is a PNG', () => {
    const io6 = rowOf('T-024', 'IO-6')
    expect(io6.cells.join(' '), FR_025_THE_CLIPBOARD_CARRIES_ONE_PNG).toContain(
      '現在の画面を PNG の画像として他のアプリへ渡す',
    )
  })

  it('points at FR-025 for what may be put on the clipboard, rather than stating it twice', () => {
    const io6 = rowOf('T-024', 'IO-6')
    expect(io6.cells.join(' '), 'a value table does not hold the rule itself').toContain('FR-025')
  })

  it('names the same PNG row IO-4 is, so one format answers both routes', () => {
    const io4 = rowOf('T-024', 'IO-4')
    expect(bare(io4.by['形式'] ?? io4.cells[0] ?? ''), 'IO-4 is the PNG export').toBe('PNG')
  })
})

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const PADDING = SETTINGS_DEFAULTS['canvasPadding'] as number

interface MeasuredScreen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly rulerHeight: number
  readonly rowTitlePanelWidth: number
  readonly propertyPanelWidth: number
  readonly scrollbarThickness: number
}

const SCREEN: MeasuredScreen = {
  width: 1280,
  height: 800,
  appHeaderHeight: 56,
  rulerHeight: 48,
  rowTitlePanelWidth: 240,
  propertyPanelWidth: 280,
  scrollbarThickness: 8,
}

const regionsOf = (part: Partial<MeasuredScreen> = {}): ScreenRegions => {
  const screen: MeasuredScreen = { ...SCREEN, ...part }
  const canvas: ScreenRect = {
    x: 0,
    y: screen.appHeaderHeight,
    width: screen.width,
    height: screen.height - screen.appHeaderHeight,
  }
  const rowAreaWidth =
    canvas.width -
    PADDING -
    screen.rowTitlePanelWidth -
    screen.propertyPanelWidth -
    screen.scrollbarThickness
  const rowAreaHeight = canvas.height - screen.rulerHeight - PADDING - screen.scrollbarThickness

  return {
    appHeader: { x: 0, y: 0, width: screen.width, height: screen.appHeaderHeight },
    scheduleCanvas: canvas,
    rowTitlePanel: {
      x: canvas.x,
      y: canvas.y,
      width: screen.rowTitlePanelWidth,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y,
      width: rowAreaWidth,
      height: screen.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - screen.propertyPanelWidth,
      y: canvas.y,
      width: screen.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + screen.rowTitlePanelWidth,
      y: canvas.y + screen.rulerHeight,
      width: rowAreaWidth,
      height: rowAreaHeight,
    },
  }
}

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, language: 'ja' },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: 214,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const withPropertiesShowing = (showing: boolean): ScreenSession => ({
  ...ROOT,
  screen: {
    ...ROOT.screen,
    propertiesPanelContentState: showing
      ? { kind: 'documentSettingsDisplayed', returnSubject: null }
      : { kind: 'hidden' },
  },
})

const verticalBarOf = (frame: ScreenFrame): Scrollbar => {
  const found = frame.scrollbars.filter((bar) => bar.axis === 'vertical')
  expect(found, 'SC-4 of table T-031 draws both bars at all times').toHaveLength(1)
  return found[0] as Scrollbar
}

describe('FR-051 (MUST) -- the vertical scrollbar meets the panel on its right', () => {
  it('meets the properties panel\'s left edge while the panel is shown', () => {
    const regions = regionsOf()
    const frame = screenFrameFromRegions(
      regions,
      settingsOf({ propertyPanelWidth: SCREEN.propertyPanelWidth }),
      withPropertiesShowing(true),
      READINGS,
    )
    const bar = verticalBarOf(frame)
    expect(bar.track.x + bar.track.width, FR_051_THE_BAR_MEETS_THE_PANEL).toBeCloseTo(
      regions.propertiesPanel.x,
      6,
    )
  })

  it('meets the screen\'s right edge while the panel is hidden', () => {
    const regions = regionsOf({ propertyPanelWidth: 0 })
    const frame = screenFrameFromRegions(
      regions,
      settingsOf({ propertyPanelWidth: 0 }),
      withPropertiesShowing(false),
      READINGS,
    )
    const bar = verticalBarOf(frame)
    expect(bar.track.x + bar.track.width, FR_051_THE_BAR_MEETS_THE_PANEL).toBeCloseTo(
      regions.scheduleCanvas.x + regions.scheduleCanvas.width,
      6,
    )
  })

  it('leaves no gap on its right in either state (MUST NOT)', () => {
    for (const shown of [true, false]) {
      const width = shown ? SCREEN.propertyPanelWidth : 0
      const regions = regionsOf({ propertyPanelWidth: width })
      const frame = screenFrameFromRegions(
        regions,
        settingsOf({ propertyPanelWidth: width }),
        withPropertiesShowing(shown),
        READINGS,
      )
      const bar = verticalBarOf(frame)
      const meets = shown
        ? regions.propertiesPanel.x
        : regions.scheduleCanvas.x + regions.scheduleCanvas.width
      expect(meets - (bar.track.x + bar.track.width), `${FR_051_NO_GAP_BESIDE_IT} -- shown ${shown}`)
        .toBeCloseTo(0, 6)
    }
  })

  it('takes canvasPadding between the Row Area and the bar, leaving FR-052\'s width untouched', () => {
    const regions = regionsOf()
    const frame = screenFrameFromRegions(
      regions,
      settingsOf({ propertyPanelWidth: SCREEN.propertyPanelWidth }),
      withPropertiesShowing(true),
      READINGS,
    )
    const bar = verticalBarOf(frame)
    const rowAreaRight = regions.rowArea.x + regions.rowArea.width
    expect(bar.track.x - rowAreaRight, FR_051_THE_PADDING_GOES_INSIDE).toBeCloseTo(PADDING, 6)
  })
})

const THEME: ScreenTheme = {
  preference: 'light',
  hue: Number(bare(rowOf('T-216', 'S-73').by['既定'] ?? '')),
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

const CUT_NAME = 'a row name the panel already cut'

const cutRowTitle = (): RowTitle => ({
  groupId: 'RowAlpha',
  depth: 1,
  ...rowNameFont(1),
  indentPx: SETTINGS_DEFAULTS['rowTitleIndent'] as number,
  box: { x: 0, y: 40, width: 148, height: 29 },
  label: `${CUT_NAME}…`,
  wholeLabel: `${CUT_NAME} and everything the cut took off the end`,
  isLabelTruncated: true,
  expander: EVERY_CONTROL,
  isPinned: false,
  isSelected: false,
})

const VIEW_WITH_A_CUT_NAME: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [cutRowTitle()] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

describe('FR-085 -- a row name is cut once, and the renderer adds no mark of its own', () => {
  const rowTitleTreeOf = (root: FakeElement): FakeElement[] => {
    const found = byRole(root, 'Row Title Tree')
    expect(found.length, 'premise: U-23 of table T-103 reaches the screen').toBeGreaterThan(0)
    return found.flatMap((one) => selfAndDescendants(one))
  }

  it('declares text-overflow on no node of the row title tree (MUST NOT)', () => {
    const built = wire(THEME, { 'App Header': 37 })
    surfaceOf(built).showScreenView(VIEW_WITH_A_CUT_NAME)
    const offenders = rowTitleTreeOf(built.root()).filter(
      (one) => (styleMap(one).get('text-overflow') ?? '') !== '',
    )
    expect(
      offenders.map((one) => styleMap(one).get('text-overflow')),
      `${FR_085_THE_NAME_IS_CUT_ONCE} -- ${whatWasDrawn(built.root())}`,
    ).toEqual([])
  })

  it('still hides what overflows, so the cut name does not spill out of its box (MUST)', () => {
    const built = wire(THEME, { 'App Header': 37 })
    surfaceOf(built).showScreenView(VIEW_WITH_A_CUT_NAME)
    const hiding = rowTitleTreeOf(built.root()).filter(
      (one) => (styleMap(one).get('overflow') ?? '') === 'hidden',
    )
    expect(hiding.length, FR_085_THE_OVERFLOW_IS_ONLY_HIDDEN).toBeGreaterThan(0)
  })

  it('writes the name the panel handed it, with exactly the one mark that cut carries', () => {
    const built = wire(THEME, { 'App Header': 37 })
    surfaceOf(built).showScreenView(VIEW_WITH_A_CUT_NAME)
    const written = selfAndDescendants(built.root())
      .map((one) => one.textContent)
      .filter((text) => text.includes(CUT_NAME))
    expect(written.length, 'premise: the row name reaches the screen').toBeGreaterThan(0)
    for (const text of written) {
      expect((text.match(/…/g) ?? []).length, FR_085_THE_NAME_IS_CUT_ONCE).toBe(1)
    }
  })
})

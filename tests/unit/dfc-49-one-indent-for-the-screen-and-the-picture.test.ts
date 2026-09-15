// DFC-49 of `docs/development-records/defects.md` -- the row that read

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { rowTitlePanelFromSchedule } from '../../src/adapter/screen-renderer/row-title-panel'
import type {
  RowTitle,
  RowTitlePanel,
  ScreenSession,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'
import { rowNameFont } from '../fixtures/row-name-font'


const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const numberIn = (cell: string, what: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

const settingOf = (table: string, id: string): number =>
  numberIn(rowOf(table, id).by[DEFAULT_COLUMN] ?? '', `table ${table} row ${id}`)

const S_140 = settingOf('T-206', 'S-140')
const S_138 = settingOf('T-206', 'S-138')
const S_218 = settingOf('T-206', 'S-218')
const THEME_HUE = settingOf('T-216', 'S-73')


const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, ...part }) as unknown as DocumentSettings

const PANEL = settingsOf({
  rowTitlePanelWidth: 400, // see S-79
  rowTitleFont: 20, // see S-36
  rowTitleTopScale: 1, // see S-38
  labelCoef: 0.5, // see S-30
  maxGroupDepth: 5, // see S-125
  truncateUnits: 120, // see S-35
  pinnedGroupIds: [], // see S-126
  pinnedRowMax: 5, // see S-127
})

const panelWith = (part: Record<string, unknown>): DocumentSettings =>
  settingsOf({ ...(PANEL as unknown as Record<string, unknown>), ...part })

const keyOf = (settings: DocumentSettings, key: string): number =>
  (settings as unknown as Record<string, number>)[key] as number

const SESSION: ScreenSession = {
  language: 'ja',
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  isDialogueFieldVisible: true,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  isMilestoneListOpen: false,
  isPaletteMinimised: false,
  dualCursorFollowing: null,
  selectedGroupIds: [],
  selectedResourceUids: [],
  propertiesSubject: null,
  propertiesShowing: null,
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    parentId: null,
    label: null,
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
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

const boxAt = (index: number): ScreenRect => ({ x: 0, y: index * 24, width: 400, height: 24 })

/** @purity pure */
const titlesOfChain = (
  depth: number,
  label: string,
  settings: DocumentSettings,
): readonly RowTitle[] => {
  const ids = Array.from({ length: depth }, (_unused, index) => `g${index + 1}`)
  const groups = ids.map((id, index) =>
    groupOf({ id, parentId: index === 0 ? null : `g${index}`, label, order: index }),
  )
  const panel: RowTitlePanel = rowTitlePanelFromSchedule(
    scheduleOf(groups),
    settings,
    emptySelection(),
    { ...SESSION, rowBoxes: ids.map((groupId, index) => ({ groupId, box: boxAt(index) })) },
  )
  return [...panel.pinnedTitles, ...panel.titles]
}

const deepestTitle = (depth: number, label: string, settings: DocumentSettings): RowTitle => {
  const found = titlesOfChain(depth, label, settings).filter((one) => one.groupId === `g${depth}`)
  expect(found.length, `exactly one title for g${depth}`).toBe(1)
  return found[0] as RowTitle
}

/** @purity pure */
const keptOf = (settings: DocumentSettings, depth: number): number => {
  for (let length = 1; length <= 400; length += 1) {
    if (deepestTitle(depth, 'x'.repeat(length), settings).isLabelTruncated) return length - 1
  }
  throw new Error('no half-width name of any length was cut by this panel')
}

const DEPTHS = [1, 2, 3, 4, 5] as const


describe('DFC-49 / FR-085 -- the row title panel works the indent out once', () => {
  it.each(DEPTHS)(
    'gives a depth %i row `indentPx` of depth x `S-37`, and no other number',
    (depth) => {
      const indent = keyOf(PANEL, 'rowTitleIndent')
      expect(deepestTitle(depth, 'a row', PANEL).indentPx).toBe(depth * indent)
    },
  )

  it('sets each tier of a chain exactly one `S-37` further in than its parent', () => {
    const indent = keyOf(PANEL, 'rowTitleIndent')
    const byDepth = [...titlesOfChain(DEPTHS.length, 'a row', PANEL)].sort(
      (one, two) => one.depth - two.depth,
    )
    const steps = byDepth
      .slice(1)
      .map((one, index) => one.indentPx - (byDepth[index] as RowTitle).indentPx)
    expect(steps).toEqual(byDepth.slice(1).map(() => indent))
  })

  it.each(DEPTHS)(
    'cuts a depth %i name at the room `indentPx`, `S-140`, `S-138` and `S-218` leave',
    (depth) => {
      const perCharacter = keyOf(PANEL, 'rowTitleFont') * keyOf(PANEL, 'labelCoef')
      const room =
        keyOf(PANEL, 'rowTitlePanelWidth') -
        deepestTitle(depth, 'a row', PANEL).indentPx -
        S_140 -
        S_138 -
        S_218
      expect(keptOf(PANEL, depth)).toBe(Math.floor(room / perCharacter))
    },
  )

  it.each(DEPTHS)('moves the push and the cut together when `S-37` moves, at depth %i', (depth) => {
    const perCharacter = keyOf(PANEL, 'rowTitleFont') * keyOf(PANEL, 'labelCoef')
    const wider = panelWith({ rowTitleIndent: keyOf(PANEL, 'rowTitleIndent') + perCharacter })

    expect(
      deepestTitle(depth, 'a row', wider).indentPx - deepestTitle(depth, 'a row', PANEL).indentPx,
    ).toBe(depth * perCharacter)
    expect(keptOf(wider, depth) - keptOf(PANEL, depth)).toBe(-depth)
  })
})


const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const EXPORT_SETTINGS = nestedFrom(SETTINGS_DEFAULTS) as unknown as DocumentSettings

const EXPORT_SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const

const EXPORT_REGIONS: ScreenRegions = (() => {
  const canvasHeight = EXPORT_SCREEN.height - EXPORT_SCREEN.appHeaderHeight
  const rowAreaWidth =
    EXPORT_SCREEN.width - EXPORT_SETTINGS.canvasPadding - EXPORT_SETTINGS.rowTitlePanelWidth
  return {
    appHeader: { x: 0, y: 0, width: EXPORT_SCREEN.width, height: EXPORT_SCREEN.appHeaderHeight },
    scheduleCanvas: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SCREEN.width,
      height: canvasHeight,
    },
    rowTitlePanel: {
      x: 0,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: EXPORT_SETTINGS.rowTitlePanelWidth,
      height: canvasHeight,
    },
    timeRuler: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: rowAreaWidth,
      height: EXPORT_SETTINGS.rulerHeight,
    },
    propertiesPanel: {
      x: EXPORT_SCREEN.width,
      y: EXPORT_SCREEN.appHeaderHeight,
      width: 0,
      height: canvasHeight,
    },
    rowArea: {
      x: EXPORT_SETTINGS.rowTitlePanelWidth,
      y: EXPORT_SCREEN.appHeaderHeight + EXPORT_SETTINGS.rulerHeight,
      width: rowAreaWidth,
      height: canvasHeight - EXPORT_SETTINGS.rulerHeight - EXPORT_SETTINGS.canvasPadding,
    },
  }
})()

const PICTURE_ROW_NAME = 'a row that reaches the picture'

const sceneIndentedBy = (indentPx: number): ExportScene => {
  const view: ScreenView = {
    language: 'ja',
    frame: { isFullScreen: false, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: 'a document on its way to a picture',
      openedFileName: null,
      fileSavedAt: null,
      fileNeverSavedText: '',
      commands: [],
      language: 'ja',
    },
    rowTitlePanel: {
      pinnedTitles: [],
      titles: [
        {
          groupId: 'g1',
          depth: 1,
          ...rowNameFont(1),
          indentPx,
          box: {
            x: 0,
            y: 120,
            width: EXPORT_SETTINGS.rowTitlePanelWidth,
            height: 60,
          },
          label: PICTURE_ROW_NAME,
          wholeLabel: PICTURE_ROW_NAME,
          isLabelTruncated: false,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          isPinned: false,
          isSelected: false,
        },
      ],
    },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  }
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer"><circle cx="7" cy="11" r="3"/></svg>',
    regions: EXPORT_REGIONS,
    screenView: view,
    settings: EXPORT_SETTINGS,
    themeHue: THEME_HUE,
  }
}

/** @purity pure */
const nameDrawnAt = (svg: string): number => {
  const found = new RegExp(`<text([^<>]*)>${PICTURE_ROW_NAME}</text>`).exec(svg)
  if (found === null) {
    throw new Error('the picture drew no element carrying the row name this scene handed it')
  }
  const x = Number.parseFloat(/\bx="([^"]*)"/.exec(found[1] ?? '')?.[1] ?? 'NaN')
  if (!Number.isFinite(x)) throw new Error('the row name the picture drew states no x')
  return x
}

const pictureOf = (scene: ExportScene): string => {
  const answer = exportSvg(scene)
  if (!answer.ok) {
    throw new Error('exportSvg refused a picture this fixture is nowhere near the ceiling of')
  }
  return answer.svg
}

describe('DFC-49 -- the picture sets a row in by the `indentPx` it was handed', () => {
  const PICTURE_SCALE = EXPORT_SETTINGS.exportCanvas.width / EXPORT_SCREEN.width

  it.each([8, 40])('moves the drawn name by the `indentPx` it is given (+%i)', (extra) => {
    const base = nameDrawnAt(pictureOf(sceneIndentedBy(0)))
    expect(nameDrawnAt(pictureOf(sceneIndentedBy(extra))) - base).toBeCloseTo(extra * PICTURE_SCALE)
  })

  it('does not move when `S-37` moves in the settings but the `indentPx` does not', () => {
    const scene = sceneIndentedBy(0)
    const moved: ExportScene = {
      ...scene,
      settings: {
        ...(scene.settings as unknown as Record<string, unknown>),
        rowTitleIndent: keyOf(scene.settings, 'rowTitleIndent') + 24,
      } as unknown as DocumentSettings,
    }
    expect(nameDrawnAt(pictureOf(moved))).toBe(nameDrawnAt(pictureOf(scene)))
  })
})

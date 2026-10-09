// CR-657: the group grid lines (U-18) are drawn across the Task Group Panel (U-22) too.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene } from '../../src/adapter/image-exporter/image-exporter'
import { taskGroupPanelFromSchedule } from '../../src/adapter/screen-renderer/task-group-panel'
import type {
  TaskGroupTitle,
  TaskGroupPanel,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { colourOf, GROUP_GRID_LINE_WIDTH_PX } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { specTable, unbroken } from './spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)


const FR_042_PANEL_CARRIES_THE_LINE =
  ' —— 1 つのタスクグループ ＝ 1 対象がマルチバーの中核なので、境界が見えないとどこまでが 1 つのタスクグループか読めない。⭐ **境界の線は、日程の側（`Task Group Area`、`U-50`）だけでなく、タスクグループパネル（`U-22`）のタスクグループの境にも引くこと（MUST）'

const FR_042_LEFT_TO_RIGHT_AND_UNBROKEN =
  '18`）と同じ線であり、同じ線とは太さ・色・縦の位置が同じであるということである。線はタスクグループパネルの左端から右端まで引き、日程の側の線と切れ目なく続けること（MUST）'

const FR_098_PINNED_BAND_SIDE = '⭐ タスクグループ見出しの側の境目も同じ線で示す —— タスクグループパネルにも線を引く規則は `FR-042` が持つ。'
const EP_3_EXPORT_SIDE = '⭐ タスクグループの境のグループ罫線（`U-18`）も画面のとおり描く'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-042 (MUST) -- the Task Group Panel carries the line at each row boundary', FR_042_PANEL_CARRIES_THE_LINE],
  ['FR-042 (MUST) -- left edge to right edge, unbroken into the schedule side', FR_042_LEFT_TO_RIGHT_AND_UNBROKEN],
  ['FR-098 -- the pinned band boundary on the task group title side', FR_098_PINNED_BAND_SIDE],
  ['T-076 EP-3 -- the export draws the task-group-boundary lines too', EP_3_EXPORT_SIDE],
]

describe('CR-657 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})


const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  const value = Number(/-?\d+(?:\.\d+)?/.exec((row?.by[DEFAULT_COLUMN] ?? '').replace(/`/g, ''))?.[0])
  if (!Number.isFinite(value)) throw new Error('table T-216 row S-73 states no hue')
  return value
})()

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, screenLanguage: 'ja', helpLanguage: 'ja' },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const groupOf = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    label: `row ${id}`,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto',
    color: null,
    minHeight: null,
  }) as unknown as TaskGroup

const IDS = ['g1', 'g2', 'g3'] as const

const SCHEDULE: Schedule = {
  project: { title: null, themeHue: THEME_HUE, uidHighWaterMark: 0 },
  calendars: [],
  tasks: [],
  resources: [],
  assignments: [],
  taskGroups: IDS.map((id, order) => groupOf(id, order)),
  taskGroupMembers: [],
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const PANEL_WIDTH = 400

const BOXES: Readonly<Record<string, ScreenRect>> = {
  g1: { x: 0, y: 100, width: PANEL_WIDTH, height: 30 },
  g2: { x: 0, y: 130, width: PANEL_WIDTH, height: 50 },
  g3: { x: 0, y: 180, width: PANEL_WIDTH, height: 24 },
}

const settingsOf = (part: Record<string, unknown>): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    displayScale: DEFAULT_DISPLAY_SCALE,
    taskGroupPanelWidth: PANEL_WIDTH,
    pinnedGroupIds: [],
    ...part,
  }) as unknown as DocumentSettings

const panelOf = (settings: DocumentSettings): TaskGroupPanel =>
  taskGroupPanelFromSchedule(SCHEDULE, settings, emptySelection(), ROOT, {
    ...READINGS,
    taskGroupBoxes: IDS.map((groupId) => ({ groupId, box: BOXES[groupId] as ScreenRect })),
  })

const linesOf = (panel: TaskGroupPanel): readonly ScreenRect[] => panel.groupGridLines ?? []

const titlesOf = (panel: TaskGroupPanel): readonly TaskGroupTitle[] => [...panel.pinnedTitles, ...panel.titles]

const NEAR = 0.01

const lineAtBottomOf = (panel: TaskGroupPanel, box: ScreenRect): ScreenRect | undefined =>
  linesOf(panel).find((line) => Math.abs(line.y + line.height / 2 - (box.y + box.height)) < NEAR)


describe('FR-042 (MUST) -- 「タスクグループパネル（`U-22`）のタスクグループの境にも引くこと」', () => {
  const panel = panelOf(settingsOf({ groupGridLinesVisible: true }))

  it('draws one line at the bottom boundary of every row the panel draws', () => {
    const titles = titlesOf(panel)
    expect(titles.map((one) => one.groupId).sort()).toEqual([...IDS])
    for (const title of titles) {
      expect(lineAtBottomOf(panel, title.box), `a line at the bottom of ${title.groupId}`).toBeDefined()
    }
    expect(linesOf(panel)).toHaveLength(titles.length)
  })

  it('draws it at the thickness of U-18, centred on the boundary as the schedule side strokes it', () => {
    for (const title of titlesOf(panel)) {
      const line = lineAtBottomOf(panel, title.box) as ScreenRect
      expect(line.height, `${title.groupId}'s line thickness`).toBe(GROUP_GRID_LINE_WIDTH_PX)
      expect(line.y).toBeCloseTo(title.box.y + title.box.height - GROUP_GRID_LINE_WIDTH_PX / 2, 6)
    }
  })

  it('draws it from the panel row\'s left edge to its right edge', () => {
    for (const title of titlesOf(panel)) {
      const line = lineAtBottomOf(panel, title.box) as ScreenRect
      expect(line.x, `${title.groupId}'s line starts at the panel's left`).toBeCloseTo(title.box.x, 6)
      expect(line.x + line.width, `${title.groupId}'s line ends at the panel's right`).toBeCloseTo(
        title.box.x + title.box.width,
        6,
      )
    }
  })
})

describe('T-202 S-68 false -- the panel carries no line', () => {
  it('draws no task-group-boundary line when groupGridLinesVisible is false', () => {
    const panel = panelOf(settingsOf({ groupGridLinesVisible: false }))
    expect(titlesOf(panel).length, 'the rows themselves are still drawn').toBe(IDS.length)
    expect(linesOf(panel)).toEqual([])
  })

})


describe('FR-098 -- 「タスクグループ見出しの側の境目も同じ線で示す」', () => {
  it('draws the line under the last pinned row, so the band boundary is shown on the panel side', () => {
    const panel = panelOf(settingsOf({ groupGridLinesVisible: true, pinnedGroupIds: ['g1', 'g2'] }))
    const pinned = panel.pinnedTitles.map((one) => one.groupId)
    expect(pinned, 'the fixture pins g1 and g2').toEqual(['g1', 'g2'])
    const lastPinned = panel.pinnedTitles[panel.pinnedTitles.length - 1] as TaskGroupTitle
    const boundary = lineAtBottomOf(panel, lastPinned.box)
    expect(boundary, 'a line at the boundary between the pinned band and the rest').toBeDefined()
    expect((boundary as ScreenRect).height).toBe(GROUP_GRID_LINE_WIDTH_PX)
    expect((boundary as ScreenRect).x).toBeCloseTo(lastPinned.box.x, 6)
    expect((boundary as ScreenRect).width).toBeCloseTo(lastPinned.box.width, 6)
    for (const title of titlesOf(panel)) {
      expect(lineAtBottomOf(panel, title.box), `a line at the bottom of ${title.groupId}`).toBeDefined()
    }
  })

  it('draws no line at the pinned band boundary either when S-68 is false', () => {
    const panel = panelOf(settingsOf({ groupGridLinesVisible: false, pinnedGroupIds: ['g1', 'g2'] }))
    expect(panel.pinnedTitles.length).toBe(2)
    expect(linesOf(panel)).toEqual([])
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
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

// WHY: a screen narrower than exportCanvas makes the ratio not 1, so an unscaled line cannot pass.
const EXPORT_SCREEN = { width: 1000, height: 800, appHeaderHeight: 56 } as const

const exportSettingsOf = (visible: boolean): DocumentSettings =>
  ({
    ...nestedFrom(SETTINGS_DEFAULTS),
    displayScale: DEFAULT_DISPLAY_SCALE,
    taskGroupPanelWidth: PANEL_WIDTH,
    pinnedGroupIds: [],
    groupGridLinesVisible: visible,
  }) as unknown as DocumentSettings

const EXPORT_REGIONS: ScreenRegions = (() => {
  const canvasHeight = EXPORT_SCREEN.height - EXPORT_SCREEN.appHeaderHeight
  const rulerHeight = (SETTINGS_DEFAULTS as unknown as { rulerHeight: number }).rulerHeight
  const taskGroupAreaWidth = EXPORT_SCREEN.width - SETTINGS_CONSTANTS.canvasPadding - PANEL_WIDTH
  return {
    appHeader: { x: 0, y: 0, width: EXPORT_SCREEN.width, height: EXPORT_SCREEN.appHeaderHeight },
    scheduleCanvas: { x: 0, y: EXPORT_SCREEN.appHeaderHeight, width: EXPORT_SCREEN.width, height: canvasHeight },
    taskGroupPanel: { x: 0, y: EXPORT_SCREEN.appHeaderHeight, width: PANEL_WIDTH, height: canvasHeight },
    timeRuler: { x: PANEL_WIDTH, y: EXPORT_SCREEN.appHeaderHeight, width: taskGroupAreaWidth, height: rulerHeight },
    propertiesPanel: { x: EXPORT_SCREEN.width, y: EXPORT_SCREEN.appHeaderHeight, width: 0, height: canvasHeight },
    taskGroupArea: {
      x: PANEL_WIDTH,
      y: EXPORT_SCREEN.appHeaderHeight + rulerHeight,
      width: taskGroupAreaWidth,
      height: canvasHeight - rulerHeight - SETTINGS_CONSTANTS.canvasPadding,
    },
  }
})()

const RATIO = SETTINGS_CONSTANTS.exportCanvas.width / EXPORT_SCREEN.width

const sceneOf = (settings: DocumentSettings, panel: TaskGroupPanel): ExportScene => {
  const view: ScreenView = {
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
    taskGroupPanel: panel,
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    confirmation: null,
    dialogueField: null,
    tooltips: [],
  } as unknown as ScreenView
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    regions: EXPORT_REGIONS,
    screenView: view,
    settings,
    themePreference: 'light',
    themeHue: THEME_HUE,
  } as unknown as ExportScene
}

interface DrawnRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly fill: string
}

const rectsOf = (svg: string): readonly DrawnRect[] => {
  const found: DrawnRect[] = []
  for (const match of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const attrs = match[1] ?? ''
    const read = (name: string): string => new RegExp(`\\s${name}="([^"]*)"`).exec(attrs)?.[1] ?? ''
    found.push({
      x: Number(read('x')),
      y: Number(read('y')),
      width: Number(read('width')),
      height: Number(read('height')),
      fill: read('fill'),
    })
  }
  return found
}

const pictureOf = (scene: ExportScene): string => {
  const answer = exportSvg(scene)
  if (!answer.ok) throw new Error('exportSvg refused a picture far under the size ceiling')
  return answer.svg
}

// see T-041
const ROUNDING = 0.5

describe('T-076 EP-3 -- 「タスクグループの境のグループ罫線（`U-18`）も画面のとおり描く」', () => {
  it('draws every panel-side line into the picture at its screen rectangle times the export ratio, in U-18\'s colour', () => {
    expect(RATIO, 'the fixture is built so the ratio is not 1').not.toBe(1)
    const settings = exportSettingsOf(true)
    const panel = panelOf(settings)
    expect(linesOf(panel).length, 'the screen carries the lines this case scales').toBe(IDS.length)
    const ink = colourOf('S-165', THEME_HUE, false, settings.themeMonochrome)
    const rects = rectsOf(pictureOf(sceneOf(settings, panel)))
    for (const line of linesOf(panel)) {
      const want = { x: line.x * RATIO, y: line.y * RATIO, width: line.width * RATIO, height: line.height * RATIO }
      const drawn = rects.find(
        (one) =>
          Math.abs(one.x - want.x) < ROUNDING &&
          Math.abs(one.y - want.y) < ROUNDING &&
          Math.abs(one.width - want.width) < ROUNDING &&
          Math.abs(one.height - want.height) < ROUNDING,
      )
      expect(drawn, `a rect at ${JSON.stringify(want)} in the picture`).toBeDefined()
      expect((drawn as DrawnRect).fill, 'drawn in the colour of the schedule-side line').toBe(ink)
    }
  })

  it('draws no panel-side line into the picture when S-68 is false', () => {
    const settings = exportSettingsOf(false)
    const ink = colourOf('S-165', THEME_HUE, false, settings.themeMonochrome)
    const rects = rectsOf(pictureOf(sceneOf(settings, panelOf(settings))))
    const thin = rects.filter(
      (one) => one.fill === ink && Math.abs(one.height - GROUP_GRID_LINE_WIDTH_PX * RATIO) < ROUNDING,
    )
    expect(thin).toEqual([])
  })
})

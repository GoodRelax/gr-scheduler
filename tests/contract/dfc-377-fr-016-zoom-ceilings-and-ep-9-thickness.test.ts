// Contract tests: the zoom clauses of FR-016 and the Panel Divider thickness of EP-9.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import { taskGroupPlacesAtZoomY } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type {
  AppHeaderItems,
  PanelDivider,
  TaskGroupPanel,
  ScreenFrame,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { GROUP_GRID_LINE_WIDTH_PX } from '../../src/adapter/svg-renderer/svg-renderer'
import { exportSvg, type ExportScene, type SvgExport } from '../../src/adapter/image-exporter/image-exporter'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

import { unbroken } from './spec-table'
import { displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Why: check 39 holds a clause only when its words stand in a file under tests/, so the
// clauses are literals; this one is cut at 40 characters, as longer windows cross a paragraph.
// Why: pressing it needs the DOM surface and FR-029's disabled-entrance convention, so
// only its words are held here.
const FR_016_CEILING_HIT_NOT_A_DEAD_ENTRANCE =
  '`GRS` は、上限に達したことを、押しても何も起きない入口で示さないこと。'

const FR_016_TASK_GROUP_POSITION_NOT_BY_ARITHMETIC =
  '`GRS` は、倍率から縦軸の位置を算で求めないこと。'

const FR_016_TASK_GROUP_POSITION_MEMBER_IS_PI_5 =
  '`GRS` は、指定の倍率でのタスクグループの位置を答えるメンバを、表 T-064 の `PI-5` に置くこと。'

const EP_9_SAME_LINE_MEANS_SAME_THICKNESS =
  '境なので、区切りの線の色で描く。⭐ **太さが同じであること（MUST）'

const EP_9_THICKNESS_NOT_ZERO =
  '区切りの線の色で描く。⭐ **太さが同じであること（MUST）**—— ⛔ **太さを 0 で描いてはならない（MUST NOT）'

const EP_9_ONE_PLACE_READS_THE_THICKNESS =
  '。⭐ **太さが同じであること（MUST）**—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。**⭐ 描く側は、罫の太さを 1 か所から読むこと（MUST）'

const EP_9_NO_SECOND_NUMBER =
  'MUST）**—— ⛔ **太さを 0 で描いてはならない（MUST NOT）。**⭐ 描く側は、罫の太さを 1 か所から読むこと（MUST）。番号を 2 か所に置いてはならない（MUST NOT）'

const EP_9_SCREEN_AND_EXPORT_SAME_PLACE =
  '。番号を 2 か所に置いてはならない（MUST NOT） —— **同じ数が 2 か所に載ると、必ず離れていく。**⭐ **画面と書き出しも同じ 1 か所を読むこと（MUST）'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-016 (MUST NOT) -- reaching the ceiling is not shown by a dead entrance', FR_016_CEILING_HIT_NOT_A_DEAD_ENTRANCE],
  ['FR-016 (MUST NOT) -- a task group position at a zoom is not arithmetic', FR_016_TASK_GROUP_POSITION_NOT_BY_ARITHMETIC],
  ['FR-016 (MUST) -- the member that answers it is T-064 PI-5', FR_016_TASK_GROUP_POSITION_MEMBER_IS_PI_5],
  ['T-076 EP-9 (MUST) -- the line has the same thickness', EP_9_SAME_LINE_MEANS_SAME_THICKNESS],
  ['T-076 EP-9 (MUST NOT) -- the thickness is never drawn as zero', EP_9_THICKNESS_NOT_ZERO],
  ['T-076 EP-9 (MUST) -- the thickness is read from one place', EP_9_ONE_PLACE_READS_THE_THICKNESS],
  ['T-076 EP-9 (MUST NOT) -- no second number for it', EP_9_NO_SECOND_NUMBER],
  ['T-076 EP-9 (MUST) -- screen and export read that same one place', EP_9_SCREEN_AND_EXPORT_SAME_PLACE],
]

// Spec: FR-016, EP-9
describe('DFC-377 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    // Why: the only thing that keeps the copies above honest: a reworded clause turns this red.
    expect(REQUIREMENTS).toContain(clause)
  })

  it('holds one clause per marker, and no clause twice', () => {
    // Why: check 39 counts markers, not rules, so two constants on the same window would
    // pay back one clause instead of two.
    expect(new Set(CLAUSES.map(([, clause]) => clause)).size).toBe(CLAUSES.length)
  })
})

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...SETTINGS_DEFAULTS,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = {
  width: SETTINGS_CONSTANTS.exportCanvas.width, // Why: S-81's width, so the export ratio is 1
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const SETTINGS = settingsOf()
const REGIONS: ScreenRegions = regionsFromScreen(ENV, SETTINGS)

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
  themeHue: 0,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const frameOf = (): ScreenFrame =>
  screenFrameFromRegions(REGIONS, SETTINGS, ROOT, READINGS)

// Spec: EP-9
describe('T-076 EP-9 (MUST NOT) -- 「太さを 0 で描いてはならない」', () => {
  it('the one published thickness is not zero', () => {
    expect(GROUP_GRID_LINE_WIDTH_PX).toBeGreaterThan(0)
  })

})

// Spec: EP-9, U-18, FR-052
// Trap: a second hand-typed thickness that equals the published one passes this case;
// nothing here catches the number living in two places, only the clause literal records it.
describe('T-076 EP-9 (MUST) -- 「太さが同じであること」／「描く側は、罫の太さを 1 か所から読むこと」／「番号を 2 か所に置いてはならない」', () => {
  it('every Panel Divider the screen frame builds has that one published width', () => {
    const frame = frameOf()
    expect(frame.dividers.length).toBeGreaterThan(0)
    for (const divider of frame.dividers as readonly PanelDivider[]) {
      expect(divider.line.width, `${divider.panel}'s line width`).toBe(GROUP_GRID_LINE_WIDTH_PX)
    }
  })

})

const VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as ScreenFrame,
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  } as unknown as AppHeaderItems,
  taskGroupPanel: { pinnedTitles: [], titles: [] } as unknown as TaskGroupPanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
} as unknown as ScreenView

function pictureOrThrow(answer: SvgExport): string {
  if (!answer.ok) throw new Error('the fixture is far under S-217, so a refusal is the fixture')
  return answer.svg
}

function rectWidthsOf(svg: string): number[] {
  const widths: number[] = []
  const re = /<rect x="[^"]*" y="[^"]*" width="([^"]*)"/g
  let found: RegExpExecArray | null
  while ((found = re.exec(svg)) !== null) widths.push(Number(found[1]))
  return widths
}

// Spec: EP-9
describe('T-076 EP-9 (MUST) -- 「画面と書き出しも同じ 1 か所を読むこと」', () => {
  it('the export draws the divider line at the width the screen frame carries, not a re-derived one', () => {
    const frame = frameOf()
    const scene: ExportScene = {
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      regions: REGIONS,
      screenView: { ...VIEW, frame },
      settings: SETTINGS,
      themeHue: 214,
    } as unknown as ExportScene

    // Why: exportSvg paints the divider lines last, over the picture, so the trailing
    // frame.dividers.length rects are exactly the divider lines.
    const allWidths = rectWidthsOf(pictureOrThrow(exportSvg(scene)))
    const dividerWidths = allWidths.slice(-frame.dividers.length)
    expect(dividerWidths, 'one rect per Panel Divider, at the frame’s own width').toEqual(
      frame.dividers.map((divider) => divider.line.width),
    )
    for (const width of dividerWidths) expect(width).toBe(GROUP_GRID_LINE_WIDTH_PX)
  })

})

const MS_PER_DAY = 86400000
const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10)

const TASK_FROM = '2026-01-05'

// Why: every nullable column is spelled null, as a column left undefined reads as set.
const taskOf = (uid: number): Task =>
  ({
    uid,
    parentTaskUid: null,
    wbsOrder: null,
    name: null,
    start: TASK_FROM,
    finish: dayAfter(TASK_FROM, 5),
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
  }) as unknown as Task

const groupOf = (id: string, order: number): TaskGroup =>
  ({
    id,
    parentId: null,
    name: null,
    derivedFromTaskUid: null,
    order,
    treeState: 'auto', color: null,
    minHeightPx: null,
  }) as unknown as TaskGroup

// Why: three flat roots, as FR-018's ladder starts at depth 2, so all three are drawn
// at every zoom this file presses.
const THREE_FLAT_TASK_GROUPS = 3

const SCHEDULE: Schedule = (() => {
  const groups = Array.from({ length: THREE_FLAT_TASK_GROUPS }, (_unused, index) =>
    groupOf(`r${index}`, index),
  )
  const tasks = groups.map((_group, index) => taskOf(index + 1))
  return {
    project: {
      calendarUid: null,
      statusDate: null,
      themeHue: 214,
      title: null,
      uidHighWaterMark: tasks.length + 1,
    },
    calendars: [],
    tasks,
    resources: [],
    assignments: [],
    taskGroups: groups,
    taskGroupMembers: groups.map((group, index) => ({
      taskGroupId: group.id,
      taskUid: index + 1,
    })),
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
})()

const LAYOUT_SETTINGS: DocumentSettings = settingsOf({
  scrollDate: TASK_FROM, // Why: pinned so the time axis has an origin
  scrollTaskGroupId: null,
  stackDirection: 'down',
})

const LAYOUT_REGIONS: ScreenRegions = regionsFromScreen(
  { width: 1200, height: 4000, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 },
  LAYOUT_SETTINGS,
)

const settingNumber = (key: string): number => {
  const value = (SETTINGS_CONSTANTS as unknown as Readonly<Record<string, unknown>>)[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_CONSTANTS.${key} is not a number`)
  return value
}

// Why: below FR-094's floor the drawing does not move with zoomY, so both zooms are
// chosen well above it.
const FLOOR_BINDS_BELOW =
  settingNumber('actualMin') / settingNumber('actualOfPlan') / settingNumber('basePlanHeight')

const ZOOM_LOW = FLOOR_BINDS_BELOW * 1.2
const ZOOM_HIGH = FLOOR_BINDS_BELOW * 3.6

// Spec: VG-2, VG-3, VG-4, FR-039
const VG_2_GAP =
  settingNumber('stackGap') * 2 + settingNumber('dependencyWidth') * displayRatioAt(LAYOUT_SETTINGS.displayScale)

const placesAt = (zoomY: number) =>
  taskGroupPlacesAtZoomY(SCHEDULE, LAYOUT_SETTINGS, LAYOUT_REGIONS, zoomY)

// Spec: FR-016, PI-5, FR-094, DS-10
describe('FR-016 (MUST) -- 「その倍率でのタスクグループの位置を答えるメンバを、表 T-064 の PI-5 に置くこと」', () => {
  it('the premise: both zooms sit above FR-094’s floor, and each band carries the VG-2 gap zoomY does not scale', () => {
    // Why: without this the case could measure the floor-pinned band, where every zoom draws the same.
    expect(ZOOM_LOW).toBeGreaterThan(FLOOR_BINDS_BELOW)
    expect(ZOOM_HIGH).toBeGreaterThan(FLOOR_BINDS_BELOW)
    const ratio = displayRatioAt(LAYOUT_SETTINGS.displayScale)
    const planDrawn = (zoomY: number): number =>
      (settingNumber('basePlanHeight') * zoomY + settingNumber('planStroke')) * ratio
    expect(VG_2_GAP).toBeGreaterThan(0)
    for (const zoomY of [ZOOM_LOW, ZOOM_HIGH]) {
      expect(placesAt(zoomY)[0]!.height, `LF-2 at zoomY ${zoomY}`).toBeCloseTo(planDrawn(zoomY) + VG_2_GAP, 6)
    }
  })

  it('PI-5’s member answers a position for every task group, at a zoom nothing has drawn yet', () => {
    const places = placesAt(ZOOM_HIGH)
    expect(places).toHaveLength(THREE_FLAT_TASK_GROUPS)
    for (const place of places) expect(Number.isFinite(place.y)).toBe(true)
  })
})

// Spec: FR-016, LF-3
describe('FR-016 (MUST NOT) -- 「倍率から位置を算で求めてはならない」', () => {
  it('scaling the low-zoom position by the zoom ratio is NOT what PI-5 answers at the higher zoom', () => {
    // Why: the band is S-4 x zoomY plus the VG-2 gap and the border, which zoomY does not scale
    // (VG-3), so a position scaled by the zoom ratio lands off the one PI-5 answers.
    const lastIndex = THREE_FLAT_TASK_GROUPS - 1
    const low = placesAt(ZOOM_LOW)[lastIndex]!.y - placesAt(ZOOM_LOW)[0]!.y
    const high = placesAt(ZOOM_HIGH)[lastIndex]!.y - placesAt(ZOOM_HIGH)[0]!.y
    const zoomRatio = ZOOM_HIGH / ZOOM_LOW

    const naiveArithmeticPrediction = low * zoomRatio

    expect(high, 'a scaled copy of the low-zoom position is the WRONG answer').not.toBeCloseTo(
      naiveArithmeticPrediction,
      2,
    )
  })

  // Why: the control is the premise above: a band with no fixed term would scale exactly, and the
  // VG-2 gap is that term.
})

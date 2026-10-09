// DFC-1053: the guide cursor and the Dual Cursor readout answer the same region for a point on the edge of the Task Group Area (CU-2, DC-3, T-064).

import { describe, expect, it } from 'vitest'

import type { ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import { dualCursorReadoutOf } from '../../src/adapter/screen-renderer/tooltips'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionAtPointer, regionsFromScreen } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { SCREEN, day, scheduleOf, taskOf } from '../unit/cr-430-cross-section-scene'

const SCHEDULE = scheduleOf({ tasks: [taskOf({ uid: 1, name: 'alpha', start: day(2), finish: day(9) })] })
const SETTINGS = { ...SETTINGS_DEFAULTS, zoomX: 8, scrollDate: day(1), stackDirection: 'down' } as unknown as DocumentSettings
const REGIONS = regionsFromScreen(SCREEN, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection(), null)

const DUAL_CURSOR_ON: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    dualCursorModeState: { kind: 'on', child: { kind: 'placingDate1' } },
    dualCursor: null,
  },
}

const readingsAt = (pointer: { x: number; y: number }): ScreenViewReadings =>
  ({
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    isAgentApiEnabled: false,
    pointer,
    pointerRestedMs: 0,
    hintTargetDwellMs: 0,
    commandPaletteAt: { x: 0, y: 0 },
    iconUnderPointer: null,
    themePreference: 'light',
    themeHue: 214,
    selectedGroupIds: [],
    selectedResourceUids: [],
    notices: [],
    confirmation: null,
    taskGroupBoxes: [],
    scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
  }) as unknown as ScreenViewReadings

const guideIsDrawnAt = (pointer: { x: number; y: number }): boolean =>
  svgFromSchedule(
    SCHEDULE,
    SETTINGS,
    LAYOUT,
    GEOMETRY,
    REGIONS,
    emptySelection(),
    'screen',
    { themePreference: 'light', guideCursorMode: 'crosshair' },
    null as never,
    [],
    pointer as never,
    null,
    null as never,
    null as never,
    null as never,
  ).includes('data-figure="guide-cursor-vertical"')

const readoutIsShownAt = (pointer: { x: number; y: number }): boolean =>
  dualCursorReadoutOf(REGIONS, SETTINGS, DUAL_CURSOR_ON, readingsAt(pointer)) !== null

const AREA = REGIONS.taskGroupArea
const RIGHT = AREA.x + AREA.width
const BOTTOM = AREA.y + AREA.height
const MIDDLE_X = AREA.x + AREA.width / 2
const MIDDLE_Y = AREA.y + AREA.height / 2

const POINTS = [
  { name: 'the middle of the Task Group Area', x: MIDDLE_X, y: MIDDLE_Y },
  { name: 'the last whole pixel inside the right edge', x: RIGHT - 1, y: MIDDLE_Y },
  { name: 'the right edge itself', x: RIGHT, y: MIDDLE_Y },
  { name: 'one pixel past the right edge', x: RIGHT + 1, y: MIDDLE_Y },
  { name: 'the last whole pixel inside the bottom edge', x: MIDDLE_X, y: BOTTOM - 1 },
  { name: 'the bottom edge itself', x: MIDDLE_X, y: BOTTOM },
  { name: 'one pixel past the bottom edge', x: MIDDLE_X, y: BOTTOM + 1 },
  { name: 'the bottom right corner', x: RIGHT, y: BOTTOM },
]

describe('DFC-1053: one point, one region, for the guide cursor and the Dual Cursor readout (CU-2, DC-3)', () => {
  for (const point of POINTS) {
    it(`CU-2 / DC-3 at ${point.name} the guide is drawn exactly where regionAtPointer says taskGroupArea`, () => {
      expect(guideIsDrawnAt(point)).toBe(regionAtPointer(REGIONS, point.x, point.y) === 'taskGroupArea')
    })

    it(`CU-2 / DC-3 at ${point.name} the readout is shown exactly where regionAtPointer says taskGroupArea or timeRuler`, () => {
      const region = regionAtPointer(REGIONS, point.x, point.y)
      expect(readoutIsShownAt(point)).toBe(region === 'taskGroupArea' || region === 'timeRuler')
    })

    it(`CU-2 / DC-3 at ${point.name} a drawn guide never meets a missing readout (DFC-1053)`, () => {
      if (guideIsDrawnAt(point)) expect(readoutIsShownAt(point)).toBe(true)
    })
  }
})

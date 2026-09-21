// Anchor for one ledger row about the LENGTH of GR-21's grip.


import { describe, expect, it } from 'vitest'

import { screenFrameFromRegions } from '../../src/adapter/screen-renderer/screen-frame'
import type { ScreenViewReadings } from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { bare, specTable, type SpecTable } from '../contract/spec-table'


const T_206: SpecTable = specTable('T-206')

function settingOf(id: string): number {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  const spelled = bare(row.cells[1] ?? '')
  const figure = /-?\d+(?:\.\d+)?/.exec(spelled)
  if (figure === null) {
    throw new Error(`table T-206 row ${id} no longer states a number: ${spelled}`)
  }
  return Number(figure[0])
}

const GRIP_FLOOR_PX = settingOf('S-205')


const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const LANE_THICKNESS = 10
const CANVAS_PADDING = 4
const ROW_AREA = rect(200, 100, 800, 400)

const REGIONS: ScreenRegions = {
  appHeader: rect(0, 0, 1400, 40),
  rowTitlePanel: rect(20, 100, 180, 400),
  timeRuler: rect(200, 60, 800, 40),
  rowArea: ROW_AREA,
  scheduleCanvas: rect(20, 60, 1180, 440),
  propertiesPanel: rect(
    ROW_AREA.x + ROW_AREA.width + LANE_THICKNESS + CANVAS_PADDING,
    100,
    186,
    400,
  ),
}

const SETTINGS = { canvasPadding: CANVAS_PADDING } as unknown as DocumentSettings
const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: { ...emptyScreenSession.screen, fullScreenModeState: { kind: 'normal' } },
}

const sessionWith = (extent: {
  contentWidth: number
  contentHeight: number
  visibleHeight: number
  offsetX?: number
  offsetY?: number
}): ScreenViewReadings => ({
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
  scrollExtent: extent,
})

const barOf = (readings: ScreenViewReadings, axis: 'horizontal' | 'vertical') => {
  const found = screenFrameFromRegions(REGIONS, SETTINGS, ROOT, readings).scrollbars.find(
    (one) => one.axis === axis,
  )
  if (found === undefined) throw new Error(`SC-4 of table T-031 draws no ${axis} bar`)
  return found
}


describe('the row this file is driven by is still in the manuscript', () => {
  it('⭐ S-205 reaches the manuscript as a positive number of pixels', () => {
    expect(GRIP_FLOOR_PX).toBeGreaterThan(0)
  })

  it('⭐ the lane these cases cut is longer than that floor', () => {
    expect(ROW_AREA.width).toBeGreaterThan(GRIP_FLOOR_PX)
    expect(ROW_AREA.height).toBeGreaterThan(GRIP_FLOOR_PX)
  })
})


describe('DFC-405 / GR-21 (MUST): the grip is 見えている範囲 ÷ 全体 of its lane', () => {
  it('⭐⭐ ① an overflowing document gets a grip of exactly that fraction', () => {
    const session = sessionWith({
      contentWidth: ROW_AREA.width * 4,
      contentHeight: ROW_AREA.height * 4,
      visibleHeight: ROW_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')

    expect(sideways.thumb.width).toBeCloseTo(sideways.track.width / 4, 6)
    expect(downwards.thumb.height).toBeCloseTo(downwards.track.height / 4, 6)
  })

  it('⭐⭐ ② a document of many rows still gets a grip of at least S-205', () => {
    const session = sessionWith({
      contentWidth: ROW_AREA.width,
      contentHeight: ROW_AREA.height * 1000,
      visibleHeight: ROW_AREA.height,
    })
    const downwards = barOf(session, 'vertical')

    expect(downwards.track.height * (1 / 1000)).toBeLessThan(GRIP_FLOOR_PX)
    expect(downwards.thumb.height).toBe(GRIP_FLOOR_PX)
  })

  it('⭐⭐ ③ pinning rows does not GROW the downwards fraction', () => {
    const whole = ROW_AREA.height * 4
    const nonePinned = barOf(
      sessionWith({
        contentWidth: ROW_AREA.width,
        contentHeight: whole,
        visibleHeight: ROW_AREA.height,
      }),
      'vertical',
    )
    const bandTakesHalf = barOf(
      sessionWith({
        contentWidth: ROW_AREA.width,
        contentHeight: whole,
        visibleHeight: ROW_AREA.height / 2,
      }),
      'vertical',
    )

    expect(bandTakesHalf.thumb.height).toBeLessThan(nonePinned.thumb.height)
    expect(bandTakesHalf.thumb.height).toBeCloseTo(nonePinned.thumb.height / 2, 6)
    expect(bandTakesHalf.track.height).toBe(nonePinned.track.height)
  })

  it('⛔ THE CONTROL: a document that fits gets the whole lane, and no more', () => {
    const session = sessionWith({
      contentWidth: ROW_AREA.width,
      contentHeight: ROW_AREA.height,
      visibleHeight: ROW_AREA.height,
    })
    const sideways = barOf(session, 'horizontal')
    const downwards = barOf(session, 'vertical')

    expect(sideways.thumb.width).toBe(sideways.track.width)
    expect(downwards.thumb.height).toBe(downwards.track.height)
  })
})

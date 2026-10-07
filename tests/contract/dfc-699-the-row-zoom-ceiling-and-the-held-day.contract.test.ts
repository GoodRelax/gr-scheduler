// Guard cases for DFC-699: the row zoom ceiling follows every band read of zoomY, and a time-axis zoom holds its day.

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { serialOf } from '../../src/entity/layout-engine/schedule-layout/time-axis'
import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import {
  keyOf,
  NO_MODS,
  numberIn,
  REQUIREMENTS,
  rowDocument,
  rowOf,
  shell,
  type ShellBench,
} from '../unit/cr-541-stage'

// see FR-016
const FR_016_FIRST_BAND_THAT_FILLS =
  '⭐ 行の軸（`zoomY`）の上限は、いちばん高い行の帯の高さが、初めて `Row Area` の高さ以上になった倍率とし、その倍率を 表 T-253 の手順で探すこと（MUST）'
// see FR-016
const FR_016_POINTER_HOLDS = 'ズームはポインタ位置を中心とし、カーソル下の日付と行が動かないこと（MUST）。'
// see FR-016
const FR_016_NO_POINTER_USES_THE_MIDDLE =
  'ポインタを伴わない経路（画面上のボタン・ショートカット・`Agent API`）では、`Row Area` の中心をズームの中心とすること（MUST）'

const S_4 = numberIn(rowOf('T-201', 'S-4').by['既定値'] ?? '')
const S_5 = numberIn(rowOf('T-201', 'S-5').by['既定値'] ?? '')
const S_6 = numberIn(rowOf('T-201', 'S-6').by['既定値'] ?? '')
const S_239 = numberIn(rowOf('T-206', 'S-239').by['既定'] ?? '')
const PERCENT = 100

// see FR-094, ZE-1
const PLAN_FLOOR_ZOOM_Y = S_6 / S_5 / S_4

const START_ZOOM_Y = 0.05
const PRESS_LIMIT = 200
const MIN_HEIGHT_ABOVE_THE_FLOOR = 600
const MIN_HEIGHTS_BELOW_THE_FLOOR = [2000, 6000] as const
const ROW_COUNT = 12
const POINTER_SHARE = 0.3
// WHY: a millionth of a day is float noise from the anchor round trip,
// while a day axis started off regions.rowArea.x moves the held day by whole px.
const DAY_DIGITS = 6

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const keep = (built: ShellBench): ShellBench => {
  benches.push(built)
  return built
}

const frameOf = (built: ShellBench): FrameValues => {
  const frame = built.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame
}

const flooredRowBench = (minHeight: number): ShellBench => {
  const document = rowDocument(
    [
      { id: 'row-1', parentId: null },
      { id: 'row-2', parentId: null },
    ],
    { zoomY: START_ZOOM_Y },
  )
  document.schedule.taskGroups[0].minHeight = minHeight
  return keep(shell(document))
}

const zoomYOf = (built: ShellBench): number => Number(built.loop.document().documentSettings.zoomY)

const rowZoomToItsEnd = (built: ShellBench): number => {
  let previous = Number.NaN
  for (let press = 0; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
    previous = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
  }
  return zoomYOf(built)
}

const ceilingCase = (minHeight: number) => {
  const built = flooredRowBench(minHeight)
  const height = frameOf(built).regions.rowArea.height
  const scale = Number(built.loop.document().documentSettings.displayScale) / PERCENT
  // WHY: DS-13 grows the floored row with zoomY and every other band stays short of it,
  // so the tallest band first fills the Row Area at this zoomY.
  const firstFill = height / (minHeight * scale)
  const reached = rowZoomToItsEnd(built)
  const tallest = Math.max(...frameOf(built).layout.rows.map((row) => row.height))
  return { firstFill, reached, tallest, height }
}

describe('DFC-699 / FR-016 -- the manuscript still holds the rules these cases press', () => {
  it.each([FR_016_FIRST_BAND_THAT_FILLS, FR_016_POINTER_HOLDS, FR_016_NO_POINTER_USES_THE_MIDDLE])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('DFC-699 / FR-016, T-253, DS-13 -- the row zoom stops where the tallest band first fills the Row Area', () => {
  it(`a row floor (AT-59) that fills it above the plan floor -- ${FR_016_FIRST_BAND_THAT_FILLS}`, () => {
    const { firstFill, reached, tallest, height } = ceilingCase(MIN_HEIGHT_ABOVE_THE_FLOOR)
    expect(firstFill, 'premise: the band fills above the FR-094 plan floor').toBeGreaterThan(PLAN_FLOOR_ZOOM_Y)
    expect(tallest, 'BC-2: at the answer the band has reached').toBeGreaterThanOrEqual(height)
    expect(reached - firstFill, 'BC-5: the answer is the first fill, to S-239').toBeGreaterThanOrEqual(0)
    expect(reached - firstFill).toBeLessThanOrEqual(S_239)
  })

  it.fails.each(MIN_HEIGHTS_BELOW_THE_FLOOR)(
    `DFC-699 product defect: a row floor (AT-59) %d that fills it below the plan floor -- ${FR_016_FIRST_BAND_THAT_FILLS}`,
    (minHeight) => {
      const { firstFill, reached, tallest, height } = ceilingCase(minHeight)
      expect(firstFill, 'premise: the band fills below the FR-094 plan floor').toBeLessThan(PLAN_FLOOR_ZOOM_Y)
      expect(firstFill, 'premise: the press walk starts short of the fill').toBeGreaterThan(START_ZOOM_Y)
      expect(tallest, 'BC-2: at the answer the band has reached').toBeGreaterThanOrEqual(height)
      expect(reached - firstFill, 'BC-5: the answer is the first fill, to S-239').toBeLessThanOrEqual(S_239)
    },
  )
})

/** @purity pure */
function daySerialAt(frame: FrameValues, x: number): number {
  const origin = frame.layout.originDay
  if (origin === null) throw new Error('premise: the picture has an origin day')
  return serialOf(origin) + (x - frame.layout.originX) / frame.layout.pxPerDay
}

const shiftWheelIn = (x: number, y: number): HumanInput => ({
  kind: 'wheel',
  x,
  y,
  modifiers: { ...NO_MODS, shift: true },
  notches: -1,
  scrollPx: { x: 0, y: 0 },
})

const timeAxisBench = (): ShellBench =>
  keep(
    shell(
      rowDocument(
        Array.from({ length: ROW_COUNT }, (_unused, index) => ({ id: `row-${index + 1}`, parentId: null })),
        { scrollDayOffset: POINTER_SHARE },
      ),
    ),
  )

describe('DFC-699 / FR-016, MK-3, SK-16 -- a time-axis zoom leaves the day at its centre where it was', () => {
  it(`MK-3 at a pointer left of the middle -- ${FR_016_POINTER_HOLDS}`, () => {
    const built = timeAxisBench()
    const before = frameOf(built)
    const area = before.regions.rowArea
    const x = area.x + area.width * POINTER_SHARE
    const y = area.y + area.height / 2
    const held = daySerialAt(before, x)
    built.send(shiftWheelIn(x, y))
    const after = frameOf(built)
    expect(after.layout.pxPerDay, 'premise: the wheel zoomed the time axis').toBeGreaterThan(before.layout.pxPerDay)
    expect(daySerialAt(after, x)).toBeCloseTo(held, DAY_DIGITS)
  })

  it(`SK-16 at the Row Area middle -- ${FR_016_NO_POINTER_USES_THE_MIDDLE}`, () => {
    const built = timeAxisBench()
    const before = frameOf(built)
    const area = before.regions.rowArea
    const middle = area.x + area.width / 2
    const held = daySerialAt(before, middle)
    built.send(keyOf('+', { shift: true }))
    const after = frameOf(built)
    expect(after.layout.pxPerDay, 'premise: SK-16 zoomed the time axis').toBeGreaterThan(before.layout.pxPerDay)
    expect(daySerialAt(after, after.regions.rowArea.x + after.regions.rowArea.width / 2)).toBeCloseTo(held, DAY_DIGITS)
  })
})

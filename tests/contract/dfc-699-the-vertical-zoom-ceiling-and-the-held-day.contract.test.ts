// Guard cases for DFC-699: the vertical zoom ceiling follows every band read of zoomY, and a time-axis zoom holds its day.

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { serialOf } from '../../src/entity/layout-engine/schedule-layout/time-axis'
import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import {
  keyOf,
  NO_MODS,
  REQUIREMENTS,
  taskGroupDocument,
  shell,
  taskOf,
  type ShellBench,
} from '../unit/cr-541-stage'

// see FR-016
const FR_016_FIRST_BAND_THAT_FILLS =
  '⭐ 縦軸（`zoomY`）の上限は、いちばん高いタスクグループの帯の高さが、初めて `Task Group Area` の高さ以上になった倍率とし、その倍率を 表 T-253 の手順で探すこと（MUST）'
// see T-253, BC-3, FR-042, CR-689
const BC_3_FIRST_ALREADY = '最初の倍率で既に達していれば、帯の側の上限はその倍率とし、`BC-4` と `BC-5` を行わない。'
const FR_042_NOT_ZOOM_Y = '⛔ 縦のズーム（同書の 表 T-203 の `S-76`）で縮めてはならない（MUST NOT）'
// see FR-016
const FR_016_POINTER_HOLDS = 'ズームはポインタ位置を中心とし、カーソル下の日付とタスクグループが動かないこと（MUST）。'
// see FR-016
const FR_016_NO_POINTER_USES_THE_MIDDLE =
  'ポインタを伴わない経路（画面上のボタン・ショートカット・`Agent API`）では、`Task Group Area` の中心をズームの中心とすること（MUST）'

const PERCENT = 100

const START_ZOOM_Y = 0.05
const PRESS_LIMIT = 200
const MIN_HEIGHT_ABOVE_THE_FLOOR = 600
const MIN_HEIGHTS_BELOW_THE_FLOOR = [2000, 6000] as const
const TASK_GROUP_COUNT = 12
const POINTER_SHARE = 0.3
// WHY: a millionth of a day is float noise from the anchor round trip,
// while a day axis started off regions.taskGroupArea.x moves the held day by whole px.
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

const flooredTaskGroupBench = (minHeight: number): ShellBench => {
  const document = taskGroupDocument(
    [
      { id: 'task-group-1', parentId: null },
      { id: 'task-group-2', parentId: null },
    ],
    { zoomY: START_ZOOM_Y },
  )
  document.schedule.taskGroups[0].minHeight = minHeight
  return keep(shell(document))
}

const zoomYOf = (built: ShellBench): number => Number(built.loop.document().documentSettings.zoomY)

const verticalZoomToItsEnd = (built: ShellBench): number => {
  let previous = Number.NaN
  for (let press = 0; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
    previous = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
  }
  return zoomYOf(built)
}

// WHY: DS-13 scales the floored task group by the display scale alone (CR-689), so its band is one number at every zoomY.
const STACKED_TASKS = 24

const stackedTaskGroupBench = (): ShellBench => {
  const tasks = Array.from({ length: STACKED_TASKS }, (_unused, index) => taskOf(index + 1))
  const members = tasks.map((_unused, index) => ({ taskUid: index + 1, groupId: 'task-group-1' }))
  const rows = [{ id: 'task-group-1', parentId: null }]
  return keep(shell(taskGroupDocument(rows, { zoomY: START_ZOOM_Y }, { tasks, taskGroupMembers: members, taskVisuals: [] })))
}

const tallestBandOf = (built: ShellBench): number => Math.max(...frameOf(built).layout.taskGroups.map((taskGroup) => taskGroup.height))

const bandsUpToTheEnd = (built: ShellBench): number[] => {
  const bands = [tallestBandOf(built)]
  for (let press = 0, previous = Number.NaN; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
    previous = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
    if (zoomYOf(built) !== previous) bands.push(tallestBandOf(built))
  }
  return bands
}

const ceilingCase = (minHeight: number) => {
  const built = flooredTaskGroupBench(minHeight)
  const height = frameOf(built).regions.taskGroupArea.height
  const scale = Number(built.loop.document().documentSettings.displayScale) / PERCENT
  const floorBand = minHeight * scale
  const reached = verticalZoomToItsEnd(built)
  const floored = frameOf(built).layout.taskGroups.find((taskGroup) => taskGroup.groupId === 'task-group-1')?.height ?? Number.NaN
  return { floorBand, reached, floored, height }
}

describe('DFC-699 / FR-016 -- the manuscript still holds the rules these cases press', () => {
  it.each([FR_016_FIRST_BAND_THAT_FILLS, BC_3_FIRST_ALREADY, FR_042_NOT_ZOOM_Y, FR_016_POINTER_HOLDS, FR_016_NO_POINTER_USES_THE_MIDDLE])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('DFC-699 / FR-016, T-253, DS-13 -- the vertical zoom stops where the tallest band first fills the Task Group Area', () => {
  it(`${FR_042_NOT_ZOOM_Y} -- a task group floor (AT-59) short of the Task Group Area never sets the ceiling: the zoom passes where the old zoomY-scaled floor stopped it`, () => {
    const { floorBand, reached, floored, height } = ceilingCase(MIN_HEIGHT_ABOVE_THE_FLOOR)
    expect(floorBand, 'premise: the floor alone is short of the Task Group Area').toBeLessThan(height)
    expect(floored, 'DS-13: the floored band is the floor, whatever zoomY is').toBeCloseTo(floorBand, 6)
    expect(reached, 'the ceiling lies above the zoomY a zoomY-scaled floor would fill at').toBeGreaterThan(height / floorBand)
  })

  it.each(MIN_HEIGHTS_BELOW_THE_FLOOR)(
    `${BC_3_FIRST_ALREADY} -- a task group floor (AT-59) %d that fills the Task Group Area at every zoomY: the vertical zoom does not rise`,
    (minHeight) => {
      const { floorBand, reached, floored, height } = ceilingCase(minHeight)
      expect(floorBand, 'premise: the floor alone fills the Task Group Area').toBeGreaterThanOrEqual(height)
      expect(floored, 'BC-2: the band has reached').toBeGreaterThanOrEqual(height)
      expect(reached, 'the band-side ceiling is the first candidate, so pressing in never raises zoomY').toBeLessThanOrEqual(START_ZOOM_Y)
    },
  )
})

describe('DFC-699 / FR-016, T-253 -- task groups with no floor: the band ceiling follows zoomY', () => {
  it(`${FR_016_FIRST_BAND_THAT_FILLS} -- the zoom stops at the first band that fills the Task Group Area, not past it`, () => {
    const built = stackedTaskGroupBench()
    const height = frameOf(built).regions.taskGroupArea.height
    const bands = bandsUpToTheEnd(built)
    expect(built.loop.document().schedule.taskGroups[0]?.minHeight, 'premise: the task group has no floor').toBeNull()
    expect(bands[0], 'premise: the band starts short of the Task Group Area').toBeLessThan(height)
    expect(bands[bands.length - 1], 'the last zoom fills the Task Group Area').toBeGreaterThanOrEqual(height - 1)
    expect(bands[bands.length - 2], 'the zoom before it did not').toBeLessThan(height)
  })
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
      taskGroupDocument(
        Array.from({ length: TASK_GROUP_COUNT }, (_unused, index) => ({ id: `task-group-${index + 1}`, parentId: null })),
        { scrollDayOffset: POINTER_SHARE },
      ),
    ),
  )

describe('DFC-699 / FR-016, MK-3, SK-16 -- a time-axis zoom leaves the day at its centre where it was', () => {
  it(`MK-3 at a pointer left of the middle -- ${FR_016_POINTER_HOLDS}`, () => {
    const built = timeAxisBench()
    const before = frameOf(built)
    const area = before.regions.taskGroupArea
    const x = area.x + area.width * POINTER_SHARE
    const y = area.y + area.height / 2
    const held = daySerialAt(before, x)
    built.send(shiftWheelIn(x, y))
    const after = frameOf(built)
    expect(after.layout.pxPerDay, 'premise: the wheel zoomed the time axis').toBeGreaterThan(before.layout.pxPerDay)
    expect(daySerialAt(after, x)).toBeCloseTo(held, DAY_DIGITS)
  })

  it(`SK-16 at the Task Group Area middle -- ${FR_016_NO_POINTER_USES_THE_MIDDLE}`, () => {
    const built = timeAxisBench()
    const before = frameOf(built)
    const area = before.regions.taskGroupArea
    const middle = area.x + area.width / 2
    const held = daySerialAt(before, middle)
    built.send(keyOf('+', { shift: true }))
    const after = frameOf(built)
    expect(after.layout.pxPerDay, 'premise: SK-16 zoomed the time axis').toBeGreaterThan(before.layout.pxPerDay)
    expect(daySerialAt(after, after.regions.taskGroupArea.x + after.regions.taskGroupArea.width / 2)).toBeCloseTo(held, DAY_DIGITS)
  })
})

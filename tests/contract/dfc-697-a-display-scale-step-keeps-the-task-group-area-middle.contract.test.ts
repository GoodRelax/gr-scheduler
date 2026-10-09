// Guard cases for DFC-697: a display scale step holds the date and the row at the Task Group Area middle.

import { afterEach, describe, expect, it } from 'vitest'

import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import { serialOf } from '../../src/entity/layout-engine/schedule-layout/time-axis'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'
import { keyOf, REQUIREMENTS, taskGroupDocument, shell, type TaskGroupSeed, type ShellBench } from '../unit/cr-541-stage'

// see FR-039
const FR_039_HOLD_THE_MIDDLE =
  '⭐ 表示の倍率を変えたとき、`Task Group Area` の横の中点が指す日付と、縦の中点が指すタスクグループを動かさないこと（MUST）'

const TASK_GROUP_COUNT = 60
const SEATED_TASK_GROUP = 'task-group-20'
const SEATED_TASK_GROUP_PART = 0.3
const SEATED_DAY_PART = 0.25
// WHY: a millionth of a day or of a row is float noise from the anchor round trip,
// while every mutation the traps name moves the middle by whole px.
const DIGITS = 6

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const rows = (): TaskGroupSeed[] =>
  Array.from({ length: TASK_GROUP_COUNT }, (_unused, index) => ({ id: `row-${index + 1}`, parentId: null }))

const bench = (displayScale: number): ShellBench => {
  const built = shell(
    taskGroupDocument(rows(), {
      displayScale,
      scrollGroupId: SEATED_TASK_GROUP,
      scrollGroupOffset: SEATED_TASK_GROUP_PART,
      scrollDayOffset: SEATED_DAY_PART,
    }),
  )
  benches.push(built)
  return built
}

const frameOf = (built: ShellBench): FrameValues => {
  const frame = built.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame
}

/** @purity pure */
function daySerialAt(frame: FrameValues, x: number): number {
  const origin = frame.layout.originDay
  if (origin === null) throw new Error('premise: the picture has an origin day')
  return serialOf(origin) + (x - frame.layout.originX) / frame.layout.pxPerDay
}

/** @purity pure */
function taskGroupPartAt(frame: FrameValues, y: number): { readonly groupId: string; readonly part: number } {
  const scrolling = frame.layout.taskGroups.filter((taskGroup) => taskGroup.isPinned !== true)
  for (let at = 0; at < scrolling.length; at++) {
    const taskGroup = scrolling[at]!
    const below = scrolling[at + 1]
    const slab = below === undefined ? taskGroup.height : below.y - taskGroup.y
    if (y >= taskGroup.y && y < taskGroup.y + slab) return { groupId: taskGroup.groupId, part: (y - taskGroup.y) / slab }
  }
  throw new Error(`premise: a scrolling row stands at y ${y}`)
}

const middleOf = (frame: FrameValues) => {
  const area = frame.regions.taskGroupArea
  return {
    day: daySerialAt(frame, area.x + area.width / 2),
    row: taskGroupPartAt(frame, area.y + area.height / 2),
  }
}

const SK_22 = keyOf('+', { ctrl: true, shift: true })
const SK_23 = keyOf('-', { ctrl: true, shift: true })
const LOWEST = DISPLAY_SCALE_STEPS[0]!
const HIGHEST = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!

describe('DFC-697 / FR-039 -- the manuscript still holds the rule these cases press', () => {
  it(FR_039_HOLD_THE_MIDDLE, () => {
    expect(REQUIREMENTS).toContain(FR_039_HOLD_THE_MIDDLE)
  })
})

describe('DFC-697 / FR-039, DS-1, DS-9, S-234 -- the middle of the Task Group Area holds its date and its row', () => {
  it.each([
    ['SK-22 from the default step', DEFAULT_DISPLAY_SCALE, SK_22],
    ['SK-23 from the default step', DEFAULT_DISPLAY_SCALE, SK_23],
    ['SK-22 from the lowest step', LOWEST, SK_22],
    ['SK-23 from the highest step', HIGHEST, SK_23],
  ] as const)('%s', (_name, start, press) => {
    const built = bench(start)
    const before = frameOf(built)
    const held = middleOf(before)
    built.send(press)
    const after = frameOf(built)
    expect(built.loop.document().documentSettings.displayScale, 'premise: the press moved the step').not.toBe(start)
    expect(after.regions.taskGroupArea.width, 'premise: DS-9 moved the Task Group Area width').not.toBe(before.regions.taskGroupArea.width)
    expect(after.regions.taskGroupArea.y, 'premise: DS-1 moved the Task Group Area top').not.toBe(before.regions.taskGroupArea.y)
    const landed = middleOf(after)
    expect(landed.day, `${FR_039_HOLD_THE_MIDDLE} -- the date`).toBeCloseTo(held.day, DIGITS)
    expect(landed.row.groupId, `${FR_039_HOLD_THE_MIDDLE} -- the row`).toBe(held.row.groupId)
    expect(landed.row.part, `${FR_039_HOLD_THE_MIDDLE} -- the place inside the row`).toBeCloseTo(held.row.part, DIGITS)
  })
})

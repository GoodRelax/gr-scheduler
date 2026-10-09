// DFC-699 guard (part 1): FR-016 / T-253 / FR-018 -- the row zoom stops at the first zoomY whose tallest drawn band fills the Task Group Area, also when that band belongs to a row only a deeper detail level draws.

import { afterEach, describe, expect, it } from 'vitest'

import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import { keyOf, REQUIREMENTS, taskGroupDocument, shell, taskOf, type ShellBench } from '../unit/cr-541-stage'

// see FR-016
const FR_016_FIRST_BAND_THAT_FILLS =
  '⭐ 行の軸（`zoomY`）の上限は、いちばん高い行の帯の高さが、初めて `Task Group Area` の高さ以上になった倍率とし、その倍率を 表 T-253 の手順で探すこと（MUST）'
// see FR-018
const FR_018_DEEPER_TASK_GROUPS_BY_ZOOM = 'グループ'

const ROOT = 'task-group-root'
const DEEP = 'task-group-deep'
const START_ZOOM_Y = 0.02
const PRESS_LIMIT = 200
const STACKED_TASKS = 36
const ROOT_TASK_UID = 100
// WHY: T-253 searches to a tolerance, so the last press may creep a hair past the first zoomY that fills.
const FIRST_FILL_SLACK = 1.01

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const frameOf = (built: ShellBench): FrameValues => {
  const frame = built.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame
}

// see T-253
const deepTaskGroupBench = (): ShellBench => {
  const stacked = Array.from({ length: STACKED_TASKS }, (_unused, index) => taskOf(index + 1))
  const tasks = [...stacked, taskOf(ROOT_TASK_UID)]
  const members = [
    ...stacked.map((one) => ({ taskUid: one['uid'], groupId: DEEP })),
    { taskUid: ROOT_TASK_UID, groupId: ROOT },
  ]
  const rows = [
    { id: ROOT, parentId: null },
    { id: DEEP, parentId: ROOT },
  ]
  const built = shell(taskGroupDocument(rows, { zoomY: START_ZOOM_Y }, { tasks, taskGroupMembers: members, taskVisuals: [] }))
  benches.push(built)
  return built
}

const zoomYOf = (built: ShellBench): number => Number(built.loop.document().documentSettings.zoomY)
const tallestBandOf = (built: ShellBench): number => Math.max(...frameOf(built).layout.taskGroups.map((taskGroup) => taskGroup.height))
const isDrawn = (built: ShellBench, groupId: string): boolean =>
  frameOf(built).layout.taskGroups.some((taskGroup) => taskGroup.groupId === groupId)

// see SK-16a
const stopsUpToTheEnd = (built: ShellBench): { readonly zoomY: number; readonly band: number }[] => {
  const stops = [{ zoomY: zoomYOf(built), band: tallestBandOf(built) }]
  for (let press = 0, previous = Number.NaN; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
    previous = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
    if (zoomYOf(built) !== previous) stops.push({ zoomY: zoomYOf(built), band: tallestBandOf(built) })
  }
  return stops
}

describe('DFC-699 -- the manuscript still holds the rule this case presses', () => {
  it('FR-016 still gives the ceiling as the first band that fills the Task Group Area, and FR-018 still lets the detail level drop deeper rows', () => {
    expect(REQUIREMENTS).toContain(FR_016_FIRST_BAND_THAT_FILLS)
    expect(REQUIREMENTS).toContain(FR_018_DEEPER_TASK_GROUPS_BY_ZOOM)
  })
})

describe('DFC-699 / FR-016, T-253, FR-018 -- the ceiling is found among the rows each zoomY draws', () => {
  it('premise: the deep row is not drawn at the first zoomY and the tallest band is short of the Task Group Area', () => {
    const built = deepTaskGroupBench()
    expect(isDrawn(built, ROOT)).toBe(true)
    expect(isDrawn(built, DEEP), 'FR-018: the deeper row waits for a closer zoom').toBe(false)
    expect(tallestBandOf(built)).toBeLessThan(frameOf(built).regions.taskGroupArea.height)
  })

  it('the row zoom stops where the tallest band first fills the Task Group Area, not at a later zoomY', () => {
    const built = deepTaskGroupBench()
    const height = frameOf(built).regions.taskGroupArea.height
    const stops = stopsUpToTheEnd(built)
    const last = stops[stops.length - 1]
    expect(last?.band, 'FR-016: the zoom reaches the first band that fills the Task Group Area').toBeGreaterThanOrEqual(height - 1)
    const firstFill = stops.find((one) => one.band >= height - 1)
    expect(isDrawn(built, DEEP), 'premise: the deep row came into the picture on the way').toBe(true)
    expect(last?.zoomY, 'FR-016: the ceiling is the first zoomY that fills').toBeLessThanOrEqual((firstFill?.zoomY ?? 0) * FIRST_FILL_SLACK)
  })
})

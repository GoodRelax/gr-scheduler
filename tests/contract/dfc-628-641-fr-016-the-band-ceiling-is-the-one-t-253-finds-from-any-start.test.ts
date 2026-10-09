// DFC-628 / DFC-641 spec-only cases: FR-016 and T-253 BC-1..BC-5 -- the vertical zoom stops where the ladder of T-253 first finds the tallest band reaching the Task Group Area, whatever zoomY the zoom starts from.

import { afterEach, describe, expect, it } from 'vitest'

import { settingNumber } from '../fixtures/setting-number'
import { keyOf, REQUIREMENTS, taskGroupDocument, shell, taskOf, type ShellBench } from '../unit/cr-541-stage'

// see FR-016
const FR_016_FIRST_REACH =
  '⭐ 縦軸（`zoomY`）の上限は、いちばん高いタスクグループの帯の高さが、初めて `Task Group Area` の高さ以上になった倍率とし、その倍率を 表 T-253 の手順で探すこと（MUST）'
const FR_016_ANY_START =
  '⭐ 縦軸の上限は、拡大を始めた倍率に依らないこと（MUST） —— いまの `zoomY` だけが違う 2 つの状態は、同じ上限を持つ。'
// see T-253
const BC_1_LADDER = '次の倍率を、1 つ前の倍率に同書の 表 T-206 の `S-238` を掛けた値とする。'
const BC_2_EQUAL_REACHES = '帯の高さが `Task Group Area` の高さと等しいときも、達したとする。'
const BC_5_UPPER_END = '帯の側の上限は、止めたときの上端とする。'

// see S-54, S-55, S-238, S-239
const ZOOM_MIN = settingNumber('S-54')
const ZOOM_MAX = settingNumber('S-55')
const LADDER_STEP = settingNumber('S-238')
const TOLERANCE = settingNumber('S-239')

const STACKED_TASKS = 24
const PRESS_LIMIT = 300
// WHY: two tolerances, since the answer and the zoom may each sit anywhere inside the last bracket T-253 leaves.
const ANSWER_SLACK = 2 * TOLERANCE + 1e-9

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

function stackedTaskGroupBench(zoomY: number): ShellBench {
  const tasks = Array.from({ length: STACKED_TASKS }, (_unused, index) => taskOf(index + 1))
  const members = tasks.map((_unused, index) => ({ taskUid: index + 1, groupId: 'task-group-1' }))
  const built = shell(
    taskGroupDocument([{ id: 'task-group-1', parentId: null }], { zoomY }, { tasks, taskGroupMembers: members, taskVisuals: [] }),
  )
  benches.push(built)
  return built
}

const zoomYOf = (built: ShellBench): number => Number(built.loop.document().documentSettings.zoomY)

function frameOf(built: ShellBench) {
  const frame = built.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame
}

// see BC-2
// WHY: the tallest band reaches the Task Group Area when it is at least as tall.
function bandReachesAt(zoomY: number): boolean {
  const built = stackedTaskGroupBench(zoomY)
  const frame = frameOf(built)
  const tallest = Math.max(...frame.layout.taskGroups.map((taskGroup) => taskGroup.height))
  built.restore()
  benches.pop()
  return tallest >= frame.regions.taskGroupArea.height
}

// see BC-1
// WHY: the candidates run smallest first and end at the upper bound.
function ladder(): readonly number[] {
  const found = [ZOOM_MIN]
  for (;;) {
    const next = (found[found.length - 1] as number) * LADDER_STEP
    if (next >= ZOOM_MAX) {
      found.push(ZOOM_MAX)
      return found
    }
    found.push(next)
  }
}

// see BC-3, BC-4, BC-5
// WHY: the first candidate that reaches, then halve the bracket until it is S-239 wide and answer its upper end.
function bandCeilingByTheTable(): number {
  const candidates = ladder()
  const at = candidates.findIndex((one) => bandReachesAt(one))
  if (at < 0) return ZOOM_MAX
  if (at === 0) return candidates[0] as number
  let low = candidates[at - 1] as number
  let high = candidates[at] as number
  while (high - low > TOLERANCE) {
    const middle = (low + high) / 2
    if (bandReachesAt(middle)) high = middle
    else low = middle
  }
  return high
}

function zoomedInToItsEnd(startZoomY: number): number {
  const built = stackedTaskGroupBench(startZoomY)
  let previous = Number.NaN
  for (let press = 0; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
    previous = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
  }
  return zoomYOf(built)
}

describe('DFC-628 / DFC-641 premise -- the clauses these cases press still stand', () => {
  it.each([FR_016_FIRST_REACH, FR_016_ANY_START])('01-04 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([BC_1_LADDER, BC_2_EQUAL_REACHES, BC_5_UPPER_END])('table T-253 holds %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('the ladder of BC-1 starts at the lower bound and ends at the upper bound', () => {
    const steps = ladder()
    expect(steps[0]).toBe(ZOOM_MIN)
    expect(steps[steps.length - 1]).toBe(ZOOM_MAX)
    expect(steps.length).toBeGreaterThan(10)
  })
})

describe('FR-016 / T-253 BC-3..BC-5 -- the vertical zoom ends at the ceiling the ladder finds', () => {
  const ceiling = bandCeilingByTheTable()

  it('premise: the ladder finds a ceiling strictly inside the bounds, so a band reaches the Task Group Area on the way', () => {
    expect(ceiling).toBeGreaterThan(ZOOM_MIN)
    expect(ceiling).toBeLessThan(ZOOM_MAX)
    expect(bandReachesAt(ceiling), BC_5_UPPER_END).toBe(true)
  })

  it(`${FR_016_FIRST_REACH} -- zooming in from the lowest start ends at it`, () => {
    expect(Math.abs(zoomedInToItsEnd(ZOOM_MIN) - ceiling), 'distance from the ceiling the table finds').toBeLessThanOrEqual(ANSWER_SLACK)
  })

  it.each([0.05, 0.2, 0.5])(`${FR_016_ANY_START} -- starting at zoomY %d ends at the same place`, (start) => {
    expect(start, 'premise: the start is below the ceiling').toBeLessThan(ceiling)
    expect(Math.abs(zoomedInToItsEnd(start) - ceiling)).toBeLessThanOrEqual(ANSWER_SLACK)
  })

  it('one more press at the ceiling changes nothing', () => {
    const built = stackedTaskGroupBench(ZOOM_MIN)
    let previous = Number.NaN
    for (let press = 0; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
      previous = zoomYOf(built)
      built.send(keyOf('+', { alt: true }))
    }
    const settled = zoomYOf(built)
    built.send(keyOf('+', { alt: true }))
    expect(zoomYOf(built)).toBe(settled)
  })
})

const START_ZOOM_Y = 0.05
const PERCENT = 100

function flooredTaskGroupBench(minHeight: number): ShellBench {
  const document = taskGroupDocument(
    [
      { id: 'task-group-1', parentId: null },
      { id: 'task-group-2', parentId: null },
    ],
    { zoomY: START_ZOOM_Y },
  )
  document.schedule.taskGroups[0].minHeight = minHeight
  const built = shell(document)
  benches.push(built)
  return built
}

const flooredBandOf = (built: ShellBench): number =>
  frameOf(built).layout.taskGroups.find((taskGroup) => taskGroup.groupId === 'task-group-1')?.height ?? Number.NaN

// WHY: the floor is the only thing that sets the band, so a floor landing exactly on the Task Group Area's height makes "equal" a real case.
function minHeightFillingTheAreaExactly(): number {
  const probe = flooredTaskGroupBench(1)
  const height = frameOf(probe).regions.taskGroupArea.height
  const scale = Number(probe.loop.document().documentSettings.displayScale) / PERCENT
  const centre = height / scale
  for (let nudge = -16; nudge <= 16; nudge++) {
    const candidate = centre + nudge * Number.EPSILON * centre
    if (flooredBandOf(flooredTaskGroupBench(candidate)) === height) return candidate
  }
  throw new Error('premise: some floor lands the first task group exactly on the Task Group Area height')
}

describe('FR-016 / T-253 BC-2 -- a band exactly as tall as the Task Group Area has reached it', () => {
  it(`${BC_2_EQUAL_REACHES} -- the zoom does not rise past the lowest candidate`, () => {
    const built = flooredTaskGroupBench(minHeightFillingTheAreaExactly())
    expect(flooredBandOf(built), 'premise: the band equals the Task Group Area').toBe(frameOf(built).regions.taskGroupArea.height)
    let previous = Number.NaN
    for (let press = 0; press < PRESS_LIMIT && zoomYOf(built) !== previous; press++) {
      previous = zoomYOf(built)
      built.send(keyOf('+', { alt: true }))
    }
    expect(zoomYOf(built), BC_2_EQUAL_REACHES).toBeLessThanOrEqual(START_ZOOM_Y)
  })
})

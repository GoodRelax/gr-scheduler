// Guard cases for DFC-970: a fit whose zoomY lands below the FR-094 plan floor still draws the plan at the floor.

import { afterEach, describe, expect, it } from 'vitest'

import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import { numberIn, REQUIREMENTS, taskGroupDocument, rowOf, shell, type TaskGroupSeed, type ShellBench } from '../unit/cr-541-stage'

// see FR-094
const FR_094_ONE_FLOOR = '縦の寸法を止める床は、形状の比を掛ける前の予定の縦幅に 1 度だけ当てること（MUST）。'

const S_4 = numberIn(rowOf('T-201', 'S-4').by['既定値'] ?? '')
const S_5 = numberIn(rowOf('T-201', 'S-5').by['既定値'] ?? '')
const S_6 = numberIn(rowOf('T-201', 'S-6').by['既定値'] ?? '')

// see FR-094, ZE-1
const PLAN_FLOOR_ZOOM_Y = S_6 / S_5 / S_4

const TASK_GROUP_COUNT = 60
// WHY: a millionth of a px is float noise; an unfloored plan is shorter by whole px.
const PX_DIGITS = 6

const benches: ShellBench[] = []
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const rows = (): TaskGroupSeed[] =>
  Array.from({ length: TASK_GROUP_COUNT }, (_unused, index) => ({ id: `task-group-${index + 1}`, parentId: null }))

const keep = (built: ShellBench): ShellBench => {
  benches.push(built)
  return built
}

/** @purity pure */
function planHeightOfFirstTask(frame: FrameValues | null): number {
  const plan = frame?.geometry.tasks[0]?.plan
  if (plan === null || plan === undefined || plan.form !== 'outline') throw new Error('premise: task 1 is drawn as an outline')
  const ys = plan.points.map((one) => one.y)
  return Math.max(...ys) - Math.min(...ys)
}

describe('DFC-970 / FR-094 -- the manuscript still holds the rule these cases press', () => {
  it(FR_094_ONE_FLOOR, () => {
    expect(REQUIREMENTS).toContain(FR_094_ONE_FLOOR)
  })
})

describe('DFC-970 / FR-055, FR-094 -- the fitted zoomY may sit below the floor, the drawn plan does not', () => {
  it(`IC-10 fits a flat schedule below the plan floor -- ${FR_094_ONE_FLOOR}`, () => {
    const fitted = keep(shell(taskGroupDocument(rows())))
    fitted.press('App Header', 'IC-10', null)
    const zoomY = Number(fitted.loop.document().documentSettings.zoomY)
    expect(zoomY, 'premise: the fit landed below the FR-094 plan floor').toBeLessThan(PLAN_FLOOR_ZOOM_Y)
    const atFloor = keep(shell(taskGroupDocument(rows(), { zoomY: PLAN_FLOOR_ZOOM_Y })))
    expect(planHeightOfFirstTask(fitted.loop.current())).toBeCloseTo(
      planHeightOfFirstTask(atFloor.loop.current()),
      PX_DIGITS,
    )
  })
})

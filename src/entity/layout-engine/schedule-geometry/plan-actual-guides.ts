// ScheduleGeometry -- the plan-actual guides: lines from the actual back to the plan when the two part (FR-084).
// @unit      UF-146  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import { compareDays, dayOf, type Task } from '../../document-model/schedule/schedule'
import type { TaskPlacement } from '../schedule-layout/schedule-layout'
import { point, type GeometryInputs, type Path } from './schedule-geometry'

// see T-020a
/** @purity pure */
export function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  actualHeight: number): readonly Path[] {
  const settings = inputs.settings
  if (!settings.planVisible || !settings.actualVisible || placed.actualX === null) return []
  const middle = placed.y + placed.planHeight / 2

  // TRAP: judge GD-4 before GD-1's overlap: milestone figures a day apart overlap in pixels, so GD-4 would never fire.
  if (placed.actualPlacement === 'sideways') {
    const planDay = dayOf(task.start)
    const actualDay = dayOf(task.actualStart)
    if (planDay === null || actualDay === null) return []
    if (compareDays(planDay, actualDay) === 0) return []
    return [[point(placed.actualX, middle), point(placed.x + placed.width / 2, middle)]]
  }

  const planX0 = placed.x
  const planX1 = placed.x + placed.width
  const actualX0 = placed.actualX
  const actualX1 = placed.actualX + placed.actualWidth
  if (actualX1 >= planX0 && actualX0 <= planX1) return []

  const rightwards = actualX0 > planX1
  const from = rightwards ? actualX0 : actualX1
  const toDay = rightwards ? planX1 : planX0

  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[point(from, below), point(toDay, below)]]
  }
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [
    [point(from, top), point(toDay, top)],
    [point(from, bottom), point(toDay, bottom)],
  ]
}

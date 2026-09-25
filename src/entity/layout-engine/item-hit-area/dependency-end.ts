// ItemHitArea -- the end of a dependency line under the pointer: which half of the plan bar (FR-009, PTD-3).
// @unit      UF-150  (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure

import type { ScheduleGeometry } from '../schedule-geometry/schedule-geometry'
import { isInsideRect, isOnTheDrawnShape, shapeOf, type Hit, type TaskShape } from './item-hit-area'

export interface DependencyEnd {
  readonly taskUid: number
  readonly edge: 'start' | 'finish'
}

// see FR-009
// WHY: the labels count as well as the drawn shapes, since the tool that draws a line may land
// anywhere on the Task.
/** @purity pure */
function isOnTheTask(shape: TaskShape, x: number, y: number): boolean {
  if (isOnTheDrawnShape(shape, x, y)) return true
  const label = shape.task.label
  const assignee = shape.task.assigneeLabel
  return (label !== null && isInsideRect(x, y, label)) ||
    (assignee !== null && isInsideRect(x, y, assignee))
}

// see FR-009, PTD-3
// TRAP: a given uid tests no containment: the press may have reached the Task through ink outside its bar.
/** @purity pure */
export function dependencyEndAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  onTaskUid: number | null,
): DependencyEnd | null {
  for (const task of geometry.tasks) {
    if (onTaskUid !== null && task.taskUid !== onTaskUid) continue
    if (task.hasPlanDates === false) continue
    const shape = shapeOf(task)
    // TRAP: never `?? shape.actualBand` here: FR-009 (MUST NOT) forbids a
    // plan-less endpoint from falling to the actual band (DFC-658).
    const band = shape.planBand
    if (band === null) continue
    if (onTaskUid === null && !isOnTheTask(shape, x, y)) continue
    // TRAP: the middle belongs to the finish (<, not <=), which also keeps a zero-width bar answering one side.
    return { taskUid: task.taskUid, edge: x < band.x + band.width / 2 ? 'start' : 'finish' }
  }
  return null
}

// see PI-7, FR-009
/** @purity pure */
export function dependencyStartOfHit(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  hit: Hit | null,
): DependencyEnd | null {
  if (hit === null || hit.item.kind !== 'task') return null
  return dependencyEndAtPointer(geometry, x, y, hit.item.taskUid)
}

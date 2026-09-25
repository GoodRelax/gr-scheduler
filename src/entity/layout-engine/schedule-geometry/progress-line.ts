// ScheduleGeometry -- the vertices of the progress line at the status date (FR-014).
// @unit      UF-147  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import {
  compareDays,
  dayOf,
  planActualState,
  type CalendarDay,
  type Task,
} from '../../document-model/schedule/schedule'
import { xFromDay, type TaskPlacement } from '../schedule-layout/schedule-layout'
import { point, type GeometryInputs, type Path, type Point } from './schedule-geometry'

// see T-022
/** @purity pure */
function vertexXOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   statusDate: CalendarDay): number | null {
  /** @purity pure */
  const before = (text: string | null): number | null => {
    const day = dayOf(text)
    if (day === null || compareDays(day, statusDate) >= 0) return null
    return xFromDay(inputs.layout, day)
  }
  switch (planActualState(task)) {
    case 'finished':
      return null
    case 'suspendedResumeUnknown':
      return null
    case 'suspendedResumePlanned':
      return before(task.resume)
    case 'notStarted':
      return before(task.start)
    case 'inProgress':
      return placed.actualX === null ? null : placed.actualX + placed.actualWidth
  }
}

// see FR-014, LF-12
/** @purity pure */
export function progressLineOf(inputs: GeometryInputs): Path {
  const { layout, settings, statusDate } = inputs
  if (!settings.progressLineVisible || statusDate === null) return []
  const first = layout.rows[0]
  const last = layout.rows[layout.rows.length - 1]
  if (first === undefined || last === undefined) return []

  const baseX = xFromDay(layout, statusDate)
  const half = layout.rectangleHeight / 2
  // WHY: bucketed by row and lane: by row alone each lane rescans its row, quadratic once Tasks overlap (NFR-013).
  const byLane = new Map<string, TaskPlacement[][]>()
  for (const placed of layout.placements) {
    const lanes = byLane.get(placed.groupId) ?? []
    const held = lanes[placed.stack] ?? []
    held.push(placed)
    lanes[placed.stack] = held
    byLane.set(placed.groupId, lanes)
  }

  const points: Point[] = [point(baseX, first.y - settings.progressLineOverhang)]
  for (const row of layout.rows) {
    const lanes = byLane.get(row.groupId)
    // TRAP: sort by top, not lane index: with S-58 'up' the index descends in y and the line zig-zags.
    const lanesByTop = row.stackTops
      .map((top, lane) => ({ top, lane }))
      .sort((a, b) => a.top - b.top)
    for (const { top, lane } of lanesByTop) {
      let x: number | null = null
      for (const placed of lanes?.[lane] ?? []) {
        const task = inputs.taskByUid.get(placed.taskUid)
        if (task === undefined) continue
        const vertex = vertexXOf(inputs, task, placed, statusDate)
        if (vertex !== null && (x === null || vertex < x)) x = vertex
      }
      points.push(point(x ?? baseX, top + half))
    }
  }
  points.push(point(baseX, last.y + last.height + settings.progressLineOverhang))
  return points
}

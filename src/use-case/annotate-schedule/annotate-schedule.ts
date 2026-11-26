// File: AnnotateSchedule: places the free end of a comment box of use case UC-008 at a point on a task group.
// @unit      UF-215  (docs/spec/05-07-design.md, table T-075)
// @component AnnotateSchedule, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-49

import {
  instantOf,
  MINUTES_PER_CALENDAR_DAY,
  textOfDayStart,
  textOfInstant,
} from '../../entity/document-model/schedule/schedule'
import type { ScheduleLayout, TaskGroupPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { AnnotationAnchor } from '../edit-document/edit-document'

const BAND_FRACTION_STEPS = 10_000

// Provisional: OPQ-26
// Spec: UC-008, LF-15
/** @purity pure */
export function freeAnchorAt(layout: ScheduleLayout, taskGroup: TaskGroupPlacement, x: number, y: number): AnnotationAnchor {
  const originStart = layout.originDay === null ? null : instantOf(textOfDayStart(layout.originDay))
  const minutes = (originStart ?? 0) + Math.round(((x - layout.originX) / layout.pxPerDay) * MINUTES_PER_CALENDAR_DAY)
  const share = taskGroup.height > 0 ? (y - taskGroup.y) / taskGroup.height : 0.5
  const bandFraction = Math.round(Math.min(1, Math.max(0, share)) * BAND_FRACTION_STEPS) / BAND_FRACTION_STEPS
  return { date: textOfInstant(minutes), taskGroupId: taskGroup.taskGroupId, bandFraction }
}

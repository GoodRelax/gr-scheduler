// File: PlaceTask: decides the span of the task that use case UC-001 places from the press and the release.
// @unit      UF-208  (docs/spec/05-07-design.md, table T-075)
// @component PlaceTask, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-42

import {
  MINUTES_PER_CALENDAR_DAY,
  textOfFinishSide,
  textOfInstant,
  textOfStartSide,
  type CalendarDay,
  type Project,
} from '../../entity/document-model/schedule/schedule'
import { snappedInstantAtX, type ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'

export interface PlacingPull {
  readonly pressX: number
  readonly releaseX: number
  readonly snapMinutes: number
  readonly from: CalendarDay
  readonly early: CalendarDay
  readonly late: CalendarDay
}

export interface PlacedSpan {
  readonly start: string
  readonly finish: string
}

// Spec: TC-10, TC-6
// Why: finer than a day the press and the release are snapped instants, as a grabbed end is; a pull inside one unit spans one unit.
/** @purity pure */
function spanOnFineSnap(layout: ScheduleLayout, pull: PlacingPull, isMilestone: boolean): PlacedSpan | null {
  const snap = pull.snapMinutes
  if (snap >= MINUTES_PER_CALENDAR_DAY) return null
  const from = snappedInstantAtX(layout, pull.pressX, snap)
  const to = snappedInstantAtX(layout, pull.releaseX, snap)
  if (from === null || to === null) return null
  if (isMilestone) return { start: textOfInstant(from), finish: textOfInstant(from) }
  const isLeftward = pull.releaseX < pull.pressX
  const early = from !== to ? Math.min(from, to) : isLeftward ? from - snap : from
  const late = from !== to ? Math.max(from, to) : isLeftward ? from : from + snap
  return { start: textOfInstant(early), finish: textOfInstant(late) }
}

// Provisional: OPQ-26
// Spec: UC-001, FR-001, FR-103, T-378, PTD-4
/** @purity pure */
export function placedTaskSpanOf(layout: ScheduleLayout, project: Project, pull: PlacingPull, isMilestone: boolean): PlacedSpan {
  const fine = spanOnFineSnap(layout, pull, isMilestone)
  return {
    start: fine?.start ?? textOfStartSide(isMilestone ? pull.from : pull.early, project, isMilestone),
    finish: fine?.finish ?? textOfFinishSide(isMilestone ? pull.from : pull.late, project),
  }
}

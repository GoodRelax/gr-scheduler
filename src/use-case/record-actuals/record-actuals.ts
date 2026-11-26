// File: RecordActuals: decides where the actual of use case UC-005 begins when a progress marker is pulled and released.
// @unit      UF-212  (docs/spec/05-07-design.md, table T-075)
// @component RecordActuals, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-46

import type { Document } from '../../entity/document-model/document/document'
import {
  dayOf,
  instantOf,
  instantOnSide,
  serial,
  startSideOf,
  workingCalendarOf,
  type Task,
} from '../../entity/document-model/schedule/schedule'

export interface MarkerPullActual {
  readonly grabbed: 'barDummyStart' | 'barDummyFinish'
  readonly released: { readonly start: string; readonly finish: string }
}

// Spec: GO-9, DM-1, FR-158
/** @purity pure */
function isLeftOfPlanStart(document: Document, task: Task, released: string): boolean {
  if (!document.documentSettings.isTimeOfDayVisible) {
    const planStart = dayOf(task.start)
    const dropped = dayOf(released)
    return planStart !== null && dropped !== null && serial(dropped) - serial(planStart) < 0
  }
  const within = workingCalendarOf(document.schedule)
  const planStart = instantOnSide(within, task.start, startSideOf(task))
  const dropped = instantOf(released)
  return planStart !== null && dropped !== null && dropped < planStart
}

// Provisional: OPQ-25
// Spec: UC-005, GO-9, DM-1, DM-2
// Why: released left of the plan start, GO-9 asks for the dummy's own actual (DM-2) on the plan start, not a refusal.
/** @purity pure */
export function markerPullActualOf(document: Document, task: Task, planStart: string, finish: string): MarkerPullActual {
  if (isLeftOfPlanStart(document, task, finish)) {
    return { grabbed: 'barDummyStart', released: { start: planStart, finish: planStart } }
  }
  return { grabbed: 'barDummyFinish', released: { start: finish, finish } }
}

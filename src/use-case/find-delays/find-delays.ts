// File: FindDelays: answers how many working days a task of use case UC-006 is late at the status date.
// @unit      UF-213  (docs/spec/05-07-design.md, table T-075)
// @component FindDelays, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-47

import {
  delayWorkingDays,
  isDelayed,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
} from '../../entity/document-model/schedule/schedule'

// Provisional: OPQ-26
// Spec: UC-006, FR-047
/** @purity pure */
export function lateWorkingDaysOf(task: Task, schedule: Schedule, statusDate: CalendarDay | null): number | null {
  if (!isDelayed(task, statusDate)) return null
  return delayWorkingDays(workingCalendarOf(schedule), task, statusDate)
}

// Schedule -- the plan/actual state of a task, judged by the steps of table T-019a, and the day its progress point marks.
// @unit      UF-127  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { compareDays, dayFromSerial, dayOf, serial, type CalendarDay } from './calendar-day'
import type { Task } from './schedule-entities'

export type PlanActualState =
  | 'notStarted'
  | 'finished'
  | 'suspendedResumeUnknown'
  | 'suspendedResumePlanned'
  | 'inProgress'

// see T-019a
/** @purity pure */
export function planActualState(task: Task): PlanActualState {
  if (task.actualStart === null) return 'notStarted'
  if (task.actualFinish !== null) return 'finished'
  if (task.resumeValid === false) return 'suspendedResumeUnknown'
  if (task.resume !== null) return 'suspendedResumePlanned'
  return 'inProgress'
}

// see T-022, RV-1, FR-014, VS-6
// WHY: the progress line and the VS-6 check read the one day, so the rule of T-022 lives in one place.
// TRAP: the in-progress day is read off stop here, not through actualLastDay, whose unit imports this one.
/** @purity pure */
export function progressPointDayOf(task: Task, statusDate: CalendarDay): CalendarDay | null {
  /** @purity pure */
  const before = (text: string | null): CalendarDay | null => {
    const day = dayOf(text)
    return day === null || compareDays(day, statusDate) >= 0 ? null : day
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
    case 'inProgress': {
      const last = dayOf(task.stop)
      return last === null ? null : dayFromSerial(serial(last) + 1)
    }
  }
}

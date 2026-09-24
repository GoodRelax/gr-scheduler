// Schedule -- whether a task is delayed, and by how many working days (table T-021b).
// @unit      UF-129  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { compareDays, dayOf, type CalendarDay } from './calendar-day'
import { planActualState } from './plan-actual-state'
import type { Task } from './schedule-entities'
import { workingDaysBetween, type WorkingCalendar } from './working-calendar'

// see T-021b
/** @purity pure */
export function delayStart(task: Task): { readonly row: string; readonly from: string | null } | null {
  switch (planActualState(task)) {
    case 'inProgress':
      return { row: 'DL-1', from: task.finish }
    case 'notStarted':
      return { row: 'DL-2', from: task.start }
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return { row: 'DL-3', from: task.resume }
    case 'finished':
      return null
  }
}

/** @purity pure */
export function isDelayed(task: Task, statusDate: CalendarDay | null): boolean {
  if (statusDate === null) return false
  const start = delayStart(task)
  const from = dayOf(start?.from ?? null)
  if (from === null) return false
  return compareDays(statusDate, from) > 0
}

/** @purity pure */
export function delayWorkingDays(within: WorkingCalendar, task: Task,
                                 statusDate: CalendarDay | null): number {
  if (statusDate === null || !isDelayed(task, statusDate)) return 0
  const from = dayOf(delayStart(task)?.from ?? null)
  if (from === null) return 0
  return workingDaysBetween(within, from, statusDate)
}

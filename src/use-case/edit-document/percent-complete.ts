// Reprices a Task's percent complete from its worked days of actual against its plan.
// @unit      UF-75   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  actualLastDay,
  actualLengthOf,
  dayOf,
  workingDaysBetween,
  type Task,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'

// see FR-012
/** @purity pure */
function planSpanOf(within: WorkingCalendar, task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return workingDaysBetween(within, start, finish)
}


// see FR-012, FR-090, EX-5
/** @purity pure */
function percentCompleteOf(within: WorkingCalendar, task: Task): number | null {
  const span = planSpanOf(within, task)
  if (span === null) return task.percentComplete
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  return Math.round((heldActualLength(within, task) / span) * 100)
}

// see FR-011, FR-012
/** @purity pure */
function heldActualLength(within: WorkingCalendar, task: Task): number {
  const start = dayOf(task.actualStart)
  const lastDay = actualLastDay(task)
  if (start === null || lastDay === null) return 0
  return actualLengthOf(within, start, lastDay)
}

// see FR-012
/** @purity pure */
export function repriced(within: WorkingCalendar, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(within, task) }
}

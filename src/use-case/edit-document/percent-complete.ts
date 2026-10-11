// Reprices a Task's percent complete from its worked time of actual against its plan.
// @unit      UF-75   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  actualInstantsOf,
  actualMinutesOf,
  plannedLengthMinutesOf,
  workingCalendarOf,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'

// see FR-012, FR-090, EX-5
/** @purity pure */
function percentCompleteOf(within: WorkingCalendar, task: Task): number | null {
  const span = plannedLengthMinutesOf(within, task)
  if (span === null) return task.percentComplete
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  // TRAP: multiply before dividing: (23 / 40) * 100 is 57.49999999999999 and rounds to 57, not 58.
  return Math.round((heldActualLength(within, task) * 100) / span)
}

// see FR-011, FR-012
/** @purity pure */
function heldActualLength(within: WorkingCalendar, task: Task): number {
  const actual = actualInstantsOf(within, task)
  return actual === null ? 0 : actualMinutesOf(within, actual[0], actual[1])
}

// see FR-012
/** @purity pure */
export function repriced(within: WorkingCalendar, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(within, task) }
}

export interface PercentCompleteRecount {
  readonly schedule: Schedule
  readonly movedTaskUids: readonly number[]
}

// see FR-012, RS-52
// WHY: the calendar edit and the GRS JSON read recount through this one place (EZ-5).
/** @purity pure */
export function recountedPercentComplete(schedule: Schedule): PercentCompleteRecount {
  const within = workingCalendarOf(schedule)
  const movedTaskUids: number[] = []

  const tasks: Task[] = schedule.tasks.map((task) => {
    const next = repriced(within, task)
    if (next.percentComplete === task.percentComplete) return task
    // WHY: a finish before its start counts below 0; FR-023 drops that Task (IV-10), so it is not told.
    if (next.percentComplete !== null && next.percentComplete < 0) return task
    movedTaskUids.push(task.uid)
    return next
  })

  // TRAP: keep the old reference when nothing moved; document-change-plan.ts reads a new one as a change.
  if (movedTaskUids.length === 0) return { schedule, movedTaskUids: [] }
  return { schedule: { ...schedule, tasks }, movedTaskUids }
}

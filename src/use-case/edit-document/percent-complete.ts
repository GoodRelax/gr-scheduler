// Reprices a Task's percent complete from its worked time of actual against its plan.
// @unit      UF-75   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  workingCalendarOf,
  workingTimeCounterOf,
  type Schedule,
  type Task,
  type WorkingCalendar,
  type WorkingTimeCounter,
} from '../../entity/document-model/schedule/schedule'

// see FR-012, FR-090, EX-5
/** @purity pure */
function percentCompleteOf(count: WorkingTimeCounter, task: Task): number | null {
  const span = count.plannedLengthMinutes(task)
  if (span === null) return task.percentComplete
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  // TRAP: multiply before dividing: (23 / 40) * 100 is 57.49999999999999 and rounds to 57, not 58.
  return Math.round(((count.actualLengthMinutes(task) ?? 0) * 100) / span)
}

// see FR-012
/** @purity pure */
export function repriced(within: WorkingCalendar, task: Task): Task {
  return repricedBy(workingTimeCounterOf(within), task)
}

// see FR-012
/** @purity pure */
function repricedBy(count: WorkingTimeCounter, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(count, task) }
}

export interface PercentCompleteRecount {
  readonly schedule: Schedule
  readonly movedTaskUids: readonly number[]
}

// see FR-012, RS-52
// WHY: the calendar edit and the GRS JSON read recount through this one place (EZ-5).
/** @purity pure */
export function recountedPercentComplete(schedule: Schedule): PercentCompleteRecount {
  // WHY: one counter for the whole pass, so the calendar index is built once, not once per Task (DFC-2472).
  const count = workingTimeCounterOf(workingCalendarOf(schedule))
  const movedTaskUids: number[] = []

  const tasks: Task[] = schedule.tasks.map((task) => {
    const next = repricedBy(count, task)
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

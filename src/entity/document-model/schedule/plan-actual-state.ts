// Schedule -- the plan/actual state of a task, judged by the steps of table T-019a.
// @unit      UF-127  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

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

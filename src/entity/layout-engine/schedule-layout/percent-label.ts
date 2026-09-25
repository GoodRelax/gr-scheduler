// ScheduleLayout -- the percent-complete label, joined to the assignee label (FR-090).
// @unit      UF-135  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import { planActualState, type Task } from '../../document-model/schedule/schedule'

const PERCENT_MARK = '%'

// see FR-090
/** @purity pure */
export function percentLabelOf(task: Task): string {
  if (planActualState(task) === 'notStarted') return ''
  const percent = task.percentComplete
  return percent === null ? '' : `${percent}${PERCENT_MARK}`
}

const OC2_SEPARATOR = ' : '

// see OC-2, FR-090
/** @purity pure */
export function outsideLabelOf(assignee: string, percent: string): string {
  if (assignee === '') return percent
  if (percent === '') return assignee
  return `${assignee}${OC2_SEPARATOR}${percent}`
}

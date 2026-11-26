// File: ScheduleLayout: the percent-complete label, joined to the assignee label (FR-090).
// @unit      UF-135  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import { planActualState, type Task } from '../../document-model/schedule/schedule'

const PERCENT_MARK = '%'

// Spec: FR-090, IMPS-921, IMPS-923
/** @purity pure */
export function percentLabelOf(task: Task): string {
  if (planActualState(task) === 'notStarted') return ''
  const percent = task.percentComplete
  return percent === null ? '' : `${percent}${PERCENT_MARK}`
}

const OC2_SEPARATOR = ' : '

// Spec: OC-2, FR-090, IMPS-1713, IMPS-1719, IMPS-925, IMPS-926, IMPS-927, IMPS-924
/** @purity pure */
export function outsideLabelOf(assignee: string, percent: string): string {
  if (assignee === '') return percent
  if (percent === '') return assignee
  return `${assignee}${OC2_SEPARATOR}${percent}`
}

// ScheduleLayout -- the assignee label: the first work resource by name, and how many more (FR-059).
// @unit      UF-134  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { Schedule } from '../../document-model/schedule/schedule'

const WORK_RESOURCE = 1

const MORE_ASSIGNEES_MARK = '+'

interface LabelledAssignee {
  readonly name: string
  readonly uid: number
}

// see FR-059
/** @purity pure */
function labelledAssigneeOf(resource: Schedule['resources'][number] | undefined): LabelledAssignee | null {
  if (resource === undefined) return null
  // TRAP: test both AT-87 and AT-88; either alone draws some cost resources as people.
  if (resource.resourceKind !== WORK_RESOURCE) return null
  if (resource.isCostResource === true) return null
  const name = resource.name ?? ''
  return name === '' ? null : { name, uid: resource.uid }
}

// see FR-059
// WHY: not localeCompare: a host-dependent collation shows another first name elsewhere.
/** @purity pure */
function compareLabelled(a: LabelledAssignee, b: LabelledAssignee): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : a.uid - b.uid
}

// see FR-059, AS-1
/** @purity pure */
export function labelledAssigneeUidOf(schedule: Schedule, taskUid: number): number | null {
  const onTask = new Set(schedule.assignments.filter((one) => one.taskUid === taskUid).map((one) => one.resourceUid))
  let first: LabelledAssignee | null = null
  for (const resource of schedule.resources) {
    const one = onTask.has(resource.uid) ? labelledAssigneeOf(resource) : null
    if (one !== null && (first === null || compareLabelled(one, first) < 0)) first = one
  }
  return first === null ? null : first.uid
}

// see FR-059
/** @purity pure */
export function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> {
  const resourceByUid = new Map<number, Schedule['resources'][number]>()
  for (const resource of schedule.resources) resourceByUid.set(resource.uid, resource)

  const onTask = new Map<number, LabelledAssignee[]>()
  for (const assignment of schedule.assignments) {
    const taskUid = assignment.taskUid
    if (taskUid === null || assignment.resourceUid === null) continue
    const one = labelledAssigneeOf(resourceByUid.get(assignment.resourceUid))
    if (one === null) continue
    const held = onTask.get(taskUid) ?? []
    held.push(one)
    onTask.set(taskUid, held)
  }

  const labels = new Map<number, string>()
  for (const [taskUid, held] of onTask) {
    held.sort(compareLabelled)
    const first = held[0]!
    labels.set(
      taskUid,
      held.length === 1
        ? first.name
        : `${first.name} ${MORE_ASSIGNEES_MARK}${held.length - 1}`,
    )
  }
  return labels
}

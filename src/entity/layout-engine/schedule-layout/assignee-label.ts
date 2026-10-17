// ScheduleLayout -- the assignee label: the primary work resource, and a mark when there are more (FR-059).
// @unit      UF-134  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { Schedule } from '../../document-model/schedule/schedule'

const WORK_RESOURCE = 1

// see FR-059
export const MORE_ASSIGNEES_MARK = ', …'

interface LabeledAssignee {
  readonly name: string
  readonly uid: number
}

// see FR-059
/** @purity pure */
function labeledAssigneeOf(resource: Schedule['resources'][number] | undefined): LabeledAssignee | null {
  if (resource === undefined) return null
  // TRAP: test both AT-87 and AT-88; either alone draws some cost resources as people.
  if (resource.resourceKind !== WORK_RESOURCE) return null
  if (resource.isCostResource === true) return null
  const name = resource.name ?? ''
  return name === '' ? null : { name, uid: resource.uid }
}

// see FR-059, AS-1, AS-13
// WHY: the task's assignments in document order; the first one the label may show is the primary.
/** @purity pure */
export function labeledAssigneeUidOf(schedule: Schedule, taskUid: number): number | null {
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    const one = labeledAssigneeOf(schedule.resources.find((resource) => resource.uid === assignment.resourceUid))
    if (one !== null) return one.uid
  }
  return null
}

// see FR-059
/** @purity pure */
export function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> {
  const resourceByUid = new Map<number, Schedule['resources'][number]>()
  for (const resource of schedule.resources) resourceByUid.set(resource.uid, resource)

  const onTask = new Map<number, LabeledAssignee[]>()
  for (const assignment of schedule.assignments) {
    const taskUid = assignment.taskUid
    if (taskUid === null || assignment.resourceUid === null) continue
    const one = labeledAssigneeOf(resourceByUid.get(assignment.resourceUid))
    if (one === null) continue
    const held = onTask.get(taskUid) ?? []
    held.push(one)
    onTask.set(taskUid, held)
  }

  const labels = new Map<number, string>()
  for (const [taskUid, held] of onTask) {
    const first = held[0]!
    const others = held.filter((one) => one.uid !== first.uid)
    labels.set(taskUid, others.length === 0 ? first.name : `${first.name}${MORE_ASSIGNEES_MARK}`)
  }
  return labels
}

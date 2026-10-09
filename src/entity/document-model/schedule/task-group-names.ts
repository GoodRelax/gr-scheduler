// Schedule -- a task group's name from its label or the task it derives from, and the names up to the top.
// @unit      UF-177  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import type { Schedule, TaskGroup } from './schedule-entities'

// see AT-53, AT-54
/** @purity pure */
function nameOfTaskGroup(schedule: Schedule, taskGroup: TaskGroup): string {
  if (taskGroup.label !== null) return taskGroup.label
  if (taskGroup.derivedFromTaskUid === null) return ''
  return schedule.tasks.find((task) => task.uid === taskGroup.derivedFromTaskUid)?.name ?? ''
}

// see AT-53, AT-54
/** @purity pure */
export function taskGroupNameOf(schedule: Schedule, groupId: string): string {
  const taskGroup = schedule.taskGroups.find((one) => one.id === groupId)
  return taskGroup === undefined ? '' : nameOfTaskGroup(schedule, taskGroup)
}

// see SQ-6, AT-53, AT-54
/** @purity pure */
export function taskGroupPathOf(schedule: Schedule, groupId: string): readonly string[] {
  const byId = new Map(schedule.taskGroups.map((taskGroup) => [taskGroup.id, taskGroup]))
  const path: string[] = []
  let taskGroup = byId.get(groupId)
  // WHY: the climb stops after as many steps as there are task groups, so a parent ring cannot hang it.
  while (taskGroup !== undefined && path.length <= byId.size) {
    path.push(nameOfTaskGroup(schedule, taskGroup))
    taskGroup = taskGroup.parentId === null ? undefined : byId.get(taskGroup.parentId)
  }
  return path.reverse()
}

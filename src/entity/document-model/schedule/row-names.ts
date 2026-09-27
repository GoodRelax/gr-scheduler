// Schedule -- a row's name from its label or the task it derives from, and the names up to the top.
// @unit      UF-177  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import type { Schedule, TaskGroup } from './schedule-entities'

// see AT-53, AT-54
/** @purity pure */
function nameOfRow(schedule: Schedule, row: TaskGroup): string {
  if (row.label !== null) return row.label
  if (row.derivedFromTaskUid === null) return ''
  return schedule.tasks.find((task) => task.uid === row.derivedFromTaskUid)?.name ?? ''
}

// see AT-53, AT-54
/** @purity pure */
export function rowNameOf(schedule: Schedule, groupId: string): string {
  const row = schedule.taskGroups.find((one) => one.id === groupId)
  return row === undefined ? '' : nameOfRow(schedule, row)
}

// see SQ-6, AT-53, AT-54
/** @purity pure */
export function rowPathOf(schedule: Schedule, groupId: string): readonly string[] {
  const byId = new Map(schedule.taskGroups.map((row) => [row.id, row]))
  const path: string[] = []
  let row = byId.get(groupId)
  // WHY: the climb stops after as many steps as there are rows, so a parent ring cannot hang it.
  while (row !== undefined && path.length <= byId.size) {
    path.push(nameOfRow(schedule, row))
    row = row.parentId === null ? undefined : byId.get(row.parentId)
  }
  return path.reverse()
}

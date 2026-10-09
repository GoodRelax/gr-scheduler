// DocumentCodec, MSPDI half -- builds the task groups and memberships from the WBS tree of the imported tasks.
// @unit      UF-156  (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { Task, TaskGroup, TaskGroupMember } from '../../entity/document-model/schedule/schedule'

interface ImportedTaskGroups {
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
}

// see FR-058
/** @purity pure */
export function taskGroupsFromTasks(tasks: readonly Task[], maxGroupDepth: number): ImportedTaskGroups {
  const depths = new Map<number, number>()
  const taskGroups: TaskGroup[] = []
  const taskGroupMembers: TaskGroupMember[] = []
  const taskGroupOfTask = new Map<number, string>()
  const parentUids = new Set<number>()
  for (const task of tasks) if (task.parentTaskUid !== null) parentUids.add(task.parentTaskUid)

  for (const task of tasks) {
    const parentDepth = task.parentTaskUid === null ? 0 : depths.get(task.parentTaskUid) ?? 0
    const depth = parentDepth + 1
    depths.set(task.uid, depth)
    if (depth > maxGroupDepth) continue
    if (task.parentTaskUid !== null && !parentUids.has(task.uid)) continue
    const parentTaskGroup = task.parentTaskUid === null ? null : taskGroupOfTask.get(task.parentTaskUid) ?? null
    const id = rowIdOfTask(task.uid)
    taskGroupOfTask.set(task.uid, id)
    taskGroups.push({
      id,
      parentId: parentTaskGroup,
      label: null,
      derivedFromTaskUid: task.uid,
      order: task.wbsOrder ?? 0,
      treeState: 'auto',
      editGroup: null,
      color: null,
      minHeight: null,
    })
  }

  for (const task of tasks) {
    const own = taskGroupOfTask.get(task.uid)
    const groupId = own ?? deepestAncestorTaskGroup(task, tasks, taskGroupOfTask)
    if (groupId === null) continue
    taskGroupMembers.push({ taskUid: task.uid, groupId })
  }
  return { taskGroups, taskGroupMembers }
}

/** @purity pure */
function deepestAncestorTaskGroup(
  task: Task,
  tasks: readonly Task[],
  taskGroupOfTask: ReadonlyMap<number, string>,
): string | null {
  let at: number | null = task.parentTaskUid
  // TRAP: bounded by the task count, since a parentTaskUid ring is refused only after this runs.
  for (let steps = 0; steps < tasks.length && at !== null; steps += 1) {
    const row = taskGroupOfTask.get(at)
    if (row !== undefined) return row
    const parent: Task | undefined = tasks.find((one) => one.uid === at)
    at = parent === undefined ? null : parent.parentTaskUid
  }
  return null
}

// WHY: derived from the task UID, since a pure function may not mint a random UUID; importing twice gives the same ids.
// see AT-51
/** @purity pure */
function rowIdOfTask(uid: number): string {
  const scalar = Math.trunc(uid)
  const sign = scalar < 0 ? 'f' : '0'
  const digits = Math.abs(scalar).toString(16).padStart(11, '0').slice(-11)
  return `00000000-0000-4000-8000-${sign}${digits}`
}

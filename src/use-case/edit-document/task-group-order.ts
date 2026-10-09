// EditDocument -- sibling rows' order and parent change, and the WBS order follows the rows.
// @unit      UF-80  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { depthOf, subtreeOf, wbsSubtreesOf, withSchedule } from './edit-task-group'

// see HM-9
// TRAP: schedule-invariants.ts and the input translator walk the row tree the same way; change all three.
/** @purity pure */
function taskGroupTreeRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((one) => one.id))
  for (const one of groups) {
    const parent = one.parentId !== null && holds.has(one.parentId) ? one.parentId : null
    const kin = childrenOf.get(parent)
    if (kin === undefined) childrenOf.set(parent, [one])
    else kin.push(one)
  }
  for (const kin of childrenOf.values()) kin.sort((a, b) => a.order - b.order)

  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const one of childrenOf.get(parent) ?? []) {
      if (rankById.has(one.id)) continue
      rankById.set(one.id, rankById.size)
      walk(one.id)
    }
  }
  walk(null)
  for (const one of groups) if (!rankById.has(one.id)) rankById.set(one.id, rankById.size)
  return rankById
}

// see ST-2
/** @purity pure */
function compareByStackOrder(left: Task, right: Task): number {
  const text = (a: string | null, b: string | null): number =>
    a === b ? 0 : (a ?? '') < (b ?? '') ? -1 : 1
  const byStart = text(left.start, right.start)
  if (byStart !== 0) return byStart
  const byFinish = text(left.finish, right.finish)
  if (byFinish !== 0) return -byFinish
  return left.uid - right.uid
}

// see HM-9
/** @purity pure */
export function tasksRankedByTheTaskGroupTree(schedule: Schedule): readonly Task[] {
  if (schedule.tasks.length === 0) return schedule.tasks
  const rankById = taskGroupTreeRankById(schedule.taskGroups)
  const taskGroupOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const rankOf = (task: Task): number => {
    const row = taskGroupOfTask.get(task.uid)
    const rank = row === undefined ? undefined : rankById.get(row)
    return rank === undefined ? rankById.size : rank
  }
  const family = new Map<number | null, Task[]>()
  for (const task of schedule.tasks) {
    const kin = family.get(task.parentTaskUid)
    if (kin === undefined) family.set(task.parentTaskUid, [task])
    else kin.push(task)
  }
  const placeOf = new Map<number, number>()
  for (const kin of family.values()) {
    const ordered = [...kin].sort((a, b) => {
      const byTaskGroup = rankOf(a) - rankOf(b)
      return byTaskGroup !== 0 ? byTaskGroup : compareByStackOrder(a, b)
    })
    ordered.forEach((task, at) => placeOf.set(task.uid, at))
  }
  return schedule.tasks.map((task) => {
    const at = placeOf.get(task.uid)
    return at === undefined || task.wbsOrder === at ? task : { ...task, wbsOrder: at }
  })
}

/** @purity pure */
function withWbsOrderFollowingTheTaskGroups(document: Document, taskGroups: readonly TaskGroup[]): Document {
  const moved = withSchedule(document, { taskGroups: taskGroups })
  return withSchedule(moved, { tasks: tasksRankedByTheTaskGroupTree(moved.schedule) })
}

// see CM-35, FR-005
/** @purity pure */
export function reorderTaskGroupSiblings(
  document: Document,
  command: TaskGroupCommandOf<'reorderTaskGroupSiblings'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const groups = document.schedule.taskGroups
  const refusals: Refusal[] = []
  if (command.parentId !== null && !byId.has(command.parentId)) {
    refusals.push(reject('CM-35', 'FR-005', `no such parent row: ${command.parentId}`))
  }
  const siblings = groups.filter((one) => one.parentId === command.parentId)
  const asked = new Set(command.orderedIds)
  if (asked.size !== command.orderedIds.length) {
    refusals.push(reject('CM-35', 'HM-8', 'the same row is named twice'))
  }
  if (asked.size !== siblings.length || !siblings.every((one) => asked.has(one.id))) {
    refusals.push(
      reject('CM-35', 'HM-8', 'the list must name every child of that parent, and no other row'),
    )
  }
  if (refusals.length > 0) return refused(refusals)

  const rank = new Map(command.orderedIds.map((id, at) => [id, at]))
  const ordered = groups.map((one) => {
    const place = rank.get(one.id)
    return place === undefined || place === one.order ? one : { ...one, order: place }
  })
  if (ordered.every((one, at) => one === groups[at])) return edited(document)
  return edited(withWbsOrderFollowingTheTaskGroups(document, ordered))
}

// see CM-73, FR-005
/** @purity pure */
export function moveTaskGroup(
  document: Document,
  command: TaskGroupCommandOf<'moveTaskGroup'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const groups = document.schedule.taskGroups
  const moved = byId.get(command.groupId)
  if (moved === undefined) {
    return refused([reject('CM-73', 'FR-005', `no such row: ${command.groupId}`)])
  }
  const refusals: Refusal[] = []
  const parent = command.parentId === null ? null : byId.get(command.parentId)
  if (command.parentId !== null && parent === undefined) {
    refusals.push(reject('CM-73', 'FR-005', `no such parent row: ${command.parentId}`))
  }
  const carried = subtreeOf(groups, command.groupId)
  if (carried === null) {
    return refused([reject('CM-73', 'FR-005', `no such row: ${command.groupId}`)])
  }
  if (command.parentId !== null && carried.taskGroups.some((one) => one.id === command.parentId)) {
    refusals.push(
      reject('CM-73', 'HM-4', 'a row may not be moved under itself or its own descendant'),
    )
  }
  const under = parent === undefined || parent === null ? 0 : depthOf(byId, parent)
  if (under + carried.height > SETTINGS_CONSTANTS.maxGroupDepth) {
    refusals.push(
      reject(
        'CM-73',
        'HM-3a',
        `the move would reach depth ${under + carried.height}, ` +
          `past S-125's ${SETTINGS_CONSTANTS.maxGroupDepth}`,
      ),
    )
  }
  if (refusals.length > 0) return refused(refusals)

  const landing = Math.max(0, Math.trunc(command.order))
  const stays = groups.filter(
    (one) => one.id !== command.groupId && one.parentId === command.parentId,
  )
  const placed = [...stays.slice(0, landing), moved, ...stays.slice(landing)]
  const rank = new Map(placed.map((one, at) => [one.id, at]))
  const left = groups.filter(
    (one) => one.id !== command.groupId && one.parentId === moved.parentId,
  )
  const leftRank = new Map(left.map((one, at) => [one.id, at]))
  const next = groups.map((one) => {
    if (one.id === command.groupId) {
      const at = rank.get(one.id) ?? landing
      return one.parentId === command.parentId && one.order === at
        ? one
        : { ...one, parentId: command.parentId, order: at }
    }
    const place = rank.get(one.id) ?? leftRank.get(one.id)
    return place === undefined || place === one.order ? one : { ...one, order: place }
  })
  if (next.every((one, at) => one === groups[at])) return edited(document)
  return movedWithTheWbs(document, next, byId, moved, parent)
}

// see HM-1, HM-4
// WHY: byId is the pre-move row index moveTaskGroup already holds; the WBS walk reads the rows as they stood.
/** @purity pure */
function movedWithTheWbs(
  document: Document,
  taskGroups: readonly TaskGroup[],
  byId: ReadonlyMap<string, TaskGroup>,
  moved: TaskGroup,
  parent: TaskGroup | null | undefined,
): EditResult {
  const tasks = document.schedule.tasks
  const parentTaskUid = parentTaskAfterTheMove(document.schedule, byId, moved, parent ?? null)
  const taskUid = moved.derivedFromTaskUid
  if (parentTaskUid === undefined || taskUid === null) return edited(withWbsOrderFollowingTheTaskGroups(document, taskGroups))
  if (parentTaskUid !== null && wbsSubtreesOf(tasks, [taskUid]).has(parentTaskUid)) {
    return refused([reject('CM-73', 'HM-4', `Task ${parentTaskUid} sits inside the WBS subtree of Task ${taskUid}`)])
  }
  const reparented = tasks.map((one) => (one.uid === taskUid ? { ...one, parentTaskUid } : one))
  return edited(withWbsOrderFollowingTheTaskGroups(withSchedule(document, { tasks: reparented }), taskGroups))
}

// see HM-1, HM-7, HM-12
// WHY: undefined when the move reaches no parent task: a hand-made row carries no Task, and a reorder is no move;
// null is the root.
/** @purity pure */
function parentTaskAfterTheMove(
  schedule: Schedule,
  byId: ReadonlyMap<string, TaskGroup>,
  moved: TaskGroup,
  parent: TaskGroup | null,
): number | null | undefined {
  if (moved.derivedFromTaskUid === null || taskByUid(schedule, moved.derivedFromTaskUid) === null) return undefined
  if ((parent?.id ?? null) === moved.parentId) return undefined
  return nearestDerivedTaskUid(schedule, byId, parent)
}

// see HM-12, DU-1
// WHY: walks up from the landing row; a row whose source Task is gone derives nothing, and no derived row is the root.
// A copy's walk passes the rows that derive from its own WBS descendants (DU-1), so no loop forms.
/** @purity pure */
export function nearestDerivedTaskUid(
  schedule: Schedule,
  byId: ReadonlyMap<string, TaskGroup>,
  landing: TaskGroup | null,
  passes: (uid: number) => boolean = () => false,
): number | null {
  let taskGroup = landing
  for (let guard = 0; taskGroup !== null && guard <= byId.size; guard++) {
    const uid = taskGroup.derivedFromTaskUid
    if (uid !== null && !passes(uid) && taskByUid(schedule, uid) !== null) return uid
    taskGroup = taskGroup.parentId === null ? null : (byId.get(taskGroup.parentId) ?? null)
  }
  return null
}

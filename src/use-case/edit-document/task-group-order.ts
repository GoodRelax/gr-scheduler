// EditDocument -- sibling rows' order and parent change, and the WBS order follows the rows.
// @unit      UF-80  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Schedule, Task, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { depthOf, subtreeOf, withSchedule } from './edit-task-group'

// see HM-9
// TRAP: schedule.ts and the input translator walk the row tree the same way; change all three.
/** @purity pure */
function rowTreeRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
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
export function tasksRankedByTheRowTree(schedule: Schedule): readonly Task[] {
  if (schedule.tasks.length === 0) return schedule.tasks
  const rankById = rowTreeRankById(schedule.taskGroups)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const rankOf = (task: Task): number => {
    const row = rowOfTask.get(task.uid)
    const rank = row === undefined ? undefined : rankById.get(row)
    return rank === undefined ? rankById.size : rank
  }
  const family = new Map<number | null, Task[]>()
  for (const task of schedule.tasks) {
    const kin = family.get(task.wbsParentUid)
    if (kin === undefined) family.set(task.wbsParentUid, [task])
    else kin.push(task)
  }
  const placeOf = new Map<number, number>()
  for (const kin of family.values()) {
    const ordered = [...kin].sort((a, b) => {
      const byRow = rankOf(a) - rankOf(b)
      return byRow !== 0 ? byRow : compareByStackOrder(a, b)
    })
    ordered.forEach((task, at) => placeOf.set(task.uid, at))
  }
  return schedule.tasks.map((task) => {
    const at = placeOf.get(task.uid)
    return at === undefined || task.wbsOrder === at ? task : { ...task, wbsOrder: at }
  })
}

/** @purity pure */
function withWbsOrderFollowingTheRows(document: Document, rows: readonly TaskGroup[]): Document {
  const moved = withSchedule(document, { taskGroups: rows })
  return withSchedule(moved, { tasks: tasksRankedByTheRowTree(moved.schedule) })
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
  return edited(withWbsOrderFollowingTheRows(document, ordered))
}

// see CM-73, FR-005
/** @purity pure */
export function moveTaskGroup(
  document: Document,
  command: TaskGroupCommandOf<'moveTaskGroup'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const settings = document.documentSettings
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
  if (command.parentId !== null && carried.rows.some((one) => one.id === command.parentId)) {
    refusals.push(
      reject('CM-73', 'HM-4', 'a row may not be moved under itself or its own descendant'),
    )
  }
  const under = parent === undefined || parent === null ? 0 : depthOf(byId, parent)
  if (under + carried.height > settings.maxGroupDepth) {
    refusals.push(
      reject(
        'CM-73',
        'HM-3a',
        `the move would reach depth ${under + carried.height}, ` +
          `past S-125's ${settings.maxGroupDepth}`,
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
  return edited(withWbsOrderFollowingTheRows(document, next))
}

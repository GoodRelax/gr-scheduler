// EditDocument: the commands of the TaskGroup aggregate.
// @unit      UF-12  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'
import displayWords from '../../adapter/screen-renderer/display-words.json'

// WHY: English, because the display language is not in the document and the label is exported.
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
export const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en

export type TaskGroupCommand =
  | {
      readonly kind: 'createTaskGroup'
      readonly id: string
      readonly parentId: string | null
      readonly label: string | null
      readonly derivedFromTaskUid: number | null
      readonly order: number
    }
  | { readonly kind: 'deleteTaskGroup'; readonly groupId: string }
  | {
      readonly kind: 'pasteTaskGroupSubtree'
      readonly sourceGroupId: string
      readonly targetGroupId: string | null
      readonly newGroupIds: Readonly<Record<string, string>>
    }
  | { readonly kind: 'setTaskGroupLabel'; readonly groupId: string; readonly label: string | null }
  | { readonly kind: 'setTaskGroupColor'; readonly groupId: string; readonly color: string }
  | { readonly kind: 'resetTaskGroupColor'; readonly groupId: string }
  | { readonly kind: 'setTaskGroupHeight'; readonly groupId: string; readonly height: number | null }
  | { readonly kind: 'setTaskGroupCollapsed'; readonly groupId: string; readonly collapsed: boolean }
  | { readonly kind: 'setTaskGroupHidden'; readonly groupId: string; readonly hidden: boolean }
  | {
      readonly kind: 'reorderTaskGroupSiblings'
      readonly parentId: string | null
      readonly orderedIds: readonly string[]
    }
  | {
      readonly kind: 'moveTaskGroup'
      readonly groupId: string
      readonly parentId: string | null
      readonly order: number
    }
  | { readonly kind: 'expandAllTaskGroups' }

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/** @purity pure */
function withRow(document: Document, row: TaskGroup): Document {
  return withSchedule(document, {
    taskGroups: document.schedule.taskGroups.map((one) => (one.id === row.id ? row : one)),
  })
}

/** @purity pure */
function depthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
  let depth = 1
  let foundAt = row.parentId
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}

interface Subtree {
  readonly rows: readonly TaskGroup[]
  readonly height: number
}

/** @purity pure */
function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree | null {
  const root = groups.find((one) => one.id === rootId)
  if (root === undefined) return null
  const rows: TaskGroup[] = []
  const seen = new Set<string>()
  let level: readonly TaskGroup[] = [root]
  let height = 0
  while (level.length > 0) {
    height += 1
    for (const one of level) {
      rows.push(one)
      seen.add(one.id)
    }
    const above = level
    level = groups.filter((one) => !seen.has(one.id) && above.some((up) => up.id === one.parentId))
  }
  return { rows, height }
}

// see CD-1, DU-1
/** @purity pure */
function withWbsDescendants(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

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

// see CM-26, CM-27, CM-28, CM-29, CM-30, CM-31, CM-32, CM-33, CM-34, CM-35, CM-72, CM-73
// TRAP: a command that changes nothing returns the same document object; a write is detected
// by the schedule reference.
/** @purity pure */
export function editTaskGroup(document: Document, command: TaskGroupCommand): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const groups = schedule.taskGroups
  const byId = new Map(groups.map((one) => [one.id, one]))

  switch (command.kind) {
    case 'createTaskGroup': {
      const refusals: Refusal[] = []
      if (byId.has(command.id)) {
        refusals.push(reject('CM-26', 'IV-1', `a row already holds the id ${command.id}`))
      }
      if (!Number.isInteger(command.order)) {
        refusals.push(reject('CM-26', 'AT-55', `order is not an integer: ${command.order}`))
      }
      if (command.label === null && command.derivedFromTaskUid === null) {
        refusals.push(
          reject('CM-26', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
        )
      }
      if (
        command.derivedFromTaskUid !== null &&
        taskByUid(schedule, command.derivedFromTaskUid) === null
      ) {
        refusals.push(
          reject('CM-26', 'IV-2', `no Task holds the uid ${command.derivedFromTaskUid}`),
        )
      }
      if (command.parentId !== null) {
        const parent = byId.get(command.parentId)
        if (parent === undefined) {
          refusals.push(reject('CM-26', 'FR-085', `no such parent row: ${command.parentId}`))
        } else if (depthOf(byId, parent) >= settings.maxGroupDepth) {
          refusals.push(
            reject(
              'CM-26',
              'FR-085',
              `the parent is already at the depth S-125 allows (${settings.maxGroupDepth})`,
            ),
          )
        }
      }
      if (refusals.length > 0) return refused(refusals)

      const row: TaskGroup = {
        id: command.id,
        parentId: command.parentId,
        label: command.label,
        derivedFromTaskUid: command.derivedFromTaskUid,
        order: command.order,
        isCollapsed: null,
        isHidden: null,
        color: null,
        height: null,
      }
      return edited(withSchedule(document, { taskGroups: [...groups, row] }))
    }

    case 'deleteTaskGroup': {
      const doomed = subtreeOf(groups, command.groupId)
      if (doomed === null) {
        return refused([reject('CM-27', 'FR-032', `no such row: ${command.groupId}`)])
      }
      const doomedRows = new Set(doomed.rows.map((one) => one.id))
      const seeds = schedule.taskGroupMembers
        .filter((member) => doomedRows.has(member.groupId))
        .map((member) => member.taskUid)
      const doomedTasks = withWbsDescendants(schedule.tasks, seeds)

      const kept: TaskGroup[] = []
      for (const row of groups) {
        if (doomedRows.has(row.id)) continue
        if (row.derivedFromTaskUid === null || !doomedTasks.has(row.derivedFromTaskUid)) {
          kept.push(row)
          continue
        }
        // WHY: settles a name rather than refusing, which would block deleting a nameless Task.
        const settled =
          row.label ?? taskByUid(schedule, row.derivedFromTaskUid)?.name ?? DEFAULT_ROW_NAME
        kept.push({ ...row, label: settled, derivedFromTaskUid: null })
      }

      const survivors = schedule.tasks
        .filter((task) => !doomedTasks.has(task.uid))
        .map((task) => {
          const held = task.dependencies.filter((one) => !doomedTasks.has(one.predecessorUid))
          return held.length === task.dependencies.length ? task : { ...task, dependencies: held }
        })

      const pinned = settings.pinnedGroupIds.filter((one) => !doomedRows.has(one))
      const scrollGroupId =
        settings.scrollGroupId !== null && doomedRows.has(settings.scrollGroupId)
          ? null
          : settings.scrollGroupId
      const documentSettings =
        pinned.length !== settings.pinnedGroupIds.length || scrollGroupId !== settings.scrollGroupId
          ? { ...settings, pinnedGroupIds: pinned, scrollGroupId }
          : settings

      // WHY: baselineTasks match by uid rather than by reference, and resources are kept.
      return edited({
        ...document,
        schedule: {
          ...schedule,
          taskGroups: kept,
          tasks: survivors,
          taskGroupMembers: schedule.taskGroupMembers.filter(
            (one) => !doomedTasks.has(one.taskUid) && !doomedRows.has(one.groupId),
          ),
          taskVisuals: schedule.taskVisuals.filter((one) => !doomedTasks.has(one.taskUid)),
          taskOrigins: schedule.taskOrigins.filter((one) => !doomedTasks.has(one.taskUid)),
          assignments: schedule.assignments.filter(
            (one) => one.taskUid === null || !doomedTasks.has(one.taskUid),
          ),
          commentBoxes: schedule.commentBoxes.filter(
            (one) => one.anchorGroupId === null || !doomedRows.has(one.anchorGroupId),
          ),
          highlightBoxes: schedule.highlightBoxes.filter(
            (one) =>
              !(one.topGroupId !== null && doomedRows.has(one.topGroupId)) &&
              !(one.bottomGroupId !== null && doomedRows.has(one.bottomGroupId)),
          ),
        },
        documentSettings,
      })
    }

    case 'pasteTaskGroupSubtree': {
      const copied = subtreeOf(groups, command.sourceGroupId)
      if (copied === null) {
        return refused([reject('CM-28', 'FR-033', `no such row: ${command.sourceGroupId}`)])
      }
      const target = command.targetGroupId === null ? null : byId.get(command.targetGroupId)
      if (command.targetGroupId !== null && target === undefined) {
        return refused([
          reject('CM-28', 'FR-033', `no such row to paste under: ${command.targetGroupId}`),
        ])
      }
      const refusals: Refusal[] = []

      const under = target === undefined || target === null ? 0 : depthOf(byId, target)
      if (under + copied.height > settings.maxGroupDepth) {
        refusals.push(
          reject(
            'CM-28',
            'FR-033',
            `the copy would reach depth ${under + copied.height}, past S-125's ${settings.maxGroupDepth}`,
          ),
        )
      }

      const idOf = new Map<string, string>()
      const taken = new Set<string>()
      for (const row of copied.rows) {
        const fresh = command.newGroupIds[row.id]
        if (fresh === undefined) {
          refusals.push(reject('CM-28', 'AT-51', `no new id was given for the copy of ${row.id}`))
        } else if (byId.has(fresh) || taken.has(fresh)) {
          refusals.push(reject('CM-28', 'IV-1', `the id ${fresh} is already in use`))
        } else {
          taken.add(fresh)
          idOf.set(row.id, fresh)
        }
      }

      const copiedRows = new Set(copied.rows.map((one) => one.id))
      const rowOf = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
      const seeds = schedule.taskGroupMembers
        .filter((member) => copiedRows.has(member.groupId))
        .map((member) => member.taskUid)
      const copiedTasks = withWbsDescendants(schedule.tasks, seeds)
      const homeless = [...copiedTasks].filter((uid) => {
        const row = rowOf.get(uid)
        return row === undefined || !copiedRows.has(row)
      })
      if (homeless.length > 0) {
        refusals.push(
          reject(
            'CM-28',
            'DU-2',
            `DU-1 pulls in Tasks ${homeless.join(', ')}, which sit on no copied row, and DU-2 does not say which row their copies land on`,
          ),
        )
      }
      if (refusals.length > 0) return refused(refusals)

      let mark = schedule.project.uidHighWaterMark
      const uidOf = new Map<number, number>()
      // TRAP: sorted, so the same paste mints the same uids.
      for (const uid of [...copiedTasks].sort((a, b) => a - b)) uidOf.set(uid, ++mark)

      const newRows: TaskGroup[] = []
      for (const row of copied.rows) {
        const fresh = idOf.get(row.id)
        if (fresh === undefined) continue
        const parentId =
          row.id === command.sourceGroupId
            ? command.targetGroupId
            : row.parentId === null
              ? null
              : (idOf.get(row.parentId) ?? row.parentId)
        newRows.push({ ...row, id: fresh, parentId })
      }

      const newTasks: Task[] = []
      for (const task of schedule.tasks) {
        const fresh = uidOf.get(task.uid)
        if (fresh === undefined) continue
        newTasks.push({
          ...task,
          uid: fresh,
          wbsParentUid:
            task.wbsParentUid === null
              ? null
              : (uidOf.get(task.wbsParentUid) ?? task.wbsParentUid),
          dependencies: task.dependencies
            .filter((one) => uidOf.has(one.predecessorUid))
            .map((one) => ({
              ...one,
              predecessorUid: uidOf.get(one.predecessorUid) ?? one.predecessorUid,
            })),
        })
      }

      const newMembers: TaskGroupMember[] = []
      for (const member of schedule.taskGroupMembers) {
        const freshUid = uidOf.get(member.taskUid)
        const freshRow = idOf.get(member.groupId)
        if (freshUid === undefined || freshRow === undefined) continue
        newMembers.push({ ...member, taskUid: freshUid, groupId: freshRow })
      }

      const newVisuals: TaskVisual[] = []
      for (const visual of schedule.taskVisuals) {
        const fresh = uidOf.get(visual.taskUid)
        if (fresh !== undefined) newVisuals.push({ ...visual, taskUid: fresh })
      }

      const newAssignments: Assignment[] = []
      for (const assignment of schedule.assignments) {
        if (assignment.taskUid === null) continue
        const fresh = uidOf.get(assignment.taskUid)
        if (fresh === undefined) continue
        newAssignments.push({ ...assignment, uid: ++mark, taskUid: fresh })
      }

      return edited(
        withSchedule(document, {
          project: { ...schedule.project, uidHighWaterMark: mark },
          taskGroups: [...groups, ...newRows],
          tasks: [...schedule.tasks, ...newTasks],
          taskGroupMembers: [...schedule.taskGroupMembers, ...newMembers],
          taskVisuals: [...schedule.taskVisuals, ...newVisuals],
          assignments: [...schedule.assignments, ...newAssignments],
        }),
      )
    }

    case 'setTaskGroupLabel': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-29', 'FR-085', `no such row: ${command.groupId}`)])
      }
      if (command.label === null && row.derivedFromTaskUid === null) {
        return refused([
          reject('CM-29', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
        ])
      }
      if (row.label === command.label) return edited(document)
      return edited(withRow(document, { ...row, label: command.label }))
    }

    case 'setTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-30', 'FR-042', `no such row: ${command.groupId}`)])
      }
      // WHY: not checked against the colour list, where only transparent has a settled spelling.
      if (row.color === command.color) return edited(document)
      return edited(withRow(document, { ...row, color: command.color }))
    }

    case 'resetTaskGroupColor': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-31', 'FR-007', `no such row: ${command.groupId}`)])
      }
      if (row.color === null) return edited(document)
      return edited(withRow(document, { ...row, color: null }))
    }

    case 'setTaskGroupHeight': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-32', 'FR-042', `no such row: ${command.groupId}`)])
      }
      if (command.height !== null && !Number.isInteger(command.height)) {
        return refused([reject('CM-32', 'AT-59', `height is not an integer: ${command.height}`)])
      }
      // WHY: a height below the stacks is a floor, not refused; null resets, as no reset command exists.
      if (row.height === command.height) return edited(document)
      return edited(withRow(document, { ...row, height: command.height }))
    }

    case 'setTaskGroupCollapsed': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-33', 'FR-004', `no such row: ${command.groupId}`)])
      }
      if (row.isCollapsed === command.collapsed) return edited(document)
      return edited(withRow(document, { ...row, isCollapsed: command.collapsed }))
    }

    case 'setTaskGroupHidden': {
      const row = byId.get(command.groupId)
      if (row === undefined) {
        return refused([reject('CM-34', 'FR-004', `no such row: ${command.groupId}`)])
      }
      if (row.isHidden === command.hidden) return edited(document)
      return edited(withRow(document, { ...row, isHidden: command.hidden }))
    }

    case 'reorderTaskGroupSiblings': {
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

    case 'moveTaskGroup': {
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

    case 'expandAllTaskGroups': {
      const opened = groups.map((one) =>
        one.isCollapsed === true ? { ...one, isCollapsed: false } : one,
      )
      if (opened.every((one, at) => one === groups[at])) return edited(document)
      return edited(withSchedule(document, { taskGroups: opened }))
    }
  }
}

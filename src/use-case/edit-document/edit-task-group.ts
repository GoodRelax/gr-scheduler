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
import { refused, edited, reject } from './edit-document'
import { createTaskGroup, setTaskGroupLabel } from './task-group-naming'
import { resetTaskGroupColor, setTaskGroupColor, setTaskGroupHeight } from './task-group-look'
import {
  expandAllTaskGroups,
  setTaskGroupCollapsed,
  setTaskGroupHidden,
  setTaskGroupKeptOpen,
} from './task-group-folding'
import { moveTaskGroup, reorderTaskGroupSiblings } from './task-group-order'

export { tasksRankedByTheRowTree } from './task-group-order'

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
  | { readonly kind: 'setTaskGroupKeptOpen'; readonly groupId: string; readonly keptOpen: boolean }
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

export type TaskGroupCommandOf<K extends TaskGroupCommand['kind']> = Extract<
  TaskGroupCommand,
  { readonly kind: K }
>

/** @purity pure */
export function withSchedule(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/** @purity pure */
export function withRow(document: Document, row: TaskGroup): Document {
  return withSchedule(document, {
    taskGroups: document.schedule.taskGroups.map((one) => (one.id === row.id ? row : one)),
  })
}

/** @purity pure */
export function depthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
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

export interface Subtree {
  readonly rows: readonly TaskGroup[]
  readonly height: number
}

/** @purity pure */
export function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree | null {
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

// see CM-26, CM-27, CM-28, CM-29, CM-30, CM-31, CM-32, CM-33, CM-34, CM-35, CM-72, CM-73
// TRAP: a command that changes nothing returns the same document object; a write is detected
// by the schedule reference.
/** @purity pure */
export function editTaskGroup(
  document: Document,
  command: TaskGroupCommand,
  defaultRowName: string,
): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const groups = schedule.taskGroups
  const byId = new Map(groups.map((one) => [one.id, one]))

  switch (command.kind) {
    case 'createTaskGroup':
      return createTaskGroup(document, command, byId)

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
          row.label ?? taskByUid(schedule, row.derivedFromTaskUid)?.name ?? defaultRowName
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
      // STOP: spec does not decide the row a WBS descendant outside the copied rows lands on. Looked in DU-1, DU-2, FR-033 (PND-495)
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
        // WHY: a copy is a row made now, so FR-018 has its kept-open mark start false.
        newRows.push({ ...row, id: fresh, parentId, isKeptOpen: false })
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

    case 'setTaskGroupLabel':
      return setTaskGroupLabel(document, command, byId)
    case 'setTaskGroupColor':
      return setTaskGroupColor(document, command, byId)
    case 'resetTaskGroupColor':
      return resetTaskGroupColor(document, command, byId)
    case 'setTaskGroupHeight':
      return setTaskGroupHeight(document, command, byId)
    case 'setTaskGroupCollapsed':
      return setTaskGroupCollapsed(document, command, byId)
    case 'setTaskGroupHidden':
      return setTaskGroupHidden(document, command, byId)
    case 'setTaskGroupKeptOpen':
      return setTaskGroupKeptOpen(document, command, byId)
    case 'reorderTaskGroupSiblings':
      return reorderTaskGroupSiblings(document, command, byId)
    case 'moveTaskGroup':
      return moveTaskGroup(document, command, byId)
    case 'expandAllTaskGroups':
      return expandAllTaskGroups(document)
  }
}

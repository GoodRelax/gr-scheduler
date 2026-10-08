// EditDocument: the commands of the TaskGroup aggregate.
// @unit      UF-12  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type {
  Assignment,
  Schedule,
  Task,
  TaskGroup,
  TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import { taskByUid, workingCalendarOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import { createTaskGroup, setTaskGroupLabel } from './task-group-naming'
import { resetTaskGroupColor, setTaskGroupColor, setTaskGroupMinHeight } from './task-group-look'
import { resetTaskGroupTreeStates, setTaskGroupTreeState } from './task-group-folding'
import { moveTaskGroup, reorderTaskGroupSiblings } from './task-group-order'
import { pastedCopyOf } from './task-plan-actual'
import { copiedTask, withInferredCopyParents } from './task-paste'

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
  | { readonly kind: 'deleteTaskGroup'; readonly groupId: string; readonly newGroupId: string }
  | {
      readonly kind: 'pasteTaskGroupSubtree'
      readonly sourceGroupId: string
      readonly targetGroupId: string | null
      readonly newGroupIds: Readonly<Record<string, string>>
    }
  | { readonly kind: 'setTaskGroupLabel'; readonly groupId: string; readonly label: string | null }
  | { readonly kind: 'setTaskGroupColor'; readonly groupId: string; readonly color: string }
  | { readonly kind: 'resetTaskGroupColor'; readonly groupId: string }
  | { readonly kind: 'setTaskGroupMinHeight'; readonly groupId: string; readonly minHeight: number | null }
  | {
      readonly kind: 'setTaskGroupTreeState'
      readonly groupId: string
      readonly treeState: TaskGroup['treeState']
    }
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
  | { readonly kind: 'resetTaskGroupTreeStates' }

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

// see CD-1, DU-1, IV-4
// WHY: a sweep, not a recursion, because rows arrive in no parent-before-child order.
/** @purity pure */
export function wbsSubtreesOf(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
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

// see DU-2
/** @purity pure */
function pastedTreeState(state: TaskGroup['treeState']): TaskGroup['treeState'] {
  return state === 'expanded' || state === 'temporarilyExpanded' ? 'auto' : state
}

// see CD-1, DU-2, AT-54
/** @purity pure */
export function settledRow(schedule: Schedule, row: TaskGroup, defaultRowName: string): TaskGroup {
  const source = row.derivedFromTaskUid === null ? null : taskByUid(schedule, row.derivedFromTaskUid)
  return { ...row, label: row.label ?? source?.name ?? defaultRowName, derivedFromTaskUid: null }
}

type PastePlan =
  | { readonly ok: false; readonly refusals: readonly Refusal[] }
  | { readonly ok: true; readonly copied: Subtree; readonly idOf: ReadonlyMap<string, string> }

// see CM-28, FR-033, FR-004, AT-51, IV-1
/** @purity pure */
function pastePlanOf(
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  byId: ReadonlyMap<string, TaskGroup>,
  groups: readonly TaskGroup[],
): PastePlan {
  const copied = subtreeOf(groups, command.sourceGroupId)
  if (copied === null) {
    return { ok: false, refusals: [reject('CM-28', 'FR-033', `no such row: ${command.sourceGroupId}`)] }
  }
  const target = command.targetGroupId === null ? null : byId.get(command.targetGroupId)
  if (target === undefined) {
    return { ok: false, refusals: [reject('CM-28', 'FR-033', `no such row to paste under: ${command.targetGroupId}`)] }
  }
  const refusals: Refusal[] = []
  const under = target === null ? 0 : depthOf(byId, target)
  if (under + copied.height > SETTINGS_CONSTANTS.maxGroupDepth) {
    const reached = `the copy would reach depth ${under + copied.height}`
    refusals.push(reject('CM-28', 'FR-033', `${reached}, past S-125's ${SETTINGS_CONSTANTS.maxGroupDepth}`))
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
  return refusals.length > 0 ? { ok: false, refusals } : { ok: true, copied, idOf }
}

// see DU-2, HM-12
// WHY: the copied row follows its Task's copy, or settles its name, so moving the copy never moves the original Task.
/** @purity pure */
function copiedRowOf(
  schedule: Schedule,
  row: TaskGroup,
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  idOf: ReadonlyMap<string, string>,
  uidOf: ReadonlyMap<number, number>,
  defaultRowName: string,
): TaskGroup {
  const parentId =
    row.id === command.sourceGroupId
      ? command.targetGroupId
      : row.parentId === null
        ? null
        : (idOf.get(row.parentId) ?? row.parentId)
  const pasted = { ...row, id: idOf.get(row.id) as string, parentId, treeState: pastedTreeState(row.treeState) }
  if (row.derivedFromTaskUid === null) return pasted
  const copy = uidOf.get(row.derivedFromTaskUid)
  return copy === undefined ? settledRow(schedule, pasted, defaultRowName) : { ...pasted, derivedFromTaskUid: copy }
}

// see CM-28, FR-033, DU-1, DU-2
// WHY: only the Tasks on the copied rows; a WBS descendant on another row is not copied, and no paste is refused.
/** @purity pure */
function pasteTaskGroupSubtree(
  document: Document,
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  byId: ReadonlyMap<string, TaskGroup>,
  defaultRowName: string,
): EditResult {
  const schedule = document.schedule
  const plan = pastePlanOf(command, byId, schedule.taskGroups)
  if (!plan.ok) return refused([...plan.refusals])
  const copiedRows = new Set(plan.copied.rows.map((one) => one.id))
  const riders = schedule.taskGroupMembers.filter((member) => copiedRows.has(member.groupId))

  let mark = schedule.project.uidHighWaterMark
  const uidOf = new Map<number, number>()
  // TRAP: sorted, so the same paste mints the same uids.
  for (const uid of [...new Set(riders.map((one) => one.taskUid))].sort((a, b) => a - b)) uidOf.set(uid, ++mark)

  const sources = schedule.tasks.filter((one) => uidOf.has(one.uid))
  const chosen = new Set(uidOf.keys())
  const paired = sources.map((one) => pastedCopyOf(copiedTask(one, chosen, uidOf), schedule, workingCalendarOf(schedule)))
  const after: Schedule = {
    ...schedule,
    taskGroups: [...schedule.taskGroups, ...plan.copied.rows.map((row) =>
      copiedRowOf(schedule, row, command, plan.idOf, uidOf, defaultRowName))],
    tasks: [...schedule.tasks, ...paired],
    taskGroupMembers: [...schedule.taskGroupMembers, ...riders.map((one) =>
      ({ ...one, taskUid: uidOf.get(one.taskUid) as number, groupId: plan.idOf.get(one.groupId) as string }))],
  }
  const newVisuals: TaskVisual[] = schedule.taskVisuals.flatMap((one) => {
    const fresh = uidOf.get(one.taskUid)
    return fresh === undefined ? [] : [{ ...one, taskUid: fresh }]
  })
  const newAssignments: Assignment[] = []
  for (const one of schedule.assignments) {
    const fresh = one.taskUid === null ? undefined : uidOf.get(one.taskUid)
    if (fresh !== undefined) newAssignments.push({ ...one, uid: ++mark, taskUid: fresh })
  }
  return edited(withSchedule(document, {
    project: { ...schedule.project, uidHighWaterMark: mark },
    taskGroups: after.taskGroups,
    tasks: [...schedule.tasks, ...withInferredCopyParents(after, sources, paired, uidOf)],
    taskGroupMembers: after.taskGroupMembers,
    taskVisuals: [...schedule.taskVisuals, ...newVisuals],
    assignments: [...schedule.assignments, ...newAssignments],
  }))
}

// see CM-26, CM-27, CM-28, CM-29, CM-30, CM-31, CM-32, CM-35, CM-72, CM-73, CM-85
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
      const doomedTasks = wbsSubtreesOf(schedule.tasks, seeds)

      const kept: TaskGroup[] = []
      for (const row of groups) {
        if (doomedRows.has(row.id)) continue
        if (row.derivedFromTaskUid === null || !doomedTasks.has(row.derivedFromTaskUid)) {
          kept.push(row)
          continue
        }
        // WHY: settles a name rather than refusing, which would block deleting a nameless Task.
        kept.push(settledRow(schedule, row, defaultRowName))
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

    case 'pasteTaskGroupSubtree':
      return pasteTaskGroupSubtree(document, command, byId, defaultRowName)

    case 'setTaskGroupLabel':
      return setTaskGroupLabel(document, command, byId)
    case 'setTaskGroupColor':
      return setTaskGroupColor(document, command, byId)
    case 'resetTaskGroupColor':
      return resetTaskGroupColor(document, command, byId)
    case 'setTaskGroupMinHeight':
      return setTaskGroupMinHeight(document, command, byId)
    case 'setTaskGroupTreeState':
      return setTaskGroupTreeState(document, command, byId)
    case 'reorderTaskGroupSiblings':
      return reorderTaskGroupSiblings(document, command, byId)
    case 'moveTaskGroup':
      return moveTaskGroup(document, command, byId)
    case 'resetTaskGroupTreeStates':
      return resetTaskGroupTreeStates(document)
  }
}

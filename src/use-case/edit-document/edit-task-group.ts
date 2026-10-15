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
import { documentWithTableViewsKept } from './edit-document-settings'
import { createTaskGroup, setTaskGroupName } from './task-group-naming'
import { resetTaskGroupColor, setTaskGroupColor, setTaskGroupMinHeightPx } from './task-group-look'
import { resetTaskGroupTreeStates, setTaskGroupTreeState } from './task-group-folding'
import { moveTaskGroup, reorderTaskGroupSiblings } from './task-group-order'
import { pastedCopyOf } from './task-plan-actual'
import { copiedTask, withInferredCopyParents } from './task-paste'

export { tasksRankedByTheTaskGroupTree } from './task-group-order'

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, TaskGroupCommand).
// see T-108
export type TaskGroupCommand =
  | {
      readonly kind: 'createTaskGroup'
      readonly id: TaskGroup['id']
      readonly parentId: TaskGroup['parentId']
      readonly label: TaskGroup['name']
      readonly derivedFromTaskUid: TaskGroup['derivedFromTaskUid']
      readonly order: TaskGroup['order']
    }
  | {
      readonly kind: 'deleteTaskGroup'
      readonly taskGroupId: TaskGroup['id']
      readonly newTaskGroupId: string
    }
  | {
      readonly kind: 'pasteTaskGroupSubtree'
      readonly sourceTaskGroupId: TaskGroup['id']
      readonly targetTaskGroupId: TaskGroup['parentId']
      readonly newTaskGroupIds: Readonly<Record<string, string>>
    }
  | {
      readonly kind: 'setTaskGroupName'
      readonly taskGroupId: TaskGroup['id']
      readonly label: TaskGroup['name']
    }
  | {
      readonly kind: 'setTaskGroupColor'
      readonly taskGroupId: TaskGroup['id']
      readonly color: NonNullable<TaskGroup['color']>
    }
  | { readonly kind: 'resetTaskGroupColor'; readonly taskGroupId: TaskGroup['id'] }
  | {
      readonly kind: 'setTaskGroupMinHeightPx'
      readonly taskGroupId: TaskGroup['id']
      readonly minHeight: TaskGroup['minHeightPx']
    }
  | {
      readonly kind: 'reorderTaskGroupSiblings'
      readonly parentId: TaskGroup['parentId']
      readonly orderedIds: readonly TaskGroup['id'][]
    }
  | { readonly kind: 'resetTaskGroupTreeStates' }
  | {
      readonly kind: 'moveTaskGroup'
      readonly taskGroupId: TaskGroup['id']
      readonly parentId: TaskGroup['parentId']
      readonly order: TaskGroup['order']
    }
  | {
      readonly kind: 'setTaskGroupTreeState'
      readonly taskGroupId: TaskGroup['id']
      readonly treeState: TaskGroup['treeState']
    }
// </generated>

export type TaskGroupCommandOf<K extends TaskGroupCommand['kind']> = Extract<
  TaskGroupCommand,
  { readonly kind: K }
>

/** @purity pure */
export function withScheduleParts(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/** @purity pure */
export function withTaskGroup(document: Document, taskGroup: TaskGroup): Document {
  return withScheduleParts(document, {
    taskGroups: document.schedule.taskGroups.map((one) => (one.id === taskGroup.id ? taskGroup : one)),
  })
}

/** @purity pure */
export function depthOf(byId: ReadonlyMap<string, TaskGroup>, taskGroup: TaskGroup): number {
  let depth = 1
  let foundAt = taskGroup.parentId
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}

export interface Subtree {
  readonly taskGroups: readonly TaskGroup[]
  readonly height: number
}

/** @purity pure */
export function subtreeOf(groups: readonly TaskGroup[], rootId: string): Subtree | null {
  const root = groups.find((one) => one.id === rootId)
  if (root === undefined) return null
  const taskGroups: TaskGroup[] = []
  const seen = new Set<string>()
  let level: readonly TaskGroup[] = [root]
  let height = 0
  while (level.length > 0) {
    height += 1
    for (const one of level) {
      taskGroups.push(one)
      seen.add(one.id)
    }
    const above = level
    level = groups.filter((one) => !seen.has(one.id) && above.some((up) => up.id === one.parentId))
  }
  return { taskGroups, height }
}

// see CD-1, DU-1, IV-4
// WHY: a sweep, not a recursion, because task groups arrive in no parent-before-child order.
/** @purity pure */
export function wbsSubtreesOf(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.parentTaskUid === null || held.has(task.uid)) continue
      if (held.has(task.parentTaskUid)) {
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
export function settledTaskGroup(schedule: Schedule, taskGroup: TaskGroup, defaultTaskGroupName: string): TaskGroup {
  const source = taskGroup.derivedFromTaskUid === null ? null : taskByUid(schedule, taskGroup.derivedFromTaskUid)
  return { ...taskGroup, name: taskGroup.name ?? source?.name ?? defaultTaskGroupName, derivedFromTaskUid: null }
}

type PastePlan =
  | { readonly ok: false; readonly refusals: readonly Refusal[] }
  | { readonly ok: true; readonly copied: Subtree; readonly idOf: ReadonlyMap<string, string> }

// see CM-28, FR-033, FR-004, AT-51, IV-1, IV-2
/** @purity pure */
function pastePlanOf(
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  byId: ReadonlyMap<string, TaskGroup>,
  groups: readonly TaskGroup[],
): PastePlan {
  const copied = subtreeOf(groups, command.sourceTaskGroupId)
  if (copied === null) {
    return { ok: false, refusals: [reject('CM-28', 'IV-2', `no such task group: ${command.sourceTaskGroupId}`)] }
  }
  const target = command.targetTaskGroupId === null ? null : byId.get(command.targetTaskGroupId)
  if (target === undefined) {
    return { ok: false, refusals: [reject('CM-28', 'IV-2', `no such task group to paste under: ${command.targetTaskGroupId}`)] }
  }
  const refusals: Refusal[] = []
  const under = target === null ? 0 : depthOf(byId, target)
  if (under + copied.height > SETTINGS_CONSTANTS.maxGroupDepth) {
    const reached = `the copy would reach depth ${under + copied.height}`
    refusals.push(reject('CM-28', 'FR-033', `${reached}, past S-125's ${SETTINGS_CONSTANTS.maxGroupDepth}`))
  }
  const idOf = new Map<string, string>()
  const taken = new Set<string>()
  for (const taskGroup of copied.taskGroups) {
    const fresh = command.newTaskGroupIds[taskGroup.id]
    if (fresh === undefined) {
      refusals.push(reject('CM-28', 'AT-51', `no new id was given for the copy of ${taskGroup.id}`))
    } else if (byId.has(fresh) || taken.has(fresh)) {
      refusals.push(reject('CM-28', 'IV-1', `the id ${fresh} is already in use`))
    } else {
      taken.add(fresh)
      idOf.set(taskGroup.id, fresh)
    }
  }
  return refusals.length > 0 ? { ok: false, refusals } : { ok: true, copied, idOf }
}

// see DU-2, HM-12
// WHY: the copied task group follows its Task's copy, or settles its name, so moving the copy never moves the original Task.
/** @purity pure */
function copiedTaskGroupOf(
  schedule: Schedule,
  taskGroup: TaskGroup,
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  idOf: ReadonlyMap<string, string>,
  uidOf: ReadonlyMap<number, number>,
  defaultTaskGroupName: string,
): TaskGroup {
  const parentId =
    taskGroup.id === command.sourceTaskGroupId
      ? command.targetTaskGroupId
      : taskGroup.parentId === null
        ? null
        : (idOf.get(taskGroup.parentId) ?? taskGroup.parentId)
  const pasted = { ...taskGroup, id: idOf.get(taskGroup.id) as string, parentId, treeState: pastedTreeState(taskGroup.treeState) }
  if (taskGroup.derivedFromTaskUid === null) return pasted
  const copy = uidOf.get(taskGroup.derivedFromTaskUid)
  return copy === undefined ? settledTaskGroup(schedule, pasted, defaultTaskGroupName) : { ...pasted, derivedFromTaskUid: copy }
}

// see CM-28, FR-033, DU-1, DU-2
// WHY: only the Tasks on the copied task groups; a WBS descendant on another task group is not copied, and no paste is refused.
/** @purity pure */
function pasteTaskGroupSubtree(
  document: Document,
  command: TaskGroupCommandOf<'pasteTaskGroupSubtree'>,
  byId: ReadonlyMap<string, TaskGroup>,
  defaultTaskGroupName: string,
): EditResult {
  const schedule = document.schedule
  const plan = pastePlanOf(command, byId, schedule.taskGroups)
  if (!plan.ok) return refused([...plan.refusals])
  const copiedTaskGroups = new Set(plan.copied.taskGroups.map((one) => one.id))
  const riders = schedule.taskGroupMembers.filter((member) => copiedTaskGroups.has(member.taskGroupId))

  let mark = schedule.project.uidHighWaterMark
  const uidOf = new Map<number, number>()
  // TRAP: sorted, so the same paste mints the same uids.
  for (const uid of [...new Set(riders.map((one) => one.taskUid))].sort((a, b) => a - b)) uidOf.set(uid, ++mark)

  const sources = schedule.tasks.filter((one) => uidOf.has(one.uid))
  const chosen = new Set(uidOf.keys())
  const paired = sources.map((one) => pastedCopyOf(copiedTask(one, chosen, uidOf), schedule, workingCalendarOf(schedule)))
  const after: Schedule = {
    ...schedule,
    taskGroups: [...schedule.taskGroups, ...plan.copied.taskGroups.map((taskGroup) =>
      copiedTaskGroupOf(schedule, taskGroup, command, plan.idOf, uidOf, defaultTaskGroupName))],
    tasks: [...schedule.tasks, ...paired],
    taskGroupMembers: [...schedule.taskGroupMembers, ...riders.map((one) =>
      ({ ...one, taskUid: uidOf.get(one.taskUid) as number, taskGroupId: plan.idOf.get(one.taskGroupId) as string }))],
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
  return edited(withScheduleParts(document, {
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
  defaultTaskGroupName: string,
  groupDepthCap?: number,
): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const groups = schedule.taskGroups
  const byId = new Map(groups.map((one) => [one.id, one]))

  switch (command.kind) {
    case 'createTaskGroup':
      return createTaskGroup(document, command, byId)

    case 'deleteTaskGroup': {
      const doomed = subtreeOf(groups, command.taskGroupId)
      if (doomed === null) {
        return refused([reject('CM-27', 'FR-032', `no such task group: ${command.taskGroupId}`)])
      }
      const doomedTaskGroups = new Set(doomed.taskGroups.map((one) => one.id))
      const seeds = schedule.taskGroupMembers
        .filter((member) => doomedTaskGroups.has(member.taskGroupId))
        .map((member) => member.taskUid)
      const doomedTasks = wbsSubtreesOf(schedule.tasks, seeds)

      const kept: TaskGroup[] = []
      for (const taskGroup of groups) {
        if (doomedTaskGroups.has(taskGroup.id)) continue
        if (taskGroup.derivedFromTaskUid === null || !doomedTasks.has(taskGroup.derivedFromTaskUid)) {
          kept.push(taskGroup)
          continue
        }
        // WHY: settles a name rather than refusing, which would block deleting a nameless Task.
        kept.push(settledTaskGroup(schedule, taskGroup, defaultTaskGroupName))
      }

      const survivors = schedule.tasks
        .filter((task) => !doomedTasks.has(task.uid))
        .map((task) => {
          const held = task.dependencies.filter((one) => !doomedTasks.has(one.predecessorUid))
          return held.length === task.dependencies.length ? task : { ...task, dependencies: held }
        })

      const pinned = settings.pinnedTaskGroupIds.filter((one) => !doomedTaskGroups.has(one))
      const scrollTaskGroupId =
        settings.scrollTaskGroupId !== null && doomedTaskGroups.has(settings.scrollTaskGroupId)
          ? null
          : settings.scrollTaskGroupId
      const documentSettings =
        pinned.length !== settings.pinnedTaskGroupIds.length || scrollTaskGroupId !== settings.scrollTaskGroupId
          ? { ...settings, pinnedTaskGroupIds: pinned, scrollTaskGroupId }
          : settings

      // WHY: baselineTasks match by uid rather than by reference, and resources are kept.
      return edited(documentWithTableViewsKept({
        ...document,
        schedule: {
          ...schedule,
          taskGroups: kept,
          tasks: survivors,
          taskGroupMembers: schedule.taskGroupMembers.filter(
            (one) => !doomedTasks.has(one.taskUid) && !doomedTaskGroups.has(one.taskGroupId),
          ),
          taskVisuals: schedule.taskVisuals.filter((one) => !doomedTasks.has(one.taskUid)),
          taskOrigins: schedule.taskOrigins.filter((one) => !doomedTasks.has(one.taskUid)),
          assignments: schedule.assignments.filter(
            (one) => one.taskUid === null || !doomedTasks.has(one.taskUid),
          ),
          commentBoxes: schedule.commentBoxes.filter(
            (one) => one.anchorTaskGroupId === null || !doomedTaskGroups.has(one.anchorTaskGroupId),
          ),
          highlightBoxes: schedule.highlightBoxes.filter(
            (one) =>
              !(one.topTaskGroupId !== null && doomedTaskGroups.has(one.topTaskGroupId)) &&
              !(one.bottomTaskGroupId !== null && doomedTaskGroups.has(one.bottomTaskGroupId)),
          ),
        },
        documentSettings,
      }))
    }

    case 'pasteTaskGroupSubtree':
      return pasteTaskGroupSubtree(document, command, byId, defaultTaskGroupName)

    case 'setTaskGroupName':
      return setTaskGroupName(document, command, byId)
    case 'setTaskGroupColor':
      return setTaskGroupColor(document, command, byId)
    case 'resetTaskGroupColor':
      return resetTaskGroupColor(document, command, byId)
    case 'setTaskGroupMinHeightPx':
      return setTaskGroupMinHeightPx(document, command, byId)
    case 'setTaskGroupTreeState':
      return setTaskGroupTreeState(document, command, byId)
    case 'reorderTaskGroupSiblings':
      return reorderTaskGroupSiblings(document, command, byId)
    case 'moveTaskGroup':
      return moveTaskGroup(document, command, byId, groupDepthCap)
    case 'resetTaskGroupTreeStates':
      return resetTaskGroupTreeStates(document)
  }
}

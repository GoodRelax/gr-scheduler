// InputCommandTranslator -- the row fold, open, hide and add entrances (T-015, T-051, T-328).
// @unit      UF-96   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  keptInViewByTreeState,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import { DEFAULT_TASK_GROUP_NAME } from '../screen-renderer/screen-renderer'
import {
  levelZeroWritesFor,
  treeStateWritesFor,
  type DocumentCommand,
  type TreeStateEvent,
} from '../../use-case/edit-document/edit-document'
import {
  CONSUMED_ELSEWHERE,
  ENTRY,
  acted,
  changed,
  changedAndCreated,
  foldsOrNothing,
  nothingToDo,
  taskGroupDepthOfGroup,
  type InputContext,
  type TranslatedInput,
} from './input-command-translator'
import { zoomOnScreen } from './zoom-and-fit'

// see IC-74, HF-10, T-328
/** @purity pure */
export function commandFromRowExpanderOpenAll(context: InputContext): TranslatedInput {
  // TRAP: judged here, not by the write: opening nothing is silent, and FR-029 wants the reason told.
  if (!isEveryTaskGroupOpenArmed(context)) return nothingToDo('noFoldedTaskGroupAtAll')
  return foldsOrNothing(treeWritesOf(context, { type: 'everyTaskGroupOpenPressed' }), 'noFoldedTaskGroupAtAll')
}

// see IC-78, HF-12, T-328
/** @purity pure */
export function commandFromRowExpanderCloseAll(context: InputContext): TranslatedInput {
  if (isLevelZeroCollapsedIn(context) || !isATaskGroupOfTheShallowestLevelDrawn(context)) {
    return nothingToDo('noUnfoldedTaskGroupAtAll')
  }
  return foldsOrNothing(treeWritesOf(context, { type: 'everyTaskGroupFoldPressed' }), 'noUnfoldedTaskGroupAtAll')
}

// see IC-92, HF-16, T-328
/** @purity pure */
export function commandFromRowExpanderOpenLevelZero(context: InputContext): TranslatedInput {
  const hasAHiddenTopTaskGroup = context.document.schedule.taskGroups.some(
    (taskGroup) => taskGroup.parentId === null && taskGroup.treeState === 'hidden',
  )
  if (!isLevelZeroCollapsedIn(context) && !hasAHiddenTopTaskGroup) return nothingToDo(null)
  return foldsOrNothing(treeWritesOf(context, { type: 'topLevelOpenPressed' }), null)
}

// see IC-58, IC-59, IC-60, IC-77, IC-82, IC-90, IC-91, T-328
/** @purity pure */
export function commandFromRowEntry(
  entry: string,
  taskGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  if (taskGroupId === null) return CONSUMED_ELSEWHERE

  if (entry === ENTRY.taskGroupPin) {
    // TRAP: read the document, not the drawn row: against a stale picture the pin never comes off.
    const isPinned = context.document.documentSettings.pinnedGroupIds.includes(taskGroupId)
    return changed([
      isPinned
        ? { kind: 'unpinTaskGroup', groupId: taskGroupId }
        : { kind: 'pinTaskGroup', groupId: taskGroupId },
    ])
  }

  if (entry === ENTRY.taskGroupDelete) return taskGroupDeleted(context, taskGroupId)

  if (entry === ENTRY.taskGroupExpanderCloseBelow) {
    if (hasADrawnChild(context, taskGroupId) === false) {
      return nothingToDo('noUnfoldedTaskGroupBelow')
    }
    return foldsOrNothing(
      treeWritesOf(context, { type: 'allBelowFoldPressed', pressedRowId: taskGroupId }),
      'noUnfoldedTaskGroupBelow',
    )
  }

  if (entry === ENTRY.taskGroupExpanderOpenOneLevel) {
    if (!isOpenOneLevelArmed(context, taskGroupId)) return nothingToDo('taskGroupIsOpenWithNoHiddenChild')
    return foldsOrNothing(
      treeWritesOf(context, { type: 'oneLevelOpenPressed', pressedRowId: taskGroupId }),
      'taskGroupIsOpenWithNoHiddenChild',
    )
  }

  if (entry === ENTRY.taskGroupAddChild) {
    const parentDepth = taskGroupDepthOfGroup(context, taskGroupId)
    if (parentDepth >= SETTINGS_CONSTANTS.maxGroupDepth) {
      return nothingToDo('taskGroupIsAtTheDeepestLevel')
    }
    return taskGroupStoodUp(context, taskGroupId)
  }

  if (entry === ENTRY.taskGroupExpanderOpen) {
    if (!isOpenAllBelowArmed(context, taskGroupId)) return nothingToDo('noFoldedTaskGroupBelow')
    return foldsOrNothing(
      treeWritesOf(context, { type: 'allBelowOpenPressed', pressedRowId: taskGroupId }),
      'noFoldedTaskGroupBelow',
    )
  }

  const taskGroup = context.document.schedule.taskGroups.find((one) => one.id === taskGroupId)
  if (taskGroup === undefined || taskGroup.treeState === 'hidden') return nothingToDo(null)
  return changed(treeWritesOf(context, { type: 'hidePressed', pressedRowId: taskGroupId }))
}

// see CM-27, T-050
// WHY: the fresh id rides on every delete; only the use case knows the rows would run out.
/** @purity pure */
function taskGroupDeleted(context: InputContext, taskGroupId: string): TranslatedInput {
  return changed([{ kind: 'deleteTaskGroup', groupId: taskGroupId, newGroupId: context.newGroupId }])
}

// see HF-20, CD-6, IC-106, T-328
// WHY: CM-27 once per top row in one bundle: one undo unit, and the row rule of T-050 sees the last go.
// WHY: the same bundle opens level zero (everyTaskGroupDeletePressed), so the one row T-050 leaves is drawn.
/** @purity pure */
export function everyTaskGroupDeleted(context: InputContext): TranslatedInput {
  const newGroupId = context.newGroupId
  const document = context.document
  const deletes: DocumentCommand[] = document.schedule.taskGroups
    .filter((taskGroup) => taskGroup.parentId === null)
    .map((taskGroup) => ({ kind: 'deleteTaskGroup', groupId: taskGroup.id, newGroupId }))
  if (deletes.length === 0) return CONSUMED_ELSEWHERE
  const writes: DocumentCommand[] = [
    ...deletes,
    ...levelZeroWritesFor(document.documentSettings.levelZeroTreeState, { type: 'everyTaskGroupDeletePressed' }),
  ]
  return acted({ kind: 'changeDocument', writes: [writes], question: 'QN-10' })
}

/** @purity pure */
export function treeWritesOf(context: InputContext, event: TreeStateEvent): readonly DocumentCommand[] {
  const document = context.document
  return [
    ...treeStateWritesFor(document.schedule, event),
    ...levelZeroWritesFor(document.documentSettings.levelZeroTreeState, event),
  ]
}

/** @purity pure */
function isLevelZeroCollapsedIn(context: InputContext): boolean {
  return context.document.documentSettings.levelZeroTreeState === 'collapsed'
}

/** @purity pure */
function placedRowIdsOf(context: InputContext): ReadonlySet<string> {
  return new Set(context.layout.taskGroups.map((taskGroup) => taskGroup.groupId))
}

// TRAP: task-group-panel.ts arms IC-74, IC-58 and IC-90 by these three same tests; change both together.
/** @purity pure */
function isEveryTaskGroupOpenArmed(context: InputContext): boolean {
  const placed = placedRowIdsOf(context)
  return context.document.schedule.taskGroups.some((taskGroup) => !placed.has(taskGroup.id))
}

// see IC-58, HF-2, RS-28, T-329
/** @purity pure */
function isOpenAllBelowArmed(context: InputContext, taskGroupId: string): boolean {
  const placed = placedRowIdsOf(context)
  if (!placed.has(taskGroupId)) return false
  const schedule = context.document.schedule
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  return schedule.taskGroups.some(
    (taskGroup) => !placed.has(taskGroup.id) && isTaskGroupUnder(parentOf, taskGroup.parentId, taskGroupId),
  )
}

// see IC-90, HF-13, RS-30, T-329
/** @purity pure */
function isOpenOneLevelArmed(context: InputContext, taskGroupId: string): boolean {
  const placedTaskGroups = context.layout.taskGroups
  const placed = placedRowIdsOf(context)
  if (!placed.has(taskGroupId)) return false
  const settings = context.document.documentSettings
  const schedule = context.document.schedule
  const on = zoomOnScreen(context)
  const depthLimit = groupDepthLimit(drawnSettingsOf({ ...settings, zoomX: on.x, zoomY: on.y }))
  const pinned = new Set(settings.pinnedGroupIds)
  const byId = new Map(schedule.taskGroups.map((one) => [one.id, one]))
  const placedGroups = [...placed].flatMap((id) => byId.get(id) ?? [])
  const keptByExpanded = keptInViewByTreeState(placedGroups, 'expandedOnly')
  const depthOf = new Map(placedTaskGroups.map((taskGroup) => [taskGroup.groupId, taskGroup.depth] as const))
  return schedule.taskGroups.some((child) => {
    if (child.parentId !== taskGroupId) return false
    const depth = depthOf.get(child.id)
    if (depth === undefined) return true
    const isDrawnWithoutTemporary =
      depth <= depthLimit || pinned.has(child.id) || keptByExpanded.has(child.id)
    return !isDrawnWithoutTemporary
  })
}

// see HF-14
/** @purity pure */
function orderPastLastChild(schedule: Schedule, parentGroupId: string | null): number {
  // TRAP: one past the largest order, not the child count: orders may have gaps (AT-55).
  let lastOrder: number | null = null
  for (const taskGroup of schedule.taskGroups) {
    if (taskGroup.parentId !== parentGroupId) continue
    if (lastOrder === null || taskGroup.order > lastOrder) lastOrder = taskGroup.order
  }
  return lastOrder === null ? 0 : lastOrder + 1
}

// see HF-14, HF-17, T-328, AT-153
// WHY: the new row is shown by its tree state (temporarilyExpanded, CM-26), never by a zoom write (HF-14).
/** @purity pure */
export function taskGroupStoodUp(context: InputContext, parentGroupId: string | null): TranslatedInput {
  const newGroupId = context.newGroupId
  // TRAP: keep the tree state writes in the row's bundle; a bundle of their own is a second undo step.
  return changedAndCreated(
    [
      [
        ...treeWritesOf(context, { type: 'childTaskGroupAddPressed', pressedRowId: parentGroupId }),
        {
          kind: 'createTaskGroup',
          id: newGroupId,
          parentId: parentGroupId,
          label: DEFAULT_TASK_GROUP_NAME,
          derivedFromTaskUid: null,
          order: orderPastLastChild(context.document.schedule, parentGroupId),
        } as const,
      ],
    ],
    { kind: 'row', groupId: newGroupId },
  )
}

/** @purity pure */
function hasADrawnChild(context: InputContext, taskGroupId: string): boolean | null {
  const drawnIds = context.drawnTaskGroupIds
  if (drawnIds === undefined) return null
  const drawn = new Set(drawnIds)
  if (!drawn.has(taskGroupId)) return false
  // TRAP: must stay the set `task-group-panel.ts` builds as `groupIdsWithDrawnChildren`.
  return context.document.schedule.taskGroups.some(
    (taskGroup) => taskGroup.parentId === taskGroupId && drawn.has(taskGroup.id),
  )
}

/** @purity pure */
function isATaskGroupOfTheShallowestLevelDrawn(context: InputContext): boolean {
  const rootTaskGroups = context.document.schedule.taskGroups.filter((taskGroup) => taskGroup.parentId === null)
  const drawnIds = context.drawnTaskGroupIds
  if (drawnIds === undefined) return rootTaskGroups.some((taskGroup) => taskGroup.treeState !== 'hidden')
  const drawn = new Set(drawnIds)
  return rootTaskGroups.some((taskGroup) => drawn.has(taskGroup.id))
}

/** @purity pure */
function isTaskGroupUnder(
  parentOf: ReadonlyMap<string, string | null>,
  parentId: string | null,
  ancestorId: string,
): boolean {
  const climbed = new Set<string>()
  let at = parentId
  while (at !== null && !climbed.has(at)) {
    if (at === ancestorId) return true
    climbed.add(at)
    at = parentOf.get(at) ?? null
  }
  return false
}

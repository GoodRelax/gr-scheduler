// InputCommandTranslator -- the row fold, open, hide and add entrances (T-015, T-051, T-328).
// @unit      UF-96   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import type { Schedule } from '../../entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  groupDepthThresholdOf,
  keptInViewByTreeState,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import { DEFAULT_ROW_NAME } from '../screen-renderer/screen-renderer'
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
  rowDepthOfGroup,
  type InputContext,
  type TranslatedInput,
} from './input-command-translator'
import { zoomOnScreen } from './zoom-and-fit'

// see IC-74, HF-10, T-328
/** @purity pure */
export function commandFromRowExpanderOpenAll(context: InputContext): TranslatedInput {
  // TRAP: judged here, not by the write: opening nothing is silent, and FR-029 wants the reason told.
  if (!isEveryRowOpenArmed(context)) return nothingToDo('noFoldedRowAtAll')
  return foldsOrNothing(treeWritesOf(context, { type: 'everyRowOpenPressed' }), 'noFoldedRowAtAll')
}

// see IC-78, HF-12, T-328
/** @purity pure */
export function commandFromRowExpanderCloseAll(context: InputContext): TranslatedInput {
  if (isLevelZeroCollapsedIn(context) || !isARowOfTheShallowestLevelDrawn(context)) {
    return nothingToDo('noUnfoldedRowAtAll')
  }
  return foldsOrNothing(treeWritesOf(context, { type: 'everyRowFoldPressed' }), 'noUnfoldedRowAtAll')
}

// see IC-92, HF-16, T-328
/** @purity pure */
export function commandFromRowExpanderOpenLevelZero(context: InputContext): TranslatedInput {
  const hasAHiddenTopRow = context.document.schedule.taskGroups.some(
    (row) => row.parentId === null && row.treeState === 'hidden',
  )
  if (!isLevelZeroCollapsedIn(context) && !hasAHiddenTopRow) return nothingToDo(null)
  return foldsOrNothing(treeWritesOf(context, { type: 'topLevelOpenPressed' }), null)
}

// see IC-58, IC-59, IC-60, IC-77, IC-82, IC-90, IC-91, T-328
/** @purity pure */
export function commandFromRowEntry(
  entry: string,
  rowGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  if (rowGroupId === null) return CONSUMED_ELSEWHERE

  if (entry === ENTRY.rowPin) {
    // TRAP: read the document, not the drawn row: against a stale picture the pin never comes off.
    const isPinned = context.document.documentSettings.pinnedGroupIds.includes(rowGroupId)
    return changed([
      isPinned
        ? { kind: 'unpinTaskGroup', groupId: rowGroupId }
        : { kind: 'pinTaskGroup', groupId: rowGroupId },
    ])
  }

  if (entry === ENTRY.rowDelete) return rowDeleted(context, rowGroupId)

  if (entry === ENTRY.rowExpanderCloseBelow) {
    if (hasADrawnChild(context, rowGroupId) === false) {
      return nothingToDo('noUnfoldedRowBelow')
    }
    return foldsOrNothing(
      treeWritesOf(context, { type: 'allBelowFoldPressed', pressedRowId: rowGroupId }),
      'noUnfoldedRowBelow',
    )
  }

  if (entry === ENTRY.rowExpanderOpenOneLevel) {
    if (!isOpenOneLevelArmed(context, rowGroupId)) return nothingToDo('rowIsOpenWithNoHiddenChild')
    return foldsOrNothing(
      treeWritesOf(context, { type: 'oneLevelOpenPressed', pressedRowId: rowGroupId }),
      'rowIsOpenWithNoHiddenChild',
    )
  }

  if (entry === ENTRY.rowAddChild) {
    const parentDepth = rowDepthOfGroup(context, rowGroupId)
    if (parentDepth >= context.document.documentSettings.maxGroupDepth) {
      return nothingToDo('rowIsAtTheDeepestLevel')
    }
    return rowStoodUp(context, rowGroupId, parentDepth + 1)
  }

  if (entry === ENTRY.rowExpanderOpen) {
    if (!isOpenAllBelowArmed(context, rowGroupId)) return nothingToDo('noFoldedRowBelow')
    return foldsOrNothing(
      treeWritesOf(context, { type: 'allBelowOpenPressed', pressedRowId: rowGroupId }),
      'noFoldedRowBelow',
    )
  }

  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  if (row === undefined || row.treeState === 'hidden') return nothingToDo(null)
  return changed(treeWritesOf(context, { type: 'hidePressed', pressedRowId: rowGroupId }))
}

// see CM-27, T-050
// WHY: the fresh id rides on every delete; only the use case knows the rows would run out.
/** @purity pure */
function rowDeleted(context: InputContext, rowGroupId: string): TranslatedInput {
  return changed([{ kind: 'deleteTaskGroup', groupId: rowGroupId, newGroupId: context.newGroupId }])
}

// see HF-20, CD-6, IC-106
// WHY: CM-27 once per top row in one bundle: one undo unit, and the row rule of T-050 sees the last go.
/** @purity pure */
export function everyRowDeleted(context: InputContext): TranslatedInput {
  const newGroupId = context.newGroupId
  const writes: DocumentCommand[] = context.document.schedule.taskGroups
    .filter((row) => row.parentId === null)
    .map((row) => ({ kind: 'deleteTaskGroup', groupId: row.id, newGroupId }))
  if (writes.length === 0) return CONSUMED_ELSEWHERE
  return acted({ kind: 'changeDocument', writes: [writes], question: 'QN-10' })
}

/** @purity pure */
function treeWritesOf(context: InputContext, event: TreeStateEvent): readonly DocumentCommand[] {
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
  return new Set(context.layout.rows.map((row) => row.groupId))
}

// TRAP: row-title-panel.ts arms IC-74, IC-58 and IC-90 by these three same tests; change both together.
/** @purity pure */
function isEveryRowOpenArmed(context: InputContext): boolean {
  const placed = placedRowIdsOf(context)
  return context.document.schedule.taskGroups.some((row) => !placed.has(row.id))
}

// see IC-58, HF-2, RS-28, T-329
/** @purity pure */
function isOpenAllBelowArmed(context: InputContext, rowGroupId: string): boolean {
  const placed = placedRowIdsOf(context)
  if (!placed.has(rowGroupId)) return false
  const schedule = context.document.schedule
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  return schedule.taskGroups.some(
    (row) => !placed.has(row.id) && isRowUnder(parentOf, row.parentId, rowGroupId),
  )
}

// see IC-90, HF-13, RS-30, T-329
/** @purity pure */
function isOpenOneLevelArmed(context: InputContext, rowGroupId: string): boolean {
  const placedRows = context.layout.rows
  const placed = placedRowIdsOf(context)
  if (!placed.has(rowGroupId)) return false
  const settings = context.document.documentSettings
  const schedule = context.document.schedule
  const on = zoomOnScreen(context)
  const depthLimit = groupDepthLimit(drawnSettingsOf({ ...settings, zoomX: on.x, zoomY: on.y }))
  const pinned = new Set(settings.pinnedGroupIds)
  const byId = new Map(schedule.taskGroups.map((one) => [one.id, one]))
  const placedGroups = [...placed].flatMap((id) => byId.get(id) ?? [])
  const keptByExpanded = keptInViewByTreeState(placedGroups, 'expandedOnly')
  const depthOf = new Map(placedRows.map((row) => [row.groupId, row.depth] as const))
  return schedule.taskGroups.some((child) => {
    if (child.parentId !== rowGroupId) return false
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
  for (const row of schedule.taskGroups) {
    if (row.parentId !== parentGroupId) continue
    if (lastOrder === null || row.order > lastOrder) lastOrder = row.order
  }
  return lastOrder === null ? 0 : lastOrder + 1
}

// see HF-14, HF-17, T-328
/** @purity pure */
export function rowStoodUp(
  context: InputContext,
  parentGroupId: string | null,
  depth: number,
): TranslatedInput {
  const settings = context.document.documentSettings
  const opensTier = depth > groupDepthLimit(settings)
  const newGroupId = context.newGroupId
  // TRAP: keep the tree state writes in the row's bundle; a bundle of their own is a second undo step.
  return changedAndCreated(
    [
      opensTier
        ? [
            {
              kind: 'setZoom',
              zoomX: settings.zoomX,
              // TRAP: only `groupDepthThresholdOf`; any other route can differ by one ulp from `groupDepthLimit`.
              zoomY: groupDepthThresholdOf(depth, settings),
            } as const,
          ]
        : [],
      [
        ...treeWritesOf(context, { type: 'childRowAddPressed', pressedRowId: parentGroupId }),
        {
          kind: 'createTaskGroup',
          id: newGroupId,
          parentId: parentGroupId,
          label: DEFAULT_ROW_NAME,
          derivedFromTaskUid: null,
          order: orderPastLastChild(context.document.schedule, parentGroupId),
        } as const,
      ],
    ],
    { kind: 'row', groupId: newGroupId },
  )
}

/** @purity pure */
function hasADrawnChild(context: InputContext, rowGroupId: string): boolean | null {
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return null
  const drawn = new Set(drawnIds)
  if (!drawn.has(rowGroupId)) return false
  // TRAP: must stay the set `row-title-panel.ts` builds as `groupIdsWithDrawnChildren`.
  return context.document.schedule.taskGroups.some(
    (row) => row.parentId === rowGroupId && drawn.has(row.id),
  )
}

/** @purity pure */
function isARowOfTheShallowestLevelDrawn(context: InputContext): boolean {
  const rootRows = context.document.schedule.taskGroups.filter((row) => row.parentId === null)
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return rootRows.some((row) => row.treeState !== 'hidden')
  const drawn = new Set(drawnIds)
  return rootRows.some((row) => drawn.has(row.id))
}

/** @purity pure */
function isRowUnder(
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

// InputCommandTranslator -- the row fold, open, hide and add entrances (T-015, T-051, T-254).
// @unit      UF-96   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import type { Schedule } from '../../entity/document-model/schedule/schedule'
import {
  groupDepthLimit,
  groupDepthThresholdOf,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { DEFAULT_ROW_NAME } from '../screen-renderer/screen-renderer'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
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

// see IC-74, HF-10, KO-3
/** @purity pure */
export function commandFromRowExpanderOpenAll(context: InputContext): TranslatedInput {
  const rows = context.document.schedule.taskGroups
  // TRAP: judged here, not by the write: opening nothing is silent, and FR-029 wants the reason told.
  // A kept-open mark alone arms it, since the press takes every mark off.
  if (
    !(
      context.isLevelZeroFolded === true ||
      rows.some((row) => row.isKeptOpen) ||
      (wouldMoveARow(context, null, 'open') ??
        rows.some((row) => row.isCollapsed === true || row.isHidden === true))
    )
  ) {
    return nothingToDo('noFoldedRowAtAll')
  }
  // WHY: no mark write of its own: CM-72 at the head of the write takes every mark off.
  return acted({
    kind: 'setLevelZeroFolded',
    isFolded: false,
    writes: [{ kind: 'expandAllTaskGroups' }, ...unhidesEveryRow(context.document.schedule)],
  })
}

// see IC-78
/** @purity pure */
export function commandFromRowExpanderCloseAll(context: InputContext): TranslatedInput {
  if (
    context.isLevelZeroFolded === true ||
    isARowOfTheShallowestLevelDrawn(context) === false
  ) {
    return nothingToDo('noUnfoldedRowAtAll')
  }
  return acted({
    kind: 'setLevelZeroFolded',
    isFolded: true,
    writes: [
      ...foldsEveryRow(context.document.schedule),
      ...keptOpenMarksWritten(context.document.schedule, null, false),
    ],
  })
}

// see IC-92
/** @purity pure */
export function commandFromRowExpanderOpenLevelZero(context: InputContext): TranslatedInput {
  const unhidden = opensLevelZeroHiddenRows(context.document.schedule)
  if (context.isLevelZeroFolded !== true && unhidden.length === 0) {
    return nothingToDo(null)
  }
  return acted({ kind: 'setLevelZeroFolded', isFolded: false, writes: unhidden })
}

// see IC-58, IC-59, IC-60, IC-77, IC-82, IC-90, IC-91
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
    if (wouldMoveARow(context, rowGroupId, 'fold') === false) {
      return nothingToDo('noUnfoldedRowBelow')
    }
    return foldsOrNothing(
      withKeptOpenMarks(
        foldsRowAndBelow(context.document.schedule, rowGroupId),
        keptOpenMarksWritten(context.document.schedule, rowGroupId, false),
      ),
      'noUnfoldedRowBelow',
    )
  }

  if (entry === ENTRY.rowExpanderOpenOneLevel) {
    const opensAChild = wouldMoveARow(context, rowGroupId, 'openOneLevel')
    if (opensAChild === false) {
      return nothingToDo('rowIsOpenWithNoHiddenChild')
    }
    const opens = opensRowAndUnhidesItsChildren(context.document.schedule, rowGroupId)
    const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
    const marks: readonly DocumentCommand[] = row === undefined || row.isKeptOpen
      ? []
      : [{ kind: 'setTaskGroupKeptOpen', groupId: rowGroupId, keptOpen: true }]
    const pressDraws = opens.length > 0 || (opensAChild ?? hasAChildBelowTheDepthLimit(context, rowGroupId))
    return foldsOrNothing(pressDraws ? [...opens, ...marks] : [], 'rowIsOpenWithNoHiddenChild')
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
      [
        ...opensRowAndBelow(context.document.schedule, rowGroupId),
        ...pressedRowMarkedAndBelowCleared(context.document.schedule, rowGroupId),
      ],
      'noFoldedRowBelow',
    )
  }

  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  if (row === undefined || row.isHidden === true) return nothingToDo(null)
  return changed([
    { kind: 'setTaskGroupHidden', groupId: rowGroupId, hidden: true },
    ...foldsRowAndBelow(context.document.schedule, rowGroupId),
    ...keptOpenMarksWritten(context.document.schedule, rowGroupId, false),
  ])
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

// see T-254
/** @purity pure */
function withKeptOpenMarks(
  folds: readonly DocumentCommand[],
  marks: readonly DocumentCommand[],
): readonly DocumentCommand[] {
  return folds.length === 0 ? [] : [...folds, ...marks]
}

// see KO-2, KO-4, KO-5, KO-6
/** @purity pure */
function keptOpenMarksWritten(
  schedule: Schedule,
  rowId: string | null,
  keptOpen: boolean,
): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  return schedule.taskGroups
    .filter((row) => rowId === null || row.id === rowId || isRowUnder(parentOf, row.parentId, rowId))
    .filter((row) => (row.isKeptOpen === true) !== keptOpen)
    .map((row) => ({ kind: 'setTaskGroupKeptOpen', groupId: row.id, keptOpen }) as const)
}

// see HF-2, KO-2
// TRAP: row-title-panel.ts must arm IC-58 by this same test, or a dark [vv] answers RS-30.
/** @purity pure */
function isOpenAllBelowArmed(context: InputContext, rowGroupId: string): boolean {
  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  if (row === undefined) return false
  const schedule = context.document.schedule
  if (context.drawnRowGroupIds?.includes(rowGroupId) === false) return false
  const opens =
    wouldMoveARow(context, rowGroupId, 'open') ?? opensRowAndBelow(schedule, rowGroupId).length > 0
  if (opens) return true
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const isAMarkBelow = schedule.taskGroups.some(
    (one) => one.isKeptOpen && isRowUnder(parentOf, one.parentId, rowGroupId),
  )
  if (isAMarkBelow) return true
  if (row.isKeptOpen) return false
  return (
    wouldMoveARow(context, rowGroupId, 'openOneLevel') ??
    hasAChildBelowTheDepthLimit(context, rowGroupId)
  )
}

// see KO-2
/** @purity pure */
function pressedRowMarkedAndBelowCleared(
  schedule: Schedule,
  rowId: string,
): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    const isPressed = row.id === rowId
    if (!isPressed && !isRowUnder(parentOf, row.parentId, rowId)) continue
    if (row.isKeptOpen === isPressed) continue
    commands.push({ kind: 'setTaskGroupKeptOpen', groupId: row.id, keptOpen: isPressed })
  }
  return commands
}

// see HF-13, FR-018
/** @purity pure */
function hasAChildBelowTheDepthLimit(context: InputContext, rowGroupId: string): boolean {
  const settings = context.document.documentSettings
  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  if (row === undefined || row.isKeptOpen) return false
  if (rowDepthOfGroup(context, rowGroupId) + 1 <= groupDepthLimit(settings)) return false
  return context.document.schedule.taskGroups.some(
    (child) => child.parentId === rowGroupId && !settings.pinnedGroupIds.includes(child.id),
  )
}

// see HR-3, HF-2
/** @purity pure */
function opensRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    // TRAP: write only what changes: foldsOrNothing tells the reason only when this list is empty.
    if (row.isHidden === true) {
      commands.push({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false })
    }
    if (row.isCollapsed !== true) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: false })
  }
  return commands
}

// see HR-7, HF-13
/** @purity pure */
function opensRowAndUnhidesItsChildren(
  schedule: Schedule,
  rowId: string,
): readonly DocumentCommand[] {
  const commands: DocumentCommand[] = []
  const row = schedule.taskGroups.find((one) => one.id === rowId)
  if (row !== undefined && row.isCollapsed === true) {
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: rowId, collapsed: false })
  }
  for (const child of schedule.taskGroups) {
    if (child.parentId !== rowId) continue
    if (child.isHidden !== true) continue
    commands.push({ kind: 'setTaskGroupHidden', groupId: child.id, hidden: false })
  }
  return commands
}

// see HF-16, HR-6
/** @purity pure */
function opensLevelZeroHiddenRows(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.parentId === null && row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
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

// see HF-14
/** @purity pure */
function parentFoldTakenOff(
  schedule: Schedule,
  parentGroupId: string | null,
): readonly DocumentCommand[] {
  if (parentGroupId === null) return []
  const parent = schedule.taskGroups.find((one) => one.id === parentGroupId)
  if (parent?.isCollapsed !== true) return []
  return [{ kind: 'setTaskGroupCollapsed', groupId: parentGroupId, collapsed: false }]
}

// see HF-14, HF-17
/** @purity pure */
export function rowStoodUp(
  context: InputContext,
  parentGroupId: string | null,
  depth: number,
): TranslatedInput {
  const settings = context.document.documentSettings
  const opensTier = depth > groupDepthLimit(settings)
  const newGroupId = context.newGroupId
  // TRAP: keep the parent's fold in the row's bundle; a bundle of its own is a second undo step.
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
        ...parentFoldTakenOff(context.document.schedule, parentGroupId),
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

// see HR-4, HR-1a
/** @purity pure */
function foldsRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.isCollapsed === true) continue
    // WHY: rows under an already-folded row are written too, or they spring open when that fold comes off.
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true })
  }
  return commands
}

// see HR-3, HR-4, HR-7, RS-30
/** @purity pure */
function wouldMoveARow(
  context: InputContext,
  ancestorId: string | null,
  operation: 'open' | 'fold' | 'openOneLevel',
): boolean | null {
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return null
  const drawn = new Set(drawnIds)
  const schedule = context.document.schedule
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))

  const withDrawnChild = new Set<string>()
  const withUnhiddenChild = new Set<string>()
  // TRAP: must stay the set `row-title-panel.ts` builds as `groupIdsWithAChildOutOfThePicture`.
  const withAChildOutOfThePicture = new Set<string>()
  for (const row of schedule.taskGroups) {
    if (row.parentId === null) continue
    if (drawn.has(row.id)) withDrawnChild.add(row.parentId)
    else withAChildOutOfThePicture.add(row.parentId)
    if (row.isHidden !== true) withUnhiddenChild.add(row.parentId)
  }
  const pressedRow =
    ancestorId === null
      ? undefined
      : schedule.taskGroups.find((one) => one.id === ancestorId)

  if (ancestorId !== null && (pressedRow === undefined || !drawn.has(ancestorId))) return false

  if (operation === 'fold') return ancestorId !== null && withDrawnChild.has(ancestorId)

  if (operation === 'openOneLevel') {
    if (ancestorId === null) return false
    return withAChildOutOfThePicture.has(ancestorId)
  }

  if (
    ancestorId !== null &&
    pressedRow?.isCollapsed === true &&
    withUnhiddenChild.has(ancestorId)
  ) {
    return true
  }
  for (const row of schedule.taskGroups) {
    if (ancestorId !== null && !isRowUnder(parentOf, row.parentId, ancestorId)) continue
    // TRAP: the hidden test must precede the `drawn` test; HR-6 keeps hidden rows out of `drawn`,
    // so swapping them makes the all-below open do less than the one-level open.
    if (row.isHidden === true) return true
    if (!drawn.has(row.id)) continue
    if (row.isCollapsed === true && withUnhiddenChild.has(row.id)) return true
  }
  return false
}

/** @purity pure */
function isARowOfTheShallowestLevelDrawn(context: InputContext): boolean {
  const rootRows = context.document.schedule.taskGroups.filter((row) => row.parentId === null)
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return rootRows.some((row) => row.isHidden !== true)
  const drawn = new Set(drawnIds)
  return rootRows.some((row) => drawn.has(row.id))
}

// see HR-1
/** @purity pure */
function unhidesEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
}

// see HR-2
/** @purity pure */
function foldsEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isCollapsed !== true)
    .map((row) => ({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true }) as const)
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

// EditDocument -- a row's folded, hidden and kept-open marks, for one row or every row.
// @unit      UF-79  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withRow, withSchedule } from './edit-task-group'

// see CM-33, FR-004
/** @purity pure */
export function setTaskGroupCollapsed(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupCollapsed'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-33', 'FR-004', `no such row: ${command.groupId}`)])
  }
  if (row.isCollapsed === command.collapsed) return edited(document)
  return edited(withRow(document, { ...row, isCollapsed: command.collapsed }))
}

// see CM-34, FR-004
/** @purity pure */
export function setTaskGroupHidden(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupHidden'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-34', 'FR-004', `no such row: ${command.groupId}`)])
  }
  if (row.isHidden === command.hidden) return edited(document)
  return edited(withRow(document, { ...row, isHidden: command.hidden }))
}

// see CM-75, FR-018, T-254
/** @purity pure */
export function setTaskGroupKeptOpen(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupKeptOpen'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-75', 'FR-018', `no such row: ${command.groupId}`)])
  }
  if (row.isKeptOpen === command.keptOpen) return edited(document)
  return edited(withRow(document, { ...row, isKeptOpen: command.keptOpen }))
}

// see CM-72, HF-8, KO-7
/** @purity pure */
export function expandAllTaskGroups(document: Document): EditResult {
  const groups = document.schedule.taskGroups
  const opened = groups.map((one) => {
    if (one.isCollapsed !== true && !one.isKeptOpen) return one
    const unfolded = one.isCollapsed === true ? { ...one, isCollapsed: false } : one
    return { ...unfolded, isKeptOpen: false }
  })
  if (opened.every((one, at) => one === groups[at])) return edited(document)
  return edited(withSchedule(document, { taskGroups: opened }))
}

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region rowTree (table T-328).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type TreeStateKey =
  | 'rowTree'
  | 'treeStateMachine.auto'
  | 'treeStateMachine.collapsed'
  | 'treeStateMachine.expanded'
  | 'treeStateMachine.temporarilyExpanded'
  | 'treeStateMachine.hidden'

export type TreeStateEvent =
  | { readonly type: 'oneLevelOpenPressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'allBelowOpenPressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'hidePressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'allBelowFoldPressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'everyRowOpenPressed' }
  | { readonly type: 'everyRowFoldPressed' }
  | { readonly type: 'topLevelOpenPressed' }
  | { readonly type: 'childRowAddPressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'fitPressed' }
  | { readonly type: 'rowZoomShrinkPressed' }

export type TreeStateEffectName =
  | 'writeLevelZeroCollapsed'
  | 'writeLevelZeroAuto'

export interface TreeStateTransition {
  readonly state: TreeStateKey
  readonly event: TreeStateEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: TreeStateEffectName | null
  readonly effectArgument: string | null
}

export const TREE_STATE_TRANSITIONS: readonly TreeStateTransition[] = [
  {
    state: 'rowTree',
    event: 'everyRowFoldPressed',
    guard: null,
    to: 'rowTree',
    effect: 'writeLevelZeroCollapsed',
    effectArgument: null,
  },
  {
    state: 'rowTree',
    event: 'everyRowOpenPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'rowTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'rowTree',
    event: 'topLevelOpenPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'rowTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'rowTree',
    event: 'childRowAddPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'rowTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'rowTree',
    event: 'fitPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'rowTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'oneLevelOpenPressed',
    guard: 'isChildOfPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowOpenPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedRow & not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedRow & not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedRow & isLeafRow',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedRow & not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedRow & isLeafRow',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'hidePressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'hidePressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'hidePressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'hidePressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'hidePressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'hidePressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'hidePressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowFoldPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'allBelowFoldPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'allBelowFoldPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'everyRowOpenPressed',
    guard: 'not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'everyRowOpenPressed',
    guard: 'not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'everyRowOpenPressed',
    guard: 'isLeafRow',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'everyRowOpenPressed',
    guard: 'not isLeafRow',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'everyRowOpenPressed',
    guard: 'isLeafRow',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'everyRowFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'everyRowFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'everyRowFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'topLevelOpenPressed',
    guard: 'isTopLevelRow',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'childRowAddPressed',
    guard: 'isPressedRow',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'fitPressed',
    guard: null,
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'fitPressed',
    guard: null,
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'fitPressed',
    guard: null,
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'rowZoomShrinkPressed',
    guard: null,
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
]
// </generated>

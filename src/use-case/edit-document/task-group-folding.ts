// EditDocument -- a row's tree state and level zero's, and the writes table T-328 gives a press.
// @unit      UF-79  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand, EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withRow, withSchedule } from './edit-task-group'
import type { DocumentSettingsCommand } from './edit-document-settings'

export interface TreeStateEventCarried {
  // WHY: the head's add (IC-93) presses level zero, which is no row, so its event carries null.
  readonly pressedRowId: string | null
}

type TreeState = TaskGroup['treeState']
type LevelZeroTreeState = DocumentSettings['levelZeroTreeState']

const ROW_STATE_KEY_PREFIX = 'treeStateMachine.'
const ROOT_STATE_KEY: TreeStateKey = 'rowTree'

// WHY: a Record over the type, so a value added to AT-153 fails to compile here.
const TREE_STATES: Readonly<Record<TreeState, true>> = {
  auto: true,
  collapsed: true,
  expanded: true,
  temporarilyExpanded: true,
  hidden: true,
}

const LEVEL_ZERO_WRITTEN_BY: Readonly<Record<TreeStateEffectName, LevelZeroTreeState>> = {
  writeLevelZeroCollapsed: 'collapsed',
  writeLevelZeroAuto: 'auto',
}

interface RowTreeFacts {
  readonly byId: ReadonlyMap<string, TaskGroup>
  readonly parentIds: ReadonlySet<string>
  readonly pressedRowId: string | null
}

const ROW_GUARDS: Readonly<Record<string, (row: TaskGroup, facts: RowTreeFacts) => boolean>> = {
  isPressedRow: (row, facts) => facts.pressedRowId !== null && row.id === facts.pressedRowId,
  isChildOfPressedRow: (row, facts) =>
    facts.pressedRowId !== null && row.parentId === facts.pressedRowId,
  isBelowPressedRow: (row, facts) => isBelowRow(row, facts.pressedRowId, facts.byId),
  isLeafRow: (row, facts) => !facts.parentIds.has(row.id),
  isTopLevelRow: (row) => row.parentId === null,
}

const ROOT_GUARDS: Readonly<Record<string, (levelZeroTreeState: LevelZeroTreeState) => boolean>> = {
  isLevelZeroCollapsed: (levelZeroTreeState) => levelZeroTreeState === 'collapsed',
}

// TRAP: the guard is a name, "not name", or terms joined by " & " (the generator prints no other
// form); a name this unit does not hold throws rather than reading as false and moving no row.
/** @purity pure */
function isGuardHeld(guard: string | null, isNamedGuardHeld: (name: string) => boolean): boolean {
  if (guard === null) return true
  return guard.split(' & ').every((term) =>
    term.startsWith('not ') ? !isNamedGuardHeld(term.slice('not '.length)) : isNamedGuardHeld(term),
  )
}

/** @purity pure */
function namedGuardOf<T>(guards: Readonly<Record<string, T>>, name: string): T {
  const guard = guards[name]
  if (guard === undefined) throw new Error(`table T-328 names a guard this unit does not hold: ${name}`)
  return guard
}

// WHY: walks up with a step cap, so a parent cycle in a broken document cannot hang the press.
/** @purity pure */
function isBelowRow(
  row: TaskGroup,
  ancestorId: string | null,
  byId: ReadonlyMap<string, TaskGroup>,
): boolean {
  if (ancestorId === null) return false
  let parentId = row.parentId
  for (let steps = 0; parentId !== null && steps <= byId.size; steps++) {
    if (parentId === ancestorId) return true
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return false
}

/** @purity pure */
function rowTreeFactsOf(schedule: Schedule, pressedRowId: string | null): RowTreeFacts {
  const rows = schedule.taskGroups
  const parentIds = new Set<string>()
  for (const row of rows) if (row.parentId !== null) parentIds.add(row.parentId)
  return { byId: new Map(rows.map((row) => [row.id, row])), parentIds, pressedRowId }
}

/** @purity pure */
function pressedRowIdOf(event: TreeStateEvent): string | null {
  return 'pressedRowId' in event ? event.pressedRowId : null
}

/** @purity pure */
function nextTreeStateOf(row: TaskGroup, event: TreeStateEvent, facts: RowTreeFacts): TreeState {
  const state = `${ROW_STATE_KEY_PREFIX}${row.treeState}`
  const cell = TREE_STATE_TRANSITIONS.find(
    (branch) =>
      branch.state === state &&
      branch.event === event.type &&
      isGuardHeld(branch.guard, (name) => namedGuardOf(ROW_GUARDS, name)(row, facts)),
  )
  if (cell === undefined) return row.treeState
  const next = cell.to.slice(ROW_STATE_KEY_PREFIX.length)
  if (!isTreeState(next)) throw new Error(`table T-328 moves a row to no AT-153 value: ${cell.to}`)
  return next
}

/** @purity pure */
function isTreeState(value: string): value is TreeState {
  return Object.prototype.hasOwnProperty.call(TREE_STATES, value)
}

// see T-328, FR-018, UN-14
/** @purity pure */
export function treeStateWritesFor(
  schedule: Schedule,
  event: TreeStateEvent,
): readonly DocumentCommand[] {
  const facts = rowTreeFactsOf(schedule, pressedRowIdOf(event))
  const writes: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    const treeState = nextTreeStateOf(row, event, facts)
    if (treeState !== row.treeState) {
      writes.push({ kind: 'setTaskGroupTreeState', taskGroupId: row.id, treeState })
    }
  }
  return writes
}

// see T-328, S-418, HR-2
/** @purity pure */
export function levelZeroWritesFor(
  levelZeroTreeState: LevelZeroTreeState,
  event: TreeStateEvent,
): readonly DocumentSettingsCommand[] {
  const cell = TREE_STATE_TRANSITIONS.find(
    (branch) =>
      branch.state === ROOT_STATE_KEY &&
      branch.event === event.type &&
      isGuardHeld(branch.guard, (name) => namedGuardOf(ROOT_GUARDS, name)(levelZeroTreeState)),
  )
  if (cell === undefined || cell.effect === null) return []
  const written = LEVEL_ZERO_WRITTEN_BY[cell.effect]
  if (written === levelZeroTreeState) return []
  return [{ kind: 'setLevelZeroTreeState', levelZeroTreeState: written }]
}

// see CM-85, FR-004, T-328
/** @purity pure */
export function setTaskGroupTreeState(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupTreeState'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.taskGroupId)
  if (row === undefined) {
    return refused([reject('CM-85', 'FR-004', `no such row: ${command.taskGroupId}`)])
  }
  // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
  if (!isTreeState(command.treeState)) {
    return refused([reject('CM-85', 'FR-004', `not a tree state AT-153 names: ${command.treeState}`)])
  }
  if (row.treeState === command.treeState) return edited(document)
  return edited(withRow(document, { ...row, treeState: command.treeState }))
}

// see CM-72, HF-8, T-328
/** @purity pure */
export function resetTaskGroupTreeStates(document: Document): EditResult {
  const schedule = document.schedule
  const facts = rowTreeFactsOf(schedule, null)
  const rows = schedule.taskGroups
  const reset = rows.map((row) => {
    const treeState = nextTreeStateOf(row, { type: 'fitPressed' }, facts)
    return treeState === row.treeState ? row : { ...row, treeState }
  })
  if (reset.every((row, at) => row === rows[at])) return edited(document)
  return edited(withSchedule(document, { taskGroups: reset }))
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

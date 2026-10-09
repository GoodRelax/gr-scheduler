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
import { withTaskGroup, withSchedule } from './edit-task-group'
import type { DocumentSettingsCommand } from './edit-document-settings'

export interface TreeStateEventCarried {
  // WHY: the head's add (IC-93) presses level zero, which is no row, so its event carries null.
  readonly pressedRowId: string | null
  readonly revealedRowId: string
}

type TreeState = TaskGroup['treeState']
type LevelZeroTreeState = DocumentSettings['levelZeroTreeState']

const ROW_STATE_KEY_PREFIX = 'treeStateMachine.'
const ROOT_STATE_KEY: TreeStateKey = 'taskGroupTree'

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

interface TaskGroupTreeFacts {
  readonly byId: ReadonlyMap<string, TaskGroup>
  readonly parentIds: ReadonlySet<string>
  readonly pressedRowId: string | null
  readonly revealedRowId: string | null
}

const TASK_GROUP_GUARDS: Readonly<Record<string, (taskGroup: TaskGroup, facts: TaskGroupTreeFacts) => boolean>> = {
  isPressedTaskGroup: (taskGroup, facts) => facts.pressedRowId !== null && taskGroup.id === facts.pressedRowId,
  isChildOfPressedTaskGroup: (taskGroup, facts) =>
    facts.pressedRowId !== null && taskGroup.parentId === facts.pressedRowId,
  isBelowPressedTaskGroup: (taskGroup, facts) => isBelowTaskGroup(taskGroup, facts.pressedRowId, facts.byId),
  isLeafTaskGroup: (taskGroup, facts) => !facts.parentIds.has(taskGroup.id),
  isTopLevelTaskGroup: (taskGroup) => taskGroup.parentId === null,
  isRevealedTaskGroupOrAncestor,
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
function isBelowTaskGroup(
  taskGroup: TaskGroup,
  ancestorId: string | null,
  byId: ReadonlyMap<string, TaskGroup>,
): boolean {
  if (ancestorId === null) return false
  let parentId = taskGroup.parentId
  for (let steps = 0; parentId !== null && steps <= byId.size; steps++) {
    if (parentId === ancestorId) return true
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return false
}

// see T-328, SJ-2
/** @purity pure */
function isRevealedTaskGroupOrAncestor(taskGroup: TaskGroup, facts: TaskGroupTreeFacts): boolean {
  const revealed = facts.revealedRowId === null ? undefined : facts.byId.get(facts.revealedRowId)
  if (revealed === undefined) return false
  return revealed.id === taskGroup.id || isBelowTaskGroup(revealed, taskGroup.id, facts.byId)
}

/** @purity pure */
function taskGroupTreeFactsOf(schedule: Schedule, event: TreeStateEvent): TaskGroupTreeFacts {
  const taskGroups = schedule.taskGroups
  const parentIds = new Set<string>()
  for (const taskGroup of taskGroups) if (taskGroup.parentId !== null) parentIds.add(taskGroup.parentId)
  return {
    byId: new Map(taskGroups.map((taskGroup) => [taskGroup.id, taskGroup])),
    parentIds,
    pressedRowId: 'pressedRowId' in event ? event.pressedRowId : null,
    revealedRowId: 'revealedRowId' in event ? event.revealedRowId : null,
  }
}

/** @purity pure */
function nextTreeStateOf(taskGroup: TaskGroup, event: TreeStateEvent, facts: TaskGroupTreeFacts): TreeState {
  const state = `${ROW_STATE_KEY_PREFIX}${taskGroup.treeState}`
  const cell = TREE_STATE_TRANSITIONS.find(
    (branch) =>
      branch.state === state &&
      branch.event === event.type &&
      isGuardHeld(branch.guard, (name) => namedGuardOf(TASK_GROUP_GUARDS, name)(taskGroup, facts)),
  )
  if (cell === undefined) return taskGroup.treeState
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
  const facts = taskGroupTreeFactsOf(schedule, event)
  const writes: DocumentCommand[] = []
  for (const taskGroup of schedule.taskGroups) {
    const treeState = nextTreeStateOf(taskGroup, event, facts)
    if (treeState !== taskGroup.treeState) {
      writes.push({ kind: 'setTaskGroupTreeState', groupId: taskGroup.id, treeState })
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
  const taskGroup = byId.get(command.groupId)
  if (taskGroup === undefined) {
    return refused([reject('CM-85', 'FR-004', `no such row: ${command.groupId}`)])
  }
  // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
  if (!isTreeState(command.treeState)) {
    return refused([reject('CM-85', 'FR-004', `not a tree state AT-153 names: ${command.treeState}`)])
  }
  if (taskGroup.treeState === command.treeState) return edited(document)
  return edited(withTaskGroup(document, { ...taskGroup, treeState: command.treeState }))
}

// see CM-72, HF-8, T-328
/** @purity pure */
export function resetTaskGroupTreeStates(document: Document): EditResult {
  const schedule = document.schedule
  const fit: TreeStateEvent = { type: 'fitPressed' }
  const facts = taskGroupTreeFactsOf(schedule, fit)
  const taskGroups = schedule.taskGroups
  const reset = taskGroups.map((taskGroup) => {
    const treeState = nextTreeStateOf(taskGroup, fit, facts)
    return treeState === taskGroup.treeState ? taskGroup : { ...taskGroup, treeState }
  })
  if (reset.every((taskGroup, at) => taskGroup === taskGroups[at])) return edited(document)
  return edited(withSchedule(document, { taskGroups: reset }))
}

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region taskGroupTree (table T-328).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type TreeStateKey =
  | 'taskGroupTree'
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
  | { readonly type: 'everyTaskGroupOpenPressed' }
  | { readonly type: 'everyTaskGroupFoldPressed' }
  | { readonly type: 'topLevelOpenPressed' }
  | { readonly type: 'childTaskGroupAddPressed'; readonly pressedRowId: TreeStateEventCarried['pressedRowId'] }
  | { readonly type: 'fitPressed' }
  | { readonly type: 'everyTaskGroupDeletePressed' }
  | { readonly type: 'verticalZoomShrinkPressed' }
  | { readonly type: 'taskGroupRevealAsked'; readonly revealedRowId: TreeStateEventCarried['revealedRowId'] }

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

const TREE_STATE_TRANSITIONS: readonly TreeStateTransition[] = [
  {
    state: 'taskGroupTree',
    event: 'everyTaskGroupFoldPressed',
    guard: null,
    to: 'taskGroupTree',
    effect: 'writeLevelZeroCollapsed',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'everyTaskGroupOpenPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'topLevelOpenPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'childTaskGroupAddPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'fitPressed',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'everyTaskGroupDeletePressed',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'taskGroupTree',
    event: 'taskGroupRevealAsked',
    guard: 'isLevelZeroCollapsed',
    to: 'taskGroupTree',
    effect: 'writeLevelZeroAuto',
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'oneLevelOpenPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'oneLevelOpenPressed',
    guard: 'isChildOfPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowOpenPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedTaskGroup & not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedTaskGroup & not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedTaskGroup & isLeafTaskGroup',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedTaskGroup & not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'allBelowOpenPressed',
    guard: 'isBelowPressedTaskGroup & isLeafTaskGroup',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'hidePressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'hidePressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'hidePressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'hidePressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'hidePressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'hidePressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.hidden',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'hidePressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowFoldPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'allBelowFoldPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'allBelowFoldPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'allBelowFoldPressed',
    guard: 'isBelowPressedTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'everyTaskGroupOpenPressed',
    guard: 'not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'everyTaskGroupOpenPressed',
    guard: 'not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'everyTaskGroupOpenPressed',
    guard: 'isLeafTaskGroup',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'everyTaskGroupOpenPressed',
    guard: 'not isLeafTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'everyTaskGroupOpenPressed',
    guard: 'isLeafTaskGroup',
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'everyTaskGroupFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.expanded',
    event: 'everyTaskGroupFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'everyTaskGroupFoldPressed',
    guard: null,
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'topLevelOpenPressed',
    guard: 'isTopLevelTaskGroup',
    to: 'treeStateMachine.collapsed',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'childTaskGroupAddPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'childTaskGroupAddPressed',
    guard: 'isPressedTaskGroup',
    to: 'treeStateMachine.temporarilyExpanded',
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
    event: 'verticalZoomShrinkPressed',
    guard: null,
    to: 'treeStateMachine.auto',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.auto',
    event: 'taskGroupRevealAsked',
    guard: 'isRevealedTaskGroupOrAncestor',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.collapsed',
    event: 'taskGroupRevealAsked',
    guard: 'isRevealedTaskGroupOrAncestor',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.temporarilyExpanded',
    event: 'taskGroupRevealAsked',
    guard: 'isRevealedTaskGroupOrAncestor',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'treeStateMachine.hidden',
    event: 'taskGroupRevealAsked',
    guard: 'isRevealedTaskGroupOrAncestor',
    to: 'treeStateMachine.expanded',
    effect: null,
    effectArgument: null,
  },
]
// </generated>

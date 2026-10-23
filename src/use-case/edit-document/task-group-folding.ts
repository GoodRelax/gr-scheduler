// EditDocument -- a task group's tree state and level zero's, and the writes table T-328 gives a press.
// @unit      UF-79  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand, EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withTaskGroup, withScheduleParts } from './edit-task-group'
import type { DocumentSettingsCommand } from './edit-document-settings'

export interface TreeStateEventCarried {
  // WHY: the head's add (IC-93) presses level zero, which is no task group, so its event carries null.
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

type TreeStateEventValues = { readonly [carry in keyof TreeStateEventCarried]: TreeStateEventCarried[carry] | null }

// WHY: one input for every judgment of table T-328 (SD-5), so a cell's guard is looked up by name; the
// task group is null in a root cell (level zero), and a value the event does not carry is null.
interface TreeStateGuardInput {
  readonly taskGroup: TaskGroup | null
  readonly event: TreeStateEventValues
  readonly ancestors: (taskGroupId: string | null | undefined) => readonly string[]
  readonly childTaskGroups: (taskGroupId: string | null | undefined) => readonly TaskGroup[]
  readonly setting: (row: 'S-418') => LevelZeroTreeState
}

// TRAP: the guard is a name, "not name", or terms joined by " & " (the generator prints no other
// form); a name this unit does not hold throws rather than reading as false and moving no task group.
/** @purity pure */
function isGuardHeld(guard: string | null, input: TreeStateGuardInput): boolean {
  if (guard === null) return true
  return guard.split(' & ').every((term) =>
    term.startsWith('not ') ? !isNamedGuardHeld(term.slice('not '.length), input) : isNamedGuardHeld(term, input),
  )
}

/** @purity pure */
function isNamedGuardHeld(name: string, input: TreeStateGuardInput): boolean {
  if (!isTreeStateGuardName(name)) throw new Error(`table T-328 names a guard this unit does not hold: ${name}`)
  return TREE_STATE_GUARDS[name](input)
}

/** @purity pure */
function isTreeStateGuardName(name: string): name is TreeStateGuardName {
  return Object.hasOwn(TREE_STATE_GUARDS, name)
}

// TRAP: a press of the task groups is handed no document settings, and level zero's no schedule; a cell
// that reads what its side was not handed throws rather than guessing.
/** @purity pure */
function notHanded(what: string): never {
  throw new Error(`table T-328: a cell reads ${what}, which this side of the tree is not handed`)
}

/** @purity pure */
function eventValuesOf(event: TreeStateEvent): TreeStateEventValues {
  return {
    pressedRowId: 'pressedRowId' in event ? event.pressedRowId : null,
    revealedRowId: 'revealedRowId' in event ? event.revealedRowId : null,
  }
}

// WHY: walks up with a step cap, so a parent cycle in a broken document cannot hang the press.
/** @purity pure */
function ancestorsOf(taskGroupId: string | null | undefined, byId: ReadonlyMap<string, TaskGroup>): readonly string[] {
  const found: string[] = []
  let parentId = taskGroupId == null ? null : (byId.get(taskGroupId)?.parentId ?? null)
  for (let steps = 0; parentId !== null && steps <= byId.size; steps++) {
    found.push(parentId)
    parentId = byId.get(parentId)?.parentId ?? null
  }
  return found
}

// see T-328, HR-3, SJ-2
/** @purity pure */
function taskGroupGuardInputOf(schedule: Schedule, event: TreeStateEvent): Omit<TreeStateGuardInput, 'taskGroup'> {
  const taskGroups = schedule.taskGroups
  const byId = new Map(taskGroups.map((taskGroup) => [taskGroup.id, taskGroup]))
  const childrenById = new Map<string, TaskGroup[]>()
  for (const taskGroup of taskGroups) {
    if (taskGroup.parentId === null) continue
    const children = childrenById.get(taskGroup.parentId)
    if (children === undefined) childrenById.set(taskGroup.parentId, [taskGroup])
    else children.push(taskGroup)
  }
  return {
    event: eventValuesOf(event),
    ancestors: (taskGroupId) => ancestorsOf(taskGroupId, byId),
    childTaskGroups: (taskGroupId) => (taskGroupId == null ? undefined : childrenById.get(taskGroupId)) ?? [],
    setting: () => notHanded('a setting'),
  }
}

/** @purity pure */
function nextTreeStateOf(
  taskGroup: TaskGroup,
  event: TreeStateEvent,
  pressInput: Omit<TreeStateGuardInput, 'taskGroup'>,
): TreeState {
  const state = `${ROW_STATE_KEY_PREFIX}${taskGroup.treeState}`
  const input: TreeStateGuardInput = { ...pressInput, taskGroup }
  const cell = TREE_STATE_TRANSITIONS.find(
    (branch) => branch.state === state && branch.event === event.type && isGuardHeld(branch.guard, input),
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
  const pressInput = taskGroupGuardInputOf(schedule, event)
  const writes: DocumentCommand[] = []
  for (const taskGroup of schedule.taskGroups) {
    const treeState = nextTreeStateOf(taskGroup, event, pressInput)
    if (treeState !== taskGroup.treeState) {
      writes.push({ kind: 'setTaskGroupTreeState', taskGroupId: taskGroup.id, treeState })
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
  const settings = { 'S-418': levelZeroTreeState } as const
  const input: TreeStateGuardInput = {
    taskGroup: null,
    event: eventValuesOf(event),
    ancestors: () => notHanded('the task groups'),
    childTaskGroups: () => notHanded('the task groups'),
    setting: (row) => settings[row],
  }
  const cell = TREE_STATE_TRANSITIONS.find(
    (branch) => branch.state === ROOT_STATE_KEY && branch.event === event.type && isGuardHeld(branch.guard, input),
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
  const taskGroup = byId.get(command.taskGroupId)
  if (taskGroup === undefined) {
    return refused([reject('CM-85', 'FR-004', `no such task group: ${command.taskGroupId}`)])
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
  const pressInput = taskGroupGuardInputOf(schedule, fit)
  const taskGroups = schedule.taskGroups
  const reset = taskGroups.map((taskGroup) => {
    const treeState = nextTreeStateOf(taskGroup, fit, pressInput)
    return treeState === taskGroup.treeState ? taskGroup : { ...taskGroup, treeState }
  })
  if (reset.every((taskGroup, at) => taskGroup === taskGroups[at])) return edited(document)
  return edited(withScheduleParts(document, { taskGroups: reset }))
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

export type TreeStateGuardName =
  | 'isBelowPressedTaskGroup'
  | 'isChildOfPressedTaskGroup'
  | 'isLeafTaskGroup'
  | 'isLevelZeroCollapsed'
  | 'isPressedTaskGroup'
  | 'isRevealedTaskGroupOrAncestor'
  | 'isTopLevelTaskGroup'

export interface TreeStateTransition {
  readonly state: TreeStateKey
  readonly event: TreeStateEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: TreeStateEffectName | null
  readonly effectArgument: string | null
}

const TREE_STATE_GUARDS = {
  isBelowPressedTaskGroup: ({ taskGroup, event, ancestors }: TreeStateGuardInput): boolean =>
    (ancestors(taskGroup?.id) as readonly unknown[]).includes(event.pressedRowId),
  isChildOfPressedTaskGroup: ({ taskGroup, event }: TreeStateGuardInput): boolean =>
    (event.pressedRowId != null) && (taskGroup?.parentId === event.pressedRowId),
  isLeafTaskGroup: ({ taskGroup, childTaskGroups }: TreeStateGuardInput): boolean =>
    childTaskGroups(taskGroup?.id)?.length === 0,
  isLevelZeroCollapsed: ({ setting }: TreeStateGuardInput): boolean => setting('S-418') === 'collapsed',
  isPressedTaskGroup: ({ taskGroup, event }: TreeStateGuardInput): boolean =>
    taskGroup?.id === event.pressedRowId,
  isRevealedTaskGroupOrAncestor: ({ taskGroup, event, ancestors }: TreeStateGuardInput): boolean =>
    taskGroup?.id === event.revealedRowId
      || (ancestors(event.revealedRowId) as readonly unknown[]).includes(taskGroup?.id),
  isTopLevelTaskGroup: ({ taskGroup }: TreeStateGuardInput): boolean => taskGroup?.parentId == null,
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

// FieldEntryValues: the naming and field-entry region of the session and its transitions.
// @unit      UF-121  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type Step } from './session-step'

// WHY: the five field rows the shell names; a field is asked for by its row, never by its element.
export type FieldEntryFieldRow = 'PR-1' | 'AT-53' | 'PR-16' | 'PR-21' | 'U-27'

export interface FieldEntryCreatedTask {
  readonly kind: 'task'
  readonly uid: number
}

export interface FieldEntryCreatedRow {
  readonly kind: 'row'
  readonly groupId: string
}

// WHY: the translator's created again; UseCase may not read an Adapter type (table T-061).
export type FieldEntryCreated = FieldEntryCreatedTask | FieldEntryCreatedRow

export interface FieldEntryValuesStateCarried {
  readonly createdTaskUid: number
  readonly fieldRow: FieldEntryFieldRow
}

export interface FieldEntryValuesEventCarried {
  readonly fieldRow: FieldEntryFieldRow
  readonly created: FieldEntryCreated
}

interface FieldEntryValuesEffectPayloads {
  readonly bringCreatedRowIntoSight: { readonly groupId: string }
}

export type FieldEntryValuesEffect = {
  readonly [N in FieldEntryValuesEffectName]: { readonly type: N } & FieldEntryValuesEffectPayloads[N]
}[FieldEntryValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region fieldEntry (table T-292).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type FieldEntryValuesKey =
  | 'fieldEntry'
  | 'createdTaskNamingStateMachine.idle'
  | 'createdTaskNamingStateMachine.namingCreatedTask'
  | 'fieldFocusWantStateMachine.idle'
  | 'fieldFocusWantStateMachine.fieldFocusWanted'

export type CreatedTaskNamingState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'namingCreatedTask'; readonly createdTaskUid: FieldEntryValuesStateCarried['createdTaskUid'] }

export type FieldFocusWantState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'fieldFocusWanted'; readonly fieldRow: FieldEntryValuesStateCarried['fieldRow'] }

export interface FieldEntryValues {
  readonly createdTaskNamingState: CreatedTaskNamingState
  readonly fieldFocusWantState: FieldFocusWantState
}

export type FieldEntryValuesAxes = Omit<FieldEntryValues, never>

export type FieldEntryValuesEvent =
  | { readonly type: 'fieldFocusAsked'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] }
  | { readonly type: 'creationLanded'; readonly created: FieldEntryValuesEventCarried['created'] }
  | { readonly type: 'fieldFocusLanded' }
  | { readonly type: 'fieldFocusWithdrawn' }
  | { readonly type: 'choiceMoved' }

export type FieldEntryValuesEffectName =
  | 'bringCreatedRowIntoSight'

export interface FieldEntryValuesTransition {
  readonly state: FieldEntryValuesKey
  readonly event: FieldEntryValuesEvent['type']
  readonly guard: string | null
  readonly to: string
  readonly effect: FieldEntryValuesEffectName | null
  readonly effectArgument: string | null
}

const FIELD_ENTRY_VALUES_INITIAL_AXES: FieldEntryValuesAxes = {
  createdTaskNamingState: { kind: 'idle' },
  fieldFocusWantState: { kind: 'idle' },
}

export const FIELD_ENTRY_VALUES_TRANSITIONS: readonly FieldEntryValuesTransition[] = [
  {
    state: 'fieldEntry',
    event: 'creationLanded',
    guard: 'not isCreatedTask',
    to: 'fieldEntry',
    effect: 'bringCreatedRowIntoSight',
    effectArgument: null,
  },
  {
    state: 'createdTaskNamingStateMachine.idle',
    event: 'creationLanded',
    guard: 'isCreatedTask',
    to: 'createdTaskNamingStateMachine.namingCreatedTask',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'createdTaskNamingStateMachine.namingCreatedTask',
    event: 'creationLanded',
    guard: 'isCreatedTask',
    to: 'createdTaskNamingStateMachine.namingCreatedTask',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'createdTaskNamingStateMachine.namingCreatedTask',
    event: 'choiceMoved',
    guard: null,
    to: 'createdTaskNamingStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.idle',
    event: 'fieldFocusAsked',
    guard: null,
    to: 'fieldFocusWantStateMachine.fieldFocusWanted',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.fieldFocusWanted',
    event: 'fieldFocusAsked',
    guard: null,
    to: 'fieldFocusWantStateMachine.fieldFocusWanted',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.idle',
    event: 'creationLanded',
    guard: null,
    to: 'fieldFocusWantStateMachine.fieldFocusWanted',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.fieldFocusWanted',
    event: 'creationLanded',
    guard: null,
    to: 'fieldFocusWantStateMachine.fieldFocusWanted',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.fieldFocusWanted',
    event: 'fieldFocusLanded',
    guard: null,
    to: 'fieldFocusWantStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
  {
    state: 'fieldFocusWantStateMachine.fieldFocusWanted',
    event: 'fieldFocusWithdrawn',
    guard: null,
    to: 'fieldFocusWantStateMachine.idle',
    effect: null,
    effectArgument: null,
  },
]
// </generated>

type FieldEntryStep = Step<FieldEntryValues, FieldEntryValuesEffect>

type EventOf<T extends FieldEntryValuesEvent['type']> = Extract<FieldEntryValuesEvent, { readonly type: T }>

type Effects = readonly FieldEntryValuesEffect[]

const TASK_NAME_FIELD_ROW: FieldEntryFieldRow = 'PR-1'

const ROW_NAME_FIELD_ROW: FieldEntryFieldRow = 'AT-53'

// see T-292
export const emptyFieldEntryValues: FieldEntryValues = { ...FIELD_ENTRY_VALUES_INITIAL_AXES }

// see FR-091, TC-9
/** @purity pure */
function isCreatedTask(created: FieldEntryCreated): created is FieldEntryCreatedTask {
  return created.kind === 'task'
}

// WHY: a machine the event leaves alone keeps its reference, and so does the region (SD-3, SF-3).
/** @purity pure */
function combined(
  values: FieldEntryValues,
  naming: CreatedTaskNamingState,
  want: FieldFocusWantState,
  effects: Effects,
): FieldEntryStep {
  const isKept = naming === values.createdTaskNamingState && want === values.fieldFocusWantState
  const state = isKept ? values : { ...values, createdTaskNamingState: naming, fieldFocusWantState: want }
  return isKept && effects.length === 0 ? unchanged(values) : { state, effects }
}

// WHY: rewriting a carried value with the one it already holds changes nothing (SF-3).
/** @purity pure */
function wanted(want: FieldFocusWantState, fieldRow: FieldEntryFieldRow): FieldFocusWantState {
  if (want.kind === 'fieldFocusWanted' && want.fieldRow === fieldRow) return want
  return { kind: 'fieldFocusWanted', fieldRow }
}

/** @purity pure */
function named(naming: CreatedTaskNamingState, createdTaskUid: number): CreatedTaskNamingState {
  if (naming.kind === 'namingCreatedTask' && naming.createdTaskUid === createdTaskUid) return naming
  return { kind: 'namingCreatedTask', createdTaskUid }
}

// see T-292, MK-13, FR-035, IN-5b
/** @purity pure */
function onFieldFocusAsked(values: FieldEntryValues, event: EventOf<'fieldFocusAsked'>): FieldEntryStep {
  const want = wanted(values.fieldFocusWantState, event.fieldRow)
  return combined(values, values.createdTaskNamingState, want, NO_EFFECTS)
}

// WHY: an added row leaves the naming scene as it is, as today's shell does (CR-480 decision 9).
// see T-292, FR-091, HF-14, HF-17
/** @purity pure */
function onCreationLanded(values: FieldEntryValues, event: EventOf<'creationLanded'>): FieldEntryStep {
  const { created } = event
  const { createdTaskNamingState: naming, fieldFocusWantState: want } = values
  if (isCreatedTask(created)) {
    return combined(values, named(naming, created.uid), wanted(want, TASK_NAME_FIELD_ROW), NO_EFFECTS)
  }
  const effects: Effects = [{ type: 'bringCreatedRowIntoSight', groupId: created.groupId }]
  return combined(values, naming, wanted(want, ROW_NAME_FIELD_ROW), effects)
}

// WHY: a landed focus and a withdrawn want both end the want (IN-5a, IN-5b).
/** @purity pure */
function wantEnded(values: FieldEntryValues): FieldEntryStep {
  if (values.fieldFocusWantState.kind === 'idle') return unchanged(values)
  const idle = FIELD_ENTRY_VALUES_INITIAL_AXES.fieldFocusWantState
  return combined(values, values.createdTaskNamingState, idle, NO_EFFECTS)
}

// see T-292, FR-091, FR-072
/** @purity pure */
function onChoiceMoved(values: FieldEntryValues): FieldEntryStep {
  if (values.createdTaskNamingState.kind === 'idle') return unchanged(values)
  const idle = FIELD_ENTRY_VALUES_INITIAL_AXES.createdTaskNamingState
  return combined(values, idle, values.fieldFocusWantState, NO_EFFECTS)
}

const HANDLERS: {
  readonly [T in FieldEntryValuesEvent['type']]: (values: FieldEntryValues, event: EventOf<T>) => FieldEntryStep
} = {
  fieldFocusAsked: onFieldFocusAsked,
  creationLanded: onCreationLanded,
  fieldFocusLanded: wantEnded,
  fieldFocusWithdrawn: wantEnded,
  choiceMoved: onChoiceMoved,
}

// see SF-2, SF-8, T-292
/** @purity pure */
export function stepFieldEntryValues(values: FieldEntryValues, event: FieldEntryValuesEvent): FieldEntryStep {
  const handler = HANDLERS[event.type] as (values: FieldEntryValues, event: FieldEntryValuesEvent) => FieldEntryStep
  return handler(values, event)
}

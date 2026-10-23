// FieldEntryValues: the naming and field-entry region of the session and its transitions.
// @unit      UF-121  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type Step } from './session-step'

// WHY: the rows asked for focus; an edited field may name any editable row (IF-9), so carried rows are strings.
export type FieldEntryFieldRow = 'PR-1' | 'AT-53' | 'PR-16' | 'PR-21' | 'PR-22' | 'U-27'

export interface FieldEntryCreatedTask {
  readonly kind: 'task'
  readonly uid: number
}

export interface FieldEntryCreatedRow {
  readonly kind: 'taskGroup'
  readonly taskGroupId: string
}

// WHY: the translator's created again; UseCase may not read an Adapter type (table T-061).
export type FieldEntryCreated = FieldEntryCreatedTask | FieldEntryCreatedRow

export interface FieldEntryValuesStateCarried {
  readonly createdTaskUid: number
  readonly fieldRow: string
}

export interface FieldEntryValuesEventCarried {
  readonly fieldRow: string
  readonly created: FieldEntryCreated
}

interface FieldEntryValuesEffectPayloads {
  readonly bringCreatedTaskGroupIntoSight: { readonly taskGroupId: string }
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
  | 'createdTaskNamingStateMachine.createdNameEnded'
  | 'fieldEditStateMachine.idle'
  | 'fieldEditStateMachine.fieldFocusWanted'
  | 'fieldEditStateMachine.editingField'

export type CreatedTaskNamingState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'namingCreatedTask'; readonly createdTaskUid: FieldEntryValuesStateCarried['createdTaskUid'] }
  | { readonly kind: 'createdNameEnded'; readonly createdTaskUid: FieldEntryValuesStateCarried['createdTaskUid'] }

export type FieldEditState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'fieldFocusWanted'; readonly fieldRow: FieldEntryValuesStateCarried['fieldRow'] }
  | { readonly kind: 'editingField'; readonly fieldRow: FieldEntryValuesStateCarried['fieldRow'] }

export interface FieldEntryValues {
  readonly createdTaskNamingState: CreatedTaskNamingState
  readonly fieldEditState: FieldEditState
}

export type FieldEntryValuesAxes = Omit<FieldEntryValues, never>

export type FieldEntryValuesEvent =
  | { readonly type: 'fieldFocusAsked'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] }
  | { readonly type: 'creationLanded'; readonly created: FieldEntryValuesEventCarried['created'] }
  | { readonly type: 'fieldFocusWithdrawn' }
  | { readonly type: 'fieldEditBegan'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] }
  | { readonly type: 'fieldEditEnded'; readonly fieldRow: FieldEntryValuesEventCarried['fieldRow'] }
  | { readonly type: 'choiceMoved' }

export type FieldEntryValuesEffectName =
  | 'bringCreatedTaskGroupIntoSight'

export type FieldEntryValuesGuardName =
  | 'isCreatedTask'
  | 'isEditedField'
  | 'isNameField'

const FIELD_ENTRY_VALUES_INITIAL_AXES: FieldEntryValuesAxes = {
  createdTaskNamingState: { kind: 'idle' },
  fieldEditState: { kind: 'idle' },
}

const FIELD_ENTRY_VALUES_GUARDS = {
  isCreatedTask: (event: Extract<FieldEntryValuesEvent, { readonly type: 'creationLanded' }>): boolean =>
    event.created?.kind === 'task',
  isEditedField: (values: FieldEntryValues, event: Extract<FieldEntryValuesEvent, { readonly type: 'fieldFocusAsked' | 'fieldEditEnded' }>): boolean => {
    const fieldEditFieldRow =
      values.fieldEditState.kind === 'fieldFocusWanted' ? values.fieldEditState.fieldRow
      : values.fieldEditState.kind === 'editingField' ? values.fieldEditState.fieldRow
      : null
    return (values.fieldEditState.kind === 'editingField') && (fieldEditFieldRow === event.fieldRow)
  },
  isNameField: (event: Extract<FieldEntryValuesEvent, { readonly type: 'fieldEditEnded' }>): boolean =>
    event.fieldRow === 'PR-1',
}
// </generated>

type FieldEntryStep = Step<FieldEntryValues, FieldEntryValuesEffect>

type EventOf<T extends FieldEntryValuesEvent['type']> = Extract<FieldEntryValuesEvent, { readonly type: T }>

type Effects = readonly FieldEntryValuesEffect[]

const TASK_NAME_FIELD_ROW: FieldEntryFieldRow = 'PR-1'

const TASK_GROUP_NAME_FIELD_TASK_GROUP: FieldEntryFieldRow = 'AT-53'

// see T-292
export const emptyFieldEntryValues: FieldEntryValues = { ...FIELD_ENTRY_VALUES_INITIAL_AXES }

// WHY: an unmoved machine, or a carried value rewritten with itself, keeps its reference (SD-3, SF-3).
/** @purity pure */
function combined(
  values: FieldEntryValues,
  naming: CreatedTaskNamingState,
  edit: FieldEditState,
  effects: Effects,
): FieldEntryStep {
  const isKept = naming === values.createdTaskNamingState && edit === values.fieldEditState
  const state = isKept ? values : { ...values, createdTaskNamingState: naming, fieldEditState: edit }
  return isKept && effects.length === 0 ? unchanged(values) : { state, effects }
}

/** @purity pure */
function wanted(edit: FieldEditState, fieldRow: string): FieldEditState {
  if (edit.kind === 'fieldFocusWanted' && edit.fieldRow === fieldRow) return edit
  return { kind: 'fieldFocusWanted', fieldRow }
}

/** @purity pure */
function editing(edit: FieldEditState, fieldRow: string): FieldEditState {
  if (edit.kind === 'editingField' && edit.fieldRow === fieldRow) return edit
  return { kind: 'editingField', fieldRow }
}

// WHY: an end of the name field, committed or canceled, makes the next Enter the one that settles the name (FR-091).
/** @purity pure */
function nameEnded(naming: CreatedTaskNamingState, event: EventOf<'fieldEditEnded'>): CreatedTaskNamingState {
  if (naming.kind !== 'namingCreatedTask' || !FIELD_ENTRY_VALUES_GUARDS.isNameField(event)) return naming
  return { kind: 'createdNameEnded', createdTaskUid: naming.createdTaskUid }
}

// WHY: an edit begun again means the end of the name is no longer the last thing that happened (T-292).
/** @purity pure */
function nameReopened(naming: CreatedTaskNamingState): CreatedTaskNamingState {
  if (naming.kind !== 'createdNameEnded') return naming
  return { kind: 'namingCreatedTask', createdTaskUid: naming.createdTaskUid }
}

/** @purity pure */
function named(naming: CreatedTaskNamingState, createdTaskUid: number): CreatedTaskNamingState {
  if (naming.kind === 'namingCreatedTask' && naming.createdTaskUid === createdTaskUid) return naming
  return { kind: 'namingCreatedTask', createdTaskUid }
}

/** @purity pure */
function onFieldFocusAsked(values: FieldEntryValues, event: EventOf<'fieldFocusAsked'>): FieldEntryStep {
  if (FIELD_ENTRY_VALUES_GUARDS.isEditedField(values, event)) return unchanged(values)
  const want = wanted(values.fieldEditState, event.fieldRow)
  return combined(values, values.createdTaskNamingState, want, NO_EFFECTS)
}

// WHY: an added task group leaves the naming scene as it is, as today's shell does (CR-480 decision 9).
/** @purity pure */
function onCreationLanded(values: FieldEntryValues, event: EventOf<'creationLanded'>): FieldEntryStep {
  const { createdTaskNamingState: naming, fieldEditState: edit } = values
  // WHY: the generated isCreatedTask answers the cell (T-292) and narrows nothing, so each branch reads its own variant.
  if (FIELD_ENTRY_VALUES_GUARDS.isCreatedTask(event)) {
    const task = event.created as FieldEntryCreatedTask
    return combined(values, named(naming, task.uid), wanted(edit, TASK_NAME_FIELD_ROW), NO_EFFECTS)
  }
  const row = event.created as FieldEntryCreatedRow
  const effects: Effects = [{ type: 'bringCreatedTaskGroupIntoSight', taskGroupId: row.taskGroupId }]
  return combined(values, naming, wanted(edit, TASK_GROUP_NAME_FIELD_TASK_GROUP), effects)
}

/** @purity pure */
function onFieldFocusWithdrawn(values: FieldEntryValues): FieldEntryStep {
  if (values.fieldEditState.kind !== 'fieldFocusWanted') return unchanged(values)
  const idle = FIELD_ENTRY_VALUES_INITIAL_AXES.fieldEditState
  return combined(values, values.createdTaskNamingState, idle, NO_EFFECTS)
}

/** @purity pure */
function onFieldEditBegan(values: FieldEntryValues, event: EventOf<'fieldEditBegan'>): FieldEntryStep {
  const edit = editing(values.fieldEditState, event.fieldRow)
  return combined(values, nameReopened(values.createdTaskNamingState), edit, NO_EFFECTS)
}

/** @purity pure */
function onFieldEditEnded(values: FieldEntryValues, event: EventOf<'fieldEditEnded'>): FieldEntryStep {
  const naming = nameEnded(values.createdTaskNamingState, event)
  // WHY: a late end of the previous field must not end the next one's edit (CR-500 decision 5).
  const isEdited = FIELD_ENTRY_VALUES_GUARDS.isEditedField(values, event)
  const edit = isEdited ? FIELD_ENTRY_VALUES_INITIAL_AXES.fieldEditState : values.fieldEditState
  return combined(values, naming, edit, NO_EFFECTS)
}

/** @purity pure */
function onChoiceMoved(values: FieldEntryValues): FieldEntryStep {
  if (values.createdTaskNamingState.kind === 'idle') return unchanged(values)
  const idle = FIELD_ENTRY_VALUES_INITIAL_AXES.createdTaskNamingState
  return combined(values, idle, values.fieldEditState, NO_EFFECTS)
}

const HANDLERS: {
  readonly [T in FieldEntryValuesEvent['type']]: (values: FieldEntryValues, event: EventOf<T>) => FieldEntryStep
} = {
  fieldFocusAsked: onFieldFocusAsked,
  creationLanded: onCreationLanded,
  fieldFocusWithdrawn: onFieldFocusWithdrawn,
  fieldEditBegan: onFieldEditBegan,
  fieldEditEnded: onFieldEditEnded,
  choiceMoved: onChoiceMoved,
}

// see SF-2, SF-8, T-292
/** @purity pure */
export function stepFieldEntryValues(values: FieldEntryValues, event: FieldEntryValuesEvent): FieldEntryStep {
  const handler = HANDLERS[event.type] as (values: FieldEntryValues, event: FieldEntryValuesEvent) => FieldEntryStep
  return handler(values, event)
}


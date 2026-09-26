// SelectionValues: the selection region of the session and its transitions.
// @unit      UF-122  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import type { EscapeTarget } from '../../entity/document-model/screen-state/screen-state'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../entity/document-model/selection/selection'
import { NO_EFFECTS, unchanged, type Step } from './session-step'

// see FR-033, SL-7b
export interface SelectionCopiedTask {
  readonly kind: 'task'
  readonly uids: readonly number[]
}

export interface SelectionCopiedRow {
  readonly kind: 'row'
  readonly groupId: string
}

export type SelectionCopied = SelectionCopiedTask | SelectionCopiedRow

export interface SelectionValuesStateCarried {
  readonly chosenRows: readonly string[]
  readonly chosenResources: readonly number[]
  // WHY: null is nothing copied yet; a paste then refuses (RS-27).
  readonly copiedForPaste: SelectionCopied | null
  readonly selectedObjects: Selection
}

export interface SelectionValuesEventCarried {
  readonly pickedObjects: Selection
  readonly rung: EscapeTarget
  readonly remainingObjects: Selection
  readonly createdTaskUid: number
  readonly chosenRows: readonly string[]
  readonly createdGroupId: string
  readonly chosenResources: readonly number[]
  readonly copiedForPaste: SelectionCopied
}

export type SelectionValuesEffect = never

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region selection (table T-293).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type SelectionValuesKey =
  | 'selection'
  | 'selectionStateMachine.nothingSelected'
  | 'selectionStateMachine.objectsSelected'

export type SelectionState =
  | { readonly kind: 'nothingSelected' }
  | { readonly kind: 'objectsSelected'; readonly selectedObjects: SelectionValuesStateCarried['selectedObjects'] }

export interface SelectionValues {
  readonly chosenRows: SelectionValuesStateCarried['chosenRows']
  readonly chosenResources: SelectionValuesStateCarried['chosenResources']
  readonly copiedForPaste: SelectionValuesStateCarried['copiedForPaste']
  readonly selectionState: SelectionState
}

export type SelectionValuesAxes = Omit<SelectionValues, 'chosenRows' | 'chosenResources' | 'copiedForPaste'>

export type SelectionValuesEvent =
  | { readonly type: 'objectsPicked'; readonly pickedObjects: SelectionValuesEventCarried['pickedObjects'] }
  | { readonly type: 'emptyAreaClicked' }
  | { readonly type: 'selectionEscapePressed'; readonly rung: SelectionValuesEventCarried['rung'] }
  | { readonly type: 'selectionSettleKeyPressed' }
  | { readonly type: 'selectionCleared' }
  | { readonly type: 'selectionPruned'; readonly remainingObjects: SelectionValuesEventCarried['remainingObjects'] }
  | { readonly type: 'createdTaskSelected'; readonly createdTaskUid: SelectionValuesEventCarried['createdTaskUid'] }
  | { readonly type: 'rowsPicked'; readonly chosenRows: SelectionValuesEventCarried['chosenRows'] }
  | { readonly type: 'createdRowSelected'; readonly createdGroupId: SelectionValuesEventCarried['createdGroupId'] }
  | { readonly type: 'resourcesPicked'; readonly chosenResources: SelectionValuesEventCarried['chosenResources'] }
  | { readonly type: 'copyTaken'; readonly copiedForPaste: SelectionValuesEventCarried['copiedForPaste'] }

export type SelectionValuesEffectName = never

const SELECTION_VALUES_INITIAL_AXES: SelectionValuesAxes = {
  selectionState: { kind: 'nothingSelected' },
}
// </generated>

type SelectionStep = Step<SelectionValues, SelectionValuesEffect>

type EventOf<T extends SelectionValuesEvent['type']> = Extract<SelectionValuesEvent, { readonly type: T }>

const NOTHING_SELECTED = SELECTION_VALUES_INITIAL_AXES.selectionState

const NO_CHOSEN_ROWS: readonly string[] = []

const NO_CHOSEN_RESOURCES: readonly number[] = []

export const emptySelectionValues: SelectionValues = {
  ...SELECTION_VALUES_INITIAL_AXES,
  chosenRows: NO_CHOSEN_ROWS,
  chosenResources: NO_CHOSEN_RESOURCES,
  copiedForPaste: null,
}

/** @purity pure */
function isSameObject(a: Selection['items'][number], b: Selection['items'][number]): boolean {
  const left: Readonly<Record<string, unknown>> = a
  const right: Readonly<Record<string, unknown>> = b
  const fields = Object.keys(left)
  return fields.length === Object.keys(right).length && fields.every((field) => left[field] === right[field])
}

/** @purity pure */
function isSameSelection(a: Selection, b: Selection): boolean {
  if (a === b) return true
  if (a.ordered !== b.ordered || a.items.length !== b.items.length) return false
  return a.items.every((item, index) => {
    const other = b.items[index]
    return other !== undefined && isSameObject(item, other)
  })
}

/** @purity pure */
function isSameList<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((one, index) => one === b[index])
}

/** @purity pure */
function isSameCopy(a: SelectionCopied | null, b: SelectionCopied): boolean {
  if (a === null || a.kind !== b.kind) return false
  if (a.kind === 'task') return isSameList(a.uids, (b as SelectionCopiedTask).uids)
  return a.groupId === (b as SelectionCopiedRow).groupId
}

// WHY: rewriting a carried value with the one it already holds changes nothing (SF-3, SD-3).
/** @purity pure */
function selected(values: SelectionValues, objects: Selection): SelectionStep {
  const current = values.selectionState
  if (current.kind === 'objectsSelected' && isSameSelection(current.selectedObjects, objects)) {
    return unchanged(values)
  }
  const selectionState: SelectionState = { kind: 'objectsSelected', selectedObjects: objects }
  return { state: { ...values, selectionState }, effects: NO_EFFECTS }
}

/** @purity pure */
function deselected(values: SelectionValues): SelectionStep {
  if (values.selectionState.kind === 'nothingSelected') return unchanged(values)
  return { state: { ...values, selectionState: NOTHING_SELECTED }, effects: NO_EFFECTS }
}

/** @purity pure */
function hasPickedObjects(event: EventOf<'objectsPicked'>): boolean {
  return event.pickedObjects.items.length > 0
}

/** @purity pure */
function hasRemainingObjects(event: EventOf<'selectionPruned'>): boolean {
  return event.remainingObjects.items.length > 0
}

/** @purity pure */
function isRungSelection(event: EventOf<'selectionEscapePressed'>): boolean {
  return event.rung === 'selection'
}

// WHY: an empty pick clears; with nothing selected it changes nothing (the fall-through of T-293).
/** @purity pure */
function onObjectsPicked(values: SelectionValues, event: EventOf<'objectsPicked'>): SelectionStep {
  return hasPickedObjects(event) ? selected(values, event.pickedObjects) : deselected(values)
}

// WHY: pruning only narrows what stands; it never selects from nothing (T-293).
/** @purity pure */
function onSelectionPruned(values: SelectionValues, event: EventOf<'selectionPruned'>): SelectionStep {
  if (values.selectionState.kind === 'nothingSelected') return unchanged(values)
  return hasRemainingObjects(event) ? selected(values, event.remainingObjects) : deselected(values)
}

// see IN-4
/** @purity pure */
function onSelectionEscapePressed(values: SelectionValues, event: EventOf<'selectionEscapePressed'>): SelectionStep {
  return isRungSelection(event) ? deselected(values) : unchanged(values)
}

// see FR-001, FR-091, TC-9
/** @purity pure */
function onCreatedTaskSelected(values: SelectionValues, event: EventOf<'createdTaskSelected'>): SelectionStep {
  return selected(values, selectionWith(emptySelection(), { kind: 'task', uid: event.createdTaskUid }))
}

/** @purity pure */
function withRows(values: SelectionValues, chosenRows: readonly string[]): SelectionStep {
  if (isSameList(values.chosenRows, chosenRows)) return unchanged(values)
  return { state: { ...values, chosenRows }, effects: NO_EFFECTS }
}

/** @purity pure */
function onRowsPicked(values: SelectionValues, event: EventOf<'rowsPicked'>): SelectionStep {
  return withRows(values, event.chosenRows)
}

/** @purity pure */
function onCreatedRowSelected(values: SelectionValues, event: EventOf<'createdRowSelected'>): SelectionStep {
  return withRows(values, [event.createdGroupId])
}

/** @purity pure */
function onResourcesPicked(values: SelectionValues, event: EventOf<'resourcesPicked'>): SelectionStep {
  const { chosenResources } = event
  if (isSameList(values.chosenResources, chosenResources)) return unchanged(values)
  return { state: { ...values, chosenResources }, effects: NO_EFFECTS }
}

// see FR-033, SK-4
/** @purity pure */
function onCopyTaken(values: SelectionValues, event: EventOf<'copyTaken'>): SelectionStep {
  const { copiedForPaste } = event
  if (isSameCopy(values.copiedForPaste, copiedForPaste)) return unchanged(values)
  return { state: { ...values, copiedForPaste }, effects: NO_EFFECTS }
}

const HANDLERS: {
  readonly [T in SelectionValuesEvent['type']]: (values: SelectionValues, event: EventOf<T>) => SelectionStep
} = {
  objectsPicked: onObjectsPicked,
  emptyAreaClicked: deselected,
  selectionEscapePressed: onSelectionEscapePressed,
  selectionSettleKeyPressed: deselected,
  selectionCleared: deselected,
  selectionPruned: onSelectionPruned,
  createdTaskSelected: onCreatedTaskSelected,
  rowsPicked: onRowsPicked,
  createdRowSelected: onCreatedRowSelected,
  resourcesPicked: onResourcesPicked,
  copyTaken: onCopyTaken,
}

// see SF-2, SF-8, T-293
/** @purity pure */
export function stepSelectionValues(values: SelectionValues, event: SelectionValuesEvent): SelectionStep {
  const handler = HANDLERS[event.type] as (values: SelectionValues, event: SelectionValuesEvent) => SelectionStep
  return handler(values, event)
}

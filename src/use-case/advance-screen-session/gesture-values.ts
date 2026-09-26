// GestureValues: the gesture region of the session and its transitions.
// @unit      UF-88   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type Step } from './session-step'

// WHY: the translator's PressRow again; UseCase may not read an Adapter type (table T-061).
export type GesturePressRow = 'PTD-1' | 'PTD-2' | 'PTD-3' | 'PTD-4' | 'PTD-4a' | 'PTD-5'

export type GrabbedRowAxis = 'position' | 'depth'

// WHY: what was pressed, never where -- a point is a frame value (SF-5).
export type PressedOn =
  | { readonly kind: 'grab'; readonly grabRow: string; readonly itemId: string }
  | { readonly kind: 'entry'; readonly entry: string }
  | { readonly kind: 'paletteBand' }
  | { readonly kind: 'panelBorder'; readonly panel: 'rowTitlePanel' | 'propertiesPanel' }
  | { readonly kind: 'rowGrabStrip'; readonly rowGroupId: string }
  | { readonly kind: 'scrollbarThumb'; readonly axis: 'horizontal' | 'vertical' }
  | { readonly kind: 'otherPart'; readonly part: string }

export interface GestureValuesStateCarried {
  readonly pressRow: GesturePressRow
  readonly pressedOn: PressedOn | null
}

export interface GestureValuesEventCarried {
  readonly pressRow: GesturePressRow
  readonly pressedOn: PressedOn | null
  readonly axis: GrabbedRowAxis
}

export type GestureValuesEffect = { readonly type: GestureValuesEffectName }

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region gesture (table T-289).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type GestureValuesKey =
  | 'gesture'
  | 'pointerPressStateMachine.notPressed'
  | 'pointerPressStateMachine.changingDocument'
  | 'pointerPressStateMachine.viewingDocument'
  | 'rowGrabStateMachine.notGrabbed'
  | 'rowGrabStateMachine.axisUndecided'
  | 'rowGrabStateMachine.changingPosition'
  | 'rowGrabStateMachine.changingDepth'

export type PointerPressState =
  | { readonly kind: 'notPressed' }
  | { readonly kind: 'changingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; readonly pressedOn: GestureValuesStateCarried['pressedOn'] }
  | { readonly kind: 'viewingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; readonly pressedOn: GestureValuesStateCarried['pressedOn'] }

export type RowGrabState =
  | { readonly kind: 'notGrabbed' }
  | { readonly kind: 'axisUndecided' }
  | { readonly kind: 'changingPosition' }
  | { readonly kind: 'changingDepth' }

export interface GestureValues {
  readonly pointerPressState: PointerPressState
  readonly rowGrabState: RowGrabState
}

export type GestureValuesAxes = Omit<GestureValues, never>

export type GestureValuesEvent =
  | { readonly type: 'pointerPressed'; readonly pressRow: GestureValuesEventCarried['pressRow']; readonly pressedOn: GestureValuesEventCarried['pressedOn'] }
  | { readonly type: 'pointerReleased' }
  | { readonly type: 'pressInterrupted' }
  | { readonly type: 'rowGrabAxisSettled'; readonly axis: GestureValuesEventCarried['axis'] }
  | { readonly type: 'entryRepeatTimeElapsed' }

export type GestureValuesEffectName =
  | 'startEntryRepeat'
  | 'restorePaletteCorner'
  | 'repeatHeldEntry'

const GESTURE_VALUES_INITIAL_AXES: GestureValuesAxes = {
  pointerPressState: { kind: 'notPressed' },
  rowGrabState: { kind: 'notGrabbed' },
}
// </generated>

type GestureStep = Step<GestureValues, GestureValuesEffect>

type EventOf<T extends GestureValuesEvent['type']> = Extract<GestureValuesEvent, { readonly type: T }>

// see T-289
export const emptyGestureValues: GestureValues = { ...GESTURE_VALUES_INITIAL_AXES }

// TRAP: copies of the shell's REPEATING_ENTRIES and PRESS_CHANGES_DOCUMENT until wave B of CR-450
// has the shell read these; the two must not drift before then.
const REPEATING_ENTRIES: readonly string[] = ['IC-12', 'IC-13', 'IC-14', 'IC-15']

const VIEWING_PRESS_ROWS: readonly GesturePressRow[] = ['PTD-1', 'PTD-5']

// see FR-018
/** @purity pure */
function isOnRepeatingEntry(pressedOn: PressedOn | null): boolean {
  return pressedOn?.kind === 'entry' && REPEATING_ENTRIES.includes(pressedOn.entry)
}

// TRAP: ask the place before the row; a press on a drawn entry lands on PTD-5, so the row first
// would take AG-9 off every palette press. A scrollbar drag writes only the display (UN-8).
// see AG-9, WS-2
/** @purity pure */
function isDocumentChangingPress(pressRow: GesturePressRow, pressedOn: PressedOn | null): boolean {
  if (pressedOn === null || pressedOn.kind === 'grab') return !VIEWING_PRESS_ROWS.includes(pressRow)
  if (pressedOn.kind === 'scrollbarThumb') return false
  return pressedOn.kind !== 'entry' || !isOnRepeatingEntry(pressedOn)
}

/** @purity pure */
function isOnPaletteBand(pressedOn: PressedOn | null): boolean {
  return pressedOn?.kind === 'paletteBand'
}

/** @purity pure */
function isRowGrabStrip(pressedOn: PressedOn | null): boolean {
  return pressedOn?.kind === 'rowGrabStrip'
}

/** @purity pure */
function isPositionAxis(axis: GrabbedRowAxis): boolean {
  return axis === 'position'
}

// WHY: a machine the event leaves alone keeps its reference, and so does the region (SD-3, SF-3).
/** @purity pure */
function combined(
  values: GestureValues,
  press: PointerPressState,
  rowGrab: RowGrabState,
  effects: readonly GestureValuesEffect[],
): GestureStep {
  if (press === values.pointerPressState && rowGrab === values.rowGrabState) {
    return effects.length === 0 ? unchanged(values) : { state: values, effects }
  }
  return { state: { ...values, pointerPressState: press, rowGrabState: rowGrab }, effects }
}

/** @purity pure */
function onPointerPressed(values: GestureValues, event: EventOf<'pointerPressed'>): GestureStep {
  const { pointerPressState: press, rowGrabState: rowGrab } = values
  const carried = { pressRow: event.pressRow, pressedOn: event.pressedOn }
  const isChanging = isDocumentChangingPress(event.pressRow, event.pressedOn)
  const pressed: PointerPressState =
    press.kind !== 'notPressed' ? press : { kind: isChanging ? 'changingDocument' : 'viewingDocument', ...carried }
  const repeats = press.kind === 'notPressed' && !isChanging && isOnRepeatingEntry(event.pressedOn)
  const effects: readonly GestureValuesEffect[] = repeats ? [{ type: 'startEntryRepeat' }] : NO_EFFECTS
  const grabbed: RowGrabState =
    rowGrab.kind === 'notGrabbed' && isRowGrabStrip(event.pressedOn) ? { kind: 'axisUndecided' } : rowGrab
  return combined(values, pressed, grabbed, effects)
}

// WHY: releasing and interrupting end both machines alike (IN-1, IN-1a); only an interruption on
// the palette band asks for the corner back (FR-053).
/** @purity pure */
function ended(values: GestureValues, isInterrupted: boolean): GestureStep {
  const { pointerPressState: press, rowGrabState: rowGrab } = values
  const restores = isInterrupted && press.kind !== 'notPressed' && isOnPaletteBand(press.pressedOn)
  const effects: readonly GestureValuesEffect[] = restores ? [{ type: 'restorePaletteCorner' }] : NO_EFFECTS
  const released = press.kind === 'notPressed' ? press : GESTURE_VALUES_INITIAL_AXES.pointerPressState
  const ungrabbed = rowGrab.kind === 'notGrabbed' ? rowGrab : GESTURE_VALUES_INITIAL_AXES.rowGrabState
  return combined(values, released, ungrabbed, effects)
}

// WHY: a decided axis finds no cell and keeps its reference until release (HF-15).
/** @purity pure */
function onRowGrabAxisSettled(values: GestureValues, event: EventOf<'rowGrabAxisSettled'>): GestureStep {
  if (values.rowGrabState.kind !== 'axisUndecided') return unchanged(values)
  const settled: RowGrabState = { kind: isPositionAxis(event.axis) ? 'changingPosition' : 'changingDepth' }
  return combined(values, values.pointerPressState, settled, NO_EFFECTS)
}

// WHY: a tick that arrives after the press ended finds no cell, so the shell need not ask again.
/** @purity pure */
function onEntryRepeatTimeElapsed(values: GestureValues): GestureStep {
  const press = values.pointerPressState
  if (press.kind !== 'viewingDocument' || !isOnRepeatingEntry(press.pressedOn)) return unchanged(values)
  return { state: values, effects: [{ type: 'repeatHeldEntry' }] }
}

const HANDLERS: {
  readonly [T in GestureValuesEvent['type']]: (values: GestureValues, event: EventOf<T>) => GestureStep
} = {
  pointerPressed: onPointerPressed,
  pointerReleased: (values) => ended(values, false),
  pressInterrupted: (values) => ended(values, true),
  rowGrabAxisSettled: onRowGrabAxisSettled,
  entryRepeatTimeElapsed: onEntryRepeatTimeElapsed,
}

// see SF-2, SF-8, T-289
/** @purity pure */
export function stepGestureValues(values: GestureValues, event: GestureValuesEvent): GestureStep {
  const handler = HANDLERS[event.type] as (values: GestureValues, event: GestureValuesEvent) => GestureStep
  return handler(values, event)
}

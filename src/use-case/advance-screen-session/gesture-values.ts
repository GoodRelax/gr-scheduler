// GestureValues: the gesture region of the session and its transitions.
// @unit      UF-88   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import { NO_EFFECTS, unchanged, type GuardJudgments, type Step } from './session-step'

// WHY: the translator's PressRow again; UseCase may not read an Adapter type (table T-061).
export type GesturePressRow = 'PTD-7' | 'PTD-1' | 'PTD-2' | 'PTD-3' | 'PTD-4' | 'PTD-4a' | 'PTD-5'

// WHY: what was pressed, never where -- a point is a frame value (SF-5).
export type PressedOn =
  | { readonly kind: 'grab'; readonly grabTaskGroup: string; readonly itemId: string }
  | { readonly kind: 'entry'; readonly entry: string }
  | { readonly kind: 'paletteBand' }
  | { readonly kind: 'panelBorder'; readonly panel: 'taskGroupPanel' | 'propertiesPanel' }
  | { readonly kind: 'taskGroupGrabStrip'; readonly taskGroupId: string }
  | { readonly kind: 'scrollbarThumb'; readonly axis: 'horizontal' | 'vertical' }
  | { readonly kind: 'otherPart'; readonly part: string }

export interface GestureValuesStateCarried {
  readonly pressRow: GesturePressRow
  readonly pressedOn: PressedOn | null
}

export interface GestureValuesEventCarried {
  readonly pressRow: GesturePressRow
  readonly pressedOn: PressedOn | null
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
  | 'taskGroupGrabStateMachine.notGrabbed'
  | 'taskGroupGrabStateMachine.grabbed'
  | 'taskGroupGrabStateMachine.grabbed.grabPressed'
  | 'taskGroupGrabStateMachine.grabbed.carrying'

export type TaskGroupGrabGrabbedState =
  | { readonly kind: 'grabPressed' }
  | { readonly kind: 'carrying' }

export type PointerPressState =
  | { readonly kind: 'notPressed' }
  | { readonly kind: 'changingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; readonly pressedOn: GestureValuesStateCarried['pressedOn'] }
  | { readonly kind: 'viewingDocument'; readonly pressRow: GestureValuesStateCarried['pressRow']; readonly pressedOn: GestureValuesStateCarried['pressedOn'] }

export type TaskGroupGrabState =
  | { readonly kind: 'notGrabbed' }
  | { readonly kind: 'grabbed'; readonly child: TaskGroupGrabGrabbedState }

export interface GestureValues {
  readonly pointerPressState: PointerPressState
  readonly taskGroupGrabState: TaskGroupGrabState
}

export type GestureValuesAxes = Omit<GestureValues, never>

export type GestureValuesEvent =
  | { readonly type: 'pointerPressed'; readonly pressRow: GestureValuesEventCarried['pressRow']; readonly pressedOn: GestureValuesEventCarried['pressedOn'] }
  | { readonly type: 'pointerReleased' }
  | { readonly type: 'pressInterrupted' }
  | { readonly type: 'taskGroupGrabTravelPassed' }
  | { readonly type: 'entryRepeatTimeElapsed' }

export type GestureValuesEffectName =
  | 'startEntryRepeat'
  | 'restorePaletteCorner'
  | 'repeatHeldEntry'

export type GestureValuesGuardName =
  | 'isDocumentChangingPress'
  | 'isHeldOnRepeatingEntry'
  | 'isOnPaletteBand'
  | 'isOnRepeatingEntry'
  | 'isTaskGroupGrabStrip'

const GESTURE_VALUES_INITIAL_CHILDREN: {
  readonly 'taskGroupGrabStateMachine.grabbed': TaskGroupGrabGrabbedState
} = {
  'taskGroupGrabStateMachine.grabbed': { kind: 'grabPressed' },
}

const GESTURE_VALUES_INITIAL_AXES: GestureValuesAxes = {
  pointerPressState: { kind: 'notPressed' },
  taskGroupGrabState: { kind: 'notGrabbed' },
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
function isRepeatingEntry(pressedOn: PressedOn | null): boolean {
  return pressedOn?.kind === 'entry' && REPEATING_ENTRIES.includes(pressedOn.entry)
}

/** @purity pure */
function heldPressedOn(values: GestureValues): PressedOn | null {
  const press = values.pointerPressState
  return press.kind === 'notPressed' ? null : press.pressedOn
}

// TRAP: ask the place before the row; a press on a drawn entry lands on PTD-5, so the row first
// would take AG-9 off every palette press. A scrollbar drag writes only the display (UN-8).
// see AG-9, WS-2
/** @purity pure */
function isDocumentChangingPress(event: EventOf<'pointerPressed'>): boolean {
  const pressedOn = event.pressedOn
  if (pressedOn === null || pressedOn.kind === 'grab') return !VIEWING_PRESS_ROWS.includes(event.pressRow)
  if (pressedOn.kind === 'scrollbarThumb') return false
  return pressedOn.kind !== 'entry' || !isRepeatingEntry(pressedOn)
}

const GESTURE_VALUES_GUARDS = {
  isDocumentChangingPress,
  isHeldOnRepeatingEntry: (values: GestureValues): boolean => isRepeatingEntry(heldPressedOn(values)),
  isOnPaletteBand: (values: GestureValues): boolean => heldPressedOn(values)?.kind === 'paletteBand',
  isOnRepeatingEntry: (event: EventOf<'pointerPressed'>): boolean => isRepeatingEntry(event.pressedOn),
  isTaskGroupGrabStrip: (event: EventOf<'pointerPressed'>): boolean => event.pressedOn?.kind === 'taskGroupGrabStrip',
} satisfies GuardJudgments<GestureValuesGuardName>

// WHY: a machine the event leaves alone keeps its reference, and so does the region (SD-3, SF-3).
/** @purity pure */
function combined(
  values: GestureValues,
  press: PointerPressState,
  taskGroupGrab: TaskGroupGrabState,
  effects: readonly GestureValuesEffect[],
): GestureStep {
  if (press === values.pointerPressState && taskGroupGrab === values.taskGroupGrabState) {
    return effects.length === 0 ? unchanged(values) : { state: values, effects }
  }
  return { state: { ...values, pointerPressState: press, taskGroupGrabState: taskGroupGrab }, effects }
}

/** @purity pure */
function onPointerPressed(values: GestureValues, event: EventOf<'pointerPressed'>): GestureStep {
  const { pointerPressState: press, taskGroupGrabState: taskGroupGrab } = values
  const carried = { pressRow: event.pressRow, pressedOn: event.pressedOn }
  const isChanging = GESTURE_VALUES_GUARDS.isDocumentChangingPress(event)
  const pressed: PointerPressState =
    press.kind !== 'notPressed' ? press : { kind: isChanging ? 'changingDocument' : 'viewingDocument', ...carried }
  const repeats = press.kind === 'notPressed' && !isChanging && GESTURE_VALUES_GUARDS.isOnRepeatingEntry(event)
  const effects: readonly GestureValuesEffect[] = repeats ? [{ type: 'startEntryRepeat' }] : NO_EFFECTS
  const isGrabbing = taskGroupGrab.kind === 'notGrabbed' && GESTURE_VALUES_GUARDS.isTaskGroupGrabStrip(event)
  const child = GESTURE_VALUES_INITIAL_CHILDREN['taskGroupGrabStateMachine.grabbed']
  const grabbed: TaskGroupGrabState = isGrabbing ? { kind: 'grabbed', child } : taskGroupGrab
  return combined(values, pressed, grabbed, effects)
}

// WHY: releasing and interrupting end both machines alike (IN-1, IN-1a); only an interruption on
// the palette band asks for the corner back (FR-053).
/** @purity pure */
function ended(values: GestureValues, isInterrupted: boolean): GestureStep {
  const { pointerPressState: press, taskGroupGrabState: taskGroupGrab } = values
  const restores = isInterrupted && GESTURE_VALUES_GUARDS.isOnPaletteBand(values)
  const effects: readonly GestureValuesEffect[] = restores ? [{ type: 'restorePaletteCorner' }] : NO_EFFECTS
  const released = press.kind === 'notPressed' ? press : GESTURE_VALUES_INITIAL_AXES.pointerPressState
  const ungrabbed = taskGroupGrab.kind === 'notGrabbed' ? taskGroupGrab : GESTURE_VALUES_INITIAL_AXES.taskGroupGrabState
  return combined(values, released, ungrabbed, effects)
}

// WHY: a carried grab finds no cell and keeps its reference until release (HF-15, S-208).
/** @purity pure */
function onTaskGroupGrabTravelPassed(values: GestureValues): GestureStep {
  if (values.taskGroupGrabState.kind !== 'grabbed' || values.taskGroupGrabState.child.kind !== 'grabPressed') return unchanged(values)
  const carrying: TaskGroupGrabState = { kind: 'grabbed', child: { kind: 'carrying' } }
  return combined(values, values.pointerPressState, carrying, NO_EFFECTS)
}

// WHY: a tick that arrives after the press ended finds no cell, so the shell need not ask again.
/** @purity pure */
function onEntryRepeatTimeElapsed(values: GestureValues): GestureStep {
  const press = values.pointerPressState
  if (press.kind !== 'viewingDocument' || !GESTURE_VALUES_GUARDS.isHeldOnRepeatingEntry(values)) return unchanged(values)
  return { state: values, effects: [{ type: 'repeatHeldEntry' }] }
}

const HANDLERS: {
  readonly [T in GestureValuesEvent['type']]: (values: GestureValues, event: EventOf<T>) => GestureStep
} = {
  pointerPressed: onPointerPressed,
  pointerReleased: (values) => ended(values, false),
  pressInterrupted: (values) => ended(values, true),
  taskGroupGrabTravelPassed: onTaskGroupGrabTravelPassed,
  entryRepeatTimeElapsed: onEntryRepeatTimeElapsed,
}

// see SF-2, SF-8, T-289
/** @purity pure */
export function stepGestureValues(values: GestureValues, event: GestureValuesEvent): GestureStep {
  const handler = HANDLERS[event.type] as (values: GestureValues, event: GestureValuesEvent) => GestureStep
  return handler(values, event)
}

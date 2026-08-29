// Unit tests for UF-50 `dom-input-source.ts` -- table T-075 of
// docs/spec/05-07-design.md, component `DomInputSource` (CP-27 of table T-062),
// published as PI-27 of table T-064. It is the implementation of `InputSource`
// (IF-2 of table T-065).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, §1). What was read: docs/spec/ for every rule below, the
// seam declaration `src/adapter/input-command-translator/input-source.ts`, and
// of the unit itself only its head comment, its two published interfaces
// (`InputHost`, `PointerCaptureTarget`) and the one signature
// `domInputSource(host, isBrowserDefaultStopped): InputSource`. Every expected
// value here comes from a requirement, a table, or a recorded provisional
// decision -- never from the implementation.
//
// ⭐ WHY THE FAKE IS SHAPED THE WAY IT IS. This is a Framework unit: it talks
// to the browser, and `npm test` runs under Node with no DOM at all. R7.3 asks
// for the outside to be handed in rather than reached for, so the unit takes
// the browser as an argument and these cases hand it `fakeHost()` instead.
// ⚠️ R6.3 warns that a fake can quietly become the thing under test, so the
// cases below assert what the unit DID to the fake -- which listeners it
// registered and with what options, in which order it asked and told, which
// capture calls it made, which events it called `preventDefault` on -- and not
// merely that a call came back. The fake carries ONLY the five members
// `InputHost` declares and the three `PointerCaptureTarget` declares, so a unit
// that reached for a sixth would fail rather than pass quietly.
//
// The rules these cases answer to:
//   表 T-065 IF-2   the seam this unit implements, and (with the note under
//                   表 T-078) the rule that its supply is not widened -- no
//                   member reports a size, a time or a date
//   表 T-078 FT-1   a person's input is a trigger of a frame; with NFR-010,
//                   nothing this table does not list may wake one
//   表 T-060 LY-5   the Framework is the only layer that may hold a current
//                   value -- the gesture in flight lives here
//   IN-1            a pointer operation settles on RELEASE, not on press
//                   (MUST); the pointer leaving the drawing area may not be
//                   read as an interruption (MUST NOT)
//   IN-1a           a pointer lost outside the window before the button was
//                   released ends the drag as an abort (MUST)
//   IN-4 / IN-4a    `Esc` consumes one level only when there is something to
//                   consume; with nothing to consume it MUST reach the browser
//   IN-5a           `Ctrl+C` / `Ctrl+V` during unsettled text entry reach the
//                   browser as character operations (MUST)
//   MK-10           the browser's own behaviour is stopped for an input this
//                   tool assigned (MUST) and NOT stopped for one it did not
//                   (MUST NOT); the canvas alone is not enough
//   MK-12           the unit of an assignment is the COMBINATION, so all four
//                   modifiers travel together
//   MK-13           how many presses in a row -- counted here, because telling
//                   a double click from two single ones is a question about
//                   elapsed time
//   MK-1 〜 MK-5    one wheel happening carries both magnitudes; S-96 says why
//                   (「1 ノッチで何倍動くかは入力装置に依存する」)
//   表 T-036        the spelling of the assignment column
//   表 T-035 AG-9   the harm IN-1a avoids: a drag that never ends refuses every
//                   later `Agent API` write
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one test walking every row.
// T_036_KEYS, T_023_BUTTONS, WHEEL_TURNS, MK_13_RUNS and NOT_LISTENED_FOR are
// those copies; the T-036 one is checked against the table itself at read time
// so that it cannot fall behind a new row.
//
// ⚠️ THREE THINGS ARE DELIBERATELY NOT ASSERTED, because no requirement decides
// them. Each is written down where it would otherwise have been tested, so a
// reader can tell an untested question from an untested unit:
//   - what a SIDEWAYS detent, or a detent reported by the PAGE, is worth
//     (`TURNS_WHOSE_DETENTS_NO_ROW_STATES`)
//   - whether a press of another button inside the interval merely starts its
//     own run or also ends the first one (`MK_13_RUNS`)
//   - what must happen when the host's own capture API throws (the comment
//     above the last describe)

import { describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  InputSource,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import {
  domInputSource,
  type InputHost,
  type PointerCaptureTarget,
} from '../../src/framework/dom-input-source/dom-input-source'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that
// takes the copy from the .md at read time, which is what keeps the roster
// below from falling behind a row added to 表 T-036.
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-036 — ショートカットキーの割当, as the host would report each press.
 *
 * `key` is the column's own spelling, which is what `KeyInput.key` carries.
 * ⚠️ `SK-1` / `SK-1a` are deliberately absent: their assignment cell is `—`,
 * and the note under the table says such a row 「その経路を持たないと定めた記録
 * であって、割当ではない」.
 *
 * ⚠️ `hostKey` / `hostCode` are what a common layout actually reports, which is
 * the whole difficulty of `SK-16` and `SK-16a`: `Shift`＋`-` arrives as `_` and
 * `Alt`＋`+` arrives as `=`, so only the physical key is the same in both
 * (PD-93).
 */
const T_036_KEYS = [
  { row: 'SK-19', hostKey: 'Enter', hostCode: 'Enter', mods: {}, key: 'Enter' },
  { row: 'SK-2', hostKey: 'a', hostCode: 'KeyA', mods: { ctrl: true }, key: 'A' },
  { row: 'SK-3', hostKey: 'Delete', hostCode: 'Delete', mods: {}, key: 'Delete' },
  { row: 'SK-3', hostKey: 'Backspace', hostCode: 'Backspace', mods: {}, key: 'Backspace' },
  { row: 'SK-4', hostKey: 'c', hostCode: 'KeyC', mods: { ctrl: true }, key: 'C' },
  { row: 'SK-5', hostKey: 'v', hostCode: 'KeyV', mods: { ctrl: true }, key: 'V' },
  { row: 'SK-6', hostKey: 'z', hostCode: 'KeyZ', mods: { ctrl: true }, key: 'Z' },
  { row: 'SK-7', hostKey: 'y', hostCode: 'KeyY', mods: { ctrl: true }, key: 'Y' },
  { row: 'SK-7', hostKey: 'Z', hostCode: 'KeyZ', mods: { ctrl: true, shift: true }, key: 'Z' },
  { row: 'SK-8', hostKey: 'Escape', hostCode: 'Escape', mods: {}, key: 'Esc' },
  { row: 'SK-9', hostKey: 'F2', hostCode: 'F2', mods: {}, key: 'F2' },
  { row: 'SK-10', hostKey: 'o', hostCode: 'KeyO', mods: { ctrl: true }, key: 'O' },
  { row: 'SK-11', hostKey: 's', hostCode: 'KeyS', mods: { ctrl: true }, key: 'S' },
  { row: 'SK-12', hostKey: 'E', hostCode: 'KeyE', mods: { ctrl: true, shift: true }, key: 'E' },
  { row: 'SK-13', hostKey: 'F1', hostCode: 'F1', mods: {}, key: 'F1' },
  { row: 'SK-14', hostKey: 'p', hostCode: 'KeyP', mods: {}, key: 'P' },
  { row: 'SK-15', hostKey: 'F11', hostCode: 'F11', mods: {}, key: 'F11' },
  { row: 'SK-16', hostKey: '+', hostCode: 'Equal', mods: { shift: true }, key: '+' },
  { row: 'SK-16', hostKey: '_', hostCode: 'Minus', mods: { shift: true }, key: '-' },
  { row: 'SK-16a', hostKey: '=', hostCode: 'Equal', mods: { alt: true }, key: '+' },
  { row: 'SK-16a', hostKey: '-', hostCode: 'Minus', mods: { alt: true }, key: '-' },
  { row: 'SK-17', hostKey: '0', hostCode: 'Digit0', mods: { ctrl: true }, key: '0' },
  { row: 'SK-18', hostKey: 'f', hostCode: 'KeyF', mods: {}, key: 'F' },
  { row: 'SK-20', hostKey: 'd', hostCode: 'KeyD', mods: { ctrl: true, shift: true }, key: 'D' },
  // ⭐ CR-280 put `SK-21`「開いているファイルを読み直す」`Ctrl` ＋ `R` in the
  // place the retired autosave left (rule OP-13 of table T-024a).
  { row: 'SK-21', hostKey: 'r', hostCode: 'KeyR', mods: { ctrl: true }, key: 'R' },
] as const

/**
 * The same three signs off the numeric keypad. PD-93 recognises `+` / `-` / `0`
 * by the physical key, and the keypad is the second physical key that produces
 * each of them.
 */
const T_036_NUMPAD = [
  { row: 'SK-16', hostKey: '+', hostCode: 'NumpadAdd', mods: { shift: true }, key: '+' },
  { row: 'SK-16', hostKey: '-', hostCode: 'NumpadSubtract', mods: { shift: true }, key: '-' },
  { row: 'SK-17', hostKey: '0', hostCode: 'Numpad0', mods: { ctrl: true }, key: '0' },
] as const

/**
 * The buttons of 表 T-023. `MK-7` names the middle one and `MK-6` / `MK-8` /
 * `MK-11` the left; the right has no row, and the seam carries it anyway
 * because `MK-10` needs the translator to see that the press was not this
 * tool's. ⚠️ A host also numbers the back and forward buttons (3 and 4), and
 * no row of any table assigns them.
 */
const T_023_BUTTONS = [
  { hostButton: 0, button: 'left', assigned: true },
  { hostButton: 1, button: 'middle', assigned: true },
  { hostButton: 2, button: 'right', assigned: true },
  { hostButton: 3, button: null, assigned: false },
  { hostButton: 4, button: null, assigned: false },
] as const

/**
 * What a host may report a wheel turn in, and what one turn is worth in each.
 *
 * ⭐ S-96 states outright that 「1 ノッチで何倍動くかは入力装置に依存する」,
 * which is why one happening carries BOTH magnitudes: `notches` for the zoom
 * rows (`MK-2` 〜 `MK-4`, whose step S-53 is stated per notch) and `scrollPx`
 * for the scroll rows (`MK-1` / `MK-5`, for which no row gives a day per
 * notch). ⚠️ The divisors that recover one from the other are PD-91's
 * recommendation, not a decided value: 40 px per line, 100 px per notch, 3
 * lines per notch, and the host's own `innerWidth` / `innerHeight` for a page.
 * These cases are the ones that fail if that recommendation is reversed.
 */
const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

const HOST_INNER_WIDTH = 1280
const HOST_INNER_HEIGHT = 800

const WHEEL_TURNS = [
  {
    why: 'one notch reported in pixels',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 100,
    notches: 1,
    scrollPx: { x: 0, y: 100 },
  },
  {
    why: 'the same turn away from the person',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: -100,
    notches: -1,
    scrollPx: { x: 0, y: -100 },
  },
  {
    why: 'a trackpad turn smaller than one notch',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 50,
    notches: 0.5,
    scrollPx: { x: 0, y: 50 },
  },
  {
    why: 'one notch reported in lines',
    deltaMode: DOM_DELTA_LINE,
    deltaX: 0,
    deltaY: 3,
    notches: 1,
    scrollPx: { x: 0, y: 120 },
  },
  {
    why: 'a turn of nothing at all',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 0,
    deltaY: 0,
    notches: 0,
    scrollPx: { x: 0, y: 0 },
  },
] as const

/**
 * The turns whose PIXELS are settled but whose DETENTS nothing settles.
 *
 * ⛔ `notches` is deliberately not stated here, and the omission is the point.
 *
 *   - SIDEWAYS. The seam calls a detent 「positive when the wheel was turned
 *     TOWARD the person -- the direction that reads a document further down」,
 *     which names one axis and settles nothing about the other, and no row of
 *     表 T-023 says what a sideways detent is worth. ⚠️ It cannot be zero
 *     either: `MK-3` assigns `Shift`＋ホイール to the horizontal zoom, whose
 *     step S-53 is stated per notch, and a common host reports a shifted wheel
 *     turn in `deltaX` rather than `deltaY`.
 *   - BY THE PAGE. PD-91 recommends a figure for pixels-per-line and
 *     pixels-per-notch and states that a page is measured in the host's own
 *     `innerWidth` / `innerHeight` -- it names no pages-per-notch figure, and
 *     neither does any table.
 *
 * ⭐ So these cases assert the pixels exactly (`MK-1` and `MK-5` need a
 * distance, because the scroll position is an anchor in the document -- S-77 /
 * S-78) and assert of the detents only that a turn produced some.
 */
const TURNS_WHOSE_DETENTS_NO_ROW_STATES = [
  {
    why: 'sideways, reported in pixels (MK-5)',
    deltaMode: DOM_DELTA_PIXEL,
    deltaX: 100,
    deltaY: 0,
    scrollPx: { x: 100, y: 0 },
  },
  {
    why: 'sideways, reported in lines (MK-3 as a common host reports it)',
    deltaMode: DOM_DELTA_LINE,
    deltaX: 3,
    deltaY: 0,
    scrollPx: { x: 120, y: 0 },
  },
  {
    why: 'sideways by a page, measured in the host own window',
    deltaMode: DOM_DELTA_PAGE,
    deltaX: 1,
    deltaY: 0,
    scrollPx: { x: HOST_INNER_WIDTH, y: 0 },
  },
  {
    why: 'down by a page, measured in the host own window (MK-1)',
    deltaMode: DOM_DELTA_PAGE,
    deltaX: 0,
    deltaY: 1,
    scrollPx: { x: 0, y: HOST_INNER_HEIGHT },
  },
] as const

/**
 * `MK-13` — how many presses in a row. Each run is a list of presses, given as
 * the gap in milliseconds and the distance in pixels from the press before it,
 * with the count each press must answer.
 *
 * ⚠️ Neither figure is in the specification. PD-90 recommends 500 ms and 4 px,
 * measured press-to-press and kept per button; `500` and `4` below are the two
 * places that fail if that is reversed.
 */
const MK_13_RUNS = [
  {
    why: 'two presses inside the interval, at the same point',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 0, hostButton: 0, count: 2 },
    ],
  },
  {
    why: 'two presses too far apart in time',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 900, dx: 0, hostButton: 0, count: 1 },
    ],
  },
  {
    why: 'two presses too far apart in place',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 10, hostButton: 0, count: 1 },
    ],
  },
  {
    why: 'two presses a hand tremor apart',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 400, dx: 3, hostButton: 0, count: 2 },
    ],
  },
  {
    why: 'three presses in a row',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 100, dx: 0, hostButton: 0, count: 2 },
      { afterMs: 100, dx: 0, hostButton: 0, count: 3 },
    ],
  },
  {
    // A double click is two presses of the SAME button, so a press of another
    // button inside the interval begins a run of its own rather than joining.
    why: 'another button inside the interval does not continue the run',
    presses: [
      { afterMs: 0, dx: 0, hostButton: 0, count: 1 },
      { afterMs: 100, dx: 0, hostButton: 2, count: 1 },
    ],
  },
] as const

/**
 * ⛔ What this unit may not listen for.
 *
 * NFR-010 forbids waking a frame on anything 表 T-078 does not list (MUST NOT),
 * and the note under that table says the window's size (`FT-3`) and the clock
 * (`FT-4`) are the shell's to observe. `IN-1` forbids reading the pointer
 * leaving the drawing area as an interruption (MUST NOT), so the events that
 * report exactly that may not be listened for either -- the pointer is captured
 * instead. `MK-10`'s MUST NOT leaves the context menu to the browser, because
 * the right button has no row in 表 T-023.
 */
const NOT_LISTENED_FOR = [
  { type: 'resize', why: 'FT-3 of 表 T-078 -- the shell observes the size' },
  { type: 'scroll', why: 'FT-3 of 表 T-078' },
  { type: 'blur', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'focus', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'visibilitychange', why: 'not a trigger 表 T-078 lists (NFR-010)' },
  { type: 'contextmenu', why: 'MK-10 -- the right button has no row in 表 T-023' },
  { type: 'pointerout', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'pointerleave', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'pointerover', why: 'IN-1 -- entering is not a happening either' },
  { type: 'mouseleave', why: 'IN-1 -- leaving is not an interruption (MUST NOT)' },
  { type: 'mousedown', why: 'IN-1a needs the pointer identity a mouse event lacks' },
  { type: 'click', why: 'IN-1 -- down and up are separate happenings' },
  { type: 'dblclick', why: 'MK-13 is counted here, not taken from the host' },
  { type: 'keyup', why: '表 T-036 assigns nothing to a release' },
  { type: 'keypress', why: '表 T-036 assigns nothing to it' },
] as const

/** The seven the unit is allowed. Every one reports a happening FT-1 names. */
const LISTENED_FOR = [
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'lostpointercapture',
  'wheel',
  'keydown',
] as const

/**
 * The five on which the unit ever stops the browser (`MK-10`). A listener
 * registered as passive cannot stop anything, and on a window `wheel` is
 * passive by default -- so leaving it out would silently let the page zoom
 * under `MK-2`.
 */
const MUST_NOT_BE_PASSIVE = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown'] as const

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const modifiersOf = (over: Partial<InputModifiers>): InputModifiers => ({ ...NO_MODIFIERS, ...over })

// ---------------------------------------------------------------------------
// The browser, faked. Only the members InputHost and PointerCaptureTarget
// declare -- a unit that reached for a sixth would fail here rather than pass.
// ---------------------------------------------------------------------------

interface Registration {
  readonly type: string
  readonly listener: EventListenerOrEventListenerObject
  readonly capture: boolean
}

type Fake<T> = T & { preventDefault(): void; preventedCount(): number }

/** Wraps a plain object literal so a case can count what was stopped. */
function withPreventDefault<T extends object>(fields: T): Fake<T> {
  let prevented = 0
  return {
    ...fields,
    preventDefault(): void {
      prevented += 1
    },
    preventedCount(): number {
      return prevented
    },
  }
}

const captureOf = (options: boolean | AddEventListenerOptions | undefined): boolean =>
  typeof options === 'boolean' ? options : (options?.capture ?? false)

interface HostOptions {
  readonly innerWidth?: number
  readonly innerHeight?: number
}

interface FakeHost {
  readonly host: InputHost
  /** Every registration, in the order it was made. */
  readonly added: readonly Registration[]
  /** Every removal, in the order it was made. */
  readonly removed: readonly Registration[]
  /** The options each registration carried, by type. */
  optionsFor(type: string): boolean | AddEventListenerOptions | undefined
  /** Registered and not yet removed -- what a happening would actually reach. */
  live(): readonly Registration[]
  /** `set:7`, `has:7`, `release:7` -- in the order the unit made them. */
  readonly captureCalls: string[]
  /** Deliver one happening to every live listener of that type, as a host does. */
  send(type: string, event: object): void
}

const isSameRegistration = (a: Registration, b: Registration): boolean =>
  a.type === b.type && a.listener === b.listener && a.capture === b.capture

function fakeHost(options: HostOptions = {}): FakeHost {
  const added: Registration[] = []
  const removed: Registration[] = []
  // ⚠️ The live set is kept as its own list rather than derived from the two
  // logs: a unit that registers, unregisters and registers the same handler
  // again is a live listener at the end, and a log difference would call it
  // dead.
  const alive: Registration[] = []
  const optionsByType = new Map<string, boolean | AddEventListenerOptions | undefined>()
  const captureCalls: string[] = []
  let held: number | null = null

  const documentElement: PointerCaptureTarget = {
    setPointerCapture(pointerId: number): void {
      captureCalls.push(`set:${pointerId}`)
      held = pointerId
    },
    releasePointerCapture(pointerId: number): void {
      captureCalls.push(`release:${pointerId}`)
      if (held === pointerId) held = null
    },
    hasPointerCapture(pointerId: number): boolean {
      captureCalls.push(`has:${pointerId}`)
      return held === pointerId
    },
  }

  const host: InputHost = {
    addEventListener(type, listener, listenerOptions): void {
      const made: Registration = { type, listener, capture: captureOf(listenerOptions) }
      added.push(made)
      optionsByType.set(type, listenerOptions)
      // A host ignores a second registration of the same triple, so the fake
      // does too -- otherwise a unit that registered twice would look as if it
      // reported twice, and the difference matters to NFR-010.
      if (!alive.some((one) => isSameRegistration(one, made))) alive.push(made)
    },
    removeEventListener(type, listener, listenerOptions): void {
      const gone: Registration = { type, listener, capture: captureOf(listenerOptions) }
      removed.push(gone)
      const at = alive.findIndex((one) => isSameRegistration(one, gone))
      if (at >= 0) alive.splice(at, 1)
    },
    innerWidth: options.innerWidth ?? HOST_INNER_WIDTH,
    innerHeight: options.innerHeight ?? HOST_INNER_HEIGHT,
    document: { documentElement },
  }

  return {
    host,
    added,
    removed,
    captureCalls,
    optionsFor: (type) => optionsByType.get(type),
    live: () => [...alive],
    send(type, event): void {
      for (const one of alive.filter((each) => each.type === type)) {
        if (typeof one.listener === 'function') one.listener(event as unknown as Event)
        else one.listener.handleEvent(event as unknown as Event)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The happenings, as a host reports them.
// ---------------------------------------------------------------------------

interface PointerFields {
  pointerId: number
  button: number
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
  // ⚠️ Deliberately unlike clientX / clientY. 表 T-023a 〜 T-023d are read in
  // the window's own frame of reference -- the one `regionAtPointer` (PI-35)
  // takes without conversion -- so a unit that reached for one of these
  // instead would place every happening somewhere else.
  pageX: number
  pageY: number
  screenX: number
  screenY: number
  offsetX: number
  offsetY: number
}

function hostPointer(over: Partial<PointerFields> = {}): Fake<PointerFields> {
  return withPreventDefault<PointerFields>({
    pointerId: 7,
    button: 0,
    clientX: 100,
    clientY: 50,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 1000,
    pageX: -11,
    pageY: -12,
    screenX: -21,
    screenY: -22,
    offsetX: -31,
    offsetY: -32,
    ...over,
  })
}

interface WheelFields {
  clientX: number
  clientY: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
  deltaX: number
  deltaY: number
  deltaMode: number
  pageX: number
  pageY: number
}

function hostWheel(over: Partial<WheelFields> = {}): Fake<WheelFields> {
  return withPreventDefault<WheelFields>({
    clientX: 200,
    clientY: 120,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 2000,
    deltaX: 0,
    deltaY: 100,
    deltaMode: DOM_DELTA_PIXEL,
    pageX: -11,
    pageY: -12,
    ...over,
  })
}

interface KeyFields {
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timeStamp: number
}

function hostKey(over: Partial<KeyFields> = {}): Fake<KeyFields> {
  return withPreventDefault<KeyFields>({
    key: 'Escape',
    code: 'Escape',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    timeStamp: 3000,
    ...over,
  })
}

const withMods = <T extends { ctrlKey: boolean; shiftKey: boolean; altKey: boolean; metaKey: boolean }>(
  mods: Partial<InputModifiers>,
): Partial<T> =>
  ({
    ctrlKey: mods.ctrl ?? false,
    shiftKey: mods.shift ?? false,
    altKey: mods.alt ?? false,
    metaKey: mods.meta ?? false,
  }) as Partial<T>

// ---------------------------------------------------------------------------
// One unit, one fake host, and a log of everything that passed between them.
// ---------------------------------------------------------------------------

interface Harness {
  readonly fake: FakeHost
  readonly source: InputSource
  /** What the watcher was handed, in order. */
  readonly heard: HumanInput[]
  /** What MK-10's question was asked about, in order. */
  readonly asked: HumanInput[]
  /** `ask` and `hear`, interleaved -- IN-4 needs the ask to come first. */
  readonly order: string[]
  /** Make MK-10's answer for the happenings that follow. */
  answer(next: boolean | ((input: HumanInput) => boolean)): void
  /** Start watching with the recording watcher. */
  watch(): void
}

function harness(options: HostOptions = {}): Harness {
  const fake = fakeHost(options)
  const heard: HumanInput[] = []
  const asked: HumanInput[] = []
  const order: string[] = []
  let answer: (input: HumanInput) => boolean = () => false

  const source = domInputSource(fake.host, (input) => {
    asked.push(input)
    order.push('ask')
    return answer(input)
  })

  return {
    fake,
    source,
    heard,
    asked,
    order,
    answer(next): void {
      answer = typeof next === 'function' ? next : () => next
    },
    watch(): void {
      source.watchInput((input) => {
        heard.push(input)
        order.push('hear')
      })
    },
  }
}

/** A press, then a release, at one place -- the ordinary settled gesture. */
function pressAndRelease(
  run: Harness,
  over: Partial<PointerFields> = {},
): { down: Fake<PointerFields>; up: Fake<PointerFields> } {
  const down = hostPointer(over)
  run.fake.send('pointerdown', down)
  const up = hostPointer({ ...over, timeStamp: (over.timeStamp ?? 1000) + 10 })
  run.fake.send('pointerup', up)
  return { down, up }
}

const pointers = (run: Harness): readonly PointerInput[] =>
  run.heard.filter((one): one is PointerInput => one.kind === 'pointer')

// ---------------------------------------------------------------------------
// The rosters these cases walk are the ones the tables state.
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  it('names every row of 表 T-036 that carries an assignment', () => {
    const assigned = specTable('T-036')
      .rows.filter((row) => !/^[—-]$/.test((row.by['割当'] ?? '').trim()))
      .map((row) => row.id)
    const covered = new Set<string>([
      ...T_036_KEYS.map((one) => one.row),
      ...T_036_NUMPAD.map((one) => one.row),
    ])
    expect(assigned.length).toBeGreaterThan(0)
    expect(assigned.filter((id) => !covered.has(id))).toEqual([])
  })

  it('leaves out only the rows whose assignment cell is `—` (SK-1 / SK-1a)', () => {
    // The note under 表 T-036: 「割当の欄が `—` の行は、その経路を持たないと
    // 定めた記録であって、割当ではない」.
    const unassigned = specTable('T-036')
      .rows.filter((row) => /^[—-]$/.test((row.by['割当'] ?? '').trim()))
      .map((row) => row.id)
    expect(unassigned).toEqual(['SK-1', 'SK-1a'])
  })

  it('runs where no browser exists, so a reach for a global would fail (R7.3)', () => {
    expect(typeof (globalThis as { window?: unknown }).window).toBe('undefined')
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')
    expect(typeof (globalThis as { PointerEvent?: unknown }).PointerEvent).toBe('undefined')
    expect(typeof (globalThis as { WheelEvent?: unknown }).WheelEvent).toBe('undefined')
  })
})

// ---------------------------------------------------------------------------
// IF-2 of 表 T-065 -- the seam, and only the seam.
// ---------------------------------------------------------------------------

describe('IF-2 of 表 T-065 -- the seam this unit implements', () => {
  it('publishes watchInput and unwatchInput, and nothing beside them', () => {
    const run = harness()
    expect(Object.keys(run.source).sort()).toEqual(['unwatchInput', 'watchInput'])
    expect(typeof run.source.watchInput).toBe('function')
    expect(typeof run.source.unwatchInput).toBe('function')
  })

  it('registers nothing until someone watches (NFR-010: no frame without a trigger)', () => {
    const run = harness()
    expect(run.fake.added).toEqual([])
    expect(run.fake.captureCalls).toEqual([])
  })

  it('reports no size, no time and no date on any happening (the note under 表 T-078)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer())
    run.fake.send('wheel', hostWheel())
    run.fake.send('keydown', hostKey())

    const forbidden = ['timeStamp', 'time', 'at', 'width', 'height', 'innerWidth', 'innerHeight']
    for (const input of run.heard) {
      for (const name of forbidden) {
        expect(Object.keys(input)).not.toContain(name)
      }
    }
  })

  it('does nothing when unwatchInput is called with nothing watching', () => {
    const run = harness()
    expect(() => run.source.unwatchInput()).not.toThrow()
    expect(run.fake.removed).toEqual([])
    expect(run.fake.captureCalls).toEqual([])
  })

  it('keeps one watcher, replaced by a second call rather than added to', () => {
    const run = harness()
    const first: HumanInput[] = []
    const second: HumanInput[] = []
    run.source.watchInput((input) => first.push(input))
    run.source.watchInput((input) => second.push(input))
    run.fake.send('keydown', hostKey())

    expect(first).toEqual([])
    expect(second).toHaveLength(1)
  })

  it('stops reporting after unwatchInput, and takes its registrations back', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()

    expect(run.fake.live()).toEqual([])
    for (const type of LISTENED_FOR) {
      run.fake.send(type, hostPointer())
    }
    expect(run.heard).toEqual([])
  })

  it('can be watched again after unwatchInput', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'F1', code: 'F1' }))

    expect(run.heard).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// FT-1 of 表 T-078 with NFR-010 -- what may be listened for, and what may not.
// ---------------------------------------------------------------------------

describe('FT-1 of 表 T-078 -- seven listeners, every one a pointer or a key', () => {
  it('registers exactly the seven, on the window itself (MK-10)', () => {
    const run = harness()
    run.watch()
    expect(run.fake.added.map((one) => one.type).sort()).toEqual([...LISTENED_FOR].sort())
  })

  it('registers none of the happenings no table lists (one case walks the roster)', () => {
    const run = harness()
    run.watch()
    const registered = new Set(run.fake.added.map((one) => one.type))
    const wrong = NOT_LISTENED_FOR.filter((one) => registered.has(one.type))
    expect(wrong.map((one) => `${one.type} -- ${one.why}`)).toEqual([])
  })

  it('registers no listener passively where MK-10 has to stop the browser', () => {
    const run = harness()
    run.watch()
    for (const type of MUST_NOT_BE_PASSIVE) {
      const options = run.fake.optionsFor(type)
      expect(typeof options === 'object' && options !== null && options.passive).toBe(false)
    }
  })

  it('removes every listener it registered, and no other', () => {
    const run = harness()
    run.watch()
    const registered = run.fake.added.map((one) => `${one.type}/${one.capture}`)
    run.source.unwatchInput()
    const taken = run.fake.removed.map((one) => `${one.type}/${one.capture}`)

    expect(taken.sort()).toEqual(registered.sort())
    for (const one of run.fake.removed) {
      expect(run.fake.added.some((made) => made.listener === one.listener)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// IN-1 -- down and up are separate happenings, and nothing settles on the press.
// ---------------------------------------------------------------------------

describe('IN-1 -- a pointer operation settles on release, not on press', () => {
  it('reports the press, the moves and the release as four happenings', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 100, clientY: 50, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ clientX: 140, clientY: 60, timeStamp: 1050 }))
    run.fake.send('pointermove', hostPointer({ clientX: 180, clientY: 70, timeStamp: 1080 }))
    run.fake.send('pointerup', hostPointer({ clientX: 180, clientY: 70, timeStamp: 1100 }))

    expect(run.heard).toEqual([
      { kind: 'pointer', phase: 'down', button: 'left', x: 100, y: 50, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'move', button: 'left', x: 140, y: 60, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'move', button: 'left', x: 180, y: 70, modifiers: NO_MODIFIERS, clickCount: 1 },
      { kind: 'pointer', phase: 'up', button: 'left', x: 180, y: 70, modifiers: NO_MODIFIERS, clickCount: 1 },
    ])
  })

  it('reads the position from the window frame of reference (表 T-023a 〜 T-023d)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 640, clientY: 400 }))

    expect(pointers(run)[0]?.x).toBe(640)
    expect(pointers(run)[0]?.y).toBe(400)
  })

  it('keeps reporting a drag that has run past the window (MUST NOT read it as an interruption)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ clientX: 10, clientY: 10, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ clientX: -400, clientY: -300, timeStamp: 1050 }))
    run.fake.send('pointermove', hostPointer({ clientX: 4000, clientY: 3000, timeStamp: 1080 }))
    run.fake.send('pointerup', hostPointer({ clientX: 4000, clientY: 3000, timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'move', 'move', 'up'])
    expect(pointers(run).some((one) => one.phase === 'lost')).toBe(false)
  })

  it('holds the pointer on the long-lived root element so the drag keeps arriving', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 7 }))

    expect(run.fake.captureCalls).toContain('set:7')
  })

  it('gives the pointer back when the gesture settles', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { pointerId: 7 })

    expect(run.fake.captureCalls).toContain('release:7')
  })

  it('holds only a press this tool assigned, and still settles one it did not (PD-94)', () => {
    // ⚠️ Which of the two risks to carry is undecided. Holding a press this
    // tool did not assign would send the compatibility mouse events to the
    // holder instead of to what was pressed, and the in-place editing of
    // `SK-19` needs that click to reach a text field; not holding it leaves
    // IN-1a's abort resting on the host's implicit capture. PD-94 recommends
    // not holding it, and this is the case that fails if that is reversed.
    const run = harness()
    run.answer((input) => input.kind === 'pointer' && input.button === 'left')
    run.watch()

    run.fake.send('pointerdown', hostPointer({ button: 2, pointerId: 3, timeStamp: 1000 }))
    expect(run.fake.captureCalls.filter((one) => one.startsWith('set:'))).toEqual([])

    run.fake.send('pointerup', hostPointer({ button: 2, pointerId: 3, timeStamp: 1100 }))
    expect(pointers(run).map((one) => `${one.phase}/${one.button}`)).toEqual([
      'down/right',
      'up/right',
    ])

    run.fake.send('pointerdown', hostPointer({ button: 0, pointerId: 4, timeStamp: 1400 }))
    expect(run.fake.captureCalls).toContain('set:4')
  })
})

// ---------------------------------------------------------------------------
// 表 T-023 -- which button, and which are not reported at all.
// ---------------------------------------------------------------------------

describe('表 T-023 -- the buttons (one case walks the roster)', () => {
  it('maps the host numbering onto PointerButton, and drops what no row names', () => {
    for (const row of T_023_BUTTONS) {
      const run = harness()
      run.watch()
      run.fake.send('pointerdown', hostPointer({ button: row.hostButton }))

      if (row.assigned) {
        expect(pointers(run).map((one) => one.button)).toEqual([row.button])
      } else {
        expect(run.heard).toEqual([])
      }
    }
  })

  it('reports the right button although no row assigns it (MK-10 needs the difference)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 2 }))

    expect(pointers(run)[0]?.button).toBe('right')
  })

  it('carries the press button on every move and release of that gesture (MK-8)', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ button: -1, timeStamp: 1050 }))
    run.fake.send('pointerup', hostPointer({ button: 1, timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.button)).toEqual(['middle', 'middle', 'middle'])
  })
})

// ---------------------------------------------------------------------------
// IN-1a -- a pointer lost before the button was released ends the drag.
// ---------------------------------------------------------------------------

describe('IN-1a -- the drag ends as an abort when the pointer is lost (表 T-035 AG-9)', () => {
  it('turns pointercancel into a lost that carries what the press carried', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, clientX: 100, clientY: 50, timeStamp: 1000 }))
    run.fake.send('pointercancel', hostPointer({ button: 1, clientX: 300, clientY: 90, timeStamp: 1100 }))

    expect(pointers(run)[1]).toEqual({
      kind: 'pointer',
      phase: 'lost',
      button: 'middle',
      x: 300,
      y: 90,
      modifiers: NO_MODIFIERS,
      clickCount: 1,
    })
  })

  it('turns lostpointercapture during a gesture into a lost', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    run.fake.send('lostpointercapture', hostPointer({ timeStamp: 1100 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'lost'])
  })

  it('does not abort a settled gesture after the fact (lostpointercapture after an up)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('lostpointercapture', hostPointer({ timeStamp: 1200 }))

    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'up'])
  })

  it('reports nothing at all when no gesture was in flight', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointercancel', hostPointer())
    run.fake.send('lostpointercapture', hostPointer())

    expect(run.heard).toEqual([])
  })

  it('carries the press count on the lost, so a double click abort is still a double', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1200 }))
    run.fake.send('pointercancel', hostPointer({ timeStamp: 1300 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })

  it('leaves the gesture ended, so the next press starts a fresh one', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ button: 1, timeStamp: 1000 }))
    run.fake.send('pointercancel', hostPointer({ button: 1, timeStamp: 1100 }))
    run.fake.send('pointermove', hostPointer({ button: -1, timeStamp: 1200 }))

    expect(pointers(run).at(-1)).toEqual({
      kind: 'pointer',
      phase: 'move',
      button: 'left',
      x: 100,
      y: 50,
      modifiers: NO_MODIFIERS,
      clickCount: 0,
    })
  })

  it('gives the pointer back when the gesture is aborted', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 9 }))
    const before = run.fake.captureCalls.length
    run.fake.send('pointercancel', hostPointer({ pointerId: 9 }))

    expect(run.fake.captureCalls.slice(before)).toContain('release:9')
  })

  it('drops the gesture and gives the pointer back when watching stops (AG-9)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 5 }))
    const before = run.heard.length
    run.source.unwatchInput()

    expect(run.fake.captureCalls).toContain('release:5')
    expect(run.heard).toHaveLength(before)

    run.watch()
    run.fake.send('pointermove', hostPointer({ timeStamp: 1500 }))
    expect(pointers(run).at(-1)?.clickCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// MK-10 / IN-4 / IN-4a / IN-5a -- what the browser is allowed to keep doing.
// ---------------------------------------------------------------------------

describe('MK-10 -- the browser is stopped only for an input this tool assigned', () => {
  it('stops the browser when the answer says the input was assigned', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    const event = hostKey({ key: 's', code: 'KeyS', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(event.preventedCount()).toBe(1)
  })

  it('leaves the browser alone when the answer says it was not (MUST NOT)', () => {
    const run = harness()
    run.answer(false)
    run.watch()
    const event = hostKey({ key: 'p', code: 'KeyP', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(event.preventedCount()).toBe(0)
    expect(run.heard).toHaveLength(1)
  })

  it('asks about the very happening it is about to report', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('wheel', hostWheel({ ctrlKey: true }))

    expect(run.asked).toEqual(run.heard)
  })

  it('asks BEFORE the watcher runs, so Esc is judged against the state it consumes (IN-4)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'Escape', code: 'Escape' }))
    run.fake.send('pointerdown', hostPointer())
    run.fake.send('wheel', hostWheel())

    expect(run.order).toEqual(['ask', 'hear', 'ask', 'hear', 'ask', 'hear'])
  })

  it('never asks about a lost happening, and never stops the browser for one (IN-1a)', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    const asked = run.asked.length
    const cancel = hostPointer({ timeStamp: 1100 })
    run.fake.send('pointercancel', cancel)

    expect(run.asked).toHaveLength(asked)
    expect(cancel.preventedCount()).toBe(0)
    expect(pointers(run).at(-1)?.phase).toBe('lost')
  })

  it('lets Esc reach the browser when there is nothing to consume (IN-4a, MUST)', () => {
    // ⭐ IN-4a is the reason MK-10's answer is injected rather than decided
    // here: with nothing open, no drag, no armed tool and no Dual Cursor, the
    // caller answers `false` and the key must reach the browser -- otherwise
    // FR-071's way back out of full screen is gone.
    const run = harness()
    run.answer((input) => input.kind !== 'key' || input.key !== 'Esc')
    run.watch()
    const escape = hostKey({ key: 'Escape', code: 'Escape' })
    const other = hostKey({ key: 'f', code: 'KeyF' })
    run.fake.send('keydown', escape)
    run.fake.send('keydown', other)

    expect(escape.preventedCount()).toBe(0)
    expect(other.preventedCount()).toBe(1)
  })

  it('lets Ctrl+C and Ctrl+V through during unsettled text entry (IN-5a, MUST)', () => {
    // IN-5a is 表 T-023 MK-10's one exception, and no special case is needed
    // here: the caller answers `false` while text entry is unsettled, and the
    // pair reach the browser as character operations.
    const run = harness()
    run.answer(false)
    run.watch()
    const copy = hostKey({ key: 'c', code: 'KeyC', ctrlKey: true })
    const paste = hostKey({ key: 'v', code: 'KeyV', ctrlKey: true })
    run.fake.send('keydown', copy)
    run.fake.send('keydown', paste)

    expect(copy.preventedCount()).toBe(0)
    expect(paste.preventedCount()).toBe(0)
    expect(run.heard.map((one) => (one.kind === 'key' ? one.key : one.kind))).toEqual(['C', 'V'])
  })

  it('leaves an unassigned modifier drag to the browser (MK-12, MUST NOT)', () => {
    // MK-12 gives `Alt`＋ドラッグ and `Ctrl`＋`Shift`＋ドラッグ no assignment of
    // this tool's, and MK-10 forbids stopping a combination that has none.
    const run = harness()
    run.answer(false)
    run.watch()
    const altDrag = hostPointer({ altKey: true, timeStamp: 1000 })
    run.fake.send('pointerdown', altDrag)
    run.fake.send('pointermove', hostPointer({ altKey: true, clientX: 160, timeStamp: 1040 }))
    run.fake.send('pointerup', hostPointer({ altKey: true, clientX: 160, timeStamp: 1080 }))

    const ctrlShiftDrag = hostPointer({ ctrlKey: true, shiftKey: true, timeStamp: 1600 })
    run.fake.send('pointerdown', ctrlShiftDrag)
    run.fake.send('pointerup', hostPointer({ ctrlKey: true, shiftKey: true, timeStamp: 1680 }))

    expect([altDrag.preventedCount(), ctrlShiftDrag.preventedCount()]).toEqual([0, 0])
    expect(run.fake.captureCalls.filter((one) => one.startsWith('set:'))).toEqual([])
    expect(pointers(run).map((one) => one.phase)).toEqual(['down', 'move', 'up', 'down', 'up'])
  })

  it('stops the browser exactly once for one happening', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    const event = hostWheel({ ctrlKey: true })
    run.fake.send('wheel', event)

    expect(event.preventedCount()).toBe(1)
  })

  it('asks nothing and stops nothing while no one is watching', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.source.unwatchInput()
    const event = hostKey({ key: 's', code: 'KeyS', ctrlKey: true })
    run.fake.send('keydown', event)

    expect(run.asked).toEqual([])
    expect(event.preventedCount()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// MK-12 -- the unit of an assignment is the combination, so all four travel.
// ---------------------------------------------------------------------------

describe('MK-12 -- all four modifiers travel together on every happening', () => {
  const COMBINATIONS: readonly Partial<InputModifiers>[] = [
    {},
    { ctrl: true },
    { shift: true },
    { alt: true },
    { meta: true },
    { ctrl: true, shift: true },
    { ctrl: true, alt: true },
    { ctrl: true, shift: true, alt: true, meta: true },
  ]

  it('carries them on a pointer happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('pointerdown', hostPointer(withMods<PointerFields>(mods)))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a wheel happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('wheel', hostWheel(withMods<WheelFields>(mods)))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a key happening', () => {
    for (const mods of COMBINATIONS) {
      const run = harness()
      run.watch()
      run.fake.send('keydown', hostKey({ key: 'f', code: 'KeyF', ...withMods<KeyFields>(mods) }))
      expect(run.heard[0]?.modifiers).toEqual(modifiersOf(mods))
    }
  })

  it('carries them on a move and a release too, as they stood at that moment', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1000 }))
    run.fake.send('pointermove', hostPointer({ timeStamp: 1050, shiftKey: true }))
    run.fake.send('pointerup', hostPointer({ timeStamp: 1100, shiftKey: true, altKey: true }))

    expect(run.heard.map((one) => one.modifiers)).toEqual([
      NO_MODIFIERS,
      modifiersOf({ shift: true }),
      modifiersOf({ shift: true, alt: true }),
    ])
  })
})

// ---------------------------------------------------------------------------
// MK-13 -- how many presses in a row.
// ---------------------------------------------------------------------------

describe('MK-13 -- the count of presses in a row (one case walks the runs)', () => {
  it('answers the count each press of each run must carry', () => {
    for (const run of MK_13_RUNS) {
      const test = harness()
      test.watch()
      let at = 1000
      let x = 100
      const counts: number[] = []
      for (const press of run.presses) {
        at += press.afterMs
        x += press.dx
        test.fake.send('pointerdown', hostPointer({ button: press.hostButton, clientX: x, timeStamp: at }))
        at += 10
        test.fake.send('pointerup', hostPointer({ button: press.hostButton, clientX: x, timeStamp: at }))
        counts.push(pointers(test).at(-2)?.clickCount ?? -1)
      }
      expect({ why: run.why, counts }).toEqual({
        why: run.why,
        counts: run.presses.map((press) => press.count),
      })
    }
  })

  it('gives the release the same count as its press', () => {
    const run = harness()
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    pressAndRelease(run, { timeStamp: 1300 })

    expect(pointers(run).map((one) => one.clickCount)).toEqual([1, 1, 2, 2])
  })

  it('gives a move the count of the press that began the gesture', () => {
    const run = harness()
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    run.fake.send('pointerdown', hostPointer({ timeStamp: 1300 }))
    run.fake.send('pointermove', hostPointer({ timeStamp: 1320 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })

  it('answers 0 for a move with no press in flight', () => {
    const run = harness()
    run.watch()
    run.fake.send('pointermove', hostPointer({ timeStamp: 1000 }))

    expect(pointers(run).at(-1)).toEqual({
      kind: 'pointer',
      phase: 'move',
      button: 'left',
      x: 100,
      y: 50,
      modifiers: NO_MODIFIERS,
      clickCount: 0,
    })
  })

  it('reads the moment off the event, not off a clock it was handed', () => {
    // ⚠️ Both presses are far apart in wall-clock time but the host reports
    // them 100 ms apart on its own timeline, which is the only timeline the
    // seam mentions. A unit reading `Date.now()` instead would answer 1.
    const run = harness()
    run.watch()
    run.fake.send('pointerdown', hostPointer({ timeStamp: 5_000_000 }))
    run.fake.send('pointerup', hostPointer({ timeStamp: 5_000_010 }))
    run.fake.send('pointerdown', hostPointer({ timeStamp: 5_000_100 }))

    expect(pointers(run).at(-1)?.clickCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// MK-1 〜 MK-5 with S-96 and S-53 -- one turn, two magnitudes.
// ---------------------------------------------------------------------------

describe('MK-1 〜 MK-5 -- one wheel happening carries detents and pixels', () => {
  it('answers both magnitudes for every way a host reports a turn (one case walks the roster)', () => {
    for (const turn of WHEEL_TURNS) {
      const run = harness()
      run.watch()
      run.fake.send(
        'wheel',
        hostWheel({ deltaMode: turn.deltaMode, deltaX: turn.deltaX, deltaY: turn.deltaY }),
      )

      expect({ why: turn.why, heard: run.heard[0] }).toEqual({
        why: turn.why,
        heard: {
          kind: 'wheel',
          x: 200,
          y: 120,
          modifiers: NO_MODIFIERS,
          notches: turn.notches,
          scrollPx: { x: turn.scrollPx.x, y: turn.scrollPx.y },
        },
      })
    }
  })

  it('answers the pixels exactly, and some detents, for the turns no row measures', () => {
    for (const turn of TURNS_WHOSE_DETENTS_NO_ROW_STATES) {
      const run = harness()
      run.watch()
      run.fake.send(
        'wheel',
        hostWheel({
          deltaMode: turn.deltaMode,
          deltaX: turn.deltaX,
          deltaY: turn.deltaY,
          shiftKey: true,
        }),
      )
      const heard = run.heard[0]

      expect({ why: turn.why, scrollPx: heard?.kind === 'wheel' ? heard.scrollPx : null }).toEqual({
        why: turn.why,
        scrollPx: { x: turn.scrollPx.x, y: turn.scrollPx.y },
      })
      expect(heard?.kind === 'wheel' && heard.notches !== 0).toBe(true)
    }
  })

  it('reports where the pointer was, because MK-2 zooms about that point', () => {
    const run = harness()
    run.watch()
    run.fake.send('wheel', hostWheel({ clientX: 640, clientY: 400 }))

    expect(run.heard[0]).toMatchObject({ kind: 'wheel', x: 640, y: 400 })
  })

  it('measures a page in the host own window, not in an invented page size', () => {
    const tall = harness({ innerWidth: 400, innerHeight: 300 })
    tall.watch()
    tall.fake.send('wheel', hostWheel({ deltaMode: DOM_DELTA_PAGE, deltaX: 1, deltaY: 1 }))

    expect(tall.heard[0]).toMatchObject({ scrollPx: { x: 400, y: 300 } })
  })

  it('does not settle which row a turn belongs to -- the modifiers travel unread', () => {
    const run = harness()
    run.watch()
    run.fake.send('wheel', hostWheel({ ctrlKey: true, shiftKey: true }))

    expect(run.heard[0]).toMatchObject({
      kind: 'wheel',
      modifiers: modifiersOf({ ctrl: true, shift: true }),
      notches: 1,
    })
  })
})

// ---------------------------------------------------------------------------
// 表 T-036 -- the assignment column's own spelling.
// ---------------------------------------------------------------------------

describe('表 T-036 -- the key is spelled as the assignment column spells it', () => {
  it('maps every assigned row from what a host reports (one case walks the table)', () => {
    const wrong: string[] = []
    for (const row of [...T_036_KEYS, ...T_036_NUMPAD]) {
      const run = harness()
      run.watch()
      run.fake.send(
        'keydown',
        hostKey({ key: row.hostKey, code: row.hostCode, ...withMods<KeyFields>(row.mods) }),
      )
      const heard = run.heard[0]
      const key = heard?.kind === 'key' ? heard.key : '(nothing reported)'
      if (key !== row.key) {
        wrong.push(`${row.row}: host ${row.hostKey}/${row.hostCode} answered ${key}, wants ${row.key}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('carries the modifiers beside the key, so the case of a letter means nothing else', () => {
    const run = harness()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'p', code: 'KeyP' }))
    run.fake.send('keydown', hostKey({ key: 'P', code: 'KeyP', shiftKey: true }))

    expect(run.heard).toEqual([
      { kind: 'key', key: 'P', modifiers: NO_MODIFIERS },
      { kind: 'key', key: 'P', modifiers: modifiersOf({ shift: true }) },
    ])
  })

  it('reports a key no row assigns rather than swallowing it (PD-95)', () => {
    const run = harness()
    run.watch()
    run.fake.send('keydown', hostKey({ key: 'ArrowUp', code: 'ArrowUp' }))

    expect(run.heard).toEqual([{ kind: 'key', key: 'ArrowUp', modifiers: NO_MODIFIERS }])
  })

  it('reports no release: 表 T-036 assigns nothing to one', () => {
    const run = harness()
    run.watch()
    expect(run.fake.added.map((one) => one.type)).not.toContain('keyup')
  })
})

// ---------------------------------------------------------------------------
// ⭐ The failure paths -- the outside behaving unlike the ordinary sequence.
//
// ⛔ ONE FAILURE PATH IS DELIBERATELY NOT TESTED HERE, and it is reported
// rather than guessed at: what must happen when the host's own capture API
// throws (a browser throws `NotFoundError` from `setPointerCapture` when the
// pointer id is no longer active). `InputSource` has no channel to answer with
// -- both its members return nothing -- and the note under 表 T-078 forbids
// widening IF-2 to give it one, so the only two possible behaviours are to
// swallow the throw or to let it out, and no requirement chooses between them.
// A case either way would be inventing the decision, so the choice is left to
// the pending-decision list instead (04-verification.md §1: 仕様が曖昧ならその
// 件を落とし、食い違いとして報告する).
// ---------------------------------------------------------------------------

describe('the happenings that arrive out of order', () => {
  it('does not throw on a release with no press before it', () => {
    const run = harness()
    run.watch()
    expect(() => run.fake.send('pointerup', hostPointer())).not.toThrow()
  })

  it('does not throw on a second release of the same gesture', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    pressAndRelease(run, { timeStamp: 1000 })
    expect(() => run.fake.send('pointerup', hostPointer({ timeStamp: 1200 }))).not.toThrow()
  })

  it('does not throw on a press that is never released', () => {
    const run = harness()
    run.answer(true)
    run.watch()
    run.fake.send('pointerdown', hostPointer({ pointerId: 1, timeStamp: 1000 }))
    expect(() => run.fake.send('pointerdown', hostPointer({ pointerId: 2, timeStamp: 1100 }))).not.toThrow()
  })

  it('does not throw when unwatchInput is called twice', () => {
    const run = harness()
    run.watch()
    run.source.unwatchInput()
    expect(() => run.source.unwatchInput()).not.toThrow()
  })
})

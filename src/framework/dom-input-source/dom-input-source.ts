// DomInputSource -- public entry of this folder.
//
// @unit      UF-50   (docs/spec/05-07-design.md, table T-075)
// @component DomInputSource, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-27
//
// `InputSource` (table T-065 IF-2) over the browser: CP-27.
//
// The seam is not widened for MK-10: `InputWatcher` returns nothing, so the
// factory takes `isBrowserDefaultStopped` instead, asked BEFORE the watcher
// runs -- `Esc` consumes a level (IN-4), so asking afterwards would answer about
// a screen that has already changed.
//
// The gesture in flight is held here (LY-5 of table T-060): a `move` and a
// `lost` carry values of the press that began it, which one event does not.
//
// The pointer is captured on the ROOT element, never on the event's target:
// DomSvgSurface (UF-49) replaces its subtree on every draw, and a removed node
// loses its capture, which would end every drag on the next frame.
//
// The browser's types appear only as TYPES -- no `instanceof`, constructor or
// static read off `WheelEvent` -- so the unit runs with a plain object as host.
// The press count reads the event's own `timeStamp`, so no clock is handed in.
//
// No listener for the window's size (FT-3), a timer (FT-4) or `contextmenu`: the
// first two are the shell's, and the right button has no row in table T-023.
// This unit never schedules a frame.

import type {
  HumanInput,
  InputModifiers,
  InputSource,
  InputWatcher,
  PointerButton,
  PointerInput,
} from '../../adapter/input-command-translator/input-command-translator'

// ------------------------------------------------------------- the host ----

/** What this unit needs of the page: one long-lived node that can hold a pointer. */
export interface PointerCaptureTarget {
  setPointerCapture(pointerId: number): void
  releasePointerCapture(pointerId: number): void
  hasPointerCapture(pointerId: number): boolean
}

/**
 * The whole of the browser this unit uses; a real `window` satisfies it (R7.3).
 *
 * Listening on the WINDOW, not the drawing area, is MK-10's: a `Ctrl+S` pressed
 * just off the canvas would become the browser's own save. The coordinates are
 * the window's, the frame `regionAtPointer` (PI-35) reads.
 */
export interface InputHost {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void
  /** DOM_DELTA_PAGE measures a turn in these. */
  readonly innerWidth: number
  readonly innerHeight: number
  readonly document: { readonly documentElement: PointerCaptureTarget }
}

// -------------------------------------------------- the host's own names ----

/** `MouseEvent.button`; table T-023 names buttons only in words. */
const HOST_BUTTON = { left: 0, middle: 1, right: 2 } as const

/** `WheelEvent.deltaMode`, written out so `WheelEvent` need not exist at run time. */
const DELTA_IN_LINES = 1
const DELTA_IN_PAGES = 2

const HOST_ESCAPE = 'Escape'
const ESCAPE_KEY = 'Esc'

/**
 * `KeyboardEvent.code` for the keys table T-036 spells with a sign, and `0`.
 *
 * Matched by physical key, not by character: on a common layout `Shift` + `-`
 * (SK-16) reports `_` and `Alt` + `+` (SK-16a) reports `=`. On other layouts
 * this is right for SK-17 and a guess for the rest.
 *
 * @provisional PND-93
 */
const SIGN_BY_CODE: Readonly<Record<string, string>> = {
  Equal: '+',
  NumpadAdd: '+',
  Minus: '-',
  NumpadSubtract: '-',
  Digit0: '0',
  Numpad0: '0',
}

// ------------------------------------------- values no table has settled ----

/**
 * How near in time and place a second press counts as a double click (MK-13).
 *
 * No table holds either figure (the millisecond rows S-124, S-172 and S-173 are
 * waits). The usual desktop interval, with a few pixels for a shaking hand.
 *
 * @provisional PND-90
 */
const DOUBLE_CLICK_WITHIN_MS = 500
/** @provisional PND-90 */
const DOUBLE_CLICK_WITHIN_PX = 4

/**
 * What one turn of the wheel is worth, per `deltaMode`.
 *
 * S-96 leaves the per-notch amount to the device, so the seam carries both
 * magnitudes and these divisors recover them. Common figures, not measured.
 *
 * @provisional PND-91
 */
const PIXELS_PER_LINE = 40
/** @provisional PND-91 */
const PIXELS_PER_NOTCH = 100
/** @provisional PND-91 */
const LINES_PER_NOTCH = 3

/**
 * What a `move` with no press in flight reports for `button` and `clickCount`.
 *
 * The seam does not say what a hover carries and both members are required.
 * Neither is read: `commandFromInput` answers a hover with UNASSIGNED first.
 *
 * @provisional PND-92
 */
const HOVER_BUTTON: PointerButton = 'left'
/** @provisional PND-92 */
const HOVER_CLICK_COUNT = 0

// ------------------------------------------------------- what is held on ----

/** The press this unit is carrying, and what the seam owes the rest of it. */
interface Gesture {
  readonly pointerId: number
  readonly button: PointerButton
  readonly clickCount: number
  /**
   * Whether MK-10 made this press the tool's, which is when the pointer was held.
   *
   * A held pointer sends compatibility mouse events to the holder, so a press
   * the tool did not take is not held and a click still focuses a text field.
   * The cost: IN-1a's abort then rests on the host's implicit capture, and no
   * `pointercancel` need arrive if that press is lost outside the window.
   *
   * @provisional PND-94
   */
  readonly isHeld: boolean
}

/** The press before this one, for MK-13's count. */
interface PreviousPress {
  readonly button: PointerButton
  readonly x: number
  readonly y: number
  readonly at: number
  readonly count: number
}

// ------------------------------------------------------------------ pure ----

/**
 * Which of table T-023's buttons, or null for one it does not name.
 *
 * The right button is answered although no row assigns it: MK-10 lets the
 * context menu open only if the translator can see the press was not the tool's.
 *
 * @purity pure
 */
function buttonOf(hostButton: number): PointerButton | null {
  if (hostButton === HOST_BUTTON.left) return 'left'
  if (hostButton === HOST_BUTTON.middle) return 'middle'
  if (hostButton === HOST_BUTTON.right) return 'right'
  return null
}

/**
 * Every modifier on every happening: the unit is the combination (MK-10, MK-12),
 * and which are assigned is `input-command-translator.ts`'s to decide.
 *
 * @purity pure
 */
function modifiersOf(event: {
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
}): InputModifiers {
  return { ctrl: event.ctrlKey, shift: event.shiftKey, alt: event.altKey, meta: event.metaKey }
}

/**
 * The host's name for a key, spelled as table T-036's assignment column spells it.
 *
 * Unassigned keys pass through unchanged: dropping them would need a second copy
 * of table T-036. The cost is that host spellings such as `ArrowUp` reach
 * `KeyInput.key`.
 *
 * @provisional PND-95
 * @purity pure
 */
function keyOf(event: { readonly key: string; readonly code: string }): string {
  const physical = SIGN_BY_CODE[event.code]
  if (physical !== undefined) return physical
  // Upper case as the table prints it (SK-14 `P`); `modifiers.shift` still says
  // whether shift was held.
  if (event.key.length === 1) return event.key.toUpperCase()
  if (event.key === HOST_ESCAPE) return ESCAPE_KEY
  return event.key
}

/**
 * How many pixels one unit of a turn is worth, in the mode the host reported.
 *
 * @purity pure
 */
function pixelsPerUnit(deltaMode: number, pageSize: number): number {
  if (deltaMode === DELTA_IN_LINES) return PIXELS_PER_LINE
  if (deltaMode === DELTA_IN_PAGES) return pageSize
  return 1
}

/**
 * How many units of a turn make one detent, in the mode the host reported.
 *
 * @purity pure
 */
function unitsPerNotch(deltaMode: number): number {
  if (deltaMode === DELTA_IN_LINES) return LINES_PER_NOTCH
  if (deltaMode === DELTA_IN_PAGES) return 1
  return PIXELS_PER_NOTCH
}

/**
 * Both magnitudes of one turn: detents for the zoom rows (S-53 is per notch) and
 * distance for the scroll rows.
 *
 * Detents fall back to the horizontal delta: some hosts move a wheel turn onto
 * that axis while `Shift` is held, and MK-3 still needs the count.
 *
 * @purity pure
 */
function wheelTurn(
  event: { readonly deltaX: number; readonly deltaY: number; readonly deltaMode: number },
  pageWidth: number,
  pageHeight: number,
): { readonly notches: number; readonly scrollPx: { readonly x: number; readonly y: number } } {
  const turned = event.deltaY !== 0 ? event.deltaY : event.deltaX
  return {
    notches: turned / unitsPerNotch(event.deltaMode),
    scrollPx: {
      x: event.deltaX * pixelsPerUnit(event.deltaMode, pageWidth),
      y: event.deltaY * pixelsPerUnit(event.deltaMode, pageHeight),
    },
  }
}

/**
 * Whether this press continues the run the previous one began (MK-13).
 *
 * @purity pure
 */
function isSameRun(
  before: PreviousPress,
  button: PointerButton,
  pointer: { readonly clientX: number; readonly clientY: number; readonly timeStamp: number },
): boolean {
  if (before.button !== button) return false
  if (pointer.timeStamp - before.at > DOUBLE_CLICK_WITHIN_MS) return false
  if (Math.abs(pointer.clientX - before.x) > DOUBLE_CLICK_WITHIN_PX) return false
  return Math.abs(pointer.clientY - before.y) <= DOUBLE_CLICK_WITHIN_PX
}

// -------------------------------------------------------------- non-pure ----

/**
 * `passive: false` is load-bearing on the wheel: a window's wheel listener is
 * passive by default and a passive `preventDefault` is ignored, so the page
 * would zoom and scroll under MK-2 / MK-1. It is written on every listener that
 * may call `preventDefault`; the two that end a gesture have nothing to stop.
 */
const MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }
const NOTHING_TO_STOP: AddEventListenerOptions = { passive: true }

/**
 * `InputSource` (table T-065 IF-2) over the browser.
 *
 * `isBrowserDefaultStopped` is `TranslatedInput.isBrowserDefaultStopped`, asked
 * by the caller because it holds the frame's values. It must change nothing: it
 * is asked before the watcher hears the happening.
 *
 * @purity non-pure
 */
export function domInputSource(
  host: InputHost,
  isBrowserDefaultStopped: (input: HumanInput) => boolean,
): InputSource {
  let watcher: InputWatcher | null = null
  let gesture: Gesture | null = null
  let previousPress: PreviousPress | null = null

  /** @purity non-pure */
  function report(input: HumanInput): void {
    const receive = watcher
    if (receive !== null) receive(input)
  }

  /**
   * MK-10 in the one place it can be obeyed.
   *
   * @purity non-pure
   */
  function deliver(input: HumanInput, event: { preventDefault(): void }): void {
    if (isBrowserDefaultStopped(input)) event.preventDefault()
    report(input)
  }

  /**
   * On the root element (see the header), and only for a press this tool took.
   *
   * @purity non-pure
   */
  function holdPointer(pointerId: number): void {
    host.document.documentElement.setPointerCapture(pointerId)
  }

  /**
   * Asked first: the host releases the pointer itself once the button is up, and
   * releasing twice is an error rather than a no-op.
   *
   * @purity non-pure
   */
  function releasePointer(pointerId: number): void {
    const root = host.document.documentElement
    if (root.hasPointerCapture(pointerId)) root.releasePointerCapture(pointerId)
  }

  /**
   * How many presses in a row this one is (MK-13), and remembering it for the
   * next.
   *
   * @purity non-pure
   */
  function pressCount(
    button: PointerButton,
    pointer: { readonly clientX: number; readonly clientY: number; readonly timeStamp: number },
  ): number {
    const before = previousPress
    const count = before !== null && isSameRun(before, button, pointer) ? before.count + 1 : 1
    previousPress = {
      button,
      x: pointer.clientX,
      y: pointer.clientY,
      at: pointer.timeStamp,
      count,
    }
    return count
  }

  /** @purity non-pure */
  function onPointerDown(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    // One gesture at a time: `InputContext.pressed` holds exactly one press.
    if (gesture !== null) return
    // A button table T-023 does not name stays the browser's (MK-10), unreported.
    const button = buttonOf(pointer.button)
    if (button === null) return

    const input: PointerInput = {
      kind: 'pointer',
      phase: 'down',
      button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: pressCount(button, pointer),
    }
    const isHeld = isBrowserDefaultStopped(input)
    if (isHeld) {
      pointer.preventDefault()
      holdPointer(pointer.pointerId)
    }
    gesture = { pointerId: pointer.pointerId, button, clickCount: input.clickCount, isHeld }
    report(input)
  }

  /** @purity non-pure */
  function onPointerMove(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    // A second device moving while this one drags is not this gesture.
    if (held !== null && held.pointerId !== pointer.pointerId) return
    deliver(
      {
        kind: 'pointer',
        phase: 'move',
        // The press that began the gesture, not what is under the pointer now.
        button: held === null ? HOVER_BUTTON : held.button,
        x: pointer.clientX,
        y: pointer.clientY,
        modifiers: modifiersOf(pointer),
        clickCount: held === null ? HOVER_CLICK_COUNT : held.clickCount,
      },
      pointer,
    )
  }

  /** @purity non-pure */
  function onPointerUp(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    if (held === null || held.pointerId !== pointer.pointerId) return
    // Only the button that began the gesture ends it: IN-1 settles on the release
    // of that press, and a second button released during a drag leaves it down.
    if (buttonOf(pointer.button) !== held.button) return

    const input: PointerInput = {
      kind: 'pointer',
      phase: 'up',
      button: held.button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: held.clickCount,
    }
    // Ended before it is announced, so that anything the watcher does sees a
    // settled gesture rather than one still in flight.
    gesture = null
    if (held.isHeld) releasePointer(pointer.pointerId)
    deliver(input, pointer)
  }

  /**
   * IN-1a: a lost pointer ends the drag as an abort. Left standing, the drag
   * would make AG-9 of table T-035 refuse every later `Agent API` write.
   *
   * `lostpointercapture` also fires on the ordinary release after an `up`; by
   * then the gesture has ended, and the guard below keeps it from being aborted.
   * Leaving the drawing area is not this (IN-1); holding the pointer makes
   * leaving harmless.
   *
   * @purity non-pure
   */
  function onPointerLost(event: Event): void {
    if (watcher === null) return
    const pointer = event as PointerEvent
    const held = gesture
    if (held === null || held.pointerId !== pointer.pointerId) return
    gesture = null
    if (held.isHeld) releasePointer(pointer.pointerId)
    // MK-10 is not asked: an abort has no default to stop, and the listener is
    // passive, so a `preventDefault` would be ignored.
    report({
      kind: 'pointer',
      phase: 'lost',
      button: held.button,
      x: pointer.clientX,
      y: pointer.clientY,
      modifiers: modifiersOf(pointer),
      clickCount: held.clickCount,
    })
  }

  /** @purity non-pure */
  function onWheel(event: Event): void {
    if (watcher === null) return
    const wheel = event as WheelEvent
    const turn = wheelTurn(wheel, host.innerWidth, host.innerHeight)
    deliver(
      {
        kind: 'wheel',
        // MK-2 zooms about the pointer, so where the turn happened travels with it.
        x: wheel.clientX,
        y: wheel.clientY,
        modifiers: modifiersOf(wheel),
        notches: turn.notches,
        scrollPx: turn.scrollPx,
      },
      wheel,
    )
  }

  /**
   * Only the press: table T-036 assigns nothing to a release. A repeat while a
   * key is held is reported like any press (SK-16 zooms one step per press).
   *
   * @purity non-pure
   */
  function onKeyDown(event: Event): void {
    if (watcher === null) return
    const key = event as KeyboardEvent
    deliver({ kind: 'key', key: keyOf(key), modifiers: modifiersOf(key) }, key)
  }

  const listeners: readonly (readonly [
    string,
    (event: Event) => void,
    AddEventListenerOptions,
  ])[] = [
    ['pointerdown', onPointerDown, MAY_STOP_DEFAULT],
    ['pointermove', onPointerMove, MAY_STOP_DEFAULT],
    ['pointerup', onPointerUp, MAY_STOP_DEFAULT],
    ['pointercancel', onPointerLost, NOTHING_TO_STOP],
    ['lostpointercapture', onPointerLost, NOTHING_TO_STOP],
    ['wheel', onWheel, MAY_STOP_DEFAULT],
    ['keydown', onKeyDown, MAY_STOP_DEFAULT],
  ]

  return {
    /**
     * The registrations are made once, on the first watcher; a later call
     * replaces the watcher rather than adding one.
     *
     * @purity non-pure
     */
    watchInput(receive: InputWatcher): void {
      if (watcher === null) {
        for (const [type, listener, options] of listeners) {
          host.addEventListener(type, listener, options)
        }
      }
      watcher = receive
    },

    /**
     * A gesture still in flight is dropped, not announced: nobody is left to hear
     * a `lost`, and a held pointer would keep the page's events aimed at the root.
     *
     * @purity non-pure
     */
    unwatchInput(): void {
      if (watcher === null) return
      watcher = null
      for (const [type, listener, options] of listeners) {
        host.removeEventListener(type, listener, options)
      }
      const held = gesture
      gesture = null
      previousPress = null
      if (held !== null && held.isHeld) releasePointer(held.pointerId)
    },
  }
}

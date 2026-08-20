// DomInputSource -- public entry of this folder.
//
// @unit      UF-50   (docs/spec/05-07-design.md, table T-075)
// @component DomInputSource, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-27
//
// The implementation of InputSource (table T-065 IF-2). CP-27 gives it one
// job: say what the person did, in the vocabulary the seam spells.
//
// ⭐ WHY THIS UNIT EXISTS. FT-1 of table T-078 names this component as the
// thing that notices a person operating the tool, and IF-2 is the only route
// by which a press or a key can reach `commandFromInput`. Everything else in
// this tree can draw a schedule and change a document; until this file existed
// the application could be looked at and not touched.
//
// ⭐ THE DEPENDENCY POINTS INWARD (LR-5 of table T-061). The vocabulary below
// is declared by `InputCommandTranslator`, an Adapter component, and realised
// here. ⛔ Nothing in this file may be reached from there, and no member of the
// seam is re-shaped on the way -- table T-065's supply is 「ポインタとキーの出
// 来事」 and the note under table T-078 forbids widening it, so nothing here
// reports a size, a time or a date.
//
// ⭐ WHAT WAS HARD, and how each went:
//
//   1. MK-10 IS A MUST THIS SEAM CANNOT CARRY ALONE. The row demands the
//      browser's own behaviour be stopped for an input this tool assigned and
//      NOT stopped for one it did not, and only `commandFromInput` knows which
//      is which (it answers `isBrowserDefaultStopped`). But `InputWatcher`
//      returns nothing, so the answer cannot come back through the seam.
//      ⛔ The declaration is not widened for it. The FACTORY takes the question
//      instead -- `isBrowserDefaultStopped` below -- and the caller answers it
//      out of the same frame values it hands `commandFromInput`. ⚠️ It is asked
//      BEFORE the watcher runs: `Esc` consumes a level (IN-4), so a watcher
//      that had already run would leave the question to be answered about a
//      screen that has since changed, and IN-4a's MUST (with nothing left to
//      consume the key reaches the browser) would read the wrong state.
//
//   2. THE GESTURE IN FLIGHT IS REMEMBERED HERE. LY-5 of table T-060 makes the
//      Framework the only layer that may hold a current value, and the seam
//      asks for values a single event does not carry: a `move` carries the
//      button and the count of the press that began the gesture, and a `lost`
//      carries what that press carried.
//
//   3. THE POINTER IS HELD ON THE ROOT ELEMENT, never on the event's target.
//      IN-1 forbids reading the pointer leaving the drawing area as an
//      interruption (MUST NOT), so a drag has to keep arriving after it leaves
//      -- which is what pointer capture is for. ⛔ Capturing on the target
//      would end every drag on the next frame: DomSvgSurface (UF-49) replaces
//      its whole subtree each time it draws, and a captured node that is
//      removed loses the capture. The root element is never replaced.
//
//   4. THE BROWSER ARRIVES AS AN ARGUMENT (R7.3, and LY-5 again). Nothing here
//      reaches for a global, so this unit runs -- and can be tested -- with a
//      plain object in place of `window`. ⚠️ The browser's own types appear
//      only as TYPES: there is no `instanceof`, no constructor call and no
//      static read off `WheelEvent`, so nothing in this file needs those names
//      to exist at run time.
//
//   5. HOW MANY PRESSES IN A ROW IS COUNTED HERE, because the seam says so and
//      says why: telling a double click from two single ones is a question
//      about elapsed time, and the clock is the Framework's. ⚠️ The time comes
//      off the event itself (`timeStamp`), not from a clock this unit reads --
//      one less thing to hand it, and the host's own timeline for that event.
//
// ⛔ WHAT IS DELIBERATELY NOT LISTENED FOR. NFR-010 forbids waking a frame on
// anything table T-078 does not list (MUST NOT), and every listener registered
// below reports a happening FT-1 names -- a pointer's or a key's. There is no
// listener for the window's size (FT-3) or for a timer (FT-4): both are the
// shell's, which is what the note under table T-078 says in as many words.
// ⛔ There is no `contextmenu` listener either. The right button has no row in
// table T-023, so MK-10's MUST NOT leaves the menu to the browser.
// ⚠️ This unit never schedules a frame. It hands the happening over; whether a
// frame follows is the shell's to decide.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  HumanInput,
  InputModifiers,
  InputSource,
  InputWatcher,
  PointerButton,
  PointerInput,
} from '../../adapter/input-command-translator/input-command-translator'

// ------------------------------------------------------------- the host ----

/**
 * The three members of an element that hold a pointer.
 *
 * ⭐ Named separately so that what this unit needs of the page is three methods
 * on one long-lived node, rather than a document.
 */
export interface PointerCaptureTarget {
  setPointerCapture(pointerId: number): void
  releasePointerCapture(pointerId: number): void
  hasPointerCapture(pointerId: number): boolean
}

/**
 * The whole of the browser this unit uses. A real `window` satisfies it.
 *
 * ⭐ Narrow on purpose. R7.3 asks for the outside to be handed in rather than
 * reached for, and LY-5 has already made this the layer that may hold such a
 * thing; writing down exactly which five members are touched is what lets the
 * unit be exercised without a browser at all.
 *
 * ⚠️ Listening on the WINDOW rather than on the drawing area is MK-10's doing:
 * 「キャンバスの上だけでは足りない」 -- with `Ctrl+S` caught only over the
 * canvas, a save aimed slightly off it becomes the browser's HTML save. Where
 * a happening lands is not lost by this: the coordinates are the window's own
 * frame of reference, which is the one `regionAtPointer` (PI-35) reads.
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

/**
 * `MouseEvent.button`. ⚠️ This numbering is the browser's, not table T-023's --
 * the table names its buttons in words (MK-7's 中ボタン, MK-6's 左) and never
 * numbers them. Mapping the two is exactly the work the seam leaves to CP-27.
 */
const HOST_BUTTON = { left: 0, middle: 1, right: 2 } as const

/**
 * `WheelEvent.deltaMode`. ⛔ Written out rather than read off `WheelEvent`,
 * whose static properties are a browser global this unit must not need at run
 * time (see 4. in the header).
 */
const DELTA_IN_LINES = 1
const DELTA_IN_PAGES = 2

/**
 * The one key whose name the browser and table T-036 spell differently, which
 * the seam calls out by name: SK-8 assigns `Esc`, the host reports `Escape`.
 */
const HOST_ESCAPE = 'Escape'
const ESCAPE_KEY = 'Esc'

/**
 * `KeyboardEvent.code` for the keys table T-036 spells with a sign, and `0`.
 *
 * ⛔ These three cannot be recognised by the CHARACTER the host reports, and
 * that is not a preference. SK-16 assigns `Shift` ＋ `-`, and a common layout
 * answers that press with `_`; SK-16a assigns `Alt` ＋ `+`, and the same layout
 * answers it with `=`. Only the physical key is the same in both. ⚠️ The cost
 * is that a layout which puts other characters on these keys will still call
 * them `+`, `-` and `0` -- which is right for SK-17 (`Ctrl` ＋ `0` is the
 * host's own reset key everywhere) and a guess for the rest.
 *
 * @provisional PD-93
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
 * How near in time and place a second press has to be to count as the second
 * of a double click (MK-13).
 *
 * ⛔ NO table holds either figure. Table T-206 collects 掴み代 and 当たり判定
 * and stops there; table T-201's only millisecond rows are the icon hint
 * (S-124) and the autosave idle (S-112), and neither is about a click.
 * ⚠️ `input-source.ts` puts the counting here on purpose (a pure function
 * cannot time a gap), so a figure is needed rather than avoidable. The
 * recommendation is the interval a desktop host uses for its own double click,
 * with a few pixels of tolerance so that a shaking hand still counts.
 *
 * @provisional PD-90
 */
const DOUBLE_CLICK_WITHIN_MS = 500
/** @provisional PD-90 */
const DOUBLE_CLICK_WITHIN_PX = 4

/**
 * What one turn of the wheel is worth, per `deltaMode`.
 *
 * ⛔ Nothing states these, and S-96 says why nothing can: 「1 ノッチで何倍動く
 * かは入力装置に依存する」. The seam therefore carries BOTH magnitudes, and
 * these are the divisors that recover them from what a host reports.
 * ⚠️ A host that reports pixels does not say how many are one detent; a host
 * that reports lines does not say how tall a line is. These two figures are
 * the common ones, not measured ones.
 *
 * @provisional PD-91
 */
const PIXELS_PER_LINE = 40
/** @provisional PD-91 */
const PIXELS_PER_NOTCH = 100
/** @provisional PD-91 */
const LINES_PER_NOTCH = 3

/**
 * What a `move` with no press in flight reports for the two members that only
 * a press gives meaning to.
 *
 * ⛔ The seam excuses `button` on a `lost` and says a `move` carries the press
 * that began the gesture -- it does not say what a HOVER carries, and both
 * members are required. ⭐ Neither is read in that case: `InputContext.pressed`
 * is null on a hover, and `commandFromInput` answers a move with UNASSIGNED
 * before either is looked at.
 *
 * @provisional PD-92
 */
const HOVER_BUTTON: PointerButton = 'left'
/** @provisional PD-92 */
const HOVER_CLICK_COUNT = 0

// ------------------------------------------------------- what is held on ----

/** The press this unit is carrying, and what the seam owes the rest of it. */
interface Gesture {
  readonly pointerId: number
  readonly button: PointerButton
  readonly clickCount: number
  /**
   * Whether MK-10 made this press the tool's, which is when the pointer was
   * held.
   *
   * ⚠️ A press this tool did not assign is left entirely to the browser,
   * capture included, so that clicking into a text field still focuses it --
   * a held pointer sends the compatibility mouse events to the holder instead
   * of to what was pressed. ⛔ The cost is that IN-1a's abort then rests on the
   * host's implicit capture rather than on this unit's: if a press the tool did
   * not take is lost outside the window, no `pointercancel` need arrive.
   * ⭐ Nothing settles which of the two risks to carry.
   *
   * @provisional PD-94
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
 * ⭐ The right button is answered even though no row assigns it, because MK-10
 * needs the difference: the context menu may open only if the translator can
 * see that the press was not this tool's.
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
 * The four modifiers as they stood, all of them together.
 *
 * ⭐ All four travel on every happening because MK-10 and MK-12 both say the
 * unit is the COMBINATION and not the modifier. Which of them the tool has
 * assigned is settled in `input-command-translator.ts`, never here.
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
 * The host's name for a key, spelled the way table T-036's assignment column
 * spells it.
 *
 * ⚠️ Keys the table does not assign are reported unchanged rather than dropped.
 * Deciding which combinations are assigned is `commandFromInput`'s work, and
 * naming the assigned set here would be a second copy of table T-036 -- one
 * that a new row would silently leave behind. ⛔ The price is that the host's
 * own spelling then does reach `KeyInput.key` for a key nothing assigns
 * (`ArrowUp`, `Control`), which the seam's declaration would rather it did not;
 * the alternative is to drop those presses, which costs a copy of the table.
 *
 * @provisional PD-95
 * @purity pure
 */
function keyOf(event: { readonly key: string; readonly code: string }): string {
  const physical = SIGN_BY_CODE[event.code]
  if (physical !== undefined) return physical
  // ⚠️ Upper case is the table's own (SK-14 prints `P`, SK-18 prints `F`), and
  // it carries no second meaning: `modifiers.shift` still says whether shift
  // was actually held.
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
 * Both magnitudes the seam wants of one turn: the detents the zoom rows need
 * (MK-2 to MK-4, whose step S-53 is stated per notch) and the distance the
 * scroll rows need (MK-1 and MK-5, for which no row gives a day per notch).
 *
 * ⚠️ The detents are counted off the vertical delta, falling back to the
 * horizontal one when the wheel reported nothing vertical -- some hosts move a
 * plain wheel turn onto the horizontal axis while `Shift` is held, and MK-3
 * assigns that combination a zoom, which needs the count either way.
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
 * A listener that may stop the browser's own behaviour, and one that has none
 * to stop.
 *
 * ⛔ `passive: false` is load-bearing on the wheel and nowhere else: a wheel
 * listener on a window is passive BY DEFAULT in current browsers, and a passive
 * listener's `preventDefault` is ignored -- so leaving it off would silently
 * let the page zoom under MK-2 and scroll under MK-1, breaking MK-10's MUST
 * with nothing to see in the code. It is written on the pointer and key
 * listeners too so that every listener that may call `preventDefault` says so.
 *
 * ⭐ The two that end a gesture are passive, and truthfully so: an abort has no
 * default action to refuse, and saying so lets the browser act without waiting
 * on this unit.
 */
const MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }
const NOTHING_TO_STOP: AddEventListenerOptions = { passive: true }

/**
 * One implementation of `InputSource` (table T-065 IF-2) over the browser.
 *
 * The caller supplies two things:
 *
 *   `host`                     the window to listen on (see `InputHost`).
 *   `isBrowserDefaultStopped`  MK-10's answer for one happening. ⭐ This is
 *                              `TranslatedInput.isBrowserDefaultStopped` and
 *                              nothing else -- the caller holds the frame's
 *                              values, so it is the only party that can ask
 *                              `commandFromInput` on this unit's behalf.
 *                              ⛔ It must not itself change anything: it is
 *                              asked before the watcher hears the happening.
 *
 * @purity non-pure
 */
export function domInputSource(
  host: InputHost,
  isBrowserDefaultStopped: (input: HumanInput) => boolean,
): InputSource {
  // ⛔ ONE watcher (the seam says so), one gesture, one previous press. LY-5
  // puts them here because there is nowhere further in they are allowed.
  let watcher: InputWatcher | null = null
  let gesture: Gesture | null = null
  let previousPress: PreviousPress | null = null

  /** @purity non-pure */
  function report(input: HumanInput): void {
    const receive = watcher
    if (receive !== null) receive(input)
  }

  /**
   * MK-10 in the one place it can be obeyed: the browser's behaviour is
   * refused exactly when the caller says this tool assigned the happening, and
   * left alone otherwise (MUST NOT). ⚠️ IN-5a rides on this for free -- while
   * text is being entered the translator calls `Ctrl+C` and `Ctrl+V` the
   * browser's, so they are not stopped and the characters can be copied.
   *
   * @purity non-pure
   */
  function deliver(input: HumanInput, event: { preventDefault(): void }): void {
    if (isBrowserDefaultStopped(input)) event.preventDefault()
    report(input)
  }

  /**
   * ⭐ On the root element (see 3. in the header), and only for a press this
   * tool took: a press it did not take belongs to the browser, capture and all.
   *
   * @purity non-pure
   */
  function holdPointer(pointerId: number): void {
    host.document.documentElement.setPointerCapture(pointerId)
  }

  /**
   * ⚠️ Asked first, because the host releases the pointer by itself once the
   * button is up and releasing twice is an error rather than a no-op.
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
    // ⭐ One gesture at a time. IN-1 settles a pointer operation on its
    // release, so a press arriving before that release has no release of its
    // own to settle on, and `InputContext.pressed` holds exactly one press.
    if (gesture !== null) return
    // ⛔ A button table T-023 does not name -- a host's back and forward --
    // stays the browser's (MK-10, MUST NOT), so it is not even reported.
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
    // ⚠️ A second device moving while this one drags is not this gesture.
    if (held !== null && held.pointerId !== pointer.pointerId) return
    deliver(
      {
        kind: 'pointer',
        phase: 'move',
        // The press that began the gesture, which is what the seam asks a move
        // to carry. ⛔ Not what is under the pointer now.
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
    // ⚠️ Only the button that BEGAN the gesture ends it. Releasing a second
    // button pressed during a drag leaves the first one down, and IN-1 settles
    // the operation on the release of the press it began with.
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
   * IN-1a: the button was never released because the pointer was lost, so the
   * drag ends as an abort (MUST). ⛔ Nothing is written for it -- not ending it
   * would leave 「ドラッグ中」 standing, and AG-9 of table T-035 would refuse
   * every later write by the `Agent API`.
   *
   * ⚠️ Two host happenings mean this and they are reported the same way. One
   * of them, `lostpointercapture`, ALSO fires on the ordinary release that
   * follows an `up`; by then the gesture has ended, and the guard below is
   * what keeps a settled gesture from being aborted after the fact.
   *
   * ⛔ This is NOT the pointer leaving the drawing area, which IN-1 forbids
   * reading as an interruption (MUST NOT). Nothing here watches for that, and
   * holding the pointer is what makes leaving it harmless.
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
    // ⛔ MK-10 is not asked here: an abort has no browser behaviour to stop,
    // and the listener is passive, so a `preventDefault` would be ignored.
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
        // MK-2 zooms about the pointer, so where the turn happened travels
        // with it.
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
   * Only the press. ⚠️ Table T-036 assigns nothing to a release, which is why
   * the seam has no shape for one, and a repeat while a key is held is
   * reported like any other press -- SK-16 zooms one step per press, and a
   * held key is a person asking for more of them.
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
     * ⭐ The registrations are made once, on the first watcher. A second call
     * replaces the watcher rather than adding one (the seam says so), and
     * re-registering the same function references would be a no-op anyway.
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
     * ⛔ The host's own registrations are given back, which is the reason this
     * member exists at all. ⚠️ A gesture still in flight is dropped rather than
     * announced: there is no longer anyone to hear a `lost`, and leaving the
     * pointer held would keep the page's events pointed at the root element.
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

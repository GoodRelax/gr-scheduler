// InputCommandTranslator -- declares the interface InputSource (table T-065 IF-2).
//
// @unit      UF-31   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    n/a
// @seam      InputSource, implemented in another layer (LR-5)
//
// IF-2 supplies pointer and key happenings only, and FT-1 of table T-078 makes
// them the only trigger of a frame from a person: a happening that cannot be
// spelled here can never reach `commandFromInput`.
//
// ⛔ No member reports a size, a time or a date: the note under table T-078
// forbids widening IF-2 (FT-3 and FT-4 are the shell's to observe).
//
// ⛔ No browser type appears here (LR-6), and the names avoid the DOM's global
// `InputEvent` / `PointerEvent` / `KeyboardEvent` / `WheelEvent`: a file that
// forgot one `import type` would silently compile against the browser's shape.

/**
 * Which button. Table T-023 gives the right button no row, but it is carried
 * because MK-10 requires unassigned input to keep the browser's behaviour, and
 * the translator must know whether the context menu may open.
 */
export type PointerButton = 'left' | 'middle' | 'right'

/**
 * The modifier keys as they stood when the happening occurred.
 *
 * All four travel together because table T-023 assigns the COMBINATION, not the
 * modifier (MK-10, MK-12). What `meta` (the `Cmd` of MK-2) does to other rows is
 * decided in `input-command-translator.ts`.
 */
export interface InputModifiers {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  /** The `Cmd` of MK-2. */
  readonly meta: boolean
}

/**
 * Where a pointer happening is in its life (IN-1, IN-1a of table T-028).
 *
 * ⛔ `lost` is NOT the pointer leaving the drawing area, which IN-1 forbids
 * reading as an interruption; it is the pointer lost outside the window.
 */
export type PointerPhase = 'down' | 'move' | 'up' | 'lost'

/** A pointer happening. */
export interface PointerInput {
  readonly kind: 'pointer'
  readonly phase: PointerPhase
  /** Which button began the gesture. Meaningless while `phase` is `lost`. */
  readonly button: PointerButton
  /**
   * Window coordinates, origin top left -- the frame `ScreenRegions` uses, so
   * `regionAtPointer` (PI-35) reads them without conversion.
   */
  readonly x: number
  readonly y: number
  readonly modifiers: InputModifiers
  /**
   * How many presses in a row this one is: 1, or 2 for a double click (MK-13).
   *
   * Counted by the implementation: telling a double click from two single ones
   * needs the clock, which stays on the Framework's side (CS-1, LY-5).
   * ⚠️ Meaningful on `down` and `up`; `move` and `lost` carry the count of the
   * press that began the gesture.
   */
  readonly clickCount: number
}

/** A wheel happening. */
export interface WheelInput {
  readonly kind: 'wheel'
  /** Where the pointer was. MK-2 zooms about this point, so it is not optional. */
  readonly x: number
  readonly y: number
  readonly modifiers: InputModifiers
  /**
   * Detents turned, positive toward the person (reading further down).
   *
   * Two magnitudes travel because `zoomStep` (S-53) is per notch while no row
   * states how far a notch scrolls (S-96: that depends on the device).
   */
  readonly notches: number
  /**
   * How far the host would have scrolled, in px, positive down and right.
   *
   * ⛔ Not a second spelling of `notches`: the scroll position is an anchor in the
   * document (S-77 / S-78), `dateAtX` (PI-5) turns pixels into days, and no row
   * gives a day-per-notch figure.
   */
  readonly scrollPx: { readonly x: number; readonly y: number }
}

/** A key happening. Only the press: table T-036 assigns nothing to a release. */
export interface KeyInput {
  readonly kind: 'key'
  /**
   * The key, spelled as table T-036's assignment column spells it (`Esc`, `F2`,
   * `A`, `+`), a letter as one upper-case character.
   *
   * ⛔ Not the host's spelling (`Escape`, shift-dependent case): mapping it is
   * CP-27's work (LR-6). `modifiers.shift` says whether shift was held, so the
   * case carries no second meaning.
   */
  readonly key: string
  readonly modifiers: InputModifiers
}

/** One happening from a person (FT-1). */
export type HumanInput = PointerInput | WheelInput | KeyInput

/** What is handed each happening. */
export type InputWatcher = (input: HumanInput) => void

// The members are decided here: table T-065 names only the interface.
export interface InputSource {
  /**
   * Begin reporting happenings to `receive`.
   *
   * Pushed, not pulled (unlike `ScreenSurface.readDialogueInput`): FT-1 makes
   * input a frame trigger, and a value polled once a frame could not wake one.
   *
   * ⛔ One watcher, replaced by a second call: only the Framework holds current
   * values (LY-5), and several listeners would need an order no requirement states.
   *
   * @purity non-pure
   */
  watchInput(receive: InputWatcher): void

  /**
   * Stop reporting; does nothing while nothing is watching. Releases the host
   * registrations CP-27 holds, as `unwatchChanges` (PI-15) does for its own.
   *
   * @purity non-pure
   */
  unwatchInput(): void
}

// InputCommandTranslator -- declares the interface InputSource (table T-065 IF-2).
//
// @unit      UF-31   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    n/a
// @seam      InputSource, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHAT THIS SEAM IS FOR. IF-2 supplies "ポインタとキーの出来事" and nothing
// else, and FT-1 of table T-078 makes those happenings the ONLY trigger of a
// frame that comes from a person. So the shape below is the whole vocabulary in
// which this application can be operated: a happening that cannot be spelled
// here can never reach `commandFromInput`.
//
// ⛔ WHAT MAY NOT BE ADDED. The note under table T-078 says in as many words
// that IF-2's supply is not to be widened -- neither the window's size (FT-3)
// nor the clock (FT-4) is an input device's happening, and both are the shell's
// to observe. ⚠️ So no member here reports a size, a time or a date.
//
// ⛔ NO BROWSER TYPE APPEARS BELOW, and none may. LR-6 keeps the browser's own
// types out of the inner layers, and 5.3 puts the implementation of this seam
// on the far side of this declaration -- `screen-surface.ts` (IF-9) and
// `screen-regions.ts` (PI-35) take the same route, declaring plain numbers
// rather than borrowing a rectangle or an event from the DOM.
// ⚠️ The NAMES also stay clear of the browser's. `InputEvent`, `PointerEvent`,
// `KeyboardEvent` and `WheelEvent` are all global types where the DOM library
// is loaded, and a file that forgot one `import type` would silently compile
// against the browser's shape instead of this one. `HumanInput` is FT-1's own
// wording (「人の入力（ポインタとキー）」) and collides with nothing.

/**
 * Which button. Table T-023 names two of them -- the middle in MK-7 and the
 * left in MK-6 / MK-8 / MK-11 -- and gives the right button no row at all.
 *
 * ⭐ The right button is carried anyway, because MK-10 needs the difference:
 * an input this tool has NOT assigned must keep the browser's own behaviour
 * (MUST NOT), and a translator that could not tell which button was pressed
 * would have to guess whether the context menu may open.
 */
export type PointerButton = 'left' | 'middle' | 'right'

/**
 * The modifier keys as they stood when the happening occurred.
 *
 * ⚠️ The unit that table T-023 assigns is the COMBINATION, not the modifier --
 * MK-10 and MK-12 both say so, and MK-4 / MK-5 are the proof: the same `Alt`
 * means one thing alone and another beside `Ctrl`. All four travel together so
 * that a reader can be matched exactly rather than tested one key at a time.
 *
 * ⭐ `meta` is here because MK-2 spells its modifier 「Ctrl（Cmd）」. What that
 * does to the OTHER rows is decided in `input-command-translator.ts`, not here:
 * this seam reports which keys were down and settles nothing.
 */
export interface InputModifiers {
  readonly ctrl: boolean
  readonly shift: boolean
  readonly alt: boolean
  /** The `Cmd` of MK-2. */
  readonly meta: boolean
}

/**
 * Where a pointer happening is in its life.
 *
 * ⭐ The four are IN-1 and IN-1a of table T-028 between them. IN-1 makes a
 * pointer operation settle on RELEASE and not on press, so `down` and `up` are
 * different happenings rather than one; IN-1a requires a drag to be ended as an
 * abort when the button is never released because the pointer was lost outside
 * the window, so `lost` exists to say precisely that.
 *
 * ⛔ `lost` is NOT the pointer leaving the drawing area. IN-1 forbids reading
 * that as an interruption (MUST NOT) -- a marquee that reaches the edge of the
 * screen and a creation drag that runs past the visible range are both ordinary
 * operations.
 */
export type PointerPhase = 'down' | 'move' | 'up' | 'lost'

/** A pointer happening. */
export interface PointerInput {
  readonly kind: 'pointer'
  readonly phase: PointerPhase
  /** Which button began the gesture. Meaningless while `phase` is `lost`. */
  readonly button: PointerButton
  /**
   * Where the pointer is, in the same frame of reference `ScreenRegions` uses
   * -- the whole window, with the origin at its top left. ⭐ `regionAtPointer`
   * (PI-35) is what turns the pair into a part of the screen, and table T-023a
   * applies to only one of those parts, so the coordinates have to be readable
   * by that member without conversion.
   */
  readonly x: number
  readonly y: number
  readonly modifiers: InputModifiers
  /**
   * How many presses in a row this one is: 1 for a single press, 2 for the
   * second press of a double click (MK-13).
   *
   * ⭐ Counted by the implementation, not derived here. Telling a double click
   * from two single ones is a question about elapsed time, and CS-1 of table
   * T-066 with LY-5 of table T-060 leave the clock to the Framework -- a pure
   * function that had to time the gap could not be pure.
   * ⚠️ Meaningful on `down` and `up`. A `move` carries the count of the press
   * that began the gesture, and a `lost` carries whatever the press carried.
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
   * How many detents the wheel turned, positive when the wheel was turned
   * TOWARD the person -- the direction that reads a document further down.
   *
   * ⭐ Two magnitudes travel on one happening because two rows need different
   * ones. `zoomStep` (S-53) is stated per NOTCH, so the zoom rows MK-2 to MK-4
   * need detents; nothing anywhere states how far one detent scrolls, and S-96
   * says why -- 「1 ノッチで何倍動くかは入力装置に依存する」. The device is the
   * only party that knows its own convention, so it reports both.
   */
  readonly notches: number
  /**
   * How far the host would have scrolled for this turn, in pixels, positive
   * down and right -- the same sign as `notches`.
   *
   * ⛔ NOT a second spelling of `notches`. MK-1 and MK-5 ask for a scroll and
   * the schedule's scroll position is an anchor in the document (S-77 / S-78),
   * so a distance is the only way across: `dateAtX` (PI-5) turns pixels into
   * the day drawn there, and no row of any table gives a day-per-notch figure
   * that could stand in for this.
   */
  readonly scrollPx: { readonly x: number; readonly y: number }
}

/** A key happening. Only the press: table T-036 assigns nothing to a release. */
export interface KeyInput {
  readonly kind: 'key'
  /**
   * The key, spelled as table T-036's assignment column spells it -- `Esc`,
   * `Enter`, `Delete`, `Backspace`, `F1`, `F2`, `F11`, and a letter or a sign
   * as one upper-case character (`A`, `P`, `F`, `+`, `-`, `0`).
   *
   * ⛔ The HOST's spelling does not appear here. A browser calls the first of
   * those `Escape` and reports a letter in the case the shift key produced, and
   * either would put a browser's convention inside a seam LR-6 exists to keep
   * clear of it. Mapping the host's names onto this column is the implementing
   * component's work (CP-27), which is the layer allowed to know them.
   * ⚠️ The upper case is table T-036's own: SK-14 prints `P` and SK-18 prints
   * `F`. `modifiers.shift` still says whether shift was actually held, so the
   * case of the character carries no second meaning.
   */
  readonly key: string
  readonly modifiers: InputModifiers
}

/** One happening from a person: FT-1's 「人の入力（ポインタとキー）」. */
export type HumanInput = PointerInput | WheelInput | KeyInput

/** What is handed each happening. */
export type InputWatcher = (input: HumanInput) => void

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface InputSource {
  /**
   * Begin reporting happenings to `receive`.
   *
   * ⭐ Pushed, not pulled -- the opposite of `ScreenSurface.readDialogueInput`
   * (IF-9), and for a reason that table T-078 states: FT-1 makes a person's
   * input a TRIGGER of a frame. Something asked once a frame could not wake a
   * frame, so nothing would run between two happenings, and NFR-010 forbids
   * running one on any trigger the table does not list.
   *
   * ⛔ ONE watcher, replaced by a second call rather than added to. Table T-060
   * LY-5 leaves the Framework as the only layer that may hold a current value,
   * so the shell is the only party with anywhere to put what it hears; a
   * fan-out with several listeners would need a rule for the order they run in,
   * and no requirement states one.
   *
   * @purity non-pure
   */
  watchInput(receive: InputWatcher): void

  /**
   * Stop reporting. Calling it while nothing is watching does nothing.
   *
   * ⭐ It exists because the implementation holds the host's own registrations
   * (CP-27), and a seam that could only be switched on would leave them alive
   * for the life of the page -- the same shape `unwatchChanges` (PI-15) takes
   * for the other subscription in this tree.
   *
   * @purity non-pure
   */
  unwatchInput(): void
}

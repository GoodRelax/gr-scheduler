// ScreenState -- public entry of this folder.
//
// @unit      UF-59   (docs/spec/05-07-design.md, table T-075)
// @component ScreenState, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-36
//
// The values the screen uses that the document does NOT keep: what is armed
// (table T-023b), whether the palette is showing (S-99e), whether the view is
// full screen (S-99f) and which surface is open (S-99g). U-51 of the glossary
// forbids calling this "the screen's state" in prose, because table T-203 and
// the K-67..K-72 rows already use that name for values that ARE saved.
//
// Held as one immutable value and replaced whole (LY-1), so this file publishes
// no setter -- every function returns a new state.

/** What the palette has armed. Table T-023b, AR-1 to AR-6. */
export type Armed =
  /** AR-1 */ | { readonly kind: 'none' }
  /** AR-2 -- the shape it will draw. Its spellings are SH-1..SH-5 of table T-012. */
  | { readonly kind: 'taskShape'; readonly shapeKind: string }
  /** AR-3 -- the glyph it will draw. The specification has not spelled these out. */
  | { readonly kind: 'milestoneShape'; readonly glyph: string }
  /** AR-4 */ | { readonly kind: 'dependency' }
  /** AR-5 */ | { readonly kind: 'commentBox' }
  /** AR-6 */ | { readonly kind: 'highlightBox' }

/**
 * A surface opened over the screen. S-99g calls it "a surface", and defines it
 * as what Esc closes at its first level; UF-66 of Chapter 5 holds which ones
 * there are, so the name is carried rather than enumerated here.
 *
 * ⛔ NOT EVERY SURFACE IS HELD HERE, AND S-99g'S DEFINITION IS WHY THAT IS NOT
 * A CONTRADICTION. U-55 `Confirmation` of table T-103 is a surface by that same
 * definition, and the Framework holds it beside this value rather than in it --
 * `EscapeContext` below says why, and `escapeTarget` gives it the first level
 * of IN-4 all the same. ⚠️ So a reader who finds a surface Esc reaches and this
 * value does not name has not found a defect.
 */
export type OpenSurface = string | null

export interface ScreenState {
  /** Table T-023b. */
  readonly armed: Armed
  /** S-99e. Its default is showing. */
  readonly paletteShown: boolean
  /** S-99f. Its default is the ordinary view. */
  readonly fullScreen: boolean
  /** S-99g. Its default is that none is open. */
  readonly surface: OpenSurface
}

const NONE: Armed = { kind: 'none' }

const EMPTY: ScreenState = {
  armed: NONE,
  paletteShown: true,
  fullScreen: false,
  surface: null,
}

/** @purity pure */
export function emptyScreenState(): ScreenState {
  return EMPTY
}

/** @purity pure */
export function screenStateWithArmed(state: ScreenState, armed: Armed): ScreenState {
  return { ...state, armed }
}

/** @purity pure */
export function screenStateWithSurface(state: ScreenState, surface: OpenSurface): ScreenState {
  return { ...state, surface }
}

/** @purity pure */
export function screenStateWithPalette(state: ScreenState, shown: boolean): ScreenState {
  return { ...state, paletteShown: shown }
}

/** @purity pure */
export function screenStateWithFullScreen(state: ScreenState, on: boolean): ScreenState {
  return { ...state, fullScreen: on }
}

/**
 * What one press of Esc takes.
 *
 * ⚠️ FIVE MEMBERS, FOUR LEVELS. IN-4 of table T-028 fixes four, and the first
 * two members below are both that ladder's FIRST level -- `escapeTarget` says
 * why there are two of them and why they are answered in this order.
 */
export type EscapeTarget = 'confirmation' | 'surface' | 'gesture' | 'armed' | 'dualCursorMode'

/**
 * What is happening outside this value that Esc may also consume. A gesture in
 * flight is the Framework's to know (LY-5), and the Dual Cursor mode is a saved
 * setting, so neither can be read from here.
 */
export interface EscapeContext {
  /** A drag under way, or an arrow half drawn. */
  readonly gestureInFlight: boolean
  readonly dualCursorMode: boolean
  /**
   * Whether a `Confirmation` (U-55 of table T-103) stands -- the surface NT-7
   * of table T-037 puts its question on.
   *
   * ⭐ OUTSIDE THIS VALUE FOR THE SAME REASON THE TWO ABOVE ARE: it is a current
   * value, and LY-5 of table T-060 leaves those with the Framework. ⛔ It is not
   * in `surface` because S-99g holds ONE name and the drawing side turns any
   * name there into a modal of its own, so a second question would be drawn over
   * the one already on screen.
   *
   * ⚠️ OPTIONAL BECAUSE ONE CALLER CANNOT SEE IT. `screenStateFromInput` (PI-18)
   * is pure and holds nothing, so it reports the levels it can see and leaves
   * this one out. ⛔ THE PRICE IS A RULE THE CALLERS MUST KEEP: a press whose
   * level is `'confirmation'` may be reckoned ONCE, by the holder of the
   * question -- asking a second caller that cannot see it would get the NEXT
   * level down and spend two on one press, which IN-4 forbids (1 階層, MUST).
   */
  readonly isConfirmationStanding?: boolean
}

/**
 * What the next Esc consumes, or null when it consumes nothing.
 *
 * IN-4 fixes the order -- open surface, then the gesture in flight, then what
 * is armed, then the Dual Cursor mode -- and IN-4a is the reason null matters:
 * with nothing to consume the key MUST reach the browser, because leaving full
 * screen is the browser's own behaviour and would otherwise be unreachable.
 *
 * ⭐ THE `Confirmation` IS THAT FIRST LEVEL AND NOT A FIFTH ONE. U-55 of table
 * T-103 calls it a surface, and S-99g of table T-206 defines a surface as what
 * the first level of IN-4 closes -- so the level is already IN the ladder and
 * nothing is added to it here.
 * ⚠️ ANSWERED BEFORE `state.surface` BECAUSE TWO SURFACES CAN STAND AT ONCE IN
 * THIS BUILD, WHICH THE SPECIFICATION DOES NOT CONTEMPLATE: S-99g holds exactly
 * one, and the question is raised outside it, so IN-4 orders no two surfaces
 * against each other and cannot be quoted for this. ⭐ The question is raised
 * OVER whatever stood, so taking the one behind it first would leave the
 * question standing over a screen that changed underneath it.
 *
 * @purity pure
 */
export function escapeTarget(state: ScreenState, context: EscapeContext): EscapeTarget | null {
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (state.surface !== null) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  if (state.armed.kind !== 'none') return 'armed'
  if (context.dualCursorMode) return 'dualCursorMode'
  return null
}

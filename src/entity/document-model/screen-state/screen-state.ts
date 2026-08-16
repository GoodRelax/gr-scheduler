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

/** What one press of Esc takes, in the order IN-4 of table T-028 fixes. */
export type EscapeTarget = 'surface' | 'gesture' | 'armed' | 'dualCursorMode'

/**
 * What is happening outside this value that Esc may also consume. A gesture in
 * flight is the Framework's to know (LY-5), and the Dual Cursor mode is a saved
 * setting, so neither can be read from here.
 */
export interface EscapeContext {
  /** A drag under way, or an arrow half drawn. */
  readonly gestureInFlight: boolean
  readonly dualCursorMode: boolean
}

/**
 * What the next Esc consumes, or null when it consumes nothing.
 *
 * IN-4 fixes the order -- open surface, then the gesture in flight, then what
 * is armed, then the Dual Cursor mode -- and IN-4a is the reason null matters:
 * with nothing to consume the key MUST reach the browser, because leaving full
 * screen is the browser's own behaviour and would otherwise be unreachable.
 *
 * @purity pure
 */
export function escapeTarget(state: ScreenState, context: EscapeContext): EscapeTarget | null {
  if (state.surface !== null) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  if (state.armed.kind !== 'none') return 'armed'
  if (context.dualCursorMode) return 'dualCursorMode'
  return null
}

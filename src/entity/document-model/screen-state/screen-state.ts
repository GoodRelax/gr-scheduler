// ScreenState -- public entry of this folder.
//
// @unit      UF-59   (docs/spec/05-07-design.md, table T-075)
// @component ScreenState, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-36
//
// The values the screen uses that the document does NOT keep: what is armed
// (table T-023b), S-99e, S-99f, S-99g and S-144. Not called "the screen's
// state" in prose (U-51): table T-203 uses that name for values that are saved.
//
// Replaced whole (LY-1), so every function returns a new state.

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
 * A surface opened over the screen (S-99g); UF-66 holds which ones there are,
 * so the name is carried rather than enumerated.
 *
 * Not every surface is held here: a `Confirmation` (U-55) is held by the
 * Framework beside this value, and `EscapeContext` says why.
 * S-99g still calls the surface rung Esc's first level; IN-4 now puts it third.
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
  /** S-144. Not a document setting, and may not become one (FR-020). */
  readonly watermarkVisible: boolean
}

const NONE: Armed = { kind: 'none' }

const EMPTY: ScreenState = {
  armed: NONE,
  paletteShown: true,
  fullScreen: false,
  surface: null,
  // Coming up hidden would take the trace off every document opened in a fresh
  // screen without anyone asking (S-144).
  watermarkVisible: true,
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
 * S-144 -- put the watermark on the screen, or take it off it.
 *
 * The unlock password FR-020 asks for on the hiding side is not checked here:
 * the SHA-256 match (WM-6) needs the browser, which LR-6 keeps out of this
 * layer, so the side that asked holds the question.
 *
 * @purity pure
 */
export function screenStateWithWatermark(state: ScreenState, visible: boolean): ScreenState {
  return { ...state, watermarkVisible: visible }
}

/**
 * What one press of Esc takes: one member per level of IN-4 of table T-028,
 * except that `'confirmation'` and `'surface'` share its 開いている面 and
 * `'propertiesPanel'` has no level of its own (`escapeTarget` chooses its rung).
 */
export type EscapeTarget =
  | 'notice'
  | 'textEntry'
  | 'confirmation'
  | 'surface'
  | 'gesture'
  | 'propertiesPanel'
  | 'armed'
  | 'selection'
  | 'dualCursorMode'
  | 'tooltip'

/** Which of the two dates S-65 holds is meant (DC-1 of table T-029a). */
export type DualCursorSide = 'date1' | 'date2'

/**
 * What is happening outside this value that Esc may also consume. These are
 * the Framework's current values (LY-5 of table T-060), so they arrive as
 * questions rather than being read here.
 *
 * Every optional member reads absent as "not standing", so a caller that cannot
 * see it falls through to the rung below instead of swallowing the press. The
 * price: a press whose level is an optional member's must be reckoned ONCE, by
 * the holder of that value -- a second caller that cannot see it answers the
 * next level down and spends two levels on one press.
 */
export interface EscapeContext {
  /** IN-4's first level: whether a telling is still standing (NT-8 of table T-037). */
  readonly isNoticeStanding?: boolean
  /** IN-4's second level: in-place text not yet settled (the state IN-5a also reads). */
  readonly isTextEntryUnsettled: boolean
  /** A drag under way, or an arrow half drawn. */
  readonly gestureInFlight: boolean
  /**
   * IN-4's sixth level: whether anything is selected (table T-023c). A question,
   * because IN-4 spends the level on the selection as a whole.
   *
   * One press spends one rung, so the press that puts the panel away must not
   * also clear the selection (FR-072).
   */
  readonly isSelectionStanding?: boolean
  /**
   * IN-4's seventh level: whether the Dual Cursor mode is up. Not the following
   * side, because an Esc leaves the whole mode (DC-4).
   */
  readonly dualCursorMode: boolean
  /**
   * Whether a `Confirmation` (U-55) stands. Not in `surface`: S-99g holds one
   * name and the drawing side turns any name there into a modal, so a second
   * question would be drawn over the one on screen. Optional because
   * `screenStateFromInput` (PI-18) cannot see it.
   */
  readonly isConfirmationStanding?: boolean
  /**
   * Whether the `Properties Panel` (U-25) is on the screen; IC-52 of table T-109
   * puts it on this ladder. Not in `surface`, for the modal reason above.
   */
  readonly isPropertiesPanelOpen?: boolean
  /**
   * IN-4's last level: whether an explanation (U-53) is standing. It is the only
   * way IN-3's dismissal is met.
   */
  readonly isTooltipStanding?: boolean
}

/**
 * What the next Esc consumes, in IN-4's order, or null when it consumes nothing
 * (IN-4a hands the key to the browser).
 *
 * The standing question is answered before `state.surface` because it is raised
 * over whatever stood; closing the surface behind it first would leave it over a
 * screen that changed. IN-4 orders no two surfaces, so this order is this file's.
 *
 * @purity pure
 */
export function escapeTarget(state: ScreenState, context: EscapeContext): EscapeTarget | null {
  if (context.isNoticeStanding === true) return 'notice'
  // Ahead of the confirmation: a reader typing when a question arrives still
  // owns the characters they were putting in.
  if (context.isTextEntryUnsettled) return 'textEntry'
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (state.surface !== null) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  // Below the gesture: the panel does not open over the screen (FR-052 takes its
  // width out of the canvas), and above the gesture a drag on the fade grab
  // points, shown only on a selected Task (FR-075), could never be cancelled
  // by Esc (IN-1). No row orders the panel; this line is the choice.
  if (context.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (state.armed.kind !== 'none') return 'armed'
  // No "panel not showing" condition: the panel rung above is that guard (IN-4).
  if (context.isSelectionStanding === true) return 'selection'
  if (context.dualCursorMode) return 'dualCursorMode'
  if (context.isTooltipStanding === true) return 'tooltip'
  return null
}

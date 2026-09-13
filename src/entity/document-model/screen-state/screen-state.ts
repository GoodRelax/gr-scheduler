// The values the screen uses that the document does not keep.
// @unit      UF-59   (docs/spec/05-07-design.md, table T-075)
// @component ScreenState, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-36

export type Armed =
  | { readonly kind: 'none' }
  | { readonly kind: 'taskShape'; readonly shapeKind: string }
  | { readonly kind: 'milestoneShape'; readonly glyph: string }
  | { readonly kind: 'dependency' }
  | { readonly kind: 'commentBox' }
  | { readonly kind: 'highlightBox' }

export type OpenSurface = string | null

export interface ScreenState {
  readonly armed: Armed
  readonly paletteShown: boolean
  readonly fullScreen: boolean
  readonly surface: OpenSurface
  readonly watermarkVisible: boolean
}

const NONE: Armed = { kind: 'none' }

const EMPTY: ScreenState = {
  armed: NONE,
  paletteShown: true,
  fullScreen: false,
  surface: null,
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

/** @purity pure */
export function screenStateWithWatermark(state: ScreenState, visible: boolean): ScreenState {
  return { ...state, watermarkVisible: visible }
}

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

export type DualCursorSide = 'date1' | 'date2'

// TRAP: an optional member's level must be reckoned once, by the holder of that value;
// a second caller that cannot see it answers the next level down and spends two levels.
export interface EscapeContext {
  readonly isNoticeStanding?: boolean
  readonly isTextEntryUnsettled: boolean
  readonly gestureInFlight: boolean
  readonly isSelectionStanding?: boolean
  readonly dualCursorMode: boolean
  readonly isConfirmationStanding?: boolean
  readonly isPropertiesPanelOpen?: boolean
  readonly isTooltipStanding?: boolean
}

// see IN-4
/** @purity pure */
export function escapeTarget(state: ScreenState, context: EscapeContext): EscapeTarget | null {
  if (context.isNoticeStanding === true) return 'notice'
  if (context.isTextEntryUnsettled) return 'textEntry'
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (state.surface !== null) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  // WHY: no row orders the panel; below the gesture so a fade-grab drag stays cancellable by Esc.
  if (context.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (state.armed.kind !== 'none') return 'armed'
  if (context.isSelectionStanding === true) return 'selection'
  if (context.dualCursorMode) return 'dualCursorMode'
  if (context.isTooltipStanding === true) return 'tooltip'
  return null
}

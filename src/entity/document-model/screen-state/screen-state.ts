// The values the screen uses that the document does not keep.
// @unit      UF-59   (docs/spec/05-07-design.md, table T-075)
// @component ScreenState, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-36

// see PV-4, PV-5
export interface RememberedActual {
  readonly actualStart: string | null
  readonly actualFinish: string | null
  readonly stop: string | null
  readonly carriedActualDuration: string | null
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
  readonly isSurfaceOpen: boolean
  readonly gestureInFlight: boolean
  readonly isArmed: boolean
  readonly isSelectionStanding?: boolean
  readonly dualCursorMode: boolean
  readonly isConfirmationStanding?: boolean
  readonly isPropertiesPanelOpen?: boolean
  readonly isTooltipStanding?: boolean
}

// see IN-4, T-283
/** @purity pure */
export function escapeTarget(context: EscapeContext): EscapeTarget | null {
  if (context.isNoticeStanding === true) return 'notice'
  if (context.isTextEntryUnsettled) return 'textEntry'
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (context.isSurfaceOpen) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  if (context.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (context.isArmed) return 'armed'
  if (context.isSelectionStanding === true) return 'selection'
  if (context.dualCursorMode) return 'dualCursorMode'
  if (context.isTooltipStanding === true) return 'tooltip'
  return null
}

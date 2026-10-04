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

// see T-335, RG-16
// WHY: the words of escapePressed.rung that RG-16 names, one per window of table T-335.
export type WindowName = 'searchPanel' | 'helpModal' | 'delayDiagnosticsReport' | 'dialogueField'

export type EscapeTarget =
  | 'notice'
  | 'textEntry'
  | 'confirmation'
  | 'surface'
  | 'gesture'
  | WindowName
  | 'propertiesPanel'
  | 'armed'
  | 'selection'
  | 'dualCursorMode'
  | 'tooltip'
  | 'fullScreen'

export type DualCursorSide = 'date1' | 'date2'

// see RG-16, RW-5
export interface WindowStanding {
  readonly isSearchPanelStanding?: boolean
  readonly isHelpStanding?: boolean
  readonly isDelayDiagnosticsReportStanding?: boolean
  readonly isDialogueFieldStanding?: boolean
  readonly focusedWindow?: WindowName | null
  // WHY: RW-5 -- the report window and the search panel share UZ-6; the one opened later is in front.
  readonly isDelayDiagnosticsReportInFront?: boolean
}

// TRAP: an optional member's level must be reckoned once, by the holder of that value;
// a second caller that cannot see it answers the next level down and spends two levels.
export interface EscapeContext extends WindowStanding {
  readonly isNoticeStanding?: boolean
  readonly isTextEntryUnsettled: boolean
  readonly isSurfaceOpen: boolean
  readonly gestureInFlight: boolean
  readonly isFocusInPropertiesPanel?: boolean
  readonly isArmed: boolean
  readonly isSelectionStanding?: boolean
  readonly dualCursorMode: boolean
  readonly isConfirmationStanding?: boolean
  readonly isPropertiesPanelOpen?: boolean
  readonly isTooltipStanding?: boolean
  readonly isFullScreen?: boolean
}

// see T-337, RW-5
/** @purity pure */
function windowsFrontToBack(standing: WindowStanding): readonly WindowName[] {
  const sharedLayer: readonly WindowName[] =
    standing.isDelayDiagnosticsReportInFront === true
      ? ['delayDiagnosticsReport', 'searchPanel']
      : ['searchPanel', 'delayDiagnosticsReport']
  return [...sharedLayer, 'helpModal', 'dialogueField']
}

/** @purity pure */
function isWindowStanding(standing: WindowStanding, window: WindowName): boolean {
  switch (window) {
    case 'searchPanel':
      return standing.isSearchPanelStanding === true
    case 'helpModal':
      return standing.isHelpStanding === true
    case 'delayDiagnosticsReport':
      return standing.isDelayDiagnosticsReportStanding === true
    case 'dialogueField':
      return standing.isDialogueFieldStanding === true
  }
}

// see IN-4, RG-16, T-337
// WHY: one Esc closes one window: the focused one first, otherwise the front-most of table T-337.
/** @purity pure */
export function windowClosedByEscape(standing: WindowStanding): WindowName | null {
  const focused = standing.focusedWindow ?? null
  if (focused !== null && isWindowStanding(standing, focused)) return focused
  return windowsFrontToBack(standing).find((window) => isWindowStanding(standing, window)) ?? null
}

// see IN-4, T-283
/** @purity pure */
export function escapeTarget(context: EscapeContext): EscapeTarget | null {
  if (context.isNoticeStanding === true) return 'notice'
  if (context.isTextEntryUnsettled) return 'textEntry'
  if (context.isConfirmationStanding === true) return 'confirmation'
  if (context.isSurfaceOpen) return 'surface'
  if (context.gestureInFlight) return 'gesture'
  // WHY: IN-4 -- while the focus is in the properties panel, the panel rung takes this Esc first.
  const window = context.isFocusInPropertiesPanel === true ? null : windowClosedByEscape(context)
  if (window !== null) return window
  if (context.isPropertiesPanelOpen === true) return 'propertiesPanel'
  if (context.isArmed) return 'armed'
  if (context.isSelectionStanding === true) return 'selection'
  if (context.dualCursorMode) return 'dualCursorMode'
  if (context.isTooltipStanding === true) return 'tooltip'
  // WHY: IN-4 -- full screen is left only when nothing else is left to cancel.
  if (context.isFullScreen === true) return 'fullScreen'
  return null
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-333)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-333, FR-151
export const NOT_STORED_SEARCH_PANEL_FONT_SIZES: {
  readonly 'S-430': number
  readonly 'S-431': number
  readonly 'S-432': number
} = {
  'S-430': 9,
  'S-431': 10,
  'S-432': 12,
}
// </generated>

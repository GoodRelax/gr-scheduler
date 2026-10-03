// InputCommandTranslator -- the screen-value event of an input (T-280, IN-4 of table T-028, T-023b).
// @unit      UF-102  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { ScreenValuesEvent } from '../../use-case/advance-screen-session/advance-screen-session'
import { cycleTaskPlanActualState } from '../../use-case/edit-document/edit-document'
import type {
  HumanInput,
  KeyInput,
  PointerInput,
} from './input-source'
import {
  screenEventFromDualCursorEntry,
  screenEventFromDualCursorPress,
} from './dual-cursor-input'
import { screenEventFromPanelDivider } from './frame-drags'
import {
  ENTRY,
  KEY,
  armedByEntry,
  grabRowOf,
  guideCursorModeOfEntry,
  hasDraggedPastThreshold,
  isCombo,
  isOnRowArea,
  isSingleCharacterKey,
  isTypedIntoSearchWord,
  pressRowOf,
  rememberedActualIn,
  type InputContext,
} from './input-command-translator'

const HELP_MODAL = 'Help Modal'

// DEVIATION: spec says a surface is named by its U row (T-280); here by its glossary name (DFC-703)
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

// TRAP: never an open surface's name; the drawing side would draw the panel as a modal.
const PROPERTIES_PANEL = 'Properties Panel'

// see U-64, U-44, S-99g
// WHY: windows, not open surfaces (T-335): IC-52 on one closes that window, never the surface.
const SEARCH_PANEL = 'Search Panel'
const DIALOGUE_FIELD = 'Dialogue Field'
const DELAY_DIAGNOSTICS_REPORT = 'Delay Diagnostics Report'

type WindowEvents = readonly [ScreenValuesEvent, ScreenValuesEvent, ScreenValuesEvent | null]

// WHY: the help's IC-52 stays surfaceCloseAsked (IC-52 of table T-109); the report window has no machine (RW-1).
const WINDOW_EVENTS: Readonly<Record<string, WindowEvents>> = {
  [HELP_MODAL]: [{ type: 'helpMinimiseToggled' }, { type: 'helpMaximiseToggled' }, null],
  [SEARCH_PANEL]: [{ type: 'searchPanelMinimiseToggled' }, { type: 'searchPanelMaximiseToggled' }, { type: 'searchPanelClosePressed' }],
  [DIALOGUE_FIELD]: [
    { type: 'dialogueFieldMinimiseToggled' },
    { type: 'dialogueFieldMaximiseToggled' },
    { type: 'dialogueFieldClosePressed' },
  ],
}

const SEARCH_ENTRY_PRESSED: ScreenValuesEvent = { type: 'searchEntryPressed' }

const PALETTE_TOGGLED: ScreenValuesEvent = { type: 'paletteToggled' }

const WATERMARK_ENTRY_PRESSED: ScreenValuesEvent = { type: 'watermarkEntryPressed' }

const SURFACE_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'surface' }

const HELP_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'helpModal' }

const HELP_ENTRY_PRESSED: ScreenValuesEvent = { type: 'helpEntryPressed' }

const ARM_DROPPED: ScreenValuesEvent = { type: 'escapePressed', rung: 'armed' }

/** @purity pure */
function surfaceEntered(surfaceName: string): ScreenValuesEvent {
  return { type: 'surfaceEntryPressed', surfaceName }
}

// see FR-083, T-023b, T-280
/** @purity pure */
function screenEventFromEntry(entry: string, context: InputContext): ScreenValuesEvent | null {
  switch (entry) {
    case ENTRY.palette:
      return PALETTE_TOGGLED
    case ENTRY.help:
      return HELP_ENTRY_PRESSED
    case ENTRY.resourceRoster:
      return surfaceEntered(RESOURCE_ROSTER)
    case ENTRY.dualCursor: {
      const entered = screenEventFromDualCursorEntry(context)
      const isPlacingNothing = entered.type === 'dualCursorEntryPressed' && !entered.hasDaysToPlace
      // DEVIATION: spec says only a raised mode drops the arm (T-280); here any press with the mode off does, PND-313 too (DFC-704)
      return isPlacingNothing && context.dualCursorFollowing === null ? ARM_DROPPED : entered
    }
    case ENTRY.themePreference:
      return themeTurned(context)
    case ENTRY.watermark:
      return WATERMARK_ENTRY_PRESSED
    case ENTRY.exportChooser:
      return surfaceEntered(EXPORT_CHOOSER)
    case ENTRY.closeSurface:
      return surfaceCloseOf(context.pressed?.on?.part ?? null)
    default:
      break
  }

  const guideCursor = guideCursorModeOfEntry(entry)
  if (guideCursor !== null) return { type: 'guideCursorEntryPressed', guideCursor }
  const armed = armedByEntry(entry)
  if (armed === null) return null
  return {
    type: 'armEntryPressed',
    armKind: armed.kind,
    shapeKind: armed.kind === 'taskShapeArmed' ? armed.shapeKind : null,
    glyph: armed.kind === 'milestoneShapeArmed' ? armed.glyph : null,
  }
}

// see IC-52, FR-036
/** @purity pure */
function surfaceCloseOf(part: string | null): ScreenValuesEvent | null {
  if (part === PROPERTIES_PANEL || part === DELAY_DIAGNOSTICS_REPORT) return null
  return part === HELP_MODAL ? HELP_CLOSE_ASKED : SURFACE_CLOSE_ASKED
}

// see IC-117, WB-7, SV-14, FR-066
/** @purity pure */
function windowEventOf(entry: string, part: string): ScreenValuesEvent | null {
  if (entry === ENTRY.search) return SEARCH_ENTRY_PRESSED
  const events = WINDOW_EVENTS[part]
  if (events === undefined) return null
  const [minimised, maximised, closed] = events
  if (entry === ENTRY.windowMinimise) return minimised
  if (entry === ENTRY.windowMaximise || entry === ENTRY.windowRestore) return maximised
  return entry === ENTRY.closeSurface ? closed : null
}

// see FR-039, IC-16, T-280
/** @purity pure */
function themeTurned(context: InputContext): ScreenValuesEvent {
  const isDarkNow = context.screen.themePreference === 'dark'
  return { type: 'themePreferenceChosen', themePreference: isDarkNow ? 'light' : 'dark' }
}

// see PTD-2, DC-2, T-280
// TRAP: judge PTD-2 as pointerAssignment does; a looser test places a date from a press it leaves unassigned.
/** @purity pure */
function screenEventAfterChartPress(input: PointerInput, context: InputContext): ScreenValuesEvent | null {
  const press = context.pressed
  if (press === null) return null
  const isChartPress = press.hit !== null || isOnRowArea(context, press.at.x, press.at.y)
  if (isChartPress && pressRowOf(press, context) === 'PTD-2') {
    return screenEventFromDualCursorPress(press, context)
  }
  return screenEventAfterMarkerPress(input, context)
}

// see PV-4, PV-5, T-280
/** @purity pure */
function screenEventAfterMarkerPress(
  input: PointerInput,
  context: InputContext,
): ScreenValuesEvent | null {
  const press = context.pressed
  if (press === null || press.hit === null) return null
  if (grabRowOf(press.hit) !== 'GA-18' || press.hit.item.kind !== 'task') return null
  if (hasDraggedPastThreshold(press, input)) return null
  const uid = press.hit.item.taskUid
  const task = taskByUid(context.document.schedule, uid)
  if (task === null) return null
  const remembered = rememberedActualIn(context, uid)
  const turned = cycleTaskPlanActualState(task, remembered, {
    floorDay: task.start,
    milestone: task.milestone === true,
  })
  return {
    type: 'progressMarkerPressed',
    taskUid: uid,
    rememberedActual: turned.remembered,
    writes: [{ kind: 'cycleTaskPlanActualState', uid, remembered }],
  }
}

// see SK-12, SK-24, IN-5a, T-280
/** @purity pure */
function screenEventFromKey(input: KeyInput, context: InputContext): ScreenValuesEvent | null {
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return surfaceEntered(EXPORT_CHOOSER)
  }
  const isCtrlOnly = isCombo(input.modifiers, true, false, false)
  if (isCtrlOnly && input.key === KEY.f) return SEARCH_ENTRY_PRESSED
  if (!isCombo(input.modifiers, false, false, false)) return null
  const isFieldTaking = context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true
  if (isFieldTaking && isSingleCharacterKey(input.key)) return null
  if (input.key === KEY.f1) return HELP_ENTRY_PRESSED
  if (input.key === KEY.p) return PALETTE_TOGGLED
  return null
}

// see T-280, IN-4, T-283
/** @purity pure */
export function screenEventFromInput(
  input: HumanInput,
  context: InputContext,
): ScreenValuesEvent | null {
  if (isTypedIntoSearchWord(input, context)) return null
  if (input.kind === 'key') return screenEventFromKey(input, context)
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const on = context.pressed === null ? null : context.pressed.on
  if (on?.isImportReportDismiss === true) return SURFACE_CLOSE_ASKED
  if (on === null) return screenEventAfterChartPress(input, context)
  const press = context.pressed
  if (on.dividerPanel === 'propertiesPanel' && press !== null) {
    return screenEventFromPanelDivider(input, press, context)
  }
  if (on.entry === null) return null
  return windowEventOf(on.entry, on.part) ?? screenEventFromEntry(on.entry, context)
}

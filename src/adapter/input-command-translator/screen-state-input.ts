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
  ENTRY,
  KEY,
  armedByEntry,
  grabRowOf,
  hasDraggedPastThreshold,
  isCombo,
  isSingleCharacterKey,
  rememberedActualIn,
  type InputContext,
} from './input-command-translator'

// DEVIATION: spec says a surface is named by its U row (T-280); here by its glossary name, U-30 naming two (DFC-703)
const HELP_MODAL = 'Help Modal'

const AI_EXPORT_MODAL = 'AI Export Modal'
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

// TRAP: never an open surface's name; the drawing side would draw the panel as a modal.
const PROPERTIES_PANEL = 'Properties Panel'

const PALETTE_TOGGLED: ScreenValuesEvent = { type: 'paletteToggled' }

const WATERMARK_ENTRY_PRESSED: ScreenValuesEvent = { type: 'watermarkEntryPressed' }

const SURFACE_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'surface' }

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
      return surfaceEntered(HELP_MODAL)
    case ENTRY.aiExportModal:
      return surfaceEntered(AI_EXPORT_MODAL)
    case ENTRY.resourceRoster:
      return surfaceEntered(RESOURCE_ROSTER)
    case ENTRY.dualCursor:
      // DEVIATION: spec says only a raised mode drops the arm (T-280); here any press with the mode off does, PND-313 too (DFC-704)
      return context.dualCursorFollowing === null ? ARM_DROPPED : null
    case ENTRY.watermark:
      return WATERMARK_ENTRY_PRESSED
    case ENTRY.exportChooser:
      return surfaceEntered(EXPORT_CHOOSER)
    case ENTRY.closeSurface:
      return context.pressed?.on?.part === PROPERTIES_PANEL ? null : SURFACE_CLOSE_ASKED
    default:
      break
  }

  const armed = armedByEntry(entry)
  if (armed === null) return null
  return {
    type: 'armEntryPressed',
    armKind: armed.kind,
    shapeKind: armed.kind === 'taskShapeArmed' ? armed.shapeKind : null,
    glyph: armed.kind === 'milestoneShapeArmed' ? armed.glyph : null,
  }
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
    milestone: isDrawnAsMilestone(context, uid),
  })
  return {
    type: 'progressMarkerPressed',
    taskUid: uid,
    rememberedActual: turned.remembered,
    writes: [{ kind: 'cycleTaskPlanActualState', uid, remembered }],
  }
}

// see AT-100, FR-083
/** @purity pure */
function isDrawnAsMilestone(context: InputContext, uid: number): boolean {
  const drawn = context.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn !== undefined) return drawn.shapeKind === 'milestone'
  const task = taskByUid(context.document.schedule, uid)
  return task !== null && task.milestone === true
}

// see SK-12, IN-5a, T-280
/** @purity pure */
function screenEventFromKey(input: KeyInput, context: InputContext): ScreenValuesEvent | null {
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return surfaceEntered(EXPORT_CHOOSER)
  }
  if (!isCombo(input.modifiers, false, false, false)) return null
  const isFieldTaking = context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true
  if (isFieldTaking && isSingleCharacterKey(input.key)) return null
  if (input.key === KEY.f1) return surfaceEntered(HELP_MODAL)
  if (input.key === KEY.p) return PALETTE_TOGGLED
  return null
}

// see T-280, IN-4, T-283
/** @purity pure */
export function screenEventFromInput(
  input: HumanInput,
  context: InputContext,
): ScreenValuesEvent | null {
  if (input.kind === 'key') return screenEventFromKey(input, context)
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const on = context.pressed === null ? null : context.pressed.on
  if (on?.isImportReportDismiss === true) return SURFACE_CLOSE_ASKED
  if (on === null) return screenEventAfterMarkerPress(input, context)
  return on.entry === null ? null : screenEventFromEntry(on.entry, context)
}

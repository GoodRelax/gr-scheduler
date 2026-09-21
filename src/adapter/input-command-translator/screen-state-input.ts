// InputCommandTranslator -- the next screen state from an input (IN-4 of table T-028, T-023b).
// @unit      UF-102  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  escapeTarget,
  rememberedActualOf,
  screenStateWithArmed,
  screenStateWithPalette,
  screenStateWithRememberedActual,
  screenStateWithSurface,
  screenStateWithWatermark,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import { cycleTaskPlanActualState } from '../../use-case/edit-document/edit-document'
import type {
  HumanInput,
  PointerInput,
} from './input-source'
import {
  ENTRY,
  KEY,
  armedByEntry,
  escapeContextOf,
  grabRowOf,
  hasDraggedPastThreshold,
  isCombo,
  isSameArm,
  isSingleCharacterKey,
  type InputContext,
} from './input-command-translator'

const HELP_MODAL = 'Help Modal'

const AI_EXPORT_MODAL = 'AI Export Modal'
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

const WATERMARK_UNLOCK = 'Watermark Unlock'

// TRAP: never put this in ScreenState.surface; the drawing side would draw the panel as a modal.
const PROPERTIES_PANEL = 'Properties Panel'

// see FR-083, T-023b
/** @purity pure */
function screenStateFromEntry(entry: string, context: InputContext): ScreenState {
  const state = context.screenState

  switch (entry) {
    case ENTRY.palette:
      return screenStateWithPalette(state, !state.paletteShown)
    case ENTRY.help:
      return screenStateWithSurface(state, HELP_MODAL)
    case ENTRY.aiExportModal:
      return screenStateWithSurface(state, AI_EXPORT_MODAL)
    case ENTRY.resourceRoster:
      return screenStateWithSurface(state, RESOURCE_ROSTER)
    case ENTRY.dualCursor:
      // WHY: the arm drops even where PND-313 takes the press without raising the mode;
      // re-reading dayAtX here would put that rule in a second place.
      return context.dualCursorFollowing === null
        ? screenStateWithArmed(state, { kind: 'none' })
        : state
    case ENTRY.watermark:
      return state.watermarkVisible
        ? screenStateWithSurface(state, WATERMARK_UNLOCK)
        : screenStateWithWatermark(state, true)
    case ENTRY.exportChooser:
      return screenStateWithSurface(state, EXPORT_CHOOSER)
    case ENTRY.closeSurface:
      return context.pressed?.on?.part === PROPERTIES_PANEL
        ? state
        : screenStateWithSurface(state, null)
    default:
      break
  }

  const armed = armedByEntry(entry)
  if (armed === null) return state
  return screenStateWithArmed(state, isSameArm(state.armed, armed) ? { kind: 'none' } : armed)
}

// see PV-4, PV-5, CP-36
/** @purity pure */
function screenStateAfterMarkerPress(input: PointerInput, context: InputContext): ScreenState {
  const state = context.screenState
  const press = context.pressed
  if (press === null || press.hit === null) return state
  if (grabRowOf(press.hit) !== 'GA-18' || press.hit.item.kind !== 'task') return state
  if (hasDraggedPastThreshold(press, input)) return state
  const uid = press.hit.item.taskUid
  const task = taskByUid(context.document.schedule, uid)
  if (task === null) return state
  const turned = cycleTaskPlanActualState(task, rememberedActualOf(state, uid), {
    floorDay: task.start,
    milestone: isDrawnAsMilestone(context, uid),
  })
  return screenStateWithRememberedActual(state, uid, turned.remembered)
}

// see AT-100, FR-083
/** @purity pure */
function isDrawnAsMilestone(context: InputContext, uid: number): boolean {
  const drawn = context.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn !== undefined) return drawn.shapeKind === 'milestone'
  const task = taskByUid(context.document.schedule, uid)
  return task !== null && task.milestone === true
}

// see CP-36, IN-4
/** @purity pure */
export function screenStateFromInput(input: HumanInput, context: InputContext): ScreenState {
  const state = context.screenState
  if (input.kind === 'pointer') {
    if (input.phase !== 'up') return state
    const on = context.pressed === null ? null : context.pressed.on
    if (on?.isImportReportDismiss === true) return screenStateWithSurface(state, null)
    if (on === null) return screenStateAfterMarkerPress(input, context)
    return on.entry === null ? state : screenStateFromEntry(on.entry, context)
  }
  if (input.kind !== 'key') return state
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return screenStateWithSurface(state, EXPORT_CHOOSER)
  }
  const plain = isCombo(input.modifiers, false, false, false)
  if (!plain) return state
  // see IN-5a
  if (context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true) {
    if (isSingleCharacterKey(input.key)) return state
  }

  if (input.key === KEY.escape) {
    // TRAP: escapeContextOf never reports a standing confirmation, so a caller holding one
    // must not ask this member (it would close the surface behind it); frame-loop.ts skips it.
    switch (escapeTarget(state, escapeContextOf(context))) {
      case 'surface':
        return screenStateWithSurface(state, null)
      case 'armed':
        return screenStateWithArmed(state, { kind: 'none' })
      case 'notice':
      case 'gesture':
      case 'dualCursorMode':
      case 'confirmation':
      case 'propertiesPanel':
      case 'selection':
      case null:
      default:
        return state
    }
  }

  if (input.key === KEY.f1) return screenStateWithSurface(state, HELP_MODAL)
  if (input.key === KEY.p) return screenStateWithPalette(state, !state.paletteShown)

  return state
}

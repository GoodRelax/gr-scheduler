// InputCommandTranslator -- the screen-value event of an input or a settled field (T-280, IN-4 of table T-028, T-023b).
// @unit      UF-102  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  dayOf,
  taskByUid,
  textOfDay,
  viewRegionOf,
  type CalendarDay,
} from '../../entity/document-model/schedule/schedule'
import { snapMinutesOf } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  calendarDraftOf,
  withExceptionAdded,
  withExceptionDayTyped,
  withExceptionDeleted,
  withExceptionKindToggled,
  withExceptionNameTyped,
  withRangeAdded,
  withRangeDeleted,
  withRangeTimeTyped,
  withWeekdayToggled,
  withWeekStart,
  type ScreenValuesEvent,
  type SessionEvent,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { cycleTaskPlanActualState } from '../../use-case/edit-document/edit-document'
import type { FieldCommit, ScreenPart } from '../screen-renderer/screen-renderer'
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
  grabTaskGroupOf,
  guideCursorModeOfEntry,
  hasDraggedPastThreshold,
  isCombo,
  isOnTaskGroupArea,
  isSingleCharacterKey,
  isTypedIntoSearchWord,
  pressRowOf,
  rememberedActualIn,
  type InputContext,
} from './input-command-translator'

const HELP_MODAL = 'Help Modal'

// see T-280, S-99g, U-54
const EXPORT_CHOOSER_ROW = 'U-54'

// TRAP: never an open surface's name; the drawing side would draw the panel as a modal.
const PROPERTIES_PANEL = 'Properties Panel'

// see U-64, U-44, S-99g
// WHY: windows, not open surfaces (T-335): IC-52 on one closes that window, never the surface.
const SEARCH_PANEL = 'Search Panel'
const DIALOGUE_FIELD = 'Dialogue Field'
const DELAY_DIAGNOSTICS_REPORT = 'Delay Diagnostics Report'
const RESOURCE_LIST = 'Resource List'

type WindowEvents = readonly [ScreenValuesEvent, ScreenValuesEvent, ScreenValuesEvent | null]

// WHY: the help's IC-52 stays surfaceCloseAsked (IC-52 of table T-109); the report and resource list windows have no machine (RW-1, RO-1).
const WINDOW_EVENTS: Readonly<Record<string, WindowEvents>> = {
  [HELP_MODAL]: [{ type: 'helpMinimizeToggled' }, { type: 'helpMaximizeToggled' }, null],
  [SEARCH_PANEL]: [{ type: 'searchPanelMinimizeToggled' }, { type: 'searchPanelMaximizeToggled' }, { type: 'searchPanelClosePressed' }],
  [DIALOGUE_FIELD]: [
    { type: 'dialogueFieldMinimizeToggled' },
    { type: 'dialogueFieldMaximizeToggled' },
    { type: 'dialogueFieldClosePressed' },
  ],
}

const SEARCH_ENTRY_PRESSED: ScreenValuesEvent = { type: 'searchEntryPressed' }

const PALETTE_TOGGLED: ScreenValuesEvent = { type: 'paletteToggled' }

const WATERMARK_ENTRY_PRESSED: ScreenValuesEvent = { type: 'watermarkEntryPressed' }

const SURFACE_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'surface' }

const HELP_CLOSE_ASKED: ScreenValuesEvent = { type: 'surfaceCloseAsked', target: 'helpModal' }

const HELP_ENTRY_PRESSED: ScreenValuesEvent = { type: 'helpEntryPressed' }

const FULL_SCREEN_ENTRY_PRESSED: ScreenValuesEvent = { type: 'fullScreenEntryPressed' }

const ARM_DROPPED: ScreenValuesEvent = { type: 'escapePressed', rung: 'armed' }

// see U-65, IC-138, IC-162, FO-14, RS-87, T-214
const HOLIDAY_SETTINGS_ROW = 'U-65'

type CalendarDraft = Extract<ScreenValuesEvent, { readonly type: 'calendarDraftEdited' }>['calendarDraft']

const CALENDAR_APPLY_ENTRY_PRESSED: ScreenValuesEvent = { type: 'calendarApplyEntryPressed' }

const BASE_CHANGE_CANCEL_PRESSED: ScreenValuesEvent = { type: 'baseChangeCancelPressed' }

const TIME_SHIFT_ENTRY_PRESSED: ScreenValuesEvent = { type: 'timeShiftEntryPressed' }

const WHOLE_SCHEDULE_SHIFT_ENTRY_PRESSED: ScreenValuesEvent = { type: 'wholeScheduleShiftEntryPressed' }

const UNREADABLE_DAY_TOLD: SessionEvent = { type: 'noticeRaised', reason: 'RS-87', affectedCount: null }

const EARLIEST_ACCEPTED_DAY = dayOf(SETTINGS_CONSTANTS.importMinDate)
const LATEST_ACCEPTED_DAY = dayOf(SETTINGS_CONSTANTS.importMaxDate)

// WHY: hours and minutes with a sign (FR-157, CM-98): `-16`, `+1:30`, `-0:45`; anything else settles nothing.
const TIME_SHIFT_AMOUNT = /^([+-]?)(\d{1,5})(?::([0-5]\d))?$/

const MINUTES_PER_HOUR = 60

// see WH-2
const DAY_KEY_LENGTH = 10

/** @purity pure */
function surfaceEntered(surfaceName: string): ScreenValuesEvent {
  return { type: 'surfaceEntryPressed', surfaceName }
}

// WHY: untouched, the first edit starts from the document's calendar; calendarDraftEdited carries the whole draft (T-280).
/** @purity pure */
function heldCalendarDraftOf(context: InputContext): CalendarDraft {
  const held = context.screen.calendarDraftState
  return held.kind === 'drafted' ? held.calendarDraft : calendarDraftOf(context.document.schedule)
}

// WHY: an edit that leaves the draft as it is moves nothing (calendar-draft.ts hands the same draft back).
/** @purity pure */
function calendarDraftEdited(context: InputContext, edit: (draft: CalendarDraft) => CalendarDraft): ScreenValuesEvent | null {
  const before = heldCalendarDraftOf(context)
  const after = edit(before)
  return after === before ? null : { type: 'calendarDraftEdited', calendarDraft: after }
}

// WHY: the drawn row names its place in the draft's list; the draft's edits find an exception by its ordinal (AT-77).
/** @purity pure */
function exceptionEdited(
  context: InputContext,
  index: number,
  edit: (draft: CalendarDraft, ordinal: number) => CalendarDraft,
): ScreenValuesEvent | null {
  return calendarDraftEdited(context, (draft) => {
    const ordinal = draft.exceptions[index]?.ordinal
    return ordinal === undefined ? draft : edit(draft, ordinal)
  })
}

/** @purity pure */
function exceptionAdded(context: InputContext): ScreenValuesEvent | null {
  const today = dayOf(context.today)
  if (today === null) return null
  return calendarDraftEdited(context, (draft) => withExceptionAdded(draft, context.document.schedule, today))
}

// WHY: the entrances of one row: IC-133's place is the weekday's AT-73 code, the others' the row's place in the draft.
/** @purity pure */
function holidayRowEntryEventOf(entry: string, at: number, context: InputContext): ScreenValuesEvent | null {
  switch (entry) {
    case ENTRY.holidayWeekday:
      return calendarDraftEdited(context, (draft) => withWeekdayToggled(draft, at))
    case ENTRY.holidayRangeDelete:
      return calendarDraftEdited(context, (draft) => withRangeDeleted(draft, at))
    case ENTRY.holidayExceptionDelete:
      return exceptionEdited(context, at, withExceptionDeleted)
    case ENTRY.holidayExceptionWorking:
      return exceptionEdited(context, at, withExceptionKindToggled)
    default:
      return null
  }
}

// see IC-132, IC-135, IC-138, IC-163, T-344, T-280
/** @purity pure */
function holidaySettingsEventOf(on: ScreenPart, context: InputContext): ScreenValuesEvent | null {
  switch (on.entry) {
    case ENTRY.holidaySettings:
      return surfaceEntered(HOLIDAY_SETTINGS_ROW)
    case ENTRY.holidayApply:
      return CALENDAR_APPLY_ENTRY_PRESSED
    case ENTRY.holidayRangeAdd:
      return calendarDraftEdited(context, withRangeAdded)
    case ENTRY.holidayExceptionAdd:
      return exceptionAdded(context)
    default:
      break
  }
  const target = on.holidaySettingsTarget ?? ''
  const at = target === '' ? Number.NaN : Number(target)
  return on.entry === null || !Number.isInteger(at) ? null : holidayRowEntryEventOf(on.entry, at, context)
}

// see FR-083, T-023b, T-280
/** @purity pure */
function screenEventFromEntry(entry: string, context: InputContext): ScreenValuesEvent | null {
  switch (entry) {
    case ENTRY.palette:
      return PALETTE_TOGGLED
    case ENTRY.help:
      return HELP_ENTRY_PRESSED
    case ENTRY.fullScreen:
      return FULL_SCREEN_ENTRY_PRESSED
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
      return surfaceEntered(EXPORT_CHOOSER_ROW)
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
  if (part === PROPERTIES_PANEL || part === DELAY_DIAGNOSTICS_REPORT || part === RESOURCE_LIST) return null
  return part === HELP_MODAL ? HELP_CLOSE_ASKED : SURFACE_CLOSE_ASKED
}

// see IC-117, WB-7, SV-14, FR-066
/** @purity pure */
function windowEventOf(entry: string, part: string): ScreenValuesEvent | null {
  if (entry === ENTRY.search) return SEARCH_ENTRY_PRESSED
  const events = WINDOW_EVENTS[part]
  if (events === undefined) return null
  const [minimized, maximized, closed] = events
  if (entry === ENTRY.windowMinimize) return minimized
  if (entry === ENTRY.windowMaximize || entry === ENTRY.windowRestore) return maximized
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
  const isChartPress = press.hit !== null || isOnTaskGroupArea(context, press.at.x, press.at.y)
  if (isChartPress && pressRowOf(press, context) === 'PTD-2') {
    return screenEventFromDualCursorPress(press, context)
  }
  return screenEventAfterMarkerPress(input, context)
}

/** @purity pure */
function markerReleasedOf(input: PointerInput, context: InputContext): number | null {
  const press = context.pressed
  if (press === null || press.hit === null) return null
  if (grabTaskGroupOf(press.hit) !== 'GA-18' || press.hit.item.kind !== 'task') return null
  return hasDraggedPastThreshold(press, input) ? null : press.hit.item.taskUid
}

// see RW-19, PE-8, PE-10, GA-18
/** @purity pure */
export function diagnosisRowAskedOf(input: HumanInput, context: InputContext): number | null {
  const press = context.pressed
  if (input.kind !== 'pointer' || input.phase !== 'up' || press === null || press.on !== null) return null
  if (pressRowOf(press, context) === 'PTD-2') return null
  const uid = markerReleasedOf(input, context)
  return uid !== null && context.diagnosisMarkedTaskUids?.has(uid) === true ? uid : null
}

// see PV-4, PV-5, T-280
/** @purity pure */
function screenEventAfterMarkerPress(
  input: PointerInput,
  context: InputContext,
): ScreenValuesEvent | null {
  const uid = markerReleasedOf(input, context)
  if (uid === null || context.diagnosisMarkedTaskUids?.has(uid) === true) return null
  const task = taskByUid(context.document.schedule, uid)
  if (task === null) return null
  const remembered = rememberedActualIn(context, uid)
  const snapAt = snapMinutesOf(context.layout.pxPerDay, context.document.documentSettings, false)
  const turned = cycleTaskPlanActualState(task, remembered, {
    startSide: task.start,
    floorDay: task.start,
    milestone: task.milestone === true,
  })
  return {
    type: 'progressMarkerPressed',
    taskUid: uid,
    rememberedActual: turned.remembered,
    writes: [{ kind: 'cycleTaskPlanActualState', uid, remembered, snapMinutes: snapAt }],
  }
}

// see SK-12, SK-15, SK-24, IN-5a, T-280, PI-18
/** @purity pure */
function screenEventFromKey(input: KeyInput, context: InputContext): ScreenValuesEvent | null {
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return surfaceEntered(EXPORT_CHOOSER_ROW)
  }
  const isCtrlOnly = isCombo(input.modifiers, true, false, false)
  if (isCtrlOnly && input.key === KEY.f) return SEARCH_ENTRY_PRESSED
  if (!isCombo(input.modifiers, false, false, false)) return null
  const isFieldTaking = context.isTextEntryUnsettled || context.isTextFieldFocusWanted === true
  if (isFieldTaking && isSingleCharacterKey(input.key)) return null
  if (input.key === KEY.f1) return HELP_ENTRY_PRESSED
  if (input.key === KEY.f11) return FULL_SCREEN_ENTRY_PRESSED
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
  return windowEventOf(on.entry, on.part) ?? holidaySettingsEventOf(on, context) ?? screenEventFromEntry(on.entry, context)
}

type DraftKey<Holder extends string> = Extract<FieldCommit['key'], { readonly holder: Holder }>

// see FO-14, FR-156, S-574, AT-157, T-280
// WHY: the guard isOtherThanShownBase reads the shown base (S-574, else AT-157) here, where the document is at hand.
/** @purity pure */
function baseTimeZoneDraftEventOf(
  column: DraftKey<'baseTimeZoneDraft'>['column'],
  text: string,
  context: InputContext,
): ScreenValuesEvent | null {
  if (column === 'cancel') return BASE_CHANGE_CANCEL_PRESSED
  if (column === 'keepGlobalTime' || column === 'keepLocalTime') return { type: 'baseChangeEntryPressed', chosenWay: column }
  if (text === '') return null
  const document = context.document
  const shownBase = viewRegionOf(document.schedule.project.scheduleDataTimeZone, document.documentSettings.viewTimeZone)
  return { type: 'baseTimeZoneChosen', chosenRegion: text, isOtherThanShownBase: text !== shownBase }
}

// see FO-16, FR-157, IC-162, CM-98, T-280
/** @purity pure */
function timeShiftDraftEventOf(column: DraftKey<'timeShift'>['column'], text: string): ScreenValuesEvent | null {
  if (column === 'entry') return TIME_SHIFT_ENTRY_PRESSED
  const held = text.trim()
  const hit = held === '' ? null : TIME_SHIFT_AMOUNT.exec(held)
  if (held !== '' && hit === null) return null
  const size = hit === null ? 0 : Number(hit[2]) * MINUTES_PER_HOUR + Number(hit[3] ?? 0)
  return { type: 'timeShiftAmountSettled', shiftMinutes: hit?.[1] === '-' ? -size : size }
}

// see WC-4, IV-14, T-214, RS-87
/** @purity pure */
function acceptedDayOf(text: string): CalendarDay | null {
  const day = dayOf(text.trim())
  if (day === null || EARLIEST_ACCEPTED_DAY === null || LATEST_ACCEPTED_DAY === null) return null
  return compareDays(day, EARLIEST_ACCEPTED_DAY) < 0 || compareDays(day, LATEST_ACCEPTED_DAY) > 0 ? null : day
}

// see FO-17, FR-159, WH-2, WH-12, RS-87, T-280
// WHY: an emptied field settles an empty date; a day outside table T-214 or an unreadable text tells RS-87 and holds nothing.
/** @purity pure */
function wholeScheduleShiftDraftEventOf(column: DraftKey<'wholeScheduleShift'>['column'], text: string): SessionEvent | null {
  if (column === 'entry') return WHOLE_SCHEDULE_SHIFT_ENTRY_PRESSED
  if (text.trim() === '') return { type: 'wholeScheduleShiftDateSettled', newStartDate: '' }
  const day = acceptedDayOf(text)
  if (day === null) return UNREADABLE_DAY_TOLD
  return { type: 'wholeScheduleShiftDateSettled', newStartDate: textOfDay(day).slice(0, DAY_KEY_LENGTH) }
}

// see WC-4, RS-87
/** @purity pure */
function exceptionDayEventOf(index: number, isFrom: boolean, text: string, context: InputContext): SessionEvent | null {
  const day = acceptedDayOf(text)
  if (day === null) return UNREADABLE_DAY_TOLD
  const side = isFrom ? 'start' : 'end'
  return exceptionEdited(context, index, (draft, ordinal) => withExceptionDayTyped(draft, ordinal, side, day))
}

// see WC-3, WC-4, WC-8, IC-134, IC-165, IN-6, T-280
/** @purity pure */
function calendarDraftFieldEventOf(key: DraftKey<'calendarDraft'>, text: string, context: InputContext): SessionEvent | null {
  switch (key.column) {
    case 'weekStartDay': {
      const weekStartDay = Number(text)
      return Number.isInteger(weekStartDay) ? calendarDraftEdited(context, (draft) => withWeekStart(draft, weekStartDay)) : null
    }
    case 'fromTime':
    case 'toTime': {
      const side = key.column === 'fromTime' ? 'start' : 'end'
      return calendarDraftEdited(context, (draft) => withRangeTimeTyped(draft, key.index, side, text))
    }
    case 'name':
      return exceptionEdited(context, key.index, (draft, ordinal) => withExceptionNameTyped(draft, ordinal, text.trim()))
    default:
      return exceptionDayEventOf(key.index, key.column === 'fromDate', text, context)
  }
}

// see FO-14, FO-16, FO-17, WC-3, WC-4, WC-8, T-280, IN-6
// WHY: a screen draft's field settles into the screen values, or tells RS-87; null leaves it to commandFromFieldCommit.
/** @purity pure */
export function screenEventFromFieldCommit(commit: FieldCommit, context: InputContext): SessionEvent | null {
  const key = commit.key
  if (key.holder === 'baseTimeZoneDraft') return baseTimeZoneDraftEventOf(key.column, commit.text, context)
  if (key.holder === 'timeShift') return timeShiftDraftEventOf(key.column, commit.text)
  if (key.holder === 'wholeScheduleShift') return wholeScheduleShiftDraftEventOf(key.column, commit.text)
  if (key.holder === 'calendarDraft') return calendarDraftFieldEventOf(key, commit.text, context)
  return null
}

// SingleHtmlShell frame loop -- carries the naming and field-entry region (table T-292) between the surface and the machine.
// @unit      UF-164  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { ScreenSession, SessionEvent } from '../../use-case/advance-screen-session/advance-screen-session'
import {
  commandFromFieldCommit,
  screenEventFromFieldCommit,
  type HumanInput,
  type InputAction,
} from '../../adapter/input-command-translator/input-command-translator'
import { timeShiftQuestionItems, wholeScheduleShiftQuestionItems, type FieldEditNotice } from '../../adapter/screen-renderer/screen-renderer'
import { baseChangeCommandOf, timeShiftPreviewOf, wholeScheduleShiftPreviewOf, type DocumentCommand } from '../../use-case/edit-document/edit-document'
import { isWorkingTimeSetUnlikeDay, viewRegionOf } from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import {
  CHOICE_MOVED,
  CONFIRMATION_MANNER,
  FIELD_FOCUS_WITHDRAWING_KEYS,
  FIELD_FOCUS_WITHDRAWN,
  isSizeSettled,
  type FrameLoopHands,
  type FrameValues,
  type ScreenWiring,
} from './frame-loop'
import { WORKING_TIMES_UNLIKE_DAY_REASON } from './document-file-flow'

const TASK_NAME_FIELD_ROW = 'PR-1'

const TASK_GROUP_NAME_FIELD_TASK_GROUP = 'AT-53'

const ASSIGNEE_FIELD_ROW = 'PR-16'

const COMMENT_BOX_TEXT_FIELD_ROW = 'PR-21'

const HIGHLIGHT_BOX_STROKE_FIELD_ROW = 'PR-22'

const DOCUMENT_TITLE_FIELD_ROW = 'U-27'

type InPlaceKind = Extract<InputAction, { readonly kind: 'editInPlace' }>['target']['kind']

export const FIELD_ROW_OF_IN_PLACE_TARGET: Readonly<Record<InPlaceKind, string>> = {
  documentTitle: DOCUMENT_TITLE_FIELD_ROW,
  taskName: TASK_NAME_FIELD_ROW,
  assignee: ASSIGNEE_FIELD_ROW,
  taskGroupName: TASK_GROUP_NAME_FIELD_TASK_GROUP,
  commentBoxText: COMMENT_BOX_TEXT_FIELD_ROW,
  highlightBoxStroke: HIGHLIGHT_BOX_STROKE_FIELD_ROW,
}

// WHY: counted in frames, not ms: each try needs a drawn frame, and a held control let go lands on
// the next; 10 bounds the frames asked for, and IN-5b keeps trying on later frames and keys.
const FIELD_FOCUS_RETRY_FRAMES = 10


/** @purity pure */
function fieldFocusWantedIn(session: ScreenSession): string | null {
  const edit = session.fieldEntry.fieldEditState
  return edit.kind === 'fieldFocusWanted' ? edit.fieldRow : null
}

/** @purity pure */
function isEditingFieldIn(session: ScreenSession): boolean {
  return session.fieldEntry.fieldEditState.kind === 'editingField'
}

/** @purity pure */
function fieldEditEventOf(notice: FieldEditNotice): SessionEvent {
  const type = notice.kind === 'began' ? 'fieldEditBegan' : 'fieldEditEnded'
  return { type, fieldRow: notice.row }
}

export type FieldEntryHands = Pick<
  FrameLoopHands,
  | 'readSession'
  | 'readValues'
  | 'readEnvironment'
  | 'isFrameOwed'
  | 'screen'
  | 'sendToSession'
  | 'ask'
  | 'runFrame'
  | 'isPropertiesPanelOnScreen'
  | 'collectInputContext'
  | 'writeDocument'
  | 'readHeld'
  | 'raiseNotice'
>

/** @purity non-pure */
export function fieldFocusRetriesOf(hands: FieldEntryHands) {
  let fieldFocusRetriesLeft = FIELD_FOCUS_RETRY_FRAMES

  // see MK-13, IN-5a, IN-5b, T-292
  /** @purity non-pure */
  function focusWantedField(focus: ScreenWiring['focusPropertyField']): void {
    const wanted = fieldFocusWantedIn(hands.readSession())
    if (wanted === null) return
    const isPlaceKept = wanted === DOCUMENT_TITLE_FIELD_ROW || hands.isPropertiesPanelOnScreen()
    if (isPlaceKept && focus?.(wanted) === false) {
      if (fieldFocusRetriesLeft <= 0) return
      fieldFocusRetriesLeft -= 1
      hands.ask()
      return
    }
    drainFieldEditNotices(hands, hands.readValues())
    if (fieldFocusWantedIn(hands.readSession()) !== null) hands.sendToSession(FIELD_FOCUS_WITHDRAWN, hands.readValues())
  }

  // see MK-13, HF-14, FR-035, T-292
  /** @purity non-pure */
  function wantFieldFocused(row: string): void {
    fieldFocusRetriesLeft = FIELD_FOCUS_RETRY_FRAMES
    hands.sendToSession({ type: 'fieldFocusAsked', fieldRow: row }, hands.readValues())
  }

  /** @purity non-pure */
  function resetFieldFocusRetries(): void {
    fieldFocusRetriesLeft = FIELD_FOCUS_RETRY_FRAMES
  }

  return { wantFieldFocused, focusWantedField, resetFieldFocusRetries }
}

export type FieldFocusRetries = ReturnType<typeof fieldFocusRetriesOf>

// see IN-5a, IN-5b, IN-4, IN-6
// WHY: the owed frame is drawn now, so a letter typed before that frame lands in the field.
/** @purity non-pure */
export function tryWantedFieldBeforeInput(
  hands: FieldEntryHands,
  fieldFocusRetries: Pick<FieldFocusRetries, 'focusWantedField'>,
  input: HumanInput,
): void {
  if (fieldFocusWantedIn(hands.readSession()) === null) return
  const isWithdrawn =
    (input.kind === 'pointer' && input.phase === 'down') ||
    (input.kind === 'key' && FIELD_FOCUS_WITHDRAWING_KEYS.has(input.key))
  if (isWithdrawn) {
    hands.sendToSession(FIELD_FOCUS_WITHDRAWN, hands.readValues())
    return
  }
  if (input.kind !== 'key' || hands.screen === undefined) return
  if (hands.isFrameOwed() && isSizeSettled(hands.readEnvironment())) hands.runFrame()
  else fieldFocusRetries.focusWantedField(hands.screen.focusPropertyField)
}

// see IN-5a
/** @purity semi-pure-b */
export function isFieldFocusWanted(hands: FieldEntryHands): boolean {
  return fieldFocusWantedIn(hands.readSession()) !== null && hands.screen?.focusPropertyField !== undefined
}

// see IF-9, T-292
/** @purity non-pure */
export function drainFieldEditNotices(hands: FieldEntryHands, frame: FrameValues | null): void {
  if (hands.screen === undefined) return
  for (const notice of hands.screen.surface.readFieldEditNotices?.() ?? []) {
    hands.sendToSession(fieldEditEventOf(notice), frame)
  }
}

/** @purity non-pure */
export function isEditingField(hands: FieldEntryHands): boolean {
  drainFieldEditNotices(hands, hands.readValues())
  return isEditingFieldIn(hands.readSession())
}

/** @purity non-pure */
export function isCreatedNameEnded(hands: FieldEntryHands): boolean {
  drainFieldEditNotices(hands, hands.readValues())
  return hands.readSession().fieldEntry.createdTaskNamingState.kind === 'createdNameEnded'
}

// see IN-5a
/** @purity non-pure */
export function noteChoiceMoved(hands: FieldEntryHands, frame: FrameValues | null): void {
  hands.sendToSession(CHOICE_MOVED, frame)
  hands.sendToSession(FIELD_FOCUS_WITHDRAWN, frame)
}

// see IF-9, FO-14, FO-16, WC-4, WC-8
/** @purity non-pure */
export function spendFieldCommit(hands: FieldEntryHands, frame: FrameValues): boolean {
  if (hands.screen === undefined) return false
  const commit = hands.screen.surface.readFieldCommit()
  if (commit === null) return false
  const context = hands.collectInputContext(frame)
  const drafted = screenEventFromFieldCommit(commit, context)
  if (drafted !== null) hands.sendToSession(drafted, frame)
  else {
    const commands = commandFromFieldCommit(commit, context)
    if (commands.length > 0) hands.writeDocument(commands, frame, true)
  }
  // TRAP: true on the commit, not the commands; a value naming no task group is still a settled edit (SK-19).
  return true
}

const TIME_SHIFT_QUESTION = 'QN-14'

// see FR-157, QN-14, BS-3, NT-7, IC-162
// WHY: the Time Shift alone asks first (FR-157); the answer carries the one write out as a deletion's does.
/** @purity non-pure */
export function askTimeShift(hands: Pick<FieldEntryHands, 'readHeld' | 'readSession' | 'sendToSession'>, frame: FrameValues, minutes: number): void {
  const shift: DocumentCommand = { kind: 'shiftScheduleTimes', minutes }
  const items = timeShiftQuestionItems(timeShiftPreviewOf(hands.readHeld().document, minutes), hands.readSession())
  hands.sendToSession(
    {
      type: 'changeQuestionRaised',
      question: { manner: CONFIRMATION_MANNER, question: TIME_SHIFT_QUESTION, items },
      owedAction: { kind: 'changeDocument', writes: [[shift]], created: null },
    },
    frame,
  )
}

/** @purity pure */
export function isTimeShiftWrite(writes: readonly (readonly DocumentCommand[])[]): boolean {
  return writes.some((bundle) => bundle.some((command) => command.kind === 'shiftScheduleTimes'))
}

const WHOLE_SCHEDULE_SHIFT_QUESTION = 'QN-15'

// see FR-159, QN-15, WH-11, WH-12, NT-7
// WHY: nothing to move (no start, or no working day between) asks nothing, as the dim Apply button does (WH-12).
/** @purity pure */
function wholeScheduleShiftQuestionsOf(document: Document, session: ScreenSession, newStartDate: string): readonly SessionEvent[] {
  const preview = wholeScheduleShiftPreviewOf(document, newStartDate)
  if (preview === null) return []
  const shift: DocumentCommand = { kind: 'shiftScheduleToStartDate', newStartDate }
  return [
    {
      type: 'changeQuestionRaised',
      question: { manner: CONFIRMATION_MANNER, question: WHOLE_SCHEDULE_SHIFT_QUESTION, items: wholeScheduleShiftQuestionItems(preview, session) },
      owedAction: { kind: 'changeDocument', writes: [[shift]], created: null },
    },
  ]
}

// see FR-159, QN-15
/** @purity non-pure */
export function askWholeScheduleShift(
  hands: Pick<FieldEntryHands, 'readHeld' | 'readSession' | 'sendToSession'>,
  frame: FrameValues,
  newStartDate: string,
): void {
  wholeScheduleShiftQuestionsOf(hands.readHeld().document, hands.readSession(), newStartDate).forEach((event) => hands.sendToSession(event, frame))
}

/** @purity pure */
export function isWholeScheduleShiftWrite(writes: readonly (readonly DocumentCommand[])[]): boolean {
  return writes.some((bundle) => bundle.some((command) => command.kind === 'shiftScheduleToStartDate'))
}

// see FR-156, IC-161, CM-94, CM-95
/** @purity pure */
export function baseChangeCommandsOf(
  draft: { readonly chosenRegion: string | null; readonly chosenWay: Parameters<typeof baseChangeCommandOf>[2] },
  document: Document,
): readonly DocumentCommand[] {
  const scheduleDataTimeZone = document.schedule.project.scheduleDataTimeZone
  const held = { scheduleDataTimeZone, viewTimeZone: viewRegionOf(scheduleDataTimeZone, document.documentSettings.viewTimeZone) }
  const command = baseChangeCommandOf(held, draft.chosenRegion, draft.chosenWay)
  return command === null ? [] : [command]
}

type CalendarCommand = Extract<DocumentCommand, { readonly kind: 'setCalendar' }>

type CalendarCommandHands = Pick<FieldEntryHands, 'readHeld' | 'writeDocument' | 'raiseNotice'>

// see FR-088, IC-138, CM-39, RS-89, WC-7
// WHY: RS-89 only when CM-39 changed the document; a draft equal to the document writes nothing and tells nothing.
/** @purity non-pure */
export function issueCalendarCommand(hands: CalendarCommandHands, command: CalendarCommand, frame: FrameValues): void {
  const before = hands.readHeld().document
  hands.writeDocument([command], frame)
  tellAppliedSetUnlikeDay(hands, before, command)
}

/** @purity non-pure */
function tellAppliedSetUnlikeDay(hands: CalendarCommandHands, before: Document, command: CalendarCommand): void {
  const after = hands.readHeld().document
  if (after === before || command.workingTimes === undefined) return
  if (isWorkingTimeSetUnlikeDay(after.schedule.project, command.workingTimes)) hands.raiseNotice(WORKING_TIMES_UNLIKE_DAY_REASON, null)
}

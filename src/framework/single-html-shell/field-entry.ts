// SingleHtmlShell frame loop -- carries the naming and field-entry region (table T-292) between the surface and the machine.
// @unit      UF-164  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { ScreenSession, SessionEvent } from '../../use-case/advance-screen-session/advance-screen-session'
import {
  commandFromFieldCommit,
  type HumanInput,
  type InputAction,
} from '../../adapter/input-command-translator/input-command-translator'
import type { FieldEditNotice } from '../../adapter/screen-renderer/screen-renderer'
import {
  CHOICE_MOVED,
  FIELD_FOCUS_WITHDRAWING_KEYS,
  FIELD_FOCUS_WITHDRAWN,
  isSizeSettled,
  type FrameLoopHands,
  type FrameValues,
  type ScreenWiring,
} from './frame-loop'

const TASK_NAME_FIELD_ROW = 'PR-1'

const ROW_NAME_FIELD_ROW = 'AT-53'

const ASSIGNEE_FIELD_ROW = 'PR-16'

const COMMENT_BOX_TEXT_FIELD_ROW = 'PR-21'

const HIGHLIGHT_BOX_STROKE_FIELD_ROW = 'PR-22'

const DOCUMENT_TITLE_FIELD_ROW = 'U-27'

type InPlaceKind = Extract<InputAction, { readonly kind: 'editInPlace' }>['target']['kind']

export const FIELD_ROW_OF_IN_PLACE_TARGET: Readonly<Record<InPlaceKind, string>> = {
  documentTitle: DOCUMENT_TITLE_FIELD_ROW,
  taskName: TASK_NAME_FIELD_ROW,
  assignee: ASSIGNEE_FIELD_ROW,
  rowName: ROW_NAME_FIELD_ROW,
  commentBoxText: COMMENT_BOX_TEXT_FIELD_ROW,
  highlightBoxStroke: HIGHLIGHT_BOX_STROKE_FIELD_ROW,
}

// WHY: counted in frames, not ms: each try needs a drawn frame, and a held control let go lands on
// the next; 10 bounds the frames asked for, and IN-5b keeps trying on later frames and keys.
const FIELD_FOCUS_RETRY_FRAMES = 10

/** @purity pure */
export function isNamingCreatedTaskIn(session: ScreenSession): boolean {
  return session.fieldEntry.createdTaskNamingState.kind === 'namingCreatedTask'
}

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

// see IN-5a
/** @purity non-pure */
export function noteChoiceMoved(hands: FieldEntryHands, frame: FrameValues | null): void {
  hands.sendToSession(CHOICE_MOVED, frame)
  hands.sendToSession(FIELD_FOCUS_WITHDRAWN, frame)
}

// see IF-9
/** @purity non-pure */
export function spendFieldCommit(hands: FieldEntryHands, frame: FrameValues): boolean {
  if (hands.screen === undefined) return false
  const commit = hands.screen.surface.readFieldCommit()
  if (commit === null) return false
  const commands = commandFromFieldCommit(commit, hands.collectInputContext(frame))
  if (commands.length > 0) hands.writeDocument(commands, frame, true)
  // TRAP: true on the commit, not the commands; a value naming no row is still a settled edit (SK-19).
  return true
}

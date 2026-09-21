// AdvanceScreenSession: advances the unsaved screen session by one event.
// @unit      UF-84   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-39

import {
  emptyFieldEntryValues,
  stepFieldEntryValues,
  type FieldEntryValues,
  type FieldEntryValuesEffect,
  type FieldEntryValuesEvent,
} from './field-entry-values'
import {
  emptyFileFlowValues,
  stepFileFlowValues,
  type FileFlowValues,
  type FileFlowValuesEffect,
  type FileFlowValuesEvent,
} from './file-flow-values'
import {
  emptyGestureValues,
  stepGestureValues,
  type GestureValues,
  type GestureValuesEffect,
  type GestureValuesEvent,
} from './gesture-values'
import {
  emptyNoticeValues,
  stepNoticeValues,
  type NoticeValues,
  type NoticeValuesEffect,
  type NoticeValuesEvent,
} from './notice-values'
import {
  emptyScreenValues,
  stepScreenValues,
  type ScreenValues,
  type ScreenValuesEffect,
  type ScreenValuesEvent,
} from './screen-values'
import { unchanged, type Step } from './session-step'

// TRAP: ScreenRenderer exports another ScreenSession until wave B2 of CR-436; import this one from here.
// see SF-8, PI-39
export interface ScreenSession {
  readonly screen: ScreenValues
  readonly notices: NoticeValues
  readonly gesture: GestureValues
  readonly fileFlow: FileFlowValues
  readonly fieldEntry: FieldEntryValues
}

// see T-280, T-286, T-289, T-290, T-292
export type SessionEvent =
  | ScreenValuesEvent
  | NoticeValuesEvent
  | GestureValuesEvent
  | FileFlowValuesEvent
  | FieldEntryValuesEvent

export type SessionEffect =
  | ScreenValuesEffect
  | NoticeValuesEffect
  | GestureValuesEffect
  | FileFlowValuesEffect
  | FieldEntryValuesEffect

// see T-280, T-286, T-289, T-290, T-292, SS-6
export const emptyScreenSession: ScreenSession = {
  screen: emptyScreenValues,
  notices: emptyNoticeValues,
  gesture: emptyGestureValues,
  fileFlow: emptyFileFlowValues,
  fieldEntry: emptyFieldEntryValues,
}

// WHY: a Record per region fails to compile on a missing event; the rest are screen events.
const IS_NOTICE_EVENT: { readonly [T in NoticeValuesEvent['type']]: true } = {
  noticeRaised: true,
  newestNoticeDismissAsked: true,
  noticeDismissPressed: true,
  documentReplaced: true,
  changeDelivered: true,
}

const IS_GESTURE_EVENT: { readonly [T in GestureValuesEvent['type']]: true } = {
  pointerPressed: true,
  pointerReleased: true,
  pressInterrupted: true,
  rowGrabAxisSettled: true,
  entryRepeatTimeElapsed: true,
}

const IS_FILE_FLOW_EVENT: { readonly [T in FileFlowValuesEvent['type']]: true } = {
  documentOpenAsked: true,
  agentDocumentHanded: true,
  documentFileWriteAsked: true,
  openChoiceAnswered: true,
  mergeMappingAnswered: true,
  confirmationAnswered: true,
  changeQuestionRaised: true,
  newDocumentEntryPressed: true,
  flowSurfaceClosed: true,
  documentFileRead: true,
  documentOpenFailed: true,
  mergeMappingAsked: true,
  documentOpenLanded: true,
  overwriteQuestionRaised: true,
  documentFileSaved: true,
  documentFileWriteEnded: true,
}

const IS_FIELD_ENTRY_EVENT: { readonly [T in FieldEntryValuesEvent['type']]: true } = {
  fieldFocusAsked: true,
  creationLanded: true,
  fieldFocusLanded: true,
  fieldFocusWithdrawn: true,
  choiceMoved: true,
}

/** @purity pure */
function isNoticeEvent(event: SessionEvent): event is NoticeValuesEvent {
  return Object.hasOwn(IS_NOTICE_EVENT, event.type)
}

/** @purity pure */
function isGestureEvent(event: SessionEvent): event is GestureValuesEvent {
  return Object.hasOwn(IS_GESTURE_EVENT, event.type)
}

/** @purity pure */
function isFileFlowEvent(event: SessionEvent): event is FileFlowValuesEvent {
  return Object.hasOwn(IS_FILE_FLOW_EVENT, event.type)
}

/** @purity pure */
function isFieldEntryEvent(event: SessionEvent): event is FieldEntryValuesEvent {
  return Object.hasOwn(IS_FIELD_ENTRY_EVENT, event.type)
}

// see SS-5, SF-3
/** @purity pure */
function composed<K extends keyof ScreenSession>(
  session: ScreenSession,
  region: K,
  step: Step<ScreenSession[K], SessionEffect>,
): Step<ScreenSession, SessionEffect> {
  if (step.state !== session[region]) {
    return { state: { ...session, [region]: step.state }, effects: step.effects }
  }
  if (step.effects.length === 0) return unchanged(session)
  return { state: session, effects: step.effects }
}

// see SF-2, SF-3, SF-8, SS-5
/** @purity pure */
export function advanceScreenSession(
  session: ScreenSession,
  event: SessionEvent,
): Step<ScreenSession, SessionEffect> {
  if (isNoticeEvent(event)) return composed(session, 'notices', stepNoticeValues(session.notices, event))
  if (isGestureEvent(event)) return composed(session, 'gesture', stepGestureValues(session.gesture, event))
  if (isFileFlowEvent(event)) return composed(session, 'fileFlow', stepFileFlowValues(session.fileFlow, event))
  if (isFieldEntryEvent(event)) return composed(session, 'fieldEntry', stepFieldEntryValues(session.fieldEntry, event))
  return composed(session, 'screen', stepScreenValues(session.screen, event))
}

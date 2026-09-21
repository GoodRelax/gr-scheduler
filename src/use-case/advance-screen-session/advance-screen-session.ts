// AdvanceScreenSession: advances the unsaved screen session by one event.
// @unit      UF-84   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-39

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

// TRAP: ScreenRenderer exports another ScreenSession, its render input, until wave B2 of
// CR-436 removes it; a file that needs this one imports it from this path.
// see SF-8, PI-39
export interface ScreenSession {
  readonly screen: ScreenValues
  readonly notices: NoticeValues
}

// see T-280, T-286
export type SessionEvent = ScreenValuesEvent | NoticeValuesEvent

// see T-280, T-286
export type SessionEffect = ScreenValuesEffect | NoticeValuesEffect

// see T-280, T-286, SS-6
export const emptyScreenSession: ScreenSession = { screen: emptyScreenValues, notices: emptyNoticeValues }

// WHY: a Record over the notices event types, so an event added to the manuscript and left
// out here fails to compile; every other event belongs to the screen-values region.
const IS_NOTICE_EVENT: { readonly [T in NoticeValuesEvent['type']]: true } = {
  noticeRaised: true,
  newestNoticeDismissAsked: true,
  noticeDismissPressed: true,
  documentReplaced: true,
  changeDelivered: true,
}

/** @purity pure */
function isNoticeEvent(event: SessionEvent): event is NoticeValuesEvent {
  return Object.hasOwn(IS_NOTICE_EVENT, event.type)
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
  return composed(session, 'screen', stepScreenValues(session.screen, event))
}

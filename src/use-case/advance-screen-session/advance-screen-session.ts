// AdvanceScreenSession: advances the unsaved screen session by one event.
// @unit      UF-84   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-39

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
}

// see T-281
export type SessionEvent = ScreenValuesEvent

// see T-282
export type SessionEffect = ScreenValuesEffect

// see T-280
export const emptyScreenSession: ScreenSession = { screen: emptyScreenValues }

// see SF-2, SF-3, SF-8
/** @purity pure */
export function advanceScreenSession(
  session: ScreenSession,
  event: SessionEvent,
): Step<ScreenSession, SessionEffect> {
  const step = stepScreenValues(session.screen, event)
  if (step.state !== session.screen) {
    return { state: { ...session, screen: step.state }, effects: step.effects }
  }
  if (step.effects.length === 0) return unchanged(session)
  return { state: session, effects: step.effects }
}

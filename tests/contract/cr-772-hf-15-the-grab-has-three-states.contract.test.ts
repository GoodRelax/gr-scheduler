// CR-772 spec-only cases: the grab machine of table T-289 is notGrabbed, grabPressed and carrying, and one event passes the travel (HF-15, S-208).

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { STATE_MACHINES_SOURCE } from './cr-731-stage'

type Loose = Record<string, unknown>

const GESTURE = STATE_MACHINES_SOURCE.regions.find((one) => one['region'] === 'gesture') as Loose
const MACHINE = (GESTURE['machines'] as readonly Loose[]).find((one) => one['name'] === 'taskGroupGrabStateMachine') as Loose
const TRAVEL_EVENT = 'taskGroupGrabTravelPassed'

const STRIP = { kind: 'taskGroupGrabStrip', taskGroupId: 'g1' }

const grabOf = (session: ScreenSession): string =>
  String((((session as unknown as Loose)['gesture'] as Loose)['taskGroupGrabState'] as Loose)['kind'])

const send = (session: ScreenSession, event: Loose): ScreenSession =>
  advanceScreenSession(session, event as unknown as SessionEvent).state

const PRESS = { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: STRIP }

describe('T-289 -- the grab machine the manuscript prints', () => {
  it('has the three states, the first one initial, and no axis state', () => {
    const states = MACHINE['states'] as readonly Loose[]
    expect(states.map((one) => one['key'])).toEqual(['notGrabbed', 'grabPressed', 'carrying'])
    expect(states.filter((one) => one['initial'] === true).map((one) => one['key'])).toEqual(['notGrabbed'])
  })

  it('passes the travel with one event that carries nothing', () => {
    const event = (GESTURE['events'] as readonly Loose[]).find((one) => one['key'] === TRAVEL_EVENT)
    expect(event).toBeDefined()
    expect(event?.['carries']).toEqual([])
    const transitions = MACHINE['transitions'] as Record<string, Record<string, Loose>>
    expect(Object.keys(transitions[TRAVEL_EVENT] ?? {})).toEqual(['grabPressed'])
    expect(transitions[TRAVEL_EVENT]?.['grabPressed']?.['to']).toBe('carrying')
  })
})

describe('HF-15 -- notGrabbed, then grabPressed, then carrying, then notGrabbed', () => {
  it('starts not grabbed', () => {
    expect(grabOf(emptyScreenSession)).toBe('notGrabbed')
  })

  it('a press on the grab strip is grabPressed', () => {
    expect(grabOf(send(emptyScreenSession, PRESS))).toBe('grabPressed')
  })

  it('a press anywhere else is not a grab', () => {
    expect(grabOf(send(emptyScreenSession, { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: { kind: 'paletteBand' } }))).toBe('notGrabbed')
  })

  it('the travel event makes it carrying, and a release ends it', () => {
    const pressed = send(emptyScreenSession, PRESS)
    const carrying = send(pressed, { type: TRAVEL_EVENT })
    expect(grabOf(carrying)).toBe('carrying')
    expect(grabOf(send(carrying, { type: 'pointerReleased' }))).toBe('notGrabbed')
  })

  it('a release before the travel ends it without ever carrying', () => {
    expect(grabOf(send(send(emptyScreenSession, PRESS), { type: 'pointerReleased' }))).toBe('notGrabbed')
  })

  it('an interrupted press (Esc, a lost pointer) ends it from either state', () => {
    const pressed = send(emptyScreenSession, PRESS)
    expect(grabOf(send(pressed, { type: 'pressInterrupted' }))).toBe('notGrabbed')
    expect(grabOf(send(send(pressed, { type: TRAVEL_EVENT }), { type: 'pressInterrupted' }))).toBe('notGrabbed')
  })

  it('the travel event with nothing grabbed changes nothing, and carrying stays carrying when it comes again', () => {
    expect(grabOf(send(emptyScreenSession, { type: TRAVEL_EVENT }))).toBe('notGrabbed')
    const carrying = send(send(emptyScreenSession, PRESS), { type: TRAVEL_EVENT })
    expect(grabOf(send(carrying, { type: TRAVEL_EVENT }))).toBe('carrying')
  })
})

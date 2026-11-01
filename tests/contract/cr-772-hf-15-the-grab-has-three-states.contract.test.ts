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

// WHY: wave 2 of CR-767 (JDG-2364) puts grabPressed and carrying under the composite grabbed;
// the value holds the child, read back here as the dotted state key (grabbed.carrying).
const grabOf = (session: ScreenSession): string => {
  const path: string[] = []
  let at = ((session as unknown as Loose)['gesture'] as Loose)['taskGroupGrabState'] as Loose | undefined
  while (at !== undefined) {
    path.push(String(at['kind']))
    at = at['child'] as Loose | undefined
  }
  return path.join('.')
}

const send = (session: ScreenSession, event: Loose): ScreenSession =>
  advanceScreenSession(session, event as unknown as SessionEvent).state

const PRESS = { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: STRIP }

describe('T-289 -- the grab machine the manuscript prints', () => {
  it('has the three states -- notGrabbed initial, grabPressed and carrying under the composite grabbed, grabPressed its initial child', () => {
    const states = MACHINE['states'] as readonly Loose[]
    expect(states.map((one) => [one['key'], one['parent']])).toEqual([
      ['notGrabbed', null],
      ['grabbed', null],
      ['grabbed.grabPressed', 'grabbed'],
      ['grabbed.carrying', 'grabbed'],
    ])
    expect(states.filter((one) => one['initial'] === true && one['parent'] === null).map((one) => one['key'])).toEqual(['notGrabbed'])
    expect(states.filter((one) => one['initial'] === true && one['parent'] === 'grabbed').map((one) => one['key'])).toEqual([
      'grabbed.grabPressed',
    ])
  })

  it('passes the travel with one event that carries nothing', () => {
    const event = (GESTURE['events'] as readonly Loose[]).find((one) => one['key'] === TRAVEL_EVENT)
    expect(event).toBeDefined()
    expect(event?.['carries']).toEqual([])
    const transitions = MACHINE['transitions'] as Record<string, Record<string, Loose>>
    expect(Object.keys(transitions[TRAVEL_EVENT] ?? {})).toEqual(['grabbed.grabPressed'])
    expect(transitions[TRAVEL_EVENT]?.['grabbed.grabPressed']?.['to']).toBe('grabbed.carrying')
  })
})

describe('HF-15 -- notGrabbed, then grabPressed, then carrying, then notGrabbed', () => {
  it('starts not grabbed', () => {
    expect(grabOf(emptyScreenSession)).toBe('notGrabbed')
  })

  it('a press on the grab strip is grabPressed', () => {
    expect(grabOf(send(emptyScreenSession, PRESS))).toBe('grabbed.grabPressed')
  })

  it('a press anywhere else is not a grab', () => {
    expect(grabOf(send(emptyScreenSession, { type: 'pointerPressed', pressRow: 'PTD-3', pressedOn: { kind: 'paletteBand' } }))).toBe('notGrabbed')
  })

  it('the travel event makes it carrying, and a release ends it', () => {
    const pressed = send(emptyScreenSession, PRESS)
    const carrying = send(pressed, { type: TRAVEL_EVENT })
    expect(grabOf(carrying)).toBe('grabbed.carrying')
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
    expect(grabOf(send(carrying, { type: TRAVEL_EVENT }))).toBe('grabbed.carrying')
  })
})

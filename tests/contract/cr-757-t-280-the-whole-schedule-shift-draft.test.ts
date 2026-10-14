// CR-757 spec-only cases: table T-280 wholeScheduleShiftDraftStateMachine holds the typed date until Apply is answered and the write lands.

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { REQUIREMENTS, STATE_MACHINES_SOURCE, STATE_MACHINE_BOOK, type Loose } from './cr-757-stage'

const MACHINE_NAME = 'wholeScheduleShiftDraftStateMachine'
const FR_159_HELD =
  '入れた新しい開始日は、適用のボタンを押して続けると答え、書き込みが受け入れられるまで画面の値（`_assets/tbl-state-machines.md` の 表 T-280 の `wholeScheduleShiftDraftStateMachine`）が持つ —— 欄を確定しただけでは問わない。'

const REGION = STATE_MACHINES_SOURCE.regions.find((one) => one['region'] === 'screen') as Loose
const MACHINE = (REGION['machines'] as readonly Loose[]).find((one) => one['name'] === MACHINE_NAME) as Loose
const EVENTS = REGION['events'] as readonly Loose[]

const LEAVING_EVENTS = [
  'surfaceCloseAsked',
  'escapePressed',
  'settingsEntryPressed',
  'propertiesOfChoiceAsked',
  'selectionMoved',
  'createdNameSettled',
  'settleKeyPressed',
] as const

describe('FR-159 / T-280 -- the manuscript still says what these cases press', () => {
  it(FR_159_HELD, () => {
    expect(REQUIREMENTS).toContain(FR_159_HELD)
  })

  it('the machine has the two states empty (initial) and dateHeld carrying newStartDate', () => {
    expect(MACHINE, `table T-280 has ${MACHINE_NAME}`).toBeDefined()
    const states = MACHINE['states'] as readonly Loose[]
    expect(states.map((one) => [one['key'], one['initial'], (one['carries'] as readonly Loose[]).map((carried) => carried['name'])])).toEqual([
      ['empty', true, []],
      ['dateHeld', false, ['newStartDate']],
    ])
    expect(STATE_MACHINE_BOOK).toContain('`wholeScheduleShiftDraftStateMachine.dateHeld`')
  })

  it('the three events of the machine: the date settled (carrying newStartDate), Apply pressed, and the write landed', () => {
    const carried = (key: string): readonly string[] =>
      ((EVENTS.find((one) => one['key'] === key)?.['carries'] ?? []) as readonly Loose[]).map((one) => one['name'] as string)
    expect(carried('wholeScheduleShiftDateSettled')).toEqual(['newStartDate'])
    expect(carried('wholeScheduleShiftEntryPressed')).toEqual([])
    expect(carried('wholeScheduleShiftLanded')).toEqual([])
  })

  it('Apply in dateHeld raises raiseWholeScheduleShiftQuestion; the leaving events and a replaced document drop the date', () => {
    const transitions = MACHINE['transitions'] as Loose
    expect(transitions['wholeScheduleShiftEntryPressed']['dateHeld']['effect']).toBe('raiseWholeScheduleShiftQuestion')
    expect(transitions['wholeScheduleShiftEntryPressed']['empty']).toBeUndefined()
    for (const event of LEAVING_EVENTS) {
      expect(transitions[event]?.['dateHeld']?.['to'], event).toBe('empty')
      expect(transitions[event]?.['dateHeld']?.['guard'], event).toEqual([{ name: 'isLeavingDocumentSettings' }])
    }
    expect(transitions['documentReplacedByOpenOrNew']['dateHeld']).toMatchObject({ to: 'empty' })
    expect(transitions['documentReplacedByOpenOrNew']['dateHeld']['guard']).toBeUndefined()
  })
})

const settingsShown = (): ScreenSession =>
  ({
    ...emptyScreenSession,
    screen: { ...emptyScreenSession.screen, propertiesPanelContentState: { kind: 'documentSettingsDisplayed' } },
  }) as unknown as ScreenSession

const draftOf = (session: ScreenSession): Loose => (session.screen as unknown as Loose)['wholeScheduleShiftDraftState'] as Loose

const step = (session: ScreenSession, event: Loose) => advanceScreenSession(session, event as unknown as SessionEvent)

const settled = (session: ScreenSession, newStartDate: string): ScreenSession =>
  step(session, { type: 'wholeScheduleShiftDateSettled', newStartDate }).state

describe(`T-280 ${MACHINE_NAME} -- against advanceScreenSession`, () => {
  it('starts empty', () => {
    expect(draftOf(emptyScreenSession)).toEqual({ kind: 'empty' })
  })

  it(`settling a date holds it and asks nothing -- 欄を確定しただけでは問わない`, () => {
    const result = step(settingsShown(), { type: 'wholeScheduleShiftDateSettled', newStartDate: '2029-03-05' })
    expect(draftOf(result.state)).toEqual({ kind: 'dateHeld', newStartDate: '2029-03-05' })
    expect(result.effects).toHaveLength(0)
  })

  it('settling another date rewrites the held one; settling an empty field drops it', () => {
    const held = settled(settled(settingsShown(), '2029-03-05'), '2029-04-02')
    expect(draftOf(held)).toEqual({ kind: 'dateHeld', newStartDate: '2029-04-02' })
    expect(draftOf(settled(held, ''))).toEqual({ kind: 'empty' })
  })

  it('settling an empty field while empty stays empty', () => {
    expect(draftOf(settled(settingsShown(), ''))).toEqual({ kind: 'empty' })
  })

  it('Apply while a date is held asks with that date, and keeps holding it until the write lands', () => {
    const held = settled(settingsShown(), '2029-03-05')
    const result = step(held, { type: 'wholeScheduleShiftEntryPressed' })
    expect(result.effects).toEqual([{ type: 'raiseWholeScheduleShiftQuestion', newStartDate: '2029-03-05' }])
    expect(draftOf(result.state)).toEqual({ kind: 'dateHeld', newStartDate: '2029-03-05' })
  })

  it('Apply with no date held does nothing (WH-12: it cannot be pressed)', () => {
    const result = step(settingsShown(), { type: 'wholeScheduleShiftEntryPressed' })
    expect(result.effects).toHaveLength(0)
    expect(draftOf(result.state)).toEqual({ kind: 'empty' })
  })

  it('the write accepted (wholeScheduleShiftLanded) empties the draft', () => {
    const held = settled(settingsShown(), '2029-03-05')
    expect(draftOf(step(held, { type: 'wholeScheduleShiftLanded' }).state)).toEqual({ kind: 'empty' })
  })

  it('pressing the settings entry again leaves the settings face and drops the date', () => {
    const held = settled(settingsShown(), '2029-03-05')
    const left = step(held, { type: 'settingsEntryPressed' }).state
    expect((left.screen as unknown as Loose)['propertiesPanelContentState'], 'premise: the panel left the settings').not.toEqual({
      kind: 'documentSettingsDisplayed',
    })
    expect(draftOf(left)).toEqual({ kind: 'empty' })
  })

  it('a replaced document (open or new) drops the date', () => {
    const held = settled(settingsShown(), '2029-03-05')
    expect(draftOf(step(held, { type: 'documentReplacedByOpenOrNew' }).state)).toEqual({ kind: 'empty' })
  })
})

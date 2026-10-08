// CR-611 spec-only tests: table T-290 -- newDocumentEntryPressed raises QN-5 from notAsked with no guard.

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { STATE_MACHINES_SOURCE } from './cr-610-file-flow-stage'

type Loose = Record<string, any>

const FLOW = STATE_MACHINES_SOURCE.regions.find((one) => one['region'] === 'fileFlow') as Loose
const EVENT = (FLOW['events'] as Loose[]).find((one) => one['key'] === 'newDocumentEntryPressed') as Loose
const CONFIRMATION = (FLOW['machines'] as Loose[]).find((one) => one['name'] === 'confirmationStateMachine') as Loose
const QUESTION = { manner: 'NT-7', question: 'QN-5', items: [{ name: 'Here', isShownOnAnotherRow: false }] }

const flowOf = (session: ScreenSession): Loose => (session as unknown as Loose)['fileFlow'] as Loose

function step(session: ScreenSession, event: Loose): { state: ScreenSession; effects: readonly unknown[] } {
  return advanceScreenSession(session, event as unknown as SessionEvent)
}

function withFlow(fields: Loose): ScreenSession {
  const base = emptyScreenSession as unknown as Loose
  return { ...base, fileFlow: { ...(base['fileFlow'] as Loose), ...fields } } as unknown as ScreenSession
}

describe('T-290 / SK-25 -- the manuscript still says it', () => {
  it('SK-25: newDocumentEntryPressed comes from IC-98 and SK-25 and carries the question alone', () => {
    expect(EVENT['source']['rows']).toEqual(expect.arrayContaining(['IC-98', 'SK-25', 'FR-095']))
    expect((EVENT['carries'] as Loose[]).map((one) => one['name'])).toEqual(['question'])
  })

  it('FR-095: confirmationStateMachine goes notAsked -> questionAsked only in editsUnsaved, and carries the start out otherwise', () => {
    const cell = CONFIRMATION['transitions']['newDocumentEntryPressed']['notAsked'] as Loose[]
    expect(cell.map((one) => [one['to'], one['guard'], one['effect']])).toEqual([
      ['questionAsked', [{ in: 'unsavedEditsStateMachine.editsUnsaved' }], undefined],
      ['notAsked', [{ in: 'unsavedEditsStateMachine.nothingUnsaved' }], 'carryOutOwedAction'],
    ])
  })
})

describe('FR-095 (MUST) / QN-5 -- the question stands while an edit is unsaved', () => {
  it('FR-095: with nothing unsaved the press raises no question and carries out startNewDocument', () => {
    const result = step(emptyScreenSession, { type: 'newDocumentEntryPressed', question: QUESTION })
    expect((flowOf(result.state)['confirmationState'] as Loose)['kind']).toBe('notAsked')
    expect(result.effects).toEqual([{ type: 'carryOutOwedAction', owedAction: { kind: 'startNewDocument' } }])
  })

  it('FR-095: newDocumentEntryPressed with an unsaved edit raises QN-5 and owes startNewDocument', () => {
    const unsaved = withFlow({ unsavedEditsState: { kind: 'editsUnsaved' } })
    const result = step(unsaved, { type: 'newDocumentEntryPressed', question: QUESTION })
    const confirmation = flowOf(result.state)['confirmationState'] as Loose
    expect(confirmation['kind'], 'FR-095: the press did not raise the question').toBe('questionAsked')
    expect(confirmation['question']).toEqual(QUESTION)
    expect(confirmation['owedAction']).toEqual({ kind: 'startNewDocument' })
  })

  it('FR-095: the press raises no RS-27 notice from notAsked', () => {
    const result = step(emptyScreenSession, { type: 'newDocumentEntryPressed', question: QUESTION })
    expect(JSON.stringify(result.effects)).not.toContain('RS-27')
  })

  it('T-290 (unchanged): a second press while QN-5 stands keeps the question and tells RS-27', () => {
    const asked = withFlow({
      confirmationState: { kind: 'questionAsked', question: QUESTION, owedAction: { kind: 'startNewDocument' } },
    })
    const result = step(asked, { type: 'newDocumentEntryPressed', question: QUESTION })
    expect((flowOf(result.state)['confirmationState'] as Loose)['kind']).toBe('questionAsked')
    expect(JSON.stringify(result.effects)).toContain('RS-27')
  })
})

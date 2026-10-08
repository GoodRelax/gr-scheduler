// CR-712 wave 2 spec-only cases: QN-5 is asked only while there are unsaved edits (FR-095, T-234, T-290).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import {
  advanceScreenSession,
  emptyScreenSession,
  type ScreenSession,
  type SessionEffect,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const FR_095_ASK_ONLY_WITH_EDITS = '捨てる前に、保存していない編集があるときは、表 T-024a の `OP-4` と同じ確認を求めること（MUST）'
const FR_095_WHY_NOT_ASKED =
  '保存していない編集が無いときに問わないのは、そのとき失うのが取り消しの履歴だけであり、利用者がそれを問いの負担より軽いと裁いたからである'
const FR_095_OLD_STATEMENT = '捨てる前に、未保存の編集の有無によらず、表 T-024a の `OP-4` と同じ確認を求めること（MUST）'
const QN_5_ONLY_WITH_EDITS = '保存していない編集があるときだけ立つ'
const QN_5_OLD_SCENE = '未保存の編集の有無によらず立つ'

const QUESTION = { manner: 'NT-7', question: 'QN-5', items: [] } as const

const INCOMING = { fileName: 'incoming.json', byteLength: 2, documentTitle: null } as const

const EDITED: readonly SessionEvent[] = [{ type: 'documentEditLanded', isBackToSavedDocument: false }]

/** @purity pure */
function stepped(session: ScreenSession, events: readonly SessionEvent[]): ScreenSession {
  return events.reduce((now, event) => advanceScreenSession(now, event).state, session)
}

/** @purity pure */
function effectTypes(effects: readonly SessionEffect[]): readonly string[] {
  return effects.map((one) => one.type)
}

/** @purity pure */
function askedQuestion(session: ScreenSession): string | null {
  const state = session.fileFlow.confirmationState
  return state.kind === 'questionAsked' ? state.question.question : null
}

// see T-290
const UP_TO_THE_REPLACE: readonly SessionEvent[] = [
  { type: 'documentOpenAsked', openRoute: 'drop' },
  { type: 'documentFileRead', question: QUESTION, incomingFile: INCOMING },
]

describe('FR-095 and table T-234 read as CR-712 E-07 wrote them', () => {
  it('FR-095 asks before discarding only when there are unsaved edits, and says why', () => {
    expect(REQUIREMENTS).toContain(FR_095_ASK_ONLY_WITH_EDITS)
    expect(REQUIREMENTS).toContain(FR_095_WHY_NOT_ASKED)
    expect(REQUIREMENTS).not.toContain(FR_095_OLD_STATEMENT)
  })

  it('QN-5 stands only with unsaved edits', () => {
    const qn5 = specTable('T-234').rows.find((one) => one.id === 'QN-5')
    const said = (qn5?.cells ?? []).join(' ')
    expect(said).toContain(QN_5_ONLY_WITH_EDITS)
    expect(said).not.toContain(QN_5_OLD_SCENE)
  })
})

describe(`starting a new document -- ${FR_095_ASK_ONLY_WITH_EDITS}`, () => {
  it('with nothing unsaved, nothing is asked and the new document is carried out', () => {
    const step = advanceScreenSession(emptyScreenSession, { type: 'newDocumentEntryPressed', question: QUESTION })
    expect(askedQuestion(step.state)).toBeNull()
    expect(effectTypes(step.effects)).toContain('carryOutOwedAction')
  })

  it('with unsaved edits, QN-5 is asked and nothing is carried out yet', () => {
    const before = stepped(emptyScreenSession, EDITED)
    const step = advanceScreenSession(before, { type: 'newDocumentEntryPressed', question: QUESTION })
    expect(askedQuestion(step.state)).toBe('QN-5')
    expect(effectTypes(step.effects)).not.toContain('carryOutOwedAction')
  })
})

describe('replacing through the open chooser (OP-3, OP-4)', () => {
  it('with nothing unsaved, the replace goes straight to the import', () => {
    const before = stepped(emptyScreenSession, UP_TO_THE_REPLACE)
    const step = advanceScreenSession(before, { type: 'openChoiceAnswered', openChoice: 'replace', question: QUESTION })
    expect(askedQuestion(step.state)).toBeNull()
    expect(step.state.fileFlow.fileOperationState.kind).toBe('importingDocument')
    expect(effectTypes(step.effects)).toContain('importIncomingDocument')
  })

  it('with unsaved edits, QN-5 is asked first', () => {
    const before = stepped(emptyScreenSession, [...EDITED, ...UP_TO_THE_REPLACE])
    const step = advanceScreenSession(before, { type: 'openChoiceAnswered', openChoice: 'replace', question: QUESTION })
    expect(askedQuestion(step.state)).toBe('QN-5')
    expect(step.state.fileFlow.fileOperationState.kind).toBe('awaitingDiscardAnswer')
  })
})

describe('reading the file again (OP-13)', () => {
  it('with nothing unsaved, the reopened file goes straight to the import', () => {
    const before = stepped(emptyScreenSession, [{ type: 'documentOpenAsked', openRoute: 'reopen' }])
    const step = advanceScreenSession(before, { type: 'documentFileRead', question: QUESTION, incomingFile: INCOMING })
    expect(askedQuestion(step.state)).toBeNull()
    expect(step.state.fileFlow.fileOperationState.kind).toBe('importingDocument')
    expect(effectTypes(step.effects)).toContain('importIncomingDocument')
  })

  it('with unsaved edits, QN-5 is asked first', () => {
    const before = stepped(emptyScreenSession, [...EDITED, { type: 'documentOpenAsked', openRoute: 'reopen' }])
    const step = advanceScreenSession(before, { type: 'documentFileRead', question: QUESTION, incomingFile: INCOMING })
    expect(askedQuestion(step.state)).toBe('QN-5')
    expect(step.state.fileFlow.fileOperationState.kind).toBe('awaitingDiscardAnswer')
  })
})

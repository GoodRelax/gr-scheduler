// Unit tests for PostDialogueMessage (unit UF-26 of table T-075).

import { describe, expect, it } from 'vitest'

import {
  emptyDialogueLog,
  logWithMessage,
  messagesSince,
  type DialogueLog,
} from '../../src/entity/document-model/dialogue-log/dialogue-log'
import {
  postDialogueMessage,
  type DialogueAudience,
  type DialogueLogHolder,
  type SettledUtterance,
} from '../../src/use-case/post-dialogue-message/post-dialogue-message'

// see T-035
const T_035 = {
  'AG-6':
    '監視は「**自分がまだ受け取っていない、自分以外の書き手が確定した変更と発話だけ**」を' +
    '通知すること。日程データの変更は版数で選び、確定した発話（AG-11）は版数に依らず' +
    '選ぶ（MUST）。自分の書き込みで自分が起きてはならない（MUST NOT）。' +
    '確定していない下書きで起きてはならない（MUST NOT）',
  'AG-11':
    '対話欄で人が確定した発話を読めること（MUST）。発話は日程データではないので版数を' +
    '上げない（FR-063）。それでも監視は起きること（AG-6）—— 版数で選べないので、' +
    '監視は発話を版数とは別の順序で数えること（MUST）。' +
    '確定していない入力途中の文字を読めてはならない（MUST NOT）',
} as const

const settled = (part: Partial<SettledUtterance> = {}): SettledUtterance => ({
  author: 'human',
  text: 'wait',
  settledAt: '2026-08-17T00:00:00Z',
  ...part,
})

const recorderOf = (start: DialogueLog = emptyDialogueLog()) => {
  const delivered: DialogueLog[] = []
  const state = { held: start }
  const holder: DialogueLogHolder = {
    read: () => state.held,
    replace: (next) => {
      state.held = next
    },
  }
  const audience: DialogueAudience = {
    deliver: (log) => {
      delivered.push(log)
    },
  }
  return { holder, audience, delivered, state }
}

describe('PostDialogueMessage (PI-16) -- CP-16', () => {
  it('CP-16 積む: the settled utterance lands in the log the holder holds', () => {
    const recorder = recorderOf()
    const returned = postDialogueMessage(
      settled({ author: 'human', text: 'wait' }),
      recorder.holder,
      recorder.audience,
    )
    expect(returned.messages.map((message) => message.text)).toEqual(['wait'])
    expect(recorder.state.held).toBe(returned)
  })

  it('AG-11 counts the utterance in an order of its own, rising by one', () => {
    const recorder = recorderOf()
    postDialogueMessage(settled({ author: 'human', text: 'wait' }), recorder.holder, recorder.audience)
    const second = postDialogueMessage(
      settled({ author: 'agent', text: 'why did you move it' }),
      recorder.holder,
      recorder.audience,
    )
    expect(second.messages.map((message) => message.sequence)).toEqual([1, 2])
    expect(second.nextSequence).toBe(3)
    expect(T_035['AG-11']).toContain('版数とは別の順序で数えること（MUST）')
  })

  it('AG-11 keeps the utterance as it was settled, and only adds the order', () => {
    const recorder = recorderOf()
    const utterance = settled({
      author: 'agent',
      text: 'why did you move it',
      settledAt: '2026-08-17T09:30:00Z',
    })
    const log = postDialogueMessage(utterance, recorder.holder, recorder.audience)
    expect(log.messages[0]).toEqual({ ...utterance, sequence: 1 })
  })

  it('FT-5 of table T-078 wakes the watchers once per utterance, though no instant moved', () => {
    const recorder = recorderOf()
    postDialogueMessage(settled({ text: 'wait' }), recorder.holder, recorder.audience)
    expect(recorder.delivered).toHaveLength(1)
    postDialogueMessage(settled({ text: 'again' }), recorder.holder, recorder.audience)
    expect(recorder.delivered).toHaveLength(2)
  })

  it('Chapter 5.5 delivers AFTER the replacement, never before it', () => {
    const calls: string[] = []
    let held = emptyDialogueLog()
    const holder: DialogueLogHolder = {
      read: () => held,
      replace: (next) => {
        calls.push('replace')
        held = next
      },
    }
    const audience: DialogueAudience = {
      deliver: (log) => {
        calls.push('deliver')
        expect(log.messages.map((message) => message.text)).toEqual(['wait'])
        expect(held).toBe(log)
      },
    }
    postDialogueMessage(settled({ text: 'wait' }), holder, audience)
    expect(calls).toEqual(['replace', 'deliver'])
  })

  it('AG-6 selection belongs to UF-25, so the WHOLE log goes out', () => {
    const recorder = recorderOf()
    postDialogueMessage(settled({ author: 'agent', text: 'one' }), recorder.holder, recorder.audience)
    postDialogueMessage(settled({ author: 'human', text: 'two' }), recorder.holder, recorder.audience)

    const last = recorder.delivered[1]!
    expect(last.messages.map((message) => message.text)).toEqual(['one', 'two'])
    expect(messagesSince(last, 0, 'agent').map((message) => message.text)).toEqual(['two'])
  })

  it('LY-5 reads the current value at the moment of the call, not a remembered one', () => {
    const recorder = recorderOf()
    postDialogueMessage(settled({ author: 'human', text: 'one' }), recorder.holder, recorder.audience)
    recorder.state.held = logWithMessage(
      recorder.state.held,
      settled({ author: 'agent', text: 'two' }),
    )
    const third = postDialogueMessage(
      settled({ author: 'human', text: 'three' }),
      recorder.holder,
      recorder.audience,
    )
    expect(third.messages.map((message) => message.text)).toEqual(['one', 'two', 'three'])
    expect(third.messages.map((message) => message.sequence)).toEqual([1, 2, 3])
  })

  it('LY-1 holds the log as an immutable value: the log it replaced is left alone', () => {
    const start = logWithMessage(emptyDialogueLog(), settled({ text: 'one' }))
    const recorder = recorderOf(start)
    postDialogueMessage(settled({ text: 'two' }), recorder.holder, recorder.audience)
    expect(start.messages.map((message) => message.text)).toEqual(['one'])
    expect(start.nextSequence).toBe(2)
  })

  it('MS-1 of table T-042 keeps its one write path: an utterance is not a document write', () => {
    const recorder = recorderOf()
    const log = postDialogueMessage(settled(), recorder.holder, recorder.audience)
    expect(postDialogueMessage.length).toBe(3)
    expect(Object.keys(log).sort()).toEqual(['messages', 'nextSequence'])
    expect(T_035['AG-6']).toContain('確定した発話（AG-11）は版数に依らず選ぶ（MUST）')
  })
})

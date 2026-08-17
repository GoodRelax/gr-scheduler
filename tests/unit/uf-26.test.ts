// Unit tests for PostDialogueMessage (unit UF-26 of table T-075).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// The unit carries CP-16 of table T-062 -- 確定した発話を `DialogueLog` へ積み、
// 配る。文書に保存しない -- and every case below is driven by FR-066, the two
// rows AG-11 / AG-6 of table T-035 (copied verbatim into `T_035` so that this
// file does not depend on the prose being re-read), row FT-5 of table T-078 and
// the ordering paragraph of Chapter 5.5. Nothing here was read off the
// implementation.
//
// ⭐ WHERE THIS UNIT WRITES -- beside `applyDocumentChange`, not through it.
// The specification settles this; it is not a choice the tests make.
//   - MS-1 of table T-042 makes one path for 文書への書き込み -- a write TO THE
//     DOCUMENT. An utterance is not one. FR-066 forbids keeping the
//     conversation in the document (会話そのものを文書に保存してはならない
//     (MUST NOT)), and DR-1 of table T-052 lets the root carry the three groups
//     and nothing else, so the document has no place to put an utterance. LY-1
//     of table T-060 files 確定した発話 under 文書に保存しない実行時の値
//     instead, beside the undo history and the selection.
//   - Appendix A entry 0.36 states it outright, while listing the MUSTs that
//     forced table T-078 to grow: 「`AG-11`（発話は版数を上げないので `WS-6` を
//     通らない）」. A unit routed through `applyDocumentChange` WOULD reach
//     WS-6. FT-5 then makes `PostDialogueMessage` itself the thing that 配る.
// So MS-1 is not weakened by this unit and there is nothing here to defer.

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

// Fixed copy of the two rows of table T-035 that this unit answers to
// (docs/spec/01-04-requirements.md). Chapter 1.9 asks a test of a requirement
// that points at a table (FR-064 does) to be driven by a copy of the table
// rather than by a re-reading of it.
const T_035 = {
  'AG-6':
    '監視は「自分がまだ受け取っていない、自分以外の書き手が確定した変更と発話だけ」を' +
    '通知すること。日程データの変更は版数で選び、確定した発話（AG-11）は版数に依らず' +
    '選ぶ（MUST）。自分の書き込みで自分が起きてはならない（MUST NOT）。' +
    '確定していない下書きで起きてはならない（MUST NOT）',
  'AG-11':
    '対話欄で人が確定した発話を読めること（MUST）。発話は日程データではないので版数を' +
    '上げない（FR-063）。それでも監視は起きること（AG-6）—— 版数で選べないので、' +
    '監視は発話を版数とは別の順序で数えること（MUST）。' +
    '確定していない入力途中の文字を読めてはならない（MUST NOT）',
} as const

// Every key of `SettledUtterance` is spelled out, never left out: `settledAt`
// is what makes the value a 確定した発話 at all, and AG-11's MUST NOT is about
// anything that has not got one.
const settled = (part: Partial<SettledUtterance> = {}): SettledUtterance => ({
  author: 'human',
  text: 'wait',
  settledAt: '2026-08-17T00:00:00Z',
  ...part,
})

// LY-5 of table T-060 puts the current value in the `Framework`; the two
// collaborators are how this `UseCase` unit reaches it. The recorder stands in
// for that layer and keeps what it was handed.
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
    // 「積み」 means the holder ends up with it, not that a copy was handed back.
    expect(recorder.state.held).toBe(returned)
  })

  it('AG-11 counts the utterance in an order of its own, rising by one', () => {
    // T_035['AG-11']: 監視は発話を版数とは別の順序で数えること（MUST）。
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
    // Who settled it and when are what AG-6 selects on later, so neither may be
    // replaced here; `sequence` is the one thing this path adds.
    expect(log.messages[0]).toEqual({ ...utterance, sequence: 1 })
  })

  it('FT-5 of table T-078 wakes the watchers once per utterance, though no revision moved', () => {
    // FT-5: 版数を上げずに届いた発話 / 気づくもの: PostDialogueMessage が配る。
    // AG-11 says それでも監視は起きること, so the delivery is not conditional.
    const recorder = recorderOf()
    postDialogueMessage(settled({ text: 'wait' }), recorder.holder, recorder.audience)
    expect(recorder.delivered).toHaveLength(1)
    postDialogueMessage(settled({ text: 'again' }), recorder.holder, recorder.audience)
    expect(recorder.delivered).toHaveLength(2)
  })

  it('Chapter 5.5 delivers AFTER the replacement, never before it', () => {
    // 通知は差し替えの後とすること（MUST）。前に配ってはならない（MUST NOT）——
    // 前に配ると購読者が読む文書がまだ古い。AG-6 が「確定した変更」と書いている
    // のは、この順序のことである。AG-6 says 変更と発話 in one breath, so the
    // order binds this path too: a subscriber that reads the current value
    // during the delivery must not see a log older than the notice it holds.
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
    // Chapter 5.5: 選び方は AG-6 が持ち、判定するのは表 T-063 の UT-3 が分けた
    // 純粋な側（表 T-075 の UF-25）である。So this unit must NOT thin the log
    // down to the new message, and must NOT drop the author's own utterance --
    // AG-6's MUST NOT is answered downstream by `messagesSince` (PI-33).
    const recorder = recorderOf()
    postDialogueMessage(settled({ author: 'agent', text: 'one' }), recorder.holder, recorder.audience)
    postDialogueMessage(settled({ author: 'human', text: 'two' }), recorder.holder, recorder.audience)

    const last = recorder.delivered[1]!
    expect(last.messages.map((message) => message.text)).toEqual(['one', 'two'])
    expect(messagesSince(last, 0, 'agent').map((message) => message.text)).toEqual(['two'])
  })

  it('LY-5 reads the current value at the moment of the call, not a remembered one', () => {
    // 現在値を保持するのはこの層だけである（LY-5）—— the holder is that layer.
    // A second speaker settling an utterance in between must not be lost, and
    // AG-11's counter must not restart, or AG-6 hands a watcher the same
    // sequence twice.
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
    // 文書に保存しない実行時の値 ... いずれも不変の値として持ち、丸ごと置き換える。
    const start = logWithMessage(emptyDialogueLog(), settled({ text: 'one' }))
    const recorder = recorderOf(start)
    postDialogueMessage(settled({ text: 'two' }), recorder.holder, recorder.audience)
    expect(start.messages.map((message) => message.text)).toEqual(['one'])
    expect(start.nextSequence).toBe(2)
  })

  it('MS-1 of table T-042 keeps its one write path: an utterance is not a document write', () => {
    // FR-066 (MUST NOT) keeps the conversation out of the document and DR-1 of
    // table T-052 leaves the root nowhere to put it, so this unit takes no
    // `Document`, holds none and returns none -- there is no second entrance to
    // set beside `applyDocumentChange`'s, and no 刻印 for it to move (AG-11).
    const recorder = recorderOf()
    const log = postDialogueMessage(settled(), recorder.holder, recorder.audience)
    expect(postDialogueMessage.length).toBe(3)
    expect(Object.keys(log).sort()).toEqual(['messages', 'nextSequence'])
    expect(T_035['AG-6']).toContain('確定した発話（AG-11）は版数に依らず選ぶ（MUST）')
  })
})

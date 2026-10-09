// CR-719 spec-only cases: RS-78 to RS-83 are shown until dismissed and RS-84 to RS-88 leave after S-542, as the display column of table T-233 says (FR-076, NT-2).

import { describe, expect, it } from 'vitest'

import {
  advanceScreenSession,
  emptyScreenSession,
  NOTICE_DISPLAY_OF_REASON,
  type ScreenSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { REQUIREMENTS, rowOf } from './cr-719-stage'

const FR_076_THE_COLUMN_HOLDS_IT = '理由ごとに画面へどう出すかは、表 T-233 の「表示の仕方」の欄が持つ（MUST）'
const FR_076_NOT_DECIDED_AGAIN = '要求の本文に「告げる」と書かれていても、出すかどうかを本文で決め直してはならない（MUST NOT）'
const NT_2_ONLY_TIMED_ROWS = '時間で消すのは、表 T-233 の表示の仕方が「時間で消す」の理由の通知だけとする（MUST）'
const NT_2_GONE_AFTER_S_542 =
  'その通知は、立ってから `_assets/tbl-settings.md` の 表 T-206 の `S-542` が経ったら、人の操作を待たずに消すこと（MUST）'

const SHOWN = ['RS-78', 'RS-79', 'RS-80', 'RS-81', 'RS-82', 'RS-83'] as const
const TIMED = ['RS-84', 'RS-85', 'RS-86', 'RS-87', 'RS-88'] as const

describe('FR-076 / NT-2 -- the clauses this file is driven by still stand', () => {
  it.each([FR_076_THE_COLUMN_HOLDS_IT, FR_076_NOT_DECIDED_AGAIN, NT_2_ONLY_TIMED_ROWS, NT_2_GONE_AFTER_S_542])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([
    ...SHOWN.map((row) => [row, '出す'] as const),
    ...TIMED.map((row) => [row, '時間で消す'] as const),
  ])('table T-233 prints %s with the display %s', (row, printed) => {
    expect(rowOf('T-233', row).by['表示の仕方']).toBe(printed)
  })
})

describe(`NOTICE_DISPLAY_OF_REASON -- ${FR_076_THE_COLUMN_HOLDS_IT}`, () => {
  it.each(SHOWN)('%s is shown', (row) => {
    expect(NOTICE_DISPLAY_OF_REASON[row]).toBe('show')
  })

  it.each(TIMED)('%s leaves by itself', (row) => {
    expect(NOTICE_DISPLAY_OF_REASON[row]).toBe('autoDismiss')
  })
})

/** @purity pure */
function standing(session: ScreenSession): readonly string[] {
  const shown = session.notices.noticeDisplayState
  return shown.kind === 'shown' ? shown.standing.map((one) => one.reason) : []
}

/** @purity pure */
function raisedThenElapsed(reason: string): { readonly raised: readonly string[]; readonly later: readonly string[] } {
  const raised: SessionEvent = { type: 'noticeRaised', reason, affectedCount: null }
  const elapsed = { type: 'noticeTimeElapsed', reason } as unknown as SessionEvent
  const first = advanceScreenSession(emptyScreenSession, raised).state
  return { raised: standing(first), later: standing(advanceScreenSession(first, elapsed).state) }
}

describe(`NT-2 -- ${NT_2_GONE_AFTER_S_542}`, () => {
  it.each(TIMED)('%s stands when raised and is gone once S-542 has passed', (row) => {
    const seen = raisedThenElapsed(row)
    expect(seen.raised, `${row} stands when raised`).toContain(row)
    expect(seen.later, `${row} is gone after S-542`).not.toContain(row)
  })

  it.each(SHOWN)(`${NT_2_ONLY_TIMED_ROWS} -- %s is still standing after S-542`, (row) => {
    const seen = raisedThenElapsed(row)
    expect(seen.raised, `${row} stands when raised`).toContain(row)
    expect(seen.later, `${row} stands until a person dismisses it`).toContain(row)
  })
})

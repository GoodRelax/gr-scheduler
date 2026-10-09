// CR-718 spec-only cases: the clauses of FR-001 (TC-8), FR-033, FR-008 and FR-076, and the rows of tables T-233 and T-220, read as quoted here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// WHY: each constant is one sentence cut from the manuscript as it stands, ending at its MUST marker where it has one (check 39).
const TC_8_CARRIES_THE_REASON = '⭐ 作らなかった理由として 表 T-233 の `RS-53` を運ぶこと（MUST）'
const TC_8_WHY_IT_IS_CARRIED =
  '⭐ 運ぶのは、出し分けを同表の欄の値 1 つで変えられるようにするためである —— 運ばなければ、欄を変えても何も出ない。'
const FR_033_SEVERAL_TASK_GROUPS_ARE_REFUSED =
  '⛔ 貼り付け先としてタスクグループが 2 つ以上選ばれているときは、貼り付けを受け付けず、行えない理由を `FR-029` のとおり通知の仕組みへ運ぶこと（MUST） —— どのタスクグループの子とするかが決まらない。'
const FR_033_THE_REASON_IS_RS_27 = '⚠️ この場面に当たる 表 T-233 の行は無いので、運ぶ理由は同要求の落ち先の `RS-27` である。'
const FR_008_A_RENAME_CARRIES_RS_49 =
  '担当の名前を変えたときは、その担当が付いている全タスクの表示が変わったことを、表 T-233 の `RS-49` として、対象の件数とともに通知の仕組みへ運ぶこと（MUST） —— 作法は `FR-076` に従う。'
const FR_076_THE_COLUMN_DECIDES = '⭐ 理由ごとに画面へどう出すかは、表 T-233 の「表示の仕方」の欄が持つ（MUST）。'
const FR_076_A_HIDDEN_REASON_STANDS_NO_CARD =
  '「出さない」の理由は、上げられても通知の欄に 1 枚を立てない —— 行は理由として残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）はその行を運ぶ。'
const FR_076_THE_TEXT_DOES_NOT_DECIDE_AGAIN =
  '⛔ 要求の本文に「告げる」と書かれていても、出すかどうかを本文で決め直してはならない（MUST NOT） —— 欄が唯一の正である。'
const FR_076_AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW =
  '⭐ ⇒ 取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST） —— 語と次の一手は `FR-038` の辞書が同表の行 ID で持つ。'
const FR_076_NO_FALL_TO_A_T_233_ROW =
  '⛔ その通知を本表の行（`RS-15` を含む）へ振り替えてはならない（MUST NOT） —— 振り替えると、どの不変条件が破れたのかを人が読めず、`NT-1` の「なぜ誤りか」を果せない。'

const IV_10_FINISH_NOT_BEFORE_START =
  '`start` と `finish` がともに非 `null` の `Task` で、`finish` が `start` より前でないこと'
const IV_14_A_DATE_IN_RANGE = '日付の列が、日として読め、受け入れる日付の範囲に収まること。'

const SHOWS_NOTHING = '出さない'

const rowOf = (tableId: string, rowId: string) => {
  const found = specTable(tableId).rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  return found
}

describe('the clauses CR-718 wrote still read word for word', () => {
  it.each([
    ['FR-001 TC-8 (MUST) -- the reason nothing was made is carried', TC_8_CARRIES_THE_REASON],
    ['FR-001 TC-8 -- why it is carried', TC_8_WHY_IT_IS_CARRIED],
    ['FR-033 (MUST) -- several chosen task groups refuse the paste', FR_033_SEVERAL_TASK_GROUPS_ARE_REFUSED],
    ['FR-033 -- the reason is RS-27', FR_033_THE_REASON_IS_RS_27],
    ['FR-008 (MUST) -- a rename carries RS-49', FR_008_A_RENAME_CARRIES_RS_49],
    ['FR-076 (MUST) -- the display column decides', FR_076_THE_COLUMN_DECIDES],
    ['FR-076 -- a hidden reason stands no card', FR_076_A_HIDDEN_REASON_STANDS_NO_CARD],
    ['FR-076 (MUST NOT) -- the text does not decide again', FR_076_THE_TEXT_DOES_NOT_DECIDE_AGAIN],
    ['FR-076 (MUST) -- an import refusal carries its T-220 row', FR_076_AN_IMPORT_REFUSAL_CARRIES_ITS_T_220_ROW],
    ['FR-076 (MUST NOT) -- no fall to a T-233 row', FR_076_NO_FALL_TO_A_T_233_ROW],
  ])('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('table T-239 row TC-8 holds both TC-8 sentences in one row', () => {
    const cell = rowOf('T-239', 'TC-8').cells.join(' ')
    expect(cell).toContain(TC_8_CARRIES_THE_REASON)
    expect(cell).toContain(TC_8_WHY_IT_IS_CARRIED)
  })

  it('table T-220 rows IV-10 and IV-14 state what they refuse', () => {
    expect(rowOf('T-220', 'IV-10').cells.join(' ')).toContain(IV_10_FINISH_NOT_BEFORE_START)
    expect(rowOf('T-220', 'IV-14').cells.join(' ')).toContain(IV_14_A_DATE_IN_RANGE)
  })
})

describe('the three reasons the clauses carry are rows of table T-233 that show nothing', () => {
  it.each(['RS-53', 'RS-27', 'RS-49'])('%s has the display %s', (rowId) => {
    const cells = rowOf('T-233', rowId).cells.map((one) => one.trim())
    expect(cells, `${rowId} is a row of T-233 whose display cell reads ${SHOWS_NOTHING}`).toContain(SHOWS_NOTHING)
  })

  it('RS-53 and RS-27 and RS-49 are named by the sentences that carry them', () => {
    expect(TC_8_CARRIES_THE_REASON).toContain('`RS-53`')
    expect(FR_033_THE_REASON_IS_RS_27).toContain('`RS-27`')
    expect(FR_008_A_RENAME_CARRIES_RS_49).toContain('`RS-49`')
  })
})

describe('the words of the old clauses are gone from the requirements', () => {
  it.each([
    '作らなかったことを告げること（MUST）',
    '押しても何も起きない入口と見分けがつかなくなる',
    '貼り付け先としてタスクグループが 2 つ以上選ばれているときは、貼り付けを受け付けずに通知すること（MUST）',
    '通知しなければ事故である',
  ])('%s is not written', (gone) => {
    expect(REQUIREMENTS).not.toContain(gone)
  })
})

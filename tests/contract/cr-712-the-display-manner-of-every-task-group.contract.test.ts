// CR-712 wave 2 spec-only cases: the display column of tables T-233 / T-234 decides how each reason and question shows.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'
import { NOTICE_DISPLAY_OF_REASON } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { QUESTION_DISPLAY_OF_ROW } from '../../src/use-case/advance-screen-session/notice-values'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const PUBLISHED = readFileSync(join(SPEC, '_assets', 'tbl-published-entries.md'), 'utf8')

type ReasonDisplay = 'show' | 'hide' | 'autoDismiss' | 'report'

type QuestionDisplay = 'ask' | 'askOnlyWithUnsavedEdits'

interface ReasonEntry {
  readonly id: string
  readonly scene: { readonly ja: string }
  readonly manner: string
  readonly source: { readonly ja: string }
  readonly display: ReasonDisplay
  readonly wordsOf?: string
}

interface QuestionEntry {
  readonly id: string
  readonly scene: { readonly ja: string }
  readonly display: QuestionDisplay
}

interface NoticeRoster {
  readonly reasons: readonly ReasonEntry[]
  readonly questions: readonly QuestionEntry[]
  readonly invariantRefusals: {
    readonly table: string
    readonly manner: string
    readonly display: ReasonDisplay
    readonly wordsOf?: Readonly<Record<string, string>>
  }
}

const ROSTER = JSON.parse(readFileSync(join(SPEC, '_source', 'notice-reasons.json'), 'utf8')) as NoticeRoster

interface WordEntry {
  readonly rowId: string
  readonly text: { readonly ja: string; readonly en: string }
  readonly nextStep?: { readonly ja: string; readonly en: string }
}

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly WordEntry[]
  readonly invariants: readonly WordEntry[]
}

// WHY: each constant ends exactly at its marker, cut from section 4 of CR-712 as check 39 reads it.
const FR_076_THE_COLUMN_HOLDS_IT = '理由ごとに画面へどう出すかは、表 T-233 の「表示の仕方」の欄が持つ（MUST）'
const FR_076_HIDE_IS_CARRIED =
  '「出さない」の理由は、上げられても通知の欄に 1 枚を立てない —— 行は理由として残り、`Agent API` の拒否の値（表 T-035 の `AG-9a`）はその行を運ぶ。'
const FR_076_NOT_DECIDED_AGAIN = '要求の本文に「告げる」と書かれていても、出すかどうかを本文で決め直してはならない（MUST NOT）'
const FR_076_A_NEW_ROW_HAS_WORDS = '相乗り（表 T-233 のまとめ方の欄の「語は …」）を持たない行を足すときは、辞書の原稿にも項を足すこと（MUST）'
const FR_076_A_RIDING_ROW_HAS_NONE = '相乗りする行の項を辞書に持ってはならない（MUST NOT）'

// WHY: the rows by display, copied from CR-712 section 3.2, so a row moved in the manuscript alone goes red.
const HIDDEN = [
  'RS-19', 'RS-22', 'RS-27', 'RS-28', 'RS-29', 'RS-30', 'RS-31', 'RS-32', 'RS-34', 'RS-36', 'RS-37',
  'RS-38', 'RS-39', 'RS-40', 'RS-44', 'RS-46', 'RS-49', 'RS-53', 'RS-55', 'RS-62', 'RS-74',
] as const
const TIMED = [
  'RS-23', 'RS-33', 'RS-54', 'RS-56', 'RS-58', 'RS-59', 'RS-61', 'RS-63', 'RS-65', 'RS-66', 'RS-68',
  'RS-70', 'RS-69', 'RS-77',
  // CR-719 section 11, JDG-1777: the five refusals a field answers leave by themselves.
  'RS-84', 'RS-85', 'RS-86', 'RS-87', 'RS-88',
] as const
const REPORTED = ['RS-14', 'RS-16', 'RS-50', 'RS-51', 'RS-52', 'RS-60', 'RS-71', 'RS-72', 'RS-73'] as const
const RIDING: Readonly<Record<string, string>> = {
  'RS-7': 'RS-6',
  'RS-9': 'RS-6',
  'RS-12': 'RS-11',
  'RS-13': 'RS-11',
  'RS-42': 'RS-15',
}

// see T-233
/** @purity pure */
function wantedDisplayOf(id: string): ReasonDisplay {
  if ((HIDDEN as readonly string[]).includes(id)) return 'hide'
  if ((TIMED as readonly string[]).includes(id)) return 'autoDismiss'
  if ((REPORTED as readonly string[]).includes(id)) return 'report'
  return 'show'
}

// see T-233
const PRINTED_DISPLAY: Readonly<Record<ReasonDisplay, string>> = {
  show: '出す',
  hide: '出さない',
  autoDismiss: '時間で消す',
  report: '`U-62` に並べる',
}

// see T-234
const PRINTED_ASKING: Readonly<Record<QuestionDisplay, string>> = {
  ask: '問う',
  askOnlyWithUnsavedEdits: '保存していない編集があるときだけ問う',
}

/** @purity pure */
function reasonRow(id: string): ReasonEntry {
  const found = ROSTER.reasons.find((one) => one.id === id)
  if (found === undefined) throw new Error(`notice-reasons.json has no reason ${id}`)
  return found
}

const INVARIANT_ROW = /^\| (IV-\d+) \|/

/** @purity semi-pure-b */
function invariantRows(): readonly string[] {
  const lines = readFileSync(join(SPEC, '05-07-design.md'), 'utf8').replace(/\r\n/g, '\n').split('\n')
  const at = lines.findIndex((line) => line.startsWith('**表 T-220 —'))
  const out: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.startsWith('**表 ')) break
    const hit = INVARIANT_ROW.exec(line)
    if (hit !== null) out.push(hit[1] as string)
  }
  return out
}

describe('FR-076: the display column is the one place that decides', () => {
  it('FR-076 reads as CR-712 E-02 and E-06 wrote it', () => {
    expect(REQUIREMENTS).toContain(FR_076_THE_COLUMN_HOLDS_IT)
    expect(REQUIREMENTS).toContain(FR_076_HIDE_IS_CARRIED)
    expect(REQUIREMENTS).toContain(FR_076_NOT_DECIDED_AGAIN)
    expect(REQUIREMENTS).toContain(FR_076_A_NEW_ROW_HAS_WORDS)
    expect(REQUIREMENTS).toContain(FR_076_A_RIDING_ROW_HAS_NONE)
  })
})

describe(`T-233 display column -- ${FR_076_THE_COLUMN_HOLDS_IT}`, () => {
  it('the manuscript holds 83 reasons: show 34 (5 riding), autoDismiss 19, hide 21, report 9', () => {
    const count = (display: ReasonDisplay): number => ROSTER.reasons.filter((one) => one.display === display).length
    expect(ROSTER.reasons).toHaveLength(83)
    expect(count('show')).toBe(34)
    expect(count('autoDismiss')).toBe(19)
    expect(count('hide')).toBe(21)
    expect(count('report')).toBe(9)
    expect(ROSTER.reasons.filter((one) => one.wordsOf !== undefined)).toHaveLength(5)
  })

  it('every reason has the display the review decided for it', () => {
    const wanted: Record<string, ReasonDisplay> = {}
    const got: Record<string, ReasonDisplay> = {}
    for (const one of ROSTER.reasons) {
      wanted[one.id] = wantedDisplayOf(one.id)
      got[one.id] = one.display
    }
    expect(got).toEqual(wanted)
  })

  it('the five riding rows take the words of their head, and only they ride', () => {
    const riding: Record<string, string> = {}
    for (const one of ROSTER.reasons) if (one.wordsOf !== undefined) riding[one.id] = one.wordsOf
    expect(riding).toEqual(RIDING)
    for (const [rider, head] of Object.entries(RIDING)) {
      expect(reasonRow(rider).display, `${rider} shows as ${head} does`).toBe(reasonRow(head).display)
      expect(reasonRow(rider).manner, `${rider} has the manner of ${head}`).toBe(reasonRow(head).manner)
    }
  })

  it('RS-77 is the new EX-3 row: NT-5, autoDismiss, sourced from EX-3', () => {
    const row = reasonRow('RS-77')
    expect(row.scene.ja).toContain('工数を持つ文書を `MSPDI` へ書き出し、工数を書き換えなかった')
    expect(row.manner).toBe('NT-5')
    expect(row.source.ja).toBe('表 T-033 の `EX-3`')
    expect(row.display).toBe('autoDismiss')
  })

  it('RS-69 says what its words say, and the long-vowel slip is gone', () => {
    const row = reasonRow('RS-69')
    expect(row.scene.ja).toContain('マイルストーンは期間を持たないので、親タスクにはできない')
    expect(row.scene.ja).not.toContain('開始ー終了')
  })

  it('table T-033 EX-3 names RS-77, once after the export', () => {
    const ex3 = specTable('T-033').rows.find((one) => one.id === 'EX-3')
    expect(ex3, 'table T-033 has EX-3').toBeDefined()
    expect((ex3?.cells ?? []).join(' ')).toContain('（表 T-233 の `RS-77`、書き出しの後に 1 回）')
  })

  it('a refusal of the import check rides as the manuscript says: T-220, NT-1, show, IV-17 on RS-21', () => {
    expect(ROSTER.invariantRefusals.table).toBe('T-220')
    expect(ROSTER.invariantRefusals.manner).toBe('NT-1')
    expect(ROSTER.invariantRefusals.display).toBe('show')
    expect(ROSTER.invariantRefusals.wordsOf).toEqual({ 'IV-17': 'RS-21' })
  })
})

describe('the printed tables carry the display column', () => {
  it('table T-233 prints its display and its riding for every row, in the manuscript order', () => {
    const table = specTable('T-233')
    expect(table.headings).toEqual(['行 ID', '場面', '作法', '表示の仕方', 'まとめ方', '正'])
    expect(table.rows.map((row) => row.id)).toEqual(ROSTER.reasons.map((one) => one.id))
    for (const one of ROSTER.reasons) {
      const row = table.rows.find((printed) => printed.id === one.id)
      expect(row?.by['表示の仕方'], `${one.id} prints its display`).toBe(PRINTED_DISPLAY[one.display])
      const riding = one.wordsOf === undefined ? '—' : `語は \`${one.wordsOf}\``
      expect(row?.by['まとめ方'], `${one.id} prints whose words it takes`).toBe(riding)
    }
  })

  it('table T-234 prints whether each question is asked', () => {
    const table = specTable('T-234')
    expect(table.headings).toContain('問うか')
    for (const one of ROSTER.questions) {
      const row = table.rows.find((printed) => printed.id === one.id)
      expect(row?.by['問うか'], `${one.id} prints whether it asks`).toBe(PRINTED_ASKING[one.display])
    }
  })
})

describe('the generated rosters src reads are the manuscript (PI-39)', () => {
  it('NOTICE_DISPLAY_OF_REASON gives every reason its column, and every T-220 row the refusal display', () => {
    const wanted: Record<string, ReasonDisplay> = {}
    for (const one of ROSTER.reasons) wanted[one.id] = one.display
    for (const row of invariantRows()) wanted[row] = ROSTER.invariantRefusals.display
    expect({ ...NOTICE_DISPLAY_OF_REASON }).toEqual(wanted)
  })

  it('QUESTION_DISPLAY_OF_ROW gives every T-234 row its column: ask 9, askOnlyWithUnsavedEdits 1 (QN-5)', () => {
    const wanted: Record<string, QuestionDisplay> = {}
    for (const one of ROSTER.questions) wanted[one.id] = one.display
    expect({ ...QUESTION_DISPLAY_OF_ROW }).toEqual(wanted)
    expect(ROSTER.questions).toHaveLength(10)
    expect(ROSTER.questions.filter((one) => one.display === 'ask')).toHaveLength(9)
    expect(QUESTION_DISPLAY_OF_ROW['QN-5']).toBe('askOnlyWithUnsavedEdits')
  })

  // WHY: the applied PI-39 lists NOTICE_DISPLAY_OF_REASON only; QUESTION_DISPLAY_OF_ROW is read inside the use case (file-flow-values.ts), not by the shell.
  it('PI-39 publishes NOTICE_DISPLAY_OF_REASON', () => {
    const pi39 = PUBLISHED.split('\n').find((line) => line.startsWith('| PI-39 |')) ?? ''
    expect(pi39).toContain('`NOTICE_DISPLAY_OF_REASON`')
  })
})

describe(`the dictionary follows the riding -- ${FR_076_A_RIDING_ROW_HAS_NONE}`, () => {
  it('a riding row has no entry in reasons, and every other row of T-233 has one (78)', () => {
    const entries = WORDS.reasons.map((one) => one.rowId)
    for (const rider of Object.keys(RIDING)) expect(entries, `${rider} rides and has no words of its own`).not.toContain(rider)
    const owners = ROSTER.reasons.filter((one) => one.wordsOf === undefined).map((one) => one.id)
    expect([...entries].sort()).toEqual([...owners].sort())
    expect(entries).toHaveLength(78)
  })

  it('a hidden row keeps its words (JDG-1759)', () => {
    const entries = WORDS.reasons.map((one) => one.rowId)
    for (const id of HIDDEN) expect(entries, `${id} keeps its words`).toContain(id)
  })

  it('invariants holds 21 rows with words in both languages, and IV-17 rides on RS-21', () => {
    const entries = WORDS.invariants.map((one) => one.rowId)
    expect(entries).not.toContain('IV-17')
    expect(entries).toHaveLength(21)
    for (const one of WORDS.invariants) {
      expect(one.text.ja, `${one.rowId} text ja`).not.toBe('')
      expect(one.text.en, `${one.rowId} text en`).not.toBe('')
      expect(one.nextStep?.ja ?? '', `${one.rowId} nextStep ja`).not.toBe('')
      expect(one.nextStep?.en ?? '', `${one.rowId} nextStep en`).not.toBe('')
    }
  })
})

// CR-788 (spec-only): AS-13 -- the first seated assignment is the primary; the order is kept by every write and by MSPDI.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import { ASSIGNEE_LIST_SEPARATOR, type FieldCommit } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { MORE_ASSIGNEES_MARK, labeledAssigneeUidOf } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { commandsOf, documentOf, fieldOf, panelOf, personOf, REQUIREMENTS, seatOf, taskItem, taskOf } from './cr-606-stage'
import { bare, specTable } from './spec-table'

// see AS-13
const AS_13_PRIMARY =
  '⭐ そのタスクの割当（`Assignment`）を文書の割当の並びの順に読み、先頭の割当の担当を主担当とすること（MUST）'
const AS_13_NO_COLUMN = '主担当のための列は作らない —— 並びが印である。'
const AS_13_ORDER_KEPT =
  '⛔ 割当を就けるときは並びの末尾に足し、解くときは並びから除くだけとし、残る割当の順を変えてはならない（MUST NOT）'
const AS_13_REPLACE_PRIMARY = '主担当を替えるときは、`IC-126` で全員のチェックを外し、新しい主担当から付け直す（利用者の判断）。'
const AS_13_MSPDI = '⭐ MSPDI へは割当を並びの順に書き、読むときは書かれた順を並びとすること（MUST）'
const AS_13_LABEL = '担当ラベル（`FR-059`）は、並びで先頭の、ラベルに出せる担当の名を出す'
// see AS-12, AS-3, AS-1, AS-5
const AS_12_AT_THE_TAIL = '⭐ 就けた割当は、そのタスクの割当の並びの末尾に入る（`AS-13`） —— 先に就いていた人の順も主担当も変わらない'
const AS_3_ONLY_THAT_ONE = '⭐ 解くのはチェックを外した担当の割当だけであり、ほかの割当を解いてはならない（MUST NOT）。'
const AS_1_FILTER = '押したときは、その欄の一覧を開き、一覧の上の絞り込みの欄に焦点を置くこと（MUST）'
const AS_5_ENTER =
  '⭐ 絞り込みの欄で `Enter` を押したときは、打った字と等しい名の担当（同じ名が 2 つ以上なら `AS-8`）が就いていなければ就け、等しい名の担当がいなければ何も書かないこと（MUST）'
const AS_5_TYPING_KEEPS_CHECKS = '⛔ 打った字でチェックを変えてはならない（MUST NOT）'
const AS_5_ALL_AND_NONE =
  '⭐ `IC-125` は一覧にいま出ている担当のうち就いていない人を一覧の順に就け、`IC-126` は一覧にいま出ている担当のうち就いている人を解き、どちらも 1 回の書き込みとすること（MUST）'
const AS_5_UNLISTED_KEPT = '一覧に出ていない担当のチェックは変えない'
const AS_5_HEIGHT = '⭐ 一覧の高さはタイムゾーンの一覧（`FR-156`）と同じ —— 2 行の選択肢 `_assets/tbl-settings.md` の 表 T-206 の `S-607` 個ぶん —— とし、入らない担当は一覧の中で縦に送る。'
const AS_5_STAYS_OPEN = '書いた後も一覧は開いたままとし、打った字も残す'
// see DFC-3100
const AS_5_FILTER_TAKES_ITS_KEYS =
  '⭐ 絞り込みの欄は文字入力の欄であり、焦点があるあいだに打ったキーは欄が取ること（MUST） —— 単独のキーの割当（表 T-036）も `Backspace` の削除（`SK-3`）も働かない。'
// see T-225, FR-059, TL-7
const T_225_ONE_CALL =
  '`AS-5` の `IC-125` と `IC-126` は、一覧に出ている人の数だけの `CM-44` か `CM-45` を 1 回の呼び出しで走らせること（MUST）。'
const FR_059_MARK =
  '複数が割り当てられているときは、**主担当の名に、半角コンマ・半角空白・三点リーダーの印「, …」を続けて**示すこと（利用者の判断）'
const FR_059_NO_COUNT = '残りの人数は出さない'
const TL_7_ORDER = '割当の並びの順（主担当が先頭、`FR-008` の 表 T-225 の `AS-13`）に、`,` と半角空白 1 つで繋いだものとする'

// see IN-5a, IN-6, DFC-3102, DFC-3103
const IN_5A_SHIFTED =
  '⭐ `Shift` だけを添えて打つ 1 字（大文字、`+`・`_` など）も単文字キーに数えること（MUST） —— 鍵盤によって `+` は `Shift` を要し、数えないと `SK-16`・`SK-16b` に取られて欄に届かない。'
const IN_6_KEYED_DATE =
  '⭐ 日付・日時の欄に鍵盤で打っているあいだは、打っている途中の値を書かず、`Enter`・欄の外の押下・焦点が欄を離れたときに確定すること（MUST）'
const IN_6_CALENDAR = '宿主のカレンダーで選んだ日付は、選んだときに確定する —— 選んだ値は途中の値ではない。'

describe('DFC-3102 / DFC-3103 -- the key clauses tests/unit/dfc-3102-dfc-3103 presses', () => {
  it.each([
    ['IN-5a (MUST) -- a Shift-only character is a single key', IN_5A_SHIFTED],
    ['IN-6 (MUST) -- a keyed date settles on Enter, a press outside or the focus leaving', IN_6_KEYED_DATE],
    ['IN-6 -- a calendar pick settles at once', IN_6_CALENDAR],
  ])('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('CR-788 -- the manuscript these cases are driven by', () => {
  it.each([
    ['AS-13 (MUST) -- the primary is the first assignment', AS_13_PRIMARY],
    ['AS-13 -- no column for the primary', AS_13_NO_COLUMN],
    ['AS-13 (MUST NOT) -- the order is never rearranged', AS_13_ORDER_KEPT],
    ['AS-13 -- replacing the primary', AS_13_REPLACE_PRIMARY],
    ['AS-13 (MUST) -- MSPDI keeps the order', AS_13_MSPDI],
    ['AS-13 -- the label names the first labelable person', AS_13_LABEL],
    ['AS-12 -- a new seat goes to the tail', AS_12_AT_THE_TAIL],
    ['AS-3 (MUST NOT) -- only the unchecked person is released', AS_3_ONLY_THAT_ONE],
    ['AS-1 (MUST) -- the list opens with the focus in its filter', AS_1_FILTER],
    ['AS-5 (MUST) -- Enter in the filter', AS_5_ENTER],
    ['AS-5 (MUST NOT) -- typing never changes a check', AS_5_TYPING_KEEPS_CHECKS],
    ['AS-5 (MUST) -- IC-125 / IC-126 are one write each', AS_5_ALL_AND_NONE],
    ['AS-5 -- unlisted people keep their checks', AS_5_UNLISTED_KEPT],
    ['AS-5 -- the list height is S-607 choices', AS_5_HEIGHT],
    ['AS-5 -- the list stays open after a write', AS_5_STAYS_OPEN],
    ['AS-5 (MUST) -- the filter takes its own keys (DFC-3100)', AS_5_FILTER_TAKES_ITS_KEYS],
    ['T-225 (MUST) -- IC-125 / IC-126 run in one call', T_225_ONE_CALL],
    ['FR-059 -- the primary and the mark', FR_059_MARK],
    ['FR-059 -- no count of the others', FR_059_NO_COUNT],
    ['TL-7 -- the assignment order', TL_7_ORDER],
  ])('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-225 holds AS-13 as its last row', () => {
    expect(specTable('T-225').rows.map((one) => one.id).at(-1)).toBe('AS-13')
  })

  it('T-206 S-607 states a whole count of choices', () => {
    const cell = bare(specTable('T-206').rows.find((one) => one.id === 'S-607')?.by['既定'] ?? '')
    expect(Number.isInteger(Number(/\d+/.exec(cell)?.[0]))).toBe(true)
  })
})

// see T-109, IC-123, IC-124, IC-125, IC-126
describe('T-109 -- IC-123..IC-126 stand on the Properties Panel too, in the assignee list', () => {
  const rowOf = (id: string) => {
    const found = specTable('T-109').rows.find((one) => one.id === id)
    if (found === undefined) throw new Error(`table T-109 has no row ${id}`)
    return found
  }

  it.each(['IC-123', 'IC-124', 'IC-125', 'IC-126'])('%s names Properties Panel among its surfaces and points at FR-008', (id) => {
    expect(rowOf(id).by['面'] ?? '').toContain('Properties Panel')
    expect(rowOf(id).by['正'] ?? '').toContain('FR-008')
  })

  it.each([
    ['IC-123', '担当の欄の一覧を名の昇順に並べる'],
    ['IC-124', '担当の欄の一覧を名の降順に並べる'],
    ['IC-125', '担当の欄の一覧に出ている、就いていない担当をすべて就ける'],
    ['IC-126', '担当の欄の一覧に出ている、就いている担当をすべて外す'],
  ])('%s says what it does in the assignee list', (id, words) => {
    expect(rowOf(id).cells.join(' ')).toContain(words)
  })
})

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const ASSIGNEE_ROW = 'PR-16'
const ALPHA = { uid: 1, name: 'Alpha' }
const BRAVO = { uid: 2, name: 'Bravo' }
const CHARLIE = { uid: 3, name: 'Charlie' }
const DELTA = { uid: 4, name: 'Delta' }
const ROSTER = [ALPHA, BRAVO, CHARLIE, DELTA]
const TASK = 20

const startOf = (): Document =>
  documentOf({
    tasks: [taskOf(TASK)],
    resources: ROSTER.map((one) => personOf(one.uid, one.name)),
    assignments: [seatOf(30, TASK, BRAVO.uid)],
  })

/** @purity pure */
function applied(document: Document, commands: readonly DocumentCommand[]): Document {
  let at = document
  for (const command of commands) {
    const result = editDocument(at, command, LIMITS, 'row')
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    at = result.document
  }
  return at
}

const commit = (resourceUid: number | null, text: string, pick?: FieldCommit['pick']): FieldCommit => ({
  row: ASSIGNEE_ROW,
  key: { holder: 'assignment', taskUid: TASK, resourceUid, column: 'resourceUid' },
  text,
  ...(pick === undefined ? {} : { pick }),
})

const checked = (document: Document, uid: number): Document => applied(document, commandsOf(document, commit(null, String(uid), 'candidate')))
const unchecked = (document: Document, uid: number): Document => applied(document, commandsOf(document, commit(uid, '-')))
const listed = (...people: readonly { readonly uid: number }[]): string => people.map((one) => String(one.uid)).join(ASSIGNEE_LIST_SEPARATOR)

const orderOf = (document: Document): readonly number[] =>
  document.schedule.assignments.filter((one) => one.taskUid === TASK).map((one) => one.resourceUid as number)

const fieldWordOf = (document: Document): string => fieldOf(panelOf(document, taskItem(TASK)), ASSIGNEE_ROW).controls[0]?.assignee?.fieldWord ?? ''

describe(`AS-13 -- ${AS_13_ORDER_KEPT}`, () => {
  it('AS-12 / AS-13: checking adds at the tail; the primary stays the first', () => {
    const once = checked(startOf(), CHARLIE.uid)
    expect(orderOf(once)).toEqual([BRAVO.uid, CHARLIE.uid])
    const twice = checked(once, ALPHA.uid)
    expect(orderOf(twice)).toEqual([BRAVO.uid, CHARLIE.uid, ALPHA.uid])
    expect(fieldWordOf(twice)).toBe(`Bravo${MORE_ASSIGNEES_MARK}`)
    expect(labeledAssigneeUidOf(twice.schedule, TASK)).toBe(BRAVO.uid)
  })

  it('AS-3 / AS-13: unchecking removes that person only and keeps the rest in their order', () => {
    const three = checked(checked(startOf(), CHARLIE.uid), ALPHA.uid)
    const middleOut = unchecked(three, CHARLIE.uid)
    expect(orderOf(middleOut)).toEqual([BRAVO.uid, ALPHA.uid])
    const primaryOut = unchecked(three, BRAVO.uid)
    expect(orderOf(primaryOut)).toEqual([CHARLIE.uid, ALPHA.uid])
    expect(fieldWordOf(primaryOut)).toBe(`Charlie${MORE_ASSIGNEES_MARK}`)
  })

  it(`AS-13: ${AS_13_REPLACE_PRIMARY}`, () => {
    const three = checked(checked(startOf(), CHARLIE.uid), ALPHA.uid)
    const cleared = applied(three, commandsOf(three, commit(null, listed(ALPHA, BRAVO, CHARLIE, DELTA), 'none')))
    expect(orderOf(cleared)).toEqual([])
    expect(fieldWordOf(cleared)).toBe('')
    const fresh = checked(checked(cleared, DELTA.uid), BRAVO.uid)
    expect(orderOf(fresh)).toEqual([DELTA.uid, BRAVO.uid])
    expect(fieldWordOf(fresh)).toBe(`Delta${MORE_ASSIGNEES_MARK}`)
  })

  it('AS-5 / T-225: IC-125 seats the listed unseated people at the tail in the list order, in one bundle', () => {
    const start = startOf()
    const commands = commandsOf(start, commit(null, listed(ALPHA, BRAVO, CHARLIE), 'all'))
    expect(commands.map((one) => (one as unknown as Record<string, unknown>)['kind'])).toEqual(['createAssignment', 'createAssignment'])
    expect(orderOf(applied(start, commands))).toEqual([BRAVO.uid, ALPHA.uid, CHARLIE.uid])
  })

  it('AS-5: IC-126 listing part of the seated people leaves the unlisted one seated', () => {
    const three = checked(checked(startOf(), CHARLIE.uid), ALPHA.uid)
    const after = applied(three, commandsOf(three, commit(null, listed(ALPHA, CHARLIE), 'none')))
    expect(orderOf(after)).toEqual([BRAVO.uid])
  })
})

// see AS-13
// WHY: the startup template read as the GRS document an MSPDI write starts from (cr-429 does the same, without its XSD).
function currentDocument(): Document {
  const parsed = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as { schedule: { project: Record<string, unknown> } }
  parsed.schedule.project['sourceFormat'] ??= 'grs'
  const read = documentFromJson(JSON.stringify(parsed))
  if (!read.ok) throw new Error('the bundled template was refused')
  return read.document
}

describe(`AS-13 -- ${AS_13_MSPDI}`, () => {
  const LAST_SAVED = '2026-10-17T00:00:00'

  /** @purity pure */
  function withOrder(document: Document, taskUid: number, people: readonly number[]): Document {
    const others = document.schedule.assignments.filter((one) => one.taskUid !== taskUid)
    const mark = document.schedule.project.uidHighWaterMark
    // WHY: the first seat takes the higher uid, so the written order differs from the uid order.
    const seats = people.map((resourceUid, at) => ({ uid: mark + people.length - at, taskUid, resourceUid, carry: {}, carryElements: [] }))
    return {
      ...document,
      schedule: {
        ...document.schedule,
        project: { ...document.schedule.project, uidHighWaterMark: mark + people.length },
        assignments: [...others, ...seats],
      },
    } as unknown as Document
  }

  it('a task whose seats are written high uid first reads back in the same order, so the primary does not move', () => {
    const base = currentDocument()
    const people = base.schedule.resources.slice(0, 3).map((one) => one.uid)
    expect(people, 'premise: the startup document holds three resources').toHaveLength(3)
    const taskUid = base.schedule.tasks[0]?.uid as number
    const ordered = withOrder(base, taskUid, [people[2] as number, people[0] as number, people[1] as number])
    const text = mspdiFromDocument(ordered, LAST_SAVED).text
    const read = documentFromMspdi(text, base)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const back = read.document.schedule.assignments.filter((one) => one.taskUid === taskUid).map((one) => one.resourceUid)
    expect(back).toEqual([people[2], people[0], people[1]])
  })
})

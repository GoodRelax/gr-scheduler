// Contract test: FR-151 table T-330 SV-4 / SV-8 and table T-331 against searchRowsOf, isSearchWordFound and rowNameOf (PI-1).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  planActualState,
  rowNameOf,
  searchRowsOf,
  type CommentBoxSearchRow,
  type Schedule,
  type TaskSearchRow,
} from '../../src/entity/document-model/schedule/schedule'
import { isSearchWordFound } from '../../src/entity/document-model/schedule/schedule-search'
import { specTable, unbroken, type SpecRow } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const FR_151_STATEMENT =
  '作成者が語を打ったとき、`GRS` は、名前・担当者名・コメントボックスの本文にその語を含むタスクとコメントボックスを検索パネル（`_assets/tbl-glossary.md` の `U-64`）の表に並べ'
const FR_151_NOT_NOTES_NOR_ROW_NAMES =
  '⛔ 探すものに `Task.notes`（`_assets/fig-erd-detail.md` の `AT-32`）と行の名前（`AT-53`）を含めてはならない（MUST NOT） —— 行の名前は 表 T-331 の `SQ-6` の絞り込みで届く。'

const SV_4 = cellOf('T-330', 'SV-4', '定め')
const SV_4_WHERE =
  '語が、タスクの表では名前（`SQ-1`）か担当者名のどれか 1 つ（`SQ-2`）、コメントボックスの表では本文（`SQ-7`）の一部と一致する行を載せる。'
const SV_4_FOLD = '比べる前に両方を `NFKC` で正規化し、大文字と小文字を畳む —— 全角と半角、大文字と小文字を区別しない。'
const SV_4_KANA =
  'ひらがなとカタカナは区別する（例: 語「ｐｍ」は「PM レビュー」に当たり、語「れびゅー」は「レビュー」に当たらない）。'
const SV_4_EMPTY_WORD = '語が空のときはすべての行を載せる。'
const SV_4_EMPTY_NAME = '名前が空のタスクも表に載るが、名前の側では空でない語に当たらない'

const SV_8 = cellOf('T-330', 'SV-8', '定め')
const SV_8_DEFAULT_ORDER =
  '既定の並びは、行の木の上からの並び → `SQ-3`（コメントボックスは `SQ-9`）→ `Task.uid`（コメントボックスは `id`）'

const SQ_1_NO_NAME_WORD = 'この語は `SV-4` の一致に使わない'
const SQ_2_ORDER = '割当の並びのまま'
const SQ_4_MILESTONE = 'マイルストーン（`AT-30`）は `AT-28` と同じ日'
const SQ_6_TOP_FIRST = '最上位から順に'

// see T-331
// WHY: the seam (CR-571 section 5) gives each column of table T-331 one field; this copy
// is checked against the table below, so a row added to T-331 fails here first.
const T_331_FIELDS: Readonly<Record<string, { readonly table: 'タスク' | 'コメントボックス'; readonly field: string }>> = {
  'SQ-5': { table: 'タスク', field: 'planActualState' },
  'SQ-11': { table: 'タスク', field: 'percentComplete' },
  'SQ-1': { table: 'タスク', field: 'name' },
  'SQ-2': { table: 'タスク', field: 'assigneeNames' },
  'SQ-3': { table: 'タスク', field: 'plannedStart' },
  'SQ-4': { table: 'タスク', field: 'plannedFinish' },
  'SQ-12': { table: 'タスク', field: 'actualStart' },
  'SQ-13': { table: 'タスク', field: 'actualFinish' },
  'SQ-6': { table: 'タスク', field: 'rowPath' },
  'SQ-7': { table: 'コメントボックス', field: 'text' },
  'SQ-8': { table: 'コメントボックス', field: 'rowName' },
  'SQ-9': { table: 'コメントボックス', field: 'anchorDate' },
}

// WHY: every task and every comment box sits on a row: SV-8 does not say where a hit with
// no row goes, so this file never makes one.

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Record<string, unknown> }
type Loose = Record<string, unknown>
const templateTasks = TEMPLATE.schedule['tasks'] as readonly Loose[]
const templateGroups = TEMPLATE.schedule['taskGroups'] as readonly Loose[]
const templateResources = TEMPLATE.schedule['resources'] as readonly Loose[]
const templateAssignments = TEMPLATE.schedule['assignments'] as readonly Loose[]

const R1 = 'row-1'
const R11 = 'row-1-1'
const R12 = 'row-1-2'
const R2 = 'row-2'

const group = (id: string, parentId: string | null, order: number, label: string | null, derivedFromTaskUid: number | null): Loose => ({
  ...(templateGroups[0] as Loose),
  id,
  parentId,
  order,
  label,
  derivedFromTaskUid,
  treeState: 'auto',
})

const task = (uid: number, name: string | null, start: string, finish: string, extra: Loose = {}): Loose => ({
  ...(templateTasks[0] as Loose),
  uid,
  wbsParentUid: null,
  wbsOrder: uid,
  name,
  start,
  finish,
  milestone: false,
  notes: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  dependencies: [],
  ...extra,
})

const resource = (uid: number, name: string): Loose => ({ ...(templateResources[0] as Loose), uid, name })
const assignment = (uid: number, taskUid: number, resourceUid: number): Loose => ({
  ...(templateAssignments[0] as Loose),
  uid,
  taskUid,
  resourceUid,
})

const commentBox = (id: string, text: string, anchorGroupId: string, anchorDate: string | null): Loose => ({
  id,
  leaderShapeKind: null,
  text,
  anchorDate,
  anchorGroupId,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
})

const D = (day: string): string => `${day}T00:00:00`

// WHY: R12 comes before R11 in the array but after it by AT-55 order, so array order cannot pass for tree order.
const GROUPS = [
  group(R1, null, 0, '1. Programme', null),
  group(R12, R1, 1, null, 203),
  group(R11, R1, 0, '1.5 Steering', null),
  group(R2, null, 1, '2. Review Delivery', null),
]

const TASKS = [
  task(201, 'PM レビュー', D('2026-05-01'), D('2026-05-10'), { actualStart: D('2026-05-01') }),
  task(202, null, D('2026-04-01'), D('2026-04-03')),
  task(203, 'Design', D('2026-04-01'), D('2026-04-20')),
  task(204, 'Kick-off', D('2026-04-15'), D('2026-04-16'), { milestone: true }),
  task(205, 'Budget', D('2026-04-10'), D('2026-04-12'), { notes: 'PM review of the steering budget' }),
  task(206, 'Scope', D('2026-04-05'), D('2026-04-06'), { actualStart: D('2026-04-05'), actualFinish: D('2026-04-06') }),
  task(207, 'Charter', D('2026-05-01'), D('2026-05-02')),
]

const MEMBERS = [
  { taskUid: 201, groupId: R11 },
  { taskUid: 202, groupId: R2 },
  { taskUid: 203, groupId: R12 },
  { taskUid: 204, groupId: R2 },
  { taskUid: 205, groupId: R1 },
  { taskUid: 206, groupId: R1 },
  { taskUid: 207, groupId: R11 },
]

// WHY: resource 302 is assigned before 301, the reverse of both uid and reading order, so
// SQ-2's assignment order is the only rule that gives it.
const RESOURCES = [resource(301, '山下 亜紀'), resource(302, '伊藤 直子'), resource(303, 'PMO 佐藤')]
const ASSIGNMENTS = [assignment(402, 201, 302), assignment(401, 201, 301), assignment(403, 203, 303)]

const COMMENT_BOXES = [
  commentBox('c-1', 'PM note', R11, D('2026-05-02')),
  commentBox('c-2', 'other', R2, D('2026-04-01')),
  commentBox('c-3', 'pm again', R1, D('2026-04-20')),
  commentBox('c-4', 'kickoff memo', R11, D('2026-04-01')),
]

const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: TASKS,
  taskGroups: GROUPS,
  taskGroupMembers: MEMBERS,
  resources: RESOURCES,
  assignments: ASSIGNMENTS,
  commentBoxes: COMMENT_BOXES,
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const uidsOf = (rows: readonly TaskSearchRow[]): readonly number[] => rows.map((row) => Number(row.taskUid))
const idsOf = (rows: readonly CommentBoxSearchRow[]): readonly string[] => rows.map((row) => String(row.commentBoxId))
const taskRowOf = (uid: number): TaskSearchRow => {
  const found = searchRowsOf(SCHEDULE, '').taskRows.find((row) => Number(row.taskUid) === uid)
  if (found === undefined) throw new Error(`no task row for ${uid}`)
  return found
}
const taskOf = (uid: number): Loose => TASKS.find((one) => one['uid'] === uid) as Loose

describe('FR-151 -- the clauses these cases are driven by', () => {
  it('the requirement and its MUST NOT still read this way', () => {
    expect(REQUIREMENTS).toContain(FR_151_STATEMENT)
    expect(REQUIREMENTS).toContain(FR_151_NOT_NOTES_NOR_ROW_NAMES)
  })

  it('table T-330 SV-4 and SV-8 still read this way', () => {
    for (const clause of [SV_4_WHERE, SV_4_FOLD, SV_4_KANA, SV_4_EMPTY_WORD, SV_4_EMPTY_NAME]) expect(SV_4).toContain(clause)
    expect(SV_8).toContain(SV_8_DEFAULT_ORDER)
  })

  it('table T-331 holds SQ-1..SQ-9, each on the table the seam gives it a field on', () => {
    const all = specTable('T-331').rows
    expect(all[0]?.id).toBe('SQ-10')
    expect(cellOf('T-331', 'SQ-10', '値')).toContain('`TV-2` の集合')
    const rows = all.filter((row) => row.id !== 'SQ-10')
    expect(rows.map((row) => row.id)).toEqual(Object.keys(T_331_FIELDS))
    for (const row of rows) expect(unbroken(row.by['表'] ?? ''), row.id).toBe(T_331_FIELDS[row.id]?.table)
    expect(cellOf('T-331', 'SQ-1', '書き方')).toContain(SQ_1_NO_NAME_WORD)
    expect(cellOf('T-331', 'SQ-2', '書き方')).toContain(SQ_2_ORDER)
    expect(cellOf('T-331', 'SQ-4', '値')).toContain(SQ_4_MILESTONE)
    expect(cellOf('T-331', 'SQ-6', '書き方')).toContain(SQ_6_TOP_FIRST)
  })
})

describe(`T-330 SV-4 -- ${SV_4_EMPTY_WORD} / T-330 SV-8 -- ${SV_8_DEFAULT_ORDER}`, () => {
  it('the empty word lists every task and every comment box, in the default order', () => {
    const rows = searchRowsOf(SCHEDULE, '')
    // STEP: tree order R1, R11, R12, R2; inside a row SQ-3, then Task.uid
    expect(uidsOf(rows.taskRows)).toEqual([206, 205, 201, 207, 203, 202, 204])
    // STEP: tree order R1, R11, R2; inside a row SQ-9, then id
    expect(idsOf(rows.commentBoxRows)).toEqual(['c-3', 'c-4', 'c-1', 'c-2'])
  })

  it('a hit list keeps the default order too', () => {
    const rows = searchRowsOf(SCHEDULE, 'e')
    const everything = uidsOf(searchRowsOf(SCHEDULE, '').taskRows)
    const hits = uidsOf(rows.taskRows)
    expect(hits.length).toBeGreaterThan(1)
    expect(hits).toEqual(everything.filter((uid) => hits.includes(uid)))
  })
})

describe(`T-330 SV-4 -- ${SV_4_WHERE}`, () => {
  it('a name hits (SQ-1), and so does any ONE of the assignee names (SQ-2)', () => {
    expect(uidsOf(searchRowsOf(SCHEDULE, 'Design').taskRows)).toEqual([203])
    expect(uidsOf(searchRowsOf(SCHEDULE, '伊藤').taskRows)).toEqual([201])
    expect(uidsOf(searchRowsOf(SCHEDULE, '山下').taskRows)).toEqual([201])
    expect(uidsOf(searchRowsOf(SCHEDULE, '佐藤').taskRows)).toEqual([203])
  })

  it('a part of the text hits, not only the whole', () => {
    expect(uidsOf(searchRowsOf(SCHEDULE, 'esig').taskRows)).toEqual([203])
    expect(idsOf(searchRowsOf(SCHEDULE, 'memo').commentBoxRows)).toEqual(['c-4'])
  })

  it('a comment box hits on its text (SQ-7), and a task never does on a comment word', () => {
    const rows = searchRowsOf(SCHEDULE, 'again')
    expect(idsOf(rows.commentBoxRows)).toEqual(['c-3'])
    expect(rows.taskRows).toEqual([])
  })

  it(FR_151_NOT_NOTES_NOR_ROW_NAMES, () => {
    // STEP: 205's notes say "steering budget" and "review"; R11 is "1.5 Steering", R2 "2. Review Delivery"
    expect(uidsOf(searchRowsOf(SCHEDULE, 'steering').taskRows)).toEqual([])
    expect(idsOf(searchRowsOf(SCHEDULE, 'steering').commentBoxRows)).toEqual([])
    expect(uidsOf(searchRowsOf(SCHEDULE, 'review').taskRows)).toEqual([])
    expect(uidsOf(searchRowsOf(SCHEDULE, 'Programme').taskRows)).toEqual([])
  })
})

describe(`T-330 SV-4 -- ${SV_4_FOLD}`, () => {
  it(`${SV_4_KANA} -- through searchRowsOf`, () => {
    // STEP: the example of the row itself, and the comment boxes that say PM
    expect(uidsOf(searchRowsOf(SCHEDULE, 'ｐｍ').taskRows)).toEqual([201, 203])
    expect(idsOf(searchRowsOf(SCHEDULE, 'ｐｍ').commentBoxRows)).toEqual(['c-3', 'c-1'])
    expect(uidsOf(searchRowsOf(SCHEDULE, 'れびゅー').taskRows)).toEqual([])
  })

  it('half-width katakana folds to full width, and case folds both ways', () => {
    expect(uidsOf(searchRowsOf(SCHEDULE, 'ﾚﾋﾞｭｰ').taskRows)).toEqual([201])
    expect(uidsOf(searchRowsOf(SCHEDULE, 'DESIGN').taskRows)).toEqual([203])
    expect(uidsOf(searchRowsOf(SCHEDULE, 'ｄｅｓｉｇｎ').taskRows)).toEqual([203])
  })

  it.each([
    ['PM レビュー', 'ｐｍ', true],
    ['PM レビュー', 'れびゅー', false],
    ['PM レビュー', 'ﾚﾋﾞｭｰ', true],
    ['ＡＢＣ', 'abc', true],
    ['abc', 'ＡＢＣ', true],
    ['レビュー', 'れびゅー', false],
    ['れびゅー', 'レビュー', false],
    ['Design', 'sign', true],
    ['Design', 'signs', false],
    ['anything', '', true],
  ] as const)('isSearchWordFound(%j, %j) is %s', (text, word, expected) => {
    expect(isSearchWordFound(text, word)).toBe(expected)
  })
})

describe(`T-330 SV-4 -- ${SV_4_EMPTY_NAME}`, () => {
  it('the nameless task (it has no assignee either) is listed for the empty word and for no other', () => {
    expect(uidsOf(searchRowsOf(SCHEDULE, '').taskRows)).toContain(202)
    expect(uidsOf(searchRowsOf(SCHEDULE, 'a').taskRows)).not.toContain(202)
  })

  it(`SQ-1: the word shown for no name -- ${SQ_1_NO_NAME_WORD}`, () => {
    expect(uidsOf(searchRowsOf(SCHEDULE, '名前なし').taskRows)).not.toContain(202)
    expect(uidsOf(searchRowsOf(SCHEDULE, '（').taskRows)).not.toContain(202)
  })
})

describe('T-331 -- the value column of each row, on one task and one comment box', () => {
  it('SQ-1 name, SQ-3 Task.start, SQ-4 Task.finish, SQ-5 the T-019a state, and the row the task sits on', () => {
    const row = taskRowOf(201)
    expect(row.name).toBe('PM レビュー')
    expect(row.plannedStart).toBe(taskOf(201)['start'])
    expect(row.plannedFinish).toBe(taskOf(201)['finish'])
    expect(row.planActualState).toBe(planActualState(taskOf(201) as never))
    expect(row.groupId).toBe(R11)
  })

  it(`SQ-2 -- every Resource.name the task's assignments point at, ${SQ_2_ORDER}`, () => {
    expect(taskRowOf(201).assigneeNames).toEqual(['伊藤 直子', '山下 亜紀'])
    expect(taskRowOf(207).assigneeNames).toEqual([])
  })

  it(`SQ-4 -- ${SQ_4_MILESTONE}`, () => {
    expect(taskRowOf(204).plannedFinish).toBe(taskOf(204)['start'])
  })

  it('SQ-5 -- the state table T-019a judges, one per task (not the percentage)', () => {
    for (const uid of [201, 202, 206]) {
      expect(taskRowOf(uid).planActualState, `task ${uid}`).toBe(planActualState(taskOf(uid) as never))
    }
    expect(taskRowOf(206).planActualState).not.toBe(taskRowOf(202).planActualState)
  })

  it(`SQ-6 -- from the row the task sits on up to the top, ${SQ_6_TOP_FIRST}`, () => {
    expect(taskRowOf(201).rowPath).toEqual(['1. Programme', '1.5 Steering'])
    expect(taskRowOf(205).rowPath).toEqual(['1. Programme'])
    expect(taskRowOf(202).rowPath).toEqual(['2. Review Delivery'])
  })

  it('SQ-6 reads a derived row name the way AT-53 / AT-54 give it (the one rowNameOf of PI-1)', () => {
    // STEP: R12 has no label and takes its name from task 203 (AT-54, FR-004 TC-12)
    expect(rowNameOf(SCHEDULE, R12)).toBe('Design')
    expect(rowNameOf(SCHEDULE, R11)).toBe('1.5 Steering')
    expect(taskRowOf(203).rowPath).toEqual(['1. Programme', 'Design'])
  })

  it('SQ-7 text, SQ-8 the name of the AT-114 row, SQ-9 anchorDate, and the row it sits on', () => {
    const rows = searchRowsOf(SCHEDULE, '').commentBoxRows
    const box = rows.find((row) => row.commentBoxId === 'c-3')
    expect(box?.text).toBe('pm again')
    expect(box?.rowName).toBe('1. Programme')
    expect(box?.anchorDate).toBe(D('2026-04-20'))
    expect(box?.groupId).toBe(R1)
    expect(rows.find((row) => row.commentBoxId === 'c-1')?.rowName).toBe('1.5 Steering')
  })
})

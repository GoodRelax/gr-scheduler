// Contract test: FR-151 table T-330 SV-7 / SV-8 and table T-331 against filteredSearchRows and columnValuesOf (UF-181).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { columnValuesOf, filteredSearchRows } from '../../src/adapter/screen-renderer/search-table-filters'
import type {
  SearchColumnFilter,
  SearchPanelSession,
  SearchSort,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type {
  CommentBoxSearchRow,
  PlanActualState,
  SearchRows,
  TaskSearchRow,
} from '../../src/entity/document-model/schedule/schedule'
import { specTable, unbroken, type SpecRow } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

const SV_7 = cellOf('T-330', 'SV-7', '定め')
const SV_7_ITEMS =
  '値の一覧は、担当者名の列では 1 人ずつ、ほかの列ではセルの値ごとに 1 項目、空のセルは「（空白）」の 1 項目。'
const SV_7_DATES = '日付の列は、値の一覧と絞る入力欄の代わりに、操作の段（`IC-123`・`IC-124`）の下で「いつから」「いつまで」を宿主の日付の入力で選ばせる。'
const SV_7_ALL = '列の絞り込みどうし、語と絞り込みは、すべてを満たす行だけを残す。'
const SV_7_ASSIGNEES = '担当者名の列は、担当者のうち 1 人でも表示に入れた値なら残す。'
const SV_7_BLANK_DATES = '日付の列に「いつから」か「いつまで」を置くと、その日付の空の行は外す。'

const SV_8 = cellOf('T-330', 'SV-8', '定め')
const SV_8_ONE = '並べ替える列は 1 つ。'
const SV_8_STATES =
  '状態の列（`SQ-5`）の昇順は ボトルネック → 未着手 → 進行中 → 完了 → 中断・再開予定あり → 中断・再開日未定、降順はその逆'
const SV_8_TIES = '同じ値の行は既定の並びを保ち、空の値は向きによらず末尾。'
const SV_8_DEFAULT =
  '既定の並びは、行の木の上からの並び → `SQ-3`（コメントボックスは `SQ-9`）→ `Task.uid`（コメントボックスは `id`）'

const SQ_6_JOIN = '最上位から順に「 → 」で繋ぐ'

// see T-019a
// WHY: the fixture spells a state as PlanActualState does; the first case pins each spelling to its row's word.
const STATE_WORDS: Readonly<Record<string, readonly [PlanActualState, string]>> = {
  'PS-1': ['notStarted', '未着手'],
  'PS-2': ['finished', '完了'],
  'PS-3': ['suspendedResumeUnknown', '中断・再開日未定'],
  'PS-4': ['suspendedResumePlanned', '中断・再開予定あり'],
  'PS-5': ['inProgress', '進行中'],
}

const D = (day: string): string => `${day}T00:00:00`

const task = (
  taskUid: number,
  name: string,
  assigneeNames: readonly string[],
  plannedStart: string | null,
  planActualState: PlanActualState,
  rowPath: readonly string[],
): TaskSearchRow => ({
  taskUid,
  name,
  assigneeNames,
  plannedStart,
  plannedFinish: plannedStart,
  percentComplete: null,
  actualStart: null,
  actualFinish: null,
  planActualState,
  isBottleneck: false,
  rowPath,
  groupId: `g-${taskUid}`,
})

const box = (commentBoxId: string, text: string, rowName: string, anchorDate: string | null): CommentBoxSearchRow => ({
  commentBoxId,
  text,
  rowName,
  anchorDate,
  groupId: `g-${commentBoxId}`,
})

const P1 = '1. Programme'
const P15 = '1.5 Steering'
const P2 = '2. Review'

// WHY: the seam hands the rows over in SV-8's default order, so this array order IS the default order.
// Uids 2 and 5 share a start day and uids 3 and 6 a blank name, so a tie or a blank that moves is seen.
const ROWS: SearchRows = {
  taskRows: [
    task(1, 'Alpha', ['Ann', 'Bob'], D('2026-04-01'), 'inProgress', [P1, P15]),
    task(2, 'Beta', ['Cid'], D('2026-04-10'), 'notStarted', [P1]),
    task(3, '', [], null, 'finished', [P1, P15]),
    task(4, 'Gamma', ['Bob'], D('2026-04-20'), 'suspendedResumePlanned', [P2]),
    task(5, 'Alpha', ['Ann'], D('2026-04-10'), 'suspendedResumeUnknown', [P2]),
    task(6, '', [], D('2026-04-15'), 'notStarted', [P2]),
  ],
  commentBoxRows: [
    box('c-1', 'PM note', P15, D('2026-05-02')),
    box('c-2', 'other', P2, D('2026-04-01')),
    box('c-3', 'memo', P15, null),
  ],
}

type Filters = SearchPanelSession['filters']

const NO_FILTERS: Filters = { columns: [], open: null }

const hiding = (column: string, hiddenValues: readonly string[]): SearchColumnFilter => ({
  column,
  hiddenValues,
  from: null,
  to: null,
})

const between = (column: string, from: string | null, to: string | null): SearchColumnFilter => ({
  column,
  hiddenValues: [],
  from,
  to,
})

const filtersOf = (...columns: readonly SearchColumnFilter[]): Filters => ({ columns, open: null })

const uidsOf = (rows: SearchRows): readonly number[] => rows.taskRows.map((row) => row.taskUid)
const idsOf = (rows: SearchRows): readonly string[] => rows.commentBoxRows.map((row) => row.commentBoxId)

const ALL_UIDS = [1, 2, 3, 4, 5, 6]
const ALL_IDS = ['c-1', 'c-2', 'c-3']

// WHY: SV-7 prints the blank item as a word of the dictionary, so its stored value is found, not typed.
const blankItemOf = (column: string, nonBlank: readonly string[]): string => {
  const others = columnValuesOf(ROWS, column).filter((value) => !nonBlank.includes(value))
  expect(others, `${column} offers exactly one item besides its non-blank values`).toHaveLength(1)
  return others[0] as string
}

const sorted = (column: string, direction: SearchSort['direction']): SearchRows =>
  filteredSearchRows(ROWS, NO_FILTERS, { column, direction })

describe('FR-151 table T-330 SV-7 / SV-8 -- the search tables filter and sort their rows', () => {
  it('the clauses this file drives are the specification\'s, word for word', () => {
    expect(REQUIREMENTS).toContain('**表 T-330 — 検索パネルの見せ方と振舞い**')
    for (const clause of [SV_7_ITEMS, SV_7_DATES, SV_7_ALL, SV_7_ASSIGNEES, SV_7_BLANK_DATES]) expect(SV_7).toContain(clause)
    for (const clause of [SV_8_ONE, SV_8_STATES, SV_8_TIES, SV_8_DEFAULT]) expect(SV_8).toContain(clause)
    expect(cellOf('T-331', 'SQ-2', '絞り込み')).toBe('値の一覧（1 人ずつ）')
    for (const id of ['SQ-3', 'SQ-9']) expect(cellOf('T-331', id, '絞り込み')).toBe('いつから・いつまで')
    expect(cellOf('T-331', 'SQ-4', '絞り込み')).toBe('同上')
    for (const id of ['SQ-5', 'SQ-6', 'SQ-7', 'SQ-8']) expect(cellOf('T-331', id, '絞り込み')).toBe('値の一覧')
    expect(cellOf('T-331', 'SQ-6', '書き方')).toContain(SQ_6_JOIN)
    for (const [id, [state, word]] of Object.entries(STATE_WORDS)) expect(cellOf('T-019a', id, '状態'), state).toBe(word)
  })

  it('SV-7: each column offers each cell value once, the assignee column one person at a time, and one item for all blank cells', () => {
    const names = columnValuesOf(ROWS, 'SQ-1')
    expect(new Set(names).size).toBe(names.length)
    expect(names).toEqual(expect.arrayContaining(['Alpha', 'Beta', 'Gamma']))
    blankItemOf('SQ-1', ['Alpha', 'Beta', 'Gamma'])
    expect(names).toHaveLength(4)

    const people = columnValuesOf(ROWS, 'SQ-2')
    expect(new Set(people).size).toBe(people.length)
    expect(people).toEqual(expect.arrayContaining(['Ann', 'Bob', 'Cid']))
    expect(people, 'one person per item, never the joined cell').not.toContain('Ann, Bob')
    blankItemOf('SQ-2', ['Ann', 'Bob', 'Cid'])
    expect(people).toHaveLength(4)

    expect([...columnValuesOf(ROWS, 'SQ-5')].sort()).toHaveLength(5)
    expect([...columnValuesOf(ROWS, 'SQ-6')].sort()).toEqual([P1, `${P1} → ${P15}`, P2].sort())
    expect([...columnValuesOf(ROWS, 'SQ-7')].sort()).toEqual(['PM note', 'memo', 'other'].sort())
    expect([...columnValuesOf(ROWS, 'SQ-8')].sort()).toEqual([P15, P2].sort())
  })

  it('SV-7: a value filter keeps only the rows whose value is shown, the blank item standing for every blank cell', () => {
    const onlyAlpha = columnValuesOf(ROWS, 'SQ-1').filter((value) => value !== 'Alpha')
    const kept = filteredSearchRows(ROWS, filtersOf(hiding('SQ-1', onlyAlpha)), null)
    expect(uidsOf(kept)).toEqual([1, 5])
    expect(idsOf(kept), 'a task column does not filter the comment box table').toEqual(ALL_IDS)

    const noBlank = filteredSearchRows(ROWS, filtersOf(hiding('SQ-1', [blankItemOf('SQ-1', ['Alpha', 'Beta', 'Gamma'])])), null)
    expect(uidsOf(noBlank)).toEqual([1, 2, 4, 5])

    const noSteering = filteredSearchRows(ROWS, filtersOf(hiding('SQ-8', [P15])), null)
    expect(idsOf(noSteering)).toEqual(['c-2'])
    expect(uidsOf(noSteering), 'a comment box column does not filter the task table').toEqual(ALL_UIDS)
  })

  it('SV-7: the assignee column keeps a row while any one of its people is shown', () => {
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(hiding('SQ-2', ['Ann'])), null))).toEqual([1, 2, 3, 4, 6])
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(hiding('SQ-2', ['Ann', 'Bob'])), null))).toEqual([2, 3, 6])
    const blank = blankItemOf('SQ-2', ['Ann', 'Bob', 'Cid'])
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(hiding('SQ-2', [blank])), null))).toEqual([1, 2, 4, 5])
  })

  it('SV-7: a date filter keeps the rows inside its bounds and, once a bound is set, drops the rows with no date', () => {
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-3', '2026-04-05', '2026-04-18')), null))).toEqual([2, 5, 6])
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-3', '2026-04-12', null)), null))).toEqual([4, 6])
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-3', null, '2026-04-12')), null))).toEqual([1, 2, 5])
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-4', '2026-04-12', null)), null))).toEqual([4, 6])
    expect(idsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-9', '2026-04-15', null)), null))).toEqual(['c-1'])
    expect(idsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-9', null, '2026-04-15')), null))).toEqual(['c-2'])
  })

  it('SV-7: with no bound set a date column drops nothing, and with no filter every row stays', () => {
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-3', null, null)), null))).toEqual(ALL_UIDS)
    expect(uidsOf(filteredSearchRows(ROWS, NO_FILTERS, null))).toEqual(ALL_UIDS)
    expect(idsOf(filteredSearchRows(ROWS, NO_FILTERS, null))).toEqual(ALL_IDS)
  })

  it('SV-7: filters on two columns keep only the rows that satisfy both', () => {
    const onlyAlpha = columnValuesOf(ROWS, 'SQ-1').filter((value) => value !== 'Alpha')
    expect(uidsOf(filteredSearchRows(ROWS, filtersOf(between('SQ-3', '2026-04-05', null)), null))).toEqual([2, 4, 5, 6])
    const both = filtersOf(hiding('SQ-1', onlyAlpha), between('SQ-3', '2026-04-05', null))
    expect(uidsOf(filteredSearchRows(ROWS, both, null))).toEqual([5])
  })

  it('SV-8: with no sort the rows keep the default order, filtered or not', () => {
    const noBeta = filteredSearchRows(ROWS, filtersOf(hiding('SQ-1', ['Beta'])), null)
    expect(uidsOf(noBeta)).toEqual([1, 3, 4, 5, 6])
  })

  it('SV-8: a date column sorts by day either way, ties keep the default order and a blank date stays last', () => {
    expect(uidsOf(sorted('SQ-3', 'ascending'))).toEqual([1, 2, 5, 6, 4, 3])
    expect(uidsOf(sorted('SQ-3', 'descending'))).toEqual([4, 6, 2, 5, 1, 3])
    expect(idsOf(sorted('SQ-9', 'ascending'))).toEqual(['c-2', 'c-1', 'c-3'])
    expect(idsOf(sorted('SQ-9', 'descending'))).toEqual(['c-1', 'c-2', 'c-3'])
  })

  it('SV-8: a name column sorts either way with the blank names last both ways', () => {
    expect(uidsOf(sorted('SQ-1', 'ascending'))).toEqual([1, 5, 2, 4, 3, 6])
    expect(uidsOf(sorted('SQ-1', 'descending'))).toEqual([4, 2, 1, 5, 3, 6])
  })

  it('SV-8: the state column ascends not started, in progress, finished, resume planned, resume unknown, and descends the reverse', () => {
    expect(uidsOf(sorted('SQ-5', 'ascending'))).toEqual([2, 6, 1, 3, 4, 5])
    expect(uidsOf(sorted('SQ-5', 'descending'))).toEqual([5, 4, 3, 1, 2, 6])
  })

  it('SV-8: a sort applies after the filters', () => {
    const onlyAlpha = columnValuesOf(ROWS, 'SQ-1').filter((value) => value !== 'Alpha')
    const rows = filteredSearchRows(ROWS, filtersOf(hiding('SQ-1', onlyAlpha)), { column: 'SQ-3', direction: 'descending' })
    expect(uidsOf(rows)).toEqual([5, 1])
  })
})

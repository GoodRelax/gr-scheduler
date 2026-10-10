// CR-721 spec-only contract: which headings count as filtered (SV-7), and the Visibility column's words, values, order and heading box (SQ-10, SV-8).

import { describe, expect, it } from 'vitest'

import { delayDiagnosticsReportAfterFilterChange } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { searchPanelWithShownTasks } from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  TASK_PANEL,
  TASK_UIDS,
  changed,
  columnOf,
  columnWordOf,
  opened,
  panelWordOf,
  pressed,
  reportAfter,
  reportViewOf,
  valuesOf,
  viewOf,
  withValueOff,
} from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

const SV_7_GREEN =
  '⭐ 列のフィルタを掛けている列 —— 値の一覧の印を 1 つでも外した列か、「いつから」か「いつまで」を置いた列 —— の見出しのセルは、`_assets/tbl-settings.md` の 表 T-236 の `S-183` で塗り、語と `IC-122` の絵を `S-146`（地の色）で描くこと（MUST）'
const SV_7_SORT_ONLY = '並べ替えだけを掛けた列の見出しは塗らない —— 緑は列のフィルタだけの合図である（利用者が定めた）'
const SV_8_VISIBILITY = '表示の列（`SQ-10`）の昇順は 表示 → 非表示、降順はその逆。'
const SQ_10_HEADING_STATES =
  '見出しのセルは、一覧に出ている行がすべて入っている・一部・1 つも入っていない の 3 つの状態のチェックボックスと `IC-122`。'
const SQ_10_HEADING_PRESS = '見出しのチェックボックスを押すと、一覧に出ている行だけをすべて入れる（すべて入っていればすべて外す）。'
const SQ_10_VALUES = '値の一覧（「表示」「非表示」）'
const SV_6_FIRST_COLUMN_NOTE = '表示・ステータス・進捗・タスク の 4 列'

describe('CR-721 the manuscript these cases are driven by', () => {
  it('T-330 SV-7 and SV-8 and T-331 SQ-10 still say it, word for word', () => {
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_GREEN)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_SORT_ONLY)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_VISIBILITY)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_STATES)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_PRESS)
    expect(cellOf('T-331', 'SQ-10', 'フィルタ')).toBe(SQ_10_VALUES)
    expect(cellOf('T-330', 'SV-6', '定め')).toContain(SV_6_FIRST_COLUMN_NOTE)
  })
})

// WHY: a value list holds one item per value the cells carry (SV-7), so both words need one checked and one unchecked task.
const MIXED = searchPanelWithShownTasks(TASK_PANEL, [1], true)

const filteredColumns = (panel: typeof TASK_PANEL): readonly string[] =>
  viewOf({ ...panel, filters: { ...panel.filters, open: null } }).columns.filter((one) => one.isFiltered).map((one) => one.column)

describe('FR-151 T-330 SV-7 -- 列のフィルタを掛けている列: a column with one value unchecked is filtered', () => {
  it('a fresh table has no filtered heading', () => {
    expect(filteredColumns(TASK_PANEL)).toEqual([])
  })

  it('unchecking one value of one column marks that column and no other', () => {
    const there = opened('SQ-1')
    const first = valuesOf(there).values[0]
    const panel = changed(there, { kind: 'value', column: 'SQ-1', value: first?.value ?? '', isShown: false })
    expect(filteredColumns(panel)).toEqual(['SQ-1'])
  })

  it('checking the value again takes the mark off', () => {
    const there = opened('SQ-1')
    const first = valuesOf(there).values[0]?.value ?? ''
    const off = changed(there, { kind: 'value', column: 'SQ-1', value: first, isShown: false })
    const back = changed(off, { kind: 'value', column: 'SQ-1', value: first, isShown: true })
    expect(filteredColumns(back)).toEqual([])
  })

  it('a date bound marks a date column, whichever of the two is placed', () => {
    const since = changed(opened('SQ-3'), { kind: 'bound', column: 'SQ-3', bound: 'since', day: '2026-04-02' })
    expect(filteredColumns(since)).toEqual(['SQ-3'])
    const until = changed(opened('SQ-4'), { kind: 'bound', column: 'SQ-4', bound: 'until', day: '2026-04-30' })
    expect(filteredColumns(until)).toEqual(['SQ-4'])
  })

  it('the Visibility column is marked when one of its two values is unchecked', () => {
    const panel = withValueOff('SQ-10', panelWordOf('hideValue', 'ja'), MIXED)
    expect(filteredColumns(panel)).toEqual(['SQ-10'])
  })

  it('two columns filtered are two marks', () => {
    const one = withValueOff('SQ-1', 'Alpha')
    const two = withValueOff('SQ-5', valuesOf(opened('SQ-5', one)).values[0]?.label ?? '', one)
    expect([...filteredColumns(two)].sort()).toEqual(['SQ-1', 'SQ-5'])
  })
})

describe('FR-151 T-330 SV-7 -- 並べ替えだけを掛けた列の見出しは塗らない', () => {
  it.each([
    ['IC-123', 'ascending'],
    ['IC-124', 'descending'],
  ] as const)('%s (%s) on a column marks no heading', (entry: string, _direction: string) => {
    const sorted = pressed(opened('SQ-1'), entry)
    expect(sorted.sort, 'premise: a sort is set').not.toBeNull()
    expect(filteredColumns(sorted)).toEqual([])
  })

  it('a sorted column that is also filtered is marked, and one that is only sorted is not', () => {
    const filtered = withValueOff('SQ-1', 'Alpha')
    const sortedElsewhere = pressed(opened('SQ-5', filtered), 'IC-123')
    expect(filteredColumns(sortedElsewhere)).toEqual(['SQ-1'])
  })
})

describe('FR-151 T-331 SQ-10, T-330 SV-8 -- the Visibility column words and values', () => {
  it('the heading is the dictionary word in each language: 表示 and Visibility', () => {
    expect(columnOf(viewOf(TASK_PANEL, 'ja'), 'SQ-10').heading).toBe(columnWordOf('SQ-10', 'ja'))
    expect(columnOf(viewOf(TASK_PANEL, 'en'), 'SQ-10').heading).toBe(columnWordOf('SQ-10', 'en'))
    expect(columnWordOf('SQ-10', 'ja')).toBe('表示')
    expect(columnWordOf('SQ-10', 'en')).toBe('Visibility')
  })

  it('the two values of its filter are 表示 and 非表示, and Show and Hide', () => {
    for (const [language, words] of [['ja', ['表示', '非表示']], ['en', ['Show', 'Hide']]] as const) {
      const labels = valuesOf(opened('SQ-10', MIXED, language), language).values.map((one) => one.label)
      expect([...labels].sort()).toEqual([...words].sort())
      expect(panelWordOf('showValue', language)).toBe(words[0])
      expect(panelWordOf('hideValue', language)).toBe(words[1])
    }
  })

  it('a task is Hide until its uid is checked, then Show', () => {
    const before = viewOf(TASK_PANEL).rows.map((one) => one.shown)
    expect(before.every((shown) => shown === false)).toBe(true)
    const after = viewOf(searchPanelWithShownTasks(TASK_PANEL, [TASK_UIDS[1] ?? 0], true)).rows.map((one) => one.shown)
    expect(after).toEqual([false, true, false])
  })

  it('SV-8: ascending puts Show before Hide, descending the reverse, ties in the default order', () => {
    const checked = searchPanelWithShownTasks(TASK_PANEL, [3], true)
    const order = (entry: string): readonly number[] =>
      viewOf(pressed(opened('SQ-10', checked), entry)).rows.map((one) => (one.target.kind === 'task' ? one.target.taskUid : -1))
    expect(order('IC-123')).toEqual([3, 1, 2])
    expect(order('IC-124')).toEqual([1, 2, 3])
  })

  it('unchecking Hide in its filter leaves only the checked tasks in the table', () => {
    const checked = searchPanelWithShownTasks(TASK_PANEL, [2], true)
    const panel = withValueOff('SQ-10', panelWordOf('hideValue', 'ja'), checked)
    expect(viewOf(panel).rows.map((one) => (one.target.kind === 'task' ? one.target.taskUid : -1))).toEqual([2])
  })

  it('SQ-10 stands first and the first four columns are fixed (SV-6)', () => {
    const columns = viewOf(TASK_PANEL).columns
    expect(columns.map((one) => one.column).slice(0, 4)).toEqual(['SQ-10', 'SQ-5', 'SQ-11', 'SQ-1'])
    expect(columns.slice(0, 4).every((one) => one.isFixed)).toBe(true)
  })

  it('SQ-10 is not a column of the comment box table', () => {
    expect(viewOf({ ...TASK_PANEL, table: 'commentBoxes' }).columns.map((one) => one.column)).toEqual(['SQ-7', 'SQ-8', 'SQ-9'])
  })
})

describe('FR-151 T-331 SQ-10 -- the heading box shows all, some or none of the listed rows', () => {
  it('none, some and all are read over the rows the list shows', () => {
    expect(viewOf(TASK_PANEL).showHeading).toBe('none')
    expect(viewOf(searchPanelWithShownTasks(TASK_PANEL, [1], true)).showHeading).toBe('some')
    expect(viewOf(searchPanelWithShownTasks(TASK_PANEL, TASK_UIDS, true)).showHeading).toBe('all')
  })

  it('a word that lists one row makes that row the whole list', () => {
    const narrowed = { ...searchPanelWithShownTasks(TASK_PANEL, [1], true), word: 'alpha' }
    expect(viewOf(narrowed).rows.length, 'premise: the word lists one row').toBe(1)
    expect(viewOf(narrowed).showHeading).toBe('all')
  })

  it('pressing the heading box with every listed row in takes every listed row out', () => {
    const all = searchPanelWithShownTasks(TASK_PANEL, TASK_UIDS, true)
    const out = changed(all, { kind: 'shown', column: 'SQ-10', taskUids: TASK_UIDS, isShown: false })
    expect(viewOf(out).showHeading).toBe('none')
  })
})

describe('FR-134 T-346 RW-2 -- the report window marks a filtered heading the same way', () => {
  it('a report column with one value unchecked is filtered, and one only sorted is not', () => {
    const there = reportAfter(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-1')
    const menu = reportViewOf(there).filterMenu
    if (menu === null || menu.kind !== 'values') throw new Error('the report status filter lists no values')
    const filtered = delayDiagnosticsReportAfterFilterChange(there, { kind: 'value', column: 'DT-1', value: menu.values[0]?.value ?? '', isShown: false })
    const marked = (window: typeof there): readonly string[] =>
      reportViewOf({ ...window, panel: { ...window.panel, filters: { ...window.panel.filters, open: null } } }).columns.filter((one) => one.isFiltered).map((one) => one.column)
    expect(marked(filtered)).toEqual(['DT-1'])
    const sorted = reportAfter(reportAfter(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-3'), 'IC-123', 'DT-3')
    expect(sorted.panel.sort, 'premise: a sort is set').not.toBeNull()
    expect(marked(sorted)).toEqual([])
  })
})

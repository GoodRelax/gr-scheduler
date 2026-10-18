// CR-721 spec-only contract: which headings count as filtered (SV-7), and the Visibility column's words, rows and heading box (SQ-10, SV-7, SV-8). CR-798: rows start unchecked and the column has no value list, no filter and no sort. CR-800: its heading holds the box alone, no IC-122.

import { describe, expect, it } from 'vitest'

import { delayDiagnosticsReportAfterFilterChange } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { searchPanelAfterFilterChange, searchPanelAfterFilterEntry, searchPanelWithFilterOpened } from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_REPORT,
  SCHEDULE,
  TASK_PANEL,
  TASK_UIDS,
  changed,
  columnOf,
  columnWordOf,
  opened,
  panelWordOf,
  sessionIn,
  pressed,
  reportAfter,
  reportViewOf,
  valuesOf,
  viewOf,
  withValueOff,
  type Pane,
  type ReportPane,
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
const SV_8_VISIBILITY = '表示の列（`SQ-10`）では並べ替えない'
const SV_7_NO_ENTRANCE = '⭐ [表示] の列の見出しには `IC-122` を置かず、見出しのチェックボックスだけを置く（`SQ-10` —— 利用者が定めた）。'
const SV_7_NO_GREEN = '[表示] の列は列のフィルタを持たないので、その見出しのセルを本段の終わりの緑で塗ることは無い。'
const SQ_10_HEADING_STATES =
  '見出しのセルは、一覧に出ている行がすべて入っている・一部・1 つも入っていない の 3 つの状態のチェックボックスだけである —— 状態は一覧に出ている行から読み、初めは 1 つも入っていない。'
const SQ_10_HEADING_ADD = '見出しのチェックボックスを押すと、一覧に出ている行のうち入っていない行があれば、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない。'
const SQ_10_HEADING_CLEAR = '一覧に出ている行がすべて入っていれば、表のすべての行（語や列のフィルタで一覧に出ていない行も）のチェックを外す（利用者が定めた）。'
const SQ_10_NO_VALUES = '持たない —— 見出しに `IC-122` を置かない（表 T-330 の `SV-7`）'
const SV_6_FIRST_COLUMN_NOTE = '表示・ステータス・進捗・タスク種別・タスク の 5 列'

describe('CR-721 the manuscript these cases are driven by', () => {
  it('T-330 SV-7 and SV-8 and T-331 SQ-10 still say it, word for word', () => {
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_GREEN)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_SORT_ONLY)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_VISIBILITY)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_NO_ENTRANCE)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_NO_GREEN)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_STATES)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_ADD)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_CLEAR)
    expect(cellOf('T-331', 'SQ-10', 'フィルタ')).toBe(SQ_10_NO_VALUES)
    expect(cellOf('T-330', 'SV-6', '定め')).toContain(SV_6_FIRST_COLUMN_NOTE)
  })
})

// WHY: CR-798 TV-2 -- every row starts unchecked (Hide), so a case that needs some rows Show checks exactly the named ones.
const onlyShown = (pane: Pane, uids: readonly number[]): Pane => ({
  ...pane,
  view: { ...pane.view, visibility: { ...pane.view.visibility, shownTaskUids: TASK_UIDS.filter((uid) => uids.includes(uid)) } },
})

const checkedOf = (pane: Pane): readonly number[] => [...pane.view.visibility.shownTaskUids].sort((a, b) => a - b)
const uidsOf = (pane: Pane): readonly number[] => viewOf(pane).rows.map((one) => (one.target.kind === 'task' ? one.target.taskUid : -1))

const filteredColumns = (pane: Pane): readonly string[] =>
  viewOf({ ...pane, panel: { ...pane.panel, filters: { ...pane.panel.filters, open: null } } }).columns.filter((one) => one.isFiltered).map((one) => one.column)

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

  // WHY: CR-800 -- the Visibility column has no value list, no filter and no IC-122, so nothing on it can mark its heading.
  it('the Visibility column is never marked: a row checked and the heading box pressed both ways are not a column filter', () => {
    const some = onlyShown(TASK_PANEL, [1])
    expect(filteredColumns(some)).toEqual([])
    expect(filteredColumns(changed(TASK_PANEL, { kind: 'shown', column: 'SQ-10', keys: [2], isShown: true }))).toEqual([])
    const all = changed(some, { kind: 'shown', column: 'SQ-10', keys: TASK_UIDS, isShown: true, isHeading: true })
    expect(filteredColumns(all)).toEqual([])
    expect(filteredColumns(changed(all, { kind: 'shown', column: 'SQ-10', keys: TASK_UIDS, isShown: false, isHeading: true }))).toEqual([])
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
    expect(sorted.view.sort, 'premise: a sort is set').not.toBeNull()
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

  it('the dictionary still holds the words 表示 / 非表示 and Show / Hide', () => {
    for (const [language, words] of [['ja', ['表示', '非表示']], ['en', ['Show', 'Hide']]] as const) {
      expect(panelWordOf('showValue', language)).toBe(words[0])
      expect(panelWordOf('hideValue', language)).toBe(words[1])
    }
  })

  // WHY: CR-800 SV-7 -- the heading holds the box alone, so IC-122 on SQ-10 opens nothing in either language.
  it('SQ-10 has no value list and no IC-122: nothing opens on it, and every other column still opens', () => {
    for (const language of ['ja', 'en'] as const) {
      expect(searchPanelWithFilterOpened(sessionIn(language), TASK_PANEL.panel, TASK_PANEL.view, 'SQ-10'), language).toBeNull()
      expect(viewOf(TASK_PANEL, language).filterMenu, language).toBeNull()
      expect(searchPanelWithFilterOpened(sessionIn(language), TASK_PANEL.panel, TASK_PANEL.view, 'SQ-1'), language).not.toBeNull()
    }
  })

  it('a value change on the Visibility column does nothing: no column filter is held', () => {
    const there = onlyShown(TASK_PANEL, [1])
    const after = searchPanelAfterFilterChange(sessionIn('ja'), there.panel, there.view, { kind: 'value', column: 'SQ-10', value: 'hidden', isShown: false })
    expect(after === null || (after.columnFilters.length === 0 && after.visibility === there.view.visibility)).toBe(true)
  })

  it('CR-798 TV-2: a task is Hide until its row is checked, then Show', () => {
    const before = viewOf(TASK_PANEL).rows.map((one) => one.isShown)
    expect(before.length, 'premise: the stage lists tasks').toBe(3)
    expect(before.every((shown) => shown === false)).toBe(true)
    const after = changed(TASK_PANEL, { kind: 'shown', column: 'SQ-10', keys: [TASK_UIDS[1] ?? 0], isShown: true })
    expect(viewOf(after).rows.map((one) => one.isShown)).toEqual([false, true, false])
  })

  // WHY: CR-800 SV-8 -- the Visibility column is not sorted: it opens no filter, so a press of IC-123 / IC-124 changes nothing.
  it('SV-8: the Visibility column takes no sort; IC-123 and IC-124 pressed there give no view', () => {
    const there = onlyShown(TASK_PANEL, [3])
    for (const entry of ['IC-123', 'IC-124'] as const) {
      expect(searchPanelAfterFilterEntry(sessionIn('ja'), there.panel, there.view, entry, SCHEDULE), entry).toBeNull()
    }
    expect(uidsOf(there), 'the rows keep the default order').toEqual([1, 2, 3])
  })

  // WHY: CR-800 SQ-10 -- the heading box adds the listed rows when one is unchecked, so a word that lists one row leaves the others as they were.
  it('SQ-10: the heading box checks the listed rows only; the rows a word keeps out of the list are not changed', () => {
    const worded: Pane = { ...onlyShown(TASK_PANEL, [3]), panel: { ...TASK_PANEL.panel, word: 'alpha' } }
    expect(uidsOf(worded), 'premise: the word lists one row').toEqual([1])
    const after = changed(worded, { kind: 'shown', column: 'SQ-10', keys: [1], isShown: true, isHeading: true })
    expect(checkedOf(after)).toEqual([1, 3])
  })

  it('SQ-10: the heading box with every listed row in takes every row of the table out, the rows a word keeps out of the list too', () => {
    const worded: Pane = { ...onlyShown(TASK_PANEL, TASK_UIDS), panel: { ...TASK_PANEL.panel, word: 'alpha' } }
    expect(uidsOf(worded), 'premise: the word lists one row').toEqual([1])
    expect(viewOf(worded).showHeading, 'premise: the listed row is in').toBe('all')
    const after = changed(worded, { kind: 'shown', column: 'SQ-10', keys: [1], isShown: false, isHeading: true })
    expect(checkedOf(after)).toEqual([])
  })

  it('SQ-10: the clear leaves the Schedule Filter and a column filter on another column as they were', () => {
    const filtered = withValueOff('SQ-1', 'Alpha', onlyShown({ ...TASK_PANEL, view: { ...TASK_PANEL.view, visibility: { ...TASK_PANEL.view.visibility, isScheduleFilterApplied: true } } }, [1, 2]))
    const after = changed(filtered, { kind: 'shown', column: 'SQ-10', keys: [2, 3], isShown: false, isHeading: true })
    expect(checkedOf(after), 'Alpha is not listed and is cleared as well').toEqual([])
    expect(after.view.visibility.isScheduleFilterApplied).toBe(true)
    expect(after.view.columnFilters).toEqual(filtered.view.columnFilters)
  })

  it('SQ-10: the box of a row (no isHeading) changes that row only, even when every row was checked', () => {
    const all = onlyShown(TASK_PANEL, TASK_UIDS)
    expect(checkedOf(changed(all, { kind: 'shown', column: 'SQ-10', keys: [2], isShown: false }))).toEqual([1, 3])
  })

  it('SQ-10 stands first and the first five columns are fixed (SV-6)', () => {
    const columns = viewOf(TASK_PANEL).columns
    expect(columns.map((one) => one.column).slice(0, 5)).toEqual(['SQ-10', 'SQ-5', 'SQ-11', 'SQ-14', 'SQ-1'])
    expect(columns.slice(0, 5).every((one) => one.isFixed)).toBe(true)
  })

  it('SQ-10 is not a column of the comment box table', () => {
    expect(viewOf({ ...TASK_PANEL, panel: { ...TASK_PANEL.panel, table: 'commentBoxes' } }).columns.map((one) => one.column)).toEqual(['SQ-7', 'SQ-8', 'SQ-9'])
  })
})

describe('FR-151 T-331 SQ-10 -- the heading box shows all, some or none of the listed rows', () => {
  it('none, some and all are read over the rows the list shows (none at first, CR-798 TV-2)', () => {
    expect(viewOf(TASK_PANEL).showHeading).toBe('none')
    expect(viewOf(onlyShown(TASK_PANEL, TASK_UIDS)).showHeading).toBe('all')
    expect(viewOf(onlyShown(TASK_PANEL, [1])).showHeading).toBe('some')
  })

  it('a word that lists one row makes that row the whole list', () => {
    const narrowed = { ...onlyShown(TASK_PANEL, [1]), panel: { ...TASK_PANEL.panel, word: 'alpha' } }
    expect(viewOf(narrowed).rows.length, 'premise: the word lists one row').toBe(1)
    expect(viewOf(narrowed).showHeading).toBe('all')
  })

  it('pressing the heading box with every listed row in takes every row out', () => {
    const all = onlyShown(TASK_PANEL, TASK_UIDS)
    const out = changed(all, { kind: 'shown', column: 'SQ-10', keys: TASK_UIDS, isShown: false, isHeading: true })
    expect(viewOf(out).showHeading).toBe('none')
  })

  it('pressing the heading box with some listed rows in checks every listed row', () => {
    const some = onlyShown(TASK_PANEL, [1])
    expect(viewOf(some).showHeading, 'premise: some of the listed rows are in').toBe('some')
    const out = changed(some, { kind: 'shown', column: 'SQ-10', keys: TASK_UIDS, isShown: true, isHeading: true })
    expect(viewOf(out).showHeading).toBe('all')
  })

  // WHY: CR-800 Y-a -- the state is read over the listed rows, so rows checked outside the list leave the box empty, and a press then adds the listed row.
  it('rows checked outside the list leave the heading box empty, and a press checks the listed row', () => {
    const narrowed: Pane = { ...onlyShown(TASK_PANEL, [2, 3]), panel: { ...TASK_PANEL.panel, word: 'alpha' } }
    expect(viewOf(narrowed).showHeading).toBe('none')
    const out = changed(narrowed, { kind: 'shown', column: 'SQ-10', keys: [1], isShown: true, isHeading: true })
    expect(checkedOf(out)).toEqual([1, 2, 3])
    expect(viewOf(out).showHeading).toBe('all')
  })
})

describe('FR-134 T-346 RW-2 -- the report window marks a filtered heading the same way', () => {
  it('a report column with one value unchecked is filtered, and one only sorted is not', () => {
    const there = reportAfter(OPENED_REPORT, 'IC-122', 'DT-1')
    const menu = reportViewOf(there).filterMenu
    if (menu === null || menu.kind !== 'values') throw new Error('the report status filter lists no values')
    const filtered: ReportPane = {
      window: there.window,
      view: delayDiagnosticsReportAfterFilterChange(there.window, there.view, { kind: 'value', column: 'DT-1', value: menu.values[0]?.value ?? '', isShown: false }),
    }
    const marked = (pane: ReportPane): readonly string[] =>
      reportViewOf({ ...pane, window: { ...pane.window, panel: { ...pane.window.panel, filters: { ...pane.window.panel.filters, open: null } } } }).columns.filter((one) => one.isFiltered).map((one) => one.column)
    expect(marked(filtered)).toEqual(['DT-1'])
    const sorted = reportAfter(reportAfter(OPENED_REPORT, 'IC-122', 'DT-3'), 'IC-123', 'DT-3')
    expect(sorted.view.sort, 'premise: a sort is set').not.toBeNull()
    expect(marked(sorted)).toEqual([])
  })
})

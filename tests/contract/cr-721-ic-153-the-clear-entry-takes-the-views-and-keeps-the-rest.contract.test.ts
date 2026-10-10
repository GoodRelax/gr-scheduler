// CR-721 spec-only contract: IC-153 clears every column filter and the sort of a table window and nothing else (FR-151 T-330 SV-1, FR-134 T-346 RW-2, T-109 IC-153).

import { describe, expect, it } from 'vitest'

import { clearEntryOf, tableWithViewsCleared } from '../../src/adapter/screen-renderer/table-window'
import { searchPanelWithColumnWidth, searchPanelWithTableViewsCleared } from '../../src/adapter/screen-renderer/search-panel'
import { delayDiagnosticsReportAfterFilterChange, delayDiagnosticsReportWithColumnWidth } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  COMMENT_PANEL,
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  TASK_PANEL,
  changed,
  columnOf,
  iconWordOf,
  opened,
  pressed,
  reportAfter,
  reportViewOf,
  valuesOf,
  viewOf,
  withValueOff,
  type SearchPanelSession,
} from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

const SV_1_CLEARS =
  '`IC-153` は、タスクの表とコメントボックスの表のすべての列のフィルタをクリアし、並びを既定の並び（`SV-8`）へ戻し、開いているフィルタを閉じる —— 語・表示の列の値・`IC-143` は変えない。'
const SV_1_NOTHING = '列のフィルタも並べ替えも掛かっていないあいだは、`IC-153` を効かなくする（`FR-092`）。'
const IC_153_CLEARS =
  'その表のすべての列のフィルタをクリアし、並びを既定の並び（`FR-151` の 表 T-330 の `SV-8`）へ戻す。'
const IC_153_KEEPS = '⭐ 語・表示の列の値・スケジュールフィルタ（`IC-143`）は変えない。'
const IC_153_NOTHING = '戻すものが無いあいだは効かない'

describe('CR-721 the manuscript these cases are driven by', () => {
  it('T-330 SV-1 and T-109 IC-153 still say what IC-153 clears, keeps and when it is idle', () => {
    expect(cellOf('T-330', 'SV-1', '定め')).toContain(SV_1_CLEARS)
    expect(cellOf('T-330', 'SV-1', '定め')).toContain(SV_1_NOTHING)
    expect(cellOf('T-109', 'IC-153', '何の入口か')).toContain(IC_153_CLEARS)
    expect(cellOf('T-109', 'IC-153', '何の入口か')).toContain(IC_153_KEEPS)
    expect(cellOf('T-109', 'IC-153', '何の入口か')).toContain(IC_153_NOTHING)
  })

  it('T-109 gives IC-153 its words in both languages', () => {
    expect(iconWordOf('IC-153', 'en')).toBe('Clear Filters')
    expect(iconWordOf('IC-153', 'ja')).toBe('フィルタをクリア')
  })
})

// WHY: a word, a column width, one Hide row and the Schedule Filter on stand for what the clear must leave alone (CR-722 TV-2).
const KEPT_VISIBILITY = { hiddenKeys: [3], isUnassignedHidden: false, isApplied: true }
const KEPT: SearchPanelSession = searchPanelWithColumnWidth({ ...TASK_PANEL, word: 'al', visibility: KEPT_VISIBILITY }, 'SQ-1', 333)

const filteredAndSorted = (): SearchPanelSession => {
  const sorted = pressed(opened('SQ-1', KEPT), 'IC-123')
  return withValueOff('SQ-5', statusLabelOf(sorted), sorted)
}

// WHY: the status labels depend on the document, so the one to take off is read from the open filter.
function statusLabelOf(panel: SearchPanelSession): string {
  const menu = valuesOf(opened('SQ-5', panel))
  const label = menu.values[0]?.label
  if (label === undefined) throw new Error('the status filter lists no value')
  return label
}

describe('FR-151 T-330 SV-1, T-109 IC-153 -- what the clear takes away', () => {
  it('an unchecked value, a sort and an open filter all go', () => {
    const before = filteredAndSorted()
    expect(before.sort, 'premise: IC-123 set a sort').not.toBeNull()
    expect(viewOf({ ...before, filters: { ...before.filters, open: null } }).columns.some((one) => one.isFiltered), 'premise: a value is unchecked').toBe(true)
    const after = searchPanelWithTableViewsCleared(before)
    expect(after.filters.columns).toEqual([])
    expect(after.filters.open).toBeNull()
    expect(after.sort).toBeNull()
  })

  it('a date bound goes too', () => {
    const there = opened('SQ-3', KEPT)
    const bounded = changed(there, { kind: 'bound', column: 'SQ-3', bound: 'since', day: '2026-04-02' })
    const after = searchPanelWithTableViewsCleared(bounded)
    expect(after.filters.columns).toEqual([])
    expect(viewOf(after).rows.length).toBe(viewOf({ ...KEPT, word: 'al' }).rows.length)
  })

  it('the filters of the task table and of the comment box table go in one press', () => {
    const tasks = withValueOff('SQ-5', statusLabelOf(TASK_PANEL), TASK_PANEL)
    const both = { ...tasks, table: 'commentBoxes' as const }
    const comments = withValueOff('SQ-7', valuesOf(opened('SQ-7', { ...both, filters: { ...both.filters, open: null } })).values[0]?.label ?? '', both)
    expect(comments.filters.columns.length, 'premise: two columns are filtered').toBe(2)
    const after = searchPanelWithTableViewsCleared(comments)
    for (const table of [{ ...after, table: 'tasks' as const }, { ...after, table: 'commentBoxes' as const }]) {
      expect(viewOf(table).columns.some((one) => one.isFiltered), table.table).toBe(false)
    }
  })

  it('the clear on a comment box table clears the sort as well', () => {
    const sorted = pressed(opened('SQ-7', COMMENT_PANEL), 'IC-124')
    expect(sorted.sort, 'premise: IC-124 set a sort').not.toBeNull()
    expect(searchPanelWithTableViewsCleared(sorted).sort).toBeNull()
  })
})

describe('FR-151 T-330 SV-1 -- what the clear keeps: the words, the Visibility values, IC-143 and the widths', () => {
  it('the word, the checked tasks, Show only checked and a dragged width are as they were', () => {
    const after = searchPanelWithTableViewsCleared(filteredAndSorted())
    expect(after.word).toBe('al')
    expect(after.visibility).toEqual(KEPT_VISIBILITY)
    expect(columnOf(viewOf(after), 'SQ-1').width).toBe(333)
    expect(after.table).toBe('tasks')
  })

  it('a filter on the Visibility column goes, the checked tasks stay', () => {
    const there = opened('SQ-10', KEPT)
    const hidden = changed(there, { kind: 'value', column: 'SQ-10', value: valuesOf(there).values[0]?.value ?? '', isShown: false })
    expect(viewOf(hidden).columns.some((one) => one.column === 'SQ-10' && one.isFiltered), 'premise: the Visibility column is filtered').toBe(true)
    const after = searchPanelWithTableViewsCleared(hidden)
    expect(after.visibility).toEqual(KEPT_VISIBILITY)
  })
})

describe('FR-092 T-330 SV-1 -- with nothing to clear the entry does nothing', () => {
  it('the entry is idle on a fresh table and the panel comes back as it was', () => {
    expect(clearEntryOf(KEPT, 'ja').isEnabled).toBe(false)
    expect(searchPanelWithTableViewsCleared(KEPT)).toEqual(KEPT)
    expect(tableWithViewsCleared(KEPT)).toEqual(KEPT)
  })

  it('the entry is idle after a clear', () => {
    const after = searchPanelWithTableViewsCleared(filteredAndSorted())
    expect(clearEntryOf(after, 'ja').isEnabled).toBe(false)
    expect(viewOf(after).tableEntries.find((one) => one.icon === 'IC-153')?.isEnabled).toBe(false)
  })

  it.each([
    ['an unchecked value', () => withValueOff('SQ-5', statusLabelOf(KEPT), KEPT)],
    ['a sort only', () => pressed(opened('SQ-1', KEPT), 'IC-124')],
    ['a date bound only', () => changed(opened('SQ-3', KEPT), { kind: 'bound', column: 'SQ-3', bound: 'until', day: '2026-04-30' })],
  ])('the entry works with %s', (_what, make) => {
    const panel = make()
    const entry = viewOf(panel).tableEntries.find((one) => one.icon === 'IC-153')
    expect(entry?.isEnabled).toBe(true)
    expect(searchPanelWithTableViewsCleared(panel)).not.toEqual(panel)
  })

  it('the entry stands in the words of the screen language', () => {
    for (const language of ['ja', 'en'] as const) {
      const entry = viewOf(TASK_PANEL, language).tableEntries.find((one) => one.icon === 'IC-153')
      expect(entry?.label, language).toBe(iconWordOf('IC-153', language))
    }
  })
})

describe('FR-134 T-346 RW-2 -- the report window answers IC-153 the same way', () => {
  const filtered = (): ReturnType<typeof reportAfter> => {
    const there = reportAfter(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-1')
    const menu = reportViewOf(there).filterMenu
    if (menu === null || menu.kind !== 'values') throw new Error('the report status filter lists no values')
    return delayDiagnosticsReportAfterFilterChange(there, { kind: 'value', column: 'DT-1', value: menu.values[0]?.value ?? '', isShown: false })
  }

  it('the title row holds IC-153 and it is idle on a fresh report', () => {
    const entry = reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).tableEntries.find((one) => one.icon === 'IC-153')
    expect(entry?.isEnabled).toBe(false)
  })

  it('the filter and the sort of the report go, the dragged width stays', () => {
    const wide = delayDiagnosticsReportWithColumnWidth(filtered(), 'DT-4', 421)
    const sorted = reportAfter(reportAfter(wide, 'IC-122', 'DT-3'), 'IC-123', 'DT-3')
    expect(sorted.panel.sort, 'premise: a sort is set').not.toBeNull()
    const after = reportAfter(sorted, 'IC-153', null)
    expect(after.panel.filters.columns).toEqual([])
    expect(after.panel.filters.open).toBeNull()
    expect(after.panel.sort).toBeNull()
    expect(after.panel.columnWidths['DT-4']).toBe(421)
    expect(reportViewOf(after).tableEntries.find((one) => one.icon === 'IC-153')?.isEnabled).toBe(false)
  })
})

// CR-721 spec-only contract: which columns are measured, over which rows, and the floor a column never goes under (SV-18, RW-9, S-425, S-496).

import { describe, expect, it } from 'vitest'

import { columnWidthPx, measuredWidthFloor, unmeasuredSizing } from '../../src/framework/dom-screen-surface/search-panel-drawing'
import { searchPanelWithColumnWidth } from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_REPORT,
  TASK_PANEL,
  WORDS,
  columnOf,
  reportViewOf,
  viewOf,
  type Pane,
  type SearchPanelSession,
} from './cr-721-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

// Why: the last cell of a T-206 row is the note, whatever the heading of that table calls it.
const lastCellOf = (table: string, id: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.cells[row.cells.length - 1] ?? '')
}

const SV_18_MEASURED =
  '`GRS` は、中身の字の幅が決まる列（進捗ステータス・完了率・タスク種別・日付 —— `SQ-5`・`SQ-11`・`SQ-14`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-9`）の既定の幅を、幅を測るときの言語（`FR-038`）と字の段（`SV-16`）で、見出し（語と `IC-122`）も値も省略記号で切らない最小の幅にすること。'
const SV_18_WHAT_IS_MEASURED = '`GRS` は、中身の字の幅が決まる列の既定の幅を、見出しと、表がいま持つすべての行の値（一覧に出ていない行を含む）で測ること。`GRS` は、状態の列（`SQ-5`）の幅を、表 T-019a の語と 表 T-315 の `DG-1` 〜 `DG-4` の語のすべてで測ること。`GRS` は、タスク種別の列（`SQ-14`）の幅を、タスク種別の 2 つの値の語で測ること。'
const SV_18_WHEN = '`GRS` は、中身の字の幅が決まる列の既定の幅を、窓を開いたとき・`IC-127` で段を変えたとき・表示の言語を変えたときだけ測ること（ほかの時には測り直さない）。'
const SV_18_DRAGGED = '`GRS` は、引いて変えた列の幅を、測り直さずに保つこと。'
const SV_18_FLOOR = '`GRS` は、列の幅の下限を `S-425` —— 見出しのセルに `IC-122` の箱と、セルの左右の詰めと罫が入る幅を、測るときの段で測った値 —— にすること。'
const SV_18_RAISE = '段を変えて下限が列の幅を超えたとき、`GRS` は、列を下限まで広げること。'
const SV_18_NOT_BY_STEP = '`GRS` は、列の幅を、字の段（`S-429`）と表示の倍率（`S-234`）で変えない画面の px で持つこと。'
const SV_18_VISIBILITY = '`GRS` は、[表示] の列（`SQ-10`）の幅を、既定の幅の例外として `S-496` の固定の値にすること。`GRS` は、[表示] の列に右の境目（`GR-28`）を置かないこと。'
const RW_9_MEASURED = '`GRS` は、中身の字の幅が決まる列（`DT-1`・`DT-3`・`DT-9`・`DT-5`・`DT-6`）の既定の幅を、`SV-18` と同じ規則で測ること。'
// Why: CR-737 added the IC-122 clearance (S-465, T-330 SV-7) to the floor; the old clause without it is retired.
const S_425_FLOOR =
  '⭐ 見出しのセルに `IC-122` の箱と、セルの左右の詰め（0.25em ずつ）と、`IC-122` を列の境目の掴み代の外に立てる離れ（`S-465`、表 T-330 の `SV-7`）と、罫 1px が入る幅を、そのときの字の段（`S-429`）で測る'
const S_425_NO_PX = '⛔ px の定数を置かない —— 詰めは字の段に従う'

describe('CR-721 the manuscript these cases are driven by', () => {
  it('T-330 SV-18, T-346 RW-9 and T-206 S-425 still say it, word for word', () => {
    const say = cellOf('T-330', 'SV-18', '定め')
    for (const clause of [SV_18_MEASURED, SV_18_WHAT_IS_MEASURED, SV_18_WHEN, SV_18_DRAGGED, SV_18_FLOOR, SV_18_RAISE, SV_18_NOT_BY_STEP, SV_18_VISIBILITY]) {
      expect(say).toContain(clause)
    }
    expect(cellOf('T-346', 'RW-9', '定め')).toContain(RW_9_MEASURED)
    expect(lastCellOf('T-206', 'S-425')).toContain(S_425_FLOOR)
    expect(lastCellOf('T-206', 'S-425')).toContain(S_425_NO_PX)
  })
})

// Why: CR-723 -- the pane holds the screen's panel beside the document's table view; a case here changes only the panel.
const withPanel = (patch: Partial<SearchPanelSession>): Pane => ({ ...TASK_PANEL, panel: { ...TASK_PANEL.panel, ...patch } })
const withWidth = (column: string, width: number): Pane => ({ ...TASK_PANEL, panel: searchPanelWithColumnWidth(TASK_PANEL.panel, column, width) })

const MEASURED_TASK_COLUMNS = ['SQ-5', 'SQ-11', 'SQ-14', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13']
const MEASURED_REPORT_COLUMNS = ['DT-1', 'DT-3', 'DT-9', 'DT-5', 'DT-6']

describe('FR-151 T-330 SV-18 -- 見出しも値も省略記号で切られない最小の幅: only the columns whose text decides their width are measured', () => {
  it('the tasks table measures status, progress, task type and the date columns and no other', () => {
    const measured = viewOf(TASK_PANEL).columns.filter((one) => one.widthSamples !== null).map((one) => one.column)
    expect(measured).toEqual(MEASURED_TASK_COLUMNS)
  })

  it('the comment box table measures its date column and no other', () => {
    const measured = viewOf(withPanel({ table: 'commentBoxes' })).columns.filter((one) => one.widthSamples !== null).map((one) => one.column)
    expect(measured).toEqual(['SQ-9'])
  })

  it('RW-9: the report measures DT-1, DT-3, DT-9, DT-5 and DT-6 and no other', () => {
    const measured = reportViewOf(OPENED_REPORT).columns.filter((one) => one.widthSamples !== null).map((one) => one.column)
    expect(measured).toEqual(MEASURED_REPORT_COLUMNS)
  })
})

describe('FR-151 T-330 SV-18 -- 測る相手は、見出しと、その表がいま持つすべての行の値（一覧に出ていない行を含む）', () => {
  it('a word that lists one row still hands the dates of all three tasks to the measure', () => {
    const all = columnOf(viewOf(TASK_PANEL), 'SQ-3').widthSamples ?? []
    const narrowed = columnOf(viewOf(withPanel({ word: 'alpha' })), 'SQ-3').widthSamples ?? []
    expect(viewOf(withPanel({ word: 'alpha' })).rows.length, 'premise: the word lists one row').toBe(1)
    expect([...narrowed].sort()).toEqual([...all].sort())
    expect(all).toEqual(expect.arrayContaining(['2026/04/01', '2026/04/02', '2026/04/03']))
  })

  it.each(['ja', 'en'] as const)('SQ-5 hands over every state word of T-019a and the words of DG-1 to DG-4 in %s', (language) => {
    const samples = columnOf(viewOf(TASK_PANEL, language), 'SQ-5').widthSamples ?? []
    const states = WORDS.planActualStates.map((one) => one.text[language])
    const markers = ['DG-1', 'DG-2', 'DG-3', 'DG-4'].map((row) => WORDS.delayReportStatuses.find((one) => one.specTableRowId === row)?.text[language])
    expect(states.length, 'premise: the dictionary holds the five states').toBe(5)
    expect(markers.every((one) => one !== undefined), 'premise: the dictionary holds the DG-1 to DG-4 words').toBe(true)
    for (const word of [...states, ...markers.map((one) => one ?? '')]) expect(samples, word).toContain(word)
  })

  it('a filter on another column does not shrink the samples', () => {
    const narrowed = viewOf(withPanel({ word: 'alpha' }))
    expect(columnOf(narrowed, 'SQ-5').widthSamples).toEqual(columnOf(viewOf(TASK_PANEL), 'SQ-5').widthSamples)
  })
})

describe('FR-151 T-330 SV-18 / T-206 S-425 -- the floor is the filter mark plus the padding, and it follows the type size', () => {
  it('at the 9 px step it is about 29 px (T-206 S-425 says so, CR-737)', () => {
    expect(Math.abs(measuredWidthFloor(9) - 29)).toBeLessThanOrEqual(1)
  })

  it('it grows with the type size by at least the two 0.25em paddings', () => {
    const sizes = [9, 12, 16]
    for (const [small, large] of [[9, 12], [12, 16], [9, 16]] as const) {
      expect(sizes).toContain(small)
      expect(measuredWidthFloor(large) - measuredWidthFloor(small)).toBeGreaterThanOrEqual(0.5 * (large - small) - 1)
    }
  })

  it('a column never under its floor: a narrower dragged width is raised to the floor', () => {
    const sizing = unmeasuredSizing(16)
    const dragged = columnOf(viewOf(withWidth('SQ-1', 5)), 'SQ-1')
    expect(columnWidthPx(dragged, sizing)).toBeGreaterThanOrEqual(sizing.floor)
  })

  it('a column dragged wider than the floor keeps the dragged width, however the type size moves', () => {
    const wide = columnOf(viewOf(withWidth('SQ-1', 400)), 'SQ-1')
    for (const px of [9, 12, 16]) expect(columnWidthPx(wide, unmeasuredSizing(px))).toBe(400)
  })

  it('a measured column that was dragged is not measured again: its width stays when the measure changes', () => {
    const dragged = columnOf(viewOf(withWidth('SQ-5', 333)), 'SQ-5')
    const first = { floor: 23, measured: new Map([['SQ-5', 150]]) }
    const second = { floor: 23, measured: new Map([['SQ-5', 260]]) }
    expect(columnWidthPx(dragged, first)).toBe(333)
    expect(columnWidthPx(dragged, second)).toBe(333)
  })

  it('a measured column that was not dragged takes the measure, and the floor until there is one', () => {
    const column = columnOf(viewOf(TASK_PANEL), 'SQ-5')
    expect(column.width, 'premise: nothing dragged').toBeNull()
    expect(columnWidthPx(column, { floor: 23, measured: new Map([['SQ-5', 150]]) })).toBe(150)
    expect(columnWidthPx(column, { floor: 23, measured: new Map() })).toBe(23)
  })

  it('SQ-10 keeps its fixed width S-496 and the floor is not laid on it', () => {
    const fixed = Number(/^(\d+)px/.exec(cellOf('T-206', 'S-496', '既定'))?.[1])
    const visibility = columnOf(viewOf(TASK_PANEL), 'SQ-10')
    expect(columnWidthPx(visibility, { floor: 90, measured: new Map() })).toBe(fixed)
  })
})

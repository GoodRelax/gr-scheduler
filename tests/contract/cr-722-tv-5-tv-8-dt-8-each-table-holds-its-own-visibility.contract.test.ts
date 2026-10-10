// CR-722 spec-only contract: each table holds its own Visibility, first Show (TV-2, S-560, S-561, S-564, S-565, S-568, S-569), the eye IC-143 turns that table's Schedule Filter on and off (TV-5), turning off keeps the values (TV-8), and the report leads with DT-8.

import { describe, expect, it } from 'vitest'

import { tableAfterVisibilityChange, tableWithScheduleFilterToggled } from '../../src/adapter/screen-renderer/table-window'
import { tableViewOf, type TableView } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { ALL_SHOWN, ALPHA, BRAVO, CHARLIE, type TableVisibility } from './cr-722-stage'
import { OPENED_REPORT, TASK_PANEL, reportViewOf, viewOf, type Pane } from './cr-721-stage'
import { documentText, openedFrom } from './cr-723-stage'
import { specTable, unbroken } from './spec-table'

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

const TV_5_ON_OFF = '表のタイトルバーの `IC-143` を押すと、その表のスケジュールフィルタを掛け、もう一度押すと解除する。'
const TV_5_INDEPENDENT = '表どうしのスケジュールフィルタは独立である —— ほかの表のスケジュールフィルタは変えない。'
const TV_5_STAYS_ON = '掛けているあいだは、行をすべて「表示」に戻しても掛けたままとし、`IC-143` で解除できる'
const TV_8_VALUES_STAY = '解除しても表示の列の値は残る（利用者が定めた）'
const TV_2_WORDS_KEEP = '語・列のフィルタ・並べ替え・表の切り替えは表示の列の値を変えない —— 一覧に出ていない行の値も残る。'
const DT_8_VALUE = 'この表でのそのタスクの行の値（`FR-151` の 表 T-353 の `TV-2`）'
const RW_10_FIXED = '横は `DT-8`・`DT-1`・`DT-3`・`DT-4`（表示・ステータス・進捗・タスク —— 表 T-347 の並びで左の 4 列）を左に固定し'

describe('CR-722 the manuscript these cases are driven by', () => {
  it('T-353, T-347 and T-346 still say it, word for word', () => {
    expect(cellOf('T-353', 'TV-5', '定め')).toContain(TV_5_ON_OFF)
    expect(cellOf('T-353', 'TV-5', '定め')).toContain(TV_5_INDEPENDENT)
    expect(cellOf('T-353', 'TV-5', '定め')).toContain(TV_5_STAYS_ON)
    expect(cellOf('T-353', 'TV-8', '定め')).toContain(TV_8_VALUES_STAY)
    expect(cellOf('T-353', 'TV-2', '定め')).toContain(TV_2_WORDS_KEEP)
    expect(cellOf('T-347', 'DT-8', '値')).toBe(DT_8_VALUE)
    expect(cellOf('T-346', 'RW-10', '定め')).toContain(RW_10_FIXED)
  })
})

// WHY: CR-723 -- the Visibility is the table's view the document holds (FR-151), so a case reads it off the view.
const visibilityOf = (view: TableView): TableVisibility => view.visibility
const hiddenOf = (view: TableView): readonly number[] => [...visibilityOf(view).hiddenKeys].sort((a, b) => a - b)
const startingViewOf = (table: 'searchPanel' | 'delayDiagnosticsReport'): TableView => tableViewOf(openedFrom(documentText()).documentSettings, table)
const withView = (pane: Pane, view: TableView): Pane => ({ ...pane, view })

describe('FR-151 T-353 TV-2, S-560 / S-564 -- every table starts with every row Show and its Schedule Filter off', () => {
  it('the search table of a document holds a Visibility that hides nothing and is off', () => {
    expect(visibilityOf(startingViewOf('searchPanel'))).toEqual(ALL_SHOWN)
  })

  it('the report table of a document holds its own Visibility that hides nothing and is off', () => {
    expect(visibilityOf(startingViewOf('delayDiagnosticsReport'))).toEqual(ALL_SHOWN)
  })

  it('every search row reads Show before anything is pressed', () => {
    const rows = viewOf(withView(TASK_PANEL, startingViewOf('searchPanel'))).rows
    expect(rows.length, 'premise: the stage lists tasks').toBeGreaterThan(0)
    expect(rows.every((one) => one.shown === true)).toBe(true)
  })

  it('every report row reads Show before anything is pressed', () => {
    const rows = reportViewOf({ ...OPENED_REPORT, view: startingViewOf('delayDiagnosticsReport') }).rows
    expect(rows.length, 'premise: the report lists tasks').toBeGreaterThan(0)
    expect(rows.every((one) => one.shown === true)).toBe(true)
  })
})

describe(`FR-151 T-353 TV-6 / TV-2 -- tableAfterVisibilityChange puts rows in and out of Hide`, () => {
  it('taking two rows out makes them Hide and leaves the Schedule Filter as it was', () => {
    const out = tableAfterVisibilityChange(TASK_PANEL.view, [ALPHA, BRAVO], false)
    expect(hiddenOf(out)).toEqual([ALPHA, BRAVO])
    expect(visibilityOf(out).isApplied).toBe(false)
  })

  it('putting one back makes only that row Show again', () => {
    const out = tableAfterVisibilityChange(tableAfterVisibilityChange(TASK_PANEL.view, [ALPHA, BRAVO], false), [ALPHA], true)
    expect(hiddenOf(out)).toEqual([BRAVO])
  })

  it(`${TV_2_WORDS_KEEP.slice(0, 30)} -- the word does not touch the values`, () => {
    const out = tableAfterVisibilityChange(TASK_PANEL.view, [CHARLIE], false)
    const worded: Pane = { panel: { ...TASK_PANEL.panel, word: 'alpha' }, view: out }
    expect(hiddenOf(worded.view)).toEqual([CHARLIE])
    expect(viewOf(worded).rows.every((one) => one.shown === true), 'the listed row Alpha is Show').toBe(true)
  })

  it('a Hide row reads Hide in the search view', () => {
    const out = tableAfterVisibilityChange(TASK_PANEL.view, [BRAVO], false)
    const shown = viewOf(withView(TASK_PANEL, out)).rows.map((one) => one.shown)
    expect(shown).toEqual([true, false, true])
  })
})

describe(`FR-151 T-353 TV-5 -- ${TV_5_ON_OFF.slice(0, 40)}`, () => {
  const hiddenView = (): TableView => tableAfterVisibilityChange(TASK_PANEL.view, [ALPHA], false)

  it('IC-143 turns the Schedule Filter on, and again off', () => {
    const on = tableWithScheduleFilterToggled(hiddenView())
    expect(visibilityOf(on).isApplied).toBe(true)
    expect(visibilityOf(tableWithScheduleFilterToggled(on)).isApplied).toBe(false)
  })

  it(`${TV_5_STAYS_ON.slice(0, 30)} -- putting every row back to Show keeps it on`, () => {
    const on = tableWithScheduleFilterToggled(hiddenView())
    const back = tableAfterVisibilityChange(on, [ALPHA], true)
    expect(hiddenOf(back)).toEqual([])
    expect(visibilityOf(back).isApplied).toBe(true)
  })

  it(`TV-8: ${TV_8_VALUES_STAY} -- turning off keeps the Hide rows`, () => {
    const off = tableWithScheduleFilterToggled(tableWithScheduleFilterToggled(hiddenView()))
    expect(hiddenOf(off)).toEqual([ALPHA])
  })

  it('the report table turns on and off by the same function, apart from the search table', () => {
    const report = tableWithScheduleFilterToggled(tableAfterVisibilityChange(OPENED_REPORT.view, [BRAVO], false))
    expect(visibilityOf(report).isApplied).toBe(true)
    expect(visibilityOf(TASK_PANEL.view).isApplied, TV_5_INDEPENDENT).toBe(false)
  })
})

describe(`FR-134 T-347 DT-8, T-346 RW-10 -- the report table leads with the Visibility column`, () => {
  it('DT-8 is the first column of the report and the first four columns are fixed', () => {
    const columns = reportViewOf(OPENED_REPORT).columns
    expect(columns.map((one) => one.column).slice(0, 4)).toEqual(['DT-8', 'DT-1', 'DT-3', 'DT-4'])
    expect(columns.slice(0, 4).every((one) => one.isFixed)).toBe(true)
    expect(columns.slice(4).some((one) => one.isFixed)).toBe(false)
  })

  it('a report row made Hide reads Hide', () => {
    const pane = { ...OPENED_REPORT, view: tableAfterVisibilityChange(OPENED_REPORT.view, [BRAVO], false) }
    const rows = reportViewOf(pane).rows
    const of = (uid: number): boolean | undefined => rows.find((one) => one.target.kind === 'task' && one.target.taskUid === uid)?.shown
    expect(of(BRAVO)).toBe(false)
    expect(of(ALPHA)).toBe(true)
  })
})

// CR-798 / CR-800 spec-only contract: every row of the three tables starts unchecked (TV-2, TV-9, TV-13, S-561, S-565, S-569, S-570), the Schedule Filter draws only the checked rows (TV-1, TV-2, TV-13), the eye is off only while nothing is checked and works with every row checked (TV-5), the check column holds a heading box and no funnel (SV-7, SQ-10, DT-8, RQ-1), the box checks the listed rows and then clears every row (SQ-10), the check column keeps no column filter (S-562) and a jump to an undrawn task checks its row (SJ-0).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { DisplayLanguage, SearchFilterChange, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
} from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_RESOURCE_LIST,
  resourceListAfterEntry,
  resourceListAfterFilterChange,
  resourceListFromWindow,
  type ResourceListView,
} from '../../src/adapter/screen-renderer/resource-list'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { Document } from '../../src/entity/document-model/document/document'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { tableViewsOnTheirColumns } from '../../src/adapter/screen-renderer/screen-renderer'
import { drawnTaskUidsOf, shownTasksHoldOf } from '../../src/framework/single-html-shell/shown-tasks-hold'
import startupTemplate from '../../src/framework/single-html-shell/startup-template.json'
import {
  NO_ROW_CHECKED,
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { tableViewOf } from '../../src/use-case/edit-document/edit-document-settings'

import { ALPHA, BRAVO, CHARLIE, DELTA, ECHO, IDLE, SATO, TANAKA, documentText } from './cr-723-fixture'
import { specTable, unbroken } from './spec-table'

type Loose = Record<string, unknown>
type TableName = 'searchPanel' | 'delayDiagnosticsReport' | 'resourceList'
type Visibility = TableView['visibility']

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8'))
const REQUIREMENTS = read('01-04-requirements.md')
const GLOSSARY = read('_assets', 'tbl-glossary.md')
const SETTINGS_BOOK = read('_assets', 'tbl-settings.md')

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return unbroken(row.by[heading] ?? '')
}

const found = <T>(value: T | undefined | null, what: string): T => {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

const TV_2_STARTS = '初めはどの表のどの行もチェックが外れている（「非表示」）。'
const TV_2_KEPT = '文書が持つのは、チェックの入った行の一覧である'
const TV_5_NOTHING_CHECKED = '掛けていないあいだ、その表にチェックの入った行が 1 つも無いときは、`IC-143` を効かなくし、その理由を説明に出す（`FR-092`）'
const TV_5_STAYS_ON = '掛けているあいだは、行をすべて「表示」にしても、すべての行のチェックを外しても掛けたままとし'
const TV_9_DEFAULT = '見え方を持たない文書（新規・MSPDI）は既定 —— どの行もチェックが外れ（「非表示」）'
const TV_13_UNASSIGNED = '（担当なし）の行も、初めはチェックが外れている（`TV-2`）'
const SV_7_NO_ENTRANCE = '⭐ [表示] の列の見出しには `IC-122` を置かず、見出しのチェックボックスだけを置く（`SQ-10` —— 利用者が定めた）。'
const SV_7_NO_GREEN = '[表示] の列は列のフィルタを持たないので、その見出しのセルを本段の終わりの緑で塗ることは無い。'
const SQ_10_HEADING_STATES =
  '見出しのセルは、入っている・空 の 2 つの状態のチェックボックスだけである —— 表の行のどれか 1 つにでもチェックが入っていれば、その行が一覧に出ていても出ていなくても入っているとし、1 つも無ければ空とする（初めは空 —— 利用者が定めた）。'
const SQ_10_HEADING_ADD = '空のときに押すと、一覧に出ている行をすべて入れ、一覧に出ていない行は変えない。'
const SQ_10_HEADING_CLEAR = '入っているときに押すと、表のすべての行（語や列のフィルタで一覧に出ていない行も）のチェックを外す（利用者が定めた）。'
const SJ_0_CHECK = '検索の表とレポートの表で、そのタスクの行だけを「表示」にし（チェックを入れ）'
const S_562_NONE = '表示の列（表 T-331 の `SQ-10`・表 T-347 の `DT-8`・表 T-371 の `RQ-1`）は列のフィルタを持たない（`SV-7`）'

describe('CR-798 the manuscript these cases are driven by', () => {
  it('T-353, T-330 and T-203 still say it, word for word', () => {
    expect(cellOf('T-353', 'TV-2', '定め')).toContain(TV_2_STARTS)
    expect(cellOf('T-353', 'TV-2', '定め')).toContain(TV_2_KEPT)
    expect(cellOf('T-353', 'TV-5', '定め')).toContain(TV_5_NOTHING_CHECKED)
    expect(cellOf('T-353', 'TV-5', '定め')).toContain(TV_5_STAYS_ON)
    expect(cellOf('T-353', 'TV-9', '定め')).toContain(TV_9_DEFAULT)
    expect(cellOf('T-353', 'TV-13', '定め')).toContain(TV_13_UNASSIGNED)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_NO_ENTRANCE)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_NO_GREEN)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_STATES)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_ADD)
    expect(cellOf('T-331', 'SQ-10', '書き方')).toContain(SQ_10_HEADING_CLEAR)
    expect(cellOf('T-332', 'SJ-0', '定め')).toContain(SJ_0_CHECK)
    expect(SETTINGS_BOOK).toContain(S_562_NONE)
    expect(GLOSSARY).toContain('| IC-125 |')
    expect(GLOSSARY).toContain('| IC-126 |')
    expect(REQUIREMENTS).toContain('| SQ-10 |')
  })

  it('S-561 / S-565 / S-569 / S-570 name the saved keys and their defaults', () => {
    const row = (id: string): string => SETTINGS_BOOK.split('\n').find((line) => line.startsWith(`| ${id} |`)) ?? ''
    expect(row('S-561')).toContain('`tableViews.searchPanel.shownTaskUids`')
    expect(row('S-561')).toContain('`[]`')
    expect(row('S-565')).toContain('`tableViews.delayDiagnosticsReport.shownTaskUids`')
    expect(row('S-569')).toContain('`tableViews.resourceList.shownResourceUids`')
    expect(row('S-570')).toContain('`tableViews.resourceList.isUnassignedShown`')
    expect(row('S-570')).toContain('`false`')
  })
})

const TEMPLATE_VERSION = (startupTemplate as { schemaVersion: string }).schemaVersion
const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }
const LAYOUT = { canvas: CANVAS, textSizeStep: 1 }
const ALL_TASKS: readonly number[] = [ALPHA, BRAVO, CHARLIE, DELTA, ECHO]
const ALL_RESOURCES: readonly number[] = [SATO, TANAKA, IDLE]
const UNASSIGNED = 'unassigned'

function openedFrom(text: string): Document {
  const opened = documentFromJson(text, TEMPLATE_VERSION)
  if (!opened.ok) throw new Error(`refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

// WHY: Alpha and Charlie are Sato's, Bravo and Delta Tanaka's, Echo is nobody's and Idle carries no task (cr-723-fixture).
const WITHOUT_VIEWS = documentText({ tableViews: undefined })
const DOCUMENT = openedFrom(WITHOUT_VIEWS)
const SCHEDULE: Schedule = DOCUMENT.schedule

const startOf = (table: TableName, document: Document = DOCUMENT): TableView => tableViewOf(document.documentSettings, table)

const visibilityOf = (part: Partial<Visibility>): Visibility => ({ ...NO_ROW_CHECKED, ...part })
const viewWith = (view: TableView, part: Partial<Visibility>): TableView => ({ ...view, visibility: { ...view.visibility, ...part } })
const sorted = (uids: readonly number[]): readonly number[] => [...uids].sort((a, b) => a - b)

const step = (session: ScreenSession, type: string): ScreenSession => advanceScreenSession(session, { type } as unknown as SessionEvent).state

function sessionIn(language: DisplayLanguage = 'ja'): ScreenSession {
  const shown = step(emptyScreenSession, 'searchEntryPressed')
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}

interface Pane {
  readonly panel: SearchPanelSession
  readonly view: TableView
}

const searchPane = (view: TableView = startOf('searchPanel'), word = ''): Pane => ({ panel: { ...emptySearchPanelSession, table: 'tasks', word }, view })

const searchViewOf = (pane: Pane): SearchPanelView =>
  found(searchPanelFromSession(sessionIn(), pane.panel, pane.view, SCHEDULE, CANVAS), 'a view of the shown Search Panel')

const searchRowUids = (view: SearchPanelView): readonly number[] => view.rows.map((one) => (one.target.kind === 'task' ? one.target.taskUid : -1))

const searchOpened = (pane: Pane, column: string): Pane => ({
  panel: found(searchPanelWithFilterOpened(sessionIn(), pane.panel, pane.view, column), `the panel after IC-122 on ${column}`),
  view: pane.view,
})

const searchPressed = (pane: Pane, entry: string): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterEntry(sessionIn(), pane.panel, pane.view, entry as never, SCHEDULE), `the view after ${entry}`),
})

const searchChanged = (pane: Pane, change: SearchFilterChange): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterChange(sessionIn(), pane.panel, pane.view, change), `the view after ${JSON.stringify(change)}`),
})

const reportTask = (uid: number, name: string, start: string, extra: Loose = {}): Loose => ({
  uid,
  name,
  start: `${start}T08:00:00`,
  finish: `${start}T17:00:00`,
  milestone: false,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
  ...extra,
})

const REPORT_SCHEDULE = {
  tasks: [
    reportTask(ALPHA, 'Alpha', '2026-03-02'),
    reportTask(BRAVO, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(CHARLIE, 'Charlie', '2026-02-02'),
  ],
  project: { minutesPerDay: null },
  resources: [],
  assignments: [],
} as unknown as Schedule

const REPORT = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [{ row: 'VC-3', kind: 'contradiction', layer: 1, uid: ALPHA, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null }],
  bottlenecks: [
    {
      uid: BRAVO,
      name: 'Bravo',
      inheritedDelayMinutes: 480,
      selfDelayMinutes: 960,
      pushOutMinutes: 2400,
      terminalsReached: 2,
      path: [CHARLIE, BRAVO],
    },
  ],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [
    { uid: ALPHA, row: 'DG-1' },
    { uid: BRAVO, row: 'DG-2' },
  ],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
} as unknown as DelayDiagnosticsReport

interface ReportPane {
  readonly window: DelayDiagnosticsReportWindow
  readonly view: TableView
}

const reportPane = (view: TableView = startOf('delayDiagnosticsReport'), word = ''): ReportPane => ({
  window: { ...OPENED_DELAY_DIAGNOSTICS_REPORT, panel: { ...OPENED_DELAY_DIAGNOSTICS_REPORT.panel, word } },
  view,
})

const reportViewOf = (pane: ReportPane): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow({ screen: { screenLanguage: 'ja' } } as unknown as ScreenSession, pane.window, pane.view, REPORT, REPORT_SCHEDULE, LAYOUT),
    'a view of the report window',
  )

const reportRowUids = (view: DelayDiagnosticsReportView): readonly number[] => view.rows.map((one) => (one.target.kind === 'task' ? one.target.taskUid : -1))

function reportAfter(pane: ReportPane, entry: string, column: string | null): ReportPane {
  const after = found(
    delayDiagnosticsReportAfterEntry(pane.window, pane.view, entry as never, column, { report: REPORT, schedule: REPORT_SCHEDULE, language: 'ja' }),
    `the report after ${entry}`,
  )
  return { window: found(after.window, `the report window after ${entry}`) as DelayDiagnosticsReportWindow, view: after.view }
}

interface ListPane {
  readonly window: typeof OPENED_RESOURCE_LIST
  readonly view: TableView
}

const listPane = (view: TableView = startOf('resourceList'), word = ''): ListPane => ({
  window: { ...OPENED_RESOURCE_LIST, panel: { ...OPENED_RESOURCE_LIST.panel, word } },
  view,
})

const listViewOf = (pane: ListPane): ResourceListView =>
  found(resourceListFromWindow(sessionIn(), pane.window, pane.view, SCHEDULE, [], LAYOUT), 'a view of the Resource List')

function listAfter(pane: ListPane, entry: string, column: string | null): ListPane {
  const after = found(
    resourceListAfterEntry(pane.window, pane.view, entry as never, column, { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' }),
    `the Resource List after ${entry}`,
  )
  return { window: found(after.window, `the Resource List window after ${entry}`), view: after.view }
}

describe(`FR-151 T-353 TV-9 -- ${TV_9_DEFAULT}`, () => {
  it.each(['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const)('a document without views holds nothing checked in %s (S-561 / S-565 / S-569 / S-570 default [] / false)', (table) => {
    const view = startOf(table)
    expect(view.visibility.shownTaskUids).toEqual([])
    expect(view.visibility.shownResourceUids).toEqual([])
    expect(view.visibility.isUnassignedShown).toBe(false)
    expect(view.visibility.isScheduleFilterApplied).toBe(false)
    expect(view.columnFilters).toEqual([])
    expect(view.sort).toBeNull()
  })

  it('the document as shipped (the startup template) holds nothing checked either', () => {
    const shipped = openedFrom(documentText())
    for (const table of ['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const) {
      const view = startOf(table, shipped)
      expect(view.visibility, `${table} of the shipped document`).toEqual({
        shownTaskUids: [],
        shownResourceUids: [],
        isUnassignedShown: false,
        isScheduleFilterApplied: false,
      })
    }
  })

  it('the default the screen holds for a table with no document yet is the same: nothing checked, no filter', () => {
    expect(NO_ROW_CHECKED).toEqual({ shownTaskUids: [], shownResourceUids: [], isUnassignedShown: false, isScheduleFilterApplied: false })
  })
})

describe(`FR-151 T-353 TV-2 / T-203 S-561 / S-565 / S-569 / S-570 -- ${TV_2_KEPT}`, () => {
  const SAVED: Record<TableName, Loose> = {
    searchPanel: { shownTaskUids: [ALPHA, CHARLIE], columnFilters: [], isScheduleFilterApplied: true, sort: null },
    delayDiagnosticsReport: { shownTaskUids: [BRAVO], columnFilters: [], isScheduleFilterApplied: false, sort: null },
    resourceList: { shownResourceUids: [TANAKA], isUnassignedShown: true, columnFilters: [], isScheduleFilterApplied: false, sort: null },
  }

  it('the checked rows are read back from the saved keys, and written back under the same keys', () => {
    const document = openedFrom(documentText({ tableViews: SAVED }))
    expect(sorted(startOf('searchPanel', document).visibility.shownTaskUids)).toEqual([ALPHA, CHARLIE])
    expect(startOf('searchPanel', document).visibility.isScheduleFilterApplied).toBe(true)
    expect(startOf('delayDiagnosticsReport', document).visibility.shownTaskUids).toEqual([BRAVO])
    expect(startOf('resourceList', document).visibility.shownResourceUids).toEqual([TANAKA])
    expect(startOf('resourceList', document).visibility.isUnassignedShown).toBe(true)

    const saved = JSON.parse(jsonFromDocument(document)) as { documentSettings: { tableViews: Record<string, Loose> } }
    const views = saved.documentSettings.tableViews
    expect(views['searchPanel']?.['shownTaskUids']).toEqual([ALPHA, CHARLIE])
    expect(views['delayDiagnosticsReport']?.['shownTaskUids']).toEqual([BRAVO])
    expect(views['resourceList']?.['shownResourceUids']).toEqual([TANAKA])
    expect(views['resourceList']?.['isUnassignedShown']).toBe(true)
  })

  it('a document with nothing checked saves the empty lists and false, and keeps no key of the old rule', () => {
    const saved = JSON.parse(jsonFromDocument(DOCUMENT)) as { documentSettings: { tableViews?: Record<string, Loose> } }
    const views = saved.documentSettings.tableViews ?? {}
    for (const table of ['searchPanel', 'delayDiagnosticsReport'] as const) {
      expect(views[table]?.['shownTaskUids'] ?? [], `${table}.shownTaskUids`).toEqual([])
      expect(views[table] ?? {}, `${table} keeps no hiddenTaskUids`).not.toHaveProperty('hiddenTaskUids')
    }
    expect(views['resourceList']?.['shownResourceUids'] ?? [], 'resourceList.shownResourceUids').toEqual([])
    expect(views['resourceList']?.['isUnassignedShown'] ?? false, 'resourceList.isUnassignedShown').toBe(false)
    expect(views['resourceList'] ?? {}, 'resourceList keeps no hiddenResourceUids').not.toHaveProperty('hiddenResourceUids')
    expect(views['resourceList'] ?? {}, 'resourceList keeps no isUnassignedHidden').not.toHaveProperty('isUnassignedHidden')
  })
})

describe(`FR-151 T-353 TV-2 / TV-13 -- ${TV_2_STARTS} (${TV_13_UNASSIGNED})`, () => {
  it('SQ-10: every row of the Search Panel reads unchecked before anything is pressed', () => {
    const rows = searchViewOf(searchPane()).rows
    expect(rows.length, 'premise: the stage lists tasks').toBe(ALL_TASKS.length)
    expect(rows.every((one) => one.isShown === false)).toBe(true)
  })

  it('SQ-10: the heading box reads empty', () => {
    expect(searchViewOf(searchPane()).showHeading).toBe('empty')
  })

  it('DT-8: every row of the report reads unchecked before anything is pressed', () => {
    const rows = reportViewOf(reportPane()).rows
    expect(rows.length, 'premise: the report lists tasks').toBeGreaterThan(0)
    expect(rows.every((one) => (one as { isShown?: boolean }).isShown === false)).toBe(true)
  })

  it('RQ-1 / TV-13: every row of the Resource List reads unchecked, the (Unassigned) row included', () => {
    const rows = listViewOf(listPane()).rows
    expect(rows.map((one) => one.key)).toEqual([SATO, TANAKA, IDLE, UNASSIGNED])
    expect(rows.every((one) => one.isShown === false)).toBe(true)
  })

  it('a row reads checked once its uid is in the held list, and the others stay unchecked', () => {
    const search = searchViewOf(searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: [BRAVO] })))
    expect(search.rows.map((one) => one.isShown)).toEqual([false, true, false, false, false])
    const list = listViewOf(listPane(viewWith(startOf('resourceList'), { shownResourceUids: [TANAKA], isUnassignedShown: true })))
    expect(list.rows.map((one) => one.isShown)).toEqual([false, true, false, true])
  })
})

const applied = (part: Partial<Visibility> = {}): Visibility => visibilityOf({ isScheduleFilterApplied: true, ...part })

function drawn(
  tables: {
    readonly search?: Visibility
    readonly report?: Visibility
    readonly reportTaskUids?: readonly number[] | null
    readonly list?: Visibility
  },
  schedule: Schedule = SCHEDULE,
): readonly number[] | null {
  const made = drawnTaskUidsOf(
    schedule,
    tables.search ?? NO_ROW_CHECKED,
    tables.report ?? NO_ROW_CHECKED,
    tables.reportTaskUids === undefined || tables.reportTaskUids === null ? null : new Set(tables.reportTaskUids),
    tables.list ?? NO_ROW_CHECKED,
    new Set<number>(),
  )
  return made === null ? null : sorted([...made])
}

describe('FR-151 T-353 TV-1 / TV-2 -- 日程表には、スケジュールフィルタを掛けた表のどれもが「表示」とするタスク（積）だけを描く', () => {
  it('no table applies its filter: every task is drawn (the unchecked start does not hide anything)', () => {
    expect(drawn({})).toBeNull()
  })

  it('SQ-10: the Search Panel applied draws only the checked tasks', () => {
    expect(drawn({ search: applied({ shownTaskUids: [ALPHA, CHARLIE] }) })).toEqual([ALPHA, CHARLIE])
  })

  it('SQ-10 / TV-5: the Search Panel applied with nothing checked draws nothing at all', () => {
    expect(drawn({ search: applied() })).toEqual([])
  })

  it('a table that is not applied does not filter, whatever its checks hold', () => {
    expect(drawn({ search: visibilityOf({ shownTaskUids: [ALPHA] }) })).toBeNull()
  })

  it('DT-8: the report applied draws only the checked tasks that the report carries', () => {
    expect(drawn({ report: applied({ shownTaskUids: [BRAVO, DELTA] }), reportTaskUids: [ALPHA, BRAVO, CHARLIE] })).toEqual([BRAVO])
  })

  it('DT-8: the report applied with nothing checked draws nothing', () => {
    expect(drawn({ report: applied(), reportTaskUids: [ALPHA, BRAVO, CHARLIE] })).toEqual([])
  })

  it('the drawn set is the product of the applied tables', () => {
    expect(
      drawn({
        search: applied({ shownTaskUids: [ALPHA, BRAVO, CHARLIE] }),
        report: applied({ shownTaskUids: [BRAVO, CHARLIE, DELTA] }),
        reportTaskUids: [ALPHA, BRAVO, CHARLIE, DELTA],
      }),
    ).toEqual([BRAVO, CHARLIE])
  })
})

describe('FR-151 T-353 TV-13 -- 担当リストの表がタスクを「表示」とするのは、そのタスクの担当のうち 1 人でも行が「表示」のとき', () => {
  it('RQ-1: a task is drawn when one of its assignees is checked', () => {
    expect(drawn({ list: applied({ shownResourceUids: [SATO] }) })).toEqual([ALPHA, CHARLIE])
  })

  it('RQ-1: a task of two assignees is drawn when only one of them is checked', () => {
    const twoHands = openedFrom(documentText({ tableViews: undefined }, assignmentsPlus(CHARLIE, TANAKA))).schedule
    expect(drawn({ list: applied({ shownResourceUids: [TANAKA] }) }, twoHands)).toEqual([BRAVO, CHARLIE, DELTA])
  })

  it('RQ-1: a task of two assignees is not drawn when neither of them is checked', () => {
    const twoHands = openedFrom(documentText({ tableViews: undefined }, assignmentsPlus(CHARLIE, TANAKA))).schedule
    expect(drawn({ list: applied({ shownResourceUids: [IDLE] }) }, twoHands)).toEqual([])
  })

  it('RQ-1 / TV-13: a task nobody is assigned to is drawn only when the (Unassigned) row is checked', () => {
    expect(drawn({ list: applied({ shownResourceUids: [SATO] }) })).not.toContain(ECHO)
    expect(drawn({ list: applied({ isUnassignedShown: true }) })).toEqual([ECHO])
  })

  it('RQ-1: the (Unassigned) row checked does not draw the assigned tasks', () => {
    expect(drawn({ list: applied({ isUnassignedShown: true, shownResourceUids: [TANAKA] }) })).toEqual([BRAVO, DELTA, ECHO])
  })

  it('RQ-1 / TV-5: the Resource List applied with nothing checked draws nothing, not even the unassigned tasks', () => {
    expect(drawn({ list: applied() })).toEqual([])
  })
})

// WHY: one more Assignment on the fixture's schedule, so a task has two assignees.
function assignmentsPlus(taskUid: number, resourceUid: number): Loose {
  const schedule = JSON.parse(JSON.stringify((JSON.parse(documentText()) as { schedule: Loose }).schedule)) as Loose
  const first = (schedule['assignments'] as Loose[])[0] as Loose
  ;(schedule['assignments'] as Loose[]).push({ ...first, uid: 2999, taskUid, resourceUid })
  return schedule
}

interface EyeReading {
  readonly isEnabled: boolean
  readonly refusals: readonly { readonly icon: string; readonly reason: string }[]
}

function eyeOf(view: { readonly titleEntries: SearchPanelView['titleEntries']; readonly tableEntries?: SearchPanelView['tableEntries']; readonly entryRefusals?: SearchPanelView['entryRefusals'] }): EyeReading {
  const entry = [...view.titleEntries, ...(view.tableEntries ?? [])].find((one) => one.icon === 'IC-143')
  return { isEnabled: found(entry, 'the eye IC-143 among the title bar entries').isEnabled, refusals: (view.entryRefusals ?? []).filter((one) => one.icon === 'IC-143') }
}

// WHY: the three tables answer the same question from their own views, so one case table walks them.
const EYE_OF: Readonly<Record<TableName, (part: Partial<Visibility>) => EyeReading>> = {
  searchPanel: (part) => eyeOf(searchViewOf(searchPane(viewWith(startOf('searchPanel'), part)))),
  delayDiagnosticsReport: (part) => eyeOf(reportViewOf(reportPane(viewWith(startOf('delayDiagnosticsReport'), part)))),
  resourceList: (part) => eyeOf(listViewOf(listPane(viewWith(startOf('resourceList'), part)))),
}
const SOME_CHECKED: Readonly<Record<TableName, Partial<Visibility>>> = {
  searchPanel: { shownTaskUids: [ALPHA] },
  delayDiagnosticsReport: { shownTaskUids: [ALPHA] },
  resourceList: { shownResourceUids: [SATO] },
}

describe.each(['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const)(`FR-151 T-353 TV-5 / JDG-2820 (%s) -- ${TV_5_NOTHING_CHECKED.slice(0, 50)}`, (table) => {
  it('not applied and no row checked: IC-143 is disabled, and a reason stands in the refusals (FR-092)', () => {
    const eye = EYE_OF[table]({})
    expect(eye.isEnabled).toBe(false)
    expect(eye.refusals.length, 'one refusal names IC-143').toBe(1)
    expect(eye.refusals[0]?.reason.trim().length, 'the reason is a word').toBeGreaterThan(0)
  })

  it('not applied and some rows checked: IC-143 is enabled and no refusal names it', () => {
    const eye = EYE_OF[table](SOME_CHECKED[table])
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it(`${TV_5_STAYS_ON.slice(0, 30)} -- applied with every row unchecked: IC-143 stays enabled, so pressing releases`, () => {
    const eye = EYE_OF[table]({ isScheduleFilterApplied: true })
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('applied with some rows checked: IC-143 is enabled', () => {
    expect(EYE_OF[table]({ ...SOME_CHECKED[table], isScheduleFilterApplied: true }).isEnabled).toBe(true)
  })
})

// WHY: CR-800 JDG-2825 -- one checked row is enough; a table with every row checked draws the same as the table without the filter, and the eye still works.
const EVERY_CHECKED: Readonly<Record<TableName, () => Partial<Visibility>>> = {
  searchPanel: () => ({ shownTaskUids: ALL_TASKS }),
  delayDiagnosticsReport: () => ({ shownTaskUids: [...new Set(reportRowUids(reportViewOf(reportPane())))] }),
  resourceList: () => ({ shownResourceUids: ALL_RESOURCES, isUnassignedShown: true }),
}

describe.each(['searchPanel', 'delayDiagnosticsReport', 'resourceList'] as const)('FR-151 T-353 TV-5 / JDG-2825 (%s) -- every row checked: IC-143 is enabled', (table) => {
  it('not applied and every row checked: IC-143 is enabled and no refusal names it', () => {
    const eye = EYE_OF[table](EVERY_CHECKED[table]())
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })

  it('applied and every row checked: IC-143 stays enabled, so pressing releases', () => {
    const eye = EYE_OF[table]({ ...EVERY_CHECKED[table](), isScheduleFilterApplied: true })
    expect(eye.isEnabled).toBe(true)
    expect(eye.refusals).toEqual([])
  })
})

describe('FR-151 T-353 TV-5 / JDG-2825 -- pressing the eye with every row checked applies the filter', () => {
  it('SQ-10: the Search Panel', () => {
    const pane = searchPane(viewWith(startOf('searchPanel'), EVERY_CHECKED.searchPanel()))
    expect(searchPressed(pane, 'IC-143').view.visibility.isScheduleFilterApplied).toBe(true)
  })

  it('DT-8: the report', () => {
    const pane = reportPane(viewWith(startOf('delayDiagnosticsReport'), EVERY_CHECKED.delayDiagnosticsReport()))
    expect(reportAfter(pane, 'IC-143', null).view.visibility.isScheduleFilterApplied).toBe(true)
  })

  it('RQ-1: the Resource List', () => {
    const pane = listPane(viewWith(startOf('resourceList'), EVERY_CHECKED.resourceList()))
    expect(listAfter(pane, 'IC-143', null).view.visibility.isScheduleFilterApplied).toBe(true)
  })

  it('RQ-1: the (Unassigned) row alone is a checked row, so the eye works', () => {
    expect(EYE_OF.resourceList({ isUnassignedShown: true }).isEnabled).toBe(true)
  })
})

function menuOf(view: { readonly filterMenu: SearchPanelView['filterMenu'] }): NonNullable<SearchPanelView['filterMenu']> {
  return found(view.filterMenu, 'an open filter')
}

describe(`FR-151 T-330 SV-7 -- ${SV_7_NO_ENTRANCE.slice(0, 40)}`, () => {
  it('SQ-10: IC-122 on the check column opens nothing, and no entry is answered without an open filter', () => {
    expect(searchPanelWithFilterOpened(sessionIn(), searchPane().panel, searchPane().view, 'SQ-10')).toBeNull()
    expect(searchViewOf(searchPane()).filterMenu).toBeNull()
    for (const entry of ['IC-125', 'IC-126']) {
      expect(searchPanelAfterFilterEntry(sessionIn(), searchPane().panel, searchPane().view, entry as never, SCHEDULE), entry).toBeNull()
    }
  })

  it('DT-8: IC-122 on the check column of the report opens nothing', () => {
    const pane = reportPane()
    const step = delayDiagnosticsReportAfterEntry(pane.window, pane.view, 'IC-122' as never, 'DT-8', { report: REPORT, schedule: REPORT_SCHEDULE, language: 'ja' })
    expect(step).toBeNull()
    expect(reportViewOf(pane).filterMenu).toBeNull()
  })

  it('RQ-1: IC-122 on the check column of the Resource List opens nothing', () => {
    const pane = listPane()
    const step = resourceListAfterEntry(pane.window, pane.view, 'IC-122' as never, 'RQ-1', { schedule: SCHEDULE, chosenResourceUids: [], language: 'ja' })
    expect(step).toBeNull()
    expect(listViewOf(pane).filterMenu).toBeNull()
  })

  it('a column that is not the check column still opens its value list (SV-7 is unchanged elsewhere)', () => {
    const menu = menuOf(searchViewOf(searchOpened(searchPane(), 'SQ-1')))
    expect(menu.kind).toBe('values')
  })
})

// WHY: CR-801 -- an empty box raises isShown true (adds the listed rows), a checked box raises isShown false (clears every row); a case names the listed keys as the drawn box would.
const headingChange = (keys: readonly (number | 'unassigned')[], isShown: boolean): SearchFilterChange =>
  ({ kind: 'shown', column: 'SQ-10', keys, isShown, isHeading: true }) as unknown as SearchFilterChange

describe(`FR-151 T-331 SQ-10 -- ${SQ_10_HEADING_ADD.slice(0, 30)} (the Search Panel)`, () => {
  const listedOf = (pane: Pane): readonly number[] => searchRowUids(searchViewOf(pane))
  const press = (pane: Pane, isShown: boolean): Pane => searchChanged(pane, headingChange(listedOf(pane), isShown))

  it('the heading box checks every listed row from an unchecked start', () => {
    const after = press(searchPane(), true)
    expect(sorted(after.view.visibility.shownTaskUids)).toEqual(ALL_TASKS)
    expect(searchViewOf(after).showHeading).toBe('checked')
  })

  // WHY: CR-801 -- one checked row is enough for a checked box, so the host raises isShown false and the press clears the table.
  it('one listed row checked: the box is checked and the press clears every row', () => {
    const some = searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: [ALPHA] }))
    expect(searchViewOf(some).showHeading).toBe('checked')
    const after = press(some, false)
    expect(after.view.visibility.shownTaskUids).toEqual([])
    expect(searchViewOf(after).showHeading).toBe('empty')
  })

  it('with a word and nothing checked, the press checks the listed rows only', () => {
    const narrowed = searchPane(startOf('searchPanel'), 'alpha')
    expect(listedOf(narrowed), 'premise: the word lists one row').toEqual([ALPHA])
    expect(searchViewOf(narrowed).showHeading, 'premise: the box is empty').toBe('empty')
    expect(sorted(press(narrowed, true).view.visibility.shownTaskUids)).toEqual([ALPHA])
  })

  it('with a column filter, the press leaves the rows the filter keeps out as they were', () => {
    const base = searchOpened(searchPane(), 'SQ-1')
    const menu = menuOf(searchViewOf(base))
    if (menu.kind !== 'values') throw new Error('the name column lists no values')
    const alpha = found(menu.values.find((one) => one.label === 'Alpha'), 'the value Alpha of the task column')
    const filtered = searchChanged(base, { kind: 'value', column: 'SQ-1', value: alpha.value, isShown: false })
    expect(listedOf(filtered), 'premise: Alpha is out of the list').not.toContain(ALPHA)
    expect(sorted(press(filtered, true).view.visibility.shownTaskUids)).toEqual(sorted(listedOf(filtered)))
  })

  it('every listed row checked: the press clears every row of the table, the rows the word keeps out of the list as well', () => {
    const all = searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: ALL_TASKS }), 'alpha')
    expect(listedOf(all), 'premise: the word lists one row').toEqual([ALPHA])
    expect(searchViewOf(all).showHeading, 'premise: the box is checked').toBe('checked')
    expect(press(all, false).view.visibility.shownTaskUids).toEqual([])
  })

  it('every listed row checked: the press clears the rows a column filter keeps out of the list as well', () => {
    const base = searchOpened(searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: ALL_TASKS })), 'SQ-1')
    const menu = menuOf(searchViewOf(base))
    if (menu.kind !== 'values') throw new Error('the name column lists no values')
    const alpha = found(menu.values.find((one) => one.label === 'Alpha'), 'the value Alpha of the task column')
    const filtered = searchChanged(base, { kind: 'value', column: 'SQ-1', value: alpha.value, isShown: false })
    expect(listedOf(filtered), 'premise: Alpha is out of the list').not.toContain(ALPHA)
    expect(press(filtered, false).view.visibility.shownTaskUids).toEqual([])
  })

  it('the unlisted rows alone checked: the heading reads checked and the press clears them', () => {
    const outside = searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: [BRAVO, CHARLIE] }), 'alpha')
    expect(listedOf(outside), 'premise: the word lists one row, unchecked').toEqual([ALPHA])
    expect(searchViewOf(outside).showHeading).toBe('checked')
    const after = press(outside, false)
    expect(after.view.visibility.shownTaskUids).toEqual([])
    expect(searchViewOf(after).showHeading).toBe('empty')
  })

  it('check then clear returns to an empty list', () => {
    const checked = press(searchPane(), true)
    expect(press(checked, false).view.visibility.shownTaskUids).toEqual([])
  })

  it('pressing the box changes neither the Schedule Filter, the column filters nor the sort', () => {
    const before = searchPane(viewWith(startOf('searchPanel'), { isScheduleFilterApplied: true }))
    for (const after of [press(before, true).view, press(press(before, true), false).view]) {
      expect(after.visibility.isScheduleFilterApplied).toBe(true)
      expect(after.columnFilters).toEqual([])
      expect(after.sort).toBeNull()
    }
  })

  it('the box of a row (no isHeading) acts on that row only', () => {
    const all = searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: ALL_TASKS }), 'alpha')
    const out = searchChanged(all, { kind: 'shown', column: 'SQ-10', keys: [ALPHA], isShown: false })
    expect(sorted(out.view.visibility.shownTaskUids), 'the rows the word keeps out stay checked').toEqual([BRAVO, CHARLIE, DELTA, ECHO])
  })
})

describe(`FR-134 T-347 DT-8 -- ${SQ_10_HEADING_ADD.slice(0, 30)} (the report)`, () => {
  const EVERY = [...new Set(reportRowUids(reportViewOf(reportPane())))]
  const listedOf = (pane: ReportPane): readonly number[] => [...new Set(reportRowUids(reportViewOf(pane)))]
  const press = (pane: ReportPane, isShown: boolean): TableView =>
    delayDiagnosticsReportAfterFilterChange(pane.window, pane.view, headingChange(listedOf(pane), isShown))

  it('premise: the report lists more than one task, and a word can keep one of them out', () => {
    expect(EVERY.length).toBeGreaterThan(1)
    expect(listedOf(reportPane(undefined, 'alpha')).length).toBeLessThan(EVERY.length)
  })

  it('the heading box checks every listed row of the report', () => {
    const after = press(reportPane(), true)
    expect(sorted(after.visibility.shownTaskUids)).toEqual(sorted(EVERY))
    expect(reportViewOf({ window: reportPane().window, view: after }).showHeading).toBe('checked')
  })

  it('with a word and nothing checked, the press checks the listed rows only', () => {
    const narrowed = reportPane(startOf('delayDiagnosticsReport'), 'alpha')
    expect(reportViewOf(narrowed).showHeading, 'premise: the box is empty').toBe('empty')
    expect(sorted(press(narrowed, true).visibility.shownTaskUids)).toEqual(sorted(listedOf(narrowed)))
  })

  // WHY: CR-801 -- a task the word keeps out of the report still counts, so the box is checked and the press clears it.
  it('a row the word keeps out checked alone: the box is checked and the press clears it', () => {
    const kept = EVERY.find((uid) => !listedOf(reportPane(undefined, 'alpha')).includes(uid)) ?? -1
    const narrowed = reportPane(viewWith(startOf('delayDiagnosticsReport'), { shownTaskUids: [kept] }), 'alpha')
    expect(listedOf(narrowed), 'premise: the checked task is not listed').not.toContain(kept)
    expect(reportViewOf(narrowed).showHeading).toBe('checked')
    const after = press(narrowed, false)
    expect(after.visibility.shownTaskUids).toEqual([])
    expect(reportViewOf({ window: narrowed.window, view: after }).showHeading).toBe('empty')
  })

  it('every listed row checked: the press clears every row of the report, the rows the word keeps out as well', () => {
    const all = reportPane(viewWith(startOf('delayDiagnosticsReport'), { shownTaskUids: EVERY }), 'alpha')
    expect(listedOf(all).length, 'premise: the word keeps a row out').toBeLessThan(EVERY.length)
    expect(press(all, false).visibility.shownTaskUids).toEqual([])
  })

  it('the press leaves the Schedule Filter as it was', () => {
    const before = reportPane(viewWith(startOf('delayDiagnosticsReport'), { isScheduleFilterApplied: true }))
    expect(press(before, true).visibility.isScheduleFilterApplied).toBe(true)
  })

  it('the box of a row (no isHeading) acts on the keys it is given only', () => {
    const base = reportPane()
    const view = delayDiagnosticsReportAfterFilterChange(base.window, base.view, { kind: 'shown', column: 'DT-8', keys: [ALPHA], isShown: true })
    expect(view.visibility.shownTaskUids).toEqual([ALPHA])
  })
})

describe(`FR-099 T-371 RQ-1 -- ${SQ_10_HEADING_ADD.slice(0, 30)} (the Resource List)`, () => {
  const listedOf = (pane: ListPane): readonly (number | 'unassigned')[] => listViewOf(pane).rows.map((one) => one.key as number | 'unassigned')
  const press = (pane: ListPane, isShown: boolean): TableView => resourceListAfterFilterChange(pane.window, pane.view, headingChange(listedOf(pane), isShown))

  it('the heading box checks every resource and the (Unassigned) row', () => {
    const after = press(listPane(), true)
    expect(sorted(after.visibility.shownResourceUids)).toEqual(ALL_RESOURCES)
    expect(after.visibility.isUnassignedShown).toBe(true)
    expect(listViewOf({ window: listPane().window, view: after }).showHeading).toBe('checked')
  })

  it('with a word and nothing checked, the press checks the listed rows only', () => {
    const narrowed = listPane(startOf('resourceList'), 'Sato')
    const listed = listedOf(narrowed)
    expect(listed, 'premise: the word keeps Tanaka out').not.toContain(TANAKA)
    expect(listViewOf(narrowed).showHeading, 'premise: the box is empty').toBe('empty')
    const after = press(narrowed, true)
    expect(sorted(after.visibility.shownResourceUids)).toEqual(sorted(listed.filter((key): key is number => key !== UNASSIGNED)))
    expect(after.visibility.isUnassignedShown).toBe(listed.includes(UNASSIGNED))
  })

  // WHY: CR-801 -- a resource the word keeps out of the list still counts, so the box is checked and the press clears it.
  it('a resource the word keeps out checked alone: the box is checked and the press clears it', () => {
    const narrowed = listPane(viewWith(startOf('resourceList'), { shownResourceUids: [TANAKA] }), 'Sato')
    expect(listedOf(narrowed), 'premise: the word keeps Tanaka out').not.toContain(TANAKA)
    expect(listViewOf(narrowed).showHeading).toBe('checked')
    const after = press(narrowed, false)
    expect(after.visibility.shownResourceUids).toEqual([])
    expect(after.visibility.isUnassignedShown).toBe(false)
  })

  it('only the (Unassigned) row checked: the box is checked', () => {
    expect(listViewOf(listPane(viewWith(startOf('resourceList'), { isUnassignedShown: true }))).showHeading).toBe('checked')
  })

  it('every listed row checked: the press clears every resource and the (Unassigned) row, the rows the word keeps out as well', () => {
    const all = listPane(viewWith(startOf('resourceList'), { shownResourceUids: ALL_RESOURCES, isUnassignedShown: true }), 'Sato')
    expect(listedOf(all).length, 'premise: the word keeps a row out').toBeLessThan(4)
    const after = press(all, false)
    expect(after.visibility.shownResourceUids).toEqual([])
    expect(after.visibility.isUnassignedShown).toBe(false)
  })

  it('the press leaves the Schedule Filter as it was', () => {
    const before = listPane(viewWith(startOf('resourceList'), { isScheduleFilterApplied: true }))
    expect(press(before, true).visibility.isScheduleFilterApplied).toBe(true)
  })
})

describe(`FR-151 T-330 SV-7 -- ${SV_7_NO_GREEN}`, () => {
  const markedColumns = (view: { readonly columns: readonly { readonly column: string; readonly isFiltered: boolean }[] }): readonly string[] =>
    view.columns.filter((one) => one.isFiltered).map((one) => one.column)

  it('SQ-10: the check column is never marked, from the start, with some rows checked, or after the heading box checks and clears', () => {
    const start = searchPane()
    const some = searchPane(viewWith(startOf('searchPanel'), { shownTaskUids: [ALPHA] }))
    const all = searchChanged(start, headingChange(searchRowUids(searchViewOf(start)), true))
    const none = searchChanged(all, headingChange(searchRowUids(searchViewOf(all)), false))
    for (const pane of [start, some, all, none]) {
      const closed: Pane = { ...pane, panel: { ...pane.panel, filters: { open: null } } }
      expect(markedColumns(searchViewOf(closed))).toEqual([])
    }
  })

  it('DT-8 and RQ-1: the check column of the report and the Resource List is never marked either', () => {
    const report = reportViewOf(reportPane(viewWith(startOf('delayDiagnosticsReport'), { shownTaskUids: [ALPHA] })))
    expect(markedColumns(report)).toEqual([])
    const list = listViewOf(listPane(viewWith(startOf('resourceList'), { shownResourceUids: [SATO], isUnassignedShown: true })))
    expect(markedColumns(list)).toEqual([])
  })

  it('another column filtered is marked, and the check column still is not', () => {
    const base = searchOpened(searchPane(), 'SQ-1')
    const menu = menuOf(searchViewOf(base))
    if (menu.kind !== 'values') throw new Error('the name column lists no values')
    const filtered = searchChanged(base, { kind: 'value', column: 'SQ-1', value: found(menu.values[0], 'a value').value, isShown: false })
    const closed: Pane = { ...filtered, panel: { ...filtered.panel, filters: { open: null } } }
    expect(markedColumns(searchViewOf(closed))).toEqual(['SQ-1'])
  })
})

describe(`FR-151 T-203 S-562 / OP-18 -- ${S_562_NONE.slice(0, 40)}`, () => {
  const HELD: Record<string, Loose> = {
    searchPanel: {
      shownTaskUids: [ALPHA],
      isScheduleFilterApplied: false,
      sort: null,
      columnFilters: [
        { column: 'SQ-10', hiddenValues: ['Hide'], fromDate: null, toDate: null },
        { column: 'SQ-1', hiddenValues: ['Bravo'], fromDate: null, toDate: null },
      ],
    },
    delayDiagnosticsReport: {
      shownTaskUids: [],
      isScheduleFilterApplied: false,
      sort: null,
      columnFilters: [{ column: 'DT-8', hiddenValues: ['Hide'], fromDate: null, toDate: null }],
    },
    resourceList: {
      shownResourceUids: [],
      isUnassignedShown: false,
      isScheduleFilterApplied: false,
      sort: null,
      columnFilters: [
        { column: 'RQ-1', hiddenValues: ['Hide'], fromDate: null, toDate: null },
        { column: 'RQ-2', hiddenValues: [''], fromDate: null, toDate: null },
      ],
    },
  }

  const keptOf = (): ReturnType<typeof tableViewsOnTheirColumns> => tableViewsOnTheirColumns(openedFrom(documentText({ tableViews: HELD })).documentSettings.tableViews)

  it('SQ-10 / DT-8 / RQ-1: the filter on the check column is dropped, the filters on other columns stay', () => {
    const kept = keptOf()
    expect(kept.searchPanel.columnFilters.map((one) => one.column)).toEqual(['SQ-1'])
    expect(kept.delayDiagnosticsReport.columnFilters).toEqual([])
    expect(kept.resourceList.columnFilters.map((one) => one.column)).toEqual(['RQ-2'])
  })

  it('S-563: a sort on the check column is dropped too, and a sort on another column stays', () => {
    const sortOn = (column: string): Loose => ({ column, direction: 'ascending' })
    const views = { ...HELD, searchPanel: { ...(HELD['searchPanel'] as Loose), sort: sortOn('SQ-10') }, resourceList: { ...(HELD['resourceList'] as Loose), sort: sortOn('RQ-4') } }
    const kept = tableViewsOnTheirColumns(openedFrom(documentText({ tableViews: views })).documentSettings.tableViews)
    expect(kept.searchPanel.sort).toBeNull()
    expect(kept.resourceList.sort?.column).toBe('RQ-4')
  })

  it('the checks held beside the dropped filter are read as they are', () => {
    expect(keptOf().searchPanel.shownTaskUids).toEqual([ALPHA])
  })

  it('the dropped filter hides no row of the table that is drawn from it', () => {
    const view: TableView = { ...startOf('searchPanel'), columnFilters: keptOf().searchPanel.columnFilters }
    expect(searchRowUids(searchViewOf(searchPane(view)))).toEqual([ALPHA, CHARLIE, DELTA, ECHO])
  })
})

interface SetTableView {
  readonly kind: 'setTableView'
  readonly table: TableName
  readonly view: TableView
}

function jumpWrites(views: Record<string, Loose>, taskUid: number): readonly SetTableView[] {
  const document = openedFrom(documentText({ tableViews: views }))
  const hands = { readHeld: () => ({ document, history: { done: [], undone: [] } }), readValues: () => null }
  const windows = {}
  const diagnosis = { readReportTaskUids: () => null }
  const hold = shownTasksHoldOf(hands as never, windows as never, diagnosis as never)
  return hold.jumpViewWrites(taskUid).filter((one): one is never => one.kind === 'setTableView') as unknown as readonly SetTableView[]
}

const searchHeld = (shown: readonly number[], isApplied: boolean): Loose => ({
  shownTaskUids: shown,
  columnFilters: [],
  isScheduleFilterApplied: isApplied,
  sort: null,
})
const idleReport: Loose = { shownTaskUids: [], columnFilters: [], isScheduleFilterApplied: false, sort: null }
const idleList: Loose = { shownResourceUids: [], isUnassignedShown: false, columnFilters: [], isScheduleFilterApplied: false, sort: null }

describe(`FR-151 T-332 SJ-0 / JDG-2822 -- ${SJ_0_CHECK.slice(0, 40)}`, () => {
  it('a jump to an undrawn task checks that task, and only that task, in the Search Panel that applies the filter', () => {
    const writes = jumpWrites({ searchPanel: searchHeld([ALPHA, BRAVO], true), delayDiagnosticsReport: idleReport, resourceList: idleList }, CHARLIE)
    const search = found(writes.find((one) => one.table === 'searchPanel'), 'a setTableView write for the Search Panel')
    expect(sorted(search.view.visibility.shownTaskUids)).toEqual([ALPHA, BRAVO, CHARLIE])
    expect(search.view.visibility.isScheduleFilterApplied, 'the filter stays applied').toBe(true)
  })

  it('a jump to an already drawn task writes no view for the Search Panel', () => {
    const writes = jumpWrites({ searchPanel: searchHeld([ALPHA, BRAVO], true), delayDiagnosticsReport: idleReport, resourceList: idleList }, ALPHA)
    expect(writes.filter((one) => one.table === 'searchPanel')).toEqual([])
  })

  it('a Search Panel that does not apply the filter is left as it is', () => {
    const writes = jumpWrites({ searchPanel: searchHeld([ALPHA], false), delayDiagnosticsReport: idleReport, resourceList: idleList }, CHARLIE)
    expect(writes.filter((one) => one.table === 'searchPanel')).toEqual([])
  })

  it('the rows of the resources keep their checks when the Resource List is not the table that applies the filter', () => {
    const writes = jumpWrites(
      { searchPanel: searchHeld([ALPHA], true), delayDiagnosticsReport: idleReport, resourceList: { ...idleList, shownResourceUids: [TANAKA] } },
      CHARLIE,
    )
    expect(writes.filter((one) => one.table === 'resourceList')).toEqual([])
  })

  it('担当の行の表示の列の値は変えない: when the Resource List applies the filter, its resource checks are not touched by the jump', () => {
    const writes = jumpWrites(
      { searchPanel: searchHeld([CHARLIE], true), delayDiagnosticsReport: idleReport, resourceList: { ...idleList, shownResourceUids: [TANAKA], isScheduleFilterApplied: true } },
      ALPHA,
    )
    for (const write of writes.filter((one) => one.table === 'resourceList')) {
      expect(write.view.visibility.shownResourceUids, 'the resource rows keep their checks').toEqual([TANAKA])
      expect(write.view.visibility.isUnassignedShown).toBe(false)
    }
  })
})

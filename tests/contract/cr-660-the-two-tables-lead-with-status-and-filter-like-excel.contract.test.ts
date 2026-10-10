// CR-660 spec-only contract: the two table windows lead with status, progress and task, and the column filter searches and closes like a spreadsheet (FR-151 T-330 / T-331, FR-134 T-346 / T-347, T-206).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
} from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import { isFilterValueListed } from '../../src/adapter/screen-renderer/table-window'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  columnWidthPx,
  searchFilterMenuElement,
  searchPanelBoxOf,
  searchPanelElement,
  unmeasuredSizing,
} from '../../src/framework/dom-screen-surface/search-panel-drawing'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import { selfAndDescendants, stage, type FakeElement } from '../fixtures/fake-browser'
import { specTable, unbroken, type SpecRow } from './spec-table'

// WHY: The clauses this file is driven by (quoted from docs/spec, so a changed sentence reddens case 1)

const T_331_ORDER = '列は、表ごとに本表の行の順に左から並べる'
const T_347_ORDER = '欄は本表の行の順に左から並べる'
const SV_6_FIXED = '横は、タスクの表は `SQ-1` まで（表 T-331 の並びで 表示・ステータス・進捗・タスク の 4 列）、コメントボックスの表は `SQ-7` までを左に固定し'
const RW_10_FIXED = '横は `DT-8`・`DT-1`・`DT-3`・`DT-4`（表示・ステータス・進捗・タスク —— 表 T-347 の並びで左の 4 列）を左に固定し'
const FR_134_COLUMNS = '窓には、上から、まとめ・タスクの表を置き、表の欄は 表 T-347 に従うこと（MUST）'
const SV_7_CONTROLS_FIRST = '⭐ 中身は、上から操作の段と値の一覧である。'
const SV_7_CONTROLS =
  '操作の段は、フィルタの中の検索欄と、`IC-125`（すべてチェック）・`IC-126`（チェックをすべて外す）・`IC-123`（昇順）・`IC-124`（降順）の行である。'
const SV_7_CONTROLS_STAY = '操作の段をフィルタの一番上に置き、値の一覧を縦に送っても動かさないこと（MUST）'
const SV_7_NARROW =
  '⭐ フィルタの中の検索欄は、打つたびに、一覧に出す項目を、項目の語が打った語を含むものだけにする —— 比べ方は `SV-4` と同じ。'
const SV_7_MARKS_KEPT = '⛔ 打った語で、値ごとのチェックを変えてはならない（MUST NOT）'
const SV_7_LISTED_ONLY = '`IC-125`・`IC-126` は、一覧にいま出ている項目のチェックだけを変え、検索で一覧に出ていない項目のチェックは変えない。'
const SV_7_DATES =
  '日付の列は、値の一覧とフィルタの中の検索欄の代わりに、操作の段（`IC-123`・`IC-124`）の下で「いつから」「いつまで」を宿主の日付の入力で選ばせる。'
const SV_7_HEADING_WORD = '見出しのセルの語を押したときも、`IC-122` を押したものとして同じに答えること（MUST）'
const SV_7_CLOSE = '⭐ 開いているフィルタは、同じ列の `IC-122` をもう一度押すか、`Esc`（`SV-14`）か、フィルタの箱の外を押すと閉じる。'
const SV_18_ROWS =
  '既定は列ごとに `_assets/tbl-settings.md` の 表 T-206 の行が持つ —— `SQ-1` 〜 `SQ-9` は `S-466` 〜 `S-474`、`SQ-11` 〜 `SQ-13` は `S-500` 〜 `S-502`（どちらもこの順）。'
const RW_9_ROWS = '既定は `_assets/tbl-settings.md` の 表 T-206 の `S-475` 〜 `S-481`（`DT-1` 〜 `DT-7` の順）とする。'
const SQ_5_GLYPHS =
  '未着手は `PM-1a`、進行中は `PM-1`、完了は `PM-2`、中断の 2 つは `PM-3`、ボトルネックは `DG-2` の炎。'
const SQ_5_NO_PM_4 = '遅れの `PM-4` は描かない'
const DT_1_GLYPHS = '`DG-1` は `?`、`DG-2` は炎、`DG-3` は `!!`、`DG-4` は 表 T-021 の `PM-4` の `!`'
const DT_1_NO_GLYPH = '疑義・記載漏れと確定はマーカーを持たないので絵を描かず、絵の幅だけ空けて語の頭をそろえる。'
const RW_4_GLYPHS = '`DT-1` の窓の絵と同じ —— 疑義・記載漏れと確定は絵の幅だけ空ける'
const SQ_1_LINK = '字を `_assets/tbl-settings.md` の 表 T-236 の `S-503` の色で描き、下線を引く'
const SQ_11_WRITTEN = '整数の百分率（例: 40%）。'
const SQ_12_EMPTY = '未着手なら空'
const SQ_13_EMPTY = '完了していなければ空'

const cellOf = (table: string, id: string, heading: string): string => unbroken(rowOf(table, id).by[heading] ?? '')

function rowOf(table: string, id: string): SpecRow {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

function found<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

type Words = Record<DisplayLanguage, string>
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly searchPanel: readonly { readonly part: string; readonly text: Words }[]
  readonly searchColumns: readonly { readonly rowId: string; readonly text: Words }[]
  readonly delayReportColumns: readonly { readonly rowId: string; readonly text: Words }[]
}

const TASK_COLUMNS = specTable('T-331').rows.filter((row) => row.by['表'] === 'タスク').map((row) => row.id)
const COMMENT_COLUMNS = specTable('T-331').rows.filter((row) => row.by['表'] === 'コメントボックス').map((row) => row.id)
const REPORT_COLUMNS = specTable('T-347').rows.map((row) => row.id)

// see SV-18, RW-9
const WIDTH_ROW: Readonly<Record<string, string>> = {
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => [`SQ-${n}`, `S-${465 + n}`])),
  ...Object.fromEntries([11, 12, 13].map((n) => [`SQ-${n}`, `S-${489 + n}`])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`DT-${n}`, `S-${474 + n}`])),
  'SQ-10': 'S-496',
}

const FONT_PX = 16

const SIZING = unmeasuredSizing(FONT_PX)

/** @purity pure */
function settingPx(row: string): number {
  const said = cellOf('T-206', row, '既定')
  if (said.startsWith('測る')) return SIZING.floor
  const px = /^(\d+)px/.exec(said)
  if (px === null) throw new Error(`T-206 ${row} holds no px default: ${said}`)
  return Number(px[1])
}

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose
const D = (day: string): string => `${day}T00:00:00`

type State = 'notStarted' | 'inProgress' | 'finished' | 'resumePlanned' | 'resumeUnknown'

const STATE_FIELDS: Readonly<Record<State, Loose>> = {
  notStarted: { actualStart: null, stop: null, actualFinish: null, resume: null, resumeValid: null },
  inProgress: { actualStart: D('2026-03-30'), stop: null, actualFinish: null, resume: null, resumeValid: null },
  finished: { actualStart: D('2026-03-30'), stop: null, actualFinish: D('2026-04-08'), resume: null, resumeValid: null },
  resumePlanned: { actualStart: D('2026-03-30'), stop: D('2026-04-02'), actualFinish: null, resume: D('2026-05-01'), resumeValid: true },
  resumeUnknown: { actualStart: D('2026-03-30'), stop: D('2026-04-02'), actualFinish: null, resume: null, resumeValid: false },
}

// see SQ-5
const STATE_GLYPH: Readonly<Record<State, string>> = {
  notStarted: 'PM-1a',
  inProgress: 'PM-1',
  finished: 'PM-2',
  resumePlanned: 'PM-3',
  resumeUnknown: 'PM-3',
}

interface TaskSpec {
  readonly uid: number
  readonly name: string
  readonly state: State
  readonly percent: number | null
}

const TASKS: readonly TaskSpec[] = [
  { uid: 1, name: 'Alpha', state: 'notStarted', percent: null },
  { uid: 2, name: 'Alpine', state: 'inProgress', percent: 40 },
  { uid: 3, name: 'Bravo', state: 'finished', percent: 100 },
  { uid: 4, name: 'Charlie', state: 'resumePlanned', percent: 25 },
  { uid: 5, name: 'Delta', state: 'resumeUnknown', percent: 7 },
]
const G_TASK_GROUP = 'g-task-group'

const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: TASKS.map((spec) => ({
    ...firstOf('tasks'),
    uid: spec.uid,
    parentTaskUid: null,
    wbsOrder: spec.uid,
    name: spec.name,
    start: D(`2026-04-0${spec.uid}`),
    finish: D(`2026-04-1${spec.uid}`),
    milestone: false,
    percentComplete: spec.percent,
    dependencies: [],
    notes: null,
    ...STATE_FIELDS[spec.state],
  })),
  taskGroups: [{ ...firstOf('taskGroups'), id: G_TASK_GROUP, parentId: null, order: 0, label: 'Row', derivedFromTaskUid: null, treeState: 'expanded' }],
  taskGroupMembers: TASKS.map((one) => ({ taskUid: one.uid, groupId: G_TASK_GROUP })),
  resources: [],
  assignments: [],
  commentBoxes: [],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }

const step = (session: ScreenSession, type: string): ScreenSession =>
  advanceScreenSession(session, { type } as unknown as SessionEvent).state

const SHOWN = step(emptyScreenSession, 'searchEntryPressed')
const JA = { ...SHOWN, screen: { ...SHOWN.screen, screenLanguage: 'ja', helpLanguage: 'ja' } } as unknown as ScreenSession
const TASK_PANEL: SearchPanelSession = { ...emptySearchPanelSession, table: 'tasks' }
const COMMENT_PANEL: SearchPanelSession = { ...emptySearchPanelSession, table: 'commentBoxes' }

const viewOf = (panel: SearchPanelSession, bottlenecks?: ReadonlySet<number>): SearchPanelView =>
  found(searchPanelFromSession(JA, panel, SCHEDULE, CANVAS, bottlenecks), 'a view of a shown panel')

const opened = (column: string, panel: SearchPanelSession = TASK_PANEL): SearchPanelSession =>
  found(searchPanelWithFilterOpened(JA, panel, column), `the panel after IC-122 on ${column}`)

type ValuesMenu = Extract<NonNullable<SearchPanelView['filterMenu']>, { kind: 'values' }>

function valuesOf(panel: SearchPanelSession): ValuesMenu {
  const menu = found(viewOf(panel).filterMenu, 'an open filter')
  if (menu.kind !== 'values') throw new Error(`the open filter of ${menu.column} is ${menu.kind}`)
  return menu
}

const shownMarks = (menu: ValuesMenu): Readonly<Record<string, boolean>> =>
  Object.fromEntries(menu.values.map((one) => [one.label, one.isShown]))

// WHY: the surface lists the values whose label the typed word matches (SV-7, IF-9); this is that list.
const listedFor = (menu: ValuesMenu, typed: string): readonly string[] =>
  menu.values.filter((one) => isFilterValueListed(one.label, typed)).map((one) => one.value)

const cellsByColumn = (view: SearchPanelView, uid: number): Readonly<Record<string, string>> => {
  const line = found(
    view.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === uid),
    `the row of task ${uid}`,
  )
  return Object.fromEntries(view.columns.map((column, at) => [column.column, line.cells[at] ?? '']))
}

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
    reportTask(1, 'Alpha', '2026-03-02'),
    reportTask(2, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(3, 'Charlie', '2026-02-02'),
    reportTask(4, 'Delta', '2026-01-01'),
    reportTask(5, 'Echo', '2026-01-01', { actualStart: '2026-01-01T08:00:00', actualFinish: '2026-01-09T17:00:00', percentComplete: 100 }),
    reportTask(6, 'Foxtrot', '2026-04-01'),
  ],
  resources: [],
  assignments: [],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayDays: 1, selfDelayDays: 2, pushOutDays: 5, terminalsReached: 2 }

const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [
    { row: 'VC-3', kind: 'contradiction', layer: 1, uid: 1, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null },
    { row: 'VS-1', kind: 'suspicion', layer: 1, uid: 6, name: 'Foxtrot', values: { percentComplete: 0 }, proposedActualFinish: null },
  ],
  bottlenecks: [{ uid: 2, name: 'Bravo', ...QUANTITIES, path: [3, 2] }],
  terminalPushOuts: [],
  walls: [],
  unanalysedCount: 1,
  markerStates: [
    { uid: 1, row: 'DG-1' },
    { uid: 2, row: 'DG-2' },
    { uid: 3, row: 'DG-3' },
    { uid: 4, row: 'DG-4' },
  ],
  settledPushOuts: [{ uid: 5, name: 'Echo', ...QUANTITIES }],
  derivedParentTasks: [],
  lateDays: [],
} as unknown as DelayDiagnosticsReport

// see DT-1
const REPORT_GLYPH: Readonly<Record<number, string | null>> = { 1: 'DG-1', 6: null, 2: 'DG-2', 3: 'DG-3', 4: 'PM-4', 5: null }

const REPORT_SESSION = { screen: { screenLanguage: 'ja' } } as unknown as ScreenSession

const reportViewOf = (window: DelayDiagnosticsReportWindow): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow(REPORT_SESSION, window, REPORT, REPORT_SCHEDULE, { canvas: CANVAS, textSizeStep: 1 }),
    'a view of the report window',
  )

const REPORT_ROWS = { report: REPORT, schedule: REPORT_SCHEDULE, language: 'ja' as const }

function reportAfter(window: DelayDiagnosticsReportWindow, entry: string, column: string | null, listed?: readonly string[]): DelayDiagnosticsReportWindow {
  const after = found(delayDiagnosticsReportAfterEntry(window, entry, column, REPORT_ROWS, listed), `the report after ${entry}`)
  return found(after.window, `the report window after ${entry}`)
}

type ReportValuesMenu = Extract<NonNullable<DelayDiagnosticsReportView['filterMenu']>, { kind: 'values' }>

function reportValuesOf(window: DelayDiagnosticsReportWindow): ReportValuesMenu {
  const menu = found(reportViewOf(window).filterMenu, 'an open report filter')
  if (menu.kind !== 'values') throw new Error(`the open report filter of ${menu.column} is ${menu.kind}`)
  return menu
}

/** @purity non-pure */
function drawnPanel(panel: SearchPanelSession): FakeElement {
  const built = stage()
  const view = viewOf(panel)
  const box = searchPanelBoxOf(view, { width: 0.5, height: 0.5 })
  return searchPanelElement(built.host, view, { box, fontPx: FONT_PX }, new Map<string, HTMLElement>()) as unknown as FakeElement
}

/** @purity non-pure */
function drawnMenu(panel: SearchPanelSession): readonly FakeElement[] {
  const built = stage()
  const menu = found(viewOf(panel).filterMenu, 'an open filter')
  return selfAndDescendants(searchFilterMenuElement(built.host, menu, 16, new Map<string, HTMLElement>()) as unknown as FakeElement)
}

describe('CR-660 -- the clauses this file is driven by', () => {
  it('T-330, T-331, T-346, T-347 and FR-134 still read this way', () => {
    expect(REQUIREMENTS).toContain(T_331_ORDER)
    expect(REQUIREMENTS).toContain(T_347_ORDER)
    expect(REQUIREMENTS).toContain(FR_134_COLUMNS)
    expect(cellOf('T-330', 'SV-6', '定め')).toContain(SV_6_FIXED)
    expect(cellOf('T-346', 'RW-10', '定め')).toContain(RW_10_FIXED)
    for (const clause of [
      SV_7_CONTROLS_FIRST,
      SV_7_CONTROLS,
      SV_7_CONTROLS_STAY,
      SV_7_NARROW,
      SV_7_MARKS_KEPT,
      SV_7_LISTED_ONLY,
      SV_7_DATES,
      SV_7_HEADING_WORD,
      SV_7_CLOSE,
    ]) {
      expect(cellOf('T-330', 'SV-7', '定め')).toContain(clause)
    }
    expect(cellOf('T-330', 'SV-18', '定め')).toContain(SV_18_ROWS)
    expect(cellOf('T-346', 'RW-9', '定め')).toContain(RW_9_ROWS)
    expect(cellOf('T-331', 'SQ-5', '書き方')).toContain(SQ_5_GLYPHS)
    expect(cellOf('T-331', 'SQ-5', '書き方')).toContain(SQ_5_NO_PM_4)
    expect(cellOf('T-347', 'DT-1', '書き方')).toContain(DT_1_GLYPHS)
    expect(cellOf('T-347', 'DT-1', '書き方')).toContain(DT_1_NO_GLYPH)
    expect(cellOf('T-346', 'RW-4', '定め')).toContain(RW_4_GLYPHS)
    expect(cellOf('T-331', 'SQ-1', '書き方')).toContain(SQ_1_LINK)
    expect(cellOf('T-331', 'SQ-11', '書き方')).toContain(SQ_11_WRITTEN)
    expect(cellOf('T-331', 'SQ-12', '書き方')).toContain(SQ_12_EMPTY)
    expect(cellOf('T-331', 'SQ-13', '書き方')).toContain(SQ_13_EMPTY)
  })

  it('premise: the two tables hold the rows the CR-660 cases walk', () => {
    expect(TASK_COLUMNS).toEqual(['SQ-10', 'SQ-5', 'SQ-11', 'SQ-1', 'SQ-2', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13', 'SQ-6'])
    expect(COMMENT_COLUMNS).toEqual(['SQ-7', 'SQ-8', 'SQ-9'])
    expect(REPORT_COLUMNS).toEqual(['DT-8', 'DT-1', 'DT-3', 'DT-4', 'DT-2', 'DT-5', 'DT-6', 'DT-7'])
  })
})

describe('T-331 / T-347 -- the row order of each table is its column order (area 1)', () => {
  it('T-331: the tasks table lays its columns out in the row order of table T-331', () => {
    expect(viewOf(TASK_PANEL).columns.map((one) => one.column)).toEqual(TASK_COLUMNS)
  })

  it('T-331: the comment box table lays its columns out in the row order of table T-331', () => {
    expect(viewOf(COMMENT_PANEL).columns.map((one) => one.column)).toEqual(COMMENT_COLUMNS)
  })

  it('T-347 / FR-134: the report table lays its columns out in the row order of table T-347', () => {
    expect(reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).columns.map((one) => one.column)).toEqual(REPORT_COLUMNS)
  })

  it('T-331 / T-347: each heading is the dictionary word of its column', () => {
    for (const column of viewOf(TASK_PANEL).columns) {
      const word = found(WORDS.searchColumns.find((one) => one.rowId === column.column), `the word of ${column.column}`)
      expect(column.heading, column.column).toBe(word.text.ja)
      expect(column.heading, `${column.column} heading cell of T-331`).toBe(cellOf('T-331', column.column, '列の見出し（辞書）'))
    }
    for (const column of reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).columns) {
      const word = found(WORDS.delayReportColumns.find((one) => one.rowId === column.column), `the word of ${column.column}`)
      expect(column.heading, column.column).toBe(word.text.ja)
      expect(column.heading, `${column.column} heading cell of T-347`).toBe(cellOf('T-347', column.column, '欄の見出し（辞書）'))
    }
  })

  it('SV-6: the tasks table fixes its columns up to SQ-1 (status, progress, task) and no other', () => {
    const fixed = viewOf(TASK_PANEL).columns.filter((one) => one.isFixed).map((one) => one.column)
    expect(fixed).toEqual(TASK_COLUMNS.slice(0, TASK_COLUMNS.indexOf('SQ-1') + 1))
    expect(fixed).toEqual(['SQ-10', 'SQ-5', 'SQ-11', 'SQ-1'])
  })

  it('SV-6: the comment box table still fixes SQ-7 only', () => {
    expect(viewOf(COMMENT_PANEL).columns.filter((one) => one.isFixed).map((one) => one.column)).toEqual(['SQ-7'])
  })

  it('RW-10: the report fixes DT-8, DT-1, DT-3 and DT-4 (the left four of T-347) and no other', () => {
    const fixed = reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).columns.filter((one) => one.isFixed).map((one) => one.column)
    expect(fixed).toEqual(REPORT_COLUMNS.slice(0, REPORT_COLUMNS.indexOf('DT-4') + 1))
    expect(fixed).toEqual(['DT-8', 'DT-1', 'DT-3', 'DT-4'])
  })

  it('SV-6: the drawn tasks table marks the headings of the fixed columns, ending at the task column', () => {
    const headings = selfAndDescendants(drawnPanel(TASK_PANEL)).filter((one) => one.tagName === 'TH')
    expect(headings.map((one) => one.getAttribute('data-column'))).toEqual(TASK_COLUMNS)
    expect(headings.map((one) => one.getAttribute('data-fixed-column') === 'true')).toEqual(
      TASK_COLUMNS.map((_, at) => at <= TASK_COLUMNS.indexOf('SQ-1')),
    )
  })

  it('SJ-1 / DT-4: the jump is the task column of each table, wherever T-331 / T-347 place it', () => {
    expect(viewOf(TASK_PANEL).jumpAt).toBe(TASK_COLUMNS.indexOf('SQ-1'))
    expect(reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).jumpAt).toBe(REPORT_COLUMNS.indexOf('DT-4'))
  })

  it('SQ-11 / SQ-12 / SQ-13: progress as an integer percent, actual start and finish as dates, empty when not yet', () => {
    const view = viewOf(TASK_PANEL)
    expect(cellsByColumn(view, 2)['SQ-11']).toBe('40%')
    expect(cellsByColumn(view, 1)['SQ-11']).toBe('')
    expect(cellsByColumn(view, 3)['SQ-12']).toBe('2026/03/30')
    expect(cellsByColumn(view, 3)['SQ-13']).toBe('2026/04/08')
    expect(cellsByColumn(view, 1)['SQ-12'], SQ_12_EMPTY).toBe('')
    expect(cellsByColumn(view, 2)['SQ-13'], SQ_13_EMPTY).toBe('')
  })
})

describe('T-330 SV-7 -- the search field of a value filter narrows the list, never the marks (area 2)', () => {
  it('SV-7 / SV-4: the list is narrowed by the SV-4 comparison -- full width and case folded, kana kept apart', () => {
    expect(isFilterValueListed('Alpha', 'ALP')).toBe(true)
    expect(isFilterValueListed('Alpha', 'ａｌｐ')).toBe(true)
    expect(isFilterValueListed('Bravo', 'alp')).toBe(false)
    expect(isFilterValueListed('レビュー', 'れびゅー')).toBe(false)
    expect(isFilterValueListed('Bravo', '')).toBe(true)
  })

  it(`SV-7 「${SV_7_LISTED_ONLY}」 -- IC-126 with a narrowed list hides only the listed values`, () => {
    const panel = opened('SQ-1')
    const menu = valuesOf(panel)
    const listed = listedFor(menu, 'alp')
    expect(listed.length, 'premise: the word lists two of the names').toBe(2)
    const after = found(searchPanelAfterFilterEntry(JA, panel, 'IC-126', SCHEDULE, undefined, listed), 'the panel after IC-126')
    expect(shownMarks(valuesOf(after))).toEqual({ Alpha: false, Alpine: false, Bravo: true, Charlie: true, Delta: true })
    const names = viewOf(after).rows.map((row) => cellsByColumn(viewOf(after), row.target.kind === 'task' ? row.target.taskUid : 0)['SQ-1'])
    expect(names).toEqual(['Bravo', 'Charlie', 'Delta'])
  })

  it(`SV-7 「${SV_7_LISTED_ONLY}」 -- IC-125 with a narrowed list shows only the listed values`, () => {
    const hidden = found(searchPanelAfterFilterEntry(JA, opened('SQ-1'), 'IC-126', SCHEDULE), 'the panel after IC-126 on all')
    const listed = listedFor(valuesOf(hidden), 'alpi')
    expect(listed.length, 'premise: the word lists one name').toBe(1)
    const after = found(searchPanelAfterFilterEntry(JA, hidden, 'IC-125', SCHEDULE, undefined, listed), 'the panel after IC-125')
    expect(shownMarks(valuesOf(after))).toEqual({ Alpha: false, Alpine: true, Bravo: false, Charlie: false, Delta: false })
  })

  it('SV-7 IC-125 / IC-126 on the report: a narrowed list changes only the listed values', () => {
    const open = reportAfter(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-4')
    const menu = reportValuesOf(open)
    const listed = menu.values.filter((one) => isFilterValueListed(one.label, 'a')).map((one) => one.value)
    const unlisted = menu.values.filter((one) => !isFilterValueListed(one.label, 'a')).map((one) => one.label)
    expect(unlisted.length, 'premise: the word leaves some names out').toBeGreaterThan(0)
    const after = reportValuesOf(reportAfter(open, 'IC-126', null, listed))
    for (const one of after.values) expect(one.isShown, one.label).toBe(unlisted.includes(one.label))
  })

  it('SV-7: with no narrowed list IC-126 still hides every value (the list is the whole list)', () => {
    const after = found(searchPanelAfterFilterEntry(JA, opened('SQ-1'), 'IC-126', SCHEDULE, undefined, null), 'IC-126')
    expect(Object.values(shownMarks(valuesOf(after))).every((one) => !one)).toBe(true)
  })

  it(`SV-7 「${SV_7_CONTROLS_FIRST}」 -- the drawn value filter puts the search field, then IC-125 / IC-126 / IC-123 / IC-124, then the value list`, () => {
    const all = drawnMenu(opened('SQ-1'))
    const search = all.findIndex((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'search')
    const entries = ['IC-125', 'IC-126', 'IC-123', 'IC-124'].map((icon) => all.findIndex((one) => one.getAttribute('data-icon') === icon))
    const firstMark = all.findIndex((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'checkbox')
    expect(search, 'the value filter draws a search field').toBeGreaterThanOrEqual(0)
    for (const at of entries) expect(at).toBeGreaterThan(search)
    expect(firstMark).toBeGreaterThan(Math.max(...entries))
    const hint = found(WORDS.searchPanel.find((one) => one.part === 'filterSearch'), 'the filterSearch word').text.ja
    expect(all[search]?.getAttribute('placeholder')).toBe(hint)
  })

  it(`SV-7 「${SV_7_DATES}」 -- a date filter draws no search field, and its entries above the two dates`, () => {
    for (const column of ['SQ-3', 'SQ-12', 'SQ-13']) {
      const all = drawnMenu(opened(column))
      expect(all.some((one) => one.tagName === 'INPUT' && one.getAttribute('type') === 'search'), column).toBe(false)
      const sort = all.findIndex((one) => one.getAttribute('data-icon') === 'IC-124')
      const dates = all.map((one, at) => (one.tagName === 'INPUT' && one.getAttribute('type') === 'date' ? at : -1)).filter((at) => at >= 0)
      expect(dates, column).toHaveLength(2)
      for (const at of dates) expect(at, column).toBeGreaterThan(sort)
    }
  })
})

describe('T-330 SV-7 -- the open filter closes on its own entrance pressed again (area 3)', () => {
  it(`SV-7 「${SV_7_CLOSE}」 -- IC-122 of the same column closes the tasks table filter`, () => {
    const open = opened('SQ-11')
    expect(viewOf(open).filterMenu?.column).toBe('SQ-11')
    const again = opened('SQ-11', open)
    expect(viewOf(again).filterMenu).toBeNull()
  })

  it('SV-7: IC-122 of another column still switches to that column instead of closing', () => {
    expect(viewOf(opened('SQ-1', opened('SQ-5'))).filterMenu?.column).toBe('SQ-1')
  })

  it('SV-7 / T-346: IC-122 of the same column closes the report filter too', () => {
    const open = reportAfter(OPENED_DELAY_DIAGNOSTICS_REPORT, 'IC-122', 'DT-3')
    expect(reportViewOf(open).filterMenu?.column).toBe('DT-3')
    expect(reportViewOf(reportAfter(open, 'IC-122', 'DT-3')).filterMenu).toBeNull()
  })
})

describe('T-331 SQ-5 / T-347 DT-1 / T-346 RW-4 -- the leading glyph of a status (area 4)', () => {
  it(`SQ-5 「${SQ_5_GLYPHS}」`, () => {
    const view = viewOf(TASK_PANEL)
    expect(view.glyphAt).toBe(TASK_COLUMNS.indexOf('SQ-5'))
    for (const task of TASKS) {
      const row = found(view.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === task.uid), `row ${task.uid}`)
      expect(row.glyph, `${task.name} (${task.state})`).toBe(STATE_GLYPH[task.state])
    }
  })

  it('SQ-5: while the diagnosis is shown a bottleneck draws the DG-2 flame, never PM-4', () => {
    const view = viewOf(TASK_PANEL, new Set([2]))
    const glyphs = view.rows.map((one) => one.glyph)
    expect(view.rows.find((one) => one.target.kind === 'task' && one.target.taskUid === 2)?.glyph).toBe('DG-2')
    expect(glyphs, SQ_5_NO_PM_4).not.toContain('PM-4')
  })

  it('SQ-5: the comment box table draws no glyph', () => {
    expect(viewOf(COMMENT_PANEL).glyphAt ?? null).toBeNull()
  })

  it(`DT-1 「${DT_1_GLYPHS}」, and none for the doubtful and the settled`, () => {
    const view = reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT)
    expect(view.glyphAt).toBe(REPORT_COLUMNS.indexOf('DT-1'))
    expect(view.rows.length, 'premise: the report holds one row per status').toBe(6)
    for (const row of view.rows) {
      const uid = row.target.kind === 'task' ? row.target.taskUid : -1
      expect(row.glyph, `task ${uid} (${row.status})`).toBe(REPORT_GLYPH[uid])
    }
  })

  it(`RW-4 「${RW_4_GLYPHS}」`, () => {
    const view = reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT)
    const byStatus = new Map(view.rows.map((row) => [row.status, row.glyph]))
    const statusLines = view.summary.filter((one) => one.status !== null)
    expect(statusLines.length, 'premise: the summary has a line per status').toBeGreaterThan(0)
    for (const line of statusLines) {
      if (byStatus.has(found(line.status, 'a status'))) expect(line.glyph, String(line.status)).toBe(byStatus.get(found(line.status, 'a status')))
    }
  })

  it(`SQ-1 「${SQ_1_LINK}」 -- the drawn task names are underlined (the colour is checked in the browser)`, () => {
    const jump = selfAndDescendants(drawnPanel(TASK_PANEL)).filter((one) => one.tagName === 'TD' && one.getAttribute('data-search-task') !== null)
    expect(jump.length).toBe(TASKS.length)
    for (const cell of jump) expect((cell.getAttribute('style') ?? '').replace(/\s+/g, ''), cell.textContent ?? '').toContain('text-decoration:underline')
  })
})

describe('T-330 SV-18 / T-346 RW-9 -- the default width of a column is its T-206 row, or measured (area 5)', () => {
  it('T-206: every width row names the column SV-18 / RW-9 give it', () => {
    for (const [column, row] of Object.entries(WIDTH_ROW)) expect(cellOf('T-206', row, '値'), `${row} -> ${column}`).toContain(`\`${column}\``)
  })

  it('SV-18: each tasks and comment box column starts at its T-206 width; a measured one unmeasured reads the S-425 floor', () => {
    for (const panel of [TASK_PANEL, COMMENT_PANEL]) {
      for (const column of viewOf(panel).columns) {
        expect(columnWidthPx(column, SIZING), `${column.column} -> ${WIDTH_ROW[column.column]}`).toBe(settingPx(found(WIDTH_ROW[column.column], column.column)))
      }
    }
  })

  it('RW-9: each report column starts at its T-206 width; a measured one unmeasured reads the S-425 floor', () => {
    for (const column of reportViewOf(OPENED_DELAY_DIAGNOSTICS_REPORT).columns) {
      expect(columnWidthPx(column, SIZING), `${column.column} -> ${WIDTH_ROW[column.column]}`).toBe(settingPx(found(WIDTH_ROW[column.column], column.column)))
    }
  })

  it('SV-18: the drawn tasks table gives each column its T-206 width and the table their sum', () => {
    const all = selfAndDescendants(drawnPanel(TASK_PANEL))
    const widths = TASK_COLUMNS.map((column) => settingPx(found(WIDTH_ROW[column], column)))
    const cols = all.filter((one) => one.tagName === 'COL').map((one) => (one.getAttribute('style') ?? '').replace(/\s+/g, ''))
    expect(cols).toEqual(widths.map((one) => `width:${one}px;`))
    expect((all.find((one) => one.tagName === 'TABLE')?.getAttribute('style') ?? '').replace(/\s+/g, '')).toContain(
      `width:${widths.reduce((sum, one) => sum + one, 0)}px`,
    )
  })
})

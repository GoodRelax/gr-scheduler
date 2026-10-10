// CR-721 spec-only stage: one small document, the Search Panel session over it, and the report window over a fixed report.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { DisplayLanguage, SearchPanelView } from '../../src/adapter/screen-renderer/screen-renderer'
import {
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
  type SearchFilterChange,
} from '../../src/adapter/screen-renderer/search-panel'
import {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import type { DelayDiagnosticsReport, Schedule } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  EVERY_ROW_SHOWN,
  type ScreenSession,
  type SearchPanelSession,
  type SessionEvent,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'

export { OPENED_DELAY_DIAGNOSTICS_REPORT }
export type { DelayDiagnosticsReportWindow, SearchPanelSession, SearchPanelView, TableView }

type Loose = Record<string, unknown>

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: Loose }
const firstOf = (key: string): Loose => ((TEMPLATE.schedule[key] as readonly Loose[])[0] ?? {}) as Loose
const D = (day: string): string => `${day}T00:00:00`

export function found<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new Error(`missing: ${what}`)
  return value
}

// WHY: two nameless-free tasks on one task group; the states differ so a state filter has something to drop.
const TASKS: readonly { readonly uid: number; readonly name: string; readonly start: string; readonly actualStart: string | null }[] = [
  { uid: 1, name: 'Alpha', start: '2026-04-01', actualStart: D('2026-04-01') },
  { uid: 2, name: 'Bravo', start: '2026-04-02', actualStart: null },
  { uid: 3, name: 'Charlie', start: '2026-04-03', actualStart: null },
]
const G_ONE = 'g-one'

export const SCHEDULE = {
  ...TEMPLATE.schedule,
  tasks: TASKS.map((spec) => ({
    ...firstOf('tasks'),
    uid: spec.uid,
    parentTaskUid: null,
    wbsOrder: spec.uid,
    name: spec.name,
    start: D(spec.start),
    finish: D(spec.start),
    milestone: false,
    percentComplete: null,
    dependencies: [],
    notes: null,
    actualStart: spec.actualStart,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
  })),
  taskGroups: [{ ...firstOf('taskGroups'), id: G_ONE, parentId: null, order: 0, label: 'Row', derivedFromTaskUid: null, treeState: 'expanded' }],
  taskGroupMembers: TASKS.map((one) => ({ taskUid: one.uid, groupId: G_ONE })),
  resources: [],
  assignments: [],
  commentBoxes: [
    {
      id: 'c-1',
      leaderShapeKind: null,
      text: 'First note',
      anchorDate: D('2026-04-02'),
      anchorGroupId: G_ONE,
      bodyOffsetPx: null,
      strokeColor: null,
      strokeWidthPx: null,
      fillColor: null,
      fillTransparencyPercent: null,
      textColor: null,
    },
  ],
  taskVisuals: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

export const CANVAS: ScreenRect = { x: 0, y: 56, width: 1000, height: 600 }

const step = (session: ScreenSession, type: string): ScreenSession =>
  advanceScreenSession(session, { type } as unknown as SessionEvent).state

export function sessionIn(language: DisplayLanguage): ScreenSession {
  const shown = step(emptyScreenSession, 'searchEntryPressed')
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}

// WHY: CR-723 -- the table view (Visibility column, Schedule Filter, column filters, sort) is the document's, the panel
// holds only the screen's own values, so a case carries both together as one pane and threads it through the steps.
export const NO_VIEW: TableView = { visibility: EVERY_ROW_SHOWN, columnFilters: [], sort: null }

export interface Pane {
  readonly panel: SearchPanelSession
  readonly view: TableView
}

export const TASK_PANEL: Pane = { panel: { ...emptySearchPanelSession, table: 'tasks' }, view: NO_VIEW }
export const COMMENT_PANEL: Pane = { panel: { ...emptySearchPanelSession, table: 'commentBoxes' }, view: NO_VIEW }
export const TASK_UIDS: readonly number[] = TASKS.map((one) => one.uid)

export function viewOf(pane: Pane, language: DisplayLanguage = 'ja'): SearchPanelView {
  return found(searchPanelFromSession(sessionIn(language), pane.panel, pane.view, SCHEDULE, CANVAS), 'a view of a shown panel')
}

export const opened = (column: string, pane: Pane = TASK_PANEL, language: DisplayLanguage = 'ja'): Pane => ({
  panel: found(searchPanelWithFilterOpened(sessionIn(language), pane.panel, pane.view, column), `the panel after IC-122 on ${column}`),
  view: pane.view,
})

export const changed = (pane: Pane, change: SearchFilterChange, language: DisplayLanguage = 'ja'): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterChange(sessionIn(language), pane.panel, pane.view, change), `the view after ${JSON.stringify(change)}`),
})

export const pressed = (pane: Pane, entry: string, language: DisplayLanguage = 'ja'): Pane => ({
  panel: pane.panel,
  view: found(searchPanelAfterFilterEntry(sessionIn(language), pane.panel, pane.view, entry as never, SCHEDULE), `the view after ${entry}`),
})

export type ValuesMenu = Extract<NonNullable<SearchPanelView['filterMenu']>, { kind: 'values' }>

export function valuesOf(pane: Pane, language: DisplayLanguage = 'ja'): ValuesMenu {
  const menu = found(viewOf(pane, language).filterMenu, 'an open filter')
  if (menu.kind !== 'values') throw new Error(`the open filter of ${menu.column} is ${menu.kind}`)
  return menu
}

// WHY: opens the column, takes one value off by the label it is shown with, and leaves the filter open.
export function withValueOff(column: string, label: string, pane: Pane = TASK_PANEL, language: DisplayLanguage = 'ja'): Pane {
  const there = opened(column, pane, language)
  const value = found(valuesOf(there, language).values.find((one) => one.label === label), `an item labeled ${label} in ${column}`).value
  return changed(there, { kind: 'value', column: column as never, value, isShown: false }, language)
}

export const columnOf = (view: SearchPanelView, column: string): SearchPanelView['columns'][number] =>
  found(view.columns.find((one) => one.column === column), `the heading of ${column}`)

// WHY: the dictionary is the spec's own file; a word is read from it, never retyped here.
type Words = Record<DisplayLanguage, string>
export const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly searchColumns: readonly { readonly rowId: string; readonly text: Words }[]
  readonly searchPanel: readonly { readonly part: string; readonly text: Words }[]
  readonly planActualStates: readonly { readonly rowId: string; readonly text: Words }[]
  readonly delayReportStatuses: readonly { readonly rowId: string; readonly text: Words }[]
}
export const panelWordOf = (part: string, language: DisplayLanguage): string =>
  found(WORDS.searchPanel.find((one) => one.part === part), `search panel word ${part}`).text[language]
export const columnWordOf = (row: string, language: DisplayLanguage): string =>
  found(WORDS.searchColumns.find((one) => one.rowId === row), `column word ${row}`).text[language]
export const iconWordOf = (row: string, language: DisplayLanguage): string =>
  found(WORDS.icons.find((one) => one.rowId === row), `icon word ${row}`).label[language]

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

export const REPORT_SCHEDULE = {
  tasks: [
    reportTask(1, 'Alpha', '2026-03-02'),
    reportTask(2, 'Bravo', '2026-01-05', { percentComplete: 40, actualStart: '2026-01-05T08:00:00' }),
    reportTask(3, 'Charlie', '2026-02-02'),
  ],
  resources: [],
  assignments: [],
} as unknown as Schedule

const QUANTITIES = { inheritedDelayDays: 1, selfDelayDays: 2, pushOutDays: 5, terminalsReached: 2 }

export const REPORT: DelayDiagnosticsReport = {
  outcome: 'diagnosed',
  statusDate: '2026-01-02T00:00:00',
  findings: [
    { row: 'VC-3', kind: 'contradiction', layer: 1, uid: 1, name: 'Alpha', values: { start: '2026-03-02' }, proposedActualFinish: null },
  ],
  bottlenecks: [{ uid: 2, name: 'Bravo', ...QUANTITIES, path: [3, 2] }],
  terminalPushOuts: [],
  walls: [],
  unreliableCount: 0,
  markerStates: [
    { uid: 1, row: 'DG-1' },
    { uid: 2, row: 'DG-2' },
  ],
  settledPushOuts: [],
  derivedParentTasks: [],
  lateDays: [],
} as unknown as DelayDiagnosticsReport

const REPORT_SESSION = { screen: { screenLanguage: 'ja' } } as unknown as ScreenSession

// WHY: the report window (screen only) and the report table's view (the document's), carried together as the panel is.
export interface ReportPane {
  readonly window: DelayDiagnosticsReportWindow
  readonly view: TableView
}

export const OPENED_REPORT: ReportPane = { window: OPENED_DELAY_DIAGNOSTICS_REPORT, view: NO_VIEW }

export const reportViewOf = (pane: ReportPane): DelayDiagnosticsReportView =>
  found(
    delayDiagnosticsReportFromWindow(REPORT_SESSION, pane.window, pane.view, REPORT, REPORT_SCHEDULE, { canvas: CANVAS, textSizeStep: 1 }),
    'a view of the report window',
  )

export function reportAfter(pane: ReportPane, entry: string, column: string | null): ReportPane {
  const after = found(
    delayDiagnosticsReportAfterEntry(pane.window, pane.view, entry as never, column, { report: REPORT, schedule: REPORT_SCHEDULE, language: 'ja' }),
    `the report after ${entry}`,
  )
  return { window: found(after.window, `the report window after ${entry}`), view: after.view }
}

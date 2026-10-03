// Builds the Delay Diagnostics Report window for one frame, and the Markdown its IC-108 and IC-140 hand out.
// @unit      UF-194  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  DELAY_REPORT_STATUSES,
  delayDiagnosticsReportMarkdown,
  delayDiagnosticsReportRows,
  isSameDay,
  isSearchWordFound,
  type DelayDiagnosticsReport,
  type DelayReportReason,
  type DelayReportRow,
  type DelayReportStatus,
  type DelayReportWords,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import { emptySearchPanelSession, type ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import displayWords from './display-words.json'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import type { SearchPanelView, SearchRowView } from './search-panel'
import { ASSIGNEE_SEPARATOR, BLANK_SEARCH_VALUE, filteredTableRows, tableColumnValues, type TableColumns } from './search-table-filters'
import {
  dateText,
  entryOf,
  openFilterIn,
  tableAfterFilterChange,
  tableAfterFilterEntry,
  tableColumnsOf,
  tableFilterMenuOf,
  tableWithColumnWidth,
  tableWithFilterClosed,
  tableWithFilterOpened,
  windowShownAfterEntry,
  windowTitleEntriesOf,
  wordOf,
  type SearchFilterChange,
  type TableWindowSession,
  type WindowTable,
} from './table-window'
import { windowPlaceInRange, type WindowShown } from './window-box'

const DELAY_DIAGNOSTICS_REPORT = 'Delay Diagnostics Report'

const EXPORT_ENTRY: IconId = 'IC-140'
const COPY_ENTRY: IconId = 'IC-108'
const TEXT_SIZE_ENTRY: IconId = 'IC-127'
const FILTER_ENTRY: IconId = 'IC-122'

const HEADING = displayWords.surfaces.find((entry) => entry.name === DELAY_DIAGNOSTICS_REPORT)?.heading

const FILE_NAME_WORD = displayWords.icons.find((entry) => entry.rowId === 'IC-107')?.label

// see T-347
export const DELAY_REPORT_COLUMNS: readonly string[] = ['DT-1', 'DT-2', 'DT-3', 'DT-4', 'DT-5', 'DT-6', 'DT-7']

// see DT-4, SJ-1
const JUMP_COLUMN_AT = DELAY_REPORT_COLUMNS.indexOf('DT-4')

// see RW-3
const WORD_COLUMNS_AT: readonly number[] = [0, 1, 2, 3, 4]

const PERCENT = '%'

const DATE_RANGE = '〜'

const WORD_JOIN = ', '

const FILE_NAME_JOIN = '_'

const MARKDOWN_EXTENSION = '.md'

// see T-315
// WHY: the drawn marks of FR-133 as text; the DG-2 flame has no text form, and a finding or a settled push-out no mark.
const STATUS_SYMBOLS: Readonly<Record<DelayReportStatus, string>> = {
  'DG-1': '?',
  'DG-2': '',
  'DG-3': '!!',
  'DG-4': '!',
  finding: '',
  settled: '',
}

// DEVIATION: DFC-1771 -- the dictionary holds no legend, column, status, summary or DT-7 words yet (CR-617 J-03, J-04).
const PLACEHOLDER_STATUS_WORDS: Readonly<Record<DelayReportStatus, string>> = {
  'DG-1': 'DG-1',
  'DG-2': 'DG-2',
  'DG-3': 'DG-3',
  'DG-4': 'DG-4',
  finding: 'DX-3',
  settled: 'DX-9',
}

// see RW-1, RW-5, RW-8, S-451, WB-6
// WHY: held by the shell and never saved (FR-134 MUST NOT); the text size is the search panel's (CR-617 decision 3).
export interface DelayDiagnosticsReportWindow {
  readonly shown: WindowShown
  readonly panel: TableWindowSession
  readonly isInFront: boolean
}

export const OPENED_DELAY_DIAGNOSTICS_REPORT: DelayDiagnosticsReportWindow = {
  shown: 'normal',
  panel: emptySearchPanelSession,
  isInFront: true,
}

export interface DelayReportRowView extends SearchRowView {
  readonly status: DelayReportStatus
}

// see RW-4
export interface DelayReportLine {
  readonly status: DelayReportStatus | null
  readonly text: string
}

export interface DelayDiagnosticsReportView extends Omit<SearchPanelView, 'table' | 'rows'> {
  readonly isInFront: boolean
  readonly toolEntries: readonly CommandItem[]
  readonly legend: readonly DelayReportLine[]
  readonly summary: readonly DelayReportLine[]
  readonly rows: readonly DelayReportRowView[]
  readonly jumpAt: number
}

interface ShownRow {
  readonly row: DelayReportRow
  readonly cells: readonly string[]
}

/** @purity pure */
function statusWordOf(status: DelayReportStatus): string {
  return PLACEHOLDER_STATUS_WORDS[status]
}

/** @purity pure */
function datesText(start: string | null, finish: string | null, isOneDay: boolean): string {
  const [from, to] = [dateText(start), dateText(finish)]
  if (from === '') return ''
  return isOneDay || from === to ? from : `${from}${DATE_RANGE}${to}`
}

// see DT-7, DX-3, DX-4, DX-9, VO-5
// DEVIATION: DFC-1771 -- no sentence pattern of DT-7 is in the dictionary yet, so the values print beside their row IDs.
/** @purity pure */
function reasonText(reason: DelayReportReason): string {
  switch (reason.kind) {
    case 'unreliable': {
      const findings = reason.findings.map((one) => {
        const values = Object.entries(one.values).map(([key, value]) => `${key}=${String(value)}`)
        const proposal = one.proposedActualFinish === null ? [] : [`VO-5 ${dateText(one.proposedActualFinish)}`]
        return [one.row, ...values, ...proposal].join(' ')
      })
      return [...findings, ...reason.walls.map((one) => one.row)].join(WORD_JOIN)
    }
    case 'bottleneck':
    case 'settled': {
      const held = reason.quantities
      if (held === null) return ''
      return `DQ-4 ${held.pushOutDays} (DQ-2 ${held.inheritedDelayDays}, DQ-3 ${held.selfDelayDays}, ${held.terminalsReached})`
    }
    case 'bottleneckPath':
      return reason.bottleneckNames.join(WORD_JOIN)
    case 'late':
      return ''
  }
}

// see T-347
/** @purity pure */
function cellsOf(row: DelayReportRow): readonly string[] {
  const isFinished = row.actualFinish !== null
  return [
    statusText(row.status),
    row.assigneeNames.join(ASSIGNEE_SEPARATOR),
    row.percentComplete === null ? '' : `${Math.round(row.percentComplete)}${PERCENT}`,
    row.name,
    datesText(row.plannedStart, row.plannedFinish, isSameDay(row.plannedStart, row.plannedFinish)),
    isFinished || row.actualStart === null ? datesText(row.actualStart, row.actualFinish, false) : `${dateText(row.actualStart)}${DATE_RANGE}`,
    reasonText(row.reason),
  ]
}

// see DT-1, DT-3, T-347
const REPORT_TABLE: TableColumns<ShownRow> = {
  values: {
    'DT-1': (shown) => [shown.row.status],
    'DT-2': (shown) => (shown.row.assigneeNames.length === 0 ? [BLANK_SEARCH_VALUE] : shown.row.assigneeNames),
    'DT-3': (shown) => [shown.cells[2] ?? BLANK_SEARCH_VALUE],
    'DT-4': (shown) => [shown.row.name],
    'DT-7': (shown) => [shown.cells[6] ?? BLANK_SEARCH_VALUE],
  },
  dates: {
    'DT-5': (shown) => shown.row.plannedStart,
    'DT-6': (shown) => shown.row.actualStart,
  },
  orders: {
    'DT-1': (a, b) => DELAY_REPORT_STATUSES.indexOf(a as DelayReportStatus) - DELAY_REPORT_STATUSES.indexOf(b as DelayReportStatus),
    'DT-3': (a, b) => Number.parseFloat(a) - Number.parseFloat(b),
  },
}

// see RW-3, SV-4
/** @purity pure */
function isWordFound(shown: ShownRow, word: string): boolean {
  return word === '' || WORD_COLUMNS_AT.some((at) => isSearchWordFound(shown.cells[at] ?? '', word))
}

// see RW-3, RW-8, SV-7, SV-8
/** @purity pure */
function shownRowsOf(window: DelayDiagnosticsReportWindow, rows: readonly DelayReportRow[]): readonly ShownRow[] {
  const found = rows
    .map((row) => ({ row, cells: cellsOf(row) }))
    .filter((shown) => isWordFound(shown, window.panel.word))
  return filteredTableRows(found, REPORT_TABLE, window.panel.filters, window.panel.sort)
}

// see T-347, SV-7
/** @purity pure */
function reportTableOf(found: () => readonly ShownRow[]): WindowTable {
  return {
    columns: DELAY_REPORT_COLUMNS,
    fixedCount: 0,
    // DEVIATION: DFC-1771 -- the column headings are not in the dictionary yet; each prints its T-347 row ID.
    headingOf: (column) => column,
    isDateColumn: (column) => REPORT_TABLE.dates[column] !== undefined,
    valuesOf: (column) => tableColumnValues(found(), REPORT_TABLE, column),
    labelOf: (column, value) => (column === 'DT-1' ? statusWordOf(value as DelayReportStatus) : value),
  }
}

/** @purity pure */
function statusText(status: DelayReportStatus): string {
  const symbol = STATUS_SYMBOLS[status]
  return symbol === '' ? statusWordOf(status) : `${symbol} ${statusWordOf(status)}`
}

// see RW-4, DX-2, DX-7
/** @purity pure */
function summaryOf(report: DelayDiagnosticsReport, rows: readonly DelayReportRow[]): readonly DelayReportLine[] {
  const counts = DELAY_REPORT_STATUSES.map((status) => ({
    status,
    text: `${statusText(status)} ${rows.filter((row) => row.status === status).length}`,
  }))
  return [{ status: null, text: `DX-2 ${dateText(report.statusDate)}` }, ...counts, { status: null, text: `DX-7 ${report.unanalysedCount}` }]
}

// see FR-134, T-346, RW-2, RW-3, RW-4, RW-9
/** @purity pure */
export function delayDiagnosticsReportFromWindow(
  session: ScreenSession,
  window: DelayDiagnosticsReportWindow | null,
  report: DelayDiagnosticsReport | null,
  schedule: Schedule,
  layout: { readonly canvas: ScreenRect; readonly textSizeStep: number },
): DelayDiagnosticsReportView | null {
  if (window === null || report === null) return null
  const language = displayLanguageOf(session)
  const isOpen = window.shown !== 'minimised'
  const all = isOpen ? delayDiagnosticsReportRows(report, schedule) : []
  const found = shownRowsOf(window, all)
  const table = reportTableOf(() => found)
  const open = openFilterIn(window.panel, window.shown, table)
  return {
    heading: wordOf(HEADING, language),
    shown: window.shown,
    isInFront: window.isInFront,
    canvas: layout.canvas,
    ...windowPlaceInRange(window.panel, layout.canvas),
    textSizeStep: layout.textSizeStep,
    tableEntries: [],
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(window.shown, language)],
    toolEntries: [entryOf(EXPORT_ENTRY, language), entryOf(COPY_ENTRY, language)],
    word: window.panel.word,
    legend: (['DG-1', 'DG-2', 'DG-3', 'DG-4'] as const).map((status) => ({ status, text: statusText(status) })),
    summary: isOpen ? summaryOf(report, all) : [],
    columns: tableColumnsOf(window.panel, table, language),
    filterMenu: open === null ? null : tableFilterMenuOf(window.panel, open, table, language),
    rows: found.map((shown) => ({ cells: shown.cells, status: shown.row.status, target: { kind: 'task', taskUid: shown.row.taskUid } })),
    jumpAt: JUMP_COLUMN_AT,
  }
}

// see T-346, SV-7, SV-8, WB-2, WB-3, RW-1
// WHY: { window: null } is a close; null is an entry the window does not answer.
/** @purity pure */
export function delayDiagnosticsReportAfterEntry(
  window: DelayDiagnosticsReportWindow,
  entry: IconId,
  filterColumn: string | null,
  rows: { readonly report: DelayDiagnosticsReport; readonly schedule: Schedule },
): { readonly window: DelayDiagnosticsReportWindow | null } | null {
  const shown = windowShownAfterEntry(window.shown, entry)
  if (shown === null) return { window: null }
  if (shown !== undefined) return { window: { ...window, shown } }
  const unfiltered = { ...window, panel: { ...window.panel, filters: { ...window.panel.filters, columns: [] } } }
  const table = reportTableOf(() => shownRowsOf(unfiltered, delayDiagnosticsReportRows(rows.report, rows.schedule)))
  const panel =
    entry === FILTER_ENTRY
      ? filterColumn === null ? null : tableWithFilterOpened(window.panel, window.shown, filterColumn, table)
      : tableAfterFilterEntry(window.panel, window.shown, entry, table)
  return panel === null ? null : { window: { ...window, panel } }
}

// see SV-7
/** @purity pure */
export function delayDiagnosticsReportAfterFilterChange(
  window: DelayDiagnosticsReportWindow,
  change: SearchFilterChange,
): DelayDiagnosticsReportWindow {
  const panel = tableAfterFilterChange(window.panel, window.shown, change, reportTableOf(() => []))
  return panel === null ? window : { ...window, panel }
}

// see SV-14, IN-4
/** @purity pure */
export function delayDiagnosticsReportWithFilterClosed(window: DelayDiagnosticsReportWindow): DelayDiagnosticsReportWindow | null {
  const panel = tableWithFilterClosed(window.panel, window.shown, reportTableOf(() => []))
  return panel === null ? null : { ...window, panel }
}

// see RW-9, SV-18, GR-28
/** @purity pure */
export function delayDiagnosticsReportWithColumnWidth(
  window: DelayDiagnosticsReportWindow,
  column: string,
  width: number,
): DelayDiagnosticsReportWindow {
  const panel = tableWithColumnWidth(window.panel, column, width)
  return panel === window.panel ? window : { ...window, panel }
}

// see RW-6, T-315
// DEVIATION: DFC-1771 -- the labels, legend meanings and summary words are not in the dictionary yet.
/** @purity pure */
function markdownWordsOf(language: DisplayLanguage): DelayReportWords {
  const statuses = Object.fromEntries(
    DELAY_REPORT_STATUSES.map((status) => [status, { symbol: STATUS_SYMBOLS[status], word: statusWordOf(status), meaning: '' }]),
  ) as DelayReportWords['statuses']
  return {
    heading: wordOf(HEADING, language),
    documentName: '',
    statusDate: 'DX-2',
    madeAt: '',
    filter: '',
    none: '',
    legend: '',
    summary: '',
    unanalysed: 'DX-7',
    columns: DELAY_REPORT_COLUMNS,
    statuses,
  }
}

// see FR-134, RW-6, IC-108, IC-140
/** @purity pure */
export function delayDiagnosticsReportMarkdownOf(
  window: DelayDiagnosticsReportWindow,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  language: DisplayLanguage,
  stamp: { readonly documentName: string; readonly madeAt: string },
): string {
  const rows = shownRowsOf(window, delayDiagnosticsReportRows(report, schedule)).map((shown) => ({ status: shown.row.status, cells: shown.cells }))
  const columns = window.panel.filters.columns.map((one) => ({
    heading: one.column,
    condition: one.hiddenValues.length > 0 ? `-(${one.hiddenValues.map((value) => (one.column === 'DT-1' ? statusText(value as DelayReportStatus) : value)).join(WORD_JOIN)})` : `${dateText(one.from)}${DATE_RANGE}${dateText(one.to)}`,
  }))
  const dates = { documentName: stamp.documentName, statusDate: dateText(report.statusDate), madeAt: stamp.madeAt }
  return delayDiagnosticsReportMarkdown(report, rows, { word: window.panel.word, columns }, markdownWordsOf(language), dates)
}

// see RW-7, FR-096
// DEVIATION: DFC-1771 -- the file-name word of RW-7 is not in the dictionary; IC-107's label stands in.
/** @purity pure */
export function delayDiagnosticsReportFileNameOf(documentName: string, statusDate: string | null, language: DisplayLanguage): string {
  const word = wordOf(FILE_NAME_WORD, language).toLowerCase().replace(/ /g, '-')
  const day = dateText(statusDate).replace(/\//g, '-')
  return [documentName, word, day].join(FILE_NAME_JOIN) + MARKDOWN_EXTENSION
}

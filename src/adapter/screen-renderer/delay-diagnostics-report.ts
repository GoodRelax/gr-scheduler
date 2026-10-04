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
import { exportNameBodyOf } from './open-modals'
import type { SearchPanelView, SearchRowView } from './search-panel'
import {
  ASSIGNEE_SEPARATOR,
  BLANK_SEARCH_VALUE,
  comparePercentTexts,
  filteredTableRows,
  percentText,
  tableColumnValues,
  type TableColumns,
} from './search-table-filters'
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
  type MarkGlyph,
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

type LanguageWord = { readonly [L in DisplayLanguage]: string }

const COLUMN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportColumns.map((entry) => [entry.rowId, entry.text]))
const STATUS_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportStatuses.map((entry) => [entry.rowId, entry.text]))
const SUMMARY_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportSummary.map((entry) => [entry.part, entry.text]))
const MARKDOWN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportMarkdown.map((entry) => [entry.part, entry.text]))
const REASON_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportReasons.map((entry) => [entry.part, entry.text]))

// see T-347
export const DELAY_REPORT_COLUMNS: readonly string[] = displayWords.delayReportColumns.map((entry) => entry.rowId)

const STATUS_COLUMN = 'DT-1'

// see DT-4, SJ-1
const JUMP_COLUMN_AT = DELAY_REPORT_COLUMNS.indexOf('DT-4')

// see RW-10
const LAST_FIXED_COLUMN = 'DT-4'

// see RW-3
const UNSEARCHED_COLUMNS: readonly string[] = ['DT-6', 'DT-7']

const WORD_COLUMNS_AT: readonly number[] = DELAY_REPORT_COLUMNS.flatMap((column, at) => (UNSEARCHED_COLUMNS.includes(column) ? [] : [at]))

// see VO-5, VS-6
const MILESTONE_ACHIEVED_ROW = 'VO-5'
const PARENT_PROGRESS_OUTSIDE_ROW = 'VS-6'

const DATE_RANGE = '〜'

const WORD_JOIN = ', '

// see RW-7
const REPORT_FILE_WORD = 'delay-diagnostics'

const FILE_NAME_JOIN = '_'

const MARKDOWN_EXTENSION = '.md'

// WHY: a filter change reads the columns and their kinds only; no word it would print is shown.
const COLUMNS_ONLY_LANGUAGE: DisplayLanguage = 'en'

// see T-315, RW-6
const STATUS_SYMBOLS: Readonly<Record<DelayReportStatus, string>> = {
  'DG-1': '?',
  doubtful: '',
  'DG-2': '\u{1F525}',
  'DG-3': '!!',
  'DG-4': '!',
  settled: '',
}

// see DT-1, RW-4, FR-133, T-315
const STATUS_GLYPHS: Readonly<Record<DelayReportStatus, MarkGlyph | null>> = {
  'DG-1': 'DG-1',
  doubtful: null,
  'DG-2': 'DG-2',
  'DG-3': 'DG-3',
  'DG-4': 'PM-4',
  settled: null,
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
  readonly glyph: MarkGlyph | null
  readonly text: string
}

export interface DelayDiagnosticsReportView extends Omit<SearchPanelView, 'table' | 'rows'> {
  readonly isInFront: boolean
  readonly toolEntries: readonly CommandItem[]
  readonly summary: readonly DelayReportLine[]
  readonly rows: readonly DelayReportRowView[]
  readonly jumpAt: number
}

interface ShownRow {
  readonly row: DelayReportRow
  readonly cells: readonly string[]
}

/** @purity pure */
function partWordOf(words: ReadonlyMap<string, LanguageWord>, part: string, language: DisplayLanguage): string {
  return wordOf(words.get(part), language)
}

/** @purity pure */
function partWordsIn(words: ReadonlyMap<string, LanguageWord>, language: DisplayLanguage): (part: string) => string {
  return (part) => partWordOf(words, part, language)
}

/** @purity pure */
function filled(pattern: string, slots: Readonly<Record<string, string | number>>): string {
  return Object.entries(slots).reduce((text, [slot, value]) => text.replace(`{${slot}}`, String(value)), pattern)
}

// see DT-1, DX-3, DX-9
/** @purity pure */
function statusWordOf(status: DelayReportStatus, language: DisplayLanguage): string {
  const row = status === 'doubtful' ? 'DX-3' : status === 'settled' ? 'DX-9' : status
  return partWordOf(STATUS_WORDS, row, language)
}

// see RW-6
/** @purity pure */
function statusText(status: DelayReportStatus, language: DisplayLanguage): string {
  const symbol = STATUS_SYMBOLS[status]
  return symbol === '' ? statusWordOf(status, language) : `${symbol} ${statusWordOf(status, language)}`
}

// see DT-1, RW-4, RW-6
/** @purity pure */
function statusTextIn(status: DelayReportStatus, language: DisplayLanguage, isWindow: boolean): string {
  return isWindow ? statusWordOf(status, language) : statusText(status, language)
}

/** @purity pure */
function datesText(start: string | null, finish: string | null, isOneDay: boolean): string {
  const [from, to] = [dateText(start), dateText(finish)]
  if (from === '') return ''
  return isOneDay || from === to ? from : `${from}${DATE_RANGE}${to}`
}

// see DT-7, VS-6
/** @purity pure */
function parentProgressSlotsOf(values: Extract<DelayReportReason, { kind: 'unreliable' }>['findings'][number]['values']): Readonly<Record<string, string | number>> {
  const day = (key: string) => dateText(typeof values[key] === 'string' ? values[key] : null)
  return {
    parent: day('parentPoint'),
    leftmost: day('leftmostPoint'),
    rightmost: day('rightmostPoint'),
    days: String(values['outsideWorkingDays']),
    tolerance: String(values['parentProgressToleranceDays']),
  }
}

// see DT-7, DX-3, T-312, VO-5, VS-6
/** @purity pure */
function findingText(one: Extract<DelayReportReason, { kind: 'unreliable' }>['findings'][number], language: DisplayLanguage): string {
  const word = partWordsIn(REASON_WORDS, language)
  const proposal = one.proposedActualFinish === null ? '' : filled(word('proposal'), { date: dateText(one.proposedActualFinish) })
  if (one.row === MILESTONE_ACHIEVED_ROW) return `${word('milestoneAchieved')}${proposal}`
  if (one.row === PARENT_PROGRESS_OUTSIDE_ROW) return `${filled(word('parentProgressOutside'), parentProgressSlotsOf(one.values))}${proposal}`
  // DEVIATION: spec says DT-7 prints the aspect word of a T-310 / T-311 row; here its row ID (DFC-1940).
  const aspect = one.kind === 'omission' ? word('missingActual') : one.row
  const values = Object.entries(one.values).map(([key, value]) => `${key}=${String(value)}`).join(' ')
  return `${values === '' ? aspect : filled(word('finding'), { aspect, values })}${proposal}`
}

// see DT-7, DX-3, DX-4, DX-9
/** @purity pure */
function reasonText(row: DelayReportRow, language: DisplayLanguage): string {
  const word = partWordsIn(REASON_WORDS, language)
  const reason = row.reason
  switch (reason.kind) {
    case 'unreliable': {
      const findings = reason.findings.map((one) => findingText(one, language))
      // DEVIATION: spec says DT-7 prints the T-316 wall word; here its row ID (DFC-1940).
      const walls = reason.walls.map((one) => filled(word('wall'), { wall: one.row, cause: row.name }))
      return [...findings, ...walls].join(WORD_JOIN)
    }
    case 'bottleneck': {
      const held = reason.quantities
      if (held === null) return ''
      const slots = { days: held.pushOutDays, inherited: held.inheritedDelayDays, own: held.selfDelayDays, ends: held.terminalsReached }
      return filled(word('bottleneck'), slots)
    }
    case 'settled':
      return reason.quantities === null ? '' : filled(word('settled'), { days: reason.quantities.pushOutDays })
    case 'bottleneckPath':
      return filled(word('bottleneckPath'), { names: reason.bottleneckNames.join(WORD_JOIN) })
    case 'late':
      return ''
  }
}

// see T-347
/** @purity pure */
function cellsOf(row: DelayReportRow, language: DisplayLanguage): readonly string[] {
  const isFinished = row.actualFinish !== null
  const cells: Readonly<Record<string, string>> = {
    'DT-1': statusWordOf(row.status, language),
    'DT-2': row.assigneeNames.join(ASSIGNEE_SEPARATOR),
    'DT-3': percentText(row.percentComplete),
    'DT-4': row.name,
    'DT-5': datesText(row.plannedStart, row.plannedFinish, isSameDay(row.plannedStart, row.plannedFinish)),
    'DT-6': isFinished || row.actualStart === null ? datesText(row.actualStart, row.actualFinish, false) : `${dateText(row.actualStart)}${DATE_RANGE}`,
    'DT-7': reasonText(row, language),
  }
  return DELAY_REPORT_COLUMNS.map((column) => cells[column] ?? BLANK_SEARCH_VALUE)
}

/** @purity pure */
function cellOf(shown: ShownRow, column: string): string {
  return shown.cells[DELAY_REPORT_COLUMNS.indexOf(column)] ?? BLANK_SEARCH_VALUE
}

// see DT-1, DT-3, T-347
const REPORT_TABLE: TableColumns<ShownRow> = {
  values: {
    'DT-1': (shown) => [shown.row.status],
    'DT-2': (shown) => (shown.row.assigneeNames.length === 0 ? [BLANK_SEARCH_VALUE] : shown.row.assigneeNames),
    'DT-3': (shown) => [cellOf(shown, 'DT-3')],
    'DT-4': (shown) => [shown.row.name],
    'DT-7': (shown) => [cellOf(shown, 'DT-7')],
  },
  dates: {
    'DT-5': (shown) => shown.row.plannedStart,
    'DT-6': (shown) => shown.row.actualStart,
  },
  orders: {
    'DT-1': (a, b) => DELAY_REPORT_STATUSES.indexOf(a as DelayReportStatus) - DELAY_REPORT_STATUSES.indexOf(b as DelayReportStatus),
    'DT-3': comparePercentTexts,
  },
}

// see RW-3, SV-4
/** @purity pure */
function isWordFound(shown: ShownRow, word: string): boolean {
  return word === '' || WORD_COLUMNS_AT.some((at) => isSearchWordFound(shown.cells[at] ?? '', word))
}

// see RW-3, RW-8, SV-7, SV-8
/** @purity pure */
function shownRowsOf(window: DelayDiagnosticsReportWindow, rows: readonly DelayReportRow[], language: DisplayLanguage): readonly ShownRow[] {
  const found = rows
    .map((row) => ({ row, cells: cellsOf(row, language) }))
    .filter((shown) => isWordFound(shown, window.panel.word))
  return filteredTableRows(found, REPORT_TABLE, window.panel.filters, window.panel.sort)
}

// see T-347, SV-7, RW-10
/** @purity pure */
function reportTableOf(found: () => readonly ShownRow[], language: DisplayLanguage): WindowTable {
  return {
    columns: DELAY_REPORT_COLUMNS,
    fixedCount: DELAY_REPORT_COLUMNS.indexOf(LAST_FIXED_COLUMN) + 1,
    headingOf: (column) => partWordOf(COLUMN_WORDS, column, language),
    isDateColumn: (column) => REPORT_TABLE.dates[column] !== undefined,
    valuesOf: (column) => tableColumnValues(found(), REPORT_TABLE, column),
    labelOf: (column, value) => (column === STATUS_COLUMN ? statusWordOf(value as DelayReportStatus, language) : value),
  }
}

// see RW-4, DX-2, DX-7
/** @purity pure */
function summaryOf(
  report: DelayDiagnosticsReport,
  rows: readonly DelayReportRow[],
  language: DisplayLanguage,
  isWindow: boolean,
): readonly DelayReportLine[] {
  const word = partWordsIn(SUMMARY_WORDS, language)
  const counts = DELAY_REPORT_STATUSES.map((status) => ({
    status,
    glyph: isWindow ? STATUS_GLYPHS[status] : null,
    text: filled(word('count'), { status: statusTextIn(status, language, isWindow), count: rows.filter((row) => row.status === status).length }),
  }))
  return [
    { status: null, glyph: null, text: filled(word('statusDate'), { date: dateText(report.statusDate) }) },
    ...counts,
    { status: null, glyph: null, text: filled(word('unanalysed'), { count: report.unanalysedCount }) },
  ]
}

// see RW-4, RW-6
/** @purity pure */
function summaryLineOf(summary: readonly DelayReportLine[], language: DisplayLanguage): string {
  const [date, ...rest] = summary.map((one) => one.text)
  const word = partWordsIn(SUMMARY_WORDS, language)
  return `${date ?? ''}${word('afterStatusDate')}${rest.join(word('between'))}`
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
  const found = shownRowsOf(window, all, language)
  const table = reportTableOf(() => found, language)
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
    summary: isOpen ? summaryOf(report, all, language, true) : [],
    columns: tableColumnsOf(window.panel, table, language),
    filterMenu: open === null ? null : tableFilterMenuOf(window.panel, open, table, language),
    rows: found.map((shown) => ({
      cells: shown.cells,
      glyph: STATUS_GLYPHS[shown.row.status],
      status: shown.row.status,
      target: { kind: 'task', taskUid: shown.row.taskUid },
    })),
    jumpAt: JUMP_COLUMN_AT,
    glyphAt: DELAY_REPORT_COLUMNS.indexOf(STATUS_COLUMN),
  }
}

// see T-346, SV-7, SV-8, WB-2, WB-3, RW-1
// WHY: { window: null } is a close; null is an entry the window does not answer.
/** @purity pure */
export function delayDiagnosticsReportAfterEntry(
  window: DelayDiagnosticsReportWindow,
  entry: IconId,
  filterColumn: string | null,
  rows: { readonly report: DelayDiagnosticsReport; readonly schedule: Schedule; readonly language: DisplayLanguage },
  listed?: readonly string[] | null,
): { readonly window: DelayDiagnosticsReportWindow | null } | null {
  const shown = windowShownAfterEntry(window.shown, entry)
  if (shown === null) return { window: null }
  if (shown !== undefined) return { window: { ...window, shown } }
  const unfiltered = { ...window, panel: { ...window.panel, filters: { ...window.panel.filters, columns: [] } } }
  const all = delayDiagnosticsReportRows(rows.report, rows.schedule)
  const table = reportTableOf(() => shownRowsOf(unfiltered, all, rows.language), rows.language)
  const panel =
    entry === FILTER_ENTRY
      ? filterColumn === null ? null : tableWithFilterOpened(window.panel, window.shown, filterColumn, table)
      : tableAfterFilterEntry(window.panel, window.shown, entry, table, listed)
  return panel === null ? null : { window: { ...window, panel } }
}

// see SV-7
/** @purity pure */
export function delayDiagnosticsReportAfterFilterChange(
  window: DelayDiagnosticsReportWindow,
  change: SearchFilterChange,
): DelayDiagnosticsReportWindow {
  const panel = tableAfterFilterChange(window.panel, window.shown, change, reportTableOf(() => [], COLUMNS_ONLY_LANGUAGE))
  return panel === null ? window : { ...window, panel }
}

// see SV-14, IN-4
/** @purity pure */
export function delayDiagnosticsReportWithFilterClosed(window: DelayDiagnosticsReportWindow): DelayDiagnosticsReportWindow | null {
  const panel = tableWithFilterClosed(window.panel, window.shown, reportTableOf(() => [], COLUMNS_ONLY_LANGUAGE))
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
/** @purity pure */
function markdownWordsOf(language: DisplayLanguage): DelayReportWords {
  const statuses = Object.fromEntries(
    DELAY_REPORT_STATUSES.map((status) => [status, { symbol: STATUS_SYMBOLS[status], word: statusWordOf(status, language) }]),
  ) as DelayReportWords['statuses']
  const word = partWordsIn(MARKDOWN_WORDS, language)
  return {
    heading: wordOf(HEADING, language),
    documentName: word('documentName'),
    madeAt: word('madeAt'),
    filter: word('filter'),
    none: word('none'),
    columns: DELAY_REPORT_COLUMNS.map((column) => partWordOf(COLUMN_WORDS, column, language)),
    statuses,
  }
}

// see FR-134, RW-4, RW-6, IC-108, IC-140
/** @purity pure */
export function delayDiagnosticsReportMarkdownOf(
  window: DelayDiagnosticsReportWindow,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  language: DisplayLanguage,
  stamp: { readonly documentName: string; readonly madeAt: string },
): string {
  const all = delayDiagnosticsReportRows(report, schedule)
  const rows = shownRowsOf(window, all, language).map((shown) => ({ status: shown.row.status, cells: shown.cells }))
  const columns = window.panel.filters.columns.map((one) => ({
    heading: partWordOf(COLUMN_WORDS, one.column, language),
    condition: one.hiddenValues.length > 0 ? `-(${one.hiddenValues.map((value) => (one.column === STATUS_COLUMN ? statusText(value as DelayReportStatus, language) : value)).join(WORD_JOIN)})` : `${dateText(one.from)}${DATE_RANGE}${dateText(one.to)}`,
  }))
  const summary = summaryOf(report, all, language, false)
  const dates = {
    documentName: stamp.documentName,
    statusDateLine: summary[0]?.text ?? '',
    madeAt: stamp.madeAt,
    summaryLine: summaryLineOf(summary, language),
  }
  return delayDiagnosticsReportMarkdown(rows, { word: window.panel.word, columns }, markdownWordsOf(language), dates)
}

// see RW-7, FN-5
/** @purity pure */
export function delayDiagnosticsReportFileNameOf(documentName: string, statusDate: string | null): string {
  const body = exportNameBodyOf(documentName)
  const day = dateText(statusDate).replace(/\//g, '-')
  return [...(body === '' ? [] : [body]), REPORT_FILE_WORD, day].join(FILE_NAME_JOIN) + MARKDOWN_EXTENSION
}

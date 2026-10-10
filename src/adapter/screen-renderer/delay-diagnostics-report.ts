// Builds the Delay Diagnostics Report window for one frame, its Visibility column, its fix tables (FR-155), and the Markdown its IC-108 and IC-140 hand out.
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
import type { DelayFixRow } from '../../entity/document-model/schedule/delay-fixes'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  emptySearchPanelSession,
  type ScreenSession,
  type TableView,
} from '../../use-case/advance-screen-session/advance-screen-session'
import displayWords from './display-words.json'
import propertyItems from './property-items.json'
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
  withVisibilityColumn,
  type TableColumns,
} from './search-table-filters'
import {
  clearEntryOf,
  dateText,
  entryOf,
  panelWithFilterShut,
  scheduleFilterEntryOf,
  scheduleFilterRefusalsOf,
  tableAfterFilterChange,
  tableAfterVisibilityChange,
  tableWithFilterClosed,
  tableWithScheduleFilterOff,
  visibilityHeadingOf,
  visibilityLabelOf,
  windowAfterEntry,
  windowColumnsViewOf,
  windowTitleEntriesOf,
  windowWithColumnWidth,
  wordOf,
  wouldScheduleFilterChange,
  type MarkGlyph,
  type SearchFilterChange,
  type TableLook,
  type TableWindowState,
  type WindowStep,
  type WindowTable,
} from './table-window'
import { windowPlaceInRange } from './window-box'

const DELAY_DIAGNOSTICS_REPORT = 'Delay Diagnostics Report'

const EXPORT_ENTRY: IconId = 'IC-140'
const COPY_ENTRY: IconId = 'IC-108'
const TEXT_SIZE_ENTRY: IconId = 'IC-127'

const HEADING = displayWords.surfaces.find((entry) => entry.name === DELAY_DIAGNOSTICS_REPORT)?.heading

type LanguageWord = { readonly [L in DisplayLanguage]: string }

const COLUMN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportColumns.map((entry) => [entry.rowId, entry.text]))
const STATUS_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportStatuses.map((entry) => [entry.rowId, entry.text]))
const SUMMARY_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportSummary.map((entry) => [entry.part, entry.text]))
const MARKDOWN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportMarkdown.map((entry) => [entry.part, entry.text]))
const REASON_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportReasons.map((entry) => [entry.part, entry.text]))
// see DT-7, T-310, T-311, T-316
const ASPECT_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportAspects.map((entry) => [entry.rowId, entry.text]))
const WALL_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayReportWalls.map((entry) => [entry.rowId, entry.text]))

// see T-347
export const DELAY_REPORT_COLUMNS: readonly string[] = displayWords.delayReportColumns.map((entry) => entry.rowId)

const STATUS_COLUMN = 'DT-1'

const VISIBILITY_COLUMN = 'DT-8'

// WHY: the Visibility column is a tool laid on the schedule, not a finding, so the Markdown neither prints nor filters by it.
const MARKDOWN_COLUMNS: readonly string[] = DELAY_REPORT_COLUMNS.filter((column) => column !== VISIBILITY_COLUMN)

// see DT-4, SJ-1
const JUMP_COLUMN_AT = DELAY_REPORT_COLUMNS.indexOf('DT-4')

// see RW-10
const LAST_FIXED_COLUMN = 'DT-4'

// see RW-3
const UNSEARCHED_COLUMNS: readonly string[] = ['DT-6', 'DT-7']

// see RW-9, SV-18
const MEASURED_COLUMNS: readonly string[] = ['DT-1', 'DT-3', 'DT-5', 'DT-6']

const WORD_COLUMNS_AT: readonly number[] = DELAY_REPORT_COLUMNS.flatMap((column, at) => (UNSEARCHED_COLUMNS.includes(column) ? [] : [at]))

// see VO-5, VS-6
const MILESTONE_ACHIEVED_ROW = 'VO-5'
const PARENT_PROGRESS_OUTSIDE_ROW = 'VS-6'

// see DT-5, DT-6, TL-5
const DATE_RANGE = ' - '

// see DT-6
const OPEN_DATE_RANGE = ' -'

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

// see RW-1, RW-5, RW-8, RW-11, S-451, S-564, WB-6
// WHY: held by the shell and never saved (FR-134, FR-155 MUST NOT); the text size is the search panel's (CR-617 decision 3).
// fixes absent reads as the diagnosis table with nothing picked.
export interface DelayDiagnosticsReportWindow extends TableWindowState {
  readonly fixes?: DelayFixWindowValues
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
// WHY: glyph null keeps a blank of the picture's width (a status with no picture); absent means no picture place.
export interface DelayReportLine {
  readonly status: DelayReportStatus | null
  readonly glyph?: MarkGlyph | null
  readonly text: string
}

// WHY: the fix members are optional, so a view built before FR-155 reads as the diagnosis table alone.
export interface DelayDiagnosticsReportView extends Omit<SearchPanelView, 'table' | 'rows'>, Partial<DelayFixView> {
  readonly isInFront: boolean
  readonly toolEntries: readonly CommandItem[]
  readonly summary: readonly DelayReportLine[]
  readonly rows: readonly (DelayReportRowView | DelayFixRowView)[]
  readonly jumpAt: number
}

interface ShownTaskGroup {
  readonly row: DelayReportRow
  readonly cells: readonly string[]
}

/** @purity pure */
function partWordOf(words: ReadonlyMap<string, LanguageWord>, part: string, language: DisplayLanguage): string {
  return wordOf(words.get(part), language)
}

// WHY: a row a table gained before its word was written prints its row ID, as the generator's banner says.
/** @purity pure */
function rowWordOf(words: ReadonlyMap<string, LanguageWord>, row: string, language: DisplayLanguage): string {
  const held = words.get(row)
  return held === undefined ? row : wordOf(held, language)
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
  const aspect = one.kind === 'omission' ? word('missingActual') : rowWordOf(ASPECT_WORDS, one.row, language)
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
      const walls = reason.walls.map((one) => filled(word('wall'), { wall: rowWordOf(WALL_WORDS, one.row, language), cause: one.causeName }))
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
      return reason.days === null ? '' : filled(word('late'), { days: reason.days })
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
    'DT-6': isFinished || row.actualStart === null ? datesText(row.actualStart, row.actualFinish, false) : `${dateText(row.actualStart)}${OPEN_DATE_RANGE}`,
    'DT-7': reasonText(row, language),
  }
  return DELAY_REPORT_COLUMNS.map((column) => cells[column] ?? BLANK_SEARCH_VALUE)
}

// see DT-8, TV-2, S-565
/** @purity pure */
function reportColumnsOf(view: TableView): TableColumns<ShownTaskGroup> {
  const hidden = new Set(view.visibility.hiddenKeys)
  return withVisibilityColumn(REPORT_TABLE, VISIBILITY_COLUMN, (shown) => !hidden.has(shown.row.taskUid))
}

/** @purity pure */
function cellOf(shown: ShownTaskGroup, column: string): string {
  return shown.cells[DELAY_REPORT_COLUMNS.indexOf(column)] ?? BLANK_SEARCH_VALUE
}

// see DT-1, DT-3, T-347
const REPORT_TABLE: TableColumns<ShownTaskGroup> = {
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
function isWordFound(shown: ShownTaskGroup, word: string): boolean {
  return word === '' || WORD_COLUMNS_AT.some((at) => isSearchWordFound(shown.cells[at] ?? '', word))
}

/** @purity pure */
function taskGroupsWithCells(rows: readonly DelayReportRow[], language: DisplayLanguage): readonly ShownTaskGroup[] {
  return rows.map((row) => ({ row, cells: cellsOf(row, language) }))
}

// see RW-3, RW-8, SV-7, SV-8
/** @purity pure */
function shownTaskGroupsOf(look: TableLook, rows: readonly DelayReportRow[], language: DisplayLanguage): readonly ShownTaskGroup[] {
  return shownTaskGroupsFrom(look, taskGroupsWithCells(rows, language))
}

/** @purity pure */
function shownTaskGroupsFrom(look: TableLook, all: readonly ShownTaskGroup[]): readonly ShownTaskGroup[] {
  const found = all.filter((shown) => isWordFound(shown, look.word))
  return filteredTableRows(found, reportColumnsOf(look.view), look.view.columnFilters, look.view.sort)
}

// see RW-9, SV-18, DT-1
/** @purity pure */
function reportWidthSamplesIn(all: readonly ShownTaskGroup[], language: DisplayLanguage): (column: string) => readonly string[] | null {
  return (column) => {
    if (!MEASURED_COLUMNS.includes(column)) return null
    if (column === STATUS_COLUMN) return DELAY_REPORT_STATUSES.map((status) => statusWordOf(status, language))
    return [...new Set(all.map((shown) => cellOf(shown, column)))]
  }
}

/** @purity pure */
function reportLabelOf(column: string, value: string, language: DisplayLanguage): string {
  if (column === VISIBILITY_COLUMN) return visibilityLabelOf(value, language) ?? value
  return column === STATUS_COLUMN ? statusWordOf(value as DelayReportStatus, language) : value
}

// see T-347, SV-7, RW-10
/** @purity pure */
function reportTableOf(
  view: TableView,
  found: () => readonly ShownTaskGroup[],
  language: DisplayLanguage,
  all?: readonly ShownTaskGroup[],
): WindowTable {
  const columns = reportColumnsOf(view)
  return {
    columns: DELAY_REPORT_COLUMNS,
    fixedCount: DELAY_REPORT_COLUMNS.indexOf(LAST_FIXED_COLUMN) + 1,
    headingOf: (column) => partWordOf(COLUMN_WORDS, column, language),
    isDateColumn: (column) => REPORT_TABLE.dates[column] !== undefined,
    valuesOf: (column) => tableColumnValues(found(), columns, column),
    labelOf: (column, value) => reportLabelOf(column, value, language),
    ...(all === undefined ? {} : { widthSamplesOf: reportWidthSamplesIn(all, language) }),
  }
}

// WHY: the report shows only the tasks it rows, so a report that leaves one out changes the schedule with no row Hide.
/** @purity pure */
function wouldReportFilterChange(view: TableView, rows: readonly DelayReportRow[], schedule: Schedule): boolean {
  const rowed = new Set(rows.map((row) => row.taskUid))
  const isEveryTaskRowed = schedule.tasks.every((task) => rowed.has(task.uid))
  return wouldScheduleFilterChange(view.visibility, () => rowed, isEveryTaskRowed)
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
    ...(isWindow ? { glyph: STATUS_GLYPHS[status] } : {}),
    text: filled(word('count'), { status: statusTextIn(status, language, isWindow), count: rows.filter((row) => row.status === status).length }),
  }))
  return [
    { status: null, text: filled(word('statusDate'), { date: dateText(report.statusDate) }) },
    ...counts,
    { status: null, text: filled(word('unreliable'), { count: report.unreliableCount }) },
  ]
}

// see RW-4, RW-6
/** @purity pure */
function summaryLineOf(summary: readonly DelayReportLine[], language: DisplayLanguage): string {
  const [date, ...rest] = summary.map((one) => one.text)
  const word = partWordsIn(SUMMARY_WORDS, language)
  return `${date ?? ''}${word('afterStatusDate')}${rest.join(word('between'))}`
}

// see FR-134, FR-155, T-346, RW-2, RW-3, RW-4, RW-9, RW-11, S-564
/** @purity pure */
export function delayDiagnosticsReportFromWindow(
  session: ScreenSession,
  window: DelayDiagnosticsReportWindow | null,
  view: TableView,
  report: DelayDiagnosticsReport | null,
  schedule: Schedule,
  layout: { readonly canvas: ScreenRect; readonly textSizeStep: number },
  fixTables: DelayFixTables = NO_DELAY_FIX_TABLES,
): DelayDiagnosticsReportView | null {
  if (window === null || report === null) return null
  const language = displayLanguageOf(session)
  const words = fixWordsOf(schedule, language)
  const values = delayFixValuesOf(window)
  const table = values.table === 'diagnosis' ? diagnosisTableViewOf(window, view, report, schedule, language) : fixTableViewOf(window, values.table, fixTables, words)
  return {
    heading: wordOf(HEADING, language),
    shown: window.shown,
    isInFront: window.isInFront,
    canvas: layout.canvas,
    ...windowPlaceInRange(window.panel, layout.canvas),
    textSizeStep: layout.textSizeStep,
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(window.shown, language)],
    toolEntries: [entryOf(EXPORT_ENTRY, language), entryOf(COPY_ENTRY, language)],
    word: window.panel.word,
    summary: [],
    glyphAt: null,
    showAt: null,
    showHeading: 'none',
    entryRefusals: [],
    ...table,
    ...delayFixViewOf(values, fixTables, words),
  }
}

// see FR-134, T-346, RW-2, RW-3, RW-4, RW-9, S-564
// WHY: IC-143 and the summary stand only while the diagnosis table is shown (RW-2, RW-11).
/** @purity pure */
function diagnosisTableViewOf(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  language: DisplayLanguage,
): Partial<DelayDiagnosticsReportView> & Pick<DelayDiagnosticsReportView, 'rows' | 'columns' | 'filterMenu' | 'jumpAt' | 'tableEntries'> {
  const isOpen = window.shown !== 'minimized'
  const reported = delayDiagnosticsReportRows(report, schedule)
  const all = isOpen ? reported : []
  const withCells = taskGroupsWithCells(all, language)
  const found = shownTaskGroupsFrom({ word: window.panel.word, view }, withCells)
  const table = reportTableOf(view, () => found, language, withCells)
  const scheduleFilter = scheduleFilterEntryOf(view.visibility, wouldReportFilterChange(view, reported, schedule), language)
  const rows = reportRowViewsOf(view, found)
  return {
    tableEntries: [clearEntryOf(view, language), scheduleFilter],
    summary: isOpen ? summaryOf(report, all, language, true) : [],
    ...windowColumnsViewOf(window, view, table, language),
    rows,
    jumpAt: JUMP_COLUMN_AT,
    glyphAt: DELAY_REPORT_COLUMNS.indexOf(STATUS_COLUMN),
    showAt: DELAY_REPORT_COLUMNS.indexOf(VISIBILITY_COLUMN),
    showHeading: visibilityHeadingOf(rows),
    entryRefusals: scheduleFilterRefusalsOf(scheduleFilter, language),
  }
}

/** @purity pure */
function reportRowViewsOf(view: TableView, found: readonly ShownTaskGroup[]): readonly DelayReportRowView[] {
  const hidden = new Set(view.visibility.hiddenKeys)
  return found.map((shown) => ({
    cells: shown.cells,
    glyph: STATUS_GLYPHS[shown.row.status],
    status: shown.row.status,
    shown: !hidden.has(shown.row.taskUid),
    target: { kind: 'task', taskUid: shown.row.taskUid },
  }))
}

// see T-346, SV-7, SV-8, WB-2, WB-3, RW-1, RW-2, RW-11, RW-12, RW-14, IC-153, TV-8, UN-20
// WHY: { window: null } is a close; null is an entry the window does not answer.
/** @purity pure */
export function delayDiagnosticsReportAfterEntry(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  entry: IconId,
  filterColumn: string | null,
  rows: { readonly report: DelayDiagnosticsReport; readonly schedule: Schedule; readonly language: DisplayLanguage; readonly fixTables?: DelayFixTables },
  listed?: readonly string[] | null,
): DelayReportStep | null {
  const tables = rows.fixTables ?? NO_DELAY_FIX_TABLES
  const words = fixWordsOf(rows.schedule, rows.language)
  const fixed = delayFixStepAfterEntry(window, view, entry, tables, words) ?? fixTableStepAfterEntry(window, view, entry, filterColumn, { tables, words, listed: listed ?? null })
  if (fixed !== null || delayFixValuesOf(window).table !== 'diagnosis') return fixed
  const all = delayDiagnosticsReportRows(rows.report, rows.schedule)
  const word = window.panel.word
  return windowAfterEntry(window, view, entry, filterColumn, {
    wouldChange: () => wouldReportFilterChange(view, all, rows.schedule),
    tableOf: (unfiltered) => reportTableOf(view, () => shownTaskGroupsOf({ word, view: unfiltered }, all, rows.language), rows.language),
  }, listed)
}

// see SV-7, DT-8, TV-2, UN-20
/** @purity pure */
export function delayDiagnosticsReportAfterFilterChange(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  change: SearchFilterChange,
): TableView {
  const after =
    change.kind === 'shown'
      ? tableAfterVisibilityChange(view, change.keys, change.isShown)
      : tableAfterFilterChange(window.panel, view, window.shown, change, reportTableOf(view, () => [], COLUMNS_ONLY_LANGUAGE))
  return after ?? view
}

// see SV-14, IN-4
/** @purity pure */
export function delayDiagnosticsReportWithFilterClosed(window: DelayDiagnosticsReportWindow, view: TableView): DelayDiagnosticsReportWindow | null {
  const panel = tableWithFilterClosed(window.panel, window.shown, reportTableOf(view, () => [], COLUMNS_ONLY_LANGUAGE))
  return panel === null ? null : { ...window, panel }
}

// see RW-9, SV-18, GR-28
/** @purity pure */
export function delayDiagnosticsReportWithColumnWidth(
  window: DelayDiagnosticsReportWindow,
  column: string,
  width: number,
): DelayDiagnosticsReportWindow {
  return windowWithColumnWidth(window, column, width)
}

// see RW-6, DT-8
/** @purity pure */
function markdownViewOf(view: TableView): TableView {
  const columnFilters = view.columnFilters.filter((one) => one.column !== VISIBILITY_COLUMN)
  const sort = view.sort?.column === VISIBILITY_COLUMN ? null : view.sort
  return { ...view, columnFilters, sort }
}

/** @purity pure */
function markdownCellsOf(cells: readonly string[]): readonly string[] {
  return cells.filter((_, at) => DELAY_REPORT_COLUMNS[at] !== VISIBILITY_COLUMN)
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
    columns: MARKDOWN_COLUMNS.map((column) => partWordOf(COLUMN_WORDS, column, language)),
    statuses,
  }
}

// see FR-134, RW-4, RW-6, IC-108, IC-140
/** @purity pure */
export function delayDiagnosticsReportMarkdownOf(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  language: DisplayLanguage,
  stamp: { readonly documentName: string; readonly madeAt: string },
): string {
  const all = delayDiagnosticsReportRows(report, schedule)
  const printed = markdownViewOf(view)
  const look = { word: window.panel.word, view: printed }
  const rows = shownTaskGroupsOf(look, all, language).map((shown) => ({ status: shown.row.status, cells: markdownCellsOf(shown.cells) }))
  const columns = printed.columnFilters.map((one) => ({
    heading: partWordOf(COLUMN_WORDS, one.column, language),
    condition: one.hiddenValues.length > 0 ? `-(${one.hiddenValues.map((value) => (one.column === STATUS_COLUMN ? statusText(value as DelayReportStatus, language) : value)).join(WORD_JOIN)})` : `${dateText(one.fromDate)}${DATE_RANGE}${dateText(one.toDate)}`,
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

const DIAGNOSIS_ENTRY: IconId = 'IC-154'
const PROPOSALS_ENTRY: IconId = 'IC-155'
const LOG_ENTRY: IconId = 'IC-156'
const OVERWRITE_FIX_ENTRY: IconId = 'IC-157'
const BACKUP_FIX_ENTRY: IconId = 'IC-158'
const PREVIOUS_FIX_ENTRY: IconId = 'IC-159'
const NEXT_FIX_ENTRY: IconId = 'IC-160'

// see RW-11, RW-12, RW-14, T-290
const TABLE_OF_ENTRY: { readonly [entry: IconId]: DelayReportTable } = {
  [DIAGNOSIS_ENTRY]: 'diagnosis',
  [PROPOSALS_ENTRY]: 'proposals',
  [LOG_ENTRY]: 'log',
}

const WRITE_FORM_OF_ENTRY: { readonly [entry: IconId]: DelayFixWriteForm } = {
  [OVERWRITE_FIX_ENTRY]: 'beforeFixOverwrite',
  [BACKUP_FIX_ENTRY]: 'beforeFixBackup',
}

const STEP_OF_ENTRY: { readonly [entry: IconId]: number } = { [PREVIOUS_FIX_ENTRY]: -1, [NEXT_FIX_ENTRY]: 1 }

const FIX_COLUMN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayFixColumns.map((entry) => [entry.rowId, entry.text]))
const FIX_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.delayFixes.map((entry) => [entry.part, entry.text]))
const ITEM_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.properties.map((entry) => [entry.rowId, entry.label]))
const PANEL_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry.text]))

// see FM-6, T-016
const ITEM_OF_TASK_COLUMN: ReadonlyMap<string, string> = new Map(
  propertyItems.items.filter((item) => item.appliesTo === 'Task' && item.columns.length === 1).map((item) => [item.columns[0] ?? '', item.rowId]),
)

// see T-374
const PROPOSAL_COLUMNS: readonly string[] = ['FM-1', 'FM-3', 'FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8']
const LOG_COLUMNS: readonly string[] = ['FM-2', 'FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8']

const FIX_JUMP_COLUMN = 'FM-5'

// see FM-1, SV-7
const CHECK_MARK = '✓'

const FIX_TYPE_ORDER: readonly DelayFixRow['fixType'][] = ['automatic', 'choose', 'suggestedDate', 'byHand']

const FIX_COUNT_OPEN = ' ('
const FIX_COUNT_CLOSE = ')'

export type DelayReportTable = 'diagnosis' | 'proposals' | 'log'

type FixTable = Exclude<DelayReportTable, 'diagnosis'>

export type DelayFixWriteForm = 'beforeFixOverwrite' | 'beforeFixBackup'

// see RW-16, FM-1, FM-8
export interface DelayFixPick {
  readonly isChecked: boolean | null
  readonly choice: number | null
  readonly date: string | null
}

// see RW-11, RW-14, RW-16, FR-155
// WHY: screen values the window holds and never saves (FR-155 MUST NOT); views keep each fix table's own filters and sort.
export interface DelayFixWindowValues {
  readonly table: DelayReportTable
  readonly views: Readonly<Record<FixTable, TableView>>
  readonly picks: Readonly<Record<string, DelayFixPick>>
  readonly at: string | null
}

// see DX-11, DX-12, T-374
export interface DelayFixLogEntry {
  readonly row: DelayFixRow
  readonly fixedAt: string | null
}

export interface DelayFixTables {
  readonly proposals: readonly DelayFixRow[]
  readonly log: readonly DelayFixLogEntry[]
}

export const NO_DELAY_FIX_TABLES: DelayFixTables = { proposals: [], log: [] }

const NO_FIX_VIEW: TableView = {
  visibility: { hiddenKeys: [], isUnassignedHidden: false, isApplied: false },
  columnFilters: [],
  sort: null,
}

export const NO_DELAY_FIX_VALUES: DelayFixWindowValues = {
  table: 'diagnosis',
  views: { proposals: NO_FIX_VIEW, log: NO_FIX_VIEW },
  picks: {},
  at: null,
}

// see FM-1, FM-8, T-373
export interface DelayFixCellView {
  readonly key: string
  readonly check: 'on' | 'off' | 'disabled' | 'none'
  readonly choices: readonly { readonly label: string; readonly isChosen: boolean }[] | null
  readonly date: string | null
  readonly isCurrent: boolean
}

export interface DelayFixRowView extends SearchRowView {
  readonly status: null
  readonly fix: DelayFixCellView | null
}

export interface DelayFixFooterView {
  readonly text: string
  readonly entries: readonly CommandItem[]
}

// WHY: a step that asks the shell for more than a window and a view: a save before a fix bundle, or a jump.
export type DelayReportAsk =
  | { readonly kind: 'fixWrite'; readonly writeForm: DelayFixWriteForm; readonly fixBundle: readonly DelayFixRow[] }
  | { readonly kind: 'fixJump'; readonly target: SearchRowView['target'] }

export interface DelayReportStep extends WindowStep {
  readonly asked?: DelayReportAsk
}

/** @purity pure */
export function delayFixValuesOf(window: DelayDiagnosticsReportWindow): DelayFixWindowValues {
  return window.fixes ?? NO_DELAY_FIX_VALUES
}

/** @purity pure */
function withFixValues(window: DelayDiagnosticsReportWindow, changed: Partial<DelayFixWindowValues>): DelayDiagnosticsReportWindow {
  return { ...window, fixes: { ...delayFixValuesOf(window), ...changed } }
}

// see RW-16
/** @purity pure */
export function delayFixKeyOf(row: Pick<DelayFixRow, 'findingRow' | 'taskUid' | 'column'>): string {
  return `${row.findingRow}|${row.taskUid}|${row.column ?? ''}`
}

/** @purity pure */
function fixWordOf(part: string, language: DisplayLanguage): string {
  return partWordOf(FIX_WORDS, part, language)
}

// see FM-7, FM-8, SV-7
/** @purity pure */
function fixValueText(value: unknown, language: DisplayLanguage): string {
  if (value === null || value === undefined || value === '') return wordOf(PANEL_WORDS.get('blank'), language)
  if (typeof value === 'boolean') return value ? CHECK_MARK : BLANK_SEARCH_VALUE
  if (typeof value === 'string' && dateText(value) !== '') return dateText(value)
  return String(value)
}

// see FM-6, T-016
/** @purity pure */
function fixColumnWordOf(column: string | null, language: DisplayLanguage): string {
  if (column === null) return BLANK_SEARCH_VALUE
  const item = ITEM_WORDS.has(column) ? column : ITEM_OF_TASK_COLUMN.get(column)
  return item === undefined ? column : rowWordOf(ITEM_WORDS, item, language)
}

// see FM-4, DT-7, VO-5
/** @purity pure */
function fixFindingText(row: DelayFixRow, language: DisplayLanguage): string {
  const aspect = row.findingRow === MILESTONE_ACHIEVED_ROW ? partWordOf(REASON_WORDS, 'milestoneAchieved', language) : rowWordOf(ASPECT_WORDS, row.findingRow, language)
  return row.causedBy === null || row.causedBy === undefined ? aspect : `${fixWordOf('cascadePrefix', language)} ${aspect}`
}

// see FM-8, T-373
/** @purity pure */
function fixChoiceText(choice: unknown, language: DisplayLanguage): string {
  if (typeof choice === 'string') return FIX_WORDS.has(choice) ? fixWordOf(choice, language) : choice
  const held = (choice ?? {}) as { readonly part?: unknown; readonly slots?: Readonly<Record<string, unknown>> }
  const slots = Object.fromEntries(Object.entries(held.slots ?? {}).map(([slot, value]) => [slot, fixValueText(value, language)]))
  return typeof held.part === 'string' ? filled(fixWordOf(held.part, language), slots) : BLANK_SEARCH_VALUE
}

// see FM-8, T-373, RW-13
/** @purity pure */
function fixAfterText(row: DelayFixRow, pick: DelayFixPick | undefined, language: DisplayLanguage): string {
  if (isRefused(row)) return fixWordOf('readOnlyReason', language)
  if (row.fixType === 'byHand') return fixWordOf('openFieldHint', language)
  if (row.fixType === 'choose' && (pick?.choice ?? null) === null) return fixWordOf('choosePlaceholder', language)
  const after = fixValueText(row.after, language)
  return row.fixType === 'suggestedDate' ? `${after} ${fixWordOf('suggested', language)}` : after
}

// see RW-16, T-374
/** @purity pure */
function originOf(row: DelayFixRow, rows: readonly DelayFixRow[]): DelayFixRow | null {
  const by: unknown = row.causedBy
  if (typeof by === 'number') return rows[by] ?? null
  if (typeof by !== 'string') return null
  return rows.find((one) => delayFixKeyOf(one) === by || one.fixRow === by) ?? null
}

/** @purity pure */
function isRefused(row: DelayFixRow): boolean {
  return row.refusal !== null && row.refusal !== undefined
}

// see FM-1, T-373, RW-16
// WHY: a cascade row whose origin is not checked can never be checked (RW-16), and a read-only one never.
/** @purity pure */
export function isDelayFixChecked(row: DelayFixRow, rows: readonly DelayFixRow[], picks: DelayFixWindowValues['picks']): boolean {
  if (row.fixType === 'byHand' || isRefused(row)) return false
  const origin = originOf(row, rows)
  if (origin !== null && !isDelayFixChecked(origin, rows, picks)) return false
  const pick = picks[delayFixKeyOf(row)]
  if (row.fixType === 'choose' && (pick?.choice ?? null) === null) return false
  return pick?.isChecked ?? (row.fixType === 'automatic' || row.fixType === 'choose')
}

// see FM-1
/** @purity pure */
function fixCheckOf(row: DelayFixRow, rows: readonly DelayFixRow[], picks: DelayFixWindowValues['picks']): DelayFixCellView['check'] {
  if (row.fixType === 'byHand') return 'none'
  const origin = originOf(row, rows)
  const isOff = isRefused(row) || (origin !== null && !isDelayFixChecked(origin, rows, picks))
  if (isOff) return 'disabled'
  return isDelayFixChecked(row, rows, picks) ? 'on' : 'off'
}

/** @purity pure */
function proposalCellsOf(row: DelayFixRow, rows: readonly DelayFixRow[], picks: DelayFixWindowValues['picks'], words: FixWords): readonly string[] {
  const cells: Readonly<Record<string, string>> = {
    'FM-1': isDelayFixChecked(row, rows, picks) ? CHECK_MARK : BLANK_SEARCH_VALUE,
    'FM-3': fixWordOf(row.fixType, words.language),
    ...sharedFixCellsOf(row, picks[delayFixKeyOf(row)], words),
  }
  return PROPOSAL_COLUMNS.map((column) => cells[column] ?? BLANK_SEARCH_VALUE)
}

interface FixWords {
  readonly language: DisplayLanguage
  readonly nameOf: (taskUid: number) => string
}

/** @purity pure */
function fixWordsOf(schedule: Schedule, language: DisplayLanguage): FixWords {
  const names = new Map(schedule.tasks.map((task) => [task.uid, task.name]))
  return { language, nameOf: (taskUid) => names.get(taskUid) ?? String(taskUid) }
}

/** @purity pure */
function sharedFixCellsOf(row: DelayFixRow, pick: DelayFixPick | undefined, words: FixWords): Readonly<Record<string, string>> {
  const language = words.language
  return {
    'FM-4': fixFindingText(row, language),
    'FM-5': words.nameOf(row.taskUid),
    'FM-6': fixColumnWordOf(row.column, language),
    'FM-7': fixValueText(row.before, language),
    'FM-8': fixAfterText(row, pick, language),
  }
}

// see FM-2
/** @purity pure */
function logCellsOf(entry: DelayFixLogEntry, words: FixWords): readonly string[] {
  const cells: Readonly<Record<string, string>> = {
    'FM-2': entry.fixedAt ?? BLANK_SEARCH_VALUE,
    ...sharedFixCellsOf(entry.row, { isChecked: true, choice: 0, date: null }, words),
  }
  return LOG_COLUMNS.map((column) => cells[column] ?? BLANK_SEARCH_VALUE)
}

interface ShownFixRow {
  readonly row: DelayFixRow
  readonly cells: readonly string[]
  readonly columns: readonly string[]
}

/** @purity pure */
function fixCellOf(shown: ShownFixRow, column: string): string {
  return shown.cells[shown.columns.indexOf(column)] ?? BLANK_SEARCH_VALUE
}

// see T-374, SV-7, SV-8, FM-2
const FIX_TABLE: TableColumns<ShownFixRow> = {
  values: Object.fromEntries(['FM-1', 'FM-3', 'FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8'].map((column) => [column, (shown: ShownFixRow) => [fixCellOf(shown, column)]])),
  dates: { 'FM-2': (shown) => (shown.columns.includes('FM-2') ? fixCellOf(shown, 'FM-2').replace(/\//g, '-').slice(0, 10) : null) },
  orders: {
    'FM-3': (a, b) => FIX_TYPE_ORDER.findIndex((type) => fixTypeWordMatches(type, a)) - FIX_TYPE_ORDER.findIndex((type) => fixTypeWordMatches(type, b)),
  },
}

/** @purity pure */
function fixTypeWordMatches(type: DelayFixRow['fixType'], word: string): boolean {
  return fixWordOf(type, 'ja') === word || fixWordOf(type, 'en') === word
}

// see T-374
// WHY: a cascade row stays right under its origin, however the table is sorted.
/** @purity pure */
function withCascadesUnderOrigins(kept: readonly ShownFixRow[]): readonly ShownFixRow[] {
  const keys = new Set(kept.map((shown) => delayFixKeyOf(shown.row)))
  const isUnder = (shown: ShownFixRow): boolean => typeof shown.row.causedBy === 'string' && keys.has(shown.row.causedBy)
  const placed: ShownFixRow[] = []
  const place = (shown: ShownFixRow): void => {
    placed.push(shown)
    kept.filter((one) => one.row.causedBy === delayFixKeyOf(shown.row)).forEach(place)
  }
  kept.filter((shown) => !isUnder(shown)).forEach(place)
  return placed
}

// see RW-11, SV-4
/** @purity pure */
function isFixWordFound(shown: ShownFixRow, word: string): boolean {
  if (word === '') return true
  return ['FM-4', 'FM-5', 'FM-6', 'FM-7', 'FM-8'].some((column) => isSearchWordFound(fixCellOf(shown, column), word))
}

/** @purity pure */
function shownFixRowsOf(table: FixTable, tables: DelayFixTables, values: DelayFixWindowValues, words: FixWords): readonly ShownFixRow[] {
  if (table === 'log') return tables.log.map((entry) => ({ row: entry.row, cells: logCellsOf(entry, words), columns: LOG_COLUMNS }))
  return tables.proposals.map((row) => ({ row, cells: proposalCellsOf(row, tables.proposals, values.picks, words), columns: PROPOSAL_COLUMNS }))
}

/** @purity pure */
function foundFixRowsOf(all: readonly ShownFixRow[], word: string, view: TableView): readonly ShownFixRow[] {
  const found = all.filter((shown) => isFixWordFound(shown, word))
  return withCascadesUnderOrigins(filteredTableRows(found, FIX_TABLE, view.columnFilters, view.sort))
}

// see T-374, RW-9, RW-10, SV-18
/** @purity pure */
function fixWindowTableOf(table: FixTable, found: () => readonly ShownFixRow[], language: DisplayLanguage): WindowTable {
  const columns = table === 'log' ? LOG_COLUMNS : PROPOSAL_COLUMNS
  return {
    columns,
    fixedCount: columns.indexOf(FIX_JUMP_COLUMN) + 1,
    headingOf: (column) => partWordOf(FIX_COLUMN_WORDS, column, language),
    isDateColumn: (column) => column === 'FM-2',
    valuesOf: (column) => tableColumnValues(found(), FIX_TABLE, column),
    labelOf: (_column, value) => (value === BLANK_SEARCH_VALUE ? wordOf(PANEL_WORDS.get('blank'), language) : value),
    widthSamplesOf: (column) => (column === 'FM-1' ? null : [...new Set(found().map((shown) => fixCellOf(shown, column)))]),
  }
}

// see RW-13, T-373
// WHY: what the proposals tell of a row's landing: the task jumped to, the field opened, the tasks ringed in S-573.
interface DelayFixLanding {
  readonly jumpTaskUid?: number
  readonly openField?: string | null
  readonly relatedTaskUids?: readonly number[]
}

// see RW-13, T-373
/** @purity pure */
function fixTargetOf(row: DelayFixRow): SearchRowView['target'] {
  const landing = row as DelayFixRow & DelayFixLanding
  const jumpUid = landing.jumpTaskUid ?? row.taskUid
  return {
    kind: 'task',
    taskUid: jumpUid,
    relatedTaskUids: (landing.relatedTaskUids ?? []).filter((uid: number) => uid !== jumpUid),
    openField: landing.openField ?? null,
  }
}

/** @purity pure */
function fixCellViewOf(shown: ShownFixRow, tables: DelayFixTables, values: DelayFixWindowValues, language: DisplayLanguage): DelayFixCellView {
  const row = shown.row
  const key = delayFixKeyOf(row)
  const pick = values.picks[key]
  const offered: readonly unknown[] = row.choices ?? []
  const choices = row.fixType === 'choose' ? offered.map((choice, at) => ({ label: fixChoiceText(choice, language), isChosen: pick?.choice === at })) : null
  return {
    key,
    check: fixCheckOf(row, tables.proposals, values.picks),
    choices,
    date: row.fixType === 'suggestedDate' ? (pick?.date ?? (typeof row.after === 'string' ? row.after : null)) : null,
    isCurrent: values.at === key,
  }
}

/** @purity pure */
function fixRowViewsOf(table: FixTable, found: readonly ShownFixRow[], tables: DelayFixTables, values: DelayFixWindowValues, language: DisplayLanguage): readonly DelayFixRowView[] {
  return found.map((shown) => ({
    cells: shown.cells,
    glyph: null,
    status: null,
    target: fixTargetOf(shown.row),
    fix: table === 'proposals' ? fixCellViewOf(shown, tables, values, language) : null,
  }))
}

/** @purity pure */
function countedEntryOf(icon: IconId, language: DisplayLanguage, isChosen: boolean, count: number | null): CommandItem {
  const plain = entryOf(icon, language, isChosen)
  return count === null ? plain : { ...plain, label: `${plain.label}${FIX_COUNT_OPEN}${count}${FIX_COUNT_CLOSE}` }
}

// see RW-11, IC-154, IC-155, IC-156, EN-6
/** @purity pure */
function delayReportTabEntriesOf(values: DelayFixWindowValues, tables: DelayFixTables, language: DisplayLanguage): readonly CommandItem[] {
  const tabs = [
    countedEntryOf(DIAGNOSIS_ENTRY, language, values.table === 'diagnosis', null),
    countedEntryOf(PROPOSALS_ENTRY, language, values.table === 'proposals', tables.proposals.length),
  ]
  return tables.log.length === 0 ? tabs : [...tabs, countedEntryOf(LOG_ENTRY, language, values.table === 'log', tables.log.length)]
}

// see RW-12, IC-157, IC-158, FR-092
/** @purity pure */
function delayFixFooterOf(values: DelayFixWindowValues, tables: DelayFixTables, language: DisplayLanguage): DelayFixFooterView | null {
  if (values.table !== 'proposals') return null
  const count = delayFixBundleOf(tables.proposals, values.picks).length
  const entries = [OVERWRITE_FIX_ENTRY, BACKUP_FIX_ENTRY].map((icon) => ({ ...entryOf(icon, language), isEnabled: count > 0 }))
  return { text: filled(fixWordOf('fixCount', language), { n: count }), entries }
}

// see FR-155, RW-12
/** @purity pure */
export function delayFixBundleOf(rows: readonly DelayFixRow[], picks: DelayFixWindowValues['picks']): readonly DelayFixRow[] {
  return rows.filter((row) => isDelayFixChecked(row, rows, picks))
}

// see RW-14
/** @purity pure */
function byHandKeysOf(tables: DelayFixTables, values: DelayFixWindowValues, words: FixWords): readonly string[] {
  const shown = foundFixRowsOf(shownFixRowsOf('proposals', tables, values, words), '', values.views.proposals)
  return shown.filter((one) => one.row.fixType !== 'automatic').map((one) => delayFixKeyOf(one.row))
}

// see RW-14, IC-159, IC-160, FR-092
/** @purity pure */
function delayFixWalkOf(values: DelayFixWindowValues, tables: DelayFixTables, words: FixWords): { readonly entries: readonly CommandItem[]; readonly counter: string } {
  const language = words.language
  const keys = byHandKeysOf(tables, values, words)
  const at = values.at === null ? -1 : keys.indexOf(values.at)
  const entries = [
    { ...entryOf(PREVIOUS_FIX_ENTRY, language), isEnabled: at > 0 },
    { ...entryOf(NEXT_FIX_ENTRY, language), isEnabled: at < keys.length - 1 },
  ]
  return { entries, counter: filled(fixWordOf('humanCounter', language), { k: at + 1, m: keys.length }) }
}

// see RW-11, RW-12, RW-14, T-374
export interface DelayFixView {
  readonly tabEntries: readonly CommandItem[]
  readonly walkEntries: readonly CommandItem[]
  readonly walkCounter: string
  readonly fixFooter: DelayFixFooterView | null
  readonly fixTable: FixTable | null
}

/** @purity pure */
function delayFixViewOf(values: DelayFixWindowValues, tables: DelayFixTables, words: FixWords): DelayFixView {
  const language = words.language
  const walk = delayFixWalkOf(values, tables, words)
  return {
    tabEntries: delayReportTabEntriesOf(values, tables, language),
    walkEntries: walk.entries,
    walkCounter: walk.counter,
    fixFooter: delayFixFooterOf(values, tables, language),
    fixTable: values.table === 'diagnosis' ? null : values.table,
  }
}

// see T-374, RW-11, RW-13, SV-7
/** @purity pure */
function fixTableViewOf(
  window: DelayDiagnosticsReportWindow,
  table: FixTable,
  tables: DelayFixTables,
  words: FixWords,
): Pick<DelayDiagnosticsReportView, 'rows' | 'columns' | 'filterMenu' | 'jumpAt' | 'tableEntries'> {
  const language = words.language
  const values = delayFixValuesOf(window)
  const view = values.views[table]
  const all = window.shown === 'minimized' ? [] : shownFixRowsOf(table, tables, values, words)
  const found = foundFixRowsOf(all, window.panel.word, view)
  const shape = fixWindowTableOf(table, () => found, language)
  return {
    ...windowColumnsViewOf(window, view, shape, language),
    rows: fixRowViewsOf(table, found, tables, values, language),
    jumpAt: shape.columns.indexOf(FIX_JUMP_COLUMN),
    tableEntries: [clearEntryOf(view, language)],
  }
}

// see RW-11, RW-14
/** @purity pure */
function windowOnTable(window: DelayDiagnosticsReportWindow, table: DelayReportTable): DelayDiagnosticsReportWindow {
  if (delayFixValuesOf(window).table === table) return window
  return withFixValues({ ...window, panel: panelWithFilterShut(window.panel) }, { table })
}

// see RW-14, RW-13
/** @purity pure */
function stepAfterWalk(window: DelayDiagnosticsReportWindow, view: TableView, step: number, tables: DelayFixTables, words: FixWords): DelayReportStep | null {
  const values = delayFixValuesOf(window)
  const keys = byHandKeysOf(tables, values, words)
  const at = values.at === null ? -1 : keys.indexOf(values.at)
  const next = keys[at + step]
  const row = tables.proposals.find((one) => delayFixKeyOf(one) === next)
  if (next === undefined || at + step < 0 || row === undefined) return null
  const moved = withFixValues(windowOnTable(window, 'proposals'), { at: next })
  return { window: moved, view, asked: { kind: 'fixJump', target: fixTargetOf(row) } }
}

// see RW-12, FR-155, T-290
/** @purity pure */
function stepAfterFixWrite(window: DelayDiagnosticsReportWindow, view: TableView, writeForm: DelayFixWriteForm, tables: DelayFixTables): DelayReportStep | null {
  const values = delayFixValuesOf(window)
  const fixBundle = delayFixBundleOf(tables.proposals, values.picks)
  if (values.table !== 'proposals' || fixBundle.length === 0) return null
  return { window, view, asked: { kind: 'fixWrite', writeForm, fixBundle } }
}

// see RW-11, RW-12, RW-14, IC-154, IC-160
// WHY: null is an entry of no fix; the diagnosis table's own entries go on to windowAfterEntry.
/** @purity pure */
function delayFixStepAfterEntry(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  entry: IconId,
  tables: DelayFixTables,
  words: FixWords,
): DelayReportStep | null {
  const table = TABLE_OF_ENTRY[entry]
  if (table !== undefined) return table === 'log' && tables.log.length === 0 ? null : { window: windowOnTable(window, table), view }
  const writeForm = WRITE_FORM_OF_ENTRY[entry]
  if (writeForm !== undefined) return stepAfterFixWrite(window, view, writeForm, tables)
  const step = STEP_OF_ENTRY[entry]
  return step === undefined ? null : stepAfterWalk(window, view, step, tables, words)
}

// see RW-11, IC-153, SV-7, SV-8
// WHY: on a fix table the column filters and the sort are the window's, so the document's view comes back untouched (FR-155).
/** @purity pure */
function fixTableStepAfterEntry(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  entry: IconId,
  filterColumn: string | null,
  answers: { readonly tables: DelayFixTables; readonly words: FixWords; readonly listed?: readonly string[] | null },
): DelayReportStep | null {
  const values = delayFixValuesOf(window)
  if (values.table === 'diagnosis') return null
  const table = values.table
  const all = shownFixRowsOf(table, answers.tables, values, answers.words)
  const word = window.panel.word
  const step = windowAfterEntry(window, values.views[table], entry, filterColumn, {
    wouldChange: () => false,
    tableOf: (unfiltered) => fixWindowTableOf(table, () => foundFixRowsOf(all, word, unfiltered), answers.words.language),
  }, answers.listed)
  if (step === null) return null
  if (step.window === null) return { window: null, view: tableWithScheduleFilterOff(view) }
  return { window: withFixValues(step.window, { views: { ...values.views, [table]: step.view } }), view }
}

export type DelayFixPickChange = Extract<SearchFilterChange, { readonly kind: 'fixPick' }>

/** @purity pure */
function pickAfterChange(held: DelayFixPick | undefined, change: DelayFixPickChange): DelayFixPick {
  const pick = held ?? { isChecked: null, choice: null, date: null }
  if (change.part === 'check') return { ...pick, isChecked: change.value === CHECK_MARK }
  if (change.part === 'date') return { ...pick, date: change.value === '' ? null : change.value, isChecked: true }
  const choice = change.value === '' ? null : Number(change.value)
  return { ...pick, choice, isChecked: choice !== null }
}

// see RW-16, FM-1, FM-8
/** @purity pure */
export function delayDiagnosticsReportWithPick(window: DelayDiagnosticsReportWindow, change: DelayFixPickChange): DelayDiagnosticsReportWindow {
  const values = delayFixValuesOf(window)
  return withFixValues(window, { picks: { ...values.picks, [change.key]: pickAfterChange(values.picks[change.key], change) } })
}

// see RW-3, RW-8, RW-11, RW-16, SV-7, UN-20
// WHY: one reducer for what the window's host raised: the word, the filter changes of the table shown, and the picks.
/** @purity pure */
export function delayDiagnosticsReportWithInput(
  window: DelayDiagnosticsReportWindow | null,
  view: TableView,
  input: { readonly word: string | null; readonly changes: readonly SearchFilterChange[] } | undefined,
): { readonly window: DelayDiagnosticsReportWindow | null; readonly view: TableView } {
  if (window === null || input === undefined) return { window, view }
  const typed = input.word === null ? window : { ...window, panel: { ...window.panel, word: input.word } }
  return input.changes.reduce((held, change) => {
    if (held.window === null) return held
    if (change.kind === 'fixPick') return { ...held, window: delayDiagnosticsReportWithPick(held.window, change) }
    const values = delayFixValuesOf(held.window)
    if (values.table === 'diagnosis') return { ...held, view: delayDiagnosticsReportAfterFilterChange(held.window, held.view, change) }
    const fixView = delayFixAfterFilterChange(held.window, values, change)
    return { ...held, window: withFixValues(held.window, { views: { ...values.views, [values.table]: fixView } }) }
  }, { window: typed as DelayDiagnosticsReportWindow | null, view })
}

/** @purity pure */
function delayFixAfterFilterChange(window: DelayDiagnosticsReportWindow, values: DelayFixWindowValues, change: SearchFilterChange): TableView {
  const table = values.table === 'log' ? 'log' : 'proposals'
  const view = values.views[table]
  if (change.kind === 'shown') return view
  return tableAfterFilterChange(window.panel, view, window.shown, change, fixWindowTableOf(table, () => [], COLUMNS_ONLY_LANGUAGE)) ?? view
}

// Builds the Delay Diagnostics Report window for one frame, its Visibility column, its fix tables (FR-155), and the Markdown its IC-108 and IC-140 hand out.
// @unit      UF-194  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  DELAY_FIX_KINDS,
  DELAY_REPORT_STATUSES,
  delayDiagnosticsReportMarkdown,
  delayDiagnosticsReportRows,
  delayFixColumnsOf,
  delayFixLogCells,
  delayFixLogRowsInOrder,
  delayFixProposalCells,
  delayFixRowsInOrder,
  isSameDay,
  isSearchWordFound,
  isStandardTimeZoneKey,
  minutesPerWorkingDayOf,
  type DelayDiagnosticsReport,
  type DelayFixCheck,
  type DelayFixChoice,
  type DelayFixLogRow,
  type DelayFixMarkdown,
  type DelayFixMarkdownSection,
  isRecommendedDelayFix,
  type DelayFixRow,
  type DelayFixWords,
  type DelayReportReason,
  type DelayReportRow,
  type DelayReportStatus,
  type DelayReportWords,
  type DateTimeSide,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import { lengthTextOf } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  emptySearchPanelSession,
  tableViewOf,
  type ScreenSession,
  type TableView,
} from '../../use-case/advance-screen-session/advance-screen-session'
import dependencyKinds from './dependency-kinds.json'
import displayWords from './display-words.json'
import exportFormats from './export-formats.json'
import propertyItems from './property-items.json'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import { exportNameBodyOf } from './open-modals'
import { taskTypeWordOf, taskTypeWordsIn, type SearchPanelView, type SearchRowView } from './search-panel'
import {
  ASSIGNEE_SEPARATOR,
  BLANK_SEARCH_VALUE,
  HIDE_VALUE,
  SHOW_VALUE,
  columnHeadingsOf,
  compareTaskTypes,
  comparePercentTexts,
  filteredTableRows,
  percentText,
  tableColumnValues,
  taskTypeOf,
  TASK_TYPES_ASCENDING,
  type ColumnSort,
  type SearchColumnHeading,
  type TableColumns,
  type TableRowCells,
} from './search-table-filters'
import {
  clearEntryOf,
  dateText,
  dateTimeText,
  shownDateTimesOf,
  entryOf,
  panelWithFilterShut,
  scheduleFilterEntryOf,
  scheduleFilterRefusalsOf,
  tableAfterFilterChange,
  tableAfterShownChange,
  tableWithFilterClosed,
  tableWithScheduleFilterOff,
  visibilityHeadingOf,
  visibilityLabelOf,
  windowAfterEntry,
  windowColumnsViewOf,
  windowTitleEntriesOf,
  windowWithColumnWidth,
  isWorkingFilter,
  wordOf,
  scheduleFilterReadinessOf,
  type ScheduleFilterReadiness,
  tableWithViewsCleared,
  type MarkGlyph,
  type SearchFilterChange,
  type ShownDateTimes,
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
const RE_DIAGNOSE_ENTRY: IconId = 'IC-168'

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

const TASK_TYPE_COLUMN = 'DT-9'

// WHY: the Visibility column is a tool laid on the schedule, not a finding, so the Markdown neither prints nor filters by it.
const MARKDOWN_COLUMNS: readonly string[] = DELAY_REPORT_COLUMNS.filter((column) => column !== VISIBILITY_COLUMN)

// see DT-4, SJ-1
const JUMP_COLUMN_AT = DELAY_REPORT_COLUMNS.indexOf('DT-4')

// see RW-10
const LAST_FIXED_COLUMN = 'DT-4'

// see RW-3
const UNSEARCHED_COLUMNS: readonly string[] = ['DT-6', 'DT-7', TASK_TYPE_COLUMN]

// see RW-9, SV-18
const MEASURED_COLUMNS: readonly string[] = ['DT-1', 'DT-3', TASK_TYPE_COLUMN, 'DT-5', 'DT-6']

const WORD_COLUMNS_AT: readonly number[] = DELAY_REPORT_COLUMNS.flatMap((column, at) => (UNSEARCHED_COLUMNS.includes(column) ? [] : [at]))

// see VO-5, VS-6
const MILESTONE_ACHIEVED_ROW = 'VO-5'
const PARENT_PROGRESS_OUTSIDE_ROW = 'VS-6'

const PARENT_PROGRESS_OUTSIDE_PART = 'parentProgressOutside'

// see T-312
const OMISSION_ROW_HEAD = 'VO-'

// see DT-5, DT-6, TL-5
const DATE_RANGE = ' - '

// see DT-6
const OPEN_DATE_RANGE = ' -'

const WORD_JOIN = ', '

// see RW-7
const REPORT_FILE_WORD = 'delay-diagnostics'

const FILE_NAME_JOIN = '_'

export const DELAY_DIAGNOSTICS_REPORT_EXTENSION = exportFormats.files.find((one) => one.rowId === 'IO-8')?.extension ?? ''

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
  // WHY: the row of the marker pressed last (RW-19); each press counts, so the table moves to it once per press.
  readonly markedRow?: { readonly taskUid: number; readonly pressCount: number } | null
}

export const OPENED_DELAY_DIAGNOSTICS_REPORT: DelayDiagnosticsReportWindow = {
  shown: 'normal',
  panel: emptySearchPanelSession,
  isInFront: true,
}

export interface DelayReportRowView extends SearchRowView {
  readonly status: DelayReportStatus
  readonly isCurrent?: boolean
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
  readonly rowRevealed?: { readonly at: number; readonly count: number } | null
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

// see TX-7, TX-8, FR-158, S-576
// WHY: the S-576 switch and the length of 1d (FR-054), read only when a quantity is shown.
interface ShownTimes {
  readonly isTimeOfDayVisible: boolean
  readonly minutesPerDayOf: () => number
  readonly dates: ShownDateTimes
}

// see TX-8, TX-10, DQ-2, DQ-3, DQ-4, VS-6
// WHY: TX-10 has one speller, lengthTextOf (PI-5); a copy here would drift from the panel and the tooltips.
/** @purity pure */
function quantityText(minutes: number, times: ShownTimes): string {
  const minutesPerDay = times.minutesPerDayOf()
  if (times.isTimeOfDayVisible) return lengthTextOf(minutes, minutesPerDay)
  return String(Math.ceil(minutes / minutesPerDay))
}

const WHEN_TIME_SHOWN = 'WhenTimeShown'

// see TX-8, DT-7, VS-6, FR-158
// WHY: TX-10 spells its own units, so a word that adds a unit after the amount would read "1d 2h days" (JDG-1982).
interface QuantityWord {
  readonly part: string
  readonly slot: string
}

/** @purity pure */
function quantityWordOf(part: string, times: ShownTimes): QuantityWord {
  return times.isTimeOfDayVisible ? { part: `${part}${WHEN_TIME_SHOWN}`, slot: 'amount' } : { part, slot: 'days' }
}

// see FR-158, S-576, FR-054, FR-156, S-574
/** @purity pure */
function shownTimesOf(schedule: Schedule, isTimeOfDayVisible: boolean, viewTimeZone: unknown): ShownTimes {
  return {
    isTimeOfDayVisible,
    minutesPerDayOf: () => minutesPerWorkingDayOf(schedule.project),
    dates: shownDateTimesOf(schedule, { isTimeOfDayVisible, viewTimeZone: isStandardTimeZoneKey(viewTimeZone) ? viewTimeZone : null }),
  }
}

/** @purity pure */
function shownTimesIn(rows: { readonly schedule: Schedule; readonly isTimeOfDayVisible?: boolean; readonly viewTimeZone?: unknown }): ShownTimes {
  return shownTimesOf(rows.schedule, rows.isTimeOfDayVisible ?? false, rows.viewTimeZone ?? null)
}

// see TX-7, DT-5, DT-6
/** @purity pure */
function datesText(start: string | null, finish: string | null, isOneDay: boolean, times: ShownTimes, startSide: DateTimeSide): string {
  const [from, to] = [dateTimeText(start, times.dates, startSide), dateTimeText(finish, times.dates, 'finish')]
  if (from === '') return ''
  return isOneDay || from === to ? from : `${from}${DATE_RANGE}${to}`
}

// see DT-7, VS-6
/** @purity pure */
function parentProgressSlotsOf(
  values: Extract<DelayReportReason, { kind: 'unreliable' }>['findings'][number]['values'],
  times: ShownTimes,
): Readonly<Record<string, string | number>> {
  const day = (key: string) => dateText(typeof values[key] === 'string' ? values[key] : null)
  const outside = values['outsideMinutes']
  return {
    parent: day('parentPoint'),
    leftmost: day('leftmostPoint'),
    rightmost: day('rightmostPoint'),
    [quantityWordOf(PARENT_PROGRESS_OUTSIDE_PART, times).slot]: typeof outside === 'number' ? quantityText(outside, times) : String(outside),
    tolerance: String(values['parentTaskProgressToleranceDays']),
  }
}

// see DT-7, DX-3, T-312, VO-5, VS-6
/** @purity pure */
function findingText(
  one: Extract<DelayReportReason, { kind: 'unreliable' }>['findings'][number],
  language: DisplayLanguage,
  times: ShownTimes,
): string {
  const word = partWordsIn(REASON_WORDS, language)
  const proposal = one.proposedActualFinish === null ? '' : filled(word('proposal'), { date: dateText(one.proposedActualFinish) })
  if (one.row === MILESTONE_ACHIEVED_ROW) return `${word('milestoneAchieved')}${proposal}`
  if (one.row === PARENT_PROGRESS_OUTSIDE_ROW) {
    return `${filled(word(quantityWordOf(PARENT_PROGRESS_OUTSIDE_PART, times).part), parentProgressSlotsOf(one.values, times))}${proposal}`
  }
  const aspect = one.kind === 'omission' ? word('missingActual') : rowWordOf(ASPECT_WORDS, one.row, language)
  const values = Object.entries(one.values).map(([key, value]) => `${key}=${String(value)}`).join(' ')
  return `${values === '' ? aspect : filled(word('finding'), { aspect, values })}${proposal}`
}

// see DT-7, DX-3, DX-4, DX-9
/** @purity pure */
function reasonText(row: DelayReportRow, language: DisplayLanguage, times: ShownTimes): string {
  const word = partWordsIn(REASON_WORDS, language)
  const reason = row.reason
  switch (reason.kind) {
    case 'unreliable': {
      const findings = reason.findings.map((one) => findingText(one, language, times))
      const walls = reason.walls.map((one) => filled(word('wall'), { wall: rowWordOf(WALL_WORDS, one.row, language), cause: one.causeName }))
      return [...findings, ...walls].join(WORD_JOIN)
    }
    case 'bottleneck': {
      const held = reason.quantities
      if (held === null) return ''
      const said = quantityWordOf('bottleneck', times)
      const slots = {
        [said.slot]: quantityText(held.pushOutMinutes, times),
        inherited: quantityText(held.inheritedDelayMinutes, times),
        own: quantityText(held.selfDelayMinutes, times),
        ends: held.terminalsReached,
      }
      return filled(word(said.part), slots)
    }
    case 'settled': {
      if (reason.quantities === null) return ''
      const said = quantityWordOf('settled', times)
      return filled(word(said.part), { [said.slot]: quantityText(reason.quantities.pushOutMinutes, times) })
    }
    case 'bottleneckPath':
      return filled(word('bottleneckPath'), { names: reason.bottleneckNames.join(WORD_JOIN) })
    case 'late':
      return reason.days === null ? '' : filled(word('late'), { days: reason.days })
  }
}

// see T-347
/** @purity pure */
function cellsOf(row: DelayReportRow, language: DisplayLanguage, times: ShownTimes): readonly string[] {
  const isFinished = row.actualFinish !== null
  const startSide = times.dates.startSideOf(row.taskUid)
  const cells: Readonly<Record<string, string>> = {
    'DT-1': statusWordOf(row.status, language),
    'DT-2': row.assigneeNames.join(ASSIGNEE_SEPARATOR),
    'DT-3': percentText(row.percentComplete),
    'DT-9': taskTypeWordOf(taskTypeOf(row.milestone), language),
    'DT-4': row.name,
    'DT-5': datesText(row.plannedStart, row.plannedFinish, isSameDay(row.plannedStart, row.plannedFinish), times, startSide),
    'DT-6': isFinished || row.actualStart === null
      ? datesText(row.actualStart, row.actualFinish, false, times, startSide)
      : `${dateTimeText(row.actualStart, times.dates, startSide)}${OPEN_DATE_RANGE}`,
    'DT-7': reasonText(row, language, times),
  }
  return DELAY_REPORT_COLUMNS.map((column) => cells[column] ?? BLANK_SEARCH_VALUE)
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
    'DT-9': (shown) => [taskTypeOf(shown.row.milestone)],
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
    'DT-9': compareTaskTypes,
  },
}

// see RW-3, SV-4
/** @purity pure */
function isWordFound(shown: ShownTaskGroup, word: string): boolean {
  return word === '' || WORD_COLUMNS_AT.some((at) => isSearchWordFound(shown.cells[at] ?? '', word))
}

/** @purity pure */
function taskGroupsWithCells(rows: readonly DelayReportRow[], language: DisplayLanguage, times: ShownTimes): readonly ShownTaskGroup[] {
  return rows.map((row) => ({ row, cells: cellsOf(row, language, times) }))
}

// see RW-3, RW-8, SV-7, SV-8
/** @purity pure */
function shownTaskGroupsOf(
  look: TableLook,
  rows: readonly DelayReportRow[],
  language: DisplayLanguage,
  times: ShownTimes,
): readonly ShownTaskGroup[] {
  return shownTaskGroupsFrom(look, taskGroupsWithCells(rows, language, times))
}

/** @purity pure */
function shownTaskGroupsFrom(look: TableLook, all: readonly ShownTaskGroup[]): readonly ShownTaskGroup[] {
  const found = all.filter((shown) => isWordFound(shown, look.word))
  return filteredTableRows(found, REPORT_TABLE, look.view.columnFilters, look.view.sort)
}

// see RW-9, SV-18, DT-1
/** @purity pure */
function reportWidthSamplesIn(all: readonly ShownTaskGroup[], language: DisplayLanguage): (column: string) => readonly string[] | null {
  return (column) => {
    if (!MEASURED_COLUMNS.includes(column)) return null
    if (column === STATUS_COLUMN) return DELAY_REPORT_STATUSES.map((status) => statusWordOf(status, language))
    if (column === TASK_TYPE_COLUMN) return taskTypeWordsIn(language)
    return [...new Set(all.map((shown) => cellOf(shown, column)))]
  }
}

/** @purity pure */
function reportLabelOf(column: string, value: string, language: DisplayLanguage): string {
  if (column === VISIBILITY_COLUMN) return visibilityLabelOf(value, language) ?? value
  if (column === TASK_TYPE_COLUMN) return taskTypeWordOf(value, language)
  if (value === BLANK_SEARCH_VALUE) return wordOf(BLANK_WORD, language)
  return column === STATUS_COLUMN ? statusWordOf(value as DelayReportStatus, language) : value
}

// see RW-6, DT-1, DT-9
/** @purity pure */
function markdownLabelOf(column: string, value: string, language: DisplayLanguage): string {
  return column === STATUS_COLUMN ? statusText(value as DelayReportStatus, language) : reportLabelOf(column, value, language)
}

// see T-347, SV-7, RW-10
/** @purity pure */
function reportTableOf(
  view: TableView,
  found: () => readonly ShownTaskGroup[],
  language: DisplayLanguage,
  all?: readonly ShownTaskGroup[],
): WindowTable {
  const columns = REPORT_TABLE
  return {
    columns: DELAY_REPORT_COLUMNS,
    checkColumn: VISIBILITY_COLUMN,
    fixedCount: DELAY_REPORT_COLUMNS.indexOf(LAST_FIXED_COLUMN) + 1,
    headingOf: (column) => partWordOf(COLUMN_WORDS, column, language),
    isDateColumn: (column) => REPORT_TABLE.dates[column] !== undefined,
    valuesOf: (column) => tableColumnValues(found(), columns, column, view.sort),
    labelOf: (column, value) => reportLabelOf(column, value, language),
    ...(all === undefined ? {} : { widthSamplesOf: reportWidthSamplesIn(all, language) }),
  }
}

// see TV-5, JDG-2820
// WHY: only a checked row the report holds counts; a checked task the report dropped does not.
/** @purity pure */
function reportFilterReadinessOf(view: TableView, rows: readonly DelayReportRow[]): ScheduleFilterReadiness {
  const rowed = new Set(rows.map((row) => row.taskUid))
  return scheduleFilterReadinessOf('delayDiagnosticsReport', view.visibility, () => rowed)
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

// see FR-134, FR-155, T-346, RW-2, RW-11, S-564
/** @purity pure */
export function delayDiagnosticsReportFromWindow(
  session: ScreenSession,
  window: DelayDiagnosticsReportWindow | null,
  view: TableView,
  report: DelayDiagnosticsReport | null,
  schedule: Schedule,
  layout: { readonly canvas: ScreenRect; readonly textSizeStep: number },
  fixTables: DelayFixTables = NO_DELAY_FIX_TABLES,
  isTimeOfDayVisible = false,
  viewTimeZone: unknown = null,
): DelayDiagnosticsReportView | null {
  if (window === null || report === null) return null
  const times = shownTimesOf(schedule, isTimeOfDayVisible, viewTimeZone)
  const diagnosis = diagnosisReportViewOf(session, window, view, report, schedule, layout, times)
  const words = fixWordsOf(schedule, displayLanguageOf(session), report, times)
  const values = delayFixValuesOf(window)
  const fixView = delayFixViewOf(values, fixTables, words)
  if (values.table === 'diagnosis') return { ...diagnosis, ...fixView }
  const table = fixTableViewOf(window, values.table, fixTables, words)
  return { ...diagnosis, ...table, summary: [], glyphAt: null, showAt: null, showHeading: 'empty', entryRefusals: [], rowRevealed: null, ...fixView }
}

// see FR-134, T-346, RW-2, RW-3, RW-4, RW-9, S-564
/** @purity pure */
function diagnosisReportViewOf(
  session: ScreenSession,
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  layout: { readonly canvas: ScreenRect; readonly textSizeStep: number },
  times: ShownTimes,
): DelayDiagnosticsReportView {
  const language = displayLanguageOf(session)
  const isOpen = window.shown !== 'minimized'
  const reported = delayDiagnosticsReportRows(report, schedule)
  const all = isOpen ? reported : []
  const withCells = taskGroupsWithCells(all, language, times)
  const found = shownTaskGroupsFrom({ word: window.panel.word, view }, withCells)
  const listed = (): readonly ShownTaskGroup[] => shownTaskGroupsFrom({ word: window.panel.word, view: { ...view, columnFilters: [] } }, withCells)
  const table = reportTableOf(view, listed, language, withCells)
  const readiness = reportFilterReadinessOf(view, reported)
  const scheduleFilter = scheduleFilterEntryOf(view.visibility, readiness, language)
  const rows = reportRowViewsOf(view, found, window.markedRow?.taskUid ?? null)
  const markedAt = rows.findIndex((row) => row.isCurrent === true)
  return {
    heading: wordOf(HEADING, language),
    shown: window.shown,
    isInFront: window.isInFront,
    canvas: layout.canvas,
    ...windowPlaceInRange(window.panel, layout.canvas),
    textSizeStep: layout.textSizeStep,
    tableEntries: [clearEntryOf(view, language), scheduleFilter],
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(window.shown, language)],
    toolEntries: reportToolEntriesOf(language),
    word: window.panel.word,
    summary: isOpen ? summaryOf(report, all, language, true) : [],
    ...windowColumnsViewOf(window, view, table, language),
    rows,
    jumpAt: JUMP_COLUMN_AT,
    rowRevealed: markedAt < 0 ? null : { at: markedAt, count: window.markedRow?.pressCount ?? 0 },
    glyphAt: DELAY_REPORT_COLUMNS.indexOf(STATUS_COLUMN),
    showAt: DELAY_REPORT_COLUMNS.indexOf(VISIBILITY_COLUMN),
    showHeading: visibilityHeadingOf(readiness),
    entryRefusals: scheduleFilterRefusalsOf(scheduleFilter, readiness, language),
  }
}

// see RW-3, IC-168, IC-140, IC-108, S-623
// WHY: IC-168 stands at the left end with its bold word in every table of the window (RW-11); the fix views keep these.
/** @purity pure */
function reportToolEntriesOf(language: DisplayLanguage): readonly CommandItem[] {
  return [{ ...entryOf(RE_DIAGNOSE_ENTRY, language), isLabelShown: true, isLabelBold: true }, entryOf(EXPORT_ENTRY, language), entryOf(COPY_ENTRY, language)]
}

/** @purity pure */
function reportRowViewsOf(view: TableView, found: readonly ShownTaskGroup[], markedUid: number | null): readonly DelayReportRowView[] {
  const checked = new Set(view.visibility.shownTaskUids)
  return found.map((shown) => ({
    cells: shown.cells,
    glyph: STATUS_GLYPHS[shown.row.status],
    status: shown.row.status,
    isShown: checked.has(shown.row.taskUid),
    target: { kind: 'task', taskUid: shown.row.taskUid },
    isCurrent: shown.row.taskUid === markedUid,
  }))
}

// see AM-28, AV-17, T-347
/** @purity pure */
export function delayReportColumnHeadings(): readonly SearchColumnHeading[] {
  return columnHeadingsOf(DELAY_REPORT_COLUMNS, COLUMN_WORDS, (column) => REPORT_TABLE.dates[column] !== undefined)
}

// see AM-28, AV-19, AV-20, DT-8, RW-3, SV-7, SV-8, S-565, S-566, S-567
// WHY: no window state is read, so the word is the caller's; isAsShown false drops the column filters and the sort.
/** @purity pure */
export function delayReportTableRows(
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  settings: DocumentSettings,
  look: { readonly word: string; readonly isAsShown: boolean; readonly language: DisplayLanguage },
): readonly TableRowCells[] {
  const held = tableViewOf(settings, 'delayDiagnosticsReport')
  const view = look.isAsShown ? held : tableWithViewsCleared(held)
  const times = shownTimesOf(schedule, settings.isTimeOfDayVisible, settings.viewTimeZone)
  const withCells = taskGroupsWithCells(delayDiagnosticsReportRows(report, schedule), look.language, times)
  const checked = new Set(view.visibility.shownTaskUids)
  return shownTaskGroupsFrom({ word: look.word, view }, withCells).map((shown) => {
    const shownText = visibilityLabelOf(checked.has(shown.row.taskUid) ? SHOW_VALUE : HIDE_VALUE, look.language) ?? ''
    const cells = DELAY_REPORT_COLUMNS.map((column, at) => ({
      column,
      text: column === VISIBILITY_COLUMN ? shownText : (shown.cells[at] ?? BLANK_SEARCH_VALUE),
    }))
    return { key: shown.row.taskUid, cells }
  })
}

// see RW-19, RW-3, RW-11, SV-7, JDG-2195
// WHY: only what hides the pressed task's row comes off; the other filters and the sort stay.
/** @purity pure */
export function delayDiagnosticsReportShowingRow(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  taskUid: number,
  rows: {
    readonly report: DelayDiagnosticsReport
    readonly schedule: Schedule
    readonly language: DisplayLanguage
    readonly isTimeOfDayVisible?: boolean
    readonly viewTimeZone?: unknown
  },
): { readonly window: DelayDiagnosticsReportWindow; readonly view: TableView } | null {
  const row = delayDiagnosticsReportRows(rows.report, rows.schedule).find((one) => one.taskUid === taskUid)
  if (row === undefined) return null
  const times = shownTimesIn(rows)
  const shown = { row, cells: cellsOf(row, rows.language, times) }
  const onTable = windowOnTable(window, 'diagnosis')
  const word = isWordFound(shown, onTable.panel.word) ? onTable.panel.word : ''
  const markedRow = { taskUid, pressCount: (window.markedRow?.pressCount ?? 0) + 1 }
  return {
    window: { ...onTable, panel: { ...onTable.panel, word }, markedRow },
    view: { ...view, columnFilters: filtersShowing(shown, view) },
  }
}

// see SV-7, DT-5, DT-6
/** @purity pure */
function filtersShowing(shown: ShownTaskGroup, view: TableView): TableView['columnFilters'] {
  const columns = REPORT_TABLE
  return view.columnFilters.flatMap((filter) => {
    if (filteredTableRows([shown], columns, [filter], null).length > 0) return [filter]
    const values = new Set(columns.values[filter.column]?.(shown) ?? [])
    const kept = { ...filter, hiddenValues: filter.hiddenValues.filter((value) => !values.has(value)) }
    return columns.dates[filter.column] !== undefined || !isWorkingFilter(kept) ? [] : [kept]
  })
}

// see T-346, SV-7, SV-8, WB-2, WB-3, RW-1, RW-2, RW-11, RW-12, RW-14, IC-153, TV-8, UN-20
// WHY: { window: null } is a close; null is an entry the window does not answer.
/** @purity pure */
export function delayDiagnosticsReportAfterEntry(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  entry: IconId,
  filterColumn: string | null,
  rows: {
    readonly report: DelayDiagnosticsReport
    readonly schedule: Schedule
    readonly language: DisplayLanguage
    readonly fixTables?: DelayFixTables
    readonly isTimeOfDayVisible?: boolean
    readonly viewTimeZone?: unknown
  },
  listed?: readonly string[] | null,
): DelayReportStep | null {
  const tables = rows.fixTables ?? NO_DELAY_FIX_TABLES
  const times = shownTimesIn(rows)
  const words = fixWordsOf(rows.schedule, rows.language, rows.report, times)
  const fixed = delayFixStepAfterEntry(window, view, entry, tables, words) ?? fixTableStepAfterEntry(window, view, entry, filterColumn, { tables, words, listed: listed ?? null })
  if (fixed !== null || delayFixValuesOf(window).table !== 'diagnosis') return fixed
  const all = delayDiagnosticsReportRows(rows.report, rows.schedule)
  const word = window.panel.word
  return windowAfterEntry(window, view, entry, filterColumn, {
    readiness: () => reportFilterReadinessOf(view, all),
    tableOf: (unfiltered) => reportTableOf(view, () => shownTaskGroupsOf({ word, view: unfiltered }, all, rows.language, times), rows.language),
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
      ? tableAfterShownChange('delayDiagnosticsReport', view, change)
      : tableAfterFilterChange(window.panel, view, window.shown, change, reportTableOf(view, () => [], COLUMNS_ONLY_LANGUAGE))
  return after ?? view
}

// see SV-14, IN-4
/** @purity pure */
export function delayDiagnosticsReportWithFilterClosed(window: DelayDiagnosticsReportWindow, view: TableView): DelayDiagnosticsReportWindow | null {
  const table = delayFixValuesOf(window).table
  const shape = table === 'diagnosis' ? reportTableOf(view, () => [], COLUMNS_ONLY_LANGUAGE) : fixWindowTableOf(table, () => [], COLUMNS_ONLY_LANGUAGE)
  const panel = tableWithFilterClosed(window.panel, window.shown, shape)
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

// see RW-6, SV-7
/** @purity pure */
function filterConditionText(one: TableView['columnFilters'][number], labelOf: (value: string) => string): string {
  if (one.hiddenValues.length > 0) return `-(${one.hiddenValues.map(labelOf).join(WORD_JOIN)})`
  return `${dateText(one.fromDate)}${DATE_RANGE}${dateText(one.toDate)}`
}

// see FR-134, FR-155, RW-4, RW-6, IC-108, IC-140
/** @purity pure */
export function delayDiagnosticsReportMarkdownOf(
  window: DelayDiagnosticsReportWindow,
  view: TableView,
  report: DelayDiagnosticsReport,
  schedule: Schedule,
  language: DisplayLanguage,
  stamp: { readonly documentName: string; readonly madeAt: string },
  fixTables: DelayFixTables = NO_DELAY_FIX_TABLES,
  isTimeOfDayVisible = false,
  viewTimeZone: unknown = null,
): string {
  const all = delayDiagnosticsReportRows(report, schedule)
  const printed = markdownViewOf(view)
  const look = { word: window.panel.word, view: printed }
  const times = shownTimesOf(schedule, isTimeOfDayVisible, viewTimeZone)
  const rows = shownTaskGroupsOf(look, all, language, times).map((shown) => ({ status: shown.row.status, cells: markdownCellsOf(shown.cells) }))
  const columns = printed.columnFilters.map((one) => ({
    heading: partWordOf(COLUMN_WORDS, one.column, language),
    condition: filterConditionText(one, (value) => markdownLabelOf(one.column, value, language)),
  }))
  const summary = summaryOf(report, all, language, false)
  const dates = {
    documentName: stamp.documentName,
    statusDateLine: summary[0]?.text ?? '',
    madeAt: stamp.madeAt,
    summaryLine: summaryLineOf(summary, language),
  }
  const fixes = fixMarkdownOf(window, fixTables, fixWordsOf(schedule, language, report, times))
  return delayDiagnosticsReportMarkdown(rows, { word: window.panel.word, columns }, markdownWordsOf(language), dates, fixes)
}

// see RW-7, FN-5
/** @purity pure */
export function delayDiagnosticsReportFileNameOf(documentName: string, statusDate: string | null): string {
  const body = exportNameBodyOf(documentName)
  const day = dateText(statusDate).replace(/\//g, '-')
  return [...(body === '' ? [] : [body]), REPORT_FILE_WORD, day].join(FILE_NAME_JOIN) + DELAY_DIAGNOSTICS_REPORT_EXTENSION
}

const DIAGNOSIS_ENTRY: IconId = 'IC-154'
const PROPOSALS_ENTRY: IconId = 'IC-155'
const LOG_ENTRY: IconId = 'IC-156'
const OVERWRITE_FIX_ENTRY: IconId = 'IC-157'
const BACKUP_FIX_ENTRY: IconId = 'IC-158'
const ADOPT_ALL_ENTRY: IconId = 'IC-166'
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
// see FM-7, SV-7
const BLANK_WORD = displayWords.searchPanel.find((entry) => entry.part === 'blank')?.text

// see FM-6, T-016
const ITEM_OF_TASK_COLUMN: ReadonlyMap<string, string> = new Map(
  propertyItems.items.filter((item) => item.appliesTo === 'Task' && item.columns.length === 1).map((item) => [item.columns[0] ?? '', item.rowId]),
)

const LINK_TYPE_ABBREVIATIONS: ReadonlyMap<number, string> = new Map(
  dependencyKinds.dependencyKinds.map((kind) => [kind.linkType, kind.abbreviation]),
)

const FIX_COLUMNS: readonly string[] = displayWords.delayFixColumns.map((entry) => entry.rowId)
const PROPOSAL_COLUMNS: readonly string[] = delayFixColumnsOf('proposals', FIX_COLUMNS)
const LOG_COLUMNS: readonly string[] = delayFixColumnsOf('log', FIX_COLUMNS)

const CHECK_MARK = '\u2713'

const FIX_JUMP_COLUMN = 'FM-5'

const FIX_CHECK_COLUMN = 'FM-1'

const FIX_TASK_TYPE_COLUMN = 'FM-9'

const FIX_DATE_COLUMN = 'FM-2'

const FIX_AFTER_COLUMN = 'FM-8'

const FIX_WORD_COLUMNS: readonly string[] = ['FM-4', 'FM-5', 'FM-6']

// see T-374, RW-9, SV-18
const DEFAULT_WIDTH_FIX_COLUMNS: readonly string[] = ['FM-4', 'FM-5']

export type DelayReportTable = 'diagnosis' | 'proposals' | 'log'

type FixTable = Exclude<DelayReportTable, 'diagnosis'>

export type DelayFixWriteForm = 'beforeFixOverwrite' | 'beforeFixBackup'

// see RW-11, RW-14, RW-16, FR-155
// WHY: never saved (FR-155 MUST NOT); each fix table keeps its own view, and picks are proposeDelayFixes' checks by row key.
export interface DelayFixWindowValues {
  readonly table: DelayReportTable
  readonly views: Readonly<Record<FixTable, TableView>>
  readonly picks: Readonly<Record<string, DelayFixCheck>>
  readonly at: string | null
}

// see FR-155, RW-17, RS-10, T-233
export type DelayFixTelling =
  | { readonly kind: 'fixed'; readonly count: number }
  | { readonly kind: 'refused'; readonly row: DelayFixRow; readonly reason: string }

// see DX-11, DX-12, T-374, RW-17
// WHY: the proposals come in the default order of T-374; telling is what the last bundle came to, absent before any.
export interface DelayFixTables {
  readonly proposals: readonly DelayFixRow[]
  readonly log: readonly DelayFixLogRow[]
  readonly telling?: DelayFixTelling | null
}

export const NO_DELAY_FIX_TABLES: DelayFixTables = { proposals: [], log: [] }

const NO_FIX_VIEW: TableView = {
  columnFilters: [],
  sort: null,
  visibility: { isScheduleFilterApplied: false, isUnassignedShown: false, shownTaskUids: [], shownResourceUids: [] },
}

export const NO_DELAY_FIX_VALUES: DelayFixWindowValues = {
  table: 'diagnosis',
  views: { proposals: NO_FIX_VIEW, log: NO_FIX_VIEW },
  picks: {},
  at: null,
}

// see FM-1, FM-8, T-373
// WHY: a choice answers by its key, never by its place; dateNote is the cell's text drawn after the date field (FM-8).
export interface DelayFixCellView {
  readonly key: string
  readonly check: 'on' | 'off' | 'held' | 'disabled' | 'none'
  readonly choices: readonly { readonly key: string; readonly label: string; readonly isChosen: boolean }[] | null
  readonly blankChoice: string
  readonly date: string | null
  readonly dateNote: string | null
  readonly isCurrent: boolean
}

export interface DelayFixRowView extends SearchRowView {
  readonly status: null
  readonly fix: DelayFixCellView | null
}

export interface DelayFixFooterView {
  readonly count: string
  readonly entries: readonly CommandItem[]
  readonly notice: string | null
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

/** @purity pure */
function fixWordOf(part: string, language: DisplayLanguage): string {
  return partWordOf(FIX_WORDS, part, language)
}

// see FM-4, DT-7, VO-5
// WHY: a finding of the report reads as its DT-7 text; a chain row's finding is no finding of the report, so it reads as its aspect.
/** @purity pure */
function fixFindingWordOf(report: DelayDiagnosticsReport | null, findingRow: string, taskUid: number, language: DisplayLanguage, times: ShownTimes): string {
  const finding = report?.findings.find((one) => one.row === findingRow && one.uid === taskUid)
  if (finding !== undefined) return findingText(finding, language, times)
  if (findingRow === MILESTONE_ACHIEVED_ROW) return partWordOf(REASON_WORDS, 'milestoneAchieved', language)
  if (!ASPECT_WORDS.has(findingRow) && findingRow.startsWith(OMISSION_ROW_HEAD)) return partWordOf(REASON_WORDS, 'missingActual', language)
  return rowWordOf(ASPECT_WORDS, findingRow, language)
}

// see FM-6, T-016
/** @purity pure */
function fixColumnWordOf(column: string, language: DisplayLanguage): string {
  const item = ITEM_WORDS.has(column) ? column : ITEM_OF_TASK_COLUMN.get(column)
  return item === undefined ? column : rowWordOf(ITEM_WORDS, item, language)
}

// see FM-8, T-373, JDG-1950
/** @purity pure */
function fixChoiceWordOf(choice: DelayFixChoice, nameOf: (taskUid: number) => string, language: DisplayLanguage): string {
  return filled(fixWordOf(choice.word, language), {
    predecessor: choice.predecessorUid === null ? '' : nameOf(choice.predecessorUid),
    successor: choice.successorUid === null ? '' : nameOf(choice.successorUid),
    date: dateText(choice.date),
    taskGroup: choice.taskGroupName ?? '',
  })
}

interface FixWords {
  readonly language: DisplayLanguage
  readonly cells: DelayFixWords
}

// see T-374, FM-3, FM-8
/** @purity pure */
function fixWordsOf(schedule: Schedule, language: DisplayLanguage, report: DelayDiagnosticsReport | null, times: ShownTimes): FixWords {
  const names = new Map(schedule.tasks.map((task) => [task.uid, task.name]))
  const nameOf = (taskUid: number): string => names.get(taskUid) ?? String(taskUid)
  const milestones = new Set(schedule.tasks.flatMap((task) => (task.milestone === true ? [task.uid] : [])))
  const word = (part: string): string => fixWordOf(part, language)
  return {
    language,
    cells: {
      empty: wordOf(BLANK_WORD, language),
      suggested: word('suggested'),
      choosePlaceholder: word('choosePlaceholder'),
      openFieldHint: word('openFieldHint'),
      cascadePrefix: word('cascadePrefix'),
      readOnlyReason: word('readOnlyReason'),
      fixKindOf: word,
      findingOf: (findingRow, taskUid) => fixFindingWordOf(report, findingRow, taskUid, language, times),
      columnOf: (column) => fixColumnWordOf(column, language),
      choiceOf: (choice) => fixChoiceWordOf(choice, nameOf, language),
      taskNameOf: nameOf,
      taskTypeWordOf: (taskUid) => taskTypeWordOf(taskTypeOf(milestones.has(taskUid)), language),
      linkTypeOf: (linkType) => LINK_TYPE_ABBREVIATIONS.get(linkType) ?? String(linkType),
    },
  }
}

// see FM-1, T-373, RW-16
// WHY: proposeDelayFixes settled each box; a row an earlier row mends stays checked with that row and is held there.
/** @purity pure */
function fixCheckOf(row: DelayFixRow): DelayFixCellView['check'] {
  if (row.fixKind === 'byHand') return 'none'
  if (row.isCheckable) return row.checked ? 'on' : 'off'
  if (row.refusal === null && row.fixKind === 'choose' && row.chosen === null) return 'off'
  return row.checked ? 'held' : 'disabled'
}

// see FR-155, RW-12
/** @purity pure */
export function delayFixBundleOf(rows: readonly DelayFixRow[]): readonly DelayFixRow[] {
  return rows.filter((row) => row.checked && row.isCheckable)
}

interface ShownFixRow {
  readonly row: DelayFixRow | DelayFixLogRow
  readonly cells: readonly string[]
  readonly columns: readonly string[]
  readonly blankWord: string
}

/** @purity pure */
function proposalOf(shown: ShownFixRow): DelayFixRow | null {
  return 'key' in shown.row ? shown.row : null
}

/** @purity pure */
function fixCellOf(shown: ShownFixRow, column: string): string {
  return shown.cells[shown.columns.indexOf(column)] ?? BLANK_SEARCH_VALUE
}

// see SV-7, SV-8, FM-7
// WHY: a cell that shows the blank word holds the empty value, so it lists as (Blanks) and sorts last.
/** @purity pure */
function fixValueOf(shown: ShownFixRow, column: string): string {
  const text = fixCellOf(shown, column)
  return text === shown.blankWord ? BLANK_SEARCH_VALUE : text
}

// see T-374, SV-7, SV-8, FM-2
const FIX_TABLE: TableColumns<ShownFixRow> = {
  values: Object.fromEntries(FIX_COLUMNS.map((column) => [column, (shown: ShownFixRow) => [fixValueOf(shown, column)]])),
  dates: {
    [FIX_DATE_COLUMN]: (shown) => (shown.columns.includes(FIX_DATE_COLUMN) ? fixCellOf(shown, FIX_DATE_COLUMN).replace(/\//g, '-').slice(0, 10) : null),
  },
  orders: {
    'FM-3': (a, b) => DELAY_FIX_KINDS.findIndex((type) => fixKindWordMatches(type, a)) - DELAY_FIX_KINDS.findIndex((type) => fixKindWordMatches(type, b)),
    'FM-9': (a, b) => taskTypeRankOfWord(a) - taskTypeRankOfWord(b),
  },
}

// see SV-8, FM-9
/** @purity pure */
function taskTypeRankOfWord(word: string): number {
  return TASK_TYPES_ASCENDING.findIndex((taskType) => taskTypeWordOf(taskType, 'ja') === word || taskTypeWordOf(taskType, 'en') === word)
}

/** @purity pure */
function fixKindWordMatches(type: DelayFixRow['fixKind'], word: string): boolean {
  return fixWordOf(type, 'ja') === word || fixWordOf(type, 'en') === word
}

// see T-374
// WHY: a chain row stays right under its source row, however the table is sorted.
/** @purity pure */
function withCascadesUnderOrigins(kept: readonly ShownFixRow[]): readonly ShownFixRow[] {
  const proposals = kept.flatMap((shown) => proposalOf(shown) ?? [])
  if (proposals.length !== kept.length) return kept
  const at = new Map(proposals.map((row, index) => [row.key, index]))
  const placeOf = (row: DelayFixRow): number => at.get(row.key) ?? 0
  return delayFixRowsInOrder(proposals, (a, b) => placeOf(a) - placeOf(b)).flatMap((row) => kept[placeOf(row)] ?? [])
}

// see RW-11, SV-4
/** @purity pure */
function isFixWordFound(shown: ShownFixRow, word: string): boolean {
  return word === '' || FIX_WORD_COLUMNS.some((column) => isSearchWordFound(fixCellOf(shown, column), word))
}

/** @purity pure */
function shownFixRowsOf(table: FixTable, tables: DelayFixTables, words: FixWords): readonly ShownFixRow[] {
  if (table === 'log') {
    return delayFixLogRowsInOrder(tables.log).map((row) => ({ row, cells: delayFixLogCells(row, words.cells, FIX_COLUMNS), columns: LOG_COLUMNS, blankWord: words.cells.empty }))
  }
  return tables.proposals.map((row) => ({ row, cells: delayFixProposalCells(row, words.cells, FIX_COLUMNS), columns: PROPOSAL_COLUMNS, blankWord: words.cells.empty }))
}

/** @purity pure */
function foundFixRowsOf(all: readonly ShownFixRow[], word: string, view: TableView): readonly ShownFixRow[] {
  const found = all.filter((shown) => isFixWordFound(shown, word))
  return withCascadesUnderOrigins(filteredTableRows(found, FIX_TABLE, view.columnFilters, view.sort))
}

// see T-374, RW-9, RW-10, SV-18
/** @purity pure */
function fixWindowTableOf(
  table: FixTable,
  found: () => readonly ShownFixRow[],
  language: DisplayLanguage,
  listed: { readonly rows: () => readonly ShownFixRow[]; readonly sort: ColumnSort | null } = { rows: found, sort: null },
  all?: readonly ShownFixRow[],
): WindowTable {
  const columns = table === 'log' ? LOG_COLUMNS : PROPOSAL_COLUMNS
  return {
    columns,
    fixedCount: columns.indexOf(FIX_JUMP_COLUMN) + 1,
    headingOf: (column) => partWordOf(FIX_COLUMN_WORDS, column, language),
    isDateColumn: (column) => column === FIX_DATE_COLUMN,
    valuesOf: (column) => tableColumnValues(listed.rows(), FIX_TABLE, column, listed.sort),
    labelOf: (_column, value) => (value === BLANK_SEARCH_VALUE ? wordOf(BLANK_WORD, language) : value),
    ...(all === undefined ? {} : { widthSamplesOf: fixWidthSamplesIn(all, language) }),
  }
}

// see T-374, SV-18, FM-1, FM-9
// WHY: FM-1's value is a check box, narrower than its heading word and IC-122, so the heading alone sets its width.
/** @purity pure */
function fixWidthSamplesIn(all: readonly ShownFixRow[], language: DisplayLanguage): (column: string) => readonly string[] | null {
  return (column) => {
    if (DEFAULT_WIDTH_FIX_COLUMNS.includes(column)) return null
    if (column === FIX_CHECK_COLUMN) return []
    if (column === FIX_TASK_TYPE_COLUMN) return taskTypeWordsIn(language)
    return [...new Set(all.map((shown) => fixCellOf(shown, column)))]
  }
}

// see RW-13, T-373, SJ-0
// WHY: a proposal row jumps to the task holding its field and rings the related tasks (RW-13); a log row jumps as a search row does.
/** @purity pure */
function fixTargetOf(shown: ShownFixRow): SearchRowView['target'] {
  const row = proposalOf(shown)
  if (row === null) return { kind: 'task', taskUid: shown.row.taskUid }
  const jumpUid = row.openField?.taskUid ?? row.taskUid
  return {
    kind: 'task',
    taskUid: jumpUid,
    relatedTaskUids: row.relatedTaskUids.filter((uid) => uid !== jumpUid),
    openField: row.openField?.field ?? null,
  }
}

// see FM-1, FM-8, T-373
/** @purity pure */
function fixCellViewOf(shown: ShownFixRow, row: DelayFixRow, values: DelayFixWindowValues, words: FixWords): DelayFixCellView {
  const isOpen = row.refusal === null
  const isDated = isOpen && row.fixKind === 'suggestedDate'
  return {
    key: row.key,
    check: fixCheckOf(row),
    choices: isOpen && row.fixKind === 'choose' && row.choices.length > 1
      ? row.choices.map((choice) => ({ key: choice.key, label: words.cells.choiceOf(choice), isChosen: row.chosen === choice.key }))
      : null,
    blankChoice: words.cells.choosePlaceholder,
    date: isDated ? (row.after?.kind === 'date' ? row.after.text : row.suggested) : null,
    dateNote: isDated ? fixCellOf(shown, FIX_AFTER_COLUMN) : null,
    isCurrent: values.at === row.key,
  }
}

/** @purity pure */
function fixRowViewsOf(found: readonly ShownFixRow[], values: DelayFixWindowValues, words: FixWords): readonly DelayFixRowView[] {
  return found.map((shown) => {
    const row = proposalOf(shown)
    return {
      cells: shown.cells,
      glyph: null,
      status: null,
      target: fixTargetOf(shown),
      fix: row === null ? null : fixCellViewOf(shown, row, values, words),
    }
  })
}

// see RW-11, IC-154, IC-155, IC-156, EN-6
/** @purity pure */
function delayReportTabEntriesOf(values: DelayFixWindowValues, tables: DelayFixTables, language: DisplayLanguage): readonly CommandItem[] {
  const tabs = [entryOf(DIAGNOSIS_ENTRY, language, values.table === 'diagnosis'), entryOf(PROPOSALS_ENTRY, language, values.table === 'proposals')]
  return tables.log.length === 0 ? tabs : [...tabs, entryOf(LOG_ENTRY, language, values.table === 'log')]
}

const REASON_ROW_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.reasons.map((entry) => [entry.rowId, entry.text]))

// see RW-17, FR-155, NT-1, T-233
/** @purity pure */
function delayFixTellingText(telling: DelayFixTelling, words: FixWords): string {
  const language = words.language
  if (telling.kind === 'fixed') return filled(fixWordOf('fixedNotice', language), { n: telling.count })
  const row = `${words.cells.findingOf(telling.row.findingRow, telling.row.taskUid)} / ${words.cells.taskNameOf(telling.row.taskUid)}`
  return filled(fixWordOf('refusedNotice', language), { row, reason: rowWordOf(REASON_ROW_WORDS, telling.reason, language) })
}

// see RW-12, RW-17, RW-18, IC-166, IC-157, IC-158, FR-092
/** @purity pure */
function delayFixFooterOf(values: DelayFixWindowValues, tables: DelayFixTables, words: FixWords): DelayFixFooterView | null {
  if (values.table !== 'proposals') return null
  const language = words.language
  const count = delayFixBundleOf(tables.proposals).length
  const adoptAll = { ...entryOf(ADOPT_ALL_ENTRY, language), isEnabled: tables.proposals.some(isAdoptable) }
  const writes = [OVERWRITE_FIX_ENTRY, BACKUP_FIX_ENTRY].map((icon) => ({ ...entryOf(icon, language), isEnabled: count > 0 }))
  const notice = tables.telling === undefined || tables.telling === null ? null : delayFixTellingText(tables.telling, words)
  return { count: filled(fixWordOf('fixCount', language), { n: count }), entries: [adoptAll, ...writes], notice }
}

/** @purity pure */
function isAdoptable(row: DelayFixRow): boolean {
  return isRecommendedDelayFix(row) && !row.checked
}

// see RW-14
/** @purity pure */
function byHandKeysOf(tables: DelayFixTables, values: DelayFixWindowValues, words: FixWords): readonly string[] {
  const shown = foundFixRowsOf(shownFixRowsOf('proposals', tables, words), '', values.views.proposals)
  return shown.flatMap((one) => {
    const row = proposalOf(one)
    return row === null || row.fixKind === 'automatic' ? [] : [row.key]
  })
}

/** @purity pure */
function walkPlaceOf(tables: DelayFixTables, values: DelayFixWindowValues, words: FixWords): { readonly keys: readonly string[]; readonly at: number } {
  const keys = byHandKeysOf(tables, values, words)
  return { keys, at: values.at === null ? -1 : keys.indexOf(values.at) }
}

// see RW-14, IC-159, IC-160, FR-092
/** @purity pure */
function delayFixWalkOf(values: DelayFixWindowValues, tables: DelayFixTables, words: FixWords): { readonly entries: readonly CommandItem[]; readonly counter: string } {
  const language = words.language
  const { keys, at } = walkPlaceOf(tables, values, words)
  const entries = [
    { ...entryOf(PREVIOUS_FIX_ENTRY, language), isEnabled: at > 0 },
    { ...entryOf(NEXT_FIX_ENTRY, language), isEnabled: at < keys.length - 1 },
  ]
  return { entries, counter: filled(fixWordOf('humanCounter', language), { k: at + 1, m: keys.length }) }
}

// see RW-11, RW-12, RW-14, T-374
// WHY: tabCounts is the count each tab adds after its word (RW-11); the entry's label stays the dictionary's word (FR-038).
export interface DelayFixView {
  readonly tabEntries: readonly CommandItem[]
  readonly tabCounts: { readonly [entry: IconId]: number }
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
    tabCounts: { [PROPOSALS_ENTRY]: tables.proposals.length, [LOG_ENTRY]: tables.log.length },
    walkEntries: walk.entries,
    walkCounter: walk.counter,
    fixFooter: delayFixFooterOf(values, tables, words),
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
  const all = window.shown === 'minimized' ? [] : shownFixRowsOf(table, tables, words)
  const found = foundFixRowsOf(all, window.panel.word, view)
  const listed = (): readonly ShownFixRow[] => foundFixRowsOf(all, window.panel.word, { ...view, columnFilters: [] })
  const shape = fixWindowTableOf(table, () => found, language, { rows: listed, sort: view.sort }, all)
  return {
    ...windowColumnsViewOf(window, view, shape, language),
    rows: fixRowViewsOf(found, values, words),
    jumpAt: shape.columns.indexOf(FIX_JUMP_COLUMN),
    tableEntries: [clearEntryOf(view, language)],
  }
}

// see RW-6, T-374
/** @purity pure */
function fixMarkdownSectionOf(table: FixTable, window: DelayDiagnosticsReportWindow, tables: DelayFixTables, words: FixWords): DelayFixMarkdownSection {
  const language = words.language
  const view = delayFixValuesOf(window).views[table]
  const found = foundFixRowsOf(shownFixRowsOf(table, tables, words), window.panel.word, view)
  const columns = table === 'log' ? LOG_COLUMNS : PROPOSAL_COLUMNS
  const filters = view.columnFilters.map((one) => ({
    heading: partWordOf(FIX_COLUMN_WORDS, one.column, language),
    condition: filterConditionText(one, (value) => value),
  }))
  return {
    heading: entryOf(table === 'log' ? LOG_ENTRY : PROPOSALS_ENTRY, language).label,
    filter: { word: window.panel.word, columns: filters },
    columns: columns.map((column) => partWordOf(FIX_COLUMN_WORDS, column, language)),
    rows: found.map((shown) => shown.cells),
  }
}

// see RW-6
/** @purity pure */
function fixMarkdownOf(window: DelayDiagnosticsReportWindow, tables: DelayFixTables, words: FixWords): DelayFixMarkdown {
  const log = tables.log.length === 0 ? null : fixMarkdownSectionOf('log', window, tables, words)
  return { proposals: fixMarkdownSectionOf('proposals', window, tables, words), log }
}

/** @purity pure */
function windowOnTable(window: DelayDiagnosticsReportWindow, table: DelayReportTable): DelayDiagnosticsReportWindow {
  if (delayFixValuesOf(window).table === table) return window
  return withFixValues({ ...window, panel: panelWithFilterShut(window.panel) }, { table })
}

// see RW-14, RW-13
/** @purity pure */
function stepAfterWalk(window: DelayDiagnosticsReportWindow, view: TableView, step: number, tables: DelayFixTables, words: FixWords): DelayReportStep | null {
  const values = delayFixValuesOf(window)
  const { keys, at } = walkPlaceOf(tables, values, words)
  const next = keys[at + step]
  const row = tables.proposals.find((one) => one.key === next)
  if (next === undefined || at + step < 0 || row === undefined) return null
  const moved = withFixValues(windowOnTable(window, 'proposals'), { at: next })
  return { window: moved, view, asked: { kind: 'fixJump', target: fixTargetOf({ row, cells: [], columns: [], blankWord: '' }) } }
}

// see RW-12, FR-155, T-290
/** @purity pure */
function stepAfterFixWrite(window: DelayDiagnosticsReportWindow, view: TableView, writeForm: DelayFixWriteForm, tables: DelayFixTables): DelayReportStep | null {
  const values = delayFixValuesOf(window)
  const fixBundle = delayFixBundleOf(tables.proposals)
  if (values.table !== 'proposals' || fixBundle.length === 0) return null
  return { window, view, asked: { kind: 'fixWrite', writeForm, fixBundle } }
}

// WHY: RW-18 writes no document, so no undo step (FR-155); inert with nothing to tick (FR-092); remade once (RW-16).
/** @purity pure */
function stepAfterAdoptAll(window: DelayDiagnosticsReportWindow, view: TableView, tables: DelayFixTables): DelayReportStep | null {
  if (delayFixValuesOf(window).table !== 'proposals' || !tables.proposals.some(isAdoptable)) return null
  return { window: delayDiagnosticsReportWithAdoptAll(window, tables), view }
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
  if (entry === ADOPT_ALL_ENTRY) return stepAfterAdoptAll(window, view, tables)
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
  const all = shownFixRowsOf(table, answers.tables, answers.words)
  const word = window.panel.word
  const step = windowAfterEntry(window, values.views[table], entry, filterColumn, {
    readiness: () => 'nothingChecked',
    tableOf: (unfiltered) => fixWindowTableOf(table, () => foundFixRowsOf(all, word, unfiltered), answers.words.language),
  }, answers.listed)
  if (step === null) return null
  if (step.window === null) return { window: null, view: tableWithScheduleFilterOff(view) }
  return { window: withFixValues(step.window, { views: { ...values.views, [table]: step.view } }), view }
}

export type DelayFixPickChange = Extract<SearchFilterChange, { readonly kind: 'fixPick' }>

// see RW-16, FM-1, FM-8
/** @purity pure */
function pickAfterChange(held: DelayFixCheck | undefined, change: DelayFixPickChange): DelayFixCheck {
  const pick = held ?? { key: change.key, checked: null, choice: null, date: null }
  if (change.part === 'check') return { ...pick, checked: change.value === CHECK_MARK }
  if (change.part === 'date') return { ...pick, date: change.value === '' ? null : change.value, checked: true }
  const choice = change.value === '' ? null : change.value
  return { ...pick, choice, checked: choice !== null }
}

// see RW-16, FM-1, FM-8
/** @purity pure */
export function delayDiagnosticsReportWithPick(window: DelayDiagnosticsReportWindow, change: DelayFixPickChange): DelayDiagnosticsReportWindow {
  const values = delayFixValuesOf(window)
  return withFixValues(window, { picks: { ...values.picks, [change.key]: pickAfterChange(values.picks[change.key], change) } })
}

// see RW-18, RW-16, FM-1
/** @purity pure */
export function delayDiagnosticsReportWithAdoptAll(window: DelayDiagnosticsReportWindow, tables: DelayFixTables): DelayDiagnosticsReportWindow {
  return tables.proposals.filter(isAdoptable).reduce(
    (held, row) => delayDiagnosticsReportWithPick(held, { kind: 'fixPick', column: FIX_CHECK_COLUMN, key: row.key, part: 'check', value: CHECK_MARK }),
    window,
  )
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

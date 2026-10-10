// Applies the search tables' column filters and sort, and lists the values a column's filter offers.
// @unit      UF-181   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  compareDays,
  dayOf,
  type CommentBoxSearchRow,
  type SearchRows,
  type TaskSearchRow,
} from '../../entity/document-model/schedule/schedule'
import type { SearchPanelSession } from '../../use-case/advance-screen-session/advance-screen-session'
import displayWords from './display-words.json'

type SearchFilters = SearchPanelSession['filters']

export type SearchColumnFilter = SearchFilters['columns'][number]

export type SearchColumn = SearchColumnFilter['column']

export type SearchSort = NonNullable<SearchPanelSession['sort']>

export const COMMENT_BOX_SEARCH_COLUMNS: readonly SearchColumn[] = ['SQ-7', 'SQ-8', 'SQ-9']

// see T-331
export const TASK_SEARCH_COLUMNS: readonly SearchColumn[] = displayWords.searchColumns
  .map((entry) => entry.rowId)
  .filter((column) => !COMMENT_BOX_SEARCH_COLUMNS.includes(column))

export const ASSIGNEE_SEPARATOR = ', '

export const TASK_GROUP_PATH_SEPARATOR = ' \u2192 '

export const BLANK_SEARCH_VALUE = ''

const LINE_BREAKS = /\r\n|\r|\n/g

const LINE_BREAK_SPACE = ' '

const STATUS_COLUMN: SearchColumn = 'SQ-5'

export const BOTTLENECK_STATE = 'bottleneck'

export type SearchTaskState = TaskSearchRow['planActualState'] | typeof BOTTLENECK_STATE

/** @purity pure */
export function searchTaskStateOf(row: TaskSearchRow): SearchTaskState {
  return row.isBottleneck ? BOTTLENECK_STATE : row.planActualState
}

// see SV-8
const STATES_ASCENDING: readonly SearchTaskState[] = [
  BOTTLENECK_STATE,
  'notStarted',
  'inProgress',
  'finished',
  'suspendedResumePlanned',
  'suspendedResumeUnknown',
]

// see SV-7, SV-8, T-331, T-347
export interface TableColumns<Row> {
  readonly values: { readonly [column: SearchColumn]: (row: Row) => readonly string[] }
  readonly dates: { readonly [column: SearchColumn]: (row: Row) => string | null }
  readonly orders?: { readonly [column: SearchColumn]: (a: string, b: string) => number }
}

const PERCENT = '%'

// see SQ-11, DT-3
/** @purity pure */
export function percentText(percent: number | null): string {
  return percent === null ? BLANK_SEARCH_VALUE : `${Math.round(percent)}${PERCENT}`
}

// see SQ-11, DT-3, SV-8
/** @purity pure */
export function comparePercentTexts(a: string, b: string): number {
  return Number.parseFloat(a) - Number.parseFloat(b)
}

// see SQ-7, SV-17
/** @purity pure */
export function searchBodyTextOf(text: string): string {
  return text.replace(LINE_BREAKS, LINE_BREAK_SPACE)
}

const TASK_TABLE: TableColumns<TaskSearchRow> = {
  values: {
    'SQ-1': (row) => [row.name],
    'SQ-2': (row) => (row.assigneeNames.length === 0 ? [BLANK_SEARCH_VALUE] : row.assigneeNames),
    'SQ-5': (row) => [searchTaskStateOf(row)],
    'SQ-11': (row) => [percentText(row.percentComplete)],
    'SQ-6': (row) => [row.rowPath.join(TASK_GROUP_PATH_SEPARATOR)],
  },
  dates: {
    'SQ-3': (row) => row.plannedStart,
    'SQ-4': (row) => row.plannedFinish,
    'SQ-12': (row) => row.actualStart,
    'SQ-13': (row) => row.actualFinish,
  },
  orders: {
    'SQ-11': comparePercentTexts,
  },
}

// see SQ-10, SV-7, SV-8
export const SHOW_VALUE = 'show'
export const HIDE_VALUE = 'hide'
const VISIBILITY_COLUMN: SearchColumn = 'SQ-10'
const SHOWN_RANKS: ReadonlyMap<string, number> = new Map([[SHOW_VALUE, 0], [HIDE_VALUE, 1]])
const NOTHING_SHOWN: ReadonlySet<number> = new Set()

// see SV-8
/** @purity pure */
function compareShownValues(a: string, b: string): number {
  return (SHOWN_RANKS.get(a) ?? SHOWN_RANKS.size) - (SHOWN_RANKS.get(b) ?? SHOWN_RANKS.size)
}

// see SQ-10, TV-2
/** @purity pure */
function taskTableOf(shown: ReadonlySet<number>): TableColumns<TaskSearchRow> {
  return {
    ...TASK_TABLE,
    values: { ...TASK_TABLE.values, [VISIBILITY_COLUMN]: (row) => [shown.has(row.taskUid) ? SHOW_VALUE : HIDE_VALUE] },
    orders: { ...TASK_TABLE.orders, [VISIBILITY_COLUMN]: compareShownValues },
  }
}

const COMMENT_BOX_TABLE: TableColumns<CommentBoxSearchRow> = {
  values: {
    'SQ-7': (row) => [searchBodyTextOf(row.text)],
    'SQ-8': (row) => [row.taskGroupName],
  },
  dates: {
    'SQ-9': (row) => row.anchorDate,
  },
}

/** @purity pure */
function isColumnOf<Row>(table: TableColumns<Row>, column: SearchColumn): boolean {
  return table.values[column] !== undefined || table.dates[column] !== undefined
}

// see SV-7, T-331
/** @purity pure */
export function isDateSearchColumn(column: SearchColumn): boolean {
  return TASK_TABLE.dates[column] !== undefined || COMMENT_BOX_TABLE.dates[column] !== undefined
}

// WHY: code-unit order, not a locale's: SV-8 names no collation, and a host's collation differs by engine.
/** @purity pure */
function compareTexts(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

const STATE_RANKS: ReadonlyMap<string, number> = new Map(STATES_ASCENDING.map((state, rank) => [state, rank]))

/** @purity pure */
function compareStates(a: string, b: string): number {
  return (STATE_RANKS.get(a) ?? STATES_ASCENDING.length) - (STATE_RANKS.get(b) ?? STATES_ASCENDING.length)
}

/** @purity pure */
function valueOrderOf<Row>(table: TableColumns<Row>, column: SearchColumn): (a: string, b: string) => number {
  return table.orders?.[column] ?? (column === STATUS_COLUMN ? compareStates : compareTexts)
}

interface ColumnOrder<Row> {
  readonly isBlank: (row: Row) => boolean
  readonly compare: (a: Row, b: Row) => number
}

/** @purity pure */
function compareDayTexts(a: string | null, b: string | null): number {
  const [left, right] = [dayOf(a), dayOf(b)]
  return left === null || right === null ? 0 : compareDays(left, right)
}

// see SV-8
/** @purity pure */
function columnOrderOf<Row>(table: TableColumns<Row>, column: SearchColumn): ColumnOrder<Row> | null {
  const date = table.dates[column]
  if (date !== undefined) {
    return { isBlank: (row) => dayOf(date(row)) === null, compare: (a, b) => compareDayTexts(date(a), date(b)) }
  }
  const values = table.values[column]
  if (values === undefined) return null
  const order = valueOrderOf(table, column)
  const textOf = (row: Row): string => values(row).join(ASSIGNEE_SEPARATOR)
  return { isBlank: (row) => textOf(row) === BLANK_SEARCH_VALUE, compare: (a, b) => order(textOf(a), textOf(b)) }
}

// see SV-8
/** @purity pure */
function sortedRows<Row>(rows: readonly Row[], order: ColumnOrder<Row>, direction: SearchSort['direction']): readonly Row[] {
  const sign = direction === 'ascending' ? 1 : -1
  const filled = rows.filter((row) => !order.isBlank(row)).sort((a, b) => sign * order.compare(a, b))
  return [...filled, ...rows.filter((row) => order.isBlank(row))]
}

// see SV-7
/** @purity pure */
function isWithinDates(stored: string | null, from: string | null, to: string | null): boolean {
  if (from === null && to === null) return true
  const day = dayOf(stored)
  if (day === null) return false
  const [low, high] = [dayOf(from), dayOf(to)]
  return (low === null || compareDays(day, low) >= 0) && (high === null || compareDays(day, high) <= 0)
}

/** @purity pure */
function isKept<Row>(row: Row, filter: SearchColumnFilter, table: TableColumns<Row>): boolean {
  const date = table.dates[filter.column]
  if (date !== undefined) return isWithinDates(date(row), filter.from, filter.to)
  const values = table.values[filter.column]
  if (values === undefined || filter.hiddenValues.length === 0) return true
  const hidden = new Set(filter.hiddenValues)
  return values(row).some((value) => !hidden.has(value))
}

/** @purity pure */
export function filteredTableRows<Row>(
  rows: readonly Row[],
  table: TableColumns<Row>,
  filters: SearchFilters,
  sort: SearchSort | null,
): readonly Row[] {
  const own = filters.columns.filter((filter) => isColumnOf(table, filter.column))
  const kept = own.length === 0 ? rows : rows.filter((row) => own.every((filter) => isKept(row, filter, table)))
  const order = sort === null ? null : columnOrderOf(table, sort.column)
  return order === null || sort === null ? kept : sortedRows(kept, order, sort.direction)
}

// see SV-7, SV-8
/** @purity pure */
export function filteredSearchRows(
  rows: SearchRows,
  filters: SearchFilters,
  sort: SearchSort | null,
  shown: ReadonlySet<number> = NOTHING_SHOWN,
): SearchRows {
  return {
    taskRows: filteredTableRows(rows.taskRows, taskTableOf(shown), filters, sort),
    commentBoxRows: filteredTableRows(rows.commentBoxRows, COMMENT_BOX_TABLE, filters, sort),
  }
}

// WHY: listed in the column's ascending order with the blank last, as SV-8 sorts it; SV-7 gives the list no order.
/** @purity pure */
export function tableColumnValues<Row>(rows: readonly Row[], table: TableColumns<Row>, column: SearchColumn): readonly string[] {
  const values = table.values[column]
  if (values === undefined) return []
  const seen = new Set(rows.flatMap((row) => values(row)))
  const filled = [...seen].filter((value) => value !== BLANK_SEARCH_VALUE).sort(valueOrderOf(table, column))
  return seen.has(BLANK_SEARCH_VALUE) ? [...filled, BLANK_SEARCH_VALUE] : filled
}

// see SV-7
/** @purity pure */
export function columnValuesOf(rows: SearchRows, column: SearchColumn, shown: ReadonlySet<number> = NOTHING_SHOWN): readonly string[] {
  const tasks = taskTableOf(shown)
  if (isColumnOf(tasks, column)) return tableColumnValues(rows.taskRows, tasks, column)
  return tableColumnValues(rows.commentBoxRows, COMMENT_BOX_TABLE, column)
}

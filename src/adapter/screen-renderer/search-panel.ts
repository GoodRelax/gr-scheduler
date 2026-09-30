// Builds the Search Panel description for one frame: title row, word field and the shown table.
// @unit      UF-180  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  dayOf,
  searchRowsOf,
  type CommentBoxSearchRow,
  type Schedule,
  type SearchRows,
  type TaskSearchRow,
} from '../../entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  SEARCH_PANEL_TEXT_SIZE_ROWS,
  type ScreenSession,
  type SearchPanelSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import displayWords from './display-words.json'
import {
  ASSIGNEE_SEPARATOR,
  BLANK_SEARCH_VALUE,
  COMMENT_BOX_SEARCH_COLUMNS,
  ROW_PATH_SEPARATOR,
  TASK_SEARCH_COLUMNS,
  columnValuesOf,
  filteredSearchRows,
  isDateSearchColumn,
  searchBodyTextOf,
} from './search-table-filters'

const SEARCH_PANEL = 'Search Panel'

const TASKS_TABLE_ENTRY: IconId = 'IC-118'
const COMMENT_BOXES_TABLE_ENTRY: IconId = 'IC-119'
const TEXT_SIZE_ENTRY: IconId = 'IC-127'
const MINIMISE_ENTRY: IconId = 'IC-120'
const MAXIMISE_ENTRY: IconId = 'IC-121'
const CLOSE_ENTRY: IconId = 'IC-52'
const FILTER_ENTRY: IconId = 'IC-122'
const SORT_ASCENDING_ENTRY: IconId = 'IC-123'
const SORT_DESCENDING_ENTRY: IconId = 'IC-124'
const SHOW_ALL_ENTRY: IconId = 'IC-125'
const HIDE_ALL_ENTRY: IconId = 'IC-126'

const SORT_DIRECTIONS: { readonly [entry: IconId]: SearchSort['direction'] } = {
  [SORT_ASCENDING_ENTRY]: 'ascending',
  [SORT_DESCENDING_ENTRY]: 'descending',
}

const DATE_SEPARATOR = '/'

type SearchTable = SearchPanelSession['table']

type SearchColumnFilter = SearchPanelSession['filters']['columns'][number]

type SearchSort = NonNullable<SearchPanelSession['sort']>

type SearchColumn = (typeof displayWords.searchColumns)[number]['rowId']

type PlanActualState = TaskSearchRow['planActualState']

const STATUS_COLUMN: SearchColumn = 'SQ-5'

const TABLE_COLUMNS: { readonly [T in SearchTable]: readonly SearchColumn[] } = {
  tasks: TASK_SEARCH_COLUMNS,
  commentBoxes: COMMENT_BOX_SEARCH_COLUMNS,
}

// see SV-6
const LAST_FIXED_COLUMN: { readonly [T in SearchTable]: SearchColumn } = {
  tasks: 'SQ-2',
  commentBoxes: 'SQ-7',
}

// see T-019a
// TRAP: the PS rows top down, which is the order of their words; a state out of that order shows another's words.
const STATES_IN_TABLE_ORDER: readonly PlanActualState[] = [
  'notStarted',
  'finished',
  'suspendedResumeUnknown',
  'suspendedResumePlanned',
  'inProgress',
]

const ICON_WORDS = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const COLUMN_WORDS = new Map(displayWords.searchColumns.map((entry) => [entry.rowId, entry]))
const STATE_WORDS = new Map(displayWords.planActualStates.map((entry, at) => [STATES_IN_TABLE_ORDER[at], entry]))
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry]))
const PANEL_HEADING = displayWords.surfaces.find((entry) => entry.name === SEARCH_PANEL)?.heading

export type SearchPanelShown = 'normal' | 'minimised' | 'maximised'

export interface SearchColumnView {
  readonly column: SearchColumn
  readonly heading: string
  readonly isFixed: boolean
  readonly filterEntry: CommandItem
}

export interface SearchFilterValueView {
  readonly value: string
  readonly label: string
  readonly isShown: boolean
}

// see SV-7
export type SearchFilterMenuView =
  | {
      readonly kind: 'values'
      readonly column: SearchColumn
      readonly values: readonly SearchFilterValueView[]
      readonly entries: readonly CommandItem[]
    }
  | {
      readonly kind: 'dates'
      readonly column: SearchColumn
      readonly from: string | null
      readonly to: string | null
      readonly entries: readonly CommandItem[]
    }

// see SJ-1
export interface SearchRowView {
  readonly cells: readonly string[]
  readonly target:
    | { readonly kind: 'task'; readonly taskUid: TaskSearchRow['taskUid'] }
    | { readonly kind: 'commentBox'; readonly commentBoxId: CommentBoxSearchRow['commentBoxId'] }
}

// see GR-24, GR-25
export type SearchPanelGrabRegion =
  | 'headingBand'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'

export interface SearchPanelView {
  readonly heading: string
  readonly shown: SearchPanelShown
  readonly canvas: ScreenRect
  readonly at: SearchPanelSession['at']
  readonly size: SearchPanelSession['size']
  readonly textSizeStep: number
  readonly tableEntries: readonly CommandItem[]
  readonly titleEntries: readonly CommandItem[]
  readonly word: string
  readonly table: SearchTable
  readonly columns: readonly SearchColumnView[]
  readonly filterMenu: SearchFilterMenuView | null
  readonly rows: readonly SearchRowView[]
}

/** @purity pure */
function wordOf(held: { readonly [L in DisplayLanguage]: string } | undefined, language: DisplayLanguage): string {
  return held === undefined ? '' : held[language]
}

// see FR-038, T-109
/** @purity pure */
function entryOf(icon: IconId, language: DisplayLanguage, isChosen = false, label?: string): CommandItem {
  const word = label ?? wordOf(ICON_WORDS.get(icon)?.label, language)
  return { icon, isEnabled: true, isPressed: false, isArmed: false, isChosen, label: word }
}

// see SV-1, SV-13
/** @purity pure */
function titleEntriesOf(shown: SearchPanelShown, language: DisplayLanguage): readonly CommandItem[] {
  const restore = shown === 'maximised' ? wordOf(PANEL_WORDS.get('restore')?.text, language) : undefined
  return [
    entryOf(TEXT_SIZE_ENTRY, language),
    entryOf(MINIMISE_ENTRY, language),
    entryOf(MAXIMISE_ENTRY, language, false, restore),
    entryOf(CLOSE_ENTRY, language),
  ]
}

// see SQ-3, SQ-9
/** @purity pure */
function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return [day.year, day.month, day.day].join(DATE_SEPARATOR)
}

// see T-331
/** @purity pure */
function taskCells(row: TaskSearchRow, language: DisplayLanguage): readonly string[] {
  const name = row.name === '' ? wordOf(PANEL_WORDS.get('noName')?.text, language) : row.name
  return [
    name,
    row.assigneeNames.join(ASSIGNEE_SEPARATOR),
    dateText(row.plannedStart),
    dateText(row.plannedFinish),
    wordOf(STATE_WORDS.get(row.planActualState)?.text, language),
    row.rowPath.join(ROW_PATH_SEPARATOR),
  ]
}

// see SQ-7, SQ-8, SQ-9, SV-17
/** @purity pure */
function commentBoxCells(row: CommentBoxSearchRow): readonly string[] {
  return [searchBodyTextOf(row.text), row.rowName, dateText(row.anchorDate)]
}

/** @purity pure */
function columnsOf(table: SearchTable, language: DisplayLanguage): readonly SearchColumnView[] {
  const columns = TABLE_COLUMNS[table]
  const lastFixed = columns.indexOf(LAST_FIXED_COLUMN[table])
  return columns.map((column, at) => ({
    column,
    heading: wordOf(COLUMN_WORDS.get(column)?.text, language),
    isFixed: at <= lastFixed,
    filterEntry: entryOf(FILTER_ENTRY, language),
  }))
}

// see SV-4, SV-7, SV-8, SJ-1
/** @purity pure */
function rowsOf(found: SearchRows, panel: SearchPanelSession, language: DisplayLanguage): readonly SearchRowView[] {
  if (panel.table === 'tasks') {
    return found.taskRows.map((row) => ({
      cells: taskCells(row, language),
      target: { kind: 'task', taskUid: row.taskUid },
    }))
  }
  return found.commentBoxRows.map((row) => ({
    cells: commentBoxCells(row),
    target: { kind: 'commentBox', commentBoxId: row.commentBoxId },
  }))
}

// see SV-7, SV-14
/** @purity pure */
function openFilterOf(panel: SearchPanelSession, shown: SearchPanelShown): SearchColumn | null {
  const open = panel.filters.open
  if (open === null || shown === 'minimised' || !TABLE_COLUMNS[panel.table].includes(open)) return null
  return open
}

/** @purity pure */
function columnFilterOf(panel: SearchPanelSession, column: SearchColumn): SearchColumnFilter {
  const held = panel.filters.columns.find((one) => one.column === column)
  return held ?? { column, hiddenValues: [], from: null, to: null }
}

// see SV-7, SQ-5, T-331
/** @purity pure */
function valueLabelOf(column: SearchColumn, value: string, language: DisplayLanguage): string {
  if (value === BLANK_SEARCH_VALUE) return wordOf(PANEL_WORDS.get('blank')?.text, language)
  if (column !== STATUS_COLUMN) return value
  return wordOf(STATE_WORDS.get(value as PlanActualState)?.text, language)
}

// see SV-7
/** @purity pure */
function filterMenuOf(
  panel: SearchPanelSession,
  column: SearchColumn,
  found: SearchRows,
  language: DisplayLanguage,
): SearchFilterMenuView {
  const filter = columnFilterOf(panel, column)
  const sorts = [entryOf(SORT_ASCENDING_ENTRY, language), entryOf(SORT_DESCENDING_ENTRY, language)]
  if (isDateSearchColumn(column)) return { kind: 'dates', column, from: filter.from, to: filter.to, entries: sorts }
  const hidden = new Set(filter.hiddenValues)
  const values = columnValuesOf(found, column).map((value) => ({
    value,
    label: valueLabelOf(column, value, language),
    isShown: !hidden.has(value),
  }))
  const shows = [entryOf(SHOW_ALL_ENTRY, language), entryOf(HIDE_ALL_ENTRY, language)]
  return { kind: 'values', column, values, entries: [...shows, ...sorts] }
}

interface Span {
  readonly start: number
  readonly end: number
}

type SpanSide = 'start' | 'end' | null

const EDGE_SIDES: { readonly [R in Exclude<SearchPanelGrabRegion, 'headingBand'>]: readonly [SpanSide, SpanSide] } = {
  top: [null, 'start'],
  bottom: [null, 'end'],
  left: ['start', null],
  right: ['end', null],
  topLeft: ['start', 'start'],
  topRight: ['end', 'start'],
  bottomLeft: ['start', 'end'],
  bottomRight: ['end', 'end'],
}

/** @purity pure */
function withinSpan(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

// see SV-10, SV-11
/** @purity pure */
function spanMoved(span: Span, travel: number, within: Span): Span {
  const length = span.end - span.start
  const start = withinSpan(span.start + travel, within.start, within.end - length)
  return { start, end: start + length }
}

// see SV-11
// WHY: an edge stops at the opposite edge: S-423 and S-424 have no value, and a box has no negative size.
/** @purity pure */
function spanAfterEdge(span: Span, side: SpanSide, travel: number, within: Span): Span {
  if (side === 'start') return { start: withinSpan(span.start + travel, within.start, span.end), end: span.end }
  if (side === 'end') return { start: span.start, end: withinSpan(span.end + travel, span.start, within.end) }
  return span
}

/** @purity pure */
function spansOf(box: ScreenRect): readonly [Span, Span] {
  return [
    { start: box.x, end: box.x + box.width },
    { start: box.y, end: box.y + box.height },
  ]
}

// see SV-10, SV-11, GR-24, GR-25
/** @purity pure */
export function searchPanelBoxAfterGrab(
  region: SearchPanelGrabRegion,
  box: ScreenRect,
  travel: { readonly dx: number; readonly dy: number },
  canvas: ScreenRect,
): ScreenRect {
  const [xs, ys] = spansOf(box)
  const [canvasXs, canvasYs] = spansOf(canvas)
  const [xSide, ySide] = region === 'headingBand' ? [null, null] : EDGE_SIDES[region]
  const x = region === 'headingBand' ? spanMoved(xs, travel.dx, canvasXs) : spanAfterEdge(xs, xSide, travel.dx, canvasXs)
  const y = region === 'headingBand' ? spanMoved(ys, travel.dy, canvasYs) : spanAfterEdge(ys, ySide, travel.dy, canvasYs)
  return { x: x.start, y: y.start, width: x.end - x.start, height: y.end - y.start }
}

// see SV-11
// WHY: a held place is fitted again on every frame, so a smaller window never leaves the panel outside.
/** @purity pure */
function heldPlaceInCanvas(panel: SearchPanelSession, canvas: ScreenRect): Pick<SearchPanelView, 'at' | 'size'> {
  const held = panel.size
  const size = held === null ? null : { width: Math.min(held.width, canvas.width), height: Math.min(held.height, canvas.height) }
  if (panel.at === null) return { at: null, size }
  const [canvasXs, canvasYs] = spansOf(canvas)
  const x = spanMoved({ start: panel.at.x, end: panel.at.x + (size?.width ?? 0) }, 0, canvasXs)
  const y = spanMoved({ start: panel.at.y, end: panel.at.y + (size?.height ?? 0) }, 0, canvasYs)
  return { at: { x: x.start, y: y.start }, size }
}

// see FR-151, T-330, S-442
/** @purity pure */
export function searchPanelFromSession(
  session: ScreenSession,
  panel: SearchPanelSession,
  schedule: Schedule,
  canvas: ScreenRect,
): SearchPanelView | null {
  const display = session.screen.searchPanelDisplayState
  if (display.kind === 'hidden') return null
  const language = displayLanguageOf(session)
  const shown = display.child.kind
  const found = shown === 'minimised' ? null : searchRowsOf(schedule, panel.word)
  const open = openFilterOf(panel, shown)
  return {
    heading: wordOf(PANEL_HEADING, language),
    shown,
    canvas,
    ...heldPlaceInCanvas(panel, canvas),
    textSizeStep: panel.textSizeStep,
    tableEntries: [
      entryOf(TASKS_TABLE_ENTRY, language, panel.table === 'tasks'),
      entryOf(COMMENT_BOXES_TABLE_ENTRY, language, panel.table === 'commentBoxes'),
    ],
    titleEntries: titleEntriesOf(shown, language),
    word: panel.word,
    table: panel.table,
    columns: columnsOf(panel.table, language),
    filterMenu: open === null || found === null ? null : filterMenuOf(panel, open, found, language),
    rows: found === null ? [] : rowsOf(filteredSearchRows(found, panel.filters, panel.sort), panel, language),
  }
}

// see IC-127, SV-16
/** @purity pure */
export function nextSearchPanelTextSizeStep(step: number): number {
  return (step + 1) % SEARCH_PANEL_TEXT_SIZE_ROWS.length
}

// see SV-7
// WHY: a filter that hides nothing and bounds nothing is dropped, so the held filters list only working ones.
/** @purity pure */
function withColumnFilter(panel: SearchPanelSession, filter: SearchColumnFilter): SearchPanelSession {
  const others = panel.filters.columns.filter((one) => one.column !== filter.column)
  const isWorking = filter.hiddenValues.length > 0 || filter.from !== null || filter.to !== null
  return { ...panel, filters: { ...panel.filters, columns: isWorking ? [...others, filter] : others } }
}

// see SV-7, SV-8, T-109
/** @purity pure */
export function searchPanelAfterFilterEntry(
  session: ScreenSession,
  panel: SearchPanelSession,
  entry: IconId,
  schedule: Schedule,
): SearchPanelSession | null {
  const display = session.screen.searchPanelDisplayState
  const column = display.kind === 'hidden' ? null : openFilterOf(panel, display.child.kind)
  if (column === null) return null
  const direction = SORT_DIRECTIONS[entry]
  if (direction !== undefined) return { ...panel, sort: { column, direction } }
  if (isDateSearchColumn(column)) return null
  const filter = columnFilterOf(panel, column)
  if (entry === SHOW_ALL_ENTRY) return withColumnFilter(panel, { ...filter, hiddenValues: [] })
  if (entry !== HIDE_ALL_ENTRY) return null
  return withColumnFilter(panel, { ...filter, hiddenValues: columnValuesOf(searchRowsOf(schedule, panel.word), column) })
}

// see SV-14, IN-4
/** @purity pure */
export function searchPanelWithFilterClosed(session: ScreenSession, panel: SearchPanelSession): SearchPanelSession | null {
  const display = session.screen.searchPanelDisplayState
  if (display.kind === 'hidden' || openFilterOf(panel, display.child.kind) === null) return null
  return { ...panel, filters: { ...panel.filters, open: null } }
}

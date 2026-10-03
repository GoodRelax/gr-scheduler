// Builds the Search Panel description for one frame: title row, word field and the shown table.
// @unit      UF-180  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
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
import { windowPlaceInRange, type WindowShown } from './window-box'
import {
  ASSIGNEE_SEPARATOR,
  BLANK_SEARCH_VALUE,
  BOTTLENECK_STATE,
  COMMENT_BOX_SEARCH_COLUMNS,
  ROW_PATH_SEPARATOR,
  TASK_SEARCH_COLUMNS,
  columnValuesOf,
  filteredSearchRows,
  isDateSearchColumn,
  searchBodyTextOf,
  searchTaskStateOf,
  type SearchTaskState,
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
  windowTitleEntriesOf,
  wordOf,
  type SearchColumnView,
  type SearchFilterChange,
  type SearchFilterMenuView,
  type WindowTable,
} from './table-window'

export { windowTitleEntriesOf }
export type { SearchColumnView, SearchFilterChange, SearchFilterMenuView, SearchFilterValueView } from './table-window'

const SEARCH_PANEL = 'Search Panel'

const TASKS_TABLE_ENTRY: IconId = 'IC-118'
const COMMENT_BOXES_TABLE_ENTRY: IconId = 'IC-119'
const TEXT_SIZE_ENTRY: IconId = 'IC-127'

type SearchTable = SearchPanelSession['table']

type SearchColumn = (typeof displayWords.searchColumns)[number]['rowId']

type PlanActualState = TaskSearchRow['planActualState']

const STATUS_COLUMN: SearchColumn = 'SQ-5'

const NOTHING_FOUND: SearchRows = { taskRows: [], commentBoxRows: [] }

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

const COLUMN_WORDS = new Map(displayWords.searchColumns.map((entry) => [entry.rowId, entry]))
const STATE_WORDS = new Map(displayWords.planActualStates.map((entry, at) => [STATES_IN_TABLE_ORDER[at], entry]))
// see SQ-5: the word of table T-315 DG-2
const BOTTLENECK_WORD = displayWords.delayReportStatuses.find((entry) => entry.rowId === 'DG-2')?.text
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry]))
const PANEL_HEADING = displayWords.surfaces.find((entry) => entry.name === SEARCH_PANEL)?.heading

export type SearchPanelShown = WindowShown

// see SJ-1
export interface SearchRowView {
  readonly cells: readonly string[]
  readonly target:
    | { readonly kind: 'task'; readonly taskUid: TaskSearchRow['taskUid'] }
    | { readonly kind: 'commentBox'; readonly commentBoxId: CommentBoxSearchRow['commentBoxId'] }
}

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

// see SQ-5, T-019a, T-315
/** @purity pure */
function stateWordOf(state: SearchTaskState, language: DisplayLanguage): string {
  if (state === BOTTLENECK_STATE) return wordOf(BOTTLENECK_WORD, language)
  return wordOf(STATE_WORDS.get(state)?.text, language)
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
    stateWordOf(searchTaskStateOf(row), language),
    row.rowPath.join(ROW_PATH_SEPARATOR),
  ]
}

// see SQ-7, SQ-8, SQ-9, SV-17
/** @purity pure */
function commentBoxCells(row: CommentBoxSearchRow): readonly string[] {
  return [searchBodyTextOf(row.text), row.rowName, dateText(row.anchorDate)]
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

// see SV-7, SQ-5, T-331
/** @purity pure */
function valueLabelOf(column: SearchColumn, value: string, language: DisplayLanguage): string {
  if (value === BLANK_SEARCH_VALUE) return wordOf(PANEL_WORDS.get('blank')?.text, language)
  if (column !== STATUS_COLUMN) return value
  return stateWordOf(value as SearchTaskState, language)
}

// see SV-6, SV-7, T-331
/** @purity pure */
function searchTableOf(session: ScreenSession, panel: SearchPanelSession, found: () => SearchRows): WindowTable {
  const language = displayLanguageOf(session)
  const columns = TABLE_COLUMNS[panel.table]
  return {
    columns,
    fixedCount: columns.indexOf(LAST_FIXED_COLUMN[panel.table]) + 1,
    headingOf: (column) => wordOf(COLUMN_WORDS.get(column)?.text, language),
    isDateColumn: isDateSearchColumn,
    valuesOf: (column) => columnValuesOf(found(), column),
    labelOf: (column, value) => valueLabelOf(column, value, language),
  }
}

/** @purity pure */
function shownIn(session: ScreenSession): SearchPanelShown | null {
  const display = session.screen.searchPanelDisplayState
  return display.kind === 'hidden' ? null : display.child.kind
}

// see FR-151, T-330, S-442, SQ-5
/** @purity pure */
export function searchPanelFromSession(
  session: ScreenSession,
  panel: SearchPanelSession,
  schedule: Schedule,
  canvas: ScreenRect,
  bottleneckUids?: ReadonlySet<number>,
): SearchPanelView | null {
  const shown = shownIn(session)
  if (shown === null) return null
  const language = displayLanguageOf(session)
  const found = shown === 'minimised' ? null : searchRowsOf(schedule, panel.word, bottleneckUids)
  const table = searchTableOf(session, panel, () => found ?? NOTHING_FOUND)
  const open = openFilterIn(panel, shown, table)
  return {
    heading: wordOf(PANEL_HEADING, language),
    shown,
    canvas,
    ...windowPlaceInRange(panel, canvas),
    textSizeStep: panel.textSizeStep,
    tableEntries: [
      entryOf(TASKS_TABLE_ENTRY, language, panel.table === 'tasks'),
      entryOf(COMMENT_BOXES_TABLE_ENTRY, language, panel.table === 'commentBoxes'),
    ],
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(shown, language)],
    word: panel.word,
    table: panel.table,
    columns: tableColumnsOf(panel, table, language),
    filterMenu: open === null || found === null ? null : tableFilterMenuOf(panel, open, table, language),
    rows: found === null ? [] : rowsOf(filteredSearchRows(found, panel.filters, panel.sort), panel, language),
  }
}

// see IC-127, SV-16
/** @purity pure */
export function nextSearchPanelTextSizeStep(step: number): number {
  return (step + 1) % SEARCH_PANEL_TEXT_SIZE_ROWS.length
}

// see SV-18, GR-28
/** @purity pure */
export function searchPanelWithColumnWidth(panel: SearchPanelSession, column: SearchColumn, width: number): SearchPanelSession {
  return tableWithColumnWidth(panel, column, width)
}

// see SV-7, SV-8, T-109, SQ-5
/** @purity pure */
export function searchPanelAfterFilterEntry(
  session: ScreenSession,
  panel: SearchPanelSession,
  entry: IconId,
  schedule: Schedule,
  bottleneckUids?: ReadonlySet<number>,
): SearchPanelSession | null {
  const table = searchTableOf(session, panel, () => searchRowsOf(schedule, panel.word, bottleneckUids))
  return tableAfterFilterEntry(panel, shownIn(session), entry, table)
}

// see SV-7, IC-122
/** @purity pure */
export function searchPanelWithFilterOpened(
  session: ScreenSession,
  panel: SearchPanelSession,
  column: SearchColumn,
): SearchPanelSession | null {
  return tableWithFilterOpened(panel, shownIn(session), column, searchTableOf(session, panel, () => NOTHING_FOUND))
}

// see SV-7
/** @purity pure */
export function searchPanelAfterFilterChange(
  session: ScreenSession,
  panel: SearchPanelSession,
  change: SearchFilterChange,
): SearchPanelSession | null {
  return tableAfterFilterChange(panel, shownIn(session), change, searchTableOf(session, panel, () => NOTHING_FOUND))
}

// see SV-14, IN-4
/** @purity pure */
export function searchPanelWithFilterClosed(session: ScreenSession, panel: SearchPanelSession): SearchPanelSession | null {
  return tableWithFilterClosed(panel, shownIn(session), searchTableOf(session, panel, () => NOTHING_FOUND))
}

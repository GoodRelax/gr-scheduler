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
  HIDE_VALUE,
  TASK_GROUP_PATH_SEPARATOR,
  SHOW_VALUE,
  TASK_SEARCH_COLUMNS,
  columnValuesOf,
  filteredSearchRows,
  isDateSearchColumn,
  percentText,
  searchBodyTextOf,
  searchTaskStateOf,
  type SearchTaskState,
} from './search-table-filters'
import {
  clearEntryOf,
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
  tableWithViewsCleared,
  windowTitleEntriesOf,
  wordOf,
  type MarkGlyph,
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
const SHOW_ONLY_CHECKED_ENTRY: IconId = 'IC-143'

type SearchTable = SearchPanelSession['table']

type SearchColumn = (typeof displayWords.searchColumns)[number]['rowId']

type PlanActualState = TaskSearchRow['planActualState']

const STATUS_COLUMN: SearchColumn = 'SQ-5'

const VISIBILITY_COLUMN: SearchColumn = 'SQ-10'

// see SV-7, SQ-10
const VISIBILITY_VALUE_PARTS: ReadonlyMap<string, string> = new Map([
  [SHOW_VALUE, 'showValue'],
  [HIDE_VALUE, 'hideValue'],
])

// see SV-18
const MEASURED_COLUMNS: ReadonlySet<SearchColumn> = new Set(['SQ-5', 'SQ-11', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13', 'SQ-9'])

const NOTHING_FOUND: SearchRows = { taskRows: [], commentBoxRows: [] }

const TABLE_COLUMNS: { readonly [T in SearchTable]: readonly SearchColumn[] } = {
  tasks: TASK_SEARCH_COLUMNS,
  commentBoxes: COMMENT_BOX_SEARCH_COLUMNS,
}

// see SJ-1, SV-6
// WHY: the jump column is also the last fixed one: SV-6 fixes each table up to the cell SJ-1 jumps from.
const JUMP_COLUMN: { readonly [T in SearchTable]: SearchColumn } = {
  tasks: 'SQ-1',
  commentBoxes: 'SQ-7',
}

// see SQ-5, T-021, T-315
const STATE_GLYPHS: { readonly [S in SearchTaskState]: MarkGlyph } = {
  notStarted: 'PM-1a',
  inProgress: 'PM-1',
  finished: 'PM-2',
  suspendedResumePlanned: 'PM-3',
  suspendedResumeUnknown: 'PM-3',
  [BOTTLENECK_STATE]: 'DG-2',
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

const SEARCH_TASK_STATES = Object.keys(STATE_GLYPHS) as readonly SearchTaskState[]

const COLUMN_WORDS = new Map(displayWords.searchColumns.map((entry) => [entry.rowId, entry]))
const STATE_WORDS = new Map(displayWords.planActualStates.map((entry, at) => [STATES_IN_TABLE_ORDER[at], entry]))
// see SQ-5, DG-2
const BOTTLENECK_WORD = displayWords.delayReportStatuses.find((entry) => entry.rowId === 'DG-2')?.text
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry]))
const PANEL_HEADING = displayWords.surfaces.find((entry) => entry.name === SEARCH_PANEL)?.heading

export type SearchPanelShown = WindowShown

// see SJ-1, SQ-5, DT-1
export interface SearchRowView {
  readonly cells: readonly string[]
  readonly glyph: MarkGlyph | null
  readonly shown?: boolean
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
  // see SJ-1, SQ-5
  readonly jumpAt?: number
  readonly glyphAt?: number | null
  readonly showAt?: number | null
  readonly showHeading?: 'all' | 'some' | 'none'
  readonly showOnlyCheckedBar?: ShowOnlyCheckedBarView | null
  readonly entryRefusals?: readonly EntryRefusal[]
}

export interface EntryRefusal {
  readonly icon: IconId
  readonly reason: string
}

// see TV-11, U-67, S-497
export interface ShowOnlyCheckedBarView {
  readonly text: string
  readonly showAllLabel: string
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
    '',
    stateWordOf(searchTaskStateOf(row), language),
    percentText(row.percentComplete),
    name,
    row.assigneeNames.join(ASSIGNEE_SEPARATOR),
    dateText(row.plannedStart),
    dateText(row.plannedFinish),
    dateText(row.actualStart),
    dateText(row.actualFinish),
    row.rowPath.join(TASK_GROUP_PATH_SEPARATOR),
  ]
}

// see SQ-7, SQ-8, SQ-9, SV-17
/** @purity pure */
function commentBoxCells(row: CommentBoxSearchRow): readonly string[] {
  return [searchBodyTextOf(row.text), row.taskGroupName, dateText(row.anchorDate)]
}

// see SV-4, SV-7, SV-8, SJ-1
/** @purity pure */
function rowsOf(found: SearchRows, panel: SearchPanelSession, language: DisplayLanguage): readonly SearchRowView[] {
  if (panel.table === 'tasks') {
    const shown = new Set(panel.shownTaskUids)
    return found.taskRows.map((row) => ({
      cells: taskCells(row, language),
      glyph: STATE_GLYPHS[searchTaskStateOf(row)],
      shown: shown.has(row.taskUid),
      target: { kind: 'task', taskUid: row.taskUid },
    }))
  }
  return found.commentBoxRows.map((row) => ({
    cells: commentBoxCells(row),
    glyph: null,
    target: { kind: 'commentBox', commentBoxId: row.commentBoxId },
  }))
}

// see SV-7, SQ-5, T-331
/** @purity pure */
function valueLabelOf(column: SearchColumn, value: string, language: DisplayLanguage): string {
  if (value === BLANK_SEARCH_VALUE) return wordOf(PANEL_WORDS.get('blank')?.text, language)
  if (column === VISIBILITY_COLUMN) return wordOf(PANEL_WORDS.get(VISIBILITY_VALUE_PARTS.get(value) ?? '')?.text, language)
  if (column !== STATUS_COLUMN) return value
  return stateWordOf(value as SearchTaskState, language)
}

// see SV-18, SQ-5
/** @purity pure */
function widthSamplesIn(all: SearchRows, panel: SearchPanelSession, language: DisplayLanguage): (column: SearchColumn) => readonly string[] | null {
  const cells = panel.table === 'tasks' ? all.taskRows.map((row) => taskCells(row, language)) : all.commentBoxRows.map(commentBoxCells)
  const columns = TABLE_COLUMNS[panel.table]
  return (column) => {
    if (!MEASURED_COLUMNS.has(column)) return null
    if (column === STATUS_COLUMN) return SEARCH_TASK_STATES.map((state) => stateWordOf(state, language))
    const at = columns.indexOf(column)
    return [...new Set(cells.map((line) => line[at] ?? ''))]
  }
}

// see SV-6, SV-7, SV-18, T-331
/** @purity pure */
function searchTableOf(session: ScreenSession, panel: SearchPanelSession, found: () => SearchRows, all?: SearchRows): WindowTable {
  const language = displayLanguageOf(session)
  const columns = TABLE_COLUMNS[panel.table]
  return {
    columns,
    fixedCount: columns.indexOf(JUMP_COLUMN[panel.table]) + 1,
    headingOf: (column) => wordOf(COLUMN_WORDS.get(column)?.text, language),
    isDateColumn: isDateSearchColumn,
    valuesOf: (column) => columnValuesOf(found(), column, new Set(panel.shownTaskUids)),
    labelOf: (column, value) => valueLabelOf(column, value, language),
    ...(all === undefined ? {} : { widthSamplesOf: widthSamplesIn(all, panel, language) }),
  }
}

/** @purity pure */
function shownIn(session: ScreenSession): SearchPanelShown | null {
  const display = session.screen.searchPanelDisplayState
  return display.kind === 'hidden' ? null : display.child.kind
}

// see SQ-10
/** @purity pure */
function showHeadingOf(rows: readonly SearchRowView[]): 'all' | 'some' | 'none' {
  const ticked = rows.filter((row) => row.shown === true).length
  if (ticked === 0) return 'none'
  return ticked === rows.length ? 'all' : 'some'
}

// see SV-1, TV-5, EN-5
/** @purity pure */
function showOnlyCheckedEntryOf(panel: SearchPanelSession, language: DisplayLanguage): CommandItem {
  const entry = entryOf(SHOW_ONLY_CHECKED_ENTRY, language)
  return { ...entry, isEnabled: panel.showOnlyChecked || panel.shownTaskUids.length > 0, isPressed: panel.showOnlyChecked }
}

// see TV-5, FR-092
/** @purity pure */
function entryRefusalsOf(panel: SearchPanelSession, language: DisplayLanguage): readonly EntryRefusal[] {
  if (panel.table !== 'tasks' || panel.showOnlyChecked || panel.shownTaskUids.length > 0) return []
  return [{ icon: SHOW_ONLY_CHECKED_ENTRY, reason: wordOf(PANEL_WORDS.get('nothingChecked')?.text, language) }]
}

// see TV-11, U-67
/** @purity pure */
function showOnlyCheckedBarOf(panel: SearchPanelSession, schedule: Schedule, language: DisplayLanguage): ShowOnlyCheckedBarView | null {
  const text = shownCountWordOf('showOnlyCheckedBar', panel, schedule, language)
  return text === null ? null : { text, showAllLabel: wordOf(PANEL_WORDS.get('showAll')?.text, language) }
}

// see TV-11
/** @purity pure */
function shownCountWordOf(part: string, panel: SearchPanelSession, schedule: Schedule, language: DisplayLanguage): string | null {
  if (!panel.showOnlyChecked) return null
  const shown = new Set(panel.shownTaskUids)
  const counted = schedule.tasks.filter((task) => shown.has(task.uid)).length
  return wordOf(PANEL_WORDS.get(part)?.text, language)
    .replace('{total}', String(schedule.tasks.length))
    .replace('{shown}', String(counted))
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
  const all = found === null || panel.word === '' ? found : searchRowsOf(schedule, '', bottleneckUids)
  const table = searchTableOf(session, panel, () => found ?? NOTHING_FOUND, all ?? undefined)
  const open = openFilterIn(panel, shown, table)
  const rows = found === null ? [] : rowsOf(filteredSearchRows(found, panel.filters, panel.sort, new Set(panel.shownTaskUids)), panel, language)
  return {
    heading: wordOf(PANEL_HEADING, language),
    shown,
    canvas,
    ...windowPlaceInRange(panel, canvas),
    textSizeStep: panel.textSizeStep,
    tableEntries: [
      entryOf(TASKS_TABLE_ENTRY, language, panel.table === 'tasks'),
      entryOf(COMMENT_BOXES_TABLE_ENTRY, language, panel.table === 'commentBoxes'),
      clearEntryOf(panel, language),
      ...(panel.table === 'tasks' ? [showOnlyCheckedEntryOf(panel, language)] : []),
    ],
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(shown, language)],
    word: panel.word,
    table: panel.table,
    columns: tableColumnsOf(panel, table, language),
    filterMenu: open === null || found === null ? null : tableFilterMenuOf(panel, open, table, language),
    rows,
    jumpAt: TABLE_COLUMNS[panel.table].indexOf(JUMP_COLUMN[panel.table]),
    glyphAt: panel.table === 'tasks' ? TABLE_COLUMNS.tasks.indexOf(STATUS_COLUMN) : null,
    showAt: panel.table === 'tasks' ? TABLE_COLUMNS.tasks.indexOf(VISIBILITY_COLUMN) : null,
    showHeading: showHeadingOf(rows),
    showOnlyCheckedBar: showOnlyCheckedBarOf(panel, schedule, language),
    entryRefusals: entryRefusalsOf(panel, language),
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
  listed?: readonly string[] | null,
): SearchPanelSession | null {
  if (entry === SHOW_ONLY_CHECKED_ENTRY) return searchPanelAfterShowOnlyChecked(panel)
  const table = searchTableOf(session, panel, () => searchRowsOf(schedule, panel.word, bottleneckUids))
  return tableAfterFilterEntry(panel, shownIn(session), entry, table, listed)
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
  if (change.kind === 'shown') return searchPanelWithShownTasks(panel, change.taskUids, change.isShown)
  return tableAfterFilterChange(panel, shownIn(session), change, searchTableOf(session, panel, () => NOTHING_FOUND))
}

// see SV-14, IN-4
/** @purity pure */
export function searchPanelWithFilterClosed(session: ScreenSession, panel: SearchPanelSession): SearchPanelSession | null {
  return tableWithFilterClosed(panel, shownIn(session), searchTableOf(session, panel, () => NOTHING_FOUND))
}

// see SV-1, IC-153
/** @purity pure */
export function searchPanelWithTableViewsCleared(panel: SearchPanelSession): SearchPanelSession {
  return tableWithViewsCleared(panel)
}

// see SQ-10, TV-2
/** @purity pure */
export function searchPanelWithShownTasks(panel: SearchPanelSession, taskUids: readonly number[], isShown: boolean): SearchPanelSession {
  const named = new Set(taskUids)
  const kept = panel.shownTaskUids.filter((uid) => !named.has(uid))
  return { ...panel, shownTaskUids: isShown ? [...kept, ...taskUids] : kept }
}

// see TV-5, TV-8, IC-143
/** @purity pure */
function searchPanelAfterShowOnlyChecked(panel: SearchPanelSession): SearchPanelSession {
  if (panel.showOnlyChecked) return { ...panel, showOnlyChecked: false }
  return panel.shownTaskUids.length === 0 ? panel : { ...panel, showOnlyChecked: true }
}


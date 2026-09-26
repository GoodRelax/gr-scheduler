// Builds the Search Panel description for one frame: title row, word field and the shown table.
// @unit      UF-180  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  dayOf,
  searchRowsOf,
  type CommentBoxSearchRow,
  type PlanActualState,
  type Schedule,
  type TaskSearchRow,
} from '../../entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  SEARCH_PANEL_TEXT_SIZE_ROWS,
  type ScreenSession,
  type SearchColumn,
  type SearchPanelSession,
  type SearchTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import type { SearchJumpTarget } from '../../use-case/edit-document/edit-document'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import displayWords from './display-words.json'

const SEARCH_PANEL = 'Search Panel'

const TASKS_TABLE_ENTRY: IconId = 'IC-118'
const COMMENT_BOXES_TABLE_ENTRY: IconId = 'IC-119'
const TEXT_SIZE_ENTRY: IconId = 'IC-127'
const MINIMISE_ENTRY: IconId = 'IC-120'
const MAXIMISE_ENTRY: IconId = 'IC-121'
const CLOSE_ENTRY: IconId = 'IC-52'

const ASSIGNEE_SEPARATOR = ', '
const ROW_PATH_SEPARATOR = ' → '
const DATE_SEPARATOR = '/'
const LINE_BREAKS = /\r\n|\r|\n/g
const LINE_BREAK_SPACE = ' '

const TASK_COLUMNS: readonly SearchColumn[] = ['SQ-1', 'SQ-2', 'SQ-3', 'SQ-4', 'SQ-5', 'SQ-6']
const COMMENT_BOX_COLUMNS: readonly SearchColumn[] = ['SQ-7', 'SQ-8', 'SQ-9']

// see SV-6
const LAST_FIXED_COLUMN: { readonly [T in SearchTable]: SearchColumn } = {
  tasks: 'SQ-2',
  commentBoxes: 'SQ-7',
}

// see T-019a
const STATE_ROW: { readonly [S in PlanActualState]: string } = {
  notStarted: 'PS-1',
  finished: 'PS-2',
  suspendedResumeUnknown: 'PS-3',
  suspendedResumePlanned: 'PS-4',
  inProgress: 'PS-5',
}

const ICON_WORDS = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const COLUMN_WORDS = new Map(displayWords.searchColumns.map((entry) => [entry.rowId, entry]))
const STATE_WORDS = new Map(displayWords.planActualStates.map((entry) => [entry.rowId, entry]))
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry]))
const SURFACE_WORDS = new Map(displayWords.surfaces.map((entry) => [entry.name, entry]))

export type SearchPanelShown = 'normal' | 'minimised' | 'maximised'

export interface SearchColumnView {
  readonly column: SearchColumn
  readonly heading: string
  readonly isFixed: boolean
}

export interface SearchRowView {
  readonly cells: readonly string[]
  readonly target: SearchJumpTarget
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
    wordOf(STATE_WORDS.get(STATE_ROW[row.planActualState])?.text, language),
    row.rowPath.join(ROW_PATH_SEPARATOR),
  ]
}

// see SQ-7, SQ-8, SQ-9, SV-17
/** @purity pure */
function commentBoxCells(row: CommentBoxSearchRow): readonly string[] {
  return [row.text.replace(LINE_BREAKS, LINE_BREAK_SPACE), row.rowName, dateText(row.anchorDate)]
}

/** @purity pure */
function columnsOf(table: SearchTable, language: DisplayLanguage): readonly SearchColumnView[] {
  const columns = table === 'tasks' ? TASK_COLUMNS : COMMENT_BOX_COLUMNS
  const lastFixed = columns.indexOf(LAST_FIXED_COLUMN[table])
  return columns.map((column, at) => ({
    column,
    heading: wordOf(COLUMN_WORDS.get(column)?.text, language),
    isFixed: at <= lastFixed,
  }))
}

// see SV-4, SJ-1
/** @purity pure */
function rowsOf(schedule: Schedule, panel: SearchPanelSession, language: DisplayLanguage): readonly SearchRowView[] {
  const found = searchRowsOf(schedule, panel.word)
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
  return {
    heading: wordOf(SURFACE_WORDS.get(SEARCH_PANEL)?.heading, language),
    shown,
    canvas,
    at: panel.at,
    size: panel.size,
    textSizeStep: panel.textSizeStep,
    tableEntries: [
      entryOf(TASKS_TABLE_ENTRY, language, panel.table === 'tasks'),
      entryOf(COMMENT_BOXES_TABLE_ENTRY, language, panel.table === 'commentBoxes'),
    ],
    titleEntries: titleEntriesOf(shown, language),
    word: panel.word,
    table: panel.table,
    columns: columnsOf(panel.table, language),
    rows: shown === 'minimised' ? [] : rowsOf(schedule, panel, language),
  }
}

// see IC-127, SV-16
/** @purity pure */
export function nextSearchPanelTextSizeStep(step: number): number {
  return (step + 1) % SEARCH_PANEL_TEXT_SIZE_ROWS.length
}

// see SJ-8
// WHY: a row the last picture did not draw has no drawn height yet; any room below the pins is taken as enough.
/** @purity pure */
export function hasRoomBelowPinsIn(layout: ScheduleLayout, rowArea: ScreenRect, groupId: string | null): boolean {
  const room = rowArea.height - (layout.pinnedBandHeight ?? 0)
  const drawn = groupId === null ? undefined : layout.rows.find((row) => row.groupId === groupId)
  return drawn === undefined ? room > 0 : room >= drawn.height
}

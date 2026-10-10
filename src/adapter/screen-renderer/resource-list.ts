// Builds the Resource List window for one frame: the title row, the row of choice entries and the table of T-371.
// @unit      UF-199   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { isSearchWordFound, searchRowsOf, type Schedule } from '../../entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import { emptySearchPanelSession, type ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import displayWords from './display-words.json'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import type { SearchPanelView } from './search-panel'
import { BLANK_SEARCH_VALUE, filteredTableRows, tableColumnValues, withVisibilityColumn, type TableColumns } from './search-table-filters'
import {
  UNASSIGNED_ROW_KEY,
  clearEntryOf,
  entryOf,
  isClearEntry,
  isRowShown,
  openFilterIn,
  scheduleFilterEntryOf,
  scheduleFilterRefusalsOf,
  tableAfterFilterChange,
  tableAfterFilterEntry,
  tableAfterVisibilityChange,
  tableColumnsOf,
  tableFilterMenuOf,
  tableWithColumnWidth,
  tableWithFilterClosed,
  tableWithFilterOpened,
  tableWithScheduleFilterPressed,
  tableWithViewsCleared,
  visibilityHeadingOf,
  visibilityLabelOf,
  windowShownAfterEntry,
  windowTitleEntriesOf,
  wordOf,
  wouldScheduleFilterChange,
  type SearchFilterChange,
  type TableWindowState,
  type VisibilityKey,
  type WindowTable,
} from './table-window'
import { iconLabel } from './tooltips'
import { windowPlaceInRange } from './window-box'

const RESOURCE_LIST = 'Resource List'

const TEXT_SIZE_ENTRY: IconId = 'IC-127'
const FILTER_ENTRY: IconId = 'IC-122'
const CHOOSE_ALL_ENTRY: IconId = 'IC-63'
const CLEAR_CHOSEN_ENTRY: IconId = 'IC-64'
const CHOOSE_UNREFERENCED_ENTRY: IconId = 'IC-65'
const DELETE_ENTRY: IconId = 'IC-66'
const CHOSEN_ENTRY: IconId = 'IC-67'
const UNCHOSEN_ENTRY: IconId = 'IC-68'

const CHOICE_ENTRIES: readonly IconId[] = [CHOOSE_ALL_ENTRY, CLEAR_CHOSEN_ENTRY, CHOOSE_UNREFERENCED_ENTRY, DELETE_ENTRY]

export const RESOURCE_LIST_COLUMNS: readonly string[] = displayWords.resourceListColumns.map((entry) => entry.rowId)

const VISIBILITY_COLUMN = 'RQ-1'
const CHOSEN_COLUMN = 'RQ-3'
const COUNT_COLUMN = 'RQ-4'

const LAST_FIXED_COLUMN = 'RQ-2'

const MEASURED_COLUMNS: readonly string[] = [CHOSEN_COLUMN, COUNT_COLUMN]

const CHOSEN_VALUE = 'chosen'
const UNCHOSEN_VALUE = 'unchosen'

const COLUMNS_ONLY_LANGUAGE: DisplayLanguage = 'en'

type LanguageWord = { readonly [L in DisplayLanguage]: string }

const HEADING = displayWords.surfaces.find((entry) => entry.name === RESOURCE_LIST)?.heading
const COLUMN_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.resourceListColumns.map((entry) => [entry.rowId, entry.text]))
const LIST_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.resourceList.map((entry) => [entry.part, entry.text]))
const PANEL_WORDS: ReadonlyMap<string, LanguageWord> = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry.text]))

// see RO-1, RO-6, S-545, S-546
export const OPENED_RESOURCE_LIST: TableWindowState = {
  shown: 'normal',
  panel: emptySearchPanelSession,
  isInFront: true,
}

// WHY: chosenEntry (IC-67 or IC-68 in the RQ-3 cell) is null on the (Unassigned) row, which is never chosen (RO-5).
export interface ResourceListRowView {
  readonly key: VisibilityKey
  readonly cells: readonly string[]
  readonly shown: boolean
  readonly chosenEntry: CommandItem | null
}

// see FR-099, T-370, T-371
export interface ResourceListView extends Omit<SearchPanelView, 'table' | 'rows' | 'jumpAt' | 'glyphAt'> {
  readonly isInFront: boolean
  readonly choiceEntries: readonly CommandItem[]
  readonly rows: readonly ResourceListRowView[]
  readonly chosenAt: number
}

// WHY: one line of the table before its filters: the raw values the filters read beside the cells drawn.
interface ResourceLine {
  readonly key: VisibilityKey
  readonly nameValue: string
  readonly taskNameValues: readonly string[]
  readonly isChosen: boolean | null
  readonly isReferenced: boolean
  readonly cells: readonly string[]
}

interface LinesInput {
  readonly schedule: Schedule
  readonly chosenResourceUids: readonly number[]
  readonly language: DisplayLanguage
}

/** @purity pure */
function partWordOf(words: ReadonlyMap<string, LanguageWord>, part: string, language: DisplayLanguage): string {
  return wordOf(words.get(part), language)
}

/** @purity pure */
function nameText(name: string, language: DisplayLanguage): string {
  return name === '' ? partWordOf(PANEL_WORDS, 'noName', language) : name
}

// WHY: task uids in the task group tree's order, then Task.start, then Task.uid -- the search table's order (RQ-5).
/** @purity pure */
function tasksOfEachResource(schedule: Schedule): { readonly byResource: ReadonlyMap<number, readonly number[]>; readonly unassigned: readonly number[] } {
  const resources = new Set(schedule.resources.map((one) => one.uid))
  const resourcesOfTask = new Map<number, number[]>()
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid === null || assignment.resourceUid === null || !resources.has(assignment.resourceUid)) continue
    resourcesOfTask.set(assignment.taskUid, [...(resourcesOfTask.get(assignment.taskUid) ?? []), assignment.resourceUid])
  }
  const byResource = new Map<number, number[]>()
  const unassigned: number[] = []
  for (const row of searchRowsOf(schedule, '').taskRows) {
    const held = resourcesOfTask.get(row.taskUid)
    if (held === undefined) unassigned.push(row.taskUid)
    for (const resourceUid of new Set(held ?? [])) byResource.set(resourceUid, [...(byResource.get(resourceUid) ?? []), row.taskUid])
  }
  return { byResource, unassigned }
}

// TRAP: join on resourceUid, never the name, or a referenced twin hides an unreferenced one.
/** @purity pure */
function referencedResourcesOf(schedule: Schedule): ReadonlySet<number> {
  return new Set(schedule.assignments.flatMap((one) => (one.resourceUid === null ? [] : [one.resourceUid])))
}

/** @purity pure */
function lineOf(key: VisibilityKey, name: string, taskUids: readonly number[], facts: { readonly isChosen: boolean | null; readonly isReferenced: boolean }, input: LinesInput, namesByUid: ReadonlyMap<number, string>): ResourceLine {
  const taskNameValues = taskUids.map((uid) => namesByUid.get(uid) ?? '')
  const separator = partWordOf(LIST_WORDS, 'taskSeparator', input.language)
  const cells = [
    '',
    key === UNASSIGNED_ROW_KEY ? name : nameText(name, input.language),
    '',
    String(taskUids.length),
    taskNameValues.map((one) => nameText(one, input.language)).join(separator),
  ]
  return { key, nameValue: name, taskNameValues, isChosen: facts.isChosen, isReferenced: facts.isReferenced, cells }
}

// see FR-099, RO-4, RO-5, T-371
/** @purity pure */
function resourceLinesOf(input: LinesInput): readonly ResourceLine[] {
  const schedule = input.schedule
  const tasks = tasksOfEachResource(schedule)
  const referenced = referencedResourcesOf(schedule)
  const chosen = new Set(input.chosenResourceUids)
  const namesByUid = new Map(schedule.tasks.map((task) => [task.uid, task.name ?? '']))
  const lines = schedule.resources.map((resource) =>
    lineOf(resource.uid, resource.name ?? '', tasks.byResource.get(resource.uid) ?? [], {
      isChosen: chosen.has(resource.uid),
      isReferenced: referenced.has(resource.uid),
    }, input, namesByUid),
  )
  const unassignedName = partWordOf(LIST_WORDS, 'unassigned', input.language)
  return [...lines, lineOf(UNASSIGNED_ROW_KEY, unassignedName, tasks.unassigned, { isChosen: null, isReferenced: true }, input, namesByUid)]
}

/** @purity pure */
function chosenValueOf(line: ResourceLine): string {
  if (line.isChosen === null) return BLANK_SEARCH_VALUE
  return line.isChosen ? CHOSEN_VALUE : UNCHOSEN_VALUE
}

/** @purity pure */
function compareCounts(a: string, b: string): number {
  return Number(a) - Number(b)
}

// see T-371, SV-7, SV-8
const LINE_TABLE: TableColumns<ResourceLine> = {
  values: {
    'RQ-2': (line) => [line.nameValue],
    [CHOSEN_COLUMN]: (line) => [chosenValueOf(line)],
    [COUNT_COLUMN]: (line) => [line.cells[3] ?? ''],
    'RQ-5': (line) => (line.taskNameValues.length === 0 ? [BLANK_SEARCH_VALUE] : line.taskNameValues),
  },
  dates: {},
  orders: { [COUNT_COLUMN]: compareCounts },
}

// see RQ-1, TV-2, TV-13
/** @purity pure */
function lineColumnsOf(window: TableWindowState): TableColumns<ResourceLine> {
  return withVisibilityColumn(LINE_TABLE, VISIBILITY_COLUMN, (line) => isRowShown(window.panel.visibility, line.key))
}

// see RO-3, SV-4
/** @purity pure */
function isWordFound(line: ResourceLine, word: string): boolean {
  if (word === '' || isSearchWordFound(line.nameValue, word)) return true
  return line.taskNameValues.some((name) => isSearchWordFound(name, word))
}

/** @purity pure */
function listedLinesOf(window: TableWindowState, all: readonly ResourceLine[]): readonly ResourceLine[] {
  const found = all.filter((line) => isWordFound(line, window.panel.word))
  return filteredTableRows(found, lineColumnsOf(window), window.panel.filters, window.panel.sort)
}

/** @purity pure */
function lineLabelOf(column: string, value: string, language: DisplayLanguage): string {
  if (column === VISIBILITY_COLUMN) return visibilityLabelOf(value, language) ?? value
  if (value === BLANK_SEARCH_VALUE) return partWordOf(PANEL_WORDS, 'blank', language)
  if (column !== CHOSEN_COLUMN) return value
  return iconLabel(value === CHOSEN_VALUE ? CHOSEN_ENTRY : UNCHOSEN_ENTRY, language)
}

/** @purity pure */
function widthSamplesIn(all: readonly ResourceLine[], language: DisplayLanguage): (column: string) => readonly string[] | null {
  return (column) => {
    if (!MEASURED_COLUMNS.includes(column)) return null
    if (column === CHOSEN_COLUMN) return [iconLabel(CHOSEN_ENTRY, language), iconLabel(UNCHOSEN_ENTRY, language)]
    const at = RESOURCE_LIST_COLUMNS.indexOf(column)
    return [...new Set(all.map((line) => line.cells[at] ?? ''))]
  }
}

// see T-371, SV-7, RO-7
/** @purity pure */
function lineTableOf(window: TableWindowState, found: () => readonly ResourceLine[], language: DisplayLanguage, all?: readonly ResourceLine[]): WindowTable {
  const columns = lineColumnsOf(window)
  return {
    columns: RESOURCE_LIST_COLUMNS,
    fixedCount: RESOURCE_LIST_COLUMNS.indexOf(LAST_FIXED_COLUMN) + 1,
    headingOf: (column) => partWordOf(COLUMN_WORDS, column, language),
    isDateColumn: () => false,
    valuesOf: (column) => tableColumnValues(found(), columns, column),
    labelOf: (column, value) => lineLabelOf(column, value, language),
    ...(all === undefined ? {} : { widthSamplesOf: widthSamplesIn(all, language) }),
  }
}

// WHY: the table rows every task (a resource's or the (Unassigned) row's), so only a Hide row changes the schedule.
/** @purity pure */
function wouldResourceFilterChange(window: TableWindowState, schedule: Schedule): boolean {
  return wouldScheduleFilterChange(window.panel.visibility, () => new Set(schedule.resources.map((one) => one.uid)), true)
}

// see FR-029, FR-099, IC-63, IC-64, IC-65, IC-66, RO-3
// WHY: counted on the listed rows, as IC-63 and IC-65 choose among them; IC-65 replaces the choice,
// so it is idle once the choice already is exactly the listed unreferenced resources.
/** @purity pure */
function isChoiceUsable(entry: IconId, listed: readonly ResourceLine[], all: readonly ResourceLine[]): boolean {
  const resources = listed.filter((line) => line.isChosen !== null)
  const isChosenSome = all.some((line) => line.isChosen === true)
  if (entry === CHOOSE_ALL_ENTRY) return resources.some((line) => line.isChosen === false)
  if (entry === CLEAR_CHOSEN_ENTRY || entry === DELETE_ENTRY) return isChosenSome
  const unreferenced = new Set(resources.filter((line) => !line.isReferenced).map((line) => line.key))
  const chosen = all.filter((line) => line.isChosen === true).map((line) => line.key)
  const isSameChoice = chosen.length === unreferenced.size && chosen.every((key) => unreferenced.has(key))
  return unreferenced.size > 0 && !isSameChoice
}

// see RO-3
/** @purity pure */
function choiceEntriesOf(listed: readonly ResourceLine[], all: readonly ResourceLine[], language: DisplayLanguage): readonly CommandItem[] {
  return CHOICE_ENTRIES.map((icon) => ({ ...entryOf(icon, language), isEnabled: isChoiceUsable(icon, listed, all) }))
}

// see RQ-1, RQ-3, SV-17
/** @purity pure */
function rowViewOf(window: TableWindowState, line: ResourceLine, language: DisplayLanguage): ResourceListRowView {
  const chosenEntry = line.isChosen === null ? null : entryOf(line.isChosen ? CHOSEN_ENTRY : UNCHOSEN_ENTRY, language)
  return { key: line.key, cells: line.cells, shown: isRowShown(window.panel.visibility, line.key), chosenEntry }
}

// see FR-099, T-370, T-371, RO-2, RO-3, RO-8
/** @purity pure */
export function resourceListFromWindow(
  session: ScreenSession,
  window: TableWindowState | null,
  schedule: Schedule,
  chosenResourceUids: readonly number[],
  layout: { readonly canvas: ScreenRect; readonly textSizeStep: number },
): ResourceListView | null {
  if (window === null) return null
  const language = displayLanguageOf(session)
  const all = resourceLinesOf({ schedule, chosenResourceUids, language })
  const listed = window.shown === 'minimised' ? [] : listedLinesOf(window, all)
  const table = lineTableOf(window, () => listed, language, all)
  const open = openFilterIn(window.panel, window.shown, table)
  const scheduleFilter = scheduleFilterEntryOf(window.panel.visibility, wouldResourceFilterChange(window, schedule), language)
  const rows = listed.map((line) => rowViewOf(window, line, language))
  return {
    heading: wordOf(HEADING, language),
    shown: window.shown,
    isInFront: window.isInFront,
    canvas: layout.canvas,
    ...windowPlaceInRange(window.panel, layout.canvas),
    textSizeStep: layout.textSizeStep,
    tableEntries: [clearEntryOf(window.panel, language), scheduleFilter],
    titleEntries: [entryOf(TEXT_SIZE_ENTRY, language), ...windowTitleEntriesOf(window.shown, language)],
    choiceEntries: choiceEntriesOf(listed, all, language),
    word: window.panel.word,
    columns: tableColumnsOf(window.panel, table, language),
    filterMenu: open === null ? null : tableFilterMenuOf(window.panel, open, table, language),
    rows,
    chosenAt: RESOURCE_LIST_COLUMNS.indexOf(CHOSEN_COLUMN),
    showAt: RESOURCE_LIST_COLUMNS.indexOf(VISIBILITY_COLUMN),
    showHeading: visibilityHeadingOf(rows),
    entryRefusals: scheduleFilterRefusalsOf(scheduleFilter, language),
  }
}

// see RO-3, IC-63, IC-65
// WHY: the Resource uids the table lists now, after its word and column filters -- the ones IC-63 and IC-65 choose among.
/** @purity pure */
export function resourceListListedUidsOf(window: TableWindowState, schedule: Schedule, chosenResourceUids: readonly number[]): readonly number[] {
  const all = resourceLinesOf({ schedule, chosenResourceUids, language: COLUMNS_ONLY_LANGUAGE })
  return listedLinesOf(window, all).flatMap((line) => (line.key === UNASSIGNED_ROW_KEY ? [] : [line.key]))
}

// see T-370, SV-7, SV-8, WB-2, WB-3, RO-1, RO-2, IC-153, IC-143
// WHY: { window: null } is a close; null is an entry the window does not answer.
/** @purity pure */
export function resourceListAfterEntry(
  window: TableWindowState,
  entry: IconId,
  filterColumn: string | null,
  rows: { readonly schedule: Schedule; readonly chosenResourceUids: readonly number[]; readonly language: DisplayLanguage },
  listed?: readonly string[] | null,
): { readonly window: TableWindowState | null } | null {
  const shown = windowShownAfterEntry(window.shown, entry)
  if (shown === null) return { window: null }
  if (shown !== undefined) return { window: { ...window, shown } }
  if (isClearEntry(entry)) return { window: { ...window, panel: tableWithViewsCleared(window.panel) } }
  const filtered = tableWithScheduleFilterPressed(window.panel, entry, wouldResourceFilterChange(window, rows.schedule))
  if (filtered !== null) return { window: { ...window, panel: filtered } }
  const all = resourceLinesOf(rows)
  const unfiltered = { ...window, panel: { ...window.panel, filters: { ...window.panel.filters, columns: [] } } }
  const table = lineTableOf(window, () => listedLinesOf(unfiltered, all), rows.language)
  const panel =
    entry === FILTER_ENTRY
      ? filterColumn === null ? null : tableWithFilterOpened(window.panel, window.shown, filterColumn, table)
      : tableAfterFilterEntry(window.panel, window.shown, entry, table, listed)
  return panel === null ? null : { window: { ...window, panel } }
}

// see SV-7, RQ-1, TV-2, TV-6
/** @purity pure */
export function resourceListAfterFilterChange(window: TableWindowState, change: SearchFilterChange): TableWindowState {
  const panel =
    change.kind === 'shown'
      ? tableAfterVisibilityChange(window.panel, change.keys, change.isShown)
      : tableAfterFilterChange(window.panel, window.shown, change, lineTableOf(window, () => [], COLUMNS_ONLY_LANGUAGE))
  return panel === null || panel === window.panel ? window : { ...window, panel }
}

// see SV-14, IN-4
/** @purity pure */
export function resourceListWithFilterClosed(window: TableWindowState): TableWindowState | null {
  const panel = tableWithFilterClosed(window.panel, window.shown, lineTableOf(window, () => [], COLUMNS_ONLY_LANGUAGE))
  return panel === null ? null : { ...window, panel }
}

// see RO-9, SV-18, GR-28
/** @purity pure */
export function resourceListWithColumnWidth(window: TableWindowState, column: string, width: number): TableWindowState {
  const panel = tableWithColumnWidth(window.panel, column, width)
  return panel === window.panel ? window : { ...window, panel }
}

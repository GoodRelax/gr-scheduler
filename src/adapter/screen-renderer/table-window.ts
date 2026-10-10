// What the three table windows share: column views, the one open filter, its menu, the Visibility column and the Schedule Filter (T-330, T-346, T-370, T-353).
// @unit      UF-193  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { dayOf, isSearchWordFound, type Schedule } from '../../entity/document-model/schedule/schedule'
import { markerGlyphSvg } from '../svg-renderer/svg-renderer'
import {
  VISIBILITY_TABLES,
  tableViewOf,
  type SearchPanelSession,
  type TableView,
  type TableVisibility,
  type VisibilityTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { HIDE_VALUE, SHOW_VALUE, type ColumnFilter, type ColumnSort, type SearchColumn } from './search-table-filters'
import displayWords from './display-words.json'
import iconRoster from './icon-roster.json'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import type { WindowShown } from './window-box'

export type TableWindowSession = Omit<SearchPanelSession, 'table' | 'textSizeStep'>

// WHY: held by the shell and never saved (FR-134, FR-099 MUST NOT); the text size is the search panel's (S-429).
export interface TableWindowState {
  readonly shown: WindowShown
  readonly panel: TableWindowSession
  readonly isInFront: boolean
}

// WHY: the word is the window's; the column filters, sort and Visibility column are the document's view (FR-151).
export interface TableLook {
  readonly word: string
  readonly view: TableView
}

// WHY: { window: null } is a close; the view is the same reference unless the entry changed it.
export interface WindowStep {
  readonly window: TableWindowState | null
  readonly view: TableView
}

// WHY: the (Unassigned) row has no Resource.uid, so its key is a word no uid can equal.
export const UNASSIGNED_ROW_KEY = 'unassigned'

export type VisibilityKey = number | typeof UNASSIGNED_ROW_KEY

const MINIMIZE_ENTRY: IconId = 'IC-129'
const MAXIMIZE_ENTRY: IconId = 'IC-130'
const RESTORE_ENTRY: IconId = 'IC-131'
const CLOSE_ENTRY: IconId = 'IC-52'
const FILTER_ENTRY: IconId = 'IC-122'
const SORT_ASCENDING_ENTRY: IconId = 'IC-123'
const SORT_DESCENDING_ENTRY: IconId = 'IC-124'
const SHOW_ALL_ENTRY: IconId = 'IC-125'
const HIDE_ALL_ENTRY: IconId = 'IC-126'
const CLEAR_ENTRY: IconId = 'IC-153'
const SCHEDULE_FILTER_ENTRY: IconId = 'IC-143'

const SORT_DIRECTIONS: { readonly [entry: IconId]: ColumnSort['direction'] } = {
  [SORT_ASCENDING_ENTRY]: 'ascending',
  [SORT_DESCENDING_ENTRY]: 'descending',
}

const DATE_SEPARATOR = '/'

// see SQ-3
const DATE_PART_DIGITS: readonly number[] = [4, 2, 2]

const ICON_WORDS = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

const FILTER_SEARCH_HINT = displayWords.searchPanel.find((entry) => entry.part === 'filterSearch')?.text
// WHY: VISIBILITY_TABLES is in the order T-109 lists the surfaces of IC-143 in, the order the band names them (TV-11).
const TABLE_SURFACES: readonly string[] = iconRoster.icons.find((row) => row.rowId === SCHEDULE_FILTER_ENTRY)?.surfaces ?? []

const SURFACE_HEADINGS = new Map(displayWords.surfaces.map((entry) => [entry.name, entry.heading]))
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry.text]))

// see SV-7
const DATE_FROM_WORD = displayWords.searchPanel.find((entry) => entry.part === 'dateFrom')?.text
const DATE_TO_WORD = displayWords.searchPanel.find((entry) => entry.part === 'dateTo')?.text

export type MarkGlyph = Parameters<typeof markerGlyphSvg>[0]

// see FR-133, T-236, T-021, T-315
export const MARK_COLOR_ROWS: readonly string[] = [
  'S-161', 'S-162', 'S-326', 'S-327', 'S-385', 'S-386', 'S-387', 'S-388', 'S-389', 'S-390',
]

/** @purity pure */
export function markColorVariableOf(rowId: string): string {
  return `--gr-mark-${rowId}`
}

// see SQ-5, DT-1, RW-4, FR-133
/** @purity pure */
export function statusGlyphSvg(symbol: MarkGlyph): string {
  return markerGlyphSvg(symbol, (rowId) => `var(${markColorVariableOf(rowId)})`)
}

/** @purity pure */
export function isFilterValueListed(label: string, typed: string): boolean {
  return isSearchWordFound(label, typed)
}

// see SV-7, SV-18
// WHY: width null is the default: T-206's row, or measured by the surface when widthSamples is not null.
export interface SearchColumnView {
  readonly column: SearchColumn
  readonly heading: string
  readonly isFixed: boolean
  readonly filterEntry: CommandItem
  readonly width: number | null
  readonly isFiltered: boolean
  readonly widthSamples: readonly string[] | null
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
      readonly searchHint: string
    }
  | {
      readonly kind: 'dates'
      readonly column: SearchColumn
      readonly from: string | null
      readonly to: string | null
      readonly fromWord: string
      readonly toWord: string
      readonly entries: readonly CommandItem[]
    }

// WHY: each change names its column, so a change the host raised for a filter no longer open is dropped.
export type SearchFilterChange =
  | { readonly kind: 'value'; readonly column: SearchColumn; readonly value: string; readonly isShown: boolean }
  | {
      readonly kind: 'bound'
      readonly column: SearchColumn
      readonly bound: 'since' | 'until'
      readonly day: string | null
    }
  | { readonly kind: 'shown'; readonly column: SearchColumn; readonly keys: readonly VisibilityKey[]; readonly isShown: boolean }
  | { readonly kind: 'fixPick'; readonly column: SearchColumn; readonly key: string; readonly part: 'check' | 'choice' | 'date'; readonly value: string }

export interface ScheduleFilterBarView {
  readonly text: string
  readonly scheduleFilterOffLabel: string
}

export interface EntryRefusal {
  readonly icon: IconId
  readonly reason: string
}

// see SV-6, SV-7, T-331, T-347
export interface WindowTable {
  readonly columns: readonly SearchColumn[]
  readonly fixedCount: number
  readonly headingOf: (column: SearchColumn) => string
  readonly isDateColumn: (column: SearchColumn) => boolean
  readonly valuesOf: (column: SearchColumn) => readonly string[]
  readonly labelOf: (column: SearchColumn, value: string) => string
  readonly widthSamplesOf?: (column: SearchColumn) => readonly string[] | null
}

/** @purity pure */
export function wordOf(held: { readonly [L in DisplayLanguage]: string } | undefined, language: DisplayLanguage): string {
  return held === undefined ? '' : held[language]
}

/** @purity pure */
export function entryOf(icon: IconId, language: DisplayLanguage, isChosen = false, label?: string): CommandItem {
  const word = label ?? wordOf(ICON_WORDS.get(icon)?.label, language)
  return { icon, isEnabled: true, isPressed: false, isArmed: false, isChosen, label: word }
}

/** @purity pure */
export function windowTitleEntriesOf(shown: WindowShown, language: DisplayLanguage): readonly CommandItem[] {
  const maximize = shown === 'maximized' ? RESTORE_ENTRY : MAXIMIZE_ENTRY
  return [entryOf(MINIMIZE_ENTRY, language), entryOf(maximize, language), entryOf(CLOSE_ENTRY, language)]
}

// see WB-2, WB-3, WB-5, IC-52
// WHY: null is a close; undefined is an entry of no title row, which the window leaves to others.
/** @purity pure */
export function windowShownAfterEntry(shown: WindowShown, entry: IconId): WindowShown | null | undefined {
  if (entry === MINIMIZE_ENTRY) return shown === 'minimized' ? 'normal' : 'minimized'
  if (entry === MAXIMIZE_ENTRY) return 'maximized'
  if (entry === RESTORE_ENTRY) return 'normal'
  return entry === CLOSE_ENTRY ? null : undefined
}

/** @purity pure */
function isTableDrawn(shown: WindowShown | null): shown is WindowShown {
  return shown !== null && shown !== 'minimized'
}

/** @purity pure */
export function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return [day.year, day.month, day.day].map((part, at) => String(part).padStart(DATE_PART_DIGITS[at] ?? 0, '0')).join(DATE_SEPARATOR)
}

/** @purity pure */
export function isScheduleFilterAppliedIn(settings: DocumentSettings, table: VisibilityTable): boolean {
  return tableViewOf(settings, table).visibility.isApplied
}

type HeldTableViews = DocumentSettings['tableViews']

// see OP-18, T-372, JF-1
const COLUMNS_OF_TABLE: { readonly [T in VisibilityTable]: ReadonlySet<string> } = {
  searchPanel: new Set(displayWords.searchColumns.map((entry) => entry.rowId)),
  delayDiagnosticsReport: new Set(displayWords.delayReportColumns.map((entry) => entry.rowId)),
  resourceList: new Set(displayWords.resourceListColumns.map((entry) => entry.rowId)),
}

/** @purity pure */
function heldViewOnColumns<V extends HeldTableViews[VisibilityTable]>(held: V, columns: ReadonlySet<string>): V {
  const columnFilters = held.columnFilters.filter((one) => columns.has(one.column))
  const sort = held.sort !== null && !columns.has(held.sort.column) ? null : held.sort
  if (columnFilters.length === held.columnFilters.length && sort === held.sort) return held
  return { ...held, columnFilters, sort }
}

// see OP-18, T-372
// WHY: a column filter or sort on a column its table does not hold is dropped silently, never refused; the same views back when none goes.
/** @purity pure */
export function tableViewsOnTheirColumns(views: HeldTableViews): HeldTableViews {
  const kept = {
    searchPanel: heldViewOnColumns(views.searchPanel, COLUMNS_OF_TABLE.searchPanel),
    delayDiagnosticsReport: heldViewOnColumns(views.delayDiagnosticsReport, COLUMNS_OF_TABLE.delayDiagnosticsReport),
    resourceList: heldViewOnColumns(views.resourceList, COLUMNS_OF_TABLE.resourceList),
  }
  return VISIBILITY_TABLES.every((table) => kept[table] === views[table]) ? views : kept
}

/** @purity pure */
export function tableColumnsOf(
  panel: TableWindowSession,
  view: TableView,
  table: WindowTable,
  language: DisplayLanguage,
): readonly SearchColumnView[] {
  const filtered = new Set(view.columnFilters.filter(isWorkingFilter).map((one) => one.column))
  return table.columns.map((column, at) => ({
    column,
    heading: table.headingOf(column),
    isFixed: at < table.fixedCount,
    filterEntry: entryOf(FILTER_ENTRY, language),
    width: panel.columnWidths[column] ?? null,
    isFiltered: filtered.has(column),
    widthSamples: table.widthSamplesOf?.(column) ?? null,
  }))
}

// WHY: a sort alone is not a filter, so it paints no heading (JDG-1807).
/** @purity pure */
function isWorkingFilter(filter: ColumnFilter): boolean {
  return filter.hiddenValues.length > 0 || filter.fromDate !== null || filter.toDate !== null
}

/** @purity pure */
function hasColumnViews(view: TableView): boolean {
  return view.columnFilters.some(isWorkingFilter) || view.sort !== null
}

// see SV-1, RW-2, IC-153, FR-092
/** @purity pure */
export function clearEntryOf(view: TableView, language: DisplayLanguage): CommandItem {
  return { ...entryOf(CLEAR_ENTRY, language), isEnabled: hasColumnViews(view) }
}

// see SV-1, RW-2, IC-153, UN-20
// WHY: the Visibility column and the Schedule Filter stay; IC-153 clears the column filters and the sort only.
/** @purity pure */
export function tableWithViewsCleared(view: TableView): TableView {
  if (!hasColumnViews(view)) return view
  return { ...view, columnFilters: [], sort: null }
}

/** @purity pure */
export function panelWithFilterShut<P extends TableWindowSession>(panel: P): P {
  return panel.filters.open === null ? panel : { ...panel, filters: { ...panel.filters, open: null } }
}

/** @purity pure */
export function isClearEntry(entry: IconId): boolean {
  return entry === CLEAR_ENTRY
}

// see SV-7, SV-14
/** @purity pure */
export function openFilterIn(panel: TableWindowSession, shown: WindowShown | null, table: WindowTable): SearchColumn | null {
  const open = panel.filters.open
  if (open === null || !isTableDrawn(shown) || !table.columns.includes(open)) return null
  return open
}

/** @purity pure */
function columnFilterOf(view: TableView, column: SearchColumn): ColumnFilter {
  const held = view.columnFilters.find((one) => one.column === column)
  return held ?? { column, hiddenValues: [], fromDate: null, toDate: null }
}

// see SV-7
/** @purity pure */
export function tableFilterMenuOf(
  view: TableView,
  column: SearchColumn,
  table: WindowTable,
  language: DisplayLanguage,
): SearchFilterMenuView {
  const filter = columnFilterOf(view, column)
  const sorts = [entryOf(SORT_ASCENDING_ENTRY, language), entryOf(SORT_DESCENDING_ENTRY, language)]
  if (table.isDateColumn(column)) {
    const words = { fromWord: wordOf(DATE_FROM_WORD, language), toWord: wordOf(DATE_TO_WORD, language) }
    return { kind: 'dates', column, from: filter.fromDate, to: filter.toDate, ...words, entries: sorts }
  }
  const hidden = new Set(filter.hiddenValues)
  const values = table.valuesOf(column).map((value) => ({
    value,
    label: table.labelOf(column, value),
    isShown: !hidden.has(value),
  }))
  const shows = [entryOf(SHOW_ALL_ENTRY, language), entryOf(HIDE_ALL_ENTRY, language)]
  return { kind: 'values', column, values, entries: [...shows, ...sorts], searchHint: wordOf(FILTER_SEARCH_HINT, language) }
}

/** @purity pure */
export function tableWithColumnWidth<P extends TableWindowSession>(panel: P, column: SearchColumn, width: number): P {
  if (panel.columnWidths[column] === width) return panel
  return { ...panel, columnWidths: { ...panel.columnWidths, [column]: width } }
}

// see SV-7
// WHY: a filter that hides nothing and bounds nothing is dropped, so the held filters list only working ones.
/** @purity pure */
function withColumnFilter(view: TableView, filter: ColumnFilter): TableView {
  const others = view.columnFilters.filter((one) => one.column !== filter.column)
  return { ...view, columnFilters: isWorkingFilter(filter) ? [...others, filter] : others }
}

// see SV-7, SV-8, T-109, UN-20
/** @purity pure */
export function tableAfterFilterEntry(
  panel: TableWindowSession,
  view: TableView,
  shown: WindowShown | null,
  entry: IconId,
  table: WindowTable,
  listed?: readonly string[] | null,
): TableView | null {
  const column = openFilterIn(panel, shown, table)
  if (column === null) return null
  const direction = SORT_DIRECTIONS[entry]
  if (direction !== undefined) return { ...view, sort: { column, direction } }
  if (table.isDateColumn(column)) return null
  const filter = columnFilterOf(view, column)
  // see SV-7
  const reached = listed === undefined || listed === null ? null : new Set(listed)
  const untouched = reached === null ? [] : filter.hiddenValues.filter((value) => !reached.has(value))
  if (entry === SHOW_ALL_ENTRY) return withColumnFilter(view, { ...filter, hiddenValues: untouched })
  if (entry !== HIDE_ALL_ENTRY) return null
  return withColumnFilter(view, { ...filter, hiddenValues: [...untouched, ...(reached ?? table.valuesOf(column))] })
}

// see SV-7, IC-122
/** @purity pure */
export function tableWithFilterOpened<P extends TableWindowSession>(
  panel: P,
  shown: WindowShown | null,
  column: SearchColumn,
  table: WindowTable,
): P | null {
  if (!isTableDrawn(shown) || !table.columns.includes(column)) return null
  const open = panel.filters.open === column ? null : column
  return { ...panel, filters: { ...panel.filters, open } }
}

// see SV-7
/** @purity pure */
function boundDayOf(day: string | null): string | null {
  return day === null || dayOf(day) === null ? null : day.trim()
}

// see SV-7, UN-20
/** @purity pure */
export function tableAfterFilterChange(
  panel: TableWindowSession,
  view: TableView,
  shown: WindowShown | null,
  change: SearchFilterChange,
  table: WindowTable,
): TableView | null {
  const column = openFilterIn(panel, shown, table)
  if (change.kind === 'shown' || change.kind === 'fixPick' || column === null || column !== change.column) return null
  const filter = columnFilterOf(view, column)
  if (change.kind === 'bound') {
    if (!table.isDateColumn(column)) return null
    const day = boundDayOf(change.day)
    return withColumnFilter(view, change.bound === 'since' ? { ...filter, fromDate: day } : { ...filter, toDate: day })
  }
  if (table.isDateColumn(column)) return null
  const others = filter.hiddenValues.filter((value) => value !== change.value)
  return withColumnFilter(view, { ...filter, hiddenValues: change.isShown ? others : [...others, change.value] })
}

/** @purity pure */
export function tableWithFilterClosed<P extends TableWindowSession>(panel: P, shown: WindowShown | null, table: WindowTable): P | null {
  if (openFilterIn(panel, shown, table) === null) return null
  return { ...panel, filters: { ...panel.filters, open: null } }
}

/** @purity pure */
export function isRowShown(visibility: TableVisibility, key: VisibilityKey): boolean {
  if (key === UNASSIGNED_ROW_KEY) return !visibility.isUnassignedHidden
  return !visibility.hiddenKeys.includes(key)
}

// WHY: null for a value of another column, so a caller keeps its own label.
/** @purity pure */
export function visibilityLabelOf(value: string, language: DisplayLanguage): string | null {
  if (value === SHOW_VALUE) return wordOf(PANEL_WORDS.get('showValue'), language)
  if (value === HIDE_VALUE) return wordOf(PANEL_WORDS.get('hideValue'), language)
  return null
}

// see TV-2, UN-20
// WHY: the same view back when no row changes, so the shell writes nothing.
/** @purity pure */
export function tableAfterVisibilityChange(view: TableView, keys: readonly VisibilityKey[], isShown: boolean): TableView {
  const held = view.visibility
  const named = new Set(keys.filter((key): key is number => key !== UNASSIGNED_ROW_KEY))
  const kept = held.hiddenKeys.filter((key) => !named.has(key))
  const added = isShown ? [] : [...named].filter((key) => !held.hiddenKeys.includes(key))
  const isUnassignedHidden = keys.includes(UNASSIGNED_ROW_KEY) ? !isShown : held.isUnassignedHidden
  const isSame = kept.length === held.hiddenKeys.length && added.length === 0 && isUnassignedHidden === held.isUnassignedHidden
  if (isSame) return view
  return { ...view, visibility: { ...held, hiddenKeys: [...kept, ...added], isUnassignedHidden } }
}

/** @purity pure */
export function tableWithScheduleFilterToggled(view: TableView): TableView {
  return { ...view, visibility: { ...view.visibility, isApplied: !view.visibility.isApplied } }
}

// see TV-8, UN-20
/** @purity pure */
export function tableWithScheduleFilterOff(view: TableView): TableView {
  return view.visibility.isApplied ? tableWithScheduleFilterToggled(view) : view
}

// WHY: rowKeysOf lists the table's rows, read only while a key is hidden;
// a table that leaves a task out (the report) changes the schedule though no row is Hide.
/** @purity pure */
export function wouldScheduleFilterChange(
  visibility: TableVisibility,
  rowKeysOf: () => ReadonlySet<number>,
  isEveryTaskRowed: boolean,
): boolean {
  if (!isEveryTaskRowed || visibility.isUnassignedHidden) return true
  if (visibility.hiddenKeys.length === 0) return false
  const rowKeys = rowKeysOf()
  return visibility.hiddenKeys.some((key) => rowKeys.has(key))
}

// see TV-5, TV-12, IC-143, EN-8, FR-092
/** @purity pure */
export function scheduleFilterEntryOf(visibility: TableVisibility, wouldChange: boolean, language: DisplayLanguage): CommandItem {
  const isApplied = visibility.isApplied
  const entry = entryOf(SCHEDULE_FILTER_ENTRY, language)
  return { ...entry, isEnabled: isApplied || wouldChange, isPressed: isApplied, isScheduleFilterApplied: isApplied }
}

/** @purity pure */
export function scheduleFilterRefusalsOf(entry: CommandItem, language: DisplayLanguage): readonly EntryRefusal[] {
  if (entry.icon !== SCHEDULE_FILTER_ENTRY || entry.isEnabled) return []
  return [{ icon: SCHEDULE_FILTER_ENTRY, reason: wordOf(PANEL_WORDS.get('nothingHidden'), language) }]
}

/** @purity pure */
export function tableWithScheduleFilterPressed(view: TableView, entry: IconId, wouldChange: () => boolean): TableView | null {
  if (entry !== SCHEDULE_FILTER_ENTRY) return null
  if (!view.visibility.isApplied && !wouldChange()) return null
  return tableWithScheduleFilterToggled(view)
}

/** @purity pure */
function tableNamesOf(tables: readonly VisibilityTable[], language: DisplayLanguage): string {
  const named = VISIBILITY_TABLES.filter((table) => tables.includes(table))
  const separator = wordOf(PANEL_WORDS.get('tableNameSeparator'), language)
  return named.map((table) => wordOf(SURFACE_HEADINGS.get(TABLE_SURFACES[VISIBILITY_TABLES.indexOf(table)] ?? ''), language)).join(separator)
}

// WHY: tables are those whose Schedule Filter is on; drawnCount is the tasks the product draws (TV-1).
/** @purity pure */
export function scheduleFilterBarOf(
  tables: readonly VisibilityTable[],
  schedule: Schedule,
  drawnCount: number,
  language: DisplayLanguage,
): ScheduleFilterBarView | null {
  if (tables.length === 0) return null
  const text = wordOf(PANEL_WORDS.get('scheduleFilterBar'), language)
    .replace('{tables}', tableNamesOf(tables, language))
    .replace('{total}', String(schedule.tasks.length))
    .replace('{shown}', String(drawnCount))
  return { text, scheduleFilterOffLabel: wordOf(PANEL_WORDS.get('scheduleFilterOff'), language) }
}

// WHY: the heading box of the Visibility column: ticked when every listed row is Show, half when some are.
/** @purity pure */
export function visibilityHeadingOf(rows: readonly { readonly shown?: boolean }[]): 'all' | 'some' | 'none' {
  const ticked = rows.filter((row) => row.shown === true).length
  if (ticked === 0) return 'none'
  return ticked === rows.length ? 'all' : 'some'
}

// see RW-9, RO-9, SV-18, GR-28
/** @purity pure */
export function windowWithColumnWidth(window: TableWindowState, column: SearchColumn, width: number): TableWindowState {
  const panel = tableWithColumnWidth(window.panel, column, width)
  return panel === window.panel ? window : { ...window, panel }
}

/** @purity pure */
export function windowColumnsViewOf(
  window: TableWindowState,
  view: TableView,
  table: WindowTable,
  language: DisplayLanguage,
): { readonly columns: readonly SearchColumnView[]; readonly filterMenu: SearchFilterMenuView | null } {
  const open = openFilterIn(window.panel, window.shown, table)
  return {
    columns: tableColumnsOf(window.panel, view, table, language),
    filterMenu: open === null ? null : tableFilterMenuOf(view, open, table, language),
  }
}

// see T-346, T-370, SV-7, SV-8, WB-2, WB-3, IC-153, IC-143, TV-8
// WHY: null is an entry the window does not answer; a menu lists the values of the table with no column filter.
/** @purity pure */
export function windowAfterEntry(
  window: TableWindowState,
  view: TableView,
  entry: IconId,
  filterColumn: string | null,
  answers: { readonly wouldChange: () => boolean; readonly tableOf: (unfiltered: TableView) => WindowTable },
  listed?: readonly string[] | null,
): WindowStep | null {
  const shown = windowShownAfterEntry(window.shown, entry)
  if (shown === null) return { window: null, view: tableWithScheduleFilterOff(view) }
  if (shown !== undefined) return { window: { ...window, shown }, view }
  if (isClearEntry(entry)) return { window: { ...window, panel: panelWithFilterShut(window.panel) }, view: tableWithViewsCleared(view) }
  const filtered = tableWithScheduleFilterPressed(view, entry, answers.wouldChange)
  if (filtered !== null) return { window, view: filtered }
  return windowAfterFilterEntry(window, view, entry, filterColumn, answers.tableOf, listed)
}

/** @purity pure */
function windowAfterFilterEntry(
  window: TableWindowState,
  view: TableView,
  entry: IconId,
  filterColumn: string | null,
  tableOf: (unfiltered: TableView) => WindowTable,
  listed?: readonly string[] | null,
): WindowStep | null {
  const table = tableOf({ ...view, columnFilters: [] })
  if (entry !== FILTER_ENTRY) {
    const after = tableAfterFilterEntry(window.panel, view, window.shown, entry, table, listed)
    return after === null ? null : { window, view: after }
  }
  const panel = filterColumn === null ? null : tableWithFilterOpened(window.panel, window.shown, filterColumn, table)
  return panel === null ? null : { window: { ...window, panel }, view }
}

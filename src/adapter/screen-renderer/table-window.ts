// What the three table windows share: column views, the one open filter, its menu, the Visibility column and the Schedule Filter (T-330, T-346, T-370, T-353).
// @unit      UF-193  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { dayOf, isSearchWordFound, type Schedule } from '../../entity/document-model/schedule/schedule'
import { markerGlyphSvg } from '../svg-renderer/svg-renderer'
import type {
  SearchPanelSession,
  TableVisibility,
  VisibilityTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { HIDE_VALUE, SHOW_VALUE, type SearchColumn, type SearchColumnFilter, type SearchSort } from './search-table-filters'
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

// WHY: the (Unassigned) row has no Resource.uid, so its key is a word no uid can equal.
export const UNASSIGNED_ROW_KEY = 'unassigned'

export type VisibilityKey = number | typeof UNASSIGNED_ROW_KEY

const MINIMISE_ENTRY: IconId = 'IC-129'
const MAXIMISE_ENTRY: IconId = 'IC-130'
const RESTORE_ENTRY: IconId = 'IC-131'
const CLOSE_ENTRY: IconId = 'IC-52'
const FILTER_ENTRY: IconId = 'IC-122'
const SORT_ASCENDING_ENTRY: IconId = 'IC-123'
const SORT_DESCENDING_ENTRY: IconId = 'IC-124'
const SHOW_ALL_ENTRY: IconId = 'IC-125'
const HIDE_ALL_ENTRY: IconId = 'IC-126'
const CLEAR_ENTRY: IconId = 'IC-153'
const SCHEDULE_FILTER_ENTRY: IconId = 'IC-143'

const SORT_DIRECTIONS: { readonly [entry: IconId]: SearchSort['direction'] } = {
  [SORT_ASCENDING_ENTRY]: 'ascending',
  [SORT_DESCENDING_ENTRY]: 'descending',
}

const DATE_SEPARATOR = '/'

// see SQ-3
const DATE_PART_DIGITS: readonly number[] = [4, 2, 2]

const ICON_WORDS = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

const FILTER_SEARCH_HINT = displayWords.searchPanel.find((entry) => entry.part === 'filterSearch')?.text
// WHY: the band names the tables in this order (TV-11), which is the order T-109 lists the surfaces of IC-143 in.
const VISIBILITY_TABLES: readonly VisibilityTable[] = ['searchPanel', 'delayDiagnosticsReport', 'resourceList']
const TABLE_SURFACES: readonly string[] = iconRoster.icons.find((row) => row.rowId === SCHEDULE_FILTER_ENTRY)?.surfaces ?? []

const SURFACE_HEADINGS = new Map(displayWords.surfaces.map((entry) => [entry.name, entry.heading]))
const PANEL_WORDS = new Map(displayWords.searchPanel.map((entry) => [entry.part, entry.text]))

// see SV-7
const DATE_FROM_WORD = displayWords.searchPanel.find((entry) => entry.part === 'dateFrom')?.text
const DATE_TO_WORD = displayWords.searchPanel.find((entry) => entry.part === 'dateTo')?.text

export type MarkGlyph = Parameters<typeof markerGlyphSvg>[0]

// see FR-133, T-236, T-021, T-315
export const MARK_COLOUR_ROWS: readonly string[] = [
  'S-161', 'S-162', 'S-326', 'S-327', 'S-385', 'S-386', 'S-387', 'S-388', 'S-389', 'S-390',
]

/** @purity pure */
export function markColourVariableOf(rowId: string): string {
  return `--gr-mark-${rowId}`
}

// see SQ-5, DT-1, RW-4, FR-133
/** @purity pure */
export function statusGlyphSvg(symbol: MarkGlyph): string {
  return markerGlyphSvg(symbol, (rowId) => `var(${markColourVariableOf(rowId)})`)
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
  const maximise = shown === 'maximised' ? RESTORE_ENTRY : MAXIMISE_ENTRY
  return [entryOf(MINIMISE_ENTRY, language), entryOf(maximise, language), entryOf(CLOSE_ENTRY, language)]
}

// see WB-2, WB-3, WB-5, IC-52
// WHY: null is a close; undefined is an entry of no title row, which the window leaves to others.
/** @purity pure */
export function windowShownAfterEntry(shown: WindowShown, entry: IconId): WindowShown | null | undefined {
  if (entry === MINIMISE_ENTRY) return shown === 'minimised' ? 'normal' : 'minimised'
  if (entry === MAXIMISE_ENTRY) return 'maximised'
  if (entry === RESTORE_ENTRY) return 'normal'
  return entry === CLOSE_ENTRY ? null : undefined
}

/** @purity pure */
function isTableDrawn(shown: WindowShown | null): shown is WindowShown {
  return shown !== null && shown !== 'minimised'
}

/** @purity pure */
export function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return [day.year, day.month, day.day].map((part, at) => String(part).padStart(DATE_PART_DIGITS[at] ?? 0, '0')).join(DATE_SEPARATOR)
}

/** @purity pure */
export function tableColumnsOf(panel: TableWindowSession, table: WindowTable, language: DisplayLanguage): readonly SearchColumnView[] {
  const filtered = new Set(panel.filters.columns.filter(isWorkingFilter).map((one) => one.column))
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
function isWorkingFilter(filter: SearchColumnFilter): boolean {
  return filter.hiddenValues.length > 0 || filter.from !== null || filter.to !== null
}

/** @purity pure */
function hasTableViews(panel: TableWindowSession): boolean {
  return panel.filters.columns.some(isWorkingFilter) || panel.sort !== null
}

// see SV-1, RW-2, IC-153, FR-092
/** @purity pure */
export function clearEntryOf(panel: TableWindowSession, language: DisplayLanguage): CommandItem {
  return { ...entryOf(CLEAR_ENTRY, language), isEnabled: hasTableViews(panel) }
}

// see SV-1, RW-2, IC-153
/** @purity pure */
export function tableWithViewsCleared<P extends TableWindowSession>(panel: P): P {
  if (!hasTableViews(panel)) return panel
  return { ...panel, filters: { columns: [], open: null }, sort: null }
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
function columnFilterOf(panel: TableWindowSession, column: SearchColumn): SearchColumnFilter {
  const held = panel.filters.columns.find((one) => one.column === column)
  return held ?? { column, hiddenValues: [], from: null, to: null }
}

// see SV-7
/** @purity pure */
export function tableFilterMenuOf(
  panel: TableWindowSession,
  column: SearchColumn,
  table: WindowTable,
  language: DisplayLanguage,
): SearchFilterMenuView {
  const filter = columnFilterOf(panel, column)
  const sorts = [entryOf(SORT_ASCENDING_ENTRY, language), entryOf(SORT_DESCENDING_ENTRY, language)]
  if (table.isDateColumn(column)) {
    const words = { fromWord: wordOf(DATE_FROM_WORD, language), toWord: wordOf(DATE_TO_WORD, language) }
    return { kind: 'dates', column, from: filter.from, to: filter.to, ...words, entries: sorts }
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
function withColumnFilter<P extends TableWindowSession>(panel: P, filter: SearchColumnFilter): P {
  const others = panel.filters.columns.filter((one) => one.column !== filter.column)
  return { ...panel, filters: { ...panel.filters, columns: isWorkingFilter(filter) ? [...others, filter] : others } }
}

// see SV-7, SV-8, T-109
/** @purity pure */
export function tableAfterFilterEntry<P extends TableWindowSession>(
  panel: P,
  shown: WindowShown | null,
  entry: IconId,
  table: WindowTable,
  listed?: readonly string[] | null,
): P | null {
  const column = openFilterIn(panel, shown, table)
  if (column === null) return null
  const direction = SORT_DIRECTIONS[entry]
  if (direction !== undefined) return { ...panel, sort: { column, direction } }
  if (table.isDateColumn(column)) return null
  const filter = columnFilterOf(panel, column)
  // see SV-7
  const reached = listed === undefined || listed === null ? null : new Set(listed)
  const untouched = reached === null ? [] : filter.hiddenValues.filter((value) => !reached.has(value))
  if (entry === SHOW_ALL_ENTRY) return withColumnFilter(panel, { ...filter, hiddenValues: untouched })
  if (entry !== HIDE_ALL_ENTRY) return null
  return withColumnFilter(panel, { ...filter, hiddenValues: [...untouched, ...(reached ?? table.valuesOf(column))] })
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

// see SV-7
/** @purity pure */
export function tableAfterFilterChange<P extends TableWindowSession>(
  panel: P,
  shown: WindowShown | null,
  change: SearchFilterChange,
  table: WindowTable,
): P | null {
  const column = openFilterIn(panel, shown, table)
  if (change.kind === 'shown' || column === null || column !== change.column) return null
  const filter = columnFilterOf(panel, column)
  if (change.kind === 'bound') {
    if (!table.isDateColumn(column)) return null
    const day = boundDayOf(change.day)
    return withColumnFilter(panel, change.bound === 'since' ? { ...filter, from: day } : { ...filter, to: day })
  }
  if (table.isDateColumn(column)) return null
  const others = filter.hiddenValues.filter((value) => value !== change.value)
  return withColumnFilter(panel, { ...filter, hiddenValues: change.isShown ? others : [...others, change.value] })
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

// WHY: the same panel back when no row changes, so the shell's identity test sees no change.
/** @purity pure */
export function tableAfterVisibilityChange<P extends TableWindowSession>(panel: P, keys: readonly VisibilityKey[], isShown: boolean): P {
  const held = panel.visibility
  const named = new Set(keys.filter((key): key is number => key !== UNASSIGNED_ROW_KEY))
  const kept = held.hiddenKeys.filter((key) => !named.has(key))
  const added = isShown ? [] : [...named].filter((key) => !held.hiddenKeys.includes(key))
  const isUnassignedHidden = keys.includes(UNASSIGNED_ROW_KEY) ? !isShown : held.isUnassignedHidden
  const isSame = kept.length === held.hiddenKeys.length && added.length === 0 && isUnassignedHidden === held.isUnassignedHidden
  if (isSame) return panel
  return { ...panel, visibility: { ...held, hiddenKeys: [...kept, ...added], isUnassignedHidden } }
}

/** @purity pure */
export function tableWithScheduleFilterToggled<P extends TableWindowSession>(panel: P): P {
  return { ...panel, visibility: { ...panel.visibility, isApplied: !panel.visibility.isApplied } }
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
export function tableWithScheduleFilterPressed<P extends TableWindowSession>(panel: P, entry: IconId, wouldChange: () => boolean): P | null {
  if (entry !== SCHEDULE_FILTER_ENTRY) return null
  if (!panel.visibility.isApplied && !wouldChange()) return null
  return tableWithScheduleFilterToggled(panel)
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
  table: WindowTable,
  language: DisplayLanguage,
): { readonly columns: readonly SearchColumnView[]; readonly filterMenu: SearchFilterMenuView | null } {
  const open = openFilterIn(window.panel, window.shown, table)
  return {
    columns: tableColumnsOf(window.panel, table, language),
    filterMenu: open === null ? null : tableFilterMenuOf(window.panel, open, table, language),
  }
}

// see T-346, T-370, SV-7, SV-8, WB-2, WB-3, IC-153, IC-143
// WHY: { window: null } is a close and null an entry the window does not answer; a menu lists the values of the table with no column filter.
/** @purity pure */
export function windowAfterEntry(
  window: TableWindowState,
  entry: IconId,
  filterColumn: string | null,
  answers: { readonly wouldChange: () => boolean; readonly tableOf: (unfiltered: TableWindowState) => WindowTable },
  listed?: readonly string[] | null,
): { readonly window: TableWindowState | null } | null {
  const shown = windowShownAfterEntry(window.shown, entry)
  if (shown === null) return { window: null }
  if (shown !== undefined) return { window: { ...window, shown } }
  if (isClearEntry(entry)) return { window: { ...window, panel: tableWithViewsCleared(window.panel) } }
  const panel = tableWithScheduleFilterPressed(window.panel, entry, answers.wouldChange) ?? panelAfterFilterEntry(window, entry, filterColumn, answers.tableOf, listed)
  return panel === null ? null : { window: { ...window, panel } }
}

/** @purity pure */
function panelAfterFilterEntry(
  window: TableWindowState,
  entry: IconId,
  filterColumn: string | null,
  tableOf: (unfiltered: TableWindowState) => WindowTable,
  listed?: readonly string[] | null,
): TableWindowSession | null {
  const table = tableOf({ ...window, panel: { ...window.panel, filters: { ...window.panel.filters, columns: [] } } })
  if (entry !== FILTER_ENTRY) return tableAfterFilterEntry(window.panel, window.shown, entry, table, listed)
  return filterColumn === null ? null : tableWithFilterOpened(window.panel, window.shown, filterColumn, table)
}

// What the two table windows share: column views, the one open filter, its menu and the changes to it (T-330, T-346).
// @unit      UF-193  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { SearchPanelSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type { SearchColumn, SearchColumnFilter, SearchSort } from './search-table-filters'
import displayWords from './display-words.json'
import type { CommandItem, DisplayLanguage, IconId } from './screen-renderer'
import type { WindowShown } from './window-box'

export type TableWindowSession = Omit<SearchPanelSession, 'table' | 'textSizeStep'>

const MINIMISE_ENTRY: IconId = 'IC-129'
const MAXIMISE_ENTRY: IconId = 'IC-130'
const RESTORE_ENTRY: IconId = 'IC-131'
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

// see SQ-3
const DATE_PART_DIGITS: readonly number[] = [4, 2, 2]

const ICON_WORDS = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

// see SV-18
// WHY: null is the column's default row of table T-206, which only the surface reads (generated there).
export interface SearchColumnView {
  readonly column: SearchColumn
  readonly heading: string
  readonly isFixed: boolean
  readonly filterEntry: CommandItem
  readonly width: number | null
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

// WHY: each change names its column, so a change the host raised for a filter no longer open is dropped.
export type SearchFilterChange =
  | { readonly kind: 'value'; readonly column: SearchColumn; readonly value: string; readonly isShown: boolean }
  | {
      readonly kind: 'bound'
      readonly column: SearchColumn
      readonly bound: 'since' | 'until'
      readonly day: string | null
    }

// see SV-6, SV-7, T-331, T-347
export interface WindowTable {
  readonly columns: readonly SearchColumn[]
  readonly fixedCount: number
  readonly headingOf: (column: SearchColumn) => string
  readonly isDateColumn: (column: SearchColumn) => boolean
  readonly valuesOf: (column: SearchColumn) => readonly string[]
  readonly labelOf: (column: SearchColumn, value: string) => string
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
  return table.columns.map((column, at) => ({
    column,
    heading: table.headingOf(column),
    isFixed: at < table.fixedCount,
    filterEntry: entryOf(FILTER_ENTRY, language),
    width: panel.columnWidths[column] ?? null,
  }))
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
  if (table.isDateColumn(column)) return { kind: 'dates', column, from: filter.from, to: filter.to, entries: sorts }
  const hidden = new Set(filter.hiddenValues)
  const values = table.valuesOf(column).map((value) => ({
    value,
    label: table.labelOf(column, value),
    isShown: !hidden.has(value),
  }))
  const shows = [entryOf(SHOW_ALL_ENTRY, language), entryOf(HIDE_ALL_ENTRY, language)]
  return { kind: 'values', column, values, entries: [...shows, ...sorts] }
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
  const isWorking = filter.hiddenValues.length > 0 || filter.from !== null || filter.to !== null
  return { ...panel, filters: { ...panel.filters, columns: isWorking ? [...others, filter] : others } }
}

// see SV-7, SV-8, T-109
/** @purity pure */
export function tableAfterFilterEntry<P extends TableWindowSession>(
  panel: P,
  shown: WindowShown | null,
  entry: IconId,
  table: WindowTable,
): P | null {
  const column = openFilterIn(panel, shown, table)
  if (column === null) return null
  const direction = SORT_DIRECTIONS[entry]
  if (direction !== undefined) return { ...panel, sort: { column, direction } }
  if (table.isDateColumn(column)) return null
  const filter = columnFilterOf(panel, column)
  if (entry === SHOW_ALL_ENTRY) return withColumnFilter(panel, { ...filter, hiddenValues: [] })
  if (entry !== HIDE_ALL_ENTRY) return null
  return withColumnFilter(panel, { ...filter, hiddenValues: table.valuesOf(column) })
}

// see SV-7, IC-122
// WHY: opening another column's filter replaces the open one: SV-7 opens one filter at a time.
/** @purity pure */
export function tableWithFilterOpened<P extends TableWindowSession>(
  panel: P,
  shown: WindowShown | null,
  column: SearchColumn,
  table: WindowTable,
): P | null {
  if (!isTableDrawn(shown) || !table.columns.includes(column)) return null
  return panel.filters.open === column ? panel : { ...panel, filters: { ...panel.filters, open: column } }
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
  if (column === null || column !== change.column) return null
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

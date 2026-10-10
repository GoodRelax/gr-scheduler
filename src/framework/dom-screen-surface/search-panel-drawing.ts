// DomScreenSurface -- the two table windows (Search Panel, Delay Diagnostics Report): title row, word field and table.
// @unit      UF-182  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import {
  isFilterValueListed,
  statusGlyphSvg,
  windowBoxOf,
  windowNormalBoxOf,
  type CommandItem,
  type ScreenPart,
  type SearchFilterChange,
  type SearchPanelView,
  type WindowName,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_SEARCH_PANEL_FONT_SIZES,
  NOT_STORED_SEARCH_PANEL_SIZES,
  PAINT,
  SEARCH_COLUMN_WIDTH_ROWS,
  anchoredEntry,
  boxStyle,
  commandEntry,
  entranceOuterHeightPx,
  entranceOuterWidthPx,
  made,
  part,
} from './dom-screen-surface'
import {
  windowPartAt,
  windowPartOf,
  windowTitleRowElement,
  type PlacedWindow,
  type PointAsked,
} from './window-frame-drawing'

type SearchColumnView = SearchPanelView['columns'][number]

type SearchRowView = SearchPanelView['rows'][number]

type SearchFilterMenuView = NonNullable<SearchPanelView['filterMenu']>

type SearchFilterValueView = Extract<SearchFilterMenuView, { kind: 'values' }>['values'][number]

// see T-330, T-346, RW-3, RW-4
export type TableWindowView = Omit<SearchPanelView, 'table'> & {
  readonly toolEntries?: readonly CommandItem[]
  readonly summary?: readonly { readonly text: string; readonly glyph?: SearchRowView['glyph'] }[]
}

// see T-337, RW-5
export interface TableWindowIdentity {
  readonly window: WindowName
  readonly role: string
}

// see SV-6, SV-17, SV-18, RW-9, SQ-5, DT-1
export type DrawnTable = Pick<
  SearchPanelView,
  'columns' | 'rows' | 'jumpAt' | 'glyphAt' | 'showAt' | 'showHeading'
>

const SEARCH_PANEL_ROLE = 'Search Panel'

const SEARCH_PANEL_IDENTITY: TableWindowIdentity = { window: 'searchPanel', role: SEARCH_PANEL_ROLE }

const TOOL_LINE_STYLE = 'display:flex;align-items:center;flex:none;'

const SUMMARY_LINE_STYLE = 'flex:none;display:flex;flex-wrap:wrap;column-gap:1.5em;padding:0.25em 0.5em;'

const SUMMARY_ITEM_STYLE = 'white-space:nowrap;'

export const SEARCH_WORD_FIELD_ATTRIBUTE = 'data-search-word'

// see SV-2, IF-9
export const SEARCH_WORD_ROW = 'SV-2'

const FIELD_ROW_ATTRIBUTE = 'data-field-row'

// see SV-7, IN-5a
export const SEARCH_FILTER_ROW = 'SV-7'

export const SEARCH_FILTER_COLUMN_ATTRIBUTE = 'data-search-filter-column'

export const SEARCH_FILTER_VALUE_ATTRIBUTE = 'data-search-filter-value'

export const SEARCH_FILTER_BOUND_ATTRIBUTE = 'data-search-filter-bound'

export const SEARCH_FILTER_SEARCH_ATTRIBUTE = 'data-search-filter-search'

const FILTER_LABEL_ATTRIBUTE = 'data-search-filter-label'

const FILTER_LIST_ATTRIBUTE = 'data-search-filter-list'

export const SEARCH_JUMP_TASK_ATTRIBUTE = 'data-search-task'

export const SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE = 'data-search-comment-box'

const ENTRY_ICON_ATTRIBUTE = 'data-icon'

const COLUMN_ATTRIBUTE = 'data-column'

const FILTER_MENU_ATTRIBUTE = 'data-search-filter-menu'

const SHOWN_TASK_ATTRIBUTE = 'data-search-shown-task'

const SHOWN_ALL_ATTRIBUTE = 'data-search-shown-all'

const VISIBILITY_COLUMN = 'SQ-10'

const NO_BORDER_ATTRIBUTE = 'data-no-border'

const FILTER_ENTRY = 'IC-122'

const LISTED_ENTRIES: readonly string[] = ['IC-125', 'IC-126']

// TRAP: PAINT is read at a call, never at load; dom-screen-surface.ts imports this file, so it is not set yet then.
/** @purity pure */
export function windowStyle(): string {
  return (
    'box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;' +
    `background:${PAINT.ground};color:${PAINT.ink};box-shadow:0 0.5em 1.5em ${PAINT.shadow};`
  )
}

const WORD_FIELD_STYLE = 'flex:none;box-sizing:border-box;width:100%;'

const TABLE_BOX_STYLE = 'flex:1;overflow:auto;'

const TABLE_STYLE = 'border-collapse:collapse;table-layout:fixed;'

const HEADING_WORD_STYLE = 'flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;'

const HEADING_LINE_STYLE = 'display:flex;align-items:center;'

// see SV-7
/** @purity pure */
function filterMenuStyle(): string {
  return (
    'position:absolute;z-index:4;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;' +
    `background:${PAINT.ground};border:1px solid ${PAINT.rule};box-shadow:0 0.25em 0.75em ${PAINT.shadow};`
  )
}

const FILTER_LINE_STYLE = 'display:flex;align-items:center;white-space:nowrap;'

const FILTER_CONTROLS_STYLE = 'flex:none;display:flex;flex-direction:column;'

const FILTER_LIST_STYLE = 'flex:1 1 auto;min-height:0;overflow:auto;'

const FILTER_SEARCH_STYLE = 'box-sizing:border-box;width:100%;'

const FILTER_BOUND_WORD_STYLE = 'margin-right:0.25em;'

const GLYPH_STYLE = 'display:inline-block;width:1em;height:1em;vertical-align:-0.125em;margin-right:0.25em;'

// see SV-17, S-425
const CELL_PADDING_EM = 0.25

const CELL_RULE_PX = 1

/** @purity pure */
function cellStyle(): string {
  return `border:${CELL_RULE_PX}px solid ${PAINT.rule};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 ${CELL_PADDING_EM}em;`
}

// see SV-6
// WHY: front to back; unstacked sticky cells paint in tree order, so a fixed body cell would cover the header.
const TABLE_CELL_STACK = ['fixedHeaderCell', 'headerCell', 'fixedBodyCell'] as const

/** @purity pure */
function stackStyle(cell: (typeof TABLE_CELL_STACK)[number]): string {
  return `z-index:${TABLE_CELL_STACK.length - TABLE_CELL_STACK.indexOf(cell)};`
}

// TRAP: left:0 until pinFixedColumns measures the drawn columns; a guessed width is no row's value (S-425).
/** @purity pure */
function fixedColumnStyle(): string {
  return `position:sticky;left:0;background:${PAINT.ground};`
}

/** @purity pure */
function headerCellStyle(isFixed: boolean): string {
  const fixed = isFixed ? fixedColumnStyle() : ''
  const stack = stackStyle(isFixed ? 'fixedHeaderCell' : 'headerCell')
  return `${cellStyle()}${fixed}font-weight:normal;position:sticky;top:0;background:${PAINT.panel};${stack}`
}

const FIXED_COLUMN_ATTRIBUTE = 'data-fixed-column'

const FILTERED_ATTRIBUTE = 'data-filtered-column'

// see SQ-1, DT-4, SJ-1, S-503
/** @purity pure */
function jumpCellStyle(): string {
  return `cursor:pointer;color:${PAINT.link};text-decoration:underline;`
}

type SearchJumpCell = NonNullable<ScreenPart['searchJumpTarget']>

// see SV-18, RW-9, S-425
export interface ColumnSizing {
  readonly floor: number
  readonly measured: ReadonlyMap<string, number>
}

// see S-425, SV-18, IC-122
/** @purity pure */
export function measuredWidthFloor(fontPx: number): number {
  return Math.ceil(entranceOuterWidthPx() + CELL_PADDING_EM * 2 * fontPx + CELL_RULE_PX)
}

/** @purity pure */
export function unmeasuredSizing(fontPx: number): ColumnSizing {
  return { floor: measuredWidthFloor(fontPx), measured: new Map() }
}

/** @purity pure */
function tableRowWidthPx(column: SearchColumnView): number {
  const row = SEARCH_COLUMN_WIDTH_ROWS[column.column]
  if (row === undefined) throw new RangeError(`table T-206 holds no default width for column ${column.column}`)
  return NOT_STORED_SEARCH_PANEL_SIZES[row]
}

// see SV-18, RW-9, S-425, S-496
// WHY: the Visibility column keeps its fixed S-496 and has no border to pull, so the floor is not laid on it.
/** @purity pure */
export function columnWidthPx(column: SearchColumnView, sizing: ColumnSizing): number {
  if (column.column === VISIBILITY_COLUMN) return column.width ?? tableRowWidthPx(column)
  const byDefault = column.widthSamples === null ? tableRowWidthPx(column) : (sizing.measured.get(column.column) ?? sizing.floor)
  return Math.max(column.width ?? byDefault, sizing.floor)
}

const MEASURE_BOX_STYLE = 'position:fixed;left:0;top:0;width:max-content;visibility:hidden;pointer-events:none;'

const MEASURE_TABLE_STYLE = 'border-collapse:collapse;table-layout:auto;'

// see SV-18, RW-9, SV-17
/** @purity non-pure */
function measureTableElement(host: Document, column: SearchColumnView, hasGlyph: boolean, fontPx: number): HTMLElement {
  const table = made(host, 'table', MEASURE_TABLE_STYLE + `font-size:${fontPx}px;`)
  const head = made(host, 'tr', '')
  head.replaceChildren(headerCellElement(host, column, null, unmeasuredSizing(fontPx)))
  const lines = (column.widthSamples ?? []).map((text) => {
    const line = made(host, 'tr', '')
    const cell = made(host, 'td', cellStyle())
    if (hasGlyph) cell.replaceChildren(glyphElement(host, null), text)
    else cell.textContent = text
    line.append(cell)
    return line
  })
  table.replaceChildren(head, ...lines)
  return table
}

// see SV-18, RW-9
// TRAP: a host with no layout reads 0; such a width is dropped, and the column falls back to the floor.
/** @purity non-pure */
export function measureDefaultColumnWidths(host: Document, layer: Element, table: DrawnTable, fontPx: number): ReadonlyMap<string, number> {
  const measured = table.columns.flatMap((column, at) => (column.widthSamples === null ? [] : [{ column, at }]))
  if (measured.length === 0) return new Map()
  const box = made(host, 'div', MEASURE_BOX_STYLE)
  const sheets = measured.map(({ column, at }) => measureTableElement(host, column, at === table.glyphAt, fontPx))
  box.replaceChildren(...sheets)
  layer.append(box)
  const widths = measured.flatMap(({ column }, at) => {
    const heading = sheets[at]?.querySelector('th') ?? null
    const width = heading === null || typeof heading.getBoundingClientRect !== 'function' ? 0 : heading.getBoundingClientRect().width
    return width > 0 ? [[column.column, Math.ceil(width)] as const] : []
  })
  box.remove()
  return new Map(widths)
}

// see SQ-5, DT-1, RW-4, FR-133
// TRAP: innerHTML only for statusGlyphSvg's markup, which carries numbers and row ids, never a document's text.
/** @purity non-pure */
function glyphElement(host: Document, glyph: SearchRowView['glyph']): HTMLElement {
  const box = made(host, 'span', GLYPH_STYLE)
  box.setAttribute('aria-hidden', 'true')
  if (glyph !== null) box.innerHTML = statusGlyphSvg(glyph)
  return box
}

type SizeRatio = { readonly width: number; readonly height: number }

// see SV-9, SV-12, SV-13
/** @purity pure */
export function searchPanelBoxOf(view: TableWindowView, defaultRatio: SizeRatio): ScreenRect {
  return windowBoxOf(view.shown, searchPanelPlaceOf(view, defaultRatio), view.canvas, entranceOuterHeightPx())
}

/** @purity pure */
function searchPanelPlaceOf(view: TableWindowView, defaultRatio: SizeRatio): ScreenRect {
  const canvas = view.canvas
  const size = { width: canvas.width * defaultRatio.width, height: canvas.height * defaultRatio.height }
  const defaultBox = { x: canvas.x, y: canvas.y + canvas.height - size.height, ...size }
  return windowNormalBoxOf(view, defaultBox, canvas)
}

// see SJ-1
/** @purity semi-pure-b */
function searchJumpFrom(start: Element, layer: Element): SearchJumpCell | null {
  for (let node: Element | null = start; node !== null && node !== layer; node = node.parentElement) {
    const task = node.getAttribute(SEARCH_JUMP_TASK_ATTRIBUTE)
    if (task !== null) return { kind: 'task', taskUid: Number(task) }
    const box = node.getAttribute(SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE)
    if (box !== null) return { kind: 'commentBox', commentBoxId: box }
  }
  return null
}

// see SV-16, T-333
// TRAP: a step is a key's place in sizes; sizes not written in table T-333's order pick the wrong size.
/** @purity pure */
export function searchPanelFontPxOf(textSizeStep: number, sizes: { readonly [row: string]: number }): number {
  const fontPx = Object.values(sizes)[textSizeStep]
  if (fontPx === undefined) throw new RangeError(`table T-333 holds no step ${textSizeStep}`)
  return fontPx
}

// see SV-2, SV-16
/** @purity non-pure */
export function wordFieldElement(host: Document, word: string, fontPx: number): HTMLElement {
  const field = made(host, 'input', WORD_FIELD_STYLE + `font-size:${fontPx}px;`) as HTMLInputElement
  field.setAttribute('type', 'search')
  field.setAttribute(SEARCH_WORD_FIELD_ATTRIBUTE, 'true')
  field.setAttribute(FIELD_ROW_ATTRIBUTE, SEARCH_WORD_ROW)
  field.value = word
  return field
}

// see SV-7, S-183, S-146
/** @purity pure */
function filteredHeadingStyle(): string {
  return `background:${PAINT.filteredHeading};color:${PAINT.ground};`
}

/** @purity pure */
function filteredEntryStyle(): string {
  return `background:transparent;color:${PAINT.ground};border-color:${PAINT.ground};`
}

// see SV-7, SV-18
/** @purity non-pure */
function headerCellElement(
  host: Document,
  column: SearchColumnView,
  showHeading: SearchPanelView['showHeading'] | null,
  sizing: ColumnSizing,
): HTMLElement {
  const cell = made(host, 'th', headerCellStyle(column.isFixed) + (column.isFiltered ? filteredHeadingStyle() : ''))
  cell.setAttribute(COLUMN_ATTRIBUTE, column.column)
  cell.setAttribute('data-width', String(columnWidthPx(column, sizing)))
  if (column.isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
  if (column.isFiltered) cell.setAttribute(FILTERED_ATTRIBUTE, 'true')
  const line = made(host, 'div', HEADING_LINE_STYLE)
  const filter = commandEntry(host, column.filterEntry)
  if (column.isFiltered) filter.setAttribute('style', (filter.getAttribute('style') ?? '') + filteredEntryStyle())
  filter.setAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE, column.column)
  if (showHeading !== null) {
    cell.setAttribute(NO_BORDER_ATTRIBUTE, 'true')
    cell.setAttribute('title', column.heading)
    line.replaceChildren(shownBoxElement(host, showHeading), filter)
    cell.replaceChildren(line)
    return cell
  }
  const heading = made(host, 'span', HEADING_WORD_STYLE)
  heading.textContent = column.heading
  line.replaceChildren(heading, filter)
  cell.replaceChildren(line)
  return cell
}

// see SQ-10
// WHY: the heading's box shows all / some / none of the listed rows; some is the host's indeterminate mark.
/** @purity non-pure */
function shownBoxElement(host: Document, showHeading: SearchPanelView['showHeading'] | undefined): HTMLInputElement {
  const box = made(host, 'input', 'margin:0;flex:none;') as HTMLInputElement
  box.setAttribute('type', 'checkbox')
  box.setAttribute(SHOWN_ALL_ATTRIBUTE, 'true')
  box.checked = showHeading === 'all'
  box.indeterminate = showHeading === 'some'
  return box
}

// see SQ-10
/** @purity non-pure */
function shownTaskBox(host: Document, taskUid: number, isShown: boolean): HTMLInputElement {
  const box = made(host, 'input', 'margin:0;') as HTMLInputElement
  box.setAttribute('type', 'checkbox')
  box.setAttribute(SHOWN_TASK_ATTRIBUTE, String(taskUid))
  box.checked = isShown
  if (isShown) box.setAttribute('checked', '')
  return box
}

/** @purity non-pure */
function filterControl(host: Document, type: string, fontPx: number): HTMLInputElement {
  const control = made(host, 'input', `font-size:${fontPx}px;`) as HTMLInputElement
  control.setAttribute('type', type)
  control.setAttribute(FIELD_ROW_ATTRIBUTE, SEARCH_FILTER_ROW)
  return control
}

// see SV-7
/** @purity non-pure */
function filterValueLine(host: Document, shown: SearchFilterValueView, fontPx: number): HTMLElement {
  const line = made(host, 'label', FILTER_LINE_STYLE + `font-size:${fontPx}px;`)
  line.setAttribute(FILTER_LABEL_ATTRIBUTE, shown.label)
  const mark = filterControl(host, 'checkbox', fontPx)
  mark.setAttribute(SEARCH_FILTER_VALUE_ATTRIBUTE, shown.value)
  mark.checked = shown.isShown
  if (shown.isShown) mark.setAttribute('checked', '')
  const label = made(host, 'span', '')
  label.textContent = shown.label
  line.replaceChildren(mark, label)
  return line
}

// see SV-7
// WHY: one line per bound, the word on its left, so which input starts the range reads at a glance.
/** @purity non-pure */
function filterDateFields(host: Document, menu: Extract<SearchFilterMenuView, { kind: 'dates' }>, fontPx: number): HTMLElement {
  const lines = made(host, 'div', '')
  const bounds = [
    ['since', menu.from, menu.fromWord],
    ['until', menu.to, menu.toWord],
  ] as const
  lines.replaceChildren(
    ...bounds.map(([bound, day, word]) => {
      const line = made(host, 'label', FILTER_LINE_STYLE + `font-size:${fontPx}px;`)
      const label = made(host, 'span', FILTER_BOUND_WORD_STYLE)
      label.textContent = word
      const field = filterControl(host, 'date', fontPx)
      field.setAttribute(SEARCH_FILTER_BOUND_ATTRIBUTE, bound)
      field.value = day ?? ''
      line.replaceChildren(label, field)
      return line
    }),
  )
  return lines
}

// see SV-7
/** @purity non-pure */
export function searchFilterMenuElement(
  host: Document,
  menu: SearchFilterMenuView,
  fontPx: number,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const box = made(host, 'div', filterMenuStyle())
  box.setAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE, menu.column)
  box.setAttribute(FILTER_MENU_ATTRIBUTE, 'true')
  const entries = made(host, 'div', FILTER_LINE_STYLE)
  entries.replaceChildren(...menu.entries.map((item: CommandItem) => anchoredEntry(host, item, anchors)))
  const controls = made(host, 'div', FILTER_CONTROLS_STYLE)
  const list = made(host, 'div', FILTER_LIST_STYLE)
  list.setAttribute(FILTER_LIST_ATTRIBUTE, 'true')
  if (menu.kind === 'dates') {
    controls.replaceChildren(entries)
    list.replaceChildren(filterDateFields(host, menu, fontPx))
  } else {
    controls.replaceChildren(filterSearchField(host, menu.searchHint, fontPx), entries)
    list.replaceChildren(...menu.values.map((shown) => filterValueLine(host, shown, fontPx)))
  }
  box.replaceChildren(controls, list)
  return box
}

// see SV-7
/** @purity non-pure */
function filterSearchField(host: Document, hint: string, fontPx: number): HTMLElement {
  const field = made(host, 'input', FILTER_SEARCH_STYLE + `font-size:${fontPx}px;`) as HTMLInputElement
  field.setAttribute('type', 'search')
  field.setAttribute('placeholder', hint)
  field.setAttribute(SEARCH_FILTER_SEARCH_ATTRIBUTE, 'true')
  field.setAttribute(FIELD_ROW_ATTRIBUTE, SEARCH_FILTER_ROW)
  return field
}

// see SV-7
/** @purity non-pure */
function narrowFilterList(layer: Element, typed: string): void {
  for (const line of layer.querySelectorAll<HTMLElement>(`[${FILTER_LABEL_ATTRIBUTE}]`)) {
    line.style.display = isFilterValueListed(line.getAttribute(FILTER_LABEL_ATTRIBUTE) ?? '', typed) ? '' : 'none'
  }
}

// see SV-7, IF-9, IC-125, IC-126
/** @purity semi-pure-b */
function listedFilterValues(layer: Element): readonly string[] | null {
  const field = layer.querySelector<HTMLInputElement>(`[${SEARCH_FILTER_SEARCH_ATTRIBUTE}]`)
  if (field === null || field.value === '') return null
  const marks = [...layer.querySelectorAll<HTMLInputElement>(`[${SEARCH_FILTER_VALUE_ATTRIBUTE}]`)]
  return marks.filter((mark) => mark.parentElement?.style.display !== 'none').map((mark) => mark.getAttribute(SEARCH_FILTER_VALUE_ATTRIBUTE) ?? '')
}

// see SV-7, IF-9
/** @purity semi-pure-b */
function withListedValues(answer: ScreenPart, layer: Element): ScreenPart {
  if (answer.entry === null || !LISTED_ENTRIES.includes(answer.entry)) return answer
  return { ...answer, searchFilterListed: listedFilterValues(layer) }
}

// see SJ-1, SV-17, SQ-1, SQ-5, DT-1, DT-4
/** @purity non-pure */
function bodyRowElement(
  host: Document,
  row: SearchRowView,
  columns: readonly SearchColumnView[],
  places: { readonly jumpAt: number; readonly glyphAt: number | null; readonly showAt: number | null },
): HTMLElement {
  const line = made(host, 'tr', '')
  row.cells.forEach((text, at) => {
    const isJump = at === places.jumpAt
    const isFixed = columns[at]?.isFixed === true
    const fixed = isFixed ? fixedColumnStyle() + stackStyle('fixedBodyCell') : ''
    const cell = made(host, 'td', cellStyle() + fixed + (isJump ? jumpCellStyle() : ''))
    if (at === places.glyphAt) cell.replaceChildren(glyphElement(host, row.glyph), text)
    else if (at === places.showAt && row.target.kind === 'task') cell.replaceChildren(shownTaskBox(host, row.target.taskUid, row.shown === true))
    else cell.textContent = text
    if (isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
    if (isJump && row.target.kind === 'task') cell.setAttribute(SEARCH_JUMP_TASK_ATTRIBUTE, String(row.target.taskUid))
    if (isJump && row.target.kind === 'commentBox') cell.setAttribute(SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE, row.target.commentBoxId)
    line.append(cell)
  })
  return line
}

// see SV-6, SV-16, SV-17, SV-18, T-331
/** @purity non-pure */
export function searchTableElement(host: Document, view: DrawnTable, fontPx: number, sizing: ColumnSizing = unmeasuredSizing(fontPx)): HTMLElement {
  const box = made(host, 'div', TABLE_BOX_STYLE)
  const widths = view.columns.map((column) => columnWidthPx(column, sizing))
  const width = widths.reduce((sum, one) => sum + one, 0)
  const table = made(host, 'table', TABLE_STYLE + `width:${width}px;font-size:${fontPx}px;`)
  const columns = made(host, 'colgroup', '')
  columns.replaceChildren(...widths.map((one) => made(host, 'col', `width:${one}px;`)))
  const head = made(host, 'thead', '')
  const headings = made(host, 'tr', '')
  const showAt = view.showAt ?? null
  headings.replaceChildren(...view.columns.map((column, at) => headerCellElement(host, column, at === showAt ? (view.showHeading ?? 'none') : null, sizing)))
  head.append(headings)
  const body = made(host, 'tbody', '')
  const places = { jumpAt: view.jumpAt ?? 0, glyphAt: view.glyphAt ?? null, showAt }
  body.replaceChildren(...view.rows.map((row) => bodyRowElement(host, row, view.columns, places)))
  table.replaceChildren(columns, head, body)
  box.append(table)
  return box
}

// see RW-4
/** @purity non-pure */
function summaryItemElement(host: Document, one: NonNullable<TableWindowView['summary']>[number]): HTMLElement {
  const item = made(host, 'span', SUMMARY_ITEM_STYLE)
  if (one.glyph === undefined) item.textContent = one.text
  else item.replaceChildren(glyphElement(host, one.glyph), one.text)
  return item
}

// see RW-3, RW-4
/** @purity non-pure */
function aboveTableElements(host: Document, view: TableWindowView, fontPx: number, anchors: Map<string, HTMLElement>, role: string): readonly HTMLElement[] {
  const word = wordFieldElement(host, view.word, fontPx)
  const tools = view.toolEntries === undefined ? [] : view.toolEntries.map((item) => anchoredEntry(host, item, anchors, role))
  const line = made(host, 'div', TOOL_LINE_STYLE)
  line.replaceChildren(...tools, word)
  if (view.summary === undefined) return [tools.length === 0 ? word : line]
  const summary = made(host, 'div', SUMMARY_LINE_STYLE + `font-size:${fontPx}px;`)
  summary.replaceChildren(...view.summary.map((one) => summaryItemElement(host, one)))
  return [line, summary]
}

// see U-64, U-66, FR-134, FR-151, T-330, T-346
/** @purity non-pure */
export function searchPanelElement(
  host: Document,
  view: TableWindowView,
  placed: { readonly box: ScreenRect; readonly fontPx: number; readonly sizing?: ColumnSizing },
  anchors: Map<string, HTMLElement>,
  role: string = SEARCH_PANEL_ROLE,
): HTMLElement {
  const panel = part(host, 'div', role, boxStyle(placed.box) + windowStyle())
  const entries = { before: view.tableEntries, titled: view.titleEntries }
  const title = windowTitleRowElement(host, view.heading, entries, anchors, role, placed.fontPx)
  if (view.shown === 'minimised') {
    panel.replaceChildren(title)
    return panel
  }
  const menu = view.filterMenu === null ? [] : [searchFilterMenuElement(host, view.filterMenu, placed.fontPx, anchors)]
  // TRAP: the table stays the last child; redrawInPlace replaces the last child as the table.
  const table = searchTableElement(host, view, placed.fontPx, placed.sizing ?? unmeasuredSizing(placed.fontPx))
  panel.replaceChildren(title, ...aboveTableElements(host, view, placed.fontPx, anchors, role), ...menu, table)
  return panel
}

// see SV-7
// WHY: under the pressed heading cell, at least its width, pushed back inside the visible table box (JDG-1096 Q16).
/** @purity non-pure */
function placeFilterMenu(window: HTMLElement): void {
  const menu = window.querySelector<HTMLElement>(`[${FILTER_MENU_ATTRIBUTE}]`)
  const tableBox = window.lastElementChild
  const column = menu?.getAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE) ?? null
  const cell = column === null ? null : window.querySelector(`thead th[${COLUMN_ATTRIBUTE}="${column}"]`)
  if (menu === null || tableBox === null || cell === null || typeof cell.getBoundingClientRect !== 'function') return
  const frame = window.getBoundingClientRect()
  const shown = tableBox.getBoundingClientRect()
  const heading = cell.getBoundingClientRect()
  menu.style.minWidth = `${heading.width}px`
  menu.style.maxHeight = `${Math.max(0, shown.bottom - heading.bottom)}px`
  const right = Math.min(heading.left + menu.getBoundingClientRect().width, shown.right)
  const left = Math.max(shown.left, right - menu.getBoundingClientRect().width)
  menu.style.left = `${left - frame.left}px`
  menu.style.top = `${heading.bottom - frame.top}px`
}

// see SV-6
/** @purity non-pure */
export function pinFixedColumns(tableBox: Element): void {
  const headings = [...tableBox.querySelectorAll<HTMLElement>('thead th')]
  const lefts = headings.map((cell) => (cell.hasAttribute(FIXED_COLUMN_ATTRIBUTE) ? (cell.offsetLeft ?? null) : null))
  for (const line of tableBox.querySelectorAll('tr')) {
    lefts.forEach((left, at) => {
      const cell = line.children[at] as HTMLElement | undefined
      if (left !== null && cell !== undefined) cell.style.left = `${left}px`
    })
  }
}

// see SV-2
/** @purity non-pure */
export function focusSearchWordIn(panel: HTMLElement): boolean {
  const field = panel.querySelector<HTMLInputElement>(`[${SEARCH_WORD_FIELD_ATTRIBUTE}]`)
  if (field === null) return false
  field.focus()
  field.select()
  return true
}

// see SV-9, SV-12, SV-13
/** @purity pure */
function panelPlacedOf(panel: TableWindowView, window: WindowName): PlacedWindow {
  const ratio = { width: NOT_STORED_SEARCH_PANEL_SIZES['S-421'], height: NOT_STORED_SEARCH_PANEL_SIZES['S-422'] }
  const place = searchPanelPlaceOf(panel, ratio)
  return { window, shown: panel.shown, place, box: searchPanelBoxOf(panel, ratio), range: panel.canvas }
}

// see GR-28, SV-18, RW-9
// WHY: on the heading row only, within S-465 of a column's right border; an entrance and GR-24 / GR-25 answer first.
/** @purity semi-pure-b */
function columnBorderAt(window: Element, placed: PlacedWindow, asked: PointAsked, widthFloor: number): NonNullable<ScreenPart['windowGrab']> | null {
  const head = window.querySelector('thead')
  const tableBox = window.lastElementChild
  if (head === null || tableBox === null || typeof head.getBoundingClientRect !== 'function') return null
  const row = head.getBoundingClientRect()
  if (asked.y < row.top || asked.y > row.bottom) return null
  const reach = NOT_STORED_SEARCH_PANEL_SIZES['S-465']
  const shown = tableBox.getBoundingClientRect()
  for (const cell of window.querySelectorAll('thead th')) {
    if (cell.getAttribute(NO_BORDER_ATTRIBUTE) !== null) continue
    const drawn = cell.getBoundingClientRect()
    if (Math.abs(asked.x - drawn.right) > reach || drawn.right > shown.right + reach) continue
    const column = cell.getAttribute(COLUMN_ATTRIBUTE) ?? ''
    const widthAtPress = Number(cell.getAttribute('data-width'))
    const widthCeiling = Math.max(shown.right - drawn.left, widthFloor)
    return { window: placed.window, region: 'columnBorder', column, widthAtPress, widthFloor, widthCeiling }
  }
  return null
}

// see SV-7, IF-9
/** @purity semi-pure-b */
function headingColumnOf(start: Element, window: Element): string | null {
  for (let node: Element | null = start; node !== null && node !== window; node = node.parentElement) {
    if (node.tagName === 'TH') return node.getAttribute(COLUMN_ATTRIBUTE)
  }
  return null
}

// see IF-9, GR-24, GR-25, GR-28, SJ-1, SV-7, T-023d
// WHY: the heading word of a column answers as that column's IC-122 (SV-7), below the border band.
/** @purity semi-pure-b */
function tableWindowPartAt(
  window: Element | null,
  placed: PlacedWindow | null,
  asked: PointAsked,
  role: string,
  widthFloor: number,
): ScreenPart | null {
  const answer = windowPartAt(window, placed, asked, windowPartOf(role))
  const first = asked.first
  if (window === null || placed === null || answer === null || answer.entry !== null || first === null || !window.contains(first)) return answer
  if (answer.windowGrab !== undefined) return answer
  const border = columnBorderAt(window, placed, asked, widthFloor)
  if (border !== null) return { ...answer, windowGrab: border }
  if (first.getAttribute(SHOWN_ALL_ATTRIBUTE) !== null || first.getAttribute(SHOWN_TASK_ATTRIBUTE) !== null) return answer
  const column = headingColumnOf(first, window)
  if (column !== null) return { ...answer, entry: FILTER_ENTRY, searchFilterColumn: column }
  return { ...answer, searchJumpTarget: searchJumpFrom(first, window) }
}

// see SV-5, SV-10, SV-11
/** @purity non-pure */
function redrawInPlace(
  host: Document,
  drawnPanel: HTMLElement,
  panel: DrawnTable,
  box: ScreenRect,
  table: { readonly fontPx: number; readonly sizing: ColumnSizing } | null,
): void {
  drawnPanel.setAttribute('style', boxStyle(box) + windowStyle())
  const drawnTable = drawnPanel.lastElementChild
  if (table === null || drawnTable === null) return
  const redrawn = searchTableElement(host, panel, table.fontPx, table.sizing)
  drawnTable.replaceWith(redrawn)
  pinFixedColumns(redrawn)
}

// WHY: the heading's IC-122 and the drawn filter both name their column; wantsEntry tells them apart (SV-7).
/** @purity semi-pure-b */
function filterColumnAbove(start: Element | null, layer: Element, wantsEntry: boolean): string | null {
  for (let node: Element | null = start; node !== null && node !== layer; node = node.parentElement) {
    const column = node.getAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE)
    const isEntry = node.getAttribute(ENTRY_ICON_ATTRIBUTE) === FILTER_ENTRY
    if (column !== null && isEntry === wantsEntry) return column
  }
  return null
}

// see IF-9, SV-7, IC-122, IC-125, IC-126
/** @purity semi-pure-b */
function withPressedWindowFilter(answer: ScreenPart | null, first: Element | null, layer: Element): ScreenPart | null {
  if (answer === null || first === null || !layer.contains(first)) return answer
  const column = filterColumnAbove(first, layer, true)
  const listed = withListedValues(answer, layer)
  const inMenu = filterColumnAbove(first, layer, false) === null ? listed : { ...listed, isInFilterMenu: true }
  return column === null ? inMenu : { ...inMenu, searchFilterColumn: column }
}

// see SV-7, IF-9
/** @purity semi-pure-b */
function filterChangeOf(control: HTMLInputElement | null, layer: Element): SearchFilterChange | null {
  if (control === null || typeof control.getAttribute !== 'function') return null
  const shown = shownChangeOf(control, layer)
  if (shown !== null) return shown
  const column = filterColumnAbove(control.parentElement, layer, false)
  if (column === null) return null
  const value = control.getAttribute(SEARCH_FILTER_VALUE_ATTRIBUTE)
  if (value !== null) return { kind: 'value', column, value, isShown: control.checked }
  const bound = control.getAttribute(SEARCH_FILTER_BOUND_ATTRIBUTE)
  if (bound !== 'since' && bound !== 'until') return null
  return { kind: 'bound', column, bound, day: control.value === '' ? null : control.value }
}

// see SQ-10, TV-2
// WHY: the heading's box names every listed row, read off the drawn boxes, so rows not listed keep their checks.
/** @purity semi-pure-b */
function shownChangeOf(control: HTMLInputElement, layer: Element): SearchFilterChange | null {
  const one = control.getAttribute(SHOWN_TASK_ATTRIBUTE)
  if (one !== null) return { kind: 'shown', column: VISIBILITY_COLUMN, taskUids: [Number(one)], isShown: control.checked }
  if (control.getAttribute(SHOWN_ALL_ATTRIBUTE) === null) return null
  const listed = [...layer.querySelectorAll(`[${SHOWN_TASK_ATTRIBUTE}]`)].map((box) => Number(box.getAttribute(SHOWN_TASK_ATTRIBUTE)))
  return { kind: 'shown', column: VISIBILITY_COLUMN, taskUids: listed, isShown: control.checked }
}

// WHY: input, the one event T-078 lets this layer hear; a check mark or a whole date is settled (IF-9, SV-7).
/** @purity non-pure */
export function filterChangeWatch(layer: HTMLElement, onChanged: () => void): { readonly read: () => readonly SearchFilterChange[] } {
  let changes: readonly SearchFilterChange[] = []
  layer.addEventListener('input', (event: Event) => {
    const change = filterChangeOf(event.target as HTMLInputElement | null, layer)
    if (change === null) return
    changes = [...changes, change]
    onChanged()
  })
  /** @purity semi-pure-b */
  const read = (): readonly SearchFilterChange[] => {
    const taken = changes
    changes = []
    return taken
  }
  return { read }
}

const FOCUS_MARKS: readonly string[] = [
  SEARCH_WORD_FIELD_ATTRIBUTE,
  SEARCH_FILTER_SEARCH_ATTRIBUTE,
  SEARCH_FILTER_VALUE_ATTRIBUTE,
  SEARCH_FILTER_BOUND_ATTRIBUTE,
  ENTRY_ICON_ATTRIBUTE,
  SEARCH_FILTER_COLUMN_ATTRIBUTE,
]

type FocusMark = readonly (readonly [string, string | null])[]

// see IN-4, SV-14
/** @purity semi-pure-b */
function focusMarkIn(host: Document, layer: Element): FocusMark | null {
  const active = (host as Partial<Document>).activeElement ?? null
  if (active === null || !isInside(layer, active)) return null
  return FOCUS_MARKS.map((name) => [name, active.getAttribute(name)] as const)
}

// WHY: a redraw drops the focused control; focus goes back inside, so IN-4 still reads the panel (JDG-633).
/** @purity non-pure */
function focusKeptIn(host: Document, layer: Element, mark: FocusMark | null): void {
  if (mark === null || isInside(layer, (host as Partial<Document>).activeElement ?? null)) return
  const controls = [...layer.querySelectorAll<HTMLElement>('input, button')]
  const twin = controls.find((node) => mark.every(([name, value]) => node.getAttribute(name) === value))
  const target = twin ?? layer.querySelector<HTMLElement>(`[${SEARCH_WORD_FIELD_ATTRIBUTE}]`)
  target?.focus()
}

// see IN-4, SV-14
/** @purity non-pure */
function drawnKeepingFocus(host: Document, layer: Element, drawIt: () => void): void {
  const mark = (layer.firstElementChild ?? null) === null ? null : focusMarkIn(host, layer)
  drawIt()
  focusKeptIn(host, layer, mark)
}

// see SV-7, IF-9
/** @purity non-pure */
function filterSearchKeeper(layer: HTMLElement): (menu: TableWindowView['filterMenu']) => void {
  let held: { readonly column: string; readonly text: string } | null = null
  layer.addEventListener('input', (event: Event) => {
    const field = event.target as HTMLInputElement | null
    if (field === null || typeof field.getAttribute !== 'function' || field.getAttribute(SEARCH_FILTER_SEARCH_ATTRIBUTE) === null) return
    const column = layer.querySelector(`[${FILTER_MENU_ATTRIBUTE}]`)?.getAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE) ?? null
    held = column === null ? null : { column, text: field.value }
    narrowFilterList(layer, field.value)
  })
  return (menu) => {
    if (menu === null || menu.kind !== 'values' || held?.column !== menu.column) {
      held = null
      return
    }
    const field = layer.querySelector<HTMLInputElement>(`[${SEARCH_FILTER_SEARCH_ATTRIBUTE}]`)
    if (field !== null) field.value = held.text
    narrowFilterList(layer, held.text)
  }
}

// see SV-2, SV-5, IF-9
/** @purity non-pure */
export function typedWordWatch(layer: HTMLElement, onWordTyped: () => void): { readonly read: () => string | null } {
  let typed: string | null = null
  layer.addEventListener('input', (event: Event) => {
    const field = event.target as HTMLInputElement | null
    if (field === null || field.getAttribute(SEARCH_WORD_FIELD_ATTRIBUTE) === null) return
    typed = field.value
    onWordTyped()
  })
  /** @purity semi-pure-b */
  const read = (): string | null => {
    const word = typed
    typed = null
    return word
  }
  return { read }
}

// see SV-7, SV-18
/** @purity pure */
export function tableKeyOf(table: DrawnTable, fontPx: number, filterMenu: unknown): string {
  return JSON.stringify([table.rows, table.columns, fontPx, filterMenu])
}

// see SV-18, RW-9, S-425
// WHY: measured on opening, on a step (IC-127) or a language change, never per frame (JDG-1810).
/** @purity non-pure */
function tableSizingKeeper(host: Document, layer: Element) {
  let measuredFor = ''
  let measured: ReadonlyMap<string, number> | null = null
  return {
    /** @purity non-pure */
    sizingOf(panel: TableWindowView, fontPx: number): ColumnSizing {
      const key = JSON.stringify([fontPx, panel.columns.map((column) => [column.column, column.heading])])
      if (panel.shown !== 'minimised' && (measured === null || key !== measuredFor)) {
        measuredFor = key
        measured = measureDefaultColumnWidths(host, layer, panel, fontPx)
      }
      return { floor: measuredWidthFloor(fontPx), measured: measured ?? new Map() }
    },
    /** @purity non-pure */
    forget(): void {
      measured = null
    },
  }
}

// see FR-151, SV-5, SV-9, SV-16, SV-18, IF-9
// TRAP: the table alone when nothing else moved; a rebuilt word field loses the caret and the typed word.
/** @purity non-pure */
export function searchPanelPainter(host: Document, layer: HTMLElement, onWordTyped: () => void, identity = SEARCH_PANEL_IDENTITY) {
  let frameDrawn = ''
  let tableDrawn = ''
  let placed: PlacedWindow | null = null
  let widthFloor = 0
  const typedWord = typedWordWatch(layer, onWordTyped)
  const filterChanges = filterChangeWatch(layer, onWordTyped)
  const keepFilterSearch = filterSearchKeeper(layer)
  const sizes = tableSizingKeeper(host, layer)

  /** @purity non-pure */
  function draw(panel: TableWindowView | null | undefined, isChanged: boolean, anchorsOf: () => Map<string, HTMLElement>): void {
    if (isChanged) drawnKeepingFocus(host, layer, () => drawPanel(panel, anchorsOf))
  }

  /** @purity non-pure */
  function drawPanel(panel: TableWindowView | null | undefined, anchorsOf: () => Map<string, HTMLElement>): void {
    placed = panel === null || panel === undefined ? null : panelPlacedOf(panel, identity.window)
    if (panel === null || panel === undefined || placed === null) {
      frameDrawn = ''
      sizes.forget()
      layer.replaceChildren()
      return
    }
    const fontPx = searchPanelFontPxOf(panel.textSizeStep, NOT_STORED_SEARCH_PANEL_FONT_SIZES)
    const sizing = sizes.sizingOf(panel, fontPx)
    widthFloor = sizing.floor
    // WHY: not the word: only typing changes it, and the typed field already holds it.
    const frameKey = JSON.stringify({ ...panel, rows: [], columns: [], at: null, size: null, canvas: null, word: null })
    const tableKey = tableKeyOf(panel, fontPx, [...sizing.measured])
    const drawnPanel = layer.firstElementChild as HTMLElement | null
    const isTableKept = tableKey === tableDrawn
    tableDrawn = tableKey
    if (frameKey === frameDrawn && panel.shown !== 'minimised' && drawnPanel !== null) {
      redrawInPlace(host, drawnPanel, panel, placed.box, isTableKept ? null : { fontPx, sizing })
      return
    }
    frameDrawn = frameKey
    const drawn = searchPanelElement(host, panel, { box: placed.box, fontPx, sizing }, anchorsOf(), identity.role)
    layer.replaceChildren(drawn)
    const tableBox = drawn.lastElementChild ?? null
    if (panel.shown !== 'minimised' && tableBox !== null) pinFixedColumns(tableBox)
    keepFilterSearch(panel.filterMenu)
    placeFilterMenu(drawn)
  }

  return {
    draw,
    readWord: typedWord.read,
    readFilterChanges: filterChanges.read,
    answerAt: (asked: PointAsked): ScreenPart | null =>
      withPressedWindowFilter(tableWindowPartAt(layer.firstElementChild, placed, asked, identity.role, widthFloor), asked.first, layer),
    focusWord: (): boolean => focusSearchWordIn(layer),
  }
}

/** @purity semi-pure-b */
function isInside(layer: Element, node: Element | null): boolean {
  return node !== null && layer.contains(node)
}

// DomScreenSurface -- the two table windows (Search Panel, Delay Diagnostics Report): title row, word field and table.
// @unit      UF-182  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import {
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
  anchoredEntry,
  boxStyle,
  commandEntry,
  entranceOuterHeightPx,
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
  readonly summary?: readonly { readonly text: string }[]
  readonly jumpAt?: number
}

// see T-337, RW-5
export interface TableWindowIdentity {
  readonly window: WindowName
  readonly role: string
}

// see SV-6, SV-17, SV-18, RW-9
export interface DrawnTable {
  readonly columns: readonly SearchColumnView[]
  readonly rows: readonly SearchRowView[]
  readonly jumpAt?: number
}

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

export const SEARCH_JUMP_TASK_ATTRIBUTE = 'data-search-task'

export const SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE = 'data-search-comment-box'

const ENTRY_ICON_ATTRIBUTE = 'data-icon'

const COLUMN_ATTRIBUTE = 'data-column'

const FILTER_MENU_ATTRIBUTE = 'data-search-filter-menu'

const FILTER_ENTRY = 'IC-122'

type SearchPanelSizeRow = keyof typeof NOT_STORED_SEARCH_PANEL_SIZES

// see SV-18, RW-9
// WHY: S-466 .. S-474 hold SQ-1 .. SQ-9 and S-475 .. S-481 hold DT-1 .. DT-7, each in its table's row order.
const FIRST_DEFAULT_WIDTH_ROW: { readonly [table: string]: SearchPanelSizeRow } = { SQ: 'S-466', DT: 'S-475' }

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

/** @purity pure */
function filterMenuStyle(): string {
  return (
    'position:absolute;z-index:4;box-sizing:border-box;overflow:auto;display:flex;flex-direction:column;' +
    `background:${PAINT.ground};border:1px solid ${PAINT.rule};box-shadow:0 0.25em 0.75em ${PAINT.shadow};`
  )
}

const FILTER_LINE_STYLE = 'display:flex;align-items:center;white-space:nowrap;'

/** @purity pure */
function cellStyle(): string {
  return `border:1px solid ${PAINT.rule};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 0.25em;`
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
  return `${cellStyle()}${fixed}position:sticky;top:0;background:${PAINT.panel};${stack}`
}

const FIXED_COLUMN_ATTRIBUTE = 'data-fixed-column'

const JUMP_CELL_STYLE = 'cursor:pointer;'

type SearchJumpCell = NonNullable<ScreenPart['searchJumpTarget']>

// see SV-18, RW-9
/** @purity pure */
export function columnWidthPx(column: SearchColumnView): number {
  if (column.width !== null) return column.width
  const [table = '', place = ''] = column.column.split('-')
  const rows = Object.keys(NOT_STORED_SEARCH_PANEL_SIZES) as readonly SearchPanelSizeRow[]
  const first = FIRST_DEFAULT_WIDTH_ROW[table]
  const row = first === undefined ? undefined : rows[rows.indexOf(first) + Number(place) - 1]
  if (row === undefined) throw new RangeError(`table T-206 holds no default width for column ${column.column}`)
  return NOT_STORED_SEARCH_PANEL_SIZES[row]
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

// see SV-7, SV-18
/** @purity non-pure */
function headerCellElement(host: Document, column: SearchColumnView): HTMLElement {
  const cell = made(host, 'th', headerCellStyle(column.isFixed))
  cell.setAttribute(COLUMN_ATTRIBUTE, column.column)
  cell.setAttribute('data-width', String(columnWidthPx(column)))
  if (column.isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
  const line = made(host, 'div', HEADING_LINE_STYLE)
  const heading = made(host, 'span', HEADING_WORD_STYLE)
  heading.textContent = column.heading
  const filter = commandEntry(host, column.filterEntry)
  filter.setAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE, column.column)
  line.replaceChildren(heading, filter)
  cell.replaceChildren(line)
  return cell
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
/** @purity non-pure */
function filterDateFields(host: Document, menu: Extract<SearchFilterMenuView, { kind: 'dates' }>, fontPx: number): HTMLElement {
  const line = made(host, 'div', FILTER_LINE_STYLE)
  const bounds = [
    ['since', menu.from],
    ['until', menu.to],
  ] as const
  line.replaceChildren(
    ...bounds.map(([bound, day]) => {
      const field = filterControl(host, 'date', fontPx)
      field.setAttribute(SEARCH_FILTER_BOUND_ATTRIBUTE, bound)
      field.value = day ?? ''
      return field
    }),
  )
  return line
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
  const choices =
    menu.kind === 'dates'
      ? [filterDateFields(host, menu, fontPx)]
      : menu.values.map((shown) => filterValueLine(host, shown, fontPx))
  box.replaceChildren(...choices, entries)
  return box
}

// see SJ-1, SV-17
/** @purity non-pure */
function bodyRowElement(host: Document, row: SearchRowView, columns: readonly SearchColumnView[], jumpAt: number): HTMLElement {
  const line = made(host, 'tr', '')
  row.cells.forEach((text, at) => {
    const isJump = at === jumpAt
    const isFixed = columns[at]?.isFixed === true
    const fixed = isFixed ? fixedColumnStyle() + stackStyle('fixedBodyCell') : ''
    const cell = made(host, 'td', cellStyle() + fixed + (isJump ? JUMP_CELL_STYLE : ''))
    cell.textContent = text
    if (isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
    if (isJump && row.target.kind === 'task') cell.setAttribute(SEARCH_JUMP_TASK_ATTRIBUTE, String(row.target.taskUid))
    if (isJump && row.target.kind === 'commentBox') cell.setAttribute(SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE, row.target.commentBoxId)
    line.append(cell)
  })
  return line
}

// see SV-6, SV-16, SV-17, SV-18, T-331
/** @purity non-pure */
export function searchTableElement(host: Document, view: DrawnTable, fontPx: number): HTMLElement {
  const box = made(host, 'div', TABLE_BOX_STYLE)
  const widths = view.columns.map(columnWidthPx)
  const width = widths.reduce((sum, one) => sum + one, 0)
  const table = made(host, 'table', TABLE_STYLE + `width:${width}px;font-size:${fontPx}px;`)
  const columns = made(host, 'colgroup', '')
  columns.replaceChildren(...widths.map((one) => made(host, 'col', `width:${one}px;`)))
  const head = made(host, 'thead', '')
  const headings = made(host, 'tr', '')
  headings.replaceChildren(...view.columns.map((column) => headerCellElement(host, column)))
  head.append(headings)
  const body = made(host, 'tbody', '')
  body.replaceChildren(...view.rows.map((row) => bodyRowElement(host, row, view.columns, view.jumpAt ?? 0)))
  table.replaceChildren(columns, head, body)
  box.append(table)
  return box
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
  summary.replaceChildren(...view.summary.map((one) => Object.assign(made(host, 'span', SUMMARY_ITEM_STYLE), { textContent: one.text })))
  return [line, summary]
}

// see U-64, U-66, FR-134, FR-151, T-330, T-346
/** @purity non-pure */
export function searchPanelElement(
  host: Document,
  view: TableWindowView,
  placed: { readonly box: ScreenRect; readonly fontPx: number },
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
  panel.replaceChildren(title, ...aboveTableElements(host, view, placed.fontPx, anchors, role), ...menu, searchTableElement(host, view, placed.fontPx))
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
function columnBorderAt(window: Element, placed: PlacedWindow, asked: PointAsked): NonNullable<ScreenPart['windowGrab']> | null {
  const head = window.querySelector('thead')
  const tableBox = window.lastElementChild
  if (head === null || tableBox === null || typeof head.getBoundingClientRect !== 'function') return null
  const row = head.getBoundingClientRect()
  if (asked.y < row.top || asked.y > row.bottom) return null
  const reach = NOT_STORED_SEARCH_PANEL_SIZES['S-465']
  const shown = tableBox.getBoundingClientRect()
  for (const cell of window.querySelectorAll('thead th')) {
    const drawn = cell.getBoundingClientRect()
    if (Math.abs(asked.x - drawn.right) > reach || drawn.right > shown.right + reach) continue
    const column = cell.getAttribute(COLUMN_ATTRIBUTE) ?? ''
    const widthAtPress = Number(cell.getAttribute('data-width'))
    const widthCeiling = Math.max(shown.right - drawn.left, NOT_STORED_SEARCH_PANEL_SIZES['S-425'])
    return { window: placed.window, region: 'columnBorder', column, widthAtPress, widthFloor: NOT_STORED_SEARCH_PANEL_SIZES['S-425'], widthCeiling }
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
function tableWindowPartAt(window: Element | null, placed: PlacedWindow | null, asked: PointAsked, role: string): ScreenPart | null {
  const answer = windowPartAt(window, placed, asked, windowPartOf(role))
  const first = asked.first
  if (window === null || placed === null || answer === null || answer.entry !== null || first === null || !window.contains(first)) return answer
  if (answer.windowGrab !== undefined) return answer
  const border = columnBorderAt(window, placed, asked)
  if (border !== null) return { ...answer, windowGrab: border }
  const column = headingColumnOf(first, window)
  if (column !== null) return { ...answer, entry: FILTER_ENTRY, searchFilterColumn: column }
  return { ...answer, searchJumpTarget: searchJumpFrom(first, window) }
}

// see SV-5, SV-10, SV-11
/** @purity non-pure */
function redrawInPlace(host: Document, drawnPanel: HTMLElement, panel: DrawnTable, box: ScreenRect, tableFontPx: number | null): void {
  drawnPanel.setAttribute('style', boxStyle(box) + windowStyle())
  const drawnTable = drawnPanel.lastElementChild
  if (tableFontPx === null || drawnTable === null) return
  const redrawn = searchTableElement(host, panel, tableFontPx)
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

// see IF-9, SV-7, IC-122
/** @purity semi-pure-b */
function withFilterColumn(answer: ScreenPart | null, first: Element | null, layer: Element): ScreenPart | null {
  if (answer === null || first === null || !layer.contains(first)) return answer
  const column = filterColumnAbove(first, layer, true)
  return column === null ? answer : { ...answer, searchFilterColumn: column }
}

// see SV-7, IF-9
/** @purity semi-pure-b */
function filterChangeOf(control: HTMLInputElement | null, layer: Element): SearchFilterChange | null {
  if (control === null || typeof control.getAttribute !== 'function') return null
  const column = filterColumnAbove(control.parentElement, layer, false)
  if (column === null) return null
  const value = control.getAttribute(SEARCH_FILTER_VALUE_ATTRIBUTE)
  if (value !== null) return { kind: 'value', column, value, isShown: control.checked }
  const bound = control.getAttribute(SEARCH_FILTER_BOUND_ATTRIBUTE)
  if (bound !== 'since' && bound !== 'until') return null
  return { kind: 'bound', column, bound, day: control.value === '' ? null : control.value }
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

// see FR-151, SV-5, SV-9, SV-16, IF-9
// TRAP: the table alone when nothing else moved; a rebuilt word field loses the caret and the typed word.
/** @purity non-pure */
export function searchPanelPainter(host: Document, layer: HTMLElement, onWordTyped: () => void, identity = SEARCH_PANEL_IDENTITY) {
  let frameDrawn = ''
  let tableDrawn = ''
  let placed: PlacedWindow | null = null
  const typedWord = typedWordWatch(layer, onWordTyped)
  const filterChanges = filterChangeWatch(layer, onWordTyped)

  /** @purity non-pure */
  function draw(panel: TableWindowView | null | undefined, isChanged: boolean, anchorsOf: () => Map<string, HTMLElement>): void {
    if (isChanged) drawnKeepingFocus(host, layer, () => drawPanel(panel, anchorsOf))
  }

  /** @purity non-pure */
  function drawPanel(panel: TableWindowView | null | undefined, anchorsOf: () => Map<string, HTMLElement>): void {
    placed = panel === null || panel === undefined ? null : panelPlacedOf(panel, identity.window)
    if (panel === null || panel === undefined || placed === null) {
      frameDrawn = ''
      layer.replaceChildren()
      return
    }
    const fontPx = searchPanelFontPxOf(panel.textSizeStep, NOT_STORED_SEARCH_PANEL_FONT_SIZES)
    // WHY: not the word: only typing changes it, and the typed field already holds it.
    const frameKey = JSON.stringify({ ...panel, rows: [], columns: [], at: null, size: null, canvas: null, word: null })
    const tableKey = tableKeyOf(panel, fontPx, null)
    const drawnPanel = layer.firstElementChild as HTMLElement | null
    const isTableKept = tableKey === tableDrawn
    tableDrawn = tableKey
    if (frameKey === frameDrawn && panel.shown !== 'minimised' && drawnPanel !== null) {
      redrawInPlace(host, drawnPanel, panel, placed.box, isTableKept ? null : fontPx)
      return
    }
    frameDrawn = frameKey
    const drawn = searchPanelElement(host, panel, { box: placed.box, fontPx }, anchorsOf(), identity.role)
    layer.replaceChildren(drawn)
    const tableBox = drawn.lastElementChild ?? null
    if (panel.shown !== 'minimised' && tableBox !== null) pinFixedColumns(tableBox)
    placeFilterMenu(drawn)
  }

  return {
    draw,
    readWord: typedWord.read,
    readFilterChanges: filterChanges.read,
    answerAt: (asked: PointAsked): ScreenPart | null =>
      withFilterColumn(tableWindowPartAt(layer.firstElementChild, placed, asked, identity.role), asked.first, layer),
    focusWord: (): boolean => focusSearchWordIn(layer),
  }
}

/** @purity semi-pure-b */
function isInside(layer: Element, node: Element | null): boolean {
  return node !== null && layer.contains(node)
}

// DomScreenSurface -- the Search Panel: its title row, word field and the shown table.
// @unit      UF-182  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { ScreenPart, SearchFilterChange, SearchPanelView } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_SEARCH_PANEL_FONT_SIZES,
  NOT_STORED_SEARCH_PANEL_SIZES,
  PAINT,
  SCREEN_Z_ORDER,
  SCREEN_Z_ORDER_ATTRIBUTE,
  anchoredEntry,
  boxStyle,
  commandEntry,
  entranceOuterHeightPx,
  made,
  part,
} from './dom-screen-surface'

type SearchColumnView = SearchPanelView['columns'][number]

type SearchRowView = SearchPanelView['rows'][number]

type SearchFilterMenuView = NonNullable<SearchPanelView['filterMenu']>

type SearchFilterValueView = Extract<SearchFilterMenuView, { kind: 'values' }>['values'][number]

const SEARCH_PANEL_ROLE = 'Search Panel'

export const SEARCH_PANEL_GRAB_ATTRIBUTE = 'data-search-panel-grab'

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

const FILTER_ENTRY = 'IC-122'

// TRAP: PAINT is read at a call, never at load; dom-screen-surface.ts imports this file, so it is not set yet then.
/** @purity pure */
function panelStyle(): string {
  return (
    'box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;' +
    `background:${PAINT.ground};color:${PAINT.ink};box-shadow:0 0.5em 1.5em ${PAINT.shadow};`
  )
}

/** @purity pure */
function titleRowStyle(): string {
  return `display:flex;align-items:center;flex:none;background:${PAINT.panel};`
}

const HEADING_STYLE = 'padding:0 0.5em;white-space:nowrap;'

const TITLE_GAP_STYLE = 'flex:1;'

const WORD_FIELD_STYLE = 'flex:none;box-sizing:border-box;width:100%;'

const TABLE_BOX_STYLE = 'flex:1;overflow:auto;'

const TABLE_STYLE = 'border-collapse:collapse;'

// WHY: shrinks and scrolls inside the panel, not a sized popup: S-423 to S-428 give the menu no size.
const FILTER_MENU_STYLE = 'flex:0 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;'

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

type SearchPanelGrab = NonNullable<ScreenPart['searchPanelGrab']>

type SearchJumpCell = NonNullable<ScreenPart['searchJumpTarget']>

// WHY: S-426 has no value in table T-206 yet, so the edge strip has no width and GR-25 answers nowhere.
const SEARCH_PANEL_EDGE_PX = 0

type EdgeSide = 'start' | 'end' | 'middle'

type SizeRatio = { readonly width: number; readonly height: number }

const EDGE_REGIONS: {
  readonly [Down in EdgeSide]: { readonly [Across in EdgeSide]: SearchPanelGrab['region'] | null }
} = {
  start: { start: 'topLeft', middle: 'top', end: 'topRight' },
  middle: { start: 'left', middle: null, end: 'right' },
  end: { start: 'bottomLeft', middle: 'bottom', end: 'bottomRight' },
}

// see SV-9, SV-11
/** @purity pure */
function searchPanelPlaceOf(view: SearchPanelView, defaultRatio: SizeRatio): ScreenRect {
  const canvas = view.canvas
  const size = view.size ?? { width: canvas.width * defaultRatio.width, height: canvas.height * defaultRatio.height }
  const at = view.at ?? { x: canvas.x, y: canvas.y + canvas.height - size.height }
  return { ...at, ...size }
}

// see SV-9, SV-12, SV-13
/** @purity pure */
export function searchPanelBoxOf(view: SearchPanelView, defaultRatio: SizeRatio): ScreenRect {
  if (view.shown === 'maximised') return view.canvas
  const place = searchPanelPlaceOf(view, defaultRatio)
  if (view.shown === 'normal') return place
  const titleHeight = entranceOuterHeightPx()
  return { x: place.x, y: place.y + place.height - titleHeight, width: place.width, height: titleHeight }
}

// see GR-25
/** @purity pure */
function edgeSideOf(at: number, start: number, end: number, reach: number): EdgeSide | null {
  const fromStart = at - start
  const fromEnd = end - at
  if (fromStart <= -reach || fromEnd <= -reach) return null
  if (Math.min(fromStart, fromEnd) >= reach) return 'middle'
  return fromStart <= fromEnd ? 'start' : 'end'
}

// see GR-25
/** @purity pure */
function edgeRegionAt(x: number, y: number, box: ScreenRect, reach: number): SearchPanelGrab['region'] | null {
  const across = edgeSideOf(x, box.x, box.x + box.width, reach)
  const down = edgeSideOf(y, box.y, box.y + box.height, reach)
  return across === null || down === null ? null : EDGE_REGIONS[down][across]
}

// see SJ-1, GR-24
/** @purity semi-pure-b */
function searchMarksFrom(start: Element, layer: Element): { readonly jump: SearchJumpCell | null; readonly isOnBand: boolean } {
  let jump: SearchJumpCell | null = null
  let isOnBand = false
  for (let node: Element | null = start; node !== null && node !== layer; node = node.parentElement) {
    const task = node.getAttribute(SEARCH_JUMP_TASK_ATTRIBUTE)
    if (task !== null && jump === null) jump = { kind: 'task', taskUid: Number(task) }
    const box = node.getAttribute(SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE)
    if (box !== null && jump === null) jump = { kind: 'commentBox', commentBoxId: box }
    if (node.getAttribute(SEARCH_PANEL_GRAB_ATTRIBUTE) !== null) isOnBand = true
  }
  return { jump, isOnBand }
}

// see SV-16, T-333
// TRAP: a step is a key's place in sizes; sizes not written in table T-333's order pick the wrong size.
/** @purity pure */
export function searchPanelFontPxOf(textSizeStep: number, sizes: { readonly [row: string]: number }): number {
  const fontPx = Object.values(sizes)[textSizeStep]
  if (fontPx === undefined) throw new RangeError(`table T-333 holds no step ${textSizeStep}`)
  return fontPx
}

// see SV-1
/** @purity non-pure */
function titleRowElement(host: Document, view: SearchPanelView, anchors: Map<string, HTMLElement>): HTMLElement {
  const row = made(host, 'div', titleRowStyle() + `height:${entranceOuterHeightPx()}px;`)
  row.setAttribute(SEARCH_PANEL_GRAB_ATTRIBUTE, 'true')
  const heading = made(host, 'span', HEADING_STYLE)
  heading.textContent = view.heading
  const tables = view.tableEntries.map((item) => anchoredEntry(host, item, anchors))
  const titled = view.titleEntries.map((item) => anchoredEntry(host, item, anchors))
  row.replaceChildren(heading, ...tables, made(host, 'span', TITLE_GAP_STYLE), ...titled)
  return row
}

// see SV-2, SV-16
/** @purity non-pure */
function wordFieldElement(host: Document, word: string, fontPx: number): HTMLElement {
  const field = made(host, 'input', WORD_FIELD_STYLE + `font-size:${fontPx}px;`) as HTMLInputElement
  field.setAttribute('type', 'search')
  field.setAttribute(SEARCH_WORD_FIELD_ATTRIBUTE, 'true')
  field.setAttribute(FIELD_ROW_ATTRIBUTE, SEARCH_WORD_ROW)
  field.value = word
  return field
}

// see SV-7
/** @purity non-pure */
function headerCellElement(host: Document, column: SearchColumnView): HTMLElement {
  const cell = made(host, 'th', headerCellStyle(column.isFixed))
  cell.setAttribute('data-column', column.column)
  if (column.isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
  const heading = made(host, 'span', '')
  heading.textContent = column.heading
  const filter = commandEntry(host, column.filterEntry)
  filter.setAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE, column.column)
  cell.replaceChildren(heading, filter)
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
  const box = made(host, 'div', FILTER_MENU_STYLE)
  box.setAttribute(SEARCH_FILTER_COLUMN_ATTRIBUTE, menu.column)
  const entries = made(host, 'div', FILTER_LINE_STYLE)
  entries.replaceChildren(...menu.entries.map((item) => anchoredEntry(host, item, anchors)))
  const choices =
    menu.kind === 'dates'
      ? [filterDateFields(host, menu, fontPx)]
      : menu.values.map((shown) => filterValueLine(host, shown, fontPx))
  box.replaceChildren(...choices, entries)
  return box
}

// see SJ-1, SV-17
/** @purity non-pure */
function bodyRowElement(host: Document, row: SearchRowView, columns: readonly SearchColumnView[]): HTMLElement {
  const line = made(host, 'tr', '')
  row.cells.forEach((text, at) => {
    const isJump = at === 0
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

// see SV-6, SV-16, SV-17, T-331
/** @purity non-pure */
export function searchTableElement(host: Document, view: SearchPanelView, fontPx: number): HTMLElement {
  const box = made(host, 'div', TABLE_BOX_STYLE)
  const table = made(host, 'table', TABLE_STYLE + `font-size:${fontPx}px;`)
  const head = made(host, 'thead', '')
  const headings = made(host, 'tr', '')
  headings.replaceChildren(...view.columns.map((column) => headerCellElement(host, column)))
  head.append(headings)
  const body = made(host, 'tbody', '')
  body.replaceChildren(...view.rows.map((row) => bodyRowElement(host, row, view.columns)))
  table.replaceChildren(head, body)
  box.append(table)
  return box
}

// see U-64, FR-151, T-330
/** @purity non-pure */
export function searchPanelElement(
  host: Document,
  view: SearchPanelView,
  placed: { readonly box: ScreenRect; readonly fontPx: number },
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const panel = part(host, 'div', SEARCH_PANEL_ROLE, boxStyle(placed.box) + panelStyle())
  const title = titleRowElement(host, view, anchors)
  if (view.shown === 'minimised') {
    panel.replaceChildren(title)
    return panel
  }
  const menu = view.filterMenu === null ? [] : [searchFilterMenuElement(host, view.filterMenu, placed.fontPx, anchors)]
  // TRAP: the table stays the last child; redrawInPlace replaces the last child as the table.
  panel.replaceChildren(title, wordFieldElement(host, view.word, placed.fontPx), ...menu, searchTableElement(host, view, placed.fontPx))
  return panel
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

interface PanelPlaced {
  readonly place: ScreenRect
  readonly box: ScreenRect
}

interface PointAsked {
  readonly x: number
  readonly y: number
  readonly first: Element | null
  readonly walked: ScreenPart | null
}

// see SV-9, SV-12, SV-13
/** @purity pure */
function panelPlacedOf(panel: SearchPanelView): PanelPlaced {
  const ratio = { width: NOT_STORED_SEARCH_PANEL_SIZES['S-421'], height: NOT_STORED_SEARCH_PANEL_SIZES['S-422'] }
  return { place: searchPanelPlaceOf(panel, ratio), box: searchPanelBoxOf(panel, ratio) }
}

// see T-337
/** @purity semi-pure-b */
function isInFrontOf(node: Element, layer: Element): boolean {
  let carrier: Element | null = node
  while (carrier !== null && carrier.getAttribute(SCREEN_Z_ORDER_ATTRIBUTE) === null) carrier = carrier.parentElement
  const front = SCREEN_Z_ORDER.indexOf(carrier?.getAttribute(SCREEN_Z_ORDER_ATTRIBUTE) ?? '')
  return front >= 0 && front < SCREEN_Z_ORDER.indexOf(layer.getAttribute(SCREEN_Z_ORDER_ATTRIBUTE) ?? '')
}

// see IF-9, GR-24, GR-25, SJ-1, T-023d
// WHY: an entrance, and anything drawn in front of the panel, answers alone; GR-24 is where no entrance sits.
/** @purity semi-pure-b */
function searchPanelPartAt(layer: Element, placed: PanelPlaced | null, asked: PointAsked): ScreenPart | null {
  const { x, y, first, walked } = asked
  if (placed === null || (walked !== null && walked.entry !== null)) return walked
  const isInPanel = first !== null && layer.contains(first)
  if (!isInPanel && first !== null && isInFrontOf(first, layer)) return walked
  const marks = isInPanel && first !== null ? searchMarksFrom(first, layer) : { jump: null, isOnBand: false }
  const region = marks.isOnBand ? 'headingBand' : edgeRegionAt(x, y, placed.box, SEARCH_PANEL_EDGE_PX)
  if (!isInPanel && region === null) return walked
  const base = isInPanel && walked !== null ? walked : panelPartOf()
  const grab = region === null ? {} : { searchPanelGrab: { region, panelBox: placed.place } }
  return { ...base, searchJumpTarget: marks.jump, ...grab }
}

// see SV-5, SV-10, SV-11
/** @purity non-pure */
function redrawInPlace(host: Document, drawnPanel: HTMLElement, panel: SearchPanelView, box: ScreenRect, tableFontPx: number | null): void {
  drawnPanel.setAttribute('style', boxStyle(box) + panelStyle())
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
function filterChangeWatch(layer: HTMLElement, onChanged: () => void): { readonly read: () => readonly SearchFilterChange[] } {
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
// WHY: the host is asked for the focus only while a panel stands; no panel, no focus to keep.
/** @purity non-pure */
function drawnKeepingFocus(host: Document, layer: Element, drawIt: () => void): void {
  const mark = (layer.firstElementChild ?? null) === null ? null : focusMarkIn(host, layer)
  drawIt()
  focusKeptIn(host, layer, mark)
}

// see SV-2, SV-5, IF-9
/** @purity non-pure */
function typedWordWatch(layer: HTMLElement, onWordTyped: () => void): { readonly read: () => string | null } {
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

// see FR-151, SV-5, SV-9, SV-16, IF-9
// TRAP: the table alone when nothing else moved; a rebuilt word field loses the caret and the typed word.
/** @purity non-pure */
export function searchPanelPainter(host: Document, layer: HTMLElement, onWordTyped: () => void) {
  let frameDrawn = ''
  let tableDrawn = ''
  let placed: PanelPlaced | null = null
  const typedWord = typedWordWatch(layer, onWordTyped)
  const filterChanges = filterChangeWatch(layer, onWordTyped)

  /** @purity non-pure */
  function draw(panel: SearchPanelView | null | undefined, isChanged: boolean, anchorsOf: () => Map<string, HTMLElement>): void {
    if (isChanged) drawnKeepingFocus(host, layer, () => drawPanel(panel, anchorsOf))
  }

  /** @purity non-pure */
  function drawPanel(panel: SearchPanelView | null | undefined, anchorsOf: () => Map<string, HTMLElement>): void {
    placed = panel === null || panel === undefined ? null : panelPlacedOf(panel)
    if (panel === null || panel === undefined || placed === null) {
      frameDrawn = ''
      layer.replaceChildren()
      return
    }
    const fontPx = searchPanelFontPxOf(panel.textSizeStep, NOT_STORED_SEARCH_PANEL_FONT_SIZES)
    // WHY: not the word: only typing changes it, and the typed field already holds it.
    const frameKey = JSON.stringify({ ...panel, rows: [], at: null, size: null, canvas: null, word: null })
    const tableKey = JSON.stringify([panel.rows, fontPx])
    const drawnPanel = layer.firstElementChild as HTMLElement | null
    const isTableKept = tableKey === tableDrawn
    tableDrawn = tableKey
    if (frameKey === frameDrawn && panel.shown !== 'minimised' && drawnPanel !== null) {
      redrawInPlace(host, drawnPanel, panel, placed.box, isTableKept ? null : fontPx)
      return
    }
    frameDrawn = frameKey
    const drawn = searchPanelElement(host, panel, { box: placed.box, fontPx }, anchorsOf())
    layer.replaceChildren(drawn)
    if (panel.shown !== 'minimised' && drawn.lastElementChild !== null) pinFixedColumns(drawn.lastElementChild)
  }

  return {
    draw,
    readWord: typedWord.read,
    readFilterChanges: filterChanges.read,
    answerAt: (asked: PointAsked): ScreenPart | null =>
      withFilterColumn(searchPanelPartAt(layer, placed, asked), asked.first, layer),
    isFocused: (): boolean => isInside(layer, (host as Partial<Document>).activeElement ?? null),
    focusWord: (): boolean => focusSearchWordIn(layer),
  }
}

/** @purity semi-pure-b */
function isInside(layer: Element, node: Element | null): boolean {
  return node !== null && layer.contains(node)
}

/** @purity pure */
function panelPartOf(): ScreenPart {
  return {
    part: SEARCH_PANEL_ROLE,
    entry: null,
    format: null,
    rowGroupId: null,
    resourceUid: null,
    dividerPanel: null,
    noticeDismissKey: null,
  }
}

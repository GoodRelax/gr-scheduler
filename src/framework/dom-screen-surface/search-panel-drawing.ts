// DomScreenSurface -- the Search Panel: its title row, word field and the shown table.
// @unit      UF-182  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type { SearchPanelView } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_SEARCH_PANEL_FONT_SIZES,
  NOT_STORED_SEARCH_PANEL_SIZES,
  PAINT,
  anchoredEntry,
  boxStyle,
  entranceOuterHeightPx,
  made,
  part,
} from './dom-screen-surface'

type SearchColumnView = SearchPanelView['columns'][number]

type SearchRowView = SearchPanelView['rows'][number]

const SEARCH_PANEL_ROLE = 'Search Panel'

export const SEARCH_PANEL_GRAB_ATTRIBUTE = 'data-search-panel-grab'

export const SEARCH_WORD_FIELD_ATTRIBUTE = 'data-search-word'

// see SV-2, IF-9
export const SEARCH_WORD_ROW = 'SV-2'

const FIELD_ROW_ATTRIBUTE = 'data-field-row'

export const SEARCH_JUMP_TASK_ATTRIBUTE = 'data-search-task'

export const SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE = 'data-search-comment-box'

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

/** @purity pure */
function cellStyle(): string {
  return `border:1px solid ${PAINT.rule};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 0.25em;`
}

/** @purity pure */
function headerCellStyle(): string {
  return `${cellStyle()}position:sticky;top:0;background:${PAINT.panel};`
}

// TRAP: left:0 until pinFixedColumns measures the drawn columns; a guessed width is no row's value (S-425).
/** @purity pure */
function fixedColumnStyle(): string {
  return `position:sticky;left:0;background:${PAINT.ground};`
}

const FIXED_COLUMN_ATTRIBUTE = 'data-fixed-column'

const JUMP_CELL_STYLE = 'cursor:pointer;'

// see SV-9, SV-12, SV-13
/** @purity pure */
export function searchPanelBoxOf(
  view: SearchPanelView,
  defaultRatio: { readonly width: number; readonly height: number },
): ScreenRect {
  const canvas = view.canvas
  if (view.shown === 'maximised') return canvas
  const size = view.size ?? { width: canvas.width * defaultRatio.width, height: canvas.height * defaultRatio.height }
  const at = view.at ?? { x: canvas.x, y: canvas.y + canvas.height - size.height }
  if (view.shown === 'normal') return { ...at, ...size }
  const titleHeight = entranceOuterHeightPx()
  return { x: at.x, y: at.y + size.height - titleHeight, width: size.width, height: titleHeight }
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

/** @purity non-pure */
function headerCellElement(host: Document, column: SearchColumnView): HTMLElement {
  const cell = made(host, 'th', headerCellStyle() + (column.isFixed ? fixedColumnStyle() : ''))
  cell.setAttribute('data-column', column.column)
  if (column.isFixed) cell.setAttribute(FIXED_COLUMN_ATTRIBUTE, 'true')
  cell.textContent = column.heading
  return cell
}

// see SJ-1, SV-17
/** @purity non-pure */
function bodyRowElement(host: Document, row: SearchRowView, columns: readonly SearchColumnView[]): HTMLElement {
  const line = made(host, 'tr', '')
  row.cells.forEach((text, at) => {
    const isJump = at === 0
    const fixed = columns[at]?.isFixed === true ? fixedColumnStyle() : ''
    const cell = made(host, 'td', cellStyle() + fixed + (isJump ? JUMP_CELL_STYLE : ''))
    cell.textContent = text
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
  panel.replaceChildren(title, wordFieldElement(host, view.word, placed.fontPx), searchTableElement(host, view, placed.fontPx))
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

// see FR-151, SV-5, SV-9, SV-16
// TRAP: the table alone when nothing else moved; a rebuilt word field loses the caret and the typed word.
/** @purity non-pure */
export function searchPanelPainter(host: Document, layer: HTMLElement) {
  let frameDrawn = ''

  /** @purity semi-pure-b */
  function isWordFocused(): boolean {
    const focused = (host as Partial<Document>).activeElement ?? null
    return focused !== null && layer.contains(focused) && focused.hasAttribute(SEARCH_WORD_FIELD_ATTRIBUTE)
  }

  /** @purity non-pure */
  function draw(
    panel: SearchPanelView | null | undefined,
    isChanged: boolean,
    anchorsOf: () => Map<string, HTMLElement>,
  ): void {
    if (!isChanged) return
    if (panel === null || panel === undefined) {
      frameDrawn = ''
      layer.replaceChildren()
      return
    }
    const fontPx = searchPanelFontPxOf(panel.textSizeStep, NOT_STORED_SEARCH_PANEL_FONT_SIZES)
    const frameKey = JSON.stringify({ ...panel, rows: [], word: isWordFocused() ? null : panel.word })
    const drawnTable = layer.firstElementChild?.lastElementChild ?? null
    if (frameKey === frameDrawn && panel.shown !== 'minimised' && drawnTable !== null) {
      const table = searchTableElement(host, panel, fontPx)
      drawnTable.replaceWith(table)
      pinFixedColumns(table)
      return
    }
    frameDrawn = frameKey
    const ratio = { width: NOT_STORED_SEARCH_PANEL_SIZES['S-421'], height: NOT_STORED_SEARCH_PANEL_SIZES['S-422'] }
    const drawn = searchPanelElement(host, panel, { box: searchPanelBoxOf(panel, ratio), fontPx }, anchorsOf())
    layer.replaceChildren(drawn)
    if (panel.shown !== 'minimised' && drawn.lastElementChild !== null) pinFixedColumns(drawn.lastElementChild)
  }

  return { draw, focusWord: (): boolean => focusSearchWordIn(layer) }
}

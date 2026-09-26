// DomScreenSurface -- the Search Panel: its title row, word field and the shown table.
// @unit      UF-182  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  SearchColumnView,
  SearchPanelView,
  SearchRowView,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  SEARCH_PANEL_TEXT_SIZE_ROWS,
  type SearchPanelTextSizeRow,
} from '../../use-case/advance-screen-session/advance-screen-session'
import {
  PAINT,
  anchoredEntry,
  boxStyle,
  entranceOuterHeightPx,
  made,
  part,
} from './dom-screen-surface'

const SEARCH_PANEL_ROLE = 'Search Panel'

export const SEARCH_PANEL_GRAB_ATTRIBUTE = 'data-search-panel-grab'

export const SEARCH_WORD_FIELD_ATTRIBUTE = 'data-search-word'

export const SEARCH_JUMP_TASK_ATTRIBUTE = 'data-search-task'

export const SEARCH_JUMP_COMMENT_BOX_ATTRIBUTE = 'data-search-comment-box'

const PANEL_STYLE =
  'box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;' +
  `background:${PAINT.ground};color:${PAINT.ink};box-shadow:0 0.5em 1.5em ${PAINT.shadow};`

const TITLE_ROW_STYLE = `display:flex;align-items:center;flex:none;background:${PAINT.panel};`

const HEADING_STYLE = 'padding:0 0.5em;white-space:nowrap;'

const TITLE_GAP_STYLE = 'flex:1;'

const WORD_FIELD_STYLE = 'flex:none;box-sizing:border-box;width:100%;'

const TABLE_BOX_STYLE = 'flex:1;overflow:auto;'

const TABLE_STYLE = 'border-collapse:collapse;'

const RULE = `1px solid ${PAINT.rule}`

const CELL_STYLE = `border:${RULE};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 0.25em;`

const HEADER_CELL_STYLE = `${CELL_STYLE}position:sticky;top:0;background:${PAINT.panel};`

const FIRST_COLUMN_STYLE = `position:sticky;left:0;background:${PAINT.ground};`

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
/** @purity pure */
export function searchPanelFontPxOf(
  textSizeStep: number,
  sizes: { readonly [R in SearchPanelTextSizeRow]: number },
): number {
  const row = SEARCH_PANEL_TEXT_SIZE_ROWS[textSizeStep]
  if (row === undefined) throw new RangeError(`table T-333 holds no step ${textSizeStep}`)
  return sizes[row]
}

// see SV-1
/** @purity non-pure */
function titleRowElement(host: Document, view: SearchPanelView, anchors: Map<string, HTMLElement>): HTMLElement {
  const row = made(host, 'div', TITLE_ROW_STYLE + `height:${entranceOuterHeightPx()}px;`)
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
  field.value = word
  return field
}

/** @purity non-pure */
function headerCellElement(host: Document, column: SearchColumnView, isFirst: boolean): HTMLElement {
  const cell = made(host, 'th', HEADER_CELL_STYLE + (isFirst ? FIRST_COLUMN_STYLE : ''))
  cell.setAttribute('data-column', column.column)
  cell.textContent = column.heading
  return cell
}

// see SJ-1, SV-17
/** @purity non-pure */
function bodyRowElement(host: Document, row: SearchRowView): HTMLElement {
  const line = made(host, 'tr', '')
  row.cells.forEach((text, at) => {
    const isJump = at === 0
    const cell = made(host, 'td', CELL_STYLE + (isJump ? FIRST_COLUMN_STYLE + JUMP_CELL_STYLE : ''))
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
  headings.replaceChildren(...view.columns.map((column, at) => headerCellElement(host, column, at === 0)))
  head.append(headings)
  const body = made(host, 'tbody', '')
  body.replaceChildren(...view.rows.map((row) => bodyRowElement(host, row)))
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
  const panel = part(host, 'div', SEARCH_PANEL_ROLE, boxStyle(placed.box) + PANEL_STYLE)
  const title = titleRowElement(host, view, anchors)
  if (view.shown === 'minimised') {
    panel.replaceChildren(title)
    return panel
  }
  panel.replaceChildren(title, wordFieldElement(host, view.word, placed.fontPx), searchTableElement(host, view, placed.fontPx))
  return panel
}

// see SV-2
/** @purity non-pure */
export function focusSearchWordIn(panel: HTMLElement): void {
  const field = panel.querySelector<HTMLInputElement>(`[${SEARCH_WORD_FIELD_ATTRIBUTE}]`)
  if (field === null) return
  field.focus()
  field.select()
}

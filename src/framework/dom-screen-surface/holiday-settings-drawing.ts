// DomScreenSurface -- the Holiday Settings surface (U-65): its fixed parts and the one list that scrolls.
// @unit      UF-205  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  HolidayExceptionLine,
  HolidaySettings,
  HolidaySettingsBody,
  HolidaySettingsCell,
  HolidaySettingsEntry,
  OpenModal,
} from '../../adapter/screen-renderer/screen-renderer'
import {
  NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES,
  NOT_STORED_WHEEL_UNITS,
  PAINT,
  STYLE,
  anchoredEntry,
  entranceBorderPx,
  made,
} from './dom-screen-surface'
import { surfaceFieldElement } from './properties-panel-drawing'

export type HolidaySettingsModal = HolidaySettings

interface HolidayDrawing {
  readonly host: Document
  readonly body: HolidaySettingsBody
  readonly anchors: Map<string, HTMLElement>
}

/** @purity pure */
export function isHolidaySettingsModal(modal: OpenModal): modal is HolidaySettingsModal {
  return 'holidaySettings' in modal
}

// see IF-9, WC-2, WC-4, WC-8
export const HOLIDAY_SETTINGS_TARGET_ATTRIBUTE = 'data-holiday-target'

const HOLIDAY_LIST_ATTRIBUTE = 'data-holiday-list'

// see RR-2, RR-6
// WHY: a column of fixed parts around one list that scrolls; the title row and IC-52 never scroll away.
/** @purity pure */
export function holidaySettingsFrameStyle(): string {
  return (
    `${STYLE.modal}display:flex;flex-direction:column;overflow:hidden;` +
    `font-size:${NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES['S-240']}em;`
  )
}

// see RR-5
// WHY: screen px with no scale at all (S-234, S-235, S-240): a 1px line scaled down misses the screen's pixels.
/** @purity pure */
function listRuleStyle(): string {
  return `${NOT_STORED_HOLIDAY_SETTINGS_LIST_SIZES['S-241']}px solid ${PAINT.rule}`
}

/** @purity pure */
function listBoxStyle(): string {
  return `flex:1 1 auto;min-height:0;overflow:auto;border-top:${listRuleStyle()};border-left:${listRuleStyle()};`
}

/** @purity pure */
function listGridStyle(columnCount: number): string {
  return `display:grid;grid-template-columns:repeat(${columnCount},max-content);width:max-content;`
}

// see RR-2, RR-4, RR-5
// WHY: sticky, so the heading row stays over the rows and the name column stays left while the rest passes under it.
/** @purity pure */
function listCellStyle(isHeading: boolean, isNameColumn: boolean): string {
  const sticky =
    (isHeading ? 'position:sticky;top:0;' : '') +
    (isNameColumn ? 'position:sticky;left:0;' : '') +
    `z-index:${(isHeading ? 2 : 0) + (isNameColumn ? 1 : 0)};`
  const ground = isHeading || isNameColumn ? `background:${PAINT.ground};` : ''
  const word = isHeading ? `color:${PAINT.quiet};` : ''
  return (
    `${sticky}${ground}${word}box-sizing:border-box;padding:0.125em 0.25em;display:flex;align-items:center;gap:0.25em;` +
    `border-right:${listRuleStyle()};border-bottom:${listRuleStyle()};`
  )
}

/** @purity pure */
function refusedOutlineStyle(isRefused: boolean): string {
  return isRefused ? `outline:${entranceBorderPx()}px solid ${PAINT.refusal};` : ''
}

// see T-016, WC-3, WC-4, WC-8, IN-6
// WHY: the panel's own field, so the surface's fields settle the way the panel's do (SK-19).
/** @purity non-pure */
function cellControlElement(host: Document, cell: HolidaySettingsCell): HTMLElement {
  const drawn = surfaceFieldElement(host, cell.row, cell.control)
  drawn.setAttribute('style', `${drawn.getAttribute('style') ?? ''}${refusedOutlineStyle(cell.isRefused)}`)
  drawn.setAttribute('data-refused', String(cell.isRefused))
  return drawn
}

// see WC-2, WC-4, IC-133, IC-137
/** @purity non-pure */
function entryElement(host: Document, entry: HolidaySettingsEntry, anchors: Map<string, HTMLElement>): HTMLElement {
  const drawn = anchoredEntry(host, entry.item, anchors)
  if (entry.word !== null) drawn.replaceChildren(entry.word)
  if (entry.target !== null) drawn.setAttribute(HOLIDAY_SETTINGS_TARGET_ATTRIBUTE, entry.target)
  return drawn
}

/** @purity non-pure */
function lineOf(host: Document, children: readonly (HTMLElement | string)[]): HTMLElement {
  const line = made(host, 'div', `${STYLE.field}align-items:center;flex-wrap:wrap;`)
  line.append(...children)
  return line
}

/** @purity non-pure */
function headingOf(host: Document, text: string): HTMLElement {
  const heading = made(host, 'div', `color:${PAINT.quiet};`)
  heading.textContent = text
  return heading
}

// see WC-10
/** @purity non-pure */
function refusalLines(host: Document, refusals: readonly string[]): readonly HTMLElement[] {
  return refusals.map((said) => {
    const line = made(host, 'div', `color:${PAINT.refusal};`)
    line.setAttribute('data-refusal', 'true')
    line.textContent = said
    return line
  })
}

/** @purity non-pure */
function workingHoursElement(drawing: HolidayDrawing): HTMLElement {
  const { host, body, anchors } = drawing
  const table = made(host, 'div', `display:grid;grid-template-columns:repeat(${body.workingHoursColumns.length + 1},max-content);gap:0.25em;align-items:center;`)
  table.append(...body.workingHoursColumns.map((column) => headingOf(host, column)), made(host, 'span', ''))
  for (const line of body.workingTimes) {
    table.append(cellControlElement(host, line.from), cellControlElement(host, line.to), entryElement(host, line.remove, anchors))
  }
  return table
}

// see WC-2, WC-3, WC-8, WC-9, WC-10, RR-2
/** @purity non-pure */
function upperPartElement(drawing: HolidayDrawing): HTMLElement {
  const { host, body, anchors } = drawing
  const upper = made(host, 'div', 'flex:none;')
  const weekdays = body.weekdays.map((one) => entryElement(host, one, anchors))
  const otherHours = body.otherHoursLine === null ? [] : [lineOf(host, [body.otherHoursLine])]
  upper.append(
    headingOf(host, body.weekdaysHeading),
    lineOf(host, weekdays),
    lineOf(host, [headingOf(host, body.weekStartName), cellControlElement(host, body.weekStart)]),
    headingOf(host, body.workingHoursHeading),
    workingHoursElement(drawing),
    lineOf(host, [entryElement(host, body.addWorkingTime, anchors)]),
    ...otherHours,
    ...refusalLines(host, body.upperRefusals),
    headingOf(host, body.exceptionsHeading),
  )
  return upper
}

/** @purity non-pure */
function exceptionCells(host: Document, line: HolidayExceptionLine, anchors: Map<string, HTMLElement>): readonly HTMLElement[] {
  const name = cellControlElement(host, line.name)
  if (line.from === null || line.to === null || line.kind === null) {
    const word = made(host, 'span', `color:${PAINT.quiet};`)
    word.textContent = line.repeatingText ?? ''
    return [name, word, made(host, 'span', ''), made(host, 'span', ''), entryElement(host, line.remove, anchors)]
  }
  return [
    name,
    cellControlElement(host, line.from),
    cellControlElement(host, line.to),
    entryElement(host, line.kind, anchors),
    entryElement(host, line.remove, anchors),
  ]
}

/** @purity non-pure */
function listCell(host: Document, child: HTMLElement | string, isHeading: boolean, isNameColumn: boolean): HTMLElement {
  const cell = made(host, 'div', listCellStyle(isHeading, isNameColumn))
  cell.append(child)
  return cell
}

// see RR-2, RR-3, RR-4, RR-5, WC-4, WC-5
/** @purity non-pure */
function exceptionListElement(drawing: HolidayDrawing): HTMLElement {
  const { host, body, anchors } = drawing
  const box = made(host, 'div', listBoxStyle())
  box.setAttribute(HOLIDAY_LIST_ATTRIBUTE, 'true')
  const columnCount = body.exceptionColumns.length
  const grid = made(host, 'div', listGridStyle(columnCount))
  grid.append(...body.exceptionColumns.map((column, at) => listCell(host, column, true, at === 0)))
  for (const line of body.exceptions) {
    const cells = exceptionCells(host, line, anchors).slice(0, columnCount)
    grid.append(...cells.map((cell, at) => listCell(host, cell, false, at === 0)))
  }
  box.append(grid)
  scrollSidewaysOnTheList(box)
  return box
}

/** @purity non-pure */
function lowerPartElement(drawing: HolidayDrawing): HTMLElement {
  const { host, body, anchors } = drawing
  const lower = made(host, 'div', 'flex:none;')
  lower.append(
    ...refusalLines(host, body.lowerRefusals),
    lineOf(host, [entryElement(host, body.addException, anchors)]),
    lineOf(host, [entryElement(host, body.apply, anchors)]),
  )
  return lower
}

// see U-65, T-344, RR-2
/** @purity non-pure */
export function holidaySettingsBodyElements(
  host: Document,
  modal: HolidaySettingsModal,
  anchors: Map<string, HTMLElement>,
): readonly HTMLElement[] {
  const drawing = { host, body: modal.holidaySettings, anchors }
  return [upperPartElement(drawing), exceptionListElement(drawing), lowerPartElement(drawing)]
}

const WHEEL_MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }

/** @purity semi-pure-b */
function wheelPxOf(wheel: WheelEvent, list: HTMLElement): number {
  const turned = wheel.deltaX !== 0 ? wheel.deltaX : wheel.deltaY
  if (wheel.deltaMode === wheel.DOM_DELTA_PAGE) return turned * list.clientWidth
  if (wheel.deltaMode === wheel.DOM_DELTA_LINE) return turned * NOT_STORED_WHEEL_UNITS['S-514']
  return turned
}

// see RR-3, MK-5, T-023
// WHY: stopped here, before the window hears it, so the schedule behind never moves (RR-3); the only wheel a surface keeps.
/** @purity non-pure */
function scrollSidewaysOnTheList(list: HTMLElement): void {
  if (typeof list.addEventListener !== 'function') return
  list.addEventListener(
    'wheel',
    (event: Event) => {
      const wheel = event as WheelEvent
      if (!wheel.ctrlKey || !wheel.shiftKey || wheel.altKey || wheel.metaKey) return
      wheel.preventDefault()
      wheel.stopPropagation()
      list.scrollLeft += wheelPxOf(wheel, list)
    },
    WHEEL_MAY_STOP_DEFAULT,
  )
}

type ListScroll = { readonly top: number; readonly left: number } | null

/** @purity semi-pure-b */
function listOf(drawn: Element | null): Element | null {
  return drawn?.querySelector?.(`[${HOLIDAY_LIST_ATTRIBUTE}]`) ?? null
}

/** @purity semi-pure-b */
function listScrollOf(drawn: Element | null): ListScroll {
  const list = listOf(drawn)
  return list === null ? null : { top: list.scrollTop, left: list.scrollLeft }
}

/** @purity non-pure */
function keepListScroll(drawn: Element | null, scroll: ListScroll): void {
  const list = listOf(drawn)
  if (list === null || scroll === null) return
  list.scrollTop = scroll.top
  list.scrollLeft = scroll.left
}

// see RR-2, RR-3
// WHY: each settled field redraws the surface; the list keeps its scroll, or every edit jumps to the top.
/** @purity non-pure */
export function replaceKeepingListScroll(layer: Element, drawn: readonly HTMLElement[]): void {
  const scroll = listScrollOf(layer.firstElementChild)
  layer.replaceChildren(...drawn)
  keepListScroll(layer.firstElementChild, scroll)
}

// DomScreenSurface -- the frame every window of table T-335 shares: its title row, and the title band and edge grabs.
// @unit      UF-191  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import {
  windowEdgeAt,
  type CommandItem,
  type ScreenPart,
  type WindowShown,
} from '../../adapter/screen-renderer/screen-renderer'
import type { WindowName } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_HELP_SIZES,
  PAINT,
  SCREEN_Z_ORDER,
  SCREEN_Z_ORDER_ATTRIBUTE,
  anchoredEntry,
  entranceOuterHeightPx,
  made,
} from './dom-screen-surface'

export const WINDOW_GRAB_ATTRIBUTE = 'data-window-grab'

const HEADING_STYLE = 'padding:0 0.5em;white-space:nowrap;'

const TITLE_GAP_STYLE = 'flex:1;'

type WindowGrab = NonNullable<ScreenPart['windowGrab']>

// see WB-1, WB-3
export interface PlacedWindow {
  readonly window: WindowName
  readonly shown: WindowShown
  readonly place: ScreenRect
  readonly box: ScreenRect
  readonly range: ScreenRect
}

export interface PointAsked {
  readonly x: number
  readonly y: number
  readonly first: Element | null
  readonly walked: ScreenPart | null
}

/** @purity pure */
function titleRowStyle(): string {
  return `display:flex;align-items:center;flex:none;background:${PAINT.panel};height:${entranceOuterHeightPx()}px;`
}

// see WB-7, SV-1, SV-16, GR-24
/** @purity non-pure */
export function windowTitleRowElement(
  host: Document,
  heading: string,
  entries: { readonly before: readonly CommandItem[]; readonly titled: readonly CommandItem[] },
  anchors: Map<string, HTMLElement>,
  surface: string,
  headingFontPx?: number,
): HTMLElement {
  const row = made(host, 'div', titleRowStyle())
  row.setAttribute(WINDOW_GRAB_ATTRIBUTE, 'true')
  const title = made(host, 'span', HEADING_STYLE + (headingFontPx === undefined ? '' : `font-size:${headingFontPx}px;`))
  title.textContent = heading
  const before = entries.before.map((item) => anchoredEntry(host, item, anchors, surface))
  const titled = entries.titled.map((item) => anchoredEntry(host, item, anchors, surface))
  row.replaceChildren(title, ...before, made(host, 'span', TITLE_GAP_STYLE), ...titled)
  return row
}

/** @purity semi-pure-b */
function zOrderAt(node: Element): number {
  let carrier: Element | null = node
  while (carrier !== null && carrier.getAttribute(SCREEN_Z_ORDER_ATTRIBUTE) === null) carrier = carrier.parentElement
  return SCREEN_Z_ORDER.indexOf(carrier?.getAttribute(SCREEN_Z_ORDER_ATTRIBUTE) ?? '')
}

// see T-337
/** @purity semi-pure-b */
function isInFrontOf(node: Element, window: Element): boolean {
  const front = zOrderAt(node)
  return front >= 0 && front < zOrderAt(window)
}

/** @purity semi-pure-b */
function isOnTitleBand(start: Element, window: Element): boolean {
  for (let node: Element | null = start; node !== null && node !== window; node = node.parentElement) {
    if (node.getAttribute(WINDOW_GRAB_ATTRIBUTE) !== null) return true
  }
  return false
}

// see IF-9, GR-24, GR-25, WB-8, WB-9
// WHY: a maximized window neither moves nor resizes, and only a normal one has an edge (GR-25).
/** @purity semi-pure-b */
function windowGrabAt(window: Element, placed: PlacedWindow, asked: PointAsked): WindowGrab | null {
  const { x, y, first } = asked
  if (placed.shown === 'maximized') return null
  const floor = { width: NOT_STORED_HELP_SIZES['S-423'], height: NOT_STORED_HELP_SIZES['S-424'] }
  const grabbed = { window: placed.window, windowBox: placed.place, range: placed.range, floor }
  if (first !== null && window.contains(first) && isOnTitleBand(first, window)) return { ...grabbed, region: 'titleBand' }
  if (placed.shown !== 'normal') return null
  const edge = windowEdgeAt(x, y, placed.box, NOT_STORED_HELP_SIZES['S-426'])
  return edge === null ? null : { ...grabbed, region: edge }
}

// see IF-9, GR-24, GR-25, T-023d
// WHY: an entrance, and anything drawn in front of the window, answers alone; GR-24 is where no entrance sits.
/** @purity semi-pure-b */
export function windowPartAt(
  window: Element | null,
  placed: PlacedWindow | null,
  asked: PointAsked,
  partOfWindow: ScreenPart,
): ScreenPart | null {
  const { first, walked } = asked
  if (window === null || placed === null || (walked !== null && walked.entry !== null)) return walked
  const isInWindow = first !== null && window.contains(first)
  if (!isInWindow && first !== null && isInFrontOf(first, window)) return walked
  const grab = windowGrabAt(window, placed, asked)
  if (!isInWindow && grab === null) return walked
  const base = isInWindow && walked !== null ? walked : partOfWindow
  return grab === null ? base : { ...base, windowGrab: grab }
}

/** @purity pure */
export function windowPartOf(part: string): ScreenPart {
  return { part, entry: null, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null }
}

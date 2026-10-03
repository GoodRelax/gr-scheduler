// The box of a window of table T-335: where it stands, and where a grab of its title row or edge leaves it.
// @unit      UF-189  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { SearchPanelSession } from '../../use-case/advance-screen-session/advance-screen-session'

export type WindowShown = 'normal' | 'minimised' | 'maximised'

// see WB-6, S-419, S-455, S-456
export type WindowPlace = Pick<SearchPanelSession, 'at' | 'size'>

export const DEFAULT_WINDOW_PLACE: WindowPlace = { at: null, size: null }

export type WindowEdge = 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

// see GR-24, GR-25
export type WindowGrabRegion = 'titleBand' | WindowEdge

// see S-423, S-424
export interface WindowFloor {
  readonly width: number
  readonly height: number
}

interface Span {
  readonly start: number
  readonly end: number
}

type SpanSide = 'start' | 'end' | null

const EDGE_SIDES: { readonly [E in WindowEdge]: readonly [SpanSide, SpanSide] } = {
  top: [null, 'start'],
  bottom: [null, 'end'],
  left: ['start', null],
  right: ['end', null],
  topLeft: ['start', 'start'],
  topRight: ['end', 'start'],
  bottomLeft: ['start', 'end'],
  bottomRight: ['end', 'end'],
}

type EdgeSide = 'start' | 'end' | 'middle'

const EDGE_AT: { readonly [Down in EdgeSide]: { readonly [Across in EdgeSide]: WindowEdge | null } } = {
  start: { start: 'topLeft', middle: 'top', end: 'topRight' },
  middle: { start: 'left', middle: null, end: 'right' },
  end: { start: 'bottomLeft', middle: 'bottom', end: 'bottomRight' },
}

// WHY: the low end wins when a range is narrower than what must fit, so a window never starts left of its range.
/** @purity pure */
function withinSpan(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high))
}

/** @purity pure */
function spansOf(box: ScreenRect): readonly [Span, Span] {
  return [
    { start: box.x, end: box.x + box.width },
    { start: box.y, end: box.y + box.height },
  ]
}

/** @purity pure */
function boxOfSpans(xs: Span, ys: Span): ScreenRect {
  return { x: xs.start, y: ys.start, width: xs.end - xs.start, height: ys.end - ys.start }
}

/** @purity pure */
function spanMoved(span: Span, travel: number, within: Span): Span {
  const length = span.end - span.start
  const start = withinSpan(span.start + travel, within.start, within.end - length)
  return { start, end: start + length }
}

/** @purity pure */
function spanAfterEdge(span: Span, side: SpanSide, travel: number, within: Span, floor: number): Span {
  if (side === 'start') return { start: withinSpan(span.start + travel, within.start, span.end - floor), end: span.end }
  if (side === 'end') return { start: span.start, end: withinSpan(span.end + travel, span.start + floor, within.end) }
  return span
}

// see WB-8, WB-9, GR-24, GR-25
/** @purity pure */
export function windowBoxAfterGrab(
  region: WindowGrabRegion,
  box: ScreenRect,
  travel: { readonly dx: number; readonly dy: number },
  range: ScreenRect,
  floor: WindowFloor,
): ScreenRect {
  const [xs, ys] = spansOf(box)
  const [rangeXs, rangeYs] = spansOf(range)
  if (region === 'titleBand') return boxOfSpans(spanMoved(xs, travel.dx, rangeXs), spanMoved(ys, travel.dy, rangeYs))
  const [xSide, ySide] = EDGE_SIDES[region]
  return boxOfSpans(
    spanAfterEdge(xs, xSide, travel.dx, rangeXs, floor.width),
    spanAfterEdge(ys, ySide, travel.dy, rangeYs, floor.height),
  )
}

// WHY: a held place is fitted again on every frame, so a smaller range never leaves the window outside.
/** @purity pure */
export function windowPlaceInRange(place: WindowPlace, range: ScreenRect): WindowPlace {
  const held = place.size
  const size = held === null ? null : { width: Math.min(held.width, range.width), height: Math.min(held.height, range.height) }
  if (place.at === null) return { at: null, size }
  const [rangeXs, rangeYs] = spansOf(range)
  const x = spanMoved({ start: place.at.x, end: place.at.x + (size?.width ?? 0) }, 0, rangeXs)
  const y = spanMoved({ start: place.at.y, end: place.at.y + (size?.height ?? 0) }, 0, rangeYs)
  return { at: { x: x.start, y: y.start }, size }
}

/** @purity pure */
export function windowPlaceOf(box: ScreenRect): WindowPlace {
  return { at: { x: box.x, y: box.y }, size: { width: box.width, height: box.height } }
}

// see WB-1, WB-2, WB-3
/** @purity pure */
export function windowBoxOf(
  shown: WindowShown,
  normalBox: ScreenRect,
  range: ScreenRect,
  titleHeight: number,
): ScreenRect {
  if (shown === 'maximised') return range
  if (shown === 'normal') return normalBox
  return { x: normalBox.x, y: normalBox.y + normalBox.height - titleHeight, width: normalBox.width, height: titleHeight }
}

// see WB-1, SV-9
/** @purity pure */
export function windowNormalBoxOf(place: WindowPlace, defaultBox: ScreenRect, range: ScreenRect): ScreenRect {
  const fitted = windowPlaceInRange(place, range)
  const size = fitted.size ?? { width: defaultBox.width, height: defaultBox.height }
  const at = fitted.at ?? { x: defaultBox.x, y: defaultBox.y }
  return { ...at, ...size }
}

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
export function windowEdgeAt(x: number, y: number, box: ScreenRect, reach: number): WindowEdge | null {
  const across = edgeSideOf(x, box.x, box.x + box.width, reach)
  const down = edgeSideOf(y, box.y, box.y + box.height, reach)
  return across === null || down === null ? null : EDGE_AT[down][across]
}

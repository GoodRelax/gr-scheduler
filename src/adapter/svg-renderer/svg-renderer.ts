// SvgRenderer -- turns the schedule geometry into one SVG string.
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  MarkerGeometry,
  Path,
  Point,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  tickStrideOf,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'

export type { SvgSurface } from './svg-surface'

// STOP: spec does not decide how the export road says not to draw dummies. Looked in EP-14, T-076
// @provisional PND-210
export type SchedulePicture = 'screen' | 'export'

// see DC-2, DC-8
export interface DualCursorFollow {
  readonly side: 'date1' | 'date2'
  // STOP: spec does not decide whether the following line snaps to a day, nor where it stands
  // with no pointer. Looked in DC-2, DC-8
  // @provisional PND-310 @provisional PND-311
  readonly x: number | null
}

// see FR-020
export interface Watermark {
  readonly openedBy: string
  readonly stampedAt: string
}

interface Paint {
  readonly stroke: string
  readonly fill: string
  readonly strokeWidth: number
}

// STOP: spec does not decide an annotation's default colour; this hue is S-159's, which FR-019 avoids.
// Looked in FR-019, T-236
// @provisional PND-1
const ANNOTATION_COLOUR = '#b45309'

// STOP: spec does not decide the fade grab point's face and outline colours. Looked in FR-075, T-210, T-236
// @provisional PND-1
const FADE_HANDLE_FILL_COLOUR = '#ffffff'
const FADE_HANDLE_STROKE_COLOUR = '#374151'

const OFF_SCREEN_SIDE_MARGIN = 0.25

/** @purity pure */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// see NS-3
/** @purity pure */
function rounded(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

// TRAP: key by the document's id, never an array index: a delete or a sideways scroll moves an index.
/** @purity pure */
function figureKey(key: string): string {
  return ` data-figure="${escaped(key)}"`
}

/** @purity pure */
function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/** @purity pure */
function boxOfPoints(path: Path): ScreenRect | null {
  const first = path[0]
  if (first === undefined) return null
  let left = first.x
  let right = first.x
  let top = first.y
  let bottom = first.y
  for (const one of path) {
    left = Math.min(left, one.x)
    right = Math.max(right, one.x)
    top = Math.min(top, one.y)
    bottom = Math.max(bottom, one.y)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** @purity pure */
function cornersOfBar(bar: BarGeometry): Path {
  if (bar.form === 'outline') return bar.points
  const out = [bar.from, bar.to, ...(bar.head ?? [])]
  for (const dot of bar.dots) {
    out.push({ x: dot.at.x - dot.radius, y: dot.at.y - dot.radius })
    out.push({ x: dot.at.x + dot.radius, y: dot.at.y + dot.radius })
  }
  return out
}

// see FR-009
/** @purity pure */
function barMaskRectSvg(box: ScreenRect, key: string): string {
  return (
    `<rect x="${rounded(box.x)}" y="${rounded(box.y)}"` +
    ` width="${rounded(box.width)}" height="${rounded(box.height)}" fill="black"` +
    `${figureKey(key)}/>`
  )
}

/** @purity pure */
function cornersAround(centre: Point, width: number, height: number): Path {
  const halfWidth = width / 2
  const halfHeight = height / 2
  return [
    { x: centre.x - halfWidth, y: centre.y - halfHeight },
    { x: centre.x + halfWidth, y: centre.y - halfHeight },
    { x: centre.x + halfWidth, y: centre.y + halfHeight },
    { x: centre.x - halfWidth, y: centre.y + halfHeight },
  ]
}

// TRAP: x and y scale separately, safe only for square boxes; otherwise a circle turns into an ellipse.
/** @purity pure */
function pathFitted(path: Path, from: ScreenRect, to: ScreenRect): Path {
  const scaleX = to.width / from.width
  const scaleY = to.height / from.height
  return path.map((one) => ({
    x: to.x + (one.x - from.x) * scaleX,
    y: to.y + (one.y - from.y) * scaleY,
  }))
}

// see FR-043
/** @purity pure */
function dummyFigure(
  milestone: BarGeometry | null,
  centre: Point,
  width: number,
  height: number,
): BarGeometry {
  const box: ScreenRect = {
    x: centre.x - width / 2,
    y: centre.y - height / 2,
    width,
    height,
  }
  const rectangle: BarGeometry = { form: 'outline', points: cornersAround(centre, width, height) }
  if (milestone === null || milestone.form !== 'outline') return rectangle
  const from = boxOfPoints(milestone.points)
  if (from === null || from.width <= 0 || from.height <= 0) return rectangle
  return {
    form: 'outline',
    points: pathFitted(milestone.points, from, box),
    marks: (milestone.marks ?? []).map((one) => pathFitted(one, from, box)),
  }
}

// see SL-8
/** @purity pure */
function selectionFrameSvg(box: ScreenRect, colour: string, key: string): string {
  const stroke = NOT_STORED_SELECTION_SIZES['S-174']
  const [on, off] = NOT_STORED_SELECTION_SIZES['S-175']
  const width = Math.max(box.width, stroke)
  const height = Math.max(box.height, stroke)
  return (
    `<rect x="${rounded(box.x - (width - box.width) / 2)}"` +
    ` y="${rounded(box.y - (height - box.height) / 2)}"` +
    ` width="${rounded(width)}" height="${rounded(height)}"` +
    ` fill="none" stroke="${colour}" stroke-width="${rounded(stroke)}"` +
    ` stroke-dasharray="${rounded(on)} ${rounded(off)}"${figureKey(key)}/>`
  )
}

// see SL-8, DC-8
/** @purity pure */
function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
}

// see FR-041
/** @purity pure */
function achromatic(colour: string): string {
  const asHsl = /^hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (asHsl !== null) return `hsl(0 0% ${asHsl[1] as string}%)`
  const asHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim())
  if (asHex === null) return colour
  const digits = asHex[1] as string
  const wide = digits.length === 3 ? digits.replace(/./g, (one) => one + one) : digits
  const channels = [0, 2, 4].map((at) => parseInt(wide.slice(at, at + 2), 16) / 255)
  const lightness = (Math.max(...channels) + Math.min(...channels)) / 2
  return `hsl(0 0% ${rounded(lightness * 100)}%)`
}

// see T-236, FR-041
/** @purity pure */
export function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

export const GROUP_GRID_LINE_WIDTH_PX = 1

/** @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

// see FR-042
/** @purity pure */
function bandRowOf(depth: number, position: number): string {
  if (depth === 1) return 'S-166'
  return position % 2 === 0 ? 'S-164' : 'S-167'
}

// see FR-007, FR-041
/** @purity pure */
function paintOf(
  chosenStroke: string | null,
  chosenFill: string | null,
  themedStroke: string,
  themedFill: string,
  monochrome: boolean,
  strokeWidth: number,
): Paint {
  const stroke = chosenStroke === null ? themedStroke : chosenStroke
  const fill = chosenFill === null ? themedFill : chosenFill
  return {
    stroke: monochrome ? achromatic(stroke) : stroke,
    fill: monochrome ? achromatic(fill) : fill,
    strokeWidth,
  }
}

// see ZO-3, T-021, FR-013
/** @purity pure */
function markerSvg(
  marker: MarkerGeometry,
  ink: string,
  backing: string,
  faintness: number,
  settings: DocumentSettings,
  key: string,
): string {
  const { centre, radius } = marker
  const named = figureKey(key)
  const stroke = rounded(settings.markerStroke)
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="${backing}" stroke="${ink}" stroke-width="${stroke}"${named}/>`
  const r = radius * 0.5
  const mark =
    marker.symbol === 'PM-1a'
      ? `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius * 0.18)}" fill="${ink}"${named}/>`
      : marker.symbol === 'PM-2'
        ? `<polyline points="${rounded(centre.x - r)},${rounded(centre.y)}` +
          ` ${rounded(centre.x - r * 0.2)},${rounded(centre.y + r * 0.7)}` +
          ` ${rounded(centre.x + r)},${rounded(centre.y - r * 0.7)}"` +
          ` fill="none" stroke="${ink}" stroke-width="${stroke}"${named}/>`
        : marker.symbol === 'PM-3'
          ? `<line x1="${rounded(centre.x - r * 0.6)}" y1="${rounded(centre.y + r)}` +
            `" x2="${rounded(centre.x + r * 0.6)}" y2="${rounded(centre.y - r)}"` +
            ` stroke="${ink}" stroke-width="${stroke}"${named}/>`
          : marker.symbol === 'PM-4'
            ? `<line x1="${rounded(centre.x)}" y1="${rounded(centre.y - r)}` +
              `" x2="${rounded(centre.x)}" y2="${rounded(centre.y + r * 0.35)}"` +
              ` stroke="${ink}" stroke-width="${stroke}"${named}/>` +
              `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y + r * 0.8)}"` +
              ` r="${rounded(radius * 0.12)}" fill="${ink}"${named}/>`
            : ''
  const drawn = disc + mark
  // TRAP: one group opacity, not one per shape: overlapping translucent shapes darken the symbol past S-131.
  if (marker.symbol !== 'PM-1a') return drawn
  return `<g opacity="${rounded(faintness)}"${named}>${drawn}</g>`
}

// see FR-044, LF-13
/** @purity pure */
function resumeSvg(
  arm: Path,
  head: Path,
  ink: string,
  settings: DocumentSettings,
  key: string,
): string {
  const named = figureKey(key)
  return (
    `<polyline points="${pointsOf(arm)}" fill="none" stroke="${ink}"` +
    ` stroke-width="${rounded(settings.markerStroke)}"` +
    ` stroke-dasharray="${rounded(settings.resumeDashOn)} ${rounded(settings.resumeDashOff)}"` +
    `${named}/>` +
    `<polygon points="${pointsOf(head)}" fill="${ink}"${named}/>`
  )
}

// see ZO-5, FR-077
/** @purity pure */
function labelSvg(
  box: ScreenRect,
  text: string,
  fontSize: number,
  settings: DocumentSettings,
  ink: string,
  halo: string,
  padLeft: number,
  key: string,
  anchor: 'start' | 'end' = 'start',
): string {
  const x = anchor === 'end' ? box.x + box.width : box.x + padLeft
  const y = box.y + box.height / 2 + fontSize * settings.labelBaseline
  const haloWidth = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    (anchor === 'end' ? ' text-anchor="end"' : '') +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
    // TRAP: paint-order="stroke" puts the halo under the glyph; without it the label is painted in its own outline.
    ` paint-order="stroke" xml:space="preserve"${figureKey(key)}>${escaped(text)}</text>`
  )
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint, key: string): string {
  const named = figureKey(key)
  if (bar.form === 'outline') {
    const marks = bar.marks ?? []
    if (marks.length === 0) {
      return (
        `<polygon points="${pointsOf(bar.points)}" fill="${paint.fill}"` +
        ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"${named}/>`
      )
    }
    // WHY: one evenodd path, not shapes on top: the marks cut through, so no guessed paint or extra colour row.
    const subpaths = [bar.points, ...marks]
      .map((one) => `M${pointsOf(one).replace(/ /g, 'L')}Z`)
      .join('')
    return (
      `<path d="${subpaths}" fill-rule="evenodd" fill="${paint.fill}"` +
      ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"${named}/>`
    )
  }
  const line =
    `<line x1="${rounded(bar.from.x)}" y1="${rounded(bar.from.y)}"` +
    ` x2="${rounded(bar.to.x)}" y2="${rounded(bar.to.y)}"` +
    ` stroke="${paint.stroke}" stroke-width="${rounded(bar.strokeWidth)}"${named}/>`
  const head =
    bar.head === null
      ? ''
      : `<polygon points="${pointsOf(bar.head)}" fill="${paint.stroke}"${named}/>`
  const dots = bar.dots
    .map(
      (dot) =>
        `<circle cx="${rounded(dot.at.x)}" cy="${rounded(dot.at.y)}"` +
        ` r="${rounded(dot.radius)}" fill="${paint.stroke}"${named}/>`,
    )
    .join('')
  return line + head + dots
}

// see GD-6
/** @purity pure */
function dependencyArrowSvg(id: string, length: number, colour: string): string {
  const half = length / 2
  return (
    `<defs><marker id="${id}" viewBox="0 0 ${rounded(length)} ${rounded(length)}"` +
    ` refX="${rounded(length)}" refY="${rounded(half)}"` +
    ` markerWidth="${rounded(length)}" markerHeight="${rounded(length)}"` +
    ` markerUnits="userSpaceOnUse" orient="auto">` +
    `<path d="M0,0 L${rounded(length)},${rounded(half)} L0,${rounded(length)} Z"` +
    ` fill="${colour}"/></marker></defs>`
  )
}

// TRAP: SVG ids are document-wide; an id not unique to the picture collides when an export
// is drawn into the screen's document.
/** @purity pure */
function pictureId(seed: string): string {
  let hash = 0x811c9dc5
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// see T-238
type RulerRow = 'year' | 'yearMonth' | 'month' | 'week' | 'day' | 'weekday'

const ROWS_OF_TIER: { readonly [tier in ScheduleLayout['tier']]: readonly RulerRow[] } = {
  year: ['year'],
  yearMonth: ['year', 'month'],
  yearMonthWeek: ['yearMonth', 'week'],
  yearMonthDayWeekday: ['yearMonth', 'day', 'weekday'],
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
function dayOfSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
function weekdayOf(day: CalendarDay): number {
  return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
}

/** @purity pure */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

// see LF-1
/** @purity pure */
function ticksOfRow(
  row: RulerRow,
  layout: ScheduleLayout,
  stride: number,
  weekStart: number,
  from: CalendarDay,
  right: number,
  cap: number,
): readonly CalendarDay[] {
  const out: CalendarDay[] = []
  const firstSerial = serialOf(from)
  // TRAP: anchor the stride on the day serial, not the left edge, or every label jumps on a one-day pan.
  let at: CalendarDay =
    row === 'year'
      ? { year: from.year, month: 1, day: 1 }
      : row === 'yearMonth' || row === 'month'
        ? { year: from.year, month: from.month, day: 1 }
        : row === 'week'
          ? dayOfSerial(firstSerial - ((weekdayOf(from) - weekStart + 7) % 7))
          : dayOfSerial(Math.floor(firstSerial / stride) * stride)
  for (let step = 0; step <= cap; step++) {
    if (xFromDay(layout, at) >= right) break
    out.push(at)
    at =
      row === 'year'
        ? { year: at.year + 1, month: 1, day: 1 }
        : row === 'yearMonth' || row === 'month'
          ? { year: at.month === 12 ? at.year + 1 : at.year, month: (at.month % 12) + 1, day: 1 }
          : dayOfSerial(serialOf(at) + (row === 'week' ? 7 : stride))
  }
  return out
}

// see FR-017
/** @purity pure */
function rulerSvg(
  layout: ScheduleLayout,
  settings: DocumentSettings,
  band: ScreenRect,
  weekStart: number,
  ground: string,
  ink: string,
  rule: string,
  weekdayWords: readonly string[],
): readonly string[] {
  if (band.width <= 0 || band.height <= 0) return []
  const from = dateAtX(layout, band.x)
  if (from === null) return []

  const rows = ROWS_OF_TIER[layout.tier]
  const rowHeight = band.height / rows.length
  const right = band.x + band.width
  const stride = tickStrideOf(layout, settings)
  const cap = Math.ceil(band.width / Math.max(0.001, layout.pxPerDay)) + 1
  const out: string[] = []
  out.push(
    `<rect x="${rounded(band.x)}" y="${rounded(band.y)}"` +
      ` width="${rounded(band.width)}" height="${rounded(band.height)}"` +
      ` fill="${ground}"${figureKey('ruler-ground')}/>`,
  )

  for (const [index, row] of rows.entries()) {
    const top = band.y + index * rowHeight
    const baseline =
      top + settings.rulerLabelPad + settings.rulerFont - settings.rulerLabelBottomPad
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"${figureKey(`ruler-${row}-rule`)}/>`,
      )
    }
    for (const day of ticksOfRow(row, layout, stride, weekStart, from, right, cap)) {
      const x = xFromDay(layout, day)
      // TRAP: skip only the rule left of the band, never the label: the year row would go empty.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      const label =
        row === 'year'
          ? String(day.year)
          : row === 'yearMonth'
            ? `${day.year}-${twoDigits(day.month)}`
            : row === 'month'
              ? String(day.month)
              : row === 'weekday'
                ? (weekdayWords[weekdayOf(day)] ?? '')
                : String(day.day)
      const fontSize =
        row === 'weekday'
          ? settings.rulerFont * NOT_STORED_RULER_WEEKDAY_SIZES['S-219']
          : settings.rulerFont
      // STOP: spec does not decide a tick-to-label inset; the label starts on its rule. Looked in S-135, S-136
      out.push(
        `<text x="${rounded(Math.max(x, band.x))}" y="${rounded(baseline)}"` +
          ` font-size="${rounded(fontSize)}" fill="${ink}"` +
          ` xml:space="preserve"${figureKey(`ruler-${row}-label-${serialOf(day)}`)}>` +
          `${escaped(label)}</text>`,
      )
    }
  }
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"${figureKey('ruler-foot-rule')}/>`,
  )
  return out
}

const WATERMARK_ROLE = 'Watermark'

// see FR-020, T-207
/** @purity pure */
function watermarkSvg(
  area: ScreenRect,
  pictureWidth: number,
  mark: Watermark,
  ink: string,
  clipId: string,
): string {
  const size = Number(WATERMARK_MARKS['S-221']) * pictureWidth
  const step = Number(WATERMARK_MARKS['S-222']) * size
  if (!(size > 0) || !(step > 0) || area.width <= 0 || area.height <= 0) return ''
  const centreX = area.x + area.width / 2
  const centreY = area.y + area.height / 2
  const reach = Math.hypot(area.width, area.height) / 2
  const text = escaped(`${mark.openedBy} ${mark.stampedAt}`)
  const marks: string[] = []
  for (let y = centreY - reach; y <= centreY + reach; y += step) {
    for (let x = centreX - reach; x <= centreX + reach; x += step) {
      marks.push(
        `<text x="${rounded(x)}" y="${rounded(y)}" xml:space="preserve">${text}</text>`,
      )
    }
  }
  // TRAP: the clip sits on the outer, unrotated group; on the rotated one it would turn too.
  return (
    `<g data-role="${WATERMARK_ROLE}" clip-path="url(#${clipId})"` +
    ` opacity="${WATERMARK_MARKS['S-102']}" fill="${ink}"` +
    ` font-size="${rounded(size)}" text-anchor="middle">` +
    `<g transform="rotate(${WATERMARK_MARKS['S-220']} ${rounded(centreX)}` +
    ` ${rounded(centreY)})">` +
    marks.join('') +
    '</g></g>'
  )
}

// see FR-080, T-020, T-076
// TRAP: snapshot-source.ts reads Parameters<typeof svgFromSchedule>[3] and [4] by position;
// insert no parameter ahead of regions.
/** @purity pure */
export function svgFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
  selection: Selection,
  // TRAP: no default: a forgotten export would draw FR-043's dummies into a reader's file (EP-14).
  picture: SchedulePicture,
  follow: DualCursorFollow | null = null,
  weekdayWords: readonly string[] = [],
  pointer: Point | null = null,
  hovered: Hit | null = null,
  marquee: ScreenRect | null = null,
  watermark: Watermark | null = null,
): string {
  const hue = schedule.project.themeHue
  const monochrome = settings.themeMonochrome
  const dark = isDarkTheme(settings)
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  // TRAP: gate every operation mark on drawsOperationState, or it leaks into an export (EP-12, DC-8);
  // marquee is ungated and relies on the export call passing null.
  const drawsOperationState = picture === 'screen'
  const marks: readonly ItemRef[] = drawsOperationState ? selection.items : []
  const following = drawsOperationState ? follow : null
  const hover = drawsOperationState ? hovered : null
  const hand = drawsOperationState ? pointer : null
  /** @purity pure */
  const handOn = (taskUid: number, rows: readonly Hit['grab'][]): boolean =>
    hover !== null &&
    hover.item.kind === 'task' &&
    hover.item.taskUid === taskUid &&
    rows.includes(hover.grab)
  // STOP: spec does not decide whether FR-013's pointer-on-it asks the drawn figure or the grab row.
  // Looked in HF-6, MK-9a, T-023d
  // @provisional PND-360
  /** @purity pure */
  const handInside = (centre: Point, width: number, height: number): boolean =>
    hand !== null &&
    Math.abs(hand.x - centre.x) <= width / 2 &&
    Math.abs(hand.y - centre.y) <= height / 2
  const selected = new Set(marks.filter((one) => one.kind === 'task').map((one) => one.uid))
  const selectedBoxes = new Set(
    marks.filter((one) => one.kind === 'highlightBox').map((one) => one.id),
  )
  const selectedComments = new Set(
    marks.filter((one) => one.kind === 'commentBox').map((one) => one.id),
  )
  const selectedStatusLine = marks.some((one) => one.kind === 'statusLine')
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  // TRAP: the ordinal is not the index in geometry.dependencies: RT-4a drops undrawn links.
  for (const item of marks) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

  const bandParts: string[] = []
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []
  const planPartsPinned: string[] = []
  const guidePartsPinned: string[] = []
  const actualPartsPinned: string[] = []
  const markerPartsPinned: string[] = []
  const labelPartsPinned: string[] = []
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []
  const barMaskParts: string[] = []
  // STOP: spec does not decide where annotations go in the paint order; here over the labels.
  // Looked in T-020, NFR-007
  // @provisional PND-238
  const annotationParts: string[] = []
  const handleParts: string[] = []
  const selectionParts: string[] = []

  const area = regions.rowArea
  const areaBottom = area.y + area.height
  const scrollTop = layout.scrollAreaY ?? area.y
  const pinnedGroupIds = new Set(
    layout.rows.filter((row) => row.isPinned === true).map((row) => row.groupId),
  )
  const hasPinnedRows = pinnedGroupIds.size > 0
  const skipsOffScreen = picture === 'screen'
  const drawnFrom = area.y - area.height
  const drawnTo = areaBottom + area.height
  const sideMargin = area.width * OFF_SCREEN_SIDE_MARGIN
  const drawnLeftOf = area.x - sideMargin
  const drawnRightOf = area.x + area.width + sideMargin
  for (const [position, row] of layout.rows.entries()) {
    const top = Math.max(row.y, row.isPinned === true ? area.y : scrollTop)
    const bottom = Math.min(row.y + row.height, areaBottom)
    if (bottom <= top) continue
    const chosen = colourOfGroup.get(row.groupId) ?? null
    const band = chosen === null ? themed(bandRowOf(row.depth, position)) : chosen
    const rowKey = `row-${row.groupId}`
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(area.width)}" height="${rounded(bottom - top)}"` +
        ` fill="${monochrome ? achromatic(band) : band}"${figureKey(`${rowKey}-band`)}/>`,
    )
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}"` +
        ` stroke-width="${rounded(GROUP_GRID_LINE_WIDTH_PX)}"${figureKey(`${rowKey}-rule`)}/>`,
    )
  }

  // STOP: spec does not decide the date grid line colour; here S-149. Looked in FR-089, T-236
  // @provisional PND-315
  if (settings.dateGridLinesVisible) {
    const gridFrom = dateAtX(layout, area.x)
    if (gridFrom !== null) {
      const finest = ROWS_OF_TIER[layout.tier][ROWS_OF_TIER[layout.tier].length - 1]
      const gridCap = Math.ceil(area.width / Math.max(0.001, layout.pxPerDay)) + 1
      const stride = tickStrideOf(layout, settings)
      const weekStart = schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108']
      for (const day of ticksOfRow(
        finest ?? 'year',
        layout,
        stride,
        weekStart,
        gridFrom,
        area.x + area.width,
        gridCap,
      )) {
        const x = xFromDay(layout, day)
        if (x < area.x) continue
        bandParts.push(
          `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
            ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
            ` stroke="${themed('S-149')}" stroke-width="1"` +
            `${figureKey(`date-grid-${serialOf(day)}`)}/>`,
        )
      }
    }
  }

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const placed = placedOf.get(task.taskUid)
    const isPinnedTask = placed !== undefined && pinnedGroupIds.has(placed.groupId)
    if (skipsOffScreen && placed !== undefined) {
      const barLeft =
        placed.actualX === null ? placed.x : Math.min(placed.x, placed.actualX)
      const barRight =
        placed.actualX === null
          ? placed.x + placed.width
          : Math.max(placed.x + placed.width, placed.actualX + placed.actualWidth)
      if (
        placed.y + placed.height < drawnFrom ||
        placed.y > drawnTo ||
        barRight < drawnLeftOf ||
        barLeft > drawnRightOf
      ) {
        continue
      }
    }
    const taskKey = `task-${task.taskUid}`
    const plan = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      themed('S-156'),
      themed('S-155'),
      monochrome,
      settings.planStroke,
    )
    const actual = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      themed('S-158'),
      themed('S-157'),
      monochrome,
      settings.planStroke,
    )
    if (task.plan !== null) {
      ;(isPinnedTask ? planPartsPinned : planParts).push(
        barSvg(task.plan, plan, `${taskKey}-plan`),
      )
      const planBarBox = boxOfPoints(cornersOfBar(task.plan))
      if (planBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(planBarBox, `${taskKey}-plan-mask`))
      }
    }
    for (const guide of task.guides) {
      ;(isPinnedTask ? guidePartsPinned : guideParts).push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${actual.stroke}"` +
          ` stroke-width="${rounded(settings.planActualGuideWeight)}"` +
          ` stroke-dasharray="${rounded(settings.planActualGuidePattern.on)}` +
          ` ${rounded(settings.planActualGuidePattern.off)}"${figureKey(`${taskKey}-guide`)}/>`,
      )
    }
    if (task.actual !== null) {
      ;(isPinnedTask ? actualPartsPinned : actualParts).push(
        barSvg(task.actual, actual, `${taskKey}-actual`),
      )
      const actualBarBox = boxOfPoints(cornersOfBar(task.actual))
      if (actualBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(actualBarBox, `${taskKey}-actual-mask`))
      }
    }
    // TRAP: drop dummies from an export only here: emptying the geometry's dummies loses EP-5's marker (EP-14).
    // STOP: spec does not decide the dummies' paint order; here the actual bar's layer. Looked in T-020
    // @provisional PND-209
    // WHY: FR-043's actual while grabbing is not drawn: it needs the press in flight, which a hover is not.
    if (picture === 'screen' && task.dummies.length > 0) {
      // TRAP: draw from DummyGeometry.ink, never recompute it: the drawn mark is the grab target (T-023d).
      const ink = task.dummies[0]!.ink
      const marks = barSvg(
        dummyFigure(
          // TRAP: milestoneFigure, not task.plan: plan is absent while planVisible is false.
          task.milestoneFigure,
          { x: ink.x + ink.width / 2, y: ink.y + ink.height / 2 },
          ink.width,
          ink.height,
        ),
        actual,
        `${taskKey}-dummies`,
      )
      // STOP: spec does not decide how far FR-013 darkens, nor whether per dummy or per Task.
      // Looked in FR-013, S-131
      // @provisional PND-351
      const faintness = handInside(
        { x: ink.x + ink.width / 2, y: ink.y + ink.height / 2 },
        ink.width,
        ink.height,
      )
        ? 1
        : settings.dummyOpacity
      ;(isPinnedTask ? actualPartsPinned : actualParts).push(
        `<g opacity="${rounded(faintness)}"${figureKey(`${taskKey}-dummies`)}>${marks}</g>`,
      )
    }
    if (selected.has(task.taskUid)) {
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      if (box !== null) {
        selectionParts.push(selectionFrameSvg(box, themed('S-151'), `${taskKey}-frame`))
      }

      const half = settings.fadeHandleHalfPx
      for (const foundAt of task.fadeHandles) {
        handleParts.push(
          `<rect x="${rounded(foundAt.x - half)}" y="${rounded(foundAt.y - half)}"` +
            ` width="${rounded(half * 2)}" height="${rounded(half * 2)}"` +
            ` fill="${FADE_HANDLE_FILL_COLOUR}" stroke="${FADE_HANDLE_STROKE_COLOUR}"` +
            ` stroke-width="${rounded(settings.fadeHandleStrokePx)}"` +
            `${figureKey(`${taskKey}-fade-handle`)}/>`,
        )
      }
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      ;(isPinnedTask ? markerPartsPinned : markerParts).push(
        markerSvg(
          task.marker,
          themed('S-161'),
          themed('S-162'),
          handOn(task.taskUid, MARKER_GRAB_ROWS) ? 1 : settings.dummyOpacity,
          settings,
          `${taskKey}-marker`,
        ),
      )
      if (task.resume !== null) {
        ;(isPinnedTask ? markerPartsPinned : markerParts).push(
          resumeSvg(task.resume.arm, task.resume.head, themed('S-161'), settings,
                    `${taskKey}-resume`),
        )
      }
    }
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      ;(isPinnedTask ? labelPartsPinned : labelParts).push(
        labelSvg(
          task.label,
          placed.label,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
          settings.labelPad,
          `${taskKey}-label`,
        ),
      )
    }
    if (placed !== undefined && task.assigneeLabel !== null && placed.outsideLabel !== '') {
      ;(isPinnedTask ? labelPartsPinned : labelParts).push(
        labelSvg(
          task.assigneeLabel,
          placed.outsideLabel,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
          0,
          `${taskKey}-oc2-label`,
          'end',
        ),
      )
    }
  }

  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const arrowId = `grs-dependency-arrow-${pictureId(
    `${rounded(width)}x${rounded(height)}|${geometry.tasks.length}` +
      `|${geometry.dependencies.length}|${selected.size}|${schedule.project.title ?? ''}`,
  )}`
  const dependencyHaloMaskId = `grs-dependency-halo-mask-${pictureId(
    `${rounded(width)}x${rounded(height)}|${barMaskParts.length}`,
  )}`
  const defsParts: string[] = []

  const scrollClipId = `grs-scroll-clip-${pictureId(
    `${rounded(area.x)}x${rounded(scrollTop)}|${rounded(area.width)}x${rounded(
      areaBottom - scrollTop,
    )}`,
  )}`
  if (hasPinnedRows) {
    defsParts.push(
      `<clipPath id="${scrollClipId}"><rect x="${rounded(area.x)}" y="${rounded(scrollTop)}"` +
        ` width="${rounded(area.width)}" height="${rounded(areaBottom - scrollTop)}"/></clipPath>`,
    )
  }

  const orderedDependencies = [...geometry.dependencies].sort((a, b) => {
    const aFront = selectedLinks.has(`${a.predecessorUid}>${a.successorUid}`) ? 1 : 0
    const bFront = selectedLinks.has(`${b.predecessorUid}>${b.successorUid}`) ? 1 : 0
    return aFront - bFront
  })
  const haloWidth = settings.dependencyWidth * NOT_STORED_DEPENDENCY_SIZES['S-224']
  // TRAP: mint the head once through arrowMinted, never by reading defsParts.length: the list is shared.
  let arrowMinted = false
  for (const link of orderedDependencies) {
    if (!settings.dependencyVisible) break
    if (!arrowMinted) {
      arrowMinted = true
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
      if (barMaskParts.length > 0) {
        defsParts.push(
          `<mask id="${dependencyHaloMaskId}" maskUnits="userSpaceOnUse">` +
            `<rect x="0" y="0" width="${rounded(width)}" height="${rounded(height)}"` +
            ' fill="white"/>' +
            barMaskParts.join('') +
            '</mask>',
        )
      }
    }
    // TRAP: cull after minting: the <marker> must exist even when the first line is culled.
    if (skipsOffScreen) {
      let linkTop = Number.POSITIVE_INFINITY
      let linkBottom = Number.NEGATIVE_INFINITY
      let linkLeft = Number.POSITIVE_INFINITY
      let linkRight = Number.NEGATIVE_INFINITY
      for (const at of link.points) {
        if (at.y < linkTop) linkTop = at.y
        if (at.y > linkBottom) linkBottom = at.y
        if (at.x < linkLeft) linkLeft = at.x
        if (at.x > linkRight) linkRight = at.x
      }
      if (linkBottom < drawnFrom || linkTop > drawnTo) continue
      if (linkRight < drawnLeftOf || linkLeft > drawnRightOf) continue
    }
    const linkWidth = selectedLineWidth(
      settings.dependencyWidth,
      selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
    )
    // STOP: spec does not decide a line with one end scrolled out under the band; here it stays and is cut.
    // Looked in RT-4a, FR-098
    // @provisional PND-416
    const predecessorPlaced = placedOf.get(link.predecessorUid)
    const successorPlaced = placedOf.get(link.successorUid)
    const predecessorPinned =
      predecessorPlaced !== undefined && pinnedGroupIds.has(predecessorPlaced.groupId)
    const successorPinned =
      successorPlaced !== undefined && pinnedGroupIds.has(successorPlaced.groupId)
    const points = pointsOf(link.points)
    const haloMask = barMaskParts.length > 0 ? ` mask="url(#${dependencyHaloMaskId})"` : ''
    const linkKey = figureKey(`dep-${link.predecessorUid}-${link.successorUid}`)
    ;(predecessorPinned && successorPinned ? depLinkPartsPinned : depLinkParts).push(
      `<polyline points="${points}" fill="none" stroke="${themed('S-146')}"` +
        ` stroke-width="${rounded(haloWidth)}"${haloMask}${linkKey}/>` +
        `<polyline points="${points}" fill="none"` +
        ` stroke="${themed('S-159')}" stroke-width="${rounded(linkWidth)}"` +
        ` marker-end="url(#${arrowId})"${linkKey}/>`,
    )
  }

  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    linkParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${themed('S-160')}" stroke-width="${rounded(settings.progressLineWidth)}"` +
        `${figureKey('progress-line')}/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    const statusWidth = selectedLineWidth(1, selectedStatusLine)
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="${rounded(statusWidth)}"` +
        `${figureKey('status-line')}/>`,
    )
  }

  const cursors = geometry.dualCursor
  if (cursors !== null) {
    // STOP: spec does not decide where the cursors go in the paint order; here with CU-1. Looked in T-020
    // @provisional PND-312
    const colour = themed('S-195')
    const followedDay =
      following === null || following.x === null ? null : dateAtX(layout, following.x)
    const followedX = followedDay === null ? null : xFromDay(layout, followedDay)
    for (const side of ['date1', 'date2'] as const) {
      const isFollowing = following !== null && following.side === side
      const standing = side === 'date1' ? cursors.date1X : cursors.date2X
      const x = isFollowing && followedX !== null ? followedX : standing
      const width = selectedLineWidth(NOT_STORED_DUAL_CURSOR_SIZES['S-194'], isFollowing)
      linkParts.push(
        `<line x1="${rounded(x)}" y1="${rounded(cursors.top)}"` +
          ` x2="${rounded(x)}" y2="${rounded(cursors.bottom)}"` +
          ` stroke="${colour}" stroke-width="${rounded(width)}"` +
          `${figureKey(`dual-cursor-${side}`)}/>`,
      )
    }
  }

  if (drawsOperationState && settings.guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.rowArea
    // STOP: spec does not decide the guide cursor's region; here the Row Area only. Looked in CU-3, T-020
    // @provisional PND-342
    const inside =
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    if (inside) {
      // STOP: spec does not decide the guide cursor's colour or width. Looked in T-236, T-206
      // @provisional PND-341
      const guideColour = themed('S-148')
      const guideWidth = 1
      const vertical = (x: number): string =>
        `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
        `${figureKey('guide-cursor-vertical')}/>`
      if (settings.guideCursorMode === 'crosshair') {
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
            `${figureKey('guide-cursor-horizontal')}/>`,
        )
      } else if (settings.guideCursorMode === 'single-vertical') {
        linkParts.push(vertical(pointer.x))
      }
    }
  }

  for (const box of geometry.highlightBoxes) {
    const radius = box.cornerRadiusPx
    const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        rounding +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ` stroke-width="1"${figureKey(`box-${box.id}`)}/>`,
    )
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`))
    }
  }

  for (const box of geometry.commentBoxes) {
    annotationParts.push(
      `<line x1="${rounded(box.anchor.x)}" y1="${rounded(box.anchor.y)}"` +
        ` x2="${rounded(box.body.x)}" y2="${rounded(box.body.y + box.body.height)}"` +
        ` stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}-leader`)}/>`,
    )
    // STOP: spec does not decide the comment body's ground and ink; here S-146 and S-147. Looked in T-236, NFR-007
    // @provisional PND-231
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}`)}/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      // STOP: spec does not place a wrapped line's baseline; here the foot of its em box. Looked in FR-097
      // @provisional PND-230
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}" fill="${themed('S-147')}"` +
          ` xml:space="preserve"${figureKey(`comment-${box.id}-line-${index}`)}>` +
          `${escaped(line)}</text>`,
      )
    }
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
      )
    }
  }

  const scrollingBars = [...planParts, ...guideParts, ...actualParts, ...markerParts].join('')
  const clippedBars = hasPinnedRows
    ? [`<g clip-path="url(#${scrollClipId})">${scrollingBars}</g>`]
    : [scrollingBars]
  const clippedDepLinks = hasPinnedRows
    ? [`<g clip-path="url(#${scrollClipId})">${depLinkParts.join('')}</g>`]
    : depLinkParts
  const clippedLabels = hasPinnedRows
    ? [`<g clip-path="url(#${scrollClipId})">${labelParts.join('')}</g>`]
    : labelParts

  const watermarkClipId = `grs-watermark-clip-${pictureId(
    `${rounded(area.x)}x${rounded(area.y)}|${rounded(area.width)}x${rounded(area.height)}`,
  )}`
  if (watermark !== null) {
    defsParts.push(
      `<clipPath id="${watermarkClipId}"><rect x="${rounded(area.x)}" y="${rounded(area.y)}"` +
        ` width="${rounded(area.width)}" height="${rounded(area.height)}"/></clipPath>`,
    )
  }

  const parts = [
    ...defsParts,
    ...bandParts,
    ...planPartsPinned,
    ...guidePartsPinned,
    ...actualPartsPinned,
    ...markerPartsPinned,
    ...clippedBars,
    ...depLinkPartsPinned,
    ...clippedDepLinks,
    ...linkParts,
    ...labelPartsPinned,
    ...clippedLabels,
    ...annotationParts,
    ...selectionParts,
    ...handleParts,
    ...(marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'), 'marquee')]),
    ...(watermark === null
      ? []
      : [watermarkSvg(area, width, watermark, themed('S-223'), watermarkClipId)]),
    ...rulerSvg(
      layout,
      settings,
      regions.timeRuler,
      schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
      themed('S-146'),
      themed('S-147'),
      themed('S-149'),
      weekdayWords,
    ),
  ]

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}"` +
    ` role="img" aria-label="${escaped(schedule.project.title ?? '')}">` +
    parts.join('') +
    '</svg>'
  )
}

const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GR-7']

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206, T-207 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_SELECTION_SIZES: {
  readonly 'S-174': number
  readonly 'S-175': readonly [number, number]
  readonly 'S-178': number
} = {
  'S-174': 2,
  'S-175': [2, 2],
  'S-178': 2,
}

// see T-206
export const NOT_STORED_DEPENDENCY_SIZES: {
  readonly 'S-224': number
} = {
  'S-224': 3,
}

// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
} = {
  'S-180': 30,
}

// see T-206
export const NOT_STORED_DUAL_CURSOR_SIZES: {
  readonly 'S-194': number
} = {
  'S-194': 1,
}

// see T-206
export const NOT_STORED_RULER_WEEKDAY_SIZES: {
  readonly 'S-219': number
} = {
  'S-219': 0.6,
}

// see T-236, S-73
export const SCHEDULE_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  'S-148': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-155': { light: 'hsl(H 46% 80%)', dark: 'hsl(H 32% 26%)', followsHue: true },
  'S-156': { light: 'hsl(H 44% 46%)', dark: 'hsl(H 46% 66%)', followsHue: true },
  'S-157': { light: 'hsl(H 62% 34%)', dark: 'hsl(H 62% 64%)', followsHue: true },
  'S-158': { light: 'hsl(H 66% 22%)', dark: 'hsl(H 70% 80%)', followsHue: true },
  'S-159': { light: 'hsl(26 88% 44%)', dark: 'hsl(30 92% 60%)', followsHue: false },
  'S-160': { light: 'hsl(354 62% 42%)', dark: 'hsl(354 70% 64%)', followsHue: false },
  'S-161': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  'S-162': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-163': { light: '#8b9099', dark: '#767c86', followsHue: false },
  'S-164': { light: 'hsl(H 42% 96%)', dark: 'hsl(H 18% 20%)', followsHue: true },
  'S-165': { light: 'hsl(H 34% 88%)', dark: 'hsl(H 16% 28%)', followsHue: true },
  'S-166': { light: 'hsl(H 40% 97%)', dark: 'hsl(H 20% 17%)', followsHue: true },
  'S-167': { light: 'hsl(H 20% 99%)', dark: 'hsl(H 14% 11%)', followsHue: true },
  'S-168': { light: '#000000', dark: '#ffffff', followsHue: false },
  'S-169': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-195': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-223': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
}

// see T-207, FR-020
export const WATERMARK_MARKS: {
  readonly 'S-220': string
  readonly 'S-221': string
  readonly 'S-222': string
  readonly 'S-102': string
} = {
  'S-220': '-30',
  'S-221': '0.01125',
  'S-222': '14.44',
  'S-102': '0.06',
}
// </generated>

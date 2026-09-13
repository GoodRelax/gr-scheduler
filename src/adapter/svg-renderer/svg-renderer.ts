// SvgRenderer -- public entry of this folder.
//
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19
//
// Turns the geometry into an SVG string (FR-080, CP-19); no shape is
// recomputed here (表 T-068 LC-11). Also reads `Schedule` for FR-042's row
// band and FR-020's watermark (edges in `_source/components.json`).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
// PI-7's answer type only: this unit reads a hit handed in and never hit-tests.
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

/**
 * Which of table T-076's two pictures this frame is.
 *
 * Exists for EP-14: FR-043's dummies hang on the DOCUMENT (an unstarted Task),
 * so emptying the geometry's dummies instead is a defect (see the dummy site in
 * `svgFromSchedule`). EP-12 is spent through it too (`drawsOperationState`).
 * Not a general export mode: a row of table T-076 reaches it only with a stated reason.
 *
 * @provisional PND-210
 */
export type SchedulePicture = 'screen' | 'export'

/**
 * A parameter, not geometry: which side follows is a current value (LY-5 of
 * table T-060), and DC-8 of table T-029a keeps the mark out of an export while
 * EP-6 still draws the lines.
 *
 * `'date1' | 'date2'` is spelled out, not imported as `DualCursorSide`:
 * `_source/components.json` gives no edge to ScreenState. `frame-loop.ts`
 * hands one value along both seams, so the compiler keeps them in step.
 */
export interface DualCursorFollow {
  /** DC-2. */
  readonly side: 'date1' | 'date2'
  /**
   * Pointer x in screen px, or `null` while outside the window.
   * The line stands at the day this point falls in. @provisional PND-310
   * With no pointer the line stands at its stored date. @provisional PND-311
   */
  readonly x: number | null
}

/**
 * FR-020's trail, handed in: the name (S-99a of table T-206) is in
 * `localStorage` (LY-5 of table T-060) and the moment is a clock, neither
 * readable by a pure unit. `null` is S-144, spent by the caller; a name
 * invented here would land in a reader's exported file.
 */
export interface Watermark {
  /** S-99a of table T-206; not the author's (FR-020's RATIONALE); sourced per FR-086. */
  readonly openedBy: string
  /** Spelled by the caller that read the clock (FR-020 fixes how); drawn as it arrives. */
  readonly stampedAt: string
}

/**
 * How one bar is painted, once every override and the theme have been
 * resolved. Not stored (FR-041).
 */
interface Paint {
  readonly stroke: string
  readonly fill: string
  readonly strokeWidth: number
}

/**
 * FR-019's line colour for an annotation the author gave none; no row of table
 * T-236 holds it (nor the fade grab point's pair below).
 * Known wrong: `#b45309` is hue 26, S-159's light dependency-line hue, which
 * FR-019 wants avoided; choosing a replacement is not this unit's call.
 *
 * @provisional PND-1
 */
const ANNOTATION_COLOUR = '#b45309'

/**
 * STOP -- FR-075's fade grab point face and outline are in no row. Looked in
 * table T-210 (S-109, S-110, S-111) and table T-236.
 *
 * @provisional PND-1
 */
const FADE_HANDLE_FILL_COLOUR = '#ffffff'
/** The other half of the same missing row. See `FADE_HANDLE_FILL_COLOUR`. @provisional PND-1 */
const FADE_HANDLE_STROKE_COLOUR = '#374151'

/**
 * Sideways cull margin for `skipsOffScreen`, as a fraction of the Row Area width.
 * 0.25 is the author's own number (a quarter window each side; no row of
 * docs/spec states one): it clears the name (NL-3 of table T-013), the assignee
 * (GR-11) and the percent that overhang a bar.
 * Not a settings row: a saved file would change what another machine writes.
 * A fraction, not px: `MC-6` of table T-025 is one screen of many.
 */
const OFF_SCREEN_SIDE_MARGIN = 0.25

/** @purity pure */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @purity pure */
function rounded(value: number): string {
  // Two places, for every number in the picture: NS-3 of table T-231 requires
  // one rounding rule on both sides of WY-3's comparison.
  return (Math.round(value * 100) / 100).toString()
}

/**
 * A figure's identity across frames: the DOCUMENT's id plus the part name, never
 * an array index (a delete or sideways scroll moves it). All elements of one
 * figure share it; no per-element index, since the count varies with shape.
 * Not `data-role` (W-4 of table T-006a names UI parts). Not a diffing protocol,
 * only what a far-side differ cannot recover; nothing else goes in, as it is
 * serialised every frame.
 * The export carries it too (table T-076, FR-080, WY-2 of table T-041 ask for
 * one drawing). Not decided here: it puts `Task` UIDs and `TaskGroup` ids into
 * a reader's picture.
 *
 * @purity pure
 */
function figureKey(key: string): string {
  return ` data-figure="${escaped(key)}"`
}

/** @purity pure */
function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/**
 * Returns `ScreenRect`, as `HighlightGeometry` does, so the two compare directly.
 *
 * @purity pure
 */
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

/**
 * Includes SH-3's head and SH-4's dots: they reach past `from` and `to`.
 *
 * @purity pure
 */
function cornersOfBar(bar: BarGeometry): Path {
  if (bar.form === 'outline') return bar.points
  const out = [bar.from, bar.to, ...(bar.head ?? [])]
  for (const dot of bar.dots) {
    out.push({ x: dot.at.x - dot.radius, y: dot.at.y - dot.radius })
    out.push({ x: dot.at.x + dot.radius, y: dot.at.y + dot.radius })
  }
  return out
}

/**
 * FR-009's bar-exclusion `<mask>` rectangle (black hides), from the same box the
 * selection frame reads.
 *
 * @purity pure
 */
function barMaskRectSvg(box: ScreenRect, key: string): string {
  return (
    `<rect x="${rounded(box.x)}" y="${rounded(box.y)}"` +
    ` width="${rounded(box.width)}" height="${rounded(box.height)}" fill="black"` +
    `${figureKey(key)}/>`
  )
}

/**
 * Centred on `centre`; table T-023d's left-edge anchoring is solved in `dummiesOf`.
 *
 * @purity pure
 */
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

/**
 * Maps the milestone glyph onto another box rather than redrawing it, so `SH-5`
 * (table T-012, unexported in `schedule-geometry.ts`) is spelled once (FR-043).
 * x and y scale separately: safe only because both boxes are square (FR-043);
 * a non-square box turns a circle into an ellipse.
 *
 * @purity pure
 */
function pathFitted(path: Path, from: ScreenRect, to: ScreenRect): Path {
  const scaleX = to.width / from.width
  const scaleY = to.height / from.height
  return path.map((one) => ({
    x: to.x + (one.x - from.x) * scaleX,
    y: to.y + (one.y - from.y) * scaleY,
  }))
}

/**
 * FR-043's faint mark on this Task, from `TaskGeometry.milestoneFigure` (a
 * not-started Task has no actual bar). Not `task.plan`: absent while
 * `planVisible` is false, it would fall back to the rectangle FR-043 forbids.
 * The caller hands in the paint.
 *
 * @purity pure
 */
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
  // A zero-extent silhouette cannot be scaled (division by zero); keep the rectangle.
  if (from === null || from.width <= 0 || from.height <= 0) return rectangle
  return {
    form: 'outline',
    points: pathFitted(milestone.points, from, box),
    // The marks ride the same map, so `box`/`hexagon` and `smile`/`circle` stay
    // distinct at dummy size (`BarGeometry.marks`).
    marks: (milestone.marks ?? []).map((one) => pathFitted(one, from, box)),
  }
}

/**
 * SL-8 of table T-023c, the framed half: a dashed rectangle on the target's bounds.
 * A zero-extent side is widened to S-174: a zero-height rect draws no outline, so
 * a collapsed figure (zero-span SH-3, side-0 milestone) would show no sign.
 *
 * @purity pure
 */
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

/**
 * SL-8's other half. Thickened in place, not over-painted, so GD-6's arrowhead
 * keeps the weight; not recoloured, as no row holds a selection-coloured head.
 * DC-8 of table T-029a passes FOLLOWING here (SL-1 admits no cursor line).
 * No export test: `drawsOperationState` already cleared `selected`.
 *
 * @purity pure
 */
function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
}

/**
 * FR-041's monochrome, applied when drawing only. Keeps HSL lightness (what the
 * colour was written with), not WCAG luminance (NFR-007's measure). An
 * unreadable colour returns unchanged: one visible coloured shape beats a guess.
 *
 * @purity pure
 */
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

/**
 * One row of table T-236 for the theme in force; monochrome reaches only
 * `followsHue` rows (FR-041, MUST NOT). Exported so `ImageExporter` paints
 * EP-9's divider in S-149 through it (LR-2).
 *
 * @purity pure
 */
export function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  // Fires only for a row ID typed here that the generated block was not asked for.
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

/**
 * `Group Grid Lines` (U-18) thickness in CSS px; EP-9's one place. The drawer's
 * own number: EP-9 forbids a settings key and no row of tables T-202 / T-203 /
 * T-236 gives a width. Also read by `screen-frame.ts`.
 */
export const GROUP_GRID_LINE_WIDTH_PX = 1

/** Which column of table T-236 the saved theme asks for (S-72). @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

/**
 * FR-042's default band colour, counted by row position (FR-042's RATIONALE).
 *
 * @purity pure
 */
function bandRowOf(depth: number, position: number): string {
  if (depth === 1) return 'S-166'
  return position % 2 === 0 ? 'S-164' : 'S-167'
}

/**
 * FR-007 / FR-041. ⚠️ A chosen colour is greyed too: monochrome takes effect
 * when drawing.
 *
 * @purity pure
 */
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
  // One call for both halves: `achromatic` is idempotent, and a separate
  // chosen-colour branch is where the author's colour gets dropped, not drained.
  return {
    stroke: monochrome ? achromatic(stroke) : stroke,
    fill: monochrome ? achromatic(fill) : fill,
    strokeWidth,
  }
}

/**
 * ZO-3's marker: an S-162 disc (table T-020's opaque backing) inked in S-161,
 * with table T-021's symbol inside; the symbols' exact figures are unspecified
 * (the gap PND-2 covers). Only PM-1a is faint (FR-013); PM-4 wins over PM-1a.
 * Faintness is one group opacity, not per shape: overlapping translucent shapes
 * would darken the symbol past S-131. The backing turns translucent too,
 * against table T-020; FR-013's MUST decides.
 *
 * @purity pure
 */
function markerSvg(
  marker: MarkerGeometry,
  ink: string,
  backing: string,
  faintness: number,
  settings: DocumentSettings,
  key: string,
): string {
  const { centre, radius } = marker
  // The group carries the key too; for PM-1a it is what a differ finds first.
  const named = figureKey(key)
  // S-24 for disc and symbol: FR-094 (MUST NOT) forbids a local dimension, and
  // S-24 is table T-201's only stroke width in the 進捗マーカー group.
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
  if (marker.symbol !== 'PM-1a') return drawn
  return `<g opacity="${rounded(faintness)}"${named}>${drawn}</g>`
}

/**
 * FR-044's resume icon, drawn from `resumeOf`'s paths (LF-13 of table T-221), so
 * S-25's invalid look already is the smaller size; `ResumeGeometry.valid` goes
 * unread, as no row of table T-236 holds a second colour. The same paths centre
 * GR-8's S-22 hit box, so picture and grab agree (S-25 shrinks only the drawing).
 * Stroke S-24 as in `markerSvg`; ink S-161, as no row is this icon's own.
 *
 * @purity pure
 */
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

/**
 * ZO-5's name label. The size is read off the placement: recomputing FR-077's
 * formula parts the measured width from the glyphs. The halo
 * (`labelHaloOfFont`, table T-017a's note for CT-1 and CT-2) is always drawn,
 * the safe side of that note.
 * `paint-order="stroke"` puts the halo (S-169) under the glyph (S-168);
 * swapping the attributes paints the label in its own outline.
 *
 * @purity pure
 */
function labelSvg(
  box: ScreenRect,
  text: string,
  fontSize: number,
  settings: DocumentSettings,
  ink: string,
  halo: string,
  /**
   * ZO-5's box is the room the label may take, so S-31 keeps it off the edge;
   * OC-2's box is its estimated width (LC-7), where an inset would push the
   * glyphs out of the reserved box and across `labelGap`.
   */
  padLeft: number,
  /** Which label this is, kept from frame to frame. */
  key: string,
  /** OC-2's card is right-aligned (FR-090); an `end` caller passes `padLeft` 0. */
  anchor: 'start' | 'end' = 'start',
): string {
  const x = anchor === 'end' ? box.x + box.width : box.x + padLeft
  // S-33 multiplies the font, not the box (table T-012's closing paragraph);
  // against the box the drop would grow with the bar's band.
  const y = box.y + box.height / 2 + fontSize * settings.labelBaseline
  const haloWidth = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    (anchor === 'end' ? ' text-anchor="end"' : '') +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
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
    // One path with `evenodd`, not shapes on top: the marks are cut out, so the
    // band shows through with no guessed paint and no extra table T-236 row.
    // The stroke follows every subpath: at milestone sizes the eye's outline is the eye.
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

/**
 * GD-6's arrowhead at the last vertex (LF-4 of table T-221 ends routes on the
 * successor's edge). `userSpaceOnUse` so S-19, not `dependencyWidth`, sizes it.
 * S-19 is length and base alike; LF-7 sizes only the arrow SHAPE's head.
 *
 * @purity pure
 */
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

/**
 * A per-picture ID, so an export drawn into the screen's document shares no
 * marker ID (SVG IDs are document-wide). From content, not a counter: this unit
 * is `pure` (table T-062); equal seeds are the same picture.
 *
 * @purity pure
 */
function pictureId(seed: string): string {
  // FNV-1a: short, dependency-free; the value is a name, never a measurement.
  let hash = 0x811c9dc5
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Time Ruler rows (table T-006b's ⑤). Table T-238 names steps, not rows:
 * `yearMonth` is TM-3 / TM-4's `yyyy-mm`; TM-2's two lines are `year` and `month`.
 */
type RulerRow = 'year' | 'yearMonth' | 'month' | 'week' | 'day' | 'weekday'

/**
 * Table T-238 of FR-017 read straight down, one 段 per entry.
 */
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

/** 0 is Sunday, the numbering `Project.weekStartDay` uses (AT-17 / S-108). @purity pure */
function weekdayOf(day: CalendarDay): number {
  return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
}

/**
 * Padded: S-83 was derived from a two-digit month (table T-205), so a one-digit
 * month would print narrower than the threshold that admits it.
 *
 * @purity pure
 */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Only the day and weekday rows take `tickStrideOf` (LF-1 of table T-221); the
 * others walk their calendar unit. The stride is anchored on the day serial, not
 * the left edge, or every label jumps on a one-day pan.
 *
 * @purity pure
 */
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
  /** The day this row's first tick sits on, at or before the band's left edge. */
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

/**
 * FR-017's band (EP-2 exports it too). Grain and thinning come from
 * `layout.tier` and `tickStrideOf`, never recomputed, so the band cannot part
 * from the bars' layout. Weekday words are handed in: FR-038's dictionary is elsewhere.
 * STOP -- no row gives a tick-to-label inset (looked in S-135, S-136), so the
 * label starts on its rule.
 * Paints its own ground first (FR-041, S-146), covering what the Row Area lets
 * past its top (LF-12's overhang, a first-row label).
 *
 * @purity pure
 */
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
  // No origin day means no axis to put a tick on -- OP-10 has FR-055 choose one.
  if (from === null) return []

  const rows = ROWS_OF_TIER[layout.tier]
  // FR-017: the band height is fixed and the rows share it equally.
  const rowHeight = band.height / rows.length
  const right = band.x + band.width
  const stride = tickStrideOf(layout, settings)
  // Bounds the walk (each tick is at least a day on); thins nothing, only keeps
  // the loop finite at a tiny pxPerDay.
  const cap = Math.ceil(band.width / Math.max(0.001, layout.pxPerDay)) + 1
  const out: string[] = []
  // Fill only: a stroke here would draw the foot rule twice.
  out.push(
    `<rect x="${rounded(band.x)}" y="${rounded(band.y)}"` +
      ` width="${rounded(band.width)}" height="${rounded(band.height)}"` +
      ` fill="${ground}"${figureKey('ruler-ground')}/>`,
  )

  for (const [index, row] of rows.entries()) {
    const top = band.y + index * rowHeight
    // S-136 above, S-179 below, subtracted from the glyph box so the row keeps its
    // height; without it the three-row tier's baseline sits on the next rule.
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
      // The rule only at a real boundary, but the label held at the band edge (one
      // tick per row at most is left of it). Dropping it would empty the year row:
      // a year is about 2200px at 1x (S-1's note).
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      // Table T-238; `m` and `d` unpadded. `weekdayWords` arrives in AT-17's
      // Sunday-0 order. A missing word prints nothing (FR-038, FR-017 name none).
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
      // Weekday row only, by S-219 (table T-238); the baseline stays, as no row
      // gives a second offset.
      const fontSize =
        row === 'weekday'
          ? settings.rulerFont * NOT_STORED_RULER_WEEKDAY_SIZES['S-219']
          : settings.rulerFont
      out.push(
        `<text x="${rounded(Math.max(x, band.x))}" y="${rounded(baseline)}"` +
          ` font-size="${rounded(fontSize)}" fill="${ink}"` +
          ` xml:space="preserve"${figureKey(`ruler-${row}-label-${serialOf(day)}`)}>` +
          `${escaped(label)}</text>`,
      )
    }
  }
  // U-50 starts where the band ends, so the band's foot is the one rule that
  // separates the ruler from the Rows.
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"${figureKey('ruler-foot-rule')}/>`,
  )
  return out
}

/**
 * Table T-103's name for FR-020's layer (U-20), as `data-role`; not kebab-case
 * (W-4 of table T-006a sends it to W-6's form). No hit-test effect:
 * `readScreenPartAt` stops at DomScreenSurface's root.
 */
const WATERMARK_ROLE = 'Watermark'

/**
 * FR-020's layer, over the `Row Area` (U-50) only. S-220 is degrees; S-221
 * multiplies this picture's width and S-222 the mark size (table T-207).
 * This width, not S-81's 1600: FR-080 scales this picture to S-81, so the share holds.
 * Opacity on the group, so overlaps stay at S-102. Tiled square in the rotated
 * frame out to the half-diagonal, which covers the rectangle at any S-220 angle
 * (-90..90); the clip (FR-020, MUST NOT) sits on a separate unrotated group, or
 * it would turn too. A zero step, zero size, empty area or `NaN` draws nothing.
 *
 * @purity pure
 */
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
  // FR-020's order.
  const text = escaped(`${mark.openedBy} ${mark.stampedAt}`)
  const marks: string[] = []
  for (let y = centreY - reach; y <= centreY + reach; y += step) {
    for (let x = centreX - reach; x <= centreX + reach; x += step) {
      marks.push(
        `<text x="${rounded(x)}" y="${rounded(y)}" xml:space="preserve">${text}</text>`,
      )
    }
  }
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

/**
 * The SVG for one frame (FR-080); every coordinate arrives computed (ADR-001).
 * `picture` has no default, so a forgotten export cannot draw FR-043's dummies
 * into a reader's file (EP-14). `follow` defaults to none, which is also what
 * DC-8 (MUST NOT) requires of an export, so forgetting it is safe.
 * The argument list is `src/`'s (table T-064's heading); PI-19's member is fixed.
 *
 * @purity pure
 */
/**
 * Insert nothing ahead of `regions`: `snapshot-source.ts` reads
 * `Parameters<typeof svgFromSchedule>[3]` and `[4]` by position, so a shift
 * re-points both.
 * `weekdayWords` defaults to empty, which blanks the weekday row; a reader's
 * caller supplies `rulerWeekdayWords` (PI-37).
 * `pointer`: CU-3's guide cursor, both axes, unsnapped (LY-5 of table T-060);
 * not `follow.x`, which is x alone snapped to a day.
 * `hovered`: PI-7's hit, handed in so there is no second hit test (R7.4; this
 * unit holds no S-90 .. S-92 or S-137). A hit, not a boolean: only one Task's
 * marker and dummies darken.
 * `watermark`: not spent through `drawsOperationState`, since EP-7 exports it
 * and FR-020 removes it from both pictures; WY-2 and WY-3 of table T-041 set it
 * aside as it changes per run and machine.
 */
export function svgFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
  selection: Selection,
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
  /** The one reader of table T-236 here; a second is the drift the generated block stops. */
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  // ZO-5's label string and LC-5's size travel with the placement, not the geometry.
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  // FR-042's other half: the colour the author put on the row itself (AT-58).
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  /**
   * EP-12 of table T-076 (and DC-8 of table T-029a) in one place: every
   * operation mark reads this flag or what it empties, so the rule cannot be
   * half obeyed. Unlike EP-14's `picture` test below, this drops what the
   * SESSION asks for, not the DOCUMENT.
   */
  const drawsOperationState = picture === 'screen'
  const marks: readonly ItemRef[] = drawsOperationState ? selection.items : []
  const following = drawsOperationState ? follow : null
  /** FR-013's hover; PM-1a is exported (EP-5), so a darkened marker would leak the pointer. */
  const hover = drawsOperationState ? hovered : null
  const hand = drawsOperationState ? pointer : null
  /**
   * Matches the Task as well as the row, so one Task's marker does not darken
   * for another's hit.
   *
   * @purity pure
   */
  const handOn = (taskUid: number, rows: readonly Hit['grab'][]): boolean =>
    hover !== null &&
    hover.item.kind === 'task' &&
    hover.item.taskUid === taskUid &&
    rows.includes(hover.grab)
  /**
   * FR-013's pointer-on-it asked of the drawn figure (as HF-6 reads it), not of
   * the table T-023d row a press would take: MK-9a scopes that priority to
   * overlapping grabs. The marker still goes through `handOn`.
   * @provisional PND-360
   *
   * @purity pure
   */
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
  /**
   * SL-1's selected routes, keyed by both ends. `ItemRef` names a link by its
   * successor and ordinal, `DependencyGeometry` by both UIDs; `Task.dependencies`
   * joins them (as `input-command-translator.ts` does). The ordinal is not the
   * index in `geometry.dependencies`: RT-4a drops undrawn links.
   */
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  for (const item of marks) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

  // SVG document order is paint order, so these arrays are joined in table
  // T-020's back-to-front order; the bands are the ground under all of it.
  const bandParts: string[] = []
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []
  // FR-098 reaches every Task figure, so each array has a PINNED twin, drawn
  // unclipped (a pinned row is inside the band, LF-14); the plain arrays are
  // clipped only when something is pinned.
  const planPartsPinned: string[] = []
  const guidePartsPinned: string[] = []
  const actualPartsPinned: string[] = []
  const markerPartsPinned: string[] = []
  const labelPartsPinned: string[] = []
  // Dependency lines (table T-020's ZO-4) get the same split: a line between
  // two rows crosses into the band exactly as a bar does.
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []
  // FR-009's bar-exclusion rects, collected in the task loop into one <mask>.
  const barMaskParts: string[] = []
  // No table T-020 row for an annotation; it goes over ZO-5's labels, since
  // NFR-007's 4.5:1 is met on the comment box's own ground.
  // @provisional PND-238
  const annotationParts: string[] = []
  // Not table T-020 rows either (FR-075's overlay, U-19's ruler); drawn over its six.
  const handleParts: string[] = []
  // SL-8's frames, over the bars that would hide them (framed half of SL-1 only).
  const selectionParts: string[] = []

  // FR-043's dummies share the actual arrays (no table T-020 row for U-52): they
  // stand in for the missing actual bar (as GR-7 hangs off GR-17), so paint at
  // ZO-2. A Task has dummies exactly when it has no actual bar.
  // @provisional PND-209
  //
  // STOP -- the actual FR-043 while grabbing is not drawn: it needs the press in
  // flight, which a hovered hit is not.

  // FR-042's bands, clipped to the Row Area: S-78 slides the stack under the ruler.
  const area = regions.rowArea
  const areaBottom = area.y + area.height
  // FR-098: a flowing row is cut at the scrolling top (LF-14), a banded row at the
  // Row Area top; `scrollAreaY` is optional only in the type and equals the
  // Row Area top when nothing is pinned.
  const scrollTop = layout.scrollAreaY ?? area.y
  // Not gated on `scrollAreaY` alone: `pinnedBandOf` always returns a number, which
  // would add a no-op clip-path and change the bytes `npm run parity` compares.
  const pinnedGroupIds = new Set(
    layout.rows.filter((row) => row.isPinned === true).map((row) => row.groupId),
  )
  const hasPinnedRows = pinnedGroupIds.size > 0
  /**
   * Cull, screen only: every frame is serialised and re-parsed (`DomSvgSurface`,
   * UF-49), and most of a large document cannot reach a pixel. It only declines
   * to WRITE; unlike `FR-018` it drops nothing from layout, hit test or answers.
   * Not in an export: its canvas is the content and WY-2 of table T-041 compares
   * exports. Vertical margin is the area height (a row's figures stay in its
   * band); sideways see `OFF_SCREEN_SIDE_MARGIN`.
   */
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
    // S-68 / S-165.
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}"` +
        ` stroke-width="${rounded(GROUP_GRID_LINE_WIDTH_PX)}"${figureKey(`${rowKey}-rule`)}/>`,
    )
  }

  // FR-089's date grid lines, at `tickStrideOf`'s step (FR-017): the finest
  // ruler row, not the day row (the year tier has only a year row).
  // Colour S-149, the ruler's rule; no table T-236 row names it. @provisional PND-315
  if (settings.dateGridLinesVisible) {
    const gridFrom = dateAtX(layout, area.x)
    if (gridFrom !== null) {
      const finest = ROWS_OF_TIER[layout.tier][ROWS_OF_TIER[layout.tier].length - 1]
      const gridCap = Math.ceil(area.width / Math.max(0.001, layout.pxPerDay)) + 1
      // The same value the band takes, asked of the same member (LF-1).
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
        // Held to the area, unlike ruler labels: left of it the rule would cross
        // the row title panel (SC-1 of table T-031).
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
    // An unplaced Task is never culled (`placedOf` is its only position). Either
    // span reaching counts; `actualX` null is no actual, and read as 0 would never cull.
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
      // FR-009's bar-exclusion mask, the plan half.
      const planBarBox = boxOfPoints(cornersOfBar(task.plan))
      if (planBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(planBarBox, `${taskKey}-plan-mask`))
      }
    }
    for (const guide of task.guides) {
      // S-105.
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
      // FR-009's bar-exclusion mask, the actual half.
      const actualBarBox = boxOfPoints(cornersOfBar(task.actual))
      if (actualBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(actualBarBox, `${taskKey}-actual-mask`))
      }
    }
    // FR-043's faint mark. EP-14 can be obeyed only here: stripping the geometry's
    // dummies would blank `markerAnchorX` (GR-7 hangs off GR-17) and lose EP-5's
    // marker (WY-3 of table T-041); table T-023d keeps GR-17 as a grab target.
    if (picture === 'screen' && task.dummies.length > 0) {
      // `actual` is the paint the actual bar would take (FR-013, FR-041).
      // The rectangle is read from `DummyGeometry.ink`, not recomputed: table T-023d
      // makes the drawn mark the grab target `item-hit-area.ts` tests.
      // Every dummy of one Task shares `ink` (it stands on GR-9's day).
      const ink = task.dummies[0]!.ink
      const marks = barSvg(
        dummyFigure(
          task.milestoneFigure,
          { x: ink.x + ink.width / 2, y: ink.y + ink.height / 2 },
          ink.width,
          ink.height,
        ),
        actual,
        `${taskKey}-dummies`,
      )
      // FR-013: faint, fully opaque under the pointer (S-131 is the only degree).
      // One mark for GR-9 and GR-17 (or GR-18), so either darkens it. @provisional PND-351
      // Asked of the figure (`handInside`). @provisional PND-360
      // Tested on the ink's centre, not `at` plus half a width: a milestone's
      // dummy is centred on its day.
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
      // The bars' extent (what SL-2 clicks, SL-7 drags): the label (LC-6, FR-014)
      // would overlap neighbouring rows; marker and fade handles are not SL-1's.
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      // No extent when S-227 and S-228 hide both halves; a frame would sit at the origin.
      if (box !== null) {
        selectionParts.push(selectionFrameSvg(box, themed('S-151'), `${taskKey}-frame`))
      }

      // FR-075's grab points. FD-5 already decided which shapes get any.
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
      // `markerSvg` decides which symbol the faintness reaches. Darkened while
      // the hand is on GR-7, the row that claims the marker. @provisional PND-351
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
      // FR-044, nested in the marker test: S-63 switches both (table T-038) and
      // `resumeOf` builds an icon only with a marker. Placed by LF-11, not table
      // T-038's order; never faint (PM-1a never holds on a suspended Task); no
      // milestone test (LF-11 leaves `resume` null).
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
    // OC-2 of table T-038 (FR-090), placed by `outsideLabelBoxOf`. End-anchored,
    // so FR-093's estimate errs leftward, away from the bar. S-60 / S-61 were
    // spent by LC-7 (FR-049): hidden arrives as a null box. S-168 / S-169 as ZO-5.
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
  // FR-009's bar-exclusion mask: one id per picture, shared by every halo.
  const dependencyHaloMaskId = `grs-dependency-halo-mask-${pictureId(
    `${rounded(width)}x${rounded(height)}|${barMaskParts.length}`,
  )}`
  const defsParts: string[] = []

  // FR-098: one clip-path over the scrolling remainder (S-78), `scrollTop` to the foot.
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

  // Mint the head once via `arrowMinted`, never by reading `defsParts.length`
  // (the list is shared).
  // FR-009: selected lines in front, else created order, which
  // `geometry.dependencies` already is; relies on `sort` being stable (ES2019+).
  const orderedDependencies = [...geometry.dependencies].sort((a, b) => {
    const aFront = selectedLinks.has(`${a.predecessorUid}>${a.successorUid}`) ? 1 : 0
    const bFront = selectedLinks.has(`${b.predecessorUid}>${b.successorUid}`) ? 1 : 0
    return aFront - bFront
  })
  // S-224 multiplies the line's own width, not SL-8's thickened width.
  const haloWidth = settings.dependencyWidth * NOT_STORED_DEPENDENCY_SIZES['S-224']
  let arrowMinted = false
  for (const link of orderedDependencies) {
    if (!settings.dependencyVisible) break
    if (!arrowMinted) {
      arrowMinted = true
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
      // Beside the head: shared by every line, written once.
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
    // The cull on the polyline's own box, both axes (exact; never the ends' rows,
    // as a line crosses the window with neither end in it). After minting, so
    // the `<marker>` exists even if the first line is culled.
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
    // Pinned only when both ends are; `points` holds current positions, so one
    // clip trims only the stretch scrolled into the band.
    // @provisional PND-416 -- an end scrolled off the top is not RT-4a's undrawn
    // end, so the line stays and is cut (dropping it would blink on small scrolls).
    const predecessorPlaced = placedOf.get(link.predecessorUid)
    const successorPlaced = placedOf.get(link.successorUid)
    const predecessorPinned =
      predecessorPlaced !== undefined && pinnedGroupIds.has(predecessorPlaced.groupId)
    const successorPinned =
      successorPlaced !== undefined && pinnedGroupIds.has(successorPlaced.groupId)
    // FR-009's halo right before its own line: later halos cover earlier lines and
    // the line restores its ink. The shared `mask` keeps halos off the bars.
    const points = pointsOf(link.points)
    const haloMask = barMaskParts.length > 0 ? ` mask="url(#${dependencyHaloMaskId})"` : ''
    // A dependency IS its two ends; the halo and the line share the key.
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
    // CU-1's line in S-163; its width is the typed 1, which no row holds.
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
    // CU-2's two lines (EP-6) in S-195; DC-8 marks the follower by width. In
    // `linkParts` with CU-1: no table T-020 row for either cursor. @provisional PND-312
    const colour = themed('S-195')
    // DC-1. See `DualCursorFollow` for PND-310 and PND-311.
    const followedDay =
      following === null || following.x === null ? null : dateAtX(layout, following.x)
    const followedX = followedDay === null ? null : xFromDay(layout, followedDay)
    for (const side of ['date1', 'date2'] as const) {
      const isFollowing = following !== null && following.side === side
      const standing = side === 'date1' ? cursors.date1X : cursors.date2X
      const x = isFollowing && followedX !== null ? followedX : standing
      // DC-8 borrows SL-8's rule: S-194 is the line's own width.
      const width = selectedLineWidth(NOT_STORED_DUAL_CURSOR_SIZES['S-194'], isFollowing)
      linkParts.push(
        `<line x1="${rounded(x)}" y1="${rounded(cursors.top)}"` +
          ` x2="${rounded(x)}" y2="${rounded(cursors.bottom)}"` +
          ` stroke="${colour}" stroke-width="${rounded(width)}"` +
          // Keyed by S-65's member, never by which line follows.
          `${figureKey(`dual-cursor-${side}`)}/>`,
      )
    }
  }

  // CU-3 of table T-029, mode S-66; `drawsOperationState` keeps it out of an
  // export (EP-6). In `linkParts` for PND-312's reason; region per PND-342 below.
  if (drawsOperationState && settings.guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.rowArea
    const inside =
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    if (inside) {
      // No row holds the guide colour (table T-236) or width (table T-206). S-148,
      // the muted neutral, is neither cursor colour, since the guide carries no
      // date; the width is the status line's typed 1. @provisional PND-341
      const guideColour = themed('S-148')
      const guideWidth = 1
      // Only with the pointer over the `Row Area`: no row covers the ruler or a panel.
      // @provisional PND-342
      const vertical = (x: number): string =>
        `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
        `${figureKey('guide-cursor-vertical')}/>`
      if (settings.guideCursorMode === 'crosshair') {
        // 十字: the vertical and the horizontal, crossing under the hand.
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"` +
            `${figureKey('guide-cursor-horizontal')}/>`,
        )
      } else if (settings.guideCursorMode === 'single-vertical') {
        // 縦 1 本.
        linkParts.push(vertical(pointer.x))
      }
      // No third branch (CU-3, MUST NOT); CU-2's pair is drawn from `dualCursor` above.
    }
  }

  for (const box of geometry.highlightBoxes) {
    // FR-019. `cornerRadiusPx` is already screen px; `ry` defaults to `rx`.
    const radius = box.cornerRadiusPx
    const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        rounding +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ` stroke-width="1"${figureKey(`box-${box.id}`)}/>`,
    )
    // SL-8 as a separate rect: the frame may not re-stroke the outline, and the
    // dash must survive the author's line colour.
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`))
    }
  }

  for (const box of geometry.commentBoxes) {
    // FR-019's leader to the body's bottom-left. No row gives a weight: the literal
    // 1 shared with the box and body. Pushed before the body, which covers its end.
    // `leaderShapeKind` is unread (FR-019 defers retiring it).
    annotationParts.push(
      `<line x1="${rounded(box.anchor.x)}" y1="${rounded(box.anchor.y)}"` +
        ` x2="${rounded(box.body.x)}" y2="${rounded(box.body.y + box.body.height)}"` +
        ` stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}-leader`)}/>`,
    )
    // The body is filled (S-146; S-162 is the precedent) so NFR-007's 4.5:1 has a
    // known ground. ANNOTATION_COLOUR as ink fails on the dark ground (3.58:1,
    // WCAG 2.1), so it only outlines (1.4.11's 3:1). The fill hides what is behind.
    // @provisional PND-231
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}`)}/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      // Baseline at the foot of each em box: FR-097 sets the line to the type
      // height and no row places the baseline (S-179 is the ruler's). Descenders
      // eat into S-181's padding. @provisional PND-230
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}" fill="${themed('S-147')}"` +
          // The line number is the identity: FR-097 wraps only this box's text.
          ` xml:space="preserve"${figureKey(`comment-${box.id}-line-${index}`)}>` +
          `${escaped(line)}</text>`,
      )
    }
    // SL-8, a separate rect for the highlight box's reason.
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
      )
    }
  }

  // Clipped to the scrolling remainder, and left unwrapped when nothing is
  // pinned, so an unpinned document's markup carries no clip.
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

  // FR-020 / EP-7: the clip is `regions.rowArea` (PI-35).
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
    // Pinned first, unclipped; pinned and scrolling never share pixels (`rowGap`).
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
    // ZO-6 of table T-020, SL-3's range rectangle while held. `selectionFrameSvg`:
    // a look of its own needs values no row states. Before the ruler, so a
    // marquee over the band keeps the dates visible. No export guard: the export
    // passes none.
    ...(marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'), 'marquee')]),
    // FR-020's layer over the Row Area; clipped to U-50, yet before the band so
    // the band stays drawn over everything.
    ...(watermark === null
      ? []
      : [watermarkSvg(area, width, watermark, themed('S-223'), watermarkClipId)]),
    // FR-017's band last: LF-12's overhang and first-row labels escape the Row
    // Area clip, and the Time Ruler does not scroll (SC-2).
    ...rulerSvg(
      layout,
      settings,
      regions.timeRuler,
      // S-108 is the day the week starts on when the document names none.
      schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
      // No `achromatic` here: S-146 follows the hue, so `colourOf` applied
      // monochrome; the row bands need it because theirs may be an author colour.
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

/** Table T-023d's row claiming the progress marker (FR-013's not-started marker). */
const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GR-7']

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206, T-207 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_SELECTION_SIZES: {
  /** S-174, in px */
  readonly 'S-174': number
  /** S-175, in px */
  readonly 'S-175': readonly [number, number]
  /** S-178, in × */
  readonly 'S-178': number
} = {
  'S-174': 2,
  'S-175': [2, 2],
  'S-178': 2,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it. ⭐ AND
 * ITS PICTURE DOES LEAVE THE TOOL -- EP-6 of table T-076 draws the
 * two lines into an exported picture -- so what makes this the
 * reader's own is not that the mark is hidden but that the document
 * keeps the two DATES (S-65) and never the width they take.
 */
export const NOT_STORED_DEPENDENCY_SIZES: {
  /** S-224, in × */
  readonly 'S-224': number
} = {
  'S-224': 3,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it, and EP-14
 * of table T-076 keeps the dummy out of the exported picture without
 * reserving its place -- so a reader handed this document sees the
 * same picture whatever this value is.
 */
export const NOT_STORED_DUMMY_SIZES: {
  /** S-180, in px */
  readonly 'S-180': number
} = {
  'S-180': 30,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it. ⭐ AND
 * ITS PICTURE DOES LEAVE THE TOOL -- EP-6 of table T-076 draws the
 * two lines into an exported picture -- so what makes this the
 * reader's own is not that the mark is hidden but that the document
 * keeps the two DATES (S-65) and never the width they take.
 */
export const NOT_STORED_DUAL_CURSOR_SIZES: {
  /** S-194, in px */
  readonly 'S-194': number
} = {
  'S-194': 1,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it. ⭐ AND
 * ITS PICTURE DOES LEAVE THE TOOL -- EP-6 of table T-076 draws the
 * two lines into an exported picture -- so what makes this the
 * reader's own is not that the mark is hidden but that the document
 * keeps the two DATES (S-65) and never the width they take.
 */
export const NOT_STORED_RULER_WEEKDAY_SIZES: {
  /** S-219 */
  readonly 'S-219': number
} = {
  'S-219': 0.6,
}

/**
 * The colours of table T-236, by row ID, in both renderings.
 *
 * ⭐ Table T-236 holds constants baked into the artifact. FR-041 (MUST
 * NOT) forbids saving a derived colour, so none of these is a document
 * setting and none may become one.
 *
 * ⛔ `H` IN A HUE IS NOT A TYPO. Where `followsHue` is true the row
 * follows themeHue (S-73), and the manuscript writes the letter so that
 * S-73's value is stated once rather than copied into every row. Solve it
 * by putting the hue in before use. A row with `followsHue` false states
 * its own hue and is used exactly as written -- the dependency and
 * progress lines are the two of those (FR-041).
 */
export const SCHEDULE_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  /* S-146 */
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-147 */
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-148 */
  'S-148': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
  /* S-149 */
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
  /* S-151 */
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  /* S-155 */
  'S-155': { light: 'hsl(H 46% 80%)', dark: 'hsl(H 32% 26%)', followsHue: true },
  /* S-156 */
  'S-156': { light: 'hsl(H 44% 46%)', dark: 'hsl(H 46% 66%)', followsHue: true },
  /* S-157 */
  'S-157': { light: 'hsl(H 62% 34%)', dark: 'hsl(H 62% 64%)', followsHue: true },
  /* S-158 */
  'S-158': { light: 'hsl(H 66% 22%)', dark: 'hsl(H 70% 80%)', followsHue: true },
  /* S-159 */
  'S-159': { light: 'hsl(26 88% 44%)', dark: 'hsl(30 92% 60%)', followsHue: false },
  /* S-160 */
  'S-160': { light: 'hsl(354 62% 42%)', dark: 'hsl(354 70% 64%)', followsHue: false },
  /* S-161 */
  'S-161': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-162 */
  'S-162': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-163 */
  'S-163': { light: '#8b9099', dark: '#767c86', followsHue: false },
  /* S-164 */
  'S-164': { light: 'hsl(H 42% 96%)', dark: 'hsl(H 18% 20%)', followsHue: true },
  /* S-165 */
  'S-165': { light: 'hsl(H 34% 88%)', dark: 'hsl(H 16% 28%)', followsHue: true },
  /* S-166 */
  'S-166': { light: 'hsl(H 40% 97%)', dark: 'hsl(H 20% 17%)', followsHue: true },
  /* S-167 */
  'S-167': { light: 'hsl(H 20% 99%)', dark: 'hsl(H 14% 11%)', followsHue: true },
  /* S-168 */
  'S-168': { light: '#000000', dark: '#ffffff', followsHue: false },
  /* S-169 */
  'S-169': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-195 */
  'S-195': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  /* S-223 */
  'S-223': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
}

/**
 * The values table T-207 states that this unit needs, by row ID.
 *
 * ⭐ Table T-207 holds what is BAKED INTO THE ARTIFACT and not kept
 * in the document, so these are not document settings and are not
 * in SETTINGS_DEFAULTS. They are reached by row ID because the
 * table has no key column -- the row ID is the specification's own
 * name for them.
 *
 * ⭐ THE FOUR VALUES FR-020 DRAWS WITH, less the colour. The angle is
 * in degrees, the size is a fraction OF THE PICTURE's WIDTH (S-81)
 * and the spacing is a multiple OF THE MARK's OWN HEIGHT, so two of
 * the three mean nothing without the thing they multiply -- which is
 * why they are ratios here and not lengths.
 *
 * ⛔ THE INK IS NOT HERE. S-223 is a row of table T-236, which states
 * a light and a dark rendering of one decision; it arrives with the
 * other colours. ⚠️ S-102 is the OPACITY and is not a colour: it is
 * one number in both renderings, and table T-207 is where it stands.
 */
export const WATERMARK_MARKS: {
  /** S-220 */
  readonly 'S-220': string
  /** S-221 */
  readonly 'S-221': string
  /** S-222 */
  readonly 'S-222': string
  /** S-102 */
  readonly 'S-102': string
} = {
  'S-220': '-30',
  'S-221': '0.01125',
  'S-222': '14.44',
  'S-102': '0.06',
}
// </generated>

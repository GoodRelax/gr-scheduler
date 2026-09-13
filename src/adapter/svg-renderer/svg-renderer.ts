// SvgRenderer -- public entry of this folder.
//
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19
//
// Turns the geometry into an SVG string (FR-080, CP-19). No shape is
// recomputed here: 表 T-068 LC-11 already made every vertex.
//
// ⭐ Reads `Schedule` as well as the geometry, and draws FR-042's row band
// and FR-020's watermark layer: `_source/components.json` draws those edges.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
// PI-7's own answer type. ⭐ The hit is READ here and never taken: this unit
// only reads the answer handed in, so `Hit` arrives as a type and
// `itemAtPointer` itself stays where it is.
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
 * ⭐ WHY IT EXISTS. EP-14 is the row no other argument can reach: FR-043's
 * dummies hang on the Task being unstarted, a property of the DOCUMENT. The
 * obvious shortcut -- emptying the geometry's dummies -- is a defect; the note
 * at the dummy site in `svgFromSchedule` says why.
 *
 * ⭐ EP-12 is spent through it as well (`drawsOperationState`).
 *
 * ⚠️ DELIBERATELY NARROW. Each row of table T-076 that reaches this argument
 * does so for a stated reason; it is not a general "export mode" that another
 * row may be folded into without one.
 *
 * @provisional PND-210
 */
export type SchedulePicture = 'screen' | 'export'

/**
 * The Dual Cursor mode as it stands THIS FRAME.
 *
 * ⭐ WHY A PARAMETER AND NOT PART OF THE GEOMETRY. Which side follows is a
 * current value, which LY-5 of table T-060 leaves with the Framework, and DC-8
 * of table T-029a keeps its mark out of an export while EP-6 still draws the
 * lines. So the placement travels in the geometry and the mark travels here.
 *
 * ⛔ `'date1' | 'date2'` IS WRITTEN OUT RATHER THAN IMPORTED. It is declared as
 * `DualCursorSide` in `screen-state.ts`, and `_source/components.json` gives
 * this component no edge to ScreenState. ⚠️ The compiler keeps the two in
 * step: `frame-loop.ts` hands ONE value along both seams.
 */
export interface DualCursorFollow {
  /** DC-2. */
  readonly side: 'date1' | 'date2'
  /**
   * Where the pointer is, in screen px, or `null` while it is outside the
   * window.
   *
   * ⭐ The line is drawn at the day this point falls in, not at the point.
   * @provisional PND-310
   * ⛔ With no pointer the line stands at its stored date. @provisional PND-311
   */
  readonly x: number | null
}

/**
 * FR-020's trail, as the picture receives it.
 *
 * ⭐ WHY BOTH HALVES ARE HANDED IN. The name is S-99a of table T-206, kept in
 * `localStorage` (LY-5 of table T-060 leaves that with the Framework), and the
 * moment is a clock; a pure unit reads neither.
 *
 * ⭐ `null` is S-144 of table T-206, spent by the caller. ⛔ Not a default this
 * unit chose: inventing a name here would put one nobody entered into a
 * reader's exported file.
 */
export interface Watermark {
  /**
   * S-99a of table T-206. ⛔ Not the author's (FR-020's RATIONALE).
   * ⚠️ Where it comes from is FR-086's, not this unit's.
   */
  readonly openedBy: string
  /**
   * The moment, spelled as FR-020 requires.
   *
   * ⛔ Spelled by the caller and drawn exactly as it arrives, so the one
   * speller is the side that read the clock (FR-020 fixes how).
   */
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
 * The one colour FR-019 (MUST) asks for that no table holds: the line an
 * annotation takes when the author named none.
 *
 * ⛔ NOT IN TABLE T-236, although FR-041 names the annotation beside the two
 * lines that table does settle. ⚠️ The fade grab point's pair below is typed
 * here for the same reason; every colour a row does hold arrives generated.
 *
 * ⛔ AND THIS VALUE IS MEASURABLY WRONG. FR-019 wants it kept away from the
 * theme hue, the dependency line and the progress line; `#b45309` is hue 26,
 * the hue S-159 gives the dependency line in the light theme. Correcting it
 * means choosing a colour, which this unit may not do.
 *
 * @provisional PND-1
 */
const ANNOTATION_COLOUR = '#b45309'

/**
 * The square FR-075 (MUST) shows on the selected Task, and its outline.
 *
 * ⛔ STOP -- NOT IN TABLE T-236. No row of it is the fade grab point: table
 * T-210 gives the point its half-side (S-109), its stroke (S-110) and the
 * condition for showing it (S-111), and stops there. Table T-236 is where the
 * face and outline rows would have to go.
 *
 * @provisional PND-1
 */
const FADE_HANDLE_FILL_COLOUR = '#ffffff'
/** The other half of the same missing row. See `FADE_HANDLE_FILL_COLOUR`. @provisional PND-1 */
const FADE_HANDLE_STROKE_COLOUR = '#374151'

/**
 * How far past each side edge of the `Row Area` a figure still counts as worth
 * writing, as a multiple of that area's own width. The sideways half of the
 * cull `skipsOffScreen` states; the up-and-down half takes the area's own
 * HEIGHT and needs no number at all, because a row's figures stand in that
 * row's band.
 *
 * ⭐⭐ 0.25 IS THE AUTHOR'S OWN NUMBER: the drawn range is one and a half
 * windows in total -- a quarter of a window on either hand, not 1.5 on EACH
 * side. A quarter of a window still clears the assignee and the name by far
 * more than either can overhang.
 * ⛔ NO ROW OF docs/spec STATES A MARGIN OR AN OVERHANG. Sideways the band is
 * not the whole of a Task's ink -- NL-3 of table T-013 puts the name outside
 * the bar, GR-11 hangs the assignee off it, the percent sits beside it -- so
 * the bar's own rectangle is too tight a test, and how much to add is a choice.
 *
 * ⛔ NO SETTINGS ROW IS INVENTED FOR IT. The value decides nothing a reader can
 * see, and a document that carried it would let one machine's saved file
 * change how much another machine declines to write.
 *
 * ⚠️ A FRACTION OF THE WIDTH, NOT A FIXED PX: `MC-6` of table T-025 is one
 * screen and the application is drawn on others.
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
 * WHAT ONE DRAWN FIGURE IS, written on the figure itself so that the same
 * figure can be recognised in the next frame's picture.
 *
 * ⭐ BUILT FROM the identifier the DOCUMENT gives the thing (a `Task`'s UID, a
 * `TaskGroup`'s id, a box's id, a day's serial) and the part's name -- never an
 * index into an array, which a delete or a sideways scroll moves.
 *
 * ⛔ NOT `data-role`, which carries a UI part's settled name (W-4 of table
 * T-006a); none of these figures is one.
 *
 * ⚠️ NOT A DIFFING PROTOCOL. The seam still hands over one whole string; the
 * key is only the identity a differ on the far side cannot recover once lost.
 *
 * ⭐ ONE FIGURE MAY BE SEVERAL ELEMENTS, AND THEY ALL CARRY THE SAME KEY (a
 * line-form bar's line, head and dots; a marker's disc and symbol). ⛔ No
 * index apiece: the count varies with the shape, so it would move for the same
 * reason a position does.
 *
 * ⚠️ IT COSTS BYTES and the picture is serialised once a frame, so nothing
 * else (size, state, colour) is written into it.
 *
 * ⛔ THE EXPORT CARRIES IT TOO. Table T-076 says which parts an export draws,
 * not which attributes, and FR-080 with WY-2 of table T-041 asks for one
 * drawing; dropping it would be a rule this file invented. ⚠️ Not decided
 * here: the keys put `Task` UIDs and `TaskGroup` ids into a reader's picture.
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
 * ⚠️ `ScreenRect` rather than a shape of this file's own: `HighlightGeometry`
 * already carries one, and two names for the same four numbers would only make
 * them harder to put side by side.
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
 * Every point one bar reaches, in either of table T-012's two forms.
 *
 * ⛔ SH-3's head and SH-4's dots reach past `from` and `to`, so reading only
 * the two ends would put the frame inside the figure.
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
 * One rectangle for FR-009's bar-exclusion `<mask>` (black hides): the same
 * `boxOfPoints(cornersOfBar(...))` the selection frame reads, not a second
 * notion of "the bar".
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
 * The four corners of a rectangle CENTRED on one point.
 *
 * ⚠️ The centre arrives already worked out from `DummyGeometry.ink`; table
 * T-023d's left-edge anchoring is solved in `dummiesOf`, not here.
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
 * One closed outline carried from the box it was drawn in onto another box.
 *
 * ⭐ WHY A MAP AND NOT A SECOND DRAWING. FR-043 gives the milestone dummy the
 * milestone's own actual figure, and the marks of table T-012's `SH-5` live
 * unexported inside `schedule-geometry.ts`; writing the glyphs again here would
 * be a second spelling of `SH-5` to drift. The box arrives from `dummiesOf`.
 *
 * ⚠️ x and y are scaled separately. That is safe only because both boxes are
 * square (FR-043); fed a non-square box, a circle glyph becomes an ellipse.
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
 * The figure FR-043's one faint mark is drawn as, on this Task.
 *
 * ⭐ WHERE THE FIGURE COMES FROM. A not-started Task has no actual bar, so the
 * actual milestone figure is not on the geometry to copy.
 * `TaskGeometry.milestoneFigure` answers it: `barOf` builds a milestone's plan
 * and actual from one glyph and only their side differs.
 *
 * ⛔ NO COLOUR IS DECIDED HERE; the caller hands in the actual bar's paint.
 *
 * ⛔ `task.plan` IS NOT READ. A milestone drawn while the plan is hidden
 * (`planVisible` false) has no plan bar to copy, and would fall back to the
 * rectangle FR-043's MUST NOT forbids; the geometry answers it in one place.
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
  // ⛔ A silhouette with no extent on one axis cannot be carried onto a box:
  // the ratio would be a division by zero. Nothing is invented for it.
  if (from === null || from.width <= 0 || from.height <= 0) return rectangle
  return {
    form: 'outline',
    points: pathFitted(milestone.points, from, box),
    // ⭐ The cut-out marks ride the SAME map as the silhouette, so `box` from
    // `hexagon` and `smile` from `circle` stay told apart at the dummy's size
    // for the reason `BarGeometry.marks` gives at full size.
    marks: (milestone.marks ?? []).map((one) => pathFitted(one, from, box)),
  }
}

/**
 * SL-8 of table T-023c (MUST), the FRAMED half: a dashed rectangle on the
 * target's BOUNDING RECTANGLE.
 *
 * ⚠️ A target with no extent in one axis gets that side widened to S-174, the
 * frame's own width. ⛔ A rectangle of zero height draws no outline at all, so
 * a figure that collapsed to a single run -- a zero-span SH-3, whose head
 * shrinks with the span, or a milestone drawn at side 0 -- would carry no sign
 * rather than a thin one.
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
 * SL-8's other half: a selected line is drawn at S-178 times its own width.
 *
 * ⭐ The line is drawn thicker IN PLACE rather than over-painted. GD-6 (MUST)
 * keeps the arrowhead on the dependency line, and a second polyline laid on top
 * would leave that head at the thin line's weight.
 *
 * ⛔ THE COLOUR IS NOT CHANGED. Recolouring the dependency line would also need
 * a second arrowhead marker in the selection colour, and no table holds it.
 *
 * ⚠️ DC-8 of table T-029a spends it too, and passes whether a Dual Cursor line
 * is FOLLOWING, not selected -- SL-1 admits no cursor line.
 *
 * ⛔ No export test here: `drawsOperationState` has already made `selected`
 * false for an export.
 *
 * @purity pure
 */
function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
}

/**
 * The same colour with the hue taken out, for FR-041's monochrome, applied
 * when drawing and never to the stored value.
 *
 * ⚠️ What survives is HSL's lightness, not WCAG's luminance. Monochrome shows
 * the same picture without hue, so the value kept is the one the colour was
 * WRITTEN with; luminance is the measure NFR-007 judges by, which is a
 * different question from how to draw.
 *
 * ⛔ A colour this cannot read comes back unchanged. Guessing at one would be
 * worse than leaving a single shape coloured, which a reader can see and say.
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
 * One row of table T-236, resolved for the theme in force.
 *
 * ⛔ Monochrome reaches only `followsHue` rows (FR-041, MUST NOT).
 *
 * ⭐ EXPORTED so that `ImageExporter` paints EP-9's divider line in S-149
 * through this one function rather than a second guess of the colour (LR-2).
 *
 * @purity pure
 */
export function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  // The generator raises on a row table T-236 has not, so this can only fire
  // when a row ID typed here is not one the block was asked for.
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

/**
 * How thick the `Group Grid Lines` (U-18) rule is drawn, in CSS px.
 *
 * ⭐ EXPORTED: this is EP-9's one place.
 *
 * ⭐ WHY HERE AND NOT IN A TABLE. EP-9 forbids a settings key for the divider,
 * and no row of tables T-202 / T-203 / T-236 gives the group grid line a width
 * (S-68 is whether it is drawn, S-165 its colour). So the number is the
 * drawer's own: the band loop in `svgFromSchedule` takes it, and
 * `screen-frame.ts` takes it for the divider's line rectangle.
 */
export const GROUP_GRID_LINE_WIDTH_PX = 1

/** Which column of table T-236 the saved theme asks for (S-72). @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

/**
 * FR-042's band colour for a row the author gave none: S-166 at depth 1,
 * S-164 and S-167 alternating below it.
 *
 * ⛔ Counted by the row's position (FR-042's RATIONALE).
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
  // ⭐ One call for both halves. A themed colour arrives achromatic already
  // and `achromatic` is idempotent, so the chosen colour needs no branch of
  // its own -- a second branch is where the author's colour gets thrown away
  // instead of drained.
  return {
    stroke: monochrome ? achromatic(stroke) : stroke,
    fill: monochrome ? achromatic(fill) : fill,
    strokeWidth,
  }
}

/**
 * ZO-3's marker: a filled disc in S-162 (table T-020's opaque backing) inked in
 * S-161, with table T-021's symbol stroked inside.
 * ⛔ The symbols' exact figures are not in the specification; PND-2 covers the
 * same kind of gap.
 *
 * ⭐ ONLY PM-1a IS FAINT (FR-013). PM-4 wins over PM-1a (table T-021), so
 * keying on the symbol is what the late marker's exemption reduces to.
 *
 * ⭐ ONE GROUP RATHER THAN AN ATTRIBUTE ON EACH SHAPE. The backing and the ink
 * overlap, and two translucent shapes composite to a third value where they
 * meet -- so per-shape opacity would draw the symbol darker than its own disc
 * and S-131 would no longer be the degree of anything. ⚠️ The backing goes
 * translucent with the rest, a real loss against table T-020's opaque backing;
 * FR-013's MUST decides.
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
  // The wrapping group carries the key too: in the PM-1a case it is what a
  // differ finds first.
  const named = figureKey(key)
  // ⛔ S-24 for the disc and the symbol alike: FR-094 (MUST NOT) forbids this
  // file a dimension of its own, and S-24 is the only stroke width table T-201
  // keeps in the 進捗マーカー group.
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
 * FR-044's resume icon.
 *
 * ⭐ THE PATHS ARE READ, NOT REBUILT. `resumeOf` has solved LF-13 of table
 * T-221, so S-25's invalid look arrives as smaller paths and is not a second
 * condition here. ⚠️ `ResumeGeometry.valid` is read by nobody who draws: the
 * size is the difference, and no row of table T-236 holds a second colour.
 *
 * ⭐ GR-8's hit box is S-22's box centred on `[...arm, ...head]`, so drawing
 * exactly those two paths makes the picture and the grab agree. ⚠️ The drawn
 * square and the hit square differ in size on purpose: S-25 shrinks only the
 * drawing.
 *
 * ⚠️ The stroke is S-24, for the reason `markerSvg` gives. S-161 is the ink:
 * table T-236 holds no row of its own for this icon.
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
 * ZO-5's name label, at the rectangle the geometry placed. ⭐ The size is read
 * off the placement: writing FR-077's formula a second time is how the
 * measured width stops matching the glyphs.
 *
 * ⚠️ `labelHaloOfFont` is the outline table T-017a's note reaches for when a
 * hue cannot meet CT-1 and CT-2. It is drawn always, which is the safe side of
 * that note rather than a reading of it.
 *
 * ⚠️ `paint-order="stroke"` puts the stroke UNDER the fill, so the fill is the
 * glyph (S-168) and the stroke is the halo behind it (S-169). Swapping the two
 * attributes paints the label in its own outline.
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
   * How far into its own box the glyphs start.
   *
   * ⭐ AN ARGUMENT BECAUSE THE TWO CALLERS ARE ANSWERING DIFFERENT ROWS. ZO-5's
   * name label is boxed to the ROOM it may take -- the shape's width, or the
   * run to `occupiedX1` -- so `labelPad` (S-31) is the inset that keeps it off
   * the edge. OC-2's two labels are boxed to their own ESTIMATED WIDTH, which
   * LC-7 counted the occupancy by, so an inset there would push the glyphs out
   * of the very box the stacking reserved and across the `labelGap` that holds
   * them clear of the bar.
   */
  padLeft: number,
  /** Which label this is, kept from frame to frame. */
  key: string,
  /**
   * Which edge of the box the glyphs are pinned to.
   *
   * ⭐ An argument for the same reason `padLeft` is one: OC-2's card is
   * right-aligned (FR-090). ⚠️ `padLeft` means nothing at the far end, so an
   * `end` caller passes 0.
   */
  anchor: 'start' | 'end' = 'start',
): string {
  const x = anchor === 'end' ? box.x + box.width : box.x + padLeft
  // ⭐ S-33 MULTIPLIES THE FONT, NOT THE BOX: table T-012's closing paragraph
  // makes it a shift inside the glyph, distinct from S-196's shape-to-label
  // gap. Taken against the box, the drop would grow with the bar's band.
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
    // ⭐ ONE PATH AND ONE FILL RULE, not a polygon with shapes laid on top.
    // `evenodd` is what cuts the marks OUT, so a milestone drawn on a coloured
    // band shows the band through its eyes rather than a second paint that
    // would have to guess what is behind it -- and no colour is minted here,
    // which table T-236 would otherwise need a row for.
    // ⛔ THE STROKE FOLLOWS EVERY SUBPATH, which is what makes a mark read at
    // the sizes a milestone is drawn at: the outline of the eye is the eye.
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
 * GD-6's arrowhead. LF-4 of table T-221 already ends every route on the
 * successor's edge, so the head only has to be put at the last vertex.
 *
 * ⭐ `markerUnits="userSpaceOnUse"` rather than the default `strokeWidth`:
 * the default would size the head by `dependencyWidth` instead of by S-19.
 *
 * ⚠️ S-19 is the head's length and base alike. LF-7 of table T-221 sizes the
 * arrow SHAPE's head and does not reach this line.
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
 * A name for one emitted picture, so two pictures on the same page do not
 * share a marker ID: the export draws a second picture into the document the
 * screen is already showing, and an SVG ID is document-wide.
 *
 * ⚠️ Derived from what the picture IS rather than from a counter, because this
 * unit is `pure` (table T-062) and a counter would make two calls with equal
 * arguments answer differently. Two pictures that agree on every part of the
 * seed are the same picture, and their markers would be identical.
 *
 * @purity pure
 */
function pictureId(seed: string): string {
  // FNV-1a over the seed. Any spread would do; this one is short and has no
  // dependency, and the value is a name, never a measurement.
  let hash = 0x811c9dc5
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Which row of the Time Ruler's band prints what -- table T-006b's ⑤.
 *
 * ⭐ The spec names steps, not rows (table T-238): `yearMonth` is TM-3 / TM-4's
 * `yyyy-mm`, and TM-2's two lines are `year` and `month` standing apart.
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
 * The `MM` of FR-017's `YYYY-MM`. ⭐ The width the month costs is what S-83 was
 * derived from (table T-205's derivation reads the label as `2026-01`), so a
 * month printed one digit wide at ten months of the year would make the label
 * narrower than the threshold that admits it.
 *
 * @purity pure
 */
function twoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * The days one row of the band puts a label on, left to right.
 *
 * ⛔ Only the day and weekday rows take `tickStrideOf`'s number (LF-1 of table
 * T-221); every other row walks its own calendar unit, and `month` walks the
 * same months as `yearMonth`. ⚠️ The stride is anchored on the day serial
 * rather than on the day the left edge falls on, or every label would jump one
 * place to the side each time the view is panned by a day.
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
 * FR-017's band, drawn (EP-2 draws it into the export too).
 *
 * ⭐ The grain is `layout.tier` and the thinning is `tickStrideOf`; neither is
 * worked out a second time, or it would part company with the layout the bars
 * were placed by. `ROWS_OF_TIER` is table T-238's shape and the label below is
 * its contents. The weekday arrives as `weekdayWords` because FR-038 gives
 * every printed word one dictionary, which is not this file.
 * ⛔ STOP -- no horizontal inset between a tick and its label: S-135 is the gap
 * between labels (LF-1's arithmetic) and S-136 the vertical pad, so the label
 * starts on its own rule until a row says otherwise.
 *
 * ⭐ THE BAND PAINTS ITS OWN GROUND (FR-041) in S-146, over the `band`
 * rectangle as handed in. ⛔ It goes FIRST so everything else sits on it, and
 * so what the Row Area lets past its top edge -- LF-12's overhang, a first-row
 * label -- is covered rather than showing through the band.
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
  // Every tick of every row sits at least one day after the one before it, so
  // the days the band spans bound the walk. ⚠️ This thins nothing -- it only
  // keeps the loop finite when pxPerDay is small enough to put thousands of
  // years behind one band.
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
    // S-136 above the label, S-179 below it, taken out of the glyph box (S-179's
    // note), so the row keeps its height.
    // ⚠️ Without the subtraction the clearance is nil at the three-row tier:
    // the baseline sits on the next row's rule, and on the foot rule for the
    // last one.
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
      // ⭐ The rule is drawn only where the boundary really falls, but the
      // label is held at the band's edge when its boundary is off to the left.
      // ⚠️ Exactly one tick per row can be left of the edge -- every row starts
      // at the tick containing `from` -- so no two labels are pinned together.
      // ⛔ Dropping it instead leaves the year row EMPTY at most positions: S-1's
      // note puts a year at about 2200px at 1x, more than one screen, so its
      // boundary is off to the left nearly always.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      // Table T-238, column by column; `m` and `d` are not padded.
      // ⚠️ `weekdayOf` numbers from 0 for Sunday (AT-17) and `weekdayWords`
      // arrives in that order, so no mapping stands here.
      // ⛔ A weekday the dictionary lacks prints as nothing: neither FR-038 nor
      // FR-017 names a substitute.
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
      // The weekday row alone prints smaller, by S-219 (table T-238).
      // ⚠️ The baseline does NOT move with it: the ratio applies to the size
      // and nothing else, so a second offset would be a number with no row.
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
 * The name table T-103 settles for the layer FR-020 lays down (U-20), written
 * on the group as `data-role`.
 *
 * ⛔ NOT kebab-case: W-4 of table T-006a sends a settled UI part name to W-6's
 * form.
 * ⚠️ It changes no hit test: `readScreenPartAt` stops at DomScreenSurface's own
 * root and answers `null` under this layer.
 */
const WATERMARK_ROLE = 'Watermark'

/**
 * FR-020's layer: the opener's name and the run's UTC stamp, laid diagonally,
 * repeatedly and faintly over the `Row Area` (U-50) and nowhere else.
 *
 * ⭐ S-220 is degrees; S-221 multiplies the picture's width and S-222 the
 * mark's size, on both axes (table T-207).
 * ⭐ WHY THE PICTURE'S OWN WIDTH AND NOT S-81's 1600. FR-080 draws an export
 * by scaling THIS picture to S-81's width, so a share of this width is the same
 * share of S-81's once scaled. ⛔ A constant 1600 would hold S-221's ratio at
 * one screen width only.
 *
 * ⭐ THE OPACITY IS ON THE GROUP AND NOT ON EACH MARK: a group is composited
 * once, so overlapping marks stay at S-102 instead of adding up to a darker
 * patch than any row states.
 *
 * ⚠️ THE GRID IS SQUARE AND CENTRED, AND ITS REACH IS THE HALF-DIAGONAL. The
 * marks are tiled in the ROTATED frame, so a grid the size of the Row Area
 * would leave the corners bare once it turned; half the diagonal is the least
 * radius that still covers the rectangle at every angle S-220 admits (-90..90).
 * ⛔ The covering grid deliberately runs outside; the clip cuts it back to the
 * Row Area (FR-020, MUST NOT).
 * ⚠️ It is a SEPARATE group from the rotated one so that the clip is read in
 * the picture's own coordinates: a clip-path and a transform on one element
 * would leave the rectangle turning with its contents.
 *
 * ⛔ NOTHING IS DRAWN WHERE THE ARITHMETIC WOULD NOT TERMINATE OR WOULD MEAN
 * NOTHING: a step of zero, a size of zero and an empty rectangle all answer
 * with no layer, which is also what a `NaN` from a value that is not a number
 * answers.
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
 * The SVG for one frame (FR-080).
 *
 * ⭐ Every coordinate arrives already computed (ADR-001).
 *
 * ⭐ `picture` IS REQUIRED AND HAS NO DEFAULT. A new caller should have to
 * decide which picture it asks for; a default would let a forgotten export
 * draw FR-043's dummies into a reader's file in silence (EP-14).
 *
 * ⭐ `follow` DOES HAVE ONE, AND THE GROUND IS THE OPPOSITE. Saying nothing
 * means "no side is following", which is both what a caller outside the Dual
 * Cursor mode means and what DC-8 (MUST NOT) requires of an export -- so the
 * forgetful caller lands on the conservative picture rather than the leaky one.
 *
 * ⚠️ The argument list is `src/`'s to settle (table T-064's heading); PI-19's
 * published member does not move.
 *
 * @purity pure
 */
/**
 * ⛔ NOTHING MAY BE INSERTED BEFORE INDEX 5. `snapshot-source.ts` reads
 * `Parameters<typeof svgFromSchedule>[3]` and `[4]` by position, so a parameter
 * inserted before those two re-points both without a word from the compiler.
 * ⚠️ `weekdayWords` DEFAULTS TO THE EMPTY LIST, which leaves the weekday row
 * empty -- it does not mean "no weekday is wanted". A caller drawing for a
 * reader supplies the seven from `rulerWeekdayWords` (PI-37); only the fourth
 * tier reads them.
 *
 * ⭐ `pointer` is where the hand is, in screen px, or `null` while no pointer
 * has been heard of -- CU-3's guide cursor follows it, and LY-5 of table T-060
 * leaves current values with the Framework. ⛔ NOT `follow.x`: that one is an x
 * alone, snapped to a day; the guide cursor needs both axes and snaps to
 * nothing.
 *
 * ⭐ `hovered` is the hit under the pointer (PI-7), or null where there is none.
 * ⛔ NOT A SECOND HIT TEST, which is the whole reason it is a parameter. R7.4
 * has one reading per happening, the Framework already asks `itemAtPointer`
 * once per move, and this unit holds no `PointerSlop` (table T-206 keeps S-90 ..
 * S-92 and S-137 out of the document).
 * ⚠️ IT IS THE HIT AND NOT A BOOLEAN: only the marker and the dummies of ONE
 * Task darken, so the thing it claimed has to arrive too.
 *
 * ⭐ `watermark` IS FR-020's TRAIL, or `null` for a picture that carries none.
 * ⛔ NOT SPENT THROUGH `drawsOperationState`: EP-7 puts the layer in the export
 * too, and FR-020 removes it from both pictures together, so both ask the
 * same value. ⚠️ Which is also why WY-2 and WY-3 of table T-041 set this layer
 * aside: it changes with every run and machine.
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
  /**
   * One row of table T-236, under the theme this frame is drawn in.
   *
   * ⛔ The drawers below are handed their colours from here rather than
   * reading table T-236 themselves: reaching it a second time in this file is
   * the drift the generated block exists to stop.
   */
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  // ZO-5's label needs the string and the size LC-5 measured it at, and both
  // travel with the placement rather than the geometry.
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  // FR-042's other half: the colour the author put on the row itself (AT-58).
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  /**
   * EP-12 of table T-076, in ONE place; DC-8 of table T-029a sends the Dual
   * Cursor's following mark out by the same row.
   *
   * ⭐ WHY ONE LINE AND NOT ONE PER KIND. Every mark EP-12 bars -- the dashed
   * frames, S-178 on the two lines, FR-075's grab points, DC-8's cursor width,
   * the hover, the guide cursor -- is read from this flag or from what it empties
   * here, and from nowhere else, so the rule cannot be obeyed in some places and
   * forgotten in another.
   *
   * ⛔ Not left to the caller: a picture told it is the export states the rule
   * itself.
   *
   * ⚠️ NOT EP-14's `picture` test further down. That one turns off something
   * the DOCUMENT asks for; this one turns off what the SESSION asks for.
   */
  const drawsOperationState = picture === 'screen'
  const marks: readonly ItemRef[] = drawsOperationState ? selection.items : []
  const following = drawsOperationState ? follow : null
  /**
   * FR-013's hover, spent through `drawsOperationState` like `marks`: PM-1a is
   * exported (EP-5), so a darkened marker in a saved picture would carry the
   * reader's pointer into the file.
   */
  const hover = drawsOperationState ? hovered : null
  /**
   * Where the hand is, spent through `drawsOperationState` like `hover`.
   */
  const hand = drawsOperationState ? pointer : null
  /**
   * Whether the hand stands on one of `rows` of THIS Task.
   *
   * ⭐ The thing as well as the row, so one Task's marker does not darken
   * because the pointer found another's.
   *
   * @purity pure
   */
  const handOn = (taskUid: number, rows: readonly Hit['grab'][]): boolean =>
    hover !== null &&
    hover.item.kind === 'task' &&
    hover.item.taskUid === taskUid &&
    rows.includes(hover.grab)
  /**
   * FR-013's pointer-on-it asked of a DRAWN FIGURE, the way HF-6 reads it,
   * not of the row of table T-023d a press would go to: MK-9a scopes that
   * priority to overlapping grabs, and this decides only what is drawn.
   * @provisional PND-360
   *
   * ⚠️ The marker is still asked through `handOn`, the other reading.
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
   * The dependency routes SL-1 has selected, keyed by both ends.
   *
   * ⚠️ The two sides name a dependency differently: `ItemRef` names it by its
   * successor and its ORDINAL among that Task's links, while
   * `DependencyGeometry` names it by both UIDs. `Task.dependencies` is the only
   * place the two meet, and `input-command-translator.ts` resolves the same
   * mapping in the same direction when it makes the ref.
   * ⛔ The ordinal is NOT the route's index in `geometry.dependencies`: RT-4a
   * drops a link whose endpoint is not drawn, so the two runs part company the
   * moment one is dropped.
   */
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  for (const item of marks) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

  // ⛔ Table T-020 is the paint order, back to front, and in an SVG document
  // order IS that order -- so writing the dependencies first would put them at
  // the back. The bands are not a row of that table; they are the ground under
  // all of it.
  const bandParts: string[] = []
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []
  // FR-098 reaches every figure a Task draws, not only its row's ground, so
  // each array above gets a twin for a PINNED Task's fragments. ⛔ The twins
  // are drawn unclipped -- a pinned row already stands inside the band (LF-14)
  // -- and the plain arrays are clipped only when something is pinned.
  const planPartsPinned: string[] = []
  const guidePartsPinned: string[] = []
  const actualPartsPinned: string[] = []
  const markerPartsPinned: string[] = []
  const labelPartsPinned: string[] = []
  // Dependency lines (table T-020's ZO-4) get the same split: a line between
  // two rows crosses into the band exactly as a bar does.
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []
  // FR-009's bar-exclusion rectangles, collected as the task loop draws each
  // bar and turned into one <mask> afterwards -- no separate pass and no
  // per-crossing search.
  const barMaskParts: string[] = []
  // ⛔ TABLE T-020 HAS NO ROW FOR AN ANNOTATION. It goes over ZO-5's labels:
  // NFR-007's 4.5:1 is met against the comment box's own ground, and a label
  // painted across the body would put unmeasured ink on it.
  // @provisional PND-238
  const annotationParts: string[] = []
  // ⭐ Not rows of table T-020 either: the fade grab points are FR-075's overlay
  // and the ruler is U-19. Both go over the table's six so nothing painted in
  // the Row Area covers them.
  const handleParts: string[] = []
  // SL-8's frames, for the same reason: a bar painted after the sign would hide
  // it. Only the framed half of SL-1 arrives here (see `selectedLineWidth`).
  const selectionParts: string[] = []

  // ⭐ FR-043's dummies GET NO ARRAY OF THEIR OWN. Table T-020 holds no row for
  // U-52, and they stand in for the ends of the actual bar a not-started Task
  // lacks (as GR-7 hangs the not-started marker off GR-17), so they paint at
  // ZO-2, behind ZO-3's marker and ZO-5's label. ⛔ A Task has dummies exactly
  // when it has no actual bar, so the one array never holds both.
  // @provisional PND-209
  //
  // ⛔ STOP -- still not drawn: the actual FR-043 shows while the author is
  // grabbing. That needs the PRESS in flight, and a hit under the pointer is
  // not one.

  // FR-042's bands. ⛔ Clipped to the Row Area: S-78 slides the whole stack, so
  // a scrolled row's band would otherwise paint over the Time Ruler and header.
  const area = regions.rowArea
  const areaBottom = area.y + area.height
  // ⛔ FR-098: a flowing row is cut at the scrolling remainder's top (LF-14), a
  // banded row at the Row Area's own top. ⚠️ `scrollAreaY` is optional and
  // reads as the area's top where no row is pinned.
  const scrollTop = layout.scrollAreaY ?? area.y
  // Keyed by `groupId`, which `TaskPlacement` carries.
  // ⛔ NOT GATED ON `scrollAreaY` ALONE. `pinnedBandOf` returns a number whether
  // or not anything is pinned, so gating on it would wrap every document's
  // figures in a no-op clip-path and change the bytes `npm run parity` compares.
  const pinnedGroupIds = new Set(
    layout.rows.filter((row) => row.isPinned === true).map((row) => row.groupId),
  )
  const hasPinnedRows = pinnedGroupIds.size > 0
  /**
   * The vertical stretch a figure has to reach before it is worth drawing at
   * all.
   *
   * ⭐⭐ WHY. Every frame serialises the picture to a string and re-parses it
   * (`DomSvgSurface`, UF-49), so a shape that cannot reach a pixel is still
   * built, escaped, written, parsed, laid out and thrown away -- and on a large
   * document most of the picture is such a shape.
   *
   * ⛔ NOT `FR-018`: that drops rows from the layout. This drops nothing from
   * the layout, the hit test or any answer; it only declines to WRITE.
   *
   * ⛔ ONLY THE SCREEN'S PICTURE. An export's canvas IS the content, and WY-2
   * of table T-041 compares two exports.
   *
   * ⭐ Vertically the margin is the Row Area's own height: a row's figures stand
   * in its band, so nothing of one row overshoots by a whole screen.
   * ⛔ Sideways a figure really does overshoot its bar -- see
   * `OFF_SCREEN_SIDE_MARGIN`. Judging a Task by its row alone is judging one
   * axis of a two-axis picture.
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

  // FR-089 -- the date grid lines.
  //
  // ⭐ THE INTERVAL IS NOT WORKED OUT HERE: `tickStrideOf` is the step FR-017
  // settled, so the lines stand where the band's finest row ticks. ⚠️ The
  // finest row, not the day row -- the year tier has only a year row.
  //
  // ⛔ COLOUR: S-149, the rule colour the ruler takes; no row of table T-236
  // names the date grid line. @provisional PND-315
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
        // ⚠️ Held to the area, unlike the band's labels: a rule drawn left of
        // the Row Area would cross the row title panel, which SC-1 of table
        // T-031 gives its own scroll.
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
    // ⛔ A Task with no placement is never culled: `placedOf` is the only
    // answer to where it stands.
    // ⭐ Sideways, a Task is worth writing when EITHER shape reaches the range;
    // `TaskPlacement` carries both spans in drawn px, so no date is read.
    // ⛔ `actualX` null means no actual yet, not zero: taken as a number it
    // would drag the left edge to the axis origin and the test would never fire.
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
    // FR-043's one faint mark on a Task not started.
    // ⛔ EP-14 keeps it out of the export, and this is the only place that can
    // obey it -- the geometry may NOT be stripped instead: GR-7 hangs the
    // not-started progress marker off GR-17, `markerAnchorX` answers nothing
    // once the dummy list is empty, and EP-5's marker would go with it (WY-3 of
    // table T-041 measures it); table T-023d still keeps GR-17 as a grab target.
    if (picture === 'screen' && task.dummies.length > 0) {
      // ⭐ `actual` is the paint the actual bar would have taken (FR-013, FR-041).
      // ⭐⭐ THE RECTANGLE IS READ, NOT WORKED OUT: `dummiesOf` solves it once
      // onto `DummyGeometry.ink`, because table T-023d's closing rule makes the
      // drawn mark the grab target and `item-hit-area.ts` must test the very
      // rectangle this draws. It stands on GR-9's day, so every dummy of one
      // Task carries the same one.
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
      // FR-013: faint, darkened while the pointer is on it. ⭐ Darkened means no
      // faintness at all: S-131 is the only degree any row carries.
      // ⭐ One mark for two grab targets (GR-9 and GR-17, or GR-18), so it
      // darkens for either. @provisional PND-351
      // ⛔ Asked of the figure, not of the row that won -- `handInside`'s note.
      // @provisional PND-360
      // ⛔⛔ TESTED ON THE INK'S OWN CENTRE, NOT ON `at` PLUS HALF A WIDTH: a
      // milestone's dummy is a square centred on its day, so its `ink.x` is
      // half a side left of `at`.
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
      // ⭐ The box is the BARS' extent -- what SL-2 clicks and SL-7 drags. ⛔
      // The name label is left out: LC-6 places it outside the bar and FR-014's
      // overhang runs it further, so a frame that swallowed it would overlap the
      // neighbouring rows. ⚠️ The marker and the fade handles are left out too:
      // neither is the thing SL-1 names.
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      // A Task neither half of which was drawn (S-227 planVisible and S-228
      // actualVisible both false, which those two rows allow) has no extent,
      // and a frame around nothing would sit at the origin.
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
      // FR-044. ⭐ NESTED INSIDE THE MARKER'S TEST: S-63 is one switch for both
      // figures (table T-038's closing paragraph), and `resumeOf` builds an icon
      // only where a marker was built.
      // ⛔ Not placed by table T-038's order: LF-11 of table T-221 places it,
      // and `resumeOf` has already done so.
      // ⛔ Not faint and not darkened: PM-1a never holds on a suspended Task.
      // ⛔ No shape test: `schedule-geometry.ts` leaves `resume` null for a
      // milestone (LF-11, MUST NOT).
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
    // OC-2 of table T-038: one `<text>` for the assignee and the percent
    // (FR-090), placed by `outsideLabelBoxOf`.
    // ⭐ The card is anchored at its END (FR-090), which makes FR-093's estimate safe: its error goes
    // leftward, away from the bar, instead of across the `labelGap`.
    // ⛔ S-60 AND S-61 ARE NOT READ HERE: LC-7 spent them (FR-049), and a hidden
    // card arrives as a null box.
    // ⭐ S-168 / S-169, as ZO-5: table T-236 holds no other pair for a label.
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

  // ⛔⛔ FR-098. The task loop draws every Task's figures into one array apiece,
  // so the cut is one clip-path, not a per-row pair: the scrolling remainder
  // `S-78` points at, from `scrollTop` to the Row Area's foot.
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

  // ⭐⭐ ONE HEAD, MINTED ONCE -- AND NOT BY COUNTING defsParts. ⛔ The list
  // is shared: nothing may read its length to mean 'nobody has written
  // anything yet' -- ask about the thing itself.
  // FR-009: selected lines in front, the rest in created order.
  // `geometry.dependencies` is already in created order (built by walking
  // `schedule.tasks` and each Task's `dependencies`), so a stable sort on "is
  // it selected" alone is enough. ⛔ `Array.prototype.sort` is stable
  // (ES2019+), which that depends on.
  const orderedDependencies = [...geometry.dependencies].sort((a, b) => {
    const aFront = selectedLinks.has(`${a.predecessorUid}>${a.successorUid}`) ? 1 : 0
    const bFront = selectedLinks.has(`${b.predecessorUid}>${b.successorUid}`) ? 1 : 0
    return aFront - bFront
  })
  // ⚠️ S-224 multiplies the line's own thickness, not the width SL-8 thickens it
  // to.
  const haloWidth = settings.dependencyWidth * NOT_STORED_DEPENDENCY_SIZES['S-224']
  let arrowMinted = false
  for (const link of orderedDependencies) {
    if (!settings.dependencyVisible) break
    if (!arrowMinted) {
      arrowMinted = true
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
      // Minted beside the arrowhead, for the same reason: both are shared by
      // every dependency line and neither may be written more than once.
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
    // The cull `skipsOffScreen` states, asked of the polyline's own box on both
    // axes. ⭐ Exact: a polyline never leaves the box its points make. ⛔ Never
    // asked of the ends' rows: a line between two Tasks a screen apart crosses
    // the window with neither end in it.
    // ⚠️ AFTER the head is minted, so the `<marker>` exists whether or not the
    // first line is culled.
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
    // A dependency line is pinned only when BOTH ends are: a scrolling end can
    // carry it above `scrollTop` exactly as a bar can. `points` already carries
    // each end's current position, so clipping the polyline as one piece trims
    // only the stretch that scrolled into the band.
    // @provisional PND-416 -- an endpoint scrolled clear off the top is NOT
    // treated as RT-4a's undrawn endpoint, so the line stays and is cut.
    // ⛔ No row decides that yet (RT-4a drops, RT-6 keeps a pinned one); dropping
    // it would make dependencies blink on a small scroll.
    const predecessorPlaced = placedOf.get(link.predecessorUid)
    const successorPlaced = placedOf.get(link.successorUid)
    const predecessorPinned =
      predecessorPlaced !== undefined && pinnedGroupIds.has(predecessorPlaced.groupId)
    const successorPinned =
      successorPlaced !== undefined && pinnedGroupIds.has(successorPlaced.groupId)
    // FR-009's halo, pushed RIGHT BEFORE its own line into the same array:
    // `orderedDependencies` is back-to-front, so a later halo lands over every
    // earlier line and this line's own stroke restores its ink over its halo.
    // ⛔ The shared `mask` keeps the halo off the bars, not a per-crossing region.
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
    // CU-1's line, in S-163.
    // ⛔ Its own width is the typed 1, which is in no row -- left as it stands
    // rather than made to look like a value the specification holds.
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
    // CU-2's two lines (EP-6), both in S-195; DC-8 marks the follower by width.
    // ⭐ Painted into `linkParts` with CU-1's line: table T-020 holds no row for
    // either cursor. @provisional PND-312
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
          // ⭐ Keyed by S-65's member, never by which line is following (an
          // export never sees DC-8).
          `${figureKey(`dual-cursor-${side}`)}/>`,
      )
    }
  }

  // CU-3 of table T-029, mode S-66.
  // ⛔ Not in an export (EP-6): `drawsOperationState` is that gate.
  // ⭐ Painted into `linkParts` beside the other two cursors, for PND-312's
  // reason; the region is PND-342 below.
  if (drawsOperationState && settings.guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.rowArea
    const inside =
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    if (inside) {
      // ⛔ NO ROW HOLDS EITHER OF THESE TWO: table T-236 has no guide cursor
      // colour and table T-206 no guide cursor width. S-148 is the muted neutral
      // for what is secondary, and deliberately neither cursor colour: the guide
      // carries no date, and a reader with the status line or a measurement up
      // must still tell which line is which. The width is the status line's
      // typed 1. @provisional PND-341
      const guideColour = themed('S-148')
      const guideWidth = 1
      // ⛔ THE REGION IS THE `Row Area`, between CU-1 and CU-2's edges, and the
      // pointer must be in it: no row says what the guide does over the ruler or
      // a panel, and a line from a pointer not on the schedule guides the eye
      // to a place the eye is not. @provisional PND-342
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
      // ⛔⛔ NO THIRD BRANCH (CU-3, MUST NOT). CU-2's pair is drawn off
      // `dualCursor` above.
    }
  }

  for (const box of geometry.highlightBoxes) {
    // FR-019. ⚠️ No zoom scale on the radius: `cornerRadiusPx` is already in
    // screen pixels, like the four numbers beside it.
    // ⭐ `ry` is left off on purpose -- SVG defaults it to `rx`.
    const radius = box.cornerRadiusPx
    const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        rounding +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ` stroke-width="1"${figureKey(`box-${box.id}`)}/>`,
    )
    // SL-8. ⭐ A separate rect although the box IS its bounding rectangle: the
    // frame may not re-stroke the target's outline, and the dash has to survive
    // the author's own line colour.
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`))
    }
  }

  for (const box of geometry.commentBoxes) {
    // FR-019's leader, from the anchor to the body's bottom-left corner.
    // ⚠️ NO ROW GIVES THE LINE A WEIGHT: it takes the literal 1 the highlight
    // box and the body are stroked at, so they move together if a row arrives.
    // ⭐ PUSHED BEFORE THE BODY so the filled body covers the line's end rather
    // than the line crossing the text.
    // ⚠️ `leaderShapeKind` still exists on the document and is not read here --
    // FR-019 defers retiring the column.
    annotationParts.push(
      `<line x1="${rounded(box.anchor.x)}" y1="${rounded(box.anchor.y)}"` +
        ` x2="${rounded(box.body.x)}" y2="${rounded(box.body.y + box.body.height)}"` +
        ` stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}-leader`)}/>`,
    )
    // ⭐ The body is FILLED: NFR-007's 4.5:1 for its text needs a known ground,
    // and text over an arbitrary bar has none. S-162 is the precedent for S-146.
    // ⚠️ By WCAG 2.1 on table T-236's values: S-147 on S-146 is 17.76:1 light and
    // 14.94:1 dark, while ANNOTATION_COLOUR as ink is 3.58:1 on the dark ground
    // and fails -- so it is the outline alone, where 1.4.11's 3:1 applies.
    // ⚠️ The fill hides whatever is behind the body. @provisional PND-231
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}`)}/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      // ⛔ The baseline sits at the FOOT of each em box: FR-097 makes a line as
      // tall as the type and no row says where the baseline falls. S-179 is the
      // ruler's row and is not borrowed here.
      // ⚠️ The last line's descenders eat into S-181's padding.
      // @provisional PND-230
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}" fill="${themed('S-147')}"` +
          // ⭐ The line's number IS its identity: FR-097 wraps this box's own
          // text, so line 3 stays line 3 whatever happens to other boxes.
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
    // ⭐ PINNED FIRST, UNCLIPPED. The pinned and scrolling groups never occupy
    // the same pixels (a scrolling row starts one `rowGap` below the band), so
    // their order changes no pixel.
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
    // ZO-6 of table T-020 -- the range selection's rectangle, at the front of
    // that table. SL-3 (MUST) draws it while the grab is held.
    //
    // ⭐ IT IS `selectionFrameSvg`, NOT A SHAPE OF ITS OWN: a second look would
    // need a width, a dash and a colour no row states.
    // ⚠️ BEFORE THE RULER: the band is not a row of table T-020, and a marquee
    // dragged across it must not take the dates away.
    // ⛔ No export guard: the export road passes no rectangle.
    ...(marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'), 'marquee')]),
    // ⭐ FR-020's layer, over everything the `Row Area` holds.
    // ⛔ It cannot reach the band -- the clip is U-50's rectangle -- but stands
    // before it so that "the band is drawn over everything" stays true.
    ...(watermark === null
      ? []
      : [watermarkSvg(area, width, watermark, themed('S-223'), watermarkClipId)]),
    // FR-017's band last of all. The Row Area's own paint is clipped to it,
    // but FR-014's overhang (LF-12) and a label that runs past the first row
    // are not, and the Time Ruler does not scroll down (SC-2) -- so it is
    // drawn over everything rather than trusting the rows to stay below it.
    ...rulerSvg(
      layout,
      settings,
      regions.timeRuler,
      // S-108 is the day the week starts on when the document names none.
      schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
      // ⚠️ No `achromatic` wrapper around S-146, unlike the row bands: S-146
      // follows the hue, so `colourOf` already applied monochrome. The bands
      // need the wrapper because theirs may be an AUTHOR colour.
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

/**
 * The row of table T-023d that claims the progress marker -- GR-7, which is
 * where FR-013's own not-started marker stands.
 */
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

// SvgRenderer -- public entry of this folder.
//
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19
//
// Turns the geometry into an SVG string (FR-080). CP-19 names the component's
// responsibility; the shapes themselves are ScheduleGeometry's and are not
// recomputed here -- 表 T-068 LC-11 already made every vertex.
//
// ⭐ This unit reads `Schedule` as well as the geometry, and that edge is
// CR-185's: colour lives in the schedule-data group (themeHue is AT-19, which
// DR-5 keeps out of the presentation group) and the geometry carries none of
// it. 5.1 puts drawing on this side of the line -- "layoutEngine holds nothing
// past coordinates".
//
// ⭐ FR-042's band is drawn HERE and nowhere else, and that is not a choice
// this file made. `_source/components.json` gives this component the edge to
// ScheduleLayout ("the ruler and the row placement") and the edge to Schedule
// that names "the row colour"; ScreenRenderer's own head note says in as many
// words that it may reach neither layout nor geometry, and that `Rows` (U-1)
// and everything in them are absent from it. ⛔ Until this round nothing drew
// a band at all -- `layout.rows` reached no renderer.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
// PI-7's own answer type. ⭐ The hit is READ here and never taken: this unit
// asks which row of table T-023d the pointer stands on and nothing more, so
// `Hit` arrives as a type and `itemAtPointer` itself stays where it is.
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
 * ⛔ THE ONE THING IN THIS FILE THAT IS NOT A PROPERTY OF THE DOCUMENT. Every
 * other input describes what is drawn; this one says who it is drawn for.
 *
 * ⭐ WHY IT HAD TO BE ADDED. Table T-076 leaves several UI parts out of the
 * exported picture, and EP-14 is the row that no other argument can reach:
 * FR-043's dummies hang on the Task being unstarted -- a property of the
 * DOCUMENT -- so no value the export is free to choose can suppress them.
 *
 * ⛔ AND THE OBVIOUS SHORTCUT IS A DEFECT, not a style choice: emptying
 * `TaskGeometry.dummies` for the export does not merely move the not-started
 * progress marker, it DELETES it. GR-7 hangs that marker off GR-17, and
 * `markerAnchorX` answers with nothing once the dummy list is empty -- which
 * breaks EP-5 (the Progress Marker IS drawn in the export) and is measured by
 * WY-3 of table T-041.
 *
 * ⭐ EP-12 IS THE SECOND ROW IT ANSWERS, and one line answers all of it --
 * `drawsOperationState` in `svgFromSchedule`. ⚠️ It was left to the caller
 * while `frame-loop.ts` was the only one, on the reading that an export hands
 * in an empty `Selection` and says nothing about which side follows. That is
 * true of that caller and is NOT a property of this unit: told it was the
 * export and handed a selection anyway, the picture carried a dependency line
 * at S-178 times its width and a thickened `Dual Cursor` line -- two marks
 * EP-12 says 描かない. A row of table T-076 is a rule about the PICTURE, so
 * the picture is where it is spent (D-52).
 *
 * ⚠️ STILL DELIBERATELY NARROW. Two rows of table T-076 reach this argument,
 * each once and for a stated reason; it is not a general "export mode" that a
 * third row may be folded into without one.
 *
 * @provisional PD-210
 */
export type SchedulePicture = 'screen' | 'export'

/**
 * The Dual Cursor mode as it stands THIS FRAME -- the second thing in this file
 * that is not a property of the document, and the only other one.
 *
 * ⭐ WHY IT IS A PARAMETER AND NOT PART OF THE GEOMETRY. Which side follows is
 * a current value, and LY-5 of table T-060 leaves those with the Framework;
 * DC-8 of table T-029a (MUST NOT) keeps the mark for it out of an export while
 * EP-6 still draws the two lines. So the PLACEMENT travels in the geometry,
 * where the document put it, and the MARK travels here -- and an export gets
 * the two lines and no mark whether or not it says anything, because
 * `drawsOperationState` drops this argument on that picture. ⚠️ Saying nothing
 * was the WHOLE of DC-8 until D-52: an export that named a following side was
 * drawn with the mark.
 *
 * ⛔ `'date1' | 'date2'` IS WRITTEN OUT RATHER THAN IMPORTED. It is declared as
 * `DualCursorSide` in `screen-state.ts`, and `_source/components.json` gives
 * this component no edge to ScreenState -- so importing it would be an edge the
 * manuscript does not draw, which is a change request and not an implementation
 * choice. ⚠️ What keeps the two in step is the compiler: `frame-loop.ts` hands
 * ONE value along both seams, so a drift is a type error at that call site and
 * not something review has to catch. Reported.
 */
export interface DualCursorFollow {
  /** DC-2: the side that is following now. The other one stands where it was. */
  readonly side: 'date1' | 'date2'
  /**
   * Where the pointer is, in screen px, or `null` while it is outside the
   * window.
   *
   * ⭐ THE LINE IS DRAWN AT THE DAY THIS POINT FALLS IN, not at the point. That
   * is the very reading the click will fix (`dateAtX` is what the translator
   * asks too), so what a person sees under the hand is where the cursor lands
   * -- an unsnapped line would sit up to a whole day's width from it at a wide
   * zoom. @provisional PD-310
   * ⛔ WITH NO POINTER THE LINE STANDS AT ITS STORED DATE. DC-7 (MUST NOT) keeps
   * a placed pair standing until it is cleared, so a hand leaving the window
   * may not take half a measurement away with it. @provisional PD-311
   */
  readonly x: number | null
}

/**
 * How one bar is painted, once every override and the theme have been
 * resolved. Nothing here is stored: FR-041 forbids saving a derived colour.
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
 * ⛔ NOT IN TABLE T-236. That table settles S-146 .. S-170, and the annotation
 * is not among them although FR-041 names it in the same breath as the two
 * lines it does settle. ⚠️ It is not the only colour still typed here -- the
 * fade grab point's pair below is the other, and for the same reason. Every
 * colour a row DOES hold arrives generated.
 *
 * ⛔ AND THIS VALUE IS MEASURABLY WRONG. FR-019 wants it kept away from the
 * theme hue, the dependency line AND the progress line. It is hue 26, which is
 * the hue S-159 gives the dependency line in the light theme. Correcting it
 * means choosing a colour, which this unit may not do -- so it stands, and the
 * gap is reported instead of papered over.
 *
 * @provisional PD-1
 */
const ANNOTATION_COLOUR = '#b45309'



/**
 * The square FR-075 (MUST) shows on the selected Task, and its outline.
 *
 * ⛔ STOP -- ⛔ NOT IN TABLE T-236. That table settles S-146 .. S-170 and no
 * row among them is the fade grab point: table T-210 gives the point its
 * half-side (S-109), its stroke (S-110) and the condition for showing it
 * (S-111), and stops there. Table T-236 is the table that would have to hold
 * the row -- one for the face and one for the outline, the way S-161 and
 * S-162 split the Progress Marker's ink from its backing.
 *
 * @provisional PD-1
 */
const FADE_HANDLE_FILL_COLOUR = '#ffffff'
/** The other half of the same missing row. See `FADE_HANDLE_FILL_COLOUR`. @provisional PD-1 */
const FADE_HANDLE_STROKE_COLOUR = '#374151'

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
  // Two places. The grid is NS-3 of table T-231, which requires ONE rounding
  // rule on both sides of WY-3's comparison -- so the two halves of one
  // picture may not round differently.
  return (Math.round(value * 100) / 100).toString()
}

/** @purity pure */
function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/**
 * The rectangle a run of vertices occupies.
 *
 * ⚠️ `ScreenRect` rather than a shape of this file's own: `HighlightGeometry`
 * already carries one of these for a drawn thing, and two names for the same
 * four numbers would only make them harder to put side by side.
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
 * Every point one bar reaches, in whichever of table T-012's two forms it
 * takes.
 *
 * ⛔ Nothing is measured again here. SH-3's head is a path the geometry made
 * and SH-4's dots carry their own radius, and both reach past `from` and `to`
 * -- reading only the two ends would put the frame inside the figure.
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
 * The four corners of a rectangle CENTRED on one point.
 *
 * ⭐ Centred rather than anchored at a corner because that is where the point
 * already stands for its reader: `item-hit-area.ts` centres S-93's box on the
 * same point (`isNearPoint` with half of each side), so the drawn mark and the
 * target it belongs to share a middle whatever the two sizes are.
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
 * SL-8 of table T-023c (MUST), the FRAMED half: a dashed rectangle on the
 * target's BOUNDING RECTANGLE.
 *
 * ⭐ SL-8 splits SL-1's five kinds in two. This is the half with an area to
 * enclose -- Task (both the shapes with a face and the thin-line ones),
 * highlight box, comment box. ⛔ 依存線 and 基準日線 are the other half and
 * MUST NOT be framed; `selectedLineWidth` is theirs.
 *
 * ⭐ FR-030 is why it is a dash and not a tint -- being selected may not be
 * carried by colour alone -- and S-151 is the colour table T-236 gives, whose
 * own use column reads 「選択と現在位置」.
 *
 * ⛔ The frame does NOT trace the target's own outline (SL-8, MUST NOT).
 * Drawing per shape is how the earlier code came to show the sign on the three
 * shapes with a face and on nothing else.
 *
 * ⛔ Neither the width nor the dash follows the zoom (SL-8, MUST NOT), which is
 * why S-174 and S-175 are read as they stand and no value off `layout` touches
 * them.
 *
 * ⚠️ A target with no extent in one axis gets that side widened to S-174, the
 * frame's own width. ⛔ A rectangle of zero height draws no outline at all, so
 * a figure that collapsed to a single run -- a zero-span SH-3, whose head
 * shrinks with the span, or a milestone drawn at side 0 -- would carry no sign
 * rather than a thin one.
 *
 * @purity pure
 */
function selectionFrameSvg(box: ScreenRect, colour: string): string {
  const stroke = NOT_STORED_SELECTION_SIZES['S-174']
  const [on, off] = NOT_STORED_SELECTION_SIZES['S-175']
  const width = Math.max(box.width, stroke)
  const height = Math.max(box.height, stroke)
  return (
    `<rect x="${rounded(box.x - (width - box.width) / 2)}"` +
    ` y="${rounded(box.y - (height - box.height) / 2)}"` +
    ` width="${rounded(width)}" height="${rounded(height)}"` +
    ` fill="none" stroke="${colour}" stroke-width="${rounded(stroke)}"` +
    ` stroke-dasharray="${rounded(on)} ${rounded(off)}"/>`
  )
}

/**
 * SL-8's OTHER half: 依存線 and 基準日線 are shown as selected by being drawn
 * at S-178 times their own width, and MUST NOT be framed.
 *
 * ⭐ The row records why. A dependency route bends, so a rectangle around it
 * looks nothing like the line and is only harder to read; the status line runs
 * the height of the Row Area, so its rectangle is a tall thin frame that
 * strikes through every bar and milestone behind it.
 *
 * ⭐ The line is drawn thicker IN PLACE rather than over-painted. GD-6 (MUST)
 * keeps the arrowhead on the dependency line, and a second polyline laid on top
 * would leave that head at the thin line's weight.
 *
 * ⛔ THE COLOUR IS NOT CHANGED. SL-8 gives this half one value and it is a
 * multiplier; the thickness is already a sign that is not colour, which is all
 * FR-030 asks. ⚠️ Recolouring the dependency line would also need a SECOND
 * arrowhead marker in the selection colour, and no table holds it.
 *
 * ⭐ DC-8 OF TABLE T-029a IS THE THIRD CALLER, and it reaches this same
 * multiplier by naming SL-8 rather than restating it. The `Dual Cursor` block
 * further down is where that call is made: the following line is S-194 times
 * S-178 and the other is S-194, and the colour (S-195) is the same on both --
 * DC-8 says in as many words that which one follows is shown by width and
 * never by colour.
 * ⚠️ SO THE PARAMETER IS NOT ALWAYS "SELECTED". A Dual Cursor line is never
 * selected -- SL-1 does not admit one, which is why DC-8 is a row of table
 * T-029a and not of table T-023c -- and what it passes is whether the line is
 * FOLLOWING. The rule being spent is the same one; only the question that
 * turns it on differs.
 *
 * ⛔ NO PICTURE TEST HERE, AND NONE IS MISSING. EP-12 keeps every one of these
 * marks out of an export, and `drawsOperationState` spends that row ONCE, at
 * the head of `svgFromSchedule`: a picture that says it is the export reaches
 * all three call sites below with `selected` already false. A second test here
 * would be the same rule in two places, and the one that was forgotten would
 * be the one that leaked.
 *
 * @purity pure
 */
function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
}

/**
 * The same colour with the hue taken out, for FR-041's monochrome. Applied
 * when drawing and never to the stored value -- `themeMonochrome` "does not
 * change what is saved" (tbl-settings.md §5).
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
 * ⭐ The `H` is substituted here rather than in the manuscript, for the reason
 * the generated block at the foot of this file states: S-73 holds themeHue
 * once, so the rows name it instead of repeating it.
 *
 * ⛔ Monochrome reaches only the rows that follow the theme. A row with
 * `followsHue` false is used exactly as written, and FR-041 (MUST NOT) is why:
 * the two lines are held off the theme, so letting the theme's own monochrome
 * switch move them would be following it after all.
 *
 * @purity pure
 */
function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  // The generator raises on a row table T-236 has not, so this can only fire
  // when a row ID typed here is not one the block was asked for.
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

/** Which column of table T-236 the saved theme asks for (S-72). @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

/**
 * FR-042's band colour for a row the author gave none: S-166 at depth 1,
 * S-164 and S-167 alternating below it.
 *
 * ⛔ The stripe is counted by the row's POSITION, never by whether the rows
 * above carried an override -- FR-042 says so in as many words, because
 * counting only un-overridden rows flips every stripe below the moment one row
 * is given a colour.
 *
 * @purity pure
 */
function bandRowOf(depth: number, position: number): string {
  if (depth === 1) return 'S-166'
  return position % 2 === 0 ? 'S-164' : 'S-167'
}

/**
 * FR-007: what the author chose wins over the theme, and what they left alone
 * follows it (FR-041). ⚠️ A chosen colour is NOT greyed away -- the requirement
 * says monochrome takes effect when drawing, so it applies to both.
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
  // its own -- which is what the earlier two-branch form got wrong: it threw
  // the author's colour away instead of draining it.
  return {
    stroke: monochrome ? achromatic(stroke) : stroke,
    fill: monochrome ? achromatic(fill) : fill,
    strokeWidth,
  }
}

/**
 * ZO-3's marker. ⭐ Table T-020 says it carries an opaque backing, so the
 * circle is filled rather than hollow -- it sits over the bars and a hollow
 * one would read as part of whatever shows through. S-162 is that backing and
 * S-161 the ink; S-162 inherits S-146 in the manuscript, which is why the
 * marker keeps reading as something floating on the ground.
 *
 * ⚠️ The five symbols of table T-021 are drawn as strokes inside that circle.
 * ⛔ Their exact figures are not in the specification, the way the milestone
 * figures are not; PD-2 covers the same kind of gap.
 *
 * ⭐ PM-1a IS DRAWN FAINT, and only PM-1a. FR-013 carries a MUST that the
 * not-started marker and FR-043's dummies are drawn faint and darkened only
 * while the pointer is on them, and names S-131 as the degree; the same
 * sentence holds the late marker OUT of it in as many words, and PM-4 wins
 * over PM-1a whenever it holds (table T-021), so keying on the symbol is what
 * that exemption reduces to. ⛔ PM-1, PM-2 and PM-3 are not faint: the MUST
 * names the not-started marker and no other, and FR-013's own (MUST NOT) --
 * faintness may not be what tells started from not started, the shape carries
 * that (FR-030) -- is met because PM-1a's own figure is what says it.
 *
 * ⭐ ONE GROUP RATHER THAN AN ATTRIBUTE ON EACH SHAPE. The backing and the ink
 * overlap, and two translucent shapes composite to a third value where they
 * meet -- so per-shape opacity would draw the symbol darker than its own disc
 * and S-131 would no longer be the degree of anything. ⚠️ The backing goes
 * translucent with the rest, which is a real loss against table T-020's opaque
 * backing; the MUST that says to draw it faint is the one that decides.
 *
 * ⭐ AND THE HOVER HALF IS DRAWN NOW. The same MUST darkens the marker while
 * the pointer is on it, and the answer arrives as `svgFromSchedule`'s own
 * `hovered` -- the hit the Framework already reads once per move (PI-7). ⛔ The
 * STOP that stood here said this unit was handed no pointer, and that had gone
 * stale: `pointer` was added for CU-3's guide cursor, and what was still
 * missing was not a position but WHICH ROW of table T-023d it fell on, which no
 * position alone can answer without the slop table T-206 keeps out of the
 * document. ⚠️ Being `pure` (table T-062) was never the obstacle -- an answer
 * handed IN is an argument like the others.
 *
 * @purity pure
 */
function markerSvg(
  marker: MarkerGeometry,
  ink: string,
  backing: string,
  faintness: number,
): string {
  const { centre, radius } = marker
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="${backing}" stroke="${ink}" stroke-width="1"/>`
  const r = radius * 0.5
  const mark =
    marker.symbol === 'PM-1a'
      ? `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius * 0.18)}" fill="${ink}"/>`
      : marker.symbol === 'PM-2'
        ? `<polyline points="${rounded(centre.x - r)},${rounded(centre.y)}` +
          ` ${rounded(centre.x - r * 0.2)},${rounded(centre.y + r * 0.7)}` +
          ` ${rounded(centre.x + r)},${rounded(centre.y - r * 0.7)}"` +
          ` fill="none" stroke="${ink}" stroke-width="1.5"/>`
        : marker.symbol === 'PM-3'
          ? `<line x1="${rounded(centre.x - r * 0.6)}" y1="${rounded(centre.y + r)}` +
            `" x2="${rounded(centre.x + r * 0.6)}" y2="${rounded(centre.y - r)}"` +
            ` stroke="${ink}" stroke-width="1.5"/>`
          : marker.symbol === 'PM-4'
            ? `<line x1="${rounded(centre.x)}" y1="${rounded(centre.y - r)}` +
              `" x2="${rounded(centre.x)}" y2="${rounded(centre.y + r * 0.35)}"` +
              ` stroke="${ink}" stroke-width="1.5"/>` +
              `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y + r * 0.8)}"` +
              ` r="${rounded(radius * 0.12)}" fill="${ink}"/>`
            : ''
  const drawn = disc + mark
  if (marker.symbol !== 'PM-1a') return drawn
  return `<g opacity="${rounded(faintness)}">${drawn}</g>`
}

/**
 * ZO-5's name label, at the rectangle the geometry placed -- LC-6 across and
 * table T-012's 「名称ラベルの縦位置」 column down -- and the size LC-5
 * measured it with. ⭐ The size is read off the placement rather than derived
 * again: writing FR-077's formula a second time is how the measured width
 * stops matching the glyphs.
 *
 * ⚠️ `labelHaloOfFont` is the outline table T-017a's note reaches for when a
 * hue cannot meet CT-1 and CT-2. It is drawn always, which is the safe side of
 * that note rather than a reading of it.
 *
 * ⭐ S-168 is the ink and S-169 the halo, both of table T-236. ⚠️ Until this
 * round the pair was typed in as a black glyph on a white outline, which is
 * the LIGHT rendering -- so the dark theme drew black text on the dark ground
 * and only the halo kept it readable. Reading the theme fixes both at once.
 *
 * ⛔ The two are handed IN rather than read here, for the reason `rulerSvg`'s
 * call site states: `themed` is `svgFromSchedule`'s own closure over the hue
 * and the two flags, and reaching table T-236 a second time in this file is
 * the drift the generated block exists to stop.
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
): string {
  const x = box.x + padLeft
  // ⭐ S-33 MULTIPLIES THE FONT, NOT THE BOX. Table T-012's closing paragraph
  // calls it 「字形の中でのずれ」 -- a shift inside the glyph, down from the
  // middle of the type to the baseline SVG measures `y` from -- and says in
  // the same breath that it is a different thing from the shape-to-label gap
  // S-196 holds. Taken against the box instead, the drop grew with whatever
  // band the box happened to be, so the wider the bar the further the glyphs
  // sat from where table T-012 puts them.
  // ⭐ The box's own middle is where the label goes; the geometry has already
  // answered table T-012's column there, so this side only turns the middle
  // into a baseline and never asks which shape it is drawing.
  const y = box.y + box.height / 2 + fontSize * settings.labelBaseline
  const haloWidth = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
    ` paint-order="stroke" xml:space="preserve">${escaped(text)}</text>`
  )
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint): string {
  if (bar.form === 'outline') {
    const marks = bar.marks ?? []
    if (marks.length === 0) {
      return (
        `<polygon points="${pointsOf(bar.points)}" fill="${paint.fill}"` +
        ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"/>`
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
      ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"/>`
    )
  }
  const line =
    `<line x1="${rounded(bar.from.x)}" y1="${rounded(bar.from.y)}"` +
    ` x2="${rounded(bar.to.x)}" y2="${rounded(bar.to.y)}"` +
    ` stroke="${paint.stroke}" stroke-width="${rounded(bar.strokeWidth)}"/>`
  const head =
    bar.head === null
      ? ''
      : `<polygon points="${pointsOf(bar.head)}" fill="${paint.stroke}"/>`
  const dots = bar.dots
    .map(
      (dot) =>
        `<circle cx="${rounded(dot.at.x)}" cy="${rounded(dot.at.y)}"` +
        ` r="${rounded(dot.radius)}" fill="${paint.stroke}"/>`,
    )
    .join('')
  return line + head + dots
}

/**
 * GD-6 of table T-020a (MUST): the dependency line is solid AND carries an
 * arrowhead, while the guide (補助線) is dotted and carries none. The line
 * itself already ends on the successor's edge -- LF-4 of table T-221 has the
 * geometry finish every route with a straight entry run -- so the head only
 * has to be put at the last vertex.
 *
 * ⭐ `markerUnits="userSpaceOnUse"` rather than the default `strokeWidth`,
 * because FR-094 (MUST NOT) keeps the dependency line's dimensions off the
 * zoom: the default would size the head by `dependencyWidth` instead of by
 * S-19, and the two are different keys.
 *
 * ⛔ STOP -- ⛔ THE HEAD'S BASE WIDTH IS IN NO ROW. The 依存線 group of
 * `_assets/tbl-settings.md` gives the head one figure, S-19, and the remark
 * column calls it a length; LF-7 of table T-221 sizes the arrow SHAPE's head
 * from `arrowHeadOfStroke` and `arrowHeadOfSpan` and does not reach this line.
 * The base is drawn at S-19 as well, so the head is isosceles and no second
 * number is invented -- table T-201 is the table that would have to hold that
 * row before the base can be anything else.
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
 * share a marker ID -- the export path (EP-12 of table T-076) draws a second
 * one into the document the screen is already showing, and an SVG ID is
 * document-wide.
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
 * ⭐ `yearMonth` IS ONE ROW, not two stacked. FR-017 (MUST) has the year and
 * the month share a single 段 printed as `YYYY-MM`, and `year` is kept beside
 * it for the one step that shows no month at all.
 */
type RulerRow = 'year' | 'yearMonth' | 'week' | 'day' | 'weekday'

/**
 * L-1 of table T-005a spells the four steps 年 → 年 ＋ 月 → 年 ＋ 月 ＋ 週 →
 * 年 ＋ 月 ＋ 日 ＋ 曜日, and FR-017 (MUST, 利用者の裁定 2026-08-27) says what
 * each 段 of the band prints: the year and the month together in one 段, the
 * week's first day's number, the day's number, and the weekday -- so the rows
 * below are those four steps read through that sentence, one 段 per row.
 *
 * ⛔ THE FOLD IS AT EVERY STEP THAT SHOWS BOTH, not only the last. FR-017
 * (MUST NOT) forbids the year and the month standing in separate 段 and says
 * the fold reaches every step where both are out: folding at one step and not
 * at another makes the same pair change shape halfway through a zoom, and a
 * reader cannot tell it is the same pair.
 *
 * ⚠️ THE NOTE THAT STOOD HERE WAS FALSE. It read S-2's remark as
 * 「段階 4 は 3 段（年 / 月 / 日 ＋ 曜日）」 and had the day and the weekday
 * sharing one 段. The remark now reads （年 ＋ 月 / 日 / 曜日） and that sharing
 * was withdrawn on 2026-08-27. ⭐ The count did not move: the last step stood
 * in three 段 before and stands in three now, which is what lets FR-017's other
 * MUST -- the band's height MUST NOT move with the step -- go on holding
 * without the band growing.
 */
const ROWS_OF_TIER: { readonly [tier in ScheduleLayout['tier']]: readonly RulerRow[] } = {
  year: ['year'],
  yearMonth: ['yearMonth'],
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
 * T-221) -- FR-017 (MUST NOT) forbids thinning any row, so the year, the
 * year-and-month and the week rows walk their own calendar unit and stop at the
 * band's right edge. ⚠️ The stride is anchored on the day serial rather than on
 * whichever day the left edge happens to fall on, or every label would jump
 * one place to the side each time the view is panned by a day.
 *
 * ⛔ LF-1 NAMES NO INTERVAL FOR THE WEEKDAY ROW. It gives one to the year row,
 * the year-and-month row, the week row and the day row, and closes with a MUST
 * NOT against any other interval; the weekday row is newer than that list and
 * is not yet spelled out in it. ⭐ It ticks with the day row here because the
 * two are one axis split across two 段 -- FR-017 (MUST) has the day's number
 * and the weekday name the SAME day, so any other interval would print a
 * weekday under a day it does not belong to. ⚠️ Nothing is invented: no
 * interval of the weekday row's own is chosen, it is handed the day row's.
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
      : row === 'yearMonth'
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
        : row === 'yearMonth'
          ? { year: at.month === 12 ? at.year + 1 : at.year, month: (at.month % 12) + 1, day: 1 }
          : dayOfSerial(serialOf(at) + (row === 'week' ? 7 : stride))
  }
  return out
}

/**
 * FR-017's band, drawn. The band `regions.timeRuler` reserves is S-2 tall and
 * is where the year-and-month, week, day and weekday rows go; until this round
 * nothing put a glyph in it and nothing in `src/` read that member at all --
 * EP-2 of table T-076 calls the Time Ruler a MUST for the export, and a
 * schedule whose dates cannot be read is not a schedule.
 *
 * ⭐ The grain is `layout.tier`, which is what `rulerTierOf` already answered
 * for this frame, and the thinning is `tickStrideOf`. Neither is worked out a
 * second time here: FR-017 fixes one test and one arithmetic, and a copy of
 * either would part company with the layout the bars were placed by.
 *
 * ⭐ WHAT EACH ROW PRINTS IS NOW WRITTEN DOWN. FR-017 (MUST, 利用者の裁定
 * 2026-08-27) gives the year-and-month row `YYYY-MM` -- ⛔ the month in DIGITS
 * and never a word, so that S-83 can be one value in both languages -- the week
 * row the number of the day its week begins on, the day row the day's number,
 * and the weekday row the weekday. ⚠️ THE NOTE THAT STOOD HERE WAS FALSE. It
 * gave the month a row of its own and had the day row print the day's digits
 * AND the weekday; the ruling of 2026-08-27 folded the month into the year's
 * row and gave the weekday a row of its own, so the day row now prints digits
 * alone. ⛔ The weekday is the only language-dependent thing in the
 * picture, and it arrives as `weekdayWords` rather than being spelled here:
 * FR-038 (MUST) gives every printed word one dictionary and Chapter 6.2 gives
 * it one generated destination, neither of which is this file.
 * ⛔ STOP -- ⛔ Nor is there a horizontal
 * inset between a tick and its label: S-135 is the gap BETWEEN labels (it is
 * LF-1's arithmetic and nothing else) and S-136 is the vertical pad, so the
 * label starts on its own rule until a row says otherwise.
 *
 * ⭐ THE BAND PAINTS ITS OWN GROUND, and FR-041's MUST -- paint the ground
 * yourself, do not leave it to the viewing environment's system colours -- is
 * the authority the ruling names, no row of its own being added for it. The
 * colour is S-146 of table T-236, reaching this file through the generated
 * SCHEDULE_COLOURS block, which is the same one row the chrome reads on its
 * own side. The rectangle is the `band` argument as handed in: the Row Area
 * and S-2 already fixed it (U-19 / U-50 / SC-2), so this file chooses no
 * extent of its own. ⛔ It goes FIRST so the rules, the ticks, the labels and
 * the foot rule all sit on it, and so what the Row Area lets past its own top
 * edge -- LF-12's overhang, a first-row label -- is covered rather than
 * showing through the band.
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
  // ⛔ The band's height does NOT move with the tier (FR-017, MUST): the rows
  // share whatever S-2 gave the band, so a coarse tier gets taller rows rather
  // than a shorter band. S-2's own remark sizes the band for three of them.
  // ⛔ HOW A TIER WITH FEWER THAN THREE ROWS SPENDS THAT HEIGHT IS NOWHERE
  // STATED. FR-017 says only that the arrangement inside changes, and S-2's
  // remark counts the 段 of the finest tier alone; since the fold of 2026-08-27
  // that is open for three tiers rather than one. ⭐ An equal share is the one
  // reading that needs no number of its own -- nothing is invented and no row
  // is guessed at -- and it keeps every row the same height as its neighbours,
  // which is what the finest tier does where the count IS stated.
  const rowHeight = band.height / rows.length
  const right = band.x + band.width
  const stride = tickStrideOf(layout, settings)
  // Every tick of every row sits at least one day after the one before it, so
  // the days the band spans bound the walk. ⚠️ This thins nothing -- it only
  // keeps the loop finite when pxPerDay is small enough to put thousands of
  // years behind one band.
  const cap = Math.ceil(band.width / Math.max(0.001, layout.pxPerDay)) + 1
  const out: string[] = []
  // FR-041's ground, in S-146, over the rectangle handed in. Fill only: the
  // band's rules are the `<line>` templates below and the foot rule after
  // them, so a stroke here would draw the foot rule twice.
  out.push(
    `<rect x="${rounded(band.x)}" y="${rounded(band.y)}"` +
      ` width="${rounded(band.width)}" height="${rounded(band.height)}"` +
      ` fill="${ground}"/>`,
  )

  for (const [index, row] of rows.entries()) {
    const top = band.y + index * rowHeight
    // S-136 is the pad between the rule and the label, measured downwards;
    // S-179 is the pad below the label.
    // ⭐ S-179's remark is what makes this a SUBTRACTION rather than a taller
    // row: it says S-2's band height does NOT include the pad, and that a row
    // keeps the height it already had, so the baseline's offset inside the
    // glyph box is the only term left to move.
    // ⚠️ WITHOUT IT THE CLEARANCE IS NIL at the tier ROWS_OF_TIER gives
    // three rows: the baseline sat on the rule that opens the next row, and on
    // the band's foot rule for the last one, at every fontScale of S-3.
    // ⛔ It is not closed by growing the band -- FR-017 (MUST) forbids the
    // band's height moving, and S-179 is written so that nothing grows.
    // ⚠️ The lift is bounded by S-179's own max, so the baseline cannot rise
    // past the rule that opens its own row.
    const baseline =
      top + settings.rulerLabelPad + settings.rulerFont - settings.rulerLabelBottomPad
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"/>`,
      )
    }
    for (const day of ticksOfRow(row, layout, stride, weekStart, from, right, cap)) {
      const x = xFromDay(layout, day)
      // ⭐ The rule is drawn only where the boundary really falls, but the
      // label is held at the band's edge when its boundary is off to the left.
      // ⚠️ Exactly one tick per row can be left of the edge -- every row starts
      // at the tick containing `from` -- so no two labels are pinned together.
      // ⛔ Dropping it instead leaves the year row EMPTY at most positions:
      // S-1's remark measures a year at roughly a screen width and a half at
      // 1x, so its boundary is off to the left nearly always, and "which year
      // is this" stops being answerable.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"/>`,
        )
      }
      // FR-017 (MUST): the year-and-month row prints `YYYY-MM`, the weekday row
      // a weekday, and the other three a number each -- the year, the number of
      // the day the week begins on, the day. ⚠️ The weekday is looked up by
      // `weekdayOf`'s number, which is AT-17's -- 0 for Sunday -- and
      // `weekdayWords` arrives in that same order, so no mapping stands here.
      // ⛔ A weekday absent from the dictionary prints as nothing rather than
      // as a substitute: FR-038's fallback for an unwritten word, and the row
      // it leaves empty is still one of the band's 段, so the arrangement a
      // reader sees does not change with the display language (FR-017 MUST).
      const label =
        row === 'year'
          ? String(day.year)
          : row === 'yearMonth'
            ? `${day.year}-${twoDigits(day.month)}`
            : row === 'weekday'
              ? (weekdayWords[weekdayOf(day)] ?? '')
              : String(day.day)
      out.push(
        `<text x="${rounded(Math.max(x, band.x))}" y="${rounded(baseline)}"` +
          ` font-size="${rounded(settings.rulerFont)}" fill="${ink}"` +
          ` xml:space="preserve">${escaped(label)}</text>`,
      )
    }
  }
  // U-50 starts where the band ends, so the band's foot is the one rule that
  // separates the ruler from the Rows.
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"/>`,
  )
  return out
}

/**
 * The SVG for one frame (FR-080).
 *
 * ⭐ Every coordinate arrives already computed: ADR-001 has the shell run
 * table T-068 once per frame and hand the result to everyone who needs it, so
 * this unit measures nothing of its own.
 *
 * ⛔ THE NOTE THAT STOOD HERE WAS FALSE. It said the layout "is not an
 * argument"; `layout` has been the third parameter all along, and the label
 * has always read its placements. FR-042's band now reads `layout.rows` as
 * well, which is the edge `_source/components.json` draws from this component
 * to ScheduleLayout and calls "the ruler and the row placement".
 *
 * ⭐ `picture` IS REQUIRED AND HAS NO DEFAULT. Two call sites in `src/` is a
 * small enough cost that a new caller should have to decide which picture it
 * is asking for, and a default would let a forgotten export draw FR-043's
 * dummies into a reader's file in silence -- which is the very thing EP-14
 * exists to prevent. ⭐ It now answers EP-12 as well: an export is drawn with
 * no mark of the operation state, whatever `selection` and `follow` say.
 *
 * ⭐ `follow` DOES HAVE ONE, AND THE GROUND IS THE OPPOSITE. Saying nothing
 * means "no side is following", which is both what a caller outside the Dual
 * Cursor mode means and what DC-8 (MUST NOT) requires of an export -- so the
 * forgetful caller lands on the conservative picture rather than the leaky one.
 *
 * ⚠️ BOTH ARE AT THE TAIL, AND THAT IS FORCED RATHER THAN CHOSEN:
 * `snapshot-source.ts` reads this list positionally as
 * `Parameters<typeof svgFromSchedule>[3]` and `[4]`, so a parameter inserted
 * before index 5 would silently re-point both to the wrong type.
 *
 * ⚠️ The argument list is `src/`'s to settle: table T-064's own heading assigns
 * arguments and return values to the public entry in `src/`, on the ground that
 * this is the only place a signature is type-checked. PI-19's published MEMBER
 * does not move.
 *
 * @purity pure
 */
/**
 * ⛔ NOTHING MAY BE INSERTED BEFORE INDEX 5. `snapshot-source.ts` reads
 * `Parameters<typeof svgFromSchedule>[3]` and `[4]` by position, so a parameter
 * inserted before those two re-points both without a word from the compiler.
 * ⚠️ THE NOTE HERE USED TO SAY `weekdayWords` MUST STAY LAST, which was the
 * same rule stated too narrowly: `pointer` now stands after it, both indices
 * are untouched, and the constraint the sentence was defending still holds.
 *
 * ⚠️ ITS DEFAULT IS THE EMPTY LIST, AND THAT IS NOT "no weekday is wanted".
 * FR-017 (MUST) puts the weekday on the fourth tier; the default is FR-038's
 * fallback for a word not yet written, which prints the day's digits alone. A
 * caller that means to draw for a reader supplies the seven from
 * `rulerWeekdayWords` (PI-37) -- and only the fourth tier reads them, so the
 * default costs nothing at the other three.
 *
 * ⭐ `pointer` IS WHERE THE HAND IS, in the same screen px every region and
 * every geometry vertex is in, or `null` while no pointer has been heard of.
 * CU-3 of table T-029 calls the guide cursor 「ポインタに追従する補助線」, and
 * that position is a current value the document does not hold -- the third
 * thing in this file that is not a property of the document, beside `selection`
 * and `follow`, and it arrives the same way for the same reason (LY-5 of table
 * T-060 leaves current values with the Framework). ⛔ IT IS NOT `follow.x`:
 * that one is the Dual Cursor's, is an x alone, and is snapped to a day; the
 * guide cursor needs both axes and snaps to nothing.
 *
 * ⭐ `hovered` IS WHICH ROW OF TABLE T-023d THE POINTER NOW STANDS ON, or null
 * where none does. FR-013 (MUST) darkens the not-started marker and FR-043's
 * dummies 「ポインタが乗っているあいだだけ」, and 「乗っている」 is a question
 * about that table -- so the answer is handed IN rather than worked out here.
 * ⛔ NOT A SECOND HIT TEST, WHICH IS THE WHOLE REASON IT IS A PARAMETER. R7.4
 * has one reading per happening, and the Framework already asks `itemAtPointer`
 * (PI-7) once per move for IN-2's pointer shape and for FR-048's judgement --
 * a walk repeated here would be a second moment as well as a second walk, and
 * this unit holds no `PointerSlop` (table T-206 keeps S-90 .. S-93 out of the
 * document, so they reach the hit test as an argument and never as a constant).
 * ⚠️ IT IS THE HIT AND NOT A BOOLEAN: the marker and the dummies of ONE Task
 * darken, so both the row and the thing it claimed have to arrive.
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
): string {
  const hue = schedule.project.themeHue
  const monochrome = settings.themeMonochrome
  const dark = isDarkTheme(settings)
  /** One row of table T-236, under the theme this frame is drawn in. */
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  // ZO-5's label needs the string and the size LC-5 measured it at, and both
  // travel with the placement rather than the geometry.
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  // FR-019: 「線色を指定でき、指定が無ければ注記用の固定色で描く」. Both halves.
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  // FR-042's other half: the colour the author put on the row itself (AT-58).
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  /**
   * EP-12 of table T-076, in ONE place: 「操作の状態 …『Selection』（`U-39`）…
   * 描かない」. An export carries no sign of what a person has picked, and
   * `DC-8` of table T-029a (MUST NOT) sends the `Dual Cursor`'s following mark
   * out by the same row -- which side follows is operation state too.
   *
   * ⭐ WHY THE REFUSAL IS ONE LINE AND NOT ONE PER KIND. EP-12 is one rule.
   * The marks it bars are spelled six different ways below -- the dashed frame
   * on a Task, on a highlight box and on a comment box, `S-178` on the
   * dependency line and on the status line, `FR-075`'s grab points, and DC-8's
   * width on a cursor line -- and every one of them is read from these two
   * arguments and from nowhere else. Emptied here, the rule cannot be obeyed
   * in five places and forgotten in the sixth.
   *
   * ⛔ IT MAY NOT BE LEFT TO THE CALLER. `frame-loop.ts` does hand the export
   * an empty `Selection` and no following side, and while it was the only
   * caller nothing leaked -- but a picture that has been TOLD it is the export
   * states the rule itself, and this file's own head comment had already
   * recorded the two marks that survived when it did not.
   *
   * ⚠️ NOT THE SAME THING AS EP-14's `picture` test further down. That one
   * turns off something the DOCUMENT asks for (`FR-043`'s dummies hang on the
   * Task being unstarted), which no argument here could suppress; this one
   * turns off what the SESSION asks for.
   */
  const drawsOperationState = picture === 'screen'
  const marks: readonly ItemRef[] = drawsOperationState ? selection.items : []
  const following = drawsOperationState ? follow : null
  /**
   * FR-013's other half: 「未着手のマーカーと、実績入力のダミー（`FR-043`）は
   * 薄く描き、ポインタが乗っているあいだだけ濃くすること（MUST）」 -- the Task
   * whose faint marks the hand is on, and which of the two kinds it is on.
   *
   * ⭐ SPENT THROUGH `drawsOperationState` LIKE THE OTHER THREE. Where the hand
   * is IS operation state, and EP-12 of table T-076 keeps that out of an export
   * (「操作の状態 … 描かない」) -- PM-1a is exported (EP-5), so a hovered marker
   * darkened in a saved picture would carry the reader's pointer into the file.
   * ⛔ Not left to the caller: the note on `marks` gives the reason in full.
   */
  const hover = drawsOperationState ? hovered : null
  /**
   * Where the hand is, spent through `drawsOperationState` for the reason
   * `hover` above states: EP-12 of table T-076 keeps 操作の状態 out of an
   * export, and a mark darkened by the reader's pointer is that state.
   */
  const hand = drawsOperationState ? pointer : null
  /**
   * Whether the hand stands on one of `rows` of THIS Task -- FR-013's
   * 「ポインタが乗っているあいだ」, asked of the answer handed in.
   *
   * ⭐ THE THING AS WELL AS THE ROW, which is what keeps one Task's marker from
   * darkening because the pointer found another's: `Hit` carries both and both
   * are read.
   *
   * @purity pure
   */
  const handOn = (taskUid: number, rows: readonly Hit['grab'][]): boolean =>
    hover !== null &&
    hover.item.kind === 'task' &&
    hover.item.taskUid === taskUid &&
    rows.includes(hover.grab)
  /**
   * FR-013's 「ポインタが乗っているあいだ」 asked of a DRAWN FIGURE, which is
   * how the 作法 it points at reads it: HF-6 of table T-051 shows the row
   * control 「その行の名前にポインタが乗っているあいだだけ」 -- the condition is
   * the pointer being over the thing, and no order of precedence enters it.
   *
   * ⛔ WHY THE DUMMIES MAY NOT BE ASKED THROUGH `handOn`, MEASURED. Table
   * T-023d prints GR-3 and GR-4 (the plan's two ends) ABOVE GR-9 / GR-17, and
   * 「上の行ほど優先すること（MUST）」, so once a day is drawn narrower than
   * S-90's 6px the plan's end claims the point the dummy stands on. At the
   * magnification FR-055 opens with, 21 of 21 dummies on screen answered GR-3
   * or GR-4 and 0 of 21 darkened, while the same dummies darken 2 of 2 eight
   * notches in. ⚠️ THAT ORDER IS NOT DISTURBED HERE and must not be: which row
   * a PRESS goes to is table T-023d's, and MK-9a scopes its 優先順位 to
   * 「掴む対象が重なった」. This decides only what is drawn.
   *
   * ⚠️ The marker is still asked through `handOn`, and that is a measurement
   * and not a second reading: GR-7 sits above every row that can reach the
   * marker's square, so the two conditions coincide there -- 21 of 21 markers
   * darkened. Changing it would be a change with nothing behind it.
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
   * drops a link whose predecessor this zoom did not draw, so the two runs part
   * company the moment one is dropped.
   */
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  for (const item of marks) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

  // ⛔ Table T-020 is the paint order, back to front, and in an SVG the
  // document order IS that order. ZO-1 予定バー, ZO-1a 補助線, ZO-2 実績バー,
  // ZO-3 進捗マーカー, ZO-4 依存線, ZO-5 名称ラベル. ⚠️ The first version of
  // this file wrote the dependencies FIRST, which put them at the back -- the
  // one arrangement the table's prose forbids in as many words.
  // ⭐ The bands are not a row of that table. They are the ground the table's
  // six elements are painted on, so they go behind all of it (FR-042).
  const bandParts: string[] = []
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []
  // ⛔ TABLE T-020 HAS NO ROW FOR AN ANNOTATION, so where a comment box sits
  // among the six is decided here rather than read. It goes OVER ZO-5's name
  // labels: NFR-007 makes 4.5:1 a MUST for the comment box's own text, and a
  // label painted across the body would put unmeasured ink on the ground that
  // MUST is met against. The same reading `handleParts` and the ruler take.
  // @provisional PD-238
  const annotationParts: string[] = []
  // ⭐ Neither of these is a row of table T-020, and neither is an omission
  // from it: the fade grab points are an overlay FR-075 puts on the SELECTED
  // Task, and the ruler is a different UI part (U-19, not U-50). Both go over
  // the table's six so that nothing painted in the Row Area can cover them.
  const handleParts: string[] = []
  // SL-8's frames, for the same reason: the sign that a thing is selected is
  // not one of the table's six elements, and a bar painted after it would hide
  // the sign on whatever sits underneath.
  //
  // ⭐ ONLY THE FRAMED HALF OF SL-1 ARRIVES HERE. 依存線 and 基準日線 MUST NOT
  // be framed; both are thickened where they are drawn, by `selectedLineWidth`,
  // and so stay in `linkParts` with their own paint order.
  //
  // ⭐ SL-1's comment box is framed here too, now that `ScheduleGeometry` gives
  // it a rectangle: its body IS its bounding rectangle, the same way the
  // highlight box's is.
  const selectionParts: string[] = []

  // ⭐ FR-043's dummies GET NO ARRAY OF THEIR OWN. Table T-020 holds no row for
  // U-52, and the dummies stand in for the ends of the actual bar a Task not
  // started does not have yet -- the same reading GR-7 takes when it hangs the
  // not-started marker off GR-17 -- so they are painted at ZO-2, into
  // `actualParts`. That keeps them behind ZO-3's progress marker and behind
  // ZO-5's name label, which are the two orderings the table does state.
  // ⛔ A Task has dummies exactly when it has NO actual bar, so the one array
  // never has to hold both. @provisional PD-209
  //
  // ⭐ THE HOVER HALF OF FR-013 IS DRAWN, off `hovered` -- see `handOn` above
  // and the two places it is asked.
  //
  // ⛔ STOP -- WHAT IS STILL NOT DRAWN is the actual the author is about to
  // place: FR-043's own 「掴んでいるあいだ、置くことになる実績を描いて示すこと」
  // (the paragraph above table T-023d's GR-9 / GR-17 / GR-18) needs the PRESS
  // in flight, and a hit under the pointer is not one. ⚠️ A hovered mark and a
  // held one are different questions, and only the first is answered here.

  // FR-042 (MUST): one band per drawn row, and a group grid line on its
  // boundary. ⛔ Clipped to the Row Area rather than drawn wherever the row
  // sits: S-78 slides the whole stack, so a scrolled row's band would
  // otherwise be painted over the Time Ruler and the app header above it.
  const area = regions.rowArea
  const areaBottom = area.y + area.height
  // ⛔ FR-098 (MUST NOT): 「スクロールする行を帯の下へ潜らせてはならない」. A row
  // that flows is cut at the top of the SCROLLING REMAINDER, which LF-14 puts
  // one `rowGap` below the pinned band, while a banded row is cut at the `Row
  // Area`'s own top edge -- the band stands there and is the one thing allowed
  // to. ⚠️ `scrollAreaY` is optional and reads as the area's top where no row is
  // pinned, which is the one ceiling every row had before a band existed.
  const scrollTop = layout.scrollAreaY ?? area.y
  for (const [position, row] of layout.rows.entries()) {
    const top = Math.max(row.y, row.isPinned === true ? area.y : scrollTop)
    const bottom = Math.min(row.y + row.height, areaBottom)
    if (bottom <= top) continue
    const chosen = colourOfGroup.get(row.groupId) ?? null
    const band = chosen === null ? themed(bandRowOf(row.depth, position)) : chosen
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(area.width)}" height="${rounded(bottom - top)}"` +
        ` fill="${monochrome ? achromatic(band) : band}"/>`,
    )
    // S-68 is whether the group grid line is drawn at all; S-165 is its
    // colour. FR-042's RATIONALE makes the line itself a MUST -- one row is
    // one target, and an invisible boundary leaves that unreadable.
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}" stroke-width="1"/>`,
    )
  }

  // FR-089 -- the date grid lines. ⛔ THIS WAS DRAWN NOWHERE AT ALL until
  // 2026-08-27: IC-42 toggled `dateGridLinesVisible`, S-67 held the value and
  // table T-202 carried the row, and no path in this file put a line down. A
  // spec-only test caught it (D-53).
  //
  // ⭐ THE INTERVAL IS NOT WORKED OUT HERE. FR-089 (MUST) says 「間隔は 表 T-221
  // の `LF-1` が段階ごとに持つ 1 つの値とすること」 and `tickStrideOf` is that
  // value, already read above for the ruler -- so the lines stand exactly where
  // the finest row of the band ticks, which is the whole of what FR-089 asks.
  // ⛔ A second arithmetic here would part company with the band the moment a
  // tier boundary moved (R2.7).
  //
  // ⚠️ THE FINEST ROW, NOT THE DAY ROW. `ROWS_OF_TIER` ends every tier with its
  // own finest row -- the year tier has only a year row -- and FR-089's own
  // example walks the same ladder (「「年 ＋ 月」を出しているなら月の変わり目に」).
  //
  // ⛔ COLOUR: S-149, the rule colour of table T-236 (「区切りの線」), which the
  // ruler's own rules already take. No row of that table names the date grid
  // line, and this is display only with no trace in the saved form.
  // @provisional PD-315
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
            ` stroke="${themed('S-149')}" stroke-width="1"/>`,
        )
      }
    }
  }

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
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
    if (task.plan !== null) planParts.push(barSvg(task.plan, plan))
    for (const guide of task.guides) {
      // S-105: the guide takes the ACTUAL bar's colour, because it is the line
      // that leaves the actual bar. ⛔ No key of its own -- FR-041 forbids
      // storing a derived colour, and a second constant would be one.
      guideParts.push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${actual.stroke}"` +
          ` stroke-width="${rounded(settings.planActualGuideWeight)}"` +
          ` stroke-dasharray="${rounded(settings.planActualGuidePattern.on)}` +
          ` ${rounded(settings.planActualGuidePattern.off)}"/>`,
      )
    }
    if (task.actual !== null) actualParts.push(barSvg(task.actual, actual))
    // FR-043 (MUST): two faint grab handles on a Task not started, one on a
    // milestone. ⛔ EP-14 of table T-076 keeps them out of the exported
    // picture, and this is the only place that can obey it -- the geometry may
    // NOT be stripped instead, because GR-7 hangs the not-started progress
    // marker off GR-17 and dropping the dummies would take EP-5's marker with
    // them (WY-3 of table T-041 measures it).
    if (picture === 'screen' && task.dummies.length > 0) {
      // ⭐ ONE GROUP RATHER THAN AN OPACITY PER SHAPE, for the reason
      // `markerSvg`'s note already records: two translucent shapes composite to
      // a third value where they meet, and at a low zoom S-129 can be narrower
      // than S-180, so GR-9 and GR-17 do overlap. S-131 would stop being the
      // degree of anything.
      // ⭐ `actual` is the paint the actual bar would have taken: FR-013 has
      // the dummy inherit the actual bar's colour and FR-041 (MUST NOT) forbids
      // storing a derived one, so there is no second formula and no key here.
      // ⭐ GR-18 is drawn as the SAME figure as GR-9 and GR-17, not as a
      // milestone's own diamond (SH-5 governs the milestone, not a handle):
      // FR-043 calls all three the same thing and S-93 gives all three ONE hit
      // box, so one drawn figure keeps the picture and the target the same
      // shape. @provisional PD-208
      // ⛔ `drawnWidth`, never `dummyWidth`: `item-hit-area.ts` spells S-93's
      // HIT width that way, and S-180's own note is that the two differ.
      const drawnWidth = NOT_STORED_DUMMY_SIZES['S-180']
      const marks = task.dummies
        .map((one) =>
          barSvg(
            { form: 'outline', points: cornersAround(one.at, drawnWidth, one.height) },
            actual,
          ),
        )
        .join('')
      // FR-013 (MUST): 「実績入力のダミー（`FR-043`）は薄く描き、ポインタが
      // 乗っているあいだだけ濃くすること」. ⭐ WHAT 「濃く」 IS: the mark drawn
      // with no faintness on it at all. ⛔ No settings row carries a second
      // degree -- S-131's own note calls it 「実績のダミーと未着手マーカーの
      // 濃さ」 and the requirement names it as THE value -- so darkening is the
      // taking away of that one attribute rather than a number invented here.
      // ⚠️ HF-6's precedent reads the same way: the row control is hidden and
      // then simply drawn, never drawn twice at two strengths.
      // ⭐ THE TASK'S THREE ROWS MOVE TOGETHER, AND THE GROUP IS WHY. GR-9 and
      // GR-17 are painted in ONE group for the compositing reason above, so a
      // per-mark strength would put back exactly the third value that group
      // exists to prevent; and the hand is on one of a Task's dummies or on
      // none. @provisional PD-351
      // ⛔ ASKED OF THE FIGURE AND NOT OF THE ROW THAT WON. `handInside`'s note
      // carries the measurement: the plan's ends (GR-3 / GR-4) stand above
      // GR-9 / GR-17 in table T-023d, so below S-90's reach in a day's width
      // the answer `handOn` gives is the plan's end and this MUST went unmet at
      // every magnification a whole document is read at. @provisional PD-360
      const faintness = task.dummies.some((one) =>
        handInside(one.at, drawnWidth, one.height),
      )
        ? 1
        : settings.dummyOpacity
      actualParts.push(`<g opacity="${rounded(faintness)}">${marks}</g>`)
    }
    if (selected.has(task.taskUid)) {
      // SL-8 (MUST): the frame goes on the Task's bounding rectangle, so all
      // five shapes of table T-012 get it and not only the three with an area.
      //
      // ⭐ The box is the BARS' extent -- what SL-2 clicks and SL-7 drags. ⛔
      // The name label is deliberately left out: LC-6 places it outside the bar
      // and FR-014's overhang runs it further still, so a frame that swallowed
      // it would stop reading as this Task's own extent and would overlap the
      // neighbouring rows'. ⚠️ The progress marker and the fade handles are
      // left out for the other reason -- neither is the thing SL-1 names, so
      // neither may decide how far the Task's own frame reaches.
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      // A Task neither half of which was drawn (S-59's plan-only / actual-only)
      // has no extent, and a frame around nothing would sit at the origin.
      if (box !== null) selectionParts.push(selectionFrameSvg(box, themed('S-151')))

      // FR-075 (MUST): the grab points show on the SELECTED Task and on no
      // other. S-92's hit area is already live in ItemHitArea, so until this
      // round a person could catch a point that was never drawn. S-109 is the
      // half-side of the square and S-110 its stroke; FD-5 already decided
      // which shapes get handles at all, so an empty list draws nothing.
      const half = settings.fadeHandleHalfPx
      for (const foundAt of task.fadeHandles) {
        handleParts.push(
          `<rect x="${rounded(foundAt.x - half)}" y="${rounded(foundAt.y - half)}"` +
            ` width="${rounded(half * 2)}" height="${rounded(half * 2)}"` +
            ` fill="${FADE_HANDLE_FILL_COLOUR}" stroke="${FADE_HANDLE_STROKE_COLOUR}"` +
            ` stroke-width="${rounded(settings.fadeHandleStrokePx)}"/>`,
        )
      }
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      // S-131 is the degree FR-013's MUST names, and `markerSvg` is where the
      // one symbol it reaches is decided -- PM-4 wins over PM-1a and is
      // exempted there rather than by a second test on this side.
      // ⭐ AND THE SAME MUST's OTHER HALF: the not-started marker is darkened
      // while the hand is on it. GR-7 of table T-023d is the row that claims
      // the progress marker, so that is the row asked about; `markerSvg` still
      // decides WHICH symbol the faintness reaches, and a marker that is not
      // PM-1a was never faint for this to undo. @provisional PD-351
      markerParts.push(
        markerSvg(
          task.marker,
          themed('S-161'),
          themed('S-162'),
          handOn(task.taskUid, MARKER_GRAB_ROWS) ? 1 : settings.dummyOpacity,
        ),
      )
    }
    const placed = placedOf.get(task.taskUid)
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      labelParts.push(
        labelSvg(
          task.label,
          placed.label,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
          settings.labelPad,
        ),
      )
    }
    // OC-2 of table T-038: the assignee label (FR-059, with AS-2 of table T-225
    // for the Task nobody is on) and the percent label (FR-090), jutting out
    // past the left of the bar where `outsideLabelBoxesOf` placed them.
    //
    // ⛔ S-60 AND S-61 ARE NOT READ HERE. FR-049 (MUST) adds table T-202's
    // switches to the state condition of every requirement that draws the
    // element, and LC-7 is where that was spent -- OC-2's own MUST NOT keeps a
    // hidden label out of the occupied width, so the layout has to know. A
    // hidden label reaches here as a null box, and a second test would be the
    // same condition in two places.
    // ⭐ THE SAME INK AND THE SAME HALO AS ZO-5. S-168 is 「ラベルの文字色」 and
    // S-169 its outline; table T-236 holds no other pair for a label, and
    // inventing one would be this file writing a settings row.
    if (placed !== undefined) {
      for (const [box, text] of [
        [task.assigneeLabel, placed.assigneeLabel],
        [task.percentLabel, placed.percentLabel],
      ] as const) {
        if (box === null || text === '') continue
        labelParts.push(
          labelSvg(box, text, placed.labelFontSize, settings, themed('S-168'), themed('S-169'), 0),
        )
      }
    }
  }

  // ⛔ S-159 AND S-160 ARE TWO DIFFERENT COLOURS, and neither follows the
  // theme (FR-041, MUST NOT, rewritten 2026-08-25). ⚠️ They shared one grey
  // here until that day, because the earlier wording said "the same fixed
  // colour" in the very sentence that also listed both as following the theme.
  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const arrowId = `grs-dependency-arrow-${pictureId(
    `${rounded(width)}x${rounded(height)}|${geometry.tasks.length}` +
      `|${geometry.dependencies.length}|${selected.size}|${schedule.project.title ?? ''}`,
  )}`
  const defsParts: string[] = []

  // ⛔ GD-6 of table T-020a (MUST) asks for the head here and NOT on the guide
  // above: 「依存線は実線で矢じりを持ち、補助線は点線で矢じりを持たない」.
  for (const link of geometry.dependencies) {
    if (!settings.dependencyVisible) break
    if (defsParts.length === 0) {
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
    }
    // SL-8 (MUST NOT): a selected dependency is NOT framed. It is the same
    // polyline at S-178 times `dependencyWidth`.
    const linkWidth = selectedLineWidth(
      settings.dependencyWidth,
      selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
    )
    linkParts.push(
      `<polyline points="${pointsOf(link.points)}" fill="none"` +
        ` stroke="${themed('S-159')}" stroke-width="${rounded(linkWidth)}"` +
        ` marker-end="url(#${arrowId})"/>`,
    )
  }

  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    linkParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${themed('S-160')}" stroke-width="${rounded(settings.progressLineWidth)}"/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    // CU-1's line. S-163 is its colour, and it names no hue of its own.
    // ⛔ SL-8 (MUST NOT): a selected status line is NOT framed either -- its
    // bounding rectangle runs the height of the Row Area and would strike
    // through everything behind it. It is drawn at S-178 times its own width.
    // ⛔ THAT OWN WIDTH IS THE TYPED 1, and it is in no row. It stood before
    // this change and is left where it stands rather than being made to look
    // like a value the specification holds.
    const statusWidth = selectedLineWidth(1, selectedStatusLine)
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="${rounded(statusWidth)}"/>`,
    )
  }

  const cursors = geometry.dualCursor
  if (cursors !== null) {
    // CU-2's two lines (EP-6 draws them into an export as well). S-195 is the
    // colour, the SAME on both: DC-8 shows which one follows by WIDTH and
    // never by colour, and the row says why it inherits S-151 rather than the
    // status line's S-163 -- the two are up at once and one colour would leave
    // a reader unable to tell which line is which.
    // ⭐ PAINTED INTO `linkParts`, WHERE CU-1's LINE IS -- over ZO-1 to ZO-3
    // and under the labels, the annotations and the selection marks. Table
    // T-020 holds no row for either cursor, so the place is chosen here, and
    // the two rows of table T-029 are put together rather than one above the
    // other: a reader measuring against the status date is comparing them.
    // @provisional PD-312
    const colour = themed('S-195')
    // DC-1: the following side is drawn at the day under the pointer, which is
    // the reading the click will fix. The other stands where the document put
    // it. See `DualCursorFollow` for PD-310 and PD-311.
    const followedDay =
      following === null || following.x === null ? null : dateAtX(layout, following.x)
    const followedX = followedDay === null ? null : xFromDay(layout, followedDay)
    for (const side of ['date1', 'date2'] as const) {
      const isFollowing = following !== null && following.side === side
      const standing = side === 'date1' ? cursors.date1X : cursors.date2X
      const x = isFollowing && followedX !== null ? followedX : standing
      // DC-8 borrows SL-8's rule for a line: S-194 is this line's own width and
      // S-178 the multiplier the mark is made of.
      const width = selectedLineWidth(NOT_STORED_DUAL_CURSOR_SIZES['S-194'], isFollowing)
      linkParts.push(
        `<line x1="${rounded(x)}" y1="${rounded(cursors.top)}"` +
          ` x2="${rounded(x)}" y2="${rounded(cursors.bottom)}"` +
          ` stroke="${colour}" stroke-width="${rounded(width)}"/>`,
      )
    }
  }

  // CU-3 of table T-029: 「`Guide Cursor`（ガイドカーソル） | ポインタに追従
  // する補助線 | 4 モード排他 —— なし / 十字 / 縦 1 本 / 縦 2 本」. The mode is
  // S-66 of table T-202, and until this round nothing in `src/` read it but
  // FrameLoop's "does this move owe a frame" test -- the setting reached the
  // document and no line was ever drawn (D-72).
  //
  // ⛔ NOT IN AN EXPORT. EP-6 of table T-076 is verbatim: 「`Status Line` と
  // `Dual Cursor` を描く。`Guide Cursor` は描かない」, on the ground that a
  // pointer position has no meaning in a saved picture. `drawsOperationState`
  // is exactly that test and is already the gate for every other mark of the
  // session, so the rule is obeyed in the one place rather than in a second.
  //
  // ⭐ PAINTED INTO `linkParts`, BESIDE THE OTHER TWO CURSORS, for the reason
  // PD-312 records for CU-2: table T-020 holds no row for any of the three, and
  // putting the rows of table T-029 in one layer is what lets a reader compare
  // them. The layer is carried by PD-342 below, with the region.
  if (drawsOperationState && settings.guideCursorMode !== 'none' && pointer !== null) {
    const area = regions.rowArea
    const inside =
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    if (inside) {
      // ⛔ NO ROW HOLDS EITHER OF THESE TWO. Table T-236 has no guide cursor
      // colour (S-163 is the status line's, S-195 the Dual Cursor's) and table
      // T-206 has no guide cursor width (S-194 is the Dual Cursor's). S-148 is
      // the muted neutral the table already keeps for what is secondary, and it
      // is deliberately NEITHER of the cursor colours: the guide cursor carries
      // no date, and a reader who has the status line or a measurement up must
      // still be able to tell which line is which -- which is the same worry
      // FR-048's own closing ⚠️ states about the two "縦 2 本". The width is the
      // typed 1 the status line already stands at. @provisional PD-341
      const guideColour = themed('S-148')
      const guideWidth = 1
      // ⛔ THE REGION IS THE `Row Area`, THE SAME TWO EDGES CU-1 AND CU-2 RUN
      // BETWEEN, and no row says whether this line crosses the ruler. The
      // pointer is also required to BE in that area: nothing says what a guide
      // cursor does while the hand is over the ruler or a panel, and a line
      // striking the schedule from a pointer that is not on it guides the eye
      // to a place the eye is not. @provisional PD-342
      const vertical = (x: number): string =>
        `<line x1="${rounded(x)}" y1="${rounded(area.y)}"` +
        ` x2="${rounded(x)}" y2="${rounded(area.y + area.height)}"` +
        ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"/>`
      if (settings.guideCursorMode === 'crosshair') {
        // 十字: the vertical and the horizontal, crossing under the hand.
        linkParts.push(vertical(pointer.x))
        linkParts.push(
          `<line x1="${rounded(area.x)}" y1="${rounded(pointer.y)}"` +
            ` x2="${rounded(area.x + area.width)}" y2="${rounded(pointer.y)}"` +
            ` stroke="${guideColour}" stroke-width="${rounded(guideWidth)}"/>`,
        )
      } else if (settings.guideCursorMode === 'single-vertical') {
        // 縦 1 本.
        linkParts.push(vertical(pointer.x))
      }
      // ⛔ 縦 2 本 DRAWS NOTHING, AND THAT IS THE SPECIFICATION'S ANSWER TODAY.
      // Two lines need a distance between them and NO ROW STATES ONE -- not
      // table T-029, not table T-202, not tables T-206 or T-236. Worse, FR-048
      // closes with a MUST that cannot be met without a second invented value:
      // 「同じ見た目なので、どちらが出ているかを画面上で区別できるようにする
      // こと（MUST）」 -- CU-2's pair and this one look alike, and nothing says
      // how they are told apart. Inventing a gap AND a distinguishing mark is
      // two undecided values stacked, which rule 06's class H forbids outright.
      // @provisional PD-343
    }
  }

  for (const box of geometry.highlightBoxes) {
    // FR-019: the author's line colour, and the annotation's fixed one only
    // when they named none.
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ' stroke-width="1"/>',
    )
    // SL-8. ⭐ The rectangle IS the bounding box here, so the frame lands on
    // the same four numbers the box was drawn from -- and it is still a
    // separate rect, because SL-8 (MUST NOT) forbids re-stroking the target's
    // own outline and the dash has to survive the author's own line colour.
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151')))
    }
  }

  for (const box of geometry.commentBoxes) {
    // ⛔ STOP -- THE LEADER IS NOT DRAWN. AT-111 gives a comment box two leader
    // kinds, `calloutBox` and `polyline`, and FR-019 makes the author's choice
    // between them a MUST -- but NO ROW IN ANY TABLE says what either one is
    // drawn AS, and RC-13 of table T-026 reserves a new figure to the user.
    // Drawing a segment here would be this unit minting the figure. ⚠️ The
    // visible consequence while it stands: the choice changes nothing on
    // screen, and a body dragged off its anchor is joined to it by nothing.
    //
    // ⭐ The body is FILLED rather than left open. NFR-007 makes 4.5:1 a MUST
    // for the comment box's own text in as many words, and text laid over an
    // arbitrary bar has no known ground to meet that against. S-162 is the
    // precedent for taking S-146 to float a mark clear of what is behind it.
    // ⚠️ Measured against WCAG 2.1: S-147 on S-146 is 17.76:1 light and 14.94:1
    // dark, while ANNOTATION_COLOUR as INK is 3.58:1 on the dark ground and
    // FAILS -- so it is the outline alone, where 1.4.11's 3:1 is what applies.
    // ⚠️ The fill hides whatever is behind the body. That is the price of the
    // MUST, not an oversight. @provisional PD-231
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${ANNOTATION_COLOUR}" stroke-width="1"/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      // ⛔ The baseline sits at the FOOT of each em box. FR-097 makes one line
      // as tall as the type and stops there; no row says where inside that box
      // the baseline falls. `rulerSvg` computes the same foot with a lift of
      // its own, and S-179 is the RULER's row -- rule 03 forbids borrowing it.
      // ⚠️ The last line's descenders eat into S-181's padding. That is the
      // honest consequence of the foot and is worth a row of its own.
      // @provisional PD-230
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}" fill="${themed('S-147')}"` +
          ` xml:space="preserve">${escaped(line)}</text>`,
      )
    }
    // SL-8, the framed half. ⭐ The body IS the bounding rectangle, and the
    // frame is still a separate rect: SL-8 (MUST NOT) forbids re-stroking the
    // target's own outline, and the dash has to survive the annotation colour.
    if (selectedComments.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.body, themed('S-151')))
    }
  }

  const parts = [
    ...defsParts,
    ...bandParts,
    ...planParts,
    ...guideParts,
    ...actualParts,
    ...markerParts,
    ...linkParts,
    ...labelParts,
    ...annotationParts,
    ...selectionParts,
    ...handleParts,
    // ZO-6 of table T-020 -- the range selection's rectangle, at the front of
    // that table (the user's ruling of 2026-08-29). SL-3 (MUST): 「握っている
    // あいだ、取ろうとしている矩形を描くこと」.
    //
    // ⭐ IT IS `selectionFrameSvg`, NOT A SHAPE OF ITS OWN, and that is the
    // whole of why this row minted no value: the rectangle a marquee is taking
    // is drawn in the same ink, the same S-174 width and the same S-175 dash as
    // the frame around what has been taken. ⛔ Inventing a second look would
    // have needed a width, a dash and a colour that no row states.
    // ⚠️ BEFORE THE RULER AND NOT AFTER IT. ZO-6 is the front of table T-020,
    // and the band is not a row of that table at all -- it is drawn over
    // everything for the reason the next comment gives, and a marquee dragged
    // up across it must not take the dates away from the reader.
    // ⛔ NOTHING IS DRAWN FOR AN EXPORT, and no guard here says so: EP-12 of
    // table T-076 keeps operation state out of a picture, and the export road
    // simply does not pass a rectangle -- the default is what answers it.
    ...(marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'))]),
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
      // ⭐ S-146, S-147 and S-149 -- the ground, the ink and the rule, back to
      // front -- now that the generator sends all three to SCHEDULE_COLOURS as
      // well as to the chrome's roster. ⛔ They are handed IN rather than read
      // here: `themed` is `svgFromSchedule`'s own closure over the hue and the
      // two flags, and reading table T-236 a second time in this file is the
      // drift the generated block exists to stop. ⚠️ No `achromatic` wrapper
      // around S-146, unlike the row bands above: `colourOf` already applies
      // monochrome inside its `followsHue` branch, and S-146 follows the hue.
      // The bands need the wrapper because theirs may be an AUTHOR colour.
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
 * ⛔ `DUMMY_GRAB_ROWS` STOOD HERE AND IS GONE, and the reason is a measurement
 * rather than a tidy-up. It named GR-9 / GR-17 / GR-18 so that FR-013's
 * 「ポインタが乗っているあいだ」 could be asked of the row table T-023d awarded
 * the point to. That row is never one of those three below the magnification at
 * which a day is drawn wider than S-90: the plan's ends (GR-3 / GR-4) are
 * printed above them and 「上の行ほど優先すること（MUST）」. `handInside` in
 * `svgFromSchedule` carries the figures measured and asks the drawn shape
 * instead, the way HF-6 of table T-051 asks it. ⚠️ Which row a PRESS goes to is
 * untouched -- that is table T-023d's, and MK-9a scopes its 優先順位 to
 * 「掴む対象が重なった」.
 */

/**
 * The row of table T-023d that claims the progress marker -- GR-7, which is
 * where FR-013's own not-started marker stands.
 */
const MARKER_GRAB_ROWS: readonly Hit['grab'][] = ['GR-7']

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-236)
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
 * specification records that the document does not keep it, and EP-14
 * of table T-076 keeps the dummy out of the exported picture without
 * reserving its place -- so a reader handed this document sees the
 * same picture whatever this value is.
 */
export const NOT_STORED_DUMMY_SIZES: {
  /** S-180, in px */
  readonly 'S-180': number
} = {
  'S-180': 12,
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
}
// </generated>



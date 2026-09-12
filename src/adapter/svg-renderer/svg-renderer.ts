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
 * ⭐ EP-12 is the second row it answers, and `drawsOperationState` in
 * `svgFromSchedule` spends it -- a row of table T-076 is a rule about the
 * PICTURE, so the picture is where it is spent.
 *
 * ⚠️ STILL DELIBERATELY NARROW. Two rows of table T-076 reach this argument,
 * each once and for a stated reason; it is not a general "export mode" that a
 * third row may be folded into without one.
 *
 * @provisional PND-210
 */
export type SchedulePicture = 'screen' | 'export'

/**
 * The Dual Cursor mode as it stands THIS FRAME.
 *
 * ⭐ WHY IT IS A PARAMETER AND NOT PART OF THE GEOMETRY. Which side follows is
 * a current value, and LY-5 of table T-060 leaves those with the Framework;
 * DC-8 of table T-029a (MUST NOT) keeps the mark for it out of an export while
 * EP-6 still draws the two lines. So the PLACEMENT travels in the geometry,
 * where the document put it, and the MARK travels here -- and an export gets
 * the two lines and no mark whether or not it says anything, because
 * `drawsOperationState` drops this argument on that picture.
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
   * zoom. @provisional PND-310
   * ⛔ WITH NO POINTER THE LINE STANDS AT ITS STORED DATE. DC-7 (MUST NOT) keeps
   * a placed pair standing until it is cleared, so a hand leaving the window
   * may not take half a measurement away with it. @provisional PND-311
   */
  readonly x: number | null
}

/**
 * FR-020's trail, as the picture receives it.
 *
 * ⭐ WHY BOTH HALVES TRAVEL AND NEITHER IS REACHED FOR. This unit is pure. The
 * name is S-99a of table T-206, which that row keeps in `localStorage` -- a
 * store LY-5 of table T-060 leaves with the Framework and LM-14 admits may be
 * refused outright -- and the moment is a clock, which a pure unit may not read
 * at all. So the two are settled by the shell and handed in already spelled.
 *
 * ⭐ `null` IS S-144 OF TABLE T-206, SPENT BY THE CALLER. FR-020 (MUST) has the
 * exported picture lose the watermark when the screen loses it, and the row
 * that says whether it shows is kept out of the document -- so the shell asks
 * that question once and hands nothing rather than a mark. ⛔ NOT A DEFAULT
 * THIS UNIT CHOSE: a picture drawn with no watermark is what a caller that
 * holds no name can honestly ask for, and inventing one here would put a name
 * in a reader's exported file that nobody entered.
 */
export interface Watermark {
  /**
   * S-99a of table T-206 -- the name of the one who opened the document.
   *
   * ⛔ NOT THE AUTHOR'S -- FR-020's own RATIONALE says why: the trail is
   * worth having because it records who had the schedule on screen.
   * ⚠️ Where it comes from is FR-086's, not this unit's.
   */
  readonly openedBy: string
  /**
   * The moment, spelled as FR-020 (MUST) requires: ISO 8601 (the RFC 3339
   * form, `YYYY-MM-DDThh:mm:ssZ`), UTC, to the second.
   *
   * ⛔ SPELLED BY THE CALLER AND NOT HERE, and the string is drawn exactly
   * as it arrives: FR-020 forbids a local reading, and (MUST NOT) forbids
   * confusing this moment with MSPDI's zoneless local dates -- so there is
   * one speller for it and it is the side that read the clock.
   */
  readonly stampedAt: string
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
 * @provisional PND-1
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
 * ⭐⭐ 0.25 IS THE AUTHOR'S OWN NUMBER, and the ruling was given twice.
 * 利用者の裁定 2026-09-07（逐語「それでも両側1.5倍あれば十分」）was built as 1.5 on
 * EACH side. 利用者の裁定 2026-09-08, shown what each reading costs
 * （逐語「両側あわせて1.5倍でいけ」）: the DRAWN RANGE is one and a half windows
 * in total -- the window itself plus a quarter of it on either hand.
 * ⚠️ THE COST OF THE OTHER READING WAS MEASURED BEFORE THE RULING, on the
 * shipped build at 1000 `Task`, 1920x1080: 21.52 ms per frame at 1.5 a side
 * against 18.38 ms at 0.25 a side, median of three alternated runs.
 * ⭐ A quarter of a window still clears the assignee and the name by far more
 * than either can overhang.
 * ⛔ IT IS NOT A QUOTATION FROM docs/spec, and no row of it states a
 * margin -- sideways the band is NOT the whole of a Task's ink, because NL-3 of
 * table T-013 puts the name label outside the bar, GR-11 hangs the assignee off
 * it and the percent label sits beside it, so the bar's own rectangle is too
 * tight a test and how much to add was a ruling rather than a measurement.
 *
 * ⛔ NO SETTINGS ROW IS INVENTED FOR IT, and none may be. The value decides
 * nothing a reader can see: everything inside the window is drawn either way,
 * and a document that carried the number would let one machine's saved file
 * change how much another machine declines to write. ⛔ It is also NOT a
 * measurement of how far a label can overhang -- no row of docs/spec states
 * one -- so it is written here as what it is, a margin generous enough that
 * the question does not arise.
 *
 * ⚠️ WIDTH AND NOT A FIXED PX. `MC-6` of table T-025 is one screen and the
 * application is drawn on others; a margin tied to the area is the same margin
 * on all of them.
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
  // Two places. The grid is NS-3 of table T-231, which requires ONE rounding
  // rule on both sides of WY-3's comparison -- so the two halves of one
  // picture may not round differently.
  return (Math.round(value * 100) / 100).toString()
}

/**
 * WHAT ONE DRAWN FIGURE IS, written on the figure itself so that the same
 * figure can be recognised in the next frame's picture (DFC-316).
 *
 * ⭐ WHAT THE KEY IS BUILT FROM: the identifier the DOCUMENT gives the thing
 * (a `Task`'s UID, a `TaskGroup`'s id, a box's id, a day's serial) and the
 * name of the part being drawn -- never an index into an array. An index is
 * exactly the thing a delete moves, which is the defect this closes.
 *
 * ⛔ NOT `data-role`. That attribute carries a UI PART's settled name from
 * table T-103 (W-4 of table T-006a), and none of these figures is one; a key
 * written there would mint a second spelling of a settled word.
 *
 * ⚠️ IT IS NOT A DIFFING PROTOCOL, and no requirement is being invented here.
 * Nothing in this file, and nothing across `SvgSurface`, decides what to do
 * with a key -- the seam still hands over one whole string. What is added is
 * only the identity that a differ on the far side cannot recover once it is
 * lost, which is why it has to be written on the side that knows it.
 *
 * ⭐ ONE FIGURE MAY BE SEVERAL ELEMENTS, AND THEY ALL CARRY THE SAME KEY. A
 * line-form bar is a line, a head and however many dots; a marker is a disc
 * and its symbol. ⛔ They are NOT given an index apiece: the count varies with
 * the shape, so an index would move for the same reason a position does. What
 * the key answers is "which figure is this", and the run of elements that
 * share one key is that figure.
 *
 * ⚠️ IT COSTS BYTES, and the picture is serialised once a frame -- so nothing
 * else is written here: no size, no state and no colour, all of which are
 * already in the attributes beside it.
 *
 * ⛔ THE EXPORT CARRIES IT TOO, AND NO TEST HERE SUPPRESSES IT. Only the
 * screen re-renders, so only the screen has any use for a key -- but table
 * T-076 says which PARTS an export draws and nothing about which attributes a
 * figure carries, and FR-080 with WY-2 of table T-041 asks for one drawing
 * rather than two. Leaving it out of the export would be a rule this file
 * invented. ⚠️ Reported rather than decided: the keys put `Task` UIDs and
 * `TaskGroup` ids into a picture handed to a reader, which is a judgement
 * about what may leave the tool and belongs to whoever owns table T-076.
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
 * One opaque rectangle for the FR-009 bar-exclusion `<mask>`: black hides,
 * so this is the shape a dependency's halo must not be drawn across.
 *
 * ⭐ THE SAME `ScreenRect` `selectionParts` frames a few lines below --
 * `boxOfPoints(cornersOfBar(...))` -- and not a second notion of "the bar".
 *
 * @purity pure
 */
function barMaskRectSvg(box: ScreenRect, key: string): string {
  return (
    `<rect x="${rounded(box.x)}" y="${rounded(box.y)}"` +
    ` width="${rounded(box.width)}" height="${rounded(box.height)}" fill="black"` +
    // DFC-316: the mask's rectangles are rebuilt with everything else, so they
    // are named after the bar each one covers.
    `${figureKey(key)}/>`
  )
}

/**
 * The four corners of a rectangle CENTRED on one point.
 *
 * ⚠️ ITS ONE CALLER HANDS IT A MIDDLE IT WORKED OUT, never a day's edge:
 * `centreFromLeftEdge` turns FR-043's aligned point into the middle of the
 * mark. ⛔ Table T-023d anchors GR-9 / GR-17 / GR-18 at the day column's
 * LEFT EDGE (MUST) and forbids centring them, and the drawing and the hit
 * box share that edge.
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
 * ⭐ WHY A MAP AND NOT A SECOND DRAWING. FR-043 (MUST) asks the milestone
 * dummy's figure to be 「そのマイルストーンの実績の図形と同じ」, and the table
 * of the fifteen marks table T-012's `SH-5` prints lives inside
 * `schedule-geometry.ts` and is not exported. Writing the glyphs again here
 * would be a second spelling of `SH-5`, which is exactly what the row it is
 * copied from would then drift away from. ⇒ The figure is taken from the one
 * the geometry already made for this Task and moved onto the dummy's box.
 *
 * ⛔ THE BOX IS NOT NEGOTIATED HERE EITHER -- IT ARRIVES. `dummiesOf` builds
 * `DummyGeometry.ink`, and this only maps an outline onto it.
 *
 * ⭐ FR-043 (MUST) makes a milestone's dummy box a SQUARE; `dummiesOf`
 * builds it, so a circle glyph is not stretched into an ellipse here.
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
 * ⭐ FR-043's THIRD MILESTONE EXCEPTION (MUST): the dummy takes the
 * milestone's own actual figure, and MUST NOT be drawn as a rectangle.
 *
 * ⭐ WHERE THE FIGURE COMES FROM. A not-started Task has no actual bar at all
 * -- `dummiesOf` only emits a dummy while `actualX` is null -- so the actual
 * milestone figure is not on the geometry to copy. `TaskGeometry.milestoneFigure`
 * is the member that answers it: `barOf` builds a milestone's plan and actual
 * from the one `placed.milestoneGlyph` and only their side differs, so that
 * outline IS 「そのマイルストーンの実績の図形」 with nothing invented.
 *
 * ⛔ NO COLOUR IS DECIDED HERE. The caller hands the paint the ACTUAL bar
 * would have taken, which FR-013 and FR-041 (MUST NOT) already settle, and
 * the faintness is S-131 on the group around it. FR-043 spells the
 * milestone half of the same rule and forbids a new colour formula.
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
 * ⭐ EXPORTED FOR DFC-277: `ImageExporter` draws the `Panel Divider` boundary
 * line (EP-9) in the same colour the screen's own divider is painted in --
 * S-149, `PAINT.rule` in `dom-screen-surface.ts` (FR-029) -- and reading this
 * one function is how the two stay one decision instead of a second guess of
 * the colour standing beside it (5.3 / LR-2: through this file, the public
 * entry of the component that already carries table T-236).
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
 * ⭐ EXPORTED FOR DFC-363, AND THIS IS THE ONE PLACE. EP-9 of table T-076 says of
 * the `Panel Divider` boundary line 「描く側は、罫の太さを 1 か所から読むこと
 * （MUST）。番号を 2 か所に置いてはならない（MUST NOT）」 and 「画面と書き出しも
 * 同じ 1 か所を読むこと（MUST）」, because 「`Group Grid Lines`（`U-18`）と同じ線
 * を 1 本引くこと（MUST）」 and 「同じ線とは太さも同じであるということである
 * （MUST）」 —— ⛔ 「太さを 0 で描いてはならない（MUST NOT）」.
 *
 * ⭐ WHY IT LIVES HERE AND NOT IN A TABLE. The same EP-9 forbids a settings key
 * for the divider (「新しい確定名も新しい設定値のキーも作らない」), and no row of
 * tables T-202 / T-203 / T-236 gives the group grid line a width either -- S-68
 * is whether it is drawn and S-165 is its colour. So the number is the drawer's
 * own, and the drawer of U-18 is this file: `bandsAndRulesSvg` below takes it,
 * `screen-frame.ts` takes it for the divider's line rectangle, and
 * `dom-screen-surface.ts` / `image-exporter.ts` both size that one rectangle --
 * which is how the screen and the export read the same one place.
 *
 * ⛔ NOT A DOCUMENT SETTING AND MUST NOT BECOME ONE.
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
 * figures are not; PND-2 covers the same kind of gap.
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
 * ⭐ THE HOVER HALF OF THE SAME MUST: the marker darkens while the pointer
 * is on it, and the answer arrives as `svgFromSchedule`'s own `hovered` --
 * the hit the Framework already reads once per move (PI-7), because what is
 * wanted is not a position but WHICH ROW of table T-023d it fell on.
 * ⚠️ Being `pure` (table T-062) is no obstacle: an answer handed IN is an
 * argument like the others.
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
  // DFC-316: the disc and the symbol are ONE figure and carry one key. The
  // wrapping group carries it too, because in the PM-1a case that group is
  // what a differ finds first.
  const named = figureKey(key)
  // ⛔ THE STROKE IS `markerStroke` (S-24) FOR THE DISC AND FOR THE SYMBOL
  // ALIKE. FR-094 (MUST NOT) forbids this file holding a dimension of its
  // own, and S-24 is the only stroke width table T-201 keeps in the
  // 進捗マーカー group -- the same reading `resumeSvg` below takes for the
  // resume icon's arm.
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
 * FR-044's resume icon (MUST): drawn while the Task is suspended.
 *
 * ⭐ THE PATHS ARE READ, NOT REBUILT. LF-13 of table T-221 states the
 * figure, the arm at `resumeArmOfMarker` (S-26) and the head at
 * `resumeHeadOfMarker` (S-27), shrunk by `resumeScaleInvalid` (S-25) while
 * `resumeValid` is false -- and `resumeOf` has already solved all of it, so
 * S-25's other look arrives HERE as a smaller pair of paths and is not a
 * second condition on this side. ⚠️ `ResumeGeometry.valid` is therefore read
 * by nobody who draws: the size IS the difference, and no row of table T-236
 * holds a second colour or a strength for the invalid case, so inventing one
 * would be this file writing a settings row.
 *
 * ⭐ GR-8's HIT BOX IS CENTRED ON THIS INK. ItemHitArea takes S-22's box about
 * the centre of `[...arm, ...head]`'s bounding box, so drawing exactly those
 * two paths is what makes the picture and the grab agree. ⛔ S-22 is the only
 * box this icon has to answer to.
 * ⚠️ THE DRAWN SQUARE AND THE HIT SQUARE ARE DIFFERENT SIZES, and that is
 * the row's own MUST NOT (「図形の素の輪郭を当たり判定にしてはならない」): S-25
 * shrinks THIS drawing while `resumeValid` is false and leaves the box alone.
 *
 * ⚠️ THE ARM IS DASHED, at `resumeDashOn` (S-28) and `resumeDashOff`
 * (S-29); those two rows exist for no other figure, and LF-13's arm is the
 * part that runs from the marker's own bottom to the head.
 *
 * ⚠️ THE STROKE IS `markerStroke` (S-24), WHICH IS A JUDGEMENT. FR-094 (MUST
 * NOT) forbids this file holding a dimension of its own, and S-24 is the only
 * stroke width table T-201 keeps in the 進捗マーカー group the icon's own rows
 * (S-25 to S-29) sit in. ⛔ A number typed here would be exactly what that MUST
 * NOT refuses.
 *
 * ⭐ S-161 IS THE INK, the same the marker's symbol is drawn in: table T-236
 * holds 「進捗マーカーの文字色」 and no row of its own for this icon, and every
 * settings row the icon has lives in the marker's group.
 *
 * ⛔ THE TWO PATHS ARRIVE LOOSE, NOT AS `ResumeGeometry`. Table T-064's PI-5
 * names what ScheduleGeometry publishes and that type is not among them, so this
 * unit reads `Path` -- which the table does name -- and never the shape.
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
  // DFC-316: the arm and the head are ONE figure and carry one key.
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
 * ⭐ S-168 is the ink and S-169 the halo, both of table T-236.
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
  /** DFC-316: which label this is, kept from frame to frame. */
  key: string,
  /**
   * Which edge of the box the glyphs are pinned to.
   *
   * ⭐ AN ARGUMENT FOR THE SAME REASON `padLeft` IS ONE: the two callers answer
   * different sentences. ZO-5's name label runs from its left edge, and OC-2's
   * card (FR-090, MUST) has its RIGHT edge aligned -- 「札の右端を揃えて置く
   * こと（MUST）…… 左端は揃えない」. ⚠️ `padLeft` is the left inset and means
   * nothing at the far end, so an `end` caller passes 0.
   */
  anchor: 'start' | 'end' = 'start',
): string {
  const x = anchor === 'end' ? box.x + box.width : box.x + padLeft
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
    (anchor === 'end' ? ' text-anchor="end"' : '') +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
    ` paint-order="stroke" xml:space="preserve"${figureKey(key)}>${escaped(text)}</text>`
  )
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint, key: string): string {
  // DFC-316: one bar is one figure, however many elements its form takes.
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
 * ⭐ `yearMonth` IS ONE ROW, not two stacked, AND `month` IS A SECOND ONE.
 * Table T-238 of FR-017 gives `TM-3` and `TM-4` a first line of `yyyy-mm` --
 * that is `yearMonth`, one 段 -- and gives `TM-2` two lines, `yyyy` then `m`,
 * which are `year` and `month` standing apart. `year` also carries `TM-1`,
 * the one step that shows no month at all.
 */
type RulerRow = 'year' | 'yearMonth' | 'month' | 'week' | 'day' | 'weekday'

/**
 * The rows below are table T-238 of FR-017 (MUST) read straight down, one
 * 段 per line; that table's 「刷らない」 is an ABSENT row, not an empty one.
 *
 * ⛔ THE FOLD IS NOT AT EVERY STEP THAT SHOWS BOTH. `TM-2` prints `yyyy`
 * and `m` in two 段; `TM-3` and `TM-4` share one, because the band's height
 * MUST NOT move with the step and the finest step already stands in three.
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
 * T-221) -- FR-017 (MUST NOT) forbids thinning any row, so the year, the
 * year-and-month, the month and the week rows walk their own calendar unit and
 * stop at the band's right edge. ⭐ `month` TICKS WITH `yearMonth` AND IS NOT A
 * NEW INTERVAL: LF-1 gives 「年と月の段は 1 か月」, and T-238's `TM-2` is that
 * same step with the pair printed on two lines instead of one, so the two rows
 * are one calendar walk shown twice. ⚠️ The stride is anchored on the day serial rather than on
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
 * FR-017's band, drawn. The band `regions.timeRuler` reserves is S-2 tall
 * and is where the year-and-month, week, day and weekday rows go; EP-2 of
 * table T-076 makes the Time Ruler a MUST for the export too.
 *
 * ⭐ The grain is `layout.tier`, which is what `rulerTierOf` already answered
 * for this frame, and the thinning is `tickStrideOf`. Neither is worked out a
 * second time here: FR-017 fixes one test and one arithmetic, and a copy of
 * either would part company with the layout the bars were placed by.
 *
 * ⭐ WHAT EACH ROW PRINTS IS A TABLE, AND THE TABLE IS T-238. FR-017 (MUST,
 * 利用者の裁定 2026-09-03) has every step print that table's lines and ⛔ (MUST
 * NOT) print any line the table does not hold. `ROWS_OF_TIER` above is that
 * table's shape and the label below is its contents. ⛔ The month is DIGITS
 * and never a word, so that S-83 can be one value in both languages.
 * ⛔ The weekday is the only language-dependent thing in the
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
  // ⭐ HOW A TIER WITH FEWER THAN THREE ROWS SPENDS THAT HEIGHT IS STATED.
  // FR-017 (MUST) says 「段が 3 つに満たない段階では、帯の高さを段の数で等分
  // すること」 and ⛔ (MUST NOT) forbids pushing the remainder anywhere, so the
  // division below is the requirement itself rather than a reading of it.
  // ⚠️ THE NOTE THAT STOOD HERE SAID IT WAS 「NOWHERE STATED」 and reasoned an
  // equal share out as the choice that invents no number. The conclusion was
  // right and the premise is now wrong. ⚠️ Three tiers stand in fewer than
  // three rows after T-238: `year` in one, `yearMonth` in two (`yyyy` over
  // `m`) and `yearMonthWeek` in two.
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
      // ⭐ DFC-316: the ruler's own figures are named by the ROW of the tier and
      // by the DAY a tick stands on, never by their number in the walk -- a
      // sideways scroll drops ticks off one end and adds them at the other,
      // which is exactly the move that renumbers every one of them.
      ` fill="${ground}"${figureKey('ruler-ground')}/>`,
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
          ` stroke="${rule}" stroke-width="1"${figureKey(`ruler-${row}-rule`)}/>`,
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
            ` stroke="${rule}" stroke-width="1"` +
            `${figureKey(`ruler-${row}-tick-${serialOf(day)}`)}/>`,
        )
      }
      // Table T-238 (MUST), column by column: `yyyy-mm` for the year-and-month
      // row, `yyyy` for the year row, `m` for the month row, `d` for the week
      // row (the number of the day its week begins on) and for the day row,
      // and the weekday for the weekday row. ⛔ THE MONTH AND THE DAY ARE NOT
      // PADDED: T-238 writes them `m` and `d`, one letter each, against the
      // `yyyy-mm` it writes out in full. ⚠️ The weekday is looked up by
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
            : row === 'month'
              ? String(day.month)
              : row === 'weekday'
                ? (weekdayWords[weekdayOf(day)] ?? '')
                : String(day.day)
      // ⭐ THE WEEKDAY ROW MAY PRINT SMALLER, AND ONLY IT. T-238 (MAY) lets
      // `TM-4`'s third line stand below the other lines of its own step, and
      // (MUST) puts the ratio in S-219 of table T-206 -- which is why the
      // number arrives from the generated block rather than being written
      // here. ⛔ The family is untouched (T-238's MUST NOT, on FR-039): the
      // reader's own letters stay, and the size alone moves. ⚠️ WHY IT IS
      // TAKEN UP: the English weekday is what fixes the width of the day step
      // -- S-85's derivation in table T-205 is bound by that very label -- and
      // at the step's own threshold `Mon` measures wider than the day column
      // it has to sit in.
      // ⚠️ The baseline does NOT move with it. S-179 and S-136 place the
      // baseline from `rulerFont` and the row's top, and T-238 gives the ratio
      // to the SIZE and to nothing else; a second offset here would be a
      // number with no row behind it.
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
 * ⛔ NOT kebab-case, and W-4 of table T-006a is the row that says so: its own
 * proviso sends a `data-role` that carries a UI PART's settled name to W-6's
 * form, 「表 T-103 の名をそのまま書く」, because translating it would mint a
 * second spelling of one thing.
 * ⚠️ IT CHANGES NO HIT TEST, measured against `readScreenPartAt`: that walk
 * stops at DomScreenSurface's own root and answers `null` for any point this
 * layer's markup is under, so a mark here cannot be mistaken for a part a
 * person can press. The attribute is what makes the layer nameable from
 * outside -- which is how DFC-195 was measured in the first place.
 */
const WATERMARK_ROLE = 'Watermark'

/**
 * FR-020's layer: the opener's name and the run's UTC stamp, laid diagonally,
 * repeatedly and faintly over the `Row Area` (U-50) and nowhere else.
 *
 * ⭐ WHAT EACH OF THE FIVE VALUES MULTIPLIES, WHICH IS THE WHOLE OF THE
 * ARITHMETIC HERE. S-220 is a number of degrees and goes into the rotation as
 * written. S-221 is a fraction 「掛ける相手は書き出す絵の幅（`S-81`）」 and S-222
 * is a multiple 「掛ける相手は透かしの文字の高さ」 whose spacing is 「縦横とも
 * 同じ」 -- so the size is a share of THE PICTURE BEING DRAWN and the step is
 * that size again, on both axes.
 * ⭐ WHY THE PICTURE'S OWN WIDTH AND NOT THE LITERAL 1600. FR-080 (MUST) draws
 * an export by taking THIS PICTURE and scaling it by `S-81`'s width over the
 * screen's, so a mark that is S-221 of the width here is S-221 of `S-81`'s
 * width once the export has scaled it -- which is what S-221's own note asks
 * for on both counts at once (the row it names, and 「画面の大きさが変わっても
 * 割合が保たれる」). ⛔ A constant 1600 here would hold the first half and break
 * the second: it would be 8% of the picture at one screen width only.
 *
 * ⭐ THE OPACITY IS ON THE GROUP AND NOT ON EACH MARK, and that is a
 * consequence of S-102 rather than a flourish. A group is composited once, so
 * marks that overlap stay at S-102 instead of adding up to a patch darker than
 * any row states -- and FR-020 (MUST) asks for a mark that is only just
 * distinguishable and (MUST NOT) forbids one dark enough to read.
 *
 * ⚠️ THE GRID IS SQUARE AND CENTRED, AND ITS REACH IS THE HALF-DIAGONAL. The
 * marks are tiled in the ROTATED frame, so a grid the size of the Row Area
 * would leave the corners bare once it turned; half the diagonal is the least
 * radius that still covers the rectangle at every angle S-220 admits (-90..90).
 * ⛔ The clip is what keeps FR-020's 「`Row Area` の外へ重ねてはならない」 --
 * the covering grid deliberately runs outside and is cut back to the rectangle.
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
  // FR-020 (MUST) lays both, in the order the requirement names them.
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
 * ⭐ Every coordinate arrives already computed: ADR-001 has the shell run
 * table T-068 once per frame and hand the result to everyone who needs it, so
 * this unit measures nothing of its own.
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
 * that position is a current value the document does not hold, and it
 * arrives the same way the others do (LY-5 of table T-060 leaves current
 * values with the Framework). ⛔ IT IS NOT `follow.x`:
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
 * this unit holds no `PointerSlop` (table T-206 keeps S-90 .. S-92 and S-137 out
 * of the document, so they reach the hit test as an argument and never as a
 * constant).
 * ⚠️ IT IS THE HIT AND NOT A BOOLEAN: the marker and the dummies of ONE Task
 * darken, so both the row and the thing it claimed have to arrive.
 *
 * ⭐ `watermark` IS FR-020's TRAIL, or `null` for a picture that carries none.
 * ⛔ IT IS NOT SPENT THROUGH `drawsOperationState`, and that is the one thing
 * that sets it apart from the four arguments above it: EP-7 of table T-076 puts
 * the layer in the EXPORT as well as on the screen, and FR-020 (MUST) ties the
 * two together in the other direction as well -- 「画面から透かしを消したときは、
 * 書き出す絵からも消すこと」. So both pictures ask the same question of the same
 * value, and the answer travels rather than being decided here.
 * ⚠️ WHICH IS ALSO WHY WY-2 AND WY-3 OF TABLE T-041 SET THIS LAYER ASIDE: both
 * halves of it change 「実行のたび・機ごとに」, so the two pictures they compare
 * can only be compared without it.
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
   * ⛔ IT MAY NOT BE LEFT TO THE CALLER. `frame-loop.ts` does hand the
   * export an empty `Selection` and no following side, but a picture that
   * has been TOLD it is the export states the rule itself.
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
   * FR-013's other half (MUST) -- the Task whose faint marks the hand is on,
   * and which of the two kinds it is on.
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
   * ⛔ WHY THE DUMMIES ARE NOT ASKED THROUGH `handOn`. The reading is the
   * requirement's own: 「乗っている」 is a question about a DRAWN FIGURE, and
   * HF-6 is the 作法 FR-013 points at. ⚠️ THE ORDER IS NOT DISTURBED HERE and
   * must not be: which row a PRESS goes to is table T-023d's, and MK-9a scopes
   * its 優先順位 to 「掴む対象が重なった」. This decides only what is drawn.
   * ⛔ THE CODE IS NOT MADE TO FOLLOW THE PRIORITY ORDER: no clause asks the
   * drawing to, so the reading stands on FR-013's own 「乗っている」 and not
   * on which row of table T-023d a press would go to. @provisional PND-360
   *
   * ⚠️ The marker is still asked through `handOn`, which is the other
   * reading and is left as it stands for the same reason.
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
  // FR-098 (MUST NOT) reaches every figure a Task draws, not only its row's
  // ground --
  // so each of the five arrays above (which the loop below fills, in document
  // order, for EVERY Task regardless of which row it stands on) gets a twin
  // that catches a PINNED Task's fragments instead. ⛔ The twins are drawn
  // UNCLIPPED, because a pinned Task's own row already stands inside the band
  // (LF-14) -- only the ones left in the plain arrays are wrapped in the
  // clip-path minted below, and only when something is actually pinned.
  const planPartsPinned: string[] = []
  const guidePartsPinned: string[] = []
  const actualPartsPinned: string[] = []
  const markerPartsPinned: string[] = []
  const labelPartsPinned: string[] = []
  // GD-6's arrowhead is table T-020a's ZO-4, drawn per dependency in the loop
  // below the task loop -- and a dependency between two rows is exactly as
  // capable of crossing into the band as a bar is, so it gets the same split.
  const depLinkParts: string[] = []
  const depLinkPartsPinned: string[] = []
  // FR-009 (MUST NOT, ruling 2026-09-06): the crossing halo must not paint
  // over a bar. Collected here, alongside every plan/actual bar the task loop
  // below already draws, and turned into a <mask> once the loop is done --
  // no separate pass over the Tasks and no per-crossing search, only the same
  // rectangles `selectionParts` already reads off `cornersOfBar`.
  const barMaskParts: string[] = []
  // ⛔ TABLE T-020 HAS NO ROW FOR AN ANNOTATION, so where a comment box sits
  // among the six is decided here rather than read. It goes OVER ZO-5's name
  // labels: NFR-007 makes 4.5:1 a MUST for the comment box's own text, and a
  // label painted across the body would put unmeasured ink on the ground that
  // MUST is met against. The same reading `handleParts` and the ruler take.
  // @provisional PND-238
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
  // never has to hold both. @provisional PND-209
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
  // ⛔ FR-098 (MUST NOT). A row
  // that flows is cut at the top of the SCROLLING REMAINDER, which LF-14 puts
  // one `rowGap` below the pinned band, while a banded row is cut at the `Row
  // Area`'s own top edge -- the band stands there and is the one thing allowed
  // to. ⚠️ `scrollAreaY` is optional and reads as the area's top where no row is
  // pinned, which is the one ceiling every row had before a band existed.
  const scrollTop = layout.scrollAreaY ?? area.y
  // DFC-170: which rows are pinned, so a Task's figures (not only its row's
  // ground, cut per-row just below) can be asked the same question. Keyed by
  // `groupId` because that is what `TaskPlacement` (`placedOf` above) carries
  // and `RowPlacement.groupId` is the same identifier.
  // ⛔ NOT GATED ON `scrollAreaY` ALONE. `pinnedBandOf` in schedule-layout.ts
  // hands back a number there whether or not any row is pinned (S-127's band
  // is simply zero rows tall), so a document with nothing pinned would still
  // read a defined `scrollAreaY` -- and clipping on that alone would wrap
  // every document's figures in a no-op clip-path, changing the bytes
  // `npm run parity` compares even where nothing moved.
  const pinnedGroupIds = new Set(
    layout.rows.filter((row) => row.isPinned === true).map((row) => row.groupId),
  )
  const hasPinnedRows = pinnedGroupIds.size > 0
  /**
   * The vertical stretch a figure has to reach before it is worth drawing at
   * all.
   *
   * ⭐⭐ WHY. Every frame serialises the picture to a string and re-parses
   * it (`DomSvgSurface`, UF-49), so a shape that cannot reach a pixel is
   * still built, escaped, written, parsed, laid out and thrown away again on
   * the next wheel notch -- and on a large document most of the picture is
   * such a shape.
   *
   * ⛔ THIS IS NOT `FR-018`. The detail tier drops ROWS from the layout and is
   * decided in `schedule-layout.ts`; this drops nothing from the layout, from
   * the hit test or from any answer -- it only declines to WRITE a figure that
   * the canvas cannot show. The picture is the same picture.
   *
   * ⛔ ONLY THE SCREEN'S OWN PICTURE. `picture === 'export'` draws the whole
   * schedule and its canvas IS the content, so an export keeps every shape and
   * its bytes are untouched. WY-2 of table T-041 compares two exports, and
   * neither is culled.
   *
   * ⭐ THE MARGIN IS THE `Row Area`'S OWN HEIGHT, and no number is invented
   * here: a row's figures stand in that row's band (`FR-042`), and the label,
   * the marker and the fade handles are all placed down that same band, so
   * nothing of one row overshoots it by a whole screen. A row taller than the
   * area is never dropped -- its band crosses the window by definition.
   *
   * ⭐⭐ AND THE SAME QUESTION SIDEWAYS, which is where most of the waste
   * is: a row that IS drawn can still hold a bar the time axis has carried
   * off the screen. ⛔ Judging a Task by its row alone is judging one axis
   * of a two-axis picture.
   *
   * ⛔ THE HORIZONTAL MARGIN IS NOT THE AREA'S OWN WIDTH. Sideways a figure
   * really does overshoot its bar -- see `OFF_SCREEN_SIDE_MARGIN`, which
   * carries the author's number and the reason it is not a settings row.
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
    // DFC-316: the row's own identifier, never its position -- a delete above
    // this row moves the position and leaves the row the same row.
    const rowKey = `row-${row.groupId}`
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(area.width)}" height="${rounded(bottom - top)}"` +
        ` fill="${monochrome ? achromatic(band) : band}"${figureKey(`${rowKey}-band`)}/>`,
    )
    // S-68 is whether the group grid line is drawn at all; S-165 is its
    // colour. FR-042's RATIONALE makes the line itself a MUST -- one row is
    // one target, and an invisible boundary leaves that unreadable.
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}"` +
        // ⛔ THE NUMBER IS NOT WRITTEN HERE (DFC-363). EP-9 of table T-076 asks
        // for one place and forbids two, and the divider's line takes the very
        // same constant through `screen-frame.ts`.
        ` stroke-width="${rounded(GROUP_GRID_LINE_WIDTH_PX)}"${figureKey(`${rowKey}-rule`)}/>`,
    )
  }

  // FR-089 -- the date grid lines.
  //
  // ⭐ THE INTERVAL IS NOT WORKED OUT HERE. FR-089 (MUST) ties it to the step
  // FR-017 settled, and `tickStrideOf` is that value, already read above for
  // the ruler -- so the lines stand exactly where the finest row of the band
  // ticks, which is the whole of what FR-089 asks.
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
  // @provisional PND-315
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
            // DFC-316: the DAY, not the tick's number in the run -- scrolling
            // sideways drops ticks off one end and adds them at the other.
            `${figureKey(`date-grid-${serialOf(day)}`)}/>`,
        )
      }
    }
  }

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    // DFC-170: which bucket this Task's figures go into. `placedOf` maps a
    // `taskUid` to its `TaskPlacement`, which carries the `groupId` of the
    // row it stands on -- the same identifier `pinnedGroupIds` above was
    // built from. ⚠️ Read once here and reused below (at the label and the
    // outside-label loop) rather than a second lookup of the same map.
    const placed = placedOf.get(task.taskUid)
    const isPinnedTask = placed !== undefined && pinnedGroupIds.has(placed.groupId)
    // The cull `skipsOffScreen` above states, asked of this Task's own band.
    // ⚠️ `TaskPlacement.y`/`height` are what the row's stacking reserved for
    // it, so this is the stretch every figure below is placed within.
    // ⛔ A Task with no placement is never dropped: `placedOf` is the only
    // answer to where it stands, and without one there is nothing to ask.
    // ⭐ AND THE SIDEWAYS HALF, asked of the WIDER of this Task's two shapes --
    // a Task is worth writing when EITHER the plan or the actual reaches the
    // range (author's ruling, 2026-09-07). `TaskPlacement` already carries
    // both spans in drawn px -- `x`/`width` is the plan shape as it is painted
    // (a milestone centred on its day, a short bar floored to `minShapeWidth`)
    // and `actualX`/`actualWidth` the actual -- so nothing is re-derived here
    // and no date is read.
    // ⛔ `actualX` IS NULLABLE AND MEANS THE TASK HAS NO ACTUAL YET, not zero:
    // taken as a number it would drag the left edge to the day the axis starts
    // at and the test would never fire.
    // ⚠️ ONE `continue` FOR BOTH AXES, because they are one question -- which
    // range this frame has to compute -- and a Task outside on either axis is
    // outside.
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
    // DFC-316: the stem every figure of this Task is named from. `taskUid` is
    // the document's own identifier for it (MSPDI's UID, table T-058), so it
    // survives a delete anywhere else in the schedule.
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
      // FR-009's bar-exclusion mask, the plan half. Same rectangle SL-8's
      // selection frame reads a few lines below (`boxOfPoints` over
      // `cornersOfBar`) -- no shape of its own is minted here either.
      const planBarBox = boxOfPoints(cornersOfBar(task.plan))
      if (planBarBox !== null) {
        barMaskParts.push(barMaskRectSvg(planBarBox, `${taskKey}-plan-mask`))
      }
    }
    for (const guide of task.guides) {
      // S-105: the guide takes the ACTUAL bar's colour, because it is the line
      // that leaves the actual bar. ⛔ No key of its own -- FR-041 forbids
      // storing a derived colour, and a second constant would be one.
      ;(isPinnedTask ? guidePartsPinned : guideParts).push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${actual.stroke}"` +
          ` stroke-width="${rounded(settings.planActualGuideWeight)}"` +
          ` stroke-dasharray="${rounded(settings.planActualGuidePattern.on)}` +
          // ⚠️ DFC-316: BOTH guides of one Task carry the one key. A guide is
          // the line that leaves the actual bar (S-105) and there are at most
          // two of them, so which is which is the run's own order -- an index
          // would say more than the geometry does.
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
    // FR-043 (MUST): ONE faint mark on a Task not started, whether it holds
    // two grab targets (GR-9 / GR-17) or one (GR-18 on a milestone).
    // ⛔ EP-14 of table T-076 keeps it out of the exported picture, and this
    // is the only place that can obey it -- the geometry may NOT be stripped
    // instead, because GR-7 hangs the not-started progress marker off GR-17
    // and dropping that dummy would take EP-5's marker with it (WY-3 of table
    // T-041 measures it), and table T-023d still keeps GR-17 as a grab
    // target (only the drawn ink was ever two).
    // ⭐ WHAT THE ONE MARK IS SHAPED LIKE IS SETTLED:
    // FR-043's milestone exception covers the figure, the colour and the box,
    // so a milestone's dummy is its own actual figure in a square and never a
    // rectangle. `dummyFigure` below is where the figure is chosen, and
    // `dummiesOf` builds that square, so nothing is reshaped here.
    if (picture === 'screen' && task.dummies.length > 0) {
      // ⭐ `actual` is the paint the actual bar would have taken: FR-013 has
      // the dummy inherit the actual bar's colour and FR-041 (MUST NOT) forbids
      // storing a derived one, so there is no second formula and no key here.
      // ⭐⭐ THE RECTANGLE IS READ, NOT WORKED OUT. FR-043's width and its
      // left-edge alignment are both solved once, in `dummiesOf`, onto
      // `DummyGeometry.ink` -- and they have to be, because table T-023d's
      // closing rule (MUST) hands the drawn mark's own pixels to GR-17 and
      // `item-hit-area.ts` must test the very rectangle this draws.
      // ⛔ `ink` IS THE HIT WIDTH AS WELL, which is what S-180's own note
      // says, so `item-hit-area.ts` has no width of its own to keep in step.
      // ⭐ THE ONE MARK STANDS ON GR-9'S DAY (== GR-18's, table T-023d),
      // never GR-17's -- which is why the rectangle is the same on every
      // dummy of one Task and this need not choose between them.
      const ink = task.dummies[0]!.ink
      // ⭐ THE FIGURE, WHICH IS THE ONLY THING FR-043's THIRD MILESTONE
      // EXCEPTION MOVED. `dummyFigure` answers the rectangle for every shape
      // but a milestone, and the milestone's own glyph for one -- carried on
      // `TaskGeometry.milestoneFigure`, which the geometry builds whether or
      // not either bar is drawn (DFC-407), never minted here.
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
      // FR-013 (MUST): the dummy is drawn faint and darkens while the pointer
      // is on it. ⭐ WHAT 「濃く」 IS: the mark drawn with no faintness on it at
      // all. ⛔ No settings row carries a second degree -- S-131 is THE value
      // -- so darkening is the taking away of that one attribute rather than a
      // number invented here. ⚠️ HF-6's precedent reads the same way: the row
      // control is hidden and then simply drawn, never drawn twice at two
      // strengths.
      // ⭐ ONE MARK, TWO GRAB TARGETS. FR-043 keeps GR-9 and GR-17 (or GR-18)
      // as separate things a hand can be on even though only one mark is
      // drawn for them, so the group's own opacity darkens together for
      // either -- there is no per-target strength to invent, and the hand is
      // on one of a Task's dummies or on none. @provisional PND-351
      // ⛔ ASKED OF THE FIGURE AND NOT OF THE ROW THAT WON -- `handInside`'s
      // note carries why. @provisional PND-360
      // ⭐⭐ AND THE RECTANGLE IS THE GRAB BAND TOO (MUST), which is the
      // closing rule of table T-023d, so the darkening cannot part company
      // with the grab.
      // ⛔⛔ TESTED ON THE INK'S OWN CENTRE, NOT ON `at` PLUS HALF A WIDTH: a
      // milestone's dummy is a SQUARE CENTRED ON ITS DAY (FR-043), so its
      // `ink.x` is half a side LEFT of `at`. ⭐ The very centre `dummyFigure`
      // was drawn about is read instead, so the two cannot differ.
      // ⚠️ One rectangle, so one test: every dummy of one Task carries the
      // same `ink`, because the mark is drawn once.
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
      // A Task neither half of which was drawn (S-227 planVisible and S-228
      // actualVisible both false, which those two rows allow) has no extent,
      // and a frame around nothing would sit at the origin.
      if (box !== null) {
        selectionParts.push(selectionFrameSvg(box, themed('S-151'), `${taskKey}-frame`))
      }

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
            // ⚠️ DFC-316: the three grab points of one Task share its key, for
            // the reason the guides do -- FD-5 decides how many there are, so
            // a number here would move when the shape does.
            ` stroke-width="${rounded(settings.fadeHandleStrokePx)}"` +
            `${figureKey(`${taskKey}-fade-handle`)}/>`,
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
      // PM-1a was never faint for this to undo. @provisional PND-351
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
      // FR-044 (MUST). ⭐ NESTED INSIDE THE MARKER'S OWN TEST RATHER THAN
      // GIVEN A SECOND ONE. S-63 is ONE switch for both figures (table
      // T-038's closing paragraph), and `resumeOf` only builds an icon where
      // a marker was built, so a second reading of `progressMarkerVisible`
      // here would be the same condition in two places.
      // ⛔ NOT PLACED BY TABLE T-038's ORDER: its closing text takes OC-4 out
      // of that order outright and sends the place to LF-11 of table T-221
      // (MUST). `resumeOf` already puts the arm on that day, and this side
      // only paints the points it was handed -- the push below is a paint
      // order within one list, not a placement.
      // ⛔ NOT FAINT AND NOT DARKENED BY THE HAND. FR-013's MUST names the
      // not-started marker and FR-043's dummies, and PM-1a never holds on a
      // suspended Task -- so there is no strength for this figure to carry.
      // ⛔ NO SHAPE TEST HERE, AND THAT IS NOT AN OVERSIGHT. LF-11 of table
      // T-221 (MUST NOT) keeps the icon off a milestone, and 置く is the
      // geometry's word -- `schedule-geometry.ts` leaves `resume` null for a
      // milestone, so this side paints the points it was handed and asks
      // nothing about the shape. ⛔ A second reading of `shapeKind` here would
      // be the same condition in two places.
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
    // OC-2 of table T-038: ONE card carrying the assignee (FR-059, with AS-2 of
    // table T-225 for the Task nobody is on) and the percent (FR-090), jutting
    // out past the left of the bar where `outsideLabelBoxOf` placed it.
    //
    // ⭐⭐ ONE `<text>`, NOT TWO (FR-090, MUST, 利用者の裁定 2026-09-08): 「2 枚
    // の札ではなく 1 枚の札として描くこと（MUST）。2 枚を別々に置いてはならない
    // （MUST NOT）」. ⛔ THIS LOOP DREW TWO UNTIL THAT RULING LANDED, each at the
    // left edge of its own FR-093 estimate -- and an estimate that under-reads
    // its glyphs spills into its neighbour: measured 2026-09-08 on the shipped
    // build, all 40 drawn Tasks overlapped by 3.089 to 13.971px and read as
    // 「70%佐藤」. One string cannot collide with itself.
    //
    // ⭐ ANCHORED AT ITS RIGHT EDGE, which is FR-090's own sentence: 「予定バー
    // の左端から `_assets/tbl-settings.md` の `S-32` だけ左へ離した位置に、札の
    // 右端を揃えて置くこと（MUST）…… 左端は揃えない」.
    // ⛔ THAT IS ALSO WHAT MAKES THE ESTIMATE SAFE: FR-093
    // forbids measuring the glyphs, so the box is only ever an estimate, and
    // anchoring the END sends the error LEFTWARD -- away from the bar, into the
    // direction OC-2 already reserves -- instead of across the `labelGap`.
    //
    // ⛔ S-60 AND S-61 ARE NOT READ HERE. FR-049 (MUST) adds table T-202's
    // switches to the state condition of every requirement that draws the
    // element, and LC-7 is where that was spent -- OC-2's own MUST NOT keeps a
    // hidden label out of the occupied width, so the layout has to know. A
    // hidden card reaches here as a null box, and a second test would be the
    // same condition in two places.
    // ⭐ THE SAME INK AND THE SAME HALO AS ZO-5. S-168 is 「ラベルの文字色」 and
    // S-169 its outline; table T-236 holds no other pair for a label, and
    // inventing one would be this file writing a settings row.
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
          // DFC-316: one figure, one key -- and the key names the ROW of table
          // T-038 rather than one of the two readings inside the card, because
          // there is no longer a figure per reading to tell apart.
          `${taskKey}-oc2-label`,
          'end',
        ),
      )
    }
  }

  // ⛔ S-159 AND S-160 ARE TWO DIFFERENT COLOURS, and neither follows the
  // theme (FR-041, MUST NOT).
  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const arrowId = `grs-dependency-arrow-${pictureId(
    `${rounded(width)}x${rounded(height)}|${geometry.tasks.length}` +
      `|${geometry.dependencies.length}|${selected.size}|${schedule.project.title ?? ''}`,
  )}`
  // FR-009's bar-exclusion mask (MUST NOT paint the crossing halo over a
  // bar). One id per picture, the same way `arrowId` is minted -- reused by
  // every halo polyline the loop below draws, never rebuilt per link.
  const dependencyHaloMaskId = `grs-dependency-halo-mask-${pictureId(
    `${rounded(width)}x${rounded(height)}|${barMaskParts.length}`,
  )}`
  const defsParts: string[] = []

  // ⛔⛔ FR-098 (MUST NOT) reaches a Task's bar, label, marker and
  // dependency line, not only the row's
  // own ground -- `bandParts` above already cuts the ground per row, but the
  // task loop draws every Task's figures into ONE array apiece, so the cut
  // there has to be a single clip-path rather than a per-row top/bottom pair.
  // ⭐ THE SAME RECTANGLE `S-78` ALREADY POINTS AT: `x = area.x`, `y = scrollTop`
  // (the scrolling remainder's own top, computed above for the band loop),
  // `width = area.width`, `height = areaBottom - scrollTop`. ⛔ No new value is
  // minted here -- table T-203's `S-78` already names this rectangle's top.
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

  // ⛔ GD-6 of table T-020a (MUST) asks for the head here and NOT on the
  // guide above.
  // ⭐⭐ ONE HEAD, MINTED ONCE -- AND NOT BY COUNTING defsParts. ⛔ The list
  // is shared: nothing may read its length to mean 'nobody has written
  // anything yet' -- ask about the thing itself.
  // FR-009 (MUST) puts a selected dependency line in front, and orders the
  // rest by the order they were created in. `geometry.dependencies` is
  // ALREADY back-to-front by that second half: it is built by walking
  // `schedule.tasks` and each Task's own `dependencies` in document order
  // (RC-6), so nothing here re-derives "created order" -- a stable sort on
  // "is it selected" alone moves the selected lines to the front while
  // leaving every tie in that same order.
  // ⛔ `Array.prototype.sort` is stable (ES2019+), which the second half
  // depends on.
  const orderedDependencies = [...geometry.dependencies].sort((a, b) => {
    const aFront = selectedLinks.has(`${a.predecessorUid}>${a.successorUid}`) ? 1 : 0
    const bFront = selectedLinks.has(`${b.predecessorUid}>${b.successorUid}`) ? 1 : 0
    return aFront - bFront
  })
  // S-224 (table T-206) is a multiplier on the line's OWN thickness (S-18),
  // not on whatever `selectedLineWidth` below thickens it to for SL-8 -- the
  // row's own note names `dependencyWidth` by row ID, not the selected width.
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
    // The cull `skipsOffScreen` above states, asked of the routed line itself.
    // ⭐ EXACT, unlike the Task's: a polyline never leaves the box its own
    // points make, so a line whose every vertex is off one edge paints nothing
    // between them either. ⛔ IT IS NOT ASKED OF THE TWO ENDS' ROWS -- a line
    // between two Tasks a screen apart crosses the window while neither end is
    // in it, and RT-4a already refuses to drop a line for a row that is not
    // drawn.
    // ⚠️ AFTER the head is minted, so the `<marker>` GD-6 asks for is written
    // exactly when it was before this change.
    // ⭐ BOTH AXES, and the sideways one for the same reason the up-and-down
    // one is not asked of the two ends' rows: a line between two Tasks a screen
    // apart CROSSES the window with neither end in it, so the test is the
    // polyline's own rectangle and never its endpoints'.
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
    // SL-8 (MUST NOT): a selected dependency is NOT framed. It is the same
    // polyline at S-178 times `dependencyWidth`.
    const linkWidth = selectedLineWidth(
      settings.dependencyWidth,
      selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
    )
    // DFC-170: a dependency line is pinned only when BOTH ends are -- one drawn
    // between a pinned Task and a scrolling one still has a scrolling end,
    // which can carry it above `scrollTop` exactly the way a bar can, so it
    // needs the clip. `points` already carries each end's CURRENT position
    // (the band's shift for a pinned Task, the scroll offset for the other),
    // so clipping the polyline as one piece only trims the stretch that has
    // scrolled into the band -- it does not have to be cut at the join.
    // @provisional PND-416 -- an endpoint clipped clear off the top is NOT
    // treated as RT-4a's 「描かれていない」, so the line stays and is cut.
    // ⛔ No row decides that yet: RT-4a drops a line whose endpoint is not
    // drawn and RT-6 keeps one whose endpoint is pinned, and a row cut away
    // by the scroll is neither. Dropping it would make dependencies blink in
    // and out on a small scroll, so the line is kept.
    const predecessorPlaced = placedOf.get(link.predecessorUid)
    const successorPlaced = placedOf.get(link.successorUid)
    const predecessorPinned =
      predecessorPlaced !== undefined && pinnedGroupIds.has(predecessorPlaced.groupId)
    const successorPinned =
      successorPlaced !== undefined && pinnedGroupIds.has(successorPlaced.groupId)
    // FR-009's halo, drawn INTO THE SAME ARRAY AND RIGHT BEFORE the main
    // line, never a separate pass: `orderedDependencies` is already
    // back-to-front, so a later link's halo lands on top of every earlier
    // link's main stroke (reading it as the one behind), and its own main
    // stroke -- pushed immediately after -- restores this line's own ink
    // on top of its own halo. ⛔ NOT drawn full length unconditionally onto
    // the bar: the shared `mask` (built once, above) is what keeps it off
    // table T-206's `S-224` clear of the bar rather than any per-crossing
    // region computed here.
    const points = pointsOf(link.points)
    const haloMask = barMaskParts.length > 0 ? ` mask="url(#${dependencyHaloMaskId})"` : ''
    // DFC-316: a dependency IS its two ends, so the two UIDs are its name --
    // and the halo and the line under it are one figure and share it.
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
        // ⚠️ DFC-316: one per picture, so the name of the thing is the key.
        `${figureKey('progress-line')}/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    // CU-1's line. S-163 is its colour, and it names no hue of its own.
    // ⛔ SL-8 (MUST NOT): a selected status line is NOT framed either -- its
    // bounding rectangle runs the height of the Row Area and would strike
    // through everything behind it. It is drawn at S-178 times its own width.
    // ⛔ THAT OWN WIDTH IS THE TYPED 1, and it is in no row -- left as it
    // stands rather than made to look like a value the specification holds.
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
    // @provisional PND-312
    const colour = themed('S-195')
    // DC-1: the following side is drawn at the day under the pointer, which is
    // the reading the click will fix. The other stands where the document put
    // it. See `DualCursorFollow` for PND-310 and PND-311.
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
          ` stroke="${colour}" stroke-width="${rounded(width)}"` +
          // ⭐ DFC-316: `date1` and `date2` are S-65's own two members, so the
          // two lines are told apart by the value each stands on and never by
          // which of them is following (DC-8, which an export never sees).
          `${figureKey(`dual-cursor-${side}`)}/>`,
      )
    }
  }

  // CU-3 of table T-029: the guide cursor is a three-mode exclusive setting
  // (none / crosshair / one vertical), held in S-66 of table T-202.
  //
  // ⛔ NOT IN AN EXPORT. EP-6 of table T-076 says so, on the ground that a
  // pointer position has no meaning in a saved picture. `drawsOperationState`
  // is exactly that test and is already the gate for every other mark of the
  // session, so the rule is obeyed in the one place rather than in a second.
  //
  // ⭐ PAINTED INTO `linkParts`, BESIDE THE OTHER TWO CURSORS, for the reason
  // PND-312 records for CU-2: table T-020 holds no row for any of the three, and
  // putting the rows of table T-029 in one layer is what lets a reader compare
  // them. The layer is carried by PND-342 below, with the region.
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
      // typed 1 the status line already stands at. @provisional PND-341
      const guideColour = themed('S-148')
      const guideWidth = 1
      // ⛔ THE REGION IS THE `Row Area`, THE SAME TWO EDGES CU-1 AND CU-2 RUN
      // BETWEEN, and no row says whether this line crosses the ruler. The
      // pointer is also required to BE in that area: nothing says what a guide
      // cursor does while the hand is over the ruler or a panel, and a line
      // striking the schedule from a pointer that is not on it guides the eye
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
      // ⛔⛔ AND THERE IS NO THIRD BRANCH, WHICH IS CU-3 OF TABLE T-029
      // (MUST NOT): a 縦 2 本 pair is not to be drawn here, nor left
      // unreachable behind a mode nothing can select.
      // ⚠️ CU-2's own pair is UNAFFECTED: it is drawn elsewhere, off `dualCursor`
      // (S-65) at S-194 / S-195, and FR-048 (MUST NOT) forbids one entrance
      // taking two cursors down together.
    }
  }

  for (const box of geometry.highlightBoxes) {
    // FR-019: the author's line colour, and the annotation's fixed one only
    // when they named none.
    //
    // ⭐ THE CORNERS ARE ROUNDED. FR-019 makes the radius a MUST, table T-217
    // holds it and the value rides on the box itself (AT-122).
    // ⚠️ NO SCALE IS APPLIED: `cornerRadiusPx` is already in screen pixels and
    // the four numbers beside it are too, which is what makes the radius the
    // same at every zoom.
    // ⭐ `ry` is left off on purpose -- SVG defaults it to `rx`, so writing
    // both would be the same number in two places.
    const radius = box.cornerRadiusPx
    const rounding = radius !== null && radius > 0 ? ` rx="${rounded(radius)}"` : ''
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        rounding +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ` stroke-width="1"${figureKey(`box-${box.id}`)}/>`,
    )
    // SL-8. ⭐ The rectangle IS the bounding box here, so the frame lands on
    // the same four numbers the box was drawn from -- and it is still a
    // separate rect, because SL-8 (MUST NOT) forbids re-stroking the target's
    // own outline and the dash has to survive the author's own line colour.
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151'), `box-${box.id}-frame`))
    }
  }

  for (const box of geometry.commentBoxes) {
    // FR-019 (MUST): the comment box's leader is ONE straight segment from
    // the anchor to the body's bottom-left corner -- ⛔ no bend in it, and
    // not a speech bubble's tail.
    // ⭐ Both ends are already settled elsewhere, which is why nothing is
    // minted here: `CommentGeometry.anchor` is the first and `body`'s
    // bottom-left corner the second (AT-113 / AT-114 and the bodyOffsetPx
    // MUST).
    // ⭐ THE COLOUR IS THE ANNOTATION'S FIXED ONE, and not the author's line
    // colour; FR-019 (MUST NOT) forbids a new settings value for it.
    // ⚠️ NO ROW GIVES THE LINE A WEIGHT, and none is invented for it: it
    // takes the same literal 1 the highlight box and the comment body beside
    // it are already stroked at, so the three move together if a row ever
    // arrives. ⛔ Reported rather than guessed -- a weight of its own would
    // be a settings value this unit minted.
    // ⭐ PUSHED BEFORE THE BODY so the filled body covers the end of the line
    // rather than the line crossing the text -- the body's own fill is what
    // NFR-007 put there, and a leader drawn over it would undo that ground.
    // ⚠️ `leaderShapeKind` STILL EXISTS on the document and is untouched here
    // -- FR-019 defers retiring the column -- so the value is stored and no
    // longer read by the drawing.
    annotationParts.push(
      `<line x1="${rounded(box.anchor.x)}" y1="${rounded(box.anchor.y)}"` +
        ` x2="${rounded(box.body.x)}" y2="${rounded(box.body.y + box.body.height)}"` +
        ` stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}-leader`)}/>`,
    )
    // ⭐ The body is FILLED rather than left open. NFR-007 makes 4.5:1 a MUST
    // for the comment box's own text in as many words, and text laid over an
    // arbitrary bar has no known ground to meet that against. S-162 is the
    // precedent for taking S-146 to float a mark clear of what is behind it.
    // ⚠️ Measured against WCAG 2.1: S-147 on S-146 is 17.76:1 light and 14.94:1
    // dark, while ANNOTATION_COLOUR as INK is 3.58:1 on the dark ground and
    // FAILS -- so it is the outline alone, where 1.4.11's 3:1 is what applies.
    // ⚠️ The fill hides whatever is behind the body. That is the price of the
    // MUST, not an oversight. @provisional PND-231
    annotationParts.push(
      `<rect x="${rounded(box.body.x)}" y="${rounded(box.body.y)}"` +
        ` width="${rounded(box.body.width)}" height="${rounded(box.body.height)}"` +
        ` fill="${themed('S-146')}" stroke="${ANNOTATION_COLOUR}" stroke-width="1"` +
        `${figureKey(`comment-${box.id}`)}/>`,
    )
    for (const [index, line] of box.lines.entries()) {
      // ⛔ The baseline sits at the FOOT of each em box. FR-097 makes one line
      // as tall as the type and stops there; no row says where inside that box
      // the baseline falls. `rulerSvg` computes the same foot with a lift of
      // its own, and S-179 is the RULER's row -- rule 03 forbids borrowing it.
      // ⚠️ The last line's descenders eat into S-181's padding. That is the
      // honest consequence of the foot and is worth a row of its own.
      // @provisional PND-230
      annotationParts.push(
        `<text x="${rounded(box.body.x + settings.commentBoxPad)}"` +
          ` y="${rounded(box.body.y + settings.commentBoxPad + (index + 1) * box.fontSize)}"` +
          ` font-size="${rounded(box.fontSize)}" fill="${themed('S-147')}"` +
          // ⭐ DFC-316: the line's number IS its identity here, and it is not an
          // array position standing in for one -- FR-097 wraps the box's own
          // text, so line 3 stays line 3 of this box whatever happens to any
          // other box.
          ` xml:space="preserve"${figureKey(`comment-${box.id}-line-${index}`)}>` +
          `${escaped(line)}</text>`,
      )
    }
    // SL-8, the framed half. ⭐ The body IS the bounding rectangle, and the
    // frame is still a separate rect: SL-8 (MUST NOT) forbids re-stroking the
    // target's own outline, and the dash has to survive the annotation colour.
    if (selectedComments.has(box.id)) {
      selectionParts.push(
        selectionFrameSvg(box.body, themed('S-151'), `comment-${box.id}-frame`),
      )
    }
  }

  // DFC-170: the band-crossing figures, clipped to the scrolling remainder
  // (`S-78`'s own rectangle, minted above as `scrollClipId`) -- and left
  // unwrapped whenever nothing is pinned, so an unpinned document's markup is
  // untouched by this whole change (`hasPinnedRows` is false, the pinned
  // arrays are empty, and every one of these four groups reduces to exactly
  // the array it always was).
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

  // FR-020's MUST NOT and EP-7's MUST, as the rectangle both name. ⭐ No new
  // value is minted: this IS
  // `regions.rowArea`, which PI-35 already cut for U-50.
  //
  // ⛔ PUSHED HERE AND NOT BESIDE `scrollClipId` ABOVE, which is not tidiness:
  // the dependency loop mints its arrowhead only `if (defsParts.length === 0)`,
  // so a clip added before it would take every arrowhead out of every picture
  // that carries a watermark. ⚠️ Nothing else reads `defsParts` between here
  // and the assembly below.
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
    // ⭐ PINNED FIRST, UNCLIPPED. A pinned Task's figures already stand inside
    // the band (LF-14), so there is nothing for a clip to trim -- and the two
    // groups never occupy the same pixels (a scrolling row starts one
    // `rowGap` below the band, per `scrollAreaY`), so which comes first
    // between them changes no pixel either way.
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
    // ⚠️ DFC-316: there is at most ONE marquee, so its key is simply what it
    // is -- there is nothing to tell it apart from.
    ...(marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'), 'marquee')]),
    // ⭐ FR-020's layer, over everything the `Row Area` holds -- 「重ねる」 is
    // what that requirement asks and the last thing drawn is what is on top.
    // ⛔ IT CANNOT REACH THE BAND, whatever it is drawn before or after: U-50
    // starts where the `Time Ruler` ends, and the clip minted above is that
    // rectangle. It stands before the band all the same, so that the one
    // sentence below -- the band is drawn over everything -- stays true as
    // written.
    // ⭐ S-223 IS ASKED FOR THROUGH `themed` LIKE EVERY OTHER COLOUR. Its row
    // inherits S-147 in both renderings: the ink is the reading ink, so it is
    // darker than the ground in the light theme and lighter in the dark one
    // without either being chosen here.
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

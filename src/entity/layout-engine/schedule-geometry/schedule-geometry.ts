// ScheduleGeometry -- public entry of this folder.
//
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6
//
// The vertices of everything drawn on the schedule (CP-6). Table T-068 puts
// two of its eleven stages here: LC-10, the dependency routes, and LC-11, the
// vertices themselves. Table T-069's RV-5 -- the progress symbol -- is named as
// this component's as well.
//
// ⚠️ Nothing here recomputes a placement. The MUST NOT after table T-068
// forbids a later stage feeding an earlier one, and rebuilding what LC-1 to
// LC-9 settled would be exactly that. Every position below is read from the
// ScheduleLayout or derived from table T-221 alone.
//
// ⛔ INCOMPLETE, and deliberately so. What this milestone does not draw:
//
//   - the deadline mark (FR-045) and the days-late label (FR-047). Table T-042
//     puts them at M4, and ScheduleLayout carries the matching gap in its
//     occupancy (OC-9 and OC-8 of table T-038).
//     ⭐ OC-2's PAIR IS NO LONGER AMONG THEM: the assignee label (FR-059, with
//     AS-2 of table T-225 for the Task nobody is on) and the percent label
//     (FR-090) are placed, and `assigneeLabel` is what gives GR-11 of table
//     T-023d the target `item-hit-area.ts` had no row for.
//   - the comment box's LEADER, AT-111's `calloutBox` and `polyline`. The body
//     is drawn now that FR-097 states the sizing rule and S-181 / S-182 hold
//     the padding and the wrap, but no row anywhere says what either leader
//     kind is drawn AS, and RC-13 of table T-026 reserves a new figure to the
//     user. `commentGeometry` carries the anchor for whoever draws it.
//   - the guide cursor (CU-3 of table T-029). It follows the pointer, and no
//     stage below is handed one -- ADR-001 runs table T-068 from the frozen
//     document alone. ⭐ The DUAL cursor is drawn now: its two dates are the
//     document's (S-65) and `dualCursorGeometry` places them.
//   - the watermark (FR-020) and the baseline overlay (FR-015). M4 and M5.
// ⭐ The eight milestone figures are no longer among them. All eight of
// AT-101's are drawn, from one inscribed circle, and `TaskPlacement` now
// carries the chosen one -- until it did, picking ☆ drew a ◇ in silence.
// FR-078 sends an unchosen figure to AT-101's default, which is `diamond` and
// reaches code as `COLUMN_DEFAULTS` (CR-177), so the ◇ is still not a value
// this file chose. ⚠️ The corners themselves are this file's: see PD-2.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  compareDays,
  dateFromWorkingDays,
  dayOf,
  isDelayed,
  planActualState,
  nextWorkingDay,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
// PI-32 of table T-064. ⭐ Only the type: what this file needs from a selection
// is the set of Task uids, which it builds once per call, and `isSelected`
// walks the list for every question asked of it.
import type { Selection } from '../../document-model/selection/selection'
import {
  // PI-5's own member (table T-064). ⛔ Not written a second time here: two
  // copies of the axis part company the moment S-77 or FR-017 moves, and this
  // file measures against the very layout that one was built from.
  xFromDay,
  type MilestoneGlyph,
  type ScheduleLayout,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../screen-regions/screen-regions'

/** A point. LR-6 keeps this layer off the browser's own types. */
export interface Point {
  readonly x: number
  readonly y: number
}

/** An ordered run of points: closed when it outlines, open when it is a line. */
export type Path = readonly Point[]

/** One end of SH-4's span. */
export interface SpanDot {
  readonly at: Point
  readonly radius: number
}

/**
 * How one bar is drawn. Table T-012 splits the five shapes two ways: SH-1,
 * SH-2 and SH-5 have an area to fill, SH-3 and SH-4 are a line with ends.
 */
export type BarGeometry =
  | {
      readonly form: 'outline'
      /** Closed: the last point joins the first. */
      readonly points: Path
      /**
       * Closed outlines cut OUT of the silhouette -- a face's eyes, a box's
       * edges. Empty for every shape that needs none, which is all five of
       * table T-012 and eight of the fifteen marks of SH-5.
       *
       * ⭐⭐ MADE FROM THE SAME `side` THE SILHOUETTE IS, which is the whole
       * reason this member may exist at all: 「日程も他のマイルストーンとサイズ
       * を合わせろ。つまり動的に変更可能としろ」 (the user's ruling of
       * 2026-08-29). Nothing here holds a length of its own, so a mark grows
       * and shrinks with the bar exactly as the outline around it does.
       * ⛔ NOT PART OF WHAT IS GRABBED. `itemAtPointer` tests the silhouette,
       * and a hole in the middle of a milestone that could not be picked up
       * would be a grab area no row of table T-023d describes.
       */
      readonly marks?: readonly Path[]
    }
  | {
      readonly form: 'line'
      readonly from: Point
      readonly to: Point
      /** LF-8. */
      readonly strokeWidth: number
      /** SH-3's head, as a filled triangle. Null for SH-4. */
      readonly head: Path | null
      /** SH-4's two ends. Empty for SH-3. */
      readonly dots: readonly SpanDot[]
    }

/** RV-5. The rows of table T-021, and nothing else -- PM-4 wins when it holds. */
export type ProgressSymbol = 'PM-1' | 'PM-1a' | 'PM-2' | 'PM-3' | 'PM-4'

export interface MarkerGeometry {
  readonly symbol: ProgressSymbol
  /** The circle: `markerSize` across, placed by LF-11. */
  readonly centre: Point
  readonly radius: number
}

/** LF-13's bent arrow: the L, then the head that closes it. */
export interface ResumeGeometry {
  readonly arm: Path
  readonly head: Path
  /** False when `resumeValid` is false, which is when S-25 has shrunk it. */
  readonly valid: boolean
}

/** GR-9 / GR-17 / GR-18: where FR-043's faint handles sit on a Task not started. */
export interface DummyGeometry {
  /** The row of table T-023d this one answers to. */
  readonly grab: 'GR-9' | 'GR-17' | 'GR-18'
  readonly at: Point
  /**
   * How tall the mark drawn on this point is: the ACTUAL bar's own band.
   *
   * ⭐ S-180 IS A WIDTH AND SAYS SO. Its note settles the horizontal alone and
   * sends the vertical to the actual bar's band -- the same split S-91 makes
   * for the actual endpoint's grab allowance. So the two are stated in two
   * places on purpose, and this member is the second one.
   *
   * ⚠️ It is carried on the geometry rather than recomputed by the renderer so
   * that the band's height stays written in ONE place. `taskGeometryOf` has
   * already solved it for the bar itself.
   */
  readonly height: number
}

export interface TaskGeometry {
  readonly taskUid: number
  /** Carried through so a reader need not resolve AT-100 a second time. */
  readonly shapeKind: TaskPlacement['shapeKind']
  readonly plan: BarGeometry | null
  readonly actual: BarGeometry | null
  /** T-020a. Empty unless GD-1 holds. */
  readonly guides: readonly Path[]
  readonly marker: MarkerGeometry | null
  readonly resume: ResumeGeometry | null
  readonly dummies: readonly DummyGeometry[]
  /**
   * GR-1 then GR-2. Empty unless the shape has thickness (FD-5) AND the Task
   * is the selected one (FR-075, MUST -- the condition is S-111 of table
   * T-210). ⭐ The hit test reads this list and nothing else, so the scope of
   * the grab area is the scope of the picture. The reasoning is where they
   * are built.
   */
  readonly fadeHandles: readonly Point[]
  /**
   * GR-10's target: where LC-6 put the name across, and where table T-012's
   * 「名称ラベルの縦位置」 column put it down the band. ⭐ It is the LABEL's
   * own box -- one line of type high -- and not the band the shape stands in.
   * Null when the Task has no name.
   */
  readonly label: ScreenRect | null
  /**
   * GR-11's target: OC-2's assignee label (FR-059), jutting out past the LEFT
   * of the bar. Null while S-60 has it hidden -- and never null merely because
   * nobody is on the Task, which is what AS-2 of table T-225 (MUST NOT) is
   * about: 「何も描かないと `GR-11` に当たる図形がそのタスクだけ存在せず」.
   */
  readonly assigneeLabel: ScreenRect | null
  /**
   * OC-2's percent label (FR-090), further out again. Null while S-61 has it
   * hidden, and null on a Task not started -- FR-090 (MUST NOT) draws none
   * there. ⛔ NO ROW OF TABLE T-023d CLAIMS IT: the box leaves so that the
   * drawing side reads one answer, not so that it can be grabbed.
   */
  readonly percentLabel: ScreenRect | null
}

/** One dependency, routed. LC-10. */
export interface DependencyGeometry {
  readonly predecessorUid: number
  readonly successorUid: number
  /** DP-1 to DP-4 of table T-018. */
  readonly linkType: number
  /** Which row of table T-222 chose the route. */
  readonly pattern: 'RP-1' | 'RP-2' | 'RP-3' | 'RP-4' | 'RP-5' | 'RP-6' | 'RP-7' | 'RP-8'
  /** Anchor, bends, anchor. The bend count is `points.length - 2`. */
  readonly points: Path
}

/** FR-019's HighlightBox, clipped to the rows this zoom draws. */
export interface HighlightGeometry {
  readonly id: string
  readonly box: ScreenRect
}

/**
 * FR-019's CommentBox: the BODY alone, sized to its own text by FR-097.
 *
 * ⛔ NO LEADER. AT-111 gives the box two leader kinds and FR-019 makes choosing
 * between them a MUST, but no table says what either kind is drawn as. `anchor`
 * is the point on the schedule the box is pinned to -- where the leader would
 * start -- and is carried so that the hit test, the eventual leader and any
 * later drag all read one answer rather than three.
 */
export interface CommentGeometry {
  readonly id: string
  /** AT-113's date on the time axis, AT-114's row on the vertical one. */
  readonly anchor: Point
  /** What is drawn, and what GR-14 grabs. */
  readonly body: ScreenRect
  /** The body already broken into lines (FR-097). One entry is one line. */
  readonly lines: readonly string[]
  /** FR-039's fontScale through table T-215. FR-097 makes one line this tall. */
  readonly fontSize: number
}

/**
 * CU-2's two measuring lines, placed. Null while `dualCursor` holds nothing.
 *
 * ⭐ BOTH DATES ALWAYS STAND. IV-13 (MUST) has both non-null while the setting
 * is non-null, and DC-1 puts both down in the same move -- one on the pointer
 * and one at the middle of the `Row Area` -- so there is no half-placed pair to
 * describe here.
 *
 * ⛔ WHICH SIDE IS FOLLOWING IS NOT HERE. That is a current value, which LY-5
 * of table T-060 leaves with the Framework, and DC-8 (MUST NOT) keeps the mark
 * for it out of an export while EP-6 still draws these two lines -- so the
 * placement is the document's and the mark is the session's, and they travel
 * apart. `svgFromSchedule`'s own parameter is where the second one arrives.
 */
export interface DualCursorGeometry {
  /** Where S-65's `date1` is drawn on the time axis. */
  readonly date1X: number
  /** Where S-65's `date2` is drawn on the time axis. */
  readonly date2X: number
  /** Both lines run the height of the `Row Area`, as CU-1's does. */
  readonly top: number
  readonly bottom: number
}

export interface ScheduleGeometry {
  readonly tasks: readonly TaskGeometry[]
  readonly dependencies: readonly DependencyGeometry[]
  /** FR-014's unbroken polyline. Empty when no status date is set. */
  readonly progressLine: Path
  /** CU-1. Null when `Project.statusDate` holds nothing. */
  readonly statusLine: { readonly x: number; readonly top: number; readonly bottom: number } | null
  /** CU-2 (table T-029a). Null while `dualCursor` (S-65) holds nothing. */
  readonly dualCursor: DualCursorGeometry | null
  readonly highlightBoxes: readonly HighlightGeometry[]
  /** FR-019's CommentBox, body only. See `CommentGeometry`. */
  readonly commentBoxes: readonly CommentGeometry[]
}

/** @purity pure */
function point(x: number, y: number): Point {
  return { x, y }
}

/**
 * What every stage below reads. Assembled once, never rebuilt.
 *
 * ⚠️ Named for what it holds rather than for the moment it belongs to: a
 * "frame" in this codebase is FrameLoop's render tick or ScreenFrame's UF-61
 * region, and neither of those is this.
 */
interface GeometryInputs {
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly within: WorkingCalendar
  readonly taskByUid: ReadonlyMap<number, Task>
  readonly statusDate: CalendarDay | null
  readonly showPlan: boolean
  readonly showActual: boolean
  /**
   * The uids SL-1 of table T-023c has selected, and nothing else from the
   * selection. FR-075 (MUST) shows the fade grab points on the selected Task
   * alone; S-111 of table T-210 is the row that records the condition.
   *
   * ⭐ A set, gathered once per call: this is asked per Task per frame, and
   * `isSelected` answers by walking the selected list each time.
   */
  readonly selectedTaskUids: ReadonlySet<number>
}

// ---------------------------------------------------------------- shapes ----

/**
 * The plan outline, as table T-012a's four points.
 *
 * ⚠️ Those four points ARE the rectangle when neither fade is set: FD-4 has
 * the polygon replace the rectangle only when a fade exists, and two zeroes
 * collapse points 2 and 4 onto the corners. One expression, no branch.
 *
 * @purity pure
 */
function fadedOutline(x0: number, x1: number, top: number, height: number,
                      fadeIn: number, fadeOut: number): Path {
  const bottom = top + height
  return [
    point(x0, bottom),
    point(x1 - fadeOut, bottom),
    point(x1, top),
    point(x0 + fadeIn, top),
  ]
}

/**
 * GR-1 and GR-2 of table T-023d, on the two points its 場所 column names --
 * table T-012a's point 4 and point 2.
 *
 * ⛔ NOT THE BOUNDING RECTANGLE'S CORNERS, WHICH IS WHAT THIS WAS. FD-4 has the
 * polygon REPLACE the rectangle once a fade stands, so 「予定バーの左上の角」 IS
 * point 4 -- and a handle left at the placement's own `x` marks a vertex the
 * drawn bar no longer has. ⚠️ The two readings agree exactly while both fades
 * are zero, which is why the old expression looked right on every Task that
 * used none.
 *
 * ⭐ THE OUTLINE'S OWN CLAMP AND NOT A SECOND ONE. `barOf` draws point 4 and
 * point 2 through `clampedFade`, so calling the same function here keeps FD-6
 * and FD-6b from drifting between the drawn vertex and the □ that marks it.
 * ⭐ `item-hit-area.ts` reads these very points, so the grab follows the
 * drawing without a second edit -- the property PD-191's note already leans on.
 *
 * ⚠️ ON THE TIME AXIS, NEVER ON A CHEVRON'S DRAWN NOTCH VERTEX. Table T-023d's
 * closing rule takes the days from the day under the pointer and says the grab
 * point IS 「時間軸の上の『ある日』そのもの」, and FD-5 lets the fade replace the
 * notch depth with `max(fadeIn, fadeOut)` -- so on a chevron whose two fades
 * differ the notch stands at a day this handle must not report.
 * @provisional PD-252
 *
 * @purity pure
 */
function fadeHandlePoints(placed: TaskPlacement, planTop: number): readonly Point[] {
  return [
    point(placed.x + placed.fadeInPx, planTop),
    point(placed.x + placed.width - placed.fadeOutPx, planTop + placed.planHeight),
  ]
}

/** LF-6, plan side. @purity pure */
function chevronNotch(width: number, height: number, settings: DocumentSettings): number {
  return Math.min(width * settings.chevronNotchOfWidth, height * settings.chevronNotchOfHeight)
}

/** @purity pure */
function chevronOutline(x0: number, x1: number, top: number, height: number, notch: number): Path {
  const middle = top + height / 2
  const bottom = top + height
  return [
    point(x0, top),
    point(x1 - notch, top),
    point(x1, middle),
    point(x1 - notch, bottom),
    point(x0, bottom),
    point(x0 + notch, middle),
  ]
}

/**
 * A regular figure with `count` corners, inscribed in the circle of radius
 * `radius` around `centre`, with the first corner at `startTurn` of a turn
 * measured clockwise from straight up.
 *
 * ⭐ Every one of AT-101's eight is built from this one circle, which is what
 * makes `starInnerOfOuter` (S-48) able to say it "decides the area of the ☆ and
 * so affects the order of the figures by area" -- there is an order only
 * because they share a size.
 *
 * @purity pure
 */
function regularCorners(
  centre: Point,
  radius: number,
  count: number,
  startTurn: number,
): Path {
  const out: Point[] = []
  for (let step = 0; step < count; step += 1) {
    const turn = startTurn + step / count
    const angle = turn * 2 * Math.PI
    out.push(point(centre.x + radius * Math.sin(angle), centre.y - radius * Math.cos(angle)))
  }
  return out
}

/**
 * LF-10's figure, for each of AT-101's eight.
 *
 * ⛔ The vertices are NOT in the specification. `S-48` gives the star's waist
 * and 図 F-019 draws the palette ICONS, but nothing states the corners of the
 * figure a milestone is drawn as. What IS fixed is the observable behaviour:
 * eight spellings that must be told apart, all at LF-10's size.
 *
 * ⭐ Class B of docs/development-rules/06-pending-decisions.md -- the inside of
 * a pure function, with the behaviour around it already settled.
 *
 * ⚠️ The ◇ and the □ are the same four corners a quarter turn apart, so they
 * enclose the same area; that is the point rather than an accident.
 * ⚠️ The 〇 is a polygon of many corners, because BarGeometry's outline form
 * carries a path and nothing else. Adding an arc form would change a type two
 * accepted units already build against, for one figure.
 *
 * @provisional PD-2
 */
const CIRCLE_CORNERS = 24

/** @purity pure */

/**
 * A corner of one of SH-5's seven pictorial marks, written as a share of the
 * half-side and turned into a point here.
 *
 * ⭐⭐ THIS IS WHAT KEEPS THE RULING. 「日程も他のマイルストーンとサイズを合わせ
 * ろ。つまり動的に変更可能としろ」 (the user, 2026-08-29) -- every number in the
 * seven shapes below is a share of the SAME `half` that `regularCorners` hands
 * the other eight, so a mark grows and shrinks with the bar and no length of
 * its own exists to fall out of step. ⛔ Not one px is written in this file.
 *
 * @purity pure
 */
function share(centre: Point, half: number, u: number, v: number): Point {
  return point(centre.x + half * u, centre.y + half * v)
}

/** @purity pure */
function shares(centre: Point, half: number, pairs: readonly (readonly [number, number])[]): Path {
  return pairs.map(([u, v]) => share(centre, half, u, v))
}

/**
 * The silhouette of each of the seven, and the outlines cut out of it.
 *
 * ⛔ WHY FOUR OF THEM CARRY MARKS AT ALL. A milestone is one filled shape, and
 * a box's silhouette is a hexagon while a smiling face's is a circle -- both of
 * which SH-5 already spends on another mark. Cutting the inner outlines out is
 * what tells `box` from `hexagon` and `smile` from `circle`; without them two
 * of the fifteen could not be told apart at any size.
 * ⭐ THE OTHER THREE NEED NONE: a file's fold, a person and a mug read from
 * their outline alone, and a mark that earns nothing is a mark not drawn.
 *
 * @purity pure
 */
const PICTORIAL: Readonly<Record<string, {
  readonly body: readonly (readonly [number, number])[]
  readonly marks: readonly (readonly (readonly [number, number])[])[]
}>> = {
  // A sheet with the top right corner turned down.
  file: {
    body: [[-0.62, -1], [0.24, -1], [0.62, -0.6], [0.62, 1], [-0.62, 1]],
    marks: [[[0.24, -1], [0.62, -0.6], [0.24, -0.6]]],
  },
  // A cube. ⛔ Its silhouette IS a hexagon, so the top face is cut out -- that
  // face is the whole of what makes it read as a box.
  box: {
    body: [[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0.8, 0.55], [0, 1], [-0.8, 0.55]],
    marks: [[[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0, 0]]],
  },
  // A square with the shutter corner clipped, its shutter and its label.
  floppyDisk: {
    body: [[-0.85, -0.85], [0.55, -0.85], [0.85, -0.55], [0.85, 0.85], [-0.85, 0.85]],
    marks: [
      [[-0.35, -0.85], [0.25, -0.85], [0.25, -0.3], [-0.35, -0.3]],
      [[-0.55, 0.2], [0.55, 0.2], [0.55, 0.85], [-0.55, 0.85]],
    ],
  },
  // A stack of platters: a tube with two rims cut across it.
  cylinder: {
    body: [
      [-0.7, -0.75], [-0.35, -0.95], [0.35, -0.95], [0.7, -0.75],
      [0.7, 0.75], [0.35, 0.95], [-0.35, 0.95], [-0.7, 0.75],
    ],
    marks: [
      [[-0.7, -0.45], [0.7, -0.45], [0.7, -0.25], [-0.7, -0.25]],
      [[-0.7, 0.15], [0.7, 0.15], [0.7, 0.35], [-0.7, 0.35]],
    ],
  },
  // Head and shoulders, in one outline -- the neck joins them, so no mark is
  // needed to hold the head on.
  person: {
    body: [
      [-0.85, 1], [-0.85, 0.45], [-0.6, 0.05], [-0.25, -0.1],
      [-0.36, -0.3], [-0.36, -0.62], [0, -0.95], [0.36, -0.62],
      [0.36, -0.3], [0.25, -0.1], [0.6, 0.05], [0.85, 0.45], [0.85, 1],
    ],
    marks: [],
  },
  // ⛔ The silhouette is a circle, which SH-5 already spends. The two eyes and
  // the mouth are what tell them apart.
  smile: {
    body: [],
    marks: [
      [[-0.46, -0.3], [-0.24, -0.3], [-0.24, -0.02], [-0.46, -0.02]],
      [[0.24, -0.3], [0.46, -0.3], [0.46, -0.02], [0.24, -0.02]],
      [[-0.52, 0.18], [0, 0.62], [0.52, 0.18], [0.52, 0.38], [0, 0.82], [-0.52, 0.38]],
    ],
  },
  // A mug with a handle. The handle's hole and the head of foam are cut out.
  beerMug: {
    body: [
      [-0.8, -0.7], [0.3, -0.7], [0.3, -0.35], [0.8, -0.35],
      [0.8, 0.35], [0.3, 0.35], [0.3, 0.95], [-0.8, 0.95],
    ],
    marks: [
      [[-0.8, -0.32], [0.3, -0.32], [0.3, -0.12], [-0.8, -0.12]],
      [[0.44, -0.18], [0.66, -0.18], [0.66, 0.18], [0.44, 0.18]],
    ],
  },
}

/**
 * The marks cut out of one of SH-5's fifteen, or none. @purity pure
 */
function milestoneMarks(centre: Point, side: number, glyph: MilestoneGlyph): readonly Path[] {
  const drawn = PICTORIAL[glyph]
  if (drawn === undefined) return []
  return drawn.marks.map((one) => shares(centre, side / 2, one))
}

function milestoneOutline(
  centre: Point,
  side: number,
  glyph: MilestoneGlyph,
  starInnerOfOuter: number,
): Path {
  const half = side / 2
  // ⭐ The seven pictorial marks, each a share of the same `half`. `smile` has
  // no body of its own: its silhouette IS the circle, and only the marks below
  // tell the two apart.
  const drawn = PICTORIAL[glyph]
  if (drawn !== undefined) {
    return drawn.body.length === 0
      ? regularCorners(centre, half, CIRCLE_CORNERS, 0)
      : shares(centre, half, drawn.body)
  }
  switch (glyph) {
    case 'circle':
      return regularCorners(centre, half, CIRCLE_CORNERS, 0)
    case 'hexagon':
      return regularCorners(centre, half, 6, 0)
    case 'pentagon':
      return regularCorners(centre, half, 5, 0)
    case 'square':
      // A quarter of a quarter turn from the ◇, which lands its sides square
      // with the axes.
      return regularCorners(centre, half, 4, 0.125)
    case 'triangleUp':
      return regularCorners(centre, half, 3, 0)
    case 'triangleDown':
      return regularCorners(centre, half, 3, 0.5)
    case 'star': {
      // Ten corners, the odd ones pulled in to S-48's fraction of the radius.
      const inner = half * starInnerOfOuter
      const outer = regularCorners(centre, half, 5, 0)
      const waist = regularCorners(centre, inner, 5, 0.1)
      const out: Point[] = []
      for (let step = 0; step < 5; step += 1) {
        out.push(outer[step]!, waist[step]!)
      }
      return out
    }
    case 'diamond':
    default:
      return regularCorners(centre, half, 4, 0)
  }
}

/** LF-8. @purity pure */
function thinStroke(planHeight: number, settings: DocumentSettings): number {
  return Math.max(
    settings.thinStrokeMin,
    Math.min(settings.thinStrokeMax, planHeight * settings.thinStrokeOfPlan),
  )
}

/**
 * How far SH-3's head or SH-4's end dot reaches above (or below) the
 * stroke's own middle -- the same two formulas `lineBar` draws the picture
 * with, read again here because `labelTopOf` needs the shape's outer edge
 * and not a `BarGeometry` to measure it from (D-55, 裁定 C1).
 *
 * @purity pure
 */
function lineEndHalfHeight(kind: 'arrow' | 'endpointSpan', x0: number, x1: number, stroke: number,
                           settings: DocumentSettings): number {
  if (kind === 'arrow') {
    const head = Math.min(stroke * settings.arrowHeadOfStroke, (x1 - x0) * settings.arrowHeadOfSpan)
    return head / 2
  }
  return stroke * settings.spanDotOfStroke
}

/** One bar of a shape without thickness (SH-3 or SH-4), by LF-7. @purity pure */
function lineBar(kind: ShapeKind, x0: number, x1: number, middle: number, stroke: number,
                 settings: DocumentSettings): BarGeometry {
  if (kind === 'arrow') {
    const head = Math.min(stroke * settings.arrowHeadOfStroke, (x1 - x0) * settings.arrowHeadOfSpan)
    return {
      form: 'line',
      from: point(x0, middle),
      to: point(x1 - head, middle),
      strokeWidth: stroke,
      head: [
        point(x1, middle),
        point(x1 - head, middle - head / 2),
        point(x1 - head, middle + head / 2),
      ],
      dots: [],
    }
  }
  const radius = stroke * settings.spanDotOfStroke
  return {
    form: 'line',
    from: point(x0, middle),
    to: point(x1, middle),
    strokeWidth: stroke,
    head: null,
    dots: [{ at: point(x0, middle), radius }, { at: point(x1, middle), radius }],
  }
}

/**
 * One bar, plan or actual, of any of the five shapes.
 *
 * @purity pure
 */
function barOf(inputs: GeometryInputs, placed: TaskPlacement, x0: number, x1: number,
               top: number, height: number, isActual: boolean): BarGeometry {
  const settings = inputs.settings
  const kind = placed.shapeKind
  if (kind === 'milestone') {
    // AT-101's figure now travels with the placement; before it did, every
    // milestone came out a ◇ whatever the document chose.
    const glyph = placed.milestoneGlyph
    return {
      form: 'outline',
      points: milestoneOutline(
        point((x0 + x1) / 2, top + height / 2),
        height,
        glyph,
        settings.starInnerOfOuter,
      ),
      marks: milestoneMarks(point((x0 + x1) / 2, top + height / 2), height, glyph),
    }
  }
  if (kind === 'arrow' || kind === 'endpointSpan') {
    // LF-8 reads the PLAN height for both bars, so the two lines hold one
    // weight the way LF-6 makes the two chevrons hold one angle.
    return lineBar(kind, x0, x1, top + height / 2, thinStroke(placed.planHeight, settings), settings)
  }
  // FD-6a: no fade on the actual. It records what happened, which is not vague.
  // ⭐ The plan's two are READ off the placement (CR-290) rather than clamped
  // again here: LC-6 needs the same two numbers to judge NL-1 against, and
  // FD-6 written in two units parts company the moment either is re-read.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (kind === 'chevron') {
    // LF-6: the plan's notch is clamped, the actual's is derived from it and
    // NOT clamped again. FD-5 has a fade replace the notch outright.
    const fadeNotch = Math.max(fade.fadeIn, fade.fadeOut)
    const planNotch = chevronNotch(placed.width, placed.planHeight, settings)
    const notch = fadeNotch > 0 ? fadeNotch : isActual ? planNotch * settings.actualOfPlan : planNotch
    return { form: 'outline', points: chevronOutline(x0, x1, top, height, notch) }
  }
  return { form: 'outline', points: fadedOutline(x0, x1, top, height, fade.fadeIn, fade.fadeOut) }
}

// -------------------------------------------------------------- the mark ----

/**
 * RV-5: table T-021, with PM-4 winning whenever it holds.
 *
 * ⚠️ NOT exported. Table T-064's PI-6 declares two members -- the
 * `ScheduleGeometry` type and `geometryFromLayout` -- and this is neither.
 * It leaves the component as `MarkerGeometry.symbol`.
 *
 * @purity pure
 */
function progressSymbolOf(task: Task, statusDate: CalendarDay | null): ProgressSymbol {
  if (isDelayed(task, statusDate)) return 'PM-4'
  switch (planActualState(task)) {
    case 'finished':
      return 'PM-2'
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return 'PM-3'
    case 'notStarted':
      return 'PM-1a'
    case 'inProgress':
      return 'PM-1'
  }
}

/**
 * The right end LF-11 measures from -- the bar FR-013 names -- or null when
 * this Task draws nothing that has one.
 *
 * ⭐ ONE rule with four arms, because FR-013 and GR-7 between them state one.
 * FR-013's STATEMENT names the actual bar, and the plan bar only while the
 * plan alone is displayed (MUST). Table T-023d's GR-7 names the two cases
 * that have no actual bar to point at: a Task not started goes to the outside
 * of the end-point grab, and a milestone to the outside of its figure.
 *
 * ⛔ The plan bar is NOT a candidate while the actual is on screen. Taking
 * whichever of the two reached further right put the marker at the end of the
 * plan on every Task running behind schedule -- the further behind, the
 * further the marker walked from the actual bar it is named against.
 *
 * ⚠️ A milestone has no actual bar at all (GR-15 says GR-5, GR-6 and GR-17 do
 * not apply to one), so GR-7 sends it to its figure and LF-10 makes the plan
 * figure's right edge that figure's outside. ⛔ NOT DECIDED BY THE
 * SPECIFICATION: which figure GR-7 means while the plan is not drawn at all
 * (`planActualDisplay` is actual-only, so only the actual figure is on
 * screen). LF-10 gives the actual figure a centre and no right end, so the
 * plan figure is the only reading table T-221 supports, and it is taken here.
 *
 * A Task not started has no actual bar either, so FR-043's two dummies stand
 * in for that bar's ends and the marker hangs off GR-17 rather than off the
 * plan -- which is why FR-013 draws it faint beside the faint dummies rather
 * than out at the end of the plan bar.
 *
 * @purity pure
 */
function markerAnchorX(inputs: GeometryInputs, placed: TaskPlacement,
                       dummies: readonly DummyGeometry[]): number | null {
  const planRight = placed.x + placed.width
  // FR-013's MUST: the plan alone is being displayed.
  if (!inputs.showActual) return inputs.showPlan ? planRight : null
  // GR-7's milestone clause.
  if (placed.shapeKind === 'milestone') return planRight
  // GR-7's not-started clause.
  const endpoint = dummies.find((one) => one.grab === 'GR-17')
  if (endpoint !== undefined) return endpoint.at.x
  // FR-013's own first clause, and the only arm that reads the actual bar.
  if (placed.actualX !== null) return placed.actualX + placed.actualWidth
  // Nothing is started and FR-043 drew no dummy, which happens only where the
  // Task holds no start date -- and FR-013 forbids such a Task from reaching
  // the screen at all (MUST NOT), so there is no place to name here.
  return null
}

/**
 * LF-11's square, and the symbol it carries.
 *
 * ⛔ The clearance is `markerGap` alone, which is every distance the document
 * holds: S-23 states it as the least distance that does not overlap the end
 * point's grab allowance, and forbids going any further. The dummy's own grab
 * allowance is the one S-93 holds, and table T-206 keeps it OUT of the
 * document on purpose -- it reaches ItemHitArea as an
 * argument and never reaches this layer -- so where that allowance is wider
 * than `markerGap` plus the marker's radius, GR-7 still covers part of GR-17
 * and GR-7 is the higher row. Squaring S-23 against S-93 changes the
 * specification; it is not a value to pick here.
 *
 * @purity pure
 */
function markerOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  dummies: readonly DummyGeometry[]): MarkerGeometry | null {
  const settings = inputs.settings
  if (!settings.progressMarkerVisible) return null
  const anchorX = markerAnchorX(inputs, placed, dummies)
  if (anchorX === null) return null
  const radius = settings.markerSize / 2
  return {
    symbol: progressSymbolOf(task, inputs.statusDate),
    // LF-11 puts the vertical on the middle of the PLAN bar.
    centre: point(anchorX + settings.markerGap + radius, placed.y + placed.planHeight / 2),
    radius,
  }
}

/**
 * LF-13's arm and head, standing where LF-11 puts them.
 *
 * ⛔ THE X IS THE `resume` DAY'S, NOT THE MARKER'S. LF-11 used to pin this icon
 * to the marker, whose own x is a function of `actualStart + actualDuration`
 * and never reads `resume` -- so GR-8 of table T-023d (grab it and `resume`
 * changes) could not work whatever the drag did: an absolute reading made a
 * rightward pull move the date EARLIER, and a relative one snapped back beside
 * the marker on release. ⭐ What blocked it was LF-11, not the drag.
 *
 * ⭐ PL-3 OF TABLE T-022 ALREADY DRAWS THE PROGRESS LINE'S VERTEX ON THAT SAME
 * DAY, so this borrows an arithmetic the file already has rather than minting
 * one.
 *
 * ⚠️ WITHOUT A `resume` THE MARKER STILL SERVES. That is PA-4's suspension --
 * suspended with no date planned -- and LF-11 (MUST) keeps the icon beside the
 * marker there, so no row loses its grab. ⚠️ The vertical stays the marker's
 * middle in both cases, which is the plan bar's middle (LF-11).
 *
 * @purity pure
 */
function resumeOf(inputs: GeometryInputs, task: Task, marker: MarkerGeometry,
                  settings: DocumentSettings): ResumeGeometry {
  const valid = task.resumeValid !== false
  const side = settings.markerSize * (valid ? 1 : settings.resumeScaleInvalid)
  const resumeDay = dayOf(task.resume)
  const x = resumeDay === null
    ? marker.centre.x + marker.radius + settings.markerGap
    : xFromDay(inputs.layout, resumeDay)
  const arm = side * settings.resumeArmOfMarker
  const head = side * settings.resumeHeadOfMarker
  const middle = marker.centre.y
  return {
    // LF-13 pins both ends: up from the marker's own bottom, then right.
    arm: [point(x, marker.centre.y + marker.radius), point(x, middle), point(x + arm, middle)],
    head: [
      point(x + arm, middle - head),
      point(x + arm + head, middle),
      point(x + arm, middle + head),
    ],
    valid,
  }
}

// ------------------------------------------------------------ the routes ----

/** DP-1 (FS) and DP-3 (FF) leave by the right edge. @purity pure */
function exitsRight(linkType: number): boolean {
  return linkType === 1 || linkType === 0
}

/** DP-3 and DP-4 are the same-side family: one edge serves both ends. @purity pure */
function sameSide(linkType: number): boolean {
  return linkType === 0 || linkType === 3
}

interface Anchored {
  readonly edge: number
  readonly middle: number
  readonly top: number
  readonly bottom: number
}

/** LF-5: the height a four-bend route's horizontal part runs at. @purity pure */
function corridorY(from: Anchored, to: Anchored, settings: DocumentSettings): number {
  if (Math.abs(from.top - to.top) < 0.5) return from.bottom + settings.stackGap / 2
  return to.top > from.top ? (from.bottom + to.top) / 2 : (to.bottom + from.top) / 2
}

/**
 * Table T-222, written once in the "exit on the right" direction. The caller
 * mirrors x for SF and SS, routes, and mirrors back -- which is what the
 * table's own preamble requires (MUST) so that no second set of rules exists.
 *
 * @purity pure
 */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DocumentSettings): {
  readonly pattern: DependencyGeometry['pattern']
  readonly points: Path
} {
  // LF-4: one ratio drives both, so they cannot drift apart.
  const entryRun = settings.dependencyArrowLength * settings.dependencyRunOfArrow
  const exitRun = entryRun - settings.dependencyArrowLength
  const x1 = from.edge + exitRun
  const sameLane = Math.abs(from.middle - to.middle) < 0.5
  const below = to.middle > from.middle

  if (sameSide(linkType)) {
    const x2 = to.edge + entryRun
    if (sameLane) {
      // RP-8: two verticals, pushed apart when they would land on each other.
      const outward = Math.abs(x1 - x2) < exitRun ? x2 + exitRun : x1
      const corridor = corridorY(from, to, settings)
      return {
        pattern: 'RP-8',
        points: [
          point(from.edge, from.middle),
          point(outward, from.middle),
          point(outward, corridor),
          point(x2, corridor),
          point(x2, to.middle),
          point(to.edge, to.middle),
        ],
      }
    }
    // RP-6 and RP-7: one turn-back clears both runs at once, so neither a
    // branch nor a clamp is needed.
    const back = Math.max(x1, x2)
    return {
      pattern: below ? 'RP-6' : 'RP-7',
      points: [
        point(from.edge, from.middle),
        point(back, from.middle),
        point(back, to.middle),
        point(to.edge, to.middle),
      ],
    }
  }

  const x2 = to.edge - entryRun
  // RP-1 asks for the entry run alone: a route of one horizontal line has no
  // vertical for the exit run to hold away from the edge.
  if (sameLane && to.edge - from.edge >= entryRun) {
    return { pattern: 'RP-1', points: [point(from.edge, from.middle), point(to.edge, to.middle)] }
  }
  if (!sameLane && x2 >= x1) {
    // RP-2 and RP-3: fold at the midpoint, held inside [x1, x2].
    const mid = Math.max(x1, Math.min((from.edge + to.edge) / 2, x2))
    return {
      pattern: below ? 'RP-2' : 'RP-3',
      points: [
        point(from.edge, from.middle),
        point(mid, from.middle),
        point(mid, to.middle),
        point(to.edge, to.middle),
      ],
    }
  }
  // RP-4 and RP-5: out, along the corridor, back. A wholly backwards
  // dependency on one lane fell out of RP-1 and lands here, which is what
  // RP-4's own row says it does.
  const corridor = corridorY(from, to, settings)
  return {
    pattern: below || sameLane ? 'RP-4' : 'RP-5',
    points: [
      point(from.edge, from.middle),
      point(x1, from.middle),
      point(x1, corridor),
      point(x2, corridor),
      point(x2, to.middle),
      point(to.edge, to.middle),
    ],
  }
}

/**
 * FR-009: a dependency hangs on the plan geometry, and on the actual only
 * while the plan is not drawn.
 *
 * @purity pure
 */
function attachedBar(inputs: GeometryInputs, placed: TaskPlacement): {
  readonly x: number
  readonly width: number
} {
  return !inputs.showPlan && placed.actualX !== null
    ? { x: placed.actualX, width: placed.actualWidth }
    : { x: placed.x, width: placed.width }
}

/** @purity pure */
function routedDependency(inputs: GeometryInputs, from: TaskPlacement, to: TaskPlacement,
                          linkType: number): DependencyGeometry {
  const right = exitsRight(linkType)
  const sign = right ? 1 : -1
  // DP-1 exits right and enters left; DP-2 mirrors it. DP-3 and DP-4 use the
  // same edge at both ends, which after mirroring is the right one twice.
  const entryRight = sameSide(linkType) ? right : !right
  /** @purity pure */
  const anchor = (placed: TaskPlacement, edgeRight: boolean): Anchored => {
    const bar = attachedBar(inputs, placed)
    return {
      edge: sign * (edgeRight ? bar.x + bar.width : bar.x),
      middle: placed.y + placed.planHeight / 2,
      top: placed.y,
      bottom: placed.y + placed.planHeight,
    }
  }
  const route = routeOf(anchor(from, right), anchor(to, entryRight), linkType, inputs.settings)
  return {
    predecessorUid: from.taskUid,
    successorUid: to.taskUid,
    linkType,
    pattern: route.pattern,
    points: route.points.map((vertex) => point(sign * vertex.x, vertex.y)),
  }
}

// ------------------------------------------------------------- the whole ----

/**
 * Table T-020a.
 *
 * ⚠️ GD-4 is judged BEFORE GD-1's overlap, because it carries a condition of
 * its own -- 実績日が予定日と違うとき -- and says why: 点なので「重なる」概念を
 * 持たない. Two milestone figures one day apart still overlap in pixels at
 * every ordinary zoom, so asking the overlap first would leave the row unable
 * ever to fire.
 *
 * @purity pure
 */
function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  actualHeight: number): readonly Path[] {
  const settings = inputs.settings
  // GD-1: only with both bars on screen, and only with an actual to connect to.
  if (settings.planActualDisplay !== 'both' || placed.actualX === null) return []
  const middle = placed.y + placed.planHeight / 2

  // GD-4: the days themselves, not the pixels the figures cover.
  if (placed.actualPlacement === 'sideways') {
    const planDay = dayOf(task.start)
    const actualDay = dayOf(task.actualStart)
    if (planDay === null || actualDay === null) return []
    if (compareDays(planDay, actualDay) === 0) return []
    // GD-5 asks for the near end of each. A point has no end but itself, and
    // LF-10 centres both figures on their own day.
    return [[point(placed.actualX, middle), point(placed.x + placed.width / 2, middle)]]
  }

  // GD-1's other half: the two bars have come apart.
  const planX0 = placed.x
  const planX1 = placed.x + placed.width
  const actualX0 = placed.actualX
  const actualX1 = placed.actualX + placed.actualWidth
  if (actualX1 >= planX0 && actualX0 <= planX1) return []

  // GD-5: the gap alone, from the actual's near end to the plan's near end.
  const rightwards = actualX0 > planX1
  const from = rightwards ? actualX0 : actualX1
  const toDay = rightwards ? planX1 : planX0

  // GD-3: one line from a shape with no thickness.
  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[point(from, below), point(toDay, below)]]
  }
  // GD-2: two, from the actual bar's own top and bottom.
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [
    [point(from, top), point(toDay, top)],
    [point(from, bottom), point(toDay, bottom)],
  ]
}

/**
 * GR-9 / GR-17 / GR-18. FR-043 draws them only while nothing is started.
 *
 * ⛔ GR-9 DOES NOT STAND ON THE PLAN'S OWN START DAY. GR-3 (the plan start
 * point) is already there and stands higher in table T-023d's order, so a
 * dummy placed on that day could never be the one grabbed. FR-043 (MUST /
 * MUST NOT) puts it on the day AFTER, which is what lets the two be told
 * apart: the left of the pair widens the plan (starting earlier), the right
 * enters the actual start.
 *
 * ⚠️ BOTH STEPS ARE WORKED DAYS, per FR-043's MUST and FR-054, so they are
 * counted through the calendar rather than multiplied out -- stepping by
 * calendar days would land on a day nobody works. GR-17 is
 * `actualInitialDuration` along FROM GR-9's day, not from the plan's.
 *
 * ⛔ GR-18 STANDS ON THAT SAME DAY, NOT ON THE MILESTONE'S FIGURE. Table
 * T-023d gives it 「予定の開始日の翌稼働日」, 「`GR-9` と同じ場所である」, and
 * FR-043 (MUST NOT) says in as many words that the POSITION is not one of the
 * milestone's exceptions. ⭐ The figure itself has not moved -- LF-10 of table
 * T-221 still centres it on `start` -- so what parts here is the handle from
 * the shape, which is what keeps 「掴む所」 from reading as part of the figure.
 * ⚠️ TWO EXCEPTIONS REMAIN AND BOTH ARE ELSEWHERE: a milestone shows ONE point
 * rather than a pair (below), and its actual span is S-130 (`edit-task.ts`).
 *
 * ⚠️ A milestone WITHOUT a planned start now draws no dummy either, for the
 * same reason a bar without one draws none: the row names a day counted from
 * `start`, and there is no such day. FR-013 (MUST NOT) keeps such a Task off
 * the screen in the first place.
 *
 * ⚠️ `actualHeight` is HANDED IN, the way `guidesOf` is handed the same value:
 * the actual bar's band is one expression and `taskGeometryOf` has already
 * solved it. Recomputing it here would put it in two places.
 *
 * @purity pure
 */
function dummiesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   actualHeight: number): readonly DummyGeometry[] {
  if (placed.actualX !== null) return []
  const start = dayOf(task.start)
  if (start === null) return []
  const middle = placed.y + placed.planHeight / 2
  const from = nextWorkingDay(inputs.within, start)
  const fromX = xFromDay(inputs.layout, from)
  // GR-15: a milestone holds no actual BAR, so there is no second end for
  // GR-17 to stand for -- FR-043 (MUST) shows ONE point on it.
  if (placed.actualPlacement === 'sideways') {
    return [{ grab: 'GR-18', at: point(fromX, middle), height: actualHeight }]
  }
  const end = dateFromWorkingDays(inputs.within, from, inputs.settings.actualInitialDuration)
  return [
    { grab: 'GR-9', at: point(fromX, middle), height: actualHeight },
    { grab: 'GR-17', at: point(xFromDay(inputs.layout, end), middle), height: actualHeight },
  ]
}

/**
 * The top of the label's own box: table T-012's 「名称ラベルの縦位置」 column
 * (MUST), which is a column of that table and not a rule of table T-013.
 *
 * ⭐ THE TWO ANSWERS ARE KEYED ON `shapeKind` AND NOT ON `actualPlacement`.
 * The two columns agree on which shapes they name, and the closing paragraph
 * of table T-012 says in as many words that they are 「別の話である」: the
 * actual's column says where the actual BAR goes, this one where the LABEL
 * goes. Reading one off the other would make a later change to either quietly
 * move the other.
 *
 * ⭐ WHY SH-3 / SH-4 LIFT IT. A line has no inside, so a label centred on the
 * band lands on the plan line and on the actual line both. Lifting it leaves
 * the plan line between the label and the actual, and the three do not meet.
 *
 * ⭐ `placed.height` IS 「予定と実績を合わせた高さ」, ALREADY RESOLVED, and is
 * what the centred arm takes the middle of. `reservedHeight` answered it from
 * the very column of table T-012 that says where the actual goes: the plan
 * alone where the actual is laid inside it or shifted sideways, the plan plus
 * `actualGap` plus the actual where it is pushed below. ⛔ Summing those three
 * here instead would be a second spelling of that sum, and the two would part
 * company the first time `actualOfPlan` or `actualGap` moved.
 *
 * ⛔ S-196 IS READ FROM THE GENERATED BLOCK, never typed in. ⭐ AND IT IS
 * MEASURED FROM THE SHAPE'S OWN TOP EDGE, NOT FROM THE BAND: the row says it
 * is the gap between 「予定の図形の上端」 and the label's BOTTOM edge, and for
 * these two shapes the plan is a LINE that LF-7 lays down the middle of the
 * band it reserved -- so the band's own top is a good half plan height above
 * the shape and is not what the row names. The label's height comes off the
 * font, which is why the row holds the gap alone.
 *
 * ⭐ D-55 (裁定 C1, 2026-08-27): SH-3's head and SH-4's end dots reach higher
 * than the stroke alone -- the head is `arrowHeadOfStroke` times the stroke
 * tall and the dots have `spanDotOfStroke` for a radius -- so the row's edge
 * is the LARGER of the stroke's own half-weight and that head/dot half-height,
 * both centred on the same middle `lineBar` draws from. ⛔ Reading the stroke
 * alone (the pre-裁定 reading) left the label 1.08px into the arrow's head at
 * the defaults, because the head reaches well above the stroke's edge.
 *
 * @purity pure
 */
function labelTopOf(settings: DocumentSettings, placed: TaskPlacement, height: number): number {
  if (placed.shapeKind !== 'arrow' && placed.shapeKind !== 'endpointSpan') {
    return placed.y + (placed.height - height) / 2
  }
  // LF-7 and LF-8: the line runs down the middle of the plan's band at the
  // weight `thinStroke` answers -- the same two values `barOf` draws it from.
  const middle = placed.y + placed.planHeight / 2
  const stroke = thinStroke(placed.planHeight, settings)
  const halfExtent = Math.max(
    stroke / 2,
    lineEndHalfHeight(placed.shapeKind, placed.x, placed.x + placed.width, stroke, settings),
  )
  const shapeTop = middle - halfExtent
  return shapeTop - NOT_STORED_LABEL_SIZES['S-196'] - height
}

/**
 * GR-10's box. LC-6 already chose inside or right; table T-012 decides the
 * vertical, through `labelTopOf`.
 *
 * ⚠️ The type size is READ, never re-derived. FR-094 applies the text floor
 * (S-8) separately from the height floor and has `thinFontScale` (S-9)
 * multiply the thin shapes, so `planHeight x actualOfPlan x fontOfActual` is
 * not the answer -- and LC-5 measured the label with the value LC-6 stored,
 * so a second formula here would size the box against glyphs of another size.
 *
 * ⛔ THE HORIZONTAL OF BOTH ARMS IS UNTOUCHED BY TABLE T-012's column, which
 * says so itself (MUST NOT): `NL-1` and `NL-3` decide inside or right, and
 * that decision stands for SH-3 / SH-4 as well -- 「形状の中に書く」 there
 * means the label fits the width, since a line has no inside to write in.
 *
 * ⭐ THE BOX IS THE LABEL'S OWN, ON BOTH ARMS. It was the plan bar's whole
 * band on the inside arm, which is what put ZO-5's glyphs a fraction of a BAR
 * below its top rather than at the centre table T-012 asks for -- and the same
 * band is what GR-10 was double-clicking.
 *
 * @purity pure
 */
function labelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  const y = labelTopOf(settings, placed, height)
  // Table T-013 (MUST): a name written inside a fading shape begins where the
  // fade-in ends, and the room it is given is the shape's width less BOTH
  // fades. ⛔ The fade is the one mark that says the dates are not settled
  // (table T-012a) -- the user reported the name covering it -- and LC-6 judged
  // NL-1 against this same room, so a label that got here fits it.
  return placed.labelPlacement === 'inside'
    ? {
        x: placed.x + placed.fadeInPx + settings.labelPad,
        y,
        width: Math.max(
          0,
          placed.width - placed.fadeInPx - placed.fadeOutPx - settings.labelPad * 2,
        ),
        height,
      }
    : {
        x: placed.x + placed.width + settings.labelGap,
        y,
        width: Math.max(0, placed.occupiedX1 - (placed.x + placed.width) - settings.labelGap),
        height,
      }
}

/**
 * OC-2's two boxes: the assignee label nearest the bar, the percent label
 * beyond it, both jutting out to the LEFT -- 「左（バーの外側へ張り出す）」.
 *
 * ⭐ THE ROOM IS LC-7'S, NOT MEASURED AGAIN. `ScheduleLayout` estimated both
 * widths with FR-093 at the size LC-5 used, and counted the occupancy from
 * them; re-estimating here would draw glyphs the stacking never reserved room
 * for. The gap is `labelGap` (S-32), which S-135's own row calls 「形状の外へ
 * 出すラベル用」 -- these two are outside the shape.
 *
 * ⛔ DOWN THE BAND, NO ROW SETTLES THEM. Table T-012's 「名称ラベルの縦位置」
 * column is about the NAME label and table T-221 has no row for these two, so
 * the reading taken is LF-11's -- the one row that does place something outside
 * the bar puts it on 「予定バーの中心」, and the marker it places is OC-3, OC-2's
 * neighbour in the same table.
 * ⛔ WHICH OF THE TWO STANDS NEARER THE BAR IS NOT SETTLED EITHER: OC-2 gives
 * one cell to both and names them 「担当ラベルと完了率ラベル」, so they are laid
 * out in that order reading toward the bar.
 * @provisional PD-347
 *
 * @purity pure
 */
function outsideLabelBoxesOf(
  inputs: GeometryInputs,
  placed: TaskPlacement,
): { readonly assignee: ScreenRect | null; readonly percent: ScreenRect | null } {
  const gap = inputs.settings.labelGap
  const height = placed.labelFontSize
  const y = placed.y + placed.planHeight / 2 - height / 2
  let right = placed.x
  let assignee: ScreenRect | null = null
  let percent: ScreenRect | null = null
  if (placed.assigneeLabel !== '') {
    right -= gap + placed.assigneeLabelWidth
    assignee = { x: right, y, width: placed.assigneeLabelWidth, height }
  }
  if (placed.percentLabel !== '') {
    right -= gap + placed.percentLabelWidth
    percent = { x: right, y, width: placed.percentLabelWidth, height }
  }
  return { assignee, percent }
}

/** @purity pure */
function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry {
  const settings = inputs.settings
  const actualHeight = placed.planHeight * settings.actualOfPlan
  const planTop = placed.y

  const plan = inputs.showPlan
    ? barOf(inputs, placed, placed.x, placed.x + placed.width, planTop, placed.planHeight, false)
    : null

  let actual: BarGeometry | null = null
  if (inputs.showActual && placed.actualX !== null) {
    const x0 = placed.actualX
    if (placed.actualPlacement === 'sideways') {
      // LF-10: a smaller figure at the actual day, on the plan's centre line.
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(inputs, placed, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      // LF-9: centred inside, or pushed down by the plan plus the gap.
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(inputs, placed, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

  // GR-7 reads the dummies (its 未着手 clause hangs the marker off GR-17), so
  // they are settled once here rather than counted through the calendar twice.
  const dummies = dummiesOf(inputs, task, placed, actualHeight)
  const marker = markerOf(inputs, task, placed, dummies)
  const outside = outsideLabelBoxesOf(inputs, placed)
  const state = planActualState(task)
  const suspended = state === 'suspendedResumePlanned' || state === 'suspendedResumeUnknown'

  return {
    taskUid: placed.taskUid,
    shapeKind: placed.shapeKind,
    plan,
    actual,
    guides: guidesOf(inputs, task, placed, actualHeight),
    marker,
    // FR-044's icon follows the STATE, not the symbol: a suspended Task that
    // is also late shows (!) and must still say that it is suspended.
    resume: marker !== null && suspended ? resumeOf(inputs, task, marker, settings) : null,
    dummies,
    // GR-1 then GR-2, at the plan bar's top-left and bottom-right corners.
    // Two conditions gate them, and both are answered here.
    //
    // FD-5 of table T-012a gives them to the two shapes with thickness (SH-1 /
    // SH-2), which is exactly the set `actualPlacementOf` calls 'inside'.
    //
    // FR-075 (MUST) adds the second: the points show on the SELECTED Task and
    // on no other, and S-111 of table T-210 records that condition. The reason
    // FR-075 gives is that handles left out at all times put a row of dots on
    // tasks that use no fade -- selecting one is what asks for them.
    //
    // ⛔ NOT ALSO GATED ON THE TASK ALREADY HOLDING A FADE DAY. It was, for one
    // round, and PD-191 is the ruling that took it out: a Task with no fade yet
    // then had nothing to drag, so a fade could never be CREATED -- and FR-075
    // hands the author these two points precisely to set the days with.
    //
    // ⚠️ WHY THE SELECTION HAS TO BE THE GATE AND NOT THE DRAWING'S ALONE.
    // `itemAtPointer` gives GR-1 / GR-2 the TOP of table T-023d and asks every
    // Task for them before it asks any Task for GR-3 / GR-4. The hit test reads
    // only what this file emitted, so a pair emitted for an unselected Task
    // swallows a neighbour's plan-bar end and no bar can be resized by its
    // edge -- which is what a person met in the running app. Narrowing the
    // picture in the renderer would not have moved the hit area an inch.
    fadeHandles:
      placed.actualPlacement === 'inside' && inputs.selectedTaskUids.has(placed.taskUid)
        ? fadeHandlePoints(placed, planTop)
        : [],
    label: labelBoxOf(inputs, placed),
    assigneeLabel: outside.assignee,
    percentLabel: outside.percent,
  }
}

/** Table T-022's PL-1 to PL-5. Null means this Task gets no vertex. @purity pure */
function vertexXOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   statusDate: CalendarDay): number | null {
  /** @purity pure */
  const before = (text: string | null): number | null => {
    const day = dayOf(text)
    if (day === null || compareDays(day, statusDate) >= 0) return null
    return xFromDay(inputs.layout, day)
  }
  switch (planActualState(task)) {
    case 'finished':
      return null // PL-1
    case 'suspendedResumeUnknown':
      return null // PL-2
    case 'suspendedResumePlanned':
      return before(task.resume) // PL-3
    case 'notStarted':
      return before(task.start) // PL-4
    case 'inProgress':
      // PL-5: the actual bar's right end, which RV-1 has already put in pixels.
      return placed.actualX === null ? null : placed.actualX + placed.actualWidth
  }
}

/**
 * FR-014, with LF-12 supplying the heights. One unbroken polyline: it enters
 * at the status date above the first row, visits one vertex per lane, and
 * leaves at the status date below the last.
 *
 * @purity pure
 */
function progressLineOf(inputs: GeometryInputs): Path {
  const { layout, settings, statusDate } = inputs
  if (!settings.progressLineVisible || statusDate === null) return []
  const first = layout.rows[0]
  const last = layout.rows[layout.rows.length - 1]
  if (first === undefined || last === undefined) return []

  const baseX = xFromDay(layout, statusDate)
  const half = layout.rectangleHeight / 2
  // Bucketed by row AND lane in one pass. Bucketing by row alone leaves every
  // lane walking its whole row and skipping the other lanes' Tasks, which is
  // O(lanes x Tasks in the row) -- quadratic once a row's Tasks all overlap,
  // and NFR-013 forbids an O(n²) algorithm outright (MUST NOT).
  const byLane = new Map<string, TaskPlacement[][]>()
  for (const placed of layout.placements) {
    const lanes = byLane.get(placed.groupId) ?? []
    const held = lanes[placed.stack] ?? []
    held.push(placed)
    lanes[placed.stack] = held
    byLane.set(placed.groupId, lanes)
  }

  const points: Point[] = [point(baseX, first.y - settings.progressLineOverhang)]
  for (const row of layout.rows) {
    const lanes = byLane.get(row.groupId)
    // ⛔ NOT `stackTops`'s own order. That array is indexed by lane, and ST-5
    // lets S-58 -- whose default is the one that does it -- put lane 0 at the
    // BOTTOM of the band, after which it DESCENDS in y. `RowPlacement` says so
    // where it declares the member. Walking it by index sent the line down,
    // back up and down again inside one row, and FR-014 asks for a single
    // unbroken polyline running from its top end to its bottom end.
    const lanesByTop = row.stackTops
      .map((top, lane) => ({ top, lane }))
      .sort((a, b) => a.top - b.top)
    for (const { top, lane } of lanesByTop) {
      // Table T-022: one vertex per lane, and the most delayed -- the leftmost
      // -- wins when the lane holds more than one Task. A lane with none
      // passes through the status date so the line never breaks.
      let x: number | null = null
      for (const placed of lanes?.[lane] ?? []) {
        const task = inputs.taskByUid.get(placed.taskUid)
        if (task === undefined) continue
        const vertex = vertexXOf(inputs, task, placed, statusDate)
        if (vertex !== null && (x === null || vertex < x)) x = vertex
      }
      points.push(point(x ?? baseX, top + half))
    }
  }
  points.push(point(baseX, last.y + last.height + settings.progressLineOverhang))
  return points
}

/**
 * FR-019's HighlightBox. It surrounds only the rows that are drawn -- the
 * requirement says so in as many words -- so a box whose named rows were both
 * dropped falls back to the drawn extent rather than vanishing.
 *
 * ⚠️ Both edges are read on BOTH axes. FR-019's entrance does not decide
 * whether the top row may lie below the bottom one (EditAnnotation records the
 * gap in as many words and stores the pair as given), so an inverted range
 * reaches here, and a one-sided height would leave the last row of the range
 * outside its own box.
 *
 * @purity pure
 */
function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
  // One index for the whole pass: a find per edge per box is a linear scan of
  // the drawn rows, and this runs per frame.
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: HighlightGeometry[] = []
  for (const box of schedule.highlightBoxes) {
    const from = dayOf(box.startDate)
    const toDay = dayOf(box.endDate)
    if (from === null || toDay === null) continue
    const top =
      (box.topGroupId === null ? undefined : rowById.get(box.topGroupId)) ?? layout.rows[0]
    const bottom =
      (box.bottomGroupId === null ? undefined : rowById.get(box.bottomGroupId)) ??
      layout.rows[layout.rows.length - 1]
    if (top === undefined || bottom === undefined) continue
    const x0 = xFromDay(layout, from)
    const x1 = xFromDay(layout, toDay)
    const y = Math.min(top.y, bottom.y)
    out.push({
      id: box.id,
      box: {
        x: Math.min(x0, x1),
        y,
        width: Math.abs(x1 - x0),
        height: Math.max(top.y + top.height, bottom.y + bottom.height) - y,
      },
    })
  }
  return out
}

/**
 * Full-width counts two, half-width counts one. FR-093 forbids measuring the
 * glyphs (MUST NOT) and forbids keeping what a measurement returned (MUST NOT).
 *
 * ⚠️ THE THIRD COPY of this two-line rule. `schedule-layout.ts` holds one for
 * LC-5 and `row-title-panel.ts` holds the other for FR-085, and that one's note
 * gives the reason: one rule must keep one answer.
 * ⛔ Not imported. Neither copy is on its component's published member list in
 * table T-064 -- PI-5 does not publish `labelUnits` -- and Chapter 5.3 forbids
 * reaching past a folder's public entry, so importing it would mean widening a
 * published table for two lines. Rule 03's DRY points the other way; the copy
 * is the smaller wrong, and a fourth would mean the rule has earned a home.
 *
 * @purity pure
 */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

/**
 * FR-097's two breaks: the body's OWN newlines are line breaks whatever their
 * width, and what is left over is filled to S-182 units.
 *
 * ⚠️ A carriage return is folded into the newline first. An imported document
 * can carry CRLF, and FR-097 speaks of the break the author put in, not of the
 * bytes it arrived as.
 *
 * ⛔ A fill break may fall between ANY two characters. FR-097 sends the wrap to
 * S-182 and says nothing about word boundaries -- and S-182's own note, which
 * leaves an over-long word to the author, reads the other way. Breaking
 * anywhere is the reading that makes the count mean the same thing in a script
 * with no spaces, which is the case S-182's default (全角 64) is stated for.
 * @provisional PD-237
 *
 * @purity pure
 */
function wrappedLines(text: string, limit: number): readonly string[] {
  const out: string[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = ''
    let units = 0
    for (const character of paragraph) {
      const width = charUnits(character)
      if (units + width > limit && line !== '') {
        out.push(line)
        line = ''
        units = 0
      }
      line += character
      units += width
    }
    out.push(line)
  }
  return out
}

/**
 * FR-019's CommentBox, sized to its own text.
 *
 * ⭐ FR-097 states the whole sizing rule and this function does nothing beyond
 * it: the width is FR-093's estimate (units x font size x labelCoef, S-30) and
 * never a measurement, the wrap is S-182, the padding is S-181, the type size
 * is FR-039's fontScale through table T-215, and one line is as tall as the
 * type. Nothing here reads a glyph and nothing here keeps a measurement.
 *
 * ⛔ THE LEADER IS NOT BUILT -- see `CommentGeometry` and the head note.
 *
 * @purity pure
 */
function commentGeometry(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
): readonly CommentGeometry[] {
  // One index for the whole pass, for the reason `highlightGeometry` states.
  // ⭐ Built from `layout` alone, so an absent setting cannot reach it.
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: CommentGeometry[] = []
  // ⛔ NO SETTING IS READ BEFORE THE LOOP, and none may be. ⚠️ Hoisting
  // `fontScaleSizes[fontScale]` to the head threw on EVERY schedule holding no
  // comment box: this runs once a frame for every document, and a document that
  // draws no box must not have to carry the value that would size one.
  // ⭐ The rule is not about cost -- a value a frame does not use is a value
  // that frame must not require. `highlightGeometry` takes no settings at all
  // and never had the fault.
  for (const box of schedule.commentBoxes) {
    const day = dayOf(box.anchorDate)
    const row = box.anchorGroupId === null ? undefined : rowById.get(box.anchorGroupId)
    // ⛔ NOT `highlightGeometry`'s fallback to the drawn extent. That one exists
    // because UC-008 extension 4a asks a RANGE to shrink to the rows still
    // drawn; extension 2a asks a comment box whose row is collapsed or hidden
    // to be HIDDEN, and the note under table T-023a then keeps what was not
    // drawn out of the hit test as well.
    // ⚠️ AT-114 admits a null row and AT-113 a null date, so a box with either
    // becomes invisible and therefore unselectable -- a value in the document
    // with no way left to reach it. That is the honest consequence of the same
    // rule, and it is reported rather than papered over. @provisional PD-234
    if (day === null || row === undefined) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    let widest = 0
    for (const line of lines) widest = Math.max(widest, labelUnits(line))
    // ⛔ An empty body is the state CM-46 creates EVERY box in, and it has no
    // width of its own: 2 x S-181 alone is a box too small to aim at, which
    // would leave the commonest case unreachable. One full-width character is
    // the smallest extent FR-093's own count can name. @provisional PD-236
    if (widest === 0) widest = 2
    // FR-019 holds the offset in SCREEN px, so it is added after the axis and
    // never scaled -- the distance stays the same at every zoom.
    // ⭐ A box never dragged has no distance, which is why the fallback is zero
    // rather than a gap: any other default would put the body somewhere the
    // author did not. @provisional PD-232
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    // ⭐ FR-019 pins the box to a date and a ROW; a row is a band, and its
    // centre is the only point in it no other rule has already spoken for.
    // ⛔ Not the band's edges -- `highlightGeometry` takes those because FR-019
    // asks a highlight to ENCLOSE a range, which is a different rule.
    // @provisional PD-233
    const anchor = point(xFromDay(layout, day), row.y + row.height / 2)
    // FR-039's fontScale through table T-215, and S-181. Read here rather than
    // at the head, for the reason the loop's own note gives.
    const fontSize = settings.fontScaleSizes[settings.fontScale]
    const pad = settings.commentBoxPad
    out.push({
      id: box.id,
      anchor,
      body: {
        x: anchor.x + offset.dx,
        y: anchor.y + offset.dy,
        width: widest * fontSize * settings.labelCoef + 2 * pad,
        height: lines.length * fontSize + 2 * pad,
      },
      lines,
      fontSize,
    })
  }
  return out
}

/**
 * CU-2's two lines, placed on the time axis and run down the `Row Area`.
 *
 * ⭐ THE SAME TWO NUMBERS CU-1 IS GIVEN, and deliberately so: the status line
 * and these are the two cursors table T-029 puts in the document (CU-1 / CU-2),
 * and a reader comparing a measurement against the status date is comparing
 * lines that have to start and end together.
 *
 * ⛔ A DATE THAT WILL NOT READ DROPS THE PAIR RATHER THAN HALF OF IT. IV-13
 * (MUST) says both dates stand while the setting stands, so one that will not
 * read is a document that never met that invariant -- and drawing the surviving
 * line alone would show a measurement with one end invented.
 *
 * @purity pure
 */
function dualCursorGeometry(
  settings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
): DualCursorGeometry | null {
  const placed = settings.dualCursor
  if (placed === null) return null
  const first = dayOf(placed.date1)
  const second = dayOf(placed.date2)
  if (first === null || second === null) return null
  return {
    date1X: xFromDay(layout, first),
    date2X: xFromDay(layout, second),
    top: regions.rowArea.y,
    bottom: regions.rowArea.y + regions.rowArea.height,
  }
}

/**
 * Everything drawn, from what LC-1 to LC-9 already settled.
 *
 * ⚠️ `selection` is required and has no default. FR-075 (MUST) shows the fade
 * grab points on the selected Task alone, and the hit test can only be as
 * narrow as what this file emitted -- so a caller that forgot to say what is
 * selected would hand `itemAtPointer` a GR-1 on every Task, which is the very
 * occlusion PD-191 was raised for. ⭐ A caller that draws no selection says so
 * with `emptySelection()`: the export does exactly that, because EP-12 of
 * table T-076 keeps the selection out of an exported picture.
 *
 * @purity pure
 */
export function geometryFromLayout(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
  selection: Selection,
): ScheduleGeometry {
  const inputs: GeometryInputs = {
    settings,
    layout,
    within: workingCalendarOf(schedule),
    taskByUid: new Map(schedule.tasks.map((one) => [one.uid, one])),
    statusDate: dayOf(schedule.project.statusDate),
    showPlan: settings.planActualDisplay !== 'actual-only',
    showActual: settings.planActualDisplay !== 'plan-only',
    // SL-1 admits five kinds and only the Task ones can carry a fade handle.
    selectedTaskUids: new Set(
      selection.items.flatMap((one) => (one.kind === 'task' ? [one.uid] : [])),
    ),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push(taskGeometryOf(inputs, task, placed))
  }

  // LC-10. RT-4a drops a line whose either end this zoom did not draw.
  const placedByUid = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const dependencies: DependencyGeometry[] = []
  if (settings.dependencyVisible) {
    for (const successor of schedule.tasks) {
      const toDay = placedByUid.get(successor.uid)
      if (toDay === undefined) continue
      for (const link of successor.dependencies) {
        const from = placedByUid.get(link.predecessorUid)
        if (from !== undefined) dependencies.push(routedDependency(inputs, from, toDay, link.linkType))
      }
    }
  }

  return {
    tasks,
    dependencies,
    progressLine: progressLineOf(inputs),
    statusLine:
      inputs.statusDate === null
        ? null
        : {
            x: xFromDay(layout, inputs.statusDate),
            top: regions.rowArea.y,
            bottom: regions.rowArea.y + regions.rowArea.height,
          },
    dualCursor: dualCursorGeometry(settings, layout, regions),
    highlightBoxes: highlightGeometry(schedule, layout),
    commentBoxes: commentGeometry(schedule, settings, layout),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
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
 * ITS PICTURE DOES LEAVE THE TOOL -- EP-5 of table T-076 draws the
 * `Row Area`'s contents, the name label among them, into an exported
 * picture -- so what makes this the reader's own is not that the gap
 * is hidden but that the document keeps the label's ANCHOR (PR-13)
 * and never the gap the shape's own kind implies.
 */
export const NOT_STORED_LABEL_SIZES: {
  /** S-196, in px */
  readonly 'S-196': number
} = {
  'S-196': 2,
}
// </generated>

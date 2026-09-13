// ScheduleGeometry -- public entry of this folder.
//
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6
//
// The vertices of everything drawn on the schedule (CP-6): stages LC-10 and
// LC-11 of table T-068, and RV-5 of table T-069.
//
// Nothing here recomputes a placement (the MUST NOT after table T-068): every
// position is read from the ScheduleLayout or derived from table T-221.
//
// Not built here:
//   - the deadline mark (FR-045) and the days-late label (FR-047); ScheduleLayout
//     leaves the matching gap in its occupancy (OC-8 / OC-9 of table T-038).
//   - the comment box's leader (AT-111): no row says what either kind is drawn
//     as. `CommentGeometry.anchor` is where one would start.
//   - the guide cursor (CU-3 of table T-029) and the watermark (FR-020), which
//     `svg-renderer.ts` draws, and the baseline overlay (FR-015).
// The corners of the milestone figures are this file's own: see PND-2.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  compareDays,
  dateFromWorkingDays,
  dayOf,
  isDelayed,
  planActualState,
  nextWorkingDay,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import {
  // PI-5's, not a local copy: this file must measure against the axis the
  // layout was built from.
  xFromDay,
  type MilestoneGlyph,
  type ScheduleLayout,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../screen-regions/screen-regions'

/** A point of this layer's own: LR-6 keeps it off the browser's types. */
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

/** How one bar is drawn: an outline for SH-1 / SH-2 / SH-5, a line for SH-3 / SH-4. */
export type BarGeometry =
  | {
      readonly form: 'outline'
      /** Closed: the last point joins the first. */
      readonly points: Path
      /**
       * Closed outlines cut out of the silhouette (a face's eyes, a box's top
       * face); absent or empty where a glyph needs none. Built from the same
       * `side` as the silhouette, so they scale with it (see `share`).
       * Not grabbed: `itemAtPointer` tests the silhouette, since table T-023d
       * describes no hole in a milestone's grab area.
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

/** RV-5: a row of table T-021. */
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
  /** `resumeValid`; false is drawn at S-25. */
  readonly valid: boolean
  /**
   * Half of GR-8's hit square (S-22). Carried here, not with `PointerSlop`'s
   * table T-206 reaches, because S-22 is a stored document setting; GR-7's
   * size reaches the hit test the same way, as `MarkerGeometry.radius`.
   */
  readonly hitHalf: number
}

/** GR-9 / GR-17 / GR-18: FR-043's faint handles on a Task not started. */
export interface DummyGeometry {
  /** The row of table T-023d this one answers to. */
  readonly grab: 'GR-9' | 'GR-17' | 'GR-18'
  /** The day this handle stands on. Not what is grabbed: the hit test reads `ink`. */
  readonly at: Point
  /**
   * The one mark drawn for this Task (DM-2). Every dummy of one Task shares
   * `ink`, so the renderer and `item-hit-area.ts` (closing rule of table
   * T-023d) read one rectangle instead of each solving the width again.
   * Its height is the actual bar's band (S-180 sets the width alone), and its
   * left edge is GR-9's day column even on the GR-17 record.
   */
  readonly ink: ScreenRect
}

export interface TaskGeometry {
  readonly taskUid: number
  /** Carried through so a reader need not resolve AT-100 a second time. */
  readonly shapeKind: TaskPlacement['shapeKind']
  readonly plan: BarGeometry | null
  readonly actual: BarGeometry | null
  /**
   * The milestone's actual figure, for its dummy (DM-8); null on other shapes.
   * Carried apart because a dummy exists only while `actual` is null, and
   * `plan` is null while the plan is hidden. The renderer fits this outline
   * into the dummy's `ink`.
   */
  readonly milestoneFigure: BarGeometry | null
  /**
   * Whether the plan's two ends stand on one day (closing rule of table T-023d).
   * Relayed from ScheduleLayout, not derived from `plan`: S-49's floor makes a
   * zero-day plan as wide as a real span. The actual needs no such member,
   * since nothing floors its width. False when a plan date is absent.
   */
  readonly planEndsStandOnOneDay: boolean
  /** T-020a. Empty unless GD-1 holds. */
  readonly guides: readonly Path[]
  readonly marker: MarkerGeometry | null
  readonly resume: ResumeGeometry | null
  readonly dummies: readonly DummyGeometry[]
  /**
   * GR-1 then GR-2; empty unless FD-5's shapes and a selected Task (FR-075).
   * The hit test reads this list alone; the reasoning is in `taskGeometryOf`.
   */
  readonly fadeHandles: readonly Point[]
  /**
   * GR-10's target: the label's own box, one line of type high, not the band
   * (LC-6 across, table T-012 down). Null when the Task has no name.
   */
  readonly label: ScreenRect | null
  /**
   * GR-11's target: OC-2's one card (FR-090), left of the bar. Named for the
   * assignee because GR-11 claims it. Null only while S-60 and S-61 both hide
   * it, never for a Task with no assignee (AS-2 of table T-225).
   */
  readonly assigneeLabel: ScreenRect | null
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
  /** AT-122, in px and never scaled (S-132's note). Null draws no rounding. */
  readonly cornerRadiusPx: number | null
}

/**
 * FR-019's CommentBox, body only (FR-097). No leader: no row says what either
 * AT-111 kind is drawn as. `anchor` is where one would start, carried so the
 * hit test, a leader and a drag read one answer.
 */
export interface CommentGeometry {
  readonly id: string
  /** AT-113's date on the time axis, AT-114's row on the vertical one. */
  readonly anchor: Point
  /** What is drawn, and what GR-14 grabs. */
  readonly body: ScreenRect
  /** The body already broken into lines (FR-097). One entry is one line. */
  readonly lines: readonly string[]
  /** FR-097. */
  readonly fontSize: number
}

/**
 * CU-2's two measuring lines, placed. Null while `dualCursor` holds nothing;
 * IV-13 leaves no half-placed pair.
 * Which line follows the pointer is not here: that is session state (LY-5,
 * DC-8) and arrives as `svgFromSchedule`'s own parameter.
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
 * Not named "frame": that word is FrameLoop's tick or ScreenFrame's UF-61 region.
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
   * The selected Task uids (FR-075). A set built once per call, because
   * `isSelected` walks the list on every question and this is asked per Task.
   */
  readonly selectedTaskUids: ReadonlySet<number>
  /**
   * GR-9's day per distinct `Task.start` text. `nextWorkingDay` and
   * `dateFromWorkingDays` rebuild the calendar index on every call
   * (`indexOfCalendar` in `schedule.ts`), too costly per Task per frame at MC-7
   * scale. Not a cache: made and dropped inside one `geometryFromLayout` call;
   * holding it longer needs Chapter 5.6 to record its invalidation (R2.20).
   */
  readonly dummyFromByStart: Map<string, CalendarDay | null>
  /**
   * GR-17's day, keyed by the day it is counted from; kept apart so the
   * `sideways` road of `dummiesOf` does not pay for it.
   */
  readonly dummyEndByFrom: Map<string, CalendarDay>
}

// ---------------------------------------------------------------- shapes ----

/**
 * Table T-012a's four points. With both fades zero they are FD-4's rectangle,
 * so no branch is needed.
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
 * GR-1 and GR-2 on table T-012a's points 4 and 2, not the bounding box's
 * corners, which the polygon no longer has once a fade stands (FD-4).
 * The fades are the placement's clamped ones, the numbers `barOf` draws with.
 * On the time axis, not on a chevron's notch vertex, which `barOf` sets from
 * the larger fade and so stands at another day when the two differ.
 * @provisional PND-252
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
 * Every regular glyph shares this one circle, which is what gives S-48's area
 * order a meaning.
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
 * Corners of the 〇 among LF-10's regular glyphs. No row states a glyph's
 * vertices (S-48 gives the star's waist only; 図 F-019 draws palette icons).
 * The ◇ and □ are one square an eighth of a turn apart, so their areas match.
 * The 〇 is a polygon because `BarGeometry`'s outline carries a path only; an
 * arc form would change a type other units build against, for one figure.
 *
 * @provisional PND-2
 */
const CIRCLE_CORNERS = 24

/** @purity pure */

/**
 * A corner of a pictorial glyph, written as a share of the half-side. Every
 * number in `PICTORIAL` is a share of the `half` the regular glyphs use, so a
 * pictorial glyph matches their size at every zoom and holds no length of its own.
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
 * The silhouette of each pictorial glyph, and the outlines cut out of it. A
 * milestone is one filled shape, so cut-outs are what tell `box` from `hexagon`
 * and `smile` from `circle`.
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
  // A cube: the silhouette is a hexagon, so the top face is cut out.
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
  // Head and shoulders in one outline, joined at the neck.
  person: {
    body: [
      [-0.85, 1], [-0.85, 0.45], [-0.6, 0.05], [-0.25, -0.1],
      [-0.36, -0.3], [-0.36, -0.62], [0, -0.95], [0.36, -0.62],
      [0.36, -0.3], [0.25, -0.1], [0.6, 0.05], [0.85, 0.45], [0.85, 1],
    ],
    marks: [],
  },
  // Eyes and mouth on the circle (empty body: see `milestoneOutline`).
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
 * The marks cut out of a glyph, or none. @purity pure
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
  // An empty body means the circle outline, not no outline (`smile`).
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
      // An eighth of a turn from the ◇, which squares its sides with the axes.
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
 * How far SH-3's head or SH-4's end dot reaches above the stroke's middle, by
 * the LF-7 formulas `lineBar` also writes; `labelTopOf` needs the edge without
 * a `BarGeometry`. Change both together.
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
    // LF-8: the plan's height for both bars, not `height`.
    return lineBar(kind, x0, x1, top + height / 2, thinStroke(placed.planHeight, settings), settings)
  }
  // FD-6a. The plan's fades are read off the placement, not clamped again:
  // LC-6 judged NL-1 with the same numbers.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (kind === 'chevron') {
    // LF-6 and FD-5.
    const fadeNotch = Math.max(fade.fadeIn, fade.fadeOut)
    const planNotch = chevronNotch(placed.width, placed.planHeight, settings)
    const notch = fadeNotch > 0 ? fadeNotch : isActual ? planNotch * settings.actualOfPlan : planNotch
    return { form: 'outline', points: chevronOutline(x0, x1, top, height, notch) }
  }
  return { form: 'outline', points: fadedOutline(x0, x1, top, height, fade.fadeIn, fade.fadeOut) }
}

// -------------------------------------------------------------- the mark ----

/**
 * RV-5.
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
 * The right end LF-11 measures from (FR-013, GR-7), or null when nothing is
 * drawn to measure from.
 * The plan bar is not a candidate while the actual is shown: taking the
 * further-right of the two puts the marker at the plan's end on every late Task.
 * The reaches are read from `TaskPlacement`, where ScheduleLayout also lays out
 * table T-243's order, so the marker and the name label cannot part.
 *
 * @purity pure
 */
function markerAnchorX(inputs: GeometryInputs, placed: TaskPlacement): number | null {
  const planRight = placed.x + placed.width
  // FR-013: the plan alone is shown.
  if (!inputs.showActual) return inputs.showPlan ? planRight : null
  // GR-7: outside whichever figure reaches furthest -- the actual one is centred
  // on its own day (LF-10) and can stand past the plan -- and outside GR-18's
  // mark (OR-3). `actualReach` and `dummyReach` are never both set, so the
  // maximum needs no choice.
  if (placed.shapeKind === 'milestone') {
    return Math.max(planRight, placed.actualReach ?? planRight, placed.dummyReach ?? planRight)
  }
  // GR-7's not-started clause: outside the dummy's mark (OR-3).
  if (placed.dummyReach !== null) return placed.dummyReach
  // FR-013.
  if (placed.actualReach !== null) return placed.actualReach
  // No actual and no dummy: the Task holds no start date.
  return null
}

/**
 * LF-11's square and its symbol. The clearance is `markerGap` (S-23) alone,
 * measured from `markerAnchorX`, which already is the edge of the mark's hold;
 * no second width is added.
 *
 * @purity pure
 */
function markerOf(inputs: GeometryInputs, task: Task,
                  placed: TaskPlacement): MarkerGeometry | null {
  const settings = inputs.settings
  if (!settings.progressMarkerVisible) return null
  const anchorX = markerAnchorX(inputs, placed)
  if (anchorX === null) return null
  const radius = settings.markerSize / 2
  return {
    symbol: progressSymbolOf(task, inputs.statusDate),
    // LF-11: the plan bar's middle.
    centre: point(anchorX + settings.markerGap + radius, placed.y + placed.planHeight / 2),
    radius,
  }
}

/**
 * LF-13's arm and head at LF-11's place: the `resume` day's x, computed as
 * `vertexXOf` computes PL-3's vertex, or beside the marker without a `resume`.
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
    // LF-13.
    arm: [point(x, marker.centre.y + marker.radius), point(x, middle), point(x + arm, middle)],
    head: [
      point(x + arm, middle - head),
      point(x + arm + head, middle),
      point(x + arm, middle + head),
    ],
    valid,
    // S-22 unscaled: `side` carries S-25, and GR-8's hit box does not follow it.
    hitHalf: settings.markerSize / 2,
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
 * Table T-222 in its exit-right direction; `routedDependency` mirrors x for SF
 * and SS (the table's preamble).
 *
 * @purity pure
 */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DocumentSettings): {
  readonly pattern: DependencyGeometry['pattern']
  readonly points: Path
} {
  // LF-4.
  const entryRun = settings.dependencyArrowLength * settings.dependencyRunOfArrow
  const exitRun = entryRun - settings.dependencyArrowLength
  const x1 = from.edge + exitRun
  const sameLane = Math.abs(from.middle - to.middle) < 0.5
  const below = to.middle > from.middle

  if (sameSide(linkType)) {
    const x2 = to.edge + entryRun
    if (sameLane) {
      // RP-8.
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
    // RP-6 and RP-7: one turn-back at the further run clears both, so no clamp.
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
  // RP-1 needs the entry run alone: a straight line has no vertical to hold off.
  if (sameLane && to.edge - from.edge >= entryRun) {
    return { pattern: 'RP-1', points: [point(from.edge, from.middle), point(to.edge, to.middle)] }
  }
  if (!sameLane && x2 >= x1) {
    // RP-2 and RP-3.
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
  // RP-4 and RP-5; a same-lane route that failed RP-1 is RP-4.
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
 * The bar a dependency hangs on (FR-009).
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
  // Same-side links (DP-3 / DP-4) enter by their exit edge: after mirroring,
  // the right edge twice.
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
 * Table T-020a. GD-4 is judged before GD-1's overlap: milestone figures a day
 * apart overlap in pixels at ordinary zooms, so the row would never fire.
 *
 * @purity pure
 */
function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  actualHeight: number): readonly Path[] {
  const settings = inputs.settings
  // GD-1.
  if (!settings.planVisible || !settings.actualVisible || placed.actualX === null) return []
  const middle = placed.y + placed.planHeight / 2

  // GD-4.
  if (placed.actualPlacement === 'sideways') {
    const planDay = dayOf(task.start)
    const actualDay = dayOf(task.actualStart)
    if (planDay === null || actualDay === null) return []
    if (compareDays(planDay, actualDay) === 0) return []
    // GD-5: a point's near end is its centre (LF-10).
    return [[point(placed.actualX, middle), point(placed.x + placed.width / 2, middle)]]
  }

  // GD-1's other half: the two bars have come apart.
  const planX0 = placed.x
  const planX1 = placed.x + placed.width
  const actualX0 = placed.actualX
  const actualX1 = placed.actualX + placed.actualWidth
  if (actualX1 >= planX0 && actualX0 <= planX1) return []

  // GD-5.
  const rightwards = actualX0 > planX1
  const from = rightwards ? actualX0 : actualX1
  const toDay = rightwards ? planX1 : planX0

  // GD-3.
  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[point(from, below), point(toDay, below)]]
  }
  // GD-2.
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [
    [point(from, top), point(toDay, top)],
    [point(from, bottom), point(toDay, bottom)],
  ]
}

/**
 * GR-9's day (DM-1), once per distinct stored start. Keyed by the text, not the
 * day, because `dayOf` is part of the cost spared. A `null` answer is stored
 * too: `Map.get` returns `undefined` only for a key never seen.
 *
 * @purity pure
 */
function dummyFromOf(inputs: GeometryInputs, startText: string | null): CalendarDay | null {
  const key = startText ?? ''
  const held = inputs.dummyFromByStart.get(key)
  if (held !== undefined) return held
  const start = dayOf(startText)
  const made = start === null ? null : nextWorkingDay(inputs.within, start)
  inputs.dummyFromByStart.set(key, made)
  return made
}

/**
 * GR-17's day. One setting and one calendar per pass, so the day counted from
 * is the whole key; `textOfDay` spells it, since two equal `CalendarDay`
 * records are not one key.
 *
 * @purity pure
 */
function dummyEndOf(inputs: GeometryInputs, from: CalendarDay): CalendarDay {
  const key = textOfDay(from)
  const held = inputs.dummyEndByFrom.get(key)
  if (held !== undefined) return held
  const made = dateFromWorkingDays(inputs.within, from, inputs.settings.actualInitialDuration)
  inputs.dummyEndByFrom.set(key, made)
  return made
}

/**
 * GR-9 / GR-17 / GR-18 while nothing is started (FR-043, table T-240), stepped
 * through the calendar (FR-054). None without a planned start: no day to count from.
 * `actualHeight` is handed in from `taskGeometryOf`, not recomputed; it is also
 * the milestone square's side there, so both figures read one expression.
 *
 * @purity pure
 */
function dummiesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   actualHeight: number): readonly DummyGeometry[] {
  if (placed.actualX !== null) return []
  const from = dummyFromOf(inputs, task.start)
  if (from === null) return []
  const fromX = xFromDay(inputs.layout, from)
  const planMiddle = placed.y + placed.planHeight / 2

  // DM-7: one point on a milestone.
  if (placed.actualPlacement === 'sideways') {
    // DM-9: the square `taskGeometryOf`'s 'sideways' arm draws the actual figure
    // in, centred on the day's x and the plan's mid-line.
    const side = actualHeight
    const ink: ScreenRect = {
      x: fromX - side / 2,
      y: planMiddle - side / 2,
      width: side,
      height: side,
    }
    return [{ grab: 'GR-18', at: point(fromX, planMiddle), ink }]
  }

  // DM-3; no floor, since no row gives one.
  const width = Math.min(inputs.layout.pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
  // The band follows `actualPlacement` (LF-9), as `taskGeometryOf` places the
  // actual bar; the plan's mid-line would put an SH-3 / SH-4 dummy on the plan line.
  const top = placed.actualPlacement === 'below'
    ? placed.y + placed.planHeight + inputs.settings.actualGap
    : planMiddle - actualHeight / 2
  const middle = top + actualHeight / 2
  const ink: ScreenRect = { x: fromX, y: top, width, height: actualHeight }
  const end = dummyEndOf(inputs, from)
  return [
    { grab: 'GR-9', at: point(fromX, middle), ink },
    { grab: 'GR-17', at: point(xFromDay(inputs.layout, end), middle), ink },
  ]
}

/**
 * The top of the label's box, by table T-012's label column.
 * Keyed on `shapeKind`, not `actualPlacement`: the note under table T-012 keeps
 * the two columns separate, so neither may be read off the other.
 * `placed.height` is already `reservedHeight`'s plan-plus-actual height; summing
 * it again here would be a second copy.
 * For SH-3 / SH-4, S-196 is measured from the drawn shape's top, which the head
 * or end dots can raise above the stroke -- not from the band.
 *
 * @purity pure
 */
function labelTopOf(settings: DocumentSettings, placed: TaskPlacement, height: number): number {
  if (placed.shapeKind !== 'arrow' && placed.shapeKind !== 'endpointSpan') {
    return placed.y + (placed.height - height) / 2
  }
  // LF-7 / LF-8, as `barOf` draws the line.
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
 * GR-10's box: LC-6 chose inside or right, `labelTopOf` the vertical.
 * The type size is `placed.labelFontSize`, never re-derived: LC-5 measured with
 * it, and FR-094's separate floors make a fresh formula disagree.
 *
 * @purity pure
 */
function labelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  const y = labelTopOf(settings, placed, height)
  // Table T-013's fade paragraph; LC-6 judged NL-1 against this same room.
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
        // Read, not rebuilt as the shape's right edge plus `labelGap`: `labelX`
        // already clears OC-3 / OC-4 (table T-243), and LC-7 counted from it.
        x: placed.labelX,
        y,
        width: Math.max(0, placed.occupiedX1 - placed.labelX),
        height,
      }
}

/**
 * OC-2's one card (FR-090), its right edge `labelGap` left of the plan bar.
 * The width is ScheduleLayout's estimate (LC-7), not measured again, so the card
 * fits the room the stacking reserved.
 * The vertical is unsettled: table T-221 and table T-012's label column have no
 * row for this card, so it takes LF-11's plan-bar centre, as OC-3 beside it does.
 * @provisional PND-347
 *
 * @purity pure
 */
function outsideLabelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.outsideLabel === '') return null
  const height = placed.labelFontSize
  const width = placed.outsideLabelWidth
  return {
    x: placed.x - inputs.settings.labelGap - width,
    y: placed.y + placed.planHeight / 2 - height / 2,
    width,
    height,
  }
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
      // LF-10.
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(inputs, placed, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      // LF-9.
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(inputs, placed, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

  // `markerOf` reads `TaskPlacement.dummyReach`, not this list.
  const dummies = dummiesOf(inputs, task, placed, actualHeight)
  const marker = markerOf(inputs, task, placed)
  const outsideLabel = outsideLabelBoxOf(inputs, placed)
  const state = planActualState(task)
  const suspended = state === 'suspendedResumePlanned' || state === 'suspendedResumeUnknown'

  return {
    taskUid: placed.taskUid,
    shapeKind: placed.shapeKind,
    plan,
    actual,
    // Built with both bars hidden too (see `TaskGeometry.milestoneFigure`); the
    // plan's box only supplies a centre and a size, which the renderer refits.
    milestoneFigure:
      placed.shapeKind === 'milestone'
        ? barOf(inputs, placed, placed.x, placed.x + placed.width, planTop, placed.planHeight, true)
        : null,
    planEndsStandOnOneDay: placed.planEndsStandOnOneDay,
    guides: guidesOf(inputs, task, placed, actualHeight),
    marker,
    // The icon follows the state, not the symbol: a late suspended Task shows
    // (!) and is still suspended. Never on a milestone (LF-11); refused here,
    // not in the renderer, so the painter and the hit test read one member.
    resume:
      marker !== null && suspended && placed.shapeKind !== 'milestone'
        ? resumeOf(inputs, task, marker, settings)
        : null,
    dummies,
    // FD-5's shapes are exactly `actualPlacement === 'inside'`. Gated here on
    // the selection (FR-075), not only in the drawing: `itemAtPointer` asks
    // GR-1 / GR-2 of every Task before any GR-3 / GR-4, so a pair on an
    // unselected Task swallows a neighbour's plan-bar end. Not gated on a fade
    // already set, or no fade could ever be created.
    fadeHandles:
      placed.actualPlacement === 'inside' && inputs.selectedTaskUids.has(placed.taskUid)
        ? fadeHandlePoints(placed, planTop)
        : [],
    label: labelBoxOf(inputs, placed),
    assigneeLabel: outsideLabel,
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
      // PL-5: RV-1's right end, already in pixels.
      return placed.actualX === null ? null : placed.actualX + placed.actualWidth
  }
}

/**
 * FR-014's polyline, at LF-12's heights.
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
  // Bucketed by row and lane: by row alone each lane rescans its row, which is
  // quadratic once a row's Tasks overlap (NFR-013).
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
    // By top, not by lane index: with S-58 'up' the index descends in y
    // (`RowPlacement.stackTops`), which would zig-zag the line within a row.
    const lanesByTop = row.stackTops
      .map((top, lane) => ({ top, lane }))
      .sort((a, b) => a.top - b.top)
    for (const { top, lane } of lanesByTop) {
      // Table T-022.
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
 * FR-019's HighlightBox around the drawn rows only (UC-008 extension 4a), so a
 * named row that is not drawn falls back to the drawn extent.
 * Both edges go through min / max: rows are stored in tree order but drawn in
 * screen order (FR-019), and pinning (FR-098) can invert the two.
 *
 * @purity pure
 */
function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
  // One index per pass: a find per edge per box would rescan the rows every frame.
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
      // Not defaulted to S-132: CM-52 gives that to a new box, and a box that
      // states none draws none.
      cornerRadiusPx: box.cornerRadiusPx,
    })
  }
  return out
}

/**
 * FR-093's count. The same rule as PI-5's `labelUnits` in `schedule-layout.ts`;
 * change them together.
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
 * FR-097's two breaks: the body's own newlines, then filling to S-182 units.
 * CR and CRLF fold into a newline first, since an imported document may carry CRLF.
 * A fill break may fall between any two characters, so the count means the same
 * in a script with no spaces (S-182's note on over-long words reads otherwise).
 * @provisional PND-237
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
 * FR-019's CommentBox, sized by FR-097. No leader (see `CommentGeometry`).
 *
 * @purity pure
 */
function commentGeometry(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
): readonly CommentGeometry[] {
  // One index per pass, as in `highlightGeometry`.
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: CommentGeometry[] = []
  // No setting is read before the loop: a document with no comment box must not
  // need the values that size one (hoisting `fontScaleSizes[fontScale]` throws there).
  for (const box of schedule.commentBoxes) {
    const day = dayOf(box.anchorDate)
    const row = box.anchorGroupId === null ? undefined : rowById.get(box.anchorGroupId)
    // Not `highlightGeometry`'s fallback: UC-008 extension 2a hides a box whose
    // row is not drawn (4a shrinks a range). A null date or row (AT-113 /
    // AT-114) therefore leaves the box unreachable. @provisional PND-234
    if (day === null || row === undefined) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    let widest = 0
    for (const line of lines) widest = Math.max(widest, labelUnits(line))
    // An empty body (every box CM-46 creates) would be padding alone, too small
    // to aim at. @provisional PND-236
    if (widest === 0) widest = 2
    // Screen px, added after the axis and never scaled. A box never dragged has
    // no distance, so the fallback is zero. @provisional PND-232
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    // The row band's centre: no other rule speaks for it, while the edges are
    // what a highlight encloses. @provisional PND-233
    const anchor = point(xFromDay(layout, day), row.y + row.height / 2)
    const fontSize = settings.fontScaleSizes[settings.fontScale]
    const pad = settings.commentBoxPad
    const width = widest * fontSize * settings.labelCoef + 2 * pad
    const height = lines.length * fontSize + 2 * pad
    // FR-019: the offset names the body's bottom-left corner, so `y` is lifted
    // by the height.
    out.push({
      id: box.id,
      anchor,
      body: {
        x: anchor.x + offset.dx,
        y: anchor.y + offset.dy - height,
        width,
        height,
      },
      lines,
      fontSize,
    })
  }
  return out
}

/**
 * CU-2's two lines, spanning the `Row Area` exactly as CU-1's status line does,
 * so lines compared against the status date start and end together.
 * A date that does not read drops the pair (IV-13): one line alone would show a
 * measurement with one end invented.
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
 * Everything drawn, from what LC-1 to LC-9 settled.
 * `selection` has no default: a forgotten one would give `itemAtPointer` a GR-1
 * on every Task. The export passes `emptySelection()` (EP-12 of table T-076).
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
    showPlan: settings.planVisible,
    showActual: settings.actualVisible,
    // Only Task selections carry a fade handle.
    selectedTaskUids: new Set(
      selection.items.flatMap((one) => (one.kind === 'task' ? [one.uid] : [])),
    ),
    // Per call only: see `GeometryInputs.dummyFromByStart`.
    dummyFromByStart: new Map<string, CalendarDay | null>(),
    dummyEndByFrom: new Map<string, CalendarDay>(),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push(taskGeometryOf(inputs, task, placed))
  }

  // LC-10; RT-4a drops a line whose end is not placed.
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
// </generated>

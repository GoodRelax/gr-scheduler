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
//   - the assignee and percent labels (OC-2 of table T-038), the deadline mark
//     (FR-045) and the days-late label (FR-047). Table T-042 puts them at M3
//     and M4, and ScheduleLayout carries the matching gap in its occupancy.
//   - the comment box body. The source has no column for its size and FR-093
//     forbids measuring the text, so there is nothing to derive one from. M4
//     decides it together with the column.
//   - the guide and dual cursors. `dualCursor`'s two dates hold `unknown` in
//     the source, so there is no value to read.
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
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type {
  MilestoneGlyph,
  ScheduleLayout,
  ShapeKind,
  TaskPlacement,
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
  /** GR-1 then GR-2. Empty unless the shape has thickness (FD-5). */
  readonly fadeHandles: readonly Point[]
  /** GR-10's target: where LC-6 put the name. Null when the Task has no name. */
  readonly label: ScreenRect | null
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

export interface ScheduleGeometry {
  readonly tasks: readonly TaskGeometry[]
  readonly dependencies: readonly DependencyGeometry[]
  /** FR-014's unbroken polyline. Empty when no status date is set. */
  readonly progressLine: Path
  /** CU-1. Null when `Project.statusDate` holds nothing. */
  readonly statusLine: { readonly x: number; readonly top: number; readonly bottom: number } | null
  readonly highlightBoxes: readonly HighlightGeometry[]
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
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
}

/** @purity pure */
function xOfDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return layout.originX + (serialOf(day) - serialOf(origin)) * layout.pxPerDay
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
 * FD-6 and FD-6b in pixels: the rectangle lets `fadeIn` win and cuts `fadeOut`
 * to what is left, the chevron shrinks both by one ratio.
 *
 * ⚠️ RC-7 records that the two rules differing has no basis and asks for them
 * to be squared up against a real screen. Until that happens this file keeps
 * each where its own row put it.
 *
 * @purity pure
 */
function clampedFade(task: Task, kind: ShapeKind, span: number, pxPerDay: number): {
  readonly fadeIn: number
  readonly fadeOut: number
} {
  const asPixels = (days: number | null): number => Math.max(0, (days ?? 0) * pxPerDay)
  const rawIn = asPixels(task.fadeInDays)
  const rawOut = asPixels(task.fadeOutDays)
  if (rawIn + rawOut <= span) return { fadeIn: rawIn, fadeOut: rawOut }
  if (kind === 'chevron') {
    const ratio = span / (rawIn + rawOut)
    return { fadeIn: rawIn * ratio, fadeOut: rawOut * ratio }
  }
  const fadeIn = Math.min(rawIn, span)
  return { fadeIn, fadeOut: Math.min(rawOut, span - fadeIn) }
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
  for (let i = 0; i < count; i += 1) {
    const turn = startTurn + i / count
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
function milestoneOutline(
  centre: Point,
  side: number,
  glyph: MilestoneGlyph,
  starInnerOfOuter: number,
): Path {
  const half = side / 2
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
      for (let i = 0; i < 5; i += 1) {
        out.push(outer[i]!, waist[i]!)
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
function barOf(inputs: GeometryInputs, placed: TaskPlacement, task: Task, x0: number, x1: number,
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
    }
  }
  if (kind === 'arrow' || kind === 'endpointSpan') {
    // LF-8 reads the PLAN height for both bars, so the two lines hold one
    // weight the way LF-6 makes the two chevrons hold one angle.
    return lineBar(kind, x0, x1, top + height / 2, thinStroke(placed.planHeight, settings), settings)
  }
  // FD-6a: no fade on the actual. It records what happened, which is not vague.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : clampedFade(task, kind, x1 - x0, inputs.layout.pxPerDay)
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
 * LF-11's square, and the symbol it carries.
 *
 * FR-013 anchors on the actual bar's right end, and on the plan bar's right end
 * while only the plan is displayed (MUST). Table T-023d's GR-7 states the two
 * remaining places in its own words: 実績バーの右端の外側。未着手のときは終了点の
 * 掴みシロの外側、マイルストーンのときは図形の外側.
 *
 * A milestone needs no branch -- LF-10 makes its plan figure's right edge the
 * outside of the figure already. A Task not started does: it has no actual bar,
 * so FR-043's two dummies stand in for that bar's ends -- 掴みシロは実績バーの
 * 両端に、マーカーはその右端の外側にあり、位置が重ならない -- and the marker
 * hangs off GR-17 rather than off the plan, which is why FR-013 draws it faint
 * beside the faint dummies rather than out at the end of the plan bar.
 *
 * ⛔ The clearance is `markerGap` alone, which is every distance the document
 * holds: S-23 calls it 端点の掴み代と重ならない最小距離 and forbids going any
 * further. The dummy's own grab allowance is S-93 (30 x 20px), and table T-206
 * keeps it OUT of the document on purpose -- it reaches ItemHitArea as an
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
  const radius = settings.markerSize / 2
  const middle = placed.y + placed.planHeight / 2
  const symbol = progressSymbolOf(task, inputs.statusDate)

  // GR-7's 未着手 clause. A milestone carries GR-18 and no GR-17 (it holds no
  // actual bar at all -- GR-15), so the milestone clause falls through to the
  // figure's own right edge below, and so does FR-013's plan-only MUST.
  const endpoint = inputs.showActual ? dummies.find((one) => one.grab === 'GR-17') : undefined
  if (endpoint !== undefined) {
    return { symbol, centre: point(endpoint.at.x + settings.markerGap + radius, middle), radius }
  }

  const right: number[] = []
  if (inputs.showPlan) right.push(placed.x + placed.width)
  if (inputs.showActual && placed.actualX !== null) {
    right.push(placed.actualX + placed.actualWidth)
  }
  if (right.length === 0) return null
  return { symbol, centre: point(Math.max(...right) + settings.markerGap + radius, middle), radius }
}

/** LF-13. @purity pure */
function resumeOf(task: Task, marker: MarkerGeometry, settings: DocumentSettings): ResumeGeometry {
  const valid = task.resumeValid !== false
  const side = settings.markerSize * (valid ? 1 : settings.resumeScaleInvalid)
  const x = marker.centre.x + marker.radius + settings.markerGap
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
  const to = rightwards ? planX1 : planX0

  // GD-3: one line from a shape with no thickness.
  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[point(from, below), point(to, below)]]
  }
  // GD-2: two, from the actual bar's own top and bottom.
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [
    [point(from, top), point(to, top)],
    [point(from, bottom), point(to, bottom)],
  ]
}

/**
 * GR-9 / GR-17 / GR-18. FR-043 draws them only while nothing is started.
 *
 * ⚠️ GR-17 sits `actualInitialDuration` WORKED days along, per FR-043's MUST,
 * so it is counted through the calendar rather than multiplied out -- stepping
 * by calendar days would land it on a day nobody works.
 *
 * @purity pure
 */
function dummiesOf(inputs: GeometryInputs, task: Task,
                   placed: TaskPlacement): readonly DummyGeometry[] {
  if (placed.actualX !== null) return []
  const middle = placed.y + placed.planHeight / 2
  if (placed.actualPlacement === 'sideways') {
    return [{ grab: 'GR-18', at: point(placed.x + placed.width / 2, middle) }]
  }
  const start = dayOf(task.start)
  if (start === null) return []
  const end = dateFromWorkingDays(inputs.within, start, inputs.settings.actualInitialDuration)
  return [
    { grab: 'GR-9', at: point(xOfDay(inputs.layout, start), middle) },
    { grab: 'GR-17', at: point(xOfDay(inputs.layout, end), middle) },
  ]
}

/**
 * GR-10's box. LC-6 already chose inside or right.
 *
 * ⚠️ The type size is READ, never re-derived. FR-094 applies the text floor
 * (S-8) separately from the height floor and has `thinFontScale` (S-9)
 * multiply the thin shapes, so `planHeight x actualOfPlan x fontOfActual` is
 * not the answer -- and LC-5 measured the label with the value LC-6 stored,
 * so a second formula here would size the box against glyphs of another size.
 *
 * @purity pure
 */
function labelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  return placed.labelPlacement === 'inside'
    ? {
        x: placed.x + settings.labelPad,
        y: placed.y,
        width: Math.max(0, placed.width - settings.labelPad * 2),
        height: placed.planHeight,
      }
    : {
        x: placed.x + placed.width + settings.labelGap,
        y: placed.y + (placed.planHeight - height) / 2,
        width: Math.max(0, placed.occupiedX1 - (placed.x + placed.width) - settings.labelGap),
        height,
      }
}

/** @purity pure */
function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry {
  const settings = inputs.settings
  const actualHeight = placed.planHeight * settings.actualOfPlan
  const planTop = placed.y

  const plan = inputs.showPlan
    ? barOf(inputs, placed, task, placed.x, placed.x + placed.width, planTop, placed.planHeight, false)
    : null

  let actual: BarGeometry | null = null
  if (inputs.showActual && placed.actualX !== null) {
    const x0 = placed.actualX
    if (placed.actualPlacement === 'sideways') {
      // LF-10: a smaller figure at the actual day, on the plan's centre line.
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(inputs, placed, task, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      // LF-9: centred inside, or pushed down by the plan plus the gap.
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(inputs, placed, task, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

  // GR-7 reads the dummies (its 未着手 clause hangs the marker off GR-17), so
  // they are settled once here rather than counted through the calendar twice.
  const dummies = dummiesOf(inputs, task, placed)
  const marker = markerOf(inputs, task, placed, dummies)
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
    resume: marker !== null && suspended ? resumeOf(task, marker, settings) : null,
    dummies,
    // FD-5 gives the handles to the two shapes with thickness only. FR-075
    // then shows them on the selected Task alone, which the renderer decides.
    fadeHandles:
      placed.actualPlacement === 'inside'
        ? [point(placed.x, planTop), point(placed.x + placed.width, planTop + placed.planHeight)]
        : [],
    label: labelBoxOf(inputs, placed),
  }
}

/** Table T-022's PL-1 to PL-5. Null means this Task gets no vertex. @purity pure */
function vertexXOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   statusDate: CalendarDay): number | null {
  /** @purity pure */
  const before = (text: string | null): number | null => {
    const day = dayOf(text)
    if (day === null || compareDays(day, statusDate) >= 0) return null
    return xOfDay(inputs.layout, day)
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

  const baseX = xOfDay(layout, statusDate)
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
    row.stackTops.forEach((top, lane) => {
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
    })
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
    const to = dayOf(box.endDate)
    if (from === null || to === null) continue
    const top =
      (box.topGroupId === null ? undefined : rowById.get(box.topGroupId)) ?? layout.rows[0]
    const bottom =
      (box.bottomGroupId === null ? undefined : rowById.get(box.bottomGroupId)) ??
      layout.rows[layout.rows.length - 1]
    if (top === undefined || bottom === undefined) continue
    const x0 = xOfDay(layout, from)
    const x1 = xOfDay(layout, to)
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
 * Everything drawn, from what LC-1 to LC-9 already settled.
 *
 * @purity pure
 */
export function geometryFromLayout(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
): ScheduleGeometry {
  const inputs: GeometryInputs = {
    settings,
    layout,
    within: workingCalendarOf(schedule),
    taskByUid: new Map(schedule.tasks.map((one) => [one.uid, one])),
    statusDate: dayOf(schedule.project.statusDate),
    showPlan: settings.planActualDisplay !== 'actual-only',
    showActual: settings.planActualDisplay !== 'plan-only',
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
      const to = placedByUid.get(successor.uid)
      if (to === undefined) continue
      for (const link of successor.dependencies) {
        const from = placedByUid.get(link.predecessorUid)
        if (from !== undefined) dependencies.push(routedDependency(inputs, from, to, link.linkType))
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
            x: xOfDay(layout, inputs.statusDate),
            top: regions.rowArea.y,
            bottom: regions.rowArea.y + regions.rowArea.height,
          },
    highlightBoxes: highlightGeometry(schedule, layout),
  }
}

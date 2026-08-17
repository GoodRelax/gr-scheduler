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
//   - seven of the eight milestone figures. `milestoneGlyph` is an enumeration
//     of eight whose members the source marks undecided, so the spellings do
//     not exist yet. Every milestone is drawn as the ◇ that table T-012's SH-5
//     names first; inventing the other seven strings would put values in the
//     implementation that the specification does not hold.
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
import type { ScheduleLayout, TaskPlacement } from '../schedule-layout/schedule-layout'
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
function at(x: number, y: number): Point {
  return { x, y }
}

/** What every stage below reads. Assembled once, never rebuilt. */
interface Frame {
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
  return [at(x0, bottom), at(x1 - fadeOut, bottom), at(x1, top), at(x0 + fadeIn, top)]
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
function clampedFade(task: Task, kind: string, span: number, pxPerDay: number): {
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
    at(x0, top),
    at(x1 - notch, top),
    at(x1, middle),
    at(x1 - notch, bottom),
    at(x0, bottom),
    at(x0 + notch, middle),
  ]
}

/** LF-10's figure. Only the ◇ is drawn -- see the block at the top of the file. @purity pure */
function milestoneOutline(centre: Point, side: number): Path {
  const half = side / 2
  return [
    at(centre.x, centre.y - half),
    at(centre.x + half, centre.y),
    at(centre.x, centre.y + half),
    at(centre.x - half, centre.y),
  ]
}

/** LF-8. @purity pure */
function thinStroke(planHeight: number, settings: DocumentSettings): number {
  return Math.max(
    settings.thinStrokeMin,
    Math.min(settings.thinStrokeMax, planHeight * settings.thinStrokeOfPlan),
  )
}

/** One bar of a shape without thickness (SH-3 or SH-4), by LF-7. @purity pure */
function lineBar(kind: string, x0: number, x1: number, middle: number, stroke: number,
                 settings: DocumentSettings): BarGeometry {
  if (kind === 'arrow') {
    const head = Math.min(stroke * settings.arrowHeadOfStroke, (x1 - x0) * settings.arrowHeadOfSpan)
    return {
      form: 'line',
      from: at(x0, middle),
      to: at(x1 - head, middle),
      strokeWidth: stroke,
      head: [at(x1, middle), at(x1 - head, middle - head / 2), at(x1 - head, middle + head / 2)],
      dots: [],
    }
  }
  const radius = stroke * settings.spanDotOfStroke
  return {
    form: 'line',
    from: at(x0, middle),
    to: at(x1, middle),
    strokeWidth: stroke,
    head: null,
    dots: [{ at: at(x0, middle), radius }, { at: at(x1, middle), radius }],
  }
}

/**
 * One bar, plan or actual, of any of the five shapes.
 *
 * @purity pure
 */
function barOf(frame: Frame, placed: TaskPlacement, task: Task, x0: number, x1: number,
               top: number, height: number, isActual: boolean): BarGeometry {
  const settings = frame.settings
  const kind = placed.shapeKind
  if (kind === 'milestone') {
    return { form: 'outline', points: milestoneOutline(at((x0 + x1) / 2, top + height / 2), height) }
  }
  if (kind === 'arrow' || kind === 'endpointSpan') {
    // LF-8 reads the PLAN height for both bars, so the two lines hold one
    // weight the way LF-6 makes the two chevrons hold one angle.
    return lineBar(kind, x0, x1, top + height / 2, thinStroke(placed.planHeight, settings), settings)
  }
  // FD-6a: no fade on the actual. It records what happened, which is not vague.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : clampedFade(task, kind, x1 - x0, frame.layout.pxPerDay)
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

/** RV-5: table T-021, with PM-4 winning whenever it holds. @purity pure */
export function progressSymbolOf(task: Task, statusDate: CalendarDay | null): ProgressSymbol {
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

/** LF-11's square, and the symbol it carries. @purity pure */
function markerOf(frame: Frame, task: Task, placed: TaskPlacement): MarkerGeometry | null {
  const settings = frame.settings
  if (!settings.progressMarkerVisible) return null
  // FR-013 anchors on the actual bar's right end, or the plan's when only the
  // plan is drawn. GR-7 puts a milestone's outside its figure, which is what
  // the plan's own right edge already is.
  const right: number[] = []
  if (frame.showPlan) right.push(placed.x + placed.width)
  if (frame.showActual && placed.actualX !== null) right.push(placed.actualX + placed.actualWidth)
  if (right.length === 0) return null
  const radius = settings.markerSize / 2
  return {
    symbol: progressSymbolOf(task, frame.statusDate),
    centre: at(Math.max(...right) + settings.markerGap + radius, placed.y + placed.planHeight / 2),
    radius,
  }
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
    arm: [at(x, marker.centre.y + marker.radius), at(x, middle), at(x + arm, middle)],
    head: [at(x + arm, middle - head), at(x + arm + head, middle), at(x + arm, middle + head)],
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
          at(from.edge, from.middle),
          at(outward, from.middle),
          at(outward, corridor),
          at(x2, corridor),
          at(x2, to.middle),
          at(to.edge, to.middle),
        ],
      }
    }
    // RP-6 and RP-7: one turn-back clears both runs at once, so neither a
    // branch nor a clamp is needed.
    const back = Math.max(x1, x2)
    return {
      pattern: below ? 'RP-6' : 'RP-7',
      points: [
        at(from.edge, from.middle),
        at(back, from.middle),
        at(back, to.middle),
        at(to.edge, to.middle),
      ],
    }
  }

  const x2 = to.edge - entryRun
  // RP-1 asks for the entry run alone: a route of one horizontal line has no
  // vertical for the exit run to hold away from the edge.
  if (sameLane && to.edge - from.edge >= entryRun) {
    return { pattern: 'RP-1', points: [at(from.edge, from.middle), at(to.edge, to.middle)] }
  }
  if (!sameLane && x2 >= x1) {
    // RP-2 and RP-3: fold at the midpoint, held inside [x1, x2].
    const mid = Math.max(x1, Math.min((from.edge + to.edge) / 2, x2))
    return {
      pattern: below ? 'RP-2' : 'RP-3',
      points: [
        at(from.edge, from.middle),
        at(mid, from.middle),
        at(mid, to.middle),
        at(to.edge, to.middle),
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
      at(from.edge, from.middle),
      at(x1, from.middle),
      at(x1, corridor),
      at(x2, corridor),
      at(x2, to.middle),
      at(to.edge, to.middle),
    ],
  }
}

/**
 * FR-009: a dependency hangs on the plan geometry, and on the actual only
 * while the plan is not drawn.
 *
 * @purity pure
 */
function attachedBar(frame: Frame, placed: TaskPlacement): { readonly x: number; readonly width: number } {
  return !frame.showPlan && placed.actualX !== null
    ? { x: placed.actualX, width: placed.actualWidth }
    : { x: placed.x, width: placed.width }
}

/** @purity pure */
function routedDependency(frame: Frame, from: TaskPlacement, to: TaskPlacement,
                          linkType: number): DependencyGeometry {
  const right = exitsRight(linkType)
  const sign = right ? 1 : -1
  // DP-1 exits right and enters left; DP-2 mirrors it. DP-3 and DP-4 use the
  // same edge at both ends, which after mirroring is the right one twice.
  const entryRight = sameSide(linkType) ? right : !right
  const anchor = (placed: TaskPlacement, edgeRight: boolean): Anchored => {
    const bar = attachedBar(frame, placed)
    return {
      edge: sign * (edgeRight ? bar.x + bar.width : bar.x),
      middle: placed.y + placed.planHeight / 2,
      top: placed.y,
      bottom: placed.y + placed.planHeight,
    }
  }
  const route = routeOf(anchor(from, right), anchor(to, entryRight), linkType, frame.settings)
  return {
    predecessorUid: from.taskUid,
    successorUid: to.taskUid,
    linkType,
    pattern: route.pattern,
    points: route.points.map((point) => at(sign * point.x, point.y)),
  }
}

// ------------------------------------------------------------- the whole ----

/** @purity pure */
function guidesOf(frame: Frame, placed: TaskPlacement, actualHeight: number): readonly Path[] {
  const settings = frame.settings
  // GD-1: only with both bars on screen, and only once they have come apart.
  if (settings.planActualDisplay !== 'both' || placed.actualX === null) return []
  const planX0 = placed.x
  const planX1 = placed.x + placed.width
  const actualX0 = placed.actualX
  const actualX1 = placed.actualX + placed.actualWidth
  if (actualX1 >= planX0 && actualX0 <= planX1) return []

  // GD-5: the gap alone, from the actual's near end to the plan's near end.
  const rightwards = actualX0 > planX1
  const from = rightwards ? actualX0 : actualX1
  const to = rightwards ? planX1 : planX0
  const middle = placed.y + placed.planHeight / 2

  // GD-4: a milestone is a point, so one line and no notion of overlap.
  if (placed.actualPlacement === 'sideways') return [[at(from, middle), at(to, middle)]]
  // GD-3: one line from a shape with no thickness.
  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[at(from, below), at(to, below)]]
  }
  // GD-2: two, from the actual bar's own top and bottom.
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [[at(from, top), at(to, top)], [at(from, bottom), at(to, bottom)]]
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
function dummiesOf(frame: Frame, task: Task, placed: TaskPlacement): readonly DummyGeometry[] {
  if (placed.actualX !== null) return []
  const middle = placed.y + placed.planHeight / 2
  if (placed.actualPlacement === 'sideways') {
    return [{ grab: 'GR-18', at: at(placed.x + placed.width / 2, middle) }]
  }
  const start = dayOf(task.start)
  if (start === null) return []
  const end = dateFromWorkingDays(frame.within, start, frame.settings.actualInitialDuration)
  return [
    { grab: 'GR-9', at: at(xOfDay(frame.layout, start), middle) },
    { grab: 'GR-17', at: at(xOfDay(frame.layout, end), middle) },
  ]
}

/** GR-10's box. LC-6 already chose inside or right. @purity pure */
function labelBoxOf(frame: Frame, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const settings = frame.settings
  const height = placed.planHeight * settings.actualOfPlan * settings.fontOfActual
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
function taskGeometryOf(frame: Frame, task: Task, placed: TaskPlacement): TaskGeometry {
  const settings = frame.settings
  const actualHeight = placed.planHeight * settings.actualOfPlan
  const planTop = placed.y

  const plan = frame.showPlan
    ? barOf(frame, placed, task, placed.x, placed.x + placed.width, planTop, placed.planHeight, false)
    : null

  let actual: BarGeometry | null = null
  if (frame.showActual && placed.actualX !== null) {
    const x0 = placed.actualX
    if (placed.actualPlacement === 'sideways') {
      // LF-10: a smaller figure at the actual day, on the plan's centre line.
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(frame, placed, task, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      // LF-9: centred inside, or pushed down by the plan plus the gap.
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(frame, placed, task, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

  const marker = markerOf(frame, task, placed)
  const state = planActualState(task)
  const suspended = state === 'suspendedResumePlanned' || state === 'suspendedResumeUnknown'

  return {
    taskUid: placed.taskUid,
    shapeKind: placed.shapeKind,
    plan,
    actual,
    guides: guidesOf(frame, placed, actualHeight),
    marker,
    // FR-044's icon follows the STATE, not the symbol: a suspended Task that
    // is also late shows (!) and must still say that it is suspended.
    resume: marker !== null && suspended ? resumeOf(task, marker, settings) : null,
    dummies: dummiesOf(frame, task, placed),
    // FD-5 gives the handles to the two shapes with thickness only. FR-075
    // then shows them on the selected Task alone, which the renderer decides.
    fadeHandles:
      placed.actualPlacement === 'inside'
        ? [at(placed.x, planTop), at(placed.x + placed.width, planTop + placed.planHeight)]
        : [],
    label: labelBoxOf(frame, placed),
  }
}

/** Table T-022's PL-1 to PL-5. Null means this Task gets no vertex. @purity pure */
function vertexXOf(frame: Frame, task: Task, placed: TaskPlacement,
                   statusDate: CalendarDay): number | null {
  const before = (text: string | null): number | null => {
    const day = dayOf(text)
    if (day === null || compareDays(day, statusDate) >= 0) return null
    return xOfDay(frame.layout, day)
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
function progressLineOf(frame: Frame): Path {
  const { layout, settings, statusDate } = frame
  if (!settings.progressLineVisible || statusDate === null) return []
  const first = layout.rows[0]
  const last = layout.rows[layout.rows.length - 1]
  if (first === undefined || last === undefined) return []

  const baseX = xOfDay(layout, statusDate)
  const half = layout.rectangleHeight / 2
  const byRow = new Map<string, TaskPlacement[]>()
  for (const placed of layout.placements) {
    const held = byRow.get(placed.groupId)
    if (held === undefined) byRow.set(placed.groupId, [placed])
    else held.push(placed)
  }

  const points: Point[] = [at(baseX, first.y - settings.progressLineOverhang)]
  for (const row of layout.rows) {
    const held = byRow.get(row.groupId) ?? []
    row.stackTops.forEach((top, lane) => {
      // Table T-022: one vertex per lane, and the most delayed -- the leftmost
      // -- wins when the lane holds more than one Task. A lane with none
      // passes through the status date so the line never breaks.
      let x: number | null = null
      for (const placed of held) {
        if (placed.stack !== lane) continue
        const task = frame.taskByUid.get(placed.taskUid)
        if (task === undefined) continue
        const vertex = vertexXOf(frame, task, placed, statusDate)
        if (vertex !== null && (x === null || vertex < x)) x = vertex
      }
      points.push(at(x ?? baseX, top + half))
    })
  }
  points.push(at(baseX, last.y + last.height + settings.progressLineOverhang))
  return points
}

/**
 * FR-019's HighlightBox. It surrounds only the rows that are drawn -- the
 * requirement says so in as many words -- so a box whose named rows were both
 * dropped falls back to the drawn extent rather than vanishing.
 *
 * @purity pure
 */
function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
  const out: HighlightGeometry[] = []
  for (const box of schedule.highlightBoxes) {
    const from = dayOf(box.startDate)
    const to = dayOf(box.endDate)
    if (from === null || to === null) continue
    const top = layout.rows.find((row) => row.groupId === box.topGroupId) ?? layout.rows[0]
    const bottom =
      layout.rows.find((row) => row.groupId === box.bottomGroupId) ??
      layout.rows[layout.rows.length - 1]
    if (top === undefined || bottom === undefined) continue
    const x0 = xOfDay(layout, from)
    const x1 = xOfDay(layout, to)
    out.push({
      id: box.id,
      box: {
        x: Math.min(x0, x1),
        y: Math.min(top.y, bottom.y),
        width: Math.abs(x1 - x0),
        height: Math.abs(bottom.y + bottom.height - top.y),
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
  const frame: Frame = {
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
    const task = frame.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push(taskGeometryOf(frame, task, placed))
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
        if (from !== undefined) dependencies.push(routedDependency(frame, from, to, link.linkType))
      }
    }
  }

  return {
    tasks,
    dependencies,
    progressLine: progressLineOf(frame),
    statusLine:
      frame.statusDate === null
        ? null
        : {
            x: xOfDay(layout, frame.statusDate),
            top: regions.rowArea.y,
            bottom: regions.rowArea.y + regions.rowArea.height,
          },
    highlightBoxes: highlightGeometry(schedule, layout),
  }
}

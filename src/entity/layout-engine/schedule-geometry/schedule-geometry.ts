// ScheduleGeometry: the vertices of everything drawn on the schedule.
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6

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
  xFromDay,
  type MilestoneGlyph,
  type ScheduleLayout,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../screen-regions/screen-regions'

export interface Point {
  readonly x: number
  readonly y: number
}

export type Path = readonly Point[]

export interface SpanDot {
  readonly at: Point
  readonly radius: number
}

export type BarGeometry =
  | {
      readonly form: 'outline'
      readonly points: Path
      readonly marks?: readonly Path[]
    }
  | {
      readonly form: 'line'
      readonly from: Point
      readonly to: Point
      readonly strokeWidth: number
      readonly head: Path | null
      readonly dots: readonly SpanDot[]
    }

// see RV-5, T-021
export type ProgressSymbol = 'PM-1' | 'PM-1a' | 'PM-2' | 'PM-3' | 'PM-4'

export interface MarkerGeometry {
  readonly symbol: ProgressSymbol
  readonly centre: Point
  readonly radius: number
}

// see LF-13
export interface ResumeGeometry {
  readonly arm: Path
  readonly head: Path
  readonly valid: boolean
  readonly hitHalf: number
}

// see FR-043
export interface DummyGeometry {
  readonly grab: 'GR-9' | 'GR-17' | 'GR-18'
  readonly at: Point
  readonly ink: ScreenRect
}

export interface TaskGeometry {
  readonly taskUid: number
  readonly shapeKind: TaskPlacement['shapeKind']
  readonly plan: BarGeometry | null
  readonly actual: BarGeometry | null
  readonly milestoneFigure: BarGeometry | null
  readonly planEndsStandOnOneDay: boolean
  readonly guides: readonly Path[]
  readonly marker: MarkerGeometry | null
  readonly resume: ResumeGeometry | null
  readonly dummies: readonly DummyGeometry[]
  readonly fadeHandles: readonly Point[]
  readonly label: ScreenRect | null
  readonly assigneeLabel: ScreenRect | null
}

// see LC-10, T-222
export interface DependencyGeometry {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly pattern: 'RP-1' | 'RP-2' | 'RP-3' | 'RP-4' | 'RP-5' | 'RP-6' | 'RP-7' | 'RP-8'
  readonly points: Path
}

// see FR-019
export interface HighlightGeometry {
  readonly id: string
  readonly box: ScreenRect
  readonly cornerRadiusPx: number | null
}

// see FR-019, FR-097
export interface CommentGeometry {
  readonly id: string
  readonly anchor: Point
  readonly body: ScreenRect
  readonly lines: readonly string[]
  readonly fontSize: number
}

// see CU-2
export interface DualCursorGeometry {
  readonly date1X: number
  readonly date2X: number
  readonly top: number
  readonly bottom: number
}

export interface ScheduleGeometry {
  readonly tasks: readonly TaskGeometry[]
  readonly dependencies: readonly DependencyGeometry[]
  readonly progressLine: Path
  readonly statusLine: { readonly x: number; readonly top: number; readonly bottom: number } | null
  readonly dualCursor: DualCursorGeometry | null
  readonly highlightBoxes: readonly HighlightGeometry[]
  readonly commentBoxes: readonly CommentGeometry[]
}

/** @purity pure */
function point(x: number, y: number): Point {
  return { x, y }
}

interface GeometryInputs {
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly within: WorkingCalendar
  readonly taskByUid: ReadonlyMap<number, Task>
  readonly statusDate: CalendarDay | null
  readonly showPlan: boolean
  readonly showActual: boolean
  readonly selectedTaskUids: ReadonlySet<number>
  // TRAP: made and dropped inside one call; holding it longer is a cache Chapter 5.6 must first record (R2.20).
  readonly dummyFromByStart: Map<string, CalendarDay | null>
  readonly dummyEndByFrom: Map<string, CalendarDay>
}

// see T-012a
/** @purity pure */
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

// see GR-1, GR-2, FD-4
// STOP: spec does not decide whether a fade handle stands on the chevron's notch or on the time axis. Looked in FD-5, T-023d
// @provisional PND-252
/** @purity pure */
function fadeHandlePoints(placed: TaskPlacement, planTop: number): readonly Point[] {
  return [
    point(placed.x + placed.fadeInPx, planTop),
    point(placed.x + placed.width - placed.fadeOutPx, planTop + placed.planHeight),
  ]
}

// see LF-6
/** @purity pure */
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

/** @purity pure */
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

// STOP: spec does not decide a milestone glyph's vertices; every glyph shares one circle. Looked in S-48
// @provisional PND-2
const CIRCLE_CORNERS = 24

/** @purity pure */
function share(centre: Point, half: number, u: number, v: number): Point {
  return point(centre.x + half * u, centre.y + half * v)
}

/** @purity pure */
function shares(centre: Point, half: number, pairs: readonly (readonly [number, number])[]): Path {
  return pairs.map(([u, v]) => share(centre, half, u, v))
}

/** @purity pure */
const PICTORIAL: Readonly<Record<string, {
  readonly body: readonly (readonly [number, number])[]
  readonly marks: readonly (readonly (readonly [number, number])[])[]
}>> = {
  file: {
    body: [[-0.62, -1], [0.24, -1], [0.62, -0.6], [0.62, 1], [-0.62, 1]],
    marks: [[[0.24, -1], [0.62, -0.6], [0.24, -0.6]]],
  },
  box: {
    body: [[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0.8, 0.55], [0, 1], [-0.8, 0.55]],
    marks: [[[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0, 0]]],
  },
  floppyDisk: {
    body: [[-0.85, -0.85], [0.55, -0.85], [0.85, -0.55], [0.85, 0.85], [-0.85, 0.85]],
    marks: [
      [[-0.35, -0.85], [0.25, -0.85], [0.25, -0.3], [-0.35, -0.3]],
      [[-0.55, 0.2], [0.55, 0.2], [0.55, 0.85], [-0.55, 0.85]],
    ],
  },
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
  person: {
    body: [
      [-0.85, 1], [-0.85, 0.45], [-0.6, 0.05], [-0.25, -0.1],
      [-0.36, -0.3], [-0.36, -0.62], [0, -0.95], [0.36, -0.62],
      [0.36, -0.3], [0.25, -0.1], [0.6, 0.05], [0.85, 0.45], [0.85, 1],
    ],
    marks: [],
  },
  smile: {
    body: [],
    marks: [
      [[-0.46, -0.3], [-0.24, -0.3], [-0.24, -0.02], [-0.46, -0.02]],
      [[0.24, -0.3], [0.46, -0.3], [0.46, -0.02], [0.24, -0.02]],
      [[-0.52, 0.18], [0, 0.62], [0.52, 0.18], [0.52, 0.38], [0, 0.82], [-0.52, 0.38]],
    ],
  },
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

/** @purity pure */
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
      return regularCorners(centre, half, 4, 0.125)
    case 'triangleUp':
      return regularCorners(centre, half, 3, 0)
    case 'triangleDown':
      return regularCorners(centre, half, 3, 0.5)
    case 'star': {
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

// see LF-8
/** @purity pure */
function thinStroke(planHeight: number, settings: DocumentSettings): number {
  return Math.max(
    settings.thinStrokeMin,
    Math.min(settings.thinStrokeMax, planHeight * settings.thinStrokeOfPlan),
  )
}

// TRAP: repeats lineBar's LF-7 head and dot sizes; change both together.
/** @purity pure */
function lineEndHalfHeight(kind: 'arrow' | 'endpointSpan', x0: number, x1: number, stroke: number,
                           settings: DocumentSettings): number {
  if (kind === 'arrow') {
    const head = Math.min(stroke * settings.arrowHeadOfStroke, (x1 - x0) * settings.arrowHeadOfSpan)
    return head / 2
  }
  return stroke * settings.spanDotOfStroke
}

// see LF-7
/** @purity pure */
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

/** @purity pure */
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
    // TRAP: the plan's height for both bars, not height.
    return lineBar(kind, x0, x1, top + height / 2, thinStroke(placed.planHeight, settings), settings)
  }
  // TRAP: read the plan's fades off the placement, never clamp again: LC-6 judged NL-1 with these numbers.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (kind === 'chevron') {
    const fadeNotch = Math.max(fade.fadeIn, fade.fadeOut)
    const planNotch = chevronNotch(placed.width, placed.planHeight, settings)
    const notch = fadeNotch > 0 ? fadeNotch : isActual ? planNotch * settings.actualOfPlan : planNotch
    return { form: 'outline', points: chevronOutline(x0, x1, top, height, notch) }
  }
  return { form: 'outline', points: fadedOutline(x0, x1, top, height, fade.fadeIn, fade.fadeOut) }
}

// see RV-5
/** @purity pure */
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

// see LF-11, FR-013, GR-7
/** @purity pure */
function markerAnchorX(inputs: GeometryInputs, placed: TaskPlacement): number | null {
  const planRight = placed.x + placed.width
  if (!inputs.showActual) return inputs.showPlan ? planRight : null
  if (placed.shapeKind === 'milestone') {
    return Math.max(planRight, placed.actualReach ?? planRight, placed.dummyReach ?? planRight)
  }
  // TRAP: the plan is no candidate once the actual shows: the further-right of the two parks the marker on a late plan's end.
  if (placed.dummyReach !== null) return placed.dummyReach
  if (placed.actualReach !== null) return placed.actualReach
  return null
}

// TRAP: markerAnchorX already includes a dummy's grab hold (GR-7); adding a width here counts it twice.
/** @purity pure */
function markerOf(inputs: GeometryInputs, task: Task,
                  placed: TaskPlacement): MarkerGeometry | null {
  const settings = inputs.settings
  if (!settings.progressMarkerVisible) return null
  const anchorX = markerAnchorX(inputs, placed)
  if (anchorX === null) return null
  const radius = settings.markerSize / 2
  return {
    symbol: progressSymbolOf(task, inputs.statusDate),
    centre: point(anchorX + settings.markerGap + radius, placed.y + placed.planHeight / 2),
    radius,
  }
}

// see LF-13, LF-11
/** @purity pure */
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
    arm: [point(x, marker.centre.y + marker.radius), point(x, middle), point(x + arm, middle)],
    head: [
      point(x + arm, middle - head),
      point(x + arm + head, middle),
      point(x + arm, middle + head),
    ],
    valid,
    // TRAP: S-22 unscaled: side carries S-25, and GR-8's hit box does not follow it.
    hitHalf: settings.markerSize / 2,
  }
}

// see DP-1, DP-3
/** @purity pure */
function exitsRight(linkType: number): boolean {
  return linkType === 1 || linkType === 0
}

// see DP-3, DP-4
/** @purity pure */
function sameSide(linkType: number): boolean {
  return linkType === 0 || linkType === 3
}

interface Anchored {
  readonly edge: number
  readonly middle: number
  readonly top: number
  readonly bottom: number
}

// see LF-5
/** @purity pure */
function corridorY(from: Anchored, to: Anchored, settings: DocumentSettings): number {
  if (Math.abs(from.top - to.top) < 0.5) return from.bottom + settings.stackGap / 2
  return to.top > from.top ? (from.bottom + to.top) / 2 : (to.bottom + from.top) / 2
}

// see T-222
/** @purity pure */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DocumentSettings): {
  readonly pattern: DependencyGeometry['pattern']
  readonly points: Path
} {
  const entryRun = settings.dependencyArrowLength * settings.dependencyRunOfArrow
  const exitRun = entryRun - settings.dependencyArrowLength
  const x1 = from.edge + exitRun
  const sameLane = Math.abs(from.middle - to.middle) < 0.5
  const below = to.middle > from.middle

  if (sameSide(linkType)) {
    const x2 = to.edge + entryRun
    if (sameLane) {
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
  if (sameLane && to.edge - from.edge >= entryRun) {
    return { pattern: 'RP-1', points: [point(from.edge, from.middle), point(to.edge, to.middle)] }
  }
  if (!sameLane && x2 >= x1) {
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

// see FR-009
/** @purity pure */
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

// see T-020a
/** @purity pure */
function guidesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  actualHeight: number): readonly Path[] {
  const settings = inputs.settings
  if (!settings.planVisible || !settings.actualVisible || placed.actualX === null) return []
  const middle = placed.y + placed.planHeight / 2

  // TRAP: judge GD-4 before GD-1's overlap: milestone figures a day apart overlap in pixels, so GD-4 would never fire.
  if (placed.actualPlacement === 'sideways') {
    const planDay = dayOf(task.start)
    const actualDay = dayOf(task.actualStart)
    if (planDay === null || actualDay === null) return []
    if (compareDays(planDay, actualDay) === 0) return []
    return [[point(placed.actualX, middle), point(placed.x + placed.width / 2, middle)]]
  }

  const planX0 = placed.x
  const planX1 = placed.x + placed.width
  const actualX0 = placed.actualX
  const actualX1 = placed.actualX + placed.actualWidth
  if (actualX1 >= planX0 && actualX0 <= planX1) return []

  const rightwards = actualX0 > planX1
  const from = rightwards ? actualX0 : actualX1
  const toDay = rightwards ? planX1 : planX0

  if (placed.actualPlacement === 'below') {
    const below = placed.y + placed.planHeight + settings.actualGap + actualHeight / 2
    return [[point(from, below), point(toDay, below)]]
  }
  const top = middle - actualHeight / 2
  const bottom = middle + actualHeight / 2
  return [
    [point(from, top), point(toDay, top)],
    [point(from, bottom), point(toDay, bottom)],
  ]
}

/** @purity pure */
function dummyFromOf(inputs: GeometryInputs, startText: string | null): CalendarDay | null {
  const key = startText ?? ''
  const held = inputs.dummyFromByStart.get(key)
  if (held !== undefined) return held
  const start = dayOf(startText)
  const made = start === null ? null : nextWorkingDay(inputs.within, start)
  inputs.dummyFromByStart.set(key, made)
  return made
}

// TRAP: keyed by textOfDay, since two equal CalendarDay records are not one Map key.
/** @purity pure */
function dummyEndOf(inputs: GeometryInputs, from: CalendarDay): CalendarDay {
  const key = textOfDay(from)
  const held = inputs.dummyEndByFrom.get(key)
  if (held !== undefined) return held
  const made = dateFromWorkingDays(inputs.within, from, inputs.settings.actualInitialDuration)
  inputs.dummyEndByFrom.set(key, made)
  return made
}

// see FR-043, T-240
/** @purity pure */
function dummiesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   actualHeight: number): readonly DummyGeometry[] {
  if (placed.actualX !== null) return []
  const from = dummyFromOf(inputs, task.start)
  if (from === null) return []
  const fromX = xFromDay(inputs.layout, from)
  const planMiddle = placed.y + placed.planHeight / 2

  if (placed.actualPlacement === 'sideways') {
    const side = actualHeight
    const ink: ScreenRect = {
      x: fromX - side / 2,
      y: planMiddle - side / 2,
      width: side,
      height: side,
    }
    return [{ grab: 'GR-18', at: point(fromX, planMiddle), ink }]
  }

  const width = Math.min(inputs.layout.pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
  // TRAP: the band follows actualPlacement (LF-9); the plan's mid-line would put an SH-3 / SH-4 dummy on the plan line.
  const top = placed.actualPlacement === 'below'
    ? placed.y + placed.planHeight + inputs.settings.actualGap
    : planMiddle - actualHeight / 2
  const middle = top + actualHeight / 2
  // TRAP: every dummy of one Task shares this ink; item-hit-area.ts reads the first one only.
  const ink: ScreenRect = { x: fromX, y: top, width, height: actualHeight }
  const end = dummyEndOf(inputs, from)
  return [
    { grab: 'GR-9', at: point(fromX, middle), ink },
    { grab: 'GR-17', at: point(xFromDay(inputs.layout, end), middle), ink },
  ]
}

// see T-012
/** @purity pure */
function labelTopOf(settings: DocumentSettings, placed: TaskPlacement, height: number): number {
  if (placed.shapeKind !== 'arrow' && placed.shapeKind !== 'endpointSpan') {
    return placed.y + (placed.height - height) / 2
  }
  const middle = placed.y + placed.planHeight / 2
  const stroke = thinStroke(placed.planHeight, settings)
  const halfExtent = Math.max(
    stroke / 2,
    lineEndHalfHeight(placed.shapeKind, placed.x, placed.x + placed.width, stroke, settings),
  )
  const shapeTop = middle - halfExtent
  return shapeTop - NOT_STORED_LABEL_SIZES['S-196'] - height
}

// see GR-10, LC-6
// TRAP: use placed.labelFontSize, never a fresh formula: LC-5 measured with it, and FR-094's floors disagree.
/** @purity pure */
function labelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  const y = labelTopOf(settings, placed, height)
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
        // TRAP: read labelX, not the shape's right edge plus labelGap: labelX already clears OC-3 / OC-4.
        x: placed.labelX,
        y,
        width: Math.max(0, placed.occupiedX1 - placed.labelX),
        height,
      }
}

// see OC-2, FR-090
// STOP: spec does not decide the card's vertical place; LF-11's plan-bar centre stands in. Looked in T-221, T-012
// @provisional PND-347
/** @purity pure */
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
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(inputs, placed, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(inputs, placed, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

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
    milestoneFigure:
      placed.shapeKind === 'milestone'
        ? barOf(inputs, placed, placed.x, placed.x + placed.width, planTop, placed.planHeight, true)
        : null,
    planEndsStandOnOneDay: placed.planEndsStandOnOneDay,
    guides: guidesOf(inputs, task, placed, actualHeight),
    marker,
    // WHY: follows the state, not the symbol: a late suspended Task shows PM-4 and is still suspended.
    resume:
      marker !== null && suspended && placed.shapeKind !== 'milestone'
        ? resumeOf(inputs, task, marker, settings)
        : null,
    dummies,
    // TRAP: gate on the selection here, not only when drawing: itemAtPointer asks GR-1 / GR-2 of every Task
    // before GR-3 / GR-4, so handles on an unselected Task swallow a neighbour's plan-bar end.
    fadeHandles:
      placed.actualPlacement === 'inside' && inputs.selectedTaskUids.has(placed.taskUid)
        ? fadeHandlePoints(placed, planTop)
        : [],
    label: labelBoxOf(inputs, placed),
    assigneeLabel: outsideLabel,
  }
}

// see T-022
/** @purity pure */
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
      return null
    case 'suspendedResumeUnknown':
      return null
    case 'suspendedResumePlanned':
      return before(task.resume)
    case 'notStarted':
      return before(task.start)
    case 'inProgress':
      return placed.actualX === null ? null : placed.actualX + placed.actualWidth
  }
}

// see FR-014, LF-12
/** @purity pure */
function progressLineOf(inputs: GeometryInputs): Path {
  const { layout, settings, statusDate } = inputs
  if (!settings.progressLineVisible || statusDate === null) return []
  const first = layout.rows[0]
  const last = layout.rows[layout.rows.length - 1]
  if (first === undefined || last === undefined) return []

  const baseX = xFromDay(layout, statusDate)
  const half = layout.rectangleHeight / 2
  // WHY: bucketed by row and lane: by row alone each lane rescans its row, quadratic once Tasks overlap (NFR-013).
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
    // TRAP: sort by top, not lane index: with S-58 'up' the index descends in y and the line zig-zags.
    const lanesByTop = row.stackTops
      .map((top, lane) => ({ top, lane }))
      .sort((a, b) => a.top - b.top)
    for (const { top, lane } of lanesByTop) {
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

// see FR-019
/** @purity pure */
function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
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
    // TRAP: both edges through min / max: rows are stored in tree order but drawn in screen order, and pinning inverts them.
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
      // WHY: not defaulted to S-132: CM-52 gives that to a new box, and a box that states none draws none.
      cornerRadiusPx: box.cornerRadiusPx,
    })
  }
  return out
}

// see FR-093
// TRAP: repeats labelUnits in schedule-layout.ts; change them together.
/** @purity pure */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

// see FR-097, S-182
// STOP: spec does not decide whether a fill break may fall inside a word. Looked in FR-097, S-182, FR-093
// @provisional PND-237
/** @purity pure */
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

// see FR-019, FR-097
/** @purity pure */
function commentGeometry(
  schedule: Schedule,
  settings: DocumentSettings,
  layout: ScheduleLayout,
): readonly CommentGeometry[] {
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: CommentGeometry[] = []
  // TRAP: read no setting before the loop: fontScaleSizes[fontScale] throws for a document with no comment box.
  for (const box of schedule.commentBoxes) {
    const day = dayOf(box.anchorDate)
    const row = box.anchorGroupId === null ? undefined : rowById.get(box.anchorGroupId)
    // STOP: spec does not decide a box whose row is not drawn or whose date is null; it is not drawn. Looked in UC-008, AT-113, AT-114
    // @provisional PND-234
    if (day === null || row === undefined) continue
    const lines = wrappedLines(box.text ?? '', settings.commentBoxWrapUnits)
    let widest = 0
    for (const line of lines) widest = Math.max(widest, labelUnits(line))
    // STOP: spec does not decide the size of an empty body. Looked in CM-46, FR-097
    // @provisional PND-236
    if (widest === 0) widest = 2
    // STOP: spec does not decide where a never-dragged body sits; a zero offset stands in. Looked in FR-019, CM-46
    // @provisional PND-232
    const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    // STOP: spec does not decide the anchor's y within its row; the band's centre stands in. Looked in FR-019
    // @provisional PND-233
    const anchor = point(xFromDay(layout, day), row.y + row.height / 2)
    const fontSize = settings.fontScaleSizes[settings.fontScale]
    const pad = settings.commentBoxPad
    const width = widest * fontSize * settings.labelCoef + 2 * pad
    const height = lines.length * fontSize + 2 * pad
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

// see CU-2, IV-13
/** @purity pure */
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

// see CP-6, LC-10, LC-11, RV-5
/** @purity pure */
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
    selectedTaskUids: new Set(
      selection.items.flatMap((one) => (one.kind === 'task' ? [one.uid] : [])),
    ),
    dummyFromByStart: new Map<string, CalendarDay | null>(),
    dummyEndByFrom: new Map<string, CalendarDay>(),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push(taskGeometryOf(inputs, task, placed))
  }

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
// see T-206
export const NOT_STORED_LABEL_SIZES: {
  readonly 'S-196': number
} = {
  'S-196': 2,
}

// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
} = {
  'S-180': 30,
}
// </generated>

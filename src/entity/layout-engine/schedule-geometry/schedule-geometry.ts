// ScheduleGeometry: the vertices of everything drawn on the schedule.
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  compareDays,
  dayOf,
  isDelayed,
  lastDayForLength,
  planActualState,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import {
  NOT_STORED_LABEL_SIZES,
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  markerDiameterOf,
  outwardStartOf,
  xFromDay,
  type LabelLayout,
  type LabelReference,
  type MilestoneGlyph,
  type ScheduleLayout,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import {
  displayRatioOf,
  drawnSettingsOf,
  type ScreenRect,
  type ScreenRegions,
} from '../screen-regions/screen-regions'

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

// see LF-13, XS-10, XS-12, S-25, GA-20
export interface ResumeGeometry {
  readonly arm: Path
  readonly head: Path
  readonly valid: boolean
  // TRAP: the box does not follow the drawn side; GA-20 keeps it at the marker's diameter.
  readonly box: ScreenRect
  readonly dash: Path
  readonly undecided: boolean
}

// see FR-043, GA-5, GA-6, GA-17, GA-21, GA-22
export interface DummyGeometry {
  readonly grab: 'GA-5' | 'GA-6' | 'GA-17' | 'GA-21' | 'GA-22'
  readonly at: Point
  readonly ink: ScreenRect
  // see DM-4, DM-8, DM-9, PI-5
  // WHY: optional, not required: a hand-built geometry that only asks what a press hits need not draw one.
  readonly figure?: BarGeometry
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
  // see FR-009, RT-4a
  // WHY: optional, read as true when absent: a hand-built geometry may not say.
  readonly hasPlanDates?: boolean
}

// see LC-10, T-222
export interface DependencyGeometry {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly pattern: 'RP-1' | 'RP-2' | 'RP-3' | 'RP-4' | 'RP-5' | 'RP-6' | 'RP-7' | 'RP-8'
  readonly points: Path
  // see S-18, S-178, S-19, GA-19
  // WHY: optional, not required: a hand-built geometry that only asks what a press hits may give no ink.
  readonly strokeWidth?: number
  readonly head?: Path
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

// see GR-14
/** @purity pure */
export function leaderOf(comment: CommentGeometry): Path {
  return [comment.anchor, point(comment.body.x, comment.body.y + comment.body.height)]
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
  readonly selectedLinks: ReadonlySet<string>
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

// see GA-7, GA-8, FD-4
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

// see XS-5, XS-6
// TRAP: repeats lineBar's XS-5 head height and XS-5 dot size; change both together.
/** @purity pure */
function lineEndHalfHeight(kind: 'arrow' | 'endpointSpan', settings: DocumentSettings): number {
  return (kind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// see LF-7, LF-8, XS-5
/** @purity pure */
function lineBar(kind: ShapeKind, x0: number, x1: number, middle: number,
                 settings: DocumentSettings): BarGeometry {
  const stroke = settings.thinStrokeWidth
  if (kind === 'arrow') {
    // TRAP: the head's length is capped by the span, its height never is: XS-5 holds the tiers still.
    const length = Math.min(settings.thinArrowHeadLength, (x1 - x0) * settings.arrowHeadOfSpan)
    const half = lineEndHalfHeight('arrow', settings)
    return {
      form: 'line',
      from: point(x0, middle),
      to: point(x1 - length, middle),
      strokeWidth: stroke,
      head: [
        point(x1, middle),
        point(x1 - length, middle - half),
        point(x1 - length, middle + half),
      ],
      dots: [],
    }
  }
  const radius = lineEndHalfHeight('endpointSpan', settings)
  return {
    form: 'line',
    from: point(x0, middle),
    to: point(x1, middle),
    strokeWidth: stroke,
    head: null,
    dots: [{ at: point(x0, middle), radius }, { at: point(x1, middle), radius }],
  }
}

// see T-012
/** @purity pure */
function isThinShape(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

// see XS-4, XS-5, XS-6, XS-7
// TRAP: schedule-layout.ts reserves the same three tiers (shapeHeightOf, labelLiftOf); change them together.
/** @purity pure */
function thinTierMiddle(placed: TaskPlacement, settings: DocumentSettings,
                        isActual: boolean): number {
  const stroke = settings.thinStrokeWidth
  const planMiddle = placed.y + stroke / 2
  return isActual ? planMiddle + stroke + settings.actualGap : planMiddle
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
    // TRAP: the tier, never top + height / 2: XS-5 and XS-6 stack the two lines by their own edges.
    return lineBar(kind, x0, x1, thinTierMiddle(placed, settings, isActual), settings)
  }
  // TRAP: read the plan's fades off the placement, never clamp again: LC-6 judged the fit with these numbers.
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

// see RF-1, RF-3
/** @purity pure */
function drawnReferenceOf(inputs: GeometryInputs, placed: TaskPlacement): LabelReference {
  const settings = inputs.settings
  const plan = { x: placed.x, width: placed.width }
  const fade = { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (!inputs.showActual) return labelReferenceOf(placed.shapeKind, plan, fade, null, settings)
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  const band = placed.actualX === null
    ? dummyBandOf(placed.shapeKind, plan, diameter)
    : { x: placed.actualX, width: placed.actualWidth }
  return labelReferenceOf(placed.shapeKind, plan, fade, band, settings)
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
/** @purity pure */
function drawnLabelLayoutOf(inputs: GeometryInputs, task: Task,
                            placed: TaskPlacement): LabelLayout {
  const settings = inputs.settings
  const reference = drawnReferenceOf(inputs, placed)
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  return labelLayoutOf(
    placed.shapeKind,
    reference,
    placed.labelTextWidth,
    diameter,
    settings.progressMarkerVisible,
    outwardStartOf(reference.x + reference.width, task, placed.shapeKind, diameter),
    settings,
  )
}

// see XS-3, XS-4
/** @purity pure */
function labelTierMiddleOf(placed: TaskPlacement, settings: DocumentSettings): number {
  if (placed.shapeKind !== 'arrow' && placed.shapeKind !== 'endpointSpan') {
    return placed.y + placed.planHeight / 2
  }
  return labelTopOf(settings, placed, placed.labelFontSize) + placed.labelFontSize / 2
}

// see LF-11, XS-3, XS-4
/** @purity pure */
function markerOf(inputs: GeometryInputs, task: Task,
                  placed: TaskPlacement): MarkerGeometry | null {
  const settings = inputs.settings
  if (!settings.progressMarkerVisible) return null
  const markerLeft = drawnLabelLayoutOf(inputs, task, placed).markerLeft
  if (markerLeft === null) return null
  const radius = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings) / 2
  return {
    symbol: progressSymbolOf(task, inputs.statusDate),
    centre: point(markerLeft + radius, labelTierMiddleOf(placed, settings)),
    radius,
  }
}

// see LF-13, XS-10, XS-12, S-25
/** @purity pure */
function resumeOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  settings: DocumentSettings): ResumeGeometry {
  const valid = task.resumeValid !== false
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  const resumeDay = dayOf(task.resume)
  const undecided = resumeDay === null
  const side = diameter * (valid && !undecided ? 1 : settings.resumeScaleInvalid)
  const stopX = placed.actualX === null ? placed.x : placed.actualX + placed.actualWidth
  const x = resumeDay === null ? stopX : xFromDay(inputs.layout, resumeDay)
  const middle = isThinShape(placed.shapeKind)
    ? thinTierMiddle(placed, settings, true)
    : labelTierMiddleOf(placed, settings)
  const arm = side * settings.resumeArmOfMarker
  const head = side * settings.resumeHeadOfMarker
  return {
    // TRAP: the stem follows `side`, not the diameter; an undecided resume shrinks the
    // whole drawn icon by S-25, while GA-20 keeps `box` below at the marker's diameter.
    arm: [point(x, middle + side / 2), point(x, middle), point(x + arm, middle)],
    head: [
      point(x + arm, middle - head),
      point(x + arm + head, middle),
      point(x + arm, middle + head),
    ],
    valid,
    box: { x, y: middle - diameter / 2, width: diameter, height: diameter },
    dash: undecided ? [] : [point(stopX, middle), point(x, middle)],
    undecided,
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

// see VG-5
// TRAP: schedule-layout.ts lays the tier by the same overhang (drawnEdgeOverhangOf); change both together.
/** @purity pure */
function drawnOverhangOf(placed: TaskPlacement, settings: DocumentSettings): number {
  const isLine = placed.shapeKind === 'arrow' || placed.shapeKind === 'endpointSpan'
  return isLine ? 0 : settings.planStroke / 2
}

interface Anchored {
  readonly edge: number
  readonly middle: number
  readonly top: number
  readonly bottom: number
  readonly drawnBottom: number
}

// see LF-5, VG-2, VG-5
// TRAP: schedule-layout.ts stacks tiers with the same gap (verticalGapOf); change both together.
/** @purity pure */
function corridorY(from: Anchored, to: Anchored, settings: DocumentSettings): number {
  const gap = settings.stackGap + settings.dependencyWidth + settings.stackGap
  if (Math.abs(from.top - to.top) < 0.5) return from.drawnBottom + gap / 2
  return to.top > from.top ? (from.bottom + to.top) / 2 : (to.bottom + from.top) / 2
}

// see T-222
// WHY: argued, NOT measured (JDG-138): an x of 1e9 px, a thousand years of days at the widest S-1 x S-236 x S-98,
// has an ulp near 1.2e-7 px, so a few rounded terms stay under this, and no screen resolves a millionth of a pixel.
const DRAWN_PX_ROUNDING = 1e-6

// see T-222
// TRAP: the spec's at-least is exact; this absorbs rounding only. A gap is a difference of two absolute edges, so once
// S-236 makes a day non-dyadic an equal run falls short by an ulp and RP-1 turned into RP-4 (DFC-616).
/** @purity pure */
function isAtLeastDrawnPx(value: number, bound: number): boolean {
  return value >= bound - DRAWN_PX_ROUNDING
}

// see T-222
/** @purity pure */
function routeOf(from: Anchored, to: Anchored, linkType: number, settings: DocumentSettings): {
  readonly pattern: DependencyGeometry['pattern']
  readonly points: Path
} {
  const entryRun = settings.dependencyLeadIn
  const exitRun = settings.dependencyLeadOut
  const x1 = from.edge + exitRun
  const sameLane = Math.abs(from.middle - to.middle) < 0.5
  const below = to.middle > from.middle

  if (sameSide(linkType)) {
    const x2 = to.edge + entryRun
    if (sameLane) {
      const outward = isAtLeastDrawnPx(Math.abs(x1 - x2), exitRun) ? x1 : x2 + exitRun
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
  if (sameLane && isAtLeastDrawnPx(to.edge - from.edge, entryRun)) {
    return { pattern: 'RP-1', points: [point(from.edge, from.middle), point(to.edge, to.middle)] }
  }
  if (!sameLane && isAtLeastDrawnPx(x2, x1)) {
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

// see SL-8, FR-009
// TRAP: keyed as svg-renderer.ts keys the lines it widens; another key would grab one width and draw another.
/** @purity pure */
function selectedLinksOf(schedule: Schedule, selection: Selection): ReadonlySet<string> {
  const picked = new Set<string>()
  for (const item of selection.items) {
    if (item.kind === 'dependency') picked.add(`${item.successorUid}#${item.ordinal}`)
  }
  const out = new Set<string>()
  if (picked.size === 0) return out
  for (const successor of schedule.tasks) {
    for (const [ordinal, link] of successor.dependencies.entries()) {
      if (picked.has(`${successor.uid}#${ordinal}`)) out.add(`${link.predecessorUid}>${successor.uid}`)
    }
  }
  return out
}

// see S-19, S-300, GA-19
// TRAP: repeats dependencyArrowSvg in svg-renderer.ts, whose marker turns with the last drawn segment;
// change both together.
/** @purity pure */
function arrowHeadOf(points: Path, length: number, base: number): Path {
  const tip = points[points.length - 1]
  if (tip === undefined) return []
  let alongX = 1
  let alongY = 0
  for (let index = points.length - 1; index > 0; index -= 1) {
    const before = points[index - 1]!
    const run = Math.hypot(points[index]!.x - before.x, points[index]!.y - before.y)
    if (run === 0) continue
    alongX = (points[index]!.x - before.x) / run
    alongY = (points[index]!.y - before.y) / run
    break
  }
  const baseX = tip.x - alongX * length
  const baseY = tip.y - alongY * length
  const half = base / 2
  return [
    tip,
    point(baseX - alongY * half, baseY + alongX * half),
    point(baseX + alongY * half, baseY - alongX * half),
  ]
}

/** @purity pure */
function routedDependency(inputs: GeometryInputs, from: TaskPlacement, to: TaskPlacement,
                          linkType: number): DependencyGeometry {
  const right = exitsRight(linkType)
  const sign = right ? 1 : -1
  const entryRight = sameSide(linkType) ? right : !right
  /** @purity pure */
  const anchor = (placed: TaskPlacement, edgeRight: boolean): Anchored => {
    const thin = isThinShape(placed.shapeKind)
    const band = thin ? placed.height : placed.planHeight
    return {
      edge: sign * (edgeRight ? placed.x + placed.width : placed.x),
      middle: thin
        ? thinTierMiddle(placed, inputs.settings, false)
        : placed.y + placed.planHeight / 2,
      top: placed.y,
      bottom: placed.y + band,
      drawnBottom: placed.y + band + drawnOverhangOf(placed, inputs.settings),
    }
  }
  const route = routeOf(anchor(from, right), anchor(to, entryRight), linkType, inputs.settings)
  const points = route.points.map((vertex) => point(sign * vertex.x, vertex.y))
  const isSelected = inputs.selectedLinks.has(`${from.taskUid}>${to.taskUid}`)
  const ownWidth = inputs.settings.dependencyWidth
  return {
    predecessorUid: from.taskUid,
    successorUid: to.taskUid,
    linkType,
    pattern: route.pattern,
    points,
    strokeWidth: isSelected ? ownWidth * NOT_STORED_SELECTION_SIZES['S-178'] : ownWidth,
    head: arrowHeadOf(
      points,
      inputs.settings.dependencyArrowLength,
      inputs.settings.dependencyArrowWidth,
    ),
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
  // WHY: the plan start itself, not the working day after it: the mark stands where the actual would start (DM-1).
  const made = dayOf(startText)
  inputs.dummyFromByStart.set(key, made)
  return made
}

// TRAP: keyed by textOfDay, since two equal CalendarDay records are not one Map key.
/** @purity pure */
function dummyEndOf(inputs: GeometryInputs, from: CalendarDay): CalendarDay {
  const key = textOfDay(from)
  const held = inputs.dummyEndByFrom.get(key)
  if (held !== undefined) return held
  // WHY: the last day the writer puts (edit-task.ts), not the half-open end: a one-day dummy ends on its own day (JDG-15).
  const made = lastDayForLength(inputs.within, from, inputs.settings.actualInitialDuration)
  inputs.dummyEndByFrom.set(key, made)
  return made
}

// see FR-043, T-240
/** @purity pure */
function dummiesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   actualHeight: number): readonly DummyGeometry[] {
  // TRAP: empties only what is drawn and grabbed; the room stays in the layout's dummyReach (DM-14, FR-049).
  if (!inputs.showActual || placed.actualX !== null) return []
  const from = dummyFromOf(inputs, task.start)
  if (from === null) return []
  const fromX = xFromDay(inputs.layout, from)
  const planMiddle = placed.y + placed.planHeight / 2

  if (placed.actualPlacement === 'sideways') {
    // WHY: the same box and barOf call as a same-day actual milestone in taskGeometryOf (DM-12, FR-043).
    const side = actualHeight
    const ink: ScreenRect = {
      x: fromX - side / 2,
      y: planMiddle - side / 2,
      width: side,
      height: side,
    }
    const figure = barOf(inputs, placed, ink.x, ink.x + side, ink.y, side, true)
    return [{ grab: 'GA-17', at: point(fromX, planMiddle), ink, figure }]
  }

  // TRAP: schedule-layout.ts counts the same width into dummyReach (dummyInkWidthOf); change both together.
  const width = Math.min(
    markerDiameterOf(placed.shapeKind, placed.labelFontSize, inputs.settings) * NOT_STORED_DUMMY_SIZES['S-247'],
    NOT_STORED_DUMMY_SIZES['S-180'],
  )
  const thin = isThinShape(placed.shapeKind)
  const band = thin ? inputs.settings.thinStrokeWidth : actualHeight
  // TRAP: the band follows actualPlacement (LF-9); the plan's mid-line would put an SH-3 / SH-4 dummy on the plan line.
  const middle = thin
    ? thinTierMiddle(placed, inputs.settings, true)
    : planMiddle
  const top = middle - band / 2
  // TRAP: every dummy of one Task shares this ink; item-hit-area.ts reads the first one only.
  const ink: ScreenRect = { x: fromX, y: top, width, height: band }
  // WHY: one barOf call shared by both dummies: the mark is a one-day actual's shape (DM-2, DM-4).
  const figure = barOf(inputs, placed, fromX, fromX + width, top, band, true)
  const end = dummyEndOf(inputs, from)
  return [
    { grab: thin ? 'GA-21' : 'GA-5', at: point(fromX, middle), ink, figure },
    { grab: thin ? 'GA-22' : 'GA-6', at: point(xFromDay(inputs.layout, end), middle), ink, figure },
  ]
}

// see T-012, OC-10, XS-4
/** @purity pure */
function labelTopOf(settings: DocumentSettings, placed: TaskPlacement, height: number): number {
  if (!isThinShape(placed.shapeKind)) return placed.y + (placed.height - height) / 2
  // see DS-3
  const lift = NOT_STORED_LABEL_SIZES['S-196'] * displayRatioOf(settings)
  return placed.y - lift - height
}

// see GR-10, LC-6, LP-1, LP-3
// TRAP: use placed.labelFontSize, never a fresh formula: LC-5 measured with it, and FR-094's floors disagree.
/** @purity pure */
function labelBoxOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const height = placed.labelFontSize
  return {
    x: drawnLabelLayoutOf(inputs, task, placed).nameX,
    y: labelTopOf(inputs.settings, placed, height),
    width: placed.labelTextWidth,
    height,
  }
}

// see OC-2, FR-090, XS-3, XS-4, XS-8, SH-5, F-024
/** @purity pure */
function outsideLabelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.outsideLabel === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  const width = placed.outsideLabelWidth
  const drawnStart = inputs.showActual && placed.actualX !== null
    ? Math.min(placed.x, placed.actualX)
    : placed.x
  const anchor = assigneeAnchorOf(
    placed.shapeKind,
    drawnReferenceOf(inputs, placed),
    drawnStart,
    settings,
  )
  return {
    x: anchor - settings.assigneeLabelGap - width,
    y: labelTierMiddleOf(placed, settings) - height / 2,
    width,
    height,
  }
}

// see FR-009, RT-4a
/** @purity pure */
function hasPlanDates(task: Task): boolean {
  return task.start !== null && task.finish !== null
}

// see RT-4a, FR-009
/** @purity pure */
function plannedPlacementsOf(inputs: GeometryInputs): readonly TaskPlacement[] {
  return inputs.layout.placements.filter((one) => {
    const task = inputs.taskByUid.get(one.taskUid)
    return task !== undefined && hasPlanDates(task)
  })
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
      marker !== null && suspended && inputs.showActual && placed.shapeKind !== 'milestone'
        ? resumeOf(inputs, task, placed, settings)
        : null,
    dummies,
    // TRAP: gate on the selection here, not only when drawing: itemAtPointer asks GA-7 / GA-8 of every Task
    // before GA-1 / GA-2, so handles on an unselected Task swallow a neighbour's plan-bar end.
    fadeHandles:
      placed.actualPlacement === 'inside' && inputs.selectedTaskUids.has(placed.taskUid)
        ? fadeHandlePoints(placed, planTop)
        : [],
    label: labelBoxOf(inputs, task, placed),
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
// WHY: the one place a highlight box's end day is counted inclusive; its right edge is where the next day begins.
/** @purity pure */
function rightEdgeOfDay(layout: ScheduleLayout, day: CalendarDay): number {
  return xFromDay(layout, day) + layout.pxPerDay
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
    const early = compareDays(from, toDay) <= 0 ? from : toDay
    const late = compareDays(from, toDay) <= 0 ? toDay : from
    const x0 = xFromDay(layout, early)
    const x1 = rightEdgeOfDay(layout, late)
    const y = Math.min(top.y, bottom.y)
    out.push({
      id: box.id,
      box: {
        x: x0,
        y,
        width: x1 - x0,
        height: Math.max(top.y + top.height, bottom.y + bottom.height) - y,
      },
      // WHY: not defaulted to S-132: CM-52 gives that to a new box, and a box that states none draws none.
      cornerRadiusPx: box.cornerRadiusPx,
    })
  }
  return out
}

// see FR-093
// STOP: spec does not decide which characters FR-093 counts as full-width. Looked in FR-093, S-30, S-35
// @provisional PND-467
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
    const anchor = point(xFromDay(layout, day) + layout.pxPerDay / 2, row.y + row.height / 2)
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
  storedSettings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
  selection: Selection,
): ScheduleGeometry {
  // see FR-039, T-252
  const settings = drawnSettingsOf(storedSettings)
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
    selectedLinks: selectedLinksOf(schedule, selection),
    dummyFromByStart: new Map<string, CalendarDay | null>(),
    dummyEndByFrom: new Map<string, CalendarDay>(),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push({ ...taskGeometryOf(inputs, task, placed), hasPlanDates: hasPlanDates(task) })
  }

  const placedByUid = new Map(plannedPlacementsOf(inputs).map((one) => [one.taskUid, one]))
  const dependencies: DependencyGeometry[] = []
  // see RT-4a, FR-009
  if (settings.dependencyVisible && settings.planVisible) {
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
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
  readonly 'S-247': number
} = {
  'S-180': 30,
  'S-247': 0.5,
}

// see T-206
const NOT_STORED_SELECTION_SIZES: {
  readonly 'S-174': number
  readonly 'S-175': readonly [number, number]
  readonly 'S-178': number
} = {
  'S-174': 1,
  'S-175': [2, 1],
  'S-178': 2,
}
// </generated>

// ScheduleGeometry -- the figures of one task: its shapes, label boxes, marker, resume icon, dummies and fade handles (FR-043).
// @unit      UF-144  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  dayOf,
  isDelayed,
  lastDayForLength,
  planActualState,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../document-model/schedule/schedule'
import {
  NOT_STORED_LABEL_SIZES,
  assigneeAnchorOf,
  deadlineHeadHalfWidthOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  markerDiameterOf,
  outwardStartOf,
  xFromDay,
  type LabelLayout,
  type LabelReference,
  type MilestoneGlyph,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import { displayRatioOf, type ScreenRect } from '../screen-regions/screen-regions'
import { guidesOf } from './plan-actual-guides'
import milestoneShapes from './milestone-shapes.json' with { type: 'json' }
import {
  point,
  type BarGeometry,
  type DeadlineGeometry,
  type DummyGeometry,
  type GeometryInputs,
  type MarkerGeometry,
  type MilestoneLayer,
  type MilestoneLayerRole,
  type Path,
  type PathSegment,
  type Point,
  type ProgressSymbol,
  type ResumeGeometry,
  type TaskGeometry,
} from './schedule-geometry'

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

// see GA-7, GA-8, FD-4, FD-5
/** @purity pure */
function fadeHandlePoints(placed: TaskPlacement, planTop: number): readonly Point[] {
  return [
    point(placed.x + placed.fadeInPx, planTop),
    point(placed.x + placed.width - placed.fadeOutPx, planTop + placed.planHeight),
  ]
}

// see LF-6
/** @purity pure */
function chevronNotch(width: number, height: number, settings: DrawnSettings): number {
  return Math.min(width * settings.chevronNotchOfWidth, height * settings.chevronNotchOfHeight)
}

// see SH-2, FD-5
/** @purity pure */
function chevronOutline(x0: number, x1: number, top: number, height: number,
                        startNotch: number, endTip: number): Path {
  const middle = top + height / 2
  const bottom = top + height
  return [
    point(x0, top),
    point(x1 - endTip, top),
    point(x1, middle),
    point(x1 - endTip, bottom),
    point(x0, bottom),
    point(x0 + startNotch, middle),
  ]
}

interface FadeEnds {
  readonly fadeIn: number | null
  readonly fadeOut: number | null
}

// see FD-6a
const UNSET_FADE: FadeEnds = { fadeIn: null, fadeOut: null }

// see FD-5, LF-6
// TRAP: each end from its own fade; one fade must never reshape the other end (FD-5 MUST NOT).
/** @purity pure */
function chevronBarOf(placed: TaskPlacement, x0: number, x1: number, top: number, height: number,
                      fade: FadeEnds, isActual: boolean, settings: DrawnSettings): BarGeometry {
  const planNotch = chevronNotch(placed.width, placed.planHeight, settings)
  const unfaded = isActual ? planNotch * settings.actualOfPlan : planNotch
  // TRAP: null, never 0, takes the plain depth: a 0 end is drawn flat (FD-5).
  const startNotch = fade.fadeIn ?? unfaded
  const endTip = fade.fadeOut ?? unfaded
  return { form: 'outline', points: chevronOutline(x0, x1, top, height, startNotch, endTip) }
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

interface UnitShape {
  readonly layers: readonly MilestoneLayer[]
  readonly outline: Path
}

interface ShapeSource {
  readonly role: string
  readonly d: string
  readonly rule?: string
}

// see LF-18
// WHY: flattened only for the hit and the boxes; fine enough that a pointer never finds a corner.
const CURVE_STEPS_PER_TURN = 48

const PATH_ARITY: Readonly<Record<string, number>> = { M: 2, L: 2, H: 1, V: 1, Q: 4, A: 7, Z: 0 }

/** @purity pure */
function segmentOf(command: string, values: readonly number[], at: Point): PathSegment {
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0] = values
  switch (command) {
    case 'M':
      return { command: 'M', to: point(a, b) }
    case 'H':
      return { command: 'L', to: point(a, at.y) }
    case 'V':
      return { command: 'L', to: point(at.x, a) }
    case 'Q':
      return { command: 'Q', control: point(a, b), to: point(c, d) }
    case 'A':
      return { command: 'A', radiusX: a, radiusY: b, rotation: c, largeArc: d !== 0, sweep: e !== 0, to: point(f, g) }
    case 'Z':
      return { command: 'Z' }
    default:
      return { command: 'L', to: point(a, b) }
  }
}

/** @purity pure */
function pathSegmentsOf(data: string): readonly PathSegment[] {
  const tokens = data.match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []
  const out: PathSegment[] = []
  let at = point(0, 0)
  let start = at
  let command = ''
  let index = 0
  while (index < tokens.length) {
    if (/[A-Za-z]/.test(tokens[index]!)) {
      command = tokens[index]!
      index += 1
    }
    const arity = PATH_ARITY[command]
    const values = tokens.slice(index, index + (arity ?? 0)).map(Number)
    if (arity === undefined || values.length !== arity || values.some(Number.isNaN)) {
      throw new Error(`milestone-shapes.json: cannot read "${command}" in "${data}"`)
    }
    index += arity
    const segment = segmentOf(command, values, at)
    out.push(...(segment.command === 'A' ? quarterArcs(at, segment) : [segment]))
    if (segment.command === 'Z') {
      at = start
      command = ''
    } else {
      at = segment.to
      if (segment.command === 'M') start = at
      if (segment.command === 'M') command = 'L'
    }
  }
  return out
}

/** @purity pure */
function sampled(steps: number, pointAt: (fraction: number) => Point): Point[] {
  const out: Point[] = []
  for (let step = 1; step <= steps; step += 1) out.push(pointAt(step / steps))
  return out
}

/** @purity pure */
function quadraticPoints(from: Point, curve: { readonly control: Point; readonly to: Point }): Point[] {
  return sampled(CURVE_STEPS_PER_TURN / 4, (t) => {
    const u = 1 - t
    return point(
      u * u * from.x + 2 * u * t * curve.control.x + t * t * curve.to.x,
      u * u * from.y + 2 * u * t * curve.control.y + t * t * curve.to.y,
    )
  })
}

type ArcSegment = Extract<PathSegment, { command: 'A' }>

interface ArcFrame {
  readonly centre: Point
  readonly rx: number
  readonly ry: number
  readonly cos: number
  readonly sin: number
  readonly first: number
  readonly swept: number
}

// WHY: the endpoint-to-centre conversion of the SVG arc, so the hit outline follows the drawn curve.
/** @purity pure */
function arcFrameOf(from: Point, arc: ArcSegment): ArcFrame {
  const turn = (arc.rotation * Math.PI) / 180
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  const halfX = (from.x - arc.to.x) / 2
  const halfY = (from.y - arc.to.y) / 2
  const x1 = cos * halfX + sin * halfY
  const y1 = -sin * halfX + cos * halfY
  const grow = Math.max(1, Math.sqrt((x1 * x1) / arc.radiusX ** 2 + (y1 * y1) / arc.radiusY ** 2))
  const rx = Math.abs(arc.radiusX) * grow
  const ry = Math.abs(arc.radiusY) * grow
  const across = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const reach = Math.sqrt(Math.max(0, (rx * rx * ry * ry - across) / across))
  const factor = arc.largeArc === arc.sweep ? -reach : reach
  const cx1 = (factor * rx * y1) / ry
  const cy1 = (-factor * ry * x1) / rx
  const first = Math.atan2((y1 - cy1) / ry, (x1 - cx1) / rx)
  let swept = Math.atan2((-y1 - cy1) / ry, (-x1 - cx1) / rx) - first
  if (arc.sweep && swept < 0) swept += 2 * Math.PI
  if (!arc.sweep && swept > 0) swept -= 2 * Math.PI
  const centre = point(cos * cx1 - sin * cy1 + (from.x + arc.to.x) / 2, sin * cx1 + cos * cy1 + (from.y + arc.to.y) / 2)
  return { centre, rx, ry, cos, sin, first, swept }
}

/** @purity pure */
function onArc(frame: ArcFrame, fraction: number): Point {
  const angle = frame.first + frame.swept * fraction
  const ex = frame.rx * Math.cos(angle)
  const ey = frame.ry * Math.sin(angle)
  return point(frame.cos * ex - frame.sin * ey + frame.centre.x, frame.sin * ex + frame.cos * ey + frame.centre.y)
}

/** @purity pure */
function arcPoints(from: Point, arc: ArcSegment): Point[] {
  const frame = arcFrameOf(from, arc)
  const steps = Math.max(1, Math.ceil((Math.abs(frame.swept) * CURVE_STEPS_PER_TURN) / (2 * Math.PI)))
  return sampled(steps, (fraction) => onArc(frame, fraction))
}

// TRAP: a half arc bulges once its ends are rounded to the drawn grid (the radius lands under half the chord); quarters never do.
/** @purity pure */
function quarterArcs(from: Point, arc: ArcSegment): readonly ArcSegment[] {
  const frame = arcFrameOf(from, arc)
  const pieces = Math.max(1, Math.ceil(Math.abs(frame.swept) / (Math.PI / 2) - 1e-9))
  return sampled(pieces, (fraction) => onArc(frame, fraction)).map((to, index) => ({
    ...arc,
    radiusX: frame.rx,
    radiusY: frame.ry,
    largeArc: false,
    to: index === pieces - 1 ? arc.to : to,
  }))
}

/** @purity pure */
function ringsOf(segments: readonly PathSegment[]): Point[][] {
  const rings: Point[][] = []
  let ring: Point[] = []
  let at = point(0, 0)
  for (const segment of segments) {
    if (segment.command === 'Z') {
      at = ring[0] ?? at
      continue
    }
    if (segment.command === 'M') {
      ring = [segment.to]
      rings.push(ring)
    } else if (segment.command === 'Q') {
      ring.push(...quadraticPoints(at, segment))
    } else if (segment.command === 'A') {
      ring.push(...arcPoints(at, segment))
    } else {
      ring.push(segment.to)
    }
    at = segment.to
  }
  return rings
}

/** @purity pure */
function oriented(ring: readonly Point[], positive: boolean): Point[] {
  let twiceArea = 0
  for (let index = 0, back = ring.length - 1; index < ring.length; back = index, index += 1) {
    twiceArea += ring[back]!.x * ring[index]!.y - ring[index]!.x * ring[back]!.y
  }
  return twiceArea > 0 === positive ? [...ring] : [...ring].reverse()
}

// see LF-18, HT-1
// TRAP: each later ring is reached from the first ring's start and walked back, so the bridges cancel under non-zero.
/** @purity pure */
function joinedRings(rings: readonly (readonly Point[])[]): Path {
  const first = rings[0]
  if (first === undefined) return []
  const out: Point[] = [...first]
  for (const ring of rings.slice(1)) out.push(first[0]!, ...ring, ring[0]!)
  return out
}

// WHY: bodies stay apart, each painted over the one behind it; a run of lines or dots is one element.
/** @purity pure */
function mergedLayers(layers: readonly MilestoneLayer[]): readonly MilestoneLayer[] {
  const out: MilestoneLayer[] = []
  for (const layer of layers) {
    const last = out[out.length - 1]
    if (last !== undefined && layer.role !== 'body' && last.role === layer.role && last.evenOdd === layer.evenOdd) {
      out[out.length - 1] = { ...last, segments: [...last.segments, ...layer.segments] }
    } else {
      out.push(layer)
    }
  }
  return out
}

/** @purity pure */
function isLayerRole(role: string): role is MilestoneLayerRole {
  return role === 'body' || role === 'inner' || role === 'dot' || role === 'shade'
}

// see LF-18, F-044
// TRAP: an even-odd body keeps its first ring and turns the others into holes; a nested island would be lost.
/** @purity pure */
function unitShapeOf(source: readonly ShapeSource[]): UnitShape {
  const layers = mergedLayers(source.map((one) => {
    if (!isLayerRole(one.role)) throw new Error(`milestone-shapes.json: unknown role "${one.role}"`)
    return { role: one.role, evenOdd: one.rule === 'evenodd', segments: pathSegmentsOf(one.d) }
  }))
  const rings = layers
    .filter((layer) => layer.role === 'body')
    .flatMap((layer) => ringsOf(layer.segments).map((ring, index) => oriented(ring, !layer.evenOdd || index === 0)))
  return { layers, outline: joinedRings(rings) }
}

const UNIT_SHAPES: ReadonlyMap<string, UnitShape> = new Map(
  milestoneShapes.shapes.map((shape) => [shape.glyph, unitShapeOf(shape.layers)]),
)

// see LF-10, S-48
// WHY: the star alone is built here, not read from F-044: S-48 is a document setting, and F-044 draws its default.
/** @purity pure */
function starShapeOf(innerOfOuter: number): UnitShape {
  const origin = point(0, 0)
  const outer = regularCorners(origin, 1, 5, 0)
  const waist = regularCorners(origin, innerOfOuter, 5, 0.1)
  const corners = outer.flatMap((one, step) => [one, waist[step]!])
  const ys = corners.map((one) => one.y)
  const lift = (Math.min(...ys) + Math.max(...ys)) / 2
  const ring = corners.map((one) => point(one.x, one.y - lift))
  const segments: PathSegment[] = ring.map((one, index) => ({ command: index === 0 ? 'M' : 'L', to: one }))
  segments.push({ command: 'Z' })
  return { layers: [{ role: 'body', evenOdd: false, segments }], outline: ring }
}

/** @purity pure */
function shapeOfGlyph(glyph: MilestoneGlyph, starInnerOfOuter: number): UnitShape {
  if (glyph === 'star') return starShapeOf(starInnerOfOuter)
  const shape = UNIT_SHAPES.get(glyph) ?? UNIT_SHAPES.get('diamond')
  if (shape === undefined) throw new Error(`milestone-shapes.json: no shape for "${glyph}"`)
  return shape
}

/** @purity pure */
function placedPoint(one: Point, centre: Point, half: number): Point {
  return point(centre.x + half * one.x, centre.y + half * one.y)
}

/** @purity pure */
function placedSegment(segment: PathSegment, centre: Point, half: number): PathSegment {
  /** @purity pure */
  const at = (one: Point): Point => placedPoint(one, centre, half)
  switch (segment.command) {
    case 'Z':
      return segment
    case 'Q':
      return { command: 'Q', control: at(segment.control), to: at(segment.to) }
    case 'A':
      return { ...segment, radiusX: segment.radiusX * half, radiusY: segment.radiusY * half, to: at(segment.to) }
    default:
      return { command: segment.command, to: at(segment.to) }
  }
}

// see LF-10, LF-18, DM-4
/** @purity pure */
function milestoneBarOf(centre: Point, side: number, glyph: MilestoneGlyph,
                        starInnerOfOuter: number): BarGeometry {
  const unit = shapeOfGlyph(glyph, starInnerOfOuter)
  const half = side / 2
  return {
    form: 'outline',
    points: unit.outline.map((one) => placedPoint(one, centre, half)),
    layers: unit.layers.map((layer) => ({
      role: layer.role,
      evenOdd: layer.evenOdd,
      segments: layer.segments.map((segment) => placedSegment(segment, centre, half)),
    })),
  }
}

// see XS-5, XS-6
// TRAP: repeats lineBar's XS-5 head height and XS-5 dot size; change both together.
/** @purity pure */
function lineEndHalfHeight(kind: 'arrow' | 'endpointSpan', settings: DrawnSettings): number {
  return (kind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// see LF-7, LF-8, XS-5
/** @purity pure */
function lineBar(kind: ShapeKind, x0: number, x1: number, middle: number,
                 settings: DrawnSettings): BarGeometry {
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
export function isThinShape(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

// see XS-4, XS-5, XS-6, XS-7
// TRAP: shape-cross-sections.ts reserves the same three tiers (shapeHeightOf, labelLiftOf); change them together.
/** @purity pure */
export function thinTierMiddle(placed: TaskPlacement, settings: DrawnSettings,
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
    return milestoneBarOf(point((x0 + x1) / 2, top + height / 2), height, placed.milestoneGlyph,
                          settings.starInnerOfOuter)
  }
  if (kind === 'arrow' || kind === 'endpointSpan') {
    // TRAP: the tier, never top + height / 2: XS-5 and XS-6 stack the two lines by their own edges.
    return lineBar(kind, x0, x1, thinTierMiddle(placed, settings, isActual), settings)
  }
  // TRAP: read the plan's fades off the placement, never clamp again: LC-6 judged the fit with these numbers.
  const fade: FadeEnds = isActual
    ? UNSET_FADE
    : {
        fadeIn: placed.fadeInUnset ? null : placed.fadeInPx,
        fadeOut: placed.fadeOutUnset ? null : placed.fadeOutPx,
      }
  if (kind === 'chevron') return chevronBarOf(placed, x0, x1, top, height, fade, isActual, settings)
  return { form: 'outline', points: fadedOutline(x0, x1, top, height, fade.fadeIn ?? 0, fade.fadeOut ?? 0) }
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
function labelTierMiddleOf(placed: TaskPlacement, settings: DrawnSettings): number {
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

// see DA-1, DA-2, DA-3, DA-4, DA-5
// TRAP: gate on no toggle, unlike markerOf: hiding the plan or the markers must not hide the deadline (DA-1).
/** @purity pure */
function deadlineOf(placed: TaskPlacement, settings: DrawnSettings): DeadlineGeometry | null {
  const x = placed.deadlineX
  if (x === null) return null
  const d = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  const top = labelTierMiddleOf(placed, settings) - d / 2
  const tipY = top + d
  const headY = tipY - d * NOT_STORED_DEADLINE_MARK_SIZES['S-366']
  const head = deadlineHeadHalfWidthOf(d)
  const shaft = (d * NOT_STORED_DEADLINE_MARK_SIZES['S-367']) / 2
  return {
    outline: [
      point(x - shaft, top),
      point(x - shaft, headY),
      point(x - head, headY),
      point(x, tipY),
      point(x + head, headY),
      point(x + shaft, headY),
      point(x + shaft, top),
    ],
    haloWidth: d * settings.labelHaloOfFont,
  }
}

// see LF-13, XS-10, XS-12, S-25
/** @purity pure */
function resumeOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  settings: DrawnSettings): ResumeGeometry {
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
function labelTopOf(settings: DrawnSettings, placed: TaskPlacement, height: number): number {
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

/** @purity pure */
export function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry {
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
    assigneeLabel: outsideLabelBoxOf(inputs, placed),
    deadline: deadlineOf(placed, settings),
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
const NOT_STORED_DEADLINE_MARK_SIZES: {
  readonly 'S-365': number
  readonly 'S-366': number
  readonly 'S-367': number
} = {
  'S-365': 0.75,
  'S-366': 0.5,
  'S-367': 0.25,
}
// </generated>

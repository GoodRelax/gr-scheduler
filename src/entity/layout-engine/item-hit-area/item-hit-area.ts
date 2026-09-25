// ItemHitArea: what the pointer is on, by tables T-023d, T-266, T-267 and T-268.
// @unit      UF-7   (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-7
// The NOT_STORED_SIZES region at the bottom is generated from docs/spec/_source/settings.json by npm run gen; do not edit by hand.
// TRAP: never quote the region's opening marker in a comment; the generator injects the block at the first one.

import {
  leaderOf,
  type BarGeometry,
  type CommentGeometry,
  type DependencyGeometry,
  type HighlightGeometry,
  type MarkerGeometry,
  type Path,
  type Point,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../screen-regions/screen-regions'

// see SL-1
export type Item =
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'dependency'; readonly predecessorUid: number; readonly successorUid: number }
  | { readonly kind: 'highlightBox'; readonly id: string }
  | { readonly kind: 'commentBox'; readonly id: string }
  | { readonly kind: 'statusLine' }

// see T-266, GR-23
export type GrabArea =
  | 'GA-1' | 'GA-2' | 'GA-3' | 'GA-4' | 'GA-5' | 'GA-6' | 'GA-7' | 'GA-8'
  | 'GA-9' | 'GA-10' | 'GA-11' | 'GA-12' | 'GA-13' | 'GA-14' | 'GA-15' | 'GA-16'
  | 'GA-17' | 'GA-18' | 'GA-19' | 'GA-20' | 'GA-21' | 'GA-22'
  | 'GR-10' | 'GR-11' | 'GR-14' | 'GR-16'

// see GR-14
// WHY: 'body' reads as "move the whole thing", which a highlight box answers on its frame alone.
export type BoxPart =
  | { readonly kind: 'body' }
  | { readonly kind: 'anchor' }
  | { readonly kind: 'leader' }
  | {
      readonly kind: 'corner'
      readonly horizontal: 'left' | 'right'
      readonly vertical: 'top' | 'bottom'
    }

export interface Hit {
  readonly item: Item
  readonly grab: GrabArea
  // WHY: optional, not required: only GR-14 holds more than one place; an absent part reads as the body.
  readonly boxPart?: BoxPart
}

export type PointerResolution = 'press' | 'doubleClick'

// see T-206
export type GrabSizes = typeof NOT_STORED_SIZES

// WHY: no display scale argument: DS-7 keeps every grab margin at its own size whatever the chart is drawn at.
/** @purity pure */
export function grabSizesOf(): GrabSizes {
  return NOT_STORED_SIZES
}

type Span = { readonly from: number; readonly to: number }

/** @purity pure */
function isInsideRect(x: number, y: number, box: ScreenRect): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

/** @purity pure */
function isNearPoint(x: number, y: number, at: Point, halfWidth: number, halfHeight: number): boolean {
  return Math.abs(x - at.x) <= halfWidth && Math.abs(y - at.y) <= halfHeight
}

/** @purity pure */
function rightOf(box: ScreenRect): number {
  return box.x + box.width
}

/** @purity pure */
function bottomOf(box: ScreenRect): number {
  return box.y + box.height
}

/** @purity pure */
function centreOf(box: ScreenRect): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** @purity pure */
function grown(box: ScreenRect, across: number, down: number): ScreenRect {
  return {
    x: box.x - across,
    y: box.y - down,
    width: box.width + across * 2,
    height: box.height + down * 2,
  }
}

/** @purity pure */
function rectOfSpans(across: Span, down: Span): ScreenRect | null {
  if (across.to < across.from || down.to < down.from) return null
  return {
    x: across.from,
    y: down.from,
    width: across.to - across.from,
    height: down.to - down.from,
  }
}

/** @purity pure */
function boxOfPath(points: Path): ScreenRect | null {
  if (points.length === 0) return null
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/** @purity pure */
function merged(a: ScreenRect | null, b: ScreenRect | null): ScreenRect | null {
  if (a === null) return b
  if (b === null) return a
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(rightOf(a), rightOf(b)) - x,
    height: Math.max(bottomOf(a), bottomOf(b)) - y,
  }
}

/** @purity pure */
function distanceToSegment(x: number, y: number, from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = dx * dx + dy * dy
  if (length === 0) return Math.hypot(x - from.x, y - from.y)
  const along = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / length))
  return Math.hypot(x - (from.x + along * dx), y - (from.y + along * dy))
}

/** @purity pure */
function isOnPolyline(x: number, y: number, points: Path, reach: number): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (distanceToSegment(x, y, points[index - 1]!, points[index]!) <= reach) return true
  }
  return false
}

/** @purity pure */
function isInsideOutline(x: number, y: number, points: Path): boolean {
  let inside = false
  for (let index = 0, back = points.length - 1; index < points.length; back = index, index += 1) {
    const a = points[index]!
    const b = points[back]!
    if (distanceToSegment(x, y, a, b) === 0) return true
    const crosses = (a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

// see HT-1
// TRAP: butt ends and square joins, not a distance: a round end reaches past the Task edge the line meets.
/** @purity pure */
function isOnTheStroke(x: number, y: number, points: Path, half: number): boolean {
  const last = points.length - 1
  for (let index = 1; index <= last; index += 1) {
    const from = points[index - 1]!
    const to = points[index]!
    const length = Math.hypot(to.x - from.x, to.y - from.y)
    if (length === 0) continue
    const along = ((x - from.x) * (to.x - from.x) + (y - from.y) * (to.y - from.y)) / length
    const across = Math.abs((x - from.x) * (to.y - from.y) - (y - from.y) * (to.x - from.x)) / length
    const before = index === 1 ? 0 : half
    const after = index === last ? 0 : half
    if (across <= half && along >= -before && along <= length + after) return true
  }
  return false
}

// see T-012, T-271
type ShapeFamily = 'bar' | 'line' | 'milestone'

/** @purity pure */
function familyOf(kind: TaskGeometry['shapeKind']): ShapeFamily {
  if (kind === 'milestone') return 'milestone'
  return kind === 'arrow' || kind === 'endpointSpan' ? 'line' : 'bar'
}

// see HT-1, XS-5, XS-6
// WHY: the end mark counts: the reference points are read off the bar itself, not off this box.
/** @purity pure */
function bandOfBar(bar: BarGeometry | null): ScreenRect | null {
  if (bar === null) return null
  if (bar.form === 'outline') return boxOfPath(bar.points)
  const half = bar.strokeWidth / 2
  let box = boxOfPath([
    { x: bar.from.x, y: bar.from.y - half },
    { x: bar.to.x, y: bar.to.y + half },
    ...(bar.head ?? []),
  ])
  for (const dot of bar.dots) {
    const side = dot.radius * 2
    box = merged(box, { x: dot.at.x - dot.radius, y: dot.at.y - dot.radius, width: side, height: side })
  }
  return box
}

// see GA-18
/** @purity pure */
function boxOfMarker(marker: MarkerGeometry | null): ScreenRect | null {
  if (marker === null) return null
  const side = marker.radius * 2
  return {
    x: marker.centre.x - marker.radius,
    y: marker.centre.y - marker.radius,
    width: side,
    height: side,
  }
}

type Drawn = {
  readonly band: ScreenRect
  /** @purity pure */
  readonly covers: (x: number, y: number) => boolean
}

// see HT-1
// WHY: an outline answers inside its figure, a line inside its band; a notch is outside both.
/** @purity pure */
function drawnOfBar(bar: BarGeometry | null): Drawn | null {
  const band = bandOfBar(bar)
  if (bar === null || band === null) return null
  if (bar.form === 'outline') {
    return { band, covers: (x, y) => isInsideOutline(x, y, bar.points) }
  }
  return { band, covers: (x, y) => isInsideRect(x, y, band) }
}

/** @purity pure */
function drawnOfRect(box: ScreenRect | null): Drawn | null {
  if (box === null) return null
  return { band: box, covers: (x, y) => isInsideRect(x, y, box) }
}

type TaskShape = {
  readonly task: TaskGeometry
  readonly family: ShapeFamily
  readonly planBand: ScreenRect | null
  readonly actualBand: ScreenRect | null
  readonly dummyInk: ScreenRect | null
  readonly markerBox: ScreenRect | null
  readonly resumeBox: ScreenRect | null
  readonly midline: number | null
  readonly drawn: readonly Drawn[]
}

// see XS-7
// WHY: the dummy stands in for the actual, whose row is kept whether or not one is drawn.
/** @purity pure */
function midlineOf(plan: ScreenRect | null, below: ScreenRect | null): number | null {
  if (plan === null || below === null) return null
  return (centreOf(plan).y + centreOf(below).y) / 2
}

// TRAP: reads the first dummy's ink only; task-figures.ts gives every dummy of a Task the same one.
/** @purity pure */
function shapeOf(task: TaskGeometry): TaskShape {
  const family = familyOf(task.shapeKind)
  const planBand = bandOfBar(task.plan)
  const actualBand = bandOfBar(task.actual)
  const dummyInk = task.dummies[0]?.ink ?? null
  const markerBox = boxOfMarker(task.marker)
  const resumeBox = task.resume === null ? null : task.resume.box
  const drawn = [
    drawnOfBar(task.plan),
    drawnOfBar(task.actual),
    drawnOfRect(dummyInk),
    drawnOfRect(markerBox),
    drawnOfRect(resumeBox),
  ].filter((one): one is Drawn => one !== null)
  return {
    task,
    family,
    planBand,
    actualBand,
    dummyInk,
    markerBox,
    resumeBox,
    midline: family === 'line' ? midlineOf(planBand, actualBand ?? dummyInk) : null,
    drawn,
  }
}

/** @purity pure */
function isOnTheDrawnShape(shape: TaskShape, x: number, y: number): boolean {
  return shape.drawn.some((one) => one.covers(x, y))
}

// see HT-2
// WHY: the nearest drawn shape, not one box round them all, which would swallow the room between.
/** @purity pure */
function verticalDistanceOf(shape: TaskShape, y: number): number {
  let nearest = Number.POSITIVE_INFINITY
  for (const one of shape.drawn) {
    nearest = Math.min(nearest, Math.max(one.band.y - y, y - bottomOf(one.band), 0))
  }
  return nearest
}

// see T-268
type TypeName =
  | 'fade'
  | 'markerOutside'
  | 'resume'
  | 'dummy'
  | 'actualEnd'
  | 'dependency'
  | 'planEnd'
  | 'markerInside'
  | 'milestonePlan'
  | 'body'

// see T-268
// TRAP: the two columns part in one place only, where the dependency line stands.
const ON_SHAPE_ORDER: readonly TypeName[] = [
  'fade', 'markerOutside', 'resume', 'dummy', 'actualEnd',
  'dependency', 'planEnd', 'markerInside', 'milestonePlan', 'body',
]

// see T-268
const OFF_SHAPE_ORDER: readonly TypeName[] = [
  'fade', 'dependency', 'markerOutside', 'resume', 'dummy',
  'actualEnd', 'planEnd', 'markerInside', 'milestonePlan', 'body',
]

// see HT-3
// WHY: a list of its own, not a swap: every other type falls behind both of these two.
const ON_MARKER_BOX_ORDER: readonly TypeName[] = [
  'dummy', 'actualEnd', 'markerOutside', 'markerInside', 'resume',
  'fade', 'dependency', 'planEnd', 'milestonePlan', 'body',
]

type RegionSeed = {
  readonly grab: GrabArea
  readonly type: TypeName
  readonly taskUid: number
  readonly anchorX: number
  readonly finishSide?: true
}

type Region = {
  readonly grab: GrabArea
  readonly type: TypeName
  readonly item: Item
  readonly centre: Point
  readonly anchorX: number
  readonly finishSide: boolean
  readonly taskUid: number | null
  /** @purity pure */
  readonly covers: (x: number, y: number) => boolean
}

/** @purity pure */
function taskRegion(seed: RegionSeed, across: Span, down: Span): Region | null {
  const rect = rectOfSpans(across, down)
  if (rect === null) return null
  return {
    grab: seed.grab,
    type: seed.type,
    item: { kind: 'task', taskUid: seed.taskUid },
    centre: centreOf(rect),
    anchorX: seed.anchorX,
    finishSide: seed.finishSide === true,
    taskUid: seed.taskUid,
    covers: (x, y) => isInsideRect(x, y, rect),
  }
}

/** @purity pure */
function acrossOf(box: ScreenRect): Span {
  return { from: box.x, to: rightOf(box) }
}

/** @purity pure */
function downOf(box: ScreenRect): Span {
  return { from: box.y, to: bottomOf(box) }
}

// see T-266
/** @purity pure */
function bandSpan(band: ScreenRect, over: number): Span {
  return { from: band.y - over, to: bottomOf(band) + over }
}

// see GA-1, GA-2, GA-3, GA-4, GA-5, GA-6
// TRAP: outward and inward, never a two-sided reach: the outward figure lies past the drawn edge.
/** @purity pure */
function endSpan(edge: number, outward: number, inward: number, side: 'left' | 'right'): Span {
  return side === 'left'
    ? { from: edge - outward, to: edge + inward }
    : { from: edge - inward, to: edge + outward }
}

// see GA-10, GA-11, GA-12, GA-13, GA-15, GA-21, GA-22
/** @purity pure */
function centredSpan(at: number, width: number): Span {
  return { from: at - width / 2, to: at + width / 2 }
}

// see XS-7
/** @purity pure */
function clippedToMidline(down: Span, midline: number | null, side: 'above' | 'below'): Span {
  if (midline === null) return down
  return side === 'above'
    ? { from: down.from, to: Math.min(down.to, midline) }
    : { from: Math.max(down.from, midline), to: down.to }
}

// see GA-21, GA-22
/** @purity pure */
function clippedAcross(across: Span, at: number, side: 'left' | 'right'): Span {
  return side === 'left'
    ? { from: across.from, to: Math.min(across.to, at) }
    : { from: Math.max(across.from, at), to: across.to }
}

// see GA-10, GA-11, GA-12, GA-13
// WHY: the arrow head's own middle, not where the axis stops; a dot stands on the bar's own end.
/** @purity pure */
function lineEndOf(bar: BarGeometry, side: 'left' | 'right'): Point {
  if (bar.form === 'outline') {
    const box = boxOfPath(bar.points)
    if (box === null) return { x: 0, y: 0 }
    return { x: side === 'left' ? box.x : rightOf(box), y: centreOf(box).y }
  }
  if (side === 'left') return bar.from
  const head = boxOfPath(bar.head ?? [])
  return head === null ? bar.to : centreOf(head)
}

// see GA-1, GA-2, GA-10, GA-11, GA-15
/** @purity pure */
function planRegionsOf(shape: TaskShape, sizes: GrabSizes): readonly (Region | null)[] {
  const band = shape.planBand
  const bar = shape.task.plan
  if (band === null || bar === null) return []
  const uid = shape.task.taskUid
  if (shape.family === 'milestone') {
    const middle = centreOf(band).x
    return [taskRegion(
      { grab: 'GA-15', type: 'milestonePlan', taskUid: uid, anchorX: middle },
      centredSpan(middle, band.width * sizes['S-278']),
      bandSpan(band, sizes['S-279']),
    )]
  }
  if (shape.family === 'line') {
    const start = lineEndOf(bar, 'left')
    const finish = lineEndOf(bar, 'right')
    return [
      taskRegion(
        { grab: 'GA-10', type: 'planEnd', taskUid: uid, anchorX: start.x },
        centredSpan(start.x, sizes['S-270']),
        clippedToMidline(bandSpan(band, sizes['S-271']), shape.midline, 'above'),
      ),
      taskRegion(
        { grab: 'GA-11', type: 'planEnd', taskUid: uid, anchorX: finish.x, finishSide: true },
        centredSpan(finish.x, sizes['S-272']),
        clippedToMidline(bandSpan(band, sizes['S-273']), shape.midline, 'above'),
      ),
    ]
  }
  return [
    taskRegion(
      { grab: 'GA-1', type: 'planEnd', taskUid: uid, anchorX: band.x },
      endSpan(band.x, sizes['S-250'], sizes['S-251'], 'left'),
      bandSpan(band, sizes['S-252']),
    ),
    taskRegion(
      { grab: 'GA-2', type: 'planEnd', taskUid: uid, anchorX: rightOf(band), finishSide: true },
      endSpan(rightOf(band), sizes['S-253'], sizes['S-254'], 'right'),
      bandSpan(band, sizes['S-255']),
    ),
  ]
}

// see GA-3
// WHY: the marker's centre caps the inward reach, so a marker standing on the actual's start keeps
// its right half, which HT-3 leaves to it.
/** @purity pure */
function actualStartInwardOf(shape: TaskShape, sizes: GrabSizes, half: number): number {
  const inward = Math.min(sizes['S-257'], half)
  const marker = shape.task.marker
  if (shape.actualBand === null || marker === null) return inward
  const toCentre = marker.centre.x - shape.actualBand.x
  return toCentre >= 0 ? Math.min(inward, toCentre) : inward
}

// see GA-3, GA-4, GA-12, GA-13, GA-16
/** @purity pure */
function actualRegionsOf(shape: TaskShape, sizes: GrabSizes): readonly (Region | null)[] {
  const band = shape.actualBand
  const bar = shape.task.actual
  if (band === null || bar === null) return []
  const uid = shape.task.taskUid
  if (shape.family === 'milestone') {
    const box = grown(band, sizes['S-280'], sizes['S-281'])
    return [taskRegion(
      { grab: 'GA-16', type: 'actualEnd', taskUid: uid, anchorX: centreOf(band).x, finishSide: true },
      acrossOf(box),
      downOf(box),
    )]
  }
  if (shape.family === 'line') {
    const start = lineEndOf(bar, 'left')
    const finish = lineEndOf(bar, 'right')
    return [
      taskRegion(
        { grab: 'GA-12', type: 'actualEnd', taskUid: uid, anchorX: start.x },
        centredSpan(start.x, sizes['S-274']),
        clippedToMidline(bandSpan(band, sizes['S-275']), shape.midline, 'below'),
      ),
      taskRegion(
        { grab: 'GA-13', type: 'actualEnd', taskUid: uid, anchorX: finish.x, finishSide: true },
        centredSpan(finish.x, sizes['S-276']),
        clippedToMidline(bandSpan(band, sizes['S-277']), shape.midline, 'below'),
      ),
    ]
  }
  const half = band.width / 2
  return [
    taskRegion(
      { grab: 'GA-3', type: 'actualEnd', taskUid: uid, anchorX: band.x },
      endSpan(band.x, sizes['S-256'], actualStartInwardOf(shape, sizes, half), 'left'),
      bandSpan(band, sizes['S-258']),
    ),
    taskRegion(
      { grab: 'GA-4', type: 'actualEnd', taskUid: uid, anchorX: rightOf(band), finishSide: true },
      endSpan(rightOf(band), sizes['S-259'], Math.min(sizes['S-260'], half), 'right'),
      bandSpan(band, sizes['S-261']),
    ),
  ]
}

// see GA-5, GA-6, GA-17, GA-21, GA-22
// WHY: the family decides, not the mark's own row, which the three of them do not share.
/** @purity pure */
function dummyRegionsOf(shape: TaskShape, sizes: GrabSizes): readonly (Region | null)[] {
  const ink = shape.dummyInk
  if (ink === null) return []
  const uid = shape.task.taskUid
  const middle = centreOf(ink).x
  if (shape.family === 'milestone') {
    const box = grown(ink, sizes['S-282'], sizes['S-283'])
    return [taskRegion(
      { grab: 'GA-17', type: 'dummy', taskUid: uid, anchorX: middle },
      acrossOf(box),
      downOf(box),
    )]
  }
  if (shape.family === 'line') {
    return [
      taskRegion(
        { grab: 'GA-21', type: 'dummy', taskUid: uid, anchorX: ink.x },
        clippedAcross(centredSpan(ink.x, sizes['S-287']), middle, 'left'),
        clippedToMidline(bandSpan(ink, sizes['S-288']), shape.midline, 'below'),
      ),
      taskRegion(
        { grab: 'GA-22', type: 'dummy', taskUid: uid, anchorX: rightOf(ink), finishSide: true },
        clippedAcross(centredSpan(rightOf(ink), sizes['S-289']), middle, 'right'),
        clippedToMidline(bandSpan(ink, sizes['S-290']), shape.midline, 'below'),
      ),
    ]
  }
  const half = ink.width / 2
  return [
    taskRegion(
      { grab: 'GA-5', type: 'dummy', taskUid: uid, anchorX: ink.x },
      endSpan(ink.x, sizes['S-262'], Math.min(sizes['S-263'], half), 'left'),
      bandSpan(ink, sizes['S-264']),
    ),
    taskRegion(
      { grab: 'GA-6', type: 'dummy', taskUid: uid, anchorX: rightOf(ink), finishSide: true },
      endSpan(rightOf(ink), sizes['S-265'], Math.min(sizes['S-266'], half), 'right'),
      bandSpan(ink, sizes['S-267']),
    ),
  ]
}

// see GA-7, GA-8
// TRAP: never test the selection here; task-figures.ts already empties an unselected Task.
/** @purity pure */
function fadeRegionsOf(shape: TaskShape, sizes: GrabSizes): readonly (Region | null)[] {
  const uid = shape.task.taskUid
  const rows: readonly (readonly ['GA-7' | 'GA-8', number])[] = [
    ['GA-7', sizes['S-268']],
    ['GA-8', sizes['S-269']],
  ]
  return rows.map(([grab, side], index) => {
    const at = shape.task.fadeHandles[index]
    if (at === undefined) return null
    return taskRegion(
      { grab, type: 'fade', taskUid: uid, anchorX: at.x },
      centredSpan(at.x, side),
      centredSpan(at.y, side),
    )
  })
}

// see GA-18, TY-7
// WHY: read off the actual's own run, since the two places take different seats in the order.
/** @purity pure */
function markerRegionOf(shape: TaskShape, sizes: GrabSizes): Region | null {
  const box = shape.markerBox
  const marker = shape.task.marker
  if (box === null || marker === null) return null
  const actual = shape.actualBand
  const inside = actual !== null && marker.centre.x >= actual.x && marker.centre.x <= rightOf(actual)
  const grab = grown(box, sizes['S-284'], sizes['S-284'])
  return taskRegion(
    {
      grab: 'GA-18',
      type: inside ? 'markerInside' : 'markerOutside',
      taskUid: shape.task.taskUid,
      anchorX: marker.centre.x,
    },
    acrossOf(grab),
    downOf(grab),
  )
}

// see GA-20, XS-12
/** @purity pure */
function resumeRegionOf(shape: TaskShape, sizes: GrabSizes): Region | null {
  const box = shape.resumeBox
  if (box === null || shape.family === 'milestone') return null
  const grab = grown(box, sizes['S-286'], sizes['S-286'])
  return taskRegion(
    { grab: 'GA-20', type: 'resume', taskUid: shape.task.taskUid, anchorX: box.x },
    acrossOf(grab),
    clippedToMidline(downOf(grab), shape.midline, 'below'),
  )
}

// see GA-9, GA-14
// WHY: the drawn figure with no margin, so a notch belongs to whatever answers next.
/** @purity pure */
function bodyRegionOf(shape: TaskShape): Region | null {
  const band = shape.planBand
  const bar = shape.task.plan
  if (band === null || bar === null || shape.family === 'milestone') return null
  const seed: RegionSeed = {
    grab: shape.family === 'line' ? 'GA-14' : 'GA-9',
    type: 'body',
    taskUid: shape.task.taskUid,
    anchorX: centreOf(band).x,
  }
  if (bar.form === 'line') {
    return taskRegion(seed, acrossOf(band), clippedToMidline(downOf(band), shape.midline, 'above'))
  }
  const points = bar.points
  const region = taskRegion(seed, acrossOf(band), downOf(band))
  if (region === null) return null
  return { ...region, covers: (x, y) => isInsideOutline(x, y, points) }
}

/** @purity pure */
function regionsOfTask(shape: TaskShape, sizes: GrabSizes): readonly (Region | null)[] {
  return [
    ...fadeRegionsOf(shape, sizes),
    markerRegionOf(shape, sizes),
    resumeRegionOf(shape, sizes),
    ...dummyRegionsOf(shape, sizes),
    ...actualRegionsOf(shape, sizes),
    ...planRegionsOf(shape, sizes),
    bodyRegionOf(shape),
  ]
}

// see GA-19, HT-1
// WHY: the painted ink over a shape, the edge and its margin elsewhere; a thick line spreads nothing.
/** @purity pure */
function dependencyRegionOf(
  line: DependencyGeometry,
  sizes: GrabSizes,
  onShape: boolean,
): Region | null {
  const box = boxOfPath(line.points)
  if (box === null) return null
  const half = (line.strokeWidth ?? 0) / 2
  const reach = onShape ? half : half + sizes['S-285']
  const head = line.head ?? []
  return {
    grab: 'GA-19',
    type: 'dependency',
    item: {
      kind: 'dependency',
      predecessorUid: line.predecessorUid,
      successorUid: line.successorUid,
    },
    centre: centreOf(box),
    anchorX: rightOf(box),
    finishSide: false,
    taskUid: null,
    covers: (x, y) => isInsideOutline(x, y, head) || isOnTheStroke(x, y, line.points, reach),
  }
}

/** @purity pure */
function claimingRegions(
  geometry: ScheduleGeometry,
  shapes: readonly TaskShape[],
  x: number,
  y: number,
  sizes: GrabSizes,
  onShape: boolean,
): readonly Region[] {
  const out: Region[] = []
  for (const shape of shapes) {
    for (const region of regionsOfTask(shape, sizes)) {
      if (region !== null && region.covers(x, y)) out.push(region)
    }
  }
  for (const line of geometry.dependencies) {
    const region = dependencyRegionOf(line, sizes, onShape)
    if (region !== null && region.covers(x, y)) out.push(region)
  }
  return out
}

// see HT-1
// WHY: the Tasks under the pointer, never the one drawn last, nor a neighbour stacked over it.
/** @purity pure */
function keptOnTheShape(regions: readonly Region[], covered: readonly TaskShape[]): readonly Region[] {
  const uids = new Set(covered.map((one) => one.task.taskUid))
  return regions.filter((one) => one.taskUid === null || uids.has(one.taskUid))
}

// see HT-2
// TRAP: a dependency line is not a Task, so it never falls out here.
/** @purity pure */
function keptByVerticalNearness(
  regions: readonly Region[],
  shapes: readonly TaskShape[],
  y: number,
): readonly Region[] {
  const claimed = new Set(
    regions.map((one) => one.taskUid).filter((uid): uid is number => uid !== null),
  )
  if (claimed.size < 2) return regions
  const distances = new Map<number, number>()
  for (const shape of shapes) {
    if (claimed.has(shape.task.taskUid)) {
      distances.set(shape.task.taskUid, verticalDistanceOf(shape, y))
    }
  }
  const nearest = Math.min(...distances.values())
  return regions.filter((one) => one.taskUid === null || distances.get(one.taskUid) === nearest)
}

// see HT-3
/** @purity pure */
function orderFor(onShape: boolean, onMarkerBox: boolean): readonly TypeName[] {
  if (onMarkerBox) return ON_MARKER_BOX_ORDER
  return onShape ? ON_SHAPE_ORDER : OFF_SHAPE_ORDER
}

// see HT-4
// TRAP: never the painting order; FR-110 owns that, and this step is forbidden to read it.
/** @purity pure */
function beats(one: Region, held: Region, order: readonly TypeName[], x: number, y: number): boolean {
  const mine = order.indexOf(one.type)
  const theirs = order.indexOf(held.type)
  if (mine !== theirs) return mine < theirs
  const near = Math.hypot(x - one.centre.x, y - one.centre.y)
  const far = Math.hypot(x - held.centre.x, y - held.centre.y)
  if (near !== far) return near < far
  if (one.anchorX !== held.anchorX) return one.anchorX > held.anchorX
  return one.finishSide && !held.finishSide
}

/** @purity pure */
function bestOf(regions: readonly Region[], order: readonly TypeName[], x: number, y: number): Hit | null {
  let held: Region | null = null
  for (const one of regions) {
    if (held === null || beats(one, held, order, x, y)) held = one
  }
  return held === null ? null : { item: held.item, grab: held.grab }
}

/** @purity pure */
function isInsideOrNull(box: ScreenRect | null, x: number, y: number): boolean {
  return box !== null && isInsideRect(x, y, box)
}

// see GR-23, T-267
/** @purity pure */
function scheduleShapeHitOf(
  geometry: ScheduleGeometry,
  shapes: readonly TaskShape[],
  x: number,
  y: number,
  sizes: GrabSizes,
): Hit | null {
  const covered = shapes.filter((one) => isOnTheDrawnShape(one, x, y))
  const onShape = covered.length > 0
  const claiming = claimingRegions(geometry, shapes, x, y, sizes, onShape)
  const kept = onShape
    ? keptOnTheShape(claiming, covered)
    : keptByVerticalNearness(claiming, shapes, y)
  const onMarkerBox = shapes.some(
    (one) => isInsideOrNull(one.markerBox, x, y) || isInsideOrNull(one.resumeBox, x, y),
  )
  return bestOf(kept, orderFor(onShape, onMarkerBox), x, y)
}

// see GR-10, GR-11
// TRAP: the row order, not the Task order: GR-10 answers for every Task before GR-11 answers for any.
/** @purity pure */
function labelHitOf(geometry: ScheduleGeometry, x: number, y: number): Hit | null {
  for (const task of geometry.tasks) {
    if (task.label !== null && isInsideRect(x, y, task.label)) {
      return { item: { kind: 'task', taskUid: task.taskUid }, grab: 'GR-10' }
    }
  }
  for (const task of geometry.tasks) {
    if (task.assigneeLabel !== null && isInsideRect(x, y, task.assigneeLabel)) {
      return { item: { kind: 'task', taskUid: task.taskUid }, grab: 'GR-11' }
    }
  }
  return null
}

// see GR-14
// WHY: the nearest corner, not the first: on a one-day, one-row box at low zoom the four reaches overlap.
/** @purity pure */
function nearestCornerOf(box: ScreenRect, x: number, y: number, reach: number): BoxPart | null {
  let found: BoxPart | null = null
  let nearest = Number.POSITIVE_INFINITY
  for (const vertical of ['top', 'bottom'] as const) {
    for (const horizontal of ['left', 'right'] as const) {
      const corner = {
        x: horizontal === 'left' ? box.x : rightOf(box),
        y: vertical === 'top' ? box.y : bottomOf(box),
      }
      if (!isNearPoint(x, y, corner, reach, reach)) continue
      const distance = Math.hypot(x - corner.x, y - corner.y)
      if (distance < nearest) {
        nearest = distance
        found = { kind: 'corner', horizontal, vertical }
      }
    }
  }
  return found
}

// see GR-14, HT-1
// WHY: a closed polyline, not a rectangle with a hole, so that a reach of nothing still leaves the
// drawn line itself answering over a Task.
/** @purity pure */
function isOnTheFrame(x: number, y: number, box: ScreenRect, reach: number): boolean {
  const corners: Path = [
    { x: box.x, y: box.y },
    { x: rightOf(box), y: box.y },
    { x: rightOf(box), y: bottomOf(box) },
    { x: box.x, y: bottomOf(box) },
    { x: box.x, y: box.y },
  ]
  return isOnPolyline(x, y, corners, reach)
}

/** @purity pure */
function commentHit(box: CommentGeometry, boxPart: BoxPart): Hit {
  return { item: { kind: 'commentBox', id: box.id }, grab: 'GR-14', boxPart }
}

/** @purity pure */
function highlightHit(box: HighlightGeometry, boxPart: BoxPart): Hit {
  return { item: { kind: 'highlightBox', id: box.id }, grab: 'GR-14', boxPart }
}

// see GR-14, ZO-8, ZO-9
/** @purity pure */
function noteHitOf(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  sizes: GrabSizes,
  onShape: boolean,
): Hit | null {
  // WHY: the tip before the body: the tip is a handle laid on a Task and answers there too, so a
  // body read first would take it wherever the two meet.
  for (const box of geometry.commentBoxes) {
    if (isNearPoint(x, y, box.anchor, sizes['S-292'], sizes['S-292'])) {
      return commentHit(box, { kind: 'anchor' })
    }
  }
  for (const box of geometry.commentBoxes) {
    if (isInsideRect(x, y, box.body)) return commentHit(box, { kind: 'body' })
  }
  for (const box of geometry.commentBoxes) {
    if (isOnPolyline(x, y, leaderOf(box), sizes['S-291'])) return commentHit(box, { kind: 'leader' })
  }
  for (const box of geometry.highlightBoxes) {
    const corner = nearestCornerOf(box.box, x, y, sizes['S-230'])
    if (corner !== null) return highlightHit(box, corner)
  }
  for (const box of geometry.highlightBoxes) {
    if (isOnTheFrame(x, y, box.box, onShape ? 0 : sizes['S-293'])) {
      return highlightHit(box, { kind: 'body' })
    }
  }
  return null
}

// see GR-16
/** @purity pure */
function statusLineHitOf(geometry: ScheduleGeometry, x: number, y: number, sizes: GrabSizes): Hit | null {
  const status = geometry.statusLine
  if (status === null) return null
  const on = Math.abs(x - status.x) <= sizes['S-137'] && y >= status.top && y <= status.bottom
  return on ? { item: { kind: 'statusLine' }, grab: 'GR-16' } : null
}

// see T-023d
// TRAP: keep the printed order -- the two labels, the notes, the schedule shapes, the status line;
// sorting by row ID reverses it.
/** @purity pure */
export function itemAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  sizes: GrabSizes,
  resolving: PointerResolution = 'press',
): Hit | null {
  const shapes = geometry.tasks.map(shapeOf)
  if (resolving === 'doubleClick') {
    const label = labelHitOf(geometry, x, y)
    if (label !== null) return label
  }
  const onShape = shapes.some((one) => isOnTheDrawnShape(one, x, y))
  const note = noteHitOf(geometry, x, y, sizes, onShape)
  if (note !== null) return note
  const shape = scheduleShapeHitOf(geometry, shapes, x, y, sizes)
  if (shape !== null) return shape
  return statusLineHitOf(geometry, x, y, sizes)
}

export interface DependencyEnd {
  readonly taskUid: number
  readonly edge: 'start' | 'finish'
}

// see FR-009
// WHY: the labels count as well as the drawn shapes, since the tool that draws a line may land
// anywhere on the Task.
/** @purity pure */
function isOnTheTask(shape: TaskShape, x: number, y: number): boolean {
  if (isOnTheDrawnShape(shape, x, y)) return true
  const label = shape.task.label
  const assignee = shape.task.assigneeLabel
  return (label !== null && isInsideRect(x, y, label)) ||
    (assignee !== null && isInsideRect(x, y, assignee))
}

// see FR-009, PTD-3
// TRAP: a given uid tests no containment: the press may have reached the Task through ink outside its bar.
/** @purity pure */
export function dependencyEndAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  onTaskUid: number | null,
): DependencyEnd | null {
  for (const task of geometry.tasks) {
    if (onTaskUid !== null && task.taskUid !== onTaskUid) continue
    if (task.hasPlanDates === false) continue
    const shape = shapeOf(task)
    // TRAP: never `?? shape.actualBand` here: FR-009 (MUST NOT) forbids a
    // plan-less endpoint from falling to the actual band (DFC-658).
    const band = shape.planBand
    if (band === null) continue
    if (onTaskUid === null && !isOnTheTask(shape, x, y)) continue
    // TRAP: the middle belongs to the finish (<, not <=), which also keeps a zero-width bar answering one side.
    return { taskUid: task.taskUid, edge: x < band.x + band.width / 2 ? 'start' : 'finish' }
  }
  return null
}

// see PI-7, FR-009
/** @purity pure */
export function dependencyStartOfHit(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  hit: Hit | null,
): DependencyEnd | null {
  if (hit === null || hit.item.kind !== 'task') return null
  return dependencyEndAtPointer(geometry, x, y, hit.item.taskUid)
}

/** @purity pure */
function isEnclosedInclusive(box: ScreenRect | null, marquee: ScreenRect): boolean {
  if (box === null) return false
  return (
    box.x >= marquee.x &&
    box.y >= marquee.y &&
    rightOf(box) <= rightOf(marquee) &&
    bottomOf(box) <= bottomOf(marquee)
  )
}

// see SL-3, SL-7b
/** @purity pure */
export function itemsInMarquee(geometry: ScheduleGeometry, marquee: ScreenRect): readonly Item[] {
  const out: Item[] = []
  for (const task of geometry.tasks) {
    const shape = shapeOf(task)
    if (isEnclosedInclusive(merged(shape.planBand, shape.actualBand) ?? shape.dummyInk, marquee)) {
      out.push({ kind: 'task', taskUid: task.taskUid })
    }
  }
  for (const line of geometry.dependencies) {
    if (isEnclosedInclusive(boxOfPath(line.points), marquee)) {
      out.push({
        kind: 'dependency',
        predecessorUid: line.predecessorUid,
        successorUid: line.successorUid,
      })
    }
  }
  for (const box of geometry.commentBoxes) {
    if (isEnclosedInclusive(box.body, marquee)) out.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    if (isEnclosedInclusive(box.box, marquee)) out.push({ kind: 'highlightBox', id: box.id })
  }
  return out
}

// see T-023c, FR-049, T-240
// TRAP: never milestoneFigure: task-figures.ts builds it with the plan hidden too.
/** @purity pure */
export function isTaskDrawn(task: TaskGeometry): boolean {
  return task.plan !== null || task.actual !== null || task.dummies.length > 0
}

// WHY: structural, not the Selection type: components.json declares no ItemHitArea -> Selection edge.
export interface DrawnChoice<T extends ChosenItem> {
  readonly items: readonly T[]
  readonly ordered: boolean
}

export interface ChosenItem {
  readonly kind: string
  readonly uid?: number
}

// see T-023c, SL-7b
// TRAP: the same object when nothing leaves; the shell compares selections by identity.
/** @purity pure */
export function selectionWithinDrawn<T extends ChosenItem>(
  selection: DrawnChoice<T>,
  geometry: ScheduleGeometry,
): DrawnChoice<T> {
  const chosenTaskUids = new Set<number>()
  for (const item of selection.items) {
    if (item.kind === 'task' && item.uid !== undefined) chosenTaskUids.add(item.uid)
  }
  if (chosenTaskUids.size === 0) return selection
  const drawnTaskUids = new Set<number>()
  for (const task of geometry.tasks) {
    if (chosenTaskUids.has(task.taskUid) && isTaskDrawn(task)) drawnTaskUids.add(task.taskUid)
  }
  if (drawnTaskUids.size === chosenTaskUids.size) return selection
  const items = selection.items.filter(
    (item) => item.kind !== 'task' || item.uid === undefined || drawnTaskUids.has(item.uid),
  )
  return { items, ordered: selection.ordered }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_SIZES: {
  readonly 'S-250': number
  readonly 'S-251': number
  readonly 'S-252': number
  readonly 'S-253': number
  readonly 'S-254': number
  readonly 'S-255': number
  readonly 'S-256': number
  readonly 'S-257': number
  readonly 'S-258': number
  readonly 'S-259': number
  readonly 'S-260': number
  readonly 'S-261': number
  readonly 'S-262': number
  readonly 'S-263': number
  readonly 'S-264': number
  readonly 'S-265': number
  readonly 'S-266': number
  readonly 'S-267': number
  readonly 'S-268': number
  readonly 'S-269': number
  readonly 'S-270': number
  readonly 'S-271': number
  readonly 'S-272': number
  readonly 'S-273': number
  readonly 'S-274': number
  readonly 'S-275': number
  readonly 'S-276': number
  readonly 'S-277': number
  readonly 'S-278': number
  readonly 'S-279': number
  readonly 'S-280': number
  readonly 'S-281': number
  readonly 'S-282': number
  readonly 'S-283': number
  readonly 'S-284': number
  readonly 'S-285': number
  readonly 'S-286': number
  readonly 'S-287': number
  readonly 'S-288': number
  readonly 'S-289': number
  readonly 'S-290': number
  readonly 'S-137': number
  readonly 'S-230': number
  readonly 'S-293': number
  readonly 'S-291': number
  readonly 'S-292': number
} = {
  'S-250': 12,
  'S-251': 0,
  'S-252': 0,
  'S-253': 12,
  'S-254': 0,
  'S-255': 0,
  'S-256': 0,
  'S-257': 12,
  'S-258': 0,
  'S-259': 0,
  'S-260': 12,
  'S-261': 0,
  'S-262': 0,
  'S-263': 12,
  'S-264': 0,
  'S-265': 0,
  'S-266': 12,
  'S-267': 0,
  'S-268': 8,
  'S-269': 8,
  'S-270': 12,
  'S-271': 0,
  'S-272': 12,
  'S-273': 0,
  'S-274': 12,
  'S-275': 0,
  'S-276': 12,
  'S-277': 0,
  'S-278': 1.15,
  'S-279': 0,
  'S-280': 0,
  'S-281': 0,
  'S-282': 0,
  'S-283': 0,
  'S-284': 0,
  'S-285': 2,
  'S-286': 0,
  'S-287': 12,
  'S-288': 0,
  'S-289': 12,
  'S-290': 0,
  'S-137': 6,
  'S-230': 6,
  'S-293': 3,
  'S-291': 3,
  'S-292': 6,
}
// </generated>

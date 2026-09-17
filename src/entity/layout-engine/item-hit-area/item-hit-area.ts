// ItemHitArea: what the pointer is on, by table T-023d.
// @unit      UF-7   (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-7
// The NOT_STORED_SIZES region at the bottom is generated from docs/spec/_source/settings.json by npm run gen; do not edit by hand.
// TRAP: never quote the region's opening marker in a comment; the generator injects the block at the first one.

import type {
  BarGeometry,
  Path,
  Point,
  ScheduleGeometry,
  TaskGeometry,
} from '../schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../screen-regions/screen-regions'

// see SL-1
export type Item =
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'dependency'; readonly predecessorUid: number; readonly successorUid: number }
  | { readonly kind: 'highlightBox'; readonly id: string }
  | { readonly kind: 'commentBox'; readonly id: string }
  | { readonly kind: 'statusLine' }

// see T-023d
export type GrabArea =
  | 'GR-1' | 'GR-2' | 'GR-3' | 'GR-4' | 'GR-5' | 'GR-6' | 'GR-7' | 'GR-8'
  | 'GR-9' | 'GR-10' | 'GR-11' | 'GR-12' | 'GR-13' | 'GR-14' | 'GR-15' | 'GR-16'
  | 'GR-17' | 'GR-18'

// see GR-14
export type BoxPart =
  | { readonly kind: 'body' }
  | { readonly kind: 'anchor' }
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

// see S-90, S-91, S-92, S-137, S-230
export interface PointerSlop {
  readonly planEndpoint: number
  // STOP: spec does not decide S-91's sideways figure; table T-206 gives only the band. Looked in S-91, T-206, T-023d
  // @provisional PND-167
  readonly actualEndpoint: number
  readonly fadeHandle: number
  // STOP: spec does not decide S-137's figure with a basis. Looked in S-137, T-206, T-023d, S-6
  // @provisional PND-168
  readonly line: number
  readonly boxPoint: number
}

// WHY: no display scale argument: DS-7 keeps every grab margin at its own size whatever the chart is drawn at.
/** @purity pure */
export function grabSizesOf(): PointerSlop {
  return {
    planEndpoint: NOT_STORED_SIZES['S-90'],
    actualEndpoint: NOT_STORED_SIZES['S-91'],
    // WHY: half of S-92: the square stands centred on the corner, so each side reaches half of it.
    fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
    line: NOT_STORED_SIZES['S-137'],
    boxPoint: NOT_STORED_SIZES['S-230'],
  }
}

/** @purity pure */
function isInsideBoxInclusive(x: number, y: number, box: ScreenRect): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

/** @purity pure */
function isNearPoint(x: number, y: number, point: Point, halfWidth: number, halfHeight: number): boolean {
  return Math.abs(x - point.x) <= halfWidth && Math.abs(y - point.y) <= halfHeight
}

/** @purity pure */
function grown(box: ScreenRect, by: number): ScreenRect {
  return { x: box.x - by, y: box.y - by, width: box.width + by * 2, height: box.height + by * 2 }
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
function boxOfBar(bar: BarGeometry | null): ScreenRect | null {
  if (bar === null) return null
  if (bar.form === 'outline') return boxOfPath(bar.points)
  const box = boxOfPath([bar.from, bar.to, ...(bar.head ?? [])])
  if (box === null) return null
  const half = bar.strokeWidth / 2
  return { x: box.x, y: box.y - half, width: box.width, height: box.height + bar.strokeWidth }
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
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
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
function isOnPolyline(x: number, y: number, points: Path, slop: number): boolean {
  for (let index = 1; index < points.length; index++) {
    if (distanceToSegment(x, y, points[index - 1]!, points[index]!) <= slop) return true
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

// see S-18, S-178, GR-13
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

/** @purity pure */
function isOnTheDrawnLine(line: ScheduleGeometry['dependencies'][number], x: number, y: number): boolean {
  if (isInsideOutline(x, y, line.head ?? [])) return true
  return isOnTheStroke(x, y, line.points, (line.strokeWidth ?? 0) / 2)
}

type BoxedTask = {
  readonly task: TaskGeometry
  readonly plan: ScreenRect | null
  readonly actual: ScreenRect | null
}

/** @purity pure */
function boxedTasksOf(geometry: ScheduleGeometry): readonly BoxedTask[] {
  return geometry.tasks.map((task) => ({
    task,
    plan: boxOfBar(task.plan),
    actual: boxOfBar(task.actual),
  }))
}

// see GR-13, T-012
// WHY: not boxOfBar: GR-3 and GR-4 measure from that box's ends, and a span's dots are drawn past them.
/** @purity pure */
function drawnBoxOfBar(bar: BarGeometry): ScreenRect | null {
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

/** @purity pure */
function isInsideTheFigure(bar: BarGeometry | null, x: number, y: number): boolean {
  return bar !== null && bar.form === 'outline' && isInsideOutline(x, y, bar.points)
}

// see GR-13, SH-5
// WHY: one box round the plan and the actual, not one per bar: the gap between an SH-3 plan line and its actual is the shape.
/** @purity pure */
function isOnTheDrawnShape(task: TaskGeometry, x: number, y: number): boolean {
  if (task.shapeKind === 'milestone') return isInsideTheFigure(task.plan, x, y) || isInsideTheFigure(task.actual, x, y)
  const range = drawnRangeOf(task)
  return range !== null && isInsideBoxInclusive(x, y, range)
}

/** @purity pure */
function drawnRangeOf(task: TaskGeometry): ScreenRect | null {
  const plan = task.plan === null ? null : drawnBoxOfBar(task.plan)
  return merged(plan, task.actual === null ? null : drawnBoxOfBar(task.actual))
}

/** @purity pure */
function isOnADrawnShape(geometry: ScheduleGeometry, x: number, y: number): boolean {
  return geometry.tasks.some((task) => isOnTheDrawnShape(task, x, y))
}

type VerticalPlace = { readonly side: 'above' | 'level' | 'below'; readonly distance: number }

// see T-261, GS-2
// WHY: the box round a milestone's figures, not the figures: GS-2 measures a vertical length only.
/** @purity pure */
function verticalPlaceOf(task: TaskGeometry, y: number): VerticalPlace {
  const range = drawnRangeOf(task)
  if (range === null) return { side: 'level', distance: Number.POSITIVE_INFINITY }
  if (y < range.y) return { side: 'below', distance: range.y - y }
  const bottom = range.y + range.height
  if (y > bottom) return { side: 'above', distance: y - bottom }
  return { side: 'level', distance: 0 }
}

type RowReach = 'anyPress' | 'doubleClickOnly'

type Scene = {
  readonly geometry: ScheduleGeometry
  readonly boxed: readonly BoxedTask[]
}

type HitRow = {
  readonly grab: GrabArea
  readonly reach: RowReach
  readonly isTaskRow?: true
  /** @purity pure */
  readonly claim: (scene: Scene, x: number, y: number, slop: PointerSlop) => Hit | null
}

// see MK-9a
// TRAP: rows outer, Tasks inner; walking Task by Task makes the winner depend on stacking order.
/** @purity pure */
function taskRow(
  grab: GrabArea,
  reach: RowReach,
  isClaimedBy: (boxed: BoxedTask, x: number, y: number, slop: PointerSlop) => boolean,
): HitRow {
  return {
    grab,
    reach,
    isTaskRow: true,
    /** @purity pure */
    claim: (scene, x, y, slop) => {
      for (const one of scene.boxed) {
        if (isClaimedBy(one, x, y, slop)) {
          return { item: { kind: 'task', taskUid: one.task.taskUid }, grab }
        }
      }
      return null
    },
  }
}

// see T-023d
// TRAP: keep the printed order, not row-ID order; sorting by ID reverses it (GR-17 above GR-9).
const TABLE_T_023D: readonly HitRow[] = [
  taskRow('GR-1', 'anyPress', (boxed, x, y, slop) => {
    if (standsOnADummyRightOfThePlanStart(boxed, x, y)) return false
    const corner = boxed.task.fadeHandles[0]
    return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
  }),
  taskRow('GR-2', 'anyPress', (boxed, x, y, slop) => {
    if (standsOnADummyRightOfThePlanStart(boxed, x, y)) return false
    const corner = boxed.task.fadeHandles[1]
    return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
  }),
  taskRow('GR-5', 'anyPress',
    (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'left')),
  taskRow('GR-6', 'anyPress',
    (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'right')),
  taskRow('GR-17', 'anyPress',
    (boxed, x, y) => isOnTheDrawnMarkHalf(boxed, x, y, 'right')),
  taskRow('GR-9', 'anyPress',
    (boxed, x, y) => isOnTheDrawnMarkHalf(boxed, x, y, 'left')),
  taskRow('GR-10', 'doubleClickOnly',
    ({ task }, x, y) => task.label !== null && isInsideBoxInclusive(x, y, task.label)),
  taskRow('GR-11', 'doubleClickOnly', ({ task }, x, y) =>
    task.assigneeLabel !== null && isInsideBoxInclusive(x, y, task.assigneeLabel)),
  // WHY: tested again although schedule-geometry.ts places no icon on a milestone; each side answers its own MUST NOT.
  taskRow('GR-8', 'anyPress', ({ task }, x, y) => {
    if (task.shapeKind === 'milestone') return false
    if (task.resume === null) return false
    const box = boxOfPath([...task.resume.arm, ...task.resume.head])
    if (box === null) return false
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    return isNearPoint(x, y, centre, task.resume.hitHalf, task.resume.hitHalf)
  }),
  taskRow('GR-15', 'anyPress', ({ task, actual }, x, y) =>
    task.shapeKind === 'milestone' && actual !== null && isInsideBoxInclusive(x, y, actual)),
  taskRow('GR-18', 'anyPress',
    ({ task }, x, y) => task.dummies[0]?.grab === 'GR-18' && isOnTheDrawnMark(task, x, y)),
  {
    grab: 'GR-13',
    reach: 'anyPress',
    /** @purity pure */
    claim: ({ geometry }, x, y, slop) => {
      const isOnAShape = geometry.dependencies.length > 0 && isOnADrawnShape(geometry, x, y)
      for (const line of geometry.dependencies) {
        const isOnLine = isOnAShape
          ? isOnTheDrawnLine(line, x, y)
          : isOnPolyline(x, y, line.points, slop.line)
        if (isOnLine) {
          return {
            item: {
              kind: 'dependency',
              predecessorUid: line.predecessorUid,
              successorUid: line.successorUid,
            },
            grab: 'GR-13',
          }
        }
      }
      return null
    },
  },
  // STOP: spec does not decide whether a comment box or a highlight box wins inside GR-14. Looked in T-023d, T-023a
  // @provisional PND-235
  {
    grab: 'GR-14',
    reach: 'anyPress',
    /** @purity pure */
    claim: ({ geometry }, x, y, slop) => {
      // WHY: the point before the body: a corner stands on its body's edge, so a body read first takes half of S-230.
      for (const box of geometry.commentBoxes) {
        if (isNearPoint(x, y, box.anchor, slop.boxPoint, slop.boxPoint)) {
          return { item: { kind: 'commentBox', id: box.id }, grab: 'GR-14', boxPart: { kind: 'anchor' } }
        }
      }
      for (const box of geometry.commentBoxes) {
        if (isInsideBoxInclusive(x, y, box.body)) {
          return { item: { kind: 'commentBox', id: box.id }, grab: 'GR-14', boxPart: { kind: 'body' } }
        }
      }
      for (const box of geometry.highlightBoxes) {
        const corner = nearestCornerOf(box.box, x, y, slop.boxPoint)
        if (corner !== null) {
          return { item: { kind: 'highlightBox', id: box.id }, grab: 'GR-14', boxPart: corner }
        }
      }
      for (const box of geometry.highlightBoxes) {
        if (isInsideBoxInclusive(x, y, box.box)) {
          return { item: { kind: 'highlightBox', id: box.id }, grab: 'GR-14', boxPart: { kind: 'body' } }
        }
      }
      return null
    },
  },
  taskRow('GR-3', 'anyPress',
    (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'left')),
  taskRow('GR-4', 'anyPress',
    (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'right')),
  taskRow('GR-7', 'anyPress', ({ task }, x, y) =>
    task.marker !== null &&
    isNearPoint(x, y, task.marker.centre, task.marker.radius, task.marker.radius)),
  taskRow('GR-12', 'anyPress', ({ plan }, x, y, slop) =>
    plan !== null && isInsideBoxInclusive(x, y, grown(plan, slop.planEndpoint))),
  {
    grab: 'GR-16',
    reach: 'anyPress',
    /** @purity pure */
    claim: ({ geometry }, x, y, slop) => {
      const status = geometry.statusLine
      if (status === null) return null
      const on = Math.abs(x - status.x) <= slop.line && y >= status.top && y <= status.bottom
      return on ? { item: { kind: 'statusLine' }, grab: 'GR-16' } : null
    },
  },
]

// see GR-14, S-230
// WHY: the nearest corner, not the first: on a one-day, one-row box at low zoom the four reaches overlap.
/** @purity pure */
function nearestCornerOf(box: ScreenRect, x: number, y: number, reach: number): BoxPart | null {
  let found: BoxPart | null = null
  let nearest = Number.POSITIVE_INFINITY
  for (const vertical of ['top', 'bottom'] as const) {
    for (const horizontal of ['left', 'right'] as const) {
      const corner = {
        x: horizontal === 'left' ? box.x : box.x + box.width,
        y: vertical === 'top' ? box.y : box.y + box.height,
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

// see GR-3, GR-4
/** @purity pure */
function isOnPlanEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                     which: 'left' | 'right'): boolean {
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.plan
  if (box === null || !isInsideBoxInclusive(x, y, grown(box, slop.planEndpoint))) return false
  if (standsOnADummyRightOfThePlanStart(boxed, x, y)) return false
  // TRAP: outward only; Math.abs brings back the two-sided reach table T-023d removed.
  const rightEdge = box.x + box.width
  if (which === 'right') return x >= rightEdge && x - rightEdge <= slop.planEndpoint
  // TRAP: test the day, not the drawn width: S-49 floors a same-day plan's width.
  if (boxed.task.planEndsStandOnOneDay) return false
  return x <= box.x && box.x - x <= slop.planEndpoint
}

// see GR-3, GR-9, DM-1
// TRAP: strictly right of the plan's left edge, which is GR-3's; never for GR-18, whose mark is centred on its figure.
/** @purity pure */
function isInsideThePlanStart(boxed: BoxedTask, x: number): boolean {
  return boxed.plan === null || x > boxed.plan.x
}

/** @purity pure */
function standsOnADummyRightOfThePlanStart(boxed: BoxedTask, x: number, y: number): boolean {
  const plan = boxed.plan
  if (plan === null || x <= plan.x) return false
  return isOnTheDrawnMark(boxed.task, x, y)
}

// see GR-5, GR-6
/** @purity pure */
function isOnActualEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                       which: 'left' | 'right'): boolean {
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.actual
  if (box === null || !isInsideBoxInclusive(x, y, box)) return false
  if (which === 'left' && actualEndsStandOnOneDay(box)) return false
  const reach = Math.min(slop.actualEndpoint, box.width / 2)
  return which === 'left' ? x - box.x <= reach : box.x + box.width - x <= reach
}

// TRAP: relies on schedule-layout.ts never flooring the actual width; no tolerance,
// since slack would catch a real one-day span at low zoom.
/** @purity pure */
function actualEndsStandOnOneDay(box: ScreenRect): boolean {
  return box.width === 0
}

// TRAP: reads the first dummy's ink only; schedule-geometry.ts gives every dummy of a Task the same one.
/** @purity pure */
function isOnTheDrawnMark(task: TaskGeometry, x: number, y: number): boolean {
  const mark = task.dummies[0]
  return mark !== undefined && isInsideBoxInclusive(x, y, mark.ink)
}

// see GR-9, GR-17, FR-043
/** @purity pure */
function isOnTheDrawnMarkHalf(boxed: BoxedTask, x: number, y: number,
                              half: 'left' | 'right'): boolean {
  if (!isInsideThePlanStart(boxed, x)) return false
  const mark = boxed.task.dummies.find((one) => one.grab === (half === 'left' ? 'GR-9' : 'GR-17'))
  if (mark === undefined || !isInsideBoxInclusive(x, y, mark.ink)) return false
  const middle = mark.ink.x + mark.ink.width / 2
  return half === 'left' ? x <= middle : x >= middle
}

/** @purity pure */
function firstHitIn(
  rows: readonly HitRow[],
  scene: Scene,
  x: number,
  y: number,
  slop: PointerSlop,
  resolving: PointerResolution,
): Hit | null {
  for (const row of rows) {
    if (resolving === 'press' && row.reach === 'doubleClickOnly') continue
    const hit = row.claim(scene, x, y, slop)
    if (hit !== null) return hit
  }
  return null
}

const TASK_ROWS: readonly HitRow[] = TABLE_T_023D.filter((row) => row.isTaskRow)
const LINE_ROWS: readonly HitRow[] = TABLE_T_023D.filter((row) => row.grab === 'GR-13')

/** @purity pure */
function sceneOf(scene: Scene, admits: (one: BoxedTask) => boolean): Scene {
  return { geometry: scene.geometry, boxed: scene.boxed.filter(admits) }
}

// see GS-2, GS-3, GS-4
// TRAP: an equal distance keeps the table's order; T-261 does not decide the point halfway between two shapes.
/** @purity pure */
function splitBetweenStackedNeighbours(
  scene: Scene,
  x: number,
  y: number,
  slop: PointerSlop,
  resolving: PointerResolution,
  first: Hit,
): Hit | null {
  if (first.item.kind !== 'task') return first
  const firstUid = first.item.taskUid
  const winner = scene.boxed.find((one) => one.task.taskUid === firstUid)
  const side = winner === undefined ? 'level' : verticalPlaceOf(winner.task, y).side
  if (side === 'level') return first
  const claimants = scene.boxed.filter((one) =>
    firstHitIn(TASK_ROWS, { geometry: scene.geometry, boxed: [one] }, x, y, slop, resolving) !== null)
  const places = new Map(claimants.map((one) => [one, verticalPlaceOf(one.task, y)] as const))
  if (![...places.values()].some((place) => place.side !== side && place.side !== 'level')) return first
  const line = firstHitIn(LINE_ROWS, scene, x, y, slop, resolving)
  if (line !== null) return line
  const nearest = Math.min(...[...places.values()].map((place) => place.distance))
  const near = sceneOf(scene, (one) => places.get(one)?.distance === nearest)
  return firstHitIn(TABLE_T_023D, near, x, y, slop, resolving)
}

// see T-023d, T-261
// WHY: only Tasks stacked above or below give way; beside the pressed shape the table's order stands.
/** @purity pure */
export function itemAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  slop: PointerSlop,
  resolving: PointerResolution = 'press',
): Hit | null {
  const scene: Scene = { geometry, boxed: boxedTasksOf(geometry) }
  if (isOnADrawnShape(geometry, x, y)) {
    const level = sceneOf(scene, (one) => verticalPlaceOf(one.task, y).distance === 0)
    return firstHitIn(TABLE_T_023D, level, x, y, slop, resolving)
  }
  const first = firstHitIn(TABLE_T_023D, scene, x, y, slop, resolving)
  return first === null ? null : splitBetweenStackedNeighbours(scene, x, y, slop, resolving, first)
}

export interface DependencyEnd {
  readonly taskUid: number
  readonly edge: 'start' | 'finish'
}

// see FR-009, PTD-3
// WHY: a given uid tests no containment: the press may have reached the Task through ink outside its bar (GR-7, GR-11).
/** @purity pure */
export function dependencyEndAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  onTaskUid: number | null,
): DependencyEnd | null {
  for (const task of geometry.tasks) {
    if (onTaskUid !== null && task.taskUid !== onTaskUid) continue
    const bar = boxOfBar(task.plan) ?? boxOfBar(task.actual)
    if (bar === null) continue
    if (onTaskUid === null && !isInsideBoxInclusive(x, y, bar)) continue
    // TRAP: the middle belongs to the finish (<, not <=), which also keeps a zero-width bar answering one side.
    return { taskUid: task.taskUid, edge: x < bar.x + bar.width / 2 ? 'start' : 'finish' }
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
    box.x + box.width <= marquee.x + marquee.width &&
    box.y + box.height <= marquee.y + marquee.height
  )
}

// see SL-3, SL-7b
/** @purity pure */
export function itemsInMarquee(geometry: ScheduleGeometry, marquee: ScreenRect): readonly Item[] {
  const out: Item[] = []
  for (const one of boxedTasksOf(geometry)) {
    if (isEnclosedInclusive(merged(one.plan, one.actual), marquee)) {
      out.push({ kind: 'task', taskUid: one.task.taskUid })
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

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_SIZES: {
  readonly 'S-90': number
  readonly 'S-91': number
  readonly 'S-92': readonly [number, number]
  readonly 'S-137': number
  readonly 'S-230': number
} = {
  'S-90': 12,
  'S-91': 12,
  'S-92': [15, 15],
  'S-137': 6,
  'S-230': 6,
}
// </generated>

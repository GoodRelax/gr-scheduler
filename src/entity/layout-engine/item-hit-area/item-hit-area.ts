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

export interface Hit {
  readonly item: Item
  readonly grab: GrabArea
}

export type PointerResolution = 'press' | 'doubleClick'

// see S-90, S-91, S-92, S-137
export interface PointerSlop {
  readonly planEndpoint: number
  // STOP: spec does not decide S-91's sideways figure; table T-206 gives only the band. Looked in S-91, T-206, T-023d
  // @provisional PND-167
  readonly actualEndpoint: number
  readonly fadeHandle: number
  // STOP: spec does not decide S-137's figure with a basis. Looked in S-137, T-206, T-023d, S-6
  // @provisional PND-168
  readonly line: number
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

type RowReach = 'anyPress' | 'doubleClickOnly'

type Scene = {
  readonly geometry: ScheduleGeometry
  readonly boxed: readonly BoxedTask[]
}

type HitRow = {
  readonly grab: GrabArea
  readonly reach: RowReach
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
  taskRow('GR-17', 'anyPress', ({ task }, x, y) =>
    isOnTheDrawnMarkHalf(task, x, y, 'right')),
  taskRow('GR-9', 'anyPress', ({ task }, x, y) =>
    isOnTheDrawnMarkHalf(task, x, y, 'left')),
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
    ({ task }, x, y) => isOnTheDrawnMark(task, x, y)),
  {
    grab: 'GR-13',
    reach: 'anyPress',
    /** @purity pure */
    claim: ({ geometry }, x, y, slop) => {
      for (const line of geometry.dependencies) {
        if (isOnPolyline(x, y, line.points, slop.line)) {
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
    claim: ({ geometry }, x, y) => {
      for (const box of geometry.commentBoxes) {
        if (isInsideBoxInclusive(x, y, box.body)) {
          return { item: { kind: 'commentBox', id: box.id }, grab: 'GR-14' }
        }
      }
      for (const box of geometry.highlightBoxes) {
        if (isInsideBoxInclusive(x, y, box.box)) {
          return { item: { kind: 'highlightBox', id: box.id }, grab: 'GR-14' }
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
function isOnTheDrawnMarkHalf(task: TaskGeometry, x: number, y: number,
                              half: 'left' | 'right'): boolean {
  const mark = task.dummies.find((one) => one.grab === (half === 'left' ? 'GR-9' : 'GR-17'))
  if (mark === undefined || !isInsideBoxInclusive(x, y, mark.ink)) return false
  const middle = mark.ink.x + mark.ink.width / 2
  return half === 'left' ? x <= middle : x >= middle
}

// see T-023d
/** @purity pure */
export function itemAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  slop: PointerSlop,
  resolving: PointerResolution = 'press',
): Hit | null {
  const scene: Scene = { geometry, boxed: boxedTasksOf(geometry) }
  for (const row of TABLE_T_023D) {
    if (resolving === 'press' && row.reach === 'doubleClickOnly') continue
    const hit = row.claim(scene, x, y, slop)
    if (hit !== null) return hit
  }
  return null
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
} = {
  'S-90': 12,
  'S-91': 12,
  'S-92': [15, 15],
  'S-137': 6,
}
// </generated>

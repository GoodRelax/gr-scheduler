// ItemHitArea -- public entry of this folder.
//
// @unit      UF-7   (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-7
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_SIZES -- comes from docs/spec/_source/settings.json (table
// T-206) and is overwritten by `npm run gen`; `npm run gen:check` fails if it
// has drifted. Everything above the marker is hand written. Do not edit by hand
// inside that region: edit the manuscript instead.
// ⛔ This note does NOT quote the marker itself. Writing the opening marker
// here made the generator treat this comment as the region and inject the
// block into the middle of it -- the same class of failure as putting a path
// in the marker (CR-175). The marker must occur exactly once per file.
//
// What the pointer is on (CP-7). Two tables rule this file, and it holds no
// rule of its own:
//
//   - table T-023c's SL-1 fixes WHAT can be hit: Task, dependency line,
//     highlight box, comment box and the status line. A row is NOT among them
//     -- FR-085 owns selecting rows, and says in as many words that it is a
//     different set.
//   - table T-023d fixes WHERE and IN WHICH ORDER, top row first (MUST).
//
// ⚠️ The order is the table's PRINTED order, which is not the numeric order of
// its row IDs: GR-17 sits under GR-9, and GR-15 and GR-18 sit above GR-12.
// Sorting by number would quietly reverse three of the table's own decisions,
// among them "重なったら開始点が勝つ".
//
// ⚠️ The order is global, not per Task. One Task's GR-12 must not beat
// another's GR-3, so the rows are the outer loop and the Tasks the inner one.
// Walking Task by Task instead makes the winner depend on stacking order,
// which is exactly the "same place, different thing each time" MK-9a forbids.
//
// ⚠️ Only what the frame drew can be hit (FR-016 / table T-023a). This file is
// handed the geometry, so a Task the level of detail dropped, a hidden row's
// contents and a collapsed row's annotations are already absent -- there is
// nothing here to filter out again.
//
// ⛔ Two rows of table T-023d have no target yet, because ScheduleGeometry does
// not draw their subjects at this milestone: GR-11 (the assignee label, OC-2 of
// table T-038) and the comment box half of GR-14 (whose size column does not
// exist). Both slots are marked below, in the order they belong.
//
// ⛔ One value this file needs has no row anywhere: how near the pointer counts
// as on a LINE (GR-13's dependency line, GR-16's status line). Table T-023d
// sends every 掴み代 and 当たり判定 to table T-206, and table T-206 records
// S-90 to S-93 and nothing for a line. `PointerSlop.line` carries the mark.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  BarGeometry,
  Path,
  Point,
  ScheduleGeometry,
  TaskGeometry,
} from '../schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../screen-regions/screen-regions'

/** The targets of table T-023c's SL-1, and nothing else. */
export type Item =
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'dependency'; readonly predecessorUid: number; readonly successorUid: number }
  | { readonly kind: 'highlightBox'; readonly id: string }
  | { readonly kind: 'commentBox'; readonly id: string }
  | { readonly kind: 'statusLine' }

/** The rows of table T-023d that have a target at this milestone. */
export type GrabArea =
  | 'GR-1' | 'GR-2' | 'GR-3' | 'GR-4' | 'GR-5' | 'GR-6' | 'GR-7' | 'GR-8'
  | 'GR-9' | 'GR-10' | 'GR-12' | 'GR-13' | 'GR-14' | 'GR-15' | 'GR-16' | 'GR-17' | 'GR-18'

export interface Hit {
  readonly item: Item
  /** Which row of table T-023d claimed the point. */
  readonly grab: GrabArea
}

/**
 * How far past the drawn edge a grab still counts.
 *
 * ⚠️ The values table T-206 DOES record -- S-90 to S-93 -- it keeps out of the
 * document on purpose: "掴み領域は読む人のアクセシビリティに属する。手が震える
 * 人には大きな掴み代が要る。文書が強制してよい値ではない". So they arrive as an
 * argument, exactly the way S-94 and S-95 reach EditHistory's `HistoryLimits`,
 * and this file ships NO defaults. A default here would be this file quietly
 * standing in for a table that refused to hold the number, and it would let a
 * caller forget to ask the environment it is running on.
 *
 * ⚠️ Not every field below has a row. `line` has none at all -- see its own
 * mark. Read this block as "the fields that name an S-row mirror it", not as
 * "table T-206 records all of this".
 *
 * ⚠️ S-90 states the overhang ABOVE and BELOW the bar. Reading the same number
 * as the reach to either SIDE of an endpoint is this file's decision, not the
 * table's: the table gives an endpoint no width, and a point cannot be hit.
 *
 * ⛔ These comments name the ROW, never the number. They used to say "6px",
 * "15 x 15" and "30 x 20", and changing S-90 in the manuscript left all three
 * saying the old figure -- a copy of a value nothing checks is the defect
 * CR-174 spent a session chasing. `NOT_STORED_SIZES` below carries the figures.
 */
export interface PointerSlop {
  /** S-90: past the plan bar, and the same reach to either side of an end. */
  readonly planEndpoint: number
  /** S-91: the actual bar's own band, narrower than the plan. Its side reach. */
  readonly actualEndpoint: number
  /** S-92: the fade handle's square, as its half-width. */
  readonly fadeHandle: number
  /** S-93: the dummy's box. */
  readonly dummyWidth: number
  readonly dummyHeight: number
  /**
   * How near a line counts as on it: GR-13's dependency line and GR-16's
   * status line.
   *
   * ⛔ Table T-206 has NO row for this, and no other table has one either.
   * T-023d's preamble sends every 掴み代 and 当たり判定 to T-206, while GR-13
   * and GR-16 give the place as 線の上 and stop there -- so how near "on it" is
   * has never been settled. Whatever a caller passes rests on nothing the
   * specification wrote. A T-206 row is what is missing; this file does not
   * invent one, and does not pretend the number came from the table.
   */
  readonly line: number
}

// ------------------------------------------------------------ geometry ----

/**
 * Both axes CLOSED: a point on the right or bottom edge is inside. A click on a
 * bar's exact right edge has to hit the bar, or the last pixel of every shape
 * would be dead. ⚠️ The sibling test in this layer -- the one screen-regions.ts
 * applies to the regions of table T-103 -- is HALF-open instead, because
 * abutting regions must not both claim their shared edge. Two conventions live
 * side by side on purpose, so R3.4 asks the closed one to say so in its name:
 * that is the whole of why this is not called `isInsideBox`.
 *
 * @purity pure
 */
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

/** The smallest box holding a run of points. @purity pure */
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
  // A line has no height of its own, so its stroke is spread around it.
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

/** How far a point lies from a segment. @purity pure */
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
function dummyAt(task: TaskGeometry, grab: 'GR-9' | 'GR-17' | 'GR-18'): Point | null {
  return task.dummies.find((one) => one.grab === grab)?.at ?? null
}

/**
 * One Task with its two bounding boxes already built.
 *
 * ⚠️ The boxes are loop-invariant and belong outside the row walk. Six of the
 * rows below want the plan's box or the actual's -- GR-3, GR-4 and GR-12 the
 * plan, GR-5, GR-6 and GR-15 the actual -- and `boxOfBar` allocates two arrays
 * and spreads them into Math.min / Math.max every time it is asked. Rebuilt per
 * row, a pointer resting over empty canvas paid for six of them per Task per
 * move. Hit testing while the pointer is down carries a gate of its own (table
 * T-043 row PG-9, NFR-002), so the arithmetic is not free.
 */
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

// ------------------------------------------------------- the eighteen rows ----

/** One row of table T-023d, as the test it applies to one Task. */
type TaskRow = {
  readonly grab: GrabArea
  /** @purity pure */
  readonly isClaimedBy: (boxed: BoxedTask, x: number, y: number, slop: PointerSlop) => boolean
}

/**
 * Table T-023d, top row first. Read it as the table reads: the first row that
 * claims the point wins, and no row below it is asked.
 *
 * ⛔ GR-11 belongs between GR-10 and GR-15 and is absent -- the assignee label
 * is not drawn at this milestone.
 */
const TASK_ROWS: readonly TaskRow[] = [
  // GR-1 / GR-2 -- the fade handles, at the plan bar's top-left and
  // bottom-right corners. FD-5 gives them to the two shapes with thickness.
  {
    grab: 'GR-1',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y, slop) => {
      const corner = task.fadeHandles[0]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  {
    grab: 'GR-2',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y, slop) => {
      const corner = task.fadeHandles[1]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  // GR-3 / GR-4 -- the plan's two ends. GR-15's row records why a milestone
  // has neither: a point has no duration to resize.
  { grab: 'GR-3', isClaimedBy: (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'left') },
  { grab: 'GR-4', isClaimedBy: (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'right') },
  // GR-5 / GR-6 -- the actual's two ends, inside its own band (S-91).
  { grab: 'GR-5', isClaimedBy: (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'left') },
  { grab: 'GR-6', isClaimedBy: (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'right') },
  // GR-7 -- the progress marker, outside the bar FR-013 names.
  {
    grab: 'GR-7',
    isClaimedBy: ({ task }, x, y) =>
      task.marker !== null &&
      isNearPoint(x, y, task.marker.centre, task.marker.radius, task.marker.radius),
  },
  // GR-8 -- the resume icon, further out again.
  {
    grab: 'GR-8',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y) => {
      if (task.resume === null) return false
      const box = boxOfPath([...task.resume.arm, ...task.resume.head])
      return box !== null && isInsideBoxInclusive(x, y, box)
    },
  },
  // GR-9, then GR-17 -- GR-17's own row puts itself below GR-9 so that the
  // start point wins where the two overlap.
  { grab: 'GR-9', isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-9', x, y, slop) },
  { grab: 'GR-17', isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-17', x, y, slop) },
  // GR-10 -- the name label, wherever LC-6 put it.
  {
    grab: 'GR-10',
    isClaimedBy: ({ task }, x, y) => task.label !== null && isInsideBoxInclusive(x, y, task.label),
  },
  // GR-15 -- a milestone's actual figure. Above GR-12 so that an actual
  // landing on its own plan day can still be picked up.
  {
    grab: 'GR-15',
    isClaimedBy: ({ task, actual }, x, y) =>
      task.shapeKind === 'milestone' && actual !== null && isInsideBoxInclusive(x, y, actual),
  },
  // GR-18 -- the dummy on a milestone not started.
  { grab: 'GR-18', isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-18', x, y, slop) },
  // GR-12 -- the plan bar's middle, the ends having taken their share.
  //
  // ⚠️ The actual bar's BODY is deliberately NOT a grab area (MUST NOT): the
  // plan is the taller of the two, so where they overlap the plan is what is
  // picked up, and the only way to move an actual is by its ends.
  {
    grab: 'GR-12',
    isClaimedBy: ({ plan }, x, y, slop) =>
      plan !== null && isInsideBoxInclusive(x, y, grown(plan, slop.planEndpoint)),
  },
]

/** @purity pure */
function isOnPlanEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                     which: 'left' | 'right'): boolean {
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.plan
  if (box === null || !isInsideBoxInclusive(x, y, grown(box, slop.planEndpoint))) return false
  const edge = which === 'left' ? box.x : box.x + box.width
  return Math.abs(x - edge) <= slop.planEndpoint
}

/** @purity pure */
function isOnActualEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                       which: 'left' | 'right'): boolean {
  // GR-15's row: a milestone holds no actual BAR, so GR-5 and GR-6 never fire.
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.actual
  if (box === null || !isInsideBoxInclusive(x, y, box)) return false
  const edge = which === 'left' ? box.x : box.x + box.width
  return Math.abs(x - edge) <= slop.actualEndpoint
}

/** @purity pure */
function isOnDummy(task: TaskGeometry, grab: 'GR-9' | 'GR-17' | 'GR-18', x: number, y: number,
                   slop: PointerSlop): boolean {
  const point = dummyAt(task, grab)
  // GR-9's own note: the dummy is S-93 in size and NOT the whole Task, or a
  // Task not started would have no middle left for GR-12 to move.
  return point !== null && isNearPoint(x, y, point, slop.dummyWidth / 2, slop.dummyHeight / 2)
}

/**
 * What the pointer is on, or null when it is on nothing.
 *
 * ⚠️ `slop` is required and has no default. Table T-206 keeps those numbers out
 * of the document because they belong to the reader's environment; a default
 * here would put them back by another door (the same reason `HistoryLimits`
 * ships none for S-94 and S-95).
 *
 * ⚠️ The caller applies table T-023a FIRST. PD-1 makes a `Ctrl` drag a pan
 * whatever lies under it, PD-2 turns hit testing off entirely while the dual
 * cursor is up, and PD-3 replaces this whole table with a left-half /
 * right-half answer while a dependency is armed (FR-009). None of those three
 * is decided here.
 *
 * @purity pure
 */
export function itemAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  slop: PointerSlop,
): Hit | null {
  const boxed = boxedTasksOf(geometry)
  for (const row of TASK_ROWS) {
    for (const one of boxed) {
      if (row.isClaimedBy(one, x, y, slop)) {
        return { item: { kind: 'task', taskUid: one.task.taskUid }, grab: row.grab }
      }
    }
  }

  // GR-13 -- a dependency line. MK-9a records the consequence of putting it
  // below the Tasks: to select one, grab the stretch not lying over a bar.
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

  // GR-14 -- the annotations. ⛔ The comment box half waits on its size column.
  for (const box of geometry.highlightBoxes) {
    if (isInsideBoxInclusive(x, y, box.box)) {
      return { item: { kind: 'highlightBox', id: box.id }, grab: 'GR-14' }
    }
  }

  // GR-16 -- the status line.
  const status = geometry.statusLine
  if (status !== null && Math.abs(x - status.x) <= slop.line && y >= status.top && y <= status.bottom) {
    return { item: { kind: 'statusLine' }, grab: 'GR-16' }
  }
  return null
}

/**
 * Both bounds CLOSED: a box flush with the marquee's own edge is still wholly
 * enclosed. SL-3 asks whether the rectangle contains the shape, and a shape
 * drawn exactly to the edge is contained. ⚠️ The half-open test in this layer
 * is the region test of screen-regions.ts, which needs the other convention
 * because adjoining regions share edges. R3.4 asks the closed one to say so in
 * its name.
 *
 * @purity pure
 */
function isEnclosedInclusive(box: ScreenRect | null, marquee: ScreenRect): boolean {
  if (box === null) return false
  return (
    box.x >= marquee.x &&
    box.y >= marquee.y &&
    box.x + box.width <= marquee.x + marquee.width &&
    box.y + box.height <= marquee.y + marquee.height
  )
}

/**
 * SL-3: what a dragged rectangle takes.
 *
 * **Wholly enclosed only (MUST). Touching is not enough (MUST NOT)** -- a
 * schedule is a field of long horizontal bars, so taking what the rectangle
 * merely touches sweeps in bars that run clear off the screen.
 *
 * ⚠️ The status line is left out on purpose. SL-1 puts it outside SL-3 and
 * SL-7 in as many words: there is only one of it, and letting a marquee catch
 * it would move the status date every time a group of Tasks was dragged.
 *
 * ⚠️ The order this returns carries no meaning. SL-7b says a marquee makes no
 * order, which is why FR-034 refuses to align from one.
 *
 * @purity pure
 */
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
  for (const box of geometry.highlightBoxes) {
    if (isEnclosedInclusive(box.box, marquee)) out.push({ kind: 'highlightBox', id: box.id })
  }
  return out
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
 * ⚠️ Reading this is NOT the same as taking it: the value still
 * arrives as an argument, because table T-206 keeps these out of the
 * document on purpose (the environment may hold a larger one). This
 * is what a caller passes when it has nothing better.
 */
export const NOT_STORED_SIZES: {
  /** S-90, in px */
  readonly 'S-90': number
  /** S-92, in px */
  readonly 'S-92': readonly [number, number]
  /** S-93, in px */
  readonly 'S-93': readonly [number, number]
} = {
  'S-90': 6,
  'S-92': [15, 15],
  'S-93': [30, 20],
}
// </generated>

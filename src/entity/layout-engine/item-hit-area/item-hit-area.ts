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
// in the marker. The marker must occur exactly once per file.
//
// What the pointer is on (CP-7). Table T-023c's SL-1 fixes what can be hit (a
// row is not among them; FR-085 selects rows), and table T-023d fixes where and
// in which order, top row first.
//
// The order is the table's printed order, not the numeric order of its row IDs
// (GR-17 sits above GR-9, GR-15 and GR-18 above GR-12); sorting by ID reverses it.
// The rows are one list because GR-13 and GR-14 are printed between GR-18 and
// GR-3: asking every Task row before the lines would put GR-12 above GR-13.
//
// The order is global: rows are the outer loop and Tasks the inner one. Walking
// Task by Task makes the winner depend on stacking order, which MK-9a forbids.
//
// Only what the frame drew can be hit (FR-016, table T-023a), and the geometry
// handed in already lacks what was dropped, hidden or collapsed.
//
// GR-14 answers with an annotation's body only: neither the anchor nor the
// corners has a figure or a grab allowance in any table, so resizing has no
// target.

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
  | 'GR-9' | 'GR-10' | 'GR-11' | 'GR-12' | 'GR-13' | 'GR-14' | 'GR-15' | 'GR-16'
  | 'GR-17' | 'GR-18'

export interface Hit {
  readonly item: Item
  /** Which row of table T-023d claimed the point. */
  readonly grab: GrabArea
}

/**
 * Which reading of the pointer the caller is resolving.
 *
 * Table T-023d's closing rule (MUST NOT) keeps a double-click-only row off the
 * plain press; both readings walk the same rows in the same order. The rows
 * carry which reading reaches them (`HitRow.reach`).
 */
export type PointerResolution = 'press' | 'doubleClick'

/**
 * How far past the drawn edge a grab still counts.
 *
 * Table T-206 keeps these values out of the document, so they arrive as an
 * argument (as S-94 and S-95 reach `HistoryLimits`) and this file ships no
 * defaults: a default would stand in for a table that refused to hold the number.
 *
 * These comments name the row, never the figure; `NOT_STORED_SIZES` carries the
 * figures.
 */
export interface PointerSlop {
  /**
   * S-90: past the plan bar, and this reach outside an end, never inside it.
   * `isOnPlanEnd` spends the one-sided hand.
   */
  readonly planEndpoint: number
  /**
   * S-91: the actual bar's own band vertically, and this reach inside an end,
   * never outside it and never past the bar's own half.
   *
   * The band is the actual bar's own height (the vertical chain S-5 governs);
   * only the sideways figure is a number. `isOnActualEnd` spends it and applies
   * the half.
   *
   * @provisional PND-167
   */
  readonly actualEndpoint: number
  /** S-92: the fade handle's square, as its half-width. */
  readonly fadeHandle: number
  /**
   * S-137: how near a line counts as on it -- GR-13's dependency line and
   * GR-16's status line. A line has no width, so without a reach neither row
   * could be hit.
   *
   * Bounded from above by the condition table T-023d puts on GR-13 against S-6
   * (MUST), a condition on the value rather than a test here. No row says where
   * a larger figure from the environment is to be caught, so nothing here
   * catches it.
   *
   * @provisional PND-168
   */
  readonly line: number
}

// ------------------------------------------------------------ geometry ----

/**
 * Both axes closed, so a click on a bar's exact right or bottom edge hits it.
 * `screen-regions.ts` uses a half-open test, because abutting regions must not
 * both claim their shared edge; R3.4 has the closed one say so in its name.
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

/**
 * One Task with its two bounding boxes already built.
 *
 * The boxes are loop-invariant and built once per call, which runs on every pointer move: several rows want them
 * and `boxOfBar` allocates each time, and hit testing while the pointer is down
 * carries a gate of its own (PG-9 of table T-043, NFR-002).
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

// ------------------------------------------------------------- the rows ----

/**
 * Which readings of the pointer reach a row: the row's operation column, read as
 * table T-023d's closing rule (MUST NOT) reads it. Stated on the row, because a
 * list of row IDs beside the loop is a copy nothing keeps in step.
 */
type RowReach = 'anyPress' | 'doubleClickOnly'

/** Everything one press is asked of: the Tasks with their boxes, and the rest. */
type Scene = {
  readonly geometry: ScheduleGeometry
  readonly boxed: readonly BoxedTask[]
}

/** One row of table T-023d, as the test it applies to the whole picture. */
type HitRow = {
  readonly grab: GrabArea
  /**
   * Required, not an optional flag defaulting to `anyPress`: a double-click-only
   * row added without it would silently take the plain press off `GR-12`.
   */
  readonly reach: RowReach
  /** @purity pure */
  readonly claim: (scene: Scene, x: number, y: number, slop: PointerSlop) => Hit | null
}

/**
 * A row that is asked of every Task. Rows outer, Tasks inner (MK-9a; see the
 * file head).
 *
 * @purity pure
 */
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

/**
 * Table T-023d, top row first: the first row that claims the point wins, and no
 * row below it is asked.
 *
 * GR-19 (the Command Palette's band, the shell's), GR-20 (`ScreenRegions`) and
 * GR-21 (the scrollbars' thumb) are not here: this file is handed the schedule's
 * geometry alone.
 */
const TABLE_T_023D: readonly HitRow[] = [
  // GR-1 / GR-2 -- the fade handles, at the plan bar's top-left and
  // bottom-right corners (FD-5).
  //
  // The selection is not tested here: FR-075 is applied where `fadeHandles` is
  // built, so an unselected Task arrives with none. Testing it again would need
  // a `Selection` and put S-111's condition in a second place.
  //
  // Not made one-sided: that rule names the plan's and the actual's ends only,
  // and A-13 of table T-011 keeps the fade's handles distinct from an end. The
  // fence below still binds them.
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
  // GR-5 / GR-6 -- the actual's two ends, inside its own band (S-91). Above the
  // plan's ends: where the two overlap, the actual wins (table T-023d).
  taskRow('GR-5', 'anyPress',
    (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'left')),
  taskRow('GR-6', 'anyPress',
    (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'right')),
  // GR-17, then GR-9 -- where the two dummies overlap, the finish wins (table
  // T-023d's closing note). Either still enters an actual (FR-043).
  //
  // The drawn mark is split down its middle, left half GR-9 and right half
  // GR-17, and the mark is the whole hit area (closing rule).
  // `isOnTheDrawnMarkHalf` is where the middle is read.
  taskRow('GR-17', 'anyPress', ({ task }, x, y) =>
    isOnTheDrawnMarkHalf(task, x, y, 'right')),
  taskRow('GR-9', 'anyPress', ({ task }, x, y) =>
    isOnTheDrawnMarkHalf(task, x, y, 'left')),
  // GR-10 -- the name label, wherever LC-6 put it.
  //
  // `doubleClickOnly`: the row's operation column holds a double click only, and
  // PR-13 of table T-016 is the route that moves the label. That is why the row
  // may stay where the table prints it: NL-1 of table T-013 draws the label
  // inside the shape, so a press claimed here would leave GR-12 and GR-18
  // unreachable.
  taskRow('GR-10', 'doubleClickOnly',
    ({ task }, x, y) => task.label !== null && isInsideBoxInclusive(x, y, task.label)),
  // GR-11 -- the assignee label, outside the bar.
  //
  // `doubleClickOnly`, named beside GR-10 by the closing rule. Unlike GR-10 the
  // label is off the bar, so the rule, not damage to GR-12, is the reason.
  //
  // No grab allowance: table T-206 records none for a label (GR-10 is read the
  // same way), so the box is the drawn label's own.
  taskRow('GR-11', 'doubleClickOnly', ({ task }, x, y) =>
    task.assigneeLabel !== null && isInsideBoxInclusive(x, y, task.assigneeLabel)),
  // GR-8 -- the resume icon, further out again.
  //
  // S-22's box centred on the icon, not the drawn outline (the row): the bent
  // arrow's own path box is too small to aim at. The size travels on
  // `ResumeGeometry.hitHalf`, because S-22 is a stored setting and `PointerSlop`
  // carries only what table T-206 keeps out.
  //
  // The centre is the drawn icon's own: the row rules out the day column's left
  // edge and names no other point.
  //
  // Not on a milestone (MUST NOT). Kept although `schedule-geometry.ts` already
  // places no icon on one (LF-11 of table T-221): each table's MUST NOT is
  // answered on its own side, and a hit test leaning on the drawing side's null
  // would go quiet the day that side changed.
  //
  // GR-7 stands below this row; the icon's priority over the plan bar (GR-12)
  // is a MUST of its own, so the row is not moved for GR-7.
  taskRow('GR-8', 'anyPress', ({ task }, x, y) => {
    if (task.shapeKind === 'milestone') return false
    if (task.resume === null) return false
    const box = boxOfPath([...task.resume.arm, ...task.resume.head])
    if (box === null) return false
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    return isNearPoint(x, y, centre, task.resume.hitHalf, task.resume.hitHalf)
  }),
  // GR-15 -- a milestone's actual figure. Above GR-12 so that an actual
  // landing on its own plan day can still be picked up.
  taskRow('GR-15', 'anyPress', ({ task, actual }, x, y) =>
    task.shapeKind === 'milestone' && actual !== null && isInsideBoxInclusive(x, y, actual)),
  // GR-18 -- the dummy on a milestone not started. One place, never split
  // (closing rule), so this row asks for the whole mark while GR-9 and GR-17 ask
  // its halves; a milestone carries GR-18 alone.
  taskRow('GR-18', 'anyPress',
    ({ task }, x, y) => isOnTheDrawnMark(task, x, y)),
  // GR-13 -- a dependency line, above the plan bar's body (closing rule), on the
  // condition `PointerSlop.line` carries. The status line is not lifted with it
  // (MUST NOT), which is why GR-16 is the last row of this list.
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
  // GR-14 -- the annotations. The comment box is asked first: it can sit inside
  // a highlight box's range, and if the enclosing box won, the inner one could
  // never be grabbed. Table T-023d gives both kinds one row and states no order
  // between them. @provisional PND-235
  //
  // Its place above GR-3 is the table's printed order alone.
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
  // GR-3 / GR-4 -- the plan's two ends, outside the bar and nowhere else. A
  // milestone has neither: a point has no duration to resize.
  //
  // Below the actual's ends and the dummies: outside an end is the plan, inside
  // it the actual (closing rule). `isOnPlanEnd` carries the outward-only hands
  // and the plan-start boundary; `standsOnADummyRightOfThePlanStart` is where
  // the plan-side rows yield. Same-day ends reorder nothing: the start carries
  // the condition (`planEndsStandOnOneDay`, `actualEndsStandOnOneDay`).
  taskRow('GR-3', 'anyPress',
    (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'left')),
  taskRow('GR-4', 'anyPress',
    (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'right')),
  // GR-7 -- the progress marker, outside the bar FR-013 names. Its place below
  // the plan's ends costs nothing: the marker sits past the end point's grab
  // allowance (S-23).
  taskRow('GR-7', 'anyPress', ({ task }, x, y) =>
    task.marker !== null &&
    isNearPoint(x, y, task.marker.centre, task.marker.radius, task.marker.radius)),
  // GR-12 -- the plan bar's middle, the ends having taken their share.
  //
  // The actual bar's body is not a grab area (MUST NOT): the plan is the taller
  // of the two, so where they overlap the plan is picked up, and an actual moves
  // by its ends only.
  taskRow('GR-12', 'anyPress', ({ plan }, x, y, slop) =>
    plan !== null && isInsideBoxInclusive(x, y, grown(plan, slop.planEndpoint))),
  // GR-16 -- the status line, last (see GR-13).
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

/**
 * GR-3 and GR-4. The plan start's x is the boundary between the plan side and
 * the actual side (closing notes under table T-023d).
 *
 * GR-3 reaches leftwards only, so a press right of the plan start falls through
 * to the dummies. The clamp is here, not on the dummy side: a dummy stands on a
 * later day, so its ink already begins right of the boundary, and GR-3 is the
 * row that spread S-90 across it while standing above the dummies. Without the
 * clamp the actual side vanishes once a day is narrower than S-90.
 *
 * GR-4 is fenced, not clamped: refusing it every pixel right of the boundary
 * would take the finish off every plan longer than zero days. It gives up the
 * dummy's box only, in `standsOnADummyRightOfThePlanStart`, which answers for
 * GR-1, GR-2 and GR-4.
 *
 * Both ends also reach outwards only, which widens the boundary rule rather
 * than replacing it. Two ends on one day are another closing rule, answered
 * from `TaskGeometry.planEndsStandOnOneDay` (see `actualEndsStandOnOneDay`).
 *
 * Neither end exists on a milestone, so the clamp never reaches GR-18.
 *
 * @purity pure
 */
function isOnPlanEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                     which: 'left' | 'right'): boolean {
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.plan
  if (box === null || !isInsideBoxInclusive(x, y, grown(box, slop.planEndpoint))) return false
  if (standsOnADummyRightOfThePlanStart(boxed, x, y)) return false
  // Outwards only, both hands: the ends turn their backs on each other and the
  // bar's inside is left to the actual's ends and GR-12. Not `Math.abs`: that
  // is the two-sided reach the rule removed.
  const rightEdge = box.x + box.width
  if (which === 'right') return x >= rightEdge && x - rightEdge <= slop.planEndpoint
  // The day, not the drawn width: S-49's floor hides a same-day plan (see
  // `actualEndsStandOnOneDay`).
  if (boxed.task.planEndsStandOnOneDay) return false
  return x <= box.x && box.x - x <= slop.planEndpoint
}

/**
 * Whether the point is on a Task's own dummy mark right of its plan start, where
 * table T-023d's closing rule has the dummies win over every plan-side row
 * (GR-1 .. GR-4 may not reach into it, MUST NOT).
 *
 * Clamping GR-3 alone was not enough: at low zoom GR-4's S-90 and a selected
 * Task's GR-1 swallowed the whole mark, and both stand above the dummies. The
 * printed order is not rewritten; the four rows stand down over the dummy's ink
 * only and keep every other pixel.
 *
 * The ground is `isOnTheDrawnMark`, not a second copy of the mark's
 * arithmetic. One Task's dummies against that Task's plan start; rows stay the
 * outer loop of `itemAtPointer` (MK-9a).
 *
 * The x test is redundant with where a dummy stands, and is kept so the boundary
 * the rule names is visible in the code.
 *
 * @purity pure
 */
function standsOnADummyRightOfThePlanStart(boxed: BoxedTask, x: number, y: number): boolean {
  const plan = boxed.plan
  if (plan === null || x <= plan.x) return false
  return isOnTheDrawnMark(boxed.task, x, y)
}

/**
 * GR-5 and GR-6, inside the actual bar's own edges only (closing notes under
 * table T-023d).
 *
 * The containment test already keeps every answer within the bar, so the
 * inside-only rule adds no test. What it adds is the half: each hand stops at
 * the bar's half, so the two ends never contend for a pixel.
 *
 * On an even width both closed hands meet on the middle pixel, and the table's
 * order (GR-5 above GR-6) settles it. No preference for the finish is invented:
 * the closing rule that prefers it is about the two dummies.
 *
 * @purity pure
 */
function isOnActualEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                       which: 'left' | 'right'): boolean {
  // GR-15's row: a milestone holds no actual BAR, so GR-5 and GR-6 never fire.
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.actual
  if (box === null || !isInsideBoxInclusive(x, y, box)) return false
  if (which === 'left' && actualEndsStandOnOneDay(box)) return false
  const reach = Math.min(slop.actualEndpoint, box.width / 2)
  return which === 'left' ? x - box.x <= reach : box.x + box.width - x <= reach
}

/**
 * Whether the actual's two ends stand on one day, where table T-023d's closing
 * rule has the finish grabbed (MUST), so the start stands down.
 *
 * The start carries the condition because grabbing it gives no length back.
 * GR-4 / GR-6 are not lifted above GR-3 / GR-5: the printed order decides ends
 * that stand apart (same rule).
 *
 * On the actual, one day means zero width: RV-1 of table T-069 and
 * `actualSpanOf` in `schedule-layout.ts` build the width from the day difference
 * and nothing floors it. No tolerance: a same-day bar is exactly 0 at every
 * zoom, and slack would catch a real one-day span at low zoom. A one-day
 * `actualDuration` is not this case (RV-1, PV-2 of table T-021a).
 *
 * The plan's half cannot use a box: S-49 floors the plan's width in
 * `schedule-layout.ts`, and no pixel figure may stand in for a date (same
 * table, MUST NOT). `TaskGeometry.planEndsStandOnOneDay` carries the day
 * instead, which is why this function takes a box and the plan's half does not.
 *
 * The dummies stand S-129 working days apart, so this is vacuous on them; their
 * pixel overlap is answered by GR-17 standing above GR-9 in `TABLE_T_023D`.
 * Both callers refuse a milestone first.
 *
 * @purity pure
 */
function actualEndsStandOnOneDay(box: ScreenRect): boolean {
  return box.width === 0
}


/**
 * The one mark FR-043 draws on a Task not started, whole: what the fence hands
 * to the dummy side, whichever half the pointer is on.
 *
 * `DummyGeometry.ink` is the renderer's own rectangle, read and never rebuilt.
 * Every dummy of a Task carries the same one, so the first serves, a
 * milestone's GR-18 included.
 *
 * @purity pure
 */
function isOnTheDrawnMark(task: TaskGeometry, x: number, y: number): boolean {
  const mark = task.dummies[0]
  return mark !== undefined && isInsideBoxInclusive(x, y, mark.ink)
}

/**
 * Half of that mark: the left half is GR-9, the right half GR-17 (closing rule
 * of table T-023d, FR-043).
 *
 * A milestone is not split (MUST NOT): the row is looked up rather than a shape
 * tested, and a milestone carries GR-18 alone, so neither half is found on one.
 *
 * Both halves are closed at the centre; the middle pixel goes to GR-17 by the
 * table's order, not by this function. Nothing outside the ink is assigned.
 *
 * @purity pure
 */
function isOnTheDrawnMarkHalf(task: TaskGeometry, x: number, y: number,
                              half: 'left' | 'right'): boolean {
  const mark = task.dummies.find((one) => one.grab === (half === 'left' ? 'GR-9' : 'GR-17'))
  if (mark === undefined || !isInsideBoxInclusive(x, y, mark.ink)) return false
  const middle = mark.ink.x + mark.ink.width / 2
  return half === 'left' ? x <= middle : x >= middle
}

/**
 * What the pointer is on, or null when it is on nothing.
 *
 * `slop` has no default, for `PointerSlop`'s reason.
 *
 * The caller applies table T-023a first: PTD-1 (a `Ctrl` drag pans), PTD-2 (no
 * hit testing while the dual cursor is up) and PTD-3 (an armed dependency
 * replaces this table, FR-009) are not decided here. The arming never reaches
 * this function (FR-009, MUST NOT); the half is `dependencyEndAtPointer`.
 *
 * `resolving` defaults to the press, the narrower answer, so a caller that
 * forgets it gets no grab the closing rule forbids. Table T-064's preamble
 * leaves arguments to `src/`, so the added parameter does not disturb PI-7.
 *
 * @purity pure
 */
export function itemAtPointer(
  geometry: ScheduleGeometry,
  x: number,
  y: number,
  slop: PointerSlop,
  resolving: PointerResolution = 'press',
): Hit | null {
  const scene: Scene = { geometry, boxed: boxedTasksOf(geometry) }
  for (const row of TABLE_T_023D) {
    // Table T-023d's closing rule (MUST NOT). Skipped, not moved: one printed
    // order serves both readings.
    if (resolving === 'press' && row.reach === 'doubleClickOnly') continue
    const hit = row.claim(scene, x, y, slop)
    if (hit !== null) return hit
  }
  return null
}

// ------------------------------------------------ FR-009's two halves ----

/**
 * Which end of a dependency a point names, and on which Task.
 *
 * Not an `Item` or a `Hit`: SL-1 and table T-023d have no half, so this answers
 * a different question.
 */
export interface DependencyEnd {
  readonly taskUid: number
  /**
   * FR-009's two halves.
   *
   * Not a named union: `DependencyEdge` is spelled on `createDependency` in the
   * use-case layer, which Chapter 5.3 keeps this layer from importing. The
   * assignment in `input-command-translator.ts` is where the compiler checks
   * that the literals still agree.
   */
  readonly edge: 'start' | 'finish'
}

/**
 * Which half of a Task's bar a point fell in, while a dependency is armed.
 *
 * A name of its own, as FR-009 requires: `itemAtPointer` neither takes the
 * arming nor answers the half, and this applies no row of table T-023d (table
 * T-023a's PTD-3).
 *
 * The split is the bar's own middle, never the placement's occupied width
 * (FR-009), so `boxOfBar` of the drawn bar and never `merged`. The plan's bar;
 * the actual's only where no plan is drawn (FR-009).
 *
 * The middle itself is the right half, hence `<` and not `<=`, which also keeps
 * a zero-width bar answering one side. No slop is taken (FR-009, MUST NOT).
 *
 * `onTaskUid` says which of FR-009's two readings is asked:
 *
 *   - a UID -- the press, whose Task MK-9a has already settled (`Hit.item`). No
 *     containment is tested, so a press that reached the Task through ink drawn
 *     outside its bar (GR-7, GR-11, GR-1 / GR-2) still falls on one side.
 *   - `null` -- the release, which no `Hit` precedes: the first bar the point
 *     falls in, in the geometry's own order, since PTD-3 withholds table T-023d.
 *
 * @purity pure
 */
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
    return { taskUid: task.taskUid, edge: x < bar.x + bar.width / 2 ? 'start' : 'finish' }
  }
  return null
}

/**
 * Both bounds closed: a shape drawn exactly to the marquee's edge is contained
 * (SL-3). The half-open convention is `screen-regions.ts`'s; R3.4 has the
 * closed one say so in its name.
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
 * Wholly enclosed only: a schedule is a field of long horizontal bars, so taking
 * what the rectangle touches sweeps in bars that run off the screen. The status
 * line is left out (SL-1). The order carries no meaning (SL-7b).
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
  // Same order as `itemAtPointer`'s GR-14, although SL-7b gives a marquee no
  // order: the two loops then read as one rule.
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
  /** S-91, in px */
  readonly 'S-91': number
  /** S-92, in px */
  readonly 'S-92': readonly [number, number]
  /** S-137, in px */
  readonly 'S-137': number
} = {
  'S-90': 12,
  'S-91': 12,
  'S-92': [15, 15],
  'S-137': 6,
}
// </generated>

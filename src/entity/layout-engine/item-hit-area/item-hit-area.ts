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
//   - table T-023d fixes WHERE and IN WHICH ORDER, top row first (MUST), and
//     its closing rule keeps a row whose only operation is a double click out
//     of the plain press (MUST NOT). That is `PointerResolution` below, and
//     which rows it removes is stated on the rows.
//
// ⚠️ The order is the table's PRINTED order, which is not the numeric order of
// its row IDs: GR-17 sits ABOVE GR-9 (the user's ruling of 2026-09-08 -- the
// finish wins where the two dummies overlap), and GR-15 and GR-18 sit above
// GR-12. Sorting by number would quietly reverse three of the table's own
// decisions, that one among them.
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
// ⭐ EVERY row of table T-023d that names a Task now has a target. GR-11 (the
// assignee label, OC-2 of table T-038) was the last one without: ScheduleGeometry
// now places it, and AS-2 of table T-225 (MUST NOT) is what keeps the figure
// standing on a Task nobody is on -- 「何も描かないと `GR-11` に当たる図形が
// そのタスクだけ存在せず、担当者がまだ 1 人も就いていないタスクにだけ `AS-1` の
// 経路が無い」. ⚠️ GR-19 is not a Task row at all: the palette's band is the
// shell's, and this file is handed the schedule's geometry alone.
//
// ⛔ GR-14 answers with the BODY of either annotation and with nothing else.
// The row reads 本体・アンカー・四隅, and neither the anchor nor the corners has
// a figure or a grab allowance in any table -- so 「大きさを変える」 has no
// target for the comment box OR for the highlight box. That stood before the
// comment box arrived and it stands after it.
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
 * ⛔ Table T-023d's closing rule (MUST NOT) refuses a row whose only operation
 * is a double click to the plain press. ⚠️ Its own ⚠️ keeps the DOUBLE CLICK on
 * the table's order unchanged, so the two readings walk the same rows in the
 * same order and differ only in which are asked at all.
 *
 * ⚠️ NOT A SECOND TABLE. The rows themselves carry which reading reaches them
 * (`TaskRow.reach`), so nothing here restates the list the table prints.
 */
export type PointerResolution = 'press' | 'doubleClick'

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
 * ⭐ EVERY field below now names a row. CR-208 closed the two that did not:
 * S-91 held prose where the others held a figure, and how near a pointer counts
 * as ON a line had no row anywhere. ⚠️ Both figures are marked 🔎 in the
 * manuscript -- they are recommendations with no measured basis, and the
 * pending-decision rows say what falls over if they are re-chosen.
 *
 * ⛔ These comments name the ROW, never the number. They used to say "6px",
 * "15 x 15" and "30 x 20", and changing S-90 in the manuscript left all three
 * saying the old figure -- a copy of a value nothing checks is the defect
 * CR-174 spent a session chasing. `NOT_STORED_SIZES` below carries the figures.
 */
export interface PointerSlop {
  /**
   * S-90: past the plan bar, and the same reach to either side of an end.
   *
   * ⭐ The sideways half is the ROW's now, not this file's guess: S-90 reads
   * 「バーの上下と、端点の左右に」 since CR-208. ⚠️ S-49's floor already relied on
   * it being a width, which is what made the omission a defect rather than a
   * preference.
   */
  readonly planEndpoint: number
  /**
   * S-91: the actual bar's own band vertically, and this reach to either side.
   *
   * ⚠️ The band and the side reach are two directions of one row. The band is
   * the actual bar's own height (the vertical chain S-5 governs); only the
   * sideways figure is a number, and it is 🔎 -- nothing measured it.
   *
   * @provisional PD-167
   */
  readonly actualEndpoint: number
  /** S-92: the fade handle's square, as its half-width. */
  readonly fadeHandle: number
  /**
   * S-93: the box GR-9 / GR-17 / GR-18 take from their day's left edge, and
   * -- since the ruling of 2026-09-08 -- the box GR-8's resume icon takes
   * about its own centre. ⭐ ONE ROW SERVES BOTH, which is what its own
   * remark in table T-206 now says and what GR-8's row asks for: 「新しい設定値
   * を立てない —— 同じ行が実績のダミーに与えている大きさをそのまま使う」.
   * ⚠️ The field names are the row's FIRST customer, not its only one.
   */
  readonly dummyWidth: number
  readonly dummyHeight: number
  /**
   * S-137: how near a line counts as on it -- GR-13's dependency line and
   * GR-16's status line.
   *
   * ⭐ 「線の上」 is a set with no width, so without a reach neither row could
   * ever be hit. ⚠️ Both sit low in table T-023d's priority, which is why a
   * generous reach takes nothing from the rows above it.
   *
   * @provisional PD-168
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

/**
 * Which readings of the pointer reach a row -- the row's operation column, read
 * as table T-023d's closing rule (MUST NOT) reads it.
 *
 * ⭐ `doubleClickOnly` is the fact the closing rule turns on, and it is stated
 * ON THE ROW so that the rule stays one field per row instead of a second copy
 * of the table's membership. ⛔ A list of row IDs written beside the loop would
 * be exactly that copy, and nothing would keep it in step when a row's
 * operation column changes.
 */
type RowReach = 'anyPress' | 'doubleClickOnly'

/** One row of table T-023d, as the test it applies to one Task. */
type TaskRow = {
  readonly grab: GrabArea
  /**
   * REQUIRED, and not an optional flag defaulting to `anyPress`: a row added
   * below has to say which reading reaches it, and a double-click-only row
   * that forgot to would silently take the plain press back off `GR-12`.
   */
  readonly reach: RowReach
  /** @purity pure */
  readonly isClaimedBy: (boxed: BoxedTask, x: number, y: number, slop: PointerSlop) => boolean
}

/**
 * Table T-023d, top row first. Read it as the table reads: the first row that
 * claims the point wins, and no row below it is asked.
 *
 * ⭐ GR-11 now stands where the table prints it, between GR-10 and GR-15, and
 * it is the OTHER row the closing rule names -- so it carries
 * `reach: 'doubleClickOnly'` for the same reason GR-10 does.
 */
const TASK_ROWS: readonly TaskRow[] = [
  // GR-1 / GR-2 -- the fade handles, at the plan bar's top-left and
  // bottom-right corners. FD-5 gives them to the two shapes with thickness.
  //
  // ⚠️ THE SELECTION IS NOT TESTED HERE, and must not be: FR-075's MUST is
  // already spent where `fadeHandles` is built, so an unselected Task arrives
  // with an empty list and these two rows pass it by. ⛔ Repeating the test
  // here would need this file to be handed a `Selection` it has no other use
  // for, and would put the condition of S-111 in two places -- the second of
  // which nothing would keep honest. ⭐ The rule this file does keep is the
  // one table T-023d states: GR-1 and GR-2 are asked of EVERY Task before
  // GR-3 is asked of any, so the picture is what has to be narrow.
  {
    grab: 'GR-1',
    reach: 'anyPress',
    /** @purity pure */
    isClaimedBy: (boxed, x, y, slop) => {
      if (standsOnADummyRightOfThePlanStart(boxed, x, y, slop)) return false
      const corner = boxed.task.fadeHandles[0]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  {
    grab: 'GR-2',
    reach: 'anyPress',
    /** @purity pure */
    isClaimedBy: (boxed, x, y, slop) => {
      if (standsOnADummyRightOfThePlanStart(boxed, x, y, slop)) return false
      const corner = boxed.task.fadeHandles[1]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  // GR-3 / GR-4 -- the plan's two ends. GR-15's row records why a milestone
  // has neither: a point has no duration to resize. ⚠️ The two ends do NOT
  // reach alike: `isOnPlanEnd` below carries the boundary the ruling of
  // 2026-09-08 put at the plan start. ⭐ BOTH ends stand down where a dummy
  // stands right of that boundary -- `standsOnADummyRightOfThePlanStart` is
  // where the closing rule that names all four plan-side rows is answered.
  // ⭐ NEITHER PAIR IS REORDERED for the ruling of the same day that has the
  // finish win where the two ends coincide: the START is what carries the
  // condition -- `TaskGeometry.planEndsStandOnOneDay` for the plan's pair,
  // `actualEndsStandOnOneDay` for the actual's -- and the latter's own note
  // says why moving the row would be wrong.
  { grab: 'GR-3', reach: 'anyPress',
    isClaimedBy: (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'left') },
  { grab: 'GR-4', reach: 'anyPress',
    isClaimedBy: (boxed, x, y, slop) => isOnPlanEnd(boxed, x, y, slop, 'right') },
  // GR-5 / GR-6 -- the actual's two ends, inside its own band (S-91).
  { grab: 'GR-5', reach: 'anyPress',
    isClaimedBy: (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'left') },
  { grab: 'GR-6', reach: 'anyPress',
    isClaimedBy: (boxed, x, y, slop) => isOnActualEnd(boxed, x, y, slop, 'right') },
  // GR-7 -- the progress marker, outside the bar FR-013 names.
  {
    grab: 'GR-7',
    reach: 'anyPress',
    isClaimedBy: ({ task }, x, y) =>
      task.marker !== null &&
      isNearPoint(x, y, task.marker.centre, task.marker.radius, task.marker.radius),
  },
  // GR-8 -- the resume icon, further out again.
  //
  // ⭐⭐ S-93's BOX, CENTRED ON THE ICON, and NOT the drawn outline: the row
  // says 「当たり判定は `_assets/tbl-settings.md` の 表 T-206 の `S-93` の大きさ
  // とすること（MUST）。図形の素の輪郭を当たり判定にしてはならない（MUST NOT）」,
  // and 「起点はアイコンの中心とすること（MUST）」. ⚠️ The row's own measurement
  // is why: the bent arrow's raw path box is about 9.4 x 4.9px at the default
  // settings, so 「掴めないのではなく狙えない」.
  //
  // ⭐ NO NEW SETTING IS RAISED, which the row also states -- 「同じ行が実績の
  // ダミーに与えている大きさをそのまま使う」. `PointerSlop.dummyWidth` /
  // `dummyHeight` ARE S-93, and the field names say the row's first customer
  // rather than its only one.
  //
  // ⛔ THE CENTRE IS THE DRAWN ICON'S OWN, i.e. the middle of the box the arm
  // and the head occupy. The row rules out the day column's left edge that
  // GR-9 / GR-17 / GR-18 anchor on -- 「アイコンは日の列に揃わず、マーカーの
  // 外側に置かれるからである」 -- and names no other point, so the figure the
  // renderer draws is what the centre is taken from.
  //
  // ⚠️ GR-7 STANDS ABOVE THIS ROW AND STILL DOES. A 30px box reaches back over
  // the marker it hangs off, and the table's order is what settles the shared
  // ground: the marker answers there, the icon answers past it. That is the
  // same reading GR-7's own 「マーカーのさらに外側」 already carried.
  {
    grab: 'GR-8',
    reach: 'anyPress',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y, slop) => {
      if (task.resume === null) return false
      const box = boxOfPath([...task.resume.arm, ...task.resume.head])
      if (box === null) return false
      const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      return isNearPoint(x, y, centre, slop.dummyWidth / 2, slop.dummyHeight / 2)
    },
  },
  // GR-17, then GR-9 -- ⭐ SWAPPED ON 2026-09-08 BY THE USER'S RULING. Table
  // T-023d's closing note carries it and the reason: zoomed out the two
  // dummies stand only S-129 apart and fall on the same pixel, and the finish
  // is the one to hand back. ⛔ Until that day GR-17's row placed itself BELOW
  // GR-9 and the start won instead; the row now says the opposite.
  // ⭐ EITHER STILL ENTERS AN ACTUAL (FR-043): GR-9 sets the start day and the
  // duration, GR-17 sets the duration with the start pinned at GR-9's day, so
  // preferring the finish never leaves the person unable to record one.
  { grab: 'GR-17', reach: 'anyPress',
    isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-17', x, y, slop) },
  { grab: 'GR-9', reach: 'anyPress',
    isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-9', x, y, slop) },
  // GR-10 -- the name label, wherever LC-6 put it.
  //
  // ⛔ `doubleClickOnly`, because the row's operation column now holds a double
  // click and nothing else: it forbids moving the label by a grab (MUST NOT),
  // and sends the one route that moves it to PR-13 of table T-016.
  // ⚠️ THIS IS WHY THE ROW MAY STAY
  // WHERE THE TABLE PRINTS IT. NL-1 of table T-013 draws the label INSIDE the
  // shape, so a press that this row claimed would leave no Task with a name
  // reachable at GR-12 or GR-18 below -- the same accident GR-9's own ⚠️
  // records. ⭐ The double-click reading still asks this row here, in the
  // table's order, which is what the closing rule's ⚠️ requires.
  {
    grab: 'GR-10',
    reach: 'doubleClickOnly',
    isClaimedBy: ({ task }, x, y) => task.label !== null && isInsideBoxInclusive(x, y, task.label),
  },
  // GR-11 -- the assignee label, at 「バーの外側へ張り出した位置」.
  //
  // ⛔ `doubleClickOnly`: the row's operation column holds a double click and
  // nothing else, and the closing rule under table T-023d names it beside
  // GR-10 (MUST NOT). ⚠️ Unlike GR-10 the label does NOT sit over the bar, so
  // a plain press here would not swallow GR-12 -- the rule is obeyed because
  // the table states it, not because this row would otherwise do damage.
  //
  // ⛔ NO GRAB ALLOWANCE. Table T-023d sends every 掴み代 to table T-206, and
  // that table records S-90 to S-93 and nothing for a label -- GR-10 above is
  // read the same way. The box is the drawn label's own.
  //
  // ⚠️ THE ROWS ABOVE STILL WIN WHERE THEY REACH. GR-5 and GR-6 carry S-91's
  // 12px sideways, which is wider than the `labelGap` (S-32) that separates
  // this label from the bar, so the label's own right edge lies under the
  // actual start's allowance. That is table T-023d's printed order doing
  // exactly what it says, and it is why AS-2's mark is a mark and not nothing:
  // a label of some width is what leaves ground this row can claim.
  {
    grab: 'GR-11',
    reach: 'doubleClickOnly',
    isClaimedBy: ({ task }, x, y) =>
      task.assigneeLabel !== null && isInsideBoxInclusive(x, y, task.assigneeLabel),
  },
  // GR-15 -- a milestone's actual figure. Above GR-12 so that an actual
  // landing on its own plan day can still be picked up.
  {
    grab: 'GR-15',
    reach: 'anyPress',
    isClaimedBy: ({ task, actual }, x, y) =>
      task.shapeKind === 'milestone' && actual !== null && isInsideBoxInclusive(x, y, actual),
  },
  // GR-18 -- the dummy on a milestone not started.
  { grab: 'GR-18', reach: 'anyPress',
    isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-18', x, y, slop) },
  // GR-12 -- the plan bar's middle, the ends having taken their share.
  //
  // ⚠️ The actual bar's BODY is deliberately NOT a grab area (MUST NOT): the
  // plan is the taller of the two, so where they overlap the plan is what is
  // picked up, and the only way to move an actual is by its ends.
  {
    grab: 'GR-12',
    reach: 'anyPress',
    isClaimedBy: ({ plan }, x, y, slop) =>
      plan !== null && isInsideBoxInclusive(x, y, grown(plan, slop.planEndpoint)),
  },
]

/**
 * GR-3 and GR-4, with the plan start's own x standing as the boundary between
 * the plan side and the actual side -- the user's ruling of 2026-09-08, carried
 * by the closing notes under table T-023d.
 *
 * ⭐⭐ GR-3 REACHES LEFTWARDS ONLY, and that clamp is this whole change. The row
 * requires a press AT or LEFT of the plan start to be the plan's, and a press
 * RIGHT of it to fall through to the actual dummies (MUST). S-90's own reach is
 * still spent, but on the left hand alone.
 *
 * ⛔ THE CLAMP IS HERE AND NOT ON `isOnDummy`, and the geometry is why. A dummy
 * stands on a day AFTER the plan's start (GR-9's row, GR-18's row), and
 * `xFromDay` rises with the day, so its S-93 box already begins at or right of
 * the boundary at every zoom -- there is nothing on that side to clamp. The one
 * member that crossed the boundary was this one: GR-3 spread S-90 to BOTH sides
 * of the plan start and stands above the dummies, so it swallowed the first
 * S-90 of their reach. ⚠️ One clamp only: the ruling's own note calls the two
 * rules two faces of one answer, and writing it on both sides would be the
 * copy nothing keeps honest.
 *
 * ⛔ WITHOUT IT THE ACTUAL SIDE GOES AWAY AS THE ZOOM FALLS. Measured on the
 * shipped build, on a Task not started, 1920x1080 over file://: at 1.5px a day
 * the next working day's column is 1.5px right of the plan start, so a press 2px
 * to its right was answered by GR-3 and only a press 8px out reached the dummy.
 * Once a day is narrower than S-90 there is no reachable ground left between
 * them at all.
 *
 * ⭐⭐ GR-4 IS FENCED TOO, AND BY THE OTHER HALF OF THE SAME RULING. The note
 * that stood here said the ruling named the plan start and nothing else, and
 * the manuscript deleted the note it was reading on 2026-09-08 -- 「⚠️⚠️ 2026-
 * 09-08 まで、ここに「`GR-4` は 2026-09-08 の掴み分けの裁定では触れていない」と
 * いう注が在った …… ⇒ 注を消し、境目は上の規則のとおり `GR-4` にも効く」. The
 * closing rule now binds all four plan-side rows: 「⛔ 予定側の点の掴み代
 * （`GR-1` / `GR-2` / `GR-3` / `GR-4`）を、境目より右のダミーの当たり判定の中へ
 * 伸ばしてはならない（MUST NOT）」. `standsOnADummyRightOfThePlanStart` below
 * is where GR-1, GR-2 and GR-4 answer it, and this function is where GR-3 does.
 *
 * ⛔ GR-4 IS NOT CLAMPED THE WAY GR-3 IS, and the difference is the ruling's
 * own: 「その位置より左を押したときは予定の開始点（`GR-3`）を掴み」 names the
 * START alone as the row that keeps only its left hand. Refusing GR-4 every
 * pixel right of the boundary would take the plan's finish off EVERY plan of
 * more than zero days, since that end always stands right of its own start.
 * What GR-4 gives up is the dummy's own box and nothing else.
 *
 * ⚠️ The SECOND closing rule under table T-023d names GR-4 as well -- 「予定の
 * 2 端（`GR-3` と `GR-4`）にも、実績の 2 端（`GR-5` と `GR-6`）にも、ダミーの 2 端
 * （`GR-9` と `GR-17`）にも、同じように当てはまる（MUST）」 -- and that one is a
 * different case: two ends on ONE DAY. The plan's half of it is answered THREE
 * LINES BELOW, off `TaskGeometry.planEndsStandOnOneDay`; the actual's half is
 * `actualEndsStandOnOneDay`, whose note holds the reasoning for both and
 * records what the geometry still cannot tell.
 *
 * ⚠️ NEITHER END EXISTS ON A MILESTONE (GR-15's row), so the clamp never
 * reaches GR-18: the dummy on a milestone has no GR-3 above it to be clamped,
 * and no row above GR-18 claims the pixel right of its day.
 *
 * @purity pure
 */
function isOnPlanEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                     which: 'left' | 'right'): boolean {
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.plan
  if (box === null || !isInsideBoxInclusive(x, y, grown(box, slop.planEndpoint))) return false
  if (standsOnADummyRightOfThePlanStart(boxed, x, y, slop)) return false
  if (which === 'right') return Math.abs(x - (box.x + box.width)) <= slop.planEndpoint
  // ⭐⭐ THE DAY, AND NOT THE DRAWN WIDTH. `planEndsStandOnOneDay` is carried on
  // the geometry because S-49's floor makes the plan's box unable to answer --
  // see `actualEndsStandOnOneDay` below, whose note holds the whole reasoning
  // for both halves of the clause.
  if (boxed.task.planEndsStandOnOneDay) return false
  return x <= box.x && box.x - x <= slop.planEndpoint
}

/**
 * Table T-023d's closing rule of 2026-09-08, the half that binds the PLAN side:
 * 「⭐⭐ 境目より右では、実績のダミー（`GR-17` / `GR-9` / `GR-18`）を、予定側の
 * どの行よりも先に成立させること（MUST）」, and ⛔ 「予定側の点の掴み代（`GR-1` /
 * `GR-2` / `GR-3` / `GR-4`）を、境目より右のダミーの当たり判定の中へ伸ばしては
 * ならない（MUST NOT）」.
 *
 * ⭐⭐ THIS IS WHAT THE PURPOSE NEEDS, AND CLAMPING GR-3 ALONE WAS NOT. The
 * rule states the purpose in the user's words -- 「Zoom Out して 1 日の表示が
 * 潰れても、ダミーの実績を入力できることである」 -- and then says in as many
 * words that the fence is not enough on its own: 「⛔ 低倍率でダミーが掴めなく
 * なってはならない（MUST NOT）—— 境目を動かさないだけでは足りない。境目より右を
 * 予定側の掴み代で埋めても、同じことが起きる」.
 *
 * ⚠️⚠️ AND THAT IS EXACTLY WHAT WAS MEASURED. The manuscript records it --
 * 「低倍率で 1 〜 8 日の予定では、`GR-4` の `S-90`（端点の左右へ 6px）と、選ばれて
 * いるあいだ現れる `GR-1` の `S-92` の半分（7.5px）が、描かれているダミーの印を
 * 丸ごと飲んでいた」 -- and both rows sit ABOVE the dummies in the printed order,
 * so neither was reachable however the fence at GR-3 was drawn.
 *
 * ⛔ THE TABLE'S PRINTED ORDER IS NOT REWRITTEN, and the rule says why it must
 * not be: 「本表の順は、離れているものどうしの優先を決めるものである —— 境目の右
 * で重なったときは本規則が勝つ（MUST）」. So the four rows stand down HERE, over
 * the dummy's own box, and keep every other pixel the order gives them.
 *
 * ⭐ THE BOX IS THE DUMMY'S OWN, asked of `isOnDummy` rather than restated. A
 * second copy of S-93's arithmetic is the thing that goes out of step, and the
 * rule the two share -- 「`S-93` の幅は、境目の右側でだけ使うこと（MUST）」 -- is
 * one answer with two faces, as the manuscript itself says.
 *
 * ⚠️ ONE TASK'S OWN DUMMIES, AND ITS OWN PLAN START. The boundary the rule
 * names is 「予定の開始日の位置」 -- a Task's own -- so a Task's plan rows yield
 * to that Task's dummies. Rows remain the outer loop of `itemAtPointer`, which
 * is MK-9a's global order, and this changes none of it.
 *
 * ⚠️ THE x TEST IS NOT REDUNDANT WITH THE BOX. A dummy stands on a day AFTER
 * the plan start, so its box already begins right of the boundary at every
 * zoom; the comparison is written anyway because the rule is stated about the
 * boundary and a reader must be able to see the boundary in the code.
 *
 * @purity pure
 */
function standsOnADummyRightOfThePlanStart(boxed: BoxedTask, x: number, y: number,
                                           slop: PointerSlop): boolean {
  const plan = boxed.plan
  if (plan === null || x <= plan.x) return false
  return DUMMY_ROWS.some((grab) => isOnDummy(boxed.task, grab, x, y, slop))
}

/** The three rows of table T-023d the fence hands the right-hand side to. */
const DUMMY_ROWS = ['GR-17', 'GR-9', 'GR-18'] as const

/** @purity pure */
function isOnActualEnd(boxed: BoxedTask, x: number, y: number, slop: PointerSlop,
                       which: 'left' | 'right'): boolean {
  // GR-15's row: a milestone holds no actual BAR, so GR-5 and GR-6 never fire.
  if (boxed.task.shapeKind === 'milestone') return false
  const box = boxed.actual
  if (box === null || !isInsideBoxInclusive(x, y, box)) return false
  if (which === 'left' && actualEndsStandOnOneDay(box)) return false
  const edge = which === 'left' ? box.x : box.x + box.width
  return Math.abs(x - edge) <= slop.actualEndpoint
}

/**
 * Table T-023d's closing rule of 2026-09-08: 「2 つの端点が同じ日に立つときは、
 * 終了側を掴むこと（MUST）」 -- 「予定の 2 端（`GR-3` と `GR-4`）にも、実績の 2 端
 * （`GR-5` と `GR-6`）にも、ダミーの 2 端（`GR-9` と `GR-17`）にも、同じように
 * 当てはまる（MUST）」. ⛔ 「開始側が本表で上に在ることを理由に、開始側を掴ませて
 * はならない（MUST NOT）」.
 *
 * ⭐ WHY THE CONDITION HANGS ON THE START AND NOT ON THE FINISH: the ruling's
 * own reason is 「重なった 2 点のうち、開始を掴んでも長さは伸びない。終了を掴め
 * ば、そこから引いて長さを与えられる」, and its purpose is 「同じ日に潰れた予定や
 * 実績を、もう一度引き伸ばせること」. So the start is the end that gives nothing
 * back, and it is the one that stands down.
 *
 * ⛔⛔ NOT DONE BY LIFTING GR-4 ABOVE GR-3 (or GR-6 above GR-5), and the same
 * closing rule is what forbids it: 「本表の順は、離れている端点どうしの優先を決め
 * るものである」. Measured on this file's own arithmetic: GR-6 claims within
 * S-91 of the actual's right edge and GR-5 within S-91 of its left, and neither
 * test is grown outside the bar -- so on any actual NARROWER THAN TWICE S-91
 * the two bands already cover the whole bar, and lifting GR-6 would take the
 * start away on bars whose ends are days apart. The order stays printed; the
 * START alone carries a condition, and the condition is the DAY, not the pixel.
 *
 * ⭐ ON THE ACTUAL, THE TWO ENDS STAND ON ONE DAY EXACTLY WHEN THE BAR MEASURES
 * NOTHING ACROSS. RV-1 of table T-069 fixes the bar's right end at 「`actualStart`
 * に `actualDuration` を稼働日で加えた日」, `actualSpanOf` in
 * `schedule-layout.ts` builds the width from that very difference, and NOTHING
 * FLOORS IT -- so a width of zero IS the two days being one. ⛔ NO TOLERANCE IS
 * TAKEN: the width is a serial-day difference multiplied by the scale, so a
 * same-day bar is exactly 0 at every zoom, and a comparison with slack would
 * catch a real one-day span wherever the zoom fell below it.
 *
 * ⛔⛔ A ONE-DAY ACTUAL IS NOT THIS CASE, and the arithmetic that says so is the
 * specification's own. RV-1 puts a `actualDuration` of 1 a working day PAST the
 * start, and PV-2 of table T-021a writes `actualFinish` 「＝ 実績バーの右端」 --
 * so 実績開始日 and 実績終了日 coincide when the duration is ZERO and not when
 * it is one. ⚠️ Measured on the shipped build (2026-09-08, 6px a day): on a
 * `actualDuration` of 1 every pixel of the drawn bar answers `GR-5` and `GR-6`
 * answers none, and that is the OTHER debt -- 「実績の開始と終了のどちらを掴んだ
 * か決められないときは、終了を優先すること（MUST）」 is written about the two
 * DUMMIES, and no row says which of `GR-5` / `GR-6` yields where their two
 * allowances cross on a short bar. ⛔ Do not close it here by inventing one.
 *
 * ⭐⭐ THE PLAN'S HALF IS CLOSED BY A CARRIED FACT, NOT BY THIS BOX. S-49
 * (`minShapeWidth`) is applied in `schedule-layout.ts` before the geometry
 * reaches this file -- 「a Task of zero duration is still a Task, drawn at S-49」
 * -- so a plan bar whose start and finish are one day arrives at `minShapeWidth`
 * and is indistinguishable here from a plan that really spans it. ⛔ THE CURE IS
 * NOT A WIDTH COMPARED AGAINST S-90, S-49 OR ONE DAY'S PIXELS: none of those is
 * a day, and the same table's 「倍率によってこの境目を動かしてはならない」 (MUST
 * NOT) rules out any figure in pixels standing in for a date. So
 * `TaskGeometry.planEndsStandOnOneDay` carries the DAY, decided where the days
 * are, and `isOnPlanEnd` reads that instead. ⚠️ Which is why this function takes
 * a box and the plan's half does not: the two halves are answered in different
 * units on purpose, and the names say which.
 *
 * ⚠️ THE DUMMIES ARE ALREADY ANSWERED, AND NOT BY THIS GATE. GR-9 and GR-17
 * stand S-129 apart in WORKING DAYS by construction (GR-17's row), so their two
 * days can never be one and this condition is vacuous on them. What overlaps
 * there is the PIXEL, which is the OTHER closing rule -- 「実績の開始と終了の
 * どちらを掴んだか決められないときは、終了を優先する」 -- and that one is answered
 * by GR-17 standing above GR-9 in `TASK_ROWS`.
 *
 * ⚠️ MILESTONES ARE UNTOUCHED. Both callers refuse a milestone before they ask
 * this (GR-15's row: 「マイルストーンは実績バーを持たないので `GR-5` / `GR-6` /
 * `GR-17` に当たらない」), so the shape whose start and finish are always one day
 * never reaches the gate -- which is what keeps GR-15, GR-18 and GR-12 saying
 * on it exactly what they said before.
 *
 * @purity pure
 */
function actualEndsStandOnOneDay(box: ScreenRect): boolean {
  return box.width === 0
}

/**
 * GR-9 / GR-17 / GR-18, anchored where table T-023d's closing rule anchors
 * them: 「その日の列の左端を起点に、右へ `S-93` の幅で取ること」 (MUST), and
 * ⛔ 「起点を中心にしてはならない」 (MUST NOT).
 *
 * ⭐ THE POINT THE GEOMETRY CARRIES IS THAT LEFT EDGE (`xFromDay`), so the box
 * runs rightwards from it and the drawn ink starts on the same pixel --
 * `svg-renderer.ts` builds the mark from the same edge, which is what FR-043's
 * 「日の列の左端に揃える」 asks of the drawing.
 *
 * ⛔ CENTRING IS WHAT THE RULE FORBIDS, and the reason is measured: half of
 * S-93's width is 2.5 days at 6px a day, so a centred box reaches back over
 * the plan's own start point -- the very thing FR-043 moved this handle a day
 * along to keep separate. Where GR-3 stands above it the reach is merely
 * hidden rather than harmless (measured on the shipped build at 6px a day: 3px
 * of it stuck out to the left of GR-3's own band), and GR-18 has no GR-3 above
 * it at all.
 *
 * ⚠️ THE VERTICAL STAYS CENTRED. The rule settles the horizontal alone, and
 * the point sits on the middle of the actual band, so S-93's height is spread
 * about it the way it always was.
 *
 * ⚠️ GR-9's own note: the box is S-93 and NOT the whole Task, or a Task not
 * started would have no middle left for GR-12 to move.
 *
 * @purity pure
 */
function isOnDummy(task: TaskGeometry, grab: 'GR-9' | 'GR-17' | 'GR-18', x: number, y: number,
                   slop: PointerSlop): boolean {
  const leftEdge = dummyAt(task, grab)
  if (leftEdge === null) return false
  return isInsideBoxInclusive(x, y, {
    x: leftEdge.x,
    y: leftEdge.y - slop.dummyHeight / 2,
    width: slop.dummyWidth,
    height: slop.dummyHeight,
  })
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
 * ⛔⛔ AND THE ARMING NEVER REACHES THIS FUNCTION. FR-009 (MUST NOT): 「表
 * T-023c の `SL-1` を答える公開名（表 T-064 の `PI-7`）に構えを渡してはならない
 * …構えによって答えが変わると、それに対して書かれたすべての呼び手と試験が構えを
 * 意識することになる」. The half is `dependencyEndAtPointer` below, which is a
 * name of its own and is called only while AR-4 is armed.
 *
 * ⚠️ `resolving` DEFAULTS TO THE PRESS, which is the reading every caller
 * before table T-023d's closing rule was asking for, and the safe one: a caller
 * that forgets it gets the narrower answer rather than a grab the rule forbids.
 * ⭐ Table T-064 is not disturbed by the added parameter: its own preamble says
 * the table holds the member's NAME and what it is for, and leaves arguments
 * and return values to this file, because `src/` is where a signature has a
 * type check on it. PI-7's entry still names `itemAtPointer` and nothing else.
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
  const boxed = boxedTasksOf(geometry)
  for (const row of TASK_ROWS) {
    // Table T-023d's closing rule (MUST NOT). ⭐ The row is SKIPPED rather than
    // moved: the table's printed order is the same for both readings, and a
    // second ordering would be a second table.
    if (resolving === 'press' && row.reach === 'doubleClickOnly') continue
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

  // GR-14 -- the annotations. ⭐ The comment box is asked FIRST: it can sit
  // inside a highlight box's range, and if the enclosing box won, the inner one
  // could never be grabbed -- the very trap GR-19's own remark spells out
  // (「掴めない位置へ置けてしまうと二度と動かせなくなる」). Table T-023d gives
  // both kinds one row and states no order between them. @provisional PD-235
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

  // GR-16 -- the status line.
  const status = geometry.statusLine
  if (status !== null && Math.abs(x - status.x) <= slop.line && y >= status.top && y <= status.bottom) {
    return { item: { kind: 'statusLine' }, grab: 'GR-16' }
  }
  return null
}

// ------------------------------------------------ FR-009's two halves ----

/**
 * Which end of a dependency a point names, and on which Task.
 *
 * ⚠️ NOT AN `Item` AND NOT A `Hit`. Table T-023c's SL-1 says what can be hit
 * and table T-023d says which grab claims it; neither has a half. This is the
 * answer to a DIFFERENT question, which is why it has a type of its own.
 */
export interface DependencyEnd {
  readonly taskUid: number
  /**
   * FR-009, in as many words: 「左半分が開始側、右半分が終了側である」.
   *
   * ⚠️ NOT DECLARED AS A NAMED UNION HERE. `DependencyEdge` is spelled once, on
   * `createDependency` in the use-case layer, and Chapter 5.3 forbids this layer
   * from importing that one. The two literals are written out instead, and the
   * assignment in `input-command-translator.ts` is where the compiler checks
   * that they still agree.
   */
  readonly edge: 'start' | 'finish'
}

/**
 * FR-009's MUST, asked from the outside: which half of a Task's bar a point
 * fell in, while a dependency is armed.
 *
 * ⛔⛔ A NAME OF ITS OWN, AND THAT IS THE REQUIREMENT ITSELF. FR-009: 「⛔ 表
 * T-023c の `SL-1` を答える公開名（表 T-064 の `PI-7`）に構えを渡してはならない
 * （MUST NOT）…⭐ 半分を答える名は別に置くこと（MUST）。構えが依存線のときだけ
 * 呼ぶ」. So `itemAtPointer` is untouched -- it neither takes the arming nor
 * answers the half -- and a caller that has read AR-4's arming asks this
 * instead. ⚠️ Table T-023a's PD-3 says the same from the other side: 「構えが
 * 依存線のときは表 T-023d を適用せず」, and this function applies no row of it.
 *
 * ⛔⛔ THE BAR'S OWN MIDDLE, WHICH IS THE 2026-09-06 RULING WRITTEN INTO FR-009:
 * 「割る点は、そのタスクのバー自身の中点とすること（MUST）。表 T-038 が定める
 * 占有幅で割ってはならない（MUST NOT）—— 占有幅にはバーの外に出るラベルと印が
 * 入るので、中点が絵の上のバーの中央からずれる」. ⇒ `boxOfBar` of the drawn bar,
 * never the placement's occupied width and never `merged` with anything.
 *
 * ⭐ THE PLAN'S BAR, THE ACTUAL'S ONLY WHERE NO PLAN IS DRAWN, which is the same
 * requirement's 「依存線は予定の幾何に付くこと（MUST）。予定を表示していないとき
 * に限り、実績の幾何に付ける」.
 *
 * ⚠️ THE MIDDLE ITSELF IS THE RIGHT HALF: 「中点ちょうどに当たったときは右半分と
 * すること（MUST）」, so the comparison is `x < middle ? 'start' : 'finish'` and
 * not `<=`. That also keeps the two halves exhaustive on a bar of zero width,
 * which is the case the MUST NOT above -- 「端点の掴み代で判定してはならない」 --
 * exists for: 「どれだけ細くても必ずどちらかに落ちる」. ⛔ NO SLOP IS TAKEN, and
 * this function has no `PointerSlop` parameter for that reason.
 *
 * `onTaskUid` says which of FR-009's two readings is being asked:
 *
 *   - a UID -- the press, whose Task MK-9a has already settled (`Hit.item`).
 *     ⭐ NO CONTAINMENT IS TESTED, because 「どれだけ細くても必ずどちらかに落ちる」
 *     promises a hit Task always yields an end: a press that reached the Task
 *     through ink drawn outside its bar (GR-7's marker, GR-11's assignee label,
 *     GR-1 / GR-2's fade handles) still falls on the side of the middle it is on.
 *   - `null` -- the release, which no `Hit` precedes, so the bar's own
 *     silhouette says which Task the point is on. ⚠️ THE FIRST BAR IT FALLS IN:
 *     MK-9a's priority order is table T-023d's and PD-3 withholds that table, so
 *     no order of its own is invented and the geometry's own order is taken.
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
  // ⭐ Same order as `itemAtPointer`'s GR-14, though SL-7b says a marquee makes
  // no order at all: two loops over the same two kinds are easier to read as
  // one rule when they are written the same way (rule 03).
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
  /** S-93, in px */
  readonly 'S-93': readonly [number, number]
  /** S-137, in px */
  readonly 'S-137': number
} = {
  'S-90': 6,
  'S-91': 12,
  'S-92': [15, 15],
  'S-93': [30, 20],
  'S-137': 6,
}
// </generated>

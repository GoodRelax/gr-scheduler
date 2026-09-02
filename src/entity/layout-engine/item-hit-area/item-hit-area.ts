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
  /** S-93: the dummy's box. */
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
    isClaimedBy: ({ task }, x, y, slop) => {
      const corner = task.fadeHandles[0]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  {
    grab: 'GR-2',
    reach: 'anyPress',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y, slop) => {
      const corner = task.fadeHandles[1]
      return corner !== undefined && isNearPoint(x, y, corner, slop.fadeHandle, slop.fadeHandle)
    },
  },
  // GR-3 / GR-4 -- the plan's two ends. GR-15's row records why a milestone
  // has neither: a point has no duration to resize.
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
  {
    grab: 'GR-8',
    reach: 'anyPress',
    /** @purity pure */
    isClaimedBy: ({ task }, x, y) => {
      if (task.resume === null) return false
      const box = boxOfPath([...task.resume.arm, ...task.resume.head])
      return box !== null && isInsideBoxInclusive(x, y, box)
    },
  },
  // GR-9, then GR-17 -- GR-17's own row puts itself below GR-9 so that the
  // start point wins where the two overlap.
  { grab: 'GR-9', reach: 'anyPress',
    isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-9', x, y, slop) },
  { grab: 'GR-17', reach: 'anyPress',
    isClaimedBy: ({ task }, x, y, slop) => isOnDummy(task, 'GR-17', x, y, slop) },
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

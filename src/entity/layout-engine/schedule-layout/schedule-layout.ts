// ScheduleLayout -- public entry of this folder.
//
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5
//
// The time axis, the label width estimate, the placing of Rows, the level of
// detail and the fit-to-screen zoom (CP-5). Table T-068 fixes the order these
// run in: LC-1 to LC-9 here, LC-10 and LC-11 in ScheduleGeometry.
//
// ⚠️ T-068 says the stages run top to bottom ONCE, and that no later stage may
// feed an earlier one (MUST NOT) -- placing a label, measuring occupancy,
// assigning a stack and then testing interference would close a loop. Nothing
// below reads a value produced after it.
//
// ⚠️ The task level of detail measures the width a DURATION produced, and drops
// nothing whose width came from somewhere else (FR-018, CR-174). Two shapes get
// their width from somewhere else: a Task of zero duration, whose width is the
// `minShapeWidth` floor (S-49), and a milestone, whose width is the figure side
// LF-10 gives it. Neither shrinks as the zoom falls, so neither is evidence
// that the Task is too short to read. Before CR-174 the floor was measured
// against S-86 like any other width, and since 6 < 24 a zero-duration rectangle
// -- the thing UC-001's extension 2a creates by a plain click -- was dropped at
// EVERY zoom.
//
// ⛔ INCOMPLETE, and deliberately so: LC-7 counts OC-1 alone. The other rows of
// table T-038 measure things this milestone does not draw yet -- the assignee
// and percent labels (OC-2), an actual bar reaching outside the plan (OC-5),
// the plan-against-actual guide (OC-7), the days-late label (OC-8) and the
// deadline mark (OC-9). Table T-042 puts those at M3 and M4. Each one widens
// what a Task occupies, so ST-1's overlap test and FR-055's fit both read low
// until they arrive. Add them here, not at the call sites: table T-038's
// preamble makes stacking and the fit measurement share this one count (MUST).
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  dateFromWorkingDays,
  dayOf,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskGroupMember,
  type TaskVisual,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type { ScreenRegions } from '../screen-regions/screen-regions'

/** The four steps of the Time Ruler. L-1 of table T-005a. */
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

/** Where a label sits relative to its shape. Table T-013. */
export type LabelPlacement = 'inside' | 'right'

/** The five of table T-012, spelled as AT-100 spells them. */
export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

/** One Task, placed. */
export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  /** Resolved through AT-100, so nothing downstream reads Task.milestone again. */
  readonly shapeKind: ShapeKind
  /** The lane ST-3's greedy pass put it in, counted from the shallowest. */
  readonly stack: number
  /**
   * The drawn plan shape, not the span of the dates. They differ twice: a
   * milestone is a figure centred on its day (LF-10), and a shape shorter than
   * `minShapeWidth` is drawn at that width (FR-001's RATIONALE). LC-7 measures
   * what is drawn, so this is the value the occupancy is built on.
   */
  readonly x: number
  readonly width: number
  readonly y: number
  /** What the row's stacking reserved: the plan, plus the actual when SH-3 or SH-4 pushes it below. */
  readonly height: number
  /** The plan bar alone, floored once by FR-094. The actual is this times `actualOfPlan`. */
  readonly planHeight: number
  /** Table T-012's last column, resolved once so nothing downstream re-reads it. */
  readonly actualPlacement: 'inside' | 'below' | 'sideways'
  /**
   * RV-1: the actual bar, from `actualStart` to `actualStart` plus
   * `actualDuration` counted in worked days. `null` while the Task has no
   * actual at all -- FR-043 says the dummy is drawn but not held.
   *
   * ⚠️ This IS the span of the dates. A milestone's actualDuration is S-130,
   * which is zero, so its width is zero and the figure is centred on `actualX`
   * (LF-10) -- the centring belongs to the geometry, not here.
   */
  readonly actualX: number | null
  readonly actualWidth: number
  /** NL-1 or NL-3 of table T-013. */
  readonly labelPlacement: LabelPlacement
  /** The label after LC-4 cut it to truncateUnits. */
  readonly label: string
  /**
   * The type size the label is drawn at: FR-077's derivation with FR-094's two
   * floors already applied. LC-5 measured the label with THIS value, so it is
   * the single source for the drawn type size -- anything that puts the text on
   * screen reads it here rather than writing the formula a second time. Written
   * twice, the two copies part company the moment S-8 or S-9 moves, and the
   * measured width stops matching the glyphs.
   */
  readonly labelFontSize: number
  /** What the row's stacking measured it as. Table T-038. */
  readonly occupiedX0: number
  readonly occupiedX1: number
}

/** One drawn row. */
export interface RowPlacement {
  readonly groupId: string
  /** Depth 1 is a root row. */
  readonly depth: number
  readonly y: number
  /** LF-2 of table T-221. */
  readonly height: number
  readonly stackCount: number
  /**
   * The top of each lane, indexed by lane -- the same number `TaskPlacement.stack`
   * carries. LF-12 walks these to place the progress line's vertices, which is
   * why they leave the layout rather than being rebuilt from the placements --
   * a lane holding no drawn Task has no placement to rebuild from.
   *
   * ⚠️ NOT sorted by y. ST-5 lets `stackDirection` (S-58) put lane 0 at the
   * bottom of the band, and then this array DESCENDS in y. FR-014 wants "上端
   * から下端まで途切れない 1 本の折れ線", so a caller that draws through the
   * lanes must visit them by increasing `y`, not by index.
   */
  readonly stackTops: readonly number[]
}

export interface ScheduleLayout {
  /** S-1 times zoomX, which FR-017 makes the width of one day. */
  readonly pxPerDay: number
  readonly tier: RulerTier
  /** The day the left edge of the Row Area points at (S-77). */
  readonly originDay: CalendarDay | null
  /** The x that day sits at, so a caller need not re-derive the axis. */
  readonly originX: number
  /**
   * What a rectangle's plan bar is tall at this zoom. LF-2 and LF-3 give it to
   * empty lanes and empty rows, and LF-12 measures the progress line's
   * vertices by it -- a shape-independent height, so the vertices of one row
   * line up whatever sits in its lanes.
   */
  readonly rectangleHeight: number
  readonly rows: readonly RowPlacement[]
  readonly placements: readonly TaskPlacement[]
  /** Everything drawn, measured with table T-038's occupancy. FR-055 fits to this. */
  readonly contentWidth: number
  readonly contentHeight: number
}

/** ST-7 stops the whole layout rather than truncating or overlapping. */
export class StackSafetyCapReached extends Error {
  /** @purity pure */
  constructor(readonly groupId: string, readonly cap: number) {
    super(`table T-014 ST-7: group ${groupId} needs more than ${cap} stacks`)
    this.name = 'StackSafetyCapReached'
  }
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/**
 * Full-width counts two, half-width counts one. FR-093 forbids measuring the
 * glyphs and forbids keeping what a measurement returned.
 *
 * @purity pure
 */
function labelUnits(text: string): number {
  let units = 0
  for (const ch of text) units += ch.charCodeAt(0) < 0x100 ? 1 : 2
  return units
}

/** LC-5. FR-093's estimate: units times font size times labelCoef. @purity pure */
function labelWidth(text: string, fontSize: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSize * settings.labelCoef
}

/** LC-4. Cuts to truncateUnits (S-35) counting the same units. @purity pure */
function truncate(text: string, limit: number): string {
  let units = 0
  let kept = ''
  for (const ch of text) {
    const next = units + (ch.charCodeAt(0) < 0x100 ? 1 : 2)
    if (next > limit) return kept
    units = next
    kept += ch
  }
  return kept
}

/**
 * The height one Task reserves. ⚠️ Not this table's own rule: table T-012's
 * "how the actual sits" column decides it -- laid inside (SH-1, SH-2) or a
 * milestone (SH-5, which shifts sideways) reserves the plan height alone;
 * pushed below (SH-3, SH-4) reserves the plan, actualGap and the actual.
 * FR-094 puts the floor on the plan height once, BEFORE the shape ratio, and
 * forbids a second floor on the actual.
 *
 * @purity pure
 */
function reservedHeight(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const planHeight = planHeightOf(shapeKind, settings)
  return laidBelow(shapeKind)
    ? planHeight + settings.actualGap + planHeight * settings.actualOfPlan
    : planHeight
}

/** SH-3 and SH-4 push the actual below; the rest do not. Table T-012. @purity pure */
function laidBelow(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

/**
 * The plan bar's own height. FR-094 puts the floor on it ONCE, before the
 * shape ratio, and forbids a second floor on the actual.
 *
 * @purity pure
 */
function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  const floor = settings.actualMin / settings.actualOfPlan
  return Math.max(floor, settings.basePlanHeight * settings.zoomY) * ratio
}

/**
 * The font a bar's label is drawn at.
 *
 * FR-077 derives it from the bar, and FR-094 fixes how the floors are applied:
 * the text floor (S-8) is applied SEPARATELY from the height floor, because
 * `thinFontScale` (S-9) multiplies the thin shapes and would otherwise take
 * the type under what can be read.
 *
 * @purity pure
 */
function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

/**
 * LC-3. Which of L-1's four steps the ruler shows.
 *
 * FR-017 fixes the test: pxPerDay divided by (the effective font size over
 * S-8) against each threshold. The division cancels the text scale so the three
 * stored thresholds stay fixed values -- FR-017 forbids deriving them.
 *
 * @purity pure
 */
export function rulerTierOf(pxPerDay: number, settings: DocumentSettings): RulerTier {
  const scaled = pxPerDay / (settings.rulerFont / settings.fontMin)
  if (scaled >= settings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= settings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= settings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

/**
 * LF-1 of table T-221: how many days one tick stands for once the day and
 * weekday rows would collide. FR-089 makes the grid lines thin by the same
 * number. Coarser rows are never thinned (FR-017 forbids it), so this answers
 * one for them.
 *
 * @purity pure
 */
export function tickStrideOf(layout: ScheduleLayout, settings: DocumentSettings): number {
  if (layout.tier !== 'yearMonthDayWeekday') return 1
  const needed = labelWidth('00', settings.rulerFont, settings) + settings.labelGap
  return Math.max(1, Math.ceil(needed / Math.max(0.001, layout.pxPerDay)))
}

/**
 * The day at a point on the horizontal axis, and its inverse.
 *
 * S-77 pins the left edge of the Row Area to `scrollDate`, and FR-017 fixes the
 * width of one day, so the two together settle the axis without a rule of their
 * own. Returns null while no origin is set -- OP-10 has FR-055 choose one.
 *
 * ⚠️ Reads `layout.originX` rather than re-deriving the origin from a
 * `ScreenRegions`, which is what that member exists for. Taking the regions
 * from the caller instead lets a value arrive that the layout was NOT built
 * from, and then x -> day -> x lands on a different day without saying so.
 *
 * @purity pure
 */
export function dateAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const days = Math.floor((x - layout.originX) / layout.pxPerDay)
  const at = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
function xOfDay(originSerial: number, pxPerDay: number, originX: number, day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/** LC-1. A row goes when it, or anything above it, is hidden or collapsed. @purity pure */
function drawnGroups(schedule: Schedule, settings: DocumentSettings): readonly (TaskGroup & { depth: number })[] {
  const byId = new Map(schedule.taskGroups.map((g) => [g.id, g]))
  const drawnRows: (TaskGroup & { depth: number })[] = []

  for (const group of schedule.taskGroups) {
    let depth = 1
    let dropped = group.isHidden === true
    // HR-1a hides what a collapsed row holds and HR-6 does the same for a
    // hidden one; neither re-parents what it hides, so walking up settles it.
    for (let at = group.parentId, guard = 0; at !== null && guard <= settings.maxGroupDepth; guard++) {
      const parent = byId.get(at)
      if (parent === undefined) break
      depth += 1
      if (parent.isHidden === true || parent.isCollapsed === true) dropped = true
      at = parent.parentId
    }
    if (!dropped) drawnRows.push({ ...group, depth })
  }
  return drawnRows.sort((a, b) => a.depth - b.depth || a.order - b.order)
}

/**
 * LC-2, the group half. FR-018 drops the deeper rows as zoomY falls, and S-88
 * being above one is what keeps that order. Depth 1 is never a candidate: the
 * domain starts at two, or the smallest zoom would empty the screen and break
 * FR-055's floor.
 *
 * @purity pure
 */
export function groupDepthLimit(settings: DocumentSettings): number {
  let limit = 1
  for (let depth = 2; depth <= settings.maxGroupDepth; depth++) {
    const threshold =
      settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
    if (settings.zoomY >= threshold) limit = depth
  }
  return limit
}

/**
 * Takes the index rather than the `Schedule`: `taskVisuals` holds up to one row
 * per Task, so scanning it for each Task is O(n^2) in the task count, which
 * NFR-013 forbids in as many words for レイアウトの算出.
 *
 * @purity pure
 */
function shapeKindOf(visualByUid: ReadonlyMap<number, TaskVisual>, task: Task): ShapeKind {
  const kind = visualByUid.get(task.uid)?.shapeKind ?? null
  // AT-100: a null resolves through Task.milestone, which AT-30 calls the truth.
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}

/**
 * The span of the dates in pixels, before anything widens it.
 *
 * ⚠️ This definition is this file's own: the plan bar runs from `start` to
 * `finish` EXCLUDING the finish day, so start == finish measures zero. Table
 * T-221 fixes the milestone figure (LF-10) and the actual bar (RV-1) but has no
 * row for the plan bar's extent, and no requirement elsewhere fixes it either.
 * A change request has to settle whether the finish day counts -- until it
 * does, nothing here may be read as the specification's answer.
 *
 * @purity pure
 */
function spanWidthOf(task: Task, pxPerDay: number): number {
  const from = dayOf(task.start)
  const to = dayOf(task.finish)
  if (from === null || to === null) return 0
  return Math.max(0, serialOf(to) - serialOf(from)) * pxPerDay
}

/**
 * The width the shape is actually drawn at, which is what CR-163 makes the
 * task level of detail read (S-86: "形状の幅がこれを割る Task を描かない").
 *
 * ⚠️ A milestone is a figure, not a span: LF-10 gives it a side equal to its
 * own plan height, so its date span (zero, since start equals finish) is not
 * its width. Reading the span here would drop every real milestone at every
 * zoom.
 *
 * @purity pure
 */
function shapeWidthOf(
  spanWidth: number,
  shapeKind: ShapeKind,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') return planHeightOf(shapeKind, settings)
  // FR-001's RATIONALE: a Task of zero duration is still a Task, drawn at S-49.
  return Math.max(spanWidth, settings.minShapeWidth)
}

/**
 * Whether the task level of detail leaves this Task on the screen (FR-018).
 *
 * ⚠️ The rule measures the width a DURATION produced -- 幅が期間から出ていない
 * 形状を落としてはならない（MUST NOT）(CR-174). Two shapes take their width from
 * somewhere else: a milestone from LF-10's figure, and a Task of zero duration
 * from S-49's floor. Neither shrinks as the zoom falls, so neither is evidence
 * that the Task has grown too short to read. A Task holding no dates has no
 * span either, and is exempt for the same reason.
 *
 * ⭐ The exempt set does not vary with the zoom, so what is drawn stays
 * "a fixed set plus a shrinking one" and FR-018's MUST NOT against a shrink
 * that shows MORE still holds without an argument.
 *
 * @purity pure
 */
function keptByLevelOfDetail(
  shapeKind: ShapeKind,
  spanWidth: number,
  shapeWidth: number,
  settings: DocumentSettings,
): boolean {
  if (shapeKind === 'milestone' || spanWidth <= 0) return true
  return shapeWidth >= settings.taskLevelOfDetailReadablePx
}

/**
 * RV-1 and the left edge that goes with it, in pixels, or null when the Task
 * holds no actual at all.
 *
 * FR-011 fixes both ends. Table T-069's note requires the counting itself to
 * come from `Schedule` -- writing it a second time here is a MUST NOT.
 *
 * @purity pure
 */
function actualSpanOf(
  task: Task,
  within: WorkingCalendar,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): { readonly x: number; readonly width: number } | null {
  const from = dayOf(task.actualStart)
  if (from === null) return null
  const to = dateFromWorkingDays(within, from, task.actualDuration ?? 0)
  return {
    x: xOfDay(originSerial, pxPerDay, originX, from),
    width: Math.max(0, serialOf(to) - serialOf(from)) * pxPerDay,
  }
}

/**
 * Runs LC-1 to LC-9 of table T-068, in that order, once.
 *
 * @purity pure
 */
export function layoutFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
): ScheduleLayout {
  // ---- LC-3 first, because LC-2's task half needs the width of one day -----
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const originSerial = originDay === null ? 0 : serialOf(originDay)
  const originX = regions.rowArea.x

  // ---- LC-1, then LC-2's group half ---------------------------------------
  const depthLimit = groupDepthLimit(settings)
  const rows = drawnGroups(schedule, settings).filter((g) => g.depth <= depthLimit)

  // Three indexes, built once, before the row loop opens. Scanning
  // taskGroupMembers per row and taskVisuals per Task made the whole layout
  // O(n^2) in the task count -- NFR-013 forbids that outright ("`O(n²)` の算法を
  // 用いてはならない（MUST NOT）", naming レイアウトの算出 first), and MN-6 of
  // Chapter 5.6 runs the whole of table T-068 once at the head of every frame.
  const taskByUid = new Map(schedule.tasks.map((t) => [t.uid, t]))
  const visualByUid = new Map(schedule.taskVisuals.map((v) => [v.taskUid, v]))
  const membersByGroup = new Map<string, TaskGroupMember[]>()
  for (const member of schedule.taskGroupMembers) {
    // Insertion order is kept, so the order inside a group is what the source
    // array had -- LC-8/ST-2's sort below still decides what the order means.
    const groupMembers = membersByGroup.get(member.groupId)
    if (groupMembers === undefined) membersByGroup.set(member.groupId, [member])
    else groupMembers.push(member)
  }

  // FR-054: one calendar for the whole document, resolved once.
  const within = workingCalendarOf(schedule)
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  let y = regions.rowArea.y
  // Both sentinels are replaced together by the first placement, so the one
  // test at the end settles "nothing was placed at all". Seeding `widest` at 0
  // instead measured from the leftmost occupied edge all the way to x = 0
  // whenever every drawn Task sat left of the origin -- which S-77 reaches as
  // soon as scrollDate is later than the content -- and FR-055 then fitted to
  // a width several times the real one.
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = reservedHeight('rectangle', settings)

  for (const row of rows) {
    // ---- LC-2, the task half: CR-163 measures the shape, not the depth -----
    // The kind, the span and the drawn width are resolved ONCE per Task here.
    // S-86's filter and the measuring below both want all three, and asking
    // twice doubles the work NFR-013 caps.
    const drawnTasks = (membersByGroup.get(row.id) ?? [])
      .map((m) => taskByUid.get(m.taskUid))
      .filter((t): t is Task => t !== undefined)
      .map((task) => {
        const kind = shapeKindOf(visualByUid, task)
        const span = spanWidthOf(task, pxPerDay)
        return { task, kind, span, width: shapeWidthOf(span, kind, settings) }
      })
      .filter(({ kind, span, width }) => keptByLevelOfDetail(kind, span, width, settings))
      // ---- LC-8, ST-2: start ascending, finish descending, uid ascending ---
      .sort(
        (a, b) =>
          (a.task.start ?? '').localeCompare(b.task.start ?? '') ||
          (b.task.finish ?? '').localeCompare(a.task.finish ?? '') ||
          a.task.uid - b.task.uid,
      )

    const lanes: { x0: number; x1: number }[][] = []
    // Two running summaries per lane, so ST-3's search does not have to walk
    // every interval already placed. A row of m Tasks that do not overlap --
    // the ordinary case, every one of them landing on lane 0 -- cost
    // 1 + 2 + ... + (m-1) comparisons without them, which is the O(n^2)
    // NFR-013 forbids, and stacking is what PG-8 measures.
    const laneMaxX1: number[] = []
    const laneMinX0: number[] = []
    const laneOf: number[] = []
    const measured = drawnTasks.map(({ task, kind, width }) => {
      const from = dayOf(task.start)
      const at = from === null ? originX : xOfDay(originSerial, pxPerDay, originX, from)
      // LF-10 centres a milestone's figure on its day; every other shape
      // starts at it.
      const x = kind === 'milestone' ? at - width / 2 : at
      // ---- LC-4, LC-5, LC-6: cut, estimate, then table T-013 -------------
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      const placement: LabelPlacement = text <= width ? 'inside' : 'right'
      // ---- LC-7: OC-1 is the label the shape could not hold --------------
      const occupiedX1 = placement === 'right' ? x + width + settings.labelGap + text : x + width
      const actual = actualSpanOf(task, within, originSerial, pxPerDay, originX)
      return { task, kind, x, width, label, font, placement, actual, occupiedX0: x, occupiedX1 }
    })

    for (const item of measured) {
      // ---- LC-8, ST-3: the shallowest lane it does not overlap ------------
      // ST-10 keeps the interval half-open, so touching ends do not collide.
      let lane = -1
      for (let i = 0; i < lanes.length; i++) {
        // The two summaries answer without a scan whenever the item clears the
        // whole lane on one side. ST-2 sorts by start ascending, so occupiedX0
        // is non-decreasing for every shape but a milestone (LF-10 shifts its x
        // left by half the figure) and the first test settles nearly every
        // item. Neither is a new rule -- the exact scan below still decides
        // when they do not hold, so the answer is what it always was.
        if (item.occupiedX0 >= laneMaxX1[i]! || item.occupiedX1 <= laneMinX0[i]!) {
          lane = i
          break
        }
        if (lanes[i]!.every((q) => item.occupiedX1 <= q.x0 || item.occupiedX0 >= q.x1)) {
          lane = i
          break
        }
      }
      if (lane < 0) {
        if (lanes.length >= settings.stackSafetyCap) {
          throw new StackSafetyCapReached(row.id, settings.stackSafetyCap)
        }
        lane = lanes.length
        lanes.push([])
        laneMaxX1.push(Number.NEGATIVE_INFINITY)
        laneMinX0.push(Number.POSITIVE_INFINITY)
      }
      lanes[lane]!.push({ x0: item.occupiedX0, x1: item.occupiedX1 })
      laneMaxX1[lane] = Math.max(laneMaxX1[lane]!, item.occupiedX1)
      laneMinX0[lane] = Math.min(laneMinX0[lane]!, item.occupiedX0)
      laneOf.push(lane)
    }

    // ---- LC-9, LF-2: each lane is its tallest, gaps go between them -------
    // One pass over `measured`. Re-filtering it per lane cost O(lanes x m), and
    // lanes == m exactly when the Tasks overlap -- which is when stacking
    // matters at all -- so it was the O(n^2) NFR-013 forbids. The spread of
    // Math.max went with it: a lane holding tens of thousands of Tasks passed
    // that many arguments and threw RangeError rather than answering.
    const laneHeights = lanes.map(() => 0)
    measured.forEach((item, index) => {
      const reserved = reservedHeight(item.kind, settings)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    // LF-2's empty-lane arm. ⚠️ A lane is only ever created because a Task
    // needed one, so this cannot fire today -- it is kept because LF-2 states
    // the rule, not because the loop above can leave a lane at zero.
    for (let i = 0; i < laneHeights.length; i++) {
      if (laneHeights[i] === 0) laneHeights[i] = emptyLane
    }
    const stacked = laneHeights.reduce((sum, h) => sum + h + settings.stackGap, 0)
    const packed = Math.max(0, stacked - settings.stackGap)
    // FR-042 reads a stated height as a floor, never as a cap.
    const height = Math.max(packed, emptyLane, row.height ?? 0)

    // ---- LC-9, ST-5: stackDirection (S-58) picks which end lane 0 sits at --
    // ⚠️ ST-5 settles that the direction is one choice for the whole document
    // and that S-58 defaults it to 'up'; it does NOT spell out which end of the
    // band the shallowest lane lands on. The reading taken here is the one the
    // previous project settled and the specification has not contradicted:
    // 'down' puts lane 0 at the TOP of the band and stacks downward, 'up' puts
    // it at the BOTTOM and stacks upward. ST-2 and ST-3 are untouched -- the
    // lane a Task is given is the same either way, and only the y it is drawn
    // at is reversed, which is why no rule of table T-014 has to be re-read.
    // ⚠️ The block stays anchored to the top of the band. When FR-042's stated
    // height makes the band taller than the lanes need, nothing in docs/spec
    // says whether the slack belongs above or below the stack.
    const upward = settings.stackDirection === 'up'
    const tops = new Array<number>(laneHeights.length)
    let laneTop = y
    for (let slot = 0; slot < laneHeights.length; slot++) {
      const lane = upward ? laneHeights.length - 1 - slot : slot
      tops[lane] = laneTop
      laneTop += laneHeights[lane]! + settings.stackGap
    }

    measured.forEach((item, index) => {
      const lane = laneOf[index]!
      placements.push({
        taskUid: item.task.uid,
        groupId: row.id,
        shapeKind: item.kind,
        stack: lane,
        x: item.x,
        width: item.width,
        y: tops[lane]!,
        height: reservedHeight(item.kind, settings),
        planHeight: planHeightOf(item.kind, settings),
        actualPlacement:
          item.kind === 'milestone' ? 'sideways' : laidBelow(item.kind) ? 'below' : 'inside',
        actualX: item.actual === null ? null : item.actual.x,
        actualWidth: item.actual === null ? 0 : item.actual.width,
        labelPlacement: item.placement,
        label: item.label,
        // LC-5 measured the label with this size; it leaves with the placement
        // so nothing downstream writes FR-077's formula a second time.
        labelFontSize: item.font,
        occupiedX0: item.occupiedX0,
        occupiedX1: item.occupiedX1,
      })
      widest = Math.max(widest, item.occupiedX1)
      leftmost = Math.min(leftmost, item.occupiedX0)
    })

    rowPlacements.push({
      groupId: row.id,
      depth: row.depth,
      y,
      height,
      stackCount: lanes.length,
      // LF-2 gives a row with no lane one rectangle's band, so LF-12 still has
      // one height to pass the progress line through.
      stackTops: tops.length === 0 ? [y] : tops,
    })
    // ---- LC-9, LF-3 ------------------------------------------------------
    y += height + settings.rowGap
  }

  const contentHeight = Math.max(0, y - settings.rowGap - regions.rowArea.y)
  const contentWidth =
    leftmost === Number.POSITIVE_INFINITY ? 0 : Math.max(0, widest - leftmost)

  return {
    pxPerDay,
    tier: rulerTierOf(pxPerDay, settings),
    originDay,
    originX,
    rectangleHeight: planHeightOf('rectangle', settings),
    rows: rowPlacements,
    placements,
    contentWidth,
    contentHeight,
  }
}

/** Where one Task ended up, or null when this zoom does not draw it. @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((p) => p.taskUid === taskUid) ?? null
}

/**
 * FR-055's candidate zoom for one pass over table T-068.
 *
 * The measurement is the drawn extent (table T-038), not the span of the dates,
 * so a label hanging off the left is counted. Each axis is settled on its own,
 * the zoom being anisotropic. An empty document returns to unity, which is what
 * FR-055 asks when there is no extent to divide by.
 *
 * ⚠️ It does NOT clamp. FR-016 puts "hold the zoom inside what S-75 and S-76
 * allow (MUST)" on the zoom operation, and zoomMin and zoomMax are marked as
 * values the document does not keep (S-54, S-55), so they never reach this
 * layer. Where the clamp bites, FR-055 leaves that axis to scroll.
 *
 * ⚠️ The caller runs this at most twice and takes the smaller zoom, per the rule
 * after table T-068. A third pass is forbidden (MUST NOT).
 *
 * @purity pure
 */
export function fitZoom(
  layout: ScheduleLayout,
  settings: DocumentSettings,
  regions: ScreenRegions,
): { readonly zoomX: number; readonly zoomY: number } {
  return {
    zoomX:
      layout.contentWidth <= 0 ? 1 : settings.zoomX * (regions.rowArea.width / layout.contentWidth),
    zoomY:
      layout.contentHeight <= 0
        ? 1
        : settings.zoomY * (regions.rowArea.height / layout.contentHeight),
  }
}

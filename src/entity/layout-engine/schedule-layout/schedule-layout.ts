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
  dayOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../document-model/schedule/schedule'
import type { ScreenRegions } from '../screen-regions/screen-regions'

/** The four steps of the Time Ruler. L-1 of table T-005a. */
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

/** Where a label sits relative to its shape. Table T-013. */
export type LabelPlacement = 'inside' | 'right'

/** One Task, placed. */
export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  /** The lane ST-3's greedy pass put it in, counted from the shallowest. */
  readonly stack: number
  /** The shape itself: x from its start, width from its duration. */
  readonly x: number
  readonly width: number
  readonly y: number
  readonly height: number
  /** NL-1 or NL-3 of table T-013. */
  readonly labelPlacement: LabelPlacement
  /** The label after LC-4 cut it to truncateUnits. */
  readonly label: string
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
}

export interface ScheduleLayout {
  /** S-1 times zoomX, which FR-017 makes the width of one day. */
  readonly pxPerDay: number
  readonly tier: RulerTier
  /** The day the left edge of the Row Area points at (S-77). */
  readonly originDay: CalendarDay | null
  readonly rows: readonly RowPlacement[]
  readonly placements: readonly TaskPlacement[]
  /** Everything drawn, measured with table T-038's occupancy. FR-055 fits to this. */
  readonly contentWidth: number
  readonly contentHeight: number
}

/** ST-7 stops the whole layout rather than truncating or overlapping. */
export class StackSafetyCapReached extends Error {
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
  let out = ''
  for (const ch of text) {
    const next = units + (ch.charCodeAt(0) < 0x100 ? 1 : 2)
    if (next > limit) return out
    units = next
    out += ch
  }
  return out
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
function reservedHeight(shapeKind: string, settings: DocumentSettings): number {
  const ratios = settings.shapeHeightOf
  const ratio =
    shapeKind === 'chevron' ? ratios.chevron
    : shapeKind === 'arrow' ? ratios.arrow
    : shapeKind === 'endpointSpan' ? ratios.endpointSpan
    : shapeKind === 'milestone' ? ratios.milestone
    : ratios.rectangle
  const floor = settings.actualMin / settings.actualOfPlan
  const planHeight = Math.max(floor, settings.basePlanHeight * settings.zoomY) * ratio
  const laidBelow = shapeKind === 'arrow' || shapeKind === 'endpointSpan'
  return laidBelow ? planHeight + settings.actualGap + planHeight * settings.actualOfPlan : planHeight
}

/** The font a bar's label is drawn at. Floored at fontMin (S-8). @purity pure */
function labelFontSize(shapeKind: string, settings: DocumentSettings): number {
  const actual = reservedHeight(shapeKind, settings) * settings.actualOfPlan
  return Math.max(settings.fontMin, actual * settings.fontOfActual)
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
 * @purity pure
 */
export function dateAtX(layout: ScheduleLayout, regions: ScreenRegions, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const days = Math.floor((x - regions.rowArea.x) / layout.pxPerDay)
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
  const out: (TaskGroup & { depth: number })[] = []

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
    if (!dropped) out.push({ ...group, depth })
  }
  return out.sort((a, b) => a.depth - b.depth || a.order - b.order)
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

/** @purity pure */
function shapeKindOf(schedule: Schedule, task: Task): string {
  const visual = schedule.taskVisuals.find((v) => v.taskUid === task.uid)
  const kind = visual?.shapeKind ?? null
  // AT-100: a null resolves through Task.milestone, which AT-30 calls the truth.
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}

/** @purity pure */
function barWidthOf(task: Task, pxPerDay: number): number {
  const from = dayOf(task.start)
  const to = dayOf(task.finish)
  if (from === null || to === null) return 0
  return Math.max(0, serialOf(to) - serialOf(from)) * pxPerDay
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

  const taskByUid = new Map(schedule.tasks.map((t) => [t.uid, t]))
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  let y = regions.rowArea.y
  let widest = 0
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = reservedHeight('rectangle', settings)

  for (const row of rows) {
    // ---- LC-2, the task half: CR-163 measures the shape, not the depth -----
    const members = schedule.taskGroupMembers
      .filter((m) => m.groupId === row.id)
      .map((m) => taskByUid.get(m.taskUid))
      .filter((t): t is Task => t !== undefined)
      .filter((t) => barWidthOf(t, pxPerDay) >= settings.taskLevelOfDetailReadablePx)
      // ---- LC-8, ST-2: start ascending, finish descending, uid ascending ---
      .sort(
        (a, b) =>
          (a.start ?? '').localeCompare(b.start ?? '') ||
          (b.finish ?? '').localeCompare(a.finish ?? '') ||
          a.uid - b.uid,
      )

    const lanes: { x0: number; x1: number }[][] = []
    const laneOf: number[] = []
    const measured = members.map((task) => {
      const kind = shapeKindOf(schedule, task)
      const from = dayOf(task.start)
      const x = from === null ? originX : xOfDay(originSerial, pxPerDay, originX, from)
      const width = barWidthOf(task, pxPerDay)
      // ---- LC-4, LC-5, LC-6: cut, estimate, then table T-013 -------------
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      const placement: LabelPlacement = text <= width ? 'inside' : 'right'
      // ---- LC-7: OC-1 is the label the shape could not hold --------------
      const occupiedX1 = placement === 'right' ? x + width + settings.labelGap + text : x + width
      return { task, kind, x, width, label, placement, occupiedX0: x, occupiedX1 }
    })

    for (const item of measured) {
      // ---- LC-8, ST-3: the shallowest lane it does not overlap ------------
      // ST-10 keeps the interval half-open, so touching ends do not collide.
      let lane = lanes.findIndex((held) =>
        held.every((q) => item.occupiedX1 <= q.x0 || item.occupiedX0 >= q.x1),
      )
      if (lane < 0) {
        if (lanes.length >= settings.stackSafetyCap) {
          throw new StackSafetyCapReached(row.id, settings.stackSafetyCap)
        }
        lane = lanes.length
        lanes.push([])
      }
      lanes[lane]!.push({ x0: item.occupiedX0, x1: item.occupiedX1 })
      laneOf.push(lane)
    }

    // ---- LC-9, LF-2: each lane is its tallest, gaps go between them -------
    const laneHeights = lanes.map((held, index) =>
      held.length === 0
        ? emptyLane
        : Math.max(...measured.filter((_, i) => laneOf[i] === index).map((m) => reservedHeight(m.kind, settings))),
    )
    const stacked = laneHeights.reduce((sum, h) => sum + h + settings.stackGap, 0)
    const packed = Math.max(0, stacked - settings.stackGap)
    // FR-042 reads a stated height as a floor, never as a cap.
    const height = Math.max(packed, emptyLane, row.height ?? 0)

    let laneTop = y
    const tops = laneHeights.map((h) => {
      const top = laneTop
      laneTop += h + settings.stackGap
      return top
    })

    measured.forEach((item, index) => {
      const lane = laneOf[index]!
      placements.push({
        taskUid: item.task.uid,
        groupId: row.id,
        stack: lane,
        x: item.x,
        width: item.width,
        y: tops[lane]!,
        height: reservedHeight(item.kind, settings),
        labelPlacement: item.placement,
        label: item.label,
        occupiedX0: item.occupiedX0,
        occupiedX1: item.occupiedX1,
      })
      widest = Math.max(widest, item.occupiedX1)
      leftmost = Math.min(leftmost, item.occupiedX0)
    })

    rowPlacements.push({ groupId: row.id, depth: row.depth, y, height, stackCount: lanes.length })
    // ---- LC-9, LF-3 ------------------------------------------------------
    y += height + settings.rowGap
  }

  const contentHeight = Math.max(0, y - settings.rowGap - regions.rowArea.y)
  const contentWidth = leftmost === Number.POSITIVE_INFINITY ? 0 : widest - leftmost

  return { pxPerDay, tier: rulerTierOf(pxPerDay, settings), originDay, rows: rowPlacements, placements, contentWidth, contentHeight }
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

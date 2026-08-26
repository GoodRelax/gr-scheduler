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
// ⛔ INCOMPLETE, and deliberately so: LC-7 counts OC-1 and OC-5 of table T-038.
// The rows still missing measure things this milestone does not draw yet -- the
// assignee and percent labels (OC-2), the days-late label (OC-8) and the
// deadline mark (OC-9). Table T-042 puts those at M3 and M4. Each one widens
// what a Task occupies, so ST-1's overlap test and FR-055's fit both read low
// until they arrive. Add them here, not at the call sites: table T-038's
// preamble makes stacking and the fit measurement share this one count (MUST).
//
// ⚠️ OC-7, the plan-against-actual guide, needs no term of its own: GD-5 of
// table T-020a draws it from the actual's near end to the plan's near end, so
// it never reaches past what OC-1 and OC-5 have already counted.
//
// ⛔ Two extents ARE drawn and are still not counted, because table T-038 is a
// closed list and neither has a row: the actual figure of a milestone, which
// LF-10 centres on `actualStart` (GR-15 says a milestone has no actual BAR, so
// OC-5 is not about it), and the actual bar of an arrow or endpoint span, which
// OC-6 takes the horizontal off in as many words. Both can sit far from the
// plan, so FR-055 can fit and still leave them off screen. ⚠️ Do not invent a
// term for either -- it takes a change request against table T-038.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_DEFAULTS,
  dateFromWorkingDays,
  dayOf,
  textOfDay,
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

/** AT-101's eight. Taken from the generated column so the spellings are CR-172's. */
export type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

/** The five of table T-012, spelled as AT-100 spells them. */
export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

/** One Task, placed. */
export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  /** Resolved through AT-100, so nothing downstream reads Task.milestone again. */
  readonly shapeKind: ShapeKind
  /**
   * AT-101's figure, resolved through its default so nothing downstream reads
   * `taskVisuals` again. ⚠️ Only meaningful when `shapeKind` is `'milestone'`;
   * AT-101 says in as many words that it is looked at then and not otherwise.
   *
   * ⭐ Carried here because the geometry had no way to reach it: it drew every
   * milestone as a ◇ whatever the document said, and the value never left the
   * document model.
   */
  readonly milestoneGlyph: MilestoneGlyph
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
  /**
   * The x that day sits at, so a caller need not re-derive the axis.
   *
   * ⚠️ NOT the left edge of the Row Area. S-177 puts the edge a fraction of
   * one day's width INTO `originDay`, so the day itself begins that far to the
   * left of the edge. Every reader of the time axis goes through this member
   * (`dateAtX`, `xFromDay`, `xOnTimeAxis`), so the fraction is applied once,
   * here, and no caller adds it a second time.
   */
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
  /**
   * The left edge of that same extent, and null while nothing was placed.
   *
   * ⭐ Published because OP-10 of table T-024a wants a position out of FR-055
   * as well as a zoom, and the width alone cannot carry it: two documents of
   * equal width begin on different days. LC-7 already folds this edge to reach
   * `contentWidth`, so nothing is measured a second time to answer it.
   *
   * ⚠️ An x and not a day, because table T-038 measures what is DRAWN and a
   * label's overhang is not a whole number of days. `fitZoom` is the one place
   * it turns into S-77's day, which is what the MUST NOT on holding a scroll
   * position in px (Chapter 1.4) asks for.
   */
  readonly contentX0: number | null
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
 * Table T-012's last column: where the actual sits relative to the plan.
 *
 * ⭐ Resolved in one place because LC-7 and the placement below both need it,
 * and because it is what decides whether OC-5 of table T-038 applies: only the
 * actual laid INSIDE the plan (SH-1, SH-2) is counted left and right. OC-6
 * takes the horizontal off the one pushed below (SH-3, SH-4), and GR-15 of
 * table T-023d says a milestone has no actual bar for OC-5 to be about.
 *
 * @purity pure
 */
function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return laidBelow(shapeKind) ? 'below' : 'inside'
}

/**
 * FR-094's floor on the plan bar, before the shape ratio.
 *
 * ⭐ Written ONCE because `zoomYAtPlanHeightFloor` below solves this very
 * expression for the zoom, and FR-055's fit lands on that zoom. Two spellings
 * of the same floor can differ by an ulp, and then the fit measures at a zoom
 * that is a hair under the floor it meant to sit on.
 *
 * @purity pure
 */
function planHeightFloor(settings: DocumentSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/**
 * The zoomY at which the bands REACH FR-094's floor -- 「帯の高さが `FR-094`
 * の床に達する倍率」, the zoom the first of the two passes printed after table
 * T-068 measures every depth at.
 *
 * ⭐ WHY IT IS THE RIGHT ZOOM TO MEASURE AT: at and below it the `Math.max`
 * in `planHeightOf` answers the floor whatever the zoom is, so no band, no
 * label font and no milestone figure moves. That is what lets the table's own
 * note say the heights of the depths inside the floor come out of ONE run.
 *
 * @purity pure
 */
function zoomYAtPlanHeightFloor(settings: DocumentSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

/**
 * The plan bar's own height. FR-094 puts the floor on it ONCE, before the
 * shape ratio, and forbids a second floor on the actual.
 *
 * @purity pure
 */
function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
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
  const needed = labelWidth('00', settings.rulerFont, settings) + settings.rulerLabelGap
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

/**
 * The x of a day on the time axis the three arguments define.
 *
 * ⚠️ Takes the axis in pieces rather than a `ScheduleLayout` because LC-1 to
 * LC-9 need it while that layout is still being built. It is the one formula:
 * `xFromDay` below is the same axis read off a finished layout.
 *
 * @purity pure
 */
function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number,
                     day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/**
 * PI-5's `xFromDay`: `dateAtX` run the other way.
 *
 * Answers the origin's own x while no origin is set, which is where `dateAtX`
 * answers null -- there is no day to measure from, so nothing is offset.
 *
 * @purity pure
 */
export function xFromDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day)
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
    if (settings.zoomY >= groupDepthThresholdOf(depth, settings)) limit = depth
  }
  return limit
}

/**
 * FR-018's threshold for one depth. Values are S-87 and S-88 of table T-205.
 *
 * ⛔ THE EXPRESSION MUST NOT BE TYPED TWICE. FR-055's fit lands the vertical
 * zoom ON the threshold of the depth it chose, and `groupDepthLimit` above is
 * what then reads that zoom back as a depth. Computed by any other route the
 * two can differ by one ulp, and the fit draws a picture one depth shallower
 * than the zoom it wrote -- which is exactly the silent disagreement FR-055's
 * MUST NOT is about.
 *
 * ⚠️ The domain starts at two: FR-018 forbids depth 1 from being a candidate
 * (MUST NOT), so this is not asked about it. `landingZoomY` says what the fit
 * does there instead.
 *
 * @purity pure
 */
function groupDepthThresholdOf(depth: number, settings: DocumentSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
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
 * AT-101's figure, or the default CR-177 settled.
 *
 * ⭐ The default is read from COLUMN_DEFAULTS rather than written here: it is
 * generated out of erd.json, so changing the manuscript changes what is drawn.
 *
 * @purity pure
 */
function milestoneGlyphOf(
  visualByUid: ReadonlyMap<number, TaskVisual>,
  task: Task,
): MilestoneGlyph {
  return visualByUid.get(task.uid)?.milestoneGlyph ?? COLUMN_DEFAULTS.TaskVisual.milestoneGlyph
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
    x: xOnTimeAxis(originSerial, pxPerDay, originX, from),
    width: Math.max(0, serialOf(to) - serialOf(from)) * pxPerDay,
  }
}

/**
 * Runs LC-1 to LC-9 of table T-068, in that order, once.
 *
 * ⛔ `groupDepthCap` EXISTS FOR FR-055 ALONE, and nothing else may pass it.
 * The first of the two passes printed after table T-068 has to measure 「その
 * 文書が持つすべての深さ」 at ONE zoom -- the one where the bands reach
 * FR-094's floor -- and at that zoom `groupDepthLimit` answers a fixed depth,
 * so the deeper ones cannot be asked for through `zoomY` at all. Every other
 * caller wants the depth FR-018 derives from the zoom in force, which is what
 * leaving it out gives.
 * ⚠️ Adding it moves no published member: table T-064's own header leaves
 * arguments and return values to `src/` and keeps only the names.
 * @provisional PD-206
 *
 * @purity pure
 */
export function layoutFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
): ScheduleLayout {
  // ---- LC-3 first, because LC-2's task half needs the width of one day -----
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const originSerial = originDay === null ? 0 : serialOf(originDay)
  // ---- S-177: the left edge stands this far INTO `scrollDate`'s own day ----
  // ⭐ A fraction of that day's own width and never a px count -- FR-080
  // forbids holding a scroll position in px (MUST NOT) because a zoom or a
  // window width then makes the same number point somewhere else, and a
  // fraction of the anchor's own extent survives both.
  // ⚠️ OP-10a of table T-024a asks for a fraction outside [0, 1) to send the
  // anchor along and come back into range (MUST) and forbids refusing it
  // (MUST NOT) -- and on THIS axis the two spellings are the same place, so
  // the value is applied as it stands rather than walked: every day is
  // `pxPerDay` wide, so 1.3 days past `originDay` IS the next day plus 0.3.
  // ⛔ The vertical axis is not like this and does walk; `scrollOffsetOf`
  // says why.
  // ⛔ Left where it was when no day is named: the fraction is a part of
  // `scrollDate`'s day, and there is no day to take a part of. OP-10 sends
  // that case to FR-055's fit before this ever runs.
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)

  // ---- LC-1, then LC-2's group half ---------------------------------------
  // ⛔ THE CAP REPLACES THE ZOOM-DERIVED LIMIT; it does not bound it. Pass 1
  // of the two-run table printed after table T-068 has to run LC-1 to LC-9
  // through EVERY depth the document has at ONE zoom, and FR-055's vertical
  // paragraph settles the axis by CHOOSING a depth rather than by shrinking
  // the zoom. A cap that could only take depth away cannot reach a depth
  // whose FR-018 rung (S-87 / S-88) stands above that one zoom: pass 1 then
  // measured the same rows for every deeper candidate, and pass 2 -- the arm
  // that exists for exactly those depths -- was unreachable.
  // ⚠️ FR-018 is untouched. Its zoom-to-depth direction still holds for every
  // caller that leaves the argument out, and for the state the fit lands in:
  // `landingZoomY` puts zoomY on the chosen depth's own rung, and
  // `groupDepthLimit` reads that zoom back as that same depth.
  // ⭐ S-125 stays on whichever arm answered. FR-018 lets the level-of-detail
  // judgement cap the depth there (MAY), and it is what stops a caller asking
  // for a depth no zoom could draw.
  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
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

  // The bands are measured from the top of the Row Area and the whole stack is
  // slid at the end, because a band's height is only known once its lanes are:
  // the row S-78 names cannot be put at the top before the rows above it have
  // been measured.
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
        const glyph = milestoneGlyphOf(visualByUid, task)
        return { task, kind, glyph, span, width: shapeWidthOf(span, kind, settings) }
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
    const measured = drawnTasks.map(({ task, kind, glyph, width }) => {
      const from = dayOf(task.start)
      const at = from === null ? originX : xOnTimeAxis(originSerial, pxPerDay, originX, from)
      // LF-10 centres a milestone's figure on its day; every other shape
      // starts at it.
      const x = kind === 'milestone' ? at - width / 2 : at
      // ---- LC-4, LC-5, LC-6: cut, estimate, then table T-013 -------------
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      const placement: LabelPlacement = text <= width ? 'inside' : 'right'
      // ---- LC-7: OC-1 is the label the shape could not hold --------------
      const labelledX1 = placement === 'right' ? x + width + settings.labelGap + text : x + width
      const actual = actualSpanOf(task, within, originSerial, pxPerDay, originX)
      // ---- LC-7: OC-5 is the actual bar reaching outside the plan --------
      // ⛔ Not conditioned on `planActualDisplay`: OC-2 is the row that spells
      // out "count it only while it is shown", and OC-3 / OC-4 give the reason
      // for the silence on the other rows -- a Task must not move when a
      // display toggle is flipped.
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      const occupiedX0 = spread === null ? x : Math.min(x, spread.x)
      const occupiedX1 =
        spread === null ? labelledX1 : Math.max(labelledX1, spread.x + spread.width)
      return { task, kind, glyph, x, width, label, font, placement, actual,
               occupiedX0, occupiedX1 }
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
        milestoneGlyph: item.glyph,
        stack: lane,
        x: item.x,
        width: item.width,
        y: tops[lane]!,
        height: reservedHeight(item.kind, settings),
        planHeight: planHeightOf(item.kind, settings),
        actualPlacement: actualPlacementOf(item.kind),
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

  // ---- S-78 with S-176: put the place the display points at at the top -----
  const scrollOffsetY = scrollOffsetOf(rowPlacements, settings, regions.rowArea.y)
  // ⚠️ Measured before the slide: FR-055 fits to the extent of the content,
  // which does not change when the content is scrolled.
  const contentHeight = Math.max(0, y - settings.rowGap - regions.rowArea.y)
  const nothingPlaced = leftmost === Number.POSITIVE_INFINITY
  const contentWidth = nothingPlaced ? 0 : Math.max(0, widest - leftmost)
  const contentX0 = nothingPlaced ? null : leftmost

  return {
    pxPerDay,
    tier: rulerTierOf(pxPerDay, settings),
    originDay,
    originX,
    rectangleHeight: planHeightOf('rectangle', settings),
    rows: scrolledRows(rowPlacements, scrollOffsetY),
    placements: scrolledPlacements(placements, scrollOffsetY),
    contentWidth,
    contentHeight,
    contentX0,
  }
}

/**
 * How far the whole stack has to slide so that the top edge of the Row Area
 * stands where S-78 and S-176 put it.
 *
 * ⭐ The vertical counterpart of S-77 and S-177, which `originX` above already
 * applies to the horizontal. Without it the wheel writes a new `scrollGroupId`
 * every turn and every turn draws the same rows.
 * ⭐ S-176 IS WHAT LETS THE PICTURE REST BETWEEN TWO ROWS. The anchor alone
 * can only name a band's top edge, so a movement shorter than the row standing
 * at the top edge had nowhere to be written and 表 T-023d's 「パンは等倍とす
 * ること（MUST）」 was out of reach. The fraction is of that row's OWN height
 * and never a px count -- FR-080 forbids px (MUST NOT) because a zoom or a
 * window width makes the same number point somewhere else.
 *
 * ⚠️ OP-10a of table T-024a: a fraction outside [0, 1) sends the anchor that
 * many rows along and comes back into range (MUST), and refusing it is
 * forbidden (MUST NOT) -- two spellings of one position would make NS-4's
 * round-trip comparison false. ⛔ The walk is NOT distance-preserving and is
 * not meant to be: rows differ in height, so 「その分だけ隣へ送る」 can only
 * mean the whole part of the fraction counted in rows. It is idempotent, so a
 * reader that normalised the value first and one that did not draw the same
 * picture.
 * ⚠️ 「送った先に行が無いとき」 falls to OP-10, which the shell answers by
 * handing FR-055's fit down in the settings; there is nothing left to do here,
 * so the walk simply stops at the end of the stack.
 *
 * ⚠️ FR-051 sends the READING side to OP-10 as well, and the shell answers its
 * two cases -- a null, and an id naming no `TaskGroup` -- the same way, so
 * neither is decided a second time here.
 * ⛔ An id naming a row this pass did NOT draw (FR-018 dropped it, or HR-1a
 * collapsed something above it) is neither of OP-10's cases and no rule covers
 * it. The stack then stays where it was measured rather than being slid to a
 * row that is not on screen.
 *
 * @purity pure
 */
function scrollOffsetOf(
  rows: readonly RowPlacement[],
  settings: DocumentSettings,
  rowAreaY: number,
): number {
  const anchoredAt = rows.findIndex((row) => row.groupId === settings.scrollGroupId)
  if (anchoredAt < 0) return 0
  const held = Number.isFinite(settings.scrollGroupOffset) ? settings.scrollGroupOffset : 0
  const carriedRows = Math.floor(held)
  const landedAt = Math.min(rows.length - 1, Math.max(0, anchoredAt + carriedRows))
  const row = rows[landedAt]
  if (row === undefined) return 0
  return row.y + (held - carriedRows) * row.height - rowAreaY
}

/**
 * The rows, slid up by S-78's offset. One pass, and none at all when the
 * display sits at the top.
 *
 * @purity pure
 */
function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] {
  if (offsetY === 0) return rows
  return rows.map((row) => ({
    ...row,
    y: row.y - offsetY,
    stackTops: row.stackTops.map((top) => top - offsetY),
  }))
}

/** The placements, slid by the same offset as their rows. @purity pure */
function scrolledPlacements(
  placements: readonly TaskPlacement[],
  offsetY: number,
): readonly TaskPlacement[] {
  if (offsetY === 0) return placements
  return placements.map((one) => ({ ...one, y: one.y - offsetY }))
}

/** Where one Task ended up, or null when this zoom does not draw it. @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((p) => p.taskUid === taskUid) ?? null
}

/**
 * What FR-055 chooses: two zooms and the two halves of a display position.
 *
 * ⭐ FOUR values and not two. OP-10 of table T-024a sends BOTH the zoom and the
 * position to FR-055 (MUST), so a caller that took only the zoom had to invent
 * the other half, and the harm FR-055's RATIONALE names -- the left overhang
 * disappearing behind the Row Title panel -- came straight back.
 *
 * ⚠️ The position is a day and a `TaskGroup.id` (S-77, S-78) because Chapter
 * 1.4 forbids holding a scroll position in px (MUST NOT): the same px means a
 * different place once the zoom or the screen width moves.
 *
 * ⭐ THE TWO FRACTIONS ARE NOT MEMBERS HERE BECAUSE THE FIT'S ANSWER FOR BOTH
 * IS ZERO. S-176 and S-177 say how far INTO the anchor row and the anchor day
 * the top left corner of the view stands, and this fit puts that corner on the
 * content's own corner: `scrollDate` below is the day the leftmost drawn px
 * falls in (`dateAtX` floors, so the content begins at that day's start or
 * later) and `scrollGroupId` is the top row itself. A constant is not worth a
 * member, so both CALLERS write the zero -- `fitCommand` for the press and
 * `viewSettings` for OP-10 of table T-024a -- and a fraction left standing
 * from the pan before cannot slide the fitted picture by up to one row and one
 * day.
 * ⚠️ `fitScheduleToScreen` (CM-71) DOES carry the pair; the note that once
 * stood here saying it carried the anchors only was written before CR-260 and
 * was stale. Searched: `edit-document-settings.ts` (CM-66, CM-71), table
 * T-108, table T-203 S-176 / S-177, OP-10 and OP-10a of table T-024a.
 */
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  /** S-77. */
  readonly scrollDate: string | null
  /** S-78. A `TaskGroup.id`, never a row number. */
  readonly scrollGroupId: string | null
}

/**
 * The three zoom values table T-206 keeps OUT of the document -- S-96, S-97 and
 * S-98, each of which states its value by naming a row of table T-201.
 *
 * ⭐ They arrive as an argument rather than being typed here, which is the
 * precedent `InputContext.zoomStep` already set: LY-5 of table T-060 leaves the
 * Framework as the only layer that may hold a current value, and a number
 * written in this file would be a second copy of the manuscript (rule 03).
 *
 * ⚠️ Not a row of table T-064. That table holds the NAMES a component
 * publishes and leaves arguments and return values to `src/`; this type exists
 * only to give `fitZoom` its signature, exactly as `FitToScreen` does.
 */
export interface NotStoredZoom {
  /** S-96, stated at S-53. One notch of the zoom controls. */
  readonly step: number
  /** S-97, stated at S-54. */
  readonly min: number
  /** S-98, stated at S-55. */
  readonly max: number
}

/**
 * The smallest zoomY that draws a given group depth and nothing deeper -- the
 * zoom FR-055 lands on once it has chosen the depth.
 *
 * ⛔ FR-055's MUST NOT is 「採った段を描ける最小の倍率より下へ下げてはならない」,
 * and `groupDepthThresholdOf` is that smallest zoom for every depth FR-018's
 * domain covers. Reading it back through `groupDepthLimit` answers the same
 * depth, because both sides go through the one expression.
 *
 * ⛔ DEPTH 1 IS OUTSIDE FR-018's DOMAIN, so it has no smallest zoom and the
 * MUST NOT is vacuous there. One S-53 notch below the depth-2 threshold is
 * taken instead: it is the largest zoom that draws depth 1 and nothing more,
 * which is what FR-055's 「無用に縦幅を増やすな」 reading asks, and it puts ONE
 * press of the vertical zoom-in control exactly on depth 2 rather than a hair
 * under it. ⛔ FR-055's RATIONALE does not say this; it is a choice.
 * @provisional PD-204
 *
 * @purity pure
 */
function landingZoomY(depth: number, settings: DocumentSettings, step: number): number {
  if (depth <= 1) return groupDepthThresholdOf(2, settings) / step
  return groupDepthThresholdOf(depth, settings)
}

/**
 * How deep the sweep below has to go: the deepest row this schedule draws at
 * all, never deeper than S-125.
 *
 * ⚠️ Capped because `groupDepthLimit` will never answer more than
 * `maxGroupDepth`, so a row below that is not drawable at any zoom and asking
 * for it would only make the sweep longer.
 *
 * @purity pure
 */
function deepestDrawnDepth(schedule: Schedule, settings: DocumentSettings): number {
  let deepest = 0
  for (const row of drawnGroups(schedule, settings)) {
    if (row.depth > deepest) deepest = row.depth
  }
  return Math.min(deepest, settings.maxGroupDepth)
}

/** FR-016's range, applied to one measured zoom. @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  return Math.min(zoom.max, Math.max(zoom.min, value))
}

/**
 * FR-055's fit: the two zooms and the two halves of a display position.
 *
 * ⭐ IT TAKES THE `Schedule` AND RUNS ITS OWN LAYOUTS. While it was handed one
 * finished `ScheduleLayout` it could only answer the zoom that layout was laid
 * out at times a ratio -- and below FR-094's floor the drawn height does not
 * depend on zoomY at all, so that ratio was a constant and pressing fit walked
 * the zoom down by the same factor every time while the picture never lost a
 * pixel of height. What it DID lose was rows, because `groupDepthLimit` reads
 * the same collapsing zoom. That is the mechanism FR-055's MUST NOT forbids.
 *
 * ⭐ NOTHING BELOW READS THE ZOOM IN FORCE. Every input is the schedule, the
 * regions, or a setting this function does not itself write, so the answer is a
 * constant function of the state it does not touch: asking twice returns the
 * same four values exactly, which is the idempotence FR-018 leans on when it
 * excludes IC-10 from the press-and-hold repeat.
 *
 * ⭐ The vertical CHOOSES A DEPTH, following FR-055's 「表示量（グループ LOD の
 * 深さ）を選んで合わせること（MUST）」 and the two passes printed after table
 * T-068:
 *   (a) one run at unity settles the horizontal;
 *   (b) pass 1 runs every depth the document has at the floor zoom and takes
 *       the deepest whose drawn height fits the Row Area, or depth 1;
 *   (c) the vertical lands on the smallest zoom that draws that depth;
 *   (d) pass 2 runs only when that zoom is above the floor -- which is the only
 *       case where the picture can still grow -- and retreats one depth if it
 *       does not fit. ⛔ No third pass (MUST NOT).
 *
 * ⚠️ THE HORIZONTAL IS MEASURED AT UNITY AND NOT AT THE STORED zoomX. The
 * vertical answer rides on the horizontal -- S-86 thins the picture at a low
 * zoomX and wide spans stop overlapping at a high one, so the lane count, and
 * with it the drawn height, moves with zoomX at a FIXED depth. Measuring at a
 * zoom the fit itself writes would make the answer a recurrence again. Unity is
 * also the conservative base: nothing is dropped by S-86 there, so the extent
 * fitted to is the fullest one. ⛔ No row names the base.
 * @provisional PD-203
 *
 * ⚠️ IT CLAMPS THE HORIZONTAL. FR-016 puts the range on the zoom operation and
 * CM-71 applies it, but a fit that measured the vertical at a zoomX the write
 * then clamped would draw a picture it never measured. ⛔ The vertical is not
 * clamped and must not be: every landing zoom lies strictly inside S-97 and
 * S-98, and moving one off its threshold would answer a different depth.
 * @provisional PD-205
 *
 * ⛔ Its MAY for a held position of null (fall back on the day this runs) is
 * NOT taken: reading a clock here would break `@purity pure`, and FR-055 warns
 * in the same breath that the run day must not reach the drawing.
 *
 * ⛔ A held `scrollGroupId` that names a row no pass DREW -- FR-018's level of
 * detail dropped it, or HR-1a collapsed it, or HR-6 hid it -- is NEITHER of
 * OP-10's two conditions (a null, and an id naming no `TaskGroup`) and no rule
 * anywhere covers it. Nothing is invented for it here: the id answered below is
 * one the chosen run drew, and the empty-document arm hands back what it was
 * given rather than deciding what such an id ought to become.
 *
 * @purity pure
 */
export function fitZoom(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoom: NotStoredZoom,
): FitToScreen {
  const floorZoomY = zoomYAtPlanHeightFloor(settings)
  const deepest = deepestDrawnDepth(schedule, settings)
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(schedule, { ...settings, zoomX, zoomY }, regions, cap)

  // ---- (a) the horizontal, measured once at unity --------------------------
  const atUnity = runAt(1, floorZoomY, deepest)
  // FR-055's empty-document arm (MUST). ⚠️ 「描くものが 1 つも無い」 is no ROW
  // at all: LF-2 gives a row holding no Task one rectangle's band, so an empty
  // row still has an extent and is fitted like any other.
  if (atUnity.rows.length === 0) {
    return {
      zoomX: 1,
      zoomY: 1,
      scrollDate: settings.scrollDate,
      scrollGroupId: settings.scrollGroupId,
    }
  }
  // Rows but no drawn Task leaves nothing to divide by on this axis alone.
  const zoomX =
    atUnity.contentWidth <= 0
      ? 1
      : clampedZoom(regions.rowArea.width / atUnity.contentWidth, zoom)

  // ---- (b) pass 1: every depth the document has, at the floor zoom ---------
  // ⚠️ EVERY depth, not just down to the first that fits, because the retreat
  // in (d) needs the shallower one already measured and a run for it then
  // would be the third pass the rule after table T-068 forbids. The sweep is
  // capped at S-125, so it is at most that many runs of a table the frame
  // takes once -- NFR-013's growth is unchanged and this happens per press.
  const atFloor: ScheduleLayout[] = []
  for (let cap = 1; cap <= deepest; cap++) atFloor.push(runAt(zoomX, floorZoomY, cap))
  const fits = (run: ScheduleLayout): boolean => run.contentHeight <= regions.rowArea.height
  // 「その文書が持つ最も深い段から順に見て、描くものが Row Area に収まる最も深
  // い段を採る」. Depth 1 when none of them does -- FR-055 leaves the vertical
  // scroll standing rather than shrinking further.
  let depth = 1
  for (let candidate = deepest; candidate >= 1; candidate--) {
    if (fits(atFloor[candidate - 1]!)) {
      depth = candidate
      break
    }
  }
  let chosen = atFloor[depth - 1]!

  // ---- (c) and (d) --------------------------------------------------------
  let zoomY = landingZoomY(depth, settings, zoom.step)
  if (zoomY > floorZoomY) {
    // Only the depths whose threshold sits above FR-094's floor reach here, and
    // only there can the picture still grow with the zoom -- which is why the
    // rule after table T-068 makes this pass conditional.
    const atLanding = runAt(zoomX, zoomY, depth)
    if (fits(atLanding) || depth === 1) {
      chosen = atLanding
    } else {
      depth -= 1
      zoomY = landingZoomY(depth, settings, zoom.step)
      // ⚠️ The position then comes off the retreated depth's FLOOR run, which
      // is the only measurement of that depth in hand -- the run that would
      // settle it exactly is the third pass the rule after table T-068 forbids.
      // ⭐ `scrollGroupId` is exact either way: the same depth cap draws the
      // same rows in the same order. ⛔ `scrollDate` can be a hair late, and
      // only ever by half a milestone figure: LC-6 never puts a label on the
      // LEFT, so the leftmost edge moves with zoomY solely through LF-10's
      // figure, which is half a plan height wide. ⛔ No row says which run
      // answers it.
      // @provisional PD-207
      chosen = atFloor[depth - 1]!
    }
  }

  // ---- (e) the position, off the run that was chosen -----------------------
  // The px that LC-7 folded, turned into S-77's day by PI-5's own converter so
  // the axis is read exactly once and x -> day cannot drift from day -> x.
  const leftDay = chosen.contentX0 === null ? null : dateAtX(chosen, chosen.contentX0)
  return {
    zoomX,
    zoomY,
    scrollDate: leftDay === null ? settings.scrollDate : textOfDay(leftDay),
    // LC-1 to LC-9 push the rows in the order they are drawn and the S-78 slide
    // moves them all together, so the first is the top one however far the stack
    // has been slid.
    scrollGroupId: chosen.rows[0]?.groupId ?? settings.scrollGroupId,
  }
}

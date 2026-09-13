// ScheduleLayout -- public entry of this folder.
//
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5
//
// The time axis, label widths, row placing, level of detail and the fit (CP-5):
// LC-1 to LC-9 of table T-068 here, LC-10 and LC-11 in ScheduleGeometry.
//
// ⛔ INCOMPLETE: LC-7 counts OC-1, OC-2 and OC-5 of table T-038; OC-8 and OC-9
// wait for their marks to be drawn (MS-4 of table T-042). Until then stacking
// and the fit read low. Add them here, not at call sites -- the two share this one count.
//
// OC-7 (the plan-actual guide) needs no term: GD-5 of table T-020a keeps it
// between the plan and the actual, inside what OC-1 and OC-5 already count.
//
// Two drawn extents are not counted because table T-038 has no row for them:
// a milestone's actual figure (LF-10, GR-15) and a laid-below actual bar (OC-6).
// FR-055 can leave either off screen; adding a term takes a change request.

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_DEFAULTS,
  dateFromWorkingDays,
  dayOf,
  nextWorkingDay,
  planActualState,
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

/** AT-101, taken from the generated column so the spellings are the manuscript's. */
export type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

/** The five of table T-012, spelled as AT-100 spells them. */
export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

/**
 * One Task, placed.
 *
 * `labelX`, `labelFontSize`, the fades, `actualReach`, `dummyReach` and
 * `outsideLabel` are the values LC-7 measured with; drawers read them here so
 * the drawing cannot drift from the measurement.
 */
export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  /** Resolved through AT-100, so nothing downstream reads Task.milestone again. */
  readonly shapeKind: ShapeKind
  /** AT-101, default applied. Only meaningful when `shapeKind` is `'milestone'`. */
  readonly milestoneGlyph: MilestoneGlyph
  /** The lane ST-3's greedy pass put it in, counted from the shallowest. */
  readonly stack: number
  /** The drawn shape, not the date span: LF-10 centres a milestone, S-49 widens a short shape. */
  readonly x: number
  readonly width: number
  /** The plan's two ends on one day (closing rule of table T-023d); `width` cannot tell. */
  readonly planEndsStandOnOneDay: boolean
  readonly y: number
  /** What the row's stacking reserved: the plan, plus the actual when SH-3 or SH-4 pushes it below. */
  readonly height: number
  /** The plan bar alone, floored once by FR-094. The actual is this times `actualOfPlan`. */
  readonly planHeight: number
  /** Table T-012's last column, resolved once so nothing downstream re-reads it. */
  readonly actualPlacement: 'inside' | 'below' | 'sideways'
  /**
   * RV-1, `null` without an actual. The span of the dates: a milestone's is zero
   * wide and the geometry centres its figure on `actualX` (LF-10).
   */
  readonly actualX: number | null
  readonly actualWidth: number
  /** The actual figure's right ink edge, `null` without one. Not `actualX + actualWidth` (`actualReachOf`). */
  readonly actualReach: number | null
  /**
   * FR-043's dummy's right edge on a Task not started, else `null`. Carried so
   * S-180 need not cross out of this folder.
   */
  readonly dummyReach: number | null
  /** FD-6 / FD-6b of table T-012a in pixels, clamped. The plan's only (FD-6a). */
  readonly fadeInPx: number
  readonly fadeOutPx: number
  /** NL-1 or NL-3 of table T-013. */
  readonly labelPlacement: LabelPlacement
  /**
   * NL-3's left edge; meaningless while `'inside'`.
   * ⛔ Already clears OC-3 / OC-4's room (`markRoomOf`); do not add the marker width again.
   */
  readonly labelX: number
  /** The label after LC-4 cut it to truncateUnits. */
  readonly label: string
  /** FR-077 with FR-094's floors applied; LC-5 measured with it. */
  readonly labelFontSize: number
  /** OC-2's card (FR-090), `''` while S-60 and S-61 hide it. One string, so measured and drawn once. */
  readonly outsideLabel: string
  /** FR-093's estimate of `outsideLabel` at `labelFontSize`. Zero when it is `''`. */
  readonly outsideLabelWidth: number
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
   * Lane tops, indexed by lane, for LF-12 (an empty lane has no placement to rebuild from).
   * ⚠️ Not sorted by y: with ST-5 / S-58 'up' it descends, so draw through lanes by `y`.
   */
  readonly stackTops: readonly number[]
  /**
   * Lifted into FR-098's band. Optional so existing literals compile; `undefined` means not pinned.
   * A pin that did not fit is absent from `rows` altogether (`pinnedBandOf`).
   */
  readonly isPinned?: boolean
}

export interface ScheduleLayout {
  /** S-1 times zoomX (FR-017). */
  readonly pxPerDay: number
  readonly tier: RulerTier
  /** The day the left edge of the Row Area points at (S-77). */
  readonly originDay: CalendarDay | null
  /**
   * Where `originDay` begins -- not the Row Area's edge, which S-177 puts inside
   * that day. Every axis reader goes through this, so the fraction is applied once.
   */
  readonly originX: number
  /** A rectangle's plan height (LF-2, LF-3, LF-12); shape-independent so one row's vertices line up. */
  readonly rectangleHeight: number
  readonly rows: readonly RowPlacement[]
  readonly placements: readonly TaskPlacement[]
  /** Everything drawn, measured with table T-038's occupancy. FR-055 fits to this. */
  readonly contentWidth: number
  readonly contentHeight: number
  /**
   * That extent's left edge (null when nothing was placed), for OP-10's position.
   * An x, because a label's overhang is not whole days; `fitZoom` turns it into S-77's day.
   */
  readonly contentX0: number | null
  /** LF-14's band height (FR-098). Optional; `undefined` reads as zero. */
  readonly pinnedBandHeight?: number
  /** Top of the scrolling remainder, where S-78 / S-176 point (FR-098). Optional; `undefined` reads as `regions.rowArea.y`. */
  readonly scrollAreaY?: number
  /**
   * ST-7's valve: the row that reached it, or `null`. When set, that row and all
   * after it are missing, and the content measures stop before it.
   * Required, unlike the two above: no `undefined` reading is safe, and the telling
   * (`RS-24`) is raised by the shell, not this pure unit (LY-5 of table T-060).
   */
  readonly stackSafetyCapReached: StackSafetyCapStop | null
}

/**
 * ST-7's valve, as a value. Tells the shell which row and cap -- never printed (FR-038).
 * Not on PI-5, for the reason `NotStoredZoom` gives.
 */
export interface StackSafetyCapStop {
  /** The `TaskGroup.id` of the row whose lanes reached `S-89`. */
  readonly groupId: string
  /** `S-89` as it stood in the settings this run was given. */
  readonly cap: number
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/**
 * LC-2's calendar questions, answered once per argument within ONE
 * `layoutFromSchedule` run: each `schedule.ts` call re-parses every Exception
 * date, a measurable share of the NFR-003 frame at MC-7 scale.
 * ⛔ Not a cache: it dies with the run; outliving one needs a Chapter 5.6 record (R2.20).
 */
interface DayReader {
  /** `dayOf`, by the stored text -- which is what the regular expression reads. */
  day(text: string | null): CalendarDay | null
  /** `dateFromWorkingDays`, by the day counted from and the count. */
  walk(from: CalendarDay, workingDays: number): CalendarDay
  /** `nextWorkingDay` (DM-1). Not `walk(from, 1)`, which answers a half-open end bound. */
  after(from: CalendarDay): CalendarDay
}

/**
 * ⚠️ A cached `null` is an answer, not a miss: `Map.get` answers `undefined` for unseen keys.
 *
 * @purity pure
 */
function dayReaderFor(within: WorkingCalendar): DayReader {
  const days = new Map<string, CalendarDay | null>()
  const walks = new Map<string, CalendarDay>()
  const afters = new Map<string, CalendarDay>()
  return {
    day(text: string | null): CalendarDay | null {
      const key = text ?? ''
      const held = days.get(key)
      if (held !== undefined) return held
      const made = dayOf(text)
      days.set(key, made)
      return made
    },
    walk(from: CalendarDay, workingDays: number): CalendarDay {
      // Keyed by `textOfDay`: two equal `CalendarDay` records are not the same key.
      const key = `${textOfDay(from)}/${String(workingDays)}`
      const held = walks.get(key)
      if (held !== undefined) return held
      const made = dateFromWorkingDays(within, from, workingDays)
      walks.set(key, made)
      return made
    },
    after(from: CalendarDay): CalendarDay {
      const key = textOfDay(from)
      const held = afters.get(key)
      if (held !== undefined) return held
      const made = nextWorkingDay(within, from)
      afters.set(key, made)
      return made
    },
  }
}

/**
 * FR-093's unit count, published on PI-5 so FR-006's panel counts the same way.
 *
 * @purity pure
 */
export function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += character.charCodeAt(0) < 0x100 ? 1 : 2
  return units
}

/** LC-5. FR-093's estimate: units times font size times labelCoef. @purity pure */
function labelWidth(text: string, fontSize: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSize * settings.labelCoef
}

/**
 * AT-87's code for a work resource (0 = 材料, 1 = 作業, 2 = 費用).
 * Not imported from `edit-resource.ts` (a use case, table T-062) nor from `schedule.ts` (not on PI-1).
 */
const WORK_RESOURCE = 1

/** AS-2 of table T-225. Not a word (FR-038). */
const NO_ASSIGNEE_MARK = '-'

/**
 * Joins FR-059's first name to the remaining count; no row spells the join, and
 * `+` needs no translation (FR-038).
 * @provisional PND-346
 */
const MORE_ASSIGNEES_MARK = '+'

/** FR-090's percent sign. Not a word (FR-038). */
const PERCENT_MARK = '%'

/**
 * FR-059's assignee label for every Task somebody is on, by Task uid.
 *
 * A Task absent from the map has nobody; the caller applies AS-2 and S-60.
 * Both AT-87's code 2 and AT-88 are read, or a resource one marks as cost is drawn as a person.
 *
 * @purity pure
 */
function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> {
  const resourceByUid = new Map<number, Schedule['resources'][number]>()
  for (const resource of schedule.resources) resourceByUid.set(resource.uid, resource)

  const onTask = new Map<number, { readonly name: string; readonly uid: number }[]>()
  for (const assignment of schedule.assignments) {
    const taskUid = assignment.taskUid
    if (taskUid === null || assignment.resourceUid === null) continue
    const resource = resourceByUid.get(assignment.resourceUid)
    if (resource === undefined) continue
    if (resource.resourceKind !== WORK_RESOURCE) continue
    if (resource.isCostResource === true) continue
    const name = resource.name ?? ''
    if (name === '') continue
    const held = onTask.get(taskUid) ?? []
    held.push({ name, uid: resource.uid })
    onTask.set(taskUid, held)
  }

  const labels = new Map<number, string>()
  for (const [taskUid, held] of onTask) {
    // Not `localeCompare`: a host-dependent collation would show another first name elsewhere.
    held.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.uid - b.uid))
    const first = held[0]!
    labels.set(
      taskUid,
      held.length === 1
        ? first.name
        : `${first.name} ${MORE_ASSIGNEES_MARK}${held.length - 1}`,
    )
  }
  return labels
}

/** FR-090's percent label, `''` for a Task not begun. @purity pure */
function percentLabelOf(task: Task): string {
  if (planActualState(task) === 'notStarted') return ''
  const percent = task.percentComplete
  return percent === null ? '' : `${percent}${PERCENT_MARK}`
}

/** FR-090's separator. Not a word (FR-038). */
const OC2_SEPARATOR = ' : '

/** OC-2's one card (FR-090), joined before LC-7 measures it. @purity pure */
function outsideLabelOf(assignee: string, percent: string): string {
  if (assignee === '') return percent
  if (percent === '') return assignee
  return `${assignee}${OC2_SEPARATOR}${percent}`
}

/**
 * The cut mark (preamble of table T-013): U+2026, the mark `row-title-panel.ts`
 * uses, costing 2 units. Not a word (FR-038).
 */
const TRUNCATION_MARK = '…'
const TRUNCATION_MARK_UNITS = 2

/**
 * LC-4: cut to S-35, mark included (preamble of table T-013). A limit too small
 * for the mark yields nothing; S-35's floor of 4 prevents it.
 *
 * @purity pure
 */
function truncate(text: string, limit: number): string {
  const unitsOf = (ch: string): number => (ch.charCodeAt(0) < 0x100 ? 1 : 2)
  let units = 0
  for (const character of text) units += unitsOf(character)
  if (units <= limit) return text

  const room = limit - TRUNCATION_MARK_UNITS
  let kept = ''
  let taken = 0
  for (const character of text) {
    const next = taken + unitsOf(character)
    if (next > room) break
    taken = next
    kept += character
  }
  return kept + TRUNCATION_MARK
}

/** The height one Task reserves: table T-012's last column, FR-094's floor. @purity pure */
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

/** Table T-012's last column; it also decides whether OC-5 applies. @purity pure */
function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return laidBelow(shapeKind) ? 'below' : 'inside'
}

/**
 * The actual figure's right ink edge. Not `actualX + actualWidth`: a milestone's
 * figure is centred on a zero-width span (LF-10, S-130).
 * One function, because GR-7's marker and OR-1's label must agree on this edge.
 * `planHeightOf` is called, not carried, so it matches `taskGeometryOf`'s figure.
 *
 * @purity pure
 */
function actualReachOf(
  shapeKind: ShapeKind,
  actual: { readonly x: number; readonly width: number },
  settings: DocumentSettings,
): number {
  if (actualPlacementOf(shapeKind) !== 'sideways') return actual.x + actual.width
  return actual.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
}

/**
 * FR-094's plan floor. Written once: `zoomYAtPlanHeightFloor` inverts it, and a
 * second spelling can be an ulp off the zoom the fit lands on.
 *
 * @purity pure
 */
function planHeightFloor(settings: DocumentSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/**
 * The zoomY where bands reach FR-094's floor -- pass 1's zoom (after table
 * T-068), since below it nothing on the row axis moves.
 *
 * @purity pure
 */
function zoomYAtPlanHeightFloor(settings: DocumentSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

/** The plan bar's own height (FR-094). @purity pure */
function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
}

/** The font a bar's label is drawn at: FR-077, with FR-094's separate text floor. @purity pure */
function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

/** LC-3. Which of L-1's four steps the ruler shows (FR-017's test). @purity pure */
export function rulerTierOf(pxPerDay: number, settings: DocumentSettings): RulerTier {
  const scaled = pxPerDay / (settings.rulerFont / settings.fontMin)
  if (scaled >= settings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= settings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= settings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

/** LF-1's week. Not a setting: `S-108` holds which day a week starts, not its length. */
const DAYS_PER_WEEK = 7

/**
 * LF-1: days per tick of the current tier. Year and month ticks are calendar
 * steps the caller walks itself, so they answer 1; no width is read (FR-017).
 *
 * @purity pure
 */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

/**
 * The day at an x (S-77, FR-017); null while no origin is set (OP-10).
 * Reads `layout.originX`, not caller regions, so x -> day -> x cannot drift.
 *
 * @purity pure
 */
export function dateAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const days = Math.floor((x - layout.originX) / layout.pxPerDay)
  const foundAt = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() }
}

/**
 * The one day-to-x formula, taken in pieces because LC-1 to LC-9 need it before
 * the layout exists; `xFromDay` reads the same axis off a finished layout.
 *
 * @purity pure
 */
function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number,
                     day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/**
 * PI-5's `xFromDay`, the inverse of `dateAtX`; the origin's own x while no origin is set.
 *
 * @purity pure
 */
export function xFromDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day)
}

/**
 * FD-6 / FD-6b of table T-012a in pixels, each by its own row until RC-7 settles them.
 * ⛔ FD-5 is enforced here: fade days live on `Task` and survive a shape change,
 * and a fadeless shape must not lose label room.
 *
 * @purity pure
 */
function clampedFade(task: Task, kind: ShapeKind, span: number, pxPerDay: number): {
  readonly fadeIn: number
  readonly fadeOut: number
} {
  if (kind !== 'rectangle' && kind !== 'chevron') return { fadeIn: 0, fadeOut: 0 }
  const asPixels = (days: number | null): number => Math.max(0, (days ?? 0) * pxPerDay)
  const rawIn = asPixels(task.fadeInDays)
  const rawOut = asPixels(task.fadeOutDays)
  if (rawIn + rawOut <= span) return { fadeIn: rawIn, fadeOut: rawOut }
  if (kind === 'chevron') {
    const ratio = span / (rawIn + rawOut)
    return { fadeIn: rawIn * ratio, fadeOut: rawOut * ratio }
  }
  const fadeIn = Math.min(rawIn, span)
  return { fadeIn, fadeOut: Math.min(rawOut, span - fadeIn) }
}

/** LC-1. A row goes when it, or anything above it, is hidden or collapsed. @purity pure */
function drawnGroups(
  schedule: Schedule,
  settings: DocumentSettings,
  isLevelZeroFolded: boolean,
): readonly (TaskGroup & { depth: number })[] {
  // HR-2: a folded level 0 (S-211, held by the shell) takes every row.
  if (isLevelZeroFolded) return []
  const byId = new Map(schedule.taskGroups.map((glyph) => [glyph.id, glyph]))
  const drawnRows: (TaskGroup & { depth: number })[] = []

  for (const group of schedule.taskGroups) {
    let depth = 1
    let dropped = group.isHidden === true
    // HR-1a and HR-6 do not re-parent what they hide, so walking up settles it.
    for (let foundAt = group.parentId, guard = 0; foundAt !== null && guard <= settings.maxGroupDepth; guard++) {
      const parent = byId.get(foundAt)
      if (parent === undefined) break
      depth += 1
      if (parent.isHidden === true || parent.isCollapsed === true) dropped = true
      foundAt = parent.parentId
    }
    if (!dropped) drawnRows.push({ ...group, depth })
  }
  return inTreeOrder(drawnRows, byId)
}

/**
 * LC-9's tree order (note after table T-068), siblings by AT-55. A missing
 * parent makes a root; cycle-unreachable rows are appended, since LC-1 already decided membership.
 *
 * @purity pure
 */
function inTreeOrder<T extends TaskGroup & { depth: number }>(
  rows: readonly T[], byId: ReadonlyMap<string, TaskGroup>,
): readonly T[] {
  const childrenOf = new Map<string | null, T[]>()
  for (const row of rows) {
    const parent = row.parentId !== null && byId.has(row.parentId) ? row.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [row])
    else siblings.push(row)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const ordered: T[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null): void => {
    for (const row of childrenOf.get(parent) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      ordered.push(row)
      walk(row.id)
    }
  }
  walk(null)
  for (const row of rows) if (!seen.has(row.id)) ordered.push(row)
  return ordered
}

/** LC-2, the group half (FR-018). Depth 1 is never a candidate. @purity pure */
export function groupDepthLimit(settings: DocumentSettings): number {
  let limit = 1
  for (let depth = 2; depth <= settings.maxGroupDepth; depth++) {
    if (settings.zoomY >= groupDepthThresholdOf(depth, settings)) limit = depth
  }
  return limit
}

/**
 * FR-018's threshold for a depth of two or more (S-87, S-88); on PI-5 for HF-14.
 * ⛔ Never retype it: the fit lands zoomY on it and `groupDepthLimit` reads it
 * back, so an ulp apart draws one depth shallower.
 *
 * @purity pure
 */
export function groupDepthThresholdOf(depth: number, settings: DocumentSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
}

/**
 * Takes the index, not the `Schedule`: a per-Task scan of `taskVisuals` is O(n^2) (NFR-013).
 *
 * @purity pure
 */
function shapeKindOf(visualByUid: ReadonlyMap<number, TaskVisual>, task: Task): ShapeKind {
  const kind = visualByUid.get(task.uid)?.shapeKind ?? null
  // AT-100: a null resolves through Task.milestone, which AT-30 calls the truth.
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}

/** AT-101's figure, or its generated default. @purity pure */
function milestoneGlyphOf(
  visualByUid: ReadonlyMap<number, TaskVisual>,
  task: Task,
): MilestoneGlyph {
  return visualByUid.get(task.uid)?.milestoneGlyph ?? COLUMN_DEFAULTS.TaskVisual.milestoneGlyph
}

/**
 * The date span in pixels, before widening.
 * ⚠️ This file's own definition (finish day excluded): table T-221 and no
 * requirement fix the plan bar's extent, so it awaits a change request.
 *
 * @purity pure
 */
function spanWidthOf(task: Task, pxPerDay: number, reader: DayReader): number {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return 0
  return Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay
}

/**
 * Whether the plan's two ends stand on one day (closing rule of table T-023d).
 * A day, not a width: S-49's floor hides it in pixels, and the rule forbids a zoom-dependent boundary.
 * Not `spanWidthOf(...) === 0`, which is also 0 for a Task naming no dates.
 *
 * @purity pure
 */
function planEndsStandOnOneDay(task: Task, reader: DayReader): boolean {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return false
  return serialOf(from) === serialOf(toDay)
}

/**
 * The drawn width the task LOD reads (FR-018, S-86). A milestone's is its LF-10
 * side; its zero span would drop it at every zoom.
 *
 * @purity pure
 */
function shapeWidthOf(
  spanWidth: number,
  shapeKind: ShapeKind,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') return planHeightOf(shapeKind, settings)
  // FR-001: a Task of zero duration is still a Task, drawn at S-49.
  return Math.max(spanWidth, settings.minShapeWidth)
}

/**
 * Whether the task LOD keeps this Task (FR-018's exemptions); a Task with no
 * dates has no span either, so it is exempt too.
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
 * RV-1 in pixels, or null without an actual; working days are counted by
 * `Schedule` (note after table T-069).
 *
 * @purity pure
 */
function actualSpanOf(
  task: Task,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): { readonly x: number; readonly width: number } | null {
  const from = reader.day(task.actualStart)
  if (from === null) return null
  const toDay = reader.walk(from, task.actualDuration ?? 0)
  return {
    x: xOnTimeAxis(originSerial, pxPerDay, originX, from),
    width: Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay,
  }
}

/**
 * DM-3's dummy width, also its hold (OR-3 of table T-243).
 * S-180 is generated here too: reading it from ScheduleGeometry would be LR-3's cycle.
 * ⛔ A function, not a `const`: the generated block at the foot is in its temporal dead zone on import.
 *
 * @purity pure
 */
function dummyGrabWidthPx(pxPerDay: number): number {
  return Math.min(pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
}

/**
 * Turns `dummyReachOf`'s negative infinity (no dummy) into null for `TaskPlacement.dummyReach`.
 *
 * @purity pure
 */
function finiteOrNull(reach: number): number | null {
  return Number.isFinite(reach) ? reach : null
}

/**
 * The dummy's right ink edge (= its hold, closing rule of table T-023d), or
 * negative infinity when none is drawn so `Math.max` needs no test.
 * A milestone's DM-9 square reaches as far as `actualReachOf`'s figure, so the
 * marker does not move when an actual is entered.
 *
 * @purity pure
 */
function dummyReachOf(
  task: Task,
  shapeKind: ShapeKind,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
  settings: DocumentSettings,
): number {
  const start = reader.day(task.start)
  // FR-013 / FR-043: no planned start, no dummy.
  if (start === null) return Number.NEGATIVE_INFINITY
  // DM-1 (next working day), DM-3 (column's left edge).
  const inkX = xOnTimeAxis(originSerial, pxPerDay, originX, reader.after(start))
  // DM-7 / DM-9: `dummiesOf` centres the milestone square on `inkX`.
  if (actualPlacementOf(shapeKind) === 'sideways') {
    return inkX + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
  }
  return inkX + dummyGrabWidthPx(pxPerDay)
}

/**
 * The room for OC-3 / OC-4, held clear whether drawn or not (paragraph after
 * table T-243); ⛔ so it never reads `progressMarkerVisible`.
 * Mirrors `markerOf` / `resumeOf` (S-22, S-23, S-26, S-27). S-25 is left out:
 * it only shrinks the icon, and a varying room would move labels per Task.
 *
 * @purity pure
 */
function markRoomOf(settings: DocumentSettings): number {
  const side = settings.markerSize
  const resumeReach = side * (settings.resumeArmOfMarker + settings.resumeHeadOfMarker)
  return settings.markerGap + side + settings.markerGap + resumeReach
}

/** HF-1's two ranks of row controls. Not generated: no row of table T-206 holds the count. */
const ROW_CONTROL_LATTICE_RANKS = 2

/**
 * LF-3 / HF-19's band floor, held by this unit because a floor passed in is
 * lost when a caller passes nothing. A function for `dummyGrabWidthPx`'s reason.
 *
 * @purity pure
 */
function rowControlLatticeFloorPx(): number {
  return NOT_STORED_ROW_CONTROL_OUTER_SIZES.rowControlOuterHeightPx * ROW_CONTROL_LATTICE_RANKS
}

/**
 * Runs LC-1 to LC-9 of table T-068, in that order, once.
 *
 * `groupDepthCap` is for `fitZoom` alone: pass 1 needs every depth at the floor
 * zoom, where `zoomY` cannot ask for them. Other callers omit it to get FR-018's depth.
 * @provisional PND-206
 *
 * `isLevelZeroFolded` is S-211; absent reads as not folded.
 *
 * `rowControlsHeightPx` is a measured lattice that can only RAISE the floor
 * (HF-6 leaves the gap unstated); below it the lattice is wrong, and HF-19 forbids shrinking.
 *
 * @purity pure
 */
export function layoutFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): ScheduleLayout {
  // ---- LC-3 first, because LC-2's task half needs the width of one day -----
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const originSerial = originDay === null ? 0 : serialOf(originDay)
  // ---- S-177: the left edge stands this far INTO `scrollDate`'s own day ----
  // Applied as it stands, not walked (OP-10a): every day is `pxPerDay` wide, so
  // 1.3 days is the next day plus 0.3. Ignored without a day; OP-10 fits that case.
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)

  // ---- LC-1, then LC-2's group half ---------------------------------------
  // The cap replaces the zoom-derived limit, not bounds it, or pass 1 could not
  // reach depths above the floor zoom. S-125 still caps both.
  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
  // Pinned rows skip the depth limit (FR-018, FR-098); folds and hides still apply (`drawnGroups`).
  const pinnedIds = new Set(settings.pinnedGroupIds)
  const rows = drawnGroups(schedule, settings, isLevelZeroFolded === true).filter(
    (glyph) => glyph.depth <= depthLimit || pinnedIds.has(glyph.id),
  )

  // Indexes built once: per-row / per-Task scans would be O(n^2) (NFR-013), run
  // every frame (MN-6 of table T-070).
  const taskByUid = new Map(schedule.tasks.map((text) => [text.uid, text]))
  const visualByUid = new Map(schedule.taskVisuals.map((value) => [value.taskUid, value]))
  const membersByGroup = new Map<string, TaskGroupMember[]>()
  for (const member of schedule.taskGroupMembers) {
    // Source order is kept; ST-2's sort below decides what order means.
    const groupMembers = membersByGroup.get(member.groupId)
    if (groupMembers === undefined) membersByGroup.set(member.groupId, [member])
    else groupMembers.push(member)
  }
  const assigneeLabels = assigneeLabelsOf(schedule)

  // FR-054: one calendar for the whole document, resolved once.
  const within = workingCalendarOf(schedule)
  // Made here only, so it lives and dies with this call (`DayReader`).
  const reader = dayReaderFor(within)
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  // Rows are laid from the Row Area top and slid at the end: S-78's row can only
  // be put at the top once the rows above it are measured.
  let y = regions.rowArea.y
  // Infinite sentinels, not 0: seeding at 0 would stretch the width to x = 0
  // whenever all content sits left of the origin (a late S-77).
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = reservedHeight('rectangle', settings)
  let capStop: StackSafetyCapStop | null = null

  for (const row of rows) {
    // ---- LC-2, the task half: FR-018 measures the shape, not the depth -----
    // Kind, span and width resolved once per Task; the filter and measuring both need them.
    const drawnTasks = (membersByGroup.get(row.id) ?? [])
      .map((match) => taskByUid.get(match.taskUid))
      .filter((text): text is Task => text !== undefined)
      .map((task) => {
        const kind = shapeKindOf(visualByUid, task)
        const span = spanWidthOf(task, pxPerDay, reader)
        const glyph = milestoneGlyphOf(visualByUid, task)
        const oneDay = planEndsStandOnOneDay(task, reader)
        return { task, kind, glyph, span, oneDay, width: shapeWidthOf(span, kind, settings) }
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
    // Per-lane extremes let ST-3 skip rescanning a lane; otherwise m non-overlapping
    // Tasks cost O(m^2) (NFR-013, PG-8).
    const laneMaxX1: number[] = []
    const laneMinX0: number[] = []
    const laneOf: number[] = []
    const measured = drawnTasks.map(({ task, kind, glyph, oneDay, width }) => {
      const from = reader.day(task.start)
      const foundAt = from === null ? originX : xOnTimeAxis(originSerial, pxPerDay, originX, from)
      // LF-10 centres a milestone's figure on its day; every other shape
      // starts at it.
      const x = kind === 'milestone' ? foundAt - width / 2 : foundAt
      // ---- LC-4, LC-5, LC-6: cut, estimate, then table T-013 -------------
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      // ---- LC-6: room is the shape less both clamped fades (after table T-013)
      const fade = clampedFade(task, kind, width, pxPerDay)
      const roomInside = Math.max(0, width - fade.fadeIn - fade.fadeOut)
      const placement: LabelPlacement = text <= roomInside ? 'inside' : 'right'
      const actual = actualSpanOf(task, reader, originSerial, pxPerDay, originX)
      // ---- OR-1 of table T-243: what the name label has to clear -----------
      // The marker hangs off the actual or the dummy (`markerAnchorX`), so the
      // label clears the furthest of plan, actual and dummy.
      // Taken unconditionally: `planActualDisplay` only narrows the anchor, and a
      // label further out still overlaps nothing.
      const actualReach = actual === null ? null : actualReachOf(kind, actual, settings)
      // No dummy where there is an actual (FR-043), so `null` means none drawn.
      const dummyReach =
        actualReach !== null
          ? null
          : finiteOrNull(
              dummyReachOf(task, kind, reader, originSerial, pxPerDay, originX, settings),
            )
      const outwardX = Math.max(x + width, actualReach ?? dummyReach ?? Number.NEGATIVE_INFINITY)
      // ---- LC-7: OC-1, past the held room (`markRoomOf`) and S-32 ---------
      const labelX = outwardX + markRoomOf(settings) + settings.labelGap
      const labelledX1 = placement === 'right' ? labelX + text : x + width
      // ---- LC-7: OC-5 -----------------------------------------------------
      // Not conditioned on `planActualDisplay`: a toggle must not move a Task (table T-038).
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      // ---- LC-7: OC-2, only while S-60 / S-61 show it ----------------------
      const assigneeLabel = settings.assigneeVisible
        ? (assigneeLabels.get(task.uid) ?? NO_ASSIGNEE_MARK)
        : ''
      const percentLabel = settings.percentCompleteVisible ? percentLabelOf(task) : ''
      const outsideLabel = outsideLabelOf(assigneeLabel, percentLabel)
      const outsideLabelWidth = labelWidth(outsideLabel, font, settings)
      // One card, one S-32 gap (FR-090).
      const outsideWidth = outsideLabel === '' ? 0 : settings.labelGap + outsideLabelWidth
      const labelledX0 = x - outsideWidth
      const occupiedX0 = spread === null ? labelledX0 : Math.min(labelledX0, spread.x)
      const occupiedX1 =
        spread === null ? labelledX1 : Math.max(labelledX1, spread.x + spread.width)
      return { task, kind, glyph, oneDay, x, width, label, font, placement, actual, labelX,
               actualReach, dummyReach, fade, outsideLabel, outsideLabelWidth,
               occupiedX0, occupiedX1 }
    })

    for (const item of measured) {
      // ---- LC-8, ST-3: the shallowest lane it does not overlap (ST-10 half-open)
      let lane = -1
      for (let step = 0; step < lanes.length; step++) {
        // Shortcut when the item clears the whole lane; ST-2's order makes it hit
        // almost always. The exact scan below still decides otherwise.
        if (item.occupiedX0 >= laneMaxX1[step]! || item.occupiedX1 <= laneMinX0[step]!) {
          lane = step
          break
        }
        if (lanes[step]!.every((quoted) => item.occupiedX1 <= quoted.x0 || item.occupiedX0 >= quoted.x1)) {
          lane = step
          break
        }
      }
      if (lane < 0) {
        // ---- ST-7: stop before this row is placed ---------------------------
        // ⛔ Breaking here keeps the row and all after it out whole; a partial
        // row would leave `laneOf` shorter than `measured`, which the heights below index.
        // @provisional PND-430
        if (lanes.length >= settings.stackSafetyCap) {
          capStop = { groupId: row.id, cap: settings.stackSafetyCap }
          break
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
    // The inner loop only leaves early for the valve. A flag, not a label: no label is used elsewhere.
    if (capStop !== null) break

    // ---- LC-9, LF-2: each lane is its tallest, gaps go between them -------
    // One pass: per-lane filtering is O(n^2) when Tasks overlap (NFR-013), and
    // spreading a huge lane into Math.max throws RangeError.
    const laneHeights = lanes.map(() => 0)
    measured.forEach((item, index) => {
      const reserved = reservedHeight(item.kind, settings)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    // LF-2's empty-lane arm; unreachable today (lanes open only for a Task), kept because LF-2 states it.
    for (let step = 0; step < laneHeights.length; step++) {
      if (laneHeights[step] === 0) laneHeights[step] = emptyLane
    }
    const stacked = laneHeights.reduce((sum, h) => sum + h + settings.stackGap, 0)
    const packed = Math.max(0, stacked - settings.stackGap)
    // FR-042's stated height and LF-3's floors are all lower bounds.
    const latticeFloor = Math.max(rowControlLatticeFloorPx(), rowControlsHeightPx ?? 0)
    const height = Math.max(packed, emptyLane, row.height ?? 0, latticeFloor)

    // ---- LC-9, ST-5: stackDirection (S-58) picks which end lane 0 sits at --
    // ⚠️ ST-5 / S-58 do not say which end; taken here: 'down' puts lane 0 at the
    // top, 'up' at the bottom. Lane assignment is unchanged either way.
    // ⚠️ The stack stays top-anchored; docs/spec does not place FR-042's extra slack.
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
        planEndsStandOnOneDay: item.oneDay,
        fadeInPx: item.fade.fadeIn,
        fadeOutPx: item.fade.fadeOut,
        y: tops[lane]!,
        height: reservedHeight(item.kind, settings),
        planHeight: planHeightOf(item.kind, settings),
        actualPlacement: actualPlacementOf(item.kind),
        actualX: item.actual === null ? null : item.actual.x,
        actualWidth: item.actual === null ? 0 : item.actual.width,
        actualReach: item.actualReach,
        dummyReach: item.dummyReach,
        labelPlacement: item.placement,
        labelX: item.labelX,
        label: item.label,
        labelFontSize: item.font,
        outsideLabel: item.outsideLabel,
        outsideLabelWidth: item.outsideLabelWidth,
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
      // A lane-less row still gives LF-12 one height (LF-2).
      stackTops: tops.length === 0 ? [y] : tops,
    })
    // ---- LC-9, LF-3 ------------------------------------------------------
    y += height + settings.rowGap
  }

  // ---- FR-098 with LF-14: lift the pinned rows out of the chain ------------
  const band = pinnedBandOf(rowPlacements, settings, regions)
  const lifted = liftedRows(rowPlacements, band)
  const shifted = shiftedPlacements(placements, band.shiftByGroupId, band.droppedPinnedIds)

  // ---- S-78 / S-176: over the scrolling rows, from the remainder's top (FR-098)
  const scrollingRows = lifted.filter((row) => row.isPinned !== true)
  const scrollOffsetY = scrollOffsetOf(scrollingRows, settings, band.scrollAreaY)
  // Measured before the slide, and over the scrolling rows only: FR-055 fits
  // them to LF-14's remainder, which the band is not in.
  const contentHeight = Math.max(0, band.scrollingContentHeight)
  const nothingPlaced = leftmost === Number.POSITIVE_INFINITY
  const contentWidth = nothingPlaced ? 0 : Math.max(0, widest - leftmost)
  const contentX0 = nothingPlaced ? null : leftmost

  return {
    pxPerDay,
    tier: rulerTierOf(pxPerDay, settings),
    originDay,
    originX,
    rectangleHeight: planHeightOf('rectangle', settings),
    rows: scrolledRows(lifted, scrollOffsetY),
    placements: scrolledPlacements(shifted, scrollOffsetY, band.pinnedIdsPlaced),
    contentWidth,
    contentHeight,
    contentX0,
    pinnedBandHeight: band.height,
    scrollAreaY: band.scrollAreaY,
    stackSafetyCapReached: capStop,
  }
}

/**
 * LF-14 / FR-098: row positions after lifting pinned rows out of LF-3's chain.
 * Done here, not in the renderers: both sides read this one array, so they cannot disagree.
 *
 * The band follows `pinnedGroupIds` (S-126), not the document order `rowPlacements` arrives in.
 * "入りきらない" is read as "not ENTIRELY inside" (-きる), tested on the row's
 * own band; `rowGap` belongs to neither row.
 * The first pin that does not fit ends the band: admitting a later short one
 * would rank it above an earlier pin (FR-098). A dropped pin is not put back in the chain.
 *
 * @purity pure
 */
function pinnedBandOf(
  rowPlacements: readonly RowPlacement[],
  settings: DocumentSettings,
  regions: ScreenRegions,
): {
  readonly height: number
  readonly scrollAreaY: number
  readonly scrollingContentHeight: number
  readonly pinnedIdsPlaced: ReadonlySet<string>
  /** Pins on placed rows cut by the Row Area's bottom edge (FR-098); disjoint from `pinnedIdsPlaced`. */
  readonly droppedPinnedIds: ReadonlySet<string>
  readonly shiftByGroupId: ReadonlyMap<string, number>
} {
  const placedById = new Map(rowPlacements.map((row) => [row.groupId, row] as const))
  // S-126's order, over placed rows only: a pin under a fold or hide lifts nothing.
  const banded: RowPlacement[] = []
  const seen = new Set<string>()
  for (const groupId of settings.pinnedGroupIds) {
    if (seen.has(groupId)) continue
    const row = placedById.get(groupId)
    if (row === undefined) continue
    seen.add(groupId)
    banded.push(row)
  }

  const shiftByGroupId = new Map<string, number>()
  const inBand = new Set<string>()
  const dropped = new Set<string>()
  const rowAreaBottom = regions.rowArea.y + regions.rowArea.height
  let bandY = regions.rowArea.y
  for (const row of banded) {
    if (dropped.size > 0 || bandY + row.height > rowAreaBottom) {
      dropped.add(row.groupId)
      continue
    }
    shiftByGroupId.set(row.groupId, bandY - row.y)
    inBand.add(row.groupId)
    bandY += row.height + settings.rowGap
  }
  const height = Math.max(0, bandY - regions.rowArea.y - settings.rowGap)
  // `inBand`, not `banded`: with every pin dropped there is no band and no gap (LF-14).
  const scrollAreaY = regions.rowArea.y + (inBand.size === 0 ? 0 : height + settings.rowGap)

  let scrollY = scrollAreaY
  for (const row of rowPlacements) {
    // `seen`, not `inBand`: a dropped pin does not return as a scrolling row.
    if (seen.has(row.groupId)) continue
    shiftByGroupId.set(row.groupId, scrollY - row.y)
    scrollY += row.height + settings.rowGap
  }
  const scrollingContentHeight = Math.max(0, scrollY - scrollAreaY - settings.rowGap)

  return {
    height,
    scrollAreaY,
    scrollingContentHeight,
    pinnedIdsPlaced: inBand,
    droppedPinnedIds: dropped,
    shiftByGroupId,
  }
}

/**
 * Rows at `pinnedBandOf`'s heights, without the dropped pins (FR-098).
 * Dropped, not flagged: every reader draws what it is handed, and each would have to re-judge a flag.
 *
 * @purity pure
 */
function liftedRows(
  rowPlacements: readonly RowPlacement[],
  band: {
    readonly pinnedIdsPlaced: ReadonlySet<string>
    readonly droppedPinnedIds: ReadonlySet<string>
    readonly shiftByGroupId: ReadonlyMap<string, number>
  },
): readonly RowPlacement[] {
  const kept = rowPlacements.filter((row) => !band.droppedPinnedIds.has(row.groupId))
  return kept.map((row) => {
    const shift = band.shiftByGroupId.get(row.groupId) ?? 0
    const isPinned = band.pinnedIdsPlaced.has(row.groupId)
    if (shift === 0 && !isPinned) return row
    return {
      ...row,
      y: row.y + shift,
      stackTops: row.stackTops.map((top) => top + shift),
      isPinned,
    }
  })
}

/**
 * Task figures moved with their rows (FR-098); a dropped pin's figures are
 * removed too, or they float over the scrolling rows.
 *
 * @purity pure
 */
function shiftedPlacements(
  placements: readonly TaskPlacement[],
  shiftByGroupId: ReadonlyMap<string, number>,
  droppedPinnedIds: ReadonlySet<string>,
): readonly TaskPlacement[] {
  const kept = placements.filter((one) => !droppedPinnedIds.has(one.groupId))
  return kept.map((one) => {
    const shift = shiftByGroupId.get(one.groupId) ?? 0
    return shift === 0 ? one : { ...one, y: one.y + shift }
  })
}

/**
 * The slide that puts S-78 / S-176 at the Row Area's top -- the vertical S-77 / S-177.
 *
 * OP-10a's out-of-range fraction walks whole rows (rows differ in height, so
 * not distance-preserving); idempotent, and it stops at the stack's end (OP-10 is the shell's).
 * An id this pass did not draw (FR-018, HR-1a) matches no rule: the stack is not slid.
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
  // S-176's slab. ⛔ `rowAnchorAt` (input-command-translator.ts) inverts this
  // with the same denominator; change both or the pan lands elsewhere.
  const below = rows[landedAt + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  return row.y + (held - carriedRows) * slab - rowAreaY
}

/**
 * The rows, slid up by S-78's offset; untouched at offset 0.
 *
 * @purity pure
 */
function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] {
  if (offsetY === 0) return rows
  return rows.map((row) => {
    // A pinned row does not slide (FR-098).
    if (row.isPinned === true) return row
    return {
      ...row,
      y: row.y - offsetY,
      stackTops: row.stackTops.map((top) => top - offsetY),
    }
  })
}

/**
 * The placements, slid with their rows; a pinned row's stay put, as in `scrolledRows`.
 *
 * @purity pure
 */
function scrolledPlacements(
  placements: readonly TaskPlacement[],
  offsetY: number,
  pinnedIdsPlaced: ReadonlySet<string>,
): readonly TaskPlacement[] {
  if (offsetY === 0) return placements
  return placements.map((one) =>
    pinnedIdsPlaced.has(one.groupId) ? one : { ...one, y: one.y - offsetY },
  )
}

/** Where one Task ended up, or null when this zoom does not draw it. @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((part) => part.taskUid === taskUid) ?? null
}

/**
 * FR-055's answer: two zooms and a position as a day and a `TaskGroup.id`
 * (OP-10; S-77, S-78; not px, FR-080).
 * No S-176 / S-177 members: the fit's fractions are always zero, and the callers
 * (`fitCommand`, `viewSettings`) write that zero so an old pan fraction cannot shift the fit.
 */
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  /** S-77. */
  readonly scrollDate: string | null
  /** S-78. A `TaskGroup.id`, never a row number. */
  readonly scrollGroupId: string | null
  /**
   * The FR-094 floor zoom. `zoomY` may land below it, so a caller wanting the
   * drawn zoom takes `Math.max(zoomY, floorZoomY)`.
   */
  readonly floorZoomY: number
}

/**
 * S-96 / S-97 / S-98, kept out of the document (table T-206) and passed in, as
 * `InputContext.zoomStep` is, since only the Framework holds current values (LY-5).
 * Not on PI-5: table T-064 names components and leaves signature-only types to `src/`.
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
 * The smallest zoomY drawing a chosen depth -- FR-055's landing, read back by
 * `groupDepthLimit` through the same expression.
 * Depth 1 has no threshold (FR-018), so it takes one S-53 notch below depth 2:
 * the largest zoom that stays at depth 1, one press from depth 2. A choice, not FR-055's.
 * @provisional PND-204
 *
 * @purity pure
 */
function landingZoomY(depth: number, settings: DocumentSettings, step: number): number {
  if (depth <= 1) return groupDepthThresholdOf(2, settings) / step
  return groupDepthThresholdOf(depth, settings)
}

/**
 * The fit's sweep depth: the deepest drawn row, capped at S-125 because
 * `groupDepthLimit` never answers deeper.
 *
 * @purity pure
 */
function deepestDrawnDepth(schedule: Schedule, settings: DocumentSettings): number {
  let deepest = 0
  // Level 0's fold is ignored: the fit discards folds (HF-8).
  for (const row of drawnGroups(schedule, settings, false)) {
    if (row.depth > deepest) deepest = row.depth
  }
  return Math.min(deepest, settings.maxGroupDepth)
}

/** FR-016's range, applied to one measured zoom. @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  return Math.min(zoom.max, Math.max(zoom.min, value))
}

/**
 * FR-055's fit: two zooms and a position.
 *
 * Runs its own layouts rather than scaling a finished one: below FR-094's floor
 * a ratio is constant, so repeated presses would only shed rows.
 * Reads no zoom in force, so asking twice answers the same (FR-018 excludes IC-10 from repeat).
 *
 * Steps (FR-055, passes after table T-068):
 *   (a) one run at unity settles the horizontal;
 *   (b) pass 1 runs every depth at the floor zoom and takes the deepest that fits, or 1;
 *   (c) the vertical lands on that depth's smallest zoom;
 *   (d) pass 2 runs only above the floor, retreating one depth if it does not fit.
 *
 * Horizontal at unity, not the stored zoomX: lane count depends on zoomX, and
 * measuring at the fit's own output would recur. Unity drops nothing via S-86.
 * @provisional PND-203
 *
 * The horizontal is clamped so the picture measured is the one drawn (CM-71);
 * the vertical is not, since a clamp would move it off its depth's threshold.
 * @provisional PND-205
 *
 * FR-055's MAY (fall back on today for a null position) is not taken: no clock in pure code.
 * A held `scrollGroupId` naming an undrawn row is not OP-10's case and gets no invented answer.
 *
 * @purity pure
 */
export function fitZoom(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoom: NotStoredZoom,
  rowControlsHeightPx?: number,
): FitToScreen {
  const floorZoomY = zoomYAtPlanHeightFloor(settings)
  const deepest = deepestDrawnDepth(schedule, settings)
  // The same row-control floor the frame draws with, or bands measure short and
  // a depth that does not fit is chosen.
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(
      schedule, { ...settings, zoomX, zoomY }, regions, cap, undefined, rowControlsHeightPx,
    )

  // ---- (a) the horizontal, measured once at unity --------------------------
  const atUnity = runAt(1, floorZoomY, deepest)
  // FR-055's empty-document arm, read as "no row" (an empty row has LF-2's band).
  // A run stopped by ST-7 on its first row is not empty: it carries on to depth 1
  // with the position kept, and the drawn picture reports the valve.
  if (atUnity.rows.length === 0 && atUnity.stackSafetyCapReached === null) {
    return {
      zoomX: 1,
      zoomY: 1,
      scrollDate: settings.scrollDate,
      scrollGroupId: settings.scrollGroupId,
      floorZoomY,
    }
  }
  // Rows but no drawn Task leaves nothing to divide by on this axis alone.
  const zoomX =
    atUnity.contentWidth <= 0
      ? 1
      : clampedZoom(regions.rowArea.width / atUnity.contentWidth, zoom)

  // ---- (b) pass 1: every depth the document has, at the floor zoom ---------
  // Every depth, so (d)'s retreat needs no third pass; at most S-125 runs per press.
  const atFloor: ScheduleLayout[] = []
  for (let cap = 1; cap <= deepest; cap++) atFloor.push(runAt(zoomX, floorZoomY, cap))
  // Against the remainder below the band (FR-055, LF-14); each run has its own band.
  const fits = (run: ScheduleLayout): boolean => {
    // A run stopped by ST-7 never fits: its height is unmeasured, and depth 1 is
    // the safest fallback. No row or PND states this reading yet.
    if (run.stackSafetyCapReached !== null) return false
    const remainderTop = run.scrollAreaY ?? regions.rowArea.y
    return run.contentHeight <= regions.rowArea.y + regions.rowArea.height - remainderTop
  }
  // Deepest first; depth 1 when none fits, leaving the vertical scroll standing.
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
    // Only above FR-094's floor can the picture still grow with the zoom.
    const atLanding = runAt(zoomX, zoomY, depth)
    if (fits(atLanding) || depth === 1) {
      chosen = atLanding
    } else {
      depth -= 1
      zoomY = landingZoomY(depth, settings, zoom.step)
      // Position from the retreated depth's floor run (an exact run would be a
      // third pass): `scrollGroupId` is exact, `scrollDate` may be late by at most
      // half a milestone figure (LF-10), since LC-6 puts no label on the left.
      // @provisional PND-207
      chosen = atFloor[depth - 1]!
    }
  }

  // ---- (e) the position, off the run that was chosen -----------------------
  // Through `dateAtX`, so x -> day cannot drift from day -> x.
  const leftDay = chosen.contentX0 === null ? null : dateAtX(chosen, chosen.contentX0)
  return {
    zoomX,
    zoomY,
    scrollDate: leftDay === null ? settings.scrollDate : textOfDay(leftDay),
    // The first scrolling row is the top one however far slid; never a banded row (FR-098).
    scrollGroupId:
      chosen.rows.find((row) => row.isPinned !== true)?.groupId ?? settings.scrollGroupId,
    floorZoomY,
  }
}

/**
 * PI-5's `rowPlacesAtZoomY` for FR-016: rows at a candidate zoomY, via the
 * second run table T-068 allows (the row axis is not linear in zoomY).
 * `zoomX` is untouched: MK-4 moves one axis, and lanes depend on the horizontal.
 * The caller's anchor stays in the settings, so rows come back at their drawn y.
 * No `groupDepthCap`: this wants FR-018's own depth at that zoom.
 *
 * @purity pure
 */
export function rowPlacesAtZoomY(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoomY: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): readonly RowPlacement[] {
  return layoutFromSchedule(
    schedule,
    { ...settings, zoomY },
    regions,
    undefined,
    isLevelZeroFolded,
    rowControlsHeightPx,
  ).rows
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * A value table T-206 states across more than one row, summed once
 * here so that no unit adds it up for itself.
 *
 * ⭐ The member is NAMED rather than keyed by a row ID, which every
 * other generated block of table T-206 is: no single row holds this
 * number, so no row ID would be an honest name for it.
 *
 * ⚠️ This unit holds the sum rather than being handed it because the
 * rule is its own to keep: LF-3 of table T-221 (MUST) makes the
 * lattice's height a floor under the band this unit decides, and
 * HF-19 of table T-051 (MUST NOT) lets no band fall below it. A rule
 * that only holds when a caller remembers to pass something is not a
 * rule. ⭐ A measured lattice is still taken where one arrives -- it
 * is what shows the drawn lattice leaving the two rows below -- and
 * it can only ever RAISE the band, never lower it past this floor.
 * ⛔ Neither term is a document setting and neither may become one:
 * table T-206 is where the specification records that the document
 * does not keep them, and the note on S-138 keeps the size off the
 * reader's own text size (FR-039) as well.
 */
export const NOT_STORED_ROW_CONTROL_OUTER_SIZES: {
  /** S-138 + S-141 x 2, in px */
  readonly rowControlOuterHeightPx: number
} = {
  rowControlOuterHeightPx: 24,
}

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

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it, and EP-14
 * of table T-076 keeps the dummy out of the exported picture without
 * reserving its place -- so a reader handed this document sees the
 * same picture whatever this value is.
 */
export const NOT_STORED_DUMMY_SIZES: {
  /** S-180, in px */
  readonly 'S-180': number
} = {
  'S-180': 30,
}
// </generated>

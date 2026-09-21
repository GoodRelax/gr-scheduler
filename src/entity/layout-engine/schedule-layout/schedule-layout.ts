// ScheduleLayout -- the time axis, label widths, row placing, level of detail and the fit.
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_DEFAULTS,
  actualLastDay,
  dateFromWorkingDays,
  dayOf,
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
import {
  displayRatioOf,
  drawnSettingsOf,
  rowControlLatticeFloorPx,
  type ScreenRegions,
} from '../screen-regions/screen-regions'

// see L-1
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

// see LP-1, LP-2
export type LabelPlacement = 'inside' | 'right'

export type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

// see T-012, AT-100
export type ShapeKind = 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone'

export interface TaskPlacement {
  readonly taskUid: number
  readonly groupId: string
  readonly shapeKind: ShapeKind
  readonly milestoneGlyph: MilestoneGlyph
  readonly stack: number
  readonly x: number
  readonly width: number
  readonly planEndsStandOnOneDay: boolean
  readonly y: number
  readonly height: number
  readonly planHeight: number
  readonly actualPlacement: 'inside' | 'below' | 'sideways'
  readonly actualX: number | null
  readonly actualWidth: number
  // TRAP: not actualX + actualWidth: a milestone's figure is centred on a zero-width span.
  readonly actualReach: number | null
  readonly dummyReach: number | null
  readonly fadeInPx: number
  readonly fadeOutPx: number
  // TRAP: the lane marker, whatever is shown; the drawn one follows RF-1 and reads the toggles itself.
  readonly markerAnchorX: number | null
  readonly labelPlacement: LabelPlacement
  // TRAP: already past the marker and a PA-4 icon; do not add them again.
  readonly labelX: number
  readonly label: string
  readonly labelTextWidth: number
  readonly labelFontSize: number
  readonly outsideLabel: string
  readonly outsideLabelWidth: number
  readonly occupiedX0: number
  readonly occupiedX1: number
}

export interface RowPlacement {
  readonly groupId: string
  readonly depth: number
  readonly y: number
  readonly height: number
  readonly stackCount: number
  // TRAP: indexed by lane, not sorted by y: with S-58 'up' it descends.
  readonly stackTops: readonly number[]
  readonly isPinned?: boolean
}

export interface ScheduleLayout {
  readonly pxPerDay: number
  readonly tier: RulerTier
  readonly originDay: CalendarDay | null
  // TRAP: axis readers start here, not at the Row Area edge: S-177 puts that edge inside the day.
  readonly originX: number
  readonly rectangleHeight: number
  readonly rows: readonly RowPlacement[]
  readonly placements: readonly TaskPlacement[]
  readonly contentWidth: number
  readonly contentHeight: number
  readonly contentX0: number | null
  readonly pinnedBandHeight?: number
  readonly scrollAreaY?: number
  readonly stackSafetyCapReached: StackSafetyCapStop | null
}

// see ST-7
export interface StackSafetyCapStop {
  readonly groupId: string
  readonly cap: number
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

// TRAP: lives for one layoutFromSchedule run; kept longer it answers from a stale calendar.
interface DayReader {
  day(text: string | null): CalendarDay | null
  walk(from: CalendarDay, workingDays: number): CalendarDay
}

/** @purity pure */
function dayReaderFor(within: WorkingCalendar): DayReader {
  const days = new Map<string, CalendarDay | null>()
  const walks = new Map<string, CalendarDay>()
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
      const key = `${textOfDay(from)}/${String(workingDays)}`
      const held = walks.get(key)
      if (held !== undefined) return held
      const made = dateFromWorkingDays(within, from, workingDays)
      walks.set(key, made)
      return made
    },
  }
}

// see FR-093
/** @purity pure */
export function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += character.charCodeAt(0) < 0x100 ? 1 : 2
  return units
}

// see LC-5, FR-093
/** @purity pure */
function labelWidth(text: string, fontSize: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSize * settings.labelCoef
}

const WORK_RESOURCE = 1

const NO_ASSIGNEE_MARK = '-'

const MORE_ASSIGNEES_MARK = '+'

const PERCENT_MARK = '%'

// see FR-059
/** @purity pure */
function assigneeLabelsOf(schedule: Schedule): ReadonlyMap<number, string> {
  const resourceByUid = new Map<number, Schedule['resources'][number]>()
  for (const resource of schedule.resources) resourceByUid.set(resource.uid, resource)

  const onTask = new Map<number, { readonly name: string; readonly uid: number }[]>()
  for (const assignment of schedule.assignments) {
    const taskUid = assignment.taskUid
    if (taskUid === null || assignment.resourceUid === null) continue
    const resource = resourceByUid.get(assignment.resourceUid)
    if (resource === undefined) continue
    // TRAP: test both AT-87 and AT-88; either alone draws some cost resources as people.
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
    // WHY: not localeCompare: a host-dependent collation shows another first name elsewhere.
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

// see FR-090
/** @purity pure */
function percentLabelOf(task: Task): string {
  if (planActualState(task) === 'notStarted') return ''
  const percent = task.percentComplete
  return percent === null ? '' : `${percent}${PERCENT_MARK}`
}

const OC2_SEPARATOR = ' : '

// see OC-2, FR-090
/** @purity pure */
function outsideLabelOf(assignee: string, percent: string): string {
  if (assignee === '') return percent
  if (percent === '') return assignee
  return `${assignee}${OC2_SEPARATOR}${percent}`
}

const TRUNCATION_MARK = '…'
const TRUNCATION_MARK_UNITS = 2

// see LC-4
/** @purity pure */
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

// see ND-5
// TRAP: every Task of the document, never the drawn range or today: a scroll would reflow the lanes (FR-002).
/** @purity pure */
function planDatesSpanYears(schedule: Schedule, reader: DayReader): boolean {
  let year: number | null = null
  for (const task of schedule.tasks) {
    for (const text of [task.start, task.finish]) {
      const day = reader.day(text)
      if (day === null) continue
      if (year === null) year = day.year
      else if (day.year !== year) return true
    }
  }
  return false
}

// see ND-4, ND-5
/** @purity pure */
function planDateText(day: CalendarDay, withYear: boolean): string {
  return withYear ? `${day.year}/${day.month}/${day.day}` : `${day.month}/${day.day}`
}

// see ND-1, ND-2, ND-3
/** @purity pure */
function planDatesOf(task: Task, reader: DayReader, withYear: boolean): string {
  const start = reader.day(task.start)
  if (start === null) return ''
  if (task.milestone === true) return planDateText(start, withYear)
  const finish = reader.day(task.finish)
  if (finish === null) return ''
  return `${planDateText(start, withYear)} - ${planDateText(finish, withYear)}`
}

// see FR-002, S-232
// TRAP: truncate the name alone; the dates are never cut and never count toward S-35.
/** @purity pure */
function nameLabelOf(name: string, dates: string): string {
  if (dates === '') return name
  return name === '' ? dates : `${name} ${dates}`
}

// see XS-5, XS-6
/** @purity pure */
export function thinEndHalfHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return (shapeKind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// see T-012, XS-5, XS-6
/** @purity pure */
function shapeHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  if (!laidBelow(shapeKind)) return planHeightOf(shapeKind, settings)
  const stroke = settings.thinStrokeWidth
  return stroke + settings.actualGap + stroke / 2 + thinEndHalfHeightOf(shapeKind, settings)
}

// see OC-10, XS-4
// TRAP: the tier is the font size, never S-233; that ratio moves every stacked row.
/** @purity pure */
function labelLiftOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  if (!laidBelow(shapeKind)) return 0
  return (
    labelFontSize(shapeKind, settings) +
    NOT_STORED_LABEL_SIZES['S-196'] * displayRatioOf(settings)
  )
}

/** @purity pure */
function reservedHeight(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return labelLiftOf(shapeKind, settings) + shapeHeightOf(shapeKind, settings)
}

/** @purity pure */
function drawnEdgeOverhangOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return laidBelow(shapeKind) ? 0 : settings.planStroke / 2
}

/** @purity pure */
function drawnExtentOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return reservedHeight(shapeKind, settings) + drawnEdgeOverhangOf(shapeKind, settings) * 2
}

// see VG-2, VG-5, LF-2, DS-10
/** @purity pure */
function verticalGapOf(settings: DocumentSettings): number {
  return settings.stackGap + settings.dependencyWidth + settings.stackGap
}

/** @purity pure */
function laidBelow(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

/** @purity pure */
function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return laidBelow(shapeKind) ? 'below' : 'inside'
}

/** @purity pure */
function actualReachOf(
  shapeKind: ShapeKind,
  actual: { readonly x: number; readonly width: number },
  settings: DocumentSettings,
): number {
  if (actualPlacementOf(shapeKind) !== 'sideways') return actual.x + actual.width
  return actual.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
}

// TRAP: the one spelling of this floor; a second can land an ulp off the zoom the fit lands on.
/** @purity pure */
function planHeightFloor(settings: DocumentSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/** @purity pure */
function zoomYAtPlanHeightFloor(settings: DocumentSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

// see FR-094
/** @purity pure */
function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
}

// see FR-094
/** @purity pure */
export function markerDiameterOf(shapeKind: ShapeKind, nameFontSize: number,
                                 settings: DocumentSettings): number {
  return laidBelow(shapeKind) ? nameFontSize : settings.markerSize
}

// see FR-077, FR-094
/** @purity pure */
function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

// see LC-3, FR-017, T-252, DS-1, DS-4, S-8
// TRAP: STORED settings with a DRAWN pxPerDay; the ruler font is scaled here, the S-8 divisor is not.
/** @purity pure */
export function rulerTierOf(pxPerDay: number, storedSettings: DocumentSettings): RulerTier {
  const settings = drawnSettingsOf(storedSettings)
  const scaled = pxPerDay / (settings.rulerFont / storedSettings.fontMin)
  if (scaled >= storedSettings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= storedSettings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= storedSettings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

const DAYS_PER_WEEK = 7

// see LF-1
/** @purity pure */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

export type TimeAxis = Pick<ScheduleLayout, 'pxPerDay' | 'originDay' | 'originX'>

// see FR-017, DC-3
// WHY: the axis alone, without laying out a row, for readers that only turn a pointer into a day.
/** @purity pure */
export function timeAxisOf(storedSettings: DocumentSettings, regions: ScreenRegions): TimeAxis {
  const settings = drawnSettingsOf(storedSettings)
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)
  return { pxPerDay, originDay, originX }
}

// see FR-017, T-252, DS-4
// TRAP: a quotient within an ulp of a whole day IS that day; floor alone answers the day before.
/** @purity pure */
export function dateAtX(layout: TimeAxis, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const span = (x - layout.originX) / layout.pxPerDay
  const whole = Math.round(span)
  const days = Math.abs(span - whole) < 1e-9 ? whole : Math.floor(span)
  const foundAt = new Date((serialOf(layout.originDay) + days) * MS_PER_DAY)
  return { year: foundAt.getUTCFullYear(), month: foundAt.getUTCMonth() + 1, day: foundAt.getUTCDate() }
}

/** @purity pure */
function xOnTimeAxis(originSerial: number, pxPerDay: number, originX: number,
                     day: CalendarDay): number {
  return originX + (serialOf(day) - originSerial) * pxPerDay
}

/** @purity pure */
export function xFromDay(layout: ScheduleLayout, day: CalendarDay): number {
  const origin = layout.originDay
  if (origin === null) return layout.originX
  return xOnTimeAxis(serialOf(origin), layout.pxPerDay, layout.originX, day)
}

// see FD-5, FD-6, FD-6b
/** @purity pure */
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

// see LC-1, HR-2
/** @purity pure */
function drawnGroups(
  schedule: Schedule,
  settings: DocumentSettings,
  isLevelZeroFolded: boolean,
): readonly (TaskGroup & { depth: number })[] {
  if (isLevelZeroFolded) return []
  const byId = new Map(schedule.taskGroups.map((glyph) => [glyph.id, glyph]))
  const drawnRows: (TaskGroup & { depth: number })[] = []

  for (const group of schedule.taskGroups) {
    let depth = 1
    let dropped = group.isHidden === true
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

// see FR-018, T-254, AT-142
// WHY: read over rows a person has not folded or hidden, so a mark never beats HF-7 or HR-6.
/** @purity pure */
function keptInViewByOpenMarks(unfoldedRows: readonly TaskGroup[]): ReadonlySet<string> {
  const byId = new Map(unfoldedRows.map((row) => [row.id, row]))
  const kept = new Set<string>()
  for (const row of unfoldedRows) {
    if (!row.isKeptOpen) continue
    for (let at: TaskGroup | undefined = row; at !== undefined && !kept.has(at.id);) {
      kept.add(at.id)
      at = at.parentId === null ? undefined : byId.get(at.parentId)
    }
  }
  for (const row of unfoldedRows) {
    const parent = row.parentId === null ? undefined : byId.get(row.parentId)
    if (parent?.isKeptOpen === true) kept.add(row.id)
  }
  return kept
}

// see LC-9
/** @purity pure */
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

// see LC-2, FR-018
/** @purity pure */
export function groupDepthLimit(settings: DocumentSettings): number {
  let limit = 1
  for (let depth = 2; depth <= settings.maxGroupDepth; depth++) {
    if (settings.zoomY >= groupDepthThresholdOf(depth, settings)) limit = depth
  }
  return limit
}

// see FR-018
// TRAP: never retype this: the fit lands zoomY on it and groupDepthLimit reads it back,
// so an ulp apart draws one depth shallower.
/** @purity pure */
export function groupDepthThresholdOf(depth: number, settings: DocumentSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
}

// see AT-100
/** @purity pure */
function shapeKindOf(visualByUid: ReadonlyMap<number, TaskVisual>, task: Task): ShapeKind {
  const kind = visualByUid.get(task.uid)?.shapeKind ?? null
  if (kind !== null) return kind
  return task.milestone === true ? 'milestone' : 'rectangle'
}

/** @purity pure */
function milestoneGlyphOf(
  visualByUid: ReadonlyMap<number, TaskVisual>,
  task: Task,
): MilestoneGlyph {
  return visualByUid.get(task.uid)?.milestoneGlyph ?? COLUMN_DEFAULTS.TaskVisual.milestoneGlyph
}

/** @purity pure */
function spanWidthOf(task: Task, pxPerDay: number, reader: DayReader): number {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return 0
  return Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay
}

// see T-023d
/** @purity pure */
function planEndsStandOnOneDay(task: Task, reader: DayReader): boolean {
  const from = reader.day(task.start)
  const toDay = reader.day(task.finish)
  if (from === null || toDay === null) return false
  return serialOf(from) === serialOf(toDay)
}

/** @purity pure */
function shapeWidthOf(
  spanWidth: number,
  shapeKind: ShapeKind,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') return planHeightOf(shapeKind, settings)
  return Math.max(spanWidth, settings.minShapeWidth)
}

// see FR-018
/** @purity pure */
function keptByLevelOfDetail(
  shapeKind: ShapeKind,
  spanWidth: number,
  shapeWidth: number,
  settings: DocumentSettings,
): boolean {
  if (shapeKind === 'milestone' || spanWidth <= 0) return true
  return shapeWidth >= settings.taskLevelOfDetailReadablePx
}

// see RV-1
/** @purity pure */
function actualSpanOf(
  task: Task,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): { readonly x: number; readonly width: number } | null {
  const from = reader.day(task.actualStart)
  if (from === null) return null
  const lastDay = actualLastDay(task)
  const columnsCovered = lastDay === null ? 0 : serialOf(lastDay) + 1 - serialOf(from)
  return {
    x: xOnTimeAxis(originSerial, pxPerDay, originX, from),
    width: Math.max(0, columnsCovered) * pxPerDay,
  }
}

// see DM-3
/** @purity pure */
function dummyInkWidthOf(markerDiameter: number): number {
  return Math.min(markerDiameter * NOT_STORED_DUMMY_SIZES['S-247'], NOT_STORED_DUMMY_SIZES['S-180'])
}

/** @purity pure */
function finiteOrNull(reach: number): number | null {
  return Number.isFinite(reach) ? reach : null
}

// see DM-1, DM-3, DM-9
/** @purity pure */
function dummyReachOf(
  task: Task,
  shapeKind: ShapeKind,
  reader: DayReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
  settings: DocumentSettings,
  markerDiameter: number,
): number {
  const start = reader.day(task.start)
  if (start === null) return Number.NEGATIVE_INFINITY
  const inkX = xOnTimeAxis(originSerial, pxPerDay, originX, start)
  if (actualPlacementOf(shapeKind) === 'sideways') {
    return inkX + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
  }
  return inkX + dummyInkWidthOf(markerDiameter)
}

// see RF-1, RF-3
export interface LabelReference {
  readonly x: number
  readonly width: number
  readonly fitWidth: number
  readonly nameFloor: number
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
export interface LabelLayout {
  readonly fits: boolean
  readonly markerLeft: number | null
  readonly nameX: number
}

// see XS-10, GA-20
/** @purity pure */
export function standsUndecidedResume(task: Task, shapeKind: ShapeKind): boolean {
  return (
    shapeKind !== 'milestone' &&
    task.resume === null &&
    planActualState(task) === 'suspendedResumeUnknown'
  )
}

// see RF-1, RF-3
/** @purity pure */
export function labelReferenceOf(
  shapeKind: ShapeKind,
  plan: { readonly x: number; readonly width: number },
  fade: { readonly fadeIn: number; readonly fadeOut: number },
  actual: { readonly x: number; readonly width: number } | null,
  settings: DocumentSettings,
): LabelReference {
  const sideways = actualPlacementOf(shapeKind) === 'sideways'
  const side = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  if (actual === null) {
    const flat = { x: plan.x, width: plan.width }
    return sideways
      ? { ...flat, fitWidth: plan.width, nameFloor: plan.x }
      : { ...flat, fitWidth: plan.width - fade.fadeIn - fade.fadeOut, nameFloor: plan.x + fade.fadeIn }
  }
  const band = sideways
    ? { x: actual.x - side / 2, width: side }
    : { x: actual.x, width: actual.width }
  return { ...band, fitWidth: band.width, nameFloor: band.x }
}

// see RF-1
/** @purity pure */
export function dummyBandOf(
  shapeKind: ShapeKind,
  plan: { readonly x: number; readonly width: number },
  markerDiameter: number,
): { readonly x: number; readonly width: number } {
  return actualPlacementOf(shapeKind) === 'sideways'
    ? { x: plan.x + plan.width / 2, width: 0 }
    : { x: plan.x, width: dummyInkWidthOf(markerDiameter) }
}

// see LP-2, LP-4, GA-20
/** @purity pure */
export function outwardStartOf(
  referenceEnd: number,
  task: Task,
  shapeKind: ShapeKind,
  markerDiameter: number,
): number {
  if (laidBelow(shapeKind) || !standsUndecidedResume(task, shapeKind)) return referenceEnd
  return referenceEnd + markerDiameter + NOT_STORED_SIZES['S-286']
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
/** @purity pure */
export function labelLayoutOf(
  shapeKind: ShapeKind,
  reference: LabelReference,
  textWidth: number,
  markerDiameter: number,
  marksShown: boolean,
  outwardStart: number,
  settings: DocumentSettings,
): LabelLayout {
  if (shapeKind === 'milestone') {
    const markerLeft = marksShown ? reference.x + reference.width : null
    const nameX = markerLeft === null
      ? reference.x + reference.width * settings.milestoneNameStartOfWidth
      : markerLeft + markerDiameter + settings.milestoneNameMarkerGap
    return { fits: true, markerLeft, nameX }
  }
  const lead = marksShown ? markerDiameter + settings.labelGap : settings.labelPad
  if (laidBelow(shapeKind)) {
    return {
      fits: true,
      markerLeft: marksShown ? reference.x : null,
      nameX: Math.max(reference.x + lead, reference.nameFloor),
    }
  }
  const fits = lead + textWidth + NOT_STORED_SIZES['S-260'] <= reference.fitWidth
  // TRAP: an undrawn resume icon holds no grab box, so S-63 false leaves the row at the reference end.
  const outward = marksShown ? outwardStart : reference.x + reference.width
  const from = fits ? reference.x : outward
  return {
    fits,
    markerLeft: marksShown ? from : null,
    nameX: Math.max(from + lead, fits ? reference.nameFloor : from + lead),
  }
}

// see FR-109, OC-2
/** @purity pure */
export function assigneeAnchorOf(
  shapeKind: ShapeKind,
  reference: LabelReference,
  drawnStartX: number,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') {
    return reference.x + reference.width * settings.milestoneNameStartOfWidth
  }
  return laidBelow(shapeKind) ? reference.x : drawnStartX
}

// see LF-3, HF-1, HF-19, FR-085, HF-5
// WHY: the row name's box is a floor too, or a zoomed-down row loses the name that tells it apart.
// TRAP: takes the DRAWN settings; the stored ones would miss the display ratio (FR-039).
/** @purity pure */
function bandFloorOf(depth: number, drawn: DocumentSettings, rowControlsHeightPx?: number): number {
  const nameBox = depth === 1 ? drawn.rowTitleFont * drawn.rowTitleTopScale : drawn.rowTitleFont
  return Math.max(rowControlLatticeFloorPx(), rowControlsHeightPx ?? 0, nameBox)
}

// see T-068
/** @purity pure */
export function layoutFromSchedule(
  schedule: Schedule,
  storedSettings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): ScheduleLayout {
  const settings = drawnSettingsOf(storedSettings)
  const { pxPerDay, originDay, originX } = timeAxisOf(storedSettings, regions)
  const originSerial = originDay === null ? 0 : serialOf(originDay)

  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
  const pinnedIds = new Set(settings.pinnedGroupIds)
  const unfoldedRows = drawnGroups(schedule, settings, isLevelZeroFolded === true)
  const keptOpenIds = keptInViewByOpenMarks(unfoldedRows)
  const rows = unfoldedRows.filter(
    (glyph) => glyph.depth <= depthLimit || pinnedIds.has(glyph.id) || keptOpenIds.has(glyph.id),
  )

  const taskByUid = new Map(schedule.tasks.map((text) => [text.uid, text]))
  const visualByUid = new Map(schedule.taskVisuals.map((value) => [value.taskUid, value]))
  const membersByGroup = new Map<string, TaskGroupMember[]>()
  for (const member of schedule.taskGroupMembers) {
    const groupMembers = membersByGroup.get(member.groupId)
    if (groupMembers === undefined) membersByGroup.set(member.groupId, [member])
    else groupMembers.push(member)
  }
  const assigneeLabels = assigneeLabelsOf(schedule)

  const within = workingCalendarOf(schedule)
  const reader = dayReaderFor(within)
  // TRAP: S-232 alone decides; never tie it to planVisible (S-227), or hiding the plan moves the name (FR-049).
  const datesWithYear = settings.planDatesVisible ? planDatesSpanYears(schedule, reader) : null
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  let y = regions.rowArea.y
  // TRAP: infinite seeds, not 0: 0 stretches the width to x = 0 when all content sits left of the origin.
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = drawnExtentOf('rectangle', settings)
  const laneGap = verticalGapOf(settings)
  let capStop: StackSafetyCapStop | null = null

  for (const row of rows) {
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
      .sort(
        (a, b) =>
          (a.task.start ?? '').localeCompare(b.task.start ?? '') ||
          (b.task.finish ?? '').localeCompare(a.task.finish ?? '') ||
          a.task.uid - b.task.uid,
      )

    const lanes: { x0: number; x1: number }[][] = []
    const laneMaxX1: number[] = []
    const laneMinX0: number[] = []
    const laneOf: number[] = []
    const measured = drawnTasks.map(({ task, kind, glyph, oneDay, width }) => {
      const from = reader.day(task.start)
      const foundAt = from === null ? originX : xOnTimeAxis(originSerial, pxPerDay, originX, from)
      const x = kind === 'milestone' ? foundAt - width / 2 : foundAt
      const label = nameLabelOf(
        truncate(task.name ?? '', settings.truncateUnits),
        datesWithYear === null ? '' : planDatesOf(task, reader, datesWithYear),
      )
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      const fade = clampedFade(task, kind, width, pxPerDay)
      const actual = actualSpanOf(task, reader, originSerial, pxPerDay, originX)
      const actualReach = actual === null ? null : actualReachOf(kind, actual, settings)
      const markerDiameter = markerDiameterOf(kind, font, settings)
      const dummyReach =
        actualReach !== null
          ? null
          : finiteOrNull(
              dummyReachOf(task, kind, reader, originSerial, pxPerDay, originX, settings, markerDiameter),
            )
      const planRight = x + width
      // TRAP: read no toggle here but S-63, which the drawing side reads: a toggle must not move a lane (T-038).
      const reference = labelReferenceOf(
        kind,
        { x, width },
        fade,
        actual ?? dummyBandOf(kind, { x, width }, markerDiameter),
        settings,
      )
      const marksShown = settings.progressMarkerVisible
      const namedFromPlanStart = laidBelow(kind)
      const referenceEnd = reference.x + reference.width
      const laid = labelLayoutOf(
        kind,
        reference,
        text,
        markerDiameter,
        marksShown,
        outwardStartOf(referenceEnd, task, kind, markerDiameter),
        settings,
      )
      const markerAnchorX = laid.markerLeft
      const placement: LabelPlacement = laid.fits ? 'inside' : 'right'
      const labelX = laid.nameX
      const labelledX1 = namedFromPlanStart
        ? Math.max(planRight, laid.nameX + text)
        : Math.max(planRight, referenceEnd, laid.nameX + text)
      // TRAP: never condition this on planActualDisplay: a toggle must not move a Task (T-038).
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      const assigneeLabel = settings.assigneeVisible
        ? (assigneeLabels.get(task.uid) ?? NO_ASSIGNEE_MARK)
        : ''
      const percentLabel = settings.percentCompleteVisible ? percentLabelOf(task) : ''
      const outsideLabel = outsideLabelOf(assigneeLabel, percentLabel)
      const outsideLabelWidth = labelWidth(outsideLabel, font, settings)
      const outsideWidth =
        outsideLabel === '' ? 0 : settings.assigneeLabelGap + outsideLabelWidth
      const assigneeAnchor = assigneeAnchorOf(
        kind,
        reference,
        actual === null ? x : Math.min(x, actual.x),
        settings,
      )
      const labelledX0 = assigneeAnchor - outsideWidth
      // WHY: OC-8 and OC-9 are not counted yet: their marks are not drawn (MS-4).
      const occupiedX0 = spread === null ? labelledX0 : Math.min(labelledX0, spread.x)
      const occupiedX1 =
        spread === null ? labelledX1 : Math.max(labelledX1, spread.x + spread.width)
      return { task, kind, glyph, oneDay, x, width, label, font, placement, actual, labelX,
               actualReach, dummyReach, fade, outsideLabel, outsideLabelWidth,
               occupiedX0, occupiedX1, markerAnchorX, text }
    })

    for (const item of measured) {
      let lane = -1
      for (let step = 0; step < lanes.length; step++) {
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
        // STOP: spec does not decide whether ST-7 admits S-89 lanes or stops at the S-89th. Looked in ST-7, S-89
        // @provisional PND-430
        // TRAP: break before the row is placed: a partial row leaves laneOf shorter than measured.
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
    if (capStop !== null) break

    // TRAP: no Math.max(...lane): spreading a huge lane throws RangeError.
    const laneHeights = lanes.map(() => 0)
    measured.forEach((item, index) => {
      const reserved = drawnExtentOf(item.kind, settings)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    for (let step = 0; step < laneHeights.length; step++) {
      if (laneHeights[step] === 0) laneHeights[step] = emptyLane
    }
    const packed = laneHeights.reduce((sum, h) => sum + h + laneGap, 0)
    const bandFloor = bandFloorOf(row.depth, settings, rowControlsHeightPx)
    const height = Math.max(packed, emptyLane, row.height ?? 0, bandFloor)

    const upward = settings.stackDirection === 'up'
    const tops = new Array<number>(laneHeights.length)
    let laneTop = y
    for (let slot = 0; slot < laneHeights.length; slot++) {
      const lane = upward ? laneHeights.length - 1 - slot : slot
      tops[lane] = laneTop
      laneTop += laneHeights[lane]! + laneGap
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
        y: tops[lane]! + drawnEdgeOverhangOf(item.kind, settings) + labelLiftOf(item.kind, settings),
        height: shapeHeightOf(item.kind, settings),
        planHeight: planHeightOf(item.kind, settings),
        actualPlacement: actualPlacementOf(item.kind),
        actualX: item.actual === null ? null : item.actual.x,
        actualWidth: item.actual === null ? 0 : item.actual.width,
        actualReach: item.actualReach,
        dummyReach: item.dummyReach,
        markerAnchorX: item.markerAnchorX,
        labelPlacement: item.placement,
        labelX: item.labelX,
        label: item.label,
        labelTextWidth: item.text,
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
      stackTops: tops.length === 0 ? [y] : tops,
    })
    y += height + settings.rowGap
  }

  const band = pinnedBandOf(rowPlacements, settings, regions)
  const lifted = liftedRows(rowPlacements, band)
  const shifted = shiftedPlacements(placements, band.shiftByGroupId, band.droppedPinnedIds)

  const scrollingRows = lifted.filter((row) => row.isPinned !== true)
  const scrollOffsetY = scrollOffsetOf(scrollingRows, settings, band.scrollAreaY)
  const contentHeight = Math.max(0, band.scrollingContentHeight)
  const nothingPlaced = leftmost === Number.POSITIVE_INFINITY
  const contentWidth = nothingPlaced ? 0 : Math.max(0, widest - leftmost)
  const contentX0 = nothingPlaced ? null : leftmost

  return {
    pxPerDay,
    // see FR-017
    tier: rulerTierOf(pxPerDay, storedSettings),
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

// see FR-098, LF-14
/** @purity pure */
function pinnedBandOf(
  rowPlacements: readonly RowPlacement[],
  settings: DocumentSettings,
  regions: ScreenRegions,
): {
  readonly height: number
  readonly scrollAreaY: number
  readonly scrollingContentHeight: number
  readonly pinnedIdsPlaced: ReadonlySet<string>
  readonly droppedPinnedIds: ReadonlySet<string>
  readonly shiftByGroupId: ReadonlyMap<string, number>
} {
  const placedById = new Map(rowPlacements.map((row) => [row.groupId, row] as const))
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
  // TRAP: inBand, not banded: with every pin dropped there is no band and no gap.
  const scrollAreaY = regions.rowArea.y + (inBand.size === 0 ? 0 : height + settings.rowGap)

  let scrollY = scrollAreaY
  for (const row of rowPlacements) {
    // TRAP: seen, not inBand: a dropped pin must not come back as a scrolling row.
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

// see FR-098
/** @purity pure */
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

/** @purity pure */
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

// see OP-10a, S-176
/** @purity pure */
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
  // TRAP: rowAnchorAt in input-command-translator.ts inverts this with the same denominator;
  // change both or the pan lands elsewhere.
  const below = rows[landedAt + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  return row.y + (held - carriedRows) * slab - rowAreaY
}

/** @purity pure */
function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] {
  if (offsetY === 0) return rows
  return rows.map((row) => {
    if (row.isPinned === true) return row
    return {
      ...row,
      y: row.y - offsetY,
      stackTops: row.stackTops.map((top) => top - offsetY),
    }
  })
}

/** @purity pure */
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

/** @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((part) => part.taskUid === taskUid) ?? null
}

// see FR-055, OP-10
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  readonly scrollDate: string | null
  readonly scrollGroupId: string | null
  // TRAP: zoomY may land below this floor; the drawn zoom is Math.max(zoomY, floorZoomY).
  readonly floorZoomY: number
}

export interface NotStoredZoom {
  readonly step: number
  readonly min: number
  readonly max: number
}

/** @purity pure */
function landingZoomY(depth: number, settings: DocumentSettings, step: number): number {
  if (depth <= 1) return groupDepthThresholdOf(2, settings) / step
  return groupDepthThresholdOf(depth, settings)
}

/** @purity pure */
function deepestDrawnDepth(schedule: Schedule, settings: DocumentSettings): number {
  let deepest = 0
  for (const row of drawnGroups(schedule, settings, false)) {
    if (row.depth > deepest) deepest = row.depth
  }
  return Math.min(deepest, settings.maxGroupDepth)
}

// see FR-016, FR-055, T-068
// TRAP: a bound that is not finite is no bound; clamping on one answers NaN and T-068 misses.
/** @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  const lifted = Number.isFinite(zoom.min) ? Math.max(zoom.min, value) : value
  return Number.isFinite(zoom.max) ? Math.min(zoom.max, lifted) : lifted
}

// see FR-055
// DEVIATION: spec clamps both axes to S-75/S-76 (FR-016); here only zoomX is (DFC-726)
/** @purity pure */
export function fitZoom(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoom: NotStoredZoom,
  rowControlsHeightPx?: number,
): FitToScreen {
  const floorZoomY = zoomYAtPlanHeightFloor(settings)
  const deepest = deepestDrawnDepth(schedule, settings)
  // TRAP: pass rowControlsHeightPx on, or bands measure short and a depth that does not fit is chosen.
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(
      schedule, { ...settings, zoomX, zoomY }, regions, cap, undefined, rowControlsHeightPx,
    )

  const atUnity = runAt(1, floorZoomY, deepest)
  if (atUnity.rows.length === 0 && atUnity.stackSafetyCapReached === null) {
    return {
      zoomX: 1,
      zoomY: 1,
      scrollDate: settings.scrollDate,
      scrollGroupId: settings.scrollGroupId,
      floorZoomY,
    }
  }
  const zoomX =
    atUnity.contentWidth <= 0
      ? 1
      : clampedZoom(regions.rowArea.width / atUnity.contentWidth, zoom)

  const atFloor: ScheduleLayout[] = []
  for (let cap = 1; cap <= deepest; cap++) atFloor.push(runAt(zoomX, floorZoomY, cap))
  const fits = (run: ScheduleLayout): boolean => {
    // STOP: spec does not decide whether a run stopped by ST-7 fits; here it never does. Looked in ST-7, FR-055
    // @provisional PND-479
    if (run.stackSafetyCapReached !== null) return false
    const remainderTop = run.scrollAreaY ?? regions.rowArea.y
    return run.contentHeight <= regions.rowArea.y + regions.rowArea.height - remainderTop
  }
  let depth = 1
  for (let candidate = deepest; candidate >= 1; candidate--) {
    if (fits(atFloor[candidate - 1]!)) {
      depth = candidate
      break
    }
  }
  let chosen = atFloor[depth - 1]!

  let zoomY = landingZoomY(depth, settings, zoom.step)
  if (zoomY > floorZoomY) {
    const atLanding = runAt(zoomX, zoomY, depth)
    if (fits(atLanding) || depth === 1) {
      chosen = atLanding
    } else {
      depth -= 1
      zoomY = landingZoomY(depth, settings, zoom.step)
      chosen = atFloor[depth - 1]!
    }
  }

  const leftDay = chosen.contentX0 === null ? null : dateAtX(chosen, chosen.contentX0)
  return {
    zoomX,
    zoomY,
    scrollDate: leftDay === null ? settings.scrollDate : textOfDay(leftDay),
    scrollGroupId:
      chosen.rows.find((row) => row.isPinned !== true)?.groupId ?? settings.scrollGroupId,
    floorZoomY,
  }
}

// see FR-016, FR-077, FR-094, PI-5, T-252, DS-1
// WHY: the largest of three: below either floor the name does not grow, so the floor's release answers.
/** @purity pure */
export function zoomYAtRectangleLabelFont(fontPx: number, storedSettings: DocumentSettings): number {
  const settings = drawnSettingsOf(storedSettings)
  const fontPerZoom = settings.basePlanHeight * settings.shapeHeightOf.rectangle *
    settings.actualOfPlan * settings.fontOfActual
  return Math.max(fontPx / fontPerZoom, zoomYAtPlanHeightFloor(settings), settings.fontMin / fontPerZoom)
}

// see FR-016, T-068
/** @purity pure */
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
// see T-206
export const NOT_STORED_SIZES: {
  readonly 'S-250': number
  readonly 'S-251': number
  readonly 'S-252': number
  readonly 'S-253': number
  readonly 'S-254': number
  readonly 'S-255': number
  readonly 'S-256': number
  readonly 'S-257': number
  readonly 'S-258': number
  readonly 'S-259': number
  readonly 'S-260': number
  readonly 'S-261': number
  readonly 'S-262': number
  readonly 'S-263': number
  readonly 'S-264': number
  readonly 'S-265': number
  readonly 'S-266': number
  readonly 'S-267': number
  readonly 'S-268': number
  readonly 'S-269': number
  readonly 'S-270': number
  readonly 'S-271': number
  readonly 'S-272': number
  readonly 'S-273': number
  readonly 'S-274': number
  readonly 'S-275': number
  readonly 'S-276': number
  readonly 'S-277': number
  readonly 'S-278': number
  readonly 'S-279': number
  readonly 'S-280': number
  readonly 'S-281': number
  readonly 'S-282': number
  readonly 'S-283': number
  readonly 'S-284': number
  readonly 'S-285': number
  readonly 'S-286': number
  readonly 'S-287': number
  readonly 'S-288': number
  readonly 'S-289': number
  readonly 'S-290': number
  readonly 'S-137': number
  readonly 'S-230': number
  readonly 'S-293': number
  readonly 'S-291': number
  readonly 'S-292': number
} = {
  'S-250': 12,
  'S-251': 0,
  'S-252': 0,
  'S-253': 12,
  'S-254': 0,
  'S-255': 0,
  'S-256': 0,
  'S-257': 12,
  'S-258': 0,
  'S-259': 0,
  'S-260': 12,
  'S-261': 0,
  'S-262': 0,
  'S-263': 12,
  'S-264': 0,
  'S-265': 0,
  'S-266': 12,
  'S-267': 0,
  'S-268': 8,
  'S-269': 8,
  'S-270': 12,
  'S-271': 0,
  'S-272': 12,
  'S-273': 0,
  'S-274': 12,
  'S-275': 0,
  'S-276': 12,
  'S-277': 0,
  'S-278': 1.15,
  'S-279': 0,
  'S-280': 0,
  'S-281': 0,
  'S-282': 0,
  'S-283': 0,
  'S-284': 0,
  'S-285': 2,
  'S-286': 0,
  'S-287': 12,
  'S-288': 0,
  'S-289': 12,
  'S-290': 0,
  'S-137': 6,
  'S-230': 6,
  'S-293': 3,
  'S-291': 3,
  'S-292': 6,
}

// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
  readonly 'S-247': number
} = {
  'S-180': 30,
  'S-247': 0.5,
}

// see T-206
export const NOT_STORED_LABEL_SIZES: {
  readonly 'S-196': number
  readonly 'S-233': number
} = {
  'S-196': 2,
  'S-233': 1.5,
}
// </generated>

// ScheduleLayout -- the time axis, label widths, row placing, level of detail and the fit.
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5

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

// see L-1
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday'

// see T-013
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
  readonly labelPlacement: LabelPlacement
  // TRAP: already clears the OC-3 / OC-4 room; do not add the marker width again.
  readonly labelX: number
  readonly label: string
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
  // TRAP: not walk(from, 1), which answers a half-open end bound.
  after(from: CalendarDay): CalendarDay
}

/** @purity pure */
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

// STOP: spec does not decide how FR-059's first name joins the remaining count. Looked in FR-059, T-225, OC-2
// @provisional PND-346
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

// see T-012, FR-094
/** @purity pure */
function reservedHeight(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const planHeight = planHeightOf(shapeKind, settings)
  return laidBelow(shapeKind)
    ? planHeight + settings.actualGap + planHeight * settings.actualOfPlan
    : planHeight
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

// see FR-077, FR-094
/** @purity pure */
function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

// see LC-3, FR-017
/** @purity pure */
export function rulerTierOf(pxPerDay: number, settings: DocumentSettings): RulerTier {
  const scaled = pxPerDay / (settings.rulerFont / settings.fontMin)
  if (scaled >= settings.rulerTierPxPerDayDay) return 'yearMonthDayWeekday'
  if (scaled >= settings.rulerTierPxPerDayWeek) return 'yearMonthWeek'
  if (scaled >= settings.rulerTierPxPerDayMonth) return 'yearMonth'
  return 'year'
}

const DAYS_PER_WEEK = 7

// see LF-1
/** @purity pure */
export function tickStrideOf(layout: ScheduleLayout, _settings: DocumentSettings): number {
  return layout.tier === 'yearMonthWeek' ? DAYS_PER_WEEK : 1
}

// see FR-017
/** @purity pure */
export function dateAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  if (layout.originDay === null || layout.pxPerDay <= 0) return null
  const days = Math.floor((x - layout.originX) / layout.pxPerDay)
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

// STOP: spec does not decide whether the plan bar spans its finish day; here it does not.
// Looked in T-221
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
  const toDay = reader.walk(from, task.actualDuration ?? 0)
  return {
    x: xOnTimeAxis(originSerial, pxPerDay, originX, from),
    width: Math.max(0, serialOf(toDay) - serialOf(from)) * pxPerDay,
  }
}

// see DM-3, OR-3
/** @purity pure */
function dummyGrabWidthPx(pxPerDay: number): number {
  return Math.min(pxPerDay, NOT_STORED_DUMMY_SIZES['S-180'])
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
): number {
  const start = reader.day(task.start)
  if (start === null) return Number.NEGATIVE_INFINITY
  const inkX = xOnTimeAxis(originSerial, pxPerDay, originX, reader.after(start))
  if (actualPlacementOf(shapeKind) === 'sideways') {
    return inkX + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
  }
  return inkX + dummyGrabWidthPx(pxPerDay)
}

// TRAP: never read progressMarkerVisible here: the room is held whether the marker is drawn or not.
/** @purity pure */
function markRoomOf(settings: DocumentSettings): number {
  const side = settings.markerSize
  const resumeReach = side * (settings.resumeArmOfMarker + settings.resumeHeadOfMarker)
  return settings.markerGap + side + settings.markerGap + resumeReach
}

const ROW_CONTROL_LATTICE_RANKS = 2

// see LF-3, HF-19
/** @purity pure */
function rowControlLatticeFloorPx(): number {
  return NOT_STORED_ROW_CONTROL_OUTER_SIZES.rowControlOuterHeightPx * ROW_CONTROL_LATTICE_RANKS
}

// see T-068
// STOP: spec does not decide how pass 1 of the fit reaches every depth at one zoom.
// Looked in T-068, FR-018
// @provisional PND-206
/** @purity pure */
export function layoutFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
  isLevelZeroFolded?: boolean,
  rowControlsHeightPx?: number,
): ScheduleLayout {
  const pxPerDay = settings.pxPerDayAt1x * settings.zoomX
  const originDay = dayOf(settings.scrollDate)
  const originSerial = originDay === null ? 0 : serialOf(originDay)
  const dayOffset = Number.isFinite(settings.scrollDayOffset) ? settings.scrollDayOffset : 0
  const originX = regions.rowArea.x - (originDay === null ? 0 : dayOffset * pxPerDay)

  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
  const pinnedIds = new Set(settings.pinnedGroupIds)
  const rows = drawnGroups(schedule, settings, isLevelZeroFolded === true).filter(
    (glyph) => glyph.depth <= depthLimit || pinnedIds.has(glyph.id),
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
  const placements: TaskPlacement[] = []
  const rowPlacements: RowPlacement[] = []

  let y = regions.rowArea.y
  // TRAP: infinite seeds, not 0: 0 stretches the width to x = 0 when all content sits left of the origin.
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = reservedHeight('rectangle', settings)
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
      const label = truncate(task.name ?? '', settings.truncateUnits)
      const font = labelFontSize(kind, settings)
      const text = labelWidth(label, font, settings)
      const fade = clampedFade(task, kind, width, pxPerDay)
      const roomInside = Math.max(0, width - fade.fadeIn - fade.fadeOut)
      const placement: LabelPlacement = text <= roomInside ? 'inside' : 'right'
      const actual = actualSpanOf(task, reader, originSerial, pxPerDay, originX)
      const actualReach = actual === null ? null : actualReachOf(kind, actual, settings)
      const dummyReach =
        actualReach !== null
          ? null
          : finiteOrNull(
              dummyReachOf(task, kind, reader, originSerial, pxPerDay, originX, settings),
            )
      const outwardX = Math.max(x + width, actualReach ?? dummyReach ?? Number.NEGATIVE_INFINITY)
      const labelX = outwardX + markRoomOf(settings) + settings.labelGap
      const labelledX1 = placement === 'right' ? labelX + text : x + width
      // TRAP: never condition this on planActualDisplay: a toggle must not move a Task (T-038).
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      const assigneeLabel = settings.assigneeVisible
        ? (assigneeLabels.get(task.uid) ?? NO_ASSIGNEE_MARK)
        : ''
      const percentLabel = settings.percentCompleteVisible ? percentLabelOf(task) : ''
      const outsideLabel = outsideLabelOf(assigneeLabel, percentLabel)
      const outsideLabelWidth = labelWidth(outsideLabel, font, settings)
      const outsideWidth = outsideLabel === '' ? 0 : settings.labelGap + outsideLabelWidth
      const labelledX0 = x - outsideWidth
      // WHY: OC-8 and OC-9 are not counted yet: their marks are not drawn (MS-4).
      const occupiedX0 = spread === null ? labelledX0 : Math.min(labelledX0, spread.x)
      const occupiedX1 =
        spread === null ? labelledX1 : Math.max(labelledX1, spread.x + spread.width)
      return { task, kind, glyph, oneDay, x, width, label, font, placement, actual, labelX,
               actualReach, dummyReach, fade, outsideLabel, outsideLabelWidth,
               occupiedX0, occupiedX1 }
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
      const reserved = reservedHeight(item.kind, settings)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    for (let step = 0; step < laneHeights.length; step++) {
      if (laneHeights[step] === 0) laneHeights[step] = emptyLane
    }
    const stacked = laneHeights.reduce((sum, h) => sum + h + settings.stackGap, 0)
    const packed = Math.max(0, stacked - settings.stackGap)
    const latticeFloor = Math.max(rowControlLatticeFloorPx(), rowControlsHeightPx ?? 0)
    const height = Math.max(packed, emptyLane, row.height ?? 0, latticeFloor)

    // STOP: spec does not decide which end lane 0 sits at, nor where FR-042's extra slack goes.
    // Looked in ST-5, S-58, FR-042
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

// STOP: spec does not decide depth 1's landing zoom; here one S-53 notch below depth 2. Looked in FR-018, FR-055
// @provisional PND-204
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

// see FR-016
/** @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  return Math.min(zoom.max, Math.max(zoom.min, value))
}

// see FR-055
// STOP: spec does not decide the zoomX the horizontal is measured at; here unity. Looked in S-86, T-068
// @provisional PND-203
// STOP: spec does not decide which axes FR-016's range clamps; here the horizontal only. Looked in FR-016, CM-71
// @provisional PND-205
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
      // STOP: spec does not decide which run a retreated depth takes its position from; here its floor run.
      // Looked in T-068
      // @provisional PND-207
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
// see T-206, S-138, S-141
export const NOT_STORED_ROW_CONTROL_OUTER_SIZES: {
  readonly rowControlOuterHeightPx: number
} = {
  rowControlOuterHeightPx: 24,
}

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

// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
} = {
  'S-180': 30,
}
// </generated>

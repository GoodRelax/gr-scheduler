// ScheduleLayout: public entry; places task groups and tasks in one pass of table T-068, and re-exports what the siblings hold.
// @unit      UF-5   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-5

import type { DocumentSettings, DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  COLUMN_DEFAULTS,
  actualEndOf,
  dateFromWorkingDays,
  dayOf,
  finishSideDayFrom,
  instantOnSideReader,
  MINUTES_PER_CALENDAR_DAY,
  serial,
  shownInstantReader,
  startSideOf,
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type DateTimeSide,
  type InstantOnSide,
  type Schedule,
  type Task,
  type TaskGroupMember,
  type TaskVisual,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import {
  displayScaleFractionOf,
  drawnSettingsOf,
  taskGroupControlLatticeHeightPx,
  type ScreenRect,
  type ScreenRegions,
} from '../screen-regions/screen-regions'
import { assigneeLabelsOf } from './assignee-label'
import { drawnGroups } from './drawn-task-groups'
import { groupDepthLimit, keptInViewByTreeState } from './group-level-of-detail'
import {
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  outwardStartOf,
} from './label-placement'
import { labelWidth } from './label-width'
import { nameLabelOf, nameLabelWidthOf, isPlanSpanningYears } from './name-label'
import { outsideLabelOf, percentLabelOf } from './percent-label'
import { liftedTaskGroups, pinnedBandOf, shiftedPlacements } from './pinned-band'
import { scrollOffsetOf, scrolledPlacements, scrolledTaskGroups } from './task-group-scroll'
import {
  actualPlacementOf,
  actualReachOf,
  drawnEdgeOverhangOf,
  drawnExtentOf,
  labelFontSize,
  labelLiftOf,
  isLaidBelow,
  markerDiameterOf,
  outlineWidthOf,
  planHeightOf,
  shapeHeightOf,
} from './shape-cross-sections'
import { dateAtX, rulerTierOf, serialOf, snapMinutesOf, snappedInstantAtX, timeAxisOf } from './time-axis'

export {
  dateAtX,
  fixedFitSpanOf,
  rulerTierOf,
  shownSpanOf,
  snapMinutesOf,
  snappedInstantAtX,
  thresholdPxPerDayOf,
  tickStrideOf,
  timeAxisOf,
  xFromDay,
  xOfInstant,
} from './time-axis'
export type { TimeAxis } from './time-axis'
export { labelUnits, labelWidth } from './label-width'
export { MORE_ASSIGNEES_MARK, labeledAssigneeUidOf } from './assignee-label'
export {
  markerDiameterOf,
  thinEndHalfHeightOf,
  zoomYAtRectangleLabelFont,
} from './shape-cross-sections'
export { groupDepthLimit, groupDepthThresholdOf, keptInViewByTreeState } from './group-level-of-detail'
export { inTreeOrder, isDroppedByTreeState } from './drawn-task-groups'
export {
  NOT_STORED_SIZES,
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  outwardStartOf,
  hasUndecidedResume,
} from './label-placement'
export type { LabelLayout, LabelReference } from './label-placement'
export { fitZoom } from './fit-zoom'
export { hasRoomBelowPinsIn } from './pinned-band'
export { taskGroupAnchorIn, taskGroupIndexAtTopEdge } from './task-group-scroll'
export { clockTextOf, lengthTextOf, isPlanSpanningYears, planDateText } from './name-label'
export type { FitToScreen, NotStoredZoom } from './fit-zoom'

// see L-1
export type RulerTier = 'year' | 'yearMonth' | 'yearMonthWeek' | 'yearMonthDayWeekday' | 'dayHour'

// see LP-1, LP-2
export type LabelPlacement = 'inside' | 'right'

export type MilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

// see T-012, AT-100
export type ShapeKind = NonNullable<TaskVisual['shapeKind']>

export interface TaskPlacement {
  readonly taskUid: number
  readonly taskGroupId: string
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
  // TRAP: not actualX + actualWidth: a milestone's figure is centered on a zero-width span.
  readonly actualReach: number | null
  readonly dummyReach: number | null
  // TRAP: an unset (null) fade reads 0 here; a chevron end tells unset from 0 only by fadeInUnset / fadeOutUnset.
  readonly fadeInPx: number
  readonly fadeOutPx: number
  readonly fadeInUnset: boolean
  readonly fadeOutUnset: boolean
  // TRAP: the lane marker, whatever is shown; the drawn one follows RF-1 and reads the toggles itself.
  readonly markerAnchorX: number | null
  readonly labelPlacement: LabelPlacement
  // TRAP: already past the marker and a PA-4 icon; do not add them again.
  readonly labelX: number
  readonly label: string
  // TRAP: the tail of label drawn at labelFontSize x S-325, its leading space included; label ends with it.
  readonly labelDates: string
  // TRAP: the name at labelFontSize plus labelDates at labelFontSize x S-325; T-273 and OC-1 read this sum.
  readonly labelTextWidth: number
  readonly labelFontSize: number
  readonly outsideLabel: string
  readonly outsideLabelWidth: number
  readonly occupiedX0: number
  readonly occupiedX1: number
  // see DA-4
  readonly deadlineX: number | null
  // see AT-104, VG-5
  // WHY: optional, so a placement built without it still lays out; absent reads S-39 (outlineWidthOf).
  readonly outlineWidth?: number
}

export interface TaskGroupPlacement {
  readonly taskGroupId: string
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
  // TRAP: axis readers start here, not at the Task Group Area edge: S-177 puts that edge inside the day.
  readonly originX: number
  readonly rectangleHeight: number
  readonly taskGroups: readonly TaskGroupPlacement[]
  readonly placements: readonly TaskPlacement[]
  readonly contentWidth: number
  readonly contentHeight: number
  readonly contentX0: number | null
  readonly pinnedBandHeight?: number
  readonly scrollAreaY?: number
  readonly stackSafetyCapReached: StackSafetyCapStop | null
  // see TV-1, TV-3, EL-20
  readonly shownTaskUids?: ReadonlySet<number> | null
}

// see ST-7
export interface StackSafetyCapStop {
  readonly taskGroupId: string
  readonly cap: number
}

// TRAP: lives for one layoutFromSchedule run; kept longer it answers from a stale calendar.
export interface DayReader {
  day(text: string | null): CalendarDay | null
  walk(from: CalendarDay, workingDays: number): CalendarDay
  // see TX-1, FR-054, FR-156
  shown(text: string | null, side: DateTimeSide): number | null
}

// see RV-1, RV-6, FR-158
// WHY: the left and right edges as a fractional day serial: a whole column without time of day, the instant with it.
// WHY: reading is the side a date without a time is read on (FR-054, T-350): a milestone's start and the deadline finish.
interface EdgeReader {
  edge(text: string | null, side: 'start' | 'finish', reading: DateTimeSide): number | null
  readonly isTimeOfDayVisible: boolean
}

// see RV-1, RV-6, FR-054, FR-158
// WHY: without time of day the finish column is FR-054's finish-side day, so an end at 00:00 closes the day before.
/** @purity pure */
function edgeOf(text: string | null, side: 'start' | 'finish', instantAt: () => number | null,
                isTimeOfDayVisible: boolean, dayAt: (text: string | null) => CalendarDay | null): number | null {
  if (isTimeOfDayVisible) {
    const instant = instantAt()
    return instant === null ? null : instant / MINUTES_PER_CALENDAR_DAY
  }
  if (side === 'start') {
    const day = dayAt(text)
    return day === null ? null : serialOf(day)
  }
  const last = finishSideDayFrom(dayAt(text), text)
  return last === null ? null : serialOf(last) + 1
}

// see DC-2, DC-3, CU-3, T-378, TX-6, FR-158
// WHY: on the day unit (SG-1) the line stands on the day the point is in, as without time of day; finer, on the snapped instant.
/** @purity pure */
export function cursorInstantAtX(
  axis: Pick<ScheduleLayout, 'pxPerDay' | 'originDay' | 'originX'>,
  x: number,
  settings: DocumentSettings,
): number | null {
  const snap = snapMinutesOf(axis.pxPerDay, settings, false)
  if (snap < MINUTES_PER_CALENDAR_DAY) return snappedInstantAtX(axis, x, snap)
  const day = dateAtX(axis, x)
  return day === null ? null : serial(day) * MINUTES_PER_CALENDAR_DAY
}

/** @purity pure */
function edgeSlotOf(side: 'start' | 'finish', reading: DateTimeSide): number {
  return (side === 'start' ? 0 : 2) + (reading === 'start' ? 0 : 1)
}

/** @purity pure */
function dayReaderFor(within: WorkingCalendar, isTimeOfDayVisible: boolean, shown: InstantOnSide): DayReader & EdgeReader {
  const days = new Map<string, CalendarDay | null>()
  const walks = new Map<string, CalendarDay>()
  const edges = [0, 1, 2, 3].map(() => new Map<string, number | null>())
  const onSide = instantOnSideReader(within)
  const day = (text: string | null): CalendarDay | null => {
    const key = text ?? ''
    const held = days.get(key)
    if (held !== undefined) return held
    const made = dayOf(text)
    days.set(key, made)
    return made
  }
  return {
    edge(text: string | null, side: 'start' | 'finish', reading: DateTimeSide): number | null {
      const slot = edges[edgeSlotOf(side, reading)]!
      const key = text ?? ''
      const held = slot.get(key)
      if (held !== undefined) return held
      const made = edgeOf(text ?? null, side, () => onSide(text, reading), isTimeOfDayVisible, day)
      slot.set(key, made)
      return made
    },
    shown,
    isTimeOfDayVisible,
    day,
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

const NO_ASSIGNEE_MARK = '-'

// see VG-2, VG-5, LF-2, DS-10
/** @purity pure */
function verticalGapOf(settings: DrawnSettings): number {
  return settings.stackGap + settings.dependencyWidth + settings.stackGap
}

// see FD-6, IV-12, RV-6
// WHY: the fades share the days from start to finish, not the finish day the bar also covers, so FD-6 clips where IV-12 refuses.
/** @purity pure */
function fadeRoomOf(span: number, pxPerDay: number, settings: DrawnSettings): number {
  return Math.max(span - pxPerDay, settings.minShapeWidth)
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

// see FD-4, FD-5, FD-6a
/** @purity pure */
function placedFadeOf(task: Task, fade: { readonly fadeIn: number; readonly fadeOut: number }):
  Pick<TaskPlacement, 'fadeInPx' | 'fadeOutPx' | 'fadeInUnset' | 'fadeOutUnset'> {
  return {
    fadeInPx: fade.fadeIn,
    fadeOutPx: fade.fadeOut,
    fadeInUnset: task.fadeInDays === null,
    fadeOutUnset: task.fadeOutDays === null,
  }
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

// see RV-6
// WHY: the finish day's column is covered too, as the actual bar covers its last day (RV-1).
/** @purity pure */
function spanWidthOf(task: Task, pxPerDay: number, reader: EdgeReader): number {
  const from = reader.edge(task.start, 'start', startSideOf(task))
  const to = reader.edge(task.finish, 'finish', 'finish')
  if (from === null || to === null) return 0
  return Math.max(0, to - from) * pxPerDay
}

// see RV-1, RV-6
/** @purity pure */
function xAtEdge(edge: number, originSerial: number, pxPerDay: number, originX: number): number {
  return originX + (edge - originSerial) * pxPerDay
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
  settings: DrawnSettings,
): number {
  if (shapeKind === 'milestone') return planHeightOf(shapeKind, settings)
  return Math.max(spanWidth, settings.minShapeWidth)
}

// see RV-1
/** @purity pure */
function actualSpanOf(
  task: Task,
  reader: EdgeReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): { readonly x: number; readonly width: number } | null {
  const from = reader.edge(task.actualStart, 'start', startSideOf(task))
  if (from === null) return null
  const to = reader.edge(actualEndOf(task), 'finish', 'finish')
  return {
    x: xAtEdge(from, originSerial, pxPerDay, originX),
    width: Math.max(0, to === null ? 0 : to - from) * pxPerDay,
  }
}

// see DA-4, RV-6
// WHY: a bar's tip stands where its plan right end would on that day; a milestone's on its diamond's day.
/** @purity pure */
function deadlineXOf(
  task: Task,
  kind: ShapeKind,
  reader: EdgeReader,
  originSerial: number,
  pxPerDay: number,
  originX: number,
): number | null {
  const left = reader.edge(task.deadline, 'start', 'finish')
  if (left === null) return null
  const at = xAtEdge(left, originSerial, pxPerDay, originX)
  return kind === 'milestone' || reader.isTimeOfDayVisible ? at : at + pxPerDay
}

// see DA-2, OC-9
// WHY: one width for the drawn head and the room OC-9 counts, so the two cannot drift apart.
/** @purity pure */
export function deadlineHeadHalfWidthOf(markerDiameter: number): number {
  return (markerDiameter * NOT_STORED_DEADLINE_MARK_SIZES['S-365']) / 2
}

// see OC-9, DA-2
/** @purity pure */
function occupiedSpanOf(
  labeled: { readonly x0: number; readonly x1: number },
  spread: { readonly x: number; readonly width: number } | null,
  deadlineX: number | null,
  markerDiameter: number,
): { readonly x0: number; readonly x1: number } {
  const x0 = spread === null ? labeled.x0 : Math.min(labeled.x0, spread.x)
  const x1 = spread === null ? labeled.x1 : Math.max(labeled.x1, spread.x + spread.width)
  if (deadlineX === null) return { x0, x1 }
  const half = deadlineHeadHalfWidthOf(markerDiameter)
  return { x0: Math.min(x0, deadlineX - half), x1: Math.max(x1, deadlineX + half) }
}

// see DM-3, FR-158
/** @purity pure */
export function dummyInkWidthOf(
  markerDiameter: number,
  axis: { readonly pxPerDay: number; readonly isTimeOfDayVisible: boolean },
): number {
  const mark = Math.min(markerDiameter * NOT_STORED_DUMMY_SIZES['S-247'], NOT_STORED_DUMMY_SIZES['S-180'])
  if (!axis.isTimeOfDayVisible) return mark
  return Math.max(mark, (axis.pxPerDay * NOT_STORED_DUMMY_SIZES['S-585']) / MINUTES_PER_CALENDAR_DAY)
}

/** @purity pure */
function dummyReachOf(
  shapeKind: ShapeKind,
  band: { readonly x: number; readonly width: number },
  settings: DrawnSettings,
): number {
  if (actualPlacementOf(shapeKind) === 'sideways') {
    return band.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
  }
  return band.x + band.width
}

// see LF-3, HF-19, FR-085
// WHY: the task group name's box is a floor too, or a zoomed-down task group loses the name that tells it apart.
// TRAP: never add the task group controls' lattice here: it floors no band (HF-19); LF-16 reserves it.
// TRAP: takes the DRAWN settings; the stored ones would miss the display ratio (FR-039).
/** @purity pure */
function bandFloorOf(depth: number, drawn: DrawnSettings): number {
  return depth === 1 ? drawn.taskGroupTitleFont * drawn.taskGroupTitleTopScale : drawn.taskGroupTitleFont
}

// see DS-13, FR-042
// WHY: no vertical zoom: the floor the author typed is never drawn lower than typed.
/** @purity pure */
function drawnMinHeightPxOf(minHeight: number | null, drawn: DrawnSettings): number {
  return (minHeight ?? 0) * displayScaleFractionOf(drawn)
}

// see LF-2, VG-2
// WHY: a task group with no Task still stacks one rectangle lane, or placing its first Task shifts every task group below.
/** @purity pure */
function packedLanesOf(laneHeights: readonly number[], emptyLane: number, laneGap: number): number {
  if (laneHeights.length === 0) return emptyLane + laneGap
  return laneHeights.reduce((sum, h) => sum + h + laneGap, 0)
}

// see LF-16, HF-19
// TRAP: the pinned band gets none: LF-16 reserves only below the last scrolling task group.
/** @purity pure */
function lastTaskGroupReserveOf(
  scrollingTaskGroups: readonly TaskGroupPlacement[],
  taskGroupControlsHeightPx: number | undefined,
): number {
  const last = scrollingTaskGroups[scrollingTaskGroups.length - 1]
  if (last === undefined) return 0
  const lattice = Math.max(taskGroupControlLatticeHeightPx(), taskGroupControlsHeightPx ?? 0)
  return Math.max(0, lattice - last.height)
}

// see T-068
/** @purity pure */
function membersByGroupOf(schedule: Schedule): ReadonlyMap<string, readonly TaskGroupMember[]> {
  const membersByGroup = new Map<string, TaskGroupMember[]>()
  for (const member of schedule.taskGroupMembers) {
    const groupMembers = membersByGroup.get(member.taskGroupId)
    if (groupMembers === undefined) membersByGroup.set(member.taskGroupId, [member])
    else groupMembers.push(member)
  }
  return membersByGroup
}

// see T-068
/** @purity pure */
export function layoutFromSchedule(
  schedule: Schedule,
  storedSettings: DocumentSettings,
  regions: ScreenRegions,
  groupDepthCap?: number,
  taskGroupControlsHeightPx?: number,
  shownTaskUids: ReadonlySet<number> | null = null,
): ScheduleLayout {
  const settings = drawnSettingsOf(storedSettings)
  const { pxPerDay, originDay, originX } = timeAxisOf(storedSettings, regions)
  const originSerial = originDay === null ? 0 : serialOf(originDay)

  const depthLimit = Math.min(groupDepthCap ?? groupDepthLimit(settings), settings.maxGroupDepth)
  const pinnedIds = new Set(settings.pinnedTaskGroupIds)
  const unfoldedTaskGroups = drawnGroups(schedule, settings, shownTaskUids)
  const keptOpenIds = keptInViewByTreeState(unfoldedTaskGroups, 'expandedAndTemporary')
  const rows = unfoldedTaskGroups.filter(
    (glyph) => glyph.depth <= depthLimit || pinnedIds.has(glyph.id) || keptOpenIds.has(glyph.id),
  )

  const taskByUid = new Map(schedule.tasks.map((text) => [text.uid, text]))
  const visualByUid = new Map(schedule.taskVisuals.map((value) => [value.taskUid, value]))
  const membersByGroup = membersByGroupOf(schedule)
  const assigneeLabels = assigneeLabelsOf(schedule)

  const within = workingCalendarOf(schedule)
  const reader = dayReaderFor(within, settings.isTimeOfDayVisible, shownInstantReader(schedule, storedSettings.viewTimeZone))
  // TRAP: S-232 alone decides; never tie it to isPlanVisible (S-227), or hiding the plan moves the name (FR-049).
  const datesWithYear = settings.isPlanDatesVisible ? isPlanSpanningYears(schedule, reader) : null
  const placements: TaskPlacement[] = []
  const taskGroupPlacements: TaskGroupPlacement[] = []

  let y = regions.taskGroupArea.y
  // TRAP: infinite seeds, not 0: 0 stretches the width to x = 0 when all content sits left of the origin.
  let widest = Number.NEGATIVE_INFINITY
  let leftmost = Number.POSITIVE_INFINITY
  const emptyLane = drawnExtentOf('rectangle', settings)
  const laneGap = verticalGapOf(settings)
  let capStop: StackSafetyCapStop | null = null

  for (const row of rows) {
    const drawnTasks = (membersByGroup.get(row.id) ?? [])
      .map((match) => taskByUid.get(match.taskUid))
      // WHY: TV-3 and FR-003 -- a task the filter leaves out is not laid, so the lanes stack what is drawn.
      .filter((text): text is Task => text !== undefined && (shownTaskUids === null || shownTaskUids.has(text.uid)))
      .map((task) => {
        const kind = shapeKindOf(visualByUid, task)
        const span = spanWidthOf(task, pxPerDay, reader)
        const glyph = milestoneGlyphOf(visualByUid, task)
        const oneDay = planEndsStandOnOneDay(task, reader)
        return { task, kind, glyph, span, oneDay, outline: outlineWidthOf(visualByUid.get(task.uid)?.strokeWidthPx, settings), width: shapeWidthOf(span, kind, settings) }
      })
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
    const measured = drawnTasks.map(({ task, kind, glyph, span, oneDay, outline, width }) => {
      const from = reader.edge(task.start, 'start', startSideOf(task))
      const foundAt = from === null ? originX : xAtEdge(from, originSerial, pxPerDay, originX)
      const x = kind === 'milestone' ? foundAt - width / 2 : foundAt
      const named = nameLabelOf(task, reader, datesWithYear, settings)
      const font = labelFontSize(kind, settings)
      const text = nameLabelWidthOf(named, font, settings)
      const fade = clampedFade(task, kind, fadeRoomOf(span, pxPerDay, settings), pxPerDay)
      const actual = actualSpanOf(task, reader, originSerial, pxPerDay, originX)
      const actualReach = actual === null ? null : actualReachOf(kind, actual, settings)
      const markerDiameter = markerDiameterOf(kind, font, settings)
      const dummyBand = dummyBandOf(kind, { x, width }, markerDiameter, { pxPerDay, isTimeOfDayVisible: reader.isTimeOfDayVisible })
      const dummyReach = actualReach !== null || from === null ? null : dummyReachOf(kind, dummyBand, settings)
      const planRight = x + width
      // TRAP: read no toggle here but S-63, which the drawing side reads: a toggle must not move a lane (T-038).
      const reference = labelReferenceOf(
        kind,
        { x, width },
        fade,
        actual ?? dummyBand,
        settings,
      )
      const marksShown = settings.isProgressMarkerVisible
      const namedFromPlanStart = isLaidBelow(kind)
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
      const labeledX1 = namedFromPlanStart
        ? Math.max(planRight, laid.nameX + text)
        : Math.max(planRight, referenceEnd, laid.nameX + text)
      // TRAP: never condition this on planActualDisplay: a toggle must not move a Task (T-038).
      const spread = actual !== null && actualPlacementOf(kind) === 'inside' ? actual : null
      const assigneeLabel = settings.isAssigneeVisible
        ? (assigneeLabels.get(task.uid) ?? NO_ASSIGNEE_MARK)
        : ''
      const percentLabel = settings.isPercentCompleteVisible ? percentLabelOf(task) : ''
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
      const deadlineX = deadlineXOf(task, kind, reader, originSerial, pxPerDay, originX)
      const labeled = { x0: assigneeAnchor - outsideWidth, x1: labeledX1 }
      // WHY: OC-8 is never counted: the late count is shown only in the EZ-6 tip (TL-12), never drawn.
      const occupied = occupiedSpanOf(labeled, spread, deadlineX, markerDiameter)
      return { task, kind, glyph, oneDay, outline, x, width, named, font, placement, actual, labelX,
               actualReach, dummyReach, fade, outsideLabel, outsideLabelWidth,
               occupiedX0: occupied.x0, occupiedX1: occupied.x1, markerAnchorX, text, deadlineX }
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
        // TRAP: break before the task group is placed: a partial task group leaves laneOf shorter than measured.
        if (lanes.length >= settings.stackSafetyCap) {
          capStop = { taskGroupId: row.id, cap: settings.stackSafetyCap }
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
      const reserved = drawnExtentOf(item.kind, settings, item.outline)
      const lane = laneOf[index]!
      if (reserved > laneHeights[lane]!) laneHeights[lane] = reserved
    })
    for (let step = 0; step < laneHeights.length; step++) {
      if (laneHeights[step] === 0) laneHeights[step] = emptyLane
    }
    const packed = packedLanesOf(laneHeights, emptyLane, laneGap)
    const height = Math.max(packed, emptyLane, drawnMinHeightPxOf(row.minHeightPx, settings), bandFloorOf(row.depth, settings))

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
        taskGroupId: row.id,
        shapeKind: item.kind,
        milestoneGlyph: item.glyph,
        stack: lane,
        x: item.x,
        width: item.width,
        planEndsStandOnOneDay: item.oneDay,
        ...placedFadeOf(item.task, item.fade),
        y: tops[lane]! + drawnEdgeOverhangOf(item.kind, item.outline) + labelLiftOf(item.kind, settings),
        outlineWidth: item.outline,
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
        label: item.named.name + item.named.labelDates,
        labelDates: item.named.labelDates,
        labelTextWidth: item.text,
        labelFontSize: item.font,
        outsideLabel: item.outsideLabel,
        outsideLabelWidth: item.outsideLabelWidth,
        occupiedX0: item.occupiedX0,
        occupiedX1: item.occupiedX1,
        deadlineX: item.deadlineX,
      })
      widest = Math.max(widest, item.occupiedX1)
      leftmost = Math.min(leftmost, item.occupiedX0)
    })

    taskGroupPlacements.push({
      taskGroupId: row.id,
      depth: row.depth,
      y,
      height,
      stackCount: lanes.length,
      stackTops: tops.length === 0 ? [y] : tops,
    })
    y += height + settings.taskGroupGap
  }

  const band = pinnedBandOf(taskGroupPlacements, settings, regions)
  const lifted = liftedTaskGroups(taskGroupPlacements, band)
  const shifted = shiftedPlacements(placements, band.shiftByTaskGroupId, band.droppedPinnedIds)

  const scrollingTaskGroups = lifted.filter((taskGroup) => taskGroup.isPinned !== true)
  const scrollOffsetY = scrollOffsetOf(scrollingTaskGroups, settings, band.scrollAreaY)
  const contentHeight =
    Math.max(0, band.scrollingContentHeight) + lastTaskGroupReserveOf(scrollingTaskGroups, taskGroupControlsHeightPx)
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
    taskGroups: scrolledTaskGroups(lifted, scrollOffsetY),
    placements: scrolledPlacements(shifted, scrollOffsetY, band.pinnedIdsPlaced),
    contentWidth,
    contentHeight,
    contentX0,
    pinnedBandHeight: band.height,
    scrollAreaY: band.scrollAreaY,
    stackSafetyCapReached: capStop,
    shownTaskUids,
  }
}

/** @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((part) => part.taskUid === taskUid) ?? null
}

export type LandedTarget = { readonly kind: 'task'; readonly taskUid: number } | { readonly kind: 'commentBox'; readonly commentBoxId: string }

// see SJ-5, SJ-6, SJ-10
// WHY: one box for where a jump lands and what its mark circles: the laid-out plan figure, or a comment box's body.
/** @purity pure */
export function landedShapeBoxOf(
  layout: ScheduleLayout,
  geometry: { readonly commentBoxes: readonly { readonly id: string; readonly body: ScreenRect }[] },
  target: LandedTarget,
): ScreenRect | null {
  if (target.kind === 'commentBox') return geometry.commentBoxes.find((one) => one.id === target.commentBoxId)?.body ?? null
  const placed = taskPlacement(layout, target.taskUid)
  return placed === null ? null : { x: placed.x, y: placed.y, width: placed.width, height: placed.planHeight }
}

// see FR-016, T-068
/** @purity pure */
export function taskGroupPlacesAtZoomY(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoomY: number,
  taskGroupControlsHeightPx?: number,
): readonly TaskGroupPlacement[] {
  return layoutFromSchedule(
    schedule,
    { ...settings, zoomY },
    regions,
    undefined,
    taskGroupControlsHeightPx,
  ).taskGroups
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
  readonly 'S-247': number
  readonly 'S-585': number
} = {
  'S-180': 30,
  'S-247': 0.5,
  'S-585': 60,
}

// see T-206
export const NOT_STORED_LABEL_SIZES: {
  readonly 'S-196': number
  readonly 'S-233': number
  readonly 'S-325': number
} = {
  'S-196': 2,
  'S-233': 1.5,
  'S-325': 0.85,
}

// see T-206
const NOT_STORED_DEADLINE_MARK_SIZES: {
  readonly 'S-365': number
  readonly 'S-366': number
  readonly 'S-367': number
} = {
  'S-365': 0.75,
  'S-366': 0.5,
  'S-367': 0.25,
}
// </generated>

// ScheduleLayout: public entry; places rows and tasks in one pass of table T-068, and fits the view.
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
  textOfDay,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroupMember,
  type TaskVisual,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import {
  drawnSettingsOf,
  rowControlLatticeHeightPx,
  type ScreenRegions,
} from '../screen-regions/screen-regions'
import { assigneeLabelsOf } from './assignee-label'
import { drawnGroups } from './drawn-rows'
import { groupDepthLimit, groupDepthThresholdOf, keptInViewByOpenMarks } from './group-level-of-detail'
import {
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  outwardStartOf,
} from './label-placement'
import { labelWidth } from './label-width'
import { nameLabelOf, nameLabelWidthOf, planDatesSpanYears } from './name-label'
import { outsideLabelOf, percentLabelOf } from './percent-label'
import { liftedRows, pinnedBandOf, shiftedPlacements } from './pinned-band'
import { scrollOffsetOf, scrolledPlacements, scrolledRows } from './row-scroll'
import {
  actualPlacementOf,
  actualReachOf,
  drawnEdgeOverhangOf,
  drawnExtentOf,
  labelFontSize,
  labelLiftOf,
  laidBelow,
  markerDiameterOf,
  planHeightOf,
  shapeHeightOf,
  zoomYAtPlanHeightFloor,
} from './shape-cross-sections'
import { dateAtX, rulerTierOf, serialOf, timeAxisOf, xFromDay, xOnTimeAxis } from './time-axis'

export { dateAtX, rulerTierOf, tickStrideOf, timeAxisOf, xFromDay } from './time-axis'
export type { TimeAxis } from './time-axis'
export { labelUnits } from './label-width'
export { labelledAssigneeUidOf } from './assignee-label'
export {
  markerDiameterOf,
  thinEndHalfHeightOf,
  zoomYAtRectangleLabelFont,
} from './shape-cross-sections'
export { groupDepthLimit, groupDepthThresholdOf } from './group-level-of-detail'
export {
  NOT_STORED_SIZES,
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  outwardStartOf,
  standsUndecidedResume,
} from './label-placement'
export type { LabelLayout, LabelReference } from './label-placement'

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
  // TRAP: the tail of label drawn at labelFontSize x S-325, its leading space included; label ends with it.
  readonly labelDates: string
  // TRAP: the name at labelFontSize plus labelDates at labelFontSize x S-325; T-273 and OC-1 read this sum.
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

// TRAP: lives for one layoutFromSchedule run; kept longer it answers from a stale calendar.
export interface DayReader {
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

const NO_ASSIGNEE_MARK = '-'

// see VG-2, VG-5, LF-2, DS-10
/** @purity pure */
function verticalGapOf(settings: DocumentSettings): number {
  return settings.stackGap + settings.dependencyWidth + settings.stackGap
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
export function dummyInkWidthOf(markerDiameter: number): number {
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

// see LF-3, HF-19, FR-085
// WHY: the row name's box is a floor too, or a zoomed-down row loses the name that tells it apart.
// TRAP: never add the row controls' lattice here: it floors no band (HF-19); LF-16 reserves it.
// TRAP: takes the DRAWN settings; the stored ones would miss the display ratio (FR-039).
/** @purity pure */
function bandFloorOf(depth: number, drawn: DocumentSettings): number {
  return depth === 1 ? drawn.rowTitleFont * drawn.rowTitleTopScale : drawn.rowTitleFont
}

// see LF-2, VG-2
// WHY: a row with no Task still stacks one rectangle lane, or placing its first Task shifts every row below.
/** @purity pure */
function packedLanesOf(laneHeights: readonly number[], emptyLane: number, laneGap: number): number {
  if (laneHeights.length === 0) return emptyLane + laneGap
  return laneHeights.reduce((sum, h) => sum + h + laneGap, 0)
}

// see LF-16, HF-19
// TRAP: the pinned band gets none: LF-16 reserves only below the last scrolling row.
/** @purity pure */
function lastRowReserveOf(
  scrollingRows: readonly RowPlacement[],
  rowControlsHeightPx: number | undefined,
): number {
  const last = scrollingRows[scrollingRows.length - 1]
  if (last === undefined) return 0
  const lattice = Math.max(rowControlLatticeHeightPx(), rowControlsHeightPx ?? 0)
  return Math.max(0, lattice - last.height)
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
      const named = nameLabelOf(task, reader, datesWithYear, settings)
      const font = labelFontSize(kind, settings)
      const text = nameLabelWidthOf(named, font, settings)
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
      return { task, kind, glyph, oneDay, x, width, named, font, placement, actual, labelX,
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
    const packed = packedLanesOf(laneHeights, emptyLane, laneGap)
    const height = Math.max(packed, emptyLane, row.height ?? 0, bandFloorOf(row.depth, settings))

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
        label: item.named.name + item.named.labelDates,
        labelDates: item.named.labelDates,
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
  const contentHeight =
    Math.max(0, band.scrollingContentHeight) + lastRowReserveOf(scrollingRows, rowControlsHeightPx)
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

/** @purity pure */
export function taskPlacement(layout: ScheduleLayout, taskUid: number): TaskPlacement | null {
  return layout.placements.find((part) => part.taskUid === taskUid) ?? null
}

// see FR-055, OP-10
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
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

const FIT_MARGIN_SIDES = 2

// WHY: the labels follow zoomY and not zoomX, so the extent is near-linear in zoomX and a few
// secant steps land it; a fixed count keeps a stepped extent from running on.
const FIT_SOLVE_STEPS = 6

// WHY: a width closer than half a pixel to the room draws the same picture.
const FIT_WIDTH_TOLERANCE_PX = 0.5

interface FitRun {
  readonly zoomX: number
  readonly run: ScheduleLayout
}

// see FR-055, LF-16
/** @purity pure */
function fitsRowArea(run: ScheduleLayout, regions: ScreenRegions): boolean {
  // STOP: spec does not decide whether a run stopped by ST-7 fits; here it never does. Looked in ST-7, FR-055
  // @provisional PND-479
  if (run.stackSafetyCapReached !== null) return false
  const remainderTop = run.scrollAreaY ?? regions.rowArea.y
  return run.contentHeight <= regions.rowArea.y + regions.rowArea.height - remainderTop
}

// see FR-055
/** @purity pure */
function deepestFittingDepth(
  deepest: number,
  runAtCap: (cap: number) => ScheduleLayout,
  fits: (run: ScheduleLayout) => boolean,
): number {
  for (let candidate = deepest; candidate >= 1; candidate--) {
    if (fits(runAtCap(candidate))) return candidate
  }
  return 1
}

// see FR-055
/** @purity pure */
function nextFitZoomX(last: FitRun, before: FitRun | undefined, room: number): number {
  const width = last.run.contentWidth
  if (width <= 0) return last.zoomX
  if (before !== undefined && before.zoomX !== last.zoomX) {
    const slope = (width - before.run.contentWidth) / (last.zoomX - before.zoomX)
    if (slope > 0) return last.zoomX + (room - width) / slope
  }
  return (last.zoomX * room) / width
}

/** @purity pure */
function isWidthSettled(run: ScheduleLayout, room: number): boolean {
  const spare = room - run.contentWidth
  return run.contentWidth <= 0 || (spare >= 0 && spare <= FIT_WIDTH_TOLERANCE_PX)
}

// see FR-055
// WHY: the widest run that fits; when none does (the labels alone are wider), the narrowest one.
/** @purity pure */
function widthFittedRun(
  runAtX: (zoomX: number) => ScheduleLayout,
  from: number,
  room: number,
  zoom: NotStoredZoom,
): FitRun {
  const tried: FitRun[] = [{ zoomX: from, run: runAtX(from) }]
  for (let step = 1; step < FIT_SOLVE_STEPS; step++) {
    const last = tried[tried.length - 1]!
    if (isWidthSettled(last.run, room)) break
    const next = clampedZoom(nextFitZoomX(last, tried[tried.length - 2], room), zoom)
    if (!(next > 0) || tried.some((one) => one.zoomX === next)) break
    tried.push({ zoomX: next, run: runAtX(next) })
  }
  const fitting = tried.filter((one) => one.run.contentWidth <= room)
  const pool = fitting.length > 0 ? fitting : tried
  const zoomX = (fitting.length > 0 ? Math.max : Math.min)(...pool.map((one) => one.zoomX))
  return pool.find((one) => one.zoomX === zoomX)!
}

// see FR-055
/** @purity pure */
function landedFit(
  deepestFitting: number,
  landingAt: (depth: number) => number,
  solveAt: (depth: number, zoomY: number) => FitRun,
  fits: (run: ScheduleLayout) => boolean,
): { readonly zoomY: number; readonly fitted: FitRun } {
  for (let depth = deepestFitting; ; depth--) {
    const zoomY = landingAt(depth)
    const fitted = solveAt(depth, zoomY)
    if (depth <= 1 || fits(fitted.run)) return { zoomY, fitted }
  }
}

// see FR-055, S-177
/** @purity pure */
function fittedLeftEdge(
  chosen: ScheduleLayout,
  margin: number,
): { readonly day: CalendarDay; readonly offset: number } | null {
  if (chosen.contentX0 === null || !(chosen.pxPerDay > 0)) return null
  const leftX = chosen.contentX0 - margin
  const day = dateAtX(chosen, leftX)
  if (day === null) return null
  const into = (leftX - xFromDay(chosen, day)) / chosen.pxPerDay
  return { day, offset: into > 0 && into < 1 ? into : 0 }
}

// see FR-055, S-332
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
  // TRAP: pass rowControlsHeightPx on, or the LF-16 reserve measures short and a depth too deep is chosen.
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(
      schedule, { ...settings, zoomX, zoomY }, regions, cap, undefined, rowControlsHeightPx,
    )

  const atUnity = runAt(1, floorZoomY, deepest)
  if (atUnity.rows.length === 0 && atUnity.stackSafetyCapReached === null) {
    const { scrollDate, scrollGroupId } = settings
    return { zoomX: 1, zoomY: 1, scrollDate, scrollDayOffset: 0, scrollGroupId, floorZoomY }
  }
  const margin = regions.rowArea.width * NOT_STORED_FIT_MARGIN['S-332']
  const room = regions.rowArea.width - FIT_MARGIN_SIDES * margin
  const from = atUnity.contentWidth <= 0 ? 1 : clampedZoom(room / atUnity.contentWidth, zoom)
  const fits = (run: ScheduleLayout): boolean => fitsRowArea(run, regions)
  const landed = landedFit(
    deepestFittingDepth(deepest, (cap) => runAt(from, floorZoomY, cap), fits),
    (depth) => landingZoomY(depth, settings, zoom.step),
    (depth, zoomY) =>
      widthFittedRun((zoomX) => runAt(zoomX, Math.max(zoomY, floorZoomY), depth), from, room, zoom),
    fits,
  )
  const chosen = landed.fitted.run
  const left = fittedLeftEdge(chosen, margin)
  return {
    zoomX: landed.fitted.zoomX,
    zoomY: landed.zoomY,
    scrollDate: left === null ? settings.scrollDate : textOfDay(left.day),
    scrollDayOffset: left === null ? 0 : left.offset,
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
  readonly 'S-325': number
} = {
  'S-196': 2,
  'S-233': 1.5,
  'S-325': 0.85,
}

// see T-206
const NOT_STORED_FIT_MARGIN: {
  readonly 'S-332': number
} = {
  'S-332': 0.025,
}
// </generated>

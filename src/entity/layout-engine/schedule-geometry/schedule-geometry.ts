// File: ScheduleGeometry: public entry; assembles the vertices of everything drawn on the schedule in one pass, and re-exports what the siblings hold.
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6

import type { DocumentSettings, DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  dayOf,
  edgeInstantOf,
  instantOf,
  instantOnSideReader,
  startSideOf,
  workingCalendarOf,
  type BaselineTask,
  type CalendarDay,
  type DateTimeSide,
  type InstantOnSide,
  type progressMarkerOf,
  type Schedule,
  type Task,
  type TaskGroup,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import { taskUidsIn, type Selection } from '../../document-model/selection/selection'
import {
  inTreeOrder,
  isDroppedByTreeState,
  thinEndHalfHeightOf,
  xFromDay,
  xOfInstant,
  type TaskGroupPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import { drawnSettingsOf, type ScreenRect, type ScreenRegions } from '../screen-regions/screen-regions'
import { anchorSnapsOf, commentGeometry, type AnchorSnap } from './comment-box'
import {
  hasPlanDates,
  laneSpansOf,
  placedEndOf,
  plannedPlacementsOf,
  routedDependency,
  selectedLinksOf,
  standingEndOf,
  type LinkEnd,
  type SightedEnd,
} from './dependency-route'
import { dualCursorGeometry, type DualCursorDates } from './dual-cursor'
import { highlightGeometry } from './highlight-box'
import { progressLineOf } from './progress-line'
import { isThinShape, taskGeometryOf, thinTierMiddle } from './task-figures'
import { parentTaskGeometryOf, type ParentTaskFamilies, type ParentTaskGeometry } from './parent-task-arrows'

export { anchorSnapsOf, commentAnchorPointOf, freeAnchorPointOf, leaderOf } from './comment-box'
export type { AnchorSnap, AnchorSnapPoint, AnchorTarget, AnchorTaskFigure } from './comment-box'
export { arrowHeadOf, selectedLinksOf } from './dependency-route'
export type { ParentTaskFamilies } from './parent-task-arrows'

export interface Point {
  readonly x: number
  readonly y: number
}

export type Path = readonly Point[]

export interface SpanDot {
  readonly at: Point
  readonly radius: number
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_assets/fig-milestone-shapes.svg (figure F-044; the layer roles of LF-18, table T-221)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift (tools/generate_milestone_shapes.py).
export type MilestoneLayerRole = 'body' | 'inner' | 'dot' | 'shade'
// </generated>

export type PathSegment =
  | { readonly command: 'M' | 'L'; readonly to: Point }
  | { readonly command: 'Q'; readonly control: Point; readonly to: Point }
  | {
      readonly command: 'A'
      readonly radiusX: number
      readonly radiusY: number
      readonly rotation: number
      readonly largeArc: boolean
      readonly sweep: boolean
      readonly to: Point
    }
  | { readonly command: 'Z' }

export interface MilestoneLayer {
  readonly role: MilestoneLayerRole
  readonly evenOdd: boolean
  readonly segments: readonly PathSegment[]
}

export type BarGeometry =
  | {
      readonly form: 'outline'
      // Trap: a layered milestone joins its body rings by bridges walked there and back; read it with the non-zero rule.
      readonly points: Path
      readonly layers?: readonly MilestoneLayer[]
    }
  | {
      readonly form: 'line'
      readonly from: Point
      readonly to: Point
      readonly strokeWidth: number
      readonly head: Path | null
      readonly dots: readonly SpanDot[]
    }

export type ProgressSymbol = ReturnType<typeof progressMarkerOf>

export interface MarkerGeometry {
  readonly symbol: ProgressSymbol
  readonly center: Point
  readonly radius: number
  readonly standsOffX?: number
}

export interface ResumeGeometry {
  readonly arm: Path
  readonly head: Path
  readonly isValid: boolean
  readonly box: ScreenRect
  readonly dash: Path
  readonly isUndecided: boolean
}

export interface DummyGeometry {
  readonly grab: 'GA-5' | 'GA-6' | 'GA-17' | 'GA-21' | 'GA-22'
  readonly at: Point
  readonly ink: ScreenRect
  // Why: optional, not required: a hand-built geometry that only asks what a press hits need not draw one.
  readonly figure?: BarGeometry
}

export interface DeadlineGeometry {
  readonly outline: Path
  readonly haloWidth: number
}

export interface TaskGeometry {
  readonly taskUid: number
  readonly shapeKind: TaskPlacement['shapeKind']
  readonly plan: BarGeometry | null
  readonly actual: BarGeometry | null
  readonly milestoneFigure: BarGeometry | null
  readonly planEndsStandOnOneDay: boolean
  readonly guides: readonly Path[]
  readonly marker: MarkerGeometry | null
  readonly resume: ResumeGeometry | null
  readonly dummies: readonly DummyGeometry[]
  readonly fadeHandles: readonly Point[]
  readonly label: ScreenRect | null
  readonly assigneeLabel: ScreenRect | null
  // Why: FR-009 / RT-4a; optional, read as true when absent: a hand-built geometry may not say.
  readonly hasPlanDates?: boolean
  // Why: FR-045 / T-304; optional, read as null when absent: a hand-built geometry may not say.
  readonly deadline?: DeadlineGeometry | null
  // Why: LF-15's band of this copy (one Task may be drawn in several); optional for hand-built geometry.
  readonly taskGroupId?: string
}

// Why: decided here once, where EL-1, EL-2 and EL-20 are judged, so the click (EL-10 .. EL-12) never judges them again.
export interface FarEndGeometry {
  readonly isAcrossInTaskGroupArea: boolean
  readonly isDownInTaskGroupPlace: boolean
  readonly taskGroupId: string
  readonly middleX: number
  readonly undrawnTaskGroupDepth: number | null
  readonly foldedRowId: string | null
}

export interface ContinuationGeometry {
  readonly dots: readonly Point[]
  readonly radius: number
  readonly farUid: number
  readonly far: FarEndGeometry
}

export type Elision = 'EL-3' | 'EL-4' | 'EL-5' | 'EL-6'

export interface DependencyGeometry {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly pattern: 'RP-1' | 'RP-2' | 'RP-3' | 'RP-4' | 'RP-5' | 'RP-6' | 'RP-7' | 'RP-8'
  readonly points: Path
  readonly elision: Elision
  readonly drawnPoints: Path
  readonly continuation: ContinuationGeometry | null
  // Why: optional, not required: a hand-built geometry that only asks what a press hits may give no ink.
  readonly strokeWidth?: number
  readonly head?: Path
  readonly wholeRouteHead?: Path
}

// Why: the look is already defaulted and clamped, so the renderer draws it as it stands.
export interface HighlightGeometry {
  readonly id: string
  readonly box: ScreenRect
  readonly cornerRadiusPx: number | null
  readonly strokeWidthPx: number
  // Why: null is the project theme color (FR-019, AT-146), painted from the theme by the renderer.
  readonly fillColor: string | null
  readonly fillOpacity: number
  readonly hasSideHandles: { readonly leftRight: boolean; readonly topBottom: boolean }
}

export interface CommentGeometry {
  readonly id: string
  readonly anchor: Point
  readonly body: ScreenRect
  readonly lines: readonly string[]
  readonly fontSize: number
  readonly strokeWidthPx: number
  readonly fillOpacity: number
  readonly strokeColor: string | null
  readonly fillColor: string | null
  readonly textColor: string | null
}

export interface DualCursorGeometry {
  readonly cursorAX: number
  readonly cursorBX: number
  readonly top: number
  readonly bottom: number
}

interface BaselineOutline {
  readonly taskUid: number
  readonly kind: 'rectangle' | 'diamond'
  readonly box: ScreenRect
  readonly isPinned: boolean
}

type BandLink = Pick<DependencyGeometry, 'predecessorUid' | 'successorUid' | 'elision'>

export interface ScheduleGeometry {
  readonly tasks: readonly TaskGeometry[]
  readonly baselineOutlines: readonly BaselineOutline[]
  readonly dependencies: readonly DependencyGeometry[]
  readonly progressLine: Path
  readonly statusLine: { readonly x: number; readonly top: number; readonly bottom: number } | null
  readonly dualCursor: DualCursorGeometry | null
  readonly highlightBoxes: readonly HighlightGeometry[]
  readonly commentBoxes: readonly CommentGeometry[]
  // Why: optional, read as none when absent: a hand-built geometry draws no family.
  readonly parentTasks?: ParentTaskGeometry
  readonly pinnedBand?: {
    readonly scrollTop: number
    readonly pinnedTaskUids: ReadonlySet<number>
  }
}

/** @purity pure */
export function point(x: number, y: number): Point {
  return { x, y }
}

export interface GeometryInputs {
  readonly settings: DrawnSettings
  readonly layout: ScheduleLayout
  readonly within: WorkingCalendar
  readonly taskByUid: ReadonlyMap<number, Task>
  readonly statusDate: CalendarDay | null
  readonly statusInstant?: number | null
  readonly isPlanVisible: boolean
  readonly isActualVisible: boolean
  readonly selectedTaskUids: ReadonlySet<number>
  readonly selectedLinks: ReadonlySet<string>
  // Trap: made and dropped inside one call; holding it longer is a cache Chapter 5.6 must first record (R2.20).
  readonly dummyEndByFrom: Map<string, CalendarDay>
  readonly delayDiagnostics?: {
    readonly shown: boolean
    readonly symbolByUid: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'>
  }
}

interface EndReading {
  readonly inputs: GeometryInputs
  readonly regions: ScreenRegions
  readonly placedByUid: ReadonlyMap<number, TaskPlacement>
  readonly taskGroupById: ReadonlyMap<string, TaskGroupPlacement>
  readonly groupById: ReadonlyMap<string, TaskGroup>
  readonly groupOfTask: ReadonlyMap<number, string>
  readonly pinnedIds: ReadonlySet<string>
  readonly treePositionOf: () => ReadonlyMap<string, number>
}

/** @purity pure */
function readingOf(schedule: Schedule, inputs: GeometryInputs, regions: ScreenRegions): EndReading {
  const groupOfTask = new Map<number, string>()
  for (const member of schedule.taskGroupMembers) {
    if (!groupOfTask.has(member.taskUid)) groupOfTask.set(member.taskUid, member.taskGroupId)
  }
  const groupById = new Map(schedule.taskGroups.map((group) => [group.id, group]))
  let treePosition: ReadonlyMap<string, number> | null = null
  return {
    inputs,
    regions,
    placedByUid: new Map(plannedPlacementsOf(inputs).map((one) => [one.taskUid, one])),
    taskGroupById: new Map(inputs.layout.taskGroups.map((taskGroup) => [taskGroup.taskGroupId, taskGroup])),
    groupById,
    groupOfTask,
    pinnedIds: new Set(inputs.settings.pinnedTaskGroupIds),
    /** @purity non-pure */
    treePositionOf: () => {
      treePosition ??= new Map(inTreeOrder(schedule.taskGroups, groupById).map((group, at) => [group.id, at]))
      return treePosition
    },
  }
}

// Spec: IMPS-1880
/** @purity pure */
function planSpanWidthOf(layout: ScheduleLayout, x: number, finish: CalendarDay, settings: DrawnSettings): number {
  return Math.max(xFromDay(layout, finish) + layout.pxPerDay - x, settings.minShapeWidth)
}

/** @purity pure */
function overlapOf(from: number, to: number, lower: number, upper: number): number {
  return Math.min(to, upper) - Math.max(from, lower)
}

// Spec: EL-1, EL-2, FR-098, LF-14
// Why: an EL-2 end stands on a zero-height line, so it is never inside its task group's place down.
/** @purity pure */
function farEndOf(end: LinkEnd, taskGroupId: string, undrawnTaskGroupDepth: number | null, foldedRowId: string | null,
                  reading: EndReading): FarEndGeometry {
  const area = reading.regions.taskGroupArea
  const bandFloor = reading.inputs.layout.scrollAreaY ?? area.y
  const isPinned = reading.taskGroupById.get(taskGroupId)?.isPinned === true
  const top = isPinned ? area.y : bandFloor
  const bottom = isPinned ? bandFloor : area.y + area.height
  return {
    isAcrossInTaskGroupArea: overlapOf(end.x, end.x + end.width, area.x, area.x + area.width) > 0,
    isDownInTaskGroupPlace: overlapOf(end.top, end.bottom, top, bottom) > 0,
    taskGroupId,
    middleX: (end.x + (end.x + end.width)) / 2,
    undrawnTaskGroupDepth,
    foldedRowId,
  }
}

// Spec: EL-1
/** @purity pure */
function isSeen(far: FarEndGeometry): boolean {
  return far.isAcrossInTaskGroupArea && far.isDownInTaskGroupPlace
}

// Spec: EL-2, EL-20
/** @purity pure */
function scrollingFloorOf(reading: EndReading, counts: (taskGroup: TaskGroupPlacement, at: number) => boolean): number {
  let floor = reading.inputs.layout.scrollAreaY ?? reading.regions.taskGroupArea.y
  reading.inputs.layout.taskGroups.forEach((one, at) => {
    if (one.isPinned !== true && counts(one, at)) floor = one.y + one.height
  })
  return floor
}

// Spec: EL-2
/** @purity pure */
function standingYOf(taskGroup: TaskGroupPlacement, reading: EndReading): number {
  if (taskGroup.isPinned !== true) return taskGroup.y + taskGroup.height
  const stop = reading.inputs.layout.taskGroups.findIndex((one) => one.taskGroupId === taskGroup.taskGroupId)
  return scrollingFloorOf(reading, (_one, at) => stop < 0 || at < stop)
}

// Spec: EL-20, LC-9
/** @purity pure */
function unhiddenYOf(own: TaskGroup, reading: EndReading): number {
  const position = reading.treePositionOf()
  const ownAt = position.get(own.id) ?? Number.POSITIVE_INFINITY
  return scrollingFloorOf(reading, (one) => (position.get(one.taskGroupId) ?? ownAt) < ownAt)
}

interface Climb {
  readonly taskGroup: TaskGroupPlacement | null
  readonly step: number
  readonly isFolded: boolean
}

// Spec: EL-2, EL-20, HF-7
/** @purity pure */
function climbOf(own: TaskGroup, reading: EndReading): Climb | null {
  const { settings } = reading.inputs
  const isFolded = isDroppedByTreeState(own, reading.groupById, settings)
  let group: TaskGroup = own
  for (let step = 0; step < settings.maxGroupDepth; step += 1) {
    const parent: TaskGroup | undefined =
      group.parentId === null ? undefined : reading.groupById.get(group.parentId)
    if (parent === undefined) return { taskGroup: null, step, isFolded }
    const taskGroup = reading.taskGroupById.get(parent.id)
    if (taskGroup !== undefined) return { taskGroup, step, isFolded }
    group = parent
  }
  return null
}

// Spec: EL-2, EL-10, EL-20, RT-4a, LC-1
// Why: a pin the band cannot hold and a task group past the stack safety cap are no group LOD row; RT-4a keeps them.
// Why: a fold or a hide on the way up makes the end an EL-20 end, a pinned task group too; it stands like an EL-2 end.
/** @purity pure */
function lodEndOf(task: Task, reading: EndReading): SightedEnd | null {
  const { layout, settings } = reading.inputs
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  const taskGroupId = reading.groupOfTask.get(task.uid)
  const own = taskGroupId === undefined ? undefined : reading.groupById.get(taskGroupId)
  if (start === null || finish === null || own === undefined || layout.stackSafetyCapReached !== null) return null
  const drawnTaskGroup = reading.taskGroupById.get(own.id)
  if (drawnTaskGroup !== undefined) return filteredEndOf(task, own, drawnTaskGroup, reading)
  const climb = climbOf(own, reading)
  if (climb === null) return null
  const x = xFromDay(layout, start)
  const width = planSpanWidthOf(layout, x, finish, settings)
  if (climb.taskGroup === null) return unparentedEndOf(task, own, climb, x, width, reading)
  if (!climb.isFolded && reading.pinnedIds.has(own.id)) return null
  const end = standingEndOf(task.uid, x, width, standingYOf(climb.taskGroup, reading))
  // Why: the own task group lies step + 1 levels below the drawn ancestor it stands under.
  const depth = climb.taskGroup.depth + climb.step + 1
  return { end, far: farEndOf(end, own.id, depth, climb.isFolded ? own.id : null, reading) }
}

// Spec: EL-20, TV-3, LC-9
// Why: with no drawn ancestor, a folded end or a filtered end stands at the last drawn task group before its own.
/** @purity pure */
function unparentedEndOf(task: Task, own: TaskGroup, climb: Climb, x: number, width: number,
                         reading: EndReading): SightedEnd | null {
  const shown = reading.inputs.layout.shownTaskUids
  const isFiltered = shown !== undefined && shown !== null && !shown.has(task.uid)
  if (!(climb.isFolded || isFiltered) || reading.inputs.settings.levelZeroTreeState === 'collapsed') return null
  const end = standingEndOf(task.uid, x, width, unhiddenYOf(own, reading))
  const foldedRowId = climb.isFolded ? own.id : null
  return { end, far: farEndOf(end, own.id, climb.isFolded ? climb.step + 1 : null, foldedRowId, reading) }
}

// Spec: EL-20, TV-3
/** @purity pure */
function filteredEndOf(task: Task, own: TaskGroup, taskGroup: TaskGroupPlacement, reading: EndReading): SightedEnd | null {
  const { layout, settings } = reading.inputs
  const shown = layout.shownTaskUids
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (shown === undefined || shown === null || shown.has(task.uid) || start === null || finish === null) return null
  const x = xFromDay(layout, start)
  const end = standingEndOf(task.uid, x, planSpanWidthOf(layout, x, finish, settings), standingYOf(taskGroup, reading))
  return { end, far: farEndOf(end, own.id, null, null, reading) }
}

/** @purity pure */
function sightedEndOf(uid: number, reading: EndReading): SightedEnd | null {
  const placed = reading.placedByUid.get(uid)
  if (placed !== undefined) {
    const end = placedEndOf(placed, reading.inputs.settings)
    return { end, far: farEndOf(end, placed.taskGroupId, null, null, reading) }
  }
  const task = reading.inputs.taskByUid.get(uid)
  return task === undefined ? null : lodEndOf(task, reading)
}

// Spec: IMPS-316
/** @purity pure */
function elisionOf(predecessorSeen: boolean, successorSeen: boolean): Elision {
  if (predecessorSeen) return successorSeen ? 'EL-3' : 'EL-4'
  return successorSeen ? 'EL-5' : 'EL-6'
}

// Spec: RT-4a, FR-009, T-303, EL-15, IMPS-385, RT-6, NG-3, IMPS-1662
/** @purity pure */
function dependenciesOf(schedule: Schedule, inputs: GeometryInputs, regions: ScreenRegions): DependencyGeometry[] {
  if (!inputs.settings.isDependencyVisible || !inputs.settings.isPlanVisible) return []
  const reading = readingOf(schedule, inputs, regions)
  const lanes = laneSpansOf(inputs.layout, inputs.settings)
  const out: DependencyGeometry[] = []
  for (const successor of schedule.tasks) {
    if (successor.dependencies.length === 0) continue
    const to = sightedEndOf(successor.uid, reading)
    if (to === null) continue
    for (const link of successor.dependencies) {
      const from = sightedEndOf(link.predecessorUid, reading)
      if (from === null) continue
      const elision = elisionOf(isSeen(from.far), isSeen(to.far))
      out.push(routedDependency(inputs, from, to, link.linkType, elision, lanes))
    }
  }
  return out
}

// Spec: BL-2, XS-5, XS-6
/** @purity pure */
function planExtentOf(placed: TaskPlacement, settings: DrawnSettings): { readonly top: number; readonly height: number } {
  if (!isThinShape(placed.shapeKind)) return { top: placed.y, height: placed.planHeight }
  const half = thinEndHalfHeightOf(placed.shapeKind, settings)
  return { top: thinTierMiddle(placed, settings, false) - half, height: half * 2 }
}

// Spec: BL-2
/** @purity pure */
function baselineEdgeXOf(text: string | null, side: DateTimeSide, reading: DateTimeSide,
                         inputs: GeometryInputs, onSide: InstantOnSide): number | null {
  const edge = edgeInstantOf(text, side, () => onSide(text, reading), inputs.settings.isTimeOfDayVisible, dayOf)
  return edge === null ? null : xOfInstant(inputs.layout, edge)
}

// Spec: BL-1, BL-2
/** @purity pure */
function baselineOutlineOf(baseline: BaselineTask, placed: TaskPlacement, isPinned: boolean,
                           inputs: GeometryInputs, onSide: InstantOnSide): BaselineOutline | null {
  const reading = startSideOf({ milestone: baseline.milestone === true })
  const x = baselineEdgeXOf(baseline.start, 'start', reading, inputs, onSide)
  const right = baselineEdgeXOf(baseline.finish, 'finish', 'finish', inputs, onSide)
  if (x === null || right === null) return null
  const { top, height } = planExtentOf(placed, inputs.settings)
  const taskUid = baseline.uid
  if (baseline.milestone === true) {
    return { taskUid, kind: 'diamond', box: { x: x - height / 2, y: top, width: height, height }, isPinned }
  }
  const width = Math.max(right - x, inputs.settings.minShapeWidth)
  return { taskUid, kind: 'rectangle', box: { x, y: top, width, height }, isPinned }
}

// Spec: FR-015, BL-1, BL-4, IMPS-1447, IMPS-1448, IMPS-1449
// Trap: never gate on isPlanVisible as dependenciesOf does: the overlay is drawn with the plan hidden.
/** @purity pure */
function baselineOutlinesOf(schedule: Schedule, inputs: GeometryInputs): BaselineOutline[] {
  if (!inputs.settings.isBaselineVisible || schedule.baselineTasks.length === 0) return []
  const placedByUid = new Map<number, TaskPlacement>()
  for (const placed of inputs.layout.placements) {
    if (!placedByUid.has(placed.taskUid)) placedByUid.set(placed.taskUid, placed)
  }
  const pinnedIds = new Set<string>()
  for (const taskGroup of inputs.layout.taskGroups) {
    if (taskGroup.isPinned === true) pinnedIds.add(taskGroup.taskGroupId)
  }
  const onSide = instantOnSideReader(inputs.within)
  const out: BaselineOutline[] = []
  for (const baseline of schedule.baselineTasks) {
    const placed = placedByUid.get(baseline.uid)
    if (placed === undefined) continue
    const outline = baselineOutlineOf(baseline, placed, pinnedIds.has(placed.taskGroupId), inputs, onSide)
    if (outline !== null) out.push(outline)
  }
  return out
}

// Spec: FR-046, FR-014, CU-1, FR-158, IMPS-514, IMPS-521, IMPS-522, IMPS-1444
/** @purity pure */
export function statusLineXOf(inputs: GeometryInputs, statusDate: CalendarDay): number {
  const instant = inputs.settings.isTimeOfDayVisible ? inputs.statusInstant ?? null : null
  return instant === null ? xFromDay(inputs.layout, statusDate) : xOfInstant(inputs.layout, instant)
}

// Spec: IMPS-526
/** @purity pure */
function statusLineOf(inputs: GeometryInputs, regions: ScreenRegions): ScheduleGeometry['statusLine'] {
  if (inputs.statusDate === null) return null
  const area = regions.taskGroupArea
  return { x: statusLineXOf(inputs, inputs.statusDate), top: area.y, bottom: area.y + area.height }
}

// Spec: CP-6, LC-10, LC-11, RV-5, SWS-4
/** @purity pure */
export function geometryFromLayout(
  schedule: Schedule,
  storedSettings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
  selection: Selection,
  dualCursor: DualCursorDates | null,
  delayDiagnostics?: GeometryInputs['delayDiagnostics'],
  parentTaskFamilies: ParentTaskFamilies | null = null,
): ScheduleGeometry {
  const settings = drawnSettingsOf(storedSettings)
  const inputs: GeometryInputs = {
    settings,
    layout,
    within: workingCalendarOf(schedule),
    taskByUid: new Map(schedule.tasks.map((one) => [one.uid, one])),
    statusDate: dayOf(schedule.project.statusDate),
    statusInstant: instantOf(schedule.project.statusDate),
    isPlanVisible: settings.isPlanVisible,
    isActualVisible: settings.isActualVisible,
    selectedTaskUids: new Set(taskUidsIn(selection)),
    selectedLinks: selectedLinksOf(schedule, selection),
    dummyEndByFrom: new Map<string, CalendarDay>(),
    ...(delayDiagnostics === undefined ? {} : { delayDiagnostics }),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) {
      tasks.push({ ...taskGeometryOf(inputs, task, placed), hasPlanDates: hasPlanDates(task), taskGroupId: placed.taskGroupId })
    }
  }

  const highlights = highlightGeometry(schedule, layout)
  return {
    tasks,
    baselineOutlines: baselineOutlinesOf(schedule, inputs),
    dependencies: dependenciesOf(schedule, inputs, regions),
    progressLine: progressLineOf(inputs),
    statusLine: statusLineOf(inputs, regions),
    dualCursor: dualCursorGeometry(dualCursor, layout, regions),
    highlightBoxes: highlights,
    commentBoxes: commentGeometry(schedule, settings, layout, snapsForTips(schedule, tasks, highlights)),
    parentTasks: parentTaskGeometryOf(inputs, parentTaskFamilies),
    ...pinnedBandOf(layout, regions),
  }
}

// Why: LF-15's eight points are listed only while some tip is snapped; otherwise nothing is paid per frame.
/** @purity pure */
function snapsForTips(
  schedule: Schedule,
  tasks: readonly TaskGeometry[],
  highlights: readonly HighlightGeometry[],
): readonly AnchorSnap[] {
  const isAnySnapped = schedule.commentBoxes.some((box) => (box.anchorSnapPoint ?? null) !== null)
  return isAnySnapped ? anchorSnapsOf(tasks, highlights) : []
}

// Spec: IMPS-785
/** @purity pure */
function pinnedBandOf(layout: ScheduleLayout, regions: ScreenRegions): Pick<ScheduleGeometry, 'pinnedBand'> {
  const pinnedIds = new Set(layout.taskGroups.filter((taskGroup) => taskGroup.isPinned === true).map((taskGroup) => taskGroup.taskGroupId))
  if (pinnedIds.size === 0) return {}
  const pinnedTaskUids = new Set(
    layout.placements.filter((one) => pinnedIds.has(one.taskGroupId)).map((one) => one.taskUid),
  )
  return { pinnedBand: { scrollTop: layout.scrollAreaY ?? regions.taskGroupArea.y, pinnedTaskUids } }
}

// Spec: FR-098, T-303, EL-4, EL-5, EL-19, PI-6, RT-6, IMPS-786, IMPS-787
/** @purity pure */
export function isLinkInBand(
  band: Pick<NonNullable<ScheduleGeometry['pinnedBand']>, 'pinnedTaskUids'> | null | undefined,
  link: BandLink,
  isWholeRoute: boolean,
): boolean {
  if (band === null || band === undefined) return false
  const pinnedTaskUids = band.pinnedTaskUids
  const elision = isWholeRoute ? 'EL-3' : link.elision
  if (elision === 'EL-4') return pinnedTaskUids.has(link.predecessorUid)
  if (elision === 'EL-5') return pinnedTaskUids.has(link.successorUid)
  return pinnedTaskUids.has(link.predecessorUid) && pinnedTaskUids.has(link.successorUid)
}

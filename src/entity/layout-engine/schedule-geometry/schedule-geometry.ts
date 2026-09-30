// ScheduleGeometry: public entry; assembles the vertices of everything drawn on the schedule in one pass, and re-exports what the siblings hold.
// @unit      UF-6   (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure
// @publishes table T-064 row PI-6

import type { DocumentSettings, DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  dayOf,
  workingCalendarOf,
  type BaselineTask,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type WorkingCalendar,
} from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import {
  thinEndHalfHeightOf,
  xFromDay,
  type RowPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import { drawnSettingsOf, type ScreenRect, type ScreenRegions } from '../screen-regions/screen-regions'
import { commentGeometry } from './comment-box'
import {
  hasPlanDates,
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

export { commentAnchorPointOf, leaderOf } from './comment-box'
export { NOT_STORED_DUMMY_SIZES } from './task-figures'

export interface Point {
  readonly x: number
  readonly y: number
}

export type Path = readonly Point[]

export interface SpanDot {
  readonly at: Point
  readonly radius: number
}

// see LF-18, F-044
export type MilestoneLayerRole = 'body' | 'inner' | 'dot' | 'shade'

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
      // TRAP: a layered milestone joins its body rings by bridges walked there and back; read it with the non-zero rule.
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

// see RV-5, T-021, T-315
export type ProgressSymbol = 'PM-1' | 'PM-1a' | 'PM-2' | 'PM-3' | 'PM-4' | 'DG-1' | 'DG-2' | 'DG-3'

export interface MarkerGeometry {
  readonly symbol: ProgressSymbol
  readonly centre: Point
  readonly radius: number
}

// see LF-13, XS-10, XS-12, S-25, GA-20
export interface ResumeGeometry {
  readonly arm: Path
  readonly head: Path
  readonly valid: boolean
  readonly box: ScreenRect
  readonly dash: Path
  readonly undecided: boolean
}

// see FR-043, GA-5, GA-6, GA-17, GA-21, GA-22
export interface DummyGeometry {
  readonly grab: 'GA-5' | 'GA-6' | 'GA-17' | 'GA-21' | 'GA-22'
  readonly at: Point
  readonly ink: ScreenRect
  // see DM-4, DM-8, DM-9, PI-5
  // WHY: optional, not required: a hand-built geometry that only asks what a press hits need not draw one.
  readonly figure?: BarGeometry
}

// see DA-2, DA-3
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
  // see FR-009, RT-4a
  // WHY: optional, read as true when absent: a hand-built geometry may not say.
  readonly hasPlanDates?: boolean
  // WHY: FR-045 / T-304; optional, read as null when absent: a hand-built geometry may not say.
  readonly deadline?: DeadlineGeometry | null
}

// see EL-1, EL-2, EL-10, EL-11, EL-12, EL-20, EL-21
// WHY: decided here once, where EL-1, EL-2 and EL-20 are judged, so the click (EL-10 .. EL-12) never judges them again.
export interface FarEndGeometry {
  readonly isAcrossInRowArea: boolean
  readonly isDownInRowPlace: boolean
  readonly groupId: string
  readonly middleX: number
  readonly undrawnRowDepth: number | null
  readonly foldedRowId: string | null
}

// see EL-9, GA-24
export interface ContinuationGeometry {
  readonly dots: readonly Point[]
  readonly radius: number
  readonly farUid: number
  readonly far: FarEndGeometry
}

// see T-303
export type Elision = 'EL-3' | 'EL-4' | 'EL-5' | 'EL-6'

// see LC-10, T-222, T-303
export interface DependencyGeometry {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly pattern: 'RP-1' | 'RP-2' | 'RP-3' | 'RP-4' | 'RP-5' | 'RP-6' | 'RP-7' | 'RP-8'
  readonly points: Path
  readonly elision: Elision
  readonly drawnPoints: Path
  readonly continuation: ContinuationGeometry | null
  // see S-18, S-178, S-19, GA-19
  // WHY: optional, not required: a hand-built geometry that only asks what a press hits may give no ink.
  readonly strokeWidth?: number
  readonly head?: Path
}

// see FR-019, S-369, S-370, S-371, HB-10, HB-11
// WHY: the look is already defaulted and clamped, so the renderer draws it as it stands.
export interface HighlightGeometry {
  readonly id: string
  readonly box: ScreenRect
  readonly cornerRadiusPx: number | null
  readonly strokeWidthPx: number
  readonly fillColor: string
  readonly fillOpacity: number
  readonly hasSideHandles: { readonly leftRight: boolean; readonly topBottom: boolean }
}

// see FR-019, FR-097, S-374, S-375
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

// see CU-2
export interface DualCursorGeometry {
  readonly date1X: number
  readonly date2X: number
  readonly top: number
  readonly bottom: number
}

// see FR-015, T-339
interface BaselineOutline {
  readonly taskUid: number
  readonly kind: 'rectangle' | 'diamond'
  readonly box: ScreenRect
  readonly isPinned: boolean
}

export interface ScheduleGeometry {
  readonly tasks: readonly TaskGeometry[]
  readonly baselineOutlines: readonly BaselineOutline[]
  readonly dependencies: readonly DependencyGeometry[]
  readonly progressLine: Path
  readonly statusLine: { readonly x: number; readonly top: number; readonly bottom: number } | null
  readonly dualCursor: DualCursorGeometry | null
  readonly highlightBoxes: readonly HighlightGeometry[]
  readonly commentBoxes: readonly CommentGeometry[]
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
  readonly showPlan: boolean
  readonly showActual: boolean
  readonly selectedTaskUids: ReadonlySet<number>
  readonly selectedLinks: ReadonlySet<string>
  // TRAP: made and dropped inside one call; holding it longer is a cache Chapter 5.6 must first record (R2.20).
  readonly dummyFromByStart: Map<string, CalendarDay | null>
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
  readonly rowById: ReadonlyMap<string, RowPlacement>
  readonly groupById: ReadonlyMap<string, TaskGroup>
  readonly groupOfTask: ReadonlyMap<number, string>
  readonly pinnedIds: ReadonlySet<string>
}

/** @purity pure */
function readingOf(schedule: Schedule, inputs: GeometryInputs, regions: ScreenRegions): EndReading {
  const groupOfTask = new Map<number, string>()
  for (const member of schedule.taskGroupMembers) {
    if (!groupOfTask.has(member.taskUid)) groupOfTask.set(member.taskUid, member.groupId)
  }
  return {
    inputs,
    regions,
    placedByUid: new Map(plannedPlacementsOf(inputs).map((one) => [one.taskUid, one])),
    rowById: new Map(inputs.layout.rows.map((row) => [row.groupId, row])),
    groupById: new Map(schedule.taskGroups.map((group) => [group.id, group])),
    groupOfTask,
    pinnedIds: new Set(inputs.settings.pinnedGroupIds),
  }
}

/** @purity pure */
function planSpanWidthOf(layout: ScheduleLayout, x: number, finish: CalendarDay, settings: DrawnSettings): number {
  return Math.max(xFromDay(layout, finish) - x, settings.minShapeWidth)
}

/** @purity pure */
function overlapOf(from: number, to: number, lower: number, upper: number): number {
  return Math.min(to, upper) - Math.max(from, lower)
}

// see EL-1, EL-2, FR-098, LF-14
// WHY: an EL-2 end stands on a zero-height line, so it is never inside its row's place down.
/** @purity pure */
function farEndOf(end: LinkEnd, groupId: string, undrawnRowDepth: number | null, foldedRowId: string | null,
                  reading: EndReading): FarEndGeometry {
  const area = reading.regions.rowArea
  const bandFloor = reading.inputs.layout.scrollAreaY ?? area.y
  const isPinned = reading.rowById.get(groupId)?.isPinned === true
  const top = isPinned ? area.y : bandFloor
  const bottom = isPinned ? bandFloor : area.y + area.height
  return {
    isAcrossInRowArea: overlapOf(end.x, end.x + end.width, area.x, area.x + area.width) > 0,
    isDownInRowPlace: overlapOf(end.top, end.bottom, top, bottom) > 0,
    groupId,
    middleX: (end.x + (end.x + end.width)) / 2,
    undrawnRowDepth,
    foldedRowId,
  }
}

// see EL-1
/** @purity pure */
function isSeen(far: FarEndGeometry): boolean {
  return far.isAcrossInRowArea && far.isDownInRowPlace
}

// see EL-2
/** @purity pure */
function standingYOf(row: RowPlacement, reading: EndReading): number {
  if (row.isPinned !== true) return row.y + row.height
  let floor = reading.inputs.layout.scrollAreaY ?? reading.regions.rowArea.y
  for (const one of reading.inputs.layout.rows) {
    if (one.groupId === row.groupId) break
    if (one.isPinned !== true) floor = one.y + one.height
  }
  return floor
}

// see EL-2, EL-10, EL-20, RT-4a, LC-1
// WHY: a pin the band cannot hold and a row past the stack safety cap are no group LOD row; RT-4a keeps them.
// WHY: a fold or a hide on the way up makes the end an EL-20 end; it stands like an EL-2 end all the same.
/** @purity pure */
function lodEndOf(task: Task, reading: EndReading): SightedEnd | null {
  const { layout, settings } = reading.inputs
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  const groupId = reading.groupOfTask.get(task.uid)
  const own = groupId === undefined ? undefined : reading.groupById.get(groupId)
  if (start === null || finish === null || own === undefined || layout.stackSafetyCapReached !== null) return null
  if (reading.rowById.has(own.id) || reading.pinnedIds.has(own.id)) return null
  let isFolded = own.treeState === 'hidden' || settings.levelZeroTreeState === 'collapsed'
  let group: TaskGroup = own
  for (let step = 0; step < settings.maxGroupDepth; step += 1) {
    const parent: TaskGroup | undefined =
      group.parentId === null ? undefined : reading.groupById.get(group.parentId)
    if (parent === undefined) return null
    isFolded = isFolded || parent.treeState === 'hidden' || parent.treeState === 'collapsed'
    const row = reading.rowById.get(parent.id)
    if (row !== undefined) {
      const x = xFromDay(layout, start)
      const end = standingEndOf(task.uid, x, planSpanWidthOf(layout, x, finish, settings), standingYOf(row, reading))
      // WHY: the own row lies step + 1 levels below the drawn ancestor it stands under.
      return { end, far: farEndOf(end, own.id, row.depth + step + 1, isFolded ? own.id : null, reading) }
    }
    group = parent
  }
  return null
}

/** @purity pure */
function sightedEndOf(uid: number, reading: EndReading): SightedEnd | null {
  const placed = reading.placedByUid.get(uid)
  if (placed !== undefined) {
    const end = placedEndOf(placed, reading.inputs.settings)
    return { end, far: farEndOf(end, placed.groupId, null, null, reading) }
  }
  const task = reading.inputs.taskByUid.get(uid)
  return task === undefined ? null : lodEndOf(task, reading)
}

// see T-303
/** @purity pure */
function elisionOf(predecessorSeen: boolean, successorSeen: boolean): Elision {
  if (predecessorSeen) return successorSeen ? 'EL-3' : 'EL-4'
  return successorSeen ? 'EL-5' : 'EL-6'
}

// see RT-4a, FR-009, T-303
/** @purity pure */
function dependenciesOf(schedule: Schedule, inputs: GeometryInputs, regions: ScreenRegions): DependencyGeometry[] {
  if (!inputs.settings.dependencyVisible || !inputs.settings.planVisible) return []
  const reading = readingOf(schedule, inputs, regions)
  const out: DependencyGeometry[] = []
  for (const successor of schedule.tasks) {
    if (successor.dependencies.length === 0) continue
    const to = sightedEndOf(successor.uid, reading)
    if (to === null) continue
    for (const link of successor.dependencies) {
      const from = sightedEndOf(link.predecessorUid, reading)
      if (from === null) continue
      out.push(routedDependency(inputs, from, to, link.linkType, elisionOf(isSeen(from.far), isSeen(to.far))))
    }
  }
  return out
}

// see BL-2, XS-5, XS-6
/** @purity pure */
function planExtentOf(placed: TaskPlacement, settings: DrawnSettings): { readonly top: number; readonly height: number } {
  if (!isThinShape(placed.shapeKind)) return { top: placed.y, height: placed.planHeight }
  const half = thinEndHalfHeightOf(placed.shapeKind, settings)
  return { top: thinTierMiddle(placed, settings, false) - half, height: half * 2 }
}

// see BL-1, BL-2
/** @purity pure */
function baselineOutlineOf(baseline: BaselineTask, placed: TaskPlacement, isPinned: boolean,
                           inputs: GeometryInputs): BaselineOutline | null {
  const start = dayOf(baseline.start)
  const finish = dayOf(baseline.finish)
  if (start === null || finish === null) return null
  const { top, height } = planExtentOf(placed, inputs.settings)
  const x = xFromDay(inputs.layout, start)
  const taskUid = baseline.uid
  if (baseline.milestone === true) {
    return { taskUid, kind: 'diamond', box: { x: x - height / 2, y: top, width: height, height }, isPinned }
  }
  const width = planSpanWidthOf(inputs.layout, x, finish, inputs.settings)
  return { taskUid, kind: 'rectangle', box: { x, y: top, width, height }, isPinned }
}

// see FR-015, BL-1, BL-4
// TRAP: never gate on planVisible as dependenciesOf does: the overlay is drawn with the plan hidden.
/** @purity pure */
function baselineOutlinesOf(schedule: Schedule, inputs: GeometryInputs): BaselineOutline[] {
  if (!inputs.settings.baselineVisible || schedule.baselineTasks.length === 0) return []
  const placedByUid = new Map<number, TaskPlacement>()
  for (const placed of inputs.layout.placements) {
    if (!placedByUid.has(placed.taskUid)) placedByUid.set(placed.taskUid, placed)
  }
  const pinnedIds = new Set<string>()
  for (const row of inputs.layout.rows) {
    if (row.isPinned === true) pinnedIds.add(row.groupId)
  }
  const out: BaselineOutline[] = []
  for (const baseline of schedule.baselineTasks) {
    const placed = placedByUid.get(baseline.uid)
    if (placed === undefined) continue
    const outline = baselineOutlineOf(baseline, placed, pinnedIds.has(placed.groupId), inputs)
    if (outline !== null) out.push(outline)
  }
  return out
}

// see CP-6, LC-10, LC-11, RV-5
/** @purity pure */
export function geometryFromLayout(
  schedule: Schedule,
  storedSettings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
  selection: Selection,
  dualCursor: DualCursorDates | null,
  delayDiagnostics?: GeometryInputs['delayDiagnostics'],
): ScheduleGeometry {
  // see FR-039, T-252
  const settings = drawnSettingsOf(storedSettings)
  const inputs: GeometryInputs = {
    settings,
    layout,
    within: workingCalendarOf(schedule),
    taskByUid: new Map(schedule.tasks.map((one) => [one.uid, one])),
    statusDate: dayOf(schedule.project.statusDate),
    showPlan: settings.planVisible,
    showActual: settings.actualVisible,
    selectedTaskUids: new Set(selection.items.flatMap((one) => (one.kind === 'task' ? [one.uid] : []))),
    selectedLinks: selectedLinksOf(schedule, selection),
    dummyFromByStart: new Map<string, CalendarDay | null>(),
    dummyEndByFrom: new Map<string, CalendarDay>(),
    ...(delayDiagnostics === undefined ? {} : { delayDiagnostics }),
  }

  const tasks: TaskGeometry[] = []
  for (const placed of layout.placements) {
    const task = inputs.taskByUid.get(placed.taskUid)
    if (task !== undefined) tasks.push({ ...taskGeometryOf(inputs, task, placed), hasPlanDates: hasPlanDates(task) })
  }

  return {
    tasks,
    baselineOutlines: baselineOutlinesOf(schedule, inputs),
    dependencies: dependenciesOf(schedule, inputs, regions),
    progressLine: progressLineOf(inputs),
    statusLine:
      inputs.statusDate === null
        ? null
        : {
            x: xFromDay(layout, inputs.statusDate),
            top: regions.rowArea.y,
            bottom: regions.rowArea.y + regions.rowArea.height,
          },
    dualCursor: dualCursorGeometry(dualCursor, layout, regions),
    highlightBoxes: highlightGeometry(schedule, layout),
    commentBoxes: commentGeometry(schedule, settings, layout),
  }
}

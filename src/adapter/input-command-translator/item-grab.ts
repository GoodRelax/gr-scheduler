// InputCommandTranslator -- a chart item released after a grab into writes (tables T-266, T-023d).
// @unit      UF-98   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  actualLastDay,
  dayOf,
  planActualState,
  taskByUid,
  textOfDay,
  textOfDayEnd,
  textOfDayStart,
  textOfFinishSide,
  textOfStartSide,
  type CalendarDay,
  type CommentBox,
  type HighlightBox,
  type Project,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  isSelected,
  selectionOfAll,
  type ItemRef,
} from '../../entity/document-model/selection/selection'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  commentAnchorPointOf,
  type BarGeometry,
  type DependencyGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  groupDepthThresholdOf,
  type TaskGroupPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  pastedUidsOf,
  type DocumentCommand,
} from '../../use-case/edit-document/edit-document'
import type { PointerInput } from './input-source'
import { treeWritesOf } from './task-group-tree-entrances'
import { namesAPlace, zoomOnScreen } from './zoom-and-fit'
import {
  CONSUMED_ELSEWHERE,
  acted,
  boxById,
  changed,
  changedInOrder,
  commentAnchorAt,
  compareDay,
  dayAnchorAt,
  dayAtX,
  dayFromSerial,
  dayShift,
  dayShifted,
  drawnTaskGroupsCrossed,
  drawnTaskGroupsOf,
  grabTaskGroupOf,
  hasDraggedPastThreshold,
  isDateKeepingDrag,
  isScrollPositionInForce,
  isSwallowedSecondPress,
  nothingToDo,
  placementAt,
  pointerDaySerial,
  scrolledAnchor,
  serialOfDay,
  taskGroupRankById,
  type ActualEndHold,
  type InPlaceTarget,
  type InputContext,
  type PlacedPlanActual,
  type PointerPress,
  type TranslatedInput,
} from './input-command-translator'

type FarEndGeometry = NonNullable<DependencyGeometry['continuation']>['far']

const MK_13_GRAB_TASK_GROUPS: ReadonlySet<string> = new Set([
  'GA-3', 'GA-4', 'GA-5', 'GA-6', 'GA-9', 'GA-12', 'GA-13', 'GA-14',
  'GA-15', 'GA-16', 'GA-17', 'GA-21', 'GA-22', 'GR-14',
])

// see T-023d, MK-13
/** @purity pure */
export function commandFromGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const hit = grabbedHitOf(press, context)
  if (hit === null) return CONSUMED_ELSEWHERE
  const item = hit.item
  if (hit.grab === 'GA-24') {
    return isContinuationMarkClick(press, release) ? continuationSend(context, item) : CONSUMED_ELSEWHERE
  }

  // TRAP: MK-13 must be read before the switch; the actual ends stand above the body in T-267,
  // so the switch would rewrite the same day instead of opening the name.
  const opened = release.clickCount >= 2 ? doubleClickOf(hit) : null
  if (opened !== null) return opened

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    const day = dayAtX(context.layout, release.x)
    const project = context.document.schedule.project
    return day === null
      ? CONSUMED_ELSEWHERE
      : changed([{ kind: 'setStatusDate', date: textOfFinishSide(day, project) }])
  }

  // TRAP: must stay above GR-14's moves below, or a double click and a drag on one place are one press.
  const boxTarget = release.clickCount >= 2 && hit.grab === 'GR-14' ? boxFieldTargetOf(item) : null
  if (boxTarget !== null) return acted({ kind: 'editInPlace', target: boxTarget })

  // TRAP: the first release of a double click has `clickCount` 1; without this arm it falls to the
  // switch and reaches a second destination (for GA-6, a 0px actual).
  if (MK_13_GRAB_TASK_GROUPS.has(hit.grab) && !hasDraggedPastThreshold(press, release)) {
    return CONSUMED_ELSEWHERE
  }

  // see GR-14, CM-54
  if (item.kind === 'highlightBox' && hit.grab === 'GR-14') {
    return highlightBoxRangeWrite(context, press, release, item.id, hit.boxPart ?? { kind: 'body' })
  }

  // see GR-14, CM-50, CM-51
  if (item.kind === 'commentBox' && hit.grab === 'GR-14') {
    return commentBoxMoveWrite(context, press, release, item.id, hit.boxPart?.kind === 'anchor')
  }

  if (item.kind !== 'task') return CONSUMED_ELSEWHERE

  const uid = item.taskUid
  const grab = grabTaskGroupOf(hit)
  switch (grab) {
    case 'GA-18':
      if (hasDraggedPastThreshold(press, release)) return markerPullWrite(context, release, uid)
      return CONSUMED_ELSEWHERE
    case 'GA-7':
    case 'GA-8':
      return fadeEndWrite(context, release, uid, grab)
    case 'GA-1':
    case 'GA-10':
    case 'GA-2':
    case 'GA-11': {
      const task = taskByUid(context.document.schedule, uid)
      const day = dayAtX(context.layout, release.x)
      if (task === null || task.start === null || task.finish === null || day === null) return CONSUMED_ELSEWHERE
      if (dayOf(task.start) === null || dayOf(task.finish) === null) return CONSUMED_ELSEWHERE
      const isStartHeld = grab === 'GA-1' || grab === 'GA-10'
      const project = context.document.schedule.project
      // WHY: an end dragged past the other is not clamped; IV-10 is `editTask`'s, so every caller gets one answer.
      return changed([
        {
          kind: 'setTaskPlanDates',
          uid,
          start: isStartHeld ? textOfStartSide(day, project, task.milestone === true) : task.start,
          finish: isStartHeld ? task.finish : textOfFinishSide(day, project),
        },
      ])
    }
    case 'GA-3':
    case 'GA-12':
    case 'GA-16':
    case 'GA-4':
    case 'GA-13': {
      return actualEndWrite(context, release, uid, grab)
    }
    case 'GA-5':
    case 'GA-21':
    case 'GA-6':
    case 'GA-22':
    case 'GA-17': {
      const dropped = dayAtX(context.layout, release.x)
      if (dropped === null) return CONSUMED_ELSEWHERE
      return changed([
        { kind: 'beginTaskActual', uid, grabbed: grab, droppedDay: textOfDay(dropped) },
      ])
    }
    case 'GA-9':
    case 'GA-14':
    case 'GA-15':
      return changed(bodyMoveWrites(context, press, release, uid))
    case 'GA-20': {
      if (!hasDraggedPastThreshold(press, release)) return CONSUMED_ELSEWHERE
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      // WHY: unreachable: PS-1, FR-011, PV-2, GO-6 and GO-7 never leave a started Task without a last day.
      const lastDay = actualLastDay(task)
      if (task.actualStart === null || lastDay === null) return CONSUMED_ELSEWHERE
      // see GO-10
      const earliest = dayShifted(lastDay, 1)
      const resume = compareDay(dropped, earliest) < 0 ? earliest : dropped
      const project = context.document.schedule.project
      return changed([
        {
          kind: 'setTaskPlanActualState',
          uid,
          place: {
            row: 'PA-3',
            actualStart: task.actualStart,
            stop: textOfFinishSide(lastDay, project),
            resume: textOfStartSide(resume, project, task.milestone === true),
          },
        },
      ])
    }
    default:
      return CONSUMED_ELSEWHERE
  }
}

// see EL-18, MK-13
// TRAP: judged above MK-13 and every grab row; judged by the caller alone, a Task body's second press opens its name.
/** @purity pure */
function grabbedHitOf(press: PointerPress, context: InputContext): Hit | null {
  return isSwallowedSecondPress(press, context) ? null : press.hit
}

// see MK-13
/** @purity pure */
function doubleClickOf(hit: Hit): TranslatedInput | null {
  const item = hit.item
  if (item.kind !== 'task') return null
  if (hit.grab === 'GR-10' || MK_13_GRAB_TASK_GROUPS.has(hit.grab)) {
    return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
  }
  if (hit.grab === 'GR-11') {
    return acted({ kind: 'editInPlace', target: { kind: 'assignee', uid: item.taskUid } })
  }
  return null
}

// see PE-12, EL-18
/** @purity pure */
export function isContinuationMarkClick(press: PointerPress, release: PointerInput): boolean {
  if (press.hit === null || press.hit.grab !== 'GA-24') return false
  return press.at.clickCount === 1 && !hasDraggedPastThreshold(press, release)
}

// see PE-12, EL-10, EL-11, EL-12, EL-16, EL-21, UN-8, UN-14
// WHY: the geometry judged EL-1, EL-2 and EL-20 when it drew the mark; the far end is read off it, never judged again.
/** @purity pure */
function continuationSend(context: InputContext, item: Hit['item']): TranslatedInput {
  if (item.kind !== 'dependency') return CONSUMED_ELSEWHERE
  const line = context.geometry.dependencies.find(
    (one) =>
      one.predecessorUid === item.predecessorUid &&
      one.successorUid === item.successorUid &&
      one.continuation !== null,
  )
  const continuation = line === undefined ? null : line.continuation
  if (continuation === null) return CONSUMED_ELSEWHERE
  const far = continuation.far
  const landingMarked = {
    predecessorUid: item.predecessorUid,
    successorUid: item.successorUid,
    landedTaskUid: continuation.farUid,
  }
  const isDownOut = far.foldedRowId !== null || far.undrawnTaskGroupDepth !== null || !far.isDownInTaskGroupPlace
  const sent =
    far.isAcrossInTaskGroupArea && !isDownOut
      ? CONSUMED_ELSEWHERE
      : changedInOrder([farTaskGroupRevealWrites(context, far.foldedRowId), farEndSendWrites(context, far, isDownOut)])
  return { ...sent, landingMarked }
}

// see EL-21, SJ-2, T-328
/** @purity pure */
function farTaskGroupRevealWrites(context: InputContext, foldedRowId: string | null): readonly DocumentCommand[] {
  if (foldedRowId === null) return []
  return treeWritesOf(context, { type: 'taskGroupRevealAsked', revealedRowId: foldedRowId })
}

// see EL-11, EL-12, FR-046, AM-16, OP-10
/** @purity pure */
function farEndSendWrites(
  context: InputContext,
  far: FarEndGeometry,
  isDownOut: boolean,
): readonly DocumentCommand[] {
  const settings = context.document.documentSettings
  const area = context.regions.taskGroupArea
  const isSeated = namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  const kept = isSeated ? settings : scrolledAnchor(context, 0, 0)
  const across = far.isAcrossInTaskGroupArea ? kept : dayAnchorAt(context, far.middleX - area.width / 2)
  const to = {
    kind: 'setScrollPosition',
    scrollDate: across.scrollDate,
    scrollDayOffset: across.scrollDayOffset,
    scrollGroupId: isDownOut ? far.groupId : kept.scrollGroupId,
    scrollGroupOffset: isDownOut ? 0 : kept.scrollGroupOffset,
  } as const
  const undrawnTaskGroupDepth = far.foldedRowId === null ? far.undrawnTaskGroupDepth : null
  const zoom = farEndZoomWrites(context, undrawnTaskGroupDepth, context.isPictureAtStoredZoom ?? isSeated)
  return isScrollPositionInForce(context, to) ? zoom : [...zoom, to]
}

// see EL-10, UN-8, OP-10
/** @purity pure */
function farEndZoomWrites(
  context: InputContext,
  undrawnTaskGroupDepth: number | null,
  isAtStoredZoom: boolean,
): readonly DocumentCommand[] {
  // WHY: a picture drawn at the fit (OP-10) stores no zoom; the drawn zoom goes with the place so it stays.
  if (undrawnTaskGroupDepth === null && isAtStoredZoom) return []
  const drawnZoom = zoomOnScreen(context)
  return [
    {
      kind: 'setZoom',
      zoomX: drawnZoom.x,
      // TRAP: only groupDepthThresholdOf; any other route can differ by one ulp from groupDepthLimit.
      zoomY:
        undrawnTaskGroupDepth === null
          ? drawnZoom.y
          : groupDepthThresholdOf(undrawnTaskGroupDepth, drawnSettingsOf(context.document.documentSettings)),
    },
  ]
}

// see PE-8, PE-10
/** @purity pure */
function markerPullRow(context: InputContext, uid: number): 'PE-8' | 'PE-10' {
  const drawn = context.geometry.tasks.find((one) => one.taskUid === uid)
  const task = taskByUid(context.document.schedule, uid)
  if (drawn === undefined || task === null) return 'PE-10'
  if (drawn.shapeKind !== 'rectangle' && drawn.shapeKind !== 'chevron') return 'PE-10'
  const marker = drawn.marker
  if (marker === null) return 'PE-10'
  const state = planActualState(task)
  // TRAP: the geometry is the held picture, the document is not; while a dummy's pull is shown the
  // dummy is gone and the actual it will put stands, so read the dummy only when no actual is drawn.
  if (state === 'notStarted' && drawn.actual === null) {
    const inks = drawn.dummies.map((one) => one.ink.x + one.ink.width)
    return inks.length > 0 && marker.centre.x >= Math.max(...inks) ? 'PE-8' : 'PE-10'
  }
  if (state === 'suspendedResumeUnknown' || state === 'suspendedResumePlanned') return 'PE-10'
  const bar = drawn.actual
  const rightEdge = bar === null ? null : rightEdgeOfBar(bar)
  return rightEdge !== null && marker.centre.x >= rightEdge ? 'PE-8' : 'PE-10'
}

/** @purity pure */
function rightEdgeOfBar(bar: BarGeometry): number | null {
  if (bar.form === 'line') return Math.max(bar.from.x, bar.to.x)
  const xs = bar.points.map((one) => one.x)
  return xs.length === 0 ? null : Math.max(...xs)
}

// see GO-3, GO-4, GO-5
/** @purity pure */
function actualEndWrite(
  context: InputContext,
  release: PointerInput,
  uid: number,
  grab: ActualEndHold,
): TranslatedInput {
  const task = taskByUid(context.document.schedule, uid)
  const dropped = dayAtX(context.layout, release.x)
  if (task === null || dropped === null) return CONSUMED_ELSEWHERE
  const place = actualEndPlacement(task, grab, dropped, context.document.schedule.project)
  if (place === null) return CONSUMED_ELSEWHERE
  return changed([{ kind: 'setTaskPlanActualState', uid, place }])
}

// see GO-9
/** @purity pure */
function markerPullWrite(
  context: InputContext,
  release: PointerInput,
  uid: number,
): TranslatedInput {
  if (markerPullRow(context, uid) === 'PE-10') return CONSUMED_ELSEWHERE
  const task = taskByUid(context.document.schedule, uid)
  if (task !== null && planActualState(task) !== 'notStarted') {
    return actualEndWrite(context, release, uid, 'GA-4')
  }
  const planStart = dayOf(task?.start ?? null)
  const dropped = dayAtX(context.layout, release.x)
  if (planStart === null || dropped === null) return CONSUMED_ELSEWHERE
  // WHY: released left of the plan start, GO-9 asks for a one-day actual there, not a refusal.
  const held = compareDay(dropped, planStart) < 0 ? planStart : dropped
  return changed([
    { kind: 'beginTaskActual', uid, grabbed: 'GA-6', droppedDay: textOfDay(held) },
  ])
}

// see PE-1, PE-6, SL-1, SL-7, MK-16
// WHY: the Selection's boxes go in the same bundle as its tasks, so one drag is one undo step (FR-031).
/** @purity pure */
function bodyMoveWrites(
  context: InputContext,
  press: PointerPress,
  release: PointerInput,
  uid: number,
): readonly DocumentCommand[] {
  const taskGroups = drawnTaskGroupsOf(context.layout)
  const moving = movedTaskUids(context, uid, press)
  const boxes = isSelectionMoved(context, uid, press) ? selectedBoxesOf(context) : NO_BOXES
  const shift = draggedDayCount(context, press, release)
  const crossed = clampedTaskGroupShift(context, taskGroups, moving, boxes, drawnTaskGroupsCrossed(taskGroups, press.at.y, release.y))
  const project = context.document.schedule.project
  const commands: DocumentCommand[] = []
  for (const each of moving) {
    const task = taskByUid(context.document.schedule, each)
    if (task === null) continue
    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start !== null && finish !== null && shift !== 0) {
      commands.push({
        kind: 'setTaskPlanDates',
        uid: each,
        start: textOfStartSide(dayShifted(start, shift), project, task.milestone === true),
        finish: textOfFinishSide(dayShifted(finish, shift), project),
      })
    }
    const at = taskGroupIndexOfTask(context, taskGroups, each)
    const landed = at === null ? undefined : taskGroups[at + crossed]
    if (landed !== undefined && landed.groupId !== taskGroupOfTask(context, each)) {
      commands.push({ kind: 'moveTaskToTaskGroup', uid: each, groupId: landed.groupId })
    }
  }
  for (const box of boxes.highlightBoxes) {
    const write = highlightBoxShiftWrite(context, taskGroups, box, shift, crossed)
    if (write !== null) commands.push(write)
  }
  for (const box of boxes.commentBoxes) {
    const write = commentBoxShiftWrite(context, taskGroups, box, shift, crossed)
    if (write !== null) commands.push(write)
  }
  return commands
}

interface SelectedBoxes {
  readonly highlightBoxes: readonly HighlightBox[]
  readonly commentBoxes: readonly CommentBox[]
}

const NO_BOXES: SelectedBoxes = { highlightBoxes: [], commentBoxes: [] }

// see SL-1, SL-7, CY-4
/** @purity pure */
function selectedBoxesOf(context: InputContext): SelectedBoxes {
  const schedule = context.document.schedule
  const highlightBoxes: HighlightBox[] = []
  const commentBoxes: CommentBox[] = []
  for (const one of context.selection.items) {
    const highlight = one.kind === 'highlightBox' ? boxById(schedule.highlightBoxes, one.id) : undefined
    if (highlight !== undefined) highlightBoxes.push(highlight)
    const comment = one.kind === 'commentBox' ? boxById(schedule.commentBoxes, one.id) : undefined
    if (comment !== undefined) commentBoxes.push(comment)
  }
  return { highlightBoxes, commentBoxes }
}

// see PE-1, SL-7, FR-019
// WHY: the frame keeps its size: both dates by the same days, both task groups by the same task groups, as a GR-14 body drag does.
/** @purity pure */
function highlightBoxShiftWrite(
  context: InputContext,
  taskGroups: readonly TaskGroupPlacement[],
  box: HighlightBox,
  days: number,
  crossed: number,
): DocumentCommand | null {
  const start = dayOf(box.startDate)
  const end = dayOf(box.endDate)
  const span = highlightTaskGroupSpanOf(context, taskGroups, box)
  if (start === null || end === null || span === null || (days === 0 && crossed === 0)) return null
  const upper = taskGroups[span.upperAt + crossed]
  const lower = taskGroups[span.lowerAt + crossed]
  if (upper === undefined || lower === undefined) return null
  const { early, late } = orderedDays(start, end)
  return highlightRangeWrite(context, box, { upper, lower, left: dayShifted(early, days), right: dayShifted(late, days) })
}

// see PE-1, SL-7, FR-019, CM-50
// WHY: CM-50 alone: the body stands off the anchor (bodyOffsetPx), so it rides along with the moved anchor.
/** @purity pure */
function commentBoxShiftWrite(
  context: InputContext,
  taskGroups: readonly TaskGroupPlacement[],
  box: CommentBox,
  days: number,
  crossed: number,
): DocumentCommand | null {
  if (box.anchorGroupId === null) return null
  const stood = dayOf(box.anchorDate) ?? dayOf(context.document.schedule.project.startDate)
  if (stood === null) return null
  const at = drawnTaskGroupIndexOf(taskGroups, box.anchorGroupId)
  const landed = at === null ? undefined : taskGroups[at + crossed]
  const groupId = landed === undefined ? box.anchorGroupId : landed.groupId
  if (days === 0 && groupId === box.anchorGroupId) return null
  const date = heldOrWritten(box.anchorDate, dayShifted(stood, days), textOfDayStart)
  return { kind: 'setCommentBoxAnchor', id: box.id, anchor: { date, groupId } }
}

/** @purity pure */
function draggedDayCount(context: InputContext, press: PointerPress, release: PointerInput): number {
  return isDateKeepingDrag(press) ? 0 : dayShift(context, press.at.x, release.x)
}

/** @purity pure */
function taskGroupIndexOfTask(
  context: InputContext,
  taskGroups: readonly TaskGroupPlacement[],
  uid: number,
): number | null {
  return drawnTaskGroupIndexOf(taskGroups, taskGroupOfTask(context, uid))
}

/** @purity pure */
function drawnTaskGroupIndexOf(taskGroups: readonly TaskGroupPlacement[], groupId: string | null): number | null {
  if (groupId === null) return null
  const at = taskGroups.findIndex((one) => one.groupId === groupId)
  return at < 0 ? null : at
}

/** @purity pure */
function orderedDays(start: CalendarDay, end: CalendarDay): { readonly early: CalendarDay; readonly late: CalendarDay } {
  return compareDay(start, end) <= 0 ? { early: start, late: end } : { early: end, late: start }
}

// see PE-1, SL-7
// WHY: one shift for the whole selection: a per-item clamp would spread a selection that
// started a task group apart, and the table asks for the same number of task groups for all of them.
/** @purity pure */
function clampedTaskGroupShift(
  context: InputContext,
  taskGroups: readonly TaskGroupPlacement[],
  moving: readonly number[],
  boxes: SelectedBoxes,
  asked: number,
): number {
  const held: number[] = []
  for (const uid of moving) {
    const at = taskGroupIndexOfTask(context, taskGroups, uid)
    if (at !== null) held.push(at)
  }
  for (const box of boxes.highlightBoxes) {
    const span = highlightTaskGroupSpanOf(context, taskGroups, box)
    if (span !== null) held.push(span.upperAt, span.lowerAt)
  }
  for (const box of boxes.commentBoxes) {
    const at = drawnTaskGroupIndexOf(taskGroups, box.anchorGroupId)
    if (at !== null) held.push(at)
  }
  return shiftWithinTaskGroups(taskGroups, held, asked)
}

// see CY-6
// WHY: a held drag draws its result into the task groups, so a release is measured on the task groups the press saw.
/** @purity pure */
function layoutAtPressOf(context: InputContext, press: PointerPress): InputContext['layout'] {
  const taskGroups = press.layoutRowsAtPress
  return taskGroups === undefined ? context.layout : { ...context.layout, taskGroups }
}

// see PE-1, CY-6
/** @purity pure */
function shiftWithinTaskGroups(taskGroups: readonly TaskGroupPlacement[], held: readonly number[], asked: number): number {
  if (held.length === 0) return 0
  const room = { up: -Math.min(...held), down: taskGroups.length - 1 - Math.max(...held) }
  return Math.min(Math.max(asked, room.up), room.down)
}

// see PTD-7, CY-3, CY-5, CY-6, CY-8, CY-9, CM-8, DU-1
// WHY: one CM-8 with the landing is one undo step (FR-031); task groups count the chosen Tasks' copies, not CY-4's boxes.
/** @purity pure */
export function copyDragWrite(context: InputContext, press: PointerPress, release: PointerInput): TranslatedInput {
  if (!hasDraggedPastThreshold(press, release)) return CONSUMED_ELSEWHERE
  const schedule = context.document.schedule
  const sources = context.selection.items.flatMap((one) =>
    one.kind === 'task' && taskByUid(schedule, one.uid) !== null ? [one.uid] : [])
  const copied = [...new Set(sources)]
  const taskGroups = drawnTaskGroupsOf(layoutAtPressOf(context, press))
  const dayCount = draggedDayCount(context, press, release)
  const heldTaskGroups = copied.flatMap((uid) => taskGroupIndexOfTask(context, taskGroups, uid) ?? [])
  const crossed = shiftWithinTaskGroups(taskGroups, heldTaskGroups, drawnTaskGroupsCrossed(taskGroups, press.at.y, release.y))
  if (sources.length === 0 || (dayCount === 0 && crossed === 0)) return CONSUMED_ELSEWHERE
  const groupIdOf: Record<number, string> = {}
  for (const uid of copied) {
    const at = taskGroupIndexOfTask(context, taskGroups, uid)
    const landed = at === null ? undefined : taskGroups[at + crossed]
    if (landed !== undefined && landed.groupId !== taskGroupOfTask(context, uid)) groupIdOf[uid] = landed.groupId
  }
  const copyUidOf = pastedUidsOf(schedule, sources)
  const picked = selectionOfAll(sources.flatMap((uid) => {
    const copy = copyUidOf.get(uid)
    return copy === undefined ? [] : [{ kind: 'task' as const, uid: copy }]
  }))
  const write: DocumentCommand = { kind: 'pasteTasks', sourceUids: sources, landing: { dayShift: dayCount, groupIdOf } }
  return acted({ kind: 'changeDocument', writes: [[write]], picked })
}

// see HB-5
/** @purity pure */
function nearestDrawnTaskGroupBoundary(taskGroups: readonly TaskGroupPlacement[], y: number): number {
  let nearest = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let at = 0; at <= taskGroups.length; at++) {
    const above = taskGroups[at - 1]
    const below = taskGroups[at]
    const gapTop = above === undefined ? Number.NEGATIVE_INFINITY : above.y + above.height
    const gapBottom = below === undefined ? Number.POSITIVE_INFINITY : below.y
    const distance = Math.max(Math.min(gapTop, gapBottom) - y, 0, y - Math.max(gapTop, gapBottom))
    // WHY: within 1e-9, not exact: a band of 24.0012px puts its middle a float step off either gap, and HB-5's tie takes the lower.
    if (distance <= nearestDistance + 1e-9) {
      nearest = at
      nearestDistance = distance
    }
  }
  return nearest
}

// see MK-13, PR-21, PR-22
/** @purity pure */
function boxFieldTargetOf(item: Hit['item']): InPlaceTarget | null {
  if (item.kind === 'commentBox') return { kind: 'commentBoxText', id: item.id }
  if (item.kind === 'highlightBox') return { kind: 'highlightBoxStroke', id: item.id }
  return null
}

interface DraggedSides {
  readonly horizontal: 'left' | 'right' | null
  readonly vertical: 'top' | 'bottom' | null
}

// see HB-7, HB-8, HB-9, HB-10, HB-11
// WHY: a corner moves one side each way; a midpoint moves its one side and keeps the other direction (HB-7).
/** @purity pure */
function draggedSidesOf(part: Extract<NonNullable<Hit['boxPart']>, { kind: 'corner' | 'edge' }>): DraggedSides {
  if (part.kind === 'corner') return { horizontal: part.horizontal, vertical: part.vertical }
  if (part.side === 'left' || part.side === 'right') return { horizontal: part.side, vertical: null }
  return { horizontal: null, vertical: part.side }
}

interface HeldRange {
  readonly taskGroups: readonly TaskGroupPlacement[]
  readonly upperAt: number
  readonly lowerAt: number
  readonly early: CalendarDay
  readonly late: CalendarDay
}

// see HB-4, HB-5, HB-6, HB-7
/** @purity pure */
function grabPointRange(
  held: HeldRange,
  sides: DraggedSides,
  atPointer: number,
  releaseY: number,
): {
  readonly upper: TaskGroupPlacement | undefined
  readonly lower: TaskGroupPlacement | undefined
  readonly left: CalendarDay
  readonly right: CalendarDay
} {
  const { taskGroups, upperAt, lowerAt, early, late } = held
  // TRAP: Math.round sends a tie to the later day's boundary; Math.trunc or toFixed would not.
  const dayBoundary = Math.round(atPointer)
  const taskGroupBoundary = nearestDrawnTaskGroupBoundary(taskGroups, releaseY)
  const earlySerial = serialOfDay(early)
  const lateSerial = serialOfDay(late)
  let left = early
  let right = late
  let upper = taskGroups[upperAt]
  let lower = taskGroups[lowerAt]
  // WHY: no one-day special case on the opposite edge; it would skip the two-day width.
  if (sides.horizontal === 'left') {
    left = dayFromSerial(Math.min(dayBoundary, lateSerial))
    right = dayBoundary > lateSerial ? dayFromSerial(dayBoundary - 1) : late
  } else if (sides.horizontal === 'right') {
    left = dayBoundary <= earlySerial ? dayFromSerial(dayBoundary) : early
    right = dayFromSerial(Math.max(dayBoundary - 1, earlySerial))
  }
  if (sides.vertical === 'top') {
    upper = taskGroupBoundary > lowerAt ? taskGroups[lowerAt] : taskGroups[taskGroupBoundary]
    lower = taskGroupBoundary > lowerAt ? taskGroups[taskGroupBoundary - 1] : taskGroups[lowerAt]
  } else if (sides.vertical === 'bottom') {
    upper = taskGroupBoundary <= upperAt ? taskGroups[taskGroupBoundary] : taskGroups[upperAt]
    lower = taskGroupBoundary <= upperAt ? taskGroups[upperAt] : taskGroups[taskGroupBoundary - 1]
  }
  return { upper, lower, left, right }
}

// see GR-14, CM-54, HB-1, HB-2, HB-3, HB-4, HB-5, HB-6, HB-7
/** @purity pure */
function highlightBoxRangeWrite(
  context: InputContext,
  press: PointerPress,
  release: PointerInput,
  id: string,
  part: NonNullable<Hit['boxPart']>,
): TranslatedInput {
  const box = boxById(context.document.schedule.highlightBoxes, id)
  const start = dayOf(box === undefined ? null : box.startDate)
  const end = dayOf(box === undefined ? null : box.endDate)
  const taskGroups = drawnTaskGroupsOf(context.layout)
  const span = box === undefined ? null : highlightTaskGroupSpanOf(context, taskGroups, box)
  if (box === undefined || start === null || end === null || span === null) return CONSUMED_ELSEWHERE
  // WHY: a highlight box holds a frame and eight grab points only; the anchor and the leader
  // belong to a comment box, and CM-54 has no value to write for either.
  if (part.kind === 'anchor' || part.kind === 'leader') return CONSUMED_ELSEWHERE

  const { upperAt, lowerAt } = span
  const { early, late } = orderedDays(start, end)

  let upper: TaskGroupPlacement | undefined
  let lower: TaskGroupPlacement | undefined
  let left: CalendarDay
  let right: CalendarDay
  if (part.kind === 'body') {
    const days = dayShift(context, press.at.x, release.x)
    const crossed = drawnTaskGroupsCrossed(taskGroups, press.at.y, release.y)
    upper = taskGroups[upperAt + crossed]
    lower = taskGroups[lowerAt + crossed]
    left = dayShifted(early, days)
    right = dayShifted(late, days)
  } else {
    const atPointer = pointerDaySerial(context.layout, release.x)
    if (atPointer === null) return CONSUMED_ELSEWHERE
    const held = { taskGroups, upperAt, lowerAt, early, late }
    ;({ upper, lower, left, right } = grabPointRange(held, draggedSidesOf(part), atPointer, release.y))
  }
  if (upper === undefined || lower === undefined) return nothingToDo('noTaskGroupToPutTheAnnotationOn')
  return changed([highlightRangeWrite(context, box, { upper, lower, left, right })])
}

// see HB-3, FR-019
/** @purity pure */
function highlightTaskGroupSpanOf(
  context: InputContext,
  taskGroups: readonly TaskGroupPlacement[],
  box: HighlightBox,
): { readonly upperAt: number; readonly lowerAt: number } | null {
  const firstRow = context.layout.taskGroups[0]
  const lastTaskGroup = context.layout.taskGroups[context.layout.taskGroups.length - 1]
  if (firstRow === undefined || lastTaskGroup === undefined) return null
  // TRAP: fall back to the first and last layout task groups exactly as highlightGeometry does, or the grabbed box is not the drawn one.
  const topAt = taskGroups.indexOf(taskGroups.find((taskGroup) => taskGroup.groupId === box.topGroupId) ?? firstRow)
  const bottomAt = taskGroups.indexOf(taskGroups.find((taskGroup) => taskGroup.groupId === box.bottomGroupId) ?? lastTaskGroup)
  return { upperAt: Math.min(topAt, bottomAt), lowerAt: Math.max(topAt, bottomAt) }
}

// see CM-54, FR-019, WT-10
// TRAP: normalise here, not in edit-annotation.ts: CM-54 checks no direction, so a reversed pair would be stored as dragged.
/** @purity pure */
function highlightRangeWrite(
  context: InputContext,
  box: HighlightBox,
  to: { readonly upper: TaskGroupPlacement; readonly lower: TaskGroupPlacement; readonly left: CalendarDay; readonly right: CalendarDay },
): DocumentCommand {
  const { upper, lower, left, right } = to
  const rankById = taskGroupRankById(context.document.schedule.taskGroups)
  const isUpperFirst = (rankById.get(upper.groupId) ?? 0) <= (rankById.get(lower.groupId) ?? 0)
  const isLeftFirst = compareDay(left, right) <= 0
  return {
    kind: 'setHighlightBoxRange',
    id: box.id,
    range: {
      startDate: heldOrWritten(box.startDate, isLeftFirst ? left : right, textOfDayStart),
      endDate: heldOrWritten(box.endDate, isLeftFirst ? right : left, textOfDayEnd),
      topGroupId: (isUpperFirst ? upper : lower).groupId,
      bottomGroupId: (isUpperFirst ? lower : upper).groupId,
    },
  }
}

// see WT-10
/** @purity pure */
function heldOrWritten(held: string | null, day: CalendarDay, write: (day: CalendarDay) => string): string {
  const heldDay = dayOf(held)
  return held !== null && heldDay !== null && compareDay(heldDay, day) === 0 ? held : write(day)
}

// see GR-14, CM-50, CM-51, FR-019, RS-44
// WHY: CM-50 and CM-51 in one bundle, one undo (FR-031): the box stands off its anchor, so CM-50 alone would
// carry the box along with a moved anchor.
/** @purity pure */
function commentBoxMoveWrite(
  context: InputContext,
  press: PointerPress,
  release: PointerInput,
  id: string,
  isAnchor: boolean,
): TranslatedInput {
  const box = boxById(context.document.schedule.commentBoxes, id)
  // TRAP: from the document and the task groups at the press, never context.geometry: a held drag draws the box already
  // moved, so the pull would be counted twice.
  const layout = layoutAtPressOf(context, press)
  // WHY: a box with no anchor date stands at the document's start date, as commentGeometry draws it (FR-019).
  const stoodDay = dayOf(box?.anchorDate ?? null) ?? dayOf(context.document.schedule.project.startDate)
  const stood =
    box === undefined || stoodDay === null || box.anchorGroupId === null
      ? null
      : commentAnchorPointOf(layout, stoodDay, box.anchorGroupId)
  if (box === undefined || stood === null) return CONSUMED_ELSEWHERE
  const pull = isAnchor ? { dx: 0, dy: 0 } : { dx: release.x - press.at.x, dy: release.y - press.at.y }
  const aim = isAnchor ? release : { x: stood.x + pull.dx, y: stood.y + pull.dy }
  const anchor = commentAnchorAt(layout, aim.x, aim.y)
  if (!('groupId' in anchor)) return anchor
  const day = dayOf(anchor.date)
  const at = day === null ? null : commentAnchorPointOf(layout, day, anchor.groupId)
  if (at === null) return nothingToDo('noTaskGroupToPutTheAnnotationOn')
  const offset = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
  const left = stood.x + offset.dx + pull.dx
  const bottom = stood.y + offset.dy + pull.dy
  return changed([
    { kind: 'setCommentBoxAnchor', id, anchor },
    { kind: 'setCommentBoxBodyOffsetPx', id, dx: left - at.x, dy: bottom - at.y },
  ])
}

// see FR-016, FD-5, RV-6
// WHY: compared in days, not pixels -- the table forbids a drag threshold; an unset end released on the day it
// stood on stays unset instead of turning into an explicit 0, which draws flat.
/** @purity pure */
function fadeEndWrite(context: InputContext, release: PointerInput, uid: number, grab: 'GA-7' | 'GA-8'): TranslatedInput {
  const task = taskByUid(context.document.schedule, uid)
  const start = dayOf(task === null ? null : task.start)
  const finish = dayOf(task === null ? null : task.finish)
  const atPointer = pointerDaySerial(context.layout, release.x)
  if (task === null || start === null || finish === null || atPointer === null) return CONSUMED_ELSEWHERE
  const pulled =
    grab === 'GA-7' ? Math.round(atPointer - serialOfDay(start)) : Math.round(serialOfDay(finish) + 1 - atPointer)
  const days = clampedFadeDays(task, grab, pulled, serialOfDay(finish) - serialOfDay(start))
  const stood = (grab === 'GA-7' ? task.fadeInDays : task.fadeOutDays) ?? 0
  if (days === stood) return CONSUMED_ELSEWHERE
  return changed([
    grab === 'GA-7' ? { kind: 'setTaskFadeInDays', uid, days } : { kind: 'setTaskFadeOutDays', uid, days },
  ])
}

// see FD-6, IV-12
/** @purity pure */
function clampedFadeDays(task: Task, grab: 'GA-7' | 'GA-8', pulled: number, span: number): number {
  const other = grab === 'GA-7' ? task.fadeOutDays : task.fadeInDays
  const room = span - (other ?? 0)
  return Math.min(Math.max(0, pulled), Math.max(0, room))
}

const ACTUAL_START_HOLDS: readonly ActualEndHold[] = ['GA-3', 'GA-12']

// see GO-3, GO-4, GO-5
/** @purity pure */
function actualEndPlacement(
  task: Task,
  grab: ActualEndHold,
  dropped: CalendarDay,
  project: Project,
): PlacedPlanActual | null {
  const heldText = task.actualStart
  if (dayOf(heldText) === null || heldText === null) return null
  const isStartHeld = ACTUAL_START_HOLDS.includes(grab)
  // WHY: an actual start not moved keeps its text as it stands (T-350 WT-10).
  const actualStart = isStartHeld || grab === 'GA-16' ? textOfStartSide(dropped, project, task.milestone === true) : heldText
  // WHY: GO-5 keeps the last day; the end holds put the released day itself, not a working day (GO-3).
  const lastDay = isStartHeld ? null : textOfFinishSide(dropped, project)
  const lastDayColumn = planActualState(task) === 'finished' ? 'actualFinish' : 'stop'
  const moved: Task = lastDay === null
    ? { ...task, actualStart }
    : { ...task, actualStart, [lastDayColumn]: lastDay }
  return placementAt(moved)
}

// see SL-7, SL-4, MK-16
/** @purity pure */
function movedTaskUids(context: InputContext, grabbed: number, press: PointerPress): readonly number[] {
  if (!isSelectionMoved(context, grabbed, press)) return [grabbed]
  const uids: number[] = []
  for (const one of context.selection.items) {
    if (one.kind === 'task') uids.push(one.uid)
  }
  return isSelected(context.selection, { kind: 'task', uid: grabbed }) ? uids : [...uids, grabbed]
}

// see SL-7, SL-4, MK-16
/** @purity pure */
function isSelectionMoved(context: InputContext, grabbed: number, press: PointerPress): boolean {
  const held: ItemRef = { kind: 'task', uid: grabbed }
  return isSelected(context.selection, held) || isDateKeepingDrag(press)
}

// TRAP: reading ScheduleLayout.placements instead breaks a body drag: the layout already
// draws the Task under the pointer, so PE-1's guard cancels the move.
/** @purity pure */
function taskGroupOfTask(context: InputContext, uid: number): string | null {
  const member = context.document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)
  return member === undefined ? null : member.groupId
}

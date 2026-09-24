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
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  isSelected,
  type ItemRef,
} from '../../entity/document-model/selection/selection'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { RowPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import type { PointerInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  acted,
  boxById,
  changed,
  commentAnchorAt,
  compareDay,
  dayAtX,
  dayFromSerial,
  dayShift,
  dayShifted,
  drawnRowsCrossed,
  drawnRowsOf,
  grabRowOf,
  hasDraggedPastThreshold,
  nothingToDo,
  placementAt,
  pointerDaySerial,
  serialOfDay,
  taskGroupRankById,
  rememberedActualIn,
  type ActualEndHold,
  type InPlaceTarget,
  type InputContext,
  type PlacedPlanActual,
  type PointerPress,
  type TranslatedInput,
} from './input-command-translator'

const MK_13_GRAB_ROWS: ReadonlySet<string> = new Set([
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
  const hit = press.hit
  if (hit === null) return CONSUMED_ELSEWHERE
  const item = hit.item

  // TRAP: MK-13 must be read before the switch; the actual ends stand above the body in T-267,
  // so the switch would rewrite the same day instead of opening the name.
  if (release.clickCount >= 2 && item.kind === 'task') {
    const isNameEntrance = hit.grab === 'GR-10' || MK_13_GRAB_ROWS.has(hit.grab)
    if (isNameEntrance) {
      return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
    }
    if (hit.grab === 'GR-11') {
      return acted({ kind: 'editInPlace', target: { kind: 'assignee', uid: item.taskUid } })
    }
  }

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    const day = dayAtX(context.layout, release.x)
    return day === null ? CONSUMED_ELSEWHERE : changed([{ kind: 'setStatusDate', date: textOfDay(day) }])
  }

  // TRAP: must stay above GR-14's moves below, or a double click and a drag on one place are one press.
  const boxTarget = release.clickCount >= 2 && hit.grab === 'GR-14' ? boxFieldTargetOf(item) : null
  if (boxTarget !== null) return acted({ kind: 'editInPlace', target: boxTarget })

  // TRAP: the first release of a double click has `clickCount` 1; without this arm it falls to the
  // switch and reaches a second destination (for GA-6, a 0px actual).
  if (MK_13_GRAB_ROWS.has(hit.grab) && !hasDraggedPastThreshold(press, release)) {
    return CONSUMED_ELSEWHERE
  }

  // see GR-14, CM-50
  if (item.kind === 'commentBox' && hit.grab === 'GR-14' && hit.boxPart?.kind === 'anchor') {
    return commentBoxAnchorWrite(context, release, item.id)
  }

  // see GR-14, CM-54
  if (item.kind === 'highlightBox' && hit.grab === 'GR-14') {
    return highlightBoxRangeWrite(context, press, release, item.id, hit.boxPart ?? { kind: 'body' })
  }

  // see GR-14, CM-51
  if (item.kind === 'commentBox' && hit.grab === 'GR-14') {
    const box = boxById(context.document.schedule.commentBoxes, item.id)
    if (box === undefined) return CONSUMED_ELSEWHERE
    const stood = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    return changed([
      {
        kind: 'setCommentBoxBodyOffsetPx',
        id: item.id,
        dx: stood.dx + (release.x - press.at.x),
        dy: stood.dy + (release.y - press.at.y),
      },
    ])
  }

  if (item.kind !== 'task') return CONSUMED_ELSEWHERE

  const uid = item.taskUid
  const grab = grabRowOf(hit)
  switch (grab) {
    case 'GA-18':
      return hasDraggedPastThreshold(press, release)
        ? markerPullWrite(context, release, uid)
        : changed([
            {
              kind: 'cycleTaskPlanActualState',
              uid,
              remembered: rememberedActualIn(context, uid),
            },
          ])
    case 'GA-7':
    case 'GA-8': {
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const atPointer = pointerDaySerial(context.layout, release.x)
      if (task === null || start === null || finish === null || atPointer === null) {
        return CONSUMED_ELSEWHERE
      }
      const pulled =
        grab === 'GA-7'
          ? Math.round(atPointer - serialOfDay(start))
          : Math.round(serialOfDay(finish) - atPointer)
      const days = clampedFadeDays(task, grab, pulled, serialOfDay(finish) - serialOfDay(start))
      return changed([
        grab === 'GA-7'
          ? { kind: 'setTaskFadeInDays', uid, days }
          : { kind: 'setTaskFadeOutDays', uid, days },
      ])
    }
    case 'GA-1':
    case 'GA-10':
    case 'GA-2':
    case 'GA-11': {
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (start === null || finish === null || day === null) return CONSUMED_ELSEWHERE
      const isStartHeld = grab === 'GA-1' || grab === 'GA-10'
      const moved = isStartHeld ? { start: day, finish } : { start, finish: day }
      // WHY: an end dragged past the other is not clamped; IV-10 is `editTask`'s, so every caller gets one answer.
      return changed([
        {
          kind: 'setTaskPlanDates',
          uid,
          start: textOfDay(moved.start),
          finish: textOfDay(moved.finish),
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
      return changed([
        {
          kind: 'setTaskPlanActualState',
          uid,
          place: {
            row: 'PA-3',
            actualStart: task.actualStart,
            stop: textOfDay(lastDay),
            resume: textOfDay(resume),
          },
        },
      ])
    }
    default:
      return CONSUMED_ELSEWHERE
  }
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
  const place = actualEndPlacement(task, grab, dropped)
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

// see PE-1, PE-6, SL-7
/** @purity pure */
function bodyMoveWrites(
  context: InputContext,
  press: PointerPress,
  release: PointerInput,
  uid: number,
): readonly DocumentCommand[] {
  const rows = drawnRowsOf(context.layout)
  const moving = movedTaskUids(context, uid)
  const shift = dayShift(context, press.at.x, release.x)
  const crossed = clampedRowShift(context, rows, moving, drawnRowsCrossed(rows, press.at.y, release.y))
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
        start: textOfDay(dayShifted(start, shift)),
        finish: textOfDay(dayShifted(finish, shift)),
      })
    }
    const at = rowIndexOfTask(context, rows, each)
    const landed = at === null ? undefined : rows[at + crossed]
    if (landed !== undefined && landed.groupId !== rowOfTask(context, each)) {
      commands.push({ kind: 'moveTaskToTaskGroup', uid: each, groupId: landed.groupId })
    }
  }
  return commands
}

/** @purity pure */
function rowIndexOfTask(
  context: InputContext,
  rows: readonly RowPlacement[],
  uid: number,
): number | null {
  const groupId = rowOfTask(context, uid)
  if (groupId === null) return null
  const at = rows.findIndex((one) => one.groupId === groupId)
  return at < 0 ? null : at
}

// see PE-1, SL-7
// WHY: one shift for the whole selection: a per-item clamp would spread a selection that
// started a row apart, and the table asks for the same number of rows for all of them.
/** @purity pure */
function clampedRowShift(
  context: InputContext,
  rows: readonly RowPlacement[],
  moving: readonly number[],
  asked: number,
): number {
  const held: number[] = []
  for (const uid of moving) {
    const at = rowIndexOfTask(context, rows, uid)
    if (at !== null) held.push(at)
  }
  for (const one of context.selection.items) {
    if (one.kind !== 'highlightBox') continue
    const box = boxById(context.document.schedule.highlightBoxes, one.id)
    if (box === undefined) continue
    for (const groupId of [box.topGroupId, box.bottomGroupId]) {
      const at = rows.findIndex((row) => row.groupId === groupId)
      if (at >= 0) held.push(at)
    }
  }
  if (held.length === 0) return 0
  const room = { up: -Math.min(...held), down: rows.length - 1 - Math.max(...held) }
  return Math.min(Math.max(asked, room.up), room.down)
}

// see HB-5
/** @purity pure */
function nearestDrawnRowBoundary(rows: readonly RowPlacement[], y: number): number {
  let nearest = 0
  let nearestDistance = Number.POSITIVE_INFINITY
  for (let at = 0; at <= rows.length; at++) {
    const above = rows[at - 1]
    const below = rows[at]
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

// see GR-14, CM-54, HB-1, HB-2, HB-3, HB-4, HB-5, HB-6
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
  const rows = drawnRowsOf(context.layout)
  const firstRow = context.layout.rows[0]
  const lastRow = context.layout.rows[context.layout.rows.length - 1]
  if (box === undefined || start === null || end === null || firstRow === undefined || lastRow === undefined) {
    return CONSUMED_ELSEWHERE
  }
  // WHY: a highlight box holds a frame and four corners only; the anchor and the leader
  // belong to a comment box, and CM-54 has no value to write for either.
  if (part.kind === 'anchor' || part.kind === 'leader') return CONSUMED_ELSEWHERE

  // TRAP: fall back to the first and last layout rows exactly as highlightGeometry does, or the grabbed box is not the drawn one.
  const topAt = rows.indexOf(rows.find((row) => row.groupId === box.topGroupId) ?? firstRow)
  const bottomAt = rows.indexOf(rows.find((row) => row.groupId === box.bottomGroupId) ?? lastRow)
  const upperAt = Math.min(topAt, bottomAt)
  const lowerAt = Math.max(topAt, bottomAt)
  const early = compareDay(start, end) <= 0 ? start : end
  const late = compareDay(start, end) <= 0 ? end : start

  let upper: RowPlacement | undefined
  let lower: RowPlacement | undefined
  let left: CalendarDay
  let right: CalendarDay
  if (part.kind === 'body') {
    const days = dayShift(context, press.at.x, release.x)
    const crossed = drawnRowsCrossed(rows, press.at.y, release.y)
    upper = rows[upperAt + crossed]
    lower = rows[lowerAt + crossed]
    left = dayShifted(early, days)
    right = dayShifted(late, days)
  } else {
    const atPointer = pointerDaySerial(context.layout, release.x)
    if (atPointer === null) return CONSUMED_ELSEWHERE
    // TRAP: Math.round sends a tie to the later day's boundary; Math.trunc or toFixed would not.
    const dayBoundary = Math.round(atPointer)
    const rowBoundary = nearestDrawnRowBoundary(rows, release.y)
    const earlySerial = serialOfDay(early)
    const lateSerial = serialOfDay(late)
    // WHY: no one-day special case on the opposite edge; it would skip the two-day width.
    if (part.horizontal === 'left') {
      left = dayFromSerial(Math.min(dayBoundary, lateSerial))
      right = dayBoundary > lateSerial ? dayFromSerial(dayBoundary - 1) : late
    } else {
      left = dayBoundary <= earlySerial ? dayFromSerial(dayBoundary) : early
      right = dayFromSerial(Math.max(dayBoundary - 1, earlySerial))
    }
    if (part.vertical === 'top') {
      upper = rowBoundary > lowerAt ? rows[lowerAt] : rows[rowBoundary]
      lower = rowBoundary > lowerAt ? rows[rowBoundary - 1] : rows[lowerAt]
    } else {
      upper = rowBoundary <= upperAt ? rows[rowBoundary] : rows[upperAt]
      lower = rowBoundary <= upperAt ? rows[upperAt] : rows[rowBoundary - 1]
    }
  }
  if (upper === undefined || lower === undefined) return nothingToDo('noRowToPutTheAnnotationOn')

  // TRAP: normalise here, not in edit-annotation.ts: CM-54 checks no direction, so a reversed pair would be stored as dragged.
  const rankById = taskGroupRankById(context.document.schedule.taskGroups)
  const isUpperFirst = (rankById.get(upper.groupId) ?? 0) <= (rankById.get(lower.groupId) ?? 0)
  const isLeftFirst = compareDay(left, right) <= 0
  return changed([
    {
      kind: 'setHighlightBoxRange',
      id,
      range: {
        startDate: textOfDay(isLeftFirst ? left : right),
        endDate: textOfDay(isLeftFirst ? right : left),
        topGroupId: (isUpperFirst ? upper : lower).groupId,
        bottomGroupId: (isUpperFirst ? lower : upper).groupId,
      },
    },
  ])
}

// see GR-14, CM-50, FR-019, RS-44
// WHY: a released anchor is placed again, and FR-019 refuses a place with no row by RS-44.
/** @purity pure */
function commentBoxAnchorWrite(
  context: InputContext,
  release: PointerInput,
  id: string,
): TranslatedInput {
  if (boxById(context.document.schedule.commentBoxes, id) === undefined) return CONSUMED_ELSEWHERE
  const anchor = commentAnchorAt(context.layout, release.x, release.y)
  if (!('groupId' in anchor)) return anchor
  return changed([{ kind: 'setCommentBoxAnchor', id, anchor }])
}

// see FD-6
/** @purity pure */
function clampedFadeDays(task: Task, grab: 'GA-7' | 'GA-8', pulled: number, span: number): number {
  const room = grab === 'GA-7' ? span : span - (task.fadeInDays ?? 0)
  return Math.min(Math.max(0, pulled), Math.max(0, room))
}

const ACTUAL_START_HOLDS: readonly ActualEndHold[] = ['GA-3', 'GA-12']

// see GO-3, GO-4, GO-5
/** @purity pure */
function actualEndPlacement(
  task: Task,
  grab: ActualEndHold,
  dropped: CalendarDay,
): PlacedPlanActual | null {
  const held = dayOf(task.actualStart)
  if (held === null) return null
  const isStartHeld = ACTUAL_START_HOLDS.includes(grab)
  const actualStart = isStartHeld || grab === 'GA-16' ? textOfDay(dropped) : textOfDay(held)
  // WHY: GO-5 keeps the last day; the end holds put the released day itself, not a working day (GO-3).
  const lastDay = isStartHeld ? null : textOfDay(dropped)
  const lastDayColumn = planActualState(task) === 'finished' ? 'actualFinish' : 'stop'
  const moved: Task = lastDay === null
    ? { ...task, actualStart }
    : { ...task, actualStart, [lastDayColumn]: lastDay }
  return placementAt(moved)
}

// see SL-7
/** @purity pure */
function movedTaskUids(context: InputContext, grabbed: number): readonly number[] {
  const held: ItemRef = { kind: 'task', uid: grabbed }
  if (!isSelected(context.selection, held)) return [grabbed]
  const uids: number[] = []
  for (const one of context.selection.items) {
    if (one.kind === 'task') uids.push(one.uid)
  }
  return uids
}

// TRAP: reading ScheduleLayout.placements instead breaks a body drag: the layout already
// draws the Task under the pointer, so PE-1's guard cancels the move.
/** @purity pure */
function rowOfTask(context: InputContext, uid: number): string | null {
  const member = context.document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)
  return member === undefined ? null : member.groupId
}

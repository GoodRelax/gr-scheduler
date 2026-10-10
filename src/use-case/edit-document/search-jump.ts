// EditDocument -- the writes that open a search hit's task group and its ancestors and bring it into view.
// @unit      UF-179  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import { dayFromSerial, dayOf, serial, textOfDayStart } from '../../entity/document-model/schedule/schedule'
import {
  dateAtX,
  landedShapeBoxOf,
  taskGroupAnchorIn,
  taskPlacement,
  type LandedTarget,
  type TaskGroupPlacement,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { DocumentCommand } from './edit-document'
import type { TreeStateEvent } from './task-group-folding'
import { levelZeroWritesFor, treeStateWritesFor } from './task-group-folding'

// see SJ-1
export type SearchJumpTarget = LandedTarget

export type SearchJumpPlan = {
  readonly treeStateWrites: readonly DocumentCommand[]
  readonly scrollWrite: DocumentCommand | null
  readonly isBlockedByPinnedTaskGroups: boolean
}

export interface SearchJumpReach {
  readonly pxPerDay: number
  readonly leftReachPx: number
  readonly drawnTaskGroups: readonly Pick<TaskGroupPlacement, 'groupId' | 'isPinned'>[]
  readonly areaWidth: number
  readonly landing: SearchJumpLanding | null
}

// see SJ-5, SJ-6, U-50
// WHY: read off a picture drawn after SJ-2's reveal: the reveal moves every task group below the one it opens.
export interface SearchJumpLanding {
  readonly shapeFromDatePx: number
  readonly shapeWidthPx: number
  readonly shapeMiddleY: number
  readonly roomTop: number
  readonly roomHeight: number
  readonly scrollingTaskGroups: readonly Pick<TaskGroupPlacement, 'groupId' | 'y' | 'height'>[]
}

type UnstoredZoom = Pick<DocumentSettings, 'zoomX' | 'zoomY'>

// see SJ-6, SJ-10
interface DrawnCommentBoxes {
  readonly commentBoxes: readonly { readonly id: string; readonly anchor: { readonly x: number }; readonly body: ScreenRect }[]
}

type ScrollAnchor = Omit<Extract<DocumentCommand, { readonly kind: 'setScrollPosition' }>, 'kind'>

interface JumpPlace {
  readonly groupId: string | null
  readonly date: string | null
}

const NO_JUMP: SearchJumpPlan = { treeStateWrites: [], scrollWrite: null, isBlockedByPinnedTaskGroups: false }

// see SJ-2, SJ-6
/** @purity pure */
function placeOf(schedule: Schedule, target: SearchJumpTarget): JumpPlace | null {
  const heldTaskGroup = (groupId: string | null): string | null =>
    groupId !== null && schedule.taskGroups.some((taskGroup) => taskGroup.id === groupId) ? groupId : null
  if (target.kind === 'task') {
    const task = schedule.tasks.find((one) => one.uid === target.taskUid)
    if (task === undefined) return null
    const member = schedule.taskGroupMembers.find((one) => one.taskUid === task.uid)
    return { groupId: heldTaskGroup(member?.groupId ?? null), date: task.start }
  }
  const box = schedule.commentBoxes.find((one) => one.id === target.commentBoxId)
  if (box === undefined) return null
  return { groupId: heldTaskGroup(box.anchorGroupId), date: box.anchorDate }
}

// see SJ-2, T-328
/** @purity pure */
function revealWrites(document: Document, groupId: string | null): readonly DocumentCommand[] {
  if (groupId === null) return []
  const event: TreeStateEvent = { type: 'taskGroupRevealAsked', revealedRowId: groupId }
  return [
    ...treeStateWritesFor(document.schedule, event),
    ...levelZeroWritesFor(document.documentSettings.levelZeroTreeState, event),
  ]
}

// see TV-6, SJ-2
/** @purity pure */
export function shownTasksRevealWrites(document: Document, taskUids: readonly number[]): readonly DocumentCommand[] {
  const wanted = new Set(taskUids)
  const held = new Set(document.schedule.taskGroups.map((taskGroup) => taskGroup.id))
  const rows = new Set(
    document.schedule.taskGroupMembers.filter((one) => wanted.has(one.taskUid) && held.has(one.groupId)).map((one) => one.groupId),
  )
  const writes = new Map<string, DocumentCommand>()
  for (const groupId of rows) {
    for (const write of revealWrites(document, groupId)) {
      writes.set(write.kind === 'setTaskGroupTreeState' ? write.groupId : write.kind, write)
    }
  }
  return [...writes.values()]
}

// see SJ-6, T-038, SJ-7, LF-15
/** @purity pure */
function dateXOf(layout: ScheduleLayout, geometry: DrawnCommentBoxes, target: SearchJumpTarget): number | null {
  if (target.kind === 'commentBox') {
    const drawn = geometry.commentBoxes.filter((one) => one.id === target.commentBoxId)[0]
    const day = drawn === undefined ? null : dateAtX(layout, drawn.anchor.x)
    return day === null ? null : xFromDay(layout, day)
  }
  const placed = taskPlacement(layout, target.taskUid)
  if (placed === null) return null
  return placed.shapeKind === 'milestone' ? placed.x + placed.width / 2 : placed.x
}

/** @purity pure */
function landingOf(layout: ScheduleLayout, box: ScreenRect | null, dateX: number | null, taskGroupArea: ScreenRect): SearchJumpLanding | null {
  if (box === null || dateX === null) return null
  const roomTop = layout.scrollAreaY ?? taskGroupArea.y
  return {
    shapeFromDatePx: box.x - dateX,
    shapeWidthPx: box.width,
    shapeMiddleY: box.y + box.height / 2,
    roomTop,
    roomHeight: taskGroupArea.y + taskGroupArea.height - roomTop,
    scrollingTaskGroups: layout.taskGroups.filter((taskGroup) => taskGroup.isPinned !== true),
  }
}

// see SJ-5, SJ-6, T-038, SJ-7
/** @purity pure */
export function searchJumpReachOf(
  layout: ScheduleLayout,
  geometry: DrawnCommentBoxes,
  taskGroupArea: ScreenRect,
  target: SearchJumpTarget,
): SearchJumpReach {
  const placed = target.kind === 'task' ? taskPlacement(layout, target.taskUid) : null
  const dateX = dateXOf(layout, geometry, target)
  return {
    pxPerDay: layout.pxPerDay,
    leftReachPx: placed === null || dateX === null ? 0 : Math.max(0, dateX - placed.occupiedX0),
    drawnTaskGroups: layout.taskGroups,
    areaWidth: taskGroupArea.width,
    landing: landingOf(layout, landedShapeBoxOf(layout, geometry, target), dateX, taskGroupArea),
  }
}

// see SJ-7, SJ-8, FR-098
// WHY: a pinned task group the reveal opens is not in the last picture, so the room below the pins decides, as for any undrawn task group.
/** @purity pure */
function isShownAfterJump(
  document: Document,
  place: JumpPlace,
  reveals: readonly DocumentCommand[],
  hasRoomBelowPins: boolean,
  reach: SearchJumpReach,
): boolean {
  const row = place.groupId
  if (row === null || !document.documentSettings.pinnedGroupIds.includes(row)) return hasRoomBelowPins
  if (reach.drawnTaskGroups.some((one) => one.groupId === row && one.isPinned === true)) return true
  return reveals.length > 0 && hasRoomBelowPins
}

// see SJ-6, EL-11, FR-046, S-428
// WHY: a shape wider than the area less two insets would start off the left, so it keeps the start in sight (S-428).
/** @purity pure */
function acrossOf(held: ScrollAnchor, date: string | null, reach: SearchJumpReach): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> {
  const day = dayOf(date)
  if (day === null || reach.pxPerDay <= 0) return { scrollDate: held.scrollDate, scrollDayOffset: held.scrollDayOffset }
  const inset = NOT_STORED_SEARCH_JUMP_INSET['S-428']
  const landing = reach.landing
  const isCentered = landing !== null && landing.shapeWidthPx <= reach.areaWidth - 2 * inset
  const leftPx = isCentered
    ? reach.areaWidth / 2 - landing.shapeFromDatePx - landing.shapeWidthPx / 2
    : reach.leftReachPx + inset
  const left = serial(day) - leftPx / reach.pxPerDay
  const leftDay = Math.floor(left)
  return { scrollDate: textOfDayStart(dayFromSerial(leftDay)), scrollDayOffset: left - leftDay }
}

// see SJ-5, S-554, S-176, FR-098
// WHY: the top edge stands S-554 of the room above the shape's middle; it cannot go above the first task group (S-176 from 0).
/** @purity pure */
function downOf(row: string, reach: SearchJumpReach): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const atTop = { scrollGroupId: row, scrollGroupOffset: 0 }
  const landing = reach.landing
  if (landing === null) return atTop
  const topEdge = landing.shapeMiddleY - landing.roomHeight * NOT_STORED_SEARCH_JUMP_HEIGHT_SHARE['S-554']
  const first = landing.scrollingTaskGroups[0]
  if (first !== undefined && topEdge <= first.y) return { scrollGroupId: first.groupId, scrollGroupOffset: 0 }
  return taskGroupAnchorIn(landing.scrollingTaskGroups, topEdge, atTop)
}

// see SJ-5, SJ-6, SJ-7
/** @purity pure */
function scrollWriteTo(document: Document, place: JumpPlace, reach: SearchJumpReach): DocumentCommand | null {
  const held = document.documentSettings
  const row = place.groupId !== null && !held.pinnedGroupIds.includes(place.groupId) ? place.groupId : null
  const down = row === null ? { scrollGroupId: held.scrollGroupId, scrollGroupOffset: held.scrollGroupOffset } : downOf(row, reach)
  const anchor = { ...acrossOf(held, place.date, reach), ...down }
  if (
    anchor.scrollDate === held.scrollDate &&
    anchor.scrollDayOffset === held.scrollDayOffset &&
    anchor.scrollGroupId === held.scrollGroupId &&
    anchor.scrollGroupOffset === held.scrollGroupOffset
  ) {
    return null
  }
  const { scrollDate, scrollGroupId, scrollDayOffset, scrollGroupOffset } = anchor
  return { kind: 'setScrollPosition', scrollDate, scrollGroupId, scrollDayOffset, scrollGroupOffset }
}

// see T-332
/** @purity pure */
export function searchJumpWrites(
  document: Document,
  target: SearchJumpTarget,
  hasRoomBelowPins: boolean,
  reach: SearchJumpReach,
): SearchJumpPlan {
  const place = placeOf(document.schedule, target)
  if (place === null) return NO_JUMP
  const treeStateWrites = revealWrites(document, place.groupId)
  if (!isShownAfterJump(document, place, treeStateWrites, hasRoomBelowPins, reach)) {
    return { treeStateWrites, scrollWrite: null, isBlockedByPinnedTaskGroups: true }
  }
  return { treeStateWrites, scrollWrite: scrollWriteTo(document, place, reach), isBlockedByPinnedTaskGroups: false }
}

// see SJ-5, OP-10
/** @purity pure */
export function searchJumpCommands(plan: SearchJumpPlan, unstoredZoom: UnstoredZoom | null): readonly DocumentCommand[] {
  if (plan.scrollWrite === null) return plan.treeStateWrites
  const zoom = unstoredZoom === null ? [] : [{ kind: 'setZoom', ...unstoredZoom } as const]
  return [...plan.treeStateWrites, ...zoom, plan.scrollWrite]
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_SEARCH_JUMP_INSET: {
  readonly 'S-428': number
} = {
  'S-428': 24,
}

// see T-206
const NOT_STORED_SEARCH_JUMP_HEIGHT_SHARE: {
  readonly 'S-554': number
} = {
  'S-554': 0.33,
}
// </generated>

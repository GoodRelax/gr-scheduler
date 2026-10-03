// EditDocument -- the writes that open a search hit's row and its ancestors and bring it into view.
// @unit      UF-179  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import { dayFromSerial, dayOf, serial, textOfDayStart } from '../../entity/document-model/schedule/schedule'
import { taskPlacement, type ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { DocumentCommand } from './edit-document'
import type { TreeStateEvent } from './task-group-folding'
import { levelZeroWritesFor, treeStateWritesFor } from './task-group-folding'

// see SJ-1
export type SearchJumpTarget =
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'commentBox'; readonly commentBoxId: string }

// see T-332
export type SearchJumpPlan = {
  readonly treeStateWrites: readonly DocumentCommand[]
  readonly scrollWrite: DocumentCommand | null
  readonly isBlockedByPinnedRows: boolean
}

// see SJ-6, T-038
export interface SearchJumpReach {
  readonly pxPerDay: number
  readonly leftReachPx: number
}

interface JumpPlace {
  readonly groupId: string | null
  readonly date: string | null
}

const NO_JUMP: SearchJumpPlan = { treeStateWrites: [], scrollWrite: null, isBlockedByPinnedRows: false }

// see SJ-2, SJ-6
/** @purity pure */
function placeOf(schedule: Schedule, target: SearchJumpTarget): JumpPlace | null {
  const heldRow = (groupId: string | null): string | null =>
    groupId !== null && schedule.taskGroups.some((row) => row.id === groupId) ? groupId : null
  if (target.kind === 'task') {
    const task = schedule.tasks.find((one) => one.uid === target.taskUid)
    if (task === undefined) return null
    const member = schedule.taskGroupMembers.find((one) => one.taskUid === task.uid)
    return { groupId: heldRow(member?.groupId ?? null), date: task.start }
  }
  const box = schedule.commentBoxes.find((one) => one.id === target.commentBoxId)
  if (box === undefined) return null
  return { groupId: heldRow(box.anchorGroupId), date: box.anchorDate }
}

// see SJ-2, T-328
/** @purity pure */
function revealWrites(document: Document, groupId: string | null): readonly DocumentCommand[] {
  if (groupId === null) return []
  const event: TreeStateEvent = { type: 'rowRevealAsked', revealedRowId: groupId }
  return [
    ...treeStateWritesFor(document.schedule, event),
    ...levelZeroWritesFor(document.documentSettings.levelZeroTreeState, event),
  ]
}

// see SJ-6, T-038
/** @purity pure */
export function searchJumpReachOf(layout: ScheduleLayout, target: SearchJumpTarget): SearchJumpReach {
  const placed = target.kind === 'task' ? taskPlacement(layout, target.taskUid) : null
  if (placed === null) return { pxPerDay: layout.pxPerDay, leftReachPx: 0 }
  const dateX = placed.shapeKind === 'milestone' ? placed.x + placed.width / 2 : placed.x
  return { pxPerDay: layout.pxPerDay, leftReachPx: Math.max(0, dateX - placed.occupiedX0) }
}

// see SJ-5, SJ-6, SJ-7
/** @purity pure */
function scrollWriteTo(document: Document, place: JumpPlace, reach: SearchJumpReach): DocumentCommand | null {
  const held = document.documentSettings
  const row = place.groupId !== null && !held.pinnedGroupIds.includes(place.groupId) ? place.groupId : null
  const day = dayOf(place.date)
  // DEVIATION: spec says the left end lands S-428 inside the view (SJ-6); here at the edge, S-428 is not generated (DFC-1770)
  const left = day === null || reach.pxPerDay <= 0 ? null : serial(day) - reach.leftReachPx / reach.pxPerDay
  const leftDay = left === null ? null : Math.floor(left)
  const scrollDate = leftDay === null ? held.scrollDate : textOfDayStart(dayFromSerial(leftDay))
  const scrollDayOffset = left === null || leftDay === null ? held.scrollDayOffset : left - leftDay
  const scrollGroupId = row ?? held.scrollGroupId
  const scrollGroupOffset = row === null ? held.scrollGroupOffset : 0
  if (
    scrollDate === held.scrollDate &&
    scrollDayOffset === held.scrollDayOffset &&
    scrollGroupId === held.scrollGroupId &&
    scrollGroupOffset === held.scrollGroupOffset
  ) {
    return null
  }
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
  if (!hasRoomBelowPins) return { treeStateWrites, scrollWrite: null, isBlockedByPinnedRows: true }
  return { treeStateWrites, scrollWrite: scrollWriteTo(document, place, reach), isBlockedByPinnedRows: false }
}

// see T-332
/** @purity pure */
export function searchJumpCommands(plan: SearchJumpPlan): readonly DocumentCommand[] {
  return plan.scrollWrite === null ? plan.treeStateWrites : [...plan.treeStateWrites, plan.scrollWrite]
}

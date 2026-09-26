// EditDocument -- the writes that open a search hit's row and its ancestors and bring it into view.
// @unit      UF-179  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import { dayOf, textOfDay } from '../../entity/document-model/schedule/schedule'
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

// see SJ-5, SJ-6, SJ-7
/** @purity pure */
function scrollWriteTo(document: Document, place: JumpPlace): DocumentCommand | null {
  const held = document.documentSettings
  const row = place.groupId !== null && !held.pinnedGroupIds.includes(place.groupId) ? place.groupId : null
  const day = dayOf(place.date)
  // WHY: S-428 has no value in table T-206 yet, so the date lands on the left edge with no inset.
  const scrollDate = day === null ? held.scrollDate : textOfDay(day)
  const scrollDayOffset = day === null ? held.scrollDayOffset : 0
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
): SearchJumpPlan {
  const place = placeOf(document.schedule, target)
  if (place === null) return NO_JUMP
  const treeStateWrites = revealWrites(document, place.groupId)
  if (!hasRoomBelowPins) return { treeStateWrites, scrollWrite: null, isBlockedByPinnedRows: true }
  return { treeStateWrites, scrollWrite: scrollWriteTo(document, place), isBlockedByPinnedRows: false }
}

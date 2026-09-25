// SingleHtmlShell frame loop -- copies the chosen row or Tasks, and builds the command that pastes the copy back.
// @unit      UF-168  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Selection } from '../../entity/document-model/selection/selection'
import { taskByUid, type Schedule, type TaskGroup } from '../../entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { DocumentCommand } from '../../use-case/apply-document-change/apply-document-change'
import { editDocument } from '../../use-case/edit-document/edit-document'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import { DEFAULT_ROW_NAME } from '../../adapter/screen-renderer/screen-renderer'
import {
  NOTHING_TO_DO_REASON,
  STACK_SAFETY_CAP_REASON,
  selectedObjectsIn,
  type FrameLoopHands,
  type FrameValues,
} from './frame-loop'

type SelectionCopied = NonNullable<ScreenSession['selection']['copiedForPaste']>

// WHY: one chosen row is copied whatever Tasks are also selected; two rows or nothing copy
// nothing (RS-27). see FR-033, SL-7b
/** @purity pure */
export function copiedForPasteOf(chosenRows: readonly string[], selected: Selection): SelectionCopied | null {
  if (chosenRows.length === 1) return { kind: 'row', groupId: chosenRows[0] as string }
  if (chosenRows.length > 1) return null
  const uids = selected.items.flatMap((one) => (one.kind === 'task' ? [one.uid] : []))
  return uids.length === 0 ? null : { kind: 'task', uids }
}

// WHY: two or more paste targets refuse any paste, a row copy or a Task copy alike (RS-27).
// see FR-033
/** @purity pure */
export function pasteRefusedFor(chosenRows: readonly string[]): boolean {
  return chosenRows.length > 1
}

export type CopyAndPasteHands = Pick<
  FrameLoopHands,
  'readSession' | 'readHeld' | 'readValues' | 'readEnvironment' | 'sendToSession' | 'raiseNotice' | 'writeDocument'
  | 'settingsLimitsOf'
>

// see SK-4, FR-033
/** @purity non-pure */
export function copyForPaste(hands: CopyAndPasteHands): void {
  const session = hands.readSession()
  const copiedForPaste = copiedForPasteOf(session.selection.chosenRows, selectedObjectsIn(session))
  if (copiedForPaste === null) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return
  }
  hands.sendToSession({ type: 'copyTaken', copiedForPaste }, hands.readValues())
}

// see SK-5, FR-033
/** @purity non-pure */
export function pasteWhatWasCopied(hands: CopyAndPasteHands, frame: FrameValues): void {
  const copied = hands.readSession().selection.copiedForPaste
  if (copied === null || pasteRefusedFor(hands.readSession().selection.chosenRows)) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return
  }
  const schedule = hands.readHeld().document.schedule
  const command = pasteCommandFor(hands, copied, schedule)
  if (command === null) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return
  }
  const folded = editDocument(hands.readHeld().document, command, hands.settingsLimitsOf(frame), DEFAULT_ROW_NAME)
  if (folded.ok) {
    const wouldDraw = layoutFromSchedule(
      folded.document.schedule,
      frame.settingsMeasuredWith,
      frame.regions,
      undefined,
      hands.readEnvironment().rowControlsHeightPx,
    )
    if (wouldDraw.stackSafetyCapReached !== null) {
      hands.raiseNotice(STACK_SAFETY_CAP_REASON, null)
      return
    }
  }
  hands.writeDocument([command], frame)
}

// see FR-033, DU-2
/** @purity non-pure */
function pasteCommandFor(
  hands: CopyAndPasteHands,
  copied: SelectionCopied,
  schedule: Schedule,
): DocumentCommand | null {
  if (copied.kind === 'task') {
    const sourceUids = copied.uids.filter((uid) => taskByUid(schedule, uid) !== null)
    return sourceUids.length === 0 ? null : { kind: 'pasteTaskSubtree', sourceUids }
  }
  const byParent = new Map<string | null, TaskGroup[]>()
  for (const row of schedule.taskGroups) {
    byParent.set(row.parentId, [...(byParent.get(row.parentId) ?? []), row])
  }
  if (!schedule.taskGroups.some((one) => one.id === copied.groupId)) return null
  const chosenRows = hands.readSession().selection.chosenRows
  const newGroupIds: Record<string, string> = {}
  const walking = [copied.groupId]
  while (walking.length > 0) {
    const id = walking.pop() as string
    if (newGroupIds[id] !== undefined) continue
    newGroupIds[id] = crypto.randomUUID()
    for (const child of byParent.get(id) ?? []) walking.push(child.id)
  }
  return {
    kind: 'pasteTaskGroupSubtree',
    sourceGroupId: copied.groupId,
    targetGroupId: chosenRows.length === 1 ? (chosenRows[0] as string) : null,
    newGroupIds,
  }
}

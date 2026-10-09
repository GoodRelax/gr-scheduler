// SingleHtmlShell frame loop -- copies the chosen row or Tasks, and builds the command that pastes the copy back.
// @unit      UF-168  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import { taskUidsIn, type Selection } from '../../entity/document-model/selection/selection'
import { taskByUid, type Schedule, type TaskGroup } from '../../entity/document-model/schedule/schedule'
import { layoutFromSchedule } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { DocumentCommand } from '../../use-case/apply-document-change/apply-document-change'
import { editDocument } from '../../use-case/edit-document/edit-document'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import { DEFAULT_TASK_GROUP_NAME } from '../../adapter/screen-renderer/screen-renderer'
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
export function copiedForPasteOf(chosenTaskGroups: readonly string[], selected: Selection): SelectionCopied | null {
  if (chosenTaskGroups.length === 1) return { kind: 'row', groupId: chosenTaskGroups[0] as string }
  if (chosenTaskGroups.length > 1) return null
  const uids = taskUidsIn(selected)
  return uids.length === 0 ? null : { kind: 'task', uids }
}

// WHY: two or more paste targets refuse any paste, a row copy or a Task copy alike (RS-27).
// see FR-033
/** @purity pure */
export function pasteRefusedFor(chosenTaskGroups: readonly string[]): boolean {
  return chosenTaskGroups.length > 1
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
  const copiedForPaste = copiedForPasteOf(session.selection.chosenTaskGroups, selectedObjectsIn(session))
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
  if (copied === null || pasteRefusedFor(hands.readSession().selection.chosenTaskGroups)) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return
  }
  const schedule = hands.readHeld().document.schedule
  const command = pasteCommandFor(hands, copied, schedule)
  if (command === null) {
    hands.raiseNotice(NOTHING_TO_DO_REASON, null)
    return
  }
  if (isStackSafetyCapReachedBy(hands, [command], frame)) {
    hands.raiseNotice(STACK_SAFETY_CAP_REASON, null)
    return
  }
  hands.writeDocument([command], frame)
}

// see FR-033, ST-7, CY-10
// WHY: one test for both roads that copy -- a cap that held the paste but not the drag would work in one place only.
/** @purity semi-pure-b */
function isStackSafetyCapReachedBy(
  hands: CopyAndPasteHands,
  bundle: readonly DocumentCommand[],
  frame: FrameValues,
): boolean {
  let document = hands.readHeld().document
  for (const command of bundle) {
    const folded = editDocument(document, command, hands.settingsLimitsOf(frame), DEFAULT_TASK_GROUP_NAME)
    if (!folded.ok) return false
    document = folded.document
  }
  const wouldDraw = layoutFromSchedule(
    document.schedule,
    frame.settingsMeasuredWith,
    frame.regions,
    undefined,
    hands.readEnvironment().taskGroupControlsHeightPx,
  )
  return wouldDraw.stackSafetyCapReached !== null
}

// see PTD-7, CY-8, CY-10
/** @purity non-pure */
export function landCopyDrag(
  hands: CopyAndPasteHands,
  bundle: readonly DocumentCommand[],
  picked: Selection,
  frame: FrameValues,
): void {
  if (isStackSafetyCapReachedBy(hands, bundle, frame)) {
    hands.raiseNotice(STACK_SAFETY_CAP_REASON, null)
    return
  }
  hands.writeDocument(bundle, frame)
  const schedule = hands.readHeld().document.schedule
  const isLanded = picked.items.every((one) => one.kind !== 'task' || taskByUid(schedule, one.uid) !== null)
  if (isLanded) hands.sendToSession({ type: 'objectsPicked', pickedObjects: picked }, frame)
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
    return sourceUids.length === 0 ? null : { kind: 'pasteTasks', sourceUids }
  }
  const byParent = new Map<string | null, TaskGroup[]>()
  for (const taskGroup of schedule.taskGroups) {
    byParent.set(taskGroup.parentId, [...(byParent.get(taskGroup.parentId) ?? []), taskGroup])
  }
  if (!schedule.taskGroups.some((one) => one.id === copied.groupId)) return null
  const chosenTaskGroups = hands.readSession().selection.chosenTaskGroups
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
    targetGroupId: chosenTaskGroups.length === 1 ? (chosenTaskGroups[0] as string) : null,
    newGroupIds,
  }
}

// Pastes a copy of the chosen Task together with its WBS subtree.
// @unit      UF-73   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Assignment, WorkingCalendar } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { edited } from './edit-document'
import { wbsSubtreeOf, withSchedule, type TaskCommand } from './edit-task'
import { planDatesEdited } from './task-plan-actual'

// see CM-8, FR-033
/** @purity pure */
export function pasteTaskSubtree(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'pasteTaskSubtree' }>,
  within: WorkingCalendar,
): EditResult {
  const schedule = document.schedule
  // STOP: spec does not decide who passes ST-7's cap (S-89) to FR-033's refusal. Looked in ST-1, T-038, T-067 (PND-179)
  const subtree = wbsSubtreeOf(schedule, command.sourceUid)

  let mark = schedule.project.uidHighWaterMark
  const remap = new Map<number, number>()
  for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)

  const copies = schedule.tasks
    .filter((one) => subtree.has(one.uid))
    .map((one) => planDatesEdited({
      ...one,
      uid: remap.get(one.uid) as number,
      // STOP: spec does not decide a copied root Task's WBS parent. Looked in FR-033, DU-1, DU-2, TC-11 (PND-492)
      wbsParentUid:
        one.uid === command.sourceUid
          ? one.wbsParentUid
          : (remap.get(one.wbsParentUid as number) as number),
      dependencies: one.dependencies
        .filter((link) => subtree.has(link.predecessorUid))
        .map((link) => ({ ...link, predecessorUid: remap.get(link.predecessorUid) as number })),
    }, schedule, within))

  const visualCopies = schedule.taskVisuals
    .filter((one) => subtree.has(one.taskUid))
    .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
  const memberCopies = schedule.taskGroupMembers
    .filter((one) => subtree.has(one.taskUid))
    .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
  const assignmentCopies: Assignment[] = schedule.assignments
    .filter((one) => one.taskUid !== null && subtree.has(one.taskUid))
    .map((one) => ({ ...one, uid: ++mark, taskUid: remap.get(one.taskUid as number) as number }))

  return edited(
    withSchedule(document, {
      ...schedule,
      project: { ...schedule.project, uidHighWaterMark: mark },
      tasks: [...schedule.tasks, ...copies],
      taskVisuals: [...schedule.taskVisuals, ...visualCopies],
      taskGroupMembers: [...schedule.taskGroupMembers, ...memberCopies],
      assignments: [...schedule.assignments, ...assignmentCopies],
    }),
  )
}

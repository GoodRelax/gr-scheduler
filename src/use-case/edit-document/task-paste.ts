// Pastes a copy of each chosen Task together with its WBS subtree.
// @unit      UF-73   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Assignment, Schedule, WorkingCalendar } from '../../entity/document-model/schedule/schedule'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { edited, refused, reject } from './edit-document'
import { wbsSubtreeOf, withSchedule, type TaskCommand } from './edit-task'
import { planDatesEdited } from './task-plan-actual'

// see CM-8, FR-033
/** @purity pure */
function copiedUids(schedule: Schedule, sourceUids: readonly number[]): ReadonlySet<number> {
  const subtree = new Set<number>()
  for (const source of sourceUids) {
    for (const uid of wbsSubtreeOf(schedule, source)) subtree.add(uid)
  }
  return subtree
}

// see CM-8, FR-033
/** @purity pure */
export function pasteTaskSubtree(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'pasteTaskSubtree' }>,
  within: WorkingCalendar,
): EditResult {
  const schedule = document.schedule
  const missing = command.sourceUids.filter((uid) => taskByUid(schedule, uid) === null)
  if (command.sourceUids.length === 0 || missing.length > 0) {
    return refused([reject('CM-8', 'IV-2', `no Task with uid ${missing.join(', ') || '(none given)'}`)])
  }
  // STOP: spec does not decide who passes ST-7's cap (S-89) to FR-033's refusal. Looked in ST-1, T-038, T-067 (PND-179)
  const subtree = copiedUids(schedule, command.sourceUids)

  let mark = schedule.project.uidHighWaterMark
  const remap = new Map<number, number>()
  for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)

  const copies = schedule.tasks
    .filter((one) => subtree.has(one.uid))
    .map((one) => planDatesEdited({
      ...one,
      uid: remap.get(one.uid) as number,
      wbsParentUid:
        one.wbsParentUid === null ? null : (remap.get(one.wbsParentUid) ?? one.wbsParentUid),
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

// Pastes a copy of each chosen Task together with its WBS subtree.
// @unit      UF-73   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Assignment, CalendarDay, Schedule, Task, WorkingCalendar } from '../../entity/document-model/schedule/schedule'
import { dayOf, taskByUid, textOfDay } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { edited, refused, reject } from './edit-document'
import { wbsSubtreeOf, withSchedule, type PasteLanding, type TaskCommand } from './edit-task'
import { planDatesEdited, unstartedCopyOf } from './task-plan-actual'

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
// WHY: the one owner of the copies' UIDs, so the shell can pick the copies (T-308 CY-8) without a second count.
/** @purity pure */
export function pastedUidsOf(schedule: Schedule, sourceUids: readonly number[]): ReadonlyMap<number, number> {
  const subtree = copiedUids(schedule, sourceUids)
  let mark = schedule.project.uidHighWaterMark
  const remap = new Map<number, number>()
  for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)
  return remap
}

// see T-308 CY-5
// WHY: calendar days, the same count the body move shifts by (PE-1, PE-6); a dateless copy stays dateless.
/** @purity pure */
function shiftedPlan(task: Task, landing: PasteLanding | undefined): Task {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (landing === undefined || landing.dayShift === 0 || start === null || finish === null) return task
  const days = landing.dayShift
  return { ...task, start: textOfDay(dayShiftedBy(start, days)), finish: textOfDay(dayShiftedBy(finish, days)) }
}

// TRAP: repeats dayShifted in input-command-translator.ts; the serial helpers of calendar-day.ts are not
// published to this layer (table T-064), so change the two together.
/** @purity pure */
function dayShiftedBy(day: CalendarDay, days: number): CalendarDay {
  const at = new Date(Date.UTC(day.year, day.month - 1, day.day + days))
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

// see CM-8, T-223 DU-1
// WHY: unstarted on every road that copies: the copy keeps the plan and the links closed inside the subtree.
/** @purity pure */
function copiedTask(one: Task, subtree: ReadonlySet<number>, remap: ReadonlyMap<number, number>): Task {
  return unstartedCopyOf({
    ...one,
    uid: remap.get(one.uid) as number,
    wbsParentUid: one.wbsParentUid === null ? null : (remap.get(one.wbsParentUid) ?? one.wbsParentUid),
    dependencies: one.dependencies
      .filter((link) => subtree.has(link.predecessorUid))
      .map((link) => ({ ...link, predecessorUid: remap.get(link.predecessorUid) as number })),
  })
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

  const remap = pastedUidsOf(schedule, command.sourceUids)
  let mark = schedule.project.uidHighWaterMark + remap.size
  const landing = command.landing

  const copies = schedule.tasks
    .filter((one) => subtree.has(one.uid))
    .map((one) => planDatesEdited(shiftedPlan(copiedTask(one, subtree, remap), landing), schedule, within))

  const visualCopies = schedule.taskVisuals
    .filter((one) => subtree.has(one.taskUid))
    .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
  // see T-308 CY-6
  const memberCopies = schedule.taskGroupMembers
    .filter((one) => subtree.has(one.taskUid))
    .map((one) => ({
      ...one,
      taskUid: remap.get(one.taskUid) as number,
      groupId: landing?.groupIdOf[one.taskUid] ?? one.groupId,
    }))
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

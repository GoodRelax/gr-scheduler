// Pastes a copy of each chosen Task, and of no Task that was not chosen.
// @unit      UF-73   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Assignment, CalendarDay, Project, Schedule, Task, WorkingCalendar } from '../../entity/document-model/schedule/schedule'
import { dayFromSerial, dayOf, serial, taskByUid, textOfFinishSide, textOfStartSide } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { edited, refused, reject } from './edit-document'
import { withSchedule, type PasteLanding, type TaskCommand } from './edit-task'
import { wbsSubtreesOf } from './edit-task-group'
import { nearestDerivedTaskUid } from './task-group-order'
import { pastedCopyOf } from './task-plan-actual'

// see CM-8, FR-033, DU-1
// WHY: the one owner of the copies' UIDs, so the shell picks the copies (T-308 CY-8) without a second count.
/** @purity pure */
export function pastedUidsOf(schedule: Schedule, sourceUids: readonly number[]): ReadonlyMap<number, number> {
  const chosen = new Set(sourceUids)
  let mark = schedule.project.uidHighWaterMark
  const remap = new Map<number, number>()
  for (const one of schedule.tasks) if (chosen.has(one.uid)) remap.set(one.uid, ++mark)
  return remap
}

// see CY-5
// WHY: calendar days, the same count the body move shifts by (PE-1, PE-6); a dateless copy stays dateless.
/** @purity pure */
function shiftedPlan(task: Task, landing: PasteLanding | undefined, project: Project): Task {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (landing === undefined || landing.dayShift === 0 || start === null || finish === null) return task
  const days = landing.dayShift
  return {
    ...task,
    start: textOfStartSide(dayShiftedBy(start, days), project, task.milestone === true),
    finish: textOfFinishSide(dayShiftedBy(finish, days), project),
  }
}

/** @purity pure */
function dayShiftedBy(day: CalendarDay, days: number): CalendarDay {
  return dayFromSerial(serial(day) + days)
}

// see CM-8, CM-28, DU-1
/** @purity pure */
export function copiedTask(one: Task, chosen: ReadonlySet<number>, remap: ReadonlyMap<number, number>): Task {
  return {
    ...one,
    uid: remap.get(one.uid) as number,
    parentTaskUid: one.parentTaskUid === null ? null : (remap.get(one.parentTaskUid) ?? null),
    dependencies: one.dependencies
      .filter((link) => chosen.has(link.predecessorUid))
      .map((link) => ({ ...link, predecessorUid: remap.get(link.predecessorUid) as number })),
  }
}

// see DU-1, HM-12, FR-058
/** @purity pure */
export function withInferredCopyParents(
  after: Schedule,
  sources: readonly Task[],
  copies: readonly Task[],
  remap: ReadonlyMap<number, number>,
): Task[] {
  const byId = new Map(after.taskGroups.map((one) => [one.id, one]))
  const landingOf = new Map<number, string>()
  for (const one of after.taskGroupMembers) if (!landingOf.has(one.taskUid)) landingOf.set(one.taskUid, one.groupId)
  const copyUids = new Set(copies.map((one) => one.uid))
  const settled = [...copies]
  sources.forEach((source, at) => {
    if (source.parentTaskUid !== null && remap.has(source.parentTaskUid)) return
    const copy = settled[at] as Task
    const landedOn = landingOf.get(copy.uid)
    const landing = landedOn === undefined ? null : (byId.get(landedOn) ?? null)
    const own = landing?.derivedFromTaskUid === copy.uid || landing?.derivedFromTaskUid === source.uid
    const above = landing === null || landing.parentId === null ? null : (byId.get(landing.parentId) ?? null)
    const start = own ? above : landing
    const below = (uid: number): boolean => copyUids.has(uid) && wbsSubtreesOf(settled, [copy.uid]).has(uid)
    settled[at] = { ...copy, parentTaskUid: nearestDerivedTaskUid(after, byId, start, below) }
  })
  return settled
}

// see CM-8, FR-033
/** @purity pure */
export function pasteTasks(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'pasteTasks' }>,
  within: WorkingCalendar,
): EditResult {
  const schedule = document.schedule
  const missing = command.sourceUids.filter((uid) => taskByUid(schedule, uid) === null)
  if (command.sourceUids.length === 0 || missing.length > 0) {
    return refused([reject('CM-8', 'IV-2', `no Task with uid ${missing.join(', ') || '(none given)'}`)])
  }
  // STOP: spec does not decide who passes ST-7's cap (S-89) to FR-033's refusal. Looked in ST-1, T-038, T-067 (PND-179)
  const chosen: ReadonlySet<number> = new Set(command.sourceUids)

  const remap = pastedUidsOf(schedule, command.sourceUids)
  let mark = schedule.project.uidHighWaterMark + remap.size
  const landing = command.landing

  const sources = schedule.tasks.filter((one) => chosen.has(one.uid))
  const paired = sources.map((one) =>
    pastedCopyOf(shiftedPlan(copiedTask(one, chosen, remap), landing, schedule.project), schedule, within))

  const visualCopies = schedule.taskVisuals
    .filter((one) => chosen.has(one.taskUid))
    .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
  const memberCopies = schedule.taskGroupMembers
    .filter((one) => chosen.has(one.taskUid))
    .map((one) => ({
      ...one,
      taskUid: remap.get(one.taskUid) as number,
      groupId: landing?.groupIdOf[one.taskUid] ?? one.groupId,
    }))
  const assignmentCopies: Assignment[] = schedule.assignments
    .filter((one) => one.taskUid !== null && chosen.has(one.taskUid))
    .map((one) => ({ ...one, uid: ++mark, taskUid: remap.get(one.taskUid as number) as number }))

  const taskGroupMembers = [...schedule.taskGroupMembers, ...memberCopies]
  const after = { ...schedule, tasks: [...schedule.tasks, ...paired], taskGroupMembers }
  const copies = withInferredCopyParents(after, sources, paired, remap)

  return edited(
    withSchedule(document, {
      ...schedule,
      project: { ...schedule.project, uidHighWaterMark: mark },
      tasks: [...schedule.tasks, ...copies],
      taskVisuals: [...schedule.taskVisuals, ...visualCopies],
      taskGroupMembers,
      assignments: [...schedule.assignments, ...assignmentCopies],
    }),
  )
}

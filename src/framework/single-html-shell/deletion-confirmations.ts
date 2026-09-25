// SingleHtmlShell frame loop -- counts what a deletion removes or frees, and decides whether table T-234 asks first.
// @unit      UF-162  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { Task, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../../use-case/apply-document-change/apply-document-change'
import type { FileFlowQuestion } from '../../use-case/advance-screen-session/advance-screen-session'
import type { ConfirmationItem } from '../../adapter/screen-renderer/screen-renderer'
import { CONFIRMATION_MANNER, type ConfirmationQuestion } from './frame-loop'

const UNASSIGNMENT_QUESTION: ConfirmationQuestion = 'QN-3'

// see CD-2
// TRAP: a second reading of table T-050 beside editTaskGroup; change both together.
/** @purity pure */
function rowsLostWith(groups: readonly TaskGroup[], rootId: string): ReadonlySet<string> | null {
  if (!groups.some((one) => one.id === rootId)) return null
  const seen = new Set<string>([rootId])
  for (let grew = true; grew; ) {
    grew = false
    for (const one of groups) {
      if (seen.has(one.id) || one.parentId === null) continue
      if (seen.has(one.parentId)) {
        seen.add(one.id)
        grew = true
      }
    }
  }
  return seen
}

// see CD-1
/** @purity pure */
export function tasksLostWith(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

// see FR-032, T-234
/** @purity pure */
export function confirmationOwedBy(
  commands: readonly DocumentCommand[],
  held: Document,
  asked: ConfirmationQuestion | undefined,
): FileFlowQuestion | null {
  const schedule = held.schedule
  const lostRows = new Set<string>()
  const seeds = new Set<number>()
  let owed = false
  for (const command of commands) {
    if (command.kind === 'deleteTaskGroup') {
      const rows = rowsLostWith(schedule.taskGroups, command.groupId)
      if (rows === null) continue
      for (const id of rows) lostRows.add(id)
      owed = true
      continue
    }
    if (command.kind !== 'deleteTask') continue
    if (!schedule.tasks.some((one) => one.wbsParentUid === command.uid)) continue
    seeds.add(command.uid)
    owed = true
  }
  if (!owed) return null
  for (const member of schedule.taskGroupMembers) {
    if (lostRows.has(member.groupId)) seeds.add(member.taskUid)
  }
  const lostTasks = tasksLostWith(schedule.tasks, seeds)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const items: ConfirmationItem[] = []
  for (const task of schedule.tasks) {
    if (!lostTasks.has(task.uid)) continue
    const drawnOn = rowOfTask.get(task.uid)
    items.push({
      name: task.name,
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  const question: ConfirmationQuestion = asked ?? (lostRows.size > 0 ? 'QN-1' : 'QN-2')
  return { manner: CONFIRMATION_MANNER, question, items }
}

// see FR-099, QN-3, CD-5
/** @purity pure */
export function confirmationOwedByResourceDeletion(
  uids: readonly number[],
  held: Document,
): FileFlowQuestion | null {
  const schedule = held.schedule
  const going = new Set(uids)
  const reached: number[] = []
  const seen = new Set<number>()
  let isFreeingAny = false
  for (const assignment of schedule.assignments) {
    const resourceUid = assignment.resourceUid
    if (resourceUid === null || !going.has(resourceUid)) continue
    isFreeingAny = true
    const taskUid = assignment.taskUid
    if (taskUid === null || seen.has(taskUid)) continue
    seen.add(taskUid)
    reached.push(taskUid)
  }
  if (!isFreeingAny) return null
  const taskOfUid = new Map(schedule.tasks.map((one) => [one.uid, one]))
  const items: ConfirmationItem[] = []
  for (const taskUid of reached) {
    const task = taskOfUid.get(taskUid)
    if (task === undefined) continue
    items.push({ name: task.name, isShownOnAnotherRow: false })
  }
  return { manner: CONFIRMATION_MANNER, question: UNASSIGNMENT_QUESTION, items }
}

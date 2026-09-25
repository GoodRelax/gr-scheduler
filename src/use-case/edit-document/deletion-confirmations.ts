// EditDocument -- counts what a deletion removes or frees, and decides whether table T-234 asks first.
// @unit      UF-162  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentCommand } from './edit-document'
import { subtreeOf, wbsSubtreesOf } from './edit-task-group'

// see T-234, NT-7
// WHY: the question and the names only; the shell that raises it adds the manner (NT-7).
export interface DeletionQuestion {
  readonly question: 'QN-1' | 'QN-2' | 'QN-3' | 'QN-10'
  readonly items: readonly { readonly name: string | null; readonly isShownOnAnotherRow: boolean }[]
}

const UNASSIGNMENT_QUESTION: DeletionQuestion['question'] = 'QN-3'

// see FR-032, T-234
/** @purity pure */
export function confirmationOwedBy(
  commands: readonly DocumentCommand[],
  held: Document,
  asked: DeletionQuestion['question'] | undefined,
): DeletionQuestion | null {
  const schedule = held.schedule
  const lostRows = new Set<string>()
  const seeds = new Set<number>()
  let owed = false
  for (const command of commands) {
    if (command.kind === 'deleteTaskGroup') {
      const rows = subtreeOf(schedule.taskGroups, command.groupId)
      if (rows === null) continue
      for (const one of rows.rows) lostRows.add(one.id)
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
  const lostTasks = wbsSubtreesOf(schedule.tasks, seeds)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const items: DeletionQuestion['items'][number][] = []
  for (const task of schedule.tasks) {
    if (!lostTasks.has(task.uid)) continue
    const drawnOn = rowOfTask.get(task.uid)
    items.push({
      name: task.name,
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  const question: DeletionQuestion['question'] = asked ?? (lostRows.size > 0 ? 'QN-1' : 'QN-2')
  return { question, items }
}

// see FR-099, QN-3, CD-5
/** @purity pure */
export function confirmationOwedByResourceDeletion(
  uids: readonly number[],
  held: Document,
): DeletionQuestion | null {
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
  const items: DeletionQuestion['items'][number][] = []
  for (const taskUid of reached) {
    const task = taskOfUid.get(taskUid)
    if (task === undefined) continue
    items.push({ name: task.name, isShownOnAnotherRow: false })
  }
  return { question: UNASSIGNMENT_QUESTION, items }
}

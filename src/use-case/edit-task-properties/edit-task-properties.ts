// File: EditTaskProperties: asks, before resources of use case UC-003 are deleted, about the tasks their assignments free.
// @unit      UF-210  (docs/spec/05-07-design.md, table T-075)
// @component EditTaskProperties, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-44

import type { Document } from '../../entity/document-model/document/document'
import type { DeletionQuestion } from '../edit-document/edit-document'

const UNASSIGNMENT_QUESTION: DeletionQuestion['question'] = 'QN-3'

// Provisional: OPQ-26
// Spec: UC-003, FR-099, QN-3, CD-5, IMPS-274, IMPS-275, IMPS-276
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
    items.push({ name: task.name, isShownOnAnotherTaskGroup: false })
  }
  return { question: UNASSIGNMENT_QUESTION, items }
}

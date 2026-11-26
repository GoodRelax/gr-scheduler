// File: ArrangeTaskGroups: writes the tree states of use case UC-002 and stands a new task group up under its parent.
// @unit      UF-209  (docs/spec/05-07-design.md, table T-075)
// @component ArrangeTaskGroups, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-43

import type { Document } from '../../entity/document-model/document/document'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import {
  levelZeroWritesFor,
  treeStateWritesFor,
  type DocumentCommand,
  type TreeStateEvent,
} from '../edit-document/edit-document'

// Provisional: OPQ-25
// Spec: UC-002, T-328
/** @purity pure */
export function taskGroupTreeWrites(document: Document, event: TreeStateEvent): readonly DocumentCommand[] {
  return [
    ...treeStateWritesFor(document.schedule, event),
    ...levelZeroWritesFor(document.documentSettings.levelZeroTreeState, event),
  ]
}

/** @purity pure */
function orderPastLastChild(schedule: Schedule, parentTaskGroupId: string | null): number {
  // Trap: one past the largest order, not the child count: orders may have gaps (AT-55).
  let lastOrder: number | null = null
  for (const taskGroup of schedule.taskGroups) {
    if (taskGroup.parentId !== parentTaskGroupId) continue
    if (lastOrder === null || taskGroup.order > lastOrder) lastOrder = taskGroup.order
  }
  return lastOrder === null ? 0 : lastOrder + 1
}

export interface TaskGroupStandUp {
  readonly newTaskGroupId: string
  readonly parentTaskGroupId: string | null
  readonly defaultTaskGroupName: string
}

// Provisional: OPQ-25
// Spec: UC-002, HF-14, HF-17, T-328, AT-153
// Why: the new task group is shown by its tree state (temporarilyExpanded, CM-26), never by a zoom write (HF-14).
/** @purity pure */
export function taskGroupStandUpWrites(document: Document, standUp: TaskGroupStandUp): readonly DocumentCommand[] {
  const { newTaskGroupId, parentTaskGroupId } = standUp
  // Trap: keep the tree state writes in the task group's bundle; a bundle of their own is a second undo step.
  return [
    ...taskGroupTreeWrites(document, { type: 'childTaskGroupAddPressed', pressedRowId: parentTaskGroupId }),
    {
      kind: 'createTaskGroup',
      id: newTaskGroupId,
      parentId: parentTaskGroupId,
      name: standUp.defaultTaskGroupName,
      derivedFromTaskUid: null,
      order: orderPastLastChild(document.schedule, parentTaskGroupId),
    } as const,
  ]
}

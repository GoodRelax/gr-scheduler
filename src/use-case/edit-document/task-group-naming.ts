// EditDocument -- a row stands with a name or a derivation source, and is renamed.
// @unit      UF-77  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { COLUMN_DEFAULTS, taskByUid, type TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { depthOf, withRow, withSchedule } from './edit-task-group'

// see CM-26, FR-085, FR-058
/** @purity pure */
export function createTaskGroup(
  document: Document,
  command: TaskGroupCommandOf<'createTaskGroup'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const groups = schedule.taskGroups
  const refusals: Refusal[] = []
  if (byId.has(command.id)) {
    refusals.push(reject('CM-26', 'IV-1', `a row already holds the id ${command.id}`))
  }
  if (!Number.isInteger(command.order)) {
    refusals.push(reject('CM-26', 'AT-55', `order is not an integer: ${command.order}`))
  }
  if (command.label === null && command.derivedFromTaskUid === null) {
    refusals.push(
      reject('CM-26', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
    )
  }
  if (
    command.derivedFromTaskUid !== null &&
    taskByUid(schedule, command.derivedFromTaskUid) === null
  ) {
    refusals.push(
      reject('CM-26', 'IV-2', `no Task holds the uid ${command.derivedFromTaskUid}`),
    )
  }
  if (command.parentId !== null) {
    const parent = byId.get(command.parentId)
    if (parent === undefined) {
      refusals.push(reject('CM-26', 'FR-085', `no such parent row: ${command.parentId}`))
    } else if (depthOf(byId, parent) >= settings.maxGroupDepth) {
      refusals.push(
        reject(
          'CM-26',
          'FR-085',
          `the parent is already at the depth S-125 allows (${settings.maxGroupDepth})`,
        ),
      )
    }
  }
  if (refusals.length > 0) return refused(refusals)

  const row: TaskGroup = {
    id: command.id,
    parentId: command.parentId,
    label: command.label,
    derivedFromTaskUid: command.derivedFromTaskUid,
    order: command.order,
    treeState: COLUMN_DEFAULTS.TaskGroup.treeState,
    editGroup: null,
    color: null,
    height: null,
  }
  return edited(withSchedule(document, { taskGroups: [...groups, row] }))
}

// see CM-29, FR-085, FR-058
/** @purity pure */
export function setTaskGroupLabel(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupLabel'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-29', 'FR-085', `no such row: ${command.groupId}`)])
  }
  if (command.label === null && row.derivedFromTaskUid === null) {
    return refused([
      reject('CM-29', 'FR-058', 'a row may hold neither a name nor a derivation source (AT-54)'),
    ])
  }
  if (row.label === command.label) return edited(document)
  return edited(withRow(document, { ...row, label: command.label }))
}

// EditDocument -- a row's colour and height are rewritten.
// @unit      UF-78  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { isStoredColour, type TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withRow } from './edit-task-group'

// see CM-30, FR-042
/** @purity pure */
export function setTaskGroupColor(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupColor'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-30', 'FR-042', `no such row: ${command.groupId}`)])
  }
  if (!isStoredColour(command.color, true)) {
    return refused([reject('CM-30', 'CV-1', `not a palette name or a custom colour: ${command.color}`)])
  }
  if (row.color === command.color) return edited(document)
  return edited(withRow(document, { ...row, color: command.color }))
}

// see CM-31, FR-007
/** @purity pure */
export function resetTaskGroupColor(
  document: Document,
  command: TaskGroupCommandOf<'resetTaskGroupColor'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-31', 'FR-007', `no such row: ${command.groupId}`)])
  }
  if (row.color === null) return edited(document)
  return edited(withRow(document, { ...row, color: null }))
}

// see CM-32, FR-042
/** @purity pure */
export function setTaskGroupHeight(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupHeight'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-32', 'FR-042', `no such row: ${command.groupId}`)])
  }
  if (command.height !== null && !Number.isInteger(command.height)) {
    return refused([reject('CM-32', 'AT-59', `height is not an integer: ${command.height}`)])
  }
  // WHY: a height below the stacks is a floor, not refused; null resets, as no reset command exists.
  if (row.height === command.height) return edited(document)
  return edited(withRow(document, { ...row, height: command.height }))
}

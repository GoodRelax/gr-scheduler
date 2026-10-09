// EditDocument -- a row's colour and min height are rewritten.
// @unit      UF-78  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { COLUMN_SHAPES, customColourOf, type TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withTaskGroup } from './edit-task-group'

// see CV-9, AT-58
const TASK_GROUP_COLOUR_NAMES: readonly string[] = COLUMN_SHAPES.TaskGroup['color']?.choices ?? []

// see CM-30, FR-042
/** @purity pure */
export function setTaskGroupColor(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupColor'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const taskGroup = byId.get(command.groupId)
  if (taskGroup === undefined) {
    return refused([reject('CM-30', 'FR-042', `no such row: ${command.groupId}`)])
  }
  if (!TASK_GROUP_COLOUR_NAMES.includes(command.color) && customColourOf(command.color) === null) {
    return refused([reject('CM-30', 'CV-9', `not a row colour name or a custom colour: ${command.color}`)])
  }
  if (taskGroup.color === command.color) return edited(document)
  return edited(withTaskGroup(document, { ...taskGroup, color: command.color }))
}

// see CM-31, FR-007
/** @purity pure */
export function resetTaskGroupColor(
  document: Document,
  command: TaskGroupCommandOf<'resetTaskGroupColor'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const taskGroup = byId.get(command.groupId)
  if (taskGroup === undefined) {
    return refused([reject('CM-31', 'FR-007', `no such row: ${command.groupId}`)])
  }
  if (taskGroup.color === null) return edited(document)
  return edited(withTaskGroup(document, { ...taskGroup, color: null }))
}

// see CM-32, FR-042
/** @purity pure */
export function setTaskGroupMinHeight(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupMinHeight'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const taskGroup = byId.get(command.groupId)
  if (taskGroup === undefined) {
    return refused([reject('CM-32', 'FR-042', `no such row: ${command.groupId}`)])
  }
  if (command.minHeight !== null && !Number.isInteger(command.minHeight)) {
    return refused([reject('CM-32', 'AT-59', `min height is not an integer: ${command.minHeight}`)])
  }
  // WHY: a height below the stacks is a floor, not refused; null resets, as no reset command exists.
  if (taskGroup.minHeight === command.minHeight) return edited(document)
  return edited(withTaskGroup(document, { ...taskGroup, minHeight: command.minHeight }))
}

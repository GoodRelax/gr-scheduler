// EditDocument -- a row's folded, hidden and kept-open marks, for one row or every row.
// @unit      UF-79  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { TaskGroupCommandOf } from './edit-task-group'
import { withRow, withSchedule } from './edit-task-group'

// see CM-33, FR-004
/** @purity pure */
export function setTaskGroupCollapsed(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupCollapsed'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-33', 'FR-004', `no such row: ${command.groupId}`)])
  }
  if (row.isCollapsed === command.collapsed) return edited(document)
  return edited(withRow(document, { ...row, isCollapsed: command.collapsed }))
}

// see CM-34, FR-004
/** @purity pure */
export function setTaskGroupHidden(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupHidden'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-34', 'FR-004', `no such row: ${command.groupId}`)])
  }
  if (row.isHidden === command.hidden) return edited(document)
  return edited(withRow(document, { ...row, isHidden: command.hidden }))
}

// see CM-75, FR-018, T-254
/** @purity pure */
export function setTaskGroupKeptOpen(
  document: Document,
  command: TaskGroupCommandOf<'setTaskGroupKeptOpen'>,
  byId: ReadonlyMap<string, TaskGroup>,
): EditResult {
  const row = byId.get(command.groupId)
  if (row === undefined) {
    return refused([reject('CM-75', 'FR-018', `no such row: ${command.groupId}`)])
  }
  if (row.isKeptOpen === command.keptOpen) return edited(document)
  return edited(withRow(document, { ...row, isKeptOpen: command.keptOpen }))
}

// see CM-72, HF-8, KO-7
/** @purity pure */
export function expandAllTaskGroups(document: Document): EditResult {
  const groups = document.schedule.taskGroups
  const opened = groups.map((one) => {
    if (one.isCollapsed !== true && !one.isKeptOpen) return one
    const unfolded = one.isCollapsed === true ? { ...one, isCollapsed: false } : one
    return { ...unfolded, isKeptOpen: false }
  })
  if (opened.every((one, at) => one === groups[at])) return edited(document)
  return edited(withSchedule(document, { taskGroups: opened }))
}

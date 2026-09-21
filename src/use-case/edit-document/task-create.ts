// Creates one Task with a plan span, in the shape the author armed.
// @unit      UF-72   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  compareDays,
  type Task,
  type TaskGroup,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import { checkDay, visualOf, withSchedule, type TaskCommand } from './edit-task'
import { repriced } from './percent-complete'
import { planDatesEdited } from './task-plan-actual'

// see CM-6, FR-001
/** @purity pure */
export function createTask(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'createTask' }>,
  within: WorkingCalendar,
): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const start = checkDay(settings, command.start)
  const finish = checkDay(settings, command.finish)
  if (!start.ok || !finish.ok) {
    const faults: Refusal[] = []
    if (!start.ok) faults.push(reject('CM-6', 'IV-14', `start ${start.what}`))
    if (!finish.ok) faults.push(reject('CM-6', 'IV-14', `finish ${finish.what}`))
    return refused(faults)
  }
  if (compareDays(finish.day, start.day) < 0) {
    return refused([reject('CM-6', 'FR-012', 'finish is before start')])
  }

  const uid = schedule.project.uidHighWaterMark + 1
  const created: Task = {
    uid,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: command.start,
    finish: command.finish,
    milestone: command.shapeKind === 'milestone',
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }
  const tasks = [...schedule.tasks, repriced(within, planDatesEdited(created, schedule, within))]

  // TRAP: write shapeKind down; Task.milestone cannot tell SH-1 from SH-2 (AT-100).
  const taskVisuals = [...schedule.taskVisuals, { ...visualOf(schedule, uid), shapeKind: command.shapeKind }]

  const held = schedule.taskGroups.find((one) => one.id === command.groupId)
  let taskGroups = schedule.taskGroups
  if (held === undefined) {
    // STOP: spec does not decide where FR-001's new row goes. Looked in TC-3, HF-14, HF-17, AT-55 (PND-491)
    const order = schedule.taskGroups
      .filter((one) => one.parentId === null)
      .reduce((best, one) => Math.max(best, one.order), -1) + 1
    const made: TaskGroup = {
      id: command.groupId,
      parentId: null,
      label: null,
      derivedFromTaskUid: uid,
      order,
      isCollapsed: null,
      isHidden: null,
      isKeptOpen: false,
      editGroup: null,
      color: null,
      height: null,
    }
    taskGroups = [...schedule.taskGroups, made]
  }
  const taskGroupMembers = [
    ...schedule.taskGroupMembers,
    { taskUid: uid, groupId: command.groupId, stackOrder: null },
  ]
  return edited(
    withSchedule(document, {
      ...schedule,
      project: { ...schedule.project, uidHighWaterMark: uid },
      tasks,
      taskVisuals,
      taskGroups,
      taskGroupMembers,
    }),
  )
}

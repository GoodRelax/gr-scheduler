// Runs the Task and TaskVisual commands against the document.
// @unit      UF-11   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { RememberedActual } from '../../entity/document-model/screen-state/screen-state'
import {
  blankTaskVisual,
  compareDays,
  dayOf,
  taskByUid,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskGroupMember,
  type TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import { commentBoxesReleasedFrom } from './edit-annotation'
import { documentWithTableViewsKept } from './edit-document-settings'
import { settledTaskGroup, tasksRankedByTheTaskGroupTree, wbsSubtreesOf } from './edit-task-group'
import { createTask } from './task-create'
import { pasteTasks } from './task-paste'
import {
  beginTaskActual,
  cycleTaskPlanActualStateInDocument,
  setTaskPlanActualState,
  setTaskPlanDates,
} from './task-plan-actual'
import {
  resetTaskVisualColors,
  setTaskFadeDays,
  setTaskVisualColors,
  setTaskVisualStrokeWidthPx,
  setTaskVisualMilestoneGlyph,
  setTaskVisualShapeKind,
} from './task-appearance'

export { cycleTaskPlanActualState, type CycleSurroundings, type CycledPlanActual } from './task-plan-actual'
export { repriced } from './percent-complete'

export type TaskShapeKind = NonNullable<TaskVisual['shapeKind']>

export type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

// see T-266, FR-043, CM-14
// WHY: the holds are table T-108's, printed into TaskCommand below; read off it, never retyped.
export type ActualGrabHold = Extract<TaskCommand, { readonly kind: 'beginTaskActual' }>['grabbed']

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, TaskCommand).
// see T-108
export interface PasteLanding {
  readonly shiftMinutes: number
  readonly taskGroupIdOf: Readonly<Record<number, string>>
}

// see T-108
export type PlanActualPlacement =
  | { readonly row: 'PA-1' }
  | {
      readonly row: 'PA-2'
      readonly actualStart: NonNullable<Task['actualStart']>
      readonly stop: NonNullable<Task['stop']>
    }
  | {
      readonly row: 'PA-3'
      readonly actualStart: NonNullable<Task['actualStart']>
      readonly stop: NonNullable<Task['stop']>
      readonly resume: NonNullable<Task['resume']>
    }
  | {
      readonly row: 'PA-4'
      readonly actualStart: NonNullable<Task['actualStart']>
      readonly stop: NonNullable<Task['stop']>
    }
  | {
      readonly row: 'PA-5'
      readonly actualStart: NonNullable<Task['actualStart']>
      readonly actualFinish: NonNullable<Task['actualFinish']>
    }

// see T-108
export type TaskCommand =
  | {
      readonly kind: 'createTask'
      readonly shapeKind: NonNullable<TaskVisual['shapeKind']>
      readonly start: NonNullable<Task['start']>
      readonly finish: NonNullable<Task['finish']>
      readonly taskGroupId: TaskGroupMember['taskGroupId']
    }
  | { readonly kind: 'deleteTask'; readonly uid: Task['uid'] }
  | {
      readonly kind: 'pasteTasks'
      readonly sourceUids: readonly Task['uid'][]
      readonly landing?: PasteLanding
    }
  | { readonly kind: 'setTaskName'; readonly uid: Task['uid']; readonly name: Task['name'] }
  | { readonly kind: 'setTaskNotes'; readonly uid: Task['uid']; readonly notes: Task['notes'] }
  | {
      readonly kind: 'setTaskPlanDates'
      readonly uid: Task['uid']
      readonly start: NonNullable<Task['start']>
      readonly finish: NonNullable<Task['finish']>
    }
  | { readonly kind: 'setTaskDeadline'; readonly uid: Task['uid']; readonly deadline: Task['deadline'] }
  | {
      readonly kind: 'setTaskPlanActualState'
      readonly uid: Task['uid']
      readonly place: PlanActualPlacement
    }
  | {
      readonly kind: 'beginTaskActual'
      readonly uid: Task['uid']
      readonly grabbed: 'GA-5' | 'GA-6' | 'GA-17' | 'GA-21' | 'GA-22'
      readonly released: { readonly start: string; readonly finish: string }
      readonly snapMinutes: number
    }
  | {
      readonly kind: 'cycleTaskPlanActualState'
      readonly uid: Task['uid']
      readonly remembered: RememberedActual | null
      readonly snapMinutes?: number
    }
  | { readonly kind: 'setTaskFadeInDays'; readonly uid: Task['uid']; readonly days: Task['fadeInDays'] }
  | { readonly kind: 'setTaskFadeOutDays'; readonly uid: Task['uid']; readonly days: Task['fadeOutDays'] }
  | {
      readonly kind: 'setTaskParentTask'
      readonly uid: Task['uid']
      readonly parentUid: Task['parentTaskUid']
    }
  | {
      readonly kind: 'moveTaskToTaskGroup'
      readonly uid: Task['uid']
      readonly taskGroupId: TaskGroupMember['taskGroupId']
    }
  | {
      readonly kind: 'setTaskVisualShapeKind'
      readonly uid: Task['uid']
      readonly shapeKind: NonNullable<TaskVisual['shapeKind']>
    }
  | {
      readonly kind: 'setTaskVisualMilestoneGlyph'
      readonly uid: Task['uid']
      readonly glyph: TaskVisual['milestoneGlyph']
    }
  | {
      readonly kind: 'setTaskVisualColors'
      readonly uid: Task['uid']
      readonly fillColor: TaskVisual['fillColor']
      readonly strokeColor: TaskVisual['strokeColor']
    }
  | { readonly kind: 'resetTaskVisualColors'; readonly uid: Task['uid'] }
  | {
      readonly kind: 'setTaskVisualStrokeWidthPx'
      readonly uid: Task['uid']
      readonly strokeWidthPx: TaskVisual['strokeWidthPx']
    }

// see T-108
// WHY: another component declares these shapes; their field names are held against table T-108 here.
type SameFieldNames<TValue, TNames extends PropertyKey> = [keyof TValue] extends [TNames]
  ? ([TNames] extends [keyof TValue] ? true : false)
  : false
const SHAPE_FIELDS_MATCH: [
  SameFieldNames<RememberedActual, 'actualStart' | 'actualFinish' | 'stop' | 'carriedActualDuration'>,
] = [true]
void SHAPE_FIELDS_MATCH
// </generated>

/** @purity pure */
export function withSchedule(document: Document, schedule: Schedule): Document {
  return { ...document, schedule }
}

// TRAP: list and map columns compare by reference; exact only while every arm spreads the held row.
/** @purity pure */
export function isSameRecord<T extends object>(a: T, b: T): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
}

/** @purity pure */
export function withTask(document: Document, next: Task): Document {
  const held = document.schedule.tasks.find((one) => one.uid === next.uid)
  // TRAP: return the same document when nothing changed; document-change-plan.ts compares references.
  if (held !== undefined && isSameRecord(held, next)) return document
  const tasks = document.schedule.tasks.map((one) => (one.uid === next.uid ? next : one))
  return withSchedule(document, { ...document.schedule, tasks })
}

// WHY: IV-23 holds one row for every Task; the blank row answers only for a uid no Task holds yet (CM-6 makes it).
/** @purity pure */
export function visualOf(schedule: Schedule, taskUid: number): TaskVisual {
  return schedule.taskVisuals.find((one) => one.taskUid === taskUid) ?? blankTaskVisual(taskUid)
}

// see G-1, IV-22
/** @purity pure */
export function isMilestone(task: Task): boolean {
  return task.milestone === true
}

type DayCheck =
  | { readonly ok: true; readonly day: CalendarDay }
  | { readonly ok: false; readonly what: string }

// see IV-14, T-214
/** @purity pure */
export function checkDay(text: string): DayCheck {
  const day = dayOf(text)
  if (day === null) return { ok: false, what: `is not a date: ${text}` }
  const min = dayOf(SETTINGS_CONSTANTS.importMinDate)
  const max = dayOf(SETTINGS_CONSTANTS.importMaxDate)
  if (min !== null && compareDays(day, min) < 0) {
    return { ok: false, what: `is before ${SETTINGS_CONSTANTS.importMinDate}: ${text}` }
  }
  if (max !== null && compareDays(day, max) > 0) {
    return { ok: false, what: `is after ${SETTINGS_CONSTANTS.importMaxDate}: ${text}` }
  }
  return { ok: true, day }
}

// see CM-7, FR-019
// WHY: a tip snapped to a deleted Task falls back to a free point in this same command (FR-031).
/** @purity pure */
function deleteTask(document: Document, uid: Task['uid'], defaultTaskGroupName: string): EditResult {
  const schedule = document.schedule
  const doomed = wbsSubtreesOf(schedule.tasks, [uid])

  const taskGroups: TaskGroup[] = []
  for (const group of schedule.taskGroups) {
    if (group.derivedFromTaskUid === null || !doomed.has(group.derivedFromTaskUid)) {
      taskGroups.push(group)
      continue
    }
    // WHY: settle the name rather than refuse; refusing makes every task drawn on empty space undeletable.
    taskGroups.push(settledTaskGroup(schedule, group, defaultTaskGroupName))
  }

  const tasks = schedule.tasks
    .filter((one) => !doomed.has(one.uid))
    .map((one) =>
      one.dependencies.some((link) => doomed.has(link.predecessorUid))
        ? { ...one, dependencies: one.dependencies.filter((link) => !doomed.has(link.predecessorUid)) }
        : one,
    )
  return edited(
    documentWithTableViewsKept(withSchedule(document, {
      ...schedule,
      tasks,
      taskVisuals: schedule.taskVisuals.filter((one) => !doomed.has(one.taskUid)),
      taskOrigins: schedule.taskOrigins.filter((one) => !doomed.has(one.taskUid)),
      taskGroupMembers: schedule.taskGroupMembers.filter((one) => !doomed.has(one.taskUid)),
      commentBoxes: commentBoxesReleasedFrom(schedule, {
        taskUids: doomed,
        highlightBoxIds: new Set(),
        isKeptTaskGroup: () => true,
      }),
      assignments: schedule.assignments.filter(
        (one) => one.taskUid === null || !doomed.has(one.taskUid),
      ),
      taskGroups,
    })),
  )
}

// see T-108, IV-2
/** @purity pure */
export function editTask(document: Document, command: TaskCommand, defaultTaskGroupName: string): EditResult {
  const schedule = document.schedule
  const within = workingCalendarOf(schedule)
  if (command.kind === 'pasteTasks') return pasteTasks(document, command, within)

  const named = command.kind === 'createTask' ? null : taskByUid(schedule, command.uid)
  // WHY: CM-7 is exempt; FR-032's select-all delete bundles one CM-7 per task, an earlier one can
  // carry off a later one's subtree, and refusing that one would throw the bundle away (AG-3).
  const missingTargetIsRefused = command.kind !== 'createTask' && command.kind !== 'deleteTask'
  if (missingTargetIsRefused && named === null) {
    return refused([reject(TABLE_T108_ROWS[command.kind], 'IV-2', `no Task with uid ${command.uid}`)])
  }
  // TRAP: the cast holds only for guarded kinds; createTask and deleteTask must not read task.
  const task = named as Task

  switch (command.kind) {
    case 'createTask':
      return createTask(document, command, within)

    case 'deleteTask':
      return deleteTask(document, command.uid, defaultTaskGroupName)

    case 'setTaskName':
      return edited(withTask(document, { ...task, name: command.name }))

    case 'setTaskNotes':
      return edited(withTask(document, { ...task, notes: command.notes }))

    case 'setTaskPlanDates':
      return setTaskPlanDates(document, command, task, within)

    case 'setTaskDeadline': {
      if (command.deadline !== null) {
        const checked = checkDay(command.deadline)
        if (!checked.ok) return refused([reject('CM-12', 'IV-14', `deadline ${checked.what}`)])
      }
      return edited(withTask(document, { ...task, deadline: command.deadline }))
    }

    case 'setTaskPlanActualState':
      return setTaskPlanActualState(document, command, task, within)

    case 'beginTaskActual':
      return beginTaskActual(document, command, task, within)

    case 'cycleTaskPlanActualState':
      return cycleTaskPlanActualStateInDocument(document, command, task, within)

    case 'setTaskFadeInDays':
    case 'setTaskFadeOutDays':
      return setTaskFadeDays(document, command, task)

    case 'setTaskParentTask': {
      if (command.parentUid !== null) {
        if (taskByUid(schedule, command.parentUid) === null) {
          return refused([reject('CM-18', 'IV-2', `no Task with uid ${command.parentUid}`)])
        }
        if (wbsSubtreesOf(schedule.tasks, [command.uid]).has(command.parentUid)) {
          return refused([
            reject('CM-18', 'HM-4', `uid ${command.parentUid} is inside the subtree of ${command.uid}`),
          ])
        }
      }
      return edited(withTask(document, { ...task, parentTaskUid: command.parentUid }))
    }

    case 'moveTaskToTaskGroup': {
      if (!schedule.taskGroups.some((one) => one.id === command.taskGroupId)) {
        return refused([reject('CM-19', 'IV-2', `no TaskGroup with id ${command.taskGroupId}`)])
      }
      const member = schedule.taskGroupMembers.find((one) => one.taskUid === command.uid)
      if (member === undefined) {
        return refused([reject('CM-19', 'IV-6', `uid ${command.uid} is on no task group`)])
      }
      if (member.taskGroupId === command.taskGroupId) return edited(document)
      const taskGroupMembers = schedule.taskGroupMembers.map((one) =>
        one.taskUid === command.uid ? { ...one, taskGroupId: command.taskGroupId } : one,
      )
      const moved: Schedule = { ...schedule, taskGroupMembers }
      return edited(withSchedule(document, { ...moved, tasks: tasksRankedByTheTaskGroupTree(moved) }))
    }

    case 'setTaskVisualShapeKind':
      return setTaskVisualShapeKind(document, command, task)

    case 'setTaskVisualMilestoneGlyph':
      return setTaskVisualMilestoneGlyph(document, command)

    case 'setTaskVisualColors':
      return setTaskVisualColors(document, command)

    case 'resetTaskVisualColors':
      return resetTaskVisualColors(document, command)

    case 'setTaskVisualStrokeWidthPx':
      return setTaskVisualStrokeWidthPx(document, command)
  }
}

// WHY: named so the Record reads as keyed over the generated union (check 69).
type TaskCommandKind = TaskCommand['kind']

const TABLE_T108_ROWS: Readonly<Record<TaskCommandKind, string>> = {
  createTask: 'CM-6',
  deleteTask: 'CM-7',
  pasteTasks: 'CM-8',
  setTaskName: 'CM-9',
  setTaskNotes: 'CM-10',
  setTaskPlanDates: 'CM-11',
  setTaskDeadline: 'CM-12',
  setTaskPlanActualState: 'CM-13',
  beginTaskActual: 'CM-14',
  cycleTaskPlanActualState: 'CM-15',
  setTaskFadeInDays: 'CM-16',
  setTaskFadeOutDays: 'CM-17',
  setTaskParentTask: 'CM-18',
  moveTaskToTaskGroup: 'CM-19',
  setTaskVisualShapeKind: 'CM-20',
  setTaskVisualMilestoneGlyph: 'CM-21',
  setTaskVisualColors: 'CM-22',
  resetTaskVisualColors: 'CM-23',
  setTaskVisualStrokeWidthPx: 'CM-24',
}

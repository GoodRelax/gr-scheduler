// Runs the Task and TaskVisual commands against the document.
// @unit      UF-11   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { RememberedActual } from '../../entity/document-model/screen-state/screen-state'
import {
  compareDays,
  dayOf,
  taskByUid,
  workingCalendarOf,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import { tasksRankedByTheRowTree } from './edit-task-group'
import { createTask } from './task-create'
import { pasteTaskSubtree } from './task-paste'
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
  setTaskVisualLineWeight,
  setTaskVisualMilestoneGlyph,
  setTaskVisualNamePlacement,
  setTaskVisualShapeKind,
} from './task-appearance'

export { cycleTaskPlanActualState, type CycleSurroundings, type CycledPlanActual } from './task-plan-actual'
export { repriced } from './percent-complete'

export type TaskShapeKind = NonNullable<TaskVisual['shapeKind']>

export type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

export type TaskLineWeight = NonNullable<TaskVisual['lineWeight']>

export type TaskNameAlign = NonNullable<TaskVisual['nameAlign']>

// see T-019
export type PlanActualPlacement =
  | { readonly row: 'PA-1' }
  | { readonly row: 'PA-2'; readonly actualStart: string; readonly stop: string }
  | {
      readonly row: 'PA-3'
      readonly actualStart: string
      readonly stop: string
      readonly resume: string
    }
  | { readonly row: 'PA-4'; readonly actualStart: string; readonly stop: string }
  | {
      readonly row: 'PA-5'
      readonly actualStart: string
      readonly actualFinish: string
    }

// see T-266, FR-043
export type ActualGrabHold = 'GA-5' | 'GA-6' | 'GA-17' | 'GA-21' | 'GA-22'

// see T-108
export type TaskCommand =
  | {
      readonly kind: 'createTask'
      readonly shapeKind: TaskShapeKind
      readonly start: string
      readonly finish: string
      readonly groupId: string
    }
  | { readonly kind: 'deleteTask'; readonly uid: number }
  | { readonly kind: 'pasteTaskSubtree'; readonly sourceUids: readonly number[] }
  | { readonly kind: 'setTaskName'; readonly uid: number; readonly name: string | null }
  | { readonly kind: 'setTaskNotes'; readonly uid: number; readonly notes: string | null }
  | {
      readonly kind: 'setTaskPlanDates'
      readonly uid: number
      readonly start: string
      readonly finish: string
    }
  | { readonly kind: 'setTaskDeadline'; readonly uid: number; readonly deadline: string | null }
  | {
      readonly kind: 'setTaskPlanActualState'
      readonly uid: number
      readonly place: PlanActualPlacement
    }
  | {
      readonly kind: 'beginTaskActual'
      readonly uid: number
      readonly grabbed: ActualGrabHold
      readonly droppedDay: string
    }
  | {
      readonly kind: 'cycleTaskPlanActualState'
      readonly uid: number
      readonly remembered: RememberedActual | null
    }
  | { readonly kind: 'setTaskFadeInDays'; readonly uid: number; readonly days: number | null }
  | { readonly kind: 'setTaskFadeOutDays'; readonly uid: number; readonly days: number | null }
  | { readonly kind: 'setTaskWbsParent'; readonly uid: number; readonly parentUid: number | null }
  | { readonly kind: 'moveTaskToTaskGroup'; readonly uid: number; readonly groupId: string }
  | { readonly kind: 'setTaskVisualShapeKind'; readonly uid: number; readonly shapeKind: TaskShapeKind }
  | {
      readonly kind: 'setTaskVisualMilestoneGlyph'
      readonly uid: number
      readonly glyph: TaskMilestoneGlyph | null
    }
  | {
      readonly kind: 'setTaskVisualColors'
      readonly uid: number
      readonly fillColor: string | null
      readonly strokeColor: string | null
    }
  | { readonly kind: 'resetTaskVisualColors'; readonly uid: number }
  | {
      readonly kind: 'setTaskVisualLineWeight'
      readonly uid: number
      readonly lineWeight: TaskLineWeight | null
    }
  | {
      readonly kind: 'setTaskVisualNamePlacement'
      readonly uid: number
      readonly nameAnchor: number | null
      readonly nameAlign: TaskNameAlign | null
    }


/** @purity pure */
export function withSchedule(document: Document, schedule: Schedule): Document {
  return { ...document, schedule }
}

// TRAP: list and map columns compare by reference; exact only while every arm spreads the held row.
/** @purity pure */
export function sameRow<T extends object>(a: T, b: T): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
}

/** @purity pure */
export function withTask(document: Document, next: Task): Document {
  const held = document.schedule.tasks.find((one) => one.uid === next.uid)
  // TRAP: return the same document when nothing changed; document-change-plan.ts compares references.
  if (held !== undefined && sameRow(held, next)) return document
  const tasks = document.schedule.tasks.map((one) => (one.uid === next.uid ? next : one))
  return withSchedule(document, { ...document.schedule, tasks })
}

/** @purity pure */
export function blankVisual(taskUid: number): TaskVisual {
  return {
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }
}

/** @purity pure */
export function visualOf(schedule: Schedule, taskUid: number): TaskVisual {
  return schedule.taskVisuals.find((one) => one.taskUid === taskUid) ?? blankVisual(taskUid)
}

// see AT-100, FR-083
/** @purity pure */
export function isMilestone(task: Task, visual: TaskVisual): boolean {
  return visual.shapeKind === null ? task.milestone === true : visual.shapeKind === 'milestone'
}

type DayCheck =
  | { readonly ok: true; readonly day: CalendarDay }
  | { readonly ok: false; readonly what: string }

// see IV-14, T-214
/** @purity pure */
export function checkDay(settings: DocumentSettings, text: string): DayCheck {
  const day = dayOf(text)
  if (day === null) return { ok: false, what: `is not a date: ${text}` }
  const min = dayOf(settings.importMinDate)
  const max = dayOf(settings.importMaxDate)
  if (min !== null && compareDays(day, min) < 0) {
    return { ok: false, what: `is before ${settings.importMinDate}: ${text}` }
  }
  if (max !== null && compareDays(day, max) > 0) {
    return { ok: false, what: `is after ${settings.importMaxDate}: ${text}` }
  }
  return { ok: true, day }
}

// see IV-4
// WHY: a sweep, not a recursion, because rows arrive in no parent-before-child order.
/** @purity pure */
export function wbsSubtreeOf(schedule: Schedule, root: number): ReadonlySet<number> {
  const held = new Set<number>([root])
  for (let grew = true; grew; ) {
    grew = false
    for (const task of schedule.tasks) {
      if (task.wbsParentUid !== null && held.has(task.wbsParentUid) && !held.has(task.uid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

// see T-108, IV-2
/** @purity pure */
export function editTask(document: Document, command: TaskCommand, defaultRowName: string): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const within = workingCalendarOf(schedule)
  if (command.kind === 'pasteTaskSubtree') return pasteTaskSubtree(document, command, within)

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

    case 'deleteTask': {
      const doomed = wbsSubtreeOf(schedule, command.uid)

      const taskGroups: TaskGroup[] = []
      for (const group of schedule.taskGroups) {
        if (group.derivedFromTaskUid === null || !doomed.has(group.derivedFromTaskUid)) {
          taskGroups.push(group)
          continue
        }
        // WHY: settle the name rather than refuse; refusing makes every task drawn on empty space undeletable.
        const source = taskByUid(schedule, group.derivedFromTaskUid)
        const settled = group.label ?? source?.name ?? defaultRowName
        taskGroups.push({ ...group, label: settled, derivedFromTaskUid: null })
      }

      const tasks = schedule.tasks
        .filter((one) => !doomed.has(one.uid))
        .map((one) =>
          one.dependencies.some((link) => doomed.has(link.predecessorUid))
            ? { ...one, dependencies: one.dependencies.filter((link) => !doomed.has(link.predecessorUid)) }
            : one,
        )
      return edited(
        withSchedule(document, {
          ...schedule,
          tasks,
          taskVisuals: schedule.taskVisuals.filter((one) => !doomed.has(one.taskUid)),
          taskOrigins: schedule.taskOrigins.filter((one) => !doomed.has(one.taskUid)),
          taskGroupMembers: schedule.taskGroupMembers.filter((one) => !doomed.has(one.taskUid)),
          assignments: schedule.assignments.filter(
            (one) => one.taskUid === null || !doomed.has(one.taskUid),
          ),
          taskGroups,
        }),
      )
    }

    case 'setTaskName':
      return edited(withTask(document, { ...task, name: command.name }))

    case 'setTaskNotes':
      return edited(withTask(document, { ...task, notes: command.notes }))

    case 'setTaskPlanDates':
      return setTaskPlanDates(document, command, task, within)

    case 'setTaskDeadline': {
      if (command.deadline !== null) {
        const checked = checkDay(settings, command.deadline)
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

    case 'setTaskWbsParent': {
      if (command.parentUid !== null) {
        if (taskByUid(schedule, command.parentUid) === null) {
          return refused([reject('CM-18', 'IV-2', `no Task with uid ${command.parentUid}`)])
        }
        if (wbsSubtreeOf(schedule, command.uid).has(command.parentUid)) {
          return refused([
            reject('CM-18', 'HM-4', `uid ${command.parentUid} is inside the subtree of ${command.uid}`),
          ])
        }
      }
      return edited(withTask(document, { ...task, wbsParentUid: command.parentUid }))
    }

    case 'moveTaskToTaskGroup': {
      if (!schedule.taskGroups.some((one) => one.id === command.groupId)) {
        return refused([reject('CM-19', 'IV-2', `no TaskGroup with id ${command.groupId}`)])
      }
      const member = schedule.taskGroupMembers.find((one) => one.taskUid === command.uid)
      if (member === undefined) {
        return refused([reject('CM-19', 'IV-6', `uid ${command.uid} is on no row`)])
      }
      if (member.groupId === command.groupId) return edited(document)
      const taskGroupMembers = schedule.taskGroupMembers.map((one) =>
        one.taskUid === command.uid ? { ...one, groupId: command.groupId } : one,
      )
      const moved: Schedule = { ...schedule, taskGroupMembers }
      return edited(withSchedule(document, { ...moved, tasks: tasksRankedByTheRowTree(moved) }))
    }

    case 'setTaskVisualShapeKind':
      return setTaskVisualShapeKind(document, command, task)

    case 'setTaskVisualMilestoneGlyph':
      return setTaskVisualMilestoneGlyph(document, command)

    case 'setTaskVisualColors':
      return setTaskVisualColors(document, command)

    case 'resetTaskVisualColors':
      return resetTaskVisualColors(document, command)

    case 'setTaskVisualLineWeight':
      return setTaskVisualLineWeight(document, command)

    case 'setTaskVisualNamePlacement':
      return setTaskVisualNamePlacement(document, command)
  }
}

const TABLE_T108_ROWS: Readonly<Record<TaskCommand['kind'], string>> = {
  createTask: 'CM-6',
  deleteTask: 'CM-7',
  pasteTaskSubtree: 'CM-8',
  setTaskName: 'CM-9',
  setTaskNotes: 'CM-10',
  setTaskPlanDates: 'CM-11',
  setTaskDeadline: 'CM-12',
  setTaskPlanActualState: 'CM-13',
  beginTaskActual: 'CM-14',
  cycleTaskPlanActualState: 'CM-15',
  setTaskFadeInDays: 'CM-16',
  setTaskFadeOutDays: 'CM-17',
  setTaskWbsParent: 'CM-18',
  moveTaskToTaskGroup: 'CM-19',
  setTaskVisualShapeKind: 'CM-20',
  setTaskVisualMilestoneGlyph: 'CM-21',
  setTaskVisualColors: 'CM-22',
  resetTaskVisualColors: 'CM-23',
  setTaskVisualLineWeight: 'CM-24',
  setTaskVisualNamePlacement: 'CM-25',
}

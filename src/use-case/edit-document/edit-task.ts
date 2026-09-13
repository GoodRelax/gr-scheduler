// Runs the Task and TaskVisual commands against the document.
// @unit      UF-11   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  calendarDaysBetween,
  compareDays,
  dateFromWorkingDays,
  dayOf,
  nextWorkingDay,
  planActualState,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
  type Assignment,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'
import { DEFAULT_ROW_NAME, tasksRankedByTheRowTree } from './edit-task-group'

export type TaskShapeKind = NonNullable<TaskVisual['shapeKind']>

export type TaskMilestoneGlyph = NonNullable<TaskVisual['milestoneGlyph']>

export type TaskLineWeight = NonNullable<TaskVisual['lineWeight']>

export type TaskNameAlign = NonNullable<TaskVisual['nameAlign']>

// see T-019
export type PlanActualPlacement =
  | { readonly row: 'PA-1' }
  | { readonly row: 'PA-2'; readonly actualStart: string; readonly actualDuration: number }
  | {
      readonly row: 'PA-3'
      readonly actualStart: string
      readonly actualDuration: number
      readonly resume: string
    }
  | { readonly row: 'PA-4'; readonly actualStart: string; readonly actualDuration: number }
  | {
      readonly row: 'PA-5'
      readonly actualStart: string
      readonly actualDuration: number
      readonly actualFinish: string
    }

// see T-023d, FR-043
export type ActualGrabHold = 'GR-9' | 'GR-17' | 'GR-18'

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
  | { readonly kind: 'pasteTaskSubtree'; readonly sourceUid: number }
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
  | { readonly kind: 'cycleTaskPlanActualState'; readonly uid: number }
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

const TRANSPARENT = 'transparent'

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

/** @purity pure */
function withSchedule(document: Document, schedule: Schedule): Document {
  return { ...document, schedule }
}

// TRAP: list and map columns compare by reference; exact only while every arm spreads the held row.
/** @purity pure */
function sameRow<T extends object>(a: T, b: T): boolean {
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = Object.keys(left)
  return keys.length === Object.keys(right).length && keys.every((key) => left[key] === right[key])
}

/** @purity pure */
function withTask(document: Document, next: Task): Document {
  const held = document.schedule.tasks.find((one) => one.uid === next.uid)
  // TRAP: return the same document when nothing changed; document-change-plan.ts compares references.
  if (held !== undefined && sameRow(held, next)) return document
  const tasks = document.schedule.tasks.map((one) => (one.uid === next.uid ? next : one))
  return withSchedule(document, { ...document.schedule, tasks })
}

/** @purity pure */
function withVisual(document: Document, next: TaskVisual): Document {
  const held = document.schedule.taskVisuals
  const foundAt = held.findIndex((one) => one.taskUid === next.taskUid)
  // TRAP: an absent row compares as blank, or a no-op would append a null row and move the instant.
  const standing = foundAt < 0 ? blankVisual(next.taskUid) : held[foundAt]
  if (standing !== undefined && sameRow(standing, next)) return document
  const taskVisuals = foundAt < 0 ? [...held, next] : held.map((one, index) => (index === foundAt ? next : one))
  return withSchedule(document, { ...document.schedule, taskVisuals })
}

/** @purity pure */
function blankVisual(taskUid: number): TaskVisual {
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
function visualOf(schedule: Schedule, taskUid: number): TaskVisual {
  return schedule.taskVisuals.find((one) => one.taskUid === taskUid) ?? blankVisual(taskUid)
}

// see AT-100, FR-083
/** @purity pure */
function isMilestone(task: Task, visual: TaskVisual): boolean {
  return visual.shapeKind === null ? task.milestone === true : visual.shapeKind === 'milestone'
}

type DayCheck =
  | { readonly ok: true; readonly day: CalendarDay }
  | { readonly ok: false; readonly what: string }

// see IV-14, T-214
/** @purity pure */
function checkDay(settings: DocumentSettings, text: string): DayCheck {
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

// see FR-012
/** @purity pure */
function planSpanOf(within: WorkingCalendar, task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return workingDaysBetween(within, start, finish)
}

// see FD-6, IV-12
// TRAP: count calendar days; worked days would refuse fades the handle allowed (FD-7).
/** @purity pure */
function fadeSpanOf(task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return calendarDaysBetween(start, finish)
}

// see FR-012, FR-090, EX-5
/** @purity pure */
function percentCompleteOf(within: WorkingCalendar, task: Task): number | null {
  const span = planSpanOf(within, task)
  if (span === null) return task.percentComplete
  if (span === 0) return task.actualFinish !== null ? 100 : 0
  return Math.round(((task.actualDuration ?? 0) / span) * 100)
}

// see FR-012
/** @purity pure */
export function repriced(within: WorkingCalendar, task: Task): Task {
  return { ...task, percentComplete: percentCompleteOf(within, task) }
}

const CARRIED_STOP = 'Stop'

// see T-019
// TRAP: call only where actuals are edited; dropping Stop on other edits breaks T-033's round trip.
/** @purity pure */
function actualsEdited(task: Task): Task {
  if (task.carry[CARRIED_STOP] === undefined) return task
  return {
    ...task,
    carry: Object.fromEntries(
      Object.entries(task.carry).filter(([name]) => name !== CARRIED_STOP),
    ),
  }
}

// see IV-4
// WHY: a sweep, not a recursion, because rows arrive in no parent-before-child order.
/** @purity pure */
function wbsSubtreeOf(schedule: Schedule, root: number): ReadonlySet<number> {
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
export function editTask(document: Document, command: TaskCommand): EditResult {
  const schedule = document.schedule
  const settings = document.documentSettings
  const within = workingCalendarOf(schedule)

  const named =
    command.kind === 'createTask'
      ? null
      : taskByUid(schedule, command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid)
  // WHY: CM-7 is exempt; FR-032's select-all delete bundles one CM-7 per task, an earlier one can
  // carry off a later one's subtree, and refusing that one would throw the bundle away (AG-3).
  const missingTargetIsRefused = command.kind !== 'createTask' && command.kind !== 'deleteTask'
  if (missingTargetIsRefused && named === null) {
    const uid = command.kind === 'pasteTaskSubtree' ? command.sourceUid : command.uid
    return refused([reject(TABLE_T108_ROWS[command.kind], 'IV-2', `no Task with uid ${uid}`)])
  }
  // TRAP: the cast holds only for guarded kinds; createTask and deleteTask must not read task.
  const task = named as Task

  switch (command.kind) {
    case 'createTask': {
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
        actualDuration: null,
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
      const tasks = [...schedule.tasks, repriced(within, created)]

      // TRAP: write shapeKind down; Task.milestone cannot tell SH-1 from SH-2 (AT-100).
      const taskVisuals = [...schedule.taskVisuals, { ...visualOf(schedule, uid), shapeKind: command.shapeKind }]

      const held = schedule.taskGroups.find((one) => one.id === command.groupId)
      let taskGroups = schedule.taskGroups
      if (held === undefined) {
        // STOP: spec does not decide where FR-001's new row goes. Looked in AT-55, FR-001, FR-085, FR-058
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
        const settled = group.label ?? source?.name ?? DEFAULT_ROW_NAME
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

    case 'pasteTaskSubtree': {
      // STOP: spec does not decide who passes ST-7's cap (S-89) to FR-033's refusal. Looked in ST-1, T-038
      const subtree = wbsSubtreeOf(schedule, command.sourceUid)

      let mark = schedule.project.uidHighWaterMark
      const remap = new Map<number, number>()
      for (const one of schedule.tasks) if (subtree.has(one.uid)) remap.set(one.uid, ++mark)

      const copies = schedule.tasks
        .filter((one) => subtree.has(one.uid))
        .map((one) => ({
          ...one,
          uid: remap.get(one.uid) as number,
          // STOP: spec does not decide a copied root's WBS parent. Looked in FR-033, DU-2
          wbsParentUid:
            one.uid === command.sourceUid
              ? one.wbsParentUid
              : (remap.get(one.wbsParentUid as number) as number),
          dependencies: one.dependencies
            .filter((link) => subtree.has(link.predecessorUid))
            .map((link) => ({ ...link, predecessorUid: remap.get(link.predecessorUid) as number })),
        }))

      const visualCopies = schedule.taskVisuals
        .filter((one) => subtree.has(one.taskUid))
        .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
      const memberCopies = schedule.taskGroupMembers
        .filter((one) => subtree.has(one.taskUid))
        .map((one) => ({ ...one, taskUid: remap.get(one.taskUid) as number }))
      const assignmentCopies: Assignment[] = schedule.assignments
        .filter((one) => one.taskUid !== null && subtree.has(one.taskUid))
        .map((one) => ({ ...one, uid: ++mark, taskUid: remap.get(one.taskUid as number) as number }))

      return edited(
        withSchedule(document, {
          ...schedule,
          project: { ...schedule.project, uidHighWaterMark: mark },
          tasks: [...schedule.tasks, ...copies],
          taskVisuals: [...schedule.taskVisuals, ...visualCopies],
          taskGroupMembers: [...schedule.taskGroupMembers, ...memberCopies],
          assignments: [...schedule.assignments, ...assignmentCopies],
        }),
      )
    }

    case 'setTaskName':
      return edited(withTask(document, { ...task, name: command.name }))

    case 'setTaskNotes':
      return edited(withTask(document, { ...task, notes: command.notes }))

    case 'setTaskPlanDates': {
      const start = checkDay(settings, command.start)
      const finish = checkDay(settings, command.finish)
      if (!start.ok || !finish.ok) {
        const faults: Refusal[] = []
        if (!start.ok) faults.push(reject('CM-11', 'IV-14', `start ${start.what}`))
        if (!finish.ok) faults.push(reject('CM-11', 'IV-14', `finish ${finish.what}`))
        return refused(faults)
      }
      if (compareDays(finish.day, start.day) < 0) {
        return refused([reject('CM-11', 'FR-012', 'finish is before start')])
      }
      const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0)
      const span = calendarDaysBetween(start.day, finish.day)
      if (fade > span) {
        return refused([
          reject('CM-11', 'IV-12', `fade of ${fade} days does not fit a plan of ${span}`),
        ])
      }
      const moved = { ...task, start: command.start, finish: command.finish }
      return edited(withTask(document, repriced(within, moved)))
    }

    case 'setTaskDeadline': {
      if (command.deadline !== null) {
        const checked = checkDay(settings, command.deadline)
        if (!checked.ok) return refused([reject('CM-12', 'IV-14', `deadline ${checked.what}`)])
      }
      return edited(withTask(document, { ...task, deadline: command.deadline }))
    }

    case 'setTaskPlanActualState': {
      const place = command.place
      const faults: Refusal[] = []
      const dates: readonly (readonly [string, string])[] =
        place.row === 'PA-1'
          ? []
          : place.row === 'PA-3'
            ? [['actualStart', place.actualStart], ['resume', place.resume]]
            : place.row === 'PA-5'
              ? [['actualStart', place.actualStart], ['actualFinish', place.actualFinish]]
              : [['actualStart', place.actualStart]]
      for (const [label, text] of dates) {
        const checked = checkDay(settings, text)
        if (!checked.ok) faults.push(reject('CM-13', 'IV-14', `${label} ${checked.what}`))
      }
      // STOP: spec does not decide an actual whose ends cross. Looked in T-220, T-023d
      const laid = place.row === 'PA-1' ? null : place.actualDuration
      if (laid !== null && laid < 0) {
        faults.push(
          reject('CM-13', 'AT-39', `an actual of ${laid} worked days ends before it starts`),
        )
      }
      if (faults.length > 0) return refused(faults)

      const floorOfActual = isMilestone(task, visualOf(schedule, task.uid))
        ? settings.milestoneActualDuration
        : settings.actualInitialDuration
      const heldDuration = laid === null ? null : Math.max(laid, floorOfActual)

      let placed: Task
      switch (place.row) {
        case 'PA-1':
          // TRAP: leave resumeValid alone; T-019's PA-1 cell is a dash, not empty.
          placed = { ...task, actualStart: null, actualDuration: null, actualFinish: null, resume: null }
          break
        case 'PA-2':
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: null,
            resumeValid: true,
          }
          break
        case 'PA-3':
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: place.resume,
            resumeValid: true,
          }
          break
        case 'PA-4':
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: null,
            resume: null,
            resumeValid: false,
          }
          break
        case 'PA-5':
          placed = {
            ...task,
            actualStart: place.actualStart,
            actualDuration: heldDuration,
            actualFinish: place.actualFinish,
            resume: null,
            resumeValid: false,
          }
          break
      }
      return edited(withTask(document, repriced(within, actualsEdited(placed))))
    }

    case 'beginTaskActual': {
      if (planActualState(task) !== 'notStarted') {
        return refused([reject('CM-14', 'FR-043', 'the task has already been started')])
      }
      const visual = visualOf(schedule, task.uid)
      const isDrawnAsMilestone = isMilestone(task, visual)
      const duration = isDrawnAsMilestone
        ? settings.milestoneActualDuration
        : settings.actualInitialDuration
      const dropped = checkDay(settings, command.droppedDay)
      if (!dropped.ok) {
        return refused([reject('CM-14', 'IV-14', `droppedDay ${dropped.what}`)])
      }
      if (command.grabbed === 'GR-17') {
        // TRAP: nextWorkingDay, not dateFromWorkingDays(start, 1), which moves a Friday start to Saturday;
        // schedule-layout.ts uses the same member, so change both together.
        const planStart = dayOf(task.start)
        if (planStart === null) {
          return refused([
            reject('CM-14', 'FR-043', 'the task names no plan start for the finish handle to fix its start by'),
          ])
        }
        const pinned = nextWorkingDay(within, planStart)
        const pulled: Task = {
          ...task,
          actualStart: textOfDay(pinned),
          actualDuration: workingDaysBetween(within, pinned, dropped.day),
          resumeValid: true,
        }
        return edited(withTask(document, repriced(within, actualsEdited(pulled))))
      }
      const begun: Task = {
        ...task,
        actualStart: textOfDay(dropped.day),
        actualDuration: duration,
        resumeValid: true,
      }
      return edited(withTask(document, repriced(within, actualsEdited(begun))))
    }

    case 'cycleTaskPlanActualState': {
      const state = planActualState(task)
      let turned: Task
      switch (state) {
        case 'notStarted': {
          const from = dayOf(task.start)
          if (from === null) {
            return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
          }
          const visual = visualOf(schedule, task.uid)
          const duration = isMilestone(task, visual)
            ? settings.milestoneActualDuration
            : settings.actualInitialDuration
          turned = {
            ...task,
            actualStart: task.start,
            actualFinish: textOfDay(dateFromWorkingDays(within, from, duration)),
            actualDuration: duration,
            resumeValid: false,
          }
          break
        }
        case 'inProgress': {
          const from = dayOf(task.actualStart)
          if (from === null || task.actualDuration === null) {
            return refused([reject('CM-15', 'FR-011', 'the actual bar has no right end to read')])
          }
          turned = {
            ...task,
            actualFinish: textOfDay(dateFromWorkingDays(within, from, task.actualDuration)),
            resumeValid: false,
          }
          break
        }
        case 'finished':
          // WHY: clear resume, or an imported finished task keeps a past resume date and lands on PS-4.
          turned = { ...task, actualFinish: null, resume: null, resumeValid: false }
          break
        case 'suspendedResumeUnknown':
        case 'suspendedResumePlanned':
          turned = { ...task, resume: null, resumeValid: true }
          break
      }
      return edited(withTask(document, repriced(within, actualsEdited(turned))))
    }

    case 'setTaskFadeInDays':
    case 'setTaskFadeOutDays': {
      const row = command.kind === 'setTaskFadeInDays' ? 'CM-16' : 'CM-17'
      const days = command.days
      if (days !== null) {
        if (!Number.isInteger(days) || days < 0) {
          return refused([reject(row, 'FD-7', `fade days must be a whole number of days, not ${days}`)])
        }
        if (task.finish === null) {
          return refused([reject(row, 'IV-11', 'a task with a fade must have a finish')])
        }
        const span = fadeSpanOf(task)
        const other = command.kind === 'setTaskFadeInDays' ? task.fadeOutDays : task.fadeInDays
        if (span !== null && days + (other ?? 0) > span) {
          return refused([
            reject(row, 'IV-12', `fade of ${days + (other ?? 0)} days does not fit a plan of ${span}`),
          ])
        }
      }
      const faded =
        command.kind === 'setTaskFadeInDays'
          ? { ...task, fadeInDays: days }
          : { ...task, fadeOutDays: days }
      return edited(withTask(document, faded))
    }

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

    case 'setTaskVisualShapeKind': {
      const visual = visualOf(schedule, command.uid)
      const wanted = command.shapeKind === 'milestone'
      if (isMilestone(task, visual) !== wanted) {
        return refused([
          reject('CM-20', 'FR-083', 'a milestone and a task with a duration are not interchangeable'),
        ])
      }
      return edited(withVisual(document, { ...visual, shapeKind: command.shapeKind }))
    }

    case 'setTaskVisualMilestoneGlyph': {
      // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
      if (
        command.glyph !== null
        && !(COLUMN_SHAPES.TaskVisual.milestoneGlyph?.choices ?? []).includes(command.glyph)
      ) {
        return refused([
          reject('CM-21', 'FR-078', 'the figure is not one of those table T-012 SH-5 names'),
        ])
      }
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, milestoneGlyph: command.glyph }))
    }

    case 'setTaskVisualColors': {
      if (command.fillColor === TRANSPARENT && command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-22', 'IV-9', 'the fill and the stroke may not both be transparent')])
      }
      // STOP: spec does not decide how to test FR-007's palette membership. Looked in CL-1, T-017, AT-102
      const visual = visualOf(schedule, command.uid)
      return edited(
        withVisual(document, {
          ...visual,
          fillColor: command.fillColor,
          strokeColor: command.strokeColor,
        }),
      )
    }

    case 'resetTaskVisualColors': {
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, fillColor: null, strokeColor: null }))
    }

    case 'setTaskVisualLineWeight': {
      const visual = visualOf(schedule, command.uid)
      return edited(withVisual(document, { ...visual, lineWeight: command.lineWeight }))
    }

    case 'setTaskVisualNamePlacement': {
      if (
        command.nameAnchor !== null &&
        (!Number.isInteger(command.nameAnchor) || command.nameAnchor < 0 || command.nameAnchor > 8)
      ) {
        return refused([
          reject('CM-25', 'AT-98', `the name anchor is an integer 0 to 8, not ${command.nameAnchor}`),
        ])
      }
      const visual = visualOf(schedule, command.uid)
      return edited(
        withVisual(document, {
          ...visual,
          nameAnchor: command.nameAnchor,
          nameAlign: command.nameAlign,
        }),
      )
    }
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

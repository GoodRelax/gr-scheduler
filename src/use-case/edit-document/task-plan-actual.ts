// Places a Task's plan and actual dates by tables T-245, T-019 and T-021a.
// @unit      UF-74   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import type { RememberedActual } from '../../entity/document-model/screen-state/screen-state'
import {
  actualLengthOf,
  calendarDaysBetween,
  compareDays,
  dayOf,
  lastDayForLength,
  planActualState,
  plannedDurationMinutesOf,
  textOfFinishSide,
  textOfStartSide,
  type CalendarDay,
  type Project,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import {
  checkDay,
  isMilestone,
  withTask,
  type ActualGrabHold,
  type TaskCommand,
} from './edit-task'
import { repriced } from './percent-complete'

// see GO-6, GO-7
const DUMMY_FINISH_HOLDS: readonly ActualGrabHold[] = ['GA-6', 'GA-22']

// see FR-011, S-129, S-130, PV-1
// WHY: a milestone's floor day is its actualStart itself, so no length is counted for it.
/** @purity pure */
function floorDayOf(within: WorkingCalendar, start: CalendarDay, milestone: boolean): CalendarDay {
  return milestone ? start : lastDayForLength(within, start, SETTINGS_CONSTANTS.actualInitialDuration)
}

type LastDayCheck =
  | { readonly ok: true; readonly lastDay: CalendarDay }
  | { readonly ok: false; readonly length: number }

// see FR-011, IV-21
// WHY: a length below 0 is refused, a length of 0 or under the floor is lifted to the floor day.
/** @purity pure */
function settledLastDay(within: WorkingCalendar, start: CalendarDay, lastDay: CalendarDay,
                        floor: CalendarDay): LastDayCheck {
  const length = actualLengthOf(within, start, lastDay)
  if (length < 0) return { ok: false, length }
  return { ok: true, lastDay: compareDays(lastDay, floor) < 0 ? floor : lastDay }
}

const CARRIED_ACTUAL_DURATION = 'ActualDuration'

// see T-019
// TRAP: call only where actuals are edited; dropping ActualDuration on other edits breaks T-033's round trip.
/** @purity pure */
function actualsEdited(task: Task): Task {
  if (task.carry[CARRIED_ACTUAL_DURATION] === undefined) return task
  return {
    ...task,
    carry: Object.fromEntries(
      Object.entries(task.carry).filter(([name]) => name !== CARRIED_ACTUAL_DURATION),
    ),
  }
}

export interface CycleSurroundings {
  // WHY: PV-1 / PV-5 put the start's day back as an actual the cycle writes, so it takes the WT-3 start-side time.
  readonly startSide: string | null
  readonly floorDay: string | null
  readonly milestone: boolean
}

export interface CycledPlanActual {
  readonly task: Task
  readonly remembered: RememberedActual | null
}

// see PV-4
/** @purity pure */
function actualTakenOff(task: Task): RememberedActual {
  return {
    actualStart: task.actualStart,
    actualFinish: task.actualFinish,
    stop: task.stop,
    carriedActualDuration: task.carry[CARRIED_ACTUAL_DURATION] ?? null,
  }
}

// see PV-1, PV-5
// WHY: the carried duration goes back with the days, so putting the same actual back is no edit.
/** @purity pure */
function actualPutBack(task: Task, actual: RememberedActual): Task {
  const carry =
    actual.carriedActualDuration === null
      ? task.carry
      : { ...task.carry, [CARRIED_ACTUAL_DURATION]: actual.carriedActualDuration }
  return {
    ...task,
    actualStart: actual.actualStart,
    actualFinish: actual.actualFinish,
    stop: actual.stop,
    resume: null,
    carry,
  }
}

// see PV-4
/** @purity pure */
function actualCleared(task: Task): Task {
  return actualsEdited({
    ...task,
    actualStart: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: false,
  })
}

// see DU-1, PV-4, FR-090
/** @purity pure */
function unstartedCopyOf(task: Task): Task {
  return { ...actualCleared(task), percentComplete: 0 }
}

// see CM-8, CM-28, DU-1, EX-12
// WHY: the one rule for a copy on both pastes (Task and task group): unstarted, and its dates read as edited.
/** @purity pure */
export function pastedCopyOf(task: Task, schedule: Schedule, within: WorkingCalendar): Task {
  return planDatesEdited(unstartedCopyOf(task), schedule, within)
}

// see PV-1
/** @purity pure */
function startedAgain(task: Task, remembered: RememberedActual | null,
                      around: CycleSurroundings): Task {
  if (remembered !== null) return { ...actualPutBack(task, remembered), resumeValid: true }
  if (task.start === null) return task
  return actualsEdited({
    ...task,
    actualStart: around.startSide,
    stop: around.floorDay,
    actualFinish: null,
    resume: null,
    resumeValid: true,
  })
}

// see PV-5
/** @purity pure */
function cycledMilestone(task: Task, remembered: RememberedActual | null,
                         state: ReturnType<typeof planActualState>, startSide: string | null): CycledPlanActual {
  if (state !== 'notStarted') {
    return { task: actualCleared(task), remembered: actualTakenOff(task) }
  }
  if (remembered !== null) {
    return { task: { ...actualPutBack(task, remembered), resumeValid: false }, remembered: null }
  }
  if (task.start === null) return { task, remembered }
  return {
    task: actualsEdited({
      ...task,
      actualStart: startSide,
      actualFinish: startSide,
      stop: null,
      resume: null,
      resumeValid: false,
    }),
    remembered: null,
  }
}

// see CM-15, T-021a
// TRAP: `around` left out reads S-129 as 1; hand the floor day in, or PV-1 puts a one-day actual where it is longer.
/** @purity pure */
export function cycleTaskPlanActualState(
  task: Task,
  remembered: RememberedActual | null,
  around: CycleSurroundings = { startSide: task.start, floorDay: task.start, milestone: task.milestone === true },
): CycledPlanActual {
  const state = planActualState(task)
  if (around.milestone) return cycledMilestone(task, remembered, state, around.startSide)
  switch (state) {
    case 'notStarted':
      return { task: startedAgain(task, remembered, around), remembered: null }
    case 'inProgress':
      // WHY: one replacement moves the last day, so no actual without a last day is seen (PV-2).
      return task.stop === null
        ? { task, remembered }
        : {
            task: actualsEdited({ ...task, actualFinish: task.stop, stop: null, resumeValid: false }),
            remembered,
          }
    case 'finished':
      // WHY: move the last day to stop, or clearing actualFinish erases the actual's right end (PV-3).
      return {
        task: actualsEdited({
          ...task,
          stop: task.actualFinish,
          actualFinish: null,
          resume: null,
          resumeValid: false,
        }),
        remembered,
      }
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return { task: actualCleared(task), remembered: actualTakenOff(task) }
  }
}

const CARRIED_SLACKS: readonly string[] = ['FreeSlack', 'TotalSlack', 'StartSlack', 'FinishSlack']

const CARRIED_PLAN_LEAVES: readonly string[] = ['ConstraintType', 'ConstraintDate', 'Duration']

// see EX-11
const MUST_START_ON = '2'

interface DatedPlan {
  readonly startText: string
  readonly finishText: string
  readonly duration: string
}

// see DV-8, EX-9
/** @purity pure */
function datedPlanOf(task: Task, schedule: Schedule, within: WorkingCalendar): DatedPlan | null {
  const startText = task.start
  const finishText = task.finish
  const minutes = plannedDurationMinutesOf(within, task, schedule.project)
  if (minutes === null || startText === null || finishText === null) return null
  return { startText, finishText, duration: durationText(minutes) }
}

// see EX-11, EX-12, AT-143
// WHY: a document read from MSPDI writes its carry back as it stands (EX-2), so these replace what would
// contradict the dates; a grs document has them written on export, so its carried ones are dropped.
/** @purity pure */
function pinnedToStart(task: Task, schedule: Schedule, span: DatedPlan): Task {
  if (schedule.project.sourceFormat === 'grs') {
    const kept = Object.entries(task.carry).filter(([name]) => !CARRIED_PLAN_LEAVES.includes(name))
    return { ...task, carry: Object.fromEntries(kept) }
  }
  const pinned = { ConstraintType: MUST_START_ON, ConstraintDate: span.startText, Duration: span.duration }
  return { ...task, carry: { ...task.carry, ...pinned } }
}

// see EX-11, EX-12, FR-033
// WHY: a copy is a task GRS adds, not one the partner sent (FR-033 gives it no TaskOrigin), so a pasted subtree
// comes through here as well: the links leaving the subtree do not come along, so the source's slack is no fact.
/** @purity pure */
export function planDatesEdited(task: Task, schedule: Schedule, within: WorkingCalendar): Task {
  const span = datedPlanOf(task, schedule, within)
  if (span === null) {
    // WHY: EX-12 keeps no carried slack even undated; Manual*/constraint rebuilding needs both dates (DV-8).
    // TRAP: nothing shipped makes a dateless task; only a test guards this -- press live once one can enter (JDG-366).
    const kept = Object.entries(task.carry).filter(([name]) => !CARRIED_SLACKS.includes(name))
    return { ...task, carry: Object.fromEntries(kept) }
  }
  const rebuilt: ReadonlyMap<string, string> = new Map([
    ['ManualStart', span.startText],
    ['ManualFinish', span.finishText],
    ['ManualDuration', span.duration],
  ])
  const kept = Object.entries(task.carry)
    .filter(([name]) => !CARRIED_SLACKS.includes(name))
    .map(([name, value]): [string, string] => [name, rebuilt.get(name) ?? value])
  return pinnedToStart({ ...task, carry: Object.fromEntries(kept) }, schedule, span)
}

// see EX-9
/** @purity pure */
function durationText(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}

// see CM-11, FR-103
/** @purity pure */
export function setTaskPlanDates(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskPlanDates' }>,
  task: Task,
  within: WorkingCalendar,
): EditResult {
  const schedule = document.schedule
  const start = checkDay(command.start)
  const finish = checkDay(command.finish)
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
  const moved = planDatesEdited({ ...task, start: command.start, finish: command.finish }, schedule, within)
  return edited(withTask(document, repriced(within, moved)))
}

// see CM-13, FR-103
/** @purity pure */
export function setTaskPlanActualState(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskPlanActualState' }>,
  task: Task,
  within: WorkingCalendar,
): EditResult {
  const place = command.place
  const faults: Refusal[] = []
  const dates: readonly (readonly [string, string])[] =
    place.row === 'PA-1'
      ? []
      : place.row === 'PA-3'
        ? [['actualStart', place.actualStart], ['stop', place.stop], ['resume', place.resume]]
        : place.row === 'PA-5'
          ? [['actualStart', place.actualStart], ['actualFinish', place.actualFinish]]
          : [['actualStart', place.actualStart], ['stop', place.stop]]
  for (const [label, text] of dates) {
    const checked = checkDay(text)
    if (!checked.ok) faults.push(reject('CM-13', 'IV-14', `${label} ${checked.what}`))
  }
  if (faults.length > 0) return refused(faults)

  if (place.row === 'PA-1') {
    // TRAP: leave resumeValid alone; T-019's PA-1 cell is a dash, not empty.
    const cleared: Task = { ...task, actualStart: null, stop: null, actualFinish: null, resume: null }
    return edited(withTask(document, repriced(within, actualsEdited(cleared))))
  }

  const askedText = place.row === 'PA-5' ? place.actualFinish : place.stop
  const from = dayOf(place.actualStart) as CalendarDay
  const asked = dayOf(askedText) as CalendarDay
  const milestone = isMilestone(task)
  const settled = settledLastDay(within, from, asked, floorDayOf(within, from, milestone))
  if (!settled.ok) {
    return refused([
      reject('CM-13', 'IV-21', `an actual of ${settled.length} worked days ends before it starts`),
    ])
  }
  const lastDay = compareDays(settled.lastDay, asked) === 0
    ? askedText : textOfFinishSide(settled.lastDay, document.schedule.project)

  let placed: Task
  switch (place.row) {
    case 'PA-2':
      placed = {
        ...task,
        actualStart: place.actualStart,
        stop: lastDay,
        actualFinish: null,
        resume: null,
        resumeValid: true,
      }
      break
    case 'PA-3':
      placed = {
        ...task,
        actualStart: place.actualStart,
        stop: lastDay,
        actualFinish: null,
        resume: place.resume,
        resumeValid: true,
      }
      break
    case 'PA-4':
      placed = {
        ...task,
        actualStart: place.actualStart,
        stop: lastDay,
        actualFinish: null,
        resume: null,
        resumeValid: false,
      }
      break
    case 'PA-5':
      placed = {
        ...task,
        actualStart: place.actualStart,
        stop: null,
        actualFinish: lastDay,
        resume: null,
        resumeValid: false,
      }
      break
  }
  return edited(withTask(document, repriced(within, actualsEdited(placed))))
}

// see CM-14, FR-043
/** @purity pure */
export function beginTaskActual(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'beginTaskActual' }>,
  task: Task,
  within: WorkingCalendar,
): EditResult {
  if (planActualState(task) !== 'notStarted') {
    return refused([reject('CM-14', 'FR-043', 'the task has already been started')])
  }
  const milestone = isMilestone(task)
  const project: Project = document.schedule.project
  const dropped = checkDay(command.droppedDay)
  if (!dropped.ok) {
    return refused([reject('CM-14', 'IV-14', `droppedDay ${dropped.what}`)])
  }
  if (DUMMY_FINISH_HOLDS.includes(command.grabbed)) {
    // TRAP: the plan start day itself, where schedule-layout.ts and task-figures.ts stand the dummy (DM-1); change all three together.
    const planStart = dayOf(task.start)
    if (planStart === null) {
      return refused([
        reject('CM-14', 'FR-043', 'the task names no plan start for the finish handle to fix its start by'),
      ])
    }
    const pinned = planStart
    // WHY: the released day is the last day itself and is not moved to a working day (GO-3, FR-043).
    const settled = settledLastDay(
      within, pinned, dropped.day, floorDayOf(within, pinned, milestone),
    )
    if (!settled.ok) {
      return refused([
        reject('CM-14', 'IV-21', `an actual of ${settled.length} worked days ends before it starts`),
      ])
    }
    const pulled: Task = {
      ...task,
      actualStart: textOfStartSide(pinned, project, milestone),
      stop: textOfFinishSide(settled.lastDay, project),
      resumeValid: true,
    }
    return edited(withTask(document, repriced(within, actualsEdited(pulled))))
  }
  const begun: Task = {
    ...task,
    actualStart: textOfStartSide(dropped.day, project, milestone),
    stop: textOfFinishSide(floorDayOf(within, dropped.day, milestone), project),
    resumeValid: true,
  }
  return edited(withTask(document, repriced(within, actualsEdited(begun))))
}

// see CM-15, T-021a
/** @purity pure */
export function cycleTaskPlanActualStateInDocument(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'cycleTaskPlanActualState' }>,
  task: Task,
  within: WorkingCalendar,
): EditResult {
  const state = planActualState(task)
  const milestone = isMilestone(task)
  const from = dayOf(task.start)
  if (state === 'notStarted' && command.remembered === null && from === null) {
    return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
  }
  if (state === 'inProgress' && task.stop === null) {
    return refused([reject('CM-15', 'FR-011', 'the actual has no last day to finish on')])
  }
  const project = document.schedule.project
  const startSide = from === null ? null : textOfStartSide(from, project, milestone)
  const floorDay = from === null ? null : textOfFinishSide(floorDayOf(within, from, milestone), project)
  const turned = cycleTaskPlanActualState(task, command.remembered, { startSide, floorDay, milestone })
  return edited(withTask(document, repriced(within, turned.task)))
}

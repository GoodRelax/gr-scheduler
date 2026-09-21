// Places a Task's plan and actual dates by tables T-245, T-019 and T-021a.
// @unit      UF-74   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { RememberedActual } from '../../entity/document-model/screen-state/screen-state'
import {
  DEFAULT_CALENDAR_VALUES,
  actualLengthOf,
  calendarDaysBetween,
  compareDays,
  dayOf,
  lastDayForLength,
  planActualState,
  textOfDay,
  workingDaysBetween,
  type CalendarDay,
  type Schedule,
  type Task,
  type WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import {
  checkDay,
  isMilestone,
  visualOf,
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
function floorDayOf(within: WorkingCalendar, settings: DocumentSettings, start: CalendarDay,
                    milestone: boolean): CalendarDay {
  return milestone ? start : lastDayForLength(within, start, settings.actualInitialDuration)
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

// see PV-1
/** @purity pure */
function startedAgain(task: Task, remembered: RememberedActual | null,
                      around: CycleSurroundings): Task {
  if (remembered !== null) return { ...actualPutBack(task, remembered), resumeValid: true }
  if (task.start === null) return task
  return actualsEdited({
    ...task,
    actualStart: task.start,
    stop: around.floorDay,
    actualFinish: null,
    resume: null,
    resumeValid: true,
  })
}

// see PV-5
/** @purity pure */
function cycledMilestone(task: Task, remembered: RememberedActual | null,
                         state: ReturnType<typeof planActualState>): CycledPlanActual {
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
      actualStart: task.start,
      actualFinish: task.start,
      stop: null,
      resume: null,
      resumeValid: false,
    }),
    remembered: null,
  }
}

// see CM-15, T-021a
// TRAP: `around` left out reads S-129 as 1 and S-130 as the plan start; a document that raised
// S-129 must hand the floor day in, or PV-1 puts a one-day actual where the floor is longer.
/** @purity pure */
export function cycleTaskPlanActualState(
  task: Task,
  remembered: RememberedActual | null,
  around: CycleSurroundings = { floorDay: task.start, milestone: task.milestone === true },
): CycledPlanActual {
  const state = planActualState(task)
  if (around.milestone) return cycledMilestone(task, remembered, state)
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
  readonly start: CalendarDay
  readonly finish: CalendarDay
  readonly duration: string
}

// see DV-8, EX-9
/** @purity pure */
function datedPlanOf(task: Task, schedule: Schedule, within: WorkingCalendar): DatedPlan | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  const duration = durationText(workingDaysBetween(within, start, finish) * minutesPerDayOf(schedule))
  return { start, finish, duration }
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
  const pinned = { ConstraintType: MUST_START_ON, ConstraintDate: textOfDay(span.start), Duration: span.duration }
  return { ...task, carry: { ...task.carry, ...pinned } }
}

// see EX-11, EX-12, FR-033
// WHY: a copy is a task GRS adds, not one the partner sent (FR-033 gives it no TaskOrigin), so a pasted subtree
// comes through here as well: the links leaving the subtree do not come along, so the source's slack is no fact.
/** @purity pure */
export function planDatesEdited(task: Task, schedule: Schedule, within: WorkingCalendar): Task {
  const span = datedPlanOf(task, schedule, within)
  if (span === null) return task
  const rebuilt: ReadonlyMap<string, string> = new Map([
    ['ManualStart', textOfDay(span.start)],
    ['ManualFinish', textOfDay(span.finish)],
    ['ManualDuration', span.duration],
  ])
  const kept = Object.entries(task.carry)
    .filter(([name]) => !CARRIED_SLACKS.includes(name))
    .map(([name, value]): [string, string] => [name, rebuilt.get(name) ?? value])
  return pinnedToStart({ ...task, carry: Object.fromEntries(kept) }, schedule, span)
}

// see FR-054, S-128
/** @purity pure */
function minutesPerDayOf(schedule: Schedule): number {
  const held = schedule.project.minutesPerDay
  return held !== null && held > 0 ? held : DEFAULT_CALENDAR_VALUES['S-128']
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
  const settings = document.documentSettings
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
  const schedule = document.schedule
  const settings = document.documentSettings
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
    const checked = checkDay(settings, text)
    if (!checked.ok) faults.push(reject('CM-13', 'IV-14', `${label} ${checked.what}`))
  }
  if (faults.length > 0) return refused(faults)

  if (place.row === 'PA-1') {
    // TRAP: leave resumeValid alone; T-019's PA-1 cell is a dash, not empty.
    const cleared: Task = { ...task, actualStart: null, stop: null, actualFinish: null, resume: null }
    return edited(withTask(document, repriced(within, actualsEdited(cleared))))
  }

  const askedText = place.row === 'PA-5' ? place.actualFinish : place.stop
  // WHY: checkDay above has read both texts as days, so neither is null here.
  const from = dayOf(place.actualStart) as CalendarDay
  const asked = dayOf(askedText) as CalendarDay
  const milestone = isMilestone(task, visualOf(schedule, task.uid))
  const settled = settledLastDay(within, from, asked, floorDayOf(within, settings, from, milestone))
  if (!settled.ok) {
    return refused([
      reject('CM-13', 'IV-21', `an actual of ${settled.length} worked days ends before it starts`),
    ])
  }
  const lastDay = compareDays(settled.lastDay, asked) === 0 ? askedText : textOfDay(settled.lastDay)

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
  const schedule = document.schedule
  const settings = document.documentSettings
  if (planActualState(task) !== 'notStarted') {
    return refused([reject('CM-14', 'FR-043', 'the task has already been started')])
  }
  const isDrawnAsMilestone = isMilestone(task, visualOf(schedule, task.uid))
  const dropped = checkDay(settings, command.droppedDay)
  if (!dropped.ok) {
    return refused([reject('CM-14', 'IV-14', `droppedDay ${dropped.what}`)])
  }
  if (DUMMY_FINISH_HOLDS.includes(command.grabbed)) {
    // TRAP: the plan start day itself, where schedule-layout.ts and schedule-geometry.ts stand the dummy (DM-1);
    // change all three together.
    const planStart = dayOf(task.start)
    if (planStart === null) {
      return refused([
        reject('CM-14', 'FR-043', 'the task names no plan start for the finish handle to fix its start by'),
      ])
    }
    const pinned = planStart
    // WHY: the released day is the last day itself and is not moved to a working day (GO-3, FR-043).
    const settled = settledLastDay(
      within, pinned, dropped.day, floorDayOf(within, settings, pinned, isDrawnAsMilestone),
    )
    if (!settled.ok) {
      return refused([
        reject('CM-14', 'IV-21', `an actual of ${settled.length} worked days ends before it starts`),
      ])
    }
    const pulled: Task = {
      ...task,
      actualStart: textOfDay(pinned),
      stop: textOfDay(settled.lastDay),
      resumeValid: true,
    }
    return edited(withTask(document, repriced(within, actualsEdited(pulled))))
  }
  const begun: Task = {
    ...task,
    actualStart: textOfDay(dropped.day),
    stop: textOfDay(floorDayOf(within, settings, dropped.day, isDrawnAsMilestone)),
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
  const schedule = document.schedule
  const settings = document.documentSettings
  const state = planActualState(task)
  const milestone = isMilestone(task, visualOf(schedule, task.uid))
  const from = dayOf(task.start)
  if (state === 'notStarted' && command.remembered === null && from === null) {
    return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
  }
  if (state === 'inProgress' && task.stop === null) {
    return refused([reject('CM-15', 'FR-011', 'the actual has no last day to finish on')])
  }
  const floorDay = from === null ? null : textOfDay(floorDayOf(within, settings, from, milestone))
  const turned = cycleTaskPlanActualState(task, command.remembered, { floorDay, milestone })
  return edited(withTask(document, repriced(within, turned.task)))
}

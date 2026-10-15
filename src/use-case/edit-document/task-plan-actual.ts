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
  instantAfterWorkingMinutes,
  instantOf,
  instantOnSide,
  lastDayForLength,
  MINUTES_PER_CALENDAR_DAY,
  planActualState,
  plannedDurationMinutesOf,
  startSideOf,
  textOfFinishSide,
  textOfInstant,
  textOfStartSide,
  type CalendarDay,
  type DateTimeSide,
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
function datedPlanOf(task: Task, within: WorkingCalendar): DatedPlan | null {
  const startText = task.start
  const finishText = task.finish
  const minutes = plannedDurationMinutesOf(within, task)
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
  const span = datedPlanOf(task, within)
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

// see GO-6, GO-7, GO-8, GO-9, PV-1, T-378, FR-158
interface DummyActualFrame {
  readonly within: WorkingCalendar
  readonly project: Project
  readonly milestone: boolean
  readonly side: DateTimeSide
  readonly showsTimeOfDay: boolean
  readonly snapMinutes: number
}

/** @purity pure */
function dummyActualFrameOf(document: Document, task: Task, within: WorkingCalendar,
                            snapMinutes: number): DummyActualFrame {
  return {
    within,
    project: document.schedule.project,
    milestone: isMilestone(task),
    side: startSideOf(task),
    showsTimeOfDay: document.documentSettings.showsTimeOfDay,
    snapMinutes,
  }
}

// see GO-6, PV-1, FR-158, T-378
/** @purity pure */
function isTimedDummy(frame: DummyActualFrame): boolean {
  return frame.showsTimeOfDay && frame.snapMinutes < MINUTES_PER_CALENDAR_DAY
}

// WHY: S-585 working minutes from the start, never shorter than the snap unit in force (JDG-2108, FR-011's floor).
/** @purity pure */
function dummyActualEndOf(within: WorkingCalendar, start: number, snapMinutes: number): number {
  return Math.max(
    instantAfterWorkingMinutes(within, start, NOT_STORED_DUMMY_ACTUAL_MINUTES['S-585']),
    start + snapMinutes,
  )
}

// WHY: with time of day shown the instant itself, a date-only text read on its side; never the day's default time.
/** @purity pure */
function dummyStartText(text: string | null, day: CalendarDay, frame: DummyActualFrame): string {
  if (!frame.showsTimeOfDay) return textOfStartSide(day, frame.project, frame.milestone)
  const instant = instantOnSide(frame.within, text, frame.side)
  return instant === null ? textOfStartSide(day, frame.project, frame.milestone) : textOfInstant(instant)
}

// WHY: a shown milestone is a point on its instant; a timed actual runs S-585; otherwise it ends on the floor day.
/** @purity pure */
function dummyLastText(actualStart: string, startDay: CalendarDay, frame: DummyActualFrame): string {
  if (frame.milestone && frame.showsTimeOfDay) return actualStart
  const instant = instantOf(actualStart)
  if (!frame.milestone && isTimedDummy(frame) && instant !== null) {
    return textOfInstant(dummyActualEndOf(frame.within, instant, frame.snapMinutes))
  }
  return textOfFinishSide(floorDayOf(frame.within, startDay, frame.milestone), frame.project)
}

// WHY: a timed release before start + snap is lifted to it, the floor FR-011 puts at the snap unit.
/** @purity pure */
function dummyFinishText(actualStart: string, released: string, lastDay: CalendarDay,
                         frame: DummyActualFrame): string {
  const from = instantOf(actualStart)
  const to = instantOf(released)
  if (!isTimedDummy(frame) || from === null || to === null) return textOfFinishSide(lastDay, frame.project)
  return textOfInstant(Math.max(to, from + frame.snapMinutes))
}

// WHY: the start stays on the plan start, where the dummy stands (DM-1); the released place is the last day itself.
/** @purity pure */
function dummyFinishWrite(document: Document, task: Task, released: string,
                          frame: DummyActualFrame): EditResult {
  const planStart = dayOf(task.start)
  if (planStart === null) {
    return refused([
      reject('CM-14', 'FR-043', 'the task names no plan start for the finish handle to fix its start by'),
    ])
  }
  // WHY: the released day is the last day itself and is not moved to a working day (GO-3, FR-043).
  const settled = settledLastDay(
    frame.within, planStart, dayOf(released) as CalendarDay, floorDayOf(frame.within, planStart, frame.milestone),
  )
  if (!settled.ok) {
    return refused([
      reject('CM-14', 'IV-21', `an actual of ${settled.length} worked days ends before it starts`),
    ])
  }
  const actualStart = dummyStartText(task.start, planStart, frame)
  const pulled: Task = {
    ...task,
    actualStart,
    stop: dummyFinishText(actualStart, released, settled.lastDay, frame),
    resumeValid: true,
  }
  return edited(withTask(document, repriced(frame.within, actualsEdited(pulled))))
}

// see CM-14, FR-043, GO-6, GO-7, GO-8, GO-9
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
  const checks: readonly (readonly [string, string])[] = [
    ['released.start', command.released.start],
    ['released.finish', command.released.finish],
  ]
  for (const [label, text] of checks) {
    const checked = checkDay(text)
    if (!checked.ok) return refused([reject('CM-14', 'IV-14', `${label} ${checked.what}`)])
  }
  const frame = dummyActualFrameOf(document, task, within, command.snapMinutes)
  if (DUMMY_FINISH_HOLDS.includes(command.grabbed)) {
    return dummyFinishWrite(document, task, command.released.finish, frame)
  }
  const startDay = dayOf(command.released.start) as CalendarDay
  const actualStart = dummyStartText(command.released.start, startDay, frame)
  const begun: Task = {
    ...task,
    actualStart,
    stop: dummyLastText(actualStart, startDay, frame),
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
  const from = dayOf(task.start)
  if (state === 'notStarted' && command.remembered === null && from === null) {
    return refused([reject('CM-15', 'FR-012', 'the task does not name both plan dates')])
  }
  if (state === 'inProgress' && task.stop === null) {
    return refused([reject('CM-15', 'FR-011', 'the actual has no last day to finish on')])
  }
  const frame = dummyActualFrameOf(document, task, within, command.snapMinutes ?? MINUTES_PER_CALENDAR_DAY)
  const startSide = from === null ? null : dummyStartText(task.start, from, frame)
  const floorDay = from === null || startSide === null ? null : dummyLastText(startSide, from, frame)
  const turned = cycleTaskPlanActualState(task, command.remembered, { startSide, floorDay, milestone: frame.milestone })
  return edited(withTask(document, repriced(within, turned.task)))
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_DUMMY_ACTUAL_MINUTES: {
  readonly 'S-585': number
} = {
  'S-585': 60,
}
// </generated>

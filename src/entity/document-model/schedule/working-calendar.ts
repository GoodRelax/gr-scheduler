// Schedule -- working days on the document's calendar: judged, counted, stepped, and the actual length.
// @unit      UF-128  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import {
  compareDays,
  dayFromSerial,
  dayOf,
  serial,
  textOfDay,
  type CalendarDay,
} from './calendar-day'
import { planActualState } from './plan-actual-state'
import {
  DEFAULT_CALENDAR_VALUES,
  type Calendar,
  type Exception,
  type Schedule,
  type Task,
  type WeekDay,
} from './schedule-entities'

export interface WorkingCalendar {
  readonly calendar: Calendar
  readonly weekDays: readonly WeekDay[]
  readonly exceptions: readonly Exception[]
}

interface ExceptionSpan {
  readonly from: number
  readonly toInclusive: number
  readonly isWorking: boolean
}

interface CalendarIndex {
  readonly exceptionSpans: readonly ExceptionSpan[]
  readonly worksWeekday: readonly (boolean | undefined)[]
}

// TRAP: build it once per walk, never per day: the layout counts working days for every Task each frame.
/** @purity pure */
function indexOfCalendar(within: WorkingCalendar): CalendarIndex {
  const exceptionSpans: ExceptionSpan[] = []
  for (const exception of within.exceptions) {
    const from = dayOf(exception.fromDate)
    if (from === null) continue
    const toInclusive = dayOf(exception.toDate) ?? from
    exceptionSpans.push({
      from: serial(from),
      toInclusive: serial(toInclusive),
      isWorking: exception.dayWorking === true,
    })
  }

  const worksWeekday: (boolean | undefined)[] = new Array<boolean | undefined>(8)
  for (const weekDay of within.weekDays) {
    const dayType = weekDay.dayType
    if (dayType === null || dayType < 1 || dayType > 7) continue
    if (worksWeekday[dayType] === undefined) worksWeekday[dayType] = weekDay.dayWorking === true
  }

  return { exceptionSpans, worksWeekday }
}

/** @purity pure */
function isWorkingDayAt(index: CalendarIndex, atSerial: number): boolean {
  for (const span of index.exceptionSpans) {
    if (atSerial >= span.from && atSerial <= span.toInclusive) return span.isWorking
  }
  const weekday = new Date(atSerial * 86400000).getUTCDay() + 1
  return index.worksWeekday[weekday] === true
}

/** @purity pure */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  // TRAP: S-106 is in dayType numbering (1 = Sunday), not weekStartDay's (0 = Sunday).
  dayWorking: DEFAULT_CALENDAR_VALUES['S-106'].includes(dayType),
  carry: {},
  carryElements: [],
}))

const DEFAULT_CALENDAR: Calendar = {
  uid: 0,
  name: null,
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: DEFAULT_WEEK_DAYS,
  exceptions: [],
}

// WHY: baseCalendarUid is not walked; the import resolves inheritance once instead of every frame.
// see FR-054
/** @purity pure */
export function workingCalendarOf(schedule: Schedule): WorkingCalendar {
  const named = schedule.project.calendarUid
  const held = named === null ? undefined : schedule.calendars.find((one) => one.uid === named)
  const base = schedule.calendars
    .filter((one) => one.isBaseCalendar === true)
    .reduce<Calendar | undefined>(
      (best, one) => (best === undefined || one.ordinal < best.ordinal ? one : best),
      undefined,
    )
  const calendar = held ?? base ?? DEFAULT_CALENDAR
  return { calendar, weekDays: calendar.weekDays, exceptions: calendar.exceptions }
}

const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }

const ACCEPTED_DAY_SPAN = serial(IMPORT_MAX_DAY) - serial(IMPORT_MIN_DAY)

// see T-214
export class NoWorkingDayReached extends Error {
  /** @purity pure */
  constructor(readonly calendarUid: number) {
    super(`table T-214: calendar ${calendarUid} works no day inside the accepted range`)
    this.name = 'NoWorkingDayReached'
  }
}

// see T-214
export class DaySpanTooWide extends Error {
  /** @purity pure */
  constructor(readonly from: CalendarDay, readonly to: CalendarDay) {
    super(
      `table T-214: ${textOfDay(from)} to ${textOfDay(to)} is wider than the `
      + `${ACCEPTED_DAY_SPAN} days the accepted range holds`,
    )
    this.name = 'DaySpanTooWide'
  }
}

/** @purity pure */
export function workingDaysBetween(within: WorkingCalendar, from: CalendarDay,
                                   to: CalendarDay): number {
  const start = serial(from)
  const stop = serial(to)
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new DaySpanTooWide(from, to)
  const index = indexOfCalendar(within)
  const step = stop < start ? -1 : 1
  let counted = 0
  for (let at = start; at !== stop; at += step) {
    if (isWorkingDayAt(index, step > 0 ? at : at - 1)) counted += step
  }
  return counted
}

/** @purity pure */
export function dateFromWorkingDays(within: WorkingCalendar, from: CalendarDay,
                                    workingDays: number): CalendarDay {
  const index = indexOfCalendar(within)
  const step = workingDays < 0 ? -1 : 1
  let remaining = Math.abs(workingDays)
  let at = serial(from)
  let walked = 0
  while (remaining > 0) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    const covered = step > 0 ? at : at - 1
    at += step
    if (isWorkingDayAt(index, covered)) remaining -= 1
  }
  return dayFromSerial(at)
}

// WHY: not dateFromWorkingDays(from, 1), which answers a half-open end bound (Saturday for a Friday).
// see FR-043, FR-054
/** @purity pure */
export function nextWorkingDay(within: WorkingCalendar, from: CalendarDay): CalendarDay {
  const index = indexOfCalendar(within)
  let at = serial(from) + 1
  let walked = 0
  while (!isWorkingDayAt(index, at)) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
  }
  return dayFromSerial(at)
}

// see FR-011, T-019
/** @purity pure */
export function actualLastDay(task: Task): CalendarDay | null {
  if (planActualState(task) === 'notStarted') return null
  return dayOf(task.actualFinish !== null ? task.actualFinish : task.stop)
}

// see FR-011, IV-21
/** @purity pure */
export function actualLengthOf(within: WorkingCalendar, start: CalendarDay,
                               lastDay: CalendarDay): number {
  const order = compareDays(lastDay, start)
  if (order < 0) return -workingDaysBetween(within, lastDay, start)
  if (order === 0) return 1
  const between = workingDaysBetween(within, dayFromSerial(serial(start) + 1), lastDay)
  return between + 2
}

// see FR-011
/** @purity pure */
export function lastDayForLength(within: WorkingCalendar, start: CalendarDay,
                                 length: number): CalendarDay {
  if (length === 0) return start
  if (length < 0) return dateFromWorkingDays(within, start, length)
  const index = indexOfCalendar(within)
  let at = serial(start)
  let remaining = length - 1
  let walked = 0
  while (remaining > 0) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
    if (isWorkingDayAt(index, at)) remaining -= 1
  }
  return dayFromSerial(at)
}

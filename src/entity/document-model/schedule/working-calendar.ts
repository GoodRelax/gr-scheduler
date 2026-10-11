// Schedule -- working days on the document's calendar: judged, counted, stepped, a lag's working days, the actual length.
// @unit      UF-128  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import {
  MINUTES_PER_CALENDAR_DAY,
  compareDays,
  dayFromSerial,
  dayOf,
  instantOf,
  isDateWithoutTime,
  serial,
  textOfDay,
  textOfDayAt,
  type CalendarDay,
} from './calendar-day'
import { SETTINGS_CONSTANTS } from '../document-settings/document-settings'
import { planActualState } from './plan-actual-state'
import {
  DEFAULT_CALENDAR_VALUES,
  type Calendar,
  type Dependency,
  type Exception,
  type Project,
  type Schedule,
  type Task,
  type WeekDay,
  type WorkingTime,
} from './schedule-entities'

export interface WorkingCalendar {
  readonly calendar: Calendar
  readonly weekDays: readonly WeekDay[]
  readonly exceptions: readonly Exception[]
  readonly weekStartDay?: number | null
}

interface ExceptionSpan {
  readonly ordinal: number
  readonly from: number
  readonly toInclusive: number
  readonly isWorking: boolean
}

interface CalendarIndex {
  readonly exceptionSpans: readonly ExceptionSpan[]
  readonly worksWeekday: readonly (boolean | undefined)[]
}

export const DAILY_RECURRENCE_KIND = 1
const NO_RECURRENCE_KIND = 9
const ONE_DAY_PERIOD = 1

// see AT-82, FR-054
/** @purity pure */
export function isNonRecurringException(exception: Pick<Exception, 'recurrenceKind' | 'carry'>): boolean {
  const kind = exception.recurrenceKind
  if (kind === null || kind === NO_RECURRENCE_KIND) return true
  if (kind !== DAILY_RECURRENCE_KIND) return false
  const period = exception.carry['Period']?.trim() ?? ''
  return period === '' || Number(period) === ONE_DAY_PERIOD
}

// TRAP: build it once per walk, never per day: the layout counts working days for every Task each frame.
/** @purity pure */
function indexOfCalendar(within: WorkingCalendar): CalendarIndex {
  const exceptionSpans: ExceptionSpan[] = []
  for (const exception of within.exceptions) {
    if (!isNonRecurringException(exception)) continue
    const from = dayOf(exception.fromDate)
    if (from === null) continue
    const toInclusive = dayOf(exception.toDate) ?? from
    exceptionSpans.push({
      ordinal: exception.ordinal,
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
  return index.worksWeekday[dayTypeAt(atSerial)] === true
}

/** @purity pure */
function dayTypeAt(atSerial: number): number {
  return new Date(atSerial * 86400000).getUTCDay() + 1
}

/** @purity pure */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

// see AT-72, AT-73, AT-74, AT-158
/** @purity pure */
export function weekDayOf(ordinal: number, dayType: number, dayWorking: boolean): WeekDay {
  return { ordinal, dayType, dayWorking, workingTimes: [], carry: {}, carryElements: [] }
}

// TRAP: S-106 is in dayType numbering (1 = Sunday), not weekStartDay's (0 = Sunday).
const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) =>
  weekDayOf(ordinal, dayType, DEFAULT_CALENDAR_VALUES['S-106'].includes(dayType)))

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
  return {
    calendar,
    weekDays: calendar.weekDays,
    exceptions: calendar.exceptions,
    weekStartDay: schedule.project.weekStartDay,
  }
}

const ACCEPTED_DAY_SPAN = daySpanOf(
  SETTINGS_CONSTANTS.importMinDate,
  SETTINGS_CONSTANTS.importMaxDate,
)

// see S-119, S-120
/** @purity pure */
function daySpanOf(fromText: string, toText: string): number {
  const from = dayOf(fromText)
  const to = dayOf(toText)
  if (from === null || to === null) {
    throw new Error(`S-119 / S-120: ${fromText} to ${toText} is not a pair of days`)
  }
  return serial(to) - serial(from)
}

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

export type DateTimeSide = 'start' | 'finish'

type MilestoneMark = Partial<Pick<Task, 'milestone'>>

type PlannedEnds = Pick<Task, 'start' | 'finish'> & MilestoneMark

// see T-350, WT-5
/** @purity pure */
export function startSideOf(task: MilestoneMark): DateTimeSide {
  return task.milestone === true ? 'finish' : 'start'
}

// see FR-054, WC-8
// WHY: only a date without a time needs the calendar, so the index is built for it alone.
/** @purity pure */
export function instantOnSide(within: WorkingCalendar, text: string | null, side: DateTimeSide): number | null {
  const day = text !== null && isDateWithoutTime(text) ? dayOf(text) : null
  if (day === null) return instantOf(text)
  const index = timeIndexOf(within)
  const own = spansAt(index, serial(day))
  const spans = own.length > 0 ? own : index.workingSet
  const edge = side === 'start' ? spans[0]?.from ?? 0 : spans[spans.length - 1]?.to ?? MINUTES_PER_CALENDAR_DAY
  return serial(day) * MINUTES_PER_CALENDAR_DAY + edge
}

/** @purity pure */
function planInstantsOf(within: WorkingCalendar, task: PlannedEnds): readonly [number, number] | null {
  const start = instantOnSide(within, task.start, startSideOf(task))
  const finish = instantOnSide(within, task.finish, 'finish')
  return start === null || finish === null ? null : [start, finish]
}

// see FR-011, T-019
/** @purity pure */
export function actualInstantsOf(within: WorkingCalendar, task: Task): readonly [number, number] | null {
  const start = instantOnSide(within, task.actualStart, startSideOf(task))
  const end = instantOnSide(within, actualEndOf(task), 'finish')
  return start === null || end === null ? null : [start, end]
}

// see IV-10, FR-054
/** @purity pure */
export function isPlanReversed(within: WorkingCalendar, task: PlannedEnds): boolean {
  const plan = planInstantsOf(within, task)
  return plan !== null && plan[1] < plan[0]
}

type CountOfMinutes = (within: WorkingCalendar, start: number, end: number) => number

/** @purity pure */
function plannedMinutesBy(count: CountOfMinutes, within: WorkingCalendar, task: Task): number | null {
  const plan = planInstantsOf(within, task)
  if (plan === null) return null
  return task.milestone === true ? 0 : count(within, plan[0], plan[1])
}

// see DV-8, EX-12
/** @purity pure */
export function plannedDurationMinutesOf(within: WorkingCalendar, task: Task): number | null {
  return plannedMinutesBy(workingMinutesBetween, within, task)
}

// see FR-012, FR-011
/** @purity pure */
export function plannedLengthMinutesOf(within: WorkingCalendar, task: Task): number | null {
  return plannedMinutesBy(actualMinutesOf, within, task)
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

export interface MinuteSpan {
  readonly from: number
  readonly to: number
}

interface TimeIndex {
  readonly days: CalendarIndex
  readonly weekdaySpans: readonly (readonly MinuteSpan[])[]
  readonly exceptionSpans: ReadonlyMap<number, readonly MinuteSpan[]>
  readonly workingSet: readonly MinuteSpan[]
}

const NO_SPANS: readonly MinuteSpan[] = []

/** @purity pure */
function minuteOfClock(text: string | null, isEnd: boolean): number | null {
  const at = text === null ? null : instantOf(`1970-01-01T${text.trim()}`)
  if (at === null) return null
  return isEnd && at === 0 ? MINUTES_PER_CALENDAR_DAY : at
}

// see AT-158, AT-159, AT-161, AT-162, IV-24
/** @purity pure */
function spansOfTimes(times: readonly WorkingTime[]): readonly MinuteSpan[] {
  const spans: MinuteSpan[] = []
  for (const time of times) {
    const from = minuteOfClock(time.fromTime, false)
    const to = minuteOfClock(time.toTime, true)
    if (from !== null && to !== null && from < to) spans.push({ from, to })
  }
  return spans.sort((a, b) => a.from - b.from)
}

const DEFAULT_SPANS: readonly MinuteSpan[] = spansOfTimes(defaultWorkingTimes())

/** @purity pure */
function defaultWorkingTimes(): readonly WorkingTime[] {
  return DEFAULT_CALENDAR_VALUES['S-580'].map(([fromTime, toTime], ordinal) => ({ ordinal, fromTime, toTime }))
}

/** @purity pure */
function keyOfSpans(spans: readonly MinuteSpan[]): string {
  return spans.map((span) => `${span.from}-${span.to}`).join(',')
}

export interface WorkingTimeSet {
  readonly workingTimes: readonly WorkingTime[]
  readonly unlikeDayTypes: readonly number[]
}

// see WC-8, WC-9, FR-088
/** @purity pure */
export function workingTimeSetOf(within: WorkingCalendar): WorkingTimeSet {
  const startType = (within.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108']) + 1
  const ordered = [...within.weekDays]
    .filter((one) => one.dayWorking === true && one.dayType !== null && spansOfTimes(one.workingTimes).length > 0)
    .sort((a, b) => ((a.dayType ?? 0) - startType + 7) % 7 - ((b.dayType ?? 0) - startType + 7) % 7)
  const counts = new Map<string, number>()
  for (const one of ordered) {
    const key = keyOfSpans(spansOfTimes(one.workingTimes))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const best = ordered.reduce<WeekDay | undefined>((held, one) => {
    if (held === undefined) return one
    const count = (day: WeekDay): number => counts.get(keyOfSpans(spansOfTimes(day.workingTimes))) ?? 0
    return count(one) > count(held) ? one : held
  }, undefined)
  if (best === undefined) return { workingTimes: defaultWorkingTimes(), unlikeDayTypes: [] }
  const bestKey = keyOfSpans(spansOfTimes(best.workingTimes))
  const unlike = ordered.filter((one) => keyOfSpans(spansOfTimes(one.workingTimes)) !== bestKey)
  return { workingTimes: best.workingTimes, unlikeDayTypes: unlike.map((one) => one.dayType ?? 0) }
}

/** @purity pure */
function timeIndexOf(within: WorkingCalendar): TimeIndex {
  const weekdaySpans: (readonly MinuteSpan[])[] = new Array<readonly MinuteSpan[]>(8).fill(NO_SPANS)
  for (const weekDay of [...within.weekDays].reverse()) {
    const dayType = weekDay.dayType
    if (dayType === null || dayType < 1 || dayType > 7) continue
    const own = spansOfTimes(weekDay.workingTimes)
    weekdaySpans[dayType] = weekDay.dayWorking !== true ? NO_SPANS : own.length > 0 ? own : DEFAULT_SPANS
  }
  const exceptionSpans = new Map<number, readonly MinuteSpan[]>()
  for (const exception of within.exceptions.filter(isNonRecurringException)) {
    const own = spansOfTimes(exception.workingTimes)
    exceptionSpans.set(exception.ordinal, exception.dayWorking !== true ? NO_SPANS : own.length > 0 ? own : DEFAULT_SPANS)
  }
  return {
    days: indexOfCalendar(within),
    weekdaySpans,
    exceptionSpans,
    workingSet: spansOfTimes(workingTimeSetOf(within).workingTimes),
  }
}

// see FR-054, AT-82
/** @purity pure */
function spansAt(index: TimeIndex, atSerial: number): readonly MinuteSpan[] {
  for (const span of index.days.exceptionSpans) {
    if (atSerial >= span.from && atSerial <= span.toInclusive) return index.exceptionSpans.get(span.ordinal) ?? NO_SPANS
  }
  return index.weekdaySpans[dayTypeAt(atSerial)] ?? NO_SPANS
}

/** @purity pure */
function minutesInside(spans: readonly MinuteSpan[], from: number, to: number): number {
  let sum = 0
  for (const span of spans) sum += Math.max(0, Math.min(span.to, to) - Math.max(span.from, from))
  return sum
}

type SpansOfDay = (atSerial: number) => readonly MinuteSpan[]

// see FR-054, DV-8
/** @purity pure */
function minutesOver(spansOfDay: SpansOfDay, from: number, to: number): number {
  const first = Math.floor(from / MINUTES_PER_CALENDAR_DAY)
  const last = Math.floor((to - 1) / MINUTES_PER_CALENDAR_DAY)
  if (last - first > ACCEPTED_DAY_SPAN) throw new DaySpanTooWide(dayFromSerial(first), dayFromSerial(last))
  let sum = 0
  for (let at = first; at <= last; at += 1) {
    const base = at * MINUTES_PER_CALENDAR_DAY
    sum += minutesInside(spansOfDay(at), from - base, to - base)
  }
  return sum
}

// see OD-1, OD-2, FR-054
// WHY: one index for every day a frame paints; built per day it would parse the calendar again each day.
/** @purity pure */
export function workingSpansReader(within: WorkingCalendar): (atSerial: number) => readonly MinuteSpan[] {
  const index = timeIndexOf(within)
  return (atSerial) => spansAt(index, atSerial)
}

// see FR-054, DV-8
/** @purity pure */
export function workingMinutesBetween(within: WorkingCalendar, from: number, to: number): number {
  if (to <= from) return to === from ? 0 : -workingMinutesBetween(within, to, from)
  const index = timeIndexOf(within)
  return minutesOver((at) => spansAt(index, at), from, to)
}

// see FR-011
/** @purity pure */
function edgeSpansOf(index: TimeIndex, startSerial: number, endSerial: number): SpansOfDay {
  return (at) => {
    const held = spansAt(index, at)
    const isEdge = at === startSerial || at === endSerial
    return isEdge && !isWorkingDayAt(index.days, at) ? index.workingSet : held
  }
}

// see FR-011, FR-012, IV-21
/** @purity pure */
export function actualMinutesOf(within: WorkingCalendar, start: number, end: number): number {
  if (end === start) return 0
  const startSerial = Math.floor(start / MINUTES_PER_CALENDAR_DAY)
  const endSerial = Math.floor((end - 1) / MINUTES_PER_CALENDAR_DAY)
  const spansOfDay = edgeSpansOf(timeIndexOf(within), startSerial, endSerial)
  return end > start ? minutesOver(spansOfDay, start, end) : -minutesOver(spansOfDay, end, start)
}

// see IV-21, FR-011
/** @purity pure */
export function reversedActualMinutesOf(within: WorkingCalendar, task: Task): number | null {
  const actual = actualInstantsOf(within, task)
  return actual === null || actual[1] >= actual[0] ? null : actualMinutesOf(within, actual[0], actual[1])
}

// see FR-011, T-019
/** @purity pure */
export function actualEndOf(task: Task): string | null {
  if (planActualState(task) === 'notStarted') return null
  return task.actualFinish !== null ? task.actualFinish : task.stop
}

// see FR-011, AT-141
// WHY: the start's own day is an edge, so it counts by actualMinutesOf's own rule and the two agree.
// On a range boundary both ways stop at the earlier instant, the end of a range (FR-011).
/** @purity pure */
export function instantAfterWorkingMinutes(within: WorkingCalendar, from: number, minutes: number): number {
  if (minutes === 0) return from
  const index = timeIndexOf(within)
  const forward = minutes > 0
  const firstSerial = Math.floor((forward ? from : from - 1) / MINUTES_PER_CALENDAR_DAY)
  const startSerial = Math.floor(from / MINUTES_PER_CALENDAR_DAY)
  const spansOfDay = edgeSpansOf(index, startSerial, startSerial)
  let remaining = Math.abs(minutes)
  for (let walked = 0, at = firstSerial; walked <= ACCEPTED_DAY_SPAN; walked += 1, at += forward ? 1 : -1) {
    const base = at * MINUTES_PER_CALENDAR_DAY
    const spans = forward ? spansOfDay(at) : [...spansOfDay(at)].reverse()
    for (const span of spans) {
      const lo = Math.max(span.from, forward ? from - base : -Infinity)
      const hi = Math.min(span.to, forward ? Infinity : from - base)
      if (hi <= lo) continue
      if (forward ? hi - lo >= remaining : hi - lo > remaining) return base + (forward ? lo + remaining : hi - remaining)
      remaining -= hi - lo
    }
  }
  throw new NoWorkingDayReached(within.calendar.uid)
}

// see FR-054, RS-89
/** @purity pure */
export function holdsWorkingDayUnlikeMinutesPerDay(schedule: Schedule): boolean {
  const within = workingCalendarOf(schedule)
  const index = timeIndexOf(within)
  const day = minutesPerWorkingDayOf(schedule.project)
  const spanSums = [...index.weekdaySpans, ...index.exceptionSpans.values()]
    .filter((spans) => spans.length > 0)
    .map((spans) => minutesInside(spans, 0, MINUTES_PER_CALENDAR_DAY))
  return spanSums.some((sum) => sum !== day)
}

/** @purity pure */
function workingTimesSumOf(workingTimes: readonly WorkingTime[]): number {
  return minutesInside(spansOfTimes(workingTimes), 0, MINUTES_PER_CALENDAR_DAY)
}

// see FR-088, RS-89
/** @purity pure */
export function isWorkingTimeSetUnlikeDay(project: Project, workingTimes: readonly WorkingTime[]): boolean {
  return workingTimesSumOf(workingTimes) !== minutesPerWorkingDayOf(project)
}

// see WC-8, WC-9
/** @purity pure */
export function isSameWorkingTimeSet(left: readonly WorkingTime[], right: readonly WorkingTime[]): boolean {
  return keyOfSpans(spansOfTimes(left)) === keyOfSpans(spansOfTimes(right))
}

// see IV-24
/** @purity pure */
export function workingTimesBreach(workingTimes: readonly WorkingTime[], most: number): string | null {
  if (workingTimes.length > most) return `${workingTimes.length} working time spans, over ${most}`
  const spans = spansOfTimes(workingTimes)
  if (spans.length < workingTimes.length) return 'a working time span does not start before it ends'
  const overlapped = spans.some((span, index) => index > 0 && span.from < (spans[index - 1]?.to ?? 0))
  return overlapped ? 'two working time spans overlap' : null
}

// see AT-47
export const TENTHS_OF_A_MINUTE = 10

// see FR-009, S-118, AT-48
// WHY: the code is the exchange partner's (mspdi_pj12.xsd:2203, 7 = d); no table of the spec holds it as a value.
export const WORKING_DAY_LAG_FORMAT = 7

// see FR-054, S-128
/** @purity pure */
export function minutesPerWorkingDayOf(project: Project): number {
  const held = project.minutesPerDay
  return held !== null && held > 0 ? held : DEFAULT_CALENDAR_VALUES['S-128']
}

/** @purity pure */
export function defaultStartTimeOf(project: Project): string {
  const held = project.defaultStartTime
  return held ?? DEFAULT_CALENDAR_VALUES['S-482']
}

/** @purity pure */
export function defaultFinishTimeOf(project: Project): string {
  const held = project.defaultFinishTime
  return held ?? DEFAULT_CALENDAR_VALUES['S-483']
}

/** @purity pure */
export function textOfStartSide(day: CalendarDay, project: Project, milestone: boolean): string {
  const time = milestone ? defaultFinishTimeOf(project) : defaultStartTimeOf(project)
  return textOfDayAt(day, time)
}

/** @purity pure */
export function textOfFinishSide(day: CalendarDay, project: Project): string {
  const time = defaultFinishTimeOf(project)
  return textOfDayAt(day, time)
}

// see FR-009, AT-47, AT-48
// TRAP: null means GRS does not read the lag's format, never "no lag"; a zero lag is zero whatever its format.
/** @purity pure */
export function lagWorkingDaysOf(dependency: Dependency, minutesPerDay: number): number | null {
  const lag = dependency.lag ?? 0
  if (lag === 0) return 0
  if (dependency.lagFormat !== WORKING_DAY_LAG_FORMAT) return null
  return lag / TENTHS_OF_A_MINUTE / minutesPerDay
}

// see FR-009, AT-47
/** @purity pure */
export function lagOfWorkingDays(workingDays: number, minutesPerDay: number): number {
  return Math.round(workingDays * minutesPerDay * TENTHS_OF_A_MINUTE)
}

// CalendarDraft: the Holiday Settings draft -- built from the document's calendar, edited, judged and turned into CM-39.
// @unit      UF-203  (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  DAILY_RECURRENCE_KIND,
  dayOf,
  DEFAULT_CALENDAR_VALUES,
  isNonRecurringException,
  isSameDay,
  isSameWorkingTimeSet,
  serial,
  textOfDay,
  workingCalendarOf,
  workingTimeSetOf,
  workingTimesBreach,
  type CalendarDay,
  type Exception,
  type Schedule,
  type WorkingCalendar,
  type WorkingTime,
} from '../../entity/document-model/schedule/schedule'
import type { DocumentCommand } from '../edit-document/edit-document'

export interface CalendarDraftRange {
  readonly start: string
  readonly end: string
}

// see T-280, FR-088, WC-2, WC-3, WC-4, WC-8
export interface CalendarDraft {
  readonly workingDayTypes: readonly number[]
  readonly weekStartDay: number
  readonly ranges: readonly CalendarDraftRange[]
  readonly exceptions: readonly Exception[]
}

export type CalendarDraftRangeSide = 'start' | 'end'

// see WC-10
export type CalendarDraftRefusal =
  | { readonly kind: 'timeNotReadable'; readonly rangeIndex: number; readonly side: CalendarDraftRangeSide; readonly text: string }
  | { readonly kind: 'startNotBeforeEnd'; readonly rangeIndex: number }
  | { readonly kind: 'rangesOverlap'; readonly firstIndex: number; readonly secondIndex: number }
  | { readonly kind: 'noWorkingWeekday' }
  | { readonly kind: 'exceptionFromAfterTo'; readonly ordinal: number }
  | { readonly kind: 'exceptionsOverlap'; readonly firstOrdinal: number; readonly secondOrdinal: number }

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 1440

// see WC-8, T-375
const CLOCK_TEXT = /^(\d{1,2}):([0-5]\d)$/

const RANGE_ADDED_AFTER_MINUTES = 60
const RANGE_ADDED_LENGTH_MINUTES = 60
const RANGE_ADDED_WITHOUT_END_MINUTES = 8 * MINUTES_PER_HOUR

/** @purity pure */
function padded(n: number): string {
  return String(n).padStart(2, '0')
}

/** @purity pure */
function shownClockOf(minute: number): string {
  return `${Math.floor(minute / MINUTES_PER_HOUR)}:${padded(minute % MINUTES_PER_HOUR)}`
}

// see WC-8, IV-24
// WHY: H:MM and HH:MM up to 24:00; the end side reads 0:00 as 24:00.
/** @purity pure */
export function draftClockMinuteOf(text: string, side: CalendarDraftRangeSide): number | null {
  const hit = CLOCK_TEXT.exec(text.trim())
  if (hit === null) return null
  const minute = Number(hit[1]) * MINUTES_PER_HOUR + Number(hit[2])
  if (minute > MINUTES_PER_DAY) return null
  return side === 'end' && minute === 0 ? MINUTES_PER_DAY : minute
}

/** @purity pure */
function minuteOfStoredClock(text: string | null, side: CalendarDraftRangeSide): number | null {
  const hit = /^(\d{2}):(\d{2})/.exec(text?.trim() ?? '')
  if (hit === null) return null
  return draftClockMinuteOf(`${hit[1]}:${hit[2]}`, side)
}

/** @purity pure */
function storedClockOf(minute: number): string {
  const hour = Math.floor(minute / MINUTES_PER_HOUR)
  return `${padded(hour === 24 && minute % MINUTES_PER_HOUR === 0 ? 0 : hour)}:${padded(minute % MINUTES_PER_HOUR)}:00`
}

/** @purity pure */
function rangeOfStored(time: WorkingTime): CalendarDraftRange {
  const from = minuteOfStoredClock(time.fromTime, 'start')
  const to = minuteOfStoredClock(time.toTime, 'end')
  return {
    start: from === null ? (time.fromTime ?? '') : shownClockOf(from),
    end: to === null ? (time.toTime ?? '') : shownClockOf(to),
  }
}

// see WC-8, IV-24
// WHY: a start of 24:00 is written as 24:00:00, which the calendar does not read, so CM-39 refuses it as out of order.
/** @purity pure */
function workingTimeOf(range: CalendarDraftRange, ordinal: number): WorkingTime | null {
  const from = draftClockMinuteOf(range.start, 'start')
  const to = draftClockMinuteOf(range.end, 'end')
  if (from === null || to === null) return null
  const fromTime = from === MINUTES_PER_DAY ? '24:00:00' : storedClockOf(from)
  return { ordinal, fromTime, toTime: storedClockOf(to) }
}

/** @purity pure */
export function calendarDraftOf(schedule: Schedule): CalendarDraft {
  const within = workingCalendarOf(schedule)
  return {
    workingDayTypes: workingDayTypesOf(within),
    weekStartDay: within.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
    ranges: workingTimeSetOf(within).workingTimes.map(rangeOfStored),
    exceptions: within.exceptions,
  }
}

/** @purity pure */
function workingDayTypesOf(within: WorkingCalendar): readonly number[] {
  const seen = new Map<number, boolean>()
  for (const one of within.weekDays) {
    if (one.dayType !== null && !seen.has(one.dayType)) seen.set(one.dayType, one.dayWorking === true)
  }
  return [...seen].flatMap(([dayType, isWorking]) => (isWorking ? [dayType] : [])).sort(byDayType)
}

/** @purity pure */
function byDayType(left: number, right: number): number {
  return left - right
}

/** @purity pure */
export function shownCalendarDraft(draft: CalendarDraft | null, schedule: Schedule): CalendarDraft {
  return draft ?? calendarDraftOf(schedule)
}

// see WC-9
/** @purity pure */
export function otherHoursDayTypesOf(draft: CalendarDraft, schedule: Schedule): readonly number[] {
  const working = new Set(draft.workingDayTypes)
  return workingTimeSetOf(workingCalendarOf(schedule)).unlikeDayTypes.filter((dayType) => working.has(dayType))
}

// see IC-133, WC-2
/** @purity pure */
export function withWeekdayToggled(draft: CalendarDraft, dayType: number): CalendarDraft {
  const held = draft.workingDayTypes.includes(dayType)
  const workingDayTypes = held
    ? draft.workingDayTypes.filter((one) => one !== dayType)
    : [...draft.workingDayTypes, dayType].sort(byDayType)
  return { ...draft, workingDayTypes }
}

/** @purity pure */
export function withWeekStart(draft: CalendarDraft, weekStartDay: number): CalendarDraft {
  return draft.weekStartDay === weekStartDay ? draft : { ...draft, weekStartDay }
}

// see IC-163, WC-8, S-582
/** @purity pure */
export function canAddRange(draft: CalendarDraft): boolean {
  return draft.ranges.length < SETTINGS_CONSTANTS.workingTimesPerDayMax
}

/** @purity pure */
export function canDeleteRange(draft: CalendarDraft): boolean {
  return draft.ranges.length > 1
}

// see IC-163, WC-8
// WHY: an hour after the latest end that reads, moved back inside the day, so no refusal shows on the press.
/** @purity pure */
export function withRangeAdded(draft: CalendarDraft): CalendarDraft {
  if (!canAddRange(draft)) return draft
  const ends = draft.ranges.flatMap((range) => {
    const end = draftClockMinuteOf(range.end, 'end')
    return end === null ? [] : [end]
  })
  const after = ends.length === 0 ? RANGE_ADDED_WITHOUT_END_MINUTES : Math.max(...ends)
  const from = Math.min(after + RANGE_ADDED_AFTER_MINUTES, MINUTES_PER_DAY - RANGE_ADDED_LENGTH_MINUTES)
  const added = { start: shownClockOf(from), end: shownClockOf(from + RANGE_ADDED_LENGTH_MINUTES) }
  return { ...draft, ranges: [...draft.ranges, added] }
}

/** @purity pure */
export function withRangeDeleted(draft: CalendarDraft, rangeIndex: number): CalendarDraft {
  if (!canDeleteRange(draft) || draft.ranges[rangeIndex] === undefined) return draft
  return { ...draft, ranges: draft.ranges.filter((_, index) => index !== rangeIndex) }
}

// see IC-165, WC-8, WC-10
// WHY: a value that reads is shown in its own form (08:00 -> 8:00); one that does not stays as typed.
/** @purity pure */
export function withRangeTimeTyped(
  draft: CalendarDraft,
  rangeIndex: number,
  side: CalendarDraftRangeSide,
  text: string,
): CalendarDraft {
  const held = draft.ranges[rangeIndex]
  if (held === undefined) return draft
  const minute = draftClockMinuteOf(text, side)
  const shown = minute === null ? text.trim() : shownClockOf(minute)
  if (held[side] === shown) return draft
  const ranges = draft.ranges.map((range, index) => (index === rangeIndex ? { ...range, [side]: shown } : range))
  return { ...draft, ranges }
}

/** @purity pure */
function nextExceptionOrdinal(draft: CalendarDraft, schedule: Schedule): number {
  const held = [...workingCalendarOf(schedule).exceptions, ...draft.exceptions].map((one) => one.ordinal)
  return held.reduce((high, one) => Math.max(high, one), -1) + 1
}

// see IC-135, WC-6, EX-13
/** @purity pure */
export function withExceptionAdded(draft: CalendarDraft, schedule: Schedule, today: CalendarDay): CalendarDraft {
  const added: Exception = {
    ordinal: nextExceptionOrdinal(draft, schedule),
    name: null,
    fromDate: textOfDay(today),
    toDate: textOfDay(today),
    dayWorking: false,
    recurrenceKind: DAILY_RECURRENCE_KIND,
    workingTimes: [],
    carry: {},
    carryElements: [],
  }
  return { ...draft, exceptions: [...draft.exceptions, added] }
}

/** @purity pure */
function withException(draft: CalendarDraft, ordinal: number, edit: (held: Exception) => Exception): CalendarDraft {
  let moved = false
  const exceptions = draft.exceptions.map((one) => {
    if (one.ordinal !== ordinal) return one
    const edited = edit(one)
    moved ||= edited !== one
    return edited
  })
  return moved ? { ...draft, exceptions } : draft
}

/** @purity pure */
export function withExceptionDeleted(draft: CalendarDraft, ordinal: number): CalendarDraft {
  const exceptions = draft.exceptions.filter((one) => one.ordinal !== ordinal)
  return exceptions.length === draft.exceptions.length ? draft : { ...draft, exceptions }
}

// see IC-137, WC-4, AT-81
/** @purity pure */
export function withExceptionKindToggled(draft: CalendarDraft, ordinal: number): CalendarDraft {
  return withException(draft, ordinal, (held) =>
    isNonRecurringException(held) ? { ...held, dayWorking: held.dayWorking !== true } : held)
}

/** @purity pure */
export function withExceptionNameTyped(draft: CalendarDraft, ordinal: number, text: string): CalendarDraft {
  const name = text === '' ? null : text
  return withException(draft, ordinal, (held) =>
    held.name === name || !isNonRecurringException(held) ? held : { ...held, name })
}

// see WC-4, AT-79, AT-80, WT-6, WT-7
// WHY: the draft holds the day only; editCalendar stamps the time (JDG-1220), and keeps a held text of the same day.
/** @purity pure */
export function withExceptionDayTyped(
  draft: CalendarDraft,
  ordinal: number,
  side: CalendarDraftRangeSide,
  day: CalendarDay,
): CalendarDraft {
  const column = side === 'start' ? 'fromDate' : 'toDate'
  const text = textOfDay(day)
  return withException(draft, ordinal, (held) =>
    isSameDay(held[column], text) || !isNonRecurringException(held) ? held : { ...held, [column]: text })
}

/** @purity pure */
function rangeRefusals(draft: CalendarDraft): readonly CalendarDraftRefusal[] {
  const most = SETTINGS_CONSTANTS.workingTimesPerDayMax
  const refusals: CalendarDraftRefusal[] = []
  const read: { readonly index: number; readonly time: WorkingTime }[] = []
  draft.ranges.forEach((range, rangeIndex) => {
    for (const side of ['start', 'end'] as const) {
      if (draftClockMinuteOf(range[side], side) === null) refusals.push({ kind: 'timeNotReadable', rangeIndex, side, text: range[side] })
    }
    const time = workingTimeOf(range, rangeIndex)
    if (time === null) return
    if (workingTimesBreach([time], most) !== null) refusals.push({ kind: 'startNotBeforeEnd', rangeIndex })
    else read.push({ index: rangeIndex, time })
  })
  read.forEach((first, at) => {
    for (const second of read.slice(at + 1)) {
      if (workingTimesBreach([first.time, second.time], most) !== null) {
        refusals.push({ kind: 'rangesOverlap', firstIndex: first.index, secondIndex: second.index })
      }
    }
  })
  return refusals
}

interface ExceptionDays {
  readonly ordinal: number
  readonly from: number
  readonly to: number
}

// see WC-10, FR-054, AT-82
// WHY: a row with no readable start counts no day (as the calendar reads it), and a missing finish is its start.
/** @purity pure */
function exceptionDaysOf(exception: Exception): ExceptionDays | null {
  const from = dayOf(exception.fromDate)
  if (from === null || !isNonRecurringException(exception)) return null
  const to = dayOf(exception.toDate) ?? from
  return { ordinal: exception.ordinal, from: serial(from), to: serial(to) }
}

// see WC-10
/** @purity pure */
function exceptionRefusals(draft: CalendarDraft): readonly CalendarDraftRefusal[] {
  const refusals: CalendarDraftRefusal[] = []
  const spans: ExceptionDays[] = []
  for (const exception of draft.exceptions) {
    const days = exceptionDaysOf(exception)
    if (days === null) continue
    if (days.from > days.to) refusals.push({ kind: 'exceptionFromAfterTo', ordinal: days.ordinal })
    else spans.push(days)
  }
  spans.forEach((first, at) => {
    for (const second of spans.slice(at + 1)) {
      if (first.from <= second.to && second.from <= first.to) {
        refusals.push({ kind: 'exceptionsOverlap', firstOrdinal: first.ordinal, secondOrdinal: second.ordinal })
      }
    }
  })
  return refusals
}

// see WC-10, IV-17, IV-24
/** @purity pure */
export function calendarDraftRefusalsOf(draft: CalendarDraft): readonly CalendarDraftRefusal[] {
  const weekdays: readonly CalendarDraftRefusal[] = draft.workingDayTypes.length === 0 ? [{ kind: 'noWorkingWeekday' }] : []
  return [...rangeRefusals(draft), ...weekdays, ...exceptionRefusals(draft)]
}

/** @purity pure */
export function hasNoCalendarDraftRefusal(draft: CalendarDraft): boolean {
  return calendarDraftRefusalsOf(draft).length === 0
}

/** @purity pure */
function isSameDayTypes(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((one) => right.includes(one))
}

/** @purity pure */
function readWorkingTimesOf(draft: CalendarDraft): readonly WorkingTime[] {
  return draft.ranges.flatMap((range, ordinal) => {
    const time = workingTimeOf(range, ordinal)
    return time === null ? [] : [time]
  })
}

// see CM-39, WC-7, FR-031, FR-088
// WHY: a part the draft left as the document holds it is omitted, so a draft equal to the document writes nothing.
// The set is written when it moved or a weekday starts working, so the new day takes the shown set.
/** @purity pure */
export function calendarCommandOf(draft: CalendarDraft, schedule: Schedule): Extract<DocumentCommand, { readonly kind: 'setCalendar' }> {
  const held = calendarDraftOf(schedule)
  const workingTimes = readWorkingTimesOf(draft)
  const heldTimes = readWorkingTimesOf(held)
  const startsWorking = draft.workingDayTypes.some((one) => !held.workingDayTypes.includes(one))
  const isSameSet = isSameWorkingTimeSet(workingTimes, heldTimes)
  return {
    kind: 'setCalendar',
    ...(isSameDayTypes(draft.workingDayTypes, held.workingDayTypes) ? {} : { workingDayTypes: draft.workingDayTypes }),
    ...(draft.weekStartDay === held.weekStartDay ? {} : { weekStartDay: draft.weekStartDay }),
    exceptions: draft.exceptions,
    ...(isSameSet && !startsWorking ? {} : { workingTimes }),
  }
}

/** @purity pure */
export function exceptionsInStartOrder(exceptions: readonly Exception[]): readonly Exception[] {
  const startOf = (one: Exception): CalendarDay | null => dayOf(one.fromDate)
  return [...exceptions].sort((a, b) => {
    const left = startOf(a)
    const right = startOf(b)
    if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1
    return compareDays(left, right)
  })
}

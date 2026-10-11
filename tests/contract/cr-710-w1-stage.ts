// CR-710 wave 1 spec-only tests: the calendars and texts the cr-710-w1-*.test.ts files share.

import type {
  Calendar,
  Exception,
  WeekDay,
  WorkingCalendar,
  WorkingTime,
} from '../../src/entity/document-model/schedule/schedule'

// see AT-73
export const SUNDAY = 1
export const MONDAY = 2
export const TUESDAY = 3
export const WEDNESDAY = 4
export const THURSDAY = 5
export const FRIDAY = 6
export const SATURDAY = 7

// see AT-17
export const WEEK_STARTS_MONDAY = 1

// WHY: January 2026 starts on a Thursday, so the 2nd is a Friday and the 5th a Monday.
export const JAN_FRIDAY = 2
export const JAN_SATURDAY = 3
export const JAN_SUNDAY = 4
export const JAN_MONDAY = 5
export const JAN_TUESDAY = 6
export const JAN_WEDNESDAY = 7
export const JAN_THURSDAY = 8
export const JAN_NEXT_FRIDAY = 9
export const JAN_NEXT_MONDAY = 12

// see WT-1, WT-2
/** @purity pure */
export function jan(dayOfMonth: number, hhmm: string): string {
  return `2026-01-${String(dayOfMonth).padStart(2, '0')}T${hhmm}:00`
}

// see AT-160, AT-161, AT-162
/** @purity pure */
export function span(ordinal: number, from: string, to: string): WorkingTime {
  return { ordinal, fromTime: `${from}:00`, toTime: `${to}:00` }
}

/** @purity pure */
export function spansOf(...pairs: readonly (readonly [string, string])[]): readonly WorkingTime[] {
  return pairs.map(([from, to], ordinal) => span(ordinal, from, to))
}

// see S-580
export const MORNING_AND_AFTERNOON = spansOf(['08:00', '12:00'], ['13:00', '17:00'])

/** @purity pure */
export function pairsOf(workingTimes: readonly WorkingTime[]): readonly (readonly [string | null, string | null])[] {
  return workingTimes.map((one) => [one.fromTime, one.toTime] as const)
}

// see AT-72, AT-73, AT-74, AT-158
/** @purity pure */
export function weekDayOf(dayType: number, working: boolean, workingTimes: readonly WorkingTime[] = []): WeekDay {
  return { ordinal: dayType, dayType, dayWorking: working, workingTimes, carry: {}, carryElements: [] }
}

// see AT-77, AT-82, AT-159
/** @purity pure */
export function exceptionOf(
  ordinal: number,
  fromDay: number,
  toDay: number,
  working: boolean,
  workingTimes: readonly WorkingTime[] = [],
): Exception {
  return {
    ordinal,
    name: `exception ${ordinal}`,
    fromDate: jan(fromDay, '00:00'),
    toDate: jan(toDay, '23:59'),
    dayWorking: working,
    recurrenceKind: 9,
    workingTimes,
    carry: {},
    carryElements: [],
  }
}

export type WorkingByDayType = Readonly<Record<number, readonly WorkingTime[]>>

export interface CalendarParts {
  readonly working?: WorkingByDayType
  readonly exceptions?: readonly Exception[]
  readonly weekStartDay?: number | null
}

export const MONDAY_TO_FRIDAY: WorkingByDayType = {
  [MONDAY]: [],
  [TUESDAY]: [],
  [WEDNESDAY]: [],
  [THURSDAY]: [],
  [FRIDAY]: [],
}

export const MONDAY_TO_FRIDAY_WITH_SPANS: WorkingByDayType = {
  [MONDAY]: MORNING_AND_AFTERNOON,
  [TUESDAY]: MORNING_AND_AFTERNOON,
  [WEDNESDAY]: MORNING_AND_AFTERNOON,
  [THURSDAY]: MORNING_AND_AFTERNOON,
  [FRIDAY]: MORNING_AND_AFTERNOON,
}

/** @purity pure */
export function weekDaysOf(working: WorkingByDayType): readonly WeekDay[] {
  return [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY].map((dayType) => {
    const spans = working[dayType]
    return weekDayOf(dayType, spans !== undefined, spans ?? [])
  })
}

/** @purity pure */
export function calendarRowOf(parts: CalendarParts = {}): Calendar {
  return {
    uid: 1,
    name: 'Standard',
    isBaseCalendar: true,
    baseCalendarUid: null,
    ordinal: 1,
    carry: {},
    carryElements: [],
    weekDays: weekDaysOf(parts.working ?? MONDAY_TO_FRIDAY),
    exceptions: parts.exceptions ?? [],
  }
}

/** @purity pure */
export function workingCalendarOver(parts: CalendarParts = {}): WorkingCalendar {
  const calendar = calendarRowOf(parts)
  return {
    calendar,
    weekDays: calendar.weekDays,
    exceptions: calendar.exceptions,
    weekStartDay: parts.weekStartDay === undefined ? WEEK_STARTS_MONDAY : parts.weekStartDay,
  }
}

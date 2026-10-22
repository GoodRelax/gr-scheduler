// Schedule -- the calendar day and the instant: their text form, their order and their numbers.
// @unit      UF-170  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

export interface CalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
}

// TRAP: the day is the lexical date part; converting through a time zone moves it by one on some machines.
const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/

// see FR-054, EX-2
/** @purity pure */
export function dayOf(text: string | null): CalendarDay | null {
  if (text === null) return null
  const hit = DATE_HEAD.exec(text.trim())
  if (hit === null) return null
  const [year, month, day] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const round = new Date(Date.UTC(year, month - 1, day))
  if (round.getUTCMonth() !== month - 1 || round.getUTCDate() !== day) return null
  return { year, month, day }
}

export const MINUTES_PER_CALENDAR_DAY = 1440

export const MS_PER_DAY = 86400000

const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const SECONDS_PER_MINUTE = 60

const TIME_TAIL = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/

const DATE_TIME_SPLIT = /^\d{4}-\d{2}-\d{2}(?:[T ](.*))?$/

/** @purity pure */
function minuteOfTimeText(text: string): number | null {
  const hit = TIME_TAIL.exec(text)
  if (hit === null) return null
  const [hour, minute, second] = [Number(hit[1]), Number(hit[2]), Number(hit[3] ?? 0)]
  if (hour >= HOURS_PER_DAY || minute >= MINUTES_PER_HOUR || second >= SECONDS_PER_MINUTE) return null
  return hour * MINUTES_PER_HOUR + minute
}

// see FR-054, IV-14
/** @purity pure */
export function instantOf(text: string | null): number | null {
  const read = dayWithTimeOf(dayOf(text), text)
  return read === null ? null : serial(read.day) * MINUTES_PER_CALENDAR_DAY + (read.minute ?? 0)
}

interface DayWithTime {
  readonly day: CalendarDay
  readonly minute: number | undefined
}

/** @purity pure */
function dayWithTimeOf(day: CalendarDay | null, text: string | null): DayWithTime | null {
  if (day === null || text === null) return null
  const tail = DATE_TIME_SPLIT.exec(text.trim())?.[1]
  if (tail === undefined) return { day, minute: undefined }
  const minute = minuteOfTimeText(tail)
  return minute === null ? null : { day, minute }
}

/** @purity pure */
export function isDateWithoutTime(text: string): boolean {
  return dayOf(text) !== null && DATE_TIME_SPLIT.exec(text.trim())?.[1] === undefined
}

/** @purity pure */
export function dayOfInstant(instant: number): CalendarDay {
  return dayFromSerial(Math.floor(instant / MINUTES_PER_CALENDAR_DAY))
}

// WHY: an end at 00:00 closes the day before; parsed once, as the layout reads it for every Task (DFC-2471).
/** @purity pure */
export function finishSideDayOf(text: string | null): CalendarDay | null {
  return finishSideDayFrom(dayOf(text), text)
}

// WHY: a reader that already holds dayOf(text) passes it, so the date part is not parsed twice (DFC-2471).
/** @purity pure */
export function finishSideDayFrom(day: CalendarDay | null, text: string | null): CalendarDay | null {
  const read = dayWithTimeOf(day, text)
  if (read === null || read.minute === undefined) return read?.day ?? null
  return dayFromSerial(serial(read.day) - (read.minute > 0 ? 0 : 1))
}

/** @purity pure */
export function textOfInstant(instant: number): string {
  const day = dayOfInstant(instant)
  const minute = instant - serial(day) * MINUTES_PER_CALENDAR_DAY
  const pad = (n: number): string => String(n).padStart(2, '0')
  return textOfDayAt(day, `${pad(Math.floor(minute / MINUTES_PER_HOUR))}:${pad(minute % MINUTES_PER_HOUR)}:00`)
}

// see WT-6
export const DAY_START_TIME = '00:00:00'
// see WT-7
export const DAY_END_TIME = '23:59:00'

/** @purity pure */
function dateTextOf(day: CalendarDay): string {
  const pad = (n: number, width: number): string => String(n).padStart(width, '0')
  return `${pad(day.year, 4)}-${pad(day.month, 2)}-${pad(day.day, 2)}`
}

// see EX-7, UF-170
/** @purity pure */
export function textOfDayAt(day: CalendarDay, time: string): string {
  return `${dateTextOf(day)}T${time}`
}

// TRAP: this is the day's KEY, read back by dayOf and used as a Map key on per-frame paths;
// a writer that stores a column picks a side (textOfDayStart, textOfStartSide, ...) instead.
/** @purity pure */
export function textOfDay(day: CalendarDay): string {
  return textOfDayAt(day, DAY_START_TIME)
}

/** @purity pure */
export function textOfDayStart(day: CalendarDay): string {
  return textOfDayAt(day, DAY_START_TIME)
}

/** @purity pure */
export function textOfDayEnd(day: CalendarDay): string {
  return textOfDayAt(day, DAY_END_TIME)
}

/** @purity pure */
export function compareDays(a: CalendarDay, b: CalendarDay): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

/** @purity pure */
export function isSameDay(left: string | null, right: string | null): boolean {
  const leftDay = dayOf(left)
  const rightDay = dayOf(right)
  if (leftDay === null || rightDay === null) return left === right
  return compareDays(leftDay, rightDay) === 0
}

// TRAP: Date.UTC maps years 0 to 99 onto 1900 to 1999; dayOf's round-trip check shares
// the mapping, so a fix must change both.
/** @purity pure */
export function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY
}

/** @purity pure */
export function calendarDaysBetween(from: CalendarDay, to: CalendarDay): number {
  return serial(to) - serial(from)
}

export interface CalendarSpan {
  readonly years: number
  readonly months: number
  readonly days: number
  readonly dayCount: number
}

const MONTHS_PER_YEAR = 12
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const FEBRUARY = 2

/** @purity pure */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** @purity pure */
function lastDayOfMonth(year: number, month: number): number {
  return month === FEBRUARY && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 31)
}

/** @purity pure */
function monthsAfter(day: CalendarDay, months: number): CalendarDay {
  const index = day.year * MONTHS_PER_YEAR + (day.month - 1) + months
  const year = Math.floor(index / MONTHS_PER_YEAR)
  const month = index - year * MONTHS_PER_YEAR + 1
  return { year, month, day: Math.min(day.day, lastDayOfMonth(year, month)) }
}

/** @purity pure */
export function calendarSpanOf(a: CalendarDay, b: CalendarDay): CalendarSpan {
  const [early, late] = compareDays(a, b) <= 0 ? [a, b] : [b, a]
  const gap = (late.year - early.year) * MONTHS_PER_YEAR + (late.month - early.month)
  const months = compareDays(monthsAfter(early, gap), late) <= 0 ? gap : gap - 1
  return {
    years: Math.floor(months / MONTHS_PER_YEAR),
    months: months % MONTHS_PER_YEAR,
    days: calendarDaysBetween(monthsAfter(early, months), late),
    dayCount: calendarDaysBetween(early, late),
  }
}

/** @purity pure */
export function dayFromSerial(value: number): CalendarDay {
  const at = new Date(value * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

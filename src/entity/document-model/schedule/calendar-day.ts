// Schedule -- the calendar day: its text form, its order and its day numbers.
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

// see EX-7
/** @purity pure */
export function textOfDay(day: CalendarDay): string {
  const pad = (n: number, width: number): string => String(n).padStart(width, '0')
  return `${pad(day.year, 4)}-${pad(day.month, 2)}-${pad(day.day, 2)}T00:00:00`
}

/** @purity pure */
export function compareDays(a: CalendarDay, b: CalendarDay): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

// TRAP: Date.UTC maps years 0 to 99 onto 1900 to 1999; dayOf's round-trip check shares
// the mapping, so a fix must change both.
/** @purity pure */
export function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / 86400000
}

// see FD-6, IV-12
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

// see DC-3
/** @purity pure */
function monthsAfter(day: CalendarDay, months: number): CalendarDay {
  const index = day.year * MONTHS_PER_YEAR + (day.month - 1) + months
  const year = Math.floor(index / MONTHS_PER_YEAR)
  const month = index - year * MONTHS_PER_YEAR + 1
  return { year, month, day: Math.min(day.day, lastDayOfMonth(year, month)) }
}

// see DC-3
// WHY: k is the gap in months or one less; k + 1 months always lands past the later day.
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
  const at = new Date(value * 86400000)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

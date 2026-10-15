// ScheduleLayout -- the name label: the truncated name and the plan dates beside it (FR-002).
// @unit      UF-136  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import {
  dayOfInstant,
  MINUTES_PER_CALENDAR_DAY,
  startSideOf,
  type CalendarDay,
  type DateTimeSide,
  type Schedule,
  type Task,
} from '../../document-model/schedule/schedule'
import { labelWidth } from './label-width'
import { NOT_STORED_LABEL_SIZES, type DayReader } from './schedule-layout'

const TRUNCATION_MARK = '…'
const TRUNCATION_MARK_UNITS = 2

// see LC-4
/** @purity pure */
function truncate(text: string, limit: number): string {
  const unitsOf = (ch: string): number => (ch.charCodeAt(0) < 0x100 ? 1 : 2)
  let units = 0
  for (const character of text) units += unitsOf(character)
  if (units <= limit) return text

  const room = limit - TRUNCATION_MARK_UNITS
  let kept = ''
  let taken = 0
  for (const character of text) {
    const next = taken + unitsOf(character)
    if (next > room) break
    taken = next
    kept += character
  }
  return kept + TRUNCATION_MARK
}

// see ND-5
// TRAP: every Task of the document, never the drawn range or today: a scroll would reflow the lanes (FR-002).
// WHY: only day() is read, so TL-10 asks with dayOf and no working calendar (R2.22).
/** @purity pure */
export function planDatesSpanYears(schedule: Schedule, reader: Pick<DayReader, 'day'>): boolean {
  let year: number | null = null
  for (const task of schedule.tasks) {
    for (const text of [task.start, task.finish]) {
      const day = reader.day(text)
      if (day === null) continue
      if (year === null) year = day.year
      else if (day.year !== year) return true
    }
  }
  return false
}

// see ND-5
const YEAR_DIGITS = 4

// see ND-4, ND-5
/** @purity pure */
export function planDateText(day: CalendarDay, withYear: boolean): string {
  if (!withYear) return `${day.month}/${day.day}`
  const year = String(day.year).padStart(YEAR_DIGITS, '0')
  return `${year}/${day.month}/${day.day}`
}

const MINUTES_PER_HOUR = 60

const MINUTE_DIGITS = 2

// see T-375, TX-1
// WHY: 24-hour time, the hour not padded and the minute in two digits, as ND-4 leaves the month unpadded.
/** @purity pure */
export function clockTextOf(instant: number): string {
  const minute = ((instant % MINUTES_PER_CALENDAR_DAY) + MINUTES_PER_CALENDAR_DAY) % MINUTES_PER_CALENDAR_DAY
  return `${Math.floor(minute / MINUTES_PER_HOUR)}:${String(minute % MINUTES_PER_HOUR).padStart(MINUTE_DIGITS, '0')}`
}

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, TypedLag.lagUnit).
// see T-108, TX-10
type LengthLetter = 'd' | 'h' | 'm'
// </generated>

// see T-375, TX-10, FR-054
// WHY: the minutes in one of each letter, in the order a length is spelled.
const MINUTES_IN_LETTER: Readonly<Record<LengthLetter, number | 'workingDay'>> = { d: 'workingDay', h: MINUTES_PER_HOUR, m: 1 }

// see T-375, TX-10
const ZERO_LENGTH_LETTER: LengthLetter = 'h'

// see T-375, TX-10, TX-2, TX-3, TX-6, TX-8
// WHY: one spelling of a length; d is minutesPerDay minutes (FR-054), the letters are the same in every language.
/** @purity pure */
export function lengthTextOf(minutes: number, minutesPerDay: number): string {
  let rest = Math.round(Math.abs(minutes))
  const parts: string[] = []
  for (const [letter, inLetter] of Object.entries(MINUTES_IN_LETTER)) {
    const size = inLetter === 'workingDay' ? minutesPerDay : inLetter
    const count = size > 0 ? Math.floor(rest / size) : 0
    rest -= count * size
    if (count > 0) parts.push(`${count}${letter}`)
  }
  if (parts.length === 0) return `0${ZERO_LENGTH_LETTER}`
  return `${minutes < 0 ? '-' : ''}${parts.join(' ')}`
}

// see T-375, TX-1, FR-054, FR-156
// WHY: the date of ND-4 alone without time of day; with it, the instant read on its side in the view base, day and clock.
/** @purity pure */
function shownDateTimeText(text: string | null, side: DateTimeSide, reader: DayReader, withYear: boolean, isTimeOfDayVisible: boolean): string {
  const instant = isTimeOfDayVisible ? reader.shown(text, side) : null
  const day = instant === null ? reader.day(text) : dayOfInstant(instant)
  if (day === null) return ''
  return instant === null ? planDateText(day, withYear) : `${planDateText(day, withYear)} ${clockTextOf(instant)}`
}

// see ND-1, ND-2, ND-3, TX-1
/** @purity pure */
function planDatesOf(task: Task, reader: DayReader, withYear: boolean, isTimeOfDayVisible: boolean): string {
  if (reader.day(task.start) === null) return ''
  const startText = shownDateTimeText(task.start, startSideOf(task), reader, withYear, isTimeOfDayVisible)
  if (task.milestone === true) return startText
  if (reader.day(task.finish) === null) return ''
  return `${startText} - ${shownDateTimeText(task.finish, 'finish', reader, withYear, isTimeOfDayVisible)}`
}

interface NameLabel {
  readonly name: string
  readonly labelDates: string
}

// see FR-002, S-232
// TRAP: truncate the name alone; the dates are never cut and never count toward S-35.
// TRAP: the half-width space before the dates goes with them: FR-002 draws it at the dates' size (S-325).
/** @purity pure */
export function nameLabelOf(task: Task, reader: DayReader, datesWithYear: boolean | null,
                     settings: DrawnSettings): NameLabel {
  const name = truncate(task.name ?? '', settings.truncateUnits)
  const dates = datesWithYear === null ? '' : planDatesOf(task, reader, datesWithYear, settings.isTimeOfDayVisible)
  if (dates === '') return { name, labelDates: '' }
  return { name, labelDates: name === '' ? dates : ` ${dates}` }
}

// see FR-002, LC-5, OC-1, T-273, S-325
// TRAP: never measure the joined label at one size: a fitted label would cross the reference end (FR-002).
/** @purity pure */
export function nameLabelWidthOf(named: NameLabel, fontSize: number, settings: DrawnSettings): number {
  return labelWidth(named.name, fontSize, settings) +
    labelWidth(named.labelDates, fontSize * NOT_STORED_LABEL_SIZES['S-325'], settings)
}

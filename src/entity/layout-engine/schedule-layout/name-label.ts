// ScheduleLayout -- the name label: the truncated name and the plan dates beside it (FR-002).
// @unit      UF-136  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { CalendarDay, Schedule, Task } from '../../document-model/schedule/schedule'
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
/** @purity pure */
export function planDatesSpanYears(schedule: Schedule, reader: DayReader): boolean {
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
const YEAR_DIGITS = 2

// see ND-4, ND-5
/** @purity pure */
function planDateText(day: CalendarDay, withYear: boolean): string {
  if (!withYear) return `${day.month}/${day.day}`
  const year = String(day.year % 10 ** YEAR_DIGITS).padStart(YEAR_DIGITS, '0')
  return `${year}/${day.month}/${day.day}`
}

// see ND-1, ND-2, ND-3
/** @purity pure */
function planDatesOf(task: Task, reader: DayReader, withYear: boolean): string {
  const start = reader.day(task.start)
  if (start === null) return ''
  if (task.milestone === true) return planDateText(start, withYear)
  const finish = reader.day(task.finish)
  if (finish === null) return ''
  return `${planDateText(start, withYear)} - ${planDateText(finish, withYear)}`
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
                     settings: DocumentSettings): NameLabel {
  const name = truncate(task.name ?? '', settings.truncateUnits)
  const dates = datesWithYear === null ? '' : planDatesOf(task, reader, datesWithYear)
  if (dates === '') return { name, labelDates: '' }
  return { name, labelDates: name === '' ? dates : ` ${dates}` }
}

// see FR-002, LC-5, OC-1, T-273, S-325
// TRAP: never measure the joined label at one size: a fitted label would cross the reference end (FR-002).
/** @purity pure */
export function nameLabelWidthOf(named: NameLabel, fontSize: number, settings: DocumentSettings): number {
  return labelWidth(named.name, fontSize, settings) +
    labelWidth(named.labelDates, fontSize * NOT_STORED_LABEL_SIZES['S-325'], settings)
}

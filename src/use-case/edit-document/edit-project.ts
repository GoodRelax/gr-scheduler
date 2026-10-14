// EditDocument: the Project commands of table T-108.
// @unit      UF-17  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  DATE_COLUMNS,
  dayOf,
  instantOf,
  instantOnSideReader,
  isTimeZoneRegion,
  MINUTES_PER_CALENDAR_DAY,
  sideOfTaskColumn,
  startSideOf,
  textOfInstant,
  workingCalendarOf,
  workingSpansReader,
  type BaselineTask,
  type CalendarDay,
  type InstantOnSide,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'

export interface ProjectProfileFields {
  readonly name?: string | null
  readonly subject?: string | null
  readonly category?: string | null
  readonly company?: string | null
  readonly manager?: string | null
  readonly author?: string | null
  readonly revision?: number | null
  readonly startDate?: string | null
}

export type ProjectCommand =
  | { readonly kind: 'setProjectTitle'; readonly title: string | null }
  | { readonly kind: 'setProjectProfile'; readonly fields: ProjectProfileFields }
  | { readonly kind: 'setStatusDate'; readonly date: string }
  | { readonly kind: 'clearStatusDate' }
  | { readonly kind: 'setThemeHue'; readonly hue: number }
  | { readonly kind: 'setParentProgressTolerance'; readonly workingDays: number }
  // see CM-94, FR-156
  | { readonly kind: 'setScheduleDataTimeZone'; readonly timeZone: string }
  // see CM-98, FR-157, T-377
  | { readonly kind: 'shiftScheduleTimes'; readonly minutes: number }

const PROFILE_KEYS = [
  'name',
  'subject',
  'category',
  'company',
  'manager',
  'author',
  'revision',
  'startDate',
] as const

/** @purity pure */
function withProject(document: Document, project: Document['schedule']['project']): Document {
  return { ...document, schedule: { ...document.schedule, project } }
}

// see CM-1, CM-2, CM-3, CM-4, CM-5, CM-87, CM-94, CM-98
/** @purity pure */
export function editProject(document: Document, command: ProjectCommand): EditResult {
  const project = document.schedule.project

  switch (command.kind) {
    case 'setProjectTitle': {
      if (command.title === '') {
        return refused([reject('CM-1', 'FR-035', 'the document name may not be an empty string')])
      }
      if (project.title === command.title) return edited(document)
      return edited(withProject(document, { ...project, title: command.title }))
    }

    case 'setProjectProfile':
      return withProjectProfile(document, command.fields)

    case 'setStatusDate': {
      if (dayOf(command.date) === null) {
        return refused([reject('CM-3', 'FR-046', `not a date: ${command.date}`)])
      }
      if (project.statusDate === command.date) return edited(document)
      return edited(withProject(document, { ...project, statusDate: command.date }))
    }

    case 'clearStatusDate':
      if (project.statusDate === null) return edited(document)
      return edited(withProject(document, { ...project, statusDate: null }))

    case 'setThemeHue': {
      if (!Number.isInteger(command.hue) || command.hue < 0 || command.hue > 359) {
        return refused([reject('CM-5', 'S-73', `hue outside 0..359: ${command.hue}`)])
      }
      if (project.themeHue === command.hue) return edited(document)
      return edited(withProject(document, { ...project, themeHue: command.hue }))
    }

    default:
      return projectValueEdited(document, command)
  }
}

type ProjectValueCommand = Extract<ProjectCommand, { readonly kind: 'setParentProgressTolerance' | 'setScheduleDataTimeZone' | 'shiftScheduleTimes' }>

// see CM-87, CM-94, CM-98
/** @purity pure */
function projectValueEdited(document: Document, command: ProjectValueCommand): EditResult {
  if (command.kind === 'setParentProgressTolerance') return withParentProgressTolerance(document, command.workingDays)
  if (command.kind === 'setScheduleDataTimeZone') return withScheduleDataTimeZone(document, command.timeZone)
  return withScheduleTimesShifted(document, command.minutes)
}

// see CM-94, FR-156, T-376
// WHY: the stored numbers stay; only the region they are read in moves (FR-156, Keep Local Time).
/** @purity pure */
function withScheduleDataTimeZone(document: Document, timeZone: string): EditResult {
  const project = document.schedule.project
  if (!isTimeZoneRegion(timeZone)) {
    return refused([reject('CM-94', 'FR-156', `not a region of table T-376: ${String(timeZone)}`)])
  }
  if (project.scheduleDataTimeZone === timeZone) return edited(document)
  return edited(withProject(document, { ...project, scheduleDataTimeZone: timeZone }))
}

// see BS-1, WT-1, WT-2, WT-3, WT-4, WT-5
// WHY: every date column of Task is one of the columns WT-1 to WT-5 name, and the reverse (BS-1).
const SHIFTED_TASK_COLUMNS = DATE_COLUMNS.Task as readonly (keyof Task & string)[]

const SHIFTED_BASELINE_COLUMNS = DATE_COLUMNS.BaselineTask as readonly (keyof BaselineTask & string)[]

// see BS-4, T-214
const ACCEPTED_DAYS = {
  first: dayOf(SETTINGS_CONSTANTS.importMinDate),
  last: dayOf(SETTINGS_CONSTANTS.importMaxDate),
}

/** @purity pure */
export function isAcceptedDay(day: CalendarDay): boolean {
  const { first, last } = ACCEPTED_DAYS
  return (first === null || compareDays(day, first) >= 0) && (last === null || compareDays(day, last) <= 0)
}

// see BS-1, BS-4
// WHY: undefined when the shifted value leaves the accepted days; a text no reader can read is kept as it is.
/** @purity pure */
function shiftedText(instant: number | null, text: string | null, minutes: number): string | null | undefined {
  if (instant === null) return text
  const moved = textOfInstant(instant + minutes)
  const day = dayOf(moved)
  return day !== null && isAcceptedDay(day) ? moved : undefined
}

type ShiftedRow<TRow> = { readonly row: TRow; readonly outside: readonly string[] }

/** @purity pure */
function shiftedRow<TRow extends Task | BaselineTask>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  minutes: number,
  onSide: InstantOnSide,
): ShiftedRow<TRow> {
  let held = row
  const outside: string[] = []
  for (const column of columns) {
    const text = row[column] as unknown as string | null
    const moved = shiftedText(onSide(text, sideOfTaskColumn(row, column)), text, minutes)
    if (moved === undefined) outside.push(`${column}=${String(text)}`)
    else if (moved !== text) held = { ...held, [column]: moved }
  }
  return { row: held, outside }
}

// see CM-98, FR-157, T-377, BS-1, BS-2, BS-4
// WHY: one write for every column BS-1 names; the calendar and the whole-day ranges (BS-2) stay, as FR-157 says.
/** @purity pure */
function withScheduleTimesShifted(document: Document, minutes: number): EditResult {
  if (!Number.isInteger(minutes)) {
    return refused([reject('CM-98', 'FR-157', `the shift is not a whole number of minutes: ${minutes}`)])
  }
  if (minutes === 0) return edited(document)
  const schedule = document.schedule
  // see FR-054, WT-1, WT-4
  const onSide = instantOnSideReader(workingCalendarOf(schedule))
  const tasks = schedule.tasks.map((task) => shiftedRow(task, SHIFTED_TASK_COLUMNS, minutes, onSide))
  const baselines = schedule.baselineTasks.map((one) => shiftedRow(one, SHIFTED_BASELINE_COLUMNS, minutes, onSide))
  const { startDate: start, statusDate: status } = schedule.project
  const startDate = shiftedText(onSide(start, 'start'), start, minutes)
  const statusDate = shiftedText(onSide(status, 'finish'), status, minutes)
  const outside = [
    ...tasks.flatMap((one) => one.outside.map((what) => `task ${one.row.uid} ${what}`)),
    ...baselines.flatMap((one) => one.outside.map((what) => `baseline ${one.row.uid} ${what}`)),
    ...(startDate === undefined ? ['project startDate'] : []),
    ...(statusDate === undefined ? ['project statusDate'] : []),
  ]
  if (outside.length > 0) {
    return refused([reject('CM-98', 'IV-14', `the shift leaves the accepted days (table T-214): ${outside.join(', ')}`)])
  }
  return edited({
    ...document,
    schedule: {
      ...schedule,
      project: { ...schedule.project, startDate: startDate ?? null, statusDate: statusDate ?? null },
      tasks: tasks.map((one) => one.row),
      baselineTasks: baselines.map((one) => one.row),
    },
  })
}

// see CM-2, PF-8
/** @purity pure */
function withProjectProfile(document: Document, fields: ProjectProfileFields): EditResult {
  const project = document.schedule.project
  const refusals: Refusal[] = []
  const { startDate } = fields
  if (startDate !== undefined && startDate !== null && dayOf(startDate) === null) {
    refusals.push(reject('CM-2', 'PF-8', `startDate is not a date: ${startDate}`))
  }
  if (refusals.length > 0) return refused(refusals)
  let held = project
  for (const key of PROFILE_KEYS) {
    const value = fields[key]
    if (value !== undefined && value !== held[key]) held = { ...held, [key]: value }
  }
  if (held === project) return edited(document)
  return edited(withProject(document, held))
}

// see CM-87, FR-131, S-487
// WHY: refused, not clamped: a value moved into range would differ from the value the author set.
/** @purity pure */
function withParentProgressTolerance(document: Document, workingDays: number): EditResult {
  const project = document.schedule.project
  if (!Number.isInteger(workingDays) || workingDays < 0) {
    return refused([reject('CM-87', 'S-487', `not an integer of 0 or more: ${workingDays}`)])
  }
  if (project.parentProgressToleranceDays === workingDays) return edited(document)
  return edited(withProject(document, { ...project, parentProgressToleranceDays: workingDays }))
}

type SpansOfSerial = ReturnType<typeof workingSpansReader>

// see BS-3, FR-054
// WHY: a start stands inside a range that holds its minute; a finish inside one that ends at or after it.
/** @purity pure */
export function isInsideWorkingTime(spansOf: SpansOfSerial, instant: number, side: 'start' | 'finish'): boolean {
  const at = side === 'finish' ? instant - 1 : instant
  const serialOf = Math.floor(at / MINUTES_PER_CALENDAR_DAY)
  const minute = instant - serialOf * MINUTES_PER_CALENDAR_DAY
  return spansOf(serialOf).some((span) => (side === 'start' ? span.from <= minute && minute < span.to : span.from < minute && minute <= span.to))
}

/** @purity pure */
function shiftExampleOf(tasks: readonly Task[], minutes: number, onSide: InstantOnSide) {
  const task = tasks.find((one) => onSide(one.start, startSideOf(one)) !== null)
  const start = task === undefined ? null : onSide(task.start, startSideOf(task))
  if (task === undefined || start === null) return null
  return { name: task.name, before: textOfInstant(start), after: textOfInstant(start + minutes) }
}

// see BS-3, FR-157, QN-14
// WHY: what the question shows before the shift is written; the rewrite itself is withScheduleTimesShifted.
/** @purity pure */
export function timeShiftPreviewOf(document: Document, minutes: number) {
  const within = workingCalendarOf(document.schedule)
  const spansOf = workingSpansReader(within)
  const onSide = instantOnSideReader(within)
  const shifted = document.schedule.tasks.filter((task) => SHIFTED_TASK_COLUMNS.some((column) => instantOf(task[column] as string | null) !== null))
  const outside = shifted.filter((task) => {
    const start = onSide(task.start, startSideOf(task))
    const finish = onSide(task.finish, 'finish')
    return (
      (start !== null && !isInsideWorkingTime(spansOf, start + minutes, 'start')) ||
      (finish !== null && !isInsideWorkingTime(spansOf, finish + minutes, 'finish'))
    )
  })
  return { minutes, taskCount: shifted.length, outsideCount: outside.length, example: shiftExampleOf(shifted, minutes, onSide) }
}

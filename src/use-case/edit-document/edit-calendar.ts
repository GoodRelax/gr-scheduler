// EditDocument: the Calendar aggregate's one command.
// @unit      UF-16  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  actualLastDay,
  DAILY_RECURRENCE_KIND,
  dayFromSerial,
  dayOf,
  isNonRecurringException,
  isSameDay,
  isWorkingDay,
  serial,
  textOfDay,
  textOfDayEnd,
  textOfDayStart,
  workingCalendarOf,
} from '../../entity/document-model/schedule/schedule'
import type {
  Calendar,
  CalendarDay,
  Exception,
  Project,
  Schedule,
  Task,
  WeekDay,
  WorkingCalendar,
} from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { DocumentCommand, EditReport, EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'
import { recountedPercentComplete } from './percent-complete'

// see CM-39, FR-088
export type CalendarCommand =
  | {
      readonly kind: 'setCalendar'
      // TRAP: dayType codes weekdays 1..7 (AT-73); weekStartDay codes them 0..6 (AT-17). Nothing converts.
      readonly workingDayTypes?: readonly number[]
      readonly weekStartDay?: number | null
      // WHY: the whole list after the edit (T-344 WC-4..WC-6); omitted leaves the list as it is.
      readonly exceptions?: readonly Exception[]
    }

const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

// see CM-39, FR-088, FR-012
/** @purity pure */
export function editCalendar(document: Document, command: CalendarCommand): EditResult {
  switch (command.kind) {
    case 'setCalendar': {
      const { workingDayTypes, weekStartDay, exceptions } = command
      const schedule = document.schedule
      const refusals: Refusal[] = []

      if (workingDayTypes !== undefined) {
        for (const dayType of workingDayTypes) {
          if (!isDayType(dayType)) {
            refusals.push(reject('CM-39', 'AT-73', `dayType outside 1..7: ${dayType}`))
          }
        }

        if (!workingDayTypes.some(isDayType)) {
          refusals.push(
            reject('CM-39', 'FR-088', 'the document calendar would work no weekday at all'),
          )
        }
      }

      if (
        weekStartDay !== undefined &&
        weekStartDay !== null &&
        (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6)
      ) {
        refusals.push(reject('CM-39', 'AT-17', `weekStartDay outside 0..6: ${weekStartDay}`))
      }

      // TRAP: compare by identity, not uid: the T-209 default is built, and its uid can match a real row.
      const within = workingCalendarOf(schedule)
      const foundAt = schedule.calendars.indexOf(within.calendar)

      if (refusals.length > 0) return refused(refusals)

      // TRAP: keep the old reference when nothing moved; document-change-plan.ts reads a new one as a change.
      const reworked = withExceptions(
        workingDayTypes === undefined ? within.calendar : withWorkingDayTypes(within.calendar, workingDayTypes),
        exceptions,
      )
      const held =
        reworked === within.calendar
          ? { calendars: schedule.calendars, project: schedule.project }
          : foundAt >= 0
            ? {
                calendars: schedule.calendars.map((one, index) => (index === foundAt ? reworked : one)),
                project: schedule.project,
              }
            : withMadeCalendar(schedule, reworked)
      const calendars = held.calendars
      const project =
        weekStartDay === undefined || weekStartDay === held.project.weekStartDay
          ? held.project
          : { ...held.project, weekStartDay }

      if (calendars === schedule.calendars && project === schedule.project) {
        return edited(document)
      }

      const recounted =
        calendars === schedule.calendars
          ? null
          : recountedPercentComplete({ ...schedule, calendars, project })
      const settled: Schedule = recounted?.schedule ?? { ...schedule, calendars, project }
      const report: EditReport = { recountedTaskUids: recounted?.movedTaskUids ?? [] }
      return edited({ ...document, schedule: settled }, report)
    }
  }
}

/** @purity pure */
function withWorkingDayTypes(calendar: Calendar, workingDayTypes: readonly number[]): Calendar {
  const worked = new Set<number>(workingDayTypes)
  let changed = false

  const held: WeekDay[] = calendar.weekDays.map((one) => {
    if (one.dayType === null) return one
    const dayWorking = worked.has(one.dayType)
    if (one.dayWorking === dayWorking) return one
    changed = true
    return { ...one, dayWorking }
  })

  let nextOrdinal = held.reduce((high, one) => Math.max(high, one.ordinal), -1) + 1
  for (const dayType of DAY_TYPES) {
    if (!worked.has(dayType)) continue
    if (held.some((one) => one.dayType === dayType)) continue
    held.push({ ordinal: nextOrdinal, dayType, dayWorking: true, carry: {}, carryElements: [] })
    nextOrdinal += 1
    changed = true
  }

  return changed ? { ...calendar, weekDays: held } : calendar
}

/** @purity pure */
function isSameException(left: Exception, right: Exception): boolean {
  return (
    left === right ||
    (left.ordinal === right.ordinal &&
      left.name === right.name &&
      isSameDay(left.fromDate, right.fromDate) &&
      isSameDay(left.toDate, right.toDate) &&
      left.dayWorking === right.dayWorking &&
      left.recurrenceKind === right.recurrenceKind &&
      JSON.stringify([left.carry, left.carryElements]) === JSON.stringify([right.carry, right.carryElements]))
  )
}

// see WC-7, FR-031
/** @purity pure */
function withExceptions(calendar: Calendar, exceptions: readonly Exception[] | undefined): Calendar {
  if (exceptions === undefined) return calendar
  const isSame =
    exceptions.length === calendar.exceptions.length &&
    exceptions.every((one, index) => isSameException(one, calendar.exceptions[index] as Exception))
  return isSame ? calendar : { ...calendar, exceptions: stampedExceptions(calendar.exceptions, exceptions) }
}

// see FR-057, CM-39, WT-6, WT-7, WT-10
// WHY: the one writer stamps the times, so the issuers (the panel's draft WC-6, the agent relay) never learn them.
/** @purity pure */
function stampedExceptions(held: readonly Exception[], incoming: readonly Exception[]): Exception[] {
  const heldByOrdinal = new Map(held.map((one) => [one.ordinal, one]))
  return incoming.map((one) => {
    const before = heldByOrdinal.get(one.ordinal)
    const fromDate = writtenDayText(before?.fromDate, one.fromDate, textOfDayStart)
    const toDate = writtenDayText(before?.toDate, one.toDate, textOfDayEnd)
    return fromDate === one.fromDate && toDate === one.toDate ? one : { ...one, fromDate, toDate }
  })
}

// see WT-10, EX-4
// WHY: a text with no readable day is kept as it came; stamping it would have to invent the day.
/** @purity pure */
function writtenDayText(
  heldText: string | null | undefined,
  incomingText: string | null,
  textOfSide: (day: CalendarDay) => string,
): string | null {
  if (heldText !== undefined && isSameDay(heldText, incomingText)) return heldText
  const day = dayOf(incomingText)
  return day === null ? incomingText : textOfSide(day)
}

// see FR-088, CM-39, AT-20, AT-67
// WHY: the T-209 default is no row of the document, so the first edit makes one and points the project at it.
/** @purity pure */
function withMadeCalendar(
  schedule: Schedule,
  reworked: Calendar,
): { readonly calendars: readonly Calendar[]; readonly project: Project } {
  const uid = schedule.project.uidHighWaterMark + 1
  const ordinal = schedule.calendars.reduce((high, one) => Math.max(high, one.ordinal), -1) + 1
  const made: Calendar = { ...reworked, uid, ordinal, isBaseCalendar: true, baseCalendarUid: null }
  return {
    calendars: [...schedule.calendars, made],
    project: { ...schedule.project, calendarUid: uid, uidHighWaterMark: uid },
  }
}

/** @purity pure */
function isDayType(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 7
}

// see FR-154, T-354, QN-13
// WHY: a Yes puts madeWorking in front of the same bundle, so one write lands both (one undo step).
export interface NonWorkingDayQuestion {
  readonly days: readonly string[]
  readonly madeWorking: CalendarCommand
}

// see FR-154, T-354, HW-1, HW-4, HW-5, HW-8, HW-9
// WHY: only the days a person placed are asked; a day GRS fills in (HW-2) or a resume day (HW-3) is not.
/** @purity pure */
export function nonWorkingDayQuestionOwedBy(
  commands: readonly DocumentCommand[],
  held: Document,
): NonWorkingDayQuestion | null {
  const within = workingCalendarOf(held.schedule)
  const bySerial = new Map<number, CalendarDay>()
  for (const day of placedDaysOf(commands, held.schedule)) {
    if (!isWorkingDay(within, day)) bySerial.set(serial(day), day)
  }
  if (bySerial.size === 0) return null
  const days = [...bySerial.keys()].sort((a, b) => a - b).map((key) => bySerial.get(key) as CalendarDay)
  return {
    days: days.map(textOfDay),
    madeWorking: { kind: 'setCalendar', exceptions: exceptionsWorkingOn(within, days) },
  }
}

// see HW-1, HW-4, HW-5, HW-9
/** @purity pure */
function placedDaysOf(commands: readonly DocumentCommand[], schedule: Schedule): CalendarDay[] {
  const placed: CalendarDay[] = []
  for (const command of commands) {
    const task = 'uid' in command ? schedule.tasks.find((one) => one.uid === command.uid) : undefined
    if (task === undefined) continue
    if (command.kind === 'setTaskPlanDates') {
      placed.push(...movedDays([[task.start, command.start], [task.finish, command.finish]]))
    } else if (command.kind === 'setTaskPlanActualState' && command.place.row !== 'PA-1') {
      placed.push(...movedActualDays(task, command.place))
    } else if (command.kind === 'beginTaskActual') {
      placed.push(...movedDays([[null, command.droppedDay]]))
    }
  }
  return placed
}

// see HW-3
// WHY: the resume day of PA-3 is left out; it enters no length count, so no count disagrees.
/** @purity pure */
function movedActualDays(
  task: Task,
  place: { readonly actualStart: string; readonly stop?: string; readonly actualFinish?: string },
): CalendarDay[] {
  const lastDay = actualLastDay(task)
  const heldLast = lastDay === null ? null : textOfDay(lastDay)
  const placedLast = place.actualFinish ?? place.stop ?? null
  return movedDays([[task.actualStart, place.actualStart], [heldLast, placedLast]])
}

// see HW-9
/** @purity pure */
function movedDays(pairs: readonly (readonly [string | null, string | null])[]): CalendarDay[] {
  const moved: CalendarDay[] = []
  for (const [before, after] of pairs) {
    const day = dayOf(after)
    if (day !== null && !isSameDay(before, after)) moved.push(day)
  }
  return moved
}

// see HW-10, WC-6, EX-13
// WHY: a holiday row that covers the day loses it (split in two when the day is inside), and a working
// row is added only when the day is still not working -- overlapping rows have no order the spec names.
/** @purity pure */
function exceptionsWorkingOn(within: WorkingCalendar, days: readonly CalendarDay[]): Exception[] {
  let rows: Exception[] = [...within.exceptions]
  let nextOrdinal = rows.reduce((high, one) => Math.max(high, one.ordinal), -1) + 1
  for (const day of days) {
    const at = serial(day)
    rows = rows.flatMap((row) => {
      const parts = holidayWithout(row, at, nextOrdinal)
      if (parts.length === 2) nextOrdinal += 1
      return parts
    })
    if (isWorkingDay({ ...within, exceptions: rows }, day)) continue
    rows.push(workingRowOn(day, nextOrdinal))
    nextOrdinal += 1
  }
  return rows
}

// see HW-10
/** @purity pure */
function holidayWithout(row: Exception, at: number, spareOrdinal: number): Exception[] {
  if (row.dayWorking === true || !isNonRecurringException(row)) return [row]
  const from = dayOf(row.fromDate)
  if (from === null) return [row]
  const to = dayOf(row.toDate) ?? from
  if (at < serial(from) || at > serial(to)) return [row]
  const parts: Exception[] = []
  if (serial(from) < at) parts.push({ ...row, toDate: textOfDayEnd(dayFromSerial(at - 1)) })
  if (at < serial(to)) {
    const ordinal = parts.length === 0 ? row.ordinal : spareOrdinal
    parts.push({ ...row, ordinal, fromDate: textOfDayStart(dayFromSerial(at + 1)) })
  }
  return parts
}

// see WC-6, AT-81, AT-82
/** @purity pure */
function workingRowOn(day: CalendarDay, ordinal: number): Exception {
  return {
    ordinal,
    name: null,
    fromDate: textOfDayStart(day),
    toDate: textOfDayEnd(day),
    dayWorking: true,
    recurrenceKind: DAILY_RECURRENCE_KIND,
    carry: {},
    carryElements: [],
  }
}

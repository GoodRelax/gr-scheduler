// EditDocument: the Calendar aggregate's one command.
// @unit      UF-16  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import {
  dayOf,
  isSameDay,
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
  WeekDay,
} from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditReport, EditResult, Refusal } from './edit-document'
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

// see CM-39, WT-6, WT-7, WT-10
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

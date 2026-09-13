// EditDocument: the Calendar aggregate's one command.
// @unit      UF-16  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import { workingCalendarOf } from '../../entity/document-model/schedule/schedule'
import type {
  Calendar,
  Schedule,
  Task,
  WeekDay,
} from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditReport, EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'
import { repriced } from './edit-task'

// see CM-39, FR-088
// STOP: spec does not decide the exception-day field (recurrence kind; replace or add). Looked in FR-088, AT-82, AT-83
export type CalendarCommand =
  | {
      readonly kind: 'setCalendar'
      // TRAP: dayType codes weekdays 1..7 (AT-73); weekStartDay codes them 0..6 (AT-17). Nothing converts.
      readonly workingDayTypes?: readonly number[]
      readonly weekStartDay?: number | null
    }

const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

// see CM-39, FR-088, FR-012
// STOP: spec does not decide which tasks FR-088's affected-task count covers. Looked in FR-088, FR-012
/** @purity pure */
export function editCalendar(document: Document, command: CalendarCommand): EditResult {
  switch (command.kind) {
    case 'setCalendar': {
      const { workingDayTypes, weekStartDay } = command
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
      if (workingDayTypes !== undefined && foundAt < 0) {
        // STOP: spec does not decide creating a Calendar row. Looked in T-108, FR-001, FR-008, T-209
        refusals.push(
          reject('CM-39', 'FR-054', 'the document has no calendar of its own to write the weekdays into'),
        )
      }

      if (refusals.length > 0) return refused(refusals)

      let calendars = schedule.calendars
      if (workingDayTypes !== undefined) {
        const next = withWorkingDayTypes(within.calendar, workingDayTypes)
        // TRAP: keep the old reference when no weekday moved; document-change-plan.ts reads a new one as a change.
        if (next !== within.calendar) {
          calendars = schedule.calendars.map((one, index) => (index === foundAt ? next : one))
        }
      }

      const project =
        weekStartDay === undefined || weekStartDay === schedule.project.weekStartDay
          ? schedule.project
          : { ...schedule.project, weekStartDay }

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
function recountedPercentComplete(schedule: Schedule): {
  readonly schedule: Schedule
  readonly movedTaskUids: readonly number[]
} {
  const within = workingCalendarOf(schedule)
  const movedTaskUids: number[] = []

  const tasks: Task[] = schedule.tasks.map((task) => {
    const next = repriced(within, task)
    if (next.percentComplete === task.percentComplete) return task
    movedTaskUids.push(task.uid)
    return next
  })

  if (movedTaskUids.length === 0) return { schedule, movedTaskUids: [] }
  return { schedule: { ...schedule, tasks }, movedTaskUids }
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

  // STOP: spec does not decide how a created weekday row is numbered. Looked in AT-72, IV-1
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
function isDayType(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 7
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

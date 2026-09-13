// EditDocument -- the Calendar aggregate.
//
// @unit      UF-16  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// CM-39 of table T-108, the one command in the `Calendar` group. One command
// rather than one per column so an edit reaching both `Calendar` and `Project`
// comes back as ONE Document (FR-088); the all-or-nothing write is WS-3 of
// table T-067.
//
// Validates and returns a new Document; settles nothing (CP-9).

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

/**
 * CM-39 of table T-108. An absent field is left alone: FR-088 folds the parts
 * into one commit, not into one mandatory payload.
 *
 * STOP -- FR-088's exception days have no field here, because two things such a
 * field needs would have to be chosen by the implementation:
 *   1. which `Exception.recurrenceKind` (AT-82) value means "does not recur"
 *      for a day GRS places, or whether null says it (the coding is the
 *      official XSD's, Chapter 6.2);
 *   2. whether a new list replaces, adds to, or may delete the exception rows
 *      already held, which carry `carry` / `carryElements` (AT-83 / AT-84) and
 *      may be recurring ones GRS does not expand (FR-054).
 * An import can already place exception days, so the other two halves are
 * usable without this one.
 */
export type CalendarCommand =
  | {
      readonly kind: 'setCalendar'
      /**
       * Worked weekdays in `WeekDay.dayType` coding, 1 to 7 (AT-73). The whole
       * answer: a weekday not named becomes non-working. Not the coding of
       * `weekStartDay` (FR-088), and nothing here converts between them.
       */
      readonly workingDayTypes?: readonly number[]
      /**
       * The week start in `Project.weekStartDay` coding, 0 to 6 (AT-17), or
       * null: the column is nullable (table T-209), and an empty one reads as
       * S-108 where the week ruler is drawn (FR-054).
       */
      readonly weekStartDay?: number | null
    }

/** The seven codes AT-73 admits, so the sweep is the column's range. */
const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

/**
 * Runs the Calendar command against the document.
 *
 * FR-012's recount of the stored `percentComplete` happens inside this write,
 * in the same returned `Document`, so one undo step takes back the calendar
 * and the recounted figures together.
 *
 * The count leaves on `EditReport` (tasks whose stored figure moved; RS-52 of
 * table T-233), not as a notice raised here: the telling is WS-7 of table
 * T-067, and this is WS-3 (CP-9).
 *
 * STOP -- FR-088's own affected-task count is a different number (every task
 * the calendar reaches, or only those whose derived days move), and FR-088
 * does not say which. FR-012's count, of changed values, is the one measured.
 *
 * @purity pure
 */
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

        // FR-088: a calendar working no weekday is refused (IV-17 of table
        // T-220). Refused rather than thrown where days are counted (as ST-7 of
        // table T-014 is), because taking all seven weekdays off is an ordinary
        // edit; and not reset to table T-209's default, which would count days by
        // the weekdays just taken off.
        if (!workingDayTypes.some(isDayType)) {
          refusals.push(
            reject('CM-39', 'FR-088', 'the document calendar would work no weekday at all'),
          )
        }
      }

      // null passes: the column is nullable and S-108 supplies the week start.
      if (
        weekStartDay !== undefined &&
        weekStartDay !== null &&
        (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6)
      ) {
        refusals.push(reject('CM-39', 'AT-17', `weekStartDay outside 0..6: ${weekStartDay}`))
      }

      // FR-054's choice of calendar lives in `workingCalendarOf` alone.
      // Compared by identity, not `uid`: table T-209's default is built, not a
      // document row, and its uid could match a real row by accident.
      const within = workingCalendarOf(schedule)
      const foundAt = schedule.calendars.indexOf(within.calendar)
      if (workingDayTypes !== undefined && foundAt < 0) {
        // Table T-209's default has no row to write into, and creating one is
        // not decided: no row of table T-108 creates a `Calendar`, and FR-001 /
        // FR-008 take new uids without naming `Calendar`. Refused, since writing
        // into the built default would drop the edit silently.
        refusals.push(
          reject('CM-39', 'FR-054', 'the document has no calendar of its own to write the weekdays into'),
        )
      }

      // AG-8: the refusals go back as a VALUE, and all of them at once.
      if (refusals.length > 0) return refused(refusals)

      let calendars = schedule.calendars
      if (workingDayTypes !== undefined) {
        const next = withWorkingDayTypes(within.calendar, workingDayTypes)
        // Rebuilt only when a weekday moved: `document-change-plan.ts` moves
        // FR-063's schedule instant off the schedule reference.
        if (next !== within.calendar) {
          calendars = schedule.calendars.map((one, index) => (index === foundAt ? next : one))
        }
      }

      // Only `weekStartDay`: FR-074's calendar-owned columns (`calendarUid`,
      // `minutesPerDay`, `minutesPerWeek`, `daysPerMonth`) are not among the
      // three things FR-088 names.
      const project =
        weekStartDay === undefined || weekStartDay === schedule.project.weekStartDay
          ? schedule.project
          : { ...schedule.project, weekStartDay }

      if (calendars === schedule.calendars && project === schedule.project) {
        // Nothing moved, so the schedule reference must not move either.
        return edited(document)
      }

      // Recount only when the worked days moved: `weekStartDay` places the week
      // ruler (AT-17) and is no input to counting worked days (FR-054).
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

/**
 * The schedule with every stored `percentComplete` recounted by the calendar
 * it now resolves to, and the uids whose figure moved (FR-012).
 *
 * The formula stays in `repriced` (`edit-task.ts`), kept in one place (FR-012).
 * "Moved" compares the value, not object identity (`repriced` always builds a
 * new object); an unmoved task comes back as the same object, so the schedule
 * reference stays put when nothing moved (`document-change-plan.ts`, FR-063).
 *
 * @purity pure
 */
function recountedPercentComplete(schedule: Schedule): {
  readonly schedule: Schedule
  readonly movedTaskUids: readonly number[]
} {
  // Resolved from the schedule as it now stands: the command above may have
  // written into the row `Project.calendarUid` resolves to (FR-054).
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

/**
 * The calendar with its weekdays saying what the command says, or the SAME
 * calendar when they already said it.
 *
 * Only `dayWorking` is written; `dayType` and `carry` are the exchange
 * partner's values (AT-73 / AT-75).
 *
 * @purity pure
 */
function withWorkingDayTypes(calendar: Calendar, workingDayTypes: readonly number[]): Calendar {
  const worked = new Set<number>(workingDayTypes)
  let changed = false

  const held: WeekDay[] = calendar.weekDays.map((one) => {
    // A row with no `dayType` decides no weekday (`isWorkingDay` matches on
    // that column), so it is kept as it stands for the exchange partner.
    if (one.dayType === null) return one
    const dayWorking = worked.has(one.dayType)
    if (one.dayWorking === dayWorking) return one
    changed = true
    return { ...one, dayWorking }
  })

  // A missing weekday row already reads as not worked (`isWorkingDay`, UF-1),
  // so a row is created only for a weekday marked worked.
  // Appended after the highest ordinal, which leaves imported rows in place and
  // keeps the ordinal unique (AT-72, IV-1 of table T-220). The specification
  // does not state how GRS numbers a weak-entity row it creates.
  let nextOrdinal = held.reduce((high, one) => Math.max(high, one.ordinal), -1) + 1
  for (const dayType of DAY_TYPES) {
    if (!worked.has(dayType)) continue
    if (held.some((one) => one.dayType === dayType)) continue
    held.push({ ordinal: nextOrdinal, dayType, dayWorking: true, carry: {}, carryElements: [] })
    nextOrdinal += 1
    changed = true
  }

  // A command working no day is refused by the caller (FR-088, IV-17), so this
  // always leaves at least one weekday worked.
  return changed ? { ...calendar, weekDays: held } : calendar
}

/**
 * Whether the value names a weekday: AT-73 fixes `WeekDay.dayType` at 1..7.
 *
 * @purity pure
 */
function isDayType(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 7
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

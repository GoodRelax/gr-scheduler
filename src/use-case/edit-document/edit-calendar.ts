// EditDocument -- the Calendar aggregate.
//
// @unit      UF-16  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The one command table T-108 puts in the `Calendar` group: CM-39.
//
// ⭐ It is ONE command rather than one per column because FR-088 requires an
// edit that reaches both `Calendar` and `Project` to be settled in a single
// write (MUST): settled separately, "稼働する曜日だけが変わって週の始まりが変わ
// らない中間状態を人が読める". What this file does towards that is answer with
// ONE new Document carrying both halves; the write itself belongs to table
// T-067, which FR-088 names as the owner of the procedure, and its WS-3 is the
// all-or-nothing step.
//
// ⚠️ This file VALIDATES and returns a new Document. It settles nothing, which
// is what CP-9 leaves to this component.
//
// ⚠️ It is not the public entry of its component. Nothing outside
// `edit-document/` may import it (Chapter 5.3, MUST NOT).

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
 * CM-39 of table T-108.
 *
 * ⚠️ Both fields are optional and an absent one is left alone. FR-088 folds
 * the parts into one command so that a combined edit COMMITS once -- it does
 * not require every edit to carry every part.
 *
 * ⛔ INCOMPLETE: FR-088 also has the person change the exception days
 * ("例外日（休業日）"), and no field for them is declared here. Two things such
 * a field needs are undecided, and both would have to be chosen by the
 * implementation rather than read out of the specification:
 *
 *   1. `Exception.recurrenceKind` (AT-82) for a day GRS itself places. Its
 *      origin is `Consume`, so a written row needs a value, and the coding is
 *      the official XSD's (Chapter 6.2) -- but nothing names the value that
 *      stands for "does not recur", nor says that leaving the column null is
 *      the way to say it.
 *   2. What becomes of the exception rows already in the calendar. They carry
 *      `carry` / `carryElements` (AT-83 / AT-84) and may be recurring ones GRS
 *      deliberately does not expand (FR-054), and no rule says whether a new
 *      list of days replaces them, is added to them, or may delete them.
 *
 * Placing them in a document is already reachable through an import, so the
 * two halves below are usable without this one.
 */
export type CalendarCommand =
  | {
      readonly kind: 'setCalendar'
      /**
       * Which weekdays are worked, in the `WeekDay.dayType` coding -- 1 to 7
       * (AT-73). The list is the WHOLE answer: a weekday it does not name
       * becomes non-working.
       *
       * ⚠️ NOT the coding of `weekStartDay`. The two are different (FR-088:
       * "2 つの曜日の符号は別である"), and nothing here converts between them.
       */
      readonly workingDayTypes?: readonly number[]
      /**
       * The week start, in the `Project.weekStartDay` coding -- 0 to 6
       * (AT-17), or null. AT-17 is the place this is kept, "暦ではなくここが
       * 置き場である". Null is admitted because the column is nullable and
       * table T-209 covers "取り込んだが値が空の文書" -- an empty one reads as
       * S-108 where the week ruler is drawn (FR-054), not here.
       */
      readonly weekStartDay?: number | null
    }

/** The seven codes AT-73 admits, so the sweep is the column's range. */
const DAY_TYPES = [1, 2, 3, 4, 5, 6, 7] as const

/**
 * Runs the Calendar command against the document.
 *
 * ⭐⭐ THE RECOUNT FR-012 ASKS FOR HAPPENS HERE, INSIDE THIS WRITE. That
 * requirement (MUST, 利用者の裁定 2026-09-07) reads 「稼働日の暦を編集したときも、
 * 格納済みの完了率を数え直すこと（MUST）」, and it fixes WHERE: 「暦の変更と同じ
 * 書き込みの中で行うこと（MUST）。別の書き込みに分けてはならない（MUST NOT）——
 * 暦の変更は取り消せるので、分けると取り消しが暦だけを戻し、数え直した完了率が
 * 残る」. ⚠️ So it is the SAME `Document` this function answers with -- one
 * value, one undo step, and the two can no more come apart than the two halves
 * of an edit reaching both `Calendar` and `Project` can (the head of this file).
 *
 * ⭐ THE COUNT LEAVES ON `EditReport`, not on a notice raised here. The telling
 * is WS-7 of table T-067 -- after the swap, `non-pure` -- while this file is
 * WS-3, which CP-9 limits to validating and returning a new document. What
 * rides out is the list of `Task`s whose stored figure MOVED; its length is
 * NT-3's count, and `RS-52` of table T-233 is the reason it rides on.
 *
 * ⛔ A DIFFERENT COUNT, STILL UNDECIDED: FR-088's own 「影響する `Task` の件数を
 * 通知すること（MUST）」. Every task the calendar reaches, and only those whose
 * derived days actually move, are different numbers, and FR-088 says which of
 * the two it means nowhere. ⭐ FR-012's count IS decided -- 「値が変わった `Task`
 * の件数」 -- and that is the one measured below.
 *
 * @purity pure
 */
export function editCalendar(document: Document, command: CalendarCommand): EditResult {
  switch (command.kind) {
    case 'setCalendar': {
      const { workingDayTypes, weekStartDay } = command
      const schedule = document.schedule
      const refusals: Refusal[] = []

      // AT-73 fixes the range of `WeekDay.dayType` at 1..7. A code outside it
      // names no weekday, so it cannot be stored and cannot be counted by.
      if (workingDayTypes !== undefined) {
        for (const dayType of workingDayTypes) {
          if (!isDayType(dayType)) {
            refusals.push(reject('CM-39', 'AT-73', `dayType outside 1..7: ${dayType}`))
          }
        }

        // FR-088 (MUST NOT, then MUST): 「稼働する曜日を 1 つも持たない暦を、
        // 文書の暦（`FR-054`）にしてはならない（MUST NOT）。受け付けずに通知す
        // ること（MUST）」。 The condition is IV-17 of table T-220 -- the
        // calendar FR-054 resolves works at least one weekday -- and this list
        // is the WHOLE answer, so a list naming no weekday of AT-73's range
        // leaves that calendar working none.
        //
        // ⚠️ Refused here rather than thrown where the days are counted: FR-088
        // sets this beside FR-085 and FR-098 ("受け付けずに通知する") and apart
        // from `ST-7` of table T-014, because a person taking all seven
        // weekdays off reaches it in the ordinary way.
        //
        // ⚠️ Refused rather than put back: 「既定の暦（表 T-209）へ黙って戻して
        // はならない（MUST NOT）」 —— a silent reset would count the days by the
        // weekdays the person had just taken off.
        if (!workingDayTypes.some(isDayType)) {
          refusals.push(
            reject('CM-39', 'FR-088', 'the document calendar would work no weekday at all'),
          )
        }
      }

      // AT-17 fixes `Project.weekStartDay` at 0..6, and null passes -- the
      // column is nullable, and table T-209 reaches a document whose value is
      // empty, so an empty one still has a week start to read (S-108).
      if (
        weekStartDay !== undefined &&
        weekStartDay !== null &&
        (!Number.isInteger(weekStartDay) || weekStartDay < 0 || weekStartDay > 6)
      ) {
        refusals.push(reject('CM-39', 'AT-17', `weekStartDay outside 0..6: ${weekStartDay}`))
      }

      // FR-054 fixes WHICH calendar this writes into: what `Project.calendarUid`
      // names, else the lowest-ordinal base calendar, else table T-209's
      // default. `workingCalendarOf` is the one place that order lives.
      //
      // ⚠️ Compared by identity, not by `uid`: the third answer is a calendar
      // BUILT from table T-209 and is not a row of the document, and its uid
      // stands for nothing, so a document holding a calendar of the same uid
      // would be matched by mistake.
      const within = workingCalendarOf(schedule)
      const foundAt = schedule.calendars.indexOf(within.calendar)
      if (workingDayTypes !== undefined && foundAt < 0) {
        // ⛔ The document counts by table T-209's default, which has no row to
        // write into. Creating one is not decided: no row of table T-108
        // creates a `Calendar`, and while FR-001 and FR-008 take a new `uid`
        // from `Project.uidHighWaterMark` (MUST), neither names `Calendar`.
        // Refusing is the honest answer -- writing into the built default
        // would drop the edit on the floor without saying so.
        refusals.push(
          reject('CM-39', 'FR-054', 'the document has no calendar of its own to write the weekdays into'),
        )
      }

      // AG-8: the refusals go back as a VALUE, and all of them at once.
      if (refusals.length > 0) return refused(refusals)

      let calendars = schedule.calendars
      if (workingDayTypes !== undefined) {
        const next = withWorkingDayTypes(within.calendar, workingDayTypes)
        // ⚠️ Rebuild the array only when a weekday actually moved. FR-063
        // moves the schedule instant for a write that changed that group, and
        // document-change-plan.ts reads that off the schedule REFERENCE -- an
        // unconditional rebuild would move that instant for a command that
        // set the calendar to what it already said.
        if (next !== within.calendar) {
          calendars = schedule.calendars.map((one, index) => (index === foundAt ? next : one))
        }
      }

      // ⚠️ Only `weekStartDay`. FR-074 lists `calendarUid`, `minutesPerDay`,
      // `minutesPerWeek` and `daysPerMonth` as columns whose owner is the
      // calendar rather than the profile, but FR-088 names three things to
      // change and none of those four is one of them.
      const project =
        weekStartDay === undefined || weekStartDay === schedule.project.weekStartDay
          ? schedule.project
          : { ...schedule.project, weekStartDay }

      if (calendars === schedule.calendars && project === schedule.project) {
        // Nothing moved, so the schedule reference must not move either.
        return edited(document)
      }

      // FR-012's recount, and only when the WORKED DAYS moved. `weekStartDay`
      // is not an input to counting 稼働日: FR-054 counts them by the document's
      // `Calendar`, and AT-17 is where the week RULER starts. A command that
      // moved the week start alone changes no figure, so recounting for it
      // would name tasks that did not move.
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
 * The schedule with every `Task`'s stored `percentComplete` counted again by
 * the calendar this schedule now resolves to, and the uids of the ones whose
 * figure MOVED.
 *
 * ⭐ FR-012 (MUST): 「稼働日の暦を編集したときも、格納済みの完了率を数え直すこと
 * （MUST）」. Its reason, in that requirement's own words, is that both the
 * numerator and the denominator are counted in working days, so the right
 * figure moves when the calendar moves even though no date does. ⚠️ The figures are STORED, which is why they have to be
 * written rather than derived at the paint: FR-012 stores them and FR-090 shows
 * what FR-012 stored.
 *
 * ⛔ THE FORMULA IS NOT REPEATED HERE. FR-012 requires it kept in one place --
 * 「この式を 1 か所に閉じ込め、呼ぶ側が式の中身に依存しない形にすること」 -- so
 * `repriced` in `edit-task.ts` is asked, and this function only decides WHICH
 * calendar to ask it about and WHO moved.
 *
 * ⚠️ WHO MOVED IS THE STORED FIGURE'S OWN COMPARISON, and not whether
 * `repriced` built a new object -- it builds one every time. FR-012's count is
 * 「値が変わった `Task` の件数」, so the value is what is compared, and a task
 * whose figure stands is handed back as the very object it was: the schedule
 * reference is then left alone when nothing moved at all, and
 * `document-change-plan.ts` reads FR-063's schedule instant off that reference.
 *
 * @purity pure
 */
function recountedPercentComplete(schedule: Schedule): {
  readonly schedule: Schedule
  readonly movedTaskUids: readonly number[]
} {
  // ⚠️ Resolved from the schedule as it now stands, never from the one that
  // came in: FR-054 puts the choice on `Project.calendarUid`, and the command
  // above may have written into whichever row that resolves to.
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
 * ⚠️ Only `dayWorking` is written. `dayType` and the row's `carry` are the
 * exchange partner's own values (AT-73 / AT-75), and the person changed which
 * days are worked, not which day a row is about.
 *
 * @purity pure
 */
function withWorkingDayTypes(calendar: Calendar, workingDayTypes: readonly number[]): Calendar {
  const worked = new Set<number>(workingDayTypes)
  let changed = false

  const held: WeekDay[] = calendar.weekDays.map((one) => {
    // A row with no `dayType` decides no day of the week -- `isWorkingDay`
    // matches on that column -- so this command has nothing to say about it,
    // and it is kept as it stands to go back to the exchange partner.
    if (one.dayType === null) return one
    const dayWorking = worked.has(one.dayType)
    if (one.dayWorking === dayWorking) return one
    changed = true
    return { ...one, dayWorking }
  })

  // A weekday with no row of its own is already not worked: `isWorkingDay`
  // (UF-1) answers false when it finds no row for the day. So a row is created
  // only for a weekday the command marks as WORKED -- a row saying
  // `dayWorking: false` would repeat what the absence already says.
  //
  // ⚠️ The new row is appended after the highest ordinal in the array. AT-72
  // is 親の中での出現順 and is GRS's own column, kept so that the write-out can
  // restore the order the rows arrived in, and IV-1 of table T-220 needs the
  // value unique inside the array; appending leaves every imported row where
  // it was. ⚠️ It is a decision of this file: nothing in the specification
  // states how GRS numbers a weak-entity row it creates.
  let nextOrdinal = held.reduce((high, one) => Math.max(high, one.ordinal), -1) + 1
  for (const dayType of DAY_TYPES) {
    if (!worked.has(dayType)) continue
    if (held.some((one) => one.dayType === dayType)) continue
    held.push({ ordinal: nextOrdinal, dayType, dayWorking: true, carry: {}, carryElements: [] })
    nextOrdinal += 1
    changed = true
  }

  // ⚠️ A command that works NO day never arrives here: FR-088 has the caller
  // above refuse it, so this function is only ever asked for a calendar that
  // still works at least one weekday (IV-17 of table T-220).
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

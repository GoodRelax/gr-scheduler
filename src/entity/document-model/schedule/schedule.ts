// Schedule -- public entry of this folder.
//
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

export {}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/erd.json
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/** ET-1 of table T-056. */
export interface Project {
  /** AT-1 */
  readonly id: string | null
  /** AT-2 */
  readonly name: string | null
  /** AT-3 */
  readonly title: string | null
  /** AT-4 */
  readonly subject: string | null
  /** AT-5 */
  readonly category: string | null
  /** AT-6 */
  readonly company: string | null
  /** AT-7 */
  readonly manager: string | null
  /** AT-8 */
  readonly author: string | null
  /** AT-9 */
  readonly created: string | null
  /** AT-10 */
  readonly revision: number | null
  /** AT-11 */
  readonly lastSaved: string | null
  /** AT-12 */
  readonly startDate: string | null
  /** AT-13 */
  readonly statusDate: string | null
  /** AT-14 */
  readonly minutesPerDay: number | null
  /** AT-15 */
  readonly minutesPerWeek: number | null
  /** AT-16 */
  readonly daysPerMonth: number | null
  /** AT-17 */
  readonly weekStartDay: number | null
  /** AT-18 */
  readonly calendarUid: number | null
  /** AT-19 */
  readonly themeHue: number
  /** AT-20 */
  readonly uidHighWaterMark: number
  /** AT-21 */
  readonly importSeq: number
  /** AT-22 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-23 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-2 of table T-056. */
export interface Task {
  /** AT-24 */
  readonly uid: number
  /** AT-25 */
  readonly wbsParentUid: number | null
  /** AT-26 */
  readonly wbsOrder: number | null
  /** AT-27 */
  readonly name: string | null
  /** AT-28 */
  readonly start: string | null
  /** AT-29 */
  readonly finish: string | null
  /** AT-30 */
  readonly milestone: boolean | null
  /** AT-31 */
  readonly deadline: string | null
  /** AT-32 */
  readonly notes: string | null
  /** AT-33 */
  readonly calendarUid: number | null
  /** AT-34 */
  readonly actualStart: string | null
  /** AT-35 */
  readonly actualDuration: number | null
  /** AT-36 */
  readonly actualFinish: string | null
  /** AT-37 */
  readonly resume: string | null
  /** AT-38 */
  readonly resumeValid: boolean | null
  /** AT-39 */
  readonly percentComplete: number | null
  /** AT-40 */
  readonly fadeInDays: number | null
  /** AT-41 */
  readonly fadeOutDays: number | null
  /** AT-42 */
  readonly dependencies: readonly Dependency[]
  /** AT-43 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-44 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-3 of table T-056. */
export interface Dependency {
  /** AT-45 */
  readonly predecessorUid: number
  /** AT-46 */
  readonly linkType: number
  /** AT-47 */
  readonly lag: number | null
  /** AT-48 */
  readonly lagFormat: number | null
  /** AT-49 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-50 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-4 of table T-056. */
export interface TaskGroup {
  /** AT-51 */
  readonly id: string
  /** AT-52 */
  readonly parentId: string | null
  /** AT-53 */
  readonly label: string | null
  /** AT-54 */
  readonly derivedFromTaskUid: number | null
  /** AT-55 */
  readonly order: number
  /** AT-56 */
  readonly isCollapsed: boolean | null
  /** AT-57 */
  readonly isHidden: boolean | null
  /** AT-58 */
  readonly color: string | null
  /** AT-59 */
  readonly height: number | null
}

/** ET-5 of table T-056. */
export interface TaskGroupMember {
  /** AT-60 */
  readonly taskUid: number
  /** AT-61 */
  readonly groupId: string
  /** AT-62 */
  readonly stackOrder: number | null
}

/** ET-6 of table T-056. */
export interface Calendar {
  /** AT-63 */
  readonly uid: number
  /** AT-64 */
  readonly name: string | null
  /** AT-65 */
  readonly isBaseCalendar: boolean | null
  /** AT-66 */
  readonly baseCalendarUid: number | null
  /** AT-67 */
  readonly ordinal: number
  /** AT-68 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-69 */
  readonly carryElements: readonly CarryElement[]
  /** AT-70 */
  readonly weekDays: readonly WeekDay[]
  /** AT-71 */
  readonly exceptions: readonly Exception[]
}

/** ET-7 of table T-056. */
export interface WeekDay {
  /** AT-72 */
  readonly ordinal: number
  /** AT-73 */
  readonly dayType: number | null
  /** AT-74 */
  readonly dayWorking: boolean | null
  /** AT-75 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-76 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-8 of table T-056. */
export interface Exception {
  /** AT-77 */
  readonly ordinal: number
  /** AT-78 */
  readonly name: string | null
  /** AT-79 */
  readonly fromDate: string | null
  /** AT-80 */
  readonly toDate: string | null
  /** AT-81 */
  readonly dayWorking: boolean | null
  /** AT-82 */
  readonly recurrenceKind: number | null
  /** AT-83 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-84 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-9 of table T-056. */
export interface Resource {
  /** AT-85 */
  readonly uid: number
  /** AT-86 */
  readonly name: string | null
  /** AT-87 */
  readonly resourceKind: number | null
  /** AT-88 */
  readonly isCostResource: boolean | null
  /** AT-89 */
  readonly calendarUid: number | null
  /** AT-90 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-91 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-10 of table T-056. */
export interface Assignment {
  /** AT-92 */
  readonly uid: number
  /** AT-93 */
  readonly taskUid: number | null
  /** AT-94 */
  readonly resourceUid: number | null
  /** AT-95 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-96 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-11 of table T-056. */
export interface TaskVisual {
  /** AT-97 */
  readonly taskUid: number
  /** AT-98 */
  readonly nameAnchor: number | null
  /** AT-99 */
  readonly nameAlign: 'left' | 'center' | 'right' | null
  /** AT-100 */
  readonly shapeKind: 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone' | null
  /** AT-101 */
  readonly milestoneGlyph: 'circle' | 'hexagon' | 'pentagon' | 'diamond' | 'square' | 'star' | 'triangleUp' | 'triangleDown' | null
  /** AT-102 */
  readonly fillColor: string | null
  /** AT-103 */
  readonly strokeColor: string | null
  /** AT-104 */
  readonly lineWeight: 'thin' | 'medium' | 'thick' | null
}

/** ET-12 of table T-056. */
export interface TaskOrigin {
  /** AT-105 */
  readonly taskUid: number
  /** AT-106 */
  readonly sourceProjectUid: string | null
  /** AT-107 */
  readonly sourceUid: number
  /** AT-108 */
  readonly lastSeenImportSeq: number
  /** AT-109 */
  readonly importSessionId: string | null
}

/** ET-13 of table T-056. */
export interface CommentBox {
  /** AT-110 */
  readonly id: string
  /** AT-111 */
  readonly leaderShapeKind: 'calloutBox' | 'polyline' | null
  /** AT-112 */
  readonly text: string | null
  /** AT-113 */
  readonly anchorDate: string | null
  /** AT-114 */
  readonly anchorGroupId: string | null
  /** AT-115 */
  readonly bodyOffsetPx: { readonly dx: number, readonly dy: number } | null
}

/** ET-14 of table T-056. */
export interface HighlightBox {
  /** AT-116 */
  readonly id: string
  /** AT-117 */
  readonly startDate: string | null
  /** AT-118 */
  readonly endDate: string | null
  /** AT-119 */
  readonly topGroupId: string | null
  /** AT-120 */
  readonly bottomGroupId: string | null
  /** AT-121 */
  readonly strokeColor: string | null
  /** AT-122 */
  readonly cornerRadiusPx: number | null
}

/** ET-15 of table T-056. */
export interface CarryElement {
  /** AT-123 */
  readonly ordinal: number
  /** AT-124 */
  readonly name: string
  /** AT-125 */
  readonly fields: Readonly<Record<string, string>>
  /** AT-126 */
  readonly children: readonly CarryElement[]
}

/** ET-18 of table T-056. */
export interface BaselineTask {
  /** AT-134 */
  readonly uid: number
  /** AT-135 */
  readonly name: string | null
  /** AT-136 */
  readonly start: string | null
  /** AT-137 */
  readonly finish: string | null
  /** AT-138 */
  readonly milestone: boolean | null
}

/** The schedule group. Its keys are DR-2 of table T-052. */
export interface Schedule {
  readonly project: Project
  readonly calendars: readonly Calendar[]
  readonly tasks: readonly Task[]
  readonly resources: readonly Resource[]
  readonly assignments: readonly Assignment[]
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
  readonly taskVisuals: readonly TaskVisual[]
  readonly commentBoxes: readonly CommentBox[]
  readonly highlightBoxes: readonly HighlightBox[]
  readonly taskOrigins: readonly TaskOrigin[]
  readonly baselineTasks: readonly BaselineTask[]
}

/**
 * Every column table T-058 gives a date or a datetime type, by entity.
 *
 * ⭐ IV-14 reaches these as "表 T-058 の型の欄が日付または日時とする列"
 * rather than naming them, so a hand-written roster goes stale the moment
 * a column is added and nothing says so (F-3). erd.json marks them, so
 * this is the roster, not a copy of it.
 */
export const DATE_COLUMNS: {
  readonly Project: readonly (keyof Project & string)[]
  readonly Task: readonly (keyof Task & string)[]
  readonly Exception: readonly (keyof Exception & string)[]
  readonly CommentBox: readonly (keyof CommentBox & string)[]
  readonly HighlightBox: readonly (keyof HighlightBox & string)[]
  readonly BaselineTask: readonly (keyof BaselineTask & string)[]
} = {
  Project: ['created', 'lastSaved', 'startDate', 'statusDate'],
  Task: ['start', 'finish', 'deadline', 'actualStart', 'actualFinish', 'resume'],
  Exception: ['fromDate', 'toDate'],
  CommentBox: ['anchorDate'],
  HighlightBox: ['startDate', 'endDate'],
  BaselineTask: ['start', 'finish'],
}
// </generated>



/**
 * The five states of table T-019a. The spellings are this file's own: the
 * state is derived, never stored and never exchanged, so no table names it.
 * Each is tied to the row it comes from so a failing test can name one line.
 */
export type PlanActualState =
  /** PS-1 */ | 'notStarted'
  /** PS-2 */ | 'finished'
  /** PS-3 */ | 'suspendedResumeUnknown'
  /** PS-4 */ | 'suspendedResumePlanned'
  /** PS-5 */ | 'inProgress'

/**
 * Which of the five a task is in. Table T-019a is a decision list read in the
 * order of its rank column, and it is total: PS-5 catches whatever the first
 * four did not, which is what made the table replace a set of conditions that
 * left a real task -- one suspended and then finished -- matching no row.
 *
 * @purity pure
 */
export function planActualState(task: Task): PlanActualState {
  if (task.actualStart === null) return 'notStarted'            // PS-1
  if (task.actualFinish !== null) return 'finished'             // PS-2
  if (task.resumeValid === false) return 'suspendedResumeUnknown' // PS-3
  if (task.resume !== null) return 'suspendedResumePlanned'     // PS-4
  return 'inProgress'                                           // PS-5
}

/** Look one task up by its UID. FR-022 matches on it. @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}

// ⛔ `scheduleViolations` is MISSING. Table T-064 lists it among the members
// `PI-1` publishes, Chapter 6.1 requires it to be driven by table T-220 rather
// than written out row by row (MUST), and `edit-annotation.ts` already names it
// as the one place that check lives. Nothing decides it -- it is simply not
// written yet, and it is a unit of work of its own, not part of this change.

// ---------------------------------------------------------------- dates ----
//
// GRS does not handle time: the smallest unit is the day (FR-054). A date
// column keeps the exchange partner's own text -- every one of them is `Own`,
// so EX-2 and FR-021 require the untouched value to go back unchanged -- and
// the day is derived from it here, in one place, rather than parsed wherever
// somebody happens to need it.
//
// The day is the LEXICAL date part. No time zone is converted (FR-054): doing
// so would move the day by one on some machines and not others.

/** A day on the calendar. No time, no zone -- FR-054. */
export interface CalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
}

const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/

/**
 * The day a stored date column names, or null when it holds none.
 *
 * @purity pure
 */
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

/**
 * The text GRS writes for a day it decided itself: the exchange partner's own
 * type, at midnight (EX-7 of table T-033). A value GRS did not touch is never
 * passed through here -- it keeps the text it arrived with.
 *
 * @purity pure
 */
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

/**
 * ⚠️ `Date.UTC` maps a year of 0 .. 99 onto 1900 .. 1999, so a day whose year
 * is below 100 lands on the wrong serial. `dayOf` admits one -- its regular
 * expression takes any four digits -- and table T-214 forbids one from ever
 * being stored (`FR-023`), but `ValidateImportedDocument` (`PI-13`) is still an
 * empty unit, so nothing enforces that yet. Left as it is on purpose: the same
 * mapping sits in `dayOf`'s round-trip check, so the fix moves both together
 * and changes what they answer for years 1 .. 99. It is not part of this change
 * and it is reported.
 *
 * @purity pure
 */
function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / 86400000
}

/** @purity pure */
function dayFromSerial(value: number): CalendarDay {
  const at = new Date(value * 86400000)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** The one calendar a count runs by, in the three parts `workingCalendarOf` resolves. */
export interface WorkingCalendar {
  readonly calendar: Calendar
  readonly weekDays: readonly WeekDay[]
  readonly exceptions: readonly Exception[]
}

/**
 * One `Exception`'s days, as serials. Both ends are INCLUSIVE -- AT-79 and
 * AT-80 name the first and the last day the exception covers -- which is why
 * the field says so (`R3.4`: a closed interval is shown by its name).
 */
interface ExceptionSpan {
  readonly from: number
  readonly toInclusive: number
  readonly isWorking: boolean
}

/**
 * The calendar in the shape one day-question wants: the exceptions as serial
 * spans, in the order the array holds them, and the weekly pattern laid out by
 * AT-73's coding. Building it reads the calendar once; asking it parses
 * nothing.
 */
interface CalendarIndex {
  readonly exceptionSpans: readonly ExceptionSpan[]
  /** Indexed by AT-73's 1..7 with 1 = Sunday. Index 0 is never asked. */
  readonly worksWeekday: readonly (boolean | undefined)[]
}

/**
 * Read the calendar once, so that a walk does not read it once per day.
 *
 * ⭐ Both walks below call this BEFORE their loop, never inside it (`R5`, code
 * level -- loop-invariant work does not belong in the loop): `dayOf` runs a
 * regular expression and builds a `Date` for every exception, and
 * `layoutFromSchedule` reaches `dateFromWorkingDays` once per `Task` per frame,
 * where `NFR-002` fixes the budget.
 *
 * ⚠️ The index is built per call, never held between calls. Holding one would
 * be a cache, and `R2.20` requires Chapter 5.6 to record what is cached, what
 * invalidates it, and what staleness is allowed. Chapter 5.6 records none of
 * that for this, so this file does not invent it -- a short walk therefore
 * still pays one pass over the exceptions, the same pass its first day used to
 * pay on its own.
 *
 * @purity pure
 */
function indexOfCalendar(within: WorkingCalendar): CalendarIndex {
  const exceptionSpans: ExceptionSpan[] = []
  for (const exception of within.exceptions) {
    const from = dayOf(exception.fromDate)
    if (from === null) continue
    // AT-80 may be absent: an exception of a single day names only its start.
    const toInclusive = dayOf(exception.toDate) ?? from
    exceptionSpans.push({
      from: serial(from),
      toInclusive: serial(toInclusive),
      isWorking: exception.dayWorking === true,
    })
  }

  const worksWeekday: (boolean | undefined)[] = new Array<boolean | undefined>(8)
  for (const weekDay of within.weekDays) {
    const dayType = weekDay.dayType
    if (dayType === null || dayType < 1 || dayType > 7) continue
    // The FIRST row for a day type decides it, which is what the `find` this
    // replaced did. A weekday with no row at all is not worked.
    if (worksWeekday[dayType] === undefined) worksWeekday[dayType] = weekDay.dayWorking === true
  }

  return { exceptionSpans, worksWeekday }
}

/**
 * Whether the day at a serial is worked. `exceptionSpans` is in the order of
 * the array it came from and the FIRST span that covers the day decides it --
 * that is what makes an exception beat the weekly pattern.
 *
 * @purity pure
 */
function isWorkingDayAt(index: CalendarIndex, atSerial: number): boolean {
  for (const span of index.exceptionSpans) {
    if (atSerial >= span.from && atSerial <= span.toInclusive) return span.isWorking
  }
  const weekday = new Date(atSerial * 86400000).getUTCDay() + 1
  return index.worksWeekday[weekday] === true
}

/**
 * Whether a day is worked. WeekDay.dayType is 1..7 with 1 = Sunday, the coding
 * of the exchange partner (AT-73); an exception that covers the day wins over
 * the weekly pattern, which is what recurrenceKind exists to bound. Only the
 * exceptions this software interprets are considered -- a recurring one it did
 * not interpret stays in carry and is not read here.
 *
 * One day at a time. A walk over many asks `isWorkingDayAt` against an index it
 * built once, so the answer is the same and the calendar is read once.
 *
 * ⚠️ The whole `WorkingCalendar` is the argument, not its three fields spread
 * out. Every caller held one anyway and had to reach through it (`R2.12`), and
 * the `calendar` field was accepted only to be discarded (`R2.9`).
 *
 * @purity pure
 */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

/**
 * Table T-209's default: Monday to Friday worked, no exception days.
 *
 * ⚠️ This calendar is NOT in the document. It is built to count by when the
 * document names none, so its `uid` stands for nothing and is never written --
 * FR-054 requires an unimported document to have a calendar all the same.
 */
const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  // AT-73 codes the days 1..7 from Sunday, so 2..6 is Monday to Friday (S-106).
  dayWorking: dayType >= 2 && dayType <= 6,
  carry: {},
  carryElements: [],
}))

const DEFAULT_CALENDAR: Calendar = {
  uid: 0,
  name: null,
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: DEFAULT_WEEK_DAYS,
  exceptions: [],
}

/**
 * The one calendar the document counts working days by.
 *
 * FR-054 says "文書が持つ暦" and then "同じ暦", singular both times, and fixes
 * the order: what `Project.calendarUid` names, else the lowest-ordinal base
 * calendar, else table T-209's default.
 *
 * ⚠️ `Task.calendarUid` and `Resource.calendarUid` are NOT read here (MUST
 * NOT). They are held to send the exchange partner's value back. Counting two
 * Tasks of one row by different calendars would leave the progress line's
 * vertices (table T-022) and the days late (FR-047) incomparable inside that
 * row, which is the one comparison UC-006 exists to make.
 *
 * ⚠️ `Calendar.baseCalendarUid` is NOT walked -- resolving that inheritance is
 * the import's job (FR-023), and doing it here would rebuild the same answer
 * every frame.
 *
 * @purity pure
 */
export function workingCalendarOf(schedule: Schedule): WorkingCalendar {
  const named = schedule.project.calendarUid
  const held = named === null ? undefined : schedule.calendars.find((one) => one.uid === named)
  const base = schedule.calendars
    .filter((one) => one.isBaseCalendar === true)
    .reduce<Calendar | undefined>(
      (best, one) => (best === undefined || one.ordinal < best.ordinal ? one : best),
      undefined,
    )
  const calendar = held ?? base ?? DEFAULT_CALENDAR
  return { calendar, weekDays: calendar.weekDays, exceptions: calendar.exceptions }
}

/**
 * The two ends of table T-214, as rows S-119 and S-120 write them.
 *
 * ⚠️ These are the DEFAULT values of two settings, not constants of the domain:
 * `DocumentSettings` publishes `importMinDate` (S-119) and `importMaxDate`
 * (S-120) per document, and both rows carry 🔎 -- the values may yet be
 * re-chosen. Reading them from the settings was the alternative and was not
 * taken: this file is handed the schedule group (DR-2 of table T-052) and never
 * the presentation group (DR-3), so the settings would have to be added to the
 * two signatures below and threaded through five call sites in three
 * components -- to size a safety valve, not to decide an answer. If the two
 * rows move, move these two with them.
 */
const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }

/**
 * The most days a walk can cross and still be inside the range table T-214
 * accepts. A walk that passes this has left the range no input may hold, which
 * is what a calendar working none of its days does -- and the alternative is a
 * loop that never ends.
 *
 * ⚠️ Derived from the two rows above, not chosen. It was written as the bare
 * literal 85000, which is this span plus 630 days that no row asks for.
 */
const ACCEPTED_DAY_SPAN = serial(IMPORT_MAX_DAY) - serial(IMPORT_MIN_DAY)

/** ST-7's shape: stop and say so, rather than answer with a wrong day. */
export class NoWorkingDayReached extends Error {
  /** @purity pure */
  constructor(readonly calendarUid: number) {
    super(`table T-214: calendar ${calendarUid} works no day inside the accepted range`)
    this.name = 'NoWorkingDayReached'
  }
}

/**
 * ST-7's shape again, for the counting walk. What that walk needs a valve for
 * is cost rather than a spin -- it always ends -- and the cost is not bounded
 * by anything else: `dayOf` admits any four-digit year, `FR-023` is the MUST
 * NOT that keeps a date outside table T-214 out of the document, and
 * `ValidateImportedDocument` (`PI-13`) is the unit that enforces it and is
 * still empty. Until it is written a document can hold 0001-01-01 and ask for
 * millions of steps on one command.
 *
 * ⚠️ A separate class from `NoWorkingDayReached` on purpose: there the calendar
 * is what is wrong, here the two ends are, and one message cannot say both.
 */
export class DaySpanTooWide extends Error {
  /** @purity pure */
  constructor(readonly from: CalendarDay, readonly to: CalendarDay) {
    super(
      `table T-214: ${textOfDay(from)} to ${textOfDay(to)} is wider than the `
      + `${ACCEPTED_DAY_SPAN} days the accepted range holds`,
    )
    this.name = 'DaySpanTooWide'
  }
}

/**
 * How many worked days lie in [from, to). Counting a half-open span is what
 * makes the count of a day against itself zero and keeps the two directions
 * symmetric; a negative span counts backwards.
 *
 * @purity pure
 */
export function workingDaysBetween(within: WorkingCalendar, from: CalendarDay,
                                   to: CalendarDay): number {
  const start = serial(from)
  const stop = serial(to)
  // The same bound `dateFromWorkingDays` walks under, for the same reason:
  // table T-214 bounds every date an input may hold, so a wider span is
  // counting days no document may name. Here the number of steps is known
  // before the walk, so the valve costs one subtraction instead of a counter.
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new DaySpanTooWide(from, to)
  const index = indexOfCalendar(within)
  const step = stop < start ? -1 : 1
  let counted = 0
  for (let at = start; at !== stop; at += step) {
    if (isWorkingDayAt(index, step > 0 ? at : at - 1)) counted += step
  }
  return counted
}

/**
 * The EARLIEST day X for which `workingDaysBetween(from, X)` is `workingDays`.
 *
 * Both of these count a half-open span, and that is what makes them a pair: a
 * task that starts on a Monday with an actualDuration of one worked day covers
 * the Monday alone (S-129, and the ruling of version 0.38), so the end it
 * reaches is the Tuesday. The end is a bound, not the last day worked -- more
 * than one day satisfies the count when a weekend follows, and taking the
 * earliest is what makes the answer single.
 *
 * @purity pure
 */
export function dateFromWorkingDays(within: WorkingCalendar, from: CalendarDay,
                                    workingDays: number): CalendarDay {
  const index = indexOfCalendar(within)
  const step = workingDays < 0 ? -1 : 1
  let remaining = Math.abs(workingDays)
  let at = serial(from)
  let walked = 0
  while (remaining > 0) {
    // A calendar that works none of its days would spin here forever, and
    // nothing in the specification forbids one arriving. Table T-214 bounds
    // every date an input may hold, so a walk past that span cannot be real.
    // Unlike the count above, how far a day of work lies is not known before
    // the walk -- it depends on the calendar -- so this valve has to count.
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    const covered = step > 0 ? at : at - 1
    at += step
    if (isWorkingDayAt(index, covered)) remaining -= 1
  }
  return dayFromSerial(at)
}

/**
 * Whether a task is behind, and by how much. Table T-021b holds all three
 * cases, and each names the start it counts from; the end is always the status
 * date. A task in none of the three is not behind.
 *
 * @purity pure
 */
export function delayStart(task: Task): { readonly row: string; readonly from: string | null } | null {
  switch (planActualState(task)) {
    case 'inProgress':
      return { row: 'DL-1', from: task.finish }
    case 'notStarted':
      return { row: 'DL-2', from: task.start }
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return { row: 'DL-3', from: task.resume }
    case 'finished':
      return null
  }
}

/** @purity pure */
export function isDelayed(task: Task, statusDate: CalendarDay | null): boolean {
  if (statusDate === null) return false
  const start = delayStart(task)
  const from = dayOf(start?.from ?? null)
  if (from === null) return false
  return compareDays(statusDate, from) > 0
}

/**
 * The delay in worked days, counted from the day table T-021b names to the
 * status date. Zero when the task is not behind.
 *
 * ⚠️ Raises `DaySpanTooWide` when the two ends are further apart than table
 * T-214 accepts. It counts dates the document already holds, and nothing has
 * range-checked them yet (`FR-023` / `PI-13`), so the valve is reachable here.
 *
 * @purity pure
 */
export function delayWorkingDays(within: WorkingCalendar, task: Task,
                                 statusDate: CalendarDay | null): number {
  if (statusDate === null || !isDelayed(task, statusDate)) return 0
  const from = dayOf(delayStart(task)?.from ?? null)
  if (from === null) return 0
  return workingDaysBetween(within, from, statusDate)
}


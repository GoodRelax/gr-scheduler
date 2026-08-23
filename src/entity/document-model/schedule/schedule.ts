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

// The presentation group, reached through ITS public entry, which is the only
// route Chapter 5.3 leaves open. `scheduleViolations` needs it because five
// rows of table T-220 are judged partly by a settings row; nothing else here
// reads it, and it is a type-only import, so no value crosses.
import type { DocumentSettings } from '../document-settings/document-settings'

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/erd.json
//   docs/spec/_source/settings.json (table T-209)
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

/**
 * Every column the specification gives a default, by entity.
 *
 * ⭐ A default is only here when the specification HAS decided one: the
 * value comes from erd.json, is printed beside the column in table T-058,
 * and reaches the GRS JSON schema as its "default" annotation. So the
 * number of places holding it is one.
 *
 * ⚠️ The value type is read off the generated interface, so a default that
 * is not a member of its own column fails to compile rather than shipping.
 */
export const COLUMN_DEFAULTS: {
  readonly TaskVisual: {
    readonly milestoneGlyph: NonNullable<TaskVisual['milestoneGlyph']>
  }
} = {
  TaskVisual: { milestoneGlyph: 'diamond' },
}

/**
 * Table T-209 -- the values a document starts its calendar from,
 * by row ID. `DEFAULT_CALENDAR` below is built out of them.
 *
 * ⭐ FR-054 resolves the document's calendar to these when nothing
 * was imported, or when what was imported left the value empty.
 *
 * ⛔ The two weekday rows do NOT share a numbering. S-106 is in the
 * dayType encoding and S-108 in the weekStartDay one, which differ
 * by one -- so Monday is 2 in the first and 1 in the second. Each
 * row says which below; converting between them is the reader's
 * job and the specification states both (AT-73, AT-17).
 */
export const DEFAULT_CALENDAR_VALUES: {
  /** S-106, as `WeekDay.dayType` (1 = Sunday) */
  readonly 'S-106': readonly number[]
  /** S-107, as `WeekDay.dayType` (1 = Sunday) */
  readonly 'S-107': readonly number[]
  /** S-108, as `Project.weekStartDay` (0 = Sunday) */
  readonly 'S-108': number
  /** S-128, the number the row states */
  readonly 'S-128': number
} = {
  'S-106': [2, 3, 4, 5, 6],
  'S-107': [],
  'S-108': 1,
  'S-128': 480,
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

// `scheduleViolations` is at the FOOT of this file, under "document
// invariants". It is last because it is the one member that reads every other
// one -- the days, the calendar and the resolution FR-054 states -- and putting
// it there keeps the roster it walks next to nothing it has to be read against.

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
  // ⭐ S-106 itself, in the dayType numbering AT-73 states, generated from the
  // manuscript. This line used to read `dayType >= 2 && dayType <= 6` with a
  // comment explaining the mapping -- and that comment was the ONLY place the
  // mapping was written down anywhere: the specification did not state it
  // until CR-180. Changing 表 T-209 now changes this (CR-180).
  dayWorking: DEFAULT_CALENDAR_VALUES['S-106'].includes(dayType),
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

// ------------------------------------------------- document invariants ----
//
// Table T-220 is the whole census of the document's invariants, and Chapter 6.1
// requires `scheduleViolations` to be DRIVEN by that table (MUST) rather than to
// write its rows out one condition at a time (MUST NOT). So the table is
// transcribed below as fixed data -- one entry per row, carrying that row's ID
// and its kind column -- and `scheduleViolations` is a single walk over the
// roster. 1.9 asks for the same shape of a test that verifies a requirement
// pointing at a table: one walk over every row, never one branch per row.
//
// ⚠️ The table holds only the conditions the generated schema CANNOT hold.
// Chapter 6.1 keeps every single-column condition out of it -- type,
// nullability, string length, numeric range and a spelled enumeration are
// already forced by `_source/grs-document.schema.json` -- so none is repeated
// here either.
//
// ⛔ Three of the seventeen rows cannot be answered yet. Each carries its own ⛔
// below naming exactly what is missing. None is guessed at and none is dropped:
// they stay in the roster, so the walk still covers the whole table and a reader
// counting the entries against T-220 finds the same census.

/**
 * The kind column of table T-220, romanised.
 *
 * ⚠️ The table spells these five in Japanese and code is ASCII (rule 03
 * section 5), so the spellings below are this file's. The table stays the
 * source: every entry of the roster names its row ID beside its kind, so the
 * two can be lined up without reading any of the code between them.
 */
export type InvariantKind =
  | 'unique'
  | 'reference'
  | 'structure'
  | 'combination'
  | 'range'

/**
 * One place a document breaks one invariant.
 *
 * ⚠️ The same three fields `DocumentViolation` (PI-34) carries, plus the kind,
 * so that a caller holding both lists reads them the same way. `at` points into
 * the DOCUMENT and not into either group: IV-3, IV-13 and IV-14 can all break
 * inside `/documentSettings`, which a pointer rooted at the schedule could not
 * say.
 */
export interface ScheduleViolation {
  /** The row of table T-220 that is broken, e.g. `IV-1`. */
  readonly row: string
  /** That row's kind column. */
  readonly kind: InvariantKind
  /** Where it is broken, as a JSON pointer into the document. */
  readonly at: string
  readonly what: string
}

/**
 * What every invariant is judged against.
 *
 * ⚠️ The two groups arrive separately rather than as one `Document`. DR-1 of
 * table T-052 binds the three groups and `Document` (PI-34) is what holds them
 * -- but that component already reaches THIS one, so taking a `Document` here
 * would close a cycle inside the layer, which LR-3 of table T-061 forbids.
 *
 * ⚠️ The presentation group is needed all the same: IV-3, IV-5, IV-13, IV-14
 * and IV-16 each state a settings row among what they are judged by.
 */
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

/**
 * Where one invariant is broken, before the row it belongs to is stamped on.
 *
 * ⚠️ A finder does NOT name its own row. The roster entry already carries it
 * and the walk copies it onto every breach, so an entry cannot disagree with
 * itself about which row of table T-220 it is answering for.
 */
interface Breach {
  readonly at: string
  readonly what: string
}

/** One allocation for every invariant that finds nothing, which is the usual case. */
const NONE: readonly Breach[] = []

/** One row of table T-220. */
interface Invariant {
  /** The row ID, the first column of the table. */
  readonly row: string
  /** The kind column. */
  readonly kind: InvariantKind
  /** Every place this row is broken. */
  readonly find: (subject: DocumentUnderTest) => readonly Breach[]
}

/** P-19 of table T-102 -- the one palette value the specification spells. */
const TRANSPARENT = 'transparent'

/** The two ends of table T-214, once each has been read as a day. */
interface AcceptedDays {
  /** S-119. */
  readonly min: CalendarDay
  /** S-120. */
  readonly max: CalendarDay
}

/** How deep each row of a self-nesting entity sits, and the rings that stop one. */
interface Nesting<TKey> {
  /** Every row whose depth is settled. A row whose parent is absent is at 1. */
  readonly depthByKey: ReadonlyMap<TKey, number>
  /** One entry per ring, holding the keys that close it. */
  readonly rings: readonly (readonly TKey[])[]
}

/**
 * The depth of every row under its own parent column, and the rings that stop a
 * depth being settled. Both come out of one climb because neither can be had
 * without the other: a walk that did not watch for a ring would never return.
 *
 * ⚠️ Written once over any key type because IV-4 and IV-5 climb the same shape
 * -- `Task` by `wbsParentUid`, `TaskGroup` by `parentId` -- and S-115 and S-125
 * both start their count at 1 for a row whose parent is absent. Two copies of
 * this walk would be two chances to count the root differently.
 *
 * ⭐ Indexed once with a `Map` (R5 / NFR-013). A search inside the climb would
 * make this quadratic over an array S-114 still lets reach six figures. Each row
 * is climbed past once and answered from the memo after that.
 *
 * ⚠️ A parent naming no row ends the climb as though the row were a root. That
 * dangling reference is IV-2's to report, and inventing a second answer for it
 * here would put one rule in two places.
 *
 * @purity pure
 */
function nestingOf<TKey, TRow>(
  rows: readonly TRow[],
  keyOf: (row: TRow) => TKey,
  parentOf: (row: TRow) => TKey | null,
): Nesting<TKey> {
  const byKey = new Map<TKey, TRow>()
  for (const row of rows) byKey.set(keyOf(row), row)

  const depthByKey = new Map<TKey, number>()
  /** Keys whose depth cannot be settled: on a ring, or hanging under one. */
  const unsettled = new Set<TKey>()
  const rings: (readonly TKey[])[] = []

  for (const row of rows) {
    const from = keyOf(row)
    if (depthByKey.has(from) || unsettled.has(from)) continue

    // Deepest first: `chain[0]` is where this climb started.
    const chain: TKey[] = []
    const positionOnChain = new Map<TKey, number>()
    let base = 0
    let ring: readonly TKey[] | null = null
    let underRing = false
    let at: TRow | undefined = row

    while (at !== undefined) {
      const key = keyOf(at)
      if (unsettled.has(key)) {
        underRing = true
        break
      }
      const repeated = positionOnChain.get(key)
      if (repeated !== undefined) {
        ring = chain.slice(repeated)
        break
      }
      const settled = depthByKey.get(key)
      if (settled !== undefined) {
        base = settled
        break
      }
      positionOnChain.set(key, chain.length)
      chain.push(key)
      const parent = parentOf(at)
      at = parent === null ? undefined : byKey.get(parent)
    }

    if (ring !== null) {
      rings.push(ring)
      for (const key of chain) unsettled.add(key)
    } else if (underRing) {
      // The ring itself is reported where it was found. A row hanging under it
      // closes no second ring and still has no depth to settle.
      for (const key of chain) unsettled.add(key)
    } else {
      // `base` is where the climb stopped: 0 for a root, otherwise the depth
      // already settled for that ancestor.
      let depth = base + chain.length
      for (const key of chain) {
        depthByKey.set(key, depth)
        depth -= 1
      }
    }
  }

  return { depthByKey, rings }
}

/**
 * Every date column of one row that IV-14 turns down.
 *
 * ⚠️ It ANSWERS with the breaches rather than writing into an array it was
 * handed. Rewriting an argument is an effect, so a helper that did it could not
 * call itself pure below and be telling the truth -- and the tag has to be
 * true, not merely present. The array is built only once there is something to
 * put in it, so a row entirely inside the range costs nothing over the walk it
 * already needs.
 *
 * @purity pure
 */
function dateBreaches<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays | null,
): readonly Breach[] {
  let found: Breach[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    // `null` is every one of these columns' own value for absence and carries
    // no day to judge.
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) {
      // ⚠️ The empty string is HERE and not waved through as absence. IV-14's
      // own remark puts it on the unreadable side, because a column that admits
      // absence spells it `null`.
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${JSON.stringify(value)} names no day` })
      continue
    }
    // Nothing to measure against when the two ends of table T-214 could not be
    // read. That is said once by the entry below, not once per row here.
    if (accepted === null) continue
    if (compareDays(day, accepted.min) < 0) {
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${value} is before importMinDate` })
    } else if (compareDays(day, accepted.max) > 0) {
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${value} is after importMaxDate` })
    }
  }
  return found ?? NONE
}

/**
 * Table T-220, as fixed data. One entry per row, in the order the table prints
 * them -- which is why IV-17 stands between IV-7 and IV-8.
 *
 * ⛔ An entry that answers nothing yet says why in its own comment. It is left
 * in place rather than removed, so that the roster stays as long as the table
 * and whoever closes the gap has the row waiting for them.
 */
const INVARIANTS: readonly Invariant[] = [
  {
    row: 'IV-1',
    kind: 'unique',
    // ⛔ NOT ANSWERABLE YET. The row is judged against the columns whose key
    // column in table T-058 marks them a primary key, and nothing in this tree
    // holds that roster. `DATE_COLUMNS` above exists precisely because erd.json
    // marks the date columns and tools/generate_entity_types.py emits the marks;
    // the key column sits in the same manuscript, on the same columns, and is
    // not emitted. Writing the roster out by hand here would re-commit F-3 -- a
    // copy that goes stale the moment a column is added, with nothing to say so
    // -- and T-220's own closing remark refuses to list the columns for that
    // same reason. What is missing is the generated roster, not a decision.
    // Reported.
    find: () => NONE,
  },
  {
    row: 'IV-2',
    kind: 'reference',
    // ⛔ NOT ANSWERABLE YET, and it needs one thing more than IV-1 does. Besides
    // the foreign-key columns -- the same ungenerated key column -- it is judged
    // against the target table T-057 states for each of them, and erd.json's
    // relations carry two entity names and a prose label only. Neither the
    // column that holds the reference nor the column it lands on is in machine
    // form anywhere, so no roster can be generated from the manuscript as it
    // stands. Reading the target off the column's spelling would be a guess.
    // Reported.
    find: () => NONE,
  },
  {
    row: 'IV-3',
    kind: 'reference',
    /**
     * ⚠️ Only that the pinned row EXISTS. Where a pinned row is drawn is
     * OP-10's, which the row says in as many words.
     *
     * @purity pure
     */
    find: ({ schedule, settings }) => {
      const rows = new Set(schedule.taskGroups.map((one) => one.id))
      const found: Breach[] = []
      for (const [index, id] of settings.pinnedGroupIds.entries()) {
        if (!rows.has(id)) {
          found.push({
            at: `/documentSettings/pinnedGroupIds/${index}`,
            what: `no TaskGroup is here with id ${id}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-4',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      const nesting = nestingOf(
        schedule.tasks,
        (task) => task.uid,
        (task) => task.wbsParentUid,
      )
      return nesting.rings.map((ring) => ({
        at: '/schedule/tasks',
        what: `wbsParentUid closes a ring over Task uids ${ring.join(', ')}`,
      }))
    },
  },
  {
    row: 'IV-5',
    kind: 'structure',
    /**
     * ⚠️ The WBS is outside this one, which the row says: its depth has no
     * bound at all, and S-115 bounds it only at the moment an import is judged.
     *
     * ⛔ A ring in `parentId` is reported by NOTHING. IV-4 names `wbsParentUid`
     * alone, HM-4 forbids the move that would close one on the WBS alone, and no
     * row of table T-220 covers this second tree -- so a row sitting on such a
     * ring has no settled depth, is not past the bound, and goes unmentioned.
     * Not reported as a breach of THIS row, which states a depth and not a
     * shape. Reported.
     *
     * @purity pure
     */
    find: ({ schedule, settings }) => {
      const nesting = nestingOf(
        schedule.taskGroups,
        (group) => group.id,
        (group) => group.parentId,
      )
      const found: Breach[] = []
      for (const [index, group] of schedule.taskGroups.entries()) {
        const depth = nesting.depthByKey.get(group.id)
        if (depth !== undefined && depth > settings.maxGroupDepth) {
          found.push({
            at: `/schedule/taskGroups/${index}`,
            what: `row ${group.id} sits at depth ${depth}, past maxGroupDepth `
              + `(${settings.maxGroupDepth})`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-6',
    kind: 'structure',
    /**
     * ⚠️ Both ways of missing "exactly one" are reported, and the count is said
     * out loud. Two rows naming the same `Task` is IV-1's business as well --
     * the key column makes `TaskGroupMember.taskUid` a primary key -- but one
     * cannot stand in for the other while IV-1 answers nothing.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const namedBy = new Map<number, number>()
      for (const member of schedule.taskGroupMembers) {
        namedBy.set(member.taskUid, (namedBy.get(member.taskUid) ?? 0) + 1)
      }
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const count = namedBy.get(task.uid) ?? 0
        if (count !== 1) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} is named by ${count} TaskGroupMember rows`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-7',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      if (schedule.calendars.length > 0) return NONE
      return [{ at: '/schedule/calendars', what: 'the document holds no Calendar' }]
    },
  },
  {
    row: 'IV-17',
    kind: 'structure',
    /**
     * ⚠️ Only the calendar FR-054 resolves, which the row says: a calendar the
     * document carries but never counts by may work no day at all.
     * `workingCalendarOf` IS that resolution, so asking it is what keeps this
     * row and FR-054 from disagreeing about which calendar is meant.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const within = workingCalendarOf(schedule)
      if (within.weekDays.some((one) => one.dayWorking === true)) return NONE
      return [{
        at: '/schedule/calendars',
        what: `the resolved calendar ${within.calendar.uid} works no weekday`,
      }]
    },
  },
  {
    row: 'IV-8',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, group] of schedule.taskGroups.entries()) {
        if (group.label === null && group.derivedFromTaskUid === null) {
          found.push({
            at: `/schedule/taskGroups/${index}`,
            what: `row ${group.id} has neither a label nor a Task to take its name from`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-9',
    kind: 'combination',
    /**
     * ⚠️ `null` is not transparent. P-19 keeps the two apart -- one is a chosen
     * value, the other is nothing chosen -- so a row holding `null` in both
     * columns does not break this.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, visual] of schedule.taskVisuals.entries()) {
        if (visual.fillColor === TRANSPARENT && visual.strokeColor === TRANSPARENT) {
          found.push({
            at: `/schedule/taskVisuals/${index}`,
            what: `Task uid ${visual.taskUid} is drawn with nothing at all`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-10',
    kind: 'combination',
    /**
     * ⚠️ Both ends have to be readable days before there is an order to check.
     * A column holding a string that names no day is IV-14's, and a `Task`
     * missing one end is FR-012's at the moment an input is judged.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start === null || finish === null) continue
        if (compareDays(finish, start) < 0) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} finishes before it starts`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-11',
    kind: 'combination',
    /**
     * ⚠️ Either column is enough to require the third. AT-40 and AT-41 keep
     * `null` and `0` apart, so a fade of zero days is still a fade somebody put
     * there, and it still needs an end to be measured from.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const faded = task.fadeInDays !== null || task.fadeOutDays !== null
        if (faded && task.finish === null) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} fades but has no finish`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-12',
    kind: 'combination',
    /**
     * ⚠️ The span is the DIFFERENCE between the two days, never the count of
     * days with both ends included. FR-012 states which of the two it is and
     * what breaks when they are swapped, so a `Task` whose start and finish name
     * the same day has a span of zero and may carry no fade at all.
     *
     * ⚠️ A missing or unreadable end is passed over rather than counted as a
     * span of zero. IV-11 and IV-14 report those, and reading an absent end as
     * zero would report one document twice under a row that is about the sum,
     * not about the ends.
     *
     * ⚠️ A `Task` carrying NEITHER column is passed over as well, and not read
     * as a sum of zero. A span can come out negative -- that is IV-10's to
     * report -- and a sum of zero is over a negative span, so counting one here
     * would put every task IV-10 already names under this row too.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        if (task.fadeInDays === null && task.fadeOutDays === null) continue
        const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0)
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start === null || finish === null) continue
        const span = serial(finish) - serial(start)
        if (fade > span) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} fades ${fade} days over a span of ${span}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-13',
    kind: 'combination',
    /**
     * S-65 spells the two columns the dual cursor holds.
     *
     * ⛔ They are read off an `object` instead of through the type, because the
     * generated `DocumentSettings.dualCursor` is `object | null`: the type comes
     * from the generated schema and the two members S-65 states did not survive
     * the crossing. Reported -- once they are in the type this reads them
     * straight and the narrowing goes.
     *
     * @purity pure
     */
    find: ({ settings }) => {
      const cursor: unknown = settings.dualCursor
      if (cursor === null || typeof cursor !== 'object') return NONE
      const held = cursor as { readonly date1?: unknown; readonly date2?: unknown }
      const found: Breach[] = []
      for (const column of ['date1', 'date2'] as const) {
        if (held[column] === null || held[column] === undefined) {
          found.push({
            at: `/documentSettings/dualCursor/${column}`,
            what: 'is absent while the dual cursor is set',
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-14',
    kind: 'range',
    /**
     * ⭐ Driven by `DATE_COLUMNS`, which is generated from the same marks in the
     * manuscript that print the type column. The row reaches its columns by
     * pointing at that column instead of naming them, and this reaches them the
     * same way -- so a column added to the manuscript is judged here without
     * anybody remembering to add it.
     *
     * ⚠️ What is walked below is the ENTITIES, not their columns. The six arrays
     * are where the document puts its rows; which of their columns hold a day is
     * `DATE_COLUMNS`'s answer, not this file's.
     *
     * ⚠️ The two ends come from the settings in force, never from a constant
     * here. They are per-document values (S-119, S-120), and judging by a copy
     * would let this row and the import disagree about one range.
     *
     * @purity pure
     */
    find: ({ schedule, settings }) => {
      const min = dayOf(settings.importMinDate)
      const max = dayOf(settings.importMaxDate)
      const accepted: AcceptedDays | null =
        min !== null && max !== null ? { min, max } : null

      const found: Breach[] = []
      // Said once, not once per row: a range that cannot be read leaves every
      // column below judged for BEING a day and none of them for being inside it.
      if (min === null) {
        found.push({
          at: '/documentSettings/importMinDate',
          what: `${JSON.stringify(settings.importMinDate)} names no day, `
            + 'so the accepted range cannot be applied',
        })
      }
      if (max === null) {
        found.push({
          at: '/documentSettings/importMaxDate',
          what: `${JSON.stringify(settings.importMaxDate)} names no day, `
            + 'so the accepted range cannot be applied',
        })
      }

      found.push(...dateBreaches(
        schedule.project, DATE_COLUMNS.Project, '/schedule/project', accepted))
      for (const [index, task] of schedule.tasks.entries()) {
        found.push(...dateBreaches(
          task, DATE_COLUMNS.Task, `/schedule/tasks/${index}`, accepted))
      }
      for (const [calendarIndex, calendar] of schedule.calendars.entries()) {
        for (const [index, exception] of calendar.exceptions.entries()) {
          found.push(...dateBreaches(
            exception,
            DATE_COLUMNS.Exception,
            `/schedule/calendars/${calendarIndex}/exceptions/${index}`,
            accepted,
          ))
        }
      }
      for (const [index, box] of schedule.commentBoxes.entries()) {
        found.push(...dateBreaches(
          box, DATE_COLUMNS.CommentBox, `/schedule/commentBoxes/${index}`, accepted))
      }
      for (const [index, box] of schedule.highlightBoxes.entries()) {
        found.push(...dateBreaches(
          box, DATE_COLUMNS.HighlightBox, `/schedule/highlightBoxes/${index}`, accepted))
      }
      for (const [index, baseline] of schedule.baselineTasks.entries()) {
        found.push(...dateBreaches(
          baseline, DATE_COLUMNS.BaselineTask, `/schedule/baselineTasks/${index}`, accepted))
      }
      return found
    },
  },
  {
    row: 'IV-15',
    kind: 'range',
    /** @purity pure */
    find: ({ schedule }) => {
      const ceiling = schedule.project.importSeq
      const found: Breach[] = []
      for (const [index, origin] of schedule.taskOrigins.entries()) {
        if (origin.lastSeenImportSeq > ceiling) {
          found.push({
            at: `/schedule/taskOrigins/${index}`,
            what: `Task uid ${origin.taskUid} was last seen at import `
              + `${origin.lastSeenImportSeq}, past the project's ${ceiling}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-16',
    kind: 'range',
    // ⛔ NOT ANSWERABLE YET. The row is judged against the lower- and upper-bound
    // columns of the settings manuscript, but only where such a column names
    // ANOTHER settings row instead of a number. `SETTINGS_BOUNDS` (PI-2) is the
    // generated roster of those columns and it carries the numeric ones alone --
    // `clampedSettings` says as much where it declines the bounds that hold
    // between two keys. So the expressions live in the manuscript and reach no
    // generated artifact. Two of the operands they use are not numbers a reader
    // can supply either: one bound is written as an epsilon that no row gives a
    // value to, and another names a screen dimension, which this row puts
    // outside its own scope in as many words. What is missing is the generated
    // roster plus a value for the epsilon, neither of which is settled here.
    // Reported.
    find: () => NONE,
  },
]

/**
 * Every place the document breaks an invariant of table T-220, in the order the
 * table lists its rows.
 *
 * ⚠️ It ANSWERS, and refuses nothing: a violation is a value, never a throw
 * (AG-8 of table T-035, R7.10). Whether one stops a load, a save or an edit is
 * the caller's to decide, and the three moments decide it differently.
 *
 * ⚠️ It is NOT the import check. `validateImportedDocument` (PI-13) judges
 * untrusted input while the current document is still standing (OP-5), and
 * three of its refusals restate a condition this holds too. The rule is one;
 * the moment is two.
 *
 * ⚠️ An empty answer does NOT mean the document is sound. Three rows of the
 * table answer nothing yet, and each says above what it is waiting for.
 *
 * @purity pure
 */
export function scheduleViolations(
  schedule: Schedule,
  settings: DocumentSettings,
): readonly ScheduleViolation[] {
  const subject: DocumentUnderTest = { schedule, settings }
  const found: ScheduleViolation[] = []
  for (const invariant of INVARIANTS) {
    for (const breach of invariant.find(subject)) {
      found.push({ row: invariant.row, kind: invariant.kind, at: breach.at, what: breach.what })
    }
  }
  return found
}

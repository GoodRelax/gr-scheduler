// Builds the tooltips shown against this frame's parts.
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  calendarSpanOf,
  compareDays,
  dayOf,
  delayWorkingDays,
  isDelayed,
  serial,
  taskByUid,
  workingCalendarOf,
  type BaselineTask,
  type CalendarDay,
  type Schedule,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  dateAtX,
  labelledAssigneeUidOf,
  planDatesSpanYears,
  planDateText,
  timeAxisOf,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  DisplayLanguage,
  DualCursorReadout,
  GuideCursorLabel,
  ScreenView,
  ScreenViewReadings,
  IconId,
  Tooltip,
} from './screen-renderer'
import { displayLanguageOf, rulerWeekdayWords } from './screen-renderer'
import displayWords from './display-words.json'
import helpRoster from './help-roster.json'

const HINTS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const ASSIGNMENTS_BY_ROW = new Map(displayWords.assignments.map((entry) => [entry.rowId, entry]))
const DEADLINE_ROW = 'PR-10'
const DEADLINE_WORDS = displayWords.properties.find((entry) => entry.rowId === DEADLINE_ROW)?.label
const LINE_BREAK = '\n'

const FASTER_SCROLL_ASSIGNMENT_TASK_GROUPS: Readonly<Record<'horizontal' | 'vertical', string>> = {
  horizontal: 'MK-5',
  vertical: 'MK-1',
}

const ICON_TABLE = 'T-109'

// WHY: EZ-2 takes the assignment from the same help item FR-036 lists, so the pair is built once.
const HELP_ITEM_BY_ICON = new Map(
  helpRoster.entries
    .filter((entry) => entry.kind === 'item' && entry.table === ICON_TABLE)
    .map((entry) => [entry.row, entry] as const),
)

const PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

const ASSIGNMENT_SEPARATOR = ' ／ '

// see EZ-2, FR-036
/** @purity pure */
function entryAssignment(icon: IconId, language: DisplayLanguage): string | null {
  const found = HELP_ITEM_BY_ICON.get(icon)
  if (found === undefined) return null
  const word = found.press === null ? undefined : PRESS_BY_ROW.get(found.press)?.press[language]
  const press = word === undefined || word === '' ? null : word
  const written = [found.keys, press].filter((one): one is string => one !== null).join(ASSIGNMENT_SEPARATOR)
  return written === '' ? null : written
}

/** @purity pure */
export function iconHint(icon: IconId, language: DisplayLanguage): string {
  const held = HINTS_BY_ROW.get(icon)
  if (held === undefined) return icon
  if (held.hint[language] !== '') return held.hint[language]
  return held.label[language] === '' ? icon : held.label[language]
}

// see FR-038
/** @purity pure */
export function iconLabel(icon: IconId, language: DisplayLanguage): string {
  return HINTS_BY_ROW.get(icon)?.label[language] ?? ''
}

const DAYS_PER_WEEK = 7

const WEEKDAY_OF_SERIAL_ZERO = 4

// see TL-11, CU-3
/** @purity pure */
function weekdayWordOf(day: CalendarDay, language: DisplayLanguage): string {
  const weekday = (((serial(day) + WEEKDAY_OF_SERIAL_ZERO) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  return rulerWeekdayWords(language)[weekday] ?? ''
}

// see TL-11, CU-3
/** @purity pure */
function withWeekday(written: string, day: CalendarDay, language: DisplayLanguage): string {
  return `${written} (${weekdayWordOf(day, language)})`
}

const CURSOR_YEAR_DIGITS = 4
const CURSOR_MONTH_DAY_DIGITS = 2

// see CU-3, DC-3
/** @purity pure */
export function cursorDateText(day: CalendarDay, language: DisplayLanguage): string {
  const padded = (value: number, width: number): string => String(value).padStart(width, '0')
  const year = padded(day.year, CURSOR_YEAR_DIGITS)
  const month = padded(day.month, CURSOR_MONTH_DAY_DIGITS)
  const date = padded(day.day, CURSOR_MONTH_DAY_DIGITS)
  return withWeekday(`${year}/${month}/${date}`, day, language)
}

// see TL-10, ND-4, ND-5
/** @purity pure */
function hintDayText(day: CalendarDay, isYearWritten: boolean, language: DisplayLanguage): string {
  return withWeekday(planDateText(day, isYearWritten), day, language)
}

interface HintContext {
  readonly assigneeNames: readonly string[]
  readonly isYearWritten: boolean
}

const NO_HINT_CONTEXT: HintContext = { assigneeNames: [], isYearWritten: false }

// see TL-10, ND-5
/** @purity pure */
function isYearWrittenIn(schedule: Schedule): boolean {
  return planDatesSpanYears(schedule, { day: dayOf })
}

// see TL-7, FR-059
// WHY: asked of labelledAssigneeUidOf one name at a time, so FR-059's filter and order stay in ScheduleLayout alone.
/** @purity pure */
function assigneeNamesOf(schedule: Schedule, taskUid: number): readonly string[] {
  const names: string[] = []
  let left = schedule
  for (let next = labelledAssigneeUidOf(left, taskUid); next !== null; next = labelledAssigneeUidOf(left, taskUid)) {
    const named = next
    names.push(left.resources.find((one) => one.uid === named)?.name ?? '')
    left = { ...left, resources: left.resources.filter((one) => one.uid !== named) }
  }
  return names
}

// see TL-7, TL-10
/** @purity pure */
function hintContextOf(schedule: Schedule | null, taskUid: number): HintContext {
  if (schedule === null) return NO_HINT_CONTEXT
  return { assigneeNames: assigneeNamesOf(schedule, taskUid), isYearWritten: isYearWrittenIn(schedule) }
}

const HINT_LINE_WORDS = new Map(displayWords.hintLines.map((entry) => [entry.rowId, entry.text]))
const PLAN_LINE_ROW = 'TL-5'
const ACTUAL_LINE_ROW = 'TL-6'
const HINT_WORD_SEPARATOR = ': '
const DAY_RANGE_SEPARATOR = ' -'
const DEADLINE_NAME_SEPARATOR = ' : '
const PERCENT_SIGN = '%'

const ASSIGNEE_LINE_ROW = 'DT-2'
const PROGRESS_LINE_ROW = 'DT-3'
const NAME_SEPARATOR = ', '
const NAME_CUT_MARK = '…'
const NAME_CUT_GAP = ' '

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_TASK_HINT_ASSIGNEE_CAP: {
  readonly 'S-513': number
} = {
  'S-513': 84,
}
// </generated>

/** @purity pure */
function hintLineWord(row: string, language: DisplayLanguage): string {
  return HINT_LINE_WORDS.get(row)?.[language] ?? row
}

// WHY: TL-7 and TL-8 take the delay report's column words (DT-2, DT-3) and hold none of their own, as TL-9 takes PR-10's.
/** @purity pure */
function columnWord(row: string, language: DisplayLanguage): string {
  return displayWords.delayReportColumns.find((entry) => entry.rowId === row)?.text[language] ?? row
}

/** @purity pure */
function characterCount(text: string): number {
  return Array.from(text).length
}

// see TL-7, S-513
/** @purity pure */
function namesWithin(names: readonly string[], cap: number): string {
  const whole = names.join(NAME_SEPARATOR)
  if (characterCount(whole) <= cap) return whole
  const tail = `${NAME_CUT_GAP}${NAME_CUT_MARK}`
  let kept = ''
  for (const name of names) {
    const next = kept === '' ? name : `${kept}${NAME_SEPARATOR}${name}`
    if (characterCount(next) + characterCount(tail) > cap) break
    kept = next
  }
  if (kept !== '') return `${kept}${tail}`
  const head = Array.from(names[0] ?? '').slice(0, cap - characterCount(NAME_CUT_MARK))
  return `${head.join('')}${NAME_CUT_MARK}`
}

// see TL-7, FR-059
/** @purity pure */
function assigneeLine(names: readonly string[], language: DisplayLanguage): string | null {
  if (names.length === 0) return null
  const written = namesWithin(names, NOT_STORED_TASK_HINT_ASSIGNEE_CAP['S-513'])
  return `${columnWord(ASSIGNEE_LINE_ROW, language)}${HINT_WORD_SEPARATOR}${written}`
}

/** @purity pure */
function deadlineWord(language: DisplayLanguage): string {
  return DEADLINE_WORDS?.[language] ?? DEADLINE_ROW
}

// see TL-5, TL-6, ND-1
/** @purity pure */
function daysLine(
  row: string,
  first: CalendarDay,
  last: CalendarDay | null,
  isMilestone: boolean,
  context: HintContext,
  language: DisplayLanguage,
): string {
  const word = `${hintLineWord(row, language)}${HINT_WORD_SEPARATOR}`
  const firstText = hintDayText(first, context.isYearWritten, language)
  if (isMilestone) return `${word}${firstText}`
  const lastText = last === null ? '' : ` ${hintDayText(last, context.isYearWritten, language)}`
  return `${word}${firstText}${DAY_RANGE_SEPARATOR}${lastText}`
}

// see TL-5, ND-2, ND-3
/** @purity pure */
function planLine(
  planned: Pick<Task, 'start' | 'finish' | 'milestone'>,
  context: HintContext,
  language: DisplayLanguage,
): string | null {
  const start = dayOf(planned.start)
  const finish = dayOf(planned.finish)
  const isMilestone = planned.milestone === true
  if (start === null || (finish === null && !isMilestone)) return null
  return daysLine(PLAN_LINE_ROW, start, finish, isMilestone, context, language)
}

// see TL-6, AT-34
// TRAP: an unfinished actual stops at the dash; never write stop (FR-011) as its last day (TL-6 MUST NOT).
/** @purity pure */
function actualLine(task: Task, context: HintContext, language: DisplayLanguage): string | null {
  const start = dayOf(task.actualStart)
  if (start === null) return null
  return daysLine(ACTUAL_LINE_ROW, start, dayOf(task.actualFinish), task.milestone === true, context, language)
}

// see TL-8, FR-090
/** @purity pure */
function percentLine(task: Task, language: DisplayLanguage): string | null {
  if (task.percentComplete === null || task.actualStart === null) return null
  return `${columnWord(PROGRESS_LINE_ROW, language)}${HINT_WORD_SEPARATOR}${task.percentComplete}${PERCENT_SIGN}`
}

// see TL-9, TL-2
/** @purity pure */
function deadlineDayText(task: Task, context: HintContext, language: DisplayLanguage): string | null {
  const day = dayOf(task.deadline)
  if (day === null) return null
  return `${deadlineWord(language)} ${hintDayText(day, context.isYearWritten, language)}`
}

const LATE_REASON_PART = 'late'
const LATE_WORDS = displayWords.delayReportReasons.find((entry) => entry.part === LATE_REASON_PART)?.text
const DAYS_SLOT = '{days}'

// see TL-12, FR-047, DX-10, DT-7
// WHY: DX-10's count in DG-4's reason words, so the tip and the report never differ on one delay.
/** @purity pure */
function lateLine(task: Task, schedule: Schedule, language: DisplayLanguage): string | null {
  // TRAP: read through ?. and ??: views built from a partial schedule carry no project or no statusDate (FR-046: no line).
  const statusDate = dayOf(schedule.project?.statusDate ?? null)
  if (!isDelayed(task, statusDate)) return null
  const days = delayWorkingDays(workingCalendarOf(schedule), task, statusDate)
  return (LATE_WORDS?.[language] ?? LATE_REASON_PART).replace(DAYS_SLOT, String(days))
}

// see TL-1
/** @purity pure */
function taskHint(task: Task, context: HintContext, language: DisplayLanguage, late: string | null): string {
  const name = task.name ?? ''
  const lines = [
    name === '' ? null : name,
    planLine(task, context, language),
    actualLine(task, context, language),
    assigneeLine(context.assigneeNames, language),
    percentLine(task, language),
    deadlineDayText(task, context, language),
    late,
  ]
  return lines.filter((one): one is string => one !== null).join(LINE_BREAK)
}

// see TL-2
/** @purity pure */
export function deadlineHint(task: Task, schedule: Schedule | null, language: DisplayLanguage): string | null {
  const context = hintContextOf(schedule, task.uid)
  const marked = deadlineDayText(task, context, language)
  if (marked === null) return null
  const name = task.name ?? ''
  return name === '' ? marked : `${marked}${DEADLINE_NAME_SEPARATOR}${name}`
}

// see TL-3
/** @purity pure */
export function baselineHint(baseline: BaselineTask, schedule: Schedule | null, language: DisplayLanguage): string {
  const context = hintContextOf(schedule, baseline.uid)
  const name = baseline.name ?? ''
  const lines = [name === '' ? null : name, planLine(baseline, context, language)]
  return lines.filter((one): one is string => one !== null).join(LINE_BREAK)
}

/** @purity pure */
function assignmentText(row: string, language: DisplayLanguage): string {
  const word = ASSIGNMENTS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return row
  return word === '' ? row : word
}

// TRAP: a copy of screen-regions.ts's private rectHoldsPoint; change both together.
/** @purity pure */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

const HELP_ANCHOR = { surface: 'Help Modal' } as const

const SEARCH_PANEL_ANCHOR = { surface: 'Search Panel' } as const

/** @purity pure */
function surfaceAnchorOf(readings: ScreenViewReadings): { readonly surface?: string } {
  if (readings.isPointerOnHelp === true) return HELP_ANCHOR
  if (readings.isPointerOnSearchPanel === true) return SEARCH_PANEL_ANCHOR
  return {}
}

// see TV-5, FR-092
// WHY: IC-143 sits in the three table windows; the refusal is the one of the window under the pointer.
/** @purity pure */
function entryRefusalUnderPointer(shown: Omit<ScreenView, 'tooltips'>, readings: ScreenViewReadings, icon: IconId): string | null {
  const underPointer = readings.tableWindowUnderPointer ?? (readings.isPointerOnSearchPanel === true ? 'searchPanel' : null)
  if (underPointer === null) return null
  const view = underPointer === 'searchPanel' ? shown.searchPanel : underPointer === 'resourceList' ? shown.resourceList : shown.delayDiagnosticsReport
  return view?.entryRefusals?.find((one) => one.icon === icon)?.reason ?? null
}

// see EZ-2, IN-3, S-124, TV-5, FR-092
// WHY: the shell keeps the icon under the pointer while the pointer is on the icon's shown box,
// and hintTargetDwellMs counts from entering the icon, so a move inside neither restarts nor hides it.
/** @purity pure */
function iconTooltipOf(
  shown: Omit<ScreenView, 'tooltips'>,
  session: ScreenSession,
  readings: ScreenViewReadings,
): Tooltip | null {
  const icon = readings.iconUnderPointer
  const isDue = readings.hintTargetDwellMs >= SETTINGS_CONSTANTS.iconHintDelayMs
  if (icon === null || readings.pointer === null || !isDue) return null
  const isOnHelp = readings.isPointerOnHelp === true
  const help = isOnHelp ? (shown.helpModal ?? null) : null
  const hintLanguage = help === null ? displayLanguageOf(session) : help.helpLanguage
  const row = readings.iconRowUnderPointer ?? null
  const refusal = entryRefusalUnderPointer(shown, readings, icon)
  const hint = iconHint(icon, hintLanguage)
  return {
    anchor: { kind: 'icon', icon, ...surfaceAnchorOf(readings), ...(row === null ? {} : { groupId: row }) },
    text: refusal === null ? hint : `${hint}${LINE_BREAK}${refusal}`,
    assignment: entryAssignment(icon, hintLanguage),
  }
}

type HintHolder = NonNullable<ScreenViewReadings['hintHolderUnderPointer']>

// see TL-1, TL-2, TL-3, TL-12
/** @purity pure */
function hintTextOf(holder: HintHolder, schedule: Schedule, language: DisplayLanguage): string | null {
  if (holder.kind === 'baseline') {
    const baseline = schedule.baselineTasks.find((one) => one.uid === holder.taskUid)
    return baseline === undefined ? null : baselineHint(baseline, schedule, language)
  }
  const task = taskByUid(schedule, holder.taskUid)
  if (task === null) return null
  if (holder.kind === 'deadline') return deadlineHint(task, schedule, language)
  return taskHint(task, hintContextOf(schedule, task.uid), language, lateLine(task, schedule, language))
}

// see EZ-6, DC-3, S-439, T-023d
/** @purity pure */
function taskTooltipOf(
  session: ScreenSession,
  readings: ScreenViewReadings,
  schedule: Schedule,
): Tooltip | null {
  const pointer = readings.pointer
  const holder = readings.hintHolderUnderPointer ?? null
  const isDue = readings.pointerRestedMs >= SETTINGS_CONSTANTS.taskHintDelayMs
  if (pointer === null || holder === null || isDualCursorOn(session) || !isDue) return null
  const text = hintTextOf(holder, schedule, displayLanguageOf(session))
  if (text === null || text === '') return null
  return { anchor: holder, text, assignment: null, at: pointer }
}

// see EZ-2, EZ-6, FR-037, IN-3
/** @purity pure */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  _settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
  schedule: Schedule,
): readonly Tooltip[] {
  if (session.screen.tooltipDisplayState.kind === 'dismissed') return []

  const pointer = readings.pointer
  const language = displayLanguageOf(session)
  const tooltips: Tooltip[] = [iconTooltipOf(shown, session, readings), taskTooltipOf(session, readings, schedule)]
    .filter((one): one is Tooltip => one !== null)

  if (pointer === null) return tooltips

  for (const scrollbar of shown.frame.scrollbars) {
    if (!rectHoldsPoint(scrollbar.track, pointer.x, pointer.y)) continue
    tooltips.push({
      anchor: { kind: 'scrollbar', axis: scrollbar.axis },
      text: assignmentText(FASTER_SCROLL_ASSIGNMENT_TASK_GROUPS[scrollbar.axis], language),
      assignment: null,
    })
  }

  return tooltips
}

const READOUT_WORDS = new Map(displayWords.dualCursorReadout.map((one) => [one.line, one.text]))
const UNKNOWN = '—'

/** @purity pure */
function isDualCursorOn(session: ScreenSession): boolean {
  return session.screen.dualCursorModeState.kind !== 'off'
}

/** @purity pure */
function readoutWord(line: string, language: DisplayLanguage): string {
  return READOUT_WORDS.get(line)?.[language] ?? line
}

// see DC-3
/** @purity pure */
function readoutDate(day: CalendarDay | null, language: DisplayLanguage): string {
  return day === null ? UNKNOWN : cursorDateText(day, language)
}

// see DC-3
/** @purity pure */
function readoutSpan(a: CalendarDay | null, b: CalendarDay | null, language: DisplayLanguage): string {
  if (a === null || b === null) return UNKNOWN
  const span = calendarSpanOf(a, b)
  return readoutWord(span.dayCount === 1 ? 'oneDay' : 'days', language)
    .replace('{y}', String(span.years))
    .replace('{m}', String(span.months))
    .replace('{d}', String(span.days))
    .replace('{n}', String(span.dayCount))
}

// see DC-1, DC-2, DC-3
// WHY: the following side reads the day under the pointer, as its line stands there (dateAtX).
/** @purity pure */
function readoutDays(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  pointerX: number,
): { readonly date1: CalendarDay | null; readonly date2: CalendarDay | null } {
  const mode = session.screen.dualCursorModeState
  const following = mode.kind !== 'off' && mode.child.kind === 'placingDate2' ? 'date2' : 'date1'
  const followed = dateAtX(timeAxisOf(settings, regions), pointerX)
  const standing = session.screen.dualCursor
  return {
    date1: following === 'date1' ? followed : dayOf(standing?.date1 ?? null),
    date2: following === 'date2' ? followed : dayOf(standing?.date2 ?? null),
  }
}

// see DC-3
/** @purity pure */
function inDateOrder(
  a: CalendarDay | null,
  b: CalendarDay | null,
): { readonly left: CalendarDay | null; readonly right: CalendarDay | null } {
  if (a === null) return { left: b, right: null }
  if (b === null) return { left: a, right: null }
  return compareDays(a, b) <= 0 ? { left: a, right: b } : { left: b, right: a }
}

// see DC-3, IN-3, EZ-6
/** @purity pure */
export function dualCursorReadoutOf(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): DualCursorReadout | null {
  const pointer = readings.pointer
  if (pointer === null || !isDualCursorOn(session)) return null
  const region = regionAtPointer(regions, pointer.x, pointer.y)
  if (region !== 'taskGroupArea' && region !== 'timeRuler') return null
  const language = displayLanguageOf(session)
  const { date1, date2 } = readoutDays(regions, settings, session, pointer.x)
  const { left, right } = inDateOrder(date1, date2)
  return {
    lines: [
      readoutWord('left', language).replace('{date}', readoutDate(left, language)),
      readoutWord('right', language).replace('{date}', readoutDate(right, language)),
      readoutWord('span', language).replace('{span}', readoutSpan(left, right, language)),
    ],
    at: pointer,
  }
}

const GUIDE_CURSOR_NONE = 'none'

// see CU-3, DC-9
// WHY: tooltips is this frame's set: CU-3 stands down in the frame an EZ-6 tip (one placed at the point) is shown.
/** @purity pure */
export function guideCursorLabelOf(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
  tooltips: readonly Tooltip[],
): GuideCursorLabel | null {
  const pointer = readings.pointer
  if (pointer === null || session.screen.guideCursorMode === GUIDE_CURSOR_NONE) return null
  if (isDualCursorOn(session) || regionAtPointer(regions, pointer.x, pointer.y) !== 'taskGroupArea') return null
  if (tooltips.some((one) => one.at !== undefined)) return null
  const day = dateAtX(timeAxisOf(settings, regions), pointer.x)
  if (day === null) return null
  return { text: cursorDateText(day, displayLanguageOf(session)), at: pointer }
}

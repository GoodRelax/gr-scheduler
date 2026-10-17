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
  dayOf,
  dayOfInstant,
  instantOf,
  MINUTES_PER_CALENDAR_DAY,
  delayWorkingDays,
  isDelayed,
  serial,
  shownInstantReader,
  startSideOf,
  taskByUid,
  viewWallReader,
  workingCalendarOf,
  type BaselineTask,
  type CalendarDay,
  type DateTimeSide,
  type InstantOnSide,
  type Schedule,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  cursorInstantAtX,
  labeledAssigneeUidOf,
  lengthTextOf,
  clockTextOf,
  snappedInstantAtX,
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
  TooltipRow,
} from './screen-renderer'
import { displayLanguageOf, rulerWeekdayWords } from './screen-renderer'
import { taskStateWordOf } from './search-panel'
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

const KEY_NOTATION_WORDS = new Map(displayWords.keyNotation.map((entry) => [entry.part, entry.text]))

const CHORD_JOIN = '+'

const PLUS_KEY = '+'

// see FR-036, JDG-2248
/** @purity pure */
export function keysWords(keys: readonly (readonly string[])[] | null, language: DisplayLanguage): string | null {
  if (keys === null || keys.length === 0) return null
  const plusKey = KEY_NOTATION_WORDS.get('plusKey')?.[language] ?? PLUS_KEY
  return keys
    .map((chord) => chord.map((key) => (key === PLUS_KEY ? plusKey : key)).join(CHORD_JOIN))
    .join(KEY_NOTATION_WORDS.get('alternative')?.[language] ?? '')
}

// see EZ-2, FR-036
/** @purity pure */
export function assignmentWords(keys: string | null, press: string | null, language: DisplayLanguage): string | null {
  const written = [keys, press]
    .filter((one): one is string => one !== null)
    .join(KEY_NOTATION_WORDS.get('alternative')?.[language] ?? '')
  return written === '' ? null : written
}

// see EZ-2, FR-036
/** @purity pure */
function entryAssignment(icon: IconId, language: DisplayLanguage): string | null {
  const found = HELP_ITEM_BY_ICON.get(icon)
  if (found === undefined) return null
  const word = found.press === null ? undefined : PRESS_BY_ROW.get(found.press)?.press[language]
  const press = word === undefined || word === '' ? null : word
  return assignmentWords(keysWords(found.keys, language), press, language)
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
function weekdayText(day: CalendarDay, language: DisplayLanguage): string {
  return ` (${weekdayWordOf(day, language)})`
}

const CURSOR_YEAR_DIGITS = 4
const CURSOR_MONTH_DAY_DIGITS = 2
const CLOCK_TEXT_LENGTH = 'hh:mm'.length

// see CU-3, DC-3, TL-10
/** @purity pure */
function paddedDateText(day: CalendarDay): string {
  const padded = (value: number, width: number): string => String(value).padStart(width, '0')
  const year = padded(day.year, CURSOR_YEAR_DIGITS)
  const month = padded(day.month, CURSOR_MONTH_DAY_DIGITS)
  return `${year}/${month}/${padded(day.day, CURSOR_MONTH_DAY_DIGITS)}`
}

// see CU-3, DC-3
/** @purity pure */
export function cursorDateText(day: CalendarDay, language: DisplayLanguage): string {
  return `${paddedDateText(day)}${weekdayText(day, language)}`
}

interface HintContext {
  readonly assigneeNames: readonly string[]
  readonly shown: InstantOnSide | null
}

interface HintDay {
  readonly day: CalendarDay
  readonly text: string | null
  readonly side: DateTimeSide
}

// see TL-10, TL-13, TX-2
/** @purity pure */
function hintDayParts(at: HintDay, context: HintContext, language: DisplayLanguage): readonly string[] {
  const instant = context.shown === null ? null : context.shown(at.text, at.side)
  const day = instant === null ? at.day : dayOfInstant(instant)
  const dated = [paddedDateText(day), weekdayText(day, language)]
  return instant === null ? dated : [...dated, ` ${clockTextOf(instant).padStart(CLOCK_TEXT_LENGTH, '0')}`]
}

/** @purity pure */
function hintDayText(at: HintDay, context: HintContext, language: DisplayLanguage): string {
  return hintDayParts(at, context, language).join('')
}

/** @purity pure */
function hintDayOf(text: string | null, side: DateTimeSide): HintDay | null {
  const day = dayOf(text)
  return day === null ? null : { day, text, side }
}

// see TX-2, FR-156, S-574, S-576
type HintTimes = Pick<DocumentSettings, 'isTimeOfDayVisible' | 'viewTimeZone'>

const NO_HINT_TIMES: HintTimes = { isTimeOfDayVisible: false, viewTimeZone: null }

const NO_HINT_CONTEXT: HintContext = { assigneeNames: [], shown: null }

// see TL-7, FR-059
// WHY: asked of labeledAssigneeUidOf one name at a time, so FR-059's filter and order stay in ScheduleLayout alone.
/** @purity pure */
function assigneeNamesOf(schedule: Schedule, taskUid: number): readonly string[] {
  const names: string[] = []
  let left = schedule
  for (let next = labeledAssigneeUidOf(left, taskUid); next !== null; next = labeledAssigneeUidOf(left, taskUid)) {
    const named = next
    names.push(left.resources.find((one) => one.uid === named)?.name ?? '')
    left = { ...left, resources: left.resources.filter((one) => one.uid !== named) }
  }
  return names
}

// see TL-7, TL-10
/** @purity pure */
function hintContextOf(schedule: Schedule | null, taskUid: number, times: HintTimes = NO_HINT_TIMES): HintContext {
  if (schedule === null) return NO_HINT_CONTEXT
  const shown = times.isTimeOfDayVisible ? shownInstantReader(schedule, times.viewTimeZone) : null
  return { assigneeNames: assigneeNamesOf(schedule, taskUid), shown }
}

const HINT_LINE_WORDS = new Map(displayWords.hintLines.map((entry) => [entry.rowId, entry.text]))
const PLAN_LINE_ROW = 'TL-5'
const ACTUAL_LINE_ROW = 'TL-6'
const LABEL_MARK = ':'
const LABEL_GAP = ' '
const DAY_RANGE_SEPARATOR = ' -'
const DEADLINE_NAME_SEPARATOR = ' : '
const PERCENT_SIGN = '%'
const STATE_OPEN = ' ('
const STATE_CLOSE = ')'

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

/** @purity pure */
function labeledRow(word: string, value: string): TooltipRow {
  return { kind: 'labeled', label: `${word}${LABEL_MARK}`, value }
}

/** @purity pure */
function partedRow(word: string, parts: readonly string[]): TooltipRow {
  return { kind: 'labeled', label: `${word}${LABEL_MARK}`, value: parts.join(''), parts }
}

// see TL-13
// WHY: the tip's text keeps the one-line form "word: value"; the two columns are how it is drawn.
/** @purity pure */
function rowText(row: TooltipRow): string {
  return row.kind === 'labeled' ? `${row.label}${LABEL_GAP}${row.value}` : row.text
}

// see TL-7, FR-059
/** @purity pure */
function assigneeRow(names: readonly string[], language: DisplayLanguage): TooltipRow | null {
  if (names.length === 0) return null
  const written = namesWithin(names, NOT_STORED_TASK_HINT_ASSIGNEE_CAP['S-513'])
  return labeledRow(columnWord(ASSIGNEE_LINE_ROW, language), written)
}

/** @purity pure */
function deadlineWord(language: DisplayLanguage): string {
  return DEADLINE_WORDS?.[language] ?? DEADLINE_ROW
}

// see TL-5, TL-6, ND-1
/** @purity pure */
function daysRow(
  row: string,
  first: HintDay,
  last: HintDay | null,
  isMilestone: boolean,
  context: HintContext,
  language: DisplayLanguage,
): TooltipRow {
  const word = hintLineWord(row, language)
  const firstParts = hintDayParts(first, context, language)
  if (isMilestone) return partedRow(word, firstParts)
  const [lastDate, ...lastRest] = last === null ? [] : hintDayParts(last, context, language)
  const lastParts = lastDate === undefined ? [] : [` ${lastDate}`, ...lastRest]
  return partedRow(word, [...firstParts, DAY_RANGE_SEPARATOR, ...lastParts])
}

// see TL-5, ND-2, ND-3
/** @purity pure */
function planRow(
  planned: Pick<Task, 'start' | 'finish' | 'milestone'>,
  context: HintContext,
  language: DisplayLanguage,
): TooltipRow | null {
  const start = hintDayOf(planned.start, startSideOf(planned))
  const finish = hintDayOf(planned.finish, 'finish')
  const isMilestone = planned.milestone === true
  if (start === null || (finish === null && !isMilestone)) return null
  return daysRow(PLAN_LINE_ROW, start, finish, isMilestone, context, language)
}

// see TL-6, AT-34
// TRAP: an unfinished actual stops at the dash; never write stop (FR-011) as its last day (TL-6 MUST NOT).
/** @purity pure */
function actualRow(task: Task, context: HintContext, language: DisplayLanguage): TooltipRow | null {
  const start = hintDayOf(task.actualStart, startSideOf(task))
  if (start === null) return null
  return daysRow(ACTUAL_LINE_ROW, start, hintDayOf(task.actualFinish, 'finish'), task.milestone === true, context, language)
}

// see TL-8, FR-090, SQ-5
/** @purity pure */
function percentRow(task: Task, stateWord: string, language: DisplayLanguage): TooltipRow | null {
  if (task.percentComplete === null || task.actualStart === null) return null
  const value = `${task.percentComplete}${PERCENT_SIGN}${STATE_OPEN}${stateWord}${STATE_CLOSE}`
  return labeledRow(columnWord(PROGRESS_LINE_ROW, language), value)
}

const NOTE_LINE_BREAKS = /\r\n|\r/g

// see TL-14, AT-32
// WHY: S-621 and S-622 cut the note where it is drawn; the text keeps the whole note.
/** @purity pure */
function noteRow(task: Task): TooltipRow | null {
  const note = (task.notes ?? '').replace(NOTE_LINE_BREAKS, LINE_BREAK)
  return note.trim() === '' ? null : { kind: 'note', text: note }
}

// see TL-9, TL-2
/** @purity pure */
function deadlineDayText(task: Task, context: HintContext, language: DisplayLanguage): string | null {
  const at = hintDayOf(task.deadline, 'finish')
  if (at === null) return null
  return `${deadlineWord(language)} ${hintDayText(at, context, language)}`
}

// see TL-9, TL-13
/** @purity pure */
function deadlineRow(task: Task, context: HintContext, language: DisplayLanguage): TooltipRow | null {
  const at = hintDayOf(task.deadline, 'finish')
  return at === null ? null : partedRow(deadlineWord(language), hintDayParts(at, context, language))
}

const LATE_ROW = 'DG-4'
const LATE_WORDS = displayWords.delayReportStatuses.find((entry) => entry.rowId === LATE_ROW)?.text
const WORKING_DAYS_UNIT_PART = 'workingDaysUnit'
const WORKING_DAYS_WORDS = displayWords.propertyField.find((entry) => entry.part === WORKING_DAYS_UNIT_PART)?.text

// see TL-12, FR-047, DX-10, DG-4
// WHY: DX-10's count under DG-4's word, so the tip and the report never differ on one delay.
/** @purity pure */
function lateRow(task: Task, schedule: Schedule, statusDate: CalendarDay | null, language: DisplayLanguage): TooltipRow | null {
  if (!isDelayed(task, statusDate)) return null
  const days = delayWorkingDays(workingCalendarOf(schedule), task, statusDate)
  const unit = WORKING_DAYS_WORDS?.[language] ?? WORKING_DAYS_UNIT_PART
  return labeledRow(LATE_WORDS?.[language] ?? LATE_ROW, `${days} ${unit}`)
}

// see TL-1, TL-13, TL-14
/** @purity pure */
function taskHintRows(
  task: Task,
  context: HintContext,
  language: DisplayLanguage,
  facts: { readonly late: TooltipRow | null; readonly stateWord: string },
): readonly TooltipRow[] {
  const name = task.name ?? ''
  const rows: readonly (TooltipRow | null)[] = [
    name === '' ? null : { kind: 'whole', text: name },
    planRow(task, context, language),
    actualRow(task, context, language),
    assigneeRow(context.assigneeNames, language),
    percentRow(task, facts.stateWord, language),
    noteRow(task),
    deadlineRow(task, context, language),
    facts.late,
  ]
  return rows.filter((one): one is TooltipRow => one !== null)
}

// see TL-2
/** @purity pure */
export function deadlineHint(task: Task, schedule: Schedule | null, language: DisplayLanguage, times = NO_HINT_TIMES): string | null {
  const context = hintContextOf(schedule, task.uid, times)
  const marked = deadlineDayText(task, context, language)
  if (marked === null) return null
  const name = task.name ?? ''
  return name === '' ? marked : `${marked}${DEADLINE_NAME_SEPARATOR}${name}`
}

// see TL-3
/** @purity pure */
export function baselineHint(baseline: BaselineTask, schedule: Schedule | null, language: DisplayLanguage, times = NO_HINT_TIMES): string {
  const context = hintContextOf(schedule, baseline.uid, times)
  const name = baseline.name ?? ''
  const plan = planRow(baseline, context, language)
  const lines = [name === '' ? null : name, plan === null ? null : rowText(plan)]
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
    anchor: { kind: 'icon', icon, ...surfaceAnchorOf(readings), ...(row === null ? {} : { taskGroupId: row }) },
    text: refusal === null ? hint : `${hint}${LINE_BREAK}${refusal}`,
    assignment: entryAssignment(icon, hintLanguage),
  }
}

type HintHolder = NonNullable<ScreenViewReadings['hintHolderUnderPointer']>

interface HintShown {
  readonly text: string
  readonly rows?: readonly TooltipRow[]
}

/** @purity pure */
function textOnly(text: string | null): HintShown | null {
  return text === null ? null : { text }
}

// see TL-1, TL-2, TL-3, TL-12, SQ-5
/** @purity pure */
function hintShownOf(
  holder: HintHolder,
  schedule: Schedule,
  language: DisplayLanguage,
  times: HintTimes,
  diagnosed: ScreenViewReadings['diagnosedMarkers'],
): HintShown | null {
  if (holder.kind === 'baseline') {
    const baseline = schedule.baselineTasks.find((one) => one.uid === holder.taskUid)
    return baseline === undefined ? null : textOnly(baselineHint(baseline, schedule, language, times))
  }
  const task = taskByUid(schedule, holder.taskUid)
  if (task === null) return null
  if (holder.kind === 'deadline') return textOnly(deadlineHint(task, schedule, language, times))
  // TRAP: read through ?. and ??: views built from a partial schedule carry no project or no statusDate (FR-046: no line).
  const statusDate = dayOf(schedule.project?.statusDate ?? null)
  const stateWord = taskStateWordOf(task, statusDate, diagnosed?.get(task.uid), language)
  const facts = { late: lateRow(task, schedule, statusDate, language), stateWord }
  const rows = taskHintRows(task, hintContextOf(schedule, task.uid, times), language, facts)
  return { text: rows.map(rowText).join(LINE_BREAK), rows }
}

// see EZ-6, DC-3, S-439, T-023d
/** @purity pure */
function taskTooltipOf(
  session: ScreenSession,
  readings: ScreenViewReadings,
  schedule: Schedule,
  times: HintTimes,
): Tooltip | null {
  const pointer = readings.pointer
  const holder = readings.hintHolderUnderPointer ?? null
  const isDue = readings.pointerRestedMs >= SETTINGS_CONSTANTS.taskHintDelayMs
  if (pointer === null || holder === null || isDualCursorOn(session) || !isDue) return null
  const shown = hintShownOf(holder, schedule, displayLanguageOf(session), times, readings.diagnosedMarkers)
  if (shown === null || shown.text === '') return null
  const rows = shown.rows === undefined ? {} : { rows: shown.rows }
  return { anchor: holder, text: shown.text, assignment: null, at: pointer, ...rows }
}

// see EZ-2, EZ-6, FR-037, IN-3
/** @purity pure */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
  schedule: Schedule,
): readonly Tooltip[] {
  if (session.screen.tooltipDisplayState.kind === 'dismissed') return []

  const pointer = readings.pointer
  const language = displayLanguageOf(session)
  const tooltips: Tooltip[] = [iconTooltipOf(shown, session, readings), taskTooltipOf(session, readings, schedule, settings)]
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

// see CU-3, DC-3, TX-6, FR-158
// WHY: the clock follows the date only while time of day is shown; without it the instant is the day's 00:00.
/** @purity pure */
function cursorInstantText(instant: number, isTimeOfDayVisible: boolean, language: DisplayLanguage): string {
  const dated = cursorDateText(dayOfInstant(instant), language)
  return isTimeOfDayVisible ? `${dated} ${clockTextOf(instant)}` : dated
}

// see DC-3
/** @purity pure */
function readoutDate(instant: number | null, isTimeOfDayVisible: boolean, language: DisplayLanguage): string {
  return instant === null ? UNKNOWN : cursorInstantText(instant, isTimeOfDayVisible, language)
}

// see DC-3, TX-6, TX-10
// WHY: whole calendar days go to the y / m / d words; the rest under a day is calendar time in h and m (TX-6).
/** @purity pure */
function readoutSpan(a: number | null, b: number | null, isTimeOfDayVisible: boolean, language: DisplayLanguage): string {
  if (a === null || b === null) return UNKNOWN
  const wholeDays = Math.floor((b - a) / MINUTES_PER_CALENDAR_DAY)
  const span = calendarSpanOf(dayOfInstant(a), dayOfInstant(a + wholeDays * MINUTES_PER_CALENDAR_DAY))
  const days = readoutWord(span.dayCount === 1 ? 'oneDay' : 'days', language)
    .replace('{y}', String(span.years))
    .replace('{m}', String(span.months))
    .replace('{d}', String(span.days))
    .replace('{n}', String(span.dayCount))
  if (!isTimeOfDayVisible) return days
  return `${days} ${lengthTextOf(b - a - wholeDays * MINUTES_PER_CALENDAR_DAY, MINUTES_PER_CALENDAR_DAY)}`
}

// see DC-1, DC-2, DC-3, T-378
// WHY: the following side reads the instant under the pointer, as its line stands there (cursorInstantAtX).
/** @purity pure */
function readoutInstants(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  pointerX: number,
): { readonly cursorADate: number | null; readonly cursorBDate: number | null } {
  const mode = session.screen.dualCursorModeState
  const following = mode.kind !== 'off' && mode.child.kind === 'placingCursorB' ? 'cursorB' : 'cursorA'
  const followed = cursorInstantAtX(timeAxisOf(settings, regions), pointerX, settings)
  const standing = session.screen.dualCursor
  return {
    cursorADate: following === 'cursorA' ? followed : instantOf(standing?.cursorADate ?? null),
    cursorBDate: following === 'cursorB' ? followed : instantOf(standing?.cursorBDate ?? null),
  }
}

// see DC-3
/** @purity pure */
function inDateOrder(
  a: number | null,
  b: number | null,
): { readonly left: number | null; readonly right: number | null } {
  if (a === null) return { left: b, right: null }
  if (b === null) return { left: a, right: null }
  return a <= b ? { left: a, right: b } : { left: b, right: a }
}

// see TX-6, FR-156, S-574
/** @purity pure */
function cursorViewOf(settings: DocumentSettings, dataRegion: string | undefined): (instant: number | null) => number | null {
  if (!settings.isTimeOfDayVisible || dataRegion === undefined) return (instant) => instant
  const toView = viewWallReader(dataRegion, settings.viewTimeZone)
  return (instant) => (instant === null ? null : toView(instant))
}

// see DC-3, IN-3, EZ-6
/** @purity pure */
export function dualCursorReadoutOf(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
  dataRegion?: string,
): DualCursorReadout | null {
  const pointer = readings.pointer
  if (pointer === null || !isDualCursorOn(session)) return null
  const region = regionAtPointer(regions, pointer.x, pointer.y)
  if (region !== 'taskGroupArea' && region !== 'timeRuler') return null
  const language = displayLanguageOf(session)
  const { cursorADate, cursorBDate } = readoutInstants(regions, settings, session, pointer.x)
  const toView = cursorViewOf(settings, dataRegion)
  const { left, right } = inDateOrder(toView(cursorADate), toView(cursorBDate))
  const inTime = settings.isTimeOfDayVisible
  return {
    lines: [
      readoutWord('left', language).replace('{date}', () => readoutDate(left, inTime, language)),
      readoutWord('right', language).replace('{date}', () => readoutDate(right, inTime, language)),
      readoutWord('span', language).replace('{span}', () => readoutSpan(left, right, inTime, language)),
    ],
    at: pointer,
  }
}

const GUIDE_CURSOR_NONE = 'none'

const GUIDE_LABEL_MINUTES = 1

// see CU-3, DC-9
// WHY: tooltips is this frame's set: CU-3 stands down in the frame an EZ-6 tip (one placed at the point) is shown.
/** @purity pure */
export function guideCursorLabelOf(
  regions: ScreenRegions,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
  tooltips: readonly Tooltip[],
  dataRegion?: string,
): GuideCursorLabel | null {
  const pointer = readings.pointer
  if (pointer === null || session.screen.guideCursorMode === GUIDE_CURSOR_NONE) return null
  if (isDualCursorOn(session) || regionAtPointer(regions, pointer.x, pointer.y) !== 'taskGroupArea') return null
  if (tooltips.some((one) => one.at !== undefined)) return null
  const axis = timeAxisOf(settings, regions)
  const instant = settings.isTimeOfDayVisible
    ? snappedInstantAtX(axis, pointer.x, GUIDE_LABEL_MINUTES)
    : cursorInstantAtX(axis, pointer.x, settings)
  const shown = cursorViewOf(settings, dataRegion)(instant)
  if (shown === null) return null
  return { text: cursorInstantText(shown, settings.isTimeOfDayVisible, displayLanguageOf(session)), at: pointer }
}

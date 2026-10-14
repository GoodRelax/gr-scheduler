// ScreenRenderer: the Holiday Settings surface's content for one frame.
// @unit      UF-204  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  isNonRecurringException,
  workingCalendarOf,
  workingTimeSetOf,
  type Exception,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type { CommandItem, DisplayLanguage, IconId, PropertyControl, PropertyFieldKey } from './screen-renderer'
import { widthOf } from './properties-panel'
import { dateText } from './table-window'
import { iconHint, iconLabel } from './tooltips'
import displayWords from './display-words.json'

export const HOLIDAY_SETTINGS_SURFACE = 'Holiday Settings'

// see IC-52, WC-1
const CLOSE_SURFACE_ENTRY: IconId = 'IC-52'

// see T-344, T-109
const WEEKDAY_ENTRY: IconId = 'IC-133'
const WEEK_START_ENTRY: IconId = 'IC-134'
const ADD_EXCEPTION_ENTRY: IconId = 'IC-135'
const REMOVE_EXCEPTION_ENTRY: IconId = 'IC-136'
const EXCEPTION_KIND_ENTRY: IconId = 'IC-137'
const APPLY_ENTRY: IconId = 'IC-138'
const ADD_RANGE_ENTRY: IconId = 'IC-163'
const REMOVE_RANGE_ENTRY: IconId = 'IC-164'
const TIME_FIELD_ENTRY: IconId = 'IC-165'

const DAYS_PER_WEEK = 7

const MINUTES_PER_HOUR = 60

const MINUTE_DIGITS = 2

const DAY_END_CLOCK = '24:00'

// WHY: the sample's range spelling (sample 52), an en dash between the two clocks.
const RANGE_JOIN = '–'

export type HolidaySettingsFieldColumn = 'weekStartDay' | 'fromTime' | 'toTime' | 'name' | 'fromDate' | 'toDate'

// see T-280, WC-2, WC-3, WC-4, WC-8
// WHY: the calendarDraft of T-280 read by its parts; untouched, the same parts are read off the document's calendar (X-b).
export interface HolidaySettingsDraft {
  readonly workingDayTypes: readonly number[]
  readonly weekStartDay: number
  readonly workingTimes: readonly { readonly fromTime: string | null; readonly toTime: string | null }[]
  readonly exceptions: readonly Exception[]
}

// see WC-10
// WHY: judged by the draft's rules in the UseCase (CR-743 X-a); indexes point into the draft's lists.
export type HolidaySettingsRefusal =
  | { readonly part: 'timeNotReadable'; readonly index: number; readonly side: 'fromTime' | 'toTime'; readonly text: string }
  | { readonly part: 'startNotBeforeEnd'; readonly index: number }
  | { readonly part: 'rangesOverlap'; readonly first: number; readonly second: number }
  | { readonly part: 'noWorkingWeekday' }
  | { readonly part: 'exceptionFromAfterTo'; readonly index: number }
  | { readonly part: 'exceptionsOverlap'; readonly first: number; readonly second: number }

// see WC-3, WC-4, WC-8, WC-10, S-154
export interface HolidaySettingsField {
  readonly control: PropertyControl
  readonly isRefused: boolean
}

// see WC-2, IC-133, AT-73
// WHY: the entry keeps IC-133's own label; the weekday's name is drawn on it.
export interface HolidayWeekdayEntry {
  readonly entry: CommandItem
  readonly dayType: number
  readonly word: string
}

// see WC-8, IC-164, IC-165
export interface HolidayWorkingHoursRow {
  readonly index: number
  readonly from: HolidaySettingsField
  readonly to: HolidaySettingsField
  readonly remove: CommandItem
}

// see WC-4, WC-5, IC-136, IC-137
// WHY: a repeating row (WC-5) has no fields and no kind entrance; it shows its name and the repeating word only.
export interface HolidayExceptionRow {
  readonly index: number
  readonly ordinal: number
  readonly repeatingWord: string | null
  readonly name: HolidaySettingsField | null
  readonly shownName: string
  readonly from: HolidaySettingsField | null
  readonly to: HolidaySettingsField | null
  readonly kind: CommandItem | null
  readonly remove: CommandItem
}

// see U-65, FR-088, T-344, T-257
export interface HolidaySettings {
  readonly surface: 'Holiday Settings'
  readonly heading: string
  readonly commands: readonly CommandItem[]
  readonly isDrafted: boolean
  readonly workingWeekdaysHeading: string
  readonly weekdays: readonly HolidayWeekdayEntry[]
  readonly weekStartHeading: string
  readonly weekStart: HolidaySettingsField
  readonly workingHoursHeading: string
  readonly rangeWords: { readonly from: string; readonly to: string }
  readonly workingHours: readonly HolidayWorkingHoursRow[]
  readonly addRange: CommandItem
  readonly otherHoursLine: string | null
  readonly upperRefusals: readonly string[]
  readonly exceptionDaysHeading: string
  readonly exceptionColumnWords: { readonly name: string; readonly from: string; readonly to: string; readonly kind: string }
  readonly exceptions: readonly HolidayExceptionRow[]
  readonly exceptionRefusals: readonly string[]
  readonly addException: CommandItem
  readonly apply: CommandItem
}

const HOLIDAY_WORDS = new Map(displayWords.holidaySettings.map((entry) => [entry.part, entry.text]))

const WEEKDAY_WORDS = displayWords.weekdays.map((entry) => entry.text)

/** @purity pure */
function holidayWord(part: string, language: DisplayLanguage): string {
  return HOLIDAY_WORDS.get(part)?.[language] ?? ''
}

/** @purity pure */
function filled(pattern: string, slots: Readonly<Record<string, string>>): string {
  return Object.entries(slots).reduce((text, [slot, value]) => text.replace(`{${slot}}`, value), pattern)
}

// see AT-73
/** @purity pure */
function weekdayWordOf(dayType: number, language: DisplayLanguage): string {
  return WEEKDAY_WORDS[dayType - 1]?.[language] ?? String(dayType)
}

/** @purity pure */
function entryOf(icon: IconId, label: string, flags: Partial<Pick<CommandItem, 'isEnabled' | 'isPressed'>> = {}): CommandItem {
  return { icon, isEnabled: flags.isEnabled ?? true, isPressed: flags.isPressed ?? false, isArmed: false, isChosen: false, label }
}

// see WC-8, T-375
// WHY: a readable clock is shown as H:MM (08:00 -> 8:00) and an end at midnight as 24:00 (IV-24); anything else stays as typed.
const CLOCK_TEXT = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/** @purity pure */
export function shownClockText(text: string | null, side: 'fromTime' | 'toTime'): string {
  const held = (text ?? '').trim()
  const hit = CLOCK_TEXT.exec(held)
  if (hit === null) return held
  const minute = Number(hit[1]) * MINUTES_PER_HOUR + Number(hit[2])
  if (side === 'toTime' && minute === 0) return DAY_END_CLOCK
  return `${Math.floor(minute / MINUTES_PER_HOUR)}:${String(minute % MINUTES_PER_HOUR).padStart(MINUTE_DIGITS, '0')}`
}

// see T-280, WC-8, WC-9
/** @purity pure */
function draftOfDocument(schedule: Schedule): HolidaySettingsDraft {
  const within = workingCalendarOf(schedule)
  return {
    workingDayTypes: within.weekDays.flatMap((one) => (one.dayWorking === true && one.dayType !== null ? [one.dayType] : [])),
    weekStartDay: within.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
    workingTimes: workingTimeSetOf(within).workingTimes,
    exceptions: within.exceptions,
  }
}

// see T-280, FR-088
/** @purity pure */
function shownDraftOf(session: ScreenSession, schedule: Schedule): { readonly draft: HolidaySettingsDraft; readonly isDrafted: boolean } {
  const state = session.screen.calendarDraftState
  if (state.kind === 'drafted') return { draft: state.calendarDraft, isDrafted: true }
  return { draft: draftOfDocument(schedule), isDrafted: false }
}

/** @purity pure */
function fieldOf(
  key: PropertyFieldKey,
  kind: PropertyControl['kind'],
  text: string,
  isRefused: boolean,
  hint: string,
): HolidaySettingsField {
  return {
    control: { key, kind, text, choices: null, min: null, max: null, widthInFontSizes: widthOf(text, null, SETTINGS_CONSTANTS.labelCoef), hint },
    isRefused,
  }
}

// see WC-2, WC-3, IC-133
/** @purity pure */
function weekdayEntriesOf(draft: HolidaySettingsDraft, language: DisplayLanguage): readonly HolidayWeekdayEntry[] {
  const working = new Set(draft.workingDayTypes)
  return Array.from({ length: DAYS_PER_WEEK }, (_, step) => {
    const dayType = ((draft.weekStartDay + step) % DAYS_PER_WEEK) + 1
    const entry = entryOf(WEEKDAY_ENTRY, iconLabel(WEEKDAY_ENTRY, language), { isPressed: working.has(dayType) })
    return { dayType, word: weekdayWordOf(dayType, language), entry }
  })
}

// see WC-3, IC-134, AT-17
/** @purity pure */
function weekStartFieldOf(draft: HolidaySettingsDraft, language: DisplayLanguage): HolidaySettingsField {
  const words = WEEKDAY_WORDS.map((one) => one[language])
  const field = fieldOf({ holder: 'calendarDraft', column: 'weekStartDay', index: 0 }, 'choice', String(draft.weekStartDay), false, iconHint(WEEK_START_ENTRY, language))
  return {
    ...field,
    control: {
      ...field.control,
      choices: words,
      choiceValues: words.map((_, weekStartDay) => String(weekStartDay)),
      widthInFontSizes: widthOf('', words, SETTINGS_CONSTANTS.labelCoef),
    },
  }
}

/** @purity pure */
function refusedTimeFields(refusals: readonly HolidaySettingsRefusal[]): ReadonlySet<string> {
  return new Set(refusals.flatMap((one) => {
    if (one.part === 'timeNotReadable') return [`${one.index}.${one.side}`]
    if (one.part === 'startNotBeforeEnd') return [`${one.index}.fromTime`, `${one.index}.toTime`]
    if (one.part === 'rangesOverlap') return [one.first, one.second].flatMap((index) => [`${index}.fromTime`, `${index}.toTime`])
    return []
  }))
}

// see WC-8, IC-163, IC-164, IC-165, S-582
/** @purity pure */
function workingHoursRowsOf(
  draft: HolidaySettingsDraft,
  refusals: readonly HolidaySettingsRefusal[],
  language: DisplayLanguage,
): readonly HolidayWorkingHoursRow[] {
  const refused = refusedTimeFields(refusals)
  const hint = iconHint(TIME_FIELD_ENTRY, language)
  const isOnlyRow = draft.workingTimes.length <= 1
  return draft.workingTimes.map((one, index) => {
    const side = (column: 'fromTime' | 'toTime'): HolidaySettingsField =>
      fieldOf({ holder: 'calendarDraft', column, index }, 'text', shownClockText(one[column], column), refused.has(`${index}.${column}`), hint)
    return {
      index,
      from: side('fromTime'),
      to: side('toTime'),
      remove: entryOf(REMOVE_RANGE_ENTRY, iconLabel(REMOVE_RANGE_ENTRY, language), { isEnabled: !isOnlyRow }),
    }
  })
}

// see WC-9, FR-088
/** @purity pure */
function otherHoursLineOf(schedule: Schedule, language: DisplayLanguage): string | null {
  const unlike = workingTimeSetOf(workingCalendarOf(schedule)).unlikeDayTypes
  if (unlike.length === 0) return null
  const weekdays = unlike.map((dayType) => weekdayWordOf(dayType, language)).join(holidayWord('weekdaySeparator', language))
  return filled(holidayWord('otherHoursWeekdays', language), { weekdays })
}

// see WC-4, WC-10
// WHY: a row with no name is told by its start day, as the date field shows it (WC-10).
/** @purity pure */
function exceptionShownName(exception: Exception | undefined): string {
  if (exception === undefined) return ''
  const name = exception.name ?? ''
  return name === '' ? dateText(exception.fromDate) : name
}

/** @purity pure */
function rangeTextOf(draft: HolidaySettingsDraft, index: number): string {
  const one = draft.workingTimes[index]
  if (one === undefined) return ''
  return `${shownClockText(one.fromTime, 'fromTime')}${RANGE_JOIN}${shownClockText(one.toTime, 'toTime')}`
}

// see WC-10, T-344
/** @purity pure */
function refusalText(refusal: HolidaySettingsRefusal, draft: HolidaySettingsDraft, language: DisplayLanguage): string {
  const word = holidayWord(refusal.part, language)
  switch (refusal.part) {
    case 'timeNotReadable':
      return filled(word, { text: refusal.text })
    case 'startNotBeforeEnd':
      return filled(word, { range: rangeTextOf(draft, refusal.index) })
    case 'rangesOverlap':
      return filled(word, { first: rangeTextOf(draft, refusal.first), second: rangeTextOf(draft, refusal.second) })
    case 'noWorkingWeekday':
      return word
    case 'exceptionFromAfterTo':
      return filled(word, { name: exceptionShownName(draft.exceptions[refusal.index]) })
    case 'exceptionsOverlap':
      return filled(word, {
        first: exceptionShownName(draft.exceptions[refusal.first]),
        second: exceptionShownName(draft.exceptions[refusal.second]),
      })
  }
}

/** @purity pure */
function isExceptionRefusal(refusal: HolidaySettingsRefusal): boolean {
  return refusal.part === 'exceptionFromAfterTo' || refusal.part === 'exceptionsOverlap'
}

/** @purity pure */
function refusedExceptionRows(refusals: readonly HolidaySettingsRefusal[]): ReadonlySet<number> {
  return new Set(refusals.flatMap((one) => {
    if (one.part === 'exceptionFromAfterTo') return [one.index]
    if (one.part === 'exceptionsOverlap') return [one.first, one.second]
    return []
  }))
}

// see WC-4, WC-5, IC-136, IC-137, AT-82
/** @purity pure */
function exceptionRowOf(exception: Exception, index: number, isRefused: boolean, language: DisplayLanguage): HolidayExceptionRow {
  const remove = entryOf(REMOVE_EXCEPTION_ENTRY, iconLabel(REMOVE_EXCEPTION_ENTRY, language))
  const shownName = exception.name ?? ''
  if (!isNonRecurringException(exception)) {
    return { index, ordinal: exception.ordinal, repeatingWord: holidayWord('repeating', language), name: null, shownName, from: null, to: null, kind: null, remove }
  }
  const field = (column: 'name' | 'fromDate' | 'toDate', text: string, refused: boolean): HolidaySettingsField =>
    fieldOf({ holder: 'calendarDraft', column, index }, column === 'name' ? 'text' : 'date', text, refused, '')
  const isWorking = exception.dayWorking === true
  const kindWord = isWorking ? holidayWord('dayWorking', language) : iconLabel(EXCEPTION_KIND_ENTRY, language)
  return {
    index,
    ordinal: exception.ordinal,
    repeatingWord: null,
    name: field('name', shownName, false),
    shownName,
    from: field('fromDate', dateText(exception.fromDate), isRefused),
    to: field('toDate', dateText(exception.toDate), isRefused),
    kind: entryOf(EXCEPTION_KIND_ENTRY, kindWord, { isPressed: isWorking }),
    remove,
  }
}

// see WC-4
// WHY: the rows stand in start-day order while each keeps its place in the draft's list as its index.
/** @purity pure */
function exceptionRowsOf(
  draft: HolidaySettingsDraft,
  refusals: readonly HolidaySettingsRefusal[],
  language: DisplayLanguage,
): readonly HolidayExceptionRow[] {
  const refused = refusedExceptionRows(refusals)
  const startOf = (one: Exception): string => one.fromDate ?? ''
  return draft.exceptions
    .map((one, index) => ({ one, index }))
    .sort((a, b) => (startOf(a.one) < startOf(b.one) ? -1 : startOf(a.one) > startOf(b.one) ? 1 : a.index - b.index))
    .map(({ one, index }) => exceptionRowOf(one, index, refused.has(index), language))
}

// see U-65, FR-088, T-344, WC-1, WC-10, FR-029
/** @purity pure */
export function holidaySettingsOf(
  session: ScreenSession,
  schedule: Schedule,
  heading: string,
  commands: readonly CommandItem[],
  refusalsOf: (draft: HolidaySettingsDraft) => readonly HolidaySettingsRefusal[],
  language: DisplayLanguage,
): HolidaySettings {
  const { draft, isDrafted } = shownDraftOf(session, schedule)
  const refusals = refusalsOf(draft)
  const said = (one: HolidaySettingsRefusal): string => refusalText(one, draft, language)
  return {
    surface: HOLIDAY_SETTINGS_SURFACE,
    heading,
    commands: commands.filter((one) => one.icon === CLOSE_SURFACE_ENTRY),
    isDrafted,
    workingWeekdaysHeading: holidayWord('workingWeekdays', language),
    weekdays: weekdayEntriesOf(draft, language),
    weekStartHeading: holidayWord('weekStart', language),
    weekStart: weekStartFieldOf(draft, language),
    workingHoursHeading: holidayWord('workingHours', language),
    rangeWords: { from: holidayWord('rangeFrom', language), to: holidayWord('rangeTo', language) },
    workingHours: workingHoursRowsOf(draft, refusals, language),
    addRange: entryOf(ADD_RANGE_ENTRY, iconLabel(ADD_RANGE_ENTRY, language), {
      isEnabled: draft.workingTimes.length < SETTINGS_CONSTANTS.workingTimesPerDayMax,
    }),
    otherHoursLine: otherHoursLineOf(schedule, language),
    upperRefusals: refusals.filter((one) => !isExceptionRefusal(one)).map(said),
    exceptionDaysHeading: holidayWord('exceptionDays', language),
    exceptionColumnWords: {
      name: holidayWord('exceptionName', language),
      from: holidayWord('exceptionFrom', language),
      to: holidayWord('exceptionTo', language),
      kind: holidayWord('exceptionKind', language),
    },
    exceptions: exceptionRowsOf(draft, refusals, language),
    exceptionRefusals: refusals.filter(isExceptionRefusal).map(said),
    addException: entryOf(ADD_EXCEPTION_ENTRY, iconLabel(ADD_EXCEPTION_ENTRY, language)),
    apply: entryOf(APPLY_ENTRY, iconLabel(APPLY_ENTRY, language), { isEnabled: refusals.length === 0 }),
  }
}

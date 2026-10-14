// ScreenRenderer: the Holiday Settings surface's content for one frame.
// @unit      UF-204  (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import { isNonRecurringException, type Exception, type Schedule } from '../../entity/document-model/schedule/schedule'
import {
  calendarDraftRefusalsOf,
  canAddRange,
  canDeleteRange,
  exceptionsInStartOrder,
  otherHoursDayTypesOf,
  shownCalendarDraft,
  type CalendarDraft,
  type CalendarDraftRefusal,
  type ScreenSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
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

// see T-344, T-292
const WEEK_START_ROW = 'WC-3'
const EXCEPTION_ROW = 'WC-4'
const WORKING_HOURS_ROW = 'WC-8'

const DAYS_PER_WEEK = 7

// WHY: the sample's range spelling (sample 52), an en dash between the two clocks.
const RANGE_JOIN = '–'

export type HolidaySettingsFieldColumn = 'weekStartDay' | 'fromTime' | 'toTime' | 'name' | 'fromDate' | 'toDate'

// see WC-3, WC-4, WC-8, WC-10, S-154
export interface HolidaySettingsCell {
  readonly row: string
  readonly control: PropertyControl
  readonly isRefused: boolean
}

// see IF-9, WC-2, WC-4, IC-133, IC-137
// WHY: the target says which weekday or row a repeated entrance means; a set word is drawn in place of the label.
export interface HolidaySettingsEntry {
  readonly item: CommandItem
  readonly target: string | null
  readonly word: string | null
}

export interface HolidayWorkingTimeLine {
  readonly from: HolidaySettingsCell
  readonly to: HolidaySettingsCell
  readonly remove: HolidaySettingsEntry
}

// see WC-4, WC-5
export interface HolidayExceptionLine {
  readonly name: HolidaySettingsCell
  readonly from: HolidaySettingsCell | null
  readonly to: HolidaySettingsCell | null
  readonly kind: HolidaySettingsEntry | null
  readonly repeatingText: string | null
  readonly remove: HolidaySettingsEntry
}

// see U-65, FR-088, T-344, T-257
export interface HolidaySettingsBody {
  readonly isDrafted: boolean
  readonly weekdaysHeading: string
  readonly weekdays: readonly HolidaySettingsEntry[]
  readonly weekStartName: string
  readonly weekStart: HolidaySettingsCell
  readonly workingHoursHeading: string
  readonly workingHoursColumns: readonly string[]
  readonly workingTimes: readonly HolidayWorkingTimeLine[]
  readonly addWorkingTime: HolidaySettingsEntry
  readonly otherHoursLine: string | null
  readonly upperRefusals: readonly string[]
  readonly exceptionsHeading: string
  readonly exceptionColumns: readonly string[]
  readonly exceptions: readonly HolidayExceptionLine[]
  readonly lowerRefusals: readonly string[]
  readonly addException: HolidaySettingsEntry
  readonly apply: HolidaySettingsEntry
}

export interface HolidaySettings {
  readonly surface: 'Holiday Settings'
  readonly heading: string
  readonly commands: readonly CommandItem[]
  readonly holidaySettings: HolidaySettingsBody
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
function entryOf(
  icon: IconId,
  language: DisplayLanguage,
  place: { readonly target?: string; readonly word?: string; readonly isEnabled?: boolean; readonly isPressed?: boolean } = {},
): HolidaySettingsEntry {
  const item = { icon, isEnabled: place.isEnabled ?? true, isPressed: place.isPressed ?? false, isArmed: false, isChosen: false, label: iconLabel(icon, language) }
  return { item, target: place.target ?? null, word: place.word ?? null }
}

/** @purity pure */
function cellOf(
  row: string,
  key: PropertyFieldKey,
  kind: PropertyControl['kind'],
  text: string,
  flags: { readonly isRefused: boolean; readonly hint: string; readonly isDisabled?: boolean },
): HolidaySettingsCell {
  const width = widthOf(text, null, SETTINGS_CONSTANTS.labelCoef)
  const control: PropertyControl = {
    key, kind, text, choices: null, min: null, max: null, widthInFontSizes: width, hint: flags.hint,
    ...(flags.isDisabled === true ? { isDisabled: true } : {}),
  }
  return { row, control, isRefused: flags.isRefused }
}

// see WC-2, WC-3, IC-133, AT-73
/** @purity pure */
function weekdayEntriesOf(draft: CalendarDraft, language: DisplayLanguage): readonly HolidaySettingsEntry[] {
  const working = new Set(draft.workingDayTypes)
  return Array.from({ length: DAYS_PER_WEEK }, (_, step) => {
    const dayType = ((draft.weekStartDay + step) % DAYS_PER_WEEK) + 1
    return entryOf(WEEKDAY_ENTRY, language, { target: String(dayType), word: weekdayWordOf(dayType, language), isPressed: working.has(dayType) })
  })
}

// see WC-3, IC-134, AT-17
/** @purity pure */
function weekStartCellOf(draft: CalendarDraft, language: DisplayLanguage): HolidaySettingsCell {
  const words = WEEKDAY_WORDS.map((one) => one[language])
  const key: PropertyFieldKey = { holder: 'calendarDraft', column: 'weekStartDay', index: 0 }
  const cell = cellOf(WEEK_START_ROW, key, 'choice', String(draft.weekStartDay), { isRefused: false, hint: iconHint(WEEK_START_ENTRY, language) })
  return {
    ...cell,
    control: {
      ...cell.control,
      choices: words,
      choiceValues: words.map((_, weekStartDay) => String(weekStartDay)),
      widthInFontSizes: widthOf('', words, SETTINGS_CONSTANTS.labelCoef),
    },
  }
}

// see WC-10, S-154
/** @purity pure */
function refusedTimeFields(refusals: readonly CalendarDraftRefusal[]): ReadonlySet<string> {
  return new Set(refusals.flatMap((one) => {
    if (one.kind === 'timeNotReadable') return [`${one.rangeIndex}.${one.side}`]
    if (one.kind === 'startNotBeforeEnd') return [`${one.rangeIndex}.start`, `${one.rangeIndex}.end`]
    if (one.kind === 'rangesOverlap') return [one.firstIndex, one.secondIndex].flatMap((index) => [`${index}.start`, `${index}.end`])
    return []
  }))
}

// see WC-8, WC-10, IC-163, IC-164, IC-165, S-582
/** @purity pure */
function workingTimeLinesOf(
  draft: CalendarDraft,
  refusals: readonly CalendarDraftRefusal[],
  language: DisplayLanguage,
): readonly HolidayWorkingTimeLine[] {
  const refused = refusedTimeFields(refusals)
  const hint = iconHint(TIME_FIELD_ENTRY, language)
  const canDelete = canDeleteRange(draft)
  return draft.ranges.map((range, index) => {
    const side = (column: 'fromTime' | 'toTime'): HolidaySettingsCell => {
      const held = column === 'fromTime' ? 'start' : 'end'
      return cellOf(WORKING_HOURS_ROW, { holder: 'calendarDraft', column, index }, 'text', range[held], { isRefused: refused.has(`${index}.${held}`), hint })
    }
    return {
      from: side('fromTime'),
      to: side('toTime'),
      remove: entryOf(REMOVE_RANGE_ENTRY, language, { target: String(index), isEnabled: canDelete }),
    }
  })
}

// see WC-9, FR-088
/** @purity pure */
function otherHoursLineOf(draft: CalendarDraft, schedule: Schedule, language: DisplayLanguage): string | null {
  const unlike = otherHoursDayTypesOf(draft, schedule)
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
function rangeTextOf(draft: CalendarDraft, index: number): string {
  const one = draft.ranges[index]
  return one === undefined ? '' : `${one.start}${RANGE_JOIN}${one.end}`
}

/** @purity pure */
function exceptionByOrdinal(draft: CalendarDraft, ordinal: number): Exception | undefined {
  return draft.exceptions.find((one) => one.ordinal === ordinal)
}

// see WC-10, T-344
/** @purity pure */
function refusalText(refusal: CalendarDraftRefusal, draft: CalendarDraft, language: DisplayLanguage): string {
  const word = holidayWord(refusal.kind, language)
  switch (refusal.kind) {
    case 'timeNotReadable':
      return filled(word, { text: refusal.text })
    case 'startNotBeforeEnd':
      return filled(word, { range: rangeTextOf(draft, refusal.rangeIndex) })
    case 'rangesOverlap':
      return filled(word, { first: rangeTextOf(draft, refusal.firstIndex), second: rangeTextOf(draft, refusal.secondIndex) })
    case 'noWorkingWeekday':
      return word
    case 'exceptionFromAfterTo':
      return filled(word, { name: exceptionShownName(exceptionByOrdinal(draft, refusal.ordinal)) })
    case 'exceptionsOverlap':
      return filled(word, {
        first: exceptionShownName(exceptionByOrdinal(draft, refusal.firstOrdinal)),
        second: exceptionShownName(exceptionByOrdinal(draft, refusal.secondOrdinal)),
      })
  }
}

/** @purity pure */
function isExceptionRefusal(refusal: CalendarDraftRefusal): boolean {
  return refusal.kind === 'exceptionFromAfterTo' || refusal.kind === 'exceptionsOverlap'
}

/** @purity pure */
function refusedExceptionOrdinals(refusals: readonly CalendarDraftRefusal[]): ReadonlySet<number> {
  return new Set(refusals.flatMap((one) => {
    if (one.kind === 'exceptionFromAfterTo') return [one.ordinal]
    if (one.kind === 'exceptionsOverlap') return [one.firstOrdinal, one.secondOrdinal]
    return []
  }))
}

// see WC-4, WC-5, IC-136, IC-137, AT-82
// WHY: the target is the row's place in the draft's list; a repeating row's name is shown, not edited (WC-5).
/** @purity pure */
function exceptionLineOf(exception: Exception, index: number, isRefused: boolean, language: DisplayLanguage): HolidayExceptionLine {
  const target = String(index)
  const remove = entryOf(REMOVE_EXCEPTION_ENTRY, language, { target })
  const cell = (column: 'name' | 'fromDate' | 'toDate', text: string, refused: boolean, isDisabled = false): HolidaySettingsCell =>
    cellOf(EXCEPTION_ROW, { holder: 'calendarDraft', column, index }, column === 'name' ? 'text' : 'date', text, { isRefused: refused, hint: '', isDisabled })
  const name = exception.name ?? ''
  if (!isNonRecurringException(exception)) {
    return { name: cell('name', name, false, true), from: null, to: null, kind: null, repeatingText: holidayWord('repeating', language), remove }
  }
  const isWorking = exception.dayWorking === true
  const kindWord = isWorking ? holidayWord('dayWorking', language) : iconLabel(EXCEPTION_KIND_ENTRY, language)
  return {
    name: cell('name', name, false),
    from: cell('fromDate', dateText(exception.fromDate), isRefused),
    to: cell('toDate', dateText(exception.toDate), isRefused),
    kind: entryOf(EXCEPTION_KIND_ENTRY, language, { target, word: kindWord, isPressed: isWorking }),
    repeatingText: null,
    remove,
  }
}

// see WC-4
/** @purity pure */
function exceptionLinesOf(
  draft: CalendarDraft,
  refusals: readonly CalendarDraftRefusal[],
  language: DisplayLanguage,
): readonly HolidayExceptionLine[] {
  const refused = refusedExceptionOrdinals(refusals)
  return exceptionsInStartOrder(draft.exceptions).map((one) =>
    exceptionLineOf(one, draft.exceptions.indexOf(one), refused.has(one.ordinal), language))
}

// WHY: the last, empty heading stands over the remove entrance; the list draws one cell per heading.
/** @purity pure */
function exceptionColumnsOf(language: DisplayLanguage): readonly string[] {
  return ['exceptionName', 'exceptionFrom', 'exceptionTo', 'exceptionKind'].map((part) => holidayWord(part, language)).concat([''])
}

/** @purity pure */
function upperBodyOf(draft: CalendarDraft, schedule: Schedule, refusals: readonly CalendarDraftRefusal[], language: DisplayLanguage) {
  return {
    weekdaysHeading: holidayWord('workingWeekdays', language),
    weekdays: weekdayEntriesOf(draft, language),
    weekStartName: holidayWord('weekStart', language),
    weekStart: weekStartCellOf(draft, language),
    workingHoursHeading: holidayWord('workingHours', language),
    workingHoursColumns: [holidayWord('rangeFrom', language), holidayWord('rangeTo', language)],
    workingTimes: workingTimeLinesOf(draft, refusals, language),
    addWorkingTime: entryOf(ADD_RANGE_ENTRY, language, { isEnabled: canAddRange(draft) }),
    otherHoursLine: otherHoursLineOf(draft, schedule, language),
    upperRefusals: refusals.filter((one) => !isExceptionRefusal(one)).map((one) => refusalText(one, draft, language)),
  }
}

// see U-65, FR-088, T-344, WC-1, WC-10, FR-029, T-280
// WHY: drafted, the surface reads the draft; untouched, the document's calendar (CR-743 X-b). IC-138 dims while a refusal stands.
/** @purity pure */
export function holidaySettingsOf(
  session: ScreenSession,
  schedule: Schedule,
  heading: string,
  commands: readonly CommandItem[],
  language: DisplayLanguage,
): HolidaySettings {
  const state = session.screen.calendarDraftState
  const draft = shownCalendarDraft(state.kind === 'drafted' ? state.calendarDraft : null, schedule)
  const refusals = calendarDraftRefusalsOf(draft)
  return {
    surface: HOLIDAY_SETTINGS_SURFACE,
    heading,
    commands: commands.filter((one) => one.icon === CLOSE_SURFACE_ENTRY),
    holidaySettings: {
      isDrafted: state.kind === 'drafted',
      ...upperBodyOf(draft, schedule, refusals, language),
      exceptionsHeading: holidayWord('exceptionDays', language),
      exceptionColumns: exceptionColumnsOf(language),
      exceptions: exceptionLinesOf(draft, refusals, language),
      lowerRefusals: refusals.filter(isExceptionRefusal).map((one) => refusalText(one, draft, language)),
      addException: entryOf(ADD_EXCEPTION_ENTRY, language),
      apply: entryOf(APPLY_ENTRY, language, { isEnabled: refusals.length === 0 }),
    },
  }
}

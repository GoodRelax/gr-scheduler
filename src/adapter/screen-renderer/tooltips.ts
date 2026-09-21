// Builds the tooltips shown against this frame's parts.
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  calendarSpanOf,
  dayOf,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import { dateAtX, timeAxisOf } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  DisplayLanguage,
  DualCursorReadout,
  ScreenView,
  ScreenViewReadings,
  IconId,
  Tooltip,
} from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import displayWords from './display-words.json'
import helpRoster from './help-roster.json'

const HINTS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const ASSIGNMENTS_BY_ROW = new Map(displayWords.assignments.map((entry) => [entry.rowId, entry]))

const FASTER_SCROLL_ASSIGNMENT_ROWS: Readonly<Record<'horizontal' | 'vertical', string>> = {
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

const ASSIGNMENT_SEPARATOR = ' \uFF0F '

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
function iconHint(icon: IconId, language: DisplayLanguage): string {
  const held = HINTS_BY_ROW.get(icon)
  if (held === undefined) return icon
  if (held.hint[language] !== '') return held.hint[language]
  return held.label[language] === '' ? icon : held.label[language]
}

const DAY_TIME_SEPARATOR = 'T'

/** @purity pure */
function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

// STOP: spec does not decide what separates the task name from its dates. Looked in EZ-6, T-040, IN-3
// @provisional PND-390
/** @purity pure */
function taskHint(task: Task): string {
  const name = task.name ?? ''
  return `${name} ${dateText(task.start)} / ${dateText(task.finish)}`
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

// see EZ-2, EZ-6, FR-037, IN-3
/** @purity pure */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): readonly Tooltip[] {
  if (session.screen.tooltipDisplayState.kind === 'dismissed') return []

  const pointer = readings.pointer
  const language = displayLanguageOf(session)
  const isHintDue = pointer !== null && readings.pointerRestedMs >= settings.iconHintDelayMs

  const tooltips: Tooltip[] = []

  const iconWithHintDue = isHintDue ? readings.iconUnderPointer : null
  if (iconWithHintDue !== null) {
    tooltips.push({
      anchor: { kind: 'icon', icon: iconWithHintDue },
      text: iconHint(iconWithHintDue, language),
      assignment: entryAssignment(iconWithHintDue, language),
    })
  }

  if (pointer === null) return tooltips

  // see EZ-6, DC-3
  const task = isHintDue && !isDualCursorOn(session) ? (readings.taskUnderPointer ?? null) : null
  if (task !== null) {
    tooltips.push({
      anchor: { kind: 'task', taskUid: task.uid },
      text: taskHint(task),
      assignment: null,
      // STOP: spec does not decide where an EZ-6 tooltip stands. Looked in T-040, IN-3, EP-15
      // @provisional PND-391
      at: pointer,
    })
  }

  for (const scrollbar of shown.frame.scrollbars) {
    if (!rectHoldsPoint(scrollbar.track, pointer.x, pointer.y)) continue
    tooltips.push({
      anchor: { kind: 'scrollbar', axis: scrollbar.axis },
      text: assignmentText(FASTER_SCROLL_ASSIGNMENT_ROWS[scrollbar.axis], language),
      assignment: null,
    })
  }

  return tooltips
}

const READOUT_WORDS = new Map(displayWords.dualCursorReadout.map((one) => [one.line, one.text]))
const UNKNOWN = '—'
const YEAR_DIGITS = 4

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
function readoutDate(day: CalendarDay | null): string {
  if (day === null) return UNKNOWN
  return `${String(day.year).padStart(YEAR_DIGITS, '0')}/${day.month}/${day.day}`
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
  const standing = settings.dualCursor
  return {
    date1: following === 'date1' ? followed : dayOf(standing?.date1 ?? null),
    date2: following === 'date2' ? followed : dayOf(standing?.date2 ?? null),
  }
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
  const isOverChart =
    rectHoldsPoint(regions.rowArea, pointer.x, pointer.y) ||
    rectHoldsPoint(regions.timeRuler, pointer.x, pointer.y)
  if (!isOverChart) return null
  const language = displayLanguageOf(session)
  const { date1, date2 } = readoutDays(regions, settings, session, pointer.x)
  return {
    lines: [
      readoutWord('a', language).replace('{date}', readoutDate(date1)),
      readoutWord('b', language).replace('{date}', readoutDate(date2)),
      readoutWord('span', language).replace('{span}', readoutSpan(date1, date2, language)),
    ],
    at: pointer,
  }
}

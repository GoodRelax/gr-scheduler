// Builds the tooltips shown against this frame's parts.
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  dayOf,
  textOfDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  DisplayLanguage,
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

  const task = isHintDue ? (readings.taskUnderPointer ?? null) : null
  if (task !== null) {
    tooltips.push({
      anchor: { kind: 'task', taskUid: task.uid },
      text: taskHint(task),
      assignment: null,
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

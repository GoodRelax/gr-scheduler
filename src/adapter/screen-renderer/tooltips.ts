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
import type {
  DisplayLanguage,
  ScreenSession,
  ScreenView,
  IconId,
  Tooltip,
} from './screen-renderer'
import displayWords from './display-words.json'
import helpRoster from './help-roster.json'

const HINTS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const ASSIGNMENTS_BY_ROW = new Map(displayWords.assignments.map((entry) => [entry.rowId, entry]))

const FASTER_SCROLL_ASSIGNMENT_ROWS: Readonly<Record<'horizontal' | 'vertical', string>> = {
  horizontal: 'MK-5',
  vertical: 'MK-1',
}

const ASSIGNMENT_BY_ICON = new Map(
  helpRoster.entries
      .flatMap((entry) => entry.drives.map((icon) => [icon, entry] as const))
      .reverse(),
)

const PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

/** @purity pure */
function entryAssignment(icon: IconId, language: DisplayLanguage): string | null {
  const found = ASSIGNMENT_BY_ICON.get(icon)
  if (found === undefined) return null
  if (found.keys !== null) return found.keys
  const press = PRESS_BY_ROW.get(found.row)?.press[language]
  return press === undefined || press === '' ? null : press
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
): readonly Tooltip[] {
  if (session.isTooltipDismissed === true) return []

  const pointer = session.pointer

  const isHintDue = pointer !== null && session.pointerRestedMs >= settings.iconHintDelayMs

  const tooltips: Tooltip[] = []

  const iconWithHintDue = isHintDue ? session.iconUnderPointer : null
  if (iconWithHintDue !== null) {
    tooltips.push({
      anchor: { kind: 'icon', icon: iconWithHintDue },
      text: iconHint(iconWithHintDue, session.language),
      assignment: entryAssignment(iconWithHintDue, session.language),
    })
  }

  if (pointer === null) return tooltips

  const task = isHintDue ? (session.taskUnderPointer ?? null) : null
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
      text: assignmentText(FASTER_SCROLL_ASSIGNMENT_ROWS[scrollbar.axis], session.language),
      assignment: null,
    })
  }

  return tooltips
}

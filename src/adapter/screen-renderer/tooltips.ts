// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// The explanations shown against the parts the other eight units described.
// Built last in `screenViewFromRegions`, so it reads their descriptions instead
// of describing the same parts a second time.
//
// Dismissal (IN-3 / IN-4 of table T-028) is split three ways: `escapeTarget`
// (screen-state.ts) answers the rung, `frame-loop.ts` holds
// `ScreenSession.isTooltipDismissed` (LY-5 of table T-060), and this unit only
// answers with no explanation while it stands -- otherwise the next frame raises
// the same explanation again from the unchanged rest and place. The member
// rides on the session because table T-075 fixes this unit's signature.
//
// Places: a scrollbar's is tested here because `Scrollbar.track` is a
// rectangle. An icon's (`iconUnderPointer`, PND-141) and a task's
// (`taskUnderPointer`) are READ from the session: no entry carries a rectangle,
// and the one walk of table T-023d is `itemAtPointer` (PI-7) over a geometry
// this component is not handed.
//
// The explanation is keyed by the row of table T-109 rather than found by
// walking `ScreenView`'s rosters: rows on the Row Title Panel, the Resource
// Roster and the Properties Panel carry no `CommandItem` and would stay silent.
//
// Nothing raises `TooltipAnchor`'s `rowTitle` case (FR-085); the case stays
// because screen-renderer.ts owns that union. Whether a pointer move asks for a
// frame (FR-048) is not decided here.
//
// FR-029's tooltip on an endpoint that cannot be grabbed is not raised here:
// that endpoint is in the `Row Area`, which this component does not describe,
// and `TooltipAnchor` has no case for it.

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

// `display-words.json` is FR-038's dictionary, generated from
// `_source/display-words.json` (Chapter 6.2). An empty cell falls back to the
// stand-in beside each lookup. It is a module constant compiled into the
// program, so reading it keeps this unit `pure`.

/**
 * The hints of table T-109's rows, keyed by the row id, and the words of table
 * T-023's assignments, keyed by theirs.
 *
 * `Map`s rather than a scan per tooltip: a description is built every frame
 * (R5 of docs/development-rules/07-review-standards.md, NFR-013).
 */
const HINTS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const ASSIGNMENTS_BY_ROW = new Map(displayWords.assignments.map((entry) => [entry.rowId, entry]))

/**
 * Which row of table T-023 assigns the faster way of scrolling that axis.
 *
 * By row id: it survives a change of assignment and is the key the dictionary
 * holds the words under, so it is also the stand-in while no word exists --
 * unlike an English name, it cannot pass for a word the glossary has settled.
 */
const FASTER_SCROLL_ASSIGNMENT_ROWS: Readonly<Record<'horizontal' | 'vertical', string>> = {
  horizontal: 'MK-5',
  vertical: 'MK-1',
}

/**
 * What one entry of table T-109 is assigned, or `null` where nothing is.
 *
 * Turned round once from the 入口 column of tables T-036 / T-023 (`drives` in
 * `help-roster.json`) rather than kept as a second hand-written table.
 * ⚠️ One entrance may be driven by two rows (IC-13 by SK-16 and by MK-3). The
 * roster lists table T-023 first (FR-036), and `reverse` makes that row win, so
 * the pointer's own gesture is what is shown.
 */
const ASSIGNMENT_BY_ICON = new Map(
  helpRoster.entries
      .flatMap((entry) => entry.drives.map((icon) => [icon, entry] as const))
      .reverse(),
)

/** Table T-023's rows, the only ones that carry a `press`. */
const PRESS_BY_ROW = new Map(
  displayWords.assignments.map((entry) => [entry.rowId, entry]),
)

/**
 * The assignment EZ-2 (MUST) puts after the description, in the display
 * language, or `null` where the entry has none.
 *
 * @purity pure
 */
function entryAssignment(icon: IconId, language: DisplayLanguage): string | null {
  const found = ASSIGNMENT_BY_ICON.get(icon)
  if (found === undefined) return null
  if (found.keys !== null) return found.keys
  // A mouse operation is a word (FR-036) and a key is not, so this half comes
  // from the dictionary and never from the `操作` column.
  const press = PRESS_BY_ROW.get(found.row)?.press[language]
  return press === undefined || press === '' ? null : press
}

/**
 * The explanation EZ-2 shows for one row of table T-109, in the display
 * language.
 *
 * The stand-in is the row's label, then the row id -- never the empty string,
 * which would raise an empty tooltip. The label is read from the dictionary,
 * not a `CommandItem`, because some rows are drawn where no `CommandItem` is.
 * `hint` is a second word, not a spelling of `label` (see `CommandItem.label`).
 *
 * `=== ''` rather than `||` / `??`: an empty cell means "no word settled yet",
 * so a word written later takes over without this line being edited.
 * A row missing from the dictionary cannot happen while `npm run gen:check`
 * passes.
 *
 * @purity pure
 */
function iconHint(icon: IconId, language: DisplayLanguage): string {
  const held = HINTS_BY_ROW.get(icon)
  if (held === undefined) return icon
  if (held.hint[language] !== '') return held.hint[language]
  return held.label[language] === '' ? icon : held.label[language]
}

/**
 * `textOfDay` joins a day and a time with this letter (EX-7 of table T-033) and
 * EZ-6 wants the day alone. The panel cuts a date column the same way, so
 * neither file mints a date format.
 */
const DAY_TIME_SEPARATOR = 'T'

/**
 * One of EZ-6's two dates.
 *
 * `dayOf` and `textOfDay` own reading and spelling a stored date (FR-054).
 * A column with no date gives the empty string, so its place stays empty
 * (EZ-6).
 *
 * @purity pure
 */
function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

/**
 * What EZ-6 of table T-040 shows over a `Task`.
 *
 * The name is never cut: FR-002 makes this the one place it can be read whole.
 * The space between name and dates is not stated; it is what already separates
 * an icon's explanation from its assignment, since a separator with meaning
 * would be a word. Nothing is trimmed, or an empty value would move the dates
 * into the name's place (EZ-6).
 *
 * @provisional PND-390
 * @purity pure
 */
function taskHint(task: Task): string {
  const name = task.name ?? ''
  return `${name} ${dateText(task.start)} / ${dateText(task.finish)}`
}

/**
 * What FR-037 puts on a scrollbar: the faster way of doing the same thing, in
 * the display language (FR-038).
 *
 * The stand-in is the row id, for the reason `FASTER_SCROLL_ASSIGNMENT_ROWS`
 * gives; re-typing table T-023's words here is what rule 03 section 1 forbids.
 * `=== ''` for the reason `iconHint` gives.
 *
 * @purity pure
 */
function assignmentText(row: string, language: DisplayLanguage): string {
  const word = ASSIGNMENTS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return row
  return word === '' ? row : word
}

/**
 * Half-open on both axes (R3.4), so two lanes never both claim an edge point.
 *
 * ⚠️ A copy of a private helper in `screen-regions.ts`: PI-35 does not publish
 * it and Chapter 5.3 bars reading past a folder's entry. Keep the two alike.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/**
 * The explanations to show against this frame's parts.
 *
 * In `TooltipAnchor`'s own order (rule 03 section 4); `rowTitle` is skipped --
 * see the head of this file.
 *
 * @purity pure
 */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  settings: DocumentSettings,
  session: ScreenSession,
): readonly Tooltip[] {
  // IN-3 / IN-4. Before every raiser, not inside one: each would otherwise put
  // the dismissed explanation straight back. Covers FR-037's scrollbar hint
  // too -- IN-4's rung is one for whatever stands.
  if (session.isTooltipDismissed === true) return []

  const pointer = session.pointer

  // STOP -- NOT STATED: whether resting for exactly `iconHintDelayMs` is
  // already "after" it. S-124 gives the wait and EZ-2 gives no boundary.
  // Searched: FR-092 (table T-040), `_assets/tbl-settings.md`, table T-206.
  // The endpoint is included, per rule 03's min/max convention.
  // One binding for both raisers: EZ-6 takes EZ-2's wait.
  const isHintDue = pointer !== null && session.pointerRestedMs >= settings.iconHintDelayMs

  const tooltips: Tooltip[] = []

  // EZ-2's place arrives as `ScreenSession.iconUnderPointer` (PND-141): only
  // the side that drew the entries (PI-38) can say which one is under the
  // pointer, and a rectangle guessed here would be an invented layout.
  //
  // `isEnabled` is not a condition: FR-029 tells the reason on the press
  // (RS-27 of table T-233), never under the pointer, so a spent entry is
  // explained like a usable one. Whether its hint should also say it cannot be
  // done now is not decided by the spec.
  //
  // No roster is walked (EZ-2 reaches every row of table T-109): the row under
  // the pointer is already a row of that table, and only a drawn entry can be
  // rested on.
  const iconWithHintDue = isHintDue ? session.iconUnderPointer : null
  if (iconWithHintDue !== null) {
    tooltips.push({
      anchor: { kind: 'icon', icon: iconWithHintDue },
      text: iconHint(iconWithHintDue, session.language),
      // EZ-2.
      assignment: entryAssignment(iconWithHintDue, session.language),
    })
  }

  if (pointer === null) return tooltips

  // EZ-6: a pointer move restarts the wait, so "gone when the pointer moves" is
  // the same condition. Which Task is `taskUnderPointer`, answered by the one
  // side that walks table T-023d (EZ-6 forbids a second hit test); a session
  // without the member reads as no Task.
  const task = isHintDue ? (session.taskUnderPointer ?? null) : null
  if (task !== null) {
    tooltips.push({
      anchor: { kind: 'task', taskUid: task.uid },
      text: taskHint(task),
      // EZ-6 asks for a name and two dates only; the assignment is EZ-2's.
      assignment: null,
      // @provisional PND-391 -- see `Tooltip.at`.
      at: pointer,
    })
  }

  // Every lane the pointer is in answers; no priority is invented for a corner
  // where two meet, since table T-023a limits MK-9a's priority to the schedule's
  // drawing area.
  for (const scrollbar of shown.frame.scrollbars) {
    if (!rectHoldsPoint(scrollbar.track, pointer.x, pointer.y)) continue
    tooltips.push({
      anchor: { kind: 'scrollbar', axis: scrollbar.axis },
      text: assignmentText(FASTER_SCROLL_ASSIGNMENT_ROWS[scrollbar.axis], session.language),
      // ⚠️ FR-037 already SAYS the faster way, so an assignment beside it would say it twice.
      assignment: null,
    })
  }

  return tooltips
}

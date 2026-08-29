// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// The explanations shown against the parts the other eight units described.
//
// ⭐ WHY THIS ONE IS HANDED THE OTHER EIGHT. What a tooltip explains is always
// a part somebody else already described -- an icon standing in the header, the
// palette or an open surface, a scrollbar lane. Reading those descriptions is
// cheaper and safer than describing the same things a second time, and it is
// why `screenViewFromRegions` builds this member last.
//
// ⭐ WHY NOTHING HERE SAYS "CAN BE DISMISSED". IN-3 of table T-028 grants that
// to every tooltip, along with being pointed at and with standing until its
// trigger is removed. A member per tooltip would let a caller describe one that
// IN-3 forbids.
// ⚠️ THAT THIRD CONDITION IS NOT "NEVER GOES AWAY BY ITSELF". IN-3 holds a
// tooltip until the pointer or the focus leaves what it explains, the person
// dismisses it, or its content stops being valid -- so a trigger that has left
// may take the tooltip with it. Nothing needs doing about that here: this unit
// describes ONE frame from the session, so a trigger that has left is simply an
// explanation the next frame does not carry.
//
// ⭐ WHY BOTH ANCHORS ARE ANSWERED AGAINST THE POINTER, AND WHY NOT IN THE SAME
// WAY. The two do not share a trigger, and the difference is the
// specification's rather than a simplification made here:
//   scrollbar  FR-037 states the pointer condition in as many words and adds a
//              MUST NOT against showing it all the time, and `Scrollbar.track`
//              is a rectangle -- so the test is made in this file.
//   icon       EZ-2 of table T-040 states a TIME condition and a PLACE
//              condition, and the session answers both: `pointerRestedMs` for
//              the wait, `iconUnderPointer` (PD-141) for which entry is under
//              the pointer. ⚠️ The place is READ and not measured -- no entry
//              carries a rectangle, so the side that drew them answers.
//   task       EZ-6 of table T-040 states the SAME two conditions and (MUST)
//              the same wait as EZ-2 -- 「別の待ち時間を持ってはならない
//              （MUST NOT）」 -- so the time half is the one binding below.
//              ⛔ ITS PLACE HALF IS TABLE T-023d's ORDER, and EZ-6 (MUST NOT)
//              forbids raising a second hit test for it, so the place is READ
//              from `ScreenSession.taskUnderPointer` for the same reason the
//              icon's is: the one walk of that table is `itemAtPointer` (PI-7)
//              over a geometry this component is not handed.
//
// ⭐ EZ-2 REACHES EVERY ROW OF TABLE T-109, WHICHEVER SURFACE IT STANDS ON
// (MUST), and 「載る面によって説明を出さない行があってはならない（MUST NOT）」.
// ⛔ THIS FILE USED TO WALK THE THREE ROSTERS `ScreenView` carries entries in --
// the `App Header`, the `Command Palette` and the open surface -- and explain
// only an entry it found there. Measured: the dictionary holds a `hint` for all
// 78 rows, and 19 of them stand on the `Row Title Panel`, the `Resource Roster`
// and the `Properties Panel`, which carry no `CommandItem` -- so those 19 were
// silent whatever the pointer did. The explanation is keyed by the ROW, so the
// row the pointer rests on is looked up directly and no roster is walked.
//
// ⛔ NOTHING RAISES `TooltipAnchor`'s `rowTitle` CASE ANY MORE. FR-085 (MUST
// NOT) forbids explaining a cut row name at all: UF-63 ends the cut in an
// ellipsis (U+2026), and a reader who wants the rest widens the panel (FR-052).
// IN-3 of table T-028 no longer names FR-085 among the triggers it governs
// either (CR-257).
// ⚠️ THIS FILE HELD A THIRD ANCHOR UNTIL THEN, and the pointer condition it was
// tested against was one day old -- CR-252 added it, on a measurement of six
// explanations standing over an untouched screen. The panel replaced it whole.
// ⛔ The `rowTitle` case itself is not removed: screen-renderer.ts spells
// `TooltipAnchor`, and Chapter 5.3 fixes that contract outside this folder.
//
// ⭐ FR-048'S ROSTER OF WHAT COUNTS AS "THE DRAWN CONTENT CHANGED" ON A POINTER
// MOVE NAMES BOTH TRIGGERS ABOVE. It did not name FR-037's until CR-254: that
// hint is raised and dropped purely by where the pointer is, so while it was
// off that roster a frame need never have been asked for on a move and the hint
// could stand after its trigger had left.
// ⚠️ Nothing is done about it here all the same: this unit describes ONE frame
// and does not decide when a frame is asked for.
//
// ⛔ FR-029 ALSO PUTS A TOOLTIP ON AN ENDPOINT THAT CANNOT BE GRABBED. That
// endpoint lives inside the `Row Area`, which this component does not describe,
// and `TooltipAnchor` carries no case for it. Nothing is invented for it here.

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

// ⭐ WHERE THE WORDS COME FROM. FR-038 (MUST) holds every word the screen prints
// as one dictionary per language, and Chapter 6.2 fixes its manuscript as
// `_source/display-words.json`; `display-words.json` beside this file is that
// manuscript generated into `src/`. This unit reads two of its sections: the
// `hint` of a row of table T-109 -- the explanation EZ-2 of table T-040 shows --
// and the assignments of table T-023, which is what FR-037 puts on a scrollbar.
// ⚠️ Every one of the 176 cells is still empty (PD-160), so what reaches the
// screen today is the stand-in beside each lookup. Reading `displayWords` does
// not make this unit `semi-pure-a`: it is a module constant compiled into the
// program, not state read while running. Table T-075 fixes UF-69 as `pure`.

/**
 * The hints of table T-109's rows, keyed by the row id, and the words of table
 * T-023's assignments, keyed by theirs.
 *
 * ⭐ `Map`s rather than a scan per tooltip: a description is built for every
 * frame, and rule 05 of docs/development-rules forbids a linear search on that
 * path (NFR-013).
 */
const HINTS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))
const ASSIGNMENTS_BY_ROW = new Map(displayWords.assignments.map((entry) => [entry.rowId, entry]))

/**
 * Which row of table T-023 assigns the faster way of scrolling that axis.
 *
 * ⭐ The row id is the join the specification itself prescribes, it cannot go
 * stale when the assignment changes, and ⛔ it cannot be mistaken for a settled
 * English name the glossary has not settled -- which is why it is also the key
 * the dictionary holds the words under, and the stand-in while it holds none.
 */
const FASTER_SCROLL_ASSIGNMENT_ROWS: Readonly<Record<'horizontal' | 'vertical', string>> = {
  horizontal: 'MK-5',
  vertical: 'MK-1',
}

/**
 * The explanation EZ-2 of table T-040 shows against one entry, in the display
 * language (FR-038).
 *
 * ⛔ THE STAND-IN IS THE ENTRY'S OWN LABEL AND NOT THE EMPTY STRING. FR-029
 * (MUST) makes an entry that cannot be used give its REASON here rather than
 * going quiet, and an empty tooltip is exactly the silence that requirement
 * exists to prevent -- so while the dictionary holds no hint, the label stands
 * in, which is what this file printed before the dictionary was wired.
 * ⚠️ `hint` is a SECOND word and not a spelling of `label`: `CommandItem.label`
 * says so in as many words, and UF-62 / UF-65 / UF-66 fill the label without
 * ever reading this one.
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
 * an instruction to print nothing. The day a word is written this line stops
 * standing in without being edited.
 * ⚠️ A row the dictionary does not hold AT ALL is a second condition, answered
 * separately although with the same stand-in; it cannot happen while
 * `npm run gen:check` passes.
 *
 * @purity pure
 */
/**
 * What one entry of table T-109 is assigned, or `null` where nothing is.
 *
 * ⭐ THE JOIN IS THE SPECIFICATION'S NOW. CR-285 gave table T-036 and table
 * T-023 an 入口 column naming, by row id, the entrance each assignment
 * drives; `help-roster.json` carries it as `drives` and this map turns it
 * round. ⛔ THE TURNING IS DONE ONCE, HERE, and not by a table written
 * twice: the same fact read from the other end would be the duplication
 * R3.4 refuses.
 * ⚠️ ONE ENTRANCE MAY BE DRIVEN BY TWO ROWS -- IC-13 by SK-16 (a key) and
 * by MK-3 (the wheel). The roster is in the order FR-036 lists the tables,
 * so table T-023 lands first and the pointer's own gesture is what a person
 * resting a pointer is told about.
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
  // ⛔ THE MOUSE OPERATION IS A WORD (FR-036, MUST) and the key is not, so
  // this half comes from the dictionary and the `操作` column is never read.
  const press = PRESS_BY_ROW.get(found.row)?.press[language]
  return press === undefined || press === '' ? null : press
}

/**
 * The explanation EZ-2 shows for one row of table T-109, in the display
 * language.
 *
 * ⛔ THE STAND-IN IS THE ROW'S OWN LABEL AND THEN THE ROW ID, and neither is
 * the empty string: FR-029 (MUST) makes an entry that cannot be used give its
 * REASON here rather than going quiet, and an empty tooltip is the silence that
 * requirement exists to prevent. ⚠️ The label comes from the dictionary and no
 * longer from a `CommandItem`: EZ-2 (MUST) reaches every row of table T-109,
 * and 19 of them stand where no `CommandItem` is drawn at all.
 * ⚠️ `hint` is a SECOND word and not a spelling of `label` -- `CommandItem.label`
 * says so in as many words.
 *
 * ⛔ THE FALLBACKS ARE WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
 * an instruction to print nothing.
 * ⚠️ A row the dictionary does not hold AT ALL is a second condition, answered
 * with the row id -- the stand-in `assignmentText` gives its reason for. It
 * cannot happen while `npm run gen:check` passes.
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
 * ⚠️ `textOfDay` writes the exchange partner's own type -- a day and a time
 * joined by this letter (EX-7 of table T-033) -- and EZ-6 (MUST) asks for the
 * day alone. Cutting there is how the panel spells a date column as well, so
 * neither file mints a date format.
 */
const DAY_TIME_SEPARATOR = 'T'

/**
 * One of EZ-6's two dates, as that row (MUST) spells it: `YYYY-MM-DD`, never a
 * month written as a word.
 *
 * ⭐ `dayOf` is the one place the reading of a stored date column lives and
 * `textOfDay` the one place its spelling does (FR-054, MUST / MUST NOT: the
 * lexical date part, no zone converted), so this file mints nothing.
 * ⚠️ A column that holds no date leaves the EMPTY STRING, which is EZ-6's
 * 「値を持たない項目は、その場所を空けること（MUST）」.
 *
 * @purity pure
 */
function dateText(stored: string | null): string {
  const day = dayOf(stored)
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

/**
 * What EZ-6 of table T-040 (MUST) shows over a `Task`: its name, then `start`
 * and `finish` in that order.
 *
 * ⛔ THE NAME IS NOT CUT (MUST). FR-002 cuts the label drawn on the bar and
 * says in as many words that this explanation is the only way the whole of it
 * can be read -- so nothing here shortens it.
 * ⭐ THE DATES ARE JOINED BY `/`, which is the row's own separator
 * (「開始・終了の順に `/` で並べること（MUST）」), and neither the mark nor a
 * digit is a word, so FR-038's dictionary holds none of this (the row says so).
 *
 * ⚠️ THE NAME IS JOINED TO THEM BY A SPACE, AND THAT IS NOT STATED. EZ-6 fixes
 * the separator BETWEEN THE TWO DATES and no other. A space is what this build
 * already puts between the two halves of an icon's explanation, on the ground
 * that 「a separator with meaning would be a word」 -- so the same nothing is
 * used here rather than a second mark. ⛔ Nothing is trimmed away: EZ-6 (MUST)
 * has an item with no value leave its place empty, and collapsing the joins
 * would move the dates into the name's place.
 *
 * @provisional PD-390
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
 * ⛔ THE STAND-IN IS THE ROW ID, for the reason
 * `FASTER_SCROLL_ASSIGNMENT_ROWS` gives -- it is what this file printed before
 * the dictionary was wired, and ⚠️ rule 03 section 1 forbids re-typing what
 * table T-023's assignment column says as firmly as it forbids inventing a word
 * for it. The fallback is written as `=== ''` for the reason `iconHint` gives.
 *
 * @purity pure
 */
function assignmentText(row: string, language: DisplayLanguage): string {
  const word = ASSIGNMENTS_BY_ROW.get(row)?.text[language]
  if (word === undefined) return row
  return word === '' ? row : word
}

/**
 * Half-open on both axes, as R3.4 asks: a point on the right or bottom edge
 * belongs to whatever comes next, so two lanes never both claim it.
 *
 * ⚠️ `screen-regions.ts` holds the same three lines and keeps them private --
 * PI-35 declares four members and this is not one of them, and Chapter 5.3 lets
 * nothing outside a folder read past its public entry. The copy is forced, not
 * chosen; R3.4 is what keeps the two from drifting apart in meaning.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/**
 * The explanations to show against this frame's parts.
 *
 * ⭐ The order is `TooltipAnchor`'s own: icons, then tasks, then scrollbars.
 * Rule 03 keeps a printed order rather than re-sorting it. ⚠️ The `rowTitle`
 * case stands among them in that union and is skipped rather than re-ordered
 * around -- see the head of this file for why nothing raises it.
 *
 * @purity pure
 */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  settings: DocumentSettings,
  session: ScreenSession,
): readonly Tooltip[] {
  const pointer = session.pointer

  // STOP -- ⚠️ NOT STATED: whether resting for exactly `iconHintDelayMs` is
  // already "after" it. S-124 gives the wait and EZ-2 gives no boundary.
  // Searched: FR-092 (table T-040), `_assets/tbl-settings.md`, table T-206.
  // ⭐ The endpoint is included, which is what rule 03's min/max convention
  // means and is the shorter of the two waits a reader could be asked for.
  // ⭐ ONE BINDING FOR BOTH RAISERS. EZ-6 (MUST) takes the same wait as EZ-2
  // and (MUST NOT) forbids one of its own, on the ground that 「同じ『止めて
  // 待つ』が場所によって違う速さになると、効いていないと読まれる」.
  const isHintDue = pointer !== null && session.pointerRestedMs >= settings.iconHintDelayMs

  const tooltips: Tooltip[] = []

  // ⭐ EZ-2'S PLACE CONDITION IS ANSWERED OFF-SEAM, NOT MEASURED HERE. Which
  // entry the pointer rests on arrives as `ScreenSession.iconUnderPointer`
  // (PD-141): no `CommandItem` carries a rectangle and `ScreenRegions` is not an
  // argument of this unit, so the side that DREW the entries (PI-38) is the one
  // side that can say, and it hands the answer over in the session. ⛔ Guessing
  // a rectangle here would be an invented layout, which is what that member
  // exists to prevent.
  // ⚠️ WHILE NO ANSWER WAS CARRIED, this file offered EVERY entry whose wait had
  // come due and left the surface to pick -- one explanation per entry per
  // frame, for a MUST that EZ-2 puts on ONE entry.
  //
  // ⛔ `isEnabled` IS NOT A CONDITION HERE. FR-029's tooltip MUST is about an
  // endpoint that cannot be grabbed, and it states no time condition and no
  // place condition anywhere -- so an entry that cannot be used is explained
  // under EZ-2's two conditions exactly like a usable one. ⚠️ An exemption that
  // put every spent entry up every frame, pointed at or not, was invented here
  // and is what the person using it reported.
  //
  // STOP -- ⛔ STILL NOT CARRIED: the REASON FR-029 wants on an entry that
  // cannot be used. The dictionary holds a `label` and a `hint` per row of table
  // T-109, and neither is keyed on the entry being spent -- so nothing says why
  // THIS entry is. Searched: `display-words.json`, `_source/display-words.json`,
  // FR-029, table T-109, table T-040 (EZ-2), table T-016. ⭐ The hint stands in
  // so the entry is not silent -- FR-029's RATIONALE is that an entry which does
  // nothing reads as a fault.
  //
  // ⭐ Both of EZ-2's conditions belong to the session rather than to any one
  // entry, so they are met once and what is left is to look the row up.
  //
  // ⛔ NO ROSTER IS WALKED, WHICH IS THE WHOLE OF EZ-2's SECOND MUST NOT.
  // 「対象は…表 T-109 の全行とすること（MUST）。載る面によって説明を出さない行が
  // あってはならない（MUST NOT）」. The row the pointer rests on already IS a row
  // of that table -- `readScreenPartAt` reads it off the entry that was drawn --
  // so an entry that carries it need not be found a second time. ⚠️ That the
  // row is ON THE SCREEN follows from the pointer resting on it, not from a
  // roster: nothing that was not drawn can be rested on.
  const iconWithHintDue = isHintDue ? session.iconUnderPointer : null
  if (iconWithHintDue !== null) {
    tooltips.push({
      anchor: { kind: 'icon', icon: iconWithHintDue },
      text: iconHint(iconWithHintDue, session.language),
      // EZ-2 (MUST): 「説明の後ろに、その行の割当も出すこと」.
      assignment: entryAssignment(iconWithHintDue, session.language),
    })
  }

  if (pointer === null) return tooltips

  // EZ-6 of table T-040 (MUST): the Task the pointer has rested on says its
  // name and its two dates, and 「ポインタが動いたら消すこと（MUST）」 -- which
  // is the wait beginning again, so it is the same one condition read once.
  //
  // ⛔ WHICH Task IS NOT DECIDED HERE (MUST NOT): the row sends that to table
  // T-023d's order and forbids a second hit test, so `taskUnderPointer` is the
  // answer of the one side that walks it.
  // ⚠️ A DESCRIPTION THAT DOES NOT CARRY THE MEMBER reads as a pointer on no
  // Task -- see its declaration.
  const task = isHintDue ? (session.taskUnderPointer ?? null) : null
  if (task !== null) {
    tooltips.push({
      anchor: { kind: 'task', taskUid: task.uid },
      text: taskHint(task),
      // ⚠️ EZ-6 asks for a name and two dates and for nothing else. The
      // assignment is EZ-2's own MUST, and table T-023's rows assign gestures
      // rather than rows of table T-109, so there is nothing to put here.
      assignment: null,
      // @provisional PD-391 -- see `Tooltip.at`.
      at: pointer,
    })
  }

  // ⚠️ Every lane the pointer is in answers, and no priority is invented for the
  // corner where two lanes could meet: MK-9a demands a priority for grab targets
  // that overlap, but table T-023a limits that whole scheme to the schedule's
  // drawing area and lists the scrollbar as a surface FR-037 governs instead.
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

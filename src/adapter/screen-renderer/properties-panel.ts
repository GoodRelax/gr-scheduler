// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-64 fills one member of ScreenView -- `propertiesPanel` -- and reads none of
// the others. The signature published here is the one the "nine unit contracts"
// section of screen-renderer.ts fixes.
//
// ⭐ WHICH OF THE TWO IS SHOWING IS NOT DECIDED HERE. FR-072 makes the LAST
// operation decide, and nothing in this component sees an operation, so the
// answer arrives as `ScreenSession.propertiesShowing` and is carried through
// untouched. ⛔ That is also how FR-072's MUST NOT is kept: clearing the
// selection cannot move the panel to the settings, because this unit never
// chooses `showing` -- an empty selection moves `isSubjectGone`, never `showing`.
//
// ⭐ WHAT THE SUBJECT IS. FR-006 speaks of one task and FR-009 of one dependency
// line, while SL-7b of table T-023c forbids relying on the order of a selection
// that was made all at once. So the subject is the single item when exactly one
// is held, and the one picked last otherwise -- `lastPicked` answers `null` for
// a marquee, and then the panel describes nothing.
//
// ⭐ THE SUBJECT HAS TWO HALVES, because a row is picked apart from everything
// else: SL-1 of table T-023c leaves `TaskGroup` out of the drawing area's
// selection and FR-085 gives rows their own set. `PropertiesSubject` is that
// pair, and FR-042 (MUST) puts the picked row's colour and height on this same
// panel -- both halves are described, and both are `showing: 'selection'`.
//
// ⭐ A FIELD PER ROW OF TABLE T-016, NOT PER COLUMN. Four rows hold several
// columns, and the table writes their item names into ONE cell with " / "
// between them. A field carries one name, one text and one `isEditable`, and the
// table's read-only mark is per row -- so the row is the field, and its value is
// written with the same separator the name cell uses, part answering part.
//
// ⭐ A CONTROL PER COLUMN, WHICH IS WHY THE TWO COUNTS DIFFER. A person edits
// one column at a time, so `PropertyField.controls` runs per column while the
// name, the text and the read-only mark stay per row. ⛔ The form each takes is
// table T-016's 入力の型 column, and the paragraph under that table (MUST NOT)
// forbids the choices, the numeric bounds and the date columns to be written
// into it -- `COLUMN_SHAPES` and `DATE_COLUMNS` are where those come from. Two
// answers the table itself holds are written out (which columns are colours and
// which are multi-line), and one more that no manuscript can hold: `PR-15` is
// 選択 over the document's own tasks, so the column reads as an integer.
//
// ⛔ THE ITEM NAMES ARE NOT TYPED OUT. Every item of table T-016 but the
// assignee's is a column of `Task` or of `TaskVisual`, and the dependency and
// row rosters are columns too, so each holds `keyof` the type that owns it and
// builds the name from that: a column the specification renames stops compiling
// here instead of going stale in silence (rule 03 of docs/development-rules).
// ⚠️ The roster keeps table T-016's own printed order, which is NOT the numeric
// order of its row ids: that table is ordered by how often a value is touched
// (利用者の裁定 2026-08-26), so PR-16 stands third and PR-15 last.
//
// ⚠️ ONLY THE HEADING IS TRANSLATED. FR-038 leaves the item names of table
// T-016 alone, as it leaves task and row names alone, and that table says why
// they stay in English; the values are the document's own. What FR-038 does
// reach on this panel is the three headings FR-072 asks for, which are read
// from the dictionary below.
//
// ⛔ ONE ROW IS READ-ONLY. Table T-016 marks PR-9 alone, because FR-012 derives
// it. ⚠️ PR-16 is NOT one of them any more: CR-186 gave the assignee a surface,
// and AS-5 of table T-225 makes the panel's assignee editable (MUST).
//
// ⭐ THE ASSIGNEE IS THE ONE ITEM WITH NO COLUMN OF ITS OWN. AS-6 (MUST) shows
// the person a name and writes a uid, so the field carries the names the task's
// assignments reach through `Resource` -- which is also the lookup AS-9 requires
// -- and never a uid.
//
// ⭐ AND IT NOW CARRIES THE FORM THE TABLE NAMES FOR IT. Table T-016 writes
// PR-16's 入力の型 as 選択 and the paragraph under it (MUST) has the form follow
// that column, so the field offers one `choice` control over the roster --
// `assigneeChoices` walks the document's own `Resource` rows the way `choicesOf`
// walks its tasks for PR-15. ⛔ WHAT IS STILL MISSING IS THE SEARCH HALF OF AS-5
// (MUST): `PropertyControl` has no member for a partial-match filter and IF-9
// puts the drawn chooser past this seam, so nothing on this side can state it.
// A control that is only a dropdown meets the 名簿から選ばせる half and leaves
// the 部分一致の検索 half unmet, where no control at all left FR-006's own MUST
// unmet as well -- which is why the earlier refusal to invent one is not kept.
// ⭐ AS-9 IS MET, AND THE READING THAT SAID IT COULD NOT BE WAS WRONG. This
// note used to hold that choosing a `uid` needed the uid ON the screen, which
// AS-6 (MUST NOT) forbids -- but AS-9's trigger is 「プロパティパネルで `uid`
// を選んだ」 and its rule is 「その `uid` の `Resource` へ割り当て、担当者名は
// 名簿から引き当てて示すこと」: CHOOSING and SHOWING are two acts, and AS-6
// bans only the second. A candidate that carries the `uid` and shows the name
// answers both (`PropertyControl.choiceValues`), so two people of one name are
// two candidates here -- which AS-9 calls the only route there is, and which
// MG-5 of table T-032 (MUST NOT) keeps the screen from folding.
//
// ⛔ AS-2's `-` DOES NOT REACH THIS PANEL'S VALUE. That row belongs to the
// assignee LABEL, and AS-3 makes `-` the signal that CLEARS an assignment:
// writing it into this panel's value would spell "clear me" at the very surface
// that edits it. ⚠️ It is not among the candidates either -- AS-4 (MUST NOT)
// keeps `-` out of the roster -- but the write side still reads it as AS-3's
// signal, because AS-5's search box is a place a person can type it.
//
// ⭐ HOW A DATE IS WRITTEN. FR-054 (MUST) takes the lexical date part of a date
// column and (MUST NOT) converts no zone; `dayOf` is where that happens once for
// the whole product. The spelling is the date part of what `textOfDay` writes
// (EX-7 of table T-033), so no second date format is minted here.
//
// ⭐ THE WAY OUT IS READ FROM THE GENERATED ROSTER, NOT LISTED HERE. FR-029
// (MUST) makes the roster of icons AND where each one is placed follow table
// T-109, and that table's 面 column IS the placement -- it stands one row on
// this panel, among six surfaces, on the authority of IN-4 of table T-028.
// `icon-roster.json` is that table generated into `src/`, so `panelCommands`
// below reads the placement where it lives instead of naming a row here, which
// is the shape `app-header-items.ts` and `open-modals.ts` already take.
//
// ⛔ Every STOP note below says what the specification leaves open. The loudest
// is the settings side, which has no row ids to name.

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  DATE_COLUMNS,
  dayOf,
  taskByUid,
  textOfDay,
  type Dependency,
  type Schedule,
  type Task,
  type TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import {
  lastPicked,
  type ItemRef,
  type Selection,
} from '../../entity/document-model/selection/selection'
import type {
  CommandItem,
  DisplayLanguage,
  IconId,
  PropertiesPanel,
  PropertiesSubject,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  PropertyFieldKey,
  ScreenSession,
} from './screen-renderer'
import displayWords from './display-words.json'
import iconRoster from './icon-roster.json'

// ------------------------------------------------------------- the words ----

/**
 * What stands between the parts of one field.
 *
 * ⭐ It is table T-016's own spelling, taken from the item-name cell of the rows
 * that hold several columns, and it is used for the value as well so that the
 * name and the text line up part for part. The same separator joins the several
 * names a task's assignments can reach and the members of a settings key that
 * holds a list -- one rule, so a reader who learns it once can read every field.
 */
const PART_SEPARATOR = ' / '

/** How table T-104 and `SETTINGS_DEFAULTS` spell a key that reaches inside a group. */
const KEY_PATH_SEPARATOR = '.'

/** What `textOfDay` puts between the day and the time of day (EX-7 of table T-033). */
const DAY_TIME_SEPARATOR = 'T'

// ⭐ WHERE THE HEADINGS COME FROM. FR-072 (MUST) requires the heading to say
// which of the two is showing, and to say "no selection" once the selection has
// gone; FR-038 (MUST) requires panels to be shown in the chosen language and
// holds every word the screen prints as one dictionary per language, whose
// manuscript Chapter 6.2 fixes as `_source/display-words.json`.
// `display-words.json` beside this file is that manuscript generated into
// `src/`, and its `panelHeadings` section is these three.
// ⚠️ Reading `displayWords` does not make this unit `semi-pure-a`: it is a
// module constant compiled into the program, the way `DEFAULT_CALENDAR` is in
// `schedule.ts`, not external state read while running. Table T-075 fixes UF-64
// as `pure`.

/**
 * FR-072's three headings: the key the dictionary holds each under, beside what
 * this panel printed for it before the dictionary was wired.
 *
 * ⚠️ THREE HEADINGS OVER TWO SUBJECTS. `noSelection` is a key of the dictionary
 * and NOT a third value of `PropertiesPanel.showing`: that the selection has
 * gone is a third thing to SAY, not a third thing to show, and `isSubjectGone`
 * is where the panel says it.
 * ⛔ The stand-ins are the three ASCII tokens this file chose while the words
 * had nowhere to live: they are spelled as the `showing` union the contract
 * already settles, so the three states can be told apart and no wording is
 * minted here in either language.
 * ⚠️ THEY NO LONGER REACH THE SCREEN. PD-160 is settled and all three cells
 * carry a word in both languages, so what prints is the dictionary's. They stay
 * because that ruling has the printing side fall back whenever a cell is empty,
 * which is a state the manuscript can return to.
 */
const PANEL_HEADINGS = {
  selection: { key: 'selection', standIn: 'selection' },
  subjectGone: { key: 'noSelection', standIn: 'selection (none)' },
  documentSettings: { key: 'documentSettings', standIn: 'documentSettings' },
} as const

/**
 * ⭐ A `Map` rather than a scan: a description is built for every frame, and
 * rule 05 of docs/development-rules forbids a linear search on that path
 * (NFR-013).
 */
const HEADINGS_BY_KEY = new Map(displayWords.panelHeadings.map((entry) => [entry.showing, entry]))

/**
 * One heading of the panel, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing, and PD-160's ruling turns on the difference: an empty cell means the
 * word has not been written, not an instruction to print nothing -- and FR-072
 * (MUST) requires this panel to SAY which of the two it is on, so printing
 * nothing would break it outright.
 * ⚠️ All three words are written today, so this line stands in for nothing; it
 * is what that ruling has the printing side do if a cell is ever emptied again.
 * ⚠️ A key the dictionary does not hold at all is a second condition, answered
 * separately although with the same stand-in; it cannot happen while
 * `npm run gen:check` passes.
 *
 * @purity pure
 */
function headingOf(
  heading: (typeof PANEL_HEADINGS)[keyof typeof PANEL_HEADINGS],
  language: DisplayLanguage,
): string {
  const word = HEADINGS_BY_KEY.get(heading.key)?.text[language]
  if (word === undefined) return heading.standIn
  return word === '' ? heading.standIn : word
}

// ------------------------------------------------ the way out (table T-109) --

/**
 * The value table T-109's 面 column carries for this panel -- U-25 of table
 * T-103.
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), not a value
 * invented here: it is the join between this unit and the generated roster, and
 * the same spelling `icon-roster.json` prints in that column.
 */
const PROPERTIES_PANEL = 'Properties Panel'

/**
 * The words of table T-109's rows, keyed by the row id.
 *
 * ⭐ A `Map` rather than a scan per entry, for the reason `HEADINGS_BY_KEY`
 * gives: a description is built for every frame and rule 05 forbids a linear
 * search on that path (NFR-013).
 */
const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/** What an entry says while the dictionary holds no word for its row (PD-160). */
const NO_ENTRY_WORDS = ''

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`, for the
 * reason `headingOf` gives above: an empty cell means the word has not been
 * settled (PD-160), which is a different thing from a settled empty word.
 * ⚠️ The cell is written today, so this stands in for nothing.
 *
 * @purity pure
 */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = ENTRY_WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

/**
 * The entries table T-109 places on this panel, in that table's own order.
 *
 * ⭐ ONE PASS OVER THE GENERATED ROSTER RATHER THAN A LIST WRITTEN HERE, which
 * is the shape the two units that already draw a surface's entries take --
 * `headerCommands` in `app-header-items.ts` and `commandsOnSurface` in
 * `open-modals.ts`. FR-029 (MUST) makes both the roster and the
 * placement follow table T-109, and its 面 column IS the placement -- so
 * membership, print order and count all come from the table and rule 03 section
 * 1's ban on re-typing a value the specification holds is kept.
 *
 * ⛔ NO ROW ID IS NAMED. The one row the column places here today closes an open
 * surface on IN-4's authority, and naming it would be the copy that goes stale
 * when the table is renumbered.
 *
 * ⭐ `isEnabled` IS TRUE. FR-029 draws faint what cannot be used NOW, and a
 * surface that is being described is a surface that is open -- closing it is
 * always something a person may do. ⚠️ That is also why nothing here reads
 * `showing`: FR-072 turns the panel between two contents and neither is a
 * reason to take away the way out.
 * ⛔ `isPressed` IS FALSE: nothing on this panel is a toggle that stays down.
 * ⛔ `isArmed` IS FALSE AND IS NOT A GAP: the 構え column -- which FR-053 makes
 * the authority for which entrance is which arm -- holds an em dash for every
 * row of every surface but the `Command Palette`.
 *
 * ⚠️ Reading `iconRoster` does not make this unit `semi-pure-a`: it is a module
 * constant compiled into the program, the way `DEFAULT_CALENDAR` is in
 * `schedule.ts`, not external state read while running. Table T-075 fixes UF-64
 * as `pure`.
 *
 * @purity pure
 */
function panelCommands(language: DisplayLanguage): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(PROPERTIES_PANEL))
    .map((row) => ({
      icon: row.rowId,
      isEnabled: true,
      isPressed: false,
      isArmed: false,
      label: entryLabel(row.rowId, language),
    }))
}

// ------------------------------------------------------- table T-016 --------

/**
 * One row of table T-016. `columns` carries the names the row's item-name cell
 * holds, and `heldBy` says where their values live -- PR-16 is the only row
 * whose substance is not a column, which that table states in as many words.
 */
type PropertyItem =
  | { readonly row: string; readonly heldBy: 'task'; readonly columns: readonly (keyof Task)[] }
  | { readonly row: string; readonly heldBy: 'taskVisual'; readonly columns: readonly (keyof TaskVisual)[] }
  | { readonly row: string; readonly heldBy: 'assignment'; readonly columns: readonly ['assignee'] }

/**
 * Table T-016's rows, in the order the table prints them.
 *
 * ⛔ THE PRINTED ORDER IS A MUST AND IT IS NOT THE NUMERIC ONE. The paragraph
 * under that table (利用者の裁定 2026-08-26) requires the items to be shown in
 * the order the table prints them and (MUST NOT) forbids the values touched
 * most often to be reached by scrolling -- the table is ordered by how often a
 * value is touched, so re-sorting this roster by row id would silently undo
 * that ruling. ⚠️ `PR-16` stands third and `PR-15` last; rule 03 section 4 has
 * the same thing to say about keeping a table's own order.
 *
 * ⚠️ `assignee` is the one name written out rather than read off a generated
 * type: PR-16's own note says the item is not a column of `Task`, that its
 * substance is `Assignment`, and that the name shown is derived from the
 * assignment.
 */
const PROPERTY_ITEMS: readonly PropertyItem[] = [
  { row: 'PR-1', heldBy: 'task', columns: ['name'] },
  { row: 'PR-3', heldBy: 'task', columns: ['start', 'finish'] },
  { row: 'PR-16', heldBy: 'assignment', columns: ['assignee'] },
  { row: 'PR-4', heldBy: 'task', columns: ['actualStart'] },
  { row: 'PR-5', heldBy: 'task', columns: ['actualDuration'] },
  { row: 'PR-6', heldBy: 'task', columns: ['actualFinish'] },
  { row: 'PR-9', heldBy: 'task', columns: ['percentComplete'] },
  { row: 'PR-10', heldBy: 'task', columns: ['deadline'] },
  { row: 'PR-2', heldBy: 'task', columns: ['notes'] },
  { row: 'PR-7', heldBy: 'task', columns: ['resume'] },
  { row: 'PR-8', heldBy: 'task', columns: ['resumeValid'] },
  { row: 'PR-17', heldBy: 'taskVisual', columns: ['milestoneGlyph'] },
  { row: 'PR-12', heldBy: 'taskVisual', columns: ['strokeColor', 'fillColor', 'lineWeight'] },
  { row: 'PR-13', heldBy: 'taskVisual', columns: ['nameAnchor', 'nameAlign'] },
  { row: 'PR-14', heldBy: 'task', columns: ['fadeInDays', 'fadeOutDays'] },
  { row: 'PR-15', heldBy: 'task', columns: ['wbsParentUid'] },
]

/**
 * The rows table T-016 marks read-only.
 *
 * ⛔ Kept as a roster of row ids rather than a flag on every entry, so a row the
 * table stops marking loses its mention here and nowhere else. ⚠️ PR-16 was one
 * of these until CR-186 and is not any more -- read the table as it stands.
 */
const READ_ONLY_ROWS: readonly string[] = ['PR-9']

// ------------------------------------------------------------ the values ----

/**
 * A stored value written out for the screen.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how a number, a truth value or a
 * list is spelled on this panel. Looked in table T-016 (it fixes the items and
 * which are read-only, and no spelling), in FR-006, in FR-072 and in
 * `_assets/tbl-settings.md` (no row for the panel's contents). Chose the value's
 * own stored spelling and nothing else: the enumerations already carry the
 * spellings CR-172 settled, and ⚠️ although FR-038's dictionary now exists, it
 * holds no section for a stored value -- a word added here would be one nobody
 * could translate. ⚠️ A column that holds nothing writes nothing -- FR-007
 * turns on the difference between a value that was chosen and one that was
 * never set, so a default must not be written in where the document holds none.
 *
 * @purity pure
 */
function textOfValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOfValue).join(PART_SEPARATOR)

  // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how a settings key whose value
  // is a group of its own is written (`dualCursor` is the one such key that
  // reaches here whole). Looked in table T-104, `_assets/tbl-settings.md` and
  // `_source/settings.json`, which gives it a type but no spelling. Chose
  // nothing over a shape invented here.
  return ''
}

/**
 * A date column written out for the screen.
 *
 * ⭐ FR-054 (MUST) takes the lexical date part and (MUST NOT) converts no zone,
 * and `dayOf` is the one place that reading lives. The spelling is the date part
 * of `textOfDay`'s own (EX-7), so this file mints no date format.
 *
 * @purity pure
 */
function textOfDateColumn(stored: unknown): string {
  const day = typeof stored === 'string' ? dayOf(stored) : null
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

/**
 * ⚠️ Which columns are dates is read from `DATE_COLUMNS`, which is generated
 * from the manuscript -- a roster written out here would go stale the moment a
 * column is added. `TaskVisual` has no entry there, so no visual column can be
 * a date.
 *
 * @purity pure
 */
function textOfTaskColumn(task: Task, column: keyof Task): string {
  if (DATE_COLUMNS.Task.includes(column)) return textOfDateColumn(task[column])
  return textOfValue(task[column])
}

/**
 * One person the panel shows for PR-16: the name AS-6 (MUST) shows, beside the
 * `uid` the same row (MUST NOT) lets a person be made to read. ⚠️ The uid orders
 * two people of one name (AS-8) AND is what a candidate commits (AS-9); it never
 * reaches a word on the screen.
 */
interface Assignee {
  readonly name: string
  readonly uid: number
}

/**
 * Name ascending, and the smaller uid first where two carry the same name, which
 * is AS-8's tie-break and the order FR-059 already puts assignees in.
 *
 * @purity pure
 */
function compareAssignees(a: Assignee, b: Assignee): number {
  if (a.name === b.name) return a.uid - b.uid
  return a.name < b.name ? -1 : 1
}

/**
 * The names of the people the task's assignments reach.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how several assignees are written
 * on this panel. FR-059's "the first name and the count of the rest" governs the
 * assignee LABEL, and AS-5 of table T-225 makes this a different surface with no
 * width rule of its own. Looked in table T-225 (AS-5 / AS-6 / AS-9), FR-059,
 * FR-008 and table T-016. Chose every name, in the order the specification puts
 * assignees in elsewhere -- name ascending, the smaller uid first, which is
 * AS-8's tie-break -- joined by the separator this file already uses between the
 * parts of one field. ⛔ FR-059's work-resource filter is NOT borrowed: it keeps
 * materials and costs off the drawing, whereas this is the surface that edits
 * the assignment, so hiding one here would leave it unremovable. ⚠️ A resource
 * with no name is left out because there is no name to show, and AS-6 (MUST NOT)
 * forbids putting the uid on the screen instead. ⚠️ The order of two unlike
 * names is by code unit: no row fixes a collation, and a locale-dependent one
 * would order the same document differently on two machines.
 *
 * @purity pure
 */
function assigneeText(schedule: Schedule, taskUid: number): string {
  const assignees: Assignee[] = []

  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    const resource = schedule.resources.find((held) => held.uid === assignment.resourceUid)
    if (resource === undefined || resource.name === null) continue
    assignees.push({ name: resource.name, uid: resource.uid })
  }

  assignees.sort(compareAssignees)
  return assignees.map((assignee) => assignee.name).join(PART_SEPARATOR)
}

/**
 * The candidates AS-5 (MUST) has PR-16 choose from -- 名簿から選ばせる形.
 *
 * ⭐ THE ROSTER IS WALKED, NOT WRITTEN OUT, which is the shape `choicesOf`
 * already takes for PR-15: the candidates are the `Resource` rows this document
 * holds, so no list here can disagree with the document, and the paragraph under
 * table T-016 (MUST NOT) forbids a roster of choices to be stated a second time.
 *
 * ⛔ ONE ENTRY PER PERSON, NEVER ONE PER NAME. AS-8 (MUST NOT) forbids two
 * same-named people to be merged and MG-5 of table T-032 says the same thing
 * pointing back at it, while AS-9 (MUST) calls this chooser the one place they
 * can be told apart -- so folding the roster on the name would close the only
 * route the specification gives. The two carry the same word and different
 * values: AS-6 (MUST NOT) keeps the `uid` out of the word, and `choiceValues`
 * is what carries it instead.
 * ⚠️ A resource with no name is left out for the reason `assigneeText` gives:
 * there is no name to show and AS-6 forbids the uid in its place.
 * ⛔ FR-059's work-resource filter is NOT borrowed, for the reason `assigneeText`
 * gives as well: it keeps materials and costs off the DRAWING, and this is the
 * surface that edits the assignment.
 * ⚠️ The order of two unlike names is by code unit, as it is in `assigneeText`:
 * no row fixes a collation, and a locale-dependent one would order the same
 * document differently on two machines. Two of one name stand smaller uid first,
 * which is AS-8's own tie-break.
 *
 * @purity pure
 */
function assigneeChoices(schedule: Schedule): readonly Assignee[] {
  const people: Assignee[] = []
  for (const resource of schedule.resources) {
    if (resource.name === null) continue
    people.push({ name: resource.name, uid: resource.uid })
  }
  people.sort(compareAssignees)
  return people
}

// --------------------------------------------------------- the controls ----

/**
 * The two things the paragraph under table T-016 says that table itself newly
 * holds: which columns are colours, and which are multi-line.
 *
 * ⛔ EVERYTHING ELSE IS DERIVED AND NOT LISTED. That paragraph (MUST NOT)
 * forbids the choices, the numeric bounds and the date columns to be written
 * into the table on the ground that `_source/grs-document.schema.json` and
 * `DATE_COLUMNS` already hold them -- so `COLUMN_SHAPES` and `DATE_COLUMNS`
 * answer for those, and only these two rosters are written out.
 *
 * ⚠️ `TaskGroup.color` IS HERE THOUGH TABLE T-016 HAS NO ROW FOR IT. That table
 * is the `Task` one; AT-58 reaches this panel through FR-042, which calls it the
 * row's 帯の色 in as many words. ⛔ The schema cannot answer for a colour: every
 * one of the three is a plain `string` there, which is what makes this the one
 * question the table had to answer itself.
 */
const COLOUR_COLUMNS: readonly string[] = ['strokeColor', 'fillColor', 'color']

/** Table T-016's 複数行, which is `PR-2` alone today. */
const MULTILINE_COLUMNS: readonly string[] = ['notes']

/**
 * The one item table T-016 calls 選択 whose candidates are not an enumeration.
 *
 * ⛔ THE MANUSCRIPT CANNOT ANSWER FOR THIS ONE, and that is why it is written
 * out. `COLUMN_SHAPES` says `wbsParentUid` is an integer, because its
 * candidates are the document's own tasks rather than a fixed set -- so reading
 * the kind off the column alone would offer a box to type a uid into where
 * table T-016 asks for a chooser. ⚠️ `choicesOf` is where the candidates come
 * from, and its STOP note says what the table leaves open about them.
 */
const CHOICE_OVER_DOCUMENT_COLUMNS: readonly string[] = ['wbsParentUid']

/**
 * Which entity of `COLUMN_SHAPES` holds an item's columns.
 *
 * ⚠️ `PR-16` has no entity here on purpose: that row's own note says the item is
 * not a column at all.
 */
type ShapedEntity = keyof typeof COLUMN_SHAPES

/**
 * The form one column is edited in -- table T-016's 入力の型 column, worked out
 * from what the column accepts rather than from a roster written out here.
 *
 * ⭐ THE ORDER OF THE TESTS IS THE ANSWER. A colour, a multi-line note and a
 * date are all `string` in the manuscript, and the WBS parent is an `integer`
 * there although table T-016 calls it 選択 -- so the four questions the
 * manuscript cannot answer are asked first, and the ones it can are asked
 * after. ⚠️ The date is asked from `DATE_COLUMNS`, which is generated: a
 * roster of date columns written out here would go stale the moment one was
 * added, which is the very reason that constant exists.
 *
 * @purity pure
 */
function controlKindOf(entity: ShapedEntity, column: string): PropertyControlKind {
  if (COLOUR_COLUMNS.includes(column)) return 'color'
  if (MULTILINE_COLUMNS.includes(column)) return 'multiline'
  if (CHOICE_OVER_DOCUMENT_COLUMNS.includes(column)) return 'choice'
  const dates: readonly string[] = entity === 'Task' ? DATE_COLUMNS.Task : []
  if (dates.includes(column)) return 'date'

  const shape = COLUMN_SHAPES[entity][column]
  if (shape === undefined) return 'text'
  switch (shape.kind) {
    case 'enum':
      return 'choice'
    case 'boolean':
      return 'boolean'
    case 'integer':
    case 'number':
      return 'number'
    default:
      // ⚠️ `map`, `array` and `object` land here too, and none of them is an
      // item of table T-016 -- no row of that table names a column of one of
      // those kinds. ⛔ Nothing is invented for them: a text control shows what
      // the value is and the write side has no command that takes one.
      return 'text'
  }
}

/**
 * What a `choice` control offers, and `null` for every other kind.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what the WBS parent (`PR-15`) is
 * chosen from. Table T-016 calls the item 選択 and says the depth is derived
 * from it; the schema gives `wbsParentUid` no enumeration, because its
 * candidates are the document's own tasks and not a fixed set. Looked in table
 * T-016, `_source/grs-document.schema.json`, FR-005 and table T-058 (AT-26).
 * Chose every OTHER task's uid, in the order the document holds them, with the
 * empty spelling first for a task that has no parent -- which is what AT-26's
 * `null` means. ⛔ Descendants are NOT filtered out here: FR-005's cycle rule is
 * the write side's (CM-18), and a chooser that judged it would be a second
 * reading of one rule.
 *
 * @provisional PD-272
 * @purity pure
 */
function choicesOf(
  schedule: Schedule,
  entity: ShapedEntity,
  column: string,
  subjectUid: number | null,
): readonly string[] | null {
  if (entity === 'Task' && column === 'wbsParentUid' && subjectUid !== null) {
    return [
      '',
      ...schedule.tasks.filter((one) => one.uid !== subjectUid).map((one) => String(one.uid)),
    ]
  }
  return COLUMN_SHAPES[entity][column]?.choices ?? null
}

/**
 * One control of one field.
 *
 * ⚠️ The bounds are the schema's, unread for any kind but `number`: a control
 * that is not a number has nothing to clamp, and carrying a bound onto it would
 * offer the drawing side a rule it cannot apply.
 *
 * @purity pure
 */
function controlOf(
  schedule: Schedule,
  key: PropertyFieldKey,
  entity: ShapedEntity,
  column: string,
  text: string,
  subjectUid: number | null,
): PropertyControl {
  const kind = controlKindOf(entity, column)
  const shape = COLUMN_SHAPES[entity][column]
  return {
    key,
    kind,
    text,
    choices: kind === 'choice' ? choicesOf(schedule, entity, column, subjectUid) : null,
    min: kind === 'number' ? (shape?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? null) : null,
  }
}

/**
 * PR-16's one control: the 選択 table T-016 writes in its 入力の型 column.
 *
 * ⛔ THE KEY NAMES THE TASK AND CANNOT NAME THE ITEM. `PropertyFieldKey` has one
 * arm per HOLDER OF A COLUMN, and PR-16 is the one row of table T-016 whose
 * substance is not a column -- that row says so in as many words. What names it
 * is `PropertyField.row`, which IF-9 (「その欄が名乗る行 ID とともに返し」) fixes
 * as coming back BESIDE the key, so the side that turns a commit into a command
 * reads `PR-16` there and never reaches for a column.
 * ⚠️ `uid` IS THE COLUMN BECAUSE IT IS THE ONE THAT WRITES NOTHING. No row of
 * table T-108 sets a task's uid, so a commit that somehow arrived without its
 * row id names a column the write side answers with no command at all, rather
 * than one that would change a value the person never touched.
 *
 * ⭐ THE CONTROL STANDS EMPTY WHILE THE FIELD LISTS THE PEOPLE. A task may carry
 * several assignments, so the ROW's text is the several names joined and this
 * one control is where ONE person is settled -- by the `uid` their candidate
 * carries (AS-9), never by the word it shows. What a settled candidate does is
 * 割り当てる: AS-7 (MUST) creates the person and assigns, AS-10 (MUST) only
 * forbids a second assignment of someone already on the task, and no row of
 * table T-225 speaks of replacing -- 解除 has its own row and its own signal
 * (AS-3). ⛔ NOT the joined text: a chooser that handed several names back
 * untouched would be a name nobody is called, and AS-7 would make a `Resource`
 * of it.
 *
 * ⛔ SO THE ROW'S OWN TEXT IS THE ONLY PLACE THE PEOPLE ARE NAMED, and it has to
 * be drawn. FR-006 (MUST) puts the item on the panel and AS-6 (MUST) makes what
 * is shown a name -- a surface that draws a control INSTEAD of
 * `PropertyField.text` stops naming anybody on this one row, where every other
 * row's control carries its own value.
 *
 * @purity pure
 */
function assigneeControl(schedule: Schedule, taskUid: number): PropertyControl {
  const people = assigneeChoices(schedule)
  return {
    key: { holder: 'task', uid: taskUid, column: 'uid' },
    kind: 'choice',
    text: '',
    choices: people.map((person) => person.name),
    // ⭐ AS-9 (MUST): what is chosen is the `uid`, and what is shown is the name
    // the roster holds for it -- AS-6 (MUST NOT) forbids the second to be the
    // first. ⚠️ Spelled the way every other value crosses this seam, as text:
    // `FieldCommit.text` is one string whatever the control was.
    choiceValues: people.map((person) => String(person.uid)),
    min: null,
    max: null,
  }
}

/**
 * The controls of one row of table T-016.
 *
 * ⛔ `PR-9` GETS NONE, and that one is the table's own mark: it is the one row
 * table T-016 calls read-only, because FR-012 derives it.
 *
 * @purity pure
 */
function controlsOfItem(
  schedule: Schedule,
  task: Task,
  item: PropertyItem,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row)) return []
  if (item.heldBy === 'assignment') return [assigneeControl(schedule, task.uid)]

  const entity: ShapedEntity = item.heldBy === 'task' ? 'Task' : 'TaskVisual'
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return item.columns.map((column) => {
    const key: PropertyFieldKey =
      item.heldBy === 'task'
        ? { holder: 'task', uid: task.uid, column: column as keyof Task & string }
        : { holder: 'taskVisual', uid: task.uid, column: column as keyof TaskVisual & string }
    const text =
      item.heldBy === 'task'
        ? textOfTaskColumn(task, column as keyof Task)
        : visual === null
          ? ''
          : textOfValue(visual[column as keyof TaskVisual])
    return controlOf(schedule, key, entity, column, text, task.uid)
  })
}

/** @purity pure */
function textOfItem(
  schedule: Schedule,
  task: Task,
  visual: TaskVisual | null,
  item: PropertyItem,
): string {
  switch (item.heldBy) {
    case 'task':
      return item.columns.map((column) => textOfTaskColumn(task, column)).join(PART_SEPARATOR)
    case 'taskVisual':
      if (visual === null) return ''
      return item.columns.map((column) => textOfValue(visual[column])).join(PART_SEPARATOR)
    case 'assignment':
      return assigneeText(schedule, task.uid)
  }
}

// ----------------------------------------------------------- the subject ----

/** @purity pure */
function taskFields(schedule: Schedule, task: Task): readonly PropertyField[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return PROPERTY_ITEMS.map((item) => ({
    row: item.row,
    name: item.columns.join(PART_SEPARATOR),
    text: textOfItem(schedule, task, visual, item),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: controlsOfItem(schedule, task, item),
  }))
}

// ⭐ FR-009 (MUST) fixes what the panel shows for a dependency line -- the kind,
// the lag and both ends -- and states in as many words that table T-016 is the
// `Task` attribute table and carries no row for a dependency, which is why
// FR-072 resolves to that requirement. ⭐ So the three that ARE columns name
// their row of table T-058, which is the form `PropertyField.row` already fixes
// for an item table T-016 has no row for (FR-042's two are named the same way).
// ⚠️ The kind is written as the stored code, because the four spellings live in
// table T-018 and nothing generates that table into `src/`.
const DEPENDENCY_ITEMS: readonly { readonly row: string; readonly column: keyof Dependency }[] = [
  { row: 'AT-46', column: 'linkType' },
  { row: 'AT-47', column: 'lag' },
  { row: 'AT-45', column: 'predecessorUid' },
]

// STOP -- ⛔ NO ROW HOLDS THE FAR END. The other three are columns of
// `Dependency` and table T-058 has a row for each, but the successor is not a
// column at all: table T-058's own note for AT-45 says the successor is what
// the nesting position expresses. Looked in table T-058, table T-016, FR-009
// and table T-023c. Chose to name the field by the requirement that puts it on
// the panel, there being no attribute row to name.
const SUCCESSOR_ROW = 'FR-009'

/** ⚠️ Spelled the way `ItemRef` spells it, so the far end has one name in both files. */
const SUCCESSOR_NAME: keyof Extract<ItemRef, { kind: 'dependency' }> = 'successorUid'

/**
 * ⚠️ The far end is not a column: a `Dependency` hangs off the task it runs to,
 * so the successor is the task that holds it, and the name is the one
 * `ItemRef` uses for it.
 *
 * @purity pure
 */
function dependencyFields(
  schedule: Schedule,
  dependency: Dependency,
  successorUid: number,
  ordinal: number,
): readonly PropertyField[] {
  const columnFields: readonly PropertyField[] = DEPENDENCY_ITEMS.map((item) => ({
    row: item.row,
    name: item.column,
    text: textOfValue(dependency[item.column]),
    isEditable: true,
    controls: [
      controlOf(
        schedule,
        { holder: 'dependency', successorUid, ordinal, column: item.column },
        'Dependency',
        item.column,
        textOfValue(dependency[item.column]),
        successorUid,
      ),
    ],
  }))

  return [
    ...columnFields,
    {
      row: SUCCESSOR_ROW,
      name: SUCCESSOR_NAME,
      text: textOfValue(successorUid),
      isEditable: true,
      // STOP -- ⛔ NO CONTROL, BECAUSE THERE IS NO COLUMN TO WRITE. The note on
      // SUCCESSOR_ROW says the far end is not a column at all -- it is the task
      // that HOLDS the dependency -- so no `PropertyFieldKey` can name it and
      // table T-108 has no command that moves a dependency between tasks
      // (CM-36 draws one and CM-37 deletes it). Looked in table T-108, table
      // T-058 (AT-45), FR-009 and table T-016.
      controls: [],
    },
  ]
}

/**
 * Which of the selected things the panel describes.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what the panel shows when several
 * things are selected at once. Looked in FR-072, FR-006 (one task), FR-009 (one
 * dependency line) and table T-023c. Chose the one held when exactly one is held
 * -- no order is needed to name it -- and the one picked last otherwise, which
 * `lastPicked` refuses for a selection made all at once (SL-7b). Nothing is
 * described when it refuses.
 *
 * @purity pure
 */
function subjectOf(selection: Selection): ItemRef | null {
  const [only] = selection.items
  if (selection.items.length === 1 && only !== undefined) return only
  return lastPicked(selection)
}

/**
 * The fields of one picked item, or `null` when it is no longer in the document
 * -- which is one of the two states FR-072 calls the selection having gone.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what this panel shows for a
 * highlight box, a comment box or the status line. Table T-016 is the `Task`
 * attribute table, FR-009 covers the dependency line, and nothing states items
 * for the other three kinds SL-1 of table T-023c admits. Looked in FR-072,
 * FR-006, FR-009, table T-016 and table T-023c. Chose no fields, so that the
 * panel says nothing rather than an item roster invented here.
 *
 * @purity pure
 */
function fieldsOfItem(schedule: Schedule, subject: ItemRef): readonly PropertyField[] | null {
  switch (subject.kind) {
    case 'task': {
      const task = taskByUid(schedule, subject.uid)
      return task === null ? null : taskFields(schedule, task)
    }
    case 'dependency': {
      const successor = taskByUid(schedule, subject.successorUid)
      const dependency = successor?.dependencies[subject.ordinal]
      if (successor === null || dependency === undefined) return null
      return dependencyFields(schedule, dependency, successor.uid, subject.ordinal)
    }
    case 'highlightBox':
    case 'commentBox':
    case 'statusLine':
      return []
  }
}

// -------------------------------------------------------- the picked row ----

/**
 * ⚠️ Derived from `Schedule` rather than imported under its own name: `PI-1` of
 * table T-064 publishes the type and not the entities beneath it, and every
 * column this panel needs is reachable through it.
 */
type TaskGroup = Schedule['taskGroups'][number]

/**
 * FR-042's two items, each named by its row of table T-058 for the reason
 * `PropertyField.row` gives: table T-016 is the `Task` table and holds neither.
 *
 * ⚠️ The row's NAME is deliberately absent. FR-042 says in as many words that
 * the name is not handled here, and FR-029 leaves the `Row Title Panel` of
 * FR-085 as its one entry.
 */
const GROUP_ITEMS: readonly { readonly row: string; readonly column: keyof TaskGroup }[] = [
  { row: 'AT-58', column: 'color' },
  { row: 'AT-59', column: 'height' },
]

/**
 * The colour and height of the row FR-042 (MUST) puts on this panel, both
 * editable because the same requirement (MUST) asks for them to be edited here.
 *
 * ⚠️ A row that specifies neither writes neither: AT-58's `null` means the band
 * colour is resolved from the theme and AT-59's means the height follows the
 * number of stacked bars, and writing the resolved answer in would offer the
 * reader a derived value to edit.
 *
 * @purity pure
 */
function groupFields(schedule: Schedule, group: TaskGroup): readonly PropertyField[] {
  return GROUP_ITEMS.map((item) => ({
    row: item.row,
    name: item.column,
    text: textOfValue(group[item.column]),
    isEditable: true,
    controls: [
      controlOf(
        schedule,
        { holder: 'taskGroup', groupId: group.id, column: item.column },
        'TaskGroup',
        item.column,
        textOfValue(group[item.column]),
        // ⚠️ A row has no task uid, and `null` says so rather than a stand-in
        // number: the one candidate roster built from a uid is `PR-15`'s, which
        // is a `Task` item, and AT-51 is a UUID -- there is no number a row
        // could be named by.
        null,
      ),
    ],
  }))
}

/**
 * The one row the panel describes, or `null` while it is not exactly one.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: which of several picked rows the
 * panel describes. FR-085 (MUST) lets several be picked at once while FR-042
 * speaks of the colour and height of THE row, and the two cannot both be met
 * without a rule for choosing. ⚠️ SL-7b's kept order cannot be borrowed: it
 * governs table T-023c's selection, and FR-085 states that the row set is a
 * separate one -- which is why it arrives as a plain set with no order at all.
 * Looked in FR-042, FR-085, table T-023c and table T-015. Chose to describe a
 * row only while exactly one is picked, which is the same shape `subjectOf`
 * already takes when no order is available.
 *
 * @purity pure
 */
function onlyGroupId(groupIds: readonly string[]): string | null {
  const [only] = groupIds
  if (groupIds.length === 1 && only !== undefined) return only
  return null
}

/**
 * Both halves of one subject: the item picked in the drawing area, and the row
 * picked in the `Row Title Panel`. `null` when either names something the
 * document no longer holds.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: the order of the two halves when
 * an item and a row are picked at once. FR-072 decides between the SELECTION
 * and the SETTINGS and says nothing about two rosters inside the selection
 * side; FR-042 and FR-006 each describe their own without mentioning the other.
 * Looked in FR-072, FR-042, FR-006, table T-016 and table T-023c. Chose the
 * item's fields first, table T-016 being the roster FR-072 resolves to for a
 * selection, with FR-042's two appended.
 *
 * @provisional PD-142
 * @purity pure
 */
function fieldsOfSubject(
  schedule: Schedule,
  subject: PropertiesSubject,
): readonly PropertyField[] | null {
  const item = subjectOf(subject.selection)
  const itemFields = item === null ? [] : fieldsOfItem(schedule, item)
  if (itemFields === null) return null

  const groupId = onlyGroupId(subject.groupIds)
  if (groupId === null) return itemFields

  const group = schedule.taskGroups.find((held) => held.id === groupId)
  if (group === undefined) return null
  return [...itemFields, ...groupFields(schedule, group)]
}

// ---------------------------------------------------------- the settings ----

/**
 * ⚠️ The same walk `clampedSettings` makes over a dotted key. It is repeated
 * rather than shared because that one is private to `DocumentSettings`, and
 * table T-064 publishes the type and the clamp, not the walk.
 *
 * @purity pure
 */
function valueAt(settings: DocumentSettings, key: string): unknown {
  return key
    .split(KEY_PATH_SEPARATOR)
    .reduce<unknown>(
      (held, step) =>
        held !== null && typeof held === 'object' ? (held as Record<string, unknown>)[step] : undefined,
      settings,
    )
}

/**
 * The document's drawing settings, as IC-17 of table T-109 puts them here.
 *
 * STOP -- ⛔ NOT IN THE CODE: table T-104's row ids. `PropertyField.row` asks for
 * the `K-n` that holds a settings item, and nothing generates that table into
 * `src/` the way `_source/settings.json` and table T-109's icon roster are
 * generated. Looked in `_assets/tbl-glossary.md` (section 4 holds the rows), in
 * `_source/settings.json` (it carries no row id), in `_assets/tbl-settings.md`
 * (whose rows are the `S-n` of the value tables, not `K-n`) and in
 * `SETTINGS_DEFAULTS`. ⚠️ A map written out by hand would be wrong the day it
 * was written: the two rosters already disagree in both directions --
 * `carryMaxDepth` is a settings key with no row in table T-104, and
 * `watermarkOpacity` (K-101) and `importSeq` (K-86) are rows with no settings
 * key. Chose the settled key name, which table T-104 itself holds as the item's
 * name and which arrives from the generated roster: it is the only join to that
 * table this file can hold without copying it. ⚠️ `row` and `name` therefore
 * read alike on this side -- that is the gap showing, not a duplication.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: which settings this panel shows,
 * and in what order. IC-17 says the entry puts "the document's drawing settings"
 * here and names no subset; table T-104 counts well over a hundred keys across
 * twenty groups, some of them marked as never stored in the document; FR-072
 * speaks of the settings without a roster. Chose every key of the presentation
 * group (DR-3 of table T-052), which is what `DocumentSettings` is: a superset
 * cannot close an editing route, and the rule after table T-202 (MUST) requires
 * exactly that route to stay open when a toggle hides the element it edits. The
 * order is the generated roster's, table T-104's printed order not being in the
 * code either.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: whether any settings item is
 * read-only. Table T-104 marks none, `_assets/tbl-settings.md` marks none, and
 * UN-13 of table T-027 has changes to the document's settings taken back by the
 * undo, so they are edited somewhere and IC-17 names this panel. Chose editable.
 *
 * @purity pure
 */
function settingsFields(settings: DocumentSettings): readonly PropertyField[] {
  return Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    row: key,
    name: key,
    text: textOfValue(valueAt(settings, key)),
    isEditable: true,
    // STOP -- ⛔ NO CONTROL ON THIS SIDE THIS ROUND, and the reason is the row
    // ids the note above records as missing. `PropertyFieldKey` names WHAT a
    // committed value is about, and every one of its four members names an
    // entity of the schedule; a settings key belongs to the presentation group
    // (DR-3 of table T-052), whose commands are CM-56 .. CM-71 and whose
    // reordering table T-104 is separate work. ⚠️ `isEditable` is left true
    // because UN-13 of table T-027 has these taken back by the undo, so they
    // ARE edited somewhere -- what is missing is the surface, not the
    // permission.
    controls: [],
  }))
}

// ------------------------------------------------------------- the panel ----

/**
 * The `Properties Panel` (U-25) for one frame, or `null` while it is closed.
 *
 * ⭐ `showing` is carried, never decided: see the header on why that is what
 * keeps FR-072's MUST NOT.
 *
 * ⭐ WHAT IS KEPT IS THE SUBJECT, NOT THE FIELDS. FR-072 (MUST) has the panel go
 * on showing what it had once the selection is cleared, and also has a second
 * press of the same entry return to what was selected before -- so what must be
 * remembered is the thing, and `ScreenSession.propertiesSubject` remembers it.
 * ⚠️ Keeping the drawn fields instead would go on showing values an edit had
 * already made untrue, and a `pure` unit holds nothing between frames anyway.
 * ⛔ The memory is still the shell's, not the document's: table T-203 keeps only
 * this panel's width (S-80) and table T-206 has no row for its subject.
 *
 * @provisional PD-144
 * @purity pure
 */
export function propertiesPanelFromSelection(
  schedule: Schedule,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
): PropertiesPanel | null {
  const showing = session.propertiesShowing
  if (showing === null) return null

  if (showing === 'documentSettings') {
    return {
      showing,
      heading: headingOf(PANEL_HEADINGS.documentSettings, session.language),
      // The document is the subject on this side, and a document cannot go away
      // while a panel is describing it.
      isSubjectGone: false,
      fields: settingsFields(settings),
      // ⭐ THE SAME ENTRANCE ON BOTH ARMS. Table T-109 places its row on the
      // SURFACE, and FR-072's two contents are one surface -- a panel that lost
      // its way out when the settings came up would be a surface a reader
      // cannot put away.
      commands: panelCommands(session.language),
    }
  }

  // Nothing picked in either of the two sets SL-1 and FR-085 keep apart. That is
  // FR-072's "the selection was cleared", and it is when the remembered subject
  // takes over.
  const isNothingPicked = selection.items.length === 0 && session.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? session.propertiesSubject
    : { selection, groupIds: session.selectedGroupIds }
  const fields = subject === null ? null : fieldsOfSubject(schedule, subject)

  // Two ways for the subject to have gone: nothing is picked any more, or what
  // is picked is no longer in the document. ⚠️ A selection made all at once is
  // NOT one of them -- it describes nothing because no rule names one of its
  // members, and nothing went away.
  const isSubjectGone = isNothingPicked || fields === null

  return {
    showing,
    heading: headingOf(
      isSubjectGone ? PANEL_HEADINGS.subjectGone : PANEL_HEADINGS.selection,
      session.language,
    ),
    isSubjectGone,
    fields: fields ?? [],
    commands: panelCommands(session.language),
  }
}

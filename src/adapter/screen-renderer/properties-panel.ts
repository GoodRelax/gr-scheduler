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
// ⭐ A FIELD PER ROW OF TABLE T-016, NOT PER COLUMN. Four rows hold several
// columns, and the table writes their item names into ONE cell with " / "
// between them. A field carries one name, one text and one `isEditable`, and the
// table's read-only mark is per row -- so the row is the field, and its value is
// written with the same separator the name cell uses, part answering part.
//
// ⛔ THE ITEM NAMES ARE NOT TYPED OUT. Every one but the assignee's is a column
// of `Task` or of `TaskVisual`, so the roster below holds `keyof` those types and
// builds the name from them: a column the specification renames stops compiling
// here instead of going stale in silence (rule 03 of docs/development-rules).
// ⚠️ The roster keeps table T-016's own printed order, which is NOT the numeric
// order of its row ids -- PR-17 stands between PR-11 and PR-12, and PR-16 is last.
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
// ⛔ AS-2's `-` DOES NOT REACH THIS PANEL. That row belongs to the assignee
// LABEL, and AS-3 makes `-` the signal that CLEARS an assignment: writing it into
// this panel's value would spell "clear me" at the very surface that edits it.
//
// ⭐ HOW A DATE IS WRITTEN. FR-054 (MUST) takes the lexical date part of a date
// column and (MUST NOT) converts no zone; `dayOf` is where that happens once for
// the whole product. The spelling is the date part of what `textOfDay` writes
// (EX-7 of table T-033), so no second date format is minted here.
//
// ⛔ Every STOP note below says what the specification leaves open. The loudest
// is the settings side, which has no row ids to name.

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
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
  DisplayLanguage,
  PropertiesPanel,
  PropertyField,
  ScreenSession,
} from './screen-renderer'
import displayWords from './display-words.json'

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
 * minted here in either language. Every cell of the dictionary is still empty
 * (PD-160), so these are what actually reaches the screen today.
 *
 * @provisional PD-160
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
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
 * an instruction to print nothing -- and FR-072 (MUST) requires this panel to
 * SAY which of the two it is on, so printing nothing would break it outright.
 * The day a word is written this line stops standing in without being edited.
 * ⚠️ A key the dictionary does not hold at all is a second condition, answered
 * separately although with the same stand-in; it cannot happen while
 * `npm run gen:check` passes.
 *
 * @provisional PD-160
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
 * ⚠️ `assignee` is the one name written out rather than read off a generated
 * type: PR-16's own note says the item is not a column of `Task`, that its
 * substance is `Assignment`, and that the name shown is derived from the
 * assignment.
 */
const PROPERTY_ITEMS: readonly PropertyItem[] = [
  { row: 'PR-1', heldBy: 'task', columns: ['name'] },
  { row: 'PR-2', heldBy: 'task', columns: ['notes'] },
  { row: 'PR-3', heldBy: 'task', columns: ['start', 'finish'] },
  { row: 'PR-4', heldBy: 'task', columns: ['actualStart'] },
  { row: 'PR-5', heldBy: 'task', columns: ['actualDuration'] },
  { row: 'PR-6', heldBy: 'task', columns: ['actualFinish'] },
  { row: 'PR-7', heldBy: 'task', columns: ['resume'] },
  { row: 'PR-8', heldBy: 'task', columns: ['resumeValid'] },
  { row: 'PR-9', heldBy: 'task', columns: ['percentComplete'] },
  { row: 'PR-10', heldBy: 'task', columns: ['deadline'] },
  { row: 'PR-11', heldBy: 'taskVisual', columns: ['shapeKind'] },
  { row: 'PR-17', heldBy: 'taskVisual', columns: ['milestoneGlyph'] },
  { row: 'PR-12', heldBy: 'taskVisual', columns: ['strokeColor', 'fillColor', 'lineWeight'] },
  { row: 'PR-13', heldBy: 'taskVisual', columns: ['nameAnchor', 'nameAlign'] },
  { row: 'PR-14', heldBy: 'task', columns: ['fadeInDays', 'fadeOutDays'] },
  { row: 'PR-15', heldBy: 'task', columns: ['wbsParentUid'] },
  { row: 'PR-18', heldBy: 'task', columns: ['milestone'] },
  { row: 'PR-16', heldBy: 'assignment', columns: ['assignee'] },
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
 * One name the panel shows for PR-16, carrying the uid AS-6 (MUST NOT) keeps off
 * the screen -- it is here only to order two people of the same name.
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
  }))
}

// STOP -- ⛔ NO ROW HOLDS THESE FOUR. FR-009 (MUST) fixes what the panel shows
// for a dependency line -- the kind, the lag and both ends -- and states in as
// many words that table T-016 is the `Task` attribute table and carries no row
// for a dependency, which is why FR-072 resolves to that requirement. So the
// field names the requirement that holds it: `PropertyField.row` admits `PR-n`
// and `K-n`, and neither exists for these. ⚠️ The kind is written as the stored
// code, because the four spellings live in table T-018 and nothing generates
// that table into `src/` either.
const DEPENDENCY_ROW = 'FR-009'
const DEPENDENCY_COLUMNS: readonly (keyof Dependency)[] = ['linkType', 'lag', 'predecessorUid']

/** ⚠️ Spelled the way `ItemRef` spells it, so the far end has one name in both files. */
const SUCCESSOR_NAME: keyof Extract<ItemRef, { kind: 'dependency' }> = 'successorUid'

/**
 * ⚠️ The far end is not a column: a `Dependency` hangs off the task it runs to,
 * so the successor is the task that holds it, and the name is the one
 * `ItemRef` uses for it.
 *
 * @purity pure
 */
function dependencyFields(dependency: Dependency, successorUid: number): readonly PropertyField[] {
  const columnFields: readonly PropertyField[] = DEPENDENCY_COLUMNS.map((column) => ({
    row: DEPENDENCY_ROW,
    name: column,
    text: textOfValue(dependency[column]),
    isEditable: true,
  }))

  return [
    ...columnFields,
    {
      row: DEPENDENCY_ROW,
      name: SUCCESSOR_NAME,
      text: textOfValue(successorUid),
      isEditable: true,
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
 * The fields of one subject, or `null` when the subject is no longer in the
 * document -- which is the state FR-072 calls the selection having gone.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what this panel shows for a
 * highlight box, a comment box or the status line. Table T-016 is the `Task`
 * attribute table, FR-009 covers the dependency line, and nothing states items
 * for the other three kinds SL-1 of table T-023c admits. Looked in FR-072,
 * FR-006, FR-009, table T-016 and table T-023c. Chose no fields, so that the
 * panel says nothing rather than an item roster invented here.
 *
 * STOP -- ⛔ CANNOT BE ANSWERED HERE AT ALL: FR-042 puts a row's colour and
 * height into this panel when a row is picked in the `Row Title Panel`, and no
 * argument this unit is handed can carry a row -- SL-1 keeps rows out of
 * `Selection` on purpose, and the flag that marks a picked row lives in UF-63's
 * `RowTitle`. The requirement stands; the channel for it does not.
 *
 * @purity pure
 */
function fieldsOfSubject(schedule: Schedule, subject: ItemRef): readonly PropertyField[] | null {
  switch (subject.kind) {
    case 'task': {
      const task = taskByUid(schedule, subject.uid)
      return task === null ? null : taskFields(schedule, task)
    }
    case 'dependency': {
      const successor = taskByUid(schedule, subject.successorUid)
      const dependency = successor?.dependencies[subject.ordinal]
      if (successor === null || dependency === undefined) return null
      return dependencyFields(dependency, successor.uid)
    }
    case 'highlightBox':
    case 'commentBox':
    case 'statusLine':
      return []
  }
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
  }))
}

// ------------------------------------------------------------- the panel ----

/**
 * The `Properties Panel` (U-25) for one frame, or `null` while it is closed.
 *
 * ⭐ `showing` is carried, never decided: see the header on why that is what
 * keeps FR-072's MUST NOT.
 *
 * STOP -- ⛔ NOWHERE TO KEEP THEM: FR-072 (MUST) has the panel keep the fields it
 * was showing when the selection is cleared. Nothing this unit is handed
 * remembers them -- `ScreenSession` carries `propertiesShowing` for the other
 * half of this very requirement and carries no fields, the selection is empty by
 * then, and a `pure` unit holds nothing from one frame to the next. Looked in
 * screen-renderer.ts (`ScreenSession`), in table T-203 and table T-206 (no row
 * for what the panel is showing; S-80 keeps only its width) and in FR-072
 * itself. Chose to describe no fields and to raise `isSubjectGone`, so the panel
 * says the subject has gone without standing values in that it cannot know were
 * there. ⚠️ The fields would have to arrive beside `propertiesShowing`, which is
 * where the specification's own answer is already missing.
 *
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
    }
  }

  const subject = subjectOf(selection)
  const fields = subject === null ? null : fieldsOfSubject(schedule, subject)

  // Two ways for the subject to have gone: the selection was cleared, or what it
  // still names is no longer in the document. ⚠️ A selection made all at once
  // has no subject either, and that is NOT one of them -- nothing went away.
  const isSubjectGone = subject === null ? selection.items.length === 0 : fields === null

  return {
    showing,
    heading: headingOf(
      isSubjectGone ? PANEL_HEADINGS.subjectGone : PANEL_HEADINGS.selection,
      session.language,
    ),
    isSubjectGone,
    fields: fields ?? [],
  }
}

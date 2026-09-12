// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// ⭐ WHICH OF THE TWO IS SHOWING IS NOT DECIDED HERE. FR-072 makes the LAST
// operation decide, and nothing in this component sees an operation, so the
// answer arrives as `ScreenSession.propertiesShowing` and is carried through
// untouched. ⛔ That is also how FR-072's MUST NOT is kept: clearing the
// selection cannot move the panel to the settings, because this unit never
// chooses `showing` -- an empty selection moves `isSubjectGone`, never `showing`.
//
// ⭐ THE SUBJECT HAS TWO HALVES, because a row is picked apart from everything
// else (SL-1 of table T-023c, FR-085). `PropertiesSubject` is that pair, and
// both halves are `showing: 'selection'`.
//
// ⭐ A FIELD PER ROW OF TABLE T-016, A CONTROL PER COLUMN, WHICH IS WHY THE TWO
// COUNTS DIFFER. Four rows hold several columns; a field carries one name, one
// text and one `isEditable`, and the table's read-only mark is per row -- so the
// row is the field. A person edits one column at a time, so `controls` runs per
// column.
//
// ⛔ THE ITEM NAMES ARE NOT TYPED OUT. Every item of table T-016 but the
// assignee's is a column of `Task` or of `TaskVisual`, and the dependency and
// row rosters are columns too, so each holds `keyof` the type that owns it: a
// column the specification renames stops compiling here instead of going stale
// in silence (rule 03 of docs/development-rules).
// ⚠️ The roster keeps table T-016's own printed order, which is NOT the numeric
// order of its row ids -- that table is ordered by how often a value is touched,
// so PR-16 stands third and PR-15 last.
//
// ⚠️ ONLY THE ENTRY NAMES ARE TRANSLATED. FR-038 leaves the item names of table
// T-016 alone, as it leaves task and row names alone; the values are the
// document's own. What FR-038 reaches on this panel is the accessible name of
// each entry table T-109 places here, read from the dictionary below.
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
// PI-5 of table T-064. ⭐ FR-093's own unit count, taken rather than repeated:
// FR-006 (MUST) has this unit work out the room a control needs by the same
// arithmetic the schedule's labels use, and rule 03 section 4 refuses a second
// copy of one rule.
import { labelUnits } from '../../entity/layout-engine/schedule-layout/schedule-layout'
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
// ⭐ Table T-016, generated from `_source/property-items.json`. ⛔ Its shown
// names are NOT here -- FR-038 (MUST NOT) keeps those in the dictionary
// beside it, under the same row ids.
import propertyItems from './property-items.json'

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

// ⛔ NO HEADING IS BUILT HERE, AND THAT IS A REQUIREMENT RATHER THAN AN
// OMISSION. FR-072 (MUST NOT) forbids a heading row at the head of this panel
// and makes the pressed state of the entrance the one thing that says which of
// the two is showing -- which `showing` already carries and which
// `app-header-items.ts` reads for IC-17. ⚠️ So the `panelHeadings` section of
// the dictionary has no reader in `src/` any more.

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
 * ⭐ A `Map` rather than a scan per entry: a description is built for every
 * frame and rule 05 forbids a linear search on that path (NFR-013).
 */
const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/**
 * The name each row of table T-016 shows, keyed by that row's id.
 *
 * ⭐ THE SHOWN NAME IS A SECOND, LINKED PIECE OF DATA. The GRS JSON column
 * names have not changed by one character; what FR-038 (MUST NOT) settles is
 * that the dictionary is the one place the SHOWN name may live.
 *
 * ⚠️ ONE NAME PER ROW, NOT PER COLUMN. PR-3 and PR-14 each carry two columns
 * and PR-12 three; FR-006 (MUST NOT) forbids building the name by joining the
 * column names, which is what makes 「fade in/out days」 sayable at all.
 */
const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

/**
 * The row of table T-104 a settings key sits in, and the word that row shows.
 *
 * ⭐ THE SAME SPLIT AGAIN, ONE SURFACE LATER. The paragraph under table T-006a
 * (MUST) holds this panel's SETTINGS side to the rule its properties side
 * already keeps, and (MUST NOT) forbids the internal spelling on the screen.
 *
 * ⚠️ KEYED BY THE KEY, HELD BY THE ROW. The dictionary is keyed by `K-n`
 * because that is where table T-104 settles a name, and one row may name
 * several keys (`K-103` two, `K-105` three); this map is the flattening, and
 * the keys it flattens travel from that table with the word rather than being
 * written out here, which rule 03 section 1 forbids.
 */
const SETTINGS_WORDS_BY_KEY = new Map(
  displayWords.settings.flatMap((entry) =>
    entry.keys.map((key) => [key, entry] as const),
  ),
)

/** What an entry says while the dictionary holds no word for its row. */
const NO_ENTRY_WORDS = ''

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those two
 * read "the dictionary holds no word yet" and "the word is the empty string" as
 * one thing, and that gap is precisely the difference: an empty cell means the
 * word has not been settled, which is not an instruction to print nothing.
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
 * The name one row of table T-016 shows, in the display language (FR-038).
 *
 * ⛔ THE COLUMN NAME IS NOT THE FALLBACK. `entryLabel` reads an unwritten cell
 * as 「not settled yet」 and so does this: falling back to the column
 * would put the very string this split exists to keep off the screen back on
 * it, and it would do so silently -- a row whose word nobody wrote would look
 * finished. ⚠️ Every row is written today, so this stands in for nothing.
 *
 * @purity pure
 */
function itemName(row: string, language: DisplayLanguage): string {
  const word = ITEM_WORDS_BY_ROW.get(row)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

/**
 * The row of table T-104 one settings key belongs to, with its word.
 *
 * ⚠️ A KEY MAY BE PART OF A ROW RATHER THAN A ROW'S WHOLE NAME. That table
 * spells `fontScaleSizes.S` / `.M` / `.L` out on `K-105` and stops at
 * `exportCanvas` on `K-87` and at `planActualGuidePattern` on `K-92`, whose
 * parts the document holds as `exportCanvas.width` and the rest -- so a key
 * that names no row of its own belongs to the row its path stands under, and
 * shows that row's word. ⛔ NOT A SECOND WORD MINTED FOR THE PART: one word per
 * row is the same rule the properties side keeps, and `K-105` shows the table
 * saying it out loud.
 *
 * @purity pure
 */
function settingsWordOf(key: string): (typeof displayWords.settings)[number] | undefined {
  const own = SETTINGS_WORDS_BY_KEY.get(key)
  if (own !== undefined) return own
  const separator = key.lastIndexOf(KEY_PATH_SEPARATOR)
  return separator === -1 ? undefined : SETTINGS_WORDS_BY_KEY.get(key.slice(0, separator))
}

/**
 * The name one settings key shows, in the display language (FR-038).
 *
 * ⛔ THE KEY IS NOT THE FALLBACK, for the reason `itemName` gives one line up
 * and the paragraph under table T-006a (MUST NOT) puts in as many words. A key
 * whose row of table T-104 nobody has written -- or which that table has no row
 * for at all -- shows no name, and `settingsFields` names the six in that state.
 *
 * @purity pure
 */
function settingsName(key: string, language: DisplayLanguage): string {
  const word = settingsWordOf(key)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

/**
 * The entries table T-109 places on this panel, in that table's own order.
 *
 * ⭐ ONE PASS OVER THE GENERATED ROSTER RATHER THAN A LIST WRITTEN HERE, which
 * is the shape `headerCommands` in `app-header-items.ts` and `commandsOnSurface`
 * in `open-modals.ts` already take: FR-029 (MUST) sends both the roster and the
 * placement to table T-109, whose 面 column IS the placement, so membership,
 * print order and count all come from the table.
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
type PropertyItem = { readonly row: string; readonly appliesTo: AppliesTo } & (
  | { readonly heldBy: 'task'; readonly columns: readonly (keyof Task)[] }
  | { readonly heldBy: 'taskVisual'; readonly columns: readonly (keyof TaskVisual)[] }
  | { readonly heldBy: 'assignment'; readonly columns: readonly ['assignee'] }
  | { readonly heldBy: 'taskGroup'; readonly columns: readonly (keyof TaskGroup)[] }
  | { readonly heldBy: 'commentBox'; readonly columns: readonly (keyof CommentBox)[] }
)

/**
 * A row a selected `Task` puts up, and a row a selected `TaskGroup` puts up.
 *
 * ⭐ The 対象 and the holder move together, so narrowing on either narrows the
 * columns: a `Task`'s row is held by one of the three `Task`-side holders and a
 * row's row by the row itself. ⛔ That is what keeps `textOfItem` from having to
 * answer for a `TaskGroup` column against a `Task` it was never given.
 */
type TaskPropertyItem = Extract<PropertyItem, { heldBy: 'task' | 'taskVisual' | 'assignment' }>
type GroupPropertyItem = Extract<PropertyItem, { heldBy: 'taskGroup' }>
type CommentBoxPropertyItem = Extract<PropertyItem, { heldBy: 'commentBox' }>

/**
 * The values table T-016's 対象 column takes, spelled as that table spells them
 * -- a settled name copied spelling and all (rule 03 section 1).
 *
 * ⭐ THE VALUES ARE THE TABLE'S AND ARE NOT COUNTED IN PROSE. FR-006 makes
 * table T-016's 対象 column the source (MUST) and forbids the requirement's own
 * text from enumerating that column's values (MUST NOT), so this arm follows
 * the table -- `CommentBox` among them -- and nothing here chooses.
 */
type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox'

const APPLIES_TO_TASK: AppliesTo = 'Task'
const APPLIES_TO_TASK_GROUP: AppliesTo = 'TaskGroup'
const APPLIES_TO_COMMENT_BOX: AppliesTo = 'CommentBox'

/**
 * Where the values of a row whose 対象 is `Task` live.
 *
 * ⛔ THE ONE FACT ABOUT SUCH A ROW THAT TABLE T-016 DOES NOT STATE, which is why
 * it is the only thing left written out here. `erd.json` says which entity holds
 * a column, and PR-16 is the row whose substance is not a column at all -- table
 * T-016's own note says the item is an `Assignment` and that the name shown is
 * derived from the assignment. ⚠️ Keyed by row id, the only join that table
 * admits, so a row added to the manuscript arrives below and fails HERE by
 * name rather than being drawn against the wrong entity.
 */
const HELD_BY_ON_A_TASK: Readonly<Record<string, PropertyItem['heldBy']>> = {
  'PR-1': 'task',
  'PR-2': 'task',
  'PR-3': 'task',
  'PR-4': 'task',
  'PR-5': 'task',
  'PR-6': 'task',
  'PR-7': 'task',
  'PR-8': 'task',
  'PR-9': 'task',
  'PR-10': 'task',
  'PR-12': 'taskVisual',
  'PR-13': 'taskVisual',
  'PR-14': 'task',
  'PR-15': 'task',
  'PR-16': 'assignment',
  'PR-17': 'taskVisual',
}

/**
 * Which entity holds one row's values.
 *
 * ⛔ THE MAP EXISTS ONLY BECAUSE THE `Task` SIDE HAS THREE HOLDERS -- `task`,
 * `taskVisual` and `assignment` -- that one value of 対象 cannot tell apart. A
 * row of 対象 `TaskGroup` or `CommentBox` needs no placing: its items are its
 * own columns (ET-13 of table T-056), so writing them into the map would be this
 * file re-typing 対象, which rule 03 section 1 forbids.
 * ⛔ THE GUARD IS KEPT: a row of 対象 `Task` that nobody has placed stops the
 * panel here by name rather than being drawn against the wrong entity.
 *
 * @purity pure
 */
function heldByOf(row: string, appliesTo: AppliesTo): PropertyItem['heldBy'] {
  if (appliesTo === APPLIES_TO_TASK_GROUP) return 'taskGroup'
  if (appliesTo === APPLIES_TO_COMMENT_BOX) return 'commentBox'
  const heldBy = HELD_BY_ON_A_TASK[row]
  if (heldBy === undefined) {
    throw new Error(`table T-016 holds ${row}, and nothing says which entity holds its value`)
  }
  return heldBy
}

/**
 * Table T-016's rows, in the order the table prints them.
 *
 * ⭐ READ OFF THE GENERATED ROSTER, NOT TYPED HERE. The manuscript is
 * `docs/spec/_source/property-items.json` and `tools/generate_property_items.py`
 * carries it into `src/`, the same road `icon-roster.json` takes -- a hand copy
 * beside the table it came from is the drift rule 03 section 1 forbids.
 *
 * ⛔ THE PRINTED ORDER IS A MUST AND IT IS NOT THE NUMERIC ONE. FR-006 (MUST)
 * requires the items in the order the table prints them and (MUST NOT) forbids
 * the values touched most often to be reached by scrolling -- so the ARRAY's
 * order is the specification, and re-sorting it by row id would silently undo
 * that ruling. ⚠️ `PR-16` stands third and `PR-15` last.
 */
const PROPERTY_ITEMS: readonly PropertyItem[] = propertyItems.items.map((item) => {
  const appliesTo = item.appliesTo as AppliesTo
  return {
    row: item.rowId,
    appliesTo,
    heldBy: heldByOf(item.rowId, appliesTo),
    columns: item.columns,
  } as PropertyItem
})

/**
 * The rows a selected `Task` puts up, and the rows a selected row puts up, each
 * in table T-016's own printed order.
 *
 * ⛔ FR-006 (MUST / MUST NOT): only the rows whose 対象 matches what is
 * selected. ⛔ Without this split the printed order alone would put a row's
 * `height` on a task's panel, which is the reason that ruling gives.
 * ⭐ FILTERED AND NEVER SORTED: the same requirement (MUST) keeps the printed
 * order and says in as many words that the relative order of two rows of one
 * 対象 does not change.
 *
 * ⭐ SPLIT ONCE RATHER THAN PER FRAME: a description is built every frame and
 * rule 05 forbids a walk on that path that could have been made beforehand
 * (NFR-013), which is the reason `ENTRY_WORDS_BY_ROW` above is a `Map`.
 */
const TASK_ITEMS: readonly TaskPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is TaskPropertyItem => item.appliesTo === APPLIES_TO_TASK,
)

const GROUP_ITEMS: readonly GroupPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is GroupPropertyItem => item.appliesTo === APPLIES_TO_TASK_GROUP,
)

/**
 * The rows a selected comment box puts up -- `PR-21` alone today.
 */
const COMMENT_BOX_ITEMS: readonly CommentBoxPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is CommentBoxPropertyItem => item.appliesTo === APPLIES_TO_COMMENT_BOX,
)

/**
 * The rows table T-016 marks read-only.
 *
 * ⭐ READ OFF THE SAME ROSTER, so a row the table stops marking loses its mark
 * in the manuscript and nowhere else.
 */
const READ_ONLY_ROWS: readonly string[] = propertyItems.items
  .filter((item) => item.isReadOnly)
  .map((item) => item.rowId)

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
 * An identifier as the document holds one: the shape `_source/erd.json` gives
 * every `format: uuid` column, and the shape the generated document schema
 * gives `scrollGroupId` and the members of `pinnedGroupIds`.
 *
 * ⚠️ ASKED BY SHAPE AND NOT BY KEY NAME. A roster of the settings keys that
 * hold an identifier would be a copy of the schema kept by hand, and it would
 * be wrong the day another such key was added.
 */
const IDENTIFIER = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * A settings value written out for the screen, with no identifier in it.
 *
 * ⛔ THE PARAGRAPH UNDER TABLE T-006a (MUST NOT) FORBIDS BOTH HALVES: the
 * spelling of the key, which `settingsName` answers, and the identifier itself,
 * which is this.
 *
 * STOP -- ⛔ NO LINE SAYS WHAT STANDS IN ITS PLACE. Looked in table T-104 (which
 * names `scrollGroupId` 「表示の上端が指す行」 and `pinnedGroupIds` 「ピン止めの
 * 対象」, both names of the row and neither a rule for printing it), in FR-072,
 * in FR-006, in table T-016 and in `_assets/tbl-settings.md`; none of them says
 * whether the row a settings key points at may be shown by its NAME, and
 * resolving one would be a rule invented here. Chose nothing, which is what
 * this file prints everywhere a word is unsettled -- and it is the one
 * choice the MUST NOT above certainly allows.
 *
 * @purity pure
 */
function textOfSettingsValue(value: unknown): string {
  if (typeof value === 'string') return IDENTIFIER.test(value) ? '' : value
  if (Array.isArray(value)) {
    return value
      .map(textOfSettingsValue)
      .filter((said) => said !== '')
      .join(PART_SEPARATOR)
  }
  return textOfValue(value)
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
 * The people the task's assignments reach, in the order `compareAssignees` puts
 * them in.
 *
 * ⭐ THE WALK STANDS ON ITS OWN BECAUSE TWO SIDES OF ONE FIELD ASK IT. The row's
 * text names them all and the chooser beside it stands on ONE of them, and a
 * second walk written for the chooser could answer with a person the text never
 * named -- two readings of one rule drift (rule 03 section 4).
 *
 * ⛔ FR-059's work-resource filter is NOT borrowed: it keeps materials and costs
 * off the drawing, whereas this is the surface that edits the assignment, so
 * hiding one here would leave it unremovable. ⚠️ A resource with no name is left
 * out because there is no name to show, and AS-6 (MUST NOT) forbids putting the
 * uid on the screen instead -- which is the same test `assigneeChoices` applies,
 * so every person answered here is one of that roster's candidates. ⚠️ The order
 * of two unlike names is by code unit: no row fixes a collation, and a
 * locale-dependent one would order the same document differently on two
 * machines.
 *
 * @purity pure
 */
function assigneesOf(schedule: Schedule, taskUid: number): readonly Assignee[] {
  const assignees: Assignee[] = []

  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    const resource = schedule.resources.find((held) => held.uid === assignment.resourceUid)
    if (resource === undefined || resource.name === null) continue
    assignees.push({ name: resource.name, uid: resource.uid })
  }

  assignees.sort(compareAssignees)
  return assignees
}

/**
 * The names of those people, written out for the row.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how several assignees are written
 * on this panel. FR-059's "the first name and the count of the rest" governs the
 * assignee LABEL, and AS-5 of table T-225 makes this a different surface with no
 * width rule of its own. Looked in table T-225 (AS-5 / AS-6 / AS-9), FR-059,
 * FR-008 and table T-016. Chose every name, in the order the specification puts
 * assignees in elsewhere -- name ascending, the smaller uid first, which is
 * AS-8's tie-break -- joined by the separator this file already uses between the
 * parts of one field.
 *
 * @purity pure
 */
function assigneeText(schedule: Schedule, taskUid: number): string {
  return assigneesOf(schedule, taskUid)
    .map((assignee) => assignee.name)
    .join(PART_SEPARATOR)
}

/**
 * The candidates AS-5 (MUST) has PR-16 choose from -- 名簿から選ばせる形.
 *
 * ⭐ THE ROSTER IS WALKED, NOT WRITTEN OUT, which is the shape
 * `parentCandidates` takes for PR-15 as well: the candidates are the `Resource`
 * rows this document holds, so no list here can disagree with the document, and
 * the paragraph under table T-016 (MUST NOT) forbids a roster of choices to be
 * stated a second time.
 *
 * ⛔ ONE ENTRY PER PERSON, NEVER ONE PER NAME. AS-8 (MUST NOT) forbids two
 * same-named people to be merged and MG-5 of table T-032 says the same thing
 * pointing back at it, while AS-9 (MUST) calls this chooser the one place they
 * can be told apart -- so folding the roster on the name would close the only
 * route the specification gives. The two carry the same word and different
 * values: AS-6 (MUST NOT) keeps the `uid` out of the word, and `choiceValues`
 * is what carries it instead.
 * ⚠️ A resource with no name is left out, FR-059's work-resource filter is not
 * borrowed, and two unlike names stand by code unit -- all three for the reasons
 * `assigneesOf` gives. Two of one name stand smaller uid first (AS-8).
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

/**
 * Table T-016's 複数行 -- `PR-2` `notes` and `PR-21` `text`.
 *
 * ⛔ BOTH ARE LISTED WHETHER OR NOT EACH REACHES A CONTROL TODAY: leaving one
 * out would make this roster a partial copy of the table's 入力の型 column,
 * which is the drift rule 03 section 1 forbids.
 */
const MULTILINE_COLUMNS: readonly string[] = ['notes', 'text']

/**
 * The one item table T-016 calls 選択 whose candidates are not an enumeration.
 *
 * ⛔ THE MANUSCRIPT CANNOT ANSWER FOR THIS ONE, and that is why it is written
 * out. `COLUMN_SHAPES` says `wbsParentUid` is an integer, because its
 * candidates are the document's own tasks rather than a fixed set -- so reading
 * the kind off the column alone would offer a box to type a uid into where
 * table T-016 asks for a chooser. ⚠️ `parentCandidates` is where the candidates
 * come from, and its STOP note says what the table leaves open about them.
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
  // ⚠️ ASKED OF THE WHOLE ROSTER AND NOT OF ONE ENTITY. `DATE_COLUMNS` is
  // generated per entity and holds only the entities that HAVE a date column,
  // so a shaped entity may be absent from it -- which is what the widening
  // reads as "no date column" rather than as an error. ⛔ Spelling one entity
  // here (it read `entity === 'Task'` until PR-21 arrived) makes this a partial
  // copy of the roster: `CommentBox.anchorDate` is a date the manuscript marks,
  // and the moment table T-016 gains a row for it the old form would have drawn
  // it as text.
  const dateRoster: Partial<Record<ShapedEntity, readonly string[]>> = DATE_COLUMNS
  if ((dateRoster[entity] ?? []).includes(column)) return 'date'

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
 * What one `choice` control offers: the words it shows, and what each of them
 * COMMITS where that is not the word itself.
 *
 * ⭐ THE PAIR IS CARRIED TOGETHER BECAUSE THE TWO ARE READ BY POSITION.
 * `PropertyControl.choiceValues` is one value per candidate in the same order,
 * so a roster built by one walk and a roster of values built by a second could
 * fall out of step -- two readings of one rule drift (rule 03 section 4).
 * `values` is `null` where the words ARE the values, which is the state the
 * control declares by leaving the member absent.
 */
interface Candidates {
  readonly words: readonly string[]
  readonly values: readonly string[] | null
}

/**
 * The tasks PR-15 can be given as a WBS parent -- the word each one shows, and
 * the `uid` it commits.
 *
 * ⭐ THE NAME IS THE WORD AND THE `uid` IS THE VALUE, which is the same shape
 * `assigneeControl` takes for PR-16. AT-24 of table T-058 says a `uid` is a key
 * whose 値から意味を読まない, so a chooser whose words were uids would ask a
 * person to pick a parent by a number the specification itself calls meaningless.
 * ⛔ TWO TASKS OF ONE NAME ARE TWO CANDIDATES, never one: `uid` is the primary
 * key (AT-24) and folding on the word would put a parent out of reach. They
 * carry the same word and different values, which is what `choiceValues` is for.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: what the WBS parent (`PR-15`) is
 * chosen from, and what each candidate is spelled as. Table T-016 calls the item
 * 選択 and says the depth is derived from it; the schema gives `wbsParentUid` no
 * enumeration, because its candidates are the document's own tasks and not a
 * fixed set. Looked in table T-016, `_source/grs-document.schema.json`, FR-005
 * and table T-058 (AT-24 / AT-25 / AT-27). Chose every OTHER task, in the order
 * the document holds them, with the empty spelling first for a task that has no
 * parent -- which is what AT-25's `null` means.
 * ⛔ Descendants are NOT filtered out here: FR-005's cycle rule (HM-4 of table
 * T-015a) is the write side's (CM-18), and a chooser that judged it would be a
 * second reading of one rule. ⛔ NEITHER IS A DEPTH CAP APPLIED: FR-004 (MUST
 * NOT) forbids the WBS depth to be clamped and says in as many words that
 * `S-125` is the `TaskGroup` depth and not this one.
 * ⚠️ A task with no name (AT-27 admits `null`) is spelled with its `uid`. It
 * stays a candidate because dropping it would put a real parent out of reach,
 * and the empty spelling is already taken by the root candidate -- so the one
 * thing left to show is the key. ⛔ There is no row for this; it is chosen here
 * and said aloud rather than hidden.
 *
 * @provisional PND-272
 * @purity pure
 */
function parentCandidates(schedule: Schedule, subjectUid: number): Candidates {
  const words: string[] = ['']
  const values: string[] = ['']

  for (const one of schedule.tasks) {
    if (one.uid === subjectUid) continue
    words.push(one.name ?? String(one.uid))
    values.push(String(one.uid))
  }

  return { words, values }
}

/**
 * What a `choice` control offers, and `null` for every other kind.
 *
 * ⚠️ An enumeration's candidates commit the word they show, so `values` is
 * `null` for every column but the one whose roster is the document's own.
 *
 * @purity pure
 */
function candidatesOf(
  schedule: Schedule,
  entity: ShapedEntity,
  column: string,
  subjectUid: number | null,
): Candidates | null {
  if (entity === 'Task' && column === 'wbsParentUid' && subjectUid !== null) {
    return parentCandidates(schedule, subjectUid)
  }
  const choices = COLUMN_SHAPES[entity][column]?.choices ?? null
  return choices === null ? null : { words: choices, values: null }
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
  labelCoef: number,
): PropertyControl {
  const kind = controlKindOf(entity, column)
  const shape = COLUMN_SHAPES[entity][column]
  const candidates = kind === 'choice' ? candidatesOf(schedule, entity, column, subjectUid) : null
  const values = candidates === null ? null : candidates.values
  return {
    key,
    kind,
    text,
    choices: candidates === null ? null : candidates.words,
    // ⛔ ABSENT, NOT `null`, WHERE THE WORDS ARE THE VALUES -- `PropertyControl`
    // fixes that, and every surface then reads the word itself.
    ...(values === null ? {} : { choiceValues: values }),
    min: kind === 'number' ? (shape?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? null) : null,
    widthInFontSizes: widthOf(text, candidates === null ? null : candidates.words, labelCoef),
  }
}

/**
 * How much room one control needs, as a multiple of its own font size.
 *
 * ⭐ FR-006 (MUST NOT): 「1 つの操作子に、その値を出すのに要る幅より狭い幅を
 * 割ってはならない」, and the room it names is FR-093's estimate plus S-199 of
 * table T-206 -- the frame, the inner padding, and whatever aid the host puts
 * inside a control of that type (a `date` opens a calendar from a button drawn
 * INSIDE the field, which is why a date wide enough for its digits still cut
 * them off).
 *
 * ⛔ THE FONT SIZE IS DIVIDED OUT OF BOTH TERMS, NOT DROPPED. FR-093's estimate
 * is 「単位数 × フォントサイズ × labelCoef」 and S-199 is a multiple of the same
 * size, so the size is a factor of the whole sum -- taking it out leaves a
 * number the drawing side multiplies back in by writing the room in the
 * control's own `em`. ⚠️ It could not be left in: FR-006 has the size as S-197
 * times what the HOST gives, and the host is past IF-9.
 *
 * ⛔ AND IT MUST NOT BE RESOLVED TO PIXELS ANYWHERE. FR-006 (MUST NOT) refuses
 * a px constant for WCAG 2.1's 1.4.4 -- a room that does not double when the
 * reader doubles their text leaves the panel behind while every other surface
 * follows.
 *
 * ⚠️ THE CHOICES ARE MEASURED TOO, not only the value. A chooser is as wide as
 * the widest word it offers, and a control showing a short name while holding a
 * long candidate would cut that candidate off the moment it was chosen.
 *
 * @purity pure
 */
function widthOf(text: string, choices: readonly string[] | null, labelCoef: number): number {
  const widest = (choices ?? []).reduce((most, one) => Math.max(most, labelUnits(one)), labelUnits(text))
  return widest * labelCoef + NOT_STORED_PROPERTY_CONTROL_SIZES['S-199']
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
 * ⭐ THE CONTROL STANDS ON THE PERSON WHO IS ALREADY THERE, WHICH IS WHAT MAKES
 * IT NAME ANYBODY. Every other control of table T-016 carries its column's value
 * as its own text, so drawing the control drew the value; this one carried
 * nothing, and the surface therefore had to write `PropertyField.text` out
 * BESIDE it -- putting the same names on the screen twice, once as that text and
 * once as the candidate the chooser was standing on. A chooser holding the
 * seated person's `uid` shows that person's NAME through the candidate it
 * selects, which is AS-6's MUST met by the control itself.
 * ⛔ THE VALUE IS THE `uid`, NOT THE NAME, and it is spelled exactly as
 * `choiceValues` spells it so that it names one of the candidates. ⚠️ It is not
 * a word on the screen: AS-6 (MUST NOT) forbids making a person read a `uid`,
 * and what a candidate COMMITS is not what a candidate SHOWS -- AS-9 (MUST) is
 * the row that keeps the two apart.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: which of several assignees the one
 * chooser stands on. A task may carry several assignments and a 選択 holds one.
 * Looked in table T-225 (AS-5 / AS-6 / AS-8 / AS-9 / AS-10), FR-059, FR-008 and
 * table T-016. Chose the first in `assigneesOf`'s order -- the order AS-8's
 * tie-break fixes, and the one FR-059 already reads first when it names one
 * assignee and counts the rest -- and the empty spelling for a task nobody is
 * on. ⚠️ WHAT IT COSTS, said rather than hidden: a task with two assignees has
 * ONE of them in the chooser, while the row's own text goes on naming both.
 *
 * ⭐ WHAT A SETTLED CANDIDATE DOES IS 割り当てる: AS-7 (MUST) creates the person
 * and assigns, AS-10 (MUST) only forbids a second assignment of someone already
 * on the task, and 解除 has its own row and its own signal (AS-3). ⛔ SO NOTHING
 * HERE RENAMES A `Resource`: AS-7 (MUST NOT) forbids reading a new name as a
 * rename, whoever is seated.
 * ⚠️ NEITHER HALF IS THIS FILE'S WORK. The commands are written by
 * `commandsFromAssignee` of `input-command-translator.ts`; this surface only
 * hands the settled value back with `PR-16` on it (IF-9).
 *
 * ⭐⭐ THIS FIELD IS THE DESTINATION OF AN ENTRANCE. AS-1 (MUST) sends a double
 * click on the assignee label to this row, the way MK-13's comment-box entry
 * arrives at `PR-21`. ⛔ NOTHING IS ADDED FOR IT ON THIS SIDE, and that is not an
 * omission: IF-9 has the focus asked for by the row a field declares, which is
 * `PropertyField.row`, and the field this control stands in already names
 * `PR-16` and already carries `isEditable`. What the row asks for beyond that is
 * not this unit's to give -- raising the panel is the shell's and putting a
 * person into a drawn control is the surface's (Chapter 5.3 under table T-065).
 * ⚠️ A 選択 is not a control a person types INTO, so the entrance this row's own
 * 入力の型 fixes cannot itself be the thing focused; the typed entrance of this
 * row is the search box AS-5 (MUST) has attached beside the chooser. ⛔ NO SECOND
 * CONTROL IS MINTED HERE TO SUIT THAT: the paragraph under table T-016 (MUST)
 * makes the form follow the 入力の型 column, and 選択 is what that column says.
 *
 * @purity pure
 */
function assigneeControl(schedule: Schedule, taskUid: number, labelCoef: number): PropertyControl {
  const people = assigneeChoices(schedule)
  const seated = assigneesOf(schedule, taskUid)[0]
  return {
    key: { holder: 'task', uid: taskUid, column: 'uid' },
    kind: 'choice',
    text: seated === undefined ? '' : String(seated.uid),
    choices: people.map((person) => person.name),
    // ⭐ AS-9 (MUST): what is chosen is the `uid`, and what is shown is the name
    // the roster holds for it -- AS-6 (MUST NOT) forbids the second to be the
    // first. ⚠️ Spelled the way every other value crosses this seam, as text:
    // `FieldCommit.text` is one string whatever the control was.
    choiceValues: people.map((person) => String(person.uid)),
    // ⭐ AS-5 (MUST) attaches a partial-match search beside the dropdown, as the
    // words a person may type a fragment of. ⛔ ONE ENTRY PER NAME AND NOT PER
    // PERSON, which is the opposite of `choices` above and for a stated reason: a
    // typed word settles a NAME, and AS-8 (MUST) already says what a name two
    // people carry means, so offering it twice would put two identical words in
    // the roster that typing one of them could not tell apart.
    searchWords: [...new Set(people.map((person) => person.name))],
    min: null,
    max: null,
    widthInFontSizes: widthOf(
      seated === undefined ? '' : String(seated.uid),
      people.map((person) => person.name),
      labelCoef,
    ),
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
  item: TaskPropertyItem,
  labelCoef: number,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row)) return []
  if (item.heldBy === 'assignment') return [assigneeControl(schedule, task.uid, labelCoef)]

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
    return controlOf(schedule, key, entity, column, text, task.uid, labelCoef)
  })
}

/** @purity pure */
function textOfItem(
  schedule: Schedule,
  task: Task,
  visual: TaskVisual | null,
  item: TaskPropertyItem,
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
function taskFields(
  schedule: Schedule,
  task: Task,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return TASK_ITEMS.map((item) => ({
    row: item.row,
    name: itemName(item.row, language),
    text: textOfItem(schedule, task, visual, item),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: controlsOfItem(schedule, task, item, labelCoef),
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
  labelCoef: number,
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
        labelCoef,
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
 * highlight box or the status line. FR-009 covers the dependency line, and
 * nothing states items for those two of the kinds SL-1 of table T-023c admits.
 * Looked in FR-072, FR-006, FR-009, table T-016 and table T-023c. Chose no
 * fields, so that the panel says nothing rather than an item roster invented
 * here.
 *
 * @purity pure
 */
function fieldsOfItem(
  schedule: Schedule,
  subject: ItemRef,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] | null {
  switch (subject.kind) {
    case 'task': {
      const task = taskByUid(schedule, subject.uid)
      return task === null ? null : taskFields(schedule, task, labelCoef, language)
    }
    case 'dependency': {
      const successor = taskByUid(schedule, subject.successorUid)
      const dependency = successor?.dependencies[subject.ordinal]
      if (successor === null || dependency === undefined) return null
      return dependencyFields(schedule, dependency, successor.uid, subject.ordinal, labelCoef)
    }
    case 'commentBox': {
      const box = schedule.commentBoxes.find((one) => one.id === subject.id)
      // ⚠️ The box is gone from the document, which is the same state a task's
      // arm answers `null` for -- FR-072 calls it the selection having gone.
      return box === undefined ? null : commentBoxFields(schedule, box, labelCoef, language)
    }
    case 'highlightBox':
    case 'statusLine':
      return []
  }
}

// ------------------------------------------------------- the comment box ----

/**
 * ⚠️ Derived from `Schedule` the way `TaskGroup` below is, and for the same
 * reason: PI-1 of table T-064 publishes the type and not the entities beneath
 * it.
 */
type CommentBox = Schedule['commentBoxes'][number]

/**
 * The rows of table T-016 whose 対象 is `CommentBox` -- `PR-21` 本文, which
 * `MK-13` (MUST) makes the destination of a double click on the box.
 *
 * ⭐ THE FIELD DECLARES ITS `PR-n`, WHERE FR-042's THREE DECLARE AN `AT-n`.
 * That difference is the two rows' own wording and not a choice made here:
 * table T-016's note for `PR-18` sends `MK-13` to `AT-53`, while `MK-13`'s
 * comment-box entry names `PR-21` and `PR-21`'s own note calls that row the
 * entrance to editing the body. ⛔ IF-9 has the shell ask for a field BY THE ROW
 * IT DECLARES, so declaring anything else would put that entrance out of reach.
 *
 * ⚠️ `isEditable` IS THE TABLE'S MARK AND `PR-21` CARRIES NONE, so the field is
 * editable; the CONTROL is a separate statement, and FR-006 (MUST) is what asks
 * for it -- the form follows the 入力の型 column, which for `PR-21` reads 複数行.
 * Nothing is spelled out here: the form comes off `MULTILINE_COLUMNS` and the
 * shape, and `PropertyFieldKey`'s `commentBox` arm keys by `id` and not `uid`
 * because AT-110 makes a box's key a `string`.
 *
 * STOP -- ⛔ THE WRITE SIDE IS NOT WIRED YET, and it is one case:
 * `commandFromFieldCommit` (`input-command-translator.ts`) has no `commentBox`
 * arm, so a settled value reaches no command. ⭐ The command itself is already
 * standing -- CM-48 `setCommentBoxText` in `edit-annotation.ts`.
 *
 * @purity pure
 */
function commentBoxFields(
  schedule: Schedule,
  box: CommentBox,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return COMMENT_BOX_ITEMS.map((item) => ({
    row: item.row,
    name: itemName(item.row, language),
    text: item.columns.map((column) => textOfValue(box[column])).join(PART_SEPARATOR),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: controlsOfCommentBoxItem(schedule, box, item, labelCoef),
  }))
}

/**
 * The controls of one row of table T-016 whose 対象 is `CommentBox`.
 *
 * ⚠️ `subjectUid` IS `null`, AND THAT IS NOT A PLACEHOLDER. The one thing
 * `controlOf` uses it for is `PR-15`'s chooser over the document's own tasks, a
 * `Task` row -- no `CommentBox` row of table T-016 offers candidates that are
 * not an enumeration, so there is nothing for a subject to be looked up by.
 *
 * ⚠️ READ-ONLY IS ASKED THE SAME WAY IT IS FOR A TASK: table T-016 marks no
 * `CommentBox` row 読み取り専用, so this returns a control today, and it stays
 * the table's answer rather than this file's if a mark ever arrives.
 *
 * @purity pure
 */
function controlsOfCommentBoxItem(
  schedule: Schedule,
  box: CommentBox,
  item: CommentBoxPropertyItem,
  labelCoef: number,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row)) return []
  return item.columns.map((column) =>
    controlOf(
      schedule,
      { holder: 'commentBox', id: box.id, column },
      'CommentBox',
      column,
      textOfValue(box[column]),
      null,
      labelCoef,
    ),
  )
}

// -------------------------------------------------------- the picked row ----

/**
 * ⚠️ Derived from `Schedule` rather than imported under its own name: `PI-1` of
 * table T-064 publishes the type and not the entities beneath it, and every
 * column this panel needs is reachable through it.
 */
type TaskGroup = Schedule['taskGroups'][number]

/**
 * The row of table T-058 that HOLDS each of the columns table T-016's
 * `TaskGroup` rows edit -- which is what `PropertyField.row` carries for them.
 *
 * ⛔ TWO TABLES NAME THESE ITEMS, AND EACH FIELD CAN DECLARE ONLY ONE. Table
 * T-016's note for `PR-18` settles which of the two the field names: the entity
 * is `AT-53` of `fig-erd-detail.md`, which is what `MK-13` of table T-023 names.
 * ⭐ `MK-13` is the double click FR-085 (MUST) makes the one route to renaming a
 * row, and IF-9 has the shell ask for the field BY THE ROW IT DECLARES -- so a
 * field declaring `PR-18` would be a field that entrance could no longer find.
 * ⚠️ THE ITEM'S OWN ROW IS STILL THE JOIN TO EVERYTHING ELSE: the shown name,
 * the print order, the 対象 and the read-only mark all arrive under the `PR-n`,
 * and only what the field DECLARES is the attribute row.
 *
 * ⚠️ Keyed by column rather than by row id, because it is the column the ERD has
 * a row for; a column with no entry stops the panel by name below.
 */
const ATTRIBUTE_ROW_BY_GROUP_COLUMN: Readonly<Record<string, string>> = {
  label: 'AT-53',
  color: 'AT-58',
  height: 'AT-59',
}

/**
 * The row one item of table T-016 declares, for the `TaskGroup` half.
 *
 * ⚠️ THE FIRST COLUMN'S, WHERE AN ITEM HOLDS SEVERAL. A field carries ONE row
 * and an item may carry several columns (`PR-3` does on the `Task` side), while
 * table T-058 has a row per column -- so the two cannot correspond one for one.
 * ⭐ Every `TaskGroup` item holds exactly one column today, so this stands in
 * for nothing; it is written rather than assumed because the manuscript is free
 * to add an item that does not.
 *
 * @purity pure
 */
function declaredRowOf(item: GroupPropertyItem): string {
  const [first] = item.columns
  const row = first === undefined ? undefined : ATTRIBUTE_ROW_BY_GROUP_COLUMN[first]
  if (row === undefined) {
    throw new Error(
      `table T-016 holds ${item.row}, and no row of table T-058 is named for what it edits`,
    )
  }
  return row
}

/**
 * The rows of table T-016 whose 対象 is `TaskGroup`, which is FR-042's name,
 * colour and height -- all editable, because that requirement (MUST) asks for
 * them to be edited here and the table marks none of them read-only.
 *
 * ⚠️ A row that specifies neither colour nor height writes neither: `AT-58`'s
 * `null` means the band colour is resolved from the theme and `AT-59`'s means
 * the height follows the number of stacked bars, and writing the resolved
 * answer in would offer the reader a derived value to edit.
 *
 * @purity pure
 */
function groupFields(
  schedule: Schedule,
  group: TaskGroup,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return GROUP_ITEMS.map((item) => ({
    row: declaredRowOf(item),
    name: itemName(item.row, language),
    text: item.columns.map((column) => textOfValue(group[column])).join(PART_SEPARATOR),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: READ_ONLY_ROWS.includes(item.row)
      ? []
      : item.columns.map((column) =>
          controlOf(
            schedule,
            { holder: 'taskGroup', groupId: group.id, column },
            'TaskGroup',
            column,
            textOfValue(group[column]),
            // ⚠️ A row has no task uid, and `null` says so rather than a
            // stand-in number: the one candidate roster built from a uid is
            // `PR-15`'s, which is a `Task` item, and AT-51 is a UUID -- there is
            // no number a row could be named by.
            null,
            labelCoef,
          ),
        ),
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
 * @provisional PND-142
 * @purity pure
 */
function fieldsOfSubject(
  schedule: Schedule,
  subject: PropertiesSubject,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] | null {
  const item = subjectOf(subject.selection)
  const itemFields = item === null ? [] : fieldsOfItem(schedule, item, labelCoef, language)
  if (itemFields === null) return null

  const groupId = onlyGroupId(subject.groupIds)
  if (groupId === null) return itemFields

  const group = schedule.taskGroups.find((held) => held.id === groupId)
  if (group === undefined) return null
  return [...itemFields, ...groupFields(schedule, group, labelCoef, language)]
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
 * ⭐ TABLE T-104 REACHES THIS FILE THROUGH THE DICTIONARY:
 * `tools/generate_display_words.py` reads that table every run and carries each
 * row's id, the keys it names and the word the screen shows into
 * `display-words.json`, so `PropertyField.row` is the real `K-n` and `name` is
 * the dictionary's word rather than the key spelled again.
 *
 * STOP -- ⛔ SIX KEYS HAVE NO ROW IN TABLE T-104, so no word of theirs is
 * settled and this surface shows none: `carryMaxDepth`, `commentBoxPad`,
 * `commentBoxWrapUnits`, `exportCanvasHeightCap`, `scrollDayOffset` and
 * `scrollGroupOffset`. All six stand in `_source/settings.json` and are printed
 * into `_assets/tbl-settings.md`, which holds VALUES and sends the name to
 * table T-104. ⛔ A name written here would settle six names the glossary has
 * not settled, which is the very thing table T-109's refusal of an English
 * column protects; the row is drawn with its value and no name, the same thing
 * an unwritten dictionary cell says everywhere else in this file.
 * ⚠️ Eight rows go the other way and are never shown, having no settings key:
 * `themeHue`, `zoomStep`, `zoomMin`, `zoomMax`, `importSeq`,
 * `planActualGuideColor`, `watermarkOpacity`, `language`.
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
function settingsFields(
  settings: DocumentSettings,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    // ⚠️ THE KEY IS THE FALLBACK FOR THE ROW AND NEVER FOR THE NAME. `row` is
    // not printed -- it is what `data-field-row` carries -- so a key standing in
    // for a row that does not exist tells a reader of the DOM which item this
    // is, while the same key standing in for a NAME would be the internal
    // spelling on the screen that the paragraph under table T-006a (MUST NOT)
    // forbids.
    row: settingsWordOf(key)?.rowId ?? key,
    name: settingsName(key, language),
    text: textOfSettingsValue(valueAt(settings, key)),
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
 * @provisional PND-144
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
      // The document is the subject on this side, and a document cannot go away
      // while a panel is describing it.
      isSubjectGone: false,
      fields: settingsFields(settings, session.language),
      // ⭐ THE SAME ENTRANCE ON BOTH ARMS. Table T-109 places its row on the
      // SURFACE, and FR-072's two contents are one surface -- a panel that lost
      // its way out when the settings came up would be a surface a reader
      // cannot put away.
      commands: panelCommands(session.language),
    }
  }

  // ⭐⭐ THIS IS WHERE FR-072's rule that the contents follow the selection while
  // the panel is up IS KEPT: the subject below is built from the LIVE
  // `selection` and `session.selectedGroupIds` whenever either holds anything,
  // and the remembered one is reached for only when both are empty.
  //
  // Nothing picked in either of the two sets SL-1 and FR-085 keep apart. That is
  // FR-072's "the selection was cleared", and it is when the remembered subject
  // takes over.
  const isNothingPicked = selection.items.length === 0 && session.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? session.propertiesSubject
    : { selection, groupIds: session.selectedGroupIds }
  const fields = subject === null ? null : fieldsOfSubject(schedule, subject, settings.labelCoef, session.language)

  // Two ways for the subject to have gone: nothing is picked any more, or what
  // is picked is no longer in the document. ⚠️ A selection made all at once is
  // NOT one of them -- it describes nothing because no rule names one of its
  // members, and nothing went away.
  const isSubjectGone = isNothingPicked || fields === null

  return {
    showing,
    isSubjectGone,
    fields: fields ?? [],
    commands: panelCommands(session.language),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: the contract in screen-renderer.ts fixes UF-61 at three
 * arguments, and FR-051 (MUST NOT) forbids a setting to hold the
 * value either -- so there is no door to pass it through. ⛔ It is
 * still not a document setting and must not become one.
 */
export const NOT_STORED_PROPERTY_CONTROL_SIZES: {
  /** S-199, in × */
  readonly 'S-199': number
} = {
  'S-199': 2.19,
}
// </generated>

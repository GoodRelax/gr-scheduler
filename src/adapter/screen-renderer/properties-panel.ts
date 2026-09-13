// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Which of the two contents shows (FR-072) arrives as
// `ScreenSession.propertiesShowing` and is never chosen here, which is what
// keeps an emptied selection from moving the panel to the settings.
//
// The subject has two halves because a row is picked apart from everything else
// (SL-1 of table T-023c, FR-085).
//
// One field per row of table T-016, one control per column: a field carries one
// name and one read-only mark, and both are per row (FR-006).
// The rosters hold `keyof` their owning type, so a renamed column stops
// compiling here instead of going stale.

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
// PI-5 of table T-064: FR-006 sizes a control by FR-093's own count, so it is
// imported rather than written again.
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
// Table T-016, generated from `_source/property-items.json`. Its shown names are
// in the dictionary under the same row ids (FR-006).
import propertyItems from './property-items.json'

// ------------------------------------------------------------- the words ----

/**
 * What stands between the parts of one field's text.
 *
 * Table T-016's own spelling between the columns of one cell, used for every
 * multi-part value (columns, assignees, list members) so every field reads alike.
 */
const PART_SEPARATOR = ' / '

/** How table T-104 and `SETTINGS_DEFAULTS` spell a key that reaches inside a group. */
const KEY_PATH_SEPARATOR = '.'

/** What `textOfDay` puts between the day and the time of day (EX-7 of table T-033). */
const DAY_TIME_SEPARATOR = 'T'

// No heading row is built: FR-072 (MUST NOT).

// ------------------------------------------------ the way out (table T-109) --

/**
 * Table T-109's 面 value for this panel (U-25 of table T-103). It is the join to
 * the generated roster, so it is spelled exactly as `icon-roster.json` prints it.
 */
const PROPERTIES_PANEL = 'Properties Panel'

/** The words of table T-109's rows by row id -- a `Map` because a description is built every frame. */
const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/** The name each row of table T-016 shows, by row id: one per row, not per column (FR-006). */
const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

/**
 * The row of table T-104 a settings key sits in, and that row's word. The
 * dictionary is keyed by `K-n` and one row may name several keys (table T-104's
 * preamble), so this flattens it.
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
 * The fallback is `=== ''`, never `||` or `??`: an empty cell means the word is
 * unsettled, and `NO_ENTRY_WORDS` is where that state is answered.
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
 * The column name is never the fallback: it would put the internal spelling on
 * the screen (FR-006) and make a row whose word nobody wrote look finished.
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
 * A dotted key with no row of its own (`exportCanvas.width` under `K-87`) takes
 * the word of the row its path stands under; no second word is minted for the
 * part, since the screen word is one per row.
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
 * The key is never the fallback, for `itemName`'s reason (the paragraph under
 * table T-006a, MUST NOT).
 *
 * @purity pure
 */
function settingsName(key: string, language: DisplayLanguage): string {
  const word = settingsWordOf(key)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

/**
 * The entries table T-109 places on this panel, in that table's order.
 *
 * Read off the generated roster by the 面 column, as `headerCommands` and
 * `commandsOnSurface` do (FR-029); no row id is named, so renumbering cannot
 * stale it.
 * `isEnabled` is true in both FR-072 contents: a surface being described is open,
 * and closing it is always allowed. `isArmed` is false because this surface's
 * rows hold an em dash in the 構え column (FR-053).
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

/** One row of table T-016, with the entity its values live in (`heldBy`). */
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
 * Narrowing on the 対象 narrows the columns too, so `textOfItem` never has to
 * answer for a `TaskGroup` column against a `Task`.
 */
type TaskPropertyItem = Extract<PropertyItem, { heldBy: 'task' | 'taskVisual' | 'assignment' }>
type GroupPropertyItem = Extract<PropertyItem, { heldBy: 'taskGroup' }>
type CommentBoxPropertyItem = Extract<PropertyItem, { heldBy: 'commentBox' }>

/** The values of table T-016's 対象 column, spelled as that table spells them. */
type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox'

const APPLIES_TO_TASK: AppliesTo = 'Task'
const APPLIES_TO_TASK_GROUP: AppliesTo = 'TaskGroup'
const APPLIES_TO_COMMENT_BOX: AppliesTo = 'CommentBox'

/**
 * Where the values of a row whose 対象 is `Task` live -- the one fact about such
 * a row table T-016 does not carry (`PR-16`'s is `Assignment`, per its note).
 * Keyed by row id, so a new row fails by name in `heldByOf` rather than being
 * drawn against the wrong entity.
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
 * Only the `Task` side needs the map: one 対象 value covers three holders there,
 * while a `TaskGroup` or `CommentBox` row's items are its own columns (ET-13 of
 * table T-056).
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
 * Table T-016's rows, read off the generated roster
 * (`tools/generate_property_items.py`).
 *
 * The array order is the printed order FR-006 requires, not row-id order -- do
 * not re-sort it.
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
 * The rows each kind of subject puts up: filtered by 対象 and never sorted
 * (FR-006), and split once at load rather than every frame.
 */
const TASK_ITEMS: readonly TaskPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is TaskPropertyItem => item.appliesTo === APPLIES_TO_TASK,
)

const GROUP_ITEMS: readonly GroupPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is GroupPropertyItem => item.appliesTo === APPLIES_TO_TASK_GROUP,
)

const COMMENT_BOX_ITEMS: readonly CommentBoxPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is CommentBoxPropertyItem => item.appliesTo === APPLIES_TO_COMMENT_BOX,
)

const READ_ONLY_ROWS: readonly string[] = propertyItems.items
  .filter((item) => item.isReadOnly)
  .map((item) => item.rowId)

// ------------------------------------------------------------ the values ----

/**
 * A stored value written out for the screen.
 *
 * STOP -- not decided by the specification: how a number, a truth value or a
 * list is spelled on this panel. Looked in table T-016, FR-006, FR-072 and
 * `_assets/tbl-settings.md`. Chose the stored spelling: the dictionary has no
 * section for stored values, so an added word could not be translated.
 * A column that holds nothing writes nothing, never a default: FR-007 tells a
 * chosen value from one never set.
 *
 * @purity pure
 */
function textOfValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOfValue).join(PART_SEPARATOR)

  // STOP -- not decided by the specification: how a settings value that is a
  // group of its own is written (`dualCursor` reaches here whole). Looked in
  // table T-104, `_assets/tbl-settings.md` and `_source/settings.json`, which
  // gives a type but no spelling. Chose nothing over an invented shape.
  return ''
}

/**
 * The shape of a `format: uuid` value, as `scrollGroupId` and `pinnedGroupIds`
 * hold one. Asked by shape, not by key: a hand roster of id-holding keys would
 * miss the next one added.
 */
const IDENTIFIER = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * A settings value written out for the screen, with no identifier in it (the
 * paragraph under table T-006a, MUST NOT).
 *
 * STOP -- no line says what stands in the identifier's place. Looked in table
 * T-104 (`scrollGroupId` and `pinnedGroupIds` are named, with no printing rule),
 * FR-072, FR-006, table T-016 and `_assets/tbl-settings.md`. Chose nothing, which
 * the MUST NOT certainly allows; showing the row's name would be a rule invented
 * here.
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
 * A date column written out for the screen (FR-054): `dayOf` holds that reading,
 * and the spelling is `textOfDay`'s date part (EX-7), so no date format is minted.
 *
 * @purity pure
 */
function textOfDateColumn(stored: unknown): string {
  const day = typeof stored === 'string' ? dayOf(stored) : null
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

/**
 * `TaskVisual` has no entry in the generated `DATE_COLUMNS`, so no visual column
 * is a date.
 *
 * @purity pure
 */
function textOfTaskColumn(task: Task, column: keyof Task): string {
  if (DATE_COLUMNS.Task.includes(column)) return textOfDateColumn(task[column])
  return textOfValue(task[column])
}

/**
 * One person PR-16 shows: the name is shown (AS-6); the uid orders same-named
 * people (AS-8) and is what a candidate commits (AS-9), and is never shown.
 */
interface Assignee {
  readonly name: string
  readonly uid: number
}

/**
 * Name ascending, the smaller uid first on a tie (AS-8, FR-059).
 *
 * @purity pure
 */
function compareAssignees(a: Assignee, b: Assignee): number {
  if (a.name === b.name) return a.uid - b.uid
  return a.name < b.name ? -1 : 1
}

/**
 * The people the task's assignments reach, in `compareAssignees` order.
 *
 * One walk serves the row's text and the chooser's seated person, so the chooser
 * never stands on someone the text does not name.
 * FR-059's work-resource filter is not borrowed: this surface edits assignments,
 * and hiding a material or cost resource would make it unremovable. A resource
 * with no name is left out, since AS-6 forbids showing the uid instead -- the
 * same test `assigneeChoices` applies. Unlike names order by code unit: no row
 * fixes a collation, and a locale one would order one document differently on
 * two machines.
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
 * STOP -- not decided by the specification: how several assignees are written on
 * this panel. FR-059's first-name-and-count governs the label, and AS-5 makes
 * this a different surface. Looked in table T-225 (AS-5 / AS-6 / AS-9), FR-059,
 * FR-008 and table T-016. Chose every name, in `compareAssignees` order.
 *
 * @purity pure
 */
function assigneeText(schedule: Schedule, taskUid: number): string {
  return assigneesOf(schedule, taskUid)
    .map((assignee) => assignee.name)
    .join(PART_SEPARATOR)
}

/**
 * The candidates PR-16 chooses from (AS-5), walked from the document's
 * `Resource` rows as `parentCandidates` walks its tasks.
 *
 * One entry per person, never per name: AS-9 makes this chooser the only place
 * same-named people are told apart. The name filter, the absent FR-059 filter
 * and the code-unit order follow `assigneesOf`.
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
 * Table T-016's 色 columns. Written out because the schema types every colour as
 * a plain `string`; the table's other kinds are derived (FR-006).
 */
const COLOUR_COLUMNS: readonly string[] = ['strokeColor', 'fillColor', 'color']

/** Table T-016's 複数行 columns. */
const MULTILINE_COLUMNS: readonly string[] = ['notes', 'text']

/**
 * The 選択 item whose candidates are the document's own tasks. `COLUMN_SHAPES`
 * types `wbsParentUid` as an integer, so reading the kind off the shape would
 * offer a box to type a uid into. Candidates: `parentCandidates`.
 */
const CHOICE_OVER_DOCUMENT_COLUMNS: readonly string[] = ['wbsParentUid']

/** Which entity of `COLUMN_SHAPES` holds an item's columns. `PR-16` has none: its item is not a column. */
type ShapedEntity = keyof typeof COLUMN_SHAPES

/**
 * The form one column is edited in -- table T-016's 入力の型, worked out from
 * what the column accepts.
 *
 * The order of the tests matters: colours, multi-line notes and dates are
 * `string` and the WBS parent is `integer` in the manuscript, so the questions
 * the shape cannot answer are asked first.
 *
 * @purity pure
 */
function controlKindOf(entity: ShapedEntity, column: string): PropertyControlKind {
  if (COLOUR_COLUMNS.includes(column)) return 'color'
  if (MULTILINE_COLUMNS.includes(column)) return 'multiline'
  if (CHOICE_OVER_DOCUMENT_COLUMNS.includes(column)) return 'choice'
  // Asked of the whole roster, not of one named entity: `DATE_COLUMNS` holds only
  // entities that have a date column, so an absent entity means none, and naming
  // one entity would draw another entity's date column as text.
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
      // `map`, `array` and `object` land here too; no row of table T-016 names
      // such a column, and no write command takes one.
      return 'text'
  }
}

/**
 * What one `choice` control offers: the words it shows and what each commits.
 *
 * Built as one pair because `PropertyControl.choiceValues` is read by position
 * against the words. `values` is `null` where the words are the values.
 */
interface Candidates {
  readonly words: readonly string[]
  readonly values: readonly string[] | null
}

/**
 * The tasks PR-15 can be given as a WBS parent: the name is the word and the uid
 * the value, as for PR-16, since a uid carries no meaning to read (AT-24). Two
 * tasks of one name stay two candidates.
 *
 * STOP -- not decided by the specification: what the WBS parent (`PR-15`) is
 * chosen from, and how each candidate is spelled. Looked in table T-016,
 * `_source/grs-document.schema.json`, FR-005 and table T-058 (AT-24 / AT-25 /
 * AT-27). Chose every other task in document order, with the empty spelling first
 * for no parent (AT-25's `null`).
 * Descendants are not filtered out: that cycle rule is the write side's (CM-18),
 * and judging it here would be a second reading. No depth cap: FR-004 (MUST NOT).
 * A task with no name is spelled by its uid: dropping it would put a parent out
 * of reach, and the empty spelling is the root's. No row covers this.
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
 * The schema's bounds are carried only for `number`: any other kind has nothing
 * to clamp, and a bound on it would offer the drawing side a rule it cannot apply.
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
    // Absent, not `null`, where the words are the values (`PropertyControl`).
    ...(values === null ? {} : { choiceValues: values }),
    min: kind === 'number' ? (shape?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? null) : null,
    widthInFontSizes: widthOf(text, candidates === null ? null : candidates.words, labelCoef),
  }
}

/**
 * How much room one control needs (FR-006: FR-093's estimate plus S-199), as a
 * multiple of its own font size.
 *
 * The size is a factor of both terms and is divided out, not dropped: it is S-197
 * times what the host gives, which only the surface past IF-9 knows. Never
 * resolve it to px (FR-006).
 * The choices are measured too: a chooser must fit the widest word it may come
 * to hold.
 *
 * @purity pure
 */
function widthOf(text: string, choices: readonly string[] | null, labelCoef: number): number {
  const widest = (choices ?? []).reduce((most, one) => Math.max(most, labelUnits(one)), labelUnits(text))
  return widest * labelCoef + NOT_STORED_PROPERTY_CONTROL_SIZES['S-199']
}

/**
 * PR-16's one control, a 選択 (table T-016).
 *
 * The key names the task with column `uid`: `PropertyFieldKey` has no arm for an
 * item that is not a column, so `PropertyField.row` (`PR-16`, IF-9) says what the
 * commit is about. `uid` because no command of table T-108 sets it, so a commit
 * that arrived without its row would write nothing.
 * `text` is the seated person's uid, so the chooser shows that person's name
 * through its selected candidate rather than the surface repeating the row text
 * beside it (AS-6, AS-9).
 *
 * STOP -- not decided by the specification: which of several assignees the one
 * chooser stands on. Looked in table T-225 (AS-5 / AS-6 / AS-8 / AS-9 / AS-10),
 * FR-059, FR-008 and table T-016. Chose the first in `assigneesOf`'s order, and
 * the empty spelling for a task nobody is on. The cost: a task with two assignees
 * has one in the chooser while the row's text names both.
 *
 * The commands are built by `commandsFromAssignee` (`input-command-translator.ts`).
 * AS-1's focus needs nothing more here: IF-9 finds the field by its declared row.
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
    // AS-9: the uid is committed and the name shown. Spelled as text because
    // `FieldCommit.text` is one string whatever the control was.
    choiceValues: people.map((person) => String(person.uid)),
    // AS-5's search words: one per NAME, unlike `choices`, because a typed word
    // settles a name (AS-8), and a name offered twice could not be told apart.
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

// FR-009 fixes the dependency items, and table T-016 has no rows for them, so each
// column item declares its table T-058 row (the form `PropertyField.row` allows).
// The kind shows as the stored code: table T-018's spellings are not generated
// into `src/`.
const DEPENDENCY_ITEMS: readonly { readonly row: string; readonly column: keyof Dependency }[] = [
  { row: 'AT-46', column: 'linkType' },
  { row: 'AT-47', column: 'lag' },
  { row: 'AT-45', column: 'predecessorUid' },
]

// STOP -- no row holds the far end: the successor is the task that holds the
// dependency, not a column (AT-45's note in table T-058). Looked in table T-058,
// table T-016, FR-009 and table T-023c. Chose the requirement that puts it on the
// panel as its row.
const SUCCESSOR_ROW = 'FR-009'

/** Spelled the way `ItemRef` spells it, so the far end has one name in both files. */
const SUCCESSOR_NAME: keyof Extract<ItemRef, { kind: 'dependency' }> = 'successorUid'

/** @purity pure */
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
      // STOP -- no control: no `PropertyFieldKey` can name the far end, and table
      // T-108 has no command that moves a dependency between tasks. Looked in
      // table T-108, table T-058 (AT-45), FR-009 and table T-016.
      controls: [],
    },
  ]
}

/**
 * Which of the selected things the panel describes.
 *
 * STOP -- not decided by the specification: what the panel shows when several
 * things are selected at once. Looked in FR-072, FR-006, FR-009 and table T-023c.
 * Chose the only item when exactly one is held, else the one picked last;
 * `lastPicked` refuses a selection made all at once (SL-7b), and then nothing is
 * described.
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
 * -- one of the two states FR-072 calls the selection having gone.
 *
 * STOP -- not decided by the specification: what this panel shows for a
 * highlight box or the status line. Looked in FR-072, FR-006, FR-009, table T-016
 * and table T-023c. Chose no fields rather than an item roster invented here.
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
      return box === undefined ? null : commentBoxFields(schedule, box, labelCoef, language)
    }
    case 'highlightBox':
    case 'statusLine':
      return []
  }
}

// ------------------------------------------------------- the comment box ----

/** Derived from `Schedule`: PI-1 of table T-064 publishes the type, not the entities beneath it. */
type CommentBox = Schedule['commentBoxes'][number]

/**
 * The rows of table T-016 whose 対象 is `CommentBox`.
 *
 * The field declares its `PR-n`, where FR-042's fields declare an `AT-n`: MK-13
 * names `PR-21` for the comment box, and IF-9 finds a field by the row it declares.
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
 * `subjectUid` is `null`, not a placeholder: only `PR-15`'s task chooser uses it.
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

/** Derived from `Schedule`, for `CommentBox`'s reason. */
type TaskGroup = Schedule['taskGroups'][number]

/**
 * The table T-058 row each `TaskGroup` column declares as `PropertyField.row`
 * (see that member for why). Keyed by column, which is what table T-058 has a row
 * for; a column with no entry stops the panel by name below.
 */
const ATTRIBUTE_ROW_BY_GROUP_COLUMN: Readonly<Record<string, string>> = {
  label: 'AT-53',
  color: 'AT-58',
  height: 'AT-59',
}

/**
 * The row one `TaskGroup` item of table T-016 declares.
 *
 * The first column's, where an item holds several: a field declares one row and
 * table T-058 has one per column. Written for an item the manuscript may add.
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
 * The rows of table T-016 whose 対象 is `TaskGroup` (FR-042).
 *
 * A `null` colour or height writes nothing: AT-58 and AT-59 resolve it, and
 * writing the resolved value would offer a derived value to edit.
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
            // A row has no task uid (AT-51 is a UUID); only `PR-15`'s task
            // chooser reads this.
            null,
            labelCoef,
          ),
        ),
  }))
}

/**
 * The one row the panel describes, or `null` while it is not exactly one.
 *
 * STOP -- not decided by the specification: which of several picked rows the
 * panel describes; FR-085 lets several be picked while FR-042 speaks of the row.
 * SL-7b's order cannot be borrowed: the row set is a separate, unordered set
 * (FR-085). Looked in FR-042, FR-085, table T-023c and table T-015. Chose a row
 * only while exactly one is picked.
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
 * STOP -- not decided by the specification: the order of the two halves when an
 * item and a row are picked at once. Looked in FR-072, FR-042, FR-006, table
 * T-016 and table T-023c. Chose the item's fields first, then the row's: table
 * T-016 is the roster FR-072 resolves to for a selection.
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
 * The walk `clampedSettings` makes over a dotted key, repeated because that walk
 * (`reach`) is private and table T-064 publishes only the type and the clamp.
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
 * The document's drawing settings (IC-17 of table T-109). `row` and `name` come
 * from table T-104 through `display-words.json` (`tools/generate_display_words.py`).
 *
 * STOP -- not decided by the specification: which settings this panel shows, and
 * in what order. Looked in IC-17 (no subset named), table T-104 and FR-072 (no
 * roster). Chose every key of `DocumentSettings` (DR-3 of table T-052): a superset
 * cannot close an editing route. The order is the generated roster's.
 *
 * STOP -- not decided by the specification: whether any settings item is
 * read-only. Table T-104 and `_assets/tbl-settings.md` mark none, and UN-13 of
 * table T-027 undoes settings changes, so they are edited somewhere. Chose editable.
 *
 * @purity pure
 */
function settingsFields(
  settings: DocumentSettings,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    // The key stands in for a missing row, never for the name: `row` is only
    // `data-field-row`, while the key as a name would break the paragraph under
    // table T-006a (MUST NOT).
    row: settingsWordOf(key)?.rowId ?? key,
    name: settingsName(key, language),
    text: textOfSettingsValue(valueAt(settings, key)),
    isEditable: true,
    // STOP -- no control yet: no `PropertyFieldKey` arm names a settings key, and
    // the presentation group's commands are CM-56 .. CM-71. `isEditable` stays
    // true for the UN-13 reason above -- what is missing is the surface.
    controls: [],
  }))
}

// ------------------------------------------------------------- the panel ----

/**
 * The `Properties Panel` (U-25) for one frame, or `null` while it is closed.
 *
 * What is kept across an emptied selection is the subject
 * (`ScreenSession.propertiesSubject`), not the drawn fields: FR-072 returns to
 * the previous selection, and kept fields would show values an edit has already
 * made untrue. That memory is the shell's; table T-203 holds only the width (S-80).
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
      // A document cannot go away while a panel is describing it.
      isSubjectGone: false,
      fields: settingsFields(settings, session.language),
      commands: panelCommands(session.language),
    }
  }

  // The live selection builds the subject whenever either set holds anything, so
  // the contents follow the selection while shown (FR-072); the remembered subject
  // takes over only when both are empty, which is FR-072's cleared selection.
  const isNothingPicked = selection.items.length === 0 && session.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? session.propertiesSubject
    : { selection, groupIds: session.selectedGroupIds }
  const fields = subject === null ? null : fieldsOfSubject(schedule, subject, settings.labelCoef, session.language)

  // A selection made all at once describes nothing, yet is not gone: nothing
  // left the document.
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

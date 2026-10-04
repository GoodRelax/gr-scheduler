// ScreenRenderer: the Properties Panel's content for one frame.
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  DATE_COLUMNS,
  actualLastDay,
  actualLengthOf,
  customColourOf,
  customSideOf,
  dayOf,
  isSearchWordFound,
  lagWorkingDaysOf,
  minutesPerWorkingDayOf,
  TENTHS_OF_A_MINUTE,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  type Dependency,
  type Project,
  type Schedule,
  type Task,
  type TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import {
  lastPicked,
  type ItemRef,
  type Selection,
} from '../../entity/document-model/selection/selection'
import {
  labelUnits,
  labelledAssigneeUidOf,
  type RowPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  PropertiesSubject,
  ScreenSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { colourOf, swatchOf } from '../svg-renderer/svg-renderer'
import type {
  AssigneeCandidate,
  AssigneeCombo,
  ColourSide,
  CommandItem,
  DisplayLanguage,
  IconId,
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  PropertyFieldKey,
  ScreenViewReadings,
} from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import dependencyKinds from './dependency-kinds.json'
import displayWords from './display-words.json'
import iconRoster from './icon-roster.json'
import propertyItems from './property-items.json'
import themeHueRoster from './theme-hue-roster.json'

const PART_SEPARATOR = ' / '

const KEY_PATH_SEPARATOR = '.'

const DAY_TIME_SEPARATOR = 'T'

const PROPERTIES_PANEL = 'Properties Panel'

const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

// see FR-009, T-018
const DEPENDENCY_KINDS = dependencyKinds.dependencyKinds

const SETTINGS_WORDS_BY_KEY = new Map(
  displayWords.settings.flatMap((entry) =>
    entry.keys.map((key) => [key, entry] as const),
  ),
)

const NO_ENTRY_WORDS = ''

// see FR-038
/** @purity pure */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = ENTRY_WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

// see FR-006, FR-038, PR-1
// WHY: a milestone's name row reads the row's own milestone word, any other row its label.
/** @purity pure */
function itemName(row: string, language: DisplayLanguage, isMilestone = false): string {
  const words = ITEM_WORDS_BY_ROW.get(row)
  const said = isMilestone && words !== undefined && 'milestoneLabel' in words ? words.milestoneLabel : words?.label
  const word = said?.[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

// see T-104
/** @purity pure */
function settingsWordOf(key: string): (typeof displayWords.settings)[number] | undefined {
  const own = SETTINGS_WORDS_BY_KEY.get(key)
  if (own !== undefined) return own
  const separator = key.lastIndexOf(KEY_PATH_SEPARATOR)
  return separator === -1 ? undefined : SETTINGS_WORDS_BY_KEY.get(key.slice(0, separator))
}

/** @purity pure */
function settingsName(key: string, language: DisplayLanguage): string {
  const word = settingsWordOf(key)?.label[language]
  if (word === undefined) return NO_ENTRY_WORDS
  return word === '' ? NO_ENTRY_WORDS : word
}

// see AS-5, IC-123, IC-124, IC-139
const ASCENDING_ENTRY: IconId = 'IC-123'
const DESCENDING_ENTRY: IconId = 'IC-124'
const GRS_RESET_ENTRY: IconId = 'IC-139'
// WHY: these sit inside a field of the panel, not on its way-out line beside IC-52.
const IN_FIELD_ENTRIES: readonly IconId[] = [ASCENDING_ENTRY, DESCENDING_ENTRY, GRS_RESET_ENTRY]

/** @purity pure */
function commandItemOf(icon: IconId, language: DisplayLanguage): CommandItem {
  return { icon, isEnabled: true, isPressed: false, isArmed: false, isChosen: false, label: entryLabel(icon, language) }
}

// see T-109, FR-029
/** @purity pure */
function panelCommands(language: DisplayLanguage): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(PROPERTIES_PANEL) && !IN_FIELD_ENTRIES.includes(row.rowId))
    .map((row) => commandItemOf(row.rowId, language))
}

// see T-016
// WHY: 'derived' rows are not columns of the document (PR-37, PR-38); 'dependency' rows are
// a selected dependency line's (FR-009).
type PropertyItem = {
  readonly row: string
  readonly appliesTo: AppliesTo
  readonly shownFor: string | null
  readonly oneInput: boolean
} & (
  | { readonly heldBy: 'task'; readonly columns: readonly (keyof Task)[] }
  | { readonly heldBy: 'taskVisual'; readonly columns: readonly (keyof TaskVisual)[] }
  | { readonly heldBy: 'assignment'; readonly columns: readonly ['assignee'] }
  | { readonly heldBy: 'derived'; readonly columns: readonly string[] }
  | { readonly heldBy: 'taskGroup'; readonly columns: readonly (keyof TaskGroup)[] }
  | { readonly heldBy: 'commentBox'; readonly columns: readonly (keyof CommentBox)[] }
  | { readonly heldBy: 'highlightBox'; readonly columns: readonly (keyof HighlightBox)[] }
  | { readonly heldBy: 'dependency'; readonly columns: readonly string[] }
)

type TaskPropertyItem = Extract<PropertyItem, { heldBy: 'task' | 'taskVisual' | 'assignment' | 'derived' }>
type GroupPropertyItem = Extract<PropertyItem, { heldBy: 'taskGroup' }>
type CommentBoxPropertyItem = Extract<PropertyItem, { heldBy: 'commentBox' }>
type HighlightBoxPropertyItem = Extract<PropertyItem, { heldBy: 'highlightBox' }>
type DependencyPropertyItem = Extract<PropertyItem, { heldBy: 'dependency' }>

type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox' | 'HighlightBox' | 'Dependency'

const APPLIES_TO_TASK: AppliesTo = 'Task'
const APPLIES_TO_TASK_GROUP: AppliesTo = 'TaskGroup'
const APPLIES_TO_COMMENT_BOX: AppliesTo = 'CommentBox'
const APPLIES_TO_HIGHLIGHT_BOX: AppliesTo = 'HighlightBox'
const APPLIES_TO_DEPENDENCY: AppliesTo = 'Dependency'

const HELD_BY_OF_OBJECT: Readonly<Partial<Record<AppliesTo, PropertyItem['heldBy']>>> = {
  TaskGroup: 'taskGroup',
  CommentBox: 'commentBox',
  HighlightBox: 'highlightBox',
  Dependency: 'dependency',
}

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
  'PR-14': 'task',
  'PR-15': 'task',
  'PR-16': 'assignment',
  'PR-17': 'taskVisual',
  'PR-34': 'task',
  'PR-35': 'task',
  'PR-36': 'task',
  'PR-37': 'derived',
  'PR-38': 'derived',
  'PR-39': 'taskVisual',
  'PR-40': 'taskVisual',
}

/** @purity pure */
function heldByOf(row: string, appliesTo: AppliesTo): PropertyItem['heldBy'] {
  const heldBy = HELD_BY_OF_OBJECT[appliesTo] ?? HELD_BY_ON_A_TASK[row]
  if (heldBy === undefined) {
    throw new Error(`table T-016 holds ${row}, and nothing says which entity holds its value`)
  }
  return heldBy
}

// TRAP: keep the roster's order, which is FR-006's printed order; never sort by row id.
const PROPERTY_ITEMS: readonly PropertyItem[] = propertyItems.items.map((item) => {
  const appliesTo = item.appliesTo as AppliesTo
  return {
    row: item.rowId,
    appliesTo,
    shownFor: item.shownFor,
    oneInput: item.oneInput,
    heldBy: heldByOf(item.rowId, appliesTo),
    columns: item.columns,
  } as PropertyItem
})

const TASK_ITEMS: readonly TaskPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is TaskPropertyItem => item.appliesTo === APPLIES_TO_TASK,
)

const GROUP_ITEMS: readonly GroupPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is GroupPropertyItem => item.appliesTo === APPLIES_TO_TASK_GROUP,
)

const COMMENT_BOX_ITEMS: readonly CommentBoxPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is CommentBoxPropertyItem => item.appliesTo === APPLIES_TO_COMMENT_BOX,
)

const HIGHLIGHT_BOX_ITEMS: readonly HighlightBoxPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is HighlightBoxPropertyItem => item.appliesTo === APPLIES_TO_HIGHLIGHT_BOX,
)

const DEPENDENCY_ITEMS: readonly DependencyPropertyItem[] = PROPERTY_ITEMS.filter(
  (item): item is DependencyPropertyItem => item.appliesTo === APPLIES_TO_DEPENDENCY,
)

// see FR-006, AT-30
// WHY: by Task.milestone, never by the shape column.
/** @purity pure */
function isShownFor(item: PropertyItem, task: Task): boolean {
  if (item.shownFor === null || item.shownFor === 'both') return true
  return item.shownFor === (task.milestone === true ? 'milestone' : 'task')
}

const PROPERTY_FIELD_WORDS = new Map(displayWords.propertyField.map((entry) => [entry.part, entry.text]))

const NAME_SLOT = '{name}'
const UID_SLOT = '{uid}'
const LINE_BREAK = '\n'

// see FR-009, PR-37, PR-38, PR-43, PR-44, FR-038
// WHY: replaced by a function, so a $ in a task's name is not read as a replacement pattern.
/** @purity pure */
function nameWithUid(name: string, uid: number, language: DisplayLanguage): string {
  return (PROPERTY_FIELD_WORDS.get('dependencyEnd')?.[language] ?? '')
    .replace(NAME_SLOT, () => name)
    .replace(UID_SLOT, () => String(uid))
}

/** @purity pure */
function dependencyEndText(schedule: Schedule, uid: number, language: DisplayLanguage): string {
  return nameWithUid(taskByUid(schedule, uid)?.name ?? '', uid, language)
}

// see PR-37, PR-38
/** @purity pure */
function linkedEndsText(schedule: Schedule, task: Task, column: string, language: DisplayLanguage): string {
  const uids =
    column === 'predecessors'
      ? task.dependencies.map((link) => link.predecessorUid)
      : schedule.tasks.flatMap((one) =>
          one.dependencies.filter((link) => link.predecessorUid === task.uid).map(() => one.uid),
        )
  return [...uids]
    .sort((a, b) => a - b)
    .map((uid) => dependencyEndText(schedule, uid, language))
    .join(LINE_BREAK)
}

const READ_ONLY_ROWS: readonly string[] = propertyItems.items
  .filter((item) => item.isReadOnly)
  .map((item) => item.rowId)

/** @purity pure */
function textOfValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOfValue).join(PART_SEPARATOR)

  return ''
}

// WHY: found by shape, not by key: a hand roster of id-holding keys misses the next one added.
const IDENTIFIER = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** @purity pure */
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

// see FR-054, EX-7
/** @purity pure */
function textOfDateColumn(stored: unknown): string {
  const day = typeof stored === 'string' ? dayOf(stored) : null
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

// TRAP: assumes TaskVisual has no date column; textOfItem would write a new one raw.
/** @purity pure */
function textOfTaskColumn(schedule: Schedule, task: Task, column: keyof Task): string {
  if ((column as string) === ACTUAL_LENGTH_ITEM) return textOfActualLength(schedule, task)
  if (DATE_COLUMNS.Task.includes(column)) return textOfDateColumn(task[column])
  return textOfValue(task[column])
}

// see PR-5, P-5
// WHY: the name of PR-5's row, not a Task column; the length is counted from the dates (FR-011).
const ACTUAL_LENGTH_ITEM = 'actualDuration'

// see PR-5, FR-011
/** @purity pure */
function textOfActualLength(schedule: Schedule, task: Task): string {
  const start = dayOf(task.actualStart)
  const lastDay = actualLastDay(task)
  if (start === null || lastDay === null) return textOfValue(null)
  return textOfValue(actualLengthOf(workingCalendarOf(schedule), start, lastDay))
}

interface Assignee {
  readonly name: string
  readonly uid: number
}

// see AS-8, FR-059
// WHY: code-unit order, not a locale collation: no row fixes one, and a locale orders one document differently per machine.
/** @purity pure */
function compareAssignees(a: Assignee, b: Assignee): number {
  if (a.name === b.name) return a.uid - b.uid
  return a.name < b.name ? -1 : 1
}

// see AS-6
// WHY: no FR-059 work-resource filter: this surface edits assignments, and a hidden resource could not be removed.
/** @purity pure */
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

/** @purity pure */
function assigneeText(schedule: Schedule, taskUid: number): string {
  return assigneesOf(schedule, taskUid)
    .map((assignee) => assignee.name)
    .join(PART_SEPARATOR)
}

// see AS-5, AS-9
/** @purity pure */
function assigneeChoices(schedule: Schedule): readonly Assignee[] {
  const people: Assignee[] = []
  for (const resource of schedule.resources) {
    if (resource.name === null) continue
    people.push({ name: resource.name, uid: resource.uid })
  }
  people.sort(compareAssignees)
  return people
}

const MULTILINE_COLUMNS: readonly string[] = ['notes', 'text']

const CHOICE_OVER_DOCUMENT_COLUMNS: readonly string[] = ['wbsParentUid']

type ShapedEntity = keyof typeof COLUMN_SHAPES

// see T-016
/** @purity pure */
function controlKindOf(entity: ShapedEntity, column: string): PropertyControlKind {
  // TRAP: keep these first: notes and dates are strings, and wbsParentUid is an integer to the shape.
  if (COLUMN_SHAPES[entity][column]?.kind === 'color') return 'color'
  if (MULTILINE_COLUMNS.includes(column)) return 'multiline'
  if (CHOICE_OVER_DOCUMENT_COLUMNS.includes(column)) return 'choice'
  // WHY: PR-5 has no column shape to read since AT-35 retired, and table T-016 still takes a number.
  if (entity === 'Task' && column === ACTUAL_LENGTH_ITEM) return 'number'
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
      return 'text'
  }
}

interface Candidates {
  readonly words: readonly string[]
  readonly values: readonly string[] | null
}

// see PR-15, AT-25
/** @purity pure */
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

/** @purity pure */
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

/** @purity pure */
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
    ...(values === null ? {} : { choiceValues: values }),
    min: kind === 'number' ? (shape?.min ?? annotationBoundsOf(entity, column)?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? annotationBoundsOf(entity, column)?.max ?? null) : null,
    widthInFontSizes: widthOf(text, candidates === null ? null : candidates.words, labelCoef),
  }
}

// see FR-006, T-217
// WHY: the schema leaves these columns unbounded on purpose; table T-217 holds their range (FR-006).
/** @purity pure */
function annotationBoundsOf(entity: ShapedEntity, column: string): { readonly min: number; readonly max: number } | null {
  const key = `${entity}.${column}`
  return Object.values(NOT_STORED_ANNOTATION_BOUNDS).find((row) => row.key === key) ?? null
}

// see FR-006, FR-093, S-199
/** @purity pure */
function widthOf(text: string, choices: readonly string[] | null, labelCoef: number): number {
  const widest = (choices ?? []).reduce((most, one) => Math.max(most, labelUnits(one)), labelUnits(text))
  return widest * labelCoef + NOT_STORED_PROPERTY_CONTROL_SIZES['S-199']
}

// see AS-5, AS-6
// WHY: the uid is added to a name only where two people share it (AS-6).
/** @purity pure */
function assigneeComboOf(schedule: Schedule, language: DisplayLanguage): AssigneeCombo {
  const people = assigneeChoices(schedule)
  const shared = (name: string): boolean => people.filter((one) => one.name === name).length > 1
  const held = {
    people: people.map((one) => ({
      ...one,
      word: shared(one.name) ? nameWithUid(one.name, one.uid, language) : one.name,
    })),
    addWord: PROPERTY_FIELD_WORDS.get('addResource')?.[language] ?? '',
    sortEntries: [commandItemOf(ASCENDING_ENTRY, language), commandItemOf(DESCENDING_ENTRY, language)],
  }
  // WHY: carried with the roster, so the drawing side narrows it without a second reading of SV-4.
  return { ...held, candidatesOf: (typed, isDescending) => assigneeCandidatesOf(held, typed, isDescending) }
}

// see AS-5, AS-3, SV-4, IC-123, IC-124
// WHY: an empty text adds no one: the add item names the person it makes (AS-7).
/** @purity pure */
export function assigneeCandidatesOf(
  combo: Omit<AssigneeCombo, 'candidatesOf'>,
  typed: string,
  isDescending: boolean,
): readonly AssigneeCandidate[] {
  const found = combo.people.filter((one) => isSearchWordFound(one.name, typed))
  const ordered = isDescending
    ? [...found].sort((a, b) => (a.name === b.name ? a.uid - b.uid : a.name < b.name ? 1 : -1))
    : found
  const candidates = ordered.map((one) => ({ pick: 'candidate' as const, value: String(one.uid), word: one.word }))
  const settled = typed.trim()
  if (settled === '' || settled === UNASSIGN_TEXT || combo.people.some((one) => one.name === settled)) return candidates
  return [...candidates, { pick: 'add' as const, value: settled, word: combo.addWord.replace(NAME_SLOT, () => settled) }]
}

// see AS-3
const UNASSIGN_TEXT = '-'

// see PR-16, AS-1, AS-5, AS-9
/** @purity pure */
function assigneeControls(
  schedule: Schedule,
  taskUid: number,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyControl[] {
  const people = assigneeChoices(schedule)
  const names = people.map((person) => person.name)
  const seated = [...new Set(assigneesOf(schedule, taskUid).map((person) => person.uid))]
  const labelled = labelledAssigneeUidOf(schedule, taskUid)
  const focused = labelled !== null && seated.includes(labelled) ? labelled : null
  const assignee = assigneeComboOf(schedule, language)
  return [...seated, null].map((resourceUid): PropertyControl => {
    const text = resourceUid === null ? '' : String(resourceUid)
    return {
      key: { holder: 'assignment', taskUid, resourceUid, column: 'resourceUid' },
      kind: 'choice',
      text,
      choices: names,
      choiceValues: people.map((person) => String(person.uid)),
      assignee,
      min: null,
      max: null,
      widthInFontSizes: widthOf(text, names, labelCoef),
      ...(resourceUid === focused ? { isFocusTarget: true } : {}),
    }
  })
}

// see T-016, PR-35, PR-36
// WHY: a oneInput row draws one input, for its first column; the commit writes the others (field-commit.ts).
/** @purity pure */
function drawnColumnsOf<Column>(item: { readonly oneInput: boolean; readonly columns: readonly Column[] }): readonly Column[] {
  return item.oneInput ? item.columns.slice(0, 1) : item.columns
}

/** @purity pure */
function controlsOfItem(
  schedule: Schedule,
  task: Task,
  item: TaskPropertyItem,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row) || item.heldBy === 'derived') return []
  if (item.heldBy === 'assignment') return assigneeControls(schedule, task.uid, labelCoef, language)

  const entity: ShapedEntity = item.heldBy === 'task' ? 'Task' : 'TaskVisual'
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return drawnColumnsOf<string>(item).map((column) => {
    const key: PropertyFieldKey =
      item.heldBy === 'task'
        ? { holder: 'task', uid: task.uid, column: column as keyof Task & string }
        : { holder: 'taskVisual', uid: task.uid, column: column as keyof TaskVisual & string }
    const text =
      item.heldBy === 'task'
        ? textOfTaskColumn(schedule, task, column as keyof Task)
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
  language: DisplayLanguage,
): string {
  switch (item.heldBy) {
    case 'task':
      return drawnColumnsOf(item).map((column) => textOfTaskColumn(schedule, task, column)).join(PART_SEPARATOR)
    case 'taskVisual':
      if (visual === null) return ''
      return item.columns.map((column) => textOfValue(visual[column])).join(PART_SEPARATOR)
    case 'assignment':
      return assigneeText(schedule, task.uid)
    case 'derived':
      return linkedEndsText(schedule, task, item.columns[0] ?? '', language)
  }
}

// see T-016
/** @purity pure */
function taskFields(
  schedule: Schedule,
  task: Task,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  const isMilestone = task.milestone === true
  return TASK_ITEMS.filter((item) => isShownFor(item, task)).map((item) => ({
    row: item.row,
    name: itemName(item.row, language, isMilestone),
    text: textOfItem(schedule, task, visual, item, language),
    isEditable: !READ_ONLY_ROWS.includes(item.row) && item.heldBy !== 'derived',
    controls: controlsOfItem(schedule, task, item, labelCoef, language),
  }))
}

// WHY: the elapsed units are fixed by their name; the working ones follow the Project columns (FR-009).
const MINUTES_PER_HOUR = 60
const MINUTES_PER_ELAPSED_DAY = 24 * MINUTES_PER_HOUR
const MINUTES_PER_ELAPSED_WEEK = 7 * MINUTES_PER_ELAPSED_DAY

type LagUnitLength = number | 'workingDay' | 'workingWeek' | 'workingMonth' | null

// see FR-009, AT-48
// WHY: the codes and symbols are mspdi_pj12.xsd:2203's; a null length is one FR-009 cannot settle (percent, elapsed month); such a lag is shown in minutes.
const LAG_FORMAT_UNITS: ReadonlyMap<number, { readonly symbol: string; readonly length: LagUnitLength }> = new Map([
  [3, { symbol: 'm', length: 1 }],
  [4, { symbol: 'em', length: 1 }],
  [5, { symbol: 'h', length: MINUTES_PER_HOUR }],
  [6, { symbol: 'eh', length: MINUTES_PER_HOUR }],
  [7, { symbol: 'd', length: 'workingDay' }],
  [8, { symbol: 'ed', length: MINUTES_PER_ELAPSED_DAY }],
  [9, { symbol: 'w', length: 'workingWeek' }],
  [10, { symbol: 'ew', length: MINUTES_PER_ELAPSED_WEEK }],
  [11, { symbol: 'mo', length: 'workingMonth' }],
  [12, { symbol: 'emo', length: null }],
  [19, { symbol: '%', length: null }],
  [20, { symbol: 'e%', length: null }],
])

// see FR-009
// WHY: mspdi_pj12.xsd:2203 numbers the estimated forms ("?") 32 above their plain ones.
const ESTIMATED_LAG_FORMAT_OFFSET = 32
const ESTIMATED_MARK = '?'
const MINUTE_SYMBOL = 'm'

// see FR-009
const SHOWN_LAG_SCALE = 100

/** @purity pure */
function shownLagNumber(value: number): string {
  return String(Math.round(value * SHOWN_LAG_SCALE) / SHOWN_LAG_SCALE)
}

/** @purity pure */
function minutesOfUnit(project: Project, length: LagUnitLength): number | null {
  const minutesPerDay = minutesPerWorkingDayOf(project)
  switch (length) {
    case 'workingDay': return minutesPerDay
    case 'workingWeek': return project.minutesPerWeek !== null && project.minutesPerWeek > 0 ? project.minutesPerWeek : null
    case 'workingMonth': return project.daysPerMonth !== null && project.daysPerMonth > 0 ? project.daysPerMonth * minutesPerDay : null
    default: return length
  }
}

// see FR-009, S-118, AT-47, AT-48
/** @purity pure */
function lagText(project: Project, dependency: Dependency): string {
  if (dependency.lag === null) return ''
  const workingDays = lagWorkingDaysOf(dependency, minutesPerWorkingDayOf(project))
  if (workingDays !== null) return shownLagNumber(workingDays)
  const minutes = dependency.lag / TENTHS_OF_A_MINUTE
  const format = dependency.lagFormat ?? 0
  const isEstimated = format > ESTIMATED_LAG_FORMAT_OFFSET
  const unit = LAG_FORMAT_UNITS.get(isEstimated ? format - ESTIMATED_LAG_FORMAT_OFFSET : format)
  const unitMinutes = unit === undefined ? null : minutesOfUnit(project, unit.length)
  if (unit === undefined || unitMinutes === null) return `${shownLagNumber(minutes)}${MINUTE_SYMBOL}`
  return `${shownLagNumber(minutes / unitMinutes)}${unit.symbol}${isEstimated ? ESTIMATED_MARK : ''}`
}

// see T-018, FR-009, PR-41, PR-42, PR-43, PR-44
/** @purity pure */
function dependencyText(
  schedule: Schedule,
  dependency: Dependency,
  successorUid: number,
  column: string,
  language: DisplayLanguage,
): string {
  if (column === 'predecessorUid') return dependencyEndText(schedule, dependency.predecessorUid, language)
  if (column === 'successorUid') return dependencyEndText(schedule, successorUid, language)
  if (column === 'lag') return lagText(schedule.project, dependency)
  if (column !== 'linkType') return textOfValue((dependency as unknown as Record<string, unknown>)[column])
  const kind = DEPENDENCY_KINDS.find((one) => one.linkType === dependency.linkType)
  return kind === undefined ? textOfValue(dependency.linkType) : kind.abbreviation
}

// see FR-009, T-016
// WHY: only the lag is editable (CM-38); kind and both ends are read-only rows of table T-016.
/** @purity pure */
function dependencyFields(
  schedule: Schedule,
  dependency: Dependency,
  successorUid: number,
  ordinal: number,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return DEPENDENCY_ITEMS.map((item) => {
    const column = (item.columns[0] ?? '') as keyof Dependency & string
    const isEditable = !READ_ONLY_ROWS.includes(item.row)
    const key: PropertyFieldKey = { holder: 'dependency', successorUid, ordinal, column }
    const text = dependencyText(schedule, dependency, successorUid, column, language)
    return {
      row: item.row,
      name: itemName(item.row, language),
      text,
      isEditable,
      controls: isEditable ? [controlOf(schedule, key, 'Dependency', column, text, successorUid, labelCoef)] : [],
    }
  })
}

/** @purity pure */
function subjectOf(selection: Selection): ItemRef | null {
  const [only] = selection.items
  if (selection.items.length === 1 && only !== undefined) return only
  return lastPicked(selection)
}

/** @purity pure */
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
      return dependencyFields(schedule, dependency, successor.uid, subject.ordinal, labelCoef, language)
    }
    case 'commentBox':
      return fieldsOfFound(schedule, schedule.commentBoxes.find(withId(subject.id)), commentBoxRows, labelCoef, language)
    case 'highlightBox': {
      const box = schedule.highlightBoxes.find(withId(subject.id))
      return fieldsOfFound(schedule, box, highlightBoxRows, labelCoef, language)
    }
    case 'statusLine':
    case 'wbsParentLink':
      return []
  }
}

/** @purity pure */
function withId(id: string): (one: { readonly id: string }) => boolean {
  return (one) => one.id === id
}

/** @purity pure */
function fieldsOfFound<Held>(
  schedule: Schedule,
  found: Held | undefined,
  rowsOf: (held: Held) => ObjectRows<Held>,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] | null {
  return found === undefined ? null : objectFields(schedule, rowsOf(found), labelCoef, language)
}

/** @purity pure */
function commentBoxRows(box: CommentBox): ObjectRows<CommentBox> {
  const keyOf = (column: keyof CommentBox & string): PropertyFieldKey => ({ holder: 'commentBox', id: box.id, column })
  return { items: COMMENT_BOX_ITEMS, held: box, keyOf, entity: 'CommentBox' }
}

// see PR-22
/** @purity pure */
function highlightBoxRows(box: HighlightBox): ObjectRows<HighlightBox> {
  const keyOf = (column: keyof HighlightBox & string): PropertyFieldKey => ({ holder: 'highlightBox', id: box.id, column })
  return { items: HIGHLIGHT_BOX_ITEMS, held: box, keyOf, entity: 'HighlightBox' }
}

type CommentBox = Schedule['commentBoxes'][number]
type HighlightBox = Schedule['highlightBoxes'][number]

interface ItemRows {
  readonly row: string
  readonly columns: readonly string[]
}

interface ObjectRows<Held> {
  readonly items: readonly { readonly row: string; readonly columns: readonly (keyof Held & string)[] }[]
  readonly held: Held
  readonly keyOf: (column: keyof Held & string) => PropertyFieldKey
  readonly entity: ShapedEntity
  readonly rowOf?: (item: ItemRows) => string
}

// see T-016, MK-13, FR-019
/** @purity pure */
function objectFields<Held>(
  schedule: Schedule,
  rows: ObjectRows<Held>,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const { items, held, keyOf, entity } = rows
  return items.map((item) => ({
    row: rows.rowOf?.(item) ?? item.row,
    name: itemName(item.row, language),
    text: item.columns.map((column) => textOfValue(held[column])).join(PART_SEPARATOR),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: READ_ONLY_ROWS.includes(item.row)
      ? []
      : item.columns.map((column) =>
          controlOf(schedule, keyOf(column), entity, column, textOfValue(held[column]), null, labelCoef),
        ),
  }))
}

type TaskGroup = Schedule['taskGroups'][number]

const ROW_NAME_COLUMN = 'label'
const ROW_NAME_FIELD_ROW = 'AT-53'

// see IR-1, FR-085, FR-042
/** @purity pure */
function declaredRowOf(item: ItemRows): string {
  const [first] = item.columns
  return first === ROW_NAME_COLUMN ? ROW_NAME_FIELD_ROW : item.row
}

const ROW_MIN_HEIGHT_WORDS = new Map(displayWords.rowMinHeightField.map((entry) => [entry.part, entry.text]))

const MIN_HEIGHT_COLUMN: keyof TaskGroup & string = 'minHeight'

const READOUT_PX_SLOT = '{px}'

/** @purity pure */
function rowMinHeightWord(part: string, language: DisplayLanguage): string {
  return ROW_MIN_HEIGHT_WORDS.get(part)?.[language] ?? NO_ENTRY_WORDS
}

// see MH-3, MH-6
/** @purity pure */
function minHeightReadoutOf(groupId: string, placedRows: readonly RowPlacement[], language: DisplayLanguage): string {
  const placed = placedRows.find((row) => row.groupId === groupId)
  if (placed === undefined) return rowMinHeightWord('currentlyHidden', language)
  return rowMinHeightWord('current', language).replace(READOUT_PX_SLOT, String(Math.round(placed.height)))
}

// see T-338
/** @purity pure */
function withMinHeightReadout(
  field: PropertyField,
  groupId: string,
  placedRows: readonly RowPlacement[],
  language: DisplayLanguage,
): PropertyField {
  if (!field.controls.some((control) => control.key.column === MIN_HEIGHT_COLUMN)) return field
  return {
    ...field,
    unit: rowMinHeightWord('unit', language),
    readout: minHeightReadoutOf(groupId, placedRows, language),
    controls: field.controls.map((control) => ({ ...control, placeholder: rowMinHeightWord('none', language) })),
  }
}

// see FR-042
/** @purity pure */
function groupFields(
  schedule: Schedule,
  group: TaskGroup,
  labelCoef: number,
  language: DisplayLanguage,
  placedRows: readonly RowPlacement[],
): readonly PropertyField[] {
  const keyOf = (column: keyof TaskGroup & string): PropertyFieldKey => ({
    holder: 'taskGroup',
    groupId: group.id,
    column,
  })
  const rows = { items: GROUP_ITEMS, held: group, keyOf, entity: 'TaskGroup', rowOf: declaredRowOf } as const
  return objectFields(schedule, rows, labelCoef, language).map((field) =>
    withMinHeightReadout(field, group.id, placedRows, language),
  )
}

/** @purity pure */
function onlyGroupId(groupIds: readonly string[]): string | null {
  const [only] = groupIds
  if (groupIds.length === 1 && only !== undefined) return only
  return null
}

// STOP: spec does not decide where picked rows are held, nor their fields' place after the item's. Looked in FR-085, FR-042, SL-1, FR-072
// @provisional PND-142
/** @purity pure */
function fieldsOfSubject(
  schedule: Schedule,
  subject: PropertiesSubject,
  labelCoef: number,
  language: DisplayLanguage,
  placedRows: readonly RowPlacement[],
): readonly PropertyField[] | null {
  const item = subjectOf(subject.selection)
  const itemFields = item === null ? [] : fieldsOfItem(schedule, item, labelCoef, language)
  if (itemFields === null) return null

  const groupId = onlyGroupId(subject.groupIds)
  if (groupId === null) return itemFields

  const group = schedule.taskGroups.find((held) => held.id === groupId)
  if (group === undefined) return null
  return [...itemFields, ...groupFields(schedule, group, labelCoef, language, placedRows)]
}

// TRAP: repeats the private reach() walk of clampedSettings; change both together.
/** @purity pure */
function valueAt(settings: DocumentSettings, key: string): unknown {
  return key
    .split(KEY_PATH_SEPARATOR)
    .reduce<unknown>(
      (held, step) =>
        held !== null && typeof held === 'object' ? (held as Record<string, unknown>)[step] : undefined,
      settings,
    )
}

const THEME_HUE_WORDS = new Map(displayWords.themeHues.map((entry) => [entry.rowId, entry.text]))

const THEME_HUE_KEY = { holder: 'project', column: 'themeHue' } as const

const THEME_HUE_SWATCH_ROW = 'S-151'

// see FR-041, T-305, K-60, S-74
// WHY: the swatches grey with the rest under monochrome (JDG-1244 6): the author picks by the grey each hue becomes.
/** @purity pure */
function themeHueField(hue: number, dark: boolean, monochrome: boolean, language: DisplayLanguage): PropertyField {
  const words = themeHueRoster.map((one) => THEME_HUE_WORDS.get(one.rowId)?.[language] ?? '')
  const chosen = themeHueRoster.findIndex((one) => one.hue === hue)
  const text = String(hue)
  return {
    row: settingsWordOf(THEME_HUE_KEY.column)?.rowId ?? THEME_HUE_KEY.column,
    name: settingsName(THEME_HUE_KEY.column, language),
    text: words[chosen] ?? text,
    isEditable: true,
    controls: [
      {
        key: THEME_HUE_KEY,
        kind: 'choice',
        text,
        choices: words,
        choiceValues: themeHueRoster.map((one) => String(one.hue)),
        swatches: themeHueRoster.map((one) => colourOf(THEME_HUE_SWATCH_ROW, one.hue, dark, monochrome)),
        min: null,
        max: null,
        widthInFontSizes: widthOf(text, words, SETTINGS_CONSTANTS.labelCoef),
      },
    ],
  }
}

const PARENT_PROGRESS_TOLERANCE_KEY = { holder: 'project', column: 'parentProgressToleranceDays' } as const

// see FR-131, K-140, CM-87, S-487
// WHY: no floor here: CM-87 alone refuses a value below S-487's bound and says so, so the range lives once.
/** @purity pure */
function parentProgressToleranceField(workingDays: number, language: DisplayLanguage): PropertyField {
  const column = PARENT_PROGRESS_TOLERANCE_KEY.column
  const text = String(workingDays)
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    name: settingsName(column, language),
    text,
    isEditable: true,
    controls: [
      {
        key: PARENT_PROGRESS_TOLERANCE_KEY,
        kind: 'number',
        text,
        choices: null,
        min: null,
        max: null,
        widthInFontSizes: widthOf(text, null, SETTINGS_CONSTANTS.labelCoef),
      },
    ],
  }
}

// see IC-17, T-104, FR-072, FR-131
/** @purity pure */
function settingsFields(
  settings: DocumentSettings,
  schedule: Schedule,
  dark: boolean,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const readOnly = Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    row: settingsWordOf(key)?.rowId ?? key,
    name: settingsName(key, language),
    text: textOfSettingsValue(valueAt(settings, key)),
    isEditable: false,
    controls: [],
  }))
  return [
    themeHueField(schedule.project.themeHue, dark, settings.themeMonochrome, language),
    parentProgressToleranceField(schedule.project.parentProgressToleranceDays, language),
    ...readOnly,
  ]
}

type ColourHolderColumn = keyof TaskVisual | keyof TaskGroup | keyof CommentBox | keyof HighlightBox

// see CV-6, CV-9, FR-019
const COLOUR_FORM_OF_COLUMN: Readonly<Partial<Record<ColourHolderColumn, ColourForm>>> = {
  fillColor: 'fill',
  strokeColor: 'outline',
  textColor: 'outline',
  color: 'band',
}

// see CV-9, AT-58, FR-019
/** @purity pure */
function colourChoicesOf(key: PropertyFieldKey): readonly string[] | null {
  switch (key.holder) {
    case 'taskVisual':
      return COLUMN_SHAPES.TaskVisual[key.column]?.choices ?? null
    case 'taskGroup':
      return COLUMN_SHAPES.TaskGroup[key.column]?.choices ?? null
    case 'commentBox':
      return COLUMN_SHAPES.CommentBox[key.column]?.choices ?? null
    case 'highlightBox':
      return COLUMN_SHAPES.HighlightBox[key.column]?.choices ?? null
    default:
      return null
  }
}

const HEX_PAINT = /^#[0-9a-f]{6}$/

const COLOUR_NAME_WORDS = new Map(displayWords.colourNames.map((entry) => [entry.spelling, entry.text]))

const COLOUR_FIELD_WORDS = new Map(displayWords.colourField.map((entry) => [entry.part, entry.text]))

interface ColourLook {
  readonly hue: number
  readonly dark: boolean
  readonly monochrome: boolean
  readonly language: DisplayLanguage
}

type ColourForm = Parameters<typeof swatchOf>[1]

// see FR-007, FR-019, FR-042, CV-9
// WHY: the T-236 row each field's null draws; its hue column names the null theme or default.
const NULL_ROW_OF_FIELD: Readonly<Record<string, string>> = {
  'taskVisual.fillColor': 'S-155',
  'taskVisual.strokeColor': 'S-156',
  'taskGroup.color': 'S-164',
  'commentBox.strokeColor': 'S-312',
  'commentBox.fillColor': 'S-146',
  'commentBox.textColor': 'S-147',
  'highlightBox.strokeColor': 'S-312',
  'highlightBox.fillColor': 'S-155',
}

// see CV-9
const TRANSPARENT_WORD_OF_COLUMN: Readonly<Partial<Record<string, string>>> = {
  fillColor: 'noFill',
  color: 'noFill',
  strokeColor: 'noLine',
}

// see T-236, CV-9
// WHY: a row follows the theme hue (its hue column is a circle) exactly when its colour moves with
// the hue; read through colourOf, the one published reading of table T-236.
const HUES_APART: readonly [number, number] = [0, 180]

/** @purity pure */
function followsThemeHue(rowId: string): boolean {
  const [one, other] = HUES_APART
  return [false, true].some((dark) => colourOf(rowId, one, dark, false) !== colourOf(rowId, other, dark, false))
}

/** @purity pure */
function colourWord(part: string, language: DisplayLanguage): string {
  return COLOUR_FIELD_WORDS.get(part)?.[language] ?? ''
}

// see CV-9, CV-3, CV-7
/** @purity pure */
function colourSide(
  stored: string | null,
  form: ColourForm,
  look: ColourLook,
  dark: boolean,
  nullRow: string | undefined,
): ColourSide {
  const word = colourWord(dark ? 'dark' : 'light', look.language)
  if (stored === null && nullRow !== undefined) {
    return {
      word,
      paint: colourOf(nullRow, look.hue, dark, look.monochrome),
      note: '',
      mark: colourWord(followsThemeHue(nullRow) ? 'themeMark' : 'defaultMark', look.language),
    }
  }
  const custom = stored === null ? null : customColourOf(stored)
  const isUndefinedSide = custom !== null && (dark ? custom.dark : custom.light) === null
  const notePart = dark ? 'sameAsLight' : 'sameAsDark'
  return {
    word,
    paint: swatchOf(stored, form, look.hue, dark, look.monochrome).paint,
    value: swatchOf(stored, form, look.hue, dark, false).paint,
    note: isUndefinedSide ? colourWord(notePart, look.language) : '',
  }
}

// see CV-9, CV-4, CV-5, CV-7
/** @purity pure */
function withColourField(control: PropertyControl, look: ColourLook): PropertyControl {
  const forms: Readonly<Partial<Record<string, ColourForm>>> = COLOUR_FORM_OF_COLUMN
  const form = forms[control.key.column]
  const offered = colourChoicesOf(control.key)
  if (control.kind !== 'color' || form === undefined || offered === null) return control
  const stored = control.text === '' ? null : control.text
  const custom = stored === null ? null : customColourOf(stored)
  const order = displayWords.colourNames.map((entry) => entry.spelling)
  const names = order.filter((name) => offered.includes(name))
  const customWord = colourWord('custom', look.language)
  const nullRow = NULL_ROW_OF_FIELD[`${control.key.holder}.${control.key.column}`]
  const isThemeNull = nullRow === undefined || followsThemeHue(nullRow)
  const transparentPart = TRANSPARENT_WORD_OF_COLUMN[control.key.column]
  const values = ['', ...names, ...(custom === null || stored === null ? [] : [stored])]
  // WHY: the colour input is seeded with a value to choose, not a swatch, so it keeps
  // the hue while monochrome is on; CV-7 greys only what is painted.
  const drawn = swatchOf(stored, form, look.hue, look.dark, false).paint
  const swatches = values.map((value) =>
    swatchOf(value === '' ? null : value, form, look.hue, look.dark, look.monochrome),
  )
  return {
    ...control,
    choices: values.map((value) =>
      value === stored && custom !== null ? customWord : (COLOUR_NAME_WORDS.get(value)?.[look.language] ?? ''),
    ),
    choiceValues: values,
    colour: {
      swatches: swatches.map((one) => one.paint),
      inks: swatches.map((one) => one.ink),
      customWord,
      customValue: custom !== null ? customSideOf(custom, look.dark) : HEX_PAINT.test(drawn) ? drawn : '',
      light: colourSide(stored, form, look, false, nullRow),
      dark: colourSide(stored, form, look, true, nullRow),
      names: order.map((name) => ({ name, isOffered: names.includes(name) })),
      theme: {
        word: colourWord(isThemeNull ? 'theme' : 'defaultColour', look.language),
        hint: colourWord(isThemeNull ? 'themeHint' : 'defaultColour', look.language),
        ...(nullRow === undefined ? {} : { paint: colourOf(nullRow, look.hue, look.dark, look.monochrome) }),
      },
      ...(transparentPart === undefined || !names.includes(TRANSPARENT_NAME)
        ? {}
        : { transparentWord: colourWord(transparentPart, look.language) }),
    },
  }
}

const TRANSPARENT_NAME = 'transparent'

// see CV-9, FR-006
// WHY: a colour row also carries its name above the field (E-30).
/** @purity pure */
function withColourFields(fields: readonly PropertyField[], look: ColourLook): readonly PropertyField[] {
  return fields.map((field) =>
    field.controls.some((one) => one.kind === 'color')
      ? { ...field, isNameAbove: true, controls: field.controls.map((one) => withColourField(one, look)) }
      : field,
  )
}

// see FR-072, U-25
// STOP: spec does not decide what is kept when the selection empties; the subject is kept, not the fields. Looked in FR-072, SL-1, FR-085
// @provisional PND-144
/** @purity pure */
export function propertiesPanelFromSelection(
  schedule: Schedule,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
  readings: ScreenViewReadings,
): PropertiesPanel | null {
  const content = session.screen.propertiesPanelContentState
  if (content.kind === 'hidden') return null
  const language = displayLanguageOf(session)

  const dark = session.screen.themePreference === 'dark'
  if (content.kind === 'documentSettingsDisplayed') {
    return {
      showing: 'documentSettings',
      isSubjectGone: false,
      fields: settingsFields(settings, schedule, dark, language),
      commands: panelCommands(language),
      headEntry: commandItemOf(GRS_RESET_ENTRY, language),
    }
  }

  const isNothingPicked = selection.items.length === 0 && readings.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? content.subject
    : { selection, groupIds: readings.selectedGroupIds }
  // WHY: readings with no layout place no row, so the row reads as not drawn (MH-6), never as 0 px.
  const placedRows = readings.placedRows ?? []
  const described = fieldsOfSubject(schedule, subject, SETTINGS_CONSTANTS.labelCoef, language, placedRows)
  const look = {
    hue: schedule.project.themeHue,
    dark,
    monochrome: settings.themeMonochrome,
    language,
  }
  const fields = described === null ? null : withColourFields(described, look)

  const isSubjectGone = isNothingPicked || fields === null

  return {
    showing: 'selection',
    isSubjectGone,
    fields: fields ?? [],
    commands: panelCommands(language),
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-217)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_PROPERTY_CONTROL_SIZES: {
  readonly 'S-199': number
} = {
  'S-199': 2.19,
}

// see T-217, FR-006, FR-019
const NOT_STORED_ANNOTATION_BOUNDS: {
  readonly 'S-132': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-369': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-371': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-374': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-375': { readonly key: string; readonly min: number; readonly max: number }
} = {
  'S-132': { key: 'cornerRadiusPx', min: 0, max: 24 },
  'S-369': { key: 'HighlightBox.strokeWidthPx', min: 1, max: 10 },
  'S-371': { key: 'HighlightBox.fillTransparencyPercent', min: 0, max: 100 },
  'S-374': { key: 'CommentBox.strokeWidthPx', min: 1, max: 10 },
  'S-375': { key: 'CommentBox.fillTransparencyPercent', min: 0, max: 100 },
}
// </generated>

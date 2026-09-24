// ScreenRenderer: the Properties Panel's content for one frame.
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
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
  taskByUid,
  textOfDay,
  workingCalendarOf,
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
import {
  labelUnits,
  labelledAssigneeUidOf,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  PropertiesSubject,
  ScreenSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { swatchOf } from '../svg-renderer/svg-renderer'
import type {
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
import displayWords from './display-words.json'
import iconRoster from './icon-roster.json'
import propertyItems from './property-items.json'

const PART_SEPARATOR = ' / '

const KEY_PATH_SEPARATOR = '.'

const DAY_TIME_SEPARATOR = 'T'

const PROPERTIES_PANEL = 'Properties Panel'

const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

const DEPENDENCY_KINDS = displayWords.dependencyKinds

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

// see FR-006, FR-038
/** @purity pure */
function itemName(row: string, language: DisplayLanguage): string {
  const word = ITEM_WORDS_BY_ROW.get(row)?.label[language]
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

// see T-109, FR-029
/** @purity pure */
function panelCommands(language: DisplayLanguage): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(PROPERTIES_PANEL))
    .map((row) => ({
      icon: row.rowId,
      isEnabled: true,
      isPressed: false,
      isArmed: false,
      isChosen: false,
      label: entryLabel(row.rowId, language),
    }))
}

// see T-016
type PropertyItem = { readonly row: string; readonly appliesTo: AppliesTo } & (
  | { readonly heldBy: 'task'; readonly columns: readonly (keyof Task)[] }
  | { readonly heldBy: 'taskVisual'; readonly columns: readonly (keyof TaskVisual)[] }
  | { readonly heldBy: 'assignment'; readonly columns: readonly ['assignee'] }
  | { readonly heldBy: 'taskGroup'; readonly columns: readonly (keyof TaskGroup)[] }
  | { readonly heldBy: 'commentBox'; readonly columns: readonly (keyof CommentBox)[] }
  | { readonly heldBy: 'highlightBox'; readonly columns: readonly (keyof HighlightBox)[] }
)

type TaskPropertyItem = Extract<PropertyItem, { heldBy: 'task' | 'taskVisual' | 'assignment' }>
type GroupPropertyItem = Extract<PropertyItem, { heldBy: 'taskGroup' }>
type CommentBoxPropertyItem = Extract<PropertyItem, { heldBy: 'commentBox' }>
type HighlightBoxPropertyItem = Extract<PropertyItem, { heldBy: 'highlightBox' }>

type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox' | 'HighlightBox'

const APPLIES_TO_TASK: AppliesTo = 'Task'
const APPLIES_TO_TASK_GROUP: AppliesTo = 'TaskGroup'
const APPLIES_TO_COMMENT_BOX: AppliesTo = 'CommentBox'
const APPLIES_TO_HIGHLIGHT_BOX: AppliesTo = 'HighlightBox'

const HELD_BY_OF_OBJECT: Readonly<Partial<Record<AppliesTo, PropertyItem['heldBy']>>> = {
  TaskGroup: 'taskGroup',
  CommentBox: 'commentBox',
  HighlightBox: 'highlightBox',
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
    min: kind === 'number' ? (shape?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? null) : null,
    widthInFontSizes: widthOf(text, candidates === null ? null : candidates.words, labelCoef),
  }
}

// see FR-006, FR-093, S-199
/** @purity pure */
function widthOf(text: string, choices: readonly string[] | null, labelCoef: number): number {
  const widest = (choices ?? []).reduce((most, one) => Math.max(most, labelUnits(one)), labelUnits(text))
  return widest * labelCoef + NOT_STORED_PROPERTY_CONTROL_SIZES['S-199']
}

// see PR-16, AS-1, AS-5, AS-9
/** @purity pure */
function assigneeControls(schedule: Schedule, taskUid: number, labelCoef: number): readonly PropertyControl[] {
  const people = assigneeChoices(schedule)
  const names = people.map((person) => person.name)
  const seated = [...new Set(assigneesOf(schedule, taskUid).map((person) => person.uid))]
  const labelled = labelledAssigneeUidOf(schedule, taskUid)
  const focused = labelled !== null && seated.includes(labelled) ? labelled : null
  return [...seated, null].map((resourceUid): PropertyControl => {
    const text = resourceUid === null ? '' : String(resourceUid)
    return {
      key: { holder: 'assignment', taskUid, resourceUid, column: 'resourceUid' },
      kind: 'choice',
      text,
      choices: names,
      choiceValues: people.map((person) => String(person.uid)),
      searchWords: [...new Set(names)],
      min: null,
      max: null,
      widthInFontSizes: widthOf(text, names, labelCoef),
      ...(resourceUid === focused ? { isFocusTarget: true } : {}),
    }
  })
}

/** @purity pure */
function controlsOfItem(
  schedule: Schedule,
  task: Task,
  item: TaskPropertyItem,
  labelCoef: number,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row)) return []
  if (item.heldBy === 'assignment') return assigneeControls(schedule, task.uid, labelCoef)

  const entity: ShapedEntity = item.heldBy === 'task' ? 'Task' : 'TaskVisual'
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return item.columns.map((column) => {
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
): string {
  switch (item.heldBy) {
    case 'task':
      return item.columns.map((column) => textOfTaskColumn(schedule, task, column)).join(PART_SEPARATOR)
    case 'taskVisual':
      if (visual === null) return ''
      return item.columns.map((column) => textOfValue(visual[column])).join(PART_SEPARATOR)
    case 'assignment':
      return assigneeText(schedule, task.uid)
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

  return TASK_ITEMS.map((item) => ({
    row: item.row,
    name: itemName(item.row, language),
    text: textOfItem(schedule, task, visual, item),
    isEditable: !READ_ONLY_ROWS.includes(item.row),
    controls: controlsOfItem(schedule, task, item, labelCoef),
  }))
}

const DEPENDENCY_ITEMS: readonly { readonly row: string; readonly column: keyof Dependency }[] = [
  { row: 'AT-46', column: 'linkType' },
  { row: 'AT-47', column: 'lag' },
  { row: 'AT-45', column: 'predecessorUid' },
]

const SUCCESSOR_ROW = 'FR-009'

const SUCCESSOR_NAME: keyof Extract<ItemRef, { kind: 'dependency' }> = 'successorUid'

// see T-018
/** @purity pure */
function dependencyText(dependency: Dependency, column: keyof Dependency): string {
  if (column !== 'linkType') return textOfValue(dependency[column])
  const kind = DEPENDENCY_KINDS.find((one) => one.linkType === dependency.linkType)
  return kind === undefined ? textOfValue(dependency.linkType) : kind.abbreviation
}

// see FR-009
// DEVIATION: spec says only the lag is editable (FR-009); here kind, predecessor and far end are marked editable (DFC-565)
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
    text: dependencyText(dependency, item.column),
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
      controls: [],
    },
  ]
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
      return dependencyFields(schedule, dependency, successor.uid, subject.ordinal, labelCoef)
    }
    case 'commentBox':
      return fieldsOfFound(schedule, schedule.commentBoxes.find(withId(subject.id)), commentBoxRows, labelCoef, language)
    case 'highlightBox': {
      const box = schedule.highlightBoxes.find(withId(subject.id))
      return fieldsOfFound(schedule, box, highlightBoxRows, labelCoef, language)
    }
    case 'statusLine':
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

// see FR-042
/** @purity pure */
function groupFields(
  schedule: Schedule,
  group: TaskGroup,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const keyOf = (column: keyof TaskGroup & string): PropertyFieldKey => ({
    holder: 'taskGroup',
    groupId: group.id,
    column,
  })
  const rows = { items: GROUP_ITEMS, held: group, keyOf, entity: 'TaskGroup', rowOf: declaredRowOf } as const
  return objectFields(schedule, rows, labelCoef, language)
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

// see IC-17, T-104
/** @purity pure */
function settingsFields(
  settings: DocumentSettings,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    row: settingsWordOf(key)?.rowId ?? key,
    name: settingsName(key, language),
    text: textOfSettingsValue(valueAt(settings, key)),
    // see FR-072
    isEditable: false,
    controls: [],
  }))
}

// see CV-6, CV-9
const COLOUR_FORM_OF_COLUMN: Readonly<Record<string, Parameters<typeof swatchOf>[1]>> = {
  fillColor: 'fill',
  strokeColor: 'outline',
  color: 'band',
}

// see CV-9, S-315, FR-019
const LEFT_OUT_NAME_OF_HOLDER: Readonly<Partial<Record<PropertyFieldKey['holder'], string>>> = {
  taskGroup: 'black',
  highlightBox: 'transparent',
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

// see CV-9, CV-3, CV-7
/** @purity pure */
function colourSide(stored: string | null, form: ColourForm, look: ColourLook, dark: boolean): ColourSide {
  const custom = stored === null ? null : customColourOf(stored)
  const isUndefinedSide = custom !== null && (dark ? custom.dark : custom.light) === null
  const notePart = dark ? 'sameAsLight' : 'sameAsDark'
  return {
    word: COLOUR_FIELD_WORDS.get(dark ? 'dark' : 'light')?.[look.language] ?? '',
    paint: swatchOf(stored, form, look.hue, dark, look.monochrome).paint,
    value: swatchOf(stored, form, look.hue, dark, false).paint,
    note: isUndefinedSide ? (COLOUR_FIELD_WORDS.get(notePart)?.[look.language] ?? '') : '',
  }
}

// see CV-9, CV-4, CV-5, CV-7
/** @purity pure */
function withColourField(control: PropertyControl, look: ColourLook): PropertyControl {
  const form = COLOUR_FORM_OF_COLUMN[control.key.column]
  if (control.kind !== 'color' || form === undefined) return control
  const stored = control.text === '' ? null : control.text
  const custom = stored === null ? null : customColourOf(stored)
  const order = displayWords.colourNames.map((entry) => entry.spelling)
  const leftOut = LEFT_OUT_NAME_OF_HOLDER[control.key.holder]
  const names = order.filter((name) => name !== leftOut)
  const customWord = COLOUR_FIELD_WORDS.get('custom')?.[look.language] ?? ''
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
      light: colourSide(stored, form, look, false),
      dark: colourSide(stored, form, look, true),
      names: order.map((name) => ({ name, isOffered: names.includes(name) })),
      theme: {
        word: COLOUR_FIELD_WORDS.get('theme')?.[look.language] ?? '',
        hint: COLOUR_FIELD_WORDS.get('themeHint')?.[look.language] ?? '',
      },
    },
  }
}

// see CV-9
/** @purity pure */
function withColourFields(fields: readonly PropertyField[], look: ColourLook): readonly PropertyField[] {
  return fields.map((field) =>
    field.controls.some((one) => one.kind === 'color')
      ? { ...field, controls: field.controls.map((one) => withColourField(one, look)) }
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

  if (content.kind === 'documentSettingsDisplayed') {
    return {
      showing: 'documentSettings',
      isSubjectGone: false,
      fields: settingsFields(settings, language),
      commands: panelCommands(language),
    }
  }

  const isNothingPicked = selection.items.length === 0 && readings.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? content.subject
    : { selection, groupIds: readings.selectedGroupIds }
  const described = fieldsOfSubject(schedule, subject, settings.labelCoef, language)
  const look = {
    hue: schedule.project.themeHue,
    dark: settings.themePreference === 'dark',
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
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_PROPERTY_CONTROL_SIZES: {
  readonly 'S-199': number
} = {
  'S-199': 2.19,
}
// </generated>

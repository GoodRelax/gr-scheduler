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
import propertyItems from './property-items.json'

const PART_SEPARATOR = ' / '

const KEY_PATH_SEPARATOR = '.'

const DAY_TIME_SEPARATOR = 'T'

const PROPERTIES_PANEL = 'Properties Panel'

const ENTRY_WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

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
)

type TaskPropertyItem = Extract<PropertyItem, { heldBy: 'task' | 'taskVisual' | 'assignment' }>
type GroupPropertyItem = Extract<PropertyItem, { heldBy: 'taskGroup' }>
type CommentBoxPropertyItem = Extract<PropertyItem, { heldBy: 'commentBox' }>

type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox'

const APPLIES_TO_TASK: AppliesTo = 'Task'
const APPLIES_TO_TASK_GROUP: AppliesTo = 'TaskGroup'
const APPLIES_TO_COMMENT_BOX: AppliesTo = 'CommentBox'

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

/** @purity pure */
function heldByOf(row: string, appliesTo: AppliesTo): PropertyItem['heldBy'] {
  if (appliesTo === APPLIES_TO_TASK_GROUP) return 'taskGroup'
  if (appliesTo === APPLIES_TO_COMMENT_BOX) return 'commentBox'
  const heldBy = HELD_BY_ON_A_TASK[row]
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

const READ_ONLY_ROWS: readonly string[] = propertyItems.items
  .filter((item) => item.isReadOnly)
  .map((item) => item.rowId)

// STOP: spec does not decide how a number, truth value or list is spelled on this panel. Looked in T-016, FR-006, FR-072
/** @purity pure */
function textOfValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(textOfValue).join(PART_SEPARATOR)

  // STOP: spec does not decide how a group-valued setting is written. Looked in T-104
  return ''
}

// WHY: found by shape, not by key: a hand roster of id-holding keys misses the next one added.
const IDENTIFIER = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// STOP: spec does not decide what stands in a hidden identifier's place. Looked in T-104, FR-072, FR-006, T-016
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
function textOfTaskColumn(task: Task, column: keyof Task): string {
  if (DATE_COLUMNS.Task.includes(column)) return textOfDateColumn(task[column])
  return textOfValue(task[column])
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

// STOP: spec does not decide how several assignees are written here. Looked in T-225, FR-059, FR-008, T-016
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

// TRAP: listed by hand, since the schema types a colour as a plain string; add a new colour column here.
const COLOUR_COLUMNS: readonly string[] = ['strokeColor', 'fillColor', 'color']

const MULTILINE_COLUMNS: readonly string[] = ['notes', 'text']

const CHOICE_OVER_DOCUMENT_COLUMNS: readonly string[] = ['wbsParentUid']

type ShapedEntity = keyof typeof COLUMN_SHAPES

// see T-016
/** @purity pure */
function controlKindOf(entity: ShapedEntity, column: string): PropertyControlKind {
  // TRAP: keep these first: colours, notes and dates are strings, and wbsParentUid is an integer to the shape.
  if (COLOUR_COLUMNS.includes(column)) return 'color'
  if (MULTILINE_COLUMNS.includes(column)) return 'multiline'
  if (CHOICE_OVER_DOCUMENT_COLUMNS.includes(column)) return 'choice'
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
// STOP: spec does not decide what PR-15's parent is chosen from, or how it is spelled. Looked in T-016, FR-005, AT-24, AT-25
// @provisional PND-272
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

// see PR-16, AS-9
// STOP: spec does not decide which of several assignees the chooser stands on. Looked in T-225, FR-059, FR-008, T-016
// WHY: the key's column is uid because no command of table T-108 sets it, so a commit without its row writes nothing.
/** @purity pure */
function assigneeControl(schedule: Schedule, taskUid: number, labelCoef: number): PropertyControl {
  const people = assigneeChoices(schedule)
  const seated = assigneesOf(schedule, taskUid)[0]
  return {
    key: { holder: 'task', uid: taskUid, column: 'uid' },
    kind: 'choice',
    text: seated === undefined ? '' : String(seated.uid),
    choices: people.map((person) => person.name),
    choiceValues: people.map((person) => String(person.uid)),
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

/** @purity pure */
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

// STOP: spec does not decide the row of a dependency's far end. Looked in T-058, T-016, FR-009, T-023c
const SUCCESSOR_ROW = 'FR-009'

const SUCCESSOR_NAME: keyof Extract<ItemRef, { kind: 'dependency' }> = 'successorUid'

// see FR-009
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
      // STOP: spec does not decide a command that moves a dependency between tasks. Looked in T-108, T-058, FR-009, T-016
      controls: [],
    },
  ]
}

// STOP: spec does not decide what the panel shows for several selected items. Looked in FR-072, FR-006, FR-009, T-023c
/** @purity pure */
function subjectOf(selection: Selection): ItemRef | null {
  const [only] = selection.items
  if (selection.items.length === 1 && only !== undefined) return only
  return lastPicked(selection)
}

// STOP: spec does not decide fields for a highlight box or the status line. Looked in FR-072, FR-006, FR-009, T-016, T-023c
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
    case 'commentBox': {
      const box = schedule.commentBoxes.find((one) => one.id === subject.id)
      return box === undefined ? null : commentBoxFields(schedule, box, labelCoef, language)
    }
    case 'highlightBox':
    case 'statusLine':
      return []
  }
}

type CommentBox = Schedule['commentBoxes'][number]

// see T-016, MK-13
/** @purity pure */
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

/** @purity pure */
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

type TaskGroup = Schedule['taskGroups'][number]

const ATTRIBUTE_ROW_BY_GROUP_COLUMN: Readonly<Record<string, string>> = {
  label: 'AT-53',
  color: 'AT-58',
  height: 'AT-59',
}

/** @purity pure */
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

// see FR-042
/** @purity pure */
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
            null,
            labelCoef,
          ),
        ),
  }))
}

// STOP: spec does not decide which of several picked rows is described. Looked in FR-042, FR-085, T-023c, T-015
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
// STOP: spec does not decide which settings show, in what order, or whether any is read-only. Looked in IC-17, T-104, FR-072
/** @purity pure */
function settingsFields(
  settings: DocumentSettings,
  language: DisplayLanguage,
): readonly PropertyField[] {
  return Object.keys(SETTINGS_DEFAULTS).map((key) => ({
    row: settingsWordOf(key)?.rowId ?? key,
    name: settingsName(key, language),
    text: textOfSettingsValue(valueAt(settings, key)),
    isEditable: true,
    controls: [],
  }))
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
): PropertiesPanel | null {
  const showing = session.propertiesShowing
  if (showing === null) return null

  if (showing === 'documentSettings') {
    return {
      showing,
      isSubjectGone: false,
      fields: settingsFields(settings, session.language),
      commands: panelCommands(session.language),
    }
  }

  const isNothingPicked = selection.items.length === 0 && session.selectedGroupIds.length === 0
  const subject = isNothingPicked
    ? session.propertiesSubject
    : { selection, groupIds: session.selectedGroupIds }
  const fields = subject === null ? null : fieldsOfSubject(schedule, subject, settings.labelCoef, session.language)

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
// see T-206
export const NOT_STORED_PROPERTY_CONTROL_SIZES: {
  readonly 'S-199': number
} = {
  'S-199': 2.19,
}
// </generated>

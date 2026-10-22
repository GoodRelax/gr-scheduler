// ScreenRenderer: the Properties Panel's content for one frame.
// @unit      UF-64   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import {
  DISPLAY_SCALE_STEPS,
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  COLUMN_SHAPES,
  DATE_COLUMNS,
  actualInstantsOf,
  actualLastDay,
  actualLengthOf,
  actualMinutesOf,
  customColorOf,
  customSideOf,
  dayOf,
  DaySpanTooWide,
  earliestPlanStartDayOf,
  isSearchWordFound,
  lagWorkingDaysOf,
  minutesPerWorkingDayOf,
  NoWorkingDayReached,
  shownInstantReader,
  sideOfTaskColumn,
  startSideOf,
  TENTHS_OF_A_MINUTE,
  TRANSPARENT,
  taskByUid,
  taskGroupNameOf,
  textOfDay,
  textOfInstant,
  parentTaskResolutionsOf,
  TIME_ZONE_ROWS,
  viewRegionOf,
  workingCalendarOf,
  workingDayShiftOf,
  type CalendarDay,
  type DateTimeSide,
  type Dependency,
  type InstantOnSide,
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
  clockTextOf,
  labelUnits,
  MORE_ASSIGNEES_MARK,
  lengthTextOf,
  planDateText,
  type TaskGroupPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type {
  PropertiesSubject,
  ScreenSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { colorOf, inkOn, swatchOf } from '../svg-renderer/svg-renderer'
import type {
  AssigneeCandidate,
  AssigneeCombo,
  ColorEntrance,
  CommandItem,
  DisplayLanguage,
  IconId,
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  PropertyFieldGroup,
  PropertyBadge,
  PropertyFieldKey,
  PropertyLink,
  ScreenViewReadings,
} from './screen-renderer'
import { ASSIGNEE_LIST_SEPARATOR, DISPLAY_TIME_ZONE_SLOT_SEPARATOR, FIT_SPAN_COPY_TEXT, displayLanguageOf } from './screen-renderer'
import { dateText } from './table-window'
import dependencyKinds from './dependency-kinds.json'
import { iconHint, iconLabel } from './tooltips'
import {
  shiftAmountText,
  timeZoneAbbreviationOf,
  timeZoneFieldWord,
  timeZoneLinesOf,
  wholeScheduleShiftFieldWord,
} from './notices'
import displayWords from './display-words.json'
import iconRoster from './icon-roster.json'
import propertyItems from './property-items.json'
import themeHueRoster from './theme-hue-roster.json'

const PART_SEPARATOR = ' / '

const KEY_PATH_SEPARATOR = '.'

const DAY_TIME_SEPARATOR = 'T'

const PROPERTIES_PANEL = 'Properties Panel'

const ITEM_WORDS_BY_ROW = new Map(displayWords.properties.map((item) => [item.rowId, item]))

// see FR-009, T-018
const DEPENDENCY_KINDS = dependencyKinds.dependencyKinds

const SETTINGS_WORDS_BY_KEY = new Map(
  displayWords.settings.flatMap((entry) =>
    entry.keys.map((key) => [key, entry] as const),
  ),
)

const NO_ENTRY_WORDS = ''

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

type NamedField = Pick<PropertyField, 'name' | 'nameBreakSegments'>

// see FR-006, FR-038
/** @purity pure */
function breakSegmentsOf(entry: object | undefined, language: DisplayLanguage): readonly string[] | undefined {
  if (entry === undefined || !('labelBreakSegments' in entry)) return undefined
  return (entry.labelBreakSegments as Partial<Record<DisplayLanguage, readonly string[]>>)[language]
}

/** @purity pure */
function namedField(name: string, segments: readonly string[] | undefined): NamedField {
  return segments === undefined ? { name } : { name, nameBreakSegments: segments }
}

/** @purity pure */
function settingsNamed(key: string, language: DisplayLanguage): NamedField {
  return namedField(settingsName(key, language), breakSegmentsOf(settingsWordOf(key), language))
}

/** @purity pure */
function partNamed(entries: readonly { readonly part: string }[], part: string, language: DisplayLanguage): NamedField {
  const entry = entries.find((one) => one.part === part) as { readonly text?: { readonly ja: string; readonly en: string } } | undefined
  return namedField(entry?.text?.[language] ?? NO_ENTRY_WORDS, breakSegmentsOf(entry, language))
}

// see AS-5, IC-123, IC-124, IC-139
const ASCENDING_ENTRY: IconId = 'IC-123'
const DESCENDING_ENTRY: IconId = 'IC-124'
const CHECK_ALL_ENTRY: IconId = 'IC-125'
const UNCHECK_ALL_ENTRY: IconId = 'IC-126'
const GRS_RESET_ENTRY: IconId = 'IC-139'
const TIME_SHIFT_ENTRY: IconId = 'IC-162'
// WHY: these sit inside a field of the panel, not on its way-out line beside IC-52.
const IN_FIELD_ENTRIES: readonly IconId[] = [
  ASCENDING_ENTRY, DESCENDING_ENTRY, CHECK_ALL_ENTRY, UNCHECK_ALL_ENTRY, GRS_RESET_ENTRY, TIME_SHIFT_ENTRY,
]

/** @purity pure */
function commandItemOf(icon: IconId, language: DisplayLanguage): CommandItem {
  return { icon, isEnabled: true, isPressed: false, isArmed: false, isChosen: false, label: iconLabel(icon, language) }
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

const HELD_BY_ON_A_TASK: Readonly<Record<TaskPropertyItemRow, PropertyItem['heldBy']>> = {
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
  'PR-47': 'task',
}

/** @purity pure */
function heldByOf(row: string, appliesTo: AppliesTo): PropertyItem['heldBy'] {
  const heldBy = HELD_BY_OF_OBJECT[appliesTo] ?? HELD_BY_ON_A_TASK[row as TaskPropertyItemRow]
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

// see FR-054, EX-7
/** @purity pure */
function textOfDateColumn(stored: unknown): string {
  const day = typeof stored === 'string' ? dayOf(stored) : null
  if (day === null) return ''
  return textOfDay(day).split(DAY_TIME_SEPARATOR)[0] ?? ''
}

// see TX-3, FR-158, FR-054, FR-156
// WHY: the host's `yyyy-mm-ddThh:mm` entry (the minute is the stored unit), read on its side in the view base (field-commit reads it back).
/** @purity pure */
function textOfDateTimeColumn(stored: unknown, side: DateTimeSide, inTime: InstantOnSide): string {
  const instant = typeof stored === 'string' ? inTime(stored, side) : null
  return instant === null ? '' : textOfInstant(instant).slice(0, DATE_TIME_ENTRY_LENGTH)
}

const DATE_TIME_ENTRY_LENGTH = 16

// TRAP: assumes TaskVisual has no date column; textOfItem would write a new one raw.
/** @purity pure */
function textOfTaskColumn(schedule: Schedule, task: Task, column: keyof Task, inTime: InstantOnSide | null): string {
  if ((column as string) === ACTUAL_LENGTH_ITEM) return textOfActualLength(schedule, task, inTime)
  if (!DATE_COLUMNS.Task.includes(column)) return textOfValue(task[column])
  return inTime !== null ? textOfDateTimeColumn(task[column], sideOfTaskColumn(task, column), inTime) : textOfDateColumn(task[column])
}

// see PR-5, P-5
// WHY: the name of PR-5's row, not a Task column; the length is counted from the dates (FR-011).
const ACTUAL_LENGTH_ITEM = 'actualDuration'

// see PR-5, FR-011
/** @purity pure */
function textOfActualLength(schedule: Schedule, task: Task, inTime: InstantOnSide | null): string {
  if (inTime !== null) return actualLengthTextInTime(schedule, task)
  const start = dayOf(task.actualStart)
  const lastDay = actualLastDay(task)
  if (start === null || lastDay === null) return textOfValue(null)
  return textOfValue(actualLengthOf(workingCalendarOf(schedule), start, lastDay))
}

// see PR-5, TX-3, TX-10, FR-011
// WHY: with time of day the length is the working minutes from actualStart to the actual's end, spelled by TX-10.
/** @purity pure */
function actualLengthTextInTime(schedule: Schedule, task: Task): string {
  const within = workingCalendarOf(schedule)
  const ends = actualInstantsOf(within, task)
  if (ends === null) return textOfValue(null)
  return lengthTextOf(actualMinutesOf(within, ends[0], ends[1]), minutesPerWorkingDayOf(schedule.project))
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

// see AS-6, AS-13
// WHY: no FR-059 work-resource filter: this surface edits assignments, and a hidden resource could not be removed.
// In document order: the first is the primary (AS-13).
/** @purity pure */
function assigneesOf(schedule: Schedule, taskUid: number): readonly Assignee[] {
  const assignees: Assignee[] = []

  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    const resource = schedule.resources.find((held) => held.uid === assignment.resourceUid)
    if (resource === undefined || resource.name === null) continue
    assignees.push({ name: resource.name, uid: resource.uid })
  }
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

type ShapedEntity = keyof typeof COLUMN_SHAPES

// see T-016
/** @purity pure */
function controlKindOf(entity: ShapedEntity, column: string): PropertyControlKind {
  // TRAP: keep these first: notes and dates are strings.
  if (COLUMN_SHAPES[entity][column]?.kind === 'color') return 'color'
  if (MULTILINE_COLUMNS.includes(column)) return 'multiline'
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

/** @purity pure */
function controlOf(
  key: PropertyFieldKey,
  entity: ShapedEntity,
  column: string,
  text: string,
  labelCoef: number,
): PropertyControl {
  const kind = controlKindOf(entity, column)
  const shape = COLUMN_SHAPES[entity][column]
  const choices = kind === 'choice' ? (shape?.choices ?? null) : null
  return {
    key,
    kind,
    text,
    choices,
    min: kind === 'number' ? (shape?.min ?? annotationBoundsOf(entity, column)?.min ?? null) : null,
    max: kind === 'number' ? (shape?.max ?? annotationBoundsOf(entity, column)?.max ?? null) : null,
    widthInFontSizes: kind === 'date' ? dateEntryWidthOf(false) : widthOf(text, choices, labelCoef),
  }
}

const PARENT_COLUMN: keyof Task & string = 'parentTaskUid'

const COUNT_SLOT = '{n}'

// see PTL-15, FR-038
const PARENT_WORD_PARTS = { derived: 'derivedParent', undecided: 'undecidedParent', none: 'noParent' } as const

interface ParentShown {
  readonly text: string
  readonly link: PropertyLink | null
}

// see PTL-15, SQ-1
// WHY: an empty name would draw a link with nothing to press, so the uid stands in for it.
/** @purity pure */
function linkedNameOf(task: Task): string {
  return task.name === null || task.name === '' ? String(task.uid) : task.name
}

// see PTL-15, VS-2, IP-1, IP-2, IP-5, VO-4
// WHY: the stated value is read first, so a stated milestone parent still shows (PTL-15 1) though IP-2 reads past it.
/** @purity pure */
function parentShownOf(schedule: Schedule, task: Task, language: DisplayLanguage): ParentShown {
  const stated = task.parentTaskUid === null ? null : taskByUid(schedule, task.parentTaskUid)
  if (stated !== null) return { text: linkedNameOf(stated), link: { taskUid: stated.uid, canUnlink: true } }
  const resolution = parentTaskResolutionsOf({ schedule }, task.uid).get(task.uid)
  const word = (part: string): string | null => PROPERTY_FIELD_WORDS.get(part)?.[language] ?? null
  const derived = resolution?.kind === 'derived' ? taskByUid(schedule, resolution.parentUid) : null
  if (derived !== null) {
    const name = linkedNameOf(derived)
    const text = (word(PARENT_WORD_PARTS.derived) ?? NAME_SLOT).replace(NAME_SLOT, () => name)
    return { text, link: { taskUid: derived.uid, canUnlink: false } }
  }
  if (resolution?.kind === 'undecided') {
    return { text: (word(PARENT_WORD_PARTS.undecided) ?? '').replace(COUNT_SLOT, String(resolution.enclosing)), link: null }
  }
  return { text: word(PARENT_WORD_PARTS.none) ?? '', link: null }
}

// see PTL-15, PTL-16, PTL-17, PR-15, FR-006
// WHY: plain words carry no control, so they draw as text and never as a link that does nothing (PTL-15).
/** @purity pure */
function parentField(schedule: Schedule, task: Task, item: TaskPropertyItem, language: DisplayLanguage): PropertyField {
  const shown = parentShownOf(schedule, task, language)
  const key: PropertyFieldKey = { holder: 'task', uid: task.uid, column: PARENT_COLUMN }
  const control: PropertyControl = {
    key,
    kind: 'taskReference',
    text: shown.text,
    choices: null,
    min: null,
    max: null,
    widthInFontSizes: NO_ROOM_FLOOR,
  }
  return {
    row: item.row,
    name: itemName(item.row, language),
    text: shown.text,
    isEditable: shown.link?.canUnlink === true,
    controls: shown.link === null ? [] : [{ ...control, link: shown.link }],
  }
}

// see FR-006, T-217
// WHY: the schema leaves these columns unbounded on purpose; table T-217 holds their range (FR-006).
/** @purity pure */
function annotationBoundsOf(
  entity: ShapedEntity,
  column: string,
): { readonly min: number; readonly max: number; readonly default: number } | null {
  const key = `${entity}.${column}`
  return Object.values(NOT_STORED_ANNOTATION_BOUNDS).find((row) => row.key === key) ?? null
}

// see PR-50, S-624
// WHY: a null font size is drawn at the table's default, so its field shows that number instead of an empty box.
const SHOWS_ITS_DEFAULT: ReadonlySet<string> = new Set(['CommentBox.fontSizePx'])

/** @purity pure */
function shownValueOf(entity: ShapedEntity, column: string, value: unknown): unknown {
  if ((value !== null && value !== undefined) || !SHOWS_ITS_DEFAULT.has(`${entity}.${column}`)) return value
  return annotationBoundsOf(entity, column)?.default ?? value
}

// see FR-006
// WHY: a chooser of names gathered from the document takes no floor: it fits the panel and the
// drawing side cuts a name too long for it (FR-006), so the longest name cannot push it past the edge.
const NO_ROOM_FLOOR = 0

// see FR-006, S-589, S-590, TX-3
// WHY: the host draws its own format and calendar button, so the room is the same with or without a value (JDG-1491).
/** @purity pure */
export function dateEntryWidthOf(isDateTime: boolean): number {
  return isDateTime ? NOT_STORED_PROPERTY_CONTROL_SIZES['S-590'] : NOT_STORED_PROPERTY_CONTROL_SIZES['S-589']
}

// see FR-006, FR-093, S-199
/** @purity pure */
export function widthOf(text: string, choices: readonly string[] | null, labelCoef: number): number {
  const widest = (choices ?? []).reduce((most, one) => Math.max(most, labelUnits(one)), labelUnits(text))
  return widest * labelCoef + NOT_STORED_PROPERTY_CONTROL_SIZES['S-199']
}

// see AS-5, AS-6
// WHY: the uid is added to a name only where two people share it (AS-6).
/** @purity pure */
function assigneeComboOf(schedule: Schedule, language: DisplayLanguage): Omit<AssigneeCombo, 'seated' | 'fieldWord'> {
  const people = assigneeChoices(schedule)
  const shared = (name: string): boolean => people.filter((one) => one.name === name).length > 1
  const held = {
    people: people.map((one) => ({
      ...one,
      word: shared(one.name) ? nameWithUid(one.name, one.uid, language) : one.name,
    })),
    addWord: PROPERTY_FIELD_WORDS.get('addResource')?.[language] ?? '',
    sortEntries: [commandItemOf(ASCENDING_ENTRY, language), commandItemOf(DESCENDING_ENTRY, language)],
    checkEntries: [commandItemOf(CHECK_ALL_ENTRY, language), commandItemOf(UNCHECK_ALL_ENTRY, language)],
  }
  // WHY: carried with the roster, so the drawing side narrows it without a second reading of SV-4.
  return { ...held, candidatesOf: (typed, isDescending) => assigneeCandidatesOf(held, typed, isDescending) }
}

// see AS-5, AS-3, SV-4, IC-123, IC-124
// WHY: an empty text adds no one: the add item names the person it makes (AS-7).
/** @purity pure */
export function assigneeCandidatesOf(
  combo: Pick<AssigneeCombo, 'people' | 'addWord'>,
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

// see PR-16, AS-1, AS-5, AS-13
// WHY: one field: the people seated in document order, the primary's word and the mark when more sit (FR-059).
/** @purity pure */
function assigneeControls(
  schedule: Schedule,
  taskUid: number,
  language: DisplayLanguage,
): readonly PropertyControl[] {
  const people = assigneeChoices(schedule)
  const seated = [...new Set(assigneesOf(schedule, taskUid).map((person) => person.uid))]
  const combo = assigneeComboOf(schedule, language)
  const primary = combo.people.find((one) => one.uid === seated[0])?.word ?? ''
  const fieldWord = seated.length > 1 ? `${primary}${MORE_ASSIGNEES_MARK}` : primary
  return [{
    key: { holder: 'assignment', taskUid, resourceUid: null, column: 'resourceUid' },
    kind: 'choice',
    text: seated.join(ASSIGNEE_LIST_SEPARATOR),
    choices: people.map((person) => person.name),
    choiceValues: people.map((person) => String(person.uid)),
    assignee: { ...combo, seated, fieldWord },
    min: null,
    max: null,
    widthInFontSizes: NO_ROOM_FLOOR,
    isFocusTarget: true,
  }]
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
  inTime: InstantOnSide | null,
): readonly PropertyControl[] {
  if (READ_ONLY_ROWS.includes(item.row) || item.heldBy === 'derived') return []
  if (item.heldBy === 'assignment') return assigneeControls(schedule, task.uid, language)

  const entity: ShapedEntity = item.heldBy === 'task' ? 'Task' : 'TaskVisual'
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  return drawnColumnsOf<string>(item).map((column) => {
    const key: PropertyFieldKey =
      item.heldBy === 'task'
        ? { holder: 'task', uid: task.uid, column: column as keyof Task & string }
        : { holder: 'taskVisual', uid: task.uid, column: column as keyof TaskVisual & string }
    const text =
      item.heldBy === 'task'
        ? textOfTaskColumn(schedule, task, column as keyof Task, inTime)
        : visual === null
          ? ''
          : textOfValue(visual[column as keyof TaskVisual])
    const control = controlOf(key, entity, column, text, labelCoef)
    return inTime !== null ? controlInTime(control, column) : control
  })
}

// see TX-3, FR-158, FR-009, PR-5, PR-42
// WHY: a host number entry refuses the d / h / m of TX-10, so a typed length is a text entry while time of day is shown.
/** @purity pure */
function controlInTime(control: PropertyControl, column: string): PropertyControl {
  if (control.kind === 'date') return { ...control, isDateTime: true, widthInFontSizes: dateEntryWidthOf(true) }
  if (!TYPED_LENGTH_COLUMNS.includes(column)) return control
  return { ...control, kind: 'text', min: null, max: null }
}

// see PR-5, PR-42, TX-3
const TYPED_LENGTH_COLUMNS: readonly string[] = ['actualDuration', 'linkLag']

/** @purity pure */
function textOfItem(
  schedule: Schedule,
  task: Task,
  visual: TaskVisual | null,
  item: TaskPropertyItem,
  language: DisplayLanguage,
  inTime: InstantOnSide | null,
): string {
  switch (item.heldBy) {
    case 'task':
      return drawnColumnsOf(item).map((column) => textOfTaskColumn(schedule, task, column, inTime)).join(PART_SEPARATOR)
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
  inTime: InstantOnSide | null,
): readonly PropertyField[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === task.uid) ?? null

  const isMilestone = task.milestone === true
  return TASK_ITEMS.filter((item) => isShownFor(item, task)).map((item) => item.columns[0] === PARENT_COLUMN ? parentField(schedule, task, item, language) : ({
    row: item.row,
    name: itemName(item.row, language, isMilestone),
    text: textOfItem(schedule, task, visual, item, language, inTime),
    isEditable: !READ_ONLY_ROWS.includes(item.row) && item.heldBy !== 'derived',
    controls: item.heldBy === 'derived'
      ? linkedEndControls(schedule, task, item.columns[0] ?? '', language, inTime)
      : controlsOfItem(schedule, task, item, labelCoef, language, inTime),
  }))
}

interface LinkedEnd {
  readonly uid: number
  readonly dependency: Dependency
}

const PREDECESSORS_COLUMN = 'predecessors'

const DEPENDENCIES_KEY_COLUMN: keyof Task & string = 'dependencies'

const ABBREVIATION_SLOT = '{abbreviation}'

const LAG_SLOT = '{lag}'

const LINK_HINT_PART_PREFIX = 'linkHint'

// see PR-37, PR-38
/** @purity pure */
function linkedEndsOf(schedule: Schedule, task: Task, column: string): readonly LinkedEnd[] {
  const ends =
    column === PREDECESSORS_COLUMN
      ? task.dependencies.map((dependency) => ({ uid: dependency.predecessorUid, dependency }))
      : schedule.tasks.flatMap((one) =>
          one.dependencies.filter((link) => link.predecessorUid === task.uid).map((dependency) => ({ uid: one.uid, dependency })),
        )
  return [...ends].sort((a, b) => a.uid - b.uid)
}

// see PR-37, PR-38, T-018, DP-1, FR-009
// WHY: FS carries no badge, so a document of FS links shows names only and a rarer kind stands out.
/** @purity pure */
function badgeOf(dependency: Dependency, language: DisplayLanguage): PropertyBadge | null {
  const kind = DEPENDENCY_KINDS.find((one) => one.linkType === dependency.linkType)
  if (kind === undefined || kind.rowId === FINISH_TO_START_ROW) return null
  const hint = PROPERTY_FIELD_WORDS.get(`${LINK_HINT_PART_PREFIX}${kind.abbreviation}`)?.[language] ?? ''
  return { text: kind.abbreviation, hint: hint.replace(ABBREVIATION_SLOT, () => kind.abbreviation) }
}

const FINISH_TO_START_ROW = 'DP-1'

const PLUS_SIGN = '+'

// see PR-37, PR-38, AT-47, FR-009, S-118
// WHY: read in working days whatever unit it was taken in; a lag no day count settles is read through the day's minutes.
/** @purity pure */
function lagWordOf(project: Project, dependency: Dependency, language: DisplayLanguage, inTime: InstantOnSide | null): string {
  if (dependency.linkLag === null || dependency.linkLag === 0) return ''
  const typed = typedLagTextOf(project, dependency, inTime)
  if (typed !== null) return `${dependency.linkLag > 0 ? PLUS_SIGN : ''}${typed}`
  const minutesPerDay = minutesPerWorkingDayOf(project)
  const days = lagWorkingDaysOf(dependency, minutesPerDay) ?? dependency.linkLag / TENTHS_OF_A_MINUTE / minutesPerDay
  const signed = `${days > 0 ? PLUS_SIGN : ''}${shownLagNumber(days)}`
  return (PROPERTY_FIELD_WORDS.get('lagDays')?.[language] ?? '').replace(LAG_SLOT, () => signed)
}

// see PR-37, PR-38, PTL-16
/** @purity pure */
function linkedEndControls(
  schedule: Schedule,
  task: Task,
  column: string,
  language: DisplayLanguage,
  inTime: InstantOnSide | null,
): readonly PropertyControl[] {
  return linkedEndsOf(schedule, task, column).map((end) => {
    const linked = taskByUid(schedule, end.uid)
    const badge = badgeOf(end.dependency, language)
    const lag = lagWordOf(schedule.project, end.dependency, language, inTime)
    return {
      key: { holder: 'task', uid: task.uid, column: DEPENDENCIES_KEY_COLUMN },
      kind: 'taskReference',
      text: linked === null ? String(end.uid) : linkedNameOf(linked),
      choices: null,
      min: null,
      max: null,
      widthInFontSizes: NO_ROOM_FLOOR,
      link: { taskUid: end.uid, canUnlink: false },
      ...(badge === null ? {} : { badge }),
      ...(lag === '' ? {} : { lag }),
    }
  })
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
function lagText(project: Project, dependency: Dependency, inTime: InstantOnSide | null): string {
  if (dependency.linkLag === null) return ''
  const spelled = typedLagTextOf(project, dependency, inTime)
  if (spelled !== null) return spelled
  const workingDays = lagWorkingDaysOf(dependency, minutesPerWorkingDayOf(project))
  if (workingDays !== null) return shownLagNumber(workingDays)
  const minutes = dependency.linkLag / TENTHS_OF_A_MINUTE
  const format = dependency.lagFormat ?? 0
  const isEstimated = format > ESTIMATED_LAG_FORMAT_OFFSET
  const unit = LAG_FORMAT_UNITS.get(isEstimated ? format - ESTIMATED_LAG_FORMAT_OFFSET : format)
  const unitMinutes = unit === undefined ? null : minutesOfUnit(project, unit.length)
  if (unit === undefined || unitMinutes === null) return `${shownLagNumber(minutes)}${MINUTE_SYMBOL}`
  return `${shownLagNumber(minutes / unitMinutes)}${unit.symbol}${isEstimated ? ESTIMATED_MARK : ''}`
}

// see FR-009, TX-3, TX-10, AT-48
// WHY: null is no time of day, or a format not typed in d / h / m; that lag keeps the spelling of FR-009.
/** @purity pure */
function typedLagTextOf(project: Project, dependency: Dependency, inTime: InstantOnSide | null): string | null {
  const lag = dependency.linkLag ?? 0
  if (inTime === null) return null
  if (lag !== 0 && !TYPED_LAG_FORMATS.includes(dependency.lagFormat ?? 0)) return null
  return lengthTextOf(lag / TENTHS_OF_A_MINUTE, minutesPerWorkingDayOf(project))
}

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, TypedLag.lagUnit).
// see T-108, TX-10
const LENGTH_LETTERS = ['d', 'h', 'm'] as const
// </generated>

// see FR-009, AT-48, TX-10
// WHY: the formats whose symbol is a letter TX-10 spells a length with (7 d, 5 h, 3 m), read off the one table of codes.
const TYPED_LAG_FORMATS: readonly number[] = [...LAG_FORMAT_UNITS]
  .filter(([, unit]) => (LENGTH_LETTERS as readonly string[]).includes(unit.symbol))
  .map(([format]) => format)

// see T-018, FR-009, PR-41, PR-42, PR-43, PR-44
/** @purity pure */
function dependencyText(
  schedule: Schedule,
  dependency: Dependency,
  successorUid: number,
  column: string,
  language: DisplayLanguage,
  inTime: InstantOnSide | null,
): string {
  if (column === 'predecessorUid') return dependencyEndText(schedule, dependency.predecessorUid, language)
  if (column === 'successorUid') return dependencyEndText(schedule, successorUid, language)
  if (column === 'linkLag') return lagText(schedule.project, dependency, inTime)
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
  inTime: InstantOnSide | null,
): readonly PropertyField[] {
  return DEPENDENCY_ITEMS.map((item) => {
    const column = (item.columns[0] ?? '') as keyof Dependency & string
    const isEditable = !READ_ONLY_ROWS.includes(item.row)
    const key: PropertyFieldKey = { holder: 'dependency', successorUid, ordinal, column }
    const text = dependencyText(schedule, dependency, successorUid, column, language, inTime)
    const control = controlOf(key, 'Dependency', column, text, labelCoef)
    return {
      row: item.row,
      name: itemName(item.row, language),
      text,
      isEditable,
      controls: isEditable ? [inTime !== null ? controlInTime(control, column) : control] : [],
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
  inTime: InstantOnSide | null,
): readonly PropertyField[] | null {
  switch (subject.kind) {
    case 'task': {
      const task = taskByUid(schedule, subject.uid)
      return task === null ? null : taskFields(schedule, task, labelCoef, language, inTime)
    }
    case 'dependency': {
      const successor = taskByUid(schedule, subject.successorUid)
      const dependency = successor?.dependencies[subject.ordinal]
      if (successor === null || dependency === undefined) return null
      return dependencyFields(schedule, dependency, successor.uid, subject.ordinal, labelCoef, language, inTime)
    }
    case 'commentBox':
      return fieldsOfFound(schedule.commentBoxes.find(withId(subject.id)), commentBoxRows, labelCoef, language)
    case 'highlightBox': {
      const box = schedule.highlightBoxes.find(withId(subject.id))
      return fieldsOfFound(box, highlightBoxRows, labelCoef, language)
    }
    case 'statusLine':
    case 'parentTaskLink':
      return []
  }
}

/** @purity pure */
function withId(id: string): (one: { readonly id: string }) => boolean {
  return (one) => one.id === id
}

/** @purity pure */
function fieldsOfFound<Held>(
  found: Held | undefined,
  rowsOf: (held: Held) => ObjectRows<Held>,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] | null {
  return found === undefined ? null : objectFields(rowsOf(found), labelCoef, language)
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
  rows: ObjectRows<Held>,
  labelCoef: number,
  language: DisplayLanguage,
): readonly PropertyField[] {
  const { items, held, keyOf, entity } = rows
  return items.map((item) => {
    const [first] = item.columns
    if (first !== undefined && first === COMMAND_COLUMN) return commandField(item.row, keyOf(first), entity, labelCoef, language)
    return {
      row: rows.rowOf?.(item) ?? item.row,
      name: itemName(item.row, language),
      text: item.columns.map((column) => textOfValue(shownValueOf(entity, column, held[column]))).join(PART_SEPARATOR),
      isEditable: !READ_ONLY_ROWS.includes(item.row),
      controls: READ_ONLY_ROWS.includes(item.row)
        ? []
        : item.columns.map((column) =>
          controlOf(keyOf(column), entity, column, textOfValue(shownValueOf(entity, column, held[column])), labelCoef)),
    }
  })
}

// see T-016, PR-48, PR-49, CM-100, CM-101
// WHY: a command row edits no column; its one column is the box's key, and pressing its word commits that key,
// which the translator reads as the row's command (the box to the front, FR-019).
const COMMAND_COLUMN = 'id'

// WHY: never the empty text, so a press is never read as leaving the field as it was.
const COMMAND_PRESS_TEXT = 'bringToFront'

/** @purity pure */
function commandField(
  row: string,
  key: PropertyFieldKey,
  entity: ShapedEntity,
  labelCoef: number,
  language: DisplayLanguage,
): PropertyField {
  const word = itemName(row, language)
  const control = controlOf(key, entity, COMMAND_COLUMN, COMMAND_PRESS_TEXT, labelCoef)
  return { row, name: '', text: '', isEditable: true, controls: [{ ...control, press: word, widthInFontSizes: widthOf(word, null, labelCoef) }] }
}

type TaskGroup = Schedule['taskGroups'][number]

const TASK_GROUP_NAME_COLUMN = 'name'
const TASK_GROUP_NAME_FIELD_TASK_GROUP = 'AT-53'

// see IR-1, FR-085, FR-042
/** @purity pure */
function declaredRowOf(item: ItemRows): string {
  const [first] = item.columns
  return first === TASK_GROUP_NAME_COLUMN ? TASK_GROUP_NAME_FIELD_TASK_GROUP : item.row
}

const TASK_GROUP_MIN_HEIGHT_WORDS = new Map(displayWords.rowMinHeightField.map((entry) => [entry.part, entry.text]))

const MIN_HEIGHT_COLUMN: keyof TaskGroup & string = 'minHeightPx'

const READOUT_PX_SLOT = '{px}'

/** @purity pure */
function taskGroupMinHeightWord(part: string, language: DisplayLanguage): string {
  return TASK_GROUP_MIN_HEIGHT_WORDS.get(part)?.[language] ?? NO_ENTRY_WORDS
}

// see MH-3, MH-6
/** @purity pure */
function minHeightReadoutOf(taskGroupId: string, placedTaskGroups: readonly TaskGroupPlacement[], language: DisplayLanguage): string {
  const placed = placedTaskGroups.find((taskGroup) => taskGroup.taskGroupId === taskGroupId)
  if (placed === undefined) return taskGroupMinHeightWord('currentlyHidden', language)
  return taskGroupMinHeightWord('currentValue', language).replace(READOUT_PX_SLOT, String(Math.round(placed.height)))
}

// see T-338, MH-1, MH-2, MH-3, FR-006
// WHY: the readout row's own text stays empty: the panel key leaves out readout alone (MH-4), so a zoom step rebuilds nothing.
/** @purity pure */
function minHeightFields(
  field: PropertyField,
  taskGroupId: string,
  placedTaskGroups: readonly TaskGroupPlacement[],
  language: DisplayLanguage,
): readonly PropertyField[] {
  const value = field.controls.find((control) => control.key.column === MIN_HEIGHT_COLUMN)
  if (value === undefined) return [field]
  const isSet = value.text !== ''
  const check: PropertyControl = { ...value, kind: 'boolean', text: String(isSet), choices: null, min: null, max: null, widthInFontSizes: NO_ROOM_FLOOR }
  const hint = taskGroupMinHeightWord('basisHint', language)
  return [
    { row: MIN_HEIGHT_CHECK_TASK_GROUP, name: taskGroupMinHeightWord('enable', language), text: String(isSet), isEditable: field.isEditable, controls: [check] },
    { ...field, unit: taskGroupMinHeightWord('unit', language), controls: [{ ...value, hint, ...(isSet ? {} : { isDisabled: true as const }) }] },
    { row: MIN_HEIGHT_READOUT_TASK_GROUP, name: taskGroupMinHeightWord('currentName', language), text: '', isEditable: false, controls: [], readout: minHeightReadoutOf(taskGroupId, placedTaskGroups, language) },
  ]
}

const MIN_HEIGHT_CHECK_TASK_GROUP = 'MH-2'

const MIN_HEIGHT_READOUT_TASK_GROUP = 'MH-3'

// see FR-042, FR-058
// WHY: the name field shows the name the panel shows (FR-058), so a derived name is not an empty field (DFC-3320).
/** @purity pure */
function groupFields(
  schedule: Schedule,
  group: TaskGroup,
  labelCoef: number,
  language: DisplayLanguage,
  placedTaskGroups: readonly TaskGroupPlacement[],
): readonly PropertyField[] {
  const keyOf = (column: keyof TaskGroup & string): PropertyFieldKey => ({
    holder: 'taskGroup',
    taskGroupId: group.id,
    column,
  })
  const held = { ...group, name: taskGroupNameOf(schedule, group.id) }
  const rows = { items: GROUP_ITEMS, held, keyOf, entity: 'TaskGroup', rowOf: declaredRowOf } as const
  return objectFields(rows, labelCoef, language).flatMap((field) =>
    minHeightFields(field, group.id, placedTaskGroups, language),
  )
}

/** @purity pure */
function onlyTaskGroupId(taskGroupIds: readonly string[]): string | null {
  const [only] = taskGroupIds
  if (taskGroupIds.length === 1 && only !== undefined) return only
  return null
}

// see FR-006, FR-042, FR-072, FR-085
// WHY: one subject's fields only (FR-006 MUST NOT): a picked item's, else the one picked task group's.
/** @purity pure */
function fieldsOfSubject(
  schedule: Schedule,
  subject: PropertiesSubject,
  labelCoef: number,
  language: DisplayLanguage,
  placedTaskGroups: readonly TaskGroupPlacement[],
  inTime: InstantOnSide | null,
): readonly PropertyField[] | null {
  const item = subjectOf(subject.selection)
  if (item !== null) return fieldsOfItem(schedule, item, labelCoef, language, inTime)

  const taskGroupId = onlyTaskGroupId(subject.taskGroupIds)
  if (taskGroupId === null) return []

  const group = schedule.taskGroups.find((held) => held.id === taskGroupId)
  if (group === undefined) return null
  return groupFields(schedule, group, labelCoef, language, placedTaskGroups)
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
// WHY: the swatches gray with the rest under monochrome (JDG-1244 6): the author picks by the gray each hue becomes.
/** @purity pure */
function themeHueField(hue: number, dark: boolean, monochrome: boolean, language: DisplayLanguage): PropertyField {
  const words = themeHueRoster.map((one) => THEME_HUE_WORDS.get(one.rowId)?.[language] ?? '')
  const chosen = themeHueRoster.findIndex((one) => one.hue === hue)
  const text = String(hue)
  return {
    row: settingsWordOf(THEME_HUE_KEY.column)?.rowId ?? THEME_HUE_KEY.column,
    ...settingsNamed(THEME_HUE_KEY.column, language),
    text: words[chosen] ?? text,
    isEditable: true,
    controls: [
      {
        key: THEME_HUE_KEY,
        kind: 'choice',
        text,
        choices: words,
        choiceValues: themeHueRoster.map((one) => String(one.hue)),
        swatches: themeHueRoster.map((one) => colorOf(THEME_HUE_SWATCH_ROW, one.hue, dark, monochrome)),
        min: null,
        max: null,
        widthInFontSizes: widthOf(text, words, SETTINGS_CONSTANTS.labelCoef),
      },
    ],
  }
}

const PARENT_TASK_PROGRESS_TOLERANCE_KEY = { holder: 'project', column: 'parentTaskProgressToleranceDays' } as const

const WORKING_DAYS_UNIT_PART = 'workingDaysUnit'

// see FR-131, K-140, CM-87, S-487
// WHY: no floor here: CM-87 alone refuses a value below S-487's bound and says so, so the range lives once.
/** @purity pure */
function parentTaskProgressToleranceField(workingDays: number, language: DisplayLanguage): PropertyField {
  const column = PARENT_TASK_PROGRESS_TOLERANCE_KEY.column
  const text = String(workingDays)
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    ...settingsNamed(column, language),
    text,
    isEditable: true,
    unit: PROPERTY_FIELD_WORDS.get(WORKING_DAYS_UNIT_PART)?.[language] ?? NO_ENTRY_WORDS,
    controls: [settingsControl(PARENT_TASK_PROGRESS_TOLERANCE_KEY, 'number', text, widthOf(text, null, SETTINGS_CONSTANTS.labelCoef))],
  }
}

const FIT_SPAN_COLUMNS = ['fitSpanStart', 'fitSpanFinish'] as const

const DISABLED_UNLESS_FIXED = { isDisabled: true } as const

// see T-369, FR-072
// WHY: the settings face's controls take no choices and no bounds (a bound lives once, in its command).
/** @purity pure */
function settingsControl(
  key: PropertyFieldKey,
  kind: PropertyControl['kind'],
  text: string,
  widthInFontSizes: number,
): PropertyControl {
  return { key, kind, text, choices: null, min: null, max: null, widthInFontSizes }
}

// see FX-5, K-141, CM-88, CM-89
// WHY: one line, two date entrances, written only while the span is fixed; the read-only rows leave these keys out.
/** @purity pure */
function fitSpanField(settings: DocumentSettings, language: DisplayLanguage): PropertyField {
  const [startColumn] = FIT_SPAN_COLUMNS
  const texts = FIT_SPAN_COLUMNS.map((column) => textOfDateColumn(settings[column]))
  return {
    row: settingsWordOf(startColumn)?.rowId ?? startColumn,
    ...settingsNamed(startColumn, language),
    text: texts.filter((one) => one !== '').join(PART_SEPARATOR),
    isEditable: true,
    isSettledAsOne: true,
    controls: FIT_SPAN_COLUMNS.map((column, at) => {
      const text = texts[at] ?? ''
      return {
        ...settingsControl({ holder: 'documentSettings', column }, 'date', text, dateEntryWidthOf(false)),
        ...(settings.isFitSpanFixed ? {} : DISABLED_UNLESS_FIXED),
      }
    }),
  }
}

type CheckColumn = 'isFitSpanFixed' | 'isTaskGroupPanelWidthFixed' | 'isTimeOfDayVisible'

// see FX-4, WF-1, K-142, K-143, CM-90, CM-91, FO-13, K-146
/** @purity pure */
function checkField(settings: DocumentSettings, column: CheckColumn, language: DisplayLanguage): PropertyField {
  const text = String(settings[column])
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    ...settingsNamed(column, language),
    text,
    isEditable: true,
    controls: [settingsControl({ holder: 'documentSettings', column }, 'boolean', text, NO_ROOM_FLOOR)],
  }
}

const FIT_SPAN_WORDS = new Map(displayWords.fitSpanField.map((entry) => [entry.part, entry.text]))

const TASK_GROUP_TITLE_WIDTH_WORDS = new Map(displayWords.taskGroupPanelWidthField.map((entry) => [entry.part, entry.text]))

const SHOWN_SPAN_TASK_GROUP = 'FX-6'

const DRAWN_WIDTH_TASK_GROUP = 'WF-3'

const SPAN_SLOTS = { start: '{start}', finish: '{finish}' } as const

/** @purity pure */
function fieldWord(words: ReadonlyMap<string, { readonly ja: string; readonly en: string }>, part: string, language: DisplayLanguage): string {
  return words.get(part)?.[language] ?? NO_ENTRY_WORDS
}

// see FX-6, FX-8
/** @purity pure */
function shownSpanReadoutOf(readings: ScreenViewReadings, language: DisplayLanguage): string {
  const shown = readings.shownSpan ?? null
  if (shown === null) return ''
  return fieldWord(FIT_SPAN_WORDS, 'currentValue', language)
    .replace(SPAN_SLOTS.start, dateText(shown.start))
    .replace(SPAN_SLOTS.finish, dateText(shown.finish))
}

// see FX-6, FX-7
// WHY: one field holds the read-out and the copy entrance under it (FX-7: no rule between them).
/** @purity pure */
function shownSpanField(settings: DocumentSettings, readings: ScreenViewReadings, language: DisplayLanguage): PropertyField {
  const word = fieldWord(FIT_SPAN_WORDS, 'copyCurrent', language)
  return {
    row: SHOWN_SPAN_TASK_GROUP,
    ...partNamed(displayWords.fitSpanField, 'currentName', language),
    text: '',
    isEditable: false,
    readout: shownSpanReadoutOf(readings, language),
    controls: [
      {
        ...settingsControl({ holder: 'documentSettings', column: 'fitSpanStart' }, 'text', FIT_SPAN_COPY_TEXT, widthOf(word, null, SETTINGS_CONSTANTS.labelCoef)),
        press: word,
        ...(settings.isFitSpanFixed ? {} : DISABLED_UNLESS_FIXED),
      },
    ],
  }
}

// see WF-2, K-71, CM-67, S-79
/** @purity pure */
function taskGroupPanelWidthField(settings: DocumentSettings, language: DisplayLanguage): PropertyField {
  const column = 'taskGroupPanelWidthPx'
  const text = String(Math.round(settings.taskGroupPanelWidthPx))
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    ...settingsNamed(column, language),
    text,
    isEditable: true,
    unit: fieldWord(TASK_GROUP_TITLE_WIDTH_WORDS, 'unit', language),
    controls: [
      {
        ...settingsControl({ holder: 'documentSettings', column }, 'number', text, widthOf(text, null, SETTINGS_CONSTANTS.labelCoef)),
        ...(settings.isTaskGroupPanelWidthFixed ? {} : DISABLED_UNLESS_FIXED),
      },
    ],
  }
}

// see WF-3
/** @purity pure */
function drawnWidthField(readings: ScreenViewReadings, language: DisplayLanguage): PropertyField {
  const drawn = readings.taskGroupPanelDrawnWidth
  const readout =
    drawn === undefined
      ? ''
      : fieldWord(TASK_GROUP_TITLE_WIDTH_WORDS, 'currentValue', language).replace(READOUT_PX_SLOT, String(Math.round(drawn)))
  return {
    row: DRAWN_WIDTH_TASK_GROUP,
    ...partNamed(displayWords.taskGroupPanelWidthField, 'currentName', language),
    text: '',
    isEditable: false,
    controls: [],
    readout,
  }
}

const STATUS_DATE_KEY = { holder: 'project', column: 'statusDate' } as const

const STATUS_DATE_ENTRY: IconId = 'IC-44'

// see FR-046, IC-44, CM-3, CM-4
// WHY: named by IC-44's own words (FR-046), so the field and the palette entry say the same thing.
/** @purity pure */
function statusDateField(statusDate: string | null, language: DisplayLanguage): PropertyField {
  const text = textOfDateColumn(statusDate)
  return {
    row: STATUS_DATE_ENTRY,
    name: iconLabel(STATUS_DATE_ENTRY, language),
    text,
    isEditable: true,
    controls: [settingsControl(STATUS_DATE_KEY, 'date', text, dateEntryWidthOf(false))],
  }
}

type SteppedSetting = 'displayScale' | 'fontSizeStep'

// see FR-039, S-234, S-70, K-125, K-85
// WHY: the steps are the type column's own order (S-234, S-70), so the field lists them as the palette entries step through them.
const SETTING_STEPS: Readonly<Record<SteppedSetting, readonly string[]>> = {
  displayScale: DISPLAY_SCALE_STEPS.map(String),
  fontSizeStep: Object.keys(SETTINGS_CONSTANTS.fontSizeStepSizes),
}

// see FR-039, CM-74, CM-62
/** @purity pure */
function steppedSettingField(settings: DocumentSettings, column: SteppedSetting, language: DisplayLanguage): PropertyField {
  const text = textOfValue(settings[column])
  const steps = SETTING_STEPS[column]
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    ...settingsNamed(column, language),
    text,
    isEditable: true,
    controls: [
      {
        key: { holder: 'documentSettings', column },
        kind: 'choice',
        text,
        choices: steps,
        min: null,
        max: null,
        widthInFontSizes: widthOf(text, steps, SETTINGS_CONSTANTS.labelCoef),
      },
    ],
  }
}

const TIME_ZONE_KEYS = TIME_ZONE_ROWS.map((row) => row.key)

// see FR-156, AT-157, S-574
const STANDARD_TIME_ZONE_KEYS = TIME_ZONE_ROWS.filter((row) => !row.isDaylight).map((row) => row.key)

const VIEW_TIME_ZONE_KEY = { holder: 'documentSettings', column: 'viewTimeZone' } as const

const DISPLAY_TIME_ZONES_KEY = { holder: 'documentSettings', column: 'displayTimeZones' } as const

const TIME_SHIFT_KEY = { holder: 'timeShift', column: 'minutes' } as const

const TIME_SHIFT_ENTRY_KEY = { holder: 'timeShift', column: 'entry' } as const

// WHY: the read-out is drawn pre-line (MH-3), so a line break starts the example on its own line.
const READOUT_LINE_BREAK = '\n'

/** @purity pure */
function readoutLines(lines: readonly string[]): string {
  return lines.filter((line) => line !== '').join(READOUT_LINE_BREAK)
}

// see FR-029
const DISABLED_ENTRY = { isDisabled: true } as const

const CHOSEN_REGION_KEY = { holder: 'baseTimeZoneDraft', column: 'chosenRegion' } as const

type BaseChangeWay = 'keepGlobalTime' | 'keepLocalTime'

// see FR-156, FO-14
const BASE_CHANGE_HINTS: Readonly<Record<BaseChangeWay, string>> = {
  keepGlobalTime: 'keepGlobalTimeHint',
  keepLocalTime: 'keepLocalTimeHint',
}

const BASE_CHANGE_WAYS: readonly BaseChangeWay[] = ['keepGlobalTime', 'keepLocalTime']

const BASE_CHANGE_CANCEL_KEY = { holder: 'baseTimeZoneDraft', column: 'cancel' } as const

// see FR-156, S-575
const DISPLAY_TIME_ZONE_SLOTS = [0, 1, 2, 3] as const

const DISPLAY_TIME_ZONE_ROW_SEPARATOR = ':'

// see FO-14, FO-15, T-376
/** @purity pure */
function timeZoneChoiceLines(keys: readonly string[], language: DisplayLanguage): readonly (readonly [string, string])[] {
  return keys.map((key) => timeZoneLinesOf(key, language))
}

// see FO-14, FO-15, FR-006, S-171, JDG-2541
// WHY: the room is the widest first line; a place too long for the field wraps inside it (JDG-2541), so the
// longest English place does not set the panel's width. The one-line name joins them for a reader of `choices`.
/** @purity pure */
function twoLineChoice(lines: readonly (readonly [string, string])[], leading: readonly string[]): {
  readonly choices: readonly string[]
  readonly choiceLines: readonly (readonly [string, string])[]
  readonly widthInFontSizes: number
} {
  const choiceLines = [...leading.map((word): readonly [string, string] => [word, '']), ...lines]
  return {
    choices: choiceLines.map(([head, place]) => (place === '' ? head : `${head} ${place}`)),
    choiceLines,
    widthInFontSizes: widthOf('', choiceLines.map(([head]) => head), SETTINGS_CONSTANTS.labelCoef),
  }
}

// see FO-14, FR-156, T-280
/** @purity pure */
function draftedBaseOf(screen: ScreenSession['screen']): string | null {
  const state = screen.baseTimeZoneDraftState
  return state.kind === 'drafted' ? state.chosenRegion : null
}

// see TX-11, FR-156, T-376
/** @purity pure */
function changeDateTimeOf(instant: number, key: string, language: DisplayLanguage): string {
  const day = dayOf(textOfInstant(instant))
  return day === null ? '' : `${planDateText(day, false)} ${clockTextOf(instant)} ${timeZoneAbbreviationOf(key, language)}`
}

// see FR-156, CM-94, CM-95
/** @purity pure */
function answeredReaderOf(schedule: Schedule, chosen: string, way: BaseChangeWay): InstantOnSide {
  if (way === 'keepGlobalTime') return shownInstantReader(schedule, chosen)
  const moved: Schedule = { ...schedule, project: { ...schedule.project, scheduleDataTimeZone: chosen } }
  return shownInstantReader(moved, null)
}

// see FO-14, FR-156, TX-11
// WHY: the first task with a start, read now and after the answer, each with its zone's abbreviation; none, no lines.
/** @purity pure */
function beforeAfterLines(
  schedule: Schedule,
  shownBase: string,
  chosen: string,
  way: BaseChangeWay,
  language: DisplayLanguage,
): string {
  const first = schedule.tasks.find((one) => one.start !== null)
  if (first === undefined) return ''
  const side = startSideOf(first)
  const before = shownInstantReader(schedule, shownBase)(first.start, side)
  const after = answeredReaderOf(schedule, chosen, way)(first.start, side)
  if (before === null || after === null) return ''
  return readoutLines([
    timeZoneFieldWord('beforeLine', language).replace('{time}', changeDateTimeOf(before, shownBase, language)),
    timeZoneFieldWord('afterLine', language).replace('{time}', changeDateTimeOf(after, chosen, language)),
  ])
}

// see FO-14, FR-156
/** @purity pure */
function wordsLine(words: string): PropertyControl {
  return { ...settingsControl(CHOSEN_REGION_KEY, 'text', '', 0), words, isOwnLine: true }
}

// see FO-14, FR-156
/** @purity pure */
function answerControl(key: PropertyFieldKey, word: string, hint: string | null): PropertyControl {
  return {
    ...settingsControl(key, 'text', '', widthOf(word, null, SETTINGS_CONSTANTS.labelCoef)),
    press: word,
    isOwnLine: true,
    ...(hint === null ? {} : { hint }),
  }
}

// see FO-14, FR-156, TX-11, T-280
// WHY: shown only while a draft holds another time zone; the two that write carry their before / after lines.
/** @purity pure */
function baseChangeAnswers(schedule: Schedule, shownBase: string, chosen: string, language: DisplayLanguage): readonly PropertyControl[] {
  const answers = BASE_CHANGE_WAYS.flatMap((way) => {
    const lines = beforeAfterLines(schedule, shownBase, chosen, way, language)
    const key = { holder: 'baseTimeZoneDraft', column: way } as const
    const answer = answerControl(key, timeZoneFieldWord(way, language), timeZoneFieldWord(BASE_CHANGE_HINTS[way], language))
    return lines === '' ? [answer] : [answer, wordsLine(lines)]
  })
  return [
    wordsLine(timeZoneFieldWord('baseChangeQuestion', language)),
    ...answers,
    answerControl(BASE_CHANGE_CANCEL_KEY, timeZoneFieldWord('cancelBaseChange', language), null),
  ]
}

// see FO-14, FR-156, K-144, T-280
/** @purity pure */
function baseTimeZoneField(
  schedule: Schedule,
  settings: DocumentSettings,
  screen: ScreenSession['screen'],
  language: DisplayLanguage,
): PropertyField {
  const column = VIEW_TIME_ZONE_KEY.column
  const shownBase = viewRegionOf(schedule.project.scheduleDataTimeZone, settings.viewTimeZone)
  const drafted = draftedBaseOf(screen)
  const listed = twoLineChoice(timeZoneChoiceLines(STANDARD_TIME_ZONE_KEYS, language), [])
  const chooser = {
    ...settingsControl(CHOSEN_REGION_KEY, 'choice', drafted ?? shownBase, listed.widthInFontSizes),
    choices: listed.choices,
    choiceLines: listed.choiceLines,
    choiceValues: STANDARD_TIME_ZONE_KEYS,
  }
  return {
    row: settingsWordOf(column)?.rowId ?? column,
    ...settingsNamed(column, language),
    text: '',
    isEditable: true,
    controls: drafted === null ? [chooser] : [chooser, ...baseChangeAnswers(schedule, shownBase, drafted, language)],
  }
}

// see FO-15, FR-156, K-145, CM-96, S-575
/** @purity pure */
function displayTimeZonesFields(settings: DocumentSettings, language: DisplayLanguage): readonly PropertyField[] {
  const column = DISPLAY_TIME_ZONES_KEY.column
  const listed = twoLineChoice(timeZoneChoiceLines(TIME_ZONE_KEYS, language), [timeZoneFieldWord('none', language)])
  const row = settingsWordOf(column)?.rowId ?? column
  const named = settingsNamed(column, language)
  return DISPLAY_TIME_ZONE_SLOTS.map((slot) => {
    const of = (key: string): string => `${slot}${DISPLAY_TIME_ZONE_SLOT_SEPARATOR}${key}`
    const number = String(slot + 1)
    const numbered = (word: string): string => `${word} ${number}`
    const segments = named.nameBreakSegments
    return {
      row: `${row}${DISPLAY_TIME_ZONE_ROW_SEPARATOR}${number}`,
      ...namedField(numbered(named.name), segments === undefined ? undefined : [...segments.slice(0, -1), numbered(segments.at(-1) ?? '')]),
      text: settings.displayTimeZones[slot] ?? '',
      isEditable: true,
      controls: [{
        ...settingsControl(DISPLAY_TIME_ZONES_KEY, 'choice', of(settings.displayTimeZones[slot] ?? ''), listed.widthInFontSizes),
        choices: listed.choices,
        choiceLines: listed.choiceLines,
        choiceValues: [of(''), ...TIME_ZONE_KEYS.map(of)],
      }],
    }
  })
}

// see FO-16, FR-157, IC-162, CM-98, T-280
// WHY: settling the amount only holds it (timeShiftDraftStateMachine); IC-162 asks QN-14 and is dim while no amount is held.
/** @purity pure */
function timeShiftField(screen: ScreenSession['screen'], language: DisplayLanguage): PropertyField {
  const unit = timeZoneFieldWord('shiftUnit', language)
  const held = screen.timeShiftDraftState
  const amount = held.kind === 'amountHeld' ? shiftAmountText(held.shiftMinutes) : ''
  const entryWord = iconLabel(TIME_SHIFT_ENTRY, language)
  return {
    row: TIME_SHIFT_ENTRY,
    name: entryWord,
    text: '',
    isEditable: true,
    unit,
    controls: [
      { ...settingsControl(TIME_SHIFT_KEY, 'text', amount, widthOf(unit, null, SETTINGS_CONSTANTS.labelCoef)), hint: iconHint(TIME_SHIFT_ENTRY, language) },
      {
        ...settingsControl(TIME_SHIFT_ENTRY_KEY, 'text', '', widthOf(entryWord, null, SETTINGS_CONSTANTS.labelCoef)),
        press: entryWord,
        hint: iconHint(TIME_SHIFT_ENTRY, language),
        ...(held.kind === 'amountHeld' ? {} : DISABLED_ENTRY),
      },
    ],
  }
}

const WHOLE_SCHEDULE_SHIFT_ROW = 'FO-17'

const WHOLE_SCHEDULE_SHIFT_DATE_KEY = { holder: 'wholeScheduleShift', column: 'newStartDate' } as const

const WHOLE_SCHEDULE_SHIFT_ENTRY_KEY = { holder: 'wholeScheduleShift', column: 'entry' } as const

// see WH-1
const NO_CURRENT_START = '\u2014'

interface WholeScheduleShiftReadout {
  readonly holidayLine: string
  readonly isIdle: boolean
}

// see WH-2, WH-9, WH-12, TX-12
// TRAP: only the walks' own refusals read as idle; anything else is a fault and is thrown on.
/** @purity pure */
function wholeScheduleShiftReadoutOf(schedule: Schedule, current: CalendarDay | null, typed: string, language: DisplayLanguage): WholeScheduleShiftReadout {
  const day = dayOf(typed)
  if (current === null || day === null) return { holidayLine: '', isIdle: true }
  try {
    const shift = workingDayShiftOf(workingCalendarOf(schedule), current, day)
    const holidayLine = shift.isNewStartNonWorking
      ? wholeScheduleShiftFieldWord('holidayStartLine', language).replace('{typed}', dateText(typed)).replace('{start}', dateText(textOfDay(shift.toZero)))
      : ''
    return { holidayLine, isIdle: shift.workingDays === 0 }
  } catch (error) {
    if (error instanceof NoWorkingDayReached || error instanceof DaySpanTooWide) return { holidayLine: '', isIdle: true }
    throw error
  }
}

// see FO-17, FR-159, WH-1, WH-2, WH-12, T-280
// WHY: settling the date only holds it (wholeScheduleShiftDraftStateMachine); the text-only Apply button carries no hint (WH-12).
/** @purity pure */
function wholeScheduleShiftField(schedule: Schedule, screen: ScreenSession['screen'], language: DisplayLanguage): PropertyField {
  const held = screen.wholeScheduleShiftDraftState
  const typed = held.kind === 'dateHeld' ? held.newStartDate : ''
  const current = earliestPlanStartDayOf(schedule.tasks)
  const readout = wholeScheduleShiftReadoutOf(schedule, current, typed, language)
  const currentLine = wholeScheduleShiftFieldWord('currentStart', language).replace('{date}', current === null ? NO_CURRENT_START : dateText(textOfDay(current)))
  const unit = wholeScheduleShiftFieldWord('newStartUnit', language)
  const apply = wholeScheduleShiftFieldWord('apply', language)
  return {
    row: WHOLE_SCHEDULE_SHIFT_ROW,
    ...partNamed(displayWords.wholeScheduleShiftField, 'name', language),
    text: '',
    isEditable: true,
    unit,
    readout: readoutLines([currentLine, readout.holidayLine]),
    controls: [
      settingsControl(WHOLE_SCHEDULE_SHIFT_DATE_KEY, 'date', typed, dateEntryWidthOf(false)),
      {
        ...settingsControl(WHOLE_SCHEDULE_SHIFT_ENTRY_KEY, 'text', '', widthOf(apply, null, SETTINGS_CONSTANTS.labelCoef)),
        press: apply,
        ...(readout.isIdle ? DISABLED_ENTRY : {}),
      },
    ],
  }
}

const READ_ONLY_WORDS = new Map(displayWords.readOnlySettings.map((entry) => [entry.part, entry.text]))

const SURFACE_WORDS = new Map(displayWords.surfaces.map((entry) => [entry.name, entry.heading]))

const TABLE_COLUMN_WORDS = new Map(
  [...displayWords.searchColumns, ...displayWords.resourceListColumns, ...displayWords.delayReportColumns].map((entry) => [entry.rowId, entry.text]),
)

// see T-380
/** @purity pure */
function readOnlyWord(part: string, language: DisplayLanguage): string {
  return READ_ONLY_WORDS.get(part)?.[language] ?? NO_ENTRY_WORDS
}

type ReadOnlyShape =
  | 'visible'
  | 'overlaid'
  | 'monochrome'
  | 'filter'
  | 'percent'
  | 'leftEdge'
  | 'topEdge'
  | 'count'
  | 'columns'
  | 'treeState'
  | 'pixels'
  | 'stack'
  | 'sort'

interface ReadOnlyRow {
  readonly key: string
  readonly shape: ReadOnlyShape
  readonly namePart?: string
}

interface ReadOnlyGroupRows {
  readonly group: string
  readonly section?: string
  readonly rows: readonly ReadOnlyRow[]
}

/** @purity pure */
function shaped(shape: ReadOnlyShape): (key: string) => ReadOnlyRow {
  return (key) => ({ key, shape })
}

const visibleRow = shaped('visible')

/** @purity pure */
function tableViewRows(table: string, checked: { readonly key: string; readonly namePart: string }, extra: readonly ReadOnlyRow[]): readonly ReadOnlyRow[] {
  const at = (key: string): string => `tableViews.${table}.${key}`
  return [
    { key: at('isScheduleFilterApplied'), shape: 'filter', namePart: 'scheduleFilter' },
    { key: at(checked.key), shape: 'count', namePart: checked.namePart },
    ...extra.map((row) => ({ ...row, key: at(row.key) })),
    { key: at('columnFilters'), shape: 'columns', namePart: 'columnFilters' },
    { key: at('sort'), shape: 'sort', namePart: 'sortOrder' },
  ]
}

const SHOWN_TASKS = { key: 'shownTaskUids', namePart: 'shownTasks' } as const

// see T-380, RN-1, RN-2, RN-3, RN-4, RN-5, RN-6, RN-7, RN-8, JDG-2103
const READ_ONLY_GROUPS: readonly ReadOnlyGroupRows[] = [
  {
    group: 'groupShowHide',
    rows: [
      ...['isPlanVisible', 'isActualVisible', 'isProgressMarkerVisible', 'isDependencyVisible', 'isProgressLineVisible'].map(visibleRow),
      { key: 'isBaselineVisible', shape: 'overlaid' },
    ],
  },
  { group: 'groupLabels', rows: ['isAssigneeVisible', 'isPercentCompleteVisible', 'isPlanDatesVisible'].map(visibleRow) },
  {
    group: 'groupView',
    rows: [
      ...['zoomX', 'zoomY'].map(shaped('percent')),
      // WHY: one row each, the date with its place in the day and the task group with its place in it (JDG-2469).
      { key: 'scrollDate', shape: 'leftEdge', namePart: 'viewLeftEdge' },
      { key: 'scrollTaskGroupId', shape: 'topEdge', namePart: 'viewTopEdge' },
      { key: 'pinnedTaskGroupIds', shape: 'count' },
      { key: 'levelZeroTreeState', shape: 'treeState' },
    ],
  },
  {
    group: 'groupGridLinesAndColor',
    rows: [...['isDateGridLinesVisible', 'isGroupGridLinesVisible'].map(visibleRow), { key: 'isThemeMonochrome', shape: 'monochrome' }],
  },
  { group: 'groupRulerAndStack', rows: [...['rulerFontSizePx', 'rulerHeightPx'].map(shaped('pixels')), { key: 'stackDirection', shape: 'stack' }] },
  { group: 'groupTableViews', section: 'Search Panel', rows: tableViewRows('searchPanel', SHOWN_TASKS, []) },
  {
    group: 'groupTableViews',
    section: 'Resource List',
    rows: tableViewRows('resourceList', { key: 'shownResourceUids', namePart: 'shownResources' }, [
      { key: 'isUnassignedShown', shape: 'visible', namePart: 'unassignedRow' },
    ]),
  },
  { group: 'groupTableViews', section: 'Delay Diagnostics Report', rows: tableViewRows('delayDiagnosticsReport', SHOWN_TASKS, []) },
]

const PERCENT_SCALE = 100

const PERCENT_SLOT = '{percent}'

const NAME_OF_GROUP_SLOT = '{name}'

const COLUMN_SLOT = '{column}'

const CLOCK_DIGITS = 2

/** @purity pure */
function counted(part: string, n: number, language: DisplayLanguage): string {
  return readOnlyWord(part, language).replace(COUNT_SLOT, String(n))
}

/** @purity pure */
function percentText(ratio: number, language: DisplayLanguage): string {
  return counted('percent', Math.round(ratio * PERCENT_SCALE), language)
}

/** @purity pure */
function clockOfDay(ratio: number): string {
  const minutes = Math.round(ratio * MINUTES_PER_ELAPSED_DAY)
  const pad = (n: number): string => String(n).padStart(CLOCK_DIGITS, '0')
  return `${pad(Math.floor(minutes / MINUTES_PER_HOUR))}:${pad(minutes % MINUTES_PER_HOUR)}`
}

/** @purity pure */
function lengthOf(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

/** @purity pure */
function sortText(value: unknown, language: DisplayLanguage): string {
  if (value === null || typeof value !== 'object') return readOnlyWord('defaultOrder', language)
  const sort = value as { readonly column: string; readonly direction: string }
  const column = TABLE_COLUMN_WORDS.get(sort.column)?.[language] ?? sort.column
  return readOnlyWord(sort.direction === 'descending' ? 'sortDescending' : 'sortAscending', language).replace(COLUMN_SLOT, column)
}

type ReadOnlyFormat = (value: unknown, schedule: Schedule, language: DisplayLanguage, settings: DocumentSettings) => string

// see RN-3, JDG-2469
/** @purity pure */
function leftEdgeText(settings: DocumentSettings, language: DisplayLanguage): string {
  const day = dateText(settings.scrollDate)
  return day === '' ? readOnlyWord('notSet', language) : `${day} ${clockOfDay(settings.scrollDateFraction)}`
}

// see RN-3, JDG-2469
/** @purity pure */
function topEdgeText(settings: DocumentSettings, schedule: Schedule, language: DisplayLanguage): string {
  const group = schedule.taskGroups.find((one) => one.id === settings.scrollTaskGroupId)
  if (group === undefined) return readOnlyWord('notSetFromTop', language)
  return readOnlyWord('groupFromTop', language)
    .replace(NAME_OF_GROUP_SLOT, () => taskGroupNameOf(schedule, group.id))
    .replace(PERCENT_SLOT, percentText(settings.scrollTaskGroupFraction, language))
}

/** @purity pure */
function either(onTrue: string, onFalse: string): ReadOnlyFormat {
  return (value, _schedule, language) => readOnlyWord(value === true ? onTrue : onFalse, language)
}

/** @purity pure */
function countOrNone(part: string): ReadOnlyFormat {
  return (value, _schedule, language) => (lengthOf(value) === 0 ? readOnlyWord('none', language) : counted(part, lengthOf(value), language))
}

// see T-380, RN-3, RN-6
// WHY: one formatter per value shape, so no stored spelling (true, auto, a ratio, a T00:00:00) reaches the row.
const READ_ONLY_FORMATS: Readonly<Record<ReadOnlyShape, ReadOnlyFormat>> = {
  visible: either('shown', 'hidden'),
  overlaid: either('overlaid', 'notOverlaid'),
  monochrome: either('monochrome', 'color'),
  filter: either('filterOn', 'filterOff'),
  percent: (value, _schedule, language) => percentText(Number(value), language),
  leftEdge: (_value, _schedule, language, settings) => leftEdgeText(settings, language),
  topEdge: (_value, schedule, language, settings) => topEdgeText(settings, schedule, language),
  count: countOrNone('itemCount'),
  columns: (value, schedule, language, settings) =>
    countOrNone(lengthOf(value) === 1 ? 'columnCountOne' : 'columnCount')(value, schedule, language, settings),
  treeState: (value, _schedule, language) => readOnlyWord(value === 'collapsed' ? 'collapsed' : 'expandedAuto', language),
  pixels: (value, _schedule, language) => counted('pixels', Number(value), language),
  stack: (value, _schedule, language) => readOnlyWord(value === 'down' ? 'stackDown' : 'stackUp', language),
  sort: (value, _schedule, language) => sortText(value, language),
}

// see FR-072, T-369, T-380, JDG-2103
/** @purity pure */
function readOnlySettingsFields(settings: DocumentSettings, schedule: Schedule, language: DisplayLanguage): readonly PropertyField[] {
  return READ_ONLY_GROUPS.flatMap((group) => {
    const section = group.section === undefined ? {} : { section: SURFACE_WORDS.get(group.section)?.[language] ?? group.section }
    const readOnlyGroup: PropertyFieldGroup = { key: group.group, name: readOnlyWord(group.group, language), ...section }
    return group.rows.map((row) => ({
      row: settingsWordOf(row.key)?.rowId ?? row.key,
      ...(row.namePart === undefined ? settingsNamed(row.key, language) : partNamed(displayWords.readOnlySettings, row.namePart, language)),
      text: READ_ONLY_FORMATS[row.shape](valueAt(settings, row.key), schedule, language, settings),
      isEditable: false,
      controls: [],
      readOnlyGroup,
    }))
  })
}

// see IC-17, T-104, FR-072, T-369, FO-1, FO-12
/** @purity pure */
function settingsFields(
  settings: DocumentSettings,
  schedule: Schedule,
  screen: ScreenSession['screen'],
  language: DisplayLanguage,
  readings: ScreenViewReadings,
): readonly PropertyField[] {
  const dark = screen.themePreference === 'dark'
  const readOnly = readOnlySettingsFields(settings, schedule, language)
  return [
    themeHueField(schedule.project.themeHue, dark, settings.isThemeMonochrome, language),
    steppedSettingField(settings, 'displayScale', language),
    steppedSettingField(settings, 'fontSizeStep', language),
    checkField(settings, 'isTaskGroupPanelWidthFixed', language),
    taskGroupPanelWidthField(settings, language),
    drawnWidthField(readings, language),
    statusDateField(schedule.project.statusDate, language),
    checkField(settings, 'isFitSpanFixed', language),
    fitSpanField(settings, language),
    shownSpanField(settings, readings, language),
    parentTaskProgressToleranceField(schedule.project.parentTaskProgressToleranceDays, language),
    checkField(settings, 'isTimeOfDayVisible', language),
    baseTimeZoneField(schedule, settings, screen, language),
    ...displayTimeZonesFields(settings, language),
    wholeScheduleShiftField(schedule, screen, language),
    timeShiftField(screen, language),
    ...readOnly,
  ]
}

type ColorHolderColumn = keyof TaskVisual | keyof TaskGroup | keyof CommentBox | keyof HighlightBox

// see CV-6, CV-9, FR-019
const COLOR_FORM_OF_COLUMN: Readonly<Partial<Record<ColorHolderColumn, ColorForm>>> = {
  fillColor: 'fill',
  strokeColor: 'outline',
  textColor: 'outline',
  color: 'band',
}

// see CV-9, AT-58, FR-019
/** @purity pure */
function colorChoicesOf(key: PropertyFieldKey): readonly string[] | null {
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

const COLOR_NAME_WORDS = new Map(displayWords.colorNames.map((entry) => [entry.spelling, entry.text]))

const COLOR_FIELD_WORDS = new Map(displayWords.colorField.map((entry) => [entry.part, entry.text]))

interface ColorLook {
  readonly hue: number
  readonly dark: boolean
  readonly monochrome: boolean
  readonly language: DisplayLanguage
}

type ColorForm = Parameters<typeof swatchOf>[1]

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
// WHY: a row follows the theme hue (its hue column is a circle) exactly when its color moves with
// the hue; read through colorOf, the one published reading of table T-236.
const HUES_APART: readonly [number, number] = [0, 180]

/** @purity pure */
function followsThemeHue(rowId: string): boolean {
  const [one, other] = HUES_APART
  return [false, true].some((dark) => colorOf(rowId, one, dark, false) !== colorOf(rowId, other, dark, false))
}

/** @purity pure */
function colorWord(part: string, language: DisplayLanguage): string {
  return COLOR_FIELD_WORDS.get(part)?.[language] ?? ''
}

const VALUE_SLOT = '{value}'

// see CV-9, CV-5, CV-7
/** @purity pure */
function themeEntranceOf(form: ColorForm, nullRow: string | undefined, look: ColorLook): ColorEntrance {
  const isThemeNull = nullRow === undefined || followsThemeHue(nullRow)
  const paint =
    nullRow === undefined
      ? swatchOf(null, form, look.hue, look.dark, look.monochrome).paint
      : colorOf(nullRow, look.hue, look.dark, look.monochrome)
  return {
    glyph: colorWord('themeGlyph', look.language),
    hint: colorWord(isThemeNull ? 'themeHint' : 'defaultColor', look.language),
    paint,
    ink: inkOn(paint),
  }
}

// see CV-9, CV-3, CV-7
// WHY: the tooltip names the value drawn now, not the grayed paint, so monochrome still reads the chosen color.
/** @purity pure */
function customEntranceOf(stored: string | null, form: ColorForm, look: ColorLook): ColorEntrance {
  const glyph = colorWord('customGlyph', look.language)
  if (stored === null || customColorOf(stored) === null) {
    return { glyph, hint: colorWord('custom', look.language), paint: null, ink: '' }
  }
  const paint = swatchOf(stored, form, look.hue, look.dark, look.monochrome).paint
  const value = swatchOf(stored, form, look.hue, look.dark, false).paint.toUpperCase()
  return { glyph, hint: colorWord('customValue', look.language).replace(VALUE_SLOT, () => value), paint, ink: inkOn(paint) }
}

// see CV-9, CV-4, CV-5, CV-7
/** @purity pure */
function withColorField(control: PropertyControl, look: ColorLook): PropertyControl {
  const forms: Readonly<Partial<Record<string, ColorForm>>> = COLOR_FORM_OF_COLUMN
  const form = forms[control.key.column]
  const offered = colorChoicesOf(control.key)
  if (control.kind !== 'color' || form === undefined || offered === null) return control
  const stored = control.text === '' ? null : control.text
  const custom = stored === null ? null : customColorOf(stored)
  const order = displayWords.colorNames.map((entry) => entry.spelling)
  const names = order.filter((name) => offered.includes(name))
  const customWord = colorWord('custom', look.language)
  const nullRow = NULL_ROW_OF_FIELD[`${control.key.holder}.${control.key.column}`]
  const transparentPart = TRANSPARENT_WORD_OF_COLUMN[control.key.column]
  const values = ['', ...names, ...(custom === null || stored === null ? [] : [stored])]
  // WHY: the color input is seeded with a value to choose, not a swatch, so it keeps
  // the hue while monochrome is on; CV-7 grays only what is painted.
  const drawn = swatchOf(stored, form, look.hue, look.dark, false).paint
  const swatches = values.map((value) =>
    swatchOf(value === '' ? null : value, form, look.hue, look.dark, look.monochrome),
  )
  return {
    ...control,
    choices: values.map((value) =>
      value === stored && custom !== null ? customWord : (COLOR_NAME_WORDS.get(value)?.[look.language] ?? ''),
    ),
    choiceValues: values,
    color: {
      swatches: swatches.map((one) => one.paint),
      inks: swatches.map((one) => one.ink),
      customWord,
      customValue: custom !== null ? customSideOf(custom, look.dark) : HEX_PAINT.test(drawn) ? drawn : '',
      names: order.map((name) => ({ name, isOffered: names.includes(name) })),
      theme: themeEntranceOf(form, nullRow, look),
      custom: customEntranceOf(stored, form, look),
      ...(transparentPart === undefined || !names.includes(TRANSPARENT)
        ? {}
        : { transparentWord: colorWord(transparentPart, look.language) }),
      transparentName: TRANSPARENT,
    },
  }
}

// see CV-9, FR-006
/** @purity pure */
function withColorFields(fields: readonly PropertyField[], look: ColorLook): readonly PropertyField[] {
  return fields.map((field) =>
    field.controls.some((one) => one.kind === 'color')
      ? { ...field, controls: field.controls.map((one) => withColorField(one, look)) }
      : field,
  )
}

// see FR-006, PR-5, PR-40, PR-26, PR-23, PR-8, PR-50
// WHY: keyed by column, so a box's outline width takes the same unit as a task's (CR-689 decision 11).
const UNIT_PART_OF_COLUMN: Readonly<Record<string, string>> = {
  strokeWidthPx: 'pxUnit',
  fontSizePx: 'pxUnit',
  actualDuration: 'daysUnit',
}
const HINT_PART_OF_COLUMN: Readonly<Record<string, string>> = { resumeValid: 'resumeValidHint' }

/** @purity pure */
function withFieldWords(fields: readonly PropertyField[], language: DisplayLanguage, isTimeOfDayVisible: boolean): readonly PropertyField[] {
  return fields.map((field) => {
    const column: string = field.controls[0]?.key.column ?? ''
    const unitPart = isTimeOfDayVisible && TYPED_LENGTH_COLUMNS.includes(column) ? undefined : UNIT_PART_OF_COLUMN[column]
    const hintPart = HINT_PART_OF_COLUMN[column]
    // WHY: PR-5 takes the date width even when the time of day drops its unit word (DFC-2870).
    const isActualLength = column === ACTUAL_LENGTH_ITEM
    if (unitPart === undefined && hintPart === undefined && !isActualLength) return field
    const hint = hintPart === undefined ? {} : { hint: PROPERTY_FIELD_WORDS.get(hintPart)?.[language] ?? '' }
    const sized = isActualLength
      ? { isSizedAsDate: true as const, widthInFontSizes: dateEntryWidthOf(isTimeOfDayVisible) }
      : {}
    return {
      ...field,
      ...(unitPart === undefined ? {} : { unit: PROPERTY_FIELD_WORDS.get(unitPart)?.[language] ?? '' }),
      controls: field.controls.map((control) => ({ ...control, ...hint, ...sized })),
    }
  })
}

type PanelSubject = Extract<ScreenSession['screen']['propertiesPanelContentState'], { kind: 'selectionDisplayed' }>['subject']

// see FR-072, U-25
// WHY: a held subject naming task groups alone was a task group pick (FR-072), so the items still selected stay off the panel.
/** @purity pure */
function panelSubjectOf(held: PanelSubject, selection: Selection, selectedTaskGroupIds: readonly string[]): PanelSubject {
  if (selection.items.length === 0 && selectedTaskGroupIds.length === 0) return held
  const isTaskGroupPick = held.selection.items.length === 0 && held.taskGroupIds.length > 0
  return { selection: isTaskGroupPick ? held.selection : selection, taskGroupIds: selectedTaskGroupIds }
}

// see FR-052, S-171, S-602, S-603, S-604, S-605, S-606, JDG-2466
export type PanelFace = 'documentSettings' | 'task' | 'taskGroup' | 'commentBox' | 'highlightBox' | 'dependency'

const FACE_OF_ITEM: Readonly<Record<Selection['items'][number]['kind'], PanelFace | null>> = {
  task: 'task',
  dependency: 'dependency',
  highlightBox: 'highlightBox',
  commentBox: 'commentBox',
  statusLine: null,
  parentTaskLink: null,
}

const PANEL_FACE_ORDER: readonly PanelFace[] = ['task', 'taskGroup', 'commentBox', 'highlightBox', 'dependency']

// see FR-052, JDG-2466
// WHY: the kinds of content the panel shows, each once, in table T-016's order; none while it is hidden.
/** @purity pure */
export function panelFacesOf(
  content: ScreenSession['screen']['propertiesPanelContentState'],
  selection: Selection,
  selectedTaskGroupIds: readonly string[],
): readonly PanelFace[] {
  if (content.kind === 'hidden') return []
  if (content.kind === 'documentSettingsDisplayed') return ['documentSettings']
  const subject = panelSubjectOf(content.subject, selection, selectedTaskGroupIds)
  const shown = new Set<PanelFace>(subject.selection.items.flatMap((item) => FACE_OF_ITEM[item.kind] ?? []))
  if (subject.taskGroupIds.length > 0) shown.add('taskGroup')
  return PANEL_FACE_ORDER.filter((face) => shown.has(face))
}

// see FR-072, U-25, T-280
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
      fields: settingsFields(settings, schedule, session.screen, language, readings),
      commands: panelCommands(language),
      headEntry: commandItemOf(GRS_RESET_ENTRY, language),
      readOnlyHeading: readOnlyWord('heading', language),
    }
  }

  const isNothingPicked = selection.items.length === 0 && readings.selectedTaskGroupIds.length === 0
  const subject = panelSubjectOf(content.subject, selection, readings.selectedTaskGroupIds)
  // WHY: readings with no layout place no task group, so the task group reads as not drawn (MH-6), never as 0 px.
  const placedTaskGroups = readings.placedTaskGroups ?? []
  const inTime = settings.isTimeOfDayVisible ? shownInstantReader(schedule, settings.viewTimeZone) : null
  const described = fieldsOfSubject(schedule, subject, SETTINGS_CONSTANTS.labelCoef, language, placedTaskGroups, inTime)
  const look = {
    hue: schedule.project.themeHue,
    dark,
    monochrome: settings.isThemeMonochrome,
    language,
  }
  const fields = described === null ? null : withFieldWords(withColorFields(described, look), language, settings.isTimeOfDayVisible)

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
//   docs/spec/_source/property-items.json (table T-016)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_PROPERTY_CONTROL_SIZES: {
  readonly 'S-199': number
  readonly 'S-589': number
  readonly 'S-590': number
} = {
  'S-199': 2.19,
  'S-589': 9.5,
  'S-590': 12.5,
}

// see T-217, FR-006, FR-019
const NOT_STORED_ANNOTATION_BOUNDS: {
  readonly 'S-132': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
  readonly 'S-369': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
  readonly 'S-371': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
  readonly 'S-374': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
  readonly 'S-375': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
  readonly 'S-624': { readonly key: string; readonly min: number; readonly max: number; readonly default: number }
} = {
  'S-132': { key: 'cornerRadiusPx', min: 0, max: 24, default: 4 },
  'S-369': { key: 'HighlightBox.strokeWidthPx', min: 1, max: 10, default: 1 },
  'S-371': { key: 'HighlightBox.fillTransparencyPercent', min: 0, max: 100, default: 50 },
  'S-374': { key: 'CommentBox.strokeWidthPx', min: 1, max: 10, default: 1 },
  'S-375': { key: 'CommentBox.fillTransparencyPercent', min: 0, max: 100, default: 0 },
  'S-624': { key: 'CommentBox.fontSizePx', min: 8, max: 24, default: 10 },
}

// see T-016, FR-006
type AppliesTo = 'Task' | 'TaskGroup' | 'CommentBox' | 'HighlightBox' | 'Dependency'

// see T-016, FR-006
type TaskPropertyItemRow =
  | 'PR-1'
  | 'PR-34'
  | 'PR-16'
  | 'PR-3'
  | 'PR-47'
  | 'PR-35'
  | 'PR-4'
  | 'PR-6'
  | 'PR-36'
  | 'PR-5'
  | 'PR-9'
  | 'PR-7'
  | 'PR-8'
  | 'PR-10'
  | 'PR-17'
  | 'PR-14'
  | 'PR-15'
  | 'PR-37'
  | 'PR-38'
  | 'PR-2'
  | 'PR-40'
  | 'PR-39'
  | 'PR-12'
// </generated>

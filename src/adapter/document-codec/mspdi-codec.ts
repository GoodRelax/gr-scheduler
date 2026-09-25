// DocumentCodec, MSPDI half: reads and writes the exchange partner's XML, keeping the round trip.
// @unit      UF-36   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type {
  Assignment,
  Calendar,
  CarryElement,
  Dependency,
  Exception,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  WeekDay,
} from '../../entity/document-model/schedule/schedule'
import {
  DEFAULT_CALENDAR_VALUES,
  actualLastDay,
  actualLengthOf,
  dayOf,
  lastDayForLength,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
} from '../../entity/document-model/schedule/schedule'
import {
  PARENT_ORDERS,
  writtenCarriedElement,
  writtenChildren,
  type ParentPath,
  type PlacedChild,
} from './mspdi-child-placement'
import customFields from './mspdi-custom-fields.json'
import { fault, readXml, writtenXml, type MspdiFault, type XmlElement } from './mspdi-xml'

export type { MspdiFault } from './mspdi-xml'

export interface MspdiNotice {
  readonly at: string
  readonly what: string
}

export type MspdiDecoding =
  | {
      readonly ok: true
      readonly document: Document
      readonly notices: readonly MspdiNotice[]
      // see MR-3, RS-60
      readonly duplicateLeaves: number
    }
  | { readonly ok: false; readonly faults: readonly MspdiFault[] }

export interface MspdiEncoding {
  readonly text: string
  readonly notices: readonly MspdiNotice[]
}

// WHY: the XSD's namespace, not the one in the element reference examples; reading matches local names in any namespace.
export const MSPDI_NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// WHY: element paths, not names; the table keys by path because one name changes shape with its parent.
const PATHS = {
  project: 'Project',
  calendar: 'Project/Calendars/Calendar',
  weekDay: 'Project/Calendars/Calendar/WeekDays/WeekDay',
  exception: 'Project/Calendars/Calendar/Exceptions/Exception',
  exceptionPeriod: 'Project/Calendars/Calendar/Exceptions/Exception/TimePeriod',
  definition: 'Project/ExtendedAttributes/ExtendedAttribute',
  task: 'Project/Tasks/Task',
  dependency: 'Project/Tasks/Task/PredecessorLink',
  taskValue: 'Project/Tasks/Task/ExtendedAttribute',
  resource: 'Project/Resources/Resource',
  assignment: 'Project/Assignments/Assignment',
} as const satisfies Readonly<Record<string, ParentPath>>

// WHY: a row carried whole (DF-3) is held on the Project but lives in its collection in the file.
const CARRIED_ROW_PATHS: Readonly<Record<string, string>> = {
  Calendar: PATHS.calendar,
  Task: PATHS.task,
  Resource: PATHS.resource,
  Assignment: PATHS.assignment,
}

/** @purity pure */
function notice(at: string, what: string): MspdiNotice {
  return { at, what }
}

/** @purity pure */
function leafText(element: XmlElement): string {
  return element.children.length === 0 ? element.text : ''
}

/** @purity pure */
function childOf(element: XmlElement, name: string): XmlElement | null {
  return element.children.find((child) => child.name === name) ?? null
}

// TRAP: never trim or reformat here; the arriving text is the column's value.
/** @purity pure */
function textColumn(element: XmlElement, name: string): string | null {
  const child = childOf(element, name)
  return child === null ? null : leafText(child)
}

/** @purity pure */
function integerColumn(element: XmlElement, name: string): number | null {
  return wholeNumberOf(textColumn(element, name))
}

/** @purity pure */
function wholeNumberOf(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (!/^[+-]?\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : null
}

/** @purity pure */
function booleanColumn(element: XmlElement, name: string): boolean | null {
  const raw = textColumn(element, name)
  if (raw === null) return null
  const trimmed = raw.trim()
  if (trimmed === '1' || trimmed === 'true') return true
  if (trimmed === '0' || trimmed === 'false') return false
  return null
}

/** @purity pure */
function isTrue(element: XmlElement, name: string): boolean {
  return booleanColumn(element, name) === true
}

/** @purity pure */
function minutesOfDuration(raw: string): number | null {
  const hit = /^(-)?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/
    .exec(raw.trim())
  if (hit === null) return null
  if (hit[2] !== undefined || hit[3] !== undefined) return null
  const days = Number(hit[4] ?? 0)
  const hours = Number(hit[5] ?? 0)
  const minutes = Number(hit[6] ?? 0)
  const seconds = Number(hit[7] ?? 0)
  const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60
  return hit[1] === '-' ? -total : total
}

// see EX-9
/** @purity pure */
function durationOfMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  return `PT${Math.floor(whole / 60)}H${whole % 60}M0S`
}

// see FR-054, S-128
/** @purity pure */
function minutesPerWorkingDay(minutesPerDay: number | null): number {
  return minutesPerDay !== null && minutesPerDay > 0
    ? minutesPerDay
    : DEFAULT_CALENDAR_VALUES['S-128']
}

interface CarrySplit {
  readonly carry: Readonly<Record<string, string>>
  readonly carryElements: readonly CarryElement[]
}

/** @purity pure */
function carrySplit(element: XmlElement, consumed: readonly string[]): CarrySplit {
  const carry: Record<string, string> = {}
  const carryElements: CarryElement[] = []
  // TRAP: ordinal counts every child, carried or not; splicedCarriedRows puts carried rows back by it.
  element.children.forEach((child, ordinal) => {
    if (consumed.includes(child.name)) return
    if (child.children.length === 0) {
      keepFirstLeaf(carry, child)
      return
    }
    carryElements.push(carriedElement(child, ordinal))
  })
  return { carry, carryElements }
}

/** @purity pure */
function carriedElement(element: XmlElement, ordinal: number): CarryElement {
  const fields: Record<string, string> = {}
  const children: CarryElement[] = []
  element.children.forEach((child, childOrdinal) => {
    if (child.children.length === 0) keepFirstLeaf(fields, child)
    else children.push(carriedElement(child, childOrdinal))
  })
  return { ordinal, name: element.name, fields, children }
}

// see MR-3
// WHY: the first leaf of a name wins, as childOf does for a consumed one; duplicateLeafCount tells the rest.
/** @purity pure */
function keepFirstLeaf(leaves: Record<string, string>, leaf: XmlElement): void {
  if (!Object.hasOwn(leaves, leaf.name)) leaves[leaf.name] = leaf.text
}

// see MR-3, RS-60
/** @purity pure */
function duplicateLeafCount(root: XmlElement): number {
  let count = 0
  const pending: XmlElement[] = [root]
  for (let element = pending.pop(); element !== undefined; element = pending.pop()) {
    const seen = new Set<string>()
    for (const child of element.children) {
      if (child.children.length > 0) pending.push(child)
      else if (seen.has(child.name)) count += 1
      else seen.add(child.name)
    }
  }
  return count
}

type MspdiVersion = Exclude<Project['sourceFormat'], 'grs'>

interface CarryHolder {
  readonly holder: unknown
  readonly path: string
}

// see AT-143, EX-1
// WHY: reads the model, not the XML, so a GRS JSON (decision 7 of CR-429) is told the same way; it takes
// unknown because json-codec asks before its schema check. TRAP: an element GRS consumes is not seen here.
/** @purity pure */
export function mspdiVersionOfCarried(schedule: unknown): MspdiVersion {
  const pending: CarryHolder[] = [...carryHoldersOf(schedule)]
  for (let one = pending.pop(); one !== undefined; one = pending.pop()) {
    if (!isObject(one.holder)) continue
    const marks = PARENT_ORDERS.get(one.path)?.pj15Only
    const leaves = one.holder['carry'] ?? one.holder['fields']
    if (marks !== undefined && isObject(leaves) && Object.keys(leaves).some((name) => marks.has(name))) {
      return 'pj15'
    }
    const elements = one.holder['carryElements'] ?? one.holder['children']
    for (const element of Array.isArray(elements) ? elements : []) {
      const name = isObject(element) && typeof element['name'] === 'string' ? element['name'] : null
      if (name === null) continue
      if (marks?.has(name) === true) return 'pj15'
      const rowPath = one.path === PATHS.project ? CARRIED_ROW_PATHS[name] : undefined
      pending.push({ holder: element, path: rowPath ?? `${one.path}/${name}` })
    }
  }
  return 'pj12'
}

/** @purity pure */
function carryHoldersOf(schedule: unknown): CarryHolder[] {
  if (!isObject(schedule)) return []
  const holders: CarryHolder[] = [{ holder: schedule['project'], path: PATHS.project }]
  const rowsOf = (owner: unknown, key: string, path: string): unknown[] => {
    const rows = isObject(owner) ? owner[key] : undefined
    for (const row of Array.isArray(rows) ? rows : []) holders.push({ holder: row, path })
    return Array.isArray(rows) ? rows : []
  }
  for (const calendar of rowsOf(schedule, 'calendars', PATHS.calendar)) {
    rowsOf(calendar, 'weekDays', PATHS.weekDay)
    rowsOf(calendar, 'exceptions', PATHS.exception)
  }
  for (const task of rowsOf(schedule, 'tasks', PATHS.task)) rowsOf(task, 'dependencies', PATHS.dependency)
  rowsOf(schedule, 'resources', PATHS.resource)
  rowsOf(schedule, 'assignments', PATHS.assignment)
  return holders
}

/** @purity pure */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @purity pure */
function leaf(name: string, text: string): PlacedChild {
  return { element: { name, text, children: [] } }
}

// WHY: an empty element would tell the partner's tool the value is empty, so nothing is written.
/** @purity pure */
function optionalLeaf(name: string, value: string | number | boolean | null): PlacedChild[] {
  if (value === null) return []
  if (typeof value === 'boolean') return [leaf(name, value ? '1' : '0')]
  return [leaf(name, String(value))]
}

type FadeColumn = 'fadeInDays' | 'fadeOutDays'

interface CustomFieldFrame {
  readonly name: string
  readonly fieldId: number
  readonly prefers: string
  readonly alias: string
}

const CUSTOM_FIELD_FRAMES: readonly CustomFieldFrame[] = customFields.frames

const EXTENDED_ATTRIBUTES_AT = '/Project/ExtendedAttributes'

/** @purity pure */
function fadeColumnOf(prefers: string): FadeColumn | null {
  if (prefers === 'fadeInDays') return 'fadeInDays'
  if (prefers === 'fadeOutDays') return 'fadeOutDays'
  return null
}

/** @purity pure */
function aliasOfColumn(column: FadeColumn): string {
  return CUSTOM_FIELD_FRAMES.find((frame) => frame.prefers === column)?.alias ?? ''
}

// see EX-6
/** @purity pure */
function isAliasUsable(alias: string): boolean {
  // TRAP: count code points, as xsd:maxLength does; alias.length counts UTF-16 units.
  return alias !== '' && [...alias].length <= customFields.aliasMaxLength
}

/** @purity pure */
function carriedDefinitions(carried: readonly CarryElement[]): readonly CarryElement[] {
  const collection = carried.find((one) => one.name === 'ExtendedAttributes')
  if (collection === undefined) return []
  return collection.children.filter((one) => one.name === 'ExtendedAttribute')
}

interface ImportRun {
  readonly notices: MspdiNotice[]
  roundedActualDurationCount: number
}

// see FR-021, FR-023
/** @purity pure */
export function documentFromMspdi(text: string, current: Document): MspdiDecoding {
  const reading = readXml(withoutLeadingByteOrderMark(text))
  if (!reading.ok) return { ok: false, faults: [reading.fault] }
  const root = reading.root
  if (root.name !== 'Project') {
    return {
      ok: false,
      faults: [fault('', `the root element is <${root.name}>, not <Project> (mspdi_pj12.xsd)`)],
    }
  }

  const run: ImportRun = { notices: [], roundedActualDurationCount: 0 }
  const schedule = scheduleFromRoot(root, current, run)
  return {
    ok: true,
    notices: run.notices,
    duplicateLeaves: duplicateLeafCount(root),
    document: {
      schemaVersion: current.schemaVersion,
      schedule,
      documentSettings: current.documentSettings,
      documentStamp: current.documentStamp,
      changeLog: current.changeLog,
    },
  }
}

export const BYTE_ORDER_MARK = '\uFEFF'

/** @purity pure */
export function withoutLeadingByteOrderMark(text: string): string {
  return text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text
}

/** @purity pure */
function scheduleFromRoot(root: XmlElement, current: Document, run: ImportRun): Schedule {
  const calendarsRead = calendarsFromRoot(root, run)
  const tasksRead = tasksFromRoot(root, run)
  const resourcesRead = resourcesFromRoot(root, run)
  const assignmentsRead = assignmentsFromRoot(root, run)
  const rows = rowsFromTasks(tasksRead.tasks, current.documentSettings.maxGroupDepth)

  const project = projectFromRoot(root, current, [
    ...calendarsRead.carriedRows,
    ...tasksRead.carriedRows,
    ...resourcesRead.carriedRows,
    ...assignmentsRead.carriedRows,
  ], tasksRead.outlineBase)
  const highWaterMark = Math.max(
    project.uidHighWaterMark,
    ...tasksRead.tasks.map((task) => task.uid),
    ...resourcesRead.resources.map((resource) => resource.uid),
    ...assignmentsRead.assignments.map((assignment) => assignment.uid),
    ...calendarsRead.calendars.map((calendar) => calendar.uid),
  )
  const read = {
    calendars: calendarsRead.calendars,
    tasks: tasksRead.tasks,
    resources: resourcesRead.resources,
    assignments: assignmentsRead.assignments,
  }

  return withStopsFromActualDurations({
    ...read,
    project: {
      ...project,
      uidHighWaterMark: highWaterMark,
      // see AT-143
      sourceFormat: mspdiVersionOfCarried({ ...read, project }),
    },
    taskGroups: rows.taskGroups,
    taskGroupMembers: rows.taskGroupMembers,
    // WHY: empty; these entities have no MSPDI element, and task origins are the import use case's.
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }, root, run)
}

/** @purity pure */
function projectFromRoot(
  root: XmlElement,
  current: Document,
  carriedRows: readonly CarryElement[],
  outlineBase: number,
): Omit<Project, 'sourceFormat'> {
  const split = carrySplit(root, PROJECT_CONSUMED)
  return {
    id: textColumn(root, 'UID'),
    name: textColumn(root, 'Name'),
    title: textColumn(root, 'Title'),
    subject: textColumn(root, 'Subject'),
    category: textColumn(root, 'Category'),
    company: textColumn(root, 'Company'),
    manager: textColumn(root, 'Manager'),
    author: textColumn(root, 'Author'),
    created: textColumn(root, 'CreationDate'),
    revision: integerColumn(root, 'Revision'),
    lastSaved: textColumn(root, 'LastSaved'),
    startDate: textColumn(root, 'StartDate'),
    statusDate: textColumn(root, 'StatusDate'),
    minutesPerDay: integerColumn(root, 'MinutesPerDay'),
    minutesPerWeek: integerColumn(root, 'MinutesPerWeek'),
    daysPerMonth: integerColumn(root, 'DaysPerMonth'),
    // TRAP: kept as it arrives (0 = Sunday), one apart from DayType (1 = Sunday); never convert either.
    weekStartDay: integerColumn(root, 'WeekStartDay'),
    calendarUid: integerColumn(root, 'CalendarUID'),
    themeHue: current.schedule.project.themeHue,
    uidHighWaterMark: current.schedule.project.uidHighWaterMark,
    importSeq: current.schedule.project.importSeq,
    carry: split.carry,
    carryElements: [...split.carryElements, ...carriedRows],
    outlineBase,
  }
}

const PROJECT_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Title', 'Subject', 'Category', 'Company', 'Manager', 'Author',
  'CreationDate', 'Revision', 'LastSaved', 'StartDate', 'StatusDate', 'MinutesPerDay',
  'MinutesPerWeek', 'DaysPerMonth', 'WeekStartDay', 'CalendarUID',
  'Calendars', 'Tasks', 'Resources', 'Assignments',
]

// WHY: ID, OutlineLevel, OutlineNumber and Summary are consumed, not carried: they are rebuilt on write.
const TASK_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Start', 'Finish', 'Milestone', 'Deadline', 'Notes', 'CalendarUID',
  'ActualStart', 'Stop', 'ActualFinish', 'Resume', 'ResumeValid',
  'PercentComplete', 'PredecessorLink',
  'ID', 'OutlineLevel', 'OutlineNumber', 'Summary',
]

const RESOURCE_CONSUMED: readonly string[] = [
  'UID', 'Name', 'Type', 'IsCostResource', 'CalendarUID', 'ID',
]

const ASSIGNMENT_CONSUMED: readonly string[] = ['UID', 'TaskUID', 'ResourceUID']

const CALENDAR_CONSUMED: readonly string[] = [
  'UID', 'Name', 'IsBaseCalendar', 'BaseCalendarUID', 'WeekDays', 'Exceptions',
]

const WEEKDAY_CONSUMED: readonly string[] = ['DayType', 'DayWorking']

const EXCEPTION_CONSUMED: readonly string[] = ['Name', 'Type', 'DayWorking', 'TimePeriod']

const DEPENDENCY_CONSUMED: readonly string[] = [
  'PredecessorUID', 'Type', 'LinkLag', 'LagFormat',
]

interface TasksReading {
  readonly tasks: readonly Task[]
  readonly carriedRows: readonly CarryElement[]
  readonly outlineBase: number
}

/** @purity pure */
function outlineBaseOf(collection: XmlElement): number {
  for (const element of collection.children) {
    if (element.name !== 'Task') continue
    if (isTrue(element, 'IsNull')) continue
    if (integerColumn(element, 'OutlineLevel') === 0) return 0
  }
  return 1
}

// see DF-3, FR-021
/** @purity pure */
function tasksFromRoot(root: XmlElement, run: ImportRun): TasksReading {
  const collection = childOf(root, 'Tasks')
  if (collection === null) return { tasks: [], carriedRows: [], outlineBase: 1 }
  const fadeColumns = fadeColumnsByFieldId(root)
  const outlineBase = outlineBaseOf(collection)
  const tasks: Task[] = []
  const carriedRows: CarryElement[] = []
  const levels: number[] = []
  const uids: number[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Task') return
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Tasks/Task[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a task',
      ))
      return
    }
    const level = integerColumn(element, 'OutlineLevel')
    const shifted = level === null ? 1 : level - outlineBase + 1
    const depth = shifted < 1 ? 1 : shifted
    const parentIndex = lastIndexShallowerThan(levels, depth)
    const parentUid = parentIndex === null ? null : uids[parentIndex] ?? null
    const wbsOrder = countOfChildrenSoFar(levels, uids, parentIndex, depth)
    levels.push(depth)
    uids.push(uid)
    tasks.push(taskFromElement(element, uid, parentUid, wbsOrder, fadeColumns))
  })
  return { tasks, carriedRows, outlineBase }
}

/** @purity pure */
function tellRoundedActualDurations(run: ImportRun): void {
  const rounded = run.roundedActualDurationCount
  if (rounded === 0) return
  run.notices.push(notice(
    '/Project/Tasks',
    `${rounded} Task${rounded === 1 ? '' : 's'} carried an actual duration that is not`
      + ' a whole number of working days, and each was rounded to whole working days'
      + ' -- what the file states is no longer exactly what this document holds',
  ))
}

// WHY: matched by Alias, not FieldID alone, or the partner's own value in the frame would read as days.
/** @purity pure */
function fadeColumnsByFieldId(root: XmlElement): ReadonlyMap<number, FadeColumn> {
  const claimed = new Map<number, FadeColumn>()
  const collection = childOf(root, 'ExtendedAttributes')
  if (collection === null) return claimed
  const columnOfAlias = new Map<string, FadeColumn>()
  const knownFieldIds = new Set<number>()
  for (const frame of CUSTOM_FIELD_FRAMES) {
    knownFieldIds.add(frame.fieldId)
    const column = fadeColumnOf(frame.prefers)
    if (column === null || !isAliasUsable(frame.alias)) continue
    columnOfAlias.set(frame.alias, column)
  }
  if (columnOfAlias.size === 0) return claimed
  for (const definition of collection.children) {
    if (definition.name !== 'ExtendedAttribute') continue
    const fieldId = integerColumn(definition, 'FieldID')
    const column = columnOfAlias.get(textColumn(definition, 'Alias') ?? '')
    if (fieldId === null || column === undefined || !knownFieldIds.has(fieldId)) continue
    claimed.set(fieldId, column)
  }
  return claimed
}

/** @purity pure */
function lastIndexShallowerThan(levels: readonly number[], depth: number): number | null {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    const level = levels[index]
    if (level !== undefined && level < depth) return index
  }
  return null
}

/** @purity pure */
function countOfChildrenSoFar(
  levels: readonly number[],
  uids: readonly number[],
  parentIndex: number | null,
  depth: number,
): number {
  let counted = 0
  const from = parentIndex === null ? 0 : parentIndex + 1
  for (let index = from; index < levels.length; index += 1) {
    const level = levels[index]
    if (level === undefined || uids[index] === undefined) continue
    if (level < depth) break
    if (level === depth) counted += 1
  }
  return counted
}

/** @purity pure */
function taskFromElement(
  element: XmlElement,
  uid: number,
  wbsParentUid: number | null,
  wbsOrder: number,
  fadeColumns: ReadonlyMap<number, FadeColumn>,
): Task {
  const split = carrySplit(element, TASK_CONSUMED)
  const fade = fadeOfCarried(split.carryElements, fadeColumns)
  return {
    uid,
    wbsParentUid,
    wbsOrder,
    name: textColumn(element, 'Name'),
    start: textColumn(element, 'Start'),
    finish: textColumn(element, 'Finish'),
    milestone: booleanColumn(element, 'Milestone'),
    deadline: textColumn(element, 'Deadline'),
    notes: textColumn(element, 'Notes'),
    calendarUid: integerColumn(element, 'CalendarUID'),
    actualStart: textColumn(element, 'ActualStart'),
    stop: textColumn(element, 'Stop'),
    actualFinish: textColumn(element, 'ActualFinish'),
    resume: textColumn(element, 'Resume'),
    resumeValid: booleanColumn(element, 'ResumeValid'),
    percentComplete: integerColumn(element, 'PercentComplete'),
    fadeInDays: fade.fadeInDays,
    fadeOutDays: fade.fadeOutDays,
    dependencies: dependenciesFromTask(element),
    carry: split.carry,
    carryElements: fade.carryElements,
  }
}

interface FadeReading {
  readonly fadeInDays: number | null
  readonly fadeOutDays: number | null
  readonly carryElements: readonly CarryElement[]
}

/** @purity pure */
function fadeOfCarried(
  carried: readonly CarryElement[],
  fadeColumns: ReadonlyMap<number, FadeColumn>,
): FadeReading {
  let fadeInDays: number | null = null
  let fadeOutDays: number | null = null
  const rest: CarryElement[] = []
  for (const one of carried) {
    const fieldId = one.name === 'ExtendedAttribute'
      ? wholeNumberOf(one.fields['FieldID'])
      : null
    const column = fieldId === null ? undefined : fadeColumns.get(fieldId)
    const days = column === undefined ? null : wholeNumberOf(one.fields['Value'])
    // TRAP: a claimed value must leave the carried list, or the writer writes it twice.
    if (days === null) {
      rest.push(one)
      continue
    }
    if (column === 'fadeInDays') fadeInDays = days
    else fadeOutDays = days
  }
  return { fadeInDays, fadeOutDays, carryElements: rest }
}

// see FR-011, AT-141
/** @purity pure */
function withStopsFromActualDurations(schedule: Schedule, root: XmlElement, run: ImportRun): Schedule {
  // TRAP: the file's own MinutesPerDay, not the document's: dividing by one and multiplying by another loses the value.
  const minutesPerDay = minutesPerWorkingDay(integerColumn(root, 'MinutesPerDay'))
  const within = workingCalendarOf(schedule)
  const tasks = schedule.tasks.map((task) => {
    const start = dayOf(task.actualStart)
    if (task.stop !== null || task.actualFinish !== null || start === null) return task
    const at = `/Project/Tasks/Task[uid=${task.uid}]`
    const days = workingDaysOfActualDuration(task.carry['ActualDuration'] ?? null, minutesPerDay, at, run)
    if (days === null) return task
    try {
      return { ...task, stop: textOfDay(lastDayForLength(within, start, days)) }
    } catch (why) {
      run.notices.push(notice(`${at}/Stop`,
        `could not be counted: ${why instanceof Error ? why.message : String(why)}`))
      return task
    }
  })
  tellRoundedActualDurations(run)
  return { ...schedule, tasks }
}

// see FR-011, FR-054
/** @purity pure */
function workingDaysOfActualDuration(
  raw: string | null,
  minutesPerDay: number,
  at: string,
  run: ImportRun,
): number | null {
  if (raw === null || raw.trim() === '') return null
  const minutes = minutesOfDuration(raw)
  if (minutes === null) {
    run.notices.push(notice(`${at}/ActualDuration`, `is not a length this reader measures: ${raw}`))
    return null
  }
  const days = minutes / minutesPerDay
  if (Number.isInteger(days)) return days
  run.roundedActualDurationCount += 1
  // TRAP: Math.round sends a negative half toward zero, so the magnitude is rounded.
  return Math.sign(days) * Math.round(Math.abs(days))
}

/** @purity pure */
function dependenciesFromTask(element: XmlElement): readonly Dependency[] {
  const links: Dependency[] = []
  element.children.forEach((child) => {
    if (child.name !== 'PredecessorLink') return
    const split = carrySplit(child, DEPENDENCY_CONSUMED)
    const predecessorUid = integerColumn(child, 'PredecessorUID')
    const linkType = integerColumn(child, 'Type')
    if (predecessorUid === null || linkType === null) return
    links.push({
      predecessorUid,
      linkType,
      lag: integerColumn(child, 'LinkLag'),
      lagFormat: integerColumn(child, 'LagFormat'),
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return links
}

interface ResourcesReading {
  readonly resources: readonly Resource[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function resourcesFromRoot(root: XmlElement, run: ImportRun): ResourcesReading {
  const collection = childOf(root, 'Resources')
  if (collection === null) return { resources: [], carriedRows: [] }
  const resources: Resource[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Resource') return
    if (isTrue(element, 'IsNull')) {
      carriedRows.push(carriedElement(element, ordinal))
      return
    }
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Resources/Resource[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a resource',
      ))
      return
    }
    const split = carrySplit(element, RESOURCE_CONSUMED)
    resources.push({
      uid,
      name: textColumn(element, 'Name'),
      resourceKind: integerColumn(element, 'Type'),
      isCostResource: booleanColumn(element, 'IsCostResource'),
      calendarUid: integerColumn(element, 'CalendarUID'),
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return { resources, carriedRows }
}

interface AssignmentsReading {
  readonly assignments: readonly Assignment[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function assignmentsFromRoot(root: XmlElement, run: ImportRun): AssignmentsReading {
  const collection = childOf(root, 'Assignments')
  if (collection === null) return { assignments: [], carriedRows: [] }
  const assignments: Assignment[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Assignment') return
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Assignments/Assignment[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming an assignment',
      ))
      return
    }
    const split = carrySplit(element, ASSIGNMENT_CONSUMED)
    assignments.push({
      uid,
      taskUid: integerColumn(element, 'TaskUID'),
      resourceUid: integerColumn(element, 'ResourceUID'),
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return { assignments, carriedRows }
}

interface CalendarsReading {
  readonly calendars: readonly Calendar[]
  readonly carriedRows: readonly CarryElement[]
}

/** @purity pure */
function calendarsFromRoot(root: XmlElement, run: ImportRun): CalendarsReading {
  const collection = childOf(root, 'Calendars')
  if (collection === null) return { calendars: [], carriedRows: [] }
  const calendars: Calendar[] = []
  const carriedRows: CarryElement[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Calendar') return
    const uid = integerColumn(element, 'UID')
    if (uid === null) {
      carriedRows.push(carriedElement(element, ordinal))
      run.notices.push(notice(
        `/Project/Calendars/Calendar[${ordinal + 1}]`,
        'has no UID, so it is carried back unchanged instead of becoming a calendar',
      ))
      return
    }
    const split = carrySplit(element, CALENDAR_CONSUMED)
    calendars.push({
      uid,
      name: textColumn(element, 'Name'),
      isBaseCalendar: booleanColumn(element, 'IsBaseCalendar'),
      baseCalendarUid: integerColumn(element, 'BaseCalendarUID'),
      ordinal,
      carry: split.carry,
      carryElements: split.carryElements,
      weekDays: weekDaysOfCalendar(element),
      exceptions: exceptionsOfCalendar(element, uid, run),
    })
  })
  return { calendars, carriedRows }
}

/** @purity pure */
function weekDaysOfCalendar(calendar: XmlElement): readonly WeekDay[] {
  const collection = childOf(calendar, 'WeekDays')
  if (collection === null) return []
  const weekDays: WeekDay[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'WeekDay') return
    const split = carrySplit(element, WEEKDAY_CONSUMED)
    weekDays.push({
      ordinal,
      // TRAP: kept as it arrives (1 = Sunday), one apart from WeekStartDay (0 = Sunday); never convert either.
      dayType: integerColumn(element, 'DayType'),
      dayWorking: booleanColumn(element, 'DayWorking'),
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return weekDays
}

/** @purity pure */
function exceptionsOfCalendar(
  calendar: XmlElement,
  calendarUid: number,
  run: ImportRun,
): readonly Exception[] {
  const collection = childOf(calendar, 'Exceptions')
  if (collection === null) return []
  const exceptions: Exception[] = []
  collection.children.forEach((element, ordinal) => {
    if (element.name !== 'Exception') return
    const split = carrySplit(element, EXCEPTION_CONSUMED)
    const period = childOf(element, 'TimePeriod')
    const recurrenceKind = integerColumn(element, 'Type')
    if (recurrenceKind !== null && recurrenceKind !== NO_RECURRENCE) {
      run.notices.push(notice(
        `/Project/Calendars/Calendar[uid=${calendarUid}]/Exceptions/Exception[${ordinal + 1}]`,
        'repeats, and repeating exception days are not spread over real dates',
      ))
    }
    exceptions.push({
      ordinal,
      name: textColumn(element, 'Name'),
      fromDate: period === null ? null : textColumn(period, 'FromDate'),
      toDate: period === null ? null : textColumn(period, 'ToDate'),
      dayWorking: booleanColumn(element, 'DayWorking'),
      recurrenceKind,
      carry: split.carry,
      carryElements: split.carryElements,
    })
  })
  return exceptions
}

const NO_RECURRENCE = 9

interface ImportedRows {
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
}

// see FR-058
/** @purity pure */
function rowsFromTasks(tasks: readonly Task[], maxGroupDepth: number): ImportedRows {
  const depths = new Map<number, number>()
  const taskGroups: TaskGroup[] = []
  const taskGroupMembers: TaskGroupMember[] = []
  const rowOfTask = new Map<number, string>()

  for (const task of tasks) {
    const parentDepth = task.wbsParentUid === null ? 0 : depths.get(task.wbsParentUid) ?? 0
    const depth = parentDepth + 1
    depths.set(task.uid, depth)
    if (depth > maxGroupDepth) continue
    const parentRow = task.wbsParentUid === null ? null : rowOfTask.get(task.wbsParentUid) ?? null
    const id = rowIdOfTask(task.uid)
    rowOfTask.set(task.uid, id)
    taskGroups.push({
      id,
      parentId: parentRow,
      label: null,
      derivedFromTaskUid: task.uid,
      order: task.wbsOrder ?? 0,
      isCollapsed: null,
      isHidden: null,
      isKeptOpen: false,
      editGroup: null,
      color: null,
      height: null,
    })
  }

  for (const task of tasks) {
    const own = rowOfTask.get(task.uid)
    const groupId = own ?? deepestAncestorRow(task, tasks, rowOfTask)
    if (groupId === null) continue
    taskGroupMembers.push({ taskUid: task.uid, groupId, stackOrder: null })
  }
  return { taskGroups, taskGroupMembers }
}

/** @purity pure */
function deepestAncestorRow(
  task: Task,
  tasks: readonly Task[],
  rowOfTask: ReadonlyMap<number, string>,
): string | null {
  let at: number | null = task.wbsParentUid
  // TRAP: bounded by the task count, since a wbsParentUid ring is refused only after this runs.
  for (let steps = 0; steps < tasks.length && at !== null; steps += 1) {
    const row = rowOfTask.get(at)
    if (row !== undefined) return row
    const parent: Task | undefined = tasks.find((one) => one.uid === at)
    at = parent === undefined ? null : parent.wbsParentUid
  }
  return null
}

// WHY: derived from the task UID, since a pure function may not mint a random UUID; importing twice gives the same ids.
// see AT-51
/** @purity pure */
function rowIdOfTask(uid: number): string {
  const scalar = Math.trunc(uid)
  const sign = scalar < 0 ? 'f' : '0'
  const digits = Math.abs(scalar).toString(16).padStart(11, '0').slice(-11)
  return `00000000-0000-4000-8000-${sign}${digits}`
}

interface ExportRun {
  readonly notices: MspdiNotice[]
}

// see FR-021
/** @purity pure */
export function mspdiFromDocument(document: Document): MspdiEncoding {
  const run: ExportRun = { notices: [] }
  const schedule = document.schedule
  const root: XmlElement = {
    name: 'Project',
    text: '',
    children: writtenProjectChildren(schedule, run),
  }
  return { text: writtenXml(root, MSPDI_NAMESPACE), notices: run.notices }
}

/** @purity pure */
function writtenProjectChildren(schedule: Schedule, run: ExportRun): readonly XmlElement[] {
  const project = schedule.project
  const frames = claimedFrames(schedule, run)
  const definitions = writtenFadeDefinitions(frames, project.carryElements, project.carry)
  const named: PlacedChild[] = [
    ...(project.carry['SaveVersion'] === undefined
      ? [leaf('SaveVersion', GRS_SAVE_VERSION)]
      : []),
    ...(project.carry['CurrencyCode'] === undefined
      ? [leaf('CurrencyCode', UNSTATED_CURRENCY_CODE)]
      : []),
    ...optionalLeaf('UID', project.id),
    ...optionalLeaf('Name', project.name),
    ...optionalLeaf('Title', project.title),
    ...optionalLeaf('Subject', project.subject),
    ...optionalLeaf('Category', project.category),
    ...optionalLeaf('Company', project.company),
    ...optionalLeaf('Manager', project.manager),
    ...optionalLeaf('Author', project.author),
    ...optionalLeaf('CreationDate', project.created),
    ...optionalLeaf('Revision', project.revision),
    ...optionalLeaf('LastSaved', project.lastSaved),
    ...optionalLeaf('StartDate', project.startDate),
    ...optionalLeaf('StatusDate', project.statusDate),
    ...optionalLeaf('MinutesPerDay', project.minutesPerDay),
    ...optionalLeaf('MinutesPerWeek', project.minutesPerWeek),
    ...optionalLeaf('DaysPerMonth', project.daysPerMonth),
    ...optionalLeaf('WeekStartDay', project.weekStartDay),
    ...optionalLeaf('CalendarUID', project.calendarUid),
    ...(project.carry['FinishDate'] === undefined
      ? optionalLeaf('FinishDate', latestTaskFinish(schedule))
      : []),
    ...definitions.named,
  ]
  // TRAP: splice before the length test, or a file whose only Calendar had no UID loses its Calendars.
  const calendars = splicedCarriedRows(
    schedule.calendars.map(writtenCalendar), project.carryElements, 'Calendar',
  )
  if (calendars.length > 0) named.push(collection('Calendars', calendars))
  const tasks = writtenTasks(schedule, frames, run)
  if (tasks.length > 0) named.push(collection('Tasks', tasks))
  const resources = writtenResources(schedule)
  if (resources.length > 0) named.push(collection('Resources', resources))
  const assignments = splicedCarriedRows(
    schedule.assignments.map(writtenAssignment), project.carryElements, 'Assignment',
  )
  if (assignments.length > 0) named.push(collection('Assignments', assignments))

  return writtenChildren(
    PATHS.project,
    named,
    definitions.carry,
    // TRAP: collection rows are written inside their collection; writing them here too duplicates them.
    definitions.carried.filter((one) => !isCarriedRow(one)),
  )
}

/** @purity pure */
function isCarriedRow(carried: CarryElement): boolean {
  return Object.hasOwn(CARRIED_ROW_PATHS, carried.name)
}

interface ClaimedFrame {
  readonly column: FadeColumn
  readonly fieldId: number
  readonly alias: string
}

// see EX-6
/** @purity pure */
function claimedFrames(schedule: Schedule, run: ExportRun): readonly ClaimedFrame[] {
  const inUse = new Set<FadeColumn>()
  for (const task of schedule.tasks) {
    if (task.fadeInDays !== null) inUse.add('fadeInDays')
    if (task.fadeOutDays !== null) inUse.add('fadeOutDays')
  }
  if (inUse.size === 0) return []

  const spokenFor = aliasesOfDefinitions(schedule.project.carryElements)
  const claimed: ClaimedFrame[] = []
  for (const preferred of CUSTOM_FIELD_FRAMES) {
    const column = fadeColumnOf(preferred.prefers)
    if (column === null || !inUse.has(column)) continue
    const alias = aliasOfColumn(column)
    if (!isAliasUsable(alias)) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT, `${column} was not written: `
        + 'the roster mspdi-custom-fields.json states no usable Alias for it, and '
        + 'without one a frame GRS wrote cannot be told from one the import '
        + 'source wrote (EX-6)'))
      continue
    }
    const free = [preferred, ...CUSTOM_FIELD_FRAMES].find((frame) => {
      const standing = spokenFor.get(frame.fieldId)
      return (standing === undefined || standing === alias)
        && !claimed.some((one) => one.fieldId === frame.fieldId)
    })
    if (free === undefined) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT, `${column} was not written: `
        + 'every frame of the roster is spoken for (EX-6)'))
      continue
    }
    if (free !== preferred) {
      run.notices.push(notice(EXTENDED_ATTRIBUTES_AT,
        `${column} was written to ${free.name} because ${preferred.name} is already spoken for`))
    }
    claimed.push({ column, fieldId: free.fieldId, alias })
  }
  return claimed
}

// WHY: free only with no definition or this column's alias; any roster word would let one fade column evict the other.
/** @purity pure */
function aliasesOfDefinitions(carried: readonly CarryElement[]): ReadonlyMap<number, string> {
  const knownFieldIds = new Set(CUSTOM_FIELD_FRAMES.map((frame) => frame.fieldId))
  const aliases = new Map<number, string>()
  for (const definition of carriedDefinitions(carried)) {
    const fieldId = wholeNumberOf(definition.fields['FieldID'])
    if (fieldId === null || !knownFieldIds.has(fieldId)) continue
    aliases.set(fieldId, definition.fields['Alias'] ?? '')
  }
  return aliases
}

interface FadeDefinitions {
  readonly carry: Readonly<Record<string, string>>
  readonly carried: readonly CarryElement[]
  readonly named: readonly PlacedChild[]
}

// see EX-8
/** @purity pure */
function writtenFadeDefinitions(
  frames: readonly ClaimedFrame[],
  carried: readonly CarryElement[],
  carry: Readonly<Record<string, string>>,
): FadeDefinitions {
  const unchanged: FadeDefinitions = { carry, carried, named: [] }
  if (frames.length === 0) return unchanged
  const present = carriedDefinitions(carried)
  const missing = frames.filter((claimed) => !present.some(
    (one) => wholeNumberOf(one.fields['FieldID']) === claimed.fieldId
      && one.fields['Alias'] === claimed.alias,
  ))
  if (missing.length === 0) return unchanged

  const foundAt = carried.findIndex((one) => one.name === 'ExtendedAttributes')
  const collection = foundAt < 0 ? undefined : carried[foundAt]
  if (collection === undefined) {
    const children = missing.map((claimed, index) => writtenCarriedElement(
      definitionOfFrame(claimed, index), PATHS.definition,
    ))
    // TRAP: an empty ExtendedAttributes that arrived sits in carry as a scalar; it is dropped here
    // once a frame is claimed, and written back otherwise.
    const { ExtendedAttributes: _takenOver, ...rest } = carry
    return {
      carry: rest,
      carried,
      named: [{ element: { name: 'ExtendedAttributes', text: '', children } }],
    }
  }
  const nextOrdinal = collection.children.reduce((top, one) => Math.max(top, one.ordinal + 1), 0)
  const grown: CarryElement = {
    ...collection,
    children: [
      ...collection.children,
      ...missing.map((claimed, index) => definitionOfFrame(claimed, nextOrdinal + index)),
    ],
  }
  return {
    carry,
    carried: carried.map((one, index) => (index === foundAt ? grown : one)),
    named: [],
  }
}

/** @purity pure */
function definitionOfFrame(claimed: ClaimedFrame, ordinal: number): CarryElement {
  return {
    ordinal,
    name: 'ExtendedAttribute',
    fields: {
      FieldID: String(claimed.fieldId),
      CFType: String(customFields.cfType),
      ElemType: String(customFields.elemType),
      UserDef: '1',
      Alias: claimed.alias,
    },
    children: [],
  }
}

// DEVIATION: spec says an unedited file writes back equal (FR-021); here fade values go after carried ones (DFC-563)
/** @purity pure */
function writtenFadeValues(task: Task, frames: readonly ClaimedFrame[]): PlacedChild[] {
  const placed: PlacedChild[] = []
  for (const claimed of frames) {
    const days = task[claimed.column]
    if (days === null) continue
    const named = [leaf('FieldID', String(claimed.fieldId)), leaf('Value', String(days))]
    placed.push({
      element: {
        name: 'ExtendedAttribute',
        text: '',
        children: writtenChildren(PATHS.taskValue, named, {}, []),
      },
    })
  }
  return placed
}

// see DV-2, EX-1
const GRS_SAVE_VERSION = '12'

// WHY: ISO 4217's no-currency code, since no column of the document holds money.
const UNSTATED_CURRENCY_CODE = 'XXX'

/** @purity pure */
function collection(name: string, rows: readonly XmlElement[]): PlacedChild {
  return { element: { name, text: '', children: rows } }
}

// see DV-1
/** @purity pure */
function latestTaskFinish(schedule: Schedule): string | null {
  let latest: string | null = null
  let latestDay: number | null = null
  for (const task of schedule.tasks) {
    const day = dayOf(task.finish)
    if (day === null || task.finish === null) continue
    const serial = day.year * 10000 + day.month * 100 + day.day
    if (latestDay === null || serial > latestDay) {
      latestDay = serial
      latest = task.finish
    }
  }
  return latest
}

/** @purity pure */
function writtenTasks(
  schedule: Schedule,
  frames: readonly ClaimedFrame[],
  run: ExportRun,
): readonly XmlElement[] {
  // TRAP: not schedule.tasks as held: the row-tree ranking rewrites wbsOrder without moving the collection.
  const ordered = tasksInWbsOrder(schedule.tasks)
  const base = schedule.project.outlineBase
  const outlineLevels = new Map<number, number>()
  for (const [uid, depth] of taskDepths(ordered)) outlineLevels.set(uid, depth - 1 + base)
  const numbers = outlineNumbers(ordered, base)
  const hasChildren = new Set(
    ordered.map((task) => task.wbsParentUid).filter((uid): uid is number => uid !== null),
  )
  const minutesPerDay = minutesPerWorkingDay(schedule.project.minutesPerDay)
  const written = ordered.map((task, index) => writtenTask(
    task, schedule, index, base, outlineLevels, numbers, hasChildren, minutesPerDay,
    frames, run,
  ))
  return splicedCarriedRows(written, schedule.project.carryElements, 'Task')
}

// WHY: a walk, not a flat sort, so a child follows its parent; a task on a ring is appended, not dropped.
/** @purity pure */
function tasksInWbsOrder(tasks: readonly Task[]): readonly Task[] {
  if (tasks.length < 2) return tasks
  const known = new Set(tasks.map((task) => task.uid))
  const family = new Map<number | null, Task[]>()
  for (const task of tasks) {
    const parent =
      task.wbsParentUid !== null && known.has(task.wbsParentUid) ? task.wbsParentUid : null
    const kin = family.get(parent)
    if (kin === undefined) family.set(parent, [task])
    else kin.push(task)
  }
  for (const kin of family.values()) kin.sort((a, b) => rankOfSibling(a) - rankOfSibling(b))

  const out: Task[] = []
  const seen = new Set<number>()
  const stack: Task[] = [...(family.get(null) ?? [])].reverse()
  while (stack.length > 0) {
    const task = stack.pop()
    if (task === undefined) break
    if (seen.has(task.uid)) continue
    seen.add(task.uid)
    out.push(task)
    const kin = family.get(task.uid) ?? []
    for (let index = kin.length - 1; index >= 0; index -= 1) {
      const child = kin[index]
      if (child !== undefined && !seen.has(child.uid)) stack.push(child)
    }
  }
  for (const task of tasks) if (!seen.has(task.uid)) out.push(task)
  return out
}

/** @purity pure */
function rankOfSibling(task: Task): number {
  return task.wbsOrder ?? Number.MAX_SAFE_INTEGER
}

/** @purity pure */
function splicedCarriedRows(
  rows: readonly XmlElement[],
  carried: readonly CarryElement[],
  name: string,
): readonly XmlElement[] {
  const path = CARRIED_ROW_PATHS[name] ?? `${PATHS.project}/${name}`
  const rowsBack = carried.filter((one) => one.name === name).sort((a, b) => a.ordinal - b.ordinal)
  if (rowsBack.length === 0) return rows
  const out = [...rows]
  for (const row of rowsBack) {
    const foundAt = Math.min(Math.max(row.ordinal, 0), out.length)
    out.splice(foundAt, 0, writtenCarriedElement(row, path))
  }
  return out
}

/** @purity pure */
function taskDepths(tasks: readonly Task[]): ReadonlyMap<number, number> {
  const parents = new Map<number, number | null>()
  for (const task of tasks) parents.set(task.uid, task.wbsParentUid)
  const depths = new Map<number, number>()
  for (const task of tasks) {
    let depth = 1
    let foundAt = task.wbsParentUid
    // TRAP: bounded by the task count, since a document in hand may hold a ring.
    for (let steps = 0; steps < tasks.length && foundAt !== null; steps += 1) {
      depth += 1
      foundAt = parents.get(foundAt) ?? null
    }
    depths.set(task.uid, depth)
  }
  return depths
}

// see DV-6
/** @purity pure */
function outlineNumbers(
  tasks: readonly Task[],
  base: number,
): ReadonlyMap<number, string> {
  const paths = new Map<number, readonly number[]>()
  const numbers = new Map<number, string>()
  const counters = new Map<string, number>()
  for (const task of tasks) {
    const parentKey = task.wbsParentUid === null ? '' : String(task.wbsParentUid)
    const next = (counters.get(parentKey) ?? 0) + 1
    counters.set(parentKey, next)
    const parentPath = task.wbsParentUid === null ? [] : paths.get(task.wbsParentUid) ?? []
    const path = [...parentPath, next]
    paths.set(task.uid, path)
    const shown = path.slice(1 - base)
    numbers.set(task.uid, shown.length === 0 ? '0' : shown.join('.'))
  }
  return numbers
}

/** @purity pure */
function writtenTask(
  task: Task,
  schedule: Schedule,
  index: number,
  base: number,
  outlineLevels: ReadonlyMap<number, number>,
  numbers: ReadonlyMap<number, string>,
  hasChildren: ReadonlySet<number>,
  minutesPerDay: number,
  frames: readonly ClaimedFrame[],
  run: ExportRun,
): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(task.uid)),
    // DEVIATION: spec says unedited tasks keep their values (EX-2); here ID and outline columns are rebuilt (DFC-564)
    leaf('ID', String(index + base)),
    ...optionalLeaf('Name', task.name),
    ...optionalLeaf('OutlineNumber', numbers.get(task.uid) ?? null),
    ...optionalLeaf('OutlineLevel', outlineLevels.get(task.uid) ?? null),
    ...optionalLeaf('Start', task.start),
    ...optionalLeaf('Finish', task.finish),
    ...optionalLeaf('Resume', task.resume),
    ...optionalLeaf('ResumeValid', task.resumeValid),
    ...optionalLeaf('Milestone', task.milestone),
    leaf('Summary', hasChildren.has(task.uid) ? '1' : '0'),
    ...optionalLeaf('PercentComplete', task.percentComplete),
    ...optionalLeaf('ActualStart', task.actualStart),
    ...optionalLeaf('ActualFinish', task.actualFinish),
    ...optionalLeaf('CalendarUID', task.calendarUid),
    ...optionalLeaf('Deadline', task.deadline),
    ...optionalLeaf('Notes', task.notes),
    ...writtenActualDuration(task, schedule, minutesPerDay, run),
    // TRAP: a document read before AT-141 may still carry Stop; writing both puts two Stop elements in one Task.
    ...(task.carry['Stop'] === undefined ? optionalLeaf('Stop', task.stop) : []),
    ...task.dependencies.map(writtenDependency),
    ...writtenFadeValues(task, frames),
    ...writtenConstraintOfGrs(task, schedule, run),
  ]
  const carry = schedule.project.sourceFormat === 'grs'
    ? withoutLeaves(task.carry, CONSTRAINT_LEAVES)
    : task.carry
  return {
    name: 'Task',
    text: '',
    children: writtenChildren(PATHS.task, named, carry, task.carryElements),
  }
}

// WHY: GRS writes these for a grs document and would write each twice if a merged task carried them too.
const CONSTRAINT_LEAVES: readonly string[] = ['ConstraintType', 'ConstraintDate']

// see EX-11
const MUST_START_ON = '2'

// see EX-11, EX-12, DV-8
// WHY: a document read from MSPDI gets these when a task is edited (edit-task.ts), never on write (EX-2).
/** @purity pure */
function writtenConstraintOfGrs(task: Task, schedule: Schedule, run: ExportRun): PlacedChild[] {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (schedule.project.sourceFormat !== 'grs' || start === null || finish === null) return []
  const constraint = [
    leaf('ConstraintType', MUST_START_ON),
    leaf('ConstraintDate', textOfDay(start)),
  ]
  // see DV-8
  if (task.carry['Duration'] !== undefined) return constraint
  try {
    const span = workingDaysBetween(workingCalendarOf(schedule), start, finish)
    const minutes = span * minutesPerWorkingDay(schedule.project.minutesPerDay)
    return [...constraint, leaf('Duration', durationOfMinutes(minutes))]
  } catch (why) {
    run.notices.push(notice(
      `/Project/Tasks/Task[uid=${task.uid}]/Duration`,
      `could not be counted: ${why instanceof Error ? why.message : String(why)}`,
    ))
    return constraint
  }
}

/** @purity pure */
function withoutLeaves(
  leaves: Readonly<Record<string, string>>,
  names: readonly string[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(leaves).filter(([name]) => !names.includes(name)))
}

// see DV-11, T-019
/** @purity pure */
function writtenActualDuration(
  task: Task,
  schedule: Schedule,
  minutesPerDay: number,
  run: ExportRun,
): PlacedChild[] {
  if (task.carry['ActualDuration'] !== undefined) return []
  const from = dayOf(task.actualStart)
  const lastDay = actualLastDay(task)
  if (from === null || lastDay === null) return []
  try {
    const length = actualLengthOf(workingCalendarOf(schedule), from, lastDay)
    return [leaf('ActualDuration', durationOfMinutes(length * minutesPerDay))]
  } catch (why) {
    run.notices.push(notice(
      `/Project/Tasks/Task[uid=${task.uid}]/ActualDuration`,
      `could not be counted: ${why instanceof Error ? why.message : String(why)}`,
    ))
    return []
  }
}

/** @purity pure */
function writtenDependency(dependency: Dependency): PlacedChild {
  const named: PlacedChild[] = [
    leaf('PredecessorUID', String(dependency.predecessorUid)),
    leaf('Type', String(dependency.linkType)),
    ...optionalLeaf('LinkLag', dependency.lag),
    ...optionalLeaf('LagFormat', dependency.lagFormat),
  ]
  return {
    element: {
      name: 'PredecessorLink',
      text: '',
      children: writtenChildren(
        PATHS.dependency, named, dependency.carry, dependency.carryElements,
      ),
    },
  }
}

/** @purity pure */
function writtenResources(schedule: Schedule): readonly XmlElement[] {
  const written = schedule.resources.map((resource, index) => {
    const named: PlacedChild[] = [
      leaf('UID', String(resource.uid)),
      leaf('ID', String(index + 1)),
      ...optionalLeaf('Name', resource.name),
      ...optionalLeaf('Type', resource.resourceKind),
      ...optionalLeaf('IsCostResource', resource.isCostResource),
      ...optionalLeaf('CalendarUID', resource.calendarUid),
    ]
    return {
      name: 'Resource',
      text: '',
      children: writtenChildren(PATHS.resource, named, resource.carry, resource.carryElements),
    }
  })
  return splicedCarriedRows(written, schedule.project.carryElements, 'Resource')
}

/** @purity pure */
function writtenAssignment(assignment: Assignment): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(assignment.uid)),
    ...optionalLeaf('TaskUID', assignment.taskUid),
    ...optionalLeaf('ResourceUID', assignment.resourceUid),
  ]
  return {
    name: 'Assignment',
    text: '',
    children: writtenChildren(PATHS.assignment, named, assignment.carry, assignment.carryElements),
  }
}

/** @purity pure */
function writtenCalendar(calendar: Calendar): XmlElement {
  const named: PlacedChild[] = [
    leaf('UID', String(calendar.uid)),
    ...optionalLeaf('Name', calendar.name),
    ...optionalLeaf('IsBaseCalendar', calendar.isBaseCalendar),
    ...optionalLeaf('BaseCalendarUID', calendar.baseCalendarUid),
  ]
  if (calendar.weekDays.length > 0) {
    named.push(collection('WeekDays', calendar.weekDays.map(writtenWeekDay)))
  }
  if (calendar.exceptions.length > 0) {
    named.push(collection('Exceptions', calendar.exceptions.map(writtenException)))
  }
  return {
    name: 'Calendar',
    text: '',
    children: writtenChildren(PATHS.calendar, named, calendar.carry, calendar.carryElements),
  }
}

/** @purity pure */
function writtenWeekDay(weekDay: WeekDay): XmlElement {
  const named: PlacedChild[] = [
    ...optionalLeaf('DayType', weekDay.dayType),
    ...optionalLeaf('DayWorking', weekDay.dayWorking),
  ]
  return {
    name: 'WeekDay',
    text: '',
    children: writtenChildren(PATHS.weekDay, named, weekDay.carry, weekDay.carryElements),
  }
}

/** @purity pure */
function writtenException(exception: Exception): XmlElement {
  const named: PlacedChild[] = [
    ...optionalLeaf('Name', exception.name),
    ...optionalLeaf('Type', exception.recurrenceKind),
    ...optionalLeaf('DayWorking', exception.dayWorking),
  ]
  const period: PlacedChild[] = [
    ...optionalLeaf('FromDate', exception.fromDate),
    ...optionalLeaf('ToDate', exception.toDate),
  ]
  if (period.length > 0) {
    named.push({
      element: {
        name: 'TimePeriod',
        text: '',
        children: writtenChildren(PATHS.exceptionPeriod, period, {}, []),
      },
    })
  }
  return {
    name: 'Exception',
    text: '',
    children: writtenChildren(PATHS.exception, named, exception.carry, exception.carryElements),
  }
}

// Shared by the cr-429 cases: the MSPDI files they read, built in the test as strings.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  documentFromJson,
  documentFromMspdi,
  mspdiFromDocument,
} from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { editTask } from '../../src/use-case/edit-document/edit-task'
import {
  childrenNamed,
  inSchemaOrder,
  leaf,
  node,
  nodeAt,
  parseXml,
  sampleValue,
  textAt,
  withEveryPj15OnlyElement,
  type Spec,
  type XmlNode,
} from './cr-429-mspdi-schema'

export const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

export function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error(`the bundled template was refused: ${JSON.stringify(read).slice(0, 400)}`)
  return read.document
}

// WHY: the MSPDI cases must not hang on AT-143's legacy reading, which has cases of its own,
// so the `current` they pass holds the column already.
export function currentDocument(): Document {
  const parsed = JSON.parse(TEMPLATE_TEXT) as { schedule: { project: Record<string, unknown> } }
  parsed.schedule.project['sourceFormat'] ??= 'grs'
  const read = documentFromJson(JSON.stringify(parsed))
  if (!read.ok) throw new Error(`the bundled template was refused: ${JSON.stringify(read).slice(0, 400)}`)
  return read.document
}

export type Accepted = Extract<ReturnType<typeof documentFromMspdi>, { ok: true }>

export function accepted(text: string, current: Document = currentDocument()): Accepted {
  const read = documentFromMspdi(text, current)
  if (!read.ok) throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  return read
}

export function writtenText(document: Document): string {
  return mspdiFromDocument(document).text
}

export function taskNode(root: XmlNode, uid: number): XmlNode {
  const tasks = nodeAt(root, 'Tasks')
  const found = tasks === null ? undefined : childrenNamed(tasks, 'Task').find((each) => textAt(each, 'UID') === String(uid))
  if (found === undefined) throw new Error(`no Task with UID ${uid} was written`)
  return found
}

export function writtenTask(document: Document, uid: number): XmlNode {
  return taskNode(parseXml(writtenText(document)), uid)
}

export const DEFAULT_ROW_NAME = 'Row'

export function edited(document: Document, command: Parameters<typeof editTask>[1]): Document {
  const result = editTask(document, command, DEFAULT_ROW_NAME)
  if (!result.ok) throw new Error(`the edit was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

export const MINUTES_PER_DAY = 480

export function day(date: number): string {
  return `2026-04-${String(date).padStart(2, '0')}T00:00:00`
}

export function hours(total: number): string {
  return `PT${total}H0M0S`
}

const OUTLINE_GUID = '6F1C2A40-3B7D-4C1E-9A55-0B2E8D71C403'

function outlineValue(id: number, value: string): Spec {
  return node(
    'Value',
    leaf('ValueID', id),
    leaf('FieldGUID', OUTLINE_GUID),
    leaf('Type', sampleValue('Project/OutlineCodes/OutlineCode/Values/Value/Type')),
    leaf('Value', value),
    leaf('Description', `${value} side`),
  )
}

function outlineCodes(): Spec {
  return node(
    'OutlineCodes',
    node(
      'OutlineCode',
      leaf('Guid', OUTLINE_GUID),
      leaf('FieldID', 188744096),
      leaf('FieldName', 'Outline Code1'),
      leaf('Alias', 'Area'),
      node('Values', outlineValue(1, 'North'), outlineValue(2, 'South')),
      leaf('OnlyTableValuesAllowed', 0),
    ),
  )
}

function definition(fieldId: number, fieldName: string, alias: string): Spec {
  return node('ExtendedAttribute', leaf('FieldID', fieldId), leaf('FieldName', fieldName), leaf('Alias', alias))
}

function weekDay(dayType: number): Spec {
  const working = dayType !== 1 && dayType !== 7
  if (!working) return node('WeekDay', leaf('DayType', dayType), leaf('DayWorking', 0))
  return node(
    'WeekDay',
    leaf('DayType', dayType),
    leaf('DayWorking', 1),
    node(
      'WorkingTimes',
      node('WorkingTime', leaf('FromTime', '08:00:00'), leaf('ToTime', '12:00:00')),
      node('WorkingTime', leaf('FromTime', '13:00:00'), leaf('ToTime', '17:00:00')),
    ),
  )
}

function calendars(): Spec {
  return node(
    'Calendars',
    node(
      'Calendar',
      leaf('UID', 1),
      leaf('Name', 'Standard'),
      leaf('IsBaseCalendar', 1),
      leaf('BaseCalendarUID', -1),
      node('WeekDays', ...[1, 2, 3, 4, 5, 6, 7].map(weekDay)),
    ),
  )
}

function timephased(uid: number, from: number, to: number): Spec {
  return node(
    'TimephasedData',
    leaf('Type', sampleValue('Project/Tasks/Task/TimephasedData/Type')),
    leaf('UID', uid),
    leaf('Start', day(from)),
    leaf('Finish', day(to)),
    leaf('Unit', sampleValue('Project/Tasks/Task/TimephasedData/Unit')),
    leaf('Value', hours(8)),
  )
}

export interface TaskRow {
  readonly uid: number
  readonly name: string
  readonly outlineNumber: string
  readonly level: number
  readonly summary: boolean
  readonly start: number
  readonly finish: number
  readonly durationHours: number
  readonly extra: readonly Spec[]
}

function link(predecessorUid: number): Spec {
  return node(
    'PredecessorLink',
    leaf('PredecessorUID', predecessorUid),
    leaf('Type', 1),
    leaf('CrossProject', 0),
    leaf('LinkLag', 0),
    leaf('LagFormat', 7),
  )
}

export const TASK_ROWS: readonly TaskRow[] = [
  { uid: 1, name: 'Deck', outlineNumber: '1', level: 1, summary: true, start: 6, finish: 30, durationHours: 144, extra: [] },
  {
    uid: 2,
    name: 'Piers',
    outlineNumber: '1.1',
    level: 2,
    summary: false,
    start: 6,
    finish: 10,
    durationHours: 32,
    extra: [
      node('ExtendedAttribute', leaf('FieldID', 188743731), leaf('Value', 'N-1')),
      timephased(2, 6, 7),
      timephased(2, 7, 8),
    ],
  },
  {
    uid: 3,
    name: 'Spans',
    outlineNumber: '1.2',
    level: 2,
    summary: false,
    start: 13,
    finish: 24,
    durationHours: 72,
    extra: [leaf('ConstraintDate', day(13)), link(2)],
  },
  {
    uid: 4,
    name: 'Railings',
    outlineNumber: '1.3',
    level: 2,
    summary: false,
    start: 27,
    finish: 30,
    durationHours: 24,
    extra: [link(3), link(2)],
  },
]

function task(row: TaskRow): Spec {
  return node(
    'Task',
    leaf('UID', row.uid),
    leaf('ID', row.uid),
    leaf('Name', row.name),
    leaf('OutlineNumber', row.outlineNumber),
    leaf('OutlineLevel', row.level),
    leaf('Start', day(row.start)),
    leaf('Finish', day(row.finish)),
    leaf('Duration', hours(row.durationHours)),
    leaf('DurationFormat', 7),
    leaf('Milestone', 0),
    leaf('Summary', row.summary ? 1 : 0),
    leaf('FreeSlack', 0),
    leaf('TotalSlack', 0),
    leaf('ConstraintType', row.uid === 3 ? 4 : 0),
    ...row.extra,
  )
}

export interface FixtureOptions {
  readonly saveVersion?: string
  readonly outlineCodes?: boolean
}

export function pj12Fixture(options: FixtureOptions = {}): Spec {
  const project = node(
    'Project',
    leaf('SaveVersion', options.saveVersion ?? '12'),
    leaf('Name', 'Bridge programme'),
    leaf('Title', 'Bridge programme plan'),
    leaf('StartDate', day(6)),
    leaf('FinishDate', day(30)),
    leaf('CurrencyCode', 'EUR'),
    leaf('CalendarUID', 1),
    leaf('MinutesPerDay', MINUTES_PER_DAY),
    leaf('MinutesPerWeek', MINUTES_PER_DAY * 5),
    leaf('DaysPerMonth', 20),
    leaf('WeekStartDay', 1),
    ...(options.outlineCodes === true ? [outlineCodes()] : []),
    node('ExtendedAttributes', definition(188743731, 'Text1', 'Site code'), definition(188743734, 'Text2', 'Crew note')),
    calendars(),
    node('Tasks', ...TASK_ROWS.map(task)),
    node('Resources', node('Resource', leaf('UID', 1), leaf('ID', 1), leaf('Name', 'Crew A'), leaf('Type', 1))),
    node(
      'Assignments',
      node(
        'Assignment',
        leaf('UID', 1),
        leaf('TaskUID', 2),
        leaf('ResourceUID', 1),
        leaf('Units', 1),
        timephased(1, 6, 7),
      ),
    ),
  )
  return inSchemaOrder(project)
}

export function pj15Fixture(): Spec {
  return withEveryPj15OnlyElement(pj12Fixture({ saveVersion: '14', outlineCodes: true }))
}

function uidOf(spec: Spec): string | undefined {
  return spec.children?.find((child) => child.name === 'UID')?.text
}

export function withTask(root: Spec, uid: number, change: (children: readonly Spec[]) => readonly Spec[]): Spec {
  const tasks = (root.children ?? []).map((child) => {
    if (child.name !== 'Tasks') return child
    const each = (child.children ?? []).map((one) =>
      uidOf(one) === String(uid) ? { ...one, children: change(one.children ?? []) } : one,
    )
    return { ...child, children: each }
  })
  return { ...root, children: tasks }
}

export function withTaskLeaves(root: Spec, uid: number, leaves: readonly Spec[]): Spec {
  const names = new Set(leaves.map((each) => each.name))
  return inSchemaOrder(withTask(root, uid, (children) => [...children.filter((each) => !names.has(each.name)), ...leaves]))
}

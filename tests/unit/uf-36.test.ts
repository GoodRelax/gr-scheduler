// Unit tests for UF-36 `mspdi-codec.ts` -- the MSPDI half of DocumentCodec
// (CP-20 of table T-062, published as PI-20 of table T-064, table T-075 of
// docs/spec/05-07-design.md).
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, docs/reference/mspdi/mspdi_pj12.xsd for the exchange partner's own
// facts (Chapter 6.2 names it the authority), and of the unit itself only its
// head comment, its four published types (`MspdiFault`, `MspdiNotice`,
// `MspdiDecoding`, `MspdiEncoding`), the constant `MSPDI_NAMESPACE` and the two
// signatures `documentFromMspdi(text, current)` and `mspdiFromDocument(doc)`.
// Every expected value here comes from a requirement, a table or the official
// schema -- never from the implementation.
//
// The rules these cases answer to:
//   FR-021 / table T-053  one MSPDI in, not merged, not edited, out again is
//                         the same file. DF-1 interpreted elements keep the
//                         partner's position, DF-2/DF-3 uninterpreted ones go
//                         to their OWNER's carryElements and never to the root,
//                         DF-4 a dependency nests under its successor with no
//                         back-pointer and no order column, DF-5 what GRS adds
//                         is a new grouping and never borrows a partner slot
//   FR-057 / table T-033  EX-1 valid against the official schema (which is an
//                         xsd:sequence, so declared child order is the only
//                         valid order), EX-2 an unedited task is not rewritten,
//                         EX-4 the arrived spelling is kept, EX-5 an empty row
//                         goes back in its original place and form, EX-7 a date
//                         GRS decides itself is written at 00:00:00
//   FR-054                a date column takes the LITERAL text, no time zone
//                         conversion, the time part kept; working days convert
//                         through Project.minutesPerDay, falling back to S-128
//                         of table T-209; recurring exception days are not
//                         expanded and the person is told (NT-5 of table T-037)
//   FR-058                every imported Task lands on a row; one TaskGroup per
//                         Task down to S-125 and none below it; the cap never
//                         refuses the import
//   FR-023                two of its MUSTs are about the parser and land here:
//                         XML external entities are disabled and nothing
//                         reaches innerHTML. The ceilings, the dates, the
//                         counts and the ring check are CP-13's
//   FR-028                a failure is a VALUE. Nothing here may throw
//   table T-058 / T-059   the column-by-column mapping, and the values that are
//                         made at write time rather than stored
//   table T-019           which plan/actual state writes a Stop, and the note
//                         that a carried original beats the computed value
//   table T-005 G-13      Carry is what GRS does not use, plus Stop
//   Chapter 5.4           Task.wbsParentUid is the exported axis; TaskGroup and
//                         TaskGroupMember are GRS's own and never cross
//   Chapter 6.1 T-220     IV-1 primary keys unique, IV-6 every Task on exactly
//                         one row, IV-7 at least one calendar, IV-8 a row's
//                         label and derivedFromTaskUid are not both null
//
// Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table, one test walking every row. T_058_MSPDI,
// T_019_STOP, T_053_ROWS, T_033_ROWS, T_059_ROWS, AT_17_WEEK_START and
// AT_73_DAY_TYPE below are those copies. The declared child order is not copied
// at all: it is read out of the official schema at run time, so it cannot fall
// behind it.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import {
  MSPDI_NAMESPACE,
  documentFromMspdi,
  mspdiFromDocument,
  type MspdiDecoding,
  type MspdiEncoding,
  type MspdiFault,
  type MspdiNotice,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { DEFAULT_CALENDAR_VALUES } from '../../src/entity/document-model/schedule/schedule'
import { validateDocument } from '../fixtures/grs-document'

// ---------------------------------------------------------------------------
// The exchange partner's own facts, read from the official schema.
// Chapter 6.2 names mspdi_pj12.xsd the authority and docs/reference/README.md
// says the local copy is where a fact is confirmed, so nothing below re-types
// an element order, and a schema revision cannot leave a copy here stale.
// ---------------------------------------------------------------------------

const XSD_PATH = join(process.cwd(), 'docs', 'reference', 'mspdi', 'mspdi_pj12.xsd')

/**
 * For every element path below `Project`, the order the schema declares its
 * children in. The complex types are xsd:sequence throughout, so this order is
 * the only one EX-1 (valid against the official schema, MUST) accepts.
 */
function declaredChildOrder(): ReadonlyMap<string, readonly string[]> {
  const source = readFileSync(XSD_PATH, 'utf8')
  const order = new Map<string, string[]>()
  const open: (string | null)[] = []
  const tag = /<(\/?)(xsd:[A-Za-z]+)([^>]*?)(\/?)>/g
  let hit: RegExpExecArray | null
  while ((hit = tag.exec(source)) !== null) {
    const closing = hit[1] === '/'
    const kind = hit[2] ?? ''
    const attributes = hit[3] ?? ''
    const selfClosing = hit[4] === '/'
    if (closing) {
      open.pop()
      continue
    }
    const named = /name="([^"]+)"/.exec(attributes)
    const name = named === null ? null : (named[1] ?? null)
    const carriesName = kind === 'xsd:element' || kind === 'xsd:complexType'
    if (kind === 'xsd:element' && name !== null) {
      const path = open.filter((each): each is string => each !== null).join('/')
      const list = order.get(path) ?? []
      list.push(name)
      order.set(path, list)
    }
    if (!selfClosing) open.push(carriesName ? name : null)
  }
  return order
}

const CHILD_ORDER = declaredChildOrder()

/** The two children of `Project` the schema makes mandatory (no minOccurs). */
const MANDATORY_PROJECT_CHILDREN = ['SaveVersion', 'CurrencyCode'] as const

// ---------------------------------------------------------------------------
// Fixed copies of the specification tables these cases are driven by.
// ---------------------------------------------------------------------------

/** Table T-053 -- the five rules that shape the document. */
const T_053_ROWS = ['DF-1', 'DF-2', 'DF-3', 'DF-4', 'DF-5'] as const

/** Table T-033 -- the seven rules of writing. */
const T_033_ROWS = ['EX-1', 'EX-2', 'EX-3', 'EX-4', 'EX-5', 'EX-6', 'EX-7'] as const

/** Table T-059 -- the ten values that are made at write time, not stored. */
const T_059_ROWS = [
  { row: 'DV-1', entity: 'Project', element: 'FinishDate' },
  { row: 'DV-2', entity: 'Project', element: 'SaveVersion' },
  { row: 'DV-3', entity: 'Project', element: 'CurrencyCode' },
  { row: 'DV-4', entity: 'Task', element: 'ID' },
  { row: 'DV-5', entity: 'Task', element: 'OutlineLevel' },
  { row: 'DV-6', entity: 'Task', element: 'OutlineNumber' },
  { row: 'DV-7', entity: 'Task', element: 'Summary' },
  { row: 'DV-8', entity: 'Task', element: 'Duration' },
  { row: 'DV-9', entity: 'Task', element: 'Stop' },
  { row: 'DV-10', entity: 'Resource', element: 'ID' },
] as const

/**
 * Table T-019 -- which plan/actual state writes a `Stop`. The last column of
 * that table is the only thing driven here; the state itself is table T-019a's
 * and is settled by the columns the fixture puts on each task.
 */
const T_019_STOP = [
  { row: 'PA-1', state: 'not started', uid: 101, writesStop: false },
  { row: 'PA-2', state: 'in progress', uid: 102, writesStop: false },
  { row: 'PA-3', state: 'suspended, resume planned', uid: 103, writesStop: true },
  { row: 'PA-4', state: 'suspended, resume unknown', uid: 104, writesStop: true },
  { row: 'PA-5', state: 'finished', uid: 105, writesStop: false },
] as const

/**
 * AT-17 -- `Project/WeekStartDay`, 0 = Sunday .. 6 = Saturday
 * (mspdi_pj12.xsd:595). Nothing in this unit converts it.
 */
const AT_17_WEEK_START = [0, 1, 2, 3, 4, 5, 6] as const

/**
 * AT-73 -- `WeekDay/DayType`, 1 = Sunday .. 7 = Saturday (mspdi_pj12.xsd:1249).
 * ONE APART from AT-17, and the row says so in as many words. 0 means an
 * exception day and is not this column's business.
 */
const AT_73_DAY_TYPE = [1, 2, 3, 4, 5, 6, 7] as const

// ---------------------------------------------------------------------------
// The values the fixture puts into the exchange partner's elements. One
// constant is used by both the XML and the table below it, so the fixture and
// the expectation cannot drift apart.
// ---------------------------------------------------------------------------

const SAMPLE = {
  saveVersion: '12',
  projectId: 'PRJ-1',
  projectName: 'Riverside programme',
  projectTitle: 'Riverside programme plan',
  projectSubject: 'Delivery of the riverside works',
  projectCategory: 'Construction',
  projectCompany: 'Client organisation',
  projectManager: 'Manager A',
  projectAuthor: 'Planner A',
  projectCreated: '2026-03-06T09:15:00',
  projectRevision: 37,
  projectLastSaved: '2027-06-14T18:40:00',
  projectStart: '2026-04-01T08:30:00',
  // Deliberately NOT the latest Task/Finish: DV-1 would compute a different
  // one, and G-13 of table T-005 says the arrived value is what goes back.
  projectFinish: '2030-01-01T00:00:00',
  currencyCode: 'JPY',
  currencyDigits: '2',
  // S-128's own number, so that every case below reads the same working days
  // whichever of FR-054's two sources is consulted. The one case that has to
  // tell the two apart states a different number of its own.
  minutesPerDay: DEFAULT_CALENDAR_VALUES['S-128'],
  minutesPerWeek: 3000,
  daysPerMonth: 20,
  weekStartDay: 1,
  projectStatusDate: '2027-06-04T00:00:00',

  calendarUid: 3,
  calendarName: 'Site calendar',
  baseCalendarUid: -1,
  mondayDayType: 2,
  exceptionName: 'New Year',
  exceptionFrom: '2027-01-01T00:00:00',
  exceptionTo: '2027-01-01T23:59:00',
  exceptionRecurring: 2,
  exceptionOccurrences: '1',

  taskUid: 1,
  taskName: 'Survey the site',
  taskStart: '2026-04-01T09:30:00',
  taskFinish: '2026-04-10T17:15:00',
  taskDeadline: '2026-04-15T07:45:00',
  taskNotes: 'Weather dependent',
  taskActualStart: '2026-04-02T09:00:00',
  taskActualFinish: '2026-04-09T18:00:00',
  taskResume: '2026-04-20T08:00:00',
  taskPercentComplete: 100,
  taskActualDurationDays: 5,
  taskPriority: '500',
  taskHyperlink: 'plan',
  /** EX-3's subject: a file that carries effort. */
  taskWork: 'PT80H0M0S',

  childUid: 2,
  childName: 'Pour the foundations',
  childStart: '2026-04-13T09:00:00',
  childFinish: '2026-04-24T17:00:00',

  resourceUid: 5,
  resourceName: 'Surveyor A',
  resourceKind: 1,
  resourceInitials: 'SA',

  assignmentUid: 7,

  linkType: 1,
  lag: 480,
  lagFormat: 7,
  crossProject: '0',
} as const

/** The exchange partner spells a duration as xsd:duration (mspdi_pj12.xsd:1929). */
function durationText(minutes: number): string {
  return `PT${Math.floor(minutes / 60)}H${minutes % 60}M0S`
}

const ACTUAL_DURATION_TEXT = durationText(SAMPLE.minutesPerDay * SAMPLE.taskActualDurationDays)

// ---------------------------------------------------------------------------
// The fixture itself.
// ---------------------------------------------------------------------------

/** Wraps a body as one MSPDI document. The namespace is the unit's own constant. */
function mspdi(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Project xmlns="${MSPDI_NAMESPACE}">\n${body}\n</Project>\n`
}

/**
 * Seven weekdays, Sunday and Saturday not working. The document calendar must
 * have at least one working weekday (IV-17 of table T-220), and the working
 * five are S-106 of table T-209 -- read from the generated constant, since the
 * numbering the row is stated in is AT-73's.
 */
const WORKING_DAY_TYPES: readonly number[] = DEFAULT_CALENDAR_VALUES['S-106']

function weekDaysXml(): string {
  return AT_73_DAY_TYPE.map((dayType) => {
    const working = WORKING_DAY_TYPES.includes(dayType)
    // One WeekDay carries an element this software does not interpret, so
    // AT-76 has something to hold (DF-2).
    const times =
      dayType === SAMPLE.mondayDayType
        ? '<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>'
        : ''
    return `<WeekDay><DayType>${dayType}</DayType><DayWorking>${working ? 1 : 0}</DayWorking>${times}</WeekDay>`
  }).join('\n        ')
}

function calendarXml(recurrenceKind: number): string {
  return `  <Calendars>
    <Calendar>
      <UID>${SAMPLE.calendarUid}</UID>
      <Name>${SAMPLE.calendarName}</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>${SAMPLE.baseCalendarUid}</BaseCalendarUID>
      <WeekDays>
        ${weekDaysXml()}
      </WeekDays>
      <Exceptions>
        <Exception>
          <TimePeriod><FromDate>${SAMPLE.exceptionFrom}</FromDate><ToDate>${SAMPLE.exceptionTo}</ToDate></TimePeriod>
          <Occurrences>${SAMPLE.exceptionOccurrences}</Occurrences>
          <Name>${SAMPLE.exceptionName}</Name>
          <Type>${recurrenceKind}</Type>
          <DayWorking>0</DayWorking>
          <WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>
        </Exception>
      </Exceptions>
      <WorkWeeks><WorkWeek><Name>Shutdown</Name></WorkWeek></WorkWeeks>
    </Calendar>
  </Calendars>`
}

/** The two tasks of the base fixture, in the schema's declared child order. */
const TASKS_XML = `  <Tasks>
    <Task>
      <UID>${SAMPLE.taskUid}</UID>
      <ID>0</ID>
      <Name>${SAMPLE.taskName}</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Priority>${SAMPLE.taskPriority}</Priority>
      <Start>${SAMPLE.taskStart}</Start>
      <Finish>${SAMPLE.taskFinish}</Finish>
      <Work>${SAMPLE.taskWork}</Work>
      <Resume>${SAMPLE.taskResume}</Resume>
      <ResumeValid>1</ResumeValid>
      <Milestone>0</Milestone>
      <Summary>1</Summary>
      <PercentComplete>${SAMPLE.taskPercentComplete}</PercentComplete>
      <ActualStart>${SAMPLE.taskActualStart}</ActualStart>
      <ActualFinish>${SAMPLE.taskActualFinish}</ActualFinish>
      <ActualDuration>${ACTUAL_DURATION_TEXT}</ActualDuration>
      <CalendarUID>${SAMPLE.calendarUid}</CalendarUID>
      <Deadline>${SAMPLE.taskDeadline}</Deadline>
      <Hyperlink>${SAMPLE.taskHyperlink}</Hyperlink>
      <Notes>${SAMPLE.taskNotes}</Notes>
      <ExtendedAttribute><FieldID>188743731</FieldID><Value>7</Value></ExtendedAttribute>
    </Task>
    <Task>
      <UID>${SAMPLE.childUid}</UID>
      <ID>1</ID>
      <Name>${SAMPLE.childName}</Name>
      <OutlineNumber>1.1</OutlineNumber>
      <OutlineLevel>2</OutlineLevel>
      <Start>${SAMPLE.childStart}</Start>
      <Finish>${SAMPLE.childFinish}</Finish>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <PredecessorLink>
        <PredecessorUID>${SAMPLE.taskUid}</PredecessorUID>
        <Type>${SAMPLE.linkType}</Type>
        <CrossProject>${SAMPLE.crossProject}</CrossProject>
        <LinkLag>${SAMPLE.lag}</LinkLag>
        <LagFormat>${SAMPLE.lagFormat}</LagFormat>
      </PredecessorLink>
    </Task>
  </Tasks>`

const RESOURCES_XML = `  <Resources>
    <Resource>
      <UID>${SAMPLE.resourceUid}</UID>
      <ID>0</ID>
      <Name>${SAMPLE.resourceName}</Name>
      <Type>${SAMPLE.resourceKind}</Type>
      <Initials>${SAMPLE.resourceInitials}</Initials>
      <CalendarUID>${SAMPLE.calendarUid}</CalendarUID>
      <IsCostResource>0</IsCostResource>
      <Rates><Rate><RateTable>0</RateTable></Rate></Rates>
    </Resource>
  </Resources>`

const ASSIGNMENTS_XML = `  <Assignments>
    <Assignment>
      <UID>${SAMPLE.assignmentUid}</UID>
      <TaskUID>${SAMPLE.taskUid}</TaskUID>
      <ResourceUID>${SAMPLE.resourceUid}</ResourceUID>
      <Units>1</Units>
      <Baseline><Number>0</Number></Baseline>
    </Assignment>
  </Assignments>`

function projectHeadXml(): string {
  return `  <SaveVersion>${SAMPLE.saveVersion}</SaveVersion>
  <UID>${SAMPLE.projectId}</UID>
  <Name>${SAMPLE.projectName}</Name>
  <Title>${SAMPLE.projectTitle}</Title>
  <Subject>${SAMPLE.projectSubject}</Subject>
  <Category>${SAMPLE.projectCategory}</Category>
  <Company>${SAMPLE.projectCompany}</Company>
  <Manager>${SAMPLE.projectManager}</Manager>
  <Author>${SAMPLE.projectAuthor}</Author>
  <CreationDate>${SAMPLE.projectCreated}</CreationDate>
  <Revision>${SAMPLE.projectRevision}</Revision>
  <LastSaved>${SAMPLE.projectLastSaved}</LastSaved>
  <StartDate>${SAMPLE.projectStart}</StartDate>
  <FinishDate>${SAMPLE.projectFinish}</FinishDate>
  <CurrencyDigits>${SAMPLE.currencyDigits}</CurrencyDigits>
  <CurrencyCode>${SAMPLE.currencyCode}</CurrencyCode>
  <CalendarUID>${SAMPLE.calendarUid}</CalendarUID>
  <MinutesPerDay>${SAMPLE.minutesPerDay}</MinutesPerDay>
  <MinutesPerWeek>${SAMPLE.minutesPerWeek}</MinutesPerWeek>
  <DaysPerMonth>${SAMPLE.daysPerMonth}</DaysPerMonth>
  <WeekStartDay>${SAMPLE.weekStartDay}</WeekStartDay>
  <StatusDate>${SAMPLE.projectStatusDate}</StatusDate>
  <ExtendedAttributes>
    <ExtendedAttribute><FieldID>188743731</FieldID><FieldName>Text1</FieldName></ExtendedAttribute>
  </ExtendedAttributes>`
}

const BASE_TEXT = mspdi(
  [
    projectHeadXml(),
    calendarXml(SAMPLE.exceptionRecurring),
    TASKS_XML,
    RESOURCES_XML,
    ASSIGNMENTS_XML,
  ].join('\n'),
)

// ---------------------------------------------------------------------------
// A `current` document. FR-027's bundled template is the one document whose
// values the specification has actually decided, so it stands in for what
// MSPDI cannot carry (DR-3, DR-4, DR-5) rather than a second invented one.
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error(`the bundled template is not a GRS JSON document`)
  return read.document
}

const CURRENT = templateDocument()

// ---------------------------------------------------------------------------
// Reading the two published shapes without asserting them into place.
// ---------------------------------------------------------------------------

function accepted(text: string, current: Document = CURRENT): Document {
  const read: MspdiDecoding = documentFromMspdi(text, current)
  if (!read.ok) {
    throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

function noticesOf(text: string, current: Document = CURRENT): readonly MspdiNotice[] {
  const read: MspdiDecoding = documentFromMspdi(text, current)
  if (!read.ok) throw new Error('expected a document, was refused')
  return read.notices
}

function refused(text: string, current: Document = CURRENT): readonly MspdiFault[] {
  const read: MspdiDecoding = documentFromMspdi(text, current)
  if (read.ok) throw new Error('expected a refusal, was accepted')
  return read.faults
}

// ---------------------------------------------------------------------------
// A reader for what the writer produced. The unit holds no DOM (FR-023) and
// the test environment is node, so the cases need their own way to look at the
// written tree.
// ---------------------------------------------------------------------------

interface XmlNode {
  readonly name: string
  readonly attributes: Readonly<Record<string, string>>
  readonly text: string
  readonly children: readonly XmlNode[]
}

interface OpenNode {
  readonly name: string
  readonly attributes: Record<string, string>
  text: string
  readonly children: OpenNode[]
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

function parseXml(source: string): XmlNode {
  const open: OpenNode[] = []
  let root: OpenNode | null = null
  const tag = /<([^>]*)>/g
  let cursor = 0
  let hit: RegExpExecArray | null
  while ((hit = tag.exec(source)) !== null) {
    const between = source.slice(cursor, hit.index)
    cursor = tag.lastIndex
    const top = open[open.length - 1]
    if (top !== undefined) top.text += between
    const body = hit[1] ?? ''
    if (body.startsWith('?') || body.startsWith('!')) continue
    if (body.startsWith('/')) {
      open.pop()
      continue
    }
    const selfClosing = body.endsWith('/')
    const inner = selfClosing ? body.slice(0, -1) : body
    const name = inner.trim().split(/\s+/)[0] ?? ''
    const attributes: Record<string, string> = {}
    const attribute = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"]*)"/g
    let found: RegExpExecArray | null
    while ((found = attribute.exec(inner)) !== null) {
      attributes[found[1] ?? ''] = decodeEntities(found[2] ?? '')
    }
    const node: OpenNode = { name, attributes, text: '', children: [] }
    if (top !== undefined) top.children.push(node)
    else if (root === null) root = node
    if (!selfClosing) open.push(node)
  }
  if (root === null) throw new Error('the written text has no root element')
  return root as XmlNode
}

function childrenNamed(node: XmlNode, name: string): readonly XmlNode[] {
  return node.children.filter((each) => each.name === name)
}

function firstNamed(node: XmlNode, name: string): XmlNode | null {
  return childrenNamed(node, name)[0] ?? null
}

/** The node at a slash-separated path of element names, first match at each step. */
function nodeAt(node: XmlNode, path: string): XmlNode | null {
  let here: XmlNode | null = node
  for (const step of path.split('/')) {
    if (here === null) return null
    here = firstNamed(here, step)
  }
  return here
}

function textAt(node: XmlNode, path: string): string | null {
  const found = nodeAt(node, path)
  return found === null ? null : decodeEntities(found.text).trim()
}

function everyNodeName(node: XmlNode): readonly string[] {
  return [node.name, ...node.children.flatMap(everyNodeName)]
}

function written(document: Document): XmlNode {
  const encoding: MspdiEncoding = mspdiFromDocument(document)
  return parseXml(encoding.text)
}

/** Consecutive repeats collapsed, so a list of siblings can be matched against a sequence. */
function collapsed(names: readonly string[]): readonly string[] {
  return names.filter((name, index) => name !== names[index - 1])
}

function isSubsequence(part: readonly string[], whole: readonly string[]): boolean {
  let at = 0
  for (const name of part) {
    const found = whole.indexOf(name, at)
    if (found < 0) return false
    at = found + 1
  }
  return true
}

/** Every element whose declared order the official schema states, with its written children. */
function orderFaults(node: XmlNode, path: string): readonly string[] {
  const declared = CHILD_ORDER.get(path)
  const names = collapsed(node.children.map((each) => each.name))
  const here =
    declared !== undefined && !isSubsequence(names, declared)
      ? [`${path}: wrote ${names.join(', ')}`]
      : []
  return [...here, ...node.children.flatMap((each) => orderFaults(each, `${path}/${each.name}`))]
}

// ---------------------------------------------------------------------------
// Table T-058 -- the column-by-column mapping, as a fixed copy.
// ---------------------------------------------------------------------------

interface ColumnRow {
  /** The row of table T-058. */
  readonly row: string
  readonly entity: string
  readonly column: string
  /** The exchange partner's element, relative to the entity's own element. */
  readonly element: string
  /** What the model column must hold once the fixture is read. */
  readonly value: string | number | boolean
  /** The text the fixture put there, which an `Own` column must write back. */
  readonly text: string
  /** `Own` columns go back as the text that arrived (EX-4). */
  readonly own: boolean
}

function column(
  row: string,
  entity: string,
  name: string,
  element: string,
  value: string | number | boolean,
  own = true,
): ColumnRow {
  const text = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
  return { row, entity, column: name, element, value, text, own }
}

const T_058_MSPDI: readonly ColumnRow[] = [
  column('AT-1', 'Project', 'id', 'UID', SAMPLE.projectId),
  column('AT-2', 'Project', 'name', 'Name', SAMPLE.projectName),
  column('AT-3', 'Project', 'title', 'Title', SAMPLE.projectTitle),
  column('AT-4', 'Project', 'subject', 'Subject', SAMPLE.projectSubject),
  column('AT-5', 'Project', 'category', 'Category', SAMPLE.projectCategory),
  column('AT-6', 'Project', 'company', 'Company', SAMPLE.projectCompany),
  column('AT-7', 'Project', 'manager', 'Manager', SAMPLE.projectManager),
  column('AT-8', 'Project', 'author', 'Author', SAMPLE.projectAuthor),
  column('AT-9', 'Project', 'created', 'CreationDate', SAMPLE.projectCreated),
  column('AT-10', 'Project', 'revision', 'Revision', SAMPLE.projectRevision),
  column('AT-11', 'Project', 'lastSaved', 'LastSaved', SAMPLE.projectLastSaved),
  column('AT-12', 'Project', 'startDate', 'StartDate', SAMPLE.projectStart),
  column('AT-13', 'Project', 'statusDate', 'StatusDate', SAMPLE.projectStatusDate),
  column('AT-14', 'Project', 'minutesPerDay', 'MinutesPerDay', SAMPLE.minutesPerDay),
  column('AT-15', 'Project', 'minutesPerWeek', 'MinutesPerWeek', SAMPLE.minutesPerWeek),
  column('AT-16', 'Project', 'daysPerMonth', 'DaysPerMonth', SAMPLE.daysPerMonth),
  column('AT-17', 'Project', 'weekStartDay', 'WeekStartDay', SAMPLE.weekStartDay),
  column('AT-18', 'Project', 'calendarUid', 'CalendarUID', SAMPLE.calendarUid, false),

  column('AT-24', 'Task', 'uid', 'UID', SAMPLE.taskUid),
  column('AT-27', 'Task', 'name', 'Name', SAMPLE.taskName),
  column('AT-28', 'Task', 'start', 'Start', SAMPLE.taskStart),
  column('AT-29', 'Task', 'finish', 'Finish', SAMPLE.taskFinish),
  column('AT-30', 'Task', 'milestone', 'Milestone', false),
  column('AT-31', 'Task', 'deadline', 'Deadline', SAMPLE.taskDeadline),
  column('AT-32', 'Task', 'notes', 'Notes', SAMPLE.taskNotes),
  column('AT-33', 'Task', 'calendarUid', 'CalendarUID', SAMPLE.calendarUid, false),
  column('AT-34', 'Task', 'actualStart', 'ActualStart', SAMPLE.taskActualStart),
  column('AT-36', 'Task', 'actualFinish', 'ActualFinish', SAMPLE.taskActualFinish),
  column('AT-37', 'Task', 'resume', 'Resume', SAMPLE.taskResume),
  column('AT-38', 'Task', 'resumeValid', 'ResumeValid', true),
  column('AT-39', 'Task', 'percentComplete', 'PercentComplete', SAMPLE.taskPercentComplete),

  column('AT-45', 'Dependency', 'predecessorUid', 'PredecessorUID', SAMPLE.taskUid, false),
  column('AT-46', 'Dependency', 'linkType', 'Type', SAMPLE.linkType, false),
  column('AT-47', 'Dependency', 'lag', 'LinkLag', SAMPLE.lag, false),
  column('AT-48', 'Dependency', 'lagFormat', 'LagFormat', SAMPLE.lagFormat, false),

  column('AT-63', 'Calendar', 'uid', 'UID', SAMPLE.calendarUid),
  column('AT-64', 'Calendar', 'name', 'Name', SAMPLE.calendarName),
  column('AT-65', 'Calendar', 'isBaseCalendar', 'IsBaseCalendar', true),
  column('AT-66', 'Calendar', 'baseCalendarUid', 'BaseCalendarUID', SAMPLE.baseCalendarUid, false),

  column('AT-73', 'WeekDay', 'dayType', 'DayType', SAMPLE.mondayDayType),
  column('AT-74', 'WeekDay', 'dayWorking', 'DayWorking', true),

  column('AT-78', 'Exception', 'name', 'Name', SAMPLE.exceptionName),
  column('AT-79', 'Exception', 'fromDate', 'TimePeriod/FromDate', SAMPLE.exceptionFrom),
  column('AT-80', 'Exception', 'toDate', 'TimePeriod/ToDate', SAMPLE.exceptionTo),
  column('AT-81', 'Exception', 'dayWorking', 'DayWorking', false),
  column('AT-82', 'Exception', 'recurrenceKind', 'Type', SAMPLE.exceptionRecurring, false),

  column('AT-85', 'Resource', 'uid', 'UID', SAMPLE.resourceUid),
  column('AT-86', 'Resource', 'name', 'Name', SAMPLE.resourceName),
  column('AT-87', 'Resource', 'resourceKind', 'Type', SAMPLE.resourceKind),
  column('AT-88', 'Resource', 'isCostResource', 'IsCostResource', false),
  column('AT-89', 'Resource', 'calendarUid', 'CalendarUID', SAMPLE.calendarUid, false),

  column('AT-92', 'Assignment', 'uid', 'UID', SAMPLE.assignmentUid),
  column('AT-93', 'Assignment', 'taskUid', 'TaskUID', SAMPLE.taskUid, false),
  column('AT-94', 'Assignment', 'resourceUid', 'ResourceUID', SAMPLE.resourceUid, false),
]

/** The one instance of each entity the fixture carries. */
function instanceOf(document: Document, entity: string): Record<string, unknown> {
  const schedule = document.schedule
  const task = schedule.tasks.find((each) => each.uid === SAMPLE.taskUid)
  const child = schedule.tasks.find((each) => each.uid === SAMPLE.childUid)
  const calendar = schedule.calendars.find((each) => each.uid === SAMPLE.calendarUid)
  const monday = calendar?.weekDays.find((each) => each.dayType === SAMPLE.mondayDayType)
  const picked: Record<string, unknown> | undefined = {
    Project: schedule.project as unknown as Record<string, unknown>,
    Task: task as unknown as Record<string, unknown>,
    Dependency: child?.dependencies[0] as unknown as Record<string, unknown>,
    Calendar: calendar as unknown as Record<string, unknown>,
    WeekDay: monday as unknown as Record<string, unknown>,
    Exception: calendar?.exceptions[0] as unknown as Record<string, unknown>,
    Resource: schedule.resources[0] as unknown as Record<string, unknown>,
    Assignment: schedule.assignments[0] as unknown as Record<string, unknown>,
  }[entity]
  if (picked === undefined || picked === null) throw new Error(`no ${entity} was read`)
  return picked
}

/** The same instance in the written tree. */
function writtenInstance(root: XmlNode, entity: string): XmlNode {
  const tasks = nodeAt(root, 'Tasks')
  const found: XmlNode | null = {
    Project: root,
    Task: (tasks === null ? [] : childrenNamed(tasks, 'Task')).find(
      (each) => textAt(each, 'UID') === String(SAMPLE.taskUid),
    ) ?? null,
    Dependency:
      (tasks === null ? [] : childrenNamed(tasks, 'Task'))
        .find((each) => textAt(each, 'UID') === String(SAMPLE.childUid))
        ?.children.find((each) => each.name === 'PredecessorLink') ?? null,
    Calendar: nodeAt(root, 'Calendars/Calendar'),
    WeekDay:
      (nodeAt(root, 'Calendars/Calendar/WeekDays')?.children ?? []).find(
        (each) => textAt(each, 'DayType') === String(SAMPLE.mondayDayType),
      ) ?? null,
    Exception: nodeAt(root, 'Calendars/Calendar/Exceptions/Exception'),
    Resource: nodeAt(root, 'Resources/Resource'),
    Assignment: nodeAt(root, 'Assignments/Assignment'),
  }[entity] ?? null
  if (found === null) throw new Error(`the writer left out the ${entity}`)
  return found
}

// ---------------------------------------------------------------------------
// The rosters, before anything walks them.
// ---------------------------------------------------------------------------

describe('the rosters these cases walk', () => {
  // A walk over an empty roster passes without asserting anything. These pin
  // the counts so a vacuous case cannot go green.
  it('carries the counts the tables state', () => {
    expect(T_053_ROWS).toHaveLength(5)
    expect(T_033_ROWS).toHaveLength(7)
    expect(T_059_ROWS).toHaveLength(10)
    expect(T_019_STOP).toHaveLength(5)
    expect(AT_17_WEEK_START).toHaveLength(7)
    expect(AT_73_DAY_TYPE).toHaveLength(7)
    expect(T_058_MSPDI.length).toBeGreaterThan(40)
    expect(new Set(T_058_MSPDI.map((each) => each.row)).size).toBe(T_058_MSPDI.length)
  })

  it('reads the declared child order out of the official schema (Chapter 6.2)', () => {
    const project = CHILD_ORDER.get('Project')
    expect(project, 'mspdi_pj12.xsd declares Project').toBeDefined()
    for (const name of MANDATORY_PROJECT_CHILDREN) expect(project).toContain(name)
    expect(CHILD_ORDER.get('Project/Tasks')).toEqual(['Task'])
    expect(CHILD_ORDER.get('Project/Tasks/Task')?.[0]).toBe('UID')
    expect(CHILD_ORDER.get('Project/Calendars/Calendar/WeekDays/WeekDay')?.[0]).toBe('DayType')
  })

  it('reads a bundled template that stands in for what MSPDI cannot carry', () => {
    expect(validateDocument(CURRENT).errors).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// FR-023 -- the two MUSTs that are about the parser
// ---------------------------------------------------------------------------

describe('FR-023 -- external entities are disabled and nothing reaches innerHTML', () => {
  const DOCTYPES = [
    '<!DOCTYPE Project>',
    '<!DOCTYPE Project [<!ENTITY x "boom">]>',
    '<!DOCTYPE Project SYSTEM "http://example.invalid/x.dtd">',
    '<!DOCTYPE Project [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
  ]

  it('refuses any text that carries a DOCTYPE, entity or not', () => {
    for (const doctype of DOCTYPES) {
      const text = BASE_TEXT.replace('<Project', `${doctype}\n<Project`)
      const faults = documentFromMspdi(text, CURRENT)
      expect(faults.ok, doctype).toBe(false)
    }
  })

  it('does not expand an entity that a DOCTYPE declared', () => {
    const text = BASE_TEXT.replace('<Project', '<!DOCTYPE Project [<!ENTITY who "expanded">]>\n<Project').replace(
      SAMPLE.projectName,
      '&who;',
    )
    const read = documentFromMspdi(text, CURRENT)
    expect(read.ok).toBe(false)
    expect(JSON.stringify(read)).not.toContain('expanded')
  })

  it('keeps markup in a value as text, never as markup', () => {
    const text = BASE_TEXT.replace(
      SAMPLE.taskNotes,
      '&lt;img src=x onerror=alert(1)&gt; &amp; more',
    )
    const document = accepted(text)
    const task = instanceOf(document, 'Task')
    expect(task['notes']).toBe('<img src=x onerror=alert(1)> & more')
    // Round trip: the writer escapes it again rather than emitting live markup.
    const back = mspdiFromDocument(document).text
    expect(back).not.toContain('<img src=x')
    expect(accepted(back).schedule.tasks[0]?.notes).toBe('<img src=x onerror=alert(1)> & more')
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- a failure is a value, and NT-1 of table T-037 names the item
// ---------------------------------------------------------------------------

describe('FR-028 -- a failure is a VALUE, never a throw', () => {
  const NOT_MSPDI = [
    '',
    '   ',
    'hello',
    '<',
    '<Project>',
    '<Project></Projec',
    '{"schedule":{}}',
    String.fromCharCode(0, 1, 2),
    '<?xml version="1.0"?><Plan></Plan>',
    '<?xml version="1.0"?><project></project>',
  ]

  it('never throws, whatever the text is', () => {
    for (const text of [...NOT_MSPDI, BASE_TEXT]) {
      expect(() => documentFromMspdi(text, CURRENT), JSON.stringify(text.slice(0, 24))).not.toThrow()
    }
  })

  it('refuses a text that is not an MSPDI document at all', () => {
    for (const text of NOT_MSPDI) {
      expect(documentFromMspdi(text, CURRENT).ok, JSON.stringify(text.slice(0, 24))).toBe(false)
    }
  })

  it('says in words which item is wrong (NT-1 of table T-037)', () => {
    for (const text of NOT_MSPDI) {
      for (const fault of refused(text)) {
        expect(typeof fault.at, text).toBe('string')
        // The path is `` for the text as a whole, else rooted at the element.
        expect(fault.at === '' || fault.at.startsWith('/'), `${text} -> ${fault.at}`).toBe(true)
        expect(fault.what.trim().length, text).toBeGreaterThan(0)
        expect(fault.what.trim().split(/\s+/).length, `${text} -> ${fault.what}`).toBeGreaterThan(1)
      }
    }
  })

  it('loses nothing when an element the schema allows cannot become a row -- DELIBERATELY LEFT FAILING', () => {
    // AT-24, AT-63, AT-85 and AT-92 all mark the uid a non-null primary key,
    // but the official schema declares every one of those UIDs minOccurs="0"
    // (mspdi_pj12.xsd:1615 and its neighbours), so a file without one is still
    // an MSPDI document and FR-023 leaves the value checks to CP-13.
    // FR-021 (docs/spec/01-04-requirements.md:2811) asks for every item this
    // software does not use to be carried and written back, and DF-3 of table
    // T-053 (:2844) puts what did not become a row on the carryElements of
    // the parent that bundles it.
    // Either lawful answer is accepted here -- refuse and name the element, or
    // keep it -- so what this case forbids is dropping it in silence.
    const cases = [
      { why: 'a Task with no UID', text: BASE_TEXT.replace(`<UID>${SAMPLE.taskUid}</UID>`, '') },
      {
        why: 'a Calendar with no UID',
        text: BASE_TEXT.replace(`<UID>${SAMPLE.calendarUid}</UID>`, ''),
      },
      {
        why: 'a Resource with no UID',
        text: BASE_TEXT.replace(`<UID>${SAMPLE.resourceUid}</UID>`, ''),
      },
      {
        why: 'an Assignment with no UID',
        text: BASE_TEXT.replace(`<UID>${SAMPLE.assignmentUid}</UID>`, ''),
      },
    ]
    const dropped = cases.flatMap((each) => {
      const read = documentFromMspdi(each.text, CURRENT)
      if (!read.ok) {
        expect(read.faults.length, each.why).toBeGreaterThan(0)
        expect(read.faults.some((fault) => fault.at.length > 1), each.why).toBe(true)
        return []
      }
      const before = everyNodeName(parseXml(each.text)).length
      const after = everyNodeName(written(read.document)).length
      return after >= before ? [] : [`${each.why}: ${before - after} elements went missing`]
    })
    expect(dropped).toEqual([])
  })

  it('answers a write with notices beside the text, never a throw', () => {
    const encoding: MspdiEncoding = mspdiFromDocument(accepted(BASE_TEXT))
    expect(typeof encoding.text).toBe('string')
    expect(Array.isArray(encoding.notices)).toBe(true)
    for (const notice of encoding.notices) {
      expect(typeof notice.at).toBe('string')
      expect(notice.what.trim().length).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// The ordinary case
// ---------------------------------------------------------------------------

describe('the ordinary case -- one MSPDI in', () => {
  it('gives back a document the generated GRS JSON schema accepts', () => {
    const document = accepted(BASE_TEXT)
    expect(validateDocument(document).errors).toEqual([])
  })

  it('takes from `current` only what MSPDI cannot carry (DR-3, DR-4, DR-5)', () => {
    const document = accepted(BASE_TEXT)
    expect(document.schemaVersion).toBe(CURRENT.schemaVersion)
    expect(document.documentSettings).toEqual(CURRENT.documentSettings)
    expect(document.documentStamp).toEqual(CURRENT.documentStamp)
    expect(document.changeLog).toEqual(CURRENT.changeLog)
    expect(document.schedule.project.themeHue).toBe(CURRENT.schedule.project.themeHue)
    expect(document.schedule.project.importSeq).toBe(CURRENT.schedule.project.importSeq)
  })

  it('merges nothing of `current.schedule` -- that is FR-056, in CP-10', () => {
    const document = accepted(BASE_TEXT)
    expect(CURRENT.schedule.tasks.length).toBeGreaterThan(2)
    expect(document.schedule.tasks).toHaveLength(2)
    expect(document.schedule.taskVisuals).toEqual([])
    expect(document.schedule.commentBoxes).toEqual([])
    expect(document.schedule.highlightBoxes).toEqual([])
    expect(document.schedule.taskOrigins).toEqual([])
    expect(document.schedule.baselineTasks).toEqual([])
  })

  it('keeps the calendar the file brought (IV-7 of table T-220)', () => {
    // A file that brings no <Calendars> at all is left out on purpose: IV-7
    // asks the document for one, FR-021 asks the writer not to add an element
    // the file did not have, and nothing settles which wins. Reported, not
    // asserted here.
    const document = accepted(BASE_TEXT)
    expect(document.schedule.calendars.length).toBeGreaterThanOrEqual(1)
    expect(document.schedule.calendars[0]?.uid).toBe(SAMPLE.calendarUid)
  })

  it('reads a file whose Tasks list is empty', () => {
    const empty = mspdi(
      `  <SaveVersion>12</SaveVersion>\n  <CurrencyCode>USD</CurrencyCode>\n  <Tasks></Tasks>\n  <Resources></Resources>\n  <Assignments></Assignments>`,
    )
    const document = accepted(empty)
    expect(document.schedule.tasks).toEqual([])
    expect(document.schedule.taskGroups).toEqual([])
    expect(document.schedule.taskGroupMembers).toEqual([])
    expect(validateDocument(document).errors).toEqual([])
  })

  it('carries the uid high-water mark past every uid it read (AT-20)', () => {
    const document = accepted(BASE_TEXT)
    const highest = Math.max(...document.schedule.tasks.map((each) => each.uid))
    expect(document.schedule.project.uidHighWaterMark).toBeGreaterThanOrEqual(highest)
  })
})

// ---------------------------------------------------------------------------
// Table T-058 -- the column-by-column mapping. One case walks every row.
// ---------------------------------------------------------------------------

describe('table T-058 -- the column-by-column mapping', () => {
  it('puts every exchanged column where its row says (one case, every row)', () => {
    const document = accepted(BASE_TEXT)
    for (const each of T_058_MSPDI) {
      const holder = instanceOf(document, each.entity)
      expect(holder[each.column], `${each.row} ${each.entity}.${each.column}`).toBe(each.value)
    }
  })

  it('writes every `Own` column back as the text that arrived (EX-4)', () => {
    const root = written(accepted(BASE_TEXT))
    for (const each of T_058_MSPDI) {
      if (!each.own) continue
      const holder = writtenInstance(root, each.entity)
      expect(textAt(holder, each.element), `${each.row} ${each.entity}/${each.element}`).toBe(
        each.text,
      )
    }
  })

  it('rebuilds every `Consume` column into the same element it came from', () => {
    const root = written(accepted(BASE_TEXT))
    for (const each of T_058_MSPDI) {
      if (each.own) continue
      const holder = writtenInstance(root, each.entity)
      expect(textAt(holder, each.element), `${each.row} ${each.entity}/${each.element}`).toBe(
        each.text,
      )
    }
  })

  it('holds a `Carry` map of the scalars it does not interpret (AT-22, AT-43, ...)', () => {
    const document = accepted(BASE_TEXT)
    const project = instanceOf(document, 'Project')
    const task = instanceOf(document, 'Task')
    const dependency = instanceOf(document, 'Dependency')
    const resource = instanceOf(document, 'Resource')
    const assignment = instanceOf(document, 'Assignment')
    const exception = instanceOf(document, 'Exception')
    expect((project['carry'] as Record<string, string>)['CurrencyDigits']).toBe(
      SAMPLE.currencyDigits,
    )
    expect((project['carry'] as Record<string, string>)['CurrencyCode']).toBe(SAMPLE.currencyCode)
    expect((task['carry'] as Record<string, string>)['Priority']).toBe(SAMPLE.taskPriority)
    expect((task['carry'] as Record<string, string>)['Hyperlink']).toBe(SAMPLE.taskHyperlink)
    expect((dependency['carry'] as Record<string, string>)['CrossProject']).toBe(
      SAMPLE.crossProject,
    )
    expect((resource['carry'] as Record<string, string>)['Initials']).toBe(SAMPLE.resourceInitials)
    expect((assignment['carry'] as Record<string, string>)['Units']).toBe('1')
    expect((exception['carry'] as Record<string, string>)['Occurrences']).toBe(
      SAMPLE.exceptionOccurrences,
    )
  })

  it('keeps the partner spelling of a carried name (W-9 of table T-006a)', () => {
    const document = accepted(BASE_TEXT)
    const project = instanceOf(document, 'Project')
    const names = Object.keys(project['carry'] as Record<string, string>)
    expect(names.length, 'the fixture brings scalars this software does not use').toBeGreaterThan(0)
    for (const name of names) {
      expect(name, 'a carried name is the partner spelling, not a lowercased one').not.toBe(
        name.toLowerCase(),
      )
    }
  })
})

// ---------------------------------------------------------------------------
// AT-17 / AT-73 -- the two weekday numberings, one apart
// ---------------------------------------------------------------------------

describe('AT-17 and AT-73 -- the two weekday numberings stay one apart', () => {
  it('keeps `Project/WeekStartDay` as the partner wrote it, for all seven', () => {
    for (const number of AT_17_WEEK_START) {
      const text = BASE_TEXT.replace(
        `<WeekStartDay>${SAMPLE.weekStartDay}</WeekStartDay>`,
        `<WeekStartDay>${number}</WeekStartDay>`,
      )
      const document = accepted(text)
      expect(document.schedule.project.weekStartDay, `WeekStartDay ${number}`).toBe(number)
      const root = written(document)
      expect(textAt(root, 'WeekStartDay'), `WeekStartDay ${number}`).toBe(String(number))
    }
  })

  it('keeps `WeekDay/DayType` as the partner wrote it, for all seven', () => {
    const document = accepted(BASE_TEXT)
    const calendar = document.schedule.calendars.find((each) => each.uid === SAMPLE.calendarUid)
    expect(calendar?.weekDays.map((each) => each.dayType)).toEqual([...AT_73_DAY_TYPE])
    const root = written(document)
    const weekDays = nodeAt(root, 'Calendars/Calendar/WeekDays')?.children ?? []
    expect(weekDays.map((each) => textAt(each, 'DayType'))).toEqual(
      AT_73_DAY_TYPE.map((each) => String(each)),
    )
  })

  it('converts neither into the other -- Monday is 1 in one and 2 in the other', () => {
    const document = accepted(BASE_TEXT)
    const calendar = document.schedule.calendars.find((each) => each.uid === SAMPLE.calendarUid)
    const working = calendar?.weekDays.filter((each) => each.dayWorking === true) ?? []
    expect(working.map((each) => each.dayType)).toEqual([...WORKING_DAY_TYPES])
    // S-108 of table T-209 is Monday in AT-17's numbering; S-106's first
    // working day is the same Monday in AT-73's. They must differ by one.
    expect(DEFAULT_CALENDAR_VALUES['S-106'][0]).toBe(DEFAULT_CALENDAR_VALUES['S-108'] + 1)
    expect(document.schedule.project.weekStartDay).toBe(SAMPLE.weekStartDay)
    expect(working[0]?.dayType).toBe(SAMPLE.weekStartDay + 1)
  })
})

// ---------------------------------------------------------------------------
// Table T-053 -- what the document keeps, and where
// ---------------------------------------------------------------------------

describe('table T-053 -- the shape of the document', () => {
  it('DF-1: an interpreted element stays in the partner`s own position', () => {
    const document = accepted(BASE_TEXT)
    const calendar = document.schedule.calendars.find((each) => each.uid === SAMPLE.calendarUid)
    // Not a flat table: the weekdays and the exceptions hang off their calendar.
    expect(calendar?.weekDays).toHaveLength(AT_73_DAY_TYPE.length)
    expect(calendar?.exceptions).toHaveLength(1)
    expect(Object.keys(document.schedule)).not.toContain('weekDays')
    expect(Object.keys(document.schedule)).not.toContain('exceptions')
  })

  it('DF-2 and DF-3: an uninterpreted element goes to its OWNER, not the root', () => {
    const document = accepted(BASE_TEXT)
    const owner = (holder: Record<string, unknown>): readonly string[] =>
      (holder['carryElements'] as readonly { readonly name: string }[]).map((each) => each.name)
    expect(owner(instanceOf(document, 'Task'))).toContain('ExtendedAttribute')
    expect(owner(instanceOf(document, 'Calendar'))).toContain('WorkWeeks')
    expect(owner(instanceOf(document, 'WeekDay'))).toContain('WorkingTimes')
    expect(owner(instanceOf(document, 'Exception'))).toContain('WorkingTimes')
    expect(owner(instanceOf(document, 'Resource'))).toContain('Rates')
    expect(owner(instanceOf(document, 'Assignment'))).toContain('Baseline')
    // MUST NOT: gathered at the root. The Project keeps only its own.
    const atTheRoot = owner(instanceOf(document, 'Project'))
    expect(atTheRoot).toContain('ExtendedAttributes')
    for (const name of ['ExtendedAttribute', 'WorkWeeks', 'WorkingTimes', 'Rates', 'Baseline']) {
      expect(atTheRoot, `${name} belongs to its owner, not the root`).not.toContain(name)
    }
  })

  it('DF-3: a Task that did not become a row hangs off the Project', () => {
    // The partner's tree bundles Tasks under Project, so that is where an
    // element which produced no row goes.
    const text = BASE_TEXT.replace(
      '  <Tasks>',
      `  <Tasks>\n    <Task><UID>90</UID><IsNull>1</IsNull></Task>`,
    )
    const document = accepted(text)
    const names = document.schedule.project.carryElements.map((each) => each.name)
    expect(names).toContain('Task')
    expect(document.schedule.tasks.map((each) => each.uid)).not.toContain(90)
  })

  it('DF-4: a dependency nests under its successor, with no back-pointer', () => {
    const document = accepted(BASE_TEXT)
    const successor = document.schedule.tasks.find((each) => each.uid === SAMPLE.childUid)
    const predecessor = document.schedule.tasks.find((each) => each.uid === SAMPLE.taskUid)
    expect(predecessor?.dependencies).toEqual([])
    expect(successor?.dependencies).toHaveLength(1)
    const dependency = successor?.dependencies[0]
    expect(dependency?.predecessorUid).toBe(SAMPLE.taskUid)
    // MUST NOT: a column naming the successor, and MUST NOT: a column for the
    // order of appearance. Table T-058 gives Dependency exactly six columns.
    expect(Object.keys(dependency ?? {}).sort()).toEqual(
      ['carry', 'carryElements', 'lag', 'lagFormat', 'linkType', 'predecessorUid'].sort(),
    )
  })

  it('DF-5: what GRS adds is its own grouping, not a borrowed partner slot', () => {
    const document = accepted(BASE_TEXT)
    // The rows are GRS's own keys of the schedule group (DR-2), and no partner
    // element was reused to hold them.
    expect(document.schedule.taskGroups.length).toBeGreaterThan(0)
    expect(document.schedule.taskGroupMembers.length).toBeGreaterThan(0)
    const carried = document.schedule.project.carryElements.map((each) => each.name)
    expect(carried).not.toContain('TaskGroup')
  })
})

// ---------------------------------------------------------------------------
// FR-054 -- dates, and the working-day conversion
// ---------------------------------------------------------------------------

describe('FR-054 -- a date column takes the literal text', () => {
  it('keeps the time part and converts no time zone', () => {
    const document = accepted(BASE_TEXT)
    const task = instanceOf(document, 'Task')
    expect(task['start']).toBe(SAMPLE.taskStart)
    expect(task['finish']).toBe(SAMPLE.taskFinish)
    expect(task['actualStart']).toBe(SAMPLE.taskActualStart)
    expect(String(task['start'])).toContain('T09:30:00')
  })

  it('keeps a date whose text carries a zone offset, character for character', () => {
    const offset = '2026-04-01T09:30:00+09:00'
    const text = BASE_TEXT.replace(SAMPLE.taskStart, offset)
    const document = accepted(text)
    expect(instanceOf(document, 'Task')['start']).toBe(offset)
    expect(textAt(writtenInstance(written(document), 'Task'), 'Start')).toBe(offset)
  })

  it('reads the working days of an actual duration through minutesPerDay', () => {
    const document = accepted(BASE_TEXT)
    expect(instanceOf(document, 'Task')['actualDuration']).toBe(SAMPLE.taskActualDurationDays)
  })

  it('follows the FILE`s own minutesPerDay before S-128 -- DELIBERATELY LEFT FAILING', () => {
    // FR-054 (docs/spec/01-04-requirements.md:2510) makes it a MUST that a
    // working day is converted to the exchange partner's amount of time through
    // `Project.minutesPerDay`, and through S-128 of table T-209 only when that
    // is empty. AT-35 of table T-058 says the same for this column. The file
    // below states a minutesPerDay of its own, so S-128 is not the divisor.
    const perDay = DEFAULT_CALENDAR_VALUES['S-128'] + 120
    const days = 4
    const text = BASE_TEXT.replace(
      `<MinutesPerDay>${SAMPLE.minutesPerDay}</MinutesPerDay>`,
      `<MinutesPerDay>${perDay}</MinutesPerDay>`,
    ).replace(ACTUAL_DURATION_TEXT, durationText(perDay * days))
    const document = accepted(text)
    expect(document.schedule.project.minutesPerDay).toBe(perDay)
    expect(instanceOf(document, 'Task')['actualDuration']).toBe(days)
  })

  it('writes an actual duration back through the file`s own minutesPerDay -- DELIBERATELY LEFT FAILING', () => {
    // The same MUST on the way out: AT-35 says the column is rebuilt with
    // `Project.minutesPerDay`, and FR-021 says an unedited file comes back as
    // it arrived. A conversion that used S-128 instead drops the element.
    const perDay = DEFAULT_CALENDAR_VALUES['S-128'] + 120
    const days = 4
    const arrived = durationText(perDay * days)
    const text = BASE_TEXT.replace(
      `<MinutesPerDay>${SAMPLE.minutesPerDay}</MinutesPerDay>`,
      `<MinutesPerDay>${perDay}</MinutesPerDay>`,
    ).replace(ACTUAL_DURATION_TEXT, arrived)
    expect(textAt(writtenInstance(written(accepted(text)), 'Task'), 'ActualDuration')).toBe(arrived)
  })

  it('falls back to S-128 of table T-209 when the file states no minutesPerDay', () => {
    const perDay = DEFAULT_CALENDAR_VALUES['S-128']
    const days = 2
    const text = BASE_TEXT.replace(
      `  <MinutesPerDay>${SAMPLE.minutesPerDay}</MinutesPerDay>\n`,
      '',
    ).replace(ACTUAL_DURATION_TEXT, durationText(perDay * days))
    const document = accepted(text)
    expect(document.schedule.project.minutesPerDay).toBeNull()
    expect(instanceOf(document, 'Task')['actualDuration']).toBe(days)
  })

  it('rebuilds the actual duration on the way out with the same conversion', () => {
    const root = written(accepted(BASE_TEXT))
    expect(textAt(writtenInstance(root, 'Task'), 'ActualDuration')).toBe(ACTUAL_DURATION_TEXT)
  })

  it('does not expand a recurring exception day, and says so (NT-5 of table T-037)', () => {
    // AT-82: 9 is "no recurrence"; anything else repeats.
    const once = mspdi(
      [projectHeadXml(), calendarXml(9), TASKS_XML, RESOURCES_XML, ASSIGNMENTS_XML].join('\n'),
    )
    const recurring = noticesOf(BASE_TEXT)
    const single = noticesOf(once)
    expect(recurring.length).toBeGreaterThan(single.length)
    const document = accepted(BASE_TEXT)
    const exception = instanceOf(document, 'Exception')
    // Not expanded into real days: the row keeps the recurrence and the two
    // dates the file gave, and no extra Exception was invented.
    expect(exception['recurrenceKind']).toBe(SAMPLE.exceptionRecurring)
    expect(document.schedule.calendars[0]?.exceptions).toHaveLength(1)
    expect(recurring.some((notice) => notice.what.trim().length > 0)).toBe(true)
  })

  it('accepts an actual duration that is not a whole number of working days', () => {
    // No row states a rounding, and AT-35 types the column as whole working
    // days, so the only thing FR-023 settles is that the file is not refused:
    // the ceilings and the value checks are ValidateImportedDocument's.
    const text = BASE_TEXT.replace(
      ACTUAL_DURATION_TEXT,
      durationText(SAMPLE.minutesPerDay * 2 + 1),
    )
    const read = documentFromMspdi(text, CURRENT)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    const stored = read.document.schedule.tasks.find((each) => each.uid === SAMPLE.taskUid)
      ?.actualDuration
    expect(stored === null || Number.isInteger(stored)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// FR-058 -- every imported Task lands on a row
// ---------------------------------------------------------------------------

const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** A WBS `depth` levels deep, one Task per level, each the child of the last. */
function nestedTasksText(depth: number): string {
  const tasks: string[] = []
  for (let level = 1; level <= depth; level += 1) {
    const number = Array.from({ length: level }, () => '1').join('.')
    tasks.push(
      `    <Task><UID>${level}</UID><ID>${level - 1}</ID><Name>Level ${level}</Name>` +
        `<OutlineNumber>${number}</OutlineNumber><OutlineLevel>${level}</OutlineLevel>` +
        `<Start>2026-04-01T08:00:00</Start><Finish>2026-04-30T17:00:00</Finish></Task>`,
    )
  }
  return mspdi(
    [
      projectHeadXml(),
      calendarXml(9),
      `  <Tasks>\n${tasks.join('\n')}\n  </Tasks>`,
      RESOURCES_XML,
    ].join('\n'),
  )
}

const MAX_GROUP_DEPTH = CURRENT.documentSettings.maxGroupDepth

function rowDepth(document: Document, id: string): number {
  const byId = new Map(document.schedule.taskGroups.map((each) => [each.id, each]))
  let depth = 0
  let at: string | null = id
  while (at !== null) {
    depth += 1
    at = byId.get(at)?.parentId ?? null
    if (depth > 100) throw new Error('the row tree has a ring')
  }
  return depth
}

describe('FR-058 -- the imported tasks land on rows', () => {
  it('leaves no Task off a row, and puts each on exactly one (IV-6)', () => {
    for (const depth of [1, 2, MAX_GROUP_DEPTH, MAX_GROUP_DEPTH + 3]) {
      const document = accepted(nestedTasksText(depth))
      const members = document.schedule.taskGroupMembers
      for (const task of document.schedule.tasks) {
        const mine = members.filter((each) => each.taskUid === task.uid)
        expect(mine, `depth ${depth}, task ${task.uid}`).toHaveLength(1)
      }
      expect(members).toHaveLength(document.schedule.tasks.length)
    }
  })

  it('makes one row per Task down to S-125, and none below it', () => {
    const deeper = MAX_GROUP_DEPTH + 3
    const document = accepted(nestedTasksText(deeper))
    expect(document.schedule.tasks).toHaveLength(deeper)
    expect(document.schedule.taskGroups).toHaveLength(MAX_GROUP_DEPTH)
    for (const group of document.schedule.taskGroups) {
      expect(rowDepth(document, group.id)).toBeLessThanOrEqual(MAX_GROUP_DEPTH)
    }
  })

  it('puts the tasks under the cap on the deepest ancestor`s row', () => {
    const deeper = MAX_GROUP_DEPTH + 3
    const document = accepted(nestedTasksText(deeper))
    const byId = new Map(document.schedule.taskGroups.map((each) => [each.id, each]))
    const deepest = document.schedule.taskGroups.find(
      (each) => rowDepth(document, each.id) === MAX_GROUP_DEPTH,
    )
    expect(deepest).toBeDefined()
    for (const uid of [MAX_GROUP_DEPTH, MAX_GROUP_DEPTH + 1, deeper]) {
      const member = document.schedule.taskGroupMembers.find((each) => each.taskUid === uid)
      expect(member?.groupId, `task ${uid}`).toBe(deepest?.id)
      expect(byId.get(member?.groupId ?? '')).toBeDefined()
    }
  })

  it('never refuses the import for the depth of the rows (MUST NOT)', () => {
    for (const depth of [MAX_GROUP_DEPTH + 1, MAX_GROUP_DEPTH * 4]) {
      const read = documentFromMspdi(nestedTasksText(depth), CURRENT)
      expect(read.ok, `depth ${depth}`).toBe(true)
    }
  })

  it('keeps the WBS depth whatever the row cap is (Chapter 5.4)', () => {
    const deeper = MAX_GROUP_DEPTH + 3
    const document = accepted(nestedTasksText(deeper))
    for (let level = 1; level <= deeper; level += 1) {
      const task = document.schedule.tasks.find((each) => each.uid === level)
      expect(task?.wbsParentUid, `level ${level}`).toBe(level === 1 ? null : level - 1)
    }
  })

  it('gives every generated row a derived name and no label (IV-8)', () => {
    const document = accepted(nestedTasksText(MAX_GROUP_DEPTH + 3))
    for (const group of document.schedule.taskGroups) {
      expect(group.label).toBeNull()
      expect(group.derivedFromTaskUid).not.toBeNull()
      expect(document.schedule.tasks.map((each) => each.uid)).toContain(group.derivedFromTaskUid)
    }
  })

  it('gives every row a UUID, and no two the same (AT-51, IV-1)', () => {
    const document = accepted(nestedTasksText(MAX_GROUP_DEPTH + 3))
    const ids = document.schedule.taskGroups.map((each) => each.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id, 'AT-51 types the row id a UUID').toMatch(UUID_SHAPE)
  })

  it('reads a Task at OutlineLevel 1 as a root (S-115 counts the root as depth 1)', () => {
    const document = accepted(BASE_TEXT)
    const root = document.schedule.tasks.find((each) => each.uid === SAMPLE.taskUid)
    expect(root?.wbsParentUid).toBeNull()
    const child = document.schedule.tasks.find((each) => each.uid === SAMPLE.childUid)
    expect(child?.wbsParentUid).toBe(SAMPLE.taskUid)
  })

  it('still lands a Task with no OutlineLevel on a row', () => {
    const text = BASE_TEXT.replace('<OutlineLevel>1</OutlineLevel>', '').replace(
      '<OutlineLevel>2</OutlineLevel>',
      '',
    )
    const document = accepted(text)
    expect(document.schedule.tasks).toHaveLength(2)
    for (const task of document.schedule.tasks) {
      expect(
        document.schedule.taskGroupMembers.filter((each) => each.taskUid === task.uid),
      ).toHaveLength(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Chapter 5.4 -- the two axes. One crosses the wire, the other does not.
// ---------------------------------------------------------------------------

describe('Chapter 5.4 -- only the WBS axis crosses the wire', () => {
  it('writes no row and no member into the XML', () => {
    const text = mspdiFromDocument(accepted(BASE_TEXT)).text
    for (const name of [
      'TaskGroup',
      'TaskGroupMember',
      'taskGroups',
      'taskGroupMembers',
      'carryElements',
      'wbsParentUid',
      'themeHue',
    ]) {
      expect(text, `${name} is GRS's own and never crosses`).not.toContain(name)
    }
  })

  it('writes the WBS depth back as OutlineLevel (DV-5), never rounded shallower', () => {
    const deeper = MAX_GROUP_DEPTH + 3
    const document = accepted(nestedTasksText(deeper))
    const root = written(document)
    const tasks = childrenNamed(nodeAt(root, 'Tasks') ?? root, 'Task')
    expect(tasks).toHaveLength(deeper)
    expect(tasks.map((each) => textAt(each, 'OutlineLevel'))).toEqual(
      Array.from({ length: deeper }, (_, index) => String(index + 1)),
    )
  })
})

// ---------------------------------------------------------------------------
// Table T-033 -- the rules of writing
// ---------------------------------------------------------------------------

describe('table T-033 -- writing', () => {
  it('EX-1: writes every element in the order the official schema declares', () => {
    const root = written(accepted(BASE_TEXT))
    expect(orderFaults(root, 'Project')).toEqual([])
  })

  it('EX-1: writes the root in the namespace the official schema declares', () => {
    const root = written(accepted(BASE_TEXT))
    expect(root.name).toBe('Project')
    expect(root.attributes['xmlns']).toBe(MSPDI_NAMESPACE)
  })

  it('EX-1: writes the schema`s mandatory Project children for an imported file', () => {
    const root = written(accepted(BASE_TEXT))
    expect(textAt(root, 'SaveVersion')).toBe(SAMPLE.saveVersion)
    expect(textAt(root, 'CurrencyCode')).toBe(SAMPLE.currencyCode)
  })

  it('EX-3: effort is neither rewritten nor deleted', () => {
    // The other half of EX-3 -- telling the person that the partner's tool has
    // to update it -- turns on a progress EDIT, which no member of this unit
    // performs, so only the MUST NOT is asserted here.
    const document = accepted(BASE_TEXT)
    const task = instanceOf(document, 'Task')
    expect((task['carry'] as Record<string, string>)['Work']).toBe(SAMPLE.taskWork)
    expect(textAt(writtenInstance(written(document), 'Task'), 'Work')).toBe(SAMPLE.taskWork)
  })

  it('EX-1: writes the schema`s mandatory Project children for a GRS-born document -- DELIBERATELY LEFT FAILING', () => {
    // FR-057 EX-1 (docs/spec/01-04-requirements.md:2938) makes it a MUST that a
    // document created without importing any MSPDI still comes out in a form
    // the partner's tool can open. Both of the children named below are
    // declared without minOccurs in mspdi_pj12.xsd (:232, :390), so a
    // Project without them is not valid against the official schema, and
    // DV-2 / DV-3 of table T-059 are the rows that say where each comes from.
    // DELIBERATELY LEFT FAILING -- reported as a defect, not a test to relax.
    const root = written(CURRENT)
    for (const name of MANDATORY_PROJECT_CHILDREN) {
      expect(firstNamed(root, name), `${name} is mandatory in the official schema`).not.toBeNull()
    }
  })

  it('EX-2 and EX-4: an unedited task goes back in the spelling it arrived in', () => {
    const document = accepted(BASE_TEXT)
    const task = writtenInstance(written(document), 'Task')
    expect(textAt(task, 'Start')).toBe(SAMPLE.taskStart)
    expect(textAt(task, 'Finish')).toBe(SAMPLE.taskFinish)
    expect(textAt(task, 'ActualStart')).toBe(SAMPLE.taskActualStart)
    expect(textAt(task, 'ActualFinish')).toBe(SAMPLE.taskActualFinish)
    expect(textAt(task, 'Deadline')).toBe(SAMPLE.taskDeadline)
    expect(textAt(task, 'Resume')).toBe(SAMPLE.taskResume)
  })

  it('EX-2: a carried original beats the computed value (the note of table T-019)', () => {
    // G-13 of table T-005 puts Stop in Carry for exactly this reason, and DV-1
    // is the same case for Project/FinishDate: the fixture's FinishDate is not
    // the latest Task/Finish, so a recomputed one would differ.
    const stop = '2026-04-05T17:00:00'
    const text = BASE_TEXT.replace(
      `<Resume>${SAMPLE.taskResume}</Resume>`,
      `<Stop>${stop}</Stop><Resume>${SAMPLE.taskResume}</Resume>`,
    )
    const root = written(accepted(text))
    expect(textAt(writtenInstance(root, 'Task'), 'Stop')).toBe(stop)
    expect(textAt(root, 'FinishDate')).toBe(SAMPLE.projectFinish)
  })

  it('EX-5: a row with no content is not a task, and goes back in its place', () => {
    const text = BASE_TEXT.replace(
      '  <Tasks>',
      `  <Tasks>\n    <Task><UID>90</UID><IsNull>1</IsNull></Task>`,
    ).replace('  </Tasks>', `    <Task><UID>91</UID><IsNull>1</IsNull></Task>\n  </Tasks>`)
    const document = accepted(text)
    expect(document.schedule.tasks.map((each) => each.uid)).toEqual([
      SAMPLE.taskUid,
      SAMPLE.childUid,
    ])
    const tasks = childrenNamed(nodeAt(written(document), 'Tasks') ?? written(document), 'Task')
    expect(tasks.map((each) => textAt(each, 'UID'))).toEqual([
      '90',
      String(SAMPLE.taskUid),
      String(SAMPLE.childUid),
      '91',
    ])
    expect(textAt(tasks[0] ?? ({} as XmlNode), 'IsNull')).toBe('1')
    expect(textAt(tasks[3] ?? ({} as XmlNode), 'IsNull')).toBe('1')
  })

  it('EX-5: an empty Resource is not a resource, and goes back in its place', () => {
    const text = BASE_TEXT.replace(
      '  <Resources>',
      `  <Resources>\n    <Resource><UID>80</UID><IsNull>1</IsNull></Resource>`,
    )
    const document = accepted(text)
    expect(document.schedule.resources.map((each) => each.uid)).toEqual([SAMPLE.resourceUid])
    const root = written(document)
    const resources = childrenNamed(nodeAt(root, 'Resources') ?? root, 'Resource')
    expect(resources.map((each) => textAt(each, 'UID'))).toEqual(['80', String(SAMPLE.resourceUid)])
  })

  it('EX-6: an extended attribute the file already uses is not overwritten', () => {
    // No row names WHICH extended attribute carries the fade days, so nothing
    // here may claim one. What EX-6 does settle is that the partner's own
    // value is not touched (MUST NOT).
    const document = accepted(BASE_TEXT)
    const task = instanceOf(document, 'Task')
    expect(task['fadeInDays']).toBeNull()
    expect(task['fadeOutDays']).toBeNull()
    const carried = (task['carryElements'] as readonly { readonly name: string }[]).filter(
      (each) => each.name === 'ExtendedAttribute',
    )
    expect(carried).toHaveLength(1)
    const back = writtenInstance(written(document), 'Task')
    const attributes = childrenNamed(back, 'ExtendedAttribute')
    expect(attributes).toHaveLength(1)
    expect(textAt(attributes[0] ?? ({} as XmlNode), 'FieldID')).toBe('188743731')
    expect(textAt(attributes[0] ?? ({} as XmlNode), 'Value')).toBe('7')
  })

  it('EX-7: the one date GRS decides itself is written at 00:00:00', () => {
    // DV-9 of table T-059: Stop is actualStart + actualDuration. The fixture
    // brings no Stop, so this is the value GRS made, and EX-7 fixes its time.
    const suspended = mspdi(
      [
        projectHeadXml(),
        calendarXml(9),
        `  <Tasks>
    <Task>
      <UID>1</UID><ID>0</ID><Name>Suspended</Name>
      <OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel>
      <Start>2026-04-01T09:30:00</Start><Finish>2026-04-30T17:15:00</Finish>
      <Resume>2026-05-11T08:00:00</Resume><ResumeValid>1</ResumeValid>
      <ActualStart>2026-04-06T08:45:00</ActualStart>
      <ActualDuration>${durationText(SAMPLE.minutesPerDay * 3)}</ActualDuration>
    </Task>
  </Tasks>`,
      ].join('\n'),
    )
    const written9 = writtenInstance(written(accepted(suspended)), 'Task')
    const stop = textAt(written9, 'Stop')
    expect(stop, 'DV-9 writes a Stop for a suspended task').not.toBeNull()
    expect(stop).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00$/)
    // MUST NOT apply to a value that only arrived: the plan dates keep theirs.
    expect(textAt(written9, 'Start')).toBe('2026-04-01T09:30:00')
    expect(textAt(written9, 'ActualStart')).toBe('2026-04-06T08:45:00')
  })
})

// ---------------------------------------------------------------------------
// Table T-019 -- which state writes a Stop. One case walks every row.
// ---------------------------------------------------------------------------

function planActualTasksText(): string {
  const duration = durationText(SAMPLE.minutesPerDay * 3)
  const body = (row: (typeof T_019_STOP)[number]): string => {
    const head =
      `      <UID>${row.uid}</UID><ID>${row.uid - 101}</ID><Name>${row.state}</Name>\n` +
      `      <OutlineNumber>${row.uid - 100}</OutlineNumber><OutlineLevel>1</OutlineLevel>\n` +
      `      <Start>2026-04-01T09:00:00</Start><Finish>2026-05-29T17:00:00</Finish>\n`
    const actual =
      row.row === 'PA-1'
        ? ''
        : `      <ActualStart>2026-04-06T09:00:00</ActualStart>\n` +
          (row.row === 'PA-5' ? `      <ActualFinish>2026-04-24T17:00:00</ActualFinish>\n` : '') +
          `      <ActualDuration>${duration}</ActualDuration>\n`
    const resume =
      row.row === 'PA-3'
        ? `      <Resume>2026-05-11T08:00:00</Resume><ResumeValid>1</ResumeValid>\n`
        : row.row === 'PA-4'
          ? `      <ResumeValid>0</ResumeValid>\n`
          : `      <ResumeValid>1</ResumeValid>\n`
    // The schema declares Resume and ResumeValid before the actual columns.
    return `    <Task>\n${head}${resume}${actual}    </Task>`
  }
  return mspdi(
    [
      projectHeadXml(),
      calendarXml(9),
      `  <Tasks>\n${T_019_STOP.map(body).join('\n')}\n  </Tasks>`,
    ].join('\n'),
  )
}

describe('table T-019 -- the last column, which state writes a Stop', () => {
  it('writes a Stop for exactly the two suspended states (one case, every row)', () => {
    const document = accepted(planActualTasksText())
    const root = written(document)
    const tasks = childrenNamed(nodeAt(root, 'Tasks') ?? root, 'Task')
    expect(tasks).toHaveLength(T_019_STOP.length)
    for (const row of T_019_STOP) {
      const task = tasks.find((each) => textAt(each, 'UID') === String(row.uid))
      expect(task, `${row.row} ${row.state}`).toBeDefined()
      const stop = task === undefined ? null : firstNamed(task, 'Stop')
      expect(stop === null, `${row.row} ${row.state}`).toBe(!row.writesStop)
    }
  })

  it('writes that Stop at 00:00:00 (EX-7)', () => {
    const root = written(accepted(planActualTasksText()))
    const tasks = childrenNamed(nodeAt(root, 'Tasks') ?? root, 'Task')
    for (const row of T_019_STOP) {
      if (!row.writesStop) continue
      const task = tasks.find((each) => textAt(each, 'UID') === String(row.uid))
      expect(textAt(task ?? ({} as XmlNode), 'Stop'), row.row).toMatch(
        /^\d{4}-\d{2}-\d{2}T00:00:00$/,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// Table T-059 -- the values that are made at write time and never stored
// ---------------------------------------------------------------------------

describe('table T-059 -- made at write time, not stored', () => {
  it('the document holds none of them as a column of its own', () => {
    const document = accepted(BASE_TEXT)
    const project = instanceOf(document, 'Project')
    const task = instanceOf(document, 'Task')
    const resource = instanceOf(document, 'Resource')
    const holders: Record<string, Record<string, unknown>> = {
      Project: project,
      Task: task,
      Resource: resource,
    }
    for (const row of T_059_ROWS) {
      const holder = holders[row.entity]
      if (holder === undefined) continue
      const stored = row.element.charAt(0).toLowerCase() + row.element.slice(1)
      expect(Object.keys(holder), `${row.row} ${row.entity}.${stored}`).not.toContain(stored)
    }
  })

  it('DV-4 and DV-10 renumber in write order, apart from the uid', () => {
    // DV-4 says only that the numbering is redone in write order; neither it
    // nor the official schema fixes where it starts, so only the shape of
    // the renumbering is asserted. The origin is reported as undecided.
    const root = written(accepted(nestedTasksText(4)))
    const tasks = childrenNamed(nodeAt(root, 'Tasks') ?? root, 'Task')
    const ids = tasks.map((each) => Number(textAt(each, 'ID')))
    expect(ids).toHaveLength(4)
    for (let index = 1; index < ids.length; index += 1) {
      expect(ids[index], 'consecutive, in write order').toBe((ids[index - 1] ?? 0) + 1)
    }
    // AT-24 keeps the uid apart from the position identifier.
    expect(tasks.map((each) => textAt(each, 'UID'))).toEqual(['1', '2', '3', '4'])
  })

  it('DV-6 and DV-7 come from the WBS, not from a stored column', () => {
    const root = written(accepted(BASE_TEXT))
    const tasks = childrenNamed(nodeAt(root, 'Tasks') ?? root, 'Task')
    expect(tasks.map((each) => textAt(each, 'OutlineNumber'))).toEqual(['1', '1.1'])
    expect(tasks.map((each) => textAt(each, 'Summary'))).toEqual(['1', '0'])
  })
})

// ---------------------------------------------------------------------------
// FR-021 -- the reason the unit exists
// ---------------------------------------------------------------------------

describe('FR-021 -- one MSPDI in, not merged, not edited, out again', () => {
  it('comes back to the same document through a whole round trip', () => {
    const once = accepted(BASE_TEXT)
    const twice = accepted(mspdiFromDocument(once).text)
    expect(twice).toEqual(once)
  })

  it('stays put on a third pass -- the writer is stable, not merely reversible', () => {
    const once = accepted(BASE_TEXT)
    const secondText = mspdiFromDocument(once).text
    const thirdText = mspdiFromDocument(accepted(secondText)).text
    expect(thirdText).toBe(secondText)
  })

  it('keeps every element of the file, including the ones it does not use', () => {
    const source = parseXml(BASE_TEXT)
    const back = written(accepted(BASE_TEXT))
    const counted = (root: XmlNode): Map<string, number> => {
      const tally = new Map<string, number>()
      for (const name of everyNodeName(root)) tally.set(name, (tally.get(name) ?? 0) + 1)
      return tally
    }
    const before = counted(source)
    const after = counted(back)
    for (const [name, count] of before) {
      expect(after.get(name) ?? 0, `${name} arrived ${count} times`).toBeGreaterThanOrEqual(count)
    }
  })

  it('does not hoard the source text -- a reformatted file reads the same', () => {
    // FR-021 forbids comparing byte strings (MUST NOT) precisely because the
    // spelling of the incoming file is free. Same document, different bytes.
    const dense = BASE_TEXT.replace(/>\s+</g, '><')
    const commented = BASE_TEXT.replace('</Project>', '<!-- a comment --></Project>')
    const expanded = BASE_TEXT.replace(/<(\w+)><\/\1>/g, '<$1/>')
    const first = accepted(BASE_TEXT)
    for (const [why, text] of [
      ['no whitespace between elements', dense],
      ['a comment before the end', commented],
      ['self-closing empty elements', expanded],
    ] as const) {
      expect(accepted(text), why).toEqual(first)
    }
  })

  it('carries an element it does not interpret back untouched, name and leaves', () => {
    const document = accepted(BASE_TEXT)
    const back = written(document)
    const attributes = nodeAt(back, 'ExtendedAttributes')
    expect(attributes).not.toBeNull()
    expect(textAt(attributes ?? ({} as XmlNode), 'ExtendedAttribute/FieldID')).toBe('188743731')
    expect(textAt(attributes ?? ({} as XmlNode), 'ExtendedAttribute/FieldName')).toBe('Text1')
    expect(textAt(back, 'Calendars/Calendar/WorkWeeks/WorkWeek/Name')).toBe('Shutdown')
    expect(textAt(back, 'Resources/Resource/Rates/Rate/RateTable')).toBe('0')
  })

  it('keeps the repeat order of what it carries (AT-123 puts the position in ordinal)', () => {
    const three = BASE_TEXT.replace(
      '<ExtendedAttribute><FieldID>188743731</FieldID><Value>7</Value></ExtendedAttribute>',
      ['A', 'B', 'C']
        .map(
          (mark, index) =>
            `<ExtendedAttribute><FieldID>${188743731 + index}</FieldID><Value>${mark}</Value></ExtendedAttribute>`,
        )
        .join(''),
    )
    const back = writtenInstance(written(accepted(three)), 'Task')
    expect(childrenNamed(back, 'ExtendedAttribute').map((each) => textAt(each, 'Value'))).toEqual([
      'A',
      'B',
      'C',
    ])
  })
})

// ---------------------------------------------------------------------------
// PI-20 of table T-064 -- the two members, and their declared purity
// ---------------------------------------------------------------------------

describe('PI-20 -- the published pair', () => {
  it('publishes both members and the namespace the writer uses', () => {
    expect(typeof documentFromMspdi).toBe('function')
    expect(typeof mspdiFromDocument).toBe('function')
    expect(typeof MSPDI_NAMESPACE).toBe('string')
    expect(MSPDI_NAMESPACE.length).toBeGreaterThan(0)
  })

  it('is pure: the same text twice gives the same document, byte for byte', () => {
    const first = documentFromMspdi(BASE_TEXT, CURRENT)
    const second = documentFromMspdi(BASE_TEXT, CURRENT)
    expect(second).toEqual(first)
    expect(mspdiFromDocument(accepted(BASE_TEXT)).text).toBe(
      mspdiFromDocument(accepted(BASE_TEXT)).text,
    )
  })

  it('is pure: neither member writes into what it was handed', () => {
    const frozen = JSON.parse(JSON.stringify(CURRENT)) as Document
    const before = JSON.stringify(frozen)
    const document = accepted(BASE_TEXT, frozen)
    mspdiFromDocument(document)
    expect(JSON.stringify(frozen)).toBe(before)
  })
})

// ---------------------------------------------------------------------------
// The byte order mark, and the two custom-field frames the fade day counts
// ride in.
//
// What was read for these cases:
//   FR-023   a LEADING byte order mark is accepted and dropped (MUST), and is
//            not a reason to refuse (MUST NOT)
//            (docs/spec/01-04-requirements.md:3037). The same paragraph names
//            the writing side as the OPPOSITE rule and hands it to CN-5.
//   CN-5     what GRS writes is UTF-8 with no BOM (MUST) (table T-003, :157).
//   EX-6     the roster of frames is `_source/mspdi-custom-fields.json` and a
//            free one is looked for IN THAT ORDER (MUST); a frame the import
//            source uses is not overwritten (MUST NOT); GRS moves to a free one
//            and TELLS, and when there is no free one it writes nothing and
//            TELLS (MUST); which side owns a frame is told apart by the
//            DEFINITION's `Alias` against the roster's (MUST) -- the value side
//            carries only a number -- and the same test is used on the way in,
//            a frame that does not match being left uninterpreted in
//            `carryElements` (MUST). (table T-033, :2951)
//   EX-8     the definition goes into `Project/ExtendedAttributes` ONCE (MUST),
//            its children follow the official schema's `xsd:sequence` (MUST),
//            and when no task has a fade the collection is not written at all
//            (MUST NOT -- the schema states each `ExtendedAttributes` needs at
//            least one child, mspdi_pj12.xsd:988). (table T-033, :2953)
//   EX-1     what goes out is valid against the official schema, whose `Alias`
//            is `maxLength` 50 (mspdi_pj12.xsd:1055). (table T-033, :2946)
//   DF-2     an element GRS does not interpret stays in its OWNER's
//            `carryElements`, in its original form. (table T-053, :2851)
//   AT-40 /  `Task.fadeInDays` / `Task.fadeOutDays`: whole days, nullable,
//   AT-41    `Consume`, exchanged through `Task/ExtendedAttribute`, and `null`
//            is told apart from `0` (_assets/fig-erd-detail.md:342).
//   NT-1 /   a notice says WHICH item and WHY in words; a notice that comes
//   NT-5     with accepted work does not stop the work. (table T-037, :3703)
//
// No number below is typed. Every one is read out of the MANUSCRIPT
// `docs/spec/_source/mspdi-custom-fields.json`, and the one bound the official
// schema owns (`Alias` maxLength) is read out of the XSD. Section 2 of
// docs/development-rules/04-verification.md asks exactly this of a case whose
// point is that a manuscript value reaches the code: change one value in the
// manuscript and these fail.
// ---------------------------------------------------------------------------

const BYTE_ORDER_MARK = '\uFEFF'

const ROSTER_PATH = join(process.cwd(), 'docs', 'spec', '_source', 'mspdi-custom-fields.json')

interface RosterFrame {
  readonly name: string
  readonly fieldId: number
  readonly prefers: 'fadeInDays' | 'fadeOutDays'
  readonly alias: string
}

interface Roster {
  readonly elemType: { readonly value: number }
  readonly cfType: { readonly value: number }
  readonly aliasMaxLength: { readonly value: number }
  readonly frames: readonly RosterFrame[]
}

const ROSTER = JSON.parse(readFileSync(ROSTER_PATH, 'utf8')) as Roster

/**
 * EX-6 tells GRS's own frame from the import source's by the DEFINITION's
 * `Alias`. The manuscript ships both aliases empty on purpose and says why:
 * until the user fills one, GRS cannot recognise its own frame and must not
 * claim one. So while they are empty there is no frame GRS may claim, and the
 * cases below expect the "nowhere to go" arm of EX-6. Filling an alias in the
 * manuscript moves these expectations, which is the point of reading it here.
 */
const ROSTER_ALIASES_ARE_USABLE = ROSTER.frames.every((each) => each.alias.trim().length > 0)

function rosterFrame(prefers: RosterFrame['prefers']): RosterFrame {
  const found = ROSTER.frames.find((each) => each.prefers === prefers)
  if (found === undefined) throw new Error(`the roster names no frame for ${prefers}`)
  return found
}

/** The `maxLength` the official schema puts on a definition's `Alias`. */
function schemaAliasMaxLength(): number {
  const source = readFileSync(XSD_PATH, 'utf8')
  const hits = [...source.matchAll(/name="Alias"[\s\S]{0,400}?<xsd:maxLength value="(\d+)"/g)]
  if (hits.length !== 1) {
    throw new Error(`the schema states ${hits.length} bounds for Alias, expected 1`)
  }
  return Number(hits[0]?.[1] ?? NaN)
}

const SCHEMA_ALIAS_MAX_LENGTH = schemaAliasMaxLength()

const FADE_IN_DAYS = 3
const FADE_OUT_DAYS = 2

/** A definition row of `Project/ExtendedAttributes`, in the schema's own order. */
function definitionXml(fieldId: number, fieldName: string, alias: string | null): string {
  const aliasPart = alias === null ? '' : `<Alias>${alias}</Alias>`
  return (
    `<ExtendedAttribute><FieldID>${fieldId}</FieldID><FieldName>${fieldName}</FieldName>` +
    `<CFType>${ROSTER.cfType.value}</CFType><ElemType>${ROSTER.elemType.value}</ElemType>` +
    `${aliasPart}</ExtendedAttribute>`
  )
}

/** A value row under a `Task`. The value side carries only a number (xsd:2254). */
function valueXml(fieldId: number, value: string): string {
  return `<ExtendedAttribute><FieldID>${fieldId}</FieldID><Value>${value}</Value></ExtendedAttribute>`
}

/** `projectHeadXml()` with its own `ExtendedAttributes` block swapped out. */
function headWithDefinitions(definitions: readonly string[]): string {
  const bare = projectHeadXml()
    .replace(/\n {2}<ExtendedAttributes>[\s\S]*?<\/ExtendedAttributes>/, '')
    .trimEnd()
  if (definitions.length === 0) return bare
  const rows = definitions.map((each) => `    ${each}`).join('\n')
  return `${bare}\n  <ExtendedAttributes>\n${rows}\n  </ExtendedAttributes>`
}

/** One task, with no fade values unless the caller supplies them. */
function fadeFileText(definitions: readonly string[], taskValues: readonly string[]): string {
  return mspdi(
    [
      headWithDefinitions(definitions),
      calendarXml(9),
      `  <Tasks>
    <Task>
      <UID>${SAMPLE.taskUid}</UID>
      <ID>0</ID>
      <Name>${SAMPLE.taskName}</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>${SAMPLE.taskStart}</Start>
      <Finish>${SAMPLE.taskFinish}</Finish>
      ${taskValues.join('')}
    </Task>
  </Tasks>`,
    ].join('\n'),
  )
}

/** The same document with the fade day counts put on the fixture's one task. */
function withFade(document: Document, inDays: number | null, outDays: number | null): Document {
  const copy = JSON.parse(JSON.stringify(document)) as {
    schedule: {
      tasks: {
        uid: number
        fadeInDays: number | null
        fadeOutDays: number | null
      }[]
    }
  }
  for (const task of copy.schedule.tasks) {
    if (task.uid !== SAMPLE.taskUid) continue
    task.fadeInDays = inDays
    task.fadeOutDays = outDays
  }
  return copy as unknown as Document
}

/** The same document with EVERY task's fade day counts cleared. */
function withoutAnyFade(document: Document): Document {
  const copy = JSON.parse(JSON.stringify(document)) as {
    schedule: {
      tasks: { fadeInDays: number | null; fadeOutDays: number | null }[]
    }
  }
  for (const task of copy.schedule.tasks) {
    task.fadeInDays = null
    task.fadeOutDays = null
  }
  return copy as unknown as Document
}

function definitionsOf(root: XmlNode): readonly XmlNode[] {
  const collection = firstNamed(root, 'ExtendedAttributes')
  return collection === null ? [] : childrenNamed(collection, 'ExtendedAttribute')
}

function fieldIdsOf(nodes: readonly XmlNode[]): readonly string[] {
  return nodes.map((each) => textAt(each, 'FieldID') ?? '')
}

function valueForField(task: XmlNode, fieldId: number): string | null {
  const found = childrenNamed(task, 'ExtendedAttribute').find(
    (each) => textAt(each, 'FieldID') === String(fieldId),
  )
  return found === undefined ? null : textAt(found, 'Value')
}

function carriedNames(holder: Record<string, unknown>): readonly string[] {
  const carried = holder['carryElements'] as readonly {
    readonly name: string
  }[]
  return carried.map((each) => each.name)
}

function writeOf(document: Document): {
  readonly root: XmlNode
  readonly notices: readonly MspdiNotice[]
} {
  const encoding: MspdiEncoding = mspdiFromDocument(document)
  return { root: parseXml(encoding.text), notices: encoding.notices }
}

/** NT-1's shape: a notice says WHICH item, and says why in words. */
function namesAnItem(notice: MspdiNotice): boolean {
  return notice.at.trim().length > 0 && notice.what.trim().length > 0
}

describe('the fade roster these cases walk', () => {
  it('GIVEN the manuscript roster WHEN read THEN it holds the two frames AT-40 and AT-41 need', () => {
    expect(ROSTER.frames).toHaveLength(2)
    expect(ROSTER.frames.map((each) => each.prefers)).toEqual(['fadeInDays', 'fadeOutDays'])
    expect(new Set(ROSTER.frames.map((each) => each.fieldId)).size).toBe(2)
    for (const frame of ROSTER.frames) {
      expect(Number.isInteger(frame.fieldId)).toBe(true)
      expect(frame.fieldId).toBeGreaterThan(0)
    }
    // CFType 5 = Number, ElemType 20 = Task (mspdi_pj12.xsd:1005, :1027).
    expect(ROSTER.cfType.value).toBe(5)
    expect(ROSTER.elemType.value).toBe(20)
  })

  it('GIVEN the official schema WHEN its Alias bound is read THEN the manuscript states the same bound (EX-1)', () => {
    expect(ROSTER.aliasMaxLength.value).toBe(SCHEMA_ALIAS_MAX_LENGTH)
  })

  it('GIVEN the roster aliases WHEN measured THEN none is longer than the schema allows (EX-1)', () => {
    // EX-1 is a MUST that what goes out is valid against the official schema.
    // An Alias over the bound could not be written without breaking it, so the
    // roster may not hold one.
    for (const frame of ROSTER.frames) {
      expect(frame.alias.length).toBeLessThanOrEqual(SCHEMA_ALIAS_MAX_LENGTH)
    }
  })

  it('GIVEN the official schema WHEN the definition order is read THEN FieldID precedes Alias (EX-8)', () => {
    const declared = CHILD_ORDER.get('Project/ExtendedAttributes/ExtendedAttribute')
    expect(declared, 'mspdi_pj12.xsd declares the definition').toBeDefined()
    const order = declared ?? []
    expect(order.indexOf('FieldID')).toBeGreaterThanOrEqual(0)
    expect(order.indexOf('Alias')).toBeGreaterThan(order.indexOf('FieldID'))
    expect(order.indexOf('CFType')).toBeGreaterThan(order.indexOf('FieldName'))
  })
})

// ---------------------------------------------------------------------------
// FR-023 -- a leading byte order mark is accepted and dropped
// ---------------------------------------------------------------------------

describe('FR-023 -- a leading byte order mark is accepted and dropped', () => {
  it('GIVEN an MSPDI text behind a BOM WHEN read THEN it is not refused (MUST NOT)', () => {
    const read = documentFromMspdi(`${BYTE_ORDER_MARK}${BASE_TEXT}`, CURRENT)
    expect(read.ok, 'a BOM is not a reason to refuse').toBe(true)
  })

  it('GIVEN the same file with and without a BOM WHEN both are read THEN the documents are the same', () => {
    // Accepted AND dropped, so nothing downstream of the parser can see it.
    const plain = documentFromMspdi(BASE_TEXT, CURRENT)
    const marked = documentFromMspdi(`${BYTE_ORDER_MARK}${BASE_TEXT}`, CURRENT)
    expect(marked).toEqual(plain)
  })

  it('GIVEN a BOM before a file with no tasks WHEN read THEN it is still accepted', () => {
    const empty = mspdi([projectHeadXml(), calendarXml(9), '  <Tasks/>'].join('\n'))
    const read = documentFromMspdi(`${BYTE_ORDER_MARK}${empty}`, CURRENT)
    expect(read.ok).toBe(true)
  })

  it('GIVEN a BOM and nothing else WHEN read THEN it is refused with words, not accepted as empty', () => {
    // The boundary of accepting a BOM: dropping it leaves no document at all.
    const faults = refused(BYTE_ORDER_MARK)
    expect(faults.length).toBeGreaterThan(0)
    expect(faults.every((fault) => fault.what.trim().length > 0)).toBe(true)
  })

  it('GIVEN a BOM before whitespace WHEN read THEN it is refused (the empty case)', () => {
    expect(refused(`${BYTE_ORDER_MARK}   \n\t `).length).toBeGreaterThan(0)
  })

  it('GIVEN a leading character that is NOT a BOM WHEN read THEN it is still refused', () => {
    // FR-023 exempts the byte order mark and nothing else. Without this the
    // case above would pass on a parser that simply skips leading junk, and
    // the exemption would not have been tested at all.
    expect(refused(`x${BASE_TEXT}`).length).toBeGreaterThan(0)
  })

  it('GIVEN a BOM before a text that is not MSPDI WHEN read THEN the refusal names the item in words (NT-1)', () => {
    const faults = refused(`${BYTE_ORDER_MARK}<Nope><Inside/></Nope>`)
    expect(faults.length).toBeGreaterThan(0)
    // NT-1: which item, and why, in words. An empty `at` is this unit's way of
    // naming the whole text when no single item can be pointed at.
    for (const fault of faults) {
      expect(typeof fault.at).toBe('string')
      expect(fault.what.trim().length).toBeGreaterThan(0)
    }
  })

  it('GIVEN a BOM inside a value WHEN read THEN it is kept as the partner`s own text', () => {
    // FR-023 accepts and drops the LEADING one. A BOM inside a value is the
    // partner's data, and EX-4 keeps the spelling that arrived.
    const text = BASE_TEXT.replace(SAMPLE.taskNotes, `${SAMPLE.taskNotes}${BYTE_ORDER_MARK}x`)
    const document = accepted(text)
    expect(instanceOf(document, 'Task')['notes']).toBe(`${SAMPLE.taskNotes}${BYTE_ORDER_MARK}x`)
  })
})

// ---------------------------------------------------------------------------
// CN-5 of table T-003 -- the writing side is the opposite rule
// ---------------------------------------------------------------------------

describe('CN-5 -- what GRS writes carries no byte order mark', () => {
  it('GIVEN an imported document WHEN written THEN the text does not begin with a BOM (MUST)', () => {
    const text = mspdiFromDocument(accepted(BASE_TEXT)).text
    expect(text.startsWith(BYTE_ORDER_MARK)).toBe(false)
    expect(text.startsWith('<?xml')).toBe(true)
  })

  it('GIVEN a document imported FROM a BOM`d file WHEN written THEN no BOM comes back out', () => {
    const text = mspdiFromDocument(accepted(`${BYTE_ORDER_MARK}${BASE_TEXT}`)).text
    expect(text.includes(BYTE_ORDER_MARK)).toBe(false)
  })

  it('GIVEN a GRS-born document WHEN written THEN it carries no BOM either', () => {
    expect(mspdiFromDocument(CURRENT).text.includes(BYTE_ORDER_MARK)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// EX-6 -- reading: the definition's Alias decides whose frame it is
// ---------------------------------------------------------------------------

describe('EX-6 and DF-2 -- reading a custom-field frame', () => {
  it('GIVEN a frame whose definition Alias is not the roster`s WHEN read THEN it is not interpreted (EX-6 MUST)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, 'Number1', 'The import source owns this')],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const document = accepted(text)
    const task = instanceOf(document, 'Task')
    expect(task['fadeInDays']).toBeNull()
    expect(task['fadeOutDays']).toBeNull()
    // DF-2: left in its OWNER's carryElements, in its original form.
    expect(carriedNames(task)).toContain('ExtendedAttribute')
  })

  it('GIVEN an unrecognised frame WHEN read THEN it is not gathered at the root (DF-2 MUST NOT)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, 'Number1', 'The import source owns this')],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const document = accepted(text)
    const project = document.schedule.project as unknown as Record<string, unknown>
    const carriedOnProject = (
      project['carryElements'] as readonly { readonly name: string }[]
    ).filter((each) => each.name === 'ExtendedAttribute')
    expect(carriedOnProject).toHaveLength(0)
  })

  it('GIVEN an unrecognised frame WHEN written back THEN it comes back untouched (DF-2, FR-021)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, 'Number1', 'The import source owns this')],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const root = written(accepted(text))
    const task = writtenInstance(root, 'Task')
    expect(valueForField(task, frame.fieldId)).toBe(String(FADE_IN_DAYS))
    const definitions = definitionsOf(root)
    expect(fieldIdsOf(definitions)).toEqual([String(frame.fieldId)])
    expect(textAt(definitions[0] ?? ({} as XmlNode), 'Alias')).toBe('The import source owns this')
  })

  it('GIVEN a frame whose definition Alias IS the roster`s WHEN read THEN the roster decides whether it is claimed', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, frame.alias)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const task = instanceOf(accepted(text), 'Task')
    // The manuscript's own note: an empty alias is no alias, so GRS cannot
    // recognise its own frame and must not claim one. Fill the alias in
    // `_source/mspdi-custom-fields.json` and this expectation moves.
    expect(task['fadeInDays']).toBe(ROSTER_ALIASES_ARE_USABLE ? FADE_IN_DAYS : null)
    if (!ROSTER_ALIASES_ARE_USABLE) expect(carriedNames(task)).toContain('ExtendedAttribute')
  })

  it('GIVEN no frame at all WHEN read THEN the fade columns are null, not zero (AT-40, AT-41)', () => {
    const task = instanceOf(accepted(fadeFileText([], [])), 'Task')
    expect(task['fadeInDays']).toBeNull()
    expect(task['fadeOutDays']).toBeNull()
  })

  it('GIVEN a frame whose value is not a number WHEN read THEN no NaN reaches the column (AT-40)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, frame.alias)],
      [valueXml(frame.fieldId, 'not a number')],
    )
    const read = documentFromMspdi(text, CURRENT)
    expect(read.ok, 'FR-023 leaves the value checks to CP-13; this unit must not throw').toBe(true)
    if (!read.ok) return
    const value = read.document.schedule.tasks.find(
      (each) => each.uid === SAMPLE.taskUid,
    )?.fadeInDays
    expect(value === null || Number.isInteger(value)).toBe(true)
  })

  it('GIVEN a frame whose value is zero WHEN read THEN zero is told apart from null (AT-40)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, frame.alias)],
      [valueXml(frame.fieldId, '0')],
    )
    const task = instanceOf(accepted(text), 'Task')
    expect(task['fadeInDays']).toBe(ROSTER_ALIASES_ARE_USABLE ? 0 : null)
  })
})

// ---------------------------------------------------------------------------
// EX-6 -- writing: the roster order, and the two ways it can fail to find room
// ---------------------------------------------------------------------------

describe('EX-6 -- writing the fade day counts into a frame', () => {
  const bothHeld = (): string =>
    fadeFileText(
      [
        definitionXml(rosterFrame('fadeInDays').fieldId, 'Number1', 'Import source first'),
        definitionXml(rosterFrame('fadeOutDays').fieldId, 'Number2', 'Import source second'),
      ],
      [],
    )

  it('GIVEN both frames held by the import source WHEN written THEN nothing is written there and the person is told (MUST)', () => {
    const inFrame = rosterFrame('fadeInDays')
    const outFrame = rosterFrame('fadeOutDays')
    const faded = withFade(accepted(bothHeld()), FADE_IN_DAYS, FADE_OUT_DAYS)
    const { root, notices } = writeOf(faded)
    const task = writtenInstance(root, 'Task')
    expect(valueForField(task, inFrame.fieldId)).toBeNull()
    expect(valueForField(task, outFrame.fieldId)).toBeNull()
    expect(notices.length).toBeGreaterThan(0)
    expect(notices.some(namesAnItem), 'NT-1: a notice names the item, in words').toBe(true)
  })

  it('GIVEN both frames held by the import source WHEN written THEN neither is overwritten (MUST NOT)', () => {
    const inFrame = rosterFrame('fadeInDays')
    const outFrame = rosterFrame('fadeOutDays')
    const { root } = writeOf(withFade(accepted(bothHeld()), FADE_IN_DAYS, FADE_OUT_DAYS))
    const definitions = definitionsOf(root)
    expect(fieldIdsOf(definitions)).toEqual([String(inFrame.fieldId), String(outFrame.fieldId)])
    expect(textAt(definitions[0] ?? ({} as XmlNode), 'Alias')).toBe('Import source first')
    expect(textAt(definitions[1] ?? ({} as XmlNode), 'Alias')).toBe('Import source second')
  })

  it('GIVEN nowhere to write the fade WHEN written THEN the rest of the work is not stopped (NT-5)', () => {
    const encoding = mspdiFromDocument(withFade(accepted(bothHeld()), FADE_IN_DAYS, FADE_OUT_DAYS))
    // NT-5 does not stop the operation: the text is whole and the task is in it.
    expect(encoding.text.length).toBeGreaterThan(0)
    const task = writtenInstance(parseXml(encoding.text), 'Task')
    expect(textAt(task, 'Name')).toBe(SAMPLE.taskName)
    expect(textAt(task, 'Start')).toBe(SAMPLE.taskStart)
  })

  it('GIVEN the first frame held by the import source WHEN written THEN it is left alone and the person is told', () => {
    const inFrame = rosterFrame('fadeInDays')
    const outFrame = rosterFrame('fadeOutDays')
    const text = fadeFileText(
      [definitionXml(inFrame.fieldId, 'Number1', 'Import source first')],
      [],
    )
    const { root, notices } = writeOf(withFade(accepted(text), FADE_IN_DAYS, null))
    const task = writtenInstance(root, 'Task')
    // MUST NOT overwrite: the held frame keeps the import source's Alias and
    // gains no value of GRS's.
    const held = definitionsOf(root).find(
      (each) => textAt(each, 'FieldID') === String(inFrame.fieldId),
    )
    expect(textAt(held ?? ({} as XmlNode), 'Alias')).toBe('Import source first')
    expect(valueForField(task, inFrame.fieldId)).toBeNull()
    // MUST tell, whether it moved to the free frame or found nowhere to go.
    expect(notices.length).toBeGreaterThan(0)
    expect(notices.some(namesAnItem)).toBe(true)
    expect(valueForField(task, outFrame.fieldId)).toBe(
      ROSTER_ALIASES_ARE_USABLE ? String(FADE_IN_DAYS) : null,
    )
  })

  it('GIVEN both frames free WHEN written THEN the roster order decides which carries which (MUST)', () => {
    const inFrame = rosterFrame('fadeInDays')
    const outFrame = rosterFrame('fadeOutDays')
    const { root, notices } = writeOf(
      withFade(accepted(fadeFileText([], [])), FADE_IN_DAYS, FADE_OUT_DAYS),
    )
    const task = writtenInstance(root, 'Task')
    if (ROSTER_ALIASES_ARE_USABLE) {
      expect(valueForField(task, inFrame.fieldId)).toBe(String(FADE_IN_DAYS))
      expect(valueForField(task, outFrame.fieldId)).toBe(String(FADE_OUT_DAYS))
      expect(notices).toEqual([])
    } else {
      // The manuscript keeps both aliases empty, so there is no frame GRS may
      // claim and EX-6's last arm applies: write nothing, and tell.
      expect(valueForField(task, inFrame.fieldId)).toBeNull()
      expect(valueForField(task, outFrame.fieldId)).toBeNull()
      expect(notices.length).toBeGreaterThan(0)
    }
  })

  it('GIVEN a task with no fade WHEN written THEN no frame of the roster is claimed for it', () => {
    const { root } = writeOf(accepted(fadeFileText([], [])))
    const task = writtenInstance(root, 'Task')
    for (const frame of ROSTER.frames) expect(valueForField(task, frame.fieldId)).toBeNull()
  })

  it('GIVEN a fade of zero WHEN written THEN zero is written and null is not (AT-40, AT-41)', () => {
    const inFrame = rosterFrame('fadeInDays')
    const outFrame = rosterFrame('fadeOutDays')
    const { root } = writeOf(withFade(accepted(fadeFileText([], [])), 0, null))
    const task = writtenInstance(root, 'Task')
    expect(valueForField(task, inFrame.fieldId)).toBe(ROSTER_ALIASES_ARE_USABLE ? '0' : null)
    expect(valueForField(task, outFrame.fieldId)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// EX-8 -- one definition, the schema's child order, never an empty collection
// ---------------------------------------------------------------------------

describe('EX-8 -- the definition collection', () => {
  const writtenDocuments = (): readonly Document[] => [
    accepted(BASE_TEXT),
    accepted(
      fadeFileText([definitionXml(rosterFrame('fadeInDays').fieldId, 'Number1', 'Held')], []),
    ),
    withFade(accepted(fadeFileText([], [])), FADE_IN_DAYS, FADE_OUT_DAYS),
    CURRENT,
  ]

  it('GIVEN no fade and no arrived definition WHEN written THEN the collection is not written at all (MUST NOT)', () => {
    // mspdi_pj12.xsd:988 -- there must be at least one ExtendedAttribute in
    // each ExtendedAttributes collection, so an empty one would break EX-1.
    const { root } = writeOf(accepted(fadeFileText([], [])))
    expect(firstNamed(root, 'ExtendedAttributes')).toBeNull()
  })

  it('GIVEN a GRS-born document with no fade WHEN written THEN no empty collection appears', () => {
    // ⚠️ The premise has to be MADE, not assumed: the bundled template carries
    // a fade on some of its tasks, so `CURRENT` is not a document with no
    // fade. With every fade cleared there is nothing to define, and EX-8
    // forbids writing the collection at all (mspdi_pj12.xsd:988).
    expect(firstNamed(written(withoutAnyFade(CURRENT)), 'ExtendedAttributes')).toBeNull()
  })

  it('GIVEN a collection IS written WHEN its children are counted THEN it holds at least one (MUST NOT be empty)', () => {
    for (const document of writtenDocuments()) {
      const { root } = writeOf(document)
      const collection = firstNamed(root, 'ExtendedAttributes')
      if (collection === null) continue
      expect(childrenNamed(collection, 'ExtendedAttribute').length).toBeGreaterThan(0)
    }
  })

  it('GIVEN two tasks with a fade WHEN written THEN each frame is defined exactly once (MUST)', () => {
    const twoTasks = mspdi(
      [
        headWithDefinitions([]),
        calendarXml(9),
        `  <Tasks>
    <Task><UID>${SAMPLE.taskUid}</UID><ID>0</ID><Name>${SAMPLE.taskName}</Name>
      <OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel>
      <Start>${SAMPLE.taskStart}</Start><Finish>${SAMPLE.taskFinish}</Finish></Task>
    <Task><UID>${SAMPLE.childUid}</UID><ID>1</ID><Name>${SAMPLE.childName}</Name>
      <OutlineNumber>2</OutlineNumber><OutlineLevel>1</OutlineLevel>
      <Start>${SAMPLE.childStart}</Start><Finish>${SAMPLE.childFinish}</Finish></Task>
  </Tasks>`,
      ].join('\n'),
    )
    const copy = JSON.parse(JSON.stringify(accepted(twoTasks))) as {
      schedule: {
        tasks: { fadeInDays: number | null; fadeOutDays: number | null }[]
      }
    }
    for (const task of copy.schedule.tasks) {
      task.fadeInDays = FADE_IN_DAYS
      task.fadeOutDays = FADE_OUT_DAYS
    }
    const { root } = writeOf(copy as unknown as Document)
    const ids = fieldIdsOf(definitionsOf(root))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('GIVEN a written definition WHEN its children are read THEN they follow the schema`s xsd:sequence (MUST)', () => {
    for (const document of writtenDocuments()) {
      const { root } = writeOf(document)
      const collection = firstNamed(root, 'ExtendedAttributes')
      if (collection === null) continue
      expect(orderFaults(collection, 'Project/ExtendedAttributes')).toEqual([])
    }
  })

  it('GIVEN a written definition WHEN its Alias is measured THEN it does not exceed the schema bound (EX-1)', () => {
    for (const document of writtenDocuments()) {
      const { root } = writeOf(document)
      for (const definition of definitionsOf(root)) {
        const alias = textAt(definition, 'Alias')
        if (alias === null) continue
        expect(alias.length).toBeLessThanOrEqual(SCHEMA_ALIAS_MAX_LENGTH)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// What a wrong input does: the boundaries of the byte order mark (CR-198) and
// of the two borrowed frames (CR-199).
//
// Read for these cases, beyond the block above:
//   FR-023 (:3040)   the LEADING byte order mark is accepted and dropped
//                    (MUST) and is not a reason to refuse (MUST NOT). That
//                    sentence settles ONE mark at the front and says nothing
//                    about a second one or one further in, so those two cases
//                    assert only what holds under either reading: the answer
//                    is a VALUE (FR-028) and no mark reaches the document.
//   CR-199 section 7 while an alias is empty GRS cannot recognise its own
//                    frame and must not claim one. Every case below is written
//                    so that filling an alias in the manuscript moves it.
//   rule 04 sect. 2  a manuscript value only counts as reaching the code if
//                    changing that one value breaks a case. The generated
//                    roster is therefore measured against the manuscript
//                    rather than either being trusted on its own.
// ---------------------------------------------------------------------------

const GENERATED_ROSTER_PATH = join(
  process.cwd(),
  'src',
  'adapter',
  'document-codec',
  'mspdi-custom-fields.json',
)

interface GeneratedRoster {
  readonly elemType: number
  readonly cfType: number
  readonly aliasMaxLength: number
  readonly frames: readonly RosterFrame[]
}

const GENERATED_ROSTER = JSON.parse(readFileSync(GENERATED_ROSTER_PATH, 'utf8')) as GeneratedRoster

/** A field id no frame of the roster names, derived from the roster itself. */
const OUTSIDE_FIELD_ID = Math.max(...ROSTER.frames.map((each) => each.fieldId)) + 1000

const ALIAS_AT_BOUND = 'A'.repeat(SCHEMA_ALIAS_MAX_LENGTH)
const ALIAS_OVER_BOUND = 'A'.repeat(SCHEMA_ALIAS_MAX_LENGTH + 1)

/** FR-028: an answer is a value. A throw is turned into words here. */
function answered(text: string, current: Document = CURRENT): MspdiDecoding {
  try {
    return documentFromMspdi(text, current)
  } catch (thrown) {
    throw new Error(`FR-028 asks for a value; a throw came out instead: ${String(thrown)}`)
  }
}

function carriesAnyMark(document: Document): boolean {
  return JSON.stringify(document).includes(BYTE_ORDER_MARK)
}

/** The value rows of one written `Task`, as `FieldID` to `Value`. */
function valueRowsOf(task: XmlNode): ReadonlyMap<string, string> {
  const rows = new Map<string, string>()
  for (const each of childrenNamed(task, 'ExtendedAttribute')) {
    rows.set(textAt(each, 'FieldID') ?? '', textAt(each, 'Value') ?? '')
  }
  return rows
}

describe('the roster the code reads is the roster the manuscript states (rule 04 section 2)', () => {
  it('GIVEN the manuscript WHEN the generated roster is read THEN every value is the manuscript`s', () => {
    // ⭐ This is the case that gives the two frame numbers their meaning: the
    // code reads `src/adapter/document-codec/mspdi-custom-fields.json`, and
    // changing ONE value in `docs/spec/_source/mspdi-custom-fields.json`
    // without rebuilding breaks here. Nothing in this file types a number.
    expect(GENERATED_ROSTER.elemType).toBe(ROSTER.elemType.value)
    expect(GENERATED_ROSTER.cfType).toBe(ROSTER.cfType.value)
    expect(GENERATED_ROSTER.aliasMaxLength).toBe(ROSTER.aliasMaxLength.value)
    expect(GENERATED_ROSTER.frames).toEqual(
      ROSTER.frames.map((each) => ({
        name: each.name,
        fieldId: each.fieldId,
        prefers: each.prefers,
        alias: each.alias,
      })),
    )
  })

  it('GIVEN the roster WHEN its order is read THEN fadeInDays is looked for first (EX-6 MUST)', () => {
    // EX-6: a free frame is looked for IN THE ROSTER'S ORDER. That order is
    // the manuscript's, so it is read here and not restated.
    expect(GENERATED_ROSTER.frames.map((each) => each.prefers)).toEqual([
      'fadeInDays',
      'fadeOutDays',
    ])
    expect(new Set(GENERATED_ROSTER.frames.map((each) => each.fieldId)).size).toBe(
      GENERATED_ROSTER.frames.length,
    )
  })

  it('GIVEN an empty alias in the manuscript WHEN a file offers that frame THEN nothing is claimed on either side (CR-199 section 7)', () => {
    // The manuscript ships both aliases EMPTY on purpose -- the user has not
    // chosen the two words -- and says that until one is filled GRS cannot
    // recognise its own frame and must not claim one. So while an alias is
    // empty: import reads the column null, and export writes no fade day.
    const frame = rosterFrame('fadeInDays')
    const offered = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, frame.alias)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const imported = instanceOf(accepted(offered), 'Task')
    const { root } = writeOf(withFade(accepted(fadeFileText([], [])), FADE_IN_DAYS, FADE_OUT_DAYS))
    const rows = valueRowsOf(writtenInstance(root, 'Task'))
    if (ROSTER_ALIASES_ARE_USABLE) {
      expect(imported['fadeInDays']).toBe(FADE_IN_DAYS)
      expect(rows.get(String(frame.fieldId))).toBe(String(FADE_IN_DAYS))
      return
    }
    expect(imported['fadeInDays']).toBeNull()
    expect(imported['fadeOutDays']).toBeNull()
    for (const each of ROSTER.frames) expect(rows.has(String(each.fieldId))).toBe(false)
  })

  it('GIVEN a frame GRS claims WHEN written THEN its definition carries the roster`s own alias and types', () => {
    // EX-6 recognises GRS's own frame by the DEFINITION's `Alias`, so the
    // alias GRS writes has to be the roster's, character for character, or the
    // next import would not recognise what this export just wrote. The types
    // are the roster's too: CFType 5 (Number) and ElemType 20 (Task).
    // ⚠️ While the manuscript keeps the aliases empty there is no claimed
    // frame to look at, and this case has nothing to assert -- filling one
    // makes it live.
    if (!ROSTER_ALIASES_ARE_USABLE) {
      expect(ROSTER.frames.some((each) => each.alias.trim().length === 0)).toBe(true)
      return
    }
    const inFrame = rosterFrame('fadeInDays')
    const { root } = writeOf(withFade(accepted(fadeFileText([], [])), FADE_IN_DAYS, FADE_OUT_DAYS))
    const definition = definitionsOf(root).find(
      (each) => textAt(each, 'FieldID') === String(inFrame.fieldId),
    )
    expect(definition, 'a claimed frame is defined once (EX-8)').toBeDefined()
    const found = definition ?? ({} as XmlNode)
    expect(textAt(found, 'Alias')).toBe(inFrame.alias)
    expect(textAt(found, 'CFType')).toBe(String(GENERATED_ROSTER.cfType))
    expect(textAt(found, 'ElemType')).toBe(String(GENERATED_ROSTER.elemType))
  })

  it('GIVEN a frame GRS claims WHEN the written file is read back THEN the fade day counts survive (FR-021)', () => {
    if (!ROSTER_ALIASES_ARE_USABLE) {
      expect(ROSTER.frames.some((each) => each.alias.trim().length === 0)).toBe(true)
      return
    }
    const faded = withFade(accepted(fadeFileText([], [])), FADE_IN_DAYS, FADE_OUT_DAYS)
    const again = instanceOf(accepted(mspdiFromDocument(faded).text), 'Task')
    expect(again['fadeInDays']).toBe(FADE_IN_DAYS)
    expect(again['fadeOutDays']).toBe(FADE_OUT_DAYS)
  })
})

describe('FR-023 -- the boundaries of the leading byte order mark', () => {
  it('GIVEN two byte order marks WHEN read THEN the answer is a value and no mark reaches the document', () => {
    // FR-023 settles ONE leading mark. A second one is neither accepted nor
    // refused by any line of the specification, so this case asserts only what
    // both readings share: FR-028's value, and nothing of the mark left in the
    // document if it was accepted. ⚠️ Reported as a gap, not as a defect.
    const read = answered(`${BYTE_ORDER_MARK}${BYTE_ORDER_MARK}${BASE_TEXT}`)
    if (read.ok) {
      expect(carriesAnyMark(read.document)).toBe(false)
      expect(read.document).toEqual(accepted(BASE_TEXT))
      return
    }
    expect(read.faults.length).toBeGreaterThan(0)
    expect(read.faults.every((fault) => fault.what.trim().length > 0)).toBe(true)
  })

  it('GIVEN a byte order mark after the XML declaration WHEN read THEN the answer is a value, never a throw', () => {
    // Not the LEADING mark: FR-023's MUST does not reach it. Same shape as
    // above -- what is asserted is that an answer comes back at all.
    const read = answered(BASE_TEXT.replace('?>\n', `?>\n${BYTE_ORDER_MARK}`))
    if (read.ok) {
      expect(carriesAnyMark(read.document)).toBe(false)
      return
    }
    expect(read.faults.every((fault) => fault.what.trim().length > 0)).toBe(true)
  })

  it('GIVEN a mark at the front AND one inside a value WHEN read THEN only the leading one is dropped (EX-4)', () => {
    // ⛔ The boundary that tells "drop the leading mark" apart from "strip
    // every mark": the one inside the partner's own text is data, and EX-4
    // keeps the spelling that arrived.
    const inside = `${SAMPLE.taskNotes}${BYTE_ORDER_MARK}tail`
    const text = `${BYTE_ORDER_MARK}${BASE_TEXT.replace(SAMPLE.taskNotes, inside)}`
    const document = accepted(text)
    expect(instanceOf(document, 'Task')['notes']).toBe(inside)
    expect(textAt(writtenInstance(written(document), 'Task'), 'Notes')).toBe(inside)
  })

  it('GIVEN a byte order mark followed by junk WHEN read THEN it is refused and the fault says why in words', () => {
    // FR-023 forbids refusing BECAUSE of the mark. It does not turn junk into
    // a document, and a refusal has to say which item and why (NT-1).
    const junk = [
      `${BYTE_ORDER_MARK}not a document at all`,
      `${BYTE_ORDER_MARK}<Project><Tasks><Task></Tasks></Project>`,
      `${BYTE_ORDER_MARK}<?xml version="1.0" encoding="UTF-8"?>`,
      `${BYTE_ORDER_MARK}{"schedule":{}}`,
    ]
    for (const text of junk) {
      const read = answered(text)
      expect(read.ok, `expected a refusal for ${JSON.stringify(text.slice(0, 24))}`).toBe(false)
      if (read.ok) continue
      expect(read.faults.length).toBeGreaterThan(0)
      expect(read.faults.every((fault) => fault.what.trim().length > 0)).toBe(true)
    }
  })

  it('GIVEN a byte order mark`d file WHEN written THEN the text is the one the unmarked file writes (FR-021, CN-5)', () => {
    const marked = mspdiFromDocument(accepted(`${BYTE_ORDER_MARK}${BASE_TEXT}`))
    const plain = mspdiFromDocument(accepted(BASE_TEXT))
    expect(marked.text).toBe(plain.text)
    expect(marked.text.startsWith(BYTE_ORDER_MARK)).toBe(false)
  })

  it('GIVEN a byte order mark before a file that holds only a calendar WHEN read THEN it is accepted', () => {
    const bare = mspdi([projectHeadXml(), calendarXml(9)].join('\n'))
    expect(answered(`${BYTE_ORDER_MARK}${bare}`).ok).toBe(true)
  })
})

describe('EX-6 and EX-1 -- an Alias at and over the bound the official schema states', () => {
  it('GIVEN an arrived Alias exactly at the schema bound WHEN read THEN it is accepted and not claimed', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, ALIAS_AT_BOUND)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const read = answered(text)
    expect(read.ok, 'a definition the schema admits is still an MSPDI document').toBe(true)
    if (!read.ok) return
    const task = instanceOf(read.document, 'Task')
    // The alias is not the roster's, so EX-6's test fails and DF-2 applies.
    expect(task['fadeInDays']).toBeNull()
    expect(carriedNames(task)).toContain('ExtendedAttribute')
  })

  it('GIVEN an arrived Alias one character over the bound WHEN read THEN this unit does not refuse it', () => {
    // ⚠️ The bound is the official schema's (mspdi_pj12.xsd:1055) and EX-1
    // puts it on what GRS WRITES. The head of the unit says the content checks
    // are CP-13's; this unit answers only "is this an MSPDI document at all".
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, ALIAS_OVER_BOUND)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const read = answered(text)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(instanceOf(read.document, 'Task')['fadeInDays']).toBeNull()
  })

  it('GIVEN an over-long arrived Alias WHEN written back THEN it is neither truncated nor dropped (EX-4, DF-2)', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, ALIAS_OVER_BOUND)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const { root } = writeOf(accepted(text))
    const definition = definitionsOf(root).find(
      (each) => textAt(each, 'FieldID') === String(frame.fieldId),
    )
    expect(definition, 'the arrived definition is written back').toBeDefined()
    expect(textAt(definition ?? ({} as XmlNode), 'Alias')).toBe(ALIAS_OVER_BOUND)
  })

  it('GIVEN a definition with NO Alias at all WHEN read THEN the frame is not claimed (an empty alias is no alias)', () => {
    // ⛔ The trap the manuscript names: both roster aliases are the empty
    // string. A definition that carries no `Alias` must NOT be read as
    // matching it, or GRS would claim every untitled frame in the world.
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, null)],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    const task = instanceOf(accepted(text), 'Task')
    expect(task['fadeInDays']).toBeNull()
    expect(carriedNames(task)).toContain('ExtendedAttribute')
  })

  it('GIVEN a definition with an empty Alias element WHEN read THEN the frame is not claimed either', () => {
    const frame = rosterFrame('fadeInDays')
    const text = fadeFileText(
      [definitionXml(frame.fieldId, frame.name, '')],
      [valueXml(frame.fieldId, String(FADE_IN_DAYS))],
    )
    expect(instanceOf(accepted(text), 'Task')['fadeInDays']).toBeNull()
  })
})

describe('AT-40 and AT-41 -- a Value that is not a whole number', () => {
  /** Values a `Number` frame can hold that are not a count of whole days. */
  const NOT_WHOLE_DAYS = ['2.5', '-1', '', ' 3 ', '1e3', 'NaN', 'Infinity', '9007199254740993']

  it('GIVEN a Value that is not a whole number WHEN read THEN no fraction and no NaN reaches the column', () => {
    // AT-40 / AT-41 make the column an integer count of days, nullable. FD-7
    // of table T-012a refuses rather than rounds, and FR-023 leaves that
    // refusal to CP-13 -- so what this unit may not do is invent a value.
    const frame = rosterFrame('fadeInDays')
    for (const value of NOT_WHOLE_DAYS) {
      const read = answered(
        fadeFileText(
          [definitionXml(frame.fieldId, frame.name, frame.alias)],
          [valueXml(frame.fieldId, value)],
        ),
      )
      expect(read.ok, `a Value of ${JSON.stringify(value)} is still an MSPDI document`).toBe(true)
      if (!read.ok) continue
      const held = read.document.schedule.tasks.find((each) => each.uid === SAMPLE.taskUid)
      const days = held?.fadeInDays ?? null
      expect(days === null || Number.isInteger(days), `fadeInDays for ${value}`).toBe(true)
      expect(Number.isNaN(days), `NaN for ${value}`).toBe(false)
    }
  })

  it('GIVEN a Value that is not a whole number WHEN written back THEN it comes back as it arrived (EX-4, FR-021)', () => {
    const frame = rosterFrame('fadeInDays')
    for (const value of NOT_WHOLE_DAYS) {
      const document = accepted(
        fadeFileText(
          [definitionXml(frame.fieldId, frame.name, frame.alias)],
          [valueXml(frame.fieldId, value)],
        ),
      )
      const { root } = writeOf(document)
      const rows = valueRowsOf(writtenInstance(root, 'Task'))
      expect(rows.get(String(frame.fieldId)), `the arrived ${JSON.stringify(value)}`).toBe(
        value.trim(),
      )
    }
  })

  it('GIVEN a Value that IS a whole number WHEN read THEN the manuscript alias still decides (CR-199 section 7)', () => {
    const frame = rosterFrame('fadeOutDays')
    const task = instanceOf(
      accepted(
        fadeFileText(
          [definitionXml(frame.fieldId, frame.name, frame.alias)],
          [valueXml(frame.fieldId, String(FADE_OUT_DAYS))],
        ),
      ),
      'Task',
    )
    expect(task['fadeOutDays']).toBe(ROSTER_ALIASES_ARE_USABLE ? FADE_OUT_DAYS : null)
  })
})

describe('DF-2 -- an extension element the tool does not recognise', () => {
  const outsideFrame = (value: string): string =>
    fadeFileText(
      [definitionXml(OUTSIDE_FIELD_ID, 'Number9', 'The import source owns this one')],
      [valueXml(OUTSIDE_FIELD_ID, value)],
    )

  it('GIVEN a field no roster frame names WHEN read THEN it is carried on its owner, not interpreted', () => {
    const task = instanceOf(accepted(outsideFrame('42')), 'Task')
    expect(task['fadeInDays']).toBeNull()
    expect(task['fadeOutDays']).toBeNull()
    expect(carriedNames(task)).toContain('ExtendedAttribute')
  })

  it('GIVEN a field no roster frame names WHEN written back THEN its number and value are untouched', () => {
    const { root } = writeOf(accepted(outsideFrame('42')))
    expect(valueRowsOf(writtenInstance(root, 'Task')).get(String(OUTSIDE_FIELD_ID))).toBe('42')
    const definition = definitionsOf(root).find(
      (each) => textAt(each, 'FieldID') === String(OUTSIDE_FIELD_ID),
    )
    expect(textAt(definition ?? ({} as XmlNode), 'Alias')).toBe('The import source owns this one')
  })

  it('GIVEN an extension element carrying children the codec does not name WHEN written back THEN they ride along', () => {
    // `Task/ExtendedAttribute` declares FieldID / Value / ValueGUID /
    // DurationFormat and nothing else (mspdi_pj12.xsd:2254-2269). The last two
    // are never interpreted, and DF-2 keeps them in their owner's carry.
    const extra =
      `<ExtendedAttribute><FieldID>${OUTSIDE_FIELD_ID}</FieldID><Value>42</Value>` +
      `<ValueGUID>7</ValueGUID><DurationFormat>7</DurationFormat></ExtendedAttribute>`
    const text = fadeFileText(
      [definitionXml(OUTSIDE_FIELD_ID, 'Number9', 'Held elsewhere')],
      [extra],
    )
    const { root } = writeOf(accepted(text))
    const row = childrenNamed(writtenInstance(root, 'Task'), 'ExtendedAttribute').find(
      (each) => textAt(each, 'FieldID') === String(OUTSIDE_FIELD_ID),
    )
    expect(row, 'the unrecognised row is written back').toBeDefined()
    expect(textAt(row ?? ({} as XmlNode), 'ValueGUID')).toBe('7')
    expect(textAt(row ?? ({} as XmlNode), 'DurationFormat')).toBe('7')
  })

  it('GIVEN a file of unrecognised frames WHEN round-tripped THEN no element goes missing (FR-021)', () => {
    const text = fadeFileText(
      [
        definitionXml(OUTSIDE_FIELD_ID, 'Number9', 'Held elsewhere'),
        definitionXml(rosterFrame('fadeInDays').fieldId, 'Number1', 'Import source first'),
      ],
      [
        valueXml(OUTSIDE_FIELD_ID, '42'),
        valueXml(rosterFrame('fadeInDays').fieldId, String(FADE_IN_DAYS)),
      ],
    )
    const before = everyNodeName(parseXml(text)).length
    const after = everyNodeName(written(accepted(text))).length
    expect(after).toBeGreaterThanOrEqual(before)
  })

  it('GIVEN an unrecognised frame WHEN the document is written twice THEN the second text is the first (stability)', () => {
    const once = mspdiFromDocument(accepted(outsideFrame('42'))).text
    const twice = mspdiFromDocument(accepted(once)).text
    expect(twice).toBe(once)
  })
})

// ---------------------------------------------------------------------------
// FR-054 -- an arrived amount of time that is not a whole number of working
// days.
//
// Written from the specification alone (rule 04, section 1). The STATEMENT of
// FR-054 (docs/spec/01-04-requirements.md:2518) carries the whole rule, and
// every number below is read out of it:
//
//   * the same minutes-per-day serves BOTH directions -- the file's
//     `Project.minutesPerDay`, and S-128 of table T-209 only when the file
//     states none (AT-35 of table T-058 says the same for this column);
//   * an amount that is not a whole number of working days is rounded to whole
//     days (MUST);
//   * exactly half a day goes to the larger MAGNITUDE (MUST) -- the rule is
//     written so the answer does not depend on the sign, so both signs are
//     driven below;
//   * a value MUST NOT be discarded for not dividing -- a discarded column
//     writes no element at all, so the partner's own length would disappear on
//     the round trip;
//   * an amount carrying years or months is NOT converted, and the person is
//     told (MUST) -- the reason table T-228's NR-5 gives on the comparing
//     side: those two have no length until you say where you start counting;
//   * the COUNT of rounded Tasks is told (MUST), in the shape of NT-1 of table
//     T-037 (FR-076): the notice names the item and says why in words.
//
// What goes back out is table T-033's EX-9: `PTnHnMnS`, all three of hours,
// minutes and seconds present, never a year and never a month.
//
// Chapter 1.9 asks a case that answers to a table to be driven by fixed data
// copied from it. The divisor is never typed as a number here: it is read from
// the document that states it, falling back to the generated S-128 constant.
// ---------------------------------------------------------------------------

/** S-128 of table T-209, as the settings manuscript generates it. */
const S_128_MINUTES_PER_DAY: number = DEFAULT_CALENDAR_VALUES['S-128']

/**
 * The minutes of one working day for a document: what the document itself
 * states, and S-128 only when it states nothing (FR-054 MUST, AT-35).
 */
function minutesPerDayOf(document: Document): number {
  return document.schedule.project.minutesPerDay ?? S_128_MINUTES_PER_DAY
}

/** The divisor the fixture below states in its own head. */
const PER_DAY = SAMPLE.minutesPerDay

/**
 * One amount of time in the partner's own type (`xsd:duration`,
 * mspdi_pj12.xsd:1929). A negative amount takes the leading minus that type
 * allows, so the half-day rule can be driven from both sides of zero.
 */
function amountOfMinutes(minutes: number): string {
  const size = Math.abs(minutes)
  const sign = minutes < 0 ? '-' : ''
  return `${sign}PT${Math.floor(size / 60)}H${size % 60}M0S`
}

/**
 * A file of `durations.length` Tasks, the n-th carrying that amount of time as
 * its `ActualDuration` (or none at all when it is null). The calendar carries
 * no recurring exception day (AT-82's 9), so the only notices such a file can
 * draw are the ones these cases are about.
 */
function durationFileText(
  durations: readonly (string | null)[],
  minutesPerDay: number | null = PER_DAY,
): string {
  const head =
    minutesPerDay === null
      ? projectHeadXml().replace(`  <MinutesPerDay>${PER_DAY}</MinutesPerDay>\n`, '')
      : projectHeadXml().replace(
          `<MinutesPerDay>${PER_DAY}</MinutesPerDay>`,
          `<MinutesPerDay>${minutesPerDay}</MinutesPerDay>`,
        )
  const tasks = durations.map((amount, index) => {
    const uid = index + 1
    const held = amount === null ? '' : `\n      <ActualDuration>${amount}</ActualDuration>`
    return `    <Task>
      <UID>${uid}</UID>
      <ID>${index}</ID>
      <Name>Measured ${uid}</Name>
      <OutlineNumber>${uid}</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2026-04-01T08:00:00</Start>
      <Finish>2026-04-30T17:00:00</Finish>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <PercentComplete>50</PercentComplete>
      <ActualStart>2026-04-01T08:00:00</ActualStart>${held}
    </Task>`
  })
  const body =
    tasks.length === 0 ? '  <Tasks></Tasks>' : `  <Tasks>\n${tasks.join('\n')}\n  </Tasks>`
  return mspdi([head, calendarXml(9), body, RESOURCES_XML].join('\n'))
}

function actualDurationOf(document: Document, uid: number): number | null {
  const task = document.schedule.tasks.find((each) => each.uid === uid)
  if (task === undefined) throw new Error(`no Task ${uid} was read`)
  return task.actualDuration
}

/**
 * The notices `text` draws that `baseline` does not. The baseline is the same
 * file with every amount already a whole number of working days, so what is
 * left over is what FR-054's new sentences owe the person.
 */
function noticesBeyond(baseline: string, text: string): readonly MspdiNotice[] {
  const before = new Set(noticesOf(baseline).map((each) => `${each.at}|${each.what}`))
  return noticesOf(text).filter((each) => !before.has(`${each.at}|${each.what}`))
}

const WHOLE_FIVE_DAYS = amountOfMinutes(PER_DAY * 5)

/** The one written `Task` of a `durationFileText` file. */
function writtenFirstTask(document: Document): XmlNode {
  const root = written(document)
  const task = childrenNamed(nodeAt(root, 'Tasks') ?? ({} as XmlNode), 'Task')[0]
  if (task === undefined) throw new Error('no Task was written')
  return task
}

describe('FR-054 -- reading an amount of time that does not divide into working days', () => {
  it('GIVEN the fixture WHEN its head is read THEN the divisor is the one the document states (FR-054, AT-35)', () => {
    const document = accepted(durationFileText([WHOLE_FIVE_DAYS]))
    expect(document.schedule.project.minutesPerDay).toBe(PER_DAY)
    expect(minutesPerDayOf(document)).toBe(PER_DAY)
    // The cases below spell quarter days and half days, which asks for a
    // working day that divides by four into whole minutes.
    expect(PER_DAY % 4).toBe(0)
  })

  it('GIVEN an amount of exactly five working days WHEN read THEN it is five and nothing is reported (FR-054)', () => {
    const text = durationFileText([WHOLE_FIVE_DAYS])
    expect(actualDurationOf(accepted(text), 1)).toBe(5)
    expect(noticesBeyond(text, text)).toHaveLength(0)
  })

  it('GIVEN five and a quarter working days WHEN read THEN it is rounded down to five (FR-054 MUST)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)])
    expect(actualDurationOf(accepted(text), 1)).toBe(5)
  })

  it('GIVEN five and three quarters working days WHEN read THEN it is rounded up to six (FR-054 MUST)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + (PER_DAY * 3) / 4)])
    expect(actualDurationOf(accepted(text), 1)).toBe(6)
  })

  it('GIVEN exactly five and a half working days WHEN read THEN it goes to six -- the larger magnitude (FR-054 MUST)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 2)])
    expect(actualDurationOf(accepted(text), 1)).toBe(6)
  })

  it('GIVEN exactly minus five and a half working days WHEN read THEN it goes to minus six -- the same larger magnitude (FR-054 MUST)', () => {
    // FR-054 spells the half-day rule as the larger MAGNITUDE precisely so the
    // answer does not depend on the sign, and `xsd:duration` admits a leading
    // minus, so this side of zero is driven too.
    const text = durationFileText([amountOfMinutes(-(PER_DAY * 5 + PER_DAY / 2))])
    expect(actualDurationOf(accepted(text), 1)).toBe(-6)
  })

  it('GIVEN minus five and a quarter working days WHEN read THEN it is minus five, not minus six (FR-054 MUST)', () => {
    const text = durationFileText([amountOfMinutes(-(PER_DAY * 5 + PER_DAY / 4))])
    expect(actualDurationOf(accepted(text), 1)).toBe(-5)
  })

  it('GIVEN an amount that does not divide WHEN read THEN the value is NOT discarded (FR-054 MUST NOT)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)])
    expect(actualDurationOf(accepted(text), 1)).not.toBeNull()
  })

  it('GIVEN an amount that does not divide WHEN written back THEN the length is still there (FR-054 MUST NOT, FR-021)', () => {
    // The failure this MUST NOT names: a discarded column writes no element,
    // so the partner's own length vanishes on the round trip.
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)])
    expect(textAt(writtenFirstTask(accepted(text)), 'ActualDuration')).not.toBeNull()
  })

  it('GIVEN a rounded amount WHEN written back THEN it is spelled PTnHnMnS with all three parts (EX-9 MUST)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)])
    const spelled = textAt(writtenFirstTask(accepted(text)), 'ActualDuration')
    expect(spelled).toBe(WHOLE_FIVE_DAYS)
    expect(spelled ?? '').toMatch(/^-?PT\d+H\d+M\d+S$/)
  })

  it('GIVEN a rounded amount WHEN the written file is read again THEN nothing is rounded a second time (FR-054)', () => {
    const text = durationFileText([amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)])
    const again = mspdiFromDocument(accepted(text)).text
    expect(actualDurationOf(accepted(again), 1)).toBe(5)
    expect(noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), again)).toHaveLength(0)
  })
})

describe('FR-054 -- which minutes-per-day the rounding divides by', () => {
  it('GIVEN a file that states its own minutes per day WHEN a half day is read THEN that number is the divisor, not S-128 (FR-054 MUST)', () => {
    // A working day of PER_DAY + 120 minutes makes the same text read as a
    // different number of days under S-128 (seven, not six), so this case
    // tells the two sources apart.
    const ownPerDay = PER_DAY + 120
    const text = durationFileText([amountOfMinutes(ownPerDay * 5 + ownPerDay / 2)], ownPerDay)
    const document = accepted(text)
    expect(minutesPerDayOf(document)).toBe(ownPerDay)
    expect(actualDurationOf(document, 1)).toBe(6)
  })

  it('GIVEN a file that states no minutes per day WHEN a half day is read THEN S-128 of table T-209 is the divisor (FR-054 MUST)', () => {
    const half = S_128_MINUTES_PER_DAY * 5 + S_128_MINUTES_PER_DAY / 2
    const text = durationFileText([amountOfMinutes(half)], null)
    const document = accepted(text)
    expect(document.schedule.project.minutesPerDay).toBeNull()
    expect(minutesPerDayOf(document)).toBe(S_128_MINUTES_PER_DAY)
    expect(actualDurationOf(document, 1)).toBe(6)
  })
})

describe('FR-054 -- an amount of time carrying years or months', () => {
  it('GIVEN an amount of one month WHEN read THEN it is not converted (FR-054 MUST)', () => {
    const text = durationFileText(['P1M'])
    expect(actualDurationOf(accepted(text), 1)).toBeNull()
  })

  it('GIVEN an amount of one month WHEN read THEN the person is told, naming the item in words (FR-054 MUST, NT-1)', () => {
    const text = durationFileText(['P1M'])
    const told = noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), text)
    expect(told.length).toBeGreaterThan(0)
    expect(told.every(namesAnItem)).toBe(true)
  })

  it('GIVEN an amount of one year WHEN read THEN it is not converted and the person is told (FR-054 MUST)', () => {
    const text = durationFileText(['P1Y'])
    expect(actualDurationOf(accepted(text), 1)).toBeNull()
    expect(noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), text).length).toBeGreaterThan(0)
  })

  it('GIVEN an amount that mixes a month with hours WHEN read THEN the hours alone are not taken (FR-054 MUST)', () => {
    const text = durationFileText([`P1MT${PER_DAY / 60}H0M0S`])
    expect(actualDurationOf(accepted(text), 1)).toBeNull()
    expect(noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), text).length).toBeGreaterThan(0)
  })

  it('GIVEN an amount carrying months WHEN read THEN the file is still accepted (FR-054, FR-028)', () => {
    const read = answered(durationFileText(['P1M']))
    expect(read.ok).toBe(true)
  })
})

describe('FR-054 -- the count of rounded Tasks is told', () => {
  const NOT_WHOLE = amountOfMinutes(PER_DAY * 5 + PER_DAY / 4)
  const THREE_WHOLE = durationFileText([WHOLE_FIVE_DAYS, WHOLE_FIVE_DAYS, WHOLE_FIVE_DAYS])

  it('GIVEN two of three Tasks rounded WHEN read THEN the count two is told in words (FR-054 MUST, NT-1)', () => {
    const told = noticesBeyond(
      THREE_WHOLE,
      durationFileText([NOT_WHOLE, NOT_WHOLE, WHOLE_FIVE_DAYS]),
    )
    expect(told.length).toBeGreaterThan(0)
    expect(told.every(namesAnItem)).toBe(true)
    // LEFT RED ON PURPOSE (rule 04, section 1): FR-054 states
    // "the count of rounded Tasks MUST be told" (docs/spec/01-04-requirements
    // .md:2518, the sentence after the one about years and months). Two Tasks
    // were rounded here and the number two is told nowhere -- what comes back
    // is one notice per Task, none of which carries a count.
    expect(told.some((each) => each.what.includes('2'))).toBe(true)
  })

  it('GIVEN one of three Tasks rounded WHEN read THEN the number told is one -- it is the count, not a constant (FR-054 MUST)', () => {
    const told = noticesBeyond(
      THREE_WHOLE,
      durationFileText([NOT_WHOLE, WHOLE_FIVE_DAYS, WHOLE_FIVE_DAYS]),
    )
    expect(told.length).toBeGreaterThan(0)
    // LEFT RED ON PURPOSE, the same MUST as above: a count that is told has to
    // be the count, so one rounded Task says one and two rounded Tasks say
    // two. Neither number is told at all today.
    expect(told.some((each) => each.what.includes('1'))).toBe(true)
    expect(told.some((each) => each.what.includes('2'))).toBe(false)
  })

  it('GIVEN two Tasks rounded WHEN read THEN both values are kept, not only the counting (FR-054 MUST NOT)', () => {
    const document = accepted(durationFileText([NOT_WHOLE, NOT_WHOLE, WHOLE_FIVE_DAYS]))
    expect(actualDurationOf(document, 1)).toBe(5)
    expect(actualDurationOf(document, 2)).toBe(5)
    expect(actualDurationOf(document, 3)).toBe(5)
  })

  it('GIVEN every Task already whole WHEN read THEN nothing is reported as rounded (the empty case, R6.2)', () => {
    expect(noticesBeyond(THREE_WHOLE, THREE_WHOLE)).toHaveLength(0)
  })

  it('GIVEN no Task carrying an actual duration WHEN read THEN the column is null and nothing is reported (the empty case)', () => {
    const text = durationFileText([null, null])
    expect(actualDurationOf(accepted(text), 1)).toBeNull()
    expect(noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), text)).toHaveLength(0)
  })

  it('GIVEN a file with no Task at all WHEN read THEN it is accepted and nothing is reported as rounded (the empty case)', () => {
    const text = durationFileText([])
    expect(answered(text).ok).toBe(true)
    expect(noticesBeyond(durationFileText([WHOLE_FIVE_DAYS]), text)).toHaveLength(0)
  })
})

describe('FR-054 -- an actual duration this unit cannot read as an amount of time', () => {
  it('GIVEN a text that is not an amount of time WHEN read THEN a value comes back, never a throw (FR-028)', () => {
    const read = answered(durationFileText(['five days or so']))
    if (read.ok) {
      // Nothing invented: the column takes no number it could not read.
      expect(actualDurationOf(read.document, 1)).toBeNull()
    } else {
      expect(read.faults.length).toBeGreaterThan(0)
      const named = read.faults.every(
        (each) => each.at.trim().length > 0 && each.what.trim().length > 0,
      )
      expect(named, 'NT-1: a refusal names the item and says why in words').toBe(true)
    }
  })

  it('GIVEN an empty actual duration element WHEN read THEN no number is invented and nothing throws (FR-028)', () => {
    const read = answered(durationFileText(['']))
    if (read.ok) {
      expect(actualDurationOf(read.document, 1)).toBeNull()
    } else {
      expect(read.faults.every((each) => each.what.trim().length > 0)).toBe(true)
    }
  })
})

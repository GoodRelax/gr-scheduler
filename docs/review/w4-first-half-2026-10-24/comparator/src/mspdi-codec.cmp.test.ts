// Comparator part: src/adapter/document-codec/mspdi-codec.ts.
// Every case is `<id> <sha256 of the canonical output>`; a throw is recorded as an output (class + message).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { it } from 'vitest'

import { CaseLines, canon, guarded, sha256 } from './canon'

const KIT = process.env['COMPARATOR_KIT'] ?? ''
const OUT = process.env['COMPARATOR_OUT'] ?? ''
const INPUTS = join(KIT, 'data', 'inputs')

const read = (name: string): string => readFileSync(join(INPUTS, name), 'utf8')

const XML_SAMPLES = [
  'sample-small-website-renewal.en.xml',
  'sample-small-website-renewal.ja.xml',
  'sample-medium-sfa-webapp.en.xml',
  'sample-medium-sfa-webapp.ja.xml',
  'sample-large-erp-program.en.xml',
  'sample-large-erp-program.ja.xml',
  'cr-651-large-sample-before-cr-790.ja.xml',
]
const JSON_SAMPLES = [
  'startup-template.json',
  'empty-document.json',
  'measuring-document.json',
  'Three-Year Product Plan.json',
  'sample-large-erp-program.en.json',
  'sample-large-erp-program.ja.json',
  'sample-medium-sfa-webapp.ja.json',
  'sample-small-website-renewal.ja.json',
  'grs-document-with-revision-stamp.json',
]

const LAST_SAVED = ['2026-10-24T09:00:00', '2000-01-01T00:00:00', '', 'not-a-date']

// A hand-made MSPDI that touches every collection, link type, lag format, exception kind and carry shape.
const SEED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <UID>7</UID>
  <Name>seed.xml</Name>
  <Title>Seed &amp; edge &lt;doc&gt; &#x41;</Title>
  <Author>Someone</Author>
  <CreationDate>2026-01-05T08:00:00</CreationDate>
  <Revision>3</Revision>
  <StartDate>2026-01-05T08:00:00</StartDate>
  <StatusDate>2026-02-02T17:00:00</StatusDate>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>09:00:00</DefaultStartTime>
  <DefaultFinishTime>18:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <WeekStartDay>0</WeekStartDay>
  <UnknownProjectLeaf>keep me</UnknownProjectLeaf>
  <UnknownProjectTree><Inner>1</Inner><Inner>2</Inner><Deeper><Leaf>x</Leaf></Deeper></UnknownProjectTree>
  <ExtendedAttributes>
    <ExtendedAttribute><FieldID>188743731</FieldID><FieldName>Text1</FieldName><Alias>Team</Alias></ExtendedAttribute>
    <ExtendedAttribute><FieldID>188743767</FieldID><FieldName>Number1</FieldName><Alias>Fade In</Alias></ExtendedAttribute>
    <ExtendedAttribute><FieldID>188743768</FieldID><FieldName>Number2</FieldName><Alias>Fade Out</Alias></ExtendedAttribute>
  </ExtendedAttributes>
  <Calendars>
    <Calendar>
      <UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>
        <WeekDay><DayType>1</DayType><DayWorking>0</DayWorking></WeekDay>
        <WeekDay><DayType>2</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>3</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>
        <WeekDay><DayType>4</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>5</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>6</DayType><DayWorking>1</DayWorking></WeekDay>
        <WeekDay><DayType>7</DayType><DayWorking>0</DayWorking></WeekDay>
      </WeekDays>
      <Exceptions>
        <Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>2026-01-12T00:00:00</FromDate><ToDate>2026-01-12T23:59:00</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>Holiday</Name><Type>1</Type><DayWorking>0</DayWorking></Exception>
        <Exception><TimePeriod><FromDate>2026-01-17T00:00:00</FromDate><ToDate>2026-01-17T23:59:00</ToDate></TimePeriod><Name>Workday</Name><Type>1</Type><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>09:00:00</FromTime><ToTime>15:00:00</ToTime></WorkingTime></WorkingTimes></Exception>
        <Exception><TimePeriod><FromDate>2026-03-01T00:00:00</FromDate><ToDate>2026-03-31T23:59:00</ToDate></TimePeriod><Name>Weekly</Name><Type>6</Type><DayWorking>0</DayWorking></Exception>
        <Exception><TimePeriod><FromDate>2026-04-01T00:00:00</FromDate><ToDate>2026-04-03T23:59:00</ToDate></TimePeriod><Name>Daily</Name><Type>7</Type><DayWorking>0</DayWorking></Exception>
      </Exceptions>
    </Calendar>
    <Calendar><UID>2</UID><Name>Night</Name><IsBaseCalendar>0</IsBaseCalendar><BaseCalendarUID>1</BaseCalendarUID></Calendar>
  </Calendars>
  <Tasks>
    <Task><UID>0</UID><ID>0</ID><Name>Summary</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary><Start>2026-01-05T08:00:00</Start><Finish>2026-03-02T17:00:00</Finish></Task>
    <Task><UID>1</UID><ID>1</ID><Name>Phase</Name><OutlineLevel>1</OutlineLevel><Summary>1</Summary><Start>2026-01-05T08:00:00</Start><Finish>2026-02-27T17:00:00</Finish></Task>
    <Task><UID>2</UID><ID>2</ID><Name>Design</Name><OutlineLevel>2</OutlineLevel><Start>2026-01-05T08:00:00</Start><Finish>2026-01-16T17:00:00</Finish><Duration>PT80H0M0S</Duration><ActualStart>2026-01-05T08:00:00</ActualStart><ActualFinish>2026-01-16T17:00:00</ActualFinish><PercentComplete>100</PercentComplete><Notes>multi
line</Notes><ExtendedAttribute><FieldID>188743731</FieldID><Value>Blue</Value></ExtendedAttribute><ExtendedAttribute><FieldID>188743767</FieldID><Value>2</Value></ExtendedAttribute></Task>
    <Task><UID>3</UID><ID>3</ID><Name>Build</Name><OutlineLevel>2</OutlineLevel><Start>2026-01-19T08:00:00</Start><Finish>2026-02-13T17:00:00</Finish><ActualStart>2026-01-19T08:00:00</ActualStart><ActualDuration>PT40H0M0S</ActualDuration><Stop>2026-01-23T17:00:00</Stop><Resume>2026-01-26T08:00:00</Resume><PercentComplete>25</PercentComplete><CalendarUID>2</CalendarUID><Deadline>2026-02-20T17:00:00</Deadline><ConstraintType>2</ConstraintType><ConstraintDate>2026-01-19T08:00:00</ConstraintDate>
      <PredecessorLink><PredecessorUID>2</PredecessorUID><Type>1</Type><CrossProject>0</CrossProject><LinkLag>0</LinkLag><LagFormat>7</LagFormat></PredecessorLink></Task>
    <Task><UID>4</UID><ID>4</ID><Name>Review</Name><OutlineLevel>2</OutlineLevel><Milestone>1</Milestone><Start>2026-02-13T17:00:00</Start><Finish>2026-02-13T17:00:00</Finish>
      <PredecessorLink><PredecessorUID>3</PredecessorUID><Type>0</Type><LinkLag>4800</LinkLag><LagFormat>7</LagFormat></PredecessorLink>
      <PredecessorLink><PredecessorUID>2</PredecessorUID><Type>2</Type><LinkLag>-2400</LinkLag><LagFormat>5</LagFormat></PredecessorLink>
      <PredecessorLink><PredecessorUID>99</PredecessorUID><Type>3</Type><LinkLag>0</LinkLag><LagFormat>19</LagFormat></PredecessorLink>
      <PredecessorLink><PredecessorUID>0</PredecessorUID><Type>1</Type></PredecessorLink></Task>
    <Task><UID>5</UID><ID>5</ID><Name>Ship</Name><OutlineLevel>1</OutlineLevel><Start>2026-02-16T08:00:00</Start><Finish>2026-03-02T17:00:00</Finish><PercentComplete>0</PercentComplete><Active>1</Active><Manual>0</Manual>
      <PredecessorLink><PredecessorUID>4</PredecessorUID><Type>1</Type><LinkLag>600</LinkLag><LagFormat>12</LagFormat></PredecessorLink></Task>
    <Task><UID>6</UID><ID>6</ID><Name></Name><OutlineLevel>3</OutlineLevel></Task>
    <Task><UID>6</UID><ID>7</ID><Name>Duplicate uid</Name><OutlineLevel>1</OutlineLevel><Start>2026-02-16T08:00:00</Start><Finish>2026-02-17T17:00:00</Finish></Task>
    <Task><ID>8</ID><Name>No uid</Name><OutlineLevel>1</OutlineLevel></Task>
  </Tasks>
  <Resources>
    <Resource><UID>0</UID><ID>0</ID><Type>1</Type><IsNull>0</IsNull></Resource>
    <Resource><UID>1</UID><ID>1</ID><Name>Alice</Name><Type>1</Type><CalendarUID>2</CalendarUID><MaxUnits>1.00</MaxUnits></Resource>
    <Resource><UID>2</UID><ID>2</ID><Name>Material</Name><Type>0</Type></Resource>
    <Resource><UID>2</UID><Name>Dup</Name><Type>1</Type></Resource>
  </Resources>
  <Assignments>
    <Assignment><UID>1</UID><TaskUID>2</TaskUID><ResourceUID>1</ResourceUID><Units>1</Units></Assignment>
    <Assignment><UID>2</UID><TaskUID>3</TaskUID><ResourceUID>2</ResourceUID></Assignment>
    <Assignment><UID>3</UID><TaskUID>77</TaskUID><ResourceUID>1</ResourceUID></Assignment>
    <Assignment><UID>4</UID><TaskUID>3</TaskUID><ResourceUID>-65535</ResourceUID></Assignment>
  </Assignments>
</Project>
`

interface Leaf {
  readonly name: string
  readonly start: number
  readonly end: number
  readonly value: string
}

function leavesOf(text: string): Leaf[] {
  const out: Leaf[] = []
  const pattern = /<([A-Za-z][\w.]*)>([^<]*)<\/\1>/g
  for (let hit = pattern.exec(text); hit !== null; hit = pattern.exec(text)) {
    out.push({ name: hit[1] ?? '', start: hit.index, end: hit.index + hit[0].length, value: hit[2] ?? '' })
  }
  return out
}

const VARIANTS: readonly [string, (leaf: Leaf) => string][] = [
  ['drop', () => ''],
  ['empty', (leaf) => `<${leaf.name}></${leaf.name}>`],
  ['selfclose', (leaf) => `<${leaf.name}/>`],
  ['zero', (leaf) => `<${leaf.name}>0</${leaf.name}>`],
  ['one', (leaf) => `<${leaf.name}>1</${leaf.name}>`],
  ['neg', (leaf) => `<${leaf.name}>-1</${leaf.name}>`],
  ['frac', (leaf) => `<${leaf.name}>1.5</${leaf.name}>`],
  ['alpha', (leaf) => `<${leaf.name}>abc</${leaf.name}>`],
  ['pad', (leaf) => `<${leaf.name}> ${leaf.value} </${leaf.name}>`],
  ['huge', (leaf) => `<${leaf.name}>99999999999999999999</${leaf.name}>`],
  ['dup', (leaf) => `<${leaf.name}>${leaf.value}</${leaf.name}><${leaf.name}>2</${leaf.name}>`],
  ['date', (leaf) => `<${leaf.name}>2026-02-30T25:61:00</${leaf.name}>`],
  ['iso', (leaf) => `<${leaf.name}>2026-05-06T10:30:00</${leaf.name}>`],
  ['duration', (leaf) => `<${leaf.name}>PT12H30M0S</${leaf.name}>`],
  ['ymduration', (leaf) => `<${leaf.name}>P1Y2M3DT4H</${leaf.name}>`],
  ['tree', (leaf) => `<${leaf.name}><Child>1</Child></${leaf.name}>`],
]

// WHY: the large samples are decoded whole, but mutated only after trimming to a handful of tasks,
// so the run stays in minutes and every column still meets every variant.
function trimmedTasks(text: string, keep: number): string {
  const open = text.indexOf('<Tasks>')
  const close = text.indexOf('</Tasks>')
  if (open < 0 || close < 0) return text
  const body = text.slice(open + '<Tasks>'.length, close)
  const parts = body.split('</Task>')
  const kept = parts.slice(0, keep).join('</Task>') + (parts.length > keep ? '</Task>\n  ' : '')
  return text.slice(0, open + '<Tasks>'.length) + kept + text.slice(close)
}

function trimmedCollection(text: string, tag: string, row: string, keep: number): string {
  const open = text.indexOf(`<${tag}>`)
  const close = text.indexOf(`</${tag}>`)
  if (open < 0 || close < 0) return text
  const body = text.slice(open + tag.length + 2, close)
  const parts = body.split(`</${row}>`)
  const kept = parts.slice(0, keep).join(`</${row}>`) + (parts.length > keep ? `</${row}>\n  ` : '')
  return text.slice(0, open + tag.length + 2) + kept + text.slice(close)
}

function trimmedSample(text: string): string {
  let out = trimmedTasks(text, 14)
  out = trimmedCollection(out, 'Resources', 'Resource', 4)
  out = trimmedCollection(out, 'Assignments', 'Assignment', 6)
  out = trimmedCollection(out, 'Calendars', 'Calendar', 2)
  return out
}

function structuralVariants(text: string): [string, string][] {
  const out: [string, string][] = []
  const swap = (from: string, to: string): string => text.split(from).join(to)
  out.push(['bom', '﻿' + text])
  out.push(['double-bom', '﻿﻿' + text])
  out.push(['no-namespace', text.replace(/<Project xmlns="[^"]*">/, '<Project>')])
  out.push(['other-namespace', text.replace(/<Project xmlns="[^"]*">/, '<Project xmlns="http://example.com/other">')])
  out.push(['xsd-namespace', text.replace(/<Project xmlns="[^"]*">/, '<Project xmlns="http://schemas.microsoft.com/project/2007">')])
  out.push(['prefixed', text.replace(/<Project xmlns="[^"]*">/, '<Project xmlns="http://schemas.microsoft.com/project" xmlns:x="urn:x">')])
  out.push(['root-renamed', swap('<Project', '<Projekt').split('</Project>').join('</Projekt>')])
  out.push(['truncated-half', text.slice(0, Math.floor(text.length / 2))])
  out.push(['truncated-end', text.slice(0, text.length - 12)])
  out.push(['empty', ''])
  out.push(['only-declaration', '<?xml version="1.0"?>'])
  out.push(['bare-project', '<Project/>'])
  out.push(['bare-project-ns', '<Project xmlns="http://schemas.microsoft.com/project"></Project>'])
  out.push(['comment', text.replace('<Tasks>', '<Tasks><!-- a comment <Task> -->')])
  out.push(['cdata', text.replace(/<Name>([^<]*)<\/Name>/, '<Name><![CDATA[a <b> & c]]></Name>')])
  out.push(['attribute', text.replace('<Tasks>', '<Tasks count="3">')])
  out.push(['no-tasks', text.replace(/<Tasks>[\s\S]*<\/Tasks>/, '')])
  out.push(['empty-tasks', text.replace(/<Tasks>[\s\S]*<\/Tasks>/, '<Tasks></Tasks>')])
  out.push(['no-calendars', text.replace(/<Calendars>[\s\S]*<\/Calendars>/, '')])
  out.push(['no-resources', text.replace(/<Resources>[\s\S]*<\/Resources>/, '')])
  out.push(['no-assignments', text.replace(/<Assignments>[\s\S]*<\/Assignments>/, '')])
  out.push(['no-extended', text.replace(/<ExtendedAttributes>[\s\S]*?<\/ExtendedAttributes>/, '')])
  out.push(['crlf', text.replace(/\n/g, '\r\n')])
  out.push(['unknown-in-task', text.replace('</Task>', '<Mystery><A>1</A><B><C>2</C></B></Mystery><MysteryLeaf>z</MysteryLeaf></Task>')])
  out.push(['mismatched', text.replace('</Name>', '</Nam>')])
  out.push(['entity-unknown', text.replace(/<Name>([^<]*)<\/Name>/, '<Name>&nbsp;x</Name>')])
  out.push(['entity-numeric', text.replace(/<Name>([^<]*)<\/Name>/, '<Name>&#12354;&#x3044;</Name>')])
  const firstTask = /<Task>[\s\S]*?<\/Task>/.exec(text)
  if (firstTask !== null) {
    out.push(['first-task-dropped', text.replace(firstTask[0], '')])
    out.push(['first-task-twice', text.replace(firstTask[0], firstTask[0] + firstTask[0])])
  }
  const tasks = [...text.matchAll(/<Task>[\s\S]*?<\/Task>/g)].map((one) => one[0])
  if (tasks.length >= 3) {
    const a = tasks[1] ?? ''
    const b = tasks[2] ?? ''
    out.push(['tasks-swapped', text.replace(a + '', '\u0000A').replace(b, a).replace('\u0000A', b)])
    out.push(['tasks-reversed', text.replace(/<Tasks>[\s\S]*<\/Tasks>/, '<Tasks>' + [...tasks].reverse().join('') + '</Tasks>')])
  }
  out.push(['outline-jump', text.replace(/<OutlineLevel>2<\/OutlineLevel>/, '<OutlineLevel>5</OutlineLevel>')])
  out.push(['outline-all-1', text.replace(/<OutlineLevel>\d+<\/OutlineLevel>/g, '<OutlineLevel>1</OutlineLevel>')])
  out.push(['outline-shift', text.replace(/<OutlineLevel>(\d+)<\/OutlineLevel>/g, (_m, d: string) => `<OutlineLevel>${Number(d) + 1}</OutlineLevel>`)])
  out.push(['milestones-all', text.replace(/<Milestone>0<\/Milestone>/g, '<Milestone>1</Milestone>')])
  out.push(['percent-all-50', text.replace(/<PercentComplete>\d+<\/PercentComplete>/g, '<PercentComplete>50</PercentComplete>')])
  out.push(['links-type-each', text.replace(/<Type>1<\/Type>(\s*<CrossProject>|\s*<LinkLag>)/, '<Type>3</Type>$1')])
  out.push(['lags-days', text.replace(/<LagFormat>\d+<\/LagFormat>/g, '<LagFormat>7</LagFormat>').replace(/<LinkLag>0<\/LinkLag>/g, '<LinkLag>4800</LinkLag>')])
  out.push(['lags-elapsed', text.replace(/<LagFormat>\d+<\/LagFormat>/g, '<LagFormat>8</LagFormat>')])
  out.push(['lags-percent', text.replace(/<LagFormat>\d+<\/LagFormat>/g, '<LagFormat>19</LagFormat>')])
  out.push(['no-starts', text.replace(/<Start>[^<]*<\/Start>/g, '')])
  out.push(['no-finishes', text.replace(/<Finish>[^<]*<\/Finish>/g, '')])
  out.push(['no-actuals', text.replace(/<Actual(Start|Finish|Duration)>[^<]*<\/Actual\1>/g, '')])
  out.push(['date-only', text.replace(/<(Start|Finish)>(\d{4}-\d{2}-\d{2})T[^<]*<\/\1>/g, '<$1>$2</$1>')])
  out.push(['with-zone', text.replace(/<(Start|Finish)>([^<]*)<\/\1>/g, '<$1>$2Z</$1>')])
  out.push(['with-millis', text.replace(/<(Start|Finish)>([^<]*)<\/\1>/g, '<$1>$2.123</$1>')])
  out.push(['exceptions-recurring', text.replace(/<Type>1<\/Type>(\s*<DayWorking>)/g, '<Type>6</Type>$1')])
  out.push(['week-all-off', text.replace(/<DayWorking>1<\/DayWorking>/g, '<DayWorking>0</DayWorking>')])
  // Foreign elements inside each collection, rows without a UID, odd durations, pj15-only names.
  out.push(['foreign-in-tasks', text.replace('<Tasks>', '<Tasks><Foreign>1</Foreign><Foreign><A>1</A></Foreign>')])
  out.push(['foreign-in-resources', text.replace('<Resources>', '<Resources><Foreign>1</Foreign>')])
  out.push(['foreign-in-assignments', text.replace('<Assignments>', '<Assignments><Foreign>1</Foreign>')])
  out.push(['foreign-in-calendars', text.replace('<Calendars>', '<Calendars><Foreign>1</Foreign>')])
  out.push(['foreign-in-weekdays', text.replace('<WeekDays>', '<WeekDays><Foreign>1</Foreign>')])
  out.push(['foreign-in-exceptions', text.replace('<Exceptions>', '<Exceptions><Foreign>1</Foreign>')])
  out.push(['resource-no-uid', text.replace('<Resources>', '<Resources><Resource><Name>Nobody</Name><Type>1</Type></Resource>')])
  out.push(['assignment-no-uid', text.replace('<Assignments>', '<Assignments><Assignment><TaskUID>2</TaskUID><ResourceUID>1</ResourceUID></Assignment>')])
  out.push(['calendar-no-uid', text.replace('<Calendars>', '<Calendars><Calendar><Name>NoUid</Name></Calendar>')])
  out.push(['actual-duration-bad', text.replace(/<ActualDuration>[^<]*<\/ActualDuration>/g, '<ActualDuration>soon</ActualDuration>')])
  out.push(['actual-duration-years', text.replace(/<ActualDuration>[^<]*<\/ActualDuration>/g, '<ActualDuration>P1Y2M</ActualDuration>')])
  out.push(['actual-duration-no-stop', text.replace(/<Stop>[^<]*<\/Stop>/g, '').replace(/<ActualDuration>[^<]*<\/ActualDuration>/g, '<ActualDuration>PT2H30M15.5S</ActualDuration>')])
  out.push(['actual-duration-negative', text.replace(/<ActualDuration>[^<]*<\/ActualDuration>/g, '<ActualDuration>-PT8H0M0S</ActualDuration>')])
  out.push(['actual-duration-days', text.replace(/<ActualDuration>[^<]*<\/ActualDuration>/g, '<ActualDuration>P3DT4H</ActualDuration>')])
  out.push(['pj15-leaf', text.replace('<Tasks>', '<IsPublished>1</IsPublished><Tasks>')])
  out.push(['pj15-element', text.replace('</Project>', '<WorkWeeks><WorkWeek><Name>w</Name></WorkWeek></WorkWeeks></Project>')])
  out.push(['duplicate-leaves', text.replace(/<Name>([^<]*)<\/Name>/g, '<Name>$1</Name><Name>dup</Name>')])
  return out
}

function documentOfJson(text: string): unknown {
  return JSON.parse(text)
}

it('mspdi-codec comparator', async () => {
  const lines = new CaseLines(OUT)
  const codec = await import('../../../src/adapter/document-codec/mspdi-codec')
  const json = await import('../../../src/adapter/document-codec/json-codec')
  const template = read('startup-template.json')
  const templateRead = json.documentFromJson(template)
  if (!templateRead.ok) throw new Error('startup template does not decode')
  const current = templateRead.document

  lines.putValue('exports', Object.keys(codec).sort())
  lines.putValue('const.MSPDI_NAMESPACE', codec.MSPDI_NAMESPACE)
  lines.putValue('const.PATHS', codec.PATHS)
  lines.putValue('const.BYTE_ORDER_MARK', codec.BYTE_ORDER_MARK)

  // Plain helpers over generated values.
  const raws: (string | null | undefined)[] = [
    null, undefined, '', ' ', '0', '-0', '+0', '1', '-1', '+1', ' 7 ', '\t8\n', '1.0', '1e3', '0x10', '00012',
    '9007199254740991', '9007199254740992', '-9007199254740991', '-9007199254740992', '99999999999999999999',
    'abc', '1 2', '١٢', '１２', '+-1', '--1', '1-', 'NaN', 'Infinity',
  ]
  raws.forEach((raw, at) => lines.putValue(`wholeNumberOf.${at}`, guarded(() => codec.wholeNumberOf(raw))))
  const texts = ['', 'abc', '﻿', '﻿abc', '﻿﻿abc', 'a﻿', ' ﻿']
  texts.forEach((text, at) => lines.putValue(`withoutLeadingByteOrderMark.${at}`, codec.withoutLeadingByteOrderMark(text)))
  const objects: unknown[] = [null, undefined, 0, '', 'x', [], [1], {}, { a: 1 }, new Date(0), Object.create(null)]
  objects.forEach((one, at) => lines.putValue(`isObject.${at}`, codec.isObject(one)))
  lines.putValue('notice.0', codec.notice('Project/Tasks/Task[3]', 'what'))
  lines.putValue('notice.1', codec.notice('', ''))
  lines.putValue('leaf.0', codec.leaf('Name', 'x'))
  lines.putValue('leaf.1', codec.leaf('', ''))
  const element = {
    name: 'Task',
    text: '',
    children: [
      { name: 'UID', text: '12', children: [] },
      { name: 'Name', text: ' padded ', children: [] },
      { name: 'Name', text: 'second', children: [] },
      { name: 'Tree', text: 'ignored', children: [{ name: 'Leaf', text: '1', children: [] }] },
      { name: 'Bad', text: '1.5', children: [] },
      { name: 'Empty', text: '', children: [] },
    ],
  }
  for (const name of ['UID', 'Name', 'Tree', 'Bad', 'Empty', 'Missing']) {
    lines.putValue(`childOf.${name}`, guarded(() => codec.childOf(element as never, name)))
    lines.putValue(`textColumn.${name}`, guarded(() => codec.textColumn(element as never, name)))
    lines.putValue(`integerColumn.${name}`, guarded(() => codec.integerColumn(element as never, name)))
  }
  const carriedShapes: unknown[] = [
    null, 1, {}, { project: null }, { project: { carry: {} } },
    { project: { carry: { GUID: 'x' } } },
    { project: { carry: { ProjectExternallyEdited: '1' } } },
    { project: { carryElements: [{ name: 'Task', fields: { IsPublished: '1' }, children: [] }] } },
    { project: { carryElements: [{ name: 'Calendar', fields: {}, children: [{ name: 'WorkWeeks', fields: {}, children: [] }] }] } },
    { project: {}, tasks: [{ carry: { IsPublished: '1' } }] },
    { project: {}, tasks: [{ carry: {}, carryElements: [{ name: 'Baseline', fields: { Number: '1' }, children: [] }] }] },
    { project: {}, tasks: [{ dependencies: [{ carry: { CrossProjectName: 'x' } }] }] },
    { project: {}, calendars: [{ weekDays: [{ carry: {} }], exceptions: [{ carry: { Occurrences: '1' } }] }] },
    { project: {}, resources: [{ carry: { IsBudget: '1' } }], assignments: [{ carry: { BudgetWork: 'PT0H0M0S' } }] },
    { project: { carryElements: [{ name: 42 }, null, 'x'] } },
  ]
  carriedShapes.forEach((shape, at) => lines.putValue(`mspdiVersionOfCarried.shape${at}`, guarded(() => codec.mspdiVersionOfCarried(shape))))

  const decodeCase = (id: string, text: string, alsoEncode: boolean): void => {
    const decoded = guarded(() => codec.documentFromMspdi(text, current))
    lines.putValue(`decode.${id}`, decoded)
    if (!alsoEncode) return
    if ('ok' in decoded && decoded.ok) {
      lines.putValue(`version.${id}`, guarded(() => codec.mspdiVersionOfCarried(decoded.document.schedule)))
      const encoded = guarded(() => codec.mspdiFromDocument(decoded.document, LAST_SAVED[0] ?? ''))
      lines.putValue(`encode.${id}`, encoded)
      if ('text' in encoded) {
        const again = guarded(() => codec.documentFromMspdi(encoded.text, current))
        lines.putValue(`roundtrip.${id}`, again)
        if ('ok' in again && again.ok) {
          const twice = guarded(() => codec.mspdiFromDocument(again.document, LAST_SAVED[0] ?? ''))
          lines.putValue(`reencode.${id}`, twice)
          lines.putValue(`stable.${id}`, 'text' in twice && twice.text === encoded.text)
        }
      }
    }
  }

  // Whole samples.
  for (const name of XML_SAMPLES) {
    const text = read(name)
    decodeCase(`sample.${name}`, text, true)
    const decoded = codec.documentFromMspdi(text, current)
    if (decoded.ok) {
      for (const lastSaved of LAST_SAVED.slice(1)) {
        lines.putValue(`encode-lastSaved.${name}.${sha256(lastSaved).slice(0, 8)}`, guarded(() => codec.mspdiFromDocument(decoded.document, lastSaved)))
      }
    }
  }

  // GRS JSON documents encoded, then read back.
  for (const name of JSON_SAMPLES) {
    const text = read(name)
    const viaCodec = guarded(() => json.documentFromJson(text))
    const document = 'ok' in viaCodec && viaCodec.ok ? viaCodec.document : documentOfJson(text)
    lines.putValue(`json-version.${name}`, guarded(() => codec.mspdiVersionOfCarried((document as { schedule?: unknown }).schedule)))
    const encoded = guarded(() => codec.mspdiFromDocument(document as never, LAST_SAVED[0] ?? ''))
    lines.putValue(`encode-json.${name}`, encoded)
    if ('text' in encoded) decodeCase(`json-back.${name}`, encoded.text, true)
  }

  // Mutated documents: the seed and trimmed samples, every leaf name, every variant.
  const bases: [string, string][] = [
    ['seed', SEED_XML],
    ['small-en', trimmedSample(read('sample-small-website-renewal.en.xml'))],
    ['medium-ja', trimmedSample(read('sample-medium-sfa-webapp.ja.xml'))],
    ['large-en', trimmedSample(read('sample-large-erp-program.en.xml'))],
  ]
  for (const [baseId, base] of bases) {
    decodeCase(`base.${baseId}`, base, true)
    for (const [variantId, text] of structuralVariants(base)) decodeCase(`struct.${baseId}.${variantId}`, text, true)
    const leaves = leavesOf(base)
    const byName = new Map<string, Leaf[]>()
    for (const one of leaves) byName.set(one.name, [...(byName.get(one.name) ?? []), one])
    const isSeed = baseId === 'seed'
    for (const name of [...byName.keys()].sort()) {
      const all = byName.get(name) ?? []
      const picks = isSeed ? [...new Set([0, 1, 2, all.length - 1])].filter((i) => i >= 0 && i < all.length) : [0]
      for (const pick of picks) {
        const target = all[pick]
        if (target === undefined) continue
        const variants = isSeed || baseId === 'small-en' ? VARIANTS : VARIANTS.filter(([v]) => ['drop', 'empty', 'alpha', 'neg', 'dup'].includes(v))
        for (const [variantId, make] of variants) {
          const text = base.slice(0, target.start) + make(target) + base.slice(target.end)
          decodeCase(`leaf.${baseId}.${name}.${pick}.${variantId}`, text, true)
        }
      }
    }
  }

  // Generated GRS documents: the template with task fields pushed to edges, then encoded and read back.
  const templateDoc = current
  const tasks = templateDoc.schedule.tasks
  const taskEdits: [string, (task: Record<string, unknown>) => Record<string, unknown>][] = [
    ['milestone', (t) => ({ ...t, milestone: true, finish: t['start'] })],
    ['no-dates', (t) => ({ ...t, start: null, finish: null })],
    ['actual-started', (t) => ({ ...t, actualStart: t['start'], percentComplete: 30 })],
    ['actual-done', (t) => ({ ...t, actualStart: t['start'], actualFinish: t['finish'], percentComplete: 100 })],
    ['stopped', (t) => ({ ...t, actualStart: t['start'], stop: t['start'], resume: t['finish'], resumeValid: true, percentComplete: 10 })],
    ['stop-no-resume', (t) => ({ ...t, actualStart: t['start'], stop: t['start'], resume: null, resumeValid: false })],
    ['deadline', (t) => ({ ...t, deadline: t['finish'] })],
    ['notes', (t) => ({ ...t, notes: 'a <b> & "c"\nline' })],
    ['name-empty', (t) => ({ ...t, name: '' })],
    ['name-null', (t) => ({ ...t, name: null })],
    ['fade', (t) => ({ ...t, fadeInDays: 2, fadeOutDays: 3 })],
    ['fade-zero', (t) => ({ ...t, fadeInDays: 0, fadeOutDays: 0 })],
    ['percent-odd', (t) => ({ ...t, percentComplete: 101 })],
    ['calendar', (t) => ({ ...t, calendarUid: 1 })],
    ['carry', (t) => ({ ...t, carry: { ...(t['carry'] as object), Priority: '700', IsPublished: '1' } })],
    ['carry-element', (t) => ({ ...t, carryElements: [{ ordinal: 3, name: 'Baseline', fields: { Number: '0', Start: '2026-01-01T08:00:00' }, children: [] }] })],
    ['dep-each', (t) => ({ ...t, dependencies: [0, 1, 2, 3].map((type) => ({ predecessorUid: tasks[0]?.uid ?? 1, linkType: type, linkLag: type * 480, lagFormat: 7, carry: {} })) })],
    ['dep-dangling', (t) => ({ ...t, dependencies: [{ predecessorUid: 99999, linkType: 1, linkLag: 0, lagFormat: 7, carry: {} }] })],
    ['parent-missing', (t) => ({ ...t, parentTaskUid: 99999 })],
    ['wbs-negative', (t) => ({ ...t, wbsOrder: -5 })],
    ['carry-duration', (t) => ({ ...t, carry: { ...(t['carry'] as object), Duration: 'PT8H0M0S', ConstraintType: '2' } })],
    ['carry-stop', (t) => ({ ...t, actualStart: t['start'], stop: t['start'], carry: { ...(t['carry'] as object), Stop: '2026-01-01T08:00:00' } })],
    ['carry-actual-duration', (t) => ({ ...t, actualStart: t['start'], stop: t['finish'], carry: { ...(t['carry'] as object), ActualDuration: 'PT16H0M0S', '#StopCountedFrom': 'PT16H0M0S' } })],
    ['self-parent', (t) => ({ ...t, parentTaskUid: t['uid'] })],
  ]
  const picks = [0, 1, Math.floor(tasks.length / 2), tasks.length - 1].filter((i, at, all) => i >= 0 && all.indexOf(i) === at)
  for (const [editId, edit] of taskEdits) {
    for (const pick of picks) {
      const edited = {
        ...templateDoc,
        schedule: {
          ...templateDoc.schedule,
          tasks: tasks.map((task, at) => (at === pick ? edit(task as unknown as Record<string, unknown>) : task)),
        },
      }
      const encoded = guarded(() => codec.mspdiFromDocument(edited as never, LAST_SAVED[0] ?? ''))
      lines.putValue(`gen.${editId}.${pick}`, encoded)
      if ('text' in encoded) lines.putValue(`gen-back.${editId}.${pick}`, guarded(() => codec.documentFromMspdi(encoded.text, current)))
    }
  }
  const scheduleEdits: [string, (schedule: Record<string, unknown>) => Record<string, unknown>][] = [
    ['no-tasks', (s) => ({ ...s, tasks: [], taskGroupMembers: [], taskVisuals: [], assignments: [] })],
    ['no-calendars', (s) => ({ ...s, calendars: [] })],
    ['no-resources', (s) => ({ ...s, resources: [], assignments: [] })],
    ['project-carry', (s) => ({ ...s, project: { ...(s['project'] as object), carry: { xmlns: 'http://schemas.microsoft.com/project', GUID: 'g' } } })],
    ['project-pj15', (s) => ({ ...s, project: { ...(s['project'] as object), sourceFormat: 'pj15' } })],
    ['project-grs', (s) => ({ ...s, project: { ...(s['project'] as object), sourceFormat: 'grs' } })],
    ['status-null', (s) => ({ ...s, project: { ...(s['project'] as object), statusDate: null } })],
    ['times-null', (s) => ({ ...s, project: { ...(s['project'] as object), defaultStartTime: null, defaultFinishTime: null } })],
    ['reversed-tasks', (s) => ({ ...s, tasks: [...(s['tasks'] as unknown[])].reverse() })],
    ['parent-cycle', (s) => {
      const list = [...(s['tasks'] as Record<string, unknown>[])]
      const a = list[0]
      const b = list[1]
      if (a !== undefined && b !== undefined) {
        list[0] = { ...a, parentTaskUid: b['uid'] }
        list[1] = { ...b, parentTaskUid: a['uid'] }
      }
      return { ...s, tasks: list }
    }],
    ['carried-rows', (s) => ({ ...s, project: { ...(s['project'] as object), carryElements: [
      { ordinal: 0, name: 'Task', fields: { UID: '900', Name: 'carried' }, children: [] },
      { ordinal: 2, name: 'Resource', fields: { Name: 'carried' }, children: [] },
      { ordinal: 5, name: 'Calendar', fields: { Name: 'carried' }, children: [{ ordinal: 0, name: 'WorkWeeks', fields: {}, children: [] }] },
      { ordinal: 9, name: 'Assignment', fields: { UID: '77' }, children: [] },
      { ordinal: 1, name: 'Mystery', fields: { A: '1' }, children: [] },
    ] } })],
  ]
  for (const [editId, edit] of scheduleEdits) {
    const edited = { ...templateDoc, schedule: edit(templateDoc.schedule as unknown as Record<string, unknown>) }
    const encoded = guarded(() => codec.mspdiFromDocument(edited as never, LAST_SAVED[0] ?? ''))
    lines.putValue(`gen-schedule.${editId}`, encoded)
    if ('text' in encoded) lines.putValue(`gen-schedule-back.${editId}`, guarded(() => codec.documentFromMspdi(encoded.text, current)))
  }
  // A null and an odd document must be recorded, not stop the run.
  lines.putValue('encode.null', guarded(() => codec.mspdiFromDocument(null as never, '')))
  lines.putValue('encode.empty-object', guarded(() => codec.mspdiFromDocument({} as never, '')))
  lines.putValue('decode.null-current', guarded(() => codec.documentFromMspdi(SEED_XML, null as never)))

  lines.write()
  console.log('mspdi-codec cases: ' + lines.size())
  void canon
})

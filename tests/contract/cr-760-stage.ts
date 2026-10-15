// CR-760 spec-only stage: the documents, the dictionary words and the shell reads the cases of the marker status and the Task Type column share

import { installAgentApi, type AgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { FakeElement, selfAndDescendants } from '../fixtures/fake-browser'
import { keyOfRow } from './cr-610-file-flow-stage'
import { BEFORE_ALL, BUILT_VERSION, FINISH_OF, START_OF, WORDS, diagnosed, documentOf, type TaskSpec } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-731-window-stage'

export { BEFORE_ALL, diagnosed, windowStage, type WindowStage }

// WHY: the search table is drawn again in place when its rows change (a browser's ChildNode.replaceWith); the stand-in
// DOM has no such member, so it is given one here the way cr-731-window-stage gives parentElement.
const replaceable = FakeElement.prototype as unknown as { replaceWith?: (...nodes: FakeElement[]) => void }
if (replaceable.replaceWith === undefined) {
  replaceable.replaceWith = function (this: FakeElement, ...nodes: FakeElement[]): void {
    const parent = this.parentNode
    if (parent === null) return
    for (const node of nodes) parent.insertBefore(node, this)
    this.remove()
  }
}

export type Language = 'ja' | 'en'
export const LANGUAGES: readonly Language[] = ['ja', 'en']

// see T-021, T-315
export type Marker = 'PM-1a' | 'PM-1' | 'PM-2' | 'PM-3' | 'PM-4' | 'DG-1' | 'DG-2' | 'DG-3'
export type Diagnosed = 'DG-1' | 'DG-2' | 'DG-3'
export const DIAGNOSED: readonly Diagnosed[] = ['DG-1', 'DG-2', 'DG-3']

// see T-019a
export type State = 'PS-1' | 'PS-2' | 'PS-3' | 'PS-4' | 'PS-5'

// WHY: PM-3 stands for both pauses of T-019a, so the word of a row is read from its state, never from its marker.
export const MARKER_OF_STATE: Readonly<Record<State, Marker>> = {
  'PS-1': 'PM-1a',
  'PS-5': 'PM-1',
  'PS-2': 'PM-2',
  'PS-4': 'PM-3',
  'PS-3': 'PM-3',
}

function sectionWord(section: string, field: 'rowId' | 'part', key: string, language: Language): string {
  const found = (WORDS[section] as readonly Record<string, any>[]).find((one) => one[field] === key)
  const text = found?.['text']?.[language]
  if (typeof text !== 'string' || text === '') throw new Error(`the dictionary has no ${section}/${key} in ${language}`)
  return text
}

export const stateWord = (state: State, language: Language): string => sectionWord('planActualStates', 'rowId', state, language)
export const statusWord = (row: Diagnosed | 'DG-4', language: Language): string =>
  sectionWord('delayReportStatuses', 'rowId', row, language)
export const taskTypeWord = (part: 'task' | 'milestone', language: Language): string => sectionWord('taskTypes', 'part', part, language)
export const searchHeading = (row: string, language: Language): string => sectionWord('searchColumns', 'rowId', row, language)
export const reportHeading = (row: string, language: Language): string => sectionWord('delayReportColumns', 'rowId', row, language)
export const fixHeading = (row: string, language: Language): string => sectionWord('delayFixColumns', 'rowId', row, language)

const span = (uid: number, name: string, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  name,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

export const MARKER_STATUS_DATE = '2027-05-12T17:00:00'

export interface MarkerTask {
  readonly uid: number
  readonly name: string
  readonly state: State
  readonly late: 'DL-1' | 'DL-2' | 'DL-3' | null
  readonly spec: TaskSpec
}

const started = (day: string): Partial<TaskSpec> => ({ actualStart: START_OF(`2027-${day}`), percentComplete: 10 })

// WHY: Done's finish lies before the status date, so a finished task that is never late is seen (T-021 PM-4).
export const MARKER_TASKS: readonly MarkerTask[] = [
  { uid: 10, name: 'Parent', state: 'PS-5', late: 'DL-1', spec: span(10, 'Parent', '05-03', '05-07', started('05-03')) },
  { uid: 1, name: 'Lead', state: 'PS-5', late: 'DL-1', spec: span(1, 'Lead', '05-03', '05-07', { parent: 10, ...started('05-03') }) },
  { uid: 2, name: 'Trail', state: 'PS-5', late: 'DL-1', spec: span(2, 'Trail', '05-03', '05-07', { after: [[1, 0]], ...started('05-03') }) },
  { uid: 3, name: 'Later', state: 'PS-1', late: null, spec: span(3, 'Later', '06-07', '06-11') },
  {
    uid: 4,
    name: 'Done',
    state: 'PS-2',
    late: null,
    spec: span(4, 'Done', '04-05', '04-09', { actualStart: START_OF('2027-04-05'), actualFinish: FINISH_OF('2027-04-09'), percentComplete: 100 }),
  },
  { uid: 12, name: 'Holder', state: 'PS-5', late: null, spec: span(12, 'Holder', '05-10', '05-20', started('05-10')) },
  { uid: 5, name: 'Running', state: 'PS-5', late: null, spec: span(5, 'Running', '05-10', '05-20', { parent: 12, ...started('05-10') }) },
  {
    uid: 6,
    name: 'Planned pause',
    state: 'PS-4',
    late: null,
    spec: span(6, 'Planned pause', '05-10', '05-20', { ...started('05-10'), stop: FINISH_OF('2027-05-11'), resume: START_OF('2027-05-20'), resumeValid: true }),
  },
  {
    uid: 7,
    name: 'Open pause',
    state: 'PS-3',
    late: null,
    spec: span(7, 'Open pause', '05-10', '05-20', { ...started('05-10'), stop: FINISH_OF('2027-05-11'), resumeValid: false }),
  },
  {
    uid: 8,
    name: 'Late resume',
    state: 'PS-4',
    late: 'DL-3',
    spec: span(8, 'Late resume', '05-03', '05-20', { ...started('05-03'), stop: FINISH_OF('2027-05-04'), resume: START_OF('2027-05-10'), resumeValid: true }),
  },
  { uid: 9, name: 'Late start', state: 'PS-1', late: 'DL-2', spec: span(9, 'Late start', '05-05', '05-20') },
  { uid: 11, name: 'Odd', state: 'PS-1', late: 'DL-2', spec: span(11, 'Odd', '05-10', '05-14', { milestone: true }) },
  {
    uid: 17,
    name: 'Stopped start',
    state: 'PS-1',
    late: 'DL-2',
    spec: span(17, 'Stopped start', '05-05', '05-20', { resume: START_OF('2027-05-25'), resumeValid: true }),
  },
  { uid: 16, name: 'Feeder', state: 'PS-1', late: null, spec: span(16, 'Feeder', '05-17', '05-19') },
  { uid: 15, name: 'Clash', state: 'PS-5', late: null, spec: span(15, 'Clash', '05-10', '05-20', { after: [[16, 1]], ...started('05-10') }) },
]

export const markerDocument = (): Document => documentOf(MARKER_TASKS.map((one) => one.spec), { statusDate: MARKER_STATUS_DATE })

export const markerTask = (uid: number): MarkerTask => {
  const found = MARKER_TASKS.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no marker task ${uid}`)
  return found
}

// see T-021, T-021b
export const markerWithoutDiagnosis = (task: MarkerTask): Marker => (task.late !== null ? 'PM-4' : MARKER_OF_STATE[task.state])

export interface DiagnosisRows {
  readonly byUid: ReadonlyMap<number, Diagnosed>
  readonly bottlenecks: readonly number[]
  readonly every: readonly { readonly uid: number; readonly row: string }[]
}

// WHY: which task the diagnosis names DG-1 .. DG-3 is FR-133's business; the published diagnoseDelay (PI-1) is read
// for it, and the smallest priority of T-315 a task holds is the one it shows.
export function diagnosisRowsOf(document: Document): DiagnosisRows {
  const report = diagnosed(document) as { markerStates: { uid: number; row: string }[]; bottlenecks: { uid: number }[] }
  const byUid = new Map<number, Diagnosed>()
  for (const row of DIAGNOSED) {
    for (const one of report.markerStates) if (one.row === row && !byUid.has(one.uid)) byUid.set(one.uid, row)
  }
  return { byUid, bottlenecks: report.bottlenecks.map((one) => one.uid), every: report.markerStates }
}

export const markerWithDiagnosis = (task: MarkerTask, rows: DiagnosisRows): Marker => rows.byUid.get(task.uid) ?? markerWithoutDiagnosis(task)

// see SQ-5
export function wordOfMarker(task: MarkerTask, marker: Marker, language: Language): string {
  if (marker === 'PM-4') return statusWord('DG-4', language)
  if (marker === 'DG-1' || marker === 'DG-2' || marker === 'DG-3') return statusWord(marker, language)
  return stateWord(task.state, language)
}

// see SV-8
export function rankOf(task: MarkerTask, marker: Marker): number {
  const order: readonly string[] = ['DG-1', 'DG-2', 'DG-3', 'PM-4', 'PS-1', 'PS-5', 'PS-2', 'PS-4', 'PS-3']
  const key = marker === 'PM-4' || marker.startsWith('DG-') ? marker : task.state
  return order.indexOf(key)
}

export const TYPE_NAMED = 'タスク表'

export interface TypeTask {
  readonly uid: number
  readonly name: string
  readonly milestone: boolean | null
}

// WHY: Alpha's span differs from its children's (VC-11, a machine fix -- the log gets a row); Gate is a milestone with two
// days (VC-4); Echo and the task named with the Task Type word are late (DG-4) -- so every task reaches the report.
export const TYPE_TASKS: readonly TypeTask[] = [
  { uid: 1, name: 'Alpha', milestone: false },
  { uid: 2, name: 'Bravo', milestone: false },
  { uid: 3, name: 'Charlie', milestone: false },
  { uid: 4, name: 'Gate', milestone: true },
  { uid: 5, name: 'Echo', milestone: null },
  { uid: 6, name: TYPE_NAMED, milestone: false },
]

export function typeDocument(): Document {
  const made = documentOf(
    [
      span(1, 'Alpha', '05-10', '05-21'),
      span(2, 'Bravo', '05-10', '05-14', { parent: 1 }),
      span(3, 'Charlie', '05-17', '05-26', { parent: 1 }),
      span(4, 'Gate', '05-10', '05-14', { milestone: true }),
      span(5, 'Echo', '04-05', '04-09'),
      span(6, TYPE_NAMED, '04-12', '04-16'),
    ],
    { statusDate: BEFORE_ALL },
  )
  // WHY: documentOf writes milestone true or false only; AT-30 lets it be empty too, and Echo's is.
  const tasks = made.schedule.tasks.map((one) => (one.uid === 5 ? { ...one, milestone: null } : one))
  return { ...made, schedule: { ...made.schedule, tasks } } as Document
}

export const typeTaskNamed = (name: string): TypeTask => {
  const found = TYPE_TASKS.find((one) => one.name === name)
  if (found === undefined) throw new Error(`no Task Type task named ${name}`)
  return found
}

// see SQ-14
export const typeWordOf = (task: TypeTask, language: Language): string => taskTypeWord(task.milestone === true ? 'milestone' : 'task', language)

export async function stageIn(document: Document, language: Language): Promise<WindowStage> {
  const stage = await windowStage(document)
  // WHY: IC-21 chooses the screen language (FR-038); the stage starts in Japanese.
  if (language === 'en') await stage.press('IC-21')
  return stage
}

export async function searchShown(stage: WindowStage): Promise<void> {
  await stage.key(keyOfRow('SK-24'))
}

export const searchPanelElement = (stage: WindowStage): FakeElement => {
  const found = selfAndDescendants(stage.built.root()).find((one) => one.getAttribute('data-role') === 'Search Panel')
  if (found === undefined) throw new Error('the Search Panel is not drawn')
  return found
}

export interface ViewRow {
  readonly uid: number
  readonly glyph: string | null
  readonly cells: readonly string[]
}

export interface TableRead {
  readonly columns: readonly string[]
  readonly fixed: readonly string[]
  readonly rows: readonly ViewRow[]
}

const tableReadOf = (view: unknown, what: string): TableRead => {
  const table = view as {
    columns: readonly { column: string; isFixed?: boolean }[]
    rows: readonly { glyph?: string | null; cells: readonly string[]; target: { kind: string; taskUid?: number } }[]
  } | null
  if (table === null || table === undefined) throw new Error(`${what} has no view`)
  return {
    columns: table.columns.map((one) => one.column),
    fixed: table.columns.filter((one) => one.isFixed === true).map((one) => one.column),
    rows: table.rows
      .filter((one) => one.target.kind === 'task')
      .map((one) => ({ uid: Number(one.target.taskUid), glyph: one.glyph ?? null, cells: one.cells })),
  }
}

export const searchRead = (stage: WindowStage): TableRead => tableReadOf(stage.last().searchPanel, 'the Search Panel')
export const reportRead = (stage: WindowStage): TableRead =>
  tableReadOf((stage.last() as unknown as { delayDiagnosticsReport: unknown }).delayDiagnosticsReport, 'the report window')

export const cellOfColumn = (read: TableRead, uid: number, column: string): string => {
  const row = read.rows.find((one) => one.uid === uid)
  if (row === undefined) throw new Error(`no row for task ${uid}`)
  const at = read.columns.indexOf(column)
  if (at < 0) throw new Error(`no column ${column}`)
  return row.cells[at] ?? ''
}

// WHY: a filter or sort entrance of a column is the IC-122 inside that column's heading cell (SV-7).
export async function pressHeadingFilter(stage: WindowStage, root: FakeElement, column: string): Promise<void> {
  const heading = selfAndDescendants(root).find((one) => one.tagName === 'TH' && one.getAttribute('data-column') === column)
  if (heading === undefined) throw new Error(`no heading cell for ${column}`)
  const entry = selfAndDescendants(heading).find((one) => one.getAttribute('data-icon') === 'IC-122')
  if (entry === undefined) throw new Error(`the heading of ${column} carries no IC-122`)
  await stage.clickOn(entry)
}

export async function pressMenuEntry(stage: WindowStage, icon: string): Promise<void> {
  const entry = selfAndDescendants(stage.built.root()).find((one) => one.getAttribute('data-icon') === icon)
  if (entry === undefined) throw new Error(`no open filter shows ${icon}`)
  await stage.clickOn(entry)
}

// WHY: SV-7 closes an open filter when the IC-122 of its own column is pressed again, so it is pressed only while shut.
export async function sortBy(stage: WindowStage, root: () => FakeElement, column: string, icon: 'IC-123' | 'IC-124'): Promise<void> {
  const isOpen = selfAndDescendants(stage.built.root()).some((one) => one.getAttribute('data-icon') === icon)
  if (!isOpen) await pressHeadingFilter(stage, root(), column)
  await pressMenuEntry(stage, icon)
}

export const headingsIn = (root: FakeElement): readonly FakeElement[] => selfAndDescendants(root).filter((one) => one.tagName === 'TH')

export const isFixedHeading = (cell: FakeElement): boolean => cell.getAttribute('data-fixed-column') === 'true'

export async function copiedMarkdown(stage: WindowStage): Promise<string> {
  await stage.press('IC-108')
  const last = stage.copied[stage.copied.length - 1]
  if (last?.kind !== 'document') throw new Error('IC-108 copied no document text')
  return last.text
}

// WHY: a Markdown table row is split on its pipes; the heading row of a table is the one holding the given word.
export const markdownCells = (line: string): readonly string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((one) => one.trim())

export function markdownTableWith(text: string, headingWord: string, after = 0): { readonly heading: readonly string[]; readonly rows: readonly (readonly string[])[] } {
  const lines = text.split('\n')
  const at = lines.findIndex((line, index) => index >= after && line.startsWith('|') && markdownCells(line).includes(headingWord))
  if (at < 0) throw new Error(`no Markdown table heading holds ${headingWord}`)
  const rows: (readonly string[])[] = []
  for (let index = at + 2; index < lines.length && (lines[index] ?? '').startsWith('|'); index += 1) rows.push(markdownCells(lines[index] ?? ''))
  return { heading: markdownCells(lines[at] ?? ''), rows }
}

export const agentApiOf = (stage: WindowStage): AgentApi =>
  installAgentApi({ ...stage.loop.agentApiSeams(), writerName: 'cr-760-tester', schemaVersion: BUILT_VERSION } as never)

export function readSearchRowsOf(api: AgentApi, word: string): { readonly taskRows: readonly Record<string, unknown>[] } {
  const member = (api as unknown as { readSearchRows?: (word: string) => unknown }).readSearchRows
  if (typeof member !== 'function') throw new Error('AM-25: the Agent API has no member readSearchRows')
  return member.call(api, word) as { readonly taskRows: readonly Record<string, unknown>[] }
}

// see PI-1
export type ProgressMarkerOf = (task: scheduleEntry.Task, statusDate: scheduleEntry.CalendarDay | null, diagnosed?: Diagnosed) => string

export function progressMarkerSeam(): ProgressMarkerOf {
  const found = (scheduleEntry as unknown as Record<string, unknown>)['progressMarkerOf']
  if (typeof found !== 'function') throw new Error('PI-1: the Schedule entry (schedule.ts) publishes no progressMarkerOf')
  return found as ProgressMarkerOf
}

export function calendarDayOf(text: string): scheduleEntry.CalendarDay {
  const day = scheduleEntry.dayOf(text)
  if (day === null) throw new Error(`${text} is not a day`)
  return day
}

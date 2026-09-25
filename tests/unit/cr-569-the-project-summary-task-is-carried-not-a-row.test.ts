// Spec-only cases for CR-569: the project summary task is carried, not a row

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import {
  MSPDI_NAMESPACE,
  documentFromMspdi,
  mspdiFromDocument,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

const READ_AS_SUMMARY =
  '`UID` が 0 で `OutlineLevel` が 0 の `Task` は、プロジェクトの要約タスクとして読むこと（MUST）'
const NOT_A_TASK = '文書の全体を束ねる行である。⛔ `Task` にしてはならない（MUST NOT）'
const CARRIED_AS_IS = '⭐ 原形のまま 表 T-053 の `DF-3` の置き場へ置くこと（MUST）'
const CHILDREN_ARE_ROOTS = '⭐ その直下のタスクは、親を持たない `Task` として読むこと（MUST）'
const REFERENCES_CARRIED =
  '⭐ 要約タスクを指す割当（`Assignment/TaskUID` が要約タスクの `UID`）と依存（`PredecessorLink/PredecessorUID` が要約タスクの `UID`）も、割当や依存にせず原形のまま控えること（MUST）'
const NOT_WRITTEN_FOR_GRS =
  '⛔ 取り込まずに作った文書に、要約タスクを作って書き足してはならない（MUST NOT）'
const EX_5_BACK_AS_IT_CAME =
  '含まれるとき、タスクとして画面に出さず、書き出しでは**元の位置と形のまま戻すこと** —— 要約タスクの名前と日付も、取り込んだときの値のまま戻す。'
const MR_4_ORDER_NOTE =
  '⚠️ 後続がほかの依存も持つとき、控えた依存は書き出しでそれらより前に並ぶ'
const MR_4_TWO_KEYS = '⚠️ `UID` と `OutlineLevel` の 2 つで見分ける'
const AT_139_NOT_COUNTED = 'プロジェクトの要約タスクは数えない —— 表 T-265 の `MR-4`'
const FR_058_SENTENCE =
  '⭐ プロジェクトの要約タスクは `Task` にならないので（表 T-265 の `MR-4`）、行も作らない —— その直下のタスクは親を持たない `Task` になり、自分の行を持って最上位に並ぶ。'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const ERD_DETAIL = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8'))

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function templateDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  return read.document
}

const CURRENT = templateDocument()

function accepted(text: string): Document {
  const read = documentFromMspdi(text, CURRENT)
  if (!read.ok) throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

const written = (document: Document): string => mspdiFromDocument(document).text

const SUMMARY_NAME = 'Whole project'
const SUMMARY_START = '2026-04-06T08:00:00'
const SUMMARY_FINISH = '2026-04-24T17:00:00'

const SUMMARY_TASK_XML =
  `<Task><UID>0</UID><ID>0</ID><Name>${SUMMARY_NAME}</Name><OutlineNumber>0</OutlineNumber>` +
  `<OutlineLevel>0</OutlineLevel><Start>${SUMMARY_START}</Start><Finish>${SUMMARY_FINISH}</Finish>` +
  '<Milestone>0</Milestone><Summary>1</Summary></Task>'

const ASSIGNMENT_TO_SUMMARY_XML =
  '<Assignment><UID>7</UID><TaskUID>0</TaskUID><ResourceUID>1</ResourceUID><Units>1</Units></Assignment>'

const ASSIGNMENT_TO_TASK_XML =
  '<Assignment><UID>8</UID><TaskUID>2</TaskUID><ResourceUID>1</ResourceUID><Units>1</Units></Assignment>'

const LINK_TO_TASK_XML =
  '<PredecessorLink><PredecessorUID>2</PredecessorUID><Type>1</Type><CrossProject>0</CrossProject><LinkLag>0</LinkLag><LagFormat>7</LagFormat></PredecessorLink>'

const LINK_TO_SUMMARY_XML =
  '<PredecessorLink><PredecessorUID>0</PredecessorUID><Type>1</Type><CrossProject>0</CrossProject><LinkLag>0</LinkLag><LagFormat>7</LagFormat></PredecessorLink>'

interface Line {
  readonly uid: number
  readonly id: number
  readonly level: number
  readonly outlineNumber: string
  readonly summary: 0 | 1
  readonly start: string
  readonly finish: string
  readonly links?: string
}

const taskXml = (line: Line): string =>
  `<Task><UID>${line.uid}</UID><ID>${line.id}</ID><Name>Task ${line.uid}</Name>` +
  `<OutlineNumber>${line.outlineNumber}</OutlineNumber><OutlineLevel>${line.level}</OutlineLevel>` +
  `<Start>${line.start}</Start><Finish>${line.finish}</Finish><Milestone>0</Milestone>` +
  `<Summary>${line.summary}</Summary>${line.links ?? ''}</Task>`

const LINES: readonly Line[] = [
  { uid: 1, id: 1, level: 1, outlineNumber: '1', summary: 1, start: '2026-04-06T08:00:00', finish: '2026-04-17T17:00:00' },
  { uid: 2, id: 2, level: 2, outlineNumber: '1.1', summary: 0, start: '2026-04-06T08:00:00', finish: '2026-04-10T17:00:00' },
  {
    uid: 3,
    id: 3,
    level: 2,
    outlineNumber: '1.2',
    summary: 0,
    start: '2026-04-13T08:00:00',
    finish: '2026-04-17T17:00:00',
    links: LINK_TO_TASK_XML + LINK_TO_SUMMARY_XML,
  },
  { uid: 4, id: 4, level: 1, outlineNumber: '2', summary: 0, start: '2026-04-20T08:00:00', finish: '2026-04-24T17:00:00' },
]

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
  .map((dayType) => `<WeekDay><DayType>${dayType}</DayType><DayWorking>${dayType === 1 || dayType === 7 ? 0 : 1}</DayWorking></WeekDay>`)
  .join('')

function fileOf(options: { readonly summary: boolean; readonly assignments: boolean }): string {
  const lines = options.summary ? LINES : LINES.map((line) => (line.uid === 3 ? { ...line, links: LINK_TO_TASK_XML } : line))
  const body = [...(options.summary ? [SUMMARY_TASK_XML] : []), ...lines.map(taskXml)].join('\n    ')
  const assignments = options.assignments
    ? `  <Resources><Resource><UID>1</UID><ID>1</ID><Name>Person</Name><Type>1</Type></Resource></Resources>
  <Assignments>
    ${options.summary ? ASSIGNMENT_TO_SUMMARY_XML + '\n    ' : ''}${ASSIGNMENT_TO_TASK_XML}
  </Assignments>
`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <SaveVersion>12</SaveVersion>
  <Name>${SUMMARY_NAME}</Name>
  <CalendarUID>1</CalendarUID>
  <Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${WEEK_DAYS}</WeekDays></Calendar></Calendars>
  <Tasks>
    ${body}
  </Tasks>
${assignments}</Project>
`
}

const MS_PROJECT_FILE = fileOf({ summary: true, assignments: true })
const PROJECT_LIBRE_FILE = fileOf({ summary: false, assignments: true })

const squeezed = (xml: string): string => xml.replace(/>\s+</g, '><').trim()

function blocksNamed(text: string, name: string): readonly string[] {
  return (text.match(new RegExp(`<${name}>[\\s\\S]*?</${name}>`, 'g')) ?? []).map(squeezed)
}

function fieldOf(block: string, name: string): string | null {
  return new RegExp(`<${name}>([^<]*)</${name}>`).exec(block)?.[1] ?? null
}

function taskBlocks(text: string): readonly string[] {
  const tasks = /<Tasks>([\s\S]*?)<\/Tasks>/.exec(text)?.[1] ?? ''
  return blocksNamed(tasks, 'Task')
}

interface CarryLike {
  readonly name: string
  readonly fields: Readonly<Record<string, string>>
  readonly children: readonly CarryLike[]
}

function everyCarried(elements: readonly CarryLike[]): readonly CarryLike[] {
  return elements.flatMap((each) => [each, ...everyCarried(each.children)])
}

function carriedNamed(elements: readonly CarryLike[], name: string, field: string, value: string): readonly CarryLike[] {
  return everyCarried(elements).filter(
    (each) =>
      each.name === name &&
      (each.fields[field] === value ||
        each.children.some((child) => child.name === field && Object.values(child.fields).includes(value))),
  )
}

function topRows(document: Document) {
  return document.schedule.taskGroups
    .filter((each) => each.parentId === null)
    .slice()
    .sort((a, b) => a.order - b.order)
}

function danglingReferences(document: Document): readonly string[] {
  const uids = new Set(document.schedule.tasks.map((each) => each.uid))
  const found: string[] = []
  for (const assignment of document.schedule.assignments) {
    if (!uids.has(assignment.taskUid)) found.push(`assignment ${assignment.uid} -> task ${assignment.taskUid}`)
  }
  for (const task of document.schedule.tasks) {
    for (const link of task.dependencies) {
      if (!uids.has(link.predecessorUid)) found.push(`task ${task.uid} <- task ${link.predecessorUid}`)
    }
  }
  return found
}

describe('CR-569 -- the manuscript still holds the clauses these cases quote', () => {
  it('holds the five MR-4 clauses and the EX-5 MUST NOT verbatim', () => {
    for (const text of [READ_AS_SUMMARY, NOT_A_TASK, CARRIED_AS_IS, CHILDREN_ARE_ROOTS, REFERENCES_CARRIED, NOT_WRITTEN_FOR_GRS]) {
      expect(REQUIREMENTS.includes(text), text).toBe(true)
    }
  })

  it('holds the notes and sentences the cases below lean on', () => {
    for (const text of [EX_5_BACK_AS_IT_CAME, MR_4_ORDER_NOTE, MR_4_TWO_KEYS, FR_058_SENTENCE]) {
      expect(REQUIREMENTS.includes(text), text).toBe(true)
    }
    expect(ERD_DETAIL.includes(AT_139_NOT_COUNTED), AT_139_NOT_COUNTED).toBe(true)
  })
})

describe('CR-569 -- MR-4 on an MS Project file built in the test', () => {
  const document = accepted(MS_PROJECT_FILE)

  it(READ_AS_SUMMARY, () => {
    const carried = carriedNamed(document.schedule.project.carryElements, 'Task', 'UID', '0')
    expect(carried, 'the project summary task is held once').toHaveLength(1)
  })

  it(NOT_A_TASK, () => {
    expect(document.schedule.tasks.map((each) => each.uid).sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    expect(document.schedule.taskGroups.some((each) => each.derivedFromTaskUid === 0)).toBe(false)
    expect(document.schedule.taskGroupMembers.some((each) => each.taskUid === 0)).toBe(false)
  })

  it(CARRIED_AS_IS, () => {
    const [carried] = carriedNamed(document.schedule.project.carryElements, 'Task', 'UID', '0')
    expect(carried).toBeDefined()
    const text = JSON.stringify(carried)
    for (const value of [SUMMARY_NAME, SUMMARY_START, SUMMARY_FINISH]) expect(text, value).toContain(value)
  })

  it(CHILDREN_ARE_ROOTS, () => {
    for (const uid of [1, 4]) {
      expect(document.schedule.tasks.find((each) => each.uid === uid)?.wbsParentUid, `task ${uid}`).toBeNull()
    }
    for (const uid of [2, 3]) {
      expect(document.schedule.tasks.find((each) => each.uid === uid)?.wbsParentUid, `task ${uid}`).toBe(1)
    }
    expect(topRows(document).map((each) => each.derivedFromTaskUid), 'FR-058: each is a top row').toEqual([1, 4])
  })

  it(REFERENCES_CARRIED, () => {
    expect(document.schedule.assignments.map((each) => each.taskUid)).toEqual([2])
    expect(carriedNamed(document.schedule.project.carryElements, 'Assignment', 'TaskUID', '0')).toHaveLength(1)
    const successor = document.schedule.tasks.find((each) => each.uid === 3)
    expect(successor?.dependencies.map((each) => each.predecessorUid)).toEqual([2])
    expect(carriedNamed(successor?.carryElements ?? [], 'PredecessorLink', 'PredecessorUID', '0')).toHaveLength(1)
  })

  it('leaves no assignment or dependency pointing at a Task the document lacks (IV-2)', () => {
    expect(danglingReferences(document)).toEqual([])
    expect(validateDocument(document).errors).toEqual([])
  })

  it('counts the outline base from the file`s own tasks, not the summary task (AT-139)', () => {
    expect(document.schedule.project.outlineBase).toBe(1)
  })

  it(`${MR_4_TWO_KEYS}: a UID 0 task at OutlineLevel 1 is still a Task`, () => {
    const text = PROJECT_LIBRE_FILE.replace('<UID>4</UID>', '<UID>0</UID>')
    const read = accepted(text)
    expect(read.schedule.tasks.some((each) => each.uid === 0)).toBe(true)
    expect(read.schedule.tasks).toHaveLength(4)
  })
})

describe('CR-569 -- EX-5 and JDG-582 on the way back out', () => {
  const document = accepted(MS_PROJECT_FILE)
  const out = written(document)

  it('writes the summary task back first in Tasks, in the form it came in (EX-5, FR-021)', () => {
    const blocks = taskBlocks(out)
    expect(blocks[0]).toBe(squeezed(SUMMARY_TASK_XML))
    expect(blocks.filter((each) => fieldOf(each, 'UID') === '0')).toHaveLength(1)
    expect(blocks.map((each) => fieldOf(each, 'UID'))).toEqual(['0', '1', '2', '3', '4'])
  })

  it('writes the assignment on the summary task back as it came (JDG-582)', () => {
    const assignments = blocksNamed(out, 'Assignment')
    expect(assignments).toContain(squeezed(ASSIGNMENT_TO_SUMMARY_XML))
    expect(assignments.map((each) => fieldOf(each, 'TaskUID')).sort()).toEqual(['0', '2'])
  })

  it(`writes the dependency on the summary task back as it came (JDG-582); ${MR_4_ORDER_NOTE}`, () => {
    const successor = taskBlocks(out).find((each) => fieldOf(each, 'UID') === '3') ?? ''
    const links = blocksNamed(successor, 'PredecessorLink')
    expect(links.map((each) => fieldOf(each, 'PredecessorUID'))).toEqual(['0', '2'])
    expect(links[0]).toBe(squeezed(LINK_TO_SUMMARY_XML))
  })

  it('keeps the summary task`s name and dates when a task has moved (EX-5)', () => {
    const moved = structuredClone(document) as any
    const task = moved.schedule.tasks.find((each: { uid: number }) => each.uid === 4)
    task.start = '2026-05-04T08:00:00'
    task.finish = '2026-05-08T17:00:00'
    const summary = taskBlocks(written(moved as Document))[0] ?? ''
    expect(fieldOf(summary, 'UID')).toBe('0')
    expect(fieldOf(summary, 'Name')).toBe(SUMMARY_NAME)
    expect(fieldOf(summary, 'Start')).toBe(SUMMARY_START)
    expect(fieldOf(summary, 'Finish')).toBe(SUMMARY_FINISH)
  })

  it('reads its own output back to the same tasks, rows and carried summary', () => {
    const again = accepted(out)
    expect(again.schedule.tasks.map((each) => each.uid)).toEqual(document.schedule.tasks.map((each) => each.uid))
    expect(topRows(again).map((each) => each.derivedFromTaskUid)).toEqual([1, 4])
    expect(carriedNamed(again.schedule.project.carryElements, 'Task', 'UID', '0')).toHaveLength(1)
  })
})

describe(`CR-569 -- JDG-581: ${NOT_WRITTEN_FOR_GRS}`, () => {
  const summaryTasks = (text: string) =>
    taskBlocks(text).filter((each) => fieldOf(each, 'UID') === '0' || fieldOf(each, 'OutlineLevel') === '0')

  it('writes no summary task for the document GRS starts with', () => {
    const out = written(CURRENT)
    expect(taskBlocks(out).length, 'the template writes at least one Task').toBeGreaterThan(0)
    expect(summaryTasks(out)).toEqual([])
  })

  it('writes no summary task for a file that came in without one', () => {
    const out = written(accepted(PROJECT_LIBRE_FILE))
    expect(taskBlocks(out).map((each) => fieldOf(each, 'UID'))).toEqual(['1', '2', '3', '4'])
    expect(summaryTasks(out)).toEqual([])
  })
})

describe('CR-569 -- JDG-580 on sample-schedule/sample-large-erp-program.ja.xml', () => {
  const text = readFileSync(join(process.cwd(), 'sample-schedule', 'sample-large-erp-program.ja.xml'), 'utf8')
  const document = accepted(text)

  it('opens with 12 top rows, the first of them 1. プログラム管理', () => {
    const rows = topRows(document)
    expect(rows).toHaveLength(12)
    const names = rows.map((row) => document.schedule.tasks.find((each) => each.uid === row.derivedFromTaskUid)?.name)
    expect(names[0]).toBe('1. プログラム管理')
    const levelOne = taskBlocks(text)
      .filter((each) => fieldOf(each, 'OutlineLevel') === '1')
      .map((each) => fieldOf(each, 'Name'))
    expect(names).toEqual(levelOne)
  })

  it('carries the project summary task and writes it back first, unchanged', () => {
    expect(document.schedule.tasks.some((each) => each.uid === 0)).toBe(false)
    expect(carriedNamed(document.schedule.project.carryElements, 'Task', 'UID', '0')).toHaveLength(1)
    const before = taskBlocks(text)[0]
    const after = taskBlocks(written(document))[0]
    expect(before === undefined ? null : fieldOf(before, 'UID')).toBe('0')
    expect(after).toBe(before)
  })
})

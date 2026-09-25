// Spec-only cases for CR-567: an imported Task with no children makes no row

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { MSPDI_NAMESPACE, documentFromMspdi } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { editTaskGroup, type TaskGroupCommand } from '../../src/use-case/edit-document/edit-document'
import { editTask } from '../../src/use-case/edit-document/edit-task'

const LEAF_CLAUSE = '**子を持たない `Task` には器を作らず、親の `Task` の行に載せること（MUST）'
const ROOT_CLAUSE = '**親を持たない `Task` は、子を持たなくても自分の行を持つこと（MUST）'
const OWN_ROW_SENTENCE = '子を持つ `Task` は、自分から作った行に自分自身も載る。'
const CAPPED_PARENT_SENTENCE =
  '親に器が無いとき（親が上限を超える段に在るとき）は、上の段落のとおり最も深い段の行に載せる。'

const REQUIREMENTS = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)

function currentDocument(): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  return read.document
}

const CURRENT = currentDocument()
const MAX_GROUP_DEPTH = CURRENT.documentSettings.maxGroupDepth
const DEFAULT_ROW_NAME = 'Row'

function accepted(text: string): Document {
  const read = documentFromMspdi(text, CURRENT)
  if (!read.ok) throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

interface TaskLine {
  readonly uid: number
  readonly level: number
  readonly start: string
  readonly finish: string
}

function weekDaysXml(): string {
  return [1, 2, 3, 4, 5, 6, 7]
    .map((dayType) => {
      if (dayType === 1 || dayType === 7) return `<WeekDay><DayType>${dayType}</DayType><DayWorking>0</DayWorking></WeekDay>`
      return (
        `<WeekDay><DayType>${dayType}</DayType><DayWorking>1</DayWorking><WorkingTimes>` +
        '<WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime>' +
        '<WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime>' +
        '</WorkingTimes></WeekDay>'
      )
    })
    .join('')
}

function mspdiOf(lines: readonly TaskLine[]): string {
  const tasks = lines
    .map(
      (line, index) =>
        `<Task><UID>${line.uid}</UID><ID>${index + 1}</ID><Name>Task ${line.uid}</Name>` +
        `<OutlineLevel>${line.level}</OutlineLevel>` +
        `<Start>${line.start}</Start><Finish>${line.finish}</Finish></Task>`,
    )
    .join('\n    ')
  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <SaveVersion>12</SaveVersion>
  <Name>Rows</Name>
  <CalendarUID>1</CalendarUID>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <WeekStartDay>1</WeekStartDay>
  <Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${weekDaysXml()}</WeekDays></Calendar></Calendars>
  <Tasks>
    ${tasks}
  </Tasks>
</Project>
`
}

const day = (date: number, hour: string): string => `2026-04-${String(date).padStart(2, '0')}T${hour}`

const TREE: readonly TaskLine[] = [
  { uid: 1, level: 1, start: day(6, '08:00:00'), finish: day(24, '17:00:00') },
  { uid: 2, level: 2, start: day(6, '08:00:00'), finish: day(10, '17:00:00') },
  { uid: 3, level: 3, start: day(6, '08:00:00'), finish: day(7, '17:00:00') },
  { uid: 4, level: 3, start: day(8, '08:00:00'), finish: day(10, '17:00:00') },
  { uid: 5, level: 3, start: day(7, '08:00:00'), finish: day(9, '17:00:00') },
  { uid: 6, level: 2, start: day(13, '08:00:00'), finish: day(17, '17:00:00') },
  { uid: 7, level: 3, start: day(13, '08:00:00'), finish: day(14, '17:00:00') },
  { uid: 8, level: 3, start: day(15, '08:00:00'), finish: day(17, '17:00:00') },
  { uid: 9, level: 2, start: day(20, '08:00:00'), finish: day(24, '17:00:00') },
  { uid: 10, level: 1, start: day(6, '08:00:00'), finish: day(8, '17:00:00') },
  { uid: 11, level: 1, start: day(9, '08:00:00'), finish: day(10, '17:00:00') },
]

interface FileTask {
  readonly uid: number
  readonly level: number
  readonly start: string | null
  readonly finish: string | null
}

function tasksInFile(text: string): readonly FileTask[] {
  const found: FileTask[] = []
  for (const block of text.match(/<Task>[\s\S]*?<\/Task>/g) ?? []) {
    const field = (name: string): string | null => new RegExp(`<${name}>([^<]*)</${name}>`).exec(block)?.[1] ?? null
    found.push({
      uid: Number(field('UID')),
      level: Number(field('OutlineLevel')),
      start: field('Start'),
      finish: field('Finish'),
    })
  }
  return found
}

function parentsInFile(tasks: readonly FileTask[]): ReadonlyMap<number, number | null> {
  const parents = new Map<number, number | null>()
  const open: FileTask[] = []
  for (const task of tasks) {
    while (open.length > 0 && (open[open.length - 1]?.level ?? 0) >= task.level) open.pop()
    parents.set(task.uid, open[open.length - 1]?.uid ?? null)
    open.push(task)
  }
  return parents
}

interface Expected {
  readonly rowOwners: ReadonlySet<number>
  readonly rowOf: ReadonlyMap<number, number>
}

function expectedRows(parents: ReadonlyMap<number, number | null>, maxDepth: number): Expected {
  const hasChildren = new Set<number>()
  for (const parent of parents.values()) if (parent !== null) hasChildren.add(parent)
  const depthOf = (uid: number): number => {
    let depth = 1
    let at = parents.get(uid) ?? null
    while (at !== null) {
      depth += 1
      at = parents.get(at) ?? null
    }
    return depth
  }
  const rowOwners = new Set<number>()
  for (const [uid, parent] of parents) {
    if (depthOf(uid) > maxDepth) continue
    if (parent === null || hasChildren.has(uid)) rowOwners.add(uid)
  }
  const rowOf = new Map<number, number>()
  for (const uid of parents.keys()) {
    let at: number | null = uid
    while (at !== null && !rowOwners.has(at)) at = parents.get(at) ?? null
    if (at === null) throw new Error(`task ${uid} has no row-owning ancestor`)
    rowOf.set(uid, at)
  }
  return { rowOwners, rowOf }
}

function rowOfEachTask(document: Document): ReadonlyMap<number, number | null> {
  const rows = new Map(document.schedule.taskGroups.map((each) => [each.id, each]))
  const found = new Map<number, number | null>()
  for (const member of document.schedule.taskGroupMembers) {
    found.set(member.taskUid, rows.get(member.groupId)?.derivedFromTaskUid ?? null)
  }
  return found
}

function rowIdMadeFrom(document: Document, uid: number): string {
  const row = document.schedule.taskGroups.find((each) => each.derivedFromTaskUid === uid)
  if (row === undefined) throw new Error(`no row was made from task ${uid}`)
  return row.id
}

function checkRows(document: Document, expected: Expected): void {
  const owners = document.schedule.taskGroups.map((each) => each.derivedFromTaskUid)
  expect(new Set(owners), 'the Tasks rows are made from').toEqual(new Set(expected.rowOwners))
  expect(owners).toHaveLength(expected.rowOwners.size)
  const actual = rowOfEachTask(document)
  for (const [uid, owner] of expected.rowOf) expect(actual.get(uid), `the row task ${uid} sits on`).toBe(owner)
  expect(document.schedule.taskGroupMembers).toHaveLength(document.schedule.tasks.length)
}

interface Hierarchy {
  readonly parent: number | null
  readonly start: string | null
  readonly finish: string | null
}

function hierarchyAndDates(document: Document): ReadonlyMap<number, Hierarchy> {
  return new Map(
    document.schedule.tasks.map((each) => [each.uid, { parent: each.wbsParentUid, start: each.start, finish: each.finish }]),
  )
}

function siblingOrder(document: Document, parent: number | null): readonly number[] {
  return document.schedule.tasks
    .filter((each) => each.wbsParentUid === parent)
    .slice()
    .sort((a, b) => (a.wbsOrder ?? 0) - (b.wbsOrder ?? 0))
    .map((each) => each.uid)
}

function groupEdited(document: Document, command: TaskGroupCommand): Document {
  const result = editTaskGroup(document, command, DEFAULT_ROW_NAME)
  if (!result.ok) throw new Error(`the row edit was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

function taskEdited(document: Document, command: Parameters<typeof editTask>[1]): Document {
  const result = editTask(document, command, DEFAULT_ROW_NAME)
  if (!result.ok) throw new Error(`the task edit was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

function rowMoves(document: Document, bar: { readonly uid: number; readonly toRowOf: number }): readonly [string, Document][] {
  const rootRows = document.schedule.taskGroups
    .filter((each) => each.parentId === null)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((each) => each.id)
  const deeper = document.schedule.taskGroups.find((each) => each.parentId !== null)
  if (deeper === undefined) throw new Error('the fixture has no nested row')
  return [
    ['reorderTaskGroupSiblings', groupEdited(document, { kind: 'reorderTaskGroupSiblings', parentId: null, orderedIds: [...rootRows].reverse() })],
    ['moveTaskGroup', groupEdited(document, { kind: 'moveTaskGroup', groupId: deeper.id, parentId: null, order: 0 })],
    ['moveTaskToTaskGroup', taskEdited(document, { kind: 'moveTaskToTaskGroup', uid: bar.uid, groupId: rowIdMadeFrom(document, bar.toRowOf) })],
  ]
}

function checkOnlySiblingOrderMoved(before: Document, after: Document, label: string): void {
  expect(after.schedule.tasks, label).toHaveLength(before.schedule.tasks.length)
  expect(hierarchyAndDates(after), `${label}: WBS parent, start and finish`).toEqual(hierarchyAndDates(before))
  const parents = new Set(before.schedule.tasks.map((each) => each.wbsParentUid))
  for (const parent of parents) {
    expect(new Set(siblingOrder(after, parent)), `${label}: the children of ${parent}`).toEqual(
      new Set(siblingOrder(before, parent)),
    )
  }
}

describe('CR-567 -- FR-058 still holds the two clauses these cases quote', () => {
  it('holds each clause and sentence verbatim', () => {
    for (const text of [LEAF_CLAUSE, ROOT_CLAUSE, OWN_ROW_SENTENCE, CAPPED_PARENT_SENTENCE]) {
      expect(REQUIREMENTS.includes(text), text).toBe(true)
    }
  })
})

describe('CR-567 -- FR-058 on an MSPDI document built in the test', () => {
  const document = accepted(mspdiOf(TREE))
  const rows = rowOfEachTask(document)

  it(LEAF_CLAUSE, () => {
    for (const [leaf, parent] of [[3, 2], [4, 2], [5, 2], [7, 6], [8, 6], [9, 1]] as const) {
      expect(document.schedule.taskGroups.some((each) => each.derivedFromTaskUid === leaf), `task ${leaf} makes no row`).toBe(false)
      expect(rows.get(leaf), `task ${leaf} sits on its parent's row`).toBe(parent)
    }
  })

  it('puts the Tasks that share a parent on one row', () => {
    const rowIds = new Map(document.schedule.taskGroupMembers.map((each) => [each.taskUid, each.groupId]))
    expect(new Set([3, 4, 5].map((uid) => rowIds.get(uid))).size).toBe(1)
    expect(new Set([7, 8].map((uid) => rowIds.get(uid))).size).toBe(1)
  })

  it(ROOT_CLAUSE, () => {
    for (const loose of [10, 11]) {
      expect(rows.get(loose), `task ${loose} sits on its own row`).toBe(loose)
    }
    const looseRows = new Set([10, 11].map((uid) => rowIdMadeFrom(document, uid)))
    expect(looseRows.size, 'each parent-less Task has a row of its own').toBe(2)
  })

  it(OWN_ROW_SENTENCE, () => {
    for (const summary of [1, 2, 6]) expect(rows.get(summary), `task ${summary}`).toBe(summary)
  })

  it('makes rows for exactly the Tasks with children and the Tasks with no parent', () => {
    checkRows(document, expectedRows(parentsInFile(tasksInFile(mspdiOf(TREE))), MAX_GROUP_DEPTH))
    expect(document.schedule.taskGroups).toHaveLength(5)
  })

  it('leaves every Task on exactly one row (FR-058 MUST NOT, IV-6)', () => {
    for (const task of document.schedule.tasks) {
      const mine = document.schedule.taskGroupMembers.filter((each) => each.taskUid === task.uid)
      expect(mine, `task ${task.uid}`).toHaveLength(1)
    }
  })

  it('keeps the WBS parent and the dates the file wrote (JDG-561)', () => {
    const parents = parentsInFile(tasksInFile(mspdiOf(TREE)))
    for (const line of TREE) {
      const task = document.schedule.tasks.find((each) => each.uid === line.uid)
      expect(task?.wbsParentUid, `task ${line.uid}`).toBe(parents.get(line.uid))
      expect(task?.start, `task ${line.uid}`).toBe(line.start)
      expect(task?.finish, `task ${line.uid}`).toBe(line.finish)
    }
    expect(siblingOrder(document, 2), 'the import alone keeps the file order').toEqual([3, 4, 5])
  })

  it('changes only the sibling order when a row is moved later (JDG-561)', () => {
    for (const [label, after] of rowMoves(document, { uid: 7, toRowOf: 2 })) {
      checkOnlySiblingOrderMoved(document, after, label)
    }
  })

  it('ranks the siblings on one row by their planned start once a row moves (HM-9, ST-2)', () => {
    const [, reordered] = rowMoves(document, { uid: 7, toRowOf: 2 })[0] ?? []
    expect(reordered).toBeDefined()
    if (reordered === undefined) return
    expect(siblingOrder(reordered, 2)).toEqual([3, 5, 4])
  })
})

describe('CR-567 -- FR-058 below and at the S-125 cap', () => {
  function cappedChain(): readonly TaskLine[] {
    const lines: TaskLine[] = []
    const deepest = MAX_GROUP_DEPTH + 2
    for (let level = 1; level <= deepest; level += 1) {
      if (level > 1) lines.push({ uid: 100 + level, level, start: day(7, '08:00:00'), finish: day(8, '17:00:00') })
      lines.push({ uid: level, level, start: day(6, '08:00:00'), finish: day(24, '17:00:00') })
    }
    return lines
  }
  const text = mspdiOf(cappedChain())
  const document = accepted(text)
  const rows = rowOfEachTask(document)

  it(CAPPED_PARENT_SENTENCE, () => {
    for (const level of [MAX_GROUP_DEPTH + 1, MAX_GROUP_DEPTH + 2]) {
      expect(rows.get(100 + level), `leaf at level ${level}`).toBe(MAX_GROUP_DEPTH)
    }
  })

  it('puts a leaf at the cap on its parent`s row, not a row of its own', () => {
    expect(rows.get(100 + MAX_GROUP_DEPTH)).toBe(MAX_GROUP_DEPTH - 1)
    expect(document.schedule.taskGroups.some((each) => each.derivedFromTaskUid === 100 + MAX_GROUP_DEPTH)).toBe(false)
  })

  it('makes exactly the rows FR-058 asks for', () => {
    checkRows(document, expectedRows(parentsInFile(tasksInFile(text)), MAX_GROUP_DEPTH))
    expect(document.schedule.taskGroups).toHaveLength(MAX_GROUP_DEPTH)
  })
})

describe('CR-567 -- FR-058 on sample-schedule/sample-large-erp-program.ja.xml', () => {
  const text = readFileSync(join(process.cwd(), 'sample-schedule', 'sample-large-erp-program.ja.xml'), 'utf8')
  const everyFileTask = tasksInFile(text)
  const fileTasks = everyFileTask.filter((each) => !(each.uid === 0 && each.level === 0))
  const parents = parentsInFile(fileTasks)
  const expected = expectedRows(parents, MAX_GROUP_DEPTH)
  const document = accepted(text)

  it('reads 256 of the 257 Task elements: the project summary task is no Task (MR-4, JDG-580)', () => {
    expect(everyFileTask).toHaveLength(257)
    expect(everyFileTask.filter((each) => each.uid === 0 && each.level === 0)).toHaveLength(1)
    expect(fileTasks).toHaveLength(256)
    expect(document.schedule.tasks).toHaveLength(256)
    expect(document.schedule.tasks.some((each) => each.uid === 0)).toBe(false)
  })

  it('makes 37 rows, one per Task with children or with no parent (JDG-560, JDG-580)', () => {
    checkRows(document, expected)
    expect(document.schedule.taskGroups).toHaveLength(37)
  })

  it('gives the OutlineLevel 1 tasks of the file no WBS parent (MR-4)', () => {
    const topLevel = fileTasks.filter((each) => each.level === 1).map((each) => each.uid)
    expect(topLevel).toHaveLength(12)
    for (const uid of topLevel) {
      expect(document.schedule.tasks.find((each) => each.uid === uid)?.wbsParentUid, `task ${uid}`).toBeNull()
    }
    expect(siblingOrder(document, null), 'the import alone keeps the file order').toEqual(topLevel)
  })

  it('puts more than one Task on a row, up to the 19 CR-567 counted', () => {
    const perRow = new Map<string, number>()
    for (const member of document.schedule.taskGroupMembers) perRow.set(member.groupId, (perRow.get(member.groupId) ?? 0) + 1)
    expect(Math.max(...perRow.values())).toBe(19)
    expect([...perRow.values()].filter((count) => count > 1).length).toBeGreaterThan(0)
  })

  it('keeps every WBS parent and every date the file wrote (JDG-561)', () => {
    for (const task of fileTasks) {
      const read = document.schedule.tasks.find((each) => each.uid === task.uid)
      expect(read?.wbsParentUid, `task ${task.uid}`).toBe(parents.get(task.uid))
      expect(read?.start, `task ${task.uid}`).toBe(task.start)
      expect(read?.finish, `task ${task.uid}`).toBe(task.finish)
    }
  })

  it('changes only the sibling order when a row is moved later (JDG-561)', () => {
    const leaf = [...expected.rowOf].find(([uid, owner]) => uid !== owner)
    const otherOwner = [...expected.rowOwners].find((owner) => owner !== leaf?.[1])
    if (leaf === undefined || otherOwner === undefined) throw new Error('the sample has no leaf to move')
    for (const [label, after] of rowMoves(document, { uid: leaf[0], toRowOf: otherOwner })) {
      checkOnlySiblingOrderMoved(document, after, label)
    }
  })
})

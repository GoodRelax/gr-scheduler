// CR-429: a task whose dates a person set goes out pinned to its start, with a fresh Duration and no slack.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { specTable } from '../contract/spec-table'
import {
  accepted,
  currentDocument,
  day,
  edited,
  hours,
  MINUTES_PER_DAY,
  pj12Fixture,
  pj15Fixture,
  taskNode,
  withTask,
  withTaskLeaves,
  writtenText,
} from './cr-429-mspdi-fixtures'
import {
  childrenNamed,
  leaf,
  mspdiText,
  nodeAt,
  normalizedMspdi,
  parseXml,
  schemaFaults,
  textAt,
  type XmlNode,
} from './cr-429-mspdi-schema'

const EX_11_PINNED =
  '`GRS` が作ったタスクと、日付を編集したタスクには、`ConstraintType` に `2`（この日に開始、`mspdi_pj12.xsd:1996`）を、`ConstraintDate` に開始日を書くこと（MUST）'

const EX_11_NOT_UNEDITED = '⛔ 編集していないタスクには書いてはならない（MUST NOT、`EX-2`）。'

const EX_11_GRS_EVERY_TASK = '`grs` の文書では全タスクに書く。'

const EX_11_MSPDI_ON_EDIT =
  'MSPDI から読んだ文書では書き出しで足さず、日付を編集したとき・タスクを足したときに、そのタスクの持ち回りの `ConstraintType` ／ `ConstraintDate` ／ `Duration` を置き換える'

const EX_12_DURATION = '日付を編集したタスクでは、`Duration` を `DV-8` のとおり作り直すこと（MUST）。'

const EX_12_MANUAL =
  '`ManualStart` / `ManualFinish` / `ManualDuration` を持っていれば、新しい日付から、取り込んだときと同じ綴り（`EX-4`）で作り直すこと（MUST）。'

const EX_12_NO_SLACK = '余裕日数（`FreeSlack` / `TotalSlack` / `StartSlack` / `FinishSlack`）は書いてはならない（MUST NOT）'

const EX_12_GRS_TASKS = '`GRS` が作ったタスクにも `Duration` を `DV-8` のとおり書くこと（MUST）'

const EX_12_PASTED =
  '貼り付けで足した写しは、日付を編集したタスクと同じに扱うこと（MUST）—— 部分木の外へ出ていた依存は写しに写らない（`FR-033`）ので、元の余裕日数は写しについての事実ではない。'

const SO_10_PEOPLE_DECIDE = '日付は人が決める'

const DV_8_FROM_DATES = '`finish` − `start` と暦。'

const START_ON = '2'

const SLACKS = ['FreeSlack', 'TotalSlack', 'StartSlack', 'FinishSlack'] as const

const EX_9_SPELLING = /^PT(\d+)H(\d+)M(\d+)S$/

function rowText(table: string, id: string): string {
  const row = specTable(table).rows.find((each) => each.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.cells.join(' | ')
}

function minutesOf(duration: string | null): number {
  const found = EX_9_SPELLING.exec(duration ?? '')
  if (found === null) throw new Error(`"${String(duration)}" is not spelled PTnHnMnS (EX-9)`)
  return Number(found[1]) * 60 + Number(found[2]) + Number(found[3]) / 60
}

function slacksOf(task: XmlNode): readonly string[] {
  return task.children.map((each) => each.name).filter((name) => (SLACKS as readonly string[]).includes(name))
}

function readPj12(): Document {
  return accepted(mspdiText(pj12Fixture())).document
}

function firstGroupId(document: Document): string {
  const group = document.schedule.taskGroups[0]
  if (group === undefined) throw new Error('the document has no row to draw into')
  return group.id
}

function created(document: Document, from: number, to: number): { readonly document: Document; readonly uid: number } {
  const before = new Set(document.schedule.tasks.map((each) => each.uid))
  const after = edited(document, {
    kind: 'createTask',
    shapeKind: 'rectangle',
    start: day(from),
    finish: day(to),
    groupId: firstGroupId(document),
  })
  const added = after.schedule.tasks.find((each) => !before.has(each.uid))
  if (added === undefined) throw new Error('createTask added no task')
  return { document: after, uid: added.uid }
}

function tasksOf(text: string): readonly XmlNode[] {
  return childrenNamed(nodeAt(parseXml(text), 'Tasks') ?? parseXml('<Tasks/>'), 'Task')
}

function normalizedTask(text: string, uid: number): unknown {
  const task = taskNode(parseXml(text), uid)
  const wrapped = `<Project xmlns="http://schemas.microsoft.com/project/2007"><Tasks>${serialized(task)}</Tasks></Project>`
  return normalizedMspdi(wrapped)
}

function serialized(node: XmlNode): string {
  if (node.children.length === 0) return `<${node.name}>${node.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${node.name}>`
  return `<${node.name}>${node.children.map(serialized).join('')}</${node.name}>`
}

describe('the rows these cases answer to', () => {
  it('EX-11, EX-12, SO-10, DV-8: the clauses are still where the cases found them', () => {
    const ex11 = rowText('T-033', 'EX-11')
    const ex12 = rowText('T-033', 'EX-12')
    expect(ex11).toContain(EX_11_PINNED)
    expect(ex11).toContain(EX_11_NOT_UNEDITED)
    expect(ex11).toContain(EX_11_GRS_EVERY_TASK)
    expect(ex11).toContain(EX_11_MSPDI_ON_EDIT)
    expect(ex12).toContain(EX_12_DURATION)
    expect(ex12).toContain(EX_12_MANUAL)
    expect(ex12).toContain(EX_12_NO_SLACK)
    expect(ex12).toContain(EX_12_GRS_TASKS)
    expect(ex12).toContain(EX_12_PASTED)
    expect(rowText('T-002', 'SO-10')).toContain(SO_10_PEOPLE_DECIDE)
    expect(rowText('T-059', 'DV-8')).toContain(DV_8_FROM_DATES)
  })

  it('EX-11: ConstraintType 2 is an enumerated value of both schemas', () => {
    const text = mspdiText(withTaskLeaves(pj12Fixture(), 2, [leaf('ConstraintType', START_ON), leaf('ConstraintDate', day(6))]))
    expect(schemaFaults(text, 'pj12')).toEqual([])
    const wrong = mspdiText(withTaskLeaves(pj12Fixture(), 2, [leaf('ConstraintType', 9)]))
    expect(schemaFaults(wrong, 'pj12')).toContain('Project/Tasks/Task/ConstraintType: "9" is not one of the enumerated values')
  })
})

describe('EX-11 and EX-12 -- a document GRS made (sourceFormat grs)', () => {
  it('EX-11: every task goes out with ConstraintType 2 and ConstraintDate on its own Start', () => {
    const tasks = tasksOf(writtenText(currentDocument()))
    expect(tasks.length).toBeGreaterThan(0)
    const off = tasks.filter(
      (task) => textAt(task, 'ConstraintType') !== START_ON || textAt(task, 'ConstraintDate') !== textAt(task, 'Start'),
    )
    expect(off.map((task) => textAt(task, 'UID'))).toEqual([])
  })

  it('EX-12: every task goes out with a Duration spelled as EX-9 spells an amount of time', () => {
    const tasks = tasksOf(writtenText(currentDocument()))
    const off = tasks.filter((task) => !EX_9_SPELLING.test(textAt(task, 'Duration') ?? ''))
    expect(off.map((task) => textAt(task, 'UID'))).toEqual([])
  })

  it('EX-11: a task drawn into the GRS document goes out pinned as well', () => {
    const { document, uid } = created(currentDocument(), 13, 17)
    const task = writtenTaskOf(document, uid)
    expect(textAt(task, 'ConstraintType')).toBe(START_ON)
    expect(textAt(task, 'ConstraintDate')).toBe(textAt(task, 'Start'))
  })
})

function writtenTaskOf(document: Document, uid: number): XmlNode {
  return taskNode(parseXml(writtenText(document)), uid)
}

describe('EX-11 and EX-12 -- a document read from MSPDI, one task given new dates', () => {
  const move = (document: Document): Document =>
    edited(document, { kind: 'setTaskPlanDates', uid: 2, start: day(7), finish: day(14) })

  it('EX-11: the moved task goes out with ConstraintType 2 and ConstraintDate on its new Start', () => {
    const task = writtenTaskOf(move(readPj12()), 2)
    expect(textAt(task, 'Start')).toBe(day(7))
    expect(textAt(task, 'ConstraintType')).toBe(START_ON)
    expect(textAt(task, 'ConstraintDate')).toBe(day(7))
  })

  it('EX-12: the moved task goes out with a Duration made again from its dates', () => {
    const duration = textAt(writtenTaskOf(move(readPj12()), 2), 'Duration')
    expect(duration).not.toBe('PT32H0M0S')
    expect(minutesOf(duration)).toBeGreaterThan(0)
  })

  it('EX-12: the moved task goes out with no slack', () => {
    expect(slacksOf(writtenTaskOf(move(readPj12()), 2))).toEqual([])
  })

  it('EX-2, EX-11: the tasks nobody moved go out exactly as they came in', () => {
    const input = mspdiText(pj12Fixture())
    const output = writtenText(move(accepted(input).document))
    for (const uid of [1, 3, 4]) expect(normalizedTask(output, uid), `task ${uid}`).toEqual(normalizedTask(input, uid))
  })

  it('EX-11: an unmoved task that came without a constraint is given none', () => {
    const bare = withTask(pj12Fixture(), 4, (children) => children.filter((each) => each.name !== 'ConstraintType'))
    const task = writtenTaskOf(move(accepted(mspdiText(bare)).document), 4)
    expect(textAt(task, 'ConstraintType')).toBeNull()
    expect(textAt(task, 'ConstraintDate')).toBeNull()
  })

  it('EX-11: renaming a task is not setting its dates -- its constraint goes back as it came', () => {
    const renamed = edited(readPj12(), { kind: 'setTaskName', uid: 2, name: 'Piers, renamed' })
    const task = writtenTaskOf(renamed, 2)
    expect(textAt(task, 'ConstraintType')).toBe('0')
    expect(textAt(task, 'ConstraintDate')).toBeNull()
  })

  it('EX-1: the file with one task moved is valid against pj12', () => {
    expect(schemaFaults(writtenText(move(readPj12())), 'pj12')).toEqual([])
  })
})

describe('EX-11 and EX-12 -- a document read from MSPDI, one task drawn into it', () => {
  it('EX-11: the drawn task goes out with ConstraintType 2 and ConstraintDate on its Start', () => {
    const { document, uid } = created(readPj12(), 13, 17)
    const task = writtenTaskOf(document, uid)
    expect(textAt(task, 'Start')).toBe(day(13))
    expect(textAt(task, 'ConstraintType')).toBe(START_ON)
    expect(textAt(task, 'ConstraintDate')).toBe(day(13))
  })

  it('EX-12: the drawn task goes out with a Duration', () => {
    const { document, uid } = created(readPj12(), 13, 17)
    expect(minutesOf(textAt(writtenTaskOf(document, uid), 'Duration'))).toBeGreaterThan(0)
  })

  it('EX-2: drawing a task changes nothing on the tasks that came in', () => {
    const input = mspdiText(pj12Fixture())
    const output = writtenText(created(accepted(input).document, 13, 17).document)
    for (const uid of [1, 2, 3, 4]) expect(normalizedTask(output, uid), `task ${uid}`).toEqual(normalizedTask(input, uid))
  })

  it('EX-12, DV-8: one more working day between start and finish is one more working day of Duration', () => {
    const first = created(readPj12(), 13, 14)
    const second = created(first.document, 13, 15)
    const third = created(second.document, 13, 17)
    const written = parseXml(writtenText(third.document))
    const [a, b, c] = [first.uid, second.uid, third.uid].map((uid) => minutesOf(textAt(taskNode(written, uid), 'Duration')))
    expect((b ?? 0) - (a ?? 0)).toBe(MINUTES_PER_DAY)
    expect((c ?? 0) - (a ?? 0)).toBe(3 * MINUTES_PER_DAY)
  })

  it('EX-1: the file with a drawn task is valid against pj12', () => {
    expect(schemaFaults(writtenText(created(readPj12(), 13, 17).document), 'pj12')).toEqual([])
  })
})

function copyUidOf(before: Document, after: Document): number {
  const held = new Set(before.schedule.tasks.map((each) => each.uid))
  const copy = after.schedule.tasks.find((each) => !held.has(each.uid))
  if (copy === undefined) throw new Error('pasteTaskSubtree added no task')
  return copy.uid
}

describe('EX-11 and EX-12 -- a document read from MSPDI, one task pasted into it (FR-033)', () => {
  it('EX-11, EX-12, FR-033: the copy is a task GRS added -- pinned to its Start, with a Duration from its dates', () => {
    const input = mspdiText(withTaskLeaves(pj12Fixture(), 3, [leaf('Duration', hours(1))]))
    const document = accepted(input).document
    const pasted = edited(document, { kind: 'pasteTaskSubtree', sourceUids: [3] })
    const task = writtenTaskOf(pasted, copyUidOf(document, pasted))
    const drawn = created(readPj12(), 13, 24)
    expect(textAt(task, 'ConstraintType')).toBe(START_ON)
    expect(textAt(task, 'ConstraintDate')).toBe(textAt(task, 'Start'))
    expect(textAt(task, 'Duration')).toBe(textAt(writtenTaskOf(drawn.document, drawn.uid), 'Duration'))
    expect(textAt(task, 'Duration')).not.toBe(hours(1))
    expect(normalizedTask(writtenText(pasted), 3)).toEqual(normalizedTask(input, 3))
  })

  it('EX-12, FR-033: the copy goes out with no slack, and its manual fields follow its own dates', () => {
    const input = mspdiText(withTaskLeaves(pj15Fixture(), 3, [
      leaf('ManualStart', day(6)),
      leaf('ManualFinish', day(10)),
      leaf('ManualDuration', hours(32)),
      leaf('StartSlack', 0),
      leaf('FinishSlack', 0),
    ]))
    const document = accepted(input).document
    const pasted = edited(document, { kind: 'pasteTaskSubtree', sourceUids: [3] })
    const task = writtenTaskOf(pasted, copyUidOf(document, pasted))
    expect(slacksOf(task)).toEqual([])
    expect(textAt(task, 'ManualStart')).toBe(textAt(task, 'Start'))
    expect(textAt(task, 'ManualFinish')).toBe(textAt(task, 'Finish'))
    expect(textAt(task, 'ManualDuration')).toBe(textAt(task, 'Duration'))
    expect(normalizedTask(writtenText(pasted), 3)).toEqual(normalizedTask(input, 3))
  })
})

describe('EX-12 -- the manual fields of a pj15 task follow its new dates', () => {
  const pj15WithManualFields = (): string =>
    mspdiText(
      withTaskLeaves(pj15Fixture(), 2, [
        leaf('ManualStart', day(6)),
        leaf('ManualFinish', day(10)),
        leaf('ManualDuration', 'PT32H0M0S'),
        leaf('StartSlack', 0),
        leaf('FinishSlack', 0),
      ]),
    )

  const moved = (): XmlNode => {
    const document = accepted(pj15WithManualFields()).document
    return writtenTaskOf(edited(document, { kind: 'setTaskPlanDates', uid: 2, start: day(7), finish: day(14) }), 2)
  }

  it('EX-12, EX-4: ManualStart and ManualFinish are made again from the new dates, spelled as they arrived', () => {
    const task = moved()
    expect(textAt(task, 'ManualStart')).toBe(textAt(task, 'Start'))
    expect(textAt(task, 'ManualFinish')).toBe(textAt(task, 'Finish'))
    expect(textAt(task, 'ManualStart')).toBe(day(7))
  })

  it('EX-12, EX-4: ManualDuration is made again, spelled as Duration is', () => {
    const task = moved()
    expect(textAt(task, 'ManualDuration')).toBe(textAt(task, 'Duration'))
    expect(textAt(task, 'ManualDuration')).not.toBe('PT32H0M0S')
  })

  it('EX-12: none of the four slacks goes out, pj15`s two included', () => {
    expect(slacksOf(moved())).toEqual([])
  })

  it('EX-1: the pj15 file with one task moved is valid against pj15', () => {
    const document = accepted(pj15WithManualFields()).document
    const text = writtenText(edited(document, { kind: 'setTaskPlanDates', uid: 2, start: day(7), finish: day(14) }))
    expect(schemaFaults(text, 'pj15')).toEqual([])
  })
})

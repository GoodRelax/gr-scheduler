// DFC-1054 spec-only tests: EX-12 -- a pasted copy is treated as a task whose dates were edited, so the MSPDI written for it carries no slack, whether the paste is of a Task or of a row.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { editTaskGroup } from '../../src/use-case/edit-document/edit-task-group'
import { REQUIREMENTS } from './cr-610-file-flow-stage'
import { accepted, edited, pj12Fixture, writtenTask } from '../unit/cr-429-mspdi-fixtures'
import { mspdiText, type XmlNode } from '../unit/cr-429-mspdi-schema'

// WHY: the constants end exactly at their markers, cut from the manuscript as check 39 reads it.
const EX_12_COPY_IS_EDITED = '貼り付けで足したコピーは、日付を編集したタスクと同じに扱うこと（MUST）'
const EX_12_NO_SLACK =
  '余裕日数（`FreeSlack` / `TotalSlack` / `StartSlack` / `FinishSlack`）は書いてはならない（MUST NOT）'

const SLACKS = ['FreeSlack', 'TotalSlack', 'StartSlack', 'FinishSlack'] as const
const SOURCE_UID = 3
const COPY_ROW_ID = 'cccccccc-0000-4000-8000-0000000000a1'

const slacksOf = (task: XmlNode): readonly string[] =>
  task.children.map((each) => each.name).filter((name) => (SLACKS as readonly string[]).includes(name))

function opened(): Document {
  return accepted(mspdiText(pj12Fixture())).document
}

const taskGroupOfTask = (document: Document, uid: number): string => {
  const found = document.schedule.taskGroupMembers.find((member) => member.taskUid === uid)
  if (found === undefined) throw new Error(`premise: task ${uid} stands in a row`)
  return found.groupId
}

const newTaskUids = (before: Document, after: Document): readonly number[] => {
  const held = new Set(before.schedule.tasks.map((each) => each.uid))
  const found = after.schedule.tasks.filter((each) => !held.has(each.uid)).map((each) => each.uid)
  if (found.length === 0) throw new Error('premise: the paste added a task')
  return found
}

const newTaskUid = (before: Document, after: Document): number => newTaskUids(before, after)[0] as number

// WHY: the row that holds the source task may hold other tasks (it is the row of the outline), so every copy is read.
const copyOfSource = (before: Document, after: Document): number => {
  const name = before.schedule.tasks.find((each) => each.uid === SOURCE_UID)?.name
  const found = newTaskUids(before, after).find((uid) => after.schedule.tasks.find((each) => each.uid === uid)?.name === name)
  if (found === undefined) throw new Error('premise: the row paste copied the source task')
  return found
}

function taskGroupPasted(document: Document): Document {
  const result = editTaskGroup(
    document,
    {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: taskGroupOfTask(document, SOURCE_UID),
      targetGroupId: null,
      newGroupIds: { [taskGroupOfTask(document, SOURCE_UID)]: COPY_ROW_ID },
    },
    'Row',
  )
  if (!result.ok) throw new Error(`premise: the row paste was refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

describe('EX-12 -- the manuscript these cases are driven by', () => {
  it.each([EX_12_COPY_IS_EDITED, EX_12_NO_SLACK])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`EX-12 -- ${EX_12_COPY_IS_EDITED}`, () => {
  it('control: the source task of the sample file does carry its slack when written untouched', () => {
    expect([...slacksOf(writtenTask(opened(), SOURCE_UID))].sort()).toEqual(['FreeSlack', 'TotalSlack'])
  })

  it('a Task pasted as a Task writes no slack', () => {
    const before = opened()
    const after = edited(before, { kind: 'pasteTasks', sourceUids: [SOURCE_UID] })
    expect(slacksOf(writtenTask(after, newTaskUid(before, after))), EX_12_NO_SLACK).toEqual([])
  })

  it('a row pasted with its tasks writes no slack for the copy of the task', () => {
    const before = opened()
    const after = taskGroupPasted(before)
    for (const copy of newTaskUids(before, after)) {
      expect(slacksOf(writtenTask(after, copy)), `${EX_12_NO_SLACK} -- copy ${copy}`).toEqual([])
    }
    expect(slacksOf(writtenTask(after, copyOfSource(before, after))), EX_12_NO_SLACK).toEqual([])
  })

  it('a row paste leaves the slack of the source task as it was', () => {
    const before = opened()
    const after = taskGroupPasted(before)
    expect([...slacksOf(writtenTask(after, SOURCE_UID))].sort()).toEqual(['FreeSlack', 'TotalSlack'])
  })

  it('the Task paste and the row paste write the same set of slack elements for the copy', () => {
    const before = opened()
    const byTask = edited(before, { kind: 'pasteTasks', sourceUids: [SOURCE_UID] })
    const byTaskGroup = taskGroupPasted(before)
    expect(slacksOf(writtenTask(byTaskGroup, copyOfSource(before, byTaskGroup)))).toEqual(
      slacksOf(writtenTask(byTask, newTaskUid(before, byTask))),
    )
  })
})

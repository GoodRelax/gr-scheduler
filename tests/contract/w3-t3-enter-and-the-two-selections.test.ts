// W3 tester 3: Enter and the two selections (objects and task groups), and a task group selection that outlives its task group.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import type { FieldCommit } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { taskGroupDocument, taskOf } from '../unit/cr-541-stage'
import { bare, specTable, unbroken } from './spec-table'
import { exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const CLAUSE_BOTH_CLEARED =
  '⭐ 「選ばれているもの」は、表 T-023c の対象と、タスクグループパネルのタスクグループ（`FR-085`）の両方であり、両方の選択を解除すること（MUST）'
const CLAUSE_ONLY_JUST_CREATED = '⛔ **これは作った直後の場面に限る（MUST）'
const CLAUSE_TASK_GROUPS_IN_THE_DOCUMENT =
  '規則は 表 T-028 の `IN-4` と 表 T-036 の `SK-19` が持つ。⭐ タスクグループの選択は、文書に在るタスクグループだけを指すこと（MUST）'

// see T-103
const TASK_GROUP_PANEL = bare(specTable('T-103').rows.find((one) => one.id === 'U-22')?.by['確定名（英）'] ?? '')

// see T-108
const commandNameOf = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')

const ENTER: HumanInput = { kind: 'key', key: 'Enter', modifiers: { ctrl: false, shift: false, alt: false, meta: false } }

const TASK_GROUPS = [
  { id: 'task-group-a', parentId: null },
  { id: 'task-group-b', parentId: null },
  { id: 'task-group-c', parentId: null },
]

// WHY: a long plan, so the body centre stands clear of the progress marker and dummy that answer first (T-266).
const LONG_PLAN = { start: '2026-04-06T08:00:00', finish: '2026-06-26T17:00:00' }

const documentWithTaskGroups = (): Document =>
  taskGroupDocument(TASK_GROUPS, {}, { tasks: TASK_GROUPS.map((_one, index) => taskOf(index + 1, LONG_PLAN)) }) as unknown as Document

const pickedItems = (stage: ExportStage): readonly unknown[] =>
  stage.loop.agentApiSeams().source.readSnapshot().selection.items

const chosenTaskGroups = (stage: ExportStage): string[] =>
  stage.lastView().taskGroupPanel.titles.filter((one) => one.isSelected).map((one) => one.groupId)

async function clickTask(stage: ExportStage, uid: number, clicks = 1): Promise<void> {
  const placement = stage.loop.current()?.layout.placements.find((one) => one.taskUid === uid)
  if (placement === undefined) throw new Error(`premise: task ${uid} is laid out`)
  await stage.click(placement.x + placement.width / 2, placement.y + placement.height / 2, clicks)
}

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it.each([CLAUSE_BOTH_CLEARED, CLAUSE_ONLY_JUST_CREATED, CLAUSE_TASK_GROUPS_IN_THE_DOCUMENT])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('SK-19 -- Enter, once nothing else is left to it, clears both selections', () => {
  it(`"${CLAUSE_BOTH_CLEARED}"`, async () => {
    const stage = exportStage(documentWithTaskGroups())
    await clickTask(stage, 1)
    await stage.pressRow(TASK_GROUP_PANEL, null, 'task-group-b')
    expect(pickedItems(stage), 'premise: a task is picked').toHaveLength(1)
    expect(chosenTaskGroups(stage), 'premise: a task group is chosen').toEqual(['task-group-b'])
    for (let turn = 0; turn < 3 && stage.lastView().propertiesPanel !== null; turn += 1) await stage.press(ENTER)
    expect(stage.lastView().propertiesPanel, 'premise: Enter took the panel down first').toBeNull()
    expect(pickedItems(stage).length + chosenTaskGroups(stage).length, 'premise: both are still picked').toBe(2)
    await stage.press(ENTER)
    expect(pickedItems(stage)).toEqual([])
    expect(chosenTaskGroups(stage)).toEqual([])
  })
})

describe('FR-091 -- one Enter closes and clears only for a name just created', () => {
  it(`"${CLAUSE_ONLY_JUST_CREATED}" -- renaming a task made earlier keeps it picked`, async () => {
    const stage = exportStage(documentWithTaskGroups())
    await clickTask(stage, 2, 2)
    const panel = stage.lastView().propertiesPanel
    const nameField = panel?.fields.find((one) => one.controls.some((control) => control.key.column === 'name'))
    const control = nameField?.controls.find((one) => one.key.column === 'name')
    expect(control, `premise: the panel shows the name field of the picked task: ${JSON.stringify(panel)} ${JSON.stringify(pickedItems(stage))} ${JSON.stringify(stage.lastView().notices)}`).toBeDefined()
    stage.beginEditing(nameField?.row ?? '')
    await stage.press({ kind: 'key', key: 'x', modifiers: { ctrl: false, shift: false, alt: false, meta: false } })
    stage.commitNext({ row: nameField?.row ?? '', key: control?.key, text: 'renamed later' } as unknown as FieldCommit)
    await stage.press(ENTER)
    const renamed = stage.loop.document().schedule.tasks.find((one) => one.uid === 2)
    expect(renamed?.name, 'premise: Enter settled the name').toBe('renamed later')
    expect(pickedItems(stage)).toEqual([{ kind: 'task', uid: 2 }])
  })
})

describe('FR-085 -- a task group selection points only at task groups the document has', () => {
  it(`"${CLAUSE_TASK_GROUPS_IN_THE_DOCUMENT}" -- a chosen task group taken away by a write and given back by undo comes back unchosen`, async () => {
    const document = documentWithTaskGroups()
    const stage = exportStage(document)
    await stage.pressRow(TASK_GROUP_PANEL, null, 'task-group-b')
    expect(chosenTaskGroups(stage), 'premise: the task group is chosen').toEqual(['task-group-b'])
    const api = installAgentApi({
      ...stage.loop.agentApiSeams(),
      writerName: 'w3-t3-tester',
      schemaVersion: document.schemaVersion,
    } as never)
    const outcome = api.applyCommands({
      readStamp: api.readStamp(),
      commands: [{ kind: commandNameOf('CM-27'), groupId: 'task-group-b', newGroupId: 'task-group-fresh' }] as never,
    })
    await stage.pointAt(1, 1)
    expect(outcome.accepted, 'premise: the write took the task group away').toBe(true)
    expect(stage.loop.document().schedule.taskGroups.some((one) => one.id === 'task-group-b')).toBe(false)
    await stage.take('IC-5')
    expect(stage.loop.document().schedule.taskGroups.some((one) => one.id === 'task-group-b'), 'premise: undo gave the task group back').toBe(true)
    expect(chosenTaskGroups(stage)).toEqual([])
  })
})

// Contract test: FR-058, AT-53, AT-54 and MK-13 against the task group name field of the Properties Panel (DFC-3320).

import { describe, expect, it } from 'vitest'

import { fieldOf, GROUP_ID, panelOf, taskOf } from './cr-606-stage'
import { taskGroupDocument } from '../unit/cr-541-stage'
import type { Document } from '../../src/entity/document-model/document/document'

const NAME_ROW = 'AT-53'
const TASK_UID = 1
const TASK_NAME = 'Design phase'

// WHY: the stage helper gives the task group a name; these cases set its name and derivation by hand.
const documentOf = (name: string | null, derivedFromTaskUid: number | null): Document => {
  const built = taskGroupDocument([{ id: GROUP_ID, parentId: null }], {}, {
    tasks: [taskOf(TASK_UID, { name: TASK_NAME })],
    taskGroups: [
      {
        id: GROUP_ID,
        parentId: null,
        name,
        derivedFromTaskUid,
        order: 0,
        treeState: 'auto',
        editPermission: null,
        color: null,
        minHeightPx: null,
      },
    ],
    taskGroupMembers: [{ taskUid: TASK_UID, taskGroupId: GROUP_ID }],
    taskVisuals: [],
  })
  return built as unknown as Document
}

const nameFieldOf = (document: Document) => fieldOf(panelOf(document, null, [GROUP_ID]), NAME_ROW)

describe('DFC-3320 -- FR-058 / AT-53 / AT-54 / MK-13: the task group name field holds the name the task group shows', () => {
  it('FR-058 / AT-53: a task group with name null derived from a Task shows that Task name in the name field', () => {
    const field = nameFieldOf(documentOf(null, TASK_UID))
    expect(field.controls.length, 'premise: the name field has a control').toBeGreaterThan(0)
    const control = field.controls[0]
    expect(control?.key).toMatchObject({ holder: 'taskGroup', column: 'name' })
    expect(control?.text).toBe(TASK_NAME)
    expect(control?.text).not.toBe('')
  })

  it('FR-058 / AT-53: a given name wins over the derivation', () => {
    const field = nameFieldOf(documentOf('Manual', TASK_UID))
    expect(field.controls[0]?.key).toMatchObject({ holder: 'taskGroup', column: 'name' })
    expect(field.controls[0]?.text).toBe('Manual')
  })

  it('FR-058 / AT-53: a given name with no derivation (derivedFromTaskUid null) shows that name', () => {
    const field = nameFieldOf(documentOf('Standalone', null))
    expect(field.controls[0]?.key).toMatchObject({ holder: 'taskGroup', column: 'name' })
    expect(field.controls[0]?.text).toBe('Standalone')
  })
})

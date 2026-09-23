// Spec-only cases for the TaskGroup aggregate branches docs/spec decides (CR-432).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type {
  Assignment,
  Dependency,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  editTaskGroup,
  type EditResult,
  type TaskGroupCommand,
} from '../../src/use-case/edit-document/edit-document'
import { validateEntity } from '../fixtures/grs-document'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  label: 'row',
  derivedFromTaskUid: null,
  order: 0,
  isCollapsed: null,
  isHidden: null,
  isKeptOpen: false,
  editGroup: null,
  color: null,
  height: null,
  ...part,
})

const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  wbsParentUid: null,
  wbsOrder: null,
  name: 'task',
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const dependencyOn = (predecessorUid: number): Dependency => ({
  predecessorUid,
  linkType: 1,
  lag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

const memberOf = (taskUid: number, groupId: string): TaskGroupMember => ({
  taskUid,
  groupId,
  stackOrder: null,
})

const visualOf = (taskUid: number): TaskVisual => ({
  taskUid,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
})

const resourceOf = (uid: number): Resource => ({
  uid,
  name: 'someone',
  resourceKind: 1,
  isCostResource: null,
  calendarUid: null,
  carry: {},
  carryElements: [],
})

const assignmentOf = (uid: number, taskUid: number | null, resourceUid: number): Assignment =>
  ({ uid, taskUid, resourceUid, carry: {}, carryElements: [] }) as unknown as Assignment

const documentOf = (schedule: Partial<Schedule> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        id: null,
        name: null,
        title: 'A',
        subject: null,
        category: null,
        company: null,
        manager: null,
        author: null,
        created: null,
        revision: null,
        lastSaved: null,
        startDate: null,
        statusDate: null,
        minutesPerDay: null,
        minutesPerWeek: null,
        daysPerMonth: null,
        weekStartDay: null,
        calendarUid: null,
        themeHue: 214,
        uidHighWaterMark: 100,
        importSeq: 0,
        carry: {},
        carryElements: [],
      },
      calendars: [],
      tasks: [],
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
      ...schedule,
    },
    documentSettings: {
      maxGroupDepth: 5,
      pinnedGroupIds: [],
      pinnedRowMax: 5,
      scrollDate: null,
      scrollGroupId: null,
      stackSafetyCap: 255,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const run = (document: Document, command: TaskGroupCommand): EditResult =>
  editTaskGroup(document, command, DEFAULT_ROW_NAME_FIXTURE)

const accepted = (result: EditResult): Document => {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

const treeOrder = (schedule: Schedule): string[] => {
  const out: string[] = []
  const walk = (parentId: string | null): void => {
    const kids = schedule.taskGroups
      .filter((one) => one.parentId === parentId)
      .sort((a, b) => a.order - b.order)
    for (const kid of kids) {
      out.push(kid.id)
      walk(kid.id)
    }
  }
  walk(null)
  return out
}

const byWbsOrder = (schedule: Schedule, uids: readonly number[]): number[] =>
  schedule.tasks
    .filter((one) => uids.includes(one.uid))
    .sort((a, b) => (a.wbsOrder ?? 0) - (b.wbsOrder ?? 0))
    .map((one) => one.uid)

const withoutOrder = (groups: readonly TaskGroup[]): Omit<TaskGroup, 'order'>[] =>
  [...groups]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ order: _order, ...rest }) => rest)

const iv2Breaches = (schedule: Schedule): string[] => {
  const groupIds = new Set(schedule.taskGroups.map((one) => one.id))
  const taskUids = new Set(schedule.tasks.map((one) => one.uid))
  const out: string[] = []
  for (const row of schedule.taskGroups) {
    if (row.parentId !== null && !groupIds.has(row.parentId)) out.push(`TaskGroup ${row.id}.parentId`)
  }
  for (const member of schedule.taskGroupMembers) {
    if (!groupIds.has(member.groupId)) out.push(`TaskGroupMember ${member.taskUid}.groupId`)
    if (!taskUids.has(member.taskUid)) out.push(`TaskGroupMember ${member.taskUid}.taskUid`)
  }
  return out
}

const invalidRows = (schedule: Schedule): string[] =>
  schedule.taskGroups.flatMap((row) => validateEntity('TaskGroup', row).errors.map((e) => `${row.id} ${e}`))

const FINISHED_DOCUMENT = '⭐ 本表の行は、操作が終わった文書について判ずること（MUST）'
const TREE_ORDER = '**`LC-9` が行を並べる順は木の順とすること（MUST）'

const threeSiblings = (): Document =>
  documentOf({
    tasks: [
      taskOf({ uid: 1, wbsOrder: 0 }),
      taskOf({ uid: 2, wbsParentUid: 1, wbsOrder: 0 }),
      taskOf({ uid: 3, wbsParentUid: 1, wbsOrder: 1 }),
      taskOf({ uid: 4, wbsParentUid: 1, wbsOrder: 2 }),
    ],
    taskGroups: [
      groupOf({ id: 'a', order: 0 }),
      groupOf({ id: 'b', order: 1 }),
      groupOf({ id: 'c', order: 2 }),
    ],
    taskGroupMembers: [memberOf(2, 'a'), memberOf(3, 'b'), memberOf(4, 'c')],
  })

const oneRow = (part: Partial<TaskGroup>): Document =>
  documentOf({ taskGroups: [groupOf({ id: 'r', ...part })] })

describe('CR-432 TaskGroup branches the specification decides', () => {
  it('CD-2 / CD-1 / FR-032: deleting row B leaves the WBS pair and dependency on row A untouched', () => {
    const t1 = taskOf({ uid: 1, wbsOrder: 0 })
    const t2 = taskOf({ uid: 2, wbsParentUid: 1, wbsOrder: 0, dependencies: [dependencyOn(1)] })
    const input = documentOf({
      tasks: [t1, t2],
      taskGroups: [groupOf({ id: 'A', order: 0 }), groupOf({ id: 'B', order: 1 })],
      taskGroupMembers: [memberOf(1, 'A'), memberOf(2, 'A')],
    })
    const out = accepted(run(input, { kind: 'deleteTaskGroup', groupId: 'B', newGroupId: 'fresh-row' })).schedule
    expect(out.taskGroups.map((one) => one.id)).toEqual(['A'])
    expect(out.tasks.find((one) => one.uid === 1)).toEqual(t1)
    expect(out.tasks.find((one) => one.uid === 2)).toEqual(t2)
  })

  it('DU-2 / IV-2 (invariant): paste onto a targetGroupId no row has -- 貼り付け先は、選んでいる行の子とすること（MUST）。', () => {
    const input = documentOf({
      tasks: [taskOf({ uid: 1 })],
      taskGroups: [groupOf({ id: 's' })],
      taskGroupMembers: [memberOf(1, 's')],
    })
    const result = run(input, {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: 's',
      targetGroupId: 'ghost',
      newGroupIds: { s: 'n' },
    })
    if (result.ok) {
      expect(iv2Breaches(result.document.schedule), FINISHED_DOCUMENT).toEqual([])
    }
  })

  it('IV-1 / AT-51 / RS-57: paste whose new id collides with a row, or names two copies alike, is refused', () => {
    const input = documentOf({
      taskGroups: [
        groupOf({ id: 's', order: 0 }),
        groupOf({ id: 's1', parentId: 's', order: 0 }),
        groupOf({ id: 'other', order: 1 }),
      ],
    })
    const clash = run(input, {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: 's',
      targetGroupId: null,
      newGroupIds: { s: 'other', s1: 'n1' },
    })
    const twin = run(input, {
      kind: 'pasteTaskGroupSubtree',
      sourceGroupId: 's',
      targetGroupId: null,
      newGroupIds: { s: 'n', s1: 'n' },
    })
    for (const result of [clash, twin]) {
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.refusals.some((one) => one.rule === 'IV-1' || one.rule === 'RS-57')).toBe(true)
      }
    }
  })

  it('DU-2 / DU-1: paste copies nothing that points at a task outside the subtree, nor a null-task Assignment', () => {
    const input = documentOf({
      tasks: [taskOf({ uid: 1, wbsOrder: 0 }), taskOf({ uid: 9, wbsOrder: 1 })],
      resources: [resourceOf(50)],
      assignments: [assignmentOf(60, 9, 50), assignmentOf(61, null, 50)],
      taskGroups: [groupOf({ id: 's', order: 0 }), groupOf({ id: 'z', order: 1 })],
      taskGroupMembers: [memberOf(1, 's'), memberOf(9, 'z')],
      taskVisuals: [visualOf(9)],
    })
    const out = accepted(
      run(input, {
        kind: 'pasteTaskGroupSubtree',
        sourceGroupId: 's',
        targetGroupId: null,
        newGroupIds: { s: 'n' },
      }),
    ).schedule
    const rule = '`DU-1` が複製するものは、表 T-050 の `CD-1` が消すものと、`TaskOrigin` を除いて一致すること（MUST）'
    expect(out.taskVisuals.filter((one) => one.taskUid === 9), rule).toHaveLength(1)
    expect(out.assignments.filter((one) => one.taskUid === 9), rule).toHaveLength(1)
    expect(out.assignments.filter((one) => one.taskUid === null), rule).toHaveLength(1)
  })

  it('AT-55 (invariant): createTaskGroup with order 1.5', () => {
    const result = run(documentOf(), {
      kind: 'createTaskGroup',
      id: 'n',
      parentId: null,
      label: 'new row',
      derivedFromTaskUid: null,
      order: 1.5,
    })
    if (result.ok) expect(invalidRows(result.document.schedule), FINISHED_DOCUMENT).toEqual([])
  })

  it('CM-29 / AT-53: setTaskGroupLabel with the current name changes nothing', () => {
    const input = oneRow({ label: 'same' })
    expect(accepted(run(input, { kind: 'setTaskGroupLabel', groupId: 'r', label: 'same' }))).toEqual(input)
  })

  it('CM-30 / AT-58: setTaskGroupColor with the current string changes nothing', () => {
    const input = oneRow({ color: '#336699/' })
    expect(accepted(run(input, { kind: 'setTaskGroupColor', groupId: 'r', color: '#336699/' }))).toEqual(input)
  })

  it('CM-31: resetTaskGroupColor on a row whose color is already null changes nothing', () => {
    const input = oneRow({ color: null })
    expect(accepted(run(input, { kind: 'resetTaskGroupColor', groupId: 'r' }))).toEqual(input)
  })

  it('AT-59 (invariant): setTaskGroupHeight 12.5', () => {
    const result = run(oneRow({ height: 20 }), { kind: 'setTaskGroupHeight', groupId: 'r', height: 12.5 })
    if (result.ok) expect(invalidRows(result.document.schedule), FINISHED_DOCUMENT).toEqual([])
  })

  it('CM-32: setTaskGroupHeight with the current value (integer, and null) changes nothing', () => {
    const tall = oneRow({ height: 20 })
    const auto = oneRow({ height: null })
    expect(accepted(run(tall, { kind: 'setTaskGroupHeight', groupId: 'r', height: 20 }))).toEqual(tall)
    expect(accepted(run(auto, { kind: 'setTaskGroupHeight', groupId: 'r', height: null }))).toEqual(auto)
  })

  it('CM-33 / AT-56: setTaskGroupCollapsed with the current value on a childless row changes nothing', () => {
    const input = oneRow({ isCollapsed: true })
    expect(accepted(run(input, { kind: 'setTaskGroupCollapsed', groupId: 'r', collapsed: true }))).toEqual(input)
  })

  it('CM-34 / AT-57: setTaskGroupHidden with the current value on a childless row changes nothing', () => {
    const input = oneRow({ isHidden: true })
    expect(accepted(run(input, { kind: 'setTaskGroupHidden', groupId: 'r', hidden: true }))).toEqual(input)
  })

  it('CM-75 / AT-142: setTaskGroupKeptOpen with the current value on a childless row changes nothing', () => {
    const input = oneRow({ isKeptOpen: true })
    expect(accepted(run(input, { kind: 'setTaskGroupKeptOpen', groupId: 'r', keptOpen: true }))).toEqual(input)
  })

  it('HM-9 / ST-2 / AT-26: a real reorder carries into wbsOrder, and siblings on one row follow ST-2', () => {
    const input = documentOf({
      tasks: [
        taskOf({ uid: 1, wbsOrder: 0 }),
        taskOf({ uid: 2, wbsParentUid: 1, wbsOrder: 1, start: '2026-01-05T08:00:00', finish: '2026-01-06T17:00:00' }),
        taskOf({ uid: 3, wbsParentUid: 1, wbsOrder: 2, start: '2026-01-05T08:00:00', finish: '2026-01-09T17:00:00' }),
        taskOf({ uid: 4, wbsParentUid: 1, wbsOrder: 0, start: '2026-01-05T08:00:00', finish: '2026-01-07T17:00:00' }),
      ],
      taskGroups: [groupOf({ id: 'a', order: 0 }), groupOf({ id: 'b', order: 1 })],
      taskGroupMembers: [memberOf(4, 'a'), memberOf(2, 'b'), memberOf(3, 'b')],
    })
    const out = accepted(
      run(input, { kind: 'reorderTaskGroupSiblings', parentId: null, orderedIds: ['b', 'a'] }),
    ).schedule
    expect(treeOrder(out), TREE_ORDER).toEqual(['b', 'a'])
    expect(byWbsOrder(out, [2, 3, 4]), '並べ替えた順序も WBS へ伝わること（MUST）').toEqual([3, 2, 4])
    expect(byWbsOrder(out, [2, 3]), '⭐ 同じ行に兄弟が複数いるときは 表 T-014 の `ST-2` の順とすること（MUST）').toEqual([3, 2])
  })

  it('CM-35 / HM-8 / LC-9: reorderTaskGroupSiblings in the current order keeps the tree and wbsOrder', () => {
    const input = threeSiblings()
    const out = accepted(
      run(input, { kind: 'reorderTaskGroupSiblings', parentId: null, orderedIds: ['a', 'b', 'c'] }),
    ).schedule
    expect(treeOrder(out), '**兄弟どうしの並べ替えができること（MUST）').toEqual(['a', 'b', 'c'])
    expect(withoutOrder(out.taskGroups)).toEqual(withoutOrder(input.schedule.taskGroups))
    expect(byWbsOrder(out, [2, 3, 4])).toEqual([2, 3, 4])
  })

  it('IV-2 (invariant): moveTaskGroup under a parentId no row has', () => {
    const result = run(threeSiblings(), { kind: 'moveTaskGroup', groupId: 'a', parentId: 'ghost', order: 0 })
    if (result.ok) expect(iv2Breaches(result.document.schedule), FINISHED_DOCUMENT).toEqual([])
  })

  it('HM-4 / RS-55: **自分の子孫を親にする移動を受け付けてはならない（MUST NOT）', () => {
    const input = documentOf({
      taskGroups: [
        groupOf({ id: 'p', order: 0 }),
        groupOf({ id: 'p1', parentId: 'p', order: 0 }),
        groupOf({ id: 'p2', parentId: 'p1', order: 0 }),
      ],
    })
    const before = structuredClone(input)
    for (const parentId of ['p', 'p1', 'p2']) {
      expect(run(input, { kind: 'moveTaskGroup', groupId: 'p', parentId, order: 0 }).ok, parentId).toBe(false)
    }
    expect(input).toEqual(before)
  })

  it('HM-3a / S-125: 移動後の深さが `FR-004` の上限を超える移動を受け付けてはならない（MUST NOT）', () => {
    const input = documentOf({
      taskGroups: [
        groupOf({ id: 'd1', order: 0 }),
        groupOf({ id: 'd2', parentId: 'd1', order: 0 }),
        groupOf({ id: 'd3', parentId: 'd2', order: 0 }),
        groupOf({ id: 'd4', parentId: 'd3', order: 0 }),
        groupOf({ id: 'r1', order: 1 }),
        groupOf({ id: 'r2', parentId: 'r1', order: 0 }),
      ],
    })
    const before = structuredClone(input)
    expect(run(input, { kind: 'moveTaskGroup', groupId: 'r1', parentId: 'd4', order: 0 }).ok).toBe(false)
    expect(input).toEqual(before)
  })

  it('CM-73 / LC-9: moveTaskGroup of the order-0 row to order 0 under the same parent keeps the tree', () => {
    const input = threeSiblings()
    const out = accepted(run(input, { kind: 'moveTaskGroup', groupId: 'a', parentId: null, order: 0 })).schedule
    expect(treeOrder(out), TREE_ORDER).toEqual(['a', 'b', 'c'])
    expect(out.taskGroups.find((one) => one.id === 'a')?.parentId).toBeNull()
    expect(byWbsOrder(out, [2, 3, 4])).toEqual([2, 3, 4])
  })
})

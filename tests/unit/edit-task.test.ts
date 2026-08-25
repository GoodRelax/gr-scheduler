// Unit tests for UF-11 -- the `Task` and `TaskVisual` aggregate of EditDocument.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// ⭐ Every expectation below is read off docs/spec and NOT off the unit: 1.9
// requires a test that verifies a requirement pointing at a table to be driven
// by fixed data copied from that table, and a test written from the code can
// only ever confirm the code's own reading of the specification.
//
// ⚠️ The commands are reached through `edit-document.ts`, the public entry of
// the component (Chapter 5.3, MUST NOT import any other file of the folder).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import {
  planActualState,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import {
  editTask,
  type EditResult,
  type PlanActualPlacement,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A day of January 2026 written the way EX-7 writes a day GRS decided itself
 * (the exchange partner's type, at midnight). Spelling the fixtures this way
 * keeps a value that was passed through and a value that was re-written
 * indistinguishable, so no case turns on a question the specification does not
 * answer. 2026-01-05 is a Monday, so 05 .. 09 is one working week.
 */
const jan = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

/**
 * ⚠️ Every nullable column table T-019a reads is spelled `null` here. Leaving
 * one `undefined` reads as "set" -- an absent `actualFinish` makes
 * `planActualState` answer PS-2 for a task that never finished.
 */
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
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
  }) as unknown as Task

/** AT-97 is primary key and foreign key at once, so a visual names its task. */
const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    taskUid: 1,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...part,
  }) as unknown as TaskVisual

/** AT-54: `label` and `derivedFromTaskUid` are never both null (IV-8). */
const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

/** One edge of AT-42, held by the successor. */
const dependencyOn = (predecessorUid: number): Record<string, unknown> => ({
  predecessorUid,
  linkType: 1,
  lag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
})

/**
 * ⚠️ All twelve keys of the schedule group (DR-2 of table T-052) are present:
 * a cascade that reads an array the fixture forgot would fail for a reason the
 * specification never states.
 *
 * ⚠️ No calendar is named, which is what sends `workingCalendarOf` to table
 * T-209's default -- Monday to Friday (S-106), the calendar every day count
 * below is figured by.
 */
const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: 214,
      uidHighWaterMark: 10, // AT-20
      importSeq: 0,
      revision: 1,
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
    ...part,
  }) as unknown as Schedule

/**
 * ⚠️ A settings key this aggregate reads and the fixture forgets makes an
 * arithmetic answer `NaN` and everything downstream vanish silently, so every
 * row the cases touch is carried at its table value.
 */
const SETTINGS = {
  importMinDate: '1970-01-01', // S-119
  importMaxDate: '2200-12-31', // S-120
  actualInitialDuration: 1, // S-129
  milestoneActualDuration: 0, // S-130
  maxGroupDepth: 5, // S-125
  stackSafetyCap: 255, // S-89
} as unknown as DocumentSettings

const documentOf = (schedule: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf(schedule),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

/** The document an accepted edit answers with; fails the case when it refused. */
const accepted = (result: EditResult): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.refusals.map((r) => `${r.rule}: ${r.what}`).join('; '))
  return result.document
}

/** A refusal, asserted both ways: that it refused, and which rule refused it. */
const expectRefusal = (result: EditResult, rule: string): void => {
  expect(result.ok).toBe(false)
  if (!result.ok) expect(result.refusals[0]!.rule).toBe(rule)
}

const taskIn = (document: Document, uid: number): Task =>
  document.schedule.tasks.find((task) => task.uid === uid)!

const visualIn = (document: Document, uid: number): TaskVisual =>
  document.schedule.taskVisuals.find((visual) => visual.taskUid === uid)!

const groupIn = (document: Document, id: string): TaskGroup =>
  document.schedule.taskGroups.find((group) => group.id === id)!

const rowOf = (document: Document, uid: number): string | undefined =>
  document.schedule.taskGroupMembers.find((member) => member.taskUid === uid)?.groupId

const run = (document: Document, command: TaskCommand): EditResult => editTask(document, command)

// ---------------------------------------------------------------------------
// CM-6 createTask -- FR-001
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-6 createTask', () => {
  // A document already holding one task with a far higher UID than the mark,
  // which is what tells the two ways of numbering apart.
  // The CM-6 arm on its own, not the whole of `TaskCommand`: a case below
  // spreads this and replaces `shapeKind`, which only the create arm carries.
  const drawnOn = (groupId: string): Extract<TaskCommand, { kind: 'createTask' }> => ({
    kind: 'createTask',
    shapeKind: 'rectangle',
    start: jan(5),
    finish: jan(9),
    groupId,
  })

  const before = documentOf({
    tasks: [taskOf({ uid: 42, name: 'imported', start: jan(5), finish: jan(9) })],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: 42, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: 42 })],
  })

  const createdIn = (document: Document): Task =>
    document.schedule.tasks.find((task) => task.uid !== 42)!

  it('FR-001 numbers the task from uidHighWaterMark and not from the largest UID held', () => {
    const next = accepted(run(before, drawnOn('g1')))
    // MUST NOT take it from the largest UID in the document: that is 42, so 43
    // is the number the forbidden reading produces. The mark is 10.
    expect(createdIn(next).uid).not.toBe(43)
    // MUST follow `Project.uidHighWaterMark`, which therefore has to move --
    // the rationale is that undo must not hand the same number out twice.
    expect(next.schedule.project.uidHighWaterMark).toBeGreaterThan(10)
    const again = accepted(run(next, drawnOn('g1')))
    const uids = again.schedule.tasks.map((task) => task.uid)
    expect(new Set(uids).size).toBe(uids.length)
  })

  it('FR-001 gives the created task no WBS parent', () => {
    // MUST: the row and the WBS are separate axes (HM-3 of table T-015a), and
    // FR-005 owns the only entry that gives a task a parent. `null` is the root.
    expect(createdIn(accepted(run(before, drawnOn('g1')))).wbsParentUid).toBeNull()
  })

  it('FR-001 makes Task.milestone true for SH-5 and false for every other shape', () => {
    // MUST: the shape the palette is holding decides the boolean, and there is
    // no entry that changes the boolean alone afterwards (MUST NOT).
    const point = accepted(run(before, { ...drawnOn('g1'), shapeKind: 'milestone' }))
    expect(createdIn(point).milestone).toBe(true)
    expect(visualIn(point, createdIn(point).uid).shapeKind).toBe('milestone')

    const span = accepted(run(before, { ...drawnOn('g1'), shapeKind: 'chevron' }))
    expect(createdIn(span).milestone).toBe(false)
    expect(visualIn(span, createdIn(span).uid).shapeKind).toBe('chevron')
  })

  it('FR-001 lands the task on the TaskGroup the drag pointed at', () => {
    // MUST: this is where a `TaskGroupMember` comes from, and IV-6 has exactly
    // one of them per task.
    const next = accepted(run(before, drawnOn('g1')))
    const created = createdIn(next)
    expect(rowOf(next, created.uid)).toBe('g1')
    expect(next.schedule.taskGroupMembers.filter((m) => m.taskUid === created.uid)).toHaveLength(1)
  })

  it('FR-001 creates the row when none is there and derives its name from the task', () => {
    // MUST: FR-032 can leave a document with no row at all, so the drag has to
    // be able to make one. MUST: a row made here carries no name of its own, so
    // the task placed on it is its derivation source -- AT-54 and IV-8 forbid a
    // row with neither.
    const next = accepted(run(before, drawnOn('g9')))
    const created = createdIn(next)
    const made = groupIn(next, 'g9')
    expect(made).toBeDefined()
    expect(made.derivedFromTaskUid).toBe(created.uid)
    expect(rowOf(next, created.uid)).toBe('g9')
  })
})

// ---------------------------------------------------------------------------
// CM-7 deleteTask -- FR-032 and table T-050's CD-1
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-7 deleteTask', () => {
  // 1 is the root, 2 its WBS child, 3 an unrelated task depending on 2.
  const before = documentOf({
    tasks: [
      taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) }),
      taskOf({
        uid: 2,
        wbsParentUid: 1,
        name: 'Draft',
        start: jan(5),
        finish: jan(9),
        dependencies: [dependencyOn(1)],
      }),
      taskOf({
        uid: 3,
        name: 'Review',
        start: jan(5),
        finish: jan(9),
        dependencies: [dependencyOn(2)],
      }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [1, 2, 3].map((taskUid) => ({ taskUid, groupId: 'g1', stackOrder: null })),
    taskVisuals: [1, 2, 3].map((taskUid) => visualOf({ taskUid })),
    taskOrigins: [1, 2, 3].map((taskUid) => ({
      taskUid,
      sourceProjectUid: 'p',
      sourceUid: taskUid,
      lastSeenImportSeq: 0,
      importSessionId: null,
    })),
    resources: [{ uid: 7, name: 'ando', resourceKind: null, isCostResource: null,
      calendarUid: null, carry: {}, carryElements: [] }],
    assignments: [
      { uid: 100, taskUid: 1, resourceUid: 7, carry: {}, carryElements: [] },
      { uid: 101, taskUid: 3, resourceUid: 7, carry: {}, carryElements: [] },
    ],
  })

  it('CD-1 takes the WBS descendants with the Task', () => {
    const next = accepted(run(before, { kind: 'deleteTask', uid: 1 }))
    expect(next.schedule.tasks.map((task) => task.uid)).toEqual([3])
  })

  it('CD-1 takes the TaskVisual, the TaskOrigin and the TaskGroupMember of each', () => {
    const next = accepted(run(before, { kind: 'deleteTask', uid: 1 }))
    expect(next.schedule.taskVisuals.map((v) => v.taskUid)).toEqual([3])
    expect(next.schedule.taskOrigins.map((o) => o.taskUid)).toEqual([3])
    expect(next.schedule.taskGroupMembers.map((m) => m.taskUid)).toEqual([3])
  })

  it('CD-1 takes the dependencies at either end and the assignments pointing at it', () => {
    const next = accepted(run(before, { kind: 'deleteTask', uid: 1 }))
    // 3 survives, but its predecessor 2 went with the subtree, so the edge that
    // named 2 cannot stay -- it would point at a task the document no longer has.
    expect(taskIn(next, 3).dependencies).toEqual([])
    // CD-5's counterpart: the resource itself is untouched, only the assignment.
    expect(next.schedule.assignments.map((a) => a.uid)).toEqual([101])
    expect(next.schedule.resources).toHaveLength(1)
  })

  it('FR-032 settles the name of a row derived from the Task, and keeps the row', () => {
    // MUST: fix the row's name and empty `derivedFromTaskUid` BEFORE the task
    // goes, because AT-54 forbids a row with neither. MUST NOT delete the row:
    // it is a container a person made, and HM-6 keeps its name, colour, height
    // and collapsed state.
    const document = documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) })],
      taskGroups: [groupOf({ id: 'g1', label: null, derivedFromTaskUid: 1, color: 'blue' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
    })
    const next = accepted(run(document, { kind: 'deleteTask', uid: 1 }))
    const row = groupIn(next, 'g1')
    expect(row).toBeDefined()
    expect(row.derivedFromTaskUid).toBeNull()
    expect(row.label).toBe('Design')
    expect(row.color).toBe('blue')
  })
})

// ---------------------------------------------------------------------------
// FR-032 -- select every Task, then delete
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- FR-032: select-all, then delete', () => {
  // The same three Tasks the CM-7 cases above use: 1 is the root, 2 its WBS
  // child, 3 unrelated and depending on 2.
  const before = documentOf({
    tasks: [
      taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) }),
      taskOf({ uid: 2, wbsParentUid: 1, name: 'Draft', start: jan(5), finish: jan(9) }),
      taskOf({ uid: 3, name: 'Review', start: jan(5), finish: jan(9) }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [1, 2, 3].map((taskUid) => ({ taskUid, groupId: 'g1', stackOrder: null })),
  })

  it('⛔ does not refuse a delete whose target an earlier CD-1 cascade already took', () => {
    // ⛔ IV-2 IS A REFERENCE INVARIANT AND NOTHING ELSE. Table T-220 states
    // it as 「外部キーが非 `null` のとき、それが指す先の行が同じ文書にある
    // こと」, of kind 参照. Deleting a `Task` that is not in the document
    // writes no key at all, so the state the command asks for already holds --
    // there is no key left over to point at nothing.
    const after = accepted(run(before, { kind: 'deleteTask', uid: 1 }))
    // CD-1 of table T-050 took 2 with 1: 「その `Task` の WBS の子孫」.
    expect(after.schedule.tasks.map((task) => task.uid)).toEqual([3])

    const again = run(after, { kind: 'deleteTask', uid: 2 })
    expect(again.ok, 'the second delete of the selection was refused').toBe(true)
  })

  it('deletes every selected Task when the whole schedule was selected', () => {
    // FR-032: 「作成者が削除を求めたとき、`GRS` は、選ばれたタスク・依存線・
    // 注記・行を削除し」. Selecting all of them and asking once plans
    // one delete per selected `Task`, and CD-1 makes all but the first name a
    // `Task` the cascade has already carried off.
    let document = before
    for (const uid of [1, 2, 3]) {
      const answer = run(document, { kind: 'deleteTask', uid })
      expect(answer.ok, `the delete of ${uid} was refused`).toBe(true)
      document = accepted(answer)
    }
    expect(document.schedule.tasks, 'a selected Task survived the delete').toEqual([])
    // CD-1 also names the `TaskGroupMember`, so nothing is left pointing at a
    // `Task` that is gone.
    expect(document.schedule.taskGroupMembers).toEqual([])
    // FR-032 (MUST NOT): 「行そのものは消さない」.
    expect(document.schedule.taskGroups.map((group) => group.id)).toEqual(['g1'])
  })

  it('the order the selection is walked in does not change what is left', () => {
    // 「`CD-2` が消す範囲は、その行に載る各 `Task` に `CD-1` を適用した和と
    // 一致すること（MUST）」 —— 「経路によって結果が変わってはならない」. The child
    // before the parent reaches the same document as the parent before the
    // child, and a refusal on either path would break that equality.
    const walk = (order: readonly number[]): Document => {
      let document = before
      for (const uid of order) document = accepted(run(document, { kind: 'deleteTask', uid }))
      return document
    }
    expect(walk([2, 1, 3])).toEqual(walk([1, 2, 3]))
  })

  it('still refuses the other commands against a Task that is not there (IV-2)', () => {
    // ⚠ THE EXEMPTION IS CM-7'S ALONE. Every other command WRITES against the
    // row it names, so a missing target would leave a key pointing at nothing --
    // which is the very state IV-2 forbids.
    expectRefusal(run(before, { kind: 'setTaskName', uid: 99, name: 'Build' }), 'IV-2')
  })
})

// ---------------------------------------------------------------------------
// CM-8 pasteTaskSubtree -- FR-033 and table T-223's DU-1
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-8 pasteTaskSubtree', () => {
  // 1 is the root of the copied subtree, 2 its child; 9 is outside it, and the
  // child depends on both -- one edge closed inside the subtree, one leaving it.
  const before = documentOf({
    tasks: [
      taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) }),
      taskOf({
        uid: 2,
        wbsParentUid: 1,
        name: 'Draft',
        start: jan(5),
        finish: jan(9),
        dependencies: [dependencyOn(1), dependencyOn(9)],
      }),
      taskOf({ uid: 9, name: 'Outside', start: jan(5), finish: jan(9) }),
    ],
    taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'g2', order: 1 })],
    taskGroupMembers: [1, 2, 9].map((taskUid) => ({ taskUid, groupId: 'g1', stackOrder: null })),
    taskVisuals: [
      visualOf({ taskUid: 1, fillColor: 'blue' }),
      visualOf({ taskUid: 2 }),
      visualOf({ taskUid: 9 }),
    ],
    taskOrigins: [1, 2].map((taskUid) => ({
      taskUid,
      sourceProjectUid: 'p',
      sourceUid: taskUid,
      lastSeenImportSeq: 0,
      importSessionId: null,
    })),
    resources: [{ uid: 7, name: 'ando', resourceKind: null, isCostResource: null,
      calendarUid: null, carry: {}, carryElements: [] }],
    assignments: [{ uid: 100, taskUid: 1, resourceUid: 7, carry: {}, carryElements: [] }],
  })

  const pasted = (document: Document): { root: Task; child: Task } => {
    const copies = document.schedule.tasks.filter((task) => ![1, 2, 9].includes(task.uid))
    const child = copies.find((copy) => copies.some((other) => other.uid === copy.wbsParentUid))!
    const root = copies.find((copy) => copy !== child)!
    return { root, child }
  }

  it('DU-1 copies the WBS descendants of the Task', () => {
    const next = accepted(run(before, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    expect(next.schedule.tasks).toHaveLength(5)
    const { root, child } = pasted(next)
    expect(child.wbsParentUid).toBe(root.uid)
    expect([root.name, child.name]).toEqual(['Design', 'Draft'])
  })

  it('FR-033 must not give a copy the UID of the Task it was copied from', () => {
    // MUST NOT: the numbering is FR-001's, so a copy is a new task.
    const next = accepted(run(before, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    const uids = next.schedule.tasks.map((task) => task.uid)
    expect(new Set(uids).size).toBe(uids.length)
    const { root, child } = pasted(next)
    expect([1, 2, 9]).not.toContain(root.uid)
    expect([1, 2, 9]).not.toContain(child.uid)
  })

  it('DU-1 copies the TaskVisual, the membership and the assignment, and lands on the same row', () => {
    // MUST: the copy goes on the same row as the source -- without that,
    // CD-2's range is undecided too.
    const next = accepted(run(before, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    const { root, child } = pasted(next)
    expect(rowOf(next, root.uid)).toBe('g1')
    expect(rowOf(next, child.uid)).toBe('g1')
    expect(visualIn(next, root.uid).fillColor).toBe('blue')
    expect(visualIn(next, child.uid)).toBeDefined()
    expect(next.schedule.assignments.filter((a) => a.taskUid === root.uid)).toHaveLength(1)
  })

  it('DU-1 must not copy the TaskOrigin', () => {
    // MUST NOT: a copy did not come from the exchange partner, so it is not a
    // candidate for the merge's matching.
    const next = accepted(run(before, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    expect(next.schedule.taskOrigins.map((o) => o.taskUid).sort()).toEqual([1, 2])
  })

  it('FR-033 copies only the dependency closed inside the subtree', () => {
    // MUST NOT copy an edge leaving the subtree: copying the edge to 9 would add
    // one more line to the same predecessor on every paste. The edge that IS
    // copied is the one to 1, and inside the copy it names the copy of 1.
    const next = accepted(run(before, { kind: 'pasteTaskSubtree', sourceUid: 1 }))
    const { root, child } = pasted(next)
    expect(child.dependencies.map((d) => d.predecessorUid)).toEqual([root.uid])
  })
})

// ---------------------------------------------------------------------------
// CM-9 / CM-10 / CM-12 -- the plain columns of table T-016
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- the plain columns of a Task', () => {
  const oneTask = documentOf({
    tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) })],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: 1 })],
  })

  it('FR-091 writes the task name, and AT-27 lets it be cleared', () => {
    expect(taskIn(accepted(run(oneTask, { kind: 'setTaskName', uid: 1, name: 'Build' })), 1).name)
      .toBe('Build')
    expect(taskIn(accepted(run(oneTask, { kind: 'setTaskName', uid: 1, name: null })), 1).name)
      .toBeNull()
  })

  it('PR-2 writes the notes', () => {
    const next = accepted(run(oneTask, { kind: 'setTaskNotes', uid: 1, notes: 'from the survey' }))
    expect(taskIn(next, 1).notes).toBe('from the survey')
  })

  it('PR-10 keeps the deadline apart from the finish, and lets it be cleared', () => {
    // FR-045: the deadline is an independent mark, not the finish date, so
    // writing one must not move `finish`.
    const set = accepted(run(oneTask, { kind: 'setTaskDeadline', uid: 1, deadline: jan(12) }))
    expect(taskIn(set, 1).deadline).toBe(jan(12))
    expect(taskIn(set, 1).finish).toBe(jan(9))
    const cleared = accepted(run(set, { kind: 'setTaskDeadline', uid: 1, deadline: null }))
    expect(taskIn(cleared, 1).deadline).toBeNull()
  })

  it('refuses a command that names no Task in the document', () => {
    // IV-2 keeps a non-null foreign key pointing at a row that is there; a
    // command against a UID the document does not hold can only be refused,
    // because AG-8 makes returning the document untouched read as "applied".
    expect(run(oneTask, { kind: 'setTaskName', uid: 99, name: 'Build' }).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CM-11 setTaskPlanDates -- FR-012
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-11 setTaskPlanDates', () => {
  const started = (part: Record<string, unknown> = {}): Document =>
    documentOf({
      tasks: [
        taskOf({
          uid: 1,
          name: 'Design',
          start: jan(5),
          finish: jan(9),
          actualStart: jan(5),
          actualDuration: 2,
          resumeValid: true,
          ...part,
        }),
      ],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1 })],
    })

  it('FR-012 must not accept a finish before the start', () => {
    // MUST NOT, and MUST NOT round it to finish = start either: a negative span
    // breaks the completion rate's divisor, the progress line's vertices and the
    // overlap test that assigns stacks.
    const result = run(started(), { kind: 'setTaskPlanDates', uid: 1, start: jan(9), finish: jan(5) })
    expectRefusal(result, 'FR-012')
    const same = accepted(run(started(), { kind: 'setTaskPlanDates', uid: 1, start: jan(5), finish: jan(5) }))
    expect(taskIn(same, 1).finish).toBe(jan(5))
  })

  it('FR-012 recomputes the stored completion rate from the dates', () => {
    // Monday to Friday is four worked days -- the DIFFERENCE, not the five days
    // an inclusive count would give (MUST NOT confuse the two). 2 / 4 is 50.
    const next = accepted(run(started(), { kind: 'setTaskPlanDates', uid: 1, start: jan(5), finish: jan(9) }))
    expect(taskIn(next, 1).percentComplete).toBe(50)
  })

  it('FR-012 must not clamp the completion rate to 0 .. 100', () => {
    // MUST NOT round into 0 .. 100: a task planned for four days and worked for
    // six reads 150, which is how the difference in effort is read off the rate.
    const next = accepted(
      run(started({ actualDuration: 6 }), {
        kind: 'setTaskPlanDates',
        uid: 1,
        start: jan(5),
        finish: jan(9),
      }),
    )
    expect(taskIn(next, 1).percentComplete).toBe(150)
  })

  it('FR-012 must not divide when the plan span is zero: 100 with an actualFinish, 0 without', () => {
    // MUST NOT divide, and the answer is decided by whether `actualFinish` is
    // there -- which is what "finished" means (table T-019), not a rate of 100.
    const open = accepted(
      run(started({ actualDuration: 1 }), {
        kind: 'setTaskPlanDates',
        uid: 1,
        start: jan(5),
        finish: jan(5),
      }),
    )
    expect(taskIn(open, 1).percentComplete).toBe(0)

    const done = accepted(
      run(started({ actualDuration: 1, actualFinish: jan(6) }), {
        kind: 'setTaskPlanDates',
        uid: 1,
        start: jan(5),
        finish: jan(5),
      }),
    )
    expect(taskIn(done, 1).percentComplete).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// CM-13 setTaskPlanActualState -- FR-010 and table T-019
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-13 setTaskPlanActualState', () => {
  const before = (part: Record<string, unknown> = {}): Document =>
    documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9), ...part })],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1 })],
    })

  // Table T-019, copied. 空 is `null`; the state each row lands on is read back
  // through table T-019a, which is the other half of FR-010.
  const T019 = [
    {
      row: 'PA-2',
      place: { row: 'PA-2', actualStart: jan(5), actualDuration: 3 },
      columns: {
        actualStart: jan(5),
        actualDuration: 3,
        actualFinish: null,
        resume: null,
        resumeValid: true,
      },
      state: 'inProgress',
    },
    {
      row: 'PA-3',
      place: { row: 'PA-3', actualStart: jan(5), actualDuration: 3, resume: jan(20) },
      columns: {
        actualStart: jan(5),
        actualDuration: 3,
        actualFinish: null,
        resume: jan(20),
        resumeValid: true,
      },
      state: 'suspendedResumePlanned',
    },
    {
      row: 'PA-4',
      place: { row: 'PA-4', actualStart: jan(5), actualDuration: 3 },
      columns: {
        actualStart: jan(5),
        actualDuration: 3,
        actualFinish: null,
        resume: null,
        resumeValid: false,
      },
      state: 'suspendedResumeUnknown',
    },
    {
      row: 'PA-5',
      place: { row: 'PA-5', actualStart: jan(5), actualDuration: 3, actualFinish: jan(8) },
      columns: {
        actualStart: jan(5),
        actualDuration: 3,
        actualFinish: jan(8),
        resume: null,
        resumeValid: false,
      },
      state: 'finished',
    },
  ] as const

  it.each(T019)('$row places the values table T-019 gives that state', ({ place, columns, state }) => {
    const next = accepted(
      run(before({ actualStart: jan(5), actualDuration: 9, resume: jan(30), resumeValid: true }), {
        kind: 'setTaskPlanActualState',
        uid: 1,
        place: place as PlanActualPlacement,
      }),
    )
    const task = taskIn(next, 1)
    expect({
      actualStart: task.actualStart,
      actualDuration: task.actualDuration,
      actualFinish: task.actualFinish,
      resume: task.resume,
      resumeValid: task.resumeValid,
    }).toEqual(columns)
    expect(planActualState(task)).toBe(state)
  })

  it('PA-1 empties the four columns and leaves resumeValid where it found it', () => {
    // ⭐ PA-1's `resumeValid` cell is `—`, which is NOT 空: the table puts no
    // value there, so the column keeps what it had.
    const next = accepted(
      run(before({ actualStart: jan(5), actualDuration: 3, actualFinish: jan(8), resume: jan(20), resumeValid: true }), {
        kind: 'setTaskPlanActualState',
        uid: 1,
        place: { row: 'PA-1' },
      }),
    )
    const task = taskIn(next, 1)
    expect([task.actualStart, task.actualDuration, task.actualFinish, task.resume]).toEqual([
      null,
      null,
      null,
      null,
    ])
    expect(task.resumeValid).toBe(true)
    expect(planActualState(task)).toBe('notStarted')
  })
})

// ---------------------------------------------------------------------------
// CM-14 beginTaskActual -- FR-043, with S-129 and S-130
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-14 beginTaskActual', () => {
  const notStarted = (task: Record<string, unknown>, visual: Record<string, unknown>): Document =>
    documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', ...task })],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1, ...visual })],
    })

  it('FR-043 places the plan start, S-129 worked days and resumeValid true', () => {
    // MUST, and all three at once: "one end decided on its own" is the state
    // FR-043 exists to prevent. S-129 is 1 because a job that takes one day is
    // still entered as one day.
    const next = accepted(
      run(notStarted({ start: jan(5), finish: jan(9) }, { shapeKind: 'rectangle' }), {
        kind: 'beginTaskActual',
        uid: 1,
      }),
    )
    const task = taskIn(next, 1)
    expect(task.actualStart).toBe(jan(5))
    expect(task.actualDuration).toBe(1)
    expect(task.resumeValid).toBe(true)
    // PA-2's other columns stay empty, so the task reads as in progress.
    expect(planActualState(task)).toBe('inProgress')
  })

  it('FR-043 gives a milestone S-130 instead, because a point has no length', () => {
    // MUST: a milestone carries no actual bar (GR-15), so the dummy is a single
    // point and S-130 is 0 -- a fixed value chosen to satisfy PA-2 .. PA-5.
    const next = accepted(
      run(
        notStarted({ start: jan(12), finish: jan(12), milestone: true }, { shapeKind: 'milestone' }),
        { kind: 'beginTaskActual', uid: 1 },
      ),
    )
    const task = taskIn(next, 1)
    expect(task.actualStart).toBe(jan(12))
    expect(task.actualDuration).toBe(0)
    expect(task.resumeValid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// CM-15 cycleTaskPlanActualState -- FR-013 and table T-021a
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-15 cycleTaskPlanActualState', () => {
  const at = (part: Record<string, unknown>): Document =>
    documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9), ...part })],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1, shapeKind: 'rectangle' })],
    })

  const cycled = (document: Document): Task =>
    taskIn(accepted(run(document, { kind: 'cycleTaskPlanActualState', uid: 1 })), 1)

  it('PV-1 takes a task that has not started straight to finished', () => {
    // One press, because a job that takes a day is common enough that two would
    // make the tool heavy. Monday to Friday is four worked days.
    const task = cycled(at({}))
    expect(task.actualStart).toBe(jan(5))
    expect(task.actualFinish).toBe(jan(9))
    expect(task.actualDuration).toBe(4)
    expect(task.resumeValid).toBe(false)
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-2 finishes a task in progress without moving either end of the actual bar', () => {
    // The actual bar's right end is `actualStart` plus `actualDuration` worked
    // days (FR-011): Monday plus three is Thursday. MUST NOT move either end.
    const task = cycled(at({ actualStart: jan(5), actualDuration: 3, resumeValid: true }))
    expect(task.actualFinish).toBe(jan(8))
    expect(task.actualStart).toBe(jan(5))
    expect(task.actualDuration).toBe(3)
    expect(task.resumeValid).toBe(false)
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-3 suspends a finished task and empties the resume date it was carrying', () => {
    // ⚠️ `resume` is emptied because an imported finished task can hold a resume
    // date in the past; leaving it would read as "suspended, resuming then" the
    // moment the finish is undone.
    const task = cycled(
      at({ actualStart: jan(5), actualDuration: 3, actualFinish: jan(8), resume: jan(2), resumeValid: false }),
    )
    expect(task.actualFinish).toBeNull()
    expect(task.resume).toBeNull()
    expect(task.resumeValid).toBe(false)
    expect(planActualState(task)).toBe('suspendedResumeUnknown')
  })

  it('PV-4 returns a suspended task to in progress and must not send it back to not started', () => {
    // MUST NOT go back to "not started": that state holds no actual at all
    // (PA-1), so returning there would erase what a person entered. Undo and the
    // property panel are what remove an actual.
    for (const suspended of [
      { actualStart: jan(5), actualDuration: 3, resume: jan(20), resumeValid: true }, // PA-3
      { actualStart: jan(5), actualDuration: 3, resume: null, resumeValid: false }, // PA-4
    ]) {
      const task = cycled(at(suspended))
      expect(task.resume).toBeNull()
      expect(task.resumeValid).toBe(true)
      expect(task.actualStart).toBe(jan(5))
      expect(task.actualDuration).toBe(3)
      expect(planActualState(task)).toBe('inProgress')
    }
  })
})

// ---------------------------------------------------------------------------
// CM-16 / CM-17 the fade days -- FR-075, with IV-11 and IV-12
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-16 and CM-17, the fade days', () => {
  const withDates = (part: Record<string, unknown>): Document =>
    documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9), ...part })],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1, shapeKind: 'rectangle' })],
    })

  it('FR-075 keeps null apart from 0', () => {
    // MUST: `null` means "not in the original file", so the extension is not
    // written out; `0` is an explicit zero and IS written.
    const zero = accepted(run(withDates({}), { kind: 'setTaskFadeInDays', uid: 1, days: 0 }))
    expect(taskIn(zero, 1).fadeInDays).toBe(0)
    const cleared = accepted(run(zero, { kind: 'setTaskFadeInDays', uid: 1, days: null }))
    expect(taskIn(cleared, 1).fadeInDays).toBeNull()
  })

  it('IV-12 refuses a fadeIn and fadeOut whose sum passes the span of the Task', () => {
    // Monday to Friday: four days, whichever way the span is counted. 3 + 3
    // passes it either way; 2 + 2 fits either way.
    expectRefusal(
      run(withDates({ fadeInDays: 3 }), { kind: 'setTaskFadeOutDays', uid: 1, days: 3 }),
      'IV-12',
    )
    const fits = accepted(
      run(withDates({ fadeInDays: 2 }), { kind: 'setTaskFadeOutDays', uid: 1, days: 2 }),
    )
    expect([taskIn(fits, 1).fadeInDays, taskIn(fits, 1).fadeOutDays]).toEqual([2, 2])
  })

  it('IV-11 refuses a fade on a Task that has no finish', () => {
    expectRefusal(
      run(withDates({ finish: null }), { kind: 'setTaskFadeInDays', uid: 1, days: 1 }),
      'IV-11',
    )
  })
})

// ---------------------------------------------------------------------------
// CM-18 setTaskWbsParent and CM-19 moveTaskToTaskGroup -- FR-005, table T-015a
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-18 and CM-19, the two axes of table T-015a', () => {
  // 1 is the root, 2 its child, 3 the grandchild; two rows to move bars between.
  const before = documentOf({
    tasks: [
      taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9) }),
      taskOf({
        uid: 2,
        wbsParentUid: 1,
        name: 'Draft',
        start: jan(5),
        finish: jan(9),
        actualStart: jan(5),
        actualDuration: 2,
        resumeValid: true,
      }),
      taskOf({ uid: 3, wbsParentUid: 2, name: 'Detail', start: jan(5), finish: jan(9) }),
    ],
    taskGroups: [groupOf({ id: 'g1' }), groupOf({ id: 'g2', label: 'other', order: 1 })],
    taskGroupMembers: [1, 2, 3].map((taskUid) => ({ taskUid, groupId: 'g1', stackOrder: null })),
    taskVisuals: [1, 2, 3].map((taskUid) => visualOf({ taskUid })),
  })

  it('HM-4 must not accept a move that makes a descendant the parent', () => {
    // MUST NOT: it is a cycle, and IV-4 has the WBS parent links free of them.
    expectRefusal(run(before, { kind: 'setTaskWbsParent', uid: 1, parentUid: 3 }), 'HM-4')
  })

  it('HM-1 moves the WBS parent, HM-2 keeps the UID, and HM-5 leaves the row alone', () => {
    // MUST NOT rebuild the row's container; only the parent is updated, or the
    // look of the row is lost on every step of the hierarchy.
    const next = accepted(run(before, { kind: 'setTaskWbsParent', uid: 3, parentUid: 1 }))
    expect(taskIn(next, 3).wbsParentUid).toBe(1)
    expect(taskIn(next, 3).uid).toBe(3)
    expect(rowOf(next, 3)).toBe('g1')
    expect(groupIn(next, 'g1')).toEqual(groupIn(before, 'g1'))
  })

  it('AT-25 makes a null parent the root', () => {
    const next = accepted(run(before, { kind: 'setTaskWbsParent', uid: 2, parentUid: null }))
    expect(taskIn(next, 2).wbsParentUid).toBeNull()
  })

  it('HM-3 must not change the WBS when a bar is moved to another row', () => {
    // MUST NOT: moving a row and moving a level are different operations.
    const next = accepted(run(before, { kind: 'moveTaskToTaskGroup', uid: 2, groupId: 'g2' }))
    expect(rowOf(next, 2)).toBe('g2')
    expect(taskIn(next, 2).wbsParentUid).toBe(1)
  })

  it('HM-10 leaves the WBS children on the row they were already on', () => {
    // Only the task that was grabbed moves; the child has a membership of its
    // own, which is why it stays where it is.
    const next = accepted(run(before, { kind: 'moveTaskToTaskGroup', uid: 2, groupId: 'g2' }))
    expect(rowOf(next, 3)).toBe('g1')
  })

  it('FR-011 must not move the plan or the actual dates when the row changes', () => {
    // MUST NOT: both plan and actual travel to the new row, and NEITHER date
    // changes -- an actual is something a person recorded as having happened.
    const next = accepted(run(before, { kind: 'moveTaskToTaskGroup', uid: 2, groupId: 'g2' }))
    const task = taskIn(next, 2)
    expect([task.start, task.finish]).toEqual([jan(5), jan(9)])
    expect([task.actualStart, task.actualDuration]).toEqual([jan(5), 2])
  })
})

// ---------------------------------------------------------------------------
// CM-20 .. CM-25 -- the TaskVisual group
// ---------------------------------------------------------------------------

describe('EditDocument (PI-9) -- CM-20 to CM-25, the TaskVisual group', () => {
  const shaped = (shapeKind: string, milestone: boolean, visual: Record<string, unknown> = {}) =>
    documentOf({
      tasks: [taskOf({ uid: 1, name: 'Design', start: jan(5), finish: jan(9), milestone })],
      taskGroups: [groupOf({ id: 'g1' })],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf({ taskUid: 1, shapeKind, ...visual })],
    })

  it('FR-083 must not let a shape change cross between SH-1 .. SH-4 and SH-5', () => {
    // MUST NOT, both ways: a task with a span turned into a milestone has
    // nowhere to put its finish, and a milestone turned into a task has no span.
    expectRefusal(
      run(shaped('rectangle', false), {
        kind: 'setTaskVisualShapeKind',
        uid: 1,
        shapeKind: 'milestone',
      }),
      'FR-083',
    )
    expectRefusal(
      run(shaped('milestone', true), {
        kind: 'setTaskVisualShapeKind',
        uid: 1,
        shapeKind: 'rectangle',
      }),
      'FR-083',
    )
  })

  it('SP-2 changes the shape inside SH-1 .. SH-4, and PR-18 leaves Task.milestone alone', () => {
    // PR-18 (MUST): `TaskVisual.shapeKind` decides the drawing only. The boolean
    // that goes to the exchange partner does not follow it.
    const next = accepted(
      run(shaped('rectangle', false), {
        kind: 'setTaskVisualShapeKind',
        uid: 1,
        shapeKind: 'endpointSpan',
      }),
    )
    expect(visualIn(next, 1).shapeKind).toBe('endpointSpan')
    expect(taskIn(next, 1).milestone).toBe(false)
  })

  it('FR-078 lets the glyph of a milestone be chosen and cleared', () => {
    // PR-17: the glyph is read only while `shapeKind` is `'milestone'`, and it
    // stays changeable after the milestone has been placed.
    const document = shaped('milestone', true)
    const set = accepted(
      run(document, { kind: 'setTaskVisualMilestoneGlyph', uid: 1, glyph: 'diamond' }),
    )
    expect(visualIn(set, 1).milestoneGlyph).toBe('diamond')
    const cleared = accepted(run(set, { kind: 'setTaskVisualMilestoneGlyph', uid: 1, glyph: null }))
    expect(visualIn(cleared, 1).milestoneGlyph).toBeNull()
  })

  it('FR-007 must not let the fill and the outline be transparent at once', () => {
    // MUST NOT: nothing would be left to carry the shape. P-19 spells
    // transparent; `null` is a different thing -- it means no colour was chosen
    // and the theme decides.
    // ⛔ Which rule id the refusal names is NOT decided: FR-007 states the MUST
    // NOT and IV-9 of table T-220 states the same combination as a document
    // invariant, and nothing says which of the two a refusal cites. This case
    // therefore asserts the refusal alone -- flipping the expectation onto
    // whichever id the unit happens to use would make the test agree with the
    // code instead of with the specification. Reported for a ruling.
    expect(
      run(shaped('rectangle', false), {
        kind: 'setTaskVisualColors',
        uid: 1,
        fillColor: 'transparent',
        strokeColor: 'transparent',
      }).ok,
    ).toBe(false)
    // One of the two transparent is a legitimate choice of CL-1.
    const outlined = accepted(
      run(shaped('rectangle', false), {
        kind: 'setTaskVisualColors',
        uid: 1,
        fillColor: 'transparent',
        strokeColor: 'blue',
      }),
    )
    expect([visualIn(outlined, 1).fillColor, visualIn(outlined, 1).strokeColor]).toEqual([
      'transparent',
      'blue',
    ])
  })

  it('FR-007 sends both colours back to null, so they follow the theme again', () => {
    // "Choose no colour and it follows the theme colour" -- CM-23 is the way
    // back from an override that no longer moves with `themeHue`.
    const document = shaped('rectangle', false, { fillColor: 'blue', strokeColor: 'black' })
    const next = accepted(run(document, { kind: 'resetTaskVisualColors', uid: 1 }))
    expect(visualIn(next, 1).fillColor).toBeNull()
    expect(visualIn(next, 1).strokeColor).toBeNull()
  })

  it('CL-2 writes the line weight and lets it be cleared', () => {
    const set = accepted(
      run(shaped('rectangle', false), { kind: 'setTaskVisualLineWeight', uid: 1, lineWeight: 'thin' }),
    )
    expect(visualIn(set, 1).lineWeight).toBe('thin')
    const cleared = accepted(
      run(set, { kind: 'setTaskVisualLineWeight', uid: 1, lineWeight: null }),
    )
    expect(visualIn(cleared, 1).lineWeight).toBeNull()
  })

  it('FR-002 keeps null as the automatic placement, and stores an anchor a person moved', () => {
    // ⛔ Which of the nine points a given `nameAnchor` names is NOT decided --
    // FR-002 fixes the count and the three alignments and nothing maps the
    // numbers, so these cases assert only what the specification settles: the
    // default is automatic, and an explicit placement is kept.
    const document = shaped('rectangle', false)
    const placed = accepted(
      run(document, { kind: 'setTaskVisualNamePlacement', uid: 1, nameAnchor: 4, nameAlign: 'left' }),
    )
    expect(visualIn(placed, 1).nameAnchor).toBe(4)
    expect(visualIn(placed, 1).nameAlign).toBe('left')
    const automatic = accepted(
      run(placed, { kind: 'setTaskVisualNamePlacement', uid: 1, nameAnchor: null, nameAlign: null }),
    )
    expect(visualIn(automatic, 1).nameAnchor).toBeNull()
  })

  it('AT-98 refuses an anchor outside the nine points', () => {
    // The bound is stated as the column's type (an integer 0 .. 8) rather than
    // as a MUST NOT of FR-002, so this case asserts the refusal and not which
    // rule id carries it.
    expect(
      run(shaped('rectangle', false), {
        kind: 'setTaskVisualNamePlacement',
        uid: 1,
        nameAnchor: 9,
        nameAlign: null,
      }).ok,
    ).toBe(false)
  })
})

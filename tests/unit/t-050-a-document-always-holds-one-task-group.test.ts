// Unit tests: a document always holds at least one task group.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { paragraphsOf, unbroken } from '../contract/spec-table'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { DocumentStamp } from '../../src/entity/document-model/document-stamp/document-stamp'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type {
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
} from '../../src/entity/document-model/schedule/schedule'
import {
  planDocumentChange,
  planDocumentReplacement,
  type ChangePlan,
  type ReplacementPlan,
  type WriteMoment,
} from '../../src/use-case/apply-document-change/document-change-plan'
import type {
  ChangeStep,
  DocumentCommand,
  HeldDocument,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import displayWords from '../../src/adapter/screen-renderer/display-words.json'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const INVARIANT = (() => {
  const found = paragraphsOf(REQUIREMENTS).find((one) =>
    one.includes('文書は、`TaskGroup` を必ず 1 つ以上持つこと'),
  )
  if (found === undefined) {
    throw new Error('01-04-requirements.md no longer states the invariant of table T-050')
  }
  return found
})()

// Spec: T-050, FR-038
const DICTIONARY_ROW_WORD = (() => {
  const found = displayWords.defaultNames.find((one) => one.use === 'taskGroup')
  if (found === undefined) throw new Error('the dictionary has no defaultNames entry for `taskGroup`')
  return found
})()

describe('table T-050 -- the manuscript the cases below rest on', () => {
  it('still asks for one task group, at L1, named from the dictionary', () => {
    expect(INVARIANT).toContain('（MUST）')
    expect(INVARIANT).toContain('`L1`')
    expect(INVARIANT).toContain('`defaultNames`')
    expect(INVARIANT).toContain('`FR-038`')
    expect(INVARIANT).toContain('2 つ目の語を作ってはならない')
    expect(INVARIANT).toContain('最後の 1 つのタスクグループの削除を拒んではならない')
    expect(INVARIANT).toContain('経路ごとに書き写してはならない')
  })

  it('has exactly one word for a task group in the dictionary, spelled alike in both', () => {
    expect(displayWords.defaultNames.filter((one) => one.use === 'taskGroup')).toHaveLength(1)
    // Why: the owner ruled that the word keeps one spelling even on a Japanese
    // screen, so ja and en must match.
    expect(DICTIONARY_ROW_WORD.text.ja).toBe(DICTIONARY_ROW_WORD.text.en)
  })
})

const DEFAULT_SETTINGS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out
})()

// Why: every nullable column of T-058 is spelled null, because a column left
// undefined reads as held to anything that asks.
const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  name: null,
  derivedFromTaskUid: null,
  order: 0,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
  ...part,
})

const taskOf = (uid: number, name: string | null): Task =>
  ({
    uid,
    parentTaskUid: null,
    wbsOrder: null,
    name,
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
  }) as unknown as Task

const memberOf = (taskUid: number, taskGroupId: string): TaskGroupMember => ({
  taskUid,
  taskGroupId,
})

const STAMP: DocumentStamp = {
  scheduleUpdatedAt: '2026-09-01T00:00:00Z',
  lastEditedBy: 'user',
  settingsUpdatedAt: '2026-09-01T00:00:00Z',
  fileSavedAt: null,
}

const documentOf = (schedule: Partial<Schedule>, settings: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
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
    documentSettings: { ...DEFAULT_SETTINGS, ...settings } as unknown as DocumentSettings,
    documentStamp: STAMP,
    changeLog: [],
  }) as unknown as Document

const EMPTY_OF_TASK_GROUPS = documentOf({})

const ONE_TASK_GROUP = documentOf({
  taskGroups: [groupOf({ id: 'g1', name: 'the only row' })],
  tasks: [taskOf(1, 'on the only row')],
  taskGroupMembers: [memberOf(1, 'g1')],
})

const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const LIMITS = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

const planOf = (document: Document, commands: readonly DocumentCommand[]): ChangePlan =>
  planDocumentChange({
    defaultTaskGroupName: DICTIONARY_ROW_WORD.text.en,
    document,
    expectedStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedAt: '2026-09-01T01:00:00Z',
  })

const accepted = (plan: ChangePlan): Extract<ChangePlan, { ok: true }> => {
  expect(plan.ok).toBe(true)
  if (!plan.ok) throw new Error('the plan was refused')
  return plan
}

const settled = (plan: ReplacementPlan): Extract<ReplacementPlan, { ok: true }> => {
  expect(plan.ok).toBe(true)
  if (!plan.ok) throw new Error('the replacement was refused')
  return plan
}

// Spec: T-050, FR-004, FR-038, AT-54, FR-058
const holdsTheRequiredTaskGroup = (document: Document): TaskGroup => {
  const taskGroups = document.schedule.taskGroups
  expect(taskGroups).toHaveLength(1)
  const taskGroup = taskGroups[0]!
  // Why: L1 is asserted as a null parent, because FR-004 derives the depth from
  // the parent.
  expect(taskGroup.parentId).toBeNull()
  expect(taskGroup.name).toBe(DICTIONARY_ROW_WORD.text.en)
  expect(taskGroup.name).toBe(DICTIONARY_ROW_WORD.text.ja)
  expect(taskGroup.derivedFromTaskUid).toBeNull()
  expect(Number.isInteger(taskGroup.order)).toBe(true)
  return taskGroup
}

// Spec: T-050, FR-032, CD-2, WS-4
describe('table T-050 -- deleting the last task group', () => {
  it('is not refused', () => {
    const plan = planOf(ONE_TASK_GROUP, [{ kind: 'deleteTaskGroup', taskGroupId: 'g1', newTaskGroupId: 'fresh-task-group' }])
    expect(plan.ok).toBe(true)
  })

  it('leaves the document holding one task group at L1, named from the dictionary', () => {
    const plan = accepted(planOf(ONE_TASK_GROUP, [{ kind: 'deleteTaskGroup', taskGroupId: 'g1', newTaskGroupId: 'fresh-task-group' }]))
    const taskGroup = holdsTheRequiredTaskGroup(plan.document)
    expect(taskGroup.id).not.toBe('g1')
    expect(plan.document.schedule.tasks).toHaveLength(0)
    expect(plan.document.schedule.taskGroupMembers).toHaveLength(0)
  })

  // Why: the FR-032 count is settled before a write reaches WS-3 (QN-1), so no value here
  // carries it; this case asserts only that the made task group holds nothing to count.
  it('carries no Task, so the count FR-032 asks about has nothing to pick up', () => {
    const plan = accepted(planOf(ONE_TASK_GROUP, [{ kind: 'deleteTaskGroup', taskGroupId: 'g1', newTaskGroupId: 'fresh-task-group' }]))
    const taskGroup = holdsTheRequiredTaskGroup(plan.document)
    expect(
      plan.document.schedule.taskGroupMembers.filter((one) => one.taskGroupId === taskGroup.id),
    ).toHaveLength(0)
  })

  it('moves the schedule instant, because a TaskGroup is schedule-group data', () => {
    const plan = accepted(planOf(ONE_TASK_GROUP, [{ kind: 'deleteTaskGroup', taskGroupId: 'g1', newTaskGroupId: 'fresh-task-group' }]))
    expect(plan.hasUpdatedSchedule).toBe(true)
  })

  it('gives the deleted task group back on ONE press of undo', () => {
    const plan = accepted(planOf(ONE_TASK_GROUP, [{ kind: 'deleteTaskGroup', taskGroupId: 'g1', newTaskGroupId: 'fresh-task-group' }]))
    expect(plan.history.done).toHaveLength(1)

    const held: HeldDocument = { document: plan.document, history: plan.history }
    const undone = undoEdit(held)
    expect(undone.undone).toBe(true)
    const back = undone.next.document.schedule
    expect(back.taskGroups.map((one) => one.id)).toEqual(['g1'])
    expect(back.tasks.map((one) => one.uid)).toEqual([1])
    // Why: a second undo must find nothing, so the delete and the create are one
    // unit and not two.
    expect(undoEdit(undone.next).undone).toBe(false)
  })

  it('leaves a document that already holds a task group exactly as it was', () => {
    // Why: the invariant is not a rebuild; a write that touched no task group
    // keeps the task groups as they were (WS-6).
    const plan = accepted(planOf(ONE_TASK_GROUP, [{ kind: 'setProjectTitle', title: 'B' }]))
    expect(plan.document.schedule.taskGroups).toEqual(ONE_TASK_GROUP.schedule.taskGroups)
  })
})

// Spec: T-050, RD-6, RD-1, RD-2
describe('table T-050 -- the roads that are not a delete', () => {
  it('RD-6: a document brought at startup with no task group gets one', () => {
    const plan = settled(
      planDocumentReplacement({
        defaultTaskGroupName: DICTIONARY_ROW_WORD.text.en,
        newTaskGroupId: 'fresh-task-group',
        held: { document: ONE_TASK_GROUP, history: EMPTY_HISTORY },
        expectedStamp: null,
        moment: CALM,
        call: { row: 'RD-6', document: EMPTY_OF_TASK_GROUPS },
      }),
    )
    holdsTheRequiredTaskGroup(plan.next.document)
  })

  it('RD-6: a document that already holds task groups comes back as the same reference', () => {
    // Why: WS-6 replaces one reference and RD-1 hands the given pair back when
    // nothing moved; a rule that rebuilt every document would break both.
    const plan = settled(
      planDocumentReplacement({
        defaultTaskGroupName: DICTIONARY_ROW_WORD.text.en,
        newTaskGroupId: 'fresh-task-group',
        held: { document: EMPTY_OF_TASK_GROUPS, history: EMPTY_HISTORY },
        expectedStamp: null,
        moment: CALM,
        call: { row: 'RD-6', document: ONE_TASK_GROUP },
      }),
    )
    expect(plan.next.document).toBe(ONE_TASK_GROUP)
  })

  it('RD-1: an undo that lands on a document with no task group still gets one', () => {
    // Why: such a document cannot reach the history once the invariant holds, so
    // it is built by hand: the rule must not depend on that.
    const history: EditHistory<ChangeStep> = {
      done: [{ step: { document: EMPTY_OF_TASK_GROUPS, commands: ['setProjectTitle'] }, sizeBytes: 1 }],
      undone: [],
    }
    const plan = settled(
      planDocumentReplacement({
        defaultTaskGroupName: DICTIONARY_ROW_WORD.text.en,
        newTaskGroupId: 'fresh-task-group',
        held: { document: ONE_TASK_GROUP, history },
        expectedStamp: null,
        moment: CALM,
        call: { row: 'RD-1' },
      }),
    )
    holdsTheRequiredTaskGroup(plan.next.document)
  })

  it('RD-2: a redo that lands on a document with no task group still gets one', () => {
    const history: EditHistory<ChangeStep> = {
      done: [],
      undone: [{ step: { document: EMPTY_OF_TASK_GROUPS, commands: ['setProjectTitle'] }, sizeBytes: 1 }],
    }
    const plan = settled(
      planDocumentReplacement({
        defaultTaskGroupName: DICTIONARY_ROW_WORD.text.en,
        newTaskGroupId: 'fresh-task-group',
        held: { document: ONE_TASK_GROUP, history },
        expectedStamp: null,
        moment: CALM,
        call: { row: 'RD-2' },
      }),
    )
    holdsTheRequiredTaskGroup(plan.next.document)
  })
})

// Unit tests for the invariant printed under table T-050 of
// docs/spec/01-04-requirements.md (利用者の指示 2026-09-01, ledger row D-175):
//
//   「文書は、`TaskGroup` を必ず 1 つ以上持つこと（MUST）」
//   「ある操作の結果として行が 0 になるときは、その操作の一部として、深さ `L1`
//     の行を 1 つ作ること（MUST）。名前は `FR-038` の辞書の `defaultNames` の
//     `row` の語とすること（MUST）」
//   「2 つ目の語を作ってはならない（MUST NOT）」
//   「取り消しの単位を分けてはならない（MUST NOT）…取り消し 1 回で消した行が
//     戻ること（MUST）」
//   「本規則は削除だけのものではない…経路ごとに書き写してはならない（MUST NOT）」
//   「最後の 1 行の削除を拒んではならない（MUST NOT）」
//   「`FR-032` が問う件数に、作られる 1 行を足してはならない（MUST NOT）」
//
// Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node in
// the specification; table T-218 of Chapter 7 gives them their place (TS-6,
// tests/unit/).
//
// ⭐ DRIVEN BY THE MANUSCRIPT, not by a copy of it. The paragraph itself is read
// out of docs/spec at load time and every premise the cases rest on is asserted
// against it first, so a manuscript that moves reaches this file rather than
// sliding past it. The word is taken from the ONE destination Chapter 6.2 gives
// the display words -- never spelled here, which is what the MUST NOT about a
// second word is for.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED HERE: the count FR-032 puts in front of
// a person. That question is settled before a write reaches WS-3 of table
// T-067 (`confirmationOwedBy`, table T-234's QN-1), so no value on this side
// can carry it. What IS asserted is the property that makes the MUST NOT
// holdable: the row this invariant makes carries no `Task` and no member, so
// there is nothing about it for a count of what disappears to pick up.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

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

// ---------------------------------------------------------------------------
// 1. The manuscript, read rather than copied.
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The one paragraph of docs/spec this whole file is about. */
const INVARIANT = (() => {
  const found = REQUIREMENTS.split('\n').find((line) =>
    line.includes('文書は、`TaskGroup` を必ず 1 つ以上持つこと'),
  )
  if (found === undefined) {
    throw new Error('01-04-requirements.md no longer states the invariant of table T-050')
  }
  return found
})()

/** The word the row takes, from the ONE destination Chapter 6.2 names. */
const DICTIONARY_ROW_WORD = (() => {
  const found = displayWords.defaultNames.find((one) => one.use === 'row')
  if (found === undefined) throw new Error('the dictionary has no defaultNames entry for `row`')
  return found
})()

describe('table T-050 -- the manuscript the cases below rest on', () => {
  it('still asks for one row, at L1, named from the dictionary', () => {
    expect(INVARIANT).toContain('（MUST）')
    // 「深さ `L1` の行を 1 つ作ること」
    expect(INVARIANT).toContain('`L1`')
    // 「名前は `FR-038` の辞書の `defaultNames` の `row` の語とすること」
    expect(INVARIANT).toContain('`defaultNames`')
    expect(INVARIANT).toContain('`FR-038`')
    // 「2 つ目の語を作ってはならない（MUST NOT）」
    expect(INVARIANT).toContain('2 つ目の語を作ってはならない')
    // 「最後の 1 行の削除を拒んではならない（MUST NOT）」
    expect(INVARIANT).toContain('最後の 1 行の削除を拒んではならない')
    // 「経路ごとに書き写してはならない（MUST NOT）」
    expect(INVARIANT).toContain('経路ごとに書き写してはならない')
  })

  it('has exactly one word for a row in the dictionary, spelled alike in both', () => {
    // ⛔ The MUST NOT about a second word is machine-visible here: the roster
    // the generator builds holds ONE entry whose `use` is `row`.
    expect(displayWords.defaultNames.filter((one) => one.use === 'row')).toHaveLength(1)
    // ⚠️ 「日本語で表示していても綴りは変えない」(利用者の裁定 2026-09-01).
    expect(DICTIONARY_ROW_WORD.text.ja).toBe(DICTIONARY_ROW_WORD.text.en)
  })
})

// ---------------------------------------------------------------------------
// 2. Fixtures. Every nullable column of table T-058 is spelled `null`, because
//    a column left `undefined` reads as "held" to anything that asks.
// ---------------------------------------------------------------------------

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

const groupOf = (part: Partial<TaskGroup> & { readonly id: string }): TaskGroup => ({
  parentId: null,
  label: null,
  derivedFromTaskUid: null,
  order: 0,
  isCollapsed: null,
  isHidden: null,
  color: null,
  height: null,
  ...part,
})

const taskOf = (uid: number, name: string | null): Task =>
  ({
    uid,
    wbsParentUid: null,
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

const memberOf = (taskUid: number, groupId: string): TaskGroupMember => ({
  taskUid,
  groupId,
  stackOrder: null,
})

const STAMP: DocumentStamp = {
  scheduleUpdatedUtc: '2026-09-01T00:00:00Z',
  lastEditedBy: 'user',
  settingsUpdatedUtc: '2026-09-01T00:00:00Z',
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

/** ⛔ The state the invariant forbids: a document with no row at all. */
const EMPTY_OF_ROWS = documentOf({})

/** One row, one task on it -- the last row a person can delete. */
const ONE_ROW = documentOf({
  taskGroups: [groupOf({ id: 'g1', label: 'the only row' })],
  tasks: [taskOf(1, 'on the only row')],
  taskGroupMembers: [memberOf(1, 'g1')],
})

const CALM: WriteMoment = { gestureInFlight: false, editingInPlace: false, deliveringNotices: false }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const LIMITS = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

const planOf = (document: Document, commands: readonly DocumentCommand[]): ChangePlan =>
  planDocumentChange({
    document,
    readStamp: document.documentStamp,
    commands,
    moment: CALM,
    history: EMPTY_HISTORY,
    historyLimits: HISTORY_LIMITS,
    settingsLimits: LIMITS,
    editedBy: 'user',
    updatedUtc: '2026-09-01T01:00:00Z',
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

/** What the invariant asks of any document a road settles on. */
const holdsTheRequiredRow = (document: Document): TaskGroup => {
  const rows = document.schedule.taskGroups
  // 「行を 1 つ作ること」 -- one, not two (MUST NOT: 2 つ目の語を作ってはならない).
  expect(rows).toHaveLength(1)
  const row = rows[0]!
  // 「深さ `L1`」 -- and the depth is DERIVED: FR-004 takes it from the parent,
  // so a row with no parent cannot stand anywhere else.
  expect(row.parentId).toBeNull()
  // 「名前は `FR-038` の辞書の `defaultNames` の `row` の語とすること」.
  expect(row.label).toBe(DICTIONARY_ROW_WORD.text.en)
  expect(row.label).toBe(DICTIONARY_ROW_WORD.text.ja)
  // AT-54 / FR-058: a row holds a name OR a derivation source, never neither.
  expect(row.derivedFromTaskUid).toBeNull()
  expect(Number.isInteger(row.order)).toBe(true)
  return row
}

// ---------------------------------------------------------------------------
// 3. The road a delete takes (FR-032).
// ---------------------------------------------------------------------------

describe('table T-050 -- deleting the last row', () => {
  it('is not refused', () => {
    // 「最後の 1 行の削除を拒んではならない（MUST NOT）」 -- 拒むと、その行に載る
    // `Task` ごと消す道が無くなる.
    const plan = planOf(ONE_ROW, [{ kind: 'deleteTaskGroup', groupId: 'g1' }])
    expect(plan.ok).toBe(true)
  })

  it('leaves the document holding one row at L1, named from the dictionary', () => {
    const plan = accepted(planOf(ONE_ROW, [{ kind: 'deleteTaskGroup', groupId: 'g1' }]))
    const row = holdsTheRequiredRow(plan.document)
    // ⛔ NOT THE ROW THAT WAS DELETED. The one the invariant made is a new row,
    // and everything CD-2 takes with the old one is gone.
    expect(row.id).not.toBe('g1')
    expect(plan.document.schedule.tasks).toHaveLength(0)
    expect(plan.document.schedule.taskGroupMembers).toHaveLength(0)
  })

  it('carries no Task, so the count FR-032 asks about has nothing to pick up', () => {
    // 「`FR-032` が問う件数に、作られる 1 行を足してはならない（MUST NOT）」 --
    // the question is about what disappears, and this row is not one of them.
    const plan = accepted(planOf(ONE_ROW, [{ kind: 'deleteTaskGroup', groupId: 'g1' }]))
    const row = holdsTheRequiredRow(plan.document)
    expect(
      plan.document.schedule.taskGroupMembers.filter((one) => one.groupId === row.id),
    ).toHaveLength(0)
  })

  it('moves the schedule instant, because a TaskGroup is schedule-group data', () => {
    const plan = accepted(planOf(ONE_ROW, [{ kind: 'deleteTaskGroup', groupId: 'g1' }]))
    expect(plan.hasMovedSchedule).toBe(true)
  })

  it('gives the deleted row back on ONE press of undo', () => {
    // 「取り消しの単位を分けてはならない（MUST NOT）。消したことと作ったことは
    // 1 つの操作であり、取り消し 1 回で消した行が戻ること（MUST）」
    const plan = accepted(planOf(ONE_ROW, [{ kind: 'deleteTaskGroup', groupId: 'g1' }]))
    // WS-4 pushed exactly ONE step for the whole operation.
    expect(plan.history.done).toHaveLength(1)

    const held: HeldDocument = { document: plan.document, history: plan.history }
    const undone = undoEdit(held)
    expect(undone.undone).toBe(true)
    const back = undone.next.document.schedule
    expect(back.taskGroups.map((one) => one.id)).toEqual(['g1'])
    expect(back.tasks.map((one) => one.uid)).toEqual([1])
    // And the step it walked over is the only one there was, so a SECOND press
    // has nothing left to give back -- the two are not two units.
    expect(undoEdit(undone.next).undone).toBe(false)
  })

  it('leaves a document that already holds a row exactly as it was', () => {
    // ⚠️ The invariant is not a rebuild. WS-6 replaces ONE reference (MUST),
    // and a write that changed nothing about the rows must not mint a new
    // schedule just by passing this rule.
    const plan = accepted(planOf(ONE_ROW, [{ kind: 'setProjectTitle', title: 'B' }]))
    expect(plan.document.schedule.taskGroups).toEqual(ONE_ROW.schedule.taskGroups)
  })
})

// ---------------------------------------------------------------------------
// 4. The other roads (「本規則は削除だけのものではない」).
// ---------------------------------------------------------------------------

describe('table T-050 -- the roads that are not a delete', () => {
  it('RD-6: a document brought at startup with no row gets one', () => {
    const plan = settled(
      planDocumentReplacement({
        held: { document: ONE_ROW, history: EMPTY_HISTORY },
        readStamp: null,
        moment: CALM,
        call: { row: 'RD-6', document: EMPTY_OF_ROWS },
      }),
    )
    holdsTheRequiredRow(plan.next.document)
  })

  it('RD-6: a document that already holds rows comes back as the same reference', () => {
    // ⛔ WS-6 replaces ONE reference (MUST), and RD-1 hands the very pair it was
    // given straight back when nothing moved. A rule that rebuilt every
    // document on the way past would take that away from both.
    const plan = settled(
      planDocumentReplacement({
        held: { document: EMPTY_OF_ROWS, history: EMPTY_HISTORY },
        readStamp: null,
        moment: CALM,
        call: { row: 'RD-6', document: ONE_ROW },
      }),
    )
    expect(plan.next.document).toBe(ONE_ROW)
  })

  it('RD-1: an undo that lands on a document with no row still gets one', () => {
    // ⚠️ A document with no row cannot be pushed onto the history once the
    // invariant holds -- this case builds one by hand precisely because the
    // rule may not depend on that. 「本規則は削除だけのものではない」.
    const history: EditHistory<ChangeStep> = {
      done: [{ step: { document: EMPTY_OF_ROWS, commands: ['setProjectTitle'] }, sizeBytes: 1 }],
      undone: [],
    }
    const plan = settled(
      planDocumentReplacement({
        held: { document: ONE_ROW, history },
        readStamp: null,
        moment: CALM,
        call: { row: 'RD-1' },
      }),
    )
    holdsTheRequiredRow(plan.next.document)
  })

  it('RD-2: a redo that lands on a document with no row still gets one', () => {
    const history: EditHistory<ChangeStep> = {
      done: [],
      undone: [{ step: { document: EMPTY_OF_ROWS, commands: ['setProjectTitle'] }, sizeBytes: 1 }],
    }
    const plan = settled(
      planDocumentReplacement({
        held: { document: ONE_ROW, history },
        readStamp: null,
        moment: CALM,
        call: { row: 'RD-2' },
      }),
    )
    holdsTheRequiredRow(plan.next.document)
  })
})

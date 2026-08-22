// Unit tests for UF-15 -- EditDocument's Resource and Assignment aggregate,
// which owns CM-40 to CM-45 of table T-108.
//
// ⚠️ Same standing as tests/unit/use-case.test.ts: Chapter 9 does not admit
// Unit as a TEST_LEVEL, so table T-218 of Chapter 7 gives these their place
// (TS-6, tests/unit/, written by whoever implemented the unit).
//
// Every expectation below is taken from the specification and from nowhere
// else -- FR-008 (作る・改名する・就ける・解く), FR-099 (名簿と 2 つの消し方),
// CD-5 of table T-050 (what a deleted 担当者 takes with it), UN-15 of table
// T-027, and the attribute table of _assets/fig-erd-detail.md (AT-20, AT-85 to
// AT-96). Chapter 1.9 requires a test that verifies a requirement pointing at
// a table to be driven by fixed data copied from that table.
//
// ⚠️ 解除（CM-45, unassignResource）と 削除（CM-42, deleteResource）は別の
// 操作である。表 T-108 が名前を分けているので、テストも分けて置く。

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import type { Assignment, Resource, Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  ChangeStep,
  DocumentCommand,
  SettingsLimits,
  WriteMoment,
} from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
// ⚠️ Chapter 5.3 (MUST NOT): nothing outside `edit-document/` imports
// `edit-resource.ts` itself. `edit-document.ts` is the public entry.
import { editResource, type ResourceCommand } from '../../src/use-case/edit-document/edit-document'

// AT-85 to AT-91. ⚠️ Every nullable column is spelled out, `null` included --
// leaving one `undefined` reads as "set" and would hide a column the aggregate
// wrote that FR-008 forbids it to write.
const resourceOf = (uid: number, name: string | null, part: Partial<Resource> = {}): Resource => ({
  uid,
  name,
  resourceKind: 1,
  isCostResource: false,
  calendarUid: null,
  carry: {},
  carryElements: [],
  ...part,
})

// AT-92 to AT-96. `taskUid` and `resourceUid` are nullable (RL-14 / RL-15 are
// 0..n ─ 0..1, because the partner XSD makes both minOccurs="0").
const assignmentOf = (
  uid: number,
  taskUid: number | null,
  resourceUid: number | null,
): Assignment => ({
  uid,
  taskUid,
  resourceUid,
  carry: {},
  carryElements: [],
})

// AT-24 to AT-44, every nullable column spelled `null`.
const taskOf = (uid: number, name: string): Task => ({
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
})

interface DocumentParts {
  readonly uidHighWaterMark?: number
  readonly tasks?: readonly Task[]
  readonly resources?: readonly Resource[]
  readonly assignments?: readonly Assignment[]
}

// A whole Document is far more than these cases read, so the fixture carries
// the keys the aggregate actually touches. Same idiom as use-case.test.ts.
const documentOf = (part: DocumentParts = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'A',
        statusDate: null,
        themeHue: 214,
        startDate: null,
        // AT-20: 発番済みの `uid` の最大値。100 sits far above every uid the
        // fixtures below place, so a numbering that reads the roster instead
        // of this mark cannot pass by accident.
        uidHighWaterMark: part.uidHighWaterMark ?? 100,
      },
      calendars: [],
      tasks: part.tasks ?? [],
      resources: part.resources ?? [],
      assignments: part.assignments ?? [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      rulerHeight: 48,
      canvasPadding: 10,
      rowTitlePanelWidth: 170,
      propertyPanelWidth: 280,
      pinnedGroupIds: [],
      pinnedRowMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollGroupId: null,
      exportPngScale: 1,
      dependencyVisible: true,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

// Runs a command the specification says must be accepted, and hands back the
// document so the next command can be chained onto it.
const accept = (document: Document, command: ResourceCommand): Document => {
  const result = editResource(document, command)
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.refusals.map((r) => `${r.command}/${r.rule}: ${r.what}`).join(' | '))
  }
  return result.document
}

const uidsOf = (rows: readonly { readonly uid: number }[]) => rows.map((row) => row.uid)

describe('EditDocument (UF-15) -- 担当者を作る、就ける、解く（FR-008）', () => {
  it('FR-008 makes a new 担当者 a work resource (MUST)', () => {
    const document = accept(documentOf(), { kind: 'createResource', name: 'yamada' })
    expect(document.schedule.resources).toHaveLength(1)
    // AT-87 codes `Resource/Type` as 0 = 材料 / 1 = 作業 / 2 = 費用, and FR-008
    // says 「新しく作る担当者は作業資源として作ること（MUST）」-- FR-059 puts
    // only work resources on the assignee label, so any other kind makes a
    // 担当者 whose name never appears on the schedule.
    expect(document.schedule.resources[0]!.resourceKind).toBe(1)
    expect(document.schedule.resources[0]!.name).toBe('yamada')
  })

  it('FR-008 numbers a new 担当者 from Project.uidHighWaterMark, not from the roster (MUST)', () => {
    const document = documentOf({ uidHighWaterMark: 100, resources: [resourceOf(7, 'a')] })
    const first = accept(document, { kind: 'createResource', name: 'b' })
    // AT-20 is the highest uid ever issued and 「`Task` に限らない」, so the
    // next one is 101. 8 -- the largest uid actually in the roster -- is what
    // FR-001 forbids (「実在する `UID` の最大値から採ってはならない（MUST NOT）」),
    // because undo frees uids and redo would then hand the same one out twice.
    expect(uidsOf(first.schedule.resources)).toEqual([7, 101])
    expect(first.schedule.project.uidHighWaterMark).toBe(101)
    // The mark has to advance with it, or the second create repeats 101 and
    // breaks IV-1 (primary keys unique within their array).
    const second = accept(first, { kind: 'createResource', name: 'c' })
    expect(uidsOf(second.schedule.resources)).toEqual([7, 101, 102])
    expect(second.schedule.project.uidHighWaterMark).toBe(102)
  })

  it('FR-008 numbers a new 割当 from the same high water mark (CM-44, MUST)', () => {
    const document = documentOf({
      uidHighWaterMark: 100,
      tasks: [taskOf(3, 'T')],
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b')],
      assignments: [assignmentOf(50, 3, 7)],
    })
    // 「新しい `Resource` と `Assignment` の `uid` も `Project.uidHighWaterMark`
    // に従って採ること（MUST）」-- 51 would be the roster's own maximum.
    const next = accept(document, { kind: 'createAssignment', taskUid: 3, resourceUid: 8 })
    expect(next.schedule.assignments).toHaveLength(2)
    expect(next.schedule.assignments[1]).toMatchObject({ uid: 101, taskUid: 3, resourceUid: 8 })
    expect(next.schedule.project.uidHighWaterMark).toBe(101)
  })

  it('FR-008 refuses a second 割当 of the same Task and Resource pair (MUST NOT)', () => {
    const document = documentOf({
      uidHighWaterMark: 100,
      tasks: [taskOf(3, 'T'), taskOf(4, 'U')],
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b')],
      assignments: [assignmentOf(50, 3, 7)],
    })
    const again = editResource(document, { kind: 'createAssignment', taskUid: 3, resourceUid: 7 })
    expect(again.ok).toBe(false)
    // 「同じ `Task` と同じ `Resource` の組の割当を 2 つ作ってはならない（MUST NOT）」
    // -- MG-5 of table T-032 already folds the merge side into one, and the
    // screen side must not come out differently.
    if (!again.ok) expect(again.refusals[0]!.rule).toBe('FR-008')
    expect(document.schedule.assignments).toHaveLength(1)
    // ⚠️ What is banned is the PAIR. The same Task with another 担当者, and the
    // same 担当者 on another Task, are both ordinary.
    expect(
      accept(document, { kind: 'createAssignment', taskUid: 3, resourceUid: 8 }).schedule
        .assignments,
    ).toHaveLength(2)
    expect(
      accept(document, { kind: 'createAssignment', taskUid: 4, resourceUid: 7 }).schedule
        .assignments,
    ).toHaveLength(2)
  })

  it('FR-008 renames a 担当者 and writes none of the columns it may not edit (MUST NOT)', () => {
    const document = documentOf({
      resources: [
        // A document that came in from a partner tool may well carry these.
        resourceOf(7, 'a', { resourceKind: 1, isCostResource: true, calendarUid: 5 }),
        resourceOf(8, 'b'),
      ],
    })
    const next = accept(document, { kind: 'setResourceName', uid: 7, name: 'z' })
    // 「編集できるのは担当者の名前と割当先だけである。資源の種類・費用資源かどうか
    // ・暦・割当率を編集してはならない（MUST NOT）」-- 資源管理 is out of scope
    // (SO-8 of table T-002).
    expect(next.schedule.resources[0]).toMatchObject({
      uid: 7,
      name: 'z',
      resourceKind: 1,
      isCostResource: true,
      calendarUid: 5,
    })
    // CM-41 names one 担当者; the rest of the roster is not its business.
    expect(next.schedule.resources[1]!.name).toBe('b')
    // AT-86 allows the name to be `null`, so clearing it is a legitimate state.
    expect(
      accept(document, { kind: 'setResourceName', uid: 7, name: null }).schedule.resources[0]!.name,
    ).toBeNull()
  })

  it('FR-008 unassigns exactly one pair and keeps the 担当者 (CM-45, MUST)', () => {
    const document = documentOf({
      tasks: [taskOf(3, 'T'), taskOf(4, 'U')],
      resources: [resourceOf(7, 'a')],
      assignments: [assignmentOf(50, 3, 7), assignmentOf(51, 4, 7)],
    })
    const next = accept(document, { kind: 'unassignResource', taskUid: 3, resourceUid: 7 })
    // 「割当を解除しても担当者そのものは残すこと（MUST）」-- and CM-45 unassigns
    // one pair, so the same 担当者's other 割当 stays where it is.
    expect(uidsOf(next.schedule.assignments)).toEqual([51])
    expect(uidsOf(next.schedule.resources)).toEqual([7])
    // 解除 takes nothing else with it: the Task keeps standing.
    expect(uidsOf(next.schedule.tasks)).toEqual([3, 4])
  })

  it('FR-008 does not sweep up the 担当者 that the last 解除 left unreferenced (MUST NOT)', () => {
    const document = documentOf({
      tasks: [taskOf(3, 'T')],
      resources: [resourceOf(7, 'a')],
      assignments: [assignmentOf(50, 3, 7)],
    })
    const next = accept(document, { kind: 'unassignResource', taskUid: 3, resourceUid: 7 })
    expect(next.schedule.assignments).toHaveLength(0)
    // 「参照されなくなった担当者を自動で消してはならない（MUST NOT）」-- else the
    // name has to be typed again every time a 割当 is redone. FR-099 is the
    // deliberate entrance for getting rid of it.
    expect(next.schedule.resources.map((r) => r.name)).toEqual(['a'])
  })
})

describe('EditDocument (UF-15) -- 名簿から消す（FR-099 と表 T-050 の CD-5）', () => {
  it('T-050 CD-5 takes the 割当 of a deleted 担当者 and never the Tasks', () => {
    const document = documentOf({
      tasks: [taskOf(3, 'T'), taskOf(4, 'U')],
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b')],
      assignments: [assignmentOf(50, 3, 7), assignmentOf(51, 4, 7), assignmentOf(52, 3, 8)],
    })
    const next = accept(document, { kind: 'deleteResource', uids: [7] })
    expect(uidsOf(next.schedule.resources)).toEqual([8])
    // CD-5: 一緒に消えるのは「その担当者を指す割当」だけ。Assignment 52 points
    // at 担当者 8 and survives.
    expect(uidsOf(next.schedule.assignments)).toEqual([52])
    // ⚠️ CD-5: 「タスクは消えない —— 担当が外れるだけである」。
    expect(uidsOf(next.schedule.tasks)).toEqual([3, 4])
  })

  it('FR-099 deletes the 担当者 the caller named, and only those (CM-42)', () => {
    const document = documentOf({
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b'), resourceOf(9, 'c')],
    })
    // 「選んだ担当者を消すこと（MUST）」
    const next = accept(document, { kind: 'deleteResource', uids: [7, 9] })
    expect(uidsOf(next.schedule.resources)).toEqual([8])
  })

  it('FR-099 sweeps only the 担当者 that no 割当 points at (CM-43, MUST)', () => {
    const document = documentOf({
      tasks: [taskOf(3, 'T')],
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b'), resourceOf(9, 'c')],
      assignments: [assignmentOf(50, 3, 8)],
    })
    // 「どの割当からも参照されていない担当者をまとめて消すこと（MUST）」
    const next = accept(document, { kind: 'deleteUnreferencedResources' })
    expect(uidsOf(next.schedule.resources)).toEqual([8])
    // The sweep is about the roster: nothing else moves.
    expect(uidsOf(next.schedule.assignments)).toEqual([50])
    expect(uidsOf(next.schedule.tasks)).toEqual([3])
  })

  it('FR-099 has no single command that clears the whole roster (MUST NOT)', () => {
    const document = documentOf({
      tasks: [taskOf(3, 'T'), taskOf(4, 'U')],
      resources: [resourceOf(7, 'a'), resourceOf(8, 'b')],
      assignments: [assignmentOf(50, 3, 7), assignmentOf(51, 4, 8)],
    })
    // 「一覧のすべてを 1 つの操作で消す入口を設けてはならない（MUST NOT）」--
    // すべて選んでから消せば同じことができ、入口を 2 つ置くと FR-029 に触れる。
    // CM-43 is the only command that names no 担当者, and on a roster where
    // every 担当者 is referenced it must take nothing at all.
    const swept = accept(document, { kind: 'deleteUnreferencedResources' })
    expect(uidsOf(swept.schedule.resources)).toEqual([7, 8])
    expect(uidsOf(swept.schedule.assignments)).toEqual([50, 51])
    // Emptying the roster stays possible, but only by naming every 担当者 --
    // which is 「すべて選んでから消せば同じことができ」.
    const named = accept(document, { kind: 'deleteResource', uids: [7, 8] })
    expect(named.schedule.resources).toHaveLength(0)
  })
})

describe('EditDocument (UF-15) -- 表 T-027 の UN-15', () => {
  const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }
  const CALM: WriteMoment = {
    gestureInFlight: false,
    editingInPlace: false,
    deliveringNotices: false,
  }
  const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }

  it('UN-15 puts every 担当者 and 割当 edit on the undo history', () => {
    const document = documentOf({
      uidHighWaterMark: 100,
      tasks: [taskOf(3, 'T')],
      resources: [resourceOf(7, 'a'), resourceOf(9, 'c')],
      assignments: [assignmentOf(50, 3, 7)],
    })
    // UN-15: 「担当者（資源）と割当の追加・改名（`FR-008`）と削除（`FR-099`）」--
    // that is all six rows CM-40 to CM-45, and each command below changes
    // something, so none of them can be a step-less no-op.
    const commands: readonly ResourceCommand[] = [
      { kind: 'createResource', name: 'new' },
      { kind: 'setResourceName', uid: 7, name: 'renamed' },
      { kind: 'deleteResource', uids: [9] },
      { kind: 'deleteUnreferencedResources' },
      { kind: 'createAssignment', taskUid: 3, resourceUid: 9 },
      { kind: 'unassignResource', taskUid: 3, resourceUid: 7 },
    ]
    for (const command of commands) {
      const plan = planDocumentChange({
        document,
        readStamp: document.documentStamp,
        commands: [command as DocumentCommand],
        moment: CALM,
        history: EMPTY_HISTORY,
        historyLimits: { maxSteps: 50, maxTotalSize: 64 * 1024 * 1024 },
        settingsLimits: LIMITS,
        editedBy: 'user',
        updatedUtc: '2026-08-17T01:00:00Z',
      })
      expect(plan.ok).toBe(true)
      expect(plan.ok && plan.history.done).toHaveLength(1)
    }
  })
})

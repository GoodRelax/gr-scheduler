// CR-826 (spec-only): a task not due yet is drawn without DG-1 or DG-2; the report still counts it (FR-133).

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { REQUIREMENTS, taskOf } from './cr-541-stage'
import {
  F,
  NOT_DUE,
  NOT_DUE_PARENT,
  ROOT_CAUSE,
  S,
  SUSPENDED_CHILD,
  after,
  dg1Count,
  diagnose,
  documentOf,
  drawn,
  dw1Document,
  markOf,
  parentDocument,
  statusOf,
  vcFindingsOf,
} from './cr-826-stage'

describe('CR-826 -- the sentences these cases are driven by', () => {
  it.each([
    '⛔ 予定の開始（`start`）の日が基準日より後で、まだ着手していない（`actualStart` が無い）`Task` に、`DG-1`（`?`）と `DG-2`（炎）を描いてはならない（MUST NOT） —— そのタスクは、残る状態のうち優先順の最も高いもの（`DG-3`、無ければ 表 T-021 の記号）で描く。',
    'マイルストーンも同じく予定の日（`start`）で比べる。',
    '日の比べ方は 表 T-312 の `VO-1` と同じとする（`FR-054`）。',
    '着手済みの `Task` は、開始が基準日より後でも今のまま描く。',
    '⛔ 外すのは日程表の印だけとし、診断の結果を変えてはならない（MUST NOT）',
    '⭐ `VO-1`・`VO-2` の「基準日より前」は日で比べること（MUST、`FR-054`） —— 予定が基準日の当日に落ちる行は、まだ記載漏れと読まない（利用者の判断）。',
    '⭐ 本表の条件は診断の結果であり、日程表に描くかは `FR-133` の STATEMENT が決める',
    '⚠️ 日程表に描く印ではない —— 予定の開始が基準日より後で未着手の `Task` も、本行は 表 T-315 の行を持つ',
    '⚠️ 紫を日程表に描くかは `FR-133` が決める —— 予定の開始が基準日より後で未着手の `Task` は、本表の範囲に数えるが、日程表に紫を描かない。',
  ])('the requirements still say: %s', (sentence) => {
    expect(REQUIREMENTS).toContain(sentence)
  })
})

const LONG = 200
const MILESTONE_LATE = 201
const MILESTONE_EARLY = 211
const MILESTONE_SAME = 221
const MILESTONE_DAY: ReadonlyMap<number, string> = new Map([
  [MILESTONE_LATE, F(6, 1)],
  [MILESTONE_EARLY, F(5, 14)],
  [MILESTONE_SAME, F(5, 21)],
])

// WHY: one milestone per document (MP-1 and MP-3 read every task group of the same depth); the long task starts first,
// so the milestone does not head its row, and finishes 06-30, so it is no predecessor: DW-3.
const dw3Document = (milestone: number): Document =>
  documentOf([
    {
      id: 'r0',
      parentId: null,
      tasks: [
        taskOf(LONG, { name: 'Long', start: S(5, 3), finish: F(6, 30) }),
        taskOf(milestone, { name: 'Milestone', start: MILESTONE_DAY.get(milestone), finish: MILESTONE_DAY.get(milestone), milestone: true }),
      ],
    },
  ])

describe('CR-826 FR-133 / DW-3 -- a milestone with no predecessor', () => {
  it('the premise: each milestone is a DW-3 wall and DG-1 in DX-8', () => {
    for (const uid of [MILESTONE_LATE, MILESTONE_EARLY, MILESTONE_SAME]) {
      const report = diagnose(dw3Document(uid))
      expect(report.walls.some((one) => one.row === 'DW-3' && one.causeUid === uid), `DW-3 for ${uid}`).toBe(true)
      expect(markOf(report, uid), `DX-8 for ${uid}`).toBe('DG-1')
      expect(report.unreliableCount).toBe(dg1Count(report))
    }
  })

  it('a DW-3 milestone dated after the status day has no drawn entry; the report still lists it as DG-1', () => {
    const document = dw3Document(MILESTONE_LATE)
    const report = diagnose(document)
    expect(drawn(document, report).has(MILESTONE_LATE)).toBe(false)
    expect(statusOf(document, report, MILESTONE_LATE)).toBe('DG-1')
  })

  it('a DW-3 milestone dated before the status day keeps DG-1', () => {
    const document = dw3Document(MILESTONE_EARLY)
    expect(drawn(document, diagnose(document)).get(MILESTONE_EARLY)).toBe('DG-1')
  })

  it('boundary: a DW-3 milestone dated on the status day keeps DG-1', () => {
    const document = dw3Document(MILESTONE_SAME)
    expect(drawn(document, diagnose(document)).get(MILESTONE_SAME)).toBe('DG-1')
  })
})

const PARENT = 300
const CHILD = 301
const LATE = 310
const ABSORBER = 311

// WHY: CHILD is enclosed by PARENT one task group above (IP-1), runs past its plan with no successor (DG-2, PARENT DG-3);
// LATE is late (PM-4) but ABSORBER, starting 06-28, takes the delay, so no push: DG-4.
const dueDocument = (): Document =>
  documentOf([
    { id: 'r0', parentId: null, tasks: [taskOf(PARENT, { name: 'Parent', start: S(5, 3), finish: F(6, 30) })] },
    { id: 'r1', parentId: 'r0', tasks: [taskOf(CHILD, { name: 'Child', start: S(5, 3), finish: F(5, 14) })] },
    {
      id: 'a0',
      parentId: null,
      tasks: [
        taskOf(LATE, { name: 'Late', start: S(5, 3), finish: F(5, 7) }),
        taskOf(ABSORBER, { name: 'Absorber', start: S(6, 28), finish: F(6, 30), dependencies: [after(LATE)] }),
      ],
    },
  ])

describe('CR-826 T-315 -- DG-2, DG-3 on due tasks are kept; DG-4 is never a drawn diagnosis row', () => {
  it('the premise: DX-8 has DG-2 for the child, DG-3 for the parent and DG-4 for the late task', () => {
    const report = diagnose(dueDocument())
    expect([markOf(report, CHILD), markOf(report, PARENT), markOf(report, LATE)]).toEqual(['DG-2', 'DG-3', 'DG-4'])
  })

  it('a due DG-2 task and a due DG-3 task keep their rows', () => {
    const document = dueDocument()
    const marks = drawn(document, diagnose(document))
    expect(marks.get(CHILD)).toBe('DG-2')
    expect(marks.get(PARENT)).toBe('DG-3')
  })

  it('DG-4 never appears in the drawn rows', () => {
    const document = dueDocument()
    const marks = drawn(document, diagnose(document))
    expect(marks.has(LATE)).toBe(false)
    expect([...marks.values()]).not.toContain('DG-4')
  })

  it('DG-4 never appears in the drawn rows of the DW-1 and DW-3 cases either', () => {
    for (const document of [dw1Document(), dw3Document(MILESTONE_LATE), dw3Document(MILESTONE_EARLY)]) {
      expect([...drawn(document, diagnose(document)).values()]).not.toContain('DG-4')
    }
  })

  it('a report that says DG-2 for a not-due childless task draws nothing for it (no DG-2, no DG-3 left)', () => {
    const document = dw1Document()
    const report = diagnose(document)
    const rewritten: DelayDiagnosticsReport = {
      ...report,
      markerStates: report.markerStates.map((one) => (one.uid === NOT_DUE ? { uid: one.uid, row: 'DG-2' as const } : one)),
    }
    expect(drawn(document, rewritten).has(NOT_DUE)).toBe(false)
  })
})

describe('CR-826 FR-133 -- a not-due DG-1 parent of a bottleneck is drawn with DG-3', () => {
  it('the premise without the cause: the child is DG-2 and the not-due parent is DG-3', () => {
    const report = diagnose(parentDocument(false))
    expect([markOf(report, SUSPENDED_CHILD), markOf(report, NOT_DUE_PARENT)]).toEqual(['DG-2', 'DG-3'])
  })

  it('the premise with the cause: DX-8 says DG-1 for the parent (priority 1) and DG-2 for the child', () => {
    const report = diagnose(parentDocument(true))
    expect(vcFindingsOf(report, ROOT_CAUSE).length).toBeGreaterThan(0)
    expect([markOf(report, SUSPENDED_CHILD), markOf(report, NOT_DUE_PARENT)]).toEqual(['DG-2', 'DG-1'])
  })
})

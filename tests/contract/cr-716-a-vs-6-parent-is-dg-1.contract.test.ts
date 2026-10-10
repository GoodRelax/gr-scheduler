// Contract cases for CR-716: a parent with a VS-6 finding takes DG-1 ('?') while diagnostics are shown.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { delayDiagnosticsReportRows, type DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { specTable, unbroken } from './spec-table'
import { REQUIREMENTS, taskGroupDocument, taskOf } from '../unit/cr-541-stage'

type Loose = Record<string, unknown>

function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return unbroken(cell)
}

// see S-487, FR-131
const TOLERANCE_KEY = 'parentProgressToleranceDays'

// WHY: May 2027 has no exception in the bundled calendar, which works Monday to Friday; 2027-05-21 is a Friday.
const day = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
const S = (month: number, date: number): string => day(month, date, 8)
const F = (month: number, date: number): string => day(month, date, 17)
const STATUS = F(5, 21)

// see AT-46
const FS = 1
const after = (uid: number): Loose => ({ predecessorUid: uid, linkType: FS, lag: 0, lagFormat: 7, carry: {}, carryElements: [] })

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly tasks: readonly Loose[]
}

function documentOf(rows: readonly Row[], tolerance: number): Document {
  const raw = taskGroupDocument(rows.map((row) => ({ id: row.id, parentId: row.parentId })))
  raw.schedule.project.statusDate = STATUS
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.project[TOLERANCE_KEY] = tolerance
  raw.schedule.tasks = rows.flatMap((row) => row.tasks)
  raw.schedule.taskGroupMembers = rows.flatMap((row) => row.tasks.map((task) => ({ taskUid: task['uid'], groupId: row.id })))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

// WHY: one task per task group; every child task group sits under its parent's task group; `alone` tasks sit in task groups of their own.
const familyOf = (parent: Loose, children: readonly Loose[], alone: readonly Loose[] = []): readonly Row[] => [
  { id: 'r0', parentId: null, tasks: [parent] },
  ...children.map((child, index) => ({ id: `r${index + 1}`, parentId: 'r0', tasks: [child] })),
  ...alone.map((one, index) => ({ id: `a${index}`, parentId: null, tasks: [one] })),
]

function diagnose(document: Document): DelayDiagnosticsReport {
  return scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))
}

const markOf = (report: DelayDiagnosticsReport, uid: number): string | undefined =>
  report.markerStates.find((one) => one.uid === uid)?.row
const findingCount = (report: DelayDiagnosticsReport, row: string, uid: number): number =>
  report.findings.filter((one) => one.row === row && one.uid === uid).length
const dg1Count = (report: DelayDiagnosticsReport): number => report.markerStates.filter((one) => one.row === 'DG-1').length

const inProgress = (uid: number, name: string, start: string, finish: string, stop: string, extra: Loose = {}): Loose =>
  taskOf(uid, { name, start, finish, actualStart: start, stop, percentComplete: 30, resumeValid: true, ...extra })

const G = 400
const C1 = 401
const C2 = 402
const SUCCESSOR_ONE = 410
const SUCCESSOR_TWO = 411

// WHY: G's point is 05-06 and the leaves' points are 05-12 and 05-19, so 4 working days (Thu, Fri, Mon, Tue) lie outside.
// Each leaf runs past its plan with nothing after it, so each is DG-2 and G, without VS-6, is DG-3.
const LEFT_DAYS = 4
const bottleneckBelow = (tolerance: number): Document =>
  documentOf(
    familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 5)), [
      inProgress(C1, 'Early leaf', S(5, 3), F(5, 14), F(5, 11), { parentTaskUid: G }),
      inProgress(C2, 'Late leaf', S(5, 17), F(5, 28), F(5, 18), { parentTaskUid: G }),
    ]),
    tolerance,
  )

// WHY: the same left-of-its-work parent, but its planned end 05-14 is past (DL-1), so G is late (DG-4) without VS-6.
// Each leaf is followed by a task that starts on 06-30, so the delay is absorbed and no leaf pushes a terminal (DQ-4 is 0): no bottleneck.
const lateParent = (tolerance: number): Document =>
  documentOf(
    familyOf(
      inProgress(G, 'Parent', S(5, 3), F(5, 14), F(5, 5)),
      [
        inProgress(C1, 'Early leaf', S(5, 3), F(5, 14), F(5, 11), { parentTaskUid: G }),
        inProgress(C2, 'Second leaf', S(5, 10), F(5, 14), F(5, 12), { parentTaskUid: G }),
      ],
      [
        taskOf(SUCCESSOR_ONE, { name: 'After one', start: S(6, 30), finish: F(7, 2), dependencies: [after(C1)] }),
        taskOf(SUCCESSOR_TWO, { name: 'After two', start: S(6, 30), finish: F(7, 2), dependencies: [after(C2)] }),
      ],
    ),
    tolerance,
  )

const DEFAULT_TOLERANCE = 1
const WIDE_TOLERANCE = 30

describe('CR-716 -- the sentences these cases are driven by', () => {
  it.each([
    ['T-315', 'DG-1', '条件', '表 T-310 の指摘を持つ、表 T-311 の `VS-6` の指摘を持つ、表 T-312 の `VO-3`（先行の側）か `VO-5` の指摘を持つ、または 表 T-316 が紫とする'],
    ['T-315', 'DG-1', '状態', '信用できない・要修正 / `unreliable`'],
    ['T-315', 'DG-1', '優先順', '1'],
    ['T-315', 'DG-3', '優先順', '3'],
    ['T-315', 'DG-4', '優先順', '4'],
    ['T-311', 'VS-6', '観点', '本行の親は 表 T-315 の `DG-1`（`?`）とする'],
    ['T-311', 'VS-6', '観点', '親の点が配下の点から外れていれば、その親に出る `!!` や `!` も、イナズマ線のその段の凹みも、信用できない点の上の読みである（利用者の判断）'],
    ['T-311', 'VS-6', '観点', '判じるのは本行のまま（許す日数 `S-487` を超えたときだけ）'],
    ['T-311', 'VS-6', '観点', '進捗の刈り取りの遅れの分は印を出さない'],
    ['T-347', 'DT-1', '値', '疑義・記載漏れ（`DX-3` の指摘を持ち `DG-1` を持たない'],
    ['T-347', 'DT-1', '値', '`VS-6` の親は `DG-1` に出る'],
    ['T-347', 'DT-7', '値', '`VS-6` は 表 T-311 の自分の告げる語で告げる'],
    ['T-317', 'DX-7', '中身', '紫（`DG-1`）の `Task` の数'],
    ['T-317', 'DX-8', '中身', '`Task` の `uid` ごとの 表 T-315 の行（どれにも当たらなければ空）'],
  ] as const)('%s %s (%s) still says: %s', (table, id, heading, sentence) => {
    expect(cellOf(table, id, heading)).toContain(sentence)
  })

  it.each([
    '表 T-311 の `VS-6` が許す日数は、文書の `Project.parentProgressToleranceDays`（`_assets/tbl-settings.md` の 表 T-216 の `S-487`）とすること（MUST）。',
    '各 `Task` の進捗マーカーを 表 T-315 の状態のうち優先順の最も高いもので描くこと。',
    '紫を最上位に置くのは、信用できない数字の上に出た赤や `!!` は誤りでありうるからである。',
    '親の進み具合の点が配下の点から外れる疑義（表 T-311 の `VS-6`）も紫に入れる',
    '疑義と記載漏れは、表 T-315 が `DG-1` とするもの（表 T-311 の `VS-6`、表 T-312 の `VO-3` の先行と `VO-5`）のほかはマーカーを塗らない',
    '⛔ `GRS` は断定しない。マーカーを塗らない —— ただし `VS-6` の親は 表 T-315 の `DG-1` とする（理由はその行）。',
  ])('the requirements still say: %s', (sentence) => {
    expect(REQUIREMENTS).toContain(sentence)
  })
})

describe('CR-716 DX-8 / T-315 DG-1 / T-311 VS-6 -- a parent with a VS-6 finding is DG-1', () => {
  it('the premise: without VS-6 the parent is DG-3 (a bottleneck below) and the leaves are DG-2', () => {
    const report = diagnose(bottleneckBelow(WIDE_TOLERANCE))
    expect(findingCount(report, 'VS-6', G)).toBe(0)
    expect([markOf(report, G), markOf(report, C1), markOf(report, C2)]).toEqual(['DG-3', 'DG-2', 'DG-2'])
  })

  it('a VS-6 parent that would otherwise be DG-3 is DG-1; its leaves keep DG-2', () => {
    const report = diagnose(bottleneckBelow(DEFAULT_TOLERANCE))
    expect(findingCount(report, 'VS-6', G)).toBe(1)
    expect([markOf(report, G), markOf(report, C1), markOf(report, C2)]).toEqual(['DG-1', 'DG-2', 'DG-2'])
  })

  it('the premise: without VS-6 the parent is DG-4 (late, DL-1) and no leaf is a bottleneck', () => {
    const report = diagnose(lateParent(WIDE_TOLERANCE))
    expect(findingCount(report, 'VS-6', G)).toBe(0)
    expect(report.bottlenecks).toEqual([])
    expect([markOf(report, G), markOf(report, C1), markOf(report, C2)]).toEqual(['DG-4', 'DG-4', 'DG-4'])
  })

  it('a VS-6 parent that would otherwise be DG-4 is DG-1; its leaves keep DG-4', () => {
    const report = diagnose(lateParent(DEFAULT_TOLERANCE))
    expect(findingCount(report, 'VS-6', G)).toBe(1)
    expect([markOf(report, G), markOf(report, C1), markOf(report, C2)]).toEqual(['DG-1', 'DG-4', 'DG-4'])
  })

  it('no wall is raised for the VS-6 parent: the doubt reaches the parent alone', () => {
    for (const make of [bottleneckBelow, lateParent]) {
      const report = diagnose(make(DEFAULT_TOLERANCE))
      expect(report.walls.filter((one) => one.causeUid === G)).toEqual([])
      expect(report.findings.filter((one) => one.row === 'VS-6').map((one) => one.uid)).toEqual([G])
    }
  })
})

describe('CR-716 S-487 -- widening the tolerance until VS-6 disappears removes the DG-1', () => {
  it.each([0, 1, LEFT_DAYS - 1])('tolerance %i working days is under the %i days outside: VS-6 stands and the parent is DG-1', (tolerance) => {
    const report = diagnose(bottleneckBelow(tolerance))
    expect(findingCount(report, 'VS-6', G)).toBe(1)
    expect(markOf(report, G)).toBe('DG-1')
  })

  it.each([LEFT_DAYS, LEFT_DAYS + 1, WIDE_TOLERANCE])('tolerance %i working days reaches the days outside: VS-6 is gone and the parent is DG-3 again', (tolerance) => {
    const report = diagnose(bottleneckBelow(tolerance))
    expect(findingCount(report, 'VS-6', G)).toBe(0)
    expect(markOf(report, G)).toBe('DG-3')
  })

  it.each([
    ['bottleneck below', bottleneckBelow],
    ['late parent', lateParent],
  ] as const)('%s: at every tolerance from 0 to 12 the parent is DG-1 exactly when VS-6 stands on it', (_name, make) => {
    for (let tolerance = 0; tolerance <= 12; tolerance += 1) {
      const report = diagnose(make(tolerance))
      expect(markOf(report, G) === 'DG-1', `tolerance ${tolerance}`).toBe(findingCount(report, 'VS-6', G) > 0)
    }
  })

  it('the late parent returns to DG-4 once VS-6 is gone', () => {
    expect(markOf(diagnose(lateParent(WIDE_TOLERANCE)), G)).toBe('DG-4')
  })
})

describe('CR-716 T-311 -- the other rows of T-311 do not make DG-1', () => {
  // WHY: P ends on 05-10 by actual and the successor T started on 05-07, so the dates break the link's direction (VS-4); P is finished, so VS-3 and VO-3 stay quiet.
  const VS_4 = (): Document =>
    documentOf(
      [
        {
          id: 'r0',
          parentId: null,
          tasks: [
            taskOf(300, { name: 'Done', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 10), percentComplete: 100 }),
            inProgress(301, 'Early start', S(5, 10), F(5, 14), F(5, 11), { actualStart: S(5, 7), dependencies: [after(300)] }),
          ],
        },
      ],
      DEFAULT_TOLERANCE,
    )

  // WHY: the actual start 05-24 is after the status date 05-21 (VS-5).
  const VS_5 = (): Document =>
    documentOf([{ id: 'r0', parentId: null, tasks: [inProgress(310, 'Started ahead', S(5, 24), F(5, 28), F(5, 25))] }], DEFAULT_TOLERANCE)

  // WHY: the predecessor has not started and the FS successor has (VS-3); the finding stands on the successor.
  const VS_3 = (): Document =>
    documentOf(
      [
        {
          id: 'r0',
          parentId: null,
          tasks: [
            taskOf(320, { name: 'Not started', start: S(5, 3), finish: F(5, 7) }),
            inProgress(321, 'Started', S(5, 10), F(5, 14), F(5, 11), { dependencies: [after(320)] }),
          ],
        },
      ],
      DEFAULT_TOLERANCE,
    )

  it.each([
    ['VS-4', VS_4, 301],
    ['VS-5', VS_5, 310],
    ['VS-3', VS_3, 321],
  ] as const)('%s: the finding stands on the task and the task is not DG-1', (row, make, uid) => {
    const report = diagnose(make())
    expect(findingCount(report, row, uid)).toBe(1)
    expect(markOf(report, uid)).not.toBe('DG-1')
  })

  it.each([
    ['VS-4', VS_4, 301],
    ['VS-5', VS_5, 310],
    ['VS-3', VS_3, 321],
  ] as const)('DT-1 %s: the task is told as doubtful, not as DG-1', (_row, make, uid) => {
    const document = make()
    const rows = delayDiagnosticsReportRows(diagnose(document), document.schedule)
    expect(rows.find((one) => one.taskUid === uid)?.status).toBe('doubtful')
  })
})

describe('CR-716 DX-7 -- the count not analyzed equals the number of DG-1 tasks', () => {
  // WHY: a finished predecessor 330 and a milestone 331 with no actualFinish: every predecessor is done, so VO-5 stands and the milestone is DG-1 as well.
  const withMilestone = (tolerance: number): Document =>
    documentOf(
      familyOf(
        inProgress(G, 'Parent', S(5, 3), F(5, 14), F(5, 5)),
        [
          inProgress(C1, 'Early leaf', S(5, 3), F(5, 14), F(5, 11), { parentTaskUid: G }),
          inProgress(C2, 'Second leaf', S(5, 10), F(5, 14), F(5, 12), { parentTaskUid: G }),
        ],
        [
          taskOf(SUCCESSOR_ONE, { name: 'After one', start: S(6, 30), finish: F(7, 2), dependencies: [after(C1)] }),
          taskOf(SUCCESSOR_TWO, { name: 'After two', start: S(6, 30), finish: F(7, 2), dependencies: [after(C2)] }),
          taskOf(330, { name: 'Done', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 7), percentComplete: 100 }),
          taskOf(331, { name: 'Gate', milestone: true, start: S(5, 10), finish: S(5, 10), dependencies: [after(330)] }),
        ],
      ),
      tolerance,
    )

  it.each([
    ['one VS-6 parent (bottleneck below)', bottleneckBelow(DEFAULT_TOLERANCE), 1],
    ['one VS-6 parent (late parent)', lateParent(DEFAULT_TOLERANCE), 1],
    ['the tolerance widened: none', bottleneckBelow(WIDE_TOLERANCE), 0],
    ['a VS-6 parent and a VO-5 milestone', withMilestone(DEFAULT_TOLERANCE), 2],
    ['the same with the tolerance widened: the milestone alone', withMilestone(WIDE_TOLERANCE), 1],
  ] as const)('%s: unreliableCount is the number of DG-1 tasks (%i)', (_name, document, expected) => {
    const report = diagnose(document)
    expect(dg1Count(report)).toBe(expected)
    expect(report.unreliableCount).toBe(expected)
  })
})

describe('CR-716 T-347 DT-1 / DT-7 -- the report row of a VS-6 parent', () => {
  it.each([
    ['bottleneck below', bottleneckBelow],
    ['late parent', lateParent],
  ] as const)('%s: the parent is a DG-1 row (not doubtful) whose reason carries the VS-6 finding', (_name, make) => {
    const document = make(DEFAULT_TOLERANCE)
    const rows = delayDiagnosticsReportRows(diagnose(document), document.schedule)
    const row = rows.find((one) => one.taskUid === G)
    expect(row?.status).toBe('DG-1')
    expect(row?.reason.kind).toBe('unreliable')
    const findings = row?.reason.kind === 'unreliable' ? row.reason.findings : []
    expect(findings.map((one) => one.row)).toContain('VS-6')
  })

  it('the leaves are listed on their own statuses, not as DG-1', () => {
    const document = bottleneckBelow(DEFAULT_TOLERANCE)
    const rows = delayDiagnosticsReportRows(diagnose(document), document.schedule)
    expect(rows.filter((one) => one.status === 'DG-1').map((one) => one.taskUid)).toEqual([G])
    expect(rows.find((one) => one.taskUid === C1)?.status).toBe('DG-2')
  })

  it('the tolerance widened: the parent is a DG-3 row and no row carries VS-6', () => {
    const document = bottleneckBelow(WIDE_TOLERANCE)
    const rows = delayDiagnosticsReportRows(diagnose(document), document.schedule)
    expect(rows.find((one) => one.taskUid === G)?.status).toBe('DG-3')
    expect(rows.filter((one) => one.status === 'DG-1')).toEqual([])
  })

  it('the report counts the row once: DT-1 gives a task one row, and the VS-6 parent is not also listed doubtful', () => {
    const document = bottleneckBelow(DEFAULT_TOLERANCE)
    const rows = delayDiagnosticsReportRows(diagnose(document), document.schedule)
    expect(rows.filter((one) => one.taskUid === G)).toHaveLength(1)
  })
})

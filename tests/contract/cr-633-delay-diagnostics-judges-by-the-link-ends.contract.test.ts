// Contract cases for CR-633: Delay Diagnostics judges by the two ends a link binds and by the remaining days.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import type { DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { specTable, unbroken } from './spec-table'
import { rowDocument, taskOf } from '../unit/cr-541-stage'

// see AT-46
const FF = 0
const FS = 1
const SF = 2
const SS = 3

type Loose = Record<string, unknown>

function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return unbroken(cell)
}

const day = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
const S = (month: number, date: number): string => day(month, date, 8)
const F = (month: number, date: number): string => day(month, date, 17)

const after = (uid: number, linkType: number): Loose => ({
  predecessorUid: uid,
  linkType,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly tasks: readonly Loose[]
}

function documentOf(statusDate: string, rows: readonly Row[]): Document {
  const raw = rowDocument(rows.map((row) => ({ id: row.id, parentId: row.parentId })))
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = rows.flatMap((row) => row.tasks)
  raw.schedule.taskGroupMembers = rows.flatMap((row) => row.tasks.map((task) => ({ taskUid: task['uid'], groupId: row.id })))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

const flatOf = (statusDate: string, tasks: readonly Loose[]): Document =>
  documentOf(statusDate, [{ id: 'r0', parentId: null, tasks }])

function diagnose(document: Document): DelayDiagnosticsReport {
  return scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))
}

const findingCount = (report: DelayDiagnosticsReport, row: string, uid: number): number =>
  report.findings.filter((one) => one.row === row && one.uid === uid).length
const markOf = (report: DelayDiagnosticsReport, uid: number): string | undefined =>
  report.markerStates.find((one) => one.uid === uid)?.row
const terminalDelayOf = (report: DelayDiagnosticsReport, uid: number): number | undefined =>
  report.terminalPushOuts.find((one) => one.uid === uid)?.terminalDelayDays

const P = 300
const Q = 301
const T = 302
const G = 303
const M = 304
const C1 = 305
const STATUS = F(5, 21)

// WHY: P is planned 05-03 .. 05-07 and the successor 05-10 .. 05-14, so no planned date breaks any of the four link types.
const pairOf = (linkType: number, predecessor: Loose, successor: Loose): Document =>
  flatOf(STATUS, [
    taskOf(P, { name: 'Predecessor', start: S(5, 3), finish: F(5, 7), ...predecessor }),
    taskOf(T, { name: 'Successor', start: S(5, 10), finish: F(5, 14), dependencies: [after(P, linkType)], ...successor }),
  ])
const NOT_STARTED: Loose = {}
const STARTED: Loose = { actualStart: S(5, 3), stop: F(5, 4), percentComplete: 40 }
const SUCCESSOR_DONE: Loose = { actualStart: S(5, 10), actualFinish: F(5, 14), percentComplete: 100 }
const SUCCESSOR_STARTED: Loose = { actualStart: S(5, 10), stop: F(5, 11), percentComplete: 40 }

describe('CR-633 -- the rows these cases are driven by', () => {
  it.each([
    ['T-310', 'VC-13', '観点', 'FS と FF は先行が未完了、SS と SF は先行が未着手'],
    ['T-311', 'VS-3', '観点', 'FS か SS の依存で、先行が未着手なのに、後続が着手済み'],
    ['T-312', 'VO-1', '観点', 'FS は先行が完了、SS は先行が着手'],
    ['T-312', 'VO-3', '観点', '先行は 表 T-315 の `DG-1`（`?`）とし、ボトルネック（`DG-2`）としない'],
    ['T-312', 'VO-5', '観点', '「このマイルストーンは達成してるのでは？」'],
    ['T-313', 'BD-1', '何をするか', '着手済みで未完了は 基準日 ＋ 残りの日数 とし、`finish` より前にはしない'],
    ['T-313', 'BD-2', '何をするか', '課す日が `actualStart` より後のものを最早開始に使わない'],
    ['T-313', 'BD-2', '何をするか', '未着手の `Task` の最早開始は、基準日で押し上げない'],
    ['T-315', 'DG-1', '条件', '表 T-312 の `VO-3`（先行の側）か `VO-5` の指摘を持つ'],
    ['T-315', 'DG-2', '条件', '表 T-312 の `VO-3` の指摘を持たない'],
  ] as const)('%s %s still says: %s', (table, id, heading, sentence) => {
    expect(cellOf(table, id, heading)).toContain(sentence)
  })
})

describe('CR-633 T-310 VC-13 -- the successor is finished while the end the link binds has not happened', () => {
  it.each([
    ['FS, predecessor started, not finished', FS, STARTED, 1],
    ['FF, predecessor started, not finished', FF, STARTED, 1],
    ['SS, predecessor not started', SS, NOT_STARTED, 1],
    ['SF, predecessor not started', SF, NOT_STARTED, 1],
    ['SS, predecessor started, not finished (the link held)', SS, STARTED, 0],
    ['SF, predecessor started, not finished (the link held)', SF, STARTED, 0],
  ] as const)('VC-13 %s: %i finding on the successor', (_name, linkType, predecessor, count) => {
    expect(findingCount(diagnose(pairOf(linkType, predecessor, SUCCESSOR_DONE)), 'VC-13', T)).toBe(count)
  })
})

describe('CR-633 T-311 VS-3 -- only FS and SS bind the successor start', () => {
  it.each([
    ['FS', FS, 1],
    ['SS', SS, 1],
    ['FF', FF, 0],
    ['SF', SF, 0],
  ] as const)('VS-3 %s, predecessor not started, successor started: %i finding', (_name, linkType, count) => {
    expect(findingCount(diagnose(pairOf(linkType, NOT_STARTED, SUCCESSOR_STARTED)), 'VS-3', T)).toBe(count)
  })
})

describe('CR-633 T-312 VO-1 -- the successor was free to start when every start-binding end has happened', () => {
  it.each([
    ['SS, predecessor started', SS, STARTED, 1],
    ['FF, predecessor not started (FF binds no start)', FF, NOT_STARTED, 1],
    ['SF, predecessor not started (SF binds no start)', SF, NOT_STARTED, 1],
    ['FS, predecessor started, not finished', FS, STARTED, 0],
    ['SS, predecessor not started', SS, NOT_STARTED, 0],
  ] as const)('VO-1 %s: %i finding on the successor', (_name, linkType, predecessor, count) => {
    expect(findingCount(diagnose(pairOf(linkType, predecessor, {})), 'VO-1', T)).toBe(count)
  })
})

describe('CR-633 T-312 VO-3 / T-315 DG-1 / DG-2 -- a predecessor whose missing finish the successor shows', () => {
  // WHY: P (under G) has no actualFinish while its FS successor T has started (VO-3). P also drives Q, which has
  // not started, so P pushes Q's end and would be a bottleneck by DQ-4 alone.
  const make = (): Document =>
    documentOf(STATUS, [
      {
        id: 'r0',
        parentId: null,
        tasks: [
          taskOf(G, { name: 'Group', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 }),
          taskOf(T, { name: 'Started', start: S(5, 10), finish: F(5, 14), dependencies: [after(P, FS)], ...SUCCESSOR_STARTED }),
          taskOf(Q, { name: 'Waiting', start: S(5, 10), finish: F(5, 12), dependencies: [after(P, FS)] }),
        ],
      },
      {
        id: 'r1',
        parentId: 'r0',
        tasks: [taskOf(P, { name: 'Unrecorded', wbsParentUid: G, start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 })],
      },
    ])

  it('VO-3 names P', () => {
    expect(findingCount(diagnose(make()), 'VO-3', P)).toBeGreaterThan(0)
  })

  it('DG-1: P is painted as unreliable', () => {
    expect(markOf(diagnose(make()), P)).toBe('DG-1')
  })

  it('DG-2 / DX-4: P is no bottleneck, so its WBS ancestor G is not DG-3', () => {
    const report = diagnose(make())
    expect(report.bottlenecks.map((one) => one.uid)).not.toContain(P)
    expect(markOf(report, G)).not.toBe('DG-3')
  })

  it('T-316: VO-3 raises no wall for P, and DX-7 counts P', () => {
    const report = diagnose(make())
    expect(report.walls.filter((one) => one.causeUid === P)).toEqual([])
    expect(report.unanalysedCount).toBeGreaterThanOrEqual(1)
  })
})

describe('CR-633 T-312 VO-5 / FR-136 -- a milestone whose predecessors are all done but which has no actualFinish', () => {
  const make = (milestone: Loose): Document =>
    flatOf(STATUS, [
      taskOf(P, { name: 'Done', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 7), percentComplete: 100 }),
      taskOf(M, { name: 'Gate', milestone: true, start: S(5, 10), finish: S(5, 10), dependencies: [after(P, FS)], ...milestone }),
    ])

  it('VO-5 names M and DG-1 paints it (not DG-4)', () => {
    const report = diagnose(make({}))
    expect(findingCount(report, 'VO-5', M)).toBe(1)
    expect(markOf(report, M)).toBe('DG-1')
  })

  it('T-316: no wall stands on M', () => {
    expect(diagnose(make({})).walls.filter((one) => one.causeUid === M)).toEqual([])
  })

  it('FR-136: the diagnosis does not write M\'s actualFinish', () => {
    const document = make({})
    diagnose(document)
    expect(document.schedule.tasks.find((one) => one.uid === M)?.actualFinish).toBeNull()
  })

  it('a milestone with a hand actualFinish has no VO-5 and is not DG-1', () => {
    const report = diagnose(make({ actualStart: S(5, 10), actualFinish: S(5, 10), percentComplete: 100 }))
    expect(findingCount(report, 'VO-5', M)).toBe(0)
    expect(markOf(report, M)).not.toBe('DG-1')
  })
})

describe('CR-633 T-313 BD-1 -- a started task ends the remaining days after the status date', () => {
  // WHY: 2027-06-04 is a Friday; the calendar works Monday to Friday. The task is the only one, so it is a terminal
  // and the terminal delay (DX-5) is the working days from its finish to its projected finish.
  const single = (statusDate: string, task: Loose): DelayDiagnosticsReport =>
    diagnose(flatOf(statusDate, [taskOf(T, { name: 'Work', percentComplete: 40, ...task })]))

  it('JDG-1150: 13 planned days, 6 done, status 06-04 -- ends 06-15, 9 past its 06-02 finish', () => {
    const report = single(F(6, 4), { start: S(5, 17), finish: F(6, 2), actualStart: S(5, 17), stop: F(5, 24) })
    expect(terminalDelayOf(report, T)).toBe(9)
  })

  it('JDG-1150: not started, 7 planned days, status 06-04 is day 1 -- ends 06-14 (DQ-2 0, DQ-3 9)', () => {
    const report = single(F(6, 4), { start: S(5, 24), finish: F(6, 1), percentComplete: 0 })
    expect(terminalDelayOf(report, T)).toBe(9)
    const entry = report.bottlenecks.find((one) => one.uid === T)
    expect(entry?.inheritedDelayDays).toBe(0)
    expect(entry?.selfDelayDays).toBe(9)
  })

  it('at least 1 day is left when the actual already passed the planned days', () => {
    const report = single(F(6, 4), { start: S(5, 17), finish: F(5, 19), actualStart: S(5, 17), stop: F(5, 21) })
    expect(terminalDelayOf(report, T)).toBe(13)
  })

  it('FR-011: with no stop the actual counts to the floor day (1 day), so 6 of 7 days remain -- ends 06-14', () => {
    const report = single(F(6, 4), { start: S(5, 31), finish: F(6, 8), actualStart: S(5, 31) })
    expect(terminalDelayOf(report, T)).toBe(4)
  })

  it('never before finish: 16 remaining days end 06-28, so the projection stays on the 06-30 finish', () => {
    const report = single(F(6, 4), { start: S(6, 1), finish: F(6, 30), actualStart: S(6, 1), stop: F(6, 8) })
    expect(terminalDelayOf(report, T)).toBe(0)
  })

  const suspended = (resume: Loose): DelayDiagnosticsReport =>
    single(F(5, 19), { start: S(5, 10), finish: F(5, 14), actualStart: S(5, 10), stop: F(5, 11), ...resume })

  it('PS-4: a resume after the status date counts the 3 remaining days from it -- ends 05-26', () => {
    expect(terminalDelayOf(suspended({ resume: S(5, 24) }), T)).toBe(8)
  })

  it('PS-4: a resume on a non-working day counts from the next working day', () => {
    expect(terminalDelayOf(suspended({ resume: S(5, 22) }), T)).toBe(8)
  })

  it.each([
    ['a resume before the status date', { resume: S(5, 17) }],
    ['PS-3, resumeValid false', { resume: S(5, 24), resumeValid: false }],
  ] as const)('%s is not read -- the status date + 3 days, 05-24', (_name, resume) => {
    expect(terminalDelayOf(suspended(resume), T)).toBe(6)
  })
})

describe('CR-633 T-313 BD-2 -- which bounds hold a started task', () => {
  it('an FS bound later than actualStart is not used: the successor carries DQ-2 0', () => {
    const report = diagnose(flatOf(F(5, 12), [
      taskOf(P, { name: 'Late', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 }),
      taskOf(T, { name: 'Early', start: S(5, 10), finish: F(5, 12), dependencies: [after(P, FS)], actualStart: S(5, 10), percentComplete: 20 }),
    ]))
    const entry = report.bottlenecks.find((one) => one.uid === T)
    expect(entry?.inheritedDelayDays).toBe(0)
    expect(entry?.selfDelayDays).toBe(2)
  })

  it('an FS bound on or before actualStart is used: the wait of 1 day is the predecessor\'s (DQ-2 1)', () => {
    const report = diagnose(flatOf(F(5, 12), [
      taskOf(P, { name: 'Slow', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 11), percentComplete: 100 }),
      taskOf(T, { name: 'Waited', start: S(5, 10), finish: F(5, 12), dependencies: [after(P, FS)], actualStart: S(5, 11), percentComplete: 20 }),
    ]))
    expect(report.bottlenecks.find((one) => one.uid === T)?.inheritedDelayDays).toBe(1)
  })

  it('an FF bound is used however early the successor started: the predecessor pushes 7 days', () => {
    const report = diagnose(flatOf(F(5, 12), [
      taskOf(P, { name: 'Lead', start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 }),
      taskOf(T, { name: 'Trail', start: S(5, 3), finish: F(5, 7), dependencies: [after(P, FF)], actualStart: S(5, 3), percentComplete: 20 }),
    ]))
    expect(report.bottlenecks.find((one) => one.uid === P)?.pushOutDays).toBe(7)
  })
})

describe('CR-633 FR-135 -- a milestone is never a WBS parent, even when wbsParentUid states it', () => {
  // WHY: C1 sits one row below the milestone M and names it as its parent; no bar on M's row encloses C1.
  const make = (): Document =>
    documentOf(F(5, 12), [
      { id: 'r0', parentId: null, tasks: [taskOf(M, { name: 'Gate', milestone: true, start: S(5, 10), finish: S(5, 10) })] },
      {
        id: 'r1',
        parentId: 'r0',
        tasks: [taskOf(C1, { name: 'Child', wbsParentUid: M, start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), percentComplete: 20 })],
      },
    ])

  it('VS-2 still tells the pair, and VC-11 does not judge M as a parent', () => {
    const report = diagnose(make())
    expect(findingCount(report, 'VS-2', M)).toBe(1)
    expect(findingCount(report, 'VC-11', M)).toBe(0)
  })

  it('T-318: C1 is derived, finds no candidate (VO-4) and stands a DW-2 wall', () => {
    const report = diagnose(make())
    expect(findingCount(report, 'VO-4', C1)).toBe(1)
    expect(report.walls.some((one) => one.row === 'DW-2' && one.causeUid === C1)).toBe(true)
  })

  it('DG-3: no bottleneck path climbs through M', () => {
    const report = diagnose(make())
    expect(report.bottlenecks.flatMap((one) => one.path)).not.toContain(M)
    expect(report.derivedWbsParents.map((one) => one.parentUid)).not.toContain(M)
  })
})

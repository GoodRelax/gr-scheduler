// CR-826 (spec-only): the two FR-133 MUST NOT clauses on a task not due yet, each pressed against diagnosedMarkerRowsOf.

import { describe, expect, it } from 'vitest'

import { REQUIREMENTS } from '../unit/cr-541-stage'
import {
  CAUSE,
  DUE_BEFORE,
  DUE_ON_STATUS_DAY,
  NOT_DUE,
  NOT_DUE_MILESTONE,
  NOT_DUE_PARENT,
  STARTED_EARLY,
  SUSPENDED_CHILD,
  dg1Count,
  diagnose,
  drawn,
  dw1Document,
  markOf,
  parentDocument,
  statusOf,
  vcFindingsOf,
} from '../unit/cr-826-stage'

const NOT_DRAWN_CLAUSE =
  '⛔ 予定の開始（`start`）の日が基準日より後で、まだ着手していない（`actualStart` が無い）`Task` に、`DG-1`（`?`）と `DG-2`（炎）を描いてはならない（MUST NOT）'
const REPORT_UNCHANGED_CLAUSE = '⛔ 外すのは日程表の印だけとし、診断の結果を変えてはならない（MUST NOT）'

describe('FR-133: ⛔ 予定の開始（`start`）の日が基準日より後で、まだ着手していない（`actualStart` が無い）`Task` に、`DG-1`（`?`）と `DG-2`（炎）を描いてはならない（MUST NOT）', () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(NOT_DRAWN_CLAUSE)
  })

  it('the premise: the cause carries a T-310 finding and every downstream task is DG-1 in DX-8', () => {
    const report = diagnose(dw1Document())
    expect(vcFindingsOf(report, CAUSE).length).toBeGreaterThan(0)
    for (const uid of [CAUSE, DUE_BEFORE, DUE_ON_STATUS_DAY, NOT_DUE, STARTED_EARLY, NOT_DUE_MILESTONE]) {
      expect(markOf(report, uid), `DX-8 for ${uid}`).toBe('DG-1')
    }
  })

  it('a task starting after the status day with no actualStart has no drawn entry', () => {
    const document = dw1Document()
    expect(drawn(document, diagnose(document)).has(NOT_DUE)).toBe(false)
  })

  it('a milestone dated after the status day is compared by its start and has no drawn entry', () => {
    const document = dw1Document()
    expect(drawn(document, diagnose(document)).has(NOT_DUE_MILESTONE)).toBe(false)
  })

  it('the cause and a task starting before the status day keep DG-1', () => {
    const document = dw1Document()
    const marks = drawn(document, diagnose(document))
    expect(marks.get(CAUSE)).toBe('DG-1')
    expect(marks.get(DUE_BEFORE)).toBe('DG-1')
  })

  it('boundary: a task starting on the status day itself keeps DG-1 (only a later day drops)', () => {
    const document = dw1Document()
    expect(drawn(document, diagnose(document)).get(DUE_ON_STATUS_DAY)).toBe('DG-1')
  })

  it('a task started early (actualStart set) keeps DG-1 although its start is after the status day', () => {
    const document = dw1Document()
    expect(drawn(document, diagnose(document)).get(STARTED_EARLY)).toBe('DG-1')
  })

  it('a not-due DG-1 parent of a bottleneck falls to the next remaining state, DG-3; the started child keeps DG-2', () => {
    const document = parentDocument(true)
    const marks = drawn(document, diagnose(document))
    expect(marks.get(NOT_DUE_PARENT)).toBe('DG-3')
    expect(marks.get(SUSPENDED_CHILD)).toBe('DG-2')
  })
})

describe('FR-133: ⛔ 外すのは日程表の印だけとし、診断の結果を変えてはならない（MUST NOT）', () => {
  it('the requirements still carry the clause', () => {
    expect(REQUIREMENTS).toContain(REPORT_UNCHANGED_CLAUSE)
  })

  it('DX-6: the DW-1 wall still stops the not-due tasks', () => {
    const report = diagnose(dw1Document())
    const wall = report.walls.find((one) => one.row === 'DW-1' && one.causeUid === CAUSE)
    expect(wall).toBeDefined()
    expect(wall?.stoppedUids).toEqual(expect.arrayContaining([NOT_DUE, NOT_DUE_MILESTONE, STARTED_EARLY, DUE_BEFORE]))
    expect(wall?.stoppedCount).toBe(wall?.stoppedUids.length)
  })

  it('DX-7: the unreliable count still counts the not-due tasks', () => {
    const report = diagnose(dw1Document())
    expect(report.unreliableCount).toBe(dg1Count(report))
    expect(report.unreliableCount).toBeGreaterThanOrEqual(6)
  })

  it('DX-8 and DT-1: the not-due tasks stay DG-1 in the marker states and the report table', () => {
    const document = dw1Document()
    const report = diagnose(document)
    for (const uid of [NOT_DUE, NOT_DUE_MILESTONE]) {
      expect(markOf(report, uid), `DX-8 for ${uid}`).toBe('DG-1')
      expect(statusOf(document, report, uid), `DT-1 for ${uid}`).toBe('DG-1')
    }
  })

  it('DT-1: the not-due parent drawn with DG-3 is still a DG-1 row of the report table', () => {
    const document = parentDocument(true)
    expect(statusOf(document, diagnose(document), NOT_DUE_PARENT)).toBe('DG-1')
  })

  it('reading the drawn marks leaves the report as it was', () => {
    const document = dw1Document()
    const report = diagnose(document)
    const before = JSON.stringify(report)
    drawn(document, report)
    expect(JSON.stringify(report)).toBe(before)
  })
})

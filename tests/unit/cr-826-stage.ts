// CR-826 (spec-only): the schedules the unit and contract cases of FR-133's not-due rule share.

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { delayDiagnosticsReportRows, type DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import { taskGroupDocument, taskOf } from './cr-541-stage'

export type Loose = Record<string, unknown>

// WHY: May 2027 has no exception in the bundled calendar, which works Monday to Friday; 2027-05-21 is a Friday.
export const day = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
export const S = (month: number, date: number): string => day(month, date, 8)
export const F = (month: number, date: number): string => day(month, date, 17)
export const STATUS = F(5, 21)

// see AT-46
export const FS = 1
export const after = (uid: number): Loose => ({ predecessorUid: uid, linkType: FS, linkLag: 0, lagFormat: 7, carry: {}, carryElements: [] })

export interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly tasks: readonly Loose[]
}

// WHY: a wide S-487 keeps VS-6 out of every case.
export const WIDE_TOLERANCE = 30

export function documentOf(rows: readonly Row[]): Document {
  const raw = taskGroupDocument(rows.map((row) => ({ id: row.id, parentId: row.parentId })))
  raw.schedule.project.statusDate = STATUS
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.project['parentTaskProgressToleranceDays'] = WIDE_TOLERANCE
  raw.schedule.tasks = rows.flatMap((row) => row.tasks)
  raw.schedule.taskGroupMembers = rows.flatMap((row) => row.tasks.map((task) => ({ taskUid: task['uid'], taskGroupId: row.id })))
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

export function diagnose(document: Document): DelayDiagnosticsReport {
  return scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))
}

export const drawn = (document: Document, report: DelayDiagnosticsReport): ReadonlyMap<number, string> =>
  scheduleEntry.diagnosedMarkerRowsOf(report, document.schedule)
export const markOf = (report: DelayDiagnosticsReport, uid: number): string | undefined =>
  report.markerStates.find((one) => one.uid === uid)?.row
export const dg1Count = (report: DelayDiagnosticsReport): number => report.markerStates.filter((one) => one.row === 'DG-1').length
export const vcFindingsOf = (report: DelayDiagnosticsReport, uid: number): readonly string[] =>
  report.findings.filter((one) => one.uid === uid && one.row.startsWith('VC-')).map((one) => one.row)
export const statusOf = (document: Document, report: DelayDiagnosticsReport, uid: number): string | undefined =>
  delayDiagnosticsReportRows(report, document.schedule).find((one) => one.taskUid === uid)?.status

export const CAUSE = 100
export const DUE_BEFORE = 101
export const DUE_ON_STATUS_DAY = 102
export const NOT_DUE = 103
export const STARTED_EARLY = 104
export const NOT_DUE_MILESTONE = 105

// WHY: the cause has actualFinish without actualStart (VC-6), so DW-1 makes its FS downstream purple: tasks starting
// before, on and after (Mon 05-24) the status day, one started early, and a milestone on 06-01.
export const dw1Document = (): Document =>
  documentOf([
    {
      id: 'r0',
      parentId: null,
      tasks: [
        taskOf(CAUSE, { name: 'Cause', start: S(5, 3), finish: F(5, 5), actualFinish: F(5, 5) }),
        taskOf(DUE_BEFORE, { name: 'Due before', start: S(5, 10), finish: F(5, 14), dependencies: [after(CAUSE)] }),
        taskOf(DUE_ON_STATUS_DAY, { name: 'Due on the status day', start: S(5, 21), finish: F(5, 28), dependencies: [after(CAUSE)] }),
        taskOf(NOT_DUE, { name: 'Not due', start: S(5, 24), finish: F(5, 28), dependencies: [after(CAUSE)] }),
        taskOf(STARTED_EARLY, {
          name: 'Started early',
          start: S(6, 1),
          finish: F(6, 4),
          actualStart: S(5, 17),
          stop: F(5, 18),
          percentComplete: 50,
          resumeValid: true,
          dependencies: [after(CAUSE)],
        }),
        taskOf(NOT_DUE_MILESTONE, { name: 'Not due milestone', start: F(6, 1), finish: F(6, 1), milestone: true, dependencies: [after(CAUSE)] }),
      ],
    },
  ])

export const ROOT_CAUSE = 400
export const NOT_DUE_PARENT = 401
export const SUSPENDED_CHILD = 402

// WHY: SUSPENDED_CHILD started early and resumes 06-28 (PS-4, BD-1), so it pushes itself (DG-2); NOT_DUE_PARENT encloses
// it (IP-1, DG-3) and follows ROOT_CAUSE (VC-6) by FS, so DW-1 makes it DG-1 in DX-8.
export const parentDocument = (withCause: boolean): Document =>
  documentOf([
    {
      id: 'a0',
      parentId: null,
      tasks: withCause ? [taskOf(ROOT_CAUSE, { name: 'Root cause', start: S(5, 3), finish: F(5, 5), actualFinish: F(5, 5) })] : [],
    },
    {
      id: 'r0',
      parentId: null,
      tasks: [
        taskOf(NOT_DUE_PARENT, {
          name: 'Not due parent',
          start: S(6, 1),
          finish: F(6, 30),
          dependencies: withCause ? [after(ROOT_CAUSE)] : [],
        }),
      ],
    },
    {
      id: 'r1',
      parentId: 'r0',
      tasks: [
        taskOf(SUSPENDED_CHILD, {
          name: 'Suspended child',
          start: S(6, 1),
          finish: F(6, 4),
          actualStart: S(5, 17),
          stop: F(5, 18),
          resume: S(6, 28),
          resumeValid: true,
          percentComplete: 50,
        }),
      ],
    },
  ])

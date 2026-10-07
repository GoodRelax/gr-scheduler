// CR-651: a parent whose progress point leaves the points of its work is told as a doubt (T-311 VS-6).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import type { CalendarDay, DelayDiagnosticsReport } from '../../src/entity/document-model/schedule/schedule'
import type { ChangeStep, DocumentCommand } from '../../src/use-case/apply-document-change/apply-document-change'
import { planDocumentChange } from '../../src/use-case/apply-document-change/document-change-plan'
import { editProject } from '../../src/use-case/edit-document/edit-document'
import { undoEdit } from '../../src/use-case/undo-edit/undo-edit'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowDocument, taskOf } from './cr-541-stage'

type Loose = Record<string, unknown>

function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return unbroken(cell)
}

interface SettingRow {
  readonly id: string
  readonly key?: string
  readonly default?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8')) as {
    blocks: { rows?: SettingRow[] }[]
  }
).blocks.flatMap((block) => block.rows ?? [])

function settingRow(id: string): SettingRow {
  const row = SETTING_ROWS.find((one) => one.id === id)
  if (row === undefined) throw new Error(`settings.json holds no row ${id}`)
  return row
}

// see S-487
const S_487_DEFAULT = ((): number => {
  const value = Number(settingRow('S-487').default?.num ?? Number.NaN)
  if (!Number.isInteger(value)) throw new Error('settings.json holds no integer default for S-487')
  return value
})()
const S_487_KEY = (settingRow('S-487').key ?? '').replace(/`/g, '')

// see CM-87
const CM_87_NAME = bare(cellOf('T-108', 'CM-87', '確定名')).replace(/`/g, '')

// see FR-073
// WHY: CR-651 E-11 raises the version to the day the change lands.
const SCHEMA_VERSION = '2026-10-04'

const TEMPLATE_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
  'utf8',
)
const EMPTY_DOCUMENT_TEXT = readFileSync(
  join(process.cwd(), 'src', 'framework', 'single-html-shell', 'empty-document.json'),
  'utf8',
)

// WHY: May 2027 has no exception in the bundled calendar, which works Monday to Friday; 2027-05-03 is a Monday.
const day = (month: number, date: number, hour: number): string =>
  `2027-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`
const S = (month: number, date: number): string => day(month, date, 8)
const F = (month: number, date: number): string => day(month, date, 17)
const D = (month: number, date: number): string => day(month, date, 0).slice(0, 10)

// WHY: 2027-05-21 is a Friday.
const STATUS = F(5, 21)
const STATUS_DAY = D(5, 21)

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly tasks: readonly Loose[]
}

function documentOf(rows: readonly Row[], tolerance: number = S_487_DEFAULT, statusDate: string = STATUS): Document {
  const raw = rowDocument(rows.map((row) => ({ id: row.id, parentId: row.parentId })))
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.project[S_487_KEY] = tolerance
  raw.schedule.tasks = rows.flatMap((row) => row.tasks)
  raw.schedule.taskGroupMembers = rows.flatMap((row) =>
    row.tasks.map((task) => ({ taskUid: task['uid'], groupId: row.id })),
  )
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

// WHY: one task per row, so no two bars share a row; every child row sits under its parent's row.
const familyOf = (parent: Loose, children: readonly Loose[]): readonly Row[] => [
  { id: 'r0', parentId: null, tasks: [parent] },
  ...children.map((child, index) => ({ id: `r${index + 1}`, parentId: 'r0', tasks: [child] })),
]

function diagnose(document: Document): DelayDiagnosticsReport {
  return scheduleEntry.diagnoseDelay(document, scheduleEntry.workingCalendarOf(document.schedule))
}

type Finding = DelayDiagnosticsReport['findings'][number]

const vs6Of = (report: DelayDiagnosticsReport): readonly Finding[] =>
  report.findings.filter((one) => one.row === 'VS-6')
const vs6On = (report: DelayDiagnosticsReport, uid: number): readonly Finding[] =>
  vs6Of(report).filter((one) => one.uid === uid)
const valuesOf = (finding: Finding | undefined): Loose =>
  ((finding as unknown as { values?: Loose } | undefined)?.values ?? {}) as Loose

// WHY: the seam does not fix whether a day value is the day text or a CalendarDay; both read as YYYY-MM-DD.
function dayText(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value.slice(0, 10)
  if (typeof value === 'object' && 'year' in (value as Loose)) return scheduleEntry.textOfDay(value as CalendarDay).slice(0, 10)
  return String(value)
}

function calendarDayOf(text: string): CalendarDay {
  const value = scheduleEntry.dayOf(text)
  if (value === null) throw new Error(`${text} is not a day`)
  return value
}

function withTolerance(document: Document, tolerance: number): Document {
  return {
    ...document,
    schedule: { ...document.schedule, project: { ...document.schedule.project, [S_487_KEY]: tolerance } },
  } as Document
}

const G = 400
const C1 = 401
const C2 = 402

const inProgress = (uid: number, name: string, start: string, finish: string, stop: string, extra: Loose = {}): Loose =>
  taskOf(uid, { name, start, finish, actualStart: start, stop, percentComplete: 30, resumeValid: true, ...extra })

// WHY: G's point is 05-06 (Thu, after its last day 05-05). The leaves' points are 05-12 (Wed) and 05-19 (Wed).
// From 05-06 to 05-12 lie 4 working days (Thu, Fri, Mon, Tue) and 6 calendar days -- the weekend sits in the gap.
const LEFT_PARENT = (tolerance: number): Document =>
  documentOf(
    familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 5)), [
      inProgress(C1, 'Early leaf', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: G }),
      inProgress(C2, 'Late leaf', S(5, 17), F(5, 28), F(5, 18), { wbsParentUid: G }),
    ]),
    tolerance,
  )
const LEFT_WORKING_DAYS = 4

// WHY: G's point is 05-20 (Thu). The leaves' points are 05-12 (Wed) and 05-13 (Thu).
// From 05-13 to 05-20 lie 5 working days (Thu, Fri, Mon, Tue, Wed) and 7 calendar days.
const RIGHT_PARENT = (tolerance: number): Document =>
  documentOf(
    familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 19)), [
      inProgress(C1, 'Leaf one', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: G }),
      inProgress(C2, 'Leaf two', S(5, 10), F(5, 28), F(5, 12), { wbsParentUid: G }),
    ]),
    tolerance,
  )
const RIGHT_WORKING_DAYS = 5

describe('CR-651 -- the rows these cases are driven by', () => {
  it.each([
    ['T-311', 'VS-6', '観点', '子を持たない子孫の点の最も左より `S-487` 稼働日を超えて左'],
    ['T-311', 'VS-6', '観点', '頂点を打たない子孫は基準日を点とする'],
    ['T-311', 'VS-6', '観点', '親が頂点を打たないときは判じない'],
    ['T-311', 'VS-6', '観点', '子を持つ子孫の点は数えない'],
    ['T-311', 'VS-6', '観点', '片方の日を含みもう片方を含まずに数える'],
    ['T-022', 'PL-3', '頂点', '`resume` < 基準日 なら `resume` に打つ'],
    ['T-022', 'PL-4', '頂点', '`start` < 基準日 なら `start` に打つ'],
    ['T-108', 'CM-87', '正', '`FR-131`'],
  ] as const)('%s %s still says: %s', (table, id, heading, sentence) => {
    expect(cellOf(table, id, heading)).toContain(sentence)
  })

  it('S-487 holds the key parentProgressToleranceDays with an integer default of at least 0', () => {
    expect(S_487_KEY).toBe('parentProgressToleranceDays')
    expect(S_487_DEFAULT).toBeGreaterThanOrEqual(0)
  })

  it('CM-87 is named setParentProgressTolerance in T-108', () => {
    expect(CM_87_NAME).toBe('setParentProgressTolerance')
  })
})

describe('CR-651 FR-014 T-022 -- progressPointDayOf answers the day the vertex is struck on', () => {
  const statusDay = (): CalendarDay => calendarDayOf(STATUS_DAY)
  const pointOf = (task: Loose): string | null => {
    const document = documentOf([{ id: 'r0', parentId: null, tasks: [taskOf(G, { name: 'One', ...task })] }])
    const found = document.schedule.tasks.find((one) => one.uid === G)
    if (found === undefined) throw new Error('the task did not decode')
    const seam = (scheduleEntry as unknown as { progressPointDayOf?: (task: unknown, statusDate: CalendarDay) => unknown })
      .progressPointDayOf
    if (typeof seam !== 'function') throw new Error('SEAM: the Schedule entry (schedule.ts) publishes no progressPointDayOf')
    return dayText(seam(found, statusDay()))
  }
  const plan: Loose = { start: S(5, 3), finish: F(5, 28) }

  it('PL-1 finished -> null', () => {
    expect(pointOf({ ...plan, actualStart: S(5, 3), actualFinish: F(5, 14), percentComplete: 100 })).toBeNull()
  })

  it('PL-2 suspended with no resume day (PS-3, resumeValid false) -> null', () => {
    expect(pointOf({ ...plan, actualStart: S(5, 3), stop: F(5, 5), resumeValid: false, percentComplete: 20 })).toBeNull()
  })

  it.each([
    ['resume before the status date -> the resume day', S(5, 17), D(5, 17)],
    ['resume on the status date -> null (strictly before)', S(5, 21), null],
    ['resume after the status date -> null', S(5, 24), null],
  ] as const)('PL-3 suspended with a resume day: %s', (_name, resume, expected) => {
    expect(pointOf({ ...plan, actualStart: S(5, 3), stop: F(5, 5), resume, resumeValid: true, percentComplete: 20 })).toBe(
      expected,
    )
  })

  it.each([
    ['start before the status date -> the start day', S(5, 10), D(5, 10)],
    ['start on the status date -> null (strictly before)', S(5, 21), null],
    ['start after the status date -> null', S(5, 24), null],
  ] as const)('PL-4 not started: %s', (_name, start, expected) => {
    expect(pointOf({ start, finish: F(5, 28) })).toBe(expected)
  })

  it.each([
    ['last day Wednesday 05-12 -> Thursday 05-13', F(5, 12), D(5, 13)],
    ['last day Friday 05-14 -> Saturday 05-15 (the next calendar day, RV-1, not the next working day)', F(5, 14), D(5, 15)],
  ] as const)('PL-5 in progress: %s', (_name, stop, expected) => {
    expect(pointOf({ ...plan, actualStart: S(5, 3), stop, resumeValid: true, percentComplete: 30 })).toBe(expected)
  })
})

describe('CR-651 FR-131 T-311 VS-6 -- the parent point against the points of its leaves', () => {
  it('VS-6 left by more than S-487: one finding on the parent, kind suspicion, layer 4', () => {
    const report = diagnose(LEFT_PARENT(S_487_DEFAULT))
    expect(vs6Of(report).map((one) => one.uid)).toEqual([G])
    const finding = vs6On(report, G)[0]
    expect(finding?.kind).toBe('suspicion')
    expect(finding?.layer).toBe(4)
  })

  it('VS-6 values: parentPoint, leftmost and rightmost point and uid, working days outside, tolerance', () => {
    const values = valuesOf(vs6On(diagnose(LEFT_PARENT(S_487_DEFAULT)), G)[0])
    expect(dayText(values['parentPoint'])).toBe(D(5, 6))
    expect(dayText(values['leftmostPoint'])).toBe(D(5, 12))
    expect(values['leftmostUid']).toBe(C1)
    expect(dayText(values['rightmostPoint'])).toBe(D(5, 19))
    expect(values['rightmostUid']).toBe(C2)
    expect(values['outsideWorkingDays']).toBe(LEFT_WORKING_DAYS)
    expect(values['parentProgressToleranceDays']).toBe(S_487_DEFAULT)
  })

  it('VS-6 FR-054: the gap is counted in working days of the document calendar (a weekend inside it)', () => {
    // WHY: 6 calendar days but 4 working days; a calendar-day count would still find at tolerance 4 and 5.
    expect(vs6On(diagnose(LEFT_PARENT(LEFT_WORKING_DAYS - 1)), G)).toHaveLength(1)
    expect(vs6On(diagnose(LEFT_PARENT(LEFT_WORKING_DAYS)), G)).toHaveLength(0)
    expect(vs6On(diagnose(LEFT_PARENT(LEFT_WORKING_DAYS + 1)), G)).toHaveLength(0)
  })

  it('VS-6 boundary "more than": a gap equal to the tolerance is not told', () => {
    expect(vs6Of(diagnose(LEFT_PARENT(LEFT_WORKING_DAYS)))).toEqual([])
    expect(vs6Of(diagnose(RIGHT_PARENT(RIGHT_WORKING_DAYS)))).toEqual([])
  })

  it('VS-6 right side: the parent point right of the rightmost leaf by more than the tolerance', () => {
    const report = diagnose(RIGHT_PARENT(S_487_DEFAULT))
    expect(vs6Of(report).map((one) => one.uid)).toEqual([G])
    const values = valuesOf(vs6On(report, G)[0])
    expect(dayText(values['parentPoint'])).toBe(D(5, 20))
    expect(dayText(values['rightmostPoint'])).toBe(D(5, 13))
    expect(values['rightmostUid']).toBe(C2)
    expect(values['outsideWorkingDays']).toBe(RIGHT_WORKING_DAYS)
    expect(vs6On(diagnose(RIGHT_PARENT(RIGHT_WORKING_DAYS - 1)), G)).toHaveLength(1)
  })

  it('VS-6 S-487 0: a parent point one working day right of the rightmost leaf is told; inside the range is not', () => {
    // WHY: leaves at 05-12 and 05-13; a parent whose last day is 05-13 strikes 05-14 (one working day right).
    const make = (stop: string): Document =>
      documentOf(
        familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), stop), [
          inProgress(C1, 'Leaf one', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: G }),
          inProgress(C2, 'Leaf two', S(5, 10), F(5, 28), F(5, 12), { wbsParentUid: G }),
        ]),
        0,
      )
    expect(vs6On(diagnose(make(F(5, 13))), G)).toHaveLength(1)
    expect(vs6On(diagnose(make(F(5, 12))), G)).toHaveLength(0)
    expect(vs6On(diagnose(make(F(5, 11))), G)).toHaveLength(0)
  })

  it('VS-6 a parent point inside the range of its leaves is not told', () => {
    // WHY: G strikes 05-14, between the leaves at 05-12 and 05-19.
    const document = documentOf(
      familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 13)), [
        inProgress(C1, 'Early leaf', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: G }),
        inProgress(C2, 'Late leaf', S(5, 17), F(5, 28), F(5, 18), { wbsParentUid: G }),
      ]),
    )
    expect(vs6Of(diagnose(document))).toEqual([])
  })

  it('VS-6 S-487 is read from Project.parentProgressToleranceDays: raising it takes the finding away', () => {
    const document = LEFT_PARENT(S_487_DEFAULT)
    expect(vs6On(diagnose(document), G)).toHaveLength(1)
    expect(vs6On(diagnose(withTolerance(document, 1000)), G)).toHaveLength(0)
    expect(valuesOf(vs6On(diagnose(withTolerance(document, 2)), G)[0])['parentProgressToleranceDays']).toBe(2)
  })
})

describe('CR-651 T-311 VS-6 -- which descendants give a point', () => {
  it('VS-6 a leaf with no vertex (finished, or not yet due) counts at the status date', () => {
    // WHY: G strikes 05-14 (Fri). C1 is finished and C2 starts after the status date, so both stand at 05-21;
    // from 05-14 to 05-21 lie 5 working days. Skipping vertex-less leaves would leave nothing to compare.
    const document = documentOf(
      familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 13)), [
        taskOf(C1, { name: 'Done', wbsParentUid: G, start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 7), percentComplete: 100 }),
        taskOf(C2, { name: 'Not yet', wbsParentUid: G, start: S(5, 24), finish: F(5, 28) }),
      ]),
    )
    const found = vs6On(diagnose(document), G)
    expect(found).toHaveLength(1)
    const values = valuesOf(found[0])
    expect(dayText(values['leftmostPoint'])).toBe(STATUS_DAY)
    expect(dayText(values['rightmostPoint'])).toBe(STATUS_DAY)
    expect(values['outsideWorkingDays']).toBe(5)
  })

  it('VS-6 a finished leaf at the status date keeps a parent at the status date inside the range', () => {
    // WHY: G strikes 05-21; C2 strikes 05-11 and the finished C1 stands at 05-21, so G is inside [05-11, 05-21].
    // Without the status-date point G would read 8 working days right of C2.
    const document = documentOf(
      familyOf(inProgress(G, 'Parent', S(5, 3), F(5, 28), F(5, 20)), [
        taskOf(C1, { name: 'Done', wbsParentUid: G, start: S(5, 3), finish: F(5, 7), actualStart: S(5, 3), actualFinish: F(5, 7), percentComplete: 100 }),
        inProgress(C2, 'Slow', S(5, 10), F(5, 28), F(5, 10), { wbsParentUid: G }),
      ]),
    )
    expect(vs6On(diagnose(document), G)).toHaveLength(0)
  })

  it('VS-6 leaf-only: an intermediate parent off its own leaves does not mask its ancestor; both are told', () => {
    // WHY: A and B both strike 05-05 (Wed). B's leaves strike 05-12 and 05-13, A's own leaf A1 strikes 05-18.
    // Counting B as a point of A would put 05-05 inside A's range and hide A.
    const A = 410
    const B = 411
    const A1 = 412
    const B1 = 413
    const B2 = 414
    const document = documentOf([
      { id: 'r0', parentId: null, tasks: [inProgress(A, 'Top', S(5, 3), F(5, 28), F(5, 4))] },
      { id: 'r1', parentId: 'r0', tasks: [inProgress(B, 'Middle', S(5, 3), F(5, 14), F(5, 4), { wbsParentUid: A })] },
      { id: 'r2', parentId: 'r0', tasks: [inProgress(A1, 'Own leaf', S(5, 17), F(5, 28), F(5, 17), { wbsParentUid: A })] },
      { id: 'r3', parentId: 'r1', tasks: [inProgress(B1, 'Leaf one', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: B })] },
      { id: 'r4', parentId: 'r1', tasks: [inProgress(B2, 'Leaf two', S(5, 3), F(5, 14), F(5, 12), { wbsParentUid: B })] },
    ])
    const report = diagnose(document)
    expect(vs6Of(report).map((one) => one.uid).sort()).toEqual([A, B])
    const ofA = valuesOf(vs6On(report, A)[0])
    expect(dayText(ofA['leftmostPoint'])).toBe(D(5, 12))
    expect(ofA['leftmostUid']).toBe(B1)
    expect(dayText(ofA['rightmostPoint'])).toBe(D(5, 18))
    expect(ofA['rightmostUid']).toBe(A1)
    expect(ofA['outsideWorkingDays']).toBe(5)
    const ofB = valuesOf(vs6On(report, B)[0])
    expect(dayText(ofB['rightmostPoint'])).toBe(D(5, 13))
    expect(ofB['rightmostUid']).toBe(B2)
  })
})

describe('CR-651 T-311 VS-6 -- parents that are not judged', () => {
  // WHY: tolerance 0 and leaves at 05-12 / 05-13, so any point the parent were given away from those two days would be told.
  const leaves = (): readonly Loose[] => [
    inProgress(C1, 'Leaf one', S(5, 3), F(5, 14), F(5, 11), { wbsParentUid: G }),
    inProgress(C2, 'Leaf two', S(5, 10), F(5, 28), F(5, 12), { wbsParentUid: G }),
  ]
  const plan: Loose = { name: 'Parent', start: S(5, 3), finish: F(5, 28) }

  it.each([
    ['PL-1 finished', { actualStart: S(5, 3), actualFinish: F(5, 14), percentComplete: 100 }],
    ['PL-2 suspended, resume unknown', { actualStart: S(5, 3), stop: F(5, 4), resumeValid: false, percentComplete: 20 }],
    ['PL-3 suspended, resume after the status date', { actualStart: S(5, 3), stop: F(5, 4), resume: S(5, 24), resumeValid: true, percentComplete: 20 }],
    ['PL-4 not started, start after the status date', { start: S(5, 24) }],
  ] as const)('VS-6 a parent with no vertex is not judged: %s', (_name, state) => {
    const document = documentOf(familyOf(taskOf(G, { ...plan, ...state }), leaves()), 0)
    expect(vs6On(diagnose(document), G)).toHaveLength(0)
  })

  it('VS-6 FR-135: a milestone with children is not judged', () => {
    // WHY: M is not started with a start before the status date (PL-4 strikes 05-03), its child strikes 05-13;
    // judged as a parent it would be 8 working days left.
    const M = 420
    const document = documentOf([
      { id: 'r0', parentId: null, tasks: [taskOf(M, { name: 'Gate', milestone: true, start: S(5, 3), finish: S(5, 3) })] },
      { id: 'r1', parentId: 'r0', tasks: [inProgress(C1, 'Child', S(5, 3), F(5, 14), F(5, 12), { wbsParentUid: M })] },
    ])
    const report = diagnose(document)
    expect(vs6On(report, M)).toHaveLength(0)
    expect(vs6Of(report)).toEqual([])
  })
})

describe('CR-651 FR-131 VS-6 is a doubt -- it paints no marker (T-315 DG-1 is not reached by T-311)', () => {
  it('VS-6 the marker states are the same with the finding present and with it silenced by a large tolerance', () => {
    const told = diagnose(LEFT_PARENT(S_487_DEFAULT))
    const silenced = diagnose(LEFT_PARENT(1000))
    expect(vs6On(told, G)).toHaveLength(1)
    expect(vs6Of(silenced)).toEqual([])
    expect(told.markerStates).toEqual(silenced.markerStates)
    expect(told.findings.filter((one) => one.row !== 'VS-6')).toEqual(silenced.findings)
  })

  it('VS-6 every VS-6 finding is a suspicion, never a contradiction', () => {
    for (const finding of vs6Of(diagnose(RIGHT_PARENT(S_487_DEFAULT)))) expect(finding.kind).toBe('suspicion')
  })
})

const SAMPLE_DIR = join(process.cwd(), 'sample-schedule')

function currentDocument(tolerance?: number): Document {
  const read = documentFromJson(TEMPLATE_TEXT)
  if (!read.ok) throw new Error('the bundled template is not a GRS JSON document')
  return tolerance === undefined ? read.document : withTolerance(read.document, tolerance)
}

function sampleDocument(file: string, current: Document = currentDocument()): Document {
  const read = documentFromMspdi(readFileSync(join(SAMPLE_DIR, file), 'utf8'), current)
  if (!read.ok) throw new Error(`${file} was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

const SAMPLES = new Map<string, Document>()
const sample = (file: string): Document => {
  const known = SAMPLES.get(file)
  if (known !== undefined) return known
  const opened = sampleDocument(file)
  SAMPLES.set(file, opened)
  return opened
}

const LANGUAGES = ['ja', 'en'] as const
// WHY: CR-651 section 0.3 prints 9 at tolerance 1 but lists 10 parents; 181 counts only under the
// leaf-only rule T-311 VS-6 states, so the listed 10 are asserted.
const LARGE_AT_DEFAULT = [125, 129, 133, 137, 141, 145, 181, 182, 200, 208]
const LARGE_AT_WEEKLY = [181, 182, 200, 208]
const COUNTS = [
  ['sample-large-erp-program', LARGE_AT_DEFAULT.length, LARGE_AT_WEEKLY.length],
  ['sample-small-website-renewal', 1, 1],
  ['sample-medium-sfa-webapp', 0, 0],
] as const
const WEEKLY_TOLERANCE = 7

const describeFound = (found: readonly Finding[]): string =>
  found
    .map((one) => {
      const values = valuesOf(one)
      return `${one.uid}:${dayText(values['parentPoint'])}/${dayText(values['leftmostPoint'])}..${dayText(values['rightmostPoint'])}:${String(values['outsideWorkingDays'])}`
    })
    .join(' ')

describe('CR-651 VS-6 -- the MSPDI samples (CR-651 section 0.3)', () => {
  it('VS-6 sample-large-erp-program.ja.xml: one VS-6 on uid 208, parentPoint 2026-09-02, leftmostPoint 2026-11-25', () => {
    const found = vs6On(diagnose(sample('sample-large-erp-program.ja.xml')), 208)
    expect(found).toHaveLength(1)
    const values = valuesOf(found[0])
    expect(dayText(values['parentPoint'])).toBe('2026-09-02')
    expect(dayText(values['leftmostPoint'])).toBe('2026-11-25')
    expect(values['outsideWorkingDays']).toBe(55)
    expect(found[0]?.kind).toBe('suspicion')
  })

  it('VS-6 sample-small-website-renewal.ja.xml: the one VS-6 is on uid 38', () => {
    expect(vs6Of(diagnose(sample('sample-small-website-renewal.ja.xml'))).map((one) => one.uid)).toEqual([38])
  })

  const cases = COUNTS.flatMap(([name, atDefault, atWeekly]) =>
    LANGUAGES.map((language) => [`${name}.${language}.xml`, atDefault, atWeekly] as const),
  )

  it.each(cases)('VS-6 S-487 %s: %i at the default tolerance, %i at 7', (file, atDefault, atWeekly) => {
    const document = sample(file)
    expect(document.schedule.project.parentProgressToleranceDays).toBe(S_487_DEFAULT)
    const atDefaultFound = vs6Of(diagnose(document))
    expect(atDefaultFound, describeFound(atDefaultFound)).toHaveLength(atDefault)
    const atWeeklyFound = vs6Of(diagnose(withTolerance(document, WEEKLY_TOLERANCE)))
    expect(atWeeklyFound, describeFound(atWeeklyFound)).toHaveLength(atWeekly)
  })

  it('VS-6 sample-large-erp-program at the default tolerance names exactly the parents CR-651 section 0.3 lists', () => {
    const report = diagnose(sample('sample-large-erp-program.ja.xml'))
    expect(vs6Of(report).map((one) => one.uid).sort((a, b) => a - b)).toEqual(LARGE_AT_DEFAULT)
  })

  it('VS-6 sample-large-erp-program at 7 keeps exactly 208, 200, 182 and 181, at 55, 60, 38 and 56 working days', () => {
    const report = diagnose(withTolerance(sample('sample-large-erp-program.ja.xml'), WEEKLY_TOLERANCE))
    expect(vs6Of(report).map((one) => one.uid).sort((a, b) => a - b)).toEqual(LARGE_AT_WEEKLY)
    const days = new Map(vs6Of(report).map((one) => [one.uid, valuesOf(one)['outsideWorkingDays']]))
    expect([days.get(208), days.get(200), days.get(182), days.get(181)]).toEqual([55, 60, 38, 56])
  })

  it('VS-6 sample-large-erp-program: the marker states do not move with the tolerance (a doubt paints nothing)', () => {
    const document = sample('sample-large-erp-program.ja.xml')
    expect(diagnose(document).markerStates).toEqual(diagnose(withTolerance(document, 1000)).markerStates)
  })
})

describe('CR-651 AT-156 FR-073 -- the bundled documents carry the new column and the new version', () => {
  it.each([
    ['startup-template.json', TEMPLATE_TEXT],
    ['empty-document.json', EMPTY_DOCUMENT_TEXT],
  ] as const)('AT-156 FR-073 %s: schemaVersion 2026-10-04 and project.parentProgressToleranceDays = S-487', (_file, text) => {
    const raw = JSON.parse(text) as { schemaVersion: string; schedule: { project: Loose } }
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION)
    expect(raw.schedule.project[S_487_KEY]).toBe(S_487_DEFAULT)
  })

  it('AT-156 the GRS JSON round trip keeps the value', () => {
    const document = withTolerance(currentDocument(), 6)
    const read = documentFromJson(jsonFromDocument(document))
    expect(read.ok).toBe(true)
    if (read.ok) expect(read.document.schedule.project.parentProgressToleranceDays).toBe(6)
  })

  it.each([
    ['the key is missing', undefined],
    ['-1', -1],
    ['1.5', 1.5],
    ['null', null],
  ] as const)('AT-156 a GRS JSON whose parentProgressToleranceDays is %s is refused', (_name, value) => {
    const raw = JSON.parse(TEMPLATE_TEXT) as { schedule: { project: Loose } }
    if (value === undefined) delete raw.schedule.project[S_487_KEY]
    else raw.schedule.project[S_487_KEY] = value
    expect(documentFromJson(JSON.stringify(raw)).ok).toBe(false)
  })

  it('AT-156 an MSPDI open keeps the current document value (as themeHue does)', () => {
    const opened = sampleDocument('sample-large-erp-program.ja.xml', currentDocument(WEEKLY_TOLERANCE))
    expect(opened.schedule.project.parentProgressToleranceDays).toBe(WEEKLY_TOLERANCE)
    expect(vs6Of(diagnose(opened))).toHaveLength(4)
  })

  it('AT-156 the MSPDI export does not write the value', () => {
    const text = mspdiFromDocument(withTolerance(currentDocument(), 6), '2026-10-04T09:00:00').text
    expect(text).not.toContain(S_487_KEY)
    expect(text.toLowerCase()).not.toContain('tolerance')
  })
})

const CALM = { gestureInFlight: false, editingInPlace: false, questionAsked: false, deliveringNotices: false }
const HISTORY_LIMITS = { maxSteps: 50, maxTotalSizeBytes: 64 * 1024 * 1024 }
const EMPTY_HISTORY: EditHistory<ChangeStep> = { done: [], undone: [] }
const LIMITS = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

const cm87 = (workingDays: number): DocumentCommand =>
  ({ kind: CM_87_NAME, workingDays }) as unknown as DocumentCommand

describe('CR-651 CM-87 FR-131 -- setParentProgressTolerance', () => {
  it.each([0, 3, 1000])('CM-87 accepts the integer %i and writes it to Project.parentProgressToleranceDays', (value) => {
    const result = editProject(currentDocument(), cm87(value) as never)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.document.schedule.project.parentProgressToleranceDays).toBe(value)
  })

  it.each([-1, 1.5, Number.NaN])('CM-87 refuses %s (FR-131: never clamped into range)', (value) => {
    const document = currentDocument()
    const result = editProject(document, cm87(value) as never)
    expect(result.ok).toBe(false)
    expect(document.schedule.project.parentProgressToleranceDays).toBe(S_487_DEFAULT)
  })

  it('CM-87 UN-13: one undo step, and undo restores the old value', () => {
    const document = currentDocument()
    const plan = planDocumentChange({
      defaultRowName: 'fixture default row name',
      document,
      readStamp: document.documentStamp,
      commands: [cm87(5)],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedUtc: '2026-10-04T01:00:00Z',
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.document.schedule.project.parentProgressToleranceDays).toBe(5)
    expect(plan.history.done).toHaveLength(1)
    const undone = undoEdit({ document: plan.document, history: plan.history })
    expect(undone.undone).toBe(true)
    expect(undone.next.document.schedule.project.parentProgressToleranceDays).toBe(S_487_DEFAULT)
  })

  it('CM-87 a refused value throws the whole bundle away (no step is recorded)', () => {
    const document = currentDocument()
    const plan = planDocumentChange({
      defaultRowName: 'fixture default row name',
      document,
      readStamp: document.documentStamp,
      commands: [cm87(-1)],
      moment: CALM,
      history: EMPTY_HISTORY,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: LIMITS,
      editedBy: 'user',
      updatedUtc: '2026-10-04T01:00:00Z',
    })
    expect(plan.ok).toBe(false)
  })
})

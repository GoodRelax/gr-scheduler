// CR-810 (spec-only): a row with no parent task offers to make one (VO-4 value, FA-25), and a milestone heading its row is an origin (DW-3, FR-136).

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  delayFixCommands,
  diagnoseDelay,
  proposeDelayFixes,
  workingCalendarOf,
  type DelayDiagnosticsReport,
  type DelayFixCheck,
  type DelayFixRow,
} from '../../src/entity/document-model/schedule/schedule'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { BUILT_VERSION, TEMPLATE } from './cr-731-stage'

type Loose = Record<string, unknown>

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const STATUS_DATE_BEFORE_ALL = '2027-05-01T00:00:00'

interface GroupSpec {
  readonly key: string
  readonly parent: string | null
  readonly name: string | null
}

interface TaskSpec {
  readonly uid: number
  readonly group: string
  readonly start: string
  readonly finish: string
  readonly milestone?: boolean
  readonly name?: string
}

const idOfGroupAt = (index: number): string => `dddddddd-0000-4000-8000-${String(index + 1).padStart(12, '0')}`

// WHY: a bench document whose task groups are named by the test, several tasks per group, with every parentTaskUid null (nothing is written by hand).
function documentOf(groups: readonly GroupSpec[], tasks: readonly TaskSpec[]): Document {
  const idOf = (key: string): string => {
    const at = groups.findIndex((one) => one.key === key)
    if (at < 0) throw new Error(`no group ${key}`)
    return idOfGroupAt(at)
  }
  const taskText = (one: TaskSpec): Loose => ({
    uid: one.uid,
    parentTaskUid: null,
    wbsOrder: one.uid,
    name: one.name ?? `Task ${String(one.uid)}`,
    start: `${one.start}T08:00:00`,
    finish: one.milestone === true ? `${one.start}T08:00:00` : `${one.finish}T17:00:00`,
    milestone: one.milestone === true,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  })
  const raw: Loose = {
    $schema: TEMPLATE['$schema'],
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: {
        ...structuredClone(TEMPLATE['schedule'].project),
        uidHighWaterMark: 1000,
        statusDate: STATUS_DATE_BEFORE_ALL,
      },
      calendars: structuredClone(TEMPLATE['schedule'].calendars),
      tasks: tasks.map(taskText),
      resources: [],
      assignments: [],
      taskGroups: groups.map((one, index) => ({
        id: idOfGroupAt(index),
        parentId: one.parent === null ? null : idOf(one.parent),
        name: one.name,
        derivedFromTaskUid: null,
        order: index,
        treeState: 'expanded',
        editPermission: null,
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: tasks.map((one) => ({ taskUid: one.uid, taskGroupId: idOf(one.group) })),
      taskVisuals: tasks.map((one) => ({
        taskUid: one.uid,
        shapeKind: null,
        milestoneGlyph: null,
        fillColor: null,
        strokeColor: null,
        strokeWidthPx: null,
      })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(TEMPLATE['documentSettings']),
      scrollDate: '2027-05-01T00:00:00',
      scrollTaskGroupId: idOfGroupAt(0),
      scrollTaskGroupFraction: 0,
      zoomY: 1,
      levelZeroTreeState: 'auto',
    },
    documentStamp: structuredClone(TEMPLATE['documentStamp']),
    changeLog: [],
  }
  const opened = documentFromJson(JSON.stringify(raw), BUILT_VERSION)
  if (!opened.ok) throw new Error(`the bench document is refused: ${JSON.stringify(opened.faults)}`)
  return opened.document
}

const diagnose = (document: Document): DelayDiagnosticsReport => diagnoseDelay(document, workingCalendarOf(document.schedule))

const proposalsOf = (document: Document, checks: readonly DelayFixCheck[] = []): readonly DelayFixRow[] =>
  proposeDelayFixes(document, diagnose(document), checks)

const wallsOf = (report: DelayDiagnosticsReport, row: string) => report.walls.filter((one) => one.row === row)
const markerOf = (report: DelayDiagnosticsReport, uid: number) => report.markerStates.find((one) => one.uid === uid)?.row ?? null
const findingsOf = (report: DelayDiagnosticsReport, row: string, uid?: number) =>
  report.findings.filter((one) => one.row === row && (uid === undefined || one.uid === uid))
const fixRowsOf = (rows: readonly DelayFixRow[], fixRow: string) => rows.filter((one) => one.fixRow === fixRow)

function applyAll(document: Document, commands: readonly unknown[]): Document {
  let current = document
  for (const command of commands) {
    const result = editDocument(current, command as DocumentCommand, LIMITS, 'Row')
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
    current = result.document
  }
  return current
}

const taskOf = (document: Document, uid: number): Loose => {
  const found = (document.schedule.tasks as unknown as readonly Loose[]).find((one) => one['uid'] === uid)
  if (found === undefined) throw new Error(`the document holds no task ${String(uid)}`)
  return found
}

const dayPart = (value: unknown): string => String(value).slice(0, 10)
const highWaterMarkOf = (document: Document): number => (document.schedule.project as unknown as Loose)['uidHighWaterMark'] as number

const groupIdDrawing = (document: Document, uid: number): string | undefined =>
  (document.schedule.taskGroupMembers as unknown as readonly Loose[]).find((one) => one['taskUid'] === uid)?.['taskGroupId'] as string | undefined


describe('CR-810 DW-3 / FR-136 -- a milestone heading its row is an origin, not a wall', () => {
  const TOP: readonly GroupSpec[] = [{ key: 'row', parent: null, name: 'Row one' }]

  it('DW-3: a lone milestone with no predecessor and no earlier Task on its row gets no DW-3 wall and is not DG-1', () => {
    const document = documentOf(TOP, [{ uid: 1, group: 'row', start: '2027-05-12', finish: '2027-05-12', milestone: true }])
    const report = diagnose(document)
    expect(report.outcome).toBe('diagnosed')
    expect(wallsOf(report, 'DW-3').filter((one) => one.causeUid === 1)).toEqual([])
    expect(markerOf(report, 1)).not.toBe('DG-1')
  })

  it('DW-3: a Task on the same row that starts the same day (not before) leaves the milestone an origin', () => {
    // WHY: the Task finishes after the milestone, so MP-1 derives no predecessor.
    const document = documentOf(TOP, [
      { uid: 1, group: 'row', start: '2027-05-12', finish: '2027-05-12', milestone: true },
      { uid: 2, group: 'row', start: '2027-05-12', finish: '2027-05-14' },
    ])
    const report = diagnose(document)
    expect(wallsOf(report, 'DW-3').filter((one) => one.causeUid === 1)).toEqual([])
    expect(markerOf(report, 1)).not.toBe('DG-1')
  })

  it('DW-3: a Task on the same row that starts a later day leaves the milestone an origin', () => {
    const document = documentOf(TOP, [
      { uid: 1, group: 'row', start: '2027-05-12', finish: '2027-05-12', milestone: true },
      { uid: 2, group: 'row', start: '2027-05-13', finish: '2027-05-17' },
    ])
    const report = diagnose(document)
    expect(wallsOf(report, 'DW-3').filter((one) => one.causeUid === 1)).toEqual([])
    expect(markerOf(report, 1)).not.toBe('DG-1')
  })

  it('DW-3: two milestones on the same first day of a row are both origins', () => {
    const document = documentOf(TOP, [
      { uid: 1, group: 'row', start: '2027-05-12', finish: '2027-05-12', milestone: true },
      { uid: 2, group: 'row', start: '2027-05-12', finish: '2027-05-12', milestone: true },
    ])
    const report = diagnose(document)
    expect(wallsOf(report, 'DW-3')).toEqual([])
    expect(markerOf(report, 1)).not.toBe('DG-1')
    expect(markerOf(report, 2)).not.toBe('DG-1')
  })

  const NOT_AN_ORIGIN: readonly TaskSpec[] = [
    // WHY: the Task starts on an earlier day and finishes after the milestone, so MP-1 and MP-2 derive no predecessor and only DW-3 can speak.
    { uid: 1, group: 'row', start: '2027-05-14', finish: '2027-05-14', milestone: true },
    { uid: 2, group: 'row', start: '2027-05-12', finish: '2027-05-18' },
  ]

  it('DW-3: a milestone with no predecessor and a Task on its own row starting an earlier day gets a DW-3 wall and is DG-1', () => {
    const report = diagnose(documentOf(TOP, NOT_AN_ORIGIN))
    expect(wallsOf(report, 'DW-3').map((one) => one.causeUid)).toEqual([1])
    expect(markerOf(report, 1)).toBe('DG-1')
  })

  it('DW-3: the head is decided by date, not by the order the Tasks are drawn in', () => {
    const reversed = [...NOT_AN_ORIGIN].reverse()
    const report = diagnose(documentOf(TOP, reversed))
    expect(wallsOf(report, 'DW-3').map((one) => one.causeUid)).toEqual([1])
    expect(markerOf(report, 1)).toBe('DG-1')
  })

  it('DW-3: only the milestone own task group counts -- a Task of a child task group starting earlier does not stop it being an origin', () => {
    // WHY: the child Task finishes after the milestone, so MP-2 derives no predecessor either.
    const document = documentOf(
      [
        { key: 'row', parent: null, name: 'Row one' },
        { key: 'child', parent: 'row', name: 'Child row' },
      ],
      [
        { uid: 1, group: 'row', start: '2027-05-14', finish: '2027-05-14', milestone: true },
        { uid: 2, group: 'child', start: '2027-05-10', finish: '2027-05-18' },
      ],
    )
    const report = diagnose(document)
    expect(wallsOf(report, 'DW-3').filter((one) => one.causeUid === 1)).toEqual([])
    expect(markerOf(report, 1)).not.toBe('DG-1')
  })
})


describe('CR-810 VO-4 -- taskGroupAboveWithoutSpanBar names a one-up task group that draws no span bar', () => {
  const NESTED: readonly GroupSpec[] = [
    { key: 'top', parent: null, name: 'Summary row' },
    { key: 'child', parent: 'top', name: 'Detail row' },
  ]

  it('VO-4: a Task of a child task group whose parent task group draws nothing gets the value, the parent group name', () => {
    const document = documentOf(NESTED, [{ uid: 5, group: 'child', start: '2027-05-10', finish: '2027-05-14' }])
    const found = findingsOf(diagnose(document), 'VO-4', 5)
    expect(found).toHaveLength(1)
    expect((found[0]?.values as Loose)['taskGroupAboveWithoutSpanBar']).toBe('Summary row')
  })

  it('VO-4: a parent task group that draws only milestones still draws no span bar -- the value is given', () => {
    const document = documentOf(NESTED, [
      { uid: 4, group: 'top', start: '2027-05-10', finish: '2027-05-10', milestone: true },
      { uid: 5, group: 'child', start: '2027-05-10', finish: '2027-05-14' },
    ])
    const found = findingsOf(diagnose(document), 'VO-4', 5)
    expect(found).toHaveLength(1)
    expect((found[0]?.values as Loose)['taskGroupAboveWithoutSpanBar']).toBe('Summary row')
  })

  it('VO-4: a parent task group with no name gives its id as the value', () => {
    const document = documentOf(
      [
        { key: 'top', parent: null, name: null },
        { key: 'child', parent: 'top', name: 'Detail row' },
      ],
      [{ uid: 5, group: 'child', start: '2027-05-10', finish: '2027-05-14' }],
    )
    const found = findingsOf(diagnose(document), 'VO-4', 5)
    expect(found).toHaveLength(1)
    expect((found[0]?.values as Loose)['taskGroupAboveWithoutSpanBar']).toBe(idOfGroupAt(0))
  })

  it('VO-4: a span bar above that does not enclose the Task (candidates 0) leaves the value absent, the finding still stands', () => {
    const document = documentOf(NESTED, [
      { uid: 4, group: 'top', start: '2027-01-04', finish: '2027-01-08' },
      { uid: 5, group: 'child', start: '2027-05-10', finish: '2027-05-14' },
    ])
    const found = findingsOf(diagnose(document), 'VO-4', 5)
    expect(found).toHaveLength(1)
    expect(Object.keys(found[0]?.values as Loose)).not.toContain('taskGroupAboveWithoutSpanBar')
  })

  it('IP-2: a span bar above that encloses the Task derives the one parent -- no VO-4 at all', () => {
    const document = documentOf(NESTED, [
      { uid: 4, group: 'top', start: '2027-05-03', finish: '2027-05-28' },
      { uid: 5, group: 'child', start: '2027-05-10', finish: '2027-05-14' },
    ])
    expect(findingsOf(diagnose(document), 'VO-4', 5)).toEqual([])
  })

  it('IP-5: a Task of a top-level task group is a root -- no VO-4 and no FA-25 row, whatever its neighbours', () => {
    const document = documentOf(
      [{ key: 'top', parent: null, name: 'Summary row' }],
      [
        { uid: 1, group: 'top', start: '2027-05-10', finish: '2027-05-14' },
        { uid: 2, group: 'top', start: '2027-05-17', finish: '2027-05-19' },
      ],
    )
    const report = diagnose(document)
    expect(findingsOf(report, 'VO-4')).toEqual([])
    const rows = proposalsOf(document)
    expect(fixRowsOf(rows, 'FA-25')).toEqual([])
    expect(rows.flatMap((one) => one.choices).filter((one) => one.word === 'makeParentTaskFromTaskGroup')).toEqual([])
  })
})


describe('CR-810 FA-25 -- one choose row per task group, the other Tasks of the row stay by hand', () => {
  const GROUPS: readonly GroupSpec[] = [
    { key: 'top', parent: null, name: 'Summary row' },
    { key: 'phase', parent: 'top', name: 'Phase A' },
  ]
  // WHY: the smallest uid (11) is listed second, so "smallest uid" cannot be mistaken for "first listed".
  const TASKS: readonly TaskSpec[] = [
    { uid: 13, group: 'phase', start: '2027-05-12', finish: '2027-05-14' },
    { uid: 11, group: 'phase', start: '2027-05-10', finish: '2027-05-11' },
    { uid: 12, group: 'phase', start: '2027-05-17', finish: '2027-05-19' },
  ]

  it('VO-4: each of the three Tasks of the row has the finding with the value', () => {
    const report = diagnose(documentOf(GROUPS, TASKS))
    for (const uid of [11, 12, 13]) {
      const found = findingsOf(report, 'VO-4', uid)
      expect(found, `task ${String(uid)}`).toHaveLength(1)
      expect((found[0]?.values as Loose)['taskGroupAboveWithoutSpanBar']).toBe('Summary row')
    }
  })

  it('FA-25: exactly one choose row, with exactly one choice makeParentTaskFromTaskGroup naming the row', () => {
    const rows = fixRowsOf(proposalsOf(documentOf(GROUPS, TASKS)), 'FA-25')
    expect(rows).toHaveLength(3)
    const choose = rows.filter((one) => one.fixKind === 'choose')
    expect(choose).toHaveLength(1)
    expect(choose[0]?.findingRow).toBe('VO-4')
    expect(choose[0]?.choices).toHaveLength(1)
    expect(choose[0]?.choices[0]?.word).toBe('makeParentTaskFromTaskGroup')
    expect(choose[0]?.choices[0]?.taskGroupName).toBe('Phase A')
  })

  it('FA-25: the choose row belongs to the Task with the smallest uid; the other Tasks stay by hand', () => {
    const rows = fixRowsOf(proposalsOf(documentOf(GROUPS, TASKS)), 'FA-25')
    expect(rows.find((one) => one.fixKind === 'choose')?.taskUid).toBe(11)
    expect(rows.filter((one) => one.fixKind === 'byHand').map((one) => one.taskUid).sort()).toEqual([12, 13])
    for (const one of rows.filter((one) => one.fixKind === 'byHand')) expect(one.choices).toEqual([])
  })

  it('FM-1: a one-choice row is not checked by default, and nothing is issued', () => {
    const rows = proposalsOf(documentOf(GROUPS, TASKS))
    const choose = fixRowsOf(rows, 'FA-25').find((one) => one.fixKind === 'choose')
    expect(choose?.checked).toBe(false)
    expect(choose?.isCheckable).toBe(true)
    expect(delayFixCommands(rows).filter((one) => one.kind === 'createTask')).toEqual([])
  })

  it('FM-1: checking the one-choice row takes its one choice and issues the bundle', () => {
    const document = documentOf(GROUPS, TASKS)
    const key = fixRowsOf(proposalsOf(document), 'FA-25').find((one) => one.fixKind === 'choose')?.key as string
    const rows = proposalsOf(document, [{ key, checked: true, choice: null, date: null }])
    const choose = rows.find((one) => one.key === key)
    expect(choose?.checked).toBe(true)
    expect(choose?.chosen).toBe(choose?.choices[0]?.key)
    const kinds = delayFixCommands(rows).map((one) => one.kind)
    expect(kinds.filter((one) => one === 'createTask')).toHaveLength(1)
    expect(kinds.filter((one) => one === 'setTaskParentTask')).toHaveLength(3)
  })

  it('FA-25: a byHand row of the same task group cannot be checked into a bundle', () => {
    const document = documentOf(GROUPS, TASKS)
    const byHand = fixRowsOf(proposalsOf(document), 'FA-25').find((one) => one.fixKind === 'byHand') as DelayFixRow
    const rows = proposalsOf(document, [{ key: byHand.key, checked: true, choice: null, date: null }])
    expect(delayFixCommands(rows)).toEqual([])
  })
})


describe('CR-810 FA-25 -- applying the bundle makes the parent Task and joins the row to it', () => {
  const GROUPS: readonly GroupSpec[] = [
    { key: 'top', parent: null, name: 'Summary row' },
    { key: 'phase', parent: 'top', name: 'Phase A' },
  ]
  const TASKS: readonly TaskSpec[] = [
    { uid: 13, group: 'phase', start: '2027-05-12', finish: '2027-05-14' },
    { uid: 11, group: 'phase', start: '2027-05-10', finish: '2027-05-11' },
    { uid: 12, group: 'phase', start: '2027-05-17', finish: '2027-05-19' },
  ]

  function bundleOf(document: Document): readonly unknown[] {
    const keys = proposalsOf(document)
      .filter((one) => one.fixRow === 'FA-25' && one.fixKind === 'choose')
      .map((one) => ({ key: one.key, checked: true, choice: null, date: null }))
    return delayFixCommands(proposalsOf(document, keys))
  }

  it('CM-6 / CM-9 / CM-18: one new Task, uid = previous high-water mark + 1, drawn on the group one up, named as the row, spanning the row', () => {
    const document = documentOf(GROUPS, TASKS)
    const before = highWaterMarkOf(document)
    const after = applyAll(document, bundleOf(document))
    const created = after.schedule.tasks.filter((one) => !document.schedule.tasks.some((old) => old.uid === one.uid))
    expect(created).toHaveLength(1)
    const made = created[0] as unknown as Loose
    expect(made['uid']).toBe(before + 1)
    expect(made['name']).toBe('Phase A')
    expect(made['milestone']).toBe(false)
    expect(dayPart(made['start'])).toBe('2027-05-10')
    expect(dayPart(made['finish'])).toBe('2027-05-19')
    expect(groupIdDrawing(after, before + 1)).toBe(idOfGroupAt(0))
  })

  it('FR-135: every Task of the row now has parentTaskUid = the new Task, and nothing else gained a parent', () => {
    const document = documentOf(GROUPS, TASKS)
    const newUid = highWaterMarkOf(document) + 1
    const after = applyAll(document, bundleOf(document))
    for (const uid of [11, 12, 13]) expect(taskOf(after, uid)['parentTaskUid'], `task ${String(uid)}`).toBe(newUid)
    expect(taskOf(after, newUid)['parentTaskUid']).toBeNull()
  })

  it('VO-4: diagnosing again shows no VO-4 for the Tasks of the row', () => {
    const document = documentOf(GROUPS, TASKS)
    expect(findingsOf(diagnose(document), 'VO-4').length).toBeGreaterThan(0)
    const report = diagnose(applyAll(document, bundleOf(document)))
    expect(findingsOf(report, 'VO-4')).toEqual([])
    expect(fixRowsOf(proposalsOf(applyAll(document, bundleOf(document))), 'FA-25')).toEqual([])
  })

  it('IP-5: the new Task sits on a top-level task group, so it is a root and gets no VO-4 itself', () => {
    const document = documentOf(GROUPS, TASKS)
    const newUid = highWaterMarkOf(document) + 1
    const report = diagnose(applyAll(document, bundleOf(document)))
    expect(findingsOf(report, 'VO-4', newUid)).toEqual([])
  })
})

describe('CR-810 FA-25 -- two rows in one bundle', () => {
  const GROUPS: readonly GroupSpec[] = [
    { key: 'top', parent: null, name: 'Summary row' },
    { key: 'a', parent: 'top', name: 'Phase A' },
    { key: 'b', parent: 'top', name: 'Phase B' },
  ]
  const TASKS: readonly TaskSpec[] = [
    { uid: 11, group: 'a', start: '2027-05-10', finish: '2027-05-11' },
    { uid: 12, group: 'a', start: '2027-05-12', finish: '2027-05-14' },
    { uid: 21, group: 'b', start: '2027-06-01', finish: '2027-06-03' },
    { uid: 22, group: 'b', start: '2027-06-07', finish: '2027-06-09' },
  ]

  it('FA-25: one choose row per task group, on the smallest uid of each', () => {
    const rows = fixRowsOf(proposalsOf(documentOf(GROUPS, TASKS)), 'FA-25')
    const choose = rows.filter((one) => one.fixKind === 'choose')
    expect(choose.map((one) => one.taskUid).sort()).toEqual([11, 21])
    expect(choose.map((one) => one.choices[0]?.taskGroupName).sort()).toEqual(['Phase A', 'Phase B'])
    expect(rows.filter((one) => one.fixKind === 'byHand').map((one) => one.taskUid).sort()).toEqual([12, 22])
  })

  it('CM-6: both checked -- the second created Task gets the next uid and each row points at its own new parent', () => {
    const document = documentOf(GROUPS, TASKS)
    const before = highWaterMarkOf(document)
    const checks = proposalsOf(document)
      .filter((one) => one.fixRow === 'FA-25' && one.fixKind === 'choose')
      .map((one) => ({ key: one.key, checked: true, choice: null, date: null }))
    expect(checks).toHaveLength(2)
    const commands = delayFixCommands(proposalsOf(document, checks))
    expect(commands.filter((one) => one.kind === 'createTask')).toHaveLength(2)
    const after = applyAll(document, commands)
    const created = after.schedule.tasks
      .filter((one) => !document.schedule.tasks.some((old) => old.uid === one.uid))
      .map((one) => one as unknown as Loose)
      .sort((a, b) => (a['uid'] as number) - (b['uid'] as number))
    expect(created.map((one) => one['uid'])).toEqual([before + 1, before + 2])
    const parentOf = (uid: number): unknown => taskOf(after, uid)['parentTaskUid']
    expect(parentOf(11)).toBe(parentOf(12))
    expect(parentOf(21)).toBe(parentOf(22))
    expect(parentOf(11)).not.toBe(parentOf(21))
    const nameOfParent = (uid: number): unknown => taskOf(after, parentOf(uid) as number)['name']
    expect(nameOfParent(11)).toBe('Phase A')
    expect(nameOfParent(21)).toBe('Phase B')
    const spanOf = (uid: number): readonly [string, string] => {
      const one = taskOf(after, parentOf(uid) as number)
      return [dayPart(one['start']), dayPart(one['finish'])]
    }
    expect(spanOf(11)).toEqual(['2027-05-10', '2027-05-14'])
    expect(spanOf(21)).toEqual(['2027-06-01', '2027-06-09'])
    for (const uid of [before + 1, before + 2]) expect(groupIdDrawing(after, uid)).toBe(idOfGroupAt(0))
    expect(findingsOf(diagnose(after), 'VO-4')).toEqual([])
  })

  it('FM-1: checking only one of the two rows makes the parent for that row only', () => {
    const document = documentOf(GROUPS, TASKS)
    const only = proposalsOf(document).find((one) => one.fixRow === 'FA-25' && one.fixKind === 'choose' && one.taskUid === 21) as DelayFixRow
    const commands = delayFixCommands(proposalsOf(document, [{ key: only.key, checked: true, choice: null, date: null }]))
    const after = applyAll(document, commands)
    expect(taskOf(after, 21)['parentTaskUid']).toBe(highWaterMarkOf(document) + 1)
    expect(taskOf(after, 22)['parentTaskUid']).toBe(highWaterMarkOf(document) + 1)
    expect(taskOf(after, 11)['parentTaskUid']).toBeNull()
    expect(taskOf(after, 12)['parentTaskUid']).toBeNull()
  })
})

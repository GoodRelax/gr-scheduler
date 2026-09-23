// FR-011: a started actual's last day is never placed before the floor day, so its mark never reaches zero width.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import {
  editTask,
  type EditResult,
  type PlanActualPlacement,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, unbroken } from '../contract/spec-table'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const THE_FLOOR =
  '⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST） —— 床の日とは、`actualStart` の後に来る稼働日を `_assets/tbl-settings.md` の 表 T-201 の `S-129` − 1 個数えた日であり、`S-129` が 1 なら `actualStart` そのものである（マイルストーンは常に `actualStart`）。'

const ZERO_IS_LIFTED =
  '⭐ 下の段が数える長さが 0 になる置き方（最後の日が `actualStart` より前で、その間に稼働日が無い）は床の日へ持ち上げ、0 を下回る置き方は `05-07-design.md` の 表 T-220 の `IV-21` が拒む。'

const NOT_TO_ZERO = '掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT）'

const NOT_S_49 = '`S-49` を実績に当ててはならない（MUST NOT）'

const settingDefault = (rowId: string): number => {
  const row = specTable('T-201').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-201 has no row ${rowId}`)
  const cell = row.by['既定値']
  if (cell === undefined) throw new Error(`table T-201 has no 既定値 column`)
  const value = Number(bare(cell))
  if (!Number.isFinite(value)) throw new Error(`${rowId}'s 既定値 is ${cell}, not a number`)
  return value
}

const ACTUAL_INITIAL_DURATION = settingDefault('S-129')

const MILESTONE_ACTUAL_DURATION = settingDefault('S-130')

const jan = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: null,
    start: null,
    finish: null,
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...part,
  }) as unknown as Task

const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    taskUid: 1,
    shapeKind: null,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
    ...part,
  }) as unknown as TaskVisual

const groupOf = (part: Record<string, unknown>): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    label: 'row',
    derivedFromTaskUid: null,
    order: 0,
    isCollapsed: null,
    isHidden: null,
    color: null,
    height: null,
    ...part,
  }) as unknown as TaskGroup

const scheduleOf = (part: Record<string, unknown>): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: 214,
      uidHighWaterMark: 10,
      importSeq: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
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
    ...part,
  }) as unknown as Schedule

const SETTINGS = {
  importMinDate: '1970-01-01',
  importMaxDate: '2200-12-31',
  actualInitialDuration: ACTUAL_INITIAL_DURATION,
  milestoneActualDuration: MILESTONE_ACTUAL_DURATION,
  maxGroupDepth: 5,
  stackSafetyCap: 255,
} as unknown as DocumentSettings

const documentOf = (schedule: Record<string, unknown> = {}): Document =>
  ({
    schemaVersion: '1',
    schedule: scheduleOf(schedule),
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const started = (task: Record<string, unknown> = {}, visual: Record<string, unknown> = {}): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 1,
        name: 'Design',
        start: jan(5),
        finish: jan(9),
        actualStart: jan(5),
        stop: jan(8),
        resumeValid: true,
        ...task,
      }),
    ],
    taskGroups: [groupOf({ id: 'g1' })],
    taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
    taskVisuals: [visualOf({ taskUid: 1, ...visual })],
  })

const accepted = (result: EditResult): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; '))
  return result.document
}

const taskIn = (document: Document, uid: number): Task =>
  document.schedule.tasks.find((task) => task.uid === uid)!

const lastDayIn = (document: Document): string | null => {
  const task = taskIn(document, 1)
  return task.actualFinish ?? task.stop
}

const placing = (document: Document, put: PlanActualPlacement): EditResult =>
  editTask(document, { kind: 'setTaskPlanActualState', uid: 1, place: put } as TaskCommand, DEFAULT_ROW_NAME_FIXTURE)

const place = (document: Document, put: PlanActualPlacement): Document => accepted(placing(document, put))

const SUNDAY_BEFORE = jan(4)
const FRIDAY_BEFORE = jan(2)

describe('FR-011 -- a started actual never falls below the floor day', () => {
  it('the manuscript still asks for the floor, and still bars the plan-side one', () => {
    expect(REQUIREMENTS).toContain(THE_FLOOR)
    expect(REQUIREMENTS).toContain(ZERO_IS_LIFTED)
    expect(REQUIREMENTS).toContain(NOT_TO_ZERO)
    expect(REQUIREMENTS).toContain(NOT_S_49)
    expect(ACTUAL_INITIAL_DURATION).toBe(1)
  })

  it('a last day placed zero days from actualStart comes back on the floor day', () => {
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), stop: SUNDAY_BEFORE })
    expect(taskIn(next, 1).stop).toBe(jan(5))
    expect(taskIn(next, 1).stop).not.toBe(SUNDAY_BEFORE)
  })

  it('every started row of table T-019 carries the same floor', () => {
    const rows: readonly PlanActualPlacement[] = [
      { row: 'PA-2', actualStart: jan(5), stop: SUNDAY_BEFORE },
      { row: 'PA-3', actualStart: jan(5), stop: SUNDAY_BEFORE, resume: jan(20) },
      { row: 'PA-4', actualStart: jan(5), stop: SUNDAY_BEFORE },
      { row: 'PA-5', actualStart: jan(5), actualFinish: SUNDAY_BEFORE },
    ]
    for (const put of rows) {
      expect(lastDayIn(place(started(), put)), put.row).toBe(jan(5))
    }
  })

  it('a last day already on or after the floor day is left exactly as it was placed, a rest day included', () => {
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), stop: jan(7) })
    expect(taskIn(next, 1).stop).toBe(jan(7))
    const onSaturday = place(started(), { row: 'PA-2', actualStart: jan(5), stop: jan(10) })
    expect(taskIn(onSaturday, 1).stop).toBe(jan(10))
  })

  it('a last day placed below zero days is refused by IV-21 and not lifted', () => {
    const result = placing(started(), { row: 'PA-2', actualStart: jan(5), stop: FRIDAY_BEFORE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.refusals[0]?.rule).toBe('IV-21')
  })

  it('a milestone is floored on its actualStart, because it has no actual bar to lose', () => {
    const next = place(started({ milestone: true }, { shapeKind: 'milestone' }), {
      row: 'PA-2',
      actualStart: jan(5),
      stop: SUNDAY_BEFORE,
    })
    expect(taskIn(next, 1).stop).toBe(taskIn(next, 1).actualStart)
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
  })

  it('PA-1 still empties the columns, because 未着手 is not a started task', () => {
    const next = place(started(), { row: 'PA-1' })
    expect(taskIn(next, 1).stop).toBeNull()
    expect(taskIn(next, 1).actualStart).toBeNull()
  })

  it('the plan is not touched, so no S-49 reaches the actual', () => {
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), stop: SUNDAY_BEFORE })
    expect(taskIn(next, 1).start).toBe(jan(5))
    expect(taskIn(next, 1).finish).toBe(jan(9))
  })
})

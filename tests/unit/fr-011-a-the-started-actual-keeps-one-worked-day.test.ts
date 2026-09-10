// FR-011 -- a started actual never falls below `S-129`, so the mark that is
// also its hold never reaches zero width.
//
// ⭐ THE LEDGER ROW THIS CLOSES (利用者の申し立て 2026-09-10, 逐語):
// 「実績を 0 日にしたら実績の変更ができなくなる。 実績が 0 でもつかみシロは仕様
// 通りに確保しろ」 -- the actual could be shrunk to zero worked days, and once
// it was, nothing could grab it again.
//
// ⛔ THE REASON IT BECAME UNGRABBABLE IS THE OTHER RULING OF THE SAME DAY. The
// closing rule of table T-023d now reads 「`GR-9` / `GR-17` / `GR-18` の当たり
// 判定は、`FR-043` が描いた印そのものとすること（MUST）」, so the hold IS the
// ink -- and ink of zero width is a hold of zero width. ⚠️ A floor in PIXELS
// would not do: the same floor has to hold at every zoom, and a count of worked
// days is the only figure that does.
//
// ⚠️ These cases are read off docs/spec and not off the unit (1.9): the figure
// is taken from 表 T-201 at read time, and the sentence that asks for it is
// asserted against the manuscript itself before anything is driven.
//
// ⚠️ The command is reached through `edit-document.ts`, the public entry of the
// component (Chapter 5.3).

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
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, and the sentence these cases exist for
// ---------------------------------------------------------------------------

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** `FR-011`'s floor, held verbatim (利用者の裁定 2026-09-10). */
const THE_FLOOR =
  '着手しているタスクの `actualDuration` は、`_assets/tbl-settings.md` の 表 T-201 の `S-129` を下回らせないこと（MUST）。掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT）'

/** ⛔ And the floor the same sentence forbids borrowing from the plan side. */
const NOT_S_49 = '`S-49` を実績に当ててはならない（MUST NOT）'

/** One numbered setting's 既定値, taken from 表 T-201 at read time (1.9). */
const settingDefault = (rowId: string): number => {
  const row = specTable('T-201').rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-201 has no row ${rowId}`)
  const cell = row.by['既定値']
  if (cell === undefined) throw new Error(`table T-201 has no 既定値 column`)
  const value = Number(bare(cell))
  if (!Number.isFinite(value)) throw new Error(`${rowId}'s 既定値 is ${cell}, not a number`)
  return value
}

/** `S-129` — the length one grab places, and now the floor as well. */
const ACTUAL_INITIAL_DURATION = settingDefault('S-129')

/** `S-130` — a milestone is a point, so its actual carries this length. */
const MILESTONE_ACTUAL_DURATION = settingDefault('S-130')

// ---------------------------------------------------------------------------
// Fixtures -- 2026-01-05 is a Monday, so 05 .. 09 is one working week
// ---------------------------------------------------------------------------

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
    ...part,
  }) as unknown as Task

const visualOf = (part: Record<string, unknown>): TaskVisual =>
  ({
    taskUid: 1,
    nameAnchor: null,
    nameAlign: null,
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
  importMinDate: '1970-01-01', // S-119
  importMaxDate: '2200-12-31', // S-120
  actualInitialDuration: ACTUAL_INITIAL_DURATION, // S-129
  milestoneActualDuration: MILESTONE_ACTUAL_DURATION, // S-130
  maxGroupDepth: 5, // S-125
  stackSafetyCap: 255, // S-89
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

/** A bar-shaped task already in progress, which is what a grab shrinks. */
const started = (task: Record<string, unknown> = {}, visual: Record<string, unknown> = {}): Document =>
  documentOf({
    tasks: [
      taskOf({
        uid: 1,
        name: 'Design',
        start: jan(5),
        finish: jan(9),
        actualStart: jan(5),
        actualDuration: 4,
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

const place = (document: Document, put: PlanActualPlacement): Document =>
  accepted(
    editTask(document, { kind: 'setTaskPlanActualState', uid: 1, place: put } as TaskCommand),
  )

// ---------------------------------------------------------------------------

describe('FR-011 -- a started actual never falls below S-129', () => {
  it('the manuscript still asks for the floor, and still bars the plan-side one', () => {
    // ⚠️ The guard runs first so that a case going green after the clause was
    // deleted is impossible: without this, the rest would keep passing against
    // a requirement nobody asks for any more.
    expect(REQUIREMENTS).toContain(THE_FLOOR)
    expect(REQUIREMENTS).toContain(NOT_S_49)
    expect(ACTUAL_INITIAL_DURATION).toBe(1)
  })

  it('a bar shrunk to zero worked days comes back at S-129', () => {
    // ⭐ THE DEFECT ITSELF: 「実績を 0 日にしたら実績の変更ができなくなる」.
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), actualDuration: 0 })
    expect(taskIn(next, 1).actualDuration).toBe(ACTUAL_INITIAL_DURATION)
    expect(taskIn(next, 1).actualDuration).not.toBe(0)
  })

  it('every started row of table T-019 carries the same floor', () => {
    // ⚠️ PA-2 .. PA-5 are the rows FR-011 calls 着手しているタスク; PA-1 is the
    // one that is not, and it is the case below.
    const rows: readonly PlanActualPlacement[] = [
      { row: 'PA-2', actualStart: jan(5), actualDuration: 0 },
      { row: 'PA-3', actualStart: jan(5), actualDuration: 0, resume: jan(20) },
      { row: 'PA-4', actualStart: jan(5), actualDuration: 0 },
      { row: 'PA-5', actualStart: jan(5), actualDuration: 0, actualFinish: jan(9) },
    ] as unknown as readonly PlanActualPlacement[]
    for (const put of rows) {
      expect(taskIn(place(started(), put), 1).actualDuration).toBe(ACTUAL_INITIAL_DURATION)
    }
  })

  it('a length already above the floor is left exactly as it was placed', () => {
    // ⛔ A FLOOR AND NOT A REWRITE: FR-011's own 「人が置いていない限り両端を動か
    // さないこと（MUST NOT）」 is what bars touching a length the hand did place.
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), actualDuration: 3 })
    expect(taskIn(next, 1).actualDuration).toBe(3)
  })

  it('a milestone keeps S-130, because it has no actual bar to lose', () => {
    // ⭐ THE EXCEPTION IS THE MANUSCRIPT'S OWN. 表 T-023d の `GR-15` gives a
    // milestone no actual bar, and `S-130` is 0 worked days -- so the floor
    // FR-011 places over 実績バー has nothing to stand on here. ⛔ Flooring it
    // at `S-129` would give a point a length, which 表 T-012 の `SH-5` forbids.
    const next = place(started({ milestone: true }, { shapeKind: 'milestone' }), {
      row: 'PA-2',
      actualStart: jan(5),
      actualDuration: 0,
    } as unknown as PlanActualPlacement)
    expect(taskIn(next, 1).actualDuration).toBe(MILESTONE_ACTUAL_DURATION)
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
  })

  it('PA-1 still empties the column, because 未着手 is not a started task', () => {
    // ⚠️ 「実績を丸ごと消す道は本行が閉ざすものではない」 -- FR-011 says so in as
    // many words, and this is that road.
    const next = place(started(), { row: 'PA-1' } as unknown as PlanActualPlacement)
    expect(taskIn(next, 1).actualDuration).toBeNull()
    expect(taskIn(next, 1).actualStart).toBeNull()
  })

  it('the plan is not touched, so no S-49 reaches the actual', () => {
    const next = place(started(), { row: 'PA-2', actualStart: jan(5), actualDuration: 0 })
    expect(taskIn(next, 1).start).toBe(jan(5))
    expect(taskIn(next, 1).finish).toBe(jan(9))
  })
})

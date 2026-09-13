// DFC-572 -- table T-021a PV-1 and PV-2 write `actualFinish` as the actual
// FINISH DAY (FR-011), one worked day before the right end of the actual bar,
// and never the right end itself. A milestone's finish day is its actualStart.
//
// Where table T-218 puts this file: TS-6, tests/unit/.
//
// Written from docs/spec only. What was read of src/: the exported types and
// the public entry `editTask` of edit-document.ts, and the fixture shapes of
// tests/unit/edit-task.test.ts. No function body set an expected value.
//
// Every day below is counted by this file's own arithmetic over the default
// calendar (table T-209 S-106 Monday to Friday, S-107 no exceptions), not by
// the calendar members of src/, so a unit that walks the calendar wrongly
// cannot agree with itself here.
//
// January 2026: the 5th is a Monday, the 9th a Friday, the 12th a Monday.
//
// Entry points that write actualFinish on a finish (counted for the report):
//   1. the status mark press -> cycleTaskPlanActualState (PV-1 / PV-2)
//   2. the Agent API applyCommands -> the same DocumentCommand
//   3. a grab of the actual end (GO-3 / GO-4) -> setTaskPlanActualState
// This file drives entry 1's command through `editTask`, which entry 2 also
// reaches. Entry 3 is DFC-507's and is not covered here.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  planActualState,
  type Schedule,
  type Task,
  type TaskGroup,
  type TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { editTask, type EditResult } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The clauses, held verbatim, each on one unbroken line
// ---------------------------------------------------------------------------

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_011_SAME_DAY_IS_ONE_DAY =
  '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。'

const FR_011_RIGHT_END_IS_A_POSITION =
  '0 日としてはならない（MUST NOT） —— ⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— `actualStart` に `actualDuration` を稼働日で加えた日の、その列の左端であり、実績の終了日はその 1 稼働日前の日である。'

const FR_011_DO_NOT_READ_RIGHT_END_AS_FINISH =
  '⚠️ **「右端」を終了日と読んではならない（MUST NOT）** —— そう読むと「開始日 ＝ 終了日 ⟺ 長さ 0 日」になり、開始日と終了日が同じ実績を 1 日とする上の規則に反する。'

const FR_011_MILESTONE =
  '⚠️ マイルストーンにはこの読みを当てない —— 長さを持たない点なので（`S-130`、表 T-012 の `SH-5`）、実績の終了日は `actualStart` と同じ日である。'

const PV_1_ACTUAL_FINISH =
  '`actualFinish` ＝ `PV-2` と同じ読み（`FR-011` の実績の終了日。実績バーの右端そのものではない）、⛔ **本行が独自の読み方を持ってはならない（MUST NOT）**'

const PV_2_CELL =
  '`actualFinish` ＝ **実績の終了日**（`FR-011`。実績バーの右端の 1 稼働日前であって、右端そのものではない）、**`resumeValid` ＝ `false`**。**左端も右端も動かさない**'

const T_021A = specTable('T-021a')

const cellOfRow = (rowId: string): string => {
  const row = T_021A.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-021a has no row ${rowId}`)
  const cell = row.by['置く値']
  if (cell === undefined) throw new Error(`table T-021a has no column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

// ---------------------------------------------------------------------------
// The calendar, counted here (T-209 S-106 / S-107)
// ---------------------------------------------------------------------------

const S_106 = specTable('T-209').rows.find((one) => one.id === 'S-106')
const S_107 = specTable('T-209').rows.find((one) => one.id === 'S-107')

const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

const dayAfter = (iso: string): string => {
  const next = new Date(`${iso}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

/** `count` worked days on from `iso`. */
const workedDaysAfter = (iso: string, count: number): string => {
  let at = iso
  for (let left = count; left > 0; left -= 1) {
    do {
      at = dayAfter(at)
    } while (!isWorkedDay(at))
  }
  return at
}

/** FR-011: the right end is actualStart plus actualDuration worked days (a position). */
const rightEndOf = (start: string, duration: number): string => workedDaysAfter(start, duration)

/** FR-011: the finish day is one worked day before the right end; same day for 1. */
const finishDayOf = (start: string, duration: number): string => {
  if (duration < 1) throw new Error('finishDayOf is the bar reading; a milestone uses actualStart')
  return workedDaysAfter(start, duration - 1)
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

/** EX-7: a day GRS decided itself is written at midnight. */
const stored = (iso: string): string => `${iso}T00:00:00`

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const settingsOf = (): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: 1,
    wbsParentUid: null,
    wbsOrder: null,
    name: 'Design',
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

const visualOf = (shapeKind: string): TaskVisual =>
  ({
    taskUid: 1,
    nameAnchor: null,
    nameAlign: null,
    shapeKind,
    milestoneGlyph: null,
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

const groupOf = (): TaskGroup =>
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
  }) as unknown as TaskGroup

const documentWith = (task: Task, shapeKind: string): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'DFC-572',
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
      tasks: [task],
      resources: [],
      assignments: [],
      taskGroups: [groupOf()],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [visualOf(shapeKind)],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    } as unknown as Schedule,
    documentSettings: settingsOf(),
    documentStamp: {
      scheduleUpdatedUtc: '2026-09-14T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-09-14T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const accepted = (result: EditResult): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.refusals.map((one) => `${one.rule}: ${one.what}`).join('; '))
  return result.document
}

const pressed = (document: Document): Task => {
  const next = accepted(editTask(document, { kind: 'cycleTaskPlanActualState', uid: 1 }))
  const found = next.schedule.tasks.find((one) => one.uid === 1)
  if (found === undefined) throw new Error('Task 1 left the document')
  return found
}

const numberSetting = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

/** S-129 and S-130. */
const ACTUAL_INITIAL_DURATION = numberSetting('actualInitialDuration')
const MILESTONE_ACTUAL_DURATION = numberSetting('milestoneActualDuration')

// ---------------------------------------------------------------------------
// Premises
// ---------------------------------------------------------------------------

describe('DFC-572 premises: the clauses and the calendar still read this way', () => {
  it('FR-011 still holds the finish-day reading and the milestone exception verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_011_SAME_DAY_IS_ONE_DAY)
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_DO_NOT_READ_RIGHT_END_AS_FINISH)
    expect(REQUIREMENTS).toContain(FR_011_MILESTONE)
  })

  it('table T-021a PV-1 and PV-2 still name the finish day, not the right end', () => {
    expect(cellOfRow('PV-1')).toContain(PV_1_ACTUAL_FINISH)
    expect(cellOfRow('PV-2')).toBe(PV_2_CELL)
  })

  it('the default calendar is Monday to Friday with no exceptions, and S-129 is 1, S-130 is 0', () => {
    const worked = S_106?.by['値'] ?? ''
    for (const weekday of ['月', '火', '水', '木', '金']) expect(worked).toContain(weekday)
    for (const weekend of ['土', '日']) expect(worked).not.toContain(weekend)
    expect(S_107?.by['値'] ?? '').toContain('無し')
    expect(ACTUAL_INITIAL_DURATION).toBe(1)
    expect(MILESTONE_ACTUAL_DURATION).toBe(0)
    expect(isWorkedDay(ymd(9))).toBe(true)
    expect(isWorkedDay(ymd(10))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// PV-1: not started -> finished
// ---------------------------------------------------------------------------

describe('DFC-572 table T-021a PV-1: not started -> finished writes the finish day', () => {
  it('⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。 -- PV-1 on a Monday writes actualFinish = actualStart', () => {
    const task = pressed(documentWith(taskOf({ start: stored(ymd(5)), finish: stored(ymd(9)) }), 'rectangle'))
    expect(task.actualStart).toBe(stored(ymd(5)))
    expect(task.actualDuration).toBe(ACTUAL_INITIAL_DURATION)
    expect(task.actualFinish, 'FR-011 finish day').toBe(stored(finishDayOf(ymd(5), ACTUAL_INITIAL_DURATION)))
    expect(task.actualFinish, 'FR-011 finish day of a 1-day actual is its start').toBe(task.actualStart)
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(rightEndOf(ymd(5), ACTUAL_INITIAL_DURATION)))
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-1 on a Friday still finishes that Friday, not on the Monday the right end crosses the weekend to', () => {
    const task = pressed(documentWith(taskOf({ start: stored(ymd(9)), finish: stored(ymd(23)) }), 'rectangle'))
    expect(task.actualStart).toBe(stored(ymd(9)))
    expect(task.actualFinish, 'FR-011 finish day').toBe(stored(ymd(9)))
    expect(rightEndOf(ymd(9), ACTUAL_INITIAL_DURATION)).toBe(ymd(12))
    expect(task.actualFinish, 'MUST NOT: the right end (Monday)').not.toBe(stored(ymd(12)))
    expect(task.actualFinish, 'nor the calendar day after (Saturday)').not.toBe(stored(ymd(10)))
  })

  it('⚠️ マイルストーンにはこの読みを当てない —— 長さを持たない点なので（`S-130`、表 T-012 の `SH-5`）、実績の終了日は `actualStart` と同じ日である。 -- PV-1 on a milestone', () => {
    const task = pressed(
      documentWith(taskOf({ name: 'Ship', start: stored(ymd(9)), finish: stored(ymd(9)), milestone: true }), 'milestone'),
    )
    expect(task.actualDuration).toBe(MILESTONE_ACTUAL_DURATION)
    expect(task.actualStart).toBe(stored(ymd(9)))
    expect(task.actualFinish, 'FR-011: a milestone finishes on its actualStart').toBe(task.actualStart)
    expect(planActualState(task)).toBe('finished')
  })
})

// ---------------------------------------------------------------------------
// PV-2: in progress -> finished
// ---------------------------------------------------------------------------

describe('DFC-572 table T-021a PV-2: in progress -> finished writes the finish day', () => {
  const inProgress = (start: string, duration: number): Document =>
    documentWith(
      taskOf({ start: stored(ymd(5)), finish: stored(ymd(23)), actualStart: stored(start), actualDuration: duration, resumeValid: true }),
      'rectangle',
    )

  it('PV-2 within one week: three worked days from Monday finish on Wednesday, not on the Thursday right end', () => {
    const task = pressed(inProgress(ymd(5), 3))
    expect(task.actualFinish, 'FR-011 finish day').toBe(stored(finishDayOf(ymd(5), 3)))
    expect(finishDayOf(ymd(5), 3)).toBe(ymd(7))
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(ymd(8)))
    expect(task.actualStart).toBe(stored(ymd(5)))
    expect(task.actualDuration).toBe(3)
    expect(task.resumeValid).toBe(false)
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-2 across a weekend: three worked days from Thursday finish on Monday, not on the Tuesday right end', () => {
    const task = pressed(inProgress(ymd(8), 3))
    expect(finishDayOf(ymd(8), 3)).toBe(ymd(12))
    expect(rightEndOf(ymd(8), 3)).toBe(ymd(13))
    expect(task.actualFinish, 'FR-011 finish day').toBe(stored(ymd(12)))
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(ymd(13)))
    expect(task.actualStart).toBe(stored(ymd(8)))
    expect(task.actualDuration).toBe(3)
  })

  it('PV-2 on a one-day actual standing on a Friday finishes that Friday, not on the Monday right end', () => {
    const task = pressed(inProgress(ymd(9), 1))
    expect(task.actualFinish, 'FR-011 same-day actual is one day').toBe(stored(ymd(9)))
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(ymd(12)))
  })

  it('PV-2 on a milestone in progress finishes on its actualStart', () => {
    const task = pressed(
      documentWith(
        taskOf({
          name: 'Ship',
          start: stored(ymd(7)),
          finish: stored(ymd(7)),
          milestone: true,
          actualStart: stored(ymd(9)),
          actualDuration: MILESTONE_ACTUAL_DURATION,
          resumeValid: true,
        }),
        'milestone',
      ),
    )
    expect(task.actualFinish, 'FR-011: a milestone finishes on its actualStart').toBe(stored(ymd(9)))
    expect(task.actualStart).toBe(stored(ymd(9)))
  })
})

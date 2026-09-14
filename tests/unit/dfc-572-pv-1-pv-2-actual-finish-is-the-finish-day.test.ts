// DFC-572: PV-1 and PV-2 write actualFinish as the last actual day, not the right end (FR-011).

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

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_011_SAME_DAY_IS_ONE_DAY =
  '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。'

const FR_011_RIGHT_END_IS_A_POSITION =
  '0 日としてはならない（MUST NOT） —— ⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— 実績の最後の日の翌暦日の列の左端であり、実績の終了日は最後の日そのものである。'

const FR_011_DO_NOT_READ_RIGHT_END_AS_FINISH =
  '⚠️ **「右端」を終了日と読んではならない（MUST NOT）** —— そう読むと「開始日 ＝ 終了日 ⟺ 長さ 0 日」になり、開始日と終了日が同じ実績を 1 日とする上の規則に反する。'

const FR_011_MILESTONE =
  '⚠️ マイルストーンにはこの読みを当てない —— 長さを持たない点なので（`S-130`、表 T-012 の `SH-5`）、実績の終了日は `actualStart` と同じ日である。'

const PV_1_ACTUAL_FINISH =
  '⭐ `actualFinish` ＝ `FR-011` の床の日（`actualStart` の後に来る稼働日を `_assets/tbl-settings.md` の 表 T-201 の `S-129` − 1 個数えた日）（MUST）'

const PV_1_OWN_READING = '`stop` は空のまま、⛔ **本行が独自の読み方を持ってはならない（MUST NOT）**'

const PV_2_CELL =
  '`actualFinish` ＝ `stop`、`stop` ＝ 空（`FR-011`。2 つを 1 回の置き換えで行うこと（MUST） —— 間に「最後の日を持たない実績」を見せない。`actualFinish` は実績の最後の日そのものであり、実績バーの右端の位置ではない）、**`resumeValid` ＝ `false`**。**左端も右端も動かさない**'

const T_021A = specTable('T-021a')

const cellOfRow = (rowId: string): string => {
  const row = T_021A.rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table T-021a has no row ${rowId}`)
  const cell = row.by['置く値']
  if (cell === undefined) throw new Error(`table T-021a has no column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

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

// see FR-011, RV-1
const rightEndOf = (lastDay: string): string => dayAfter(lastDay)

// see FR-011
const lengthOf = (start: string, last: string): number => {
  let count = 0
  for (let at = start; at <= last; at = dayAfter(at)) {
    if (at === start || at === last || isWorkedDay(at)) count += 1
  }
  return count
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

// see EX-7
const stored = (iso: string): string => `${iso}T00:00:00`

const dayPart = (value: string | null): string => {
  if (value === null) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

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

const ACTUAL_INITIAL_DURATION = numberSetting('actualInitialDuration')
const MILESTONE_ACTUAL_DURATION = numberSetting('milestoneActualDuration')

describe('DFC-572 premises: the clauses and the calendar still read this way', () => {
  it('FR-011 still holds the last-day reading and the milestone exception verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_011_SAME_DAY_IS_ONE_DAY)
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_DO_NOT_READ_RIGHT_END_AS_FINISH)
    expect(REQUIREMENTS).toContain(FR_011_MILESTONE)
  })

  it('table T-021a PV-1 and PV-2 still name the last day, not the right end', () => {
    expect(cellOfRow('PV-1')).toContain(PV_1_ACTUAL_FINISH)
    expect(cellOfRow('PV-1')).toContain(PV_1_OWN_READING)
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

describe('DFC-572 table T-021a PV-1: not started -> finished writes the floor day', () => {
  it('⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。 -- PV-1 on a Monday writes actualFinish = actualStart', () => {
    const task = pressed(documentWith(taskOf({ start: stored(ymd(5)), finish: stored(ymd(9)) }), 'rectangle'))
    expect(task.actualStart).toBe(stored(ymd(5)))
    expect(task.stop, 'PV-1: stop stays empty').toBeNull()
    expect(task.actualFinish, 'PV-1 floor day').toBe(stored(ymd(5)))
    expect(task.actualFinish, 'FR-011 last day of a 1-day actual is its start').toBe(task.actualStart)
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(rightEndOf(ymd(5))))
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-1 on a Friday still finishes that Friday, not on the Saturday right end nor the next worked day', () => {
    const task = pressed(documentWith(taskOf({ start: stored(ymd(9)), finish: stored(ymd(23)) }), 'rectangle'))
    expect(task.actualStart).toBe(stored(ymd(9)))
    expect(task.actualFinish, 'PV-1 floor day').toBe(stored(ymd(9)))
    expect(rightEndOf(ymd(9))).toBe(ymd(10))
    expect(task.actualFinish, 'MUST NOT: the next worked day (Monday)').not.toBe(stored(ymd(12)))
    expect(task.actualFinish, 'MUST NOT: the right end (Saturday)').not.toBe(stored(ymd(10)))
  })

  it('⚠️ マイルストーンにはこの読みを当てない —— 長さを持たない点なので（`S-130`、表 T-012 の `SH-5`）、実績の終了日は `actualStart` と同じ日である。 -- PV-1 on a milestone', () => {
    const task = pressed(
      documentWith(taskOf({ name: 'Ship', start: stored(ymd(9)), finish: stored(ymd(9)), milestone: true }), 'milestone'),
    )
    expect(task.stop, 'PV-1: stop stays empty').toBeNull()
    expect(task.actualStart).toBe(stored(ymd(9)))
    expect(task.actualFinish, 'FR-011: a milestone finishes on its actualStart').toBe(task.actualStart)
    expect(planActualState(task)).toBe('finished')
  })
})

describe('DFC-572 table T-021a PV-2: in progress -> finished moves stop to actualFinish', () => {
  const inProgress = (start: string, last: string): Document =>
    documentWith(
      taskOf({ start: stored(ymd(5)), finish: stored(ymd(23)), actualStart: stored(start), stop: stored(last), resumeValid: true }),
      'rectangle',
    )

  it('PV-2 within one week: three worked days from Monday finish on Wednesday, not on the Thursday right end', () => {
    const task = pressed(inProgress(ymd(5), ymd(7)))
    expect(task.actualFinish, 'PV-2: actualFinish = stop').toBe(stored(ymd(7)))
    expect(lengthOf(ymd(5), dayPart(task.actualFinish))).toBe(3)
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(rightEndOf(ymd(7))))
    expect(task.actualStart).toBe(stored(ymd(5)))
    expect(task.stop, 'PV-2: stop = empty').toBeNull()
    expect(task.resumeValid).toBe(false)
    expect(planActualState(task)).toBe('finished')
  })

  it('PV-2 across a weekend: three worked days from Thursday finish on Monday, not on the Tuesday right end', () => {
    const task = pressed(inProgress(ymd(8), ymd(12)))
    expect(lengthOf(ymd(8), ymd(12))).toBe(3)
    expect(rightEndOf(ymd(12))).toBe(ymd(13))
    expect(task.actualFinish, 'PV-2: actualFinish = stop').toBe(stored(ymd(12)))
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(ymd(13)))
    expect(task.actualStart).toBe(stored(ymd(8)))
    expect(task.stop, 'PV-2: stop = empty').toBeNull()
  })

  it('PV-2 on a one-day actual standing on a Friday finishes that Friday, not on the Saturday right end', () => {
    const task = pressed(inProgress(ymd(9), ymd(9)))
    expect(task.actualFinish, 'FR-011 same-day actual is one day').toBe(stored(ymd(9)))
    expect(task.actualFinish, 'MUST NOT: the right end').not.toBe(stored(ymd(10)))
  })

  it('PV-2 on an actual whose last day is a Saturday finishes on that Saturday, not on a worked day', () => {
    const task = pressed(inProgress(ymd(9), ymd(10)))
    expect(isWorkedDay(ymd(10)), 'premise: a rest day').toBe(false)
    expect(task.actualFinish, 'PV-2: actualFinish = stop, even on a rest day').toBe(stored(ymd(10)))
    expect(task.actualFinish, 'not the worked day before').not.toBe(stored(ymd(9)))
    expect(task.actualFinish, 'not the worked day after').not.toBe(stored(ymd(12)))
    expect(task.stop).toBeNull()
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
          stop: stored(ymd(9)),
          resumeValid: true,
        }),
        'milestone',
      ),
    )
    expect(task.actualFinish, 'FR-011: a milestone finishes on its actualStart').toBe(stored(ymd(9)))
    expect(task.actualStart).toBe(stored(ymd(9)))
  })
})

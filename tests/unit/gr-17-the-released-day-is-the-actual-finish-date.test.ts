// GR-17 of table T-023d (FR-043): the day the finish handle is released on is the actual finish date.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  Schedule,
  Task,
  TaskGroup,
  TaskVisual,
} from '../../src/entity/document-model/schedule/schedule'
import { editTask, type EditResult } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const SETTINGS_TABLES = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8')

const FR_043_RELEASED_DAY_IS_THE_FINISH_DATE =
  '⭐ 終了点（表 T-023d の `GR-17`）を離した日は、表 T-245 の `GO-3` と同じく実績の終了日として数え、実績バーの右端の位置として数えないこと（MUST）'

const FR_043_SAME_DAY_AND_THE_FLOOR =
  '`GR-9` の日に離せば開始日と終了日が同じ日の実績になり、それより左に離したときは `FR-011` の床が受け持つ。'

const FR_011_SAME_DAY_IS_ONE =
  '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。'

const FR_011_RIGHT_END_IS_A_POSITION =
  '⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— `actualStart` に `actualDuration` を稼働日で加えた日の、その列の左端であり、実績の終了日はその 1 稼働日前の日である。'

const FR_011_FLOOR =
  '⭐ 着手しているタスクの `actualDuration` は、`_assets/tbl-settings.md` の 表 T-201 の `S-129` を下回らせないこと（MUST）。'

const GR_17_PINS_THE_START =
  '掴めば `actualDuration` を置く（`actualStart` は `GR-9` の日で確定。'

const DM_1_NEXT_WORKED_DAY = '**ダミーを描く位置は、予定の開始日の翌稼働日とすること（MUST）。**'

const S_106_WORKED_WEEKDAYS = '| S-106 | 稼働する曜日 | 月・火・水・木・金 🔎 |'

const S_107_NO_EXCEPTIONS = '| S-107 | 例外日（休業日） | **無し** 🔎 |'

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${tableId} has no ${heading} column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

const SATURDAY = 6
const SUNDAY = 0

const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== SUNDAY && weekday !== SATURDAY
}

const calendarDayAfter = (iso: string, step: number): string => {
  const at = new Date(`${iso}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + step)
  return at.toISOString().slice(0, 10)
}

const workedDaysFrom = (iso: string, count: number): string => {
  const step = count < 0 ? -1 : 1
  let at = iso
  let left = Math.abs(count)
  while (left > 0) {
    at = calendarDayAfter(at, step)
    if (isWorkedDay(at)) left -= 1
  }
  return at
}

const finishDateOf = (actualStartIso: string, actualDuration: number): string =>
  workedDaysFrom(workedDaysFrom(actualStartIso, actualDuration), -1)

const workedDaysInclusive = (fromIso: string, toIso: string): number => {
  let count = 0
  for (let at = fromIso; at <= toIso; at = calendarDayAfter(at, 1)) {
    if (isWorkedDay(at)) count += 1
  }
  return count
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

const stored = (iso: string): string => `${iso}T00:00:00`

const dayPart = (value: string | null): string | null => (value === null ? null : value.slice(0, 10))

const FRIDAY_PLAN_START = ymd(9)
const MONDAY_DUMMY_DAY = ymd(12)
const THURSDAY_PLAN_START = ymd(15)
const FRIDAY_DUMMY_DAY = ymd(16)
const PLAN_FINISH = ymd(30)

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

const notStarted = (planStart: string): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'GR-17',
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
      tasks: [
        {
          uid: 1,
          wbsParentUid: null,
          wbsOrder: null,
          name: 'Design',
          start: stored(planStart),
          finish: stored(PLAN_FINISH),
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
        } as unknown as Task,
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        {
          id: 'g1',
          parentId: null,
          label: 'row',
          derivedFromTaskUid: null,
          order: 0,
          isCollapsed: null,
          isHidden: null,
          color: null,
          height: null,
        } as unknown as TaskGroup,
      ],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [
        {
          taskUid: 1,
          nameAnchor: null,
          nameAlign: null,
          shapeKind: 'rectangle',
          milestoneGlyph: null,
          fillColor: null,
          strokeColor: null,
          lineWeight: null,
        } as unknown as TaskVisual,
      ],
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

const releasedFromGr17 = (planStart: string, droppedIso: string): EditResult =>
  editTask(notStarted(planStart), { kind: 'beginTaskActual', uid: 1, grabbed: 'GR-17', droppedDay: stored(droppedIso) })

const taskOf = (document: Document): Task => {
  const found = document.schedule.tasks.find((one) => one.uid === 1)
  if (found === undefined) throw new Error('Task 1 left the document')
  return found
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number

describe('GR-17 premises: the clauses and the calendar still read this way', () => {
  it('FR-043, FR-011, T-023d GR-17, DM-1, S-106 and S-107 still hold the clauses verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_043_RELEASED_DAY_IS_THE_FINISH_DATE)
    expect(REQUIREMENTS).toContain(FR_043_SAME_DAY_AND_THE_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_SAME_DAY_IS_ONE)
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(REQUIREMENTS).toContain(GR_17_PINS_THE_START)
    expect(cellOf('T-240', 'DM-1', '規則')).toContain(DM_1_NEXT_WORKED_DAY)
    expect(SETTINGS_TABLES).toContain(S_106_WORKED_WEEKDAYS)
    expect(SETTINGS_TABLES).toContain(S_107_NO_EXCEPTIONS)
  })

  it('the dummy days are the worked day after each plan start, and S-129 is 1', () => {
    expect(workedDaysFrom(FRIDAY_PLAN_START, 1)).toBe(MONDAY_DUMMY_DAY)
    expect(workedDaysFrom(THURSDAY_PLAN_START, 1)).toBe(FRIDAY_DUMMY_DAY)
    expect(isWorkedDay(ymd(17))).toBe(false)
    expect(isWorkedDay(ymd(18))).toBe(false)
    expect(S_129).toBe(1)
  })
})

describe('FR-043 (MUST): GR-17 released on or right of GR-9 day counts that day as the actual finish date', () => {
  const cases = [
    { title: 'released on GR-9 day: one worked day', planStart: FRIDAY_PLAN_START, dummy: MONDAY_DUMMY_DAY, dropped: MONDAY_DUMMY_DAY, length: 1 },
    { title: 'released on the worked day after GR-9 day: two worked days', planStart: FRIDAY_PLAN_START, dummy: MONDAY_DUMMY_DAY, dropped: ymd(13), length: 2 },
    { title: 'released across a weekend, Friday dummy to Monday: two worked days', planStart: THURSDAY_PLAN_START, dummy: FRIDAY_DUMMY_DAY, dropped: ymd(19), length: 2 },
  ]
  for (const one of cases) {
    it(`${one.title}, finishing on the released day`, () => {
      expect(workedDaysInclusive(one.dummy, one.dropped), 'the fixture counts start and finish days inclusively').toBe(one.length)
      const result = releasedFromGr17(one.planStart, one.dropped)
      expect(result.ok, FR_043_RELEASED_DAY_IS_THE_FINISH_DATE).toBe(true)
      if (!result.ok) return
      const task = taskOf(result.document)
      expect(dayPart(task.actualStart), GR_17_PINS_THE_START).toBe(one.dummy)
      expect(task.actualDuration, FR_043_RELEASED_DAY_IS_THE_FINISH_DATE).toBe(one.length)
      expect(finishDateOf(one.dummy, task.actualDuration!), FR_011_RIGHT_END_IS_A_POSITION).toBe(one.dropped)
      expect(task.resumeValid).toBe(true)
    })
  }
})

describe('FR-043: GR-17 released left of GR-9 day is left to the FR-011 floor', () => {
  it('released one worked day left: zero by the finish-date reading, so S-129 is written', () => {
    const dropped = workedDaysFrom(MONDAY_DUMMY_DAY, -1)
    expect(workedDaysInclusive(MONDAY_DUMMY_DAY, dropped), 'the finish-date reading gives zero').toBe(0)
    const result = releasedFromGr17(FRIDAY_PLAN_START, dropped)
    expect(result.ok, FR_043_SAME_DAY_AND_THE_FLOOR).toBe(true)
    if (!result.ok) return
    const task = taskOf(result.document)
    expect(dayPart(task.actualStart), GR_17_PINS_THE_START).toBe(MONDAY_DUMMY_DAY)
    expect(task.actualDuration, FR_011_FLOOR).toBe(S_129)
  })

  it('released two worked days left: negative, so it writes nothing or nothing below S-129', () => {
    const dropped = workedDaysFrom(MONDAY_DUMMY_DAY, -2)
    const result = releasedFromGr17(FRIDAY_PLAN_START, dropped)
    if (!result.ok) {
      expect(result.refusals.length, 'a refusal names at least one rule').toBeGreaterThan(0)
      return
    }
    const task = taskOf(result.document)
    if (task.actualStart === null) return
    expect(task.actualDuration, FR_011_FLOOR).not.toBeNull()
    expect(task.actualDuration!, FR_011_FLOOR).toBeGreaterThanOrEqual(S_129)
  })
})

// GA-6 of table T-023d (FR-043): the day the finish handle is released on is the last actual day.

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

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const SETTINGS_TABLES = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8')

const FR_043_RELEASED_DAY_IS_THE_LAST_DAY =
  '⭐ 終了点（`FR-104` の 表 T-266 の `GA-6`）を離した日は、表 T-245 の `GO-7` のとおり実績の最後の日（`stop`）として置き、実績バーの右端の位置として数えないこと（MUST）'

const FR_043_SAME_DAY_AND_THE_FLOOR =
  '予定の開始日に離せば開始日と終了日が同じ日の実績になり、それより左に離したときは `FR-011` の床と `05-07-design.md` の 表 T-220 の `IV-21` が受け持つ。'

const FR_011_SAME_DAY_IS_ONE =
  '⭐ 実績の開始日と終了日が同じ日であるとき、その実績は 1 日とすること（MUST）。'

const FR_011_RIGHT_END_IS_A_POSITION =
  '⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— 実績の最後の日の翌暦日の列の左端であり、実績の終了日は最後の日そのものである。'

const FR_011_FLOOR =
  '⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST）'

const FR_011_ENDS_COUNT_ON_REST_DAYS =
  '⭐ ただし両端の日（`actualStart` と最後の日）は、非稼働日であっても 1 日として数えること（MUST）'

const GO_7_PINS_THE_START =
  '実績の最後の日 ＝ 離した日そのもの、`actualStart` ＝ 予定の開始日、`resumeValid` ＝ `true`'

const IV_21_NOT_BELOW_ZERO =
  '`actualStart` と実績の最後の日（完了なら `actualFinish`、それ以外は `stop`）がともに非 `null` の `Task` で、`FR-011` が日付から数えた実績の長さが 0 を下回らないこと。'

const DM_1_THE_PLAN_START_DAY = '**ダミーを描く位置は、予定の開始日とすること（MUST）'

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

// see FR-011
const actualLength = (startIso: string, lastIso: string): number => {
  let count = 0
  if (lastIso < startIso) {
    for (let at = lastIso; at < startIso; at = calendarDayAfter(at, 1)) {
      if (isWorkedDay(at)) count -= 1
    }
    return count
  }
  for (let at = startIso; at <= lastIso; at = calendarDayAfter(at, 1)) {
    if (at === startIso || at === lastIso || isWorkedDay(at)) count += 1
  }
  return count
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

const stored = (iso: string): string => `${iso}T00:00:00`

const dayPart = (value: string | null): string | null => (value === null ? null : value.slice(0, 10))

const MONDAY_PLAN_START = ymd(12)
const MONDAY_DUMMY_DAY = MONDAY_PLAN_START
const FRIDAY_PLAN_START = ymd(16)
const FRIDAY_DUMMY_DAY = FRIDAY_PLAN_START
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
        title: 'GA-6',
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
          treeState: 'auto', color: null,
          height: null,
        } as unknown as TaskGroup,
      ],
      taskGroupMembers: [{ taskUid: 1, groupId: 'g1', stackOrder: null }],
      taskVisuals: [
        {
          taskUid: 1,
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
  editTask(notStarted(planStart), { kind: 'beginTaskActual', uid: 1, grabbed: 'GA-6', droppedDay: stored(droppedIso) }, DEFAULT_ROW_NAME_FIXTURE)

const taskOf = (document: Document): Task => {
  const found = document.schedule.tasks.find((one) => one.uid === 1)
  if (found === undefined) throw new Error('Task 1 left the document')
  return found
}

const S_129 = SETTINGS_DEFAULTS['actualInitialDuration'] as number

describe('GA-6 premises: the clauses and the calendar still read this way', () => {
  it('FR-043, FR-011, T-023d GA-6, IV-21, DM-1, S-106 and S-107 still hold the clauses verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_043_RELEASED_DAY_IS_THE_LAST_DAY)
    expect(REQUIREMENTS).toContain(FR_043_SAME_DAY_AND_THE_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_SAME_DAY_IS_ONE)
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_ENDS_COUNT_ON_REST_DAYS)
    expect(REQUIREMENTS).toContain(GO_7_PINS_THE_START)
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain(IV_21_NOT_BELOW_ZERO)
    expect(cellOf('T-240', 'DM-1', '規則')).toContain(DM_1_THE_PLAN_START_DAY)
    expect(SETTINGS_TABLES).toContain(S_106_WORKED_WEEKDAYS)
    expect(SETTINGS_TABLES).toContain(S_107_NO_EXCEPTIONS)
  })

  it('the dummy days are each plan start day itself (DM-1), and S-129 is 1', () => {
    expect(MONDAY_DUMMY_DAY).toBe(MONDAY_PLAN_START)
    expect(FRIDAY_DUMMY_DAY).toBe(FRIDAY_PLAN_START)
    expect(isWorkedDay(MONDAY_PLAN_START)).toBe(true)
    expect(isWorkedDay(FRIDAY_PLAN_START)).toBe(true)
    expect(isWorkedDay(ymd(17))).toBe(false)
    expect(isWorkedDay(ymd(18))).toBe(false)
    expect(S_129).toBe(1)
  })
})

describe('FR-043 (MUST): GA-6 released on or right of GA-5 day puts that day as stop', () => {
  const cases = [
    { title: 'released on GA-5 day: one day', planStart: MONDAY_PLAN_START, dummy: MONDAY_DUMMY_DAY, dropped: MONDAY_DUMMY_DAY, length: 1 },
    { title: 'released on the worked day after GA-5 day: two days', planStart: MONDAY_PLAN_START, dummy: MONDAY_DUMMY_DAY, dropped: ymd(13), length: 2 },
    { title: 'released across a weekend, Friday dummy to Monday: two days', planStart: FRIDAY_PLAN_START, dummy: FRIDAY_DUMMY_DAY, dropped: ymd(19), length: 2 },
    { title: 'released on the Saturday after a Friday dummy: two days', planStart: FRIDAY_PLAN_START, dummy: FRIDAY_DUMMY_DAY, dropped: ymd(17), length: 2 },
  ]
  for (const one of cases) {
    it(`${one.title}, the last day is the released day`, () => {
      expect(actualLength(one.dummy, one.dropped), 'the oracle counts both end days').toBe(one.length)
      const result = releasedFromGr17(one.planStart, one.dropped)
      expect(result.ok, FR_043_RELEASED_DAY_IS_THE_LAST_DAY).toBe(true)
      if (!result.ok) return
      const task = taskOf(result.document)
      expect(dayPart(task.actualStart), GO_7_PINS_THE_START).toBe(one.dummy)
      expect(dayPart(task.stop), FR_043_RELEASED_DAY_IS_THE_LAST_DAY).toBe(one.dropped)
      expect(actualLength(one.dummy, dayPart(task.stop)!), FR_011_RIGHT_END_IS_A_POSITION).toBe(one.length)
      expect(task.resumeValid).toBe(true)
    })
  }
})

describe('FR-043: GA-6 released left of GA-5 day is left to the FR-011 floor and IV-21', () => {
  it('released on the Sunday before a Monday dummy: zero by the FR-011 count, so stop is the floor day', () => {
    const dropped = ymd(11)
    expect(actualLength(MONDAY_DUMMY_DAY, dropped), 'the FR-011 count gives zero').toBe(0)
    const result = releasedFromGr17(MONDAY_PLAN_START, dropped)
    expect(result.ok, FR_043_SAME_DAY_AND_THE_FLOOR).toBe(true)
    if (!result.ok) return
    const task = taskOf(result.document)
    expect(dayPart(task.actualStart), GO_7_PINS_THE_START).toBe(MONDAY_DUMMY_DAY)
    expect(dayPart(task.stop), FR_011_FLOOR).toBe(workedDaysFrom(MONDAY_DUMMY_DAY, S_129 - 1))
  })

  it('released two worked days left: negative, so IV-21 refuses it and writes nothing', () => {
    const dropped = workedDaysFrom(MONDAY_DUMMY_DAY, -2)
    const result = releasedFromGr17(MONDAY_PLAN_START, dropped)
    expect(result.ok, IV_21_NOT_BELOW_ZERO).toBe(false)
    if (result.ok) return
    expect(result.refusals[0]?.rule, IV_21_NOT_BELOW_ZERO).toBe('IV-21')
  })
})

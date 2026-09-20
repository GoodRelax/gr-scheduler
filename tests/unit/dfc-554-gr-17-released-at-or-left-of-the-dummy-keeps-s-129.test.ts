// DFC-554: GA-6 released at or left of the dummy day keeps the FR-011 floor day, or is refused by IV-21.

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

const ERD_DETAIL = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')

const FR_011_FLOOR =
  '⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST）'

const FR_011_ZERO_LIFTED =
  '⭐ 下の段が数える長さが 0 になる置き方（最後の日が `actualStart` より前で、その間に稼働日が無い）は床の日へ持ち上げ、0 を下回る置き方は `05-07-design.md` の 表 T-220 の `IV-21` が拒む。'

const FR_011_NOT_TO_ZERO =
  '掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT） —— ⛔ 掴み代は描かれた印そのものなので（表 T-023d の結び）、長さが 0 になるとインクも掴み代も 0 になり、二度と掴めなくなる。'

const FR_043_ZERO_ACCEPTED =
  '終了点を開始点の位置まで動かして長さを 0 にすることは受け入れる —— そのあと長さを直すのはプロパティパネル（表 T-016 の `PR-5`）である。'

const FR_043_ZERO_IS_A_POSITION =
  '⚠️ **ここでいう 0 は位置の話である** —— **開始日と終了日が同じ日の実績は 1 日であり、0 日ではない**（`FR-011`）。'

const GO_7_PINS_THE_START =
  '実績の最後の日 ＝ 離した日そのもの、`actualStart` ＝ 予定の開始日、`resumeValid` ＝ `true`'

const DM_1_THE_PLAN_START_DAY = '**ダミーを描く位置は、予定の開始日とすること（MUST）'

const AT_39_NOT_NEGATIVE = '| `Task` | `percentComplete` | 整数（0 以上） |'

const IV_21_NOT_BELOW_ZERO =
  '`actualStart` と実績の最後の日（完了なら `actualFinish`、それ以外は `stop`）がともに非 `null` の `Task` で、`FR-011` が日付から数えた実績の長さが 0 を下回らないこと。'

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${tableId} has no ${heading} column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

const dayAfter = (iso: string): string => {
  const at = new Date(`${iso}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + 1)
  return at.toISOString().slice(0, 10)
}

// see FR-011
const signedLength = (startIso: string, lastIso: string): number => {
  let count = 0
  if (lastIso < startIso) {
    for (let at = lastIso; at < startIso; at = dayAfter(at)) if (isWorkedDay(at)) count -= 1
    return count
  }
  for (let at = startIso; at <= lastIso; at = dayAfter(at)) {
    if (at === startIso || at === lastIso || isWorkedDay(at)) count += 1
  }
  return count
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

const stored = (iso: string): string => `${iso}T00:00:00`

const PLAN_START = ymd(12)
const PLAN_FINISH = ymd(23)
const DUMMY_DAY = PLAN_START

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

const notStarted = (): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: {
        title: 'DFC-554',
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
          start: stored(PLAN_START),
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

const releasedFromGr17 = (droppedIso: string): EditResult =>
  editTask(notStarted(), { kind: 'beginTaskActual', uid: 1, grabbed: 'GA-6', droppedDay: stored(droppedIso) }, DEFAULT_ROW_NAME_FIXTURE)

const taskOf = (document: Document): Task => {
  const found = document.schedule.tasks.find((one) => one.uid === 1)
  if (found === undefined) throw new Error('Task 1 left the document')
  return found
}

const numberSetting = (key: string): number => {
  const value = SETTINGS_DEFAULTS[key]
  if (typeof value !== 'number') throw new Error(`SETTINGS_DEFAULTS.${key} is not a number`)
  return value
}

const ACTUAL_INITIAL_DURATION = numberSetting('actualInitialDuration')

describe('DFC-554 premises: the clauses and the fixture still read this way', () => {
  it('FR-011, FR-043, T-023d GA-6, IV-21, DM-1 and AT-39 still hold the clauses verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_ZERO_LIFTED)
    expect(REQUIREMENTS).toContain(FR_011_NOT_TO_ZERO)
    expect(REQUIREMENTS).toContain(FR_043_ZERO_ACCEPTED)
    expect(REQUIREMENTS).toContain(FR_043_ZERO_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(GO_7_PINS_THE_START)
    expect(cellOf('T-220', 'IV-21', '不変条件')).toContain(IV_21_NOT_BELOW_ZERO)
    expect(cellOf('T-240', 'DM-1', '規則')).toContain(DM_1_THE_PLAN_START_DAY)
    expect(ERD_DETAIL).toContain(AT_39_NOT_NEGATIVE)
  })

  it('the plan starts on a Monday, so GA-5 day is that same Monday (DM-1), and S-129 is 1', () => {
    expect(isWorkedDay(PLAN_START)).toBe(true)
    expect(DUMMY_DAY).toBe(PLAN_START)
    expect(isWorkedDay(ymd(10))).toBe(false)
    expect(isWorkedDay(ymd(11))).toBe(false)
    expect(isWorkedDay(DUMMY_DAY)).toBe(true)
    expect(Number.isInteger(ACTUAL_INITIAL_DURATION)).toBe(true)
    expect(ACTUAL_INITIAL_DURATION).toBe(1)
  })
})

describe('DFC-554 table T-266 GA-6: released on the dummy day', () => {
  it('⭐ 着手しているタスクの実績の最後の日を、床の日より前に置かないこと（MUST） -- GA-6 released on the GA-5 day is accepted as a one-day actual', () => {
    const result = releasedFromGr17(DUMMY_DAY)
    expect(result.ok, 'FR-043: moving the end point to the start point position is accepted').toBe(true)
    if (!result.ok) return
    const task = taskOf(result.document)
    expect(task.actualStart, 'T-245 GO-7: actualStart is the plan start day').toBe(stored(DUMMY_DAY))
    expect(task.stop, 'FR-011 (MUST): stop is not before the floor day').toBe(stored(DUMMY_DAY))
    expect(signedLength(DUMMY_DAY, DUMMY_DAY), 'FR-043 / FR-011: same start and last day is one day, not zero').toBe(1)
    expect(task.resumeValid).toBe(true)
    if (task.percentComplete !== null) {
      expect(task.percentComplete, 'AT-39: integer, 0 or more').toBeGreaterThanOrEqual(0)
    }
  })
})

describe('DFC-554 table T-023d GA-6: released on a rest day left of the dummy day, zero by the FR-011 count', () => {
  for (const dropped of [ymd(11), ymd(10)]) {
    it(`掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT） -- GA-6 released on ${dropped} is lifted to the floor day`, () => {
      expect(signedLength(DUMMY_DAY, dropped), 'premise: zero by the FR-011 count').toBe(0)
      const result = releasedFromGr17(dropped)
      expect(result.ok, 'FR-011 (MUST): a zero length is lifted, not refused').toBe(true)
      if (!result.ok) return
      const task = taskOf(result.document)
      expect(task.stop, 'FR-011 (MUST): the floor day').toBe(stored(DUMMY_DAY))
      if (task.percentComplete !== null) {
        expect(task.percentComplete, 'AT-39: integer, 0 or more').toBeGreaterThanOrEqual(0)
      }
    })
  }
})

describe('DFC-554 table T-023d GA-6: released on a worked day left of the dummy day, negative by the FR-011 count', () => {
  for (const dropped of [ymd(9), ymd(7)]) {
    it(`IV-21 -- GA-6 released on ${dropped} is refused and writes nothing`, () => {
      expect(signedLength(DUMMY_DAY, dropped), 'premise: below zero').toBeLessThan(0)
      const result = releasedFromGr17(dropped)
      expect(result.ok, IV_21_NOT_BELOW_ZERO).toBe(false)
      if (result.ok) return
      expect(result.refusals[0]?.rule, IV_21_NOT_BELOW_ZERO).toBe('IV-21')
    })
  }
})

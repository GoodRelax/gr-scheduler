// DFC-554 -- table T-023d GR-17 (the finish half of a not-started task's
// actual dummy) released on the dummy's own day, or left of it, must not
// write an actualDuration below S-129 (FR-011).
//
// Where table T-218 puts this file: TS-6, tests/unit/.
//
// Written from docs/spec only. What was read of src/: the exported types and
// the public entry `editTask` of edit-document.ts, and the fixture shapes of
// tests/unit/t-023d-dummy-stands-clear-of-the-plan-start.test.ts. No function
// body set an expected value.
//
// What the specification decides, and what it does not:
//   - Released ON the dummy's day (GR-9's day): FR-043 accepts moving the end
//     point to the start point's position, and says that zero is a position;
//     an actual whose start and finish are the same day is one day (FR-011).
//     So the write is accepted with actualStart on GR-9's day and
//     actualDuration of one worked day, which is not below S-129.
//   - Released LEFT of the dummy's day (the ends cross): no clause says
//     whether to refuse the write or to lift it to the floor. Only the FR-011
//     floor is decided, so the case below asserts the floor alone: either
//     nothing is written, or what is written is not below S-129. Which of
//     the two is NOT asserted.
//
// Entry points that deliver this command (counted for the report):
//   1. a pointer drag released from GR-17 -> beginTaskActual { grabbed: GR-17 }
//   2. the Agent API applyCommands -> the same DocumentCommand
// Both reach `editTask`, which this file drives directly.
//
// January 2026: the 9th is a Friday, so GR-9's day (the plan start's next
// worked day, DM-1, following the calendar) is Monday the 12th.

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

// ---------------------------------------------------------------------------
// The clauses, held verbatim, each on one unbroken line
// ---------------------------------------------------------------------------

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const ERD_DETAIL = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8')

const FR_011_FLOOR =
  '⭐ 着手しているタスクの `actualDuration` は、`_assets/tbl-settings.md` の 表 T-201 の `S-129` を下回らせないこと（MUST）。'

const FR_011_NOT_TO_ZERO =
  '掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT） —— ⛔ 掴み代は描かれた印そのものなので（表 T-023d の結び）、長さが 0 になるとインクも掴み代も 0 になり、二度と掴めなくなる。'

const FR_043_ZERO_ACCEPTED =
  '終了点を開始点の位置まで動かして長さを 0 にすることは受け入れる —— そのあと長さを直すのはプロパティパネル（表 T-016 の `PR-5`）である。'

const FR_043_ZERO_IS_A_POSITION =
  '⚠️ **ここでいう 0 は位置の話である** —— **開始日と終了日が同じ日の実績は 1 日であり、0 日ではない**（`FR-011`）。'

const GR_17_PINS_THE_START =
  '掴めば `actualDuration` を置く（`actualStart` は `GR-9` の日で確定。`FR-043`）。'

const DM_1_NEXT_WORKED_DAY = '**ダミーを描く位置は、予定の開始日の翌稼働日とすること（MUST）。**'

const AT_39_NOT_NEGATIVE = '| `Task` | `percentComplete` | 整数（0 以上） |'

const cellOf = (tableId: string, rowId: string, heading: string): string => {
  const row = specTable(tableId).rows.find((one) => one.id === rowId)
  if (row === undefined) throw new Error(`table ${tableId} has no row ${rowId}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${tableId} has no ${heading} column; it has ${Object.keys(row.by).join(', ')}`)
  return cell
}

// ---------------------------------------------------------------------------
// The calendar, counted here (T-209 S-106 / S-107)
// ---------------------------------------------------------------------------

const isWorkedDay = (iso: string): boolean => {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return weekday !== 0 && weekday !== 6
}

const ymd = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}`

const stored = (iso: string): string => `${iso}T00:00:00`

const PLAN_START = ymd(9)
const PLAN_FINISH = ymd(23)
const DUMMY_DAY = ymd(12)

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

const releasedFromGr17 = (droppedIso: string): EditResult =>
  editTask(notStarted(), { kind: 'beginTaskActual', uid: 1, grabbed: 'GR-17', droppedDay: stored(droppedIso) })

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

/** S-129. */
const ACTUAL_INITIAL_DURATION = numberSetting('actualInitialDuration')

// ---------------------------------------------------------------------------
// Premises
// ---------------------------------------------------------------------------

describe('DFC-554 premises: the clauses and the fixture still read this way', () => {
  it('FR-011, FR-043, T-023d GR-17, DM-1 and AT-39 still hold the clauses verbatim', () => {
    expect(REQUIREMENTS).toContain(FR_011_FLOOR)
    expect(REQUIREMENTS).toContain(FR_011_NOT_TO_ZERO)
    expect(REQUIREMENTS).toContain(FR_043_ZERO_ACCEPTED)
    expect(REQUIREMENTS).toContain(FR_043_ZERO_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(GR_17_PINS_THE_START)
    expect(cellOf('T-240', 'DM-1', '規則')).toContain(DM_1_NEXT_WORKED_DAY)
    expect(ERD_DETAIL).toContain(AT_39_NOT_NEGATIVE)
  })

  it('the plan starts on a Friday, so GR-9 day is the Monday after it, and S-129 is at least 1', () => {
    expect(isWorkedDay(PLAN_START)).toBe(true)
    expect(isWorkedDay(ymd(10))).toBe(false)
    expect(isWorkedDay(ymd(11))).toBe(false)
    expect(isWorkedDay(DUMMY_DAY)).toBe(true)
    expect(Number.isInteger(ACTUAL_INITIAL_DURATION)).toBe(true)
    expect(ACTUAL_INITIAL_DURATION).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// Released on the dummy's own day
// ---------------------------------------------------------------------------

describe('DFC-554 table T-023d GR-17: released on the dummy day', () => {
  it('⭐ 着手しているタスクの `actualDuration` は、`_assets/tbl-settings.md` の 表 T-201 の `S-129` を下回らせないこと（MUST）。 -- GR-17 released on GR-9 day is accepted as a one-day actual', () => {
    const result = releasedFromGr17(DUMMY_DAY)
    expect(result.ok, 'FR-043: moving the end point to the start point position is accepted').toBe(true)
    if (!result.ok) return
    const task = taskOf(result.document)
    expect(task.actualStart, 'T-023d GR-17: actualStart is GR-9 day').toBe(stored(DUMMY_DAY))
    expect(task.actualDuration, 'FR-011 (MUST): not below S-129').toBeGreaterThanOrEqual(ACTUAL_INITIAL_DURATION)
    expect(task.actualDuration, 'FR-043 / FR-011: same start and finish day is one day, not zero').toBe(1)
    expect(task.resumeValid).toBe(true)
    if (task.percentComplete !== null) {
      expect(task.percentComplete, 'AT-39: integer, 0 or more').toBeGreaterThanOrEqual(0)
    }
  })
})

// ---------------------------------------------------------------------------
// Released left of the dummy's day -- the floor only
// ---------------------------------------------------------------------------

describe('DFC-554 table T-023d GR-17: released left of the dummy day', () => {
  // Left of GR-9 day: the two weekend days, the plan start (Friday), and a
  // worked day two before it. Whether to refuse or to lift is not decided.
  for (const dropped of [ymd(11), ymd(10), PLAN_START, ymd(7)]) {
    it(`掴んで 0 稼働日まで縮められるようにしてはならない（MUST NOT） -- GR-17 released on ${dropped} writes nothing, or nothing below S-129`, () => {
      const result = releasedFromGr17(dropped)
      if (!result.ok) {
        expect(result.refusals.length, 'a refusal names at least one rule').toBeGreaterThan(0)
        return
      }
      const task = taskOf(result.document)
      if (task.actualStart === null) return
      expect(task.actualDuration, 'FR-011 (MUST): not below S-129').not.toBeNull()
      expect(task.actualDuration!, 'FR-011 (MUST): not below S-129').toBeGreaterThanOrEqual(ACTUAL_INITIAL_DURATION)
      if (task.percentComplete !== null) {
        expect(task.percentComplete, 'AT-39: integer, 0 or more').toBeGreaterThanOrEqual(0)
      }
    })
  }
})

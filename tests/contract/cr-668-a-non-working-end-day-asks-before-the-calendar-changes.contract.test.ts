// CR-668 spec-only tests: which placed end days FR-154 asks about (T-354), the one bundle a Yes writes and the row it adds (WC-6, AT-81).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { blankTaskVisual, dayOf, isWorkingDay, workingCalendarOf } from '../../src/entity/document-model/schedule/schedule'
import {
  editDocument,
  nonWorkingDayQuestionOwedBy,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'

import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_031_ONLY_THESE =
  '例外は、取り消しで取り戻せないものを失う場面と、人の 1 つの所作が文書ぜんたいの設定（表 T-027 の `UN-13`）を変えうる場面に限る（MUST）'
const FR_031_NO_OTHER = '文書ぜんたいの設定は 1 つの値がすべてのタスクに効くので、人が選ばないまま変えてはならない（`FR-154`）。それ以外の場面で確認を求めてはならない（MUST NOT）'
const FR_154_NOT_SILENTLY =
  'その日を文書の暦の稼働日にすれば、どの数え方も同じ日数を数える。⛔ 暦を黙って変えてはならない（MUST NOT）'
const FR_154_NO_SNAP = '⇒ 変えるかどうかは、端を置いた人がその場で選ぶ。⛔ 端を稼働日へ寄せてはならない（MUST NOT）'
const FR_154_ONE_STEP =
  '`Yes` と答えたときは、例外日を足す書き込み（`_assets/tbl-glossary.md` の 表 T-108 の `CM-39`）と端を置く書き込みを 1 つの束とし、取り消しを 1 段とすること（MUST）'
const FR_154_ROW_SHAPE =
  '足す例外日は `FR-088` の 表 T-344 の `WC-6` が足す行と同じ形とし、休みか稼働か（`_assets/fig-erd-detail.md` の `AT-81`）を稼働とすること（MUST）'
const WC_6_ROW = '足した行は、名前を空、始まりと終わりの日を今日（端末の日付）、休みとし、`AT-82` を `1` とする'
const HW_8 = '| HW-8 | 端と端の間の非稼働日 | 問わない —— 挙げるのは端の日だけ |'
const HW_9 = '| HW-9 | 置いても日付が変わらない／その日が既に稼働日 | 問わない |'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-031 (MUST) the confirmation class', FR_031_ONLY_THESE],
  ['FR-031 (MUST NOT) no other confirmation', FR_031_NO_OTHER],
  ['FR-154 (MUST NOT) the calendar is not changed silently', FR_154_NOT_SILENTLY],
  ['FR-154 (MUST NOT) the end is not snapped', FR_154_NO_SNAP],
  ['FR-154 (MUST) a Yes is one bundle, one undo step', FR_154_ONE_STEP],
  ['FR-154 (MUST) the added row is WC-6 shaped and working', FR_154_ROW_SHAPE],
  ['WC-6 the shape of an added row', WC_6_ROW],
  ['HW-8 days between the ends are not asked', HW_8],
  ['HW-9 an unmoved or working day is not asked', HW_9],
]

describe('CR-668 the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('01-04 still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, any>

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, rowAreaWidthWithoutPanels: 982 }

// WHY: January 2026 runs Mon 5, Tue 6, Wed 7, Thu 8, Fri 9, Sat 10, Sun 11, Mon 12; the template works Mon-Fri.
const day = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`
const SATURDAY = 10
const SUNDAY = 11

// WHY: a one-day holiday on Thursday 8 is the only exception, so HW-10's case has a row to take the day out of.
const HOLIDAY = {
  ordinal: 0,
  name: 'Office closed',
  fromDate: day(8),
  toDate: '2026-01-08T23:59:00',
  dayWorking: false,
  recurrenceKind: 1,
  carry: {},
  carryElements: [],
}

const ROW_GROUP = '5c000000-0000-4000-8000-000000000668'

function readDocument(exceptions: readonly Record<string, unknown>[]): Document {
  const calendars = (TEMPLATE['schedule']['calendars'] as Record<string, unknown>[]).map((one) => ({ ...one, exceptions }))
  const task = {
    uid: 1,
    wbsParentUid: null,
    wbsOrder: 1,
    name: 'Alpha',
    start: day(5),
    finish: day(7),
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }
  const text = JSON.stringify({
    schemaVersion: TEMPLATE['schemaVersion'],
    schedule: {
      project: { ...TEMPLATE['schedule']['project'], uidHighWaterMark: 100, statusDate: null },
      calendars,
      tasks: [task],
      resources: [],
      assignments: [],
      taskGroups: [
        { id: ROW_GROUP, parentId: null, label: 'A', derivedFromTaskUid: null, order: 0, treeState: 'auto', color: null, minHeight: null },
      ],
      taskGroupMembers: [{ taskUid: 1, groupId: ROW_GROUP }],
      taskVisuals: [blankTaskVisual(1)],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: TEMPLATE['documentSettings'],
    documentStamp: TEMPLATE['documentStamp'],
    changeLog: [],
  })
  const read = documentFromJson(text, TEMPLATE['schemaVersion'] as string)
  if (!read.ok) throw new Error(`the fixture was refused: ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

const PLAIN = readDocument([])
const WITH_HOLIDAY = readDocument([HOLIDAY])

const planDates = (start: number, finish: number): DocumentCommand =>
  ({ kind: 'setTaskPlanDates', uid: 1, start: day(start), finish: day(finish) }) as DocumentCommand

/** @purity pure */
function written(document: Document, commands: readonly DocumentCommand[]): Document {
  let held = document
  for (const command of commands) {
    const result = editDocument(held, command, LIMITS, 'row')
    if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals).slice(0, 300)}`)
    held = result.document
  }
  return held
}

const isWorkingIn = (document: Document, dayOfMonth: number): boolean => {
  const at = dayOf(day(dayOfMonth))
  if (at === null) throw new Error('no day')
  return isWorkingDay(workingCalendarOf(document.schedule), at)
}

const dayText = (text: string | null | undefined): string => (text ?? '').slice(0, 10)

describe(`FR-031 (MUST): ${FR_031_ONLY_THESE}`, () => {
  it('releasing a plan end on a Saturday is a scene that may change the document calendar, so it is asked', () => {
    expect(isWorkingIn(PLAIN, SATURDAY)).toBe(false)
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    expect(owed).not.toBeNull()
    expect(owed?.days.map(dayText)).toEqual(['2026-01-10'])
  })
})

describe(`FR-031 (MUST NOT): ${FR_031_NO_OTHER}`, () => {
  it.each([
    ['a plan end moved to a weekday', planDates(5, 9)],
    ['the dates written again unchanged (HW-9)', planDates(5, 7)],
    ['both ends on weekdays with a weekend between them (HW-8)', planDates(5, 13)],
  ] as const)('%s raises no question', (_name, command) => {
    expect(nonWorkingDayQuestionOwedBy([command], PLAIN)).toBeNull()
  })

  it('a Saturday the calendar already works is not asked again (HW-9)', () => {
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    if (owed === null) throw new Error('the Saturday was not asked')
    const madeWorking = written(PLAIN, [owed.madeWorking])
    expect(nonWorkingDayQuestionOwedBy([planDates(6, SATURDAY)], madeWorking)).toBeNull()
  })
})

describe(`FR-154 (MUST NOT): ${FR_154_NOT_SILENTLY}`, () => {
  it('asking leaves the held document as it was: the calendar changes only through the bundle a Yes writes', () => {
    const before = JSON.stringify(PLAIN.schedule.calendars)
    nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    expect(JSON.stringify(PLAIN.schedule.calendars)).toBe(before)
  })

  it('the end write alone (the No answer) changes no calendar row', () => {
    const declined = written(PLAIN, [planDates(5, SATURDAY)])
    expect(declined.schedule.calendars).toEqual(PLAIN.schedule.calendars)
    expect(isWorkingIn(declined, SATURDAY)).toBe(false)
  })

  it('both ends on a weekend name both days, in day order, without repeats', () => {
    const owed = nonWorkingDayQuestionOwedBy([planDates(SATURDAY, SUNDAY)], PLAIN)
    expect(owed?.days.map(dayText)).toEqual(['2026-01-10', '2026-01-11'])
  })
})

describe(`FR-154 (MUST NOT): ${FR_154_NO_SNAP}`, () => {
  it('a Yes keeps the end on the Saturday it was released on', () => {
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    if (owed === null) throw new Error('the Saturday was not asked')
    const accepted = written(PLAIN, [owed.madeWorking, planDates(5, SATURDAY)])
    expect(dayText(accepted.schedule.tasks[0]?.finish)).toBe('2026-01-10')
  })

  it('a No keeps the end on the Saturday too, not on Friday or Monday', () => {
    const declined = written(PLAIN, [planDates(5, SATURDAY)])
    expect(dayText(declined.schedule.tasks[0]?.finish)).toBe('2026-01-10')
  })
})

describe(`FR-154 (MUST): ${FR_154_ONE_STEP}`, () => {
  it('the question carries the calendar write as one CM-39 command, to stand in front of the end write in one bundle', () => {
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    expect(owed?.madeWorking.kind).toBe('setCalendar')
    const accepted = written(PLAIN, owed === null ? [] : [owed.madeWorking, planDates(5, SATURDAY)])
    expect(isWorkingIn(accepted, SATURDAY)).toBe(true)
    expect(dayText(accepted.schedule.tasks[0]?.finish)).toBe('2026-01-10')
  })
})

describe(`FR-154 (MUST): ${FR_154_ROW_SHAPE}`, () => {
  it('the Saturday becomes one added row: no name, from and to on that day, AT-82 = 1, working', () => {
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, SATURDAY)], PLAIN)
    if (owed === null || owed.madeWorking.kind !== 'setCalendar') throw new Error('the Saturday was not asked')
    const rows = (owed.madeWorking as unknown as { exceptions: readonly Record<string, unknown>[] }).exceptions
    expect(rows).toHaveLength(1)
    const added = rows[0] ?? {}
    expect(added['name'] === null || added['name'] === '').toBe(true)
    expect(dayText(added['fromDate'] as string)).toBe('2026-01-10')
    expect(dayText(added['toDate'] as string)).toBe('2026-01-10')
    expect(added['recurrenceKind']).toBe(1)
    expect(added['dayWorking']).toBe(true)
  })

  it('HW-10: a holiday row covering the day loses that day instead of being overlapped by a working row', () => {
    expect(isWorkingIn(WITH_HOLIDAY, 8)).toBe(false)
    const owed = nonWorkingDayQuestionOwedBy([planDates(5, 8)], WITH_HOLIDAY)
    if (owed === null) throw new Error('the holiday was not asked')
    const accepted = written(WITH_HOLIDAY, [owed.madeWorking, planDates(5, 8)])
    expect(isWorkingIn(accepted, 8)).toBe(true)
    const exceptions = workingCalendarOf(accepted.schedule).exceptions
    expect(exceptions.filter((one) => one.dayWorking === true)).toEqual([])
  })
})

// CR-710 wave 1 (spec-only): WC-8 and WC-9 pick the one set of spans, CM-39 writes it, IV-24 bounds it, RS-89 compares its sum with the day.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  holdsWorkingDayUnlikeMinutesPerDay,
  isWorkingTimeSetUnlikeDay,
  workingTimeSetOf,
  workingTimesBreach,
  type Project,
  type WorkingTime,
} from '../../src/entity/document-model/schedule/schedule'
import { editCalendar } from '../../src/use-case/edit-document/edit-calendar'
import { asDocument, documentObject, taskRow } from '../unit/cr-646-stage'
import { unbroken } from './spec-table'
import {
  FRIDAY,
  JAN_FRIDAY,
  JAN_NEXT_FRIDAY,
  JAN_THURSDAY,
  JAN_WEDNESDAY,
  MONDAY,
  MONDAY_TO_FRIDAY,
  MONDAY_TO_FRIDAY_WITH_SPANS,
  MORNING_AND_AFTERNOON,
  SATURDAY,
  SUNDAY,
  THURSDAY,
  TUESDAY,
  WEDNESDAY,
  calendarRowOf,
  exceptionOf,
  jan,
  pairsOf,
  spansOf,
  workingCalendarOver,
  type CalendarParts,
  type WorkingByDayType,
} from './cr-710-w1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

// see FR-088, FR-054
const CLAUSES = [
  '⭐ 面が示す 1 組は、時間帯を持つ稼働の曜日のうち最も多くが持つ組とする —— 同数なら `Project.weekStartDay` から数えて最初の稼働の曜日の組、どの曜日も持たなければ 表 T-209 の `S-580` である。',
  '⛔ それと違う組を持つ曜日（交換相手から取り込んだもの）を、面で直してはならない（MUST NOT）。',
  '当てた 1 組は、その組を持っていた曜日、時間帯を持たない稼働の曜日、新しく稼働にした曜日、面で足した稼働の例外日に書くこと（MUST）。',
  '違う組を持つ曜日と、自分の時間帯を持つ例外日には書かない。',
  '稼働日で時間帯を持たない日は、`_assets/tbl-settings.md` の 表 T-209 の `S-580` の時間帯を持つものとして読むこと（MUST）。',
  '⭐ 時間帯の合計が `minutesPerDay` と違う稼働日を持つ文書を開いたときは、表 T-233 の `RS-89` を 1 度だけ告げること（MUST）',
  '⭐ 当てた 1 組の合計が `Project.minutesPerDay`（空なら `S-128`）と違うときは、当てたときにも 表 T-233 の `RS-89` を 1 度告げること（MUST）',
]

// see IV-24
const IV_24 =
  '1 つの曜日・例外日の時間帯は 0 本（稼働でない日）か 1 〜 `_assets/tbl-settings.md` の 表 T-211 の `S-582` 本で、どれも始まりが終わりより前（終わりの `00:00:00` は 24:00）であり、互いに重ならないこと。'

describe('the clauses these cases are built from still read as quoted', () => {
  it.each(CLAUSES)('FR-054 / FR-088: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-220 IV-24 still reads as quoted', () => {
    expect(DESIGN).toContain(IV_24)
  })
})

// see S-580, S-582
const DEFAULT_PAIRS = [['08:00:00', '12:00:00'], ['13:00:00', '17:00:00']]
const MOST_PER_DAY = 5
const A_FAR_FRIDAY = 23

const FULL_DAY = spansOf(['09:00', '18:00'])

// see WC-8, WC-9
describe('WC-8 / WC-9: workingTimeSetOf names the one set a window shows and the weekdays that hold another', () => {
  const setOf = (parts: CalendarParts) => workingTimeSetOf(workingCalendarOver(parts))

  it('shows the set all five working weekdays hold, and names no other weekday', () => {
    const found = setOf({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    expect(pairsOf(found.workingTimes)).toEqual(DEFAULT_PAIRS)
    expect(found.unlikeDayTypes).toEqual([])
  })

  it('shows the set most weekdays hold and names the weekday that holds another', () => {
    const found = setOf({ working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, [WEDNESDAY]: FULL_DAY } })
    expect(pairsOf(found.workingTimes)).toEqual(DEFAULT_PAIRS)
    expect([...found.unlikeDayTypes]).toEqual([WEDNESDAY])
  })

  it('shows the majority even when the odd weekday comes first in the week', () => {
    const found = setOf({
      working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, [MONDAY]: FULL_DAY, [FRIDAY]: FULL_DAY, [TUESDAY]: FULL_DAY },
    })
    expect(pairsOf(found.workingTimes)).toEqual([['09:00:00', '18:00:00']])
    expect([...found.unlikeDayTypes].sort()).toEqual([WEDNESDAY, THURSDAY].sort())
  })

  const TIED = { [MONDAY]: MORNING_AND_AFTERNOON, [TUESDAY]: FULL_DAY, [WEDNESDAY]: MORNING_AND_AFTERNOON, [THURSDAY]: FULL_DAY }

  it('breaks a tie for the set of the first working weekday counted from the start of the week (Monday)', () => {
    const found = setOf({ working: TIED, weekStartDay: 1 })
    expect(pairsOf(found.workingTimes)).toEqual(DEFAULT_PAIRS)
    expect([...found.unlikeDayTypes].sort()).toEqual([TUESDAY, THURSDAY].sort())
  })

  it('breaks the same tie the other way when the week starts on Tuesday', () => {
    const found = setOf({ working: TIED, weekStartDay: 2 })
    expect(pairsOf(found.workingTimes)).toEqual([['09:00:00', '18:00:00']])
    expect([...found.unlikeDayTypes].sort()).toEqual([MONDAY, WEDNESDAY].sort())
  })

  it('shows the S-580 set when no weekday holds spans', () => {
    const found = setOf({ working: MONDAY_TO_FRIDAY })
    expect(pairsOf(found.workingTimes)).toEqual(DEFAULT_PAIRS)
    expect(found.unlikeDayTypes).toEqual([])
  })

  it('lets a working weekday with no spans follow the shown set instead of naming it', () => {
    const found = setOf({ working: { [MONDAY]: FULL_DAY, [TUESDAY]: FULL_DAY, [WEDNESDAY]: [], [THURSDAY]: [] } })
    expect(pairsOf(found.workingTimes)).toEqual([['09:00:00', '18:00:00']])
    expect(found.unlikeDayTypes).toEqual([])
  })

  it('does not let a weekday that does not work vote or be named', () => {
    const within = workingCalendarOver({ working: { [MONDAY]: MORNING_AND_AFTERNOON } })
    const resting = within.weekDays.map((one) =>
      one.dayType === SATURDAY || one.dayType === SUNDAY ? { ...one, workingTimes: FULL_DAY } : one,
    )
    const found = workingTimeSetOf({ ...within, weekDays: resting })
    expect(pairsOf(found.workingTimes)).toEqual(DEFAULT_PAIRS)
    expect(found.unlikeDayTypes).toEqual([])
  })
})

// see IV-24
describe('IV-24: workingTimesBreach says nothing for a sound day and something for each way to break it', () => {
  it.each([
    ['no span at all (a day that does not work)', []],
    ['one span', spansOf(['08:00', '17:00'])],
    ['a morning and an afternoon', MORNING_AND_AFTERNOON],
    ['two spans that touch, one ending where the next starts', spansOf(['08:00', '12:00'], ['12:00', '17:00'])],
    ['five spans', spansOf(['06:00', '07:00'], ['08:00', '09:00'], ['10:00', '11:00'], ['12:00', '13:00'], ['14:00', '15:00'])],
    ['a span ending at 00:00:00, which is 24:00', spansOf(['22:00', '00:00'])],
    ['a morning and a night shift ending at 24:00', spansOf(['08:00', '12:00'], ['20:00', '00:00'])],
  ])('accepts %s', (_name, workingTimes) => {
    expect(workingTimesBreach(workingTimes, MOST_PER_DAY)).toBeNull()
  })

  it.each([
    ['six spans, one over the limit', spansOf(['01:00', '02:00'], ['03:00', '04:00'], ['05:00', '06:00'], ['07:00', '08:00'], ['09:00', '10:00'], ['11:00', '12:00'])],
    ['a span that ends before it starts', spansOf(['17:00', '08:00'])],
    ['a span that starts where it ends', spansOf(['08:00', '08:00'])],
    ['two spans that overlap', spansOf(['08:00', '13:00'], ['12:00', '17:00'])],
    ['a span inside another', spansOf(['08:00', '17:00'], ['10:00', '11:00'])],
    ['a span that starts at 00:00:00 after a later one', spansOf(['08:00', '17:00'], ['00:00', '10:00'])],
  ])('names a breach in %s', (_name, workingTimes) => {
    const breach = workingTimesBreach(workingTimes, MOST_PER_DAY)
    expect(breach).not.toBeNull()
    expect(typeof breach).toBe('string')
  })
})

function documentOver(parts: CalendarParts, project: Record<string, unknown> = {}, tasks: readonly Record<string, unknown>[] = []): Document {
  const object = documentObject({ tasks, project: { weekStartDay: 1, ...project } })
  object['schedule']['calendars'] = [calendarRowOf(parts)]
  return object as unknown as Document
}

function applied(document: Document, command: { workingTimes?: readonly WorkingTime[]; workingDayTypes?: readonly number[]; exceptions?: readonly ReturnType<typeof exceptionOf>[] }) {
  const result = editCalendar(document, { kind: 'setCalendar', ...command })
  if (!result.ok) throw new Error(`premise: CM-39 was refused: ${JSON.stringify(result.refusals)}`)
  return result
}

function weekDayIn(document: Document, dayType: number) {
  const found = document.schedule.calendars[0]?.weekDays.find((one) => one.dayType === dayType)
  if (found === undefined) throw new Error(`the calendar lost weekday ${dayType}`)
  return found
}

// see CM-39, FR-088
describe('CM-39: the one set is written to the weekdays FR-088 names and to no others', () => {
  const NEW_SET = spansOf(['07:00', '11:00'], ['12:00', '16:00'])
  const NEW_PAIRS = [['07:00:00', '11:00:00'], ['12:00:00', '16:00:00']]

  it('writes it to every working weekday that held the shown set', () => {
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    const after = applied(before, { workingTimes: NEW_SET }).document
    for (const dayType of [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]) {
      expect(pairsOf(weekDayIn(after, dayType).workingTimes), `dayType ${dayType}`).toEqual(NEW_PAIRS)
    }
  })

  it('writes it to a working weekday that held no spans', () => {
    const after = applied(documentOver({ working: MONDAY_TO_FRIDAY }), { workingTimes: NEW_SET }).document
    for (const dayType of [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY]) {
      expect(pairsOf(weekDayIn(after, dayType).workingTimes), `dayType ${dayType}`).toEqual(NEW_PAIRS)
    }
  })

  it('keeps the spans of a weekday that holds another set', () => {
    const before = documentOver({ working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, [WEDNESDAY]: FULL_DAY } })
    const after = applied(before, { workingTimes: NEW_SET }).document
    expect(pairsOf(weekDayIn(after, WEDNESDAY).workingTimes)).toEqual([['09:00:00', '18:00:00']])
    expect(pairsOf(weekDayIn(after, MONDAY).workingTimes)).toEqual(NEW_PAIRS)
    expect(pairsOf(weekDayIn(after, FRIDAY).workingTimes)).toEqual(NEW_PAIRS)
  })

  it('leaves a weekday that does not work without spans and without work', () => {
    const after = applied(documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }), { workingTimes: NEW_SET }).document
    for (const dayType of [SATURDAY, SUNDAY]) {
      expect(weekDayIn(after, dayType).dayWorking).toBe(false)
      expect(weekDayIn(after, dayType).workingTimes).toEqual([])
    }
  })

  it('writes it to a weekday the same command makes a working one', () => {
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    const after = applied(before, {
      workingDayTypes: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY],
      workingTimes: NEW_SET,
    }).document
    expect(weekDayIn(after, SATURDAY).dayWorking).toBe(true)
    expect(pairsOf(weekDayIn(after, SATURDAY).workingTimes)).toEqual(NEW_PAIRS)
    expect(pairsOf(weekDayIn(after, MONDAY).workingTimes)).toEqual(NEW_PAIRS)
  })

  it('writes it to an exception day the command adds as a working day, and not to a resting one', () => {
    const held = exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS, exceptions: [held] })
    const workingAdded = exceptionOf(2, JAN_FRIDAY, JAN_FRIDAY, true)
    const restingAdded = exceptionOf(3, JAN_WEDNESDAY, JAN_WEDNESDAY, false)
    const after = applied(before, { workingTimes: NEW_SET, exceptions: [held, workingAdded, restingAdded] }).document
    const exceptions = after.schedule.calendars[0]?.exceptions ?? []
    expect(pairsOf(exceptions.find((one) => one.ordinal === 2)?.workingTimes ?? [])).toEqual(NEW_PAIRS)
    expect(exceptions.find((one) => one.ordinal === 3)?.workingTimes ?? []).toEqual([])
  })

  it('keeps the spans of a working exception day that holds its own', () => {
    const own = exceptionOf(1, JAN_FRIDAY, JAN_FRIDAY, true, spansOf(['10:00', '12:00']))
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS, exceptions: [own] })
    const after = applied(before, { workingTimes: NEW_SET, exceptions: [own] }).document
    const kept = after.schedule.calendars[0]?.exceptions.find((one) => one.ordinal === 1)
    expect(pairsOf(kept?.workingTimes ?? [])).toEqual([['10:00:00', '12:00:00']])
  })

  it('makes the calendar first when the document has none, and writes the set to its working weekdays', () => {
    const object = documentObject({ tasks: [taskRow(1, {})], project: { calendarUid: null } })
    object['schedule']['calendars'] = []
    const after = applied(object as unknown as Document, { workingTimes: NEW_SET }).document
    const calendar = after.schedule.calendars[0]
    expect(after.schedule.calendars).toHaveLength(1)
    expect(after.schedule.project.calendarUid).toBe(calendar?.uid)
    const working = (calendar?.weekDays ?? []).filter((one) => one.dayWorking === true)
    expect(working.map((one) => one.dayType).sort()).toEqual([MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY])
    for (const one of working) expect(pairsOf(one.workingTimes), `dayType ${one.dayType}`).toEqual(NEW_PAIRS)
  })

  it('changes nothing when the set written is the set every working weekday already holds', () => {
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    const after = applied(before, { workingTimes: MORNING_AND_AFTERNOON }).document
    expect(after.schedule.calendars).toEqual(before.schedule.calendars)
  })

  it.each([
    ['five spans', spansOf(['01:00', '02:00'], ['03:00', '04:00'], ['05:00', '06:00'], ['07:00', '08:00'], ['09:00', '10:00'])],
    ['two spans that touch', spansOf(['08:00', '12:00'], ['12:00', '17:00'])],
    ['one span that ends at 24:00', spansOf(['16:00', '00:00'])],
    ['one span', spansOf(['08:00', '17:00'])],
  ])('takes %s', (_name, workingTimes) => {
    expect(editCalendar(documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }), { kind: 'setCalendar', workingTimes }).ok).toBe(true)
  })

  it.each([
    ['six spans', spansOf(['01:00', '02:00'], ['03:00', '04:00'], ['05:00', '06:00'], ['07:00', '08:00'], ['09:00', '10:00'], ['11:00', '12:00'])],
    ['a span that ends before it starts', spansOf(['17:00', '08:00'])],
    ['a span as long as no time', spansOf(['08:00', '08:00'])],
    ['two spans that overlap', spansOf(['08:00', '13:00'], ['12:00', '17:00'])],
  ])('refuses %s by IV-24 and changes nothing', (_name, workingTimes) => {
    const result = editCalendar(documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }), { kind: 'setCalendar', workingTimes })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals.map((one) => one.rule)).toContain('IV-24')
  })

  it('refuses a calendar that would work no weekday at all, and tells which tasks it recounted when it works', () => {
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    expect(editCalendar(before, { kind: 'setCalendar', workingDayTypes: [] }).ok).toBe(false)
  })

  it('refuses a set with no span: one working set is 1 to 5 spans', () => {
    const result = editCalendar(documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }), { kind: 'setCalendar', workingTimes: [] })
    expect(result.ok).toBe(false)
  })
})

// see FR-012, FR-088
describe('FR-012: a calendar edit counts the stored completion again from the instants', () => {
  const task = (uid: number, part: Record<string, unknown>) =>
    taskRow(uid, { start: jan(JAN_WEDNESDAY, '08:00'), finish: jan(JAN_NEXT_FRIDAY, '17:00'), percentComplete: 0, ...part })

  it('counts a Thursday holiday out of the plan and not out of an actual that ends on it', () => {
    const progressed = task(1, { actualStart: jan(JAN_WEDNESDAY, '08:00'), stop: jan(JAN_THURSDAY, '17:00'), percentComplete: 67 })
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, {}, [progressed])
    const result = applied(before, { exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)] })
    const found = result.document.schedule.tasks.find((one) => one.uid === 1)
    expect(found?.percentComplete).toBe(100)
    expect(result.report.recountedTaskUids).toContain(1)
  })

  it('stores a share over 100 when the actual ran longer than the plan, and rounds the share to an integer', () => {
    const longer = task(1, { finish: jan(JAN_WEDNESDAY, '17:00'), actualStart: jan(JAN_WEDNESDAY, '08:00'), stop: jan(JAN_THURSDAY, '17:00'), percentComplete: 10 })
    const third = task(2, { finish: jan(JAN_WEDNESDAY, '15:00'), actualStart: jan(JAN_WEDNESDAY, '08:00'), stop: jan(JAN_WEDNESDAY, '10:00'), percentComplete: 10 })
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, {}, [longer, third])
    const after = applied(before, { exceptions: [exceptionOf(1, A_FAR_FRIDAY, A_FAR_FRIDAY, false)] }).document
    expect(after.schedule.tasks.find((one) => one.uid === 1)?.percentComplete).toBe(200)
    expect(after.schedule.tasks.find((one) => one.uid === 2)?.percentComplete).toBe(33)
  })

  it('stores 100 for a finished task whose plan counts for no minute and 0 for one that has not begun', () => {
    const empty = { start: jan(JAN_WEDNESDAY, '17:00'), finish: jan(JAN_WEDNESDAY, '17:00') }
    const finished = task(1, { ...empty, actualStart: jan(JAN_WEDNESDAY, '17:00'), actualFinish: jan(JAN_WEDNESDAY, '17:00'), percentComplete: 40 })
    const waiting = task(2, { ...empty, percentComplete: 40 })
    const before = documentOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, {}, [finished, waiting])
    const after = applied(before, { exceptions: [exceptionOf(1, A_FAR_FRIDAY, A_FAR_FRIDAY, false)] }).document
    expect(after.schedule.tasks.find((one) => one.uid === 1)?.percentComplete).toBe(100)
    expect(after.schedule.tasks.find((one) => one.uid === 2)?.percentComplete).toBe(0)
  })
})

function projectOf(minutesPerDay: number | null): Project {
  return { ...asDocument().schedule.project, minutesPerDay }
}

// see RS-89, S-128
describe('RS-89: isWorkingTimeSetUnlikeDay compares the sum of a set with the minutes of a day', () => {
  it.each([
    ['08:00-12:00 and 13:00-17:00 is 480, the day of S-128', MORNING_AND_AFTERNOON, null, false],
    ['08:00-16:00 is 480 whatever the gap in the middle', spansOf(['08:00', '16:00']), null, false],
    ['16:00-00:00 is 480: the end at 00:00:00 is 24:00', spansOf(['16:00', '00:00']), null, false],
    ['09:00-18:00 is 540, not 480', FULL_DAY, null, true],
    ['09:00-18:00 against a project day of 540', FULL_DAY, 540, false],
    ['08:00-12:00 and 13:00-17:00 against a project day of 540', MORNING_AND_AFTERNOON, 540, true],
    ['08:00-12:00 against the day of S-128', spansOf(['08:00', '12:00']), null, true],
  ])('%s', (_name, workingTimes, minutesPerDay, unlike) => {
    expect(isWorkingTimeSetUnlikeDay(projectOf(minutesPerDay), workingTimes)).toBe(unlike)
  })
})

// see RS-89, FR-054
describe('RS-89: holdsWorkingDayUnlikeMinutesPerDay finds a working day whose spans do not sum to the day', () => {
  const scheduleOver = (working: WorkingByDayType, minutesPerDay: number | null, exceptions: CalendarParts['exceptions'] = []) =>
    documentOver({ working, exceptions }, { minutesPerDay }).schedule

  it.each([
    ['a calendar with no spans, read as S-580, against the day of S-128', MONDAY_TO_FRIDAY, null, false],
    ['a calendar of 480-minute days against the same project day', MONDAY_TO_FRIDAY_WITH_SPANS, 480, false],
    ['a calendar with no spans against a project day of 450', MONDAY_TO_FRIDAY, 450, true],
    ['one weekday of 540 minutes among days of 480', { ...MONDAY_TO_FRIDAY_WITH_SPANS, [WEDNESDAY]: FULL_DAY }, null, true],
    ['every weekday of 540 against a project day of 540', Object.fromEntries([MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY].map((one) => [one, FULL_DAY])), 540, false],
  ])('%s', (_name, working, minutesPerDay, unlike) => {
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleOver(working, minutesPerDay))).toBe(unlike)
  })

  it('does not count a weekday that does not work, whatever spans it holds', () => {
    const working = { ...MONDAY_TO_FRIDAY_WITH_SPANS }
    const schedule = scheduleOver(working, null)
    const calendar = schedule.calendars[0]
    if (calendar === undefined) throw new Error('premise: no calendar')
    const resting = calendar.weekDays.map((one) => (one.dayType === SATURDAY ? { ...one, workingTimes: spansOf(['09:00', '12:00']) } : one))
    expect(holdsWorkingDayUnlikeMinutesPerDay({ ...schedule, calendars: [{ ...calendar, weekDays: resting }] })).toBe(false)
  })

  it('counts a working exception day whose own spans sum to another day', () => {
    const odd = exceptionOf(1, JAN_FRIDAY, JAN_FRIDAY, true, spansOf(['09:00', '12:00']))
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleOver(MONDAY_TO_FRIDAY_WITH_SPANS, null, [odd]))).toBe(true)
  })

  it('does not count a holiday', () => {
    const holiday = exceptionOf(1, JAN_FRIDAY, JAN_FRIDAY, false)
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleOver(MONDAY_TO_FRIDAY_WITH_SPANS, null, [holiday]))).toBe(false)
  })
})

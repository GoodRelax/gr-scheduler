// CR-757 spec-only cases: WH-1 the current start and WH-2 to WH-5 the working-day mapping, against the Schedule entity.

import { describe, expect, it } from 'vitest'

import {
  dayOf,
  earliestPlanStartDayOf,
  workingCalendarOf,
  workingDayShiftOf,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import { HOLIDAY_2029_03_20, REQUIREMENTS, WORKED, documentOf, whRow } from './cr-757-stage'

const day = (text: string) => {
  const found = dayOf(text)
  if (found === null) throw new Error(`not a day: ${text}`)
  return found
}

const WORKED_CALENDAR = workingCalendarOf(WORKED().schedule)
const shiftOf = (current: string, next: string) => workingDayShiftOf(WORKED_CALENDAR, day(current), day(next))
const planOf = (start: string | null, milestone = false): Task => ({ start, milestone }) as unknown as Task

const WH_1_EARLIEST = '予定の開始（`Task.start`）のうち読める値を持つものの、いちばん早い日とする'
const WH_1_NOT_COUNTED = '実績・基準計画・ハイライトボックス・`Project.startDate` は数えない'
const WH_2_PREVIOUS = '新しい開始日が非稼働日（`WH-3` の数えで）なら、その前の稼働日を新しい起点とし'
const WH_3_RANK = 'いまの起点が稼働日ならその日を、非稼働日ならその前の稼働日を順位 0 とする'
const WH_3_HALF_OPEN = '（半開の数え）'
const WH_4_SAME_RANK = '順位 k の日付は、新しい起点を順位 0 として数えた順位 k の稼働日へ移す'
const WH_5_PREVIOUS = 'もともと非稼働日にある日付は、その前の稼働日の順位で `WH-4` に従って移す'
const FR_159_KEEPS_RANK = '開始から何稼働日目かを保って一斉に移すこと'

describe('FR-159 / T-379 -- the manuscript still says what these cases press', () => {
  it.each([
    ['WH-1', WH_1_EARLIEST],
    ['WH-1', WH_1_NOT_COUNTED],
    ['WH-2', WH_2_PREVIOUS],
    ['WH-3', WH_3_RANK],
    ['WH-3', WH_3_HALF_OPEN],
    ['WH-4', WH_4_SAME_RANK],
    ['WH-5', WH_5_PREVIOUS],
  ])('%s: %s', (row, clause) => {
    expect(whRow(row)).toContain(clause)
  })

  it(`FR-159: ${FR_159_KEEPS_RANK}`, () => {
    expect(REQUIREMENTS).toContain(FR_159_KEEPS_RANK)
  })
})

describe('WH-1 -- the current start is the earliest readable Task.start', () => {
  it('milestones and parent tasks count; the earliest of them wins', () => {
    const tasks = [planOf('2028-04-10T08:00:00'), planOf('2028-04-06T17:00:00', true), planOf('2028-04-07T08:00:00')]
    expect(earliestPlanStartDayOf(tasks)).toEqual(day('2028-04-06'))
  })

  it('a start without a time reads as that day; a start that cannot be read and an empty start are passed over', () => {
    const tasks = [planOf('not a date'), planOf(null), planOf('2028-04-12'), planOf('2028-04-13T08:00:00')]
    expect(earliestPlanStartDayOf(tasks)).toEqual(day('2028-04-12'))
  })

  it(`⛔ no Task with a start: there is no current start (the field shows the dash and Apply cannot be pressed)`, () => {
    expect(earliestPlanStartDayOf([])).toBeNull()
    expect(earliestPlanStartDayOf([planOf(null), planOf('not a date')])).toBeNull()
  })

  it(`${WH_1_NOT_COUNTED} -- the earlier actual, baseline, highlight box and Project.startDate do not move the start`, () => {
    const document = documentOf({
      tasks: [{ uid: 1, start: '2028-04-04T08:00:00', finish: '2028-04-07T17:00:00', actualStart: '2028-03-01T08:00:00' }],
      startDate: '2028-03-02T08:00:00',
      baselines: [{ uid: 1, start: '2028-03-03T08:00:00', finish: '2028-03-07T17:00:00' }],
      highlights: [{ id: 'early', start: '2028-03-06T00:00:00', end: '2028-03-06T23:59:00' }],
    })
    expect(earliestPlanStartDayOf(document.schedule.tasks)).toEqual(day('2028-04-04'))
  })
})

describe('WH-2 / WH-3 / WH-4 / WH-5 -- the worked example below table T-379', () => {
  const SHIFT = shiftOf('2028-04-04', '2029-03-05')

  it('the rank-0 days and the working days moved (positive: later)', () => {
    expect(SHIFT.fromZero).toEqual(day('2028-04-04'))
    expect(SHIFT.toZero).toEqual(day('2029-03-05'))
    expect(SHIFT.isNewStartNonWorking).toBe(false)
    // WHY: Monday to Friday from Tuesday 2028-04-04 up to (not including) Monday 2029-03-05 are 239 working days.
    expect(SHIFT.workingDays).toBe(239)
  })

  it.each([
    ['2028-04-04', '2029-03-05', 'rank 0'],
    ['2028-04-07', '2029-03-08', 'rank 3: Task A keeps four working days'],
    ['2028-04-14', '2029-03-15', 'rank 8: Milestone M'],
    ['2028-05-01', '2029-04-02', 'rank 19: past the holiday 2029-03-20, so not 2029-03-30 or 2029-04-01'],
    ['2028-05-02', '2029-04-03', 'rank 20'],
    ['2028-04-10', '2029-03-09', 'rank 4: the status date'],
    ['2028-03-31', '2029-03-01', 'rank -2: a day before the start'],
    ['2028-04-03', '2029-03-02', 'rank -1: Project.startDate'],
  ])(`${WH_4_SAME_RANK} -- %s lands on %s (%s)`, (from, to) => {
    expect(SHIFT.moveDay(day(from))).toEqual({ day: day(to), isPulled: false })
  })

  it.each([
    ['2028-05-06', '2029-04-06', 'Saturday: the rank 23 of Friday 2028-05-05'],
    ['2028-04-29', '2029-03-30', 'Saturday: the rank 18 of Friday 2028-04-28'],
    ['2028-04-30', '2029-03-30', 'Sunday: the same Friday, so the weekend range becomes one day'],
  ])(`${WH_5_PREVIOUS} -- %s lands on %s (%s), pulled`, (from, to) => {
    expect(SHIFT.moveDay(day(from))).toEqual({ day: day(to), isPulled: true })
  })

  it('the holiday of the destination is skipped: ranks 10 and 11 sit on either side of 2029-03-20', () => {
    expect(SHIFT.moveDay(day('2028-04-18')).day).toEqual(day('2029-03-19'))
    expect(SHIFT.moveDay(day('2028-04-19')).day).toEqual(day('2029-03-21'))
  })

  it('the map keeps the order of days: no later day lands before an earlier one', () => {
    let last = SHIFT.moveDay(day('2028-03-20')).day
    for (let offset = 1; offset < 60; offset += 1) {
      const from = new Date(Date.UTC(2028, 2, 20 + offset)).toISOString().slice(0, 10)
      const landed = SHIFT.moveDay(day(from)).day
      const key = (one: typeof landed): number => one.year * 10000 + one.month * 100 + one.day
      expect(key(landed), from).toBeGreaterThanOrEqual(key(last))
      last = landed
    }
  })
})

describe(`WH-2 -- ${WH_2_PREVIOUS}`, () => {
  it('a typed Sunday 2029-03-04 starts the schedule on Friday 2029-03-02', () => {
    const shift = shiftOf('2028-04-04', '2029-03-04')
    expect(shift.toZero).toEqual(day('2029-03-02'))
    expect(shift.isNewStartNonWorking).toBe(true)
    expect(shift.moveDay(day('2028-04-04')).day).toEqual(day('2029-03-02'))
    expect(shift.moveDay(day('2028-04-07')).day).toEqual(day('2029-03-07'))
  })

  it('a typed holiday of the calendar (2029-03-20) starts on the working day before it', () => {
    const shift = shiftOf('2028-04-04', '2029-03-20')
    expect(shift.toZero).toEqual(day('2029-03-19'))
    expect(shift.isNewStartNonWorking).toBe(true)
  })
})

describe(`WH-3 -- ${WH_3_RANK}`, () => {
  it('a current start on a Saturday counts from the Friday before it', () => {
    const shift = shiftOf('2028-04-08', '2029-03-05')
    expect(shift.fromZero).toEqual(day('2028-04-07'))
    expect(shift.moveDay(day('2028-04-07'))).toEqual({ day: day('2029-03-05'), isPulled: false })
    expect(shift.moveDay(day('2028-04-08'))).toEqual({ day: day('2029-03-05'), isPulled: true })
    expect(shift.moveDay(day('2028-04-10')).day).toEqual(day('2029-03-06'))
  })

  it('earlier is negative: one week back is minus five working days, and every day keeps its rank', () => {
    const shift = shiftOf('2028-04-11', '2028-04-04')
    expect(shift.workingDays).toBe(-5)
    expect(shift.moveDay(day('2028-04-11')).day).toEqual(day('2028-04-04'))
    expect(shift.moveDay(day('2028-04-14')).day).toEqual(day('2028-04-07'))
    expect(shift.moveDay(day('2028-04-17')).day).toEqual(day('2028-04-10'))
  })

  it('the same rank-0 day moves nothing: zero working days (WH-9)', () => {
    expect(shiftOf('2028-04-04', '2028-04-04').workingDays).toBe(0)
    expect(shiftOf('2028-04-08', '2028-04-09').workingDays).toBe(0)
  })
})

describe('FR-054 / WH-3 -- the one calendar of the document; a recurring exception day is not counted', () => {
  it('a yearly exception (recurrenceKind 2) on the destination is not a holiday for the count', () => {
    const recurring = documentOf({
      tasks: [{ uid: 1, start: '2028-04-04T08:00:00', finish: '2028-04-07T17:00:00' }],
      exceptions: [{ ...HOLIDAY_2029_03_20, recurrenceKind: 2 }],
    })
    const shift = workingDayShiftOf(workingCalendarOf(recurring.schedule), day('2028-04-04'), day('2029-03-05'))
    // WHY: rank 11 is 2029-03-20 itself when the recurring row is passed over, and 2029-03-21 when it were counted.
    expect(shift.moveDay(day('2028-04-19')).day).toEqual(day('2029-03-20'))
  })
})

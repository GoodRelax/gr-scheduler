// CR-710 wave 1 (spec-only): FR-011 and FR-012 count working minutes between instants; DV-8 counts them without the edge rule.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  actualMinutesOf,
  instantAfterWorkingMinutes,
  instantOf,
  plannedLengthMinutesOf,
  textOfInstant,
  workingMinutesBetween,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import { unbroken } from './spec-table'
import {
  JAN_FRIDAY,
  JAN_MONDAY,
  JAN_NEXT_FRIDAY,
  JAN_NEXT_MONDAY,
  JAN_SATURDAY,
  JAN_SUNDAY,
  JAN_THURSDAY,
  JAN_TUESDAY,
  JAN_WEDNESDAY,
  MONDAY,
  MONDAY_TO_FRIDAY,
  MONDAY_TO_FRIDAY_WITH_SPANS,
  SATURDAY,
  WEDNESDAY,
  exceptionOf,
  jan,
  spansOf,
  workingCalendarOver,
  type CalendarParts,
} from './cr-710-w1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-011
const FR_011_CLAUSES = [
  '実績の長さは、`actualStart` から実績の終わり（完了なら `actualFinish`、それ以外は `stop`）の瞬間までの、文書の暦（`FR-054`）の稼働時間の合計（分）とすること（MUST）。',
  '間にある非稼働日を数えてはならない（MUST NOT）',
  '例: 月〜金が稼働日で時間帯が 08:00〜12:00・13:00〜17:00 の暦で、金 08:00 〜 土 17:00 は 960 分（2d）、土 08:00 〜 土 17:00 は 480 分（1d）、同じ日の 10:00 〜 12:00 は 120 分（2h）、同じ日の 08:00 〜 17:00 は 480 分（1d）である。',
  '終わりが `actualStart` より前のときの長さは、終わりから `actualStart` までの稼働時間の合計に負の符号を付けたものとする。',
  '`actualStart` から `ActualDuration` の分だけ稼働時間を進めた瞬間を `stop` に置くこと（MUST） —— 0 なら `actualStart`、負なら `actualStart` から同じ分だけ戻った瞬間である',
]

// see FR-012
const FR_012_CLAUSES = [
  '予定の期間は、`start` から `finish` までを、`FR-011` が実績の長さを数える規則で数えた稼働時間（分）とすること（MUST）',
  'マイルストーンの予定の期間は 0 とする',
]

describe('the clauses these cases are built from still read as quoted', () => {
  it.each([...FR_011_CLAUSES, ...FR_012_CLAUSES])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

function at(text: string): number {
  const read = instantOf(text)
  if (read === null) throw new Error(`premise: ${text} was not read as an instant`)
  return read
}

const STANDARD: readonly (readonly [string, CalendarParts])[] = [
  ['spans left to S-580', { working: MONDAY_TO_FRIDAY }],
  ['spans written on each weekday', { working: MONDAY_TO_FRIDAY_WITH_SPANS }],
]

describe.each(STANDARD)('FR-011: actualMinutesOf over Monday to Friday, 08:00-12:00 and 13:00-17:00 (%s)', (_label, parts) => {
  const within = workingCalendarOver(parts)

  it.each([
    ['Fri 08:00 to Sat 17:00 is 960 (2d): the Saturday edge counts as worked', jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '17:00'), 960],
    ['Sat 08:00 to Sat 17:00 is 480 (1d)', jan(JAN_SATURDAY, '08:00'), jan(JAN_SATURDAY, '17:00'), 480],
    ['Fri 10:00 to Fri 12:00 is 120 (2h)', jan(JAN_FRIDAY, '10:00'), jan(JAN_FRIDAY, '12:00'), 120],
    ['Fri 08:00 to Fri 17:00 is 480 (1d)', jan(JAN_FRIDAY, '08:00'), jan(JAN_FRIDAY, '17:00'), 480],
    ['Sun 08:00 to Sun 17:00 is 480: a Sunday edge counts as worked too', jan(JAN_SUNDAY, '08:00'), jan(JAN_SUNDAY, '17:00'), 480],
    ['Fri 08:00 to Mon 17:00 is 960: the days between are not counted', jan(JAN_FRIDAY, '08:00'), jan(JAN_MONDAY, '17:00'), 960],
    ['Sat 10:00 to Mon 12:00 is 600: the Saturday edge from 10:00, then Monday morning', jan(JAN_SATURDAY, '10:00'), jan(JAN_MONDAY, '12:00'), 600],
    ['Mon 08:00 to the Monday after, 17:00 is six days of 480', jan(JAN_MONDAY, '08:00'), jan(JAN_NEXT_MONDAY, '17:00'), 2880],
    ['the lunch hour is not worked', jan(JAN_WEDNESDAY, '12:00'), jan(JAN_WEDNESDAY, '13:00'), 0],
    ['time outside the spans is not worked', jan(JAN_WEDNESDAY, '06:00'), jan(JAN_WEDNESDAY, '19:00'), 480],
    ['the same instant is 0', jan(JAN_FRIDAY, '08:00'), jan(JAN_FRIDAY, '08:00'), 0],
    ['the finish after the end of work and the start before the next morning is 0', jan(JAN_FRIDAY, '17:00'), jan(JAN_MONDAY, '08:00'), 0],
    ['a finish at 00:00:00 of the next day is the end of the day before', jan(JAN_MONDAY, '08:00'), jan(JAN_TUESDAY, '00:00'), 480],
  ])('%s', (_name, from, to, minutes) => {
    expect(actualMinutesOf(within, at(from), at(to))).toBe(minutes)
  })

  it('counts a finish earlier than the start as the negative of the count from the finish to the start', () => {
    const start = at(jan(JAN_SATURDAY, '17:00'))
    const end = at(jan(JAN_FRIDAY, '08:00'))
    expect(actualMinutesOf(within, start, end)).toBe(-960)
    expect(actualMinutesOf(within, start, end)).toBe(-actualMinutesOf(within, end, start))
  })
})

describe('FR-011: other spans of a day, and exception days', () => {
  it('counts only the spans a weekday holds', () => {
    const within = workingCalendarOver({
      working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, [WEDNESDAY]: spansOf(['09:00', '18:00']) },
    })
    expect(actualMinutesOf(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_WEDNESDAY, '18:00')))).toBe(540)
    expect(actualMinutesOf(within, at(jan(JAN_TUESDAY, '08:00')), at(jan(JAN_WEDNESDAY, '18:00')))).toBe(480 + 540)
  })

  it('counts five one-hour spans of a day as five hours', () => {
    const within = workingCalendarOver({
      working: { [MONDAY]: spansOf(['08:00', '09:00'], ['10:00', '11:00'], ['12:00', '13:00'], ['14:00', '15:00'], ['16:00', '17:00']) },
    })
    expect(actualMinutesOf(within, at(jan(JAN_MONDAY, '08:00')), at(jan(JAN_MONDAY, '17:00')))).toBe(300)
  })

  it('reads a span that ends at 00:00:00 as ending at 24:00', () => {
    const within = workingCalendarOver({ working: { [MONDAY]: spansOf(['22:00', '00:00']) } })
    expect(workingMinutesBetween(within, at(jan(JAN_MONDAY, '20:00')), at(jan(JAN_TUESDAY, '00:00')))).toBe(120)
    expect(actualMinutesOf(within, at(jan(JAN_MONDAY, '20:00')), at(jan(JAN_TUESDAY, '00:00')))).toBe(120)
  })

  it('does not count a holiday between the ends, but counts it when it holds an end', () => {
    const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY, exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)] })
    expect(actualMinutesOf(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_NEXT_FRIDAY, '17:00')))).toBe(960)
    expect(actualMinutesOf(within, at(jan(JAN_THURSDAY, '08:00')), at(jan(JAN_THURSDAY, '17:00')))).toBe(480)
  })

  it('skips a holiday that spans several days', () => {
    const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY, exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_NEXT_FRIDAY, false)] })
    expect(actualMinutesOf(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_NEXT_MONDAY, '17:00')))).toBe(960)
  })

  it('reads the range of an exception as days: a ToDate of 00:00:00 holds its own day', () => {
    const range = { ...exceptionOf(1, JAN_THURSDAY, JAN_NEXT_FRIDAY, false), toDate: jan(JAN_NEXT_FRIDAY, '00:00') }
    const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY, exceptions: [range] })
    expect(actualMinutesOf(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_NEXT_MONDAY, '17:00')))).toBe(960)
  })

  it('works a weekday that an exception makes shorter by the spans the exception holds', () => {
    const within = workingCalendarOver({
      working: MONDAY_TO_FRIDAY_WITH_SPANS,
      exceptions: [exceptionOf(1, JAN_WEDNESDAY, JAN_WEDNESDAY, true, spansOf(['09:00', '12:00']))],
    })
    expect(actualMinutesOf(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_WEDNESDAY, '17:00')))).toBe(180)
    expect(workingMinutesBetween(within, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_THURSDAY, '17:00')))).toBe(180 + 480)
  })

  it('works a Saturday that an exception makes a working day, with the spans it holds', () => {
    const within = workingCalendarOver({
      working: MONDAY_TO_FRIDAY,
      exceptions: [exceptionOf(1, JAN_SATURDAY, JAN_SATURDAY, true, spansOf(['09:00', '12:00']))],
    })
    expect(actualMinutesOf(within, at(jan(JAN_FRIDAY, '08:00')), at(jan(JAN_MONDAY, '17:00')))).toBe(480 + 180 + 480)
  })

  it('works a Saturday that an exception makes a working day, with the default spans when it holds none', () => {
    const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY, exceptions: [exceptionOf(1, JAN_SATURDAY, JAN_SATURDAY, true)] })
    expect(actualMinutesOf(within, at(jan(JAN_FRIDAY, '08:00')), at(jan(JAN_MONDAY, '17:00')))).toBe(480 * 3)
  })
})

describe('DV-8: workingMinutesBetween counts the working time between two instants and gives an end day that rests no time', () => {
  const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })

  it.each([
    ['Wed 08:00 to Thu 17:00 is 960, the example PT16H0M0S of DV-8', jan(JAN_WEDNESDAY, '08:00'), jan(JAN_THURSDAY, '17:00'), 960],
    ['Fri 08:00 to Sat 17:00 is 480: the Saturday is not counted', jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '17:00'), 480],
    ['Sat 08:00 to Sat 17:00 is 0', jan(JAN_SATURDAY, '08:00'), jan(JAN_SATURDAY, '17:00'), 0],
    ['Fri 08:00 to Mon 17:00 is 960', jan(JAN_FRIDAY, '08:00'), jan(JAN_MONDAY, '17:00'), 960],
    ['Wed 11:00 to Wed 14:00 is 120: the lunch hour rests', jan(JAN_WEDNESDAY, '11:00'), jan(JAN_WEDNESDAY, '14:00'), 120],
    ['the same instant is 0', jan(JAN_WEDNESDAY, '08:00'), jan(JAN_WEDNESDAY, '08:00'), 0],
  ])('%s', (_name, from, to, minutes) => {
    expect(workingMinutesBetween(within, at(from), at(to))).toBe(minutes)
  })

  it('does not count a holiday between the ends and does not count one that holds an end', () => {
    const holiday = workingCalendarOver({ working: MONDAY_TO_FRIDAY, exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)] })
    expect(workingMinutesBetween(holiday, at(jan(JAN_WEDNESDAY, '08:00')), at(jan(JAN_NEXT_FRIDAY, '17:00')))).toBe(960)
    expect(workingMinutesBetween(holiday, at(jan(JAN_THURSDAY, '08:00')), at(jan(JAN_THURSDAY, '17:00')))).toBe(0)
  })
})

describe('FR-011: instantAfterWorkingMinutes puts a stop that many working minutes after the start', () => {
  const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
  const after = (start: string, minutes: number): string => textOfInstant(instantAfterWorkingMinutes(within, at(start), minutes))

  it.each([
    ['0 is the start itself', jan(JAN_WEDNESDAY, '08:00'), 0, jan(JAN_WEDNESDAY, '08:00')],
    ['120 from 08:00 is 10:00', jan(JAN_WEDNESDAY, '08:00'), 120, jan(JAN_WEDNESDAY, '10:00')],
    ['300 from 08:00 is 14:00: the lunch hour is passed', jan(JAN_WEDNESDAY, '08:00'), 300, jan(JAN_WEDNESDAY, '14:00')],
    ['480 from 08:00 is 17:00 of the same day (1d)', jan(JAN_WEDNESDAY, '08:00'), 480, jan(JAN_WEDNESDAY, '17:00')],
    ['960 from Wed 08:00 is Thu 17:00 (2d)', jan(JAN_WEDNESDAY, '08:00'), 960, jan(JAN_THURSDAY, '17:00')],
    ['600 from Fri 08:00 is Mon 10:00: the weekend rests', jan(JAN_FRIDAY, '08:00'), 600, jan(JAN_MONDAY, '10:00')],
    ['120 from Sat 09:00 is Sat 11:00: a start on a rest day is worked from there', jan(JAN_SATURDAY, '09:00'), 120, jan(JAN_SATURDAY, '11:00')],
    ['-120 from 10:00 is 08:00', jan(JAN_WEDNESDAY, '10:00'), -120, jan(JAN_WEDNESDAY, '08:00')],
    ['-480 from 17:00 is 08:00 of the same day', jan(JAN_WEDNESDAY, '17:00'), -480, jan(JAN_WEDNESDAY, '08:00')],
    ['-240 from Wed 10:00 is Tue 15:00', jan(JAN_WEDNESDAY, '10:00'), -240, jan(JAN_TUESDAY, '15:00')],
  ])('%s', (_name, start, minutes, expected) => {
    expect(after(start, minutes)).toBe(expected)
  })

  it.each([jan(JAN_WEDNESDAY, '08:00'), jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '10:00')])(
    'from %s, the actual length counted back to the stop is the minutes put on',
    (start) => {
      for (const minutes of [0, 120, 300, 480, 600, 960, 1500]) {
        const stop = instantAfterWorkingMinutes(within, at(start), minutes)
        expect(actualMinutesOf(within, at(start), stop), `${minutes} minutes from ${start}`).toBe(minutes)
      }
    },
  )

  it.each([-120, -480, -1000])('from Wed 17:00, a stop %i minutes back reads as that negative length', (minutes) => {
    const start = at(jan(JAN_WEDNESDAY, '17:00'))
    const stop = instantAfterWorkingMinutes(within, start, minutes)
    expect(actualMinutesOf(within, start, stop)).toBe(minutes)
  })
})

describe('FR-012: plannedLengthMinutesOf counts the plan by the rule that counts an actual', () => {
  const within = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
  const taskOf = (start: string | null, finish: string | null, milestone = false): Task =>
    ({ start, finish, milestone }) as unknown as Task

  it.each([
    ['08:00 to 17:00 of one day is 480 (1d)', taskOf(jan(JAN_WEDNESDAY, '08:00'), jan(JAN_WEDNESDAY, '17:00')), 480],
    ['Wed 08:00 to Thu 17:00 is 960', taskOf(jan(JAN_WEDNESDAY, '08:00'), jan(JAN_THURSDAY, '17:00')), 960],
    ['Fri 08:00 to Sat 17:00 is 960: the Saturday edge counts, as for an actual', taskOf(jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '17:00')), 960],
    ['Fri 08:00 to Mon 17:00 is 960', taskOf(jan(JAN_FRIDAY, '08:00'), jan(JAN_MONDAY, '17:00')), 960],
    ['a task whose start is its finish is 0', taskOf(jan(JAN_WEDNESDAY, '17:00'), jan(JAN_WEDNESDAY, '17:00')), 0],
    ['a milestone is 0 whatever its dates', taskOf(jan(JAN_WEDNESDAY, '17:00'), jan(JAN_WEDNESDAY, '17:00'), true), 0],
    ['a milestone with an earlier start is still 0', taskOf(jan(JAN_WEDNESDAY, '08:00'), jan(JAN_THURSDAY, '17:00'), true), 0],
  ])('%s', (_name, task, minutes) => {
    expect(plannedLengthMinutesOf(within, task)).toBe(minutes)
  })

  it('gives no length while the plan misses an end', () => {
    expect(plannedLengthMinutesOf(within, taskOf(null, jan(JAN_WEDNESDAY, '17:00')))).toBeNull()
    expect(plannedLengthMinutesOf(within, taskOf(jan(JAN_WEDNESDAY, '08:00'), null))).toBeNull()
  })

  it('counts a Saturday task from another calendar by that calendar', () => {
    const saturdayWorks = workingCalendarOver({ working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, [SATURDAY]: spansOf(['08:00', '12:00']) } })
    expect(plannedLengthMinutesOf(saturdayWorks, taskOf(jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '12:00')))).toBe(480 + 240)
  })
})

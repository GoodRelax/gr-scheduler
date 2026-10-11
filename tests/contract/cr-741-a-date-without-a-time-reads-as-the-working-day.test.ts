// CR-741 (spec-only): FR-054 reads a date without a time as the working day and cuts seconds to the minute; FR-011 puts a stop on the earliest instant.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  actualInstantsOf,
  actualMinutesOf,
  finishSideDayOf,
  instantAfterWorkingMinutes,
  instantOf,
  instantOnSide,
  isPlanReversed,
  plannedLengthMinutesOf,
  reversedActualMinutesOf,
  startSideOf,
  textOfInstant,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import {
  FRIDAY,
  JAN_FRIDAY,
  JAN_MONDAY,
  JAN_SATURDAY,
  JAN_THURSDAY,
  JAN_TUESDAY,
  JAN_WEDNESDAY,
  MONDAY,
  MONDAY_TO_FRIDAY,
  MONDAY_TO_FRIDAY_WITH_SPANS,
  THURSDAY,
  TUESDAY,
  WEDNESDAY,
  exceptionOf,
  jan,
  spansOf,
  workingCalendarOver,
} from './cr-710-w1-stage'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

// see FR-054, FR-011, IV-14
// WHY: the three new MUST sentences are quoted as the specification writes them, so a reworded sentence goes red here.
const SECONDS_CUT = '⭐ 秒が `00` でない時刻（`2026-01-05T08:00:30`）は、分へ切り捨てて読むこと（MUST）'
const DATE_ONLY_READ =
  '⭐ 時刻を書いていない日付の字（`2026-01-05`）は、表 T-350 の開始の側の列（`WT-1`・`WT-3`）ではその日の最初の時間帯の始まり、終了の側の列（`WT-2`・`WT-4`、`WT-5` のマイルストーンの開始の側）ではその日の最後の時間帯の終わりの瞬間と読むこと（MUST）'
const EARLIEST_INSTANT =
  '⭐ 同じ稼働時間に当たる瞬間が 2 つ以上あるとき（時間帯の終わりと、次の時間帯の始まり）は、最も早い瞬間に置くこと（MUST）'
const IV_14_SECONDS =
  '⭐ 秒が `00` でない時刻は分へ切り捨てて読むので、本行に反しない —— 時刻を書いていない日付の字も読める（どちらの読みも `FR-054`）。'
const NOT_MIDNIGHT = '⚠️ `00:00:00` と読まない —— 終了の側で前の日の終わりになり、日付だけの文書の最後の日が 1 日消える。'
const NON_WORKING_DAY_SET = 'その日の時間帯は上の段の稼働時間とし、非稼働日では `FR-088` の 表 T-344 の `WC-8` の 1 組とする。'

describe('the three MUST sentences of CR-741 read as quoted', () => {
  it('FR-054 cuts a time with seconds to the minute', () => {
    expect(REQUIREMENTS).toContain('⭐ 秒が `00` でない時刻（`2026-01-05T08:00:30`）は、分へ切り捨てて読むこと（MUST）')
  })

  it('FR-054 reads a date without a time as the first start and the last end of the day', () => {
    expect(REQUIREMENTS).toContain(DATE_ONLY_READ)
    expect(REQUIREMENTS).toContain(NON_WORKING_DAY_SET)
    expect(REQUIREMENTS).toContain(NOT_MIDNIGHT)
  })

  it('FR-011 puts the stop on the earliest of the instants that carry the same working minutes', () => {
    expect(REQUIREMENTS).toContain('は、最も早い瞬間に置くこと（MUST）')
    expect(REQUIREMENTS).toContain(EARLIEST_INSTANT)
  })

  it('IV-14 does not refuse a time with seconds', () => {
    expect(DESIGN).toContain(IV_14_SECONDS)
    expect(REQUIREMENTS).toContain(SECONDS_CUT)
  })
})

function at(text: string): number {
  const read = instantOf(text)
  if (read === null) throw new Error(`premise: ${text} was not read as an instant`)
  return read
}

const asText = (instant: number | null): string | null => (instant === null ? null : textOfInstant(instant))

// WHY: Monday to Friday with the spans written on each weekday: 08:00-12:00 and 13:00-17:00 (S-580).
const STANDARD = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
// WHY: Monday to Friday with no span written reads with the default spans of S-580, which are the same two.
const UNSPANNED = workingCalendarOver({ working: MONDAY_TO_FRIDAY })
const NINE_TO_SIX = spansOf(['09:00', '18:00'])
const LONG_DAYS = workingCalendarOver({
  working: { [MONDAY]: NINE_TO_SIX, [TUESDAY]: NINE_TO_SIX, [WEDNESDAY]: NINE_TO_SIX, [THURSDAY]: NINE_TO_SIX, [FRIDAY]: NINE_TO_SIX },
})

// WHY: January 2026 starts on a Thursday: the 2nd is a Friday, the 9th the Friday after, the 10th a Saturday.
const JAN_SECOND_FRIDAY = 9
const JAN_SECOND_SATURDAY = 10

const ISO_MONDAY = '2026-01-05'
const ISO_TUESDAY = '2026-01-06'
const ISO_WEDNESDAY = '2026-01-07'
const ISO_FRIDAY = '2026-01-09'
const ISO_PRIOR_FRIDAY = '2026-01-02'
const ISO_SATURDAY = '2026-01-10'

const planOf = (start: string | null, finish: string | null, milestone = false): Task =>
  ({ start, finish, milestone }) as unknown as Task

const actualOf = (actualStart: string | null, stop: string | null, actualFinish: string | null = null): Task =>
  ({ start: null, finish: null, milestone: false, actualStart, stop, actualFinish }) as unknown as Task

describe.each([
  ['spans written on each weekday', STANDARD],
  ['spans left to S-580', UNSPANNED],
])('FR-054: a date without a time on Monday to Friday, 08:00-12:00 and 13:00-17:00 (%s)', (_label, within) => {
  it('reads Monday to Wednesday, written as dates only, as 1440 minutes (3d)', () => {
    expect(plannedLengthMinutesOf(within, planOf(ISO_MONDAY, ISO_WEDNESDAY))).toBe(1440)
  })

  it('reads one day written as dates only as 480 minutes (1d), not as nothing', () => {
    expect(plannedLengthMinutesOf(within, planOf(ISO_MONDAY, ISO_MONDAY))).toBe(480)
    expect(plannedLengthMinutesOf(within, planOf(ISO_WEDNESDAY, ISO_WEDNESDAY))).toBe(480)
  })

  it('reads Friday to Monday written as dates only as 960 minutes: the weekend rests', () => {
    expect(plannedLengthMinutesOf(within, planOf(ISO_FRIDAY, '2026-01-12'))).toBe(960)
  })

  it('reads a time that is written as it is written, whatever the date-only rule says', () => {
    expect(plannedLengthMinutesOf(within, planOf(jan(JAN_MONDAY, '08:00'), jan(JAN_WEDNESDAY, '17:00')))).toBe(1440)
    expect(plannedLengthMinutesOf(within, planOf(jan(JAN_MONDAY, '10:00'), jan(JAN_WEDNESDAY, '12:00')))).toBe(120 + 240 + 480 + 240)
  })

  it('reads the start side as the first start and the finish side as the last end of the working day', () => {
    expect(asText(instantOnSide(within, ISO_MONDAY, 'start'))).toBe(jan(JAN_MONDAY, '08:00'))
    expect(asText(instantOnSide(within, ISO_MONDAY, 'finish'))).toBe(jan(JAN_MONDAY, '17:00'))
    expect(asText(instantOnSide(within, ISO_FRIDAY, 'start'))).toBe(jan(JAN_SECOND_FRIDAY, '08:00'))
    expect(asText(instantOnSide(within, ISO_FRIDAY, 'finish'))).toBe(jan(JAN_SECOND_FRIDAY, '17:00'))
  })

  it('does not read it as 00:00:00: the finish side is not the end of the day before', () => {
    const midnight = at(jan(JAN_WEDNESDAY, '00:00'))
    expect(instantOnSide(within, ISO_WEDNESDAY, 'finish') as number).toBeGreaterThan(midnight)
    expect(instantOnSide(within, ISO_WEDNESDAY, 'start') as number).toBeGreaterThan(midnight)
  })

  it('reads a date without a time as the day itself on the finish side (PI-1 finishSideDayOf)', () => {
    expect(finishSideDayOf(ISO_WEDNESDAY)).toEqual({ year: 2026, month: 1, day: 7 })
    expect(finishSideDayOf(ISO_MONDAY)).toEqual({ year: 2026, month: 1, day: 5 })
  })

  it('leaves a time that is written, even 00:00:00, to instantOf', () => {
    expect(instantOnSide(within, jan(JAN_WEDNESDAY, '00:00'), 'start')).toBe(at(jan(JAN_WEDNESDAY, '00:00')))
    expect(instantOnSide(within, jan(JAN_WEDNESDAY, '00:00'), 'finish')).toBe(at(jan(JAN_WEDNESDAY, '00:00')))
    expect(instantOnSide(within, jan(JAN_WEDNESDAY, '10:30'), 'finish')).toBe(at(jan(JAN_WEDNESDAY, '10:30')))
  })

  it('gives no instant for null or for a text that is not a date', () => {
    expect(instantOnSide(within, null, 'start')).toBeNull()
    expect(instantOnSide(within, null, 'finish')).toBeNull()
    expect(instantOnSide(within, 'not a date', 'finish')).toBeNull()
  })

  it('reads a date on a non-working day with the one set of WC-8 (08:00-12:00 and 13:00-17:00)', () => {
    expect(asText(instantOnSide(within, ISO_SATURDAY, 'start'))).toBe(jan(JAN_SECOND_SATURDAY, '08:00'))
    expect(asText(instantOnSide(within, ISO_SATURDAY, 'finish'))).toBe(jan(JAN_SECOND_SATURDAY, '17:00'))
    expect(plannedLengthMinutesOf(within, planOf(ISO_SATURDAY, ISO_SATURDAY))).toBe(480)
  })

  it('counts Friday to a non-working Saturday written as dates only as 960: the Saturday edge counts as worked', () => {
    expect(plannedLengthMinutesOf(within, planOf(ISO_FRIDAY, ISO_SATURDAY))).toBe(960)
  })

  it('reads a milestone start side as its finish side', () => {
    const milestone = planOf(ISO_MONDAY, ISO_MONDAY, true)
    const side = startSideOf(milestone)
    expect(side).toBe('finish')
    expect(instantOnSide(within, ISO_MONDAY, side)).toBe(instantOnSide(within, ISO_MONDAY, 'finish'))
    expect(asText(instantOnSide(within, ISO_MONDAY, side))).toBe(jan(JAN_MONDAY, '17:00'))
    expect(plannedLengthMinutesOf(within, milestone)).toBe(0)
  })

  it('reads the start side of a task that is not a milestone as the start side', () => {
    expect(startSideOf(planOf(ISO_MONDAY, ISO_WEDNESDAY))).toBe('start')
    expect(startSideOf(planOf(ISO_MONDAY, ISO_WEDNESDAY, false))).toBe('start')
  })
})

describe('FR-054: the day itself decides the spans a date without a time reads as', () => {
  it('reads the first start and the last end of a day with other spans', () => {
    expect(asText(instantOnSide(LONG_DAYS, ISO_MONDAY, 'start'))).toBe(jan(JAN_MONDAY, '09:00'))
    expect(asText(instantOnSide(LONG_DAYS, ISO_MONDAY, 'finish'))).toBe(jan(JAN_MONDAY, '18:00'))
    expect(plannedLengthMinutesOf(LONG_DAYS, planOf(ISO_MONDAY, ISO_TUESDAY))).toBe(1080)
  })

  it('reads the earliest start and the latest end of five spans', () => {
    const five = spansOf(['08:00', '09:00'], ['10:00', '11:00'], ['12:00', '13:00'], ['14:00', '15:00'], ['16:00', '17:30'])
    const within = workingCalendarOver({ working: { [MONDAY]: five } })
    expect(asText(instantOnSide(within, ISO_MONDAY, 'start'))).toBe(jan(JAN_MONDAY, '08:00'))
    expect(asText(instantOnSide(within, ISO_MONDAY, 'finish'))).toBe(jan(JAN_MONDAY, '17:30'))
  })

  it('reads the spans an exception day holds', () => {
    const within = workingCalendarOver({
      working: MONDAY_TO_FRIDAY_WITH_SPANS,
      exceptions: [exceptionOf(1, JAN_WEDNESDAY, JAN_WEDNESDAY, true, spansOf(['09:00', '12:00']))],
    })
    expect(asText(instantOnSide(within, ISO_WEDNESDAY, 'start'))).toBe(jan(JAN_WEDNESDAY, '09:00'))
    expect(asText(instantOnSide(within, ISO_WEDNESDAY, 'finish'))).toBe(jan(JAN_WEDNESDAY, '12:00'))
  })

  it('reads a non-working day with the one set of WC-8 when the working days hold 09:00-18:00', () => {
    expect(asText(instantOnSide(LONG_DAYS, ISO_SATURDAY, 'start'))).toBe(jan(JAN_SECOND_SATURDAY, '09:00'))
    expect(asText(instantOnSide(LONG_DAYS, ISO_SATURDAY, 'finish'))).toBe(jan(JAN_SECOND_SATURDAY, '18:00'))
  })

  it('reads a holiday written as dates only with the same set', () => {
    const within = workingCalendarOver({
      working: MONDAY_TO_FRIDAY_WITH_SPANS,
      exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)],
    })
    expect(asText(instantOnSide(within, '2026-01-08', 'start'))).toBe(jan(JAN_THURSDAY, '08:00'))
    expect(asText(instantOnSide(within, '2026-01-08', 'finish'))).toBe(jan(JAN_THURSDAY, '17:00'))
  })
})

describe('IV-10 with FR-054: a plan written as dates only is reversed when its finish day is before its start day', () => {
  it.each([
    ['the same day is not reversed', ISO_MONDAY, ISO_MONDAY, false],
    ['a later finish day is not reversed', ISO_MONDAY, ISO_WEDNESDAY, false],
    ['an earlier finish day is reversed', ISO_WEDNESDAY, ISO_MONDAY, true],
    ['a finish on the Friday before a Monday start is reversed', ISO_MONDAY, ISO_PRIOR_FRIDAY, true],
    ['a finish on Saturday after a Friday start is not reversed', ISO_FRIDAY, ISO_SATURDAY, false],
  ])('%s', (_name, start, finish, reversed) => {
    expect(isPlanReversed(STANDARD, { start, finish })).toBe(reversed)
  })

  it('does not call a milestone reversed when its dates are the same day', () => {
    expect(isPlanReversed(STANDARD, { start: ISO_MONDAY, finish: ISO_MONDAY, milestone: true })).toBe(false)
  })
})

describe('FR-011: the actual instants and the length of a reversed actual read dates without a time by the side', () => {
  it('reads actualStart on the start side and stop on the finish side', () => {
    const instants = actualInstantsOf(STANDARD, actualOf(ISO_MONDAY, ISO_WEDNESDAY))
    expect(instants).not.toBeNull()
    expect(asText((instants as readonly [number, number])[0])).toBe(jan(JAN_MONDAY, '08:00'))
    expect(asText((instants as readonly [number, number])[1])).toBe(jan(JAN_WEDNESDAY, '17:00'))
  })

  it('reads actualFinish, not stop, as the end of a finished task', () => {
    const instants = actualInstantsOf(STANDARD, actualOf(ISO_MONDAY, ISO_TUESDAY, ISO_WEDNESDAY))
    expect(asText((instants as readonly [number, number])[1])).toBe(jan(JAN_WEDNESDAY, '17:00'))
  })

  it('gives no instants for a task not started or an end that cannot be read', () => {
    expect(actualInstantsOf(STANDARD, actualOf(null, null))).toBeNull()
    expect(actualInstantsOf(STANDARD, actualOf(ISO_MONDAY, null))).toBeNull()
    expect(actualInstantsOf(STANDARD, actualOf(ISO_MONDAY, 'not a date'))).toBeNull()
  })

  it('gives no reversed length for an actual that is not reversed, even on the same day', () => {
    expect(reversedActualMinutesOf(STANDARD, actualOf(ISO_MONDAY, ISO_MONDAY))).toBeNull()
    expect(reversedActualMinutesOf(STANDARD, actualOf(ISO_MONDAY, ISO_WEDNESDAY))).toBeNull()
    expect(reversedActualMinutesOf(STANDARD, actualOf(null, null))).toBeNull()
  })

  it('gives length 0 to Monday against the Friday before: Friday 17:00 to Monday 08:00 rests no time', () => {
    const length = reversedActualMinutesOf(STANDARD, actualOf(ISO_MONDAY, ISO_PRIOR_FRIDAY))
    expect(length).not.toBeNull()
    expect(length === 0).toBe(true)
  })

  it('gives a negative length to an end whose day is before the start day by a working day', () => {
    expect(reversedActualMinutesOf(STANDARD, actualOf(ISO_FRIDAY, ISO_WEDNESDAY))).toBe(-480)
  })

  it('gives a negative length by the working time between the end and the start for written times', () => {
    expect(reversedActualMinutesOf(STANDARD, actualOf(jan(JAN_WEDNESDAY, '17:00'), jan(JAN_MONDAY, '08:00')))).toBe(-1440)
  })
})

describe('FR-054: a time with seconds is cut to the minute and is not refused', () => {
  it.each(['00', '01', '30', '59'])('08:00:%s is the same instant as 08:00', (seconds) => {
    expect(instantOf(`2026-01-05T08:00:${seconds}`)).toBe(instantOf('2026-01-05T08:00:00'))
  })

  it('does not round up: 08:00:59 is not 08:01', () => {
    expect(instantOf('2026-01-05T08:00:59')).not.toBe(instantOf('2026-01-05T08:01:00'))
  })

  it('writes the cut instant back with seconds 00', () => {
    expect(textOfInstant(at('2026-01-05T08:00:30'))).toBe('2026-01-05T08:00:00')
  })

  it('cuts the same on both sides of a reading by the side', () => {
    expect(instantOnSide(STANDARD, '2026-01-05T08:00:30', 'start')).toBe(at('2026-01-05T08:00:00'))
    expect(instantOnSide(STANDARD, '2026-01-05T17:00:45', 'finish')).toBe(at('2026-01-05T17:00:00'))
  })

  it('counts a plan written with seconds as the plan written without them', () => {
    const withSeconds = planOf('2026-01-05T08:00:30', '2026-01-07T17:00:30')
    expect(plannedLengthMinutesOf(STANDARD, withSeconds)).toBe(1440)
    expect(isPlanReversed(STANDARD, { start: '2026-01-05T08:00:30', finish: '2026-01-05T08:00:10' })).toBe(false)
  })
})

describe('FR-011: a stop that many working minutes after the start is the earliest instant', () => {
  const after = (start: string, minutes: number): string => textOfInstant(instantAfterWorkingMinutes(STANDARD, at(start), minutes))

  it.each([
    ['240 from 08:00 is 12:00, not 13:00', jan(JAN_MONDAY, '08:00'), 240, jan(JAN_MONDAY, '12:00')],
    ['480 from 08:00 is 17:00, not the next morning', jan(JAN_MONDAY, '08:00'), 480, jan(JAN_MONDAY, '17:00')],
    ['480 from Friday 08:00 is Friday 17:00, not Monday 08:00', jan(JAN_FRIDAY, '08:00'), 480, jan(JAN_FRIDAY, '17:00')],
    ['960 from Monday 08:00 is Tuesday 17:00', jan(JAN_MONDAY, '08:00'), 960, jan(JAN_TUESDAY, '17:00')],
    ['720 from Monday 08:00 is Tuesday 12:00', jan(JAN_MONDAY, '08:00'), 720, jan(JAN_TUESDAY, '12:00')],
    ['120 from 10:00 is 12:00', jan(JAN_MONDAY, '10:00'), 120, jan(JAN_MONDAY, '12:00')],
    ['300 from 08:00 is 14:00, inside a span', jan(JAN_MONDAY, '08:00'), 300, jan(JAN_MONDAY, '14:00')],
    ['0 is the start itself', jan(JAN_MONDAY, '08:00'), 0, jan(JAN_MONDAY, '08:00')],
  ])('%s', (_name, start, minutes, expected) => {
    expect(after(start, minutes)).toBe(expected)
  })

  it.each([
    ['-480 from 17:00 is 17:00 of the day before', jan(JAN_WEDNESDAY, '17:00'), -480, jan(JAN_TUESDAY, '17:00')],
    ['-120 from 10:00 is 17:00 of the day before', jan(JAN_WEDNESDAY, '10:00'), -120, jan(JAN_TUESDAY, '17:00')],
    ['-240 from 17:00 is 12:00 of the same day: the end of the morning, not the start of the afternoon', jan(JAN_WEDNESDAY, '17:00'), -240, jan(JAN_WEDNESDAY, '12:00')],
  ])('going back, %s', (_name, start, minutes, expected) => {
    expect(after(start, minutes)).toBe(expected)
  })

  it('counts the minutes put on back from the stop, from a working day and from a rest day', () => {
    for (const start of [jan(JAN_MONDAY, '08:00'), jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '10:00')]) {
      for (const minutes of [240, 480, 720, 960]) {
        const stop = instantAfterWorkingMinutes(STANDARD, at(start), minutes)
        expect(actualMinutesOf(STANDARD, at(start), stop), `${minutes} minutes from ${start}`).toBe(minutes)
      }
    }
  })
})

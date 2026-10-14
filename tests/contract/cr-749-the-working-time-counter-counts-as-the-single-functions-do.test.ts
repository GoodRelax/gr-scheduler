// CR-749 (spec-only): PI-1 workingTimeCounterOf and finishSideDayFrom give the answers the single-Task functions give (FR-011, FR-012, FR-054), called as T-064 PI-1 states (CR-752).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  actualInstantsOf,
  actualMinutesOf,
  dayOf,
  finishSideDayFrom,
  finishSideDayOf,
  plannedLengthMinutesOf,
  workingTimeCounterOf,
  type Task,
} from '../../src/entity/document-model/schedule/schedule'
import {
  JAN_THURSDAY,
  JAN_WEDNESDAY,
  MONDAY_TO_FRIDAY_WITH_SPANS,
  exceptionOf,
  jan,
  spansOf,
  workingCalendarOver,
} from './cr-710-w1-stage'
import { unbroken } from './spec-table'

const PUBLISHED = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-published-entries.md'), 'utf8'))

// see PI-1
describe('PI-1 names the counter and the day reader CR-749 publishes', () => {
  it.each(['workingTimeCounterOf', 'WorkingTimeCounter', 'finishSideDayFrom'])('%s is a member of PI-1', (name) => {
    expect(PUBLISHED).toContain(`\`${name}\``)
  })
})

// WHY: Monday to Friday 08:00-12:00 and 13:00-17:00 (S-580), with Thursday 2026-01-08 a holiday and Wednesday 2026-01-07 a short day.
const WITH_EXCEPTIONS = workingCalendarOver({
  working: MONDAY_TO_FRIDAY_WITH_SPANS,
  exceptions: [
    exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false),
    exceptionOf(2, JAN_WEDNESDAY, JAN_WEDNESDAY, true, spansOf(['09:00', '12:00'])),
  ],
})
const PLAIN = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })

const planOf = (start: string | null, finish: string | null, milestone = false): Task =>
  ({ start, finish, milestone, actualStart: null, stop: null, actualFinish: null }) as unknown as Task

const actualOf = (actualStart: string | null, stop: string | null, actualFinish: string | null = null): Task =>
  ({ start: null, finish: null, milestone: false, actualStart, stop, actualFinish }) as unknown as Task

// WHY: dates only, dates with times, a span over the holiday and a weekend, a reversed span, a milestone, and texts that cannot be read.
const PLANS: readonly (readonly [string, Task])[] = [
  ['dates only, Monday to Wednesday', planOf('2026-01-05', '2026-01-07')],
  ['dates only over the holiday', planOf('2026-01-07', '2026-01-09')],
  ['dates only on the holiday itself', planOf('2026-01-08', '2026-01-08')],
  ['dates only across a weekend', planOf('2026-01-09', '2026-01-12')],
  ['times written', planOf(jan(5, '10:00'), jan(7, '11:00'))],
  ['a time with seconds', planOf('2026-01-05T08:00:30', '2026-01-06T17:00:45')],
  ['a finish at midnight', planOf('2026-01-05', '2026-01-08T00:00:00')],
  ['a reversed span', planOf('2026-01-09', '2026-01-05')],
  ['a milestone', planOf('2026-01-06', '2026-01-06', true)],
  ['a milestone with times', planOf(jan(6, '10:00'), jan(6, '15:00'), true)],
  ['a start that cannot be read', planOf('not a date', '2026-01-07')],
  ['a finish that cannot be read', planOf('2026-01-05', 'not a date')],
  ['no start', planOf(null, '2026-01-07')],
  ['no finish', planOf('2026-01-05', null)],
]

const ACTUALS: readonly (readonly [string, Task])[] = [
  ['not started', actualOf(null, null)],
  ['started, no stop', actualOf('2026-01-05', null)],
  ['stop that cannot be read', actualOf('2026-01-05', 'not a date')],
  ['dates only, stopped', actualOf('2026-01-05', '2026-01-07')],
  ['dates only over the holiday', actualOf('2026-01-07', '2026-01-09')],
  ['times written, stopped', actualOf(jan(5, '10:00'), jan(7, '11:00'))],
  ['finished: actualFinish, not stop, ends it', actualOf('2026-01-05', '2026-01-06', '2026-01-09')],
  ['finished with times', actualOf(jan(5, '08:00'), jan(6, '10:00'), jan(9, '17:00'))],
  ['a reversed actual', actualOf('2026-01-09', '2026-01-05')],
  ['a start that cannot be read', actualOf('not a date', '2026-01-07')],
]

const CALENDARS = [
  ['a calendar with a holiday and a short day', WITH_EXCEPTIONS],
  ['a plain Monday to Friday calendar', PLAIN],
] as const

const actualLengthByParts = (within: typeof PLAIN, task: Task): number | null => {
  const instants = actualInstantsOf(within, task)
  return instants === null ? null : actualMinutesOf(within, instants[0], instants[1])
}

describe.each(CALENDARS)('FR-012: plannedLengthMinutes equals plannedLengthMinutesOf (%s)', (_label, within) => {
  it.each(PLANS)('%s', (_name, task) => {
    expect(workingTimeCounterOf(within).plannedLengthMinutes(task)).toEqual(plannedLengthMinutesOf(within, task))
  })

  it('counts a milestone as 0', () => {
    expect(workingTimeCounterOf(within).plannedLengthMinutes(planOf('2026-01-06', '2026-01-06', true))).toBe(0)
  })

  it.each(['start', 'finish'] as const)('gives no length when the %s cannot be read', (end) => {
    const task = end === 'start' ? planOf('not a date', '2026-01-07') : planOf('2026-01-05', 'not a date')
    expect(workingTimeCounterOf(within).plannedLengthMinutes(task)).toBeNull()
  })
})

describe.each(CALENDARS)('FR-011: actualLengthMinutes equals actualMinutesOf over the two actual instants (%s)', (_label, within) => {
  it.each(ACTUALS)('%s', (_name, task) => {
    expect(workingTimeCounterOf(within).actualLengthMinutes(task)).toEqual(actualLengthByParts(within, task))
  })

  it.each([
    ['not started', actualOf(null, null)],
    ['no stop', actualOf('2026-01-05', null)],
    ['an end that cannot be read', actualOf('2026-01-05', 'not a date')],
    ['a start that cannot be read', actualOf('not a date', '2026-01-07')],
  ])('gives no length for %s', (_name, task) => {
    expect(workingTimeCounterOf(within).actualLengthMinutes(task)).toBeNull()
  })

  it('counts a finished task to actualFinish', () => {
    const task = actualOf('2026-01-05', '2026-01-06', '2026-01-09')
    const counter = workingTimeCounterOf(within)
    expect(counter.actualLengthMinutes(task)).toBe(actualLengthByParts(within, task))
    expect(counter.actualLengthMinutes(task)).not.toBe(counter.actualLengthMinutes(actualOf('2026-01-05', '2026-01-06')))
  })
})

describe.each(CALENDARS)('FR-012: one counter over many Tasks equals a fresh count for each Task (%s)', (_label, within) => {
  it('answers every plan and every actual the same as a counter made for that Task alone', () => {
    const shared = workingTimeCounterOf(within)
    for (const [name, task] of PLANS) {
      expect(shared.plannedLengthMinutes(task), `plan: ${name}`).toEqual(workingTimeCounterOf(within).plannedLengthMinutes(task))
    }
    for (const [name, task] of ACTUALS) {
      expect(shared.actualLengthMinutes(task), `actual: ${name}`).toEqual(workingTimeCounterOf(within).actualLengthMinutes(task))
    }
  })

  it('answers the same when the Tasks come in the opposite order and mix both counts', () => {
    const forward = workingTimeCounterOf(within)
    const backward = workingTimeCounterOf(within)
    const asked = (counter: ReturnType<typeof workingTimeCounterOf>, task: Task) => [
      counter.plannedLengthMinutes(task),
      counter.actualLengthMinutes(task),
    ]
    const tasks = [...PLANS, ...ACTUALS].map(([, task]) => task)
    const first = tasks.map((task) => asked(forward, task))
    const second = [...tasks]
      .reverse()
      .map((task) => asked(backward, task))
      .reverse()
    expect(second).toEqual(first)
  })

  it('answers the same when asked a second time', () => {
    const counter = workingTimeCounterOf(within)
    const once = PLANS.map(([, task]) => counter.plannedLengthMinutes(task))
    expect(PLANS.map(([, task]) => counter.plannedLengthMinutes(task))).toEqual(once)
  })
})

// see FR-054
describe('FR-054: finishSideDayFrom(dayOf(text), text) equals finishSideDayOf(text)', () => {
  it.each([
    ['a time during the day', '2026-01-07T08:00:00'],
    ['a time with seconds', '2026-01-07T08:00:30'],
    ['the last minute of the day', '2026-01-07T23:59:00'],
    ['midnight, which ends the day before', '2026-01-07T00:00:00'],
    ['midnight on the first of a month', '2026-03-01T00:00:00'],
    ['midnight on the first of a leap-year March', '2028-03-01T00:00:00'],
    ['midnight on the first of a year', '2026-01-01T00:00:00'],
    ['a date without a time, which is the day itself', '2026-01-07'],
    ['the minute after midnight', '2026-06-24T00:01:00'],
  ])('%s (%s)', (_name, text) => {
    expect(finishSideDayFrom(dayOf(text), text)).toEqual(finishSideDayOf(text))
  })

  it('reads midnight as the day before and a date without a time as the day itself', () => {
    expect(finishSideDayFrom(dayOf('2026-06-24T00:00:00'), '2026-06-24T00:00:00')).toEqual({ year: 2026, month: 6, day: 23 })
    expect(finishSideDayFrom(dayOf('2026-01-07'), '2026-01-07')).toEqual({ year: 2026, month: 1, day: 7 })
  })

  it.each([
    ['a text that is not a date', 'not a date'],
    ['an empty text', ''],
    ['a date with an impossible month', '2026-13-01'],
  ])('%s gives the answer finishSideDayOf gives', (_name, text) => {
    expect(finishSideDayFrom(dayOf(text), text)).toEqual(finishSideDayOf(text))
  })

  it('gives no day for a text that cannot be read', () => {
    expect(finishSideDayFrom(dayOf('not a date'), 'not a date')).toBeNull()
  })
})

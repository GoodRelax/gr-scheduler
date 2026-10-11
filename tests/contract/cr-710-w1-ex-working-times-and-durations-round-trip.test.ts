// CR-710 wave 1 (spec-only): WorkingTimes, Duration, ActualDuration and Stop through the MSPDI and GRS JSON codecs, and the import check of IV-24.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  documentFromMspdi,
  jsonFromDocument,
  mspdiFromDocument,
} from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { actualMinutesOf, instantOf, workingCalendarOf, plannedLengthMinutesOf } from '../../src/entity/document-model/schedule/schedule'
import { editCalendar } from '../../src/use-case/edit-document/edit-calendar'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { currentDocument } from '../unit/cr-429-mspdi-fixtures'
import { schemaFaults } from '../unit/cr-429-mspdi-schema'
import { documentObject, elementTexts, taskElementOf, taskRow } from '../unit/cr-646-stage'
import { unbroken } from './spec-table'
import {
  JAN_FRIDAY,
  JAN_MONDAY,
  JAN_SATURDAY,
  JAN_THURSDAY,
  JAN_WEDNESDAY,
  exceptionOf,
  MONDAY_TO_FRIDAY_WITH_SPANS,
  MORNING_AND_AFTERNOON,
  calendarRowOf,
  jan,
  pairsOf,
  spansOf,
  type CalendarParts,
} from './cr-710-w1-stage'

const ERD = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'fig-erd-detail.md'), 'utf8'))
const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see DV-8, DV-11, AT-158, AT-159
const CLAUSES = [
  '`start` から `finish` までの、文書の暦の稼働時間の合計（分、`01-04-requirements.md` の `FR-054`）を `PTnHnMnS` で書く。マイルストーン（`Task.milestone` が真）は `PT0H0M0S`。',
  '公式の例は、水曜の `08:00:00` に始まり木曜の `17:00:00` に終わるタスクを `PT16H0M0S` と書く',
  '`FR-011` が日時から数えた実績の長さ（分）。',
  '時間帯（`WorkingTime` の並び、始まりの順）。',
]

const STOP_FROM_DURATION =
  '完了していないのに `Stop` を持たない `Task` は、`actualStart` から `ActualDuration` の分だけ稼働時間を進めた瞬間を `stop` に置くこと（MUST）'

describe('the clauses these cases are built from still read as quoted', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(ERD).toContain(clause)
  })

  it('FR-011 still puts the stop at the ActualDuration', () => {
    expect(REQUIREMENTS).toContain(STOP_FROM_DURATION)
  })
})

const SAVED_AT = '2026-10-11T09:00:00'
const NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// WHY: April 2026 starts on a Wednesday, so the 6th is a Monday, the 8th a Wednesday, the 11th a Saturday.
const april = (dayOfMonth: number, hhmm: string): string => `2026-04-${String(dayOfMonth).padStart(2, '0')}T${hhmm}:00`

type Pairs = readonly (readonly [string, string])[]

const timesXml = (pairs: Pairs): string =>
  pairs.length === 0
    ? ''
    : `<WorkingTimes>${pairs.map(([from, to]) => `<WorkingTime><FromTime>${from}</FromTime><ToTime>${to}</ToTime></WorkingTime>`).join('')}</WorkingTimes>`

const weekDayXml = (dayType: number, pairs: Pairs | null): string =>
  `<WeekDay><DayType>${dayType}</DayType><DayWorking>${pairs === null ? 0 : 1}</DayWorking>${timesXml(pairs ?? [])}</WeekDay>`

const exceptionXml = (name: string, from: string, to: string, working: boolean, pairs: Pairs): string =>
  `<Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>${from}</FromDate><ToDate>${to}</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>${name}</Name><Type>1</Type><DayWorking>${working ? 1 : 0}</DayWorking>${timesXml(pairs)}</Exception>`

function taskXml(uid: number, start: string, finish: string, extra = ''): string {
  return `<Task><UID>${uid}</UID><ID>${uid}</ID><Name>T${uid}</Name><OutlineNumber>${uid}</OutlineNumber><OutlineLevel>1</OutlineLevel><Start>${start}</Start><Finish>${finish}</Finish><Duration>PT16H0M0S</Duration><DurationFormat>7</DurationFormat><Milestone>0</Milestone><Summary>0</Summary>${extra}</Task>`
}

const SPLIT_DAY: Pairs = [['08:00:00', '12:00:00'], ['13:00:00', '17:00:00']]
const THREE_SPANS: Pairs = [['06:00:00', '09:00:00'], ['10:00:00', '12:00:00'], ['13:00:00', '17:00:00']]
const FIVE_SPANS: Pairs = [['06:00:00', '07:00:00'], ['08:00:00', '09:00:00'], ['10:00:00', '11:00:00'], ['12:00:00', '13:00:00'], ['14:00:00', '15:00:00']]
const LONG_DAY: Pairs = [['09:00:00', '18:00:00']]
const NIGHT: Pairs = [['22:00:00', '00:00:00']]
const SATURDAY_MORNING: Pairs = [['09:00:00', '12:00:00']]

const WEEK_DAYS: readonly (readonly [number, Pairs | null])[] = [
  [1, null],
  [2, SPLIT_DAY],
  [3, THREE_SPANS],
  [4, LONG_DAY],
  [5, FIVE_SPANS],
  [6, NIGHT],
  [7, null],
]

const STANDARD_WEEK: readonly (readonly [number, Pairs | null])[] = [[1, null], [2, SPLIT_DAY], [3, SPLIT_DAY], [4, SPLIT_DAY], [5, SPLIT_DAY], [6, SPLIT_DAY], [7, null]]

function mspdiOf(tasks: string, exceptions = '', week = WEEK_DAYS): string {
  const weekDays = week.map(([dayType, pairs]) => weekDayXml(dayType, pairs)).join('')
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<Project xmlns="${NAMESPACE}">`,
    '<SaveVersion>12</SaveVersion>',
    '<Name>Working times</Name>',
    `<StartDate>${april(6, '08:00')}</StartDate>`,
    '<CalendarUID>1</CalendarUID>',
    '<MinutesPerDay>480</MinutesPerDay>',
    '<WeekStartDay>1</WeekStartDay>',
    `<Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${weekDays}</WeekDays>${exceptions === '' ? '' : `<Exceptions>${exceptions}</Exceptions>`}</Calendar></Calendars>`,
    `<Tasks>${tasks}</Tasks>`,
    '</Project>',
  ].join('\n')
}

function readDocument(text: string): Document {
  const read = documentFromMspdi(text, currentDocument())
  if (!read.ok) throw new Error(`premise: the file was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

function weekDayTimesIn(xml: string): Record<number, Pairs> {
  const blocks = [...xml.matchAll(/<WeekDay>([\s\S]*?)<\/WeekDay>/g)]
  return Object.fromEntries(
    blocks.map((block) => {
      const body = block[1] ?? ''
      const dayType = Number(elementTexts(body, 'DayType')[0])
      const froms = elementTexts(body, 'FromTime')
      const tos = elementTexts(body, 'ToTime')
      return [dayType, froms.map((from, i) => [from, tos[i] ?? ''] as const)]
    }),
  )
}

const TASKS = taskXml(1, april(6, '08:00'), april(7, '17:00'))
const SATURDAY_OPEN = exceptionXml('Open Saturday', april(11, '00:00'), april(11, '23:59'), true, SATURDAY_MORNING)

describe('AT-158 / AT-159: WorkingTimes are read onto the weekday and the exception that holds them', () => {
  const document = readDocument(mspdiOf(TASKS, SATURDAY_OPEN))
  const calendar = document.schedule.calendars[0]

  it('holds the spans of each weekday in the order the file wrote them, kept as written', () => {
    for (const [dayType, pairs] of WEEK_DAYS) {
      const day = calendar?.weekDays.find((one) => one.dayType === dayType)
      expect(pairsOf(day?.workingTimes ?? []), `dayType ${dayType}`).toEqual(pairs ?? [])
    }
  })

  it('keeps five spans on a day and a span that ends at 00:00:00 as written', () => {
    const thursday = calendar?.weekDays.find((one) => one.dayType === 5)
    const friday = calendar?.weekDays.find((one) => one.dayType === 6)
    expect(thursday?.workingTimes).toHaveLength(5)
    expect(pairsOf(friday?.workingTimes ?? [])).toEqual(NIGHT)
  })

  it('gives the spans of one day distinct ordinals that rise with the order', () => {
    const ordinals = (calendar?.weekDays.find((one) => one.dayType === 3)?.workingTimes ?? []).map((one) => one.ordinal)
    expect(new Set(ordinals).size).toBe(3)
    expect([...ordinals]).toEqual([...ordinals].sort((a, b) => a - b))
  })

  it('holds the spans of a working exception day', () => {
    const exception = calendar?.exceptions.find((one) => one.name === 'Open Saturday')
    expect(exception?.dayWorking).toBe(true)
    expect(pairsOf(exception?.workingTimes ?? [])).toEqual(SATURDAY_MORNING)
  })

  it('does not convert the clock of a span', () => {
    const monday = calendar?.weekDays.find((one) => one.dayType === 2)
    expect(monday?.workingTimes[0]?.fromTime).toBe('08:00:00')
  })
})

describe('AT-158 / AT-159: MSPDI writes back the spans it read, in the same order, under the same weekday and exception', () => {
  const document = readDocument(mspdiOf(TASKS, SATURDAY_OPEN))
  const written = mspdiFromDocument(document, SAVED_AT).text

  it('writes every weekday with the spans it read', () => {
    const found = weekDayTimesIn(written)
    for (const [dayType, pairs] of WEEK_DAYS) expect(found[dayType] ?? [], `dayType ${dayType}`).toEqual(pairs ?? [])
  })

  it('writes the exception with its spans', () => {
    const block = /<Exception>([\s\S]*?)<\/Exception>/.exec(written)?.[1] ?? ''
    expect(elementTexts(block, 'FromTime')).toEqual(['09:00:00'])
    expect(elementTexts(block, 'ToTime')).toEqual(['12:00:00'])
  })

  it('is a file the exchange schema accepts', () => {
    expect(schemaFaults(written, 'pj12')).toEqual([])
  })

  it('reads again as the same spans', () => {
    const again = readDocument(written).schedule.calendars[0]
    for (const [dayType, pairs] of WEEK_DAYS) {
      expect(pairsOf(again?.weekDays.find((one) => one.dayType === dayType)?.workingTimes ?? []), `dayType ${dayType}`).toEqual(pairs ?? [])
    }
  })
})

function documentWith(
  parts: CalendarParts,
  tasks: readonly Record<string, unknown>[],
  project: Record<string, unknown> = {},
): Document {
  const object = documentObject({ tasks, project })
  object['schedule']['calendars'] = [calendarRowOf(parts)]
  return object as unknown as Document
}

const durationOf = (document: Document, uid = 1): string[] =>
  elementTexts(taskElementOf(mspdiFromDocument(document, SAVED_AT).text, uid), 'Duration')

// see DV-8, EX-12
describe('DV-8: a task a person made writes Duration as the working time between its start and its finish', () => {
  const standard = { working: MONDAY_TO_FRIDAY_WITH_SPANS }

  it.each([
    ['Wed 08:00 to Thu 17:00, the example of DV-8', jan(JAN_WEDNESDAY, '08:00'), jan(JAN_THURSDAY, '17:00'), 'PT16H0M0S'],
    ['08:00 to 17:00 of one day', jan(JAN_WEDNESDAY, '08:00'), jan(JAN_WEDNESDAY, '17:00'), 'PT8H0M0S'],
    ['Fri 08:00 to Sat 17:00: the Saturday is not worked', jan(JAN_FRIDAY, '08:00'), jan(JAN_SATURDAY, '17:00'), 'PT8H0M0S'],
    ['10:00 to 14:00 across the lunch hour', jan(JAN_WEDNESDAY, '10:00'), jan(JAN_WEDNESDAY, '14:00'), 'PT3H0M0S'],
    ['08:30 to 10:00', jan(JAN_WEDNESDAY, '08:30'), jan(JAN_WEDNESDAY, '10:00'), 'PT1H30M0S'],
  ])('%s is %s', (_name, start, finish, duration) => {
    const document = documentWith(standard, [taskRow(1, { start, finish })])
    expect(durationOf(document)).toEqual([duration])
  })

  it('counts the spans of the calendar the document has', () => {
    const document = documentWith(
      { working: { 4: spansOf(['09:00', '18:00']), 5: spansOf(['09:00', '18:00']) } },
      [taskRow(1, { start: jan(JAN_WEDNESDAY, '09:00'), finish: jan(JAN_THURSDAY, '18:00') })],
    )
    expect(durationOf(document)).toEqual(['PT18H0M0S'])
  })

  it('writes PT0H0M0S for a milestone', () => {
    const at = jan(JAN_WEDNESDAY, '17:00')
    const document = documentWith(standard, [taskRow(1, { start: at, finish: at, milestone: true })])
    expect(durationOf(document)).toEqual(['PT0H0M0S'])
  })
})

// see DV-11, FR-011
describe('DV-11: a task a person made writes ActualDuration as the actual length FR-011 counts', () => {
  const standard = { working: MONDAY_TO_FRIDAY_WITH_SPANS }
  const actualOf = (part: Record<string, unknown>): string[] => {
    const document = documentWith(standard, [taskRow(1, { start: jan(JAN_FRIDAY, '08:00'), finish: jan(JAN_MONDAY, '17:00'), ...part })])
    return elementTexts(taskElementOf(mspdiFromDocument(document, SAVED_AT).text, 1), 'ActualDuration')
  }

  it('writes 960 minutes for a Friday 08:00 to Saturday 17:00 actual', () => {
    expect(actualOf({ actualStart: jan(JAN_FRIDAY, '08:00'), stop: jan(JAN_SATURDAY, '17:00') })).toEqual(['PT16H0M0S'])
  })

  it('writes the length of a finished actual from its actualFinish', () => {
    expect(actualOf({ actualStart: jan(JAN_WEDNESDAY, '08:00'), actualFinish: jan(JAN_WEDNESDAY, '17:00') })).toEqual(['PT8H0M0S'])
  })
})

// see FR-011, EX-2
describe('FR-011: a file with an ActualStart and an ActualDuration but no Stop gets its stop that many working minutes on', () => {
  const stopOf = (duration: string): string | null | undefined => {
    const extra = `<ActualStart>${april(8, '08:00')}</ActualStart><ActualDuration>${duration}</ActualDuration>`
    const document = readDocument(mspdiOf(taskXml(1, april(8, '08:00'), april(10, '17:00'), extra), '', STANDARD_WEEK))
    return document.schedule.tasks.find((one) => one.uid === 1)?.stop
  }

  it.each([
    ['PT16H0M0S', april(9, '17:00')],
    ['PT2H0M0S', april(8, '10:00')],
    ['PT0H0M0S', april(8, '08:00')],
  ])('ActualDuration %s puts the stop at %s', (duration, stop) => {
    expect(stopOf(duration)).toBe(stop)
  })

  it('writes no Stop back while a person has not edited the actual', () => {
    const extra = `<ActualStart>${april(8, '08:00')}</ActualStart><ActualDuration>PT16H0M0S</ActualDuration>`
    const document = readDocument(mspdiOf(taskXml(1, april(8, '08:00'), april(10, '17:00'), extra), '', STANDARD_WEEK))
    const written = taskElementOf(mspdiFromDocument(document, SAVED_AT).text, 1)
    expect(elementTexts(written, 'Stop')).toEqual([])
    expect(elementTexts(written, 'ActualDuration')).toEqual(['PT16H0M0S'])
  })
})

// see FR-054, EX-2
describe('FR-054: a length is read in minutes and is not rounded to a day on the way in or out', () => {
  const half = taskXml(1, april(8, '09:00'), april(8, '11:30'))
  const text = mspdiOf(half.replace('<Duration>PT16H0M0S</Duration>', '<Duration>PT2H30M0S</Duration>'), '', STANDARD_WEEK)

  it('gives back the Duration of a task nobody edited', () => {
    const document = readDocument(text)
    expect(elementTexts(taskElementOf(mspdiFromDocument(document, SAVED_AT).text, 1), 'Duration')).toEqual(['PT2H30M0S'])
  })

  it('keeps the minutes of the start and the finish', () => {
    const task = readDocument(text).schedule.tasks.find((one) => one.uid === 1)
    expect(task?.start).toBe(april(8, '09:00'))
    expect(task?.finish).toBe(april(8, '11:30'))
  })

  it('tells no rounding of a length', () => {
    const read = documentFromMspdi(text, currentDocument())
    expect(read.ok).toBe(true)
    if (read.ok) expect(read.notices.filter((one) => /round/i.test(one.what))).toEqual([])
  })
})

// see AT-158, FR-024
describe('AT-158 / AT-159 in GRS JSON: the spans are saved with the calendar and read back as they were', () => {
  const held = documentWith(
    { working: { 2: MORNING_AND_AFTERNOON, 3: spansOf(['09:00', '18:00']), 4: spansOf(['22:00', '00:00']) } },
    [taskRow(1, {})],
  )

  it('reads back every weekday with its spans', () => {
    const read = documentFromJson(jsonFromDocument(held))
    expect(read.ok, JSON.stringify(read)).toBe(true)
    if (!read.ok) return
    const calendar = read.document.schedule.calendars[0]
    for (const dayType of [2, 3, 4]) {
      const before = held.schedule.calendars[0]?.weekDays.find((one) => one.dayType === dayType)
      const after = calendar?.weekDays.find((one) => one.dayType === dayType)
      expect(pairsOf(after?.workingTimes ?? []), `dayType ${dayType}`).toEqual(pairsOf(before?.workingTimes ?? []))
    }
  })
})

// see IV-24, FR-023, OP-5
describe('IV-24 on the import path: a document whose day breaks the row is refused', () => {
  const importOf = (parts: CalendarParts) => validateImportedDocument({ document: documentWith(parts, [taskRow(1, {})]), byteLength: 1024, emptyRowTaskUids: [] })
  const six = spansOf(['01:00', '02:00'], ['03:00', '04:00'], ['05:00', '06:00'], ['07:00', '08:00'], ['09:00', '10:00'], ['11:00', '12:00'])

  it('accepts a calendar whose days are sound', () => {
    const verdict = importOf({ working: MONDAY_TO_FRIDAY_WITH_SPANS })
    expect(verdict.ok, JSON.stringify(verdict)).toBe(true)
  })

  it.each([
    ['six spans on a weekday', { working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, 4: six } }],
    ['overlapping spans on a weekday', { working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, 4: spansOf(['08:00', '13:00'], ['12:00', '17:00']) } }],
    ['a span that ends before it starts', { working: { ...MONDAY_TO_FRIDAY_WITH_SPANS, 4: spansOf(['17:00', '08:00']) } }],
  ])('refuses %s by IV-24', (_name, parts) => {
    const verdict = importOf(parts)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals.map((one) => one.rule)).toContain('IV-24')
  })
})

// see FR-054
describe('FR-054: an end the file wrote at 00:00:00 is read as it is written, one minute after the day before', () => {
  const text = mspdiOf(taskXml(1, april(6, '08:00'), april(8, '00:00')), '', STANDARD_WEEK)

  it('keeps the finish as written', () => {
    const task = readDocument(text).schedule.tasks.find((one) => one.uid === 1)
    expect(task?.finish).toBe(april(8, '00:00'))
  })

  it('counts the plan as Monday and Tuesday and no minute of Wednesday', () => {
    const document = readDocument(text)
    const task = document.schedule.tasks.find((one) => one.uid === 1)
    if (task === undefined) throw new Error('premise: no task 1')
    expect(plannedLengthMinutesOf(workingCalendarOf(document.schedule), task)).toBe(960)
  })

  it('counts an actual that ends at 00:00:00 the same way', () => {
    const within = workingCalendarOf(readDocument(text).schedule)
    expect(actualMinutesOf(within, instantOf(april(6, '08:00')) ?? 0, instantOf(april(8, '00:00')) ?? 0)).toBe(960)
  })
})

// see FR-012, FR-023
describe('FR-012: reading GRS JSON counts the stored completion again from the instants', () => {
  const stale = documentWith(
    { working: MONDAY_TO_FRIDAY_WITH_SPANS },
    [
      taskRow(1, {
        start: jan(JAN_WEDNESDAY, '08:00'),
        finish: jan(JAN_WEDNESDAY, '17:00'),
        actualStart: jan(JAN_WEDNESDAY, '08:00'),
        stop: jan(JAN_WEDNESDAY, '12:00'),
        percentComplete: 10,
      }),
    ],
  )

  it('keeps the PercentComplete of an MSPDI file as it was written', () => {
    const extra = `<ActualStart>${april(8, '08:00')}</ActualStart><Stop>${april(8, '12:00')}</Stop><PercentComplete>10</PercentComplete>`
    const read = readDocument(mspdiOf(taskXml(1, april(8, '08:00'), april(8, '17:00'), extra), '', STANDARD_WEEK))
    expect(read.schedule.tasks.find((one) => one.uid === 1)?.percentComplete).toBe(10)
  })

  it('stores the share of the plan the actual covers', () => {
    const read = documentFromJson(jsonFromDocument(stale))
    expect(read.ok, JSON.stringify(read)).toBe(true)
    if (read.ok) expect(read.document.schedule.tasks.find((one) => one.uid === 1)?.percentComplete).toBe(50)
  })
})

// see AT-158, AT-159, CM-39, EX-1
describe('CM-39 then MSPDI: the set an edit wrote is exported on the weekdays and the working exception that took it', () => {
  const edited = editCalendar(documentWith({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, [taskRow(1, {})]), {
    kind: 'setCalendar',
    workingTimes: spansOf(['07:00', '11:00'], ['12:00', '16:00']),
    exceptions: [exceptionOf(1, JAN_SATURDAY, JAN_SATURDAY, true)],
  })
  if (!edited.ok) throw new Error(`premise: CM-39 was refused: ${JSON.stringify(edited.refusals)}`)
  const written = mspdiFromDocument(edited.document, SAVED_AT).text
  const NEW_DAY: Pairs = [['07:00:00', '11:00:00'], ['12:00:00', '16:00:00']]

  it('writes the new set under each working weekday and none under a rest day', () => {
    const found = weekDayTimesIn(written)
    for (const dayType of [2, 3, 4, 5, 6]) expect(found[dayType] ?? [], `dayType ${dayType}`).toEqual(NEW_DAY)
    for (const dayType of [1, 7]) expect(found[dayType] ?? [], `dayType ${dayType}`).toEqual([])
  })

  it('writes the new set under the exception day', () => {
    const block = /<Exception>([\s\S]*?)<\/Exception>/.exec(written)?.[1] ?? ''
    expect(elementTexts(block, 'FromTime')).toEqual(['07:00:00', '12:00:00'])
    expect(elementTexts(block, 'ToTime')).toEqual(['11:00:00', '16:00:00'])
  })

  it('is a file the exchange schema accepts', () => {
    expect(schemaFaults(written, 'pj12')).toEqual([])
  })
})

// see FR-073, FR-023
describe('FR-073: a GRS JSON of the old shape is refused whole, not read onto empty spans', () => {
  const held = documentWith({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, [taskRow(1, {})])
  const without = (change: (parsed: Record<string, any>) => void, version?: string): string => {
    const parsed = JSON.parse(jsonFromDocument(held)) as Record<string, any>
    change(parsed)
    if (version !== undefined) parsed['schemaVersion'] = version
    return JSON.stringify(parsed)
  }

  it('reads the document as written', () => {
    expect(documentFromJson(jsonFromDocument(held)).ok).toBe(true)
  })

  it('refuses a weekday that has no workingTimes column', () => {
    expect(documentFromJson(without((parsed) => delete parsed['schedule'].calendars[0].weekDays[1].workingTimes)).ok).toBe(false)
  })

  it('refuses an exception that has no workingTimes column', () => {
    const withException = documentWith({ working: MONDAY_TO_FRIDAY_WITH_SPANS, exceptions: [exceptionOf(1, JAN_THURSDAY, JAN_THURSDAY, false)] }, [taskRow(1, {})])
    const parsed = JSON.parse(jsonFromDocument(withException)) as Record<string, any>
    delete parsed['schedule'].calendars[0].exceptions[0].workingTimes
    expect(documentFromJson(JSON.stringify(parsed)).ok).toBe(false)
  })

  it('refuses a project that has no scheduleDataTimeZone column', () => {
    expect(documentFromJson(without((parsed) => delete parsed['schedule'].project.scheduleDataTimeZone)).ok).toBe(false)
  })

  it('refuses the old shape under an older version too: nothing is converted', () => {
    const text = without((parsed) => delete parsed['schedule'].calendars[0].weekDays[1].workingTimes, '2026-09-01T00:00:00Z')
    expect(documentFromJson(text).ok).toBe(false)
  })
})

// see IV-10, IV-14, FR-023, OP-5
describe('IV-10 and IV-14 on the import path: the instant is what is judged', () => {
  const importOf = (part: Record<string, unknown>) =>
    validateImportedDocument({
      document: documentWith({ working: MONDAY_TO_FRIDAY_WITH_SPANS }, [taskRow(1, part)]),
      byteLength: 1024,
      emptyRowTaskUids: [],
    })
  const rulesOf = (verdict: ReturnType<typeof importOf>): string[] => (verdict.ok ? [] : verdict.refusals.map((one) => one.rule))

  it('accepts a task whose finish is later than its start by the clock on the same day', () => {
    expect(importOf({ start: jan(JAN_WEDNESDAY, '08:00'), finish: jan(JAN_WEDNESDAY, '17:00') }).ok).toBe(true)
  })

  it('accepts a task whose finish is its start', () => {
    expect(importOf({ start: jan(JAN_WEDNESDAY, '17:00'), finish: jan(JAN_WEDNESDAY, '17:00') }).ok).toBe(true)
  })

  it('refuses a task that finishes earlier on the same day than it starts', () => {
    expect(rulesOf(importOf({ start: jan(JAN_WEDNESDAY, '17:00'), finish: jan(JAN_WEDNESDAY, '08:00') }))).toContain('IV-10')
  })

  it('refuses a time that does not exist', () => {
    expect(rulesOf(importOf({ start: '2026-01-07T25:00:00' }))).toContain('IV-14')
  })
})

// CR-654: one non-recurring predicate (AT-82) read, counted and written; the reader shapes EX-13 and EX-14.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  DAILY_RECURRENCE_KIND,
  isNonRecurringException,
  isWorkingDay,
  workingCalendarOf,
  type Exception,
} from '../../src/entity/document-model/schedule/schedule'
import { specTable } from '../contract/spec-table'
import { ERD_DETAIL, REQUIREMENTS, asDocument, documentObject, elementTexts, mspdiText } from './cr-646-stage'

const A_MOMENT = '2026-10-04T09:00:00'
const RECURRING_NOTICE = 'repeats, and repeating exception days are not spread over real dates'

// see AT-82, T-058
const AT_82_PREDICATE =
  '繰り返しの無い例外日とは、本列が `9` か空の行と、`1` で `carry` の `Period`（繰り返しの間隔）が無いか `1` の行である'
const AT_82_ADDED = '`GRS` が足す例外日は `1` とする'
// see FR-054
const FR_054_NOT_COUNTED = '稼働日の数えに使ってはならない（MUST NOT）'
// see WC-6, T-344
const WC_6_KIND = '休みとし、`AT-82` を `1` とする'
// see EX-13, EX-14, T-033
const EX_13_SHAPE = '`Type` 1・`Occurrences` 1・`EnteredByOccurrences` 0 で書き出すこと（MUST）'
const EX_13_ONLY_WHEN_ABSENT = '`Occurrences` と `EnteredByOccurrences` は、行の `carry` に無いときだけ足すこと（MUST）'
const EX_14_UNITS = '割り当て（`Assignment`）の `carry` に `Units` が無いときは、`Units` に `1` を書くこと（MUST）'

/** @purity pure */
function cellsOf(table: string, id: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`premise: table ${table} has no row ${id}`)
  return row.cells.join(' | ').replace(/<br\s*\/?>/gi, '')
}

/** @purity pure */
function exceptionRow(part: Partial<Exception>): Exception {
  return {
    ordinal: 0,
    name: 'x',
    fromDate: '2026-04-20T00:00:00',
    toDate: '2026-04-20T23:59:00',
    dayWorking: false,
    recurrenceKind: DAILY_RECURRENCE_KIND,
    carry: {},
    carryElements: [],
    ...part,
  }
}

/** @purity pure */
function documentHolding(exceptions: readonly Exception[], assignments: readonly Record<string, unknown>[] = []): Document {
  const object = documentObject()
  object['schedule']['calendars'][0]['exceptions'] = exceptions
  object['schedule']['assignments'] = assignments
  return object as unknown as Document
}

/** @purity pure */
function writtenElements(document: Document, name: string): readonly string[] {
  const text = mspdiFromDocument(document, A_MOMENT).text
  return [...text.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'g'))].map((one) => one[1] ?? '')
}

/** @purity pure */
function childNames(element: string): readonly string[] {
  return [...element.matchAll(/<([A-Za-z]+)>/g)].map((one) => one[1] ?? '')
}

/** @purity pure */
function recurringNoticesOf(xml: string): number {
  const read = documentFromMspdi(xml, asDocument())
  if (!read.ok) throw new Error(`premise: the MSPDI was refused: ${JSON.stringify(read.faults)}`)
  return read.notices.filter((one) => one.what === RECURRING_NOTICE).length
}

/** @purity pure */
function calendarExceptionXml(exception: string): string {
  return mspdiText({ tasks: '' }).replace('</WeekDays>', `</WeekDays><Exceptions>${exception}</Exceptions>`)
}

describe('CR-654 the manuscript as these cases read it', () => {
  it('AT-82 (T-058): names the non-recurring predicate and the kind GRS adds', () => {
    expect(cellsOf('T-058', 'AT-82')).toContain(AT_82_PREDICATE)
    expect(cellsOf('T-058', 'AT-82')).toContain(AT_82_ADDED)
  })

  it('FR-054, WC-6 (T-344): a recurring exception is not counted; an added row is kind 1', () => {
    expect(REQUIREMENTS).toContain(FR_054_NOT_COUNTED)
    expect(cellsOf('T-344', 'WC-6')).toContain(WC_6_KIND)
  })

  it('EX-13, EX-14 (T-033): the shapes another reader needs', () => {
    expect(cellsOf('T-033', 'EX-13')).toContain(EX_13_SHAPE)
    expect(cellsOf('T-033', 'EX-13')).toContain(EX_13_ONLY_WHEN_ABSENT)
    expect(cellsOf('T-033', 'EX-14')).toContain(EX_14_UNITS)
    expect(ERD_DETAIL).toContain('| DV-15 | `Assignment` | `units` | `Assignment/Units` |')
  })
})

describe('AT-82: isNonRecurringException', () => {
  it.each([
    ['kind 9 is a one-off', { recurrenceKind: 9 }, true],
    ['an empty kind is a one-off', { recurrenceKind: null }, true],
    ['kind 1 with no Period is a one-off', { recurrenceKind: 1 }, true],
    ['kind 1 with Period 1 is a one-off', { recurrenceKind: 1, carry: { Period: '1' } }, true],
    ['kind 1 with Period 2 repeats', { recurrenceKind: 1, carry: { Period: '2' } }, false],
    ['kind 2 (yearly) repeats', { recurrenceKind: 2 }, false],
    ['kind 6 (weekly) repeats', { recurrenceKind: 6 }, false],
  ] as const)('AT-82: %s', (_label, part, expected) => {
    expect(isNonRecurringException(exceptionRow(part))).toBe(expected)
  })
})

describe('AT-82 / DFC-1961: the reader tells only a recurring exception', () => {
  it('AT-82: Type 1 with Occurrences 1 (the official one-off shape) draws no recurring notice', () => {
    const one = '<Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>2026-04-20T00:00:00</FromDate><ToDate>2026-04-20T23:59:00</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>one</Name><Type>1</Type><DayWorking>0</DayWorking></Exception>'
    expect(recurringNoticesOf(calendarExceptionXml(one))).toBe(0)
  })

  it('AT-82: Type 1 every second day, and Type 2, each draw the notice', () => {
    const everySecond = '<Exception><TimePeriod><FromDate>2026-04-20T00:00:00</FromDate><ToDate>2026-04-30T23:59:00</ToDate></TimePeriod><Name>a</Name><Type>1</Type><Period>2</Period><DayWorking>0</DayWorking></Exception>'
    const yearly = '<Exception><TimePeriod><FromDate>2026-01-01T00:00:00</FromDate><ToDate>2030-01-01T23:59:00</ToDate></TimePeriod><Name>b</Name><Type>2</Type><DayWorking>0</DayWorking></Exception>'
    expect(recurringNoticesOf(calendarExceptionXml(everySecond))).toBe(1)
    expect(recurringNoticesOf(calendarExceptionXml(yearly))).toBe(1)
  })

  it('DFC-1961: the small sample another reader wrote reads with no recurring notice', () => {
    const sample = readFileSync(join(process.cwd(), 'sample-schedule', 'sample-small-website-renewal.en.xml'), 'utf8')
    expect(recurringNoticesOf(sample)).toBe(0)
  })
})

describe('FR-054 / DFC-1964: a recurring exception is not counted as days off', () => {
  // WHY: 2010-06-15 is a Tuesday; the template works Monday to Friday.
  const tuesday = { year: 2010, month: 6, day: 15 }

  it('FR-054: a yearly exception over 2007..2026 leaves a Tuesday in that range working', () => {
    const yearly = exceptionRow({ recurrenceKind: 2, fromDate: '2007-01-01T00:00:00', toDate: '2026-01-01T23:59:00' })
    expect(isWorkingDay(workingCalendarOf(documentHolding([yearly]).schedule), tuesday)).toBe(true)
  })

  it('FR-054: the same range as a non-recurring exception makes that Tuesday a day off', () => {
    const once = exceptionRow({ fromDate: '2007-01-01T00:00:00', toDate: '2026-01-01T23:59:00' })
    expect(isWorkingDay(workingCalendarOf(documentHolding([once]).schedule), tuesday)).toBe(false)
  })
})

describe('EX-13 / DFC-1960: an added exception goes out in the official one-off shape', () => {
  it('EX-13: kind 1 with an empty carry writes Type 1, Occurrences 1, EnteredByOccurrences 0 in schema order', () => {
    const [written] = writtenElements(documentHolding([exceptionRow({})]), 'Exception')
    expect(written).toBeDefined()
    expect(elementTexts(written ?? '', 'Type')).toEqual(['1'])
    expect(elementTexts(written ?? '', 'Occurrences')).toEqual(['1'])
    expect(elementTexts(written ?? '', 'EnteredByOccurrences')).toEqual(['0'])
    expect(childNames(written ?? '').filter((name) => name !== 'FromDate' && name !== 'ToDate')).toEqual([
      'EnteredByOccurrences', 'TimePeriod', 'Occurrences', 'Name', 'Type', 'DayWorking',
    ])
  })

  it('EX-13: a carried Occurrences and EnteredByOccurrences go back as read', () => {
    const carried = exceptionRow({ carry: { Occurrences: '2', EnteredByOccurrences: '1' } })
    const [written] = writtenElements(documentHolding([carried]), 'Exception')
    expect(elementTexts(written ?? '', 'Occurrences')).toEqual(['2'])
    expect(elementTexts(written ?? '', 'EnteredByOccurrences')).toEqual(['1'])
  })

  it('EX-13: a kind 9 row goes back as 9 and gains nothing', () => {
    const [written] = writtenElements(documentHolding([exceptionRow({ recurrenceKind: 9 })]), 'Exception')
    expect(elementTexts(written ?? '', 'Type')).toEqual(['9'])
    expect(elementTexts(written ?? '', 'Occurrences')).toEqual([])
    expect(elementTexts(written ?? '', 'EnteredByOccurrences')).toEqual([])
  })

  it('EX-13: a recurring kind 1 row (Period 2) gains nothing', () => {
    const [written] = writtenElements(documentHolding([exceptionRow({ carry: { Period: '2' } })]), 'Exception')
    expect(elementTexts(written ?? '', 'Occurrences')).toEqual([])
  })
})

describe('EX-14 / DFC-1962: an assignment goes out with Units', () => {
  const assignment = (carry: Record<string, string>): Record<string, unknown> => ({
    uid: 1, taskUid: null, resourceUid: null, carry, carryElements: [],
  })

  it('EX-14: an assignment with no Units in its carry writes Units 1', () => {
    const [written] = writtenElements(documentHolding([], [assignment({})]), 'Assignment')
    expect(elementTexts(written ?? '', 'Units')).toEqual(['1'])
  })

  it('EX-14: a carried Units goes back as read', () => {
    const [written] = writtenElements(documentHolding([], [assignment({ Units: '0.5' })]), 'Assignment')
    expect(elementTexts(written ?? '', 'Units')).toEqual(['0.5'])
  })
})

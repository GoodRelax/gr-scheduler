// CR-710 wave 1 (spec-only): FR-054 reads a date-time as an instant, the finish side's 00:00:00 ends the day before, IV-10 compares instants.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  dayOfInstant,
  finishSideDayOf,
  instantOf,
  isPlanReversed,
  textOfInstant,
} from '../../src/entity/document-model/schedule/schedule'
import { MONDAY_TO_FRIDAY_WITH_SPANS, workingCalendarOver } from './cr-710-w1-stage'
import { unbroken } from './spec-table'

// see IV-10, CR-741
const WITHIN = workingCalendarOver({ working: MONDAY_TO_FRIDAY_WITH_SPANS })

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

// see FR-054
const CLAUSES = [
  '日時は、字面の日付と時刻を、文書の日程データのタイムゾーン（`FR-156`）の現地の時刻として読むこと（MUST）。',
  '時差を換算してはならない（MUST NOT）',
  '保存する日時の最小単位は 1 分とすること（MUST）。',
  '日時どうしが同じか・どちらが先かは、日付と時刻の対（瞬間）で比べること（MUST）。',
  '取り込んだ終了の側の値が `00:00:00` のときは、字面どおりの瞬間と読むこと（MUST）',
  '類推で終業の時刻へ補ってはならない（MUST NOT）。',
  '開始の側はその瞬間の日、終了の側は 1 分前の瞬間の日とすること（MUST）',
  '丸 1 日の範囲（表 T-350 の `WT-6` 〜 `WT-8`）は日として読み、その終わりの `23:59:00` はその日の終わりと読む。',
]

// see IV-10
const IV_10 = '`start` と `finish` がともに非 `null` の `Task` で、`finish` が `start` より前でないこと'

describe('the clauses these cases are built from still read as quoted', () => {
  it.each(CLAUSES)('FR-054: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-220 IV-10 still asks that finish is not before start', () => {
    expect(DESIGN).toContain(IV_10)
  })
})

const day = (year: number, month: number, dayOfMonth: number) => ({ year, month, day: dayOfMonth })

function instantAt(text: string): number {
  const read = instantOf(text)
  if (read === null) throw new Error(`premise: ${text} was not read as an instant`)
  return read
}

describe('FR-054: instantOf reads the written date and the written time as one value', () => {
  it('orders instants of one day by the minute', () => {
    const ordered = ['08:00:00', '08:01:00', '12:00:00', '13:00:00', '17:00:00', '23:59:00']
    const instants = ordered.map((time) => instantAt(`2026-01-07T${time}`))
    for (let i = 1; i < instants.length; i += 1) expect(instants[i]).toBeGreaterThan(instants[i - 1] as number)
  })

  it('puts 00:00:00 of the next day after 23:59:00 of the day, across month and year ends', () => {
    expect(instantAt('2026-01-08T00:00:00')).toBeGreaterThan(instantAt('2026-01-07T23:59:00'))
    expect(instantAt('2026-02-01T00:00:00')).toBeGreaterThan(instantAt('2026-01-31T23:59:00'))
    expect(instantAt('2026-01-01T00:00:00')).toBeGreaterThan(instantAt('2025-12-31T23:59:00'))
    expect(instantAt('2028-03-01T00:00:00')).toBeGreaterThan(instantAt('2028-02-29T23:59:00'))
  })

  it('gives the same instant to the same text and a different one to a text a minute apart', () => {
    expect(instantAt('2026-01-07T08:00:00')).toBe(instantAt('2026-01-07T08:00:00'))
    expect(instantAt('2026-01-07T08:00:00')).not.toBe(instantAt('2026-01-07T08:01:00'))
  })

  it('does not convert a zone: a written offset or Z reads as the same wall clock', () => {
    const plain = instantAt('2026-01-07T08:00:00')
    expect(instantAt('2026-01-07T08:00:00Z')).toBe(plain)
    expect(instantAt('2026-01-07T08:00:00+09:00')).toBe(plain)
    expect(instantAt('2026-01-07T08:00:00-05:00')).toBe(plain)
  })

  it('reads nothing from null, from a month that does not exist or from an hour that does not exist', () => {
    expect(instantOf(null)).toBeNull()
    expect(instantOf('not a date')).toBeNull()
    expect(instantOf('2026-13-01T08:00:00')).toBeNull()
    expect(instantOf('2026-02-30T08:00:00')).toBeNull()
    expect(instantOf('2026-01-07T25:00:00')).toBeNull()
  })
})

describe('FR-054, EX-7: textOfInstant writes an instant with seconds 00 and no zone, the way it was read', () => {
  it.each([
    '2026-01-07T08:00:00',
    '2026-01-07T17:00:00',
    '2026-01-07T00:00:00',
    '2026-01-07T23:59:00',
    '2026-12-31T12:34:00',
    '2028-02-29T09:05:00',
    '2026-01-01T00:01:00',
  ])('%s survives a read and a write', (text) => {
    expect(textOfInstant(instantAt(text))).toBe(text)
  })

  it('writes the later minute as the later text, with no zone suffix', () => {
    const written = textOfInstant(instantAt('2026-01-07T08:01:00'))
    expect(written).toBe('2026-01-07T08:01:00')
    expect(written).not.toMatch(/Z|[+-]\d{2}:?\d{2}$/)
  })
})

describe('FR-054: the day an instant falls on is the day itself on the start side and the day of the minute before on the finish side', () => {
  it.each([
    ['2026-01-07T08:00:00', day(2026, 1, 7)],
    ['2026-01-07T00:00:00', day(2026, 1, 7)],
    ['2026-01-07T23:59:00', day(2026, 1, 7)],
  ])('%s starts on its own day', (text, expected) => {
    expect(dayOfInstant(instantAt(text))).toEqual(expected)
  })

  it.each([
    ['2026-06-24T00:00:00', day(2026, 6, 23)],
    ['2026-06-24T00:01:00', day(2026, 6, 24)],
    ['2026-06-24T17:00:00', day(2026, 6, 24)],
    ['2026-06-24T23:59:00', day(2026, 6, 24)],
    ['2026-03-01T00:00:00', day(2026, 2, 28)],
    ['2028-03-01T00:00:00', day(2028, 2, 29)],
    ['2026-01-01T00:00:00', day(2025, 12, 31)],
  ])('%s finishes on %j', (text, expected) => {
    expect(finishSideDayOf(text)).toEqual(expected)
  })

  it('gives no day for null or for a text that is not a date', () => {
    expect(finishSideDayOf(null)).toBeNull()
    expect(finishSideDayOf('not a date')).toBeNull()
  })
})

describe('IV-10: a plan is reversed when the finish is earlier than the start as an instant', () => {
  it.each([
    ['2026-01-07T17:00:00', '2026-01-07T08:00:00', true],
    ['2026-01-07T08:01:00', '2026-01-07T08:00:00', true],
    ['2026-01-09T08:00:00', '2026-01-08T17:00:00', true],
    ['2026-01-07T08:00:00', '2026-01-07T08:00:00', false],
    ['2026-01-07T08:00:00', '2026-01-07T08:01:00', false],
    ['2026-01-07T08:00:00', '2026-01-07T17:00:00', false],
    ['2026-01-09T17:00:00', '2026-01-12T08:00:00', false],
  ])('start %s, finish %s: reversed is %s', (start, finish, reversed) => {
    expect(isPlanReversed(WITHIN, { start, finish })).toBe(reversed)
  })

  it('is not reversed while either end is missing', () => {
    expect(isPlanReversed(WITHIN, { start: null, finish: '2026-01-07T08:00:00' })).toBe(false)
    expect(isPlanReversed(WITHIN, { start: '2026-01-07T08:00:00', finish: null })).toBe(false)
    expect(isPlanReversed(WITHIN, { start: null, finish: null })).toBe(false)
  })
})

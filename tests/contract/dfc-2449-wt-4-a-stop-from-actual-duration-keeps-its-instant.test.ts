// DFC-2449 (spec-only): table T-350 WT-4 leaves the stop FR-011 puts from an ActualDuration at that instant; GRS writes it so.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, documentFromMspdi, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { unbroken } from './spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see WT-4, FR-011
const WT_4_STOP_FROM_DURATION =
  '⚠️ `FR-011` が `ActualDuration` から `Task.stop` を置くときは、その段が置く瞬間とする（既定の終了時刻とは限らない） —— 分で数えた実績の長さを寄せで変えない'
const FR_011_STOP_FROM_DURATION =
  '完了していないのに `Stop` を持たない `Task` は、`actualStart` から `ActualDuration` の分だけ稼働時間を進めた瞬間を `stop` に置くこと（MUST）'
const FR_011_EARLIEST_INSTANT =
  '⭐ 同じ稼働時間に当たる瞬間が 2 つ以上あるとき（時間帯の終わりと、次の時間帯の始まり）は、最も早い瞬間に置くこと（MUST）'
const WT_SAME_ON_EVERY_WRITE = '`GRS JSON` へ書くときも MSPDI へ書き出すときも同じである（`FR-024`）'

describe('the clauses these cases are built from still read as quoted', () => {
  it.each([WT_4_STOP_FROM_DURATION, FR_011_STOP_FROM_DURATION, FR_011_EARLIEST_INSTANT, WT_SAME_ON_EVERY_WRITE])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// WHY: the bundled template stands in for the open document; cr-429-mspdi-fixtures reads the local-only XSD on import (JDG-644).
function currentDocument(): Document {
  const text = readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8')
  const parsed = JSON.parse(text) as { schedule: { project: Record<string, unknown> } }
  parsed.schedule.project['sourceFormat'] ??= 'grs'
  const read = documentFromJson(JSON.stringify(parsed))
  if (!read.ok) throw new Error('premise: the bundled template was refused')
  return read.document
}

const NAMESPACE = 'http://schemas.microsoft.com/project/2007'

// WHY: April 2026 starts on a Wednesday, so the 6th is a Monday and the 8th a Wednesday.
const april = (dayOfMonth: number, hhmm: string): string => `2026-04-${String(dayOfMonth).padStart(2, '0')}T${hhmm}:00`

const SPLIT_DAY = '<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>'
const weekDayXml = (dayType: number): string =>
  dayType === 1 || dayType === 7
    ? `<WeekDay><DayType>${dayType}</DayType><DayWorking>0</DayWorking></WeekDay>`
    : `<WeekDay><DayType>${dayType}</DayType><DayWorking>1</DayWorking>${SPLIT_DAY}</WeekDay>`

// WHY: Monday to Friday, 08:00-12:00 and 13:00-17:00, the calendar FR-011's own example counts on.
function mspdiWithActualDuration(duration: string): string {
  const task = `<Task><UID>1</UID><ID>1</ID><Name>T1</Name><OutlineNumber>1</OutlineNumber><OutlineLevel>1</OutlineLevel><Start>${april(8, '08:00')}</Start><Finish>${april(10, '17:00')}</Finish><Duration>PT24H0M0S</Duration><DurationFormat>7</DurationFormat><Milestone>0</Milestone><Summary>0</Summary><ActualStart>${april(8, '08:00')}</ActualStart><ActualDuration>${duration}</ActualDuration></Task>`
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    `<Project xmlns="${NAMESPACE}">`,
    '<SaveVersion>12</SaveVersion>',
    '<Name>Stop from ActualDuration</Name>',
    `<StartDate>${april(6, '08:00')}</StartDate>`,
    '<CalendarUID>1</CalendarUID>',
    '<MinutesPerDay>480</MinutesPerDay>',
    '<WeekStartDay>1</WeekStartDay>',
    `<Calendars><Calendar><UID>1</UID><Name>Standard</Name><IsBaseCalendar>1</IsBaseCalendar><BaseCalendarUID>-1</BaseCalendarUID><WeekDays>${[1, 2, 3, 4, 5, 6, 7].map(weekDayXml).join('')}</WeekDays></Calendar></Calendars>`,
    `<Tasks>${task}</Tasks>`,
    '</Project>',
  ].join('\n')
}

function readWith(duration: string): Document {
  const read = documentFromMspdi(mspdiWithActualDuration(duration), currentDocument())
  if (!read.ok) throw new Error(`premise: the file was refused: ${JSON.stringify(read.faults)}`)
  return read.document
}

const stopIn = (document: Document): string | null | undefined => document.schedule.tasks.find((one) => one.uid === 1)?.stop

describe('DFC-2449 FR-011: the stop put from an ActualDuration is the earliest instant that many working minutes on', () => {
  it.each([
    ['PT2H0M0S', april(8, '10:00'), 'two hours into the morning span'],
    ['PT4H0M0S', april(8, '12:00'), 'the end of the morning span, not 13:00'],
    ['PT5H0M0S', april(8, '14:00'), 'an hour into the afternoon span'],
    ['PT8H0M0S', april(8, '17:00'), 'the end of the day, not 08:00 of the next working day'],
  ])('ActualDuration %s puts the stop at %s: %s', (duration, stop) => {
    expect(stopIn(readWith(duration))).toBe(stop)
  })
})

describe('DFC-2449 WT-4: GRS JSON writes that stop as the instant, not at the default finish time', () => {
  it.each([
    ['PT2H0M0S', april(8, '10:00')],
    ['PT4H0M0S', april(8, '12:00')],
    ['PT5H0M0S', april(8, '14:00')],
  ])('the stop of ActualDuration %s is written as %s and read back the same', (duration, stop) => {
    const text = jsonFromDocument(readWith(duration))
    const written = (JSON.parse(text) as { schedule: { tasks: { uid: number; stop: unknown }[] } }).schedule.tasks.find((one) => one.uid === 1)
    expect(written?.stop).toBe(stop)
    const read = documentFromJson(text)
    if (!read.ok) throw new Error(`premise: the saved document was refused: ${JSON.stringify(read.faults)}`)
    expect(stopIn(read.document)).toBe(stop)
  })
})

// CR-751 (spec-only): FR-156 refuses a schedule time zone outside T-376 (RS-25), OP-6 resets the view keys S-574 / S-575, FR-054 / RS-89 count one-off exception days, and IV-24 owns the span count S-582.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  TIME_ZONE_ROWS,
  isTimeZoneRegion,
  viewRegionOf,
  zoneClockOf,
} from '../../src/entity/document-model/schedule/time-zone'
import { holdsWorkingDayUnlikeMinutesPerDay } from '../../src/entity/document-model/schedule/working-calendar'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { settingNumber, settingRow } from '../fixtures/setting-number'
import { bare, specTable } from './spec-table'

type Json = Record<string, any>

const FIXTURE_TEXT = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'measuring-document.json'), 'utf8')
const KNOWN_VERSION = (JSON.parse(FIXTURE_TEXT) as Json)['schemaVersion'] as string
const fixture = (): Json => JSON.parse(FIXTURE_TEXT) as Json

// see T-376
const T_376 = specTable('T-376')
const REGIONS: readonly string[] = T_376.rows.map((row) => bare(row.cells[0] ?? ''))

// see T-376
function standardOffsetMinutesOf(cell: string): number {
  const text = cell.replace(/\u2212/g, '-').replace(/\u00b1/g, '+').trim()
  const found = /^([+-])(\d{2}):(\d{2})$/.exec(text)
  if (found === null) throw new Error(`T-376: unreadable offset cell ${JSON.stringify(cell)}`)
  const minutes = Number(found[2]) * 60 + Number(found[3])
  return found[1] === '-' ? -minutes : minutes
}

// see T-376
const observesDaylightSaving = (cell: string): boolean => cell.trim() !== '\u2014'

// see FR-156
const OUTSIDE = ['Mars/Base', 'Asia/Seoul', '', 'utc', 'asia/tokyo', ' Asia/Tokyo', 'Etc/GMT-9', '+09:00']

function withScheduleZone(zone: unknown): string {
  const json = fixture()
  json['schedule']['project']['scheduleDataTimeZone'] = zone
  return JSON.stringify(json)
}

function decodedOk(text: string): Document {
  const read = documentFromJson(text, KNOWN_VERSION)
  if (!read.ok) throw new Error(`premise: the scene is GRS JSON, refused with ${read.reason} ${JSON.stringify(read.faults).slice(0, 400)}`)
  return read.document
}

describe('premise -- the tables and rows these cases are built from', () => {
  it('T-376 has 28 rows ZN-1..ZN-28, each naming one distinct region', () => {
    expect(T_376.rows.map((row) => row.id)).toEqual(Array.from({ length: 28 }, (_, i) => `ZN-${i + 1}`))
    expect(new Set(REGIONS).size).toBe(28)
    expect(REGIONS).toContain('UTC')
  })

  it('no OUTSIDE value (made-up, a real zone T-376 leaves out, empty, wrong case, padded, an offset) is a T-376 region', () => {
    for (const value of OUTSIDE) expect(REGIONS, JSON.stringify(value)).not.toContain(value)
  })

  it('the fixture opens as it is', () => {
    expect(decodedOk(FIXTURE_TEXT).schedule.project.scheduleDataTimeZone).toBe('UTC')
  })
})

// see FR-156, T-376, RS-25
describe('FR-156: a GRS JSON whose scheduleDataTimeZone is not in T-376 is refused whole with RS-25', () => {
  it.each(OUTSIDE.map((value) => [JSON.stringify(value), value]))(
    '%s is refused with RS-25, and the faults name the column (RS-25: a column does not match its form)',
    (_name, value) => {
      const read = documentFromJson(withScheduleZone(value), KNOWN_VERSION)
      expect(read.ok).toBe(false)
      if (read.ok) return
      expect(read.reason).toBe('RS-25')
      expect(read.faults.length).toBeGreaterThan(0)
      expect(JSON.stringify(read.faults)).toContain('scheduleDataTimeZone')
    },
  )

  it.each(REGIONS.map((region, i) => [`ZN-${i + 1}`, region]))('%s %s opens (FR-156: every T-376 region is a choice)', (_id, region) => {
    const read = documentFromJson(withScheduleZone(region), KNOWN_VERSION)
    expect(read.ok, read.ok ? '' : JSON.stringify(read.faults).slice(0, 400)).toBe(true)
    if (read.ok) expect(read.document.schedule.project.scheduleDataTimeZone).toBe(region)
  })
})

// see FR-156, T-376
describe('FR-156 / T-376: the roster the code holds is the table', () => {
  it('TIME_ZONE_ROWS holds the T-376 rows in table order: row ID, region, standard offset, daylight saving', () => {
    expect(TIME_ZONE_ROWS.map((row) => [row.rowId, row.region, row.standardOffsetMinutes, row.observesDaylightSaving])).toEqual(
      T_376.rows.map((row) => [
        row.id,
        bare(row.cells[0] ?? ''),
        standardOffsetMinutesOf(row.cells[1] ?? ''),
        observesDaylightSaving(row.cells[2] ?? ''),
      ]),
    )
  })

  it('isTimeZoneRegion is true for every T-376 region and false for every OUTSIDE value, null and a non-string', () => {
    for (const region of REGIONS) expect(isTimeZoneRegion(region), region).toBe(true)
    for (const value of [...OUTSIDE, null, undefined, 9]) expect(isTimeZoneRegion(value), JSON.stringify(value)).toBe(false)
  })

  it('zoneClockOf reads each region on its T-376 standard offset, and a DST region one season off it (FR-156: DST follows the region rule)', () => {
    const MS_PER_MINUTE = 60000
    const january = Date.UTC(2026, 0, 15, 12, 0) / MS_PER_MINUTE
    const july = Date.UTC(2026, 6, 15, 12, 0) / MS_PER_MINUTE
    for (const row of T_376.rows) {
      const region = bare(row.cells[0] ?? '')
      const standard = standardOffsetMinutesOf(row.cells[1] ?? '')
      const clock = zoneClockOf(region)
      const offsets = [january, july].map((utc) => clock.wallOf(utc) - utc)
      if (observesDaylightSaving(row.cells[2] ?? '')) {
        expect(Math.min(...offsets), `${row.id} ${region}`).toBe(standard)
        expect(Math.max(...offsets), `${row.id} ${region}`).toBeGreaterThan(standard)
      } else {
        expect(offsets, `${row.id} ${region}`).toEqual([standard, standard])
      }
    }
  })

  it('viewRegionOf: null (S-574) and an OUTSIDE value (OP-6 default) show the schedule data zone; a T-376 region shows itself', () => {
    expect(viewRegionOf('Asia/Tokyo', null)).toBe('Asia/Tokyo')
    expect(viewRegionOf('Asia/Tokyo', 'Europe/Berlin')).toBe('Europe/Berlin')
    for (const value of OUTSIDE) expect(viewRegionOf('Asia/Tokyo', value), JSON.stringify(value)).toBe('Asia/Tokyo')
  })
})

// see OP-3, OP-6
function replacedBy(incoming: Document): Document {
  const current = decodedOk(FIXTURE_TEXT)
  const request: ImportRequest = {
    current,
    incoming,
    format: 'grsJson',
    choice: 'replace',
    validationPassed: true,
    anotherOpenInProgress: false,
    unsavedEditsDiscardConfirmed: true,
    merge: null,
    defaultSettings: current.documentSettings,
    importSessionId: 'cr-751',
  }
  const outcome = importDocument(request)
  if (!outcome.ok) throw new Error(`the replace was refused: ${JSON.stringify(outcome.refusal)}`)
  return outcome.document
}

function withSetting(key: string, value: unknown): string {
  const json = fixture()
  json['documentSettings'][key] = value
  return JSON.stringify(json)
}

// see S-574, S-575
const defaultOf = (id: string): unknown => JSON.parse(String(settingRow(id)['default']?.['lit']))

// see FR-156, OP-6, S-574, S-575
describe('FR-156 / OP-6: a view key outside T-376 does not refuse; after a replace it is its default, the rest intact', () => {
  const baseline = replacedBy(decodedOk(FIXTURE_TEXT))

  it('premise: S-574 defaults to null and S-575 to []', () => {
    expect(defaultOf('S-574')).toBe(null)
    expect(defaultOf('S-575')).toEqual([])
  })

  const cases: readonly (readonly [string, string, unknown])[] = [
    ['S-574', 'viewTimeZone', 'Mars/Base'],
    ['S-574', 'viewTimeZone', 'Asia/Seoul'],
    ['S-574', 'viewTimeZone', ''],
    ['S-575', 'displayTimeZones', ['Asia/Tokyo', 'Mars/Base']],
    ['S-575', 'displayTimeZones', ['Asia/Seoul']],
    ['S-575', 'displayTimeZones', 'Asia/Tokyo'],
  ]

  it.each(cases.map(([id, key, value]) => [`${id} ${key} = ${JSON.stringify(value)}`, id, key, value]))(
    '%s opens, and replaces to the whole default (OP-6: a nested mismatch resets the whole key)',
    (_name, id, key, value) => {
      const read = documentFromJson(withSetting(key as string, value), KNOWN_VERSION)
      expect(read.ok, read.ok ? '' : JSON.stringify(read.faults).slice(0, 400)).toBe(true)
      if (!read.ok) return
      const replaced = replacedBy(read.document)
      const settings = replaced.documentSettings as unknown as Json
      expect(settings[key as string]).toEqual(defaultOf(id as string))
      expect(replaced.schedule).toEqual(baseline.schedule)
      const others = (one: Json): Json => Object.fromEntries(Object.entries(one).filter(([name]) => name !== key))
      expect(others(settings)).toEqual(others(baseline.documentSettings as unknown as Json))
    },
  )

  it('a T-376 region in both keys is kept as written (the reset is only for values outside the table)', () => {
    const json = fixture()
    json['documentSettings']['viewTimeZone'] = 'Europe/Berlin'
    json['documentSettings']['displayTimeZones'] = ['Asia/Tokyo', 'America/New_York']
    const settings = replacedBy(decodedOk(JSON.stringify(json))).documentSettings as unknown as Json
    expect(settings['viewTimeZone']).toBe('Europe/Berlin')
    expect(settings['displayTimeZones']).toEqual(['Asia/Tokyo', 'America/New_York'])
  })
})

interface Span {
  readonly from: string
  readonly to: string
}
const spans = (...pairs: readonly (readonly [string, string])[]): Span[] => pairs.map(([from, to]) => ({ from, to }))
const workingTimes = (list: readonly Span[]): Json[] =>
  list.map((one, ordinal) => ({ ordinal, fromTime: one.from, toTime: one.to }))

// WHY: 2026-11-04 is a Wednesday, a working weekday of the fixture calendar.
const WEDNESDAY = '2026-11-04'

// see AT-79, AT-80, AT-82
function exceptionRow(recurrenceKind: number | null, dayWorking: boolean, list: readonly Span[]): Json {
  return {
    ordinal: 0,
    name: 'cr-751 exception',
    fromDate: `${WEDNESDAY}T00:00:00`,
    toDate: `${WEDNESDAY}T23:59:00`,
    dayWorking,
    recurrenceKind,
    workingTimes: workingTimes(list),
    carry: {},
    carryElements: [],
  }
}

function scheduleWith(exceptions: readonly Json[], minutesPerDay: number | null = null): Schedule {
  const json = fixture()
  json['schedule']['project']['minutesPerDay'] = minutesPerDay
  json['schedule']['calendars'][0]['exceptions'] = exceptions.map((one, ordinal) => ({ ...one, ordinal }))
  return decodedOk(JSON.stringify(json)).schedule as Schedule
}

const S_128 = settingNumber('S-128')
const S_580: readonly (readonly [string, string])[] = settingRow('S-580')['value']['spans']
const minutesOf = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
const SHORT_DAY = spans(['09:00:00', '12:00:00'])
const SHORT_MINUTES = 180
const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
const FULL_DAY_BY_S_128 = spans(['08:00:00', hhmm(8 * 60 + S_128)])

// see AT-82
const ONE_OFF_KINDS: readonly (number | null)[] = [9, null, 1]
const RECURRING_KINDS: readonly number[] = [2, 3, 4, 5, 6, 7, 8]

// see FR-054, RS-89, AT-82, S-128, S-580
describe('FR-054 / RS-89: holdsWorkingDayUnlikeMinutesPerDay counts one-off exception days with their own spans', () => {
  it('premise: the default spans S-580 total S-128, SHORT_DAY does not, FULL_DAY_BY_S_128 does', () => {
    expect(S_580.reduce((sum, [from, to]) => sum + minutesOf(to) - minutesOf(from), 0)).toBe(S_128)
    expect(SHORT_MINUTES).not.toBe(S_128)
    expect(minutesOf(FULL_DAY_BY_S_128[0]?.to ?? '') - minutesOf(FULL_DAY_BY_S_128[0]?.from ?? '')).toBe(S_128)
  })

  it('the fixture calendar (weekdays on the S-580 spans, minutesPerDay null) holds no such day', () => {
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([]))).toBe(false)
  })

  it.each(ONE_OFF_KINDS.map((kind) => [String(kind), kind]))(
    'a one-off exception (AT-82 recurrenceKind %s) whose own spans total other than minutesPerDay: true',
    (_name, kind) => {
      expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, SHORT_DAY)]))).toBe(true)
    },
  )

  it.each(ONE_OFF_KINDS.map((kind) => [String(kind), kind]))(
    'a one-off exception (AT-82 recurrenceKind %s) whose own spans total minutesPerDay: false',
    (_name, kind) => {
      expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, FULL_DAY_BY_S_128)]))).toBe(false)
    },
  )

  it('with Project.minutesPerDay set to the one-off day total, the S-580 weekdays are what differ', () => {
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, true, SHORT_DAY)], SHORT_MINUTES))).toBe(
      S_128 !== SHORT_MINUTES,
    )
  })

  it.each(RECURRING_KINDS.map((kind) => [String(kind), kind]))(
    'a recurring exception (AT-82 recurrenceKind %s) with spans unlike minutesPerDay does not count (FR-054 MUST NOT): false',
    (_name, kind) => {
      expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, SHORT_DAY)]))).toBe(false)
    },
  )

  it('a one-off non-working exception day (no spans) is not a working day: false', () => {
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, false, [])]))).toBe(false)
  })

  it('a one-off working exception day without its own spans reads S-580, which totals S-128: false', () => {
    expect(holdsWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, true, [])]))).toBe(false)
  })
})

function withWeekdaySpans(list: readonly Span[]): string {
  const json = fixture()
  json['schedule']['calendars'][0]['weekDays'][3]['workingTimes'] = workingTimes(list)
  return JSON.stringify(json)
}

function spanRun(count: number): Span[] {
  const out: Span[] = []
  for (let i = 0; i < count; i += 1) {
    const hour = String(1 + i * 2).padStart(2, '0')
    out.push({ from: `${hour}:00:00`, to: `${hour}:30:00` })
  }
  return out
}

// see IV-24, S-582, T-233, FR-023
describe('IV-24 / S-582: the span count is a T-220 row, not a reading condition of the schema (Chapter 6.1)', () => {
  const S_582 = settingNumber('S-582')
  const importOf = (text: string) =>
    validateImportedDocument({ document: decodedOk(text), byteLength: text.length, emptyRowTaskUids: [] })

  it('a weekday with S-582 spans reads and passes the import check', () => {
    const verdict = importOf(withWeekdaySpans(spanRun(S_582)))
    expect(verdict.ok, JSON.stringify(verdict).slice(0, 400)).toBe(true)
  })

  it('a weekday with S-582 + 1 spans is not refused by the schema check: documentFromJson ok, no RS-25 (Chapter 6.1 lists what the reading schema enforces; maxItems is not in it)', () => {
    const read = documentFromJson(withWeekdaySpans(spanRun(S_582 + 1)), KNOWN_VERSION)
    expect(read.ok, read.ok ? '' : `${read.reason} ${JSON.stringify(read.faults).slice(0, 400)}`).toBe(true)
  })

  it('a weekday with S-582 + 1 spans is refused by the import check under IV-24 (T-233 closing: the refusal carries the T-220 row ID)', () => {
    const text = withWeekdaySpans(spanRun(S_582 + 1))
    const read = documentFromJson(text, KNOWN_VERSION)
    if (!read.ok) {
      expect.fail(`premise: refused by ${read.reason} before the import check`)
    }
    const verdict = validateImportedDocument({ document: read.document, byteLength: text.length, emptyRowTaskUids: [] })
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.refusals.map((one) => one.rule)).toContain('IV-24')
  })
})

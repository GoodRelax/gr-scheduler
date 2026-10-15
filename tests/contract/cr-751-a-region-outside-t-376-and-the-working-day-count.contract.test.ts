// CR-751 (spec-only): FR-156 refuses a schedule time zone outside T-376 (RS-25), OP-6 resets the view keys S-574 / S-575, FR-054 / RS-89 count one-off exception days, and IV-24 owns the span count S-582.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import {
  TIME_ZONE_ROWS,
  isStandardTimeZoneKey,
  isTimeZoneKey,
  viewRegionOf,
  zoneClockOf,
} from '../../src/entity/document-model/schedule/time-zone'
import { isWorkingDayUnlikeMinutesPerDay } from '../../src/entity/document-model/schedule/working-calendar'
import { importDocument, type ImportRequest } from '../../src/use-case/import-document/import-document'
import { validateImportedDocument } from '../../src/use-case/validate-imported-document/validate-imported-document'
import { settingNumber, settingRow } from '../fixtures/setting-number'
import { bare, specTable } from './spec-table'

type Json = Record<string, any>

const FIXTURE_TEXT = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'measuring-document.json'), 'utf8')
const KNOWN_VERSION = (JSON.parse(FIXTURE_TEXT) as Json)['schemaVersion'] as string
const fixture = (): Json => JSON.parse(FIXTURE_TEXT) as Json

// see T-376
// WHY: CR-755 -- the table holds keys of fixed offsets; the base takes the standard-time rows only.
const T_376 = specTable('T-376')
const REGIONS: readonly string[] = T_376.rows.map((row) => bare(row.by['鍵'] ?? ''))
const STANDARD_KEYS: readonly string[] = T_376.rows.filter((row) => row.by['種'] === '標準時').map((row) => bare(row.by['鍵'] ?? ''))
const DAYLIGHT_KEYS: readonly string[] = REGIONS.filter((key) => !STANDARD_KEYS.includes(key))

// see T-376
function offsetMinutesOf(cell: string): number {
  const text = cell.replace(/−/g, '-').replace(/±/g, '+').trim()
  const found = /^([+-])(\d{2}):(\d{2})$/.exec(text)
  if (found === null) throw new Error(`T-376: unreadable offset cell ${JSON.stringify(cell)}`)
  const minutes = Number(found[2]) * 60 + Number(found[3])
  return found[1] === '-' ? -minutes : minutes
}

// see FR-156
// WHY: CR-755 -- a region name (the old values) is outside the table now, as is a made-up or mis-spelt key.
const OUTSIDE = ['Mars/Base', 'Asia/Tokyo', 'UTC', '', 'utc+09:00', ' UTC+09:00', 'UTC+9:00', '+09:00', 'UTC+09:00 dst']

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
  it('T-376 has 39 rows ZN-29..ZN-67, each naming one distinct key, 27 of them standard time', () => {
    expect(T_376.rows.map((row) => row.id)).toEqual(Array.from({ length: 39 }, (_, i) => `ZN-${i + 29}`))
    expect(new Set(REGIONS).size).toBe(39)
    expect(STANDARD_KEYS).toHaveLength(27)
    expect(STANDARD_KEYS).toContain('UTC+00:00')
  })

  it('no OUTSIDE value (made-up, a region name, empty, wrong case, padded, unpadded, an offset) is a T-376 key', () => {
    for (const value of OUTSIDE) expect(REGIONS, JSON.stringify(value)).not.toContain(value)
  })

  it('the fixture opens as it is', () => {
    expect(decodedOk(FIXTURE_TEXT).schedule.project.scheduleDataTimeZone).toBe('UTC+00:00')
  })
})

// see FR-156, T-376, RS-25
describe('FR-156: a GRS JSON whose scheduleDataTimeZone is not a standard-time key of T-376 is refused whole with RS-25', () => {
  it.each([...OUTSIDE, ...DAYLIGHT_KEYS].map((value) => [JSON.stringify(value), value]))(
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

  it.each(STANDARD_KEYS.map((key) => [key]))('%s opens (FR-156: every standard-time row is a choice)', (key) => {
    const read = documentFromJson(withScheduleZone(key), KNOWN_VERSION)
    expect(read.ok, read.ok ? '' : JSON.stringify(read.faults).slice(0, 400)).toBe(true)
    if (read.ok) expect(read.document.schedule.project.scheduleDataTimeZone).toBe(key)
  })
})

// see FR-156, T-376
describe('FR-156 / T-376: the roster the code holds is the table', () => {
  it('TIME_ZONE_ROWS holds the T-376 rows in table order: row ID, key, offset, daylight row, abbreviation', () => {
    expect(TIME_ZONE_ROWS.map((row) => [row.rowId, row.key, row.offsetMinutes, row.isDaylight, row.abbreviation])).toEqual(
      T_376.rows.map((row) => [
        row.id,
        bare(row.by['鍵'] ?? ''),
        offsetMinutesOf(row.by['UTC の差'] ?? ''),
        row.by['種'] === '夏時間',
        row.by['略称'] === '—' ? null : (row.by['略称'] ?? null),
      ]),
    )
  })

  it('isTimeZoneKey is true for every T-376 key; isStandardTimeZoneKey only for the standard-time ones; both false outside', () => {
    for (const key of REGIONS) expect(isTimeZoneKey(key), key).toBe(true)
    for (const key of STANDARD_KEYS) expect(isStandardTimeZoneKey(key), key).toBe(true)
    for (const key of DAYLIGHT_KEYS) expect(isStandardTimeZoneKey(key), key).toBe(false)
    for (const value of [...OUTSIDE, null, undefined, 9]) {
      expect(isTimeZoneKey(value), JSON.stringify(value)).toBe(false)
      expect(isStandardTimeZoneKey(value), JSON.stringify(value)).toBe(false)
    }
  })

  it('zoneClockOf reads each key on its T-376 offset all year (FR-156: no daylight saving by season)', () => {
    const MS_PER_MINUTE = 60000
    const january = Date.UTC(2026, 0, 15, 12, 0) / MS_PER_MINUTE
    const july = Date.UTC(2026, 6, 15, 12, 0) / MS_PER_MINUTE
    for (const row of T_376.rows) {
      const key = bare(row.by['鍵'] ?? '')
      const offset = offsetMinutesOf(row.by['UTC の差'] ?? '')
      const clock = zoneClockOf(key)
      expect([january, july].map((utc) => clock.wallOf(utc) - utc), `${row.id} ${key}`).toEqual([offset, offset])
    }
  })

  it('viewRegionOf: null (S-574), a daylight key and an OUTSIDE value (OP-6 default) show the schedule data zone; a standard key shows itself', () => {
    expect(viewRegionOf('UTC+09:00', null)).toBe('UTC+09:00')
    expect(viewRegionOf('UTC+09:00', 'UTC+01:00')).toBe('UTC+01:00')
    for (const value of [...OUTSIDE, ...DAYLIGHT_KEYS]) expect(viewRegionOf('UTC+09:00', value), JSON.stringify(value)).toBe('UTC+09:00')
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
    ['S-574', 'viewTimeZone', 'Asia/Tokyo'],
    ['S-574', 'viewTimeZone', ''],
    // WHY: CR-755 (X-r) -- the view base takes a standard-time key only; a daylight key goes back to the default.
    ['S-574', 'viewTimeZone', 'UTC-07:00 DST'],
    ['S-575', 'displayTimeZones', ['UTC+09:00', 'Mars/Base']],
    ['S-575', 'displayTimeZones', ['Asia/Tokyo']],
    ['S-575', 'displayTimeZones', 'UTC+09:00'],
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

  it('a T-376 key in both keys is kept as written, a daylight key included in S-575 (the reset is only for values outside)', () => {
    const json = fixture()
    json['documentSettings']['viewTimeZone'] = 'UTC+01:00'
    json['documentSettings']['displayTimeZones'] = ['UTC+09:00', 'UTC-07:00 DST']
    const settings = replacedBy(decodedOk(JSON.stringify(json))).documentSettings as unknown as Json
    expect(settings['viewTimeZone']).toBe('UTC+01:00')
    expect(settings['displayTimeZones']).toEqual(['UTC+09:00', 'UTC-07:00 DST'])
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
describe('FR-054 / RS-89: isWorkingDayUnlikeMinutesPerDay counts one-off exception days with their own spans', () => {
  it('premise: the default spans S-580 total S-128, SHORT_DAY does not, FULL_DAY_BY_S_128 does', () => {
    expect(S_580.reduce((sum, [from, to]) => sum + minutesOf(to) - minutesOf(from), 0)).toBe(S_128)
    expect(SHORT_MINUTES).not.toBe(S_128)
    expect(minutesOf(FULL_DAY_BY_S_128[0]?.to ?? '') - minutesOf(FULL_DAY_BY_S_128[0]?.from ?? '')).toBe(S_128)
  })

  it('the fixture calendar (weekdays on the S-580 spans, minutesPerDay null) holds no such day', () => {
    expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([]))).toBe(false)
  })

  it.each(ONE_OFF_KINDS.map((kind) => [String(kind), kind]))(
    'a one-off exception (AT-82 recurrenceKind %s) whose own spans total other than minutesPerDay: true',
    (_name, kind) => {
      expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, SHORT_DAY)]))).toBe(true)
    },
  )

  it.each(ONE_OFF_KINDS.map((kind) => [String(kind), kind]))(
    'a one-off exception (AT-82 recurrenceKind %s) whose own spans total minutesPerDay: false',
    (_name, kind) => {
      expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, FULL_DAY_BY_S_128)]))).toBe(false)
    },
  )

  it('with Project.minutesPerDay set to the one-off day total, the S-580 weekdays are what differ', () => {
    expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, true, SHORT_DAY)], SHORT_MINUTES))).toBe(
      S_128 !== SHORT_MINUTES,
    )
  })

  it.each(RECURRING_KINDS.map((kind) => [String(kind), kind]))(
    'a recurring exception (AT-82 recurrenceKind %s) with spans unlike minutesPerDay does not count (FR-054 MUST NOT): false',
    (_name, kind) => {
      expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(kind, true, SHORT_DAY)]))).toBe(false)
    },
  )

  it('a one-off non-working exception day (no spans) is not a working day: false', () => {
    expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, false, [])]))).toBe(false)
  })

  it('a one-off working exception day without its own spans reads S-580, which totals S-128: false', () => {
    expect(isWorkingDayUnlikeMinutesPerDay(scheduleWith([exceptionRow(9, true, [])]))).toBe(false)
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

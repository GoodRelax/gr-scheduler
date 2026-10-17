// CR-755 (spec-only): table T-376 holds fixed offsets with one abbreviation, the names read "UTC +09:00 JST" over "Tokyo" (CR-787), no daylight saving by season, the base takes standard keys only, and the schema says so.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { timeZoneAbbreviationOf, timeZoneLinesOf, zoneOffsetTextOf } from '../../src/adapter/screen-renderer/notices'
import {
  PRINTED_TIME_ZONE,
  TIME_ZONE_ROWS,
  isStandardTimeZoneKey,
  isTimeZoneKey,
  standardTimeZoneKeyForSystem,
  timeZoneRowOf,
  zoneClockOf,
} from '../../src/entity/document-model/schedule/time-zone'
import { readSystemStandardTimeZone } from '../../src/framework/single-html-shell/frame-loop'
import { validateDocument } from '../fixtures/grs-document'
import {
  ALL_KEYS,
  DAYLIGHT_KEYS,
  REQUIREMENTS,
  SCHEMA,
  STANDARD_KEYS,
  T_376_ROWS,
  WORDS,
  expectedAbbreviationOf,
  expectedLinesOf,
  zoneRowOfKey,
  type Loose,
} from './cr-755-stage'

// see FR-156
const FR_156_FIXED_OFFSET =
  'タイムゾーンは、1 つの固定の UTC の差と 1 つの略称で決まるものとし、値は 表 T-376 の鍵とすること（MUST）'
const FR_156_NO_SEASON = '⛔ 夏時間を季節で自動に切り替えてはならない（MUST NOT）'
const FR_156_STANDARD_BASE =
  '日程データのタイムゾーン（`AT-157`）と見せる基準（`S-574`）は、表 T-376 の種が標準時の行だけから選ばせ、表示するタイムゾーン（`S-575`）はすべての行から選ばせること（MUST）'
const FR_156_REFUSE =
  '⛔ 日程データのタイムゾーンが 表 T-376 の種が標準時の行の鍵でない `GRS JSON` は開かず、表 T-233 の `RS-25` で拒むこと（MUST）'
const FR_156_VIEW_RESET =
  '見せる基準（`S-574`）が標準時の行の鍵でないとき、表示するタイムゾーン（`S-575`）に 表 T-376 の鍵でない値があるときは、文書を拒まず、そのキーを既定へ戻す'
// WHY: CR-787 (JDG-2463) -- the name is two lines, zoneHead over the place; hours take two digits.
const FR_156_NAME =
  '見せる名は 2 行とし、1 行目は 表 T-376 の UTC の差と略称を `FR-038` の辞書の `timeZoneField` の `zoneHead` の形でつないだもの、2 行目は同じ辞書の `timeZones` が行ごとに持つ地名とすること（MUST）'
const FR_156_NAME_EXAMPLES = '例「UTC +09:00 JST」／「東京」、「UTC -07:00 MST」／「Mountain Standard Time (US, Canada)」'
const FR_156_OFFSET_FORM = '差は時も分も 2 桁とし、0 は `±00:00` と書く'
const FR_156_NO_ABBREVIATION = '略称を持たない行は、1 行目の略称の部を詰める（例「UTC -12:00」／「日付変更線の西」）。'
const FR_156_PC_STANDARD = 'PC の標準時は、その PC の今年の 1 月 1 日と 7 月 1 日の UTC の差の小さいほうとする。'
const T_376_UTC = '±0:00 の標準時の略称は UTC とする（利用者の判断）。'
const T_376_KNOWN = '広く知られた地域の略称を持つ時差の行は、その略称とする（例 AST・ADT・CET・MSK）（利用者の判断）。'
const T_376_ORDER = '⭐ 本表の並びは時差の小さい順、同じ時差では標準時を先とし、選ぶ欄もこの順に並べる。'

describe('CR-755 -- the manuscript these cases are built from still reads as quoted', () => {
  it.each([
    FR_156_FIXED_OFFSET,
    FR_156_NO_SEASON,
    FR_156_STANDARD_BASE,
    FR_156_REFUSE,
    FR_156_VIEW_RESET,
    FR_156_NAME,
    FR_156_NAME_EXAMPLES,
    FR_156_OFFSET_FORM,
    FR_156_NO_ABBREVIATION,
    FR_156_PC_STANDARD,
    T_376_UTC,
    T_376_KNOWN,
    T_376_ORDER,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see T-376
describe(`T-376 -- ${FR_156_FIXED_OFFSET}`, () => {
  it('39 rows ZN-29..ZN-67: 27 standard time and 12 daylight time, every key distinct', () => {
    expect(T_376_ROWS.map((row) => row.id)).toEqual(Array.from({ length: 39 }, (_, i) => `ZN-${String(i + 29)}`))
    expect(STANDARD_KEYS).toHaveLength(27)
    expect(DAYLIGHT_KEYS).toHaveLength(12)
    expect(new Set(ALL_KEYS).size).toBe(39)
  })

  it('a key is UTC, the sign, two-digit hours and minutes, and " DST" exactly on the daylight rows; it states the row offset', () => {
    for (const row of T_376_ROWS) {
      const found = /^UTC([+-])(\d{2}):(\d{2})( DST)?$/.exec(row.key)
      expect(found, `${row.id} ${row.key}`).not.toBeNull()
      if (found === null) continue
      const size = Number(found[2]) * 60 + Number(found[3])
      expect(found[1] === '-' ? -size : size, `${row.id} offset`).toBe(row.offsetMinutes)
      expect(found[4] !== undefined, `${row.id} DST suffix`).toBe(row.isDaylight)
    }
  })

  it('the keys named by the CR read as expected: UTC-08:00 is PST, UTC-07:00 DST is PDT, UTC+00:00 is UTC', () => {
    expect(zoneRowOfKey('UTC-08:00')).toMatchObject({ offsetMinutes: -480, isDaylight: false, abbreviation: 'PST' })
    expect(zoneRowOfKey('UTC-07:00 DST')).toMatchObject({ offsetMinutes: -420, isDaylight: true, abbreviation: 'PDT' })
    expect(zoneRowOfKey('UTC-07:00')).toMatchObject({ offsetMinutes: -420, isDaylight: false, abbreviation: 'MST' })
    expect(zoneRowOfKey('UTC+09:00')).toMatchObject({ offsetMinutes: 540, isDaylight: false, abbreviation: 'JST' })
    expect(zoneRowOfKey('UTC+05:30')).toMatchObject({ offsetMinutes: 330, isDaylight: false, abbreviation: 'IST' })
  })

  it(`${T_376_UTC} -- the one +-0:00 standard row is UTC+00:00 and its abbreviation is UTC`, () => {
    const zero = T_376_ROWS.filter((row) => row.offsetMinutes === 0 && !row.isDaylight)
    expect(zero.map((row) => [row.key, row.abbreviation])).toEqual([['UTC+00:00', 'UTC']])
  })

  it(`${T_376_KNOWN} -- AST, ADT, CET and MSK stand on their offsets`, () => {
    expect(zoneRowOfKey('UTC-04:00').abbreviation).toBe('AST')
    expect(zoneRowOfKey('UTC-03:00 DST').abbreviation).toBe('ADT')
    expect(zoneRowOfKey('UTC+01:00').abbreviation).toBe('CET')
    expect(zoneRowOfKey('UTC+03:00').abbreviation).toBe('MSK')
  })

  it('UTC-12:00 is the only row with no abbreviation', () => {
    expect(T_376_ROWS.filter((row) => row.abbreviation === null).map((row) => row.key)).toEqual(['UTC-12:00'])
  })

  it(`${T_376_ORDER} -- ascending offset, standard first on a tie`, () => {
    for (let i = 1; i < T_376_ROWS.length; i += 1) {
      const before = T_376_ROWS[i - 1]
      const after = T_376_ROWS[i]
      if (before === undefined || after === undefined) continue
      const ordered = before.offsetMinutes < after.offsetMinutes || (before.offsetMinutes === after.offsetMinutes && !before.isDaylight && after.isDaylight)
      expect(ordered, `${before.id} before ${after.id}`).toBe(true)
    }
  })

  it('the roster the code holds is the table: row ID, key, offset, kind and abbreviation, in table order', () => {
    expect(TIME_ZONE_ROWS.map((row) => [row.rowId, row.key, row.offsetMinutes, row.isDaylight, row.abbreviation])).toEqual(
      T_376_ROWS.map((row) => [row.id, row.key, row.offsetMinutes, row.isDaylight, row.abbreviation]),
    )
    for (const row of T_376_ROWS) expect(timeZoneRowOf(row.key)?.rowId, row.key).toBe(row.id)
  })

  it(`${FR_156_STANDARD_BASE} -- isTimeZoneKey takes every key; isStandardTimeZoneKey only the standard ones`, () => {
    for (const key of ALL_KEYS) expect(isTimeZoneKey(key), key).toBe(true)
    for (const key of STANDARD_KEYS) expect(isStandardTimeZoneKey(key), key).toBe(true)
    for (const key of DAYLIGHT_KEYS) expect(isStandardTimeZoneKey(key), key).toBe(false)
    for (const value of ['Asia/Tokyo', 'UTC', 'JST', 'PDT', 'UTC+9:00', 'UTC+09:00 dst', '', null]) {
      expect(isTimeZoneKey(value), String(value)).toBe(false)
      expect(isStandardTimeZoneKey(value), String(value)).toBe(false)
    }
  })

  it('a printed document holds UTC+00:00 (BK-4)', () => {
    expect(PRINTED_TIME_ZONE).toBe('UTC+00:00')
  })
})

// see FR-156
describe(`FR-156 -- ${FR_156_NO_SEASON}`, () => {
  const MS_PER_MINUTE = 60000
  const instants = [Date.UTC(2026, 0, 15, 12, 0), Date.UTC(2026, 3, 1, 15, 0), Date.UTC(2026, 7, 15, 12, 0), Date.UTC(2026, 10, 2, 9, 0)].map(
    (ms) => ms / MS_PER_MINUTE,
  )

  it('the PDT row reads UTC-7 in January as in August, and the PST row reads UTC-8 in August as in January', () => {
    const pdt = zoneClockOf('UTC-07:00 DST')
    const pst = zoneClockOf('UTC-08:00')
    expect(instants.map((utc) => pdt.wallOf(utc) - utc)).toEqual(instants.map(() => -420))
    expect(instants.map((utc) => pst.wallOf(utc) - utc)).toEqual(instants.map(() => -480))
  })

  it.each(T_376_ROWS.map((row) => [row.key, row] as const))('%s reads its table offset at every instant, and utcOf undoes wallOf', (_key, row) => {
    const clock = zoneClockOf(row.key)
    expect(clock.offsetMinutes).toBe(row.offsetMinutes)
    for (const utc of instants) {
      expect(clock.wallOf(utc) - utc).toBe(row.offsetMinutes)
      expect(clock.utcOf(clock.wallOf(utc))).toBe(utc)
    }
  })
})

// see FR-156, FR-038, T-376
describe(`FR-156 -- ${FR_156_NAME}`, () => {
  it.each([
    ['UTC+09:00', 'ja', 'UTC +09:00 JST', '東京'],
    ['UTC+09:00', 'en', 'UTC +09:00 JST', 'Tokyo'],
    ['UTC-07:00', 'ja', 'UTC -07:00 MST', '山岳部標準時（米国・カナダ）'],
    ['UTC-07:00', 'en', 'UTC -07:00 MST', 'Mountain Standard Time (US, Canada)'],
    ['UTC-07:00 DST', 'en', 'UTC -07:00 PDT', 'Pacific Daylight Time (US, Canada)'],
    ['UTC-08:00', 'ja', 'UTC -08:00 PST', '太平洋標準時（米国・カナダ）'],
    ['UTC+05:30', 'ja', 'UTC +05:30 IST', 'インド'],
    ['UTC-12:00', 'ja', 'UTC -12:00', '日付変更線の西'],
    ['UTC+00:00', 'ja', 'UTC ±00:00 UTC', '協定世界時・ロンドン'],
  ] as const)('%s in %s reads "%s" over "%s"', (key, language, head, place) => {
    expect(timeZoneLinesOf(key, language)).toEqual([head, place])
  })

  it.each(T_376_ROWS.flatMap((row) => (['ja', 'en'] as const).map((language) => [row.key, language, row] as const)))(
    '%s in %s is the table offset and abbreviation in the zoneHead shape, over the dictionary place',
    (_key, language, row) => {
      expect(timeZoneLinesOf(row.key, language)).toEqual(expectedLinesOf(row, language))
    },
  )

  it(`${FR_156_OFFSET_FORM} -- zoneOffsetTextOf`, () => {
    expect([-720, -480, -420, 0, 330, 540, 600, 780].map(zoneOffsetTextOf)).toEqual([
      '-12:00',
      '-08:00',
      '-07:00',
      '±00:00',
      '+05:30',
      '+09:00',
      '+10:00',
      '+13:00',
    ])
  })

  it('the dictionary holds one place for every T-376 row, in table order, and no other', () => {
    const rowIds = (WORDS['timeZones'] as readonly Loose[]).map((one) => one['rowId'])
    expect(rowIds).toEqual(T_376_ROWS.map((row) => row.id))
  })

  it.each(T_376_ROWS.map((row) => [row.key] as const))('the abbreviation of %s is the table one (offsetName where it has none)', (key) => {
    for (const language of ['ja', 'en'] as const) expect(timeZoneAbbreviationOf(key, language)).toBe(expectedAbbreviationOf(key, language))
  })

  it('UTC-12:00 prints UTC-12 (FR-017: the hour alone when the minutes are 0)', () => {
    expect(timeZoneAbbreviationOf('UTC-12:00', 'ja')).toBe('UTC-12')
  })
})

// see FR-156, BK-4
describe(`FR-156 -- ${FR_156_PC_STANDARD}`, () => {
  const savedZone = process.env['TZ']

  afterEach(() => {
    if (savedZone === undefined) delete process.env['TZ']
    else process.env['TZ'] = savedZone
  })

  // WHY: subtracting from 0 turns the -0 of a zero offset into 0.
  const offsetOn = (month: number): number => 0 - new Date(new Date().getFullYear(), month, 1, 12).getTimezoneOffset()

  it('the reading on this PC is the standard row of the smaller of its January 1 and July 1 offsets', () => {
    const read = readSystemStandardTimeZone()
    expect(isStandardTimeZoneKey(read)).toBe(true)
    expect(read).toBe(standardTimeZoneKeyForSystem({ januaryOffsetMinutes: offsetOn(0), julyOffsetMinutes: offsetOn(6) }))
  })

  it.each([
    ['America/Los_Angeles', -480, 'UTC-08:00'],
    ['Australia/Sydney', 600, 'UTC+10:00'],
    ['Asia/Tokyo', 540, 'UTC+09:00'],
    ['Europe/London', 0, 'UTC+00:00'],
    ['Asia/Kathmandu', 345, 'UTC+05:30'],
  ] as const)('a PC on %s reads %s the whole year and falls to %s, never a daylight row', (zone, standard, key) => {
    process.env['TZ'] = zone
    expect(Math.min(offsetOn(0), offsetOn(6)), 'premise: the process follows TZ').toBe(standard)
    expect(readSystemStandardTimeZone()).toBe(key)
  })
})

type Json = Record<string, any>

const FIXTURE_TEXT = readFileSync(join(process.cwd(), 'tests', 'fixtures', 'measuring-document.json'), 'utf8')
const KNOWN_VERSION = (JSON.parse(FIXTURE_TEXT) as Json)['schemaVersion'] as string

function withValues(zone: unknown, view: unknown, display: unknown): Json {
  const json = JSON.parse(FIXTURE_TEXT) as Json
  json['schedule']['project']['scheduleDataTimeZone'] = zone
  json['documentSettings']['viewTimeZone'] = view
  json['documentSettings']['displayTimeZones'] = display
  return json
}

const OUTSIDE = ['Asia/Tokyo', 'UTC', 'JST', 'UTC+9:00', 'UTC+09:00 dst', 'UTC+14:00']

// see FR-156, T-376, S-574, S-575
describe(`the GRS JSON schema -- ${FR_156_STANDARD_BASE}`, () => {
  const project = (SCHEMA['$defs'] as Json)['Project']['properties']['scheduleDataTimeZone'] as Json
  const settings = SCHEMA['properties']['documentSettings']['properties'] as Json

  it('premise: the fixture with a standard base, a standard view base and both kinds of display key is valid', () => {
    const result = validateDocument(withValues('UTC-08:00', 'UTC+09:00', ['UTC-07:00 DST', 'UTC+09:00']))
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('scheduleDataTimeZone and viewTimeZone enumerate the 27 standard keys; displayTimeZones items the 39 keys', () => {
    expect(project['enum']).toEqual(STANDARD_KEYS)
    expect((settings['viewTimeZone']['enum'] as unknown[]).filter((one) => one !== null)).toEqual(STANDARD_KEYS)
    expect(settings['displayTimeZones']['items']['enum']).toEqual(ALL_KEYS)
  })

  it('the descriptions tell a schema-only writer: a standard-time key, no daylight saving by season, " DST" read all year', () => {
    expect(String(project['description'])).toContain('standard-time key')
    expect(String(project['description'])).toContain('Daylight saving is never applied by season')
    expect(String(settings['displayTimeZones']['description'])).toContain('" DST"')
  })

  it.each(STANDARD_KEYS.map((key) => [key]))('%s is valid as the schedule data zone and as the view base', (key) => {
    expect(validateDocument(withValues(key, key, [])).valid).toBe(true)
  })

  it.each(DAYLIGHT_KEYS.map((key) => [key]))('%s is refused as the schedule data zone and as the view base, and valid as a display zone', (key) => {
    expect(validateDocument(withValues(key, null, [])).valid, 'scheduleDataTimeZone').toBe(false)
    expect(validateDocument(withValues('UTC+00:00', key, [])).valid, 'viewTimeZone').toBe(false)
    expect(validateDocument(withValues('UTC+00:00', null, [key])).valid, 'displayTimeZones').toBe(true)
  })

  it.each(OUTSIDE.map((value) => [value]))('%s (outside the roster) is refused wherever a time zone stands', (value) => {
    expect(validateDocument(withValues(value, null, [])).valid, 'scheduleDataTimeZone').toBe(false)
    expect(validateDocument(withValues('UTC+00:00', value, [])).valid, 'viewTimeZone').toBe(false)
    expect(validateDocument(withValues('UTC+00:00', null, [value])).valid, 'displayTimeZones').toBe(false)
  })
})

// see FR-156, RS-25, OP-6
describe(`the reader -- ${FR_156_REFUSE}`, () => {
  it.each([...DAYLIGHT_KEYS, ...OUTSIDE].map((value) => [value]))('a schedule data zone of %s is refused with RS-25', (value) => {
    const read = documentFromJson(JSON.stringify(withValues(value, null, [])), KNOWN_VERSION)
    expect(read.ok).toBe(false)
    if (!read.ok) expect(read.reason).toBe('RS-25')
  })

  it(`${FR_156_VIEW_RESET} -- a daylight view base opens (it is not refused)`, () => {
    const read = documentFromJson(JSON.stringify(withValues('UTC-08:00', 'UTC-07:00 DST', ['UTC-07:00 DST'])), KNOWN_VERSION)
    expect(read.ok).toBe(true)
    if (read.ok) expect(read.document.documentSettings.displayTimeZones).toEqual(['UTC-07:00 DST'])
  })
})

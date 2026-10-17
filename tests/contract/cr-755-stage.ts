// CR-755 spec-only stage: the manuscripts, table T-376 read as rows, and the dictionary words of the time zone field.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { DisplayLanguage } from '../../src/adapter/screen-renderer/screen-renderer'
import { bare, specTable, unbroken } from './spec-table'

export type Loose = Record<string, any>

const SPEC = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => unbroken(readFileSync(join(SPEC, ...parts), 'utf8').replace(/\r\n/g, '\n'))

export const REQUIREMENTS = read('01-04-requirements.md')
export const STATE_MACHINE_BOOK = read('_assets', 'tbl-state-machines.md')
const withoutBreakMarks = (_key: string, value: unknown): unknown => (typeof value === 'string' ? value.replace(/\|/g, '') : value)
export const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8'), withoutBreakMarks) as Loose
export const SCHEMA = JSON.parse(readFileSync(join(SPEC, '_source', 'grs-document.schema.json'), 'utf8')) as Loose

// see T-376
export interface ZoneRow {
  readonly id: string
  readonly key: string
  readonly offsetCell: string
  readonly offsetMinutes: number
  readonly isDaylight: boolean
  readonly abbreviation: string | null
}

const KIND_STANDARD = '標準時'
const KIND_DAYLIGHT = '夏時間'
const NO_ABBREVIATION = '—'

// see T-376
// WHY: the table writes the offset with the typographic minus sign and the plus-minus sign for zero.
export function offsetMinutesOfCell(cell: string): number {
  const text = cell.replace(/−/g, '-').replace(/±/g, '+').trim()
  const found = /^([+-])(\d{2}):(\d{2})$/.exec(text)
  if (found === null) throw new Error(`T-376: unreadable offset cell ${JSON.stringify(cell)}`)
  const minutes = Number(found[2]) * 60 + Number(found[3])
  return found[1] === '-' ? -minutes : minutes
}

export const T_376_ROWS: readonly ZoneRow[] = specTable('T-376').rows.map((row) => {
  const kind = bare(row.by['種'] ?? '')
  if (kind !== KIND_STANDARD && kind !== KIND_DAYLIGHT) throw new Error(`T-376 ${row.id}: unknown kind ${kind}`)
  const abbreviation = bare(row.by['略称'] ?? '')
  const offsetCell = bare(row.by['UTC の差'] ?? '')
  return {
    id: row.id,
    key: bare(row.by['鍵'] ?? ''),
    offsetCell,
    offsetMinutes: offsetMinutesOfCell(offsetCell),
    isDaylight: kind === KIND_DAYLIGHT,
    abbreviation: abbreviation === NO_ABBREVIATION ? null : abbreviation,
  }
})

export const ALL_KEYS: readonly string[] = T_376_ROWS.map((row) => row.key)
export const STANDARD_KEYS: readonly string[] = T_376_ROWS.filter((row) => !row.isDaylight).map((row) => row.key)
export const DAYLIGHT_KEYS: readonly string[] = T_376_ROWS.filter((row) => row.isDaylight).map((row) => row.key)

export function zoneRowOfKey(key: string): ZoneRow {
  const found = T_376_ROWS.find((row) => row.key === key)
  if (found === undefined) throw new Error(`table T-376 has no key ${key}`)
  return found
}

// see FR-038, FO-14
export function timeZoneWord(part: string, language: DisplayLanguage): string {
  const entry = (WORDS['timeZoneField'] as readonly Loose[]).find((one) => one['part'] === part)
  if (entry === undefined) throw new Error(`the dictionary section timeZoneField has no part ${part}`)
  return entry['text'][language] as string
}

// see FR-038, T-376
export function placeOf(rowId: string, language: DisplayLanguage): string {
  const entry = (WORDS['timeZones'] as readonly Loose[]).find((one) => one['rowId'] === rowId)
  if (entry === undefined) throw new Error(`the dictionary section timeZones has no row ${rowId}`)
  return entry['label'][language] as string
}

// see FR-038, T-104
export function settingWord(rowId: string, language: DisplayLanguage): string {
  const entry = (WORDS['settings'] as readonly Loose[]).find((one) => one['rowId'] === rowId)
  if (entry === undefined) throw new Error(`the dictionary section settings has no row ${rowId}`)
  return entry['label'][language] as string
}

// see FR-156
// WHY: FR-156 (CR-787) -- hours and minutes both take two digits, zero is the plus-minus sign and 00:00.
export function nameOffsetOf(minutes: number): string {
  const sign = minutes === 0 ? '±' : minutes < 0 ? '-' : '+'
  const size = Math.abs(minutes)
  return `${sign}${String(Math.floor(size / 60)).padStart(2, '0')}:${String(size % 60).padStart(2, '0')}`
}

// see FR-156, T-376
// WHY: FR-156 (CR-787) -- two lines: zoneHead fills offset and abbreviation (a row with no abbreviation
// closes up that part), and the dictionary place stands alone on line 2.
export function expectedLinesOf(row: ZoneRow, language: DisplayLanguage): readonly [string, string] {
  const shape = timeZoneWord('zoneHead', language)
  const head = row.abbreviation === null ? shape.replace(' {abbreviation}', '') : shape.replace('{abbreviation}', row.abbreviation)
  return [head.replace('{offset}', nameOffsetOf(row.offsetMinutes)), placeOf(row.id, language)]
}

// see FR-017, FR-156
// WHY: offsetName with the hour alone when the minutes are 0 (FR-017).
export function expectedOffsetNameOf(row: ZoneRow, language: DisplayLanguage): string {
  const size = Math.abs(row.offsetMinutes)
  const sign = row.offsetMinutes < 0 ? '-' : '+'
  const hours = `${sign}${Math.floor(size / 60)}`
  const offset = size % 60 === 0 ? hours : `${hours}:${String(size % 60).padStart(2, '0')}`
  return timeZoneWord('offsetName', language).replace('{offset}', offset)
}

// see FR-017, FR-156
export function expectedAbbreviationOf(key: string, language: DisplayLanguage): string {
  const row = zoneRowOfKey(key)
  return row.abbreviation ?? expectedOffsetNameOf(row, language)
}

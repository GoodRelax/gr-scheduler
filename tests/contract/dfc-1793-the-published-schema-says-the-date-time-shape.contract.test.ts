// DFC-1793: the published GRS JSON schema says the shape of every date-time column with one xsd:dateTime pattern (Chapter 6.2, FR-024).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import { rowDocument } from '../unit/cr-541-stage'
import { specTable, unbroken } from './spec-table'

const READ = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')

const DESIGN = unbroken(READ('docs', 'spec', '05-07-design.md'))
const REQUIREMENTS = unbroken(READ('docs', 'spec', '01-04-requirements.md'))

// WHY: each clause is cut from the manuscript as check 39 reads it, so the cases cannot drift from the words they test.
const CHAPTER_6_2_ONE_DEFINITION =
  '⭐ 日時の列は 1 つの日時の定義を指し、その定義が形を `xsd:dateTime` の字面の `pattern` で言うこと（MUST）'
const CHAPTER_6_2_SCROLL_DATE = '`_assets/tbl-settings.md` の `S-77`（`scrollDate`）も同じ `pattern` を持つ。'
const CHAPTER_6_2_NOT_IN_THE_READ = '⚠️ どちらも読む路の照合には載せない（Chapter 6.1）。'
const FR_024_ALWAYS_DATE_TIME = '⭐ **日時の列は、日付だけで書かず、いつも日時の形で書くこと（MUST）**'

describe('DFC-1793 the manuscripts these cases are driven by', () => {
  it.each([CHAPTER_6_2_ONE_DEFINITION, CHAPTER_6_2_SCROLL_DATE, CHAPTER_6_2_NOT_IN_THE_READ])('05-07 still says it: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })

  it(`01-04 still says it: ${FR_024_ALWAYS_DATE_TIME}`, () => {
    expect(REQUIREMENTS).toContain(FR_024_ALWAYS_DATE_TIME)
  })
})

type Loose = Record<string, any>

const SCHEMA = JSON.parse(READ('docs', 'spec', '_source', 'grs-document.schema.json')) as Loose
const DEFINITIONS = SCHEMA['$defs'] as Loose

// see T-058
// WHY: the columns whose type the table writes as a date-time.
const DATE_TIME_COLUMNS = specTable('T-058')
  .rows.filter((one) => /^日時$/.test((one.by['型'] ?? '').trim()))
  .map((one) => ({ id: one.id, entity: (one.by['エンティティ'] ?? '').replace(/`/g, '').trim(), column: (one.by['列'] ?? '').replace(/`/g, '').trim() }))

// WHY: the table also types its three setting keys as a date; S-77, S-518 and S-519 are the ones FR-024 names beside the columns.
const SETTING_KEYS = ['scrollDate', 'exportSpanStart', 'exportSpanFinish']

const DATE_TIME_REF = '#/$defs/DateTime'
const PATTERN = new RegExp((DEFINITIONS['DateTime'] as Loose)['pattern'] as string)

describe('Chapter 6.2 (MUST): a date-time column points at one definition that says the xsd:dateTime shape (DFC-1793)', () => {
  it('table T-058 holds date-time columns for the cases to walk', () => {
    expect(DATE_TIME_COLUMNS.length).toBeGreaterThan(0)
  })

  it.each(DATE_TIME_COLUMNS)('$id $entity.$column points at the date-time definition', ({ entity, column }) => {
    const property = (DEFINITIONS[entity] as Loose | undefined)?.['properties']?.[column] as Loose | undefined
    expect(property, `the schema has ${entity}.${column}`).toBeDefined()
    expect(property?.['$ref']).toBe(DATE_TIME_REF)
  })

  it.each(SETTING_KEYS)('the setting %s carries the same pattern as the definition', (key) => {
    const property = SCHEMA['properties']['documentSettings']['properties'][key] as Loose
    expect(property['pattern']).toBe((DEFINITIONS['DateTime'] as Loose)['pattern'])
  })

  it('the definition is a nullable string', () => {
    expect((DEFINITIONS['DateTime'] as Loose)['type']).toEqual(['string', 'null'])
  })
})

describe('Chapter 6.2 (MUST): the pattern is the xsd:dateTime spelling, with fractional seconds and a zone allowed', () => {
  it.each([
    '2026-04-01T00:00:00',
    '2026-04-01T08:30:15',
    '2026-04-01T08:30:15.5',
    '2026-04-01T08:30:15.123456',
    '2026-04-01T08:30:15Z',
    '2026-04-01T08:30:15+09:00',
    '2026-04-01T08:30:15.25-05:00',
  ])('%s is a date-time', (text) => {
    expect(PATTERN.test(text)).toBe(true)
  })

  it.each(['2026-04-01', '2026/04/01', '2026-04-01 08:30:15', '2026-04-01T08:30', '08:30:15', ''])(
    '%j is not a date-time (a date alone is not written, FR-024)',
    (text) => {
      expect(PATTERN.test(text)).toBe(false)
    },
  )
})

describe('Chapter 6.2 (MUST NOT): the pattern is shown, not enforced, on the read path', () => {
  // WHY: the schema says the shape; FR-023 reads the day, so a date-only scroll date is still opened.
  it('a document whose scrollDate is a date alone still opens', () => {
    const raw = rowDocument([{ id: 'r1', parentId: null }])
    raw['documentSettings'].scrollDate = '2026-04-01'
    expect(documentFromJson(JSON.stringify(raw)).ok).toBe(true)
  })
})

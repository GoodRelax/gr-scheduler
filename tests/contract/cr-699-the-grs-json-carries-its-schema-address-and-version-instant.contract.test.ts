// CR-699: a written GRS JSON opens with "$schema", its version is a UTC instant, the schema holds an empty ledger.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { specTable, unbroken } from './spec-table'

const DR_4_FIRST_KEY =
  '`$schema` / `schemaVersion` / `documentStamp` / `changeLog` の 4 つを置き、`$schema` を文書の先頭の鍵とすること（MUST）'
const FR_073_FORM = '書式は RFC 3339 の UTC の `YYYY-MM-DDTHH:MM:SSZ` とすること（MUST）'
const FR_073_NO_FRACTION = '小数秒と、`Z` 以外の帯を書いてはならない（MUST NOT）'
const FR_073_STRING_ORDER = '辞書順がそのまま時刻の順になる。⭐ **判別は文字列の大小で行うこと（MUST）'
const FR_073_NEWER_UNREADABLE = 'この `GRS` が知っている最大の版より新しい版を読めない版とすること（MUST）'
const FR_073_RAISE_TO_INSTANT = '変える変更は、形式の版を、その変更を当てる時刻へ上げること（MUST）'
const FR_073_NO_LEDGER_ROW_BEFORE_USE = '⛔ 公式運用の前は、台帳に行を足してはならない（MUST NOT）'
const CH_6_2_ID = '刊行するスキーマの `$id` は、`_assets/tbl-settings.md` の 表 T-206 の `S-540` の所とすること（MUST）'
const CH_6_2_WRITTEN_FIRST =
  '書き出す `GRS JSON` は、ルートの先頭の鍵に `"$schema"` を書き、値を `S-540` の所とすること（MUST）'
const CH_6_2_ROOT_ACCEPTS = '刊行するスキーマのルートは、`"$schema"` を必須の鍵として受けること（MUST）'
const CH_6_2_NOT_REFUSED_BY_VALUE = '読む路は、`"$schema"` の値を理由に文書を拒んではならない（MUST NOT）'
const CH_6_2_LEDGER = '刊行するスキーマは、ルートの注釈の語 `x-grsChanges` に、変更の台帳を配列で持つこと（MUST）'
const CH_6_2_NO_LEDGER_WRITTEN = '書き出す `GRS JSON` に台帳を載せてはならない（MUST NOT）'
const CH_6_2_SCHEMA_PLACE = '起こしたスキーマの置き場は `_source/grs-document.schema.json` とする（MUST）'

const SPEC_DIR = join(process.cwd(), 'docs', 'spec')
const read = (...parts: string[]): string => readFileSync(join(...parts), 'utf8').replace(/\r\n/g, '\n')
const REQUIREMENTS = unbroken(read(SPEC_DIR, '01-04-requirements.md'))
const DESIGN = unbroken(read(SPEC_DIR, '05-07-design.md'))

const SCHEMA_PATH = join(SPEC_DIR, '_source', 'grs-document.schema.json')
const PUBLISHED_SCHEMA = JSON.parse(read(SCHEMA_PATH)) as Record<string, any>
const LEDGER_SOURCE = JSON.parse(read(SPEC_DIR, '_source', 'grs-json-changes.json')) as Record<string, any>

const TEMPLATE_TEXT = read(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json')
const TEMPLATE_ROOT = JSON.parse(TEMPLATE_TEXT) as Record<string, unknown>

// see T-206
function settingDefault(id: string): string {
  const row = specTable('T-206').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 has no row ${id}`)
  return (row.cells[1] ?? '').replace(/^`|`$/g, '')
}

const S_540 = settingDefault('S-540')
const S_541 = settingDefault('S-541')

// WHY: FR-027's template carries the version this build knows; DR-4 names it as the one place.
const KNOWN_VERSION = String(TEMPLATE_ROOT['schemaVersion'])
const INSTANT_FORM = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

function opened(root: Record<string, unknown>): ReturnType<typeof documentFromJson> {
  return documentFromJson(JSON.stringify(root), KNOWN_VERSION)
}

function templateDocument(): Document {
  const reading = documentFromJson(TEMPLATE_TEXT, KNOWN_VERSION)
  if (!reading.ok) throw new Error(`the startup template does not open: ${JSON.stringify(reading.faults)}`)
  return reading.document
}

function withoutKey(root: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(root).filter(([one]) => one !== key))
}

function secondsMoved(instant: string, seconds: number): string {
  return new Date(Date.parse(instant) + seconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

describe('CR-699 -- the clauses these cases hold are the manuscript words', () => {
  it('DR-4, FR-073 and Chapter 6.2 still say what the cases below press', () => {
    for (const clause of [
      DR_4_FIRST_KEY,
      FR_073_FORM,
      FR_073_NO_FRACTION,
      FR_073_STRING_ORDER,
      FR_073_NEWER_UNREADABLE,
      FR_073_RAISE_TO_INSTANT,
      FR_073_NO_LEDGER_ROW_BEFORE_USE,
    ]) {
      expect(REQUIREMENTS.includes(clause), clause).toBe(true)
    }
    for (const clause of [
      CH_6_2_ID,
      CH_6_2_WRITTEN_FIRST,
      CH_6_2_ROOT_ACCEPTS,
      CH_6_2_NOT_REFUSED_BY_VALUE,
      CH_6_2_LEDGER,
      CH_6_2_NO_LEDGER_WRITTEN,
      CH_6_2_SCHEMA_PLACE,
    ]) {
      expect(DESIGN.includes(clause), clause).toBe(true)
    }
    expect(S_540.startsWith('https://'), 'S-540 states an address').toBe(true)
  })
})

describe(`表 T-052 DR-4 -- ${DR_4_FIRST_KEY}`, () => {
  it('DR-4 / S-540: the first key of a written GRS JSON is "$schema", holding the S-540 address', () => {
    const written = JSON.parse(jsonFromDocument(templateDocument())) as Record<string, unknown>
    expect(Object.keys(written)[0]).toBe('$schema')
    expect(written['$schema']).toBe(S_540)
    for (const key of ['schemaVersion', 'documentStamp', 'changeLog']) {
      expect(Object.keys(written), key).toContain(key)
    }
  })

  it('DR-4 / RS-25: a document without "$schema" is refused with RS-25', () => {
    const reading = opened(withoutKey(TEMPLATE_ROOT, '$schema'))
    expect(reading.ok).toBe(false)
    if (!reading.ok) expect(reading.reason).toBe('RS-25')
  })
})

describe(`Chapter 6.2 -- ${CH_6_2_WRITTEN_FIRST}`, () => {
  it('S-540: re-writing a read document writes the current address, not the one it was read with', () => {
    const reading = opened({ ...TEMPLATE_ROOT, $schema: 'https://example.invalid/an-older-place.json' })
    expect(reading.ok).toBe(true)
    if (!reading.ok) return
    const written = JSON.parse(jsonFromDocument(reading.document)) as Record<string, unknown>
    expect(Object.keys(written)[0]).toBe('$schema')
    expect(written['$schema']).toBe(S_540)
  })
})

describe(`Chapter 6.2 -- ${CH_6_2_NOT_REFUSED_BY_VALUE}`, () => {
  for (const [what, value] of [
    ['a number', 42],
    ['another address', 'https://example.invalid/somewhere-else.schema.json'],
    ['an empty string', ''],
  ] as const) {
    it(`DR-4 / Chapter 6.2: a "$schema" holding ${what} is read`, () => {
      const reading = opened({ ...TEMPLATE_ROOT, $schema: value })
      expect(reading.ok, JSON.stringify(reading.ok ? null : reading.faults)).toBe(true)
    })
  }
})

describe(`Chapter 6.2 -- ${CH_6_2_ROOT_ACCEPTS}`, () => {
  it('the published root requires "$schema" and binds only its type, never a const', () => {
    expect(PUBLISHED_SCHEMA['required']).toContain('$schema')
    const own = PUBLISHED_SCHEMA['properties']?.['$schema'] as Record<string, unknown> | undefined
    expect(own?.['type']).toBe('string')
    expect(own !== undefined && 'const' in own).toBe(false)
  })
})

describe(`Chapter 6.2 -- ${CH_6_2_ID}`, () => {
  it('S-540: the published schema names the S-540 address as its $id', () => {
    expect(PUBLISHED_SCHEMA['$id']).toBe(S_540)
  })

  it(`Chapter 6.2 -- ${CH_6_2_SCHEMA_PLACE}`, () => {
    expect(existsSync(SCHEMA_PATH)).toBe(true)
    expect(S_540.endsWith('/_source/grs-document.schema.json')).toBe(true)
  })
})

describe(`Chapter 6.2 -- ${CH_6_2_LEDGER}`, () => {
  it('x-grsChanges is an array, and it is empty while S-541 is null', () => {
    expect(Array.isArray(PUBLISHED_SCHEMA['x-grsChanges'])).toBe(true)
    expect(S_541).toBe('null')
    expect(PUBLISHED_SCHEMA['x-grsChanges']).toEqual([])
  })

  it(`FR-073 -- ${FR_073_NO_LEDGER_ROW_BEFORE_USE}`, () => {
    expect(S_541).toBe('null')
    expect(LEDGER_SOURCE['changes']).toEqual([])
  })

  it(`Chapter 6.2 -- ${CH_6_2_NO_LEDGER_WRITTEN}`, () => {
    const text = jsonFromDocument(templateDocument())
    expect(text.includes('x-grsChanges')).toBe(false)
  })
})

describe(`FR-073 -- ${FR_073_FORM}`, () => {
  it(`FR-073 -- ${FR_073_NO_FRACTION}`, () => {
    const written = JSON.parse(jsonFromDocument(templateDocument())) as Record<string, unknown>
    const version = String(written['schemaVersion'])
    expect(version).toMatch(INSTANT_FORM)
    expect(version.length).toBe(20)
    expect(secondsMoved(version, 0)).toBe(version)
  })

  it(`FR-073 -- ${FR_073_RAISE_TO_INSTANT}`, () => {
    const published = String(PUBLISHED_SCHEMA['properties']?.['schemaVersion']?.['const'])
    expect(published).toBe(KNOWN_VERSION)
    expect(published).toMatch(INSTANT_FORM)
  })
})

describe(`FR-073 -- ${FR_073_NEWER_UNREADABLE}`, () => {
  it(`FR-073 -- ${FR_073_STRING_ORDER}: one second after the known version is newer`, () => {
    const later = secondsMoved(KNOWN_VERSION, 1)
    expect(later > KNOWN_VERSION).toBe(true)
    const reading = opened({ ...TEMPLATE_ROOT, schemaVersion: later })
    if (reading.ok) expect(reading.formatVersion).toBe('newerThanKnown')
    else expect(reading.reason).toBe('RS-64')
  })

  it('FR-073: the known version itself and one second before it are not newer', () => {
    for (const version of [KNOWN_VERSION, secondsMoved(KNOWN_VERSION, -1)]) {
      const reading = opened({ ...TEMPLATE_ROOT, schemaVersion: version })
      expect(reading.ok, version).toBe(true)
      if (reading.ok) expect(reading.formatVersion, version).not.toBe('newerThanKnown')
    }
  })
})

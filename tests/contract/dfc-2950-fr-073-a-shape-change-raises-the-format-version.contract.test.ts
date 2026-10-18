// DFC-2950 / JDG-2446: a change to the document shape raises the format version (FR-073, DR-4 of table T-052, Chapter 6.2).

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { validateDocument } from '../fixtures/grs-document'
import { specTable, unbroken } from './spec-table'

const READ = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')

const REQUIREMENTS = unbroken(READ('docs', 'spec', '01-04-requirements.md'))
const DESIGN = unbroken(READ('docs', 'spec', '05-07-design.md'))

// WHY: each clause is cut from the manuscript as check 39 reads it, ending right before its (MUST) marker.
const FR_073_RAISE_TO_INSTANT = '変える変更は、形式の版を、その変更を当てる時刻へ上げること'
const FR_073_RAISE_TO_INSTANT_WITH_MARKER = `${FR_073_RAISE_TO_INSTANT}（MUST）`
const FR_073_FORM = '書式は RFC 3339 の UTC の `YYYY-MM-DDTHH:MM:SSZ` とすること（MUST）'
const FR_073_STRING_ORDER = '判別は文字列の大小で行うこと（MUST）'
const FR_073_ONE_RAISE_PER_CR = '1 つの変更要求の中で版を上げるのは 1 度だけとする'
const FR_073_NO_LEDGER_ROW_BEFORE_USE = '⛔ 公式運用の前は、台帳に行を足してはならない（MUST NOT）'
const CH_6_2_VERSION_CONST = '⭐ `schemaVersion` は、その造りの版を `const` で言うこと（MUST）'
const CH_6_2_LEDGER_EMPTY_BEFORE_USE = '⚠️ 公式運用の前（`S-541` が `null`）は、台帳は空の配列である'

const SCHEMA = JSON.parse(READ('docs', 'spec', '_source', 'grs-document.schema.json')) as Record<string, any>
const ERD = JSON.parse(READ('docs', 'spec', '_source', 'erd.json')) as Record<string, any>

const SCHEMA_VERSION = String(SCHEMA['properties']['schemaVersion']['const'])
const INSTANT_FORM = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/

// WHY: key order of an object carries no meaning, the order of an array does (a column's place, an entity's place).
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, one]) => `${JSON.stringify(key)}:${canonical(one)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// WHY: a default only fills a missing key and every key is written (FR-024), so a default never changes which documents are valid.
const NOT_SHAPE_JSON_KEYS: readonly string[] = ['default', 'defaultFrom']

function shapeJson(json: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(json).filter(([key]) => !NOT_SHAPE_JSON_KEYS.includes(key)))
}

// WHY: only what decides which documents are valid (table T-058 columns, table T-052 keys) is fingerprinted; prose is left out.
function shapeOf(erd: Record<string, any>): unknown {
  const boxes: Record<string, any>[] = erd['container']['boxes']
  const rootKeys = boxes.map((box) => ({
    box: box['id'],
    entity: box['entity'] ?? null,
    keys: (box['rows'] ?? []).map((row: unknown[]) => [row[0], row[1]]),
    members: (box['entity_rows'] ?? []).map((row: unknown[]) => [row[0], row[1], row[2]]),
  }))
  const entities = (erd['entities'] as Record<string, any>[]).map((entity) => ({
    name: entity['name'],
    carry: entity['carry'],
    columns: (entity['columns'] as Record<string, any>[]).map((column) => ({
      name: column['name'],
      key: column['key'],
      json: shapeJson(column['json']),
    })),
  }))
  return { rootKeys, entities }
}

function fingerprintOf(erd: Record<string, any>): string {
  return createHash('sha256').update(canonical(shapeOf(erd))).digest('hex')
}

function cloneErd(): Record<string, any> {
  return JSON.parse(JSON.stringify(ERD)) as Record<string, any>
}

// WHY: newest last. Raising the version AND changing the shape means adding one pair; a pair is never edited or removed.
const VERSION_FINGERPRINTS: readonly { readonly version: string; readonly fingerprint: string }[] = [
  { version: '2026-10-16T12:35:39Z', fingerprint: '2c273409e5b2234e4d63cdf9a06dcdef8c6e1f28b40b90495fe35409e29795bb' },
  { version: '2026-10-17T15:27:48Z', fingerprint: '81b900632ae4d04a207af1bc827cfefe7709e4961f65700f4a80e0fc56395781' },
  { version: '2026-10-18T23:17:29Z', fingerprint: '8c8e8b47321550afe822dc1ec9a25990df1b078f9a4d0a7db007dbcba07cfe92' },
]

const NEWEST = VERSION_FINGERPRINTS[VERSION_FINGERPRINTS.length - 1]!

const RAISE_MESSAGE =
  'FR-073 / DR-4: a change to the document shape (the columns of table T-058, the keys of table T-052) must raise the ' +
  'format version. Raise SCHEMA_VERSION to the instant the change lands, regenerate (npm run gen), and add one ' +
  '{ version, fingerprint } pair at the end of VERSION_FINGERPRINTS in this file.'

const CURRENT_DOCUMENTS: readonly (readonly string[])[] = [
  ['src', 'framework', 'single-html-shell', 'startup-template.json'],
  ['src', 'framework', 'single-html-shell', 'empty-document.json'],
  ['sample-schedule', 'Three-Year Product Plan.json'],
  ['docs', 'about', 'samples', 'sample-large-erp-program.en.json'],
  ['docs', 'about', 'samples', 'sample-large-erp-program.ja.json'],
  ['docs', 'guides', 'schedule-to-grs-json', 'grs-skeleton.json'],
  ['tests', 'fixtures', 'measuring-document.json'],
  ['docs', 'development-records', 'project-plan.json'],
  ['docs', 'development-records', 'previous-plan.json'],
]

describe('DFC-2950 the clauses these cases hold are the manuscript words', () => {
  it.each([
    FR_073_RAISE_TO_INSTANT_WITH_MARKER,
    FR_073_FORM,
    FR_073_STRING_ORDER,
    FR_073_ONE_RAISE_PER_CR,
    FR_073_NO_LEDGER_ROW_BEFORE_USE,
  ])('01-04 FR-073 still says it: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([CH_6_2_VERSION_CONST, CH_6_2_LEDGER_EMPTY_BEFORE_USE])('05-07 Chapter 6.2 still says it: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })

  it('FR-073 / DR-4: table T-052 row DR-4 is the one place of the version and names schemaVersion', () => {
    const row = specTable('T-052').rows.find((one) => one.id === 'DR-4')
    expect(row, 'table T-052 has row DR-4').toBeDefined()
    expect((row?.cells ?? []).join(' ')).toContain('schemaVersion')
  })
})

describe(`FR-073 -- ${FR_073_RAISE_TO_INSTANT}`, () => {
  it('FR-073 / DR-4: the schemaVersion const of the schema is an RFC 3339 UTC instant of exactly 20 characters', () => {
    expect(SCHEMA_VERSION).toHaveLength(20)
    expect(SCHEMA_VERSION).toMatch(INSTANT_FORM)
    expect(Number.isNaN(Date.parse(SCHEMA_VERSION)), 'a real instant').toBe(false)
    expect(new Date(Date.parse(SCHEMA_VERSION)).toISOString().replace(/\.000Z$/, 'Z')).toBe(SCHEMA_VERSION)
  })

  it('FR-073: before official use (S-541 null) the published ledger x-grsChanges is empty', () => {
    expect(SCHEMA['x-grsChanges']).toEqual([])
  })

  it.each(CURRENT_DOCUMENTS.map((parts) => [parts.join('/'), parts] as const))(
    'FR-073 / DR-4: %s carries the build version and validates against the schema',
    (_name, parts) => {
      const document = JSON.parse(READ(...parts)) as Record<string, unknown>
      expect(document['schemaVersion']).toBe(SCHEMA_VERSION)
      const result = validateDocument(document)
      expect(result.errors).toEqual([])
      expect(result.valid).toBe(true)
    },
  )

  it('FR-073 / DR-4: the manifest of the startup template names the same version', () => {
    const manifest = JSON.parse(READ('src', 'framework', 'single-html-shell', 'startup-template-manifest.json')) as Record<
      string,
      unknown
    >
    expect(manifest['schemaVersion']).toBe(SCHEMA_VERSION)
  })
})

describe(`FR-073 -- a shape change raises the version (${FR_073_RAISE_TO_INSTANT_WITH_MARKER})`, () => {
  it('FR-073: the pairs are in the instant form and strictly ascending, so the newest is last', () => {
    expect(VERSION_FINGERPRINTS.length).toBeGreaterThan(0)
    for (const pair of VERSION_FINGERPRINTS) expect(pair.version).toMatch(INSTANT_FORM)
    const versions = VERSION_FINGERPRINTS.map((pair) => pair.version)
    expect(versions).toEqual([...versions].sort())
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('FR-073 / DR-4: the version of the schema has its pair, and it is the newest one', () => {
    const own = VERSION_FINGERPRINTS.find((pair) => pair.version === SCHEMA_VERSION)
    expect(
      own,
      `the version ${SCHEMA_VERSION} has no { version, fingerprint } pair. ${RAISE_MESSAGE}`,
    ).toBeDefined()
    expect(NEWEST.version, `the newest pair must be the version of the schema. ${RAISE_MESSAGE}`).toBe(SCHEMA_VERSION)
  })

  it('FR-073 / DR-4: while the version equals the newest pair, the shape fingerprint equals its fingerprint', () => {
    // STEP: only the case "version unchanged" is judged here; a changed version is the case above.
    if (SCHEMA_VERSION !== NEWEST.version) return
    expect(fingerprintOf(ERD), `the shape changed and the version did not. ${RAISE_MESSAGE}`).toBe(NEWEST.fingerprint)
  })

  describe('control: the fingerprint moves with every part of the shape and with nothing else', () => {
    const base = fingerprintOf(ERD)

    it('FR-073: the same manuscript gives the same fingerprint', () => {
      expect(fingerprintOf(cloneErd())).toBe(base)
    })

    it('FR-073: removing one column changes it', () => {
      const copy = cloneErd()
      copy['entities'][1]['columns'].pop()
      expect(fingerprintOf(copy)).not.toBe(base)
    })

    it('FR-073: renaming a column, swapping two columns or adding an entity changes it', () => {
      const renamed = cloneErd()
      renamed['entities'][0]['columns'][1]['name'] = 'renamedColumn'
      expect(fingerprintOf(renamed)).not.toBe(base)
      const swapped = cloneErd()
      const columns = swapped['entities'][0]['columns']
      ;[columns[1], columns[2]] = [columns[2], columns[1]]
      expect(fingerprintOf(swapped)).not.toBe(base)
      const added = cloneErd()
      added['entities'].push({ ...added['entities'][0], name: 'AddedEntity' })
      expect(fingerprintOf(added)).not.toBe(base)
    })

    it('FR-073: changing a null flag, a kind, an enum value list or a key column of table T-058 changes it', () => {
      const nullFlag = cloneErd()
      nullFlag['entities'][0]['columns'][1]['json']['null'] = !nullFlag['entities'][0]['columns'][1]['json']['null']
      expect(fingerprintOf(nullFlag)).not.toBe(base)
      const kind = cloneErd()
      kind['entities'][0]['columns'][1]['json']['kind'] = 'number'
      expect(fingerprintOf(kind)).not.toBe(base)
      const values = cloneErd()
      const withValues = (values['entities'] as Record<string, any>[])
        .flatMap((entity) => entity['columns'] as Record<string, any>[])
        .find((column) => Array.isArray(column['json']['values']))
      withValues!['json']['values'].push('addedValue')
      expect(fingerprintOf(values)).not.toBe(base)
      const key = cloneErd()
      key['entities'][0]['columns'][1]['key'] = 'PK'
      expect(fingerprintOf(key)).not.toBe(base)
    })

    it('FR-073 / DR-4: adding a root key of table T-052 changes it', () => {
      const copy = cloneErd()
      copy['container']['boxes'][0]['rows'].push(['文字列', 'addedRootKey', { ja: 'x' }])
      expect(fingerprintOf(copy)).not.toBe(base)
    })

    it('FR-073: prose, defaults and seat numbers do not change it', () => {
      const copy = cloneErd()
      copy['entities'][0]['description'] = { ja: 'edited prose' }
      copy['entities'][0]['columns'][1]['meaning'] = { ja: 'edited prose' }
      copy['entities'][0]['columns'][1]['seat'] = 9999
      copy['entities'][0]['columns'][1]['json']['default'] = 'x'
      expect(fingerprintOf(copy)).toBe(base)
    })

    it('FR-073: the guard goes red on a changed shape under an unchanged version', () => {
      const copy = cloneErd()
      copy['entities'][1]['columns'].pop()
      // STEP: the version is the newest pair's, the shape is not its shape: this is the red case.
      expect(fingerprintOf(copy)).not.toBe(NEWEST.fingerprint)
    })
  })
})

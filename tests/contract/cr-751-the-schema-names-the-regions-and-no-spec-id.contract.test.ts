// CR-751 (spec-only): the generated schema states the T-376 regions as enums, the S-582 span limit as maxItems, the minute-level reading, and names no specification ID (Chapter 6.2, JDG-2039).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { settingNumber } from '../fixtures/setting-number'
import { bare, specTable } from './spec-table'

type Json = Record<string, any>

const SOURCE = join(process.cwd(), 'docs', 'spec', '_source')
const SCHEMA = JSON.parse(readFileSync(join(SOURCE, 'grs-document.schema.json'), 'utf8')) as Json
const DEFS = SCHEMA['$defs'] as Json
const SETTINGS = SCHEMA['properties']['documentSettings']['properties'] as Json

// see T-376
// WHY: CR-755 -- the values are the table's keys; the base keys take the standard-time rows only.
const T376 = specTable('T-376')
const REGIONS: readonly string[] = T376.rows.map((row) => bare(row.by['鍵'] ?? ''))
const STANDARD_KEYS: readonly string[] = T376.rows.filter((row) => row.by['種'] === '標準時').map((row) => bare(row.by['鍵'] ?? ''))

// see FR-156, S-574, S-575
const REGION_KEYS: readonly (readonly [string, Json, readonly string[]])[] = [
  ['Project.scheduleDataTimeZone', DEFS['Project']['properties']['scheduleDataTimeZone'], STANDARD_KEYS],
  ['documentSettings.viewTimeZone', SETTINGS['viewTimeZone'], STANDARD_KEYS],
  ['documentSettings.displayTimeZones items', SETTINGS['displayTimeZones']['items'], REGIONS],
]

const PREFIX_SOURCE = JSON.parse(readFileSync(join(SOURCE, 'row-id-prefixes.json'), 'utf8')) as Json
const REQUIREMENT_AND_TABLE_PREFIXES = ['FR', 'NFR', 'UC', 'T', 'F', 'DOC']
const PREFIXES: readonly string[] = [
  ...(PREFIX_SOURCE['prefixes'] as Json[]).map((one) => String(one['prefix'])),
  ...REQUIREMENT_AND_TABLE_PREFIXES,
]
const SPEC_ID = new RegExp(`\\b(?:${PREFIXES.join('|')})-\\d+[a-z]?\\b`)

function descriptionsOf(node: unknown, at: string, out: (readonly [string, string])[]): (readonly [string, string])[] {
  if (Array.isArray(node)) {
    node.forEach((one, i) => descriptionsOf(one, `${at}/${i}`, out))
  } else if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Json)) {
      if (key === 'description' && typeof value === 'string') out.push([at, value])
      else descriptionsOf(value, `${at}/${key}`, out)
    }
  }
  return out
}

describe('premise', () => {
  it('T-376 names 39 keys, 27 of them standard time (CR-755); the schema root has a description', () => {
    expect(REGIONS).toHaveLength(39)
    expect(STANDARD_KEYS).toHaveLength(27)
    expect(typeof SCHEMA['description']).toBe('string')
  })

  it('the ID pattern catches the IDs it must refuse', () => {
    for (const id of ['FR-156', 'T-376', 'S-128', 'RS-25', 'IV-24', 'ZN-47', 'AT-157', 'OP-6', 'S-582']) {
      expect(SPEC_ID.test(`see ${id} here`), id).toBe(true)
    }
  })
})

// see FR-156, T-376, S-574, S-575
describe('JDG-2039 / Chapter 6.2: the region keys enumerate the T-376 regions in table order', () => {
  it.each(REGION_KEYS.map(([name, node, keys]) => [name, node, keys] as const))('%s enumerates exactly its T-376 keys, in order', (_name, node, keys) => {
    const values = (node['enum'] ?? []) as unknown[]
    expect(values.filter((one) => one !== null)).toEqual(keys)
  })

  it('Project.scheduleDataTimeZone takes no null (FR-156: a value outside T-376 is refused)', () => {
    const node = DEFS['Project']['properties']['scheduleDataTimeZone']
    expect(node['enum']).not.toContain(null)
    expect([node['type']].flat()).not.toContain('null')
  })

  it('documentSettings.viewTimeZone also takes null (S-574: a region or null), defaulting to null', () => {
    expect(SETTINGS['viewTimeZone']['enum']).toContain(null)
    expect(SETTINGS['viewTimeZone']['default']).toBe(null)
  })

  it('documentSettings.displayTimeZones is an array of at most 4 regions, defaulting to [] (S-575: 0 to 4)', () => {
    expect(SETTINGS['displayTimeZones']['type']).toBe('array')
    expect(SETTINGS['displayTimeZones']['maxItems']).toBe(4)
    expect(SETTINGS['displayTimeZones']['default']).toEqual([])
  })

  it('the $comment no longer lists viewTimeZone among the keys left unconstrained (Chapter 6.2: the generated file says what it widened)', () => {
    expect(String(SCHEMA['$comment'])).not.toMatch(/unconstrained[^.]*viewTimeZone/)
  })
})

// see S-582, IV-24
describe('S-582: the span limit is printed as maxItems on both workingTimes arrays', () => {
  const S_582 = settingNumber('S-582')
  it.each([
    ['WeekDay.workingTimes', DEFS['WeekDay']['properties']['workingTimes']],
    ['Exception.workingTimes', DEFS['Exception']['properties']['workingTimes']],
  ])('%s has maxItems equal to S-582', (_name, node) => {
    expect(node['type']).toBe('array')
    expect(node['maxItems']).toBe(S_582)
  })
})

// see FR-054, FR-024
describe('Chapter 6.2: the root description states the minute-level reading, not the day-only one', () => {
  const root = String(SCHEMA['description'])

  it('it no longer says GRS uses only the day, nor that a last day is included', () => {
    expect(root).not.toMatch(/only their day/i)
    expect(root).not.toMatch(/last day \([^)]*\) is included/i)
  })

  it('it names the schedule data time zone, minute reading, no offset shift, and UTC for record instants (Chapter 6.2: says why the kinds of time differ)', () => {
    expect(root).toContain('scheduleDataTimeZone')
    expect(root).toMatch(/minute/i)
    expect(root).toMatch(/offset/i)
    expect(root).toMatch(/UTC/)
  })
})

describe('Chapter 6.2: no description in the schema names a specification ID', () => {
  const found = descriptionsOf(SCHEMA, '', []).filter(([, text]) => SPEC_ID.test(text))

  it('there are descriptions to look at', () => {
    expect(descriptionsOf(SCHEMA, '', []).length).toBeGreaterThan(10)
  })

  it('no description holds an ID of a registered prefix, a requirement or a table', () => {
    expect(found.map(([at, text]) => `${at}: ${text.match(SPEC_ID)?.[0]}`)).toEqual([])
  })
})

// CR-822 / JDG-2986: a change to the Agent API call shapes raises the Agent API version (AG-1 of table T-035).

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from './spec-table'

const READ = (...parts: string[]): string => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')

const MEMBERS = JSON.parse(READ('docs', 'spec', '_source', 'agent-api-members.json')) as Record<string, any>
const REQUIREMENTS = unbroken(READ('docs', 'spec', '01-04-requirements.md'))
const VERSION_TABLE = unbroken(READ('docs', 'development-rules', '10-versions.md'))

const AG_1_PROMISE = '版を持ち、呼び方が変われば、版はそれまでのどの版よりも新しい時刻になること。'
const TABLE_ANY_CHANGE = '呼び方が少しでも変われば上げる'

const AGENT_API_VERSION = String(MEMBERS['version'])
const INSTANT_FORM = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/

// WHY: only what a caller depends on is fingerprinted -- names, kinds, arguments, return and value types.
// Row IDs, groups, purity and every prose cell (meaning, carries, source, label) are left out.
const NOT_CALL_SHAPE_KEYS: readonly string[] = ['id', 'group', 'purity', 'carries', 'source', 'meaning', 'label']

function callShapeOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(callShapeOf)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !NOT_CALL_SHAPE_KEYS.includes(key))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return Object.fromEntries(entries.map(([key, one]) => [key, callShapeOf(one)]))
  }
  return value
}

function fingerprintOf(members: Record<string, any>): string {
  const shape = { members: callShapeOf(members['members']['rows']), values: callShapeOf(members['values']['rows']) }
  return createHash('sha256').update(JSON.stringify(shape)).digest('hex')
}

function cloneMembers(): Record<string, any> {
  return JSON.parse(JSON.stringify(MEMBERS)) as Record<string, any>
}

// WHY: newest last. Raising the version AND changing a call shape means adding one pair; a pair is never edited or removed.
const VERSION_FINGERPRINTS: readonly { readonly version: string; readonly fingerprint: string }[] = [
  { version: '2026-10-19T01:15:00Z', fingerprint: '0d2545fc877844506b3d60d527b9eb1263357c1f6ae20891d8fb984d50367e65' },
]

const NEWEST = VERSION_FINGERPRINTS[VERSION_FINGERPRINTS.length - 1]!

const RAISE_MESSAGE =
  'AG-1: a change to the Agent API call shapes (tables T-107 and T-400) must raise the Agent API version. Set "version" ' +
  'in docs/spec/_source/agent-api-members.json to the instant the change lands, regenerate (npm run gen), and add one ' +
  '{ version, fingerprint } pair at the end of VERSION_FINGERPRINTS in this file (docs/development-rules/10-versions.md).'

describe('CR-822 the clauses these cases hold are the words of the specification and the version table', () => {
  it('AG-1 of table T-035 still makes the promise', () => {
    expect(REQUIREMENTS).toContain(AG_1_PROMISE)
  })

  it('the version table still says any call-shape change raises the version', () => {
    expect(VERSION_TABLE).toContain(TABLE_ANY_CHANGE)
  })
})

describe('AG-1 -- a call-shape change raises the Agent API version', () => {
  it('AG-1: the version is an RFC 3339 UTC instant of exactly 20 characters', () => {
    expect(AGENT_API_VERSION).toMatch(INSTANT_FORM)
    expect(new Date(Date.parse(AGENT_API_VERSION)).toISOString().replace(/\.000Z$/, 'Z')).toBe(AGENT_API_VERSION)
  })

  it('AG-1: the pairs are in the instant form and strictly ascending, so the newest is last', () => {
    const versions = VERSION_FINGERPRINTS.map((pair) => pair.version)
    for (const version of versions) expect(version).toMatch(INSTANT_FORM)
    expect(versions).toEqual([...versions].sort())
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('AG-1: the version of the manuscript has its pair, and it is the newest one', () => {
    expect(NEWEST.version, `the newest pair must be the version of the manuscript. ${RAISE_MESSAGE}`).toBe(AGENT_API_VERSION)
  })

  it('AG-1: while the version equals the newest pair, the call-shape fingerprint equals its fingerprint', () => {
    expect(fingerprintOf(MEMBERS), `the call shapes changed and the version did not. ${RAISE_MESSAGE}`).toBe(NEWEST.fingerprint)
  })

  describe('control: the fingerprint moves with every part of a call shape and with nothing else', () => {
    const base = fingerprintOf(MEMBERS)

    it('renaming a member, an argument or a value field changes it', () => {
      const member = cloneMembers()
      member['members']['rows'][0]['name'] = 'renamedMember'
      expect(fingerprintOf(member)).not.toBe(base)
      const argument = cloneMembers()
      const withArgument = (argument['members']['rows'] as Record<string, any>[]).find((row) => row['arguments'].length > 0)!
      withArgument['arguments'][0]['name'] = 'renamedArgument'
      expect(fingerprintOf(argument)).not.toBe(base)
      const field = cloneMembers()
      field['values']['rows'][0]['fields'][0]['name'] = 'renamedField'
      expect(fingerprintOf(field)).not.toBe(base)
    })

    it('changing a return type or an argument type changes it', () => {
      const returns = cloneMembers()
      returns['members']['rows'][0]['returns'] = 'number'
      expect(fingerprintOf(returns)).not.toBe(base)
      const type = cloneMembers()
      const withArgument = (type['members']['rows'] as Record<string, any>[]).find((row) => row['arguments'].length > 0)!
      withArgument['arguments'][0]['type'] = 'unknown'
      expect(fingerprintOf(type)).not.toBe(base)
    })

    it('rewording a meaning, a description, a group or a row ID leaves it alone', () => {
      const prose = cloneMembers()
      const row = prose['members']['rows'][0]
      row['carries'] = { ja: ['別の説明'], en: ['another description'] }
      row['group'] = { ja: '別の群' }
      row['id'] = 'another-row-id'
      prose['values']['rows'][0]['fields'][0]['meaning'] = { ja: '別の意味' }
      expect(fingerprintOf(prose)).toBe(base)
    })
  })
})

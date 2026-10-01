// CR-607 wave 4: table T-345 against clearBrowserStoredForReset of UF-159.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as storedValues from '../../src/framework/single-html-shell/browser-stored-values'
import { specTable, unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_153_ONLY_WHAT_T_345_CLEARS =
  '続けると答えられたときに消すのは、`localStorage` の `GRS` の鍵のうち、表 T-345 が「消す」とするものだけとすること（MUST）'
const FR_153_NEVER_WHOLE = '⛔ `localStorage` をまるごと消してはならない（MUST NOT）'
const UF_159_CLEARS_BY_PREFIX = '消すときも、共通の接頭辞で `GRS` の鍵を見分け、ほかの鍵に触れない（同表の `WP-6`）'
const UF_159_SILENT = '鍵に共通の接頭辞を付け、読めない値は無いものとし、書けないときは何もしない。'

const T_345 = specTable('T-345')

type StoredRow = Parameters<typeof storedValues.writeBrowserStored>[0]

const ROWS_OF_T_206: readonly StoredRow[] = ['S-99', 'S-99a', 'S-99b', 'S-99c']

function resetCellFor(row: StoredRow): string {
  const found = T_345.rows.find((one) => new RegExp(`\`${row}\``).test(one.by['何か'] ?? ''))
  if (found === undefined) throw new Error(`table T-345 has no row naming ${row}`)
  return (found.by['リセットで'] ?? '').trim()
}

function resetCellOfRow(id: string): string {
  const found = T_345.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table T-345 has no row ${id}`)
  return (found.by['リセットで'] ?? '').trim()
}

const CLEARS = '消す'
const KEEPS = '残す'
const UNTOUCHED = '触れない'

interface RecordingStorage {
  readonly storage: Storage
  readonly calls: string[]
  readonly held: Map<string, string>
}

function recordingStorage(seed: Readonly<Record<string, string>> = {}): RecordingStorage {
  const held = new Map<string, string>(Object.entries(seed))
  const calls: string[] = []
  const methods = {
    getItem: (key: string): string | null => {
      calls.push(`getItem ${key}`)
      return held.has(key) ? (held.get(key) ?? null) : null
    },
    setItem: (key: string, value: string): void => {
      calls.push(`setItem ${key}`)
      held.set(String(key), String(value))
    },
    removeItem: (key: string): void => {
      calls.push(`removeItem ${key}`)
      held.delete(key)
    },
    key: (index: number): string | null => [...held.keys()][index] ?? null,
    clear: (): void => {
      calls.push('clear')
      held.clear()
    },
  }
  const storage = new Proxy(methods as unknown as Storage, {
    get(target, property, receiver): unknown {
      if (property === 'length') return held.size
      if (typeof property === 'string' && !(property in target) && held.has(property)) return held.get(property)
      return Reflect.get(target, property, receiver)
    },
    set(_target, property, value): boolean {
      calls.push(`setItem ${String(property)}`)
      held.set(String(property), String(value))
      return true
    },
    deleteProperty(_target, property): boolean {
      calls.push(`removeItem ${String(property)}`)
      held.delete(String(property))
      return true
    },
    ownKeys: (): string[] => [...held.keys()],
    getOwnPropertyDescriptor(_target, property): PropertyDescriptor | undefined {
      if (typeof property === 'string' && held.has(property)) {
        return { value: held.get(property), enumerable: true, configurable: true, writable: true }
      }
      return undefined
    },
    has: (target, property): boolean =>
      (typeof property === 'string' && held.has(property)) || property in target,
  })
  return { storage, calls, held }
}

const SCOPE = globalThis as unknown as Record<string, unknown>
const SAVED = {
  localStorage: Object.getOwnPropertyDescriptor(globalThis, 'localStorage'),
  sessionStorage: Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage'),
}

function install(name: 'localStorage' | 'sessionStorage', descriptor: PropertyDescriptor): void {
  Object.defineProperty(globalThis, name, { configurable: true, ...descriptor })
}

function restore(name: 'localStorage' | 'sessionStorage'): void {
  const saved = SAVED[name]
  if (saved === undefined) delete SCOPE[name]
  else Object.defineProperty(globalThis, name, saved)
}

afterEach(() => {
  restore('localStorage')
  restore('sessionStorage')
})

function learnedKeys(): Readonly<Record<StoredRow, string>> {
  const probe = recordingStorage()
  install('localStorage', { value: probe.storage, writable: true })
  const keys: Partial<Record<StoredRow, string>> = {}
  for (const row of ROWS_OF_T_206) {
    const before = probe.held.size
    storedValues.writeBrowserStored(row, `value of ${row}`)
    const written = [...probe.held.keys()].slice(before)
    if (written.length !== 1) {
      throw new Error(`premise: writeBrowserStored(${row}) wrote ${written.length} keys, not one`)
    }
    keys[row] = written[0] ?? ''
  }
  restore('localStorage')
  return keys as Record<StoredRow, string>
}

function commonPrefix(keys: readonly string[]): string {
  const first = keys[0] ?? ''
  let length = first.length
  for (const one of keys) {
    let at = 0
    while (at < length && at < one.length && one[at] === first[at]) at += 1
    length = at
  }
  return first.slice(0, length)
}

const KEYS = learnedKeys()
const PREFIX = commonPrefix(ROWS_OF_T_206.map((row) => KEYS[row]))

const STALE_GRS_KEY = `${PREFIX}retiredByAnEarlierVersion`
const FOREIGN_KEYS: Readonly<Record<string, string>> = {
  'another-page.setting': 'kept',
  theme: 'dark',
}

function seededStorage(): RecordingStorage {
  const seed: Record<string, string> = { ...FOREIGN_KEYS, [STALE_GRS_KEY]: 'stale' }
  for (const row of ROWS_OF_T_206) seed[KEYS[row]] = `value of ${row}`
  return recordingStorage(seed)
}

function clearForReset(): () => void {
  const found = (storedValues as unknown as Record<string, unknown>)['clearBrowserStoredForReset']
  if (typeof found !== 'function') {
    throw new Error(
      'browser-stored-values.ts exports no clearBrowserStoredForReset() -- CR-607 section 9 gives UF-159 ' +
        'the removal of the keys table T-345 clears (FR-153), and nothing removes them yet',
    )
  }
  return found as () => void
}

const MUTATING = /^(setItem|removeItem|clear)\b/

describe('CR-607 -- the manuscript still says what these cases read', () => {
  it.each([FR_153_ONLY_WHAT_T_345_CLEARS, FR_153_NEVER_WHOLE])('FR-153: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([UF_159_CLEARS_BY_PREFIX, UF_159_SILENT])('UF-159: %s', (clause) => {
    expect(DESIGN).toContain(clause)
  })

  it('table T-345 still holds WP-1..WP-9, clears S-99/S-99a/S-99b and keeps S-99c', () => {
    expect(T_345.rows.map((one) => one.id)).toEqual(['WP-1', 'WP-2', 'WP-3', 'WP-4', 'WP-5', 'WP-6', 'WP-7', 'WP-8', 'WP-9'])
    expect(ROWS_OF_T_206.map((row) => [row, resetCellFor(row)])).toEqual([
      ['S-99', CLEARS],
      ['S-99a', CLEARS],
      ['S-99b', CLEARS],
      ['S-99c', KEEPS],
    ])
    expect(resetCellOfRow('WP-5')).toBe(CLEARS)
    expect(resetCellOfRow('WP-6')).toBe(UNTOUCHED)
    expect(resetCellOfRow('WP-7')).toBe(UNTOUCHED)
  })

  it('premise: the four keys share a non-empty prefix and are four different keys', () => {
    expect(PREFIX.length).toBeGreaterThan(0)
    expect(new Set(Object.values(KEYS)).size).toBe(ROWS_OF_T_206.length)
    for (const key of Object.keys(FOREIGN_KEYS)) expect(key.startsWith(PREFIX)).toBe(false)
  })
})

describe(`FR-153 "${FR_153_ONLY_WHAT_T_345_CLEARS}"`, () => {
  let local: RecordingStorage
  let session: RecordingStorage

  beforeEach(() => {
    local = seededStorage()
    session = recordingStorage({ [KEYS['S-99']]: 'session value', other: 'x' })
    install('localStorage', { value: local.storage, writable: true })
    install('sessionStorage', { value: session.storage, writable: true })
  })

  it.each(ROWS_OF_T_206)('the key of %s follows the 「リセットで」 cell of its T-345 row', (row) => {
    clearForReset()()
    const isKept = resetCellFor(row) === KEEPS
    expect(local.held.has(KEYS[row]), `${row} is "${resetCellFor(row)}" in table T-345`).toBe(isKept)
    if (isKept) expect(local.held.get(KEYS[row])).toBe(`value of ${row}`)
  })

  it('WP-5: a GRS key no row of table T-206 names is cleared too', () => {
    clearForReset()()
    expect(local.held.has(STALE_GRS_KEY)).toBe(false)
  })

  it('WP-6: every key without the GRS prefix stays, with its value', () => {
    clearForReset()()
    for (const [key, value] of Object.entries(FOREIGN_KEYS)) {
      expect(local.held.get(key), key).toBe(value)
    }
  })

  it(`"${FR_153_NEVER_WHOLE}" -- clear() is never called`, () => {
    clearForReset()()
    expect(local.calls).not.toContain('clear')
  })

  it('what is left is exactly the S-99c key and the foreign keys', () => {
    clearForReset()()
    expect([...local.held.keys()].sort()).toEqual([KEYS['S-99c'], ...Object.keys(FOREIGN_KEYS)].sort())
  })

  it('WP-6 / WP-4: the only writes are removals of GRS keys other than the S-99c key', () => {
    clearForReset()()
    const writes = local.calls.filter((one) => MUTATING.test(one))
    expect(writes.length).toBeGreaterThan(0)
    for (const one of writes) {
      expect(one, 'only removals').toMatch(/^removeItem /)
      const key = one.slice('removeItem '.length)
      expect(key.startsWith(PREFIX), `${key} is not a GRS key (WP-6)`).toBe(true)
      expect(key, 'the S-99c key is kept (WP-4)').not.toBe(KEYS['S-99c'])
    }
  })

  it('WP-7: sessionStorage is not touched', () => {
    clearForReset()()
    expect(session.calls.filter((one) => MUTATING.test(one))).toEqual([])
    expect(session.held.get(KEYS['S-99'])).toBe('session value')
  })
})

describe(`UF-159 "${UF_159_SILENT}" -- a storage that throws is skipped silently`, () => {
  it('a host whose localStorage cannot even be reached', () => {
    const clear = clearForReset()
    install('localStorage', {
      get: (): never => {
        throw new Error('SecurityError: the host refuses localStorage')
      },
    })
    expect(() => clear()).not.toThrow()
  })

  it('a host whose every Storage method throws', () => {
    const clear = clearForReset()
    const refusing = (): never => {
      throw new Error('the host refuses this call')
    }
    install('localStorage', {
      value: {
        getItem: refusing,
        setItem: refusing,
        removeItem: refusing,
        key: refusing,
        clear: refusing,
        get length(): number {
          return refusing()
        },
      },
      writable: true,
    })
    expect(() => clear()).not.toThrow()
  })
})

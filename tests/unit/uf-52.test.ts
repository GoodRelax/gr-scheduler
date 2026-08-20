// Unit tests for UF-52 `local-storage-document-store.ts` -- table T-075 of
// docs/spec/05-07-design.md, component `LocalStorageDocumentStore` (CP-29 of
// table T-062), published as PI-29 of table T-064, implementing IF-4 of table
// T-065.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, section 1). What was read: docs/spec/ for every rule
// below, the seam this unit realises (src/adapter/autosave-gateway/
// document-store.ts, published by the component that declares it), and of the
// unit itself only its head comment, its published types (`WebStorage`,
// `LocalStorageDocumentStore`), its published constant
// (`WEB_STORAGE_KEY_PREFIX`) and the one signature
// `localStorageDocumentStore(reachWebStorage: () => WebStorage | null)`.
// Every expected value here comes from a requirement or a table, never from the
// implementation -- the key an entry stands under is learnt by watching what the
// unit hands the host, never by copying a constant out of it.
//
// ⭐ THIS IS A FRAMEWORK UNIT and these cases run on node with no DOM. That is
// possible only because the host ARRIVES (R7.3): the unit takes a function that
// yields the store, so a fake with three members drives it. ⛔ The fake is not
// allowed to become the test (R6.3) -- the cases below assert what the unit DID
// to the fake (which member, in what order, with what argument, and what stands
// in the place afterwards), not merely that some value came back.
//
// The rules these cases answer to:
//   IO-5 of table T-024   the one row that names where an autosave goes --
//                         `localStorage` -- and calls what comes back out
//                         untrusted input. So this unit moves text and never
//                         reads into it.
//   FR-026                MUST NOT drop a stored snapshot in silence; its
//                         RATIONALE puts a prefix of this tool's own on the
//                         keys and MUST NOT put secrets in the place.
//   FR-061                MUST NOT let two documents' autosaves be taken for
//                         one another.
//   FR-062 + table T-034  BT-3 is the autosaved document; the closing note
//                         tells the person about a broken one and then SETS IT
//                         ASIDE -- neither discarded nor left standing.
//   LM-4 / LM-6 / LM-14   of table T-004: a reachable ceiling, a place every
//                         local page on the machine shares, and a browser that
//                         refuses the store outright.
//   NT-6 / NT-3a of T-037 telling the person the ceiling was reached is a MUST,
//                         which is why the two fault codes are told apart.
//   FR-028                a failure is a VALUE; nothing throws across here.
//   T-211 (S-112)         the only ceiling FR-026 has is the idle boundary, and
//                         the shell counts it (FT-4 of table T-078). Nothing
//                         sets a ceiling on the store, so a size limit can only
//                         arrive as the host's own refusal.
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one test walking every row.
// T_004_LIMITS, T_034_STARTUP, T_034_LOSER and STORE_FAULT_CODES below are
// those copies.
//
// ⚠️ TWO OF THE FAILURE SHAPES A FRAMEWORK UNIT USUALLY HAS DO NOT EXIST HERE.
// IF-4 is synchronous and asks the person for nothing, so there is no promise
// to reject and no dialog to cancel. The shapes that do exist -- the API absent,
// the host refusing, the ceiling reached, a member throwing synchronously --
// are each driven below, and each is asserted to come back as a value.

import { describe, expect, it } from 'vitest'

import type {
  SnapshotReadOutcome,
  SnapshotWriteOutcome,
  StoreFaultCode,
} from '../../src/adapter/autosave-gateway/autosave-gateway'
import {
  localStorageDocumentStore,
  WEB_STORAGE_KEY_PREFIX,
  type LocalStorageDocumentStore,
  type WebStorage,
} from '../../src/framework/local-storage-document-store/local-storage-document-store'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-004 -- the three limitations that decide what this unit must do. The
 * `forces` column is the part of the row this unit has to honour.
 */
const T_004_LIMITS = [
  {
    id: 'LM-4',
    forces: 'the ceiling is reachable, and the person is told when it is hit (NT-6 of T-037)',
  },
  {
    id: 'LM-6',
    forces: 'every local page on the machine shares this place, so nothing read may be cached',
  },
  {
    id: 'LM-14',
    forces: 'a browser may refuse the store outright, and a refusal is a value, not an exception',
  },
] as const

/** Table T-034 -- the order FR-062 puts on the document a start opens with. */
const T_034_STARTUP = [
  { id: 'BT-1', order: 1, from: 'the document embedded in the file' },
  { id: 'BT-2', order: 2, from: 'the document handed over at start' },
  { id: 'BT-3', order: 3, from: 'the autosaved document' },
  { id: 'BT-4', order: 4, from: 'the template for the first screen' },
] as const

/**
 * The closing note of table T-034 -- what becomes of the autosave that loses.
 * Three sentences, and what each of them needs this unit to supply.
 */
const T_034_LOSER = [
  {
    id: 'the same document, the autosave being the newer',
    needs: 'the key AND the text, so the side that compares them can ask',
  },
  {
    id: 'a different document -- leave it alone',
    needs: 'a read that changes nothing in the place',
  },
  {
    id: 'broken -- tell the person, then set it aside',
    needs: 'the raw text back, and a way to move it out of the way without losing it',
  },
] as const

/**
 * The two codes the seam declares (`StoreFaultCode` of
 * src/adapter/autosave-gateway/document-store.ts) and the row of table T-004
 * each of them stands for.
 */
const STORE_FAULT_CODES = [
  { code: 'capacityExceeded' satisfies StoreFaultCode, row: 'LM-4' },
  { code: 'storeUnavailable' satisfies StoreFaultCode, row: 'LM-14' },
] as const

/**
 * How a host says it is full. ⚠️ NOT a table of the specification: LM-4 states
 * that the ceiling exists and NT-6 makes telling the person a MUST, but the
 * spelling belongs to the browsers, so these rows are the spellings in use.
 */
const QUOTA_REFUSALS = [
  { why: 'the standard name', error: hostRefusal('QuotaExceededError', 22) },
  { why: "the older engine's name", error: hostRefusal('NS_ERROR_DOM_QUOTA_REACHED', 1014) },
  { why: 'the legacy number alone', error: hostRefusal('Error', 22) },
  { why: "the older engine's legacy number alone", error: hostRefusal('Error', 1014) },
] as const

/** Everything else a host can throw. None of it names the ceiling. */
const OTHER_REFUSALS = [
  { why: 'a security refusal', error: hostRefusal('SecurityError') },
  { why: 'a plain error', error: new Error('the host said no') },
  { why: 'a thrown string', error: 'no' as unknown },
  { why: 'a thrown null', error: null as unknown },
  { why: 'a thrown undefined', error: undefined as unknown },
] as const

/**
 * Texts IO-5 has to carry unchanged. ⚠️ IO-5 (MUST) calls what comes back out
 * untrusted input, so none of these may be parsed, repaired or refused here.
 * Written with escapes because code in this repository is ASCII.
 */
const TEXTS = [
  { why: 'a GRS JSON document', text: '{"schemaVersion":"2026-01-01","schedule":{}}' },
  { why: 'the empty text', text: '' },
  { why: 'text that is not JSON at all', text: 'hello' },
  { why: 'text carrying quotes, braces, newlines and tabs', text: '{"a":"b\\"c"}\n\r\t{' },
  { why: 'text outside ASCII', text: '\u00e9\u4e00\u{1f600}' },
  { why: 'a lone surrogate', text: '\ud800' },
  { why: 'text carrying a NUL and other control characters', text: 'a\u0000b\u001fc' },
] as const

/** Keys FR-061 has to keep apart. */
const KEYS = [
  { why: 'an ordinary key', key: 'doc-a' },
  { why: 'the empty key', key: '' },
  { why: 'a key carrying the delimiters a naive format would reach for', key: 'a:b|c d"e' },
  { why: 'a key outside ASCII', key: '\u00e9\u4e00' },
] as const

// ---------------------------------------------------------------------------
// The fake host. Three members, no DOM (R7.3 is what makes this possible).
// ---------------------------------------------------------------------------

type Member = 'getItem' | 'setItem' | 'removeItem'

interface Call {
  readonly member: Member
  readonly key: string
  /** What `setItem` was given; `null` for the two members that take no value. */
  readonly value: string | null
}

interface Fake {
  /** What the unit is handed. `Storage` has this shape, so no cast is needed. */
  readonly host: WebStorage
  /** Every call the unit made, in the order it made them. */
  readonly calls: readonly Call[]
  /** What stands in the place right now. */
  entries(): Record<string, string>
  /** Another local page writes (LM-6). Not a call of the unit. */
  put(key: string, value: string): void
  /** Another local page clears (LM-6). Not a call of the unit. */
  drop(key: string): void
  /** Forget the calls; leave the place as it stands. */
  forgetCalls(): void
  /** Make one member throw on every call from now on. */
  failOn(member: Member, error: unknown): void
  /** Refuse a write that would take the place over `limit` characters (LM-4). */
  ceiling(limit: number): void
}

/** An error shaped the way a browser shapes one. */
function hostRefusal(name: string, code?: number): Error {
  const error = new Error(`the fake host refuses: ${name}`)
  error.name = name
  if (code !== undefined) (error as Error & { code?: number }).code = code
  return error
}

function fakeWebStorage(seed: Record<string, string> = {}): Fake {
  const held = new Map<string, string>(Object.entries(seed))
  let calls: Call[] = []
  const faults = new Map<Member, unknown>()
  let limit: number | null = null

  // Recorded BEFORE the fault is raised, so a member that threw still shows up
  // in the call list.
  const enter = (member: Member, key: string, value: string | null): void => {
    calls.push({ member, key, value })
    if (faults.has(member)) throw faults.get(member)
  }

  const host: WebStorage = {
    getItem(key: string): string | null {
      enter('getItem', key, null)
      return held.get(key) ?? null
    },
    setItem(key: string, value: string): void {
      enter('setItem', key, value)
      if (limit !== null) {
        let size = key.length + value.length
        for (const [otherKey, otherValue] of held) {
          if (otherKey !== key) size += otherKey.length + otherValue.length
        }
        if (size > limit) throw hostRefusal('QuotaExceededError', 22)
      }
      held.set(key, value)
    },
    removeItem(key: string): void {
      enter('removeItem', key, null)
      held.delete(key)
    },
  }

  return {
    host,
    get calls(): readonly Call[] {
      return calls
    },
    entries: (): Record<string, string> => Object.fromEntries(held),
    put: (key: string, value: string): void => {
      held.set(key, value)
    },
    drop: (key: string): void => {
      held.delete(key)
    },
    forgetCalls: (): void => {
      calls = []
    },
    failOn: (member: Member, error: unknown): void => {
      faults.set(member, error)
    },
    ceiling: (value: number): void => {
      limit = value
    },
  }
}

/** A store standing on a fresh fake. */
function standing(seed: Record<string, string> = {}): {
  readonly store: LocalStorageDocumentStore
  readonly fake: Fake
} {
  const fake = fakeWebStorage(seed)
  return { store: localStorageDocumentStore(() => fake.host), fake }
}

const keysTouched = (fake: Fake): readonly string[] => fake.calls.map((call) => call.key)
const membersCalled = (fake: Fake): readonly Member[] => fake.calls.map((call) => call.member)
const callsTo = (fake: Fake, member: Member): readonly Call[] =>
  fake.calls.filter((call) => call.member === member)

/** The key the unit put an autosave under, learnt by watching it write. */
function keyItWroteUnder(fake: Fake): string {
  const first = callsTo(fake, 'setItem')[0]
  if (first === undefined) throw new Error('the unit never wrote anything')
  return first.key
}

/** What the unit handed the host on its first write. */
function whatItWrote(fake: Fake): string {
  const first = callsTo(fake, 'setItem')[0]
  if (first === undefined || first.value === null) {
    throw new Error('the unit never wrote anything')
  }
  return first.value
}

function taken(outcome: SnapshotWriteOutcome): void {
  expect(outcome).toEqual({ ok: true })
}

function refusedWith(outcome: SnapshotWriteOutcome | SnapshotReadOutcome): StoreFaultCode {
  if (outcome.ok) {
    throw new Error(`expected a refusal, the store answered ${JSON.stringify(outcome)}`)
  }
  return outcome.code
}

function readBack(outcome: SnapshotReadOutcome): {
  readonly documentKey: string | null
  readonly text: string
} {
  if (!outcome.ok) throw new Error(`expected a read, the store refused with ${outcome.code}`)
  if (outcome.snapshot === null) throw new Error('expected a snapshot, the place answered empty')
  return { documentKey: outcome.snapshot.documentKey, text: outcome.snapshot.text }
}

// ---------------------------------------------------------------------------
// The fixed copies are pinned, so that a case walking a table cannot go green
// by walking nothing.
// ---------------------------------------------------------------------------

describe('the fixed copies of the tables these cases walk', () => {
  it('carries four rows of table T-034 in order, three of T-004, two fault codes', () => {
    expect(T_034_STARTUP.map((row) => row.order)).toEqual([1, 2, 3, 4])
    expect(T_034_STARTUP.filter((row) => row.id === 'BT-3')).toHaveLength(1)
    expect(T_034_LOSER).toHaveLength(3)
    expect(T_004_LIMITS).toHaveLength(3)
    expect(STORE_FAULT_CODES).toHaveLength(2)
    expect(new Set(STORE_FAULT_CODES.map((row) => row.code)).size).toBe(2)
    expect(QUOTA_REFUSALS.length + OTHER_REFUSALS.length).toBe(9)
    expect(TEXTS.length * KEYS.length).toBe(28)
  })
})

// ---------------------------------------------------------------------------
// PI-29 of table T-064 -- the one implementation of DocumentStore
// ---------------------------------------------------------------------------

describe('the published surface (PI-29 of table T-064, IF-4 of table T-065)', () => {
  it('publishes a factory that takes the host as its one argument (R7.3)', () => {
    expect(typeof localStorageDocumentStore).toBe('function')
    expect(localStorageDocumentStore).toHaveLength(1)
  })

  it("supplies IF-4's two members, and the one FR-062's setting-aside needs", () => {
    const { store } = standing()
    expect(typeof store.writeSnapshot).toBe('function')
    expect(typeof store.readSnapshot).toBe('function')
    expect(typeof store.quarantineSnapshot).toBe('function')
  })

  it('touches nothing when it is built -- the factory is declared pure', () => {
    let reached = 0
    localStorageDocumentStore(() => {
      reached += 1
      return null
    })
    expect(reached).toBe(0)
  })

  it('asks for the host again on every operation (LM-14: it may start refusing)', () => {
    const fake = fakeWebStorage()
    let reached = 0
    const store = localStorageDocumentStore(() => {
      reached += 1
      return fake.host
    })
    store.writeSnapshot('doc-a', 'one')
    expect(reached).toBe(1)
    store.readSnapshot()
    expect(reached).toBe(2)
    store.quarantineSnapshot()
    expect(reached).toBe(3)
  })

  it('never reaches for a global: an exploding globalThis.localStorage is untouched', () => {
    // ⛔ Reaching for the global instead of taking the host would break R7.3 and
    // LY-5, and would make this whole file impossible to run on node.
    const globalObject = globalThis as unknown as Record<string, unknown>
    const before = Object.getOwnPropertyDescriptor(globalObject, 'localStorage')
    Object.defineProperty(globalObject, 'localStorage', {
      configurable: true,
      get(): never {
        throw new Error('the unit reached for a global (R7.3, LY-5)')
      },
    })
    try {
      const { store } = standing()
      taken(store.writeSnapshot('doc-a', 'one'))
      expect(readBack(store.readSnapshot())).toEqual({ documentKey: 'doc-a', text: 'one' })
      taken(store.quarantineSnapshot())
    } finally {
      if (before === undefined) delete globalObject['localStorage']
      else Object.defineProperty(globalObject, 'localStorage', before)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-026 RATIONALE -- the keys carry a prefix of this tool's own (PD-110)
// ---------------------------------------------------------------------------

describe("FR-026 RATIONALE -- every key carries this tool's own prefix", () => {
  it('publishes the prefix as a constant, so no other row of T-206 retypes it', () => {
    expect(typeof WEB_STORAGE_KEY_PREFIX).toBe('string')
    // Specific enough to be this tool's own, rather than a word another page
    // would also pick (LM-6: the place is shared by every local page).
    expect(WEB_STORAGE_KEY_PREFIX.length).toBeGreaterThanOrEqual(4)
    // ⛔ A control character in a key stops the whole application
    // (docs/development-rules/04-verification.md, section 3), so the prefix is
    // printable ASCII and carries no space.
    expect(WEB_STORAGE_KEY_PREFIX).toMatch(/^[\x21-\x7e]+$/)
  })

  it('puts the prefix on every key it hands the host, over all three members', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'one')
    store.readSnapshot()
    store.quarantineSnapshot()
    store.readSnapshot()
    expect(keysTouched(fake).length).toBeGreaterThanOrEqual(5)
    for (const key of keysTouched(fake)) {
      expect(key.startsWith(WEB_STORAGE_KEY_PREFIX), key).toBe(true)
    }
  })

  it('does not build the key out of the document key, whatever the key is', () => {
    // FR-061 is kept by the ENTRY, not by the key: a key built from the document
    // key would be a second answer to "are these the same document", and no
    // requirement says what makes two documents the same one.
    const written = new Set<string>()
    for (const row of KEYS) {
      const { store, fake } = standing()
      store.writeSnapshot(row.key, 'one')
      written.add(keyItWroteUnder(fake))
    }
    expect(written.size, [...written].join(' / ')).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// IO-5 of table T-024 -- the ordinary path: text goes in and comes back out
// ---------------------------------------------------------------------------

describe('IO-5 of table T-024 -- the store moves text and never reads into it', () => {
  it('round-trips every key against every text, unchanged (28 pairs)', () => {
    for (const key of KEYS) {
      for (const text of TEXTS) {
        const { store } = standing()
        taken(store.writeSnapshot(key.key, text.text))
        expect(readBack(store.readSnapshot()), `${key.why} / ${text.why}`).toEqual({
          documentKey: key.key,
          text: text.text,
        })
      }
    }
  })

  it('writes the whole entry in one call, so a dying page cannot tear it (FR-061)', () => {
    const { store, fake } = standing()
    taken(store.writeSnapshot('doc-a', 'one'))
    expect(callsTo(fake, 'setItem')).toHaveLength(1)
    expect(callsTo(fake, 'removeItem')).toHaveLength(0)
  })

  it('reads the place exactly once per read (LM-6: one call is the consistency unit)', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'one')
    fake.forgetCalls()
    store.readSnapshot()
    expect(membersCalled(fake)).toEqual(['getItem'])
  })

  it('takes a megabyte of text: nothing here sets a ceiling of its own (T-211)', () => {
    const text = 'x'.repeat(1_000_000)
    const { store } = standing()
    taken(store.writeSnapshot('doc-a', text))
    expect(readBack(store.readSnapshot()).text).toBe(text)
  })
})

// ---------------------------------------------------------------------------
// FR-026 -- MUST NOT put secrets in the place; add nothing of this tool's own
// ---------------------------------------------------------------------------

describe('FR-026 -- nothing of this tool is added beside what it was handed', () => {
  it('writes the same characters twice over, from two stores, for the same pair', () => {
    // ⭐ A clock, a counter or a random id would show up as a difference here.
    // The clock belongs to the shell (FT-4 of table T-078), not to this unit.
    const first = standing()
    first.store.writeSnapshot('doc-a', 'one')
    const second = standing()
    second.store.writeSnapshot('doc-a', 'one')
    expect(typeof whatItWrote(first.fake)).toBe('string')
    expect(whatItWrote(second.fake)).toBe(whatItWrote(first.fake))
  })

  it('has room for nothing else: two empty strings make a very short entry', () => {
    const { store, fake } = standing()
    store.writeSnapshot('', '')
    expect(whatItWrote(fake).length).toBeLessThan(200)
  })

  it('leaves what other rows keep in the place alone, and never reads them', () => {
    // The four rows table T-206 keeps in `localStorage` (S-99, S-99a, S-99b,
    // S-99c) share the place and the prefix with this unit, not the seam.
    const foreign: Record<string, string> = {
      [`${WEB_STORAGE_KEY_PREFIX}language`]: 'ja',
      'another-page': 'not ours',
    }
    const { store, fake } = standing({ ...foreign })
    store.writeSnapshot('doc-a', 'one')
    store.readSnapshot()
    store.quarantineSnapshot()
    for (const [key, value] of Object.entries(foreign)) {
      expect(keysTouched(fake), key).not.toContain(key)
      expect(fake.entries()[key], key).toBe(value)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-061 -- two documents' autosaves are never taken for one another
// ---------------------------------------------------------------------------

describe("FR-061 -- MUST NOT take two documents' autosaves for one another", () => {
  it('gives back the key it was handed, unread and unchanged', () => {
    for (const row of KEYS) {
      const { store } = standing()
      store.writeSnapshot(row.key, 'one')
      expect(readBack(store.readSnapshot()).documentKey, row.why).toBe(row.key)
    }
  })

  it('keeps a pair apart from the pair a delimiter format would confuse it with', () => {
    const left = standing()
    left.store.writeSnapshot('a', 'b|c')
    const right = standing()
    right.store.writeSnapshot('a|b', 'c')
    expect(readBack(left.store.readSnapshot())).toEqual({ documentKey: 'a', text: 'b|c' })
    expect(readBack(right.store.readSnapshot())).toEqual({ documentKey: 'a|b', text: 'c' })
    expect(whatItWrote(left.fake)).not.toBe(whatItWrote(right.fake))
  })

  it('never leaves one document key standing over another document text', () => {
    const { store } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    store.writeSnapshot('doc-b', 'text of b')
    expect(readBack(store.readSnapshot())).toEqual({ documentKey: 'doc-b', text: 'text of b' })
  })

  it('treats text that looks like another pair as text, not as another pair', () => {
    // ⛔ The nastiest way to take two documents for one another: hand the store
    // one document's whole entry AS the text of another document.
    const seen = standing()
    seen.store.writeSnapshot('doc-a', 'text of a')
    const envelopeOfA = whatItWrote(seen.fake)
    const { store } = standing()
    store.writeSnapshot('doc-b', envelopeOfA)
    expect(readBack(store.readSnapshot())).toEqual({ documentKey: 'doc-b', text: envelopeOfA })
  })

  // ⭐ PD-111: whether the place holds one snapshot or one per document key is
  // not decided by the specification. This is the case that falls if the
  // recommendation (one slot) is overturned.
  it('holds exactly one autosave entry after two writes of different documents', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    store.writeSnapshot('doc-b', 'text of b')
    expect(Object.keys(fake.entries())).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// FR-026 -- MUST NOT drop a stored snapshot in silence
// ---------------------------------------------------------------------------

const DAMAGED = [
  { why: 'text that is not JSON at all', stored: 'hello' },
  { why: 'a JSON object that is not the envelope', stored: '{"a":1}' },
  { why: 'a JSON array', stored: '[1,2,3]' },
  { why: 'the JSON null', stored: 'null' },
  { why: 'a JSON number', stored: '42' },
  { why: 'a JSON string', stored: '"just text"' },
  { why: 'JSON cut off half way', stored: '{"documentKey":' },
  { why: 'an envelope-shaped object with the wrong types', stored: '{"documentKey":5,"text":7}' },
  { why: 'a whole GRS JSON document, stored bare', stored: '{"schemaVersion":"x"}' },
  { why: 'an envelope with the owner but no text at all', stored: '{"documentKey":"doc-a"}' },
] as const

/** Puts `stored` where the unit looks, by first watching where that is. */
function placeHolding(stored: string): {
  readonly store: LocalStorageDocumentStore
  readonly fake: Fake
} {
  const { store, fake } = standing()
  store.writeSnapshot('doc-a', 'one')
  fake.put(keyItWroteUnder(fake), stored)
  fake.forgetCalls()
  return { store, fake }
}

describe('FR-026 -- MUST NOT drop a broken stored snapshot in silence', () => {
  it('answers with the raw text and an unknown owner, never an empty place', () => {
    for (const row of DAMAGED) {
      const { store } = placeHolding(row.stored)
      const outcome = store.readSnapshot()
      expect(outcome.ok, row.why).toBe(true)
      expect(readBack(outcome), row.why).toEqual({ documentKey: null, text: row.stored })
    }
  })

  it('answers with the raw text for an entry that is the empty string', () => {
    // An entry standing under the key is stored content, damaged or not, and an
    // empty place is a different answer from a damaged one.
    const { store } = placeHolding('')
    expect(readBack(store.readSnapshot())).toEqual({ documentKey: null, text: '' })
  })

  it('never reports a damaged entry as a fault -- it is a snapshot, not a failure', () => {
    for (const row of DAMAGED) {
      const { store } = placeHolding(row.stored)
      expect(store.readSnapshot().ok, row.why).toBe(true)
    }
  })

  it('does not repair, rewrite or drop the damaged entry while reading it', () => {
    for (const row of DAMAGED) {
      const { store, fake } = placeHolding(row.stored)
      store.readSnapshot()
      expect(membersCalled(fake), row.why).toEqual(['getItem'])
      expect(Object.values(fake.entries()), row.why).toEqual([row.stored])
    }
  })
})

// ---------------------------------------------------------------------------
// An empty place is not a failure (the seam says so in as many words)
// ---------------------------------------------------------------------------

describe('an empty place answers empty, and that is not a failure', () => {
  it('answers { ok: true, snapshot: null } when the place holds nothing', () => {
    const { store } = standing()
    expect(store.readSnapshot()).toEqual({ ok: true, snapshot: null })
  })

  it('answers empty when the place holds other rows but no autosave', () => {
    const { store } = standing({ [`${WEB_STORAGE_KEY_PREFIX}language`]: 'ja' })
    expect(store.readSnapshot()).toEqual({ ok: true, snapshot: null })
  })

  it('answers empty once another local page has cleared the entry (LM-6)', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'one')
    expect(readBack(store.readSnapshot()).text).toBe('one')
    fake.drop(keyItWroteUnder(fake))
    expect(store.readSnapshot()).toEqual({ ok: true, snapshot: null })
  })
})

// ---------------------------------------------------------------------------
// FR-062 and the closing note of table T-034 -- set aside, not discarded
// ---------------------------------------------------------------------------

describe('FR-062 + table T-034 -- a broken autosave is SET ASIDE, not discarded', () => {
  it('supplies BT-3, the third of the four rows of table T-034', () => {
    const bt3 = T_034_STARTUP[2]
    expect(bt3?.id).toBe('BT-3')
    const { store } = standing()
    store.writeSnapshot('doc-a', 'one')
    expect(readBack(store.readSnapshot()), bt3?.from).toEqual({
      documentKey: 'doc-a',
      text: 'one',
    })
  })

  it('supplies what each of the three sentences of the closing note needs', () => {
    // One test walks the fixed copy of the note (Chapter 1.9, :275).
    for (const row of T_034_LOSER) {
      if (row.id.startsWith('the same document')) {
        const { store } = standing()
        store.writeSnapshot('doc-a', 'text of a')
        expect(readBack(store.readSnapshot()), row.needs).toEqual({
          documentKey: 'doc-a',
          text: 'text of a',
        })
      } else if (row.id.startsWith('a different document')) {
        const { store, fake } = standing()
        store.writeSnapshot('doc-b', 'text of b')
        const before = fake.entries()
        fake.forgetCalls()
        expect(readBack(store.readSnapshot()).documentKey, row.needs).toBe('doc-b')
        expect(membersCalled(fake), row.needs).toEqual(['getItem'])
        expect(fake.entries(), row.needs).toEqual(before)
      } else {
        const { store, fake } = placeHolding('not the envelope')
        expect(readBack(store.readSnapshot()), row.needs).toEqual({
          documentKey: null,
          text: 'not the envelope',
        })
        taken(store.quarantineSnapshot())
        expect(Object.values(fake.entries()), row.needs).toEqual(['not the envelope'])
      }
    }
  })

  it('leaves the read empty afterwards, and the text still standing in the place', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    const held = fake.entries()[keyItWroteUnder(fake)]
    taken(store.quarantineSnapshot())
    expect(store.readSnapshot()).toEqual({ ok: true, snapshot: null })
    expect(Object.values(fake.entries())).toContain(held)
  })

  it('moves it to a second key of this tool, not to the one it read', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    const snapshotKey = keyItWroteUnder(fake)
    fake.forgetCalls()
    taken(store.quarantineSnapshot())
    const written = callsTo(fake, 'setItem')
    expect(written).toHaveLength(1)
    expect(written[0]?.key).not.toBe(snapshotKey)
    expect(written[0]?.key.startsWith(WEB_STORAGE_KEY_PREFIX)).toBe(true)
    expect(Object.keys(fake.entries())).toHaveLength(1)
  })

  it('copies first and drops second, so a page dying between leaves it findable', () => {
    // ⛔ Dropping first would make a page that dies in between the silent loss
    // FR-026 and FR-062 both forbid.
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    const snapshotKey = keyItWroteUnder(fake)
    fake.forgetCalls()
    taken(store.quarantineSnapshot())
    expect(membersCalled(fake)).toEqual(['getItem', 'setItem', 'removeItem'])
    expect(callsTo(fake, 'removeItem')[0]?.key).toBe(snapshotKey)
  })

  it('does not disturb what was set aside when the next autosave is written', () => {
    // ⛔ FR-062 (MUST NOT): the losing autosave is not discarded. A new autosave
    // landing on top of it would be exactly that discard, one idle boundary
    // later.
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    const setAside = fake.entries()[keyItWroteUnder(fake)]
    taken(store.quarantineSnapshot())
    taken(store.writeSnapshot('doc-b', 'text of b'))
    expect(Object.keys(fake.entries())).toHaveLength(2)
    expect(Object.values(fake.entries())).toContain(setAside)
    expect(readBack(store.readSnapshot())).toEqual({ documentKey: 'doc-b', text: 'text of b' })
  })

  it('answers ok and writes nothing when the place holds nothing to set aside', () => {
    const { store, fake } = standing()
    taken(store.quarantineSnapshot())
    expect(callsTo(fake, 'setItem')).toHaveLength(0)
    expect(callsTo(fake, 'removeItem')).toHaveLength(0)
    expect(Object.keys(fake.entries())).toHaveLength(0)
  })

  it('sets a damaged entry aside exactly as it stands, unrepaired', () => {
    const { store, fake } = placeHolding('not the envelope')
    taken(store.quarantineSnapshot())
    expect(Object.values(fake.entries())).toEqual(['not the envelope'])
  })

  // ⭐ PD-112: one quarantine slot, newest wins. This is the case that falls if
  // the recommendation is overturned.
  it('keeps one slot: a second setting-aside replaces the first', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    taken(store.quarantineSnapshot())
    store.writeSnapshot('doc-b', 'text of b')
    taken(store.quarantineSnapshot())
    const standingNow = Object.values(fake.entries())
    expect(standingNow).toHaveLength(1)
    expect(standingNow.join('')).toContain('text of b')
    expect(standingNow.join('')).not.toContain('text of a')
  })
})

// ---------------------------------------------------------------------------
// Table T-004 -- one test walks the three rows that decide this unit
// ---------------------------------------------------------------------------

describe('table T-004 -- one test walks LM-4, LM-6 and LM-14', () => {
  it('honours each of the three rows', () => {
    for (const row of T_004_LIMITS) {
      if (row.id === 'LM-4') {
        const { store, fake } = standing()
        fake.ceiling(50)
        expect(refusedWith(store.writeSnapshot('doc-a', 'x'.repeat(500))), row.forces).toBe(
          'capacityExceeded',
        )
      } else if (row.id === 'LM-6') {
        const { store, fake } = standing()
        store.writeSnapshot('doc-a', 'mine')
        const first = readBack(store.readSnapshot())
        fake.put(keyItWroteUnder(fake), 'another page wrote this')
        const second = readBack(store.readSnapshot())
        expect(first.text, row.forces).toBe('mine')
        expect(second.text, row.forces).toBe('another page wrote this')
      } else {
        const store = localStorageDocumentStore(() => null)
        expect(refusedWith(store.readSnapshot()), row.forces).toBe('storeUnavailable')
      }
    }
  })
})

describe('the two fault codes of the seam are both reachable and told apart', () => {
  it('produces each code, and never a third (one test walks both)', () => {
    for (const row of STORE_FAULT_CODES) {
      if (row.code === 'capacityExceeded') {
        const { store, fake } = standing()
        fake.failOn('setItem', hostRefusal('QuotaExceededError', 22))
        expect(refusedWith(store.writeSnapshot('doc-a', 'one')), row.row).toBe(row.code)
      } else {
        const store = localStorageDocumentStore(() => null)
        expect(refusedWith(store.writeSnapshot('doc-a', 'one')), row.row).toBe(row.code)
      }
    }
  })

  it('names WHICH failure it was, so NT-6 can tell the ceiling from a refusal', () => {
    const full = standing()
    full.fake.failOn('setItem', hostRefusal('QuotaExceededError', 22))
    const shut = standing()
    shut.fake.failOn('setItem', hostRefusal('SecurityError'))
    expect(refusedWith(full.store.writeSnapshot('doc-a', 'one'))).not.toBe(
      refusedWith(shut.store.writeSnapshot('doc-a', 'one')),
    )
  })
})

// ---------------------------------------------------------------------------
// LM-14 -- the API absent, the permission refused
// ---------------------------------------------------------------------------

describe('LM-14 -- the store absent or refused answers storeUnavailable', () => {
  const HOSTS_OUT_OF_REACH = [
    { why: 'the host has no such thing', reach: (): WebStorage | null => null },
    {
      why: 'the property access itself throws (the file was opened directly)',
      reach: (): WebStorage | null => {
        throw hostRefusal('SecurityError')
      },
    },
    {
      why: 'the property access throws something that is not an error',
      reach: (): WebStorage | null => {
        throw 'refused'
      },
    },
  ] as const

  it('answers storeUnavailable on all three members, for each way of not being reached', () => {
    for (const row of HOSTS_OUT_OF_REACH) {
      const store = localStorageDocumentStore(row.reach)
      expect(refusedWith(store.writeSnapshot('doc-a', 'one')), row.why).toBe('storeUnavailable')
      expect(refusedWith(store.readSnapshot()), row.why).toBe('storeUnavailable')
      expect(refusedWith(store.quarantineSnapshot()), row.why).toBe('storeUnavailable')
    }
  })

  it('answers storeUnavailable when a member of a reachable host throws', () => {
    for (const row of OTHER_REFUSALS) {
      const write = standing()
      write.fake.failOn('setItem', row.error)
      expect(refusedWith(write.store.writeSnapshot('doc-a', 'one')), row.why).toBe(
        'storeUnavailable',
      )

      const read = standing()
      read.fake.failOn('getItem', row.error)
      expect(refusedWith(read.store.readSnapshot()), row.why).toBe('storeUnavailable')

      const aside = standing()
      aside.store.writeSnapshot('doc-a', 'one')
      aside.fake.failOn('removeItem', row.error)
      expect(refusedWith(aside.store.quarantineSnapshot()), row.why).toBe('storeUnavailable')
    }
  })

  it('works again once the host becomes reachable: no refusal is remembered', () => {
    const fake = fakeWebStorage()
    let reachable = false
    const store = localStorageDocumentStore(() => (reachable ? fake.host : null))
    expect(refusedWith(store.writeSnapshot('doc-a', 'one'))).toBe('storeUnavailable')
    reachable = true
    taken(store.writeSnapshot('doc-a', 'one'))
    expect(readBack(store.readSnapshot())).toEqual({ documentKey: 'doc-a', text: 'one' })
  })
})

// ---------------------------------------------------------------------------
// LM-4 / NT-6 -- the ceiling
// ---------------------------------------------------------------------------

describe("LM-4 and NT-6 -- the ceiling is the host's, and reaching it is a value", () => {
  it('answers capacityExceeded for every spelling a host uses (one test walks them)', () => {
    for (const row of QUOTA_REFUSALS) {
      const { store, fake } = standing()
      fake.failOn('setItem', row.error)
      expect(refusedWith(store.writeSnapshot('doc-a', 'one')), row.why).toBe('capacityExceeded')
    }
  })

  it('answers capacityExceeded when the setting-aside is what hits the ceiling', () => {
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    fake.failOn('setItem', hostRefusal('QuotaExceededError', 22))
    expect(refusedWith(store.quarantineSnapshot())).toBe('capacityExceeded')
  })

  it('leaves the entry standing when the setting-aside could not be written', () => {
    // ⛔ FR-026 / FR-062: a failed setting-aside must not become a discard.
    const { store, fake } = standing()
    store.writeSnapshot('doc-a', 'text of a')
    const held = fake.entries()[keyItWroteUnder(fake)]
    fake.failOn('setItem', hostRefusal('QuotaExceededError', 22))
    expect(store.quarantineSnapshot().ok).toBe(false)
    expect(Object.values(fake.entries())).toContain(held)
  })

  it('takes what fits and refuses what does not, against a host with a ceiling', () => {
    const { store, fake } = standing()
    fake.ceiling(1_000)
    taken(store.writeSnapshot('doc-a', 'x'.repeat(100)))
    expect(refusedWith(store.writeSnapshot('doc-a', 'x'.repeat(5_000)))).toBe('capacityExceeded')
    // ⭐ And the refusal did not empty the place: the older autosave stands.
    expect(readBack(store.readSnapshot()).text).toBe('x'.repeat(100))
  })
})

// ---------------------------------------------------------------------------
// FR-028 -- nothing throws out of any member, for any of the above
// ---------------------------------------------------------------------------

describe('FR-028 -- a failure is a VALUE; no member throws', () => {
  function everyBrokenHost(): readonly {
    readonly why: string
    readonly build: () => LocalStorageDocumentStore
  }[] {
    const rows: { why: string; build: () => LocalStorageDocumentStore }[] = [
      { why: 'no host at all', build: () => localStorageDocumentStore(() => null) },
      {
        why: 'the host access throws',
        build: () =>
          localStorageDocumentStore(() => {
            throw hostRefusal('SecurityError')
          }),
      },
    ]
    for (const member of ['getItem', 'setItem', 'removeItem'] as const) {
      for (const row of [...QUOTA_REFUSALS, ...OTHER_REFUSALS]) {
        rows.push({
          why: `${member} throws (${row.why})`,
          build: (): LocalStorageDocumentStore => {
            const fake = fakeWebStorage()
            fake.failOn(member, row.error)
            return localStorageDocumentStore(() => fake.host)
          },
        })
      }
    }
    return rows
  }

  it('answers a value on all three members, for every broken host (29 of them)', () => {
    const rows = everyBrokenHost()
    expect(rows).toHaveLength(29)
    for (const row of rows) {
      const store = row.build()
      let write: SnapshotWriteOutcome | undefined
      let read: SnapshotReadOutcome | undefined
      let aside: SnapshotWriteOutcome | undefined
      expect(() => {
        write = store.writeSnapshot('doc-a', 'one')
      }, row.why).not.toThrow()
      expect(() => {
        read = store.readSnapshot()
      }, row.why).not.toThrow()
      expect(() => {
        aside = store.quarantineSnapshot()
      }, row.why).not.toThrow()
      for (const outcome of [write, read, aside]) {
        expect(typeof outcome?.ok, row.why).toBe('boolean')
        if (outcome !== undefined && !outcome.ok) {
          expect(
            STORE_FAULT_CODES.map((code) => code.code),
            row.why,
          ).toContain(outcome.code)
        }
      }
    }
  })

  it('does not throw on the ordinary path either, for any key or text', () => {
    for (const key of KEYS) {
      for (const text of TEXTS) {
        const { store } = standing()
        expect(() => {
          store.writeSnapshot(key.key, text.text)
          store.readSnapshot()
          store.quarantineSnapshot()
          store.readSnapshot()
        }, `${key.why} / ${text.why}`).not.toThrow()
      }
    }
  })
})

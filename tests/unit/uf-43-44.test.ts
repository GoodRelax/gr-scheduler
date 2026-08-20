// Unit tests for UF-43 `autosave-gateway.ts` (the public entry, PI-23 of 表
// T-064) and UF-44 `document-store.ts` (the seam `DocumentStore`, IF-4 of 表
// T-065) -- component `AutosaveGateway` (CP-23 of 表 T-062), rows UF-43 / UF-44
// of 表 T-075 in docs/spec/05-07-design.md.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. 表 T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S FUNCTION BODIES
// (docs/development-rules/04-verification.md, §1). What was read: docs/spec for
// every rule below, and of the unit itself only the two head comments, the
// published types and the two signatures. Every expected value here comes from
// a requirement or a table, never from the implementation.
//
// The rules these cases answer to:
//   IO-5 of 表 T-024  the one row that names the autosave's place, and makes
//                     what comes back out untrusted input -- so the seam hands
//                     back TEXT and the entry decodes it
//   FR-026            自動保存は「溜まった編集をまとめて 1 回」書く。
//                     ⛔「保存された内容が壊れているとき、黙って破棄しては
//                     ならない（MUST NOT）」
//   FR-024            「常に全項目を書き出すこと（MUST）」-- what one snapshot
//                     has to carry, and 表 T-052 the shape it carries it in
//   FR-061            「状態は 3 種を区別すること（MUST）」／⛔「自動保存が
//                     互いを取り違えてはならない（MUST NOT）」
//   FR-062 / 表 T-034 BT-3 is what a restore answers; the closing note is why a
//                     read takes no key
//   FR-063 / AG-11    見せ方の群だけの更新で版数は上がらず、確定した発話も
//                     版数を上げない -- so a revision may not gate a write
//   FR-028 / AG-8     ⛔「例外を投げてはならない（MUST NOT）」-- a failure is a
//                     value
//   表 T-037          NT-1（どの項目が、なぜ誤りか）／ NT-3a（次に取れる手段）
//                     ／ NT-6（上限に達したとき）
//   表 T-004          LM-4（上限）／ LM-6（同じ機の他のページと共有）／
//                     LM-9（取り消しの履歴は戻らない）／ LM-14（保管庫が使えない）
//   FT-4 of 表 T-078  時計を読むのはシェルである -- `savedAt` is an argument
//   表 T-211          no row caps a snapshot; S-113 〜 S-115 are FR-023's
//                     import ceilings, and S-112 is the shell's idle boundary
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one test walking every row.
// T_052_ROOT, T_052_DR2, STORE_FAULTS, T_037 and FR_061_STATES are those
// copies.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  restoreDocumentSnapshot,
  saveDocumentSnapshot,
  type DocumentSnapshot,
  type DocumentStore,
  type JsonFault,
  type SnapshotReadOutcome,
  type SnapshotRestoreOutcome,
  type SnapshotSaveOutcome,
  type SnapshotWriteOutcome,
  type StoredSnapshot,
  type StoreFaultCode,
} from '../../src/adapter/autosave-gateway/autosave-gateway'
import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by
// ---------------------------------------------------------------------------

/** 表 T-052 の DR-1 〜 DR-4 -- the five keys the root carries, and nothing else. */
const T_052_ROOT = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'revisionStamp',
  'changeLog',
] as const

/** 表 T-052 の DR-2 -- the twelve keys under `schedule` (no `dependencies`). */
const T_052_DR2 = [
  'project',
  'calendars',
  'tasks',
  'resources',
  'assignments',
  'taskGroups',
  'taskGroupMembers',
  'taskVisuals',
  'commentBoxes',
  'highlightBoxes',
  'taskOrigins',
  'baselineTasks',
] as const

/**
 * The whole roster of `StoreFaultCode`, each with the row of 表 T-004 that
 * grounds it and the row of 表 T-037 that says what has to be told.
 *
 * LM-4 「扱える文書の大きさはブラウザのメモリに収まる範囲に限られる ... 上限に
 * 達したときは人に知らせる」 with NT-6 「資源の上限に達したとき ... 続けられない
 * ことと、いま何ができるかを示すこと（MUST）」.
 * LM-14 「`file://` では、上書き保存と自動保存が働かないことがある」 with NT-3a
 * 「失敗の通知 ... 次に取れる手段を添えること（MUST）」.
 */
const STORE_FAULTS = [
  { code: 'capacityExceeded', limitation: 'LM-4', notice: 'NT-6' },
  { code: 'storeUnavailable', limitation: 'LM-14', notice: 'NT-3a' },
] as const satisfies readonly {
  code: StoreFaultCode
  limitation: string
  notice: string
}[]

/**
 * 表 T-037 in the table's printed order, with the rows this component answers
 * to marked. ⚠️ The other four are the screen's: they are about how long a
 * notice stays, how many items a destructive result touches, gathering the
 * startup notices onto one surface, and telling someone about an input that
 * WAS accepted.
 */
const T_037 = [
  { row: 'NT-1', bindsHere: true, what: 'a refusal says WHICH item is wrong, and why, in words' },
  { row: 'NT-2', bindsHere: false, what: 'a notice that fades on a timer' },
  { row: 'NT-3', bindsHere: false, what: 'a destructive result carries the count' },
  { row: 'NT-3a', bindsHere: true, what: 'a failure carries the next step, so it leaves as a code' },
  { row: 'NT-4', bindsHere: false, what: 'the startup errands gathered onto one surface' },
  { row: 'NT-6', bindsHere: true, what: 'a ceiling reached is told -- LM-4, `capacityExceeded`' },
  { row: 'NT-5', bindsHere: false, what: 'accepted, and cautioned about' },
] as const

/**
 * FR-061「状態は 3 種を区別すること（MUST）—— 保存済み（時刻を併記）／保存中／
 * 保存失敗」. ⭐ Only two of the three are outcomes of one attempt: 「保存中」 is
 * true of the stretch between asking and being answered, which no return value
 * can ever stand in.
 */
const FR_061_STATES = [
  { state: 'saved', isOutcomeOfOneAttempt: true },
  { state: 'saving', isOutcomeOfOneAttempt: false },
  { state: 'failed', isOutcomeOfOneAttempt: true },
] as const

// ---------------------------------------------------------------------------
// The document these cases are driven by
// ---------------------------------------------------------------------------

// BT-4 of 表 T-034 -- the one template FR-027 keeps, held as bundled `GRS JSON`.
// It is the only document whose values the specification has actually decided,
// so these cases build on it rather than inventing a second idea of a document
// (the reason tests/fixtures/grs-document.ts gives for holding no sample).
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE_TEXT = readFileSync(TEMPLATE_PATH, 'utf8')

type Root = Record<string, unknown>
type Group = Record<string, unknown>

/**
 * ⚠️ `documentFromJson` (PI-20) is used here as the oracle rather than as an
 * implementation detail: IO-5 says what comes back from the store is untrusted
 * input and FR-026 points at FR-024 for the format, so "is this text the
 * document I stored" is a question only the `GRS JSON` codec can answer. Its
 * own rules are tested in tests/unit/uf-34-35.test.ts.
 */
function documentOf(text: string): Document {
  const read = documentFromJson(text)
  if (!read.ok) {
    throw new Error(`the fixture is not a GRS JSON document: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

const TEMPLATE_ROOT = JSON.parse(TEMPLATE_TEXT) as Root
const templateSchedule = TEMPLATE_ROOT['schedule'] as Group
const templateSettings = TEMPLATE_ROOT['documentSettings'] as Group

/** The same root with every array of the schedule cut to `count` entries. */
function rootSized(count: number): Root {
  return {
    ...TEMPLATE_ROOT,
    schedule: Object.fromEntries(
      Object.entries(templateSchedule).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.slice(0, count) : value,
      ]),
    ),
  }
}

const SMALL_ROOT = rootSized(2)
const SMALL_TEXT = JSON.stringify(SMALL_ROOT)
const SMALL = documentOf(SMALL_TEXT)

/** The whole bundled template, 1000 tasks and all -- 表 T-211 caps no snapshot. */
const WHOLE = documentOf(TEMPLATE_TEXT)

/** A key of the presentation group whose value is a boolean, so it can be flipped. */
const BOOLEAN_SETTING_KEY =
  Object.keys(templateSettings).filter((key) => typeof templateSettings[key] === 'boolean')[0] ?? ''

const SAVED_AT = '2026-08-19T12:34:56Z'

function snapshotOf(
  documentKey: string,
  document: Document,
  savedAt: string = SAVED_AT,
): DocumentSnapshot {
  return { documentKey, document, savedAt }
}

/** The root as the store received it. */
function storedRoot(text: string): Root {
  return JSON.parse(text) as Root
}

// ---------------------------------------------------------------------------
// The seam, as a double. IF-4's implementation lives in another layer (LR-5),
// so a unit test of this side supplies its own.
// ---------------------------------------------------------------------------

interface StoreWrite {
  readonly documentKey: string
  readonly text: string
}

interface StoreScript {
  readonly held?: StoredSnapshot | null
  readonly writeFault?: StoreFaultCode
  readonly readFault?: StoreFaultCode
}

interface StoreDouble {
  readonly store: DocumentStore
  /** Every `writeSnapshot` call, in order. */
  readonly writes: StoreWrite[]
  /** How many arguments each `readSnapshot` call was given. */
  readonly readArgumentCounts: number[]
  /** What the place holds now. */
  held(): StoredSnapshot | null
}

function storeDouble(script: StoreScript = {}): StoreDouble {
  const writes: StoreWrite[] = []
  const readArgumentCounts: number[] = []
  let kept: StoredSnapshot | null = script.held ?? null
  const store: DocumentStore = {
    writeSnapshot(documentKey: string, text: string): SnapshotWriteOutcome {
      writes.push({ documentKey, text })
      if (script.writeFault !== undefined) return { ok: false, code: script.writeFault }
      kept = { documentKey, text }
      return { ok: true }
    },
    readSnapshot(...args: unknown[]): SnapshotReadOutcome {
      readArgumentCounts.push(args.length)
      if (script.readFault !== undefined) return { ok: false, code: script.readFault }
      return { ok: true, snapshot: kept }
    },
  }
  return { store, writes, readArgumentCounts, held: () => kept }
}

// ---------------------------------------------------------------------------
// Reading the two published shapes without asserting them into place
// ---------------------------------------------------------------------------

function saved(outcome: SnapshotSaveOutcome): { kind: 'saved'; savedAt: string } {
  if (outcome.kind !== 'saved') {
    throw new Error(`expected a saved outcome, was ${JSON.stringify(outcome)}`)
  }
  return outcome
}

function restored(outcome: SnapshotRestoreOutcome): {
  kind: 'read'
  documentKey: string
  document: Document
} {
  if (outcome.kind !== 'read') {
    throw new Error(`expected a read outcome, was ${JSON.stringify(outcome)}`)
  }
  return outcome
}

function broken(outcome: SnapshotRestoreOutcome): {
  kind: 'broken'
  documentKey: string | null
  faults: readonly JsonFault[]
} {
  if (outcome.kind !== 'broken') {
    throw new Error(`expected a broken outcome, was ${JSON.stringify(outcome)}`)
  }
  return outcome
}

interface BrokenText {
  readonly why: string
  readonly text: string
  /** The JSON pointer NT-1 lets a reader name, where one item can be named. */
  readonly at?: string
}

/** Every text the specification says is not a `GRS JSON` document (FR-024, 表 T-052). */
function everyBrokenText(): readonly BrokenText[] {
  const notJson: BrokenText[] = ['', '   ', 'hello', '{', '{"schedule":', '[1,2', '{} {}'].map(
    (text) => ({ why: `not JSON at all: ${JSON.stringify(text)}`, text }),
  )
  const notAnObject: BrokenText[] = ['null', 'true', '42', '"a document"', '[]', '[{}]'].map(
    (text) => ({ why: `a root that is not an object: ${text}`, text }),
  )
  const missingRootKey: BrokenText[] = T_052_ROOT.map((key) => {
    const rest: Root = { ...SMALL_ROOT }
    delete rest[key]
    return { why: `the root is missing ${key}`, text: JSON.stringify(rest), at: `/${key}` }
  })
  return [...notJson, ...notAnObject, ...missingRootKey]
}

/** Deep-freezes, so a write into the argument throws rather than passing unseen. */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // ⛔ A walk over an empty roster passes without asserting anything. These pin
  // the counts so a vacuous case cannot go green.
  it('carries five root keys (DR-1 〜 DR-4) and twelve schedule keys (DR-2)', () => {
    expect(T_052_ROOT).toHaveLength(5)
    expect(T_052_DR2).toHaveLength(12)
    expect(new Set(T_052_ROOT).size).toBe(5)
    expect(new Set(T_052_DR2).size).toBe(12)
    // DR-2 itself notes there is no `dependencies` key -- 表 T-053 の DF-4 puts
    // a dependency under its successor Task.
    expect(T_052_DR2).not.toContain('dependencies')
  })

  it('carries both fault codes, the seven rows of 表 T-037 and FR-061 の 3 種', () => {
    expect(STORE_FAULTS).toHaveLength(2)
    expect(new Set(STORE_FAULTS.map((fault) => fault.code)).size).toBe(2)
    expect(T_037).toHaveLength(7)
    expect(T_037.filter((row) => row.bindsHere)).toHaveLength(3)
    expect(FR_061_STATES).toHaveLength(3)
  })

  it('reads a bundled template that is a whole `GRS JSON` document (FR-027)', () => {
    expect(Object.keys(TEMPLATE_ROOT).sort()).toEqual([...T_052_ROOT].sort())
    expect(Object.keys(templateSchedule).sort()).toEqual([...T_052_DR2].sort())
    expect(Object.keys(templateSettings).length).toBeGreaterThan(0)
    expect(BOOLEAN_SETTING_KEY, 'the presentation group has a boolean').not.toBe('')
    expect(everyBrokenText().length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// PI-23 of 表 T-064 / IF-4 of 表 T-065 -- what leaves this folder
// ---------------------------------------------------------------------------

describe('PI-23 of 表 T-064 -- the three names this component publishes', () => {
  it('publishes the two functions of PI-23', () => {
    expect(typeof saveDocumentSnapshot).toBe('function')
    expect(typeof restoreDocumentSnapshot).toBe('function')
  })

  it('re-publishes the seam of IF-4 and its types through the entry (Chapter 5.3, MUST)', () => {
    // Type-only: 表 T-065 names the interface, and Chapter 5.3 makes this file
    // the only door out of the folder, so the layer that IMPLEMENTS the seam
    // (CP-29) has to be able to reach the types from here. That this compiles
    // is the assertion.
    const seam: DocumentStore | null = null
    const write: SnapshotWriteOutcome = { ok: true }
    const read: SnapshotReadOutcome = { ok: true, snapshot: null }
    const held: StoredSnapshot = { documentKey: null, text: '' }
    const codes: readonly StoreFaultCode[] = STORE_FAULTS.map((fault) => fault.code)
    expect(seam).toBeNull()
    expect(write.ok).toBe(true)
    expect(read.ok).toBe(true)
    expect(held.documentKey).toBeNull()
    expect(codes).toHaveLength(2)
  })

  it('takes a store that has exactly the two members IF-4 supplies', () => {
    const { store } = storeDouble()
    expect(typeof store.writeSnapshot).toBe('function')
    expect(typeof store.readSnapshot).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// saveDocumentSnapshot -- the ordinary case, and what FR-024 makes it carry
// ---------------------------------------------------------------------------

describe('saveDocumentSnapshot -- one snapshot goes to the place IO-5 names', () => {
  it('hands the store the key it was given and reports `saved` with the same time', () => {
    const double = storeDouble()
    const outcome = saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    expect(saved(outcome)).toEqual({ kind: 'saved', savedAt: SAVED_AT })
    expect(double.writes).toHaveLength(1)
    expect(double.writes[0]?.documentKey).toBe('doc-1')
  })

  it('hands the store a `GRS JSON` text that decodes back to the same document', () => {
    // FR-026 「自動保存は全項目を書き出すので（`FR-024`）」 -- the snapshot is a
    // whole document, not a diff and not a format of this component's own.
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    expect(documentOf(double.writes[0]?.text ?? '')).toEqual(SMALL)
  })

  it('writes the five root keys of 表 T-052, and only those (one case walks the table)', () => {
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    const root = storedRoot(double.writes[0]?.text ?? '')
    expect(Object.keys(root).sort()).toEqual([...T_052_ROOT].sort())
    for (const key of T_052_ROOT) expect(root, `the stored root carries ${key}`).toHaveProperty(key)
  })

  it('writes the twelve schedule keys of DR-2 (one case walks the table)', () => {
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    const schedule = storedRoot(double.writes[0]?.text ?? '')['schedule'] as Group
    expect(Object.keys(schedule).sort()).toEqual([...T_052_DR2].sort())
  })

  it('writes every key of the presentation group, defaults included (FR-024, MUST)', () => {
    // 「設定値は既定値と一致していても省略せず、常に全項目を書き出すこと（MUST）」.
    // The template's values ARE the decided defaults, so none may be dropped.
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    const settings = storedRoot(double.writes[0]?.text ?? '')['documentSettings'] as Group
    expect(Object.keys(settings).sort()).toEqual(Object.keys(templateSettings).sort())
    for (const key of Object.keys(templateSettings)) {
      expect(Object.hasOwn(settings, key), `the presentation group keeps ${key}`).toBe(true)
    }
  })

  it('puts no undo history in the snapshot (LM-9 of 表 T-004)', () => {
    // LM-9 「自動保存から復旧したとき、取り消しの履歴は戻らない ... 履歴を保管庫に
    // 入れないと決めたことの帰結である」. So neither the argument nor the stored
    // text may carry one: the five keys of 表 T-052 are the whole of both.
    const snapshot = snapshotOf('doc-1', SMALL)
    expect(Object.keys(snapshot).sort()).toEqual(['document', 'documentKey', 'savedAt'])
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshot)
    const root = storedRoot(double.writes[0]?.text ?? '')
    expect(Object.keys(root).sort()).toEqual([...T_052_ROOT].sort())
    for (const key of Object.keys(root)) {
      expect(key.toLowerCase().includes('history'), `${key} is not a history`).toBe(false)
    }
  })

  it('reports exactly `saved` and its time -- no other key rides along', () => {
    const double = storeDouble()
    const outcome = saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    expect(Object.keys(outcome).sort()).toEqual(['kind', 'savedAt'])
  })
})

// ---------------------------------------------------------------------------
// FT-4 of 表 T-078 -- the clock belongs to the shell, so `savedAt` is echoed
// ---------------------------------------------------------------------------

describe('FT-4 of 表 T-078 -- no clock is read here', () => {
  it('gives back exactly the time it was handed, whatever it spells', () => {
    // 「時計を読むのはシェルであり」. The three things FT-4 counts include the
    // autosave's state changing (S-112 / FR-061), and the shell counts them --
    // so a time this component invented would be a second answer.
    for (const savedAt of [SAVED_AT, '2000-01-01T00:00:00Z', '2026-12-31T23:59:59Z', '']) {
      const double = storeDouble()
      const outcome = saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL, savedAt))
      expect(saved(outcome).savedAt, JSON.stringify(savedAt)).toBe(savedAt)
    }
  })

  it('gives the same answer twice for the same argument -- nothing is sampled', () => {
    const first = saveDocumentSnapshot(storeDouble().store, snapshotOf('doc-1', SMALL))
    const second = saveDocumentSnapshot(storeDouble().store, snapshotOf('doc-1', SMALL))
    expect(first).toEqual(second)
  })

  it('does not put the time beside the snapshot -- 表 T-034 compares the stamp', () => {
    // `revisionStamp` (DR-4) is what 表 T-034 and `isNewerStamp` (PI-3) compare.
    // A second time kept next to the text would be a second answer to "which is
    // newer", and the root may hold only the five keys of 表 T-052 anyway.
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL, SAVED_AT))
    const held = double.held()
    expect(Object.keys(held ?? {}).sort()).toEqual(['documentKey', 'text'])
    expect(storedRoot(held?.text ?? '')).not.toHaveProperty('savedAt')
  })
})

// ---------------------------------------------------------------------------
// FR-063 / AG-11 of 表 T-035 -- a revision may not gate the write
// ---------------------------------------------------------------------------

describe('FR-063 / AG-11 -- the write is never skipped on an unchanged revision', () => {
  it('writes again when the store already holds that very snapshot', () => {
    const double = storeDouble()
    const snapshot = snapshotOf('doc-1', SMALL)
    saveDocumentSnapshot(double.store, snapshot)
    saveDocumentSnapshot(double.store, snapshot)
    expect(double.writes).toHaveLength(2)
    expect(double.writes[1]).toEqual(double.writes[0])
  })

  it('writes a presentation-group-only edit, which FR-063 forbids raising the revision for', () => {
    // FR-063 ⛔「見せ方の群だけを変える更新で版数を上げてはならない（MUST NOT）」.
    // FR-024 and WY-1 still require that edit to come back, so a gateway that
    // saved only on a raised revision would silently drop exactly it.
    const before = templateSettings[BOOLEAN_SETTING_KEY]
    const settings: Group = { ...templateSettings, [BOOLEAN_SETTING_KEY]: !before }
    const edited = documentOf(JSON.stringify({ ...SMALL_ROOT, documentSettings: settings }))
    expect(edited.revisionStamp).toEqual(SMALL.revisionStamp)

    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', edited))
    expect(double.writes).toHaveLength(2)
    const written = storedRoot(double.writes[1]?.text ?? '')['documentSettings'] as Group
    expect(written[BOOLEAN_SETTING_KEY]).toBe(!before)
    expect(double.writes[1]?.text).not.toBe(double.writes[0]?.text)
  })

  it('writes once per call -- neither twice nor not at all', () => {
    const double = storeDouble()
    for (let turn = 1; turn <= 5; turn += 1) {
      saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
      expect(double.writes, `after turn ${turn}`).toHaveLength(turn)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-061 -- the key travels, and is never derived here
// ---------------------------------------------------------------------------

describe('FR-061 -- two documents are never taken for one another', () => {
  it('hands the store the key verbatim, whatever it spells (one case walks the roster)', () => {
    // ⛔「同じ機で別の文書や複製を開いても、自動保存が互いを取り違えてはならない
    // （MUST NOT）」. What makes two documents the same one is not decided
    // anywhere in the specification, so this component derives nothing: the key
    // it is handed is the key the store gets.
    for (const documentKey of ['doc-1', 'doc-2', '', 'a'.repeat(200), 'ключ-1', 'a/b:c']) {
      const double = storeDouble()
      saveDocumentSnapshot(double.store, snapshotOf(documentKey, SMALL))
      expect(double.writes[0]?.documentKey, JSON.stringify(documentKey)).toBe(documentKey)
    }
  })

  it('keeps two keys apart for one and the same document', () => {
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    saveDocumentSnapshot(double.store, snapshotOf('doc-2', SMALL))
    expect(double.writes.map((write) => write.documentKey)).toEqual(['doc-1', 'doc-2'])
  })

  it('splits three states into the two an attempt can answer with (one case walks FR-061)', () => {
    const observed = new Set<string>()
    observed.add(saveDocumentSnapshot(storeDouble().store, snapshotOf('doc-1', SMALL)).kind)
    for (const fault of STORE_FAULTS) {
      const double = storeDouble({ writeFault: fault.code })
      observed.add(saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL)).kind)
    }
    for (const state of FR_061_STATES) {
      expect(observed.has(state.state), `FR-061 の「${state.state}」`).toBe(
        state.isOutcomeOfOneAttempt,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// FR-028 / AG-8 / 表 T-037 -- a failure is a value, and it names the next step
// ---------------------------------------------------------------------------

describe('FR-028 -- a failure comes back as a value, never as a throw', () => {
  it('reports `failed` with the code the store gave (one case walks both codes)', () => {
    for (const fault of STORE_FAULTS) {
      const double = storeDouble({ writeFault: fault.code })
      const outcome = saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
      expect(outcome, `${fault.limitation} -> ${fault.code}`).toEqual({
        kind: 'failed',
        code: fault.code,
      })
      expect(Object.keys(outcome).sort()).toEqual(['code', 'kind'])
      expect(double.writes, 'the write was attempted before it failed').toHaveLength(1)
    }
  })

  it('throws nothing on either path, whatever the store answers', () => {
    for (const fault of STORE_FAULTS) {
      const writing = storeDouble({ writeFault: fault.code })
      expect(() => saveDocumentSnapshot(writing.store, snapshotOf('doc-1', SMALL))).not.toThrow()
      const reading = storeDouble({ readFault: fault.code })
      expect(() => restoreDocumentSnapshot(reading.store)).not.toThrow()
    }
    const holdingRubbish = storeDouble({ held: { documentKey: 'doc-1', text: 'not a document' } })
    expect(() => restoreDocumentSnapshot(holdingRubbish.store)).not.toThrow()
  })

  it('answers every row of 表 T-037 that binds here, and leaves the other four alone', () => {
    const failure = saveDocumentSnapshot(
      storeDouble({ writeFault: 'capacityExceeded' }).store,
      snapshotOf('doc-1', SMALL),
    )
    const refusal = broken(
      restoreDocumentSnapshot(
        storeDouble({ held: { documentKey: 'doc-1', text: '{' } }).store,
      ),
    )
    for (const row of T_037) {
      if (!row.bindsHere) continue
      if (row.row === 'NT-1') {
        // 「どの項目が、なぜ誤りかを文字で示すこと（MUST）」
        expect(refusal.faults.length, row.what).toBeGreaterThan(0)
        for (const fault of refusal.faults) {
          expect(typeof fault.at, row.what).toBe('string')
          expect(fault.what.trim().length, row.what).toBeGreaterThan(0)
        }
      }
      if (row.row === 'NT-3a') {
        // 「次に取れる手段を添えること（MUST）」 -- the raiser picks the step, so
        // what leaves is a code and not a sentence (FR-038 names no store of
        // translated strings).
        expect(failure.kind, row.what).toBe('failed')
        expect(
          STORE_FAULTS.map((fault) => String(fault.code)),
          row.what,
        ).toContain(failure.kind === 'failed' ? failure.code : '')
      }
      if (row.row === 'NT-6') {
        // 「資源の上限に達したとき」 -- LM-4's ceiling has its own code, told
        // apart from a store that cannot be reached at all.
        expect(failure, row.what).toEqual({ kind: 'failed', code: 'capacityExceeded' })
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-211 -- no row caps a snapshot, so no ceiling is invented here
// ---------------------------------------------------------------------------

describe('表 T-211 -- the only ceiling that bites belongs to the store, after the fact', () => {
  it('takes the whole bundled template, 1000 tasks and nearly a megabyte', () => {
    // S-113 〜 S-115 are FR-023's ceilings on an IMPORT; S-112 is the shell's
    // idle boundary. No row of 表 T-211 caps a stored snapshot, so nothing here
    // may refuse one for its size -- LM-4's ceiling is reported by the store.
    const double = storeDouble()
    const outcome = saveDocumentSnapshot(double.store, snapshotOf('doc-1', WHOLE))
    expect(saved(outcome).savedAt).toBe(SAVED_AT)
    expect((double.writes[0]?.text ?? '').length).toBeGreaterThan(100000)
  })

  it('reports a full store even for a tiny document -- the size is not measured here', () => {
    const empty = documentOf(JSON.stringify(rootSized(0)))
    const double = storeDouble({ writeFault: 'capacityExceeded' })
    expect(saveDocumentSnapshot(double.store, snapshotOf('doc-1', empty))).toEqual({
      kind: 'failed',
      code: 'capacityExceeded',
    })
  })

  it('carries an empty, a one-element and a whole schedule alike (one case walks the sizes)', () => {
    const sizes = [
      { why: 'every array of the schedule empty', document: documentOf(JSON.stringify(rootSized(0))) },
      { why: 'one element in every array', document: documentOf(JSON.stringify(rootSized(1))) },
      { why: 'the bundled template whole', document: WHOLE },
    ]
    for (const size of sizes) {
      const double = storeDouble()
      expect(
        saveDocumentSnapshot(double.store, snapshotOf('doc-1', size.document)).kind,
        size.why,
      ).toBe('saved')
      expect(restored(restoreDocumentSnapshot(double.store)).document, size.why).toEqual(
        size.document,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// restoreDocumentSnapshot -- BT-3 of 表 T-034
// ---------------------------------------------------------------------------

describe('restoreDocumentSnapshot -- what BT-3 of 表 T-034 offers', () => {
  it('gives back the key and the decoded document', () => {
    const double = storeDouble({ held: { documentKey: 'doc-1', text: SMALL_TEXT } })
    const outcome = restored(restoreDocumentSnapshot(double.store))
    expect(outcome.documentKey).toBe('doc-1')
    expect(outcome.document).toEqual(SMALL)
    expect(Object.keys(outcome).sort()).toEqual(['document', 'documentKey', 'kind'])
  })

  it('asks the store once, and passes it no key (表 T-034 の closing note)', () => {
    // 「別の文書なら触らない」 is a sentence about an autosave found BEFORE its
    // owner is known, so a read that had to be told the key could never reach
    // that case.
    const double = storeDouble({ held: { documentKey: 'doc-1', text: SMALL_TEXT } })
    restoreDocumentSnapshot(double.store)
    expect(double.readArgumentCounts).toEqual([0])
  })

  it('writes nothing at all -- restoring is not installing (MS-1 of 表 T-042)', () => {
    for (const held of [
      null,
      { documentKey: 'doc-1', text: SMALL_TEXT },
      { documentKey: 'doc-1', text: 'not a document' },
      { documentKey: null, text: SMALL_TEXT },
    ] as (StoredSnapshot | null)[]) {
      const double = storeDouble({ held })
      restoreDocumentSnapshot(double.store)
      expect(double.writes, JSON.stringify(held?.documentKey ?? null)).toHaveLength(0)
    }
  })

  it('answers `none` for a store that is reachable and holds nothing', () => {
    const double = storeDouble({ held: null })
    expect(restoreDocumentSnapshot(double.store)).toEqual({ kind: 'none' })
  })

  it('reads back what a save put in, so the round trip closes (FR-024 / WY-1)', () => {
    const double = storeDouble()
    saveDocumentSnapshot(double.store, snapshotOf('doc-1', SMALL))
    const outcome = restored(restoreDocumentSnapshot(double.store))
    expect(outcome.documentKey).toBe('doc-1')
    expect(outcome.document).toEqual(SMALL)
  })

  it('treats the empty string as a key like any other -- only `null` means unknown', () => {
    const double = storeDouble({ held: { documentKey: '', text: SMALL_TEXT } })
    const outcome = restored(restoreDocumentSnapshot(double.store))
    expect(outcome.documentKey).toBe('')
  })
})

// ---------------------------------------------------------------------------
// FR-026 -- a broken snapshot is never dropped in silence
// ---------------------------------------------------------------------------

describe('FR-026 -- ⛔「保存された内容が壊れているとき、黙って破棄してはならない」', () => {
  it('answers `broken`, never `none`, for every text that is not a document', () => {
    for (const { why, text } of everyBrokenText()) {
      const double = storeDouble({ held: { documentKey: 'doc-1', text } })
      const outcome = restoreDocumentSnapshot(double.store)
      expect(outcome.kind, why).toBe('broken')
      expect(broken(outcome).documentKey, why).toBe('doc-1')
    }
  })

  it('names which item is wrong, and why in words (NT-1 of 表 T-037)', () => {
    for (const { why, text } of everyBrokenText()) {
      const faults = broken(
        restoreDocumentSnapshot(storeDouble({ held: { documentKey: 'doc-1', text } }).store),
      ).faults
      expect(faults.length, why).toBeGreaterThan(0)
      for (const fault of faults) {
        expect(typeof fault.at, why).toBe('string')
        expect(typeof fault.what, why).toBe('string')
        expect(fault.what.trim().length, `${why}: ${JSON.stringify(fault)}`).toBeGreaterThan(0)
        expect(fault.what, why).not.toBe(fault.at)
      }
    }
  })

  it('names the missing root key itself (one case walks 表 T-052 の DR-1 〜 DR-4)', () => {
    for (const { why, text, at } of everyBrokenText()) {
      if (at === undefined) continue
      const faults = broken(
        restoreDocumentSnapshot(storeDouble({ held: { documentKey: 'doc-1', text } }).store),
      ).faults
      expect(
        faults.map((fault) => fault.at),
        why,
      ).toContain(at)
    }
  })

  it('reports a snapshot whose owner the store cannot name, rather than an empty store', () => {
    // StoredSnapshot admits `documentKey: null`. FR-061's MUST NOT forbids
    // guessing whose it is, so it cannot stand as BT-3's candidate -- and
    // FR-026's MUST NOT forbids reporting it as though nothing were there.
    const double = storeDouble({ held: { documentKey: null, text: SMALL_TEXT } })
    const outcome = restoreDocumentSnapshot(double.store)
    expect(outcome.kind).toBe('broken')
    expect(broken(outcome).documentKey).toBeNull()
    expect(Array.isArray(broken(outcome).faults)).toBe(true)
  })

  it('keeps a store that cannot be reached apart from one that is empty (LM-14)', () => {
    // 「保管庫の読み出しを拒否するブラウザもある」. An empty store says there is
    // nothing to recover; an unreachable one says it is not known whether there
    // is. One answer for both would drop a stored document in silence.
    for (const fault of STORE_FAULTS) {
      const double = storeDouble({ readFault: fault.code })
      const outcome = restoreDocumentSnapshot(double.store)
      expect(outcome, `${fault.limitation} -> ${fault.code}`).toEqual({
        kind: 'unavailable',
        code: fault.code,
      })
      expect(outcome.kind, 'an unreachable store is not an empty one').not.toBe('none')
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-075 -- the purities UF-43 declares
// ---------------------------------------------------------------------------

describe('the declared purities -- neither member writes into what it was handed', () => {
  it('saveDocumentSnapshot leaves its argument as it found it', () => {
    const document = documentOf(SMALL_TEXT)
    const snapshot = deepFreeze(snapshotOf('doc-1', document))
    const before = structuredClone(document) as Document
    expect(() => saveDocumentSnapshot(storeDouble().store, snapshot)).not.toThrow()
    expect(snapshot.document).toEqual(before)
  })

  it('restoreDocumentSnapshot leaves the stored snapshot as the store handed it', () => {
    const held = deepFreeze<StoredSnapshot>({ documentKey: 'doc-1', text: SMALL_TEXT })
    const double = storeDouble({ held })
    expect(() => restoreDocumentSnapshot(double.store)).not.toThrow()
    expect(held).toEqual({ documentKey: 'doc-1', text: SMALL_TEXT })
  })

  it('hands back documents that do not share storage with one another (LM-6)', () => {
    // 「自動保存は、同じ機の他のローカルページからも読める」 -- two reads are two
    // answers, and one caller writing into its own must not reach the other's.
    const double = storeDouble({ held: { documentKey: 'doc-1', text: SMALL_TEXT } })
    const one = restored(restoreDocumentSnapshot(double.store)).document
    const other = restored(restoreDocumentSnapshot(double.store)).document
    expect(one).toEqual(other)
    expect(one.schedule).not.toBe(other.schedule)
  })
})

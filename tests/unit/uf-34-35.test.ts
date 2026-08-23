// Unit tests for UF-34 `document-codec.ts` (the public entry) and UF-35
// `json-codec.ts` (the `GRS JSON` half) -- table T-075 of
// docs/spec/05-07-design.md, component `DocumentCodec` (CP-20 of table T-062),
// published as PI-20 of table T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md, §1). What was read: docs/spec/ for every rule below, and
// of the unit itself only its head comment, its two published types
// (`JsonFault`, `JsonDecoding`) and the two signatures
// `documentFromJson(text: string): JsonDecoding` and
// `jsonFromDocument(document: Document): string`. Every expected value here
// comes from a requirement or a table, never from the implementation.
//
// The rules these cases answer to:
//   表 T-052   the shape of the document root. DR-1 the three groups and
//              nothing beside them, DR-2 the twelve keys of the schedule-data
//              group, DR-3 the presentation group, DR-4 the three stamp keys
//              (`schemaVersion` a string), DR-5 the theme hue is the
//              project's, never the presentation group's
//   FR-024     the root follows table T-052 (MUST); a setting is written even
//              when it equals its default (MUST); a null column of the
//              schedule-data group is written key and all (MUST) and its key
//              may not be dropped (MUST NOT)
//   FR-073     the format version is a date, `YYYY-MM-DD` (or
//              `YYYY-MM-DDTHH:MM` for a second revision on one day), never
//              seconds, and is told apart by comparing plain strings (MUST)
//   表 T-037   NT-1: a notice must say WHICH item is wrong and why, in words
//              (MUST) -- so a `JsonFault` names a JSON pointer
//   FR-021     the round trip loses nothing; 表 T-024 IO-2 makes `GRS JSON`
//              the tool's own format and 表 T-003 CN-5 makes it UTF-8, no BOM
//   FR-027     the bundled template (BT-4 of 表 T-034) is a real `GRS JSON`
//              document, so it is the input data these cases are driven by
//   表 T-220   its PREAMBLE, in Chapter 6.1 -- the five rules it gained on
//              2026-08-24. The generated schema is to be RUN on the road that
//              reads `GRS JSON` (MUST) and run by the side that assembles the
//              document, `CP-20` (MUST); the `documentSettings` group may not
//              be held to an unknown-key or a missing-key condition (MUST
//              NOT); that group takes only the per-key type and the enum the
//              manuscript spells (MUST) and may not be refused for breaking a
//              bound (MUST NOT); and the MSPDI road is left alone
//   表 T-233   RS-25, the row this refusal carries, manner `NT-1`. FR-076 has
//              a telling carry a row of that table and forbids carrying one
//              the table does not hold (MUST NOT)
//   表 T-024a  OP-6 -- what a reader owes a presentation group that is short a
//              key or carries one nobody knows. The MUST NOT above and this
//              row are the same rule seen from its two sides
//
// ⭐ WHAT DRIVES THE SETTINGS CASES. Not a copy of tbl-settings.md: which keys
// carry an enum, which carry a bound, and what each one's default is are read
// out of the GENERATED artifacts -- `documentSchema` (the fixture's copy of
// `_source/grs-document.schema.json`) and `SETTINGS_DEFAULTS` / `SETTINGS_BOUNDS`,
// which `tools/generate_entity_types.py` writes out of `_source/settings.json`.
// A key added to the manuscript therefore walks into these cases on its own.
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one test walking every row. T_052_ROOT,
// T_052_DR2 and T_FR073_ORDER below are those copies.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromJson,
  jsonFromDocument,
  type AppShellSource,
  type JsonDecoding,
  type JsonFault,
} from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_BOUNDS,
  SETTINGS_DEFAULTS,
} from '../../src/entity/document-model/document-settings/document-settings'
import { documentSchema, validateDocument } from '../fixtures/grs-document'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * 表 T-052 の DR-1 〜 DR-4 -- the five keys the root carries, and nothing else.
 * DR-2 gives `schedule`, DR-3 `documentSettings`, DR-4 the three of the stamp.
 */
const T_052_ROOT = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'documentStamp',
  'changeLog',
] as const

/**
 * 表 T-052 の DR-2 -- 「鍵を `schedule` とし、その下に ... の 12 を置くこと
 * （MUST）」. ⚠️ The row itself notes there is no `dependencies` key: a
 * dependency is nested under its successor Task (表 T-053 の DF-4).
 */
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
 * FR-073: 「形式の版は日付とすること（MUST）。書式は `YYYY-MM-DD` とし、同じ日に
 * 2 度改めるときだけ `YYYY-MM-DDTHH:MM` を許す（MUST）。秒を書いてはならない
 * （MUST NOT）」.
 */
const FR_073_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/

/**
 * FR-073: 「判別は文字列の大小で行うこと（MUST）」 and 「⚠️ 短いほうが前になる
 * ので、`YYYY-MM-DD` と `YYYY-MM-DDTHH:MM` が混じっても順序は壊れない」.
 * Listed oldest first.
 */
const T_FR073_ORDER = [
  '2025-12-31',
  '2026-01-01',
  '2026-08-18',
  '2026-08-18T09:00',
  '2026-08-18T17:30',
  '2026-08-19',
  '2027-01-01',
] as const

// ---------------------------------------------------------------------------
// What the GENERATED schema says. Read out of it, never copied beside it.
// ---------------------------------------------------------------------------

/** As much of a JSON Schema node as these cases look at. */
interface SchemaNode {
  readonly type?: string | readonly string[]
  readonly enum?: readonly unknown[]
  readonly properties?: Readonly<Record<string, SchemaNode>>
  readonly $defs?: Readonly<Record<string, SchemaNode>>
}

const SCHEMA = documentSchema as SchemaNode
const SETTINGS_SCHEMA = SCHEMA.properties?.['documentSettings']
const TASK_SCHEMA = SCHEMA.$defs?.['Task']

/** The JSON types a node admits, always as a list. */
function typesOf(node: SchemaNode | undefined): readonly string[] {
  const held = node?.type
  if (held === undefined) return []
  return typeof held === 'string' ? [held] : held
}

/**
 * A value whose JSON type the node does NOT admit, or `undefined` where the
 * node states no type at all (a row that is an enum and nothing else).
 *
 * ⭐ Worked out FROM the node, so a column whose manuscript type changes gets
 * a different wrong value with no edit here. ⚠️ `null` is never the candidate:
 * a nullable column admits it, and DR-2's whole point is that it is a value.
 */
function ofTheWrongType(node: SchemaNode | undefined): unknown {
  const admits = typesOf(node)
  if (admits.length === 0) return undefined
  const candidates: readonly (readonly [unknown, string])[] = [
    ['not a value of this column', 'string'],
    [true, 'boolean'],
    [{}, 'object'],
  ]
  return candidates.find(([, name]) => !admits.includes(name))?.[0]
}

/**
 * A value of the enum's OWN type that the enum does not hold, or `undefined`
 * where the node spells no enum.
 *
 * ⭐ Of the enum's own type on purpose: a string handed to a numeric enum
 * would be refused by the type alone, which would prove nothing about the
 * enum. The preamble of 表 T-220 admits an enum only where the manuscript
 * spells the values, so what has to be shown is that a well-typed stranger is
 * turned away.
 */
function outsideTheEnum(node: SchemaNode | undefined): unknown {
  const held = node?.enum
  if (held === undefined || held.length === 0) return undefined
  const candidates: readonly unknown[] =
    typeof held[0] === 'number' ? [0, -1, 99] : ['aValueNoRowSpells', 'x']
  return candidates.find((candidate) => !held.includes(candidate))
}

/** The `documentSettings` keys the generated schema spells an enum for. */
const SETTINGS_ENUM_KEYS: readonly string[] = Object.keys(SETTINGS_SCHEMA?.properties ?? {}).filter(
  (key) => SETTINGS_SCHEMA?.properties?.[key]?.enum !== undefined,
)

// ---------------------------------------------------------------------------
// The document these cases are driven by.
// ---------------------------------------------------------------------------

// BT-4 of 表 T-034 -- the one template FR-027 keeps, held as bundled `GRS JSON`
// because 「コードの中に文書を組み立てる手続きを書いてはならない（MUST NOT）」.
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
const TEMPLATE = JSON.parse(TEMPLATE_TEXT) as Record<string, unknown>

type Root = Record<string, unknown>
type Group = Record<string, unknown>

const templateSchedule = TEMPLATE['schedule'] as Group
const templateSettings = TEMPLATE['documentSettings'] as Group

/**
 * The same root with the schedule's arrays cut down to two entries each. Every
 * key of 表 T-052 is still there and every value still has the type its column
 * gives; only the number of rows differs, so a case that walks 98 settings keys
 * does not re-serialise a thousand tasks 98 times.
 */
const SMALL: Root = {
  ...TEMPLATE,
  schedule: Object.fromEntries(
    Object.entries(templateSchedule).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.slice(0, 2) : value,
    ]),
  ),
}

const textOf = (root: unknown): string => JSON.stringify(root)

/** The root, minus one key, as text. */
function rootWithout(base: Root, key: string): string {
  const rest: Root = { ...base }
  delete rest[key]
  return textOf(rest)
}

/** The root, with one group replaced. */
function rootWith(base: Root, key: string, group: unknown): string {
  return textOf({ ...base, [key]: group })
}

/** A group of the root, minus one key. */
function groupWithout(group: Group, key: string): Group {
  const rest: Group = { ...group }
  delete rest[key]
  return rest
}

// ---------------------------------------------------------------------------
// Reading the two published shapes without asserting them into place.
// ---------------------------------------------------------------------------

function accepted(text: string): Document {
  const read: JsonDecoding = documentFromJson(text)
  if (!read.ok) {
    throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

/**
 * The whole refusal, so that the reason it carries can be read beside the
 * faults. ⭐ 表 T-233 makes the reason a row id and FR-076 forbids carrying
 * one the table does not hold, so the row is part of what a refusal IS.
 */
function refusal(text: string): { readonly reason: string; readonly faults: readonly JsonFault[] } {
  const read: JsonDecoding = documentFromJson(text)
  if (read.ok) throw new Error('expected a refusal, was accepted')
  return { reason: read.reason, faults: read.faults }
}

function refused(text: string): readonly JsonFault[] {
  return refusal(text).faults
}

/** Every text below that the specification says is not a `GRS JSON` document. */
function everyRefusalText(): readonly { readonly why: string; readonly text: string }[] {
  const notJson = ['', '   ', 'hello', '{', '{"schedule":', '[1,2', '{} {}'].map((text) => ({
    why: `not JSON at all: ${JSON.stringify(text)}`,
    text,
  }))
  const notAnObject = ['null', 'true', '42', '"a document"', '[]', '[{}]'].map((text) => ({
    why: `a root that is not an object: ${text}`,
    text,
  }))
  const missingRoot = T_052_ROOT.map((key) => ({
    why: `the root is missing ${key}`,
    text: rootWithout(SMALL, key),
  }))
  return [
    ...notJson,
    ...notAnObject,
    ...missingRoot,
    { why: 'a sixth key beside the five', text: textOf({ ...SMALL, sixthKey: 1 }) },
  ]
}

/** Deep-freezes so that a write into the argument throws rather than passing. */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}

// ---------------------------------------------------------------------------
// The rosters themselves, before anything walks them
// ---------------------------------------------------------------------------

describe('the rosters these cases walk are the ones the tables state', () => {
  // ⛔ A walk over an empty roster passes without asserting anything. These
  // three pin the counts so a vacuous case cannot go green.
  it('carries five root keys (DR-1 〜 DR-4), twelve schedule keys (DR-2)', () => {
    expect(T_052_ROOT).toHaveLength(5)
    expect(T_052_DR2).toHaveLength(12)
    expect(new Set(T_052_ROOT).size).toBe(5)
    expect(new Set(T_052_DR2).size).toBe(12)
  })

  it('reads a bundled template that is a whole `GRS JSON` document (FR-027)', () => {
    expect(validateDocument(TEMPLATE).errors).toEqual([])
    expect(Object.keys(templateSettings).length).toBeGreaterThan(0)
    expect(everyRefusalText().length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// UF-34 -- the public entry (PI-20 of 表 T-064, IF-8 of 表 T-065)
// ---------------------------------------------------------------------------

describe('UF-34 document-codec.ts -- the public entry', () => {
  it('publishes the GRS JSON pair of PI-20 (表 T-064)', () => {
    expect(typeof documentFromJson).toBe('function')
    expect(typeof jsonFromDocument).toBe('function')
  })

  it('publishes the AppShellSource seam of IF-8 (表 T-065)', () => {
    // Type-only: 表 T-065 names the interface, and Chapter 5.3 makes this file
    // the only door out of the folder. That this compiles is the assertion.
    const seam: AppShellSource | null = null
    expect(seam).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 表 T-052 の DR-1 -- the five root keys, and no sixth
// ---------------------------------------------------------------------------

describe('DR-1 of 表 T-052 -- the root holds the three groups and nothing else', () => {
  it('reads the bundled template (FR-027) and gives back the five root keys', () => {
    const document = accepted(TEMPLATE_TEXT)
    expect(Object.keys(document).sort()).toEqual([...T_052_ROOT].sort())
  })

  it('writes the five root keys, and only those (one case walks 表 T-052)', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    expect(Object.keys(written).sort()).toEqual([...T_052_ROOT].sort())
    for (const key of T_052_ROOT) expect(written).toHaveProperty(key)
  })

  it('refuses a root that carries a sixth key, and names it (NT-1 of 表 T-037)', () => {
    const faults = refused(textOf({ ...SMALL, exportedBySomethingElse: 1 }))
    expect(faults.map((f) => f.at)).toContain('/exportedBySomethingElse')
  })

  it('refuses each of the five missing in turn, naming the one that is gone', () => {
    for (const key of T_052_ROOT) {
      const faults = refused(rootWithout(SMALL, key))
      expect(faults.map((f) => f.at), `the root without ${key}`).toContain(`/${key}`)
    }
  })

  it('DR-4 keeps the changeLog at the positions its ordinals name (AT-130 of 表 T-058)', () => {
    // 表 T-058 の `AT-130`: 「`changeLog` / `ordinal` / 整数 / PK / 文書の中での
    // 出現順」. The key IS the position, so a round trip may neither renumber
    // the entries nor reorder them -- if it could, the key would be saying
    // something the document does not.
    const entries = [0, 1, 2].map((ordinal) => ({
      ordinal,
      editedBy: ordinal === 1 ? 'agent' : 'user',
      explanation: `step ${ordinal}`,
      changedUtc: `2026-08-17T00:00:0${ordinal}Z`,
    }))
    const document = accepted(textOf({ ...SMALL, changeLog: entries }))

    // Read: every entry sits where its own key says it does.
    document.changeLog.forEach((entry, index) => {
      expect(entry.ordinal, `entry at index ${index}`).toBe(index)
    })
    expect(document.changeLog.map((entry) => entry.explanation)).toEqual([
      'step 0',
      'step 1',
      'step 2',
    ])

    // Written back: the same positions, the same order, nothing renumbered.
    const written = JSON.parse(jsonFromDocument(document)) as Root
    expect(written['changeLog']).toEqual(entries)
  })

  it('refuses a root that is not an object at all', () => {
    for (const text of ['null', 'true', '42', '"a document"', '[]', '[{}]']) {
      expect(refused(text).length, text).toBeGreaterThan(0)
    }
  })

  it('refuses text that is not JSON at all', () => {
    for (const text of ['', '   ', 'hello', '{', '{"schedule":', '[1,2', '{} {}']) {
      expect(refused(text).length, JSON.stringify(text)).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// 表 T-052 の DR-2 -- the twelve of the schedule-data group
// ---------------------------------------------------------------------------

describe('DR-2 of 表 T-052 -- the twelve keys under `schedule`', () => {
  it('reads back exactly the twelve DR-2 names', () => {
    const document = accepted(TEMPLATE_TEXT)
    expect(Object.keys(document.schedule).sort()).toEqual([...T_052_DR2].sort())
  })

  it('writes exactly the twelve DR-2 names', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    const schedule = written['schedule'] as Group
    expect(Object.keys(schedule).sort()).toEqual([...T_052_DR2].sort())
  })

  it('has no `dependencies` key of its own -- it is nested under the successor Task (DF-4)', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    const schedule = written['schedule'] as Group
    expect(T_052_DR2).not.toContain('dependencies')
    expect(schedule['dependencies']).toBeUndefined()
    const tasks = schedule['tasks'] as Group[]
    expect(Array.isArray(tasks[0]?.['dependencies'])).toBe(true)
  })

  it('refuses each of the twelve missing in turn, naming the one that is gone', () => {
    for (const key of T_052_DR2) {
      const text = rootWith(SMALL, 'schedule', groupWithout(SMALL['schedule'] as Group, key))
      const faults = refused(text)
      expect(faults.map((f) => f.at), `the schedule without ${key}`).toContain(`/schedule/${key}`)
    }
  })

  it('refuses a `schedule` that is not an object', () => {
    for (const value of [null, 42, 'schedule', [], true]) {
      expect(refused(rootWith(SMALL, 'schedule', value)).length, String(value)).toBeGreaterThan(0)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-024 -- the presentation group is written whole, every time
// ---------------------------------------------------------------------------

describe('FR-024 -- every key of the presentation group is written', () => {
  it('writes every settings key the document carried, defaults included', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    const settings = written['documentSettings'] as Group
    expect(Object.keys(settings).sort()).toEqual(Object.keys(templateSettings).sort())
    // 「設定値は既定値と一致していても省略せず、常に全項目を書き出すこと（MUST）」:
    // the template's values ARE the decided defaults, so none of them may be
    // dropped on the way out.
    expect(Object.keys(settings).length).toBe(Object.keys(templateSettings).length)
  })

  // ⭐ THIS CASE WAS THE ONE RED, AND THE DEBT WAS ITS OWN. It used to set
  // EVERY number key to 0, `exportPngScale` among them -- and that key is one
  // of the six the manuscript spells the values of, so 0 is not a number below
  // a bound but a value no row holds. The preamble of 表 T-220 admits the
  // enum as one of the two conditions this group may be held to, so refusing
  // it is the rule being kept, not broken. ⛔ Not a defect in the unit: the enum keys are
  // taken out of the walk, read from the generated schema so the roster
  // follows the manuscript. The bound keys STAY in -- 0 below a minimum is
  // exactly what may not be refused, and the case below says so on its own.
  it('writes a settings key whose value is `false` or `0` rather than dropping it', () => {
    const zeroed: Group = { ...templateSettings }
    const falseKeys = Object.keys(zeroed).filter((k) => typeof zeroed[k] === 'boolean')
    const numberKeys = Object.keys(zeroed).filter(
      (k) => typeof zeroed[k] === 'number' && !SETTINGS_ENUM_KEYS.includes(k),
    )
    expect(falseKeys.length, 'the presentation group has a boolean').toBeGreaterThan(0)
    expect(numberKeys.length, 'the presentation group has a number').toBeGreaterThan(0)
    for (const key of falseKeys) zeroed[key] = false
    for (const key of numberKeys) zeroed[key] = 0
    const written = JSON.parse(
      jsonFromDocument(accepted(rootWith(SMALL, 'documentSettings', zeroed))),
    ) as Root
    const settings = written['documentSettings'] as Group
    for (const key of [...falseKeys, ...numberKeys]) expect(settings).toHaveProperty(key)
  })

  // ⚠️ The MUST of FR-024 binds the WRITER, not the reader. `OP-6` of 表 T-024a
  // (FR-087, :3166) settles the reading side the other way -- 「欠けている設定値
  // は既定値で補い、知らないキーは捨てずに保つ（往復で失わないため）」 -- so a
  // presentation group short of a key is NOT a refusal. Filling in the default
  // is `ImportDocument`'s (CP-10, the component FR-087 hangs from), which is
  // reached through this codec; what this unit owes is to let it through.
  it('accepts a presentation group missing one key -- OP-6 fills it, not this unit', () => {
    for (const key of Object.keys(templateSettings)) {
      const text = rootWith(SMALL, 'documentSettings', groupWithout(templateSettings, key))
      expect(documentFromJson(text).ok, `the presentation group without ${key}`).toBe(true)
    }
  })

  it('accepts a presentation key it does not know (OP-6: 知らないキーは捨てずに保つ)', () => {
    const withUnknown: Group = { ...templateSettings, keyFromALaterVersion: 7 }
    const text = rootWith(SMALL, 'documentSettings', withUnknown)
    expect(documentFromJson(text).ok).toBe(true)
  })

  it('carries an unknown presentation key through the round trip (OP-6: 往復で失わない)', () => {
    const withUnknown: Group = { ...templateSettings, keyFromALaterVersion: 7 }
    const document = accepted(rootWith(SMALL, 'documentSettings', withUnknown))
    const written = JSON.parse(jsonFromDocument(document)) as Root
    const settings = written['documentSettings'] as Group
    expect(settings['keyFromALaterVersion']).toBe(7)
  })

  it('writes a null column of the schedule-data group key and all (MUST NOT drop it)', () => {
    const document = accepted(TEMPLATE_TEXT)
    const before = (TEMPLATE['schedule'] as Group)['tasks'] as Group[]
    const nullColumns = Object.keys(before[0] ?? {}).filter((k) => before[0]?.[k] === null)
    expect(nullColumns.length, 'the template has a task with null columns').toBeGreaterThan(0)

    const written = JSON.parse(jsonFromDocument(document)) as Root
    const after = ((written['schedule'] as Group)['tasks'] as Group[])[0] as Group
    for (const key of nullColumns) {
      expect(Object.hasOwn(after, key), `${key} keeps its key`).toBe(true)
      expect(after[key], `${key} keeps its null`).toBeNull()
    }
    // The whole roster of columns, not just the null ones: a dropped key and a
    // `0` may not become indistinguishable (the row's own reason, FR-021).
    expect(Object.keys(after).sort()).toEqual(Object.keys(before[0] ?? {}).sort())
  })

  it('keeps the theme hue on the project and out of the presentation group (DR-5)', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    const project = (written['schedule'] as Group)['project'] as Group
    const settings = written['documentSettings'] as Group
    expect(typeof project['themeHue']).toBe('number')
    expect(Object.hasOwn(settings, 'themeHue')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 表 T-220 の前文 -- the generated schema is RUN, here, and held back from
// the presentation group's key set and bounds
// ---------------------------------------------------------------------------

/**
 * One `Task` column per row, each with a value of a type the manuscript does
 * not admit for it. Driven by the generated schema, so the roster follows
 * `_source/erd.json` rather than a copy of it.
 */
function everyTaskColumnOfTheWrongType(): readonly {
  readonly column: string
  readonly text: string
}[] {
  const tasks = (SMALL['schedule'] as Group)['tasks'] as Group[]
  const first = tasks[0] as Group
  return Object.keys(TASK_SCHEMA?.properties ?? {}).flatMap((column) => {
    if (!Object.hasOwn(first, column)) return []
    const wrong = ofTheWrongType(TASK_SCHEMA?.properties?.[column])
    if (wrong === undefined) return []
    const schedule = {
      ...(SMALL['schedule'] as Group),
      tasks: [{ ...first, [column]: wrong }, ...tasks.slice(1)],
    }
    return [{ column, text: rootWith(SMALL, 'schedule', schedule) }]
  })
}

/** The presentation group with one key moved to a value the schema forbids. */
function settingsWith(key: string, value: unknown): string {
  return rootWith(SMALL, 'documentSettings', { ...templateSettings, [key]: value })
}

describe('表 T-220 の前文 -- the schema runs on the `GRS JSON` road, in CP-20', () => {
  it('walks a roster the generated schema fills, not an empty one', () => {
    // ⛔ Same guard as the three above: a walk over nothing goes green.
    expect(Object.keys(TASK_SCHEMA?.properties ?? {}).length).toBeGreaterThan(0)
    expect(Object.keys(SETTINGS_SCHEMA?.properties ?? {}).length).toBeGreaterThan(0)
    expect(everyTaskColumnOfTheWrongType().length).toBeGreaterThan(0)
    expect(SETTINGS_ENUM_KEYS.length).toBeGreaterThan(0)
  })

  it('refuses a column whose type the manuscript does not admit, and names it', () => {
    // The preamble of 表 T-220 turns the schema from a claim into a duty: it
    // is to be RUN on this road (MUST). If it is not, every one of these is
    // quietly accepted and the exemption that table claims has nobody behind
    // it -- the column is enforced by no one.
    for (const { column, text } of everyTaskColumnOfTheWrongType()) {
      const faults = refused(text)
      expect(faults.map((f) => f.at), `a Task whose ${column} is of another type`).toContain(
        `/schedule/tasks/0/${column}`,
      )
    }
  })

  it('carries RS-25 as the reason of every refusal (FR-076: 同表に無い理由を運ばない)', () => {
    const texts = [
      ...everyRefusalText().map((one) => one.text),
      ...everyTaskColumnOfTheWrongType().map((one) => one.text),
    ]
    expect(texts.length).toBeGreaterThan(0)
    for (const text of texts) {
      // 表 T-233 の `RS-25` is the row written for this refusal.
      expect(refusal(text).reason, text.slice(0, 60)).toBe('RS-25')
    }
  })

  it('refuses a presentation value whose type is wrong (鍵ごとの型を当てる)', () => {
    let walked = 0
    for (const key of Object.keys(SETTINGS_SCHEMA?.properties ?? {})) {
      const wrong = ofTheWrongType(SETTINGS_SCHEMA?.properties?.[key])
      if (wrong === undefined) continue
      walked += 1
      const faults = refused(settingsWith(key, wrong))
      expect(faults.map((f) => f.at), `${key} of another type`).toContain(`/documentSettings/${key}`)
    }
    expect(walked).toBeGreaterThan(0)
  })

  it('refuses a presentation value no row of the manuscript enum spells (列挙を当てる)', () => {
    for (const key of SETTINGS_ENUM_KEYS) {
      const stranger = outsideTheEnum(SETTINGS_SCHEMA?.properties?.[key])
      expect(stranger, `a well-typed stranger for ${key}`).toBeDefined()
      const faults = refused(settingsWith(key, stranger))
      expect(faults.map((f) => f.at), `${key} outside its enum`).toContain(
        `/documentSettings/${key}`,
      )
    }
  })

  it('does NOT refuse a presentation value below its lower bound (MUST NOT)', () => {
    // The preamble of 表 T-220 forbids holding this group to a bound (MUST
    // NOT): `clampedSettings` (表 T-064 の `PI-2`) moves such a value inside
    // instead. ⚠️ Refusing would shut the whole document over one key of the
    // way it is shown, which is the opposite of the give `OP-6` asks for.
    let walked = 0
    for (const [key, bound] of Object.entries(SETTINGS_BOUNDS)) {
      // A dotted key sits inside a group; a key with an enum has no bound to
      // break. Neither is what this rule is about.
      if (key.includes('.') || SETTINGS_ENUM_KEYS.includes(key)) continue
      const floor = bound.min ?? bound.exclusiveMin
      if (floor === undefined) continue
      walked += 1
      expect(documentFromJson(settingsWith(key, floor - 1)).ok, `${key} below its floor`).toBe(true)
    }
    expect(walked).toBeGreaterThan(0)
  })

  it('does NOT refuse a presentation value above its upper bound (MUST NOT)', () => {
    let walked = 0
    for (const [key, bound] of Object.entries(SETTINGS_BOUNDS)) {
      if (key.includes('.') || SETTINGS_ENUM_KEYS.includes(key)) continue
      const ceiling = bound.max ?? bound.exclusiveMax
      if (ceiling === undefined) continue
      walked += 1
      expect(documentFromJson(settingsWith(key, ceiling + 1)).ok, `${key} above its ceiling`).toBe(
        true,
      )
    }
    expect(walked).toBeGreaterThan(0)
  })

  // ⛔ THE FILL ITSELF IS NOT THIS UNIT'S, AND THIS CASE DOES NOT ASK FOR IT.
  // 表 T-024a の `OP-6` -- which is where the filling-in is required -- hangs
  // from `FR-087`, and 表 T-062 gives `FR-087` to `CP-10` (UF-19),
  // a UseCase. What 表 T-220's preamble binds `CP-20` to is the other half:
  // NOT to refuse the short group (MUST NOT), so that the fill still has
  // something to run on. ⭐ So what is checked here is that the group arrives
  // at `CP-10` whole enough to fill -- every key the text carried, value for
  // value -- and the roster of defaults is walked only to name the keys.
  it('hands a short presentation group on with every key it did carry (OP-6 の受け皿)', () => {
    let walked = 0
    for (const key of Object.keys(SETTINGS_DEFAULTS)) {
      if (key.includes('.') || !Object.hasOwn(templateSettings, key)) continue
      walked += 1
      const short = groupWithout(templateSettings, key)
      const settings = accepted(
        rootWith(SMALL, 'documentSettings', short),
      ) as unknown as { readonly documentSettings: Group }
      for (const kept of Object.keys(short)) {
        expect(settings.documentSettings[kept], `${kept}, with ${key} away`).toEqual(short[kept])
      }
    }
    expect(walked).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// FR-073 -- the format version is a date, told apart as a plain string
// ---------------------------------------------------------------------------

describe('FR-073 -- `schemaVersion` is a date compared as a plain string', () => {
  it('carries the version through as the identical string (DR-4: 文字列とすること)', () => {
    const document = accepted(TEMPLATE_TEXT)
    expect(typeof document.schemaVersion).toBe('string')
    expect(document.schemaVersion).toBe(TEMPLATE['schemaVersion'])
    const written = JSON.parse(jsonFromDocument(document)) as Root
    expect(written['schemaVersion']).toBe(TEMPLATE['schemaVersion'])
  })

  it('the bundled document carries `YYYY-MM-DD` (or `T HH:MM`), never seconds', () => {
    expect(String(TEMPLATE['schemaVersion'])).toMatch(FR_073_FORMAT)
  })

  it('orders versions chronologically under plain string comparison (one case walks the roster)', () => {
    const shuffled = [...T_FR073_ORDER].slice().reverse()
    expect(shuffled.sort()).toEqual([...T_FR073_ORDER])
    for (let i = 1; i < T_FR073_ORDER.length; i += 1) {
      const older = T_FR073_ORDER[i - 1] as string
      const newer = T_FR073_ORDER[i] as string
      expect(older < newer, `${older} < ${newer}`).toBe(true)
    }
  })

  it('lets a decoded version be compared with the roster without a parser', () => {
    const version = accepted(TEMPLATE_TEXT).schemaVersion
    expect(version > '2025-12-31').toBe(true)
    expect(version < '2099-01-01').toBe(true)
  })
})

// ---------------------------------------------------------------------------
// NT-1 of 表 T-037 -- a notice says WHICH item is wrong, and why
// ---------------------------------------------------------------------------

describe('NT-1 of 表 T-037 -- a fault names the item and the reason', () => {
  it('names a JSON pointer, or the whole text when no item can be named', () => {
    for (const { why, text } of everyRefusalText()) {
      const faults = refused(text)
      expect(faults.length, why).toBeGreaterThan(0)
      for (const fault of faults) {
        expect(typeof fault.at, why).toBe('string')
        if (fault.at !== '') {
          expect(fault.at.startsWith('/'), `${why}: ${fault.at}`).toBe(true)
          expect(fault.at.includes('//'), `${why}: ${fault.at}`).toBe(false)
        }
      }
    }
  })

  it('says why in words, not by a marker alone (色や枠だけで示してはならない)', () => {
    for (const { why, text } of everyRefusalText()) {
      for (const fault of refused(text)) {
        expect(typeof fault.what, why).toBe('string')
        expect(fault.what.trim().length, `${why}: ${JSON.stringify(fault)}`).toBeGreaterThan(0)
        expect(fault.what, why).not.toBe(fault.at)
      }
    }
  })

  it('names the whole text when the text is not JSON at all', () => {
    for (const text of ['', 'hello', '{', '[1,2']) {
      const faults = refused(text)
      expect(faults.map((f) => f.at), JSON.stringify(text)).toContain('')
    }
  })

  it('never hands back both a document and faults', () => {
    const good = documentFromJson(TEMPLATE_TEXT)
    expect(good.ok).toBe(true)
    expect(good).not.toHaveProperty('faults')
    for (const { why, text } of everyRefusalText()) {
      const bad = documentFromJson(text)
      expect(bad.ok, why).toBe(false)
      expect(bad, why).not.toHaveProperty('document')
    }
  })
})

// ---------------------------------------------------------------------------
// The round trip -- FR-024 / FR-021, and CN-5 of 表 T-003
// ---------------------------------------------------------------------------

describe('the round trip -- write, then read, and get the same document', () => {
  it('gives back an equal document', () => {
    const first = accepted(TEMPLATE_TEXT)
    const again = accepted(jsonFromDocument(first))
    expect(again).toEqual(first)
  })

  it('settles after one turn -- the text of the second turn is the text of the first', () => {
    const once = jsonFromDocument(accepted(TEMPLATE_TEXT))
    const twice = jsonFromDocument(accepted(once))
    expect(twice).toBe(once)
  })

  it('writes a document the generated `GRS JSON` schema accepts', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as unknown
    const result = validateDocument(written)
    expect(result.errors).toEqual([])
    expect(result.valid).toBe(true)
  })

  it('carries text outside ASCII through unharmed (CN-5: UTF-8)', () => {
    const project = { ...(templateSchedule['project'] as Group), name: '日程 — Ünicode ✓' }
    const schedule = { ...(SMALL['schedule'] as Group), project }
    const document = accepted(rootWith(SMALL, 'schedule', schedule))
    const back = accepted(jsonFromDocument(document))
    expect(back.schedule.project.name).toBe('日程 — Ünicode ✓')
  })

  it('writes no byte order mark (CN-5: BOM なし。RFC 8259 が禁じている)', () => {
    const text = jsonFromDocument(accepted(TEMPLATE_TEXT))
    expect(text.charCodeAt(0)).not.toBe(0xfeff)
    expect(text.trimStart().startsWith('{')).toBe(true)
  })

  it('writes text that is JSON and nothing but JSON', () => {
    const text = jsonFromDocument(accepted(TEMPLATE_TEXT))
    expect(() => JSON.parse(text) as unknown).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// @purity pure -- both units declare it (表 T-075)
// ---------------------------------------------------------------------------

describe('@purity pure -- neither unit writes into what it was handed', () => {
  it('jsonFromDocument leaves its argument as it found it', () => {
    const document = deepFreeze(accepted(TEMPLATE_TEXT))
    const before = structuredClone(document) as Document
    expect(() => jsonFromDocument(document)).not.toThrow()
    expect(document).toEqual(before)
  })

  it('gives the same answer every time it is asked', () => {
    const document = accepted(TEMPLATE_TEXT)
    expect(jsonFromDocument(document)).toBe(jsonFromDocument(document))
    expect(accepted(TEMPLATE_TEXT)).toEqual(accepted(TEMPLATE_TEXT))
  })

  it('hands back documents that do not share storage with one another', () => {
    const one = accepted(TEMPLATE_TEXT) as unknown as Record<string, unknown>
    const other = accepted(TEMPLATE_TEXT) as unknown as Record<string, unknown>
    expect(one['schedule']).not.toBe(other['schedule'])
  })
})

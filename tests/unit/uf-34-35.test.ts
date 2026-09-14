// Unit tests for UF-34 `document-codec.ts` (the public entry) and UF-35

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


const T_052_ROOT = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'documentStamp',
  'changeLog',
] as const

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

const FR_073_FORMAT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/

const T_FR073_ORDER = [
  '2025-12-31',
  '2026-01-01',
  '2026-08-18',
  '2026-08-18T09:00',
  '2026-08-18T17:30',
  '2026-08-19',
  '2027-01-01',
] as const


interface SchemaNode {
  readonly type?: string | readonly string[]
  readonly enum?: readonly unknown[]
  readonly properties?: Readonly<Record<string, SchemaNode>>
  readonly $defs?: Readonly<Record<string, SchemaNode>>
}

const SCHEMA = documentSchema as SchemaNode
const SETTINGS_SCHEMA = SCHEMA.properties?.['documentSettings']
const TASK_SCHEMA = SCHEMA.$defs?.['Task']

function typesOf(node: SchemaNode | undefined): readonly string[] {
  const held = node?.type
  if (held === undefined) return []
  return typeof held === 'string' ? [held] : held
}

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

function outsideTheEnum(node: SchemaNode | undefined): unknown {
  const held = node?.enum
  if (held === undefined || held.length === 0) return undefined
  const candidates: readonly unknown[] =
    typeof held[0] === 'number' ? [0, -1, 99] : ['aValueNoRowSpells', 'x']
  return candidates.find((candidate) => !held.includes(candidate))
}

const SETTINGS_ENUM_KEYS: readonly string[] = Object.keys(SETTINGS_SCHEMA?.properties ?? {}).filter(
  (key) => SETTINGS_SCHEMA?.properties?.[key]?.enum !== undefined,
)


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

function rootWithout(base: Root, key: string): string {
  const rest: Root = { ...base }
  delete rest[key]
  return textOf(rest)
}

function rootWith(base: Root, key: string, group: unknown): string {
  return textOf({ ...base, [key]: group })
}

function groupWithout(group: Group, key: string): Group {
  const rest: Group = { ...group }
  delete rest[key]
  return rest
}


function accepted(text: string): Document {
  const read: JsonDecoding = documentFromJson(text)
  if (!read.ok) {
    throw new Error(`expected a document, was refused: ${JSON.stringify(read.faults)}`)
  }
  return read.document
}

function refusal(text: string): { readonly reason: string; readonly faults: readonly JsonFault[] } {
  const read: JsonDecoding = documentFromJson(text)
  if (read.ok) throw new Error('expected a refusal, was accepted')
  return { reason: read.reason, faults: read.faults }
}

function refused(text: string): readonly JsonFault[] {
  return refusal(text).faults
}

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

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const inner of Object.values(value as Record<string, unknown>)) deepFreeze(inner)
  return Object.freeze(value)
}


describe('the rosters these cases walk are the ones the tables state', () => {
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


describe('UF-34 document-codec.ts -- the public entry', () => {
  it('publishes the GRS JSON pair of PI-20 (表 T-064)', () => {
    expect(typeof documentFromJson).toBe('function')
    expect(typeof jsonFromDocument).toBe('function')
  })

  it('publishes the AppShellSource seam of IF-8 (表 T-065)', () => {
    const seam: AppShellSource | null = null
    expect(seam).toBeNull()
  })
})


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
    const entries = [0, 1, 2].map((ordinal) => ({
      ordinal,
      editedBy: ordinal === 1 ? 'agent' : 'user',
      explanation: `step ${ordinal}`,
      changedUtc: `2026-08-17T00:00:0${ordinal}Z`,
    }))
    const document = accepted(textOf({ ...SMALL, changeLog: entries }))

    document.changeLog.forEach((entry, index) => {
      expect(entry.ordinal, `entry at index ${index}`).toBe(index)
    })
    expect(document.changeLog.map((entry) => entry.explanation)).toEqual([
      'step 0',
      'step 1',
      'step 2',
    ])

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


describe('FR-024 -- every key of the presentation group is written', () => {
  it('writes every settings key the document carried, defaults included', () => {
    const written = JSON.parse(jsonFromDocument(accepted(TEMPLATE_TEXT))) as Root
    const settings = written['documentSettings'] as Group
    expect(Object.keys(settings).sort()).toEqual(Object.keys(templateSettings).sort())
    expect(Object.keys(settings).length).toBe(Object.keys(templateSettings).length)
  })

  it('writes a settings key whose value is `false` or `0` rather than dropping it', () => {
    const zeroed: Group = { ...templateSettings }
    const falseKeys = Object.keys(zeroed).filter((oneKey) => typeof zeroed[oneKey] === 'boolean')
    const numberKeys = Object.keys(zeroed).filter(
      (oneKey) => typeof zeroed[oneKey] === 'number' && !SETTINGS_ENUM_KEYS.includes(oneKey),
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
    const nullColumns = Object.keys(before[0] ?? {}).filter((oneKey) => before[0]?.[oneKey] === null)
    expect(nullColumns.length, 'the template has a task with null columns').toBeGreaterThan(0)

    const written = JSON.parse(jsonFromDocument(document)) as Root
    const after = ((written['schedule'] as Group)['tasks'] as Group[])[0] as Group
    for (const key of nullColumns) {
      expect(Object.hasOwn(after, key), `${key} keeps its key`).toBe(true)
      expect(after[key], `${key} keeps its null`).toBeNull()
    }
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

function settingsWith(key: string, value: unknown): string {
  return rootWith(SMALL, 'documentSettings', { ...templateSettings, [key]: value })
}

describe('表 T-220 の前文 -- the schema runs on the `GRS JSON` road, in CP-20', () => {
  it('walks a roster the generated schema fills, not an empty one', () => {
    expect(Object.keys(TASK_SCHEMA?.properties ?? {}).length).toBeGreaterThan(0)
    expect(Object.keys(SETTINGS_SCHEMA?.properties ?? {}).length).toBeGreaterThan(0)
    expect(everyTaskColumnOfTheWrongType().length).toBeGreaterThan(0)
    expect(SETTINGS_ENUM_KEYS.length).toBeGreaterThan(0)
  })

  it('refuses a column whose type the manuscript does not admit, and names it', () => {
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
    let walked = 0
    for (const [key, bound] of Object.entries(SETTINGS_BOUNDS)) {
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

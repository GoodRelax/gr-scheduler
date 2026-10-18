// CR-766 / CR-796 spec-only tests: the commands of table T-108 are one closed choice each in the second relay resource, grs-commands.schema.json; the MCP input of applyCommands (AM-7) holds the stamp and, per command, only its kind.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Ajv2020 } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'

import { printedCommands, type PrintedCommand, type PrintedValue } from './cr-766-printed-commands'
import { commandEnglish } from './cr-796-manuscript-english'
import { unbroken } from './spec-table'

type Json = Record<string, unknown>

const ROOT = process.cwd()
const DESCRIPTIONS = JSON.parse(
  readFileSync(join(ROOT, 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json'), 'utf8'),
) as { tools: { name: string; inputSchema: Json }[] }
const DOCUMENT_SCHEMA = JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')) as {
  $defs: Record<string, Json>
  properties: { documentSettings: { properties: Record<string, Json> } }
}
const RELAY_DESIGN = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '_assets', 'design-mcp-relay.md'), 'utf8'))

const COMMANDS_SCHEMA = JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'grs-commands.schema.json'), 'utf8')) as {
  oneOf: Json[]
}

// see AM-7, AG-12
const REQUEST_IS_PRINTED = [
  '⭐ ただし `applyCommands`（`AM-7`）の `request` は、刻印と命令の束を鍵に持つオブジェクトとし、束の 1 つは鍵 `kind`（`tbl-document-commands.md` の 表 T-108 の確定名を並べた `enum`）を必ず持つオブジェクトとする。',
  '命令ごとの鍵と型は道具の入力に刷らず、2 つ目の資源（下の「資源」）が持つ。',
  '鍵ごとの説明は引数の欄の意味である。',
]

// WHY: the resource holds every row of table T-108 (CM-76 too -- the Agent API refuses it at run time, the resource does not hide it).
const { commands } = printedCommands()
const offered = commands

const tool = DESCRIPTIONS.tools.find((one) => one.name === 'applyCommands')
const request = ((tool?.inputSchema['properties'] ?? {}) as Record<string, Json>)['request'] ?? {}
const requestProperties = (request['properties'] ?? {}) as Record<string, Json>
const items = (requestProperties['commands']?.['items'] ?? {}) as Json

// WHY: a command with a choice of shapes is one branch holding a oneOf of its ways; each way lists `kind` as `true`, so the
// way is read as an alternative of its own with the branch's kind and words, in the order of the table (AM-7, CM-38).
const alternatives = COMMANDS_SCHEMA.oneOf.flatMap((branch): Json[] => {
  const ways = branch['oneOf'] as Json[] | undefined
  if (ways === undefined) return [branch]
  return ways.map((way) => ({
    ...way,
    description: branch['description'],
    properties: { ...(way['properties'] as Json), kind: (branch['properties'] as Json)['kind'] },
  }))
})

const kindOf = (alternative: Json): string =>
  String(((alternative['properties'] as Record<string, Json> | undefined)?.['kind'] ?? {})['const'] ?? '')
const propertiesOf = (node: Json): Record<string, Json> => (node['properties'] ?? {}) as Record<string, Json>
const alternativesOf = (name: string): Json[] => alternatives.filter((alternative) => kindOf(alternative) === name)

// WHY: the values one alternative carries -- the named values, and for a choice of shapes, one shape's fields.
const waysOf = (command: PrintedCommand): PrintedValue[][] =>
  command.choice === null
    ? [[...command.values]]
    : command.choice.shapes.map((shape) => [...command.values, ...shape.fields])

const ENTITY_DEFS = DOCUMENT_SCHEMA.$defs
const SETTING_DEFS = DOCUMENT_SCHEMA.properties.documentSettings.properties

const resolved = (node: Json): Json => {
  let at = node
  while (typeof at['$ref'] === 'string') at = ENTITY_DEFS[at['$ref'].split('/').pop() ?? ''] ?? {}
  return at
}

const SHAPE_WORDS = ['type', 'enum', 'const', 'minimum', 'maximum', 'pattern', 'format', 'maxItems'] as const

// WHY: what a schema node admits, without its words for a reader (description, default) and with its references followed.
function essence(node: Json, withoutNull = false): Json {
  const at = resolved(node)
  const out: Json = {}
  for (const word of SHAPE_WORDS) {
    if (!(word in at)) continue
    let value = at[word]
    if (word === 'type') value = [value].flat().map(String).sort()
    if (withoutNull && word === 'type') value = (value as string[]).filter((one) => one !== 'null')
    if (withoutNull && word === 'enum') value = (value as unknown[]).filter((one) => one !== null)
    out[word] = value
  }
  if (at['items'] !== undefined) out['items'] = essence(at['items'] as Json)
  return out
}

function columnSchema(writes: string): Json {
  const [entity, column] = writes.split('.')
  if (column === undefined) return SETTING_DEFS[writes] ?? {}
  return propertiesOf(ENTITY_DEFS[entity ?? ''] ?? {})[column] ?? {}
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
const acceptsRequest = ajv.compile(request)
const acceptsCommand = ajv.compile(COMMANDS_SCHEMA)

const STAMP = { revision: 1 }

describe('the relay design says the request of applyCommands holds the kind, and the resource holds the shapes', () => {
  it.each(REQUEST_IS_PRINTED)('design-mcp-relay.md holds the sentence %#', (sentence) => {
    expect(RELAY_DESIGN).toContain(sentence)
  })
})

describe('AM-7: the request is the stamp and the bundle of commands', () => {
  it('request is an object with expectedStamp and commands, both required', () => {
    expect(tool).toBeDefined()
    expect(request['type']).toBe('object')
    expect(request['required']).toEqual(['expectedStamp', 'commands'])
    expect(Object.keys(requestProperties)).toEqual(['expectedStamp', 'commands'])
    expect(requestProperties['expectedStamp']?.['type']).toBe('object')
    expect(requestProperties['commands']?.['type']).toBe('array')
  })

  it('a bundle item is an object that must carry a kind, and the kinds are the ones the commands resource holds', () => {
    expect(items['type']).toBe('object')
    expect(items['required']).toEqual(['kind'])
    expect(items['oneOf']).toBeUndefined()
    expect(items['anyOf']).toBeUndefined()
    const kind = (propertiesOf(items)['kind'] ?? {}) as Json
    expect(kind['type']).toBe('string')
    expect(kind['enum']).toEqual(COMMANDS_SCHEMA.oneOf.map(kindOf))
    expect(new Set(kind['enum'] as string[])).toEqual(new Set(alternatives.map(kindOf)))
  })

  it('the resource holds 91 alternatives -- one branch per command, setDependencyLag twice once its choice is opened', () => {
    expect(COMMANDS_SCHEMA.oneOf).toHaveLength(91)
    expect(alternatives).toHaveLength(92)
  })
})

describe('one alternative per command the Agent API takes, in the order of table T-108', () => {
  it('the kinds are the 91 command names of the table, setDependencyLag holding a choice of its two lag shapes', () => {
    const expected = offered.flatMap((command) => waysOf(command).map(() => command.name))
    expect(alternatives.map(kindOf)).toEqual(expected)
    expect(offered).toHaveLength(91)
    expect(alternativesOf('setDependencyLag')).toHaveLength(2)
    expect(COMMANDS_SCHEMA.oneOf.map(kindOf)).toEqual(offered.map((command) => command.name))
  })

  it.each(offered.map((command) => [command.id, command.name, command] as const))(
    '%s %s: the kind is a const, the fields are the carried values, the required ones are those not optional, nothing else is taken',
    (_id, name, command) => {
      const ways = waysOf(command)
      const found = alternativesOf(name)
      expect(found).toHaveLength(ways.length)
      ways.forEach((values, at) => {
        const alternative = found[at] ?? {}
        expect(alternative['type']).toBe('object')
        expect(alternative['additionalProperties']).toBe(false)
        expect(propertiesOf(alternative)['kind']).toEqual({ const: name })
        expect(Object.keys(propertiesOf(alternative))).toEqual(['kind', ...values.map((value) => value.name)])
        expect(alternative['required']).toEqual(['kind', ...values.filter((value) => !value.optional).map((value) => value.name)])
      })
    },
  )

  // see AM-7
  // WHY: the description is printed from the English of the row's "what it carries" cell in the manuscript, not from the Japanese table.
  it.each(offered.map((command) => [command.id, command.name] as const))(
    '%s %s: the alternative is described by what the row does',
    (_id, name) => {
      for (const alternative of alternativesOf(name)) expect(alternative['description']).toBe(commandEnglish(name))
    },
  )
})

describe('a shape a command carries is a closed object of the fields table T-108 prints under it', () => {
  const shaped = offered.flatMap((command) =>
    waysOf(command)
      .flat()
      .filter((value) => value.fields.length > 0)
      .map((value) => [command.name, value.name, value] as const),
  )

  it('the table prints shapes with fields under seven values', () => {
    expect(shaped.length).toBeGreaterThanOrEqual(7)
  })

  it.each(shaped)('%s.%s', (name, field, value) => {
    const node = propertiesOf(alternativesOf(name)[0] ?? {})[field] ?? {}
    expect(node['additionalProperties']).toBe(false)
    expect(Object.keys(propertiesOf(node))).toEqual(value.fields.map((one) => one.name))
    expect(node['required']).toEqual(value.fields.filter((one) => !one.optional).map((one) => one.name))
  })

  it('PlanActualPlacement (CM-13) is one alternative per T-019 row the table prints, each closed', () => {
    const place = commands.find((command) => command.id === 'CM-13')?.values.find((value) => value.name === 'place')
    const node = propertiesOf(alternativesOf('setTaskPlanActualState')[0] ?? {})['place'] ?? {}
    const variants = (node['oneOf'] ?? []) as Json[]
    expect(variants.map((one) => propertiesOf(one)['state'])).toEqual(place?.variants.map((variant) => ({ const: variant.tag })))
    variants.forEach((one, at) => {
      expect(one['additionalProperties']).toBe(false)
      expect(Object.keys(propertiesOf(one))).toEqual(['state', ...(place?.variants[at]?.fields.map((field) => field.name) ?? [])])
    })
  })
})

describe('a value that writes a document column takes that column\'s shape in the document schema', () => {
  const pointing = offered.flatMap((command) =>
    waysOf(command).flatMap((values) =>
      values.flatMap((value) => {
        const own = value.role === 'column' && !value.many && value.writes !== null ? [[command.name, [value.name], value] as const] : []
        const nested = value.fields
          .filter((field) => field.role === 'column' && !field.many && field.writes !== null)
          .map((field) => [command.name, [value.name, field.name], field] as const)
        return [...own, ...nested]
      }),
    ),
  )

  it('more than 80 carried values write a column', () => {
    expect(pointing.length).toBeGreaterThan(80)
  })

  it.each(pointing.map(([name, path, value]) => [`${name}.${path.join('.')}`, value.writes, name, path, value] as const))(
    '%s takes the shape of %s',
    (_label, writes, name, path, value) => {
      let node: Json = alternativesOf(name)[0] ?? {}
      for (const step of path) node = propertiesOf(node)[step] ?? {}
      expect(essence(node)).toEqual(essence(columnSchema(writes ?? ''), value.nonNull))
    },
  )
})

describe('the published input refuses a command whose shape is off (schema level; the runtime refusal is DFC-2856)', () => {
  const fadeIn = { kind: 'setTaskFadeInDays', taskUid: 12, fadeInDays: 3 }

  it('a well-formed bundle is accepted, by the tool input and by the commands resource', () => {
    expect(acceptsRequest({ expectedStamp: STAMP, commands: [fadeIn] }), JSON.stringify(acceptsRequest.errors)).toBe(true)
    expect(acceptsCommand(fadeIn), JSON.stringify(acceptsCommand.errors)).toBe(true)
  })

  it('the tool input refuses an item without a kind or with a kind table T-108 does not hold', () => {
    expect(acceptsRequest({ expectedStamp: STAMP, commands: [{ taskUid: 12 }] })).toBe(false)
    expect(acceptsRequest({ expectedStamp: STAMP, commands: [{ kind: 'setTaskFadeDays' }] })).toBe(false)
  })

  it.each([
    ['fadeInDays given as a string', { ...fadeIn, fadeInDays: '3' }],
    ['a misspelt field', { kind: 'setTaskFadeInDays', taskUid: 12, fadeInDay: 3 }],
    ['a field left out', { kind: 'setTaskFadeInDays', taskUid: 12 }],
    ['an extra field', { ...fadeIn, days: 3 }],
    ['a kind table T-108 does not hold', { kind: 'setTaskFadeDays', uid: 12, fadeInDays: 3 }],
    ['both lag shapes at once', { kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagWorkingDays: 1, lagMinutes: 60, lagUnit: 'h' }],
    ['a lag unit outside d, h and m', { kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagMinutes: 60, lagUnit: 'w' }],
    ['a null start where the table says null is not taken', { kind: 'setTaskPlanDates', taskUid: 1, start: null, finish: '2026-04-08T17:00:00' }],
  ])('%s is refused', (_label, command) => {
    // WHY: the tool input holds no keys of a command (AG-12 (8)); the shape is refused by the resource's schema only.
    expect(acceptsCommand(command)).toBe(false)
  })

  it('either lag shape alone is accepted', () => {
    expect(acceptsCommand({ kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagWorkingDays: 1 })).toBe(true)
    expect(acceptsCommand({ kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagMinutes: 60, lagUnit: 'h' })).toBe(true)
  })

  it('a request without its stamp, or with commands that are no list, is refused', () => {
    expect(acceptsRequest({ commands: [fadeIn] })).toBe(false)
    expect(acceptsRequest({ expectedStamp: STAMP, commands: fadeIn })).toBe(false)
  })
})

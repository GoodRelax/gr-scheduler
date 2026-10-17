// CR-766 spec-only tests: the MCP input of applyCommands (AM-7) offers each command of table T-108 as one closed choice.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Ajv2020 } from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'

import { isUnimplemented, printedCommands, type PrintedCommand, type PrintedValue } from './cr-766-printed-commands'
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

// see AM-7
const REQUEST_IS_PRINTED =
  '⭐ ただし `applyCommands`（`AM-7`）の `request` は、刻印と命令の束を鍵に持つオブジェクトとし、束の 1 つは `tbl-document-commands.md` の 表 T-108 の命令ごとの択とする —— 命令の鍵と型は同表の原稿から刷り、文書の列を書く値はその列の文書のスキーマの形を取る。'

const { commands } = printedCommands()
const offered = commands.filter((command) => !isUnimplemented(command))

const tool = DESCRIPTIONS.tools.find((one) => one.name === 'applyCommands')
const request = ((tool?.inputSchema['properties'] ?? {}) as Record<string, Json>)['request'] ?? {}
const requestProperties = (request['properties'] ?? {}) as Record<string, Json>
const items = (requestProperties['commands']?.['items'] ?? {}) as Json
const alternatives = (items['oneOf'] ?? []) as Json[]

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
const acceptsCommand = ajv.compile({ oneOf: alternatives })

const STAMP = { revision: 1 }

describe('the relay design says the request of applyCommands is printed from table T-108', () => {
  it('design-mcp-relay.md holds the sentence', () => {
    expect(RELAY_DESIGN).toContain(REQUEST_IS_PRINTED)
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

  it('a bundle item is one of 91 alternatives', () => {
    expect(alternatives).toHaveLength(91)
  })
})

describe('one alternative per command the Agent API takes, in the order of table T-108', () => {
  it('the kinds are the 90 command names but CM-76, with setDependencyLag twice -- once per lag shape', () => {
    const expected = offered.flatMap((command) => waysOf(command).map(() => command.name))
    expect(alternatives.map(kindOf)).toEqual(expected)
    expect(offered).toHaveLength(90)
    expect(alternativesOf('setDependencyLag')).toHaveLength(2)
  })

  it('CM-76 setTaskGroupEditPermission, which the table marks as not implemented, is not offered', () => {
    expect(alternatives.map(kindOf)).not.toContain('setTaskGroupEditPermission')
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

  it.each(offered.map((command) => [command.id, command.name, command.carries] as const))(
    '%s %s: the alternative is described by what the row does',
    (_id, name, carries) => {
      for (const alternative of alternativesOf(name)) expect(alternative['description']).toBe(carries)
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

  it('a well-formed bundle is accepted', () => {
    expect(acceptsRequest({ expectedStamp: STAMP, commands: [fadeIn] }), JSON.stringify(acceptsRequest.errors)).toBe(true)
  })

  it.each([
    ['fadeInDays given as a string', { ...fadeIn, fadeInDays: '3' }],
    ['a misspelt field', { kind: 'setTaskFadeInDays', taskUid: 12, fadeInDay: 3 }],
    ['a field left out', { kind: 'setTaskFadeInDays', taskUid: 12 }],
    ['an extra field', { ...fadeIn, days: 3 }],
    ['a kind table T-108 does not hold', { kind: 'setTaskFadeDays', uid: 12, fadeInDays: 3 }],
    ['CM-76, which only a person uses', { kind: 'setTaskGroupEditPermission', taskGroupId: 'g', editPermission: null }],
    ['both lag shapes at once', { kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagWorkingDays: 1, lagMinutes: 60, lagUnit: 'h' }],
    ['a lag unit outside d, h and m', { kind: 'setDependencyLag', predecessorUid: 1, successorUid: 2, lagMinutes: 60, lagUnit: 'w' }],
    ['a null start where the table says null is not taken', { kind: 'setTaskPlanDates', taskUid: 1, start: null, finish: '2026-04-08T17:00:00' }],
  ])('%s is refused', (_label, command) => {
    expect(acceptsCommand(command)).toBe(false)
    expect(acceptsRequest({ expectedStamp: STAMP, commands: [command] })).toBe(false)
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

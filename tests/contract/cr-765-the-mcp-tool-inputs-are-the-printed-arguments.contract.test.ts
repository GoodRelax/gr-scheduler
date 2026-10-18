// CR-765 spec-only tests: each MCP tool's input schema is derived from the argument column of table T-107 (design-mcp-relay.md 3.1).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { mcpToolList } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { englishLinesOf, englishOf, keyMeaningEnglish, manuscriptMember } from './cr-796-manuscript-english'
import { printedMembers, type PrintedArgument, type PrintedMember } from './cr-765-printed-tables'

const SPEC = join(process.cwd(), 'docs', 'spec')
const DESCRIPTIONS = join(process.cwd(), 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json')

const { members } = printedMembers()

const settled = (text: string): string => text.replace(/\s+/g, ' ')

const DESIGN = settled(readFileSync(join(SPEC, '_assets', 'design-mcp-relay.md'), 'utf8'))

const RULE_OF_TYPES =
  "入力の型は TS の型から導く —— `string` は文字列、`number` は数、`boolean` は真偽、数の並びは数の並び、文字列の値の並び（`'a' | 'b'`）は文字列の `enum`、名の付いた型はオブジェクト。"
const RULE_OF_MEANINGS = '鍵ごとの説明は引数の欄の意味である。'
const RULE_KEYS_ARE_ARGUMENT_NAMES = '1 つのオブジェクトとし、鍵はそのメンバの引数の名とする'
const RULE_NOT_BY_HAND =
  '道具の入力の形はその原稿から刷り、手で書かない'
const RULE_DESCRIPTION_FROM_TABLE = '道具の説明は同表の「何を担うか」の欄の英語（原稿の `en`）から刷り、手で書かない'
const RULE_EMPTY_OBJECT = '引数を持たないメンバとプロパティ（`agentApiVersion` ・ `schemaVersion`）は空のオブジェクトを受ける'
const RULE_WAIT_KEY = '`watchChanges` だけは受け手の代わりに待つ長さ `waitMs` を受ける（`AG-12` の ⑤）'
const RULE_WAIT_IS_AM_17 = '表 T-107 の `AM-17` の MCP だけの鍵である'

interface Schema {
  readonly type?: unknown
  readonly items?: unknown
  readonly description?: unknown
  readonly enum?: unknown
  readonly properties?: Readonly<Record<string, unknown>>
  readonly required?: unknown
}

// WHY: CR-766 gives the request of AM-7 the keys of the write request and one choice per command of table T-108,
// so this one key carries more than a type and a description; the shape of its choices is pinned by the CR-766 tests.
const WRITE_REQUEST_TOOL = 'applyCommands'
const WRITE_REQUEST_KEYS = ['expectedStamp', 'commands']

const NUMBER_LIST = 'readonly number[]'
const STRING_CHOICES = /^'[^']+'( \| '[^']+')+$/

// see AG-12, CR-796
// WHY: the description of a key is the English (en) of the meaning in the manuscript; the printed table stays Japanese.
const schemaOf = (member: PrintedMember, argument: PrintedArgument): Schema => {
  const description = keyMeaningEnglish(member.name, argument.name)
  if (argument.typeText === 'string') return { type: 'string', description }
  if (argument.typeText === 'number') return { type: 'number', description }
  if (argument.typeText === 'boolean') return { type: 'boolean', description }
  if (argument.typeText === NUMBER_LIST) {
    return { type: 'array', items: { type: 'number' }, description }
  }
  // WHY: a list of string values is a string enum (design 3.1) (see AM-25)
  if (STRING_CHOICES.test(argument.typeText)) {
    return { type: 'string', enum: argument.typeText.split(' | ').map((one) => one.slice(1, -1)), description }
  }
  return { type: 'object', description }
}

// see AG-12
const keysOf = (member: PrintedMember): readonly PrintedArgument[] => {
  const mcpOnly = member.arguments.filter((argument) => argument.isMcpOnly)
  return mcpOnly.length > 0 ? mcpOnly : member.arguments
}

const toolNamed = (name: string) => {
  const found = mcpToolList().find((tool) => tool.name === name)
  if (found === undefined) throw new Error(`mcpToolList has no tool ${name}`)
  return found
}

interface DescriptionsFile {
  readonly tools: readonly {
    readonly name: string
    readonly description: string
    readonly inputSchema: { readonly type: string; readonly properties: Readonly<Record<string, Schema>> }
  }[]
}

const FILE = JSON.parse(readFileSync(DESCRIPTIONS, 'utf8')) as DescriptionsFile

describe('design-mcp-relay.md 3.1 still says how an input is derived from table T-107', () => {
  it.each([
    RULE_OF_TYPES,
    RULE_OF_MEANINGS,
    RULE_KEYS_ARE_ARGUMENT_NAMES,
    RULE_NOT_BY_HAND,
    RULE_DESCRIPTION_FROM_TABLE,
    RULE_EMPTY_OBJECT,
    RULE_WAIT_KEY,
    RULE_WAIT_IS_AM_17,
  ])('%s', (sentence) => {
    expect(DESIGN).toContain(settled(sentence))
  })

})

describe('mcpToolList: one tool per row of T-107, with the input the argument column derives', () => {
  it('the tools are the rows of T-107, in the printed order, each named by its confirmed name', () => {
    expect(mcpToolList().map((tool) => tool.name)).toEqual(members.map((one) => one.name))
  })

  it('each description is the English of the "what it carries" cell, each line a newline', () => {
    // see CR-796
    expect(mcpToolList().map((tool) => tool.description)).toEqual(
      members.map((one) => englishOf(manuscriptMember(one.name).carries)),
    )
  })

  it.each(members.map((one) => [one.id, one.name] as const))('%s %s: the input is an object whose keys are its argument names', (_id, name) => {
    const member = members.find((one) => one.name === name)
    if (member === undefined) throw new Error(`no member ${name}`)
    const tool = toolNamed(name)
    expect(tool.inputSchema.type).toBe('object')
    expect(Object.keys(tool.inputSchema.properties)).toEqual(keysOf(member).map((argument) => argument.name))
  })

  it('every key has the type the rule derives from the TypeScript type, and the meaning as its description', () => {
    for (const member of members) {
      const properties = toolNamed(member.name).inputSchema.properties as Readonly<Record<string, Schema>>
      for (const argument of keysOf(member)) {
        const at = `${member.id} ${argument.name}`
        if (member.name === WRITE_REQUEST_TOOL) {
          expect(properties[argument.name], at).toMatchObject(schemaOf(member, argument))
          expect(Object.keys(properties[argument.name]?.properties ?? {}), at).toEqual(WRITE_REQUEST_KEYS)
        } else {
          expect(properties[argument.name], at).toEqual(schemaOf(member, argument))
        }
      }
    }
  })

  it('a member without an argument, and the two properties, take an empty object', () => {
    const empty = members.filter((one) => one.arguments.length === 0)
    expect(empty).toHaveLength(11)
    for (const member of empty) expect(toolNamed(member.name).inputSchema.properties, member.id).toEqual({})
    expect(empty.filter((one) => one.isProperty).map((one) => one.name)).toEqual(['agentApiVersion', 'schemaVersion'])
  })

  it('the ten members with an argument give their keys the types the rule derives', () => {
    const typesOf = (name: string): unknown[] =>
      Object.values(toolNamed(name).inputSchema.properties as Readonly<Record<string, Schema>>).map((schema) => schema.type)
    expect(typesOf('readDocument')).toEqual(['boolean', 'array'])
    expect(typesOf('readSearchRows')).toEqual(['string', 'string', 'number', 'number'])
    expect(typesOf('readTableRows')).toEqual(['string', 'string', 'string', 'number', 'number'])
    expect(typesOf('applyCommands')).toEqual(['object'])
    expect(typesOf('importDocument')).toEqual(['object'])
    expect(typesOf('undoEdit')).toEqual(['object'])
    expect(typesOf('redoEdit')).toEqual(['object'])
    expect(typesOf('focusTask')).toEqual(['number'])
    expect(typesOf('showOnlyTasks')).toEqual(['array'])
    expect(typesOf('watchChanges')).toEqual(['number'])
  })

  it('a number list gives the type of its items', () => {
    const properties = toolNamed('showOnlyTasks').inputSchema.properties as Readonly<Record<string, Schema>>
    expect(properties['taskUids']?.items).toEqual({ type: 'number' })
  })
})

describe('AM-17 and AG-12 (5): watchChanges takes waitMs and not its receiver', () => {
  it('the only key is waitMs, a number whose description says milliseconds and what an expired wait answers', () => {
    const properties = toolNamed('watchChanges').inputSchema.properties as Readonly<Record<string, Schema>>
    expect(Object.keys(properties)).toEqual(['waitMs'])
    expect(properties['waitMs']?.type).toBe('number')
    // WHY: the milliseconds and the answer of an expired wait are said in the English of the manuscript
    expect(properties['waitMs']?.description).toBe(keyMeaningEnglish('watchChanges', 'waitMs'))
  })

  it('the receiver the TypeScript signature takes never reaches an MCP tool', () => {
    expect(Object.keys(toolNamed('watchChanges').inputSchema.properties)).not.toContain('receive')
  })
})

describe('mcp-tool-descriptions.json is what mcpToolList returns', () => {
  it('the file holds one entry per tool, with the same name, description and input properties', () => {
    expect(FILE.tools).toHaveLength(21)
    expect(
      FILE.tools.map((tool) => ({ name: tool.name, description: tool.description, properties: tool.inputSchema.properties })),
    ).toEqual(
      mcpToolList().map((tool) => ({ name: tool.name, description: tool.description, properties: tool.inputSchema.properties })),
    )
    for (const tool of FILE.tools) expect(tool.inputSchema.type, tool.name).toBe('object')
  })

  it('every property is a type, an optional items and a description, and nothing else', () => {
    for (const tool of FILE.tools) {
      for (const [key, schema] of Object.entries(tool.inputSchema.properties)) {
        const allowed = tool.name === WRITE_REQUEST_TOOL ? ['type', 'items', 'description', 'properties', 'required'] : ['type', 'items', 'enum', 'description']
        expect(Object.keys(schema).every((one) => allowed.includes(one)), `${tool.name} ${key}`).toBe(true)
        expect(typeof schema.description, `${tool.name} ${key}`).toBe('string')
      }
    }
  })
})

describe('AM-19 and AM-25: the sentences that divide the delay analysis reach the tool descriptions', () => {
  it('readSearchRows tells an AI that its status is not a diagnosis and where the diagnosis is', () => {
    const description = toolNamed('readSearchRows').description
    // WHY: the English lines of the manuscript that divide the two, and the name of the tool that diagnoses
    const lines = englishLinesOf(manuscriptMember('readSearchRows').carries)
    expect(lines.length).toBeGreaterThan(0)
    expect(description).toContain(lines[lines.length - 1])
    expect(description).toContain('readDelayDiagnostics')
  })

  it('readDelayDiagnostics tells an AI that it returns the analysis and that the search status is only a comparison with the base date', () => {
    const description = toolNamed('readDelayDiagnostics').description
    // WHY: the English lines of both tools -- this one returns the analysis, the search status only compares dates
    const own = englishLinesOf(manuscriptMember('readDelayDiagnostics').carries)
    expect(own.length).toBeGreaterThan(0)
    expect(description).toContain(own[own.length - 1])
    const search = englishLinesOf(manuscriptMember('readSearchRows').carries)
    expect(toolNamed('readSearchRows').description).toContain(search[search.length - 1])
  })
})

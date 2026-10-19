// see CR-796, AG-12, design-mcp-relay 3.1 (tool list), T-107, T-108

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

function readText(relative: string): string {
  return readFileSync(resolve(ROOT, relative), 'utf8')
}

function readJson(relative: string): any {
  return JSON.parse(readText(relative))
}

const SPEC_URL = 'https://goodrelax.github.io/gr-scheduler/spec-html/'
const ROW_ID = /\b[A-Z]{1,4}-\d+[a-z]?\b/
const TABLE_ID = /\bT-\d+[a-z]?\b/
const JAPANESE = /[぀-ヿ一-鿿]/

// WHY: ASCII-only means no CJK, no em dash and no typographic quotes either
function isAscii(text: string): boolean {
  return /^[\x00-\x7f]*$/.test(text)
}

function nonAsciiSample(text: string): string {
  const found = /[^\x00-\x7f]+/.exec(text)
  return found === null ? '' : found[0]
}

function holdsRowId(text: string): boolean {
  return ROW_ID.test(text) || TABLE_ID.test(text)
}

interface Walked {
  readonly path: string
  readonly text: string
}

// WHY: collect every `description` string in the tree, whatever the nesting (properties, items, oneOf)
function descriptionsIn(node: unknown, path: string, into: Walked[]): void {
  if (Array.isArray(node)) {
    node.forEach((each, index) => descriptionsIn(each, `${path}[${index}]`, into))
    return
  }
  if (node === null || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === 'description' && typeof value === 'string') {
      into.push({ path: `${path}.description`, text: value })
    } else {
      descriptionsIn(value, `${path}.${key}`, into)
    }
  }
}

// WHY: collect every string value (and every key) in the tree
function stringsIn(node: unknown, path: string, into: Walked[], skipKey?: string): void {
  if (typeof node === 'string') {
    into.push({ path, text: node })
    return
  }
  if (Array.isArray(node)) {
    node.forEach((each, index) => stringsIn(each, `${path}[${index}]`, into, skipKey))
    return
  }
  if (node === null || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === skipKey) continue
    into.push({ path: `${path}.<key>`, text: key })
    stringsIn(value, `${path}.${key}`, into, skipKey)
  }
}

const DESCRIPTIONS_FILE = 'src/adapter/mcp-tool-translator/mcp-tool-descriptions.json'
const COMMANDS_SCHEMA_FILE = 'docs/spec/_source/grs-commands.schema.json'

const descriptions = readJson(DESCRIPTIONS_FILE)
const members = readJson('docs/spec/_source/agent-api-members.json')
const commands = readJson('docs/spec/_source/document-commands.json')
const commandsSchema = readJson(COMMANDS_SCHEMA_FILE)

const tools: { name: string; description: string; inputSchema: unknown }[] = descriptions.tools
const memberRows: { name: string; carries: { en: string[] } }[] = members.members.rows
const commandRows: { name: string; carries: { en: string[] } }[] = commands.rows

describe('CR-796 slice 3 -- tool descriptions are English and hold no row id', () => {
  it('every spec member has a tool and every tool has a member (T-107)', () => {
    expect(tools.map((each) => each.name).sort()).toEqual(memberRows.map((each) => each.name).sort())
  })

  it('every tool description and every input-key description is ASCII with no row id', () => {
    const found: Walked[] = []
    for (const tool of tools) {
      found.push({ path: `${tool.name}.description`, text: tool.description })
      descriptionsIn(tool.inputSchema, `${tool.name}.inputSchema`, found)
    }
    expect(found.length).toBeGreaterThan(tools.length)
    const faults = found
      .filter((each) => !isAscii(each.text) || holdsRowId(each.text))
      .map((each) => `${each.path}: ${isAscii(each.text) ? 'row id' : `non-ASCII "${nonAsciiSample(each.text)}"`}`)
    expect(faults).toEqual([])
  })

  it('each tool description is the English of its member, lines joined with a newline', () => {
    const faults: string[] = []
    for (const tool of tools) {
      const member = memberRows.find((each) => each.name === tool.name)
      if (member === undefined) {
        faults.push(`${tool.name}: no member`)
        continue
      }
      expect(member.carries.en.length).toBeGreaterThan(0)
      if (tool.description !== member.carries.en.join('\n')) faults.push(`${tool.name}: differs from carries.en`)
    }
    expect(faults).toEqual([])
  })
})

describe('CR-796 slice 3 -- the spec address is given once, in the initialize instructions', () => {
  const instructions: string = descriptions.instructions

  it('the instructions are ASCII', () => {
    expect(typeof instructions).toBe('string')
    expect(nonAsciiSample(instructions)).toBe('')
  })

  it('the instructions name the spec address exactly once', () => {
    expect(instructions.split(SPEC_URL).length - 1).toBe(1)
  })

  it('no other text in the descriptions file names the spec address', () => {
    const { instructions: _dropped, ...rest } = descriptions
    expect(JSON.stringify(rest)).not.toContain(SPEC_URL)
    expect(JSON.stringify(rest)).not.toContain('goodrelax.github.io')
  })

  it('the instructions hold no specification row id', () => {
    expect(instructions.replace(SPEC_URL, '')).not.toMatch(ROW_ID)
  })
})

describe('CR-796 slice 3 -- grs-commands.schema.json reads English', () => {
  // WHY: each oneOf entry names its command's definition by $ref (CR-806).
  const branches: any[] = commandsSchema.oneOf.map((one: any) => commandsSchema.$defs[one.$ref.replace('#/$defs/', '')])

  function kindOf(branch: any): string {
    return branch.properties.kind.const
  }

  it('there is one branch per command row, matched by kind', () => {
    expect(branches.map(kindOf).sort()).toEqual(commandRows.map((each) => each.name).sort())
  })

  it('every branch description is ASCII with no row id', () => {
    const faults = branches
      .filter((each) => typeof each.description !== 'string' || !isAscii(each.description) || holdsRowId(each.description))
      .map((each) => kindOf(each))
    expect(faults).toEqual([])
  })

  it('every branch description is the English of its command, lines joined with a newline', () => {
    const faults: string[] = []
    for (const branch of branches) {
      const row = commandRows.find((each) => each.name === kindOf(branch))
      if (row === undefined) {
        faults.push(`${kindOf(branch)}: no row`)
        continue
      }
      expect(row.carries.en.length).toBeGreaterThan(0)
      if (branch.description !== row.carries.en.join('\n')) faults.push(`${kindOf(branch)}: differs from carries.en`)
    }
    expect(faults).toEqual([])
  })

  it('no string anywhere in the file holds a Japanese character, $comment aside', () => {
    const found: Walked[] = []
    stringsIn(commandsSchema, 'schema', found, '$comment')
    expect(found.length).toBeGreaterThan(branches.length)
    const faults = found.filter((each) => JAPANESE.test(each.text)).map((each) => each.path)
    expect(faults.slice(0, 10)).toEqual([])
    expect(faults.length).toBe(0)
  })

  it('every description in the file is ASCII with no row id', () => {
    const found: Walked[] = []
    descriptionsIn(commandsSchema, 'schema', found)
    const faults = found.filter((each) => !isAscii(each.text) || holdsRowId(each.text)).map((each) => each.path)
    expect(faults.slice(0, 10)).toEqual([])
    expect(faults.length).toBe(0)
  })
})

describe('CR-796 slice 3 -- the printed tables stay Japanese', () => {
  it('tbl-agent-api-members.md still holds its Japanese words', () => {
    expect(readText('docs/spec/_assets/tbl-agent-api-members.md')).toContain('一括の書き込み')
  })

  it('tbl-document-commands.md still holds its Japanese words', () => {
    expect(readText('docs/spec/_assets/tbl-document-commands.md')).toContain('文書名を変える')
  })
})

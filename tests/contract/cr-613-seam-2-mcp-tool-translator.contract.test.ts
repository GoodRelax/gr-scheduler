// CR-613 spec-only tests: SEAM-2, McpToolTranslator (PI-40, UF-186) against table T-107, AG-12 (2) (4) (5) and AG-9a.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  mcpToolList,
  mcpToolResultOf,
  pageNotConnectedResult,
  relayedCallOf,
  type McpTool,
  type McpToolResult,
} from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { englishOf, manuscriptMembers } from './cr-796-manuscript-english'
import { specTable } from './spec-table'

// WHY: read raw rather than through specTable, which drops each `<br>`;
// SEAM-2 turns each one into a newline in the description.
interface T107Row {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly paramKeys: readonly string[]
  readonly toolOnlyKeys: readonly string[]
}

const AGENT_API_MEMBERS = join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md')

const T_107_COLUMNS = 8
const NAME_COLUMN = 2
const ARGUMENT_COLUMN = 4
const DESCRIPTION_COLUMN = 6

// see T-107, AG-12
// WHY: the argument cell writes one argument per line as `name`: type, and the keys only the MCP tool takes
// open with the label the table prints for them -- the Japanese is the table's own word.
const ARGUMENT_LINE = /^`([A-Za-z_$][\w$]*)`:/
const TOOL_ONLY_LINE = /^\u26a0\ufe0f MCP \u3060\u3051\u306e\u9375 `([A-Za-z_$][\w$]*)`:/

const keysOf = (cell: string, pattern: RegExp): string[] =>
  cell.split(/<br\s*\/?>/i).flatMap((line) => {
    const found = pattern.exec(line.trim())
    return found?.[1] === undefined ? [] : [found[1]]
  })

const rawCells = (line: string): string[] =>
  line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())

const T_107: readonly T107Row[] = (() => {
  const lines = readFileSync(AGENT_API_MEMBERS, 'utf8').split(/\r?\n/)
  const at = lines.findIndex((line) => line.startsWith('**') && line.includes('T-107'))
  if (at < 0) throw new Error('table T-107 is not in tbl-agent-api-members.md')
  const rows: T107Row[] = []
  let started = false
  for (const line of lines.slice(at + 1)) {
    if (!line.trim().startsWith('|')) {
      if (started) break
      continue
    }
    started = true
    const cells = rawCells(line)
    if (cells.length !== T_107_COLUMNS) continue
    const id = cells[0] ?? ''
    if (!/^AM-\d+$/.test(id)) continue
    rows.push({
      id,
      name: (cells[NAME_COLUMN] ?? '').replace(/`/g, ''),
      description: (cells[DESCRIPTION_COLUMN] ?? '').replace(/<br\s*\/?>/gi, '\n').trim(),
      paramKeys: keysOf(cells[ARGUMENT_COLUMN] ?? '', ARGUMENT_LINE),
      toolOnlyKeys: keysOf(cells[ARGUMENT_COLUMN] ?? '', TOOL_ONLY_LINE),
    })
  }
  return rows
})()

// see T-107
const PARAM_KEYS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  T_107.map((row) => [row.name, row.paramKeys]),
)

// see AG-12
const TOOL_ONLY_KEYS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  T_107.filter((row) => row.toolOnlyKeys.length > 0).map((row) => [row.name, row.toolOnlyKeys]),
)

const toolNamed = (name: string): McpTool => {
  const found = mcpToolList().find((tool) => tool.name === name)
  if (found === undefined) throw new Error(`mcpToolList has no tool ${name}`)
  return found
}

const texts = (result: McpToolResult): string[] =>
  result.content.flatMap((one) => (one.type === 'text' ? [one.text] : []))

const A_STAMP = 'stamp-7'
const A_REFUSAL = {
  target: 'applyCommands',
  reason: 'RS-61',
  stamp: A_STAMP,
  refusals: [{ target: 'task:3', reason: 'IV-2' }],
}

describe('SEAM-2 mcpToolList: the tools are table T-107, row for row (AG-12 (4))', () => {
  it('T-107 is read from the manuscript and agrees with the shared table reader', () => {
    expect(T_107.length).toBeGreaterThan(0)
    const shared = specTable('T-107').rows
    expect(T_107.map((row) => row.id)).toEqual(shared.map((row) => row.id))
    expect(T_107.map((row) => row.name)).toEqual(shared.map((row) => (row.cells[1] ?? '').replace(/`/g, '')))
  })

  // see AM-3, AM-25
  it('the argument column of T-107 names the ten members with arguments and the one MCP-only key', () => {
    expect(Object.entries(PARAM_KEYS).filter(([, keys]) => keys.length > 0)).toEqual([
      ['readDocument', ['includeCarry', 'taskUids']],
      ['readSearchRows', ['word', 'filters', 'offset', 'limit']],
      ['readTableRows', ['table', 'word', 'filters', 'offset', 'limit']],
      ['applyCommands', ['request']],
      ['importDocument', ['source']],
      ['undoEdit', ['expectedStamp']],
      ['redoEdit', ['expectedStamp']],
      ['focusTask', ['taskUid']],
      ['showOnlyTasks', ['taskUids']],
      ['watchChanges', ['receive']],
    ])
    expect(TOOL_ONLY_KEYS).toEqual({ watchChanges: ['waitMs'] })
  })

  it('AG-12 (4): one tool per row of T-107, in the row order, named by the confirmed name -- none added, none bundled', () => {
    expect(mcpToolList().map((tool) => tool.name)).toEqual(T_107.map((row) => row.name))
  })

  it('design 3.1: each description is the English of the row\'s description cell, printed from the manuscript (each line a newline)', () => {
    // see CR-796
    const got = mcpToolList().map((tool) => ({ name: tool.name, description: tool.description }))
    expect(got).toEqual(manuscriptMembers().map((row) => ({ name: row.name, description: englishOf(row.carries) })))
  })

  it('design 3.1: each input is one object whose keys are the member\'s parameter names', () => {
    for (const row of T_107) {
      const tool = toolNamed(row.name)
      const expected = [...(TOOL_ONLY_KEYS[row.name] ?? PARAM_KEYS[row.name] ?? [])].sort()
      expect(tool.inputSchema.type, row.id).toBe('object')
      expect(Object.keys(tool.inputSchema.properties).sort(), `${row.id} ${row.name}`).toEqual(expected)
    }
  })

  it('AG-12 (5): watchChanges takes exactly waitMs, a number', () => {
    const properties = toolNamed('watchChanges').inputSchema.properties
    expect(Object.keys(properties)).toEqual(['waitMs'])
    expect(properties['waitMs']).toMatchObject({ type: 'number' })
  })

  it('design 3.1: the two properties and the members without a parameter take an empty object', () => {
    for (const name of ['agentApiVersion', 'schemaVersion', 'readStamp', 'exportPng']) {
      expect(toolNamed(name).inputSchema.properties, name).toEqual({})
    }
  })
})

describe('SEAM-2 relayedCallOf: a tool call becomes the call the page answers', () => {
  it('a name that is not a tool gives null', () => {
    expect(relayedCallOf({ name: 'notATool', arguments: {} })).toBeNull()
    expect(relayedCallOf({ name: 'constructor' })).toBeNull()
    expect(relayedCallOf({ name: 'readstamp' })).toBeNull()
  })

  it('every tool of T-107 maps to the member of the same name', () => {
    for (const row of T_107) {
      const call = relayedCallOf({ name: row.name, arguments: {} })
      expect(call?.member, row.id).toBe(row.name)
    }
  })

  it('absent arguments give empty params', () => {
    expect(relayedCallOf({ name: 'readStamp' })).toEqual({ member: 'readStamp', params: {} })
  })

  it('AG-12 / AG-5: the arguments pass through unchecked -- the page, not the relay, validates', () => {
    const odd = { request: 'not a request at all', extra: [1, 2] }
    expect(relayedCallOf({ name: 'applyCommands', arguments: odd })).toEqual({ member: 'applyCommands', params: odd })
    expect(relayedCallOf({ name: 'readSearchRows', arguments: { word: 42 } })).toEqual({
      member: 'readSearchRows',
      params: { word: 42 },
    })
    expect(relayedCallOf({ name: 'focusTask', arguments: { taskUid: -1 } })).toEqual({
      member: 'focusTask',
      params: { taskUid: -1 },
    })
  })

  it('AG-12 (5): watchChanges keeps waitMs with the relay -- the page is sent empty params', () => {
    expect(relayedCallOf({ name: 'watchChanges', arguments: { waitMs: 50 } })).toEqual({
      member: 'watchChanges',
      params: {},
    })
  })
})

describe('SEAM-2 mcpToolResultOf: the page\'s answer becomes the tool\'s answer', () => {
  it('design 3.1: an object result is the text of its JSON and the structured value itself', () => {
    const result = { ok: true, stamp: A_STAMP, value: { title: 'x' } }
    const got = mcpToolResultOf('readStamp', { result })
    expect(got.content).toEqual([{ type: 'text', text: JSON.stringify(result) }])
    expect(got.structuredContent).toEqual(result)
    expect(got.isError ?? false).toBe(false)
  })

  it('an array, a string and null carry no structured value (it must be a non-null, non-array object)', () => {
    for (const result of [[1, 2], 'text', null, 3]) {
      const got = mcpToolResultOf('readSelection', { result })
      expect(got.content, JSON.stringify(result)).toEqual([{ type: 'text', text: JSON.stringify(result) }])
      expect(got.structuredContent, JSON.stringify(result)).toBeUndefined()
      expect(got.isError ?? false).toBe(false)
    }
  })

  it('AG-9a: a refusal of applyCommands stays a value -- not an MCP error, same target, reason and stamp', () => {
    const result = { ok: false, refusal: A_REFUSAL }
    const got = mcpToolResultOf('applyCommands', { result })
    expect(got.isError ?? false).toBe(false)
    expect(got.structuredContent).toEqual(result)
    expect(texts(got)).toEqual([JSON.stringify(result)])
  })

  it('AG-9a: a refusal with ok:false (e.g. exportPng failing, AG-8) stays a value too', () => {
    const result = { ok: false, refusal: A_REFUSAL }
    const got = mcpToolResultOf('exportPng', { result })
    expect(got.isError ?? false).toBe(false)
    expect(got.structuredContent).toEqual(result)
  })

  it('design 3.1: exportPng\'s base64 value is returned as an MCP image', () => {
    const base64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2, 3]).toString('base64')
    const got = mcpToolResultOf('exportPng', { result: { ok: true, value: base64 } })
    expect(got.content).toEqual([{ type: 'image', data: base64, mimeType: 'image/png' }])
    expect(got.isError ?? false).toBe(false)
  })

  it('design 3.1: only a member the page could not call is an MCP error, carrying its message', () => {
    const got = mcpToolResultOf('readStamp', { error: { code: -32603, message: 'the member threw' } })
    expect(got).toEqual({ content: [{ type: 'text', text: 'the member threw' }], isError: true })
  })
})

describe('SEAM-2 pageNotConnectedResult (AG-12 (2), design 5)', () => {
  const PAGE_URL = 'http://127.0.0.1:50123/#abcdefABCDEF0123456789_-'

  it('AG-12 (2) / AG-9a: a refusal as a value -- reason pageNotConnected, no stamp, and the URL to open', () => {
    const got = pageNotConnectedResult(PAGE_URL)
    expect(got.isError ?? false).toBe(false)
    expect(got.structuredContent).toEqual({
      ok: false,
      refusal: {
        target: 'relay',
        reason: 'pageNotConnected',
        stamp: null,
        refusals: [],
        what: expect.any(String),
        pageUrl: PAGE_URL,
      },
    })
    const what = (got.structuredContent?.['refusal'] as { what: string }).what
    expect(what.trim().length).toBeGreaterThan(0)
  })

  it('design 5: the text says the URL, so an AI can tell the person what to open', () => {
    const got = pageNotConnectedResult(PAGE_URL)
    expect(texts(got).some((text) => text.includes(PAGE_URL))).toBe(true)
  })
})

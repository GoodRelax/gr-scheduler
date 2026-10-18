// CR-796 slice 2 spec-only tests: tool inputs carry no oneOf / anyOf / type list, and the command shapes live in a second resource (AG-12 (8)).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { unbroken } from './spec-table'

type Json = Record<string, unknown>

const WAIT_MS = 1500
const POLL_MS = 20

const ROOT = process.cwd()
const SPEC = join(ROOT, 'docs', 'spec')

const DOCUMENT_URI = 'grs-relay://grs-document.schema.json'
const COMMANDS_URI = 'grs-relay://grs-commands.schema.json'
const SCHEMA_MIME = 'application/schema+json'
const RESOURCE_NOT_FOUND = -32002

const DOCUMENT_SCHEMA = '{"$schema":"https://json-schema.org/draft/2020-12/schema","title":"document schema under test"}\n'
const COMMANDS_SCHEMA = '{"$schema":"https://json-schema.org/draft/2020-12/schema","title":"commands schema under test"}\n'

const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><html><body>page</body></html>\n', 'utf8'))

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// WHY: the confirmed names of table T-108 are read from the printed table, in table order, never typed here.
function commandNamesOfT108(): string[] {
  const text = readFileSync(join(SPEC, '_assets', 'tbl-document-commands.md'), 'utf8')
  const names: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!/^\| CM-\d+ \|/.test(line)) continue
    const cells = line.split('|').map((cell) => cell.trim())
    const name = /^`([A-Za-z0-9]+)`$/.exec(cells[3] ?? '')?.[1]
    if (name === undefined) throw new Error(`no confirmed name in the row: ${line.slice(0, 60)}`)
    names.push(name)
  }
  return names
}

interface Tool {
  readonly name: string
  readonly inputSchema: Json
}

function toolsOfDescriptions(): readonly Tool[] {
  const path = join(ROOT, 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json')
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { tools: Tool[] }
  return parsed.tools
}

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

// WHY: a key under "properties" is the name of an argument, so a property that is itself called "type" or "oneOf" is not a schema keyword.
function bannedShapesIn(node: unknown, at: string): string[] {
  if (Array.isArray(node)) return node.flatMap((one, index) => bannedShapesIn(one, `${at}[${String(index)}]`))
  if (!isObject(node)) return []
  const found: string[] = []
  for (const [key, value] of Object.entries(node)) {
    if (at.endsWith('.properties') && !at.endsWith('.properties.properties')) {
      found.push(...bannedShapesIn(value, `${at}.${key}`))
      continue
    }
    if (key === 'oneOf' || key === 'anyOf') found.push(`${at}.${key}`)
    if (key === 'type' && Array.isArray(value)) found.push(`${at}.type (a list)`)
    found.push(...bannedShapesIn(value, `${at}.${key}`))
  }
  return found
}

// see AG-12
describe('CR-796 s2 -- no tool input carries oneOf, anyOf or a type list (AG-12 (8))', () => {
  const tools = toolsOfDescriptions()

  it('the descriptions hold every tool of table T-107, so the scan below covers every one', () => {
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) expect(isObject(tool.inputSchema), tool.name).toBe(true)
  })

  it('no inputSchema anywhere contains oneOf, anyOf or a type whose value is an array', () => {
    const found = tools.flatMap((tool) => bannedShapesIn(tool.inputSchema, tool.name))
    expect(found).toEqual([])
  })

  it('applyCommands: request.commands.items is an object that requires kind, and kind is an enum of the T-108 names in table order', () => {
    const applyCommands = tools.find((tool) => tool.name === 'applyCommands')
    const properties = applyCommands?.inputSchema['properties'] as Json | undefined
    const request = properties?.['request'] as Json | undefined
    const commands = (request?.['properties'] as Json | undefined)?.['commands'] as Json | undefined
    expect(commands?.['type']).toBe('array')
    const items = commands?.['items'] as Json | undefined
    expect(items?.['type']).toBe('object')
    expect(items?.['required']).toEqual(['kind'])
    const kind = (items?.['properties'] as Json | undefined)?.['kind'] as Json | undefined
    expect(kind?.['enum']).toEqual(commandNamesOfT108())
  })

  it('the T-108 name list that the test reads is long enough to mean something and has no repeat', () => {
    const names = commandNamesOfT108()
    expect(names.length).toBeGreaterThan(50)
    expect(new Set(names).size).toBe(names.length)
  })

  it('showOnlyTasks: taskUids is an array of numbers, with no null', () => {
    const showOnlyTasks = tools.find((tool) => tool.name === 'showOnlyTasks')
    const taskUids = (showOnlyTasks?.inputSchema['properties'] as Json | undefined)?.['taskUids'] as Json | undefined
    expect(taskUids?.['type']).toBe('array')
    expect(taskUids?.['items']).toEqual({ type: 'number' })
  })
})

// see AG-12
describe('CR-796 s2 -- grs-commands.schema.json, the printed shape of every command (table T-108)', () => {
  const path = join(SPEC, '_source', 'grs-commands.schema.json')

  const branchesOf = (node: unknown): Json[] => {
    if (Array.isArray(node)) return node.flatMap(branchesOf)
    if (!isObject(node)) return []
    const kind = (node['properties'] as Json | undefined)?.['kind']
    const here = isObject(kind) && typeof kind['const'] === 'string' ? [node] : []
    return [...here, ...Object.values(node).flatMap(branchesOf)]
  }

  it('the file exists under docs/spec/_source and parses as a JSON object', () => {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    expect(isObject(parsed)).toBe(true)
  })

  it('it has one branch per T-108 command, each with properties.kind.const equal to the confirmed name', () => {
    const consts = branchesOf(JSON.parse(readFileSync(path, 'utf8'))).map(
      (branch) => ((branch['properties'] as Json)['kind'] as Json)['const'],
    )
    expect([...consts].sort()).toEqual([...commandNamesOfT108()].sort())
  })

  it('it names its manuscript, document-commands.json', () => {
    expect(readFileSync(path, 'utf8')).toContain('document-commands.json')
  })
})

class StdioClient {
  readonly input = new PassThrough()
  readonly output = new PassThrough()
  readonly messages: Json[] = []
  private nextId = 1
  private held = ''

  constructor() {
    this.output.on('data', (chunk: Buffer) => {
      this.held += chunk.toString('utf8')
      for (let at = this.held.indexOf('\n'); at >= 0; at = this.held.indexOf('\n')) {
        const line = this.held.slice(0, at)
        this.held = this.held.slice(at + 1)
        this.messages.push(JSON.parse(line) as Json)
      }
    })
  }

  async request(method: string, params?: Json): Promise<Json> {
    const id = this.nextId++
    const message = params === undefined ? { jsonrpc: '2.0', id, method } : { jsonrpc: '2.0', id, method, params }
    this.input.write(`${JSON.stringify(message)}\n`)
    const deadline = Date.now() + WAIT_MS
    for (;;) {
      const found = this.messages.find((one) => one['id'] === id)
      if (found !== undefined) return found
      if (Date.now() > deadline) throw new Error(`timed out waiting for the answer to ${method}`)
      await sleep(POLL_MS)
    }
  }
}

let client: StdioClient
let relay: McpRelay | null = null

beforeEach(async () => {
  client = new StdioClient()
  relay = await startMcpRelay({
    input: client.input,
    output: client.output,
    log: () => undefined,
    pageHtml: PAGE_HTML,
    documentSchema: DOCUMENT_SCHEMA,
    commandsSchema: COMMANDS_SCHEMA,
  } as Parameters<typeof startMcpRelay>[0])
})

afterEach(async () => {
  const closing = relay
  relay = null
  if (closing !== null) await Promise.race([closing.close(), sleep(WAIT_MS)])
  client.input.end()
})

// see AG-12
describe('CR-796 s2 -- the relay serves two resources (AG-12 (8), design-mcp-relay 3.1)', () => {
  it('resources/list answers the document schema first and the commands schema second, both application/schema+json', async () => {
    const answer = await client.request('resources/list', {})
    const resources = (answer['result'] as Json)['resources'] as Json[]
    expect(resources.map((one) => one['uri'])).toEqual([DOCUMENT_URI, COMMANDS_URI])
    expect(resources.map((one) => one['mimeType'])).toEqual([SCHEMA_MIME, SCHEMA_MIME])
    expect(resources[1]).toMatchObject({ uri: COMMANDS_URI, name: 'grs-commands.schema.json' })
  })

  it('resources/read of the commands uri returns the commandsSchema text unchanged', async () => {
    const answer = await client.request('resources/read', { uri: COMMANDS_URI })
    const contents = (answer['result'] as Json)['contents'] as Json[]
    expect(contents).toHaveLength(1)
    expect(contents[0]?.['uri']).toBe(COMMANDS_URI)
    expect(contents[0]?.['mimeType']).toBe(SCHEMA_MIME)
    expect(contents[0]?.['text']).toBe(COMMANDS_SCHEMA)
  })

  it('resources/read of the document uri still returns the documentSchema text', async () => {
    const answer = await client.request('resources/read', { uri: DOCUMENT_URI })
    const contents = (answer['result'] as Json)['contents'] as Json[]
    expect(contents[0]?.['text']).toBe(DOCUMENT_SCHEMA)
  })

  it('an unknown uri is still the resource-not-found error -32002', async () => {
    for (const uri of ['grs-relay://nothing.json', 'grs-relay://grs-commands.schema.json.bak']) {
      const answer = await client.request('resources/read', { uri })
      expect((answer['error'] as Json | undefined)?.['code'], uri).toBe(RESOURCE_NOT_FOUND)
    }
  })

  it('the tool list is not changed by the second resource: it has no tool named for the schemas', async () => {
    const answer = await client.request('tools/list', {})
    const names = ((answer['result'] as Json)['tools'] as Json[]).map((one) => one['name'])
    expect(names).toEqual(toolsOfDescriptions().map((tool) => tool.name))
  })
})

// see AM-27, TV-5, TV-8, S-560
describe('CR-796 s2 -- AM-27: an empty list turns the Search Panel schedule filter off', () => {
  const template = JSON.parse(
    readFileSync(join(ROOT, 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as Document

  const HISTORY_LIMITS = {
    maxSteps: NOT_STORED_LIMITS['S-94'],
    maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
  }
  const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

  function build(): { wiring: AgentApiWiring; read: () => Document } {
    const state = {
      document: {
        ...structuredClone(template),
        documentStamp: {
          scheduleUpdatedAt: '2026-10-18T10:00:00Z',
          fileSavedAt: '2026-10-18T10:00:00Z',
          lastEditedBy: 'a person at the keyboard',
          settingsUpdatedAt: '2026-10-18T10:00:00Z',
        },
        changeLog: [],
      } as unknown as Document,
      history: { done: [], undone: [] } as EditHistory<ChangeStep>,
    }
    const readSnapshot = (): AgentSnapshot => ({
      defaultTaskGroupName: DEFAULT_TASK_GROUP_NAME,
      document: state.document,
      documentAsWritten: state.document,
      selection: emptySelection(),
      frame: null,
      exportScene: null,
      isGestureInFlight: false,
      isEditingInPlace: false,
      isQuestionAsked: false,
      isDeliveringNotices: false,
      historyLimits: HISTORY_LIMITS,
      settingsLimits: SETTINGS_LIMITS,
      readAt: '2026-10-18T08:30:00Z',
      localReadAt: '2026-10-18T09:00:00',
    })
    const wiring: AgentApiWiring = {
      changeWatchers: emptyChangeWatchers(),
      source: { readSnapshot },
      holder: {
        read: () => ({ document: state.document, history: state.history }),
        replace: (next) => {
          state.document = next.document
          state.history = next.history
        },
      },
      audience: { deliver: () => undefined },
      rasterizer: undefined,
      takeInDocument: (async () => true) as unknown as AgentApiWiring['takeInDocument'],
      shownTasks: undefined,
      appShell: undefined,
      writerName: 'agent under test',
      schemaVersion: String((template as unknown as Json)['schemaVersion']),
    }
    return { wiring, read: () => state.document }
  }

  const searchPanelOf = (document: Document): Json =>
    (((document as unknown as Json)['documentSettings'] as Json)['tableViews'] as Json)['searchPanel'] as Json

  it('a non-empty list puts the filter on, then an empty list takes it off and keeps the display column', async () => {
    const { wiring, read } = build()
    const api = agentApiMembers(wiring)
    expect(searchPanelOf(read())['isScheduleFilterApplied']).toBe(false)

    const on = (await api.showOnlyTasks([1, 2])) as unknown as Json
    expect(on['ok'], JSON.stringify(on)).toBe(true)
    expect(searchPanelOf(read())['isScheduleFilterApplied']).toBe(true)
    // WHY: CR-798 -- the saved list is the checked tasks, so the named tasks are the ones held checked.
    const checkedWhileOn = searchPanelOf(read())['shownTaskUids']
    expect(checkedWhileOn).toEqual([1, 2])

    const off = (await api.showOnlyTasks([])) as unknown as Json
    expect(off['ok'], JSON.stringify(off)).toBe(true)
    expect(searchPanelOf(read())['isScheduleFilterApplied']).toBe(false)
    expect(searchPanelOf(read())['shownTaskUids']).toEqual(checkedWhileOn)
  })

  it('an empty list on a filter that is already off leaves it off', async () => {
    const { wiring, read } = build()
    const api = agentApiMembers(wiring)
    await api.showOnlyTasks([])
    expect(searchPanelOf(read())['isScheduleFilterApplied']).toBe(false)
  })
})

// see AG-12, AM-7, AM-27
describe('CR-796 s2 -- the clauses slice 2 added, held verbatim', () => {
  const requirements = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
  const rowOfAG12 = (): string => {
    const at = requirements.indexOf('| AG-12 |')
    expect(at).toBeGreaterThan(-1)
    return requirements.slice(at, requirements.indexOf('\n', at))
  }

  it('AG-12 (8) forbids oneOf, anyOf and a type list in the form of a tool input (MUST NOT)', () => {
    expect(requirements).toContain(
      '\u26d4 \u9053\u5177\u306e\u5165\u529b\u306e\u5f62\u306b `oneOf`\u30fb`anyOf`\u30fb\u578b\u306e\u4e26\u3073\u3092\u5237\u3063\u3066\u306f\u306a\u3089\u306a\u3044\uff08MUST NOT\uff09',
    )
    expect(rowOfAG12()).toContain('\u9053\u5177\u306e\u5165\u529b\u306e\u5f62\u306b `oneOf`\u30fb`anyOf`\u30fb\u578b\u306e\u4e26\u3073\u3092\u5237\u3063\u3066\u306f\u306a\u3089\u306a\u3044\uff08MUST NOT\uff09')
  })

  it('AG-12 (8) makes the two schemas MCP resources (MUST)', () => {
    const eight = rowOfAG12().slice(rowOfAG12().indexOf('\u2467'))
    expect(eight).toContain('\u306e 2 \u3064\u3092 MCP \u306e\u8cc7\u6e90\u3068\u3057\u3066\u51fa\u3059\u3053\u3068\uff08MUST\uff09')
  })
})

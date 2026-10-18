// CR-791 spec-only tests: the relay hands the AI its instructions and the one schema resource (AG-12 (8)).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mcpInstructions, mcpToolList } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'

type Json = Record<string, unknown>

const WAIT_MS = 1500
const POLL_MS = 20

const SCHEMA_URI = 'grs-relay://grs-document.schema.json'
const SCHEMA_NAME = 'grs-document.schema.json'
const SCHEMA_MIME = 'application/schema+json'
const COMMANDS_URI = 'grs-relay://grs-commands.schema.json'
const COMMANDS_NAME = 'grs-commands.schema.json'
const RESOURCE_NOT_FOUND = -32002

// WHY: the heading in tbl-agent-api-members.md is Japanese; the code stays ASCII, so it is written as escapes.
const INSTRUCTIONS_HEADING =
  'MCP の初期化の答えに載せる案内'

const DOCUMENT_SCHEMA = readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-document.schema.json'), 'utf8')
const COMMANDS_SCHEMA = readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'grs-commands.schema.json'), 'utf8')
const MEMBERS_TABLE = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8')

const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><html><body>page</body></html>\n', 'utf8'))

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// WHY: the printed text is the single manuscript (design 3.1: printed from the same manuscript, not written by hand).
function printedInstructions(): string {
  const heading = MEMBERS_TABLE.indexOf(INSTRUCTIONS_HEADING)
  if (heading < 0) throw new Error('the instructions heading is not in tbl-agent-api-members.md')
  const fence = MEMBERS_TABLE.indexOf('```text', heading)
  if (fence < 0) throw new Error('the printed instructions block is not in tbl-agent-api-members.md')
  const start = MEMBERS_TABLE.indexOf('\n', fence) + 1
  const end = MEMBERS_TABLE.indexOf('```', start)
  return MEMBERS_TABLE.slice(start, end)
    .split(/\r?\n/)
    .filter((line, at, lines) => !(at === lines.length - 1 && line === ''))
    .join('\n')
}

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
  })
})

afterEach(async () => {
  const closing = relay
  relay = null
  if (closing !== null) await Promise.race([closing.close(), sleep(WAIT_MS)])
  client.input.end()
})

async function initialize(): Promise<Json> {
  const answer = await client.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'test', version: '0' },
  })
  return answer['result'] as Json
}

describe('CR-791 AG-12 (8): the initialize answer carries the instructions', () => {
  it('the capabilities are tools and resources, and nothing else', async () => {
    expect((await initialize())['capabilities']).toEqual({ tools: {}, resources: {} })
  })

  it('instructions equals mcpInstructions()', async () => {
    expect((await initialize())['instructions']).toBe(mcpInstructions())
  })

  it('instructions equals the text block printed in tbl-agent-api-members.md (same manuscript)', async () => {
    const printed = printedInstructions()
    expect(printed.length).toBeGreaterThan(0)
    expect(mcpInstructions()).toBe(printed)
    expect((await initialize())['instructions']).toBe(printed)
  })

  it('the instructions are English: no character outside ASCII', () => {
    expect(/[^\n\x20-\x7e]/.test(mcpInstructions())).toBe(false)
  })

  it('the instructions name the schema resource and the exportJson fallback', () => {
    expect(mcpInstructions()).toContain(SCHEMA_NAME)
    expect(mcpInstructions()).toContain('exportJson')
  })
})

describe('CR-791 design 3.1: the resources are the GRS JSON schema and the commands schema', () => {
  // see AG-12
  it('resources/list returns two resources: the document schema first, the commands schema second', async () => {
    const answer = await client.request('resources/list', {})
    const resources = (answer['result'] as Json)['resources'] as Json[]
    expect(resources).toHaveLength(2)
    expect(resources[0]).toMatchObject({ uri: SCHEMA_URI, name: SCHEMA_NAME, mimeType: SCHEMA_MIME })
    expect(resources[1]).toMatchObject({ uri: COMMANDS_URI, name: COMMANDS_NAME, mimeType: SCHEMA_MIME })
  })

  it('resources/read of the commands uri returns the commands schema text the relay was started with', async () => {
    const answer = await client.request('resources/read', { uri: COMMANDS_URI })
    const contents = (answer['result'] as Json)['contents'] as Json[]
    expect(contents).toHaveLength(1)
    expect(contents[0]?.['uri']).toBe(COMMANDS_URI)
    expect(contents[0]?.['text']).toBe(COMMANDS_SCHEMA)
  })

  it('resources/read of that uri returns the schema text the relay was started with', async () => {
    const answer = await client.request('resources/read', { uri: SCHEMA_URI })
    const contents = (answer['result'] as Json)['contents'] as Json[]
    expect(contents).toHaveLength(1)
    expect(contents[0]?.['uri']).toBe(SCHEMA_URI)
    expect(contents[0]?.['text']).toBe(DOCUMENT_SCHEMA)
  })

  it('the text read back is valid JSON and carries $schema', async () => {
    const answer = await client.request('resources/read', { uri: SCHEMA_URI })
    const text = (((answer['result'] as Json)['contents'] as Json[])[0] as Json)['text'] as string
    const schema = JSON.parse(text) as Json
    expect(typeof schema['$schema']).toBe('string')
  })

  it('the relay carries the schema as bytes, unread: any text handed in comes back unchanged', async () => {
    const other = new StdioClient()
    const odd = 'not json at all é日\r\n  trailing  '
    const second = await startMcpRelay({
      input: other.input,
      output: other.output,
      log: () => undefined,
      pageHtml: PAGE_HTML,
      documentSchema: odd,
      commandsSchema: COMMANDS_SCHEMA,
    })
    try {
      const answer = await other.request('resources/read', { uri: SCHEMA_URI })
      expect((((answer['result'] as Json)['contents'] as Json[])[0] as Json)['text']).toBe(odd)
    } finally {
      await Promise.race([second.close(), sleep(WAIT_MS)])
      other.input.end()
    }
  })

  it('reading any other uri answers MCP error -32002', async () => {
    for (const uri of ['grs-relay://other.json', 'file:///etc/passwd', 'grs-relay://grs-document.schema.json/x', '']) {
      const answer = await client.request('resources/read', { uri })
      expect((answer['error'] as Json | undefined)?.['code'], uri).toBe(RESOURCE_NOT_FOUND)
      expect(answer['result']).toBeUndefined()
    }
  })

  it('resources/read without a uri answers an error', async () => {
    const answer = await client.request('resources/read', {})
    expect(answer['error']).toBeDefined()
    expect(answer['result']).toBeUndefined()
  })

  it('a resource is not a tool: tools/list still answers mcpToolList() with 22 tools', async () => {
    const answer = await client.request('tools/list', {})
    const tools = (answer['result'] as Json)['tools'] as Json[]
    expect(tools).toEqual(mcpToolList())
    expect(tools).toHaveLength(22)
  })
})

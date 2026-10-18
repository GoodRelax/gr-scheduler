import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { connect, type Socket } from 'node:net'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'

type Json = Record<string, unknown>

const REAL_DOCUMENT_SCHEMA = readFileSync('docs/spec/_source/grs-document.schema.json', 'utf8')
const REAL_COMMANDS_SCHEMA = readFileSync('docs/spec/_source/grs-commands.schema.json', 'utf8')

const SMALL_DOCUMENT = JSON.stringify({
  title: 'small document',
  properties: {
    schemaVersion: { type: 'string', const: '2099-01-01T00:00:00Z' },
    schedule: { type: 'object' },
    settings: { type: 'object' },
  },
  $defs: {
    Task: {
      description: 'One task. It has a name and a list of dependencies.',
      properties: {
        owner: { $ref: '#/$defs/Resource' },
        calendar: { $ref: '#/$defs/Calendar' },
        links: { type: 'array', items: { $ref: '#/$defs/Dependency' } },
      },
    },
    Dependency: { description: 'One link between two tasks.', properties: { lag: { type: 'number' }, owner: { $ref: '#/$defs/Resource' } } },
    Resource: { description: 'One resource.', properties: { name: { type: 'string' } } },
    Calendar: { description: 'One calendar.', properties: { days: { type: 'array' } } },
  },
})

const SMALL_COMMANDS = JSON.stringify({
  title: 'small commands',
  oneOf: [{ $ref: '#/$defs/AddTask' }, { $ref: '#/$defs/RemoveTask' }],
  $defs: {
    AddTask: { description: 'Add a task.', properties: { task: { $ref: '#/$defs/NewTask' } } },
    NewTask: { description: 'The new task.', properties: { name: { type: 'string' } } },
    RemoveTask: { description: 'Remove a task.', properties: { uid: { type: 'number' } } },
  },
})

const WAIT_MS = 2000
const POLL_MS = 20
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><title>t</title>\n', 'utf8'))

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

async function until<T>(read: () => T | undefined, what: string, ms: number = WAIT_MS): Promise<T> {
  const deadline = Date.now() + ms
  for (;;) {
    const got = read()
    if (got !== undefined) return got
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`)
    await sleep(POLL_MS)
  }
}

class StdioClient {
  readonly input = new PassThrough()
  readonly output = new PassThrough()
  readonly messages: Json[] = []
  readonly unparsed: string[] = []
  private nextId = 1
  private held = ''

  constructor() {
    this.output.on('data', (chunk: Buffer) => {
      this.held += chunk.toString('utf8')
      for (let at = this.held.indexOf('\n'); at >= 0; at = this.held.indexOf('\n')) {
        const line = this.held.slice(0, at)
        this.held = this.held.slice(at + 1)
        try {
          this.messages.push(JSON.parse(line) as Json)
        } catch {
          this.unparsed.push(line)
        }
      }
    })
  }

  newId(): number {
    return this.nextId++
  }

  send(message: Json): void {
    this.input.write(`${JSON.stringify(message)}\n`)
  }

  answerTo(id: number, ms: number = WAIT_MS): Promise<Json> {
    return until(() => this.messages.find((one) => one['id'] === id), `the answer to request ${String(id)}`, ms)
  }

  async callTool(name: string, args?: Json, ms: number = WAIT_MS): Promise<Json> {
    const id = this.newId()
    this.send({ jsonrpc: '2.0', id, method: 'tools/call', params: args === undefined ? { name } : { name, arguments: args } })
    const answer = await this.answerTo(id, ms)
    if (answer['result'] === undefined) throw new Error(`tools/call ${name} answered ${JSON.stringify(answer)}`)
    return answer['result'] as Json
  }

  countOf(id: number): number {
    return this.messages.filter((one) => one['id'] === id).length
  }
}

type Answerer = (call: Json, page: FakePage) => Json | null

class FakePage {
  readonly received: Json[] = []
  closed = false
  private frames = Buffer.alloc(0)

  constructor(
    readonly socket: Socket,
    private readonly answerer: Answerer,
  ) {
    socket.on('close', () => {
      this.closed = true
    })
    socket.on('error', () => {
      this.closed = true
    })
  }

  feed(bytes: Buffer): void {
    this.frames = Buffer.concat([this.frames, bytes])
    for (;;) {
      const bytesNow = this.frames
      if (bytesNow.length < 2) return
      let length = (bytesNow[1] ?? 0) & 0x7f
      let at = 2
      if (length === 126) {
        if (bytesNow.length < 4) return
        length = bytesNow.readUInt16BE(2)
        at = 4
      }
      const masked = ((bytesNow[1] ?? 0) & 0x80) !== 0
      const mask = masked ? bytesNow.subarray(at, at + 4) : null
      if (masked) at += 4
      if (bytesNow.length < at + length) return
      const payload = Buffer.from(bytesNow.subarray(at, at + length))
      if (mask !== null) for (let i = 0; i < payload.length; i++) payload[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0)
      const opcode = (bytesNow[0] ?? 0) & 0x0f
      this.frames = bytesNow.subarray(at + length)
      this.take(opcode, payload)
    }
  }

  private take(opcode: number, payload: Buffer): void {
    if (opcode === 0x8) {
      this.closed = true
      this.socket.end()
      return
    }
    if (opcode === 0x9) {
      this.sendFrame(0xa, payload)
      return
    }
    if (opcode !== 0x1) return
    const message = JSON.parse(payload.toString('utf8')) as Json
    this.received.push(message)
    if (typeof message['method'] === 'string' && message['id'] !== undefined) {
      const answer = this.answerer(message, this)
      if (answer !== null) this.send({ jsonrpc: '2.0', id: message['id'], ...answer })
    }
  }

  private sendFrame(opcode: number, payload: Buffer): void {
    if (this.closed || this.socket.destroyed) return
    const mask = randomBytes(4)
    const length = payload.length
    const head =
      length < 126
        ? Buffer.from([0x80 | opcode, 0x80 | length])
        : Buffer.from([0x80 | opcode, 0x80 | 126, length >> 8, length & 0xff])
    const body = Buffer.from(payload)
    for (let i = 0; i < body.length; i++) body[i] = (body[i] ?? 0) ^ (mask[i % 4] ?? 0)
    this.socket.write(Buffer.concat([head, mask, body]))
  }

  send(message: Json): void {
    this.sendFrame(0x1, Buffer.from(JSON.stringify(message), 'utf8'))
  }

  presentKey(key: string): void {
    this.send({ jsonrpc: '2.0', method: 'relayKeyPresented', params: { key } })
  }

  callsOf(method: string): Json[] {
    return this.received.filter((one) => one['method'] === method)
  }

  drop(): void {
    this.closed = true
    this.socket.destroy()
  }
}

const sockets: Socket[] = []
const relays: McpRelay[] = []
const clients: StdioClient[] = []

function openSocket(port: number, answerer: Answerer): Promise<FakePage> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1')
    sockets.push(socket)
    const key = randomBytes(16).toString('base64')
    let held = Buffer.alloc(0)
    const timer = setTimeout(() => reject(new Error('the upgrade timed out')), WAIT_MS)
    const onData = (chunk: Buffer): void => {
      held = Buffer.concat([held, chunk])
      const end = held.indexOf('\r\n\r\n')
      if (end < 0) return
      socket.off('data', onData)
      clearTimeout(timer)
      const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(held.toString('latin1'))?.[1] ?? '0')
      const accept = createHash('sha1').update(key + WEBSOCKET_GUID).digest('base64')
      if (status !== 101 || !held.toString('latin1').includes(accept)) {
        reject(new Error(`the upgrade was refused: HTTP ${String(status)}`))
        return
      }
      const page = new FakePage(socket, answerer)
      socket.on('data', (bytes: Buffer) => page.feed(bytes))
      page.feed(held.subarray(end + 4))
      resolve(page)
    }
    socket.on('data', onData)
    socket.on('error', reject)
    socket.write(
      [
        'GET / HTTP/1.1',
        `Host: 127.0.0.1:${String(port)}`,
        `Origin: http://127.0.0.1:${String(port)}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n'),
    )
  })
}

interface Started {
  readonly relay: McpRelay
  readonly client: StdioClient
}

async function startRelay(options: Json = {}): Promise<Started> {
  const client = new StdioClient()
  clients.push(client)
  const relay = await startMcpRelay({
    input: client.input,
    output: client.output,
    log: () => undefined,
    pageHtml: PAGE_HTML,
    documentSchema: REAL_DOCUMENT_SCHEMA,
    commandsSchema: REAL_COMMANDS_SCHEMA,
    ...options,
  } as Parameters<typeof startMcpRelay>[0])
  relays.push(relay)
  return { relay, client }
}

const keyOf = (pageUrl: string): string => pageUrl.slice(pageUrl.indexOf('#') + 1)

const refusalOf = (result: Json): Json | undefined =>
  (result['structuredContent'] as { refusal?: Json } | undefined)?.refusal

const reasonOf = (result: Json): unknown => refusalOf(result)?.['reason']


async function connectPage({ relay, client }: Started, answerer: Answerer): Promise<FakePage> {
  const page = await openSocket(relay.port, answerer)
  page.presentKey(keyOf(relay.pageUrl))
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const result = await client.callTool('agentApiVersion')
    if (reasonOf(result) !== 'pageNotConnected') return page
    if (Date.now() > deadline) throw new Error('the relay never took the page')
    await sleep(POLL_MS)
  }
}



const SCHEMA_URI = 'grs-relay://grs-document.schema.json'
const COMMANDS_URI = 'grs-relay://grs-commands.schema.json'

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
})

async function readResource(client: StdioClient, uri: string): Promise<string> {
  const id = client.newId()
  client.send({ jsonrpc: '2.0', id, method: 'resources/read', params: { uri } })
  const answer = await client.answerTo(id)
  const contents = (answer['result'] as Json)['contents'] as Json[]
  return contents[0]?.['text'] as string
}

async function textOf(client: StdioClient, args?: Json): Promise<string> {
  const result = await client.callTool('readSchema', args)
  expect(result['isError']).not.toBe(true)
  const content = result['content'] as Json[]
  expect(content).toHaveLength(1)
  expect(content[0]?.['type']).toBe('text')
  return content[0]?.['text'] as string
}

async function jsonOf(client: StdioClient, args: Json): Promise<Json> {
  return JSON.parse(await textOf(client, args)) as Json
}

async function initializeInstructions(client: StdioClient): Promise<string> {
  const id = client.newId()
  client.send({
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } },
  })
  const answer = await client.answerTo(id)
  return (answer['result'] as Json)['instructions'] as string
}

function notesInSpec(): string {
  const text = readFileSync('docs/spec/_assets/tbl-agent-api-members.md', 'utf8').replace(/\r\n/g, '\n')
  const heading = text.indexOf('**スキーマの注意')
  const open = text.indexOf('```text\n', heading)
  const close = text.indexOf('\n```', open + 8)
  return text.slice(open + 8, close)
}

const defNamesOf = (text: string): string[] => Object.keys(((JSON.parse(text) as Json)['$defs'] ?? {}) as Json)

const versionOf = (text: string): unknown =>
  (((JSON.parse(text) as Json)['properties'] as Json)['schemaVersion'] as Json)['const']

describe('AM-30 readSchema without defs or full is a table of contents', () => {
  it.each([
    ['document', REAL_DOCUMENT_SCHEMA],
    ['commands', REAL_COMMANDS_SCHEMA],
  ])('which %s lists the version, the top-level keys and one line per definition, far shorter than the schema', async (which, schema) => {
    const { client } = await startRelay()
    const text = await textOf(client, { which })
    const toc = JSON.parse(text) as Json
    const parsed = JSON.parse(schema) as Json
    expect(toc['which']).toBe(which)
    expect(toc['schemaVersion']).toBe(versionOf(REAL_DOCUMENT_SCHEMA))
    expect(toc['topLevelKeys']).toEqual(Object.keys((parsed['properties'] ?? {}) as Json))
    const defs = toc['defs'] as Json[]
    expect(defs.map((one) => one['name'])).toEqual(defNamesOf(schema))
    for (const one of defs) expect(typeof one['about']).toBe('string')
    expect(text.length).toBeLessThan(schema.length / 3)
  })

  it('the document table of contents names the version and definitions of the document schema resource', async () => {
    const { client } = await startRelay()
    const toc = await jsonOf(client, { which: 'document' })
    const resource = await readResource(client, SCHEMA_URI)
    expect(toc['schemaVersion']).toBe(versionOf(resource))
    expect((toc['defs'] as Json[]).map((one) => one['name'])).toEqual(defNamesOf(resource))
    expect((toc['defs'] as Json[]).length).toBeGreaterThan(0)
  })

  it('a schema with definitions lists them in order', async () => {
    const { client } = await startRelay({ documentSchema: SMALL_DOCUMENT, commandsSchema: SMALL_COMMANDS })
    const document = await jsonOf(client, { which: 'document' })
    expect(document['schemaVersion']).toBe('2099-01-01T00:00:00Z')
    expect(document['topLevelKeys']).toEqual(['schemaVersion', 'schedule', 'settings'])
    expect((document['defs'] as Json[]).map((one) => one['name'])).toEqual(['Task', 'Dependency', 'Resource', 'Calendar'])
    const commands = await jsonOf(client, { which: 'commands' })
    expect((commands['defs'] as Json[]).map((one) => one['name'])).toEqual(['AddTask', 'NewTask', 'RemoveTask'])
  })

  it('works while a page is connected and never asks the page', async () => {
    const started = await startRelay()
    const page = await connectPage(started, () => ({ result: '1.0-fake' }))
    const toc = await jsonOf(started.client, { which: 'document' })
    expect(Array.isArray(toc['defs'])).toBe(true)
    expect(page.callsOf('readSchema')).toHaveLength(0)
  })
})

describe('AM-30 readSchema with defs hands only those definitions', () => {
  it('Task and Dependency of the document schema are deep-equal to the resource entries', async () => {
    const { client } = await startRelay()
    const answer = await jsonOf(client, { which: 'document', defs: ['Task', 'Dependency'] })
    const resource = JSON.parse(await readResource(client, SCHEMA_URI)) as Json
    const all = resource['$defs'] as Json
    expect(Object.keys(answer['defs'] as Json).sort()).toEqual(['Dependency', 'Task'])
    expect((answer['defs'] as Json)['Task']).toEqual(all['Task'])
    expect((answer['defs'] as Json)['Dependency']).toEqual(all['Dependency'])
    expect(answer['unknown']).toEqual([])
    const refersTo = answer['refersTo'] as string[]
    expect(refersTo).not.toContain('Task')
    expect(refersTo).not.toContain('Dependency')
    for (const name of refersTo) expect(Object.keys(all)).toContain(name)
  })

  it('refersTo lists the other definitions that the picked ones point at', async () => {
    const { client } = await startRelay({ documentSchema: SMALL_DOCUMENT, commandsSchema: SMALL_COMMANDS })
    const answer = await jsonOf(client, { which: 'document', defs: ['Task', 'Dependency'] })
    expect((answer['refersTo'] as string[]).slice().sort()).toEqual(['Calendar', 'Resource'])
    expect(answer['unknown']).toEqual([])
    const commands = await jsonOf(client, { which: 'commands', defs: ['AddTask'] })
    expect(commands['refersTo']).toEqual(['NewTask'])
    expect(Object.keys(commands['defs'] as Json)).toEqual(['AddTask'])
  })

  it('names that are not definitions come back as unknown', async () => {
    const { client } = await startRelay()
    const answer = await jsonOf(client, { which: 'document', defs: ['Task', 'NoSuch'] })
    expect(answer['unknown']).toEqual(['NoSuch'])
    expect(Object.keys(answer['defs'] as Json)).toEqual(['Task'])
  })

  it('works with no page connected and for the commands schema', async () => {
    const { client } = await startRelay({ documentSchema: SMALL_DOCUMENT, commandsSchema: SMALL_COMMANDS })
    const answer = await jsonOf(client, { which: 'commands', defs: ['RemoveTask', 'Missing'] })
    expect(answer['unknown']).toEqual(['Missing'])
    expect(Object.keys(answer['defs'] as Json)).toEqual(['RemoveTask'])
  })
})

describe('AM-30 readSchema with full true hands the whole text', () => {
  it.each([
    ['document', SCHEMA_URI],
    ['commands', COMMANDS_URI],
  ])('which %s with full true is the same text as resources/read', async (which, uri) => {
    const { client } = await startRelay()
    const text = await textOf(client, { which, full: true })
    expect(text).toBe(await readResource(client, uri))
  })

  it('full true wins over defs', async () => {
    const { client } = await startRelay()
    const text = await textOf(client, { which: 'document', defs: ['Task'], full: true })
    expect(text).toBe(await readResource(client, SCHEMA_URI))
  })

  it('full false is a table of contents', async () => {
    const { client } = await startRelay()
    const toc = await jsonOf(client, { which: 'document', full: false })
    expect(Array.isArray(toc['defs'])).toBe(true)
    expect(toc['topLevelKeys']).toBeDefined()
  })
})

describe('AM-30 readSchema with which notes hands the short notes', () => {
  it('is the text printed in the table of agent members, ASCII only, with no row id', async () => {
    const { client } = await startRelay()
    const text = await textOf(client, { which: 'notes' })
    expect(text).toBe(notesInSpec())
    expect(text).toMatch(/^[\x09\x0a\x0d\x20-\x7e]+$/)
    expect(text).not.toMatch(/\b[A-Z]{1,4}-\d+[a-z]?\b/)
    expect(text).toContain('linkLag')
    expect(text).toContain('uidHighWaterMark')
    expect(text).toContain('scheduleDataTimeZone')
  })

  it('works while a page is connected without asking the page', async () => {
    const started = await startRelay()
    const page = await connectPage(started, () => ({ result: '1.0-fake' }))
    expect(await textOf(started.client, { which: 'notes' })).toBe(notesInSpec())
    expect(page.callsOf('readSchema')).toHaveLength(0)
  })
})

describe('AM-30 readSchema refuses a malformed request as a value', () => {
  it.each([
    [{ which: 'other' }],
    [{}],
    [{ which: 7 }],
    [{ which: 'toString' }],
    [{ which: 'document', defs: 'Task' }],
    [{ which: 'document', defs: [1] }],
    [{ which: 'commands', defs: ['Task', 2] }],
    [{ which: 'document', full: 'yes' }],
    [{ which: 'document', full: 1 }],
    [{ which: 'notes', full: 'true' }],
  ])('%j answers malformedRequest', async (args) => {
    const { client } = await startRelay()
    const result = await client.callTool('readSchema', args as Json)
    expect(reasonOf(result)).toBe('malformedRequest')
  })

  it('no arguments at all is the same refusal', async () => {
    const { client } = await startRelay()
    expect(reasonOf(await client.callTool('readSchema'))).toBe('malformedRequest')
  })
})

describe('AG-12 the initialize instructions and the tool list point at the parts', () => {
  it('the instructions no longer say to read the resource first and mention notes and defs', async () => {
    const { client } = await startRelay()
    const text = await initializeInstructions(client)
    expect(text).not.toContain('Before you read or write a document, read the resource')
    expect(text).toContain('readSchema')
    expect(text).toContain('notes')
    expect(text).toContain('defs')
    expect(text).toMatch(/reading only[^.]*column descriptions/i)
  })

  it('readSchema in tools/list takes which, defs and full', async () => {
    const { client } = await startRelay()
    const id = client.newId()
    client.send({ jsonrpc: '2.0', id, method: 'tools/list', params: {} })
    const tools = ((await client.answerTo(id))['result'] as Json)['tools'] as Json[]
    const tool = tools.find((one) => one['name'] === 'readSchema')
    const input = tool?.['inputSchema'] as Json
    const properties = input['properties'] as Record<string, Json>
    expect(Object.keys(properties).sort()).toEqual(['defs', 'full', 'which'])
    expect([...(properties['which']?.['enum'] as string[])].sort()).toEqual(['commands', 'document', 'notes'])
    expect(properties['defs']?.['type']).toBe('array')
    expect((properties['defs']?.['items'] as Json)['type']).toBe('string')
    expect(properties['full']?.['type']).toBe('boolean')
  })
})

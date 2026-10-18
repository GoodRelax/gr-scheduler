// CR-799 spec-only tests: the relay answers readSchema itself (AM-30) and names saved files by their absolute place (AV-21, AG-12 (9)).

import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { connect, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { isAbsolute, join, sep } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi, type AgentApiWiring } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'

type Json = Record<string, unknown>

const WAIT_MS = 2000
const POLL_MS = 20
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><title>t</title>\n', 'utf8'))
const DOCUMENT_SCHEMA = '{"title":"test schema"}\n'
const COMMANDS_SCHEMA = '{"title":"test commands schema"}'

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
    documentSchema: DOCUMENT_SCHEMA,
    commandsSchema: COMMANDS_SCHEMA,
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


const structuredOf = (result: Json): Json => result['structuredContent'] as Json

const SCHEMA_URI = 'grs-relay://grs-document.schema.json'
const COMMANDS_URI = 'grs-relay://grs-commands.schema.json'

const bases: string[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
  for (const base of bases.splice(0)) rmSync(base, { recursive: true, force: true })
})

async function readResource(client: StdioClient, uri: string): Promise<string> {
  const id = client.newId()
  client.send({ jsonrpc: '2.0', id, method: 'resources/read', params: { uri } })
  const answer = await client.answerTo(id)
  const contents = (answer['result'] as Json)['contents'] as Json[]
  return contents[0]?.['text'] as string
}

describe('AM-30 readSchema: the relay answers it itself, with the text of the matching resource', () => {
  it('tools/list holds readSchema', async () => {
    const { client } = await startRelay()
    const id = client.newId()
    client.send({ jsonrpc: '2.0', id, method: 'tools/list', params: {} })
    const tools = ((await client.answerTo(id))['result'] as Json)['tools'] as Json[]
    expect(tools.map((one) => one['name'])).toContain('readSchema')
  })

  it.each([
    ['document', SCHEMA_URI, DOCUMENT_SCHEMA],
    ['commands', COMMANDS_URI, COMMANDS_SCHEMA],
  ])('which %s returns the same text as resources/read, with no page connected', async (which, uri, text) => {
    const { client } = await startRelay()
    const result = await client.callTool('readSchema', { which, full: true })
    expect(result['isError']).not.toBe(true)
    const content = result['content'] as Json[]
    expect(content).toHaveLength(1)
    expect(content[0]?.['type']).toBe('text')
    expect(content[0]?.['text']).toBe(await readResource(client, uri))
    expect(content[0]?.['text']).toBe(text)
  })

  it('still answers when a page is connected, and never asks the page', async () => {
    const started = await startRelay()
    const page = await connectPage(started, () => ({ result: '1.0-fake' }))
    const result = await started.client.callTool('readSchema', { which: 'document', full: true })
    expect((result['content'] as Json[])[0]?.['text']).toBe(DOCUMENT_SCHEMA)
    expect(page.callsOf('readSchema')).toHaveLength(0)
  })

  it.each([[{ which: 'other' }], [{}], [{ which: 7 }], [{ which: 'toString' }]])(
    'a bad which %j is a refusal value with the reason malformedRequest',
    async (args) => {
      const { client } = await startRelay()
      const result = await client.callTool('readSchema', args as Json)
      expect(reasonOf(result)).toBe('malformedRequest')
    },
  )

  it('no arguments at all is the same refusal', async () => {
    const { client } = await startRelay()
    expect(reasonOf(await client.callTool('readSchema'))).toBe('malformedRequest')
  })

  it("the page's AgentApi has no readSchema member (the relay answers it)", () => {
    const api = installAgentApi({ schemaVersion: 'x' } as unknown as AgentApiWiring) as unknown as Record<string, unknown>
    expect(Object.keys(api)).not.toContain('readSchema')
    expect(api['readSchema']).toBeUndefined()
  })
})

describe('AV-21: savedTo and backedUpTo are absolute places inside the save folder', () => {
  async function savingSetup(): Promise<{ started: Started; folder: string }> {
    const base = mkdtempSync(join(tmpdir(), 'grs-cr799-'))
    bases.push(base)
    const folder = join(base, 'save')
    mkdirSync(folder)
    const started = await startRelay({ saveFolder: folder })
    await connectPage(started, (call) => {
      if (String(call['method']) === 'agentApiVersion') return { result: '1.0-fake' }
      return { result: { ok: true, value: '{"first":1}' } }
    })
    return { started, folder }
  }

  it('a first save answers an absolute savedTo under the real place of the save folder, and backedUpTo null', async () => {
    const { started, folder } = await savingSetup()
    const saved = structuredOf(await started.client.callTool('exportJson', { fileName: 'plan.json' }))
    expect(saved['ok']).toBe(true)
    const savedTo = saved['savedTo'] as string
    expect(isAbsolute(savedTo)).toBe(true)
    expect(savedTo.startsWith(realpathSync(folder) + sep)).toBe(true)
    expect(savedTo.endsWith(`${sep}plan.json`)).toBe(true)
    expect(saved['backedUpTo']).toBeNull()
  })

  it('an overwrite answers an absolute backedUpTo under the save folder', async () => {
    const { started, folder } = await savingSetup()
    writeFileSync(join(folder, 'plan.json'), 'old')
    const saved = structuredOf(await started.client.callTool('exportJson', { fileName: 'plan.json', overwrite: true }))
    expect(saved['ok']).toBe(true)
    const backedUpTo = saved['backedUpTo'] as string
    expect(isAbsolute(backedUpTo)).toBe(true)
    expect(backedUpTo.startsWith(realpathSync(folder) + sep)).toBe(true)
    expect(backedUpTo.endsWith('.bak')).toBe(true)
  })

  it('a file in a sub-folder is named with its whole absolute place', async () => {
    const { started, folder } = await savingSetup()
    const saved = structuredOf(await started.client.callTool('exportJson', { fileName: 'sub/plan.json' }))
    const savedTo = saved['savedTo'] as string
    expect(isAbsolute(savedTo)).toBe(true)
    expect(savedTo.startsWith(realpathSync(folder) + sep)).toBe(true)
  })
})

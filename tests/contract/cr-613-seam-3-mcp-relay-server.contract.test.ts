// CR-613 / CR-620 spec-only tests: SEAM-3, startMcpRelay (PI-41, UF-187) in process, over real sockets on 127.0.0.1.

import { createHash, randomBytes } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { connect, type Socket } from 'node:net'
import { networkInterfaces } from 'node:os'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  mcpToolList,
  pageNotConnectedResult,
} from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'

type Json = Record<string, unknown>

const WAIT_MS = 1500
const POLL_MS = 20
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const PAGE_HTML = new Uint8Array(
  Buffer.from('<!doctype html><html><head><title>t</title></head><body>é日 page</body></html>\n', 'utf8'),
)

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
  readonly lines: string[] = []
  readonly messages: (Json | undefined)[] = []
  private nextId = 1
  private held = ''

  constructor() {
    this.output.on('data', (chunk: Buffer) => {
      this.held += chunk.toString('utf8')
      for (let at = this.held.indexOf('\n'); at >= 0; at = this.held.indexOf('\n')) {
        const line = this.held.slice(0, at)
        this.held = this.held.slice(at + 1)
        this.lines.push(line)
        try {
          this.messages.push(JSON.parse(line) as Json)
        } catch {
          this.messages.push(undefined)
        }
      }
    })
  }

  send(message: Json): void {
    this.input.write(`${JSON.stringify(message)}\n`)
  }

  newId(): number {
    return this.nextId++
  }

  answerTo(id: number, ms: number = WAIT_MS): Promise<Json> {
    return until(() => this.messages.find((one) => one?.['id'] === id), `the answer to request ${String(id)}`, ms)
  }

  async request(method: string, params?: Json, ms: number = WAIT_MS): Promise<Json> {
    const id = this.newId()
    this.send(params === undefined ? { jsonrpc: '2.0', id, method } : { jsonrpc: '2.0', id, method, params })
    return this.answerTo(id, ms)
  }

  async callTool(name: string, args?: Json, ms: number = WAIT_MS): Promise<Json> {
    const answer = await this.request('tools/call', args === undefined ? { name } : { name, arguments: args }, ms)
    if (answer['result'] === undefined) throw new Error(`tools/call ${name} answered ${JSON.stringify(answer)}`)
    return answer['result'] as Json
  }
}

const isPageNotConnected = (result: Json): boolean => {
  const structured = result['structuredContent'] as { refusal?: { reason?: string } } | undefined
  return structured?.refusal?.reason === 'pageNotConnected'
}

interface Handshake {
  readonly status: number
  readonly headers: Readonly<Record<string, string>>
  readonly page: FakePage | null
}

type Answerer = (call: Json, page: FakePage) => Json | null

class FakePage {
  readonly received: Json[] = []
  closed = false
  private frames = Buffer.alloc(0)
  private fragments: Buffer[] = []

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
      const frame = this.nextFrame()
      if (frame === null) return
      this.take(frame.opcode, frame.fin, frame.payload)
    }
  }

  private nextFrame(): { opcode: number; fin: boolean; payload: Buffer } | null {
    const bytes = this.frames
    if (bytes.length < 2) return null
    const first = bytes[0] ?? 0
    const second = bytes[1] ?? 0
    let length = second & 0x7f
    let at = 2
    if (length === 126) {
      if (bytes.length < 4) return null
      length = bytes.readUInt16BE(2)
      at = 4
    } else if (length === 127) {
      if (bytes.length < 10) return null
      length = Number(bytes.readBigUInt64BE(2))
      at = 10
    }
    const masked = (second & 0x80) !== 0
    const mask = masked ? bytes.subarray(at, at + 4) : null
    if (masked) at += 4
    if (bytes.length < at + length) return null
    const payload = Buffer.from(bytes.subarray(at, at + length))
    if (mask !== null) for (let i = 0; i < payload.length; i++) payload[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0)
    this.frames = bytes.subarray(at + length)
    return { opcode: first & 0x0f, fin: (first & 0x80) !== 0, payload }
  }

  private take(opcode: number, fin: boolean, payload: Buffer): void {
    if (opcode === 0x8) {
      this.closed = true
      this.socket.end()
      return
    }
    if (opcode === 0x9) {
      this.sendFrame(0xa, payload)
      return
    }
    if (opcode === 0x1 || opcode === 0x0) {
      this.fragments.push(payload)
      if (!fin) return
      const text = Buffer.concat(this.fragments).toString('utf8')
      this.fragments = []
      const message = JSON.parse(text) as Json
      this.received.push(message)
      if (typeof message['method'] === 'string' && message['id'] !== undefined) {
        const answer = this.answerer(message, this)
        if (answer !== null) this.send({ jsonrpc: '2.0', id: message['id'], ...answer })
      }
    }
  }

  private sendFrame(opcode: number, payload: Buffer): void {
    if (this.closed || this.socket.destroyed) return
    const mask = randomBytes(4)
    const length = payload.length
    const head =
      length < 126
        ? Buffer.from([0x80 | opcode, 0x80 | length])
        : length < 65536
          ? Buffer.from([0x80 | opcode, 0x80 | 126, length >> 8, length & 0xff])
          : ((): Buffer => {
              const big = Buffer.alloc(10)
              big[0] = 0x80 | opcode
              big[1] = 0x80 | 127
              big.writeBigUInt64BE(BigInt(length), 2)
              return big
            })()
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

  notice(notice: unknown): void {
    this.send({ jsonrpc: '2.0', method: 'changeNoticed', params: notice })
  }

  callsOf(method: string): Json[] {
    return this.received.filter((one) => one['method'] === method)
  }

  drop(): void {
    this.closed = true
    this.socket.destroy()
  }

  closeCleanly(): void {
    this.sendFrame(0x8, Buffer.from([0x03, 0xe9]))
    this.closed = true
    this.socket.end()
  }

  async isClosedWithin(ms: number = WAIT_MS): Promise<boolean> {
    try {
      await until(() => (this.closed ? true : undefined), 'the socket to close', ms)
      return true
    } catch {
      return false
    }
  }
}

const defaultAnswerer: Answerer = (call) => {
  const method = String(call['method'])
  if (method === 'agentApiVersion') return { result: '1.0-fake' }
  if (method === 'watchChanges') return { result: { hasReplacedEarlierWatch: false } }
  return { result: { ok: true, stamp: 'stamp-1', value: { method, params: call['params'] } } }
}

const sockets: Socket[] = []

function handshake(
  port: number,
  headers: { host?: string | null; origin?: string | null; path?: string },
  answerer: Answerer = defaultAnswerer,
): Promise<Handshake> {
  return new Promise((resolve) => {
    const socket = connect(port, '127.0.0.1')
    sockets.push(socket)
    const key = randomBytes(16).toString('base64')
    const lines = [`GET ${headers.path ?? '/'} HTTP/1.1`]
    if (headers.host !== null) lines.push(`Host: ${headers.host ?? `127.0.0.1:${String(port)}`}`)
    if (headers.origin !== null) lines.push(`Origin: ${headers.origin ?? `http://127.0.0.1:${String(port)}`}`)
    lines.push('Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Key: ${key}`, 'Sec-WebSocket-Version: 13')
    let held = Buffer.alloc(0)
    let settled = false
    const settle = (value: Handshake): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      socket.destroy()
      settle({ status: 0, headers: {}, page: null })
    }, WAIT_MS)
    const onData = (chunk: Buffer): void => {
      held = Buffer.concat([held, chunk])
      const end = held.indexOf('\r\n\r\n')
      if (end < 0) return
      socket.off('data', onData)
      const head = held.subarray(0, end).toString('latin1').split('\r\n')
      const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(head[0] ?? '')?.[1] ?? '0')
      const parsed: Record<string, string> = {}
      for (const line of head.slice(1)) {
        const colon = line.indexOf(':')
        if (colon > 0) parsed[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim()
      }
      if (status !== 101) {
        socket.destroy()
        settle({ status, headers: parsed, page: null })
        return
      }
      const accept = createHash('sha1').update(key + WEBSOCKET_GUID).digest('base64')
      if (parsed['sec-websocket-accept'] !== accept) {
        socket.destroy()
        settle({ status: -1, headers: parsed, page: null })
        return
      }
      const page = new FakePage(socket, answerer)
      socket.on('data', (bytes: Buffer) => page.feed(bytes))
      page.feed(held.subarray(end + 4))
      settle({ status, headers: parsed, page })
    }
    socket.on('data', onData)
    socket.on('error', () => settle({ status: 0, headers: {}, page: null }))
    socket.on('close', () => settle({ status: 0, headers: {}, page: null }))
    socket.write(`${lines.join('\r\n')}\r\n\r\n`)
  })
}

interface HttpAnswer {
  readonly status: number
  readonly contentType: string
  readonly body: Buffer
}

function httpAsk(port: number, method: string, path: string, host?: string): Promise<HttpAnswer> {
  return new Promise((resolve, reject) => {
    const asked = httpRequest(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        agent: false,
        headers: { Host: host ?? `127.0.0.1:${String(port)}`, Connection: 'close' },
      },
      (answer) => {
        const parts: Buffer[] = []
        answer.on('data', (chunk: Buffer) => parts.push(chunk))
        answer.on('end', () =>
          resolve({
            status: answer.statusCode ?? 0,
            contentType: String(answer.headers['content-type'] ?? ''),
            body: Buffer.concat(parts),
          }),
        )
      },
    )
    asked.setTimeout(WAIT_MS, () => asked.destroy(new Error(`${method} ${path} timed out`)))
    asked.on('error', reject)
    asked.end()
  })
}

function reaches(host: string, port: number, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    sockets.push(socket)
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, ms)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

let relay: McpRelay | null = null
let client = new StdioClient()
const logLines: string[] = []

const theRelay = (): McpRelay => {
  if (relay === null) throw new Error('the relay did not start')
  return relay
}

const keyOf = (pageUrl: string): string => pageUrl.slice(pageUrl.indexOf('#') + 1)

async function connectPage(answerer: Answerer = defaultAnswerer): Promise<FakePage> {
  const opened = await handshake(theRelay().port, {}, answerer)
  if (opened.page === null) throw new Error(`the page could not open a socket: HTTP ${String(opened.status)}`)
  opened.page.presentKey(keyOf(theRelay().pageUrl))
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    const result = await client.callTool('agentApiVersion')
    if (!isPageNotConnected(result)) return opened.page
    if (Date.now() > deadline) throw new Error('the relay never took the page')
    await sleep(POLL_MS)
  }
}

async function pageDropNoticed(): Promise<void> {
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    if (isPageNotConnected(await client.callTool('readStamp'))) return
    if (Date.now() > deadline) throw new Error('the relay never noticed the page drop')
    await sleep(POLL_MS)
  }
}

const noticesOf = (result: Json): unknown =>
  (result['structuredContent'] as { notices?: unknown } | undefined)?.notices

beforeEach(async () => {
  client = new StdioClient()
  logLines.length = 0
  relay = await startMcpRelay({
    input: client.input,
    output: client.output,
    log: (line) => void logLines.push(line),
    pageHtml: PAGE_HTML,
  })
})

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  const closing = relay
  relay = null
  if (closing !== null) await Promise.race([closing.close(), sleep(WAIT_MS)])
  client.input.end()
})

describe('SEAM-3 start: where the relay listens and what it tells (AG-12 (1) (7), design 4 and 7)', () => {
  it('design 4 step 1: the page URL is http://127.0.0.1:<port>/#<key>, and it is written to the log', () => {
    const { port, pageUrl } = theRelay()
    expect(Number.isInteger(port) && port > 0).toBe(true)
    expect(pageUrl.startsWith(`http://127.0.0.1:${String(port)}/#`)).toBe(true)
    expect(logLines.some((line) => line.includes(pageUrl))).toBe(true)
  })

  it('AG-12 (7): the key is URL-safe and long enough for 128 random bits', () => {
    expect(keyOf(theRelay().pageUrl)).toMatch(/^[A-Za-z0-9_-]{22,}$/)
  })

  it('AG-12 (7): each start makes a new key', async () => {
    const other = new StdioClient()
    const second = await startMcpRelay({ input: other.input, output: other.output, log: () => undefined, pageHtml: PAGE_HTML })
    try {
      expect(keyOf(second.pageUrl)).not.toBe(keyOf(theRelay().pageUrl))
    } finally {
      await Promise.race([second.close(), sleep(WAIT_MS)])
      other.input.end()
    }
  })

  it('AG-12 (1) / design 7: it listens on 127.0.0.1 only -- not on ::1 nor on another address of this machine', async () => {
    const port = theRelay().port
    expect(await reaches('127.0.0.1', port, WAIT_MS)).toBe(true)
    const others = ['::1']
    for (const list of Object.values(networkInterfaces())) {
      for (const one of list ?? []) if (!one.internal && one.family === 'IPv4') others.push(one.address)
    }
    const reached = await Promise.all(others.map(async (host) => ((await reaches(host, port, 1000)) ? host : null)))
    expect(reached.filter((host) => host !== null)).toEqual([])
  })

  it('SEAM-3: nothing is written to standard output before the client speaks', async () => {
    await sleep(50)
    expect(client.lines).toEqual([])
  })
})

describe('SEAM-3 HTTP: the relay hands out the page and nothing else (design 3.2, CR-620)', () => {
  it('design 3.2: GET / returns the page bytes unchanged, as text/html; charset=utf-8', async () => {
    const got = await httpAsk(theRelay().port, 'GET', '/')
    expect(got.status).toBe(200)
    expect(got.contentType).toBe('text/html; charset=utf-8')
    expect(Buffer.compare(got.body, Buffer.from(PAGE_HTML))).toBe(0)
  })

  it('design 3.2: any other path is 404', async () => {
    for (const path of ['/index.html', '/favicon.ico', '/ws', '/a/b']) {
      expect((await httpAsk(theRelay().port, 'GET', path)).status, path).toBe(404)
    }
  })

  it('design 3.2: any other method is 405', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      expect((await httpAsk(theRelay().port, method, '/')).status, method).toBe(405)
    }
  })

  it('CR-620 / design 7: a Host that is not 127.0.0.1:<port> is refused with 403, GET / included', async () => {
    const port = theRelay().port
    for (const host of [`localhost:${String(port)}`, 'evil.example', '127.0.0.1', `127.0.0.1:${String(port + 1)}`]) {
      const got = await httpAsk(port, 'GET', '/', host)
      expect(got.status, host).toBe(403)
      expect(Buffer.from(got.body).includes(Buffer.from('page</body>')), host).toBe(false)
    }
  })
})

describe('SEAM-3 WebSocket: who may connect (AG-12 (3) (7), design 5 and 7, CR-620)', () => {
  it('AG-12 (7): the page\'s own origin upgrades on /', async () => {
    const opened = await handshake(theRelay().port, {})
    expect(opened.status).toBe(101)
  })

  it('AG-12 (7) / CR-620: another Origin, "null", or none at all is refused with 403 and no upgrade', async () => {
    const port = theRelay().port
    for (const one of [
      `http://localhost:${String(port)}`,
      `https://127.0.0.1:${String(port)}`,
      `http://127.0.0.1:${String(port + 1)}`,
      'http://evil.example',
      'null',
      null,
    ]) {
      const opened = await handshake(port, { origin: one })
      expect(opened.status, String(one)).toBe(403)
    }
  })

  it('CR-620 / design 7: an upgrade whose Host is not 127.0.0.1:<port> is refused with 403', async () => {
    const port = theRelay().port
    for (const host of [`localhost:${String(port)}`, 'evil.example', `127.0.0.1:${String(port + 1)}`]) {
      const opened = await handshake(port, { host })
      expect(opened.status, host).toBe(403)
    }
  })

  it('SEAM-3: an upgrade on a path other than / is not upgraded', async () => {
    const opened = await handshake(theRelay().port, { path: '/socket' })
    expect(opened.status).not.toBe(101)
  })

  it('AG-12 (7): a wrong key closes the socket, and the relay still has no page', async () => {
    const opened = await handshake(theRelay().port, {})
    const page = opened.page as FakePage
    page.presentKey(`${keyOf(theRelay().pageUrl)}x`)
    expect(await page.isClosedWithin()).toBe(true)
    expect(isPageNotConnected(await client.callTool('readStamp'))).toBe(true)
    expect(page.callsOf('readStamp')).toEqual([])
  })

  it('AG-12 (7): a first message that is not the key closes the socket', async () => {
    const opened = await handshake(theRelay().port, {})
    const page = opened.page as FakePage
    page.notice({ kind: 'scheduleChanged' })
    expect(await page.isClosedWithin()).toBe(true)
    expect(isPageNotConnected(await client.callTool('readStamp'))).toBe(true)
  })

  it('AG-12 (7): an empty key closes the socket', async () => {
    const opened = await handshake(theRelay().port, {})
    const page = opened.page as FakePage
    page.presentKey('')
    expect(await page.isClosedWithin()).toBe(true)
  })

  it('AG-12 (3): a second page is closed and the first stays connected', async () => {
    const first = await connectPage()
    const opened = await handshake(theRelay().port, {})
    if (opened.page !== null) {
      opened.page.presentKey(keyOf(theRelay().pageUrl))
      expect(await opened.page.isClosedWithin()).toBe(true)
    } else {
      expect(opened.status).not.toBe(101)
    }
    const result = await client.callTool('readSearchRows', { word: 'still-first' })
    expect(isPageNotConnected(result)).toBe(false)
    expect(first.callsOf('readSearchRows')).toHaveLength(1)
    expect(first.closed).toBe(false)
  })

  it('AG-12 (7): a refused socket does not take the place -- the right key connects afterwards', async () => {
    const opened = await handshake(theRelay().port, {})
    ;(opened.page as FakePage).presentKey('wrong-key-wrong-key-wrong')
    expect(await (opened.page as FakePage).isClosedWithin()).toBe(true)
    const page = await connectPage()
    expect(page.closed).toBe(false)
  })
})

describe('SEAM-3 MCP over stdio: the protocol messages', () => {
  it('SEAM-3 initialize: echoes the client\'s protocol version, tools capability, serverInfo grs-relay', async () => {
    const answer = await client.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    })
    const result = answer['result'] as Json
    expect(result['protocolVersion']).toBe('2025-03-26')
    expect(result['capabilities']).toEqual({ tools: {} })
    const info = result['serverInfo'] as Json
    expect(info['name']).toBe('grs-relay')
    expect(typeof info['version']).toBe('string')
  })

  it('SEAM-3 initialize: without a version from the client it answers 2025-06-18', async () => {
    const answer = await client.request('initialize', { capabilities: {}, clientInfo: { name: 'test', version: '0' } })
    expect((answer['result'] as Json)['protocolVersion']).toBe('2025-06-18')
  })

  it('SEAM-3: a notification gets no reply, and ping answers {}', async () => {
    const before = client.messages.length
    client.send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    const id = client.newId()
    client.send({ jsonrpc: '2.0', id, method: 'ping' })
    const answer = await client.answerTo(id)
    expect(answer['result']).toEqual({})
    expect(client.messages.slice(before).map((one) => one?.['id'])).toEqual([id])
  })

  it('AG-12 (4) / SEAM-3: tools/list answers mcpToolList()', async () => {
    const answer = await client.request('tools/list', {})
    expect((answer['result'] as Json)['tools']).toEqual(mcpToolList())
  })

  it('SEAM-3: an unknown tool is JSON-RPC error -32602', async () => {
    const answer = await client.request('tools/call', { name: 'notATool', arguments: {} })
    expect((answer['error'] as Json | undefined)?.['code']).toBe(-32602)
  })

  it('SEAM-3: an unknown method is JSON-RPC error -32601', async () => {
    const answer = await client.request('resources/list', {})
    expect((answer['error'] as Json | undefined)?.['code']).toBe(-32601)
  })

  it('AG-12 (2) / design 5: tools/call with no page answers pageNotConnectedResult(pageUrl)', async () => {
    const result = await client.callTool('readStamp')
    expect(result).toEqual(pageNotConnectedResult(theRelay().pageUrl))
  })

  it('SEAM-3: standard output carries only JSON-RPC lines -- the log goes elsewhere', async () => {
    await client.request('initialize', { protocolVersion: '2025-06-18', capabilities: {} })
    await client.request('tools/list', {})
    await client.callTool('readStamp')
    const page = await connectPage()
    await client.callTool('readSearchRows', { word: 'w' })
    page.drop()
    await pageDropNoticed()
    expect(client.lines.length).toBeGreaterThan(0)
    for (const line of client.lines) {
      const parsed = JSON.parse(line) as Json
      expect(parsed['jsonrpc'], line).toBe('2.0')
    }
    expect(client.lines.some((line) => line.includes(theRelay().pageUrl) && !line.includes('pageNotConnected'))).toBe(
      false,
    )
  })
})

describe('SEAM-3 relaying a call to the page and back (design 3.2, AG-5, AG-9a)', () => {
  it('design 3.2: the call reaches the page as method + params, and the page\'s result comes back structured', async () => {
    const page = await connectPage()
    const result = await client.callTool('readSearchRows', { word: 'kick-off' })
    const asked = page.callsOf('readSearchRows')
    expect(asked).toHaveLength(1)
    expect(asked[0]?.['jsonrpc']).toBe('2.0')
    expect(asked[0]?.['params']).toEqual({ word: 'kick-off' })
    const expected = { ok: true, stamp: 'stamp-1', value: { method: 'readSearchRows', params: { word: 'kick-off' } } }
    expect(result['structuredContent']).toEqual(expected)
    expect(result['content']).toEqual([{ type: 'text', text: JSON.stringify(expected) }])
    expect(result['isError'] ?? false).toBe(false)
  })

  it('AG-5 / AG-12: the arguments reach the page unchecked', async () => {
    const page = await connectPage()
    await client.callTool('applyCommands', { request: 'not a request', extra: 1 })
    expect(page.callsOf('applyCommands')[0]?.['params']).toEqual({ request: 'not a request', extra: 1 })
  })

  it('AG-9a: a refusal travels unchanged and is not an MCP error', async () => {
    const refusal = { target: 'applyCommands', reason: 'RS-61', stamp: 'stamp-9', refusals: [{ target: 'task:2' }] }
    await connectPage((call) =>
      call['method'] === 'applyCommands'
        ? { result: { accepted: false, refusal } }
        : defaultAnswerer(call, undefined as unknown as FakePage),
    )
    const result = await client.callTool('applyCommands', { request: { stamp: 'stamp-8', commands: [] } })
    expect(result['structuredContent']).toEqual({ accepted: false, refusal })
    expect(result['isError'] ?? false).toBe(false)
  })

  it('design 3.1: exportPng\'s base64 comes back as an MCP image', async () => {
    const base64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString('base64')
    await connectPage((call) =>
      call['method'] === 'exportPng'
        ? { result: { ok: true, value: base64 } }
        : defaultAnswerer(call, undefined as unknown as FakePage),
    )
    const result = await client.callTool('exportPng')
    expect(result['content']).toEqual([{ type: 'image', data: base64, mimeType: 'image/png' }])
  })

  it('design 3.1: a member the page could not call is the one MCP error', async () => {
    await connectPage((call) =>
      call['method'] === 'readDocument'
        ? { error: { code: -32603, message: 'the member threw' } }
        : defaultAnswerer(call, undefined as unknown as FakePage),
    )
    const result = await client.callTool('readDocument')
    expect(result['isError']).toBe(true)
    expect(result['content']).toEqual([{ type: 'text', text: 'the member threw' }])
  })

  it('design 5: the page closing mid-call (a close frame) answers the pending call pageNotConnected', async () => {
    await connectPage((call, page) => {
      if (call['method'] !== 'readDocument') return defaultAnswerer(call, page)
      setTimeout(() => page.closeCleanly(), 30)
      return null
    })
    const result = await client.callTool('readDocument')
    expect(result).toEqual(pageNotConnectedResult(theRelay().pageUrl))
  })

  it('design 5: the connection dropping mid-call (no close frame) answers the pending call pageNotConnected', async () => {
    await connectPage((call, page) => {
      if (call['method'] !== 'readDocument') return defaultAnswerer(call, page)
      setTimeout(() => page.drop(), 30)
      return null
    })
    const result = await client.callTool('readDocument')
    expect(result).toEqual(pageNotConnectedResult(theRelay().pageUrl))
  })

  it('design 5: a late answer for a canceled call is dropped', async () => {
    let held: Json | null = null
    const page = await connectPage((call, self) => {
      if (call['method'] === 'exportSvg') {
        held = call
        return null
      }
      return defaultAnswerer(call, self)
    })
    const id = client.newId()
    client.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'exportSvg', arguments: {} } })
    await until(() => (held === null ? undefined : held), 'the page to be asked for exportSvg')
    client.send({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: id, reason: 'test' } })
    await sleep(50)
    page.send({ jsonrpc: '2.0', id: (held as unknown as Json)['id'], result: { ok: true, value: '<svg/>' } })
    await client.callTool('readStamp')
    expect(client.messages.filter((one) => one?.['id'] === id)).toEqual([])
  })
})

describe('SEAM-3 watchChanges: the relay subscribes once and queues (AG-12 (5), AG-6, design 3.3)', () => {
  it('AG-12 (5): the first call subscribes once with empty params; with waitMs and nothing queued it answers an empty list', async () => {
    const page = await connectPage()
    const started = Date.now()
    const result = await client.callTool('watchChanges', { waitMs: 50 })
    const took = Date.now() - started
    expect(noticesOf(result)).toEqual([])
    expect(took).toBeGreaterThanOrEqual(40)
    expect(took).toBeLessThan(WAIT_MS)
    const asked = page.callsOf('watchChanges')
    expect(asked).toHaveLength(1)
    expect(asked[0]?.['params']).toEqual({})
  })

  it('AG-12 (5): queued notices come back at once, all of them, in order, and are not given twice', async () => {
    const page = await connectPage()
    await client.callTool('watchChanges')
    const first = { kind: 'scheduleChanged', stamp: 'stamp-2' }
    const second = { kind: 'dialogueMessage', text: 'wait' }
    page.notice(first)
    page.notice(second)
    await client.callTool('readStamp')
    const started = Date.now()
    const result = await client.callTool('watchChanges', { waitMs: 1400 }, 1800)
    expect(Date.now() - started).toBeLessThan(1000)
    expect(noticesOf(result)).toEqual([first, second])
    expect(page.callsOf('watchChanges')).toHaveLength(1)
    expect(noticesOf(await client.callTool('watchChanges'))).toEqual([])
  })

  it('AG-12 (5): without waitMs it does not wait', async () => {
    await connectPage()
    const started = Date.now()
    const result = await client.callTool('watchChanges')
    expect(noticesOf(result)).toEqual([])
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('AG-12 (5): a notice arriving while the call waits is returned', async () => {
    const page = await connectPage()
    await client.callTool('watchChanges')
    const late = { kind: 'scheduleChanged', stamp: 'stamp-3' }
    setTimeout(() => page.notice(late), 30)
    const result = await client.callTool('watchChanges', { waitMs: 400 })
    expect(noticesOf(result)).toEqual([late])
  })

  it('design 3.3: a page drop discards the subscription and the queue; the next page is asked again', async () => {
    const first = await connectPage()
    await client.callTool('watchChanges')
    first.notice({ kind: 'scheduleChanged', stamp: 'stamp-lost' })
    await client.callTool('readStamp')
    first.drop()
    await pageDropNoticed()
    const second = await connectPage()
    const result = await client.callTool('watchChanges')
    expect(noticesOf(result)).toEqual([])
    expect(second.callsOf('watchChanges')).toHaveLength(1)
  })
})

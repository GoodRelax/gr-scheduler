// CR-796 slice 1, relay side: a page that never answers is answered for, after the deadline (AG-12 (6), design 3.3 and 5).

import { createHash, randomBytes } from 'node:crypto'
import { connect, type Socket } from 'node:net'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { relayTimedOutResult } from '../../src/adapter/mcp-tool-translator/mcp-tool-translator'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'

type Json = Record<string, unknown>

const WAIT_MS = 2000
const POLL_MS = 20
const DEADLINE_MS = 200
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><title>t</title>\n', 'utf8'))
const DOCUMENT_SCHEMA = '{"title":"test schema"}\n'

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
    ...options,
  } as Parameters<typeof startMcpRelay>[0])
  relays.push(relay)
  return { relay, client }
}

const keyOf = (pageUrl: string): string => pageUrl.slice(pageUrl.indexOf('#') + 1)

const refusalOf = (result: Json): Json | undefined =>
  (result['structuredContent'] as { refusal?: Json } | undefined)?.refusal

const reasonOf = (result: Json): unknown => refusalOf(result)?.['reason']

// WHY: the page answers everything except the members named in `silent`, which it never answers by itself.
function answererSilentOn(silent: readonly string[]): Answerer {
  return (call) => {
    const method = String(call['method'])
    if (silent.includes(method)) return null
    if (method === 'watchChanges') return { result: { hasReplacedEarlierWatch: false } }
    if (method === 'agentApiVersion') return { result: '1.0-fake' }
    return { result: { ok: true, stamp: 'stamp-1', value: { method } } }
  }
}

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

afterEach(async () => {
  vi.restoreAllMocks()
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
})

describe('CR-796 AG-12 (6) / design 5: a call the page never answers is answered after callDeadlineMs', () => {
  it('design 5: after the deadline the call gets a value, not an MCP error, with target "relay" and reason "relayTimedOut"', async () => {
    const started = await startRelay({ callDeadlineMs: DEADLINE_MS })
    await connectPage(started, answererSilentOn(['readStamp']))
    const id = started.client.newId()
    const asked = Date.now()
    started.client.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'readStamp', arguments: {} } })
    const answer = await started.client.answerTo(id)
    const took = Date.now() - asked
    expect(answer).not.toHaveProperty('error')
    const result = answer['result'] as Json
    expect(refusalOf(result)?.['target']).toBe('relay')
    expect(reasonOf(result)).toBe('relayTimedOut')
    expect(took).toBeGreaterThanOrEqual(DEADLINE_MS - 30)
    expect(took).toBeLessThan(WAIT_MS)
  })

  it('design 5: the answer is relayTimedOutResult(member, deadlineMs), which names the member', async () => {
    const started = await startRelay({ callDeadlineMs: DEADLINE_MS })
    await connectPage(started, answererSilentOn(['readStamp']))
    const result = await started.client.callTool('readStamp')
    expect(result).toEqual(relayTimedOutResult('readStamp', DEADLINE_MS))
    expect(JSON.stringify(result)).toContain('readStamp')
  })

  it('design 5: the page stays connected after a timed-out call -- the next call to it is relayed', async () => {
    const started = await startRelay({ callDeadlineMs: DEADLINE_MS })
    const page = await connectPage(started, answererSilentOn(['readStamp']))
    expect(reasonOf(await started.client.callTool('readStamp'))).toBe('relayTimedOut')
    const next = await started.client.callTool('readSelection')
    expect(reasonOf(next)).not.toBe('pageNotConnected')
    expect(reasonOf(next)).not.toBe('relayTimedOut')
    expect(page.callsOf('readSelection')).toHaveLength(1)
  })

  it('design 5: a late answer after the deadline is discarded -- the client hears nothing more about that call', async () => {
    const started = await startRelay({ callDeadlineMs: DEADLINE_MS })
    const page = await connectPage(started, answererSilentOn(['readStamp']))
    const id = started.client.newId()
    started.client.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'readStamp', arguments: {} } })
    const first = await started.client.answerTo(id)
    expect(reasonOf(first['result'] as Json)).toBe('relayTimedOut')
    const asked = page.callsOf('readStamp')[0]
    expect(asked).toBeDefined()
    page.send({ jsonrpc: '2.0', id: asked?.['id'], result: { ok: true, stamp: 'too-late', value: {} } })
    await sleep(150)
    expect(started.client.countOf(id)).toBe(1)
    const after = await started.client.callTool('readSelection')
    expect(JSON.stringify(after)).not.toContain('too-late')
  })

  it('design 5: an answer that comes inside the deadline is carried, not timed out', async () => {
    const started = await startRelay({ callDeadlineMs: 600 })
    await connectPage(started, (call, page) => {
      if (call['method'] !== 'readStamp') return answererSilentOn([])(call, page)
      setTimeout(() => page.send({ jsonrpc: '2.0', id: call['id'], result: { ok: true, stamp: 'in-time', value: {} } }), 60)
      return null
    })
    const result = await started.client.callTool('readStamp')
    expect(reasonOf(result)).toBeUndefined()
    expect(JSON.stringify(result)).toContain('in-time')
  })

  it('design 5: the deadline is per call -- a second silent call is timed out on its own clock', async () => {
    const started = await startRelay({ callDeadlineMs: DEADLINE_MS })
    await connectPage(started, answererSilentOn(['readStamp', 'readSelection']))
    expect(reasonOf(await started.client.callTool('readStamp'))).toBe('relayTimedOut')
    const second = await started.client.callTool('readSelection')
    expect(reasonOf(second)).toBe('relayTimedOut')
    expect(second).toEqual(relayTimedOutResult('readSelection', DEADLINE_MS))
  })
})

describe('CR-796 AG-12 (2) / design 5: a link that drops mid-call is not a timeout', () => {
  it('design 5: the page dropping while a call waits answers pageNotConnected at once, not relayTimedOut', async () => {
    const started = await startRelay({ callDeadlineMs: 1500 })
    const page = await connectPage(started, answererSilentOn(['readStamp']))
    const id = started.client.newId()
    const asked = Date.now()
    started.client.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'readStamp', arguments: {} } })
    await until(() => (page.callsOf('readStamp').length > 0 ? true : undefined), 'the call to reach the page')
    page.drop()
    const answer = await started.client.answerTo(id)
    expect(reasonOf(answer['result'] as Json)).toBe('pageNotConnected')
    expect(Date.now() - asked).toBeLessThan(1200)
  })
})

describe('CR-796 design 3.3 / AM-17: watchChanges waits at most 40,000 ms, however large waitMs is', () => {
  it('design 3.3: a waitMs far above 40,000 never sets a relay timer longer than 40,000', async () => {
    const started = await startRelay({ callDeadlineMs: 5000 })
    await connectPage(started, answererSilentOn([]))
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const id = started.client.newId()
    started.client.send({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: 'watchChanges', arguments: { waitMs: 3_600_000 } },
    })
    await sleep(300)
    const delays = spy.mock.calls.map((call) => Number(call[1])).filter((delay) => Number.isFinite(delay))
    expect(delays.filter((delay) => delay > 40_000)).toEqual([])
    expect(delays).toContain(40_000)
    expect(started.client.countOf(id)).toBe(0)
  })

  it('design 3.3: a waitMs below the cap is used as given', async () => {
    const started = await startRelay({ callDeadlineMs: 5000 })
    await connectPage(started, answererSilentOn([]))
    const spy = vi.spyOn(globalThis, 'setTimeout')
    const id = started.client.newId()
    started.client.send({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'watchChanges', arguments: { waitMs: 1234 } } })
    await sleep(100)
    const delays = spy.mock.calls.map((call) => Number(call[1]))
    expect(delays).toContain(1234)
  })
})

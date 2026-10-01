// CR-614 spec-only tests: chapter 2 knows the local MCP relay -- SEAM-B (relay side), SEAM-C, and the rows of tables T-007 / T-008.

import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { connect, type Socket } from 'node:net'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  answerRelayedCall,
  type AgentApi,
  type RelayedCall,
} from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'
import { specTable } from './spec-table'

type Json = Record<string, unknown>

const WAIT_MS = 1500
const PROBE_MS = 1000
const POLL_MS = 20
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const PAGE_HTML = new Uint8Array(Buffer.from('<!doctype html><html><body>page</body></html>\n', 'utf8'))

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
  readonly messages: (Json | undefined)[] = []
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
          this.messages.push(undefined)
        }
      }
    })
  }

  async callTool(name: string, args?: Json): Promise<Json> {
    const id = this.nextId++
    const params = args === undefined ? { name } : { name, arguments: args }
    this.input.write(`${JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params })}\n`)
    const answer = await until(() => this.messages.find((one) => one?.['id'] === id), `the answer to ${name}`)
    if (answer['result'] === undefined) throw new Error(`tools/call ${name} answered ${JSON.stringify(answer)}`)
    return answer['result'] as Json
  }
}

const refusalReasonOf = (value: unknown): unknown =>
  (value as { refusal?: { reason?: unknown } } | undefined)?.refusal?.reason

const isPageNotConnected = (result: Json): boolean => refusalReasonOf(result['structuredContent']) === 'pageNotConnected'

// see UF-188, PI-17
class RelayedPage {
  private frames = Buffer.alloc(0)

  constructor(
    private readonly socket: Socket,
    private readonly api: AgentApi,
  ) {}

  feed(bytes: Buffer): void {
    this.frames = Buffer.concat([this.frames, bytes])
    for (;;) {
      const frame = this.nextFrame()
      if (frame === null) return
      if (frame.opcode === 0x1) void this.answer(JSON.parse(frame.payload.toString('utf8')) as Json)
    }
  }

  private nextFrame(): { opcode: number; payload: Buffer } | null {
    const bytes = this.frames
    if (bytes.length < 2) return null
    let length = (bytes[1] ?? 0) & 0x7f
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
    if (bytes.length < at + length) return null
    this.frames = bytes.subarray(at + length)
    return { opcode: (bytes[0] ?? 0) & 0x0f, payload: Buffer.from(bytes.subarray(at, at + length)) }
  }

  private async answer(message: Json): Promise<void> {
    if (typeof message['method'] !== 'string' || message['id'] === undefined) return
    const call = { member: message['method'], params: message['params'] ?? {} } as unknown as RelayedCall
    const answer = await answerRelayedCall(this.api, call, (notice) =>
      this.send({ jsonrpc: '2.0', method: 'changeNoticed', params: notice }),
    )
    this.send({ jsonrpc: '2.0', id: message['id'], ...answer })
  }

  send(message: Json): void {
    if (this.socket.destroyed) return
    const payload = Buffer.from(JSON.stringify(message), 'utf8')
    const mask = randomBytes(4)
    const head =
      payload.length < 126
        ? Buffer.from([0x81, 0x80 | payload.length])
        : Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
    for (let i = 0; i < payload.length; i++) payload[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0)
    this.socket.write(Buffer.concat([head, mask, payload]))
  }
}

const sockets: Socket[] = []

function openPage(port: number, api: AgentApi): Promise<RelayedPage> {
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
      const head = held.subarray(0, end).toString('latin1')
      const accept = createHash('sha1').update(key + WEBSOCKET_GUID).digest('base64')
      if (!head.startsWith('HTTP/1.1 101') || !head.includes(accept)) {
        reject(new Error(`the relay did not upgrade: ${head.split('\r\n')[0] ?? ''}`))
        return
      }
      const page = new RelayedPage(socket, api)
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

interface Probe {
  readonly reached: boolean
  readonly how: string
  readonly peer: string | undefined
}

function probe(host: string, port: number): Promise<Probe> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    sockets.push(socket)
    const timer = setTimeout(() => {
      socket.destroy()
      resolve({ reached: false, how: `no connection within ${String(PROBE_MS)} ms`, peer: undefined })
    }, PROBE_MS)
    socket.on('connect', () => {
      clearTimeout(timer)
      const peer = socket.remoteAddress
      socket.destroy()
      resolve({ reached: true, how: 'connected', peer })
    })
    socket.on('error', (cause: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      resolve({ reached: false, how: cause.code ?? cause.message, peer: undefined })
    })
  })
}

const nonLoopbackIpv4 = (): string[] => {
  const found: string[] = []
  for (const list of Object.values(networkInterfaces())) {
    for (const one of list ?? []) {
      if (!one.internal && String(one.family).replace('IPv', '') === '4') found.push(one.address)
    }
  }
  return found
}

const MEMBERS: readonly string[] = specTable('T-107').rows.map((row) => (row.cells[1] ?? '').replace(/`/g, ''))
const PROPERTIES = new Set(['agentApiVersion', 'schemaVersion'])

const A_STAMP = 'stamp-614'
// WHY: the specification names no reason value for a malformed applyCommands, so
// this value is the test's own; only its equality across the two roads is held.
const MALFORMED_REASON = 'malformedRequest'

const isWellFormed = (request: unknown): boolean =>
  typeof request === 'object' &&
  request !== null &&
  typeof (request as { stamp?: unknown }).stamp === 'string' &&
  Array.isArray((request as { commands?: unknown }).commands)

interface ValidatingApi {
  readonly api: AgentApi
  readonly applied: unknown[][]
  readonly applyDirectly: (request: unknown) => unknown
}

// see AG-5, AG-9a
const validatingApi = (): ValidatingApi => {
  const applied: unknown[][] = []
  const applyCommands = (...args: unknown[]): unknown =>
    isWellFormed(args[0])
      ? { accepted: true, stamp: A_STAMP }
      : { accepted: false, refusal: { target: 'applyCommands', reason: MALFORMED_REASON, stamp: A_STAMP, refusals: [] } }
  const api: Record<string, unknown> = { agentApiVersion: '1.0-fake', schemaVersion: 1 }
  for (const member of MEMBERS) {
    if (PROPERTIES.has(member)) continue
    api[member] = (...args: unknown[]): unknown => {
      if (member === 'applyCommands') {
        applied.push(args)
        return applyCommands(...args)
      }
      if (member === 'watchChanges') return { hasReplacedEarlierWatch: false }
      return { ok: true, stamp: A_STAMP, value: null }
    }
  }
  return { api: api as unknown as AgentApi, applied, applyDirectly: (request) => applyCommands(request) }
}

let relay: McpRelay | null = null
let client = new StdioClient()

const theRelay = (): McpRelay => {
  if (relay === null) throw new Error('the relay did not start')
  return relay
}

async function connectPage(api: AgentApi): Promise<RelayedPage> {
  const page = await openPage(theRelay().port, api)
  const pageUrl = theRelay().pageUrl
  page.send({ jsonrpc: '2.0', method: 'relayKeyPresented', params: { key: pageUrl.slice(pageUrl.indexOf('#') + 1) } })
  const deadline = Date.now() + WAIT_MS
  for (;;) {
    if (!isPageNotConnected(await client.callTool('agentApiVersion'))) return page
    if (Date.now() > deadline) throw new Error('the relay never took the page')
    await sleep(POLL_MS)
  }
}

beforeEach(async () => {
  client = new StdioClient()
  relay = await startMcpRelay({ input: client.input, output: client.output, log: () => undefined, pageHtml: PAGE_HTML })
})

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  const closing = relay
  relay = null
  if (closing !== null) await Promise.race([closing.close(), sleep(WAIT_MS)])
  client.input.end()
})

describe('SEAM-B relay side: the relay is reached through 127.0.0.1 only (CN-6, T-008 CHN-12 and the note after it, AG-12 (1))', () => {
  it('T-008 CHN-12 / AG-12 (1): the relay accepts a connection on 127.0.0.1:<port>', async () => {
    const got = await probe('127.0.0.1', theRelay().port)
    expect(got.reached, got.how).toBe(true)
  })

  it('T-008 note after the table / CN-6: the same port through any non-loopback IPv4 address of this machine is refused', async () => {
    const port = theRelay().port
    const addresses = nonLoopbackIpv4()
    if (addresses.length === 0) {
      // WHY: with no such address the refusal cannot be shown; hold the bind address instead of passing silently.
      const own = await probe('127.0.0.1', port)
      expect(own.peer, 'this machine has no non-loopback IPv4 address; held instead: the listener answers as 127.0.0.1').toBe(
        '127.0.0.1',
      )
      expect(new URL(theRelay().pageUrl).hostname).toBe('127.0.0.1')
      return
    }
    const probes = await Promise.all(addresses.map(async (host) => ({ host, ...(await probe(host, port)) })))
    const reached = probes.filter((one) => one.reached).map((one) => one.host)
    expect(reached, `probed ${probes.map((one) => `${one.host}: ${one.how}`).join(', ')}`).toEqual([])
  })

  it('AG-12 (1): the relay listens on 127.0.0.1 itself -- the page URL, the peer address, and no wildcard bind', async () => {
    const port = theRelay().port
    const [own, sibling] = await Promise.all([probe('127.0.0.1', port), probe('127.0.0.2', port)])
    expect(new URL(theRelay().pageUrl).hostname).toBe('127.0.0.1')
    expect(new URL(theRelay().pageUrl).port).toBe(String(port))
    expect(own.peer, own.how).toBe('127.0.0.1')
    // WHY: a wildcard bind would also answer on another loopback address; 127.0.0.1 alone does not.
    expect(sibling.reached, `127.0.0.2: ${sibling.how}`).toBe(false)
  })
})

describe('SEAM-C: a call carried by the relay meets the page\'s validation, as a direct call does (T-008 CHN-13, FR-023, NFR-009, AG-5)', () => {
  const MALFORMED: readonly { readonly what: string; readonly args: Json | undefined; readonly request: unknown }[] = [
    { what: 'a string request', args: { request: 'not a request' }, request: 'not a request' },
    { what: 'a number request', args: { request: 42 }, request: 42 },
    { what: 'a null request', args: { request: null }, request: null },
    { what: 'wrong field types', args: { request: { stamp: 7, commands: 'x' } }, request: { stamp: 7, commands: 'x' } },
    { what: 'no request at all', args: undefined, request: undefined },
  ]

  it('T-008 CHN-13 / AG-5 / AG-9a: the refusal reason reaching the MCP client equals the direct call\'s, and is a value, not isError -- the validation is the page\'s (AG-5); this holds only that the relay neither validates nor rewrites the refusal', async () => {
    const fake = validatingApi()
    await connectPage(fake.api)
    for (const one of MALFORMED) {
      const direct = fake.applyDirectly(one.request)
      const before = fake.applied.length
      const relayed = await client.callTool('applyCommands', one.args)
      expect(fake.applied.length - before, `${one.what}: the page was asked once`).toBe(1)
      expect(fake.applied.at(-1)?.[0], `${one.what}: the argument reached the page unchanged`).toEqual(one.request)
      expect(refusalReasonOf(direct), `${one.what}: the direct call is refused`).toBe(MALFORMED_REASON)
      expect(refusalReasonOf(relayed['structuredContent']), `${one.what}: same reason as the direct call`).toBe(
        refusalReasonOf(direct),
      )
      expect(relayed['structuredContent'], `${one.what}: the whole refusal value, unrewritten`).toEqual(direct)
      expect(relayed['isError'] ?? false, `${one.what}: a refusal is a value (AG-9a)`).toBe(false)
    }
  })

  it('AG-5 control: a well-formed request through the relay is accepted, so the refusals above come from the page\'s check, not from the relay', async () => {
    const fake = validatingApi()
    await connectPage(fake.api)
    const request = { stamp: A_STAMP, commands: [] }
    const relayed = await client.callTool('applyCommands', { request })
    expect(relayed['structuredContent']).toEqual(fake.applyDirectly(request))
    expect(relayed['structuredContent']).toEqual({ accepted: true, stamp: A_STAMP })
  })
})

describe('SEAM-A / SEAM-B page side are held by tests/nfr/nfr-004-single-file.test.ts and tests/system/cr-613-cr-620-built-relay.test.ts; here only the rows they hold', () => {
  const QUOTE = {
    listensOnly: '`127.0.0.1` \u3060\u3051\u3067\u5f85\u3061\u53d7\u3051\u308b',
    sameOrigin: '`CHN-12` \u3067\u914d\u3063\u305f\u30da\u30fc\u30b8\u3068\u540c\u3058 origin',
    sameAsAbove: '\u540c\u4e0a',
    untrusted: '\u4fe1\u983c\u3067\u304d\u306a\u3044',
    stdio: 'MCP \u306e stdio',
    relayDevice: 'MCP \u306e\u53d6\u6b21\u306e\u5b9f\u884c\u74b0\u5883',
    notCarried: '\u8f09\u3089\u306a\u3044',
    relayCarried: '`FR-150` \u306e\u53d6\u6b21\u304c\u8f09\u308b',
    noteNoOtherDevice:
      '\u307b\u304b\u306e\u6a5f\u5668\u3078\u51fa\u308b\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u306e\u7d4c\u8def\u306f 1 \u672c\u3082\u7121\u3044',
    noteStdioOrLoopback: '\u6a19\u6e96\u5165\u51fa\u529b\u304b `127.0.0.1` \u3060\u3051\u3092\u901a\u308b',
    t008Caption: '**\u8868 T-008 \u2014',
  } as const
  const DEVICE_NAME = 0
  const DEVICE_CARRIES = 2
  const ROUTE_METHOD = 3
  const ROUTE_TRUST = 4

  it('T-007 DEV-6, T-008 CHN-10..CHN-14 and the note after T-008: the rows exist and name stdio / 127.0.0.1 as the spec text says', () => {
    const devices = new Map(specTable('T-007').rows.map((row) => [row.id, row.cells]))
    const routes = new Map(specTable('T-008').rows.map((row) => [row.id, row.cells]))
    const dev6 = devices.get('DEV-6')
    expect(dev6, 'T-007 has DEV-6').toBeDefined()
    expect(dev6?.[DEVICE_NAME], `DEV-6 device: "${QUOTE.relayDevice}"`).toBe(QUOTE.relayDevice)
    expect(dev6?.[DEVICE_CARRIES]?.startsWith(QUOTE.notCarried), `DEV-6 starts "${QUOTE.notCarried}"`).toBe(true)
    expect(dev6?.[DEVICE_CARRIES], `DEV-6 says "${QUOTE.relayCarried}"`).toContain(QUOTE.relayCarried)
    const route = (id: string): readonly string[] => {
      const cells = routes.get(id)
      if (cells === undefined) throw new Error(`T-008 has no row ${id}`)
      return cells
    }
    expect(route('CHN-10').slice(0, 2)).toEqual(['DEV-5', 'DEV-6'])
    expect(route('CHN-10')[ROUTE_METHOD], `CHN-10 method: "${QUOTE.stdio}"`).toContain(QUOTE.stdio)
    expect(route('CHN-11').slice(0, 2)).toEqual(['DEV-6', 'DEV-5'])
    expect(route('CHN-11')[ROUTE_METHOD], `CHN-11 method: "${QUOTE.stdio}"`).toContain(QUOTE.stdio)
    expect(route('CHN-12').slice(0, 2)).toEqual(['DEV-6', 'DEV-1'])
    expect(route('CHN-12')[ROUTE_METHOD]?.startsWith('HTTP'), 'CHN-12 method is HTTP').toBe(true)
    expect(route('CHN-12')[ROUTE_METHOD], `CHN-12 method: "${QUOTE.listensOnly}"`).toContain(QUOTE.listensOnly)
    expect(route('CHN-13').slice(0, 2)).toEqual(['DEV-6', 'DEV-1'])
    expect(route('CHN-13')[ROUTE_METHOD]?.startsWith('WebSocket'), 'CHN-13 method is WebSocket').toBe(true)
    expect(route('CHN-13')[ROUTE_METHOD], `CHN-13 method: "${QUOTE.sameOrigin}"`).toContain(QUOTE.sameOrigin)
    expect(route('CHN-13')[ROUTE_TRUST], `CHN-13 trust: "${QUOTE.untrusted}"`).toContain(QUOTE.untrusted)
    expect(route('CHN-14').slice(0, 2)).toEqual(['DEV-1', 'DEV-6'])
    expect(route('CHN-14')[ROUTE_METHOD], `CHN-14 method: "${QUOTE.sameAsAbove}" (CHN-13's)`).toBe(QUOTE.sameAsAbove)

    const lines = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').split('\n')
    const caption = lines.findIndex((line) => line.startsWith(QUOTE.t008Caption))
    expect(caption, 'T-008 caption found').toBeGreaterThanOrEqual(0)
    const note = lines.slice(caption + 1).find((line) => line.startsWith('>')) ?? ''
    expect(note, `note: "${QUOTE.noteNoOtherDevice}"`).toContain(QUOTE.noteNoOtherDevice)
    expect(note, `note: "${QUOTE.noteStdioOrLoopback}"`).toContain(QUOTE.noteStdioOrLoopback)
  })
})

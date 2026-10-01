// McpRelayServer -- carries MCP tool calls to the GRS page it serves on 127.0.0.1 (AG-12).
// @unit      UF-187   (docs/spec/05-07-design.md, table T-075)
// @component McpRelayServer, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-41

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import {
  createServer,
  STATUS_CODES,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import type { AddressInfo, Socket } from 'node:net'

import {
  mcpToolList,
  mcpToolResultOf,
  pageNotConnectedResult,
  relayedCallOf,
} from '../../adapter/mcp-tool-translator/mcp-tool-translator'

export interface McpRelayOptions {
  readonly input: NodeJS.ReadableStream
  readonly output: NodeJS.WritableStream
  readonly log: (line: string) => void
  readonly pageHtml: Uint8Array
}

export interface McpRelay {
  readonly port: number
  readonly pageUrl: string
  /** @purity non-pure */
  close(): Promise<void>
}

type RelayedAnswer = Parameters<typeof mcpToolResultOf>[1]
type RelayedCall = NonNullable<ReturnType<typeof relayedCallOf>>
type McpToolResult = ReturnType<typeof mcpToolResultOf>

// WHY: the version is package.json's, defined by the relay build (vite.relay.config.ts);
// a run from source (a test) has no build, so it says so instead.
declare const __GRS_RELAY_VERSION__: string
const RELAY_VERSION =
  typeof __GRS_RELAY_VERSION__ === 'string' ? __GRS_RELAY_VERSION__ : 'unbuilt'

const RELAY_NAME = 'grs-relay'
const LOOPBACK = '127.0.0.1'
const ANY_FREE_PORT = 0
const KEY_BYTES = 32
const PAGE_PATH = '/'
const HTML_CONTENT_TYPE = 'text/html; charset=utf-8'
const HTTP_SWITCHING_PROTOCOLS = 101
const HTTP_OK = 200
const HTTP_BAD_REQUEST = 400
const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405

const JSON_RPC_VERSION = '2.0'
const DEFAULT_PROTOCOL_VERSION = '2025-06-18'
const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
const INTERNAL_ERROR = -32603
const KEY_PRESENTED = 'relayKeyPresented'
const CHANGE_NOTICED = 'changeNoticed'
const CANCELLED = 'notifications/cancelled'
const WATCH_CHANGES = 'watchChanges'
const LONGEST_TIMER_MS = 2 ** 31 - 1

const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const WEBSOCKET_VERSION = '13'
const FIN_BIT = 0x80
const RSV_BITS = 0x70
const OPCODE_BITS = 0x0f
const MASK_BIT = 0x80
const LENGTH_BITS = 0x7f
const LENGTH_16_MARK = 126
const LENGTH_64_MARK = 127
const BASE_HEADER_BYTES = 2
const LENGTH_16_BYTES = 2
const LENGTH_64_BYTES = 8
const MASK_KEY_BYTES = 4
const LONGEST_16_LENGTH = 0xffff
const LONGEST_CONTROL_PAYLOAD = 125
const CLOSE_CODE_BYTES = 2
const OPCODE_CONTINUATION = 0x0
const OPCODE_TEXT = 0x1
const OPCODE_BINARY = 0x2
const OPCODE_CLOSE = 0x8
const OPCODE_PING = 0x9
const OPCODE_PONG = 0xa
const CLOSE_NORMAL = 1000
const CLOSE_GOING_AWAY = 1001
const CLOSE_PROTOCOL_ERROR = 1002
const CLOSE_UNSUPPORTED_DATA = 1003
const CLOSE_INVALID_PAYLOAD = 1007
const CLOSE_POLICY_VIOLATION = 1008

interface Frame {
  readonly fin: boolean
  readonly opcode: number
  readonly payload: Buffer
}

type FrameRead = { readonly frame: Frame; readonly used: number } | 'incomplete' | 'protocolError'

interface WebSocketLink {
  readonly socket: Socket
  readonly onText: (text: string) => void
  buffered: Buffer
  fragments: Buffer[] | null
  closing: boolean
}

interface RelayState {
  readonly options: McpRelayOptions
  readonly key: string
  readonly host: string
  readonly origin: string
  readonly pageUrl: string
  page: WebSocketLink | null
  nextPageCallId: number
  readonly pageCalls: Map<number, (answer: RelayedAnswer | null) => void>
  watchSubscribed: boolean
  notices: unknown[]
  readonly noticeWaiters: Set<() => void>
  readonly sockets: Set<Socket>
  readonly mcpCancels: Map<string, () => void>
}

// WHY: an MCP reply has the same JSON-RPC result-or-error shape as a relayed answer.
type McpReply = RelayedAnswer

// WHY: every value tested here came from JSON.parse, where an object is always an Object instance.
/** @purity pure */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value instanceof Object && !Array.isArray(value)
}

/** @purity pure */
function parsedJsonOf(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** @purity pure */
function payloadLengthOf(buffer: Buffer): { length: number; offset: number } | 'incomplete' | 'protocolError' {
  const mark = buffer[1]! & LENGTH_BITS
  if (mark < LENGTH_16_MARK) return { length: mark, offset: BASE_HEADER_BYTES }
  if (mark === LENGTH_16_MARK) {
    if (buffer.length < BASE_HEADER_BYTES + LENGTH_16_BYTES) return 'incomplete'
    return { length: buffer.readUInt16BE(BASE_HEADER_BYTES), offset: BASE_HEADER_BYTES + LENGTH_16_BYTES }
  }
  if (buffer.length < BASE_HEADER_BYTES + LENGTH_64_BYTES) return 'incomplete'
  const length = buffer.readBigUInt64BE(BASE_HEADER_BYTES)
  if (length > BigInt(Number.MAX_SAFE_INTEGER)) return 'protocolError'
  return { length: Number(length), offset: BASE_HEADER_BYTES + LENGTH_64_BYTES }
}

/** @purity pure */
function frameOf(buffer: Buffer): FrameRead {
  if (buffer.length < BASE_HEADER_BYTES) return 'incomplete'
  const first = buffer[0]!
  if ((first & RSV_BITS) !== 0 || (buffer[1]! & MASK_BIT) === 0) return 'protocolError'
  const measured = payloadLengthOf(buffer)
  if (typeof measured === 'string') return measured
  const payloadStart = measured.offset + MASK_KEY_BYTES
  const used = payloadStart + measured.length
  if (buffer.length < used) return 'incomplete'
  const mask = buffer.subarray(measured.offset, payloadStart)
  const payload = Buffer.alloc(measured.length)
  for (let index = 0; index < measured.length; index += 1) {
    payload[index] = buffer[payloadStart + index]! ^ mask[index % MASK_KEY_BYTES]!
  }
  return { frame: { fin: (first & FIN_BIT) !== 0, opcode: first & OPCODE_BITS, payload }, used }
}

/** @purity pure */
function encodedFrameOf(opcode: number, payload: Buffer): Buffer {
  const length = payload.length
  const extendedBytes =
    length < LENGTH_16_MARK ? 0 : length <= LONGEST_16_LENGTH ? LENGTH_16_BYTES : LENGTH_64_BYTES
  const header = Buffer.alloc(BASE_HEADER_BYTES + extendedBytes)
  header[0] = FIN_BIT | opcode
  if (extendedBytes === 0) {
    header[1] = length
  } else if (extendedBytes === LENGTH_16_BYTES) {
    header[1] = LENGTH_16_MARK
    header.writeUInt16BE(length, BASE_HEADER_BYTES)
  } else {
    header[1] = LENGTH_64_MARK
    header.writeBigUInt64BE(BigInt(length), BASE_HEADER_BYTES)
  }
  return Buffer.concat([header, payload])
}

/** @purity non-pure */
function sendText(link: WebSocketLink, text: string): void {
  if (link.closing) return
  link.socket.write(encodedFrameOf(OPCODE_TEXT, Buffer.from(text, 'utf8')))
}

/** @purity non-pure */
function closeWebSocket(link: WebSocketLink, code: number): void {
  if (link.closing) return
  link.closing = true
  const payload = Buffer.alloc(CLOSE_CODE_BYTES)
  payload.writeUInt16BE(code)
  link.socket.end(encodedFrameOf(OPCODE_CLOSE, payload))
}

/** @purity non-pure */
function deliverMessage(link: WebSocketLink, bytes: Buffer): void {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    closeWebSocket(link, CLOSE_INVALID_PAYLOAD)
    return
  }
  link.onText(text)
}

/** @purity non-pure */
function handleControlFrame(link: WebSocketLink, frame: Frame): void {
  if (!frame.fin || frame.payload.length > LONGEST_CONTROL_PAYLOAD) {
    closeWebSocket(link, CLOSE_PROTOCOL_ERROR)
  } else if (frame.opcode === OPCODE_PING) {
    link.socket.write(encodedFrameOf(OPCODE_PONG, frame.payload))
  } else if (frame.opcode === OPCODE_CLOSE) {
    const code = frame.payload.length >= CLOSE_CODE_BYTES ? frame.payload.readUInt16BE(0) : CLOSE_NORMAL
    closeWebSocket(link, code)
  } else if (frame.opcode !== OPCODE_PONG) {
    closeWebSocket(link, CLOSE_PROTOCOL_ERROR)
  }
}

/** @purity non-pure */
function handleDataFrame(link: WebSocketLink, frame: Frame): void {
  if (frame.opcode === OPCODE_BINARY) {
    closeWebSocket(link, CLOSE_UNSUPPORTED_DATA)
    return
  }
  const starts = frame.opcode === OPCODE_TEXT
  const continues = frame.opcode === OPCODE_CONTINUATION
  if ((starts && link.fragments !== null) || (continues && link.fragments === null) || (!starts && !continues)) {
    closeWebSocket(link, CLOSE_PROTOCOL_ERROR)
    return
  }
  const fragments = [...(link.fragments ?? []), frame.payload]
  link.fragments = frame.fin ? null : fragments
  if (frame.fin) deliverMessage(link, Buffer.concat(fragments))
}

/** @purity non-pure */
function receiveChunk(link: WebSocketLink, chunk: Buffer): void {
  link.buffered = link.buffered.length === 0 ? chunk : Buffer.concat([link.buffered, chunk])
  while (!link.closing) {
    const read = frameOf(link.buffered)
    if (read === 'incomplete') return
    if (read === 'protocolError') {
      closeWebSocket(link, CLOSE_PROTOCOL_ERROR)
      return
    }
    link.buffered = link.buffered.subarray(read.used)
    if (read.frame.opcode >= OPCODE_CLOSE) handleControlFrame(link, read.frame)
    else handleDataFrame(link, read.frame)
  }
}

/** @purity non-pure */
function openWebSocket(socket: Socket, onText: (text: string) => void, onClosed: () => void): WebSocketLink {
  const link: WebSocketLink = { socket, onText, buffered: Buffer.alloc(0), fragments: null, closing: false }
  socket.setNoDelay(true)
  socket.on('data', (chunk: Buffer) => receiveChunk(link, chunk))
  // TRAP: the http server keeps its sockets half-open, so without this a page that goes
  // away with no close frame never fires 'close' and stays the connected page.
  socket.on('end', () => socket.destroy())
  socket.on('error', () => socket.destroy())
  socket.on('close', onClosed)
  return link
}

/** @purity non-pure */
function writeMcp(state: RelayState, message: Record<string, unknown>): void {
  state.options.output.write(`${JSON.stringify({ jsonrpc: JSON_RPC_VERSION, ...message })}\n`)
}

/** @purity pure */
function relayedAnswerOf(message: Record<string, unknown>): RelayedAnswer {
  const { error } = message
  if (!isPlainRecord(error)) return { result: message['result'] }
  return {
    error: {
      code: typeof error['code'] === 'number' ? error['code'] : INTERNAL_ERROR,
      message: typeof error['message'] === 'string' ? error['message'] : '',
    },
  }
}

/** @purity non-pure */
function wakeNoticeWaiters(state: RelayState): void {
  for (const wake of [...state.noticeWaiters]) wake()
}

/** @purity non-pure */
function handlePageMessage(state: RelayState, text: string): void {
  const message = parsedJsonOf(text)
  if (!isPlainRecord(message)) return
  if (message['method'] === CHANGE_NOTICED) {
    state.notices.push(message['params'])
    wakeNoticeWaiters(state)
    return
  }
  const id = message['id']
  if (typeof id !== 'number') return
  const settle = state.pageCalls.get(id)
  if (settle === undefined) return
  state.pageCalls.delete(id)
  settle(relayedAnswerOf(message))
}

/** @purity pure */
function presentedKeyOf(text: string): string | null {
  const message = parsedJsonOf(text)
  if (!isPlainRecord(message) || message['method'] !== KEY_PRESENTED) return null
  const params = message['params']
  return isPlainRecord(params) && typeof params['key'] === 'string' ? params['key'] : null
}

/** @purity pure */
function sameKey(expected: string, presented: string | null): boolean {
  if (presented === null) return false
  const want = Buffer.from(expected, 'utf8')
  const got = Buffer.from(presented, 'utf8')
  return want.length === got.length && timingSafeEqual(want, got)
}

// see AG-12
/** @purity non-pure */
function presentKey(state: RelayState, link: WebSocketLink, text: string): void {
  if (!sameKey(state.key, presentedKeyOf(text))) {
    state.options.log('GRS relay: refused a page link without the right key')
    closeWebSocket(link, CLOSE_POLICY_VIOLATION)
  } else if (state.page !== null) {
    state.options.log('GRS relay: refused a second page; the first one stays connected')
    closeWebSocket(link, CLOSE_POLICY_VIOLATION)
  } else {
    state.page = link
    state.options.log('GRS relay: a page connected')
  }
}

/** @purity non-pure */
function dropPage(state: RelayState, link: WebSocketLink): void {
  if (state.page !== link) return
  state.page = null
  state.watchSubscribed = false
  state.notices = []
  const settles = [...state.pageCalls.values()]
  state.pageCalls.clear()
  for (const settle of settles) settle(null)
  wakeNoticeWaiters(state)
  state.options.log('GRS relay: the page disconnected')
}

/** @purity pure */
function upgradeRefusalOf(state: RelayState, request: IncomingMessage): number | null {
  const { headers } = request
  const status = httpStatusOf(state, request)
  if (status !== HTTP_OK) return status
  if (headers.origin !== state.origin) return HTTP_FORBIDDEN
  const upgradesToWebSocket = headers.upgrade?.toLowerCase() === 'websocket'
  const versionMatches = headers['sec-websocket-version'] === WEBSOCKET_VERSION
  if (!upgradesToWebSocket || !versionMatches || headers['sec-websocket-key'] === undefined) {
    return HTTP_BAD_REQUEST
  }
  return null
}

/** @purity non-pure */
function refuseHttp(socket: Socket, status: number): void {
  socket.end(
    `HTTP/1.1 ${status} ${STATUS_CODES[status] ?? ''}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  )
}

// see AG-12
/** @purity non-pure */
function acceptUpgrade(state: RelayState, request: IncomingMessage, socket: Socket, head: Buffer): void {
  const refusal = upgradeRefusalOf(state, request)
  if (refusal !== null) {
    refuseHttp(socket, refusal)
    return
  }
  const accept = createHash('sha1')
    .update(`${request.headers['sec-websocket-key'] ?? ''}${WEBSOCKET_GUID}`)
    .digest('base64')
  socket.write(
    `HTTP/1.1 ${HTTP_SWITCHING_PROTOCOLS} ${STATUS_CODES[HTTP_SWITCHING_PROTOCOLS] ?? ''}\r\n` +
      `Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
  )
  let hasPresentedKey = false
  const link = openWebSocket(
    socket,
    (text) => {
      if (hasPresentedKey) {
        if (state.page === link) handlePageMessage(state, text)
        return
      }
      hasPresentedKey = true
      presentKey(state, link, text)
    },
    () => dropPage(state, link),
  )
  if (head.length > 0) receiveChunk(link, head)
}

/** @purity pure */
function httpStatusOf(state: RelayState, request: IncomingMessage): number {
  if (request.headers.host !== state.host) return HTTP_FORBIDDEN
  if (request.url !== PAGE_PATH) return HTTP_NOT_FOUND
  if (request.method !== 'GET') return HTTP_METHOD_NOT_ALLOWED
  return HTTP_OK
}

// see AG-12
/** @purity non-pure */
function answerHttp(state: RelayState, request: IncomingMessage, response: ServerResponse): void {
  const status = httpStatusOf(state, request)
  if (status !== HTTP_OK) {
    const allow = status === HTTP_METHOD_NOT_ALLOWED ? { allow: 'GET' } : {}
    response.writeHead(status, { ...allow, 'content-length': '0', connection: 'close' })
    response.end()
    return
  }
  const { pageHtml } = state.options
  response.writeHead(HTTP_OK, {
    'content-type': HTML_CONTENT_TYPE,
    'content-length': String(pageHtml.byteLength),
    'cache-control': 'no-store',
  })
  response.end(pageHtml)
}

/** @purity non-pure */
function pageResultOf(state: RelayState, call: RelayedCall, cancelled: Promise<null>): Promise<McpToolResult> {
  const page = state.page
  if (page === null) return Promise.resolve(pageNotConnectedResult(state.pageUrl))
  const callId = state.nextPageCallId
  state.nextPageCallId += 1
  const answer = new Promise<RelayedAnswer | null>((resolve) => state.pageCalls.set(callId, resolve))
  void cancelled.then(() => state.pageCalls.delete(callId))
  sendText(page, JSON.stringify({ jsonrpc: JSON_RPC_VERSION, id: callId, method: call.member, params: call.params }))
  return answer.then((received) =>
    received === null ? pageNotConnectedResult(state.pageUrl) : mcpToolResultOf(call.member, received),
  )
}

/** @purity non-pure */
function noticeOrTimeout(state: RelayState, waitMs: number, cancelled: Promise<null>): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer)
      state.noticeWaiters.delete(done)
      resolve()
    }
    const timer = setTimeout(done, Math.min(waitMs, LONGEST_TIMER_MS))
    state.noticeWaiters.add(done)
    void cancelled.then(done)
  })
}

/** @purity pure */
function waitMsOf(toolArguments: unknown): number {
  const waitMs = isPlainRecord(toolArguments) ? toolArguments['waitMs'] : undefined
  return typeof waitMs === 'number' && Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 0
}

// see AG-12, AG-6
/** @purity non-pure */
async function watchResultOf(
  state: RelayState,
  call: RelayedCall,
  waitMs: number,
  cancelled: Promise<null>,
): Promise<McpToolResult> {
  const page = state.page
  if (page === null) return pageNotConnectedResult(state.pageUrl)
  if (!state.watchSubscribed) {
    state.watchSubscribed = true
    const subscribed = await pageResultOf(state, call, cancelled)
    if (state.page !== page) return pageNotConnectedResult(state.pageUrl)
    if (subscribed.isError === true) {
      state.watchSubscribed = false
      return subscribed
    }
  }
  if (state.notices.length === 0 && waitMs > 0) await noticeOrTimeout(state, waitMs, cancelled)
  if (state.page !== page) return pageNotConnectedResult(state.pageUrl)
  const notices = state.notices
  state.notices = []
  return mcpToolResultOf(WATCH_CHANGES, { result: { notices } })
}

/** @purity non-pure */
async function toolCallReplyOf(state: RelayState, id: unknown, params: unknown): Promise<McpReply | null> {
  const name = isPlainRecord(params) ? params['name'] : undefined
  const toolArguments = isPlainRecord(params) ? params['arguments'] : undefined
  if (typeof name !== 'string') return { error: { code: INVALID_PARAMS, message: 'tools/call needs a tool name' } }
  const call = relayedCallOf(isPlainRecord(toolArguments) ? { name, arguments: toolArguments } : { name })
  if (call === null) return { error: { code: INVALID_PARAMS, message: `Unknown tool: ${name}` } }
  const cancelKey = JSON.stringify(id)
  let cancel = (): void => undefined
  const cancelled = new Promise<null>((resolve) => {
    cancel = () => resolve(null)
  })
  state.mcpCancels.set(cancelKey, cancel)
  const work =
    call.member === WATCH_CHANGES
      ? watchResultOf(state, call, waitMsOf(toolArguments), cancelled)
      : pageResultOf(state, call, cancelled)
  try {
    const result = await Promise.race([work, cancelled])
    return result === null ? null : { result }
  } finally {
    state.mcpCancels.delete(cancelKey)
  }
}

/** @purity pure */
function initializeResultOf(params: unknown): Record<string, unknown> {
  const requested = isPlainRecord(params) ? params['protocolVersion'] : undefined
  return {
    protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL_VERSION,
    capabilities: { tools: {} },
    serverInfo: { name: RELAY_NAME, version: RELAY_VERSION },
  }
}

/** @purity non-pure */
function mcpReplyOf(state: RelayState, id: unknown, method: string, params: unknown): McpReply | Promise<McpReply | null> {
  switch (method) {
    case 'initialize':
      return { result: initializeResultOf(params) }
    case 'ping':
      return { result: {} }
    case 'tools/list':
      return { result: { tools: mcpToolList() } }
    case 'tools/call':
      return toolCallReplyOf(state, id, params)
    default:
      return { error: { code: METHOD_NOT_FOUND, message: `Unknown method: ${method}` } }
  }
}

/** @purity non-pure */
async function answerMcpRequest(state: RelayState, id: unknown, method: string, params: unknown): Promise<void> {
  const reply = await mcpReplyOf(state, id, method, params)
  if (reply !== null) writeMcp(state, { id, ...reply })
}

/** @purity non-pure */
function handleMcpNotification(state: RelayState, method: string, params: unknown): void {
  if (method !== CANCELLED || !isPlainRecord(params)) return
  state.mcpCancels.get(JSON.stringify(params['requestId']))?.()
}

// see AG-12
/** @purity non-pure */
function handleMcpLine(state: RelayState, line: string): void {
  const message = parsedJsonOf(line)
  if (message === undefined) {
    writeMcp(state, { id: null, error: { code: PARSE_ERROR, message: 'Parse error' } })
    return
  }
  if (!isPlainRecord(message)) {
    writeMcp(state, { id: null, error: { code: INVALID_REQUEST, message: 'Invalid request' } })
    return
  }
  const { id, method, params } = message
  if (typeof method !== 'string') return
  if (id === undefined) {
    handleMcpNotification(state, method, params)
    return
  }
  answerMcpRequest(state, id, method, params).catch((error: unknown) => {
    state.options.log(`GRS relay: ${method} failed: ${String(error)}`)
    writeMcp(state, { id, error: { code: INTERNAL_ERROR, message: String(error) } })
  })
}

/** @purity non-pure */
function readMcpInput(state: RelayState): () => void {
  const { input } = state.options
  let unread = ''
  const onData = (chunk: string | Buffer): void => {
    unread += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    let newline = unread.indexOf('\n')
    while (newline >= 0) {
      const line = unread.slice(0, newline).replace(/\r$/, '')
      unread = unread.slice(newline + 1)
      if (line.trim() !== '') handleMcpLine(state, line)
      newline = unread.indexOf('\n')
    }
  }
  input.setEncoding('utf8')
  input.on('data', onData)
  return () => {
    input.removeListener('data', onData)
  }
}

/** @purity non-pure */
function listenOnLoopback(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(ANY_FREE_PORT, LOOPBACK, () => {
      server.removeListener('error', reject)
      resolve((server.address() as AddressInfo).port)
    })
  })
}

/** @purity non-pure */
function closeRelay(state: RelayState, server: Server, stopReading: () => void): Promise<void> {
  stopReading()
  const page = state.page
  if (page !== null) {
    closeWebSocket(page, CLOSE_GOING_AWAY)
    dropPage(state, page)
  }
  for (const socket of state.sockets) socket.destroy()
  return new Promise((resolve) => server.close(() => resolve()))
}

// see AG-12, FR-150
/** @purity non-pure */
export async function startMcpRelay(options: McpRelayOptions): Promise<McpRelay> {
  const server = createServer()
  const port = await listenOnLoopback(server)
  const host = `${LOOPBACK}:${port}`
  const key = randomBytes(KEY_BYTES).toString('base64url')
  const state: RelayState = {
    options,
    key,
    host,
    origin: `http://${host}`,
    pageUrl: `http://${host}/#${key}`,
    page: null,
    nextPageCallId: 1,
    pageCalls: new Map(),
    watchSubscribed: false,
    notices: [],
    noticeWaiters: new Set(),
    sockets: new Set(),
    mcpCancels: new Map(),
  }
  server.on('connection', (socket: Socket) => {
    state.sockets.add(socket)
    socket.on('close', () => state.sockets.delete(socket))
  })
  server.on('request', (request, response) => answerHttp(state, request, response))
  server.on('upgrade', (request, socket, head) => acceptUpgrade(state, request, socket as Socket, head))
  server.on('error', (error) => options.log(`GRS relay: ${String(error)}`))
  const stopReading = readMcpInput(state)
  options.log(`GRS relay: open ${state.pageUrl}`)
  return { port, pageUrl: state.pageUrl, close: () => closeRelay(state, server, stopReading) }
}

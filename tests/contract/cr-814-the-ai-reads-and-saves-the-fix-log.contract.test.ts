import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { connect, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import {
  agentApiMembers,
  type AgentApiWiring,
  type AgentWriteOutcome,
} from '../../src/adapter/agent-api-endpoint/agent-api-members'
import type { AgentSnapshot } from '../../src/adapter/agent-api-endpoint/snapshot-source'
import { DEFAULT_TASK_GROUP_NAME } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { NOT_STORED_LIMITS, type EditHistory } from '../../src/entity/document-model/edit-history/edit-history'
import { delayFixLogRowsOf } from '../../src/entity/document-model/schedule/delay-fixes'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'
import type { ChangeStep, SettingsLimits } from '../../src/use-case/apply-document-change/apply-document-change'
import { emptyChangeWatchers, notifyChangeWatchers } from '../../src/use-case/notify-change-watchers/notify-change-watchers'
import { ONE_PARENT } from './cr-731-documents'
import { TEMPLATE } from './cr-731-stage'

type Json = Record<string, unknown>
type Loose = Record<string, unknown>

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

const bases: string[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
  for (const base of bases.splice(0)) rmSync(base, { recursive: true, force: true })
})

interface State {
  document: Document
  history: EditHistory<ChangeStep>
}

interface WideApi {
  readDelayDiagnostics(parts: readonly string[], limit: number): Loose
  readTableRows(table: string, word: string, filters: string, offset: number, limit: number): Loose
  exportFixLogTsv(): Loose
  issueDelayFixes(expectedStamp: unknown, fixKeys: unknown): AgentWriteOutcome
  readStamp(): unknown
}

const HISTORY_LIMITS = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * 1024 * 1024,
}
const SETTINGS_LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const CHANGE_WATCHERS = emptyChangeWatchers()
const FIXED_AT = '2026-10-19T09:00:00'

interface Bench {
  readonly api: WideApi
  readonly logged: { rows: readonly unknown[] }
}

function benchOf(withLogSource: boolean): Bench {
  const state: State = { document: ONE_PARENT(), history: { done: [], undone: [] } }
  const logged: { rows: readonly unknown[] } = { rows: [] }
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
    readAt: '2026-10-19T08:30:00Z',
    localReadAt: '2026-10-19T09:00:00',
  })
  const delayFixLog = {
    readDelayFixLog: () => logged.rows,
    landDelayFixes: (rows: readonly unknown[]) => {
      logged.rows = delayFixLogRowsOf(rows as never, FIXED_AT)
    },
  }
  const wiring = {
    changeWatchers: CHANGE_WATCHERS,
    source: { readSnapshot },
    holder: {
      read: () => ({ document: state.document, history: state.history }),
      replace: (next: State) => {
        state.document = next.document
        state.history = next.history
      },
    },
    audience: {
      deliver: (document: Document, hasUpdatedSchedule: boolean) =>
        notifyChangeWatchers(CHANGE_WATCHERS, { document, hasUpdatedSchedule }),
    },
    rasterizer: undefined,
    takeInDocument: undefined,
    shownTasks: undefined,
    appShell: undefined,
    ...(withLogSource ? { delayFixLog } : {}),
    writerName: 'cr-814 agent',
    schemaVersion: String(TEMPLATE['schemaVersion']),
  } as unknown as AgentApiWiring
  return { api: agentApiMembers(wiring) as unknown as WideApi, logged }
}

const rowsOf = (answer: Loose): readonly Loose[] => answer['rows'] as readonly Loose[]
const columnsOf = (answer: Loose): readonly Loose[] => answer['columns'] as readonly Loose[]

function benchWithIssuedFixes(): Bench {
  const bench = benchOf(true)
  const outcome = bench.api.issueDelayFixes(bench.api.readStamp(), [])
  expect(outcome.ok, 'premise: the recommended fixes land').toBe(true)
  expect(bench.logged.rows.length, 'premise: the log source holds rows').toBeGreaterThan(0)
  return bench
}

const BOM = '﻿'

function tsvLinesOf(value: unknown): string[] {
  expect(typeof value).toBe('string')
  const text = String(value)
  const body = text.startsWith(BOM) ? text.slice(1) : text
  const lines = body.split('\r\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

function pagesJoined(api: WideApi, table: string): Loose[] {
  const joined: Loose[] = []
  let offset: number | null = 0
  while (offset !== null) {
    const page: Loose = api.readTableRows(table, '', 'asShown', offset, 1)
    expect(page['offset']).toBe(offset)
    expect(rowsOf(page).length).toBeLessThanOrEqual(1)
    joined.push(...rowsOf(page))
    offset = page['nextOffset'] as number | null
  }
  return joined
}

describe('AM-28 readTableRows delayFixProposals -- the fix proposals table, as the person sees it', () => {
  it('is ok, lists the table columns with ids, ja and en, and holds as many rows as fixProposals', () => {
    const { api } = benchOf(true)
    const proposals = api.readDelayDiagnostics([], 0)['fixProposals'] as readonly unknown[]
    expect(proposals.length, 'premise: the bench has proposals').toBeGreaterThan(0)

    const answer = api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)

    expect(answer['ok']).toBe(true)
    expect(answer['table']).toBe('delayFixProposals')
    expect(columnsOf(answer).length).toBeGreaterThan(0)
    for (const column of columnsOf(answer)) {
      expect(typeof column['id']).toBe('string')
      expect(typeof column['ja']).toBe('string')
      expect(typeof column['en']).toBe('string')
    }
    expect(rowsOf(answer)).toHaveLength(proposals.length)
    expect(answer['total']).toBe(proposals.length)
    expect(answer['nextOffset']).toBeNull()
  })

  it('the column words are words, not the row ids', () => {
    const answer = benchOf(true).api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)

    for (const column of columnsOf(answer)) {
      expect(column['en'], String(column['id'])).not.toBe(column['id'])
      expect(column['ja'], String(column['id'])).not.toBe(column['id'])
    }
  })

  it('every row carries one cell per column, in the order of the columns', () => {
    const answer = benchOf(true).api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)

    const ids = columnsOf(answer).map((one) => one['id'])
    for (const row of rowsOf(answer)) {
      expect((row['cells'] as readonly Loose[]).map((cell) => cell['column'])).toEqual(ids)
    }
  })

  it('a word that matches nothing gives 0 rows and total 0', () => {
    const answer = benchOf(true).api.readTableRows('delayFixProposals', 'zzz-no-such-word-814', 'asShown', 0, 100)

    expect(answer['ok']).toBe(true)
    expect(rowsOf(answer)).toHaveLength(0)
    expect(answer['total']).toBe(0)
    expect(answer['nextOffset']).toBeNull()
  })

  it('a word taken from a shown cell keeps at least that row', () => {
    const { api } = benchOf(true)
    const whole = api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)
    const cell = (rowsOf(whole)[0]?.['cells'] as readonly Loose[]).find((one) => one['column'] === 'FM-5')
    expect(cell, 'premise: the Task cell').toBeDefined()

    const kept = api.readTableRows('delayFixProposals', String(cell?.['text']), 'asShown', 0, 100)

    expect(rowsOf(kept).length).toBeGreaterThan(0)
    expect(rowsOf(kept).length).toBeLessThanOrEqual(rowsOf(whole).length)
  })

  it('pages with offset and limit: pages of one row join to the whole table', () => {
    const { api } = benchOf(true)
    const all = rowsOf(api.readTableRows('delayFixProposals', '', 'asShown', 0, 100))

    expect(pagesJoined(api, 'delayFixProposals')).toEqual(all)
  })

  it('an offset past the end gives no rows and no nextOffset', () => {
    const answer = benchOf(true).api.readTableRows('delayFixProposals', '', 'asShown', 1000, 100)

    expect(answer['ok']).toBe(true)
    expect(rowsOf(answer)).toHaveLength(0)
    expect(answer['nextOffset']).toBeNull()
  })

  it("filters 'none' and 'asShown' give the same rows, the table having no column filter in the document", () => {
    const { api } = benchOf(true)

    const shown = api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)
    const none = api.readTableRows('delayFixProposals', '', 'none', 0, 100)

    expect(rowsOf(none)).toEqual(rowsOf(shown))
  })

  it('works with no log source wired as well', () => {
    const answer = benchOf(false).api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)

    expect(answer['ok']).toBe(true)
    expect(rowsOf(answer).length).toBeGreaterThan(0)
  })
})

describe('AM-28 readTableRows delayFixLog -- the fix log table', () => {
  it('with an empty log it answers ok with the columns and 0 rows', () => {
    const answer = benchOf(true).api.readTableRows('delayFixLog', '', 'asShown', 0, 100)

    expect(answer['ok']).toBe(true)
    expect(answer['table']).toBe('delayFixLog')
    expect(columnsOf(answer).length).toBeGreaterThan(0)
    expect(rowsOf(answer)).toHaveLength(0)
    expect(answer['total']).toBe(0)
  })

  it('with no log source wired it answers 0 rows too', () => {
    const answer = benchOf(false).api.readTableRows('delayFixLog', '', 'asShown', 0, 100)

    expect(answer['ok']).toBe(true)
    expect(rowsOf(answer)).toHaveLength(0)
  })

  it('after the fixes were issued the row count equals the length of fixLog', () => {
    const { api, logged } = benchWithIssuedFixes()
    const logLength = (api.readDelayDiagnostics([], 0)['fixLog'] as readonly unknown[]).length

    const answer = api.readTableRows('delayFixLog', '', 'asShown', 0, 100)

    expect(logLength).toBe(logged.rows.length)
    expect(rowsOf(answer)).toHaveLength(logLength)
    expect(answer['total']).toBe(logLength)
  })

  it('the columns differ from the proposals table in id and every row has one cell per column', () => {
    const { api } = benchWithIssuedFixes()

    const log = api.readTableRows('delayFixLog', '', 'asShown', 0, 100)
    const proposals = api.readTableRows('delayFixProposals', '', 'asShown', 0, 100)

    expect(columnsOf(log).map((one) => one['id'])).not.toEqual(columnsOf(proposals).map((one) => one['id']))
    for (const row of rowsOf(log)) expect(row['cells'] as readonly unknown[]).toHaveLength(columnsOf(log).length)
  })

  it('a word that matches nothing gives 0 rows, and filters none and asShown give the same rows', () => {
    const { api } = benchWithIssuedFixes()

    const nothing = api.readTableRows('delayFixLog', 'zzz-no-such-word-814', 'asShown', 0, 100)
    const shown = api.readTableRows('delayFixLog', '', 'asShown', 0, 100)
    const none = api.readTableRows('delayFixLog', '', 'none', 0, 100)

    expect(rowsOf(nothing)).toHaveLength(0)
    expect(rowsOf(none)).toEqual(rowsOf(shown))
  })

  it('pages with offset and limit', () => {
    const { api } = benchWithIssuedFixes()
    const all = rowsOf(api.readTableRows('delayFixLog', '', 'asShown', 0, 100))

    expect(pagesJoined(api, 'delayFixLog')).toEqual(all)
  })

  it('an unknown table name is refused malformedRequest', () => {
    const answer = benchOf(true).api.readTableRows('noSuchTable', '', 'asShown', 0, 100)

    expect(answer['ok']).toBe(false)
    expect((answer['refusal'] as Loose)['reason']).toBe('malformedRequest')
  })
})

describe('AM-34 exportFixLogTsv -- the fix log as a .tsv string, as RW-20 writes it', () => {
  it('answers ok with a string value', () => {
    const answer = benchWithIssuedFixes().api.exportFixLogTsv()

    expect(answer['ok']).toBe(true)
    expect(typeof answer['value']).toBe('string')
  })

  it('with an empty log the value holds only the heading line', () => {
    const answer = benchOf(true).api.exportFixLogTsv()

    expect(answer['ok']).toBe(true)
    expect(tsvLinesOf(answer['value'])).toHaveLength(1)
  })

  it('with no log source wired the value holds only the heading line too', () => {
    const answer = benchOf(false).api.exportFixLogTsv()

    expect(answer['ok']).toBe(true)
    expect(tsvLinesOf(answer['value'])).toHaveLength(1)
  })

  it('the first line holds the table column words, then the three UID headings of the dictionary', () => {
    const { api } = benchWithIssuedFixes()
    const columns = columnsOf(api.readTableRows('delayFixLog', '', 'asShown', 0, 100))
    const heading = (tsvLinesOf(api.exportFixLogTsv()['value'])[0] ?? '').split('\t')

    const head = heading.slice(0, columns.length).join('\t')
    const isEnglish = head === columns.map((one) => one['en']).join('\t')
    const isJapanese = head === columns.map((one) => one['ja']).join('\t')
    const uidWords = heading.slice(columns.length)

    expect(isEnglish || isJapanese).toBe(true)
    expect(uidWords).toEqual(isEnglish ? ['Task UID', 'Before UID', 'After UID'] : ['タスク UID', '修正前 UID', '修正後 UID'])
  })

  it('one line per log row after the heading, tab-separated with the same count of cells as the heading', () => {
    const { api, logged } = benchWithIssuedFixes()

    const lines = tsvLinesOf(api.exportFixLogTsv()['value'])
    const widths = lines.map((line) => line.split('\t').length)

    expect(lines).toHaveLength(1 + logged.rows.length)
    expect(new Set(widths).size).toBe(1)
    expect(widths[0]).toBeGreaterThan(3)
  })

  it('the text starts with a BOM and every line break is CRLF', () => {
    const value = String(benchWithIssuedFixes().api.exportFixLogTsv()['value'])

    expect(value.startsWith(BOM)).toBe(true)
    expect(value.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('the Task UID cell of the lines names the tasks the log rows are about', () => {
    const { api, logged } = benchWithIssuedFixes()

    const lines = tsvLinesOf(api.exportFixLogTsv()['value']).slice(1)
    const uids = lines.map((line) => {
      const cells = line.split('\t')
      return cells[cells.length - 3]
    })

    expect(uids).toHaveLength(logged.rows.length)
    expect(new Set(uids)).toEqual(new Set((logged.rows as readonly Loose[]).map((one) => String(one['taskUid']))))
  })

  it('reads no window state: the same call twice gives the same text, and it writes nothing', () => {
    const { api } = benchWithIssuedFixes()
    const stamp = structuredClone(api.readStamp())

    const first = api.exportFixLogTsv()['value']
    const second = api.exportFixLogTsv()['value']

    expect(second).toBe(first)
    expect(api.readStamp()).toEqual(stamp)
  })

  it('has as many lines as the delayFixLog table has rows, plus the heading', () => {
    const { api } = benchWithIssuedFixes()
    const total = api.readTableRows('delayFixLog', '', 'none', 0, 100)['total'] as number

    expect(tsvLinesOf(api.exportFixLogTsv()['value'])).toHaveLength(1 + total)
  })
})

describe('AM-34 the relay: exportFixLogTsv is a tool and saves a .tsv into the save folder', () => {
  async function savingSetup(): Promise<{ started: Started; folder: string; page: FakePage }> {
    const base = mkdtempSync(join(tmpdir(), 'grs-cr814-'))
    bases.push(base)
    const folder = join(base, 'save')
    mkdirSync(folder)
    const started = await startRelay({ saveFolder: folder })
    const page = await connectPage(started, (call) => {
      if (String(call['method']) === 'agentApiVersion') return { result: '1.0-fake' }
      return { result: { ok: true, value: 'Heading\r\nrow\r\n' } }
    })
    return { started, folder, page }
  }

  it('tools/list holds exportFixLogTsv, with fileName and overwrite in its input shape', async () => {
    const { client } = await startRelay()
    const id = client.newId()
    client.send({ jsonrpc: '2.0', id, method: 'tools/list', params: {} })

    const tools = ((await client.answerTo(id))['result'] as Json)['tools'] as Json[]
    const tool = tools.find((one) => one['name'] === 'exportFixLogTsv')
    const properties = ((tool?.['inputSchema'] as Json | undefined)?.['properties'] ?? {}) as Json

    expect(tool).toBeDefined()
    expect(Object.keys(properties)).toEqual(expect.arrayContaining(['fileName', 'overwrite']))
  })

  it('fileName log.tsv writes the page text into the save folder and answers a saved file', async () => {
    const { started, folder, page } = await savingSetup()

    const saved = structuredOf(await started.client.callTool('exportFixLogTsv', { fileName: 'log.tsv' }))

    expect(saved['ok']).toBe(true)
    expect(String(saved['savedTo']).endsWith('log.tsv')).toBe(true)
    expect(readFileSync(join(folder, 'log.tsv'), 'utf8')).toBe('Heading\r\nrow\r\n')
    expect(page.callsOf('exportFixLogTsv')).toHaveLength(1)
  })

  it.each(['log.json', 'log.txt', 'log', 'log.tsv.exe'])('fileName %s is refused badFileName and nothing is written', async (fileName) => {
    const { started, folder } = await savingSetup()

    const result = await started.client.callTool('exportFixLogTsv', { fileName })

    expect(reasonOf(result)).toBe('badFileName')
    expect(existsSync(join(folder, fileName))).toBe(false)
  })

  it('a .tsv fileName on another export (exportJson) is refused badFileName', async () => {
    const { started } = await savingSetup()

    const result = await started.client.callTool('exportJson', { fileName: 'plan.tsv' })

    expect(reasonOf(result)).toBe('badFileName')
  })
})

describe('AM-30 readSchema notes -- the Comment boxes line', () => {
  it('the members table holds the line naming CommentBox.fontSizePx, 8 to 24 and null drawing 10', () => {
    const members = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-agent-api-members.md'), 'utf8')

    expect(members).toMatch(/Comment boxes\. CommentBox\.fontSizePx[^\n]*8 to 24[^\n]*null draws 10/)
  })

  it('the notes the relay answers hold the same line', async () => {
    const { client } = await startRelay()

    const text = JSON.stringify(await client.callTool('readSchema', { which: 'notes' }))

    expect(text).toContain('CommentBox.fontSizePx')
    expect(text).toMatch(/8 to 24/)
    expect(text).toMatch(/null draws 10/)
  })
})

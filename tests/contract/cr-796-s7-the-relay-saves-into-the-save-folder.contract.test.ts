// CR-796 slice 7 spec-only tests: the relay saves an export into the save folder -- fileName / overwrite, AV-21, .bak (AG-12 (9), design 3.1, 5, 7).

import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { connect, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it } from 'vitest'

import { startMcpRelay, type McpRelay } from '../../src/framework/mcp-relay-server/mcp-relay-server'
import { unbroken } from './spec-table'

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

const CLAUSE_WRITES =
  '取次は、書き出しの道具（`_assets/tbl-agent-api-members.md` の 表 T-107 の `AM-11`〜`AM-15`）が MCP だけの鍵 `fileName` を受けたとき、ページが返した値を、人が取次の設定で決めたフォルダの中へファイルとして書くこと（MUST）'
const CLAUSE_OUTSIDE = '⛔ 設定のフォルダの外へ書いてはならない（MUST NOT）'
const CLAUSE_EXISTS =
  '既にあるファイルは、取次の設定「上書きの前に確認する」が入っているあいだ、`overwrite` が真でなければ書かずに拒むこと（MUST）'
const CLAUSE_BACKUP = '上書きするときは、前の中身を `.bak` として 1 世代残すこと（MUST）'
const CLAUSE_NO_DOCUMENT = '⛔ **取次は文書もドメインの規則も持ってはならない（MUST NOT）'

const FORMATS: readonly (readonly [string, string])[] = [
  ['exportJson', '.json'],
  ['exportMspdi', '.xml'],
  ['exportSvg', '.svg'],
  ['exportPng', '.png'],
  ['exportEmbeddedHtml', '.html'],
]

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x0d, 0x0a, 0x7f])

// WHY: CRLF, a lone LF and a non-ASCII letter prove the text is placed byte for byte.
const FIRST_TEXT = 'first\r\nline\n\u3042 end'

function freshContent(): Record<string, string> {
  return {
    exportJson: FIRST_TEXT,
    exportMspdi: `<?xml version="1.0"?>\r\n<Project>${FIRST_TEXT}</Project>`,
    exportSvg: `<svg>${FIRST_TEXT}</svg>`,
    exportPng: PNG_BYTES.toString('base64'),
    exportEmbeddedHtml: `<!doctype html>${FIRST_TEXT}`,
  }
}

// WHY: CR-799 -- savedTo and backedUpTo are the absolute places of the files, under the real place of the save folder (AV-21).
const placeIn = (folder: string, name: string): string => join(realpathSync(folder), name)

const bytesOfValue = (method: string, value: string): Buffer =>
  method === 'exportPng' ? Buffer.from(value, 'base64') : Buffer.from(value, 'utf8')

const bases: string[] = []

interface Place {
  readonly base: string
  readonly folder: string
}

// WHY: the base is a fresh folder under the temp folder; the save folder is a child of it that may or may not exist yet.
function placeOf(isFolderMade: boolean): Place {
  const base = mkdtempSync(join(tmpdir(), 'grs-s7-'))
  bases.push(base)
  const folder = join(base, 'save')
  if (isFolderMade) mkdirSync(folder)
  return { base, folder }
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return []
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...filesUnder(path).map((one) => join(entry.name, one)))
    else found.push(entry.name)
  }
  return found.sort()
}

interface Saving {
  readonly started: Started
  readonly page: FakePage
  readonly place: Place
  readonly content: Record<string, string>
}

async function savingSetup(options: Json = {}, isFolderMade: boolean = true, refusals: Record<string, Json> = {}): Promise<Saving> {
  const place = placeOf(isFolderMade)
  const started = await startRelay({ saveFolder: place.folder, ...options })
  const content = freshContent()
  const page = await connectPage(started, (call) => {
    const method = String(call['method'])
    if (method === 'agentApiVersion') return { result: '1.0-fake' }
    const refused = refusals[method]
    if (refused !== undefined) return { result: refused }
    const value = content[method]
    if (value !== undefined) return { result: { ok: true, value } }
    return { result: { ok: true, stamp: 'stamp-1', value: { method } } }
  })
  return { started, page, place, content }
}

const structuredOf = (result: Json): Json => result['structuredContent'] as Json

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const relay of relays.splice(0)) await Promise.race([relay.close(), sleep(WAIT_MS)])
  for (const client of clients.splice(0)) client.input.end()
  for (const base of bases.splice(0)) rmSync(base, { recursive: true, force: true })
})

// see AG-12, AM-11, AM-12, AM-13, AM-14, AM-15, AV-21
describe('AG-12 (9): a save writes the page value into the save folder and answers AgentSavedFile (AV-21)', () => {
  it.each(FORMATS)(`${CLAUSE_WRITES} -- %s writes the exact bytes`, async (method, extension) => {
    const { started, place, content } = await savingSetup()
    const name = `plan-2026${extension}`
    const result = await started.client.callTool(method, { fileName: name })
    expect(result['isError']).not.toBe(true)
    const expected = bytesOfValue(method, content[method] ?? '')
    expect(structuredOf(result)).toEqual({ ok: true, savedTo: placeIn(place.folder, name), bytes: expected.length, backedUpTo: null })
    expect(filesUnder(place.folder)).toEqual([name])
    expect(readFileSync(join(place.folder, name)).equals(expected)).toBe(true)
  })

  it('AM-14: for exportPng the base64 is decoded -- the bytes on disk are the image, not the base64 text', async () => {
    const { started, place } = await savingSetup()
    const result = await started.client.callTool('exportPng', { fileName: 'picture.png' })
    const onDisk = readFileSync(join(place.folder, 'picture.png'))
    expect(onDisk.equals(PNG_BYTES)).toBe(true)
    expect(structuredOf(result)['bytes']).toBe(PNG_BYTES.length)
  })

  it('design 5: the save folder is made on the first save when it does not exist yet', async () => {
    const { started, place } = await savingSetup({}, false)
    expect(existsSync(place.folder)).toBe(false)
    const result = await started.client.callTool('exportJson', { fileName: 'first.json' })
    expect(structuredOf(result)['ok']).toBe(true)
    expect(readFileSync(join(place.folder, 'first.json'), 'utf8')).toBe(FIRST_TEXT)
  })

  it('design 3.1: the page is not handed fileName or overwrite -- the relay reads them and does not carry them', async () => {
    const { started, page } = await savingSetup()
    await started.client.callTool('exportJson', { fileName: 'carry-check.json', overwrite: true })
    const calls = page.callsOf('exportJson')
    expect(calls).toHaveLength(1)
    const text = JSON.stringify(calls[0])
    expect(text).not.toContain('fileName')
    expect(text).not.toContain('overwrite')
    expect(text).not.toContain('carry-check')
  })

  it(`${CLAUSE_NO_DOCUMENT} -- the value is placed as the page returned it, not read or reshaped`, async () => {
    const { started, place, content } = await savingSetup()
    content['exportJson'] = 'this is not json at all {'
    await started.client.callTool('exportJson', { fileName: 'as-is.json' })
    expect(readFileSync(join(place.folder, 'as-is.json'), 'utf8')).toBe('this is not json at all {')
  })

  it('design 5: a page that refuses the export is carried as the page said it -- nothing is written', async () => {
    const refused = { ok: false, refusal: { target: 'AM-13', reason: 'notDrawnYet' } }
    const { started, place } = await savingSetup({}, true, { exportSvg: refused })
    const result = await started.client.callTool('exportSvg', { fileName: 'never.svg' })
    expect(structuredOf(result)).toEqual(refused)
    expect(filesUnder(place.base)).toEqual([])
  })

  it('AM-11: without fileName the export answers the value as before and no file is written', async () => {
    const { started, place, content } = await savingSetup()
    const result = await started.client.callTool('exportJson')
    expect(structuredOf(result)).toEqual({ ok: true, value: content['exportJson'] })
    expect(filesUnder(place.base)).toEqual([])
  })

  it('AG-12 (9): the relay reads no file -- no tool of the list reads or opens a file', async () => {
    const { started } = await savingSetup()
    const id = started.client.newId()
    started.client.send({ jsonrpc: '2.0', id, method: 'tools/list' })
    const answer = await started.client.answerTo(id)
    const names = ((answer['result'] as { tools: { name: string }[] }).tools ?? []).map((tool) => tool.name)
    expect(names).toContain('requestOpenFile')
    expect(names.filter((name) => /^(read|open|load|import)File/i.test(name))).toEqual([])
  })
})

// see AG-12
describe('AG-12 (9) / design 7: a name that leaves the folder, or is not the format, is refused with badFileName', () => {
  const place = (): Place => placeOf(true)
  const bad: readonly (readonly [string, (base: string) => string])[] = [
    ['..', () => '..'],
    ['../escape.json', () => '../escape.json'],
    ['..\\escape.json', () => '..\\escape.json'],
    ['sub/../../escape.json', () => 'sub/../../escape.json'],
    ['an absolute path of this machine', (base) => join(base, 'abs-escape.json')],
    ['a rooted path /abs-escape.json', () => '/abs-escape.json'],
    ['a drive-relative name C:x.json', () => 'C:x.json'],
    ['a UNC path with backslashes', () => '\\\\server\\share\\a.json'],
    ['a UNC path with slashes', () => '//server/share/a.json'],
    ['a device name con.json', () => 'con.json'],
    ['a device name NUL.json', () => 'NUL.json'],
    ['a device name aux.json', () => 'aux.json'],
    ['a name with a colon a:b.json', () => 'a:b.json'],
  ]

  it.each(bad)(`${CLAUSE_OUTSIDE} -- %s`, async (_label, make) => {
    const here = place()
    const started = await startRelay({ saveFolder: here.folder })
    await connectPage(started, () => ({ result: { ok: true, value: 'x' } }))
    const result = await started.client.callTool('exportJson', { fileName: make(here.base) })
    expect(result['isError']).not.toBe(true)
    expect(structuredOf(result)['ok']).toBe(false)
    expect(reasonOf(result)).toBe('badFileName')
    expect(filesUnder(here.base)).toEqual([])
  })

  it(`${CLAUSE_OUTSIDE} -- a name whose resolved real place leaves the folder (a link inside it) is refused`, async (context) => {
    const here = place()
    const outside = join(here.base, 'outside')
    mkdirSync(outside)
    try {
      symlinkSync(outside, join(here.folder, 'link'), 'junction')
    } catch {
      context.skip()
      return
    }
    const started = await startRelay({ saveFolder: here.folder })
    await connectPage(started, () => ({ result: { ok: true, value: 'x' } }))
    const result = await started.client.callTool('exportJson', { fileName: 'link/a.json' })
    expect(reasonOf(result)).toBe('badFileName')
    expect(filesUnder(outside)).toEqual([])
  })

  const wrongExtensions: [string, string, string][] = []
  for (const [method, extension] of FORMATS) {
    const other = FORMATS.find(([, one]) => one !== extension)?.[1] ?? '.txt'
    wrongExtensions.push([method, 'plan.txt', extension], [method, 'plan', extension], [method, `plan${other}`, extension])
  }

  it.each(wrongExtensions)('design 5: %s refuses the name %s (the one extension is %s)', async (method, name) => {
    const here = place()
    const started = await startRelay({ saveFolder: here.folder })
    await connectPage(started, () => ({ result: { ok: true, value: 'x' } }))
    const result = await started.client.callTool(method, { fileName: name })
    expect(structuredOf(result)['ok']).toBe(false)
    expect(reasonOf(result)).toBe('badFileName')
    expect(filesUnder(here.base)).toEqual([])
  })

  it('design 7: the folder cannot be changed by the AI -- a saveFolder argument is not taken, the file goes to the set folder', async () => {
    const { started, place: here } = await savingSetup()
    const elsewhere = join(here.base, 'elsewhere')
    mkdirSync(elsewhere)
    const result = await started.client.callTool('exportJson', { fileName: 'kept.json', saveFolder: elsewhere })
    expect(structuredOf(result)['ok']).toBe(true)
    expect(filesUnder(elsewhere)).toEqual([])
    expect(existsSync(join(here.folder, 'kept.json'))).toBe(true)
  })
})

// see AG-12, AV-21
describe('AG-12 (9) / design 5: saveFolderUnavailable when the folder cannot be made', () => {
  it('a save folder under a plain file -> refused with saveFolderUnavailable, nothing is written', async () => {
    const here = placeOf(true)
    const blocker = join(here.base, 'blocker')
    writeFileSync(blocker, 'a plain file')
    const started = await startRelay({ saveFolder: join(blocker, 'sub') })
    await connectPage(started, () => ({ result: { ok: true, value: 'x' } }))
    const result = await started.client.callTool('exportJson', { fileName: 'a.json' })
    expect(structuredOf(result)['ok']).toBe(false)
    expect(reasonOf(result)).toBe('saveFolderUnavailable')
    expect(filesUnder(here.base)).toEqual(['blocker'])
  })
})

// see AG-12, AV-21
describe('AG-12 (9): a file that exists is not replaced unless overwrite is true, and the old content is kept as .bak', () => {
  it(`${CLAUSE_EXISTS} -- the setting is on by default: a second save of the name is refused with fileExists`, async () => {
    const { started, place, content } = await savingSetup()
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json' })
    expect(structuredOf(result)['ok']).toBe(false)
    expect(reasonOf(result)).toBe('fileExists')
    expect(readFileSync(join(place.folder, 'a.json'), 'utf8')).toBe(FIRST_TEXT)
    expect(filesUnder(place.folder)).toEqual(['a.json'])
  })

  it(`${CLAUSE_EXISTS} -- overwrite false is refused the same way`, async () => {
    const { started, place, content } = await savingSetup({ confirmBeforeOverwrite: true })
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json', overwrite: false })
    expect(reasonOf(result)).toBe('fileExists')
    expect(readFileSync(join(place.folder, 'a.json'), 'utf8')).toBe(FIRST_TEXT)
  })

  it(`${CLAUSE_BACKUP} -- overwrite true replaces the file and the old content is a.json.bak`, async () => {
    const { started, place, content } = await savingSetup()
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json', overwrite: true })
    expect(structuredOf(result)).toEqual({ ok: true, savedTo: placeIn(place.folder, 'a.json'), bytes: 6, backedUpTo: placeIn(place.folder, 'a.json.bak') })
    expect(readFileSync(join(place.folder, 'a.json'), 'utf8')).toBe('second')
    expect(readFileSync(join(place.folder, 'a.json.bak'), 'utf8')).toBe(FIRST_TEXT)
    expect(filesUnder(place.folder)).toEqual(['a.json', 'a.json.bak'])
  })

  it(`${CLAUSE_BACKUP} -- one generation only: a third save replaces the older .bak`, async () => {
    const { started, place, content } = await savingSetup()
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    await started.client.callTool('exportJson', { fileName: 'a.json', overwrite: true })
    content['exportJson'] = 'third!'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json', overwrite: true })
    expect(structuredOf(result)['backedUpTo']).toBe(placeIn(place.folder, 'a.json.bak'))
    expect(readFileSync(join(place.folder, 'a.json'), 'utf8')).toBe('third!')
    expect(readFileSync(join(place.folder, 'a.json.bak'), 'utf8')).toBe('second')
    expect(filesUnder(place.folder)).toEqual(['a.json', 'a.json.bak'])
  })

  it('AV-21: overwrite true on a name that is not there writes it, backedUpTo is null and no .bak appears', async () => {
    const { started, place } = await savingSetup()
    const result = await started.client.callTool('exportJson', { fileName: 'new.json', overwrite: true })
    expect(structuredOf(result)).toEqual({ ok: true, savedTo: placeIn(place.folder, 'new.json'), bytes: Buffer.byteLength(FIRST_TEXT), backedUpTo: null })
    expect(filesUnder(place.folder)).toEqual(['new.json'])
  })

  it(`${CLAUSE_BACKUP} -- a PNG overwritten keeps the earlier image as picture.png.bak`, async () => {
    const { started, place, content } = await savingSetup()
    await started.client.callTool('exportPng', { fileName: 'picture.png' })
    const newer = Buffer.from([1, 2, 3, 4])
    content['exportPng'] = newer.toString('base64')
    const result = await started.client.callTool('exportPng', { fileName: 'picture.png', overwrite: true })
    expect(structuredOf(result)['backedUpTo']).toBe(placeIn(place.folder, 'picture.png.bak'))
    expect(readFileSync(join(place.folder, 'picture.png')).equals(newer)).toBe(true)
    expect(readFileSync(join(place.folder, 'picture.png.bak')).equals(PNG_BYTES)).toBe(true)
  })

  it('design 7: confirmBeforeOverwrite false -- an existing file is replaced without overwrite, and the .bak is still kept', async () => {
    const { started, place, content } = await savingSetup({ confirmBeforeOverwrite: false })
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json' })
    expect(structuredOf(result)).toEqual({ ok: true, savedTo: placeIn(place.folder, 'a.json'), bytes: 6, backedUpTo: placeIn(place.folder, 'a.json.bak') })
    expect(readFileSync(join(place.folder, 'a.json'), 'utf8')).toBe('second')
    expect(readFileSync(join(place.folder, 'a.json.bak'), 'utf8')).toBe(FIRST_TEXT)
  })

  it('AG-12 (9): the relay reads no file -- an overwrite answer does not carry the old content', async () => {
    const { started, content } = await savingSetup()
    await started.client.callTool('exportJson', { fileName: 'a.json' })
    content['exportJson'] = 'second'
    const result = await started.client.callTool('exportJson', { fileName: 'a.json', overwrite: true })
    expect(JSON.stringify(result)).not.toContain('first')
  })
})

// see AG-12
describe('AG-12 (9) -- the clauses slice 7 added, held verbatim', () => {
  const requirements = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))
  const clauses = [CLAUSE_WRITES, CLAUSE_OUTSIDE, CLAUSE_EXISTS, CLAUSE_BACKUP, CLAUSE_NO_DOCUMENT]
  it.each(clauses)('the specification says: %s', (clause) => {
    expect(requirements).toContain(clause)
  })
})

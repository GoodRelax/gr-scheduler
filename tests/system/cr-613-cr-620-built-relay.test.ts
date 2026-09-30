// CR-613 / CR-620 spec-only tests: the built page's CSP (T-232 PO-7) and the relay artifacts in dist-relay/ (AG-12 (1), design 6).

import { expect, test } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const DIST = join(process.cwd(), 'dist')
const PAGE = join(DIST, 'index.html')
const DIST_RELAY = join(process.cwd(), 'dist-relay')
const BUNDLE = join(DIST_RELAY, 'grs-relay.mcpb')
const BUNDLE_SHA256 = join(DIST_RELAY, 'grs-relay.mcpb.sha256')
const RELAY_JS = join(DIST_RELAY, 'grs-relay.mjs')

const SERVER_ENTRY = 'server/grs-relay.mjs'
const STARTUP_WAIT_MS = 10_000

const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const CENTRAL_ENTRY = 0x02014b50
const LOCAL_ENTRY = 0x04034b50
const STORED = 0
const DEFLATED = 8

// WHY: a minimal reader instead of a zip library -- the repository has none,
// and the three fields asked for need only the central directory.
function unzip(bytes: Buffer): Map<string, Buffer> {
  let end = -1
  for (let at = bytes.length - 22; at >= 0; at--) {
    if (bytes.readUInt32LE(at) === END_OF_CENTRAL_DIRECTORY) {
      end = at
      break
    }
  }
  if (end < 0) throw new Error('not a zip: no end of central directory')
  const count = bytes.readUInt16LE(end + 10)
  let at = bytes.readUInt32LE(end + 16)
  const files = new Map<string, Buffer>()
  for (let i = 0; i < count; i++) {
    if (bytes.readUInt32LE(at) !== CENTRAL_ENTRY) throw new Error(`not a zip: bad central entry ${String(i)}`)
    const method = bytes.readUInt16LE(at + 10)
    const packedSize = bytes.readUInt32LE(at + 20)
    const nameLength = bytes.readUInt16LE(at + 28)
    const extraLength = bytes.readUInt16LE(at + 30)
    const commentLength = bytes.readUInt16LE(at + 32)
    const localAt = bytes.readUInt32LE(at + 42)
    const name = bytes.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    at += 46 + nameLength + extraLength + commentLength
    if (bytes.readUInt32LE(localAt) !== LOCAL_ENTRY) throw new Error(`not a zip: bad local entry ${name}`)
    const dataAt = localAt + 30 + bytes.readUInt16LE(localAt + 26) + bytes.readUInt16LE(localAt + 28)
    const packed = bytes.subarray(dataAt, dataAt + packedSize)
    if (method === STORED) files.set(name, Buffer.from(packed))
    else if (method === DEFLATED) files.set(name, inflateRawSync(packed))
    else throw new Error(`zip entry ${name} uses method ${String(method)}`)
  }
  return files
}

function cspOf(html: string): string {
  const meta = /<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/i.exec(html)?.[0]
  if (meta === undefined) throw new Error('dist/index.html has no Content-Security-Policy meta')
  const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(meta)
  return content?.[1] ?? content?.[2] ?? ''
}

function directive(csp: string, name: string): readonly string[] | undefined {
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/)
    if (tokens[0]?.toLowerCase() === name) return tokens.slice(1)
  }
  return undefined
}

function built(path: string): Buffer {
  if (!existsSync(path)) {
    throw new Error(`the built artifact ${path} is not there; run \`npm run build\` then \`npm run build:relay\` first`)
  }
  return readFileSync(path)
}

const bundled = (): Map<string, Buffer> => unzip(built(BUNDLE))

test('T-232 PO-7: the built page\'s CSP has connect-src \'self\' and no other source', () => {
  expect(directive(cspOf(built(PAGE).toString('utf8')), 'connect-src')).toEqual(["'self'"])
})

test('design 6 / CR-620: grs-relay.mcpb is a zip holding manifest.json, server/grs-relay.mjs and index.html', () => {
  expect([...bundled().keys()]).toEqual(expect.arrayContaining(['manifest.json', SERVER_ENTRY, 'index.html']))
})

test('JDG-1052: grs-relay.mcpb.sha256 holds the SHA-256 of grs-relay.mcpb', () => {
  const told = built(BUNDLE_SHA256).toString('utf8').trim().split(/\s+/)[0] ?? ''
  expect(told.toLowerCase()).toBe(createHash('sha256').update(built(BUNDLE)).digest('hex'))
})

test('NFR-004 / CN-1: after the relay build dist/ still holds only index.html', () => {
  built(BUNDLE)
  expect(readdirSync(DIST)).toEqual(['index.html'])
})

test('design 6 / CR-620: the manifest runs on node, from server/grs-relay.mjs', () => {
  const manifest = JSON.parse((bundled().get('manifest.json') ?? Buffer.alloc(0)).toString('utf8')) as {
    server?: { type?: string; entry_point?: string }
  }
  expect(manifest.server?.type).toBe('node')
  expect(manifest.server?.entry_point).toBe(SERVER_ENTRY)
})

test('design 6: the bundle\'s index.html is dist/index.html byte for byte (the same build)', () => {
  expect(Buffer.compare(bundled().get('index.html') ?? Buffer.alloc(0), built(PAGE))).toBe(0)
})

test('AG-12 (1) / design 6: dist-relay/grs-relay.mjs is the same JavaScript as the bundle\'s server/grs-relay.mjs', () => {
  expect(Buffer.compare(bundled().get(SERVER_ENTRY) ?? Buffer.alloc(0), built(RELAY_JS))).toBe(0)
})

test('AG-12 (1) / design 3.2: the built relay, run on node, serves dist/index.html at GET / and speaks MCP on stdout', async () => {
  test.setTimeout(STARTUP_WAIT_MS * 2)
  built(RELAY_JS)
  const relay: ChildProcess = spawn(process.execPath, [RELAY_JS], { stdio: ['pipe', 'pipe', 'pipe'] })
  try {
    const pageUrl = await new Promise<string>((resolve, reject) => {
      let told = ''
      const timer = setTimeout(() => reject(new Error(`no page URL on stderr: ${told}`)), STARTUP_WAIT_MS)
      relay.stderr?.on('data', (chunk: Buffer) => {
        told += chunk.toString('utf8')
        const found = /http:\/\/127\.0\.0\.1:\d+\/#[A-Za-z0-9_-]+/.exec(told)
        if (found !== null) {
          clearTimeout(timer)
          resolve(found[0])
        }
      })
      relay.on('exit', (code) => reject(new Error(`the relay exited with ${String(code)}: ${told}`)))
    })
    const port = Number(/:(\d+)\//.exec(pageUrl)?.[1])
    const body = await new Promise<{ status: number; bytes: Buffer }>((resolve, reject) => {
      const asked = httpRequest({ host: '127.0.0.1', port, path: '/', method: 'GET', agent: false }, (answer) => {
        const parts: Buffer[] = []
        answer.on('data', (chunk: Buffer) => parts.push(chunk))
        answer.on('end', () => resolve({ status: answer.statusCode ?? 0, bytes: Buffer.concat(parts) }))
      })
      asked.on('error', reject)
      asked.end()
    })
    expect(body.status).toBe(200)
    expect(Buffer.compare(body.bytes, built(PAGE))).toBe(0)

    const firstLine = new Promise<string>((resolve, reject) => {
      let held = ''
      const timer = setTimeout(() => reject(new Error(`no line on stdout: ${held}`)), STARTUP_WAIT_MS)
      relay.stdout?.on('data', (chunk: Buffer) => {
        held += chunk.toString('utf8')
        const at = held.indexOf('\n')
        if (at >= 0) {
          clearTimeout(timer)
          resolve(held.slice(0, at))
        }
      })
    })
    relay.stdin?.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { capabilities: {} } })}\n`)
    const answer = JSON.parse(await firstLine) as { id?: number; result?: { serverInfo?: { name?: string } } }
    expect(answer.id).toBe(1)
    expect(answer.result?.serverInfo?.name).toBe('grs-relay')
  } finally {
    relay.kill()
  }
})

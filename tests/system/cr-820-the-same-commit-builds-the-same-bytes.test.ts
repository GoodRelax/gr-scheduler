// CR-820 spec-only tests (design-mcp-relay section 6): the same commit builds the same bytes; the demo zip carries serverSyncDemoBuiltAt.

import { expect, test } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { inflateRawSync } from 'node:zlib'

const PAGE = join(process.cwd(), 'dist', 'index.html')
const DEMO_ZIP = join(process.cwd(), 'dist-server-sync-demo', 'grs-server-sync-demo.zip')
const BUNDLE = join(process.cwd(), 'dist-relay', 'grs-relay.mcpb')
const DEMO_BUILD = join(process.cwd(), 'demo', 'server-sync', 'build-demo.mjs')
const VERSIONS_FILE = join(process.cwd(), 'tools', 'artifact-versions.json')
const RELAY_VERSION_TOOL = join(process.cwd(), 'tools', 'relay_version.mjs')

const END_OF_CENTRAL_DIRECTORY = 0x06054b50
const CENTRAL_ENTRY = 0x02014b50
const LOCAL_ENTRY = 0x04034b50
const STORED = 0
const DEFLATED = 8

interface ZipEntry {
  readonly name: string
  readonly centralDate: number
  readonly centralTime: number
  readonly localDate: number
  readonly localTime: number
  readonly data: Buffer
}

// WHY: a minimal reader instead of a zip library -- the repository has none; entries stay in central-directory order.
function entriesOf(bytes: Buffer): ZipEntry[] {
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
  const entries: ZipEntry[] = []
  for (let i = 0; i < count; i++) {
    if (bytes.readUInt32LE(at) !== CENTRAL_ENTRY) throw new Error(`not a zip: bad central entry ${String(i)}`)
    const method = bytes.readUInt16LE(at + 10)
    const centralTime = bytes.readUInt16LE(at + 12)
    const centralDate = bytes.readUInt16LE(at + 14)
    const packedSize = bytes.readUInt32LE(at + 20)
    const nameLength = bytes.readUInt16LE(at + 28)
    const extraLength = bytes.readUInt16LE(at + 30)
    const commentLength = bytes.readUInt16LE(at + 32)
    const localAt = bytes.readUInt32LE(at + 42)
    const name = bytes.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    at += 46 + nameLength + extraLength + commentLength
    if (bytes.readUInt32LE(localAt) !== LOCAL_ENTRY) throw new Error(`not a zip: bad local entry ${name}`)
    const localTime = bytes.readUInt16LE(localAt + 10)
    const localDate = bytes.readUInt16LE(localAt + 12)
    const dataAt = localAt + 30 + bytes.readUInt16LE(localAt + 26) + bytes.readUInt16LE(localAt + 28)
    const packed = bytes.subarray(dataAt, dataAt + packedSize)
    let data: Buffer
    if (method === STORED) data = Buffer.from(packed)
    else if (method === DEFLATED) data = inflateRawSync(packed)
    else throw new Error(`zip entry ${name} uses method ${String(method)}`)
    entries.push({ name, centralDate, centralTime, localDate, localTime, data })
  }
  return entries
}

// WHY: the DOS date and time hold calendar fields with no zone, so decoded as written they are UTC; seconds are kept in 2-second steps.
function dosToIso(date: number, time: number): string {
  const two = (n: number): string => String(n).padStart(2, '0')
  const year = 1980 + (date >> 9)
  const month = (date >> 5) & 0xf
  const day = date & 0x1f
  const hour = time >> 11
  const minute = (time >> 5) & 0x3f
  const second = (time & 0x1f) * 2
  return `${String(year)}-${two(month)}-${two(day)}T${two(hour)}:${two(minute)}:${two(second)}Z`
}

// WHY: a DOS time cannot hold an odd second, so the spec's rounding is down to the even second.
function roundedDownToEven(builtAt: string): string {
  const seconds = Number(builtAt.slice(17, 19))
  return `${builtAt.slice(0, 17)}${String(seconds - (seconds % 2)).padStart(2, '0')}Z`
}

function buildDemo(): Buffer {
  const done = spawnSync(process.execPath, [DEMO_BUILD], { cwd: process.cwd(), encoding: 'utf8' })
  if (done.status !== 0) throw new Error(`build-demo.mjs exited with ${String(done.status)}: ${done.stdout}${done.stderr}`)
  if (!existsSync(DEMO_ZIP)) throw new Error(`build-demo.mjs left no ${DEMO_ZIP}`)
  return readFileSync(DEMO_ZIP)
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex')

function demoBuiltAt(): string {
  return (JSON.parse(readFileSync(VERSIONS_FILE, 'utf8')) as { serverSyncDemoBuiltAt: string }).serverSyncDemoBuiltAt
}

const NO_PAGE = 'dist/index.html is missing: run `npm run build` first (the demo zip carries the built page)'

test.describe('CR-820 the same commit builds the same bytes', () => {
  test.skip(!existsSync(PAGE), NO_PAGE)
  test.describe.configure({ mode: 'serial' })

  let first: Buffer = Buffer.alloc(0)
  let second: Buffer = Buffer.alloc(0)

  test.beforeAll(() => {
    test.setTimeout(120_000)
    first = buildDemo()
    second = buildDemo()
  })

  test('design 6 / CR-820: building the demo twice gives the same SHA-256 of grs-server-sync-demo.zip', () => {
    expect(first.length).toBeGreaterThan(0)
    expect(sha256(second)).toBe(sha256(first))
  })

  test('design 6 / CR-820: every zip entry carries serverSyncDemoBuiltAt (UTC, seconds rounded down to even), never the build time', () => {
    const wanted = roundedDownToEven(demoBuiltAt())
    const entries = entriesOf(first)
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(dosToIso(entry.centralDate, entry.centralTime), `central ${entry.name}`).toBe(wanted)
      expect(dosToIso(entry.localDate, entry.localTime), `local ${entry.name}`).toBe(wanted)
    }
  })

  test('design 6 / CR-820: the entries come in the same order, with the same bytes each, in both builds', () => {
    const a = entriesOf(first)
    const b = entriesOf(second)
    expect(b.map((entry) => entry.name)).toEqual(a.map((entry) => entry.name))
    expect(b.map((entry) => sha256(entry.data))).toEqual(a.map((entry) => sha256(entry.data)))
  })
})

test('design 6 / CR-820: the built grs-relay.mcpb manifest version is buildVersion().semver of tools/artifact-versions.json', async () => {
  test.skip(!existsSync(BUNDLE), 'dist-relay/grs-relay.mcpb is missing: run `npm run build:relay` first')
  const tool = (await import(pathToFileURL(RELAY_VERSION_TOOL).href)) as { buildVersion: () => { builtAt: string; semver: string } }
  const wanted = tool.buildVersion()
  const manifestEntry = entriesOf(readFileSync(BUNDLE)).find((entry) => entry.name === 'manifest.json')
  expect(manifestEntry).toBeDefined()
  const manifest = JSON.parse((manifestEntry?.data ?? Buffer.alloc(0)).toString('utf8')) as { version?: string; description?: string }
  expect(manifest.version).toBe(wanted.semver)
  expect(manifest.description?.startsWith(`Built ${wanted.builtAt}.`)).toBe(true)
})

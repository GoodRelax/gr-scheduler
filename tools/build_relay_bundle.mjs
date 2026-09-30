// Pack the MCP relay into the bundle an AI app installs (FR-150, AG-12 (1)).
//
//     npm run build && npm run build:relay
//
// `npm run build:relay` first builds dist-relay/grs-relay.mjs with vite.relay.config.ts
// (the relay in one ESM file, the page bytes inside it), then runs this script,
// which writes, beside it:
//
//   dist-relay/grs-relay.mcpb         a zip: manifest.json, server/grs-relay.mjs and
//                               index.html (dist/index.html byte for byte)
//   dist-relay/grs-relay.mcpb.sha256  its SHA-256, in the `sha256sum` line format
//
// docs/spec/_assets/design-mcp-relay.md section 6 settles the contents. The
// bundle is not signed (the user's ruling). Node built-ins only: the zip writer
// below stores each entry deflated, with a fixed timestamp so two builds of the
// same inputs give the same bytes.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
// WHY: not dist/ -- dist/ holds the one .html the app is (CN-1, NFR-004); the relay is a second deliverable.
const RELAY_DIST = join(ROOT, 'dist-relay')
const PAGE_HTML = join(ROOT, 'dist', 'index.html')
const RELAY_JS = join(RELAY_DIST, 'grs-relay.mjs')
const BUNDLE = join(RELAY_DIST, 'grs-relay.mcpb')
const BUNDLE_SHA256 = join(RELAY_DIST, 'grs-relay.mcpb.sha256')
const TOOL_DESCRIPTIONS = join(ROOT, 'src', 'adapter', 'mcp-tool-translator', 'mcp-tool-descriptions.json')
const PACKAGE_JSON = join(ROOT, 'package.json')

const BUNDLE_NAME = 'grs-relay.mcpb'
const SERVER_ENTRY = 'server/grs-relay.mjs'
const MANIFEST_VERSION = '0.3'
const OLDEST_NODE = '>=18.0.0'

// Zip format constants (APPNOTE.TXT).
const LOCAL_HEADER_SIGNATURE = 0x04034b50
const CENTRAL_HEADER_SIGNATURE = 0x02014b50
const END_OF_CENTRAL_SIGNATURE = 0x06054b50
const VERSION_NEEDED = 20
const METHOD_DEFLATE = 8
const LOCAL_HEADER_BYTES = 30
const CENTRAL_HEADER_BYTES = 46
const END_OF_CENTRAL_BYTES = 22
// 1980-01-01 00:00, the earliest MS-DOS date a zip entry can carry.
const DOS_TIME = 0
const DOS_DATE = (0 << 9) | (1 << 5) | 1
const DEFLATE_LEVEL = 9
const CRC32_POLYNOMIAL = 0xedb88320
const BYTE_VALUES = 256
const BITS_PER_BYTE = 8

function fail(message) {
  process.stderr.write(`build_relay_bundle: ${message}\n`)
  process.exit(1)
}

const CRC32_TABLE = Array.from({ length: BYTE_VALUES }, (_unused, byte) => {
  let value = byte
  for (let bit = 0; bit < BITS_PER_BYTE; bit += 1) {
    value = value & 1 ? CRC32_POLYNOMIAL ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32Of(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> BITS_PER_BYTE)
  return (crc ^ 0xffffffff) >>> 0
}

function zipOf(entries) {
  const parts = []
  const centrals = []
  let offset = 0
  for (const { name, bytes } of entries) {
    const nameBytes = Buffer.from(name, 'utf8')
    const packed = deflateRawSync(bytes, { level: DEFLATE_LEVEL })
    const crc = crc32Of(bytes)
    const local = Buffer.alloc(LOCAL_HEADER_BYTES)
    local.writeUInt32LE(LOCAL_HEADER_SIGNATURE, 0)
    local.writeUInt16LE(VERSION_NEEDED, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(METHOD_DEFLATE, 8)
    local.writeUInt16LE(DOS_TIME, 10)
    local.writeUInt16LE(DOS_DATE, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(bytes.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    const central = Buffer.alloc(CENTRAL_HEADER_BYTES)
    central.writeUInt32LE(CENTRAL_HEADER_SIGNATURE, 0)
    central.writeUInt16LE(VERSION_NEEDED, 4)
    central.writeUInt16LE(VERSION_NEEDED, 6)
    local.copy(central, 8, 6, 28)
    central.writeUInt32LE(offset, 42)
    parts.push(local, nameBytes, packed)
    centrals.push(central, nameBytes)
    offset += local.length + nameBytes.length + packed.length
  }
  const centralBytes = Buffer.concat(centrals)
  const end = Buffer.alloc(END_OF_CENTRAL_BYTES)
  end.writeUInt32LE(END_OF_CENTRAL_SIGNATURE, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBytes.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, centralBytes, end])
}

function manifestOf() {
  const { version } = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'))
  const { tools } = JSON.parse(readFileSync(TOOL_DESCRIPTIONS, 'utf8'))
  return {
    manifest_version: MANIFEST_VERSION,
    name: 'grs-relay',
    display_name: 'GRS relay',
    version,
    description:
      'Lets an AI app call the Agent API of a GoodRelax Scheduler page. The relay serves the ' +
      'page on 127.0.0.1 and carries each tool call to it; the page stays the only copy of the document.',
    author: { name: 'gr-scheduler contributors' },
    server: {
      type: 'node',
      entry_point: SERVER_ENTRY,
      mcp_config: { command: 'node', args: [`\${__dirname}/${SERVER_ENTRY}`] },
    },
    tools: tools.map(({ name, description }) => ({ name, description })),
    compatibility: { runtimes: { node: OLDEST_NODE } },
  }
}

function main() {
  if (!existsSync(PAGE_HTML)) fail('dist/index.html is missing -- run `npm run build` first')
  if (!existsSync(RELAY_JS)) fail('dist-relay/grs-relay.mjs is missing -- run `npm run build:relay`, not this script alone')
  const manifest = `${JSON.stringify(manifestOf(), null, 2)}\n`
  const bundle = zipOf([
    { name: 'manifest.json', bytes: Buffer.from(manifest, 'utf8') },
    { name: SERVER_ENTRY, bytes: readFileSync(RELAY_JS) },
    { name: 'index.html', bytes: readFileSync(PAGE_HTML) },
  ])
  writeFileSync(BUNDLE, bundle)
  const digest = createHash('sha256').update(bundle).digest('hex')
  writeFileSync(BUNDLE_SHA256, `${digest}  ${BUNDLE_NAME}\n`)
  process.stdout.write(`wrote dist-relay/${BUNDLE_NAME} (${bundle.length} bytes, sha256 ${digest})\n`)
}

main()

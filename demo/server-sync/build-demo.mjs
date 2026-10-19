// Builds the GRS server-sync demo folder from the built GRS (npm run build:demo).
//
//   dist-server-sync-demo/grs-server-sync-demo/
//     GRS-Demo.html           dist/index.html with app/demo-client.js put in front of the GRS script
//     start-server.cmd        double-click to start the server and open the page
//     server/grs-demo-server.ps1
//     schedule-data/*.json    the three GRS JSON samples (JDG-2585)
//     README.md, README-ja.md, DEMO-SERVER-API.md, DEMO-SERVER-API-ja.md
//   dist-server-sync-demo/grs-server-sync-demo.zip   the same folder, packed for download
//
// dist/index.html is only read, never written: the demo is GRS byte for byte plus one script.
// The page's Content-Security-Policy pins script-src to hashes, so the demo script's hash is
// added to it here (the same hashing as vite.config.ts: the element's text with CRLF as LF).
// Uses node: built-ins only, so it runs without node_modules.

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { artifactBuiltAt } from '../../tools/relay_version.mjs'

const DEMO_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(DEMO_DIR, '..', '..')
const GRS_PAGE = join(ROOT, 'dist', 'index.html')
const FOLDER_NAME = 'grs-server-sync-demo'
const OUT_DIR = join(ROOT, 'dist-server-sync-demo', FOLDER_NAME)
// The file people download (DFC-3071): the folder above, packed with the folder itself at its top.
const ZIP_FILE = join(ROOT, 'dist-server-sync-demo', `${FOLDER_NAME}.zip`)
// The third sample comes from sample-schedule/ at build time rather than as a second copy here.
const SHARED_SAMPLES = [join(ROOT, 'sample-schedule', 'Three-Year Product Plan.json')]

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

// ---- a minimal zip writer (deflate, UTF-8 names), so the build needs no zip tool on any OS ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

// DOS date and time every entry carries: the time the demo's inputs last changed, in UTC
// (tools/artifact-versions.json, CR-820), never the time of the build -- so the same commit
// always packs the same bytes, on any machine and in any time zone.
function dosStamp(at) {
  const time = (at.getUTCHours() << 11) | (at.getUTCMinutes() << 5) | Math.floor(at.getUTCSeconds() / 2)
  const date = ((at.getUTCFullYear() - 1980) << 9) | ((at.getUTCMonth() + 1) << 5) | at.getUTCDate()
  return { time, date }
}

function filesUnder(folder, prefix) {
  const found = []
  for (const entry of readdirSync(folder, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const path = join(folder, entry.name)
    const name = `${prefix}/${entry.name}`
    if (entry.isDirectory()) found.push(...filesUnder(path, name))
    else found.push({ path, name })
  }
  return found
}

function zipOfFolder(folder, topName) {
  const { time, date } = dosStamp(new Date(artifactBuiltAt('serverSyncDemoBuiltAt')))
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of filesUnder(folder, topName)) {
    const name = Buffer.from(file.name, 'utf8')
    const raw = readFileSync(file.path)
    const packed = deflateRawSync(raw, { level: 9 })
    const crc = crc32(raw)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt16LE(time, 10)
    local.writeUInt16LE(date, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(time, 12)
    central.writeUInt16LE(date, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(packed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, packed)
    centrals.push(central, name)
    offset += local.length + name.length + packed.length
  }
  const centralBytes = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(centrals.length / 2, 8)
  end.writeUInt16LE(centrals.length / 2, 10)
  end.writeUInt32LE(centralBytes.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBytes, end])
}

function fail(message) {
  console.error(`build-demo: ${message}`)
  process.exit(1)
}

const grsBytes = readFileSync(GRS_PAGE)
const grsHtml = grsBytes.toString('utf8')
const demoScript = readFileSync(join(DEMO_DIR, 'app', 'demo-client.js'), 'utf8').replace(/\r\n?/g, '\n')
if (demoScript.includes('</script')) fail('demo-client.js holds "</script", which would end the element early')
if (demoScript.includes('\u0000')) fail('demo-client.js holds a NUL; the parser rewrites it and the hash breaks')

const demoHash = `'sha256-${createHash('sha256').update(demoScript, 'utf8').digest('base64')}'`

// Exactly one CSP meta with a script-src list, and one inline module script (the GRS program).
const cspPattern = /(<meta http-equiv="Content-Security-Policy" content="[^"]*script-src )([^;"]*)/
if (!cspPattern.test(grsHtml)) fail('dist/index.html has no Content-Security-Policy with script-src; run npm run build first')
const moduleTag = '<script type="module">'
const moduleAt = grsHtml.indexOf(moduleTag)
if (moduleAt < 0 || grsHtml.indexOf(moduleTag, moduleAt + 1) >= 0) fail('expected exactly one inline module script in dist/index.html')

// Module scripts run in document order, so the demo script runs before GRS boots.
const withScript = `${grsHtml.slice(0, moduleAt)}${moduleTag}${demoScript}</script>${grsHtml.slice(moduleAt)}`
const demoHtml = withScript.replace(cspPattern, (_all, head, sources) => `${head}${sources} ${demoHash}`)

rmSync(OUT_DIR, { recursive: true, force: true })
mkdirSync(join(OUT_DIR, 'server'), { recursive: true })
mkdirSync(join(OUT_DIR, 'schedule-data'), { recursive: true })

writeFileSync(join(OUT_DIR, 'GRS-Demo.html'), demoHtml, 'utf8')
copyFileSync(join(DEMO_DIR, 'server', 'grs-demo-server.ps1'), join(OUT_DIR, 'server', 'grs-demo-server.ps1'))
// What a receiver reads (JDG-2599); the developer notes stay in the repository.
for (const doc of ['README.md', 'README-ja.md', 'DEMO-SERVER-API.md', 'DEMO-SERVER-API-ja.md']) {
  copyFileSync(join(DEMO_DIR, doc), join(OUT_DIR, doc))
}
// cmd.exe reads a batch file line by line and wants CRLF; the repository keeps LF (.gitattributes).
const startCmd = readFileSync(join(DEMO_DIR, 'start-server.cmd'), 'utf8').replace(/\r?\n/g, '\r\n')
writeFileSync(join(OUT_DIR, 'start-server.cmd'), startCmd, 'utf8')

const sampleDir = join(DEMO_DIR, 'schedule-data')
const samples = [
  ...readdirSync(sampleDir).filter((name) => name.endsWith('.json')).map((name) => join(sampleDir, name)),
  ...SHARED_SAMPLES,
]
for (const sample of samples) copyFileSync(sample, join(OUT_DIR, 'schedule-data', sample.split(/[\\/]/).pop()))

writeFileSync(ZIP_FILE, zipOfFolder(OUT_DIR, FOLDER_NAME))

// The proof the demo leaves GRS alone: dist/index.html after the build is the bytes read before it.
const grsAfter = readFileSync(GRS_PAGE)
if (!grsAfter.equals(grsBytes)) fail('dist/index.html changed during the build')

console.log(`dist/index.html          sha256 ${sha256Hex(grsBytes)} (unchanged)`)
console.log(`GRS-Demo.html            sha256 ${sha256Hex(Buffer.from(demoHtml, 'utf8'))}`)
console.log(`demo script hash added   ${demoHash}`)
console.log(`schedule-data            ${samples.length} files`)
console.log(`built                    dist-server-sync-demo/${FOLDER_NAME}/  (start: start-server.cmd)`)
console.log(`zip                      dist-server-sync-demo/${FOLDER_NAME}.zip  (${readFileSync(ZIP_FILE).length} bytes)`)

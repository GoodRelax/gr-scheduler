// Builds the GRS server-sync demo folder from the built GRS (npm run build:demo).
//
//   dist-demo/grs-server-sync-demo/
//     GRS-Demo.html           dist/index.html with app/demo-client.js put in front of the GRS script
//     start-server.cmd        double-click to start the server and open the page
//     server/grs-demo-server.ps1
//     schedule-data/*.json    the three GRS JSON samples (JDG-2585)
//     README-ja.md
//
// dist/index.html is only read, never written: the demo is GRS byte for byte plus one script.
// The page's Content-Security-Policy pins script-src to hashes, so the demo script's hash is
// added to it here (the same hashing as vite.config.ts: the element's text with CRLF as LF).
// Uses node: built-ins only, so it runs without node_modules.

import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEMO_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(DEMO_DIR, '..', '..')
const GRS_PAGE = join(ROOT, 'dist', 'index.html')
const OUT_DIR = join(ROOT, 'dist-demo', 'grs-server-sync-demo')
// The third sample comes from sample-schedule/ at build time rather than as a second copy here.
const SHARED_SAMPLES = [join(ROOT, 'sample-schedule', 'Three-Year Product Plan.json')]

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
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
copyFileSync(join(DEMO_DIR, 'README-ja.md'), join(OUT_DIR, 'README-ja.md'))
// cmd.exe reads a batch file line by line and wants CRLF; the repository keeps LF (.gitattributes).
const startCmd = readFileSync(join(DEMO_DIR, 'start-server.cmd'), 'utf8').replace(/\r?\n/g, '\r\n')
writeFileSync(join(OUT_DIR, 'start-server.cmd'), startCmd, 'utf8')

const sampleDir = join(DEMO_DIR, 'schedule-data')
const samples = [
  ...readdirSync(sampleDir).filter((name) => name.endsWith('.json')).map((name) => join(sampleDir, name)),
  ...SHARED_SAMPLES,
]
for (const sample of samples) copyFileSync(sample, join(OUT_DIR, 'schedule-data', sample.split(/[\\/]/).pop()))

// The proof the demo leaves GRS alone: dist/index.html after the build is the bytes read before it.
const grsAfter = readFileSync(GRS_PAGE)
if (!grsAfter.equals(grsBytes)) fail('dist/index.html changed during the build')

console.log(`dist/index.html          sha256 ${sha256Hex(grsBytes)} (unchanged)`)
console.log(`GRS-Demo.html            sha256 ${sha256Hex(Buffer.from(demoHtml, 'utf8'))}`)
console.log(`demo script hash added   ${demoHash}`)
console.log(`schedule-data            ${samples.length} files`)
console.log(`built                    dist-demo/grs-server-sync-demo/  (start: start-server.cmd)`)

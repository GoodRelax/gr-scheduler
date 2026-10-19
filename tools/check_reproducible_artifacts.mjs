// Build each published artifact twice and require the same bytes (CR-820).
//
//     node tools/check_reproducible_artifacts.mjs
//
// Builds grs-relay.mcpb (vite relay build + tools/build_relay_bundle.mjs) and
// grs-server-sync-demo.zip (demo/server-sync/build-demo.mjs) twice from the dist/index.html
// on disk, and is red when a SHA-256 differs between the two runs: then something other than
// the inputs (a clock, a locale, an order) reached the bytes. Both builds read their version
// from tools/artifact-versions.json, so a docs-only commit cannot move them either.
// Needs dist/index.html; run it after `npm run build`, as the gate does.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ARTIFACTS = [
  { name: 'grs-relay.mcpb', path: join(ROOT, 'dist-relay', 'grs-relay.mcpb'), build: buildRelay },
  { name: 'grs-server-sync-demo.zip', path: join(ROOT, 'dist-server-sync-demo', 'grs-server-sync-demo.zip'), build: buildDemo },
]

/** @purity semi-pure-b */
function viteCli() {
  for (let at = ROOT; ; at = dirname(at)) {
    const cli = join(at, 'node_modules', 'vite', 'bin', 'vite.js')
    if (existsSync(cli)) return cli
    if (dirname(at) === at) throw new Error('check_reproducible_artifacts: no node_modules/vite above the tree')
  }
}

/** @purity non-pure */
function node(args) {
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })
}

/** @purity non-pure */
function buildRelay() {
  node([viteCli(), 'build', '--config', 'vite.relay.config.ts', '--logLevel', 'error'])
  node([join('tools', 'build_relay_bundle.mjs')])
}

/** @purity non-pure */
function buildDemo() {
  node([join('demo', 'server-sync', 'build-demo.mjs')])
}

/** @purity semi-pure-b */
function sha256Of(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** @purity non-pure */
function main() {
  if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
    process.stderr.write('check_reproducible_artifacts: dist/index.html is missing -- run npm run build first\n')
    return 2
  }
  let failed = 0
  for (const one of ARTIFACTS) {
    one.build()
    const first = sha256Of(one.path)
    one.build()
    const second = sha256Of(one.path)
    const isSame = first === second
    if (!isSame) failed += 1
    process.stdout.write(`${isSame ? 'OK      ' : 'FAIL    '} ${one.name}  ${first.slice(0, 8)}${isSame ? '' : ` then ${second.slice(0, 8)}`}\n`)
  }
  return failed === 0 ? 0 : 1
}

process.exit(main())

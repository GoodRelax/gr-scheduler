// Comparator runner: node run.mjs <checkout-root> <part> <out-file> [--coverage <dir>]
//
// part: frame-loop | input-command-translator | mspdi-codec | capture-translator
//
// Copies the kit's src/ into <checkout-root>/tests/unit/zz-comparator/, runs that part's file with the
// vitest of the repository root that owns node_modules (COMPARATOR_NODE_ROOT, default below), with
// cwd = <checkout-root>, and removes the copied folder afterwards even on failure.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = dirname(fileURLToPath(import.meta.url))
// The nearest ancestor of the kit that holds node_modules/vitest (a worktree has none of its own).
function nearestNodeRoot(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'node_modules', 'vitest'))) return dir
    if (dirname(dir) === dir) throw new Error('no node_modules/vitest above ' + from)
  }
}
const NODE_ROOT = process.env.COMPARATOR_NODE_ROOT ?? nearestNodeRoot(KIT)
const PARTS = {
  'frame-loop': 'src/framework/single-html-shell/frame-loop.ts',
  'input-command-translator': 'src/adapter/input-command-translator/input-command-translator.ts',
  'mspdi-codec': 'src/adapter/document-codec/mspdi-codec.ts',
  'capture-translator': 'src/framework/single-html-shell/frame-loop.ts',
}

const args = process.argv.slice(2)
const coverageAt = args.indexOf('--coverage')
const coverageDir = coverageAt >= 0 ? resolve(args[coverageAt + 1] ?? '') : null
if (coverageAt >= 0) args.splice(coverageAt, 2)
const [rootArg, part, outArg] = args
if (rootArg === undefined || part === undefined || outArg === undefined || !(part in PARTS)) {
  console.error('usage: node run.mjs <checkout-root> <' + Object.keys(PARTS).join('|') + '> <out-file> [--coverage <dir>]')
  process.exit(2)
}
const root = resolve(rootArg)
const out = resolve(outArg)
if (!existsSync(join(root, PARTS[part]))) {
  console.error('not a checkout of this repository (missing ' + PARTS[part] + '): ' + root)
  process.exit(2)
}
const copied = join(root, 'tests', 'unit', 'zz-comparator')
if (existsSync(copied)) {
  console.error('refusing to run: ' + copied + ' already exists (left by an earlier run?)')
  process.exit(2)
}
mkdirSync(dirname(out), { recursive: true })

let status = 1
try {
  cpSync(join(KIT, 'src'), copied, { recursive: true })
  const vitestArgs = [
    join(NODE_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
    'run',
    'tests/unit/zz-comparator/' + part + '.cmp.test.ts',
    '--testTimeout=1800000',
    '--hookTimeout=600000',
    '--reporter=dot',
  ]
  if (coverageDir !== null) {
    vitestArgs.push(
      '--coverage.enabled=true',
      '--coverage.provider=v8',
      '--coverage.include=' + PARTS[part],
      '--coverage.reporter=json-summary',
      '--coverage.reporter=json',
      '--coverage.reporter=text',
      '--coverage.reportsDirectory=' + coverageDir,
      '--coverage.excludeAfterRemap=false',
    )
  }
  const run = spawnSync(process.execPath, vitestArgs, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      TZ: 'UTC',
      LANG: 'C',
      COMPARATOR_OUT: out,
      COMPARATOR_KIT: KIT,
      COMPARATOR_ROOT: root,
    },
  })
  status = run.status ?? 1
} finally {
  rmSync(copied, { recursive: true, force: true })
}
if (status === 0 && existsSync(out)) {
  const lines = readFileSync(out, 'utf8').split('\n').filter((line) => line.length > 0).length
  console.log(`comparator ${part}: ${lines} cases written to ${out}`)
}
process.exit(status)

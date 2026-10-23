// node tools/baseline.mjs <checkout-root> [part...]
// Runs each part twice into out/<part>.run1.txt / .run2.txt, checks the two are byte-identical (sha256 of
// the files), and copies run1 to baseline-<part>.txt.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = dirname(dirname(fileURLToPath(import.meta.url)))
const [root, ...asked] = process.argv.slice(2)
const parts = asked.length > 0 ? asked : ['frame-loop', 'input-command-translator', 'mspdi-codec']
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
let ok = true
for (const part of parts) {
  const outs = []
  for (const run of [1, 2]) {
    const out = join(KIT, 'out', `${part}.run${run}.txt`)
    const started = Date.now()
    const done = spawnSync(process.execPath, [join(KIT, 'run.mjs'), root, part, out], { encoding: 'utf8' })
    if (done.status !== 0) {
      console.log(done.stdout.slice(-4000), done.stderr.slice(-4000))
      throw new Error(`${part} run ${run} failed`)
    }
    const lines = readFileSync(out, 'utf8').split('\n').filter(Boolean).length
    console.log(`${part} run${run}: ${lines} cases, ${Math.round((Date.now() - started) / 1000)}s, sha256 ${digest(out)}`)
    outs.push(out)
  }
  const same = digest(outs[0]) === digest(outs[1])
  ok &&= same
  console.log(`${part}: runs byte-identical = ${same}`)
  if (same) copyFileSync(outs[0], join(KIT, `baseline-${part}.txt`))
}
process.exit(ok ? 0 : 1)

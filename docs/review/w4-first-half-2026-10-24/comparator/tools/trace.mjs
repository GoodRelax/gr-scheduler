// node tools/trace.mjs <checkout-root> <part> <case-id>[,<case-id>...] [regex]
// Runs only the named cases of a part with tracing on and prints the trace lines matching regex.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = dirname(dirname(fileURLToPath(import.meta.url)))
const [root, part, ids, pattern] = process.argv.slice(2)
const filter = pattern === undefined ? null : new RegExp(pattern)
for (const id of ids.split(',')) {
  const out = join(KIT, 'out', 'trace-one.txt')
  const run = spawnSync(process.execPath, [join(KIT, 'run.mjs'), root, part, out], {
    env: { ...process.env, COMPARATOR_ONLY: id, COMPARATOR_TRACE: id },
    encoding: 'utf8',
  })
  console.log(`== ${id} (exit ${run.status})`)
  if (run.status !== 0) console.log(run.stdout.slice(-3000), run.stderr.slice(-3000))
  const tracePath = out + '.trace'
  if (!existsSync(tracePath)) continue
  for (const line of readFileSync(tracePath, 'utf8').split('\n')) {
    if (filter === null || filter.test(line)) console.log(line.slice(0, 700))
  }
}

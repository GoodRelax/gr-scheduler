// node tools/sensitivity.mjs <checkout-root> <part> [break-id...]
// For each deliberate break of tools/breaks.json: write it into the checkout's source (the find string must
// occur exactly once), run the part, compare with baseline-<part>.txt, and restore the original bytes in a
// finally block. Results go to out/sensitivity-<part>.json and are printed as a table.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const KIT = dirname(dirname(fileURLToPath(import.meta.url)))
const [root, part, ...only] = process.argv.slice(2)
const spec = JSON.parse(readFileSync(join(KIT, 'tools', 'breaks.json'), 'utf8'))[part]
const file = join(root, spec.file)
const original = readFileSync(file)
const originalText = original.toString('utf8')
const eol = originalText.includes('\r\n') ? '\r\n' : '\n'
const read = (path) => new Map(readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => line.split(' ')))
const baseline = read(join(KIT, `baseline-${part}.txt`))
const results = []
for (const one of spec.breaks) {
  if (only.length > 0 && !only.includes(one.id)) continue
  const find = one.find.split('\n').join(eol)
  const replace = one.replace.split('\n').join(eol)
  const count = originalText.split(find).length - 1
  if (count !== 1) {
    results.push({ ...one, red: null, note: `find occurs ${count} times` })
    continue
  }
  const out = join(KIT, 'out', `sens-${part}-${one.id}.txt`)
  let red = null
  let changed = 0
  let missing = 0
  let added = 0
  let sample = []
  try {
    writeFileSync(file, originalText.replace(find, () => replace), "utf8")
    const run = spawnSync(process.execPath, [join(KIT, 'run.mjs'), root, part, out], { encoding: 'utf8' })
    if (run.status !== 0) {
      red = true
      sample = ['run failed: ' + (run.stdout + run.stderr).slice(-400).replace(/\s+/g, ' ')]
    } else {
      const other = read(out)
      for (const [id, digest] of baseline) {
        if (!other.has(id)) missing += 1
        else if (other.get(id) !== digest) {
          changed += 1
          if (sample.length < 4) sample.push(id)
        }
      }
      for (const id of other.keys()) if (!baseline.has(id)) added += 1
      red = changed + missing + added > 0
    }
  } finally {
    writeFileSync(file, original)
  }
  const restored = Buffer.compare(readFileSync(file), original) === 0
  results.push({ id: one.id, kind: one.kind, what: one.what, red, changed, missing, added, sample, restored })
  console.log(`${one.id} ${red ? 'RED' : 'green'} changed=${changed} missing=${missing} added=${added} restored=${restored} ${sample.join(' ')}`)
}
const reds = results.filter((r) => r.red === true).length
console.log(`${part}: ${reds}/${results.length} red`)
writeFileSync(join(KIT, 'out', `sensitivity-${part}${only.length > 0 ? '-' + only.join('-') : ''}.json`), JSON.stringify(results, null, 1))

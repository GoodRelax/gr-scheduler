// node tools/compare.mjs <baseline> <other>: cases whose digest differs, cases missing, cases added.
// Exit 0 when the two are identical, 1 otherwise (the comparator is red).
import { readFileSync } from 'node:fs'

const read = (file) => new Map(readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => line.split(' ')))
const [a, b] = process.argv.slice(2).map(read)
const changed = []
const missing = []
const added = []
for (const [id, digest] of a) {
  if (!b.has(id)) missing.push(id)
  else if (b.get(id) !== digest) changed.push(id)
}
for (const id of b.keys()) if (!a.has(id)) added.push(id)
console.log(`baseline ${a.size}, other ${b.size}, changed ${changed.length}, missing ${missing.length}, added ${added.length}`)
const show = Number(process.env.SHOW ?? 15)
if (changed.length > 0) console.log('changed:', changed.slice(0, show).join(' '))
if (missing.length > 0) console.log('missing:', missing.slice(0, show).join(' '))
if (added.length > 0) console.log('added:', added.slice(0, show).join(' '))
process.exit(changed.length + missing.length + added.length === 0 ? 0 : 1)

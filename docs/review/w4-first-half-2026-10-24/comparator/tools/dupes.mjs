// node tools/dupes.mjs <out-file>: digest groups shared by several cases (cases that recorded the same thing).
import { readFileSync } from 'node:fs'

const lines = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean)
const byDigest = new Map()
for (const line of lines) {
  const [id, digest] = line.split(' ')
  byDigest.set(digest, [...(byDigest.get(digest) ?? []), id])
}
const groups = [...byDigest.values()].filter((ids) => ids.length > 1).sort((a, b) => b.length - a.length)
console.log(`cases ${lines.length}, distinct digests ${byDigest.size}, shared groups ${groups.length}`)
for (const ids of groups.slice(0, Number(process.argv[3] ?? 15))) console.log(ids.length, ids.slice(0, 6).join(' '))

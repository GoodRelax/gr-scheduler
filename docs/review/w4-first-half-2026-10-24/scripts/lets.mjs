import { readFileSync } from 'node:fs'
const r = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const lets = r.inner.filter(m => m.isLet).map(m => m.names[0])
for (const l of lets) {
  const w = r.inner.filter(m => m.writes.includes(l) && m.names[0] !== l).map(m => m.names[0])
  const rd = r.inner.filter(m => m.reads.includes(l) && m.names[0] !== l).map(m => m.names[0])
  console.log(`LET ${l}\n  W: ${w.join(', ')}\n  R: ${rd.join(', ')}`)
}

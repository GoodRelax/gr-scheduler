import { readFileSync } from 'node:fs'
const r = JSON.parse(readFileSync(process.argv[2], 'utf8'))
for (const t of r.top) {
  const n = t.names[0]
  const byTop = r.top.filter(o => o.refs.includes(n)).map(o => o.names[0])
  const byInner = r.inner.filter(m => m.tops.includes(n)).map(m => m.names[0])
  console.log(`${t.a}-${t.b} ${t.names.join(',')} | top:${byTop.join(',')} | cl:${byInner.join(',')}`)
}

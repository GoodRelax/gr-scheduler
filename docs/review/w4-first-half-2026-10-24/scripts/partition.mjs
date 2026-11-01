// Assign every top-level statement and closure member of frame-loop.ts to a planned unit and sum lines.
// Lines of a statement = from the line after the previous statement end to its own end
// (leading comments and blank lines ride with the statement that follows them).
import { readFileSync, writeFileSync } from 'node:fs'
import { parseAst } from 'rolldown/parseAst'
const file = process.argv[2]
const map = JSON.parse(readFileSync(process.argv[3], 'utf8'))
const text = readFileSync(file, 'utf8')
const prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, file)
const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
const line = (off) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1 } return lo + 1 }
const U = {}, C = {}
for (const [unit, names] of Object.entries(map.top)) for (const n of names.split(/\s+/).filter(Boolean)) U[n] = unit
for (const [unit, names] of Object.entries(map.closure)) for (const n of names.split(/\s+/).filter(Boolean)) C[n] = unit
const RU = map.returnMembers
const out = { units: {}, unassigned: [] }
let cursor = 0
const lines = text.split('\n')
const isTagLine = (t) => /^(\/\*\*|\*|\/\/)?\s*@purity\s+[a-z-]+\s*(\*\/)?$/.test(t)
const isCommentLine = (t) => /^(\/\/|\/\*|\*)/.test(t)
const add = (u, n, k) => {
  const o = (out.units[u] ??= { lines: 0, items: [], code: 0, comment: 0 })
  o.lines += n; o.items.push(k + ':' + n)
  for (let i = cursor; i < cursor + n; i++) {
    const t = (lines[i] ?? '').trim()
    if (t === '' || isTagLine(t)) continue
    if (isCommentLine(t)) o.comment++
    else { o.code++; if (/\s\/\/\s/.test(t)) o.comment++ }
  }
  cursor += n
}
let prevEnd = 0
const genStart = text.split('\n').findIndex((l) => l.includes('<generated -- do not edit by hand>')) + 1
for (const s of prog.body) {
  const a = line(s.start), b = line(s.end)
  const d = s.declaration || s
  let names = []
  if (d.id && d.id.name) names = [d.id.name]
  else if (d.declarations) names = d.declarations.map((x) => x.id.name || '{..}')
  const span = prevEnd + 1
  const n = b - prevEnd
  prevEnd = b
  if (genStart > 0 && a > genStart) { add('GEN', n, names[0]); continue }
  if (s.type === 'ImportDeclaration' || (s.type.startsWith('Export') && s.source)) { add('IMPORTS', n, 'imp'); continue }
  if (names[0] === 'frameLoop') {
    let pe = line(d.body.start)
    add('E', pe - span + 1, 'frameLoop-head')
    for (const m of d.body.body) {
      const mb = line(m.end)
      let mn = m.id?.name ?? (m.declarations ? (m.declarations[0].id.name ?? '{' + line(m.start) + '}') : (m.type === 'ReturnStatement' ? '<return>' : '<' + m.type + '>'))
      const len = mb - pe
      const before = pe
      pe = mb
      if (mn === '<return>') {
        let rpe = line(m.argument.start)
        add('E', rpe - before, 'return-head')
        for (const p of m.argument.properties) {
          const pb = line(p.end); const key = p.key?.name ?? '?'
          add(RU[key] ?? 'E', pb - rpe, 'ret.' + key); rpe = pb
        }
        add('E', mb - rpe, 'return-tail')
        continue
      }
      const u = C[mn]
      if (!u) out.unassigned.push('@' + mn)
      add(u ?? '?', len, '@' + mn)
    }
    add('E', b - pe, 'frameLoop-tail')
    continue
  }
  const u = U[names[0]]
  if (!u) out.unassigned.push(names.join(','))
  add(u ?? '?', n, names[0])
}
for (const [u, v] of Object.entries(out.units).sort((x, y) => y[1].lines - x[1].lines)) console.log(u.padEnd(8), String(v.lines).padStart(5), 'code', String(v.code).padStart(4), 'comment', String(v.comment).padStart(4), 'cap', Math.floor(v.code / 9), v.code >= 100 && v.comment > Math.floor(v.code / 9) ? 'OVER' : '')
console.log('unassigned', out.unassigned.join(' '))
writeFileSync(process.argv[4], JSON.stringify(out, null, 1))

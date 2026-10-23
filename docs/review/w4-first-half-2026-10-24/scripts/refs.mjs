// Reference graph of frame-loop.ts: top-level decls and closure members.
import { readFileSync, writeFileSync } from 'node:fs'
import { parseAst } from 'rolldown/parseAst'
const file = process.argv[2], out = process.argv[3]
const text = readFileSync(file, 'utf8')
const prog = parseAst(text, { lang: 'ts', sourceType: 'module' }, file)
const starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
const line = off => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= off) lo = m; else hi = m - 1 } return lo + 1 }
function namesOf(s) {
  const d = s.type.startsWith('Export') && s.declaration ? s.declaration : s
  if (d.id && d.id.name) return [d.id.name]
  if (d.declarations) { const r = []; for (const x of d.declarations) collectPat(x.id, r); return r }
  return []
}
function collectPat(p, r) { if (!p) return; if (p.type === 'Identifier') r.push(p.name); else if (p.type === 'ObjectPattern') for (const q of p.properties) collectPat(q.value ?? q.argument, r); else if (p.type === 'ArrayPattern') for (const q of p.elements) collectPat(q, r); else if (p.type === 'RestElement') collectPat(p.argument, r); else if (p.type === 'AssignmentPattern') collectPat(p.left, r) }
// walk collecting identifier uses: {name, write}
function uses(node, acc) {
  const visit = (n, parent, key) => {
    if (!n || typeof n !== 'object') return
    if (Array.isArray(n)) { for (const x of n) visit(x, parent, key); return }
    if (n.type === 'Identifier' || n.type === 'JSXIdentifier') {
      if (parent && (parent.type === 'MemberExpression' && key === 'property' && !parent.computed)) return
      if (parent && (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)) return
      if (parent && parent.type === 'TSPropertySignature' && key === 'key') return
      if (parent && (parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') && key === 'key') return
      let write = false
      if (parent && (parent.type === 'AssignmentExpression' && key === 'left')) write = true
      if (parent && parent.type === 'UpdateExpression') write = true
      acc.push({ name: n.name, write, line: line(n.start) })
      return
    }
    for (const k of Object.keys(n)) { if (k === 'start' || k === 'end' || k === 'type') continue; const v = n[k]; if (v && typeof v === 'object') visit(v, n, k) }
  }
  visit(node, null, null)
  return acc
}
const top = []
for (const s of prog.body) {
  const ns = namesOf(s); if (!ns.length) continue
  top.push({ names: ns, a: line(s.start), b: line(s.end), node: s, kind: (s.declaration || s).type })
}
const topName = new Map(); for (const t of top) for (const n of t.names) topName.set(n, t)
const res = { top: [], inner: [] }
for (const t of top) {
  if (t.names[0] === 'frameLoop') continue
  const u = uses(t.node, []).filter(x => topName.has(x.name) && !t.names.includes(x.name))
  res.top.push({ names: t.names, a: t.a, b: t.b, kind: t.kind, refs: [...new Set(u.map(x => x.name))] })
}
// closure
const fl = top.find(t => t.names[0] === 'frameLoop').node
const fd = fl.declaration || fl
const params = fd.params.map(p => p.name ?? p.left?.name)
const members = []
for (const s of fd.body.body) {
  const ns = namesOf(s)
  members.push({ names: ns.length ? ns : [s.type === 'ReturnStatement' ? '<return>' : '<' + s.type + '@' + line(s.start) + '>'], a: line(s.start), b: line(s.end), node: s, isLet: s.kind === 'let' })
}
const memberName = new Map(); for (const m of members) for (const n of m.names) memberName.set(n, m)
// return surface: split into properties
for (const m of members) {
  const u = uses(m.node, [])
  const inner = u.filter(x => (memberName.has(x.name) || params.includes(x.name)) && !(m.names.includes(x.name) && m.node.type === 'FunctionDeclaration' ? false : false))
  const reads = new Set(), writes = new Set()
  for (const x of inner) { if (x.write) writes.add(x.name); else reads.add(x.name) }
  // declarator init counts as write for let
  res.inner.push({ names: m.names, a: m.a, b: m.b, isLet: m.isLet, reads: [...reads].filter(n => !m.names.includes(n) || m.node.type !== 'VariableDeclaration'), writes: [...writes], tops: [...new Set(u.filter(x => topName.has(x.name)).map(x => x.name))] })
}
res.params = params
writeFileSync(out, JSON.stringify(res, null, 1))
console.log('top', res.top.length, 'inner', res.inner.length)

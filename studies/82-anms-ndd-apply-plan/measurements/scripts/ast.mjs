// Read-only AST survey of src/ and tests/ (rolldown parseAst, oxc ESTree).
// Usage: node ast.mjs <repo-root> <parent-repo-with-node_modules> <out.json>
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'

const [ROOT, PARENT, OUT, UNITS] = process.argv.slice(2)
const UNITJSON = JSON.parse(readFileSync(UNITS, 'utf8'))
const SEE_BY_FILE = new Map()
for (const u of UNITJSON.src) { if (u.class === 'L-see' && !u.gen) { if (!SEE_BY_FILE.has(u.file)) SEE_BY_FILE.set(u.file, []); SEE_BY_FILE.get(u.file).push(u) } }
const { parseAst } = await import(pathToFileURL(join(PARENT, 'node_modules/rolldown/dist/parse-ast-index.mjs')).href)

const files = (top) => execFileSync('git', ['-C', ROOT, 'ls-files', top], { encoding: 'utf8' })
  .split('\n').filter((f) => f.endsWith('.ts'))

const ID = /\b[A-Z][A-Z0-9]{0,5}-[0-9]+[a-z]?\b/g
const FUNC = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])

function lineStarts(text) {
  const s = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') s.push(i + 1)
  return s
}
function lineOf(starts, pos) {
  let lo = 0, hi = starts.length - 1
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1 }
  return lo + 1
}
function genLines(lines) {
  const g = new Set(); let inside = false
  lines.forEach((t, i) => {
    if (t.includes('<generated -- do not edit by hand>')) inside = true
    if (inside) g.add(i + 1)
    if (t.includes('</generated>')) inside = false
  })
  return g
}

// Leading comments of a position: strip whitespace and comments backwards.
function leading(text, _comments, pos) {
  const out = []
  let t = text.slice(0, pos)
  for (;;) {
    const trimmed = t.replace(/\s+$/, '')
    if (trimmed.endsWith('*/')) {
      const open = trimmed.lastIndexOf('/*')
      if (open < 0) break
      out.unshift({ type: 'Block', value: trimmed.slice(open + 2, trimmed.length - 2) })
      t = trimmed.slice(0, open)
      continue
    }
    const nl = trimmed.lastIndexOf('\n')
    const last = trimmed.slice(nl + 1)
    if (/^\s*\/\//.test(last)) {
      out.unshift({ type: 'Line', value: last.trim().replace(/^\/\/+/, '') })
      t = trimmed.slice(0, nl + 1)
      continue
    }
    break
  }
  return out
}

function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const v = node[key]
    if (Array.isArray(v)) for (const x of v) { if (x && typeof x.type === 'string') walk(x, node, visit) }
    else if (v && typeof v.type === 'string') walk(v, node, visit)
  }
}

const result = { src: { functions: [], anchors: [], seeComments: [] }, tests: { tests: [], functions: [] } }

for (const top of ['src', 'tests']) {
  for (const rel of files(top)) {
    const text = readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
    let program
    try { program = parseAst(text, { lang: 'ts', sourceType: 'module' }, rel) } catch (e) { console.error('parse fail', rel, e.message); continue }
    const comments = (program.comments || []).map((c) => ({ start: c.start, end: c.end, value: c.value, type: c.type }))
    const starts = lineStarts(text)
    const gen = genLines(text.split('\n'))
    const parents = new Map()
    const describeStack = []
    walk(program, null, (n, p) => { parents.set(n, p) })

    // anchors (declaration-like places)
    const anchors = []
    walk(program, null, (n, p) => {
      const pp = parents.get(n)
      if (FUNC.has(n.type) && n.body) {
        // anchor
        let anchor = n, kind = n.type, name = n.id?.name || null, exported = false, member = null, vis = null
        if (p && p.type === 'MethodDefinition') { anchor = p; kind = 'method'; name = p.key?.name || p.key?.value || '?'; vis = p.accessibility || (p.key?.type === 'PrivateIdentifier' ? 'private#' : 'public'); member = p.kind }
        else if (p && p.type === 'VariableDeclarator') { anchor = parents.get(p); name = p.id?.name; kind = 'var-' + n.type }
        else if (p && (p.type === 'Property' || p.type === 'PropertyDefinition')) { anchor = p; name = p.key?.name || p.key?.value || '?'; kind = (p.type === 'Property' ? 'prop-' : 'field-') + n.type; if (p.type === 'PropertyDefinition') vis = p.accessibility || (p.key?.type === 'PrivateIdentifier' ? 'private#' : 'public') }
        else if (n.type !== 'FunctionDeclaration') { kind = 'anon-' + n.type }
        let ap = parents.get(anchor)
        if (ap && ap.type === 'ExportNamedDeclaration') { exported = true; anchor = ap }
        if (ap && ap.type === 'ExportDefaultDeclaration') { exported = true; anchor = ap }
        // class membership exported?
        let topLevel = false
        let q = anchor, depthFn = 0
        while (q) { const qp = parents.get(q); if (qp && FUNC.has(qp.type)) depthFn++; q = qp }
        topLevel = depthFn === 0
        const lead = leading(text, comments, anchor.start)
        const purity = lead.find((c) => /@purity\s+\S+/.test(c.value))
        const exprBody = n.type === 'ArrowFunctionExpression' && n.body.type !== 'BlockStatement'
        const line = lineOf(starts, anchor.start)
        const rec = { file: rel, line, kind, name, exported, vis, member, topLevel, exprBody,
          gen: gen.has(line), purity: purity ? (purity.value.match(/@purity\s+(\S+)/) || [])[1] : null,
          purityStyle: purity ? purity.type : null }
        if (top === 'src') result.src.functions.push(rec); else result.tests.functions.push(rec)
      }
      if (top === 'src') {
        // anchors for see-placement
        const isTopStmt = p && p.type === 'Program'
        const isMember = p && p.type === 'ClassBody'
        const isProp = n.type === 'Property' && p && p.type === 'ObjectExpression'
        const isTsMember = p && (p.type === 'TSInterfaceBody' || p.type === 'TSTypeLiteral')
        const isStmt = /Statement$|Declaration$/.test(n.type) && !isTopStmt
        if (isTopStmt || isMember || isProp || isTsMember || isStmt) {
          let what = n.type, exported = false
          let inner = n
          if (n.type === 'ExportNamedDeclaration' || n.type === 'ExportDefaultDeclaration') { exported = true; inner = n.declaration || n; what = inner.type }
          if (inner.type === 'VariableDeclaration') {
            const init = inner.declarations[0]?.init
            what = 'Variable(' + (init ? (FUNC.has(init.type) ? 'function' : init.type) : 'none') + ')'
          }
          let depthFn = 0, q = n
          while (q) { const qp = parents.get(q); if (qp && FUNC.has(qp.type)) depthFn++; q = qp }
          let vis = null
          if (isMember) vis = n.accessibility || (n.key?.type === 'PrivateIdentifier' ? 'private#' : 'public')
          let classExported = null
          if (isMember) { const cls = parents.get(p); const cp = parents.get(cls); classExported = !!(cp && /^Export/.test(cp.type)) }
          anchors.push({ start: n.start, line: lineOf(starts, n.start), what, exported, top: isTopStmt, member: isMember, prop: isProp, tsMember: isTsMember, nestedInFn: depthFn > 0, vis, classExported })
        }
      }
      if (top === 'tests' && n.type === 'CallExpression') {
        // it/test calls
        let callee = n.callee, base = callee
        while (base && (base.type === 'MemberExpression' || base.type === 'CallExpression')) base = base.type === 'MemberExpression' ? base.object : base.callee
        if (base && base.type === 'Identifier' && (base.name === 'it' || base.name === 'test' || base.name === 'describe')) {
          // skip the inner .each(...) call: the outer one has the title
          if (p && p.type === 'CallExpression' && p.callee === n) return
          if (callee.type === 'MemberExpression' && ['beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'use', 'step', 'extend', 'setTimeout', 'info', 'fixme', 'slow', 'describe', 'expect'].includes(callee.property?.name) && base.name === 'test') {
            if (callee.property?.name !== 'describe') return
          }
          const a0 = n.arguments[0]
          let title = null
          if (a0?.type === 'Literal' && typeof a0.value === 'string') title = a0.value
          else if (a0?.type === 'TemplateLiteral') title = a0.quasis.map((q) => q.value.cooked).join('${}')
          else if (a0) title = '<' + a0.type + '>'
          const isDescribe = base.name === 'describe' || (callee.type === 'MemberExpression' && callee.property?.name === 'describe')
          const lead = leading(text, comments, (p && p.type === 'ExpressionStatement') ? p.start : n.start)
          result.tests.tests.push({ file: rel, line: lineOf(starts, n.start), isDescribe, start: n.start, end: n.end, title,
            leadIds: (lead.map((c) => c.value).join(' ').match(ID) || []),
            leadSee: lead.some((c) => /^\s*see\s+[A-Z]/.test(c.value)) })
        }
      }
    })
    if (top === 'src') {
      anchors.sort((a, b) => a.start - b.start)
      for (const u of (SEE_BY_FILE.get(rel) || [])) {
        const v = u.first
        const line = u.line
        const endPos = starts[line - 1 + u.nlines] ?? text.length
        const c = { end: endPos }
        let found = null
        for (const a of anchors) {
          if (a.start < c.end) continue
          const gap = text.slice(c.end, a.start)
          const stripped = gap.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
          if (/^\s*$/.test(stripped)) { found = a }
          break
        }
        result.src.seeComments.push({ file: rel, line, text: v, ids: v.match(ID) || [], anchor: found })
      }
    }
  }
}
writeFileSync(OUT, JSON.stringify(result))
console.log('src functions', result.src.functions.length, 'tests calls', result.tests.tests.length, 'see', result.src.seeComments.length)

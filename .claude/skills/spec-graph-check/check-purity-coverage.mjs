// File: check 96 -- every function of src/ carries exactly one @purity tag of the four values.
//
// Why: the review standard's R7 ("@purity Tag") asks for 100% tag coverage of product code, and
// its R3 lint list asks a machine to look. Check 64 reads what a tag CLAIMS and check 94 reads the
// retired values; neither counted the functions with no tag at all (study 82, A17: 86 named
// block-bodied functions untagged on f043c7356).
//
// WHAT A FUNCTION IS
//   A FunctionDeclaration, FunctionExpression or ArrowFunctionExpression with a body, parsed by
//   rolldown/parseAst (the parser of check 60). Exempt, as R7 lists:
//     - a single-expression arrow (`(a) => a + 1`): R7's "single-expression lambdas";
//     - a function whose line sits in a generated region (`<generated -- do not edit by hand>`
//       to `</generated>`);
//     - everything outside src/ (tests, tools, demo): R7 exempts test code, and the rest is not
//       product code.
//   A block-bodied ANONYMOUS function (a callback passed as an argument, an IIFE) is counted in
//   its own term, `anonymous`, because R7's "anonymous functions" can be read either way (T7,
//   returned to team T on 2026-11-23). When T answers, the term is either dropped or gated to 0.
//
// WHERE THE TAG IS
//   In the comments directly before the function's anchor, with only whitespace between: the
//   declaration (or its `export`), the variable statement of `const f = () => {}`, the object
//   property, the class method or field. The same rule as purity-calls.mjs (check 64).
//
// THE NUMBERS HELD (purity-coverage-baseline.txt, one `key value` per line)
//   untagged-named      a named block-bodied function with no tag (declaration, variable,
//                       property, method, field)
//   untagged-anonymous  a block-bodied anonymous function with no tag (T7, above)
//   bad-value           a function tag whose value is not pure | semi-pure-immutable |
//                       semi-pure-mutable | non-pure
//   two-tags            a function whose leading comments hold more than one tag
//   A count above its line FAILS and names every function behind it; a count below its line
//   prints OK and asks for the line to be lowered in the same commit (the ratchet of checks 60
//   and 64).
//
// Usage:
//   node .claude/skills/spec-graph-check/check-purity-coverage.mjs            the gate
//   node .claude/skills/spec-graph-check/check-purity-coverage.mjs --list     every finding
//   node .claude/skills/spec-graph-check/check-purity-coverage.mjs --self-test
// Exit 0 green, 1 red.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseAst } from 'rolldown/parseAst'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..', '..')
const BASELINE = join(HERE, 'purity-coverage-baseline.txt')
const REL_BASELINE = '.claude/skills/spec-graph-check/purity-coverage-baseline.txt'
const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])
const VALUES = new Set(['pure', 'semi-pure-immutable', 'semi-pure-mutable', 'non-pure'])
const TERMS = ['untagged-named', 'untagged-anonymous', 'bad-value', 'two-tags']
const TAG = /@purity\s+(\S+)/g
const GENERATED_OPEN = '<generated -- do not edit by hand>'
const GENERATED_CLOSE = '</generated>'

// @purity pure
function lineStarts(text) {
  const starts = [0]
  for (let k = 0; k < text.length; k += 1) if (text[k] === '\n') starts.push(k + 1)
  return starts
}

// @purity pure
function lineOf(starts, offset) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const middle = (low + high + 1) >> 1
    if (starts[middle] <= offset) low = middle
    else high = middle - 1
  }
  return low + 1
}

// @purity pure
function generatedLines(text) {
  const lines = new Set()
  let inside = false
  text.split('\n').forEach((line, index) => {
    if (line.includes(GENERATED_OPEN)) inside = true
    if (inside) lines.add(index + 1)
    if (line.includes(GENERATED_CLOSE)) inside = false
  })
  return lines
}

// Summary: the text of the comments directly before `offset`, nearest last.
// @purity pure
function leadingComments(text, offset) {
  const found = []
  let rest = text.slice(0, offset)
  for (;;) {
    const trimmed = rest.replace(/\s+$/, '')
    if (trimmed.endsWith('*/')) {
      const open = trimmed.lastIndexOf('/*')
      if (open < 0) break
      found.unshift(trimmed.slice(open + 2, trimmed.length - 2))
      rest = trimmed.slice(0, open)
      continue
    }
    const newline = trimmed.lastIndexOf('\n')
    const last = trimmed.slice(newline + 1)
    if (/^\s*\/\//.test(last)) {
      found.unshift(last.trim().replace(/^\/\/+/, ''))
      rest = trimmed.slice(0, newline + 1)
      continue
    }
    break
  }
  return found
}

// @purity semi-pure-mutable
function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === 'string') walk(child, node, visit)
    } else if (value && typeof value.type === 'string' && key !== 'parent') {
      walk(value, node, visit)
    }
  }
}

// Summary: the anchor of a function (where its tag sits), its name, and whether it is named.
// @purity pure
function anchorOf(fn, parent, parents) {
  let anchor = fn
  let name = fn.id?.name ?? null
  let named = fn.type === 'FunctionDeclaration'
  if (parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition' || parent?.type === 'Property') {
    anchor = parent
    name = parent.key?.name ?? parent.key?.value ?? '?'
    named = true
  } else if (parent?.type === 'VariableDeclarator' && parent.init === fn) {
    anchor = parents.get(parent) ?? parent
    name = parent.id?.name ?? '?'
    named = true
  } else if (name !== null) {
    named = true
  }
  const above = parents.get(anchor)
  if (above?.type === 'ExportNamedDeclaration' || above?.type === 'ExportDefaultDeclaration') anchor = above
  return { anchor, name: name ?? '(anonymous)', named }
}

// Summary: every finding of one source text, as { term, file, line, name, detail }.
// @purity pure
export function findingsOf(rel, rawText) {
  const text = rawText.replace(/\r\n/g, '\n')
  const program = parseAst(text, { lang: 'ts', sourceType: 'module' }, rel)
  const starts = lineStarts(text)
  const generated = generatedLines(text)
  const parents = new Map()
  walk(program, null, (node, parent) => parents.set(node, parent))
  const findings = []
  walk(program, null, (node, parent) => {
    if (!FUNCTION_TYPES.has(node.type) || !node.body) return
    if (node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement') return
    const { anchor, name, named } = anchorOf(node, parent, parents)
    const line = lineOf(starts, anchor.start)
    if (generated.has(line)) return
    const tags = leadingComments(text, anchor.start).flatMap((comment) => [...comment.matchAll(TAG)].map((m) => m[1]))
    const at = { file: rel, line, name }
    if (tags.length === 0) findings.push({ ...at, term: named ? 'untagged-named' : 'untagged-anonymous', detail: 'no @purity tag' })
    if (tags.length > 1) findings.push({ ...at, term: 'two-tags', detail: `${tags.length} tags: ${tags.join(', ')}` })
    for (const value of tags) {
      if (!VALUES.has(value)) findings.push({ ...at, term: 'bad-value', detail: `@purity ${value} is not one of the four values` })
    }
  })
  return findings
}

// @purity non-pure
function sourceFiles() {
  return execFileSync('git', ['ls-files', '--', 'src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter((path) => path.endsWith('.ts'))
}

// @purity pure
function countsOf(findings) {
  const counts = Object.fromEntries(TERMS.map((term) => [term, 0]))
  for (const one of findings) counts[one.term] += 1
  return counts
}

// @purity non-pure
function readBaseline() {
  const held = {}
  for (const raw of readFileSync(BASELINE, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const [key, value] = line.split(/\s+/)
    held[key] = Number(value)
  }
  return held
}

// @purity non-pure
function gate(findings, list) {
  const counts = countsOf(findings)
  const held = readBaseline()
  let red = false
  for (const term of TERMS) {
    const line = held[term]
    if (line === undefined || Number.isNaN(line)) {
      console.log(`FAIL ${REL_BASELINE} holds no line "${term} <n>"`)
      red = true
      continue
    }
    if (counts[term] > line) {
      red = true
      console.log(`FAIL ${term}: ${counts[term]} > ${line} held`)
      for (const one of findings.filter((f) => f.term === term)) {
        console.log(`       ${one.file}:${one.line} ${one.name} -- ${one.detail}`)
      }
    } else if (counts[term] < line) {
      console.log(`OK   ${term}: ${counts[term]} < ${line} held -- lower the line in ${REL_BASELINE} in this commit`)
    } else {
      console.log(`OK   ${term}: ${counts[term]} (held ${line})`)
    }
  }
  if (list) for (const one of findings) console.log(`     ${one.term} ${one.file}:${one.line} ${one.name} -- ${one.detail}`)
  return red ? 1 : 0
}

// @purity non-pure
function selfTest() {
  const clean = [
    '/** @purity pure */',
    'export function add(a: number, b: number): number {',
    '  return [a].map((x) => x + b)[0]',
    '}',
    '',
  ].join('\n')
  const cases = [
    ['clean', clean, {}],
    ['a named function with no tag', `${clean}function bare(): void {\n  return\n}\n`, { 'untagged-named': 1 }],
    ['a block-bodied callback with no tag', `${clean}/** @purity pure */\nfunction f(): void {\n  [1].forEach((x) => {\n    void x\n  })\n}\n`, { 'untagged-anonymous': 1 }],
    ['the value n/a', clean.replace('@purity pure', '@purity n/a'), { 'bad-value': 1 }],
    ['two tags', clean.replace('/** @purity pure */', '// @purity pure\n/** @purity non-pure */'), { 'two-tags': 1 }],
    ['a generated function', `// ${GENERATED_OPEN}\nfunction made(): void {\n  return\n}\n// ${GENERATED_CLOSE}\n`, {}],
  ]
  let bad = 0
  for (const [label, text, want] of cases) {
    const got = countsOf(findingsOf('src/self-test.ts', text))
    const ok = TERMS.every((term) => got[term] === (want[term] ?? 0))
    console.log(`${ok ? 'OK  ' : 'FAIL'} self-test: ${label} -> ${JSON.stringify(got)}`)
    if (!ok) bad += 1
  }
  return bad === 0 ? 0 : 1
}

// @purity non-pure
function main(argv) {
  if (argv[0] === '--self-test') return selfTest()
  const findings = []
  for (const rel of sourceFiles()) findings.push(...findingsOf(rel, readFileSync(join(ROOT, rel), 'utf8')))
  return gate(findings, argv[0] === '--list')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}

// Checks 64 and 65 helper -- reads src/ (and, for check 65, tests/unit and
// tests/contract) through the TypeScript checker and prints facts as JSON.
// It judges nothing: check-purity-honesty.py (check 64) and
// check-unit-test-or-omission.py (check 65) own the rules, the baselines and
// the wording. CR-573 section 5.
//
// THE CHECKER. The repository's `typescript` devDependency is TypeScript 7,
// the native compiler. Its JavaScript API is the RPC one under
// `typescript/unstable/sync`: the compiler runs as a child process, the AST
// is read on this side, and symbols are asked for in batches. The word
// "unstable" is the package's own. If a later release moves that API, this
// script exits 2 with the reason, so the calling check goes red instead of
// printing a green it did not measure.
//
// USAGE
//   node purity-calls.mjs honesty     -> { examined, lies: [...], notes }
//   node purity-calls.mjs inventory   -> { exported: [...], references }
//   ... [--root DIR]                   read DIR instead of this repository
// Paths in the output are repository-relative, with forward slashes.
//
// WHAT A FUNCTION IS: FunctionDeclaration, FunctionExpression, ArrowFunction,
// MethodDeclaration, GetAccessor, SetAccessor and Constructor nodes with a
// body.
//
// WHERE ITS TAG IS (rule 07, R7.6): a block comment `/** @purity <value> */`
// among the comments leading the function's ANCHOR -- the function itself,
// or for an arrow or function expression the variable statement, the object
// property or the class field it is the value of. The file header's
// `// @purity    <value>` line is a line comment and is never read as a
// function's tag.
//
// HONESTY (check 64). A function tagged `pure` or `semi-pure-a` lies when its
// body -- nested functions included, except a nested function carrying a tag
// of its own, which answers for itself --
//   1. calls or constructs something whose declaration is tagged
//      `semi-pure-b` or `non-pure` (the callee is resolved through imports
//      and re-exports by the checker, and its own tag is read);
//   2. touches `document`, `window`, `Date.now` or `Math.random` as the
//      browser's or the language's own (a local named `document` -- the GRS
//      document model -- is not the browser's and is not counted);
//   3. awaits, or is async itself (`await`, `for await`, an `async`
//      modifier).
//
// INVENTORY (check 65). Every exported function of src/ (a top-level
// `export function`, `export const f = () => ...`, or a local name in an
// `export { ... }` list), with: its tag, its `@external-contract` and
// `@unit-test-omitted` notes, whether it sits in a generated block, its
// branch count, its `??` count, and whether it reads a generated binding.
// And the set of those functions a file of tests/unit or tests/contract
// names through an import (named, namespace, or a destructured dynamic
// import).
//
// BRANCHES are counted the way function-size.mjs (check 60) counts them, on
// this AST instead of oxc's: IfStatement, ConditionalExpression, the four
// loops and do-while, CatchClause, a CaseClause (the default clause is a
// DefaultClause and is not counted), and a BinaryExpression whose operator is
// `&&`, `||` or `??`; charged to the innermost enclosing function only.

import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath, relative, sep } from 'node:path'
import { readFileSync } from 'node:fs'

const HERE = dirname(fileURLToPath(import.meta.url))
// `--root DIR` reads another tree with the same layout (a scratch copy for a
// break test); the checker itself is still the one this script resolves.
const rootAt = process.argv.indexOf('--root')
const ROOT = rootAt > 0 && process.argv[rootAt + 1]
  ? resolvePath(process.argv[rootAt + 1])
  : resolvePath(HERE, '..', '..', '..')

function fail(message) {
  process.stdout.write(JSON.stringify({ problem: message }) + '\n')
  process.exit(2)
}

let API, SymbolFlags, K
try {
  ;({ API, SymbolFlags } = await import('typescript/unstable/sync'))
  ;({ SyntaxKind: K } = await import('typescript/unstable/ast'))
} catch (error) {
  fail('could not load typescript/unstable/sync or typescript/unstable/ast: ' + String(error))
}
if (typeof API !== 'function' || !K || !SymbolFlags) {
  fail('typescript/unstable/sync no longer exports API, SymbolFlags and SyntaxKind')
}

const mode = process.argv[2]
if (mode !== 'honesty' && mode !== 'inventory') {
  fail('usage: node purity-calls.mjs honesty|inventory')
}

const FUNCTION_KINDS = new Set([
  K.FunctionDeclaration, K.FunctionExpression, K.ArrowFunction,
  K.MethodDeclaration, K.GetAccessor, K.SetAccessor, K.Constructor,
])
const IMPURE_TAGS = new Set(['semi-pure-b', 'non-pure'])
const HONEST_TAGS = new Set(['pure', 'semi-pure-a'])
const BRANCH_KINDS = new Set([
  K.IfStatement, K.ConditionalExpression, K.ForStatement, K.ForInStatement,
  K.ForOfStatement, K.WhileStatement, K.DoStatement, K.CatchClause, K.CaseClause,
])
const LOGICAL_OPERATORS = new Set([
  K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken,
])
const TAG_RE = /\/\*\*?[\s*]*@purity\s+(pure|semi-pure-a|semi-pure-b|non-pure|n\/a)\b/g
const CONTRACT_RE = /@external-contract\s+([A-Za-z0-9-]+)/
const OMITTED_RE = /@unit-test-omitted\s+(UO-\d+)([^\n*]*)/
const GENERATED_OPEN = '// <generated -- do not edit by hand>'
const GENERATED_CLOSE = '// </generated>'

function rel(fileName) {
  return relative(ROOT, fileName).split(sep).join('/')
}

function isUnder(fileName, top) {
  const r = rel(fileName)
  return r === top || r.startsWith(top + '/')
}

// ---------------------------------------------------------------------------
// Comments and tags
// ---------------------------------------------------------------------------

/** The comments between a node's full start and its first token. */
function leadingComments(text, pos) {
  const found = []
  let at = pos
  while (at < text.length) {
    const ch = text[at]
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\uFEFF') {
      at += 1
    } else if (text.startsWith('//', at)) {
      const end = text.indexOf('\n', at)
      const stop = end < 0 ? text.length : end
      found.push(text.slice(at, stop))
      at = stop
    } else if (text.startsWith('/*', at)) {
      const end = text.indexOf('*/', at + 2)
      const stop = end < 0 ? text.length : end + 2
      found.push(text.slice(at, stop))
      at = stop
    } else {
      break
    }
  }
  return { comments: found, tokenStart: at }
}

function anchorOf(fn) {
  if (fn.kind === K.ArrowFunction || fn.kind === K.FunctionExpression) {
    const parent = fn.parent
    if (parent && parent.kind === K.VariableDeclaration) {
      const list = parent.parent
      if (list && list.parent && list.parent.kind === K.VariableStatement) return list.parent
      return parent
    }
    if (parent && (parent.kind === K.PropertyAssignment || parent.kind === K.PropertyDeclaration)) {
      return parent
    }
  }
  return fn
}

function notesOf(anchor) {
  const text = anchor.getSourceFile().text
  const { comments, tokenStart } = leadingComments(text, anchor.pos)
  const joined = comments.join('\n')
  let tag = null
  for (const comment of comments) {
    if (!comment.startsWith('/*')) continue
    TAG_RE.lastIndex = 0
    let m
    while ((m = TAG_RE.exec(comment)) !== null) tag = m[1]
  }
  const contract = CONTRACT_RE.exec(joined)
  const omitted = OMITTED_RE.exec(joined)
  return {
    tag,
    externalContract: contract ? contract[1] : null,
    omitted: omitted ? omitted[1] : null,
    omittedRest: omitted ? omitted[2].trim() : null,
    tokenStart,
  }
}

function lineOf(sourceFile, offset) {
  const text = sourceFile.text
  let line = 1
  for (let i = 0; i < offset && i < text.length; i += 1) if (text.charCodeAt(i) === 10) line += 1
  return line
}

function nameOf(fn) {
  if (fn.name && typeof fn.name.text === 'string') return fn.name.text
  if (fn.kind === K.Constructor) return 'constructor'
  const parent = fn.parent
  if (parent && parent.name && typeof parent.name.text === 'string') return parent.name.text
  return '<anonymous>'
}

function hasModifier(node, kind) {
  const mods = node.modifiers
  if (!mods) return false
  for (const m of mods) if (m.kind === kind) return true
  return false
}

function generatedSpans(text) {
  const spans = []
  let at = 0
  for (;;) {
    const open = text.indexOf(GENERATED_OPEN, at)
    if (open < 0) break
    const close = text.indexOf(GENERATED_CLOSE, open)
    const end = close < 0 ? text.length : close + GENERATED_CLOSE.length
    spans.push([open, end])
    at = end
  }
  return spans
}

function inSpans(spans, offset) {
  return spans.some(([a, b]) => a <= offset && offset < b)
}

// ---------------------------------------------------------------------------
// The project
// ---------------------------------------------------------------------------

let api
let project
try {
  api = new API({ cwd: ROOT })
  const snapshot = api.updateSnapshot({ openProjects: [resolvePath(ROOT, 'tsconfig.json')] })
  project = snapshot.getProjects()[0]
} catch (error) {
  fail('the TypeScript API did not open tsconfig.json: ' + String(error))
}
if (!project) fail('the TypeScript API opened no project for tsconfig.json')
const program = project.program
const checker = project.checker

const allNames = program.getSourceFileNames()
const srcFiles = allNames.filter((n) => isUnder(n, 'src') && n.endsWith('.ts') && !n.endsWith('.d.ts'))
if (srcFiles.length === 0) fail('the project holds no file under src/')

const libCache = new Map()
function isDefaultLib(path) {
  if (libCache.has(path)) return libCache.get(path)
  let answer = false
  try {
    const sf = program.getSourceFile(path)
    answer = sf ? program.isSourceFileDefaultLibrary(sf) : false
  } catch {
    answer = /\/lib\.[a-z0-9.]*\.d\.ts$/i.test(path)
  }
  libCache.set(path, answer)
  return answer
}

const aliasCache = new Map()
function unalias(symbol) {
  if (!symbol) return symbol
  if ((symbol.flags & SymbolFlags.Alias) === 0) return symbol
  if (aliasCache.has(symbol.id)) return aliasCache.get(symbol.id)
  let target = symbol
  try {
    target = checker.getAliasedSymbol(symbol)
  } catch {
    target = symbol
  }
  aliasCache.set(symbol.id, target)
  return target
}

function resolveHandle(handle) {
  try {
    return handle.resolve(project)
  } catch {
    return undefined
  }
}

const calleeTagCache = new Map()
/** The @purity tags a symbol's declarations carry, and where the first one is. */
function tagsOfSymbol(symbol) {
  if (calleeTagCache.has(symbol.id)) return calleeTagCache.get(symbol.id)
  const tags = []
  let where = null
  for (const handle of symbol.declarations || []) {
    const decl = resolveHandle(handle)
    if (!decl) continue
    const fileName = decl.getSourceFile().fileName
    if (!isUnder(fileName, 'src')) continue
    let anchor = null
    if (decl.kind === K.VariableDeclaration) {
      anchor = decl.parent && decl.parent.parent && decl.parent.parent.kind === K.VariableStatement
        ? decl.parent.parent : decl
    } else if (decl.kind === K.ClassDeclaration) {
      const ctor = (decl.members || []).find((m) => m.kind === K.Constructor)
      anchor = ctor || null
    } else if (
      FUNCTION_KINDS.has(decl.kind) || decl.kind === K.MethodSignature ||
      decl.kind === K.PropertySignature || decl.kind === K.PropertyDeclaration ||
      decl.kind === K.PropertyAssignment
    ) {
      anchor = decl
    }
    if (!anchor) continue
    const { tag, tokenStart } = notesOf(anchor)
    if (tag) {
      tags.push(tag)
      if (!where) where = rel(fileName) + ':' + lineOf(decl.getSourceFile(), tokenStart)
    }
  }
  const answer = { tags, where }
  calleeTagCache.set(symbol.id, answer)
  return answer
}

/** Every function-like node of a source file, outermost first. */
function functionsOf(sourceFile) {
  const out = []
  const visit = (node) => {
    if (FUNCTION_KINDS.has(node.kind) && node.body) out.push(node)
    node.forEachChild(visit)
  }
  visit(sourceFile)
  return out
}

// ---------------------------------------------------------------------------
// honesty
// ---------------------------------------------------------------------------

function honesty() {
  let examined = 0
  const lies = []
  for (const fileName of srcFiles) {
    const sourceFile = program.getSourceFile(fileName)
    if (!sourceFile) continue
    const spans = generatedSpans(sourceFile.text)
    const tagged = []
    for (const fn of functionsOf(sourceFile)) {
      const notes = notesOf(anchorOf(fn))
      if (!notes.tag || !HONEST_TAGS.has(notes.tag)) continue
      if (inSpans(spans, notes.tokenStart)) continue
      tagged.push({ fn, notes })
    }
    if (tagged.length === 0) continue
    // Collect, per function, the nodes whose symbols decide rules 1 and 2.
    const asks = []
    const local = []
    for (const { fn, notes } of tagged) {
      examined += 1
      const record = {
        file: rel(fileName),
        line: lineOf(sourceFile, notes.tokenStart),
        name: nameOf(fn),
        tag: notes.tag,
        reasons: [],
      }
      if (hasModifier(fn, K.AsyncKeyword)) record.reasons.push('async')
      const walk = (node) => {
        if (node !== fn && FUNCTION_KINDS.has(node.kind)) {
          if (notesOf(anchorOf(node)).tag) return
          if (hasModifier(node, K.AsyncKeyword)) record.reasons.push('async lambda')
        }
        if (node.kind === K.AwaitExpression) record.reasons.push('await')
        if (node.kind === K.ForOfStatement && node.awaitModifier) record.reasons.push('for await')
        if (node.kind === K.CallExpression || node.kind === K.NewExpression) {
          const callee = node.expression
          if (callee && callee.kind === K.Identifier) asks.push({ record, node: callee, why: 'call' })
          else if (callee && callee.kind === K.PropertyAccessExpression && callee.name) {
            asks.push({ record, node: callee.name, why: 'call' })
          }
        }
        if (node.kind === K.Identifier && (node.text === 'document' || node.text === 'window')) {
          asks.push({ record, node, why: node.text })
        }
        if (
          node.kind === K.PropertyAccessExpression && node.name && node.expression &&
          node.expression.kind === K.Identifier &&
          ((node.expression.text === 'Date' && node.name.text === 'now') ||
            (node.expression.text === 'Math' && node.name.text === 'random'))
        ) {
          asks.push({ record, node: node.expression, why: node.expression.text + '.' + node.name.text })
        }
        node.forEachChild(walk)
      }
      fn.forEachChild(walk)
      local.push(record)
    }
    if (asks.length > 0) {
      let symbols
      try {
        symbols = checker.getSymbolAtLocation(asks.map((a) => a.node))
      } catch (error) {
        fail('getSymbolAtLocation failed in ' + rel(fileName) + ': ' + String(error))
      }
      asks.forEach((ask, i) => {
        const symbol = unalias(symbols[i])
        if (!symbol) return
        if (ask.why === 'call') {
          const { tags, where } = tagsOfSymbol(symbol)
          const bad = tags.find((t) => IMPURE_TAGS.has(t))
          if (bad) ask.record.reasons.push('calls ' + symbol.name + ' (' + bad + ', ' + where + ')')
          return
        }
        const decls = symbol.declarations || []
        if (decls.length > 0 && decls.every((d) => isDefaultLib(d.path))) {
          ask.record.reasons.push('touches ' + ask.why)
        }
      })
    }
    for (const record of local) {
      if (record.reasons.length > 0) {
        record.reasons = [...new Set(record.reasons)]
        lies.push(record)
      }
    }
  }
  return { examined, lies }
}

// ---------------------------------------------------------------------------
// inventory
// ---------------------------------------------------------------------------

function branchesOf(fn) {
  let branches = 0
  let nullish = 0
  const walk = (node) => {
    if (node !== fn && FUNCTION_KINDS.has(node.kind)) return
    if (BRANCH_KINDS.has(node.kind)) branches += 1
    if (node.kind === K.BinaryExpression && node.operatorToken &&
        LOGICAL_OPERATORS.has(node.operatorToken.kind)) {
      branches += 1
      if (node.operatorToken.kind === K.QuestionQuestionToken) nullish += 1
    }
    node.forEachChild(walk)
  }
  fn.forEachChild(walk)
  return { branches, nullish }
}

function exportedFunctionsOf(sourceFile) {
  const out = []
  const localFunctions = new Map()
  const listed = new Set()
  for (const statement of sourceFile.statements) {
    if (statement.kind === K.FunctionDeclaration && statement.body && statement.name) {
      localFunctions.set(statement.name.text, statement)
      if (hasModifier(statement, K.ExportKeyword)) out.push(statement)
    } else if (statement.kind === K.VariableStatement) {
      const exported = hasModifier(statement, K.ExportKeyword)
      for (const decl of statement.declarationList.declarations) {
        const init = decl.initializer
        if (!init || !decl.name || typeof decl.name.text !== 'string') continue
        if (init.kind !== K.ArrowFunction && init.kind !== K.FunctionExpression) continue
        localFunctions.set(decl.name.text, init)
        if (exported) out.push(init)
      }
    } else if (statement.kind === K.ExportDeclaration && !statement.moduleSpecifier &&
               statement.exportClause && statement.exportClause.elements) {
      for (const element of statement.exportClause.elements) {
        const local = element.propertyName || element.name
        if (local && typeof local.text === 'string') listed.add(local.text)
      }
    }
  }
  for (const name of listed) {
    const fn = localFunctions.get(name)
    if (fn && !out.includes(fn)) out.push(fn)
  }
  return out
}

function isGeneratedDeclaration(decl) {
  const sourceFile = decl.getSourceFile()
  const fileName = sourceFile.fileName
  if (!isUnder(fileName, 'src')) return false
  if (fileName.endsWith('.json')) {
    try {
      return /generated|do not edit/i.test(readFileSync(fileName, 'utf8'))
    } catch {
      return false
    }
  }
  return inSpans(generatedSpans(sourceFile.text), decl.pos + 1)
}

function readsGenerated(fn) {
  const ids = []
  const walk = (node) => {
    if (node.kind === K.Identifier) ids.push(node)
    node.forEachChild(walk)
  }
  fn.forEachChild(walk)
  if (ids.length === 0) return false
  let symbols
  try {
    symbols = checker.getSymbolAtLocation(ids)
  } catch {
    return false
  }
  for (const raw of symbols) {
    const symbol = unalias(raw)
    if (!symbol) continue
    for (const handle of symbol.declarations || []) {
      const decl = resolveHandle(handle)
      if (decl && isGeneratedDeclaration(decl)) return true
    }
  }
  return false
}

function declarationKey(decl) {
  const fileName = decl.getSourceFile().fileName
  if (!isUnder(fileName, 'src')) return null
  let name = null
  if (decl.name && typeof decl.name.text === 'string') name = decl.name.text
  if (!name) return null
  return rel(fileName) + '::' + name
}

function referencesFrom(top) {
  const found = new Set()
  const files = allNames.filter((n) => isUnder(n, top) && n.endsWith('.ts'))
  for (const fileName of files) {
    const sourceFile = program.getSourceFile(fileName)
    if (!sourceFile) continue
    const asks = []
    const namespaces = new Set()
    const walk = (node) => {
      if (node.kind === K.ImportSpecifier && node.name) asks.push(node.name)
      if (node.kind === K.NamespaceImport && node.name) namespaces.add(node.name.text)
      if (node.kind === K.BindingElement && node.parent && node.parent.parent &&
          node.parent.parent.initializer && node.parent.parent.initializer.kind === K.AwaitExpression) {
        asks.push(node.propertyName || node.name)
      }
      node.forEachChild(walk)
    }
    walk(sourceFile)
    if (namespaces.size > 0) {
      const walk2 = (node) => {
        if (node.kind === K.PropertyAccessExpression && node.expression &&
            node.expression.kind === K.Identifier && namespaces.has(node.expression.text) && node.name) {
          asks.push(node.name)
        }
        node.forEachChild(walk2)
      }
      walk2(sourceFile)
    }
    const nodes = asks.filter((n) => n && n.kind === K.Identifier)
    if (nodes.length === 0) continue
    let symbols
    try {
      symbols = checker.getSymbolAtLocation(nodes)
    } catch (error) {
      fail('getSymbolAtLocation failed in ' + rel(fileName) + ': ' + String(error))
    }
    for (const raw of symbols) {
      const symbol = unalias(raw)
      if (!symbol) continue
      for (const handle of symbol.declarations || []) {
        const decl = resolveHandle(handle)
        const key = decl ? declarationKey(decl) : null
        if (key) found.add(key)
      }
    }
  }
  return [...found].sort()
}

function inventory() {
  const exported = []
  for (const fileName of srcFiles) {
    const sourceFile = program.getSourceFile(fileName)
    if (!sourceFile) continue
    const spans = generatedSpans(sourceFile.text)
    for (const fn of exportedFunctionsOf(sourceFile)) {
      const anchor = anchorOf(fn)
      const notes = notesOf(anchor)
      const { branches, nullish } = branchesOf(fn)
      const record = {
        file: rel(fileName),
        name: nameOf(fn),
        startLine: lineOf(sourceFile, notes.tokenStart),
        endLine: lineOf(sourceFile, fn.end),
        tag: notes.tag,
        externalContract: notes.externalContract,
        omitted: notes.omitted,
        omittedRest: notes.omittedRest,
        generated: inSpans(spans, notes.tokenStart),
        branches,
        nullish,
        readsGenerated: false,
      }
      // Only a function whose every branch is a `??` can be excused by UO-8,
      // so only those are asked about -- asking for every identifier of
      // every exported function would cost the run minutes.
      if (branches > 0 && branches === nullish) record.readsGenerated = readsGenerated(fn)
      exported.push(record)
    }
  }
  return {
    exported,
    references: { unit: referencesFrom('tests/unit'), contract: referencesFrom('tests/contract') },
  }
}

let result
try {
  result = mode === 'honesty' ? honesty() : inventory()
} catch (error) {
  fail('purity-calls.mjs ' + mode + ' failed: ' + String(error && error.stack ? error.stack : error))
} finally {
  try {
    api.close()
  } catch {
    // closing a child that already exited is not a finding
  }
}
process.stdout.write(JSON.stringify(result) + '\n')

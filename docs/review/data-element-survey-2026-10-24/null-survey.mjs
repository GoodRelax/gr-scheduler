// Count every `null` written in a type position under src/ (tests excluded) and
// classify it the way JDG-3226 asks: where it sits (parameter, return value,
// field, variable, type alias, other), whether its top-level declaration crosses
// a component boundary, the @purity tag of the function it belongs to, the layer,
// and whether it lies in a generated region.
//
// usage (from the repository root): node docs/review/data-element-survey-2026-10-24/null-survey.mjs
// writes null-survey.tsv beside this script and prints the summary tables.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAst } from 'rolldown/parseAst'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../..')
const SRC = join(ROOT, 'src')

const posix = (p) => p.split(sep).join('/')
const filesUnder = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return filesUnder(full)
    return name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts') ? [full] : []
  })

// src/entity/<module>/<component>/..., otherwise src/<layer>/<component>/...
const componentOf = (file) => {
  const parts = posix(relative(SRC, file)).split('/')
  return parts[0] === 'entity' ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/')
}
const layerOf = (file) => posix(relative(SRC, file)).split('/')[0]

const published = new Set(
  JSON.parse(readFileSync(join(ROOT, 'docs/spec/_source/published-entries.json'), 'utf8')).rows.flatMap((row) =>
    row.members.map((member) => member.name),
  ),
)

const FUNCTION_LIKE = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'TSDeclareFunction',
  'TSMethodSignature', 'TSFunctionType', 'TSCallSignatureDeclaration', 'TSConstructSignatureDeclaration',
])
const FIELD_LIKE = new Set(['TSPropertySignature', 'PropertyDefinition', 'TSIndexSignature'])

const resolveImport = (from, spec) => {
  if (!spec.startsWith('.')) return null
  const base = resolve(dirname(from), spec)
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  if (base.endsWith('.js') && existsSync(base.replace(/\.js$/, '.ts'))) return base.replace(/\.js$/, '.ts')
  return null
}

const files = filesUnder(SRC)
const parsed = new Map()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  parsed.set(file, { text, program: parseAst(text, { lang: 'ts', sourceType: 'module' }, file) })
}

// Re-exports: (file, name) -> the file that defines it.
const reexports = new Map()
for (const [file, { program }] of parsed) {
  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration' && statement.source) {
      const target = resolveImport(file, statement.source.value)
      for (const spec of statement.specifiers ?? []) {
        reexports.set(`${file}::${spec.exported.name ?? spec.exported.value}`, [target, spec.local.name ?? spec.local.value])
      }
    }
    if (statement.type === 'ExportAllDeclaration' && statement.source) {
      const list = reexports.get(`${file}::*`) ?? []
      list.push(resolveImport(file, statement.source.value))
      reexports.set(`${file}::*`, list)
    }
  }
}
const definedIn = (file, name, depth = 0) => {
  if (!file || depth > 8) return file
  const direct = reexports.get(`${file}::${name}`)
  if (direct) return definedIn(direct[0], direct[1], depth + 1)
  for (const star of reexports.get(`${file}::*`) ?? []) {
    const found = definedIn(star, name, depth + 1)
    if (found && found !== star) return found
    if (found && topLevelNames(found).has(name)) return found
  }
  return file
}
const topNamesCache = new Map()
function topLevelNames(file) {
  if (topNamesCache.has(file)) return topNamesCache.get(file)
  const names = new Set()
  for (const statement of parsed.get(file)?.program.body ?? []) {
    const declaration = statement.declaration ?? statement
    if (declaration.id?.name) names.add(declaration.id.name)
    for (const one of declaration.declarations ?? []) if (one.id?.name) names.add(one.id.name)
  }
  topNamesCache.set(file, names)
  return names
}

// (defining file, name) -> components that import it.
const importers = new Map()
for (const [file, { program }] of parsed) {
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') continue
    const target = resolveImport(file, statement.source.value)
    if (!target) continue
    for (const spec of statement.specifiers ?? []) {
      if (spec.type !== 'ImportSpecifier') continue
      const name = spec.imported.name ?? spec.imported.value
      const home = definedIn(target, name)
      const key = `${home}::${name}`
      const set = importers.get(key) ?? new Set()
      set.add(componentOf(file))
      importers.set(key, set)
    }
  }
}

const purityBefore = (text, start) => {
  const window = text.slice(Math.max(0, start - 800), start)
  const matches = [...window.matchAll(/@purity\s+([\w-]+)/g)]
  if (matches.length === 0) return 'none'
  const last = matches[matches.length - 1]
  const after = window.slice(last.index + last[0].length)
  const close = after.indexOf('*/')
  const tail = close < 0 ? after : after.slice(close + 2)
  return /[;}]/.test(tail) ? 'none' : last[1]
}

const generatedRanges = (text) => {
  const ranges = []
  let open = -1
  let at = 0
  for (const line of text.split('\n')) {
    if (line.includes('</generated>')) {
      if (open >= 0) ranges.push([open, at + line.length])
      open = -1
    } else if (line.includes('<generated')) {
      open = at
    }
    at += line.length + 1
  }
  return ranges
}

const rows = []
for (const [file, { text, program }] of parsed) {
  const generated = generatedRanges(text)
  const lineOf = (offset) => text.slice(0, offset).split('\n').length
  for (const statement of program.body) {
    const declaration = statement.declaration ?? statement
    const topName =
      declaration.id?.name ?? (declaration.declarations ?? []).map((one) => one.id?.name).filter(Boolean).join(',') ?? '?'
    const exported = statement.type.startsWith('Export')
    const crossing = [...(topName || '').split(',')].some((name) => {
      const set = importers.get(`${file}::${name}`)
      return set ? [...set].some((component) => component !== componentOf(file)) : false
    })
    const isPublished = (topName || '').split(',').some((name) => published.has(name))
    const visit = (node, ancestors) => {
      if (!node || typeof node.type !== 'string') return
      if (node.type === 'TSNullKeyword') {
        let place = 'other'
        let owner = null
        for (let i = ancestors.length - 1; i >= 0; i--) {
          const [parent, key] = ancestors[i]
          if (FUNCTION_LIKE.has(parent.type) && key === 'params') { place = 'parameter'; owner = parent; break }
          if (FUNCTION_LIKE.has(parent.type) && key === 'returnType') { place = 'return'; owner = parent; break }
          if (FIELD_LIKE.has(parent.type)) { place = 'field'; break }
          if (parent.type === 'VariableDeclarator' && key === 'id') { place = 'variable'; break }
          if (parent.type === 'TSTypeAliasDeclaration') { place = 'type-alias'; break }
        }
        let purity = 'n/a'
        if (owner) {
          let anchor = owner
          for (let i = ancestors.length - 1; i >= 0; i--) {
            const [parent] = ancestors[i]
            if (parent === owner) {
              const up = ancestors[i - 1]?.[0]
              if (up && ['MethodDefinition', 'VariableDeclarator', 'Property', 'PropertyDefinition'].includes(up.type)) anchor = up
              if (up && up.type === 'VariableDeclarator') {
                const decl = ancestors[i - 2]?.[0]
                if (decl) anchor = decl
              }
              break
            }
          }
          const outer = ancestors.find(([parent]) => parent === statement) ? statement : anchor
          purity = purityBefore(text, anchor === owner && owner.type === 'FunctionDeclaration' ? statement.start : anchor.start)
          if (purity === 'none' && outer) purity = purityBefore(text, statement.start)
        }
        rows.push({
          file: posix(relative(ROOT, file)),
          line: lineOf(node.start),
          layer: layerOf(file),
          component: componentOf(file),
          top: topName || '?',
          exported: exported ? 'yes' : 'no',
          crossing: crossing ? 'yes' : 'no',
          published: isPublished ? 'yes' : 'no',
          place,
          purity,
          generated: generated.some(([a, b]) => node.start >= a && node.start <= b) ? 'yes' : 'no',
        })
        return
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue
        if (Array.isArray(value)) for (const child of value) visit(child, [...ancestors, [node, key]])
        else if (value && typeof value === 'object') visit(value, [...ancestors, [node, key]])
      }
    }
    visit(statement, [])
  }
}

const COLUMNS = ['file', 'line', 'layer', 'component', 'top', 'exported', 'crossing', 'published', 'place', 'purity', 'generated']
writeFileSync(
  join(HERE, 'null-survey.tsv'),
  [COLUMNS.join('\t'), ...rows.map((row) => COLUMNS.map((c) => row[c]).join('\t'))].join('\n') + '\n',
)

const tally = (key) => {
  const counts = new Map()
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}
console.log(`null in a type position: ${rows.length} in ${new Set(rows.map((r) => r.file)).size} files`)
for (const key of ['layer', 'place', 'crossing', 'published', 'purity', 'generated']) {
  console.log(`${key}: ${tally(key).map(([k, n]) => `${k} ${n}`).join(', ')}`)
}
const cross = (a, b) => {
  const counts = new Map()
  for (const row of rows) {
    const k = `${row[a]} / ${row[b]}`
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  console.log(`${a} x ${b}: ${[...counts].sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`)
}
cross('crossing', 'place')
cross('crossing', 'purity')

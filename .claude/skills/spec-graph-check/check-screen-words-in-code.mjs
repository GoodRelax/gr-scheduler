// File: check 98 -- src/ looks a screen word up by its row ID, never by a glossary key or by the word.
//
// Why: rule 03 section 1 (JDG-3836, JDG-3837) makes renaming a screen word a data change only. The
// words live in docs/spec/_source/display-words.json under GRS row IDs, and src/ reads the
// generated copy by row ID. Two ways break that, and this check counts both in hand-written src/
// (*.ts, generated regions left out):
//
//   (a) glossary-lookup  src/ reads docs/spec/_source/glossary.json or a copy of it: an import or
//                        a string naming a path that ends in glossary.json, and every literal used
//                        as an index of a binding such an import made. A glossary `key` changes
//                        on every rename, so code that indexes by it changes with every rename.
//   (b) word-literal     a string literal (or a piece of a template literal) whose whole value is
//                        a label of display-words.json, in Japanese or English.
//
// FALSE POSITIVES, AND WHAT IS DONE WITH THEM (measured 2026-11-25 on 64fc2c14f + develop e03453a1f)
//   - A bare string equal to a glossary key is NOT counted under (a). 1,563 literals of src/ equal a
//     key (keys are camelCase: `task`, `milestone`, `pure`), and they are JSON field names, type
//     members and identifiers of the code, not lookups. Only a read of the glossary is a lookup.
//   - Under (b), a label shaped like an identifier (`^[a-z][A-Za-z0-9]*$`: the settings rows label
//     a setting by its key) and a label with no letter (`+`) are not words a person reads as prose
//     and are not counted.
//   - A literal that names something an outside standard or platform defines, and only happens to
//     be spelled like a screen word (an MSPDI element `Tasks`, a DOM key name `Delete`), is exempt
//     BY NAME in screen-words-in-code-exempt.txt, one `path<TAB>literal<TAB>reason` line each (a
//     path ending in `/` covers a folder). Every exemption is printed on every run, and one that
//     no longer matches anything is red, so the list cannot outlive its reason.
//   - Exact equality only: a label inside a longer sentence is not counted. src/ strings are ASCII
//     (rule 03), so a Japanese label could only appear as an escape, which the parser decodes.
//
// THE NUMBERS HELD (screen-words-in-code-baseline.txt): `glossary-lookup n` and `word-literal n`.
// A ratchet that only falls: a count above its line fails and names every site; a count below asks
// for the line to be lowered in the same commit.
//
// Usage:
//   node .claude/skills/spec-graph-check/check-screen-words-in-code.mjs [--list]
//   node .claude/skills/spec-graph-check/check-screen-words-in-code.mjs --self-test
// Exit 0 green, 1 red.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseAst } from 'rolldown/parseAst'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..', '..', '..')
const WORDS = 'docs/spec/_source/display-words.json'
const BASELINE = join(HERE, 'screen-words-in-code-baseline.txt')
const EXEMPT = join(HERE, 'screen-words-in-code-exempt.txt')
const REL_BASELINE = '.claude/skills/spec-graph-check/screen-words-in-code-baseline.txt'
const TERMS = ['glossary-lookup', 'word-literal']
const IDENTIFIER_SHAPED = /^[a-z][A-Za-z0-9]*$/
const HAS_LETTER = /\p{L}/u
const GLOSSARY_PATH = /(^|[/\\])glossary\.json$/
const GENERATED_OPEN = '<generated -- do not edit by hand>'
const GENERATED_CLOSE = '</generated>'

// @purity semi-pure-mutable
function walk(node, parent, visit) {
  if (!node || typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) {
    const value = node[key]
    if (Array.isArray(value)) {
      for (const child of value) if (child && typeof child.type === 'string') walk(child, node, visit)
    } else if (value && typeof value.type === 'string') {
      walk(value, node, visit)
    }
  }
}

// Summary: the labels of the display words, as label -> "section/rowId/lang", the counted ones only.
// @purity pure
export function countedLabels(words) {
  const labels = new Map()
  for (const [section, rows] of Object.entries(words)) {
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      for (const lang of ['ja', 'en']) {
        const text = row?.label?.[lang]
        if (typeof text !== 'string' || text.trim() === '') continue
        if (IDENTIFIER_SHAPED.test(text) || !HAS_LETTER.test(text)) continue
        if (!labels.has(text)) labels.set(text, `${section}/${row.specTableRowId ?? '?'}/${lang}`)
      }
    }
  }
  return labels
}

// Summary: every finding of one source text, as { term, file, line, literal, detail }.
// @purity pure
export function findingsOf(rel, rawText, labels) {
  const text = rawText.replace(/\r\n/g, '\n')
  const generated = new Set()
  let inside = false
  text.split('\n').forEach((line, index) => {
    if (line.includes(GENERATED_OPEN)) inside = true
    if (inside) generated.add(index + 1)
    if (line.includes(GENERATED_CLOSE)) inside = false
  })
  const program = parseAst(text, { lang: 'ts', sourceType: 'module' }, rel)
  const lineOf = (offset) => text.slice(0, offset).split('\n').length
  const glossaryBindings = new Set()
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration' && GLOSSARY_PATH.test(statement.source.value)) {
      for (const spec of statement.specifiers) glossaryBindings.add(spec.local.name)
    }
  }
  const findings = []
  walk(program, null, (node, parent) => {
    let value = null
    if (node.type === 'Literal' && typeof node.value === 'string') value = node.value
    else if (node.type === 'TemplateElement') value = node.value.cooked
    if (value === null) return
    const line = lineOf(node.start)
    if (generated.has(line)) return
    const at = { file: rel, line, literal: value }
    if (GLOSSARY_PATH.test(value)) {
      findings.push({ ...at, term: 'glossary-lookup', detail: 'reads the glossary' })
      return
    }
    if (parent?.type === 'MemberExpression' && parent.property === node && parent.object?.type === 'Identifier' &&
        glossaryBindings.has(parent.object.name)) {
      findings.push({ ...at, term: 'glossary-lookup', detail: `indexes ${parent.object.name} by a glossary key` })
      return
    }
    if (parent?.type === 'ImportDeclaration' || parent?.type === 'ExportAllDeclaration' ||
        parent?.type === 'ExportNamedDeclaration') return
    if (labels.has(value)) findings.push({ ...at, term: 'word-literal', detail: `the label ${labels.get(value)}` })
  })
  return findings
}

// @purity non-pure
function readExemptions() {
  const out = []
  for (const raw of readFileSync(EXEMPT, 'utf8').split(/\r?\n/)) {
    if (raw.trim() === '' || raw.startsWith('#')) continue
    const [path, literal, reason] = raw.split('\t')
    out.push({ path, literal, reason, used: 0 })
  }
  return out
}

// @purity pure
function exemptionOf(finding, exemptions) {
  return exemptions.find((one) => one.literal === finding.literal &&
    (one.path.endsWith('/') ? finding.file.startsWith(one.path) : finding.file === one.path))
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
function selfTest() {
  const labels = countedLabels({ icons: [
    { specTableRowId: 'IC-7', label: { ja: 'コマンドパレット', en: 'Command Palette' } },
    { specTableRowId: 'IC-163', label: { ja: '+', en: '+' } },
  ], settings: [{ specTableRowId: 'S-1', label: { ja: 'markerSize', en: 'markerSize' } }] })
  const cases = [
    ['clean', "const a = 'markerSize'\nconst b = a + '+'\n", {}],
    ['an English label', "const title = 'Command Palette'\n", { 'word-literal': 1 }],
    ['a Japanese label as an escape', "const title = '\\u30b3\\u30de\\u30f3\\u30c9\\u30d1\\u30ec\\u30c3\\u30c8'\n", { 'word-literal': 1 }],
    ['a glossary import and its index', "import glossary from './glossary.json'\nconst w = glossary['childTask']\n", { 'glossary-lookup': 2 }],
    ['a label in a generated region', `// ${GENERATED_OPEN}\nconst t = 'Command Palette'\n// ${GENERATED_CLOSE}\n`, {}],
  ]
  let bad = 0
  for (const [label, text, want] of cases) {
    const found = findingsOf('src/self-test.ts', text, labels)
    const got = Object.fromEntries(TERMS.map((term) => [term, found.filter((f) => f.term === term).length]))
    const ok = TERMS.every((term) => got[term] === (want[term] ?? 0))
    console.log(`${ok ? 'OK  ' : 'FAIL'} self-test: ${label} -> ${JSON.stringify(got)}`)
    if (!ok) bad += 1
  }
  return bad === 0 ? 0 : 1
}

// @purity non-pure
function main(argv) {
  if (argv[0] === '--self-test') return selfTest()
  const labels = countedLabels(JSON.parse(readFileSync(join(ROOT, WORDS), 'utf8')))
  const exemptions = readExemptions()
  const files = execFileSync('git', ['ls-files', '--', 'src'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter((path) => path.endsWith('.ts'))
  const counted = []
  for (const rel of files) {
    for (const finding of findingsOf(rel, readFileSync(join(ROOT, rel), 'utf8'), labels)) {
      const exempt = finding.term === 'word-literal' ? exemptionOf(finding, exemptions) : undefined
      if (exempt) exempt.used += 1
      else counted.push(finding)
    }
  }
  let red = false
  for (const one of exemptions) {
    if (one.used === 0) {
      red = true
      console.log(`FAIL exemption matches nothing -- strike it: ${one.path} ${JSON.stringify(one.literal)}`)
    } else {
      console.log(`EXEMPT ${one.path} ${JSON.stringify(one.literal)} x${one.used} -- ${one.reason}`)
    }
  }
  const held = readBaseline()
  for (const term of TERMS) {
    const sites = counted.filter((f) => f.term === term)
    const line = held[term]
    if (line === undefined || Number.isNaN(line)) {
      red = true
      console.log(`FAIL ${REL_BASELINE} holds no line "${term} <n>"`)
    } else if (sites.length > line) {
      red = true
      console.log(`FAIL ${term}: ${sites.length} > ${line} held -- look the word up by its row ID in the display words`)
    } else if (sites.length < line) {
      console.log(`OK   ${term}: ${sites.length} < ${line} held -- lower the line in ${REL_BASELINE} in this commit`)
    } else {
      console.log(`OK   ${term}: ${sites.length} (held ${line})`)
    }
    if (sites.length > (line ?? 0) || argv[0] === '--list') {
      for (const one of sites) console.log(`       ${one.file}:${one.line} ${JSON.stringify(one.literal)} -- ${one.detail}`)
    }
  }
  return red ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}

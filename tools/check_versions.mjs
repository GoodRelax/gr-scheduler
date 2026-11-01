// Check 86 (CR-822): the version rule lives in one place, and the release versions agree.
// The rule itself is docs/development-rules/10-versions.md; this file holds only what it checks.
//
//     node tools/check_versions.mjs              red on any problem below
//     node tools/check_versions.mjs --self-test  red unless a planted drift and a planted mismatch are both found
//
// 1. Every file in docs/release-notes/ is <Alpha|Beta|Release>-<compact instant>.md or -ja.md, and
//    each release has both. package.json, both versions of package-lock.json, README.md and
//    README-ja.md name the newest release.
// 2. A RULE_MARKS phrase -- words that only a statement of the version rule uses -- appears in no
//    tracked text file outside ALLOWED (the table, the tools that implement it, tests, landed change
//    requests, the ledgers and past records). Every POINTERS file names the table.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { newestRelease, releaseNotesIn } from './release_version.mjs'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const TABLE = 'docs/development-rules/10-versions.md'
const TABLE_NAME = '10-versions.md'

export const RULE_MARKS = [
  'artifact_versions.mjs bump',
  'YEAR.MMDD.HHMMSS',
  '年.月日.時分秒',
  'pre-release の印',
  '1 つの変更要求の中で版を上げる',
  'その変更を当てる時刻へ上げ',
  '版をその変更を当てる時刻',
]

const ALLOWED = [
  TABLE,
  'tools/artifact_versions.mjs',
  'tools/relay_version.mjs',
  'tools/release_version.mjs',
  'tools/check_versions.mjs',
  'tests/',
  'change-request/',
  'docs/development-records/rulings.md',
  'docs/development-records/changelog.md',
  'docs/development-records/defects.md',
  'docs/development-records/fixed-defects.md',
  'docs/development-records/pending-decisions.md',
  'docs/development-records/history/',
  'docs/development-records/measurements/',
  'docs/review/',
  'studies/',
]

export const POINTERS = [
  'docs/spec/_assets/design-mcp-relay.md',
  'docs/spec/01-04-requirements.md',
  'docs/spec/_source/agent-api-members.json',
  'docs/development-records/handoff.md',
  'docs/development-records/changelog.md',
  'docs/development-records/README.md',
  'docs/development-rules/05-working-method.md',
  'tools/artifact-versions.json',
  'tools/artifact_versions.mjs',
  'tools/stamp_download_page.mjs',
]

const TEXT = /\.(md|json|ts|mjs|js|py|sh|html|yml|yaml|txt|tsv|css)$/

/** @purity pure */
export function releaseProblems(notes, versions) {
  const out = []
  for (const { name, note } of notes) {
    if (note === null) out.push(`docs/release-notes/${name} is not <Alpha|Beta|Release>-<YYYYMMDDTHHMMSSZ>[-ja].md`)
  }
  const tags = new Set(notes.filter((one) => one.note !== null).map((one) => one.note.tag))
  for (const tag of tags) {
    for (const suffix of ['', '-ja']) {
      if (!notes.some((one) => one.name === `${tag}${suffix}.md`)) out.push(`docs/release-notes/${tag}${suffix}.md is missing`)
    }
  }
  const newest = newestRelease(notes)
  if (newest === null) return [...out, 'docs/release-notes/ holds no release']
  for (const [where, value] of Object.entries(versions.numbers)) {
    if (value !== newest.compact) out.push(`${where} is ${JSON.stringify(value)}, not the newest release ${newest.compact}`)
  }
  const english = `Version \`${newest.compact}\`, tag \`${newest.tag}\``
  const japanese = `版 \`${newest.compact}\`、タグ \`${newest.tag}\``
  if (!versions.readme.includes(english)) out.push(`README.md does not say: ${english}`)
  if (!versions.readmeJa.includes(japanese)) out.push(`README-ja.md does not say: ${japanese}`)
  return out
}

/** @purity pure */
export function driftProblems(files) {
  const out = []
  for (const [path, text] of Object.entries(files)) {
    if (ALLOWED.some((one) => path === one || (one.endsWith('/') && path.startsWith(one)))) continue
    const lines = text.split('\n')
    lines.forEach((line, index) => {
      for (const mark of RULE_MARKS) {
        if (line.includes(mark)) out.push(`${path}:${index + 1} states the version rule ("${mark}") -- point at ${TABLE} instead`)
      }
    })
  }
  for (const path of POINTERS) {
    if (!(path in files)) out.push(`${path} is gone -- update POINTERS in tools/check_versions.mjs`)
    else if (!files[path].includes(TABLE_NAME)) out.push(`${path} does not point at ${TABLE}`)
  }
  return out
}

/** @purity semi-pure-b */
function trackedTextFiles(root) {
  const names = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0')
    .filter((name) => TEXT.test(name))
  const files = {}
  for (const name of names) {
    try {
      files[name] = readFileSync(join(root, name), 'utf8').replace(/\r\n/g, '\n')
    } catch {
      // WHY: a file deleted in the working tree but still in the index is not there to state anything.
    }
  }
  return files
}

/** @purity semi-pure-b */
function versionsIn(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  return {
    numbers: {
      'package.json version': pkg.version,
      'package-lock.json version': lock.version,
      'package-lock.json packages[""].version': lock.packages?.['']?.version,
    },
    readme: readFileSync(join(root, 'README.md'), 'utf8'),
    readmeJa: readFileSync(join(root, 'README-ja.md'), 'utf8'),
  }
}

/** @purity pure */
function selfTestProblems() {
  const out = []
  const files = Object.fromEntries(POINTERS.map((path) => [path, `see ${TABLE_NAME}`]))
  if (driftProblems(files).length !== 0) out.push('self-test: a clean tree is red')
  files['docs/elsewhere.md'] = `run node tools/${RULE_MARKS[0]} grsRelay`
  if (driftProblems(files).length !== 1) out.push('self-test: a planted rule statement is not found')
  const notes = [
    { name: 'Alpha-20261019T022508Z.md', note: { stage: 'Alpha', compact: '20261019T022508Z', tag: 'Alpha-20261019T022508Z' } },
    { name: 'Alpha-20261019T022508Z-ja.md', note: { stage: 'Alpha', compact: '20261019T022508Z', tag: 'Alpha-20261019T022508Z' } },
  ]
  const good = {
    numbers: { 'package.json version': '20261019T022508Z' },
    readme: 'Version `20261019T022508Z`, tag `Alpha-20261019T022508Z`',
    readmeJa: '版 `20261019T022508Z`、タグ `Alpha-20261019T022508Z`',
  }
  if (releaseProblems(notes, good).length !== 0) out.push('self-test: matching release versions are red')
  if (releaseProblems(notes, { ...good, numbers: { 'package.json version': '0.0.0' } }).length !== 1) {
    out.push('self-test: a planted package.json mismatch is not found')
  }
  return out
}

/** @purity non-pure */
function main() {
  const root = process.env.GRS_ARTIFACT_ROOT || ROOT
  if (process.argv.includes('--self-test')) {
    const out = selfTestProblems()
    for (const one of out) process.stdout.write(`FAIL     ${one}\n`)
    if (out.length === 0) process.stdout.write('OK       check_versions self-test\n')
    return out.length === 0 ? 0 : 1
  }
  const problems = [...releaseProblems(releaseNotesIn(root), versionsIn(root)), ...driftProblems(trackedTextFiles(root))]
  for (const one of problems) process.stdout.write(`FAIL     ${one}\n`)
  if (problems.length === 0) {
    process.stdout.write(`OK       the release versions agree and the version rule is stated only in ${TABLE}\n`)
  }
  return problems.length === 0 ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exit(main())

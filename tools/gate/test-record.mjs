// File: the test record of JDG-3827 -- one committed summary per GT-2 run.
//
// Why: the review standard (R6) asks for a test record, and run-gate.mjs used to delete the two
// tool reports it read. JDG-3827 settles the shape: for each GT-2, the commit tested and, per test
// file, the passed / failed / skipped counts, written to docs/development-records/test-records/.
// The full tool reports stay outside git (scratch/test-reports/, gitignored). The summary holds
// no absolute path and no account name, because the repository is public.
//
//   node tools/gate/test-record.mjs --check
//       every record under docs/development-records/test-records/ has the shape below and holds
//       no absolute path and no account name (check 95 of check.sh)
//   node tools/gate/test-record.mjs --write --gate GT-2 --verdict passed <vitest.json> [<playwright.json>]
//       writes one record from reports at hand (run-gate.mjs calls writeTestRecord directly)
//   node tools/gate/test-record.mjs --self-test
//       breaks a record in memory three ways and shows that --check goes red on each
//
// A record is Markdown:
//
//   # Test record: <gate> at <sha12>
//
//   - Gate: GT-2
//   - Commit: <40 hex>[ with uncommitted changes]
//   - Verdict: passed | stopped: <first line of the reason>
//   - Written: <RFC 3339 UTC instant>
//   - Totals: vitest <p> passed, <f> failed, <s> skipped; playwright <p> passed, <f> failed, <s> skipped
//   - Written by tools/gate/test-record.mjs (JDG-3827). The full reports stay outside git.
//
//   | File | Runner | Passed | Failed | Skipped |
//   |:---|:---|---:|---:|---:|
//   | tests/unit/a.test.ts | vitest | 3 | 0 | 1 |
//
// A file name is `<YYYY-MM-DD>-<gate>-<sha12>.md`; a second run of the same gate on the same commit
// replaces the first, since the record states the commit, not the run.

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { userInfo } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const RECORD_DIR = 'docs/development-records/test-records'
const LOCAL_REPORT_DIR = 'scratch/test-reports'
const RED_STATES = new Set(['failed', 'timedOut', 'interrupted'])
const SKIPPED_STATES = new Set(['skipped', 'pending', 'todo', 'disabled'])
const TABLE_HEAD = '| File | Runner | Passed | Failed | Skipped |'
const TABLE_RULE = '|:---|:---|---:|---:|---:|'
const RECORD_NAME = /^\d{4}-\d{2}-\d{2}-(GT-[12])-([0-9a-f]{12})\.md$/
const ROW = /^\| ([^|]+) \| (vitest|playwright) \| (\d+) \| (\d+) \| (\d+) \|$/
const HEAD_LINES = [
  /^# Test record: (GT-[12]) at ([0-9a-f]{12})$/,
  /^$/,
  /^- Gate: (GT-[12])$/,
  /^- Commit: ([0-9a-f]{40})( with uncommitted changes)?$/,
  /^- Verdict: (passed|stopped: .+)$/,
  /^- Written: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
  /^- Totals: vitest \d+ passed, \d+ failed, \d+ skipped; playwright \d+ passed, \d+ failed, \d+ skipped$/,
  /^- Written by tools\/gate\/test-record\.mjs \(JDG-3827\)\. The full reports stay outside git\.$/,
  /^$/,
]
// Why: a drive letter, a home folder or a UNC share names the machine and often the account.
const ABSOLUTE_PATH = /(?:^|[\s(|`'"])(?:[A-Za-z]:[\\/]|\\\\[^\s\\]|\/(?:Users|home|root|mnt|tmp|var|private)\/)/

const posix = (path) => path.split('\\').join('/')

// Summary: the per-file counts of one vitest JSON report, keyed by the path relative to `root`.
// @purity pure
export function vitestCounts(report, root = ROOT) {
  const counts = new Map()
  for (const file of report.testResults ?? []) {
    const path = portablePath(file.name, root)
    const tally = counts.get(path) ?? { passed: 0, failed: 0, skipped: 0 }
    const cases = file.assertionResults ?? []
    for (const one of cases) {
      if (one.status === 'passed') tally.passed += 1
      else if (one.status === 'failed') tally.failed += 1
      else if (SKIPPED_STATES.has(one.status)) tally.skipped += 1
    }
    // Why: a file that fails to load reports no failed case; the record still has to show it red.
    if (file.status === 'failed' && !cases.some((one) => one.status === 'failed')) tally.failed += 1
    counts.set(path, tally)
  }
  return counts
}

// Summary: the per-file counts of one playwright JSON report, read from each test's last result.
// @purity pure
export function playwrightCounts(report, root = ROOT) {
  const counts = new Map()
  const testDir = report.config?.rootDir ?? join(root, 'tests')
  // @purity semi-pure-mutable
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const path = portablePath(resolve(testDir, spec.file), root)
      const tally = counts.get(path) ?? { passed: 0, failed: 0, skipped: 0 }
      for (const run of spec.tests ?? []) {
        const last = (run.results ?? []).at(-1)
        if (last === undefined || last.status === 'skipped') tally.skipped += 1
        else if (RED_STATES.has(last.status)) tally.failed += 1
        else tally.passed += 1
      }
      counts.set(path, tally)
    }
    for (const child of suite.suites ?? []) walk(child)
  }
  for (const top of report.suites ?? []) walk(top)
  return counts
}

// Why: a report names files by absolute path; the record must not, so a path outside the
// repository is refused rather than written.
// @purity pure
function portablePath(path, root) {
  const inside = posix(relative(root, path))
  if (inside === '' || inside.startsWith('../') || isAbsolute(inside)) {
    throw new Error(`a test file outside the repository cannot go into a record: ${inside}`)
  }
  return inside
}

// @purity pure
function totalsOf(counts) {
  const total = { passed: 0, failed: 0, skipped: 0 }
  for (const tally of counts.values()) {
    total.passed += tally.passed
    total.failed += tally.failed
    total.skipped += tally.skipped
  }
  return total
}

// Summary: the Markdown text of one record.
// @purity pure
export function recordText({ gate, sha, dirty, verdict, writtenAt, vitest, playwright }) {
  const v = totalsOf(vitest)
  const p = totalsOf(playwright)
  const rows = []
  for (const [runner, counts] of [['vitest', vitest], ['playwright', playwright]]) {
    for (const path of [...counts.keys()].sort()) {
      const t = counts.get(path)
      rows.push(`| ${path} | ${runner} | ${t.passed} | ${t.failed} | ${t.skipped} |`)
    }
  }
  return [
    `# Test record: ${gate} at ${sha.slice(0, 12)}`,
    '',
    `- Gate: ${gate}`,
    `- Commit: ${sha}${dirty ? ' with uncommitted changes' : ''}`,
    `- Verdict: ${verdict}`,
    `- Written: ${writtenAt}`,
    `- Totals: vitest ${v.passed} passed, ${v.failed} failed, ${v.skipped} skipped; ` +
      `playwright ${p.passed} passed, ${p.failed} failed, ${p.skipped} skipped`,
    '- Written by tools/gate/test-record.mjs (JDG-3827). The full reports stay outside git.',
    '',
    TABLE_HEAD,
    TABLE_RULE,
    ...rows,
    '',
  ].join('\n')
}

// Summary: the faults of one record's text; an empty list is a well-formed record.
// @purity pure
export function recordFaults(name, text, accountName) {
  const faults = []
  const named = RECORD_NAME.exec(name)
  if (named === null) faults.push(`${name}: the name is not <YYYY-MM-DD>-<GT-1|GT-2>-<sha12>.md`)
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  HEAD_LINES.forEach((pattern, index) => {
    if (!pattern.test(lines[index] ?? '')) faults.push(`${name}:${index + 1}: not the record head shape`)
  })
  const title = HEAD_LINES[0].exec(lines[0] ?? '')
  const commit = HEAD_LINES[3].exec(lines[3] ?? '')
  if (named !== null && title !== null && (title[1] !== named[1] || title[2] !== named[2])) {
    faults.push(`${name}:1: the title names ${title[1]} ${title[2]}, the file name ${named[1]} ${named[2]}`)
  }
  if (title !== null && commit !== null && !commit[1].startsWith(title[2])) {
    faults.push(`${name}:4: the commit does not start with the title's ${title[2]}`)
  }
  const table = HEAD_LINES.length
  if (lines[table] !== TABLE_HEAD || lines[table + 1] !== TABLE_RULE) {
    faults.push(`${name}:${table + 1}: the table head is not "${TABLE_HEAD}"`)
  }
  for (let k = table + 2; k < lines.length; k += 1) {
    if (lines[k] === '' && k === lines.length - 1) break
    const row = ROW.exec(lines[k])
    if (row === null) faults.push(`${name}:${k + 1}: not a row "| file | runner | n | n | n |"`)
    else if (row[1].startsWith('/') || row[1].includes('..')) faults.push(`${name}:${k + 1}: the file is not relative`)
  }
  lines.forEach((line, index) => {
    if (ABSOLUTE_PATH.test(line)) faults.push(`${name}:${index + 1}: an absolute path`)
    if (accountName && accountName.length >= 3 && line.toLowerCase().includes(accountName.toLowerCase())) {
      faults.push(`${name}:${index + 1}: the account name of this machine`)
    }
  })
  return faults
}

// @purity non-pure
function gitHead(root) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: root, encoding: 'utf8' })
  return { sha, dirty: status.trim() !== '' }
}

// Summary: writes the record of one gate run and keeps the full reports in scratch/test-reports/.
// @purity non-pure
export function writeTestRecord({ gate, verdict, vitestReport, playwrightReport, root = ROOT, now = new Date() }) {
  const { sha, dirty } = gitHead(root)
  const read = (path) => (path !== undefined && existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined)
  const vitest = read(vitestReport)
  const playwright = read(playwrightReport)
  const writtenAt = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const text = recordText({
    gate, sha, dirty, verdict, writtenAt,
    vitest: vitest === undefined ? new Map() : vitestCounts(vitest, root),
    playwright: playwright === undefined ? new Map() : playwrightCounts(playwright, root),
  })
  const name = `${writtenAt.slice(0, 10)}-${gate}-${sha.slice(0, 12)}.md`
  const faults = recordFaults(name, text, userInfo().username)
  if (faults.length > 0) throw new Error(`the record would break its own shape:\n    ${faults.join('\n    ')}`)
  mkdirSync(join(root, RECORD_DIR), { recursive: true })
  writeFileSync(join(root, RECORD_DIR, name), text)
  const keep = join(root, LOCAL_REPORT_DIR, `${writtenAt.replace(/[:]/g, '')}-${gate}-${sha.slice(0, 12)}`)
  mkdirSync(keep, { recursive: true })
  if (vitest !== undefined) copyFileSync(vitestReport, join(keep, 'vitest.json'))
  if (playwright !== undefined) copyFileSync(playwrightReport, join(keep, 'playwright.json'))
  return { record: `${RECORD_DIR}/${name}`, reports: posix(relative(root, keep)) }
}

// @purity non-pure
function checkAll(root = ROOT) {
  const dir = join(root, RECORD_DIR)
  if (!existsSync(dir)) {
    console.log(`OK  ${RECORD_DIR}/ does not exist yet -- no record to read (the first GT-2 writes one)`)
    return 0
  }
  const names = readdirSync(dir).filter((name) => name !== 'README.md').sort()
  const account = userInfo().username
  const faults = names.flatMap((name) => recordFaults(name, readFileSync(join(dir, name), 'utf8'), account))
  for (const fault of faults) console.log(`FAIL ${fault}`)
  if (faults.length > 0) return 1
  console.log(`OK  ${names.length} record(s) under ${RECORD_DIR}/ keep the shape, with no absolute path and no account name`)
  return 0
}

// @purity non-pure
function selfTest() {
  const sample = recordText({
    gate: 'GT-2', sha: 'a'.repeat(40), dirty: false, verdict: 'passed', writtenAt: '2026-11-24T00:00:00Z',
    vitest: new Map([['tests/unit/a.test.ts', { passed: 3, failed: 0, skipped: 1 }]]),
    playwright: new Map([['tests/system/b.test.ts', { passed: 2, failed: 1, skipped: 0 }]]),
  })
  const name = '2026-11-24-GT-2-aaaaaaaaaaaa.md'
  // Why: the precheck (check 41) refuses a drive-letter path written in a source file, so the
  // broken sample joins its drive letter at run time.
  const drivePath = ['C', ':/work/tests/unit/a.test.ts'].join('')
  const cases = [
    ['clean', name, sample, 0],
    ['an absolute path in a row', name, sample.replace('| tests/unit/a.test.ts', `| ${drivePath}`), 1],
    ['the account name', name, sample.replace('tests/system/b', 'tests/system/someaccount-b'), 1],
    ['a file name that disagrees with the title', '2026-11-24-GT-2-bbbbbbbbbbbb.md', sample, 1],
  ]
  let bad = 0
  for (const [label, file, text, wantRed] of cases) {
    const red = recordFaults(file, text, 'someaccount').length > 0 ? 1 : 0
    console.log(`${red === wantRed ? 'OK  ' : 'FAIL'} self-test: ${label} -> ${red ? 'red' : 'green'}`)
    if (red !== wantRed) bad += 1
  }
  return bad === 0 ? 0 : 1
}

// @purity non-pure
function main(argv) {
  if (argv[0] === '--check') return checkAll()
  if (argv[0] === '--self-test') return selfTest()
  if (argv[0] === '--write') {
    const gate = argv[argv.indexOf('--gate') + 1]
    const verdict = argv[argv.indexOf('--verdict') + 1]
    const reports = argv.slice(1).filter((one, k, all) => !one.startsWith('--') && !['--gate', '--verdict'].includes(all[k - 1]))
    const written = writeTestRecord({ gate, verdict, vitestReport: reports[0], playwrightReport: reports[1] })
    console.log(`wrote ${written.record}; the full reports are in ${written.reports}`)
    return 0
  }
  console.log('usage: node tools/gate/test-record.mjs --check | --self-test | ' +
    '--write --gate GT-2 --verdict passed <vitest.json> [<playwright.json>]')
  return 2
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = main(process.argv.slice(2))
}

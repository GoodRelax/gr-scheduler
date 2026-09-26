// Runs one gate of table GT (docs/development-rules/04-verification.md section 4) and holds its reds
// against tests/known-red.txt (section 3.9).
//
//   node tools/gate/run-gate.mjs GT-1   commit:  precheck, typecheck, gen:check, vitest, check.sh
//   node tools/gate/run-gate.mjs GT-2   push:    precheck --unpushed, GT-1, vite build,
//                                                use-case tests (file://) and e2e, parity
//
// The gate stops on the first step that fails, on a red that no line of tests/known-red.txt names,
// and on a line whose case came out green (unless the line says flaky). It runs in the root checkout
// only: the MSPDI schema is local-only (JDG-644), and without it the cases that read it are skipped,
// which a gate must not take for green. It never sets GRS_PERF (JDG-640, JDG-643) and removes it,
// with GRS_UC_SHOW_MISMATCH, from the environment the steps see.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const KNOWN_RED = 'tests/known-red.txt'
const MSPDI_XSD_LIST = 'tests/fixtures/mspdi-xsd.json'
const PLAYWRIGHT_PLACES = ['tests/usecase/', 'tests/system/', 'tests/nfr/']
const RED_STATES = new Set(['failed', 'timedOut', 'interrupted'])
const NEVER_PASSED_ON = ['GRS_PERF', 'GRS_UC_SHOW_MISMATCH']

const posix = (path) => path.split('\\').join('/')

// ------------------------------------------------------------ known-red.txt ----

export function readKnownRed(text) {
  const lines = []
  const faults = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) return
    const fields = line.split(' | ').map((one) => one.trim())
    const where = `${KNOWN_RED}:${index + 1}`
    if (fields.length !== 6) {
      faults.push(`${where}: ${fields.length} fields, expected 6 (DFC | file | case | message | flaky | note)`)
      return
    }
    const [dfc, file, testCase, message, flaky, note] = fields
    if (!/^DFC-(\d+|nnn)$/.test(dfc)) faults.push(`${where}: "${dfc}" is not DFC-<number> or DFC-nnn`)
    if (flaky !== 'flaky' && flaky !== '-') faults.push(`${where}: the flaky field is "${flaky}", not flaky or -`)
    if (testCase === '' || testCase === '-') faults.push(`${where}: names no case`)
    lines.push({ where, dfc, file, testCase, message, flaky: flaky === 'flaky', note })
  })
  return { lines, faults }
}

// ----------------------------------------------------------- the two reports ----

export function vitestOutcomes(report) {
  const outcomes = []
  for (const file of report.testResults ?? []) {
    const path = posix(relative(ROOT, file.name))
    const cases = file.assertionResults ?? []
    for (const one of cases) {
      const title = [...(one.ancestorTitles ?? []), one.title].join(' > ')
      if (one.status === 'failed') {
        outcomes.push({ file: path, title, state: 'red', message: (one.failureMessages ?? []).join('\n') })
      } else if (one.status === 'passed') {
        outcomes.push({ file: path, title, state: 'green', message: '' })
      }
    }
    if (file.status === 'failed' && !cases.some((one) => one.status === 'failed')) {
      outcomes.push({ file: path, title: '(the file failed to load)', state: 'red', message: file.message ?? '' })
    }
  }
  return outcomes
}

export function playwrightOutcomes(report) {
  const outcomes = []
  const testDir = report.config?.rootDir ?? join(ROOT, 'tests')
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      const file = posix(relative(ROOT, resolve(testDir, spec.file)))
      const title = [...titles, spec.title].join(' > ')
      for (const run of spec.tests ?? []) {
        const last = (run.results ?? []).at(-1)
        if (last === undefined || last.status === 'skipped') continue
        const message = (last.errors ?? []).map((error) => error.message ?? '').join('\n')
        if (RED_STATES.has(last.status)) {
          outcomes.push({ file, title, state: 'red', message })
        } else if (run.expectedStatus === 'failed') {
          // WHY: a test.fail case that passes is the app now matching the specification; it is
          // reported as green so its known-red line, or its mark, is removed.
          outcomes.push({ file, title, state: 'green', message: 'a test.fail case passed', markedFail: true })
        } else {
          outcomes.push({ file, title, state: 'green', message: '' })
        }
      }
    }
    for (const child of suite.suites ?? []) {
      walk(child, child.file !== undefined && child.title === child.file ? titles : [...titles, child.title])
    }
  }
  for (const top of report.suites ?? []) walk(top, [])
  return outcomes
}

// ------------------------------------------------------------ the comparison ----

const names = (line, outcome) =>
  outcome.file === line.file &&
  outcome.title.includes(line.testCase) &&
  (line.message === '-' || outcome.message.includes(line.message))

export function judge(outcomes, lines) {
  const problems = []
  const reds = outcomes.filter((one) => one.state === 'red')
  for (const red of reds) {
    if (!lines.some((line) => names(line, red))) {
      problems.push(`red, and no line of ${KNOWN_RED} names it: ${red.file} > ${red.title}\n` +
        `      ${red.message.split('\n').find((text) => text.trim() !== '') ?? ''}`)
    }
  }
  for (const line of lines) {
    if (reds.some((red) => names(line, red))) continue
    const sameCase = outcomes.filter((one) => one.file === line.file && one.title.includes(line.testCase))
    if (line.flaky) continue
    if (sameCase.length === 0) {
      problems.push(`${line.where} ${line.dfc}: no case of this run matches it -- a stale line (${line.note})`)
    } else {
      problems.push(`${line.where} ${line.dfc}: its case is green now -- the coordinator removes the line ` +
        `(and the test.fail mark, if any) (${line.note})`)
    }
  }
  for (const green of outcomes.filter((one) => one.markedFail)) {
    if (!lines.some((line) => line.file === green.file && green.title.includes(line.testCase))) {
      problems.push(`a test.fail case passed and no line names it: ${green.file} > ${green.title}`)
    }
  }
  const held = lines.filter((line) => reds.some((red) => names(line, red)))
  return { problems, held, reds: reds.length }
}

// ----------------------------------------------------------------- the steps ----

function childEnvironment() {
  const env = { ...process.env }
  for (const name of NEVER_PASSED_ON) {
    if (env[name] !== undefined) console.log(`gate: ${name} removed from the environment of every step`)
    delete env[name]
  }
  return env
}

function findInNodeModules(inside) {
  for (let dir = ROOT; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', inside)
    if (existsSync(candidate)) return candidate
    if (dirname(dir) === dir) throw new Error(`gate: node_modules/${inside} is not found above ${ROOT}`)
  }
}

function run(label, command, args, env, { shell = false, extraEnv = {} } = {}) {
  console.log(`\n=== gate: ${label}`)
  const result = spawnSync(command, args, { cwd: ROOT, env: { ...env, ...extraEnv }, stdio: 'inherit', shell })
  if (result.error !== undefined) throw result.error
  return result.status ?? 1
}

function mustPass(label, command, env) {
  const status = run(label, command, [], env, { shell: true })
  if (status !== 0) stop(`${label} exited ${status}`)
}

class GateStopped extends Error {}

function stop(why) {
  throw new GateStopped(why)
}

function holdAgainstTheList(label, outcomes, lines) {
  const { problems, held, reds } = judge(outcomes, lines)
  console.log(`\n=== gate: ${label} -- ${outcomes.length} cases read, ${reds} red, ` +
    `${held.length} known-red lines held`)
  for (const line of held) console.log(`    known red ${line.dfc}: ${line.note}`)
  if (problems.length > 0) {
    for (const one of problems) console.log(`    ⛔ ${one}`)
    stop(`${problems.length} difference(s) from ${KNOWN_RED} in ${label}`)
  }
}

function readReport(path, label) {
  if (!existsSync(path)) stop(`${label} wrote no report (${path})`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

function main(gate) {
  if (gate !== 'GT-1' && gate !== 'GT-2') {
    console.log('usage: node tools/gate/run-gate.mjs GT-1|GT-2')
    process.exit(2)
  }
  const { schemas } = JSON.parse(readFileSync(join(ROOT, MSPDI_XSD_LIST), 'utf8'))
  const missing = schemas.filter((path) => !existsSync(join(ROOT, path)))
  if (missing.length > 0) {
    stop(`the MSPDI schema is absent (${missing.join(', ')}). It is local-only (JDG-644), so the ` +
      'cases that read it would be skipped here -- run the gate in the root checkout')
  }
  const listed = readKnownRed(readFileSync(join(ROOT, KNOWN_RED), 'utf8'))
  if (listed.faults.length > 0) stop(`${KNOWN_RED} cannot be read:\n    ${listed.faults.join('\n    ')}`)
  const inVitest = listed.lines.filter((line) => !PLAYWRIGHT_PLACES.some((place) => line.file.startsWith(place)))
  const inPlaywright = listed.lines.filter((line) => PLAYWRIGHT_PLACES.some((place) => line.file.startsWith(place)))

  const env = childEnvironment()
  const scratch = mkdtempSync(join(tmpdir(), 'grs-gate-'))
  try {
    if (gate === 'GT-2') mustPass('precheck of the unpushed commits', 'python tools/precheck.py --unpushed', env)
    mustPass('precheck', 'npm run precheck', env)
    mustPass('typecheck', 'npm run typecheck', env)
    mustPass('gen:check', 'npm run gen:check', env)

    const vitestReport = join(scratch, 'vitest.json')
    run('vitest', process.execPath, [
      findInNodeModules(join('vitest', 'vitest.mjs')), 'run', '--passWithNoTests',
      '--reporter=default', '--reporter=json', `--outputFile.json=${vitestReport}`,
    ], env)
    holdAgainstTheList('vitest', vitestOutcomes(readReport(vitestReport, 'vitest')), inVitest)

    mustPass('check.sh', 'npm run check', env)
    if (gate === 'GT-1') {
      console.log(`\n✅ gate GT-1 passed`)
      return
    }

    mustPass('vite build', 'npm run build', env)
    const playwrightReport = join(scratch, 'playwright.json')
    run('use-case tests (file://) and e2e', process.execPath, [
      findInNodeModules(join('@playwright', 'test', 'cli.js')), 'test', '--reporter=list,json',
    ], env, { extraEnv: { PLAYWRIGHT_JSON_OUTPUT_NAME: playwrightReport } })
    holdAgainstTheList('playwright', playwrightOutcomes(readReport(playwrightReport, 'playwright')), inPlaywright)

    mustPass('parity', 'npm run parity', env)
    console.log(`\n✅ gate GT-2 passed`)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main(process.argv[2])
  } catch (error) {
    if (!(error instanceof GateStopped)) throw error
    console.log(`\n⛔ gate stopped: ${error.message}`)
    process.exitCode = 1
  }
}

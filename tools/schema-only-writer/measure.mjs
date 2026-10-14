// Measure GRS JSON files written by a schema-only writer (CR-751 X-14, JDG-2040).
//
// Usage (from the checkout root):
//   node tools/schema-only-writer/measure.mjs <schema.json> <file.json>... \
//        [--app <index.html>] [--out-dir <dir>]
//
// For each file it measures:
//   1. schemaViolations -- validate.py beside this file (jsonschema, draft 2020-12)
//   2. the shipped page (default dist/index.html of this checkout): the header
//      "Open" (IC-1) answered by a stubbed showOpenFilePicker, then "replace"
//      (IC-71) on the Open Chooser -> refused / notices / console errors /
//      page exceptions
//   3. the Agent API (IC-20) readDocument(): every task's percentComplete,
//      start, finish, actualStart, actualFinish, stop compared with the file
//      -> recounts
// and writes <name>.measure.json next to the input (or into --out-dir).
//
// pass = violations 0, refused false, notices 0, errors 0, exceptions 0,
// recounts 0. It is a measurement, not a gate: the exit code is 0 unless the
// arguments are wrong.
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { open, page, press, pressAt, until, close } from '../probe/harness.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const VALIDATOR = path.join(HERE, 'validate.py')
const DEFAULT_APP = path.resolve(HERE, '../../dist/index.html')

// Entrances of table T-109 (docs/spec) and parts of table T-103.
const OPEN_ENTRANCE = 'IC-1'
const REPLACE_ENTRANCE = 'IC-71'
const AGENT_API_ENTRANCE = 'IC-20'
const AGENT_API_GLOBAL = 'grSchedulerAgentApi'
const DOCUMENT_TITLE = '[data-role="Document Title"]'
const OPEN_CHOOSER = '[data-role="Open Chooser"]'
const PROCEED = '[data-role="Confirmation"] [data-confirmation-answer="proceed"]'
const SCHEDULE_CANVAS = '[data-role="Schedule Canvas"]'

const COMPARED_FIELDS = ['percentComplete', 'start', 'finish', 'actualStart', 'actualFinish', 'stop']
const WAIT_MS = 6000
const AFTER_READ_SETTLE_MS = 800

function usage(message) {
  if (message) console.error(message)
  console.error('usage: node tools/schema-only-writer/measure.mjs <schema.json> <file.json>... '
    + '[--app <index.html>] [--out-dir <dir>]')
  process.exit(2)
}

function parseArgs(argv) {
  const positional = []
  let app = DEFAULT_APP
  let outDir = null
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--app') { app = argv[++i] ?? usage('--app needs a path'); continue }
    if (argv[i] === '--out-dir') { outDir = argv[++i] ?? usage('--out-dir needs a path'); continue }
    if (argv[i].startsWith('--')) usage(`unknown option ${argv[i]}`)
    positional.push(argv[i])
  }
  if (positional.length < 2) usage()
  const [schema, ...files] = positional
  for (const one of [schema, app, ...files]) if (!existsSync(one)) usage(`not found: ${one}`)
  if (outDir !== null && !existsSync(outDir)) usage(`not found: ${outDir}`)
  return { schema, files, app: path.resolve(app), outDir }
}

// ------------------------------------------------------------ schema ---------

function validate(schema, file) {
  const run = spawnSync('python', ['-I', VALIDATOR, schema, file], { encoding: 'utf8' })
  if (run.status !== 0) {
    const why = (run.stderr || String(run.error ?? '')).trim().split('\n').slice(-3).join(' | ')
    return { count: 1, messages: [`validator failed: ${why}`], formatsUnchecked: [] }
  }
  return JSON.parse(run.stdout)
}

// ------------------------------------------------------------ the page -------

/** Stand in for the host's file picker: the header Open hands over this file. */
function pickerStub({ name, text }) {
  const handle = {
    kind: 'file',
    name,
    getFile: async () => new File([text], name, { type: 'application/json' }),
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    isSameEntry: async (other) => Boolean(other) && other.name === name,
    createWritable: async () => ({ write: async () => {}, close: async () => {}, abort: async () => {} }),
  }
  window.showOpenFilePicker = async () => [handle]
}

/** Notices standing on screen: reason ids from data-notice-box, and their words. */
async function readNotices() {
  return page().evaluate(() => {
    const boxes = [...document.querySelectorAll('[data-notice-box]')].map((box) => ({
      reasons: (box.getAttribute('data-notice-box') ?? '').split(' ').filter(Boolean),
      text: (box.textContent ?? '').trim(),
    }))
    const reports = [...document.querySelectorAll('[data-report-reason]')].map((one) => ({
      reasons: [one.getAttribute('data-report-reason') ?? ''],
      text: (one.textContent ?? '').trim(),
    }))
    const found = [...boxes, ...reports]
    if (found.length > 0) return found
    // Fallback: words in the Notification Area that carry no reason attribute.
    return [...document.querySelectorAll('[data-role="Notification Area"]')]
      .map((area) => (area.textContent ?? '').trim())
      .filter((words) => words.length > 0)
      .map((words) => ({ reasons: [], text: words }))
  })
}

async function titleText() {
  return page().evaluate((selector) => document.querySelector(selector)?.textContent ?? null, DOCUMENT_TITLE)
}

async function quietly(probe, label) {
  try { return await until(probe, label, { timeout: WAIT_MS }) } catch { return null }
}

async function pressSelector(selector) {
  const box = await page().evaluate((wanted) => {
    const found = document.querySelector(wanted)
    if (found === null) return null
    const r = found.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, selector)
  if (box === null) return false
  await pressAt(box.x, box.y)
  return true
}

async function readInApp(app, file, text) {
  const consoleErrors = []
  const pageExceptions = []
  const steps = []
  await open({
    app: pathToFileURL(app).href,
    beforeGoto: async (tab) => {
      tab.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
      tab.on('pageerror', (thrown) => pageExceptions.push(String(thrown?.message ?? thrown)))
      await tab.addInitScript(pickerStub, { name: path.basename(file), text })
    },
  })
  await quietly(`document.querySelector('${SCHEDULE_CANVAS}') !== null`, 'canvas')
  const titleBefore = await titleText()
  const noticesBefore = await readNotices()

  steps.push(`${OPEN_ENTRANCE} pressed: ${await press(OPEN_ENTRANCE)}`)
  const chooser = await quietly(async () =>
    (await page().$(OPEN_CHOOSER)) !== null || (await readNotices()).length > noticesBefore.length,
  'Open Chooser or a notice')
  const chooserShown = (await page().$(OPEN_CHOOSER)) !== null
  steps.push(`${OPEN_CHOOSER} shown: ${chooserShown}${chooser === null ? ' (timed out)' : ''}`)
  if (chooserShown) {
    steps.push(`${REPLACE_ENTRANCE} pressed: ${await press(REPLACE_ENTRANCE)}`)
    await page().waitForTimeout(250)
    if ((await page().$(PROCEED)) !== null) steps.push(`confirmation proceed pressed: ${await pressSelector(PROCEED)}`)
  }
  await quietly(async () =>
    (await titleText()) !== titleBefore || (await readNotices()).length > noticesBefore.length,
  'title change or a notice')
  await page().waitForTimeout(AFTER_READ_SETTLE_MS)
  const titleAfter = await titleText()
  const notices = await readNotices()

  steps.push(`${AGENT_API_ENTRANCE} pressed: ${await press(AGENT_API_ENTRANCE)}`)
  const apiShown = await quietly(`typeof window.${AGENT_API_GLOBAL} === 'object'`, 'Agent API')
  let readBack = null
  if (apiShown !== null) {
    readBack = await page().evaluate(({ global, fields }) => {
      const doc = window[global].readDocument()
      return {
        title: doc?.schedule?.project?.title ?? null,
        tasks: (doc?.schedule?.tasks ?? []).map((task) =>
          Object.fromEntries([['uid', task.uid], ['name', task.name ?? null], ...fields.map((f) => [f, task[f] ?? null])])),
      }
    }, { global: AGENT_API_GLOBAL, fields: COMPARED_FIELDS })
  } else {
    steps.push(`${AGENT_API_GLOBAL} not published`)
  }
  return { titleBefore, titleAfter, noticesBefore, notices, consoleErrors, pageExceptions, readBack, steps }
}

// ------------------------------------------------------------ privacy --------

// The report may be committed to a PUBLIC repository. Console texts can carry
// file:// URLs of this machine, so the home folder is masked in every text.
function masked(text) {
  const home = homedir()
  const forms = [pathToFileURL(home).href, home, home.split(path.sep).join('/')]
  return forms.reduce((said, form) => said.split(form).join('<home>'), String(text))
}

// ------------------------------------------------------------ comparing ------

function recount(fileTasks, readTasks) {
  const rows = []
  const readByUid = new Map(readTasks.map((task) => [task.uid, task]))
  const fileUids = new Set()
  for (const task of fileTasks) {
    fileUids.add(task.uid)
    const back = readByUid.get(task.uid)
    if (back === undefined) { rows.push({ uid: task.uid, field: '(task)', file: 'present', app: 'absent' }); continue }
    for (const field of COMPARED_FIELDS) {
      // An absent optional column reads as null; that is not a recount.
      const written = task[field] ?? null
      if (JSON.stringify(written) !== JSON.stringify(back[field])) {
        rows.push({ uid: task.uid, field, file: written, app: back[field] })
      }
    }
  }
  for (const back of readTasks) {
    if (!fileUids.has(back.uid)) rows.push({ uid: back.uid, field: '(task)', file: 'absent', app: 'present' })
  }
  return rows
}

async function measure(schema, app, file, outDir) {
  const text = readFileSync(file, 'utf8')
  let parsed = null
  let parseError = null
  try { parsed = JSON.parse(text) } catch (thrown) { parseError = String(thrown.message) }
  const violations = parseError === null
    ? validate(schema, file)
    : { count: 1, messages: [`not JSON: ${parseError}`], formatsUnchecked: [] }

  const seen = await readInApp(app, file, text)
  const fileTitle = parsed?.schedule?.project?.title ?? null
  const fileTasks = Array.isArray(parsed?.schedule?.tasks) ? parsed.schedule.tasks : []
  // Refused: the document GRS holds is not this file. The title in the header
  // and the title the Agent API reads back must both be the file's (a null
  // title shows as empty), and so must the tasks by uid and name -- a writer
  // may leave the title null, so the title alone cannot tell.
  const titleOf = (value) => value ?? ''
  const signature = (tasks) => tasks.map((task) => `${task.uid}:${task.name ?? ''}`).sort().join('|')
  const refused = seen.readBack === null
    || titleOf(seen.readBack.title) !== titleOf(fileTitle)
    || titleOf(seen.titleAfter) !== titleOf(fileTitle)
    || signature(seen.readBack.tasks) !== signature(fileTasks)
  const recounts = refused || seen.readBack === null ? [] : recount(fileTasks, seen.readBack.tasks)
  const standing = new Set(seen.noticesBefore.map((n) => n.text))
  const newNotices = seen.notices.filter((n) => !standing.has(n.text))

  const report = {
    file: path.basename(file),
    app: path.basename(path.dirname(app)) + '/' + path.basename(app),
    measuredAt: new Date().toISOString(),
    schemaViolations: { ...violations, messages: violations.messages.map(masked) },
    refused,
    title: { file: fileTitle, headerBefore: seen.titleBefore, headerAfter: seen.titleAfter, readBack: seen.readBack?.title ?? null },
    notices: { count: newNotices.length, items: newNotices, standingBeforeOpen: seen.noticesBefore },
    consoleErrors: { count: seen.consoleErrors.length, items: seen.consoleErrors.map(masked) },
    pageExceptions: { count: seen.pageExceptions.length, items: seen.pageExceptions.map(masked) },
    recounts: { count: recounts.length, fields: COMPARED_FIELDS, tasksInFile: fileTasks.length, tasksReadBack: seen.readBack?.tasks.length ?? 0, rows: recounts },
    steps: seen.steps,
  }
  report.pass = violations.count === 0 && !refused && newNotices.length === 0
    && seen.consoleErrors.length === 0 && seen.pageExceptions.length === 0 && recounts.length === 0

  const outPath = path.join(outDir ?? path.dirname(file), path.basename(file).replace(/\.json$/i, '') + '.measure.json')
  writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  return { report, outPath }
}

function summaryLine(report) {
  return `${report.pass ? 'PASS' : 'FAIL'} ${report.file}: violations=${report.schemaViolations.count}`
    + ` refused=${report.refused} notices=${report.notices.count} errors=${report.consoleErrors.count}`
    + ` exceptions=${report.pageExceptions.count} recounts=${report.recounts.count}`
    + ` (tasks file=${report.recounts.tasksInFile} readBack=${report.recounts.tasksReadBack})`
}

const { schema, files, app, outDir } = parseArgs(process.argv.slice(2))
try {
  for (const file of files) {
    const { report, outPath } = await measure(schema, app, file, outDir)
    if (report.schemaViolations.count > 0) for (const m of report.schemaViolations.messages.slice(0, 5)) console.log(`  violation ${m}`)
    if (report.schemaViolations.formatsUnchecked.length > 0) console.log(`  note: formats not checked by this jsonschema: ${report.schemaViolations.formatsUnchecked.join(', ')}`)
    for (const n of report.notices.items) console.log(`  notice [${n.reasons.join(' ')}] ${n.text.slice(0, 160)}`)
    for (const e of report.consoleErrors.items.slice(0, 5)) console.log(`  console error ${e.slice(0, 160)}`)
    for (const e of report.pageExceptions.items.slice(0, 5)) console.log(`  exception ${e.slice(0, 160)}`)
    for (const r of report.recounts.rows.slice(0, 10)) console.log(`  recount uid=${r.uid} ${r.field}: file=${JSON.stringify(r.file)} app=${JSON.stringify(r.app)}`)
    console.log(summaryLine(report))
    const shown = path.relative(process.cwd(), outPath)
    console.log(`  report: ${shown.startsWith('..') ? outPath : shown}`)
  }
} finally {
  await close()
}

// End-to-end check of the server-sync demo: the real PowerShell server, the built
// GRS-Demo.html and Chromium (Playwright from the repository's node_modules).
//
//   npm run build:demo
//   node tools/gate/gate-queue.mjs run -- node demo/server-sync/tests/server-sync-demo.e2e.mjs
//
// The server writes into a copy of schedule-data in the temp folder, never into dist-demo.
// Windows only (the server is Windows PowerShell 5.1).

import { spawn } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const BUILT = join(ROOT, 'dist-demo', 'grs-server-sync-demo')
const PORT = 18443
const ORIGIN = `https://localhost:${PORT}`
const SMALL = 'sample-small-website-renewal.ja.json'
// A Japanese name, spelled in escapes to keep the source ASCII (JDG-2595).
const COPY = 'Demo Copy \u65e5\u672c\u8a9e.json'
const OTHER = 'Three-Year Product Plan.json'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === '' ? '' : `  (${detail})`}`)
}

function startServer(dataDir) {
  return new Promise((resolveStart, rejectStart) => {
    const server = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', join(BUILT, 'server', 'grs-demo-server.ps1'),
      '-Port', String(PORT), '-NoBrowser', '-DataDir', dataDir,
    ])
    let log = ''
    const timer = setTimeout(() => rejectStart(new Error(`the server did not start:\n${log}`)), 60_000)
    server.stdout.on('data', (chunk) => {
      log += chunk.toString()
      if (log.includes('GRS demo server:')) {
        clearTimeout(timer)
        resolveStart(server)
      }
    })
    server.stderr.on('data', (chunk) => { log += chunk.toString() })
    server.on('exit', (code) => rejectStart(new Error(`the server exited (${code}):\n${log}`)))
  })
}

// GRS redraws parts of the screen by replacing them, so a box read mid-redraw can be null: read again.
async function pressCenter(page, selector) {
  const until = Date.now() + 15_000
  while (Date.now() < until) {
    const one = page.locator(selector).first()
    await one.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    const box = await one.boundingBox().catch(() => null)
    if (box !== null) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      return
    }
    await page.waitForTimeout(200)
  }
  throw new Error(`${selector} is not on the screen`)
}

async function waitFor(condition, timeoutMs, what) {
  const until = Date.now() + timeoutMs
  while (Date.now() < until) {
    if (await condition()) return true
    await new Promise((r) => setTimeout(r, 200))
  }
  console.log(`  timed out waiting for ${what}`)
  return false
}

async function isShown(locator) {
  return await locator.first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false)
}

async function openedFileName(page) {
  return (await page.locator('[data-role="Opened File Name"]').first().textContent({ timeout: 5_000 }).catch(() => '')) ?? ''
}

// The answer GRS's own question gets when one shows (replace the unsaved document, or not).
async function answerConfirmation(page, answer) {
  const button = page.locator(`[data-role="Confirmation"] [data-confirmation-answer="${answer}"]`)
  if (await button.count()) await pressCenter(page, `[data-role="Confirmation"] [data-confirmation-answer="${answer}"]`)
}

async function pullFromServer(page, name) {
  await pressCenter(page, '[data-icon="IC-1"]')
  await page.locator('[data-grs-demo="panel"] button:has-text("Dummy Server")').click()
  await page.locator(`[data-grs-demo="server-file"][data-name="${name}"]`).click()
  await page.locator('[data-grs-demo="confirm"]').click()
  await pressCenter(page, '[data-icon="IC-71"]')
  await page.waitForTimeout(800)
  await answerConfirmation(page, 'proceed')
}

async function openServerSave(page) {
  await pressCenter(page, '[data-icon="IC-2"]')
  await pressCenter(page, '[data-grs-demo-server-save]')
  await page.locator('[data-grs-demo="file-name"]').waitFor({ timeout: 10_000 })
}

if (!existsSync(join(BUILT, 'GRS-Demo.html'))) {
  console.error('Build the demo first: npm run build:demo')
  process.exit(1)
}

const dataDir = mkdtempSync(join(tmpdir(), 'grs-demo-data-'))
cpSync(join(BUILT, 'schedule-data'), dataDir, { recursive: true })
const server = await startServer(dataDir)
const browser = await chromium.launch()
const pageErrors = []
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 }, locale: 'en-US' })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text())
  })
  const serverCalls = []
  page.on('request', (request) => {
    if (request.url().includes('/api/files')) serverCalls.push(`${request.method()} ${decodeURIComponent(new URL(request.url()).pathname)}`)
  })
  await page.goto(`${ORIGIN}/`)
  await page.waitForSelector('[data-icon="IC-1"]', { timeout: 60_000 })
  await page.waitForTimeout(1_000)

  // UC-1: the logo reads Demo in red and fits its seat (JDG-2580, JDG-2590).
  const logo = await page.evaluate(() => {
    const one = document.querySelector('[data-role="Branding"]')
    if (one === null) return null
    const seat = one.parentElement.getBoundingClientRect()
    const text = one.getBoundingClientRect()
    return { text: one.textContent, color: getComputedStyle(one).color, fits: text.right <= seat.right + 0.5 }
  })
  check('logo reads Demo', logo?.text === 'Demo', JSON.stringify(logo))
  check('logo is red', logo?.color === 'rgb(211, 47, 47)')
  check('logo fits its seat', logo?.fits === true)

  // UC-2 by keyboard: Ctrl+O asks the place first; Escape closes it.
  await page.keyboard.press('Control+o')
  const askedByKey = await isShown(page.locator('[data-grs-demo="panel"]:has-text("Open from")'))
  check('Ctrl+O asks Open from', askedByKey)
  await page.keyboard.press('Escape')
  check('Escape closes the place window', await waitFor(async () => (await page.locator('[data-grs-demo="panel"]').count()) === 0, 5_000, 'panel gone'))

  // UC-2: pull a file from the server through GRS's own open flow.
  await pressCenter(page, '[data-icon="IC-1"]')
  await page.locator('[data-grs-demo="panel"] button:has-text("Dummy Server")').click()
  await page.locator('[data-grs-demo="server-file"]').first().waitFor({ timeout: 10_000 })
  const listed = await page.locator('[data-grs-demo="server-file"]').count()
  check('server list shows the three samples', listed === 3, `rows ${listed}`)
  await page.locator('[data-grs-demo="panel"] button:has-text("Cancel")').click()
  await pullFromServer(page, SMALL)
  check('pulled file is the opened file', await waitFor(async () => (await openedFileName(page)) === SMALL, 30_000, 'opened file name'), await openedFileName(page))

  // UC-3: Ctrl+S writes the server file without asking (JDG-2589).
  const smallPath = join(dataDir, SMALL)
  const before = readFileSync(smallPath, 'utf8')
  await page.keyboard.press('Control+s')
  const updated = await waitFor(async () => readFileSync(smallPath, 'utf8') !== before, 30_000, 'the server file to change')
  check('Ctrl+S updates the server file', updated, serverCalls.slice(-3).join(', '))
  check('the written file is JSON', (() => { try { JSON.parse(readFileSync(smallPath, 'utf8')); return true } catch { return false } })())

  // UC-4: Save As -> the red sixth choice -> another name (Japanese allowed, JDG-2595).
  await pressCenter(page, '[data-icon="IC-2"]')
  const sixth = page.locator('[data-grs-demo-server-save]')
  check('Save As shows the Dummy Server choice', (await isShown(sixth)) && (await sixth.count()) === 1)
  const sixthColor = await sixth.first().evaluate((one) => getComputedStyle(one).backgroundColor)
  check('the Dummy Server choice is red', sixthColor === 'rgb(211, 47, 47)', sixthColor)
  await pressCenter(page, '[data-grs-demo-server-save]')
  const nameBox = page.locator('[data-grs-demo="file-name"]')
  await nameBox.waitFor({ timeout: 10_000 })
  const suggested = await nameBox.inputValue()
  check('the name box starts with a .json name', suggested.endsWith('.json'), suggested)
  await nameBox.fill('bad:name')
  await page.locator('[data-grs-demo="confirm"]').click()
  const refused = await page.locator('[data-grs-demo="problem"]').textContent()
  check('a name Windows refuses is refused', (refused ?? '').length > 0, refused ?? '')
  await nameBox.fill(COPY)
  await page.locator('[data-grs-demo="confirm"]').click()
  check('Save under another name writes the server', await waitFor(async () => existsSync(join(dataDir, COPY)), 30_000, COPY))
  check('the new name becomes the opened file', await waitFor(async () => (await openedFileName(page)) === COPY, 15_000, 'opened file name'), await openedFileName(page))

  // UC-4: the same name again updates it after GRS's own overwrite question (DI-4, as on the PC).
  const copyTime = statSync(join(dataDir, COPY)).mtimeMs
  await new Promise((r) => setTimeout(r, 1_100))
  await openServerSave(page)
  check('the name box holds the opened file name', (await nameBox.inputValue()) === COPY, await nameBox.inputValue())
  await page.locator('[data-grs-demo="confirm"]').click()
  check('the same name asks before overwriting, as on the PC', await isShown(page.locator('[data-role="Confirmation"]')))
  await answerConfirmation(page, 'proceed')
  check('Save under the same name updates it', await waitFor(async () => statSync(join(dataDir, COPY)).mtimeMs !== copyTime, 30_000, 'mtime'))

  // UC-4: a different document's file gets GRS's own overwrite question; Cancel keeps it.
  const otherBefore = readFileSync(join(dataDir, OTHER))
  await openServerSave(page)
  await nameBox.fill(OTHER)
  await page.locator('[data-grs-demo="confirm"]').click()
  const asked = await isShown(page.locator('[data-role="Confirmation"]'))
  check('another document asks before overwriting', asked)
  await answerConfirmation(page, 'cancel')
  await page.waitForTimeout(1_500)
  check('Cancel leaves that file alone', readFileSync(join(dataDir, OTHER)).equals(otherBefore))

  // UC-7: with the server stopped, Ctrl+S fails without breaking the page.
  server.kill()
  await page.waitForTimeout(1_000)
  const copyBytes = readFileSync(join(dataDir, COPY))
  await page.keyboard.press('Control+s')
  await page.waitForTimeout(3_000)
  check('a stopped server leaves the file as it was', readFileSync(join(dataDir, COPY)).equals(copyBytes))

  const unexpected = pageErrors.filter((text) => !/Failed to load resource|ERR_CONNECTION_REFUSED/.test(text))
  check('no page errors or CSP refusals', unexpected.length === 0, unexpected.slice(0, 3).join(' | '))
  await context.close()
} catch (error) {
  check('the run finished', false, error instanceof Error ? error.message : String(error))
} finally {
  await browser.close()
  server.kill()
  rmSync(dataDir, { recursive: true, force: true })
}

const failed = results.filter((one) => !one.ok).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

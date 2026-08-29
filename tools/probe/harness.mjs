// The shared setup every live probe was rewriting.
//
// ⛔ WHY THIS FILE EXISTS. The 2026-08-30 round wrote 123 probes under
// scratch/probe/, and nearly every one of them re-derived the same thirty
// lines: launch Chromium, open dist/index.html, wait for the first frame,
// press an entry with a REAL pointer because a synthetic .click() reaches
// nothing, and read data-role WITHOUT a filter because filtering is what made
// two separate sessions report a working feature as broken. Rebuilding that by
// hand each time is where the wall-clock went -- not in the measuring.
//
// ⛔ AND WHY IT IS HERE RATHER THAN IN scratch/. scratch/ is gitignored, so a
// helper left there is gone by the next session and the next body writes the
// thirty lines again. tools/ is tracked. Node resolves `playwright` upward
// from here to the repo's own node_modules, which is the reason probes cannot
// live in the session scratchpad outside the repository.
//
// Usage:
//   import { open, press, until, roles, textsEqual, close } from '../../tools/probe/harness.mjs'
//   const tab = await open()
//   await press('IC-79')
//   await until(() => textsEqual('%') > 0, 'percent labels appear')
//   await close()
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const APP =
  'file://' + path.resolve(HERE, '../../dist/index.html').split(path.sep).join('/')

let browser = null
let tab = null

/**
 * The shipped page, ready to be measured.
 *
 * ⭐ ONE BROWSER FOR THE WHOLE PROBE. Launching Chromium costs a second or two
 * and every probe used to pay it several times over. Call `open()` again to get
 * a fresh page in the same browser -- that is a reload, not a relaunch.
 *
 * ⚠️ `settle` is the wait for the FIRST frame. BO-1 of table T-077 holds the
 * page invisible until the size is settled, so a measurement taken before it
 * reads an empty document.
 */
export async function open({ width = 1920, height = 1080, settle = 1700,
                             clipboard = false } = {}) {
  if (browser === null) browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width, height },
    ...(clipboard ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}),
  })
  if (tab !== null) await tab.close().catch(() => {})
  tab = await context.newPage()
  await tab.goto(APP)
  await tab.waitForTimeout(settle)
  return tab
}

export function page() {
  if (tab === null) throw new Error('call open() first')
  return tab
}

export async function close() {
  if (browser !== null) await browser.close()
  browser = null
  tab = null
}

// ------------------------------------------------------------------ waiting --

/**
 * Wait until `probe` answers truthy, polling in the page.
 *
 * ⭐ THIS IS THE ONE THAT SAVES THE TIME. Probes used to sprinkle
 * `waitForTimeout(300..900)` after every action -- six per file on average, all
 * of them guesses, all of them paid in full whether or not the app had already
 * finished. Waiting on the condition finishes as soon as it is true.
 *
 * @param probe a function evaluated IN THE PAGE, or a local function taking no
 *   arguments that itself awaits page reads
 */
export async function until(probe, label = 'condition', { timeout = 5000, every = 50 } = {}) {
  const started = Date.now()
  for (;;) {
    let answer
    try {
      answer = typeof probe === 'function' ? await probe() : await page().evaluate(probe)
    } catch { answer = false }
    if (answer) return answer
    if (Date.now() - started > timeout) {
      throw new Error(`until(${label}) still false after ${timeout}ms`)
    }
    await page().waitForTimeout(every)
  }
}

/** Wait until `read()` answers something different from `was`. */
export async function untilChanged(read, was, label = 'a change', opts) {
  return until(async () => {
    const now = await read()
    return JSON.stringify(now) !== JSON.stringify(was) ? now : false
  }, label, opts)
}

// ------------------------------------------------------------------ acting ---

/**
 * Press with a REAL pointer.
 *
 * ⛔ A SYNTHETIC `.click()` REACHES NOTHING. This app builds its input from
 * pointer events, so `element.click()` leaves every entrance inert -- which is
 * how one session concluded a working feature was broken.
 */
export async function pressAt(x, y) {
  await page().mouse.move(x, y)
  await page().mouse.down()
  await page().mouse.up()
}

/** Press the entry of table T-109 with this row id. Answers false if absent. */
export async function press(icon) {
  const box = await page().evaluate((ic) => {
    const n = document.querySelector(`[data-icon="${ic}"]`)
    if (n === null) return null
    n.scrollIntoView({ block: 'nearest' })
    const r = n.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, icon)
  if (box === null) return false
  await pressAt(box.x, box.y)
  return true
}

/** Hold an entry down for `ms`, for FR-018's repeat (S-172 / S-173). */
export async function hold(icon, ms) {
  const box = await page().evaluate((ic) => {
    const r = document.querySelector(`[data-icon="${ic}"]`)?.getBoundingClientRect()
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null
  }, icon)
  if (box === null) return false
  await page().mouse.move(box.x, box.y)
  await page().mouse.down()
  await page().waitForTimeout(ms)
  await page().mouse.up()
  return true
}

export async function key(k) { await page().keyboard.press(k) }

/** Move the pointer somewhere harmless, for a hover measurement's "away" reading. */
export async function pointerAway() { await page().mouse.move(4, 1070) }

// ------------------------------------------------------------------ reading --

/**
 * Every `data-role` on the page, unfiltered.
 *
 * ⛔ DO NOT FILTER THESE WITH A REGEXP. `Export Chooser` matches neither
 * "Modal" nor "Dialog", and filtering for those is exactly how two sessions
 * reported a working surface as absent. Take them all, then look.
 */
export async function roles() {
  return page().evaluate(() =>
    [...new Set([...document.querySelectorAll('[data-role]')]
      .map((n) => n.getAttribute('data-role')))])
}

export async function count(selector) {
  return page().evaluate((s) => document.querySelectorAll(s).length, selector)
}

/** How many `<text>` in the drawing read exactly this. */
export async function textsEqual(s) {
  return page().evaluate((t) => [...document.querySelectorAll('svg text')]
    .filter((n) => (n.textContent ?? '').trim() === t).length, s)
}

/** The rows the panel drew, with the depth each carries. */
export async function rows() {
  return page().evaluate(() => [...document.querySelectorAll('[data-depth]')]
    .map((n) => ({
      depth: Number(n.getAttribute('data-depth')),
      group: (n.getAttribute('data-group-id') ?? '').slice(0, 8),
      text: (n.textContent ?? '').trim().slice(0, 20),
      y: Math.round(n.getBoundingClientRect().y),
    }))
    .sort((a, b) => a.y - b.y))
}

/** A census worth taking before and after almost any action. */
export async function census() {
  return page().evaluate(() => ({
    rows: document.querySelectorAll('[data-depth]').length,
    texts: document.querySelectorAll('svg text').length,
    polygons: document.querySelectorAll('svg polygon').length,
    faint: [...document.querySelectorAll('svg [opacity]')]
      .filter((n) => n.getAttribute('opacity') === '0.2').length,
    arrows: document.querySelectorAll('svg polyline[marker-end]').length,
    lines: document.querySelectorAll('svg line').length,
  }))
}

// ------------------------------------------- the Properties Panel, a lot used --

/**
 * ⚠️ `data-role="Properties Panel"` IS THE PANEL. `data-panel` is the divider
 * band beside it and measures 8px wide -- reading that one is how a probe
 * concluded the panel held no fields at all.
 */
export const PANEL = '[data-role="Properties Panel"]'

/** Open the panel on whatever is selected (SK-14). */
export async function openPanel() {
  await key('p')
  await until(async () => (await count(`${PANEL} [data-field-row]`)) > 0, 'the panel fills')
}

export async function fieldValue() {
  return page().evaluate((sel) => {
    const el = document.querySelector(sel)
      ?.querySelector('input[type="text"], input:not([type]), textarea')
    return el === null || el === undefined ? null : el.value
  }, PANEL)
}

/** Focus the first typed field, replace its text, and settle it the given way. */
export async function typeInField(text, settleBy = 'Enter') {
  const box = await page().evaluate((sel) => {
    const el = document.querySelector(sel)
      ?.querySelector('input[type="text"], input:not([type]), textarea')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, PANEL)
  if (box === null) return false
  await pressAt(box.x, box.y)
  await key('End')
  await key('Shift+Home')
  await page().keyboard.type(text)
  if (settleBy === 'Enter') await key('Enter')
  return true
}

export async function focused() {
  return page().evaluate(() =>
    `${document.activeElement?.tagName}/${document.activeElement?.getAttribute('type') ?? '-'}`)
}

export async function shot(name, clip) {
  await page().screenshot({
    path: path.resolve(HERE, `../../scratch/probe/${name}.png`),
    ...(clip ? { clip } : {}),
  })
}

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

/**
 * ⛔⛔ `P` IS THE COMMAND PALETTE, NOT THIS PANEL. Measured 2026-08-30: table
 * T-036's SK-14 reads 「コマンドパレットの表示を切り替える」 and points at IC-7.
 * The note that stood here called it "open the panel on whatever is selected",
 * and a probe built on that spent a whole run concluding a choice had been lost.
 *
 * ⭐ SINCE CR-304 THERE ARE EXACTLY TWO ENTRANCES (FR-072), and neither is a key:
 * MK-13 (double-click a task) and IC-17 (the App Header -- and that one shows
 * the DOCUMENT's drawing settings, not the chosen task).
 * ⚠️ The panel is always in the DOM. `display` is the predicate, not presence.
 */
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

// --------------------------------------------------- the schedule's own ink --

/** The element that IS the `Schedule Canvas` -- the pointer's shape lives on it. */
export const CANVAS = '[data-role="Schedule Canvas"]'

/**
 * The shape the app is showing at this point (IN-2 of table T-028).
 *
 * ⭐ WHY IT IS WORTH A MEMBER. Five probes of the 2026-08-29 round wrote this
 * by hand. It is also the cheapest way to ask the APP what it thinks is under
 * a point, which is a different question from what `elementFromPoint` answers.
 *
 * ⛔ IT IS THE CANVAS'S OWN `style.cursor` AND NOT THE PAGE'S. A `Panel
 * Divider` or a floating surface carries its own, and reading only this one is
 * how a session concluded that the pointer "answered nothing" over a band that
 * was answering `col-resize` -- the ledger's D-137. Ask `partAt` as well when
 * the answer is empty.
 */
export async function cursorAt(x, y) {
  await page().mouse.move(x, y)
  return page().evaluate((sel) => document.querySelector(sel)?.style.cursor ?? '', CANVAS)
}

/** What the SURFACE drew at this point -- the outermost `data-role`, or `-`. */
export async function partAt(x, y) {
  return page().evaluate(([px, py]) => {
    const el = document.elementFromPoint(px, py)
    return el === null ? '-' : (el.closest('[data-role]')?.getAttribute('data-role') ?? '-')
  }, [x, y])
}

/**
 * A point inside the `Row Area` that the app itself calls empty.
 *
 * ⭐⭐ ASK THE APP, DO NOT COMPUTE IT. Two probes of that round picked a point
 * by walking bounding boxes and both landed ON something -- once on the palette
 * floating over the canvas, once inside a task's grab slop -- and the runs that
 * followed measured nothing at all. PD-5 gives empty ground the default arrow,
 * so the app answers this question for free.
 */
export async function emptyPoint({ x0 = 300, x1 = 1700, y0 = 300, y1 = 1000, step = 17 } = {}) {
  for (let y = y0; y < y1; y += 11) {
    for (let x = x0; x < x1; x += step) {
      if ((await cursorAt(x, y)) === 'default') return { x, y }
    }
  }
  return null
}

/**
 * The shapes drawn inside the schedule, with their boxes.
 *
 * ⚠️ `fill` IS HOW A KIND IS TOLD FROM A KIND. Table T-236's rows are the only
 * thing separating a plan bar from an actual one in the drawing -- there is no
 * class and no `data-` on them. Pass the colour the theme resolved (measure it
 * once with no filter rather than deriving it).
 */
export async function shapes({ fill = null, minWidth = 4, minHeight = 4, within = null } = {}) {
  return page().evaluate(([paint, mw, mh, box]) => {
    const host = document.querySelector('[data-role="Schedule Canvas"]')
    if (host === null) return []
    return [...host.querySelectorAll('svg rect, svg polygon, svg path')]
      .filter((n) => paint === null || n.getAttribute('fill') === paint)
      .map((n) => ({ tag: n.tagName, r: n.getBoundingClientRect() }))
      .filter((o) => o.r.width >= mw && o.r.height >= mh)
      .filter((o) => box === null ||
        (o.r.x >= box.x && o.r.y >= box.y &&
         o.r.x <= box.x + box.width && o.r.y <= box.y + box.height))
      .map((o) => ({
        tag: o.tag,
        x: Math.round(o.r.x), y: Math.round(o.r.y),
        w: Math.round(o.r.width), h: Math.round(o.r.height),
        mid: { x: Math.round(o.r.x + o.r.width / 2), y: Math.round(o.r.y + o.r.height / 2) },
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x)
  }, [fill, minWidth, minHeight, within])
}

/**
 * What is drawn near a point, as a signature that survives a redraw.
 *
 * ⛔⛔ AN ELEMENT DOES NOT SURVIVE ONE. A probe of that round tagged a polygon
 * with an attribute and read it back after a change; the tree had been rebuilt
 * and the tag was gone, so two runs measured `null` and were read as "nothing
 * happened". ⭐ A place and a signature survive; a node does not.
 */
export async function signatureAt(x, y, radius = 30) {
  return page().evaluate(([px, py, r]) => {
    const host = document.querySelector('[data-role="Schedule Canvas"]')
    for (const n of host.querySelectorAll('svg polygon, svg path, svg rect')) {
      const box = n.getBoundingClientRect()
      if (box.width < 4) continue
      if (Math.abs(box.x + box.width / 2 - px) > r) continue
      if (Math.abs(box.y + box.height / 2 - py) > r) continue
      if (n.tagName === 'path') {
        return `path/${((n.getAttribute('d') ?? '').match(/M/g) ?? []).length}sub`
      }
      if (n.tagName === 'rect') return `rect/${Math.round(box.width)}x${Math.round(box.height)}`
      return `poly/${(n.getAttribute('points') ?? '').trim().split(/\s+/).length}pt`
    }
    return 'none'
  }, [x, y, radius])
}

/**
 * The notices standing on screen (table T-037).
 *
 * ⛔⛔ THE ROLE IS `Notification Area`, NOT `Notice`. A probe of that round
 * looked for the latter, found none, and reported a defect as fixed -- it was
 * only caught because the case was broken on purpose and refused to go red.
 */
export async function notices() {
  return page().evaluate(() =>
    [...document.querySelectorAll('[data-role]')]
      .filter((n) => (n.getAttribute('data-role') ?? '').includes('Notification'))
      .map((n) => (n.textContent ?? '').trim())
      .filter((t) => t.length > 0))
}

/**
 * The row bands: where each stands, how tall it is, and how far to the next.
 *
 * ⚠️ THE PITCH IS NOT THE HEIGHT. Measured 2026-08-29: every pitch is the band
 * plus 8px, and that gap is where a vertical pan used to lose its travel
 * (the ledger's D-138). A probe that reads `height` where it means `pitch`
 * measures the defect rather than the picture.
 */
export async function rowBands() {
  const rows = await page().evaluate(() =>
    [...document.querySelectorAll('[data-depth]')]
      .map((n) => n.getBoundingClientRect())
      .map((r) => ({ y: Math.round(r.y), height: Math.round(r.height) }))
      .sort((a, b) => a.y - b.y))
  return rows.map((row, i) => ({
    ...row,
    pitch: i + 1 < rows.length ? rows[i + 1].y - row.y : row.height,
  }))
}

/**
 * Drag with a real pointer, reporting what the picture did at every step.
 *
 * ⭐⭐ THIS IS THE MEASUREMENT THAT FOUND D-138. A drag reported in ONE jump
 * hides a quantisation; the same drag swept in small steps showed the picture
 * overshoot by exactly the gap between two bands at one boundary and nowhere
 * else. ⛔ Never conclude 等倍 from a single long drag.
 */
export async function sweep(from, delta, read, { steps = 40, modifiers = [] } = {}) {
  for (const key of modifiers) await page().keyboard.down(key)
  await page().mouse.move(from.x, from.y)
  await page().mouse.down()
  const seen = []
  for (let i = 1; i <= steps; i += 1) {
    const at = { x: from.x + (delta.x * i) / steps, y: from.y + (delta.y * i) / steps }
    await page().mouse.move(at.x, at.y)
    seen.push({ step: i, at, value: await read() })
  }
  await page().mouse.up()
  for (const key of modifiers) await page().keyboard.up(key)
  return seen
}

// ------------------------------------------- the row title panel, a lot used --

/**
 * The width the Row Title Panel occupies, and the x below which its entries sit.
 *
 * ⛔ USE THE REGION, NOT THE DOM PARENTAGE. Measured 2026-08-30: the row
 * controls are NOT descendants of `[data-role="Row Title Panel"]` -- querying
 * inside that element answers only the two entries at the panel's head, which
 * is how one probe reported that IC-82 was not drawn at all.
 */
export async function rowPanel() {
  return page().evaluate(() => {
    const r = document.querySelector('[data-role="Row Title Panel"]').getBoundingClientRect()
    return { x: Math.round(r.x), right: Math.round(r.right), width: Math.round(r.width) }
  })
}

/**
 * Put the pointer on a row's NAME, which is the one state HF-6 draws its
 * controls in. Answers false when no row stands at that y any more.
 *
 * ⚠️ `y` IS THE ROW'S TOP, as `rows()` reports it -- not the pointer's y.
 */
export async function hoverRow(y, { intoName = 30, settle = 140 } = {}) {
  const at = await page().evaluate(([top, dx]) => {
    const n = [...document.querySelectorAll('[data-depth]')]
      .find((e) => Math.round(e.getBoundingClientRect().y) === top)
    if (n === undefined) return null
    const r = n.getBoundingClientRect()
    return { x: r.x + dx, y: r.y + r.height / 2 }
  }, [y, intoName])
  if (at === null) return false
  await page().mouse.move(at.x, at.y)
  await page().waitForTimeout(settle)
  return true
}

/**
 * Every entry standing in the row title panel's region, with the arming flags
 * that decide whether pressing it does anything.
 *
 * ⭐ `y` NARROWS IT TO ONE ROW; omit it for the whole panel, head included.
 * ⛔ THE DEFAULT EDGE IS THE PANEL'S OWN RIGHT, MEASURED. A constant guessed a
 * little wide (175) swept in IC-53 of the schedule canvas at x=171 and reported
 * it as a dead row control.
 * ⚠️ Call `hoverRow` first for a row's own controls -- HF-6 keeps them
 * `visibility: hidden` until the pointer is on that row's name.
 */
export async function panelEntries(y = null, { region = null } = {}) {
  const x1 = region ?? (await rowPanel()).right
  return page().evaluate(([top, x1]) =>
    [...document.querySelectorAll('[data-icon]')]
      .filter((n) => {
        const r = n.getBoundingClientRect()
        return r.x < x1 && (top === null || Math.abs(r.y - top) < 30)
      })
      .map((n) => {
        const r = n.getBoundingClientRect()
        const cs = getComputedStyle(n)
        return {
          icon: n.getAttribute('data-icon'),
          role: n.getAttribute('data-role'),
          // ⛔ THE ARMING IS AN ATTRIBUTE AND NOTHING ELSE. Measured
          // 2026-08-30: a disarmed entry and an armed one match on opacity,
          // colour, cursor and `disabled` -- the ledger's D-142.
          arming: n.getAttributeNames()
            .filter((a) => a.startsWith('data-can') || a === 'data-pinned')
            .map((a) => a + '=' + n.getAttribute(a)).join(' '),
          visible: cs.visibility === 'visible',
          background: cs.backgroundColor,
          x: Math.round(r.x), y: Math.round(r.y),
          width: Math.round(r.width), height: Math.round(r.height),
        }
      }), [y, x1])
}

/**
 * Press the entry carrying this icon on the row standing at `y`, with a REAL
 * pointer. Pass `y = null` for the entries at the panel's head.
 *
 * ⚠️ `press` CANNOT DO THIS. That one takes the first node with the icon, and
 * every drawn row carries its own IC-60 and IC-82.
 */
export async function pressPanelEntry(y, icon, { region = null } = {}) {
  const edge = region ?? (await rowPanel()).right
  const at = await page().evaluate(([top, ic, x1]) => {
    const found = [...document.querySelectorAll(`[data-icon="${ic}"]`)]
      .filter((n) => n.getBoundingClientRect().x < x1)
    const n = top === null
      ? found[0]
      : found.find((e) => Math.abs(e.getBoundingClientRect().y - top) < 30)
    if (n === undefined) return null
    const r = n.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, [y, icon, edge])
  if (at === null) return false
  await pressAt(at.x, at.y)
  return true
}

// ------------------------------------------------ telling a change apart -----

/**
 * What changed between two readings, key by key.
 *
 * ⭐ EVERY PROBE THAT PRESSES SOMETHING WANTS THIS. Rounds kept hand-writing the
 * same `Object.keys(was).filter(...)` and each one drifted -- one compared with
 * `!==` on arrays, which is never equal, so it called every press a change.
 */
export function diff(before, after) {
  return Object.keys(before)
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => ({ key: k, before: before[k], after: after[k] }))
}

/**
 * A fingerprint of every inline `style` on the page.
 *
 * ⛔⛔ WITHOUT THIS, A REPAINT LOOKS LIKE A DEAD ENTRY. Measured 2026-08-30:
 * IC-16 (the theme) recolours the whole page through inline styles and changes
 * no element count, no `data-role`, and not even `document.body`'s own
 * background -- so a board built from `census()` and `roles()` alone reported a
 * working entry as dead. ⚠️ The same round reported ten dead entries that were
 * not dead, for the neighbouring reason: the board it hand-wrote left out the
 * `svg line` and arrow counts that `census()` had been carrying all along.
 * ⭐ Board an entry press with `census()` AND this, not with a narrower reading.
 */
export async function styleSignature() {
  return page().evaluate(() => {
    const all = [...document.querySelectorAll('[style]')]
      .map((n) => n.getAttribute('style')).join('\u0001')
    let h = 5381
    for (let i = 0; i < all.length; i += 1) h = ((h * 33) ^ all.charCodeAt(i)) >>> 0
    return { count: document.querySelectorAll('[style]').length, hash: h.toString(16) }
  })
}

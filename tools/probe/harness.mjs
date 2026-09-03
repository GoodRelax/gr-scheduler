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

/**
 * Press twice at a point, which is the gesture MK-13 of table T-028 names.
 *
 * ⛔ IT IS THE ONE WAY INTO THE PROPERTIES PANEL FROM THE PICTURE. Measured
 * 2026-09-03: no key opens it (the ledger's D-222), so a probe that wants an
 * editable field has to come through here.
 */
export async function doublePressAt(x, y) {
  await page().mouse.move(x, y)
  await page().mouse.dblclick(x, y)
}

/** Press the entry of table T-109 with this row id. Answers false if absent. */
export async function press(icon) {
  const box = await page().evaluate((wantedIcon) => {
    const entry = document.querySelector(`[data-icon="${wantedIcon}"]`)
    if (entry === null) return null
    entry.scrollIntoView({ block: 'nearest' })
    const entryBox = entry.getBoundingClientRect()
    return { x: entryBox.x + entryBox.width / 2, y: entryBox.y + entryBox.height / 2 }
  }, icon)
  if (box === null) return false
  await pressAt(box.x, box.y)
  return true
}

/** Hold an entry down for `ms`, for FR-018's repeat (S-172 / S-173). */
export async function hold(icon, ms) {
  const box = await page().evaluate((wantedIcon) => {
    const entryBox = document
      .querySelector(`[data-icon="${wantedIcon}"]`)?.getBoundingClientRect()
    return entryBox
      ? { x: entryBox.x + entryBox.width / 2, y: entryBox.y + entryBox.height / 2 }
      : null
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
      .map((marked) => marked.getAttribute('data-role')))])
}

export async function count(selector) {
  return page().evaluate(
    (wanted) => document.querySelectorAll(wanted).length, selector)
}

/** How many `<text>` in the drawing read exactly this. */
export async function textsEqual(reading) {
  return page().evaluate((wanted) => [...document.querySelectorAll('svg text')]
    .filter((drawn) => (drawn.textContent ?? '').trim() === wanted).length, reading)
}

/** The rows the panel drew, with the depth each carries. */
export async function rows() {
  return page().evaluate(() => [...document.querySelectorAll('[data-depth]')]
    .map((row) => ({
      depth: Number(row.getAttribute('data-depth')),
      group: (row.getAttribute('data-group-id') ?? '').slice(0, 8),
      text: (row.textContent ?? '').trim().slice(0, 20),
      y: Math.round(row.getBoundingClientRect().y),
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
      .filter((drawn) => drawn.getAttribute('opacity') === '0.2').length,
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
 *
 * ⛔⛔ THIS FUNCTION USED TO PRESS `p`, WHICH THE NOTE ABOVE ALREADY SAID WAS
 * THE COMMAND PALETTE. Measured 2026-09-03 on the shipped build (the ledger's
 * D-222): `p` leaves 0 field rows and 0 inputs, a double press on a row name
 * gives 6 field rows and 1 input, and one on a task gives 37 and 3. The ledger
 * also claimed the task gesture did not work, and that was false.
 *
 * ⭐ THE PREDICATE COUNTS INPUTS, NOT FIELD ROWS. A probe wants this function
 * because it is about to type; a panel that has filled with rows carrying no
 * editable field is the state D-222 was reported from.
 *
 * @param at the point to press. Defaults to the name of the topmost row --
 *   pass a task's `mid` from `shapes()` for the 37-field picture instead.
 */
export async function openPanel({ at = null } = {}) {
  const pressPoint = at ?? (await rowNamePoint())
  if (pressPoint === null) throw new Error('openPanel: no row name to press')
  await doublePressAt(pressPoint.x, pressPoint.y)
  await until(
    async () => (await count(`${PANEL} input, ${PANEL} textarea`)) > 0,
    'the panel fills with an editable field')
}

/**
 * Where to press a row's name, which is what MK-13 wants under the pointer.
 *
 * ⛔ THE NAME IS WIDER THAN THE PART OF IT THAT CAN BE PRESSED. Measured
 * 2026-09-03: the name span starts at x=36 and runs 134px, but the row's own
 * controls sit on their own ground from x=66 -- so anything further right than
 * about 60 presses a control instead of the name. The 8px inset is a point
 * inside the name and clear of the grab strip on its left.
 *
 * ⚠️ `rowTopPx` names a row the way `hoverRow` does: the top edge `rows()`
 * reports. Pass null for the topmost drawn row.
 */
export async function rowNamePoint(rowTopPx = null, { insetPx = 8 } = {}) {
  return page().evaluate(([wantedTopPx, inset]) => {
    const drawn = [...document.querySelectorAll('[data-depth]')]
      .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y)
    const row = wantedTopPx === null
      ? drawn[0]
      : drawn.find((one) => Math.round(one.getBoundingClientRect().y) === wantedTopPx)
    if (row === undefined) return null
    const name = [...row.querySelectorAll('span')]
      .find((span) => (span.textContent ?? '').trim().length > 0)
    if (name === undefined) return null
    const nameBox = name.getBoundingClientRect()
    return { x: Math.round(nameBox.x + inset), y: Math.round(nameBox.y + nameBox.height / 2) }
  }, [rowTopPx, insetPx])
}

export async function fieldValue() {
  return page().evaluate((panelSelector) => {
    const field = document.querySelector(panelSelector)
      ?.querySelector('input[type="text"], input:not([type]), textarea')
    return field === null || field === undefined ? null : field.value
  }, PANEL)
}

/** Focus the first typed field, replace its text, and settle it the given way. */
export async function typeInField(text, settleBy = 'Enter') {
  const box = await page().evaluate((panelSelector) => {
    const field = document.querySelector(panelSelector)
      ?.querySelector('input[type="text"], input:not([type]), textarea')
    if (!field) return null
    const fieldBox = field.getBoundingClientRect()
    return { x: fieldBox.x + fieldBox.width / 2, y: fieldBox.y + fieldBox.height / 2 }
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
    const under = document.elementFromPoint(px, py)
    return under === null
      ? '-'
      : (under.closest('[data-role]')?.getAttribute('data-role') ?? '-')
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
  return page().evaluate(([paint, minWidthPx, minHeightPx, box]) => {
    const host = document.querySelector('[data-role="Schedule Canvas"]')
    if (host === null) return []
    return [...host.querySelectorAll('svg rect, svg polygon, svg path')]
      .filter((drawn) => paint === null || drawn.getAttribute('fill') === paint)
      .map((drawn) => ({ tag: drawn.tagName, box: drawn.getBoundingClientRect() }))
      .filter((shape) => shape.box.width >= minWidthPx && shape.box.height >= minHeightPx)
      .filter((shape) => box === null ||
        (shape.box.x >= box.x && shape.box.y >= box.y &&
         shape.box.x <= box.x + box.width && shape.box.y <= box.y + box.height))
      .map((shape) => ({
        tag: shape.tag,
        x: Math.round(shape.box.x), y: Math.round(shape.box.y),
        w: Math.round(shape.box.width), h: Math.round(shape.box.height),
        mid: { x: Math.round(shape.box.x + shape.box.width / 2),
               y: Math.round(shape.box.y + shape.box.height / 2) },
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
    for (const drawn of host.querySelectorAll('svg polygon, svg path, svg rect')) {
      const box = drawn.getBoundingClientRect()
      if (box.width < 4) continue
      if (Math.abs(box.x + box.width / 2 - px) > r) continue
      if (Math.abs(box.y + box.height / 2 - py) > r) continue
      if (drawn.tagName === 'path') {
        return `path/${((drawn.getAttribute('d') ?? '').match(/M/g) ?? []).length}sub`
      }
      if (drawn.tagName === 'rect') {
        return `rect/${Math.round(box.width)}x${Math.round(box.height)}`
      }
      return `poly/${(drawn.getAttribute('points') ?? '').trim().split(/\s+/).length}pt`
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
      .filter((marked) =>
        (marked.getAttribute('data-role') ?? '').includes('Notification'))
      .map((marked) => (marked.textContent ?? '').trim())
      .filter((reading) => reading.length > 0))
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
      .map((row) => row.getBoundingClientRect())
      .map((rowBox) => ({ y: Math.round(rowBox.y), height: Math.round(rowBox.height) }))
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
  for (let step = 1; step <= steps; step += 1) {
    const pointAt = {
      x: from.x + (delta.x * step) / steps,
      y: from.y + (delta.y * step) / steps,
    }
    await page().mouse.move(pointAt.x, pointAt.y)
    // ⚠️ The field stays `at` -- callers read it, and the shape is the contract.
    seen.push({ step, at: pointAt, value: await read() })
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
    const panelBox = document
      .querySelector('[data-role="Row Title Panel"]').getBoundingClientRect()
    return {
      x: Math.round(panelBox.x),
      right: Math.round(panelBox.right),
      width: Math.round(panelBox.width),
    }
  })
}

/**
 * Put the pointer on a row's NAME, which is the one state HF-6 draws its
 * controls in. Answers false when no row stands at that top any more.
 *
 * ⭐ `rowTopPx` IS THE KEY THAT NAMES A ROW here and in the two below: the top
 * edge `rows()` reports for it. ⛔ It is not the pointer's y -- an earlier name
 * of `y` needed a line of comment to say so, which is what a name is for.
 */
export async function hoverRow(rowTopPx, { intoNamePx = 30, settle = 140 } = {}) {
  const pointerAt = await page().evaluate(([wantedTopPx, insetPx]) => {
    const row = [...document.querySelectorAll('[data-depth]')]
      .find((drawn) => Math.round(drawn.getBoundingClientRect().y) === wantedTopPx)
    if (row === undefined) return null
    const rowBox = row.getBoundingClientRect()
    return { x: rowBox.x + insetPx, y: rowBox.y + rowBox.height / 2 }
  }, [rowTopPx, intoNamePx])
  if (pointerAt === null) return false
  await page().mouse.move(pointerAt.x, pointerAt.y)
  await page().waitForTimeout(settle)
  return true
}

/**
 * Every entry standing in the row title panel's region, with the arming flags
 * that decide whether pressing it does anything.
 *
 * ⭐ `rowTopPx` NARROWS IT TO ONE ROW; pass null for the whole panel, head
 * included.
 * ⛔ THE DEFAULT EDGE IS THE PANEL'S OWN RIGHT, MEASURED. A constant guessed a
 * little wide (175) swept in IC-53 of the schedule canvas at x=171 and reported
 * it as a dead row control.
 * ⚠️ Call `hoverRow` first for a row's own controls -- HF-6 keeps them
 * `visibility: hidden` until the pointer is on that row's name.
 */
export async function panelEntries(rowTopPx = null, { panelRightPx = null } = {}) {
  const rightEdgePx = panelRightPx ?? (await rowPanel()).right
  return page().evaluate(([wantedTopPx, edgePx]) =>
    [...document.querySelectorAll('[data-icon]')]
      .filter((entry) => {
        const entryBox = entry.getBoundingClientRect()
        return entryBox.x < edgePx
          && (wantedTopPx === null || Math.abs(entryBox.y - wantedTopPx) < 30)
      })
      .map((entry) => {
        const entryBox = entry.getBoundingClientRect()
        const entryStyle = getComputedStyle(entry)
        return {
          icon: entry.getAttribute('data-icon'),
          role: entry.getAttribute('data-role'),
          // ⛔ THE ARMING IS AN ATTRIBUTE AND NOTHING ELSE. Measured
          // 2026-08-30: a disarmed entry and an armed one match on opacity,
          // colour, cursor and `disabled` -- the ledger's D-142.
          arming: entry.getAttributeNames()
            .filter((name) => name.startsWith('data-can') || name === 'data-pinned')
            .map((name) => name + '=' + entry.getAttribute(name)).join(' '),
          visible: entryStyle.visibility === 'visible',
          background: entryStyle.backgroundColor,
          x: Math.round(entryBox.x), y: Math.round(entryBox.y),
          width: Math.round(entryBox.width), height: Math.round(entryBox.height),
        }
      }), [rowTopPx, rightEdgePx])
}

/**
 * Press the entry carrying this icon on the row whose top is `rowTopPx`, with a
 * REAL pointer. Pass null for the entries at the panel's head.
 *
 * ⚠️ `press` CANNOT DO THIS. That one takes the first node with the icon, and
 * every drawn row carries its own IC-60 and IC-82.
 */
export async function pressPanelEntry(rowTopPx, icon, { panelRightPx = null } = {}) {
  const rightEdgePx = panelRightPx ?? (await rowPanel()).right
  const pressAtPoint = await page().evaluate(([wantedTopPx, wantedIcon, edgePx]) => {
    const inPanel = [...document.querySelectorAll(`[data-icon="${wantedIcon}"]`)]
      .filter((entry) => entry.getBoundingClientRect().x < edgePx)
    const entry = wantedTopPx === null
      ? inPanel[0]
      : inPanel.find((one) => Math.abs(one.getBoundingClientRect().y - wantedTopPx) < 30)
    if (entry === undefined) return null
    const entryBox = entry.getBoundingClientRect()
    return { x: entryBox.x + entryBox.width / 2, y: entryBox.y + entryBox.height / 2 }
  }, [rowTopPx, icon, rightEdgePx])
  if (pressAtPoint === null) return false
  await pressAt(pressAtPoint.x, pressAtPoint.y)
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
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({ key, before: before[key], after: after[key] }))
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
    const everyInlineStyle = [...document.querySelectorAll('[style]')]
      .map((styled) => styled.getAttribute('style')).join('\u0001')
    let hash = 5381
    for (let charAt = 0; charAt < everyInlineStyle.length; charAt += 1) {
      hash = ((hash * 33) ^ everyInlineStyle.charCodeAt(charAt)) >>> 0
    }
    return {
      count: document.querySelectorAll('[style]').length,
      hash: hash.toString(16),
    }
  })
}

// -------------------------------------------- states a probe has to build ----

/**
 * The order the DOM holds children in, which is NOT the order the screen shows.
 *
 * ⛔⛔ `rows()` SORTS BY `y`, SO IT CAN NEVER SEE THIS KIND OF FAULT. Measured
 * 2026-08-30: three rows pinned in reverse order came out in pin order in the
 * DOM and in natural order on the screen -- FR-098's 「固定した順に上から並べる」
 * broken in a way every y-sorted reading calls correct.
 */
export async function treeOrder(role) {
  return page().evaluate((wantedRole) => {
    const host = document.querySelector(`[data-role="${wantedRole}"]`)
    if (host === null) return null
    return [...host.children].map((child) => ({
      role: child.getAttribute('data-role'),
      group: (child.getAttribute('data-group-id') ?? '').slice(0, 8),
      text: (child.textContent ?? '').trim().slice(0, 18),
      y: Math.round(child.getBoundingClientRect().y),
    }))
  }, role)
}

/**
 * The chain of `data-role` above a node, so "there are two of them here" can be
 * told from "one of them contains the other".
 *
 * ⛔ TWO FALSE DEFECT REPORTS IN ONE DAY CAME FROM NOT ASKING THIS. A row and
 * its own Row Pin button share a `y`, and `data-pinned` sits on BOTH the row
 * and the button -- so one pin reads as two unless the parentage is checked.
 */
export async function ancestry(selector, nth = 0) {
  return page().evaluate(([wantedSelector, wantedIndex]) => {
    const start = document.querySelectorAll(wantedSelector)[wantedIndex]
    if (start === undefined) return null
    const chain = []
    for (let above = start; above !== null; above = above.parentElement) {
      const role = above.getAttribute?.('data-role')
      const group = above.getAttribute?.('data-group-id')
      if (role !== null && role !== undefined) chain.push(role)
      else if (group) chain.push('#' + group.slice(0, 6))
    }
    return chain
  }, [selector, nth])
}

/** Turn the wheel over the middle of a part, with a real pointer. */
export async function wheelOver(role, notchPx, times = 1) {
  const middleOfPart = await page().evaluate((wantedRole) => {
    const part = document.querySelector(`[data-role="${wantedRole}"]`)
    if (part === null) return null
    const partBox = part.getBoundingClientRect()
    return { x: partBox.x + partBox.width / 2, y: partBox.y + partBox.height / 2 }
  }, role)
  if (middleOfPart === null) return false
  await page().mouse.move(middleOfPart.x, middleOfPart.y)
  for (let turn = 0; turn < times; turn += 1) {
    await page().mouse.wheel(0, notchPx)
    await page().waitForTimeout(120)
  }
  return true
}

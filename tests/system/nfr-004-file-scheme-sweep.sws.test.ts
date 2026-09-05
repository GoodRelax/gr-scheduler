// NFR-004, judged over the population the clause names, from `file://`.
//
// ⭐ WHY THIS FILE EXISTS. NFR-004 (:4272 of docs/spec/01-04-requirements.md)
// settles its own judgement: the requirement is met when 「表 T-023a・表 T-023b・
// 表 T-023c・表 T-023d・表 T-023 ・表 T-036 が挙げる操作と、表 T-024 の書出の形式」
// work with the network cut, and 「判定は、ファイルを直接開いた状態でも行うこと
// （MUST）」. Until this file, the only two cases that opened the deliverable as
// `file://` were `tests/nfr/nfr-004-single-file.test.ts:288` and `:302`, and
// neither presses one row of that population: :288 counts requests that left the
// file, :302 counts a first frame and a policy refusal. So the clause's own
// measure had never been taken.
//
// ⭐ WHAT A DIFFERENCE MEANS, AND WHY BOTH SCHEMES ARE RUN. NFR-004's MUST is
// about a SCHEME, not about a feature: a row that fails under `http://` too is
// some other defect, and a row that fails only under `file://` is this
// requirement's. The sweep therefore runs the same battery over the same built
// deliverable twice -- once from `file://`, once from a loopback `http://` that
// serves the same bytes -- and reports the two separately as well as their
// difference.
//
// ⚠️ WHAT THE STUBBED HOST DIALOG CAN AND CANNOT SHOW. `showSaveFilePicker` and
// `showOpenFilePicker` are replaced before the page loads, because a driven
// browser cannot answer a host chooser. That means every export row below shows
// only THE BEHAVIOUR AFTER THE HANDLE IS IN HAND -- whether the tool asked for a
// destination and then wrote bytes to it. It does NOT show whether the host
// would have opened the chooser at all from a `file://` page. LM-14 is the row
// that says that second question is open, and it is not answered here.
//
// ⚠️ WHAT LM-14 TAKES OUT OF THE POPULATION (:187). Two things: 上書き保存, and
// the rows of table T-206 kept in `localStorage`. `EXCLUDED_BY_LM_14` below
// names which rows of the six tables those are, and the census case fails if
// that set stops matching the tables.

import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import type { Socket } from 'node:net'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable } from '../contract/spec-table'
import { launchReferenceBrowser } from './live-app'
import { expectDeclarationsUsable, swsRegistry } from './sws-case'

const registry = swsRegistry()

/**
 * The shipping build. ⛔ NOT `index.html` and NOT the dev server: CN-1 of table
 * T-003 makes the deliverable one file, and NFR-004 is a statement about THAT
 * file. Run `npx vite build` first.
 */
const DELIVERABLE = join(process.cwd(), 'dist', 'index.html')

/**
 * How long one gesture is given before its reading is taken.
 *
 * ⚠️ Measured rather than chosen: a cold first run on the machine table T-025
 * describes needed about half a second for a frame to settle after a wheel or a
 * drag, and the readings below are taken by comparing two of them rather than
 * by trusting one delay -- see `settled`.
 */
const QUIET_MS = 250

/** Both sweeps together. ⚠️ Measured at roughly five minutes per scheme. */
const SWEEP_MS = 2_400_000

// --------------------------------------------------------------- population --
//
// Read out of the specification rather than typed, so that a row added to any
// of the seven tables fails the census below instead of quietly widening the
// population without widening the sweep.

/**
 * The rows of table T-023a. ⛔ ONLY THE FIRST TABLE UNDER THAT CAPTION: the
 * manuscript prints a second, unnumbered table right after it (the surfaces the
 * order is NOT applied to), and its first column holds surface names rather
 * than row IDs. `specTable` reads on to the next `**表 ` heading and so takes
 * both, which is why the shape of a row ID is what selects here.
 */
const ROW_ID = /^[A-Z]{2}-\d+[a-z]?$/

function rowsOf(tableId: string): readonly string[] {
  const rows = specTable(tableId).rows.map((row) => row.id).filter((id) => ROW_ID.test(id))
  if (rows.length === 0) throw new Error(`table ${tableId} yielded no row IDs`)
  return rows
}

/**
 * Table T-024's outward formats. ⭐ NFR-004 names 「表 T-024 の書出の形式」 and
 * not the whole table, so the direction column is what selects -- the same
 * reading `src/adapter/document-codec/exchange-formats.json` is generated on.
 */
function outwardFormatsOfT024(): readonly string[] {
  return specTable('T-024')
    .rows.filter((row) => ROW_ID.test(row.id) && (row.by['方向'] ?? '').includes('書出'))
    .map((row) => row.id)
}

/**
 * What LM-14 (:187) takes out of NFR-004's population, and the row of the six
 * tables each exclusion lands on.
 *
 * ⛔ THE TWO ENTRIES ARE THE WHOLE OF IT. LM-14 names 上書き保存 and the rows of
 * table T-206 marked 「別枠。`localStorage` に置く。」 -- nothing else. IO-5 is
 * table T-024's row for that store, and it is not an outward format either, so
 * it is doubly outside; SK-11 is the assignment FR-060's overwrite stands
 * behind.
 */
const EXCLUDED_BY_LM_14: Readonly<Record<string, string>> = {
  'SK-11': 'LM-14: 上書き保存 (FR-060) is outside NFR-004 judgement under file://',
  'IO-5': 'LM-14: localStorage is the 別枠 store of table T-206',
}

// ------------------------------------------------------------------ readings --

/**
 * One look at the running application, small enough to compare two of them.
 *
 * ⭐ THE HASHES ARE OVER TWO SCOPES ON PURPOSE. `canvas` is the drawing alone,
 * which is what a zoom or a drag moves; `page` is the whole body, which is what
 * an arm's marking (FR-053 / EN-1 of table T-237), the row title panel's level
 * of detail, and the display language move without touching the drawing. A
 * sweep that watched only the first would have called IC-14, IC-15 and IC-21
 * dead -- measured, on this build.
 */
interface Reading {
  readonly roles: readonly string[]
  readonly canvas: number
  readonly page: number
  readonly notices: readonly string[]
  /** Elements drawn with a dashed outline -- SL-8's cue that something is selected. */
  readonly dashed: number
  /** Task bars and milestone shapes currently drawn. */
  readonly shapes: number
  readonly saved: readonly string[]
  readonly asked: readonly string[]
  /** Keys the page prevented the host's default for -- MK-10 and MK-12. */
  readonly prevented: readonly string[]
  readonly notPrevented: readonly string[]
  /** How many times IO-6's seam was written to. */
  readonly clipboardWrites: number
}

/** What one probe produced, reduced to something two schemes can be compared on. */
interface Outcome {
  readonly moved: boolean
  readonly newRoles: readonly string[]
  readonly goneRoles: readonly string[]
  readonly noticeCount: number
  readonly wroteFiles: number
  readonly askedNames: readonly string[]
  readonly clipboardDelta: number
  readonly dashedDelta: number
  readonly shapesDelta: number
  /** The drawing before the gesture, and while it was still held. */
  readonly beforeCanvas: number
  readonly heldCanvas: number | null
  readonly failure: string | null
}

const HOST_STUB = `
  window.__grsSaved = []
  window.__grsAsked = []
  window.__grsKeys = []
  window.__grsClipboard = 0
  window.addEventListener('keydown', (event) => { window.__grsKeys.push(event) }, false)
  // IO-6 of table T-024 leaves NO MARK ON THE SCREEN when it works -- the
  // picture goes to the host and the drawing does not move -- so the one thing
  // that says whether the row answered is that the seam was reached.
  // BOTH MEMBERS ARE WRAPPED: browser-clipboard.ts:154 takes the seam as
  // writeText and nothing else, but a later build may reach for write, and a
  // counter that watched only one of them would read a working row as dead.
  const board = globalThis.navigator && globalThis.navigator.clipboard
  for (const member of ['write', 'writeText']) {
    if (!board || typeof board[member] !== 'function') continue
    const inner = board[member].bind(board)
    board[member] = async (...args) => {
      window.__grsClipboard += 1
      // ⚠️ A driven browser refuses the host clipboard without a real gesture,
      // and a throw here would be the harness's answer rather than the tool's.
      try { return await inner(...args) } catch (thrown) { return undefined }
    }
  }
  const handle = (name) => ({
    kind: 'file',
    name,
    async createWritable() {
      return {
        async write() {},
        async close() { window.__grsSaved.push(name) },
      }
    },
    async queryPermission() { return 'granted' },
    async requestPermission() { return 'granted' },
    async getFile() { return new File([''], name) },
  })
  window.showSaveFilePicker = async (options) => {
    const name = (options && options.suggestedName) || 'unnamed'
    window.__grsAsked.push(name)
    return handle(name)
  }
  window.showOpenFilePicker = async () => [handle('handed.json')]
`

const READ_SCRIPT = `(() => {
  const hash = (text) => {
    let h = 0
    for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0
    return h
  }
  const canvas = document.querySelector('[data-role="Schedule Canvas"] svg')
  const drawing = canvas ? canvas.outerHTML : ''
  const keys = window.__grsKeys || []
  return {
    roles: [...new Set([...document.querySelectorAll('[data-role]')]
      .map((e) => e.getAttribute('data-role')))].sort(),
    canvas: hash(drawing),
    page: hash(document.body.innerHTML),
    notices: [...document.querySelectorAll('[data-role="Notification Area"]')]
      .map((e) => (e.textContent || '').trim()).filter(Boolean),
    dashed: canvas ? canvas.querySelectorAll('[stroke-dasharray]').length : 0,
    shapes: canvas ? canvas.querySelectorAll('polygon').length : 0,
    saved: (window.__grsSaved || []).slice(),
    asked: (window.__grsAsked || []).slice(),
    prevented: keys.filter((e) => e.defaultPrevented).map((e) => e.key),
    notPrevented: keys.filter((e) => !e.defaultPrevented).map((e) => e.key),
    clipboardWrites: window.__grsClipboard || 0,
  }
})()`

async function read(page: Page): Promise<Reading> {
  return (await page.evaluate(READ_SCRIPT)) as Reading
}

/**
 * A reading taken only once two in a row agree.
 *
 * ⚠️ A fixed delay is what `tests/system/live-app.ts` already refuses, and for
 * the reason it gives: the shell may legitimately draw twice on the way up, and
 * a cold machine stretches the gap. Two identical readings is the condition,
 * not a duration.
 */
async function settled(page: Page): Promise<Reading> {
  const deadline = Date.now() + 20_000
  let previous = await read(page)
  while (Date.now() < deadline) {
    await page.waitForTimeout(QUIET_MS)
    const current = await read(page)
    if (current.canvas === previous.canvas && current.page === previous.page) return current
    previous = current
  }
  return previous
}

function outcomeOf(before: Reading, after: Reading, held: number | null): Outcome {
  return {
    moved:
      before.canvas !== after.canvas ||
      before.page !== after.page ||
      before.saved.length !== after.saved.length ||
      before.notices.length !== after.notices.length ||
      before.clipboardWrites !== after.clipboardWrites,
    newRoles: after.roles.filter((r) => !before.roles.includes(r)),
    goneRoles: before.roles.filter((r) => !after.roles.includes(r)),
    noticeCount: after.notices.length,
    wroteFiles: after.saved.length - before.saved.length,
    askedNames: after.asked.slice(before.asked.length),
    clipboardDelta: after.clipboardWrites - before.clipboardWrites,
    dashedDelta: after.dashed - before.dashed,
    shapesDelta: after.shapes - before.shapes,
    beforeCanvas: before.canvas,
    heldCanvas: held,
    failure: null,
  }
}

// ------------------------------------------------------------------ geometry --
//
// ⛔ THE DRAWING CARRIES NO HANDLE TO ONE TASK. Measured: the SVG under
// `[data-role="Schedule Canvas"]` has no `data-uid`, no `id` on a bar, and no
// role on a shape -- `defs`, `rect`, `line`, `polygon`, `circle`, `polyline`,
// `g`, `text` and nothing else. Table T-023d's grab regions can therefore only
// be reached by coordinate, and that is a fact about this build rather than a
// choice made here: `tests/system/live-app.ts` records the same absence for the
// one selector it needs, and says a change to the marking should break the
// cases that lean on it.

interface Spot {
  readonly x: number
  readonly y: number
}

/** What the page answered, before this file has checked it found a bar at all. */
interface RawGeometry {
  readonly barBody: Spot | null
  readonly barStart: Spot | null
  readonly barFinish: Spot | null
  readonly otherBar: Spot | null
  readonly empty: Spot | null
  readonly paletteBand: Spot | null
  readonly rowGrab: Spot | null
  readonly statusLine: Spot | null
  readonly dependency: Spot | null
}

interface Geometry {
  /** Centre of the widest bar drawn -- GR-12, MK-8, PD-3, SL-1. */
  readonly barBody: Spot
  /** Just inside that bar's left edge -- GR-3. */
  readonly barStart: Spot
  /** Just inside its right edge -- GR-4. */
  readonly barFinish: Spot
  /** A second bar, for SL-2 and SL-4. */
  readonly otherBar: Spot | null
  /** A point in the schedule area with nothing drawn under it -- PD-4, PD-5, MK-6, MK-11. */
  readonly empty: Spot | null
  /** The palette's grab band -- GR-19, and MK-9a's overlap with what is beneath it. */
  readonly paletteBand: Spot | null
  /** The row title panel's grab mark -- GR-20. */
  readonly rowGrab: Spot | null
  /** The status date line, once IC-44 has put one out -- GR-16. */
  readonly statusLine: Spot | null
  /** A dependency line away from any bar -- GR-13. */
  readonly dependency: Spot | null
}

const GEOMETRY_SCRIPT = `(() => {
  const canvas = document.querySelector('[data-role="Schedule Canvas"]')
  const svg = canvas ? canvas.querySelector('svg') : null
  if (!svg) return null
  const area = canvas.getBoundingClientRect()
  // ⛔ A BAR WIDER THAN THE SCREEN HAS NO CENTRE TO PRESS. Measured on the
  // startup document: the widest shape drawn is 6348px across, so its middle
  // lands 1556px outside the window and every gesture aimed there is dispatched
  // into nothing. SL-3 states the same fact from the specification's side --
  // 「日程表は横に長いバーが並ぶので、触れたものを取ると画面外まで伸びたバーが
  // 巻き込まれる」. What is taken is therefore the widest bar lying WHOLLY inside
  // the schedule area.
  const boxes = [...svg.querySelectorAll('polygon')]
    .map((e) => e.getBoundingClientRect())
    .filter((r) => r.width >= 40 && r.width <= 600 && r.height >= 8 &&
      r.top > area.top + 120 && r.bottom < area.bottom - 40 &&
      r.left > area.left + 220 && r.right < area.right - 80)
    .sort((a, b) => b.width - a.width)
  const overlay = (selector) => {
    const e = document.querySelector(selector)
    return e ? e.getBoundingClientRect() : null
  }
  const blockers = ['[data-role="App Header"]', '[data-role="Row Title Panel"]',
    '[data-role="Command Palette"]', '[data-role="Properties Panel"]',
    '[data-role="Scrollbars"]', '[data-role="Dialogue Field"]']
    .map(overlay).filter(Boolean)
  const clear = (x, y) => {
    for (const r of blockers) if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return false
    for (const r of boxes) if (x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 12 && y <= r.bottom + 12) return false
    return true
  }
  let empty = null
  for (let y = Math.round(area.bottom) - 60; y > area.top + 140 && !empty; y -= 14) {
    for (let x = Math.round(area.right) - 60; x > area.left + 200; x -= 24) {
      if (clear(x, y)) { empty = { x, y }; break }
    }
  }
  const first = boxes[0]
  const second = boxes.find((r) => r !== first && Math.abs(r.top - first.top) > 20) || null
  const band = (() => {
    const grip = document.querySelector('[data-icon="IC-53"]')
    if (!grip) return null
    const r = grip.getBoundingClientRect()
    return { x: Math.round(r.left - 40), y: Math.round(r.top + r.height / 2) }
  })()
  const rowGrab = (() => {
    const panel = document.querySelector('[data-role="Row Title Tree"]')
    if (!panel) return null
    const mark = [...panel.querySelectorAll('*')].find((e) => (e.textContent || '').trim() === '\\u22ee\\u22ee')
    if (!mark) return null
    const r = mark.getBoundingClientRect()
    if (r.width === 0) return null
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }
  })()
  const statusLine = (() => {
    const lines = [...svg.querySelectorAll('line')]
      .filter((e) => Math.abs(Number(e.getAttribute('x1')) - Number(e.getAttribute('x2'))) < 1)
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.height > area.height * 0.4)
    const r = lines[lines.length - 1]
    return r ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) } : null
  })()
  const dependency = (() => {
    for (const e of svg.querySelectorAll('polyline')) {
      const r = e.getBoundingClientRect()
      if (r.width < 12 && r.height < 12) continue
      const x = Math.round(r.left + r.width / 2)
      const y = Math.round(r.top + r.height / 2)
      if (clear(x, y)) return { x, y }
    }
    return null
  })()
  const spot = (r, at) => ({ x: Math.round(r.left + at), y: Math.round(r.top + r.height / 2) })
  return {
    barBody: first ? spot(first, first.width / 2) : null,
    barStart: first ? spot(first, 2) : null,
    barFinish: first ? spot(first, first.width - 2) : null,
    otherBar: second ? spot(second, second.width / 2) : null,
    empty,
    paletteBand: band,
    rowGrab,
    statusLine,
    dependency,
  }
})()`

async function geometryOf(page: Page): Promise<Geometry> {
  const found = (await page.evaluate(GEOMETRY_SCRIPT)) as RawGeometry | null
  if (found === null) throw new Error('the page put out no Schedule Canvas to measure')
  const { barBody, barStart, barFinish } = found
  if (barBody === null || barStart === null || barFinish === null) {
    throw new Error('the schedule drawing put out no bar this sweep could take hold of')
  }
  return { ...found, barBody, barStart, barFinish }
}

/** ⚠️ HF-6 of table T-051 keeps a row's controls hidden until the pointer is on it. */
async function reveal(page: Page, at: Spot): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.waitForTimeout(120)
}

/**
 * One drag, with a reading taken WHILE THE BUTTON IS STILL DOWN.
 *
 * ⭐ THE HELD READING IS NOT A CONVENIENCE. ZO-6 of table T-020 has the rubber
 * band of SL-3 「握っているあいだだけ描き、離したら消すこと（MUST）」, so a
 * before/after pair is blind to it by the specification's own design: the
 * drawing is meant to come back. PD-1 and GR-19 put the same MUST on following
 * the pointer while held.
 */
async function dragFrom(page: Page, from: Spot, dx: number, dy: number): Promise<number> {
  await reveal(page, from)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 6 })
  await page.waitForTimeout(150)
  const mid = await read(page)
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 6 })
  await page.waitForTimeout(120)
  await page.mouse.up()
  return mid.canvas
}

async function wheelAt(page: Page, at: Spot, keys: readonly string[], dy: number): Promise<void> {
  await page.mouse.move(at.x, at.y)
  for (const key of keys) await page.keyboard.down(key)
  await page.mouse.wheel(0, dy)
  for (const key of keys) await page.keyboard.up(key)
}

// -------------------------------------------------------------------- probes --

interface Probe {
  /** Rows of the six tables (and of table T-024) this probe presses. */
  readonly rows: readonly string[]
  /**
   * What this row's own line of the specification promises.
   *
   *   answers          the tool answers -- the drawing or the screen moves
   *   answersWhileHeld the answer is drawn only while the button is down
   *                    (SL-3's rubber band, PD-1's and GR-19's following)
   *   placesNothing    the row's answer IS "no shape is placed" -- PD-4a, MK-12
   *                    and SK-1 / SK-1a. ⛔ NOT "the screen stands still": those
   *                    rows keep an arm, and an arm's marking moves the screen.
   */
  readonly expect: 'answers' | 'answersWhileHeld' | 'placesNothing'
  /**
   * Run BEFORE the baseline reading is taken.
   *
   * ⛔ WITHOUT THIS THE SWEEP LIES. A row that needs something selected or armed
   * first would otherwise be read as having answered when all that moved was the
   * setting-up -- measured: SK-4 passed on the click that selected a bar, while
   * `frame-loop.ts:6954` records that no clipboard seam is wired at all.
   */
  readonly setUp?: (page: Page, at: Geometry) => Promise<void>
  readonly act: (page: Page, at: Geometry) => Promise<number | null>
}

/** Put the tool back to a state the next probe can start from. */
async function calm(page: Page): Promise<void> {
  // ⚠️ A telling left standing covers the palette, and the next probe's press
  // then times out on a control that is there but unreachable -- measured on
  // SK-1 after SK-21. IC-69 is NT-7's yes, IC-52 closes a surface, and
  // `[data-notice]` is NT-8's own put-away, which carries no row of table T-109.
  for (const selector of ['[data-notice]', '[data-icon="IC-69"]', '[data-icon="IC-52"]']) {
    for (let guard = 0; guard < 4; guard += 1) {
      const control = await page.$(selector)
      if (control === null) break
      const clicked = await control.click({ timeout: 2_000 }).then(() => true, () => false)
      if (!clicked) break
      await page.waitForTimeout(200)
    }
  }
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  // ⛔ THE PALETTE IS PUT BACK, because one row of the population takes it away
  // and the rows after it press its entrances: SK-14 toggles the `Command
  // Palette`, and the probes that follow reach for IC-23, IC-27, IC-35, IC-37,
  // IC-44, IC-45 and IC-61. Measured: without this, SK-1 / SK-1a could not be
  // pressed at all, and a sweep that cannot press a row says nothing about it.
  // ⚠️ IC-7 is the entrance SK-14 shares, so this uses the tool's own route
  // rather than reaching into the page.
  if ((await page.$('[data-role="Command Palette"]')) === null) {
    const toggle = await page.$('[data-icon="IC-7"]')
    if (toggle !== null) {
      await toggle.click({ timeout: 3_000 }).catch(() => undefined)
      await page.waitForTimeout(300)
    }
  }
}

async function press(page: Page, icon: string): Promise<null> {
  await page.click(`[data-icon="${icon}"]`, { timeout: 8_000 })
  return null
}

/** Put a bar under the pointer and into the selection, before the baseline. */
async function selectBar(page: Page, at: Geometry): Promise<void> {
  await page.mouse.click(at.barBody.x, at.barBody.y)
  await page.waitForTimeout(250)
}

async function stroke(page: Page, keys: string): Promise<null> {
  await page.keyboard.press(keys)
  return null
}

/**
 * Every probe, in the order the sweep runs them.
 *
 * ⭐ ORDER MATTERS AND IS PART OF THE READING: SL-2 means "the previous
 * selection is replaced", which can only be seen after SL-1 has made one, and
 * PD-2 has to be left again before the rows after it can hit-test at all.
 */
const PROBES: readonly Probe[] = [
  // ---- table T-023: pointer and keyboard assignments -----------------------
  { rows: ['MK-1'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, [], 400); return null } },
  { rows: ['MK-2'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Control'], -300); return null } },
  { rows: ['MK-3'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Shift'], -300); return null } },
  { rows: ['MK-4'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Alt'], -300); return null } },
  { rows: ['MK-5'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Control', 'Shift'], 400); return null } },
  {
    // SL-3's rubber band is drawn only while the button is down (ZO-6), so the
    // reading that judges this row is the held one.
    rows: ['MK-6', 'PD-5', 'SL-3'],
    expect: 'answersWhileHeld',
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PD-5 needs a place in the schedule area with nothing drawn under it')
      return dragFrom(p, g.empty, -260, -90)
    },
  },
  {
    rows: ['MK-7', 'PD-1'],
    expect: 'answers',
    act: async (p, g) => {
      await p.keyboard.down('Control')
      const held = await dragFrom(p, g.barBody, 180, 60)
      await p.keyboard.up('Control')
      return held
    },
  },
  { rows: ['MK-8', 'PD-3', 'GR-12', 'SL-7'], expect: 'answers', act: async (p, g) => dragFrom(p, g.barBody, 140, 0) },
  { rows: ['MK-9'], expect: 'answers', act: async (p) => press(p, 'IC-12') },
  {
    // MK-9a: the one overlap this build can be pointed at without inventing
    // geometry. GR-19 says the palette's band wins over whatever is drawn under
    // it, and the palette floats over the schedule -- so a press on the band is
    // a press on two grab regions at once, and the higher one has to answer.
    rows: ['MK-9a', 'GR-19'],
    expect: 'answers',
    act: async (p, g) => {
      if (g.paletteBand === null) throw new Error('GR-19 needs the palette grab band (IC-53 marks it)')
      return dragFrom(p, g.paletteBand, -140, 90)
    },
  },
  {
    // MK-10: 「ブラウザの既定動作を画面全体で止めること（MUST）」 for a
    // combination this tool assigned. `Ctrl+S` is the row's own example.
    rows: ['MK-10'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p) => stroke(p, 'Control+s'),
  },
  {
    rows: ['MK-11', 'SL-6'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      if (g.empty === null) throw new Error('MK-11 needs an empty place to click')
      await p.mouse.click(g.empty.x, g.empty.y)
      return null
    },
  },
  {
    // MK-12: 「この組合せに本ツールの割当を与えない」. The row forbids writing
    // "nothing happens", so what is judged is that no shape is placed by the
    // combination -- the host's own default is left to the host.
    rows: ['MK-12'],
    expect: 'placesNothing',
    act: async (p, g) => {
      if (g.empty === null) throw new Error('MK-12 needs an empty place to drag from')
      await p.keyboard.down('Alt')
      const held = await dragFrom(p, g.empty, 120, 40)
      await p.keyboard.up('Alt')
      return held
    },
  },
  {
    rows: ['MK-13', 'GR-10'],
    expect: 'answers',
    act: async (p, g) => {
      await p.mouse.dblclick(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(400)
      return null
    },
  },

  // ---- table T-023b: what the palette is arming ---------------------------
  {
    rows: ['AR-2', 'PD-4'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-23') },
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PD-4 needs an empty place to draw a task in')
      return dragFrom(p, g.empty, 220, 0)
    },
  },
  {
    rows: ['AR-3'],
    expect: 'answers',
    // ⚠️ IC-50 opens the milestone shapes; IC-27 .. IC-34 are not drawn until it has.
    setUp: async (p) => { await press(p, 'IC-50'); await p.waitForTimeout(300) },
    act: async (p) => press(p, 'IC-27'),
  },
  {
    // PD-4a: 「何もしない。引きかけの矢印があれば捨てる。構えは解かない」 -- so
    // the drawing must NOT gain a shape. ⛔ The arm is taken in `setUp`, because
    // arming marks the palette and that marking is a screen change of its own.
    rows: ['AR-4', 'PD-4a'],
    expect: 'placesNothing',
    setUp: async (p) => { await press(p, 'IC-61') },
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PD-4a needs an empty place to drag in')
      return dragFrom(p, g.empty, 200, 0)
    },
  },
  { rows: ['AR-5'], expect: 'answers', act: async (p) => press(p, 'IC-35') },
  { rows: ['AR-6'], expect: 'answers', act: async (p) => press(p, 'IC-36') },
  {
    // AR-1: 「解除は `Esc`」. Something has to be armed for the release to show.
    rows: ['AR-1'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-23'); await p.waitForTimeout(300) },
    act: async (p) => { await p.keyboard.press('Escape'); return null },
  },

  // ---- table T-023c: selection -------------------------------------------
  {
    rows: ['SL-1', 'SL-8'],
    expect: 'answers',
    act: async (p, g) => { await p.mouse.click(g.barBody.x, g.barBody.y); return null },
  },
  {
    rows: ['SL-2'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      if (g.otherBar === null) throw new Error('SL-2 needs a second bar to replace the selection with')
      await p.mouse.click(g.otherBar.x, g.otherBar.y)
      return null
    },
  },
  {
    rows: ['SL-4'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      if (g.otherBar === null) throw new Error('SL-4 needs a second target to widen the selection onto')
      await p.keyboard.down('Shift')
      await p.mouse.click(g.otherBar.x, g.otherBar.y)
      await p.keyboard.up('Shift')
      return null
    },
  },
  { rows: ['SL-5', 'SK-2'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+a') },
  {
    // SL-7a: 「選択を掴んだ 1 つに絞り、そのタスクだけをリサイズする」.
    rows: ['SL-7a', 'GR-4'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => dragFrom(p, g.barFinish, 90, 0),
  },
  { rows: ['GR-3'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, g.barStart, -90, 0) },
  {
    // SL-7b: the order is what FR-034 reads, and IC-37 is that reader. A drawing
    // that moves means the alignment ran against a selection that had an order.
    rows: ['SL-7b'],
    expect: 'answers',
    setUp: async (p, g) => {
      await p.mouse.click(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(150)
      if (g.otherBar === null) return
      await p.keyboard.down('Shift')
      await p.mouse.click(g.otherBar.x, g.otherBar.y)
      await p.keyboard.up('Shift')
      await p.waitForTimeout(150)
    },
    act: async (p) => press(p, 'IC-37'),
  },

  // ---- table T-023a: the order a press is judged in -----------------------
  {
    // PD-2: in `Dual Cursor` mode 「当たり判定を行わない」, so a press on a bar
    // must not be a press on the bar. IC-45 is that mode's entrance, and it is
    // taken in `setUp` so that what is read is the PRESS and not the entering.
    rows: ['PD-2'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-45'); await p.waitForTimeout(400) },
    act: async (p, g) => {
      await p.mouse.click(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(200)
      await p.keyboard.press('Escape')
      return null
    },
  },

  // ---- table T-023d: the grab regions this build can be pointed at --------
  {
    rows: ['GR-20'],
    expect: 'answers',
    act: async (p, g) => {
      if (g.rowGrab === null) throw new Error('GR-20 needs the row grab mark in the Row Title Panel')
      return dragFrom(p, g.rowGrab, 0, 120)
    },
  },
  {
    rows: ['GR-16', 'SK-20'],
    expect: 'answers',
    act: async (p, g) => {
      await press(p, 'IC-44')
      await p.waitForTimeout(400)
      const found = await geometryOf(p)
      const line = found.statusLine ?? g.statusLine
      if (line === null) throw new Error('GR-16 needs the status date line IC-44 puts out')
      return dragFrom(p, line, 120, 0)
    },
  },
  {
    rows: ['GR-13'],
    expect: 'answers',
    act: async (p, g) => {
      if (g.dependency === null) throw new Error('GR-13 needs a dependency line drawn clear of every bar')
      await p.mouse.click(g.dependency.x, g.dependency.y)
      return null
    },
  },
  {
    // GR-7: the progress marker sits just outside a bar's right end (FR-013).
    rows: ['GR-7'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      const at = { x: g.barFinish.x + 14, y: g.barFinish.y }
      await reveal(p, at)
      await p.mouse.click(at.x, at.y)
      return null
    },
  },
  {
    // GR-8: the resume mark is one step further out again (FR-044).
    rows: ['GR-8'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      const at = { x: g.barFinish.x + 30, y: g.barFinish.y }
      await reveal(p, at)
      await p.mouse.click(at.x, at.y)
      return null
    },
  },
  {
    // GR-11: the assignee label hangs outside the bar; AS-1 edits it on a
    // double press.
    rows: ['GR-11'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p, g) => {
      const at = { x: g.barFinish.x + 46, y: g.barFinish.y }
      await reveal(p, at)
      await p.mouse.dblclick(at.x, at.y)
      return null
    },
  },
  { rows: ['GR-5'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barStart.x + 4, y: g.barStart.y + 9 }, -70, 0) },
  { rows: ['GR-6'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barFinish.x - 4, y: g.barFinish.y + 9 }, 70, 0) },
  { rows: ['GR-9'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barStart.x + 10, y: g.barStart.y + 9 }, 30, 0) },
  { rows: ['GR-17'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barStart.x + 26, y: g.barStart.y + 9 }, 40, 0) },
  { rows: ['GR-1'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barStart.x + 2, y: g.barStart.y - 8 }, 60, 0) },
  { rows: ['GR-2'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barFinish.x - 2, y: g.barFinish.y + 8 }, -60, 0) },
  {
    // GR-14: AR-5 arms a comment box, PD-4 places one, and GR-14 moves it.
    rows: ['GR-14'],
    expect: 'answers',
    setUp: async (p, g) => {
      await press(p, 'IC-35')
      if (g.empty === null) return
      await p.mouse.click(g.empty.x, g.empty.y)
      await p.waitForTimeout(400)
      await p.keyboard.press('Escape')
      await p.waitForTimeout(200)
    },
    act: async (p, g) => {
      if (g.empty === null) throw new Error('GR-14 needs an empty place to put a comment box in')
      return dragFrom(p, g.empty, 90, 40)
    },
  },
  { rows: ['GR-15'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barBody.x, y: g.barBody.y + 9 }, 60, 0) },
  { rows: ['GR-18'], expect: 'answers', setUp: selectBar, act: async (p, g) => dragFrom(p, { x: g.barBody.x + 12, y: g.barBody.y + 9 }, 40, 0) },

  // ---- table T-036: the shortcut assignments ------------------------------
  {
    rows: ['SK-3'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p) => {
      await p.keyboard.press('Delete')
      await p.waitForTimeout(500)
      // ⚠️ NT-7 of table T-037 asks before a row goes; the Yes is IC-69.
      const yes = await p.$('[data-icon="IC-69"]')
      if (yes !== null) await yes.click()
      return null
    },
  },
  { rows: ['SK-4'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+c') },
  {
    rows: ['SK-5'],
    expect: 'answers',
    setUp: async (p, g) => {
      await selectBar(p, g)
      await p.keyboard.press('Control+c')
      await p.waitForTimeout(400)
    },
    act: async (p) => stroke(p, 'Control+v'),
  },
  { rows: ['SK-6'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+z') },
  { rows: ['SK-7'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+y') },
  {
    // SK-8 / IN-4 of table T-028: `Esc` closes the surface that is up, so one is
    // put up first and the reading judges the closing alone.
    rows: ['SK-8'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-22'); await p.waitForTimeout(500) },
    act: async (p) => stroke(p, 'Escape'),
  },
  { rows: ['SK-9'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'F2') },
  { rows: ['SK-10', 'IO-2'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+o') },
  { rows: ['SK-12'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+Shift+E') },
  { rows: ['SK-13'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'F1') },
  { rows: ['SK-14'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'p') },
  { rows: ['SK-15'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'F11') },
  { rows: ['SK-16'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Shift+=') },
  { rows: ['SK-16a'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Alt+=') },
  { rows: ['SK-17'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+0') },
  { rows: ['SK-18'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'f') },
  {
    // SK-19's first level settles an entry in place, so one is opened first.
    rows: ['SK-19'],
    expect: 'answers',
    setUp: async (p, g) => {
      await p.mouse.dblclick(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(500)
    },
    act: async (p) => stroke(p, 'Enter'),
  },
  { rows: ['SK-21'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+r') },
  {
    // SK-1 / SK-1a are the record that 「キーボードだけで図形を置く経路は持たない」.
    // ⭐ PRESSED RATHER THAN PASSED OVER: what the rows assert is that no key
    // puts a shape out, so the sweep arms a shape first and then presses every
    // key that could plausibly place one.
    rows: ['SK-1', 'SK-1a'],
    expect: 'placesNothing',
    // ⛔ THE POINTER SITS OVER THE EMPTY PLACE, not over a bar: PD-4 is the row
    // that would put a shape down, and it puts it down where nothing is drawn.
    // ⚠️ The panel is put away first -- `Enter` is also SK-19, which closes it,
    // and a closing panel widens the schedule area and redraws it with more
    // shapes for a reason that has nothing to do with placing one.
    setUp: async (p, g) => {
      await p.keyboard.press('Escape')
      await p.waitForTimeout(200)
      await press(p, 'IC-23')
      if (g.empty !== null) await p.mouse.move(g.empty.x, g.empty.y)
      await p.waitForTimeout(200)
    },
    // ⛔ THE ARROW KEYS ARE NOT PRESSED HERE, and that is measured rather than
    // squeamish: MK-10 (MUST NOT) leaves a combination this tool did not assign
    // to the host, so an arrow scrolls the page -- which redraws the schedule at
    // a different level of detail and moves the shape count for a reason that
    // has nothing to do with placing one. `Enter` and `Space` are the two keys a
    // reader would actually try to put the armed shape down with.
    act: async (p) => {
      for (const one of ['Enter', 'Space']) {
        await p.keyboard.press(one)
        await p.waitForTimeout(200)
      }
      await p.keyboard.press('Escape')
      return null
    },
  },

  // ---- table T-024: the outward formats ----------------------------------
  ...(['IO-1', 'IO-2', 'IO-3', 'IO-4', 'IO-7'] as const).map(
    (format): Probe => ({
      rows: [format],
      expect: 'answers',
      act: async (p) => {
        await press(p, 'IC-2')
        await p.waitForSelector(`[data-format="${format}"]`, { timeout: 8_000 })
        await p.click(`[data-format="${format}"]`)
        await p.waitForTimeout(2_000)
        return null
      },
    }),
  ),
  {
    // IO-6: 「現在の画面を画像として他のアプリへ渡す」, IC-3 in the header.
    rows: ['IO-6'],
    expect: 'answers',
    act: async (p) => press(p, 'IC-3'),
  },
]

// --------------------------------------------------------------- the sweep --

interface SweepResult {
  readonly outcomes: Readonly<Record<string, Outcome>>
  readonly pageErrors: readonly string[]
  readonly refusals: readonly string[]
}

const nameOf = (probe: Probe): string => probe.rows.join('+')

/** Rows the sweep could not reach at all -- a probe that threw. */
function couldNotBePressed(result: SweepResult): readonly string[] {
  return PROBES.filter((probe) => result.outcomes[nameOf(probe)]?.failure != null).map(
    (probe) => `${nameOf(probe)}: ${result.outcomes[nameOf(probe)]?.failure ?? ''}`,
  )
}

/** Rows that were reached and did not do what their line of the table promises. */
function didNotAnswer(result: SweepResult): readonly string[] {
  return PROBES.filter(
    (probe) =>
      result.outcomes[nameOf(probe)]?.failure == null &&
      !answeredAsPromised(probe, result.outcomes[nameOf(probe)]),
  ).map((probe) => `${nameOf(probe)} (${probe.expect})`)
}

async function sweep(browser: Browser, url: string): Promise<SweepResult> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const pageErrors: string[] = []
  const refusals: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (/content security policy|refused to (?:load|execute|apply|connect|frame)/i.test(text)) {
      refusals.push(text)
    }
  })
  await page.addInitScript(HOST_STUB)
  await page.goto(url, { waitUntil: 'load' })
  await page.waitForSelector('[data-role="Schedule Canvas"] svg', { state: 'attached', timeout: 30_000 })
  await settled(page)

  const outcomes: Record<string, Outcome> = {}
  for (const probe of PROBES) {
    const before = await settled(page)
    let outcome: Outcome
    try {
      if (probe.setUp !== undefined) {
        await probe.setUp(page, await geometryOf(page))
        await settled(page)
      }
      // ⭐ RE-TAKEN AFTER THE SETTING-UP, so that what is judged is the act.
      const baseline = probe.setUp === undefined ? before : await read(page)
      const held = await probe.act(page, await geometryOf(page))
      const after = await settled(page)
      outcome = outcomeOf(baseline, after, held)
    } catch (thrown) {
      outcome = {
        moved: false,
        newRoles: [],
        goneRoles: [],
        noticeCount: 0,
        wroteFiles: 0,
        askedNames: [],
        clipboardDelta: 0,
        dashedDelta: 0,
        // ⚠️ A probe that threw placed nothing either, so the shape delta above
        // is 0 -- but `failure` is asserted first, so a thrown probe can never
        // pass as a `placesNothing` row.
        shapesDelta: -1,
        beforeCanvas: before.canvas,
        heldCanvas: null,
        failure: thrown instanceof Error ? thrown.message.split('\n')[0] ?? 'threw' : String(thrown),
      }
    }
    outcomes[nameOf(probe)] = outcome
    await calm(page)
  }

  await page.close()
  return { outcomes, pageErrors, refusals }
}

/**
 * The two schemes' readings, compared on what NFR-004 asks about: whether the
 * row worked, not the exact pixels it moved. ⚠️ `duringGesture` and the hashes
 * inside it are NOT compared -- two runs legitimately land a drag a pixel apart.
 */
/**
 * Whether one probe's outcome is what its row promises.
 *
 * ⭐ ONE READER FOR BOTH SCHEMES, so that `file://` and `http://` cannot be
 * judged by two different standards.
 */
function answeredAsPromised(probe: Probe, one: Outcome | undefined): boolean {
  if (one === undefined) return false
  switch (probe.expect) {
    case 'answers':
      return one.moved
    case 'answersWhileHeld':
      return one.heldCanvas !== null && one.heldCanvas !== one.beforeCanvas
    case 'placesNothing':
      return one.shapesDelta === 0
  }
}

function comparable(one: Outcome): unknown {
  return {
    moved: one.moved,
    newRoles: one.newRoles,
    goneRoles: one.goneRoles,
    wroteFiles: one.wroteFiles,
    askedNames: one.askedNames,
    clipboardDelta: one.clipboardDelta,
    failure: one.failure,
  }
}

// --------------------------------------------------------------- the cases --

let server: Server
const openSockets = new Set<Socket>()
let fileResult: SweepResult
let httpResult: SweepResult

// ⛔ NOT `serial`. A failure under one scheme would then SKIP the sweep of the
// other, and the difference between the two is the whole of what NFR-004 asks --
// a run that reports only the file:// side cannot say whether a row is this
// requirement's defect or some other one. Both sweeps therefore run in
// `beforeAll`, and the cases below only report what they found.
test.describe.configure({ timeout: SWEEP_MS })

test.beforeAll(async () => {
  // ⚠️ A hook carries its own 30s budget whatever `describe.configure` says, and
  // two full sweeps of the population take minutes.
  test.setTimeout(SWEEP_MS)
  const bytes = readFileSync(DELIVERABLE)
  server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(bytes)
  })
  // ⛔ EVERY SOCKET IS HELD ONTO SO IT CAN BE CUT. `Server.close` waits for the
  // ones still open, and a browser leaves a keep-alive behind after its page is
  // closed -- measured: the run hung in the teardown until it was killed.
  server.on('connection', (socket) => {
    openSockets.add(socket)
    socket.on('close', () => openSockets.delete(socket))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('the loopback server took no port')
  const httpUrl = `http://127.0.0.1:${address.port}/`

  // ⭐⭐ THE BROWSER IS OPENED AND SHUT INSIDE THIS HOOK, and both sweeps run
  // here rather than one per case. Two reasons, both measured:
  //   ⛔ a case that swept would, on failing, SKIP the other scheme's sweep --
  //      and the difference between the two is the whole of what NFR-004 asks
  //   ⛔ a browser still open while a failed case is reported left the run
  //      hanging after that case, with no further case printed and the process
  //      alive; it had to be killed. Nothing of the browser outlives this hook.
  const browser: Browser = await launchReferenceBrowser()
  try {
    fileResult = await sweep(browser, pathToFileURL(DELIVERABLE).href)
    httpResult = await sweep(browser, httpUrl)
  } finally {
    await browser.close()
    for (const socket of openSockets) socket.destroy()
    openSockets.clear()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})

test(
  registry.swsCase({
    sws: 'SWS-8',
    level: 'System',
    covers: ['SK-11', 'IO-5'],
    given: 'the six tables NFR-004 names and the outward formats of table T-024',
    when: 'their rows are read out of the specification and LM-14 applied',
    then: 'the sweep presses every row left in the population',
  }),
  async () => {
    const population = [
      ...rowsOf('T-023a').filter((id) => id.startsWith('PD-')),
      ...rowsOf('T-023b'),
      ...rowsOf('T-023c'),
      ...rowsOf('T-023d'),
      ...rowsOf('T-023'),
      ...rowsOf('T-036'),
      ...outwardFormatsOfT024(),
    ]
    const excluded = Object.keys(EXCLUDED_BY_LM_14)
    const owed = population.filter((id) => !excluded.includes(id))
    const pressed = new Set(PROBES.flatMap((probe) => probe.rows))

    // ⛔ AN EXCLUSION THAT NAMES NOTHING IS AN EXCLUSION THAT ROTTED. Every row
    // LM-14 takes out has to still be in one of the tables.
    for (const id of excluded) {
      expect(
        population.includes(id) || id === 'IO-5',
        `LM-14 excludes ${id}, but no table NFR-004 names holds that row any more`,
      ).toBe(true)
    }
    // ⛔ AND A ROW THE SWEEP PRESSES THAT LM-14 EXCLUDED WOULD BE A FALSE DEFECT.
    for (const id of excluded) {
      expect(pressed.has(id), `${id} is excluded by LM-14 and must not be pressed`).toBe(false)
    }
    expect(
      owed.filter((id) => !pressed.has(id)),
      'these rows are in NFR-004 population and no probe presses them',
    ).toEqual([])
  },
)

test('the declarations this file makes are ones a Chapter 9 generator could use', () => {
  const known = new Set<string>()
  for (const id of ['T-023a', 'T-023b', 'T-023c', 'T-023d', 'T-023', 'T-036', 'T-024']) {
    for (const row of specTable(id).rows) known.add(row.id)
  }
  expectDeclarationsUsable(registry, known)
})

/**
 * ⭐⭐ ONE CASE FOR ALL THREE READINGS, AND IT IS THE LAST IN THE FILE. Measured
 * on this machine: when a failing case in this file is followed by another
 * case, the run stops printing after the failure and never exits -- it has to
 * be killed. A run whose only failure is its last case ends normally (8.2m).
 * ⛔ So the three readings are not three cases. They are asserted in the order
 * a reader needs them:
 *
 *   1  the policy refused nothing when the file was opened directly (CN-8)
 *   2  which rows did not answer under file://
 *   3  which rows did not answer over http:// -- those are NOT this scheme's
 *   4  which rows answer over http and NOT from a file -- NFR-004's own MUST
 *   5  which rows behave differently at all
 *
 * ⚠️ They are soft, so that one run says everything it found rather than only
 * the first thing.
 */
test(
  registry.swsCase({
    sws: 'SWS-8',
    level: 'System',
    covers: ['MK-1', 'MK-13', 'SL-1', 'GR-3', 'SK-2', 'IO-1', 'IO-7'],
    given: 'the built deliverable pressed over its whole NFR-004 population twice',
    when: 'the file:// sweep is set beside the http:// sweep of the same bytes',
    then: 'nothing is answered over http that a directly opened file does not answer',
  }),
  () => {
    expect.soft(fileResult.refusals, 'CN-8: the policy refused something under file://').toEqual([])
    expect.soft(fileResult.pageErrors, 'an uncaught error while sweeping under file://').toEqual([])
    expect.soft(httpResult.pageErrors, 'an uncaught error while sweeping under http://').toEqual([])

    expect
      .soft(couldNotBePressed(fileResult), 'rows the sweep could not reach at all under file://')
      .toEqual([])
    expect
      .soft(didNotAnswer(fileResult), 'rows that did not answer under file://')
      .toEqual([])
    // ⭐ THE SAME LIST OVER http IS WHAT TELLS THE TWO KINDS OF DEFECT APART: a
    // row in both lists is some other defect, and a row in the file list alone
    // is NFR-004's.
    expect
      .soft(
        didNotAnswer(httpResult),
        'rows that did not answer over http either -- the file scheme is not their reason',
      )
      .toEqual([])

    const onlyOverHttp = PROBES.filter(
      (probe) =>
        answeredAsPromised(probe, httpResult.outcomes[nameOf(probe)]) &&
        !answeredAsPromised(probe, fileResult.outcomes[nameOf(probe)]),
    ).map(nameOf)
    expect
      .soft(
        onlyOverHttp,
        'these rows answer over http but not from a file opened directly -- NFR-004 (MUST)',
      )
      .toEqual([])

    const differing = PROBES.filter((probe) => {
      const name = nameOf(probe)
      const underFile = fileResult.outcomes[name]
      const underHttp = httpResult.outcomes[name]
      if (underFile === undefined || underHttp === undefined) return true
      return JSON.stringify(comparable(underFile)) !== JSON.stringify(comparable(underHttp))
    }).map(nameOf)
    expect
      .soft(
        differing,
        'these rows behave differently when the deliverable is opened directly -- NFR-004 (MUST)',
      )
      .toEqual([])
  },
)

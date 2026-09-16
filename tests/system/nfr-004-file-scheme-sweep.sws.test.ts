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

// WHY: not index.html and not the dev server -- CN-1 of table T-003 makes the
// WHY: deliverable one file, and NFR-004 is a statement about that file.
const DELIVERABLE = join(process.cwd(), 'dist', 'index.html')

// WHY: readings are compared in pairs rather than trusted after one delay --
// WHY: see settled.
const QUIET_MS = 250

const SWEEP_MS = 2_400_000

// see NFR-004

// WHY: not fixed at 2 letters -- prefixes run 1-3 letters (tbl-row-id-prefixes.md);
// PTD (DFC-468 rename) needs 3, and a 2-letter-only pattern missed T-023a's rows.
const ROW_ID = /^[A-Z]{1,3}-\d+[a-z]?$/

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

// WHY: canvas and page are hashed separately -- watching only canvas would
// WHY: have called IC-14, IC-15 and IC-21 dead (FR-053 / EN-1 of table T-237).
interface Reading {
  readonly roles: readonly string[]
  readonly canvas: number
  readonly page: number
  readonly notices: readonly string[]
  // see SL-8
  readonly dashed: number
  readonly shapes: number
  readonly saved: readonly string[]
  readonly asked: readonly string[]
  // see MK-10, MK-12
  readonly prevented: readonly string[]
  readonly notPrevented: readonly string[]
  // see IO-6
  readonly clipboardWrites: number
}

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

// WHY: a fixed delay is what tests/system/live-app.ts already refuses -- the
// WHY: shell may draw twice on the way up, so agreement is the condition.
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

// WHY: the SVG carries no data-uid and no id on a bar, so table T-023d's grab
// WHY: regions can only be reached by coordinate (see tests/system/live-app.ts).

interface Spot {
  readonly x: number
  readonly y: number
}

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
  readonly dependencyLines: number
}

interface Geometry {
  // see GR-12, MK-8, PTD-3, SL-1
  readonly barBody: Spot
  // see GR-3
  readonly barStart: Spot
  // see GR-4
  readonly barFinish: Spot
  // see SL-2, SL-4
  readonly otherBar: Spot | null
  // see PTD-4, PTD-5, MK-6, MK-11
  readonly empty: Spot | null
  // see GR-19
  readonly paletteBand: Spot | null
  // see GR-20
  readonly rowGrab: Spot | null
  // see GR-16
  readonly statusLine: Spot | null
  // see GR-13
  readonly dependency: Spot | null
  // WHY: null with lines drawn means no place to press; null with none drawn
  // WHY: means RT-4a left the link out at this zoom -- GR-13 names which.
  readonly dependencyLines: number
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
  // ⛔ ONLY THE PLAN BOX IS GRABBABLE. item-hit-area.ts states it in as many
  // words -- the actual bar's BODY is deliberately not a grab area, and only its
  // ENDS are (GR-5 / GR-6 / GR-15). Before this filter the widest qualifying
  // polygons after the sweep's zooms were -actual ones, so SL-7b pressed twice
  // on ground that selects nothing and then read SL-7b's own MUST NOT -- the one
  // about a range selection and a select-all making no order -- as a defect.
  // Measured 2026-09-07: with the
  // filter the same 22 preceding probes leave the dashed count 11 -> 11 -> 12 and
  // IC-37 enabled.
  //
  // WARNING: A KEY NAMES A CONTIGUOUS RUN, NOT ONE ELEMENT. DFC-316 lets one bar
  // take more than one SVG element under the same data-figure key -- a thin bar
  // is a line, a head polygon and its dot marks, all sharing one key -- and a
  // run's elements sit next to each other in document order, never apart.
  // Selecting polygon elements alone and matching the key on each therefore
  // either drops the line/dots half of a run or, where a run happens to place
  // two polygons back to back, counts one figure as two boxes. The assumption a
  // reader here must make -- and the one this makes -- is that a key's elements
  // are ALWAYS the run starting at its first occurrence and ending at the last
  // element still carrying it, so grouping by that run gives one box per figure
  // regardless of how many elements it was drawn with.
  const runs = []
  {
    const all = [...svg.querySelectorAll('[data-figure]')]
    let index = 0
    while (index < all.length) {
      const key = all[index].getAttribute('data-figure') || ''
      let end = index + 1
      while (end < all.length && (all[end].getAttribute('data-figure') || '') === key) end += 1
      runs.push({ key, elements: all.slice(index, end) })
      index = end
    }
  }
  const unionOf = (elements) => {
    const rects = elements.map((e) => e.getBoundingClientRect())
    const left = Math.min.apply(null, rects.map((r) => r.left))
    const top = Math.min.apply(null, rects.map((r) => r.top))
    const right = Math.max.apply(null, rects.map((r) => r.right))
    const bottom = Math.max.apply(null, rects.map((r) => r.bottom))
    return { left, top, right, bottom, width: right - left, height: bottom - top }
  }
  const boxes = runs
    // WARNING: A RUN QUALIFIES ONLY IF IT HAS A POLYGON IN IT, the same
    // restriction this selector always had (it read svg.querySelectorAll of
    // polygon before). A milestone WITH marks folds its bar and its marks into
    // one path element (SvgRenderer's barSvg), never a polygon, and dropping
    // that restriction would let this file start pressing milestones nothing
    // here asked it to -- measured: SK-19 stopped answering once a plain
    // data-figure selector let such a path compete for the widest box.
    .filter((run) => run.key.endsWith('-plan') && run.elements.some((e) => e.tagName === 'polygon'))
    .map((run) => unionOf(run.elements))
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
  const uncovered = (x, y) => {
    for (const r of blockers) if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return false
    return true
  }
  const clear = (x, y) => {
    if (!uncovered(x, y)) return false
    for (const r of boxes) if (x >= r.left - 20 && x <= r.right + 20 && y >= r.top - 12 && y <= r.bottom + 12) return false
    return true
  }
  let empty = null
  for (let y = Math.round(area.bottom) - 60; y > area.top + 140 && !empty; y -= 14) {
    for (let x = Math.round(area.right) - 60; x > area.left + 200; x -= 24) {
      if (clear(x, y)) { empty = { x, y }; break }
    }
  }
  // ⛔⛔ A BAR UNDER THE COMMAND PALETTE IS NOT A BAR THIS SWEEP CAN PRESS, and
  // that is measured rather than careful: GR-19 of table T-023d says the palette
  // floats over the schedule and that the band wins over whatever is drawn
  // beneath it. Until 2026-09-07 the three press points were taken from the
  // widest bar with no such check, and a zoom that changed WHICH bar was widest
  // could hand back one lying under the palette. Measured on the shipped build:
  // after SK-16 the point came back at (505, 236) with the palette's own
  // commands on top of it, and every gesture from there -- SK-19's double-click
  // included -- went into the palette, so the row was reported as not answering
  // while nothing was wrong with it. ⭐ The three points are checked rather than
  // the whole rectangle: a long bar may legitimately run under the palette at
  // one end while the places this sweep touches are in the open.
  // ⭐ TWO POOLS, because the two bars are touched in different places. The
  // second bar is only ever CLICKED IN ITS MIDDLE (SL-2, SL-4, SL-7b), so its
  // middle is the whole of what has to be in the open; the first is also dragged
  // from both of its ends (GR-3, GR-4), so all three points have to be.
  const middleClear = boxes.filter((r) => uncovered(r.left + r.width / 2, r.top + r.height / 2))
  const pressable = middleClear.filter((r) =>
    uncovered(r.left + 2, r.top + r.height / 2) &&
    uncovered(r.right - 2, r.top + r.height / 2))
  const first = pressable[0]
  const second = first
    ? (middleClear.find((r) => r !== first && Math.abs(r.top - first.top) > 20) || null)
    : null
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
  // ⛔⛔ A DEPENDENCY IS PRESSED ON ITS OWN INK, AND ITS KEY IS WHAT FINDS IT.
  // What stood here took the CENTRE OF THE BOUNDING RECTANGLE of the first
  // <polyline> in document order that was not tiny and was clear of every bar,
  // and both halves of that were wrong. Measured 2026-09-09 on this build,
  // with the point that chooser returned then clicked:
  //
  //   fresh page          -> task-48-guide  (845, 773)  canvas unchanged
  //   after MK-1..MK-5    -> task-9-guide  (1540, -227) canvas unchanged
  //   after 'f'           -> task-713-guide (774, 890)  canvas changed
  //
  // ⛔ SO IT NEVER REACHED A DEPENDENCY AT ALL. 'polyline' is the tag the
  // renderer also draws a task's guide line, a marker and the progress line
  // with, the guides come first in document order, and their rectangles are
  // 42x0 / 53x0 -- which the old width-AND-height test let through. The third
  // reading is the worse one: a guide DID move the drawing, so on another day
  // the same chooser would have reported GR-13 green for pressing something
  // that is not a dependency.
  // ⛔ AND A BOUNDING RECTANGLE'S CENTRE IS NOT ON THE LINE. A dependency is
  // drawn as an orthogonal Z (measured: '1454,1563 1461,1563 1461,979
  // 1437,979 1437,388 1451,388'), so its rectangle's middle sits in the open
  // space the Z encloses, and one of those middles was 227px ABOVE the window.
  //
  // ⭐ WHAT IS TAKEN INSTEAD: the renderer names each link 'dep-<pred>-<succ>'
  // (svg-renderer.ts, 'figureKey('dep-...')'), so the key selects them; each
  // segment of the drawn path is walked, mapped into client space through the
  // element's own screen CTM, and a point is taken ALONG the segment -- never
  // its rectangle -- inside the schedule area and clear of every bar. The ends
  // are avoided because MK-9a gives the bar's own row the press there.
  // Measured with this chooser: the click lands on 'dep-9-281' / 'dep-290-291'
  // and the canvas is redrawn in all three states above.
  const dependencyLines = [...svg.querySelectorAll('polyline[data-figure]')]
    .filter((e) => (e.getAttribute('data-figure') || '').indexOf('dep-') === 0)
  const dependency = (() => {
    let best = null
    for (const e of dependencyLines) {
      const ctm = e.getScreenCTM()
      if (ctm === null) continue
      const numbers = (e.getAttribute('points') || '').trim().split(/[\\s,]+/).map(Number)
      const corners = []
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        const p = svg.createSVGPoint()
        p.x = numbers[i]
        p.y = numbers[i + 1]
        const q = p.matrixTransform(ctm)
        corners.push({ x: q.x, y: q.y })
      }
      for (let i = 0; i + 1 < corners.length; i += 1) {
        const from = corners[i]
        const to = corners[i + 1]
        const length = Math.hypot(to.x - from.x, to.y - from.y)
        // ⚠️ A 24px run is the shortest this file will aim at: shorter than
        // that and every point on it is within the bar row's own reach.
        if (length < 24) continue
        for (const along of [0.5, 0.35, 0.65, 0.2, 0.8]) {
          const x = Math.round(from.x + (to.x - from.x) * along)
          const y = Math.round(from.y + (to.y - from.y) * along)
          // ⛔ A SEGMENT MAY RUN THOUSANDS OF PIXELS PAST THE WINDOW (measured:
          // one is 5810px long), so the POINT, not the segment, has to be in
          // the schedule area -- a press outside it is dispatched into nothing.
          if (x < area.left + 8 || x > area.right - 8) continue
          if (y < area.top + 8 || y > area.bottom - 8) continue
          if (!clear(x, y)) continue
          if (best === null || length > best.length) best = { x, y, length }
          break
        }
      }
    }
    return best === null ? null : { x: best.x, y: best.y }
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
    dependencyLines: dependencyLines.length,
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

// see T-051, HF-6
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
 * drawing is meant to come back. PTD-1 and GR-19 put the same MUST on following
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

// see GR-21
interface Lane {
  readonly grip: Spot
  readonly gripLength: number
  readonly trackLength: number
}

/**
 * One lane of U-21 `Scrollbars` -- `GR-21` of table T-023d.
 *
 * ⛔ NOT PART OF `GEOMETRY_SCRIPT`, and not a member of `Geometry`. The two
 * lanes are drawn as `div`s OUTSIDE the `Schedule Canvas` SVG that script
 * measures, and the grip is the lane's first child rather than a shape in the
 * drawing -- so the absence recorded above (no `data-uid`, no `id` on a bar)
 * says nothing about this one, and no coordinate has to be guessed here.
 *
 * ⭐ WHICH LANE IS READ OFF `data-axis`, the mark
 * `src/framework/dom-screen-surface/dom-screen-surface.ts` writes for exactly
 * this reason: table T-103 gives BOTH lanes the one name `Scrollbars`, so the
 * role alone cannot tell them apart, and `GR-21` needs which -- the two move
 * different halves of the display position.
 *
 * ⭐ THE TWO LENGTHS COME BACK TOO, because `GR-21` (MUST) makes the grip's
 * length 「見えている範囲 ÷ 全体」 of the lane's: a grip AS LONG AS ITS LANE is
 * the tool saying there is nothing to scroll on that axis, and a drag that
 * moves nothing then says something about the document rather than about the
 * row.
 *
 * @purity non-pure
 */
async function laneOf(page: Page, axis: 'horizontal' | 'vertical'): Promise<Lane> {
  const found = (await page.evaluate((wanted: string) => {
    const lane = document.querySelector(`[data-role="Scrollbars"][data-axis="${wanted}"]`)
    const grip = lane === null ? null : lane.firstElementChild
    if (lane === null || grip === null) return null
    const track = lane.getBoundingClientRect()
    const box = grip.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    const along = wanted === 'horizontal'
    return {
      grip: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      gripLength: along ? box.width : box.height,
      trackLength: along ? track.width : track.height,
    }
  }, axis)) as Lane | null
  if (found === null) {
    throw new Error(`GR-21: the ${axis} lane of U-21 put out no grip this sweep could take hold of`)
  }
  return found
}

// WHY: Reading.canvas hashes a shell-generated id that changes on every
// WHY: redraw; GR-21 redraws without moving, so those ids are stripped first.
/** @purity non-pure */
async function drawingOf(page: Page): Promise<string> {
  return (await page.evaluate(`(() => {
    const canvas = document.querySelector('[data-role="Schedule Canvas"] svg')
    if (canvas === null) return ''
    return canvas.outerHTML.replace(/grs-[a-z-]+-[a-z0-9]{4,}/g, 'grs-id')
  })()`)) as string
}

interface AxisSpans {
  readonly timeSpans: Readonly<Record<string, number>>
  readonly rowSpans: Readonly<Record<string, number>>
}

// WHY: a plan run's width is days times the day width, and a row band's height
// WHY: is the row axis; both are keyed so one reading is compared id by id.
/** @purity non-pure */
async function axisSpansOf(page: Page): Promise<AxisSpans> {
  return (await page.evaluate(`(() => {
    const timeSpans = {}
    const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
    if (svg !== null) {
      const boxes = {}
      for (const e of svg.querySelectorAll('[data-figure]')) {
        const key = e.getAttribute('data-figure') || ''
        if (!key.endsWith('-plan')) continue
        const r = e.getBoundingClientRect()
        const had = boxes[key]
        boxes[key] = had === undefined
          ? { left: r.left, right: r.right }
          : { left: Math.min(had.left, r.left), right: Math.max(had.right, r.right) }
      }
      for (const key of Object.keys(boxes)) {
        const width = boxes[key].right - boxes[key].left
        if (width >= 2) timeSpans[key] = width
      }
    }
    const rowSpans = {}
    for (const row of document.querySelectorAll('[data-group-id][data-depth]')) {
      const height = row.getBoundingClientRect().height
      if (height >= 1) rowSpans[row.getAttribute('data-group-id') || ''] = height
    }
    return { timeSpans, rowSpans }
  })()`)) as AxisSpans
}

/** @purity pure */
function medianRatio(
  before: Readonly<Record<string, number>>,
  after: Readonly<Record<string, number>>,
): number | null {
  const ratios = Object.keys(before)
    .filter((key) => after[key] !== undefined)
    .map((key) => (after[key] ?? 0) / (before[key] ?? 1))
    .sort((a, b) => a - b)
  if (ratios.length === 0) return null
  return ratios[Math.floor(ratios.length / 2)] ?? null
}

// WHY: moved alone is vacuous for a zoom key (any redraw moves the hashes), so
// WHY: the act throws unless the named axis stepped the named way and only it.
// see FR-016, T-036
/** @purity non-pure */
async function zoomStroke(
  page: Page,
  keys: string,
  axis: 'time' | 'row',
  direction: 'in' | 'out',
): Promise<null> {
  const before = await axisSpansOf(page)
  await page.keyboard.press(keys)
  await settled(page)
  const after = await axisSpansOf(page)
  const time = medianRatio(before.timeSpans, after.timeSpans)
  const row = medianRatio(before.rowSpans, after.rowSpans)
  const moving = axis === 'time' ? time : row
  const still = axis === 'time' ? row : time
  const told = `${keys}: time axis x${String(time)}, row axis x${String(row)}`
  if (moving === null || still === null) {
    throw new Error(`${told} -- no id was drawn both before and after the key to compare`)
  }
  const tolerance = 0.005
  const stepped = direction === 'in' ? moving > 1 + tolerance : moving < 1 - tolerance
  if (!stepped) {
    throw new Error(`${told} -- the ${axis} axis was to zoom ${direction} and did not`)
  }
  if (Math.abs(still - 1) > tolerance) {
    throw new Error(`${told} -- the key names the ${axis} axis only, and the other axis moved`)
  }
  return null
}

interface Probe {
  readonly rows: readonly string[]
  // WHY: answersWhileHeld is SL-3/PTD-1/GR-19's while-held answer; placesNothing
  // WHY: is PTD-4a/MK-12/SK-1's "no shape placed"; answersSilently is SK-4's own.
  readonly expect: 'answers' | 'answersWhileHeld' | 'placesNothing' | 'answersSilently'
  // WHY: runs before the baseline reading -- otherwise a row needing something
  // WHY: armed first reads the setting-up itself as the answer (measured, SK-4).
  readonly setUp?: (page: Page, at: Geometry) => Promise<void>
  readonly act: (page: Page, at: Geometry) => Promise<number | null>
}

async function calm(page: Page): Promise<void> {
  // WHY: NT-7's answers are word buttons spelled Yes / No in every language,
  // WHY: with no row of T-109; No puts a question down without changing the document.
  // see NT-7, U-55, W-4, FR-038
  for (const selector of [
    '[data-notice]',
    `[data-role="Confirmation"] button:text-is("No")`,
    '[data-icon="IC-52"]',
  ]) {
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
  await page.evaluate(() =>
    document.fullscreenElement === null ? undefined : document.exitFullscreen().catch(() => undefined),
  )
  // WHY: SK-14 toggles the palette and later probes press its entrances, so
  // WHY: it is put back here through IC-7, the same route SK-14 itself uses.
  if ((await page.$('[data-role="Command Palette"]')) === null) {
    const toggle = await page.$('[data-icon="IC-7"]')
    if (toggle !== null) {
      await toggle.click({ timeout: 3_000 }).catch(() => undefined)
      await page.waitForTimeout(300)
    }
  }
}

// WHY: page.click reports the same "Timeout 8000ms exceeded" whichever of
// WHY: four causes applies, so they are read apart here for couldNotBePressed.
/** @purity non-pure */
async function press(page: Page, icon: string): Promise<null> {
  const selector = `[data-icon="${icon}"]`
  try {
    await page.click(selector, { timeout: 8_000 })
  } catch (thrown) {
    const seen = await page.evaluate((wanted: string) => {
      const entry = document.querySelector(wanted)
      if (entry === null) return 'not in the page'
      const box = entry.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return `drawn with no size (${box.width}x${box.height})`
      const middle = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
      if (middle === null) return `at (${Math.round(box.x)}, ${Math.round(box.y)}), outside the window`
      if (middle !== entry && !entry.contains(middle)) {
        const over = middle.closest('[data-role]')
        return `covered by ${over === null ? middle.tagName : String(over.getAttribute('data-role'))}`
      }
      // see FR-029
      if (entry.getAttribute('aria-disabled') === 'true' || entry.getAttribute('data-enabled') === 'false') {
        return 'reachable but turned off by the tool (aria-disabled), so its rule was not met'
      }
      return 'reachable and not turned off, and the press still failed'
    }, selector)
    throw new Error(
      `${icon} could not be pressed: ${seen} -- ${
        thrown instanceof Error ? thrown.message.split('\n')[0] ?? '' : String(thrown)
      }`,
    )
  }
  return null
}

async function selectBar(page: Page, at: Geometry): Promise<void> {
  await page.mouse.click(at.barBody.x, at.barBody.y)
  await page.waitForTimeout(250)
}

// WHY: selectBar alone is not enough -- FR-085 (MUST) keeps the panel's row
// WHY: selection separate from the schedule area's, so SK-4 needs one row here.
/** @purity non-pure */
async function selectOneRow(page: Page): Promise<void> {
  const rows = page.locator('[data-depth]')
  const drawn = await rows.count()
  if (drawn === 0) throw new Error('SK-4 needs a row of the Row Title Panel to take a copy of')
  // see FR-018
  await rows.nth(drawn > 1 ? 1 : 0).click({ timeout: 5_000 })
  await page.waitForTimeout(300)
}

async function stroke(page: Page, keys: string): Promise<null> {
  await page.keyboard.press(keys)
  return null
}

// see FR-071, SK-15
async function fullScreenStroke(page: Page): Promise<null> {
  await page.keyboard.press('F11')
  await page.waitForTimeout(600)
  const seen = await page.evaluate(() => {
    const keys = ((window as unknown as { __grsKeys?: KeyboardEvent[] }).__grsKeys ?? []).filter(
      (one) => one.key === 'F11',
    )
    const entry = document.querySelector('[data-icon="IC-11"]')
    return {
      prevented: keys.length > 0 && keys.every((one) => one.defaultPrevented),
      entered: document.fullscreenElement === document.documentElement,
      held: document.fullscreenElement !== null,
      pressed: entry !== null && entry.getAttribute('aria-pressed') === 'true',
      told: document.querySelectorAll('[data-notice]').length > 0,
    }
  })
  if (!seen.prevented) {
    throw new Error('SK-15: the F11 keydown kept its browser default -- FR-071 (MUST) has it stopped')
  }
  if (!seen.entered && !seen.told) {
    throw new Error('SK-15: F11 neither put document.documentElement in full screen nor told RS-59 -- FR-071 (MUST)')
  }
  if (seen.pressed !== seen.held) {
    throw new Error(
      `SK-15: IC-11 drawn pressed=${String(seen.pressed)} while document.fullscreenElement is ` +
        `${seen.held ? 'set' : 'null'} -- FR-071 (MUST NOT) does not let the ask alone move S-99f`,
    )
  }
  return null
}

// WHY: order is part of the reading -- SL-2's replacement can only be seen
// WHY: after SL-1 has made a selection, so probes run in the table's order.
// see SK-16, T-036
const TIME_ZOOM_IN = 'Shift+='

// see FR-039, T-252, DS-4, S-1
const TIME_ZOOM_STEPS = 12

const PROBES: readonly Probe[] = [
  { rows: ['MK-1'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, [], 400); return null } },
  { rows: ['MK-2'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Control'], -300); return null } },
  { rows: ['MK-3'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Shift'], -300); return null } },
  { rows: ['MK-4'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Alt'], -300); return null } },
  { rows: ['MK-5'], expect: 'answers', act: async (p, g) => { await wheelAt(p, g.barBody, ['Control', 'Shift'], 400); return null } },
  {
    // see ZO-6
    rows: ['MK-6', 'PTD-5', 'SL-3'],
    expect: 'answersWhileHeld',
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PTD-5 needs a place in the schedule area with nothing drawn under it')
      return dragFrom(p, g.empty, -260, -90)
    },
  },
  {
    rows: ['MK-7', 'PTD-1'],
    expect: 'answers',
    act: async (p, g) => {
      await p.keyboard.down('Control')
      const held = await dragFrom(p, g.barBody, 180, 60)
      await p.keyboard.up('Control')
      return held
    },
  },
  { rows: ['MK-8', 'PTD-3', 'GR-12', 'SL-7'], expect: 'answers', act: async (p, g) => dragFrom(p, g.barBody, 140, 0) },
  { rows: ['MK-9'], expect: 'answers', act: async (p) => press(p, 'IC-12') },
  {
    // see GR-19
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

  {
    rows: ['AR-2', 'PTD-4'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-23') },
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PTD-4 needs an empty place to draw a task in')
      return dragFrom(p, g.empty, 220, 0)
    },
  },
  {
    rows: ['AR-3'],
    expect: 'answers',
    // WHY: IC-50 opens the milestone shapes; IC-27..IC-34 are not drawn until it has.
    setUp: async (p) => { await press(p, 'IC-50'); await p.waitForTimeout(300) },
    act: async (p) => press(p, 'IC-27'),
  },
  {
    // PTD-4a: 「何もしない。引きかけの矢印があれば捨てる。構えは解かない」 -- so
    // the drawing must NOT gain a shape. ⛔ The arm is taken in `setUp`, because
    // arming marks the palette and that marking is a screen change of its own.
    rows: ['AR-4', 'PTD-4a'],
    expect: 'placesNothing',
    setUp: async (p) => { await press(p, 'IC-61') },
    act: async (p, g) => {
      if (g.empty === null) throw new Error('PTD-4a needs an empty place to drag in')
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
    // see FR-034
    rows: ['SL-7b'],
    expect: 'answers',
    setUp: async (p, g) => {
      if (g.otherBar === null) {
        throw new Error('SL-7b needs a second target: an order is what FR-034 reads')
      }
      // WHY: the mark count alone says nothing (dashed elements exist before any
      // WHY: selection), so it is read three times and the steps between judged.
      const marks = async (): Promise<number> =>
        p.evaluate(() => {
          const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
          return svg === null ? -1 : svg.querySelectorAll('[stroke-dasharray]').length
        })
      const atFirst = await marks()
      await p.mouse.click(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(150)
      const afterOne = await marks()
      await p.keyboard.down('Shift')
      await p.mouse.click(g.otherBar.x, g.otherBar.y)
      await p.keyboard.up('Shift')
      await p.waitForTimeout(400)
      // WHY: the entrance is turned off until the selection has an order --
      // WHY: read here so a setting-up that did not take is named, not timed out.
      const armed = await p.evaluate(() => {
        const entry = document.querySelector('[data-icon="IC-37"]')
        const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
        return {
          enabled: entry === null ? 'no entry' : String(entry.getAttribute('data-enabled')),
          marked: svg === null ? -1 : svg.querySelectorAll('[stroke-dasharray]').length,
        }
      })
      if (armed.enabled !== 'true') {
        throw new Error(
          `two presses left the alignment entrance turned off (data-enabled=${armed.enabled}); ` +
            `dashed elements went ${String(atFirst)} -> ${String(afterOne)} -> ` +
            `${String(armed.marked)} across the plain press at (${String(g.barBody.x)}, ` +
            `${String(g.barBody.y)}) and the Shift press at (${String(g.otherBar.x)}, ` +
            `${String(g.otherBar.y)}) -- a step of one each time is a press that took`,
        )
      }
    },
    act: async (p) => press(p, 'IC-37'),
  },

  {
    // PTD-2: in `Dual Cursor` mode 「当たり判定を行わない」, so a press on a bar
    // must not be a press on the bar. IC-45 is that mode's entrance, and it is
    // taken in `setUp` so that what is read is the PRESS and not the entering.
    rows: ['PTD-2'],
    expect: 'answers',
    setUp: async (p) => { await press(p, 'IC-45'); await p.waitForTimeout(400) },
    act: async (p, g) => {
      await p.mouse.click(g.barBody.x, g.barBody.y)
      await p.waitForTimeout(200)
      await p.keyboard.press('Escape')
      return null
    },
  },

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
    // WHY: HF-6 puts a row's controls out on hover, and moved folds the body's
    // WHY: hash in -- so the pointer is revealed in setUp, before the baseline,
    // WHY: leaving the click in the act as the only new thing the baseline lacks.
    rows: ['GR-13'],
    expect: 'answers',
    setUp: async (p, g) => {
      if (g.dependency !== null) await reveal(p, g.dependency)
    },
    act: async (p, g) => {
      if (g.dependency === null) {
        throw new Error(
          g.dependencyLines === 0
            ? 'GR-13 could not be pressed: the drawing put out no dependency line at this zoom'
            : `GR-13 could not be pressed: ${String(g.dependencyLines)} dependency lines are drawn ` +
              'and no point on one of them is in the schedule area and clear of every bar',
        )
      }
      await p.mouse.click(g.dependency.x, g.dependency.y)
      return null
    },
  },
  {
    // see FR-013
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
    // see FR-044
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
    // see AS-1
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
    // see AR-5, PTD-4
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

  {
    rows: ['SK-3'],
    expect: 'answers',
    setUp: selectBar,
    act: async (p) => {
      await p.keyboard.press('Delete')
      await p.waitForTimeout(500)
      // WHY: a question is owed only where T-234 has a row, so its absence is
      // WHY: not a failure; an answered question that still stands is.
      // see NT-7, U-55, T-234
      const asked = '[data-role="Confirmation"]'
      const yes = await p.$(`${asked} button:text-is("Yes")`)
      if (yes !== null) {
        await yes.click({ timeout: 3_000 })
        await p.waitForTimeout(500)
        if ((await p.$(asked)) !== null) {
          throw new Error('SK-3: Yes was pressed on the NT-7 question and the question still stands')
        }
      }
      return null
    },
  },
  {
    // WHY: FR-033 (MUST) keeps a copy inside the application and writes, draws
    // WHY: and changes nothing, so silence is the answer and a notice the refusal.
    rows: ['SK-4'],
    expect: 'answersSilently',
    setUp: async (p) => selectOneRow(p),
    act: async (p) => stroke(p, 'Control+c'),
  },
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
    // see T-028, IN-4
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
  { rows: ['SK-15'], expect: 'answers', setUp: selectBar, act: async (p) => fullScreenStroke(p) },
  { rows: ['SK-16'], expect: 'answers', setUp: selectBar, act: async (p) => zoomStroke(p, 'Shift+=', 'time', 'in') },
  { rows: ['SK-16b'], expect: 'answers', setUp: selectBar, act: async (p) => zoomStroke(p, 'Shift+-', 'time', 'out') },
  {
    // WHY: MK-4's three notches leave the row axis at its FR-016 ceiling, where
    // WHY: Alt+= has nothing left to take; one notch out in setUp leaves it room,
    // WHY: and SK-16c still starts from where it started before.
    // see FR-016, SK-16a, SK-16c, MK-4
    rows: ['SK-16a'],
    expect: 'answers',
    setUp: async (p) => {
      await p.keyboard.press('Alt+-')
      await settled(p)
      await selectBar(p, await geometryOf(p))
    },
    act: async (p) => zoomStroke(p, 'Alt+=', 'row', 'in'),
  },
  { rows: ['SK-16c'], expect: 'answers', setUp: selectBar, act: async (p) => zoomStroke(p, 'Alt+-', 'row', 'out') },
  { rows: ['SK-17'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'Control+0') },
  { rows: ['SK-18'], expect: 'answers', setUp: selectBar, act: async (p) => stroke(p, 'f') },
  {
    // ⛔⛔ WHAT THIS PROBE JUDGES IS SK-19's SECOND STAGE (DFC-382). Table T-036's
    // row reads 「その場の編集を確定する」 and then 「確定していないその場の編集が
    // 1 つも無いときは、プロパティパネルを出しているならば出すのをやめること
    // （MUST）」. The MUST is the second one, so the panel has to be UP before the
    // press this probe reads, and nothing may be held in a field.
    //
    // ⛔⛔ THE DOUBLE-CLICK THAT USED TO SET THIS UP DID NOT PUT THE PANEL UP,
    // AND THAT -- NOT THE BUILD -- IS WHY THE ROW WAS RED. Measured 2026-09-08 on
    // the shipped build with the four probes that stand before this one replayed
    // in order (SK-16, SK-16a, SK-17, SK-18) and `calm` run between them, then
    // the same `geometryOf` point double-clicked:
    //
    //   from a fresh page   dblclick (584, 511) -> Properties Panel 279px wide
    //   after those four    dblclick (839, 762) -> Properties Panel 0px wide
    //
    // ⭐ THE ZOOM IS WHAT MOVED IT. `SK-18` is `f`, and after the fit the widest
    // `-plan` run this file's geometry picks is not a `Task`'s bar -- and `MK-13`
    // of table T-023 opens the panel for 「タスク（名称ラベルと本体のどちらでも）」
    // and for a row heading, not for whatever else may be the widest thing drawn.
    // ⇒ Both `Enter` presses then landed with no panel up and nothing held, so
    // `moved` read zero on a build that was obeying the row.
    //
    // ⭐⭐ THE PANEL IS THEREFORE PUT UP THROUGH `IC-17`, which is the OTHER
    // settled road to it: 表 T-109 gives that entrance 「文書の描画設定をプロパ
    // ティパネルに表示する」, and it sits in the `App Header`, so no zoom can move
    // it out from under the press. ⛔ This is the same shape `SK-8` already uses
    // -- put the surface up through its own entrance, then read the key that has
    // to close it. Measured on the same run: `IC-17` -> panel 279px, `Enter` ->
    // panel 0px with the canvas and the body both redrawn.
    // ⛔ NOT A WEAKENED EXPECTATION: the row still has to move something, and the
    // reading is still `answers`.
    rows: ['SK-19'],
    expect: 'answers',
    setUp: async (p, g) => {
      await selectBar(p, g)
      await press(p, 'IC-17')
      await p.waitForTimeout(600)
      // ⛔ THE LEVEL ABOVE BOTH STAGES IS PUT AWAY FIRST. The same row opens with
      // 「出ている通知があるときは、それを 1 つ消すこと（MUST）」, and a telling
      // left standing would eat the press below -- the reading would then be
      // `NT-8`'s put-away rather than the panel's.
      const telling = await p.$('[data-notice]')
      if (telling !== null) await telling.click({ timeout: 2_000 }).catch(() => undefined)
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
    // WHY: the pointer sits over PTD-4's empty place, and Enter also closes
    // WHY: SK-19's panel -- a widen-on-close would move the shape count too.
    setUp: async (p, g) => {
      await p.keyboard.press('Escape')
      await p.waitForTimeout(200)
      await press(p, 'IC-23')
      if (g.empty !== null) await p.mouse.move(g.empty.x, g.empty.y)
      await p.waitForTimeout(200)
    },
    // WHY: arrow keys are not pressed -- MK-10 (MUST NOT) leaves them to the
    // WHY: host, so they would scroll the page instead of testing placement.
    act: async (p) => {
      for (const one of ['Enter', 'Space']) {
        await p.keyboard.press(one)
        await p.waitForTimeout(200)
      }
      await p.keyboard.press('Escape')
      return null
    },
  },

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

  // WHY: GR-21 moves the display position, and geometryOf takes the widest
  // WHY: bar wherever it now is -- nothing may follow this probe.
  {
    rows: ['GR-21'],
    expect: 'answers',
    // ⛔⛔ THE VIEW IS PUT INTO A STATED PLACE FIRST, and without this the row
    // is read as dead for a reason that is the sweep's rather than the build's.
    // ⚠️ MEASURED 2026-09-08, twice, over the whole sweep: dragged at its place
    // here, the VERTICAL grip moved nothing -- and the reason is not `GR-21`.
    // `SK-18` (the `f` key) runs seventy probes earlier and fits the schedule,
    // and once everything is fitted the vertical grip is EXACTLY AS LONG AS ITS
    // LANE (8 x 977 in a 8 x 977 lane, measured) -- `GR-21`'s own 「見えている
    // 範囲 ÷ 全体」 saying there is nothing left to scroll downwards. ⛔ A drag
    // that moves nothing there is the tool being right.
    // ⭐ So the state is MADE rather than inherited: `SK-18` of table T-036 is
    // pressed here too, which is the tool's own entrance and leaves a place
    // this file can state. ⚠️ `Escape` first, because `f` typed into a field is
    // a letter and not a shortcut.
    setUp: async (p) => {
      await p.keyboard.press('Escape')
      await p.waitForTimeout(150)
      await p.keyboard.press('f')
      await p.waitForTimeout(600)
    },
    // ⭐⭐ THE HORIZONTAL LANE, and that is measured rather than preferred.
    // After the Fit above, the two lanes stand differently (2026-09-08, shipped
    // build, msedge, 1920x1080): the vertical grip fills its lane, and the
    // horizontal grip is 1535 in a 1702 lane -- the schedule is longer than the
    // window sideways even when it has been fitted, because `FR-051` fits what
    // the `Row Area` can hold. ⇒ Sideways is where `GR-21` still has something
    // to answer with. ⚠️ Before the Fit the horizontal grip is 421.5 in the
    // same lane and answers a 200px drag the same way, so the row is not being
    // pressed in an unusual state -- it is being pressed in a stated one.
    // ⚠️ AND WHAT WAS MEASURED NOT TO HAPPEN, the same day, with the button
    // held 600ms at the halfway point: the drawing does NOT move while the grip
    // is held -- it moves on release, on both lanes. The closing rule of table
    // T-023d (:2411 of docs/spec/01-04-requirements.md) names `GR-21` among the
    // rows that must follow the pointer while held, so that is a question of
    // its own, and it has an answer today. ⛔ It is NOT this file's question:
    // NFR-004 asks whether the row works when the deliverable is opened
    // directly, and an `answersWhileHeld` here would turn this sweep red for a
    // defect that has nothing to do with the scheme.
    // ⇒ `answers`, which is what `GR-21`'s own 操作 column promises:
    // 「掴めば表示位置を変える（規則は `FR-051`）」.
    //
    // ⛔⛔ AND `answers` ALONE WOULD BE VACUOUS HERE, WHICH IS WHY THE ACT
    // JUDGES FOR ITSELF AND THROWS. `moved` folds five readings and two of them
    // are hashes of markup the shell mints afresh on every frame, so ANY redraw
    // moves them whether or not the display position followed the grip --
    // `drawingOf` above carries the measurement. ⚠️ MEASURED 2026-09-08 by
    // shortening this drag to 0px and running the whole sweep again: `GR-21`
    // still came back `answers` under both schemes. ⛔ The row would have
    // passed with the grip doing nothing.
    // ⭐ A THROW rather than a second expectation: `couldNotBePressed` already
    // reports a probe that threw, with its own sentence, and the case at the
    // foot of this file already asserts that list is empty. Repeating the same
    // sweep with the drag at 0px now names `GR-21` there.
    act: async (p) => {
      let lane = await laneOf(p, 'horizontal')
      // see FR-039, T-252, DS-4, S-1, SK-16
      // WHY: DS-4 scales the day width too, so at the default display scale the
      // WHY: fitted schedule sits inside its lane and GR-21 has nothing to move.
      for (let step = 0; step < TIME_ZOOM_STEPS; step += 1) {
        if (lane.gripLength < lane.trackLength - 1) break
        await p.keyboard.press(TIME_ZOOM_IN)
        await settled(p)
        lane = await laneOf(p, 'horizontal')
      }
      // WHY: named rather than swallowed -- a grip as long as its lane says
      // WHY: something about the document, not about GR-21.
      if (lane.gripLength >= lane.trackLength - 1) {
        throw new Error(
          `GR-21: the horizontal grip fills its lane (${String(Math.round(lane.gripLength))} of ` +
            `${String(Math.round(lane.trackLength))}px) after ${String(TIME_ZOOM_STEPS)} steps of ` +
            `${TIME_ZOOM_IN}, so nothing is left to scroll and the row cannot be pressed here`,
        )
      }
      const before = await drawingOf(p)
      const held = await dragFrom(p, lane.grip, 200, 0)
      await settled(p)
      if ((await drawingOf(p)) === before) {
        throw new Error(
          'GR-21: the horizontal lane grip was dragged 200px and the drawing did not move -- ' +
            'FR-051 has the display position follow the grip',
        )
      }
      return held
    },
  },
]

interface SweepResult {
  readonly outcomes: Readonly<Record<string, Outcome>>
  readonly pageErrors: readonly string[]
  readonly refusals: readonly string[]
}

const nameOf = (probe: Probe): string => probe.rows.join('+')

function couldNotBePressed(result: SweepResult): readonly string[] {
  return PROBES.filter((probe) => result.outcomes[nameOf(probe)]?.failure != null).map(
    (probe) => `${nameOf(probe)}: ${result.outcomes[nameOf(probe)]?.failure ?? ''}`,
  )
}

// WHY: moved folds five readings into one boolean, so a failing row prints
// WHY: which of the five actually changed rather than a bare pass/fail.
/** @purity pure */
function reading(one: Outcome | undefined): string {
  if (one === undefined) return 'no reading'
  return (
    `moved=${String(one.moved)} notices=${String(one.noticeCount)} ` +
    `shapes${one.shapesDelta >= 0 ? '+' : ''}${String(one.shapesDelta)} ` +
    `dashed${one.dashedDelta >= 0 ? '+' : ''}${String(one.dashedDelta)} ` +
    `files+${String(one.wroteFiles)} clipboard+${String(one.clipboardDelta)} ` +
    `held=${one.heldCanvas === null ? 'none' : String(one.heldCanvas !== one.beforeCanvas)}`
  )
}

function didNotAnswer(result: SweepResult): readonly string[] {
  return PROBES.filter(
    (probe) =>
      result.outcomes[nameOf(probe)]?.failure == null &&
      !answeredAsPromised(probe, result.outcomes[nameOf(probe)]),
  ).map((probe) => `${nameOf(probe)} (${probe.expect}: ${reading(result.outcomes[nameOf(probe)])})`)
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
      // WHY: re-taken after the setting-up, so what is judged is the act.
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
        // WHY: failure is asserted first, so a thrown probe never passes as
        // WHY: placesNothing on this delta alone.
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

// WHY: one reader for both schemes, so file:// and http:// cannot be judged
// WHY: by two different standards.
function answeredAsPromised(probe: Probe, one: Outcome | undefined): boolean {
  if (one === undefined) return false
  switch (probe.expect) {
    case 'answers':
      return one.moved
    case 'answersWhileHeld':
      return one.heldCanvas !== null && one.heldCanvas !== one.beforeCanvas
    case 'placesNothing':
      return one.shapesDelta === 0
    // see FR-029
    case 'answersSilently':
      return !one.moved
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

let server: Server
const openSockets = new Set<Socket>()
let fileResult: SweepResult
let httpResult: SweepResult

// WHY: not serial -- a failure under one scheme must not skip the other's
// WHY: sweep, since the difference between the two is what NFR-004 asks.
test.describe.configure({ timeout: SWEEP_MS })

test.beforeAll(async () => {
  test.setTimeout(SWEEP_MS)
  const bytes = readFileSync(DELIVERABLE)
  server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    response.end(bytes)
  })
  // WHY: every socket is held so it can be cut -- Server.close waits for open
  // WHY: ones, and a browser leaves a keep-alive behind after its page closes.
  server.on('connection', (socket) => {
    openSockets.add(socket)
    socket.on('close', () => openSockets.delete(socket))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('the loopback server took no port')
  const httpUrl = `http://127.0.0.1:${address.port}/`

  // WHY: the browser is opened and shut inside this hook, both sweeps run here
  // WHY: rather than one per case -- a browser left open past a failed case
  // WHY: hung the run until killed, measured.
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
      ...rowsOf('T-023a').filter((id) => id.startsWith('PTD-')),
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

    // WHY: an exclusion that names nothing is an exclusion that rotted.
    for (const id of excluded) {
      expect(
        population.includes(id) || id === 'IO-5',
        `LM-14 excludes ${id}, but no table NFR-004 names holds that row any more`,
      ).toBe(true)
    }
    // WHY: a row the sweep presses that LM-14 excluded would be a false defect.
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

// WHY: one case for all three readings, last in the file -- a failing case
// WHY: followed by another hangs the run (measured), so this is soft and last.
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
    // WHY: the same list over http tells the two kinds of defect apart -- a
    // WHY: row in both is some other defect, and a row in the file list alone
    // WHY: is NFR-004's.
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

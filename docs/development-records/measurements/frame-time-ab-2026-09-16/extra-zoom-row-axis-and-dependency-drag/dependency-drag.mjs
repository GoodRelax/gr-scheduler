// A held dependency drag under production conditions (LM-19 / MC-6 / MC-7 / MC-8): the shipped
// dist/index.html of a BUILT TREE, msedge, 1920x1080, the 1000-Task startup template.
// The probe lives outside the tree and is handed the tree, so nothing is copied into it:
//   node dependency-drag.mjs --tree <built tree>                                          (production defaults)
//   node dependency-drag.mjs --tree <built tree> --tasks 50 --samples 30 --minHoldMs 500  (smoke test only)
// Prints one JSON object on stdout. Exit 0 = measured, 1 = could not be measured, 2 = bad arguments or environment.

// ---------------------------------------------------------------------------
// What is measured, and why lm-19 does not already measure it
// ---------------------------------------------------------------------------
//
// FR-009 (CR-383): while a dependency is drawn, the tip draws a tentative line
// that follows the pointer. frame-loop.ts tentativeDependencyOf runs, on every
// frame of the drag, editDocument and geometryFromLayout on a two-Task copy and
// draws one line. It runs INSIDE the redraw callback, so the time inside the
// redraw callback is the number to compare, beside the frame interval.
//
// Placing the drag (the Agent API is opened BEFORE measuring, unlike lm-19):
//   a plain leaf Task (dated, no actual, no fade, not a milestone) is chosen from
//   readDocument(); setScrollPosition puts its row at the top (scrollGroupId must be
//   a real row id, or the write is ignored) and its finish at x = TARGET_X, clear of
//   the Command Palette (x 200..604, y 85..286 at 1920x1080). The finish x is
//   Row Title Panel right + (finish - scrollDate) * pxPerDayAt1x * zoomX; the drawn
//   shape whose right edge is there is found in that row's band, and the press
//   point is the x beside that edge where the pointer shape reads ew-resize (with
//   nothing armed). A partner is a shape of another visible row, confirmed as a hit.
//
// The gesture, and why it works at stage 0 (5c1b915) and at the tip alike:
//   arm      press IC-61 in the Command Palette (AR-4). The palette is shown at
//            startup in both (screen-state.ts paletteShown: true), IC-61 maps to
//            { kind: 'dependency' } in both translators (5c1b915 :815, tip :845),
//            and the entry carries data-armed in both (dom-screen-surface.ts
//            5c1b915 :699, tip :748) -- the arming is READ, since pressing IC-61
//            again disarms (translator isSameArm).
//   press    on the Task's finish end: pressRowOf gives PTD-3 for any hit in both
//            (5c1b915 :626, tip :654).
//   hold     moves with the button held, over empty ground, over the partner, and
//            between the two.
//   release  over EMPTY GROUND: commandFromDependencyDrag answers CONSUMED_ELSEWHERE
//            when nothing is under the release in both builds (5c1b915 :2496,
//            tip :2546), so the document is not written. Esc is not used: the escape
//            level of a held press differs (5c1b915 frame-loop :2370), and an Esc
//            that only disarmed would turn the release into a resize.
//   Stage 0 has no tentative line, but at 5c1b915 isPreviewedPress is true for a
//   press on an end grab (frame-loop :271-290, :337-344), so over a Task it previews
//   the whole document with the new dependency on every frame.
//
// The drag is confirmed before measuring: over the partner the count of drawn
// dependency arrows must rise (stage 0: the previewed line; tip: the tentative line).
//
// NOT COPIED: the frame instrument is FRAME_PROBE, read at run time from the tree's
// own tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts, as lm-19 does.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const CANVAS = '[data-role="Schedule Canvas"]'
const DRAWN_SVG = `${CANVAS} svg`
const ARROWS = `${CANVAS} svg polyline[marker-end]`
const AGENT_API_ENTRANCE = 'IC-20'
const DEPENDENCY_ENTRANCE = 'IC-61'
const TEMPLATE = path.join('src', 'framework', 'single-html-shell', 'startup-template.json')
const PER_BURST = 24 // as lm-19
const TARGET_X = 1000 // where the origin's finish is put; right of the Command Palette
const PALETTE_RIGHT = 620 // nothing to the left of this is pressed or used as a partner
const MIN_TASK_DAYS = 5
const DAY_MS = 86400000

// ------------------------------------------------------------------ arguments

const DEFAULTS = {
  tree: '', // the built tree to measure (holds dist/index.html, tests/, node_modules)
  tasks: 1000, // MC-7 and TP-6
  samples: 240, // frame intervals per stretch
  minHoldMs: 5000, // each stretch keeps moving at least this long, and until it has `samples` intervals
  attempts: 8, // origin Tasks tried, and drag starts tried, before giving up
  width: 1920, // MC-6
  height: 1080,
  channel: 'msedge', // MC-5
  stretchTimeoutMs: 120000,
}

function fail(code, reason, extra = {}) {
  process.stdout.write(JSON.stringify({ ok: false, reason, ...extra }, null, 2) + '\n')
  process.exit(code)
}

function parseArgs(argv) {
  const out = { ...DEFAULTS }
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '')
    if (!(key in DEFAULTS)) fail(2, `unknown argument ${argv[i]}`)
    const raw = argv[i + 1]
    if (raw === undefined) fail(2, `argument ${argv[i]} needs a value`)
    if (typeof DEFAULTS[key] === 'number') {
      out[key] = Number(raw)
      if (!(Number.isInteger(out[key]) && out[key] >= 0)) {
        fail(2, `argument ${argv[i]} must be a non-negative integer, got ${raw}`)
      }
    } else {
      out[key] = raw
    }
    i += 1
  }
  if (out.tree === '') fail(2, '--tree <path of a built tree> is required')
  if (out.samples < 2) fail(2, '--samples must be at least 2')
  if (out.attempts < 1) fail(2, '--attempts must be at least 1')
  return out
}

const args = parseArgs(process.argv.slice(2))
const TREE = path.resolve(args.tree)
const BUILD = path.join(TREE, 'dist', 'index.html')
const NFR_TEST = path.join(TREE, 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')

// ------------------------------------------------------------------ arithmetic

function percentile(values, fraction) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(1, Math.ceil(fraction * sorted.length)) - 1]
}

function median(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const round2 = (v) => (v === null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100)

function stats(values) {
  return { samples: values.length, medianMs: round2(median(values)), p95Ms: round2(percentile(values, 0.95)) }
}

function framesOf(samples) {
  const byStamp = new Map()
  for (const [stamp, enter, leave] of samples) {
    const held = byStamp.get(stamp)
    if (held === undefined) byStamp.set(stamp, { stamp, enter, leave, inside: leave - enter })
    else {
      held.inside += leave - enter
      held.leave = Math.max(held.leave, leave)
    }
  }
  return [...byStamp.values()].sort((a, b) => a.enter - b.enter)
}

function dispatchTimes(capture, bubble) {
  const out = []
  const later = [...bubble].sort((a, b) => a - b)
  let j = 0
  for (const c of [...capture].sort((a, b) => a - b)) {
    while (j < later.length && later[j] < c) j += 1
    if (j >= later.length) break
    out.push(later[j] - c)
    j += 1
  }
  return out
}

/** How many dependency links a document holds: every object carrying predecessorUid under schedule.tasks. */
function linksIn(tasks) {
  let n = 0
  const walk = (v) => {
    if (Array.isArray(v)) { for (const x of v) walk(x); return }
    if (v === null || typeof v !== 'object') return
    if (Object.prototype.hasOwnProperty.call(v, 'predecessorUid')) n += 1
    for (const x of Object.values(v)) walk(x)
  }
  walk(tasks)
  return n
}

const textOfDay = (day) => `${new Date(day * DAY_MS).toISOString().slice(0, 10)}T00:00:00`

// ------------------------------------------------------------------ conditions

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function readSharedProbe() {
  if (!existsSync(NFR_TEST)) fail(2, 'the nfr test that holds FRAME_PROBE is not in the tree')
  const found = /const FRAME_PROBE = `([\s\S]*?)`\r?\n/.exec(readFileSync(NFR_TEST, 'utf8'))
  if (found === null) fail(2, 'FRAME_PROBE was not found in the nfr test; refusing to use a private copy')
  return found[1]
}

const DISPATCH_PROBE = `(() => {
  const s = { armed: false, capture: [], bubble: [] };
  window.addEventListener('pointermove', () => { if (s.armed) s.capture.push(performance.now()); }, { capture: true, passive: true });
  s.arm = () => {
    if (s.armed) return;
    window.addEventListener('pointermove', () => { s.bubble.push(performance.now()); }, { passive: true });
    s.armed = true;
  };
  Object.defineProperty(window, '__depDragProbe', { value: s });
})();`

// ------------------------------------------------------------------ driving

async function settle(page) {
  await page.waitForSelector(DRAWN_SVG, { state: 'attached', timeout: 60000 })
  const read = () => page.evaluate((s) => document.querySelector(s)?.outerHTML ?? null, DRAWN_SVG)
  let previous = await read()
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    await page.waitForTimeout(250)
    const now = await read()
    if (now !== null && now === previous) return
    previous = now
  }
  throw new Error('the drawing was still changing after 30s')
}

async function pressEntrance(page, icon) {
  const at = await page.evaluate((wanted) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return box.width === 0 ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(800)
  return true
}

const isAgentApiOpen = (page) => page.evaluate(() => typeof window.grSchedulerAgentApi === 'object')

async function openAgentApi(page) {
  if (await isAgentApiOpen(page)) return true
  if (!(await pressEntrance(page, AGENT_API_ENTRANCE))) return false
  return isAgentApiOpen(page)
}

async function trimTo(page, target) {
  return page.evaluate((want) => {
    const api = window.grSchedulerAgentApi
    for (let pass = 0; pass < 64; pass += 1) {
      const tasks = api.readDocument().schedule.tasks
      if (tasks.length <= want) return { tasks: tasks.length, note: '' }
      const parents = new Set(tasks.map((t) => t.wbsParentUid).filter((u) => u !== null))
      const victims = tasks.filter((t) => !parents.has(t.uid)).map((t) => t.uid)
        .slice(0, tasks.length - want)
      const answer = api.applyCommands({
        readStamp: api.readStamp(),
        commands: victims.map((uid) => ({ kind: 'deleteTask', uid })),
      })
      if (!answer.accepted) {
        return { tasks: tasks.length, note: JSON.stringify(answer.refusal).slice(0, 200) }
      }
    }
    return { tasks: api.readDocument().schedule.tasks.length, note: 'did not converge' }
  }, target)
}

const burst = (cdp, events) =>
  Promise.all(events.map((one) => cdp.send('Input.dispatchMouseEvent', { ...one })))

const mark = (page, name, edge) =>
  page.evaluate(([n, e]) => window.__grsFrameProbe.mark(n, e), [name, edge])

const framesSince = (page, from) =>
  page.evaluate((t) => {
    const seen = new Set()
    for (const [stamp, enter] of window.__grsFrameProbe.samples) if (enter >= t) seen.add(stamp)
    return seen.size
  }, from)

/** Keep moving until the stretch holds `want` intervals AND has lasted `--minHoldMs`, or give up. */
async function driveStretch(page, name, step, want) {
  await mark(page, name, 'start')
  const start = await page.evaluate(() => window.__grsFrameProbe.marks.at(-1)[2])
  const began = Date.now()
  const deadline = began + args.stretchTimeoutMs
  let rounds = 0
  for (;;) {
    await step(rounds)
    rounds += 1
    const enough = (await framesSince(page, start)) >= want + 1 && Date.now() - began >= args.minHoldMs
    if (enough || Date.now() > deadline) break
  }
  await mark(page, name, 'end')
  await page.waitForTimeout(500)
  return rounds
}

/** The pointer shape the app shows at a point (IN-2): the canvas's own style.cursor. */
async function cursorAt(page, x, y) {
  await page.mouse.move(x, y)
  await page.waitForTimeout(30)
  return page.evaluate((sel) => document.querySelector(sel)?.style.cursor ?? '', CANVAS)
}

const inCanvas = (page, p) =>
  page.evaluate(([x, y]) => {
    const under = document.elementFromPoint(x, y)
    return under !== null && under.closest('[data-role]')?.getAttribute('data-role') === 'Schedule Canvas'
  }, [p.x, p.y])

const isArmed = (page) =>
  page.evaluate((icon) => document.querySelector(`[data-icon="${icon}"]`)?.getAttribute('data-armed') ?? null,
    DEPENDENCY_ENTRANCE)

async function armDependency(page) {
  if ((await isArmed(page)) === 'true') return true
  if (!(await pressEntrance(page, DEPENDENCY_ENTRANCE))) return false
  return (await isArmed(page)) === 'true'
}

async function disarmDependency(page) {
  if ((await isArmed(page)) === 'true') await pressEntrance(page, DEPENDENCY_ENTRANCE)
  return (await isArmed(page)) !== 'true'
}

const arrows = (page) => page.evaluate((sel) => document.querySelectorAll(sel).length, ARROWS)

/** The visible row bands, keyed by group id. */
const visibleRows = (page, height) =>
  page.evaluate((h) => [...document.querySelectorAll('[data-depth][data-group-id]')]
    .map((r) => {
      const b = r.getBoundingClientRect()
      return { group: r.getAttribute('data-group-id'), top: b.y, bottom: b.y + b.height }
    })
    .filter((r) => r.bottom > r.top && r.top >= 0 && r.bottom <= h - 20), height)

/** Drawn shapes lying inside a row band and overlapping [lo, hi] horizontally. */
const shapesInBand = (page, band, lo, hi) =>
  page.evaluate(([top, bottom, x0, x1]) => {
    const host = document.querySelector('[data-role="Schedule Canvas"]')
    if (host === null) return []
    return [...host.querySelectorAll('svg rect, svg polygon, svg path')]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => b.width >= 6 && b.height >= 6 && b.height <= 80 &&
        b.y >= top - 1 && b.y + b.height <= bottom + 1 && b.x + b.width >= x0 && b.x <= x1)
      .map((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height }))
  }, [band.top, band.bottom, lo, hi])

const point = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) })

// ------------------------------------------------------------------ main

if (!existsSync(BUILD)) fail(2, 'dist/index.html is not in the tree; build it first')
const probeSource = readSharedProbe()

let chromium
try {
  ;({ chromium } = createRequire(path.join(TREE, 'package.json'))('playwright'))
} catch (cause) {
  fail(2, 'playwright could not be resolved from the tree (is node_modules linked?)', {
    detail: String(cause).slice(0, 300),
  })
}

const conditions = {
  probe: 'dependency-drag',
  measuredAt: new Date().toISOString(),
  tree: path.basename(TREE),
  buildSha256: sha256(BUILD),
  screen: { width: args.width, height: args.height },
  tasksRequested: args.tasks,
  samplesPerStretch: args.samples,
  minHoldMsPerStretch: args.minHoldMs,
  agentApiOpenedBeforeMeasuring: true,
  channel: args.channel,
  cpu: os.cpus()[0]?.model?.trim() ?? null,
  logicalCpus: os.cpus().length,
  os: `${os.type()} ${os.release()}`,
  node: process.version,
  definition:
    'frame time = interval between delivered rAF stamps (T-043 preamble); ' +
    'instrument = FRAME_PROBE of the tree\'s tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts',
}

let browser
try {
  browser = await chromium.launch({ channel: args.channel === 'chromium' ? undefined : args.channel })
} catch (cause) {
  fail(2, `browser channel ${args.channel} could not be started`, { detail: String(cause).slice(0, 300) })
}

const setup = { origins: [], attempts: [] }
let result
try {
  const context = await browser.newContext({ viewport: { width: args.width, height: args.height } })
  const page = await context.newPage()
  await page.addInitScript(probeSource)
  await page.addInitScript(DISPATCH_PROBE)
  await page.goto(pathToFileURL(BUILD).href)
  await settle(page)

  if (!(await openAgentApi(page))) throw new Error('the Agent API could not be opened to place the drag')
  if (args.tasks !== DEFAULTS.tasks) {
    const trimmed = await trimTo(page, args.tasks)
    if (trimmed.tasks !== args.tasks) {
      throw new Error(`could not bring the document to ${args.tasks} Task (holds ${trimmed.tasks}) ${trimmed.note}`)
    }
    await page.waitForTimeout(900)
    await settle(page)
  }

  const box = await page.evaluate((s) => {
    const r = (document.querySelector(s) ?? document.body).getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
  }, DRAWN_SVG)
  const cdp = await context.newCDPSession(page)
  const doubts = []

  // Warm-up, thrown away, exactly as lm-19.
  await mark(page, 'warm-up', 'start')
  for (let i = 0; i < 8; i += 1) {
    await burst(cdp, [
      { type: 'mouseMoved', x: box.x, y: box.y },
      { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 60 },
    ])
  }
  await mark(page, 'warm-up', 'end')
  await page.waitForTimeout(500)

  // ---- what the document offers
  const plan = await page.evaluate(([minDays, dayMs]) => {
    const doc = window.grSchedulerAgentApi.readDocument()
    const schedule = doc.schedule
    const groupOf = new Map((schedule.taskGroupMembers ?? []).map((m) => [m.taskUid, m.groupId]))
    const parents = new Set(schedule.tasks.map((t) => t.wbsParentUid).filter((u) => u !== null && u !== undefined))
    const dayOf = (s) => Math.round(Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`) / dayMs)
    const plain = schedule.tasks
      .filter((t) => !parents.has(t.uid) && t.milestone !== true && t.start && t.finish &&
        !t.actualStart && !t.fadeInDays && !t.fadeOutDays && groupOf.has(t.uid))
      .map((t) => ({
        uid: t.uid, start: dayOf(t.start), finish: dayOf(t.finish), group: groupOf.get(t.uid),
        linked: (t.dependencies ?? []).map((d) => d.predecessorUid),
      }))
      .filter((t) => t.finish - t.start >= minDays)
    const s = doc.documentSettings
    return { pxPerDay: (s.pxPerDayAt1x ?? 0) * (s.zoomX ?? 1), plain }
  }, [MIN_TASK_DAYS, DAY_MS])
  if (!(plan.pxPerDay > 0)) throw new Error('documentSettings.pxPerDayAt1x * zoomX was not a positive number')
  if (plan.plain.length === 0) throw new Error('no plain dated leaf Task in the document')
  const rowAreaX = await page.evaluate(() =>
    document.querySelector('[data-role="Row Title Panel"]')?.getBoundingClientRect().right ?? null)
  if (rowAreaX === null) throw new Error('no Row Title Panel to measure the Row Area left edge from')
  setup.pxPerDay = plan.pxPerDay
  setup.rowAreaX = Math.round(rowAreaX)
  const linkedPair = (a, b) => a.linked.includes(b.uid) || b.linked.includes(a.uid)
  const byGroup = new Map()
  for (const t of plan.plain) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, [])
    byGroup.get(t.group).push(t)
  }

  // ---- place one origin and look around it, with nothing armed
  async function scout(origin) {
    const note = { uid: origin.uid }
    setup.origins.push(note)
    const scrollDay = origin.finish - Math.round((TARGET_X - rowAreaX) / plan.pxPerDay)
    const answer = await page.evaluate(([date, group]) => {
      const api = window.grSchedulerAgentApi
      return api.applyCommands({
        readStamp: api.readStamp(),
        commands: [{ kind: 'setScrollPosition', scrollDate: date, scrollDayOffset: 0, scrollGroupId: group, scrollGroupOffset: 0 }],
      })
    }, [textOfDay(scrollDay), origin.group])
    if (!answer?.accepted) { note.why = `setScrollPosition refused: ${JSON.stringify(answer?.refusal ?? null).slice(0, 160)}`; return null }
    // The rAF trap: nudge the pointer so the written view is drawn.
    await page.mouse.move(TARGET_X, args.height - 30)
    await page.mouse.move(TARGET_X + 1, args.height - 30)
    await page.waitForTimeout(600)
    await settle(page)
    const held = await page.evaluate(() => {
      const s = window.grSchedulerAgentApi.readDocument().documentSettings
      return { scrollDate: s.scrollDate, scrollGroupId: s.scrollGroupId }
    })
    if (held.scrollGroupId !== origin.group) { note.why = `the view did not take the row (${held.scrollGroupId})`; return null }
    const xOfDay = (day) => rowAreaX + (day - scrollDay) * plan.pxPerDay
    const rows = await visibleRows(page, args.height)
    const band = rows.find((r) => r.group === origin.group)
    if (band === undefined) { note.why = 'the origin row is not drawn'; return null }

    // the finish end: a shape in the band whose right edge sits at the finish day (or the day after)
    const lo = xOfDay(origin.finish) - 12
    const hi = xOfDay(origin.finish + 1) + 12
    const candidates = (await shapesInBand(page, band, lo, hi))
      .filter((s) => s.x + s.w >= lo && s.x + s.w <= hi && s.x + s.w >= PALETTE_RIGHT && s.x + s.w <= args.width - 40)
    let end = null
    for (const s of candidates.slice(0, 4)) {
      const y = s.y + s.h / 2
      for (const dx of [-2, -1, -3, 0, -4, 1, -5, 2, -6, 3, -8, 5]) {
        const p = { x: Math.round(s.x + s.w + dx), y: Math.round(y) }
        if (!(await inCanvas(page, p))) continue
        if ((await cursorAt(page, p.x, p.y)) === 'ew-resize') { end = p; break }
      }
      if (end !== null) break
    }
    note.finishX = Math.round(xOfDay(origin.finish))
    note.shapesAtFinish = candidates.length
    if (end === null) { note.why = 'no ew-resize beside the finish edge'; return null }

    // partners: drawn shapes of the other visible rows (nearest first), then of this row right of the
    // end, each confirmed as a hit by the pointer shape. Whether it can be joined is settled by the
    // arrow count when the drag starts; a pair that cannot is simply the next attempt.
    const partners = []
    const others = rows.filter((r) => r.group !== origin.group)
      .sort((a, b) => Math.abs(a.top - band.top) - Math.abs(b.top - band.top))
    for (const row of [...others, band]) {
      if (partners.length >= 3) break
      const shapes = (await shapesInBand(page, row, PALETTE_RIGHT + 20, args.width - 60))
        .filter((s) => s.h >= 8 && s.w >= 24)
        .filter((s) => row !== band || s.x > end.x + 20)
      for (const s of shapes.slice(0, 6)) {
        const left = Math.max(s.x, PALETTE_RIGHT + 20)
        const right = Math.min(s.x + s.w, args.width - 60)
        if (right - left < 24) continue
        const p = { x: Math.round((left + right) / 2), y: Math.round(s.y + s.h / 2), halfWidth: (right - left) / 2, h: s.h }
        if (!(await inCanvas(page, p))) continue
        const shown = await cursorAt(page, p.x, p.y)
        if (shown === '' || shown === 'default') continue
        partners.push(p)
        break
      }
    }
    note.partners = partners.length
    if (partners.length === 0) { note.why = 'no partner Task confirmed as a hit in another visible row'; return null }

    // empty ground near the end, clear of the palette
    let empty = null
    const grid = []
    for (let dy = -200; dy <= 200; dy += 20) {
      for (let dx = -300; dx <= 300; dx += 30) {
        const p = { x: Math.round(end.x + dx), y: Math.round(end.y + dy) }
        if (p.x >= PALETTE_RIGHT + 20 && p.x <= args.width - 40 && p.y >= 60 && p.y <= args.height - 40) grid.push(p)
      }
    }
    grid.sort((a, b) => Math.hypot(a.x - end.x, a.y - end.y) - Math.hypot(b.x - end.x, b.y - end.y))
    for (const p of grid) {
      if (!(await inCanvas(page, p)) || (await cursorAt(page, p.x, p.y)) !== 'default') continue
      let clear = true
      for (const [ox, oy] of [[-10, 0], [10, 0], [0, -5], [0, 5]]) {
        const q = { x: p.x + ox, y: p.y + oy }
        if (!(await inCanvas(page, q)) || (await cursorAt(page, q.x, q.y)) !== 'default') { clear = false; break }
      }
      if (clear) { empty = p; break }
    }
    if (empty === null) { note.why = 'no empty ground near the end'; return null }
    return { end, partners, empty }
  }

  // ---- start the drag, confirming it is a dependency drag
  const move = (p, held) =>
    cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: p.x, y: p.y, ...(held ? { button: 'left', buttons: 1 } : {}),
    })
  const glide = async (a, b, steps, held) => {
    for (let i = 1; i <= steps; i += 1) {
      await move({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }, held)
    }
  }
  const pressAt = (p) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 })
  const releaseAt = (p) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 })

  const step = Math.max(1, Math.floor(plan.plain.length / (args.attempts * 2)))
  const origins = plan.plain.filter((_t, i) => i % step === 0)
  let started = null
  let arrowsBeforeDrag = null
  for (const origin of origins) {
    if (setup.origins.length >= args.attempts * 2 || setup.attempts.length >= args.attempts) break
    if (!(await disarmDependency(page))) throw new Error('IC-61 could not be disarmed to look around')
    const found = await scout(origin)
    if (found === null) continue
    for (const partner of found.partners) {
      if (setup.attempts.length >= args.attempts) break
      if (!(await armDependency(page))) throw new Error('IC-61 could not be armed (data-armed stayed false)')
      await move(found.empty, false)
      await page.waitForTimeout(300)
      const before = await arrows(page)
      await move(found.end, false)
      await page.waitForTimeout(150)
      await pressAt(found.end)
      await page.waitForTimeout(150)
      await glide(found.end, partner, 12, true)
      await page.waitForTimeout(300)
      const overPartner = await arrows(page)
      await glide(partner, found.empty, 12, true)
      await page.waitForTimeout(300)
      const overEmpty = await arrows(page)
      setup.attempts.push({
        originUid: origin.uid, partnerUid: partner.uid, origin: point(found.end), partner: point(partner),
        empty: found.empty, arrowsBefore: before, arrowsOverPartner: overPartner, arrowsOverEmpty: overEmpty,
      })
      if (overPartner > before) {
        started = { ...found, partner }
        arrowsBeforeDrag = before
        break
      }
      await releaseAt(found.empty) // over empty ground: into === null, nothing is written
      await page.waitForTimeout(500)
    }
    if (started !== null) break
  }
  if (started === null) {
    throw new Error(`no drag start drew an extra arrow over a partner (${setup.origins.length} origins, ` +
      `${setup.attempts.length} starts); see setup`)
  }
  const empty = started.empty
  const target = started.partner

  // ---- measured stretches, the button held all the while (pointer is over empty ground here)
  await page.evaluate(() => window.__depDragProbe.arm())
  const circle = (roundNo, c, rx, ry) =>
    Array.from({ length: PER_BURST }, (_u, s) => {
      const phase = (roundNo * PER_BURST + s) / 7
      return { type: 'mouseMoved', x: c.x + Math.sin(phase) * rx, y: c.y + Math.cos(phase / 2) * ry,
        button: 'left', buttons: 1 }
    })
  const shuttle = (roundNo, a, b) =>
    Array.from({ length: PER_BURST }, (_u, s) => {
      const t = (1 - Math.cos((roundNo * PER_BURST + s) / 7)) / 2
      return { type: 'mouseMoved', x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        button: 'left', buttons: 1 }
    })
  const rx = Math.max(2, Math.min(target.halfWidth * 0.7, 40))
  const ry = Math.max(1, Math.min(target.h * 0.2, 3))

  const rounds = {}
  const EMPTY = 'held over empty ground'
  rounds[EMPTY] = await driveStretch(page, EMPTY, (r) => burst(cdp, circle(r, empty, 10, 5)), args.samples)
  await glide(empty, target, 12, true)
  const TASK = 'held over another Task'
  rounds[TASK] = await driveStretch(page, TASK, (r) => burst(cdp, circle(r, target, rx, ry)), args.samples)
  const BETWEEN = 'held between that Task and empty ground'
  rounds[BETWEEN] = await driveStretch(page, BETWEEN, (r) => burst(cdp, shuttle(r, target, empty)), args.samples)

  // ---- let go over empty ground, so nothing is written
  await move(empty, true)
  await page.waitForTimeout(100)
  await move({ x: empty.x + 1, y: empty.y }, true)
  await page.waitForTimeout(300)
  await releaseAt({ x: empty.x + 1, y: empty.y })
  await page.waitForTimeout(800)
  const arrowsAfterRelease = await arrows(page)
  await disarmDependency(page)

  // ---- collect
  const raw = await page.evaluate(() => {
    const p = window.__grsFrameProbe
    const d = window.__depDragProbe
    return { samples: p.samples, marks: p.marks, inputs: p.inputs, capture: d.capture, bubble: d.bubble }
  })
  const frames = framesOf(raw.samples)
  const stretches = []
  const pooledIntervals = []
  const pooledInside = []
  const short = []
  for (const name of Object.keys(rounds)) {
    const start = raw.marks.find(([n, e]) => n === name && e === 'start')?.[2]
    const end = raw.marks.find(([n, e]) => n === name && e === 'end')?.[2]
    const mine = frames.filter((f) => f.enter >= start && f.enter <= end)
    const intervals = []
    for (let i = 1; i < mine.length; i += 1) intervals.push(mine[i].stamp - mine[i - 1].stamp)
    const used = intervals.slice(0, args.samples)
    const inside = mine.slice(1, used.length + 1).map((f) => f.inside)
    const inRange = (t) => t >= start && t <= end
    const span = mine.length > 1 ? mine.at(-1).stamp - mine[0].stamp : 0
    if (used.length < args.samples) short.push(`${name}: ${used.length} of ${args.samples} intervals`)
    pooledIntervals.push(...used)
    pooledInside.push(...inside)
    stretches.push({
      name,
      rounds: rounds[name],
      frameTime: stats(used),
      frameTimeWholeHold: stats(intervals),
      meanFrameRate: span > 0 ? round2(((mine.length - 1) * 1000) / span) : null,
      insideRedrawCallback: stats(inside),
      insideRedrawCallbackWholeHold: stats(mine.slice(1).map((f) => f.inside)),
      synchronousDispatch: stats(dispatchTimes(raw.capture.filter(inRange), raw.bubble.filter((t) => t >= start))),
      heldMs: round2(end - start),
      inputsReceived: raw.inputs.filter(inRange).length,
    })
  }

  const atEnd = await page.evaluate(() => {
    const doc = window.grSchedulerAgentApi?.readDocument?.()
    return Array.isArray(doc?.schedule?.tasks) ? doc.schedule.tasks : null
  })
  const tasksMeasured = atEnd === null ? -1 : atEnd.length
  let linksInTemplate = null
  try {
    linksInTemplate = linksIn(JSON.parse(readFileSync(path.join(TREE, TEMPLATE), 'utf8')).schedule.tasks)
  } catch {
    doubts.push('the startup template could not be read to count its dependency links')
  }
  const documentCheck = {
    arrowsBeforeDrag,
    arrowsAfterRelease,
    linksInTemplate,
    linksAtEnd: atEnd === null ? null : linksIn(atEnd),
    note: 'links are compared only when --tasks is the default',
  }
  const renderer = await page.evaluate(() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    } catch { return '' }
  })

  result = {
    conditions: {
      ...conditions,
      tasksMeasured,
      browserVersion: browser.version(),
      renderer,
      userAgent: await page.evaluate(() => navigator.userAgent),
    },
    gesture:
      'arm IC-61 (AR-4), press a Task finish end (PTD-3), hold and move (FR-009), release over empty ground (no write)',
    setup,
    frameTime: stats(pooledIntervals),
    insideRedrawCallbackNotFrameTime: stats(pooledInside),
    stretches,
    documentCheck,
    doubts,
    notMeasured: [],
  }

  if (tasksMeasured <= 0) result.notMeasured.push(`the document held ${tasksMeasured} Task; nothing of MC-7 was loaded`)
  if (tasksMeasured !== args.tasks) result.notMeasured.push(`asked for ${args.tasks} Task, measured ${tasksMeasured}`)
  for (const s of short) result.notMeasured.push(`stretch too short -- ${s}`)
  if (arrowsAfterRelease > arrowsBeforeDrag) {
    result.notMeasured.push(`more arrows after the release (${arrowsAfterRelease}) than before the drag (${arrowsBeforeDrag}): the release may have written a dependency`)
  }
  if (args.tasks === DEFAULTS.tasks && linksInTemplate !== null && documentCheck.linksAtEnd !== null &&
      documentCheck.linksAtEnd !== linksInTemplate) {
    doubts.push(`the document holds ${documentCheck.linksAtEnd} dependency links, the startup template ${linksInTemplate}`)
  }
  await context.close()
} catch (thrown) {
  result = { conditions, setup, notMeasured: [`the run broke: ${String(thrown?.message ?? thrown).slice(0, 400)}`] }
}

const ok = result.notMeasured.length === 0
process.stdout.write(JSON.stringify({ ok, ...result }, null, 2) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(ok ? 0 : 1)

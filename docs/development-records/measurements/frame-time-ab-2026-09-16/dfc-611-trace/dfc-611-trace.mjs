// DFC-611: split the frame time of a held dependency drag into script / style / layout /
// paint / composite with a Chrome trace, over empty ground AND over another Task (control).
//
//   node dfc-611-trace.mjs --tree <built tree> --out <dir> --label <name>                 (5 s per stretch)
//   node dfc-611-trace.mjs --tree <built tree> --out <dir> --label <name> --holdMs 2000   (smoke)
// Prints one JSON object on stdout. Exit 0 = measured, 1 = could not be measured, 2 = bad arguments or environment.
// Writes <out>/<label>-<stretch>.trace.json (loadable in the DevTools Performance panel) unless --keepTraces 0.
//
// The gesture, the placement and the conditions are those of
// ../extra-zoom-row-axis-and-dependency-drag/dependency-drag.mjs (record 17 appendix of
// 2026-09-16): msedge headless, 1920x1080, the 1000-Task startup template, FRAME_PROBE and the
// dispatch probe installed, Agent API opened before measuring, IC-61 armed, press a Task's
// finish end, hold, move in small circles over empty ground and then over another Task, release
// over empty ground (no write). That file is NOT imported (it runs on load) and NOT changed;
// the placement below follows it step for step.
//
// What is added: per stretch, CDP Tracing is started after the pointer is in place and before
// the stretch's motion, the stretch is bracketed with console.timeStamp('dfc611:<stretch>:start'
// / ':end') so the summariser keeps only the frames inside it, and the trace is summarised by
// ./summarise-trace.mjs. The in-page FRAME_PROBE numbers of the same stretch are reported beside
// the trace, so a reader can see whether tracing moved the frame time itself.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { summarise } from './summarise-trace.mjs'

const CANVAS = '[data-role="Schedule Canvas"]'
const DRAWN_SVG = `${CANVAS} svg`
const ARROWS = `${CANVAS} svg polyline[marker-end]`
const AGENT_API_ENTRANCE = 'IC-20'
const DEPENDENCY_ENTRANCE = 'IC-61'
const PER_BURST = 24
const TARGET_X = 1000
const PALETTE_RIGHT = 620
const MIN_TASK_DAYS = 5
const DAY_MS = 86400000
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
]
const EMPTY = 'empty'
const TASK = 'task'

const DEFAULTS = {
  tree: '',
  out: '',
  label: '',
  holdMs: 5000, // each traced stretch keeps moving this long
  stretches: 'empty,task',
  keepTraces: 1,
  attempts: 8,
  width: 1920,
  height: 1080,
  channel: 'msedge',
}

function fail(code, reason, extra = {}) {
  process.stdout.write(JSON.stringify({ ok: false, reason, ...extra }, null, 2) + '\n')
  process.exit(code)
}

function parseArgs(argv) {
  const out = { ...DEFAULTS }
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, '')
    if (!(key in DEFAULTS)) fail(2, `unknown argument ${argv[i]}`)
    const raw = argv[i + 1]
    if (raw === undefined) fail(2, `argument ${argv[i]} needs a value`)
    if (typeof DEFAULTS[key] === 'number') {
      out[key] = Number(raw)
      if (!(Number.isInteger(out[key]) && out[key] >= 0)) fail(2, `argument ${argv[i]} must be a non-negative integer`)
    } else out[key] = raw
  }
  if (out.tree === '' || out.out === '' || out.label === '') fail(2, '--tree, --out and --label are required')
  if (!/^[A-Za-z0-9._-]+$/.test(out.label)) fail(2, '--label must be [A-Za-z0-9._-]+')
  out.stretchList = out.stretches.split(',').map((s) => s.trim()).filter((s) => s !== '')
  for (const s of out.stretchList) if (s !== EMPTY && s !== TASK) fail(2, `unknown stretch ${s} (empty, task)`)
  if (out.stretchList.length === 0) fail(2, '--stretches is empty')
  return out
}

const args = parseArgs(process.argv.slice(2))
const TREE = path.resolve(args.tree)
const OUT = path.resolve(args.out)
const BUILD = path.join(TREE, 'dist', 'index.html')
const NFR_TEST = path.join(TREE, 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')

// ------------------------------------------------------------------ arithmetic (as dependency-drag.mjs)

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
const stats = (values) => ({ samples: values.length, medianMs: round2(median(values)), p95Ms: round2(percentile(values, 0.95)) })

function framesOf(samples) {
  const byStamp = new Map()
  for (const [stamp, enter, leave] of samples) {
    const held = byStamp.get(stamp)
    if (held === undefined) byStamp.set(stamp, { stamp, enter, leave, inside: leave - enter })
    else { held.inside += leave - enter; held.leave = Math.max(held.leave, leave) }
  }
  return [...byStamp.values()].sort((a, b) => a.enter - b.enter)
}

const textOfDay = (day) => `${new Date(day * DAY_MS).toISOString().slice(0, 10)}T00:00:00`
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

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

// ------------------------------------------------------------------ driving (as dependency-drag.mjs)

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

const burst = (cdp, events) => Promise.all(events.map((one) => cdp.send('Input.dispatchMouseEvent', { ...one })))
const mark = (page, name, edge) =>
  page.evaluate(([n, e]) => { window.__grsFrameProbe.mark(n, e); console.timeStamp(`dfc611:${n}:${e}`) }, [name, edge])

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
  page.evaluate((icon) => document.querySelector(`[data-icon="${icon}"]`)?.getAttribute('data-armed') ?? null, DEPENDENCY_ENTRANCE)
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
const visibleRows = (page, height) =>
  page.evaluate((h) => [...document.querySelectorAll('[data-depth][data-group-id]')]
    .map((r) => { const b = r.getBoundingClientRect(); return { group: r.getAttribute('data-group-id'), top: b.y, bottom: b.y + b.height } })
    .filter((r) => r.bottom > r.top && r.top >= 0 && r.bottom <= h - 20), height)
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

// ------------------------------------------------------------------ tracing

async function traced(cdp, body) {
  const events = []
  const onData = (payload) => { for (const one of payload.value) events.push(one) }
  cdp.on('Tracing.dataCollected', onData)
  const done = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve))
  await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: TRACE_CATEGORIES } })
  let value
  try {
    value = await body()
  } finally {
    await cdp.send('Tracing.end')
    await done
    cdp.off('Tracing.dataCollected', onData)
  }
  return { events, value }
}

// ------------------------------------------------------------------ main

if (!existsSync(BUILD)) fail(2, 'dist/index.html is not in the tree; build it first')
const probeSource = readSharedProbe()
mkdirSync(OUT, { recursive: true })

let chromium
try {
  ;({ chromium } = createRequire(path.join(TREE, 'package.json'))('playwright'))
} catch (cause) {
  fail(2, 'playwright could not be resolved from the tree (is node_modules linked?)', { detail: String(cause).slice(0, 300) })
}

const conditions = {
  probe: 'dfc-611-trace',
  measuredAt: new Date().toISOString(),
  label: args.label,
  tree: path.basename(TREE),
  buildSha256: sha256(BUILD),
  screen: { width: args.width, height: args.height },
  holdMsPerStretch: args.holdMs,
  traceCategories: TRACE_CATEGORIES,
  channel: args.channel,
  headless: true,
  cpu: os.cpus()[0]?.model?.trim() ?? null,
  logicalCpus: os.cpus().length,
  os: `${os.type()} ${os.release()}`,
  node: process.version,
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

  const box = await page.evaluate((s) => {
    const r = (document.querySelector(s) ?? document.body).getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, DRAWN_SVG)
  const cdp = await context.newCDPSession(page)

  // warm-up, thrown away, as dependency-drag.mjs
  for (let i = 0; i < 8; i += 1) {
    await burst(cdp, [
      { type: 'mouseMoved', x: box.x, y: box.y },
      { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 60 },
    ])
  }
  await page.waitForTimeout(500)

  const plan = await page.evaluate(([minDays, dayMs]) => {
    const doc = window.grSchedulerAgentApi.readDocument()
    const schedule = doc.schedule
    const groupOf = new Map((schedule.taskGroupMembers ?? []).map((m) => [m.taskUid, m.groupId]))
    const parents = new Set(schedule.tasks.map((t) => t.wbsParentUid).filter((u) => u !== null && u !== undefined))
    const dayOf = (s) => Math.round(Date.parse(`${String(s).slice(0, 10)}T00:00:00Z`) / dayMs)
    const plain = schedule.tasks
      .filter((t) => !parents.has(t.uid) && t.milestone !== true && t.start && t.finish &&
        !t.actualStart && !t.fadeInDays && !t.fadeOutDays && groupOf.has(t.uid))
      .map((t) => ({ uid: t.uid, start: dayOf(t.start), finish: dayOf(t.finish), group: groupOf.get(t.uid) }))
      .filter((t) => t.finish - t.start >= minDays)
    const s = doc.documentSettings
    return { pxPerDay: (s.pxPerDayAt1x ?? 0) * (s.zoomX ?? 1), plain, tasks: schedule.tasks.length }
  }, [MIN_TASK_DAYS, DAY_MS])
  if (!(plan.pxPerDay > 0)) throw new Error('documentSettings.pxPerDayAt1x * zoomX was not a positive number')
  if (plan.plain.length === 0) throw new Error('no plain dated leaf Task in the document')
  const rowAreaX = await page.evaluate(() => document.querySelector('[data-role="Row Title Panel"]')?.getBoundingClientRect().right ?? null)
  if (rowAreaX === null) throw new Error('no Row Title Panel to measure the Row Area left edge from')
  setup.tasks = plan.tasks

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
    if (!answer?.accepted) { note.why = 'setScrollPosition refused'; return null }
    await page.mouse.move(TARGET_X, args.height - 30)
    await page.mouse.move(TARGET_X + 1, args.height - 30)
    await page.waitForTimeout(600)
    await settle(page)
    const heldGroup = await page.evaluate(() => window.grSchedulerAgentApi.readDocument().documentSettings.scrollGroupId)
    if (heldGroup !== origin.group) { note.why = 'the view did not take the row'; return null }
    const xOfDay = (day) => rowAreaX + (day - scrollDay) * plan.pxPerDay
    const rows = await visibleRows(page, args.height)
    const band = rows.find((r) => r.group === origin.group)
    if (band === undefined) { note.why = 'the origin row is not drawn'; return null }

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
    if (end === null) { note.why = 'no ew-resize beside the finish edge'; return null }

    const partners = []
    const others = rows.filter((r) => r.group !== origin.group).sort((a, b) => Math.abs(a.top - band.top) - Math.abs(b.top - band.top))
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
    if (partners.length === 0) { note.why = 'no partner Task confirmed as a hit'; return null }

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

  const move = (p, held) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, ...(held ? { button: 'left', buttons: 1 } : {}) })
  const glide = async (a, b, steps, held) => {
    for (let i = 1; i <= steps; i += 1) await move({ x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps }, held)
  }
  const pressAt = (p) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', buttons: 1, clickCount: 1 })
  const releaseAt = (p) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', buttons: 0, clickCount: 1 })

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
      setup.attempts.push({ originUid: origin.uid, arrowsBefore: before, arrowsOverPartner: overPartner })
      if (overPartner > before) { started = { ...found, partner }; arrowsBeforeDrag = before; break }
      await releaseAt(found.empty)
      await page.waitForTimeout(500)
    }
    if (started !== null) break
  }
  if (started === null) throw new Error('no drag start drew an extra arrow over a partner; see setup')
  const empty = started.empty
  const target = started.partner

  await page.evaluate(() => window.__depDragProbe.arm())
  const circle = (roundNo, c, rx, ry) =>
    Array.from({ length: PER_BURST }, (_u, s) => {
      const phase = (roundNo * PER_BURST + s) / 7
      return { type: 'mouseMoved', x: c.x + Math.sin(phase) * rx, y: c.y + Math.cos(phase / 2) * ry, button: 'left', buttons: 1 }
    })
  const rx = Math.max(2, Math.min(target.halfWidth * 0.7, 40))
  const ry = Math.max(1, Math.min(target.h * 0.2, 3))
  const motion = {
    [EMPTY]: { at: empty, step: (r) => burst(cdp, circle(r, empty, 10, 5)) },
    [TASK]: { at: target, step: (r) => burst(cdp, circle(r, target, rx, ry)) },
  }

  const stretches = []
  let here = empty
  for (const name of args.stretchList) {
    const m = motion[name]
    if (here !== m.at) { await glide(here, m.at, 12, true); here = m.at }
    const { events, value: rounds } = await traced(cdp, async () => {
      // lead-in outside the bracket, so tracing's own start-up is not in the kept frames
      for (let r = 0; r < 10; r += 1) await m.step(r)
      await mark(page, name, 'start')
      const began = Date.now()
      let n = 0
      while (Date.now() - began < args.holdMs) { await m.step(n); n += 1 }
      await mark(page, name, 'end')
      return n
    })
    await page.waitForTimeout(300)
    const traceFile = path.join(OUT, `${args.label}-${name}.trace.json`)
    if (args.keepTraces) writeFileSync(traceFile, JSON.stringify({ metadata: { stretch: name, ...conditions }, traceEvents: events }))
    stretches.push({ name, rounds, traceEvents: events.length, traceFile: args.keepTraces ? traceFile : null, trace: summarise(events, name) })
  }

  // let go over empty ground, so nothing is written
  if (here !== empty) { await glide(here, empty, 12, true); here = empty }
  await move({ x: empty.x + 1, y: empty.y }, true)
  await page.waitForTimeout(300)
  await releaseAt({ x: empty.x + 1, y: empty.y })
  await page.waitForTimeout(800)
  const arrowsAfterRelease = await arrows(page)
  await disarmDependency(page)

  // the in-page probe numbers for the same bracket
  const raw = await page.evaluate(() => {
    const p = window.__grsFrameProbe
    return { samples: p.samples, marks: p.marks, inputs: p.inputs }
  })
  const frames = framesOf(raw.samples)
  for (const s of stretches) {
    const start = raw.marks.find(([n, e]) => n === s.name && e === 'start')?.[2]
    const end = raw.marks.find(([n, e]) => n === s.name && e === 'end')?.[2]
    const mine = frames.filter((f) => f.enter >= start && f.enter <= end)
    const intervals = []
    for (let i = 1; i < mine.length; i += 1) intervals.push(mine[i].stamp - mine[i - 1].stamp)
    s.inPageProbe = {
      frameTime: stats(intervals),
      insideRedrawCallback: stats(mine.slice(1).map((f) => f.inside)),
      inputsReceived: raw.inputs.filter((t) => t >= start && t <= end).length,
      heldMs: round2(end - start),
    }
  }

  result = {
    conditions: { ...conditions, browserVersion: browser.version(), userAgent: await page.evaluate(() => navigator.userAgent) },
    setup: { ...setup, arrowsBeforeDrag, arrowsAfterRelease },
    stretches,
    notMeasured: [],
  }
  if (plan.tasks !== 1000) result.notMeasured.push(`the document held ${plan.tasks} Task, not 1000`)
  if (arrowsAfterRelease > arrowsBeforeDrag) result.notMeasured.push('more arrows after the release than before the drag: a dependency may have been written')
  for (const s of stretches) if (!s.trace.ok) result.notMeasured.push(`${s.name}: ${s.trace.reason}`)
  await context.close()
} catch (thrown) {
  result = { conditions, setup, notMeasured: [`the run broke: ${String(thrown?.message ?? thrown).slice(0, 400)}`] }
}

const ok = result.notMeasured.length === 0
process.stdout.write(JSON.stringify({ ok, ...result }, null, 2) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(ok ? 0 : 1)

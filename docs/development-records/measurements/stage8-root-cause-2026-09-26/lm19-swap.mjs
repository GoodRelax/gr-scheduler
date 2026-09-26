// Production conditions (LM-19 / MC-6 / MC-7 / MC-8): shipped dist/index.html, msedge, 1920x1080, 1000 Task, 240 intervals per stretch.
// Run from the repository root after `npm run build`:
//   node tools/probe/examples/lm-19-frame-time-baseline.mjs                      (production defaults)
//   node tools/probe/examples/lm-19-frame-time-baseline.mjs --tasks 50 --samples 30   (smoke test only)
// Prints one JSON object on stdout. Exit 0 = measured, 1 = could not be measured, 2 = bad arguments or environment.

// ---------------------------------------------------------------------------
// What is measured, and where the definition lives
// ---------------------------------------------------------------------------
//
// Frame time is the INTERVAL between delivered frames (preamble of table T-043
// in docs/spec/05-07-design.md), taken over the stretches of table T-025 row
// MC-8. The time spent inside the redraw callback is reported beside it and is
// never called a frame time.
//
// NOT COPIED: the in-page instrument is read at run time out of
// tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts (its FRAME_PROBE
// constant), so this script and that test record frames with one and the same
// code. If the constant cannot be found the run fails rather than falling back
// to a private copy. The arithmetic below mirrors that file's `summarise`
// (one frame per distinct rAF stamp, frames cut by the marks on `enter`,
// nearest-rank percentile); it is not exported there, and tests/ is not edited
// from here.
//
// The drive is that file's too: CDP bursts of 24 events, the warm-up stretch,
// then MK-1 scroll, MK-2 zoom, MK-7 pan and MK-6 range select. The one change
// is that each stretch is driven until it has `--samples` intervals rather
// than for a fixed number of rounds.
//
// The write cost is a separate number: one Ctrl+wheel notch (MK-2, a setZoom
// write) sent into a quiet page, timed from the page receiving the event to the
// end of the redraw callback that follows, plus the synchronous time the
// event's dispatch took (window capture to window bubble).

import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(process.env.TREE)
const BUILD = path.join(ROOT, 'dist', 'index.html')
const NFR_TEST = path.join(ROOT, 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')
const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
const AGENT_API_ENTRANCE = 'IC-20'

// ------------------------------------------------------------------ arguments

const DEFAULTS = {
  tasks: 1000, // MC-7 and TP-6: the startup template holds this many
  samples: 240, // frame intervals per stretch
  writes: 30, // single Ctrl+wheel notches for the write cost
  width: 1920, // MC-6
  height: 1080,
  channel: 'msedge', // MC-5, as tests/system/live-app.ts launches it
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
    out[key] = typeof DEFAULTS[key] === 'number' ? Number(raw) : raw
    if (typeof DEFAULTS[key] === 'number' && !(Number.isInteger(out[key]) && out[key] >= 0)) {
      fail(2, `argument ${argv[i]} must be a non-negative integer, got ${raw}`)
    }
    i += 1
  }
  if (out.samples < 2) fail(2, '--samples must be at least 2')
  return out
}

const args = parseArgs(process.argv.slice(2))

// ------------------------------------------------------------------ arithmetic

/** Nearest-rank percentile, as the nfr test computes it. */
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

/** One frame per distinct stamp; inside-time is the sum of that frame's callbacks. */
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

// ------------------------------------------------------------------ conditions

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

function gitCommit() {
  try {
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT }).toString().trim()
    const dirty = execFileSync('git', ['status', '--porcelain', '--', 'dist', 'src'], { cwd: ROOT })
      .toString().trim().length > 0
    return { head, dirtyDistOrSrc: dirty }
  } catch {
    return { head: null, dirtyDistOrSrc: null }
  }
}

function readSharedProbe() {
  if (!existsSync(NFR_TEST)) fail(2, 'the nfr test that holds FRAME_PROBE is not there', { file: NFR_TEST })
  const found = /const FRAME_PROBE = `([\s\S]*?)`\r?\n/.exec(readFileSync(NFR_TEST, 'utf8'))
  if (found === null) fail(2, 'FRAME_PROBE was not found in the nfr test; refusing to use a private copy')
  return found[1]
}

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
  const at = await page.evaluate((mark) => {
    const entry = document.querySelector(`[data-icon="${mark}"]`)
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

async function openAgentApi(page) {
  if (!(await pressEntrance(page, AGENT_API_ENTRANCE))) return false
  return (await page.evaluate(() => typeof window.grSchedulerAgentApi)) === 'object'
}

const taskCount = (page) =>
  page.evaluate(() => {
    const doc = window.grSchedulerAgentApi?.readDocument?.()
    return Array.isArray(doc?.schedule?.tasks) ? doc.schedule.tasks.length : -1
  })

/** Delete leaves until the document holds `target` Task (the nfr-001 test's way down). */
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

/** Distinct frames entered since `from`. */
const framesSince = (page, from) =>
  page.evaluate((t) => {
    const seen = new Set()
    for (const [stamp, enter] of window.__grsFrameProbe.samples) if (enter >= t) seen.add(stamp)
    return seen.size
  }, from)

/** Drive one MC-8 stretch until it holds `want` intervals, or give up. */
async function driveStretch(page, name, step, want) {
  await mark(page, name, 'start')
  const start = await page.evaluate(() => window.__grsFrameProbe.marks.at(-1)[2])
  const deadline = Date.now() + args.stretchTimeoutMs
  let rounds = 0
  for (;;) {
    await step(rounds)
    rounds += 1
    if ((await framesSince(page, start)) >= want + 1) break
    if (Date.now() > deadline) break
  }
  await mark(page, name, 'end')
  await page.waitForTimeout(500)
  return rounds
}

// ------------------------------------------------------------------ main

if (!existsSync(BUILD)) fail(2, 'dist/index.html is not there; run `npm run build` first')
const probeSource = readSharedProbe()

const conditions = {
  measuredAt: new Date().toISOString(),
  commit: gitCommit(),
  buildSha256: sha256(BUILD),
  screen: { width: args.width, height: args.height },
  tasksRequested: args.tasks,
  samplesPerStretch: args.samples,
  channel: args.channel,
  cpu: os.cpus()[0]?.model?.trim() ?? null,
  logicalCpus: os.cpus().length,
  os: `${os.type()} ${os.release()}`,
  node: process.version,
  definition:
    'frame time = interval between delivered rAF stamps (T-043 preamble), over MC-8 stretches; ' +
    'instrument = FRAME_PROBE of tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts',
}

let browser
try {
  browser = await chromium.launch({ channel: args.channel === 'chromium' ? undefined : args.channel })
} catch (cause) {
  fail(2, `browser channel ${args.channel} could not be started`, { detail: String(cause).slice(0, 300) })
}

let result
try {
  const context = await browser.newContext({ viewport: { width: args.width, height: args.height } })
  const page = await context.newPage()
  await page.addInitScript(probeSource)
  const SWAP = process.env.SWAP ?? 'none'
  await page.addInitScript((variant) => {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')
    const onText = (svg, f) => svg.replace(/<text[^>]*>/g, f)
    const unwrapGround = (v, perLayer) => {
      const def = /<clipPath id="(grs-ground-clip-[^"]*)"><rect[^>]*\/><\/clipPath>/.exec(v)
      if (!def) return v
      const open = `<g clip-path="url(#${def[1]})">`
      const at = v.indexOf(open)
      if (at < 0) return v
      const tags = /<g\b|<\/g>/g
      tags.lastIndex = at + open.length
      let depth = 1; let close = -1; let m
      while ((m = tags.exec(v))) { depth += m[0] === '</g>' ? -1 : 1; if (depth === 0) { close = m.index; break } }
      if (close < 0) return v
      let inner = v.slice(at + open.length, close)
      if (perLayer) inner = inner.replace(/<g data-zo="/g, `<g clip-path="url(#${def[1]})" data-zo="`)
      const head = perLayer ? v.slice(0, at) : v.slice(0, def.index) + v.slice(def.index + def[0].length, at)
      return head + inner + v.slice(close + 4)
    }
    const swaps = {
      none: (v) => v,
      unwrap: (v) => unwrapGround(v, false),
      layerclip: (v) => unwrapGround(v, true),
      cullmask: (v) => {
        const size = /^<svg[^>]* width="([\d.]+)" height="([\d.]+)"/.exec(v)
        const W = Number(size[1]); const H = Number(size[2])
        return v.replace(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="black"[^>]*\/>/g,
          (all, x, y, w, h) => (+x + +w <= 0 || +x >= W || +y + +h <= 0 || +y >= H ? '' : all))
      },
      noground: (v) => v.replace(/ clip-path="url\(#grs-ground-clip-[^)]*\)"/g, ''),
      scan: (v) => onText(v.replace(/ mask="url\(#NEVER[^)]*\)"/g, ''), (t) => t.replace(/ font-family="NEVER[^"]*"/, '')),
      nomask: (v) => v.replace(/ mask="url\(#[^)]*\)"/g, ''),
      nofont: (v) => onText(v, (t) => t.replace(/ font-family="[^"]*"/, '')),
      nohalo: (v) => onText(v, (t) => t.replace(/ stroke="[^"]*" stroke-width="[^"]*"/, '').replace(' stroke-linejoin="round" paint-order="stroke"', '')),
      nomaskdefs: (v) => v.replace(/ mask="url\(#[^)]*\)"/g, '').replace(/<mask[\s\S]*?<\/mask>/g, ''),
    }
    const chain = variant.split('+').map((k) => swaps[k])
    window.__swapSeen = { calls: 0, before: 0, after: 0 }
    Object.defineProperty(Element.prototype, 'innerHTML', {
      configurable: true,
      get() { return d.get.call(this) },
      set(v) {
        if (typeof v === 'string' && v.startsWith('<svg')) {
          window.__swapSeen.calls += 1
          window.__swapSeen.before = v.length
          for (const f of chain) v = f(v)
          window.__swapSeen.after = v.length
        }
        d.set.call(this, v)
      },
    })
  }, SWAP)
  await page.goto(pathToFileURL(BUILD).href)
  await settle(page)

  // The production run measures the startup template untouched, exactly as the
  // nfr test does, and opens the Agent API only afterwards to count. Any other
  // count has to open it first to delete down, and is marked so.
  let apiOpenedBeforeMeasuring = false
  if (args.tasks !== DEFAULTS.tasks) {
    if (!(await openAgentApi(page))) throw new Error('the Agent API could not be opened to set the Task count')
    apiOpenedBeforeMeasuring = true
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
  const CTRL = 2
  const PER_BURST = 24
  const path_ = (roundNo, held) =>
    Array.from({ length: PER_BURST }, (_u, s) => {
      const phase = (roundNo * PER_BURST + s) / 7
      return {
        type: 'mouseMoved', x: box.x + Math.sin(phase) * (box.w / 5),
        y: box.y + Math.cos(phase / 2) * (box.h / 5), button: 'left', buttons: 1, modifiers: held,
      }
    })
  const wheels = (roundNo, period, delta, modifiers) =>
    Array.from({ length: PER_BURST }, (_u, s) => ({
      type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0,
      deltaY: (roundNo + s) % period < period / 2 ? delta : -delta, modifiers,
    }))

  // Warm-up, thrown away, as in the nfr test.
  await mark(page, 'warm-up', 'start')
  for (let i = 0; i < 8; i += 1) {
    await burst(cdp, [
      { type: 'mouseMoved', x: box.x, y: box.y },
      { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 60 },
    ])
  }
  await mark(page, 'warm-up', 'end')
  await page.waitForTimeout(500)

  const rounds = {}
  if (process.env.TRACE) await browser.startTracing(page, { path: process.env.TRACE, categories: ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'gpu', 'viz', 'benchmark', 'input', 'blink', 'skia'] })
  rounds['MK-1 scroll'] = await driveStretch(page, 'MK-1 scroll',
    (r) => burst(cdp, wheels(r, 12, 90, 0)), args.samples)
  if (process.env.TRACE) await browser.stopTracing()
  rounds['MK-2 zoom'] = await driveStretch(page, 'MK-2 zoom',
    (r) => burst(cdp, wheels(r, 8, 80, CTRL)), args.samples)

  const QUICK = process.env.QUICK === '1'
  if (!QUICK) {
  await burst(cdp, [
    { type: 'mouseMoved', x: box.x, y: box.y, modifiers: CTRL },
    { type: 'mousePressed', x: box.x, y: box.y, button: 'left', buttons: 1, clickCount: 1, modifiers: CTRL },
  ])
  rounds['MK-7 pan'] = await driveStretch(page, 'MK-7 pan', (r) => burst(cdp, path_(r, CTRL)), args.samples)
  await burst(cdp, [{ type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 }])

  const from = { x: box.x - box.w / 3, y: box.y - box.h / 3 }
  await burst(cdp, [
    { type: 'mouseMoved', x: from.x, y: from.y },
    { type: 'mousePressed', x: from.x, y: from.y, button: 'left', buttons: 1, clickCount: 1 },
  ])
  rounds['MK-6 range select'] = await driveStretch(page, 'MK-6 range select',
    (r) => burst(cdp, path_(r, 0)), args.samples)
  await burst(cdp, [{ type: 'mouseReleased', x: box.x, y: box.y, button: 'left', buttons: 0, clickCount: 1 }])
  }
  await page.waitForTimeout(300)

  // ---- write cost: single Ctrl+wheel notches into a quiet page -------------
  await page.evaluate(() => {
    const w = (window.__lm19Writes = { capture: [], bubble: [] })
    window.addEventListener('wheel', () => w.capture.push(performance.now()), { capture: true, passive: true })
    window.addEventListener('wheel', () => w.bubble.push(performance.now()), { passive: true })
  })
  const writeInputToRedrawEnd = []
  const writeInside = []
  const writeDispatch = []
  let writesWithoutFrame = 0
  for (let i = 0; i < (QUICK ? 0 : args.writes); i += 1) {
    await page.waitForTimeout(400)
    const before = await page.evaluate(() => window.__lm19Writes.capture.length)
    await burst(cdp, [{ type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0,
      deltaY: i % 2 === 0 ? -80 : 80, modifiers: CTRL }])
    await page.waitForTimeout(250)
    const one = await page.evaluate((k) => {
      const w = window.__lm19Writes
      const t0 = w.capture[k]
      const bubbleAt = w.bubble.find((t) => t >= t0)
      const after = window.__grsFrameProbe.samples.filter(([, enter]) => enter >= t0)
      return { t0, bubbleAt: bubbleAt ?? null, after }
    }, before)
    if (one.t0 === undefined) continue
    if (one.bubbleAt !== null) writeDispatch.push(one.bubbleAt - one.t0)
    const frames = framesOf(one.after)
    if (frames.length === 0) { writesWithoutFrame += 1; continue }
    writeInputToRedrawEnd.push(frames[0].leave - one.t0)
    writeInside.push(frames[0].inside)
  }

  // ---- collect ------------------------------------------------------------
  const raw = await page.evaluate(() => {
    const p = window.__grsFrameProbe
    return { samples: p.samples, marks: p.marks, inputs: p.inputs }
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
    const inputs = raw.inputs.filter((t) => t >= start && t <= end).length
    const span = mine.length > 1 ? mine.at(-1).stamp - mine[0].stamp : 0
    if (used.length < args.samples) short.push(`${name}: ${used.length} of ${args.samples} intervals`)
    pooledIntervals.push(...used)
    pooledInside.push(...inside)
    stretches.push({
      name,
      rounds: rounds[name],
      frameTime: stats(used),
      meanFrameRate: span > 0 ? round2(((mine.length - 1) * 1000) / span) : null,
      insideRedrawCallback: stats(inside),
      inputsReceived: inputs,
    })
  }

  if (apiOpenedBeforeMeasuring === false) {
    if (!(await openAgentApi(page))) throw new Error('the Agent API could not be opened to count Task')
  }
  const tasksMeasured = await taskCount(page)
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
      apiOpenedBeforeMeasuring,
      browserVersion: browser.version(),
      renderer,
      userAgent: await page.evaluate(() => navigator.userAgent),
    },
    frameTime: stats(pooledIntervals),
    insideRedrawCallbackNotFrameTime: stats(pooledInside),
    stretches,
    writeCost: {
      what: 'one Ctrl+wheel notch (MK-2, setZoom) into a quiet page',
      inputToRedrawCallbackEnd: stats(writeInputToRedrawEnd),
      insideThatRedrawCallback: stats(writeInside),
      synchronousDispatch: stats(writeDispatch),
      writesWithoutFrame,
    },
    notMeasured: [],
    swap: { variant: SWAP, seen: await page.evaluate(() => window.__swapSeen) },
    census: await page.evaluate(() => {
      const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
      const tags = {}
      for (const e of svg.querySelectorAll('*')) tags[e.tagName] = (tags[e.tagName] ?? 0) + 1
      return { total: svg.querySelectorAll('*').length, chars: svg.outerHTML.length, masked: svg.querySelectorAll('[mask]').length,
        textWithFont: svg.querySelectorAll('text[font-family]').length, textWithHalo: svg.querySelectorAll('text[paint-order]').length, tags }
    }),
  }

  // ---- the run refuses to report a number it did not measure ---------------
  if (tasksMeasured <= 0) result.notMeasured.push(`the document held ${tasksMeasured} Task; nothing of MC-7 was loaded`)
  if (tasksMeasured !== args.tasks) result.notMeasured.push(`asked for ${args.tasks} Task, measured ${tasksMeasured}`)
  for (const s of short) result.notMeasured.push(`stretch too short (MC-8 had no redraws to measure?) -- ${s}`)
  if (!QUICK && writeInputToRedrawEnd.length === 0 && args.writes > 0) result.notMeasured.push('no write produced a frame')
  await context.close()
} catch (thrown) {
  result = { conditions, notMeasured: [`the run broke: ${String(thrown?.message ?? thrown).slice(0, 400)}`] }
}

// Closing msedge can take minutes on this machine (tests/system/live-app.ts
// CLEARING_UP_MS), so the answer is printed first and the close is not waited on for long.
const ok = result.notMeasured.length === 0
process.stdout.write(JSON.stringify({ ok, ...result }, null, 2) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(ok ? 0 : 1)

// Row-axis zoom under production conditions (LM-19 / MC-6 / MC-7 / MC-8): the shipped dist/index.html
// of a BUILT TREE, msedge, the 1000-Task startup template, 240 intervals per stretch.
// The probe lives outside the tree and is handed the tree, so nothing is copied into it:
//   node zoom-row-axis.mjs --tree <built tree>                                         (production defaults)
//   node zoom-row-axis.mjs --tree <built tree> --tasks 50 --samples 30 --singles 3     (smoke test only)
// Prints one JSON object on stdout. Exit 0 = measured, 1 = could not be measured, 2 = bad arguments or environment.

// ---------------------------------------------------------------------------
// What is measured, and when the CR-381 halving runs (read from the code)
// ---------------------------------------------------------------------------
//
// Tip (src/adapter/input-command-translator/input-command-translator.ts):
//   Every Alt zoom input (wheel :1375, key :1320-1323) calls zoomTimes (:3188-3194):
//   wanted = min(stepped, font ceiling :3139-3144), then zoomYWithinBand (:3165-3183).
//   - a zoom-out whose drawn rows fit returns at once (:3170): no layout
//   - otherwise the whole schedule is laid out once (:3171 -> tallestBandAtZoomY :3147-3157)
//   - ONLY when that does not fit the Row Area does it halve (:3172-3181): one more
//     layout at the drawn zoom (:3173), then up to 40 layouts until the gap is within
//     1e-6 of the zoom (:3159-3160) -- about 17 for a 1-notch step, 18 for 2 notches
//   So the halving runs only when the row-area ceiling is LOWER than the font ceiling
//   and the input steps past it. The font ceiling reads document settings only
//   (schedule-layout.ts zoomYAtRectangleLabelFont :1165-1169), never the window, while
//   the row-area ceiling grows with the Row Area -- so the window height tells the
//   two apart, and a short window puts the row-area ceiling in force.
//   Both builds also lay the schedule out once more on any zoomY change in rowHeldStill
//   (tip :3304-3336, layout at :3317; 5c1b915 :3136, layout at :3149).
// Stage 0 (5c1b915): zoomTimes (:3021-3026) takes min(stepped, the closed-form
//   zoomYCeiling :3004-3016). No layout for the ceiling, no halving.
//
// Sections:
//   [1920x1080]  lm-19's window, the Agent API NOT open (as lm-19): the ceiling is
//                reached by 50 notches in (1.1^50 > S-98 = 64, so it always ends on a
//                ceiling), then measured; the ceiling's zoomY is read afterwards.
//   [1920x400]   the row-area ceiling in force (checked, not assumed): the same rows
//                again, so "past the ceiling" goes through the halving at the tip.
//   [1920x1600]  not measured: only climbs, to tell which ceiling held at 1080.
// Rows in each section:
//   at the ceiling:  out 1 notch / in 2 notches, repeated (every event changes zoomY)
//   under it:        in 1 notch / out 1 notch, `--below` notches under the ceiling
//   singles:         one input into a quiet page, per kind
// The time is reported three ways: frame interval, time inside the redraw callback,
// and the synchronous dispatch of the input event (window capture to window bubble),
// which is where zoomTimes runs.
//
// Inputs, and why they work at stage 0 and at the tip alike:
//   MK-4  Alt + wheel        5c1b915 translator :1324, tip :1375
//   SK-16a / SK-16c  Alt + '=' / Alt + '-'   5c1b915 :1269-1271, tip :1320-1323
//   dom-input-source.ts maps code Equal/Minus to '+'/'-' (SIGN_BY_CODE :48-55) and a
//   wheel notch to 100 px (PIXELS_PER_NOTCH :67), unchanged between the two.
//   MK-2 (Ctrl + wheel) zooms both axes and is lm-19's stretch; it is not used.
//
// NOT COPIED: the frame instrument is FRAME_PROBE, read at run time from the tree's own
// tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts, as lm-19 does.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
const AGENT_API_ENTRANCE = 'IC-20'
const CDP_ALT = 1 // Input.dispatchMouseEvent modifiers bit for Alt
const NOTCH_PX = 100 // PIXELS_PER_NOTCH of src/framework/dom-input-source/dom-input-source.ts
const PER_BURST = 24 // as lm-19
const CLIMB_NOTCHES = 50 // 1.1^50 = 117 > S-98: from any zoom this ends on a ceiling
const SAME_ZOOM = 1e-4 // relative: two zoomY readings this close are one ceiling

// ------------------------------------------------------------------ arguments

const DEFAULTS = {
  tree: '', // the built tree to measure (holds dist/index.html, tests/, node_modules)
  tasks: 1000, // MC-7 and TP-6: the startup template holds this many
  samples: 240, // frame intervals per stretch
  singles: 10, // single inputs per kind, each into a quiet page
  below: 6, // notches under the ceiling for the "under" rows
  width: 1920, // MC-6
  height: 1080,
  bandHeight: 400, // the short window that puts the row-area ceiling in force
  tallHeight: 1600, // the tall window used only to classify the ceiling at `height`
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
  if (out.singles < 1) fail(2, '--singles must be at least 1')
  if (!(out.bandHeight < out.height && out.height < out.tallHeight)) {
    fail(2, '--bandHeight < --height < --tallHeight is required')
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const TREE = path.resolve(args.tree)
const BUILD = path.join(TREE, 'dist', 'index.html')
const NFR_TEST = path.join(TREE, 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')
const TAG_MAIN = `${args.width}x${args.height}`
const TAG_BAND = `${args.width}x${args.bandHeight}`
const TAG_TALL = `${args.width}x${args.tallHeight}`

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

/** For each input, the first frame entered after it: to that frame's entry, and to its callback's end. */
function nextFrameAfter(inputTimes, frames) {
  const toEnter = []
  const toCallbackEnd = []
  let j = 0
  for (const t of [...inputTimes].sort((a, b) => a - b)) {
    while (j < frames.length && frames[j].enter < t) j += 1
    if (j >= frames.length) break
    toEnter.push(frames[j].enter - t)
    toCallbackEnd.push(frames[j].leave - t)
  }
  return { toEnter, toCallbackEnd }
}

/** Window capture to window bubble of the same event: the synchronous dispatch the translator runs in. */
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

const isLower = (a, b) => a !== null && b !== null && a < b * (1 - SAME_ZOOM)

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

// The dispatch instrument. Capture listeners are installed before the app's own
// (init script), and record only once armed, which is also when the bubble
// listeners are added -- after the app's window listeners, so they run after them.
const DISPATCH_PROBE = `(() => {
  const s = { armed: false, capture: { wheel: [], key: [] }, bubble: { wheel: [], key: [] } };
  const zoomKey = (e) => e.code === 'Equal' || e.code === 'Minus';
  window.addEventListener('wheel', () => { if (s.armed) s.capture.wheel.push(performance.now()); }, { capture: true, passive: true });
  window.addEventListener('keydown', (e) => { if (s.armed && zoomKey(e)) s.capture.key.push(performance.now()); }, { capture: true, passive: true });
  s.arm = () => {
    if (s.armed) return;
    window.addEventListener('wheel', () => { s.bubble.wheel.push(performance.now()); }, { passive: true });
    window.addEventListener('keydown', (e) => { if (zoomKey(e)) s.bubble.key.push(performance.now()); }, { passive: true });
    s.armed = true;
  };
  Object.defineProperty(window, '__rowZoomProbe', { value: s });
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

const taskCount = (page) =>
  page.evaluate(() => {
    const doc = window.grSchedulerAgentApi?.readDocument?.()
    return Array.isArray(doc?.schedule?.tasks) ? doc.schedule.tasks.length : -1
  })

const readZoomY = (page) =>
  page.evaluate(() => window.grSchedulerAgentApi?.readDocument?.()?.documentSettings?.zoomY ?? null)

/** Delete leaves until the document holds `target` Task (lm-19's way down; smoke runs only). */
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


const SCALE_PRESSES = Number(process.env.SCALE_PRESSES ?? '0')
async function pressScaleUp(page) {
  let pressed = 0
  for (let i = 0; i < SCALE_PRESSES; i += 1) {
    const at = await page.evaluate(() => {
      const e = document.querySelector('[data-icon="IC-105"]')
      if (e === null) return null
      const b = e.getBoundingClientRect()
      return b.width === 0 ? null : { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    })
    if (at === null) break
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(800)
    pressed += 1
  }
  return pressed
}

const conditions = {
  scalePressesAsked: SCALE_PRESSES,
  probe: 'zoom-row-axis',
  measuredAt: new Date().toISOString(),
  tree: path.basename(TREE),
  buildSha256: sha256(BUILD),
  screen: { width: args.width, height: args.height, bandHeight: args.bandHeight, tallHeight: args.tallHeight },
  tasksRequested: args.tasks,
  samplesPerStretch: args.samples,
  singlesPerKind: args.singles,
  notchPx: NOTCH_PX,
  belowCeilingNotches: args.below,
  channel: args.channel,
  cpu: os.cpus()[0]?.model?.trim() ?? null,
  logicalCpus: os.cpus().length,
  os: `${os.type()} ${os.release()}`,
  node: process.version,
  definition:
    'frame time = interval between delivered rAF stamps (T-043 preamble); ' +
    'instrument = FRAME_PROBE of the tree\'s tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts; ' +
    'synchronousDispatch = window capture to window bubble of one input event (where zoomTimes runs)',
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
  await page.addInitScript(DISPATCH_PROBE)
  await page.goto(pathToFileURL(BUILD).href)
  await settle(page)
  conditions.scalePresses = await pressScaleUp(page)
  await settle(page)

  let agentApiOpenedBefore = 'nothing: opened after the first section, as lm-19'
  if (args.tasks !== DEFAULTS.tasks) {
    if (!(await openAgentApi(page))) throw new Error('the Agent API could not be opened to set the Task count')
    agentApiOpenedBefore = 'every section (the Task count was trimmed through it)'
    const trimmed = await trimTo(page, args.tasks)
    if (trimmed.tasks !== args.tasks) {
      throw new Error(`could not bring the document to ${args.tasks} Task (holds ${trimmed.tasks}) ${trimmed.note}`)
    }
    await page.waitForTimeout(900)
    await settle(page)
  }

  const cdp = await context.newCDPSession(page)
  let box = null
  const bindPointer = async () => {
    box = await page.evaluate((s) => {
      const r = (document.querySelector(s) ?? document.body).getBoundingClientRect()
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
    }, DRAWN_SVG)
  }
  await bindPointer()
  const wheelOnce = (deltaY) =>
    cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY, modifiers: CDP_ALT,
    })
  const wheels = (roundNo, pattern) =>
    Array.from({ length: PER_BURST }, (_u, s) => ({
      type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0,
      deltaY: pattern[(roundNo * PER_BURST + s) % pattern.length], modifiers: CDP_ALT,
    }))
  const climb = async (notches) => {
    for (let i = 0; i < notches; i += 1) {
      await wheelOnce(-NOTCH_PX)
      await page.waitForTimeout(120)
    }
    await page.waitForTimeout(600)
  }
  /**
   * The ceiling's zoomY. `stable`: a notch in left zoomY where it was. `reached`: stable, or bounded --
   * the last notches in set no new maximum. 5c1b915's closed-form ceiling reads the drawn rows, so at a
   * short window it can cycle (measured: 1.78 -> 1.96 -> 1.78 ...); a zoom with no ceiling at all
   * climbs by 1.1 on every notch and sets a new maximum each time.
   */
  const ceilingCheck = async (tag) => {
    const readings = [await readZoomY(page)]
    for (let i = 0; i < 6; i += 1) {
      await wheelOnce(-NOTCH_PX)
      await page.waitForTimeout(500)
      readings.push(await readZoomY(page))
      const a = readings.at(-2)
      const b = readings.at(-1)
      if (a !== null && b !== null && Math.abs(b - a) <= Math.abs(a) * SAME_ZOOM) {
        return { zoomY: b, stable: true, reached: true, oscillates: false, readings }
      }
    }
    if (readings.some((v) => v === null)) return { zoomY: null, stable: false, reached: false, oscillates: false, readings }
    const early = Math.max(...readings.slice(0, 3))
    const late = Math.max(...readings.slice(3))
    const reached = late <= early * (1 + SAME_ZOOM)
    const oscillates = readings.slice(1).some((v, i) => v < readings[i] * (1 - SAME_ZOOM))
    const highest = Math.max(...readings)
    if (reached) {
      doubts.push(`[${tag}] the ceiling ${oscillates ? 'cycles' : 'moves'} while notches go in ` +
        `(zoomY ${readings.map((v) => round2(v)).join(', ')}); the highest reading is used`)
    }
    return { zoomY: reached ? highest : readings.at(-1), stable: false, reached, oscillates, readings }
  }
  const resizeTo = async (height) => {
    await page.setViewportSize({ width: args.width, height })
    await page.waitForTimeout(800)
    await settle(page)
    await bindPointer()
    // The rAF trap: nudge the pointer so a frame is owed after the resize.
    await page.mouse.move(box.x, box.y)
    await page.mouse.move(box.x + 1, box.y)
    await page.waitForTimeout(400)
  }
  const doubts = []
  const rounds = {}

  const groups = new Map()
  const groupOf = (name, what) => {
    if (!groups.has(name)) {
      groups.set(name, { name, what, sent: 0, notReceived: 0, withoutFrame: 0,
        toEnter: [], toCallbackEnd: [], inside: [], dispatch: [] })
    }
    return groups.get(name)
  }
  async function single(name, what, kind, send) {
    const g = groupOf(name, what)
    await page.waitForTimeout(400)
    const index = await page.evaluate((k) => window.__rowZoomProbe.capture[k].length, kind)
    await send()
    await page.waitForTimeout(300)
    const one = await page.evaluate(([k, i]) => {
      const s = window.__rowZoomProbe
      const t0 = s.capture[k][i]
      if (t0 === undefined) return null
      const bubbleAt = s.bubble[k].find((t) => t >= t0)
      const after = window.__grsFrameProbe.samples.filter(([, enter]) => enter >= t0)
      return { t0, bubbleAt: bubbleAt ?? null, after }
    }, [kind, index])
    g.sent += 1
    if (one === null) { g.notReceived += 1; return }
    if (one.bubbleAt !== null) g.dispatch.push(one.bubbleAt - one.t0)
    const frames = framesOf(one.after)
    if (frames.length === 0) { g.withoutFrame += 1; return }
    g.toEnter.push(frames[0].enter - one.t0)
    g.toCallbackEnd.push(frames[0].leave - one.t0)
    g.inside.push(frames[0].inside)
  }

  /** One section: starts ON the ceiling, ends on it. */
  async function section(tag) {
    const at = `[${tag}] MK-4 at the ceiling: out 1 notch / in 2 notches`
    rounds[at] = await driveStretch(page, at, (r) => burst(cdp, wheels(r, [NOTCH_PX, -2 * NOTCH_PX])), args.samples)
    for (let i = 0; i < args.below; i += 1) {
      await wheelOnce(NOTCH_PX)
      await page.waitForTimeout(150)
    }
    await page.waitForTimeout(400)
    const under = `[${tag}] MK-4 ${args.below} notches under the ceiling: in 1 notch / out 1 notch`
    rounds[under] = await driveStretch(page, under, (r) => burst(cdp, wheels(r, [-NOTCH_PX, NOTCH_PX])), args.samples)
    for (let i = 0; i < args.singles; i += 1) {
      await single(`[${tag}] MK-4 in 1 notch, under the ceiling`, 'Alt+wheel -100 px; fits: one layout, no halving',
        'wheel', () => wheelOnce(-NOTCH_PX))
      await single(`[${tag}] MK-4 out 1 notch, under the ceiling`, 'Alt+wheel +100 px',
        'wheel', () => wheelOnce(NOTCH_PX))
    }
    await climb(args.below + 4)
    for (let i = 0; i < args.singles; i += 1) {
      await single(`[${tag}] MK-4 out 1 notch, from the ceiling`, 'Alt+wheel +100 px',
        'wheel', () => wheelOnce(NOTCH_PX))
      await single(`[${tag}] MK-4 in 2 notches, past the ceiling`, 'Alt+wheel -200 px; steps past the ceiling',
        'wheel', () => wheelOnce(-2 * NOTCH_PX))
    }
    for (let i = 0; i < args.singles; i += 1) {
      await single(`[${tag}] SK-16c Alt+- from the ceiling`, 'Alt+Minus', 'key', () => page.keyboard.press('Alt+Minus'))
      await single(`[${tag}] SK-16a Alt+= back to the ceiling`, 'Alt+Equal; lands on the ceiling',
        'key', () => page.keyboard.press('Alt+Equal'))
      await single(`[${tag}] SK-16a Alt+= past the ceiling`, 'Alt+Equal on the ceiling; may change nothing',
        'key', () => page.keyboard.press('Alt+Equal'))
    }
  }

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
  await page.evaluate(() => window.__rowZoomProbe.arm())

  // ---- section 1: lm-19's window
  const startedAt = Date.now()
  await climb(CLIMB_NOTCHES)
  await section(TAG_MAIN)
  if (!(await openAgentApi(page))) throw new Error('the Agent API could not be opened to read zoomY')
  const mainCeiling = await ceilingCheck(TAG_MAIN)

  // ---- section 2: the short window, where the row-area ceiling should hold
  await resizeTo(args.bandHeight)
  await climb(CLIMB_NOTCHES)
  const bandCeiling = await ceilingCheck(TAG_BAND)
  await section(TAG_BAND)

  // ---- classification only: the tall window
  await resizeTo(args.tallHeight)
  await climb(CLIMB_NOTCHES)
  const tallCeiling = await ceilingCheck(TAG_TALL)
  const drivenMs = Date.now() - startedAt

  const rowAreaAtMain = isLower(mainCeiling.zoomY, tallCeiling.zoomY)
  const rowAreaAtBand = isLower(bandCeiling.zoomY, mainCeiling.zoomY)
  const ceiling = {
    [TAG_MAIN]: { ...mainCeiling, rowAreaCeilingInForce: rowAreaAtMain },
    [TAG_BAND]: { ...bandCeiling, rowAreaCeilingInForce: rowAreaAtBand },
    [TAG_TALL]: tallCeiling,
    method:
      'the font ceiling reads document settings only, the row-area ceiling grows with the window; ' +
      'so a ceiling lower than the one of a taller window is the row-area ceiling',
    reading: [
      `${TAG_MAIN}: ` + (rowAreaAtMain
        ? 'the row-area ceiling holds; "past the ceiling" inputs halve at the tip'
        : 'the font ceiling (or S-98) holds; at the tip "past the ceiling" inputs return at wanted <= drawn (:3170) and never halve'),
      `${TAG_BAND}: ` + (rowAreaAtBand
        ? 'the row-area ceiling holds; "past the ceiling" inputs halve at the tip (one layout + one + about 18)'
        : 'the row-area ceiling does NOT hold; this section does not reach the halving'),
      '"under the ceiling" zoom-ins cost one layout (:3171) at the tip and none for the ceiling at 5c1b915; ' +
        'both builds add one layout per change in rowHeldStill',
    ],
  }

  // ---- collect
  const raw = await page.evaluate(() => {
    const p = window.__grsFrameProbe
    const z = window.__rowZoomProbe
    return { samples: p.samples, marks: p.marks, inputs: p.inputs, capture: z.capture, bubble: z.bubble }
  })
  const frames = framesOf(raw.samples)
  const stretches = []
  const pooled = {}
  const short = []
  for (const name of Object.keys(rounds)) {
    const tag = name.slice(1, name.indexOf(']'))
    const start = raw.marks.find(([n, e]) => n === name && e === 'start')?.[2]
    const end = raw.marks.find(([n, e]) => n === name && e === 'end')?.[2]
    const mine = frames.filter((f) => f.enter >= start && f.enter <= end)
    const intervals = []
    for (let i = 1; i < mine.length; i += 1) intervals.push(mine[i].stamp - mine[i - 1].stamp)
    const used = intervals.slice(0, args.samples)
    const inside = mine.slice(1, used.length + 1).map((f) => f.inside)
    const inRange = (t) => t >= start && t <= end
    const captures = raw.capture.wheel.filter(inRange)
    const dispatch = dispatchTimes(captures, raw.bubble.wheel.filter((t) => t >= start))
    const next = nextFrameAfter(captures, frames)
    const span = mine.length > 1 ? mine.at(-1).stamp - mine[0].stamp : 0
    if (used.length < args.samples) short.push(`${name}: ${used.length} of ${args.samples} intervals`)
    pooled[tag] ??= { intervals: [], inside: [] }
    pooled[tag].intervals.push(...used)
    pooled[tag].inside.push(...inside)
    stretches.push({
      name,
      rounds: rounds[name],
      frameTime: stats(used),
      meanFrameRate: span > 0 ? round2(((mine.length - 1) * 1000) / span) : null,
      insideRedrawCallback: stats(inside),
      synchronousDispatch: stats(dispatch),
      inputToNextFrameEnter: stats(next.toEnter),
      inputToRedrawCallbackEnd: stats(next.toCallbackEnd),
      inputsReceived: raw.inputs.filter(inRange).length,
      zoomInputsReceived: captures.length,
    })
  }
  const singles = [...groups.values()].map((g) => ({
    name: g.name,
    what: g.what,
    sent: g.sent,
    inputToNextFrameEnter: stats(g.toEnter),
    inputToRedrawCallbackEnd: stats(g.toCallbackEnd),
    insideThatRedrawCallback: stats(g.inside),
    synchronousDispatch: stats(g.dispatch),
    inputsWithoutFrame: g.withoutFrame,
    inputsNotReceived: g.notReceived,
  }))

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
      agentApiOpenedBefore,
      drivenMs,
      browserVersion: browser.version(),
      renderer,
      userAgent: await page.evaluate(() => navigator.userAgent),
    },
    inputs:
      'MK-4 (Alt + wheel) and SK-16a / SK-16c (Alt + = / Alt + -) of docs/spec/01-04-requirements.md; ' +
      'MK-2 (Ctrl + wheel) zooms both axes and is not used',
    frameTime: stats(pooled[TAG_MAIN]?.intervals ?? []),
    insideRedrawCallbackNotFrameTime: stats(pooled[TAG_MAIN]?.inside ?? []),
    frameTimeNote: `the two top-level numbers pool the [${TAG_MAIN}] stretches only`,
    bandSection: {
      frameTime: stats(pooled[TAG_BAND]?.intervals ?? []),
      insideRedrawCallbackNotFrameTime: stats(pooled[TAG_BAND]?.inside ?? []),
    },
    stretches,
    singles,
    ceiling,
    doubts,
    notMeasured: [],
  }

  if (tasksMeasured <= 0) result.notMeasured.push(`the document held ${tasksMeasured} Task; nothing of MC-7 was loaded`)
  if (tasksMeasured !== args.tasks) result.notMeasured.push(`asked for ${args.tasks} Task, measured ${tasksMeasured}`)
  if (!mainCeiling.reached) result.notMeasured.push(`[${TAG_MAIN}] one more notch still moved zoomY: the ceiling was not reached`)
  if (!bandCeiling.reached) result.notMeasured.push(`[${TAG_BAND}] one more notch still moved zoomY: the ceiling was not reached`)
  if (!tallCeiling.reached) doubts.push(`[${TAG_TALL}] one more notch still moved zoomY; the ${TAG_MAIN} classification is uncertain`)
  if (!rowAreaAtBand) {
    const why = `[${TAG_BAND}] the row-area ceiling did not hold (zoomY ${bandCeiling.zoomY} vs ${mainCeiling.zoomY} at ${TAG_MAIN}); the halving was not reached`
    if (args.tasks === DEFAULTS.tasks) result.notMeasured.push(why)
    else doubts.push(`${why} (smoke run with ${args.tasks} Task)`)
  }
  for (const s of short) result.notMeasured.push(`stretch too short -- ${s}`)
  for (const g of singles) {
    if (g.inputsNotReceived === g.sent) result.notMeasured.push(`no input of "${g.name}" reached the page`)
    else if (g.inputsWithoutFrame > 0) doubts.push(`"${g.name}": ${g.inputsWithoutFrame} of ${g.sent} inputs drew no frame`)
  }
  await context.close()
} catch (thrown) {
  result = { conditions, notMeasured: [`the run broke: ${String(thrown?.message ?? thrown).slice(0, 400)}`] }
}

const ok = result.notMeasured.length === 0
process.stdout.write(JSON.stringify({ ok, ...result }, null, 2) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(ok ? 0 : 1)

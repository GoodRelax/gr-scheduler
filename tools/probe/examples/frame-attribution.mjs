// Where one frame's milliseconds go -- by STAGE, not by guess.
//
// ⛔ WHY THIS EXISTS. Table T-043 was measured red on `PG-2` / `PG-3`, and the
// whole `innerHTML` road was measured at 5.8ms while a frame cost 20-27ms.
// Nobody could say where the other 15-20ms went, and a number carried in prose
// is a claim. This probe answers it from the browser's own instrumentation
// rather than from a stopwatch inside the application, so the answer does not
// depend on the application being willing to time itself.
//
// ⭐ TWO PASSES, ANSWERING DIFFERENT HALVES.
//   `trace`   -- CDP `Tracing` over the devtools timeline categories. Gives the
//                stages the application has no name for: style recalculation
//                (`UpdateLayoutTree`), `Layout`, `Paint`, `ParseHTML` (which is
//                what `innerHTML` costs) and scripting (`FunctionCall`).
//                ⛔ ONE THREAD ONLY: containment nesting is meaningless across
//                threads, so events are filtered to the renderer main thread --
//                the one that carries `FireAnimationFrame`. It also prints the
//                frame count the `profile` pass needs.
//   `profile` -- CDP `Profiler` sampling at 100us, printed as the call tree
//                under the frame body, so the scripting half is split by
//                FUNCTION. ⚠️ Names survive minification only in a build made
//                with `--minify false`, so this pass is run against
//                `npx vite build --minify false --outDir dist/unmin`, and
//                `dist/unmin` is DELETED afterwards -- `tests/nfr/nfr-004`
//                requires `dist/` to hold exactly one file.
//                ⭐ THE TWO BUILDS WERE CALIBRATED BEFORE THE SPLIT WAS
//                TRUSTED: measured 2026-09-07, scripting was 11.24ms per frame
//                on the shipped build against 11.21ms unminified, and
//                `ParseHTML` 2.27ms against 2.33ms.
//
// ⛔ NOT `tools/probe/harness.mjs`, though everything else here uses it: the
// harness launches the bundled Chromium, and table T-025 `MC-5` names the
// channel these numbers have to be taken in.
//
// ⚠️ THE GESTURE IS INPUT-BOUND, AND THAT IS FINE HERE. Frames arrive no faster
// than the driver sends wheels, so the FRAME RATE says as much about the driver
// as about the application -- `tests/nfr/` is where a gate is judged. What this
// probe reads is the COST OF ONE FRAME, which the cadence does not move.
//
// ⛔ NOTHING IS INJECTED INTO THE PAGE. A counter of its own would keep asking
// for frames and change the very thing being measured, so the `profile` pass
// takes its frame count from a `trace` pass instead of minting one.
//
// Usage, from the repository root:
//   npx vite build
//   node tools/probe/examples/frame-attribution.mjs dist/index.html trace
//   node tools/probe/examples/frame-attribution.mjs dist/unmin/index.html profile 125
import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const pagePath = process.argv[2] ?? 'dist/index.html'
const pass = process.argv[3] ?? 'trace'
/** Frames the same gesture delivered, from a `trace` run. 0 = report totals. */
const framesGiven = Number(process.argv[4] ?? '0')

/** Table T-025 MC-5's channel and MC-6's screen. */
const CHANNEL = 'msedge'
const SCREEN = { width: 1920, height: 1080 }
/** MK-1 of table T-028 -- a bare wheel -- driven for this long. */
const GESTURE_MS = 4000
const STEP_MS = 16
const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
/** Sampling interval in microseconds for the profile pass. */
const SAMPLE_US = 100
/** Branches cheaper than this are folded out of the printed tree. */
const FLOOR_MS = 0.15

/** Two identical readings in a row means the page has stopped redrawing. */
async function settle(page) {
  await page.waitForSelector(DRAWN_SVG, { state: 'attached', timeout: 60000 })
  let previous = null
  for (let i = 0; i < 60; i += 1) {
    await page.waitForTimeout(250)
    const now = await page.evaluate(
      (s) => document.querySelector(s)?.outerHTML.length ?? -1,
      DRAWN_SVG,
    )
    if (now > 0 && now === previous) return now
    previous = now
  }
  throw new Error('the drawing never settled')
}

/** The wheel, at a fixed cadence, over the drawing. */
async function scrollGesture(page, box) {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const until = Date.now() + GESTURE_MS
  let n = 0
  while (Date.now() < until) {
    await page.mouse.wheel(0, n % 2 === 0 ? 120 : -120)
    n += 1
    await page.waitForTimeout(STEP_MS)
  }
  return n
}

/**
 * Complete trace events on ONE thread nest by containment, so they are sorted
 * by (ts ascending, dur descending) and pushed on a stack. Self time is an
 * event's own `dur` less the `dur` of its direct children.
 */
function reportTrace(events, census) {
  const perThread = new Map()
  for (const e of events) {
    if (e.name !== 'FireAnimationFrame') continue
    const key = `${e.pid}/${e.tid}`
    perThread.set(key, (perThread.get(key) ?? 0) + 1)
  }
  const busiest = [...perThread.entries()].sort((a, b) => b[1] - a[1])[0]
  if (busiest === undefined) throw new Error('no FireAnimationFrame in the trace')
  const [main, frames] = busiest

  const mine = events
    .filter((e) => (e.dur ?? 0) > 0 && `${e.pid}/${e.tid}` === main)
    .sort((a, b) => (a.ts === b.ts ? b.dur - a.dur : a.ts - b.ts))

  const open = []
  const nodes = []
  let wholeFrameUs = 0
  for (const e of mine) {
    while (open.length > 0) {
      const top = open[open.length - 1]
      if (e.ts >= top.ts + top.dur) open.pop()
      else break
    }
    const parent = open[open.length - 1]
    const node = {
      name: e.name,
      ts: e.ts,
      dur: e.dur,
      childUs: 0,
      inFrame: parent !== undefined && (parent.inFrame || parent.name === 'FireAnimationFrame'),
    }
    if (parent !== undefined) parent.childUs += e.dur
    else wholeFrameUs += e.dur
    open.push(node)
    nodes.push(node)
  }

  const self = new Map()
  const insideFrame = new Map()
  for (const node of nodes) {
    const own = Math.max(0, node.dur - node.childUs)
    self.set(node.name, (self.get(node.name) ?? 0) + own)
    if (node.inFrame) insideFrame.set(node.name, (insideFrame.get(node.name) ?? 0) + own)
  }

  console.log(
    `${String(census.chars)} characters / ${String(census.elements)} elements drawn; ` +
      `${String(frames)} frames on renderer main thread ${main}`,
  )
  console.log(
    `whole frame, everything on that thread: ` +
      `${(wholeFrameUs / 1000 / frames).toFixed(2)} ms/frame`,
  )
  const table = (title, map) => {
    console.log(`\n== ${title}`)
    for (const [name, us] of [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)) {
      const perFrame = us / 1000 / frames
      if (perFrame < 0.02) continue
      console.log(`${name.padEnd(30)} ${perFrame.toFixed(2).padStart(7)} ms/frame`)
    }
  }
  table('self time, whole run', self)
  table('self time, inside the redraw callback', insideFrame)
  console.log(`\npass this frame count to the profile pass: ${String(frames)}`)
}

/** The profile as a call tree under the frame body. */
function reportProfile(profile, frames, census) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const selfUs = new Map()
  for (let i = 0; i < profile.samples.length; i += 1) {
    const id = profile.samples[i]
    selfUs.set(id, (selfUs.get(id) ?? 0) + Math.max(0, profile.timeDeltas[i] ?? 0))
  }
  const inclUs = new Map()
  const subtree = (id) => {
    const held = inclUs.get(id)
    if (held !== undefined) return held
    let total = selfUs.get(id) ?? 0
    for (const child of byId.get(id).children ?? []) total += subtree(child)
    inclUs.set(id, total)
    return total
  }
  for (const node of profile.nodes) subtree(node.id)

  const nameOf = (node) => node.callFrame.functionName || '(anonymous)'
  const divisor = frames > 0 ? frames : 1
  const unit = frames > 0 ? 'ms/frame' : 'ms total'
  const show = (id, depth) => {
    const incl = subtree(id) / 1000 / divisor
    if (incl < FLOOR_MS) return
    const own = (selfUs.get(id) ?? 0) / 1000 / divisor
    console.log(
      `${'  '.repeat(depth)}${nameOf(byId.get(id))}`.padEnd(50) +
        `${incl.toFixed(2).padStart(7)} incl ${own.toFixed(2).padStart(7)} self`,
    )
    const kids = [...(byId.get(id).children ?? [])].sort((a, b) => subtree(b) - subtree(a))
    for (const child of kids) show(child, depth + 1)
  }
  console.log(`${String(census.chars)} characters / ${String(census.elements)} elements drawn`)
  console.log(`call tree under the frame body, in ${unit}:`)
  const roots = profile.nodes.filter((node) => nameOf(node) === 'runFrame')
  if (roots.length === 0) {
    console.log('  (no frame body by name -- is this the minified build?)')
  }
  for (const root of roots.sort((a, b) => subtree(b.id) - subtree(a.id))) show(root.id, 0)
}

const browser = await chromium.launch({ channel: CHANNEL })
const context = await browser.newContext({ viewport: SCREEN })
const page = await context.newPage()
await page.goto(pathToFileURL(resolve(pagePath)).href)
await settle(page)
const census = await page.evaluate((s) => {
  const svg = document.querySelector(s)
  return {
    chars: svg?.outerHTML.length ?? -1,
    elements: svg === null ? -1 : svg.querySelectorAll('*').length + 1,
  }
}, DRAWN_SVG)
const box = await page.locator(DRAWN_SVG).boundingBox()
const cdp = await context.newCDPSession(page)

if (pass === 'trace') {
  const events = []
  cdp.on('Tracing.dataCollected', (payload) => {
    for (const one of payload.value) if (one.ph === 'X') events.push(one)
  })
  const done = new Promise((settled) => cdp.once('Tracing.tracingComplete', settled))
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: {
      includedCategories: [
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'disabled-by-default-devtools.timeline.frame',
      ],
    },
  })
  await scrollGesture(page, box)
  await page.waitForTimeout(200)
  await cdp.send('Tracing.end')
  await done
  reportTrace(events, census)
} else {
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: SAMPLE_US })
  await cdp.send('Profiler.start')
  await scrollGesture(page, box)
  const stopped = await cdp.send('Profiler.stop')
  reportProfile(stopped.profile, framesGiven, census)
}

await context.close()
process.exit(0)

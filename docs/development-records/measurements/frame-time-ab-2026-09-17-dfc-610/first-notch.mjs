// First and repeated row-axis zoom notches on a freshly opened page (DFC-610 / DFC-628 A/B).
// The shipped dist/index.html of a BUILT TREE, msedge, the 1000-Task startup template.
//   node first-notch.mjs --tree <built tree>                     (production defaults)
//   node first-notch.mjs --tree <built tree> --pages 1 --notches 2  (smoke test only)
// Prints one JSON object on stdout. Exit 0 = measured, 1 = could not be measured, 2 = bad arguments or environment.
//
// Why a second probe: zoom-row-axis.mjs (frame-time-ab-2026-09-16) measures notches only after
// 50 notches of climbing, so it never sees the first notch after load, where nothing is
// remembered yet. This probe opens a new page for every sample and sends MK-4 (Alt + wheel,
// one notch = 100 px, zoom in) `notches` times, one at a time into a quiet page:
//   notch 1        = the first row-axis zoom input the page ever receives
//   notches 2..n   = the same input repeated (a remembered ceiling would show here)
// Documents:
//   template       = the startup template as opened
//   folded         = the startup template after pressing IC-78 (FR row expander "close all",
//                    frame-loop setLevelZeroFolded), which folds the rows to level zero
// Times per input (the same instruments as zoom-row-axis.mjs):
//   synchronousDispatch      window capture to window bubble of the wheel event (zoomTimes runs here)
//   inputToRedrawCallbackEnd input to the end of the first redraw callback entered after it
//                            (FRAME_PROBE of the tree's own tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts)
// Not measured: a document folded to two rows (no input path to it was found that exists at every commit).

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
const FOLD_ENTRANCE = 'IC-78'
const CDP_ALT = 1
const NOTCH_PX = 100

const DEFAULTS = {
  tree: '',
  pages: 6, // fresh pages per condition
  notches: 6, // inputs per page: the first, then repeats
  width: 1920,
  heights: '1080,400',
  docs: 'template,folded',
  gapMs: 700, // quiet time after each input
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
    if (argv[i + 1] === undefined) fail(2, `argument ${argv[i]} needs a value`)
    out[key] = typeof DEFAULTS[key] === 'number' ? Number(argv[i + 1]) : argv[i + 1]
  }
  if (out.tree === '') fail(2, '--tree <path of a built tree> is required')
  return out
}

const args = parseArgs(process.argv.slice(2))
const TREE = path.resolve(args.tree)
const BUILD = path.join(TREE, 'dist', 'index.html')
const NFR_TEST = path.join(TREE, 'tests', 'nfr', 'nfr-002-003-frame-time-is-the-interval.test.ts')

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

if (!existsSync(BUILD)) fail(2, 'dist/index.html is not in the tree; build it first')
if (!existsSync(NFR_TEST)) fail(2, 'the nfr test that holds FRAME_PROBE is not in the tree')
const found = /const FRAME_PROBE = `([\s\S]*?)`\r?\n/.exec(readFileSync(NFR_TEST, 'utf8'))
if (found === null) fail(2, 'FRAME_PROBE was not found in the nfr test')
const FRAME_PROBE = found[1]

const DISPATCH_PROBE = `(() => {
  const s = { capture: [], bubble: [] };
  window.addEventListener('wheel', () => { s.capture.push(performance.now()); }, { capture: true, passive: true });
  s.arm = () => { window.addEventListener('wheel', () => { s.bubble.push(performance.now()); }, { passive: true }); };
  Object.defineProperty(window, '__firstNotchProbe', { value: s });
})();`

let chromium
try {
  ;({ chromium } = createRequire(path.join(TREE, 'package.json'))('playwright'))
} catch (cause) {
  fail(2, 'playwright could not be resolved from the tree', { detail: String(cause).slice(0, 300) })
}

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

const expanderCount = (page) => page.evaluate(() => document.querySelectorAll('[data-role="Row Expander"]').length)

const conditions = {
  probe: 'first-notch',
  measuredAt: new Date().toISOString(),
  tree: path.basename(TREE),
  buildSha256: createHash('sha256').update(readFileSync(BUILD)).digest('hex'),
  pagesPerCondition: args.pages,
  notchesPerPage: args.notches,
  gapMs: args.gapMs,
  channel: args.channel,
  cpu: os.cpus()[0]?.model?.trim() ?? null,
  logicalCpus: os.cpus().length,
  os: `${os.type()} ${os.release()}`,
  node: process.version,
}

let browser
try {
  browser = await chromium.launch({ channel: args.channel })
} catch (cause) {
  fail(2, `browser channel ${args.channel} could not be started`, { detail: String(cause).slice(0, 300) })
}

const results = []
const notMeasured = []
const doubts = []
try {
  for (const height of args.heights.split(',').map(Number)) {
    for (const doc of args.docs.split(',')) {
      const tag = `[${args.width}x${height}] ${doc}`
      const perNotch = Array.from({ length: args.notches }, () => ({ dispatch: [], cbEnd: [] }))
      const expanders = []
      let withoutFrame = 0
      for (let p = 0; p < args.pages; p += 1) {
        const context = await browser.newContext({ viewport: { width: args.width, height } })
        const page = await context.newPage()
        await page.addInitScript(FRAME_PROBE)
        await page.addInitScript(DISPATCH_PROBE)
        await page.goto(pathToFileURL(BUILD).href)
        await settle(page)
        const before = await expanderCount(page)
        if (doc === 'folded') {
          const at = await page.evaluate((icon) => {
            const e = document.querySelector(`[data-icon="${icon}"]`)
            if (e === null) return null
            const b = e.getBoundingClientRect()
            return b.width === 0 ? null : { x: b.x + b.width / 2, y: b.y + b.height / 2 }
          }, FOLD_ENTRANCE)
          if (at === null) throw new Error(`${tag}: ${FOLD_ENTRANCE} is not on the page`)
          await page.mouse.move(at.x, at.y)
          await page.mouse.down()
          await page.mouse.up()
          await page.waitForTimeout(800)
          await settle(page)
        }
        expanders.push([before, await expanderCount(page)])
        const box = await page.evaluate((s) => {
          const r = document.querySelector(s).getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        }, DRAWN_SVG)
        await page.mouse.move(box.x, box.y)
        await page.mouse.move(box.x + 1, box.y)
        await page.waitForTimeout(800)
        await page.evaluate(() => window.__firstNotchProbe.arm())
        const cdp = await context.newCDPSession(page)
        for (let n = 0; n < args.notches; n += 1) {
          const index = await page.evaluate(() => window.__firstNotchProbe.capture.length)
          await cdp.send('Input.dispatchMouseEvent', {
            type: 'mouseWheel', x: box.x + 1, y: box.y, deltaX: 0, deltaY: -NOTCH_PX, modifiers: CDP_ALT,
          })
          await page.waitForTimeout(args.gapMs)
          const one = await page.evaluate((i) => {
            const s = window.__firstNotchProbe
            const t0 = s.capture[i]
            if (t0 === undefined) return null
            const bubbleAt = s.bubble.find((t) => t >= t0) ?? null
            const after = window.__grsFrameProbe.samples.filter(([, enter]) => enter >= t0)
            let first = null
            for (const [stamp, enter, leave] of after) {
              if (first === null || enter < first.enter) first = { stamp, enter, leave }
            }
            const leaveOfFirst = first === null ? null
              : Math.max(...after.filter(([stamp]) => stamp === first.stamp).map(([, , leave]) => leave))
            return { t0, bubbleAt, leaveOfFirst }
          }, index)
          if (one === null) { notMeasured.push(`${tag} page ${p + 1} notch ${n + 1}: the input did not reach the page`); continue }
          if (one.bubbleAt !== null) perNotch[n].dispatch.push(one.bubbleAt - one.t0)
          if (one.leaveOfFirst === null) withoutFrame += 1
          else perNotch[n].cbEnd.push(one.leaveOfFirst - one.t0)
        }
        await context.close()
      }
      const repeats = { dispatch: [], cbEnd: [] }
      for (const one of perNotch.slice(1)) { repeats.dispatch.push(...one.dispatch); repeats.cbEnd.push(...one.cbEnd) }
      if (doc === 'folded' && expanders.some(([, after]) => after !== 0)) {
        doubts.push(`${tag}: Row Expander count after ${FOLD_ENTRANCE} was ${expanders.map(([, a]) => a).join(',')} (expected 0)`)
      }
      if (withoutFrame > 0) doubts.push(`${tag}: ${withoutFrame} inputs drew no frame`)
      results.push({
        name: tag,
        rowExpandersBeforeAfterFold: expanders,
        firstNotch: { synchronousDispatch: stats(perNotch[0].dispatch), inputToRedrawCallbackEnd: stats(perNotch[0].cbEnd) },
        repeatedNotches: { synchronousDispatch: stats(repeats.dispatch), inputToRedrawCallbackEnd: stats(repeats.cbEnd) },
        perNotchDispatchMedianMs: perNotch.map((one) => round2(median(one.dispatch))),
      })
    }
  }
  conditions.browserVersion = browser.version()
} catch (thrown) {
  notMeasured.push(`the run broke: ${String(thrown?.message ?? thrown).slice(0, 400)}`)
}

const ok = notMeasured.length === 0
process.stdout.write(JSON.stringify({ ok, conditions, results, doubts, notMeasured }, null, 2) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(ok ? 0 : 1)

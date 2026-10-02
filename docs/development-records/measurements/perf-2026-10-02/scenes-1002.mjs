// Supplementary scenes for perf-pending row 34 (CR-605: non-working days shaded every frame). Record only, not the PW-3 gate.
// Same drive and instrument as tools/probe/examples/lm-19-frame-time-baseline.mjs (FRAME_PROBE read from the nfr test),
// display scale 175 (JDG-726), 1920x1080, msedge headless, startup template.
//   node scenes-1002.mjs <dir holding dist/index.html>
// Zoom levels reached from the startup view by single Ctrl+wheel notches (measured with explore.mjs on 1788d297):
//   high = 6 notches in  (deltaY -120): about 100 px per day, one wide weekend run in view
//   low  = 16 notches out (deltaY +120): the farthest-out tier that still shades (yearMonthDayWeekday); notch 17 drops the shade
// Stretches at each level: V (plain wheel, as MK-1) and H (Ctrl+Shift wheel, sideways -- the shaded days move every frame).
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(process.argv[2])
const BUILD = path.join(DIR, 'dist', 'index.html')
const NFR_TEST = path.resolve(HERE, '../../tests/nfr/nfr-002-003-frame-time-is-the-interval.test.ts')
const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
const SAMPLES = 240
const LEVELS = [['high', -120, 6], ['low', 120, 16]]
const probeSource = /const FRAME_PROBE = `([\s\S]*?)`\r?\n/.exec(readFileSync(NFR_TEST, 'utf8'))[1]

const percentile = (v, f) => { const s = [...v].sort((a, b) => a - b); return s[Math.max(1, Math.ceil(f * s.length)) - 1] }
const median = (v) => { const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const r2 = (x) => Math.round(x * 100) / 100

async function settle(page) {
  await page.waitForSelector(DRAWN_SVG, { state: 'attached', timeout: 60000 })
  const read = () => page.evaluate((s) => document.querySelector(s)?.outerHTML ?? null, DRAWN_SVG)
  let prev = await read()
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) { await page.waitForTimeout(250); const now = await read(); if (now !== null && now === prev) return; prev = now }
  throw new Error('drawing still changing after 30s')
}
async function press(page, x, y) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(800) }
async function raiseScale(page, wanted) {
  for (let i = 0; i < 12; i += 1) {
    const at = await page.evaluate(() => { const b = document.querySelector('[data-icon="IC-105"]')?.getBoundingClientRect(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null })
    if (at === null) throw new Error('IC-105 not there')
    await press(page, at.x, at.y)
    const step = Number(/\d+/.exec(await page.evaluate(() => document.querySelector('[data-scale-message]')?.textContent ?? ''))?.[0])
    if (step === wanted) return
    if (step > wanted) break
  }
  throw new Error('scale never read ' + wanted)
}
const census = (page) => page.evaluate((s) => {
  const svg = document.querySelector(s)
  const sh = svg.querySelector('[data-figure="non-working-days"]')
  return { elements: svg.querySelectorAll('*').length, shadeRuns: sh ? (sh.getAttribute('d').match(/M/g) || []).length : 0 }
}, DRAWN_SVG)

const browser = await chromium.launch({ channel: 'msedge' })
const out = { build: createHash('sha256').update(readFileSync(BUILD)).digest('hex').slice(0, 8), dir: path.basename(DIR), stretches: {}, census: {} }
try {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await context.newPage()
  await page.addInitScript(probeSource)
  await page.goto(pathToFileURL(BUILD).href)
  await settle(page)
  await raiseScale(page, 175)
  await page.mouse.move(0, 0)
  await settle(page)
  const box = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, DRAWN_SVG)
  const cdp = await context.newCDPSession(page)
  const burst = (ev) => Promise.all(ev.map((e) => cdp.send('Input.dispatchMouseEvent', e)))
  const wheels = (r, period, delta, modifiers) => Array.from({ length: 24 }, (_u, s) => ({ type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: (r + s) % period < period / 2 ? delta : -delta, modifiers }))
  const mark = (n, e) => page.evaluate(([a, b]) => window.__grsFrameProbe.mark(a, b), [n, e])
  async function stretch(name, step) {
    await mark(name, 'start')
    const start = await page.evaluate(() => window.__grsFrameProbe.marks.at(-1)[2])
    const deadline = Date.now() + 120000
    for (let r = 0; ; r += 1) {
      await step(r)
      const n = await page.evaluate((t) => new Set(window.__grsFrameProbe.samples.filter(([, e]) => e >= t).map(([s]) => s)).size, start)
      if (n >= SAMPLES + 1 || Date.now() > deadline) break
    }
    await mark(name, 'end')
    await page.waitForTimeout(500)
    const raw = await page.evaluate(([n]) => { const p = window.__grsFrameProbe; return { samples: p.samples, s: p.marks.find((m) => m[0] === n && m[1] === 'start')[2], e: p.marks.find((m) => m[0] === n && m[1] === 'end')[2] } }, [name])
    const stamps = [...new Set(raw.samples.filter(([, en]) => en >= raw.s && en <= raw.e).map(([st]) => st))].sort((a, b) => a - b)
    const iv = []
    for (let i = 1; i < stamps.length; i += 1) iv.push(stamps[i] - stamps[i - 1])
    const used = iv.slice(0, SAMPLES)
    out.stretches[name] = { samples: used.length, medianMs: r2(median(used)), p95Ms: r2(percentile(used, 0.95)) }
  }
  // warm-up, thrown away
  for (let i = 0; i < 8; i += 1) await burst([{ type: 'mouseMoved', x: box.x, y: box.y }, { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: 60 }])
  await page.waitForTimeout(500)
  await settle(page)

  const CTRL = 2
  const CTRL_SHIFT = 2 + 8
  for (const [level, delta, notches] of LEVELS) {
    // back to the startup view: reload keeps nothing, so open the build again
    await page.goto(pathToFileURL(BUILD).href)
    await settle(page)
    await raiseScale(page, 175)
    await page.mouse.move(0, 0)
    await settle(page)
    for (let i = 0; i < notches; i += 1) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: delta, modifiers: CTRL }); await page.waitForTimeout(300); await settle(page) }
    out.census[level] = await census(page)
    await stretch(`${level}-V`, (r) => burst(wheels(r, 12, 90, 0)))
    await settle(page)
    await stretch(`${level}-H`, (r) => burst(wheels(r, 12, 90, CTRL_SHIFT)))
    await settle(page)
    out.census[`${level}-after`] = await census(page)
  }
  await context.close()
} catch (e) {
  out.error = String(e?.message ?? e).slice(0, 400)
}
process.stdout.write(JSON.stringify(out) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(0)

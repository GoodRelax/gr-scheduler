// Supplementary scenes for perf-pending rows 31 (CR-602) and 32 (CR-601). Record only, not the PW-3 gate.
// Same drive and instrument as tools/probe/examples/lm-19-frame-time-baseline.mjs (FRAME_PROBE read from the nfr test),
// display scale 175 (JDG-726), 1920x1080, msedge headless, startup template.
//   node scenes.mjs <dir holding dist/index.html>
// Stretches:
//   V-plain      plain wheel, vertical (as MK-1), nothing marked
//   V-landing    the same, after one click on a continuation mark (CR-601: the mark stays while the view moves)
//   H-plain      Ctrl+Shift wheel, sideways (MK-5), nothing selected
//   H-selected   the same, after one click on a dependency line (CR-602: the selected line and its end outlines)
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
  return {
    elements: svg.querySelectorAll('*').length,
    outlines: svg.querySelectorAll('[data-figure*="end-outline"],[data-figure*="-around"]').length,
    deps: svg.querySelectorAll('polyline[data-figure^="dep-"]').length,
  }
}, DRAWN_SVG)

const ink = (page, key) => page.evaluate(([s, k]) => {
  const p = [...document.querySelectorAll(`${s} polyline[stroke-width]`)].findLast((e) => e.getAttribute('data-figure') === k)
  return p ? `${p.getAttribute('stroke')}@${p.getAttribute('stroke-width')}` : 'absent'
}, [DRAWN_SVG, key])

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
  const box = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, l: r.x, t: r.y, w: r.width, h: r.height } }, DRAWN_SVG)
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

  const CTRL_SHIFT = 2 + 8
  out.census.before = await census(page)
  await stretch('V-plain', (r) => burst(wheels(r, 12, 90, 0)))

  // Selection: click the middle of the longest segment of one dependency line inside the canvas.
  const seg = await page.evaluate((b) => {
    let best = null
    for (const p of document.querySelectorAll('[data-role="Schedule Canvas"] svg polyline[data-figure^="dep-"][stroke-width]')) {
      const m = p.getScreenCTM(); if (!m) continue
      const pts = p.getAttribute('points').trim().split(/\s+/).map((s) => s.split(',').map(Number)).map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }))
      for (let i = 1; i < pts.length; i += 1) {
        const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
        const x = (pts[i].x + pts[i - 1].x) / 2; const y = (pts[i].y + pts[i - 1].y) / 2
        if (x > b.l + 40 && x < b.l + b.w - 40 && y > b.t + 60 && y < b.t + b.h - 40 && (best === null || len > best.len)) best = { x, y, len, key: p.getAttribute('data-figure') }
      }
    }
    return best
  }, box)
  out.census.segment = seg
  if (seg !== null) {
    const pre = await census(page)
    out.census.inkBeforeSelect = await ink(page, seg.key)
    await press(page, seg.x, seg.y)
    await page.mouse.move(box.x, box.y)
    await settle(page)
    out.census.preSelect = pre
    out.census.selected = await census(page)
    out.census.inkSelected = await ink(page, seg.key)
    out.census.emphasisedAfterSelect = await page.evaluate((sv) => [...document.querySelectorAll(`${sv} polyline[data-figure^="dep-"][stroke-width]`)].filter((e) => e.getAttribute('stroke') !== '#ffffff' && Number(e.getAttribute('stroke-width')) > 3).map((e) => e.getAttribute('data-figure')), DRAWN_SVG)
    await stretch('H-selected', (r) => burst(wheels(r, 12, 90, CTRL_SHIFT)))
    await settle(page)
    out.census.afterSelectedScroll = await census(page)
    out.census.inkAfterSelectedScroll = await ink(page, seg.key)
    out.census.emphasisedAfterSelectedScroll = await page.evaluate((sv) => [...document.querySelectorAll(`${sv} polyline[data-figure^="dep-"][stroke-width]`)].filter((e) => e.getAttribute('stroke') !== '#ffffff' && Number(e.getAttribute('stroke-width')) > 3).map((e) => e.getAttribute('data-figure')), DRAWN_SVG)
    await page.keyboard.press('Escape'); await page.waitForTimeout(600); await settle(page)
    out.census.afterEscape = await census(page)
  }
  // Landing mark: click one continuation dot inside the canvas.
  await settle(page)
  const dot = await page.evaluate((b) => {
    for (const c of document.querySelectorAll('[data-role="Schedule Canvas"] svg circle[data-figure^="dep-"]')) {
      const r = c.getBoundingClientRect(); const x = r.x + r.width / 2; const y = r.y + r.height / 2
      if (x > b.l + 40 && x < b.l + b.w - 40 && y > b.t + 60 && y < b.t + b.h - 40) return { x, y, key: c.getAttribute('data-figure') }
    }
    return null
  }, box)
  out.census.dot = dot
  if (dot !== null) {
    out.census.inkBeforeLanding = await ink(page, dot.key)
    await press(page, dot.x, dot.y)
    await page.mouse.move(box.x, box.y)
    await settle(page)
    out.census.landed = await census(page)
    out.census.inkLanded = await ink(page, dot.key)
    await stretch('V-landing', (r) => burst(wheels(r, 12, 90, 0)))
    await settle(page)
    out.census.afterLandingScroll = await census(page)
    out.census.inkAfterLandingScroll = await ink(page, dot.key)
  }

  await page.keyboard.press('Escape'); await page.waitForTimeout(600); await settle(page)
  await stretch('H-plain', (r) => burst(wheels(r, 12, 90, CTRL_SHIFT)))
  await context.close()
} catch (e) {
  out.error = String(e?.message ?? e).slice(0, 400)
}
process.stdout.write(JSON.stringify(out) + '\n')
await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 10000))])
process.exit(0)

// Sweeps sample 71 with Edge (Playwright) and prints which grab answers where.
// Run from this folder:  PLAYWRIGHT=<path to playwright/index.mjs> node sweep.mjs [shot.png]

import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const playwrightPath = process.env.PLAYWRIGHT ?? join(here, '..', '..', 'node_modules', 'playwright', 'index.mjs')
const { chromium } = await import(pathToFileURL(playwrightPath).href)

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(pathToFileURL(join(here, 'dependency-lines-and-grab-sample.html')).href)
await page.waitForFunction(() => window.sampleAnswerAt !== undefined)

const shot = process.argv[2]
const mode = process.argv[3] ?? 'hit'

// One row of grabs along x at height y: runs of "grab item" with their x ranges.
const runsAt = (y, x0, x1, stepPx) => page.evaluate(({ y, x0, x1, stepPx }) => {
  const runs = []
  for (let x = x0; x <= x1 + 1e-9; x += stepPx) {
    const hit = window.sampleAnswerAt(x, y)
    const key = hit === null ? '-' : `${hit.grab} ${hit.item}`
    const last = runs[runs.length - 1]
    if (last && last.key === key) last.to = x
    else runs.push({ key, from: x, to: x })
  }
  return runs.map((r) => `${r.from.toFixed(1)}..${r.to.toFixed(1)} ${r.key}`)
}, { y, x0, x1, stepPx })

if (mode === 'hit') {
  for (const variant of ['shipped', 'endsFirst']) {
    await page.evaluate((v) => window.sampleSet({ scene: 'hit', variant: v, separate: 'none', paint: true, magnify: 1 }), variant)
    const tasks = await page.evaluate(() => window.sampleTasks().map((t) => {
      const pts = t.plan && t.plan.points ? t.plan.points : []
      const xs = pts.map((q) => q.x), ys = pts.map((q) => q.y)
      const plan = pts.length === 0 ? null : { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
      return { uid: t.taskUid, plan, marker: t.marker }
    }))
    const counts = await page.evaluate(() => window.sampleCounts)
    console.log(`\n== ${variant}  area(px^2): ${JSON.stringify(counts)}`)
    for (const uid of [1, 3, 4, 6, 7]) {
      const t = tasks.find((one) => one.uid === uid)
      if (!t || !t.plan) continue
      const b = t.plan
      const right = b.x + b.width
      if (t.marker) console.log(`  marker center ${t.marker.center.x.toFixed(1)},${t.marker.center.y.toFixed(1)} r=${t.marker.radius.toFixed(1)}`)
      console.log(`task ${uid} plan x=${b.x.toFixed(1)}..${right.toFixed(1)} y=${b.y.toFixed(1)}..${(b.y + b.height).toFixed(1)}`)
      for (const frac of [0.15, 0.5, 0.85]) {
        const y = b.y + b.height * frac
        console.log(`  y=${y.toFixed(1)} finish side: ${(await runsAt(y, right - 4, right + 16, 0.5)).join(' | ')}`)
      }
      for (const frac of [0.15, 0.5, 0.85]) {
        const y = b.y + b.height * frac
        console.log(`  y=${y.toFixed(1)} start side: ${(await runsAt(y, b.x - 16, b.x + 4, 0.5)).join(' | ')}`)
      }
    }
  }
}
if (mode === 'overlap') {
  for (const separate of ['none', 'shift', 'corridor']) {
    await page.evaluate((s) => window.sampleSet({ scene: 'overlap', separate: s, variant: 'shipped', paint: false, magnify: 1 }), separate)
    const lines = await page.evaluate(() => window.sampleLines().map((l) => ({
      p: l.predecessorUid, s: l.successorUid, pattern: l.pattern, pts: l.points.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' '),
    })))
    console.log(`\n== separate=${separate}`)
    for (const l of lines) console.log(`${l.p}->${l.s} ${l.pattern}: ${l.pts}`)
  }
}
if (shot) await page.screenshot({ path: shot })
console.log(errors.length === 0 ? 'no page errors' : `page errors: ${errors.join(' / ')}`)
await browser.close()

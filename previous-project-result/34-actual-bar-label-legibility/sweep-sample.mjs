// Sweep actual-bar-label-sample.html: for every option x display scale x theme, screenshot the
// first task's label where it lies on the actual bar, and count what reached the screen.
// The same count is taken on the shipped build (dist/index.html) so the sample can be checked
// against the app. Playwright resolves from the repository root's node_modules (Node walks up).
// Run from the repository root:  node previous-project-result/34-actual-bar-label-legibility/sweep-sample.mjs
// Writes: shot-*.png next to this file, and the table on stdout (pasted into README.md).
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const sampleUrl = pathToFileURL(join(here, 'actual-bar-label-sample.html')).href
const appUrl = pathToFileURL(resolve('dist', 'index.html')).href

let browser
try {
  browser = await chromium.launch({ channel: 'msedge' })
} catch {
  browser = await chromium.launch()
}

// Decode a PNG in a blank page and return the luminance stats of every pixel.
const decoder = await (await browser.newContext()).newPage()
async function statsOf(png, barHex) {
  return decoder.evaluate(async ({ b64, barHex }) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const cv = document.createElement('canvas')
    cv.width = img.width; cv.height = img.height
    const g = cv.getContext('2d')
    g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, cv.width, cv.height).data
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b)
    const ls = []
    for (let i = 0; i < d.length; i += 4) ls.push(lum(d[i], d[i + 1], d[i + 2]))
    ls.sort((a, b) => a - b)
    const n = parseInt(barHex.slice(1), 16)
    const bar = lum(n >> 16, (n >> 8) & 255, n & 255)
    const cr = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    const p = (q) => ls[Math.min(ls.length - 1, Math.floor(ls.length * q))]
    const dark = p(0.02), light = p(0.98)
    // WHY: the share of the label's area painted at least 2 : 1 away from the bar, on each side --
    // the halo's footprint is the lighter share in the light theme and the darker share in the dark one.
    const lighter = ls.filter((x) => x > bar && cr(x, bar) >= 2).length / ls.length
    const darker = ls.filter((x) => x < bar && cr(x, bar) >= 2).length / ls.length
    return { n: ls.length, darkVsBar: cr(dark, bar), lightVsBar: cr(light, bar), range: cr(dark, light), lighter, darker }
  }, { b64: png.toString('base64'), barHex })
}

// The region: the label's box cut to the actual bar's inside (the bar's outline excluded).
async function regionOf(tab, labelSel, barSel) {
  return tab.evaluate(({ labelSel, barSel }) => {
    const l = document.querySelector(labelSel).getBoundingClientRect()
    const b = document.querySelector(barSel).getBoundingClientRect()
    const inset = 1
    const x1 = Math.max(l.x, b.x + inset), x2 = Math.min(l.x + l.width, b.x + b.width - inset)
    const y1 = Math.max(l.y, b.y + inset), y2 = Math.min(l.y + l.height, b.y + b.height - inset)
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
  }, { labelSel, barSel })
}

const fmt = (x) => x.toFixed(2)
const rows = []
let appLabel = null

// 1) the shipped build, light and dark, at display scale 100
for (const scheme of ['light', 'dark']) {
  for (const dsf of [1, 2]) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme: scheme, deviceScaleFactor: dsf })
    const tab = await ctx.newPage()
    await tab.goto(appUrl)
    await tab.waitForTimeout(2000)
    // WHY: the first label lying wholly on its actual bar that nothing covers -- the palette's
    // translucent panel sits over the top rows, and a label under it reads paler than the app draws.
    const task = await tab.evaluate(() => {
      for (const l of document.querySelectorAll('text[data-figure$="-label"]')) {
        const key = l.getAttribute('data-figure').replace(/-label$/, '')
        const bar = document.querySelector(`[data-figure="${key}-actual"]`)
        if (bar === null) continue
        const a = l.getBoundingClientRect(), b = bar.getBoundingClientRect()
        if (a.x < b.x || a.x + a.width > b.x + b.width || a.width < 60) continue
        const top = document.elementFromPoint(a.x + a.width / 2, a.y + a.height / 2)
        if (top === l || top === bar) return key
      }
      return null
    })
    const clip = await regionOf(tab, `[data-figure="${task}-label"]`, `[data-figure="${task}-actual"]`)
    const barHex = scheme === 'light' ? '#21508c' : '#6a9cdc'
    const s = await statsOf(await tab.screenshot({ clip }), barHex)
    rows.push([`app (dist) ${task}`, scheme, `x${dsf}`, 100, s])
    appLabel = await tab.locator(`[data-figure="${task}-label"]`).textContent()
    if (dsf === 2) {
      const lb = await tab.locator(`[data-figure="${task}-label"]`).boundingBox()
      await tab.screenshot({ path: join(here, `shot-app-${scheme}-x2.png`),
        clip: { x: lb.x - 40, y: lb.y - 10, width: lb.width + 80, height: lb.height + 20 } })
    }
    await ctx.close()
  }
}

// 1b) calibration: the sample's current values drawing the app's own label text
for (const scheme of ['light', 'dark']) {
  for (const dsf of [1, 2]) {
    const ctx = await browser.newContext({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: dsf })
    const tab = await ctx.newPage()
    await tab.goto(`${sampleUrl}?theme=${scheme}&label0=${encodeURIComponent(appLabel)}`)
    await tab.waitForTimeout(500)
    const cell = 'tr[data-option="now"] td[data-scale="100"]'
    const clip = await regionOf(tab, `${cell} [data-label="0"]`, `${cell} [data-actual="0"]`)
    const s = await statsOf(await tab.screenshot({ clip }), scheme === 'light' ? '#21508c' : '#6a9cdc')
    rows.push([`sample now, "${appLabel}"`, scheme, `x${dsf}`, 100, s])
    await ctx.close()
  }
}

// 2) the sample: every option x scale x theme
for (const scheme of ['light', 'dark']) {
  for (const dsf of [1, 2]) {
    const ctx = await browser.newContext({ viewport: { width: 2400, height: 2400 }, deviceScaleFactor: dsf })
    const tab = await ctx.newPage()
    await tab.goto(`${sampleUrl}?theme=${scheme}`)
    await tab.waitForTimeout(500)
    const meta = await tab.evaluate(() => window.sample.OPTIONS.filter((o) => o.id !== 'mine').map((o) => {
      const c = window.sample.coloursOf(window.sample.valuesOf(o))
      return { id: o.id, bar: '#' + c.actual.map((v) => v.toString(16).padStart(2, '0')).join('') }
    }))
    for (const m of meta) {
      for (const scale of [50, 75, 100, 150, 200]) {
        const cell = `tr[data-option="${m.id}"] td[data-scale="${scale}"]`
        const clip = await regionOf(tab, `${cell} [data-label="0"]`, `${cell} [data-actual="0"]`)
        if (clip.width < 2 || clip.height < 2) continue
        const s = await statsOf(await tab.screenshot({ clip }), m.bar)
        rows.push([m.id, scheme, `x${dsf}`, scale, s])
      }
    }
    if (dsf === 1) {
      await tab.screenshot({ path: join(here, `shot-sample-${scheme}-x1.png`), fullPage: true })
    } else {
      // WHY: a close look at display scale 100 for every option, the default the user sees.
      const box = await tab.evaluate(() => {
        const cells = [...document.querySelectorAll('td[data-scale="100"]')]
        const r = cells.map((c) => c.getBoundingClientRect())
        const names = [...document.querySelectorAll('td.optname')].map((c) => c.getBoundingClientRect())
        return { x: names[0].x, y: r[0].y, width: r[0].x + r[0].width - names[0].x, height: r[r.length - 1].y + r[r.length - 1].height - r[0].y }
      })
      await tab.screenshot({ path: join(here, `shot-sample-${scheme}-x2-scale100.png`), clip: box })
    }
    await ctx.close()
  }
}
await browser.close()

console.log('| source | theme | dsf | scale | dark p2 : bar | light p98 : bar | dark p2 : light p98 | lighter share | darker share | pixels |')
console.log('|---|---|---|---|---|---|---|---|---|---|')
for (const [src, scheme, dsf, scale, s] of rows) {
  console.log(`| ${src} | ${scheme} | ${dsf} | ${scale} | ${fmt(s.darkVsBar)} | ${fmt(s.lightVsBar)} | ${fmt(s.range)} | ${(s.lighter * 100).toFixed(0)}% | ${(s.darker * 100).toFixed(0)}% | ${s.n} |`)
}

// Shoot the shipped build with custom fill colours, light and dark, and read the drawn fills.
// Usage: node previous-project-result/17-custom-actual-fill/shoot-shipped-build.mjs [outDir]
// Writes the patched copies and screenshots to outDir (default scratch/cv6, gitignored).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '../..')
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'scratch', 'cv6'))
fs.mkdirSync(OUT, { recursive: true })
const COLOURS = ['#2a9d8f', '#1d3557', '#e63946', '#f4a261', '#a8dadc', '#808080', '#ffd6e0', '#6a4c93']

const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8')
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/framework/single-html-shell/startup-template.json'), 'utf8'))
const s = doc.schedule
const byUid = new Map(s.taskVisuals.map((v) => [v.taskUid, v]))
const picked = s.tasks.filter((t) => !t.milestone).slice(0, 24)
picked.forEach((t, i) => {
  const colour = `${COLOURS[i % COLOURS.length]}/`
  let v = byUid.get(t.uid)
  if (v === undefined) {
    v = { taskUid: t.uid, shapeKind: 'rectangle', milestoneGlyph: null, fillColor: null, strokeColor: null, lineWeight: null }
    s.taskVisuals.push(v)
  }
  v.fillColor = colour
})

const browser = await chromium.launch()
for (const theme of ['light', 'dark']) {
  doc.documentSettings.themePreference = theme
  const embedded = `<script type="application/json" id="embedded-document">${JSON.stringify(doc).replace(/</g, '\\u003c')}</script>`
  const file = path.join(OUT, `app-${theme}.html`)
  fs.writeFileSync(file, html.replace('</head>', `${embedded}</head>`))
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  const tab = await context.newPage()
  await tab.goto('file://' + file.split(path.sep).join('/'))
  await tab.waitForTimeout(2500)
  await tab.screenshot({ path: path.join(OUT, `shot-${theme}.png`) })
  const fills = await tab.evaluate(() => {
    const seen = {}
    for (const el of document.querySelectorAll('svg rect, svg path, svg polygon')) {
      const f = el.getAttribute('fill') ?? el.style.fill
      if (f && /hsl|#/.test(f)) seen[f] = (seen[f] ?? 0) + 1
    }
    return seen
  })
  console.log(theme, JSON.stringify(fills))
  await context.close()
}
await browser.close()

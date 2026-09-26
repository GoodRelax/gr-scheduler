// Count svg writes and DOM mutations outside the canvas svg during 60 plain wheel notches (no timing).
import { chromium } from 'playwright'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const browser = await chromium.launch({ channel: 'msedge' })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage()
await page.goto(pathToFileURL(path.resolve(process.env.TREE, 'dist', 'index.html')).href)
await page.waitForSelector('[data-role="Schedule Canvas"] svg', { state: 'attached', timeout: 60000 })
await page.waitForTimeout(2500)
await page.evaluate(() => {
  const w = (window.__m = { svgWrites: 0, outside: {}, frames: 0, svgs: [] })
  const canvas = document.querySelector('[data-role="Schedule Canvas"]')
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.target === canvas && m.type === 'childList') { w.svgWrites++; continue }
      if (canvas.contains(m.target)) continue
      const el = m.target.nodeType === 1 ? m.target : m.target.parentElement
      const k = `${m.type}:${m.attributeName ?? ''}:${el?.getAttribute?.('data-role') ?? el?.tagName}`
      w.outside[k] = (w.outside[k] ?? 0) + 1
    }
  }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true })
  const tick = () => { w.frames++; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
})
const box = await page.evaluate(() => { const r = document.querySelector('[data-role="Schedule Canvas"] svg').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
await page.mouse.move(box.x, box.y)
for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, i % 24 < 12 ? 90 : -90); await page.waitForTimeout(30) }
await page.waitForTimeout(800)
const out = await page.evaluate(() => {
  const s = document.querySelector('[data-role="Schedule Canvas"] svg')
  return { ...window.__m, masked: s.querySelectorAll('[mask]').length, maskRects: s.querySelectorAll('mask rect').length,
    maskBoxes: [...s.querySelectorAll('mask rect')].slice(0, 3).map((r) => r.outerHTML) }
})
console.log(JSON.stringify(out, null, 1))
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))])
process.exit(0)

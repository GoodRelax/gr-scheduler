// Screenshot sweep for the identity proof (no timing). TREE, OUTDIR, DPR, W, H from env.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const out = process.env.OUTDIR; mkdirSync(out, { recursive: true })
const W = +process.env.W, H = +process.env.H, DPR = +process.env.DPR
const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
const page = await context.newPage()
await page.clock.setFixedTime(new Date('2026-09-18T03:00:00Z'))
await page.goto(pathToFileURL(path.resolve(process.env.TREE, 'dist', 'index.html')).href)
await page.waitForSelector('[data-role="Schedule Canvas"] svg', { state: 'attached', timeout: 60000 })
const SEL = '[data-role="Schedule Canvas"] svg'
const blank = await context.newPage()
await blank.setContent('<html><body></body></html>')
const stable = async () => {
  let last = ''
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250)
    const now = await page.evaluate((s) => document.querySelector(s).outerHTML, SEL)
    if (now === last) return now
    last = now
  }
  return last
}
const box = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, SEL)
const park = () => page.mouse.move(W - 2, H - 2)
const wheel = async (dy, mod) => {
  await page.mouse.move(box.x, box.y)
  if (mod) await page.keyboard.down(mod)
  await page.mouse.wheel(0, dy)
  if (mod) await page.keyboard.up(mod)
  await park()
}
const steps = [['start', async () => {}]]
for (let i = 0; i < 5; i++) steps.push([`down${i}`, () => wheel(150)])
for (let i = 0; i < 2; i++) steps.push([`up${i}`, () => wheel(-150)])
for (let i = 0; i < 4; i++) steps.push([`ctrlin${i}`, () => wheel(-100, 'Control')])
for (let i = 0; i < 6; i++) steps.push([`ctrlout${i}`, () => wheel(100, 'Control')])
for (let i = 0; i < 3; i++) steps.push([`altin${i}`, () => wheel(-100, 'Alt')])
for (let i = 0; i < 3; i++) steps.push([`shift${i}`, () => wheel(200, 'Shift')])
await park()
for (const [name, act] of steps) {
  await act()
  const svg = await stable()
  await page.screenshot({ path: path.join(out, `${name}-screen.png`) })
  const raster = await blank.evaluate(async ({ svg, dpr }) => {
    const img = new Image()
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url })
    const c = document.createElement('canvas'); c.width = img.width * dpr; c.height = img.height * dpr
    const g = c.getContext('2d'); g.scale(dpr, dpr); g.drawImage(img, 0, 0)
    return c.toDataURL('image/png')
  }, { svg, dpr: DPR })
  writeFileSync(path.join(out, `${name}-image.png`), Buffer.from(raster.split(',')[1], 'base64'))
  writeFileSync(path.join(out, `${name}.svg`), svg)
}
await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 8000))])
process.exit(0)

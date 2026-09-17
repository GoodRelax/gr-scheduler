// Count what the Schedule Canvas draws on open, by tag and data-role, optionally after N IC-105 presses.
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const TREE = path.resolve(process.argv[2])
const PRESSES = Number(process.argv[3] ?? 0)
const { chromium } = createRequire(path.join(TREE, 'package.json'))('playwright')
const browser = await chromium.launch({ channel: 'msedge' })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage()
await page.goto(pathToFileURL(path.join(TREE, 'dist', 'index.html')).href)
await page.waitForSelector('[data-role="Schedule Canvas"] svg', { state: 'attached', timeout: 60000 })
await page.waitForTimeout(3000)
for (let i = 0; i < PRESSES; i += 1) {
  const at = await page.evaluate(() => {
    const b = document.querySelector('[data-icon="IC-105"]')?.getBoundingClientRect()
    return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null
  })
  if (!at) break
  await page.mouse.click(at.x, at.y)
  await page.waitForTimeout(1200)
}
const out = await page.evaluate(() => {
  const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
  const tags = {}
  const roles = {}
  for (const e of svg.querySelectorAll('*')) {
    tags[e.tagName] = (tags[e.tagName] ?? 0) + 1
    const r = e.getAttribute('data-role')
    if (r) roles[r] = (roles[r] ?? 0) + 1
  }
  return { total: svg.querySelectorAll('*').length, allDom: document.querySelectorAll('*').length, tags, roles,
    rowTitles: document.querySelectorAll('[data-group-id]').length }
})
console.log(JSON.stringify({ tree: path.basename(TREE), presses: PRESSES, ...out }))
await browser.close()

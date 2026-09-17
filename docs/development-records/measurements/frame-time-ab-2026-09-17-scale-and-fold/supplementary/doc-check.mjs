// Read what document and display scale a built tree opens with, and what IC-78 folds it to.
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const TREE = path.resolve(process.argv[2])
const HEIGHT = Number(process.argv[3] ?? 1080)
const { chromium } = createRequire(path.join(TREE, 'package.json'))('playwright')
const browser = await chromium.launch({ channel: 'msedge' })
const context = await browser.newContext({ viewport: { width: 1920, height: HEIGHT } })
const page = await context.newPage()
await page.goto(pathToFileURL(path.join(TREE, 'dist', 'index.html')).href)
await page.waitForSelector('[data-role="Schedule Canvas"] svg', { state: 'attached', timeout: 60000 })
await page.waitForTimeout(3000)

async function press(icon) {
  const at = await page.evaluate((w) => {
    const e = document.querySelector(`[data-icon="${w}"]`)
    if (e === null) return null
    const b = e.getBoundingClientRect()
    return b.width === 0 ? null : { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(1500)
  return true
}

const snap = () => page.evaluate(() => ({
  rowExpanders: document.querySelectorAll('[data-role="Row Expander"]').length,
  groupElements: document.querySelectorAll('[data-group-id]').length,
  svgElements: document.querySelectorAll('[data-role="Schedule Canvas"] svg *').length,
  scaleButtons: ['IC-104', 'IC-105'].map((i) => document.querySelector(`[data-icon="${i}"]`) !== null),
}))
const out = { tree: path.basename(TREE), height: HEIGHT, onOpen: await snap() }
const docOf = () => page.evaluate(() => {
  const d = window.grSchedulerAgentApi?.readDocument?.()
  if (!d) return null
  const s = d.documentSettings ?? d.settings ?? {}
  return {
    tasks: d.schedule?.tasks?.length,
    taskGroups: d.taskGroups?.length ?? d.schedule?.taskGroups?.length,
    displayScale: s.displayScale,
    zoomX: s.zoomX, zoomY: s.zoomY,
    settingsKeys: Object.keys(s).join(','),
  }
})
out.folded = { pressed: await press('IC-78'), ...(await snap()) }
out.agentApiOpened = await press('IC-20')
out.documentAfterFold = await docOf()
await browser.close()
console.log(JSON.stringify(out, null, 1))

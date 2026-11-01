// Exports the built GRS (dist/index.html) under a REAL browser zoom times an OS-DPI stand-in, in Edge,
// and reports the export ratio, the picture size and hashes of the picture without its watermark layer.
// Run from the repository root:
//   PLAYWRIGHT=<path to playwright/index.mjs> node studies/78-scaling-strategy/sweep-app-export.mjs > result.json
// Optional: FIXED=1 fixes the fit span first (isFitSpanFixed), SAVE=<folder> writes each exported PNG.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT).href)
const APP = pathToFileURL(resolve('dist/index.html')).href
const DOCUMENT = resolve('sample-schedule/sample-small-website-renewal.en.xml')
// WHY: the file pickers are stubbed the way the use-case tests do it, so a document opens headless.
const HARNESS = readFileSync(resolve('tests/use-case/uc-harness.ts'), 'utf8')
const HOST_STUB = /const HOST_STUB = `([\s\S]*?)`\n/.exec(HARNESS)[1]
const FIXED = process.env.FIXED === '1'
// w x h are the monitor's physical pixels; the window fills it (w / osDpi DIP wide).
const CASES = [
  ...[0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2].map((z) => ({ d: 1, z, w: 1920, h: 1080 })),
  { d: 1.25, z: 0.8, w: 1920, h: 1080 }, { d: 1.25, z: 1, w: 1920, h: 1080 },
  { d: 1.5, z: 1, w: 2880, h: 1620 }, { d: 2, z: 1, w: 3840, h: 2160 }, { d: 1.5, z: 1, w: 3840, h: 2160 },
  { d: 1, z: 1, w: 1280, h: 720 },
]

const hex6 = async (bytes) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
  .slice(0, 6).map((b) => b.toString(16).padStart(2, '0')).join('')

async function exportOnce(page) {
  return page.evaluate(async () => {
    const api = window.grSchedulerAgentApi
    const svg = api.exportSvg().value
    // Drop the watermark layer (table T-020 ZO-12): it carries the opener and the time.
    const at = svg.indexOf('<g data-zo="ZO-12">')
    let bare = svg
    if (at >= 0) {
      const tags = /<g[\s>]|<\/g>/g
      tags.lastIndex = at
      let depth = 0
      for (let m; (m = tags.exec(svg));) {
        depth += m[0] === '</g>' ? -1 : 1
        if (depth === 0) { bare = svg.slice(0, at) + svg.slice(tags.lastIndex); break }
      }
    }
    const size = /<svg[^>]*width="([0-9.]+)"[^>]*height="([0-9.]+)"/.exec(bare)
    const image = new Image()
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(bare)
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Number(size[1]); canvas.height = Number(size[2])
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    const png = (await api.exportPng()).value
    const shrink = /<g transform="scale\(([0-9.e-]+)\)">/.exec(svg)
    return {
      dpr: devicePixelRatio, innerW: innerWidth, innerH: innerHeight, ratio: shrink ? Number(shrink[1]) : null,
      svgW: Number(size[1]), svgH: Number(size[2]), bare,
      raster: Array.from(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data),
      pngBase64: btoa(Array.from(png, (b) => String.fromCharCode(b)).join('')),
    }
  })
}

const rows = []
for (const c of CASES) {
  const profile = mkdtempSync(join(tmpdir(), 'grs-study78-'))
  mkdirSync(join(profile, 'Default'))
  writeFileSync(join(profile, 'Default', 'Preferences'),
    JSON.stringify({ partition: { default_zoom_level: { x: Math.log(c.z) / Math.log(1.2) } } }))
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'msedge', headless: true, viewport: null,
    args: ['--force-device-scale-factor=' + c.d, `--window-size=${Math.round(c.w / c.d)},${Math.round(c.h / c.d)}`],
  })
  await context.addInitScript(HOST_STUB)
  const page = context.pages()[0] ?? await context.newPage()
  await page.goto(APP)
  await page.waitForSelector('[data-role="Schedule Canvas"]')
  await page.waitForTimeout(1500)
  await page.evaluate((text) => { window.__grsNextOpen = { name: 'sample-small-website-renewal.en.xml', text } }, readFileSync(DOCUMENT, 'utf8'))
  await page.click('[data-icon="IC-1"]')
  await page.waitForTimeout(500)
  if (await page.locator('[data-icon="IC-71"]').count()) await page.click('[data-icon="IC-71"]')
  const proceed = page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]')
  if (await proceed.count()) await proceed.click()
  await page.waitForTimeout(1500)
  await page.click('[data-icon="IC-20"]')
  await page.waitForFunction(() => typeof window.grSchedulerAgentApi === 'object')
  if (FIXED) {
    await page.evaluate(() => {
      const api = window.grSchedulerAgentApi
      const tasks = api.readDocument().schedule.tasks
      const starts = tasks.map((t) => t.start).sort(), finishes = tasks.map((t) => t.finish).sort()
      return api.applyCommands({ expectedStamp: api.readStamp(), commands: [{ kind: 'setFitSpanFixed', isFitSpanFixed: true,
        shownStart: starts[0].slice(0, 10), shownFinish: finishes[finishes.length - 1].slice(0, 10) }] })
    })
  } else {
    await page.click('[data-icon="IC-10"]')
  }
  await page.waitForTimeout(800)
  const one = await exportOnce(page)
  if (process.env.SAVE) writeFileSync(join(process.env.SAVE, `export-d${c.d}-z${c.z}-w${c.w}${FIXED ? '-fixed' : ''}.png`), Buffer.from(one.pngBase64, 'base64'))
  rows.push({ ...c, dpr: one.dpr, innerW: one.innerW, innerH: one.innerH, ratio: one.ratio, svgW: one.svgW, svgH: one.svgH,
    svgHash: await hex6(new TextEncoder().encode(one.bare)), rasterHash: await hex6(new Uint8Array(one.raster)) })
  await context.close()
}
console.log(JSON.stringify(rows, null, 1))

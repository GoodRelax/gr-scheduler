// Measures what a page can read under a REAL browser zoom (the profile's default zoom level)
// times an OS-DPI stand-in (--force-device-scale-factor), in Edge.
// Run from this folder:  PLAYWRIGHT=<path to playwright/index.mjs> node sweep-browser-zoom.mjs > result.json
// Optional: DPIS=1,1.25,1.5,2 (OS scale factors), HEADED=1 (a visible window; it flashes on the screen).

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT).href)

const PAGE = `<!doctype html><meta charset=utf-8><body style="margin:0"><script>
window.probe = () => ({ dpr: devicePixelRatio, innerW: innerWidth, innerH: innerHeight, outerW: outerWidth, outerH: outerHeight,
  screenW: screen.width, vvScale: visualViewport.scale,
  res: [0.5,0.67,0.75,0.8,0.9,1,1.1,1.25,1.5,1.75,2,2.5,3,3.5,4].filter(r => matchMedia('(resolution: '+r+'dppx)').matches),
  outerOverInner: +(outerWidth / innerWidth).toFixed(4) })
</script>`
const ZOOMS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2]
const DPIS = (process.env.DPIS ?? '1,1.25,1.5,2').split(',').map(Number)

const file = join(tmpdir(), 'grs-study78-probe.html')
writeFileSync(file, PAGE)
const rows = []
for (const osDpi of DPIS) {
  for (const zoom of ZOOMS) {
    // WHY: Chromium keeps the default zoom as log base 1.2 of the factor under partition.default_zoom_level.x.
    const profile = mkdtempSync(join(tmpdir(), 'grs-study78-'))
    mkdirSync(join(profile, 'Default'))
    writeFileSync(join(profile, 'Default', 'Preferences'),
      JSON.stringify({ partition: { default_zoom_level: { x: Math.log(zoom) / Math.log(1.2) } } }))
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'msedge', headless: !process.env.HEADED, viewport: null,
      args: ['--force-device-scale-factor=' + osDpi, '--window-size=1280,800'],
    })
    const page = context.pages()[0] ?? await context.newPage()
    await page.goto(pathToFileURL(file).href)
    rows.push({ osDpi, zoom, headed: Boolean(process.env.HEADED), ...(await page.evaluate(() => window.probe())) })
    await context.close()
  }
}
console.log(JSON.stringify(rows, null, 1))

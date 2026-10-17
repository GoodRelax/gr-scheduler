// Size of the drawn picture each build writes into the page on its first screen, the 1000-Task
// startup document of the frame-time file, unedited and untouched.
// Usage (from the worktree root): node <this file> <worktree>/scratch/perf/<sha> ...
// Each argument is a git-archive copy built by setup.sh. Prints one line per copy:
// characters of the svg's outerHTML, element count, and the count per element name.
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(join(process.cwd(), '..', '..', '..', 'package.json'))
const { chromium } = require('@playwright/test')

const DRAWN_SVG = '[data-role="Schedule Canvas"] svg'
const browser = await chromium.launch({ channel: 'msedge' })
for (const copy of process.argv.slice(2)) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(pathToFileURL(resolve(copy, 'dist', 'index.html')).href)
  await page.waitForSelector(DRAWN_SVG)
  await page.waitForTimeout(1500)
  const seen = await page.evaluate((selector) => {
    const svg = document.querySelector(selector)
    const names = {}
    for (const one of svg.querySelectorAll('*')) names[one.localName] = (names[one.localName] ?? 0) + 1
    return { characters: svg.outerHTML.length, elements: svg.querySelectorAll('*').length, names }
  }, DRAWN_SVG)
  console.log(copy.split(/[\\/]/).pop(), seen.characters, seen.elements, JSON.stringify(seen.names))
  await page.close()
}
await browser.close()

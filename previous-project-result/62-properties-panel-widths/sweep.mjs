// Opens index.html of sample 62 in Edge (table T-025, window 1363x900) and prints the least width per
// content kind and language. Run from the repository root:
//   node previous-project-result/62-properties-panel-widths/sweep.mjs [screenshot-folder]
// (a worktree without node_modules passes PLAYWRIGHT=../../../node_modules/playwright/index.mjs)

import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const playwrightAt = process.env.PLAYWRIGHT ?? 'playwright'
const { chromium } = await import(
  playwrightAt.startsWith('.') ? pathToFileURL(join(process.cwd(), playwrightAt)).href : playwrightAt
)

const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1363, height: 900 } })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))
await page.goto(pathToFileURL(join(here, 'index.html')).href)
const found = {}
for (const language of ['ja', 'en']) {
  found[language] = await page.evaluate((chosen) => window.measure(chosen), language)
  console.log(language, 'limited by', await page.evaluate(() => window.limiters))
  if (process.argv[2] !== undefined) {
    await page.screenshot({ path: join(process.argv[2], `sample-62-${language}.png`), fullPage: true })
  }
}
const keys = Object.keys(found.ja)
const rows = keys.map((key) => ({
  key,
  ja: found.ja[key],
  en: found.en[key],
  larger: Math.max(found.ja[key] ?? Infinity, found.en[key] ?? Infinity),
}))
console.table(rows)
if (errors.length > 0) console.log('page errors:', errors)
await browser.close()

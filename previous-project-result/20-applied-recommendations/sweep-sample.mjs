// Screenshot applied-recommendations-sample.html in light, dark and monochrome, section by section.
// Playwright resolves from the repository root's node_modules (Node walks up).
// Run from the repository root:  node previous-project-result/20-applied-recommendations/sweep-sample.mjs
// Screenshots go to scratch/applied-recommendations/ (ignored by git).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, 'applied-recommendations-sample.html')).href;
const out = join('scratch', 'applied-recommendations');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pageUrl);

const themes = [
  ['light', async () => {}],
  ['dark', async () => { await page.check('#dark'); }],
  ['mono', async () => { await page.uncheck('#dark'); await page.check('#mono'); }],
  ['mono-dark', async () => { await page.check('#dark'); }],
];
for (const [name, setup] of themes) {
  await setup();
  for (const id of ['glyphs', 'flames', 'dashes', 'mono4']) {
    await (await page.$('#' + id)).screenshot({ path: join(out, `shot-${name}-${id}.png`) });
  }
}
await page.screenshot({ path: join(out, 'shot-hints.png'), fullPage: true });
console.log('page errors', JSON.stringify(errors));
await browser.close();

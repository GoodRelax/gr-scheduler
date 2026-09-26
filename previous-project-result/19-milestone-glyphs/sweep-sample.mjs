// Sweep milestone-glyphs-sample.html: centre offsets across zoom levels, and screenshots in light,
// dark and monochrome. Playwright resolves from the repository root's node_modules (Node walks up).
// Run from the repository root:  node previous-project-result/19-milestone-glyphs/sweep-sample.mjs
// Screenshots go to scratch/milestone-glyphs/ (ignored by git).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, 'milestone-glyphs-sample.html')).href;
const out = join('scratch', 'milestone-glyphs');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pageUrl);

const themes = [
  ['light', async () => {}],
  ['dark', async () => { await page.check('#dark'); }],
  ['mono', async () => { await page.uncheck('#dark'); await page.check('#mono'); }],
];
for (const [name, setup] of themes) {
  await setup();
  for (const id of ['palette', 'plan', 'actual', 'initial']) {
    await (await page.$('#' + id)).screenshot({ path: join(out, `shot-${name}-${id}.png`) });
  }
}
await page.uncheck('#mono');

const setZoom = (z) => page.$eval('#zoom', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, z);
for (const z of ['0.5', '1', '2', '4']) {
  await setZoom(z);
  const rows = await page.evaluate(() => window.MILESTONE_CENTRE_OFFSETS.map(
    (r) => r.set + ' ' + r.cells.map((v) => v.toFixed(2)).join(' ')));
  console.log('zoomY', z, JSON.stringify(rows));
}
await (await page.$('#initial')).screenshot({ path: join(out, 'shot-zoom4-initial.png') });

const button = await page.$eval('#palette .pbtn', (b) => {
  const r = b.getBoundingClientRect();
  return [r.width, r.height];
});
console.log('palette button px', JSON.stringify(button));
console.log('page errors', JSON.stringify(errors));
await browser.close();

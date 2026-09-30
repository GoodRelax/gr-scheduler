// Sweep jump-followups-sample.html: click the continuation mark, try each input in both modes,
// and record whether the landing mark survives. Playwright resolves from the repository root's
// node_modules (Node walks up).
// Run from the repository root:  node previous-project-result/22-jump-followups/sweep-sample.mjs
// Screenshots go to scratch/jump-followups/ (ignored by git).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(join(here, 'jump-followups-sample.html')).href;
const out = join('scratch', 'jump-followups');
mkdirSync(out, { recursive: true });

// WHY: headless Playwright passes --hide-scrollbars; SC-4's scrollbar must be there to be grabbed.
const browser = await chromium.launch({ channel: 'msedge', ignoreDefaultArgs: ['--hide-scrollbars'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pageUrl);

const isShown = () => page.$eval('#status', (e) => e.textContent.includes('出ている'));
const vpBox = async () => (await page.$('#vp')).boundingBox();
const setMode = (m) => page.check(`input[name=mode][value=${m}]`);

async function jump() {
  await page.click('#home');
  await page.waitForTimeout(100);
  // WHY: by box, not by handle: every scroll event redraws the picture and detaches the handle.
  const box = await page.locator('#chart [data-mark="5>47"]').boundingBox();
  if (box === null) throw new Error('no continuation mark on the 5>47 line');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(100);
  return isShown();
}

const b = await vpBox();
const mid = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
const inputs = [
  ['wheel (MK-1)', async () => { await page.mouse.move(mid.x, mid.y); await page.mouse.wheel(0, 120); }],
  ['Ctrl+Shift+wheel (MK-5)', async () => {
    await page.mouse.move(mid.x, mid.y);
    await page.keyboard.down('Control'); await page.keyboard.down('Shift');
    await page.mouse.wheel(0, 120);
    await page.keyboard.up('Shift'); await page.keyboard.up('Control');
  }],
  ['scrollbar drag (SC-4)', async () => {
    const x = b.x + b.width - 6;
    await page.mouse.move(x, b.y + 30); await page.mouse.down(); await page.mouse.move(x, b.y + 90); await page.mouse.up();
  }],
  ['middle drag (PTD-1)', async () => {
    await page.mouse.move(mid.x, mid.y); await page.mouse.down({ button: 'middle' });
    await page.mouse.move(mid.x - 60, mid.y - 60); await page.mouse.up({ button: 'middle' });
  }],
  ['panel wheel', async () => { const p = await (await page.$('#plist')).boundingBox(); await page.mouse.move(p.x + 50, p.y + 100); await page.mouse.wheel(0, 120); }],
  ['Ctrl+wheel (MK-2 zoom)', async () => {
    await page.mouse.move(mid.x, mid.y); await page.keyboard.down('Control'); await page.mouse.wheel(0, -120); await page.keyboard.up('Control');
  }],
  ['key PageDown', async () => { await page.keyboard.press('PageDown'); }],
  ['fit button (IC-10)', async () => { await page.click('#fit'); }],
  ['fold button', async () => { await page.click('#fold'); }],
  ['pointer move only', async () => { await page.mouse.move(mid.x + 40, mid.y + 20); }],
];

const table = [];
for (const mode of ['now', 'plan']) {
  await setMode(mode);
  for (const [name, act] of inputs) {
    const before = await jump();
    await act();
    await page.waitForTimeout(80);
    table.push(`${mode.padEnd(5)} ${name.padEnd(26)} shown-before=${before} shown-after=${await isShown()}`);
  }
}
console.log(table.join('\n'));

await setMode('plan');
await jump();
await page.screenshot({ path: join(out, 'shot-601-landed.png'), clip: { x: 0, y: b.y - 10, width: 1300, height: b.height + 20 } });
await page.mouse.move(mid.x, mid.y);
for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -120);
await page.screenshot({ path: join(out, 'shot-601-plan-after-wheel-up.png'), clip: { x: 0, y: b.y - 10, width: 1300, height: b.height + 20 } });
await setMode('now');
await jump();
for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -120);
await page.screenshot({ path: join(out, 'shot-601-now-after-wheel-up.png'), clip: { x: 0, y: b.y - 10, width: 1300, height: b.height + 20 } });

const tree = await page.$('#tree');
for (const q of ['A', 'B']) {
  for (const seen of ['a2', 'c2']) {
    await page.check(`input[name=q1][value=${q}]`);
    await page.check(`input[name=seen][value=${seen}]`);
    await page.click('#rehide');
    await tree.screenshot({ path: join(out, `shot-598-${q}-${seen}.png`) });
  }
}
await page.check('input[name=q1][value=A]');
await page.check('input[name=seen][value=a2]');
await page.click('#rehide');
const tm = await page.locator('#tree [data-tree-mark]').boundingBox();
await page.mouse.click(tm.x + tm.width / 2, tm.y + tm.height / 2);
await tree.screenshot({ path: join(out, 'shot-598-A-a2-after-click.png') });
console.log('page errors', JSON.stringify(errors));
await browser.close();

// Drive real Edge and Chrome over CDP and record how each open method brings up the new tab.
// Usage: node probe-open-tab.mjs <browser exe> <label> <out.json>
// Trusted input comes from Input.dispatchMouseEvent. The window sits off-screen with native
// occlusion off, so the active tab stays "visible" and a background tab reports "hidden".
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [exe, label, out] = process.argv.slice(2);
const sample = pathToFileURL(resolve(import.meta.dirname, 'link-click-sample.html')).href;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'grs-link-probe-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = spawn(exe, [
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run',
  '--no-default-browser-check', '--disable-features=CalculateNativeWinOcclusion',
  '--window-position=3000,3000', '--window-size=900,700', sample,
], { stdio: 'ignore' });

let ws, nextId = 1;
const pending = new Map();
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      ws = new WebSocket(v.webSocketDebuggerUrl);
      await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        const p = pending.get(msg.id);
        if (p) { pending.delete(msg.id); msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result); }
      };
      return v.Browser;
    } catch { await sleep(200); }
  }
  throw new Error('no CDP');
}

const pages = async () => (await send('Target.getTargets')).targetInfos.filter((t) => t.type === 'page');
const attach = async (targetId) => (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
const evaluate = async (s, expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, s)).result.value;

async function press(s, x, y, { button = 'left', modifiers = 0 } = {}) {
  const buttons = button === 'left' ? 1 : 4;
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, s);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, buttons, clickCount: 1, modifiers }, s);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, buttons: 0, clickCount: 1, modifiers }, s);
}

const version = await connect();
let main = (await pages()).find((t) => t.url.startsWith(sample));
for (let i = 0; !main && i < 30; i++) { await sleep(200); main = (await pages()).find((t) => t.url.startsWith(sample)); }
const s = await attach(main.targetId);
await send('Runtime.enable', {}, s);
await sleep(800);
const box = await evaluate(s, `(() => { const r = document.querySelector('.name.has-link').getBoundingClientRect(); return { x: r.left + 10, y: r.top + r.height / 2 }; })()`);

const cases = [];
for (const method of ['windowOpen', 'syntheticCtrlClick', 'anchorClick', 'openThenRefocus']) {
  for (const wait of [0, 500]) cases.push({ method, wait, input: 'click' });
}
cases.push({ method: 'windowOpen', wait: 0, input: 'ctrlClick' });
cases.push({ method: 'windowOpen', wait: 0, input: 'wheelPress' });

const results = [];
for (const c of cases) {
  await send('Target.activateTarget', { targetId: main.targetId });
  await sleep(300);
  await evaluate(s, `(() => { document.querySelector('input[name=wait][value="${c.wait}"]').click(); document.querySelector('input[name=method][value="${c.method}"]').click(); window.__events.length = 0; return true; })()`);
  const before = new Set((await pages()).map((t) => t.targetId));
  if (c.input === 'click') await press(s, box.x, box.y);
  else if (c.input === 'ctrlClick') await press(s, box.x, box.y, { modifiers: 2 });
  else await press(s, box.x, box.y, { button: 'middle' });
  await sleep(c.wait + 1200);
  const all = (await pages()).filter((t) => !before.has(t.targetId));
  const stray = all.filter((t) => !t.url.startsWith(sample)).map((t) => t.url);
  const fresh = all.filter((t) => t.url.startsWith(sample));
  const openerWhileOpen = await evaluate(s, 'document.visibilityState');
  const opened = [];
  for (const t of fresh) {
    const ts = await attach(t.targetId);
    await send('Runtime.enable', {}, ts);
    opened.push(await evaluate(ts, 'JSON.stringify({ first: window.__opened && window.__opened.first, now: document.visibilityState })'));
    await send('Target.closeTarget', { targetId: t.targetId });
  }
  const events = await evaluate(s, 'window.__events.slice()');
  results.push({ ...c, newTabs: fresh.length, stray, opened, openerWhileOpen, events });
  await sleep(300);
}

writeFileSync(out, JSON.stringify({ label, version, at: new Date().toISOString(), results }, null, 1));
await send('Browser.close').catch(() => {});
await sleep(1000);
browser.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold the profile */ }
console.log(label, version, results.map((r) => `${r.method}/${r.wait}/${r.input}: tabs=${r.newTabs} ${r.opened.join(' ')} opener=${r.openerWhileOpen} stray=${r.stray.join(",")}`).join('\n'));
process.exit(0);

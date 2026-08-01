/**
 * ai-cowork-trial: measure whether a file:// page can be driven from outside,
 * and whether the boot-data injection rule actually holds.
 *
 * Answers the last unmeasured item in
 * draft-for-handover/OPEN-ITEMS-ja.md (O-2), plus proves the escaping rule in
 * requirement A-13 by running the negative control: inject the same payload
 * WITHOUT escaping and show the page breaks.
 *
 * Uses the Playwright browser already present in this repository's devDependencies.
 * Writes nothing outside the OS temp directory.
 *
 * Usage:  node ai-cowork-trial/file-protocol-automation-probe.mjs
 */

import { chromium } from '@playwright/test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const results = [];

/**
 * Record one measurement.
 *
 * @param {string} label - What was measured.
 * @param {unknown} outcome - The measured result.
 */
function record(label, outcome) {
  results.push({ label, outcome: String(outcome) });
  process.stdout.write(label.padEnd(46, ' ') + ' = ' + String(outcome) + '\n');
}

/** Page that reports its own origin and exposes a function for the outside to call. */
const PROBE_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>automation probe</title></head>
<body>
<h1 id="heading">automation probe</h1>
<p id="state">untouched</p>
<script type="application/json" id="grs-boot-document">null</script>
<script>
  // Stands in for the planned window.grScheduler agent interface.
  window.pretendAgentInterface = {
    agentApiVersion: '1.0.0',
    revision: 0,
    applyCommands(request) {
      window.pretendAgentInterface.revision += 1;
      document.getElementById('state').textContent =
        'applied ' + request.commands.length + ' command(s) at revision ' +
        window.pretendAgentInterface.revision;
      return { accepted: true, revision: window.pretendAgentInterface.revision };
    },
  };
  // Read whatever was injected into the boot holder.
  window.bootReadOutcome = (function () {
    const holders = document.querySelectorAll('#grs-boot-document');
    if (holders.length !== 1) return { ok: false, reason: 'holder-not-unique:' + holders.length };
    try {
      return { ok: true, parsed: JSON.parse(holders[0].textContent) };
    } catch (error) {
      return { ok: false, reason: 'unparsable:' + error.message };
    }
  })();
</script>
</body></html>`;

/**
 * Build a page with a document injected into the boot holder.
 *
 * @param {object} documentToInject - The payload.
 * @param {boolean} escapeLessThan - Whether to apply the escaping rule.
 * @returns {string} The generated HTML.
 */
function buildInjectedPage(documentToInject, escapeLessThan) {
  const json = JSON.stringify(documentToInject);
  const payload = escapeLessThan ? json.replace(/</g, '\\u003c') : json;
  return PROBE_PAGE.replace(
    '<script type="application/json" id="grs-boot-document">null</script>',
    '<script type="application/json" id="grs-boot-document">' + payload + '</script>',
  );
}

const workDirectory = await mkdtemp(join(tmpdir(), 'grs-file-probe-'));
const browser = await chromium.launch();

try {
  // ---------------------------------------------------------------- O-2 core
  const plainPath = join(workDirectory, 'probe.html');
  await writeFile(plainPath, PROBE_PAGE, 'utf8');
  const page = await browser.newPage();
  await page.goto(pathToFileURL(plainPath).href);

  record('navigation to file:// succeeded', page.url().startsWith('file://'));
  record('location.protocol seen from inside', await page.evaluate(() => location.protocol));
  record('location.origin seen from inside', await page.evaluate(() => location.origin));
  record('outside code can read the DOM', await page.evaluate(() => document.getElementById('heading').textContent));

  const applyOutcome = await page.evaluate(() =>
    window.pretendAgentInterface.applyCommands({ commands: [{ commandName: 'update-task' }, { commandName: 'update-task' }] }),
  );
  record('outside code can CALL a page function', JSON.stringify(applyOutcome));
  record('the call actually changed the page', await page.evaluate(() => document.getElementById('state').textContent));

  const fetchOutcome = await page.evaluate(async () => {
    try {
      const response = await fetch('./probe.html');
      return 'ALLOWED status ' + response.status;
    } catch (error) {
      return 'BLOCKED ' + error.name + ': ' + error.message;
    }
  });
  record('fetch of a sibling file (cross-check)', fetchOutcome);

  const screenshotPath = join(workDirectory, 'screenshot.png');
  await page.screenshot({ path: screenshotPath });
  record('screenshot of a file:// page', 'captured');

  // ------------------------------------------------------- A-13 injection rule
  // A payload deliberately containing the characters that break a script tag,
  // plus non-ASCII text, because both are normal in schedule data.
  const hostileDocument = {
    schemaVersion: 'grs-1',
    tasks: [
      { uid: 1, name: 'closing tag inside data: </script>' },
      { uid: 2, name: 'angle brackets <b>bold</b> and an ampersand &' },
      { uid: 3, name: '日本語のタスク名（非 ASCII）' },
    ],
  };

  const escapedPath = join(workDirectory, 'injected-escaped.html');
  await writeFile(escapedPath, buildInjectedPage(hostileDocument, true), 'utf8');
  const escapedPage = await browser.newPage();
  await escapedPage.goto(pathToFileURL(escapedPath).href);
  const escapedOutcome = await escapedPage.evaluate(() => window.bootReadOutcome);
  record('WITH escaping: boot document parsed', escapedOutcome.ok);
  if (escapedOutcome.ok) {
    const identical = JSON.stringify(escapedOutcome.parsed) === JSON.stringify(hostileDocument);
    record('WITH escaping: round trip identical', identical);
    record('WITH escaping: non-ASCII survived', escapedOutcome.parsed.tasks[2].name);
  } else {
    record('WITH escaping: failure reason', escapedOutcome.reason);
  }

  const rawPath = join(workDirectory, 'injected-raw.html');
  await writeFile(rawPath, buildInjectedPage(hostileDocument, false), 'utf8');
  const rawPage = await browser.newPage();
  await rawPage.goto(pathToFileURL(rawPath).href);
  const rawOutcome = await rawPage.evaluate(() => window.bootReadOutcome ?? { ok: false, reason: 'page script never ran' });
  record('WITHOUT escaping: boot document parsed', rawOutcome.ok);
  record('WITHOUT escaping: failure reason', rawOutcome.ok ? '(none)' : rawOutcome.reason);
  record('WITHOUT escaping: stray text leaked into body', await rawPage.evaluate(() => document.body.innerText.includes('bold')));

  process.stdout.write('\n--- summary ---\n');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  await rm(workDirectory, { recursive: true, force: true });
}

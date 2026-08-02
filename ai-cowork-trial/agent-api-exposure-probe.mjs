/**
 * ai-cowork-trial: measure how the agent interface can be switched on, and
 * whether "not exposed" really means "not reachable from outside".
 *
 * Feeds decision D4 (draft-for-handover/OPEN-ITEMS-ja.md O-8). The proposal is:
 * the interface is off by default, the built .html carries only the schedule
 * document in its embedded document holder, and the process that drives the
 * browser turns the interface on at launch. Every claim there is measured here.
 *
 * M1  With nothing done, is a module-scope interface reachable by name?
 *     (If it were, "off by default" would be theatre.)
 * M2  Can the driving side turn it on at launch WITHOUT touching the file?
 * M3  Does a query string survive on a file:// URL? (a second enable channel)
 * M4  Once handed out, can the interface be taken back by deleting the name?
 *
 * Uses the Playwright browser already present in this repository's devDependencies.
 * Writes nothing outside the OS temp directory.
 *
 * Usage:  node ai-cowork-trial/agent-api-exposure-probe.mjs
 */

import { chromium } from '@playwright/test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
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
  process.stdout.write(label.padEnd(52, ' ') + ' = ' + String(outcome) + '\n');
}

/**
 * The product page as proposed: the embedded document holder carries the
 * schedule document only, and the interface object lives in module scope. It is
 * placed on the global box solely when the launcher asked for it.
 */
const PRODUCT_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>agent api exposure probe</title></head>
<body>
<p id="state">startup not run</p>
<script type="application/json" id="embedded-document">null</script>
<script type="module">
  // Module scope. Nothing outside this module can name it.
  const agentApi = {
    agentApiVersion: '1.0.0',
    readRevision() { return 7; },
  };

  // The enable flag is neither in the document JSON nor written into this file.
  // It is whatever the launching process placed on the global box before startup.
  const isEnabledByLauncher = globalThis.shouldExposeGrSchedulerAgentApi === true;
  const agentApiQueryParameter = new URLSearchParams(location.search).get('agentApi');

  if (isEnabledByLauncher) {
    globalThis.grSchedulerAgentApi = agentApi;
  }

  const embeddedDocumentHolder = document.getElementById('embedded-document');
  document.getElementById('state').textContent =
    'startup ran; isEnabledByLauncher=' + isEnabledByLauncher;

  globalThis.probeStartupReport = {
    isEnabledByLauncher,
    agentApiQueryParameter,
    locationSearch: location.search,
    embeddedDocumentText: embeddedDocumentHolder.textContent,
    exposedType: typeof globalThis.grSchedulerAgentApi,
  };
</script>
</body></html>`;

const workDirectory = await mkdtemp(join(tmpdir(), 'grs-exposure-probe-'));
const browser = await chromium.launch();

try {
  // One single file on disk is used by every run below. It is never rewritten.
  const productPath = join(workDirectory, 'product.html');
  await writeFile(productPath, PRODUCT_PAGE, 'utf8');
  const productUrl = pathToFileURL(productPath).href;
  const bytesBefore = (await readFile(productPath)).length;

  // ------------------------------------------------------------------- M1
  // Nothing enabled. The interface exists inside the page but has no name.
  const plainPage = await browser.newPage();
  await plainPage.goto(productUrl);

  record('M1 startup ran', await plainPage.evaluate(() => document.getElementById('state').textContent));
  record('M1 typeof globalThis.grSchedulerAgentApi', await plainPage.evaluate(() => typeof globalThis.grSchedulerAgentApi));
  record(
    'M1 any global name containing "agent"',
    await plainPage.evaluate(() => {
      const names = Object.getOwnPropertyNames(globalThis).filter((name) => /agent/i.test(name));
      return names.length === 0 ? '(none)' : names.join(',');
    }),
  );
  record(
    'M1 outside call attempt',
    await plainPage.evaluate(() => {
      try {
        return 'CALLED -> ' + globalThis.grSchedulerAgentApi.readRevision();
      } catch (error) {
        return 'FAILED -> ' + error.name + ': ' + error.message;
      }
    }),
  );

  // ------------------------------------------------------------------- M2
  // Same file, untouched. The launcher sets the flag before any page script runs.
  const enabledPage = await browser.newPage();
  await enabledPage.addInitScript(() => {
    globalThis.shouldExposeGrSchedulerAgentApi = true;
  });
  await enabledPage.goto(productUrl);

  record('M2 launcher flag seen at startup', await enabledPage.evaluate(() => globalThis.probeStartupReport.isEnabledByLauncher));
  record('M2 typeof globalThis.grSchedulerAgentApi', await enabledPage.evaluate(() => typeof globalThis.grSchedulerAgentApi));
  record('M2 outside call outcome', await enabledPage.evaluate(() => globalThis.grSchedulerAgentApi.readRevision()));
  record('M2 embedded document holder untouched', await enabledPage.evaluate(() => globalThis.probeStartupReport.embeddedDocumentText));
  record('M2 file on disk unchanged (bytes)', (await readFile(productPath)).length === bytesBefore);

  // ------------------------------------------------------------------- M3
  // A query string on a file:// URL: does it reach the page at all?
  const queryPage = await browser.newPage();
  await queryPage.goto(productUrl + '?agentApi=1');
  record('M3 location.search on file://', JSON.stringify(await queryPage.evaluate(() => globalThis.probeStartupReport.locationSearch)));
  record('M3 query value read at startup', JSON.stringify(await queryPage.evaluate(() => globalThis.probeStartupReport.agentApiQueryParameter)));

  // ------------------------------------------------------------------- M4
  // Hand the interface out, then delete the name. Is the holder cut off?
  record(
    'M4 held reference after deleting the name',
    await enabledPage.evaluate(() => {
      const held = globalThis.grSchedulerAgentApi;
      delete globalThis.grSchedulerAgentApi;
      const isNameGone = typeof globalThis.grSchedulerAgentApi === 'undefined';
      let stillWorks;
      try {
        stillWorks = 'CALLED -> ' + held.readRevision();
      } catch (error) {
        stillWorks = 'FAILED -> ' + error.name;
      }
      return 'name gone: ' + isNameGone + ' | ' + stillWorks;
    }),
  );

  process.stdout.write('\n--- summary ---\n');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  await rm(workDirectory, { recursive: true, force: true });
}

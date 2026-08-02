/**
 * ai-cowork-trial: measure whether an outside process can enter a page that the
 * HUMAN opened, and whether an on-screen enable switch really gates it.
 *
 * This is the remaining half of O-2 (draft-for-handover/OPEN-ITEMS-ja.md).
 * The earlier measurement (decision record "kecchaku-4") drove a page that the
 * automation itself had opened. This one attaches to a browser the human
 * started, at a page the human is looking at and typing into.
 *
 * Preconditions (the human does these):
 *   1. Start a browser with a debugging port and a throwaway profile.
 *   2. Open ai-cowork-trial/cowork-live-probe.html in it.
 *
 * Sequence measured here:
 *   P1  attach to the human's browser and find the human's page
 *   P2  read the page (DOM, origin) from outside
 *   P3  BEFORE the human enables: is the interface reachable?  (expect: no)
 *   P4  wait for the human to press "Enable AI co-editing"
 *   P5  AFTER: read the document, write it, and trip the optimistic lock
 *
 * Usage:  node ai-cowork-trial/cowork-live-attach.mjs [debuggingPort]
 */

import { chromium } from '@playwright/test';

const DEBUGGING_PORT = process.argv[2] ?? '9222';
const PAGE_MARKER = 'cowork-live-probe.html';
const WAIT_LIMIT_MILLISECONDS = 120000;

const results = [];

/**
 * Record one measurement.
 *
 * @param {string} label - What was measured.
 * @param {unknown} outcome - The measured result.
 */
function record(label, outcome) {
  results.push({ label, outcome: String(outcome) });
  process.stdout.write(label.padEnd(50, ' ') + ' = ' + String(outcome) + '\n');
}

/**
 * Sleep without a busy loop.
 *
 * @param {number} milliseconds - How long to wait.
 * @returns {Promise<void>} Resolves after the delay.
 */
function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

let browser;
try {
  // ------------------------------------------------------------------- P1
  browser = await chromium.connectOverCDP('http://127.0.0.1:' + DEBUGGING_PORT);
  record('P1 attached to a browser started by the human', true);

  const pages = browser.contexts().flatMap((context) => context.pages());
  record('P1 pages visible in that browser', pages.length);
  record('P1 their urls', pages.map((page) => page.url()).join(' | ') || '(none)');

  const page = pages.find((candidate) => candidate.url().includes(PAGE_MARKER));
  if (!page) {
    record('P1 probe page found', false);
    throw new Error('The probe page is not open. Open cowork-live-probe.html in that browser first.');
  }
  record('P1 probe page found', true);

  // ------------------------------------------------------------------- P2
  record('P2 url as seen from outside', page.url());
  record('P2 location.protocol seen from inside', await page.evaluate(() => location.protocol));
  record('P2 location.origin seen from inside', await page.evaluate(() => location.origin));
  record('P2 outside can read the DOM', await page.evaluate(() => document.querySelector('h1').textContent));
  record(
    'P2 what the human has typed so far',
    JSON.stringify(await page.evaluate(() => document.getElementById('documentText').value)),
  );

  // ------------------------------------------------------------------- P3
  record('P3 BEFORE enable: typeof interface', await page.evaluate(() => typeof globalThis.grSchedulerAgentApi));
  record(
    'P3 BEFORE enable: call attempt',
    await page.evaluate(() => {
      try {
        return 'CALLED -> ' + JSON.stringify(globalThis.grSchedulerAgentApi.readDocument());
      } catch (error) {
        return 'FAILED -> ' + error.name + ': ' + error.message;
      }
    }),
  );

  // ------------------------------------------------------------------- P4
  process.stdout.write('\n>>> Press "Enable AI co-editing" on the page now. Waiting...\n\n');
  const waitStartedAt = Date.now();
  let exposed = false;
  while (Date.now() - waitStartedAt < WAIT_LIMIT_MILLISECONDS) {
    exposed = await page.evaluate(() => typeof globalThis.grSchedulerAgentApi === 'object');
    if (exposed) break;
    await sleep(500);
  }
  record('P4 human enabled it within the wait limit', exposed);
  if (!exposed) throw new Error('The interface was never exposed; nothing more can be measured.');
  record('P4 seconds the human took', Math.round((Date.now() - waitStartedAt) / 1000));

  // ------------------------------------------------------------------- P5
  const currentDocument = await page.evaluate(() => globalThis.grSchedulerAgentApi.readDocument());
  record('P5 AFTER enable: readDocument', JSON.stringify(currentDocument));

  const writeOutcome = await page.evaluate((baseRevision) => {
    const api = globalThis.grSchedulerAgentApi;
    const existing = api.readDocument().text;
    return api.applyText({
      baseRevision,
      text: existing + (existing ? '\n' : '') + 'line written from outside the browser',
    });
  }, currentDocument.revision);
  record('P5 write with a correct base revision', JSON.stringify(writeOutcome));

  const staleOutcome = await page.evaluate(
    (staleRevision) =>
      globalThis.grSchedulerAgentApi.applyText({ baseRevision: staleRevision, text: 'this must not land' }),
    currentDocument.revision,
  );
  record('P5 write with a stale base revision', JSON.stringify(staleOutcome));

  record(
    'P5 text on screen at the end',
    JSON.stringify(await page.evaluate(() => document.getElementById('documentText').value)),
  );

  process.stdout.write('\n--- summary ---\n');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} catch (error) {
  process.stdout.write('\nPROBE STOPPED: ' + error.message + '\n');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.exitCode = 1;
} finally {
  // Only detach. The human's browser must stay open.
  if (browser) await browser.close();
}

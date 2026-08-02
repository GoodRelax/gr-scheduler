/**
 * ai-cowork-trial: measure how browser storage behaves for pages opened from
 * file://, which decides the startup order and the autosave key design.
 *
 * Feeds decision D5 (draft-for-handover/OPEN-ITEMS-ja.md O-7). Crash recovery
 * (user-order.md 60) stores the work in progress; the embedded document is an
 * explicit act by whoever built the file. Before deciding which one wins at
 * startup, two things have to be known:
 *
 * S1  Is localStorage even available on a file:// page?
 * S2  Do two different local files SHARE one localStorage? (same folder)
 * S3  Do two different folders share it as well?
 * S4  Does what was stored survive a full browser restart? (the crash case)
 * S5  Does IndexedDB behave the same way? (the file handle lives there)
 *
 * If storage is shared across every local file, an autosave written by one copy
 * of the app is visible to every other copy, and the key must carry the
 * identity of the document rather than the identity of the page.
 *
 * Uses the Playwright browser already present in this repository's devDependencies.
 * Writes nothing outside the OS temp directory.
 *
 * Usage:  node ai-cowork-trial/startup-storage-probe.mjs
 */

import { chromium } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
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
  process.stdout.write(label.padEnd(56, ' ') + ' = ' + String(outcome) + '\n');
}

/** A page with nothing in it. Everything is driven from outside. */
const EMPTY_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>storage probe</title></head>
<body><p id="state">loaded</p></body></html>`;

/**
 * Read the autosave key and the page origin.
 *
 * @param {import('@playwright/test').Page} page - The page to ask.
 * @returns {Promise<object>} What the page can see.
 */
function readStorage(page) {
  return page.evaluate(() => {
    let localStorageOutcome;
    try {
      localStorageOutcome = JSON.stringify(localStorage.getItem('grsched.autosave'));
    } catch (error) {
      localStorageOutcome = 'THREW ' + error.name;
    }
    return {
      origin: location.origin,
      pathname: location.pathname,
      autosave: localStorageOutcome,
      keyCount: (() => {
        try {
          return localStorage.length;
        } catch {
          return -1;
        }
      })(),
    };
  });
}

const workDirectory = await mkdtemp(join(tmpdir(), 'grs-storage-probe-'));
const profileDirectory = join(workDirectory, 'profile');
const folderA = join(workDirectory, 'folder-a');
const folderB = join(workDirectory, 'folder-b');

try {
  await mkdir(folderA, { recursive: true });
  await mkdir(folderB, { recursive: true });
  const firstPath = join(folderA, 'one.html');
  const secondPath = join(folderA, 'two.html');
  const thirdPath = join(folderB, 'three.html');
  for (const path of [firstPath, secondPath, thirdPath]) {
    await writeFile(path, EMPTY_PAGE, 'utf8');
  }
  const firstUrl = pathToFileURL(firstPath).href;
  const secondUrl = pathToFileURL(secondPath).href;
  const thirdUrl = pathToFileURL(thirdPath).href;

  // A persistent profile, so the browser can be closed and opened again.
  let context = await chromium.launchPersistentContext(profileDirectory, {});
  const page = context.pages()[0] ?? (await context.newPage());

  // ------------------------------------------------------------------- S1
  await page.goto(firstUrl);
  const availability = await page.evaluate(() => {
    try {
      localStorage.setItem('grsched.probe', '1');
      localStorage.removeItem('grsched.probe');
      return 'available';
    } catch (error) {
      return 'THREW ' + error.name + ': ' + error.message;
    }
  });
  record('S1 localStorage on a file:// page', availability);
  record('S1 location.origin', (await readStorage(page)).origin);

  await page.evaluate(() => localStorage.setItem('grsched.autosave', 'written-by-folder-a/one.html'));
  record('S1 written from folder-a/one.html', (await readStorage(page)).autosave);

  // ------------------------------------------------------------------- S2
  await page.goto(secondUrl);
  const sameFolder = await readStorage(page);
  record('S2 same folder, other file sees it', sameFolder.autosave);
  record('S2 that page keyCount', sameFolder.keyCount);

  // ------------------------------------------------------------------- S3
  await page.goto(thirdUrl);
  const otherFolder = await readStorage(page);
  record('S3 different folder sees it', otherFolder.autosave);

  // ------------------------------------------------------------------- S5
  const indexedDbWrite = await page.evaluate(async () => {
    try {
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('grsched-probe', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('handles');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise((resolve, reject) => {
        const transaction = database.transaction('handles', 'readwrite');
        transaction.objectStore('handles').put('written-by-folder-b/three.html', 'editing');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      return 'written';
    } catch (error) {
      return 'THREW ' + error.name + ': ' + error.message;
    }
  });
  record('S5 indexedDB write from folder-b', indexedDbWrite);

  await page.goto(firstUrl);
  const indexedDbRead = await page.evaluate(async () => {
    try {
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('grsched-probe', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('handles');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return await new Promise((resolve, reject) => {
        const request = database.transaction('handles', 'readonly').objectStore('handles').get('editing');
        request.onsuccess = () => resolve(JSON.stringify(request.result ?? null));
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return 'THREW ' + error.name + ': ' + error.message;
    }
  });
  record('S5 folder-a reads what folder-b stored', indexedDbRead);

  // ------------------------------------------------------------------- S4
  await context.close();
  context = await chromium.launchPersistentContext(profileDirectory, {});
  const pageAfterRestart = context.pages()[0] ?? (await context.newPage());
  await pageAfterRestart.goto(firstUrl);
  const afterRestart = await readStorage(pageAfterRestart);
  record('S4 survives a full browser restart', afterRestart.autosave);
  record('S4 keyCount after restart', afterRestart.keyCount);
  await context.close();

  process.stdout.write('\n--- summary ---\n');
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} finally {
  await rm(workDirectory, { recursive: true, force: true });
}

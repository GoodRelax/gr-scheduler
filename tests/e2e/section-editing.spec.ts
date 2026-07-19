import { test, expect, type Page, type Locator } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the left-pane SECTION / CATEGORY editing controls
 * against the built single-file app (`dist/index.html`):
 *
 * - the global "+" (Add section) button adds a visible `None1` section;
 * - "↓" on a section adds a `None1` track (中分類) beneath it;
 * - "✕" (Remove section) deletes it;
 * - a second "Add section" yields `None2` (sequential NoneN naming);
 * - a declared-but-empty section is materialized and visible, so items can be
 *   created into it (it carries a placeholder row and no items yet).
 *
 * Runs after `npm run build`; self-skips when the app has not been built, matching
 * the other e2e specs.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedDocument {
  readonly sections: ReadonlyArray<{ id: string; name: string; rowIds: string[] }>;
  readonly items: ReadonlyArray<{ majorCategory?: string }>;
  readonly declaredCategories?: ReadonlyArray<{ major: string; middle?: string; minor?: string }>;
}

async function exportDocument(page: Page): Promise<ExportedDocument> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).dispatchEvent('click'),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as ExportedDocument;
}

async function openApp(page: Page): Promise<Locator> {
  await page.goto(pathToFileURL(builtAppFile).href);
  const canvas = page.locator('svg[data-role="schedule-canvas"]');
  await canvas.waitFor();
  await page.locator('[data-role="section-header"]').first().waitFor();
  return canvas;
}

const sectionCount = (page: Page): Promise<number> =>
  page.locator('[data-role="section-header"]').count();

test.describe('left-pane section / category editing', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('"+" adds a visible None1 section; second add gives None2', async ({ page }) => {
    await openApp(page);
    const before = await sectionCount(page);

    await page.getByRole('button', { name: 'Add section' }).click();
    await expect(page.getByRole('button', { name: 'Remove section None1' })).toBeVisible();
    expect(await sectionCount(page)).toBe(before + 1);

    await page.getByRole('button', { name: 'Add section' }).click();
    await expect(page.getByRole('button', { name: 'Remove section None2' })).toBeVisible();
    expect(await sectionCount(page)).toBe(before + 2);
  });

  test('"+" on a section adds a None1 track, and "X" (confirm dialog) removes the section', async ({
    page,
  }) => {
    await openApp(page);

    await page.getByRole('button', { name: 'Add section' }).click();
    // The per-node control row is hidden until the node is hovered; hover the new
    // None1 section header to reveal its controls before using them.
    const none1Header = page.locator('[data-role="section-header"]', { hasText: 'None1' }).first();
    await none1Header.hover();
    await expect(page.getByRole('button', { name: 'Remove section None1' })).toBeVisible();

    // "Add sub-category under None1" nests a track named None1 beneath the section.
    await page.getByRole('button', { name: 'Add sub-category under None1' }).click();
    // Hover the new None1 TRACK row to reveal its controls.
    const none1Track = page.locator('[data-role="track-label"]', { hasText: 'None1' }).first();
    await none1Track.hover();
    await expect(page.getByRole('button', { name: 'Remove category None1' })).toBeVisible();

    const withTrack = await exportDocument(page);
    expect(withTrack.declaredCategories).toContainEqual({ major: 'None1', middle: 'None1' });

    // Clicking "X" opens a confirm dialog first; only Delete actually removes it.
    await none1Header.hover();
    await page.getByRole('button', { name: 'Remove section None1' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('button', { name: 'Remove section None1' })).toHaveCount(0);
  });

  test('a declared empty section is materialized and visible (ready for items)', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Add section' }).click();
    await expect(page.getByRole('button', { name: 'Remove section None1' })).toBeVisible();

    const document = await exportDocument(page);
    const none1 = document.sections.find((section) => section.name === 'None1');
    expect(none1).toBeDefined();
    // Shown even though empty: it owns a placeholder row and holds no items yet.
    expect(none1?.rowIds.length).toBe(1);
    expect(document.items.every((item) => item.majorCategory !== 'None1')).toBe(true);
    expect(document.declaredCategories).toContainEqual({ major: 'None1' });
  });
});

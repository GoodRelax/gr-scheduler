import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end smoke test for the primary create -> export user flow (UC-001 /
 * UC-009), exercised against the built single-file app (`dist/index.html`).
 *
 * Flow: load the app -> export JSON to capture the pre-loaded sample document's
 * item count -> arm the "Milestone circle" shape on the floating tool palette
 * -> focus the schedule canvas and press Enter (keyboard "activate", WCAG
 * 2.1.1) to place the armed shape -> export JSON again and verify the item
 * count grew by exactly one.
 *
 * Verification is done via the EXPORTED document rather than counting
 * `[data-item-id]` elements in the live canvas: the renderer virtualizes the
 * viewport and applies LOD (ZOOM-L1-005), so a newly created low-importance
 * item is not guaranteed to be among the mounted DOM nodes even though it is
 * present in the model -- exactly the property svg-exporter.test.ts documents
 * ("renders ALL items, not just a virtualized viewport subset"). The Undo
 * button's enabled state (store history) is used as the deterministic signal
 * that the create command was actually committed.
 *
 * Kept separate from the Vitest unit/integration run (see vitest.config.ts) and
 * self-skips when `dist/index.html` has not been built yet, matching the
 * a11y.spec.ts pattern:
 *
 *   npm run build && npx playwright install chromium && npm run test:e2e
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

/** Click "Export JSON", capture the download, and parse it. */
async function exportDocument(page: Page): Promise<{ items: readonly unknown[] }> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ]);
  const downloadStream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of downloadStream) {
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as { items: readonly unknown[] };
}

test.describe('user flow smoke: create an item then export JSON', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('creating a milestone via keyboard increases the exported item count by one', async ({ page }) => {
    await page.goto(pathToFileURL(builtAppFile).href);

    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    await canvas.waitFor();
    await page.locator('#app [role="toolbar"]').first().waitFor();

    const before = await exportDocument(page);
    expect(before.items.length).toBeGreaterThan(0); // sample document is pre-loaded

    const undoButton = page.getByRole('button', { name: 'Undo' });
    await expect(undoButton).toBeDisabled(); // no edits yet

    // Arm the "Milestone circle" shape on the floating tool palette. The
    // palette floats ON TOP of the canvas (TOOL-L1-001), so a real pointer
    // click there can also land "through" onto a sample item underneath and
    // start an item-grab gesture that steals pointer capture (EditingController
    // consume()), which would make the button's own click handler never fire.
    // Dispatching the DOM 'click' event directly is immune to that pointer-
    // capture race and reliably exercises the palette's own click handler.
    await page.getByRole('button', { name: 'Milestone circle' }).dispatchEvent('click');

    // Keyboard-activate creation on the focused canvas (deterministic vs. a
    // pixel-position pointer click, which could otherwise land on an existing
    // sample item and start a move gesture instead of a create gesture).
    await canvas.focus();
    await canvas.press('Enter');

    // The store recorded one committed create command (deterministic signal,
    // independent of viewport virtualization / LOD culling).
    await expect(undoButton).toBeEnabled();

    const after = await exportDocument(page);
    expect(after.items.length).toBe(before.items.length + 1);

    const idsBefore = new Set((before.items as Array<{ id: string }>).map((item) => item.id));
    const newItems = (after.items as Array<{ id: string; itemKind: string; abbrev: string }>).filter(
      (item) => !idsBefore.has(item.id),
    );
    expect(newItems).toHaveLength(1);
    expect(newItems[0]?.itemKind).toBe('milestone');
  });
});

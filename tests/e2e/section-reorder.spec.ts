import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end flow for section reordering (SECT-L1-002 / user-order item36; review
 * finding F-01). Confirms the ▲ / ▼ move affordance in the left classification
 * pane is actually reachable and wired: clicking "Move section Phase 1 down"
 * changes the section order in the live DOM (top section becomes the next one).
 *
 * Runs against the built single-file app (`dist/index.html`), so run
 * `npm run build` first. Kept out of the Vitest run (see vitest.config.ts) and
 * self-skips when the app has not been built, matching a11y.spec.ts.
 *
 *   npm run build && npx playwright install chromium && npm run test:e2e
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

/** Read the section ids in top-to-bottom (section-order) DOM order. */
async function sectionOrder(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('[data-role="section-header"]').evaluateAll((headers) =>
    headers.map((header) => header.getAttribute('data-section-id') ?? ''),
  );
}

test.describe('section reorder: move a section down via the left pane', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('clicking "Move section down" reorders the sections in the DOM', async ({ page }) => {
    await page.goto(pathToFileURL(builtAppFile).href);

    const firstHeader = page.locator('[data-role="section-header"]').first();
    await firstHeader.waitFor();

    const before = await sectionOrder(page);
    expect(before.length).toBeGreaterThan(1);
    // The startup template names sections "Over All Schedule" then "TeamA".
    expect(before[0]).toBe('section-0');
    expect(before[1]).toBe('section-1');

    // The button's accessible name comes from its aria-label (WCAG 4.1.2).
    await page.getByRole('button', { name: 'Move section Over All Schedule down' }).click();

    // The first section is now the one that was previously second.
    await expect
      .poll(async () => (await sectionOrder(page))[0])
      .toBe('section-1');
    const after = await sectionOrder(page);
    expect(after[1]).toBe('section-0');
  });
});

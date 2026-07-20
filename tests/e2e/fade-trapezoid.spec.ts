import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the task-bar trapezoid fade (ITEM fade cross-fade):
 *  - selecting a task shows fade corner handles;
 *  - dragging the top-left corner RIGHT increases fade_in_days and turns the bar
 *    into a polygon with a slanted left edge (data-fade-in-days on the glyph, and
 *    the panel's fade_in_days input reflects it);
 *  - editing fade_out_days in the property panel reshapes the bar (polygon with
 *    data-fade-out-days).
 *
 * Runs against the built single-file app (`dist/index.html`); build first.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedItem {
  id: string;
  startDate: string;
  endDate: string | null;
  fadeInDays?: number;
  fadeOutDays?: number;
}
interface ExportedView {
  readonly items: readonly ExportedItem[];
}

async function exportView(page: Page): Promise<ExportedView> {
  await page.locator('button[data-role="save"]').click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-role="save-menu"] button[data-role="save-json"]').click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as ExportedView;
}

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="command-palette"]').waitFor();
  await page.locator('svg [data-item-id="oa-phase-plan-dev"]').waitFor();
}

/** Drag the floating palette to the bottom-left so it stops overlaying items. */
async function movePaletteAway(page: Page): Promise<void> {
  const handle = page.locator('[data-role="command-palette-drag-handle"]');
  const grip = await handle.boundingBox();
  if (grip === null) {
    return;
  }
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(4, 560, { steps: 12 });
  await page.mouse.up();
}

test.describe('gr-scheduler fade trapezoid', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('dragging a task top-left corner right increases fade_in_days and slants the left edge', async ({
    page,
  }) => {
    await openApp(page);
    // The glyph of an un-faded task is a <rect>; capture its top-left BEFORE editing.
    const glyph = page.locator('svg [data-item-id="oa-phase-plan-dev"] > rect[data-plan-actual-side="plan"]');
    const glyphBox = await glyph.boundingBox();
    expect(glyphBox).not.toBeNull();
    if (glyphBox === null) {
      return;
    }
    // Select the task (its center) so the fade corner handles appear.
    await page.mouse.click(glyphBox.x + glyphBox.width / 2, glyphBox.y + glyphBox.height / 2);
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="selection-outline"]'),
    ).toHaveCount(1);
    await expect(page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="fade-in-handle"]')).toHaveCount(1);

    const before = await exportView(page);
    const beforeFadeIn = before.items.find((item) => item.id === 'oa-phase-plan-dev')?.fadeInDays ?? 0;

    // Grab the top-left corner handle and drag it to the RIGHT.
    const cornerX = glyphBox.x + 2;
    const cornerY = glyphBox.y + 2;
    await page.mouse.move(cornerX, cornerY);
    await page.mouse.down();
    await page.mouse.move(cornerX + 50, cornerY, { steps: 12 });
    await page.mouse.up();

    const after = await exportView(page);
    const afterItem = after.items.find((item) => item.id === 'oa-phase-plan-dev');
    expect(afterItem?.fadeInDays ?? 0).toBeGreaterThan(beforeFadeIn);

    // The bar is now a polygon carrying the taper as a data attribute.
    const polygon = page.locator('svg [data-item-id="oa-phase-plan-dev"] polygon');
    await expect(polygon).toHaveCount(1);
    const fadeInAttr = Number(await polygon.getAttribute('data-fade-in-days'));
    expect(fadeInAttr).toBeGreaterThan(0);

    // The property panel's fade_in_days input reflects the same value.
    const panelValue = await page
      .locator('label:has-text("fade_in_days") input[type="number"]')
      .inputValue();
    expect(Number(panelValue)).toBe(afterItem?.fadeInDays ?? -1);
  });

  test('editing fade_out_days in the property panel reshapes the bar', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    const glyphBox = await page.locator('svg [data-item-id="oa-phase-plan-dev"] > rect[data-plan-actual-side="plan"]').boundingBox();
    expect(glyphBox).not.toBeNull();
    if (glyphBox === null) {
      return;
    }
    await page.mouse.click(glyphBox.x + glyphBox.width / 2, glyphBox.y + glyphBox.height / 2);
    await expect(page.locator('[role="region"][aria-label="Properties"]')).toBeVisible();

    const fadeOutInput = page.locator('label:has-text("fade_out_days") input[type="number"]');
    await fadeOutInput.fill('4');
    await fadeOutInput.dispatchEvent('change');

    // The bar becomes a polygon whose fade-out data attribute matches the edit.
    const polygon = page.locator('svg [data-item-id="oa-phase-plan-dev"] polygon');
    await expect(polygon).toHaveCount(1);
    await expect(polygon).toHaveAttribute('data-fade-out-days', '4');

    const exported = await exportView(page);
    expect(exported.items.find((item) => item.id === 'oa-phase-plan-dev')?.fadeOutDays).toBe(4);
  });
});

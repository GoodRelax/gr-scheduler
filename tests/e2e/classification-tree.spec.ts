import { test, expect, type Page, type Locator } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the derived classification-tree rework, against the
 * built single-file app (`dist/index.html`):
 *
 * - the template demonstrates a 3-level tree (section / track / detail labels);
 * - zooming vertically OUT collapses detail then track (left-pane label counts
 *   drop in lock-step with the canvas), always keeping the section (major);
 * - the property panel prevents setting a minor while its middle is empty;
 * - a rounded box cannot be resized across a section boundary (single-section).
 *
 * Runs after `npm run build`; self-skips when the app has not been built, matching
 * the other e2e specs.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedDocument {
  readonly sections: ReadonlyArray<{ id: string; name: string; order: number; rowIds: string[] }>;
  readonly rows: ReadonlyArray<{ id: string; depth?: number }>;
  readonly annotations?: ReadonlyArray<{
    id: string;
    annotationKind: string;
    topRowIndex?: number;
    bottomRowIndex?: number;
  }>;
  readonly viewState: { zoomY: number };
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
  await page.locator('[data-role="command-palette"]').waitFor();
  await page.locator('[data-role="section-header"]').first().waitFor();
  return canvas;
}

/** Drag the floating palette away so it stops overlaying the drawing area. */
async function movePaletteAway(page: Page): Promise<void> {
  const handle = page.locator('[data-role="command-palette-drag-handle"]');
  const grip = await handle.boundingBox();
  if (grip === null) {
    return;
  }
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(4, 520, { steps: 12 });
  await page.mouse.up();
}

const sectionCount = (page: Page): Promise<number> =>
  page.locator('[data-role="section-header"]').count();
const trackCount = (page: Page): Promise<number> => page.locator('[data-role="track-label"]').count();
const detailCount = (page: Page): Promise<number> => page.locator('[data-role="detail-label"]').count();

/**
 * Zoom the row axis OUT (Alt + wheel) one notch at a time until `read` reaches
 * `target` or `maxSteps` is exhausted. The startup Fit picks the initial zoomY, so
 * the collapse thresholds are crossed after a zoom-relative number of steps rather
 * than an absolute one -- looping until the observable condition holds keeps the
 * test independent of the exact fitted zoom.
 */
async function zoomOutUntil(
  page: Page,
  read: () => Promise<number>,
  target: number,
  maxSteps: number,
): Promise<void> {
  for (let step = 0; step < maxSteps; step += 1) {
    if ((await read()) <= target) {
      return;
    }
    await page.keyboard.down('Alt');
    await page.mouse.wheel(0, 200);
    await page.keyboard.up('Alt');
  }
}

test.describe('classification tree (derived from item categories)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the template shows a 3-level sample: section, track and detail labels', async ({ page }) => {
    await openApp(page);
    expect(await sectionCount(page)).toBeGreaterThan(0);
    expect(await trackCount(page)).toBeGreaterThan(0);
    expect(await detailCount(page)).toBeGreaterThan(0);
  });

  test('zooming vertically OUT collapses detail then track, keeping the section', async ({ page }) => {
    const canvas = await openApp(page);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Full detail visible at the fitted startup zoom.
    expect(await detailCount(page)).toBeGreaterThan(0);
    expect(await trackCount(page)).toBeGreaterThan(0);

    // Phase 1: zoom out until zoomY drops below the MINOR threshold -> details
    // collapse onto their track lane, tracks and sections still shown.
    await zoomOutUntil(page, () => detailCount(page), 0, 40);
    expect(await detailCount(page)).toBe(0);
    expect(await trackCount(page)).toBeGreaterThan(0);
    expect(await sectionCount(page)).toBeGreaterThan(0);

    // Phase 2: zoom out further below the MIDDLE threshold -> tracks collapse onto
    // the section lane; only the major sections remain.
    await zoomOutUntil(page, () => trackCount(page), 0, 60);
    expect(await trackCount(page)).toBe(0);
    expect(await sectionCount(page)).toBeGreaterThan(0);
  });

  test('the property panel blocks setting a minor while the middle is empty', async ({ page }) => {
    const canvas = await openApp(page);
    // Rove the keyboard to the first visible item. Every template item now carries a
    // middle (中分類), so its minor input starts enabled; clearing the middle must
    // then disable the minor (minor requires middle).
    await canvas.focus();
    await canvas.press('Tab');

    const middle = page.locator('label').filter({ hasText: 'middle_category' }).locator('input');
    const minor = page.locator('label').filter({ hasText: 'minor_category' }).locator('input');
    await expect(minor).toBeVisible();
    // The selected item carries a middle, so minor starts enabled.
    await expect(middle).not.toHaveValue('');
    await expect(minor).toBeEnabled();

    // Clearing the middle must disable minor (minor requires middle).
    await middle.fill('');
    await middle.blur();
    await expect(minor).toBeDisabled();
  });

  test('a rounded box cannot be resized across a section boundary', async ({ page }) => {
    const canvas = await openApp(page);
    await movePaletteAway(page);

    const beforeIds = new Set(
      ((await exportDocument(page)).annotations ?? []).map((annotation) => annotation.id),
    );
    // Add a fresh box (created inside Phase 1 by the single-section create clamp).
    await page.getByRole('button', { name: 'Add box' }).dispatchEvent('click');
    const created = ((await exportDocument(page)).annotations ?? []).find(
      (annotation) => annotation.annotationKind === 'rounded-box' && !beforeIds.has(annotation.id),
    );
    expect(created).toBeDefined();
    if (created === undefined) {
      return;
    }

    // Select the box by clicking a free point on its border so its resize handles appear.
    const boxLocator = page.locator(`[data-role="annotation-box"][data-annotation-id="${created.id}"]`);
    await boxLocator.waitFor();
    const boxRect = await boxLocator.boundingBox();
    const canvasBox = await canvas.boundingBox();
    if (boxRect === null || canvasBox === null) {
      return;
    }
    await page.mouse.click(boxRect.x + boxRect.width / 2, boxRect.y + 1);
    await expect(page.locator('[data-role="annotation-selection"]')).toBeVisible();

    // Grab the south-east handle and drag it far DOWN, past Phase 1 into Phase 2.
    const handles = await page
      .locator('[data-role="annotation-handle"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const r = node.getBoundingClientRect();
          return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
        }),
      );
    expect(handles.length).toBeGreaterThan(0);
    const seHandle = handles.reduce((best, current) => (current.cx + current.cy > best.cx + best.cy ? current : best));
    await page.mouse.move(seHandle.cx, seHandle.cy);
    await page.mouse.down();
    await page.mouse.move(seHandle.cx, canvasBox.y + canvasBox.height - 6, { steps: 14 });
    await page.mouse.up();

    // The box stayed within its section: at zoomY = 1 the display rows equal the
    // level-0 rows, so Phase 1 occupies row indices [0, phase1RowCount - 1].
    const after = await exportDocument(page);
    const box = (after.annotations ?? []).find((annotation) => annotation.id === created.id);
    expect(box).toBeDefined();
    const phase1 = after.sections[0];
    expect(phase1).toBeDefined();
    if (box === undefined || phase1 === undefined) {
      return;
    }
    const phase1LastIndex = phase1.rowIds.length - 1;
    // The dragged bottom edge is clamped to Phase 1's last row, never into Phase 2.
    expect(box.bottomRowIndex ?? 0).toBeLessThanOrEqual(phase1LastIndex);
    expect(box.topRowIndex ?? 0).toBeLessThanOrEqual(phase1LastIndex);
  });
});

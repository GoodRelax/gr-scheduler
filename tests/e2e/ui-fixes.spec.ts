import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the batch of real-app UI fixes:
 *  1. the two floating palettes are merged into ONE (single role="toolbar");
 *  3. double-click minimizes the palette to a small handle and re-expands it;
 *  4. the palette can be dragged up into the header band;
 *  6. the date ruler shows three stacked tiers with no overlapping labels;
 *  9. wheel remap: plain wheel scrolls vertically (zoom unchanged), Shift zooms
 *     the time axis only, Alt zooms the row axis only;
 *  8. newly created items default to a transparent stroke (no border).
 *
 * Runs against the built single-file app (`dist/index.html`); build first. Reads
 * the live renderer view state via a JSON export (export merges renderer view
 * state), matching interaction-hardening.spec.ts.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedView {
  readonly items: ReadonlyArray<{ id: string; strokeColor: string }>;
  readonly viewState: { zoomX: number; zoomY: number; scrollX: number; scrollY: number };
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
}

test.describe('gr-scheduler UI fixes', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the two palettes are merged into ONE toolbar with the shape picker inside', async ({
    page,
  }) => {
    await openApp(page);
    // Exactly two toolbar landmarks: the merged command palette (this test's focus --
    // the shape picker lives inside it, not a separate panel) and the CR-003 header
    // actions row (`[data-role="header-actions"]`, a distinct toolbar added later).
    await expect(page.locator('#app [role="toolbar"]')).toHaveCount(2);
    await expect(page.locator('[data-role="header-actions"][role="toolbar"]')).toHaveCount(1);
    const palette = page.locator('[data-role="command-palette"]');
    await expect(palette).toHaveAttribute('role', 'toolbar');
    // The shape picker now lives INSIDE that one palette (no separate panel).
    await expect(palette.getByRole('button', { name: 'Task bar' })).toHaveCount(1);
    // Undo moved to the header (SHELL item 4); it is NOT in the palette anymore.
    await expect(palette.getByRole('button', { name: 'Undo' })).toHaveCount(0);
    await expect(page.locator('[data-role="app-header"] button[data-role="undo"]')).toHaveCount(1);
    // The icon-asset import stays reachable within the palette.
    await expect(palette.getByRole('button', { name: 'Import icon' })).toHaveCount(1);
    // No lingering second toolbar from the old shape palette.
    await expect(page.locator('[data-role="tool-palette"]')).toHaveCount(0);
  });

  test('double-clicking the palette minimizes it to a small handle, then re-expands', async ({
    page,
  }) => {
    await openApp(page);
    const palette = page.locator('[data-role="command-palette"]');
    const fileGroupButton = palette.getByRole('button', { name: 'Import icon' });
    const minimize = page.getByRole('button', { name: 'Minimize toolbar' });
    await expect(fileGroupButton).toBeVisible();
    const expandedWidth = (await palette.boundingBox())?.width ?? 0;

    // Double-click the drag handle to minimize.
    await page.locator('[data-role="command-palette-drag-handle"]').dblclick();
    expect(await palette.getAttribute('data-minimized')).toBe('true');
    // The command groups collapse: the export button is no longer shown ...
    await expect(fileGroupButton).toBeHidden();
    // ... but the expand toggle stays reachable (keyboard operable).
    const expandToggle = page.getByRole('button', { name: 'Expand toolbar' });
    await expect(expandToggle).toBeVisible();
    const minimizedWidth = (await palette.boundingBox())?.width ?? 0;
    expect(minimizedWidth).toBeLessThan(expandedWidth);

    // Double-click again to expand.
    await page.locator('[data-role="command-palette-drag-handle"]').dblclick();
    expect(await palette.getAttribute('data-minimized')).toBe('false');
    await expect(fileGroupButton).toBeVisible();
    // The toggle button itself (same element) still works via keyboard/click.
    await minimize.click();
    expect(await palette.getAttribute('data-minimized')).toBe('true');
  });

  test('the palette can be dragged up into the header band', async ({ page }) => {
    await openApp(page);
    const palette = page.locator('[data-role="command-palette"]');
    const handle = page.locator('[data-role="command-palette-drag-handle"]');
    const header = page.locator('[data-role="app-header"]');
    const headerBox = await header.boundingBox();
    const grip = await handle.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(grip).not.toBeNull();
    if (headerBox === null || grip === null) {
      return;
    }
    // Drag the grip to the very top-left corner (into/over the header band).
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(6, 2, { steps: 12 });
    await page.mouse.up();

    const after = await palette.boundingBox();
    expect(after).not.toBeNull();
    if (after === null) {
      return;
    }
    // It reaches into the header band (top within the header height) yet stays
    // on-screen (not clamped below the header, not off the top edge).
    expect(after.y).toBeLessThan(headerBox.y + headerBox.height);
    expect(after.y).toBeGreaterThanOrEqual(0);
  });

  test('the date ruler has three stacked tiers with no overlapping labels when zoomed in', async ({
    page,
  }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    // Zoom the time axis in with Shift + wheel until the finest (3-tier) ruler shows.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const ruler = page.locator('[data-role="date-ruler"]');
    await page.mouse.move(cx, cy);
    await page.keyboard.down('Shift');
    // The ASPICE sample frames ~3 years, so the startup Fit is more zoomed OUT; keep
    // taking zoom-in notches until the finest (3-tier) ruler shows (capped so a real
    // regression still fails fast). Extra notches are harmless (the ruler caps at
    // three tiers).
    for (let i = 0; i < 60 && (await ruler.getAttribute('data-tier-count')) !== '3'; i += 1) {
      await page.mouse.wheel(0, -40);
    }
    await page.keyboard.up('Shift');
    await expect.poll(async () => ruler.getAttribute('data-tier-count')).toBe('3');

    // For each tier, the kept labels must not overlap horizontally.
    const overlapByTier = await page.evaluate(() => {
      const labels = Array.from(
        document.querySelectorAll<SVGTextElement>('[data-role="date-ruler-label"]'),
      );
      const byTier = new Map<string, DOMRect[]>();
      for (const label of labels) {
        const tier = label.getAttribute('data-tier') ?? '?';
        const rects = byTier.get(tier) ?? [];
        rects.push(label.getBoundingClientRect());
        byTier.set(tier, rects);
      }
      let maxOverlap = 0;
      for (const rects of byTier.values()) {
        rects.sort((a, b) => a.left - b.left);
        for (let i = 1; i < rects.length; i += 1) {
          const overlap = (rects[i - 1]?.right ?? 0) - (rects[i]?.left ?? 0);
          maxOverlap = Math.max(maxOverlap, overlap);
        }
      }
      return { tierCount: byTier.size, maxOverlap };
    });
    expect(overlapByTier.tierCount).toBe(3);
    // Glyph bounding boxes carry small side bearings; a <=2px touch is not a visible
    // collision. The density-aware LOD keeps real gaps between kept labels.
    expect(overlapByTier.maxOverlap).toBeLessThanOrEqual(2);
  });

  test('plain wheel scrolls vertically without zooming; Shift/Alt zoom a single axis', async ({
    page,
  }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);

    // The Model H fixture (26 items) fits entirely within the startup Fit's zoomY, so
    // there is no vertical overflow to scroll into. Zoom the row axis IN first (setup,
    // not the behavior under test) so scrollY has room to move, then scroll back to
    // the top -- zooming anchors on the cursor and can itself push scrollY toward its
    // new max, which would otherwise leave no headroom for the assertion below.
    await page.keyboard.down('Alt');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Alt');
    await page.mouse.wheel(0, -100_000);

    const before = (await exportView(page)).viewState;
    // exportView opens the header Save menu, which moves the real pointer off the
    // canvas; re-center it before the next wheel gesture (the Save-menu round trip
    // itself must never be mistaken for the wheel behavior under test).
    await page.mouse.move(cx, cy);

    // Plain wheel -> vertical scroll only (zoom unchanged).
    await page.mouse.wheel(0, 240);
    const afterScroll = (await exportView(page)).viewState;
    expect(afterScroll.scrollY).toBeGreaterThan(before.scrollY);
    expect(afterScroll.zoomX).toBeCloseTo(before.zoomX, 5);
    expect(afterScroll.zoomY).toBeCloseTo(before.zoomY, 5);
    await page.mouse.move(cx, cy);

    // Shift + wheel -> zoom the time (width) axis only.
    await page.keyboard.down('Shift');
    await page.mouse.wheel(0, -120);
    await page.keyboard.up('Shift');
    const afterShift = (await exportView(page)).viewState;
    expect(afterShift.zoomX).toBeGreaterThan(afterScroll.zoomX);
    expect(afterShift.zoomY).toBeCloseTo(afterScroll.zoomY, 5);
    await page.mouse.move(cx, cy);

    // Alt + wheel -> zoom the row (height) axis only.
    await page.keyboard.down('Alt');
    await page.mouse.wheel(0, -120);
    await page.keyboard.up('Alt');
    const afterAlt = (await exportView(page)).viewState;
    expect(afterAlt.zoomY).toBeGreaterThan(afterShift.zoomY);
    expect(afterAlt.zoomX).toBeCloseTo(afterShift.zoomX, 5);
  });

  test('the properties panel fits its full field set without a vertical scrollbar', async ({
    page,
  }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const idsBefore = new Set((await exportView(page)).items.map((item) => item.id));
    // Create + select a task so the full property form (all fields) is shown.
    await page.getByRole('button', { name: 'Task bar' }).dispatchEvent('click');
    await canvas.focus();
    await canvas.press('Enter');
    const created = (await exportView(page)).items.find((item) => !idsBefore.has(item.id));
    expect(created).toBeDefined();
    await page.locator(`svg [data-item-id="${created?.id ?? ''}"]`).waitFor();

    // Placing an item selects it, so the full property form is shown.
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    const form = panel.locator('[data-role="form"]');
    await expect(form).toBeVisible();
    // With the compact sizing, the content height fits the panel: no scrollbar.
    const overflow = await panel.evaluate((node) => node.scrollHeight - node.clientHeight);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('newly created items default to a transparent stroke (no border)', async ({ page }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const before = await exportView(page);
    const idsBefore = new Set(before.items.map((item) => item.id));

    // Arm a task shape and place it with Enter on the focused canvas.
    await page.getByRole('button', { name: 'Task bar' }).dispatchEvent('click');
    await canvas.focus();
    await canvas.press('Enter');

    const after = await exportView(page);
    const created = after.items.find((item) => !idsBefore.has(item.id));
    expect(created).toBeDefined();
    expect(created?.strokeColor).toBe('transparent');
  });
});

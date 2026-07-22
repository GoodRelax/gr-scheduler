import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the real-app interaction/UX batch:
 *  1.  hit-test CALIBRATION (priority): clicking a bar's visible center selects
 *      it, and dragging it by N screen-px moves its dates by the mapped days;
 *  2.  a pointer (hand) cursor shows over selectable items;
 *  3.  a plain empty-canvas drag does NOT scroll the schedule;
 *  4.  Ctrl + drag pans the schedule;
 *  5.  Ctrl/Shift/Alt wheel zoom keeps the world point under the cursor fixed;
 *  7.  Fit frames the whole schedule (also applied on startup);
 *  8.  Plan and Actual are two independent aria-pressed toggles;
 *  9.  the benchmark button is gone from the palette (but `?bench=` still works);
 * 10.  the property panel has an × close and double-click opens it;
 * 12.  a Fullscreen toggle button exists.
 *
 * Runs against the built single-file app (`dist/index.html`); build first. Reads
 * live renderer view state via a JSON export (export merges renderer view state).
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedItem {
  id: string;
  startDate: string;
  endDate: string | null;
}
interface ExportedView {
  readonly items: readonly ExportedItem[];
  readonly viewState: {
    zoomX: number;
    zoomY: number;
    scrollX: number;
    scrollY: number;
    leftPaneWidth?: number;
    planActualDisplay?: string;
  };
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
  // Fit-on-startup runs on the next frame; wait for the template items to mount.
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

/** Whole-days-per-pixel epoch-day of an ISO date. */
function dayNumber(iso: string): number {
  return Math.round(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);
}

test.describe('gr-scheduler interaction batch', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('CALIBRATION: clicking a bar visible center selects it (fix 1)', async ({ page }) => {
    await openApp(page);
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"]');
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    // Click the item's VISIBLE center. With screenToWorld the exact inverse of the
    // render transform, this must hit the item, not a point offset from it.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    // The selected item carries its dashed selection outline marker.
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="selection-outline"]'),
    ).toHaveCount(1);
    // No OTHER item is selected (the click landed on exactly the one under it).
    await expect(page.locator('svg [data-role="selection-outline"]')).toHaveCount(1);
  });

  test('CALIBRATION: dragging a selected item right moves its dates by the mapped days (fix 1)', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    const before = await exportView(page);
    // oa-phase-plan-dev starts on day 45; the next distinct item start to its right
    // is ~5 days beyond a small drag's landing, so alignment snapping (6px) cannot
    // fire -- isolating pure 1:1 tracking from the deliberate snap feature.
    const target = before.items.find((item) => item.id === 'oa-phase-plan-dev');
    expect(target).toBeDefined();
    const startBefore = dayNumber(target?.startDate ?? '');

    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"]');
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    if (box === null || target === undefined) {
      return;
    }
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Drag purely horizontally by a known pixel amount (no row change).
    const dragPx = 80;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dragPx, cy, { steps: 12 });
    await page.mouse.up();

    const after = await exportView(page);
    const moved = after.items.find((item) => item.id === 'oa-phase-plan-dev');
    expect(moved).toBeDefined();
    const startAfter = dayNumber(moved?.startDate ?? '');

    // px map to days by pixelsPerDay = 6 * zoomX (1:1 tracking); allow 1 day slack
    // for rounding / snapping.
    const pixelsPerDay = 6 * before.viewState.zoomX;
    const expectedDays = Math.round(dragPx / pixelsPerDay);
    expect(startAfter - startBefore).toBeGreaterThanOrEqual(expectedDays - 1);
    expect(startAfter - startBefore).toBeLessThanOrEqual(expectedDays + 1);
    // The item actually moved to the right (positive, non-trivial delta).
    expect(startAfter).toBeGreaterThan(startBefore);
  });

  test('a pointer cursor shows over a selectable item (fix 2)', async ({ page }) => {
    await openApp(page);
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"]');
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const cursor = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      const host = svg?.parentElement;
      return host === null || host === undefined ? '' : getComputedStyle(host).cursor;
    });
    expect(cursor).toBe('pointer');
  });

  test('a plain empty-canvas drag does NOT scroll (fix 3)', async ({ page }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    const before = (await exportView(page)).viewState;
    // Find an empty point (no item under it) inside the schedule area.
    const empty = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      const rect = svg?.getBoundingClientRect();
      if (rect === undefined) {
        return null;
      }
      for (let y = rect.bottom - 8; y > rect.top + 40; y -= 12) {
        for (let x = rect.right - 8; x > rect.left + 220; x -= 16) {
          const element = document.elementFromPoint(x, y);
          if (element !== null && element.closest('[data-item-id]') === null) {
            return { x, y };
          }
        }
      }
      return null;
    });
    expect(empty).not.toBeNull();
    if (empty === null) {
      return;
    }
    await page.mouse.move(empty.x, empty.y);
    await page.mouse.down();
    await page.mouse.move(empty.x - 120, empty.y - 90, { steps: 12 });
    await page.mouse.up();

    const after = (await exportView(page)).viewState;
    expect(after.scrollX).toBeCloseTo(before.scrollX, 3);
    expect(after.scrollY).toBeCloseTo(before.scrollY, 3);
  });

  test('Ctrl + drag pans the schedule (fix 4)', async ({ page }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    const before = (await exportView(page)).viewState;
    const cx = box.x + box.width * 0.6;
    const cy = box.y + box.height * 0.6;
    await page.keyboard.down('Control');
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 100, cy - 70, { steps: 12 });
    await page.mouse.up();
    await page.keyboard.up('Control');

    const after = (await exportView(page)).viewState;
    // Dragging left/up increases scrollX/scrollY (content moves with the cursor).
    expect(after.scrollX).toBeGreaterThan(before.scrollX + 20);
    expect(after.scrollY).toBeGreaterThan(before.scrollY + 20);
  });

  test('Shift-wheel zoom keeps the date under the cursor fixed (fix 5)', async ({ page }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    const before = await exportView(page);
    const svgRect = await canvas.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left, top: r.top };
    });
    const cursorClientX = box.x + box.width * 0.55;
    const leftPane = before.viewState.leftPaneWidth ?? 200;
    const localX = cursorClientX - svgRect.left - leftPane;
    const dayUnder = (view: ExportedView['viewState']): number =>
      (view.scrollX + localX) / (6 * view.zoomX);
    const dayBefore = dayUnder(before.viewState);

    await page.mouse.move(cursorClientX, box.y + box.height / 2);
    await page.keyboard.down('Shift');
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, -40);
    }
    await page.keyboard.up('Shift');

    const after = await exportView(page);
    expect(after.viewState.zoomX).toBeGreaterThan(before.viewState.zoomX);
    const dayAfter = dayUnder(after.viewState);
    // The same calendar day stays under the cursor (anchored), within ~1 day.
    expect(Math.abs(dayAfter - dayBefore)).toBeLessThanOrEqual(1);
  });

  test('Fit frames the whole schedule: first and last items are on-screen (fix 7)', async ({
    page,
  }) => {
    await openApp(page);
    // Scroll far away first so Fit has to bring content back.
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    if (box === null) {
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 2000);

    // Target the header's [Fit] specifically: DEF-013 -- a leftover floating-palette
    // Fit button shares the identical accessible name "Fit schedule to view" (strict
    // mode violation on a name-based lookup); see the DEF-013 defect record.
    await page.locator('button[data-role="header-fit"]').click();
    // Wait a frame for the fitted re-render.
    await page.locator('svg [data-item-id="oa-ms-plan-kickoff"]').waitFor();
    await page.locator('svg [data-item-id="oa-ms-plan-launch"]').waitFor();

    const withinViewport = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      const rect = svg?.getBoundingClientRect();
      if (rect === undefined) {
        return false;
      }
      const check = (id: string): boolean => {
        const node = document.querySelector(`svg [data-item-id="${id}"]`);
        if (node === null) {
          return false;
        }
        // Measure the GLYPH shape (rect/path), not the group -- the abbreviation
        // label may legitimately overhang the right edge; the item itself must be
        // framed.
        const shape = node.querySelector('rect, path') ?? node;
        const b = (shape as SVGGraphicsElement).getBoundingClientRect();
        return (
          b.left >= rect.left - 2 &&
          b.right <= rect.right + 2 &&
          b.top >= rect.top - 2 &&
          b.bottom <= rect.bottom + 2
        );
      };
      // First item, last item, and rows top-to-bottom are all framed.
      return check('oa-ms-plan-kickoff') && check('oa-ms-plan-launch');
    });
    expect(withinViewport).toBe(true);
  });

  test('Plan and Actual are two independent aria-pressed toggles (fix 8)', async ({ page }) => {
    await openApp(page);
    const plan = page.getByRole('button', { name: /^Plan:/ });
    const actual = page.getByRole('button', { name: /^Actual:/ });
    await expect(plan).toHaveAttribute('aria-pressed', 'true');
    await expect(actual).toHaveAttribute('aria-pressed', 'true');

    // Turning Plan off leaves Actual on -> display 'actual-only'.
    await plan.click();
    await expect(plan).toHaveAttribute('aria-pressed', 'false');
    await expect(actual).toHaveAttribute('aria-pressed', 'true');
    expect((await exportView(page)).viewState.planActualDisplay).toBe('actual-only');

    // Turning Actual off too -> both off -> 'none'.
    await actual.click();
    await expect(actual).toHaveAttribute('aria-pressed', 'false');
    expect((await exportView(page)).viewState.planActualDisplay).toBe('none');

    // Turning Plan back on -> 'plan-only'.
    await plan.click();
    expect((await exportView(page)).viewState.planActualDisplay).toBe('plan-only');
  });

  test('the benchmark button is gone from the palette (fix 9)', async ({ page }) => {
    await openApp(page);
    await expect(page.getByRole('button', { name: 'Run benchmark' })).toHaveCount(0);
  });

  test('the property panel closes with × and re-opens on double-click (fix 10)', async ({
    page,
  }) => {
    await openApp(page);
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    const closeButton = panel.getByRole('button', { name: 'Close properties panel' });
    const toggle = page.getByRole('button', { name: 'Toggle properties panel' });
    await expect(panel).toBeVisible();

    // × hides the panel and syncs the toolbar toggle's state. Dispatched directly
    // (the established pattern in this repo) because the translucent floating
    // toolbar overlaps the panel's top-right corner where the × sits.
    await closeButton.dispatchEvent('click');
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Double-clicking an item re-opens the panel and selects that item.
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"]');
    const box = await bar.boundingBox();
    if (box === null) {
      return;
    }
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="selection-outline"]'),
    ).toHaveCount(1);
  });

  test('a Fullscreen toggle button exists in the palette (fix 12)', async ({ page }) => {
    await openApp(page);
    const button = page.getByRole('button', { name: /Toggle fullscreen/ });
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('the milestone and task shape icons sit on one aligned row (fix 13)', async ({ page }) => {
    await openApp(page);
    const shapesRow = page.locator('[data-role="shape-groups"]');
    await expect(shapesRow).toHaveCount(1);
    // A milestone glyph button and a task glyph button share (near) the same top.
    const milestone = shapesRow.getByRole('button', { name: 'Milestone diamond' });
    const task = shapesRow.getByRole('button', { name: 'Task bar' });
    const mBox = await milestone.boundingBox();
    const tBox = await task.boundingBox();
    expect(mBox).not.toBeNull();
    expect(tBox).not.toBeNull();
    if (mBox === null || tBox === null) {
      return;
    }
    expect(Math.abs(mBox.y - tBox.y)).toBeLessThanOrEqual(2);
  });
});

import { test, expect, type Page, type Locator } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end interaction-hardening specs (real gestures). These cover UX/display
 * defects that unit tests missed because they are pointer/keyboard/display
 * behaviors: command-palette drag, properties show/hide, task edge resize,
 * rounded-box select + delete, the fixed date ruler, and the default arrow cursor.
 *
 * Runs against the built single-file app (`dist/index.html`); run `npm run build`
 * first. Kept out of the Vitest run and self-skips when the app is not built,
 * matching a11y.spec.ts / user-flow-smoke.spec.ts:
 *
 *   npm run build && npx playwright install chromium && npm run test:e2e
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedDocument {
  readonly items: ReadonlyArray<{ id: string; itemKind: string; startDate: string; endDate: string | null }>;
  readonly annotations?: ReadonlyArray<{ id: string; annotationKind: string }>;
}

/**
 * Click "Export JSON", capture the download, and parse it. Dispatches the DOM
 * 'click' directly (not a pointer click) so the toolbar button's handler always
 * fires, immune to the editing controller's capture-phase pointer grab when the
 * floating palette overlaps a sample item (see user-flow-smoke.spec.ts).
 */
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

/** Whole days between two ISO dates. */
function dayDelta(fromIso: string, toIso: string): number {
  return (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000;
}

async function openApp(page: Page): Promise<Locator> {
  await page.goto(pathToFileURL(builtAppFile).href);
  const canvas = page.locator('svg[data-role="schedule-canvas"]');
  await canvas.waitFor();
  await page.locator('[data-role="command-palette"]').waitFor();
  return canvas;
}

/**
 * Drag the floating command palette to the bottom-left so it stops overlaying the
 * viewport-center drawing area (the palette correctly intercepts its own clicks,
 * so canvas gestures under it are blocked by design). Exercises fix 1 as a bonus.
 */
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

test.describe('interaction hardening', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the command palette is drag-movable by its grip and stays on-screen', async ({ page }) => {
    await openApp(page);
    const palette = page.locator('[data-role="command-palette"]');
    const handle = page.locator('[data-role="command-palette-drag-handle"]');
    const before = await palette.boundingBox();
    const grip = await handle.boundingBox();
    expect(before).not.toBeNull();
    expect(grip).not.toBeNull();
    if (before === null || grip === null) {
      return;
    }
    // Drag the grip toward the top-left corner.
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x - 160, grip.y + 120, { steps: 10 });
    await page.mouse.up();

    const after = await palette.boundingBox();
    expect(after).not.toBeNull();
    if (after === null) {
      return;
    }
    // It moved left and down, and remains within the viewport.
    expect(after.x).toBeLessThan(before.x - 40);
    expect(after.y).toBeGreaterThan(before.y + 40);
    expect(after.x).toBeGreaterThanOrEqual(0);
    expect(after.y).toBeGreaterThanOrEqual(0);
  });

  test('the properties panel toggles hidden/shown and the canvas reclaims the width', async ({ page }) => {
    const canvas = await openApp(page);
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    const toggle = page.getByRole('button', { name: 'Toggle properties panel' });
    await expect(panel).toBeVisible();

    const widthShown = (await canvas.boundingBox())?.width ?? 0;
    await toggle.click();
    await expect(panel).toBeHidden();
    const widthHidden = (await canvas.boundingBox())?.width ?? 0;
    // Hiding the fixed panel widens the flex canvas.
    expect(widthHidden).toBeGreaterThan(widthShown + 100);

    await toggle.click();
    await expect(panel).toBeVisible();
    const widthReshown = (await canvas.boundingBox())?.width ?? 0;
    expect(widthReshown).toBeLessThan(widthHidden - 100);
  });

  test('dragging a task right edge changes its end date (length)', async ({ page }) => {
    const canvas = await openApp(page);
    // Clear the viewport center so the created task is on open canvas.
    await movePaletteAway(page);

    // Create a task deterministically via keyboard: arm the shape, then Enter on
    // the focused canvas places a 7-day task at the viewport-center row.
    const before = await exportDocument(page);
    const idsBefore = new Set(before.items.map((item) => item.id));
    await page.getByRole('button', { name: 'Task bar' }).dispatchEvent('click');
    await canvas.focus();
    await canvas.press('Enter');

    const afterCreate = await exportDocument(page);
    const created = afterCreate.items.find((item) => !idsBefore.has(item.id));
    expect(created).toBeDefined();
    if (created === undefined || created.endDate === null) {
      return;
    }
    const group = page.locator(`svg [data-item-id="${created.id}"]`);
    await group.waitFor();
    // Target the BAR shape itself (the first <rect> child), not the group box,
    // which also spans the abbreviation label to the right of the bar.
    const bar = group.locator('rect').first();
    const rect = await bar.boundingBox();
    expect(rect).not.toBeNull();
    if (rect === null) {
      return;
    }
    // Grab the right edge (within the resize zone) and drag it further right.
    const midY = rect.y + rect.height / 2;
    await page.mouse.move(rect.x + rect.width - 3, midY);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width + 60, midY, { steps: 10 });
    await page.mouse.up();

    const afterResize = await exportDocument(page);
    const resized = afterResize.items.find((item) => item.id === created.id);
    expect(resized).toBeDefined();
    if (resized === undefined || resized.endDate === null) {
      return;
    }
    // The end edge moved later, so the task got longer.
    expect(dayDelta(created.endDate, resized.endDate)).toBeGreaterThan(0);
    // The start edge did not move (this was a resize, not a move).
    expect(resized.startDate).toBe(created.startDate);
  });

  test('a rounded box can be selected by click and deleted, and Undo restores it', async ({ page }) => {
    await openApp(page);
    // Clear the viewport center so the created box is on open, clickable canvas.
    await movePaletteAway(page);

    const before = await exportDocument(page);
    const boxesBefore = (before.annotations ?? []).filter((a) => a.annotationKind === 'rounded-box').length;
    const idsBefore = new Set((before.annotations ?? []).map((a) => a.id));

    // Add a fresh rounded box at the viewport center (deterministic on-screen).
    await page.getByRole('button', { name: 'Add box' }).dispatchEvent('click');
    const afterCreate = await exportDocument(page);
    const created = (afterCreate.annotations ?? []).find((a) => !idsBefore.has(a.id));
    expect(created).toBeDefined();
    if (created === undefined) {
      return;
    }

    const boxRect = page.locator(`[data-role="annotation-box"][data-annotation-id="${created.id}"]`);
    await boxRect.waitFor();
    const box = await boxRect.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }

    // Pick a point on the box border that no visible item overlaps, so the click
    // selects the annotation rather than an item underneath (items take
    // precedence, by design).
    const itemBoxes = await page.locator('svg [data-item-id]').evaluateAll((groups) =>
      groups.map((group) => group.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y, w: r.width, h: r.height })),
    );
    const rulerBottom = await page
      .locator('[data-role="date-ruler"]')
      .evaluate((element) => element.getBoundingClientRect().bottom);
    const clickPoint = pickFreeBorderPoint(box, itemBoxes, rulerBottom);
    expect(clickPoint).not.toBeNull();
    if (clickPoint === null) {
      return;
    }
    await page.mouse.click(clickPoint.x, clickPoint.y);

    // Selection is wired: the selection highlight/handles appear for the box.
    await expect(page.locator('[data-role="annotation-selection"]')).toBeVisible();

    // Delete removes it (undoable via the store), regardless of focus target.
    await page.keyboard.press('Delete');
    const afterDelete = await exportDocument(page);
    expect((afterDelete.annotations ?? []).some((a) => a.id === created.id)).toBe(false);
    expect((afterDelete.annotations ?? []).filter((a) => a.annotationKind === 'rounded-box').length).toBe(
      boxesBefore,
    );

    // Undo brings the box back.
    await page.keyboard.press('Control+z');
    const afterUndo = await exportDocument(page);
    expect((afterUndo.annotations ?? []).some((a) => a.id === created.id)).toBe(true);
  });

  test('a fixed date ruler shows year/month/day and stays at the top on vertical scroll', async ({ page }) => {
    const canvas = await openApp(page);
    const ruler = page.locator('[data-role="date-ruler"]');
    await ruler.waitFor();

    // It shows granularity text (a 4-digit year at the medium default zoom).
    const labels = await page
      .locator('[data-role="date-ruler-label"]')
      .allTextContents();
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some((text) => /\d{4}/.test(text))).toBe(true);

    const canvasBox = await canvas.boundingBox();
    const rulerBefore = await ruler.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(rulerBefore).not.toBeNull();
    if (canvasBox === null || rulerBefore === null) {
      return;
    }
    // The ruler sits at the very top of the canvas.
    expect(Math.abs(rulerBefore.y - canvasBox.y)).toBeLessThan(3);

    // Vertically pan the canvas by dragging an empty lower-right area.
    const panX = canvasBox.x + canvasBox.width * 0.82;
    const panY = canvasBox.y + canvasBox.height * 0.6;
    await page.mouse.move(panX, panY);
    await page.mouse.down();
    await page.mouse.move(panX, panY - 140, { steps: 8 });
    await page.mouse.up();

    const rulerAfter = await ruler.boundingBox();
    expect(rulerAfter).not.toBeNull();
    if (rulerAfter === null) {
      return;
    }
    // The ruler did NOT scroll away vertically: it is still pinned to the top.
    expect(Math.abs(rulerAfter.y - rulerBefore.y)).toBeLessThan(3);
  });

  test('the canvas default cursor is a normal arrow, not grab', async ({ page }) => {
    await openApp(page);
    const cursor = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      const host = svg?.parentElement;
      return host === null || host === undefined ? '' : getComputedStyle(host).cursor;
    });
    expect(cursor).not.toBe('grab');
    expect(cursor).toBe('default');
  });
});

/** A screen point, or null when none was found. */
interface Point {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned box in client coordinates. */
interface ClientBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Pick a point on the box's left or top border that lies below the ruler and does
 * not fall inside any item box, so a click there selects the annotation.
 */
function pickFreeBorderPoint(
  box: { x: number; y: number; width: number; height: number },
  itemBoxes: readonly ClientBox[],
  rulerBottom: number,
): Point | null {
  const insideAnyItem = (x: number, y: number): boolean =>
    itemBoxes.some((item) => x >= item.x - 2 && x <= item.x + item.w + 2 && y >= item.y - 2 && y <= item.y + item.h + 2);
  const candidates: Point[] = [];
  // Along the left edge, top-to-bottom.
  for (let t = 0.15; t <= 0.9; t += 0.1) {
    candidates.push({ x: box.x + 1, y: box.y + box.height * t });
  }
  // Along the top edge, left-to-right.
  for (let t = 0.15; t <= 0.9; t += 0.1) {
    candidates.push({ x: box.x + box.width * t, y: box.y + 1 });
  }
  for (const point of candidates) {
    if (point.y > rulerBottom + 2 && !insideAnyItem(point.x, point.y)) {
      return point;
    }
  }
  return null;
}

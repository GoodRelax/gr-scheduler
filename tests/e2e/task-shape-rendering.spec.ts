import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the task-shape rendering batch, asserting the ACTUAL
 * rendered SVG DOM against the built single-file app (unit-green-but-live-broken has
 * bitten this project repeatedly, so each item is verified on real geometry):
 *
 *  1. A bar task shows a centered abbreviation sized to ~90% of the bar height.
 *  3. An arrow renders a stroked LINE + open head (fill=none, thicker weight) with the
 *     abbreviation ABOVE the connector line.
 *  4. A span renders a connector with two filled dot terminals, label above the line.
 *  5. A chevron created via the palette defaults to a 14/14-day feather, and dragging a
 *     fade corner changes the fade (undoable).
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

interface ExportedItem {
  id: string;
  itemKind: string;
  iconShapeKind?: string;
  taskShape?: string;
  fadeInDays?: number;
  fadeOutDays?: number;
}
interface ExportedView {
  readonly items: readonly ExportedItem[];
}

async function exportView(page: Page): Promise<ExportedView> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).dispatchEvent('click'),
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
  await page.locator('svg [data-item-id="oa-phase-plan-dev"]').waitFor();
}

/** Dock the floating command palette to the LEFT so it clears the right creation strip. */
async function movePaletteLeft(page: Page): Promise<void> {
  const handle = page.locator('[data-role="command-palette-drag-handle"]');
  const box = await handle.boundingBox();
  if (box === null) {
    return;
  }
  // Dock the palette to the BOTTOM-left so it clears both the top schedule rows
  // (where the wide "Over All Schedule" phase bars sit in the ASPICE sample) and
  // the right-hand creation strip.
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(120, 700, { steps: 6 });
  await page.mouse.up();
}

/** Arm a palette shape then drag to create it on the empty right strip of the canvas. */
async function createShapeOnRightStrip(page: Page, buttonName: string, fractionY: number): Promise<void> {
  const svg = page.locator('svg[data-role="schedule-canvas"]');
  const svgBox = (await svg.boundingBox())!;
  await page.getByRole('button', { name: buttonName }).click();
  const y = svgBox.y + svgBox.height * fractionY;
  const startX = svgBox.x + svgBox.width - 80;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(startX + 50, y, { steps: 6 });
  await page.mouse.up();
}

test.describe('gr-scheduler task-shape rendering', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('1. a bar task shows a centered abbreviation sized to ~90% of the bar height', async ({ page }) => {
    await openApp(page);
    const geometry = await page.evaluate(() => {
      const group = document.querySelector('svg [data-item-id="oa-phase-plan-dev"]');
      const rect = group?.querySelector('rect:not([data-role])');
      const text = group?.querySelector('text');
      if (rect === null || rect === undefined || text === null || text === undefined) {
        return null;
      }
      return {
        rectX: Number(rect.getAttribute('x')),
        rectWidth: Number(rect.getAttribute('width')),
        rectHeight: Number(rect.getAttribute('height')),
        fontSize: Number(text.getAttribute('font-size')),
        textAnchor: text.getAttribute('text-anchor'),
        textX: Number(text.getAttribute('x')),
      };
    });
    expect(geometry).not.toBeNull();
    if (geometry === null) {
      return;
    }
    // Font-size == 0.9 x the rendered bar height (world px == screen px; group is only translated).
    expect(geometry.fontSize).toBeCloseTo(geometry.rectHeight * 0.9, 3);
    // Centered horizontally inside the bar.
    expect(geometry.textAnchor).toBe('middle');
    expect(geometry.textX).toBeGreaterThanOrEqual(geometry.rectX);
    expect(geometry.textX).toBeLessThanOrEqual(geometry.rectX + geometry.rectWidth);
  });

  test('3. an arrow renders a line + open head (not a block) with the label above the line', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteLeft(page);
    await createShapeOnRightStrip(page, 'Task arrow', 0.35);
    await expect.poll(() => page.locator('svg [data-task-shape="arrow"]').count()).toBeGreaterThan(0);

    const arrow = await page.evaluate(() => {
      const path = document.querySelector('svg [data-task-shape="arrow"]');
      const group = path?.closest('[data-item-id]');
      const text = group?.querySelector('text');
      if (path === null || path === undefined || text === null || text === undefined) {
        return null;
      }
      const d = path.getAttribute('d') ?? '';
      return {
        tag: path.tagName.toLowerCase(),
        fill: path.getAttribute('fill'),
        strokeWidth: Number(path.getAttribute('stroke-width')),
        subpaths: (d.match(/M /g) ?? []).length,
        hasClose: d.includes('Z'),
        lineY: Number(path.getAttribute('data-connector-line-y')),
        labelY: Number(text.getAttribute('y')),
      };
    });
    expect(arrow).not.toBeNull();
    if (arrow === null) {
      return;
    }
    expect(arrow.tag).toBe('path');
    expect(arrow.fill).toBe('none'); // a LINE arrow, not a filled block
    expect(arrow.strokeWidth).toBe(3); // the thicker weight
    expect(arrow.subpaths).toBe(2); // shaft + open head
    expect(arrow.hasClose).toBe(false); // open head (no fill), not a closed polygon
    expect(arrow.labelY).toBeLessThan(arrow.lineY); // abbreviation sits ABOVE the line
  });

  test('4. a span renders a connector with two filled dot terminals, label above the line', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteLeft(page);
    await createShapeOnRightStrip(page, 'Task span', 0.5);
    await expect.poll(() => page.locator('svg [data-task-shape="span"]').count()).toBeGreaterThan(0);

    const span = await page.evaluate(() => {
      const path = document.querySelector('svg [data-task-shape="span"]');
      const group = path?.closest('[data-item-id]');
      const text = group?.querySelector('text');
      if (path === null || path === undefined || text === null || text === undefined) {
        return null;
      }
      const d = path.getAttribute('d') ?? '';
      return {
        fill: path.getAttribute('fill'),
        terminals: path.getAttribute('data-span-terminals'),
        arcs: (d.match(/ a /g) ?? []).length,
        closes: (d.match(/Z/g) ?? []).length,
        lineY: Number(path.getAttribute('data-connector-line-y')),
        labelY: Number(text.getAttribute('y')),
      };
    });
    expect(span).not.toBeNull();
    if (span === null) {
      return;
    }
    expect(span.fill).not.toBe('none'); // dots are FILLED
    expect(span.terminals).toBe('2'); // a dot at each end
    expect(span.arcs).toBe(4); // two arcs per circle x two circles
    expect(span.closes).toBe(2); // two closed dot discs
    expect(span.labelY).toBeLessThan(span.lineY); // label above the connector line
  });

  test('5a. a chevron created via the palette defaults to a 14/14-day feather', async ({ page }) => {
    await openApp(page);
    await movePaletteLeft(page);
    const before = new Set((await exportView(page)).items.map((item) => item.id));
    await createShapeOnRightStrip(page, 'Task chevron', 0.6);
    await expect.poll(() => page.locator('svg [data-task-shape="chevron"]').count()).toBeGreaterThan(0);

    const created = (await exportView(page)).items.find((item) => !before.has(item.id));
    expect(created).toBeDefined();
    expect(created?.iconShapeKind).toBe('chevron');
    expect(created?.fadeInDays).toBe(14);
    expect(created?.fadeOutDays).toBe(14);
  });

  test('5b. dragging a chevron fade corner changes the fade-in and is undoable', async ({ page }) => {
    await openApp(page);
    await movePaletteLeft(page);
    // Convert a WIDE existing bar (oa-phase-plan-dev, ~95 days) to a chevron so the
    // 14-day fades fit and the fade-in corner drag has room to change the value.
    const barBox = await page
      .locator('svg [data-item-id="oa-phase-plan-dev"] > rect:not([data-role])')
      .boundingBox();
    expect(barBox).not.toBeNull();
    if (barBox === null) {
      return;
    }
    await page.mouse.click(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await page.locator('[data-role="icon-shape-kind"]').selectOption('chevron');
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-task-shape="chevron"]'),
    ).toHaveCount(1);

    const fadeInBefore =
      (await exportView(page)).items.find((item) => item.id === 'oa-phase-plan-dev')?.fadeInDays ?? 0;

    // Re-select and grab the TOP-LEFT fade corner (fade-in handle, as for a rectangle).
    await page.mouse.click(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="fade-in-handle"]'),
    ).toHaveCount(1);
    const cornerX = barBox.x + 2;
    const cornerY = barBox.y + 2;
    await page.mouse.move(cornerX, cornerY);
    await page.mouse.down();
    await page.mouse.move(cornerX + 60, cornerY, { steps: 12 });
    await page.mouse.up();

    const fadeInAfter =
      (await exportView(page)).items.find((item) => item.id === 'oa-phase-plan-dev')?.fadeInDays ?? 0;
    expect(fadeInAfter).toBeGreaterThan(fadeInBefore);

    // Undo restores the pre-drag fade-in (the whole drag is one undoable step).
    await page.keyboard.press('Control+z');
    const fadeInUndone =
      (await exportView(page)).items.find((item) => item.id === 'oa-phase-plan-dev')?.fadeInDays ?? 0;
    expect(fadeInUndone).toBe(fadeInBefore);
  });
});

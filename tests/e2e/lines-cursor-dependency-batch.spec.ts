import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the LINES / CURSOR / DEPENDENCY batch, asserting the ACTUAL
 * rendered SVG DOM / real behavior against the built single-file app with trusted
 * pointer events (unit tests have been green while the live app was broken, so each
 * item is verified here on real geometry):
 *
 *  1. Each cursor-guide mode renders THIN lines of the specified stroke color and the
 *     correct count (crosshair=2, single=1, double=2), in BOTH the light and dark theme.
 *  2. The today line is a thin high-brightness blue.
 *  3. The progress line bends at the touched item's vertical center (within ~1.5px).
 *  4. Dependency link mode (click source -> target) and the property-panel comma-id
 *     fields both create yamabuki lines; clearing / re-clicking removes them.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

const SHOCKING_PINK = '#FF1493';
const SHOCKING_GREEN = '#00EB6C';
const TODAY_BLUE = '#1E90FF';

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('svg [data-item-id="oa-phase-plan-dev"]').waitFor();
}

/** Drag the floating command palette down out of the way of the canvas. */
async function movePaletteAway(page: Page): Promise<void> {
  const handle = page.locator('[data-role="command-palette-drag-handle"]');
  const box = await handle.boundingBox();
  if (box === null) {
    return;
  }
  await page.mouse.move(box.x + 4, box.y + 4);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, 760, { steps: 6 });
  await page.mouse.up();
}

/** Read the cursor-guide group's rendered lines (stroke color + width + count). */
async function readGuideLines(
  page: Page,
): Promise<{ count: number; strokes: string[]; widths: string[]; mode: string | null }> {
  return page.evaluate(() => {
    const group = document.querySelector('svg [data-role="cursor-guide"]');
    const lines = Array.from(group?.querySelectorAll('line') ?? []);
    return {
      count: lines.length,
      strokes: lines.map((line) => (line.getAttribute('stroke') ?? '').toUpperCase()),
      widths: lines.map((line) => line.getAttribute('stroke-width') ?? ''),
      mode: group?.getAttribute('data-guide-mode') ?? null,
    };
  });
}

/** Select a cursor-guide mode and hover the canvas so the guide paints. */
async function selectGuideAndHover(page: Page, mode: string): Promise<void> {
  await page.locator(`[data-role="cursor-guide-mode"][data-guide-mode="${mode}"]`).click();
  const box = (await page.locator('svg[data-role="schedule-canvas"]').boundingBox())!;
  // Hover the RIGHT portion (past the frozen left pane) so the guide is over the
  // schedule area and the second (double) line at +40px still fits inside the canvas.
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.5, { steps: 3 });
}

test.describe('lines / cursor / dependency batch (e2e, trusted events)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('1. each cursor mode renders thin lines of the specified color + count, in light AND dark', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);

    const assertMode = async (
      mode: string,
      expectedCount: number,
      expectedColor: string,
    ): Promise<void> => {
      await selectGuideAndHover(page, mode);
      const guide = await readGuideLines(page);
      expect(guide.mode, `mode ${mode}`).toBe(mode);
      expect(guide.count, `count for ${mode}`).toBe(expectedCount);
      for (const stroke of guide.strokes) {
        expect(stroke).toBe(expectedColor.toUpperCase());
      }
      // THIN: ~1px.
      for (const width of guide.widths) {
        expect(Number(width)).toBeLessThanOrEqual(1.2);
      }
    };

    // Light theme.
    await assertMode('crosshair', 2, SHOCKING_PINK);
    await assertMode('single-vertical', 1, SHOCKING_PINK);
    await assertMode('double-vertical', 2, SHOCKING_GREEN);

    // Dark theme: the bright accents must still render with the same stroke + count.
    await page.locator('button[data-role="toggle-theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await assertMode('crosshair', 2, SHOCKING_PINK);
    await assertMode('single-vertical', 1, SHOCKING_PINK);
    await assertMode('double-vertical', 2, SHOCKING_GREEN);
  });

  test('2. the today line is a thin high-brightness blue', async ({ page }) => {
    await openApp(page);
    // Frame the whole schedule so the today marker (mid-year) lands inside the viewport.
    await page.getByRole('button', { name: 'Fit' }).click();
    const today = page.locator('svg [data-role="today-line"]');
    // The line is only drawn when "today" is within the visible date range; when the
    // run-machine date is outside the sample year the marker is legitimately off-canvas.
    if ((await today.count()) === 0) {
      test.skip(true, 'today is outside the sample date range on this machine');
      return;
    }
    await expect(today.first()).toHaveAttribute('stroke', TODAY_BLUE);
    const width = await today.first().getAttribute('stroke-width');
    expect(Number(width)).toBeLessThanOrEqual(1.2);
  });

  test('3. the progress line bends at the touched item vertical center', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Fit' }).click();
    await expect(page.locator('svg [data-role="progress-line"]')).toHaveCount(1);

    const result = await page.evaluate(() => {
      const path = document.querySelector<SVGPathElement>('svg [data-role="progress-line"]');
      const rect = document.querySelector<SVGRectElement>(
        'svg [data-item-id="oa-phase-actual-dev"] > rect',
      );
      if (path === null || rect === null) {
        return null;
      }
      const ctm = path.getScreenCTM();
      if (ctm === null) {
        return null;
      }
      // Parse the polyline vertices from the path data and map them to client space.
      const vertexYs: number[] = [];
      const tokens = (path.getAttribute('d') ?? '').match(/-?\d+(?:\.\d+)?/g) ?? [];
      for (let index = 0; index + 1 < tokens.length; index += 2) {
        const localX = Number(tokens[index]);
        const localY = Number(tokens[index + 1]);
        const point = new DOMPoint(localX, localY).matrixTransform(ctm);
        vertexYs.push(point.y);
      }
      const box = rect.getBoundingClientRect();
      const itemCenterY = box.top + box.height / 2;
      const nearest = Math.min(...vertexYs.map((y) => Math.abs(y - itemCenterY)));
      return { nearest, itemCenterY, vertexCount: vertexYs.length };
    });
    expect(result).not.toBeNull();
    if (result === null) {
      return;
    }
    expect(result.vertexCount).toBeGreaterThanOrEqual(3);
    // A progress bend sits on the item's vertical center (item 3).
    expect(result.nearest).toBeLessThanOrEqual(1.5);
  });

  test('4a. dependency link mode: trusted click source then target creates edges (1:n) and toggles off', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    const lines = page.locator('svg [data-role="dependency-line"]');
    const before = await lines.count();

    await page.locator('[data-role="toggle-link"]').click();
    await expect(page.locator('[data-role="link-hint"]')).toContainText('pick source');

    const clickItem = async (id: string): Promise<void> => {
      const box = (await page.locator(`svg [data-item-id="${id}"] > rect`).boundingBox())!;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    };

    // Click SOURCE (sys2), then TARGET (sys3): one new edge. The hint now names the source.
    await clickItem('ta-phase-plan-sys2');
    await expect(page.locator('[data-role="link-hint"]')).toContainText('ta-phase-plan-sys2');
    await clickItem('ta-phase-plan-sys3');
    await expect.poll(() => lines.count()).toBe(before + 1);

    // The source stays armed: a second target (swe1) fans out to 1:n.
    await clickItem('ta-phase-plan-swe1');
    await expect.poll(() => lines.count()).toBe(before + 2);

    // Clicking the already-linked pair again toggles that edge off.
    await clickItem('ta-phase-plan-sys3');
    await expect.poll(() => lines.count()).toBe(before + 1);

    // The newly drawn lines are yamabuki gold.
    await expect(lines.first()).toHaveAttribute('stroke', '#F8B500');
  });

  test('4b. property-panel predecessor comma-ids wire two lines; clearing removes them', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    const lines = page.locator('svg [data-role="dependency-line"]');
    const before = await lines.count();

    // Select the target item so its property fields appear.
    const box = (await page.locator('svg [data-item-id="ta-phase-plan-sys3"] > rect').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const field = page.locator('[data-role="predecessor-item-ids"]');
    await expect(field).toBeVisible();
    await field.fill('ta-phase-plan-sys1, ta-phase-plan-swe1');
    await field.dispatchEvent('change');
    await expect.poll(() => lines.count()).toBe(before + 2);

    // Clearing the field removes both predecessor edges.
    await field.fill('');
    await field.dispatchEvent('change');
    await expect.poll(() => lines.count()).toBe(before);
  });
});

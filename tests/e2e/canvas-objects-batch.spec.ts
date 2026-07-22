import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the CANVAS-OBJECTS feedback batch, asserting the ACTUAL
 * rendered SVG DOM / real behavior against the built single-file app (unit tests
 * have twice been green while the live app was broken, so each item is verified here
 * on real geometry with trusted pointer/keyboard events):
 *
 *  1. Dependency lines default to yamabuki gold, are click-selectable, deletable and
 *     recolorable from the properties panel.
 *  2. The progress line defaults to purple, is hideable, and is recolorable.
 *  3. Stacked bars leave a ~10% (90% bar) gap.
 *  4. Arming Task arrow / chevron / span creates items that render distinct shapes
 *     carrying the matching icon_shape_kind, and the panel can switch an item's kind.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

const YAMABUKI_GOLD = '#F8B500';
const PROGRESS_PURPLE = '#7B2FBF';
const CUD_PURPLE = '#cc79a7';
const CUD_GREEN = '#009e73';

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
  await page.mouse.move(box.x + 4, 740, { steps: 6 });
  await page.mouse.up();
}

/**
 * Drag the floating command palette to the LEFT so it clears the RIGHT-side property
 * panel entirely (whose controls the test operates), while staying off the canvas'
 * right strip used for creation.
 */
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

/**
 * A screen point that lies ON some dependency line where the TOPMOST element is the
 * empty canvas (not an item glyph, not the floating palette), so a click there
 * reaches the geometric line hit-test and selects the LINE. Samples every rendered
 * line. Returns null when no such point is found.
 */
async function pointOnFreeDependencyLine(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const svgRoot = document.querySelector('svg[data-role="schedule-canvas"]');
    const lines = Array.from(
      document.querySelectorAll<SVGPathElement>('svg [data-role="dependency-line"]'),
    );
    for (const path of lines) {
      const ctm = path.getScreenCTM();
      if (ctm === null || svgRoot === null) {
        continue;
      }
      const total = path.getTotalLength();
      for (let fraction = 0.1; fraction <= 0.9; fraction += 0.02) {
        const local = path.getPointAtLength(total * fraction);
        const screen = local.matrixTransform(ctm);
        const topmost = document.elementFromPoint(screen.x, screen.y);
        // A free point: the click lands inside the canvas but not over any item glyph
        // (dependency / grid groups are pointer-events:none, so the svg root is hit).
        if (
          topmost !== null &&
          svgRoot.contains(topmost) &&
          topmost.closest('[data-item-id]') === null
        ) {
          return { x: screen.x, y: screen.y };
        }
      }
    }
    return null;
  });
}

test.describe('canvas objects batch', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('1a. dependency lines default to yamabuki gold', async ({ page }) => {
    await openApp(page);
    const line = page.locator('svg [data-role="dependency-line"]').first();
    await expect(line).toHaveAttribute('stroke', YAMABUKI_GOLD);
  });

  test('1b. clicking a dependency line selects it; a properties color change recolors it', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    const point = await pointOnFreeDependencyLine(page);
    expect(point).not.toBeNull();
    if (point === null) {
      return;
    }
    await page.mouse.click(point.x, point.y);
    // The clicked line is now selected (highlight attribute in the DOM).
    await expect(page.locator('svg [data-role="dependency-line"][data-selected="true"]')).toHaveCount(1);

    // The dependency color form appears; picking purple recolors the selected line.
    await page.locator('[aria-label="line_color palette"] button[aria-label="purple"]').click();
    await expect(
      page.locator('svg [data-role="dependency-line"][data-selected="true"]'),
    ).toHaveAttribute('stroke', CUD_PURPLE);
  });

  test('1c. a selected dependency line is deletable with Delete', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    const before = await page.locator('svg [data-role="dependency-line"]').count();
    expect(before).toBeGreaterThan(0);
    const point = await pointOnFreeDependencyLine(page);
    expect(point).not.toBeNull();
    if (point === null) {
      return;
    }
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('svg [data-role="dependency-line"][data-selected="true"]')).toHaveCount(1);
    await page.keyboard.press('Delete');
    await expect
      .poll(() => page.locator('svg [data-role="dependency-line"]').count())
      .toBe(before - 1);
  });

  test('2. progress line defaults to purple; it is hideable and recolorable', async ({ page }) => {
    await openApp(page);
    // The controls live in the property panel; clear the floating palette off the
    // right-side panel so the toggle is clickable.
    await movePaletteLeft(page);
    const progress = page.locator('svg [data-role="progress-line"]');
    await expect(progress).toHaveCount(1);
    await expect(progress).toHaveAttribute('stroke', PROGRESS_PURPLE);

    // Recolor via the toolbar color input (a real DOM change event on the control).
    await page.locator('[data-role="progress-line-color"]').evaluate((element, value) => {
      const input = element as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, CUD_GREEN);
    await expect(page.locator('svg [data-role="progress-line"]')).toHaveAttribute('stroke', CUD_GREEN);

    // The toggle DELETES / hides the line from the DOM; clicking again brings it back.
    await page.locator('[data-role="toggle-progress-line"]').click();
    await expect(page.locator('svg [data-role="progress-line"]')).toHaveCount(0);
    await page.locator('[data-role="toggle-progress-line"]').click();
    await expect(page.locator('svg [data-role="progress-line"]')).toHaveCount(1);
  });

  test('3. stacked bars leave a ~10% (90% bar) gap', async ({ page }) => {
    await openApp(page);
    const report = await page.evaluate(() => {
      // sys1 and sys3 (CR-003 Part 2 inner-left label-collision avoidance: sys1's own
      // abbreviation overflows far enough right to bump swe1 into a fresh lane, but not
      // far enough to block sys3 reusing sys1's freed lane) end up sharing ONE lane --
      // swe1 sits in the genuinely distinct third lane, so sys1/sys2/swe1 are the trio
      // that actually renders across three separate stacked lanes (CR-012 template
      // restructuring shifted the fitted zoom enough to change this pairing from the
      // original sys1/sys2/sys3 selection).
      const ids = ['ta-phase-plan-sys1', 'ta-phase-plan-sys2', 'ta-phase-plan-swe1'];
      // sys1/sys2 carry a demo fadeIn/fadeOutDays (CR-004 fade-taper enrichment of the
      // sample data): a faded task bar renders as a `<polygon>`, not a `<rect>` (only
      // the x-coordinates taper -- the y-extent, and so the lane-gap ratio this test
      // checks, is identical to a plain rect). Match either glyph.
      const rects = ids
        .map((id) => document.querySelector(`svg [data-item-id="${id}"] > :is(rect, polygon)`))
        .filter((node): node is Element => node !== null)
        .map((node) => node.getBoundingClientRect())
        .sort((a, b) => a.top - b.top);
      if (rects.length < 2) {
        return null;
      }
      let minGap = Infinity;
      let height = 0;
      for (let index = 1; index < rects.length; index += 1) {
        minGap = Math.min(minGap, rects[index].top - rects[index - 1].bottom);
        height = rects[index].height;
      }
      return { minGap, height };
    });
    expect(report).not.toBeNull();
    if (report === null) {
      return;
    }
    expect(report.minGap).toBeGreaterThan(0);
    // At a 0.90 ratio the gap is 10% of the lane == barHeight * (0.1 / 0.9) ~= 0.111.
    const ratio = report.minGap / report.height;
    expect(ratio).toBeGreaterThan(0.07);
    expect(ratio).toBeLessThan(0.18);
  });

  test('4. arming Task arrow/chevron/span creates distinct shapes with icon_shape_kind', async ({
    page,
  }) => {
    await openApp(page);
    // Dock the palette LEFT so it clears the right panel (the icon_shape_kind select
    // sits at the panel bottom) while leaving the canvas' right creation strip free.
    await movePaletteLeft(page);
    const svg = page.locator('svg[data-role="schedule-canvas"]');
    const svgBox = (await svg.boundingBox())!;

    // Create on the EMPTY strip at the far right of the schedule (beyond the last
    // item's date) so the drag starts on empty canvas (create), not over a bar, and
    // stays clear of the floating palette at the bottom. Each shape gets its own row band.
    const createShape = async (buttonName: string, fractionY: number): Promise<void> => {
      await page.getByRole('button', { name: buttonName }).click();
      const y = svgBox.y + svgBox.height * fractionY;
      const startX = svgBox.x + svgBox.width - 80;
      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(startX + 50, y, { steps: 6 });
      await page.mouse.up();
    };

    await createShape('Task arrow', 0.35);
    await expect.poll(() => page.locator('svg [data-task-shape="arrow"]').count()).toBeGreaterThan(0);
    await createShape('Task chevron', 0.5);
    await expect.poll(() => page.locator('svg [data-task-shape="chevron"]').count()).toBeGreaterThan(0);
    await createShape('Task span', 0.65);
    await expect.poll(() => page.locator('svg [data-task-shape="span"]').count()).toBeGreaterThan(0);

    // Each created shape is drawn as a PATH (not a plain rect) and the three paths
    // differ from one another.
    const shapes = await page.evaluate(() => {
      const readPath = (shape: string): { tag: string; d: string } | null => {
        const node = document.querySelector(`svg [data-task-shape="${shape}"]`);
        return node === null ? null : { tag: node.tagName.toLowerCase(), d: node.getAttribute('d') ?? '' };
      };
      return {
        arrow: readPath('arrow'),
        chevron: readPath('chevron'),
        span: readPath('span'),
      };
    });
    expect(shapes.arrow?.tag).toBe('path');
    expect(shapes.chevron?.tag).toBe('path');
    expect(shapes.span?.tag).toBe('path');
    const ds = [shapes.arrow?.d, shapes.chevron?.d, shapes.span?.d];
    expect(new Set(ds).size).toBe(3);
    expect(shapes.span?.d).toContain('M');

    // The property panel switches an existing bar's kind and the DOM shape changes.
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"] > rect:not([data-role])');
    const barBox = await bar.boundingBox();
    await page.mouse.click(barBox!.x + barBox!.width / 2, barBox!.y + barBox!.height / 2);
    await page.locator('[data-role="icon-shape-kind"]').selectOption('chevron');
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-task-shape="chevron"]'),
    ).toHaveCount(1);
  });
});

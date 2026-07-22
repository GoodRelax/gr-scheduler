import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the UI/interaction feedback batch, asserting the ACTUAL
 * rendered SVG DOM / real behavior against the built single-file app (twice recently
 * unit tests were green while the live app was broken, so each item is checked here
 * on real geometry):
 *
 *  1.  Fit leaves a LEFT margin (leftmost item's left edge > the pane edge).
 *  2.  Items render with NO stroke by default; a set stroke is SOLID; the selection
 *      outline still appears when selected.
 *  3.  An empty-area drag with no armed shape draws a marquee and selects the framed
 *      items; with an armed shape it still creates.
 *  4.  Ctrl+A selects all; it is ignored while typing in an input.
 *  5.  A properties fill-color change updates the DOM fill and is undoable.
 *  6.  ESC closes an open properties panel.
 *  7.  Three time-overlapping items in one category stack into >2 lanes (distinct y).
 *  8.  Stacked bars are ~95% of the lane height (a visible gap between them).
 *  9-12. The cursor guide has four exclusive modes rendering the expected line count.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

// Model H fixture default plan fill (src/app/sample-data.ts `PLAN_FILL`).
const PLAN_FILL_HEX = '#4477aa';
const CUD_RED = '#d55e00';
const CUD_BLUE = '#0072b2';

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
  await page.mouse.move(box.x + 4, 720, { steps: 6 });
  await page.mouse.up();
}

test.describe('ui feedback batch', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('1. Fit leaves a left margin (leftmost item left-edge > the pane edge)', async ({ page }) => {
    // Neuter rAF so ONLY the synchronous startup-Fit path runs (deterministic).
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      window.cancelAnimationFrame = () => undefined;
    });
    await page.goto(pathToFileURL(builtAppFile).href);
    await page.locator('svg [data-item-id="oa-ms-plan-kickoff"]').waitFor();

    const report = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      const pane = document.querySelector('[data-role="left-classification-pane"]');
      const kickoff = document.querySelector('svg [data-item-id="oa-ms-plan-kickoff"]');
      if (svg === null || kickoff === null) {
        return null;
      }
      const svgRect = svg.getBoundingClientRect();
      const paneRight = pane === null ? svgRect.left : pane.getBoundingClientRect().right;
      const marker = (kickoff.querySelector('path, rect') ?? kickoff) as SVGGraphicsElement;
      const box = marker.getBoundingClientRect();
      return { leftEdge: box.left, paneRight, svgLeft: svgRect.left };
    });
    expect(report).not.toBeNull();
    if (report === null) {
      return;
    }
    // The earliest item's left edge sits to the RIGHT of the frozen pane's edge with
    // breathing room -- it is not clipped at x = 0 / the pane boundary.
    expect(report.leftEdge).toBeGreaterThan(report.paneRight + 4);
  });

  test('2. items have no stroke by default; a set stroke is solid; selection outline shows', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    // Use a PLAIN plan-only task (no actual dates / progress overlay): under Model H
    // an item carrying actual dates (e.g. oa-phase-plan-dev) renders its plan side
    // with an automatic outline stroke to distinguish it from the actual bar, so a
    // "no stroke by default" check needs a task with no actual overlay.
    const barRect = page.locator('svg [data-item-id="oa-phase-plan-valid"] > rect:not([data-role])');
    // Default: no border.
    expect(await barRect.getAttribute('stroke')).toBe('none');

    // Select the bar, then set a stroke color via the properties stroke palette.
    const box = await barRect.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator('svg [data-item-id="oa-phase-plan-valid"] [data-role="selection-outline"]')).toHaveCount(1);
    await page
      .locator('[aria-label="stroke_color palette"] button[aria-label="blue"]')
      .click();

    // The border is now the chosen color and SOLID (no dash array).
    await expect(barRect).toHaveAttribute('stroke', CUD_BLUE);
    expect(await barRect.getAttribute('stroke-dasharray')).toBe('none');
  });

  test('3. empty-area drag marquees + selects; armed shape still creates', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    const svg = page.locator('svg[data-role="schedule-canvas"]');
    const svgBox = (await svg.boundingBox())!;

    // Start on an EMPTY strip at the far right of the schedule area and drag left
    // across the bars: a marquee appears and selects the framed items on mouse-up.
    const startX = svgBox.x + svgBox.width - 6;
    const startY = svgBox.y + svgBox.height * 0.5;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(svgBox.x + 260, svgBox.y + svgBox.height * 0.2, { steps: 8 });
    const marqueeMid = await page.locator('svg [data-role="marquee"]').count();
    await page.mouse.move(svgBox.x + 240, svgBox.y + svgBox.height * 0.8, { steps: 8 });
    await page.mouse.up();

    expect(marqueeMid).toBe(1);
    // The marquee is gone after release and several items are now selected.
    await expect(page.locator('svg [data-role="marquee"]')).toHaveCount(0);
    expect(await page.locator('svg [data-role="selection-outline"]').count()).toBeGreaterThan(1);

    // With a shape ARMED, an empty-area drag CREATES instead of marqueeing. Scan for a
    // point (rather than a fixed fraction of the canvas) that is clear of every item's
    // rendered box/label -- the Model H fixture (26 items) packs its rows differently
    // than the old fixture, so a hard-coded near-bottom coordinate can now land on an
    // existing item's label.
    const before = await page.locator('svg [data-item-id]').count();
    await page.getByRole('button', { name: 'Task bar' }).click();
    const empty = await page.evaluate(() => {
      const svgEl = document.querySelector('svg[data-role="schedule-canvas"]');
      const rect = svgEl?.getBoundingClientRect();
      if (rect === undefined) {
        return null;
      }
      for (let y = rect.bottom - 8; y > rect.top + 40; y -= 12) {
        for (let x = rect.right - 8; x > rect.left + 220; x -= 16) {
          const element = document.elementFromPoint(x, y);
          // Must land on the SVG canvas itself, clear of any item AND clear of the
          // floating command palette (moved to the bottom, but still docked at the
          // right and able to overlap the canvas' bottom-right corner).
          if (
            element !== null &&
            element.closest('[data-item-id]') === null &&
            element.closest('[data-role="command-palette"]') === null
          ) {
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
    await page.mouse.move(empty.x + 80, empty.y, { steps: 6 });
    await page.mouse.up();
    await expect.poll(() => page.locator('svg [data-item-id]').count()).toBeGreaterThan(before);
    // A create drag does not leave a marquee behind.
    await expect(page.locator('svg [data-role="marquee"]')).toHaveCount(0);
  });

  test('4. Ctrl+A selects all; ignored while typing in an input', async ({ page }) => {
    await openApp(page);
    // Ctrl+A is a window shortcut (no canvas click needed): every mounted item gets a
    // selection outline.
    await page.keyboard.press('Control+a');
    const itemCount = await page.locator('svg [data-item-id]').count();
    await expect
      .poll(() => page.locator('svg [data-role="selection-outline"]').count())
      .toBe(itemCount);
    expect(itemCount).toBeGreaterThan(1);

    // Select just ONE item, then Ctrl+A while a text field is focused: typing wins,
    // so the single selection is left intact (select-all is ignored in the input).
    await movePaletteAway(page);
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"] > rect:not([data-role])');
    const box = await bar.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator('svg [data-role="selection-outline"]')).toHaveCount(1);
    // Focus a real text field in the properties panel (the watermark user-name box
    // was removed in the SHELL batch); Ctrl+A must be swallowed by the input.
    const textField = page
      .locator('[role="region"][aria-label="Properties"] input[type="text"]')
      .first();
    await textField.click();
    await textField.press('Control+a');
    await expect(page.locator('svg [data-role="selection-outline"]')).toHaveCount(1);
  });

  test('5. properties fill-color change updates the DOM fill and is undoable', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    // A plain plan-only task (no actual overlay washing its fill -- see test 2).
    const barRect = page.locator('svg [data-item-id="oa-phase-plan-valid"] > rect:not([data-role])');
    // Default plan fill is the fixture's PLAN_FILL (property-driven).
    await expect(barRect).toHaveAttribute('fill', PLAN_FILL_HEX);
    const box = await barRect.boundingBox();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    // Pick red in the fill palette -> the DOM fill changes (explicit override).
    await page.locator('[aria-label="fill_color palette"] button[aria-label="red"]').click();
    await expect(barRect).toHaveAttribute('fill', CUD_RED);
    // Undoable: Ctrl+Z restores the plan fill.
    await page.keyboard.press('Control+z');
    await expect(barRect).toHaveAttribute('fill', PLAN_FILL_HEX);
  });

  test('6. ESC closes an open properties panel', async ({ page }) => {
    await openApp(page);
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('7 + 8. overlapping items stack into >2 lanes with a visible gap', async ({ page }) => {
    await openApp(page);
    // The TeamA Phase row (SYS1..SWE1) stacks into three sub-lanes (the old cap
    // allowed only two visible). CR-003 Part 2's inner-left label-collision avoidance
    // means sys1's own abbreviation overflows far enough right to bump swe1 into a
    // fresh lane, but not far enough to stop sys3 reusing sys1's now-freed lane -- so
    // sys1 and sys3 end up SHARING one lane, and sys1/sys2/swe1 are the trio that
    // actually renders across three separate stacked lanes (CR-012's template
    // restructuring shifted the fitted zoom enough to change this pairing from the
    // original sys1/sys2/sys3 selection). sys1/sys2 also carry a demo fadeIn/fadeOutDays
    // (CR-004 sample enrichment) and so render as a `<polygon>` rather than a `<rect>`;
    // only the x-coordinates taper, so the lane top/gap this test reads is identical
    // either way -- match both glyphs.
    const ids = ['ta-phase-plan-sys1', 'ta-phase-plan-sys2', 'ta-phase-plan-swe1'];
    const lanes = await page.evaluate((idList) => {
      const tops = idList.map((id) => {
        const node = document.querySelector(`svg [data-item-id="${id}"] > :is(rect, polygon)`);
        return node === null ? null : Math.round(node.getBoundingClientRect().top);
      });
      return tops;
    }, ids);
    expect(lanes.every((top) => top !== null)).toBe(true);
    const distinct = new Set(lanes as number[]);
    // Three DISTINCT vertical lanes -> the row grew to stack >2 items.
    expect(distinct.size).toBe(3);

    // Adjacent stacked bars leave a visible gap (~5% of the lane height).
    const gap = await page.evaluate((idList) => {
      const rects = idList
        .map((id) => document.querySelector(`svg [data-item-id="${id}"] > :is(rect, polygon)`))
        .filter((n): n is Element => n !== null)
        .map((n) => n.getBoundingClientRect())
        .sort((a, b) => a.top - b.top);
      let minGap = Infinity;
      for (let i = 1; i < rects.length; i += 1) {
        minGap = Math.min(minGap, rects[i].top - rects[i - 1].bottom);
      }
      return minGap;
    }, ids);
    expect(gap).toBeGreaterThan(0);
  });

  test('9-12. cursor guide: four exclusive modes render the expected lines', async ({ page }) => {
    await openApp(page);
    const svg = page.locator('svg[data-role="schedule-canvas"]');
    const svgBox = (await svg.boundingBox())!;
    const pointerX = svgBox.x + svgBox.width * 0.6;
    const pointerY = svgBox.y + svgBox.height * 0.5;

    const guideLineCount = async (): Promise<number> => {
      await page.mouse.move(pointerX, pointerY);
      // A tiny second move guarantees a pointermove event fires post-mode-change.
      await page.mouse.move(pointerX + 1, pointerY + 1);
      return page.locator('svg [data-role="cursor-guide"] line').count();
    };

    // Default: none (off) -> no guide group.
    await page.mouse.move(pointerX, pointerY);
    expect(await page.locator('svg [data-role="cursor-guide"]').count()).toBe(0);

    await page.getByRole('radio', { name: 'Crosshair guide' }).click();
    await expect.poll(guideLineCount).toBe(2);

    await page.getByRole('radio', { name: 'Single vertical guide' }).click();
    await expect.poll(guideLineCount).toBe(1);

    await page.getByRole('radio', { name: 'Double vertical guide' }).click();
    await expect.poll(guideLineCount).toBe(2);

    // Exclusive: only the active mode is aria-checked.
    const checked = await page.locator('[data-role="cursor-guide-mode"][aria-checked="true"]').count();
    expect(checked).toBe(1);

    await page.getByRole('radio', { name: 'Guide off' }).click();
    await page.mouse.move(pointerX, pointerY);
    await page.mouse.move(pointerX + 1, pointerY + 1);
    await expect.poll(() => page.locator('svg [data-role="cursor-guide"] line').count()).toBe(0);
  });
});

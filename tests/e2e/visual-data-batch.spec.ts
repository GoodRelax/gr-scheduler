import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { actualColorFrom, planColorFrom } from '../../src/domain/usecase/plan-actual-colors.js';

/**
 * End-to-end coverage for the visual/data batch against the built single-file app:
 *  - faint gridlines are drawn by DEFAULT and hide/re-show via the palette toggles
 *    (aria-pressed flips, the lines disappear then return);
 *  - plan items render GREEN and actual items render ORANGE (property-driven fill);
 *  - after Fit, representative items from BOTH majors ("Over All Schedule" and
 *    "TeamA") are framed inside the viewport.
 *
 * Runs against `dist/index.html`; build first. Self-skips when unbuilt.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

// Model H fixture (CR-001): oa-phase-plan-dev's own base fillColor (see
// src/app/sample-data.ts `PLAN_FILL`). Under CR-002 Part 1 an item recording an
// actual is colored by DERIVING its plan (pale) / actual (vivid) shades from this
// ONE base color, not from a pair of fixed hues.
const BASE_FILL_HEX = '#4477aa';

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="command-palette"]').waitFor();
  await page.locator('svg [data-item-id="oa-phase-plan-dev"]').waitFor();
}

const gridLineCount = (page: Page): Promise<number> =>
  page.locator('svg [data-role="gridlines"] line').count();

test.describe('visual/data batch', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('a fresh load renders ALL sample items + gridlines with NO interaction (regression)', async ({
    page,
  }) => {
    // Reproduce the blank-canvas bug deterministically: NEUTER requestAnimationFrame
    // before the app boots, so nothing that is deferred to an animation frame ever
    // runs. The old code painted the first frame (and the startup Fit) only via rAF,
    // so with rAF disabled the canvas stayed blank. The fix paints the initial view
    // AND the startup Fit synchronously during bootstrap, so the schedule still
    // appears. Default bootstrap only: no URL params, no clicks/wheel/Fit.
    await page.addInitScript(() => {
      // A no-op rAF that never invokes its callback (returns a handle id).
      window.requestAnimationFrame = () => 1;
      window.cancelAnimationFrame = () => undefined;
    });
    await page.goto(pathToFileURL(builtAppFile).href);
    await page.locator('svg[data-role="schedule-canvas"]').waitFor();

    // Every one of the 26 seeded ASPICE items (Model H: plan + actual dates on the
    // same item) has a mounted group even with rAF disabled.
    await expect.poll(() => page.locator('svg [data-item-id]').count()).toBe(26);
    // Real glyphs and labels are present (tasks -> <rect>, milestones -> <path>).
    expect(await page.locator('svg text').count()).toBeGreaterThan(0);
    expect(await page.locator('svg rect').count()).toBeGreaterThan(0);
    expect(await page.locator('svg [data-item-id] path').count()).toBeGreaterThan(0);
    // Gridlines painted behind them by default.
    expect(await page.locator('svg [data-role="gridlines"] line').count()).toBeGreaterThan(0);

    // Representative items from BOTH majors are actually mounted.
    await expect(page.locator('svg [data-item-id="oa-ms-plan-kickoff"]')).toHaveCount(1);
    await expect(page.locator('svg [data-item-id="ta-phase-plan-sys1"]')).toHaveCount(1);
  });

  test('Fit frames the RENDERED box (marker + label) of EVERY item inside the viewport', async ({
    page,
  }) => {
    // Neuter rAF so only the synchronous startup-Fit path runs (deterministic), then
    // assert the ACTUAL rendered SVG bounding box of every one of the 26 items --
    // including the widest bar's right end and the LATEST milestone's marker + label
    // -- lies within the canvas rect. Fails when Fit's extent ignores label/marker
    // overhang (right-most content clipped); passes once the extent includes it.
    //
    // DEF-006 (project-records/defects/DEF-006-fit-vertical-overhang.md) -- FIXED:
    // under the Model H (CR-001) 26-item template, the last row's item
    // (`ta-task-plan-clarify-uc`) used to be clipped ~9.8px past the canvas bottom after
    // Fit -- NOT just its label, the bar rect itself. Root cause: the renderer stacks
    // label-colliding items into extra sub-lanes via `estimateInnerLeftLabelExtentPx`,
    // whose occupied width scales with the (zoomY-scaled) bar height, so a taller Fit
    // zoomY adds a sub-lane that pushes the bottom rows down -- but `computeFitViewForItems`
    // measured WITHOUT that estimator and never re-checked the bottom at the chosen zoomY.
    // The fix threads the same estimator into the Fit measurement and refines zoomY
    // against the true rendered bottom, so this assertion now passes on correct geometry.
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      window.cancelAnimationFrame = () => undefined;
    });
    await page.goto(pathToFileURL(builtAppFile).href);
    await page.locator('svg [data-item-id]').first().waitFor();

    const report = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      if (svg === null) {
        return { total: 0, inView: 0, offenders: [] as string[] };
      }
      const r = svg.getBoundingClientRect();
      const groups = Array.from(document.querySelectorAll('svg [data-item-id]'));
      const offenders: string[] = [];
      for (const g of groups) {
        const b = g.getBoundingClientRect();
        const within =
          b.left >= r.left - 1 &&
          b.right <= r.right + 1 &&
          b.top >= r.top - 1 &&
          b.bottom <= r.bottom + 1;
        if (!within) {
          offenders.push(
            `${g.getAttribute('data-item-id')} [l${Math.round(b.left)} r${Math.round(b.right)} t${Math.round(b.top)} b${Math.round(b.bottom)}] vs [l${Math.round(r.left)} r${Math.round(r.right)} t${Math.round(r.top)} b${Math.round(r.bottom)}]`,
          );
        }
      }
      return { total: groups.length, inView: groups.length - offenders.length, offenders };
    });

    expect(report.total).toBe(26);
    // Every rendered item box (glyph + marker + label) must be inside the viewport.
    expect(report.offenders, report.offenders.join('\n')).toEqual([]);
    expect(report.inView).toBe(26);
  });

  test('gridlines are on by default and the palette toggles hide/re-show them', async ({ page }) => {
    await openApp(page);
    const dateToggle = page.getByRole('button', { name: /Date gridlines/ });
    const categoryToggle = page.getByRole('button', { name: /Category gridlines/ });

    // Default ON: both toggles pressed and the grid group carries hairlines.
    await expect(dateToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(categoryToggle).toHaveAttribute('aria-pressed', 'true');
    expect(await gridLineCount(page)).toBeGreaterThan(0);

    // Hiding BOTH removes every hairline; aria-pressed flips to false.
    await dateToggle.click();
    await categoryToggle.click();
    await expect(dateToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(categoryToggle).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => gridLineCount(page)).toBe(0);

    // Re-showing brings the hairlines back.
    await dateToggle.click();
    await categoryToggle.click();
    await expect(dateToggle).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => gridLineCount(page)).toBeGreaterThan(0);
  });

  test('the date gridlines are faint (barely visible, low opacity)', async ({ page }) => {
    await openApp(page);
    const opacity = await page
      .locator('svg [data-role="gridlines"] line')
      .first()
      .getAttribute('stroke-opacity');
    expect(Number(opacity)).toBeGreaterThan(0);
    expect(Number(opacity)).toBeLessThanOrEqual(0.12);
  });

  test('plan renders a pale shade and actual renders a vivid shade of the same base color (property-driven)', async ({
    page,
  }) => {
    // Model H (CR-001) merges plan + actual dates onto ONE item; CR-002 Part 1 then
    // derives the plan (pale) / actual (vivid) fills from that item's OWN base
    // fillColor, rather than a fixed pair of hues. oa-phase-plan-dev records both.
    await openApp(page);
    const planFill = await page
      .locator('svg [data-item-id="oa-phase-plan-dev"] > rect[data-plan-actual-side="plan"]')
      .getAttribute('fill');
    const actualFill = await page
      .locator('svg [data-item-id="oa-phase-plan-dev"] > rect[data-plan-actual-side="actual"]')
      .getAttribute('fill');
    expect(planFill).toBe(planColorFrom(BASE_FILL_HEX));
    expect(actualFill).toBe(actualColorFrom(BASE_FILL_HEX));
  });

  test('Fit frames items from BOTH majors (a milestone in Over All Schedule + SYS1 in TeamA)', async ({
    page,
  }) => {
    await openApp(page);
    // Scroll away, then Fit, so the framing is actually exercised.
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    if (box === null) {
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 1500);
    await page.getByRole('button', { name: 'Fit schedule to view' }).click();
    await page.locator('svg [data-item-id="oa-ms-plan-kickoff"]').waitFor();
    await page.locator('svg [data-item-id="ta-phase-plan-sys1"]').waitFor();

    const framed = await page.evaluate(() => {
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
        const shape = node.querySelector('rect, path') ?? node;
        const b = (shape as SVGGraphicsElement).getBoundingClientRect();
        return (
          b.left >= rect.left - 2 &&
          b.right <= rect.right + 2 &&
          b.top >= rect.top - 2 &&
          b.bottom <= rect.bottom + 2
        );
      };
      return check('oa-ms-plan-kickoff') && check('ta-phase-plan-sys1');
    });
    expect(framed).toBe(true);
  });
});

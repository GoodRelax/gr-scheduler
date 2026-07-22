import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guard against regression of the "fixed toolbar steals the canvas" delivery
 * defect (item6 maximize canvas / item6.1 minimize header / item6.2 floating
 * palette; STK-L0-021 / TOOL-L1-001). It asserts the MOCK-CONFORMANT layout:
 *
 *  - the command controls live in a FLOATING overlay (position absolute/fixed),
 *    not a fixed header band above the canvas;
 *  - the schedule canvas starts at (or very near) the viewport top, i.e. no tall
 *    fixed header pushes it down;
 *  - the minimal header is slim (well under the old ~50px toolbar band);
 *  - the floating palette is translucent while idle and becomes fully opaque on
 *    hover and on focus (a11y: focus must make it readable).
 *
 * Runs against the built single-file app (`dist/index.html`) and self-skips when
 * it has not been built, matching a11y.spec.ts.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

/** Threshold (px): a slim minimal header is allowed; a fixed toolbar band is not. */
const MAX_HEADER_HEIGHT = 48;

/**
 * Read the alpha channel of an element's computed background color. The palette is
 * translucent (alpha well below 1) while idle and opaque when hovered/focused. The
 * ink itself never fades (that would break WCAG AA contrast), so translucency is
 * asserted on the surface alpha rather than on whole-element opacity.
 */
async function backgroundAlpha(page: Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate((node) => {
    const background = getComputedStyle(node).backgroundColor;
    const match = /rgba?\(([^)]+)\)/.exec(background);
    if (match === null) {
      return 1;
    }
    const parts = (match[1] ?? '').split(',').map((piece) => piece.trim());
    return parts.length >= 4 ? Number(parts[3]) : 1;
  });
}

test.describe('layout mock conformance: floating palette + full-viewport canvas', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the command palette floats over a full-viewport canvas with a slim header', async ({
    page,
  }) => {
    await page.goto(pathToFileURL(builtAppFile).href);

    const palette = page.locator('[data-role="command-palette"]');
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const header = page.locator('[data-role="app-header"]');
    await palette.waitFor();
    await canvas.waitFor();
    await header.waitFor();

    // The palette is an overlay, not an in-flow toolbar band.
    const palettePosition = await palette.evaluate((node) => getComputedStyle(node).position);
    expect(['absolute', 'fixed']).toContain(palettePosition);

    // The schedule canvas fills the viewport from (near) the very top: it is not
    // pushed down by a tall fixed toolbar/header.
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(MAX_HEADER_HEIGHT);

    // The header is a slim minimal bar, not the old command band.
    const headerBox = await header.boundingBox();
    expect(headerBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(MAX_HEADER_HEIGHT);

    // The old developer/debug heading string must be gone (item6.1 / item24).
    await expect(header).not.toContainText('walking skeleton');
    await expect(header).not.toContainText('illuminated line');

    // Idle translucency (item58): the palette surface is see-through when unused.
    expect(await backgroundAlpha(page, '[data-role="command-palette"]')).toBeLessThan(0.6);

    // Hover makes the surface opaque and usable.
    await palette.hover();
    await expect
      .poll(async () => backgroundAlpha(page, '[data-role="command-palette"]'))
      .toBeGreaterThan(0.9);

    // Focusing a control INSIDE the palette makes the whole palette opaque
    // (:focus-within), so keyboard users read it at full contrast even without a
    // pointer. (Document File I/O now lives in the header; CR-004 later removed the
    // icon-asset import feature entirely, so a shape-picker button stands in here.)
    await page.mouse.move(0, 0);
    await palette.getByRole('button', { name: 'Task bar' }).focus();
    await expect
      .poll(async () => backgroundAlpha(page, '[data-role="command-palette"]'))
      .toBeGreaterThan(0.9);
  });
});

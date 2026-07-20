/**
 * End-to-end DOM behavior for the final feature batch:
 *
 *  3. Section-pane per-node controls are HIDDEN by default and revealed only on
 *     hover / keyboard focus (selection), while staying Tab-reachable.
 *  4. Property rows are two-column (label right-aligned, input left-aligned on the
 *     same line) and the panel width is draggable + persisted in the view state.
 *  5. The default document is the ~3-year Automotive SPICE project to SOS.
 *
 * Runs against the built single-file app (`dist/index.html`); build first.
 */

import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

async function openApp(page: Page): Promise<Page> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  return page;
}

/** Download + read the exported JSON as text. */
async function exportJsonText(page: Page): Promise<string> {
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
  return Buffer.concat(chunks).toString('utf-8');
}

test.describe('final feature batch (DOM behavior)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('3. section node controls are hidden until hover/focus and stay keyboard-reachable', async ({
    page,
  }) => {
    await openApp(page);
    // Park the pointer over the empty canvas so nothing in the pane is hovered.
    await page.mouse.move(900, 400);
    const header = page.locator('[data-role="section-header"]').first();
    await header.waitFor();
    // The control row is collapsed to zero width + transparent by default (the
    // buttons stay in the DOM/tab order but reclaim the horizontal space). Assert the
    // rendered geometry directly, which is unaffected by Playwright's opacity-agnostic
    // visibility heuristic.
    const controls = header.locator('[data-role="node-controls"]');
    // Ensure a move button IS present (keyboard-reachable in the DOM).
    await expect(header.locator('button[data-role="section-move-down"]')).toHaveCount(1);

    const readState = async (): Promise<{ opacity: string; width: number }> =>
      controls.evaluate((element) => ({
        opacity: getComputedStyle(element).opacity,
        width: element.getBoundingClientRect().width,
      }));

    // Hidden by default.
    const hidden = await readState();
    expect(hidden.opacity).toBe('0');
    expect(hidden.width).toBeLessThanOrEqual(1);

    // Hovering the node reveals its controls...
    await header.hover();
    await expect.poll(async () => (await readState()).opacity).toBe('1');
    expect((await readState()).width).toBeGreaterThan(10);

    // ...and moving away hides them again.
    await page.mouse.move(900, 400);
    await expect.poll(async () => (await readState()).opacity).toBe('0');

    // Keyboard: focusing the node's (Tab-reachable) name reveals the controls via
    // :focus-within, so they are operable without a mouse (a11y).
    await header.locator('[data-role="node-name"]').first().focus();
    await expect.poll(async () => (await readState()).opacity).toBe('1');
  });

  test('4. property rows are two-column and the panel is resizable + persisted', async ({ page }) => {
    await openApp(page);
    // Create + select a task so the full property form is shown.
    await page.getByRole('button', { name: 'Task bar' }).dispatchEvent('click');
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    await canvas.focus();
    await canvas.press('Enter');
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    await expect(panel.locator('[data-role="form"]')).toBeVisible();

    // The abbreviation row: caption right-aligned in the left column, the input in
    // the right column, both on the SAME line (their vertical centers align).
    const layout = await panel.evaluate((root) => {
      const rows = Array.from(root.querySelectorAll('label'));
      const row = rows.find((element) => (element.textContent ?? '').includes('abbreviation'));
      if (row === undefined) {
        return null;
      }
      const caption = row.querySelector('span');
      const input = row.querySelector('input');
      if (caption === null || input === null) {
        return null;
      }
      const captionRect = caption.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      return {
        captionAlign: getComputedStyle(caption).textAlign,
        sameLine:
          Math.abs(
            (captionRect.top + captionRect.bottom) / 2 - (inputRect.top + inputRect.bottom) / 2,
          ) < 12,
        captionLeftOfInput: captionRect.right <= inputRect.left + 2,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout?.captionAlign).toBe('right');
    expect(layout?.sameLine).toBe(true);
    expect(layout?.captionLeftOfInput).toBe(true);

    // The panel width is draggable via its left-edge divider (mirrors the left pane).
    const divider = page.locator('[data-role="property-panel-divider"]');
    await expect(divider).toBeVisible();
    const widthBefore = (await panel.boundingBox())?.width ?? 0;
    const dividerBox = await divider.boundingBox();
    expect(dividerBox).not.toBeNull();
    if (dividerBox === null) {
      return;
    }
    // Dragging the divider LEFT widens the panel (its left edge moves left).
    await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + 200);
    await page.mouse.down();
    await page.mouse.move(dividerBox.x - 120, dividerBox.y + 200, { steps: 12 });
    await page.mouse.up();
    const widthAfter = (await panel.boundingBox())?.width ?? 0;
    expect(widthAfter).toBeGreaterThan(widthBefore + 40);

    // The new width is persisted into the view state (round-trips via export).
    const viewState = (JSON.parse(await exportJsonText(page)) as { viewState: { propertyPanelWidth?: number } })
      .viewState;
    expect(viewState.propertyPanelWidth ?? 0).toBeGreaterThan(widthBefore + 30);
  });

  test('5. the default document is the ~3-year ASPICE project to SOS with no console/CSP error', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        const text = message.text();
        // A benign browser notice, not an app error: `frame-ancestors` cannot be
        // enforced via a <meta> CSP (it needs an HTTP header) and is inherent to the
        // single-file offline build, so it is not counted.
        if (text.includes('frame-ancestors')) {
          return;
        }
        errors.push(text);
      }
    });
    page.on('pageerror', (error) => errors.push(String(error)));

    await openApp(page);
    await page.locator('svg [data-item-id]').first().waitFor();
    // 26 ASPICE items (SYS/SWE phases, integration/validation, plan/actual dates on
    // the same item under Model H, gates).
    await expect.poll(() => page.locator('svg [data-item-id]').count()).toBe(26);
    // The SOS (Start Of Sales) milestone anchors the ~3-year span and is rendered.
    await expect(page.locator('svg [data-item-id="oa-ms-plan-launch"]')).toHaveCount(1);
    const labels = await page.locator('svg text').allTextContents();
    expect(labels.some((text) => text.includes('SOS'))).toBe(true);

    // No console error and no CSP violation on load.
    expect(errors).toEqual([]);
  });
});

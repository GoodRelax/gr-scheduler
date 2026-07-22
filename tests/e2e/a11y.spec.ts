import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Automated accessibility gate (WCAG 2.1 AA) for the built single-file app.
 *
 * It loads `dist/index.html` (self-contained, offline) and runs axe-core against
 * the WCAG 2.0/2.1 A and AA rule tags, failing on any serious or critical
 * violation. The spec self-skips when the build artifact is missing so it can be
 * committed and run on demand:
 *
 *   npm run build && npx playwright install chromium && npm run test:e2e
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

test.describe('axe-core accessibility (WCAG 2.1 AA)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto(pathToFileURL(builtAppFile).href);
    // Wait for the app shell to render before scanning.
    await page.locator('#app [role="toolbar"]').first().waitFor();
    await page.locator('svg[data-role="schedule-canvas"]').waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });

  test('the header project title announces a role and a name (DEF-012, WCAG 4.1.2)', async ({
    page,
  }) => {
    await page.goto(pathToFileURL(builtAppFile).href);
    const title = page.locator('[data-role="schedule-name"]');
    await title.waitFor();
    // It opens the inline rename editor, so it must not read as plain text.
    await expect(title).toHaveAttribute('role', 'button');
    const accessibleName = await title.getAttribute('aria-label');
    expect(accessibleName ?? '').not.toBe('');
    // WCAG 2.5.3: the visible title text starts the accessible name.
    const visibleText = (await title.innerText()).trim();
    expect(accessibleName ?? '').toContain(visibleText);
    // ...and the name states the rename affordance, not just the project name.
    expect((accessibleName ?? '').length).toBeGreaterThan(visibleText.length);

    // While the inline editor is open the input carries its own accessible name and
    // the host span drops the button role (no focusable control nested in a button).
    await title.dblclick();
    const editor = page.locator('[data-role="schedule-name-editor"]');
    await editor.waitFor();
    await expect(editor).not.toHaveAttribute('aria-label', '');
    await expect(title).not.toHaveAttribute('role', 'button');
    await page.keyboard.press('Escape');
    await expect(title).toHaveAttribute('role', 'button');
  });

  test('the schedule canvas is keyboard focusable (WCAG 2.1.1)', async ({ page }) => {
    await page.goto(pathToFileURL(builtAppFile).href);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    await canvas.waitFor();
    await canvas.focus();
    await expect(canvas).toBeFocused();
  });
});

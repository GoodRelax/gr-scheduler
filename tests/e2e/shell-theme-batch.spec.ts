import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the SHELL / BRANDING / THEME batch against the built
 * single-file app (`dist/index.html`), using TRUSTED pointer / keyboard events and
 * asserting the ACTUAL rendered DOM / computed styles:
 *
 *  1. Header has three zones -- branding (GR Scheduler / (c) 2026 GoodRelax.) on the
 *     LEFT, the document TITLE centered, and the [?] help button on the RIGHT.
 *  2. [?] opens a role=dialog help modal listing features + real shortcuts; Esc
 *     closes it and focus returns to [?].
 *  3. The dark-mode toggle flips data-theme + the canvas computed background and the
 *     choice persists across a reload; axe AA passes in dark too.
 *  4. Esc is NOT preventDefaulted when the panel is closed and nothing is in
 *     progress, but IS handled (and closes the panel) when the panel is open.
 *  5. The properties panel renders English labels even under a non-English UI locale.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="app-header"]').waitFor();
}

test.describe('shell / branding / theme batch (e2e, trusted events)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('header: branding LEFT, title CENTER, [?] help RIGHT', async ({ page }) => {
    await openApp(page);
    const branding = page.locator('[data-role="app-branding"]');
    const title = page.locator('[data-role="schedule-name"]');
    const help = page.locator('button[data-role="open-help"]');

    await expect(branding).toContainText('GR Scheduler');
    await expect(branding).toContainText('© 2026 GoodRelax.');
    await expect(branding).toContainText('Apache License 2.0');
    await expect(title).toBeVisible();
    await expect(help).toHaveText('?');
    await expect(help).toHaveAttribute('aria-label', 'Help');

    // Geometry: branding left of the title, title left of the help button.
    const brandBox = await branding.boundingBox();
    const titleBox = await title.boundingBox();
    const helpBox = await help.boundingBox();
    expect(brandBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(helpBox).not.toBeNull();
    expect(brandBox!.x).toBeLessThan(titleBox!.x);
    expect(titleBox!.x).toBeLessThan(helpBox!.x);
    // The title is roughly centered in the header (within a generous tolerance).
    const headerBox = await page.locator('[data-role="app-header"]').boundingBox();
    const titleCenter = titleBox!.x + titleBox!.width / 2;
    const headerCenter = headerBox!.x + headerBox!.width / 2;
    expect(Math.abs(titleCenter - headerCenter)).toBeLessThan(headerBox!.width * 0.25);
  });

  test('[?] opens an accessible help modal with features + shortcuts; Esc closes & returns focus', async ({
    page,
  }) => {
    await openApp(page);
    const help = page.locator('button[data-role="open-help"]');
    await help.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Comprehensive features are listed.
    await expect(dialog).toContainText('Marquee-select');
    await expect(dialog).toContainText('dependency');
    await expect(dialog).toContainText('watermark');
    await expect(dialog).toContainText('fill_color');
    // Several real keyboard shortcuts appear.
    for (const shortcut of ['Ctrl+A', 'Ctrl+Z', 'Ctrl+C', 'Ctrl+V', 'Esc', 'Wheel']) {
      await expect(dialog).toContainText(shortcut);
    }

    // Esc closes the modal and returns focus to the [?] opener.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const focusRole = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.role ?? '',
    );
    expect(focusRole).toBe('open-help');
  });

  test('dark-mode toggle flips the theme + canvas background and persists across reload', async ({
    page,
  }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const lightBg = await canvas.evaluate((node) => getComputedStyle(node).backgroundColor);

    await page.locator('button[data-role="toggle-theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const darkBg = await canvas.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(darkBg).not.toBe(lightBg);
    // The dark canvas is genuinely dark (each RGB channel well below mid).
    const channels = /rgb\((\d+), (\d+), (\d+)\)/.exec(darkBg);
    expect(channels).not.toBeNull();
    if (channels !== null) {
      for (let index = 1; index <= 3; index += 1) {
        expect(Number(channels[index])).toBeLessThan(80);
      }
    }

    // Persist across a reload (localStorage).
    await page.reload();
    await canvas.waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const reloadedBg = await canvas.evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(reloadedBg).toBe(darkBg);
  });

  test('axe AA passes in dark mode', async ({ page }) => {
    await openApp(page);
    await page.locator('button[data-role="toggle-theme"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
  });

  test('Esc is captured when the panel is open, released when the panel is closed & idle', async ({
    page,
  }) => {
    await openApp(page);
    const panel = page.locator('[role="region"][aria-label="Properties"]');
    await expect(panel).toBeVisible();

    // Observe whether the app preventDefaults the Escape (a bubble-phase listener
    // added AFTER the app's window handler sees the same event last).
    await page.evaluate(() => {
      const flag = { prevented: false };
      (window as unknown as { __esc: typeof flag }).__esc = flag;
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          flag.prevented = event.defaultPrevented;
        }
      });
    });

    // Panel OPEN: Esc is handled (preventDefaulted) and closes the panel.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    expect(await page.evaluate(() => (window as unknown as { __esc: { prevented: boolean } }).__esc.prevented)).toBe(
      true,
    );

    // Panel CLOSED + idle: Esc is NOT preventDefaulted (propagates to the browser,
    // e.g. to leave native F11 fullscreen).
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => (window as unknown as { __esc: { prevented: boolean } }).__esc.prevented)).toBe(
      false,
    );
  });

  test('the properties panel renders English labels even under a non-English UI locale', async ({
    page,
  }) => {
    await openApp(page);
    // Switch the UI language away from English (EN -> JA).
    await page.locator('button[data-role="toggle-plan"]').first().waitFor();
    const languageButton = page.locator('button', { hasText: /^EN$/ }).first();
    await languageButton.click();

    const panel = page.locator('[role="region"][aria-label="Properties"]');
    await expect(panel).toBeVisible();
    // Fixed English property names are still English.
    await expect(panel).toContainText('start_date');
    await expect(panel).toContainText('fill_color');
    await expect(panel).toContainText('icon_shape_kind');
    // The progress-line control label stays English (not localized to Japanese).
    const progress = panel.locator('[data-role="progress-line-section"]');
    await expect(progress).toContainText('Progress line');
  });
});

import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for CR-003 Part 1 (header reorganization) and Part 3 (deterministic
 * dependency auto-router) against the built single-file app (`dist/index.html`).
 *
 * NOTE: this spec was authored alongside the CR-003 implementation but was NOT executed
 * in the implementation session (no built dist / browser run available there). It is
 * left for CI / the test-engineer to run; the pure logic it mirrors is unit-covered in
 * tests/header-model.test.ts, tests/dependency-connector.test.ts and
 * tests/label-collision.test.ts.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

/** The CR-003 Part 1 header action-control order (mirrors HEADER_CONTROL_ROLES). */
const HEADER_ORDER = [
  'screenshot',
  'load',
  'save',
  'theme-light',
  'theme-dark',
  'theme-mono-light',
  'theme-mono-dark',
  'baseline-visible',
  'baseline-invisible',
  'undo',
  'redo',
  'open-ai',
  'open-help',
];

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="app-header"]').waitFor();
}

test.describe('CR-003 Part 1: header order + Load/Save menus', () => {
  test('the header action controls appear in the CR-003 reading order', async ({ page }) => {
    await openApp(page);
    const roles = await page
      .locator('[data-role="header-actions"] > *')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.role ?? ''),
      );
    expect(roles).toEqual(HEADER_ORDER);
  });

  test('Load opens a menu with JSON / XML / JSON-as-baseline / New', async ({ page }) => {
    await openApp(page);
    await page.locator('button[data-role="load"]').click();
    const menu = page.locator('[data-role="load-menu"]');
    await expect(menu).toBeVisible();
    for (const role of ['load-json', 'load-xml', 'load-json-baseline', 'new-clear']) {
      await expect(menu.locator(`button[data-role="${role}"]`)).toHaveCount(1);
    }
  });

  test('Save opens a menu with JSON / XML / SVG / PNG', async ({ page }) => {
    await openApp(page);
    await page.locator('button[data-role="save"]').click();
    const menu = page.locator('[data-role="save-menu"]');
    await expect(menu).toBeVisible();
    for (const role of ['save-json', 'save-xml', 'save-svg', 'save-png']) {
      await expect(menu.locator(`button[data-role="${role}"]`)).toHaveCount(1);
    }
  });

  test('SS button downloads a viewport PNG', async ({ page }) => {
    await openApp(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button[data-role="screenshot"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test('Base V / Base I toggle the baseline visibility aria-pressed state', async ({ page }) => {
    await openApp(page);
    const show = page.locator('button[data-role="baseline-visible"]');
    const hide = page.locator('button[data-role="baseline-invisible"]');
    await hide.click();
    await expect(hide).toHaveAttribute('aria-pressed', 'true');
    await expect(show).toHaveAttribute('aria-pressed', 'false');
    await show.click();
    await expect(show).toHaveAttribute('aria-pressed', 'true');
    await expect(hide).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('CR-003 Part 3: dependency routes are orthogonal', () => {
  test('every drawn dependency line is an axis-aligned (right-angle) polyline', async ({ page }) => {
    await openApp(page);
    const paths = page.locator('path[data-role="dependency-line"]');
    const count = await paths.count();
    // The template may carry no dependencies; when present, assert every route is a
    // strictly orthogonal polyline (each segment is horizontal or vertical).
    for (let index = 0; index < count; index += 1) {
      const d = await paths.nth(index).getAttribute('d');
      expect(d).not.toBeNull();
      const points = parsePolyline(d ?? '');
      for (let p = 1; p < points.length; p += 1) {
        const a = points[p - 1]!;
        const b = points[p]!;
        expect(a.x === b.x || a.y === b.y).toBe(true);
      }
    }
  });
});

/** Parse an `M x y L x y ...` polyline into points (spec helper). */
function parsePolyline(d: string): Array<{ x: number; y: number }> {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g) ?? [];
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: Number(numbers[index]), y: Number(numbers[index + 1]) });
  }
  return points;
}

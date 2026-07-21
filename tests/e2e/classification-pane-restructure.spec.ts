import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the CLASSIFICATION-PANE restructure against the built
 * single-file app (`dist/index.html`), using TRUSTED pointer / keyboard events:
 *
 * - the consolidated per-node icon row renders `▲ ▼ □ + - X` (name first), the old
 *   `↓` glyph is gone (now `+`);
 * - a Middle label is top-aligned and its first Minor label center-aligned, so
 *   their rendered y-positions differ (no overlap);
 * - the per-node `-` hide removes a track's rows and the section `□` restores them;
 * - clicking `X` opens a confirm dialog (bold D / C) and `D` confirms the delete;
 * - Ctrl+C then Ctrl+V on a focused node duplicates its subtree as a sibling.
 *
 * Self-skips when the app has not been built, matching the other e2e specs.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="section-header"]').first().waitFor();
}

/** Read the ordered [data-role] + glyph of the first DECORATED track-label's buttons. */
async function firstDecoratedTrackControls(
  page: Page,
): Promise<{ names: string[]; roles: string[]; glyphs: string[] }> {
  return page.evaluate(() => {
    const tracks = Array.from(document.querySelectorAll('[data-role="track-label"]'));
    const decorated = tracks.find((track) => track.querySelector('button') !== null);
    const nameFirst = decorated?.children[0] as HTMLElement | undefined;
    const buttons = Array.from(decorated?.querySelectorAll('button') ?? []);
    return {
      names: [nameFirst?.dataset.role ?? ''],
      roles: buttons.map((button) => (button as HTMLElement).dataset.role ?? ''),
      glyphs: buttons.map((button) => button.textContent ?? ''),
    };
  });
}

test.describe('classification-pane restructure (e2e, trusted events)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the per-node icon row renders name-first then ▲ ▼ □ + - X (old ↓ gone)', async ({ page }) => {
    await openApp(page);
    const controls = await firstDecoratedTrackControls(page);
    expect(controls.names[0]).toBe('node-name');
    expect(controls.roles).toEqual([
      'category-move-up',
      'category-move-down',
      'show-all',
      'add-subcategory',
      'hide-node',
      'remove-track',
    ]);
    expect(controls.glyphs[0]).toBe('▲');
    expect(controls.glyphs[1]).toBe('▼');
    expect(controls.glyphs[2]).toBe('□');
    expect(controls.glyphs[3]).toBe('+');
    expect(controls.glyphs).not.toContain('↓');
  });

  test('a Middle label and its first Minor label render at different y (no overlap)', async ({ page }) => {
    await openApp(page);
    // The startup template has middle "Task" with a first minor "Onboarding".
    // Measure the NAME text spans (the container div spans the whole band): the
    // middle name is top-aligned and the minor name center-aligned, so the middle
    // text sits clearly above the minor text with no vertical collision.
    const middleName = page
      .locator('[data-role="track-label"]', { hasText: 'Task' })
      .first()
      .locator('[data-role="node-name"]');
    const minorName = page
      .locator('[data-role="detail-label"]', { hasText: 'Onboarding' })
      .first()
      .locator('[data-role="node-name"]');
    await middleName.waitFor();
    await minorName.waitFor();
    const middleBox = await middleName.boundingBox();
    const minorBox = await minorName.boundingBox();
    expect(middleBox).not.toBeNull();
    expect(minorBox).not.toBeNull();
    // Different y, middle above minor, with a clear gap (no overlap of the text).
    expect(minorBox!.y - middleBox!.y).toBeGreaterThan(5);
    expect(middleBox!.y + middleBox!.height).toBeLessThanOrEqual(minorBox!.y + 4);
  });

  test('hiding a track via "-" removes its rows; the section "□" restores them', async ({ page }) => {
    await openApp(page);
    const middle = page.locator('[data-role="track-label"]', { hasText: 'Task' }).first();
    await middle.waitFor();
    const onboarding = page.locator('[data-role="detail-label"]', { hasText: 'Onboarding' });
    expect(await onboarding.count()).toBeGreaterThan(0);

    // The control row is hidden until its node is hovered / focused; focusing the
    // track's name reveals its controls (via :focus-within) without a mouse-position
    // conflict with the overlapping detail label.
    await middle.locator('[data-role="node-name"]').first().focus();
    await middle.locator('button[data-role="hide-node"]').click();
    await expect(page.locator('[data-role="detail-label"]', { hasText: 'Onboarding' })).toHaveCount(0);

    // Reveal all under the owning section (TeamA) via its show-all "□".
    const teamA = page.locator('[data-role="section-header"]', { hasText: 'TeamA' }).first();
    await teamA.locator('[data-role="node-name"]').first().focus();
    await teamA.locator('button[data-role="show-all"]').click();
    await expect(page.locator('[data-role="detail-label"]', { hasText: 'Onboarding' })).toHaveCount(1);
  });

  test('clicking "X" opens a confirm dialog with bold D / C; pressing D deletes', async ({ page }) => {
    await openApp(page);
    const middle = page.locator('[data-role="track-label"]', { hasText: 'Task' }).first();
    await middle.waitFor();
    // Reveal the hidden-until-hover control row (via :focus-within) before its "X".
    await middle.locator('[data-role="node-name"]').first().focus();
    await middle.locator('button[data-role="remove-track"]').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // The first letters D and C are rendered bold.
    await expect(dialog.locator('button[data-role="dialog-delete"] b')).toHaveText('D');
    await expect(dialog.locator('button[data-role="dialog-cancel"] b')).toHaveText('C');

    await page.keyboard.press('d');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-role="track-label"]', { hasText: 'Task' })).toHaveCount(0);
  });

  test('Ctrl+C then Ctrl+V on a focused node duplicates its subtree as a sibling', async ({ page }) => {
    await openApp(page);
    const middle = page.locator('[data-role="track-label"]', { hasText: 'Task' }).first();
    await middle.waitFor();
    // Focus the node by clicking its name span, then copy + paste with the keyboard.
    await middle.locator('[data-role="node-name"]').click();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    // The duplicated track "Task-1" appears (unified CR-007 -N naming); its label
    // repeats once per detail row it carries (the copy keeps the three minors), so >= 1.
    await expect
      .poll(async () =>
        page.locator('[data-role="track-label"]', { hasText: 'Task-1' }).count(),
      )
      .toBeGreaterThan(0);
  });
});

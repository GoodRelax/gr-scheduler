import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end coverage for the HEADER / SHELL batch against the built single-file app
 * (`dist/index.html`), asserting the ACTUAL rendered DOM / computed styles under the
 * CR-003 Part 1 header contract (SS -> Load -> Save -> Light -> Dark -> Mono L ->
 * Mono D -> Base V -> Base I -> Undo -> Redo -> AI -> ?). The header order / Load /
 * Save menu CONTENTS are covered by `cr003-header-dep.spec.ts`; this batch covers the
 * DOWNSTREAM behavior of those controls plus the rest of the shell:
 *
 *  1. Save menu: JSON / XML / SVG / PNG each produce a real download of the right kind.
 *  2. All Clear (now Load -> "New (clear all)") confirmation dialog (bold A/C, focus
 *     Cancel, A empties, C/Esc keep; focus returns to the Load trigger).
 *  3. Four theme modes (Light / Dark / Mono-Light / Mono-Dark), grayscale monos,
 *     persistence across reload, axe AA in each mono mode.
 *  4. Undo / Redo in the header with circular-arrow glyphs.
 *  5. [AI] modal: prompt + schema, Copy writes prompt+schema, Esc closes.
 *  6. Branding: two lines, larger product name, GitHub repo link.
 *  7. Help modal: 3 columns, width ~85% of the viewport.
 *  8. Palette cleanup: no LANG selector, no watermark-name input, no reflow on link
 *     toggle.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="app-header"]').waitFor();
}

interface ExportedDoc {
  readonly items: ReadonlyArray<{ id: string }>;
}

/** Open the Save menu and click "JSON", returning the parsed export. */
async function exportDoc(page: Page): Promise<ExportedDoc> {
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
  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as ExportedDoc;
}

/** `data-role` of each theme-mode header button, keyed by its `data-theme-mode`. */
const THEME_BUTTON_ROLE: Record<string, string> = {
  light: 'theme-light',
  dark: 'theme-dark',
  'mono-light': 'theme-mono-light',
  'mono-dark': 'theme-mono-dark',
};

test.describe('header / shell batch (e2e, trusted events)', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('1. Save menu: JSON / XML / SVG / PNG each download the right file kind', async ({ page }) => {
    await openApp(page);

    const saveAndDownload = async (
      itemRole: string,
    ): Promise<{ filename: string }> => {
      await page.locator('button[data-role="save"]').click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator(`[data-role="save-menu"] button[data-role="${itemRole}"]`).click(),
      ]);
      return { filename: download.suggestedFilename() };
    };

    const json = await saveAndDownload('save-json');
    expect(json.filename).toMatch(/\.json$/);
    const xml = await saveAndDownload('save-xml');
    expect(xml.filename).toMatch(/\.xml$/);
    const svg = await saveAndDownload('save-svg');
    expect(svg.filename).toMatch(/\.svg$/);
    const png = await saveAndDownload('save-png');
    expect(png.filename).toMatch(/\.png$/);
  });

  test('2. Load -> New (clear all) shows a confirm dialog; Cancel keeps the doc, A empties it', async ({
    page,
  }) => {
    await openApp(page);
    const before = await exportDoc(page);
    expect(before.items.length).toBeGreaterThan(0);

    // Opening Load and clicking "New (clear all)" does NOT immediately wipe the
    // document: a dialog appears (trigger = the Load button).
    await page.locator('button[data-role="load"]').click();
    await page.locator('[data-role="load-menu"] button[data-role="new-clear"]').click();
    const dialog = page.locator('[data-role="all-clear-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The A (in All Clear) and C (in Cancel) are rendered BOLD to afford the keys.
    await expect(dialog.locator('button[data-role="all-clear-confirm"] b')).toHaveText('A');
    await expect(dialog.locator('button[data-role="all-clear-cancel"] b')).toHaveText('C');
    // Focus starts on the safer Cancel button.
    const focusRole = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.role ?? '',
    );
    expect(focusRole).toBe('all-clear-cancel');

    // C cancels -> the document is unchanged.
    await page.keyboard.press('c');
    await expect(dialog).toHaveCount(0);
    const afterCancel = await exportDoc(page);
    expect(afterCancel.items.length).toBe(before.items.length);

    // Re-open and confirm with A -> the document is emptied.
    await page.locator('button[data-role="load"]').click();
    await page.locator('[data-role="load-menu"] button[data-role="new-clear"]').click();
    await expect(page.locator('[data-role="all-clear-dialog"]')).toBeVisible();
    await page.keyboard.press('a');
    await expect(page.locator('[data-role="all-clear-dialog"]')).toHaveCount(0);
    const afterClear = await exportDoc(page);
    expect(afterClear.items.length).toBe(0);
  });

  test('2b. Esc also cancels the New (clear all) dialog and returns focus to the Load trigger', async ({
    page,
  }) => {
    await openApp(page);
    const loadTrigger = page.locator('button[data-role="load"]');
    await loadTrigger.click();
    await page.locator('[data-role="load-menu"] button[data-role="new-clear"]').click();
    await expect(page.locator('[data-role="all-clear-dialog"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-role="all-clear-dialog"]')).toHaveCount(0);
    const focusRole = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.role ?? '',
    );
    expect(focusRole).toBe('load');
  });

  test('3. four theme modes each set data-theme + change the canvas; monos are grayscale', async ({
    page,
  }) => {
    await openApp(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const backgrounds = new Map<string, string>();
    for (const mode of ['light', 'dark', 'mono-light', 'mono-dark'] as const) {
      await page.locator(`button[data-role="${THEME_BUTTON_ROLE[mode]}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      const bg = await canvas.evaluate((node) => getComputedStyle(node).backgroundColor);
      backgrounds.set(mode, bg);
      if (mode.startsWith('mono')) {
        // The canvas is desaturated in mono modes ...
        const filter = await canvas.evaluate((node) => getComputedStyle(node).filter);
        expect(filter).toContain('grayscale');
        // ... and its background is achromatic (equal RGB channels).
        const channels = /rgb\((\d+), (\d+), (\d+)\)/.exec(bg);
        expect(channels).not.toBeNull();
        if (channels !== null) {
          expect(channels[1]).toBe(channels[2]);
          expect(channels[2]).toBe(channels[3]);
        }
      }
    }
    // Light and dark differ; the active button carries aria-pressed=true.
    expect(backgrounds.get('light')).not.toBe(backgrounds.get('dark'));
    await expect(page.locator(`button[data-role="${THEME_BUTTON_ROLE['mono-dark']}"]`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('3b. the chosen theme persists across a reload', async ({ page }) => {
    await openApp(page);
    await page.locator(`button[data-role="${THEME_BUTTON_ROLE['mono-dark']}"]`).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono-dark');
    await page.reload();
    await page.locator('svg[data-role="schedule-canvas"]').waitFor();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono-dark');
  });

  for (const mode of ['mono-light', 'mono-dark'] as const) {
    test(`3c. axe AA passes in ${mode}`, async ({ page }) => {
      await openApp(page);
      await page.locator(`button[data-role="${THEME_BUTTON_ROLE[mode]}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const seriousOrCritical = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
    });
  }

  test('4. Undo / Redo are in the header with circular-arrow glyphs and perform undo/redo', async ({
    page,
  }) => {
    await openApp(page);
    const undo = page.locator('[data-role="app-header"] button[data-role="undo"]');
    const redo = page.locator('[data-role="app-header"] button[data-role="redo"]');
    await expect(undo).toHaveCount(1);
    await expect(redo).toHaveCount(1);
    // PowerPoint-like circular arrows (counter-clockwise / clockwise).
    await expect(undo).toHaveText('↶');
    await expect(redo).toHaveText('↷');
    await expect(undo).toBeDisabled();

    // Create an item, then Undo removes it and Redo restores it.
    const before = await exportDoc(page);
    await page.getByRole('button', { name: 'Milestone circle' }).dispatchEvent('click');
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    await canvas.focus();
    await canvas.press('Enter');
    const created = await exportDoc(page);
    expect(created.items.length).toBe(before.items.length + 1);

    await expect(undo).toBeEnabled();
    await undo.click();
    const afterUndo = await exportDoc(page);
    expect(afterUndo.items.length).toBe(before.items.length);

    await expect(redo).toBeEnabled();
    await redo.click();
    const afterRedo = await exportDoc(page);
    expect(afterRedo.items.length).toBe(before.items.length + 1);
  });

  test('5. [AI] modal shows the prompt + schema and Copy writes them; Esc closes', async ({ page }) => {
    await page.addInitScript(() => {
      const store = window as unknown as { __clipText: string };
      store.__clipText = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string): Promise<void> => {
            store.__clipText = text;
          },
          write: async (): Promise<void> => undefined,
        },
      });
    });
    await openApp(page);

    const aiButton = page.locator('[data-role="app-header"] button[data-role="open-ai"]');
    await expect(aiButton).toHaveCount(1);
    // The [AI] button sits immediately to the LEFT of [?].
    const aiBox = await aiButton.boundingBox();
    const helpBox = await page.locator('button[data-role="open-help"]').boundingBox();
    expect(aiBox!.x).toBeLessThan(helpBox!.x);

    await aiButton.click();
    const dialog = page.locator('[data-role="ai-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // The payload contains both the prompt and the schema SSOT (via the global).
    const payload = await page.locator('[data-role="ai-payload"]').textContent();
    const schemaText = await page.evaluate(() =>
      JSON.stringify(
        (globalThis as unknown as { grScheduler: { documentSchema: unknown } }).grScheduler
          .documentSchema,
        null,
        2,
      ),
    );
    expect(payload).toContain(schemaText);
    expect(payload).toContain('Output ONLY valid JSON');

    // Copy writes prompt + schema to the clipboard.
    await page.locator('button[data-role="ai-copy"]').click();
    await expect
      .poll(async () => page.evaluate(() => (window as unknown as { __clipText: string }).__clipText))
      .toContain(schemaText);

    // Esc closes and returns focus to the opener.
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-role="ai-dialog"]')).toHaveCount(0);
    const focusRole = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.dataset.role ?? '',
    );
    expect(focusRole).toBe('open-ai');
  });

  test('6. branding is two lines with a larger product name and a repo link', async ({ page }) => {
    await openApp(page);
    const name = page.locator('[data-role="app-branding"] .grsch-brand-name');
    const link = page.locator('[data-role="app-branding"] a[data-role="app-repo-link"]');
    await expect(name).toHaveText('GR Scheduler');
    await expect(link).toHaveText('(c) GoodRelax. Apache License 2.0');
    await expect(link).toHaveAttribute('href', 'https://github.com/GoodRelax/gr-scheduler');
    // The product name is rendered LARGER than the copyright line.
    const nameSize = await name.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    const lineSize = await link.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
    expect(nameSize).toBeGreaterThan(lineSize);
  });

  test('7. the help modal is ~85% viewport wide and lays out in 3 columns', async ({ page }) => {
    await openApp(page);
    await page.locator('button[data-role="open-help"]').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const viewport = page.viewportSize();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box !== null && viewport !== null) {
      expect(Math.abs(box.width - viewport.width * 0.85)).toBeLessThan(viewport.width * 0.03);
    }
    const columnCount = await page
      .locator('.grsch-help-columns')
      .evaluate((node) => getComputedStyle(node).columnCount);
    expect(columnCount).toBe('3');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('8. palette has no LANG selector and no watermark-name input', async ({ page }) => {
    await openApp(page);
    const palette = page.locator('[data-role="command-palette"]');
    await expect(palette.locator('button', { hasText: /^EN$/ })).toHaveCount(0);
    await expect(palette.locator('input[type="text"]')).toHaveCount(0);
  });

  test('8b. palette button positions do not reflow when link mode is toggled', async ({ page }) => {
    await openApp(page);
    const palette = page.locator('[data-role="command-palette"]');
    const snapshot = async (): Promise<Array<{ role: string; x: number; y: number }>> =>
      palette.evaluate((root) =>
        Array.from(root.querySelectorAll('button')).map((button) => {
          const rect = button.getBoundingClientRect();
          return { role: (button as HTMLElement).dataset.role ?? '', x: rect.x, y: rect.y };
        }),
      );

    const before = await snapshot();
    // Toggle dependency link mode ON (shows the reserved-space hint).
    await page.locator('button[data-role="toggle-link"]').click();
    await expect(page.locator('button[data-role="toggle-link"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const after = await snapshot();

    expect(after.length).toBe(before.length);
    for (let index = 0; index < before.length; index += 1) {
      expect(after[index]!.x).toBeCloseTo(before[index]!.x, 1);
      expect(after[index]!.y).toBeCloseTo(before[index]!.y, 1);
    }
  });
});

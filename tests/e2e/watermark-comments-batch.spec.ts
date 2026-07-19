import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * End-to-end (real rendered DOM / trusted pointer) coverage for the
 * watermark / comments / selection-bug batch:
 *
 *  1. the evidence watermark is shown by DEFAULT with the "GoodRelax" text at the
 *     lowered 0.06 opacity; hiding it needs the password (wrong -> stays visible,
 *     correct -> hidden); exported JSON carries only the HASH, never the raw
 *     password.
 *  2. a comment bubble can be dragged (trusted pointer) -> bodyOffsetPx changes and
 *     its leader line re-routes to the anchor; an item-anchored comment's anchor
 *     follows the item when the item moves.
 *  3. a normal marquee drag across the labels/watermark selects items but produces
 *     NO native text selection (window.getSelection() stays empty).
 *
 * Runs against the built single-file app (`dist/index.html`); build first.
 */
const builtAppFile = resolve(process.cwd(), 'dist', 'index.html');

async function exportJsonText(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).dispatchEvent('click'),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

interface ExportedComment {
  id: string;
  anchorItemId?: string;
  bodyOffsetPx?: { dx: number; dy: number };
}

/** The id of the LAST user-created comment (id prefix `comment-`), or null. */
async function newestCreatedCommentId(page: Page): Promise<string | null> {
  const json = await exportJsonText(page);
  const doc = JSON.parse(json) as { annotations?: ExportedComment[] };
  const created = (doc.annotations ?? []).filter((a) => a.id.startsWith('comment-'));
  return created.length > 0 ? (created[created.length - 1]?.id ?? null) : null;
}

async function openApp(page: Page): Promise<void> {
  await page.goto(pathToFileURL(builtAppFile).href);
  await page.locator('svg[data-role="schedule-canvas"]').waitFor();
  await page.locator('[data-role="command-palette"]').waitFor();
  await page.locator('svg [data-item-id="oa-phase-plan-dev"]').waitFor();
}

/** Drag the floating palette to the bottom-left so it stops overlaying content. */
async function movePaletteAway(page: Page): Promise<void> {
  const handle = page.locator('[data-role="command-palette-drag-handle"]');
  const grip = await handle.boundingBox();
  if (grip === null) {
    return;
  }
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(4, 560, { steps: 12 });
  await page.mouse.up();
}

const DEFAULT_WATERMARK_PASSWORD = 'watermark-unlock';
const DEFAULT_WATERMARK_HASH =
  'a8f81cfc4f489a27c6e6fa3a31c6089878a3648e24c04ee1b934ac03b99ce46c';

test.describe('watermark / comments / selection batch', () => {
  test.skip(!existsSync(builtAppFile), 'Run `npm run build` to produce dist/index.html first.');

  test('the watermark is shown by DEFAULT as "GoodRelax" at the fainter 0.06 opacity', async ({
    page,
  }) => {
    await openApp(page);
    const layer = page.locator('svg [data-role="watermark"]');
    await expect(layer).toHaveCount(1);
    // Fainter than the previous 0.12.
    expect(await layer.getAttribute('opacity')).toBe('0.06');
    // The default label text is exactly "GoodRelax" (no timestamp on the default mark).
    const firstLabel = await layer.locator('text').first().textContent();
    expect(firstLabel).toBe('GoodRelax');
    // The toggle button reflects the default-ON state.
    await expect(page.getByRole('button', { name: /^Watermark:/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('hiding the watermark requires the password (wrong stays, correct hides)', async ({
    page,
  }) => {
    await openApp(page);
    const layer = page.locator('svg [data-role="watermark"]');
    const button = page.getByRole('button', { name: /^Watermark:/ });
    await expect(layer).toHaveCount(1);

    // A persistent dialog handler answers the hide PROMPT with the current attempt
    // and accepts the "wrong password" ALERT.
    let promptAnswer = 'definitely-wrong';
    page.on('dialog', (dialog) => {
      void dialog.accept(dialog.type() === 'prompt' ? promptAnswer : undefined);
    });

    // Wrong password: the watermark STAYS visible.
    await button.dispatchEvent('click');
    // Give the async hash comparison time; the mark must remain.
    await expect(layer).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-pressed', 'true');

    // Correct password: the watermark is hidden.
    promptAnswer = DEFAULT_WATERMARK_PASSWORD;
    await button.dispatchEvent('click');
    await expect(layer).toHaveCount(0);
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  test('exported JSON carries the hide HASH but never the raw default password', async ({
    page,
  }) => {
    await openApp(page);
    const json = await exportJsonText(page);
    expect(json).toContain(DEFAULT_WATERMARK_HASH);
    expect(json.includes(DEFAULT_WATERMARK_PASSWORD)).toBe(false);
  });

  test('a marquee drag across labels/watermark selects items but makes NO text selection', async ({
    page,
  }) => {
    await openApp(page);
    await movePaletteAway(page);
    const canvas = page.locator('svg[data-role="schedule-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    // Drag a rubber-band marquee across the schedule area (over item labels + the
    // watermark text) starting from an empty point near the top-left of the
    // schedule region (just right of the frozen pane).
    const startX = box.x + 240;
    const startY = box.y + 60;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 360, startY + 220, { steps: 16 });
    await page.mouse.up();

    // Items were framed by the marquee (at least one selection outline present).
    const selectedCount = await page.locator('svg [data-role="selection-outline"]').count();
    expect(selectedCount).toBeGreaterThan(0);
    // No native TEXT was selected by the drag.
    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selectedText).toBe('');
  });

  test('the SVG canvas disables native text selection (user-select: none)', async ({ page }) => {
    await openApp(page);
    const userSelect = await page.evaluate(() => {
      const svg = document.querySelector('svg[data-role="schedule-canvas"]');
      return svg === null ? '' : getComputedStyle(svg).userSelect;
    });
    expect(userSelect).toBe('none');
    // Real editable inputs (e.g. the watermark user-name box) remain selectable.
    const inputSelect = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="text"]');
      return input === null ? 'auto' : getComputedStyle(input).userSelect;
    });
    expect(inputSelect).not.toBe('none');
  });

  test('a comment bubble can be dragged; its leader re-routes to the anchor', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    // Create a free-world comment (no item selected). Target it by its created id so
    // the template's own sample comment is never mistaken for ours.
    await page.getByRole('button', { name: 'Add comment' }).dispatchEvent('click');
    const commentId = await newestCreatedCommentId(page);
    expect(commentId).not.toBeNull();
    const bubble = page.locator(`svg [data-role="comment-bubble"][data-annotation-id="${commentId}"]`);
    await bubble.waitFor();
    const leader = page.locator(
      `svg [data-role="comment-leader"][data-annotation-id="${commentId}"]`,
    );

    const readLeader = async (): Promise<{ x1: number; y1: number; x2: number; y2: number }> => {
      return leader.evaluate((node) => ({
        x1: Number(node.getAttribute('x1')),
        y1: Number(node.getAttribute('y1')),
        x2: Number(node.getAttribute('x2')),
        y2: Number(node.getAttribute('y2')),
      }));
    };
    const before = await readLeader();
    const box = await bubble.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) {
      return;
    }
    // Trusted drag of the bubble by a known amount.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60, { steps: 14 });
    await page.mouse.up();

    // The bubble moved and the leader START (bubble edge) re-routed, while the leader
    // END still points at the (unchanged) free-world anchor.
    const after = await readLeader();
    expect(Math.abs(after.x1 - before.x1) + Math.abs(after.y1 - before.y1)).toBeGreaterThan(20);
    expect(after.x2).toBeCloseTo(before.x2, 0);
    expect(after.y2).toBeCloseTo(before.y2, 0);

    // bodyOffsetPx changed in the model (persisted, undoable) for OUR comment.
    const json = await exportJsonText(page);
    const doc = JSON.parse(json) as { annotations?: ExportedComment[] };
    const offset = (doc.annotations ?? []).find((a) => a.id === commentId)?.bodyOffsetPx;
    expect(offset).toBeDefined();
    // Original default offset was { dx: 48, dy: -36 }; it grew by ~ (120, 60).
    expect(offset?.dx ?? 0).toBeGreaterThan(48 + 80);
    expect(offset?.dy ?? 0).toBeGreaterThan(-36 + 30);
  });

  test('an item-anchored comment follows its item when the item moves', async ({ page }) => {
    await openApp(page);
    await movePaletteAway(page);
    const bar = page.locator('svg [data-item-id="oa-phase-plan-dev"]');
    const barBox = await bar.boundingBox();
    expect(barBox).not.toBeNull();
    if (barBox === null) {
      return;
    }
    // Select the item, then add an item-anchored comment.
    await page.mouse.click(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await expect(
      page.locator('svg [data-item-id="oa-phase-plan-dev"] [data-role="selection-outline"]'),
    ).toHaveCount(1);
    await page.getByRole('button', { name: 'Add comment' }).dispatchEvent('click');
    const commentId = await newestCreatedCommentId(page);
    expect(commentId).not.toBeNull();
    // Confirm the created comment is item-anchored (follows the item).
    const exported = JSON.parse(await exportJsonText(page)) as { annotations?: ExportedComment[] };
    const mine = (exported.annotations ?? []).find((a) => a.id === commentId);
    expect(mine?.anchorItemId).toBe('oa-phase-plan-dev');
    const leader = page.locator(
      `svg [data-role="comment-leader"][data-annotation-id="${commentId}"]`,
    );
    await leader.waitFor();
    const anchorBefore = await leader.evaluate((node) => ({
      x2: Number(node.getAttribute('x2')),
      y2: Number(node.getAttribute('y2')),
    }));

    // Re-select and drag the ITEM to the right.
    await page.mouse.click(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await page.mouse.move(barBox.x + barBox.width / 2, barBox.y + barBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(barBox.x + barBox.width / 2 + 120, barBox.y + barBox.height / 2, {
      steps: 14,
    });
    await page.mouse.up();

    // The comment anchor (leader end) followed the item to the right.
    const anchorAfter = await leader.evaluate((node) => ({
      x2: Number(node.getAttribute('x2')),
      y2: Number(node.getAttribute('y2')),
    }));
    expect(anchorAfter.x2).toBeGreaterThan(anchorBefore.x2 + 40);
  });
});

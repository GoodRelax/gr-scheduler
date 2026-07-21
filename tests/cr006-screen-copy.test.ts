/**
 * Unit coverage for the CR-006 Part 3 SS behavior change: the viewport capture is now
 * COPIED to the clipboard as a PNG image, falling back to a PNG download when the
 * browser cannot write images to the clipboard or the write is rejected.
 *
 * The async Clipboard API, ClipboardItem, URL and the download anchor are all stubbed
 * so the outcome branching (clipboard vs. download) is asserted deterministically in
 * the Node environment, without a real browser.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyPngToClipboardOrDownload } from '../src/adapters/io/screen-capture.js';

/** A minimal stub of `ClipboardItem` recording the payload it was constructed with. */
class StubClipboardItem {
  public readonly items: Record<string, Blob>;
  public constructor(items: Record<string, Blob>) {
    this.items = items;
  }
}

/** Install a fake `document` + `URL` so the download fallback path runs headlessly. */
function stubDownloadEnvironment(): { clicks: number } {
  const record = { clicks: 0 };
  const anchor = {
    href: '',
    download: '',
    rel: '',
    click: () => {
      record.clicks += 1;
    },
    remove: () => undefined,
  };
  vi.stubGlobal('document', {
    createElement: () => anchor,
    body: { appendChild: () => undefined },
  });
  vi.stubGlobal('URL', {
    createObjectURL: () => 'blob:stub',
    revokeObjectURL: () => undefined,
  });
  return record;
}

const pngBlob = (): Blob => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copyPngToClipboardOrDownload', () => {
  it('copies to the clipboard when the image write succeeds', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal('ClipboardItem', StubClipboardItem);

    const outcome = await copyPngToClipboardOrDownload(pngBlob(), 'shot.png');

    expect(outcome).toBe('clipboard');
    expect(write).toHaveBeenCalledTimes(1);
    const [items] = write.mock.calls[0] as [unknown[]];
    expect(items[0]).toBeInstanceOf(StubClipboardItem);
    expect((items[0] as StubClipboardItem).items['image/png']).toBeInstanceOf(Blob);
  });

  it('falls back to a PNG download when the clipboard write is rejected', async () => {
    const write = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal('ClipboardItem', StubClipboardItem);
    const download = stubDownloadEnvironment();

    const outcome = await copyPngToClipboardOrDownload(pngBlob(), 'shot.png');

    expect(outcome).toBe('download');
    expect(write).toHaveBeenCalledTimes(1);
    expect(download.clicks).toBe(1);
  });

  it('falls back to a PNG download when image clipboard writes are unsupported', async () => {
    // No ClipboardItem constructor -> clipboardSupportsImages is false, so the write is
    // never attempted and the download path runs.
    const write = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { write } });
    vi.stubGlobal('ClipboardItem', undefined);
    const download = stubDownloadEnvironment();

    const outcome = await copyPngToClipboardOrDownload(pngBlob(), 'shot.png');

    expect(outcome).toBe('download');
    expect(write).not.toHaveBeenCalled();
    expect(download.clicks).toBe(1);
  });
});

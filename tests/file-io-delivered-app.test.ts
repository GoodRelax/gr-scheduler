/**
 * Unit coverage for the CR-010 self-download of the CLEAN delivered single-HTML app
 * ({@link downloadDeliveredApp}). The function re-fetches the delivered bytes via
 * `fetch(location.href)` and MUST NOT serialize the live edited DOM
 * (`document.documentElement.outerHTML`), otherwise the user's in-progress edits would
 * leak into the "clean app" download.
 *
 * These run in the default Node environment: `fetch` and `downloadBlob` are injected
 * so no real DOM / object-URL machinery is needed. A trap on
 * `document.documentElement.outerHTML` proves the code path never reads it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DELIVERED_APP_FILE_NAME,
  downloadDeliveredApp,
} from '../src/adapters/io/file-io.js';

/** A minimal ok/failing Response stand-in for the injected fetch. */
function fakeResponse(body: string, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as { document?: unknown }).document;
});

describe('downloadDeliveredApp: fetch -> Blob -> download', () => {
  it('re-fetches location.href and downloads the delivered text as gr-scheduler.html', async () => {
    const deliveredHtml = '<!doctype html><html><head></head><body>clean app</body></html>';
    const fetchImpl = vi.fn(() => Promise.resolve(fakeResponse(deliveredHtml)));
    const downloadBlob = vi.fn<(fileName: string, blob: Blob) => void>();

    const result = await downloadDeliveredApp({
      sourceUrl: 'https://example.test/app.html',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      downloadBlob,
    });

    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('https://example.test/app.html', { cache: 'no-store' });
    expect(downloadBlob).toHaveBeenCalledTimes(1);

    const firstCall = downloadBlob.mock.calls.at(0);
    if (firstCall === undefined) {
      throw new Error('downloadBlob was not called');
    }
    const [fileName, blob] = firstCall;
    expect(fileName).toBe('gr-scheduler.html');
    expect(fileName).toBe(DELIVERED_APP_FILE_NAME);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/html');
    // The Blob content is the FETCHED text, proving the source is the delivered bytes.
    await expect(blob.text()).resolves.toBe(deliveredHtml);
  });

  it('never reads document.documentElement.outerHTML (no edited-DOM leak)', async () => {
    let outerHtmlRead = false;
    (globalThis as { document?: unknown }).document = {
      documentElement: {
        get outerHTML(): string {
          outerHtmlRead = true;
          return '<html>EDITED DOM SHOULD NOT BE USED</html>';
        },
      },
    };

    const fetchImpl = vi.fn(() => Promise.resolve(fakeResponse('<html>delivered</html>')));
    const downloadBlob = vi.fn<(fileName: string, blob: Blob) => void>();

    await downloadDeliveredApp({
      sourceUrl: 'https://example.test/app.html',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      downloadBlob,
    });

    expect(outerHtmlRead).toBe(false);
    const firstCall = downloadBlob.mock.calls.at(0);
    if (firstCall === undefined) {
      throw new Error('downloadBlob was not called');
    }
    const [, blob] = firstCall;
    await expect(blob.text()).resolves.toBe('<html>delivered</html>');
  });

  it('returns false (no download) when the fetch responds not-ok', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(fakeResponse('', false, 404)));
    const downloadBlob = vi.fn<(fileName: string, blob: Blob) => void>();

    const result = await downloadDeliveredApp({
      sourceUrl: 'https://example.test/missing.html',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      downloadBlob,
    });

    expect(result).toBe(false);
    expect(downloadBlob).not.toHaveBeenCalled();
  });

  it('catches a fetch rejection (offline / file:// / CORS) without throwing', async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    const downloadBlob = vi.fn<(fileName: string, blob: Blob) => void>();

    // Must resolve, never reject.
    const result = await downloadDeliveredApp({
      sourceUrl: 'file:///C:/local/gr-scheduler.html',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      downloadBlob,
    });

    expect(result).toBe(false);
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});

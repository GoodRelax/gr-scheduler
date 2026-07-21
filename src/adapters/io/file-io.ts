/**
 * Adapter layer: File API glue for download/upload (IO-L1-004, ARCH-C-024).
 * This is the DOM-dependent boundary; all parsing/sanitizing/validation lives in
 * the pure UseCase codecs (json-codec / mspdi-codec / import-sanitizer / svg-
 * exporter). Keeping the DOM here preserves Clean Architecture / DIP: the domain
 * never imports `document`/`Blob`/`FileReader`.
 */

import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:io');

/**
 * Trigger a client-side download of an already-built Blob under a file name
 * (IO-L1-004). Uses an object URL + a transient anchor; revokes the URL afterwards.
 * This is the shared DOM primitive behind {@link downloadTextFile} and
 * {@link downloadDeliveredApp}.
 *
 * @param fileName - Suggested download file name (with extension).
 * @param blob - The Blob to save.
 */
export function downloadBlobFile(fileName: string, blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    log.info('file_downloaded', { file_name: fileName, mime_type: blob.type, byte_length: blob.size });
  } finally {
    // Defer revoke so the click's navigation can start first.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/**
 * Trigger a client-side download of a text payload as a file (IO-L1-004). Wraps
 * the text in a Blob and delegates to {@link downloadBlobFile}.
 *
 * @param fileName - Suggested download file name (with extension).
 * @param mimeType - MIME type for the Blob (e.g. `application/json`).
 * @param text - The file contents.
 */
export function downloadTextFile(fileName: string, mimeType: string, text: string): void {
  downloadBlobFile(fileName, new Blob([text], { type: mimeType }));
}

/** Fixed file name for the self-download of the delivered single-HTML app (CR-010). */
export const DELIVERED_APP_FILE_NAME = 'gr-scheduler.html';

/** Injectable collaborators for {@link downloadDeliveredApp} (for unit testing). */
export interface DeliveredAppDownloadDeps {
  /** URL to re-fetch the delivered HTML from (defaults to the current location). */
  readonly sourceUrl?: string;
  /** `fetch` implementation (defaults to the global `fetch`); mockable in tests. */
  readonly fetchImpl?: typeof fetch;
  /** Blob-download sink (defaults to {@link downloadBlobFile}); mockable in tests. */
  readonly downloadBlob?: (fileName: string, blob: Blob) => void;
}

/**
 * Download the CLEAN delivered single-HTML app (CR-010 Part 2). Re-fetches the HTML
 * text that was originally served for this page via `fetch(location.href)`, wraps it
 * in a `text/html` Blob, and saves it as the fixed file name `gr-scheduler.html`.
 *
 * Crucially this reads the DELIVERED bytes over the network, NOT
 * `document.documentElement.outerHTML`: the live DOM carries the user's in-progress
 * edits, so serializing it would leak the edited document into the "clean app"
 * download. This function never touches the DOM's serialized markup.
 *
 * Offline / cross-origin failures (e.g. opened via `file://`, where `fetch` is
 * rejected by the scheme/CORS) are harmless: the user already holds the file. Such a
 * failure is caught, logged at WARN, and reported to the caller as `false` (no throw)
 * so the caller can surface a gentle notice or no-op (CR-010 Part 3).
 *
 * @param deps - Optional injectable collaborators (for unit testing).
 * @returns `true` when the download was triggered; `false` when the fetch failed.
 */
export async function downloadDeliveredApp(deps: DeliveredAppDownloadDeps = {}): Promise<boolean> {
  const sourceUrl = deps.sourceUrl ?? location.href;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const downloadBlob = deps.downloadBlob ?? downloadBlobFile;
  try {
    const response = await fetchImpl(sourceUrl, { cache: 'no-store' });
    if (!response.ok) {
      log.warn('delivered_app_fetch_rejected', { http_status: response.status });
      return false;
    }
    const deliveredHtml = await response.text();
    downloadBlob(DELIVERED_APP_FILE_NAME, new Blob([deliveredHtml], { type: 'text/html' }));
    return true;
  } catch (error) {
    // Harmless offline / file:// / CORS case: the user already has the file.
    const reason = error instanceof Error ? error.message : String(error);
    log.warn('delivered_app_fetch_failed', { reason });
    return false;
  }
}

/**
 * Prompt the user to pick a single file via a transient `<input type="file">`
 * (IO-L1-004). Resolves with the chosen File, or null if the dialog is cancelled.
 *
 * @param accept - Accept filter, e.g. `.json,.xml`.
 * @returns The selected File or null.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    let settled = false;
    const finish = (file: File | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Cancellation does not always fire `change`; `cancel` is the modern signal.
    input.addEventListener('cancel', () => finish(null));
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Read a File's contents as UTF-8 text (for JSON / MSPDI / SVG imports).
 *
 * @param file - The file to read.
 * @returns The decoded text.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

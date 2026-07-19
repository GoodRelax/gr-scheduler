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
 * Trigger a client-side download of a text payload as a file (IO-L1-004). Uses a
 * Blob + object URL + transient anchor; revokes the URL afterwards.
 *
 * @param fileName - Suggested download file name (with extension).
 * @param mimeType - MIME type for the Blob (e.g. `application/json`).
 * @param text - The file contents.
 */
export function downloadTextFile(fileName: string, mimeType: string, text: string): void {
  const blob = new Blob([text], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    log.info('file_downloaded', { file_name: fileName, mime_type: mimeType, byte_length: blob.size });
  } finally {
    // Defer revoke so the click's navigation can start first.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/**
 * Prompt the user to pick a single file via a transient `<input type="file">`
 * (IO-L1-004). Resolves with the chosen File, or null if the dialog is cancelled.
 *
 * @param accept - Accept filter, e.g. `.json,.xml` or `image/png,.svg`.
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

/**
 * Read a File's contents as raw bytes (for PNG magic-byte/dimension validation).
 *
 * @param file - The file to read.
 * @returns The bytes.
 */
export function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

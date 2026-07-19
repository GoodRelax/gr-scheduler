/**
 * Adapter layer: rasterize the schedule to a PNG and put it on the clipboard or a
 * download (SHELL file-ops batch: Screen Copy + PNG export).
 *
 * The DOM-dependent boundary (Image, canvas, Blob, ClipboardItem) lives here so the
 * domain never touches it (Clean Architecture / DIP). The input is always a
 * self-contained SVG string produced by the pure `svg-exporter` use case: it has
 * every color baked in (no CSS-variable dependency) and embeds sanitized icon
 * assets as `data:` URIs, so the rasterization is deterministic and offline.
 *
 * Screen Copy prefers the async Clipboard API (`navigator.clipboard.write` +
 * `ClipboardItem`); when image writes are unsupported (Firefox without the flag,
 * insecure context, older engines) it transparently falls back to a PNG download so
 * the user still gets the capture.
 */

import { createLogger } from '../../app/logger.js';

const log = createLogger('grsch:capture');

/** The outcome of a Screen-Copy request (what actually happened). */
export type ScreenCopyOutcome = 'clipboard' | 'download';

/** Default rasterization scale (device-independent 2x for a crisp capture). */
const DEFAULT_RASTER_SCALE = 2;

/**
 * Whether the running browser can put a PNG image on the clipboard. Pure predicate
 * (no side effects) so the fallback decision is unit-testable without a real write.
 *
 * @param clipboardApi - The `navigator.clipboard`-shaped object (or undefined).
 * @param clipboardItemCtor - The global `ClipboardItem` constructor (or undefined).
 * @returns True when an image clipboard write can be attempted.
 */
export function clipboardSupportsImages(
  clipboardApi: { write?: unknown } | undefined,
  clipboardItemCtor: unknown,
): boolean {
  return (
    clipboardApi !== undefined &&
    typeof clipboardApi.write === 'function' &&
    typeof clipboardItemCtor === 'function'
  );
}

/**
 * Rasterize a self-contained SVG string into a PNG {@link Blob} via an offscreen
 * canvas.
 *
 * @param svgText - A self-contained SVG document string.
 * @param scale - Pixel scale multiplier (defaults to {@link DEFAULT_RASTER_SCALE}).
 * @returns The PNG blob.
 * @throws {Error} When the 2D context is unavailable or the SVG fails to decode.
 */
export function rasterizeSvgToPng(svgText: string, scale: number = DEFAULT_RASTER_SCALE): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const safeSvg = stripXmlIncompatibleChars(svgText);
    const { width, height } = readSvgPixelSize(safeSvg);
    const image = new Image();
    image.decoding = 'sync';
    // Encode as a UTF-8 data URL (no blob-URL taint) so the canvas stays exportable.
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safeSvg)}`;
    image.onload = (): void => {
      try {
        const pixelWidth = Math.max(1, Math.round((image.naturalWidth || width) * scale));
        const pixelHeight = Math.max(1, Math.round((image.naturalHeight || height) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
        const context = canvas.getContext('2d');
        if (context === null) {
          reject(new Error('Screen capture failed: 2D canvas context is unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
        canvas.toBlob((blob) => {
          if (blob === null) {
            reject(new Error('Screen capture failed: canvas produced no PNG blob'));
            return;
          }
          resolve(blob);
        }, 'image/png');
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    image.onerror = (): void => {
      reject(new Error('Screen capture failed: the SVG image could not be decoded'));
    };
    image.src = svgUrl;
  });
}

/**
 * Copy a PNG blob to the clipboard, falling back to a download when the browser
 * cannot write images to the clipboard or the write is rejected.
 *
 * @param blob - The PNG blob to place on the clipboard.
 * @param fileName - The download file name used by the fallback path.
 * @returns Which path was taken.
 */
export async function copyPngToClipboardOrDownload(
  blob: Blob,
  fileName: string,
): Promise<ScreenCopyOutcome> {
  const clipboardItemCtor = (globalThis as { ClipboardItem?: unknown }).ClipboardItem;
  if (clipboardSupportsImages(navigator.clipboard as { write?: unknown } | undefined, clipboardItemCtor)) {
    try {
      const ClipboardItemCtor = clipboardItemCtor as new (
        items: Record<string, Blob>,
      ) => unknown;
      const item = new ClipboardItemCtor({ 'image/png': blob }) as never;
      await (navigator.clipboard as unknown as { write: (items: unknown[]) => Promise<void> }).write([
        item,
      ]);
      log.info('screen_copied_to_clipboard', { byte_length: blob.size });
      return 'clipboard';
    } catch (error) {
      // Permission denied / not-allowed: fall through to the download path so the
      // user still receives the capture rather than a silent failure.
      log.info('screen_copy_clipboard_denied', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  downloadPngBlob(fileName, blob);
  return 'download';
}

/**
 * Trigger a client-side download of a PNG blob (used by the PNG export button and
 * the Screen-Copy fallback).
 *
 * @param fileName - Suggested download file name (with `.png`).
 * @param blob - The PNG blob.
 */
export function downloadPngBlob(fileName: string, blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    log.info('png_downloaded', { file_name: fileName, byte_length: blob.size });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

/**
 * Parse the intrinsic pixel size from an SVG string's `width` / `height`
 * attributes, falling back to the `viewBox` extent, then to a sane default. Pure
 * and unit-testable.
 *
 * @param svgText - The SVG document string.
 * @returns The width / height in CSS pixels.
 */
export function readSvgPixelSize(svgText: string): { width: number; height: number } {
  const widthAttr = /\bwidth="([\d.]+)"/.exec(svgText);
  const heightAttr = /\bheight="([\d.]+)"/.exec(svgText);
  if (widthAttr !== null && heightAttr !== null) {
    return { width: Number(widthAttr[1]), height: Number(heightAttr[1]) };
  }
  const viewBox = /\bviewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/.exec(svgText);
  if (viewBox !== null) {
    return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }
  return { width: 1280, height: 720 };
}

/**
 * Strip the C0 control characters that are ILLEGAL in XML 1.0 (everything below
 * U+0020 except tab / newline / carriage return). The schedule exporter can emit
 * such a character inside metadata attributes (the classification row-id joins its
 * category path with a U+0001 separator); a strict `<img>`/`DOMParser` SVG decode
 * rejects the whole document on the first one, so the raster path removes them.
 * Pure and unit-testable; the visible drawing is unaffected (only opaque metadata
 * loses a delimiter).
 *
 * @param svgText - The SVG document string.
 * @returns The SVG with XML-incompatible control characters removed.
 */
export function stripXmlIncompatibleChars(svgText: string): string {
  let out = '';
  for (let index = 0; index < svgText.length; index += 1) {
    const code = svgText.charCodeAt(index);
    // Keep tab (9), line feed (10), carriage return (13) and everything >= space
    // (32); drop the remaining C0 controls that XML 1.0 forbids in attribute values.
    if (code === 9 || code === 10 || code === 13 || code >= 32) {
      out += svgText.charAt(index);
    }
  }
  return out;
}

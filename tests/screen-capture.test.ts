/**
 * Unit coverage for the screen-capture adapter's PURE decision logic (SHELL
 * file-ops batch: Screen Copy + PNG). The rasterization itself needs a real
 * Image/canvas and is exercised in tests/e2e; here we assert the clipboard-support
 * predicate (which drives the download fallback) and the SVG size parser, both DOM-
 * free and deterministic.
 */

import { describe, expect, it } from 'vitest';
import {
  clipboardSupportsImages,
  readSvgPixelSize,
  stripXmlIncompatibleChars,
} from '../src/adapters/io/screen-capture.js';

describe('clipboardSupportsImages', () => {
  it('is true only when both clipboard.write and ClipboardItem exist', () => {
    const clipboardItem = function ClipboardItem(): void {};
    expect(clipboardSupportsImages({ write: () => undefined }, clipboardItem)).toBe(true);
  });

  it('is false when clipboard.write is missing', () => {
    const clipboardItem = function ClipboardItem(): void {};
    expect(clipboardSupportsImages({}, clipboardItem)).toBe(false);
    expect(clipboardSupportsImages(undefined, clipboardItem)).toBe(false);
  });

  it('is false when ClipboardItem is unavailable (fall back to download)', () => {
    expect(clipboardSupportsImages({ write: () => undefined }, undefined)).toBe(false);
  });
});

describe('readSvgPixelSize', () => {
  it('reads the width / height attributes when present', () => {
    const svg = '<svg width="640" height="480" viewBox="0 0 640 480"></svg>';
    expect(readSvgPixelSize(svg)).toEqual({ width: 640, height: 480 });
  });

  it('falls back to the viewBox extent when width/height are absent', () => {
    const svg = '<svg viewBox="0 0 300 200"></svg>';
    expect(readSvgPixelSize(svg)).toEqual({ width: 300, height: 200 });
  });

  it('falls back to a sane default when neither is parseable', () => {
    expect(readSvgPixelSize('<svg></svg>')).toEqual({ width: 1280, height: 720 });
  });
});

describe('stripXmlIncompatibleChars', () => {
  it('removes XML-illegal C0 control characters (so a strict SVG decode succeeds)', () => {
    // The classification row-id joins its path with U+0001; a raw one breaks XML.
    const dirty = `<g data-row-id="Over All Schedule${String.fromCharCode(1)}Milestones">x</g>`;
    const clean = stripXmlIncompatibleChars(dirty);
    expect(clean).toBe('<g data-row-id="Over All ScheduleMilestones">x</g>');
    expect(clean.includes(String.fromCharCode(1))).toBe(false);
  });

  it('preserves tab, newline, carriage return and all printable characters', () => {
    const text = 'a\tb\nc\rd <svg/> Z';
    expect(stripXmlIncompatibleChars(text)).toBe(text);
  });
});

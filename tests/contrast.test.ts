import { describe, expect, it } from 'vitest';
import {
  AA_TEXT_CONTRAST_RATIO,
  contrastRatio,
  meetsContrastAA,
  parseHexColor,
  relativeLuminance,
} from '../src/domain/usecase/contrast.js';
import { UI_COLOR_PAIRS } from '../src/domain/usecase/a11y-tokens.js';
import { CUD_PALETTE } from '../src/domain/model/cud-palette.js';

describe('contrast helper (WCAG 1.4.3)', () => {
  it('parses #rgb and #rrggbb forms', () => {
    expect(parseHexColor('#fff')).toEqual({ red: 255, green: 255, blue: 255 });
    expect(parseHexColor('#000000')).toEqual({ red: 0, green: 0, blue: 0 });
    expect(parseHexColor('#0072B2')).toEqual({ red: 0, green: 114, blue: 178 });
  });

  it('rejects malformed hex colors loudly', () => {
    expect(() => parseHexColor('rgb(0,0,0)')).toThrow();
    expect(() => parseHexColor('#12')).toThrow();
  });

  it('computes the canonical black/white contrast ratio of 21', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('is order-independent', () => {
    expect(contrastRatio('#333333', '#f5f5f5')).toBeCloseTo(
      contrastRatio('#f5f5f5', '#333333'),
      10,
    );
  });

  it('relative luminance is monotonic (black < gray < white)', () => {
    expect(relativeLuminance('#000000')).toBeLessThan(relativeLuminance('#808080'));
    expect(relativeLuminance('#808080')).toBeLessThan(relativeLuminance('#ffffff'));
  });
});

describe('UI color tokens meet WCAG AA (1.4.3 / 1.4.11)', () => {
  it.each(UI_COLOR_PAIRS)('$tokenName meets its AA threshold', (pair) => {
    const ratio = contrastRatio(pair.foregroundHex, pair.backgroundHex);
    const threshold = pair.isLargeOrUi ? 3 : AA_TEXT_CONTRAST_RATIO;
    expect(ratio).toBeGreaterThanOrEqual(threshold);
    expect(meetsContrastAA(pair.foregroundHex, pair.backgroundHex, pair.isLargeOrUi)).toBe(true);
  });
});

describe('CUD palette color-vision distinguishability (NFR-L1-006)', () => {
  it('uses no raw primaries for the chromatic colors', () => {
    const rawPrimaries = new Set(['#ff0000', '#00ff00', '#0000ff']);
    for (const color of CUD_PALETTE) {
      expect(rawPrimaries.has(color.cssValue.toLowerCase())).toBe(false);
    }
  });

  it('gives every palette color a distinct value (adjacent swatches differ)', () => {
    const values = CUD_PALETTE.map((color) => color.cssValue.toLowerCase());
    expect(new Set(values).size).toBe(values.length);
  });

  it('separates the red/green confusion pair by both hue and some luminance (CUD)', () => {
    const red = CUD_PALETTE.find((color) => color.colorKey === 'red')?.cssValue ?? '';
    const green = CUD_PALETTE.find((color) => color.colorKey === 'green')?.cssValue ?? '';
    expect(red).not.toBe(green);
    // The Okabe-Ito vermillion/green pair differ mainly in hue but still carry a
    // small luminance separation, aiding grayscale/CVD distinguishability.
    const luminanceGap = Math.abs(relativeLuminance(red) - relativeLuminance(green));
    expect(luminanceGap).toBeGreaterThan(0.02);
  });
});

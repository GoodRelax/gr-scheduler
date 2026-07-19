import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILL_COLOR,
  DEFAULT_STROKE_COLOR,
  TRANSPARENT_COLOR_KEY,
} from '../src/domain/model/cud-palette.js';
import { isValidColorValue } from '../src/domain/usecase/color-validator.js';

describe('palette defaults (item: transparent stroke by default)', () => {
  it('defaults the item stroke to transparent so new items have no border', () => {
    expect(DEFAULT_STROKE_COLOR).toBe(TRANSPARENT_COLOR_KEY);
    expect(DEFAULT_STROKE_COLOR).toBe('transparent');
  });

  it('keeps a visible fill color as the fill default', () => {
    expect(DEFAULT_FILL_COLOR).not.toBe('transparent');
    expect(DEFAULT_FILL_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('accepts both defaults as safe color literals', () => {
    expect(isValidColorValue(DEFAULT_STROKE_COLOR)).toBe(true);
    expect(isValidColorValue(DEFAULT_FILL_COLOR)).toBe(true);
    expect(isValidColorValue(TRANSPARENT_COLOR_KEY)).toBe(true);
  });
});

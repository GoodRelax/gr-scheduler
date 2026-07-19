import { describe, expect, it } from 'vitest';
import {
  clampLeftPaneWidth,
  DEFAULT_LEFT_PANE_WIDTH,
  MAX_LEFT_PANE_WIDTH,
  MIN_LEFT_PANE_WIDTH,
  resolveLeftPaneWidth,
} from '../src/domain/usecase/left-pane-layout.js';

describe('left pane width clamp (CANVAS-L2-001)', () => {
  it('clamps below the minimum up to the minimum', () => {
    expect(clampLeftPaneWidth(10, 1000)).toBe(MIN_LEFT_PANE_WIDTH);
  });

  it('clamps above the absolute maximum down to the maximum', () => {
    expect(clampLeftPaneWidth(9999, 100000)).toBe(MAX_LEFT_PANE_WIDTH);
  });

  it('never lets the pane exceed 60% of the available canvas width', () => {
    // 60% of 300 = 180, which is within [min, max], so it caps there.
    expect(clampLeftPaneWidth(9999, 300)).toBe(180);
  });

  it('passes a sensible width through unchanged', () => {
    expect(clampLeftPaneWidth(240, 1200)).toBe(240);
  });

  it('falls back to the default when unknown available width', () => {
    expect(clampLeftPaneWidth(9999, 0)).toBe(MAX_LEFT_PANE_WIDTH);
  });
});

describe('resolveLeftPaneWidth', () => {
  it('returns the default for undefined or NaN', () => {
    expect(resolveLeftPaneWidth(undefined)).toBe(DEFAULT_LEFT_PANE_WIDTH);
    expect(resolveLeftPaneWidth(Number.NaN)).toBe(DEFAULT_LEFT_PANE_WIDTH);
  });

  it('returns the stored width when present', () => {
    expect(resolveLeftPaneWidth(275)).toBe(275);
  });
});

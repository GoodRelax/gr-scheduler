import { describe, expect, it } from 'vitest';
import {
  clampFadeDays,
  fadeInDaysFromPointer,
  fadeOutDaysFromPointer,
  fadePointsToAttribute,
  fadeTrapezoidPoints,
  hasFade,
  type FadePoint,
} from '../src/domain/usecase/fade-geometry.js';

/** Identity-ish mapper: 1 day = 10 world px, so day math is easy to read. */
const dayToX = (day: number): number => day * 10;

/** The vertex order is [bottom-left, bottom-right, top-right, top-left]. */
function points(fadeInDays: number, fadeOutDays: number): readonly FadePoint[] {
  return fadeTrapezoidPoints({
    startDay: 0,
    endDay: 10,
    fadeInDays,
    fadeOutDays,
    top: 0,
    bottom: 20,
    dayToX,
  });
}

describe('fade-geometry: trapezoid vertices', () => {
  it('renders a rectangle when both fades are 0 (existing bars unchanged)', () => {
    const [bottomLeft, bottomRight, topRight, topLeft] = points(0, 0);
    // bottom edge spans start..end, top edge spans start..end: an axis-aligned rect.
    expect(bottomLeft).toEqual({ x: 0, y: 20 });
    expect(bottomRight).toEqual({ x: 100, y: 20 });
    expect(topRight).toEqual({ x: 100, y: 0 });
    expect(topLeft).toEqual({ x: 0, y: 0 });
    // Left edge is vertical (same x top and bottom); right edge too.
    expect(topLeft?.x).toBe(bottomLeft?.x);
    expect(topRight?.x).toBe(bottomRight?.x);
  });

  it('renders a PARALLELOGRAM when fadeIn === fadeOut > 0 (parallel slanted edges)', () => {
    const [bottomLeft, bottomRight, topRight, topLeft] = points(3, 3);
    expect(bottomLeft).toEqual({ x: 0, y: 20 });
    expect(bottomRight).toEqual({ x: 70, y: 20 }); // end - fadeOut = day 7
    expect(topRight).toEqual({ x: 100, y: 0 });
    expect(topLeft).toEqual({ x: 30, y: 0 }); // start + fadeIn = day 3
    // Both slanted edges share the same (dx, dy): parallel => parallelogram.
    const leftEdge = { dx: (topLeft?.x ?? 0) - (bottomLeft?.x ?? 0), dy: -20 };
    const rightEdge = { dx: (topRight?.x ?? 0) - (bottomRight?.x ?? 0), dy: -20 };
    expect(leftEdge).toEqual(rightEdge);
  });

  it('renders a right-tapering trapezoid for fade-out only', () => {
    const [bottomLeft, bottomRight, topRight, topLeft] = points(0, 4);
    expect(bottomLeft?.x).toBe(0);
    expect(bottomRight?.x).toBe(60); // end - 4 days
    expect(topRight?.x).toBe(100);
    expect(topLeft?.x).toBe(0); // no fade-in: square left edge
  });

  it('clamps when fadeIn + fadeOut exceeds the task length (no crossing)', () => {
    // Requested 8 + 8 on a 10-day task: fade-in clamps to 10, then fade-out to 0.
    const [bottomLeft, bottomRight, topRight, topLeft] = points(8, 8);
    // No inversion: top-left x <= top-right x and bottom-right x >= bottom-left x.
    expect(topLeft?.x).toBeLessThanOrEqual(topRight?.x ?? 0);
    expect(bottomRight?.x).toBeGreaterThanOrEqual(bottomLeft?.x ?? 0);
  });
});

describe('fade-geometry: clampFadeDays', () => {
  it('leaves a valid pair unchanged', () => {
    expect(clampFadeDays(10, 3, 4)).toEqual({ fadeInDays: 3, fadeOutDays: 4 });
  });

  it('forces negatives to zero', () => {
    expect(clampFadeDays(10, -5, -2)).toEqual({ fadeInDays: 0, fadeOutDays: 0 });
  });

  it('caps the sum at the task length (fade-in first, then remaining)', () => {
    const clamped = clampFadeDays(10, 8, 8);
    expect(clamped.fadeInDays + clamped.fadeOutDays).toBeLessThanOrEqual(10);
    expect(clamped).toEqual({ fadeInDays: 8, fadeOutDays: 2 });
  });

  it('never produces a negative remaining fade-out', () => {
    expect(clampFadeDays(4, 10, 10)).toEqual({ fadeInDays: 4, fadeOutDays: 0 });
  });
});

describe('fade-geometry: hasFade', () => {
  it('is false when both are absent or zero', () => {
    expect(hasFade(undefined, undefined)).toBe(false);
    expect(hasFade(0, 0)).toBe(false);
  });

  it('is true when either side tapers', () => {
    expect(hasFade(2, 0)).toBe(true);
    expect(hasFade(0, 5)).toBe(true);
  });
});

describe('fade-geometry: corner-drag mapping', () => {
  const startDay = 0;
  const endDay = 10;
  const length = 10;

  it('dragging the top-left corner RIGHT increases fade-in', () => {
    // Pointer over day 3 -> fade-in 3.
    expect(fadeInDaysFromPointer(3, startDay, length, 0)).toBe(3);
    // Further right (day 6) -> larger fade-in.
    expect(fadeInDaysFromPointer(6, startDay, length, 0)).toBe(6);
    // Left of start -> clamped to 0.
    expect(fadeInDaysFromPointer(-4, startDay, length, 0)).toBe(0);
  });

  it('dragging the bottom-right corner LEFT increases fade-out', () => {
    // Pointer over day 7 -> fade-out (10 - 7) = 3.
    expect(fadeOutDaysFromPointer(7, endDay, length, 0)).toBe(3);
    // Further left (day 4) -> larger fade-out.
    expect(fadeOutDaysFromPointer(4, endDay, length, 0)).toBe(6);
    // Right of end -> clamped to 0.
    expect(fadeOutDaysFromPointer(14, endDay, length, 0)).toBe(0);
  });

  it('clamps fade-in against an existing fade-out (and vice versa)', () => {
    // With fade-out already 4, fade-in maxes at 6 even if dragged to day 9.
    expect(fadeInDaysFromPointer(9, startDay, length, 4)).toBe(6);
    // With fade-in already 7, fade-out maxes at 3 even if dragged to day 1.
    expect(fadeOutDaysFromPointer(1, endDay, length, 7)).toBe(3);
  });

  it('rounds fractional pointer days to whole days', () => {
    expect(fadeInDaysFromPointer(2.6, startDay, length, 0)).toBe(3);
    expect(fadeOutDaysFromPointer(6.4, endDay, length, 0)).toBe(4);
  });
});

describe('fade-geometry: SVG points serialization', () => {
  it('formats vertices as space-separated x,y pairs', () => {
    expect(fadePointsToAttribute(points(0, 0))).toBe('0,20 100,20 100,0 0,0');
  });
});

/**
 * Unit coverage for the saturation-derived plan/actual coloring (CR-002 Part 1).
 * Locks the pure HSL helpers (parse / format / round-trip) and the pale-plan /
 * vivid-actual derivations, plus the explicit-override and plan-only passthrough.
 */

import { describe, expect, it } from 'vitest';
import {
  actualColorFrom,
  actualDisplayFillColor,
  displayFillColor,
  hslToCss,
  parseColorToHsl,
  planColorFrom,
} from '../src/domain/usecase/plan-actual-colors.js';

describe('HSL parse / format helpers', () => {
  it('parses #rrggbb into HSL', () => {
    const hsl = parseColorToHsl('#ff0000');
    expect(hsl).not.toBeNull();
    expect(hsl!.h).toBeCloseTo(0, 1);
    expect(hsl!.s).toBeCloseTo(1, 2);
    expect(hsl!.l).toBeCloseTo(0.5, 2);
  });

  it('parses the #rgb short form identically to its long form', () => {
    expect(parseColorToHsl('#0f0')).toEqual(parseColorToHsl('#00ff00'));
  });

  it('parses an rgb() functional color', () => {
    const hsl = parseColorToHsl('rgb(0, 0, 255)');
    expect(hsl).not.toBeNull();
    expect(hsl!.h).toBeCloseTo(240, 0);
  });

  it('returns null for a color it cannot parse (named / transparent)', () => {
    expect(parseColorToHsl('transparent')).toBeNull();
    expect(parseColorToHsl('rebeccapurple')).toBeNull();
  });

  it('round-trips a hex color through HSL within a 1-step rounding tolerance', () => {
    for (const hex of ['#2f80ed', '#e07c1a', '#123456', '#abcdef', '#7b2fbf']) {
      const back = hslToCss(parseColorToHsl(hex)!);
      const channelsOf = (value: string): number[] => [
        parseInt(value.slice(1, 3), 16),
        parseInt(value.slice(3, 5), 16),
        parseInt(value.slice(5, 7), 16),
      ];
      const original = channelsOf(hex);
      const restored = channelsOf(back);
      for (let channel = 0; channel < 3; channel += 1) {
        expect(Math.abs(original[channel]! - restored[channel]!)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is achromatic (s = 0) for a pure gray', () => {
    const hsl = parseColorToHsl('#808080');
    expect(hsl!.s).toBe(0);
  });
});

describe('plan (pale) / actual (vivid) derivations', () => {
  const base = '#2f80ed';

  it('planColorFrom desaturates and lightens the base', () => {
    const baseHsl = parseColorToHsl(base)!;
    const planHsl = parseColorToHsl(planColorFrom(base))!;
    expect(planHsl.s).toBeLessThan(baseHsl.s);
    expect(planHsl.l).toBeGreaterThan(baseHsl.l);
    expect(planHsl.h).toBeCloseTo(baseHsl.h, 0); // hue preserved
  });

  it('actualColorFrom saturates and deepens the base', () => {
    const baseHsl = parseColorToHsl(base)!;
    const actualHsl = parseColorToHsl(actualColorFrom(base))!;
    expect(actualHsl.s).toBeGreaterThanOrEqual(baseHsl.s);
    expect(actualHsl.l).toBeLessThanOrEqual(baseHsl.l);
    expect(actualHsl.h).toBeCloseTo(baseHsl.h, 0);
  });

  it('returns the base unchanged when the color is unparseable', () => {
    expect(planColorFrom('transparent')).toBe('transparent');
    expect(actualColorFrom('rebeccapurple')).toBe('rebeccapurple');
  });
});

describe('displayFillColor / actualDisplayFillColor item wiring', () => {
  it('keeps a plan-only item own stored fill', () => {
    expect(displayFillColor({ fillColor: '#2f80ed' })).toBe('#2f80ed');
  });

  it('uses the pale plan shade when the item records an actual', () => {
    const item = { fillColor: '#2f80ed', actualStart: '2026-02-03' };
    expect(displayFillColor(item)).toBe(planColorFrom('#2f80ed'));
    expect(actualDisplayFillColor(item)).toBe(actualColorFrom('#2f80ed'));
  });

  it('an explicit fill overrides both derived sides', () => {
    const item = { fillColor: '#2f80ed', fillColorExplicit: true, actualStart: '2026-02-03' };
    expect(displayFillColor(item)).toBe('#2f80ed');
    expect(actualDisplayFillColor(item)).toBe('#2f80ed');
  });
});

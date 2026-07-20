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

  it('keeps the plan tint clearly COLORED (retains chroma), never a grey wash', () => {
    // Regression guard: an earlier tuning drained the base blue #4477aa almost to a
    // flat grey (~#b6c2ce, saturation ~0.19). The plan shade must stay a recognizable
    // COLOR: retain a minimum saturation AND be lighter than the base, for every CUD
    // fill in the palette. The minimum sits comfortably above the old grey value so a
    // regression back to a wash fails here.
    const MIN_PLAN_SATURATION = 0.3;
    for (const fill of ['#4477aa', '#66ccee', '#228833', '#ccbb44', '#ee6677', '#aa3377']) {
      const baseHsl = parseColorToHsl(fill)!;
      const planHsl = parseColorToHsl(planColorFrom(fill))!;
      expect(planHsl.s).toBeGreaterThanOrEqual(MIN_PLAN_SATURATION);
      expect(planHsl.l).toBeGreaterThan(baseHsl.l);
      expect(planHsl.h).toBeCloseTo(baseHsl.h, 0);
    }
  });

  it('derives a soft BLUE (not grey) plan tint from the base blue #4477aa', () => {
    // The concrete anchor from the fix: #4477aa should yield a soft blue tint around
    // #81a4c7 (blue channel clearly the largest and well above the red channel), not
    // a near-neutral grey where the channels bunch together.
    const plan = planColorFrom('#4477aa');
    const red = parseInt(plan.slice(1, 3), 16);
    const blue = parseInt(plan.slice(5, 7), 16);
    // A genuine blue keeps a wide blue-over-red gap; a grey wash would collapse it.
    expect(blue - red).toBeGreaterThan(50);
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

import { describe, expect, it } from 'vitest';
import {
  ACTUAL_STROKE_WIDTH_PX,
  FOCUS_RING_DASH_ARRAY,
  FOCUS_RING_STROKE_WIDTH,
  PLAN_STROKE_WIDTH_PX,
  SELECTION_DASH_ARRAY,
  planActualStrokeDashArray,
  planActualStrokeWidthPx,
} from '../src/domain/usecase/a11y-tokens.js';

describe('non-color encoding (WCAG 1.4.1 Use of Color)', () => {
  it('encodes selection with a dash pattern, not hue alone', () => {
    expect(SELECTION_DASH_ARRAY).toMatch(/\d/);
    expect(SELECTION_DASH_ARRAY).not.toBe('none');
  });

  it('distinguishes plan from actual by line WEIGHT, not a dash (CR-002 Part 1)', () => {
    // CR-002 Part 1: the non-color plan/actual redundancy is the outline WEIGHT
    // (plan thin / actual thick), NOT a dash pattern (dashes were rejected as busy).
    const planWidth = planActualStrokeWidthPx('plan');
    const actualWidth = planActualStrokeWidthPx('actual');
    // Plan is the supplementary (thinner) side; actual is emphasized (thicker).
    expect(planWidth).toBeLessThan(actualWidth);
    expect(planWidth).toBe(PLAN_STROKE_WIDTH_PX);
    expect(actualWidth).toBe(ACTUAL_STROKE_WIDTH_PX);
    // Both sides stay SOLID: no dash is used for the plan/actual distinction.
    expect(planActualStrokeDashArray('plan')).toBe('none');
    expect(planActualStrokeDashArray('actual')).toBe('none');
    expect(planActualStrokeDashArray(undefined)).toBe('none');
  });

  it('makes the keyboard focus ring distinct from the selection outline (2.4.7)', () => {
    // Focus ring is solid (differs from the dashed selection) and thicker.
    expect(FOCUS_RING_DASH_ARRAY).toBe('none');
    expect(FOCUS_RING_DASH_ARRAY).not.toBe(SELECTION_DASH_ARRAY);
    expect(FOCUS_RING_STROKE_WIDTH).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  FOCUS_RING_DASH_ARRAY,
  FOCUS_RING_STROKE_WIDTH,
  SELECTION_DASH_ARRAY,
  planActualStrokeDashArray,
} from '../src/domain/usecase/a11y-tokens.js';

describe('non-color encoding (WCAG 1.4.1 Use of Color)', () => {
  it('encodes selection with a dash pattern, not hue alone', () => {
    expect(SELECTION_DASH_ARRAY).toMatch(/\d/);
    expect(SELECTION_DASH_ARRAY).not.toBe('none');
  });

  it.skip('TODO(IM3): distinguishes plan from actual by a non-color stroke attribute', () => {
    // CR-002 Part 1 moves the non-color plan/actual redundancy from a dash pattern to a
    // line-WIDTH code (plan thin / actual thick), deferred to IM3. Until then
    // planActualStrokeDashArray is neutralized to 'none' for every case.
    const plan = planActualStrokeDashArray('plan');
    const actual = planActualStrokeDashArray('actual');
    expect(plan).not.toBe(actual);
    expect(plan).toMatch(/\d/);
    expect(actual).toBe('none');
    expect(planActualStrokeDashArray(undefined)).toBe('none');
  });

  it('makes the keyboard focus ring distinct from the selection outline (2.4.7)', () => {
    // Focus ring is solid (differs from the dashed selection) and thicker.
    expect(FOCUS_RING_DASH_ARRAY).toBe('none');
    expect(FOCUS_RING_DASH_ARRAY).not.toBe(SELECTION_DASH_ARRAY);
    expect(FOCUS_RING_STROKE_WIDTH).toBeGreaterThan(0);
  });
});

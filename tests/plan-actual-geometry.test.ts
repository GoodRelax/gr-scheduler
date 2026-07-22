import { describe, expect, it } from 'vitest';
import {
  actualBarDrawnWidthPx,
  actualBarRenderWidthPx,
  computePlanActualBars,
  MIN_ACTUAL_BAR_WIDTH_PX,
  separateActualBarOffsetPx,
  SEPARATE_LANE_GAP_FRACTION,
  type PlanActualBarsInput,
} from '../src/domain/usecase/plan-actual-geometry.js';
import { computeDisplayedPlanActualBars } from '../src/domain/usecase/plan-actual-display.js';

/** Base input: plan 100..200 on a lane at y=50 height=40. */
function baseInput(over: Partial<PlanActualBarsInput> = {}): PlanActualBarsInput {
  return {
    planStartWorldX: 100,
    planEndWorldX: 200,
    actualStartWorldX: null,
    actualEndWorldX: null,
    laneTop: 50,
    laneHeight: 40,
    style: 'overlap',
    ...over,
  };
}

describe('computePlanActualBars (PLAN-L1-005 two-mode geometry)', () => {
  it('overlap: plan fills the lane, no actual bar when no actual is recorded', () => {
    const bars = computePlanActualBars(baseInput({ style: 'overlap' }));
    expect(bars.plan).toEqual({ x: 100, y: 50, width: 100, height: 40 });
    expect(bars.actual).toBeNull();
  });

  it('overlap: actual bar overlays the actual extent at full lane height', () => {
    const bars = computePlanActualBars(
      baseInput({ style: 'overlap', actualStartWorldX: 120, actualEndWorldX: 170 }),
    );
    expect(bars.plan).toEqual({ x: 100, y: 50, width: 100, height: 40 });
    expect(bars.actual).toEqual({ x: 120, y: 50, width: 50, height: 40 });
  });

  // CR-013 Part 1: `separate` no longer HALVES the lane. Both bars keep the full
  // (normal) bar height and the actual is stacked below the plan; the ROW pays for the
  // extra extent (see the layout-engine tests).
  it('separate: both bars keep the FULL bar height, actual stacked below the plan', () => {
    const bars = computePlanActualBars(
      baseInput({ style: 'separate', actualStartWorldX: 120, actualEndWorldX: 170 }),
    );
    const gap = 40 * SEPARATE_LANE_GAP_FRACTION;
    expect(bars.plan).toEqual({ x: 100, y: 50, width: 100, height: 40 });
    expect(bars.actual?.x).toBe(120);
    expect(bars.actual?.width).toBe(50);
    expect(bars.actual?.height).toBe(40);
    expect(bars.actual!.y).toBeCloseTo(50 + 40 + gap, 6);
    // The two stacked bars never overlap (a gap sits between them).
    expect(bars.actual!.y).toBeGreaterThan(bars.plan.y + bars.plan.height);
    expect(bars.actual!.y - bars.plan.y).toBeCloseTo(separateActualBarOffsetPx(40), 6);
  });

  it('separate: no actual bar when no actual is recorded, plan keeps the full lane', () => {
    const bars = computePlanActualBars(baseInput({ style: 'separate' }));
    expect(bars.plan.height).toBeCloseTo(40, 6);
    expect(bars.actual).toBeNull();
  });

  it('offsets the actual bar by one bar height plus the gap fraction', () => {
    expect(separateActualBarOffsetPx(20)).toBeCloseTo(20 * (1 + SEPARATE_LANE_GAP_FRACTION), 6);
    // Purely proportional: the offset scales with the bar height (zoomY).
    expect(separateActualBarOffsetPx(40)).toBeCloseTo(2 * separateActualBarOffsetPx(20), 6);
  });

  it('clamps a back-dated / degenerate plan span to zero width', () => {
    const bars = computePlanActualBars(
      baseInput({ planEndWorldX: 100, actualStartWorldX: 170, actualEndWorldX: 120 }),
    );
    expect(bars.plan.width).toBe(0);
    // CR-013 Part 2: an actual never collapses below the screen-space floor.
    expect(bars.actual?.width).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
  });

  it('floors a missing actual end at the minimum grabbable width', () => {
    const bars = computePlanActualBars(
      baseInput({ style: 'overlap', actualStartWorldX: 140, actualEndWorldX: null }),
    );
    expect(bars.actual).toEqual({ x: 140, y: 50, width: MIN_ACTUAL_BAR_WIDTH_PX, height: 40 });
  });

  it('leaves an actual wider than the floor untouched', () => {
    expect(actualBarRenderWidthPx(0)).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
    expect(actualBarRenderWidthPx(MIN_ACTUAL_BAR_WIDTH_PX - 1)).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
    expect(actualBarRenderWidthPx(80)).toBe(80);
  });
});

/**
 * Review L-2: the minimum-width floor is a rendering aid, so it may never state an
 * overrun the dates do not support. While the plan bar is drawn ALONGSIDE the actual,
 * a floored bar is pulled back to the planned end; a genuinely late actual is not.
 */
describe('actualBarDrawnWidthPx (L-2: the floor never fakes an overrun)', () => {
  it('clamps a zero-length actual to the plan end on a very short plan bar', () => {
    // Plan 100..104 (4 px, e.g. a 1-day task zoomed out); actual recorded as started
    // only, so its raw span is zero and the floor alone would reach x = 112.
    expect(actualBarDrawnWidthPx(100, 100, 104)).toBe(4);
    // ...instead of the unclamped floor.
    expect(actualBarRenderWidthPx(0)).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
  });

  it('keeps a GENUINE overrun at full length (a real slip stays visible)', () => {
    // The recorded actual end (140) really is past the planned end (120): untouched.
    expect(actualBarDrawnWidthPx(100, 140, 120)).toBe(40);
    // A zero-length actual that STARTS after the planned end is an overrun too, so it
    // keeps the floor and stays grabbable.
    expect(actualBarDrawnWidthPx(130, 130, 120)).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
  });

  it('never pulls the bar back behind the actual END it records', () => {
    // Recorded 100..108 (inside the plan): the floor would draw 112, the clamp gives
    // the plan end 110 -- still >= the recorded end, so no date is hidden.
    expect(actualBarDrawnWidthPx(100, 108, 110)).toBe(10);
    // A recorded span already wider than the floor and inside the plan is untouched.
    expect(actualBarDrawnWidthPx(100, 180, 200)).toBe(80);
  });

  it('applies the clamp to the drawn bar only while BOTH sides are shown', () => {
    // Both shown (the gate sets `planBarDrawnAlongside`): clamped to the plan end.
    const clamped = computeDisplayedPlanActualBars(
      baseInput({ planStartWorldX: 100, planEndWorldX: 104, actualStartWorldX: 100 }),
      'both',
    );
    expect(clamped.actual?.width).toBe(4);
    expect(clamped.plan?.width).toBe(4);
    // Actual-only: no plan bar is drawn to misread it against, and the floor is what
    // keeps the lone unfinished actual grabbable, so it survives (CR-013 Part 2).
    const lone = computeDisplayedPlanActualBars(
      baseInput({ planStartWorldX: 100, planEndWorldX: 104, actualStartWorldX: 100 }),
      'actual-only',
    );
    expect(lone.actual?.width).toBe(MIN_ACTUAL_BAR_WIDTH_PX);
  });

  it('clamps under `separate` too (the stacked bars are read against each other)', () => {
    const bars = computeDisplayedPlanActualBars(
      baseInput({
        style: 'separate',
        planStartWorldX: 100,
        planEndWorldX: 104,
        actualStartWorldX: 100,
      }),
      'both',
    );
    expect(bars.actual?.width).toBe(4);
  });
});

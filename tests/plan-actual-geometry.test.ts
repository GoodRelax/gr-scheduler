import { describe, expect, it } from 'vitest';
import {
  computePlanActualBars,
  SEPARATE_LANE_GAP_FRACTION,
  type PlanActualBarsInput,
} from '../src/domain/usecase/plan-actual-geometry.js';

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

  it('separate: plan takes the top sub-lane and actual the bottom sub-lane', () => {
    const bars = computePlanActualBars(
      baseInput({ style: 'separate', actualStartWorldX: 120, actualEndWorldX: 170 }),
    );
    const gap = 40 * SEPARATE_LANE_GAP_FRACTION;
    const subHeight = (40 - gap) / 2;
    expect(bars.plan).toEqual({ x: 100, y: 50, width: 100, height: subHeight });
    expect(bars.actual).toEqual({
      x: 120,
      y: 50 + subHeight + gap,
      width: 50,
      height: subHeight,
    });
    // The two stacked bars never overlap (a gap sits between them).
    expect(bars.actual!.y).toBeGreaterThan(bars.plan.y + bars.plan.height);
  });

  it('separate: no actual bar when no actual is recorded, plan still halves the lane', () => {
    const bars = computePlanActualBars(baseInput({ style: 'separate' }));
    const subHeight = (40 - 40 * SEPARATE_LANE_GAP_FRACTION) / 2;
    expect(bars.plan.height).toBeCloseTo(subHeight, 6);
    expect(bars.actual).toBeNull();
  });

  it('clamps a back-dated / degenerate span to zero width', () => {
    const bars = computePlanActualBars(
      baseInput({ planEndWorldX: 100, actualStartWorldX: 170, actualEndWorldX: 120 }),
    );
    expect(bars.plan.width).toBe(0);
    expect(bars.actual?.width).toBe(0);
  });

  it('degenerates a missing actual end to the actual start (zero-width marker)', () => {
    const bars = computePlanActualBars(
      baseInput({ style: 'overlap', actualStartWorldX: 140, actualEndWorldX: null }),
    );
    expect(bars.actual).toEqual({ x: 140, y: 50, width: 0, height: 40 });
  });
});

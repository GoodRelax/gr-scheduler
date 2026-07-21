/**
 * UseCase layer: the plan/actual DISPLAY filter (PLAN-L1-002) expressed as pure
 * predicates plus the gate that turns the pure bar GEOMETRY into the bars that are
 * actually drawn.
 *
 * `planActualDisplay` answers "which SIDE is shown" (plan / actual / both / none),
 * while `planActualStyle` answers "how are the two sides stacked" (overlap /
 * separate). The two are independent, so the gate below is applied ON TOP of
 * {@link computePlanActualBars}, which stays a pure geometry function with no
 * knowledge of the filter (DEF-008):
 *
 * | display    | plan bar                  | actual bar                     |
 * |------------|---------------------------|--------------------------------|
 * | both       | drawn                     | drawn when an actual is recorded |
 * | plan-only  | drawn, filling the lane   | NOT drawn                      |
 * | actual-only| NOT drawn                 | drawn over the actual extent   |
 * | none       | NOT drawn                 | NOT drawn                      |
 *
 * When ONE side is suppressed the survivor must read as a SINGLE bar, so the gate
 * drops the hidden side's sub-lane as well: the surviving bar is computed in the
 * `overlap` frame and therefore fills the whole lane height under BOTH styles.
 *
 * Pure and side-effect free; shared by the item render layer, the dependency
 * visibility predicates and the palette toggles.
 */

import type { PlanActualDisplay } from '../model/schedule-model.js';
import {
  computePlanActualBars,
  type PlanActualBarRect,
  type PlanActualBarsInput,
} from './plan-actual-geometry.js';

/**
 * Whether the PLAN side is shown under a display filter.
 *
 * @param display - The active filter; `undefined` behaves as `both`.
 * @returns True for `both` and `plan-only`.
 */
export function isPlanSideShown(display: PlanActualDisplay | undefined): boolean {
  const effectiveDisplay = display ?? 'both';
  return effectiveDisplay === 'both' || effectiveDisplay === 'plan-only';
}

/**
 * Whether the ACTUAL side is shown under a display filter.
 *
 * @param display - The active filter; `undefined` behaves as `both`.
 * @returns True for `both` and `actual-only`.
 */
export function isActualSideShown(display: PlanActualDisplay | undefined): boolean {
  const effectiveDisplay = display ?? 'both';
  return effectiveDisplay === 'both' || effectiveDisplay === 'actual-only';
}

/**
 * Combine two independent Plan / Actual toggles into a single display filter: both
 * on -> `both`, only one on -> that side, neither -> `none`. The inverse of
 * {@link isPlanSideShown} / {@link isActualSideShown}.
 *
 * @param planShown - Whether the plan toggle is on.
 * @param actualShown - Whether the actual toggle is on.
 * @returns The matching display filter.
 */
export function planActualDisplayFromSides(
  planShown: boolean,
  actualShown: boolean,
): PlanActualDisplay {
  if (planShown && actualShown) {
    return 'both';
  }
  if (planShown) {
    return 'plan-only';
  }
  if (actualShown) {
    return 'actual-only';
  }
  return 'none';
}

/** The bars a renderer should actually draw; a suppressed / absent side is null. */
export interface DisplayedPlanActualBars {
  /** The plan bar, or null when the plan side is hidden by the filter. */
  readonly plan: PlanActualBarRect | null;
  /**
   * The actual bar, or null when the actual side is hidden by the filter or the item
   * records no actual dates.
   */
  readonly actual: PlanActualBarRect | null;
}

/**
 * Gate the pure plan/actual bar geometry with the display filter (PLAN-L1-002 x
 * PLAN-L1-005, DEF-008).
 *
 * - `both`: the unchanged two-bar geometry for the requested style.
 * - `plan-only`: the item is treated as having NO actual, so the plan bar fills the
 *   lane (no actual sub-lane is reserved) under both styles.
 * - `actual-only`: only the actual extent is returned, likewise filling the lane.
 * - `none`: nothing is drawn.
 *
 * @param input - The same world-space geometry input {@link computePlanActualBars} takes.
 * @param display - The active display filter; `undefined` behaves as `both`.
 * @returns The plan and actual rectangles to draw, each null when not drawn.
 */
export function computeDisplayedPlanActualBars(
  input: PlanActualBarsInput,
  display: PlanActualDisplay | undefined,
): DisplayedPlanActualBars {
  const planShown = isPlanSideShown(display);
  const actualShown = isActualSideShown(display);
  if (!planShown && !actualShown) {
    return { plan: null, actual: null };
  }
  if (planShown && actualShown) {
    const bars = computePlanActualBars(input);
    return { plan: bars.plan, actual: bars.actual };
  }
  // Exactly one side survives: compute it in the `overlap` frame so it fills the lane
  // and reads as a single bar, whichever style is active.
  if (planShown) {
    const bars = computePlanActualBars({
      ...input,
      actualStartWorldX: null,
      actualEndWorldX: null,
      style: 'overlap',
    });
    return { plan: bars.plan, actual: null };
  }
  const bars = computePlanActualBars({ ...input, style: 'overlap' });
  return { plan: null, actual: bars.actual };
}

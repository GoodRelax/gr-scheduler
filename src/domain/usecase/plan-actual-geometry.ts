/**
 * UseCase layer: pure geometry for the two plan/actual render styles
 * (PLAN-L1-005, CR-001 Part A). A single item carries BOTH its planned span
 * (startDate/endDate) and its actual span (actualStart/actualEnd); this module maps
 * those, plus the item's lane rectangle, to the plan bar and (optional) actual bar
 * rectangles for each style:
 *
 * - `overlap` (default): the plan bar fills the lane and the actual bar is painted
 *   ON TOP of it over the actual extent, so the plan shows through where the actual
 *   has not reached.
 * - `separate`: the lane is split into a top sub-lane (plan) and a bottom sub-lane
 *   (actual), separated by a small gap, so plan and actual are drawn side-by-side
 *   vertically.
 *
 * Colors are a render concern (deferred to IM3, CR-002 Part 1); this module produces
 * only the two-mode GEOMETRY and is pure / side-effect free.
 */

/** The world-space plan/actual display style (mirrors {@link ViewState.planActualStyle}). */
export type PlanActualStyle = 'overlap' | 'separate';

/** A world-space rectangle for one drawn bar. */
export interface PlanActualBarRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The plan bar plus the optional actual bar for one item under a style. */
export interface PlanActualBars {
  readonly plan: PlanActualBarRect;
  readonly actual: PlanActualBarRect | null;
}

/** Inputs to {@link computePlanActualBars}, all in the SAME world-space x/y frame. */
export interface PlanActualBarsInput {
  /** World x of the plan span start (the item's laid-out left edge). */
  readonly planStartWorldX: number;
  /** World x of the plan span end (left + laid-out width). */
  readonly planEndWorldX: number;
  /** World x of the actual span start, or null when no actual is recorded. */
  readonly actualStartWorldX: number | null;
  /** World x of the actual span end; falls back to the actual start (degenerate span). */
  readonly actualEndWorldX: number | null;
  /** World y of the item's lane top. */
  readonly laneTop: number;
  /** World height of the item's lane. */
  readonly laneHeight: number;
  /** The active plan/actual style. */
  readonly style: PlanActualStyle;
}

/**
 * Fraction of the lane height used as the vertical GAP between the plan and actual
 * sub-lanes in `separate` mode, so the two stacked bars read as distinct rows.
 */
export const SEPARATE_LANE_GAP_FRACTION = 0.12;

/** Clamp a bar width to be non-negative (a degenerate/back-dated span becomes 0). */
function nonNegativeWidth(startWorldX: number, endWorldX: number): number {
  return Math.max(0, endWorldX - startWorldX);
}

/**
 * Compute the plan bar and the optional actual bar for an item under the active
 * plan/actual style (PLAN-L1-005).
 *
 * @param input - Plan/actual world-x extents and the item's lane rectangle + style.
 * @returns The plan bar and, when an actual is recorded, the actual bar; otherwise
 *   `actual` is null.
 */
export function computePlanActualBars(input: PlanActualBarsInput): PlanActualBars {
  const planWidth = nonNegativeWidth(input.planStartWorldX, input.planEndWorldX);
  const hasActual = input.actualStartWorldX !== null;
  const actualStartWorldX = input.actualStartWorldX ?? 0;
  // A missing actual end degenerates to the actual start (zero-width marker extent).
  const actualEndWorldX = input.actualEndWorldX ?? actualStartWorldX;
  const actualWidth = nonNegativeWidth(actualStartWorldX, actualEndWorldX);

  if (input.style === 'separate') {
    const gap = input.laneHeight * SEPARATE_LANE_GAP_FRACTION;
    const subHeight = Math.max(0, (input.laneHeight - gap) / 2);
    const plan: PlanActualBarRect = {
      x: input.planStartWorldX,
      y: input.laneTop,
      width: planWidth,
      height: subHeight,
    };
    const actual: PlanActualBarRect | null = hasActual
      ? {
          x: actualStartWorldX,
          y: input.laneTop + subHeight + gap,
          width: actualWidth,
          height: subHeight,
        }
      : null;
    return { plan, actual };
  }

  // Overlap (default): plan fills the lane; actual is painted on top of its extent.
  const plan: PlanActualBarRect = {
    x: input.planStartWorldX,
    y: input.laneTop,
    width: planWidth,
    height: input.laneHeight,
  };
  const actual: PlanActualBarRect | null = hasActual
    ? {
        x: actualStartWorldX,
        y: input.laneTop,
        width: actualWidth,
        height: input.laneHeight,
      }
    : null;
  return { plan, actual };
}

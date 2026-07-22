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
 * - `separate`: the actual bar is stacked BELOW the plan bar, separated by a small
 *   gap. Both bars keep the item's NORMAL bar height (CR-013 Part 1): the style never
 *   halves a bar. The extra vertical extent is paid for by the ROW, whose band the
 *   layout engine grows for rows that really carry a stacked actual bar --
 *   {@link separateActualBarOffsetPx} is the single number both sides agree on.
 *
 * Colors are a render concern (deferred to IM3, CR-002 Part 1); this module produces
 * only the two-mode GEOMETRY and is pure / side-effect free.
 */

/** The world-space plan/actual display style (mirrors {@link ViewState.planActualStyle}). */
export type PlanActualStyle = 'overlap' | 'separate';

/**
 * Resolve the effective plan/actual style from the view-state value (CR-006 Part 6).
 * Absent / undefined is treated as `overlap` (the unchanged default), so the palette
 * `[Ao]` / `[As]` segmented toggle reflects `overlap` on a fresh document. Pure.
 *
 * @param style - The `viewState.planActualStyle` value (or undefined).
 * @returns The effective style, defaulting to `overlap`.
 */
export function resolvePlanActualStyle(style: PlanActualStyle | undefined): PlanActualStyle {
  return style === 'separate' ? 'separate' : 'overlap';
}

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
  /** World y of the item's lane top (also the plan bar top). */
  readonly laneTop: number;
  /**
   * World height of the item's lane, i.e. the NORMAL rendered bar height. Under
   * `separate` BOTH bars keep exactly this height and the actual bar is placed below
   * the lane (CR-013 Part 1); the lane is never split into half-height sub-lanes.
   */
  readonly laneHeight: number;
  /** The active plan/actual style. */
  readonly style: PlanActualStyle;
  /**
   * Whether the PLAN bar is drawn ALONGSIDE the actual (both sides pass the display
   * filter). Only then is the actual's minimum-width floor clamped to the plan's right
   * edge (review L-2): with both bars on screen a floored actual sticking out past the
   * planned end reads as "the actual overran the plan", which the data may not say. With
   * the plan hidden there is nothing to misread it against, and the floor is what keeps
   * a lone, unfinished actual visible and grabbable (CR-013 Part 2). Absent = false.
   */
  readonly planBarDrawnAlongside?: boolean;
}

/**
 * Vertical GAP between the stacked plan and actual bars in `separate` mode, as a
 * fraction of the bar height, so the two full-height bars read as distinct rows
 * (CR-013 Part 1 re-defined this from "fraction of the lane consumed by the split").
 */
export const SEPARATE_LANE_GAP_FRACTION = 0.12;

/**
 * Vertical offset from the PLAN bar's top to the ACTUAL bar's top under `separate`:
 * one full bar height plus the {@link SEPARATE_LANE_GAP_FRACTION} gap. It is also
 * exactly the EXTRA height one lane must reserve, which is how the layout engine
 * grows a row that carries a stacked actual bar (single source of truth shared by
 * the geometry and the row-height decision).
 *
 * @param barHeightPx - The item's normal rendered bar height in world px.
 * @returns The offset / extra lane height in world px.
 */
export function separateActualBarOffsetPx(barHeightPx: number): number {
  return barHeightPx * (1 + SEPARATE_LANE_GAP_FRACTION);
}

/**
 * Minimum rendered width of an ACTUAL bar in SCREEN pixels (CR-013 Part 2). An
 * actual that records only `actualStart` ("started, not finished") maps to a
 * zero-width span, which would render invisible and be impossible to grab. The floor
 * is a constant number of px -- roughly three quarters of a standard mouse cursor --
 * added at RENDER time only, so it never changes the recorded dates and stays the
 * same on screen at every zoom level.
 */
export const MIN_ACTUAL_BAR_WIDTH_PX = 12;

/**
 * Apply the {@link MIN_ACTUAL_BAR_WIDTH_PX} screen-space floor to an actual bar's
 * world width. Used by the renderer AND the hit tester so the drawn bar and its grab
 * target are always the same rectangle.
 *
 * @param rawWidthPx - The width the actual span maps to at the current zoom.
 * @returns The width to draw / hit-test.
 */
export function actualBarRenderWidthPx(rawWidthPx: number): number {
  return Math.max(rawWidthPx, MIN_ACTUAL_BAR_WIDTH_PX);
}

/**
 * The width an actual bar is DRAWN (and hit-tested) with when its plan bar is on
 * screen next to it: the {@link MIN_ACTUAL_BAR_WIDTH_PX} floor, then clamped so the
 * FLOOR alone can never push the bar past the planned end (review L-2).
 *
 * The floor is a rendering aid, not data: on a short plan bar (or at a small zoomX) it
 * used to stretch a zero-length actual well beyond the plan's right edge, stating an
 * overrun the dates do not support. A REAL overrun -- an actual whose recorded end
 * genuinely passes the planned end -- is never clamped, so a true slip stays visible.
 * The clamp also never pulls the bar back behind the actual's own recorded end.
 *
 * @param actualStartWorldX - World x of the actual span start.
 * @param actualEndWorldX - World x of the actual span end (the start for a degenerate span).
 * @param planEndWorldX - World x of the plan bar's right edge.
 * @returns The width to draw / hit-test.
 */
export function actualBarDrawnWidthPx(
  actualStartWorldX: number,
  actualEndWorldX: number,
  planEndWorldX: number,
): number {
  const recordedRight = Math.max(actualStartWorldX, actualEndWorldX);
  const flooredRight =
    actualStartWorldX + actualBarRenderWidthPx(recordedRight - actualStartWorldX);
  const drawnRight =
    recordedRight > planEndWorldX ? flooredRight : Math.min(flooredRight, planEndWorldX);
  return Math.max(0, drawnRight - actualStartWorldX);
}

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
  // CR-013 Part 2: an actual is never thinner than the screen-space floor, so a
  // "started, not finished" actual (actualStart only) stays visible and grabbable.
  // L-2: while the plan bar is drawn alongside, that floor yields to the planned end
  // so it cannot fake an overrun (a REAL overrun is left alone).
  const actualWidth =
    input.planBarDrawnAlongside === true
      ? actualBarDrawnWidthPx(actualStartWorldX, actualEndWorldX, input.planEndWorldX)
      : actualBarRenderWidthPx(nonNegativeWidth(actualStartWorldX, actualEndWorldX));

  if (input.style === 'separate') {
    // CR-013 Part 1: the plan bar keeps the FULL lane height and the actual bar is
    // stacked below it at the same height; the row (not the bar) pays for the extra
    // vertical extent.
    const plan: PlanActualBarRect = {
      x: input.planStartWorldX,
      y: input.laneTop,
      width: planWidth,
      height: input.laneHeight,
    };
    const actual: PlanActualBarRect | null = hasActual
      ? {
          x: actualStartWorldX,
          y: input.laneTop + separateActualBarOffsetPx(input.laneHeight),
          width: actualWidth,
          height: input.laneHeight,
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

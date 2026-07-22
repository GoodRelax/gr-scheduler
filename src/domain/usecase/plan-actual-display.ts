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

import type { IsoDate, PlanActualDisplay, ScheduleItem } from '../model/schedule-model.js';
import {
  actualBarRenderWidthPx,
  computePlanActualBars,
  type PlanActualBarRect,
  type PlanActualBarsInput,
  type PlanActualStyle,
} from './plan-actual-geometry.js';
import { hasFade } from './fade-geometry.js';
import { effectiveTaskShape, taskShapeUsesPath } from './task-glyph.js';
import { dateToWorldX } from './time-coordinate-mapper.js';

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
    // Both bars are on screen, so the actual's minimum-width floor must not fake an
    // overrun past the planned end (review L-2).
    const bars = computePlanActualBars({ ...input, planBarDrawnAlongside: true });
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
      planBarDrawnAlongside: false,
    });
    return { plan: bars.plan, actual: null };
  }
  // Actual-only: no plan bar is drawn to compare against, and the floor is the only
  // thing keeping an unfinished actual visible/grabbable, so it is NOT clamped (L-2).
  const bars = computePlanActualBars({
    ...input,
    style: 'overlap',
    planBarDrawnAlongside: false,
  });
  return { plan: null, actual: bars.actual };
}

/**
 * Whether an item renders a SECOND, dedicated actual BAR next to its plan bar.
 * Only a plain rectangular TASK that records an actual start does: a milestone shows
 * its actual as a point marker (CR-002 Part 2, no width concept), and the path-shaped
 * (arrow / chevron / span) and tapered (fade) task glyphs draw a single glyph only.
 * Mirrors exactly what the item render layer mounts, so the layout engine can size a
 * row from the same rule.
 *
 * @param item - The item to test.
 * @returns True when a separate actual bar is drawn for the item.
 */
export function drawsActualBar(item: ScheduleItem): boolean {
  if (item.itemKind !== 'task' || item.actualStart === undefined) {
    return false;
  }
  if (taskShapeUsesPath(effectiveTaskShape(item))) {
    return false;
  }
  return !hasFade(item.fadeInDays, item.fadeOutDays);
}

/**
 * Whether an item stacks its actual bar BELOW its plan bar, which is what makes a row
 * grow taller (CR-013 Part 1). True only for the `separate` style with BOTH sides
 * shown and an item that really draws an actual bar: under `plan-only` / `actual-only`
 * a single bar survives and fills the lane, so no extra height is reserved.
 *
 * @param item - The item to test.
 * @param style - The active plan/actual style.
 * @param display - The active display filter; `undefined` behaves as `both`.
 * @returns True when the item needs the stacked (taller) lane.
 */
export function stacksActualBarBelowPlan(
  item: ScheduleItem,
  style: PlanActualStyle,
  display: PlanActualDisplay | undefined,
): boolean {
  if (style !== 'separate') {
    return false;
  }
  if (!isPlanSideShown(display) || !isActualSideShown(display)) {
    return false;
  }
  return drawsActualBar(item);
}

/** The world-space lane rectangle an item was laid out into (an {@link ItemPlacement}). */
export interface ItemLaneRect {
  readonly worldX: number;
  readonly worldY: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
}

/** An item's recorded ACTUAL span mapped into the placement's world-x frame. */
export interface ActualSpanWorldX {
  readonly startWorldX: number;
  /** Null while the item is still in progress (no `actualEnd`) or is a point. */
  readonly endWorldX: number | null;
}

/**
 * Map an item's recorded actual span onto the same time axis as its plan and align it
 * into the placement's world-x frame, so an actual bar / marker lines up with the
 * laid-out plan bar regardless of the placement's x origin. Shared by the render layer
 * and the hit tester so what is drawn is exactly what is grabbable.
 *
 * @param item - The item whose actual span to map.
 * @param lane - The item's laid-out lane rectangle.
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The actual span's world-x extents, or null when no actual is recorded.
 */
export function actualSpanWorldX(
  item: ScheduleItem,
  lane: ItemLaneRect,
  epochDate: IsoDate,
  zoomX: number,
): ActualSpanWorldX | null {
  if (item.actualStart === undefined) {
    return null;
  }
  const originShift = lane.worldX - dateToWorldX(item.startDate, epochDate, zoomX);
  return {
    startWorldX: dateToWorldX(item.actualStart, epochDate, zoomX) + originShift,
    endWorldX:
      item.actualEnd != null ? dateToWorldX(item.actualEnd, epochDate, zoomX) + originShift : null,
  };
}

/**
 * The lane rectangle a LONE actual side is drawn from under `actual-only`: the item's
 * lane moved onto the actual span. A milestone is a point, so only its center moves; a
 * task spans `actualStart`..`actualEnd` and takes the {@link actualBarRenderWidthPx}
 * screen-space floor so an unfinished actual stays visible and grabbable (CR-013
 * Part 2). The floor is deliberately NOT clamped to the plan's right edge here (unlike
 * the both-sides-shown geometry, review L-2): no plan bar is drawn in this mode, so a
 * wider floor states nothing about plan-vs-actual, and it is the only thing that keeps
 * the lone glyph grabbable. Null when the item records no actual.
 *
 * @param item - The item whose actual side is drawn alone.
 * @param lane - Its laid-out lane rectangle.
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @returns The lane rectangle of the lone actual side, or null.
 */
export function actualSideLaneRect(
  item: ScheduleItem,
  lane: ItemLaneRect,
  epochDate: IsoDate,
  zoomX: number,
): ItemLaneRect | null {
  const span = actualSpanWorldX(item, lane, epochDate, zoomX);
  if (span === null) {
    return null;
  }
  if (item.itemKind === 'milestone') {
    return { ...lane, worldX: span.startWorldX };
  }
  const rawWidth = Math.max(0, (span.endWorldX ?? span.startWorldX) - span.startWorldX);
  return {
    ...lane,
    worldX: span.startWorldX,
    worldWidth: actualBarRenderWidthPx(rawWidth),
  };
}

/**
 * The plan / actual rectangles an item actually draws: {@link computePlanActualBars}
 * fed from the item's own dates and lane rectangle, then gated by the display filter.
 * The single entry point the render layer and the hit tester share.
 *
 * @param item - The item to draw.
 * @param lane - Its laid-out lane rectangle.
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @param style - The active plan/actual style.
 * @param display - The active display filter; `undefined` behaves as `both`.
 * @returns The plan and actual rectangles to draw, each null when not drawn.
 */
export function computeItemDisplayedBars(
  item: ScheduleItem,
  lane: ItemLaneRect,
  epochDate: IsoDate,
  zoomX: number,
  style: PlanActualStyle,
  display: PlanActualDisplay | undefined,
): DisplayedPlanActualBars {
  const actualSpan = actualSpanWorldX(item, lane, epochDate, zoomX);
  const input: PlanActualBarsInput = {
    planStartWorldX: lane.worldX,
    planEndWorldX: lane.worldX + lane.worldWidth,
    actualStartWorldX: actualSpan?.startWorldX ?? null,
    actualEndWorldX: actualSpan?.endWorldX ?? null,
    laneTop: lane.worldY,
    laneHeight: lane.worldHeight,
    style,
  };
  return computeDisplayedPlanActualBars(input, display);
}

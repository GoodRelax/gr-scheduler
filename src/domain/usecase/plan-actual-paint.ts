/**
 * UseCase layer: the single "which rectangles does this item paint?" decision
 * (PLAN-L1-005 x PLAN-L1-002, DEF-011).
 *
 * The on-screen item layer and the SVG exporter must draw the SAME picture
 * (ARCH-C-022). Both need the same three answers for one item:
 *
 * 1. the rectangle the PRIMARY glyph is drawn from -- normally the item's laid-out
 *    lane, but the ACTUAL extent when the plan side is filtered out (`actual-only`),
 *    in which case the lone glyph stands in for the actual side;
 * 2. the optional SECOND, vivid ACTUAL bar drawn alongside the plan bar (overlaid
 *    under `overlap`, stacked below the plan bar inside the grown row band under
 *    `separate`);
 * 3. for a milestone, the world-x of its ACTUAL point marker (CR-002 Part 2), since
 *    a point has no span to paint.
 *
 * This module only COMPOSES the existing pure pieces -- {@link computeItemDisplayedBars}
 * (geometry x display filter), {@link actualSideLaneRect} (the lone actual side with
 * its screen-space minimum-width floor) and {@link drawsActualBar} (which glyph kinds
 * carry a second bar) -- so the mode logic keeps exactly one definition. Pure and
 * side-effect free; no colors, no DOM, no strings.
 */

import type { IsoDate, PlanActualDisplay, ScheduleItem } from '../model/schedule-model.js';
import {
  actualSideLaneRect,
  actualSpanWorldX,
  computeItemDisplayedBars,
  drawsActualBar,
  isActualSideShown,
  isPlanSideShown,
  type ItemLaneRect,
} from './plan-actual-display.js';
import type { PlanActualBarRect, PlanActualStyle } from './plan-actual-geometry.js';

/** Which plan/actual side a single drawn glyph stands for; null = neither (plain glyph). */
export type PaintedPlanActualSide = 'plan' | 'actual' | null;

/** Every rectangle one item paints under the active style + display filter. */
export interface ItemPlanActualPaint {
  /** False when the display filter suppresses BOTH sides: the item paints nothing. */
  readonly isDrawn: boolean;
  /**
   * The rectangle the item's primary glyph (plan bar / milestone marker / tapered or
   * path-shaped task glyph) is drawn from. Equals the laid-out lane except under
   * `actual-only`, where it is the actual extent.
   */
  readonly primaryGlyphRect: PlanActualBarRect;
  /**
   * Which side the primary glyph represents: `plan` while a second actual bar is
   * drawn alongside it, `actual` when it is the lone surviving actual side, and null
   * when it is a plain glyph with no plan/actual split to signal.
   */
  readonly primaryGlyphSide: PaintedPlanActualSide;
  /** The second, vivid ACTUAL bar drawn alongside the plan bar; null when none. */
  readonly actualBarRect: PlanActualBarRect | null;
  /**
   * World-x of a MILESTONE's actual point marker (CR-002 Part 2), drawn alongside its
   * plan marker while both sides are shown; null for tasks and for a milestone with no
   * recorded actual.
   */
  readonly milestoneActualCenterX: number | null;
}

/** Widen a laid-out lane rectangle into the plain x/y/width/height paint rectangle. */
function rectOfLane(lane: ItemLaneRect): PlanActualBarRect {
  return { x: lane.worldX, y: lane.worldY, width: lane.worldWidth, height: lane.worldHeight };
}

/**
 * Decide every rectangle one item paints under the active plan/actual style and
 * display filter (DEF-011). Shared by the screen renderer and the SVG exporter so the
 * exported picture matches the canvas.
 *
 * @param item - The item to paint.
 * @param lane - Its laid-out lane rectangle (an {@link ItemPlacement}).
 * @param epochDate - Time-axis origin, used to map the actual span onto the plan axis.
 * @param zoomX - Horizontal zoom multiplier.
 * @param style - The active plan/actual style (`overlap` / `separate`).
 * @param display - The active display filter; `undefined` behaves as `both`.
 * @returns The primary glyph rectangle, the optional actual bar and the optional
 *   milestone actual marker position.
 */
export function computeItemPlanActualPaint(
  item: ScheduleItem,
  lane: ItemLaneRect,
  epochDate: IsoDate,
  zoomX: number,
  style: PlanActualStyle,
  display: PlanActualDisplay | undefined,
): ItemPlanActualPaint {
  const laneRect = rectOfLane(lane);
  const planShown = isPlanSideShown(display);
  const actualShown = isActualSideShown(display);

  if (!planShown && !actualShown) {
    return {
      isDrawn: false,
      primaryGlyphRect: laneRect,
      primaryGlyphSide: null,
      actualBarRect: null,
      milestoneActualCenterX: null,
    };
  }

  if (!planShown) {
    // `actual-only`: the item's SINGLE glyph stands in for the actual side, moved onto
    // the actual extent (with the CR-013 Part 2 minimum-width floor). An item with no
    // recorded actual has nothing to move onto -- the item-level filter already drops
    // it -- so it falls back to its lane as a plain glyph.
    const actualLane = actualSideLaneRect(item, lane, epochDate, zoomX);
    return {
      isDrawn: true,
      primaryGlyphRect: actualLane === null ? laneRect : rectOfLane(actualLane),
      primaryGlyphSide: actualLane === null ? null : 'actual',
      actualBarRect: null,
      milestoneActualCenterX: null,
    };
  }

  if (!actualShown || !drawsActualBar(item)) {
    // `plan-only`, or a glyph kind that never carries a second bar (milestone, tapered
    // or path-shaped task): one glyph filling the lane. A milestone still shows its
    // actual as a POINT marker while both sides are shown.
    const milestoneActualCenterX =
      actualShown && item.itemKind === 'milestone'
        ? (actualSpanWorldX(item, lane, epochDate, zoomX)?.startWorldX ?? null)
        : null;
    return {
      isDrawn: true,
      primaryGlyphRect: laneRect,
      primaryGlyphSide: null,
      actualBarRect: null,
      milestoneActualCenterX,
    };
  }

  const bars = computeItemDisplayedBars(item, lane, epochDate, zoomX, style, display);
  if (bars.plan === null || bars.actual === null) {
    // Defensive: with both sides shown and an actual-bearing task the gate returns two
    // bars, so this only guards a future filter state.
    const survivor = bars.plan ?? bars.actual;
    return {
      isDrawn: survivor !== null,
      primaryGlyphRect: survivor ?? laneRect,
      primaryGlyphSide: bars.plan === null && bars.actual !== null ? 'actual' : null,
      actualBarRect: null,
      milestoneActualCenterX: null,
    };
  }
  return {
    isDrawn: true,
    primaryGlyphRect: bars.plan,
    primaryGlyphSide: 'plan',
    actualBarRect: bars.actual,
    milestoneActualCenterX: null,
  };
}

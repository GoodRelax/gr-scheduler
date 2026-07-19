/**
 * UseCase layer: the FIXED-anchor orthogonal dependency connector (DEP-L1-003 /
 * DEP-L2-002 rework). Unlike the general 9-anchor {@link routeDependency} router,
 * this connector fixes the drawn geometry to the project's house style so every
 * dependency reads the same way regardless of the stored anchors:
 *
 * - The line EXITS the source at its CENTER-RIGHT, slightly LOW (a touch below the
 *   vertical center -- "bottom-right of center"), heading RIGHTWARD.
 * - The line ENTERS the target at its CENTER-LEFT, arriving from the LEFT and going
 *   left-to-right into the anchor.
 * - A FORWARD (target to the right of the source's exit), different-row connection is
 *   a 2-bend right-angle path (H, V, H).
 * - A BACKWARD-in-time connection (target at or left of the source's exit) is a
 *   4-bend right-angle path that routes OUT to the right, UP and around, then back
 *   DOWN into the target's left side.
 *
 * Right-angle (axis-aligned) segments only. Pure and side-effect free.
 */

import type { Point, Rect } from './dependency-router.js';

/**
 * How far BELOW the vertical center the exit point sits, as a fraction of the source
 * height ("slightly low / bottom-right of center"). Small so the exit still reads as
 * the center-right edge.
 */
export const CONNECTOR_EXIT_LOW_FRACTION = 0.18;

/**
 * Screen-px the backward (loop-around) path steps out past the source's right edge
 * and past the target's left edge, and the clearance above both boxes, so the
 * around-route never grazes either endpoint.
 */
export const CONNECTOR_LOOP_MARGIN_PX = 24;

/** A routed connector polyline plus its fixed exit / entry points and bend count. */
export interface ConnectorRoute {
  /** Ordered polyline vertices; first is the source exit, last the target entry. */
  readonly points: readonly Point[];
  /** Number of right-angle bends (2 forward/different-row, 4 backward, 0 aligned). */
  readonly bends: number;
  /** The source center-right (slightly low) exit point. */
  readonly exit: Point;
  /** The target center-left entry point. */
  readonly entry: Point;
}

/** The source's CENTER-RIGHT exit point, nudged slightly below center. */
export function connectorExitPoint(fromRect: Rect): Point {
  return {
    x: fromRect.x + fromRect.width,
    y: fromRect.y + fromRect.height * (0.5 + CONNECTOR_EXIT_LOW_FRACTION),
  };
}

/** The target's CENTER-LEFT entry point. */
export function connectorEntryPoint(toRect: Rect): Point {
  return { x: toRect.x, y: toRect.y + fromRectHalfHeight(toRect) };
}

/** Half the height (kept as a named helper so the entry stays exactly centered). */
function fromRectHalfHeight(rect: Rect): number {
  return rect.height * 0.5;
}

/**
 * Route an orthogonal dependency connector from a source rect's center-right exit to
 * a target rect's center-left entry (DEP-L1-003 rework).
 *
 * @param fromRect - Source item bounding box.
 * @param toRect - Target item bounding box.
 * @returns The connector route (fixed exit/entry, 2 or 4 bends).
 */
export function routeConnector(fromRect: Rect, toRect: Rect): ConnectorRoute {
  const exit = connectorExitPoint(fromRect);
  const entry = connectorEntryPoint(toRect);

  if (entry.x > exit.x) {
    // Forward in time: the target's left edge lies to the right of the exit.
    if (entry.y === exit.y) {
      // Perfectly aligned: a single straight rightward segment (0 bends).
      return { points: [exit, entry], bends: 0, exit, entry };
    }
    // Different row / height: a 2-bend staircase (H, V, H) meeting at the midpoint x.
    const midX = (exit.x + entry.x) / 2;
    return {
      points: [exit, { x: midX, y: exit.y }, { x: midX, y: entry.y }, entry],
      bends: 2,
      exit,
      entry,
    };
  }

  // Backward in time: the target sits at or to the LEFT of the exit. Route OUT to the
  // right, UP over both boxes, back LEFT past the target, then DOWN into its left side
  // -- a 4-bend right-angle loop.
  const outX = exit.x + CONNECTOR_LOOP_MARGIN_PX;
  const backX = entry.x - CONNECTOR_LOOP_MARGIN_PX;
  const loopY = Math.min(fromRect.y, toRect.y) - CONNECTOR_LOOP_MARGIN_PX;
  return {
    points: [
      exit,
      { x: outX, y: exit.y },
      { x: outX, y: loopY },
      { x: backX, y: loopY },
      { x: backX, y: entry.y },
      entry,
    ],
    bends: 4,
    exit,
    entry,
  };
}

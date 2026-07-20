/**
 * UseCase layer: the deterministic auto-router for dependency connectors (CR-003
 * Part 3, DEP-L1-002 / DEP-L1-003 / DEP-L2-001 / DEP-L2-002 rework).
 *
 * Every dependency is auto-routed with a fixed house style so the diagram reads the
 * same way regardless of the stored 9-point anchors (which the model keeps but the
 * router ignores for now):
 *
 * - The line always EXITS the source at its RIGHT edge, vertical center, heading
 *   rightward, and ENTERS the target at its LEFT edge, vertical center, arriving
 *   from the left (left-to-right into the anchor).
 * - The exit and the entry each keep a horizontal stub whose length is twice the
 *   arrowhead length ({@link CONNECTOR_STUB_PX}), so the line leaves / meets the box
 *   cleanly and the arrowhead is never cramped against the target edge.
 * - FORWARD, target BELOW the source: exit right by the stub, elbow DOWN right after
 *   the stub, descend, then run into the target's left edge (2 bends).
 * - FORWARD, target ABOVE the source: exit right and run as far right as possible
 *   (to just before the target = one stub short of the target's left edge), elbow
 *   UP, then run the entry stub into the target's left edge (2 bends).
 * - Perfectly aligned rows (same vertical center) with the target forward: one
 *   straight rightward segment (0 bends).
 * - STACKED & horizontally OVERLAPPING (the target's left edge is not a clear stub's
 *   width to the right of the source's right edge -- e.g. two time-overlapping items
 *   stacked into different lanes of one row): the post-exit horizontal run is threaded
 *   through the inter-lane GAP between the two bars so it crosses neither bar, then it
 *   drops to the target's left edge (a 4-segment detour; see the note below).
 *
 * Right-angle (axis-aligned) segments only. Pure and side-effect free.
 *
 * Elbow budget (DEP-L2-002): the forward and aligned routes use 0..2 elbows. The
 * stacked-overlapping detour is the sole exception -- routing a RIGHT-edge exit into a
 * LEFT-edge entry when the target sits lower/upper AND to the left (an overlap) is a
 * parity-forced 4-segment "S" (right, into-gap, across-gap, into-target), i.e. 3
 * elbows for the clean forward cases and 4 only for the overlap detour. This is a
 * documented CR-003 recommended-spec decision: the 0..3 bound holds for every
 * FORWARD dependency; the overlap detour needs one more to avoid crossing either bar.
 */

import type { Point, Rect } from './dependency-router.js';

/**
 * The dependency arrowhead length in world px (the marker's tip extent, DEP-L1-004).
 * The exit / entry stub is twice this so the line has clean room at both ends.
 */
export const CONNECTOR_ARROWHEAD_PX = 6;

/** Horizontal exit / entry stub length: twice the arrowhead length (CR-003 Part 3). */
export const CONNECTOR_STUB_PX = CONNECTOR_ARROWHEAD_PX * 2;

/** A routed connector polyline plus its fixed exit / entry points and bend count. */
export interface ConnectorRoute {
  /** Ordered polyline vertices; first is the source exit, last the target entry. */
  readonly points: readonly Point[];
  /** Number of right-angle bends (0 aligned, 2 forward, 4 stacked-overlap detour). */
  readonly bends: number;
  /** The source right-edge, vertical-center exit point. */
  readonly exit: Point;
  /** The target left-edge, vertical-center entry point. */
  readonly entry: Point;
}

/** The source's RIGHT-edge exit point at its exact vertical center. */
export function connectorExitPoint(fromRect: Rect): Point {
  return { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height / 2 };
}

/** The target's LEFT-edge entry point at its exact vertical center. */
export function connectorEntryPoint(toRect: Rect): Point {
  return { x: toRect.x, y: toRect.y + toRect.height / 2 };
}

/**
 * Whether two rectangles overlap on the horizontal axis (their x-ranges intersect).
 * Two time-overlapping items stacked into different lanes of one row are the primary
 * source of this case (CR-003 Part 3 gap routing).
 */
function overlapsHorizontally(fromRect: Rect, toRect: Rect): boolean {
  return fromRect.x < toRect.x + toRect.width && toRect.x < fromRect.x + fromRect.width;
}

/**
 * The y of the inter-bar gap the horizontal run threads through when the source and
 * target are stacked. For a target BELOW the source it is the midline between the
 * source bottom and the target top; for a target ABOVE it is the midline between the
 * target bottom and the source top. Either way the returned y lies strictly between
 * the two bars, so a horizontal run at that y crosses neither.
 */
function interBarGapY(fromRect: Rect, toRect: Rect, targetIsBelow: boolean): number {
  return targetIsBelow
    ? (fromRect.y + fromRect.height + toRect.y) / 2
    : (toRect.y + toRect.height + fromRect.y) / 2;
}

/**
 * Auto-route an orthogonal dependency connector from a source rect's right-edge exit
 * to a target rect's left-edge entry (CR-003 Part 3). Deterministic: identical rects
 * always yield the identical polyline. The stored 9-point anchors are intentionally
 * ignored (manual anchor selection is deferred).
 *
 * @param fromRect - Source (predecessor) item bounding box.
 * @param toRect - Target (successor) item bounding box.
 * @returns The connector route (exit/entry fixed, right-angle segments only).
 */
export function routeConnector(fromRect: Rect, toRect: Rect): ConnectorRoute {
  const exit = connectorExitPoint(fromRect);
  const entry = connectorEntryPoint(toRect);
  const stub = CONNECTOR_STUB_PX;

  const targetIsBelow = entry.y > exit.y;
  const targetIsAbove = entry.y < exit.y;
  // A "clear forward" target sits at least a full stub's width to the right of the
  // source's right edge, so the exit stub and the descent/ascent never re-enter the
  // source or graze the target. Anything closer (including a horizontal overlap) takes
  // the gap detour so no segment crosses either bar.
  const clearForward = entry.x >= exit.x + stub && !overlapsHorizontally(fromRect, toRect);

  if (clearForward) {
    if (entry.y === exit.y) {
      // Perfectly aligned rows: a single straight rightward segment (0 bends).
      return { points: [exit, entry], bends: 0, exit, entry };
    }
    if (targetIsBelow) {
      // Elbow DOWN right after the exit stub, descend, then run into the target left.
      const elbowX = exit.x + stub;
      return {
        points: [exit, { x: elbowX, y: exit.y }, { x: elbowX, y: entry.y }, entry],
        bends: 2,
        exit,
        entry,
      };
    }
    // Target ABOVE: run right to one stub short of the target, elbow UP, entry stub in.
    const elbowX = entry.x - stub;
    return {
      points: [exit, { x: elbowX, y: exit.y }, { x: elbowX, y: entry.y }, entry],
      bends: 2,
      exit,
      entry,
    };
  }

  // Stacked / horizontally-overlapping: thread the horizontal run through the gap
  // between the two bars. Aligned-and-overlapping (same vertical center) cannot be
  // separated by a gap, so fall back to a small forward staircase that still exits the
  // source cleanly; this configuration does not arise from lane stacking (overlapping
  // items are placed in DIFFERENT lanes, i.e. different y).
  if (!targetIsBelow && !targetIsAbove) {
    const midX = Math.max(exit.x + stub, (exit.x + entry.x) / 2);
    return {
      points: [exit, { x: midX, y: exit.y }, { x: midX, y: entry.y }, entry],
      bends: entry.y === exit.y ? 0 : 2,
      exit,
      entry,
    };
  }

  const gapY = interBarGapY(fromRect, toRect, targetIsBelow);
  const exitStubX = exit.x + stub;
  const entryStubX = entry.x - stub;
  return {
    points: [
      exit,
      { x: exitStubX, y: exit.y },
      { x: exitStubX, y: gapY },
      { x: entryStubX, y: gapY },
      { x: entryStubX, y: entry.y },
      entry,
    ],
    bends: 4,
    exit,
    entry,
  };
}

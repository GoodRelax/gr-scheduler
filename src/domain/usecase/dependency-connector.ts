/**
 * UseCase layer: the deterministic auto-router for dependency connectors (CR-003
 * Part 3, DEP-L1-002 / DEP-L1-003 / DEP-L2-001 / DEP-L2-002 rework; DEF-005
 * top/bottom-entry resolution).
 *
 * Every dependency is auto-routed with a fixed house style so the diagram reads the
 * same way regardless of the stored 9-point anchors (which the model keeps but the
 * router ignores for now). The route is chosen per relative geometry so that EVERY
 * case is clean (no zero-area nub, no backward loop) and the bend count stays within
 * the DEP-L2-002 budget of 0..3:
 *
 * - CLEAR FORWARD (the target's left edge is at least one stub to the right of the
 *   source's right edge): the line EXITS the source at its RIGHT edge, vertical
 *   center, heading rightward, and ENTERS the target at its LEFT edge, vertical
 *   center. Aligned rows draw one straight segment (0 bends); a lower target elbows
 *   DOWN right after the exit stub; an upper target runs right to just before the
 *   target then elbows UP (2 bends). This is the primary, unchanged CR-003 route.
 * - STACKED / OVERLAPPING (a different lane of the same row, or any target whose left
 *   edge is not a clear stub to the right -- e.g. two time-overlapping bars stacked
 *   into different lanes): the left edge would force the line to travel left, PAST the
 *   source, to reach it. Instead the line exits rightward and drops (or rises) into
 *   the target's near horizontal edge -- its TOP when the target is below, its BOTTOM
 *   when the target is above -- at a column that is never left of the source's exit.
 *   A clean L (1 bend). This is the DEF-005 top/bottom-entry resolution.
 * - CONTIGUOUS same-row FS (the target sits immediately to the right in the SAME lane,
 *   so its left-edge center coincides with -- or is a hair from -- the source's exit):
 *   a left-edge entry is degenerate (the two anchors are the same point). The line
 *   instead drops a fixed stub BELOW the row, runs to a column just inside the target,
 *   and rises into the target's BOTTOM edge -- a small, clearly visible squared "U"
 *   (2 bends) with a real vertical extent, never a flat nub.
 *
 * Right-angle (axis-aligned) segments only. The entry stub (final segment into the
 * target edge) and the exit stub are each twice the arrowhead length so the arrowhead
 * is never cramped. Pure and side-effect free: identical rects always yield the
 * identical polyline.
 *
 * Elbow budget (DEP-L2-002): every route above is 0..2 bends, well within 0..3. The
 * old right-out/left-in parity trap that forced a 4th bend for overlapping/backward
 * targets no longer occurs, because those targets now enter from the top/bottom edge.
 */

import type { Point, Rect } from './dependency-router.js';

/**
 * The dependency arrowhead length in world px (the marker's tip extent, DEP-L1-004).
 * The exit / entry stub is twice this so the line has clean room at both ends.
 */
export const CONNECTOR_ARROWHEAD_PX = 6;

/** Horizontal exit / entry stub length: twice the arrowhead length (CR-003 Part 3). */
export const CONNECTOR_STUB_PX = CONNECTOR_ARROWHEAD_PX * 2;

/**
 * Vertical centers this close (world px) are treated as the SAME row/lane, so tiny
 * floating-point drift in the layout does not flip a same-row route into a stacked one.
 */
const SAME_ROW_EPSILON_PX = 0.5;

/** A routed connector polyline plus its exit / entry points and bend count. */
export interface ConnectorRoute {
  /** Ordered polyline vertices; first is the source exit, last the target entry. */
  readonly points: readonly Point[];
  /** Number of right-angle bends; always within 0..3 (DEP-L2-002). */
  readonly bends: number;
  /** The source right-edge, vertical-center exit point. */
  readonly exit: Point;
  /** The point at which the line lands on the target (its actual entry vertex). */
  readonly entry: Point;
}

/** The source's RIGHT-edge exit point at its exact vertical center. */
export function connectorExitPoint(fromRect: Rect): Point {
  return { x: fromRect.x + fromRect.width, y: fromRect.y + fromRect.height / 2 };
}

/** The target's LEFT-edge entry point at its exact vertical center (nominal anchor). */
export function connectorEntryPoint(toRect: Rect): Point {
  return { x: toRect.x, y: toRect.y + toRect.height / 2 };
}

/** Clamp `value` into the inclusive range [low, high]; tolerant of low > high. */
function clamp(value: number, low: number, high: number): number {
  if (low > high) {
    return (low + high) / 2;
  }
  return Math.min(Math.max(value, low), high);
}

/**
 * Remove zero-length steps and merge collinear runs so the reported bend count
 * reflects genuine direction changes only.
 */
function normalizePolyline(points: readonly Point[]): Point[] {
  const deduped: Point[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (last === undefined || last.x !== point.x || last.y !== point.y) {
      deduped.push(point);
    }
  }
  if (deduped.length <= 2) {
    return deduped;
  }
  const merged: Point[] = [deduped[0]!];
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const previous = merged[merged.length - 1]!;
    const current = deduped[index]!;
    const next = deduped[index + 1]!;
    const collinearX = previous.x === current.x && current.x === next.x;
    const collinearY = previous.y === current.y && current.y === next.y;
    if (!collinearX && !collinearY) {
      merged.push(current);
    }
  }
  merged.push(deduped[deduped.length - 1]!);
  return merged;
}

/** Assemble a route from raw points, normalizing and counting genuine bends. */
function makeRoute(rawPoints: readonly Point[], exit: Point): ConnectorRoute {
  const points = normalizePolyline(rawPoints);
  return {
    points,
    bends: Math.max(0, points.length - 2),
    exit,
    entry: points[points.length - 1] ?? exit,
  };
}

/**
 * The x column at which a top/bottom-entry line drops (or rises) into the target,
 * chosen just to the right of the source's exit so the line never travels left of it,
 * yet kept inside the target (with a small inset off the corner) so the drop lands on
 * the edge rather than at a vertex.
 */
function topBottomEntryColumn(sourceRightX: number, toRect: Rect): number {
  const inset = Math.min(CONNECTOR_STUB_PX, toRect.width / 2);
  const targetLeft = toRect.x;
  const targetRight = toRect.x + toRect.width;
  const preferred = sourceRightX + CONNECTOR_STUB_PX;
  const column = clamp(preferred, targetLeft + inset, targetRight - inset);
  // Best effort: never place the entry column left of the source's exit. When the
  // whole target lies left of the exit (a fully backward target, outside the template
  // set) the target's own right side is the least-leftward point we can honour.
  return Math.max(column, Math.min(sourceRightX, targetRight - inset));
}

/**
 * Auto-route an orthogonal dependency connector from a source rect to a target rect
 * (CR-003 Part 3, DEF-005). Deterministic: identical rects always yield the identical
 * polyline. The stored 9-point anchors are intentionally ignored (manual anchor
 * selection is deferred). See the file header for the per-case routing rules.
 *
 * @param fromRect - Source (predecessor) item bounding box.
 * @param toRect - Target (successor) item bounding box.
 * @returns The connector route (right-angle segments only, 0..3 bends).
 */
export function routeConnector(fromRect: Rect, toRect: Rect): ConnectorRoute {
  const exit = connectorExitPoint(fromRect);
  const stub = CONNECTOR_STUB_PX;
  const sourceRightX = exit.x;
  const sourceMidY = exit.y;
  const targetLeftX = toRect.x;
  const targetMidY = toRect.y + toRect.height / 2;
  const gap = targetLeftX - sourceRightX;

  const verticalOffset = targetMidY - sourceMidY;
  const targetIsBelow = verticalOffset > SAME_ROW_EPSILON_PX;
  const targetIsAbove = verticalOffset < -SAME_ROW_EPSILON_PX;
  const sameRow = !targetIsBelow && !targetIsAbove;

  // CLEAR FORWARD: enough horizontal room for the classic right-out / left-in route.
  if (gap >= stub) {
    const entry = connectorEntryPoint(toRect);
    if (sameRow) {
      // Aligned rows: a single straight rightward segment (0 bends).
      return { points: [exit, entry], bends: 0, exit, entry };
    }
    if (targetIsBelow) {
      // Elbow DOWN right after the exit stub, descend, then run into the target left.
      const elbowX = sourceRightX + stub;
      return {
        points: [exit, { x: elbowX, y: sourceMidY }, { x: elbowX, y: targetMidY }, entry],
        bends: 2,
        exit,
        entry,
      };
    }
    // Target ABOVE: run right to one stub short of the target, elbow UP, entry stub in.
    const elbowX = targetLeftX - stub;
    return {
      points: [exit, { x: elbowX, y: sourceMidY }, { x: elbowX, y: targetMidY }, entry],
      bends: 2,
      exit,
      entry,
    };
  }

  const entryColumn = topBottomEntryColumn(sourceRightX, toRect);

  if (targetIsBelow || targetIsAbove) {
    // STACKED / OVERLAPPING: the target is in a different lane (disjoint vertical band)
    // and its left edge would force the line left, past the source. Run rightward at the
    // exit level to a column over/under the target -- which never crosses the target
    // because the exit level is outside the target's (disjoint) vertical band -- then
    // drop into its TOP (target below) or rise into its BOTTOM (target above). A clean L
    // that never travels left of the source's exit (DEF-005 top/bottom entry).
    const facingEdgeY = targetIsBelow ? toRect.y : toRect.y + toRect.height;
    return makeRoute(
      [exit, { x: entryColumn, y: sourceMidY }, { x: entryColumn, y: facingEdgeY }],
      exit,
    );
  }

  // CONTIGUOUS same-row FS: the target sits immediately to the right in the SAME lane,
  // so a left-edge entry is degenerate (its anchor coincides with the exit). Drop a
  // fixed stub BELOW the row, run to a column just inside the target, and rise into the
  // target's BOTTOM edge -- a small, clearly visible squared "U" with real vertical
  // extent, never a flat nub. The initial descent hugs x = sourceRightX (the shared
  // boundary), so it crosses neither bar.
  const bottomEdgeY = toRect.y + toRect.height;
  const detourY = bottomEdgeY + stub;
  return makeRoute(
    [
      exit,
      { x: sourceRightX, y: detourY },
      { x: entryColumn, y: detourY },
      { x: entryColumn, y: bottomEdgeY },
    ],
    exit,
  );
}

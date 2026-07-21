/**
 * UseCase layer: the deterministic auto-router for dependency connectors (CR-003
 * Part 3; CR-008 rework of DEP-L1-003 / DEP-L2-001 / DEP-L2-002; DEF-005
 * re-resolution). CR-008 OVERRIDES IM8's top/bottom-edge (no-stub) entry.
 *
 * Every dependency is auto-routed with a fixed house style so the diagram reads the
 * same way regardless of the stored 9-point anchors (which the model keeps but the
 * router ignores for now). Two invariants hold for EVERY case (CR-008 Part 1/2):
 *
 * 1. Horizontal termination. The final segment into the target is HORIZONTAL so the
 *    arrowhead enters horizontally -- never a vertical segment plunging straight into
 *    the arrowhead (the IM8 top/bottom-edge entry, now prohibited). Wherever the
 *    geometry allows, the first segment out of the source is a horizontal exit stub of
 *    `CONNECTOR_STUB_PX` too.
 * 2. Forward reading. The predecessor -> successor direction reads correctly; the
 *    arrow points in the +x direction into the successor.
 *
 * The route is chosen per relative geometry (classification unchanged from IM8; only
 * each branch's exit/entry termination is reshaped to end in a horizontal stub):
 *
 * - CLEAR FORWARD (the target's left edge is at least one stub to the right of the
 *   source's right edge): the line EXITS the source at its RIGHT edge center heading
 *   right and ENTERS the target at its LEFT edge center. Aligned rows draw one
 *   straight segment (0 bends); an offset target elbows once and still enters the left
 *   edge HORIZONTALLY (2 bends). Unchanged from CR-003 -- already horizontal at both
 *   ends.
 * - STACKED / OVERLAPPING backward (a DIFFERENT lane, target left edge not a clear
 *   stub to the right -- e.g. two time-overlapping bars stacked into separate lanes):
 *   the line exits right (horizontal stub), rises/descends into the inter-lane gap
 *   just OUTSIDE the target's facing edge, runs across to a column just left of the
 *   target, drops/rises to the target's vertical center and enters its LEFT edge with
 *   a HORIZONTAL stub (+x). Up to 4 bends. This replaces IM8's vertical top/bottom
 *   entry so the arrow now enters horizontally.
 * - CONTIGUOUS same-row FS (the successor sits immediately to the right in the SAME
 *   lane, its left edge flush against the predecessor's right edge): a left-edge entry
 *   is geometrically blocked -- the predecessor bar is flush against the successor's
 *   left edge at the same y, and a horizontal exit stub would run straight into the
 *   successor. The route drops the shared boundary below the row, runs FORWARD (+x)
 *   under the successor, rises to its bottom edge and enters with a HORIZONTAL stub
 *   (+x) that reads forward -- replacing IM8's reversed-looking upward "U". Up to 3
 *   bends.
 *
 * Right-angle (axis-aligned) segments only. Pure and side-effect free: identical rects
 * always yield the identical polyline.
 *
 * Elbow budget (DEP-L2-002, relaxed by CR-008): forward (successor to the right and
 * NON-adjacent) = 0..3; overlap / backward / same-row-contiguous = at most 4.
 */

import type { Point, Rect } from './dependency-router.js';

/**
 * The dependency arrowhead length in world px (the marker's tip extent, DEP-L1-004).
 * The exit / entry stub is twice this so the line has clean room at both ends.
 */
export const CONNECTOR_ARROWHEAD_PX = 6;

/** Horizontal exit / entry stub length: twice the arrowhead length (CR-008 Part 1). */
export const CONNECTOR_STUB_PX = CONNECTOR_ARROWHEAD_PX * 2;

/**
 * Vertical centers this close (world px) are treated as the SAME row/lane, so tiny
 * floating-point drift in the layout does not flip a same-row route into a stacked one.
 */
const SAME_ROW_EPSILON_PX = 0.5;

/**
 * Fraction of the target bar height used to offset the connecting run just OUTSIDE the
 * target's facing edge, into the inter-lane gap, for the stacked / overlapping case.
 * The layout gives each bar 0.9 of its lane height (STACKED_BAR_HEIGHT_RATIO), leaving
 * a 0.1*laneHeight gap next to it; that gap is barHeight/9 (~0.11*barHeight) wide.
 * Hugging the target by this smaller fraction keeps the horizontal run inside the gap
 * -- clear of any item in the neighbouring lane, which sits a full inter-lane gap away
 * -- without routeConnector needing the row/lane geometry it is not given.
 */
const LANE_HUG_FRACTION = 0.05;

/** A routed connector polyline plus its exit / entry points and bend count. */
export interface ConnectorRoute {
  /** Ordered polyline vertices; first is the source exit, last the target entry. */
  readonly points: readonly Point[];
  /** Number of right-angle bends; within 0..3 (forward) or 0..4 (CR-008 DEP-L2-002). */
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
 * STACKED / OVERLAPPING backward route (CR-008 Part 1/3): the target is in a different
 * lane and its left edge is not a clear stub to the right. The line exits right with a
 * horizontal stub, moves into the inter-lane gap just OUTSIDE the target's facing edge,
 * runs across to a column one stub left of the target, aligns to the target's vertical
 * center and enters its LEFT edge with a horizontal stub. Ending horizontally replaces
 * IM8's vertical top/bottom entry.
 */
function stackedRoute(
  exit: Point,
  toRect: Rect,
  targetIsBelow: boolean,
): ConnectorRoute {
  const entry = connectorEntryPoint(toRect);
  const exitStubX = exit.x + CONNECTOR_STUB_PX;
  const entryRiserX = toRect.x - CONNECTOR_STUB_PX;
  const hug = toRect.height * LANE_HUG_FRACTION;
  // A y just outside the target's facing edge, on the source's side, inside the
  // inter-lane gap so the crossing run clears the target without entering it.
  const nearY = targetIsBelow ? toRect.y - hug : toRect.y + toRect.height + hug;
  return makeRoute(
    [
      exit,
      { x: exitStubX, y: exit.y }, // horizontal exit stub (+x)
      { x: exitStubX, y: nearY }, // rise / descend into the inter-lane gap
      { x: entryRiserX, y: nearY }, // cross to a column one stub left of the target
      { x: entryRiserX, y: entry.y }, // align to the target's vertical center
      entry, // horizontal entry stub (+x) into the target's LEFT edge
    ],
    exit,
  );
}

/**
 * CONTIGUOUS same-row FS route (CR-008 Part 2): the successor is flush to the right in
 * the SAME lane, so a left-edge entry is blocked (the predecessor bar abuts the
 * successor's left edge at the same y) and a horizontal exit stub would run into the
 * successor. The route instead drops the shared boundary below the row, runs FORWARD
 * (+x) under the successor, rises to its bottom edge and enters with a horizontal stub
 * (+x). Everything progresses in +x, so it reads forward -- unlike IM8's reversed U.
 */
function contiguousRoute(exit: Point, toRect: Rect): ConnectorRoute {
  const boundaryX = exit.x; // == toRect.x (predecessor right edge == successor left edge)
  const bottomY = toRect.y + toRect.height;
  const belowY = bottomY + CONNECTOR_STUB_PX;
  const targetRightX = toRect.x + toRect.width;
  // Riser column one stub into the successor (never past its horizontal mid, so a
  // narrow successor of width < CONNECTOR_STUB_PX still keeps the riser strictly right
  // of the boundary -- i.e. forward, never inverted); entry tip one stub further right
  // but clamped to the successor's right edge so the stub never overshoots the bar (L4).
  const riserX = toRect.x + Math.min(CONNECTOR_STUB_PX, toRect.width / 2);
  const entryX = Math.min(riserX + CONNECTOR_STUB_PX, targetRightX);
  return makeRoute(
    [
      exit,
      { x: boundaryX, y: belowY }, // drop the shared boundary below the row
      { x: riserX, y: belowY }, // run forward (+x) under the successor
      { x: riserX, y: bottomY }, // rise to the successor's bottom edge
      { x: entryX, y: bottomY }, // horizontal entry stub (+x) along the bottom edge
    ],
    exit,
  );
}

/**
 * Auto-route an orthogonal dependency connector from a source rect to a target rect
 * (CR-003 Part 3; CR-008). Deterministic: identical rects always yield the identical
 * polyline. The stored 9-point anchors are intentionally ignored (manual anchor
 * selection is deferred). See the file header for the per-case routing rules.
 *
 * @param fromRect - Source (predecessor) item bounding box.
 * @param toRect - Target (successor) item bounding box.
 * @returns The connector route (right-angle segments only, 0..4 bends per CR-008).
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

  // CLEAR FORWARD: enough horizontal room for the classic right-out / left-in route,
  // which already terminates horizontally at both ends (CR-003, unchanged).
  if (gap >= stub) {
    const entry = connectorEntryPoint(toRect);
    if (sameRow) {
      // Aligned rows: a single straight rightward segment (0 bends).
      return { points: [exit, entry], bends: 0, exit, entry };
    }
    // Offset target (BELOW or ABOVE): run rightward at the source level to one stub
    // short of the target, elbow toward the target center, then enter the LEFT edge with
    // a full horizontal stub. BELOW and ABOVE share the SAME elbow column so the entry
    // stub is ALWAYS a full CONNECTOR_STUB_PX horizontal (+x) segment -- never a
    // zero-length vertical plunge, even at gap == stub (M1). makeRoute collapses the
    // (degenerate) exit stub cleanly when gap == stub without touching the entry stub.
    const elbowX = targetLeftX - stub;
    return makeRoute(
      [exit, { x: elbowX, y: sourceMidY }, { x: elbowX, y: targetMidY }, entry],
      exit,
    );
  }

  if (targetIsBelow || targetIsAbove) {
    // STACKED / OVERLAPPING backward: different lane, left edge not a clear stub right.
    return stackedRoute(exit, toRect, targetIsBelow);
  }

  // CONTIGUOUS same-row FS: flush successor in the same lane.
  return contiguousRoute(exit, toRect);
}

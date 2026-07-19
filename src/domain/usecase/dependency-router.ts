/**
 * UseCase layer: dependency auto-router (ARCH-C-013, ADR-006, DEP-L1-003 /
 * DEP-L2-001 / DEP-L2-002 / DEP-L1-004).
 *
 * Given a source and target rectangle plus a 9-point anchor on each, produce an
 * orthogonal (axis-aligned) polyline whose endpoints land EXACTLY on the anchor
 * geometry (DEP-L1-002), that avoids overlapping other item rectangles
 * (obstacles) as much as possible, and whose elbow (bend) count is constrained to
 * 0..3 (DEP-L2-002). The router also reports the unit direction of the final
 * segment so the renderer can draw a minimal, correctly oriented arrowhead
 * (DEP-L1-004).
 *
 * Pure and side-effect free. The algorithm enumerates a bounded set of candidate
 * orthogonal routes (straight, L, Z and a few 3-bend staircases) built from
 * channel coordinates derived from the endpoints and the (margin-inflated)
 * obstacle edges, then scores them lexicographically by
 * (obstacle overlap, bends, length) and returns the best. Because L/Z routes are
 * always <= 2 bends, a route within the 0..3 budget always exists.
 */

import type { AnchorIndex } from '../model/schedule-model.js';

/** A world-space point (CSS pixels). */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** An axis-aligned rectangle (world-space, CSS pixels). */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /**
   * Optional stable identity of the item this rect represents. When present on
   * both an obstacle and an endpoint rect, it is used to exclude an item from
   * being an obstacle to its OWN dependency line by identity rather than object
   * reference (see {@link routeDependency}).
   */
  readonly itemId?: string;
}

/** A routed dependency polyline plus derived metadata. */
export interface RoutedDependency {
  /** Ordered polyline vertices; first is the source anchor, last the target. */
  readonly points: readonly Point[];
  /** Number of elbows (direction changes), always within 0..3. */
  readonly bends: number;
  /** Total overlap length of the route with obstacle rectangles (0 = clean). */
  readonly obstacleOverlap: number;
  /** Unit vector of the final segment (points into the target anchor). */
  readonly arrowDirection: Point;
}

/** Options controlling routing (margins, bend budget). */
export interface RouteOptions {
  /** Margin (px) inflating each obstacle so lines skirt rather than graze it. */
  readonly obstacleMargin?: number;
  /** Maximum permitted elbow count (DEP-L2-002 caps this at 3). */
  readonly maxBends?: number;
}

const DEFAULT_OBSTACLE_MARGIN = 4;
const DEFAULT_MAX_BENDS = 3;

/**
 * The 9 anchor fractions on a bounding box, indexed by {@link AnchorIndex}
 * (row-major: top row, middle row, bottom row), per DEP-L1-002.
 */
const ANCHOR_FRACTIONS: ReadonlyArray<{ readonly fx: number; readonly fy: number }> = [
  { fx: 0, fy: 0 }, // 0 top_left
  { fx: 0.5, fy: 0 }, // 1 top_center
  { fx: 1, fy: 0 }, // 2 top_right
  { fx: 0, fy: 0.5 }, // 3 middle_left
  { fx: 0.5, fy: 0.5 }, // 4 center
  { fx: 1, fy: 0.5 }, // 5 middle_right
  { fx: 0, fy: 1 }, // 6 bottom_left
  { fx: 0.5, fy: 1 }, // 7 bottom_center
  { fx: 1, fy: 1 }, // 8 bottom_right
];

/** Number of distinct anchors (always 9). */
export const ANCHOR_COUNT = ANCHOR_FRACTIONS.length;

/**
 * Exact world-space coordinate of one of an item's 9 anchors (DEP-L1-002). The
 * returned point lies precisely on the bounding-box geometry so line endpoints
 * terminate on the anchor.
 *
 * @param rect - The item's bounding box.
 * @param anchor - Which of the 9 anchors.
 * @returns The anchor point.
 */
export function anchorPoint(rect: Rect, anchor: AnchorIndex): Point {
  const fraction = ANCHOR_FRACTIONS[anchor] ?? ANCHOR_FRACTIONS[4]!;
  return { x: rect.x + fraction.fx * rect.width, y: rect.y + fraction.fy * rect.height };
}

/**
 * Pick the anchor whose world point is nearest to a probe point, so a drag that
 * starts/ends near an item edge snaps to the closest of the 9 anchors
 * (DEP-L1-002 draw-out/draw-in).
 *
 * @param rect - The item's bounding box.
 * @param probe - A world-space point (e.g. the pointer position).
 * @returns The nearest anchor index.
 */
export function nearestAnchor(rect: Rect, probe: Point): AnchorIndex {
  let bestIndex = 4;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ANCHOR_COUNT; index += 1) {
    const point = anchorPoint(rect, index as AnchorIndex);
    const dx = point.x - probe.x;
    const dy = point.y - probe.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestIndex = index;
    }
  }
  return bestIndex as AnchorIndex;
}

/**
 * Route a dependency line from a source anchor to a target anchor, avoiding
 * obstacle rectangles and keeping the bend count within budget.
 *
 * @param fromRect - Source item bounding box.
 * @param fromAnchor - Source anchor index.
 * @param toRect - Target item bounding box.
 * @param toAnchor - Target anchor index.
 * @param obstacles - Other item rectangles to avoid (e.g. the visible set).
 * @param options - Optional margins / bend budget.
 * @returns The best route found (endpoints exactly on the anchors).
 */
export function routeDependency(
  fromRect: Rect,
  fromAnchor: AnchorIndex,
  toRect: Rect,
  toAnchor: AnchorIndex,
  obstacles: readonly Rect[] = [],
  options: RouteOptions = {},
): RoutedDependency {
  const margin = options.obstacleMargin ?? DEFAULT_OBSTACLE_MARGIN;
  const maxBends = Math.min(options.maxBends ?? DEFAULT_MAX_BENDS, DEFAULT_MAX_BENDS);
  const start = anchorPoint(fromRect, fromAnchor);
  const end = anchorPoint(toRect, toAnchor);

  // Corridor: the endpoints' bounding box, inflated by the margin. Candidate
  // routes are built from channel coordinates derived from the endpoints and the
  // retained obstacles, so an obstacle far outside this corridor is neither a
  // channel source nor plausibly crossed by any route between these endpoints.
  // Pruning the obstacle set to the corridor bounds the per-dependency work from
  // O(V) toward the handful of obstacles in the line's neighbourhood (M-01),
  // while still avoiding every real obstacle in the corridor.
  const corridor: Rect = {
    x: Math.min(start.x, end.x) - margin,
    y: Math.min(start.y, end.y) - margin,
    width: Math.abs(end.x - start.x) + margin * 2,
    height: Math.abs(end.y - start.y) + margin * 2,
  };

  // Do not treat the two endpoint items as obstacles for their own line. Exclude
  // by STABLE identity (itemId when tagged, else geometric value equality) rather
  // than object reference, so obstacles built as separate Rect instances from the
  // same item are still excluded (H-01 / L-02).
  const inflated = obstacles
    .filter(
      (obstacle) =>
        !isSameItemRect(obstacle, fromRect) &&
        !isSameItemRect(obstacle, toRect) &&
        rectsIntersect(obstacle, corridor),
    )
    .map((obstacle) => inflateRect(obstacle, margin));

  const candidates = buildCandidateRoutes(start, end, inflated);

  let best: RoutedDependency | null = null;
  for (const rawPoints of candidates) {
    const points = normalizePolyline(rawPoints);
    const bends = Math.max(0, points.length - 2);
    if (bends > maxBends) {
      continue;
    }
    const overlap = totalObstacleOverlap(points, inflated);
    const length = polylineLength(points);
    if (best === null || isBetterRoute(overlap, bends, length, best)) {
      best = {
        points,
        bends,
        obstacleOverlap: overlap,
        arrowDirection: finalSegmentDirection(points),
      };
    }
  }

  // A straight/L/Z route always exists within 3 bends, but guard defensively.
  return (
    best ?? {
      points: [start, end],
      bends: 0,
      obstacleOverlap: totalObstacleOverlap([start, end], inflated),
      arrowDirection: finalSegmentDirection([start, end]),
    }
  );
}

/** Lexicographic "is (overlap, bends, length) better than the current best?". */
function isBetterRoute(
  overlap: number,
  bends: number,
  length: number,
  best: RoutedDependency,
): boolean {
  if (overlap !== best.obstacleOverlap) {
    return overlap < best.obstacleOverlap;
  }
  if (bends !== best.bends) {
    return bends < best.bends;
  }
  return length < polylineLength(best.points);
}

/** Build a bounded set of candidate orthogonal routes between two points. */
function buildCandidateRoutes(
  start: Point,
  end: Point,
  obstacles: readonly Rect[],
): Point[][] {
  const routes: Point[][] = [];

  // 0 bends: a straight orthogonal segment (only meaningful when aligned).
  if (start.x === end.x || start.y === end.y) {
    routes.push([start, end]);
  }

  // 1 bend: the two L-shapes.
  routes.push([start, { x: end.x, y: start.y }, end]); // H then V
  routes.push([start, { x: start.x, y: end.y }, end]); // V then H

  // Channel coordinates for 2/3-bend routes: endpoint coords, their midpoints,
  // and the (already inflated) obstacle edges so a Z can slip past an obstacle.
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const channelXs = uniqueSorted([
    start.x,
    end.x,
    midX,
    ...obstacles.flatMap((rect) => [rect.x, rect.x + rect.width]),
  ]);
  const channelYs = uniqueSorted([
    start.y,
    end.y,
    midY,
    ...obstacles.flatMap((rect) => [rect.y, rect.y + rect.height]),
  ]);

  // 2 bends: vertical channel Z (H, V, H) and horizontal channel Z (V, H, V).
  for (const x of channelXs) {
    routes.push([start, { x, y: start.y }, { x, y: end.y }, end]);
  }
  for (const y of channelYs) {
    routes.push([start, { x: start.x, y }, { x: end.x, y }, end]);
  }

  // 3 bends: a staircase that detours out to an obstacle-edge channel then back,
  // helping when both direct Z channels are blocked.
  for (const x of channelXs) {
    routes.push([
      start,
      { x, y: start.y },
      { x, y: midY },
      { x: end.x, y: midY },
      end,
    ]);
  }
  for (const y of channelYs) {
    routes.push([
      start,
      { x: start.x, y },
      { x: midX, y },
      { x: midX, y: end.y },
      end,
    ]);
  }

  return routes;
}

/**
 * Whether two rectangles denote the SAME item. Prefers `itemId` equality when
 * both rects are tagged; otherwise falls back to exact geometric equality. This
 * replaces the fragile object-reference contract so an obstacle rect and an
 * endpoint rect built as separate instances from one item still match (H-01).
 */
function isSameItemRect(a: Rect, b: Rect): boolean {
  if (a.itemId !== undefined && b.itemId !== undefined) {
    return a.itemId === b.itemId;
  }
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/** Whether two axis-aligned rectangles overlap (touching edges count as apart). */
function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Inflate a rectangle by a uniform margin on all sides. */
function inflateRect(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

/**
 * Remove duplicate consecutive points and merge collinear runs so the elbow
 * count reflects genuine direction changes only.
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

/** Sum the length of a route's segments that lie inside obstacle rectangles. */
function totalObstacleOverlap(points: readonly Point[], obstacles: readonly Rect[]): number {
  let overlap = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    for (const rect of obstacles) {
      overlap += segmentInsideRectLength(a, b, rect);
    }
  }
  return overlap;
}

/**
 * Length of the portion of an axis-aligned segment [a, b] that lies strictly
 * inside a rectangle. Non-axis-aligned segments never occur here (orthogonal
 * routing), but the function tolerates them by returning 0.
 */
function segmentInsideRectLength(a: Point, b: Point, rect: Rect): number {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  if (a.y === b.y) {
    // Horizontal segment.
    if (a.y <= top || a.y >= bottom) {
      return 0;
    }
    const segLeft = Math.min(a.x, b.x);
    const segRight = Math.max(a.x, b.x);
    const overlap = Math.min(segRight, right) - Math.max(segLeft, left);
    return overlap > 0 ? overlap : 0;
  }
  if (a.x === b.x) {
    // Vertical segment.
    if (a.x <= left || a.x >= right) {
      return 0;
    }
    const segTop = Math.min(a.y, b.y);
    const segBottom = Math.max(a.y, b.y);
    const overlap = Math.min(segBottom, bottom) - Math.max(segTop, top);
    return overlap > 0 ? overlap : 0;
  }
  return 0;
}

/** Total Manhattan-ish length of an orthogonal polyline. */
function polylineLength(points: readonly Point[]): number {
  let length = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    length += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }
  return length;
}

/** Unit direction of the final segment (into the target); zero-safe. */
function finalSegmentDirection(points: readonly Point[]): Point {
  if (points.length < 2) {
    return { x: 1, y: 0 };
  }
  const last = points[points.length - 1]!;
  const previous = points[points.length - 2]!;
  const dx = last.x - previous.x;
  const dy = last.y - previous.y;
  const magnitude = Math.hypot(dx, dy);
  return magnitude === 0 ? { x: 1, y: 0 } : { x: dx / magnitude, y: dy / magnitude };
}

/** De-duplicate and sort numeric channel coordinates. */
function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

import { describe, expect, it } from 'vitest';
import type { AnchorIndex } from '../src/domain/model/schedule-model.js';
import {
  ANCHOR_COUNT,
  anchorPoint,
  nearestAnchor,
  routeDependency,
  type Point,
  type Rect,
} from '../src/domain/usecase/dependency-router.js';

const boxA: Rect = { x: 0, y: 0, width: 40, height: 20 };
const boxB: Rect = { x: 200, y: 120, width: 40, height: 20 };

/** Expected exact coordinates of all 9 anchors on a 40x20 box at the origin. */
const EXPECTED_ANCHORS: readonly Point[] = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 40, y: 0 },
  { x: 0, y: 10 },
  { x: 20, y: 10 },
  { x: 40, y: 10 },
  { x: 0, y: 20 },
  { x: 20, y: 20 },
  { x: 40, y: 20 },
];

describe('dependency router: 9-point anchors (DEP-L1-002)', () => {
  it('places each anchor exactly on the bounding-box geometry', () => {
    for (let index = 0; index < ANCHOR_COUNT; index += 1) {
      expect(anchorPoint(boxA, index as AnchorIndex)).toEqual(EXPECTED_ANCHORS[index]);
    }
  });

  it('routes endpoints exactly onto the requested anchors (1px tolerance)', () => {
    for (let from = 0; from < ANCHOR_COUNT; from += 1) {
      for (let to = 0; to < ANCHOR_COUNT; to += 1) {
        const route = routeDependency(boxA, from as AnchorIndex, boxB, to as AnchorIndex);
        const start = route.points[0]!;
        const end = route.points[route.points.length - 1]!;
        const expectedStart = anchorPoint(boxA, from as AnchorIndex);
        const expectedEnd = anchorPoint(boxB, to as AnchorIndex);
        expect(Math.hypot(start.x - expectedStart.x, start.y - expectedStart.y)).toBeLessThanOrEqual(1);
        expect(Math.hypot(end.x - expectedEnd.x, end.y - expectedEnd.y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('snaps a probe point to the nearest of the 9 anchors', () => {
    expect(nearestAnchor(boxA, { x: 39, y: 1 })).toBe(2); // top_right
    expect(nearestAnchor(boxA, { x: 21, y: 9 })).toBe(4); // center
    expect(nearestAnchor(boxA, { x: 1, y: 19 })).toBe(6); // bottom_left
  });
});

describe('dependency router: bend budget (DEP-L2-002)', () => {
  it('keeps every route within 0..3 bends across all anchor pairs', () => {
    for (let from = 0; from < ANCHOR_COUNT; from += 1) {
      for (let to = 0; to < ANCHOR_COUNT; to += 1) {
        const route = routeDependency(boxA, from as AnchorIndex, boxB, to as AnchorIndex);
        expect(route.bends).toBeGreaterThanOrEqual(0);
        expect(route.bends).toBeLessThanOrEqual(3);
      }
    }
  });

  it('produces a 0-bend straight line for a degenerate aligned pair', () => {
    // Two boxes on the same horizontal line: middle_right -> middle_left aligns.
    const left: Rect = { x: 0, y: 0, width: 20, height: 20 };
    const right: Rect = { x: 100, y: 0, width: 20, height: 20 };
    const route = routeDependency(left, 5, right, 3); // middle_right -> middle_left, both y=10
    expect(route.bends).toBe(0);
    expect(route.points).toHaveLength(2);
  });
});

describe('dependency router: obstacle avoidance (DEP-L1-003 / DEP-L2-001)', () => {
  it('routes around a simple obstacle so overlap is zero when avoidable', () => {
    const from: Rect = { x: 0, y: 0, width: 20, height: 20 };
    const to: Rect = { x: 200, y: 0, width: 20, height: 20 };
    // An obstacle straddling the direct straight line at y=10.
    const obstacle: Rect = { x: 90, y: 0, width: 20, height: 20 };
    const route = routeDependency(from, 5, to, 3, [obstacle]);
    expect(route.obstacleOverlap).toBe(0);
    expect(route.bends).toBeLessThanOrEqual(3);
  });

  it('never scores worse than the direct straight line for overlap', () => {
    const from: Rect = { x: 0, y: 0, width: 20, height: 20 };
    const to: Rect = { x: 200, y: 0, width: 20, height: 20 };
    const obstacle: Rect = { x: 90, y: 0, width: 20, height: 20 };
    const straightOverlap = 20; // the straight y=10 line crosses the 20px-wide obstacle
    const route = routeDependency(from, 5, to, 3, [obstacle]);
    expect(route.obstacleOverlap).toBeLessThanOrEqual(straightOverlap);
  });

  it('reports a unit arrow direction for the final segment', () => {
    const route = routeDependency(boxA, 5, boxB, 3);
    const magnitude = Math.hypot(route.arrowDirection.x, route.arrowDirection.y);
    expect(magnitude).toBeCloseTo(1, 6);
  });
});

describe('dependency router: endpoint self-exclusion (H-01, DEP-L2-001)', () => {
  // The renderer builds obstacle rects and endpoint rects from placements as
  // SEPARATE Rect instances, so the old `obstacle !== fromRect` reference check
  // never matched and an item was treated as an obstacle to its OWN line. These
  // regressions pass the endpoints' own rects INSIDE the obstacle set and assert
  // the router still excludes them (by value equality and by itemId).
  const from: Rect = { x: 0, y: 0, width: 20, height: 20 };
  const to: Rect = { x: 200, y: 0, width: 20, height: 20 };

  it('excludes an endpoint rect passed as a distinct-instance obstacle (value equality)', () => {
    // Distinct instances with identical geometry (what the renderer produces).
    const fromObstacle: Rect = { x: 0, y: 0, width: 20, height: 20 };
    const toObstacle: Rect = { x: 200, y: 0, width: 20, height: 20 };
    // middle_right -> middle_left: the clean straight route lives at y=10 and
    // would clip the source/target boxes' margins if they were counted.
    const route = routeDependency(from, 5, to, 3, [fromObstacle, toObstacle]);
    // Self-overlap not counted -> a clean straight route is chosen.
    expect(route.obstacleOverlap).toBe(0);
    expect(route.bends).toBe(0);
    expect(route.points).toHaveLength(2);
  });

  it('excludes an endpoint by itemId even when the obstacle rect differs geometrically', () => {
    const taggedFrom: Rect = { ...from, itemId: 'it-from' };
    const taggedTo: Rect = { ...to, itemId: 'it-to' };
    // Same item, but a slightly different (e.g. stale) rect instance for `from`.
    const fromObstacle: Rect = { x: -1, y: -1, width: 22, height: 22, itemId: 'it-from' };
    const toObstacle: Rect = { x: 199, y: -1, width: 22, height: 22, itemId: 'it-to' };
    const route = routeDependency(taggedFrom, 5, taggedTo, 3, [fromObstacle, toObstacle]);
    expect(route.obstacleOverlap).toBe(0);
    expect(route.bends).toBe(0);
  });

  it('still counts/avoids a genuine third-party obstacle when the endpoints are in the set', () => {
    // A real obstacle straddles the straight line; the endpoints' own rects are
    // also present. Self-exclusion must not disable real avoidance.
    const fromObstacle: Rect = { x: 0, y: 0, width: 20, height: 20 };
    const toObstacle: Rect = { x: 200, y: 0, width: 20, height: 20 };
    const realObstacle: Rect = { x: 90, y: 0, width: 20, height: 20 };
    const route = routeDependency(from, 5, to, 3, [fromObstacle, realObstacle, toObstacle]);
    // The router detours around the real obstacle to a clean route.
    expect(route.obstacleOverlap).toBe(0);
    expect(route.bends).toBeLessThanOrEqual(3);
  });
});

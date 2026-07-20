import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/domain/usecase/dependency-router.js';
import {
  CONNECTOR_ARROWHEAD_PX,
  CONNECTOR_STUB_PX,
  connectorEntryPoint,
  connectorExitPoint,
  routeConnector,
} from '../src/domain/usecase/dependency-connector.js';

/**
 * Unit coverage for the CR-003 Part 3 / DEF-005 deterministic dependency auto-router.
 *
 * The router is clean for EVERY relative geometry the default template exercises:
 * - forward, clearly to the right: right-edge exit -> left-edge entry (unchanged);
 * - contiguous same-row FS (side-by-side bars in one lane): a visible squared "U"
 *   below the row into the target's BOTTOM edge -- never a flat zero-vertical nub;
 * - overlapping / backward stacked bars (a different lane, target left edge past the
 *   source exit): a clean L into the target's TOP/BOTTOM edge that never travels left
 *   of the source's exit and crosses neither bar.
 * Every route stays within the DEP-L2-002 bend budget of 0..3.
 */

type XY = { readonly x: number; readonly y: number };

/** Every segment of the polyline is axis-aligned (right angles only). */
function isOrthogonal(points: readonly XY[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (a.x !== b.x && a.y !== b.y) {
      return false;
    }
  }
  return true;
}

/** Whether any segment of the polyline passes through the STRICT interior of a rect. */
function crossesRect(points: readonly XY[], rect: Rect): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (a.y === b.y) {
      if (a.y > top && a.y < bottom) {
        const segLeft = Math.min(a.x, b.x);
        const segRight = Math.max(a.x, b.x);
        if (Math.min(segRight, right) - Math.max(segLeft, left) > 0) {
          return true;
        }
      }
    } else if (a.x > left && a.x < right) {
      const segTop = Math.min(a.y, b.y);
      const segBottom = Math.max(a.y, b.y);
      if (Math.min(segBottom, bottom) - Math.max(segTop, top) > 0) {
        return true;
      }
    }
  }
  return false;
}

/** The vertical extent (max y - min y) spanned by the polyline. */
function verticalExtent(points: readonly XY[]): number {
  const ys = points.map((point) => point.y);
  return Math.max(...ys) - Math.min(...ys);
}

/** The smallest x visited by the polyline (used to assert no leftward-past-source run). */
function minX(points: readonly XY[]): number {
  return Math.min(...points.map((point) => point.x));
}

describe('dependency connector: fixed exit / entry anchors', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('exits the source at its exact right-edge, vertical center', () => {
    const exit = connectorExitPoint(from);
    expect(exit.x).toBe(from.x + from.width);
    expect(exit.y).toBe(from.y + from.height / 2);
  });

  it('enters the target at its exact left-edge, vertical center (nominal anchor)', () => {
    const entry = connectorEntryPoint(to);
    expect(entry.x).toBe(to.x);
    expect(entry.y).toBe(to.y + to.height / 2);
  });

  it('defines the stub as twice the arrowhead length', () => {
    expect(CONNECTOR_STUB_PX).toBe(CONNECTOR_ARROWHEAD_PX * 2);
  });
});

describe('dependency connector: forward, target BELOW = elbow down after the stub', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('exits right by one stub, elbows DOWN immediately, then runs into the target left', () => {
    const route = routeConnector(from, to);
    expect(route.bends).toBe(2);
    expect(route.bends).toBeLessThanOrEqual(3);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
    const exit = connectorExitPoint(from);
    expect(route.points[1]!.x).toBe(exit.x + CONNECTOR_STUB_PX);
    expect(route.points[1]!.y).toBe(exit.y);
    const last = route.points[route.points.length - 1]!;
    const penultimate = route.points[route.points.length - 2]!;
    expect(penultimate.x).toBeLessThan(last.x);
    expect(penultimate.y).toBe(last.y);
  });
});

describe('dependency connector: forward, target ABOVE = run right then elbow up', () => {
  const from: Rect = { x: 0, y: 300, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 100, width: 80, height: 40 };

  it('runs right to one stub before the target, elbows UP, then enters the target left', () => {
    const route = routeConnector(from, to);
    expect(route.bends).toBe(2);
    expect(route.bends).toBeLessThanOrEqual(3);
    expect(isOrthogonal(route.points)).toBe(true);
    const entry = connectorEntryPoint(to);
    expect(route.points[route.points.length - 2]!.x).toBe(entry.x - CONNECTOR_STUB_PX);
    const exit = connectorExitPoint(from);
    expect(route.points[1]!.x).toBeGreaterThan(exit.x);
    expect(route.points[1]!.y).toBe(exit.y);
  });
});

describe('dependency connector: aligned rows = a single straight segment', () => {
  it('routes a straight rightward segment with 0 bends when centers align', () => {
    const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
    const to: Rect = { x: 400, y: 100, width: 80, height: 40 };
    const route = routeConnector(from, to);
    expect(route.bends).toBe(0);
    expect(route.points).toHaveLength(2);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[1]).toEqual(connectorEntryPoint(to));
  });
});

describe('dependency connector: contiguous same-row FS = a visible squared U, never a nub', () => {
  // concept -> dev / dev -> valid in the template: sequential phases side by side in ONE
  // lane. The successor's left edge exactly touches the predecessor's right edge, so the
  // left-edge entry point coincides with the exit -- a degenerate flat nub under the old
  // router. The clean route drops below the row and rises into the target's BOTTOM edge.
  const from: Rect = { x: 100, y: 100, width: 120, height: 30 };
  const to: Rect = { x: 220, y: 100, width: 120, height: 30 };

  it('draws a non-degenerate connector: real vertical extent, bends <= 3, no flat nub', () => {
    const route = routeConnector(from, to);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.bends).toBeLessThanOrEqual(3);
    // A real drop below the row -- not a zero-vertical nub.
    expect(verticalExtent(route.points)).toBeGreaterThan(0);
    // No zero-area path: consecutive points differ, and the path is not a there-and-back
    // flat line (its bounding box has positive height).
    expect(route.points.length).toBeGreaterThanOrEqual(3);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
  });

  it('never travels left of the source exit and crosses neither bar', () => {
    const route = routeConnector(from, to);
    const exit = connectorExitPoint(from);
    expect(minX(route.points)).toBeGreaterThanOrEqual(exit.x);
    expect(crossesRect(route.points, from)).toBe(false);
    expect(crossesRect(route.points, to)).toBe(false);
  });

  it('enters the target from its BOTTOM edge with a clean vertical stub', () => {
    const route = routeConnector(from, to);
    const last = route.points[route.points.length - 1]!;
    const penultimate = route.points[route.points.length - 2]!;
    // Lands on the target's bottom edge, arriving vertically (the arrow points up).
    expect(last.y).toBe(to.y + to.height);
    expect(penultimate.x).toBe(last.x);
    expect(penultimate.y).toBeGreaterThan(last.y);
    // The rising stub is one stub tall.
    expect(penultimate.y - last.y).toBe(CONNECTOR_STUB_PX);
  });
});

describe('dependency connector: overlapping / backward stacked = clean top/bottom entry', () => {
  // sys1 -> sys2 in the template: sys2 starts BEFORE sys1 ends (its left edge is left of
  // the source exit) yet extends to the right of it, stacked into a LOWER lane. The old
  // router looped the run left, past the source. The clean route drops into sys2's TOP.
  const source: Rect = { x: 100, y: 100, width: 100, height: 30 };
  const target: Rect = { x: 170, y: 150, width: 130, height: 30 };

  it('enters the target TOP edge, never travels left of the source exit, bends <= 3', () => {
    const route = routeConnector(source, target);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.bends).toBeLessThanOrEqual(3);
    const exit = connectorExitPoint(source);
    // Never loops left of the source's right-edge exit.
    expect(minX(route.points)).toBeGreaterThanOrEqual(exit.x);
    // Lands on the target's TOP edge (target is below the source).
    const last = route.points[route.points.length - 1]!;
    expect(last.y).toBe(target.y);
    // Arrives vertically (the arrow points down into the top edge).
    const penultimate = route.points[route.points.length - 2]!;
    expect(penultimate.x).toBe(last.x);
    expect(penultimate.y).toBeLessThan(last.y);
  });

  it('crosses neither bar', () => {
    const route = routeConnector(source, target);
    expect(crossesRect(route.points, source)).toBe(false);
    expect(crossesRect(route.points, target)).toBe(false);
  });

  it('enters the BOTTOM edge when the target is stacked ABOVE the source', () => {
    // sys3 -> swe1 mirror, but with the target in an UPPER lane: the facing edge is the
    // target BOTTOM. Target left edge is left of the source exit; target extends right.
    const src: Rect = { x: 200, y: 200, width: 80, height: 30 };
    const tgt: Rect = { x: 150, y: 100, width: 250, height: 30 };
    const route = routeConnector(src, tgt);
    expect(route.bends).toBeLessThanOrEqual(3);
    const exit = connectorExitPoint(src);
    expect(minX(route.points)).toBeGreaterThanOrEqual(exit.x);
    const last = route.points[route.points.length - 1]!;
    expect(last.y).toBe(tgt.y + tgt.height); // bottom edge of the upper target
    const penultimate = route.points[route.points.length - 2]!;
    expect(penultimate.x).toBe(last.x);
    expect(penultimate.y).toBeGreaterThan(last.y); // arrives from below, arrow points up
    expect(crossesRect(route.points, src)).toBe(false);
    expect(crossesRect(route.points, tgt)).toBe(false);
  });

  it('strongly backward target (both edges span the source exit) stays clean', () => {
    // sys3 -> swe1: swe1 starts before sys3 starts and ends after sys3 ends.
    const src: Rect = { x: 200, y: 100, width: 80, height: 30 };
    const tgt: Rect = { x: 150, y: 150, width: 250, height: 30 };
    const route = routeConnector(src, tgt);
    expect(route.bends).toBeLessThanOrEqual(3);
    const exit = connectorExitPoint(src);
    expect(minX(route.points)).toBeGreaterThanOrEqual(exit.x);
    expect(crossesRect(route.points, src)).toBe(false);
    expect(crossesRect(route.points, tgt)).toBe(false);
  });
});

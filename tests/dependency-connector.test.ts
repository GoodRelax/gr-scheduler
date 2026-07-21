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
 * Unit coverage for the CR-003 Part 3 / CR-008 deterministic dependency auto-router.
 *
 * CR-008 mandates that EVERY route terminate in a HORIZONTAL entry stub (the arrow
 * enters horizontally, never a vertical plunge) and read forward, and relaxes the
 * DEP-L2-002 elbow budget to 0..3 (clear forward) / 0..4 (overlap / backward /
 * same-row contiguous). The router is clean for every relative geometry the default
 * template exercises:
 * - forward, clearly to the right: right-edge exit -> left-edge entry (unchanged);
 * - contiguous same-row FS (side-by-side bars in one lane): a forward-reading squared
 *   route entering the successor's bottom edge near its left with a horizontal (+x)
 *   stub -- no reversed upward "U";
 * - overlapping / backward stacked bars (a different lane, target left edge past the
 *   source exit): the line hugs the inter-lane gap and enters the target's LEFT edge
 *   with a horizontal (+x) stub -- no vertical top/bottom plunge.
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

/** Length of the first segment; NaN if there is no segment. */
function firstSegmentLength(points: readonly XY[]): number {
  const a = points[0]!;
  const b = points[1]!;
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

/** Length of the last segment (into the entry). */
function lastSegmentLength(points: readonly XY[]): number {
  const a = points[points.length - 2]!;
  const b = points[points.length - 1]!;
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

/** Whether the last segment (into the entry) is horizontal. */
function lastSegmentIsHorizontal(points: readonly XY[]): boolean {
  const a = points[points.length - 2]!;
  const b = points[points.length - 1]!;
  return a.y === b.y && a.x !== b.x;
}

/** Whether the first segment (out of the exit) is horizontal. */
function firstSegmentIsHorizontal(points: readonly XY[]): boolean {
  const a = points[0]!;
  const b = points[1]!;
  return a.y === b.y && a.x !== b.x;
}

/** Signed +x direction of the last segment (>0 means the arrow points forward, +x). */
function lastSegmentDx(points: readonly XY[]): number {
  const a = points[points.length - 2]!;
  const b = points[points.length - 1]!;
  return b.x - a.x;
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

describe('dependency connector: forward, target BELOW = run right then elbow down', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('runs right to one stub before the target, elbows DOWN, enters the left edge (+x)', () => {
    const route = routeConnector(from, to);
    expect(route.bends).toBe(2);
    expect(route.bends).toBeLessThanOrEqual(3); // forward budget
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
    const exit = connectorExitPoint(from);
    // Horizontal exit run leaving the source rightward.
    expect(firstSegmentIsHorizontal(route.points)).toBe(true);
    expect(route.points[1]!.x).toBeGreaterThan(exit.x);
    expect(route.points[1]!.y).toBe(exit.y);
    // Symmetric with the ABOVE branch (M1): elbow one stub short of the target, so the
    // entry stub is ALWAYS a full-length horizontal (+x) segment.
    const entry = connectorEntryPoint(to);
    expect(route.points[route.points.length - 2]!.x).toBe(entry.x - CONNECTOR_STUB_PX);
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(lastSegmentLength(route.points)).toBe(CONNECTOR_STUB_PX);
  });
});

describe('dependency connector: M1 -- entry stub stays horizontal at gap == stub', () => {
  // Regression guard for the BELOW/ABOVE asymmetry: at gap == CONNECTOR_STUB_PX the old
  // BELOW branch degenerated the entry stub to length 0 (a vertical plunge into the
  // arrowhead, prohibited by CR-008 Part 1). The entry stub must stay a full-length
  // horizontal (+x) segment at, just above, and just below the stub-sized gap.
  const exitX = 80; // from right edge
  for (const delta of [-1, 0, 1]) {
    for (const dir of ['below', 'above'] as const) {
      it(`gap = stub ${delta >= 0 ? '+' : '-'} ${Math.abs(delta)}, target ${dir}: full horizontal entry stub`, () => {
        const from: Rect = { x: 0, y: 100, width: exitX, height: 40 };
        const toY = dir === 'below' ? 300 : -100;
        const to: Rect = { x: exitX + CONNECTOR_STUB_PX + delta, y: toY, width: 80, height: 40 };
        const route = routeConnector(from, to);
        expect(isOrthogonal(route.points)).toBe(true);
        // The arrow ALWAYS enters horizontally forward, never a vertical plunge.
        expect(lastSegmentIsHorizontal(route.points)).toBe(true);
        expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
        expect(lastSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
        expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
      });
    }
  }
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
    // Horizontal entry stub of exactly one stub into the left edge, arrow forward (+x).
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(lastSegmentLength(route.points)).toBe(CONNECTOR_STUB_PX);
    expect(route.points[route.points.length - 2]!.x).toBe(entry.x - CONNECTOR_STUB_PX);
    // Horizontal exit run leaving the source rightward.
    const exit = connectorExitPoint(from);
    expect(firstSegmentIsHorizontal(route.points)).toBe(true);
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
    // A straight rightward line is horizontal at both ends by construction.
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
  });
});

describe('dependency connector: contiguous same-row FS = a forward-reading squared route', () => {
  // concept -> dev / dev -> valid in the template: sequential phases side by side in ONE
  // lane. The successor's left edge is flush against the predecessor's right edge, so a
  // left-edge entry is blocked and a horizontal exit stub would run into the successor.
  // CR-008: drop below the row, run FORWARD, and enter the bottom edge near the left
  // with a horizontal (+x) stub -- no reversed upward "U".
  const from: Rect = { x: 100, y: 100, width: 120, height: 30 };
  const to: Rect = { x: 220, y: 100, width: 120, height: 30 };

  it('draws a non-degenerate connector: real vertical extent, bends <= 4, no flat nub', () => {
    const route = routeConnector(from, to);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.bends).toBeLessThanOrEqual(4); // CR-008 relaxed budget
    expect(verticalExtent(route.points)).toBeGreaterThan(0);
    expect(route.points.length).toBeGreaterThanOrEqual(3);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
  });

  it('never travels left of the source exit and crosses neither bar', () => {
    const route = routeConnector(from, to);
    const exit = connectorExitPoint(from);
    const minX = Math.min(...route.points.map((point) => point.x));
    expect(minX).toBeGreaterThanOrEqual(exit.x);
    expect(crossesRect(route.points, from)).toBe(false);
    expect(crossesRect(route.points, to)).toBe(false);
  });

  it('terminates in a horizontal entry stub that reads forward (+x)', () => {
    const route = routeConnector(from, to);
    // The arrow enters HORIZONTALLY, not a vertical plunge (CR-008 Part 1).
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    // The entry stub points in the forward (+x) direction (CR-008 Part 2).
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(lastSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
    // The route progresses forward: the entry lands to the right of the source exit.
    const exit = connectorExitPoint(from);
    const entry = route.points[route.points.length - 1]!;
    expect(entry.x).toBeGreaterThan(exit.x);
    // Lands on the successor's bottom edge (a horizontal edge, grazed -- never crossed).
    expect(entry.y).toBe(to.y + to.height);
  });
});

describe('dependency connector: overlapping / backward stacked = horizontal left-edge entry', () => {
  // sys1 -> sys2 in the template: sys2 starts BEFORE sys1 ends (its left edge is left of
  // the source exit) yet extends to the right, stacked into an UPPER lane. CR-008: hug
  // the inter-lane gap and enter sys2's LEFT edge with a horizontal (+x) stub.
  const source: Rect = { x: 100, y: 136, width: 100, height: 16.2 };
  const target: Rect = { x: 70, y: 118, width: 120, height: 16.2 };

  it('enters the target LEFT edge horizontally (+x), 4 bends, crosses neither bar', () => {
    const route = routeConnector(source, target);
    expect(isOrthogonal(route.points)).toBe(true);
    // Exactly 4 bends: guards BOTH the CR-008 upper bound and a regression that would
    // add/remove an elbow (M2 lower bound).
    expect(route.bends).toBe(4);
    // Horizontal exit stub of one stub.
    expect(firstSegmentIsHorizontal(route.points)).toBe(true);
    expect(firstSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
    // Lands on the target's LEFT edge, arrow pointing forward (+x) and horizontal.
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(lastSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(target));
    expect(crossesRect(route.points, source)).toBe(false);
    expect(crossesRect(route.points, target)).toBe(false);
  });

  it('hugs the inter-lane gap without crossing neighbouring-lane bars (M2)', () => {
    // Bars the route hugs/passes: sys3 in the lane ABOVE the target, and a sibling in
    // the SOURCE's lane to the left, straddling the crossing run's x-range. If the
    // LANE_HUG_FRACTION margin were too large the crossing run would clip one of these.
    const laneAbove: Rect = { x: 70, y: 100, width: 120, height: 16.2 }; // above the target
    const sourceLaneSibling: Rect = { x: 0, y: 136, width: 80, height: 16.2 }; // source lane
    const route = routeConnector(source, target);
    expect(crossesRect(route.points, laneAbove)).toBe(false);
    expect(crossesRect(route.points, sourceLaneSibling)).toBe(false);
  });

  it('enters the LEFT edge horizontally when the target is stacked BELOW the source', () => {
    // sys3 -> swe1 mirror: source in the TOP lane, target two lanes down; the target
    // starts before the source and spans it. Enter swe1's LEFT edge horizontally.
    const src: Rect = { x: 130, y: 100, width: 100, height: 16.2 };
    const tgt: Rect = { x: 120, y: 136, width: 240, height: 16.2 };
    const route = routeConnector(src, tgt);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.bends).toBe(4);
    expect(firstSegmentIsHorizontal(route.points)).toBe(true);
    expect(firstSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(lastSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(tgt));
    expect(crossesRect(route.points, src)).toBe(false);
    expect(crossesRect(route.points, tgt)).toBe(false);
    // The INTERVENING middle-lane bar (sys2) the descent/crossing run must dodge -- the
    // key guard for LANE_HUG_FRACTION on a two-lane-apart route (M2).
    const interveningLane: Rect = { x: 70, y: 118, width: 120, height: 16.2 };
    expect(crossesRect(route.points, interveningLane)).toBe(false);
  });

  it('strongly backward target (both edges span the source exit) stays clean', () => {
    // A target whose left edge is left of the source exit and whose right edge is right
    // of it, stacked into a lower lane.
    const src: Rect = { x: 200, y: 100, width: 80, height: 30 };
    const tgt: Rect = { x: 150, y: 160, width: 250, height: 30 };
    const route = routeConnector(src, tgt);
    expect(route.bends).toBeLessThanOrEqual(4);
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(crossesRect(route.points, src)).toBe(false);
    expect(crossesRect(route.points, tgt)).toBe(false);
  });
});

describe('dependency connector: L4 -- narrow contiguous successor clamps the entry stub', () => {
  // A successor rendered narrower than one stub (< CONNECTOR_STUB_PX ~= 12px). The entry
  // stub must not overshoot the successor's right edge nor invert (run backward).
  const from: Rect = { x: 100, y: 100, width: 120, height: 30 };
  const to: Rect = { x: 220, y: 100, width: 8, height: 30 };

  it('keeps the entry stub inside the successor and forward (+x), crossing neither bar', () => {
    const route = routeConnector(from, to);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.bends).toBeLessThanOrEqual(4);
    const exit = connectorExitPoint(from);
    const entry = route.points[route.points.length - 1]!;
    // Entry stub is horizontal, forward, and never overshoots the successor's right edge.
    expect(lastSegmentIsHorizontal(route.points)).toBe(true);
    expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
    expect(entry.x).toBeLessThanOrEqual(to.x + to.width);
    // No inversion: the entry lands strictly to the right of the source exit, and the
    // whole route never travels left of it.
    expect(entry.x).toBeGreaterThan(exit.x);
    const minX = Math.min(...route.points.map((point) => point.x));
    expect(minX).toBeGreaterThanOrEqual(exit.x);
    expect(crossesRect(route.points, from)).toBe(false);
    expect(crossesRect(route.points, to)).toBe(false);
  });
});

describe('dependency connector: CR-008 template dependency geometries are non-broken', () => {
  // Representative world-space rects reproducing the four template deps' RELATIVE
  // geometry (lane offsets and x-overlaps) with laneHeight 18, barHeight 16.2. Each
  // must render non-broken: horizontal entry stub, forward direction, non-crossing,
  // and within the CR-008 elbow budget.
  const laneHeight = 18;
  const barHeight = laneHeight * 0.9; // 16.2
  const bandTop = 0;
  const laneY = (laneIndex: number): number => bandTop + laneIndex * laneHeight;

  // Over All Schedule > Phase: a single lane of sequential, flush phases.
  const concept: Rect = { x: 0, y: laneY(0), width: 120, height: barHeight };
  const dev: Rect = { x: 120, y: laneY(0), width: 180, height: barHeight };
  const valid: Rect = { x: 300, y: laneY(0), width: 150, height: barHeight };

  // TeamA > Phase: sys3 top (lane 0), sys2 middle (lane 1), sys1 & swe1 bottom
  // (lane 2), matching the bottom-up sub-lane stacking (CR-004 Part 1).
  const sys1: Rect = { x: 0, y: laneY(2), width: 100, height: barHeight };
  const sys2: Rect = { x: 70, y: laneY(1), width: 120, height: barHeight };
  const sys3: Rect = { x: 130, y: laneY(0), width: 100, height: barHeight };
  const swe1: Rect = { x: 120, y: laneY(2), width: 240, height: barHeight };

  const cases: ReadonlyArray<{ readonly id: string; readonly from: Rect; readonly to: Rect }> = [
    { id: 'tpl-dep-concept-dev', from: concept, to: dev },
    { id: 'tpl-dep-dev-valid', from: dev, to: valid },
    { id: 'tpl-dep-sys1-sys2', from: sys1, to: sys2 },
    { id: 'tpl-dep-sys3-swe1', from: sys3, to: swe1 },
  ];

  for (const { id, from, to } of cases) {
    it(`${id}: horizontal forward entry stub, non-crossing, within budget`, () => {
      const route = routeConnector(from, to);
      // Orthogonal, ends horizontally, arrow forward (+x) -- never a vertical plunge.
      expect(isOrthogonal(route.points)).toBe(true);
      expect(lastSegmentIsHorizontal(route.points)).toBe(true);
      expect(lastSegmentDx(route.points)).toBeGreaterThan(0);
      expect(lastSegmentLength(route.points)).toBeCloseTo(CONNECTOR_STUB_PX, 6);
      // Non-crossing: never through the predecessor or successor bar interiors.
      expect(crossesRect(route.points, from)).toBe(false);
      expect(crossesRect(route.points, to)).toBe(false);
      // Elbow budget: forward non-adjacent <= 3, otherwise <= 4 (all template deps are
      // contiguous or backward, so the <= 4 bound applies).
      expect(route.bends).toBeLessThanOrEqual(4);
      // The route starts at the source exit.
      expect(route.points[0]).toEqual(connectorExitPoint(from));
    });
  }

  it('contiguous template deps read forward (entry to the right of the exit)', () => {
    for (const id of ['tpl-dep-concept-dev', 'tpl-dep-dev-valid']) {
      const { from, to } = cases.find((entry) => entry.id === id)!;
      const route = routeConnector(from, to);
      const exit = connectorExitPoint(from);
      const entry = route.points[route.points.length - 1]!;
      expect(entry.x).toBeGreaterThan(exit.x);
    }
  });
});

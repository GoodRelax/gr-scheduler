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
 * Unit coverage for the CR-003 Part 3 deterministic dependency auto-router: the line
 * EXITS the source right edge (vertical center), ENTERS the target left edge, keeps a
 * 2x-arrowhead horizontal stub at each end, drops DOWN right after the stub for a
 * lower target, runs to just before an upper target then UP, and threads the gap
 * between two stacked / overlapping bars.
 */

/** Every segment of the polyline is axis-aligned (right angles only). */
function isOrthogonal(points: readonly { x: number; y: number }[]): boolean {
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (a.x !== b.x && a.y !== b.y) {
      return false;
    }
  }
  return true;
}

/** Whether any segment of the polyline passes through the interior of a rectangle. */
function crossesRect(points: readonly { x: number; y: number }[], rect: Rect): boolean {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    if (a.y === b.y) {
      // Horizontal segment strictly inside the vertical band.
      if (a.y > top && a.y < bottom) {
        const segLeft = Math.min(a.x, b.x);
        const segRight = Math.max(a.x, b.x);
        if (Math.min(segRight, right) - Math.max(segLeft, left) > 0) {
          return true;
        }
      }
    } else {
      // Vertical segment strictly inside the horizontal band.
      if (a.x > left && a.x < right) {
        const segTop = Math.min(a.y, b.y);
        const segBottom = Math.max(a.y, b.y);
        if (Math.min(segBottom, bottom) - Math.max(segTop, top) > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

describe('dependency connector: fixed exit / entry anchors', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('exits the source at its exact right-edge, vertical center', () => {
    const exit = connectorExitPoint(from);
    expect(exit.x).toBe(from.x + from.width);
    expect(exit.y).toBe(from.y + from.height / 2);
  });

  it('enters the target at its exact left-edge, vertical center', () => {
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
    // The descent column sits exactly one stub to the right of the source exit.
    const exit = connectorExitPoint(from);
    expect(route.points[1]!.x).toBe(exit.x + CONNECTOR_STUB_PX);
    expect(route.points[1]!.y).toBe(exit.y);
    // The entry is approached from the LEFT (penultimate point left of the entry).
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
    // The ascent column sits exactly one stub to the LEFT of the target entry.
    expect(route.points[route.points.length - 2]!.x).toBe(entry.x - CONNECTOR_STUB_PX);
    // The horizontal run leaves the exit going rightward as far as the ascent column.
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

describe('dependency connector: stacked + horizontally overlapping threads the gap', () => {
  // Two time-overlapping items stacked into different lanes of one row: the target's
  // left edge (x=40) is to the LEFT of the source's right edge (x=100), and the target
  // sits BELOW the source, so a forward descent would cross a bar. The run must go
  // through the inter-lane gap (between y=130 and y=160).
  const from: Rect = { x: 0, y: 100, width: 100, height: 30 };
  const to: Rect = { x: 40, y: 160, width: 100, height: 30 };

  it('crosses NEITHER bar and keeps its horizontal run in the inter-bar gap', () => {
    const route = routeConnector(from, to);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
    expect(crossesRect(route.points, from)).toBe(false);
    expect(crossesRect(route.points, to)).toBe(false);
    // Exits rightward past the source right edge before dropping into the gap.
    const exit = connectorExitPoint(from);
    expect(route.points[1]!.x).toBe(exit.x + CONNECTOR_STUB_PX);
    // The gap run sits strictly between the source bottom (130) and the target top (160).
    const gapPoint = route.points[2]!;
    expect(gapPoint.y).toBeGreaterThan(from.y + from.height);
    expect(gapPoint.y).toBeLessThan(to.y);
    // Enters the target from the left, horizontally.
    const last = route.points[route.points.length - 1]!;
    const penultimate = route.points[route.points.length - 2]!;
    expect(penultimate.y).toBe(last.y);
    expect(penultimate.x).toBeLessThan(last.x);
  });
});

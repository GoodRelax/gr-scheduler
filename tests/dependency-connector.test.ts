import { describe, expect, it } from 'vitest';
import type { Rect } from '../src/domain/usecase/dependency-router.js';
import {
  connectorEntryPoint,
  connectorExitPoint,
  routeConnector,
} from '../src/domain/usecase/dependency-connector.js';

/**
 * Unit coverage for the fixed-anchor orthogonal dependency connector (DEP-L1-003
 * rework, batch item 4): the line EXITS the source center-right (slightly low),
 * ENTERS the target center-left, and is a 2-bend right-angle for a forward /
 * different-row link and a 4-bend loop for a backward-in-time link.
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

describe('dependency connector: fixed exit / entry anchors', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('exits the source at its center-right, slightly below the vertical center', () => {
    const exit = connectorExitPoint(from);
    // Center-right: exactly on the right edge.
    expect(exit.x).toBe(from.x + from.width);
    const centerY = from.y + from.height / 2;
    // Slightly low: below center but still within the box.
    expect(exit.y).toBeGreaterThan(centerY);
    expect(exit.y).toBeLessThan(from.y + from.height);
  });

  it('enters the target at its exact center-left', () => {
    const entry = connectorEntryPoint(to);
    expect(entry.x).toBe(to.x);
    expect(entry.y).toBe(to.y + to.height / 2);
  });
});

describe('dependency connector: forward / different-row = 2 bends', () => {
  const from: Rect = { x: 0, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 400, y: 300, width: 80, height: 40 };

  it('produces a 2-bend right-angle path from source exit to target entry', () => {
    const route = routeConnector(from, to);
    expect(route.bends).toBe(2);
    expect(isOrthogonal(route.points)).toBe(true);
    // First point is the source exit, last is the target entry.
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
    // The exit heads RIGHTWARD (the second point is to the right of the exit).
    expect(route.points[1]!.x).toBeGreaterThan(route.points[0]!.x);
    // The entry is approached from the LEFT (the penultimate point is left of the entry).
    const last = route.points[route.points.length - 1]!;
    const penultimate = route.points[route.points.length - 2]!;
    expect(penultimate.x).toBeLessThan(last.x);
  });
});

describe('dependency connector: backward-in-time = 4 bends', () => {
  // Target is to the LEFT of / earlier than the source's exit.
  const from: Rect = { x: 400, y: 100, width: 80, height: 40 };
  const to: Rect = { x: 0, y: 300, width: 80, height: 40 };

  it('routes out to the right, around, and back into the target left with 4 bends', () => {
    const route = routeConnector(from, to);
    expect(route.bends).toBe(4);
    expect(isOrthogonal(route.points)).toBe(true);
    expect(route.points).toHaveLength(6);
    expect(route.points[0]).toEqual(connectorExitPoint(from));
    expect(route.points[route.points.length - 1]).toEqual(connectorEntryPoint(to));
    // Step 1 goes rightward, past the source's right edge.
    expect(route.points[1]!.x).toBeGreaterThan(route.points[0]!.x);
    // Final segment enters the target from the LEFT going rightward.
    const last = route.points[5]!;
    const penultimate = route.points[4]!;
    expect(penultimate.x).toBeLessThan(last.x);
    expect(penultimate.y).toBe(last.y);
  });
});

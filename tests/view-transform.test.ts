import { describe, expect, it } from 'vitest';
import {
  ViewTransform,
  type ViewTransformParams,
} from '../src/domain/usecase/view-transform.js';

/**
 * PINNING tests for the world <-> screen coordinate transform (review R2 / M-1).
 *
 * These lock the EXACT numeric behavior that the SvgRenderer relied on before the
 * `worldToScreen*` methods were consolidated into {@link ViewTransform}, so a
 * future refactor (Stage 2 layer split) cannot silently drift coordinates. The
 * legacy formulas are inlined here as the source of truth; the transform must
 * reproduce them to the last pixel, and every forward map must round-trip through
 * its inverse.
 */

// The formulas the renderer used before consolidation, kept verbatim as the
// reference the value object must match.
function legacyToContentX(p: ViewTransformParams, worldX: number): number {
  return worldX - p.scrollX + p.leftPaneWidth;
}
function legacyToContentY(p: ViewTransformParams, worldY: number): number {
  return worldY - p.scrollY + p.contentTopOffsetPx;
}
function legacyToClientX(p: ViewTransformParams, worldX: number): number {
  return p.rectLeft + worldX + p.leftPaneWidth - p.scrollX;
}
function legacyToClientY(p: ViewTransformParams, worldY: number): number {
  return p.rectTop + worldY + p.contentTopOffsetPx - p.scrollY;
}
function legacyFromClientX(p: ViewTransformParams, clientX: number): number {
  return clientX - p.rectLeft - p.leftPaneWidth + p.scrollX;
}
function legacyFromClientY(p: ViewTransformParams, clientY: number): number {
  return clientY - p.rectTop - p.contentTopOffsetPx + p.scrollY;
}

const CASES: readonly ViewTransformParams[] = [
  { leftPaneWidth: 200, contentTopOffsetPx: 32, scrollX: 150, scrollY: 80, rectLeft: 17, rectTop: 23 },
  { leftPaneWidth: 0, contentTopOffsetPx: 0, scrollX: 0, scrollY: 0, rectLeft: 0, rectTop: 0 },
  { leftPaneWidth: 240, contentTopOffsetPx: 48, scrollX: -60, scrollY: -12.5, rectLeft: 8.25, rectTop: -4.75 },
  { leftPaneWidth: 120.5, contentTopOffsetPx: 16, scrollX: 1000, scrollY: 640, rectLeft: 300, rectTop: 90 },
];

const WORLD_POINTS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [300, 120],
  [-45.5, 733.25],
  [1024, -8],
];

describe('ViewTransform', () => {
  it('pins toContent / toClient to the exact legacy formulas', () => {
    for (const params of CASES) {
      const transform = new ViewTransform(params);
      for (const [worldX, worldY] of WORLD_POINTS) {
        expect(transform.toContentX(worldX)).toBe(legacyToContentX(params, worldX));
        expect(transform.toContentY(worldY)).toBe(legacyToContentY(params, worldY));
        expect(transform.toContent({ worldX, worldY })).toEqual({
          contentX: legacyToContentX(params, worldX),
          contentY: legacyToContentY(params, worldY),
        });
        expect(transform.toClientX(worldX)).toBe(legacyToClientX(params, worldX));
        expect(transform.toClientY(worldY)).toBe(legacyToClientY(params, worldY));
        expect(transform.toClient({ worldX, worldY })).toEqual({
          clientX: legacyToClientX(params, worldX),
          clientY: legacyToClientY(params, worldY),
        });
      }
    }
  });

  it('pins fromClient (pointer -> world) to the exact legacy inverse', () => {
    for (const params of CASES) {
      const transform = new ViewTransform(params);
      // Sample the client plane directly (as a PointerEvent would deliver it).
      for (const [clientX, clientY] of [
        [0, 0],
        [367, 95],
        [12.5, 480.25],
      ] as const) {
        expect(transform.fromClientX(clientX)).toBe(legacyFromClientX(params, clientX));
        expect(transform.fromClientY(clientY)).toBe(legacyFromClientY(params, clientY));
        expect(transform.fromClient({ clientX, clientY })).toEqual({
          worldX: legacyFromClientX(params, clientX),
          worldY: legacyFromClientY(params, clientY),
        });
      }
    }
  });

  it('round-trips fromClient(toClient(p)) == p exactly', () => {
    for (const params of CASES) {
      const transform = new ViewTransform(params);
      for (const [worldX, worldY] of WORLD_POINTS) {
        const back = transform.fromClient(transform.toClient({ worldX, worldY }));
        expect(back.worldX).toBe(worldX);
        expect(back.worldY).toBe(worldY);
      }
    }
  });

  it('round-trips fromContent(toContent(p)) == p exactly', () => {
    for (const params of CASES) {
      const transform = new ViewTransform(params);
      for (const [worldX, worldY] of WORLD_POINTS) {
        const back = transform.fromContent(transform.toContent({ worldX, worldY }));
        expect(back.worldX).toBe(worldX);
        expect(back.worldY).toBe(worldY);
      }
    }
  });

  it('client space is content space shifted by exactly the rect origin', () => {
    for (const params of CASES) {
      const transform = new ViewTransform(params);
      for (const [worldX, worldY] of WORLD_POINTS) {
        expect(transform.toClientX(worldX) - transform.toContentX(worldX)).toBe(params.rectLeft);
        expect(transform.toClientY(worldY) - transform.toContentY(worldY)).toBe(params.rectTop);
      }
    }
  });

  it('a zero rect makes client space identical to content space', () => {
    const params: ViewTransformParams = {
      leftPaneWidth: 200,
      contentTopOffsetPx: 32,
      scrollX: 150,
      scrollY: 80,
      rectLeft: 0,
      rectTop: 0,
    };
    const transform = new ViewTransform(params);
    for (const [worldX, worldY] of WORLD_POINTS) {
      expect(transform.toClientX(worldX)).toBe(transform.toContentX(worldX));
      expect(transform.toClientY(worldY)).toBe(transform.toContentY(worldY));
    }
  });
});

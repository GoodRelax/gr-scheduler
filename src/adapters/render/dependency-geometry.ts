/**
 * Adapter layer: pure geometry helpers shared by the dependency render layer and
 * the dependency hit-tester (H-1 split). Moved verbatim out of the monolith so the
 * drawn line and the grabbable line use the identical polyline math.
 */

import type { ItemPlacement } from '../../domain/usecase/layout-engine.js';
import type { Point, Rect } from '../../domain/usecase/dependency-router.js';
import { SVG_NS } from './render-context.js';

/** Id of the shared minimal dependency arrowhead marker (DEP-L1-004). */
export const DEP_ARROW_MARKER_ID = 'grsch-dep-arrow';

/**
 * Screen-pixel tolerance within which a click counts as landing on a dependency
 * line (item 1). Wide enough that the thin (1.4px) line is comfortably grabbable.
 */
export const DEP_HIT_TOLERANCE_PX = 6;

/** World-space bounding rectangle of an item placement (for anchors/routing). */
export function placementRect(placement: ItemPlacement): Rect {
  return {
    x: placement.worldX,
    y: placement.worldY,
    width: placement.worldWidth,
    height: placement.worldHeight,
    // Tag with the owning item so the router can exclude an endpoint from being
    // an obstacle to its own line by stable identity, not object reference (H-01).
    itemId: placement.itemId,
  };
}

/**
 * Build the `<defs>` holding the minimal, screen-space-fixed dependency
 * arrowhead marker (DEP-L1-004, ADR-004). `markerUnits="userSpaceOnUse"` with a
 * fixed size makes the arrowhead a constant few pixels regardless of stroke or
 * zoom (the content group is only translated, never scaled).
 */
export function buildDependencyMarkerDefs(): SVGDefsElement {
  const defs = document.createElementNS(SVG_NS, 'defs');
  const marker = document.createElementNS(SVG_NS, 'marker');
  marker.setAttribute('id', DEP_ARROW_MARKER_ID);
  marker.setAttribute('markerUnits', 'userSpaceOnUse');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '6');
  marker.setAttribute('refY', '3');
  marker.setAttribute('orient', 'auto');
  const head = document.createElementNS(SVG_NS, 'path');
  head.setAttribute('d', 'M 0 0 L 6 3 L 0 6 Z');
  // Follow each line's own stroke color (item 1) so the arrowhead matches a
  // recolored line and the yamabuki-gold default.
  head.setAttribute('fill', 'context-stroke');
  marker.appendChild(head);
  defs.appendChild(marker);
  return defs;
}

/** Shortest distance from a point to a polyline (sequence of connected segments). */
export function distanceToPolyline(px: number, py: number, points: readonly Point[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a === undefined || b === undefined) {
      continue;
    }
    best = Math.min(best, distanceToSegment(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}

/** Shortest distance from point (px,py) to the segment (ax,ay)-(bx,by). */
export function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

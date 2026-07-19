/**
 * UseCase layer: task edge-resize hit resolution (ITEM-L1-004 resize; interaction
 * hardening). Pure and side-effect free so the renderer can reuse it and the
 * tests can assert the hit zones without a DOM.
 *
 * Two problems this fixes for real-app use:
 * 1. The edge resize zone was too narrow to grab, so a drag started near a task
 *    end usually moved the whole bar instead of resizing it. The zone is now a
 *    minimum number of SCREEN pixels wide and takes PRECEDENCE over a body (move)
 *    hit at the same point.
 * 2. When plan/actual (or otherwise overlapping) bars stack, the topmost bar hid
 *    the edge of the one beneath. Resolution now prefers the SELECTED bar, then
 *    the topmost lane, so selecting a bar makes its own edges grabbable even under
 *    an overlapping neighbour.
 */

/** Which sub-region of a task a pointer is over (drives move vs resize). */
export type EdgeRegion = 'resize-start' | 'resize-end' | 'body';

/** A hit-testable item under the pointer, in world (== screen, unscaled) pixels. */
export interface HitCandidate {
  readonly itemId: string;
  /** Sub-lane index within the row band (higher draws on top). */
  readonly laneIndex: number;
  /** World-space left x of the item. */
  readonly worldLeft: number;
  /** World-space rendered width of the item. */
  readonly worldWidth: number;
  /** Only tasks (spans) have resizable edges; milestones do not. */
  readonly isTask: boolean;
  /** Whether the item is currently selected (its edges win ties). */
  readonly isSelected: boolean;
}

/** A resolved hit: which item and which of its sub-regions. */
export interface ResolvedItemHit {
  readonly itemId: string;
  readonly region: EdgeRegion;
}

/**
 * Classify a single item's sub-region at a world x. Returns a resize region when
 * the point is within `handlePx` of a task edge, otherwise `body`. The edge zones
 * never overlap: on a bar narrower than `2 * handlePx` the left half resolves to
 * `resize-start` and the right half to `resize-end` so both ends stay grabbable.
 *
 * @param worldX - Pointer world x.
 * @param worldLeft - Item left x.
 * @param worldWidth - Item width.
 * @param isTask - Whether the item is a resizable task.
 * @param handlePx - Edge zone half-width in screen pixels.
 * @returns The sub-region under the pointer.
 */
export function edgeRegionAt(
  worldX: number,
  worldLeft: number,
  worldWidth: number,
  isTask: boolean,
  handlePx: number,
): EdgeRegion {
  if (!isTask) {
    return 'body';
  }
  const worldRight = worldLeft + worldWidth;
  const midpoint = worldLeft + worldWidth / 2;
  // Clamp the effective zone to half the bar so a short bar's two edge zones meet
  // at the midpoint instead of overlapping (which would make one edge unreachable).
  const zone = Math.min(handlePx, worldWidth / 2);
  if (worldX <= worldLeft + zone && worldX <= midpoint) {
    return 'resize-start';
  }
  if (worldX >= worldRight - zone && worldX > midpoint) {
    return 'resize-end';
  }
  return 'body';
}

/**
 * Resolve which item (and sub-region) a pointer grabs among overlapping
 * candidates. Preference order: (1) the SELECTED item's edge, (2) any edge, with
 * selected-first then topmost lane, (3) the selected or topmost body. Edges take
 * precedence over bodies so a resize is never stolen by a move at the same point.
 *
 * @param candidates - All items whose box contains the pointer (any order).
 * @param worldX - Pointer world x.
 * @param handlePx - Edge zone half-width in screen pixels.
 * @returns The resolved hit, or null when there are no candidates.
 */
export function pickItemHit(
  candidates: readonly HitCandidate[],
  worldX: number,
  handlePx: number,
): ResolvedItemHit | null {
  if (candidates.length === 0) {
    return null;
  }
  // Selected first, then topmost lane. A stable, explicit ordering makes the
  // "selected/top bar wins" rule deterministic under overlap.
  const ordered = [...candidates].sort((left, right) => {
    if (left.isSelected !== right.isSelected) {
      return left.isSelected ? -1 : 1;
    }
    return right.laneIndex - left.laneIndex;
  });
  for (const candidate of ordered) {
    const region = edgeRegionAt(
      worldX,
      candidate.worldLeft,
      candidate.worldWidth,
      candidate.isTask,
      handlePx,
    );
    if (region !== 'body') {
      return { itemId: candidate.itemId, region };
    }
  }
  const top = ordered[0];
  return top === undefined ? null : { itemId: top.itemId, region: 'body' };
}

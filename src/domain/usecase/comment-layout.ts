/**
 * UseCase layer: pure geometry for comment/annotation bubble + leader-line layout
 * (ARCH-C-005, CURS-L1-005/006). No DOM.
 *
 * A comment has an ANCHOR (the pointed-at target) and a BUBBLE (the speech box at
 * a screen-space offset from the anchor). The anchor is either:
 *
 *  - bound to an item -- `{ anchorItemId, anchorPoint }` using the 9-point anchor
 *    on the item's bounding box, so the anchor FOLLOWS the item as it moves; or
 *  - a free world point -- the comment's `anchorDate` / `anchorRowIndex`, which the
 *    adapter maps to a world point that pans/zooms with the canvas.
 *
 * The LEADER LINE is drawn from the bubble's nearest edge/corner to the anchor
 * point. These functions compute both the item-anchor point and the leader
 * endpoints so the renderer (adapter) stays a thin projection of this pure logic
 * and the behavior is unit-testable without a browser.
 */

import type { Point, Rect } from './dependency-router.js';
import { anchorPoint } from './dependency-router.js';
import type { AnchorIndex } from '../model/schedule-model.js';

/** The default 9-point anchor when a comment omits one (center of the item). */
export const DEFAULT_COMMENT_ANCHOR_POINT: AnchorIndex = 4;

/**
 * Resolve the anchor point of an ITEM-anchored comment: the given 9-point anchor
 * on the item's bounding box (CURS-L1-005). Because the point is derived from the
 * item's live rectangle every frame, the anchor follows the item when the item
 * moves.
 *
 * @param itemRect - The item's bounding box (world or screen space, consistent).
 * @param commentAnchorPoint - Which of the 9 anchors, or undefined for center.
 * @returns The anchor point on the item's box.
 */
export function resolveItemAnchorPoint(
  itemRect: Rect,
  commentAnchorPoint: AnchorIndex | undefined,
): Point {
  return anchorPoint(itemRect, commentAnchorPoint ?? DEFAULT_COMMENT_ANCHOR_POINT);
}

/** Clamp a scalar to the inclusive `[low, high]` range. */
function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

/**
 * The point on a rectangle's border nearest to an external point (the bubble's
 * nearest edge/corner toward the anchor). When the anchor is inside the rectangle
 * the clamped point is the anchor itself; the renderer then draws a zero-length
 * (invisible) leader, which is correct.
 *
 * @param rect - The bubble rectangle.
 * @param toward - The point the nearest border point should face (the anchor).
 * @returns The nearest point on the rectangle to `toward`.
 */
export function nearestPointOnRect(rect: Rect, toward: Point): Point {
  return {
    x: clamp(toward.x, rect.x, rect.x + rect.width),
    y: clamp(toward.y, rect.y, rect.y + rect.height),
  };
}

/** A leader line segment from the bubble's nearest edge to the anchor point. */
export interface LeaderEndpoints {
  /** Start of the leader: the bubble's nearest edge/corner point. */
  readonly fromBubble: Point;
  /** End of the leader: the anchor point. */
  readonly toAnchor: Point;
}

/**
 * Compute the leader-line endpoints from a bubble rectangle to an anchor point
 * (CURS-L1-006). The leader starts at the bubble edge nearest the anchor and ends
 * exactly on the anchor, so moving the bubble (a drag that changes `bubbleRect`)
 * re-routes the leader to keep pointing at the same anchor.
 *
 * @param bubbleRect - The bubble (speech box) rectangle.
 * @param anchor - The anchor point the leader must reach.
 * @returns The leader endpoints (bubble edge -> anchor).
 */
export function commentLeaderEndpoints(bubbleRect: Rect, anchor: Point): LeaderEndpoints {
  return { fromBubble: nearestPointOnRect(bubbleRect, anchor), toAnchor: anchor };
}

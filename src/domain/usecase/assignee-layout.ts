/**
 * UseCase layer: assignee-name label geometry (CR-004 Part 5, ITEM-L2-004).
 *
 * When the assignee column is shown, each item draws its `assignee` name to the
 * LEFT of its glyph, RIGHT-aligned so the names across rows form a right-aligned
 * column ending just before every item's left edge. The label must NOT overlap the
 * horizontal segment of a dependency line entering at the item's `middle_left`
 * anchor (DEP-L2-003), which runs along the lane's vertical center. To stay clear of
 * that inbound stub -- and to remain robust to the CR-008 dependency-router redesign
 * (which may change how/where the stub is drawn) -- the label box is placed entirely
 * in the UPPER half of the lane, so its bottom never crosses the vertical center.
 *
 * Pure and side-effect free (no DOM, no font metrics).
 */

/** Horizontal gap (px) between the assignee label's right edge and the item glyph. */
export const ASSIGNEE_LABEL_GAP_PX = 6;

/** Assignee font-size as a fraction of the lane height (a compact side annotation). */
export const ASSIGNEE_FONT_HEIGHT_RATIO = 0.55;

/** Floor for the assignee font-size so a zoomed-out row keeps the name legible. */
export const ASSIGNEE_FONT_MIN_PX = 8;

/** Geometry for one item's assignee label, in world-space pixels. */
export interface AssigneeLabelGeometry {
  /** Right-edge anchor x (the text is right-aligned, so it ENDS here). */
  readonly x: number;
  /** Label baseline/center y (paired with a `middle` dominant-baseline). */
  readonly y: number;
  /** Always `end`: the name is right-aligned into the column. */
  readonly textAnchor: 'end';
  /** Rendered font-size in px. */
  readonly fontSizePx: number;
}

/**
 * The assignee label font-size for a given lane height (mirrors the task/milestone
 * approach of keying the font off the drawn height), clamped up to a legible floor.
 *
 * @param laneHeightPx - The item's rendered lane/bar height.
 * @returns The assignee font-size in px.
 */
export function assigneeLabelFontSizePx(laneHeightPx: number): number {
  return Math.max(ASSIGNEE_FONT_MIN_PX, laneHeightPx * ASSIGNEE_FONT_HEIGHT_RATIO);
}

/**
 * Compute the world-space geometry of an item's assignee label (CR-004 Part 5).
 * The label is right-aligned to end {@link ASSIGNEE_LABEL_GAP_PX} before the item's
 * left edge, and vertically placed so its whole box sits ABOVE the lane's vertical
 * center -- guaranteeing non-interference with a `middle_left` inbound dependency
 * stub (DEP-L2-003) regardless of the current router geometry.
 *
 * @param itemLeftX - The world x of the item glyph's LEFT edge (bar left, or a
 *   milestone's center minus its icon radius).
 * @param laneTopY - The world y of the item's lane top.
 * @param laneHeightPx - The item's rendered lane/bar height.
 * @returns The assignee label geometry.
 */
export function assigneeLabelGeometry(
  itemLeftX: number,
  laneTopY: number,
  laneHeightPx: number,
): AssigneeLabelGeometry {
  const fontSizePx = assigneeLabelFontSizePx(laneHeightPx);
  const x = itemLeftX - ASSIGNEE_LABEL_GAP_PX;
  const centerY = laneTopY + laneHeightPx / 2;
  // With a `middle` dominant-baseline the box spans y +/- ~0.6*font; placing the
  // baseline 0.6*font above the lane center keeps the box BOTTOM at (or above) the
  // center line, clear of the horizontal middle_left inbound dependency stub.
  const y = centerY - fontSizePx * 0.6;
  return { x, y, textAnchor: 'end', fontSizePx };
}

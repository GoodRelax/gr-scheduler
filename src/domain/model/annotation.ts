/**
 * Entity layer (Clean Architecture): the annotation model (ARCH-C-005). Two free
 * placements the reviewer drops onto the canvas:
 *
 * - Comments (CURS-L1-005 / L1-006): a text note pointed at a target, drawn
 *   either as a callout-box (`-□` / `/□`) or as a polyline leader
 *   (`/----` / `\____/`).
 * - Rounded-box enclosures (CURS-L1-007 / L2-001): a colored rounded rectangle
 *   around an arbitrary date/row region whose corner radius is a fixed number of
 *   SCREEN pixels, invariant to zoom (ADR-004).
 *
 * All positional fields are authored in domain units (dates + row indices) so
 * they follow zoom/pan like every other datum; only `cornerRadiusPx` and the
 * comment body offset are screen-space, exactly the values ADR-004 keeps
 * zoom-invariant. Every field is required within its variant, but the whole
 * `annotations` array on the document is optional, so pre-M4 fixtures stay valid.
 */

import type { AnchorIndex, IsoDate } from './schedule-model.js';

/** Discriminates the two comment leader styles (CURS-L1-006). */
export type CommentLeaderKind = 'callout-box' | 'polyline';

/** Discriminates an annotation variant (ARCH-C-005). */
export type AnnotationKind = CommentLeaderKind | 'rounded-box';

/**
 * A text comment pinned to a target on the canvas (CURS-L1-005). It has an ANCHOR
 * and a BUBBLE, per the comment position model:
 *
 *  - ANCHOR (the pointed-at target) is EITHER bound to an item -- `anchorItemId`
 *    plus a 9-point `anchorPoint` on that item's box, so the anchor FOLLOWS the
 *    item when the item moves -- OR a free world point (`anchorDate`,
 *    `anchorRowIndex`) that stays fixed in world coords and pans/zooms with the
 *    canvas. When `anchorItemId` is absent the free world point is used.
 *  - BUBBLE (the speech box) sits at the screen-space offset `bodyOffsetPx`
 *    (`{ dx, dy }`, the "bubbleOffset") from the anchor, so the leader length stays
 *    readable at any zoom. Dragging the bubble updates `bodyOffsetPx` (undoable) and
 *    the leader line is re-routed from the bubble's nearest edge to the anchor.
 *
 * `anchorDate` / `anchorRowIndex` remain REQUIRED (a cached free-point fallback) so
 * pre-item-anchor fixtures stay valid and an item-anchored comment still has a
 * sensible position if its item is later deleted.
 */
export interface CommentAnnotation {
  readonly id: string;
  readonly annotationKind: CommentLeaderKind;
  /** The note text (product-facing; i18n value handled by the UI layer). */
  readonly text: string;
  /** Time-axis position of the pointed-at free-world target (fallback anchor). */
  readonly anchorDate: IsoDate;
  /** Vertical (row-order) index of the pointed-at free-world target (fallback). */
  readonly anchorRowIndex: number;
  /**
   * When set, the comment is ITEM-anchored: its anchor is the 9-point
   * {@link anchorPoint} on this item's bounding box and follows the item as it
   * moves. Absent means the comment is anchored to the free world point above.
   */
  readonly anchorItemId?: string;
  /** The 9-point anchor on the bound item (absent = center); used with `anchorItemId`. */
  readonly anchorPoint?: AnchorIndex;
  /** Screen-space offset of the bubble (speech box) from the anchor (the leader vector). */
  readonly bodyOffsetPx: { readonly dx: number; readonly dy: number };
}

/**
 * A colored rounded rectangle enclosing a date/row region (CURS-L1-007). The
 * region (`startDate..endDate`, `topRowIndex..bottomRowIndex`) follows zoom/pan;
 * `cornerRadiusPx` is a fixed screen-pixel radius that does NOT grow with zoom
 * (CURS-L2-001 / ADR-004).
 */
export interface RoundedBoxAnnotation {
  readonly id: string;
  readonly annotationKind: 'rounded-box';
  /** Inclusive left edge of the enclosed region on the time axis. */
  readonly startDate: IsoDate;
  /** Inclusive right edge of the enclosed region on the time axis. */
  readonly endDate: IsoDate;
  /** Top row (vertical order index) of the enclosed region. */
  readonly topRowIndex: number;
  /** Bottom row (vertical order index) of the enclosed region, inclusive. */
  readonly bottomRowIndex: number;
  /** Frame color (CSS color string), editable after creation (CURS-L1-007). */
  readonly strokeColor: string;
  /** Corner radius in SCREEN pixels, invariant to zoom (CURS-L2-001). */
  readonly cornerRadiusPx: number;
}

/** Any canvas annotation (ARCH-C-005). */
export type Annotation = CommentAnnotation | RoundedBoxAnnotation;

/** Narrowing helper: true when the annotation is a rounded-box enclosure. */
export function isRoundedBox(annotation: Annotation): annotation is RoundedBoxAnnotation {
  return annotation.annotationKind === 'rounded-box';
}

/** Narrowing helper: true when the annotation is a text comment. */
export function isComment(annotation: Annotation): annotation is CommentAnnotation {
  return annotation.annotationKind === 'callout-box' || annotation.annotationKind === 'polyline';
}

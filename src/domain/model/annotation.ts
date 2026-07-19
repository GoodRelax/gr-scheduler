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

import type { IsoDate } from './schedule-model.js';

/** Discriminates the two comment leader styles (CURS-L1-006). */
export type CommentLeaderKind = 'callout-box' | 'polyline';

/** Discriminates an annotation variant (ARCH-C-005). */
export type AnnotationKind = CommentLeaderKind | 'rounded-box';

/**
 * A text comment pinned to a target point on the canvas (CURS-L1-005). The
 * target (`anchorDate`, `anchorRowIndex`) is world-space; the text body sits at a
 * screen-space offset (`bodyOffsetPx`) from the target so the leader length stays
 * readable at any zoom.
 */
export interface CommentAnnotation {
  readonly id: string;
  readonly annotationKind: CommentLeaderKind;
  /** The note text (product-facing; i18n value handled by the UI layer). */
  readonly text: string;
  /** Time-axis position of the pointed-at target. */
  readonly anchorDate: IsoDate;
  /** Vertical (row-order) index of the pointed-at target. */
  readonly anchorRowIndex: number;
  /** Screen-space offset of the text body from the anchor (leader vector). */
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

/**
 * UseCase layer: annotation edit commands (ARCH-C-005, ADR-002). Creating and
 * moving comments and rounded-box enclosures are pure, snapshot-reversible
 * transforms `ScheduleDocument -> ScheduleDocument`, so they run through the same
 * M2 store and become undoable (CURS-L1-005/006/007, TOOL-L1-004).
 *
 * Like the item commands, these operate in domain units (dates, row indices,
 * screen-pixel body offsets) and never touch the DOM.
 */

import type {
  Annotation,
  CommentAnnotation,
  RoundedBoxAnnotation,
} from '../model/annotation.js';
import { isComment } from '../model/annotation.js';
import type { IsoDate, ScheduleDocument } from '../model/schedule-model.js';
import { toDayNumber } from '../usecase/time-coordinate-mapper.js';
import type { ScheduleCommand } from './commands.js';

/**
 * Command: append a comment annotation (CURS-L1-005/006). Undoable.
 *
 * @param comment - The comment to add (its `id` must be unique in the document).
 * @returns A create-comment command.
 */
export function createCommentCommand(comment: CommentAnnotation): ScheduleCommand {
  return {
    label: 'create-comment',
    execute: (scheduleDocument) => ({
      ...scheduleDocument,
      annotations: [...(scheduleDocument.annotations ?? []), comment],
    }),
  };
}

/**
 * Command: append a rounded-box enclosure (CURS-L1-007). Undoable.
 *
 * @param box - The rounded box to add (its `id` must be unique in the document).
 * @returns A create-rounded-box command.
 */
export function createRoundedBoxCommand(box: RoundedBoxAnnotation): ScheduleCommand {
  return {
    label: 'create-rounded-box',
    execute: (scheduleDocument) => ({
      ...scheduleDocument,
      annotations: [...(scheduleDocument.annotations ?? []), box],
    }),
  };
}

/** Map every annotation via `mapAnnotation`, returning the same doc on no-op. */
function mapAnnotations(
  scheduleDocument: ScheduleDocument,
  mapAnnotation: (annotation: Annotation) => Annotation,
): ScheduleDocument {
  const existing = scheduleDocument.annotations ?? [];
  let changed = false;
  const annotations = existing.map((annotation) => {
    const mapped = mapAnnotation(annotation);
    if (mapped !== annotation) {
      changed = true;
    }
    return mapped;
  });
  return changed ? { ...scheduleDocument, annotations } : scheduleDocument;
}

/**
 * Command: move a comment's text body by a screen-pixel delta (CURS-L1-005 drag).
 * No-op for non-comment annotations and for a zero delta.
 *
 * @param commentId - The comment to move.
 * @param deltaPx - Screen-space offset added to the current body offset.
 * @returns A move-comment command.
 */
export function moveCommentCommand(
  commentId: string,
  deltaPx: { readonly dx: number; readonly dy: number },
): ScheduleCommand {
  return {
    label: 'move-comment',
    execute: (scheduleDocument) => {
      if (deltaPx.dx === 0 && deltaPx.dy === 0) {
        return scheduleDocument;
      }
      return mapAnnotations(scheduleDocument, (annotation) => {
        if (annotation.id !== commentId || !isComment(annotation)) {
          return annotation;
        }
        return {
          ...annotation,
          bodyOffsetPx: {
            dx: annotation.bodyOffsetPx.dx + deltaPx.dx,
            dy: annotation.bodyOffsetPx.dy + deltaPx.dy,
          },
        };
      });
    },
  };
}

/**
 * Command: move a comment's leader ANCHOR (the pointed-at target) to a new FREE
 * world point (CURS-L1-005 anchor drag). Sets the free-point `anchorDate` /
 * `anchorRowIndex` and DETACHES any item binding (`anchorItemId` / `anchorPoint`
 * are dropped) so the anchor no longer follows an item and the leader re-routes
 * from the bubble to the new point. Undoable; round-trips via JSON. No-op for
 * non-comment annotations.
 *
 * @param commentId - The comment whose anchor to move.
 * @param anchor - The new free-world anchor (date + row index).
 * @returns A move-comment-anchor command.
 */
export function moveCommentAnchorCommand(
  commentId: string,
  anchor: { readonly anchorDate: IsoDate; readonly anchorRowIndex: number },
): ScheduleCommand {
  return {
    label: 'move-comment-anchor',
    execute: (scheduleDocument) =>
      mapAnnotations(scheduleDocument, (annotation) => {
        if (annotation.id !== commentId || !isComment(annotation)) {
          return annotation;
        }
        if (
          annotation.anchorDate === anchor.anchorDate &&
          annotation.anchorRowIndex === anchor.anchorRowIndex &&
          annotation.anchorItemId === undefined
        ) {
          return annotation; // unchanged: no-op (no history entry).
        }
        // Detach from any item binding by rebuilding the comment WITHOUT the
        // item-anchor fields, then re-pin it to the new free world point.
        const detached: CommentAnnotation = {
          id: annotation.id,
          annotationKind: annotation.annotationKind,
          text: annotation.text,
          anchorDate: anchor.anchorDate,
          anchorRowIndex: anchor.anchorRowIndex,
          bodyOffsetPx: annotation.bodyOffsetPx,
        };
        return detached;
      }),
  };
}

/**
 * Command: replace a comment's text (CR-007 Part 3, CURS-L1-005 edit). Undoable;
 * a no-op (same document reference) when the text is unchanged or the target is
 * not a comment.
 *
 * @param commentId - The comment to edit.
 * @param text - The new note text.
 * @returns An edit-comment-text command.
 */
export function editCommentTextCommand(commentId: string, text: string): ScheduleCommand {
  return {
    label: 'edit-comment-text',
    execute: (scheduleDocument) =>
      mapAnnotations(scheduleDocument, (annotation) =>
        annotation.id === commentId && isComment(annotation) && annotation.text !== text
          ? { ...annotation, text }
          : annotation,
      ),
  };
}

/** The two ways a comment text edit can end (CR-007 Part 3, D-7). */
export type CommentEditAction = 'commit' | 'cancel';

/** The resolved result of a comment text edit gesture: whether to keep, and the text. */
export interface CommentEditOutcome {
  /** True when the edited text should be committed (undoable), false to discard. */
  readonly commit: boolean;
  /** The text to end up with (edited on commit, prior on cancel). */
  readonly text: string;
}

/**
 * Resolve a comment text-edit gesture (CR-007 Part 3, D-7): Enter (`'commit'`)
 * keeps the edited text; Escape (`'cancel'`) reverts to the prior text. A commit
 * that did not change the text is reported as `commit: false` so the caller skips
 * a no-op command / history entry.
 *
 * @param action - `'commit'` (Enter) or `'cancel'` (Escape).
 * @param priorText - The comment's text before editing began.
 * @param editedText - The text currently in the editor.
 * @returns Whether to commit, and the resulting text.
 */
export function resolveCommentEditOutcome(
  action: CommentEditAction,
  priorText: string,
  editedText: string,
): CommentEditOutcome {
  if (action === 'cancel') {
    return { commit: false, text: priorText };
  }
  return { commit: editedText !== priorText, text: editedText };
}

/**
 * Command: recolor a rounded-box enclosure (CURS-L1-007 "color editable"). No-op
 * when the color is unchanged or the target is not a rounded box.
 *
 * @param boxId - The rounded box to recolor.
 * @param strokeColor - The new frame color (CSS color string).
 * @returns A recolor-rounded-box command.
 */
export function recolorRoundedBoxCommand(boxId: string, strokeColor: string): ScheduleCommand {
  return {
    label: 'recolor-rounded-box',
    execute: (scheduleDocument) =>
      mapAnnotations(scheduleDocument, (annotation) =>
        annotation.id === boxId &&
        annotation.annotationKind === 'rounded-box' &&
        annotation.strokeColor !== strokeColor
          ? { ...annotation, strokeColor }
          : annotation,
      ),
  };
}

/** A normalized rounded-box rectangle (date span + row span), for 2-click placement. */
export interface RoundedBoxRect {
  readonly startDate: IsoDate;
  readonly endDate: IsoDate;
  readonly topRowIndex: number;
  readonly bottomRowIndex: number;
}

/**
 * Normalize two clicked corners into a rounded-box rectangle (CR-006 Part 8, 2-click
 * placement). The two clicks may land in any order (top-left then bottom-right, or the
 * reverse / mixed), so this orders the dates ascending and the row indices ascending
 * and clamps them non-negative -- exactly like {@link resizeRoundedBoxCommand}'s
 * normalization -- yielding a well-formed rect regardless of click order. Pure.
 *
 * @param firstDate - Date under the first click.
 * @param secondDate - Date under the second click.
 * @param firstRowIndex - Display row index under the first click.
 * @param secondRowIndex - Display row index under the second click.
 * @returns The normalized rectangle.
 */
export function roundedBoxRectFromCorners(
  firstDate: IsoDate,
  secondDate: IsoDate,
  firstRowIndex: number,
  secondRowIndex: number,
): RoundedBoxRect {
  const [startDate, endDate] =
    toDayNumber(firstDate) <= toDayNumber(secondDate)
      ? [firstDate, secondDate]
      : [secondDate, firstDate];
  const topRowIndex = Math.max(0, Math.min(firstRowIndex, secondRowIndex));
  const bottomRowIndex = Math.max(0, Math.max(firstRowIndex, secondRowIndex));
  return { startDate, endDate, topRowIndex, bottomRowIndex };
}

/**
 * A resize/move patch for a rounded-box enclosure (CURS-L1-007 handle drag). Any
 * subset of the four edges may be supplied; omitted edges keep their value. The
 * command normalizes the result so `startDate <= endDate` and
 * `topRowIndex <= bottomRowIndex`, and clamps row indices to be non-negative, so
 * a handle dragged past the opposite edge simply flips rather than inverting.
 */
export interface RoundedBoxRectPatch {
  readonly startDate?: IsoDate;
  readonly endDate?: IsoDate;
  readonly topRowIndex?: number;
  readonly bottomRowIndex?: number;
}

/**
 * Command: resize (or move) a rounded-box enclosure by rewriting its date/row
 * bounds (CURS-L1-007). The corner radius is untouched, so it stays the same
 * screen-pixel value and remains zoom-invariant (CURS-L2-001 / ADR-004). Undoable.
 * No-op when the target is not a rounded box or the bounds are unchanged.
 *
 * @param boxId - The rounded box to resize.
 * @param patch - The new value for any subset of the four edges.
 * @returns A resize-rounded-box command.
 */
export function resizeRoundedBoxCommand(
  boxId: string,
  patch: RoundedBoxRectPatch,
): ScheduleCommand {
  return {
    label: 'resize-rounded-box',
    execute: (scheduleDocument) =>
      mapAnnotations(scheduleDocument, (annotation) => {
        if (annotation.id !== boxId || annotation.annotationKind !== 'rounded-box') {
          return annotation;
        }
        const nextStart = patch.startDate ?? annotation.startDate;
        const nextEnd = patch.endDate ?? annotation.endDate;
        const nextTop = patch.topRowIndex ?? annotation.topRowIndex;
        const nextBottom = patch.bottomRowIndex ?? annotation.bottomRowIndex;

        // Normalize so a handle dragged past the opposite edge flips cleanly.
        const [startDate, endDate] =
          toDayNumber(nextStart) <= toDayNumber(nextEnd)
            ? [nextStart, nextEnd]
            : [nextEnd, nextStart];
        const topRowIndex = Math.max(0, Math.min(nextTop, nextBottom));
        const bottomRowIndex = Math.max(0, Math.max(nextTop, nextBottom));

        if (
          startDate === annotation.startDate &&
          endDate === annotation.endDate &&
          topRowIndex === annotation.topRowIndex &&
          bottomRowIndex === annotation.bottomRowIndex
        ) {
          return annotation; // unchanged: no-op (no history entry).
        }
        return { ...annotation, startDate, endDate, topRowIndex, bottomRowIndex };
      }),
  };
}

/**
 * Command: delete an annotation by id (TOOL-L1-004). No-op when absent.
 *
 * @param annotationId - The annotation id to remove.
 * @returns A delete-annotation command.
 */
export function deleteAnnotationCommand(annotationId: string): ScheduleCommand {
  return {
    label: 'delete-annotation',
    execute: (scheduleDocument) => {
      const existing = scheduleDocument.annotations ?? [];
      const annotations = existing.filter((annotation) => annotation.id !== annotationId);
      return annotations.length === existing.length ? scheduleDocument : { ...scheduleDocument, annotations };
    },
  };
}

/**
 * Command: delete EVERY annotation whose id is in a set (CR-007 Part 4: Delete on a
 * multi-selection that includes comments). Undoable; a no-op (same document
 * reference) when none of the ids match.
 *
 * @param annotationIds - The annotation ids to remove.
 * @returns A delete-annotations command.
 */
export function deleteAnnotationsCommand(annotationIds: ReadonlySet<string>): ScheduleCommand {
  return {
    label: 'delete-annotations',
    execute: (scheduleDocument) => {
      const existing = scheduleDocument.annotations ?? [];
      const annotations = existing.filter((annotation) => !annotationIds.has(annotation.id));
      return annotations.length === existing.length ? scheduleDocument : { ...scheduleDocument, annotations };
    },
  };
}

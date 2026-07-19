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

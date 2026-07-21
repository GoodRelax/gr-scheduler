/**
 * UseCase layer: pure selection-set math (CR-007 Part 1 + Part 4).
 *
 * The editing controller holds a flat set of selected ids that may mix ITEM ids
 * and COMMENT (annotation) ids -- both are selectable targets (Part 4). These pure
 * helpers keep the membership arithmetic (PowerPoint-style Ctrl+click add/remove,
 * marquee composition, select-all) out of the DOM-wired controller so it is unit
 * testable under node (no jsdom).
 *
 * Pure and side-effect free.
 */

import type { ScheduleDocument } from '../model/schedule-model.js';
import { isComment } from '../model/annotation.js';

/**
 * Toggle one id's membership in a selection set (CR-007 Part 1, D-6). A Ctrl+click
 * on an item that is NOT selected adds it; a Ctrl+click on an item that IS selected
 * removes it. Returns a NEW set (the input is never mutated) so the caller can
 * publish it immutably.
 *
 * @param current - The current selection.
 * @param id - The clicked target id (item or comment).
 * @returns The next selection with `id` toggled.
 */
export function toggleSelectionMembership(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

/**
 * Compose a marquee (rubber-band) result with an existing selection (CR-007 Part
 * 1). A plain marquee REPLACES the selection with the framed ids; an additive
 * marquee (or one meant to correct a prior rubber-band) UNIONS them, so the framed
 * set can still be trimmed afterwards by Ctrl+click. Returns a new set.
 *
 * @param current - The current selection.
 * @param framedIds - Ids the marquee rectangle enclosed.
 * @param additive - True to union with the current selection, false to replace.
 * @returns The next selection.
 */
export function composeMarqueeSelection(
  current: ReadonlySet<string>,
  framedIds: Iterable<string>,
  additive: boolean,
): Set<string> {
  if (!additive) {
    return new Set(framedIds);
  }
  const next = new Set(current);
  for (const id of framedIds) {
    next.add(id);
  }
  return next;
}

/** The distinct ids of every COMMENT annotation in the document (Part 4). */
export function commentIdsOf(scheduleDocument: ScheduleDocument): string[] {
  return (scheduleDocument.annotations ?? [])
    .filter((annotation) => isComment(annotation))
    .map((annotation) => annotation.id);
}

/**
 * The set of COMMENT ids that should show a selection highlight (CR-007 Part 4,
 * M2): every comment whose id is in the flat selection set, PLUS the singly-selected
 * annotation when it is a comment. So a multi-select (Ctrl+A / marquee / Ctrl+click)
 * highlights every selected comment, not just one.
 *
 * @param scheduleDocument - The document (source of which ids are comments).
 * @param selectedIds - The flat selection set (mixes item + comment ids).
 * @param selectedAnnotationId - The singly-selected annotation id, or null.
 * @returns The comment ids to draw a selection outline for.
 */
export function selectedCommentIds(
  scheduleDocument: ScheduleDocument,
  selectedIds: ReadonlySet<string>,
  selectedAnnotationId: string | null,
): Set<string> {
  const highlighted = new Set<string>();
  for (const annotation of scheduleDocument.annotations ?? []) {
    if (!isComment(annotation)) {
      continue;
    }
    if (selectedIds.has(annotation.id) || annotation.id === selectedAnnotationId) {
      highlighted.add(annotation.id);
    }
  }
  return highlighted;
}

/** The item ids AND comment ids that a select-all should cover (Part 4). */
export interface SelectableIds {
  readonly itemIds: string[];
  readonly commentIds: string[];
  /** The union of item + comment ids (what Ctrl+A selects). */
  readonly all: Set<string>;
}

/**
 * Every selectable target id in the document: all items AND all comments
 * (CR-007 Part 4). Ctrl+A selects the union, so comments join items in the
 * selection model (which Part 1 Ctrl+click can then trim).
 *
 * @param scheduleDocument - The document to scan.
 * @returns The item ids, comment ids and their union.
 */
export function collectSelectableIds(scheduleDocument: ScheduleDocument): SelectableIds {
  const itemIds = scheduleDocument.items.map((item) => item.id);
  const commentIds = commentIdsOf(scheduleDocument);
  return { itemIds, commentIds, all: new Set<string>([...itemIds, ...commentIds]) };
}

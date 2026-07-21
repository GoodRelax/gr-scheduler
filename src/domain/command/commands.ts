/**
 * UseCase layer: edit commands (ARCH-C-019, ADR-002). Every edit is expressed as
 * a pure, side-effect-free transform `ScheduleDocument -> ScheduleDocument`, so
 * the store can snapshot state before/after for Undo/Redo (TOOL-L1-004) and the
 * editing controller can reuse the exact same transform for live drag previews.
 *
 * Commands operate in domain units (whole days, row ids, property values), never
 * in pixels. Pixel<->day conversion belongs to the adapter that dispatches the
 * command, keeping this layer independent of the renderer (DIP).
 */

import type {
  AnchorIndex,
  DeclaredCategory,
  Dependency,
  IconShapeKind,
  IsoDate,
  LabelOffset,
  LabelPosition,
  LineWeight,
  MilestoneShape,
  ScheduleDocument,
  ScheduleItem,
  TaskShape,
} from '../model/schedule-model.js';
import { fromDayNumber, toDayNumber } from '../usecase/time-coordinate-mapper.js';
import { clampFadeDays } from '../usecase/fade-geometry.js';
import {
  moveSectionToIndex,
  sectionsInOrder,
  setSectionCollapsed,
} from '../usecase/section-organizer.js';
import {
  appendDeclaredCategory,
  copyClassificationSubtree,
  declaredCategoryDepth,
  existingMajorNames,
  existingMiddleNames,
  existingMinorNames,
  nextDefaultCategoryName,
  removeDeclaredSubtree,
  reorderCategoryNodeStates,
  revealDescendants,
  setCategoryNodeHidden,
  type CategoryMoveDirection,
} from '../usecase/classification-tree.js';
import {
  applyAdjacentSiblingMove,
  type AdjacentSiblingMove,
} from '../usecase/multi-item-move.js';

/** A named, reversible-by-snapshot edit transform over a schedule document. */
export interface ScheduleCommand {
  /** Stable, domain-qualified label for diagnostics/history (e.g. "move-item"). */
  readonly label: string;
  /**
   * Produce the next document. Must be pure: no mutation of `document`, no I/O.
   *
   * @param scheduleDocument - The current immutable document.
   * @returns The next immutable document (a new object graph for changed parts).
   */
  execute(scheduleDocument: ScheduleDocument): ScheduleDocument;
}

/**
 * The subset of item fields the property panel may edit in one patch. Only
 * defined keys are applied; omit a key to leave it unchanged (this matters under
 * exactOptionalPropertyTypes).
 */
export interface ItemPropertyPatch {
  readonly abbrev?: string;
  readonly startDate?: IsoDate;
  readonly endDate?: IsoDate | null;
  /** Actual (as-run) start date (CR-001 Part A); empty clears it. */
  readonly actualStart?: IsoDate;
  /** Actual (as-run) end date (CR-001 Part A); null for a milestone, empty clears it. */
  readonly actualEnd?: IsoDate | null;
  /** Deadline / target-end marker date (CR-001 Part C). */
  readonly targetDate?: IsoDate;
  /** Progress front fraction in [0, 1] (PLAN-L2-001 illuminated-line input). */
  readonly progressRatio?: number;
  /** Left-edge taper of a task bar in days (clamped; tasks only). */
  readonly fadeInDays?: number;
  /** Right-edge taper of a task bar in days (clamped; tasks only). */
  readonly fadeOutDays?: number;
  readonly fullName?: string;
  readonly description?: string;
  readonly majorCategory?: string;
  readonly middleCategory?: string;
  readonly minorCategory?: string;
  readonly assignee?: string;
  readonly status?: string;
  readonly remarks?: string;
  readonly lineWeight?: LineWeight;
  readonly labelPosition?: LabelPosition;
  /** Unified glyph shape (PROP `icon_shape_kind`); drives rendering (item 4). */
  readonly iconShapeKind?: IconShapeKind;
  /** Legacy task shape kept in sync with {@link iconShapeKind} on a task. */
  readonly taskShape?: TaskShape;
  /** Legacy milestone shape kept in sync with {@link iconShapeKind} on a milestone. */
  readonly milestoneShape?: MilestoneShape;
  readonly labelOffset?: LabelOffset;
  readonly strokeColor?: string;
  readonly fillColor?: string;
  /**
   * Marks {@link fillColor} as an explicit override of the plan/actual display
   * color (set together with `fillColor` by the property panel's fill control).
   */
  readonly fillColorExplicit?: boolean;
}

/**
 * Replace every item via `mapItem`. Returns the SAME document reference when no
 * item changed identity, so the store can treat the command as a no-op and skip
 * a spurious history entry.
 */
function mapItems(
  scheduleDocument: ScheduleDocument,
  mapItem: (item: ScheduleItem) => ScheduleItem,
): ScheduleDocument {
  let changed = false;
  const items = scheduleDocument.items.map((item) => {
    const mapped = mapItem(item);
    if (mapped !== item) {
      changed = true;
    }
    return mapped;
  });
  return changed ? { ...scheduleDocument, items } : scheduleDocument;
}

/** Shift an ISO date by a whole number of days. */
function shiftIsoDate(isoDate: IsoDate, deltaDays: number): IsoDate {
  return fromDayNumber(toDayNumber(isoDate) + deltaDays);
}

/**
 * Command: append a fully formed item to the document (ALIGN-L1-002, ITEM).
 *
 * @param item - The new item (its `id` must be unique within the document).
 * @returns A create command.
 */
export function createItemCommand(item: ScheduleItem): ScheduleCommand {
  return {
    label: 'create-item',
    execute: (scheduleDocument) => ({ ...scheduleDocument, items: [...scheduleDocument.items, item] }),
  };
}

/**
 * Command: move an item by a whole-day delta, optionally onto another row
 * (ALIGN-L1-003 bidirectional sync). Both start and (for tasks) end shift so the
 * duration is preserved.
 *
 * When a `targetCategory` is supplied the item is also re-classified onto that
 * leaf of the derived tree (the model-first way to move between rows now that
 * rows are derived from categories); `targetRowId` remains supported for the
 * legacy row-keyed path.
 *
 * @param itemId - The item to move.
 * @param deltaDays - Signed day offset applied to start and end.
 * @param targetRowId - Optional new owning row id (legacy row-keyed move).
 * @param targetCategory - Optional destination classification path.
 * @returns A move command.
 */
export function moveItemCommand(
  itemId: string,
  deltaDays: number,
  targetRowId?: string,
  targetCategory?: ClassificationTarget,
): ScheduleCommand {
  return {
    label: 'move-item',
    execute: (scheduleDocument) =>
      mapItems(scheduleDocument, (item) => {
        if (item.id !== itemId) {
          return item;
        }
        const moved: ScheduleItem = {
          ...item,
          startDate: shiftIsoDate(item.startDate, deltaDays),
          endDate: item.endDate === null ? null : shiftIsoDate(item.endDate, deltaDays),
        };
        if (targetCategory !== undefined) {
          return applyClassificationTarget(moved, targetCategory);
        }
        return targetRowId === undefined ? moved : { ...moved, rowId: targetRowId };
      }),
  };
}

/**
 * A target classification path for a vertical (re-classify) move. `major` is
 * required; omitting `middle` clears both middle and minor (major-level lane),
 * and omitting `minor` clears minor (middle-level lane). Mirrors the derived
 * classification tree's leaf-row paths.
 */
export interface ClassificationTarget {
  readonly major: string;
  readonly middle?: string;
  readonly minor?: string;
}

/**
 * Apply a classification target to an item, clearing deeper unset components. An
 * empty string clears a category (the derivation treats blank as "no category"),
 * which keeps the assignment type-safe under exactOptionalPropertyTypes.
 */
function applyClassificationTarget(item: ScheduleItem, target: ClassificationTarget): ScheduleItem {
  const middle = target.middle ?? '';
  const minor = target.middle === undefined ? '' : target.minor ?? '';
  return {
    ...item,
    majorCategory: target.major,
    middleCategory: middle,
    minorCategory: minor,
  };
}

/**
 * Command: re-classify one item onto a new leaf of the classification tree
 * (vertical move via drag / keyboard), replacing its major/middle/minor path.
 *
 * @param itemId - The item to re-classify.
 * @param target - The destination classification path.
 * @returns A reclassify-item command.
 */
export function reclassifyItemCommand(itemId: string, target: ClassificationTarget): ScheduleCommand {
  return {
    label: 'reclassify-item',
    execute: (scheduleDocument) =>
      mapItems(scheduleDocument, (item) =>
        item.id === itemId ? applyClassificationTarget(item, target) : item,
      ),
  };
}

/**
 * Command: shift EVERY item in a set by the same whole-day delta (CR-007 Part 2a,
 * horizontal multi-move). Start and (for tasks) end both shift so each duration is
 * preserved. A no-op (same document reference) for a zero delta or when no listed
 * item exists, so it adds no spurious history entry.
 *
 * @param itemIds - The selected item ids to shift together.
 * @param deltaDays - Signed whole-day offset applied to all of them.
 * @returns A bulk-shift-items command.
 */
export function bulkShiftItemsCommand(
  itemIds: ReadonlySet<string>,
  deltaDays: number,
): ScheduleCommand {
  return {
    label: 'bulk-shift-items',
    execute: (scheduleDocument) => {
      if (deltaDays === 0) {
        return scheduleDocument;
      }
      return mapItems(scheduleDocument, (item) =>
        itemIds.has(item.id)
          ? {
              ...item,
              startDate: shiftIsoDate(item.startDate, deltaDays),
              endDate: item.endDate === null ? null : shiftIsoDate(item.endDate, deltaDays),
            }
          : item,
      );
    },
  };
}

/**
 * Command: reassign EVERY item in a set onto the adjacent classification sibling
 * resolved for a vertical multi-move (CR-007 Part 2b, D-5). Only the reassigned
 * level's category changes on each item; the store's classification rebuild then
 * re-derives their `rowId`. A no-op (same document reference) when nothing changed.
 *
 * @param itemIds - The selected item ids to reassign together.
 * @param move - The resolved adjacent-sibling reassignment.
 * @returns A bulk-reassign-classification command.
 */
export function bulkReassignClassificationCommand(
  itemIds: ReadonlySet<string>,
  move: AdjacentSiblingMove,
): ScheduleCommand {
  return {
    label: 'bulk-reassign-classification',
    execute: (scheduleDocument) =>
      mapItems(scheduleDocument, (item) =>
        itemIds.has(item.id) ? applyAdjacentSiblingMove(item, move) : item,
      ),
  };
}

/** Which edge of a task bar a resize acts on. */
export type ResizeEdge = 'start' | 'end';

/**
 * Command: resize a task by dragging one edge (ALIGN-L1-002). The opposite edge
 * stays fixed; the moving edge is clamped so the task keeps a non-negative
 * duration (minimum one day). No-op for milestones (they have no end).
 *
 * @param itemId - The task to resize.
 * @param edge - Which edge is being dragged.
 * @param deltaDays - Signed day offset applied to the dragged edge.
 * @returns A resize command.
 */
export function resizeItemCommand(
  itemId: string,
  edge: ResizeEdge,
  deltaDays: number,
): ScheduleCommand {
  return {
    label: 'resize-item',
    execute: (scheduleDocument) =>
      mapItems(scheduleDocument, (item) => {
        if (item.id !== itemId || item.endDate === null) {
          return item;
        }
        const startDay = toDayNumber(item.startDate);
        const endDay = toDayNumber(item.endDate);
        if (edge === 'start') {
          const nextStart = Math.min(startDay + deltaDays, endDay - 1);
          return normalizeItemFade({ ...item, startDate: fromDayNumber(nextStart) });
        }
        const nextEnd = Math.max(endDay + deltaDays, startDay + 1);
        return normalizeItemFade({ ...item, endDate: fromDayNumber(nextEnd) });
      }),
  };
}

/**
 * Sanitize a property patch against an item's kind so a milestone can never gain
 * a non-null `endDate` (M-03 invariant: `itemKind === 'milestone'` implies
 * `endDate === null`). The `endDate` key is dropped for milestones regardless of
 * the requested value.
 */
function sanitizePatchForKind(item: ScheduleItem, patch: ItemPropertyPatch): ItemPropertyPatch {
  if (item.itemKind !== 'milestone') {
    return patch;
  }
  // A milestone has no span, so it can gain neither an `endDate` nor a fade taper
  // (M-03 invariant + fade is tasks-only), and its actual end is always null (a point
  // has no actual span, CR-001 Part A). Drop those keys regardless of request.
  const {
    endDate: _endDate,
    actualEnd: _actualEnd,
    fadeInDays: _fadeIn,
    fadeOutDays: _fadeOut,
    ...rest
  } = patch;
  return rest;
}

/**
 * Clamp a task's fade taper so `fadeInDays + fadeOutDays` never exceeds its day
 * length and neither side is negative (the top edge can never cross the bottom).
 * Returns the SAME reference when nothing changed. A no-op for milestones and for
 * tasks that carry no fade at all, so untouched items keep their identity.
 */
function normalizeItemFade(item: ScheduleItem): ScheduleItem {
  const fadeIn = item.fadeInDays;
  const fadeOut = item.fadeOutDays;
  if (fadeIn === undefined && fadeOut === undefined) {
    return item;
  }
  if (item.itemKind !== 'task' || item.endDate === null) {
    return item;
  }
  const lengthDays = toDayNumber(item.endDate) - toDayNumber(item.startDate);
  const clamped = clampFadeDays(lengthDays, fadeIn ?? 0, fadeOut ?? 0);
  const nextIn = Math.round(clamped.fadeInDays);
  const nextOut = Math.round(clamped.fadeOutDays);
  if (nextIn === (fadeIn ?? 0) && nextOut === (fadeOut ?? 0)) {
    return item;
  }
  return { ...item, fadeInDays: nextIn, fadeOutDays: nextOut };
}

/**
 * Apply a kind-sanitized patch to an item, returning the SAME reference when the
 * effective change is a no-op (M-01: every patched key already equals its current
 * value), so the store skips a spurious undo entry.
 */
function applyItemPatch(item: ScheduleItem, patch: ItemPropertyPatch): ScheduleItem {
  const sanitized = sanitizePatchForKind(item, patch);
  const currentValues = item as unknown as Record<string, unknown>;
  let changed = false;
  for (const key of Object.keys(sanitized)) {
    if (currentValues[key] !== (sanitized as Record<string, unknown>)[key]) {
      changed = true;
      break;
    }
  }
  return changed ? { ...item, ...sanitized } : item;
}

/**
 * Command: apply a property patch to one item (PROP-L1-001, ALIGN-L1-003).
 * Editing `startDate`/`endDate` here is the reverse direction of the bidirectional
 * sync: the model changes and the renderer follows on the next render. A patch
 * whose values all equal the current ones is a no-op (adds no history, M-01), and
 * `endDate` is never applied to a milestone (M-03).
 *
 * @param itemId - The item to edit.
 * @param patch - Defined-only field changes.
 * @returns An edit-property command.
 */
export function editPropertyCommand(itemId: string, patch: ItemPropertyPatch): ScheduleCommand {
  return {
    label: 'edit-property',
    execute: (scheduleDocument) =>
      mapItems(scheduleDocument, (item) =>
        item.id === itemId ? normalizeItemFade(applyItemPatch(item, patch)) : item,
      ),
  };
}

/**
 * Command: delete a set of items (TOOL-L1-004 delete, TOOL-L1-005 Delete key).
 *
 * @param itemIds - Ids to remove.
 * @returns A delete command.
 */
export function deleteItemsCommand(itemIds: ReadonlySet<string>): ScheduleCommand {
  return {
    label: 'delete-items',
    execute: (scheduleDocument) => {
      const items = scheduleDocument.items.filter((item) => !itemIds.has(item.id));
      return items.length === scheduleDocument.items.length ? scheduleDocument : { ...scheduleDocument, items };
    },
  };
}

/**
 * Command: delete a MIXED selection of items AND comment annotations in ONE
 * undoable step (CR-007 Part 4: Ctrl+A then Delete clears both). Removes every item
 * and every annotation whose id is in the set; a no-op (same document reference)
 * when nothing matched. The `annotations` key is only rewritten when an annotation
 * was actually removed, so an item-only delete keeps the annotation array identity.
 *
 * @param ids - The selected ids (may mix item ids and comment ids).
 * @returns A delete-selection command.
 */
export function deleteSelectedTargetsCommand(ids: ReadonlySet<string>): ScheduleCommand {
  return {
    label: 'delete-selection',
    execute: (scheduleDocument) => {
      const items = scheduleDocument.items.filter((item) => !ids.has(item.id));
      const existingAnnotations = scheduleDocument.annotations ?? [];
      const annotations = existingAnnotations.filter((annotation) => !ids.has(annotation.id));
      const itemsChanged = items.length !== scheduleDocument.items.length;
      const annotationsChanged = annotations.length !== existingAnnotations.length;
      if (!itemsChanged && !annotationsChanged) {
        return scheduleDocument;
      }
      return {
        ...scheduleDocument,
        ...(itemsChanged ? { items } : {}),
        ...(annotationsChanged ? { annotations } : {}),
      };
    },
  };
}

/**
 * Command: paste (append) a set of already-cloned items (TOOL-L1-003). The
 * caller is responsible for assigning fresh ids and any offset.
 *
 * @param items - The cloned items to append.
 * @returns A paste command.
 */
export function pasteItemsCommand(items: readonly ScheduleItem[]): ScheduleCommand {
  return {
    label: 'paste-items',
    execute: (scheduleDocument) =>
      items.length === 0 ? scheduleDocument : { ...scheduleDocument, items: [...scheduleDocument.items, ...items] },
  };
}

/**
 * Command: reorder a section to a new position in the section order (SECT-L1-002,
 * ARCH-C-015). No-op (same document reference) when the section does not move.
 *
 * @param sectionId - The section being moved.
 * @param targetIndex - Destination index in the ordered section list.
 * @returns A reorder-section command.
 */
export function reorderSectionCommand(sectionId: string, targetIndex: number): ScheduleCommand {
  return {
    label: 'reorder-section',
    execute: (scheduleDocument) => {
      const sections = moveSectionToIndex(scheduleDocument.sections, sectionId, targetIndex);
      return sectionsEqualByOrder(sections, scheduleDocument.sections)
        ? scheduleDocument
        : { ...scheduleDocument, sections };
    },
  };
}

/**
 * Command: show or hide (collapse) a section (SECT-L1-003, ARCH-C-015). Hidden
 * sections' rows are dropped from layout by the organizer; re-showing brings them
 * back at their original order position. No-op when already in that state.
 *
 * @param sectionId - The section to toggle.
 * @param collapsed - True to hide, false to show.
 * @returns A set-section-collapsed command.
 */
export function setSectionCollapsedCommand(
  sectionId: string,
  collapsed: boolean,
): ScheduleCommand {
  return {
    label: 'set-section-collapsed',
    execute: (scheduleDocument) => {
      const sections = setSectionCollapsed(scheduleDocument.sections, sectionId, collapsed);
      return sections === scheduleDocument.sections
        ? scheduleDocument
        : { ...scheduleDocument, sections };
    },
  };
}

/**
 * Command: add a directed dependency between two items (DEP-L1-001). Ignored
 * (no-op) when the endpoints are the same item or an identical dependency
 * already exists.
 *
 * @param dependency - The dependency to add (its `id` should be unique).
 * @returns An add-dependency command.
 */
export function addDependencyCommand(dependency: Dependency): ScheduleCommand {
  return {
    label: 'add-dependency',
    execute: (scheduleDocument) => {
      if (dependency.fromItemId === dependency.toItemId) {
        return scheduleDocument;
      }
      const existing = scheduleDocument.dependencies ?? [];
      const duplicate = existing.some(
        (candidate) =>
          candidate.fromItemId === dependency.fromItemId &&
          candidate.toItemId === dependency.toItemId &&
          candidate.fromAnchor === dependency.fromAnchor &&
          candidate.toAnchor === dependency.toAnchor,
      );
      if (duplicate) {
        return scheduleDocument;
      }
      return { ...scheduleDocument, dependencies: [...existing, dependency] };
    },
  };
}

/**
 * Command: remove a dependency by id (DEP-L1-001). No-op when absent.
 *
 * @param dependencyId - The dependency id to remove.
 * @returns A remove-dependency command.
 */
export function removeDependencyCommand(dependencyId: string): ScheduleCommand {
  return {
    label: 'remove-dependency',
    execute: (scheduleDocument) => {
      const existing = scheduleDocument.dependencies ?? [];
      const dependencies = existing.filter((candidate) => candidate.id !== dependencyId);
      return dependencies.length === existing.length
        ? scheduleDocument
        : { ...scheduleDocument, dependencies };
    },
  };
}

/**
 * Command: set (override) a dependency line's stroke color (item 1). Undoable; a
 * no-op (same document reference) when the color already matches or the id is
 * absent. Absent lines fall back to the yamabuki-gold default at render time.
 *
 * @param dependencyId - The dependency to recolor.
 * @param strokeColor - The new CSS color string.
 * @returns A set-dependency-color command.
 */
export function setDependencyColorCommand(
  dependencyId: string,
  strokeColor: string,
): ScheduleCommand {
  return {
    label: 'set-dependency-color',
    execute: (scheduleDocument) => {
      const existing = scheduleDocument.dependencies ?? [];
      let changed = false;
      const dependencies = existing.map((candidate) => {
        if (candidate.id !== dependencyId || candidate.strokeColor === strokeColor) {
          return candidate;
        }
        changed = true;
        return { ...candidate, strokeColor };
      });
      return changed ? { ...scheduleDocument, dependencies } : scheduleDocument;
    },
  };
}

/**
 * Command: apply a per-item dependency REWIRE as one undoable step (item 4). Removes
 * the listed edge ids and appends the given edges in a single history entry, so
 * setting an item's predecessor/successor comma-id list from the property panel is
 * one Undo. Appended edges are guarded exactly like {@link addDependencyCommand}:
 * self-edges and duplicates (same from/to/anchors) are skipped. A plan that changes
 * nothing returns the SAME document reference (no history entry).
 *
 * @param addEdges - Edges to append (each should carry a unique id).
 * @param removeEdgeIds - Edge ids to drop first.
 * @returns A rewire-dependencies command.
 */
export function rewireItemDependenciesCommand(
  addEdges: readonly Dependency[],
  removeEdgeIds: readonly string[],
): ScheduleCommand {
  return {
    label: 'rewire-dependencies',
    execute: (scheduleDocument) => {
      const removeSet = new Set(removeEdgeIds);
      const kept = (scheduleDocument.dependencies ?? []).filter((edge) => !removeSet.has(edge.id));
      const removedCount = (scheduleDocument.dependencies ?? []).length - kept.length;
      const next = [...kept];
      let addedCount = 0;
      for (const edge of addEdges) {
        if (edge.fromItemId === edge.toItemId) {
          continue;
        }
        const duplicate = next.some(
          (candidate) =>
            candidate.fromItemId === edge.fromItemId &&
            candidate.toItemId === edge.toItemId &&
            candidate.fromAnchor === edge.fromAnchor &&
            candidate.toAnchor === edge.toAnchor,
        );
        if (duplicate) {
          continue;
        }
        next.push(edge);
        addedCount += 1;
      }
      if (removedCount === 0 && addedCount === 0) {
        return scheduleDocument;
      }
      return { ...scheduleDocument, dependencies: next };
    },
  };
}

/** Trimmed non-empty string, or undefined (mirrors the classification derivation). */
function nonEmptyCategory(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Command: add a new SECTION (major) as a declared, initially EMPTY branch named
 * with the next free `NoneN` in the document's section scope (SECT editing rework
 * req 1 + 4). The tree renders it immediately (via the declared-node reconciler)
 * so the user can create items into it; fully undoable.
 *
 * @returns An add-section command.
 */
export function addSectionCommand(): ScheduleCommand {
  return {
    label: 'add-section',
    execute: (scheduleDocument) => {
      const name = nextDefaultCategoryName(existingMajorNames(scheduleDocument));
      const declaredCategories = appendDeclaredCategory(scheduleDocument.declaredCategories, {
        major: name,
      });
      return declaredCategories === scheduleDocument.declaredCategories
        ? scheduleDocument
        : { ...scheduleDocument, declaredCategories };
    },
  };
}

/**
 * Command: add a sub-category under an existing branch as a declared, empty node
 * named with the next free `NoneN` in the PARENT scope (SECT editing rework req 3
 * + 4). Passing only `{ major }` adds a TRACK (middle) under that section; passing
 * `{ major, middle }` adds a DETAIL (minor) under that track. Fully undoable.
 *
 * @param parent - The parent branch: a section (`major`) or a track (`major` + `middle`).
 * @returns An add-subcategory command.
 */
export function addSubcategoryCommand(parent: { major: string; middle?: string }): ScheduleCommand {
  return {
    label: 'add-subcategory',
    execute: (scheduleDocument) => {
      const major = nonEmptyCategory(parent.major);
      if (major === undefined) {
        return scheduleDocument;
      }
      const parentMiddle = nonEmptyCategory(parent.middle);
      const node: DeclaredCategory =
        parentMiddle === undefined
          ? { major, middle: nextDefaultCategoryName(existingMiddleNames(scheduleDocument, major)) }
          : {
              major,
              middle: parentMiddle,
              minor: nextDefaultCategoryName(existingMinorNames(scheduleDocument, major, parentMiddle)),
            };
      const declaredCategories = appendDeclaredCategory(scheduleDocument.declaredCategories, node);
      return declaredCategories === scheduleDocument.declaredCategories
        ? scheduleDocument
        : { ...scheduleDocument, declaredCategories };
    },
  };
}

/** The first section major that is NOT `excludeMajor`, in section order, or null. */
function firstOtherMajor(scheduleDocument: ScheduleDocument, excludeMajor: string): string | null {
  for (const section of sectionsInOrder(scheduleDocument.sections)) {
    if (section.name !== excludeMajor) {
      return section.name;
    }
  }
  return null;
}

/**
 * Command: remove a declared classification branch (section / track / detail) and
 * all its declared descendants, reclassifying any items still under it UP to the
 * parent level rather than deleting item data (SECT editing rework req 2):
 *
 * - remove a DETAIL (minor) -> its items lose `minor` and sit on the track;
 * - remove a TRACK (middle) -> its items lose `middle`/`minor` and sit on the section;
 * - remove a SECTION (major) -> its items are absorbed into a sibling section (at
 *   that section's major level), so no item data is lost. This is REFUSED (no-op)
 *   when the section still has items and no sibling exists, preserving the
 *   major-required invariant (an item can never be left without a section).
 *
 * Fully undoable. A branch that neither is declared nor has any items is a no-op.
 *
 * @param node - The branch to remove; its set path components fix its depth.
 * @returns A remove-classification-node command.
 */
export function removeClassificationNodeCommand(node: DeclaredCategory): ScheduleCommand {
  return {
    label: 'remove-classification-node',
    execute: (scheduleDocument) => {
      const major = nonEmptyCategory(node.major);
      if (major === undefined) {
        return scheduleDocument;
      }
      const depth = declaredCategoryDepth(node);
      const middle = nonEmptyCategory(node.middle);
      const minor = nonEmptyCategory(node.minor);

      // Resolve where surviving items go. For a section this is a sibling major; a
      // section with items but no sibling cannot be removed (major-required).
      let absorbMajor: string | null = null;
      if (depth === 0) {
        const hasItems = scheduleDocument.items.some((item) => nonEmptyCategory(item.majorCategory) === major);
        if (hasItems) {
          absorbMajor = firstOtherMajor(scheduleDocument, major);
          if (absorbMajor === null) {
            return scheduleDocument; // refuse: would orphan items (no section to hold them)
          }
        }
      }

      const reclassified = mapItems(scheduleDocument, (item) => {
        if (nonEmptyCategory(item.majorCategory) !== major) {
          return item;
        }
        if (depth === 0) {
          return absorbMajor === null
            ? item
            : { ...item, majorCategory: absorbMajor, middleCategory: '', minorCategory: '' };
        }
        if (nonEmptyCategory(item.middleCategory) !== middle) {
          return item;
        }
        if (depth === 1) {
          return { ...item, middleCategory: '', minorCategory: '' };
        }
        if (nonEmptyCategory(item.minorCategory) !== minor) {
          return item;
        }
        return { ...item, minorCategory: '' };
      });

      const declaredCategories = removeDeclaredSubtree(reclassified.declaredCategories, node);
      if (reclassified === scheduleDocument && declaredCategories === scheduleDocument.declaredCategories) {
        return scheduleDocument;
      }
      return declaredCategories === reclassified.declaredCategories
        ? reclassified
        : { ...reclassified, declaredCategories };
    },
  };
}

/**
 * Command: reorder a MIDDLE / MINOR node one step among its siblings within the
 * same parent (CLASSIFICATION-PANE restructure req 1). Writes a dense `sortIndex`
 * to every sibling so the derived tree (and thus the canvas row order) follows.
 * No-op (same document reference) when the node is already at that boundary.
 *
 * Major reorder keeps using {@link reorderSectionCommand}; this covers the two
 * derived levels that have no `Section.order` of their own.
 *
 * @param node - The middle (`{ major, middle }`) or minor (`{ major, middle, minor }`) node.
 * @param direction - `'up'` or `'down'`.
 * @returns A reorder-category-node command.
 */
export function reorderCategoryNodeCommand(
  node: DeclaredCategory,
  direction: CategoryMoveDirection,
): ScheduleCommand {
  return {
    label: 'reorder-category-node',
    execute: (scheduleDocument) => {
      const classificationNodeStates = reorderCategoryNodeStates(scheduleDocument, node, direction);
      return classificationNodeStates === null
        ? scheduleDocument
        : { ...scheduleDocument, classificationNodeStates };
    },
  };
}

/**
 * Command: hide or reveal a MIDDLE / MINOR node and its subtree
 * (CLASSIFICATION-PANE restructure req 2). A hidden node's rows are dropped from
 * the derived tree, so its items get no placement on the canvas (mirroring a
 * collapsed section, but per node). Undoable; round-trips via JSON. No-op when the
 * node is already in that state. Major hide keeps using
 * {@link setSectionCollapsedCommand}.
 *
 * @param node - The middle / minor node path.
 * @param hidden - True to hide, false to reveal just this node.
 * @returns A set-category-node-hidden command.
 */
export function setCategoryNodeHiddenCommand(
  node: DeclaredCategory,
  hidden: boolean,
): ScheduleCommand {
  return {
    label: 'set-category-node-hidden',
    execute: (scheduleDocument) => {
      const classificationNodeStates = setCategoryNodeHidden(
        scheduleDocument.classificationNodeStates,
        node,
        hidden,
      );
      return classificationNodeStates === scheduleDocument.classificationNodeStates
        ? scheduleDocument
        : { ...scheduleDocument, classificationNodeStates };
    },
  };
}

/**
 * Command: reveal ALL hidden descendants under a node at once (the pane's `□`
 * show-all, CLASSIFICATION-PANE restructure req 2). For a MAJOR this also un-hides
 * the section itself (clears {@link Section.collapsed}) so a fully hidden section
 * can be brought back, then reveals its tracks / details. No-op when nothing under
 * the node was hidden.
 *
 * @param node - The subtree root (`{ major }`, `{ major, middle }`, ...).
 * @returns A reveal-descendants command.
 */
export function revealDescendantsCommand(node: DeclaredCategory): ScheduleCommand {
  return {
    label: 'reveal-descendants',
    execute: (scheduleDocument) => {
      const major = nonEmptyCategory(node.major);
      if (major === undefined) {
        return scheduleDocument;
      }
      const classificationNodeStates = revealDescendants(scheduleDocument.classificationNodeStates, node);
      const isMajor = declaredCategoryDepth(node) === 0;
      const sections = isMajor
        ? setSectionCollapsedByName(scheduleDocument.sections, major, false)
        : scheduleDocument.sections;
      if (
        classificationNodeStates === scheduleDocument.classificationNodeStates &&
        sections === scheduleDocument.sections
      ) {
        return scheduleDocument;
      }
      return { ...scheduleDocument, classificationNodeStates, sections };
    },
  };
}

/**
 * Command: copy-paste a MAJOR / MIDDLE classification node per CR-007 Part 5. The
 * copy is named with a numeric suffix (`Body` -> `Body-1`), pasted as the next
 * sibling with its child rows + items cloned (fresh ids, categories remapped), and
 * its dependencies handled per D-4 (internal edges reproduced with remapped ids,
 * boundary-crossing edges dropped). Fully undoable. No-op when nothing to copy.
 *
 * @param node - The subtree root to copy (`{ major }` or `{ major, middle }`).
 * @returns A copy-classification command.
 */
export function copyClassificationCommand(node: DeclaredCategory): ScheduleCommand {
  return {
    label: 'copy-classification',
    execute: (scheduleDocument) => copyClassificationSubtree(scheduleDocument, node),
  };
}

/** Set a section's collapsed flag by its major NAME (used by major show-all). */
function setSectionCollapsedByName(
  sections: readonly ScheduleDocument['sections'][number][],
  major: string,
  collapsed: boolean,
): readonly ScheduleDocument['sections'][number][] {
  let changed = false;
  const next = sections.map((section) => {
    if (section.name !== major || (section.collapsed === true) === collapsed) {
      return section;
    }
    changed = true;
    return { ...section, collapsed };
  });
  return changed ? next : sections;
}

/** True when two section arrays have identical (id -> order) pairings. */
function sectionsEqualByOrder(
  left: readonly { id: string; order: number }[],
  right: readonly { id: string; order: number }[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightOrderById = new Map(right.map((section) => [section.id, section.order]));
  return left.every((section) => rightOrderById.get(section.id) === section.order);
}

/** Re-export the anchor index type for command callers building dependencies. */
export type { AnchorIndex };

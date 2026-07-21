/**
 * UseCase layer: pure multi-item vertical-move resolution (CR-007 Part 2, D-5).
 *
 * When several items are selected and dragged VERTICALLY, they are reassigned to
 * the ADJACENT sibling at the DEEPEST classification level the whole selection
 * shares (ALIGN-L1-002 extended to multi-select):
 *
 * - the selection shares only `major`            -> move to the adjacent SECTION (major);
 * - it shares `major` + `middle`                 -> adjacent TRACK (middle) in the same major;
 * - it shares `major` + `middle` + `minor`       -> adjacent DETAIL (minor) in the same track.
 *
 * Higher levels stay fixed; only the reassigned level's category changes (the
 * store's classification rebuild then re-derives each item's `rowId`), so the
 * hierarchy structure is unchanged -- no new rows or items. At a tree edge (no
 * adjacent sibling in the drag direction) the move is a silent no-op (D-5).
 *
 * Horizontal multi-move is a pure whole-day shift of every selected item and lives
 * as a command (`bulkShiftItemsCommand`); this module owns the harder vertical
 * (re-classify) resolution.
 *
 * Pure and side-effect free.
 */

import type { ScheduleDocument, ScheduleItem } from '../model/schedule-model.js';
import { sectionsInOrder } from './section-organizer.js';
import { orderedMiddlesUnderMajor, orderedMinorsUnderMiddle } from './classification-tree.js';

/** The classification level a vertical multi-move reassigns. */
export type ClassificationLevel = 'major' | 'middle' | 'minor';

/** A one-step vertical direction: `up` targets the previous sibling, `down` the next. */
export type VerticalMoveDirection = 'up' | 'down';

/** A trimmed non-empty string, or undefined (mirrors the classification derivation). */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The DEEPEST classification level every selected item shares, or `null` when the
 * items do not even share a `major` (nothing to move against). "Shares a level"
 * means every item has the SAME non-empty value at that level and at every level
 * above it.
 *
 * @param items - The selected items (already filtered to the selection).
 * @returns The deepest shared level, or null.
 */
export function deepestSharedClassificationLevel(
  items: readonly ScheduleItem[],
): ClassificationLevel | null {
  if (items.length === 0) {
    return null;
  }
  const first = items[0] as ScheduleItem;
  const major = nonEmpty(first.majorCategory);
  if (major === undefined || !items.every((item) => nonEmpty(item.majorCategory) === major)) {
    return null;
  }
  const middle = nonEmpty(first.middleCategory);
  if (middle === undefined || !items.every((item) => nonEmpty(item.middleCategory) === middle)) {
    return 'major';
  }
  const minor = nonEmpty(first.minorCategory);
  if (minor === undefined || !items.every((item) => nonEmpty(item.minorCategory) === minor)) {
    return 'middle';
  }
  return 'minor';
}

/** The reassignment a vertical multi-move resolves to (the level and its new value). */
export interface AdjacentSiblingMove {
  readonly level: ClassificationLevel;
  /** The shared value the selection currently sits at, at {@link level}. */
  readonly fromValue: string;
  /** The adjacent sibling value to reassign the selection onto. */
  readonly toValue: string;
  /** The owning major (fixed). */
  readonly major: string;
  /** The owning middle (fixed), present when reassigning at the minor level. */
  readonly middle?: string;
}

/** The sibling name one step from `current` in `direction`, or null at the edge. */
function adjacentSibling(
  siblings: readonly string[],
  current: string,
  direction: VerticalMoveDirection,
): string | null {
  const index = siblings.indexOf(current);
  if (index === -1) {
    return null;
  }
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return null;
  }
  return siblings[targetIndex] ?? null;
}

/**
 * Resolve a vertical multi-item move (CR-007 Part 2, D-5): find the deepest shared
 * level, then the adjacent sibling in the drag direction at that level. Returns
 * `null` (a silent no-op) when the selection shares no major, is empty, or is
 * already at the tree edge in that direction.
 *
 * @param scheduleDocument - The document (source of sibling order).
 * @param selectedItems - The selected items.
 * @param direction - `'up'` (previous sibling) or `'down'` (next sibling).
 * @returns The reassignment to apply, or null.
 */
export function resolveAdjacentSiblingMove(
  scheduleDocument: ScheduleDocument,
  selectedItems: readonly ScheduleItem[],
  direction: VerticalMoveDirection,
): AdjacentSiblingMove | null {
  const level = deepestSharedClassificationLevel(selectedItems);
  if (level === null) {
    return null;
  }
  const first = selectedItems[0] as ScheduleItem;
  const major = nonEmpty(first.majorCategory) as string;

  if (level === 'major') {
    const siblings = sectionsInOrder(scheduleDocument.sections).map((section) => section.name);
    const toValue = adjacentSibling(siblings, major, direction);
    return toValue === null ? null : { level, fromValue: major, toValue, major };
  }

  const middle = nonEmpty(first.middleCategory) as string;
  if (level === 'middle') {
    const siblings = orderedMiddlesUnderMajor(scheduleDocument, major);
    const toValue = adjacentSibling(siblings, middle, direction);
    return toValue === null ? null : { level, fromValue: middle, toValue, major };
  }

  const minor = nonEmpty(first.minorCategory) as string;
  const siblings = orderedMinorsUnderMiddle(scheduleDocument, major, middle);
  const toValue = adjacentSibling(siblings, minor, direction);
  return toValue === null ? null : { level, fromValue: minor, toValue, major, middle };
}

/**
 * Apply an {@link AdjacentSiblingMove} to one item's classification fields,
 * changing ONLY the reassigned level's category (higher levels stay fixed, deeper
 * levels are preserved). Returns the SAME reference when the item is unaffected.
 *
 * @param item - The item to reassign.
 * @param move - The resolved reassignment.
 * @returns The reassigned item (or the same reference when unchanged).
 */
export function applyAdjacentSiblingMove(item: ScheduleItem, move: AdjacentSiblingMove): ScheduleItem {
  if (move.level === 'major') {
    return item.majorCategory === move.toValue ? item : { ...item, majorCategory: move.toValue };
  }
  if (move.level === 'middle') {
    return item.middleCategory === move.toValue ? item : { ...item, middleCategory: move.toValue };
  }
  return item.minorCategory === move.toValue ? item : { ...item, minorCategory: move.toValue };
}

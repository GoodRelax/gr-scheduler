/**
 * UseCase layer: pure predicates for dependency-edge visibility.
 *
 * Under the actual-date model (CR-001 Part A) a single item carries BOTH its plan
 * span and its actual dates, so there is no cross-kind pairing to forbid: any two
 * items may be linked. Visibility of an edge is decided by whether both endpoints
 * exist and whether the SIDE the edge would anchor to is drawn under the current
 * plan/actual display filter (PLAN-L1-002):
 *
 * - `both` / `plan-only` draw every item's plan bar, so every existing edge renders.
 * - `actual-only` draws only items that HAVE actual dates, so an edge renders only
 *   when both endpoints record an actual side.
 * - `none` hides every edge.
 *
 * Shared by the link-pick controller, the dependency render layer and the dependency
 * hit-tester. Side-effect free.
 */

import type { Dependency, PlanActualDisplay, ScheduleItem } from '../model/schedule-model.js';
import { itemHasActualDates } from './progress-line-builder.js';

/**
 * Whether two items may be linked by a dependency edge.
 *
 * The actual-date model imposes NO linkable-kind constraint (the old plan<->actual
 * same-side rule keyed by the removed `planActualKind` is gone), so any two items
 * -- task or milestone -- may be linked.
 *
 * @param _from - The source item (unconstrained under the actual-date model).
 * @param _to - The target item (unconstrained under the actual-date model).
 * @returns Always true.
 */
export function sameLinkableKind(_from: ScheduleItem, _to: ScheduleItem): boolean {
  return true;
}

/**
 * Whether a given SIDE of an item is drawn under a plan/actual display filter.
 *
 * An item has a plan side (always) and, when it records actual dates, an actual
 * side. `plan-only` shows only the plan side; `actual-only` only the actual side;
 * `both`/undefined show either; `none` shows neither. A `undefined` side is a
 * side-agnostic query (visible unless the filter is `none`).
 *
 * @param planActualSide - Which side is being drawn (`'plan'` | `'actual'`), or
 *   `undefined` for a side-agnostic query.
 * @param display - The active plan/actual display filter.
 * @returns True when that side is visible.
 */
export function isItemVisibleUnderDisplay(
  planActualSide: 'plan' | 'actual' | undefined,
  display: PlanActualDisplay | undefined,
): boolean {
  const effectiveDisplay = display ?? 'both';
  if (effectiveDisplay === 'none') {
    return false;
  }
  if (effectiveDisplay === 'both' || planActualSide === undefined) {
    return true;
  }
  return effectiveDisplay === 'plan-only' ? planActualSide === 'plan' : planActualSide === 'actual';
}

/**
 * Whether a dependency edge should be DRAWN (and be hit-testable) under the current
 * items and display filter. False when an endpoint is missing or the filter hides
 * the side both endpoints would anchor to.
 *
 * Plan bars are drawn for every item under `both`/`plan-only`, so those edges render
 * whenever both endpoints exist. Under `actual-only` only items with actual dates are
 * drawn, so the edge renders only when both endpoints carry an actual side.
 *
 * @param dependency - The candidate edge.
 * @param itemById - Item lookup by id.
 * @param display - The active plan/actual display filter.
 * @returns True when the edge is renderable.
 */
export function isDependencyRenderable(
  dependency: Dependency,
  itemById: ReadonlyMap<string, ScheduleItem>,
  display: PlanActualDisplay | undefined,
): boolean {
  const from = itemById.get(dependency.fromItemId);
  const to = itemById.get(dependency.toItemId);
  if (from === undefined || to === undefined) {
    return false;
  }
  const effectiveDisplay = display ?? 'both';
  if (effectiveDisplay === 'none') {
    return false;
  }
  if (effectiveDisplay === 'actual-only') {
    // Only items whose actual side is drawn can anchor an edge under actual-only.
    return itemHasActualDates(from) && itemHasActualDates(to);
  }
  // both / plan-only: every item's plan bar is drawn.
  return true;
}

/**
 * UseCase layer: pure predicates for dependency-edge visibility.
 *
 * TODO(IM2): the old plan/actual link CONSTRAINT (an edge could connect only
 * plan->plan or actual->actual items, keyed by the removed `planActualKind`) no longer
 * applies -- the actual-date model carries plan AND actual on ONE item, so there is no
 * cross-kind pairing to forbid. This module is NEUTRALIZED accordingly: an edge is
 * renderable when both endpoints exist and are not hidden by the plan/actual display
 * filter. The endpoint-side visibility split (plan-only / actual-only) is likewise
 * deferred to IM2; for IM1 only `none` (hide all) suppresses edges.
 *
 * Shared by the link-pick controller, the dependency render layer and the dependency
 * hit-tester. Side-effect free.
 */

import type {
  Dependency,
  PlanActualDisplay,
  ScheduleItem,
} from '../model/schedule-model.js';

/**
 * Whether two items may be linked by a dependency edge.
 *
 * TODO(IM2): restore the plan/actual same-side constraint against the actual-date
 * model. For IM1 there is no per-item plan/actual discriminator, so any two items may
 * be linked.
 *
 * @param _from - The source item (unused until the IM2 constraint returns).
 * @param _to - The target item (unused until the IM2 constraint returns).
 * @returns Always true (IM1 neutralization).
 */
export function sameLinkableKind(_from: unknown, _to: unknown): boolean {
  return true;
}

/**
 * Whether an item is shown under a plan/actual display filter.
 *
 * TODO(IM2): honor the plan-only / actual-only sides against the actual-date model.
 * For IM1 an item is visible unless the filter is `none`.
 *
 * @param _planActualSide - Legacy per-item side ('plan' | 'actual'); ignored for IM1.
 * @param display - The active plan/actual display filter.
 * @returns True unless the filter is `none`.
 */
export function isItemVisibleUnderDisplay(
  _planActualSide: 'plan' | 'actual' | undefined,
  display: PlanActualDisplay | undefined,
): boolean {
  return (display ?? 'both') !== 'none';
}

/**
 * Whether a dependency edge should be DRAWN (and be hit-testable) under the current
 * items and display filter. False when an endpoint is missing or the filter hides
 * everything (`none`).
 *
 * TODO(IM2): re-add the endpoint-side visibility split once the actual-date plan/actual
 * rendering model is in place.
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
  return (
    isItemVisibleUnderDisplay(undefined, display) && isItemVisibleUnderDisplay(undefined, display)
  );
}

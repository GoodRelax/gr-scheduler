/**
 * UseCase layer: pure predicates for the dependency-edge CONSTRAINTS (DEP-L1
 * plan/actual rework):
 *
 * - An edge may connect ONLY plan->plan or actual->actual items (same
 *   {@link PlanActualKind}); a missing kind counts as `plan`.
 * - A drawn edge is visible only when BOTH endpoints are visible under the current
 *   plan/actual display filter (so hiding the plan side hides plan-linked edges, and
 *   hiding the actual side hides actual-linked edges).
 *
 * Shared by the link-pick controller (reject a plan<->actual pick), the dependency
 * render layer (skip non-renderable / cross-kind edges without crashing) and the
 * dependency hit-tester (a hidden line is not grabbable). Side-effect free.
 */

import type {
  Dependency,
  PlanActualDisplay,
  PlanActualKind,
  ScheduleItem,
} from '../model/schedule-model.js';

/** The linkable kind of an item; a missing `planActualKind` counts as `plan`. */
export function linkableKindOf(item: { readonly planActualKind?: PlanActualKind }): PlanActualKind {
  return item.planActualKind === 'actual' ? 'actual' : 'plan';
}

/** Whether two items share a linkable kind (both plan, or both actual). */
export function sameLinkableKind(
  from: { readonly planActualKind?: PlanActualKind },
  to: { readonly planActualKind?: PlanActualKind },
): boolean {
  return linkableKindOf(from) === linkableKindOf(to);
}

/** Whether an item of `kind` is shown under a plan/actual display filter. */
export function isItemVisibleUnderDisplay(
  kind: PlanActualKind,
  display: PlanActualDisplay | undefined,
): boolean {
  const effective = display ?? 'both';
  if (effective === 'both') {
    return true;
  }
  if (effective === 'none') {
    return false;
  }
  if (effective === 'plan-only') {
    return kind !== 'actual';
  }
  // actual-only
  return kind === 'actual';
}

/**
 * Whether a dependency edge should be DRAWN (and be hit-testable) under the current
 * items and display filter. False when an endpoint is missing, the endpoints cross
 * plan<->actual (a legacy/invalid edge), or either endpoint is hidden by the filter.
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
  if (!sameLinkableKind(from, to)) {
    return false;
  }
  return (
    isItemVisibleUnderDisplay(linkableKindOf(from), display) &&
    isItemVisibleUnderDisplay(linkableKindOf(to), display)
  );
}

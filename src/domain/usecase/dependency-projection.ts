/**
 * UseCase layer: per-item dependency ARRAY projection (DEP-L1-001, item 4).
 *
 * The canonical representation of dependencies is the document's directed edge list
 * ({@link Dependency}[]): each edge carries its endpoints AND the 9-point anchors the
 * router needs, so it is the single source of truth. The per-item
 * `predecessorItemIds` / `successorItemIds` arrays the JSON contract and the property
 * panel expose are a pure PROJECTION of that edge list -- never stored on the item, so
 * the two views can never disagree (no duplicate/contradictory state).
 *
 * Direction convention (finish-to-start): an edge `from -> to` means `from` is a
 * PREDECESSOR of `to` and `to` is a SUCCESSOR of `from`. Therefore:
 *  - predecessors of X = every `from` whose edge targets X (`to === X`);
 *  - successors of X   = every `to` whose edge originates at X (`from === X`).
 *
 * Pure and side-effect free.
 */

import type { AnchorIndex, Dependency } from '../model/schedule-model.js';

/**
 * Default source anchor for a dependency authored WITHOUT a drawn drag (e.g. via the
 * property-panel comma-id fields, item 4): the source item's middle-right edge, so a
 * finish-to-start connector leaves the predecessor's right side.
 */
export const DEFAULT_DEPENDENCY_FROM_ANCHOR: AnchorIndex = 5;

/** Default target anchor for a panel-authored dependency: the target's middle-left edge. */
export const DEFAULT_DEPENDENCY_TO_ANCHOR: AnchorIndex = 3;

/** The two projected dependency arrays for one item. */
export interface ItemDependencyArrays {
  /** Item ids that must finish before this item (edges `pred -> item`). */
  readonly predecessorItemIds: string[];
  /** Item ids that depend on this item (edges `item -> succ`). */
  readonly successorItemIds: string[];
}

/** De-duplicate ids preserving first-seen order. */
function distinctInOrder(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

/**
 * Project the predecessor item ids of one item from the edge list (item 4).
 *
 * @param dependencies - The canonical directed edge list (absent treated as empty).
 * @param itemId - The item whose predecessors to collect.
 * @returns The distinct predecessor item ids, in edge-list order.
 */
export function predecessorItemIds(
  dependencies: readonly Dependency[] | undefined,
  itemId: string,
): string[] {
  return distinctInOrder(
    (dependencies ?? [])
      .filter((edge) => edge.toItemId === itemId)
      .map((edge) => edge.fromItemId),
  );
}

/**
 * Project the successor item ids of one item from the edge list (item 4).
 *
 * @param dependencies - The canonical directed edge list (absent treated as empty).
 * @param itemId - The item whose successors to collect.
 * @returns The distinct successor item ids, in edge-list order.
 */
export function successorItemIds(
  dependencies: readonly Dependency[] | undefined,
  itemId: string,
): string[] {
  return distinctInOrder(
    (dependencies ?? [])
      .filter((edge) => edge.fromItemId === itemId)
      .map((edge) => edge.toItemId),
  );
}

/**
 * Project both dependency arrays for one item in a single pass (item 4).
 *
 * @param dependencies - The canonical directed edge list (absent treated as empty).
 * @param itemId - The item to project.
 * @returns The predecessor and successor id arrays.
 */
export function projectItemDependencyArrays(
  dependencies: readonly Dependency[] | undefined,
  itemId: string,
): ItemDependencyArrays {
  return {
    predecessorItemIds: predecessorItemIds(dependencies, itemId),
    successorItemIds: successorItemIds(dependencies, itemId),
  };
}

/**
 * A minimal edit to the canonical edge list: edges to append and edge ids to drop.
 * Applied atomically by `rewireItemDependenciesCommand` so a whole rewire is one
 * undoable step (item 4).
 */
export interface DependencyRewire {
  readonly addEdges: Dependency[];
  readonly removeEdgeIds: string[];
}

/** Whether the rewire changes nothing (so the command can be a no-op / no history). */
export function isEmptyRewire(rewire: DependencyRewire): boolean {
  return rewire.addEdges.length === 0 && rewire.removeEdgeIds.length === 0;
}

/**
 * Plan the edge-list edit that makes `itemId`'s PREDECESSORS exactly equal
 * `desiredPredecessorIds` (item 4, property-panel comma-id editing). Unknown ids
 * (not in `validItemIds`) and self-references are ignored (dangling-ref repair);
 * duplicates collapse. Existing predecessor edges not in the desired set are removed;
 * newly desired ones are appended with default anchors and a caller-supplied id.
 *
 * @param dependencies - The canonical edge list (absent treated as empty).
 * @param itemId - The item whose predecessor set is being set.
 * @param desiredPredecessorIds - The full new predecessor id list (any order).
 * @param validItemIds - The set of ids that name a real item.
 * @param makeEdgeId - Factory producing a unique id per newly added edge.
 * @returns The add/remove plan.
 */
export function planPredecessorRewire(
  dependencies: readonly Dependency[] | undefined,
  itemId: string,
  desiredPredecessorIds: readonly string[],
  validItemIds: ReadonlySet<string>,
  makeEdgeId: () => string,
): DependencyRewire {
  const edges = dependencies ?? [];
  const desired = distinctInOrder(desiredPredecessorIds).filter(
    (id) => id !== itemId && validItemIds.has(id),
  );
  const desiredSet = new Set(desired);
  const currentEdges = edges.filter((edge) => edge.toItemId === itemId);
  const currentFroms = new Set(currentEdges.map((edge) => edge.fromItemId));
  const removeEdgeIds = currentEdges
    .filter((edge) => !desiredSet.has(edge.fromItemId))
    .map((edge) => edge.id);
  const addEdges: Dependency[] = desired
    .filter((fromId) => !currentFroms.has(fromId))
    .map((fromId) => ({
      id: makeEdgeId(),
      fromItemId: fromId,
      fromAnchor: DEFAULT_DEPENDENCY_FROM_ANCHOR,
      toItemId: itemId,
      toAnchor: DEFAULT_DEPENDENCY_TO_ANCHOR,
    }));
  return { addEdges, removeEdgeIds };
}

/**
 * Plan the edge-list edit that makes `itemId`'s SUCCESSORS exactly equal
 * `desiredSuccessorIds` (item 4, mirror of {@link planPredecessorRewire}). Unknown /
 * self ids are ignored; new edges originate at `itemId`.
 *
 * @param dependencies - The canonical edge list (absent treated as empty).
 * @param itemId - The item whose successor set is being set.
 * @param desiredSuccessorIds - The full new successor id list (any order).
 * @param validItemIds - The set of ids that name a real item.
 * @param makeEdgeId - Factory producing a unique id per newly added edge.
 * @returns The add/remove plan.
 */
export function planSuccessorRewire(
  dependencies: readonly Dependency[] | undefined,
  itemId: string,
  desiredSuccessorIds: readonly string[],
  validItemIds: ReadonlySet<string>,
  makeEdgeId: () => string,
): DependencyRewire {
  const edges = dependencies ?? [];
  const desired = distinctInOrder(desiredSuccessorIds).filter(
    (id) => id !== itemId && validItemIds.has(id),
  );
  const desiredSet = new Set(desired);
  const currentEdges = edges.filter((edge) => edge.fromItemId === itemId);
  const currentTos = new Set(currentEdges.map((edge) => edge.toItemId));
  const removeEdgeIds = currentEdges
    .filter((edge) => !desiredSet.has(edge.toItemId))
    .map((edge) => edge.id);
  const addEdges: Dependency[] = desired
    .filter((toId) => !currentTos.has(toId))
    .map((toId) => ({
      id: makeEdgeId(),
      fromItemId: itemId,
      fromAnchor: DEFAULT_DEPENDENCY_FROM_ANCHOR,
      toItemId: toId,
      toAnchor: DEFAULT_DEPENDENCY_TO_ANCHOR,
    }));
  return { addEdges, removeEdgeIds };
}

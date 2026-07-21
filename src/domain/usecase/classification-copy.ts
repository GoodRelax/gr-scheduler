/**
 * UseCase layer: pure seams for classification copy-paste (CR-007 Part 5, D-4).
 *
 * Two responsibilities that must be deterministic and unit-testable in isolation:
 *
 * - SUFFIX NAMING: a duplicated section / track is named `${name}-${n}` with the
 *   first free positive `n` (`Body` -> `Body-1`; if `Body-1` exists -> `Body-2`),
 *   stripping any trailing `-<digits>` first so re-copying a copy keeps one suffix.
 * - DEPENDENCY PARTITION (D-4): when a subtree is duplicated, a dependency whose
 *   BOTH endpoints are inside the subtree is REPRODUCED for the copy (remapped to
 *   the new item ids); a dependency crossing the duplication boundary (exactly one
 *   endpoint inside) is DROPPED, never left pointing at the originals.
 *
 * These are consumed by {@link duplicateCategorySubtree} (via the CR-007
 * `copyClassificationSubtree` wrapper) but kept dependency-free so the tree module
 * can import them without a cycle.
 *
 * Pure and side-effect free.
 */

import type { Dependency } from '../model/schedule-model.js';

/**
 * The next non-colliding numeric-suffix name for a duplicated node (CR-007 Part 5):
 * strip any trailing `-<digits>` to a stem, then append the first free `-<n>`
 * (n >= 1), e.g. `Body` -> `Body-1`, or `Body-1` -> `Body-2` when `Body-1` is taken.
 *
 * @param baseName - The source node's name.
 * @param existingNames - Sibling names already in the parent scope.
 * @returns The first free `${stem}-${n}` name.
 */
export function nextNumericSuffixName(baseName: string, existingNames: Iterable<string>): string {
  const taken = new Set(existingNames);
  const stem = baseName.replace(/-\d+$/, '');
  let n = 1;
  while (taken.has(`${stem}-${n}`)) {
    n += 1;
  }
  return `${stem}-${n}`;
}

/** The outcome of partitioning a document's dependencies for a subtree copy (D-4). */
export interface CopiedDependencyPartition {
  /** Internal dependencies reproduced for the copy, remapped to the new item ids. */
  readonly reproduced: Dependency[];
  /** Count of internal (both-endpoints-inside) dependencies reproduced. */
  readonly internalCount: number;
  /** Count of boundary-crossing (one-endpoint-inside) dependencies dropped. */
  readonly crossingCount: number;
}

/**
 * Partition a document's dependencies for a duplicated subtree (CR-007 Part 5,
 * D-4). `idRemap` maps each ORIGINAL item id that is inside the duplicated subtree
 * to its NEW (copied) item id. A dependency with both endpoints in `idRemap` is
 * reproduced (with a fresh id from `makeDependencyId` and remapped endpoints); a
 * dependency with exactly one endpoint in `idRemap` crosses the boundary and is
 * dropped; a dependency with neither endpoint inside is unrelated and ignored.
 *
 * @param dependencies - The document's current dependencies (may be undefined).
 * @param idRemap - Original-item-id -> copied-item-id for the duplicated subtree.
 * @param makeDependencyId - Mints a unique id for a reproduced edge from the original id.
 * @returns The reproduced edges plus internal / crossing counts.
 */
export function partitionDependenciesForCopy(
  dependencies: readonly Dependency[] | undefined,
  idRemap: ReadonlyMap<string, string>,
  makeDependencyId: (originalId: string) => string,
): CopiedDependencyPartition {
  const reproduced: Dependency[] = [];
  let internalCount = 0;
  let crossingCount = 0;
  for (const dependency of dependencies ?? []) {
    const newFrom = idRemap.get(dependency.fromItemId);
    const newTo = idRemap.get(dependency.toItemId);
    const fromInside = newFrom !== undefined;
    const toInside = newTo !== undefined;
    if (fromInside && toInside) {
      internalCount += 1;
      reproduced.push({
        ...dependency,
        id: makeDependencyId(dependency.id),
        fromItemId: newFrom,
        toItemId: newTo,
      });
    } else if (fromInside !== toInside) {
      crossingCount += 1;
    }
  }
  return { reproduced, internalCount, crossingCount };
}

/**
 * A deterministic, ASCII, collision-free dependency-id factory for reproduced
 * edges: `${originalId}-copy`, then `${originalId}-copy-2`, ... skipping any id
 * already present. The returned function mutates the supplied `taken` set so ids
 * minted within one copy never collide.
 *
 * @param taken - The set of dependency ids already in use (mutated).
 * @returns A factory that mints a fresh id from an original id.
 */
export function makeDependencyIdFactory(taken: Set<string>): (originalId: string) => string {
  return (originalId) => {
    let candidate = `${originalId}-copy`;
    let n = 2;
    while (taken.has(candidate)) {
      candidate = `${originalId}-copy-${n}`;
      n += 1;
    }
    taken.add(candidate);
    return candidate;
  };
}

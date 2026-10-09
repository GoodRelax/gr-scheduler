// ScheduleLayout -- the rows to draw: level zero, hidden and folded rows dropped, the rest in tree order (LC-1).
// @unit      UF-138  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import {
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../document-model/schedule/schedule'

// see TD-8, TV-1
// WHY: a row is kept when it or a descendant carries a shown task; its ancestors then stand as headings.
/** @purity pure */
function taskGroupsCarryingShown(schedule: Schedule, shown: ReadonlySet<number>, byId: ReadonlyMap<string, TaskGroup>): ReadonlySet<string> {
  const kept = new Set<string>()
  for (const member of schedule.taskGroupMembers) {
    if (!shown.has(member.taskUid)) continue
    let foundAt: string | null = member.groupId
    for (let guard = 0; foundAt !== null && !kept.has(foundAt) && guard <= SETTINGS_CONSTANTS.maxGroupDepth; guard++) {
      kept.add(foundAt)
      foundAt = byId.get(foundAt)?.parentId ?? null
    }
  }
  return kept
}

// see LC-1, HR-2, T-329, TD-8
// TRAP: TD-8 never writes treeState: the shown set only drops rows from this answer (MUST NOT of TD-8).
/** @purity pure */
export function drawnGroups(
  schedule: Schedule,
  settings: DocumentSettings,
  shownTaskUids: ReadonlySet<number> | null = null,
): readonly (TaskGroup & { depth: number })[] {
  const byId = new Map(schedule.taskGroups.map((glyph) => [glyph.id, glyph]))
  const drawnTaskGroups: (TaskGroup & { depth: number })[] = []
  const carrying = shownTaskUids === null ? null : taskGroupsCarryingShown(schedule, shownTaskUids, byId)

  for (const group of schedule.taskGroups) {
    const dropped = isDroppedByTreeState(group, byId, settings) || (carrying !== null && !carrying.has(group.id))
    if (!dropped) drawnTaskGroups.push({ ...group, depth: depthOf(group, byId) })
  }
  return inTreeOrder(drawnTaskGroups, byId)
}

// WHY: nearest first, stopping at a missing parent or past the deepest level, so a broken chain cannot loop.
/** @purity pure */
function ancestorsOf(group: TaskGroup, byId: ReadonlyMap<string, TaskGroup>): readonly TaskGroup[] {
  const out: TaskGroup[] = []
  for (let foundAt = group.parentId, guard = 0; foundAt !== null && guard <= SETTINGS_CONSTANTS.maxGroupDepth; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    out.push(parent)
    foundAt = parent.parentId
  }
  return out
}

/** @purity pure */
function depthOf(group: TaskGroup, byId: ReadonlyMap<string, TaskGroup>): number {
  return 1 + ancestorsOf(group, byId).length
}

// see TD-1, TD-2, TD-3, LC-1, EL-20
// WHY: the one reading of a person's fold and hide: the drawn rows and the dependency ends both ask it (DFC-1221).
/** @purity pure */
export function isDroppedByTreeState(
  group: TaskGroup,
  byId: ReadonlyMap<string, TaskGroup>,
  settings: Pick<DocumentSettings, 'levelZeroTreeState'>,
): boolean {
  if (settings.levelZeroTreeState === 'collapsed' || group.treeState === 'hidden') return true
  return ancestorsOf(group, byId).some((parent) => parent.treeState === 'hidden' || parent.treeState === 'collapsed')
}

// see LC-9, AT-55, EL-20
// WHY: exported so the geometry places an EL-20 end with no drawn ancestor by this same order, not a second walk.
/** @purity pure */
export function inTreeOrder<T extends TaskGroup>(
  rows: readonly T[], byId: ReadonlyMap<string, TaskGroup>,
): readonly T[] {
  const childrenOf = new Map<string | null, T[]>()
  for (const row of rows) {
    const parent = row.parentId !== null && byId.has(row.parentId) ? row.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [row])
    else siblings.push(row)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const ordered: T[] = []
  const seen = new Set<string>()
  const walk = (parent: string | null): void => {
    for (const row of childrenOf.get(parent) ?? []) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      ordered.push(row)
      walk(row.id)
    }
  }
  walk(null)
  for (const row of rows) if (!seen.has(row.id)) ordered.push(row)
  return ordered
}

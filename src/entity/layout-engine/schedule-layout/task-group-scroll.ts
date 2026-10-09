// ScheduleLayout -- the vertical scroll: unpinned task groups and tasks move by the view place (OP-10a).
// @unit      UF-142  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { TaskGroupPlacement, TaskPlacement } from './schedule-layout'

// see OP-10a, S-176
/** @purity pure */
export function scrollOffsetOf(
  taskGroups: readonly TaskGroupPlacement[],
  settings: DocumentSettings,
  taskGroupAreaY: number,
): number {
  const anchoredAt = taskGroups.findIndex((taskGroup) => taskGroup.groupId === settings.scrollGroupId)
  if (anchoredAt < 0) return 0
  const held = Number.isFinite(settings.scrollGroupOffset) ? settings.scrollGroupOffset : 0
  const carriedRows = Math.floor(held)
  const landedAt = Math.min(taskGroups.length - 1, Math.max(0, anchoredAt + carriedRows))
  const taskGroup = taskGroups[landedAt]
  if (taskGroup === undefined) return 0
  // TRAP: taskGroupAnchorAt in input-command-translator.ts inverts this with the same denominator;
  // change both or the pan lands elsewhere.
  const below = taskGroups[landedAt + 1]
  const slab = below === undefined ? taskGroup.height : below.y - taskGroup.y
  return taskGroup.y + (held - carriedRows) * slab - taskGroupAreaY
}

/** @purity pure */
export function scrolledTaskGroups(taskGroups: readonly TaskGroupPlacement[], offsetY: number): readonly TaskGroupPlacement[] {
  if (offsetY === 0) return taskGroups
  return taskGroups.map((taskGroup) => {
    if (taskGroup.isPinned === true) return taskGroup
    return {
      ...taskGroup,
      y: taskGroup.y - offsetY,
      stackTops: taskGroup.stackTops.map((top) => top - offsetY),
    }
  })
}

/** @purity pure */
export function scrolledPlacements(
  placements: readonly TaskPlacement[],
  offsetY: number,
  pinnedIdsPlaced: ReadonlySet<string>,
): readonly TaskPlacement[] {
  if (offsetY === 0) return placements
  return placements.map((one) =>
    pinnedIdsPlaced.has(one.groupId) ? one : { ...one, y: one.y - offsetY },
  )
}

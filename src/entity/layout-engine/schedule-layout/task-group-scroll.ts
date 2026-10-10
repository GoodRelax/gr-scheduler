// ScheduleLayout -- the vertical scroll: unpinned task groups and tasks move by the view place (OP-10a).
// @unit      UF-142  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { TaskGroupPlacement, TaskPlacement } from './schedule-layout'

// see S-78, S-176
type SlabOf = Pick<TaskGroupPlacement, 'groupId' | 'y' | 'height'>

// see S-78, S-176
interface TaskGroupAnchor {
  readonly scrollGroupId: string | null
  readonly scrollGroupOffset: number
}

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

// see OP-10a, S-176
/** @purity pure */
export function taskGroupIndexAtTopEdge(taskGroups: readonly SlabOf[], y: number): number | null {
  for (let at = 0; at < taskGroups.length; at++) {
    const taskGroup = taskGroups[at]
    if (taskGroup === undefined) continue
    const next = taskGroups[at + 1]
    const end = next === undefined ? taskGroup.y + taskGroup.height : next.y
    if (y >= taskGroup.y && y < end) return at
  }
  return null
}

// see OP-10a, S-78, S-176
// WHY: the inverse of scrollOffsetOf, beside it: the wheel, the zoom and the jump (SJ-5) all turn a top edge into an anchor.
/** @purity pure */
export function taskGroupAnchorIn(
  taskGroups: readonly SlabOf[],
  y: number,
  held: TaskGroupAnchor,
): TaskGroupAnchor {
  const at = taskGroupIndexAtTopEdge(taskGroups, y)
  if (at === null) return held
  const taskGroup = taskGroups[at]
  const below = taskGroups[at + 1]
  if (taskGroup === undefined) return held
  // TRAP: scrollOffsetOf (task-group-scroll.ts) inverts this; both must divide by the slab.
  const slab = below === undefined ? taskGroup.height : below.y - taskGroup.y
  if (slab <= 0) return held
  const into = y - taskGroup.y
  if (into >= slab && below !== undefined) {
    return { scrollGroupId: below.groupId, scrollGroupOffset: 0 }
  }
  // WHY: into < slab here, so the share is below 1 but for rounding, which wraps to 0 as a day's fraction does.
  const share = into / slab
  return { scrollGroupId: taskGroup.groupId, scrollGroupOffset: share < 1 ? share : 0 }
}


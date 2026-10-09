// ScheduleLayout -- the pinned band: pinned rows lifted to the top, the rest shifted below (FR-098).
// @unit      UF-141  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import type { ScreenRect, ScreenRegions } from '../screen-regions/screen-regions'
import type { TaskGroupPlacement, ScheduleLayout, TaskPlacement } from './schedule-layout'

// see FR-098, LF-14
/** @purity pure */
export function pinnedBandOf(
  taskGroupPlacements: readonly TaskGroupPlacement[],
  settings: DrawnSettings,
  regions: ScreenRegions,
): {
  readonly height: number
  readonly scrollAreaY: number
  readonly scrollingContentHeight: number
  readonly pinnedIdsPlaced: ReadonlySet<string>
  readonly droppedPinnedIds: ReadonlySet<string>
  readonly shiftByGroupId: ReadonlyMap<string, number>
} {
  const placedById = new Map(taskGroupPlacements.map((taskGroup) => [taskGroup.groupId, taskGroup] as const))
  const banded: TaskGroupPlacement[] = []
  const seen = new Set<string>()
  for (const groupId of settings.pinnedGroupIds) {
    if (seen.has(groupId)) continue
    const taskGroup = placedById.get(groupId)
    if (taskGroup === undefined) continue
    seen.add(groupId)
    banded.push(taskGroup)
  }

  const shiftByGroupId = new Map<string, number>()
  const inBand = new Set<string>()
  const dropped = new Set<string>()
  const taskGroupAreaBottom = regions.taskGroupArea.y + regions.taskGroupArea.height
  let bandY = regions.taskGroupArea.y
  for (const taskGroup of banded) {
    if (dropped.size > 0 || bandY + taskGroup.height > taskGroupAreaBottom) {
      dropped.add(taskGroup.groupId)
      continue
    }
    shiftByGroupId.set(taskGroup.groupId, bandY - taskGroup.y)
    inBand.add(taskGroup.groupId)
    bandY += taskGroup.height + settings.taskGroupGap
  }
  const height = Math.max(0, bandY - regions.taskGroupArea.y - settings.taskGroupGap)
  // TRAP: inBand, not banded: with every pin dropped there is no band and no gap.
  const scrollAreaY = regions.taskGroupArea.y + (inBand.size === 0 ? 0 : height + settings.taskGroupGap)

  let scrollY = scrollAreaY
  for (const taskGroup of taskGroupPlacements) {
    // TRAP: seen, not inBand: a dropped pin must not come back as a scrolling row.
    if (seen.has(taskGroup.groupId)) continue
    shiftByGroupId.set(taskGroup.groupId, scrollY - taskGroup.y)
    scrollY += taskGroup.height + settings.taskGroupGap
  }
  const scrollingContentHeight = Math.max(0, scrollY - scrollAreaY - settings.taskGroupGap)

  return {
    height,
    scrollAreaY,
    scrollingContentHeight,
    pinnedIdsPlaced: inBand,
    droppedPinnedIds: dropped,
    shiftByGroupId,
  }
}

// see FR-098
/** @purity pure */
export function liftedTaskGroups(
  taskGroupPlacements: readonly TaskGroupPlacement[],
  band: {
    readonly pinnedIdsPlaced: ReadonlySet<string>
    readonly droppedPinnedIds: ReadonlySet<string>
    readonly shiftByGroupId: ReadonlyMap<string, number>
  },
): readonly TaskGroupPlacement[] {
  const kept = taskGroupPlacements.filter((taskGroup) => !band.droppedPinnedIds.has(taskGroup.groupId))
  return kept.map((taskGroup) => {
    const shift = band.shiftByGroupId.get(taskGroup.groupId) ?? 0
    const isPinned = band.pinnedIdsPlaced.has(taskGroup.groupId)
    if (shift === 0 && !isPinned) return taskGroup
    return {
      ...taskGroup,
      y: taskGroup.y + shift,
      stackTops: taskGroup.stackTops.map((top) => top + shift),
      isPinned,
    }
  })
}

/** @purity pure */
export function shiftedPlacements(
  placements: readonly TaskPlacement[],
  shiftByGroupId: ReadonlyMap<string, number>,
  droppedPinnedIds: ReadonlySet<string>,
): readonly TaskPlacement[] {
  const kept = placements.filter((one) => !droppedPinnedIds.has(one.groupId))
  return kept.map((one) => {
    const shift = shiftByGroupId.get(one.groupId) ?? 0
    return shift === 0 ? one : { ...one, y: one.y + shift }
  })
}

// see SJ-8
// WHY: a row the last picture did not draw has no drawn height yet; any room below the pins is taken as enough.
/** @purity pure */
export function hasRoomBelowPinsIn(layout: ScheduleLayout, taskGroupArea: ScreenRect, groupId: string | null): boolean {
  const room = taskGroupArea.height - (layout.pinnedBandHeight ?? 0)
  const drawn = groupId === null ? undefined : layout.taskGroups.find((taskGroup) => taskGroup.groupId === groupId)
  return drawn === undefined ? room > 0 : room >= drawn.height
}

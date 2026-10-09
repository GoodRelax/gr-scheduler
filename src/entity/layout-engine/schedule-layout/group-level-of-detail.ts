// ScheduleLayout -- how deep the drawn task groups go at the vertical zoom (table T-005a, L-3).
// @unit      UF-139  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DrawnSettings } from '../../document-model/document-settings/document-settings'
import type { TaskGroup } from '../../document-model/schedule/schedule'

// see T-329
const OPENING_TREE_STATES: Readonly<
  Record<'expandedAndTemporary' | 'expandedOnly', ReadonlySet<TaskGroup['treeState']>>
> = {
  expandedAndTemporary: new Set(['expanded', 'temporarilyExpanded']),
  // WHY: the [v] arming (IC-90) asks which children only temporarilyExpanded keeps drawn.
  expandedOnly: new Set(['expanded']),
}

// see FR-018, T-329, AT-153
// WHY: read over rows TD-1 to TD-3 let through, so an opened task group never beats HF-7 or HR-6.
/** @purity pure */
export function keptInViewByTreeState(
  unfoldedTaskGroups: readonly TaskGroup[],
  counts: 'expandedAndTemporary' | 'expandedOnly',
): ReadonlySet<string> {
  const opening = OPENING_TREE_STATES[counts]
  const byId = new Map(unfoldedTaskGroups.map((taskGroup) => [taskGroup.id, taskGroup]))
  const kept = new Set<string>()
  for (const taskGroup of unfoldedTaskGroups) {
    if (!opening.has(taskGroup.treeState)) continue
    for (let at: TaskGroup | undefined = taskGroup; at !== undefined && !kept.has(at.id);) {
      kept.add(at.id)
      at = at.parentId === null ? undefined : byId.get(at.parentId)
    }
  }
  for (const taskGroup of unfoldedTaskGroups) {
    const parent = taskGroup.parentId === null ? undefined : byId.get(taskGroup.parentId)
    if (parent !== undefined && opening.has(parent.treeState)) kept.add(taskGroup.id)
  }
  return kept
}

// see LC-2, FR-018
/** @purity pure */
export function groupDepthLimit(settings: DrawnSettings): number {
  let limit = 1
  for (let depth = 2; depth <= settings.maxGroupDepth; depth++) {
    if (settings.zoomY >= groupDepthThresholdOf(depth, settings)) limit = depth
  }
  return limit
}

// see FR-018
// TRAP: never retype this: the fit lands zoomY on it and groupDepthLimit reads it back,
// so an ulp apart draws one depth shallower.
/** @purity pure */
export function groupDepthThresholdOf(depth: number, settings: DrawnSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
}

// ScheduleLayout -- how deep the drawn rows go at the vertical zoom (table T-005a, L-3).
// @unit      UF-139  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { TaskGroup } from '../../document-model/schedule/schedule'

// see FR-018, T-254, AT-142
// WHY: read over rows a person has not folded or hidden, so a mark never beats HF-7 or HR-6.
/** @purity pure */
export function keptInViewByOpenMarks(unfoldedRows: readonly TaskGroup[]): ReadonlySet<string> {
  const byId = new Map(unfoldedRows.map((row) => [row.id, row]))
  const kept = new Set<string>()
  for (const row of unfoldedRows) {
    if (!row.isKeptOpen) continue
    for (let at: TaskGroup | undefined = row; at !== undefined && !kept.has(at.id);) {
      kept.add(at.id)
      at = at.parentId === null ? undefined : byId.get(at.parentId)
    }
  }
  for (const row of unfoldedRows) {
    const parent = row.parentId === null ? undefined : byId.get(row.parentId)
    if (parent?.isKeptOpen === true) kept.add(row.id)
  }
  return kept
}

// see LC-2, FR-018
/** @purity pure */
export function groupDepthLimit(settings: DocumentSettings): number {
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
export function groupDepthThresholdOf(depth: number, settings: DocumentSettings): number {
  return settings.groupLevelOfDetailBase * Math.pow(settings.groupLevelOfDetailRatio, depth - 2)
}

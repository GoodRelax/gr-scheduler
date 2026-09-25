// ScheduleLayout -- the vertical scroll: unpinned rows and tasks move by the view place (OP-10a).
// @unit      UF-142  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { RowPlacement, TaskPlacement } from './schedule-layout'

// see OP-10a, S-176
/** @purity pure */
export function scrollOffsetOf(
  rows: readonly RowPlacement[],
  settings: DocumentSettings,
  rowAreaY: number,
): number {
  const anchoredAt = rows.findIndex((row) => row.groupId === settings.scrollGroupId)
  if (anchoredAt < 0) return 0
  const held = Number.isFinite(settings.scrollGroupOffset) ? settings.scrollGroupOffset : 0
  const carriedRows = Math.floor(held)
  const landedAt = Math.min(rows.length - 1, Math.max(0, anchoredAt + carriedRows))
  const row = rows[landedAt]
  if (row === undefined) return 0
  // TRAP: rowAnchorAt in input-command-translator.ts inverts this with the same denominator;
  // change both or the pan lands elsewhere.
  const below = rows[landedAt + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  return row.y + (held - carriedRows) * slab - rowAreaY
}

/** @purity pure */
export function scrolledRows(rows: readonly RowPlacement[], offsetY: number): readonly RowPlacement[] {
  if (offsetY === 0) return rows
  return rows.map((row) => {
    if (row.isPinned === true) return row
    return {
      ...row,
      y: row.y - offsetY,
      stackTops: row.stackTops.map((top) => top - offsetY),
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

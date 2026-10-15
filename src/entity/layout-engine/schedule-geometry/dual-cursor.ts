// ScheduleGeometry -- the two vertical lines of the Dual Cursor (FR-082).
// @unit      UF-149  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import { instantOf } from '../../document-model/schedule/schedule'
import { xOfInstant, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import type { ScreenRegions } from '../screen-regions/screen-regions'
import type { DualCursorGeometry } from './schedule-geometry'

// see S-65, DC-6
export interface DualCursorDates {
  readonly cursorADate: string
  readonly cursorBDate: string
}

// see CU-2, S-65, DC-3
// WHY: a placed date is read as its instant; one placed without time of day is the day's 00:00, its column's left edge.
/** @purity pure */
export function dualCursorGeometry(
  placed: DualCursorDates | null,
  layout: ScheduleLayout,
  regions: ScreenRegions,
): DualCursorGeometry | null {
  if (placed === null) return null
  const first = instantOf(placed.cursorADate)
  const second = instantOf(placed.cursorBDate)
  if (first === null || second === null) return null
  return {
    cursorAX: xOfInstant(layout, first),
    cursorBX: xOfInstant(layout, second),
    top: regions.taskGroupArea.y,
    bottom: regions.taskGroupArea.y + regions.taskGroupArea.height,
  }
}

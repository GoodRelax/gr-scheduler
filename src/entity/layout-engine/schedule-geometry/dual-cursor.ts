// ScheduleGeometry -- the two vertical lines of the Dual Cursor (FR-082).
// @unit      UF-149  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { dayOf } from '../../document-model/schedule/schedule'
import { xFromDay, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import type { ScreenRegions } from '../screen-regions/screen-regions'
import type { DualCursorGeometry } from './schedule-geometry'

// see CU-2, IV-13
/** @purity pure */
export function dualCursorGeometry(
  settings: DocumentSettings,
  layout: ScheduleLayout,
  regions: ScreenRegions,
): DualCursorGeometry | null {
  const placed = settings.dualCursor
  if (placed === null) return null
  const first = dayOf(placed.date1)
  const second = dayOf(placed.date2)
  if (first === null || second === null) return null
  return {
    date1X: xFromDay(layout, first),
    date2X: xFromDay(layout, second),
    top: regions.rowArea.y,
    bottom: regions.rowArea.y + regions.rowArea.height,
  }
}

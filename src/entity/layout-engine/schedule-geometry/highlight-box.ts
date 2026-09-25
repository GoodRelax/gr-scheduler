// ScheduleGeometry -- the highlight box: its rectangle from the top and bottom rows and the two end days (FR-019).
// @unit      UF-171  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import { compareDays, dayOf, type CalendarDay, type Schedule } from '../../document-model/schedule/schedule'
import { xFromDay, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import type { HighlightGeometry } from './schedule-geometry'

// see FR-019
// WHY: the one place a highlight box's end day is counted inclusive; its right edge is where the next day begins.
/** @purity pure */
function rightEdgeOfDay(layout: ScheduleLayout, day: CalendarDay): number {
  return xFromDay(layout, day) + layout.pxPerDay
}

// see FR-019
/** @purity pure */
export function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
  const rowById = new Map(layout.rows.map((row) => [row.groupId, row]))
  const out: HighlightGeometry[] = []
  for (const box of schedule.highlightBoxes) {
    const from = dayOf(box.startDate)
    const toDay = dayOf(box.endDate)
    if (from === null || toDay === null) continue
    const top =
      (box.topGroupId === null ? undefined : rowById.get(box.topGroupId)) ?? layout.rows[0]
    const bottom =
      (box.bottomGroupId === null ? undefined : rowById.get(box.bottomGroupId)) ??
      layout.rows[layout.rows.length - 1]
    if (top === undefined || bottom === undefined) continue
    // TRAP: both edges through min / max: rows are stored in tree order but drawn in screen order, and pinning inverts them.
    const early = compareDays(from, toDay) <= 0 ? from : toDay
    const late = compareDays(from, toDay) <= 0 ? toDay : from
    const x0 = xFromDay(layout, early)
    const x1 = rightEdgeOfDay(layout, late)
    const y = Math.min(top.y, bottom.y)
    out.push({
      id: box.id,
      box: {
        x: x0,
        y,
        width: x1 - x0,
        height: Math.max(top.y + top.height, bottom.y + bottom.height) - y,
      },
      // WHY: not defaulted to S-132: CM-52 gives that to a new box, and a box that states none draws none.
      cornerRadiusPx: box.cornerRadiusPx,
    })
  }
  return out
}

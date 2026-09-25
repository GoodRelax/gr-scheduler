// ItemHitArea -- the items a marquee wholly encloses (SL-3).
// @unit      UF-151  (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure

import type { ScheduleGeometry } from '../schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../screen-regions/screen-regions'
import { bottomOf, boxOfPath, merged, rightOf, shapeOf, type Item } from './item-hit-area'

/** @purity pure */
function isEnclosedInclusive(box: ScreenRect | null, marquee: ScreenRect): boolean {
  if (box === null) return false
  return (
    box.x >= marquee.x &&
    box.y >= marquee.y &&
    rightOf(box) <= rightOf(marquee) &&
    bottomOf(box) <= bottomOf(marquee)
  )
}

// see SL-3, SL-7b
/** @purity pure */
export function itemsInMarquee(geometry: ScheduleGeometry, marquee: ScreenRect): readonly Item[] {
  const out: Item[] = []
  for (const task of geometry.tasks) {
    const shape = shapeOf(task)
    if (isEnclosedInclusive(merged(shape.planBand, shape.actualBand) ?? shape.dummyInk, marquee)) {
      out.push({ kind: 'task', taskUid: task.taskUid })
    }
  }
  for (const line of geometry.dependencies) {
    if (isEnclosedInclusive(boxOfPath(line.points), marquee)) {
      out.push({
        kind: 'dependency',
        predecessorUid: line.predecessorUid,
        successorUid: line.successorUid,
      })
    }
  }
  for (const box of geometry.commentBoxes) {
    if (isEnclosedInclusive(box.body, marquee)) out.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    if (isEnclosedInclusive(box.box, marquee)) out.push({ kind: 'highlightBox', id: box.id })
  }
  return out
}

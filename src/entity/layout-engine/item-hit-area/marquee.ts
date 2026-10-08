// ItemHitArea -- the items a marquee wholly encloses (SL-3).
// @unit      UF-151  (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure

import type { ScheduleGeometry } from '../schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../screen-regions/screen-regions'
import {
  bottomOf,
  boxOfPath,
  cutRect,
  dependencyItemOf,
  grown,
  isLineScrolling,
  isScrolling,
  merged,
  rightOf,
  shapeOf,
  type Item,
} from './item-hit-area'

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

// see WL-4
// WHY: a dashed arrow is left out in silence; it can be neither picked nor deleted (RS-70).
/** @purity pure */
function wbsParentLinksIn(geometry: ScheduleGeometry, marquee: ScreenRect): readonly Item[] {
  return (geometry.wbsParents?.arrows ?? [])
    .filter((arrow) => arrow.isStated && isEnclosedInclusive(boxOfPath(arrow.hitPoints), marquee))
    .map((arrow) => ({ kind: 'wbsParentLink', childUid: arrow.childUid, isStated: true }))
}

// see SL-3, SL-7b, EL-14, FR-098, EL-1
// WHY: a scrolling row's shape is judged by what shows below the pinned band, as the press is (DFC-1222).
/** @purity pure */
export function itemsInMarquee(geometry: ScheduleGeometry, marquee: ScreenRect): readonly Item[] {
  const cut = geometry.pinnedBand ?? null
  const out: Item[] = []
  for (const task of geometry.tasks) {
    const shape = shapeOf(task)
    const box = merged(shape.planBand, shape.actualBand) ?? shape.dummyInk
    if (isEnclosedInclusive(cutRect(box, cut, isScrolling(cut, task.taskUid)), marquee)) {
      out.push({ kind: 'task', taskUid: task.taskUid })
    }
  }
  for (const line of geometry.dependencies) {
    // WHY: the continuation mark is part of its line (T-303), so the dots must be enclosed too.
    const mark = line.continuation
    const dotsBox = mark === null ? null : boxOfPath(mark.dots)
    const dots = mark === null || dotsBox === null ? null : grown(dotsBox, mark.radius, mark.radius)
    const box = merged(boxOfPath(line.drawnPoints), dots)
    // WHY: false: the press that opens a marquee hides the landing mark (EL-17), so no line is drawn whole (EL-19).
    if (isEnclosedInclusive(cutRect(box, cut, isLineScrolling(cut, line, false)), marquee)) {
      out.push(dependencyItemOf(line))
    }
  }
  for (const box of geometry.commentBoxes) {
    if (isEnclosedInclusive(box.body, marquee)) out.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    if (isEnclosedInclusive(box.box, marquee)) out.push({ kind: 'highlightBox', id: box.id })
  }
  return [...out, ...wbsParentLinksIn(geometry, marquee)]
}

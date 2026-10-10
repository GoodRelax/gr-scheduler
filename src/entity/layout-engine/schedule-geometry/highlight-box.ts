// ScheduleGeometry -- the highlight box: its rectangle from the top and bottom task groups and the two end days (FR-019).
// @unit      UF-171  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import { compareDays, dayOf, type CalendarDay, type Schedule } from '../../document-model/schedule/schedule'
import { inTreeOrder, xFromDay, type TaskGroupPlacement, type ScheduleLayout } from '../schedule-layout/schedule-layout'
import { isAtLeastDrawnPx } from './dependency-route'
import type { HighlightGeometry } from './schedule-geometry'

// see FR-019
// WHY: the one place a highlight box's end day is counted inclusive; its right edge is where the next day begins.
/** @purity pure */
function rightEdgeOfDay(layout: ScheduleLayout, day: CalendarDay): number {
  return xFromDay(layout, day) + layout.pxPerDay
}

type AnnotationNumberRow = keyof typeof NOT_STORED_ANNOTATION_BOUNDS

// see T-217, FR-019
// WHY: a null column draws the table's default, and a stored value outside the bounds is drawn clamped while the
// document keeps it -- refusing the document for one look value would lose every other value in it.
/** @purity pure */
export function drawnAnnotationNumber(held: number | null, row: AnnotationNumberRow): number {
  const { min, max } = NOT_STORED_ANNOTATION_BOUNDS[row]
  return Math.min(max, Math.max(min, held ?? NOT_STORED_ANNOTATION_SIZES[row]))
}

// see HB-10, HB-11
/** @purity pure */
function sideHandlesOf(width: number, height: number): HighlightGeometry['hasSideHandles'] {
  const shortest = NOT_STORED_HIGHLIGHT_HANDLE_SIZES['S-373']
  return { leftRight: isAtLeastDrawnPx(height, shortest), topBottom: isAtLeastDrawnPx(width, shortest) }
}

// see FR-019, UC-008
interface DrawnTaskGroupsInTree {
  readonly treeIndexOf: ReadonlyMap<string, number>
  // WHY: the drawn task groups in tree order, each with its index in the whole tree (drawn or not).
  readonly drawn: readonly { readonly taskGroup: TaskGroupPlacement; readonly at: number }[]
}

// see FR-019, UC-008
/** @purity pure */
function drawnTaskGroupsInTreeOf(schedule: Schedule, taskGroupById: ReadonlyMap<string, TaskGroupPlacement>): DrawnTaskGroupsInTree {
  const tree = inTreeOrder(schedule.taskGroups, new Map(schedule.taskGroups.map((group) => [group.id, group])))
  const drawn: { taskGroup: TaskGroupPlacement; at: number }[] = []
  for (const [at, group] of tree.entries()) {
    const taskGroup = taskGroupById.get(group.id)
    if (taskGroup !== undefined) drawn.push({ taskGroup, at })
  }
  return { treeIndexOf: new Map(tree.map((group, at) => [group.id, at])), drawn }
}

// see FR-019, UC-008
// WHY: UC-008 4a -- an undrawn end task group gives way to the nearest drawn task group of the range in tree order, so the frame
// shrinks to the shown task groups; a null or unknown end keeps the screen's first or last task group, and no drawn task group, no box.
/** @purity pure */
function drawnEndsOf(
  box: Schedule['highlightBoxes'][number],
  taskGroupById: ReadonlyMap<string, TaskGroupPlacement>,
  treeOf: () => DrawnTaskGroupsInTree,
  screen: readonly TaskGroupPlacement[],
): { readonly top: TaskGroupPlacement; readonly bottom: TaskGroupPlacement } | undefined {
  const topId = box.topGroupId
  const bottomId = box.bottomGroupId
  const top = topId === null ? screen[0] : taskGroupById.get(topId)
  const bottom = bottomId === null ? screen[screen.length - 1] : taskGroupById.get(bottomId)
  if (top !== undefined && bottom !== undefined) return { top, bottom }
  // TRAP: built only when an end is not drawn, so a frame whose ends are both drawn pays no tree walk.
  const rows = treeOf()
  const low = (topId === null ? undefined : rows.treeIndexOf.get(topId)) ?? -Infinity
  const high = (bottomId === null ? undefined : rows.treeIndexOf.get(bottomId)) ?? Infinity
  const inRange = rows.drawn.filter((one) => one.at >= Math.min(low, high) && one.at <= Math.max(low, high))
  /** @purity pure */
  const isInTree = (id: string | null): boolean => id !== null && rows.treeIndexOf.has(id)
  const shownTop = top ?? (isInTree(topId) ? inRange[0]?.taskGroup : screen[0])
  const shownBottom = bottom ?? (isInTree(bottomId) ? inRange[inRange.length - 1]?.taskGroup : screen[screen.length - 1])
  return shownTop === undefined || shownBottom === undefined ? undefined : { top: shownTop, bottom: shownBottom }
}

// see FR-019
/** @purity pure */
export function highlightGeometry(schedule: Schedule, layout: ScheduleLayout): readonly HighlightGeometry[] {
  const taskGroupById = new Map(layout.taskGroups.map((taskGroup) => [taskGroup.groupId, taskGroup]))
  let tree: DrawnTaskGroupsInTree | null = null
  /** @purity pure */
  const treeOf = (): DrawnTaskGroupsInTree => (tree ??= drawnTaskGroupsInTreeOf(schedule, taskGroupById))
  const out: HighlightGeometry[] = []
  for (const box of schedule.highlightBoxes) {
    const from = dayOf(box.startDate)
    const toDay = dayOf(box.endDate)
    if (from === null || toDay === null) continue
    const ends = drawnEndsOf(box, taskGroupById, treeOf, layout.taskGroups)
    if (ends === undefined) continue
    const { top, bottom } = ends
    // TRAP: both edges through min / max: task groups are stored in tree order but drawn in screen order, and pinning inverts them.
    const early = compareDays(from, toDay) <= 0 ? from : toDay
    const late = compareDays(from, toDay) <= 0 ? toDay : from
    const x0 = xFromDay(layout, early)
    const x1 = rightEdgeOfDay(layout, late)
    const y = Math.min(top.y, bottom.y)
    const width = x1 - x0
    const height = Math.max(top.y + top.height, bottom.y + bottom.height) - y
    out.push({
      id: box.id,
      box: { x: x0, y, width, height },
      // WHY: not defaulted to S-132: CM-52 gives that to a new box, and a box that states none draws none.
      cornerRadiusPx: box.cornerRadiusPx === null ? null : drawnAnnotationNumber(box.cornerRadiusPx, 'S-132'),
      strokeWidthPx: drawnAnnotationNumber(box.strokeWidthPx, 'S-369'),
      // WHY: null is the project theme color (FR-019); the renderer, which holds the theme, paints it.
      fillColor: box.fillColor ?? null,
      // see AT-147
      fillOpacity: 1 - drawnAnnotationNumber(box.fillTransparencyPercent, 'S-371') / 100,
      hasSideHandles: sideHandlesOf(width, height),
    })
  }
  return out
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-217)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_HIGHLIGHT_HANDLE_SIZES: {
  readonly 'S-373': number
} = {
  'S-373': 36,
}

// see T-217, FR-019
const NOT_STORED_ANNOTATION_SIZES: {
  readonly 'S-132': number
  readonly 'S-369': number
  readonly 'S-370': string
  readonly 'S-371': number
  readonly 'S-374': number
  readonly 'S-375': number
} = {
  'S-132': 4,
  'S-369': 1,
  'S-370': 'transparent',
  'S-371': 50,
  'S-374': 1,
  'S-375': 0,
}

// see T-217, FR-006, FR-019
const NOT_STORED_ANNOTATION_BOUNDS: {
  readonly 'S-132': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-369': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-371': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-374': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-375': { readonly key: string; readonly min: number; readonly max: number }
} = {
  'S-132': { key: 'cornerRadiusPx', min: 0, max: 24 },
  'S-369': { key: 'HighlightBox.strokeWidthPx', min: 1, max: 10 },
  'S-371': { key: 'HighlightBox.fillTransparencyPercent', min: 0, max: 100 },
  'S-374': { key: 'CommentBox.strokeWidthPx', min: 1, max: 10 },
  'S-375': { key: 'CommentBox.fillTransparencyPercent', min: 0, max: 100 },
}
// </generated>

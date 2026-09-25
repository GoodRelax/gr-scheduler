// ItemHitArea -- the selection narrowed to the Tasks that are drawn (table T-023c, FR-049).
// @unit      UF-169  (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import type { Schedule } from '../../document-model/schedule/schedule'
import type { Selection } from '../../document-model/selection/selection'
import type { ScheduleGeometry, TaskGeometry } from '../schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../schedule-layout/schedule-layout'

// see T-023c, FR-049, T-240
// TRAP: never milestoneFigure: task-figures.ts builds it with the plan hidden too.
/** @purity pure */
export function isTaskDrawn(task: TaskGeometry): boolean {
  return task.plan !== null || task.actual !== null || task.dummies.length > 0
}

export interface DrawnChoice<T extends ChosenItem> {
  readonly items: readonly T[]
  readonly ordered: boolean
}

export interface ChosenItem {
  readonly kind: string
  readonly uid?: number
}

// see T-023c, SL-7b
// TRAP: the same object when nothing leaves; the shell compares selections by identity.
/** @purity pure */
export function selectionWithinDrawn<T extends ChosenItem>(
  selection: DrawnChoice<T>,
  geometry: ScheduleGeometry,
): DrawnChoice<T> {
  const chosenTaskUids = new Set<number>()
  for (const item of selection.items) {
    if (item.kind === 'task' && item.uid !== undefined) chosenTaskUids.add(item.uid)
  }
  if (chosenTaskUids.size === 0) return selection
  const drawnTaskUids = new Set<number>()
  for (const task of geometry.tasks) {
    if (chosenTaskUids.has(task.taskUid) && isTaskDrawn(task)) drawnTaskUids.add(task.taskUid)
  }
  if (drawnTaskUids.size === chosenTaskUids.size) return selection
  const items = selection.items.filter(
    (item) => item.kind !== 'task' || item.uid === undefined || drawnTaskUids.has(item.uid),
  )
  return { items, ordered: selection.ordered }
}

// see T-023c, FR-098, ST-7
// WHY: a pin the band cannot hold and a row past the stack safety cap are no row T-023c names.
/** @purity pure */
export function selectionWithinDrawnRows(
  selection: Selection,
  geometry: ScheduleGeometry,
  layout: ScheduleLayout,
  schedule: Schedule,
  settings: DocumentSettings,
  isPreviewed: boolean,
): Selection {
  // WHY: none under a preview; it may yet be dropped, and pruning under it ends the drag's selection.
  if (isPreviewed) return selection
  const within = selectionWithinDrawn(selection, geometry)
  if (within === selection) return selection
  const laidOut = new Set(layout.rows.map((row) => row.groupId))
  const pinned = new Set(settings.pinnedGroupIds)
  const inGeometry = new Set(geometry.tasks.map((task) => task.taskUid))
  const isLeftOutUnnamed = (groupId: string): boolean =>
    !laidOut.has(groupId) && (layout.stackSafetyCapReached !== null || pinned.has(groupId))
  const undecided = new Set(
    schedule.taskGroupMembers
      .filter((member) => isLeftOutUnnamed(member.groupId) && !inGeometry.has(member.taskUid))
      .map((member) => member.taskUid),
  )
  if (undecided.size === 0) return within
  const kept = new Set(within.items.flatMap((item) => (item.kind === 'task' ? [item.uid] : [])))
  const items = selection.items.filter(
    (item) => item.kind !== 'task' || kept.has(item.uid) || undecided.has(item.uid),
  )
  return items.length === selection.items.length ? selection : { items, ordered: selection.ordered }
}

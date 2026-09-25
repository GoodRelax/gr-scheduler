// ItemHitArea -- the selection narrowed to the Tasks that are drawn (table T-023c, FR-049).
// @unit      UF-169  (docs/spec/05-07-design.md, table T-075)
// @component ItemHitArea, layer layoutEngine (table T-062)
// @purity    pure

import type { ScheduleGeometry, TaskGeometry } from '../schedule-geometry/schedule-geometry'

// see T-023c, FR-049, T-240
// TRAP: never milestoneFigure: task-figures.ts builds it with the plan hidden too.
/** @purity pure */
export function isTaskDrawn(task: TaskGeometry): boolean {
  return task.plan !== null || task.actual !== null || task.dummies.length > 0
}

// WHY: structural, not the Selection type: components.json declares no ItemHitArea -> Selection edge.
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

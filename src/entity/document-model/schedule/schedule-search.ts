// Schedule -- the tasks and comment boxes a search word finds, with the values of their columns.
// @unit      UF-178  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { compareDays, dayOf } from './calendar-day'
import { planActualState } from './plan-actual-state'
import type { PlanActualState } from './plan-actual-state'
import { taskGroupNameOf, taskGroupPathOf } from './task-group-names'
import type { CommentBox, Schedule, Task } from './schedule-entities'
import { taskGroupRankById } from './schedule-invariants'

// see T-331
export type TaskSearchRow = {
  readonly taskUid: number
  readonly name: string
  readonly assigneeNames: readonly string[]
  readonly plannedStart: string | null
  readonly plannedFinish: string | null
  // see SQ-11, SQ-12, SQ-13
  readonly percentComplete: number | null
  readonly actualStart: string | null
  readonly actualFinish: string | null
  readonly planActualState: PlanActualState
  readonly isBottleneck: boolean
  readonly rowPath: readonly string[]
  readonly groupId: string | null
}

// see SQ-11, SQ-12, SQ-13
/** @purity pure */
function progressOf(task: Task): Pick<TaskSearchRow, 'percentComplete' | 'actualStart' | 'actualFinish'> {
  return { percentComplete: task.percentComplete, actualStart: task.actualStart, actualFinish: task.actualFinish }
}

// see T-331
export type CommentBoxSearchRow = {
  readonly commentBoxId: string
  readonly text: string
  readonly taskGroupName: string
  readonly anchorDate: string | null
  readonly groupId: string | null
}

// see T-331
export type SearchRows = {
  readonly taskRows: readonly TaskSearchRow[]
  readonly commentBoxRows: readonly CommentBoxSearchRow[]
}

interface Ranked<T> {
  readonly row: T
  readonly rank: number
  readonly date: string | null
  readonly key: number | string
}

/** @purity pure */
function comparable(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

// see SV-4
/** @purity pure */
export function isSearchWordFound(text: string, word: string): boolean {
  return comparable(text).includes(comparable(word))
}

// see SV-8
/** @purity pure */
export function compareDates(left: string | null, right: string | null): number {
  const [a, b] = [dayOf(left), dayOf(right)]
  if (a !== null && b !== null) return compareDays(a, b)
  return a === b ? 0 : a === null ? 1 : -1
}

// see SV-8
/** @purity pure */
function inDefaultOrder<T>(ranked: readonly Ranked<T>[]): readonly T[] {
  return [...ranked]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        compareDates(a.date, b.date) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    )
    .map((one) => one.row)
}

// see SQ-2
/** @purity pure */
export function assigneeNamesByTaskUid(schedule: Schedule): ReadonlyMap<number, readonly string[]> {
  const nameByResourceUid = new Map(schedule.resources.map((one) => [one.uid, one.name]))
  const names = new Map<number, string[]>()
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid === null || assignment.resourceUid === null) continue
    const name = nameByResourceUid.get(assignment.resourceUid)
    if (name === undefined || name === null) continue
    const held = names.get(assignment.taskUid)
    if (held === undefined) names.set(assignment.taskUid, [name])
    else held.push(name)
  }
  return names
}

// see SQ-4
/** @purity pure */
export function plannedFinishOf(task: Task): string | null {
  return task.milestone === true ? task.start : task.finish
}

const NO_BOTTLENECK_UIDS: ReadonlySet<number> = new Set()

// see SV-4, T-331, SQ-5
/** @purity pure */
export function searchRowsOf(
  schedule: Schedule,
  word: string,
  bottleneckUids: ReadonlySet<number> = NO_BOTTLENECK_UIDS,
): SearchRows {
  const rankById = taskGroupRankById(schedule.taskGroups)
  const rankOf = (groupId: string | null): number =>
    (groupId === null ? undefined : rankById.get(groupId)) ?? rankById.size
  const heldTaskGroup = (groupId: string | null | undefined): string | null =>
    groupId !== null && groupId !== undefined && rankById.has(groupId) ? groupId : null
  const pathByGroupId = new Map<string, readonly string[]>()
  const pathOf = (groupId: string | null): readonly string[] => {
    if (groupId === null) return []
    const held = pathByGroupId.get(groupId) ?? taskGroupPathOf(schedule, groupId)
    pathByGroupId.set(groupId, held)
    return held
  }

  const groupIdByTaskUid = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const assigneeNames = assigneeNamesByTaskUid(schedule)
  const taskRows: Ranked<TaskSearchRow>[] = []
  for (const task of schedule.tasks) {
    const name = task.name ?? ''
    const names = assigneeNames.get(task.uid) ?? []
    if (!isSearchWordFound(name, word) && !names.some((one) => isSearchWordFound(one, word))) continue
    const groupId = heldTaskGroup(groupIdByTaskUid.get(task.uid))
    const row: TaskSearchRow = {
      taskUid: task.uid,
      name,
      assigneeNames: names,
      plannedStart: task.start,
      plannedFinish: plannedFinishOf(task),
      ...progressOf(task),
      planActualState: planActualState(task),
      isBottleneck: bottleneckUids.has(task.uid),
      rowPath: pathOf(groupId),
      groupId,
    }
    taskRows.push({ row, rank: rankOf(groupId), date: task.start, key: task.uid })
  }

  const commentBoxRows: Ranked<CommentBoxSearchRow>[] = []
  for (const box of schedule.commentBoxes) {
    const text = box.text ?? ''
    if (!isSearchWordFound(text, word)) continue
    commentBoxRows.push(rankedCommentBox(box, text, heldTaskGroup(box.anchorGroupId), schedule, rankOf))
  }

  return { taskRows: inDefaultOrder(taskRows), commentBoxRows: inDefaultOrder(commentBoxRows) }
}

// see T-331, SV-8
/** @purity pure */
function rankedCommentBox(
  box: CommentBox,
  text: string,
  groupId: string | null,
  schedule: Schedule,
  rankOf: (groupId: string | null) => number,
): Ranked<CommentBoxSearchRow> {
  const row: CommentBoxSearchRow = {
    commentBoxId: box.id,
    text,
    taskGroupName: groupId === null ? '' : taskGroupNameOf(schedule, groupId),
    anchorDate: box.anchorDate,
    groupId,
  }
  return { row, rank: rankOf(groupId), date: box.anchorDate, key: box.id }
}

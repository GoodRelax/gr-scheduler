// Schedule -- the tasks and comment boxes a search word finds, with the values of their columns.
// @unit      UF-178  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import {
  dayOf,
  instantOf,
  MINUTES_PER_CALENDAR_DAY,
  textOfDayStart,
  textOfInstant,
  type CalendarDay,
} from './calendar-day'
import { instantOnSideReader, startSideOf } from './working-calendar'
import { planActualState } from './plan-actual-state'
import type { PlanActualState } from './plan-actual-state'
import { taskGroupNameOf, taskGroupPathOf } from './task-group-names'
import type { CommentBox, Schedule, Task } from './schedule-entities'
import { taskGroupRankById } from './schedule-invariants'
import { progressMarkerOf, type ProgressMarker } from './task-delay'

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
  readonly progressMarker: ProgressMarker
  readonly milestone: boolean
  readonly rowPath: readonly string[]
  readonly taskGroupId: string | null
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
  readonly taskGroupId: string | null
}

// see T-331
export type SearchRows = {
  readonly taskRows: readonly TaskSearchRow[]
  readonly commentBoxRows: readonly CommentBoxSearchRow[]
}

interface Ranked<T> {
  readonly row: T
  readonly rank: number
  readonly at: number | null
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

/** @purity pure */
export function compareInstants(a: number | null, b: number | null): number {
  if (a !== null && b !== null) return a - b
  return a === b ? 0 : a === null ? 1 : -1
}

// TRAP: a date without a time reads as 00:00 here; a Task column is read on its side (plannedStartInstantsOf).
/** @purity pure */
export function compareDates(left: string | null, right: string | null): number {
  return compareInstants(instantOf(left), instantOf(right))
}

// see SV-8, SQ-3, FR-054, WT-5
/** @purity pure */
export function plannedStartInstantsOf(schedule: Schedule): ReadonlyMap<number, number | null> {
  const read = instantOnSideReader(schedule)
  return new Map(schedule.tasks.map((task) => [task.uid, read(task.start, startSideOf(task))]))
}

// see SV-8
/** @purity pure */
function inDefaultOrder<T>(ranked: readonly Ranked<T>[]): readonly T[] {
  return [...ranked]
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        compareInstants(a.at, b.at) ||
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

const NOTHING_DIAGNOSED: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'> = new Map()

/** @purity pure */
function taskSearchRowOf(task: Task, assigneeNames: readonly string[],
                         place: Pick<TaskSearchRow, 'rowPath' | 'taskGroupId'>, progressMarker: ProgressMarker): TaskSearchRow {
  return {
    taskUid: task.uid,
    name: task.name ?? '',
    assigneeNames,
    plannedStart: task.start,
    plannedFinish: plannedFinishOf(task),
    ...progressOf(task),
    planActualState: planActualState(task),
    progressMarker,
    milestone: task.milestone === true,
    ...place,
  }
}

// TRAP: read through ?.: a schedule built from a part of a document may carry no project, and then no row is late.
/** @purity pure */
function statusDayOf(schedule: Schedule): CalendarDay | null {
  return dayOf(schedule.project?.statusDate ?? null)
}

// see SV-4, T-331, SQ-5, SQ-14
/** @purity pure */
export function searchRowsOf(
  schedule: Schedule,
  word: string,
  diagnosed: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'> = NOTHING_DIAGNOSED,
  statusDate: CalendarDay | null = statusDayOf(schedule),
): SearchRows {
  const rankById = taskGroupRankById(schedule.taskGroups)
  const rankOf = (taskGroupId: string | null): number =>
    (taskGroupId === null ? undefined : rankById.get(taskGroupId)) ?? rankById.size
  const heldTaskGroup = (taskGroupId: string | null | undefined): string | null =>
    taskGroupId !== null && taskGroupId !== undefined && rankById.has(taskGroupId) ? taskGroupId : null
  const pathByTaskGroupId = new Map<string, readonly string[]>()
  const pathOf = (taskGroupId: string | null): readonly string[] => {
    if (taskGroupId === null) return []
    const held = pathByTaskGroupId.get(taskGroupId) ?? taskGroupPathOf(schedule, taskGroupId)
    pathByTaskGroupId.set(taskGroupId, held)
    return held
  }

  const taskGroupIdByTaskUid = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.taskGroupId]))
  const assigneeNames = assigneeNamesByTaskUid(schedule)
  const startAt = plannedStartInstantsOf(schedule)
  const taskRows: Ranked<TaskSearchRow>[] = []
  for (const task of schedule.tasks) {
    const name = task.name ?? ''
    const names = assigneeNames.get(task.uid) ?? []
    if (!isSearchWordFound(name, word) && !names.some((one) => isSearchWordFound(one, word))) continue
    const taskGroupId = heldTaskGroup(taskGroupIdByTaskUid.get(task.uid))
    const marker = progressMarkerOf(task, statusDate, diagnosed.get(task.uid))
    const row = taskSearchRowOf(task, names, { rowPath: pathOf(taskGroupId), taskGroupId }, marker)
    taskRows.push({ row, rank: rankOf(taskGroupId), at: startAt.get(task.uid) ?? null, key: task.uid })
  }

  const commentBoxRows: Ranked<CommentBoxSearchRow>[] = []
  for (const box of schedule.commentBoxes) {
    const text = box.text ?? ''
    if (!isSearchWordFound(text, word)) continue
    commentBoxRows.push(rankedCommentBox(box, text, heldTaskGroup(box.anchorTaskGroupId), schedule, rankOf))
  }

  return { taskRows: inDefaultOrder(taskRows), commentBoxRows: inDefaultOrder(commentBoxRows) }
}

// see T-331, SV-8
/** @purity pure */
function rankedCommentBox(
  box: CommentBox,
  text: string,
  taskGroupId: string | null,
  schedule: Schedule,
  rankOf: (taskGroupId: string | null) => number,
): Ranked<CommentBoxSearchRow> {
  const shown = commentBoxShownDateOf(schedule, box)
  const row: CommentBoxSearchRow = {
    commentBoxId: box.id,
    text,
    taskGroupName: taskGroupId === null ? '' : taskGroupNameOf(schedule, taskGroupId),
    anchorDate: shown,
    taskGroupId,
  }
  return { row, rank: rankOf(taskGroupId), at: instantOf(shown), key: box.id }
}

// see FR-019, SQ-9, SJ-6
// WHY: the one reading of the instant a tip stands at from the document alone: a snapped tip at its target's
// point (start, finish or their middle), else the free point. The search row, the jump and the release on a
// deleted target all read it, so the table, the jump and the drawn box agree once the target moves.
/** @purity pure */
export function commentBoxShownDateOf(schedule: Schedule, box: CommentBox): string | null {
  const point = box.anchorSnapPoint ?? null
  if (point === null) return box.anchorDate
  const span = snappedSpanOf(schedule, box)
  if (span === null) return box.anchorDate
  const { left, right } = span
  if (point.includes('Left') || point === 'leftMiddle') return textOfInstant(left)
  if (point.includes('Right') || point === 'rightMiddle') return textOfInstant(right)
  return textOfInstant(Math.round((left + right) / 2))
}

// see FR-019, LF-15
// WHY: a highlight box is drawn from the start of its first day to the end of its last, so its right stands a day on.
/** @purity pure */
function snappedSpanOf(schedule: Schedule, box: CommentBox): { readonly left: number; readonly right: number } | null {
  const taskUid = box.anchorTaskUid ?? null
  if (taskUid !== null) {
    const task = schedule.tasks.find((one) => one.uid === taskUid)
    if (task === undefined) return null
    const isActual = box.anchorTaskFigure === 'actualBar'
    const left = instantOf(isActual ? (task.actualStart ?? task.start) : task.start)
    const right = task.milestone ? left : instantOf(isActual ? (task.actualFinish ?? task.finish) : task.finish)
    return left === null || right === null ? null : { left, right }
  }
  const highlight = schedule.highlightBoxes.find((one) => one.id === (box.anchorHighlightBoxId ?? null))
  const startDay = dayOf(highlight?.start ?? null)
  const finishDay = dayOf(highlight?.finish ?? null)
  if (startDay === null || finishDay === null) return null
  const left = instantOf(textOfDayStart(startDay))
  const finishStart = instantOf(textOfDayStart(finishDay))
  return left === null || finishStart === null ? null : { left, right: finishStart + MINUTES_PER_CALENDAR_DAY }
}

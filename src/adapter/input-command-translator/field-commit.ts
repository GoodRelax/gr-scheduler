// InputCommandTranslator -- a value committed in the properties panel into a command (table T-016).
// @unit      UF-100  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  COLUMN_SHAPES,
  dayOf,
  lastDayForLength,
  planActualState,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  type Schedule,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import type { FieldCommit } from '../screen-renderer/screen-renderer'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import {
  milestoneGlyphOf,
  nextIssuedUid,
  placementAt,
  type InputContext,
  type PlacedPlanActual,
} from './input-command-translator'

/** @purity pure */
function settledText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/** @purity pure */
function settledNumber(text: string): number | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const value = Number(held)
  return Number.isFinite(value) ? value : undefined
}

/** @purity pure */
function settledDay(text: string): string | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const day = dayOf(held)
  return day === null ? undefined : textOfDay(day)
}

/** @purity pure */
function settledTruth(text: string): boolean {
  return text.trim() === String(true)
}

type VisualColumn = keyof Schedule['taskVisuals'][number]

type TaskLineWeight = NonNullable<Schedule['taskVisuals'][number]['lineWeight']>
type TaskNameAlign = NonNullable<Schedule['taskVisuals'][number]['nameAlign']>

// see T-016
/** @purity pure */
function isVisualChoice(column: VisualColumn, value: string): boolean {
  return COLUMN_SHAPES.TaskVisual[column]?.choices?.includes(value) ?? false
}

// see PR-5, P-5
// WHY: the name of PR-5's row, not a Task column; the length is counted from the dates (FR-011).
const ACTUAL_LENGTH_ITEM = 'actualDuration'

// see CM-13, T-019, T-019a, FR-044, PR-5
/** @purity pure */
function planActualWithColumn(
  schedule: Schedule,
  task: Task,
  column: string,
  text: string,
): PlacedPlanActual | null {
  const next: Task = { ...task }
  // WHY: written by name; five typed arms would repeat the classification below five times.
  const written = next as unknown as { [key: string]: unknown }
  if (column === 'resumeValid') {
    written[column] = settledTruth(text)
  } else if (column === ACTUAL_LENGTH_ITEM) {
    const days = settledNumber(text)
    const from = dayOf(task.actualStart)
    if (days === undefined || days === null || from === null) return null
    const lastDay = textOfDay(lastDayForLength(workingCalendarOf(schedule), from, days))
    written[planActualState(task) === 'finished' ? 'actualFinish' : 'stop'] = lastDay
  } else {
    const day = settledDay(text)
    if (day === undefined) return null
    written[column] = day
    // TRAP: set resumeValid with resume before the row is read: without true a date on PA-4 is
    // dropped, without false a cleared date ends the suspension; false only where a date stood.
    if (column === 'resume' && day !== null) {
      written['resumeValid'] = true
    }
    if (column === 'resume' && day === null && task.resume !== null) {
      written['resumeValid'] = false
    }
    // WHY: a cleared actualFinish hands its day to stop as PV-3 does, or the actual loses its right end.
    if (column === 'actualFinish' && day === null && task.actualFinish !== null && next.stop === null) {
      written['stop'] = task.actualFinish
    }
  }

  if (planActualState(next) === 'notStarted') return { row: 'PA-1' }
  return placementAt(next)
}

const PLAN_ACTUAL_COLUMNS: readonly string[] = [
  'actualStart',
  ACTUAL_LENGTH_ITEM,
  'actualFinish',
  'resume',
  'resumeValid',
]

// see T-016, PR-3, CM-11, FR-006
/** @purity pure */
function commandFromTaskColumn(
  schedule: Schedule,
  task: Task,
  column: keyof Task,
  text: string,
): readonly DocumentCommand[] {
  const uid = task.uid

  if (PLAN_ACTUAL_COLUMNS.includes(column)) {
    const place = planActualWithColumn(schedule, task, column, text)
    return place === null ? [] : [{ kind: 'setTaskPlanActualState', uid, place }]
  }

  switch (column) {
    case 'name':
      return [{ kind: 'setTaskName', uid, name: settledText(text) }]
    case 'notes':
      return [{ kind: 'setTaskNotes', uid, notes: settledText(text) }]
    case 'start':
    case 'finish': {
      const settled = settledDay(text)
      if (settled === undefined || settled === null) return []
      const start = column === 'start' ? settled : task.start
      const finish = column === 'finish' ? settled : task.finish
      if (start === null || finish === null) return []
      return [{ kind: 'setTaskPlanDates', uid, start, finish }]
    }
    case 'deadline': {
      const deadline = settledDay(text)
      return deadline === undefined ? [] : [{ kind: 'setTaskDeadline', uid, deadline }]
    }
    case 'fadeInDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeInDays', uid, days }]
    }
    case 'fadeOutDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeOutDays', uid, days }]
    }
    case 'wbsParentUid': {
      const parentUid = settledNumber(text)
      return parentUid === undefined ? [] : [{ kind: 'setTaskWbsParent', uid, parentUid }]
    }
    default:
      return []
  }
}

// see FR-007, FR-078, FR-002, CM-22, CM-23
/** @purity pure */
function commandFromVisualColumn(
  schedule: Schedule,
  uid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === uid) ?? null

  switch (column) {
    case 'milestoneGlyph': {
      const held = settledText(text)
      const glyph = held === null ? null : milestoneGlyphOf(held)
      if (held !== null && glyph === null) return []
      return [{ kind: 'setTaskVisualMilestoneGlyph', uid, glyph }]
    }
    case 'strokeColor':
    case 'fillColor': {
      const chosen = settledText(text)
      const other =
        column === 'strokeColor' ? (visual?.fillColor ?? null) : (visual?.strokeColor ?? null)
      if (chosen === null && other === null) return [{ kind: 'resetTaskVisualColors', uid }]
      const strokeColor = column === 'strokeColor' ? chosen : other
      const fillColor = column === 'fillColor' ? chosen : other
      return [{ kind: 'setTaskVisualColors', uid, fillColor, strokeColor }]
    }
    case 'lineWeight': {
      const held = settledText(text)
      if (held !== null && !isVisualChoice('lineWeight', held)) return []
      const lineWeight = held as TaskLineWeight | null
      return [{ kind: 'setTaskVisualLineWeight', uid, lineWeight }]
    }
    case 'nameAnchor':
    case 'nameAlign': {
      const anchor = column === 'nameAnchor' ? settledNumber(text) : (visual?.nameAnchor ?? null)
      if (anchor === undefined) return []
      const chosen = column === 'nameAlign' ? settledText(text) : (visual?.nameAlign ?? null)
      if (chosen !== null && !isVisualChoice('nameAlign', chosen)) return []
      const nameAlign = chosen as TaskNameAlign | null
      return [{ kind: 'setTaskVisualNamePlacement', uid, nameAnchor: anchor, nameAlign }]
    }
    default:
      return []
  }
}

// see FR-042, AT-53, CM-29, CM-30, CM-31
/** @purity pure */
function commandFromGroupColumn(
  groupId: string,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  switch (column) {
    case 'label': {
      return [{ kind: 'setTaskGroupLabel', groupId, label: settledText(text) }]
    }
    case 'color': {
      const color = settledText(text)
      return color === null
        ? [{ kind: 'resetTaskGroupColor', groupId }]
        : [{ kind: 'setTaskGroupColor', groupId, color }]
    }
    case 'height': {
      const height = settledNumber(text)
      return height === undefined ? [] : [{ kind: 'setTaskGroupHeight', groupId, height }]
    }
    default:
      return []
  }
}

// see FR-009, CM-38
/** @purity pure */
function commandFromDependencyColumn(
  predecessorUid: number,
  successorUid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  if (column !== 'lag') return []
  const lag = settledNumber(text)
  if (lag === undefined || lag === null) return []
  return [{ kind: 'setDependencyLag', predecessorUid, successorUid, lag }]
}

// see FR-035, CM-1
/** @purity pure */
function commandFromProjectColumn(column: string, text: string): readonly DocumentCommand[] {
  if (column !== 'title') return []
  return [{ kind: 'setProjectTitle', title: text }]
}

const ASSIGNEE_ROW = 'PR-16'

const UNASSIGN_TOKEN = '-'

// see AS-8
/** @purity pure */
function resourceUidOfName(schedule: Schedule, name: string): number | null {
  let found: number | null = null
  for (const resource of schedule.resources) {
    if (resource.name !== name) continue
    if (found === null || resource.uid < found) found = resource.uid
  }
  return found
}

// see AS-9
/** @purity pure */
function resourceUidOfChoice(schedule: Schedule, text: string): number | null {
  const uid = Number(text)
  if (!Number.isInteger(uid)) return null
  // TRAP: ask the roster, not the spelling: a name made of digits must still reach AS-7 / AS-8,
  // and a uid gone since the chooser was drawn is read as a name.
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

// see AS-3, CM-45
/** @purity pure */
function commandsFromUnassign(schedule: Schedule, taskUid: number): readonly DocumentCommand[] {
  const held = new Set<number>()
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    held.add(assignment.resourceUid)
  }
  // STOP: spec does not decide which of several assignees AS-3 takes off. Looked in AS-3, AS-5, AS-7, AS-9 (PND-461)
  if (held.size !== 1) return []
  const [resourceUid] = [...held]
  if (resourceUid === undefined) return []
  return [{ kind: 'unassignResource', taskUid, resourceUid }]
}

// see AS-7, AS-8, AS-9, AS-10, T-225
/** @purity pure */
function commandsFromAssignee(
  schedule: Schedule,
  taskUid: number,
  text: string,
): readonly DocumentCommand[] {
  const settled = settledText(text)
  if (settled === null) return []
  if (settled === UNASSIGN_TOKEN) return commandsFromUnassign(schedule, taskUid)

  const held = resourceUidOfChoice(schedule, settled) ?? resourceUidOfName(schedule, settled)
  if (held !== null) {
    const already = schedule.assignments.some(
      (one) => one.taskUid === taskUid && one.resourceUid === held,
    )
    return already ? [] : [{ kind: 'createAssignment', taskUid, resourceUid: held }]
  }

  return [
    { kind: 'createResource', name: settled },
    {
      kind: 'createAssignment',
      taskUid,
      // TRAP: read before the bundle runs; it names the resource CM-40 makes only while nothing
      // ahead of CM-44 in this bundle but CM-40 issues a uid.
      resourceUid: nextIssuedUid(schedule),
    },
    ...commandsFromUnassign(schedule, taskUid),
  ]
}

// see PI-18, T-016
/** @purity pure */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  // WHY: the column is the key the panel drew, not worked out again here: the selection may
  // have changed between drawing and commit.
  const key = commit.key

  // TRAP: before the holder switch: PR-16's key has holder task and would reach the Task columns.
  if (commit.row === ASSIGNEE_ROW && key.holder === 'task') {
    return taskByUid(schedule, key.uid) === null
      ? []
      : commandsFromAssignee(schedule, key.uid, commit.text)
  }

  switch (key.holder) {
    case 'task': {
      const task = taskByUid(schedule, key.uid)
      return task === null ? [] : commandFromTaskColumn(schedule, task, key.column, commit.text)
    }
    case 'taskVisual':
      return taskByUid(schedule, key.uid) === null
        ? []
        : commandFromVisualColumn(schedule, key.uid, key.column, commit.text)
    case 'taskGroup':
      return schedule.taskGroups.some((held) => held.id === key.groupId)
        ? commandFromGroupColumn(key.groupId, key.column, commit.text)
        : []
    case 'commentBox':
      return schedule.commentBoxes.some((held) => held.id === key.id)
        ? [{ kind: 'setCommentBoxText', id: key.id, text: settledText(commit.text) }]
        : []
    case 'dependency': {
      const successor = taskByUid(schedule, key.successorUid)
      const dependency = successor?.dependencies[key.ordinal]
      if (dependency === undefined) return []
      return commandFromDependencyColumn(
        dependency.predecessorUid,
        key.successorUid,
        key.column,
        commit.text,
      )
    }
    case 'project':
      return commandFromProjectColumn(key.column, commit.text)
  }
}

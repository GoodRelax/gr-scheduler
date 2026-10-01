// InputCommandTranslator -- a value committed in the properties panel into a command (table T-016).
// @unit      UF-100  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  customColourChosen,
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

// see CV-4, CV-5
// WHY: the colour field commits a palette name, an empty text (back to the theme) or one #rrggbb
// from its custom entrance; only the last is folded into the side of the theme being drawn.
/** @purity pure */
function settledColour(text: string, previous: string | null, dark: boolean): string | null {
  const held = settledText(text)
  return held === null ? null : (customColourChosen(previous, held, dark) ?? held)
}

/** @purity pure */
function settledTruth(text: string): boolean {
  return text.trim() === String(true)
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

// see PR-35, PR-36, CM-11, CM-13
/** @purity pure */
function commandFromMilestoneDay(task: Task, column: keyof Task, text: string): readonly DocumentCommand[] | null {
  const uid = task.uid
  const isPlan = column === 'start' || column === 'finish'
  if (!isPlan && column !== 'actualStart' && column !== 'actualFinish') return null
  const day = settledDay(text)
  if (day === undefined) return []
  if (isPlan) return day === null ? [] : [{ kind: 'setTaskPlanDates', uid, start: day, finish: day }]
  const place: PlacedPlanActual =
    day === null ? { row: 'PA-1' } : { row: 'PA-5', actualStart: day, actualFinish: day }
  return [{ kind: 'setTaskPlanActualState', uid, place }]
}

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

// see FR-007, CM-22, CM-23, CV-4, CV-5
/** @purity pure */
function commandsFromVisualColour(
  visual: Schedule['taskVisuals'][number] | null,
  uid: number,
  isStroke: boolean,
  text: string | null,
  dark: boolean,
): readonly DocumentCommand[] {
  const held = (isStroke ? visual?.strokeColor : visual?.fillColor) ?? null
  const chosen = text === null ? null : settledColour(text, held, dark)
  const other = (isStroke ? visual?.fillColor : visual?.strokeColor) ?? null
  if (chosen === null && other === null) return [{ kind: 'resetTaskVisualColors', uid }]
  const strokeColor = isStroke ? chosen : other
  const fillColor = isStroke ? other : chosen
  return [{ kind: 'setTaskVisualColors', uid, fillColor, strokeColor }]
}

// see FR-007, FR-078, FR-002, CM-22, CM-23
/** @purity pure */
function commandFromVisualColumn(
  schedule: Schedule,
  uid: number,
  column: string,
  text: string,
  dark: boolean,
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
    case 'fillColor':
      return commandsFromVisualColour(visual, uid, column === 'strokeColor', settledText(text), dark)
    case 'strokeWidthPx': {
      const strokeWidthPx = settledNumber(text)
      return strokeWidthPx === undefined ? [] : [{ kind: 'setTaskVisualStrokeWidth', uid, strokeWidthPx }]
    }
    default:
      return []
  }
}

// see FR-042, AT-53, CM-29, CM-30, CM-31
/** @purity pure */
function commandFromGroupColumn(
  group: Schedule['taskGroups'][number],
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const groupId = group.id
  switch (column) {
    case 'label': {
      return [{ kind: 'setTaskGroupLabel', groupId, label: settledText(text) }]
    }
    case 'color': {
      const color = settledColour(text, group.color, dark)
      return color === null
        ? [{ kind: 'resetTaskGroupColor', groupId }]
        : [{ kind: 'setTaskGroupColor', groupId, color }]
    }
    case 'minHeight': {
      const minHeight = settledNumber(text)
      return minHeight === undefined ? [] : [{ kind: 'setTaskGroupMinHeight', groupId, minHeight }]
    }
    default:
      return []
  }
}

type HighlightBox = Schedule['highlightBoxes'][number]

// see PR-22, PR-23, PR-24, PR-25, CM-55, CM-77, CM-78, CM-79
// WHY: a number the field cannot read writes nothing; an empty field writes null, which draws T-217's default.
/** @purity pure */
function commandFromHighlightBoxColumn(
  box: HighlightBox,
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const id = box.id
  const number = settledNumber(text)
  switch (column) {
    case 'strokeColor':
      return [{ kind: 'setHighlightBoxStrokeColor', id, strokeColor: settledColour(text, box.strokeColor, dark) }]
    case 'fillColor':
      return [{ kind: 'setHighlightBoxFillColor', id, fillColor: settledColour(text, box.fillColor, dark) }]
    case 'strokeWidthPx':
      return number === undefined ? [] : [{ kind: 'setHighlightBoxStrokeWidth', id, strokeWidthPx: number }]
    case 'fillTransparencyPercent':
      return number === undefined
        ? []
        : [{ kind: 'setHighlightBoxFillTransparency', id, fillTransparencyPercent: number }]
    default:
      return []
  }
}

type CommentBox = Schedule['commentBoxes'][number]

// see PR-21, PR-26, PR-27, PR-28, CM-48, CM-80, CM-81, CM-82, CM-83, CM-84
// WHY: dispatched by column: one field per column, and PR-28's three colours must not land in the text (S-7).
/** @purity pure */
function commandFromCommentBoxColumn(
  box: CommentBox,
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const id = box.id
  const number = settledNumber(text)
  switch (column) {
    case 'text':
      return [{ kind: 'setCommentBoxText', id, text: settledText(text) }]
    case 'strokeColor':
      return [{ kind: 'setCommentBoxStrokeColor', id, strokeColor: settledColour(text, box.strokeColor, dark) }]
    case 'fillColor':
      return [{ kind: 'setCommentBoxFillColor', id, fillColor: settledColour(text, box.fillColor, dark) }]
    case 'textColor':
      return [{ kind: 'setCommentBoxTextColor', id, textColor: settledColour(text, box.textColor, dark) }]
    case 'strokeWidthPx':
      return number === undefined ? [] : [{ kind: 'setCommentBoxStrokeWidth', id, strokeWidthPx: number }]
    case 'fillTransparencyPercent':
      return number === undefined
        ? []
        : [{ kind: 'setCommentBoxFillTransparency', id, fillTransparencyPercent: number }]
    default:
      return []
  }
}

type BoxKey = Extract<FieldCommit['key'], { holder: 'commentBox' | 'highlightBox' }>

// see PR-21, PR-22, PR-23, PR-24, PR-25, PR-26, PR-27, PR-28, FR-019
/** @purity pure */
function commandFromBoxColumn(schedule: Schedule, key: BoxKey, text: string, dark: boolean): readonly DocumentCommand[] {
  const id = key.id
  if (key.holder === 'commentBox') {
    const held = schedule.commentBoxes.find((one) => one.id === id)
    return held === undefined ? [] : commandFromCommentBoxColumn(held, key.column, text, dark)
  }
  const box = schedule.highlightBoxes.find((held) => held.id === id)
  return box === undefined ? [] : commandFromHighlightBoxColumn(box, key.column, text, dark)
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

// TRAP: change with setThemeHue's range check in edit-project.ts; no generated bound of S-73 reaches here.
const LOWEST_HUE = 0
const HIGHEST_HUE = 359

const DECIMAL_DIGITS = /^[0-9]+$/

// see FR-041, CM-5, S-73
/** @purity pure */
function commandFromThemeHue(text: string): readonly DocumentCommand[] {
  if (!DECIMAL_DIGITS.test(text)) return []
  const hue = Number(text)
  if (hue < LOWEST_HUE || hue > HIGHEST_HUE) return []
  return [{ kind: 'setThemeHue', hue }]
}

// see FR-035, CM-1, FR-041
/** @purity pure */
function commandFromProjectColumn(column: string, text: string): readonly DocumentCommand[] {
  if (column === 'themeHue') return commandFromThemeHue(text)
  if (column !== 'title') return []
  return [{ kind: 'setProjectTitle', title: text }]
}

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
  // TRAP: ask the roster: a uid gone since the list was drawn writes nothing.
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

// see AS-5, AS-8
/** @purity pure */
function resourceUidOfCommit(schedule: Schedule, text: string, pick: FieldCommit['pick']): number | null {
  return pick === 'candidate' ? resourceUidOfChoice(schedule, text) : resourceUidOfName(schedule, text)
}

// see AS-3, AS-5, AS-7, AS-8, AS-9, AS-10, AS-12, T-225
/** @purity pure */
function commandsFromAssigneeField(
  schedule: Schedule,
  taskUid: number,
  seatedUid: number | null,
  text: string,
  pick: FieldCommit['pick'],
): readonly DocumentCommand[] {
  const settled = settledText(text)
  const onTask = new Set<number | null>(
    schedule.assignments.filter((one) => one.taskUid === taskUid).map((one) => one.resourceUid),
  )
  // TRAP: a line drawn before its person was taken off (UN-15) must write nothing: CM-45 refuses
  // a pair not held, and AG-3 then throws the whole bundle away.
  if (settled === null || (seatedUid !== null && !onTask.has(seatedUid))) return []
  const unseat: readonly DocumentCommand[] =
    seatedUid === null ? [] : [{ kind: 'unassignResource', taskUid, resourceUid: seatedUid }]
  if (settled === UNASSIGN_TOKEN) return unseat

  const held = pick === 'add' ? null : resourceUidOfCommit(schedule, settled, pick)
  if (held !== null) {
    return onTask.has(held) ? [] : [{ kind: 'createAssignment', taskUid, resourceUid: held }, ...unseat]
  }
  if (pick !== 'add') return []

  return [
    { kind: 'createResource', name: settled },
    {
      kind: 'createAssignment',
      taskUid,
      // TRAP: read before the bundle runs; it names the resource CM-40 makes only while nothing
      // ahead of CM-44 in this bundle but CM-40 issues a uid.
      resourceUid: nextIssuedUid(schedule),
    },
    ...unseat,
  ]
}

// see PI-18, T-016
/** @purity pure */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  // see CV-4
  const dark = context.screen.themePreference === 'dark'
  // WHY: the column is the key the panel drew, not worked out again here: the selection may
  // have changed between drawing and commit.
  const key = commit.key

  switch (key.holder) {
    case 'task': {
      const task = taskByUid(schedule, key.uid)
      if (task === null) return []
      const milestoneDay = task.milestone === true ? commandFromMilestoneDay(task, key.column, commit.text) : null
      return milestoneDay ?? commandFromTaskColumn(schedule, task, key.column, commit.text)
    }
    case 'taskVisual':
      return taskByUid(schedule, key.uid) === null
        ? []
        : commandFromVisualColumn(schedule, key.uid, key.column, commit.text, dark)
    case 'taskGroup': {
      const group = schedule.taskGroups.find((held) => held.id === key.groupId)
      return group === undefined ? [] : commandFromGroupColumn(group, key.column, commit.text, dark)
    }
    case 'commentBox':
    case 'highlightBox':
      return commandFromBoxColumn(schedule, key, commit.text, dark)
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
    case 'assignment':
      return taskByUid(schedule, key.taskUid) === null
        ? []
        : commandsFromAssigneeField(schedule, key.taskUid, key.resourceUid, commit.text, commit.pick)
  }
}

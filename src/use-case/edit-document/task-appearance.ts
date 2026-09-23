// Rewrites how a Task looks: its shape, figure, colours, line weight and fades.
// @unit      UF-76   (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  COLUMN_SHAPES,
  calendarDaysBetween,
  dayOf,
  isStoredColour,
  type Task,
  type TaskVisual,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import {
  blankVisual,
  isMilestone,
  sameRow,
  visualOf,
  withSchedule,
  withTask,
  type TaskCommand,
} from './edit-task'

const TRANSPARENT = 'transparent'

/** @purity pure */
function withVisual(document: Document, next: TaskVisual): Document {
  const held = document.schedule.taskVisuals
  const foundAt = held.findIndex((one) => one.taskUid === next.taskUid)
  // TRAP: an absent row compares as blank, or a no-op would append a null row and move the instant.
  const standing = foundAt < 0 ? blankVisual(next.taskUid) : held[foundAt]
  if (standing !== undefined && sameRow(standing, next)) return document
  const taskVisuals = foundAt < 0 ? [...held, next] : held.map((one, index) => (index === foundAt ? next : one))
  return withSchedule(document, { ...document.schedule, taskVisuals })
}

// see FD-6, IV-12
// TRAP: count calendar days; worked days would refuse fades the handle allowed (FD-7).
/** @purity pure */
function fadeSpanOf(task: Task): number | null {
  const start = dayOf(task.start)
  const finish = dayOf(task.finish)
  if (start === null || finish === null) return null
  return calendarDaysBetween(start, finish)
}
// see CM-16, CM-17, FD-7
/** @purity pure */
export function setTaskFadeDays(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskFadeInDays' | 'setTaskFadeOutDays' }>,
  task: Task,
): EditResult {
  const row = command.kind === 'setTaskFadeInDays' ? 'CM-16' : 'CM-17'
  const days = command.days
  if (days !== null) {
    if (!Number.isInteger(days) || days < 0) {
      return refused([reject(row, 'FD-7', `fade days must be a whole number of days, not ${days}`)])
    }
    if (task.finish === null) {
      return refused([reject(row, 'IV-11', 'a task with a fade must have a finish')])
    }
    const span = fadeSpanOf(task)
    const other = command.kind === 'setTaskFadeInDays' ? task.fadeOutDays : task.fadeInDays
    if (span !== null && days + (other ?? 0) > span) {
      return refused([
        reject(row, 'IV-12', `fade of ${days + (other ?? 0)} days does not fit a plan of ${span}`),
      ])
    }
  }
  const faded =
    command.kind === 'setTaskFadeInDays'
      ? { ...task, fadeInDays: days }
      : { ...task, fadeOutDays: days }
  return edited(withTask(document, faded))
}

// see CM-20, FR-083
/** @purity pure */
export function setTaskVisualShapeKind(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskVisualShapeKind' }>,
  task: Task,
): EditResult {
  const schedule = document.schedule
  const visual = visualOf(schedule, command.uid)
  const wanted = command.shapeKind === 'milestone'
  if (isMilestone(task, visual) !== wanted) {
    return refused([
      reject('CM-20', 'FR-083', 'a milestone and a task with a duration are not interchangeable'),
    ])
  }
  return edited(withVisual(document, { ...visual, shapeKind: command.shapeKind }))
}

// see CM-21, FR-078
/** @purity pure */
export function setTaskVisualMilestoneGlyph(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskVisualMilestoneGlyph' }>,
): EditResult {
  const schedule = document.schedule
  // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
  if (
    command.glyph !== null
    && !(COLUMN_SHAPES.TaskVisual.milestoneGlyph?.choices ?? []).includes(command.glyph)
  ) {
    return refused([
      reject('CM-21', 'FR-078', 'the figure is not one of those table T-012 SH-5 names'),
    ])
  }
  const visual = visualOf(schedule, command.uid)
  return edited(withVisual(document, { ...visual, milestoneGlyph: command.glyph }))
}

// see CM-22, IV-9
/** @purity pure */
export function setTaskVisualColors(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskVisualColors' }>,
): EditResult {
  const schedule = document.schedule
  if (command.fillColor === TRANSPARENT && command.strokeColor === TRANSPARENT) {
    return refused([reject('CM-22', 'IV-9', 'the fill and the stroke may not both be transparent')])
  }
  for (const chosen of [command.fillColor, command.strokeColor]) {
    if (chosen !== null && !isStoredColour(chosen, true)) {
      return refused([reject('CM-22', 'CV-1', `not a palette name or a custom colour: ${chosen}`)])
    }
  }
  const visual = visualOf(schedule, command.uid)
  return edited(
    withVisual(document, {
      ...visual,
      fillColor: command.fillColor,
      strokeColor: command.strokeColor,
    }),
  )
}

/** @purity pure */
export function resetTaskVisualColors(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'resetTaskVisualColors' }>,
): EditResult {
  const schedule = document.schedule
  const visual = visualOf(schedule, command.uid)
  return edited(withVisual(document, { ...visual, fillColor: null, strokeColor: null }))
}

/** @purity pure */
export function setTaskVisualLineWeight(
  document: Document,
  command: Extract<TaskCommand, { readonly kind: 'setTaskVisualLineWeight' }>,
): EditResult {
  const schedule = document.schedule
  const visual = visualOf(schedule, command.uid)
  return edited(withVisual(document, { ...visual, lineWeight: command.lineWeight }))
}

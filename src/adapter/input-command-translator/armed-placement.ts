// File: InputCommandTranslator: the armed state (table T-023b) applied to a range or the chosen Tasks.
// @unit      UF-99   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  taskByUid,
  textOfDayEnd,
  textOfDayStart,
  type CalendarDay,
} from '../../entity/document-model/schedule/schedule'
import type { TaskGroupPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  dependencyEndAtPointer,
  dependencyStartOfHit,
  grabSizesOf,
  itemAtPointer,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import { taskUidsIn } from '../../entity/document-model/selection/selection'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import { armedOf } from '../../use-case/advance-screen-session/advance-screen-session'
import { placedTaskSpanOf } from '../../use-case/place-task/place-task'
import type { PointerInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  armedByEntry,
  changed,
  changedAndCreated,
  commentAnchorAt,
  compareDay,
  dayAtX,
  hasDraggedPastThreshold,
  milestoneGlyphOf,
  nextIssuedUid,
  nothingToDo,
  snapMinutesOfView,
  taskGroupAtY,
  taskGroupRankById,
  taskShapeKindOf,
  type Armed,
  type InputContext,
  type PointerPress,
  type TranslatedInput,
} from './input-command-translator'

// Spec: FR-083, IMPS-1889, IMPS-1894, SP-2, SP-3
/** @purity pure */
export function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput {
  const armed = armedByEntry(entry)
  if (armed === null) return CONSUMED_ELSEWHERE
  if (context.selection.items.length === 0) return CONSUMED_ELSEWHERE

  // Why: a mixed selection is not filtered; CM-20 refuses the crossing and AG-3 keeps the bundle
  // atomic, while filtering here would decide a question no row decides.
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    if (one.kind !== 'task') continue
    if (armed.kind === 'taskShapeArmed') {
      const shapeKind = taskShapeKindOf(armed.shapeKind)
      if (shapeKind !== null) commands.push({ kind: 'setTaskVisualShapeKind', taskUid: one.uid, shapeKind })
      continue
    }
    if (armed.kind === 'milestoneShapeArmed') {
      const glyph = milestoneGlyphOf(armed.glyph)
      if (glyph === null) continue
      commands.push({ kind: 'setTaskVisualShapeKind', taskUid: one.uid, shapeKind: 'milestone' })
      commands.push({ kind: 'setTaskVisualMilestoneGlyph', taskUid: one.uid, milestoneGlyph: glyph })
      continue
    }
  }
  return changed(commands)
}

// Spec: UC-004, FR-009, IMPS-342, IMPS-340
/** @purity pure */
export function commandFromDependencyDrag(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const from = dependencyStartOfHit(context.geometry, press.at.x, press.at.y, press.hit)
  if (from === null) return CONSUMED_ELSEWHERE
  const into = dependencyEndAtPointer(context.geometry, release.x, release.y, null)
  if (into === null) return CONSUMED_ELSEWHERE
  // Why: no `linkType` here; `edit-dependency.ts` maps the edges through T-018, a second entrance FR-009 refuses.
  return changed([
    {
      kind: 'createDependency',
      predecessorUid: from.taskUid,
      successorUid: into.taskUid,
      predecessorEdge: from.edge,
      successorEdge: into.edge,
    },
  ])
}

// Spec: FR-135, PTL-5, PTL-6, PTL-7, PTL-8, PTL-9, IMPS-1400, IMPS-1417, IMPS-1419, IMPS-1420, IMPS-1424, IMPS-695
// Why: one call holds every child's CM-18, so one refused child refuses them all and one undo step undoes them all.
/** @purity pure */
export function commandFromParentTaskDrag(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const from = press.hit?.item
  if (from === undefined || from.kind !== 'task' || !hasDraggedPastThreshold(press, release)) return CONSUMED_ELSEWHERE
  const into = itemAtPointer(context.geometry, release.x, release.y, grabSizesOf())?.item
  if (into === undefined || into.kind !== 'task') return CONSUMED_ELSEWHERE
  const parent = taskByUid(context.document.schedule, into.taskUid)
  if (parent === null) return CONSUMED_ELSEWHERE
  if (parent.milestone === true) return nothingToDo('milestoneCannotBeAParent')
  const chosen = taskUidsIn(context.selection)
  const children = chosen.includes(from.taskUid) ? chosen : [from.taskUid]
  return changed(children.map((uid) => ({ kind: 'setTaskParentTask', taskUid: uid, parentTaskUid: parent.uid })))
}

// Spec: PTL-10, PTL-12, RS-70, IMPS-1424
/** @purity pure */
export function commandFromParentTaskLinkRelease(release: PointerInput, press: PointerPress): TranslatedInput {
  const item = press.hit?.item
  if (item === undefined || item.kind !== 'parentTaskLink' || hasDraggedPastThreshold(press, release)) return CONSUMED_ELSEWHERE
  return item.isStated ? CONSUMED_ELSEWHERE : nothingToDo('derivedParentCannotBePicked')
}

// Spec: AR-5, FR-019, IMPS-825
/** @purity pure */
function commentBoxPlacement(context: InputContext, press: PointerPress): TranslatedInput {
  const placed = commentAnchorAt(context.layout, context.geometry, press.at.x, press.at.y)
  if (!('anchor' in placed)) return placed
  const id = context.newCommentBoxId
  return changedAndCreated([[{ kind: 'createCommentBox', commentBoxId: id, anchor: placed.anchor }]], { kind: 'commentBox', id })
}

type TaskShapeArmed = Extract<Armed, { readonly kind: 'taskShapeArmed' | 'milestoneShapeArmed' }>

interface ArmedDrag {
  readonly press: PointerPress
  readonly release: PointerInput
  readonly armed: TaskShapeArmed
}

interface DraggedDays {
  readonly from: CalendarDay
  readonly early: CalendarDay
  readonly late: CalendarDay
  readonly taskGroupId: string
  readonly dragged: boolean
}

// Spec: PTD-4, FR-001, TC-1, TC-3, AR-2, AR-3, TC-10, TC-6, TC-7, TC-8
/** @purity pure */
function createdTaskWrite(context: InputContext, drag: ArmedDrag, days: DraggedDays): TranslatedInput {
  const { armed } = drag
  const named = armed.kind === 'taskShapeArmed' ? armed.shapeKind : 'milestone'
  const shapeKind = taskShapeKindOf(named)
  if (shapeKind === null) return CONSUMED_ELSEWHERE
  const isMilestone = shapeKind === 'milestone'
  if (!isMilestone && !days.dragged) return nothingToDo('barShapeReleasedWithoutADrag')
  const pull = {
    pressX: drag.press.at.x,
    releaseX: drag.release.x,
    snapMinutes: snapMinutesOfView(context),
    from: days.from,
    early: days.early,
    late: days.late,
  }
  const span = placedTaskSpanOf(context.layout, context.document.schedule.project, pull, isMilestone)
  const commands: DocumentCommand[] = [
    {
      kind: 'createTask',
      shapeKind,
      start: span.start,
      finish: span.finish,
      taskGroupId: days.taskGroupId,
    },
  ]
  const glyph = armed.kind === 'milestoneShapeArmed' ? milestoneGlyphOf(armed.glyph) : null
  if (glyph !== null) {
    commands.push({ kind: 'setTaskVisualMilestoneGlyph', taskUid: nextIssuedUid(context.document.schedule), milestoneGlyph: glyph })
  }
  return changedAndCreated([commands], { kind: 'task', uid: nextIssuedUid(context.document.schedule) })
}

// Spec: PTD-4, FR-001, FR-019, IMPS-839, IMPS-840, TC-6
/** @purity pure */
export function commandFromArmed(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const armed = armedOf(context.screen.armModeState)
  if (armed === null) return CONSUMED_ELSEWHERE
  const from = dayAtX(context.layout, press.at.x)
  const to = dayAtX(context.layout, release.x)
  const taskGroup = taskGroupAtY(context.layout, press.at.y)
  if (from === null || to === null) return CONSUMED_ELSEWHERE
  const taskGroupId = taskGroup === null ? context.newTaskGroupId : taskGroup.taskGroupId
  const early = compareDay(from, to) <= 0 ? from : to
  const late = compareDay(from, to) <= 0 ? to : from
  const dragged = hasDraggedPastThreshold(press, release)

  if (armed.kind === 'taskShapeArmed' || armed.kind === 'milestoneShapeArmed') {
    return createdTaskWrite(context, { press, release, armed }, { from, early, late, taskGroupId, dragged })
  }

  if (armed.kind === 'commentBoxArmed') return commentBoxPlacement(context, press)

  if (armed.kind === 'highlightBoxArmed' && dragged) return highlightBoxPlacement(context, release, taskGroup, { early, late })
  return CONSUMED_ELSEWHERE
}

// Spec: PTD-4, FR-019, AR-6, IMPS-1563, IMPS-843, IMPS-825, IMPS-840
/** @purity pure */
function highlightBoxPlacement(
  context: InputContext,
  release: PointerInput,
  taskGroup: TaskGroupPlacement | null,
  days: Pick<DraggedDays, 'early' | 'late'>,
): TranslatedInput {
  const releaseTaskGroup = taskGroupAtY(context.layout, release.y)
  if (taskGroup === null || releaseTaskGroup === null) return nothingToDo('noTaskGroupToPutTheAnnotationOn')

  // Trap: rank task groups by tree order, not TaskGroupPlacement.y: once FR-098 pins a task group,
  // comparing y writes pairs IV-19 refuses.
  const rankById = taskGroupRankById(context.document.schedule.taskGroups)
  const pressRank = rankById.get(taskGroup.taskGroupId) ?? 0
  const releaseRank = rankById.get(releaseTaskGroup.taskGroupId) ?? 0
  const isPressAbove = pressRank <= releaseRank
  const top = isPressAbove ? taskGroup : releaseTaskGroup
  const bottom = isPressAbove ? releaseTaskGroup : taskGroup
  return changed([
    {
      kind: 'createHighlightBox',
      highlightBoxId: context.newHighlightBoxId,
      range: {
        start: textOfDayStart(days.early),
        finish: textOfDayEnd(days.late),
        topTaskGroupId: top.taskGroupId,
        bottomTaskGroupId: bottom.taskGroupId,
      },
    },
  ])
}

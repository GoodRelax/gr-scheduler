// InputCommandTranslator -- the armed state (table T-023b) applied to a range or the chosen Tasks.
// @unit      UF-99   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  MINUTES_PER_CALENDAR_DAY,
  taskByUid,
  textOfDayEnd,
  textOfDayStart,
  textOfFinishSide,
  textOfInstant,
  textOfStartSide,
  type CalendarDay,
} from '../../entity/document-model/schedule/schedule'
import { snappedInstantAtX, type TaskGroupPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  dependencyEndAtPointer,
  dependencyStartOfHit,
  grabSizesOf,
  itemAtPointer,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import { taskUidsIn } from '../../entity/document-model/selection/selection'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import { armedOf } from '../../use-case/advance-screen-session/advance-screen-session'
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
  releasedSnapOf,
  taskGroupAtY,
  taskGroupRankById,
  taskShapeKindOf,
  type Armed,
  type InputContext,
  type PointerPress,
  type TranslatedInput,
} from './input-command-translator'

// see FR-083
/** @purity pure */
export function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput {
  const armed = armedByEntry(entry)
  if (armed === null) return CONSUMED_ELSEWHERE
  if (context.selection.items.length === 0) return CONSUMED_ELSEWHERE

  // WHY: a mixed selection is not filtered; CM-20 refuses the crossing and AG-3 keeps the bundle
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

// see UC-004, FR-009
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
  // WHY: no `linkType` here; `edit-dependency.ts` maps the edges through T-018, a second entrance FR-009 refuses.
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

// see FR-135, PTL-5, PTL-6, PTL-7, PTL-8, PTL-9, JDG-1138
// WHY: one call holds every child's CM-18, so one refused child refuses them all and one undo step undoes them all.
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

// see PTL-10, PTL-12, RS-70
/** @purity pure */
export function commandFromParentTaskLinkRelease(release: PointerInput, press: PointerPress): TranslatedInput {
  const item = press.hit?.item
  if (item === undefined || item.kind !== 'parentTaskLink' || hasDraggedPastThreshold(press, release)) return CONSUMED_ELSEWHERE
  return item.isStated ? CONSUMED_ELSEWHERE : nothingToDo('derivedParentCannotBePicked')
}

// see AR-5, FR-019
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

// see PTD-4, FR-001, TC-1, TC-3
/** @purity pure */
function createdTaskWrite(context: InputContext, drag: ArmedDrag, days: DraggedDays): TranslatedInput {
  const { armed } = drag
  const named = armed.kind === 'taskShapeArmed' ? armed.shapeKind : 'milestone'
  const shapeKind = taskShapeKindOf(named)
  if (shapeKind === null) return CONSUMED_ELSEWHERE
  const isMilestone = shapeKind === 'milestone'
  if (!isMilestone && !days.dragged) return nothingToDo('barShapeReleasedWithoutADrag')
  const project = context.document.schedule.project
  const fine = createdSpanOnFineSnap(context, drag, isMilestone)
  const commands: DocumentCommand[] = [
    {
      kind: 'createTask',
      shapeKind,
      start: fine?.start ?? textOfStartSide(isMilestone ? days.from : days.early, project, isMilestone),
      finish: fine?.finish ?? textOfFinishSide(isMilestone ? days.from : days.late, project),
      taskGroupId: days.taskGroupId,
    },
  ]
  const glyph = armed.kind === 'milestoneShapeArmed' ? milestoneGlyphOf(armed.glyph) : null
  if (glyph !== null) {
    commands.push({ kind: 'setTaskVisualMilestoneGlyph', taskUid: nextIssuedUid(context.document.schedule), milestoneGlyph: glyph })
  }
  return changedAndCreated([commands], { kind: 'task', uid: nextIssuedUid(context.document.schedule) })
}

// see FR-001, FR-103, T-378, JDG-2422
// WHY: finer than a day the press and the release are snapped instants, as a grabbed end is; a pull inside one unit spans one unit.
/** @purity pure */
function createdSpanOnFineSnap(
  context: InputContext,
  drag: ArmedDrag,
  isMilestone: boolean,
): { readonly start: string; readonly finish: string } | null {
  const { press, release } = drag
  const snap = releasedSnapOf(context, release)
  if (snap >= MINUTES_PER_CALENDAR_DAY) return null
  const from = snappedInstantAtX(context.layout, press.at.x, snap)
  const to = snappedInstantAtX(context.layout, release.x, snap)
  if (from === null || to === null) return null
  if (isMilestone) return { start: textOfInstant(from), finish: textOfInstant(from) }
  const isLeftward = release.x < press.at.x
  const early = from !== to ? Math.min(from, to) : isLeftward ? from - snap : from
  const late = from !== to ? Math.max(from, to) : isLeftward ? from : from + snap
  return { start: textOfInstant(early), finish: textOfInstant(late) }
}

// see PTD-4, FR-001, FR-019
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

// see PTD-4, FR-019
/** @purity pure */
function highlightBoxPlacement(
  context: InputContext,
  release: PointerInput,
  taskGroup: TaskGroupPlacement | null,
  days: Pick<DraggedDays, 'early' | 'late'>,
): TranslatedInput {
  const releaseTaskGroup = taskGroupAtY(context.layout, release.y)
  if (taskGroup === null || releaseTaskGroup === null) return nothingToDo('noTaskGroupToPutTheAnnotationOn')

  // TRAP: rank task groups by tree order, not TaskGroupPlacement.y: once FR-098 pins a task group,
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

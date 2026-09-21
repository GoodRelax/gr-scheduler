// InputCommandTranslator -- the armed state (table T-023b) applied to a range or the chosen Tasks.
// @unit      UF-99   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { textOfDay } from '../../entity/document-model/schedule/schedule'
import {
  dependencyEndAtPointer,
  dependencyStartOfHit,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
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
  rowAtY,
  taskGroupRankById,
  taskShapeKindOf,
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
    if (armed.kind === 'taskShape') {
      const shapeKind = taskShapeKindOf(armed.shapeKind)
      if (shapeKind !== null) commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind })
      continue
    }
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      if (glyph === null) continue
      commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind: 'milestone' })
      commands.push({ kind: 'setTaskVisualMilestoneGlyph', uid: one.uid, glyph })
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

// see PTD-4, FR-001, FR-019
/** @purity pure */
export function commandFromArmed(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const armed = context.screenState.armed
  const from = dayAtX(context.layout, press.at.x)
  const to = dayAtX(context.layout, release.x)
  const row = rowAtY(context.layout, press.at.y)
  if (from === null || to === null) return CONSUMED_ELSEWHERE
  const groupId = row === null ? context.newGroupId : row.groupId
  const early = compareDay(from, to) <= 0 ? from : to
  const late = compareDay(from, to) <= 0 ? to : from
  const dragged = hasDraggedPastThreshold(press, release)

  if (armed.kind === 'taskShape' || armed.kind === 'milestoneShape') {
    const named = armed.kind === 'taskShape' ? armed.shapeKind : 'milestone'
    const shapeKind = taskShapeKindOf(named)
    if (shapeKind === null) return CONSUMED_ELSEWHERE
    const isMilestone = shapeKind === 'milestone'
    if (!isMilestone && !dragged) return nothingToDo('barShapeReleasedWithoutADrag')
    const start = isMilestone ? from : early
    const finish = isMilestone ? from : late
    const commands: DocumentCommand[] = [
      {
        kind: 'createTask',
        shapeKind,
        start: textOfDay(start),
        finish: textOfDay(finish),
        groupId,
      },
    ]
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      if (glyph !== null) {
        commands.push({
          kind: 'setTaskVisualMilestoneGlyph',
          uid: nextIssuedUid(context.document.schedule),
          glyph,
        })
      }
    }
    return changedAndCreated([commands], {
      kind: 'task',
      uid: nextIssuedUid(context.document.schedule),
    })
  }

  if (armed.kind === 'commentBox') {
    const anchor = commentAnchorAt(context.layout, press.at.x, press.at.y)
    if (!('groupId' in anchor)) return anchor
    return changed([{ kind: 'createCommentBox', id: context.newCommentBoxId, anchor }])
  }

  if (armed.kind === 'highlightBox') {
    if (!dragged) return CONSUMED_ELSEWHERE

    const releaseRow = rowAtY(context.layout, release.y)
    if (row === null || releaseRow === null) return nothingToDo('noRowToPutTheAnnotationOn')

    // TRAP: rank rows by tree order, not RowPlacement.y: once FR-098 pins a row,
    // comparing y writes pairs IV-19 refuses.
    const rankById = taskGroupRankById(context.document.schedule.taskGroups)
    const pressRank = rankById.get(row.groupId) ?? 0
    const releaseRank = rankById.get(releaseRow.groupId) ?? 0
    const isPressAbove = pressRank <= releaseRank
    const top = isPressAbove ? row : releaseRow
    const bottom = isPressAbove ? releaseRow : row
    return changed([
      {
        kind: 'createHighlightBox',
        id: context.newHighlightBoxId,
        range: {
          startDate: textOfDay(early),
          endDate: textOfDay(late),
          topGroupId: top.groupId,
          bottomGroupId: bottom.groupId,
        },
      },
    ])
  }

  return CONSUMED_ELSEWHERE
}

// EditDocument's annotation aggregate: comment boxes and highlight boxes.
// @unit      UF-14  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { CommentBox, HighlightBox, Schedule } from '../../entity/document-model/schedule/schedule'
import {
  commentBoxShownDateOf,
  dayOf,
  instantOf,
  isSameDay,
  isStoredColor,
  TRANSPARENT,
} from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'

export type CommentBoxLeaderShapeKind = NonNullable<CommentBox['leaderShapeKind']>

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, AnnotationCommand).
// see T-108
export interface AnnotationAnchor {
  readonly date: NonNullable<CommentBox['anchorDate']>
  readonly taskGroupId: NonNullable<CommentBox['anchorTaskGroupId']>
  readonly bandFraction?: CommentBox['anchorBandFraction']
  readonly taskUid?: CommentBox['anchorTaskUid']
  readonly taskFigure?: CommentBox['anchorTaskFigure']
  readonly highlightBoxId?: CommentBox['anchorHighlightBoxId']
  readonly snapPoint?: CommentBox['anchorSnapPoint']
}

// see T-108
export interface HighlightRange {
  readonly start: NonNullable<HighlightBox['start']>
  readonly finish: NonNullable<HighlightBox['finish']>
  readonly topTaskGroupId: NonNullable<HighlightBox['topTaskGroupId']>
  readonly bottomTaskGroupId: NonNullable<HighlightBox['bottomTaskGroupId']>
}

// see T-108
export type AnnotationCommand =
  | {
      readonly kind: 'createCommentBox'
      readonly commentBoxId: CommentBox['id']
      readonly anchor: AnnotationAnchor
    }
  | { readonly kind: 'deleteCommentBox'; readonly commentBoxId: CommentBox['id'] }
  | {
      readonly kind: 'setCommentBoxText'
      readonly commentBoxId: CommentBox['id']
      readonly text: CommentBox['text']
    }
  | {
      readonly kind: 'setCommentBoxLeaderShapeKind'
      readonly commentBoxId: CommentBox['id']
      readonly leaderShapeKind: NonNullable<CommentBox['leaderShapeKind']>
    }
  | {
      readonly kind: 'setCommentBoxAnchor'
      readonly commentBoxId: CommentBox['id']
      readonly anchor: AnnotationAnchor
    }
  | {
      readonly kind: 'setCommentBoxBodyOffsetPx'
      readonly commentBoxId: CommentBox['id']
      readonly dx: number
      readonly dy: number
    }
  | {
      readonly kind: 'setCommentBoxStrokeColor'
      readonly commentBoxId: CommentBox['id']
      readonly strokeColor: CommentBox['strokeColor']
    }
  | {
      readonly kind: 'setCommentBoxStrokeWidthPx'
      readonly commentBoxId: CommentBox['id']
      readonly strokeWidthPx: CommentBox['strokeWidthPx']
    }
  | {
      readonly kind: 'setCommentBoxFillColor'
      readonly commentBoxId: CommentBox['id']
      readonly fillColor: CommentBox['fillColor']
    }
  | {
      readonly kind: 'setCommentBoxFillTransparencyPercent'
      readonly commentBoxId: CommentBox['id']
      readonly fillTransparencyPercent: CommentBox['fillTransparencyPercent']
    }
  | {
      readonly kind: 'setCommentBoxTextColor'
      readonly commentBoxId: CommentBox['id']
      readonly textColor: CommentBox['textColor']
    }
  | { readonly kind: 'bringCommentBoxToFront'; readonly commentBoxId: CommentBox['id'] }
  | {
      readonly kind: 'createHighlightBox'
      readonly highlightBoxId: HighlightBox['id']
      readonly range: HighlightRange
    }
  | { readonly kind: 'deleteHighlightBox'; readonly highlightBoxId: HighlightBox['id'] }
  | {
      readonly kind: 'setHighlightBoxRange'
      readonly highlightBoxId: HighlightBox['id']
      readonly range: HighlightRange
    }
  | {
      readonly kind: 'setHighlightBoxStrokeColor'
      readonly highlightBoxId: HighlightBox['id']
      readonly strokeColor: HighlightBox['strokeColor']
    }
  | {
      readonly kind: 'setHighlightBoxStrokeWidthPx'
      readonly highlightBoxId: HighlightBox['id']
      readonly strokeWidthPx: HighlightBox['strokeWidthPx']
    }
  | {
      readonly kind: 'setHighlightBoxFillColor'
      readonly highlightBoxId: HighlightBox['id']
      readonly fillColor: HighlightBox['fillColor']
    }
  | {
      readonly kind: 'setHighlightBoxFillTransparencyPercent'
      readonly highlightBoxId: HighlightBox['id']
      readonly fillTransparencyPercent: HighlightBox['fillTransparencyPercent']
    }
  | { readonly kind: 'bringHighlightBoxToFront'; readonly highlightBoxId: HighlightBox['id'] }
// </generated>

// see FR-019, CV-1
// WHY: the outline takes transparent (no line); the pair with the fill is IV-9's, checked on the result.
/** @purity pure */
function boxStrokeRefusal(strokeColor: string | null): Refusal | null {
  if (strokeColor === null || isStoredColor(strokeColor, true)) return null
  return reject('CM-55', 'CV-1', `not a palette name or a custom color: ${strokeColor}`)
}

// see IV-9, FR-019, FR-007
/** @purity pure */
function boxDrawnWithNothing(box: HighlightBox): boolean {
  return box.fillColor === TRANSPARENT && box.strokeColor === TRANSPARENT
}

// see CV-1, CV-9
/** @purity pure */
function lookColorRefusal(command: string, color: string | null, allowsTransparent: boolean): Refusal | null {
  if (color === null || isStoredColor(color, allowsTransparent)) return null
  return reject(command, 'CV-1', `not a palette name or a custom color: ${color}`)
}

type AnnotationNumberRow = keyof typeof NOT_STORED_ANNOTATION_BOUNDS

// see T-217, FR-019
// WHY: refused, not clamped: a clamped write would store a value other than the one the command placed.
/** @purity pure */
function lookNumberRefusal(command: string, row: AnnotationNumberRow, value: number | null): Refusal | null {
  if (value === null) return null
  const { min, max } = NOT_STORED_ANNOTATION_BOUNDS[row]
  if (Number.isInteger(value) && value >= min && value <= max) return null
  return reject(command, row, `not a whole number from ${min} to ${max}: ${value}`)
}

/** @purity pure */
function withScheduleParts(document: Document, part: Partial<Schedule>): Document {
  return { ...document, schedule: { ...document.schedule, ...part } }
}

/** @purity pure */
function commentBoxOf(document: Document, id: string): CommentBox | null {
  return document.schedule.commentBoxes.find((one) => one.id === id) ?? null
}

/** @purity pure */
function highlightBoxOf(document: Document, id: string): HighlightBox | null {
  return document.schedule.highlightBoxes.find((one) => one.id === id) ?? null
}

/** @purity pure */
function putCommentBox(document: Document, box: CommentBox): Document {
  const boxes = document.schedule.commentBoxes.map((one) => (one.id === box.id ? box : one))
  return withScheduleParts(document, { commentBoxes: boxes })
}

/** @purity pure */
function putHighlightBox(document: Document, box: HighlightBox): Document {
  const boxes = document.schedule.highlightBoxes.map((one) => (one.id === box.id ? box : one))
  return withScheduleParts(document, { highlightBoxes: boxes })
}

/** @purity pure */
function hasGroup(document: Document, taskGroupId: string): boolean {
  return document.schedule.taskGroups.some((one) => one.id === taskGroupId)
}

// see FR-019, CM-46, CM-50
// WHY: a key the anchor leaves out is written as null, so a free point never keeps a target it no longer stands on.
/** @purity pure */
export function anchorColumnsOf(anchor: AnnotationAnchor) {
  return {
    anchorDate: anchor.date as CommentBox['anchorDate'],
    anchorTaskGroupId: anchor.taskGroupId as CommentBox['anchorTaskGroupId'],
    anchorBandFraction: anchor.bandFraction ?? null,
    anchorTaskUid: anchor.taskUid ?? null,
    anchorTaskFigure: anchor.taskFigure ?? null,
    anchorHighlightBoxId: anchor.highlightBoxId ?? null,
    anchorSnapPoint: anchor.snapPoint ?? null,
  }
}

export type CommentAnchorColumns = ReturnType<typeof anchorColumnsOf>

/** @purity pure */
function isSameAnchor(box: CommentBox, columns: CommentAnchorColumns): boolean {
  return (
    instantOf(box.anchorDate) === instantOf(columns.anchorDate) &&
    box.anchorTaskGroupId === columns.anchorTaskGroupId &&
    (box.anchorBandFraction ?? null) === columns.anchorBandFraction &&
    (box.anchorTaskUid ?? null) === columns.anchorTaskUid &&
    (box.anchorTaskFigure ?? null) === columns.anchorTaskFigure &&
    (box.anchorHighlightBoxId ?? null) === columns.anchorHighlightBoxId &&
    (box.anchorSnapPoint ?? null) === columns.anchorSnapPoint
  )
}

/** @purity pure */
function anchorRefusals(command: string, document: Document, anchor: AnnotationAnchor): Refusal[] {
  const found: Refusal[] = []
  if (dayOf(anchor.date) === null) {
    found.push(reject(command, 'AT-113', `the anchored day is not a date: ${anchor.date}`))
  }
  if (!hasGroup(document, anchor.taskGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${anchor.taskGroupId} (RL-18)`))
  }
  found.push(...anchorTargetRefusals(command, document, anchorColumnsOf(anchor)))
  return found
}

// see FR-019, AT-163, AT-164, AT-165, AT-166, AT-167
// WHY: refused, not repaired: a command that names half a target would store a tip that draws as a free point.
/** @purity pure */
function anchorTargetRefusals(command: string, document: Document, columns: CommentAnchorColumns): Refusal[] {
  const found: Refusal[] = []
  const fraction = columns.anchorBandFraction
  if (fraction !== null && !(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1)) {
    found.push(reject(command, 'AT-163', `not a height from 0 to 1 within the band: ${fraction}`))
  }
  const { anchorTaskUid: taskUid, anchorHighlightBoxId: highlightBoxId } = columns
  if (taskUid !== null && !document.schedule.tasks.some((one) => one.uid === taskUid)) {
    found.push(reject(command, 'IV-2', `the document holds no task with uid ${taskUid} (RL-33)`))
  }
  if (highlightBoxId !== null && highlightBoxOf(document, highlightBoxId) === null) {
    found.push(reject(command, 'IV-2', `the document holds no highlight box with id ${highlightBoxId} (RL-34)`))
  }
  if (taskUid !== null && highlightBoxId !== null) {
    found.push(reject(command, 'AT-166', 'a tip snaps to a task or to a highlight box, never to both'))
  }
  if ((taskUid === null) !== (columns.anchorTaskFigure === null)) {
    found.push(reject(command, 'AT-165', 'a task and its figure are named together'))
  }
  if ((taskUid === null && highlightBoxId === null) !== (columns.anchorSnapPoint === null)) {
    found.push(reject(command, 'AT-167', 'a snap point is named exactly when a target is'))
  }
  return found
}

export interface ReleasedTargets {
  readonly taskUids: ReadonlySet<number>
  readonly highlightBoxIds: ReadonlySet<string>
  // WHY: a task-group delete also drops the bands a released tip could fall to; such a tip keeps its held band.
  readonly isKeptTaskGroup: (taskGroupId: string) => boolean
}

// see FR-019, CM-7, CM-53
// WHY: released inside the deleting command, so one undo brings back the target and the tip together (FR-031);
// read on the schedule before the delete, while the target is still there to say where it stood.
/** @purity pure */
export function commentBoxesReleasedFrom(schedule: Schedule, gone: ReleasedTargets): readonly CommentBox[] {
  let isChanged = false
  const boxes = schedule.commentBoxes.map((box) => {
    const released = releasedAnchorOf(schedule, box, gone)
    if (released === null) return box
    isChanged = true
    return { ...box, ...released }
  })
  return isChanged ? boxes : schedule.commentBoxes
}

type SnapPoint = NonNullable<CommentBox['anchorSnapPoint']>

// see FR-019
// WHY: the instant and the band come from the document's own dates; the height within the band stays as it was
// when the tip snapped, since only the layout knows where a bar stands inside its band.
/** @purity pure */
function releasedAnchorOf(schedule: Schedule, box: CommentBox, gone: ReleasedTargets): CommentAnchorColumns | null {
  const taskUid = box.anchorTaskUid ?? null
  const highlightBoxId = box.anchorHighlightBoxId ?? null
  const isTaskGone = taskUid !== null && gone.taskUids.has(taskUid)
  const isHighlightGone = highlightBoxId !== null && gone.highlightBoxIds.has(highlightBoxId)
  if (!isTaskGone && !isHighlightGone) return null
  const held: CommentAnchorColumns = {
    anchorDate: box.anchorDate,
    anchorTaskGroupId: box.anchorTaskGroupId,
    anchorBandFraction: box.anchorBandFraction ?? null,
    anchorTaskUid: null,
    anchorTaskFigure: null,
    anchorHighlightBoxId: null,
    anchorSnapPoint: null,
  }
  const point = box.anchorSnapPoint ?? null
  if (point === null) return held
  const anchorDate = commentBoxShownDateOf(schedule, box)
  if (isTaskGone) return { ...held, anchorDate, anchorTaskGroupId: taskBandOf(schedule, taskUid, held.anchorTaskGroupId, gone) }
  const highlight = schedule.highlightBoxes.find((one) => one.id === highlightBoxId)
  return highlight === undefined ? { ...held, anchorDate } : releasedFromHighlight({ ...held, anchorDate }, highlight, point, gone)
}

// see FR-019
// WHY: the band the tip snapped in while the Task still sits there, else the Task's first band that stays.
/** @purity pure */
function taskBandOf(schedule: Schedule, uid: number, held: string | null, gone: ReleasedTargets): string | null {
  const bands = schedule.taskGroupMembers.filter((one) => one.taskUid === uid).map((one) => one.taskGroupId)
  if (held !== null && bands.includes(held)) return held
  return bands.find((one) => gone.isKeptTaskGroup(one)) ?? held
}

// see FR-019, LF-15
// WHY: a top or bottom point stands on the box's own top or bottom band, at that band's edge.
/** @purity pure */
function releasedFromHighlight(
  held: CommentAnchorColumns,
  highlight: HighlightBox,
  point: SnapPoint,
  gone: ReleasedTargets,
): CommentAnchorColumns {
  const isTop = point.startsWith('top')
  const rowTaskGroupId = isTop ? highlight.topTaskGroupId : point.startsWith('bottom') ? highlight.bottomTaskGroupId : null
  if (rowTaskGroupId === null || !gone.isKeptTaskGroup(rowTaskGroupId)) return held
  return { ...held, anchorTaskGroupId: rowTaskGroupId, anchorBandFraction: isTop ? 0 : 1 }
}

type FrontCommand = Extract<AnnotationCommand, { kind: 'bringCommentBoxToFront' | 'bringHighlightBoxToFront' }>

// see FR-019, CM-100, CM-101, ZO-8, ZO-9
// WHY: the array order is the drawing order (later in front), so the box moves to the end; already last is no edit.
/** @purity pure */
function broughtToFront(document: Document, command: FrontCommand): EditResult {
  return command.kind === 'bringCommentBoxToFront'
    ? commentBoxToFront(document, command.commentBoxId)
    : highlightBoxToFront(document, command.highlightBoxId)
}

/** @purity pure */
function commentBoxToFront(document: Document, id: string): EditResult {
  const box = commentBoxOf(document, id)
  if (box === null) return refused([reject('CM-100', 'AT-110', `no comment box with id ${id}`)])
  const moved = movedToEnd(document.schedule.commentBoxes, box)
  return moved === null ? edited(document) : edited(withScheduleParts(document, { commentBoxes: moved }))
}

/** @purity pure */
function highlightBoxToFront(document: Document, id: string): EditResult {
  const box = highlightBoxOf(document, id)
  if (box === null) return refused([reject('CM-101', 'AT-116', `no highlight box with id ${id}`)])
  const moved = movedToEnd(document.schedule.highlightBoxes, box)
  return moved === null ? edited(document) : edited(withScheduleParts(document, { highlightBoxes: moved }))
}

/** @purity pure */
function movedToEnd<Item>(list: readonly Item[], item: Item): readonly Item[] | null {
  if (list[list.length - 1] === item) return null
  return [...list.filter((one) => one !== item), item]
}

/** @purity pure */
function rangeRefusals(command: string, document: Document, range: HighlightRange): Refusal[] {
  const found: Refusal[] = []
  if (dayOf(range.start) === null) {
    found.push(reject(command, 'AT-117', `the left edge is not a date: ${range.start}`))
  }
  if (dayOf(range.finish) === null) {
    found.push(reject(command, 'AT-118', `the right edge is not a date: ${range.finish}`))
  }
  if (!hasGroup(document, range.topTaskGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${range.topTaskGroupId} (RL-19)`))
  }
  if (!hasGroup(document, range.bottomTaskGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${range.bottomTaskGroupId} (RL-20)`))
  }
  return found
}

// TRAP: a no-op must return edited(document) itself: document-change-plan.ts compares the
// schedule by reference, so a rebuilt one moves the schedule instant.
// see T-108, FR-019
/** @purity pure */
export function editAnnotation(document: Document, command: AnnotationCommand): EditResult {
  if (isCommentBoxLookCommand(command)) return editCommentBoxLook(document, command)
  if (command.kind === 'bringCommentBoxToFront' || command.kind === 'bringHighlightBoxToFront') return broughtToFront(document, command)
  if (isHighlightBoxLookCommand(command)) return editHighlightBoxLook(document, command)
  const schedule = document.schedule

  switch (command.kind) {
    case 'createCommentBox': {
      const refusals: Refusal[] = []
      if (commentBoxOf(document, command.commentBoxId) !== null) {
        refusals.push(reject('CM-46', 'IV-1', `a comment box with id ${command.commentBoxId} is already here`))
      }
      refusals.push(...anchorRefusals('CM-46', document, command.anchor))
      if (refusals.length > 0) return refused(refusals)
      const box: CommentBox = {
        id: command.commentBoxId,
        leaderShapeKind: null,
        text: null,
        ...anchorColumnsOf(command.anchor),
        // see S-600, LF-17
        // WHY: up and right of the tip, so the tip and its leader stand out at the lower left; at 0 no leader is drawn.
        bodyOffsetPx: { dx: NOT_STORED_ANNOTATION_SIZES['S-600'], dy: -NOT_STORED_ANNOTATION_SIZES['S-600'] },
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
      }
      return edited(withScheduleParts(document, { commentBoxes: [...schedule.commentBoxes, box] }))
    }

    case 'deleteCommentBox': {
      const box = commentBoxOf(document, command.commentBoxId)
      if (box === null) {
        return refused([reject('CM-47', 'AT-110', `no comment box with id ${command.commentBoxId}`)])
      }
      return edited(
        withScheduleParts(document, { commentBoxes: schedule.commentBoxes.filter((one) => one !== box) }),
      )
    }

    case 'setCommentBoxAnchor': {
      const box = commentBoxOf(document, command.commentBoxId)
      if (box === null) {
        return refused([reject('CM-50', 'AT-110', `no comment box with id ${command.commentBoxId}`)])
      }
      const refusals = anchorRefusals('CM-50', document, command.anchor)
      if (refusals.length > 0) return refused(refusals)
      const columns = anchorColumnsOf(command.anchor)
      if (isSameAnchor(box, columns)) return edited(document)
      return edited(putCommentBox(document, { ...box, ...columns }))
    }

    case 'setCommentBoxBodyOffsetPx': {
      const box = commentBoxOf(document, command.commentBoxId)
      if (box === null) {
        return refused([reject('CM-51', 'AT-110', `no comment box with id ${command.commentBoxId}`)])
      }
      if (!Number.isFinite(command.dx) || !Number.isFinite(command.dy)) {
        return refused([reject('CM-51', 'AT-115', 'the offset must be two finite numbers')])
      }
      const held = box.bodyOffsetPx
      if (held !== null && held.dx === command.dx && held.dy === command.dy) {
        return edited(document)
      }
      return edited(putCommentBox(document, { ...box, bodyOffsetPx: { dx: command.dx, dy: command.dy } }))
    }

    case 'createHighlightBox': {
      const refusals: Refusal[] = []
      if (highlightBoxOf(document, command.highlightBoxId) !== null) {
        refusals.push(reject('CM-52', 'IV-1', `a highlight box with id ${command.highlightBoxId} is already here`))
      }
      refusals.push(...rangeRefusals('CM-52', document, command.range))
      if (refusals.length > 0) return refused(refusals)
      const box: HighlightBox = {
        id: command.highlightBoxId,
        start: command.range.start,
        finish: command.range.finish,
        topTaskGroupId: command.range.topTaskGroupId,
        bottomTaskGroupId: command.range.bottomTaskGroupId,
        strokeColor: null,
        cornerRadiusPx: NOT_STORED_ANNOTATION_SIZES['S-132'],
        strokeWidthPx: null,
        // WHY: placed unfilled (S-370); a null fill would paint the theme color (FR-019).
        fillColor: NOT_STORED_ANNOTATION_SIZES['S-370'],
        fillTransparencyPercent: null,
      }
      return edited(withScheduleParts(document, { highlightBoxes: [...schedule.highlightBoxes, box] }))
    }

    case 'deleteHighlightBox': {
      const box = highlightBoxOf(document, command.highlightBoxId)
      if (box === null) {
        return refused([reject('CM-53', 'AT-116', `no highlight box with id ${command.highlightBoxId}`)])
      }
      return edited(
        withScheduleParts(document, {
          highlightBoxes: schedule.highlightBoxes.filter((one) => one !== box),
          commentBoxes: commentBoxesReleasedFrom(schedule, {
            taskUids: new Set(),
            highlightBoxIds: new Set([box.id]),
            isKeptTaskGroup: () => true,
          }),
        }),
      )
    }

    case 'setHighlightBoxRange': {
      const box = highlightBoxOf(document, command.highlightBoxId)
      if (box === null) {
        return refused([reject('CM-54', 'AT-116', `no highlight box with id ${command.highlightBoxId}`)])
      }
      const refusals = rangeRefusals('CM-54', document, command.range)
      if (refusals.length > 0) return refused(refusals)
      const { start: startDate, finish: endDate, topTaskGroupId, bottomTaskGroupId } = command.range
      if (
        isSameDay(box.start, startDate) &&
        isSameDay(box.finish, endDate) &&
        box.topTaskGroupId === topTaskGroupId &&
        box.bottomTaskGroupId === bottomTaskGroupId
      ) {
        return edited(document)
      }
      return edited(putHighlightBox(document, { ...box, start: startDate, finish: endDate, topTaskGroupId, bottomTaskGroupId }))
    }
  }
}

type HighlightBoxLookCommand = Extract<
  AnnotationCommand,
  {
    readonly kind:
      | 'setHighlightBoxStrokeColor'
      | 'setHighlightBoxStrokeWidthPx'
      | 'setHighlightBoxFillColor'
      | 'setHighlightBoxFillTransparencyPercent'
  }
>

const HIGHLIGHT_BOX_LOOK_KINDS: ReadonlySet<AnnotationCommand['kind']> = new Set<HighlightBoxLookCommand['kind']>([
  'setHighlightBoxStrokeColor',
  'setHighlightBoxStrokeWidthPx',
  'setHighlightBoxFillColor',
  'setHighlightBoxFillTransparencyPercent',
])

/** @purity pure */
function isHighlightBoxLookCommand(command: AnnotationCommand): command is HighlightBoxLookCommand {
  return HIGHLIGHT_BOX_LOOK_KINDS.has(command.kind)
}

// see CM-55, CM-77, CM-78, CM-79, FR-019
/** @purity pure */
function highlightBoxLookChange(
  command: HighlightBoxLookCommand,
): { readonly commandRow: string; readonly refusal: Refusal | null; readonly look: Partial<HighlightBox> } {
  switch (command.kind) {
    case 'setHighlightBoxStrokeColor':
      return {
        commandRow: 'CM-55',
        refusal: boxStrokeRefusal(command.strokeColor),
        look: { strokeColor: command.strokeColor },
      }
    case 'setHighlightBoxStrokeWidthPx':
      return {
        commandRow: 'CM-77',
        refusal: lookNumberRefusal('CM-77', 'S-369', command.strokeWidthPx),
        look: { strokeWidthPx: command.strokeWidthPx },
      }
    case 'setHighlightBoxFillColor':
      return {
        commandRow: 'CM-78',
        refusal: lookColorRefusal('CM-78', command.fillColor, true),
        look: { fillColor: command.fillColor },
      }
    case 'setHighlightBoxFillTransparencyPercent':
      return {
        commandRow: 'CM-79',
        refusal: lookNumberRefusal('CM-79', 'S-371', command.fillTransparencyPercent),
        look: { fillTransparencyPercent: command.fillTransparencyPercent },
      }
  }
}

// see CM-55, CM-77, CM-78, CM-79, UN-5
/** @purity pure */
function editHighlightBoxLook(document: Document, command: HighlightBoxLookCommand): EditResult {
  const { commandRow, refusal, look } = highlightBoxLookChange(command)
  const box = highlightBoxOf(document, command.highlightBoxId)
  if (box === null) return refused([reject(commandRow, 'AT-116', `no highlight box with id ${command.highlightBoxId}`)])
  if (refusal === null && boxDrawnWithNothing({ ...box, ...look })) {
    return refused([reject(commandRow, 'IV-9', 'a highlight box may not have both its fill and its outline transparent')])
  }
  return lookEdited(document, box, refusal, look, putHighlightBox)
}

type CommentBoxLookCommand = Extract<
  AnnotationCommand,
  {
    readonly kind:
      | 'setCommentBoxText'
      | 'setCommentBoxLeaderShapeKind'
      | 'setCommentBoxStrokeColor'
      | 'setCommentBoxStrokeWidthPx'
      | 'setCommentBoxFillColor'
      | 'setCommentBoxFillTransparencyPercent'
      | 'setCommentBoxTextColor'
  }
>

// see FR-019
// WHY: the line and the text may not be transparent: a vanished leader no longer says what the note is about,
// and vanished text empties the note.
/** @purity pure */
function opaqueColorRefusal(command: string, color: string | null): Refusal | null {
  if (color === TRANSPARENT) return reject(command, 'FR-019', 'a comment box line and text may not be transparent')
  return lookColorRefusal(command, color, false)
}

const COMMENT_BOX_LOOK_KINDS: ReadonlySet<AnnotationCommand['kind']> = new Set<CommentBoxLookCommand['kind']>([
  'setCommentBoxText',
  'setCommentBoxLeaderShapeKind',
  'setCommentBoxStrokeColor',
  'setCommentBoxStrokeWidthPx',
  'setCommentBoxFillColor',
  'setCommentBoxFillTransparencyPercent',
  'setCommentBoxTextColor',
])

/** @purity pure */
function isCommentBoxLookCommand(command: AnnotationCommand): command is CommentBoxLookCommand {
  return COMMENT_BOX_LOOK_KINDS.has(command.kind)
}

// see CM-48, CM-49, CM-80, CM-81, CM-82, CM-83, CM-84, FR-019
/** @purity pure */
function commentBoxLookChange(
  command: CommentBoxLookCommand,
): { readonly commandRow: string; readonly refusal: Refusal | null; readonly look: Partial<CommentBox> } {
  switch (command.kind) {
    case 'setCommentBoxText':
      return { commandRow: 'CM-48', refusal: null, look: { text: command.text } }
    case 'setCommentBoxLeaderShapeKind':
      return { commandRow: 'CM-49', refusal: null, look: { leaderShapeKind: command.leaderShapeKind } }
    case 'setCommentBoxStrokeColor':
      return {
        commandRow: 'CM-80',
        refusal: opaqueColorRefusal('CM-80', command.strokeColor),
        look: { strokeColor: command.strokeColor },
      }
    case 'setCommentBoxStrokeWidthPx':
      return {
        commandRow: 'CM-81',
        refusal: lookNumberRefusal('CM-81', 'S-374', command.strokeWidthPx),
        look: { strokeWidthPx: command.strokeWidthPx },
      }
    case 'setCommentBoxFillColor':
      return {
        commandRow: 'CM-82',
        refusal: lookColorRefusal('CM-82', command.fillColor, true),
        look: { fillColor: command.fillColor },
      }
    case 'setCommentBoxFillTransparencyPercent':
      return {
        commandRow: 'CM-83',
        refusal: lookNumberRefusal('CM-83', 'S-375', command.fillTransparencyPercent),
        look: { fillTransparencyPercent: command.fillTransparencyPercent },
      }
    case 'setCommentBoxTextColor':
      return {
        commandRow: 'CM-84',
        refusal: opaqueColorRefusal('CM-84', command.textColor),
        look: { textColor: command.textColor },
      }
  }
}

// see CM-48, CM-49, CM-80, CM-81, CM-82, CM-83, CM-84, UN-5
/** @purity pure */
function editCommentBoxLook(document: Document, command: CommentBoxLookCommand): EditResult {
  const { commandRow, refusal, look } = commentBoxLookChange(command)
  const box = commentBoxOf(document, command.commentBoxId)
  if (box === null) return refused([reject(commandRow, 'AT-110', `no comment box with id ${command.commentBoxId}`)])
  return lookEdited(document, box, refusal, look, putCommentBox)
}

// see UN-5
/** @purity pure */
function lookEdited<Box extends object>(
  document: Document,
  box: Box,
  refusal: Refusal | null,
  look: Partial<Box>,
  put: (held: Document, placed: Box) => Document,
): EditResult {
  if (refusal !== null) return refused([refusal])
  if (isSameLook(box, look)) return edited(document)
  return edited(put(document, { ...box, ...look }))
}

/** @purity pure */
function isSameLook<Box extends object>(held: Box, look: Partial<Box>): boolean {
  return (Object.keys(look) as (keyof Box)[]).every((column) => held[column] === look[column])
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-217)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-217, FR-019
const NOT_STORED_ANNOTATION_SIZES: {
  readonly 'S-132': number
  readonly 'S-369': number
  readonly 'S-370': string
  readonly 'S-371': number
  readonly 'S-374': number
  readonly 'S-375': number
  readonly 'S-600': number
} = {
  'S-132': 4,
  'S-369': 1,
  'S-370': 'transparent',
  'S-371': 50,
  'S-374': 1,
  'S-375': 0,
  'S-600': 12,
}

// see T-217, FR-006, FR-019
const NOT_STORED_ANNOTATION_BOUNDS: {
  readonly 'S-132': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-369': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-371': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-374': { readonly key: string; readonly min: number; readonly max: number }
  readonly 'S-375': { readonly key: string; readonly min: number; readonly max: number }
} = {
  'S-132': { key: 'cornerRadiusPx', min: 0, max: 24 },
  'S-369': { key: 'HighlightBox.strokeWidthPx', min: 1, max: 10 },
  'S-371': { key: 'HighlightBox.fillTransparencyPercent', min: 0, max: 100 },
  'S-374': { key: 'CommentBox.strokeWidthPx', min: 1, max: 10 },
  'S-375': { key: 'CommentBox.fillTransparencyPercent', min: 0, max: 100 },
}
// </generated>

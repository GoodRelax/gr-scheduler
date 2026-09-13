// EditDocument's annotation aggregate: comment boxes and highlight boxes.
// @unit      UF-14  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { CommentBox, HighlightBox, Schedule } from '../../entity/document-model/schedule/schedule'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

export interface AnnotationAnchor {
  readonly date: string
  readonly groupId: string
}

export interface HighlightRange {
  readonly startDate: string
  readonly endDate: string
  readonly topGroupId: string
  readonly bottomGroupId: string
}

export type CommentBoxLeaderShapeKind = NonNullable<CommentBox['leaderShapeKind']>

export type AnnotationCommand =
  | { readonly kind: 'createCommentBox'; readonly id: string; readonly anchor: AnnotationAnchor }
  | { readonly kind: 'deleteCommentBox'; readonly id: string }
  | { readonly kind: 'setCommentBoxText'; readonly id: string; readonly text: string | null }
  | {
      readonly kind: 'setCommentBoxLeaderShapeKind'
      readonly id: string
      readonly leaderShapeKind: CommentBoxLeaderShapeKind
    }
  | { readonly kind: 'setCommentBoxAnchor'; readonly id: string; readonly anchor: AnnotationAnchor }
  | {
      readonly kind: 'setCommentBoxBodyOffsetPx'
      readonly id: string
      readonly dx: number
      readonly dy: number
    }
  | { readonly kind: 'createHighlightBox'; readonly id: string; readonly range: HighlightRange }
  | { readonly kind: 'deleteHighlightBox'; readonly id: string }
  | { readonly kind: 'setHighlightBoxRange'; readonly id: string; readonly range: HighlightRange }
  | {
      readonly kind: 'setHighlightBoxStrokeColor'
      readonly id: string
      readonly strokeColor: string | null
    }

const TRANSPARENT = 'transparent'

/** @purity pure */
function withSchedule(document: Document, part: Partial<Schedule>): Document {
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
  return withSchedule(document, { commentBoxes: boxes })
}

/** @purity pure */
function putHighlightBox(document: Document, box: HighlightBox): Document {
  const boxes = document.schedule.highlightBoxes.map((one) => (one.id === box.id ? box : one))
  return withSchedule(document, { highlightBoxes: boxes })
}

/** @purity pure */
function hasGroup(document: Document, groupId: string): boolean {
  return document.schedule.taskGroups.some((one) => one.id === groupId)
}

/** @purity pure */
function anchorRefusals(command: string, document: Document, anchor: AnnotationAnchor): Refusal[] {
  const found: Refusal[] = []
  if (dayOf(anchor.date) === null) {
    found.push(reject(command, 'AT-113', `the anchored day is not a date: ${anchor.date}`))
  }
  if (!hasGroup(document, anchor.groupId)) {
    found.push(reject(command, 'IV-2', `the document holds no row with id ${anchor.groupId} (RL-18)`))
  }
  return found
}

/** @purity pure */
function rangeRefusals(command: string, document: Document, range: HighlightRange): Refusal[] {
  const found: Refusal[] = []
  if (dayOf(range.startDate) === null) {
    found.push(reject(command, 'AT-117', `the left edge is not a date: ${range.startDate}`))
  }
  if (dayOf(range.endDate) === null) {
    found.push(reject(command, 'AT-118', `the right edge is not a date: ${range.endDate}`))
  }
  if (!hasGroup(document, range.topGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no row with id ${range.topGroupId} (RL-19)`))
  }
  if (!hasGroup(document, range.bottomGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no row with id ${range.bottomGroupId} (RL-20)`))
  }
  return found
}

// TRAP: a no-op must return edited(document) itself: document-change-plan.ts compares the
// schedule by reference, so a rebuilt one moves the schedule instant.
// see T-108, FR-019
/** @purity pure */
export function editAnnotation(document: Document, command: AnnotationCommand): EditResult {
  const schedule = document.schedule

  switch (command.kind) {
    case 'createCommentBox': {
      const refusals: Refusal[] = []
      if (commentBoxOf(document, command.id) !== null) {
        refusals.push(reject('CM-46', 'IV-1', `a comment box with id ${command.id} is already here`))
      }
      refusals.push(...anchorRefusals('CM-46', document, command.anchor))
      if (refusals.length > 0) return refused(refusals)
      const box: CommentBox = {
        id: command.id,
        leaderShapeKind: null,
        text: null,
        anchorDate: command.anchor.date,
        anchorGroupId: command.anchor.groupId,
        bodyOffsetPx: null,
      }
      return edited(withSchedule(document, { commentBoxes: [...schedule.commentBoxes, box] }))
    }

    case 'deleteCommentBox': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-47', 'AT-110', `no comment box with id ${command.id}`)])
      }
      return edited(
        withSchedule(document, { commentBoxes: schedule.commentBoxes.filter((one) => one !== box) }),
      )
    }

    case 'setCommentBoxText': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-48', 'AT-110', `no comment box with id ${command.id}`)])
      }
      if (box.text === command.text) return edited(document)
      return edited(putCommentBox(document, { ...box, text: command.text }))
    }

    case 'setCommentBoxLeaderShapeKind': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-49', 'AT-110', `no comment box with id ${command.id}`)])
      }
      if (box.leaderShapeKind === command.leaderShapeKind) return edited(document)
      return edited(putCommentBox(document, { ...box, leaderShapeKind: command.leaderShapeKind }))
    }

    case 'setCommentBoxAnchor': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-50', 'AT-110', `no comment box with id ${command.id}`)])
      }
      const refusals = anchorRefusals('CM-50', document, command.anchor)
      if (refusals.length > 0) return refused(refusals)
      if (box.anchorDate === command.anchor.date && box.anchorGroupId === command.anchor.groupId) {
        return edited(document)
      }
      return edited(
        putCommentBox(document, {
          ...box,
          anchorDate: command.anchor.date,
          anchorGroupId: command.anchor.groupId,
        }),
      )
    }

    case 'setCommentBoxBodyOffsetPx': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-51', 'AT-110', `no comment box with id ${command.id}`)])
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
      if (highlightBoxOf(document, command.id) !== null) {
        refusals.push(reject('CM-52', 'IV-1', `a highlight box with id ${command.id} is already here`))
      }
      refusals.push(...rangeRefusals('CM-52', document, command.range))
      if (refusals.length > 0) return refused(refusals)
      const box: HighlightBox = {
        id: command.id,
        startDate: command.range.startDate,
        endDate: command.range.endDate,
        topGroupId: command.range.topGroupId,
        bottomGroupId: command.range.bottomGroupId,
        strokeColor: null,
        cornerRadiusPx: NOT_STORED_ANNOTATION_SIZES['S-132'],
      }
      return edited(withSchedule(document, { highlightBoxes: [...schedule.highlightBoxes, box] }))
    }

    case 'deleteHighlightBox': {
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-53', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      return edited(
        withSchedule(document, {
          highlightBoxes: schedule.highlightBoxes.filter((one) => one !== box),
        }),
      )
    }

    case 'setHighlightBoxRange': {
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-54', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      const refusals = rangeRefusals('CM-54', document, command.range)
      if (refusals.length > 0) return refused(refusals)
      const { startDate, endDate, topGroupId, bottomGroupId } = command.range
      if (
        box.startDate === startDate &&
        box.endDate === endDate &&
        box.topGroupId === topGroupId &&
        box.bottomGroupId === bottomGroupId
      ) {
        return edited(document)
      }
      return edited(putHighlightBox(document, { ...box, startDate, endDate, topGroupId, bottomGroupId }))
    }

    case 'setHighlightBoxStrokeColor': {
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-55', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      if (command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-55', 'FR-019', 'a highlight box outline may not be transparent')])
      }
      if (box.strokeColor === command.strokeColor) return edited(document)
      return edited(putHighlightBox(document, { ...box, strokeColor: command.strokeColor }))
    }
  }
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-217)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-217, FR-019
export const NOT_STORED_ANNOTATION_SIZES: { readonly 'S-132': number } = {
  'S-132': 4,
}
// </generated>

// EditDocument's annotation aggregate: comment boxes and highlight boxes.
// @unit      UF-14  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import type { CommentBox, HighlightBox, Schedule } from '../../entity/document-model/schedule/schedule'
import { dayOf, isSameDay, isStoredColor, TRANSPARENT } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited, reject } from './edit-document'

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
  | { readonly kind: 'setCommentBoxStrokeColor'; readonly id: string; readonly strokeColor: string | null }
  | { readonly kind: 'setCommentBoxStrokeWidth'; readonly id: string; readonly strokeWidthPx: number | null }
  | { readonly kind: 'setCommentBoxFillColor'; readonly id: string; readonly fillColor: string | null }
  | {
      readonly kind: 'setCommentBoxFillTransparency'
      readonly id: string
      readonly fillTransparencyPercent: number | null
    }
  | { readonly kind: 'setCommentBoxTextColor'; readonly id: string; readonly textColor: string | null }
  | { readonly kind: 'createHighlightBox'; readonly id: string; readonly range: HighlightRange }
  | { readonly kind: 'deleteHighlightBox'; readonly id: string }
  | { readonly kind: 'setHighlightBoxRange'; readonly id: string; readonly range: HighlightRange }
  | {
      readonly kind: 'setHighlightBoxStrokeColor'
      readonly id: string
      readonly strokeColor: string | null
    }
  | {
      readonly kind: 'setHighlightBoxStrokeWidth'
      readonly id: string
      readonly strokeWidthPx: number | null
    }
  | {
      readonly kind: 'setHighlightBoxFillColor'
      readonly id: string
      readonly fillColor: string | null
    }
  | {
      readonly kind: 'setHighlightBoxFillTransparency'
      readonly id: string
      readonly fillTransparencyPercent: number | null
    }

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
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${anchor.groupId} (RL-18)`))
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
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${range.topGroupId} (RL-19)`))
  }
  if (!hasGroup(document, range.bottomGroupId)) {
    found.push(reject(command, 'IV-2', `the document holds no task group with id ${range.bottomGroupId} (RL-20)`))
  }
  return found
}

// TRAP: a no-op must return edited(document) itself: document-change-plan.ts compares the
// schedule by reference, so a rebuilt one moves the schedule instant.
// see T-108, FR-019
/** @purity pure */
export function editAnnotation(document: Document, command: AnnotationCommand): EditResult {
  if (isCommentBoxLookCommand(command)) return editCommentBoxLook(document, command)
  if (isHighlightBoxLookCommand(command)) return editHighlightBoxLook(document, command)
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
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
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

    case 'setCommentBoxAnchor': {
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-50', 'AT-110', `no comment box with id ${command.id}`)])
      }
      const refusals = anchorRefusals('CM-50', document, command.anchor)
      if (refusals.length > 0) return refused(refusals)
      if (isSameDay(box.anchorDate, command.anchor.date) && box.anchorGroupId === command.anchor.groupId) {
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
        strokeWidthPx: null,
        // WHY: placed unfilled (S-370); a null fill would paint the theme color (FR-019).
        fillColor: NOT_STORED_ANNOTATION_SIZES['S-370'],
        fillTransparencyPercent: null,
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
        isSameDay(box.startDate, startDate) &&
        isSameDay(box.endDate, endDate) &&
        box.topGroupId === topGroupId &&
        box.bottomGroupId === bottomGroupId
      ) {
        return edited(document)
      }
      return edited(putHighlightBox(document, { ...box, startDate, endDate, topGroupId, bottomGroupId }))
    }
  }
}

type HighlightBoxLookCommand = Extract<
  AnnotationCommand,
  {
    readonly kind:
      | 'setHighlightBoxStrokeColor'
      | 'setHighlightBoxStrokeWidth'
      | 'setHighlightBoxFillColor'
      | 'setHighlightBoxFillTransparency'
  }
>

const HIGHLIGHT_BOX_LOOK_KINDS: ReadonlySet<AnnotationCommand['kind']> = new Set<HighlightBoxLookCommand['kind']>([
  'setHighlightBoxStrokeColor',
  'setHighlightBoxStrokeWidth',
  'setHighlightBoxFillColor',
  'setHighlightBoxFillTransparency',
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
    case 'setHighlightBoxStrokeWidth':
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
    case 'setHighlightBoxFillTransparency':
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
  const box = highlightBoxOf(document, command.id)
  if (box === null) return refused([reject(commandRow, 'AT-116', `no highlight box with id ${command.id}`)])
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
      | 'setCommentBoxStrokeWidth'
      | 'setCommentBoxFillColor'
      | 'setCommentBoxFillTransparency'
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
  'setCommentBoxStrokeWidth',
  'setCommentBoxFillColor',
  'setCommentBoxFillTransparency',
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
    case 'setCommentBoxStrokeWidth':
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
    case 'setCommentBoxFillTransparency':
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
  const box = commentBoxOf(document, command.id)
  if (box === null) return refused([reject(commandRow, 'AT-110', `no comment box with id ${command.id}`)])
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
} = {
  'S-132': 4,
  'S-369': 1,
  'S-370': 'transparent',
  'S-371': 50,
  'S-374': 1,
  'S-375': 0,
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

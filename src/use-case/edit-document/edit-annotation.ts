// EditDocument -- the annotation aggregate.
//
// @unit      UF-14  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The ten commands table T-108 puts in the two annotation groups: `CommentBox`
// CM-46 to CM-51 and `HighlightBox` CM-52 to CM-55. `Annotations` (U-15a of
// table T-103) is the word for the two together. U-14 forbids shortening a
// comment box to "the comment" (MUST NOT) -- the text it holds is the comment
// box's 本文 -- and U-15 forbids calling a highlight box a 囲み枠 (MUST NOT).
//
// ⚠️ Both arrays are SCHEDULE-group data: DR-2 of table T-052 lists
// `commentBoxes` and `highlightBoxes` among its twelve keys. So every command
// here that actually moves something raises the revision (FR-063), which is
// the opposite of edit-document-settings.ts. A command that changes nothing
// must therefore leave `document.schedule` alone BY REFERENCE --
// document-change-plan.ts reads exactly that reference to decide, so an
// unconditional rebuild would raise the revision for a no-op.
//
// ⚠️ This file VALIDATES and returns a new Document. It settles nothing
// (CP-9); WS-6 of table T-067 owns replacing the current value.
//
// ⚠️ It is not the public entry of its component (Chapter 5.3, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import type { CommentBox, HighlightBox, Schedule } from '../../entity/document-model/schedule/schedule'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * Where a comment box is pinned: a day, and the IDENTIFIER of a row.
 *
 * ⚠️ FR-019 requires the position to be held as a date and a row identifier,
 * and forbids referring to a row by its place in the order (MUST NOT) --
 * "順番で持つと並べ替えで別の行を指す". `groupId` is `TaskGroup.id` (AT-51),
 * never an index into `schedule.taskGroups`, which is why no member of this
 * file takes a number for a row.
 *
 * ⚠️ The anchored target is NOT named. AR-5 of table T-023b says as much: the
 * comment box has no route that makes the thing under the pointer its subject,
 * because a date and a row identifier already say where it points.
 */
export interface AnnotationAnchor {
  readonly date: string
  readonly groupId: string
}

/**
 * What a highlight box surrounds: a span of days and a span of rows.
 *
 * UC-008 step 4 -- "範囲を日付の範囲と行の範囲で持ち". The two rows are
 * identifiers for the same reason the anchor is (FR-019's MUST NOT).
 */
export interface HighlightRange {
  readonly startDate: string
  readonly endDate: string
  readonly topGroupId: string
  readonly bottomGroupId: string
}

/**
 * CM-46 to CM-55 of table T-108.
 *
 * ⚠️ The `id` of a box being CREATED arrives as a value. AT-110 and AT-116
 * make it a UUID, which a `pure` unit cannot mint -- LY-5 of table T-060 leaves
 * the outside to the Framework, and FR-001's `uidHighWaterMark` covers the
 * integer `uid` columns only, not the UUID keys. The command carries the id so
 * that the same call gives the same document twice.
 */
export type AnnotationCommand =
  | { readonly kind: 'createCommentBox'; readonly id: string; readonly anchor: AnnotationAnchor }
  | { readonly kind: 'deleteCommentBox'; readonly id: string }
  | { readonly kind: 'setCommentBoxText'; readonly id: string; readonly text: string | null }
  | {
      readonly kind: 'setCommentBoxLeaderShapeKind'
      readonly id: string
      readonly leaderShapeKind: string
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

/**
 * S-132 of table T-217, the one row that table has. Its ⚠️ says the value
 * lands in a `HighlightBox` column, so a new box carries it rather than the
 * drawing side resolving it; FR-019 draws the radius at a constant size
 * whatever the zoom, which is a rule about drawing, not about the stored value.
 */
const CORNER_RADIUS_PX = 4

/** P-19 of table T-102 -- the one palette value the specification spells. */
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

/** Replaces one comment box in place. The caller has already found it. @purity pure */
function putCommentBox(document: Document, box: CommentBox): Document {
  const boxes = document.schedule.commentBoxes.map((one) => (one.id === box.id ? box : one))
  return withSchedule(document, { commentBoxes: boxes })
}

/** Replaces one highlight box in place. The caller has already found it. @purity pure */
function putHighlightBox(document: Document, box: HighlightBox): Document {
  const boxes = document.schedule.highlightBoxes.map((one) => (one.id === box.id ? box : one))
  return withSchedule(document, { highlightBoxes: boxes })
}

/** @purity pure */
function hasGroup(document: Document, groupId: string): boolean {
  return document.schedule.taskGroups.some((one) => one.id === groupId)
}

/**
 * What is wrong with a comment box anchor, if anything.
 *
 * The day is checked for BEING a day (AT-113 types the column 日時) and the row
 * for BEING THERE (IV-2: a non-null foreign key points at a row of the same
 * document; table T-057's RL-18 is the pointer for `anchorGroupId`).
 *
 * ⚠️ Whether the day lies inside the accepted span is IV-14's, and table T-220
 * is driven by `scheduleViolations` (PI-1) rather than repeated here.
 *
 * @purity pure
 */
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

/** The same two tests, over the four columns a highlight box's range has. @purity pure */
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
  // ⛔ NOT DECIDED: whether the left edge may lie after the right one, and
  // whether the top row may lie below the bottom one. IV-10 puts that rule on
  // a `Task`'s `start` / `finish` and table T-220 carries no row for a
  // highlight box's span, so neither refusing nor swapping them is decided.
  // Nothing is done here rather than choosing one quietly.
  return found
}

/**
 * Runs one annotation command against the document.
 *
 * ⚠️ Every entrance that names a box the document does not hold is REFUSED
 * rather than passed over: FR-028 requires the caller to be told whether the
 * write was taken, and AG-9a requires the refusal to name what was refused. A
 * silent no-op would report success for a write that reached nothing.
 *
 * @purity pure
 */
export function editAnnotation(document: Document, command: AnnotationCommand): EditResult {
  const schedule = document.schedule

  switch (command.kind) {
    case 'createCommentBox': { // CM-46
      const refusals: Refusal[] = []
      // IV-1: a primary key does not repeat inside the array it stands in.
      if (commentBoxOf(document, command.id) !== null) {
        refusals.push(reject('CM-46', 'IV-1', `a comment box with id ${command.id} is already here`))
      }
      refusals.push(...anchorRefusals('CM-46', document, command.anchor))
      if (refusals.length > 0) return refused(refusals)
      const box: CommentBox = {
        id: command.id,
        // ⛔ NOT DECIDED: which of the two leader shapes a new box starts
        // with, and what either of them is called -- see CM-49 below. AT-111
        // admits null, so the box is created naming neither.
        leaderShapeKind: null,
        // The body text has its own entrance (CM-48 / FR-097). A box placed by
        // AR-5 is placed by a drag alone, so it carries none yet.
        text: null,
        anchorDate: command.anchor.date,
        anchorGroupId: command.anchor.groupId,
        // FR-019 holds the offset from the anchored point to the body, and
        // CM-51 is what moves it. A box that was only just placed has not been
        // dragged away from its own anchor.
        bodyOffsetPx: null,
      }
      return edited(withSchedule(document, { commentBoxes: [...schedule.commentBoxes, box] }))
    }

    case 'deleteCommentBox': { // CM-47
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-47', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // CD-4 of table T-050: deleting an annotation takes nothing with it. The
      // other direction is CD-2's -- deleting a ROW deletes the annotations
      // that point at it -- and that belongs to the TaskGroup aggregate.
      return edited(
        withSchedule(document, { commentBoxes: schedule.commentBoxes.filter((one) => one !== box) }),
      )
    }

    case 'setCommentBoxText': { // CM-48
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-48', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // FR-097 holds the text and draws it inside the box. Its entrance is
      // MK-13 of table T-023 (double click), which is the screen's business;
      // nothing about the value itself is bounded -- AT-112 admits null and the
      // generated schema puts no length on it -- so nothing here refuses one.
      if (box.text === command.text) return edited(document)
      return edited(putCommentBox(document, { ...box, text: command.text }))
    }

    case 'setCommentBoxLeaderShapeKind': // CM-49
      // ⛔ NOT DECIDED, so this command does nothing but say so. FR-019
      // requires the choice of two -- "コメントボックスは引出し四角と折れ線の
      // 2 種から選べること（MUST）" -- but no table spells the two values:
      // docs/spec/_assets/source/erd.json marks `CommentBox.leaderShapeKind`
      // `"valuesUndecided": true`, and _assets/grs-document.schema.json widens
      // the column to a plain string for that stated reason. Taking any string
      // would let a third shape into the document and leave the MUST with
      // nothing to enforce, so the row is declared and refused until a change
      // request names the two.
      return refused([
        reject(
          'CM-49',
          'FR-019',
          'the two leader shapes have no spelled values: erd.json marks leaderShapeKind valuesUndecided',
        ),
      ])

    case 'setCommentBoxAnchor': { // CM-50
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-50', 'AT-110', `no comment box with id ${command.id}`)])
      }
      const refusals = anchorRefusals('CM-50', document, command.anchor)
      if (refusals.length > 0) return refused(refusals)
      // ⚠️ The pair is set together and never cleared: FR-019 requires the
      // position to BE a date and a row identifier, and table T-108 carries no
      // command that unpins a comment box, so this entrance never writes null
      // into either column.
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

    case 'setCommentBoxBodyOffsetPx': { // CM-51
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-51', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // FR-019: this one distance is held in SCREEN pixels -- "吹き出しのずれ
      // だけは画面上の距離で持ち、ズームしても見た目の距離が変わらないように
      // する". So it is NOT converted through the zoom on the way in; the value
      // arrives as what it will be drawn as.
      if (!Number.isFinite(command.dx) || !Number.isFinite(command.dy)) {
        return refused([reject('CM-51', 'AT-115', 'the offset must be two finite numbers')])
      }
      const held = box.bodyOffsetPx
      if (held !== null && held.dx === command.dx && held.dy === command.dy) {
        return edited(document)
      }
      return edited(putCommentBox(document, { ...box, bodyOffsetPx: { dx: command.dx, dy: command.dy } }))
    }

    case 'createHighlightBox': { // CM-52
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
        // FR-019: the outline colour may be given, and where it is not given
        // the box is drawn in the fixed annotation colour (MUST). The absence
        // is `null`, which P-19 keeps apart from a chosen value -- and AR-6
        // creates by dragging a range alone, so nothing was chosen. CM-55 is
        // the entrance that chooses.
        //
        // ⛔ NOT DECIDED, though not needed here: the fixed annotation colour
        // itself has no row. Table T-217 holds S-132 and nothing else, so
        // whoever draws an unspecified outline cannot read the colour off the
        // specification. Writing a guess into the column would hide that.
        strokeColor: null,
        cornerRadiusPx: CORNER_RADIUS_PX,
      }
      return edited(withSchedule(document, { highlightBoxes: [...schedule.highlightBoxes, box] }))
    }

    case 'deleteHighlightBox': { // CM-53
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-53', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      // CD-4 of table T-050 again: nothing goes with it.
      return edited(
        withSchedule(document, {
          highlightBoxes: schedule.highlightBoxes.filter((one) => one !== box),
        }),
      )
    }

    case 'setHighlightBoxRange': { // CM-54
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-54', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      const refusals = rangeRefusals('CM-54', document, command.range)
      if (refusals.length > 0) return refused(refusals)
      // ⚠️ The four columns move together. UC-008 step 4 has the range held as
      // a span of days AND a span of rows, so a change that set only one edge
      // would leave the box describing a rectangle nobody dragged.
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

    case 'setHighlightBoxStrokeColor': { // CM-55
      const box = highlightBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-55', 'AT-116', `no highlight box with id ${command.id}`)])
      }
      // FR-019: "ハイライトボックスに透明を選ばせてはならない（MUST NOT）" --
      // the outline is the whole of the box, so a transparent one would leave
      // nothing on the screen at all. P-19 spells the value being refused.
      if (command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-55', 'FR-019', 'a highlight box outline may not be transparent')])
      }
      // ⚠️ `null` is not a colour and is not the same refusal: P-19 keeps
      // 「選んでいない」 apart from a chosen value, and FR-019 draws an
      // unspecified outline in the fixed annotation colour. So null is how a
      // person takes a chosen colour back off -- there is no separate reset
      // command for annotations, and FR-041 keeps them off the theme anyway.
      //
      // ⛔ NOT DECIDED: which colours ARE admissible here. Table T-017's
      // palette (CL-1) names its colours in Japanese only, and P-19 is the one
      // value the specification spells, so no membership test can be written
      // without inventing ten names.
      if (box.strokeColor === command.strokeColor) return edited(document)
      return edited(putHighlightBox(document, { ...box, strokeColor: command.strokeColor }))
    }
  }
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}

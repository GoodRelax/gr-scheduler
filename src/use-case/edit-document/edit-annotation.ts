// EditDocument -- the annotation aggregate.
//
// @unit      UF-14  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// Table T-108's two annotation groups, `CommentBox` and `HighlightBox`
// (`Annotations`, U-15a of table T-103; U-14 / U-15 for their names).
//
// ⚠️ Both arrays are schedule-group data (DR-2 of table T-052), so a command
// that moves something moves the schedule instant (FR-063). A command that
// changes nothing must leave `document.schedule` alone BY REFERENCE:
// document-change-plan.ts decides by that reference, so a rebuild would move
// the instant for a no-op.
//
// Validates and returns a new Document; settles nothing (CP-9, WS-6 of table
// T-067).

import type { Document } from '../../entity/document-model/document/document'
import type { CommentBox, HighlightBox, Schedule } from '../../entity/document-model/schedule/schedule'
import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * Where a comment box is pinned: a day, and the IDENTIFIER of a row.
 *
 * ⚠️ FR-019 forbids referring to a row by its place in the order, so `groupId`
 * is `TaskGroup.id` (AT-51), never an index; no member here takes a number for
 * a row.
 *
 * The anchored target is not named: the date and row id already say where it
 * points (AR-5 of table T-023b).
 */
export interface AnnotationAnchor {
  readonly date: string
  readonly groupId: string
}

/**
 * What a highlight box surrounds: a span of days and a span of rows.
 *
 * UC-008 step 4. The rows are identifiers for the anchor's reason (FR-019).
 */
export interface HighlightRange {
  readonly startDate: string
  readonly endDate: string
  readonly topGroupId: string
  readonly bottomGroupId: string
}

/** The leader shapes AT-111 spells. */
export type CommentBoxLeaderShapeKind = NonNullable<CommentBox['leaderShapeKind']>

/**
 * CM-46 to CM-55 of table T-108.
 *
 * ⚠️ A created box's `id` arrives as a value: AT-110 / AT-116 make it a UUID,
 * which a `pure` unit cannot mint (LY-5 of table T-060; `uidHighWaterMark`
 * covers integer uids only), so the same call gives the same document twice.
 */
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
 * The day must be a day (AT-113) and the row must exist (IV-2; RL-18 of table
 * T-057). Whether the day lies in the accepted span is IV-14's, answered by
 * `scheduleViolations` (PI-1) rather than repeated here.
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
  // ⛔ A backwards range is not refused (FR-019): AR-6's road normalises it
  // before CM-52 (`commandFromArmed` in `input-command-translator.ts`).
  //
  // STOP -- FR-019 has typed or imported ranges refused as IV-10 refuses a
  // Task's dates, but table T-220 has no row for a highlight box's span and is
  // driven by `scheduleViolations` (PI-1), so nothing is refused here without
  // inventing an invariant. ⚠️ No road into CM-52 / CM-54 other than AR-6's
  // exists today.
  // Searched: FR-019, table T-220 (05-07-design.md), table T-108 CM-52 / CM-54,
  // `_assets/fig-erd-detail.md` AT-116..AT-122.
  return found
}

/**
 * Runs one annotation command against the document.
 *
 * ⚠️ A command naming a box the document does not hold is refused, not passed
 * over: a silent no-op would report success for a write that reached nothing
 * (FR-028, AG-9a).
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
        // ⛔ NOT DECIDED: which leader shape a new box starts with -- see CM-49
        // below. AT-111 admits null, so the box names none.
        leaderShapeKind: null,
        // CM-48 / FR-097 writes the text; AR-5 places a box by a drag alone.
        text: null,
        anchorDate: command.anchor.date,
        anchorGroupId: command.anchor.groupId,
        // CM-51 moves the offset; a box just placed has not been dragged off
        // its anchor.
        bodyOffsetPx: null,
      }
      return edited(withSchedule(document, { commentBoxes: [...schedule.commentBoxes, box] }))
    }

    case 'deleteCommentBox': { // CM-47
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-47', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // CD-4 of table T-050: nothing goes with it. Deleting a row takes its
      // annotations (CD-2), which is the TaskGroup aggregate's.
      return edited(
        withSchedule(document, { commentBoxes: schedule.commentBoxes.filter((one) => one !== box) }),
      )
    }

    case 'setCommentBoxText': { // CM-48
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-48', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // FR-097. Nothing bounds the value (AT-112 admits null and the schema
      // sets no length), so nothing is refused.
      if (box.text === command.text) return edited(document)
      return edited(putCommentBox(document, { ...box, text: command.text }))
    }

    case 'setCommentBoxLeaderShapeKind': { // CM-49
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-49', 'AT-110', `no comment box with id ${command.id}`)])
      }
      // FR-019 allows one leader shape, but retiring `leaderShapeKind` is left
      // to a separate change (FR-019), so CM-49 of table T-108 stays a command,
      // AT-111 still admits both spellings, and this arm stores what it is
      // handed. ⛔ Nothing here may refuse either; the drawing obeys the one
      // shape (`svg-renderer.ts` reads no kind).
      //
      // ⚠️ The payload is not nullable though AT-111 admits null: no requirement
      // gives a way back to naming none, and inventing one would decide what
      // CM-46's ⛔ above is waiting on.
      //
      // No-op test: FR-020 forbids re-stamping the trail for a write that
      // changed nothing, and FR-063 moves the instant only on a real change --
      // both read the reference this line keeps.
      if (box.leaderShapeKind === command.leaderShapeKind) return edited(document)
      return edited(putCommentBox(document, { ...box, leaderShapeKind: command.leaderShapeKind }))
    }

    case 'setCommentBoxAnchor': { // CM-50
      const box = commentBoxOf(document, command.id)
      if (box === null) {
        return refused([reject('CM-50', 'AT-110', `no comment box with id ${command.id}`)])
      }
      const refusals = anchorRefusals('CM-50', document, command.anchor)
      if (refusals.length > 0) return refused(refusals)
      // ⚠️ Set together and never cleared: FR-019 makes the position a date and
      // a row id, and table T-108 has no command that unpins a comment box.
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
      // FR-019 holds this offset in SCREEN pixels, so it is not converted
      // through the zoom.
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
        // `null` is "not chosen" (P-19), drawn in the fixed annotation colour
        // (FR-019); AR-6 creates by a drag alone, and CM-55 chooses.
        //
        // ⛔ NOT DECIDED: the fixed annotation colour has no row (table T-217
        // holds only S-132); a guess written into the column would hide that.
        strokeColor: null,
        cornerRadiusPx: NOT_STORED_ANNOTATION_SIZES['S-132'],
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
      // ⚠️ The four columns move together (UC-008 step 4): setting one edge
      // would describe a rectangle nobody dragged.
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
      // FR-019 (P-19 spells the value).
      if (command.strokeColor === TRANSPARENT) {
        return refused([reject('CM-55', 'FR-019', 'a highlight box outline may not be transparent')])
      }
      // ⚠️ `null` is not refused: it is "not chosen" (P-19), drawn in the fixed
      // annotation colour, and the only way to take a colour back off, since
      // annotations have no reset command.
      //
      // ⛔ NOT DECIDED: which colours are admissible. Table T-017's palette
      // (CL-1) names its colours in Japanese only, so a membership test would
      // have to invent names.
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
/**
 * Table T-217's one row (S-132): the corner radius a newly
 * created `HighlightBox` is given.
 *
 * ⭐ NOT A DOCUMENT SETTING. FR-019 (MUST) draws every
 * `HighlightBox` at a fixed radius whatever the zoom -- this is
 * that fixed number, read once here rather than typed at the
 * one call site table T-217's own note sends it to.
 */
export const NOT_STORED_ANNOTATION_SIZES: { readonly 'S-132': number } = {
  'S-132': 4,
}
// </generated>

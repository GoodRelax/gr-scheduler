// ApplyDocumentChange -- public entry of this folder.
//
// @unit      UF-8   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-8
//
// The one way anything is written to the document (CP-8, MS-1 of table T-042).
// This file is WS-6 and WS-7 of table T-067 only; WS-1 to WS-5 are pure and live
// in `document-change-plan.ts` (UT-1, LY-3).
//
//     WS-6  replace the current value          ← non-pure, and one reference
//     WS-7  hand out notices, AFTER the swap   ← non-pure
//
// Two roads reach WS-6 -- `applyDocumentChange` for table T-108 commands and
// `replaceDocument` for a document built outside (table T-230) -- and they share
// every step and the one delivery window, so the second is not a second entrance.
//
// ⚠️ The delivery window is owned here because WS-7 runs nowhere else: a
// subscriber writing back from `deliver` builds its own WriteMoment, which cannot
// know (Chapter 5.5), so the flag is read here and handed to WS-2.

import type { Document } from '../../entity/document-model/document/document'
import type { HeldDocument } from '../undo-edit/undo-edit'
import {
  planDocumentChange,
  planDocumentReplacement,
  type ChangePlan,
  type PlanInput,
  type PlanRefusal,
  type ReplacementInput,
  type ReplacementPlan,
  type ReplacementRefusal,
  type WriteMoment,
} from './document-change-plan'

// `DocumentCommand` is listed under PI-8 but declared in EditDocument: this
// component already imports EditDocument for WS-3, so declaring it here would be
// a cycle (LR-3). `Refusal`, `SettingsLimits` and `EditReport` travel because
// `PlanRefusal`, `PlanInput` and `ApplyOutcome` name them, and nothing more (R2.19).
export type {
  DocumentCommand,
  EditReport,
  Refusal,
  SettingsLimits,
} from '../edit-document/edit-document'
import type { EditReport } from '../edit-document/edit-document'
// `ChangeStep` and `HeldDocument` are declared in UndoEdit for the same reason:
// this component imports it for RD-1's WS-3 (table T-230). Both are arguments of
// the published entries, which table T-064's preamble leaves to `src/`.
export type { ChangeStep, HeldDocument } from '../undo-edit/undo-edit'
export type {
  ImportCall,
  PlanInput,
  PlanRefusal,
  ReplacementCall,
  ReplacementInput,
  ReplacementRefusal,
  WriteMoment,
} from './document-change-plan'

/**
 * What the caller holds and lets this component replace (LY-5 of table T-060).
 * The purity tags sit on the members, which differ (R7.6; note under table T-075).
 */
export interface DocumentHolder {
  /** CS-3's one read, taken before any step runs. @purity semi-pure-b */
  read(): HeldDocument
  /** WS-6. One reference, so the pair cannot come apart. @purity non-pure */
  replace(next: HeldDocument): void
}

/** WS-7's audience. Told after the swap, never before. */
export interface ChangeAudience {
  /**
   * WS-5's judgement travels with the document (AG-6): re-deriving it from the
   * stamp would duplicate the rule (R2.7), and fails for two writes in one second.
   *
   * @purity non-pure
   */
  deliver(document: Document, hasMovedSchedule: boolean): void
}

export type ApplyOutcome =
  | { readonly accepted: false; readonly refusal: PlanRefusal }
  | {
      readonly accepted: true
      readonly document: Document
      /** WS-5's judgement: the schedule-data group moved (FR-063). */
      readonly hasMovedSchedule: boolean
      /**
       * The count FR-012 owes a telling for; the recount itself is already in
       * `document`. ⛔ Nothing here raises the notice: that is the shell's, with
       * FR-038's words (`RS-52` of table T-233, `NT-3` of table T-037).
       * NT-3's count is `recountedTaskUids.length`.
       */
      readonly report: EditReport
    }

export type ReplaceOutcome =
  | { readonly accepted: false; readonly refusal: ReplacementRefusal }
  | {
      readonly accepted: true
      readonly document: Document
      /**
       * ⚠️ NOT WS-5's judgement on this road. Table T-230 derives it from the
       * two stamps because five of its six rows leave WS-5 nothing to judge.
       */
      readonly hasMovedSchedule: boolean
    }

// ---- non-pure from here on (R7.7) -----------------------------------------

// Whether WS-7 is running right now. ⚠️ Not WriteMoment's flag of the same name:
// that is the caller's knowledge, and a re-entering subscriber would say false.
// Module-scoped because CP-8 is the one write path; a second holder would be
// refused during another's delivery, which errs toward the MUST.
let deliveringNotices = false

/**
 * What WS-2 is told about the moment: the caller's knowledge widened by this
 * file's. WS-2 stays pure; either statement refuses.
 *
 * @purity semi-pure-b
 */
function momentInsideTheWindow(moment: WriteMoment): WriteMoment {
  return { ...moment, deliveringNotices: moment.deliveringNotices || deliveringNotices }
}

/**
 * WS-6 then WS-7, shared by both roads: table T-230 changes neither step.
 *
 * @purity non-pure
 */
function replaceThenTell(
  next: HeldDocument,
  hasMovedSchedule: boolean,
  holder: DocumentHolder,
  audience: ChangeAudience,
): void {
  // ---- WS-6 -------------------------------------------------------------
  holder.replace(next)

  // ---- WS-7, and only now ------------------------------------------------
  // `finally` closes the window even when a subscriber throws, or one bad
  // subscriber would refuse every later write (Chapter 5.5 refuses only during).
  deliveringNotices = true
  try {
    audience.deliver(next.document, hasMovedSchedule)
  } finally {
    deliveringNotices = false
  }
}

/**
 * The write path a list of commands takes: plan purely, then swap, then tell.
 *
 * @purity non-pure
 */
export function applyDocumentChange(
  input: Omit<PlanInput, 'document' | 'history'>,
  holder: DocumentHolder,
  audience: ChangeAudience,
): ApplyOutcome {
  // CS-3 of table T-066: one read of the holder; a second partway through would
  // be a different consistency unit.
  const held = holder.read()
  const plan: ChangePlan = planDocumentChange({
    ...input,
    moment: momentInsideTheWindow(input.moment),
    document: held.document,
    history: held.history,
  })
  if (!plan.ok) return { accepted: false, refusal: plan.refusal }

  replaceThenTell(
    { document: plan.document, history: plan.history },
    plan.hasMovedSchedule,
    holder,
    audience,
  )
  return {
    accepted: true,
    document: plan.document,
    hasMovedSchedule: plan.hasMovedSchedule,
    report: plan.report,
  }
}

/**
 * The write path a document built outside this component takes (table T-230):
 * every step of table T-067, with WS-3 to WS-5 as the row says.
 *
 * ⛔ `call.row` has no default: T-230 forbids a replacement that names no row.
 *
 * @purity non-pure
 */
export function replaceDocument(
  input: Omit<ReplacementInput, 'held'>,
  holder: DocumentHolder,
  audience: ChangeAudience,
): ReplaceOutcome {
  // CS-3 again: WS-1 matches the caller's stamp against THIS read, never the
  // incoming document's (T-230).
  const held = holder.read()
  const plan: ReplacementPlan = planDocumentReplacement({
    ...input,
    moment: momentInsideTheWindow(input.moment),
    held,
  })
  if (!plan.ok) return { accepted: false, refusal: plan.refusal }

  replaceThenTell(plan.next, plan.hasMovedSchedule, holder, audience)
  return { accepted: true, document: plan.next.document, hasMovedSchedule: plan.hasMovedSchedule }
}

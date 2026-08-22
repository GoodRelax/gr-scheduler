// ApplyDocumentChange -- public entry of this folder.
//
// @unit      UF-8   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-8
//
// ⭐ The ONE way anything is written to the document (CP-8). Table T-042's
// MS-1 puts that at milestone M1 and calls it the one branch that cannot be
// built later: with two entrances, one of them ends up with validation or
// history the other does not have.
//
// This file is steps WS-6 and WS-7 of table T-067, and nothing else. WS-1 to
// WS-5 are pure and live in `document-change-plan.ts`; UT-1 splits the unit
// exactly at that seam because LY-3 draws it there.
//
//     WS-6  replace the current value          ← non-pure, and one reference
//     WS-7  hand out notices, AFTER the swap   ← non-pure
//
// ⚠️ The order is a MUST and the reason is in T-067: a notice delivered before
// the swap reaches a subscriber that then reads the document it had already.
// ⚠️ The swap is ONE reference assignment (MUST), so that AG-4's frozen copy
// answers either the before or the after and never a mixture.
// ⚠️ The window in which notices are going out is owned HERE, because WS-7 runs
// nowhere else. Chapter 5.5 makes refusing a write inside that window a MUST
// ("通知を配っているあいだの書き込みは拒否すること"), and a subscriber that
// writes back from inside `deliver` builds its own WriteMoment, which cannot
// know. So the flag is read from this file and handed to WS-2.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'
import type { EditHistory } from '../../entity/document-model/edit-history/edit-history'
import {
  planDocumentChange,
  type ChangePlan,
  type ChangeStep,
  type PlanInput,
  type PlanRefusal,
} from './document-change-plan'

// Table T-064 lists `DocumentCommand` under PI-8, so it leaves through here.
// ⚠️ It is DECLARED in EditDocument: ApplyDocumentChange already imports that
// component for WS-3, and declaring the type here would send an import back
// the other way -- a cycle inside the layer, which LR-3 forbids.
// ⚠️ `Refusal` and `SettingsLimits` travel with it because `PlanRefusal` and
// `PlanInput` name them; nothing else does. Widening PI-8 past what the
// published signatures reach would put names on the component's face that
// R2.19 never declared -- the per-aggregate command unions leave through
// EditDocument's own entry, which is where they are declared.
export type { DocumentCommand, Refusal, SettingsLimits } from '../edit-document/edit-document'
export type { ChangeStep, PlanInput, PlanRefusal, WriteMoment } from './document-change-plan'

/**
 * The pair the caller keeps: the current document and the history that undoes
 * it. ⚠️ They are ONE value because WS-6 is one reference assignment (MUST) --
 * a document paired with the previous history is exactly the mixture AG-4
 * forbids, and a seam that took two arguments would ask every holder to write
 * two fields and trust it to do so in one breath.
 */
export interface HeldDocument {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

/**
 * What the caller holds and lets this component replace. Table T-060's LY-5.
 *
 * ⚠️ One member reads the outside and one writes it, so the purity of each is
 * not the file's: 05-07-design.md's note under table T-075 says a single seam
 * may carry a `semi-pure-b` member beside a `non-pure` one, and R7.6 wants the
 * tag where the member is.
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
   * ⭐ WS-5's judgement travels WITH the document, because AG-6 selects a live
   * watcher by whether the write moved the schedule-data group (MUST) and says
   * that WS-5 has already made that call. Handing the document alone would
   * force the notifying side to work it out again from the stamp, which is the
   * duplication R2.7 refuses -- and it could not work it out at all when two
   * writes fall inside the same second.
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
    }

// ---- non-pure from here on (R7.7) -----------------------------------------

// Whether WS-7 is running right now. ⚠️ WriteMoment carries the same name, but
// that one is the CALLER's knowledge, and the caller who re-enters is the
// subscriber inside `deliver` -- it would say false in perfect good faith.
// Only the site that performs WS-7 knows, so the site owns the flag and WS-2
// judges the two together.
// ⚠️ Module-scoped because CP-8 is the ONE write path of a running app. If a
// second holder ever existed it would be refused during another holder's
// delivery, which errs toward the MUST rather than away from it.
let deliveringNotices = false

/**
 * The single write path: plan purely, then swap, then tell.
 *
 * @purity non-pure
 */
export function applyDocumentChange(
  input: Omit<PlanInput, 'document' | 'history'>,
  holder: DocumentHolder,
  audience: ChangeAudience,
): ApplyOutcome {
  // CS-3 of table T-066: one write collects the stamps and the whole change at
  // the moment this is called. Reading the holder once is what makes that true
  // -- a second read partway through would be a different consistency unit.
  const held = holder.read()
  const plan: ChangePlan = planDocumentChange({
    ...input,
    // WS-2 stays pure: it is told the moment, it does not go looking. What the
    // caller knows and what this file knows are both true, so either refuses.
    moment: {
      ...input.moment,
      deliveringNotices: input.moment.deliveringNotices || deliveringNotices,
    },
    document: held.document,
    history: held.history,
  })
  if (!plan.ok) return { accepted: false, refusal: plan.refusal }

  // ---- WS-6 -------------------------------------------------------------
  holder.replace({ document: plan.document, history: plan.history })

  // ---- WS-7, and only now ------------------------------------------------
  // The window is exactly this call. `finally` closes it even when a
  // subscriber throws -- otherwise one bad subscriber would refuse every write
  // for the rest of the run, and Chapter 5.5 refuses DURING the delivery only.
  deliveringNotices = true
  try {
    audience.deliver(plan.document, plan.hasMovedSchedule)
  } finally {
    deliveringNotices = false
  }

  return { accepted: true, document: plan.document, hasMovedSchedule: plan.hasMovedSchedule }
}

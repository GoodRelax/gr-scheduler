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
export type {
  DocumentCommand,
  Refusal,
  SettingsLimits,
  ProjectCommand,
  DocumentSettingsCommand,
} from '../edit-document/edit-document'
export type { ChangeStep, PlanInput, PlanRefusal, WriteMoment } from './document-change-plan'

/** What the caller holds and lets this component replace. Table T-060's LY-5. */
export interface DocumentHolder {
  read(): { readonly document: Document; readonly history: EditHistory<ChangeStep> }
  /** WS-6. One assignment, both values together. */
  replace(document: Document, history: EditHistory<ChangeStep>): void
}

/** WS-7's audience. Told after the swap, never before. */
export interface ChangeAudience {
  deliver(document: Document): void
}

export type ApplyOutcome =
  | { readonly accepted: false; readonly refusal: PlanRefusal }
  | { readonly accepted: true; readonly document: Document; readonly raisedRevision: boolean }

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
    document: held.document,
    history: held.history,
  })
  if (!plan.ok) return { accepted: false, refusal: plan.refusal }

  // ---- WS-6 -------------------------------------------------------------
  holder.replace(plan.document, plan.history)

  // ---- WS-7, and only now ------------------------------------------------
  audience.deliver(plan.document)

  return { accepted: true, document: plan.document, raisedRevision: plan.raisedRevision }
}

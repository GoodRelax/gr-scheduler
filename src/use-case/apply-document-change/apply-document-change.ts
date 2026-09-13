// ApplyDocumentChange: the one write path to the document.
// @unit      UF-8   (docs/spec/05-07-design.md, table T-075)
// @component ApplyDocumentChange, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-8

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

export type {
  DocumentCommand,
  EditReport,
  Refusal,
  SettingsLimits,
} from '../edit-document/edit-document'
import type { EditReport } from '../edit-document/edit-document'
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

export interface DocumentHolder {
  /** @purity semi-pure-b */
  read(): HeldDocument
  /** @purity non-pure */
  replace(next: HeldDocument): void
}

export interface ChangeAudience {
  /** @purity non-pure */
  deliver(document: Document, hasMovedSchedule: boolean): void
}

export type ApplyOutcome =
  | { readonly accepted: false; readonly refusal: PlanRefusal }
  | {
      readonly accepted: true
      readonly document: Document
      readonly hasMovedSchedule: boolean
      readonly report: EditReport
    }

export type ReplaceOutcome =
  | { readonly accepted: false; readonly refusal: ReplacementRefusal }
  | {
      readonly accepted: true
      readonly document: Document
      readonly hasMovedSchedule: boolean
    }

// WHY: module-scoped, not on WriteMoment: a subscriber writing back from deliver would say false.
let deliveringNotices = false

/** @purity semi-pure-b */
function momentInsideTheWindow(moment: WriteMoment): WriteMoment {
  return { ...moment, deliveringNotices: moment.deliveringNotices || deliveringNotices }
}

/** @purity non-pure */
function replaceThenTell(
  next: HeldDocument,
  hasMovedSchedule: boolean,
  holder: DocumentHolder,
  audience: ChangeAudience,
): void {
  holder.replace(next)

  deliveringNotices = true
  try {
    audience.deliver(next.document, hasMovedSchedule)
  } finally {
    deliveringNotices = false
  }
}

// see CP-8, T-067
/** @purity non-pure */
export function applyDocumentChange(
  input: Omit<PlanInput, 'document' | 'history'>,
  holder: DocumentHolder,
  audience: ChangeAudience,
): ApplyOutcome {
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

// see T-230
/** @purity non-pure */
export function replaceDocument(
  input: Omit<ReplacementInput, 'held'>,
  holder: DocumentHolder,
  audience: ChangeAudience,
): ReplaceOutcome {
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

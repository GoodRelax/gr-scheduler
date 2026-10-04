// UndoEdit: one step back through the edit history.
// @unit      UF-20  (docs/spec/05-07-design.md, table T-075)
// @component UndoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-11

import type { Document } from '../../entity/document-model/document/document'
import { previousStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'

export interface ChangeStep {
  readonly document: Document
  readonly commands: readonly string[]
}

export interface HeldDocument {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

export type UndoOutcome =
  | {
      readonly undone: false
      readonly next: HeldDocument
    }
  | {
      readonly undone: true
      readonly next: HeldDocument
      readonly commands: readonly string[]
    }

// see FR-031, PI-11
/** @purity pure */
export function undoEdit(held: HeldDocument): UndoOutcome {
  const moved = previousStep(held.history, (step) => ({ ...step, document: held.document }))
  if (moved.step === null) return { undone: false, next: held }
  return {
    undone: true,
    next: { document: moved.step.document, history: moved.history },
    commands: moved.step.commands,
  }
}

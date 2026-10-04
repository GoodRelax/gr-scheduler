// RedoEdit: one step forward through the edit history.
// @unit      UF-21  (docs/spec/05-07-design.md, table T-075)
// @component RedoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-12

import { nextStep } from '../../entity/document-model/edit-history/edit-history'
import type { HeldDocument } from '../undo-edit/undo-edit'

export type RedoOutcome =
  | {
      readonly redone: false
      readonly next: HeldDocument
    }
  | {
      readonly redone: true
      readonly next: HeldDocument
      readonly commands: readonly string[]
    }

// see FR-031, PI-12
/** @purity pure */
export function redoEdit(held: HeldDocument): RedoOutcome {
  const moved = nextStep(held.history, (step) => ({ ...step, document: held.document }))
  if (moved.step === null) return { redone: false, next: held }
  return {
    redone: true,
    next: { document: moved.step.document, history: moved.history },
    commands: moved.step.commands,
  }
}

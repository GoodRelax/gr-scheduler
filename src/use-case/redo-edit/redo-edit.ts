// RedoEdit: one step forward through the edit history.
// @unit      UF-21  (docs/spec/05-07-design.md, table T-075)
// @component RedoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-12

import type { Document } from '../../entity/document-model/document/document'
import { nextStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'
import type { ChangeStep, HeldDocument } from '../undo-edit/undo-edit'

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
  const moved = nextStep(held.history)
  if (moved.step === null) return { redone: false, next: held }
  return {
    redone: true,
    next: {
      document: moved.step.document,
      history: withDocumentLeftBehind(moved.history, held.document),
    },
    commands: moved.step.commands,
  }
}

// TRAP: a done entry holds the document before its write, an undone entry the one after.
/** @purity pure */
function withDocumentLeftBehind(
  history: EditHistory<ChangeStep>,
  leaving: Document,
): EditHistory<ChangeStep> {
  const last = history.done.length - 1
  const entry = history.done[last]
  if (entry === undefined) return history
  return {
    done: [
      ...history.done.slice(0, last),
      { ...entry, step: { ...entry.step, document: leaving } },
    ],
    undone: history.undone,
  }
}

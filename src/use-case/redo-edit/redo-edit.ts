// RedoEdit -- public entry of this folder.
//
// @unit      UF-21  (docs/spec/05-07-design.md, table T-075)
// @component RedoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-12
//
// One step forward through the history (CP-12, FR-031). UndoEdit (CP-11) is a
// separate component, so the mirror of its mechanics below is structural.
//
// The answer is a value: replacing the current value is WS-6 of table T-067 and
// belongs to ApplyDocumentChange alone. RD-2 of table T-230 puts this unit in
// WS-3's position, so the moment (WS-2) and the notices (WS-7) are the caller's.
//
// A step holds a whole `Document`, stamp and all, and it is replayed verbatim:
// FR-063 reads stamps by equality only, and an undo followed by a redo then lands
// on exactly the two documents current before and after that write.
//
// What an entry of the history holds depends on which side it is on:
//
//     done    the document as it stood BEFORE that write  -- what undo restores
//     undone  the document as it stood AFTER that write   -- what redo restores
//
// So a redo moves the entry back onto the undo side and makes it carry the
// document being left behind, which a later undo answers with. Only the snapshot
// flips: the command kinds name the write, not the document.
//
// No empty step is skipped here: AG-10 keeps such bundles out at push time
// (WS-4), so this unit never reads table T-027.
//
// No `HistoryLimits` argument: nothing is pushed here. The size an entry was
// pushed with travels with it unchanged, because `historyWithStep` applies the
// S-95 bound at push time only.

import type { Document } from '../../entity/document-model/document/document'
import { nextStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'
// From UndoEdit, not ApplyDocumentChange: ApplyDocumentChange imports both
// halves of the history walk (table T-230), so taking the pair from it would be
// a cycle (LR-3). A second declaration here would be two types that only look
// alike.
import type { ChangeStep, HeldDocument } from '../undo-edit/undo-edit'

/**
 * What one press of redo answers.
 *
 * `next` is present in both branches, and is the pair handed in when nothing
 * moved, so a caller that commits it unconditionally is still correct.
 */
export type RedoOutcome =
  | {
      readonly redone: false
      readonly next: HeldDocument
    }
  | {
      readonly redone: true
      readonly next: HeldDocument
      /** The table T-108 command kinds the redone step recorded, in applied order. */
      readonly commands: readonly string[]
    }

/**
 * `held` is passed in because LY-5 leaves holding the current value to the
 * Framework.
 *
 * @purity pure
 */
export function redoEdit(held: HeldDocument): RedoOutcome {
  const moved = nextStep(held.history)
  if (moved.step === null) return { redone: false, next: held }
  return {
    redone: true,
    next: {
      // Not rebuilt from the command kinds: those are names, and a name cannot
      // be replayed.
      document: moved.step.document,
      history: withDocumentLeftBehind(moved.history, held.document),
    },
    commands: moved.step.commands,
  }
}

/**
 * The history after the entry just moved onto the undo side carries `leaving`.
 *
 * Built as a value rather than through PI-4 because PI-4 moves an entry across
 * untouched, and a `done` entry and an `undone` entry hold opposite sides of the
 * same write.
 *
 * @purity pure
 */
function withDocumentLeftBehind(
  history: EditHistory<ChangeStep>,
  leaving: Document,
): EditHistory<ChangeStep> {
  // `nextStep` appends to the end of the undo side, so that is the entry to fix.
  const last = history.done.length - 1
  const entry = history.done[last]
  // Unreachable once `nextStep` answered a step; answered rather than thrown (R7.10).
  if (entry === undefined) return history
  return {
    done: [
      ...history.done.slice(0, last),
      { ...entry, step: { ...entry.step, document: leaving } },
    ],
    undone: history.undone,
  }
}

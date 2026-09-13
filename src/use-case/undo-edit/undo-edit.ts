// UndoEdit -- public entry of this folder.
//
// @unit      UF-20  (docs/spec/05-07-design.md, table T-075)
// @component UndoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-11
//
// One step back through the history `EditHistory` holds (CP-11, FR-031; redo is
// RedoEdit, CP-12).
//
// ⚠️ This unit decides what the document becomes, and nothing else: replacing the
// current value is WS-6 of table T-067, ApplyDocumentChange's alone (CP-8), so
// the answer is a value. RD-1 of table T-230 puts this unit in WS-3's position:
// `replaceDocument` (PI-8) reads the pair once (CS-3), asks `undoEdit`, and runs
// WS-4 to WS-7 over the answer. Judging the moment (WS-2 / AG-9) and notices
// (WS-7) are that caller's.
//
// `ChangeStep` and `HeldDocument` are declared here because ApplyDocumentChange
// imports this component; declaring them there would close a cycle (LR-3), as
// `DocumentCommand` would towards EditDocument.
//
// The restored document carries its earlier stamp, as the history holds it
// (FR-063); that is safe because AG-6 compares instants for equality, not order.
//
// ⛔ That answer is not what is committed: a step holds a whole document, so it
// also holds columns table T-027 keeps outside the history (UN-7, UN-8, UN-12,
// UN-16) as they stood when an unrelated edit pushed it. The caller keeps those
// from the document being left behind (`columnsOutsideHistory` in
// document-change-plan.ts, RD-1 and RD-2). ⛔ Do not copy that census here: this
// unit reads table T-027 nowhere.
//
// What an entry holds depends on its side:
//
//     done    the document as it stood BEFORE that write  -- what undo restores
//     undone  the document as it stood AFTER that write   -- what redo restores
//
// WS-4 pushes the first; this unit produces the second, because the document
// current when undo is pressed is held nowhere else and redo must return to it
// (FR-031). ⚠️ Only the snapshot flips; the command kinds name the write and stay.
//
// FR-031's boundary cases are answers, not errors: an all-excluded bundle was
// never recorded (AG-10, at WS-4), and an empty history gives `undone: false`
// with the pair handed back (R7.10).
//
// No `HistoryLimits` argument: nothing is pushed here. ⚠️ An entry's size travels
// unchanged -- PI-4 offers no way to restate it, and `historyWithStep` applies
// the S-95 bound at push time only.

import type { Document } from '../../entity/document-model/document/document'
import { previousStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'

/**
 * One step of the undo history: the document as it stood before the write.
 * Declared here, not beside WS-4 (see the header); ApplyDocumentChange
 * re-exports it on PI-8's face.
 */
export interface ChangeStep {
  readonly document: Document
  /** The rows of table T-108 this step undoes, in the order they were applied. */
  readonly commands: readonly string[]
}

/**
 * The pair the holder keeps: the current document and the history that undoes
 * it. ⚠️ One value, because WS-6 is one reference assignment: a seam taking two
 * would let a holder pair a document with the previous history (AG-4).
 */
export interface HeldDocument {
  readonly document: Document
  readonly history: EditHistory<ChangeStep>
}

/**
 * What one press of undo answers.
 *
 * `next` is present in both branches, and is the pair handed in when nothing
 * moved, so a caller that commits it unconditionally is still correct.
 */
export type UndoOutcome =
  | {
      /** Nothing was undone: the history held no step (FR-031). */
      readonly undone: false
      readonly next: HeldDocument
    }
  | {
      readonly undone: true
      /** The document and history the holder should hold next. */
      readonly next: HeldDocument
      /**
       * The table T-108 command kinds the undone step recorded, in the order
       * they were applied -- the step's own list, unchanged.
       */
      readonly commands: readonly string[]
    }

/**
 * One step back. `held` is read once by the caller (CS-3), because the Framework
 * holds the current value (LY-5).
 *
 * @purity pure
 */
export function undoEdit(held: HeldDocument): UndoOutcome {
  const moved = previousStep(held.history)
  if (moved.step === null) return { undone: false, next: held }
  return {
    undone: true,
    next: {
      // The document the history holds, not one built here.
      document: moved.step.document,
      history: withDocumentLeftBehind(moved.history, held.document),
    },
    commands: moved.step.commands,
  }
}

/**
 * The history after the entry that just moved onto the redo side has been made
 * to carry `leaving` -- the state that write produced, which redo returns to.
 *
 * ⚠️ Built as a value because PI-4 moves an entry across untouched, and a `done`
 * and an `undone` entry hold opposite sides of the same write. The `size` stays
 * as pushed; see the header.
 *
 * @purity pure
 */
function withDocumentLeftBehind(
  history: EditHistory<ChangeStep>,
  leaving: Document,
): EditHistory<ChangeStep> {
  const entry = history.undone[0]
  // Unreachable: `previousStep` answered a step, so it put one here. Answering
  // the history untouched rather than throwing keeps R7.10 whole.
  if (entry === undefined) return history
  return {
    done: history.done,
    undone: [
      { ...entry, step: { ...entry.step, document: leaving } },
      ...history.undone.slice(1),
    ],
  }
}

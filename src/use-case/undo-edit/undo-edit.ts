// UndoEdit -- public entry of this folder.
//
// @unit      UF-20  (docs/spec/05-07-design.md, table T-075)
// @component UndoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-11
//
// One step back through the history `EditHistory` holds (CP-11 -- "履歴を 1 段
// 戻す"). FR-031 is the requirement, and it asks for both directions: undo the
// previous edit, and let what was undone be redone (RedoEdit, CP-12).
//
// ⚠️ This unit decides WHAT the document becomes, and nothing else. Replacing
// the current value is WS-6 of table T-067 and belongs to ApplyDocumentChange
// alone (CP-8, and table T-042's MS-1 -- with two entrances "片方にしか掛から
// ない検証や履歴が生まれる"). So the answer is a value.
//
// ⭐ RD-1 OF TABLE T-230 PUTS THIS UNIT IN WS-3's POSITION, so the value is
// asked for by the one write path rather than committed beside it:
// `replaceDocument` (PI-8) reads the pair once (CS-3), asks `undoEdit`, and
// runs WS-4 to WS-7 over the answer. ⭐ RD-1's own three columns are that
// caller's: the history is the one this unit answered, the stamp is left as it
// came in, and no undo step is pushed.
//
// ⚠️ THE DIRECTION IS ApplyDocumentChange -> UndoEdit, which is the component
// figure's and which A-appendix 0.86 settles in words. That is why `ChangeStep`
// and `HeldDocument` are DECLARED below: the pair used to be imported from
// ApplyDocumentChange, and leaving it there once that component asks this one
// would close a cycle inside the layer (LR-3, MUST NOT). ⭐ The identical move
// `DocumentCommand` already makes towards EditDocument. ⚠️ Neither name is a
// member of table T-064 -- its preamble leaves arguments and return values to
// `src/`, and both are `undoEdit`'s.
//
// Judging the moment (WS-2 / AG-9 -- mid-gesture, mid-edit, mid-delivery) and
// handing out notices (WS-7) belong to that caller, not here.
//
// ⭐ WHAT STAMP THE RESTORED DOCUMENT CARRIES IS SETTLED, and it is the earlier
// one. A step holds the whole earlier `Document`, stamp and all, so restoring it
// verbatim carries the earlier stamp back -- and FR-063 says in as many words
// that an undo restores an earlier document 刻印ごと. That is safe precisely
// because no judgement reads the stamp as an order any more (MUST NOT): AG-6
// asks whether the schedule instant a watcher holds is the one the document
// carries, so a watcher that had been handed the later document is told about
// the restored one instead of being passed over as "not newer".
// ⚠️ This unit answers the document the history holds, exactly as it holds it --
// FR-031 leaves no other document to answer with, and an undo followed by a redo
// then lands on precisely the two documents that were current before and after
// that write.
//
// ⭐ What an entry of the history holds depends on which side it is on:
//
//     done    the document as it stood BEFORE that write  -- what undo restores
//     undone  the document as it stood AFTER that write   -- what redo restores
//
// WS-4 pushes the first (`ChangeStep`); this unit produces the second. The entry
// that moves onto the redo side is made to carry the document being left behind,
// and it HAS to: the document that is current when undo is pressed is held
// nowhere else, so without this one undo followed by one redo could not answer
// with it -- and FR-031 requires that redo. ⚠️ Only the snapshot flips. The
// command kinds stay with the entry that recorded them, because they name the
// write, not the document.
//
// FR-031's boundary cases, both of them answers rather than errors:
//   - A bundle whose commands are all outside table T-027 was never recorded at
//     all (AG-10, applied by WS-4 where the commands still exist), so there is
//     no empty step to skip here and this unit never reads table T-027 itself.
//   - An empty history gives `undone: false` and hands the pair straight back
//     (R7.10 -- a failure is a value, not a thrown error).
//
// No `HistoryLimits` argument: nothing is pushed here, so S-94 and S-95 (table
// T-206, values in docs/spec/_assets/tbl-settings.md) are not touched. ⚠️ The
// size an entry was pushed with travels with it unchanged -- PI-4 offers no way
// to restate it, how a step is measured is a decision of the file that pushes
// one, and `historyWithStep` applies the S-95 bound at push time only.
//
// Cost is O(steps) per press -- the copies `EditHistory` makes, bounded by S-94
// -- and nothing here sits on a per-frame path (NFR-013 / R5).
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'
import { previousStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'

/**
 * One step of the undo history: the document as it stood before the write.
 *
 * ⚠️ Declared here although WS-4 of table T-067 is what pushes one -- see the
 * header: RD-1 of table T-230 makes ApplyDocumentChange the importer of this
 * component, so the declaration cannot sit on the other side of that import
 * (LR-3). ⭐ ApplyDocumentChange re-exports it, so PI-8's face does not move.
 */
export interface ChangeStep {
  readonly document: Document
  /** The rows of table T-108 this step undoes, in the order they were applied. */
  readonly commands: readonly string[]
}

/**
 * The pair the holder keeps: the current document and the history that undoes
 * it. ⚠️ They are ONE value because WS-6 is one reference assignment (MUST) --
 * a document paired with the previous history is exactly the mixture AG-4
 * forbids, and a seam that took two arguments would ask every holder to write
 * two fields and trust it to do so in one breath.
 *
 * ⭐ It is this unit's argument AND its answer (RD-1 hands the answered pair
 * straight to WS-6), which is the other reason the declaration belongs here.
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
      /** Nothing was undone: the history held no step (FR-031, a defined answer). */
      readonly undone: false
      readonly next: HeldDocument
    }
  | {
      readonly undone: true
      /** The document and history the holder should hold next. */
      readonly next: HeldDocument
      /**
       * The table T-108 command kinds the undone step recorded, in the order
       * they were applied. ⚠️ The step's own list, unchanged -- FR-031 asks
       * this unit to interpret nothing.
       */
      readonly commands: readonly string[]
    }

/**
 * One step back. `held` is what the holder holds -- read once (CS-3) and passed
 * in, because LY-5 leaves holding the current value to the Framework.
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
 * to carry `leaving` -- the document undo is stepping away from, which is the
 * state that write produced and therefore the state redo returns to.
 *
 * ⚠️ Built as a value rather than through PI-4 because PI-4 moves an entry
 * across without touching it, and a `done` entry and an `undone` entry hold
 * opposite sides of the same write. The `size` is the one the entry was pushed
 * with; see the note in the header.
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

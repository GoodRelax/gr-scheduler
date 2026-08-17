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
// ない検証や履歴が生まれる"). So the answer is a value, and the caller joins
// the two like this:
//
//     const held = holder.read()        // CS-3: one read of the pair
//     const outcome = undoEdit(held)    // pure -- this unit
//     if (outcome.undone) { ...commit outcome.next through the one write path }
//
// Judging the moment (WS-2 / AG-9 -- mid-gesture, mid-edit, mid-delivery) and
// handing out notices (WS-7) belong to that commit, not here.
//
// ⛔ STOP -- the specification does not decide HOW `outcome.next` reaches WS-6.
// `applyDocumentChange` takes `DocumentCommand`s (PI-8) and table T-108 has no
// command that restores a whole document, so ApplyDocumentChange publishes no
// entry that commits a document computed elsewhere. FR-031 requires the undo to
// take effect and MS-1 forbids it taking effect through a second write path.
// This unit neither chooses an entry nor opens one; whoever closes this adds it
// to ApplyDocumentChange (CP-8), never here and never in the holder's owner.
//
// ⛔ STOP -- nor does it decide what `revisionStamp` the committed document
// carries. A step holds the whole earlier `Document`, stamp and all, so
// restoring it verbatim carries the earlier stamp back, while FR-063 calls the
// revision "1 ずつ増える整数" and AG-6 selects what a watcher has not yet seen BY
// that revision. Advancing it instead is WS-5, which needs the clock the
// Framework owns (CS-1 / LY-5) and is part of a write this unit does not
// perform. ⚠️ What this unit answers is the document the history holds, exactly
// as it holds it -- FR-031 leaves no other document to answer with, and an undo
// followed by a redo then lands on precisely the two documents that were current
// before and after that write. If the committed document must carry a different
// stamp, that belongs to whoever closes the STOP above.
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
// LR-2: through the other component's public entry. `ChangeStep` and
// `HeldDocument` are declared there because WS-4 pushes the one and WS-6
// replaces the other; naming them here would be a second declaration of the
// same pair.
import type { ChangeStep, HeldDocument } from '../apply-document-change/apply-document-change'

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

// RedoEdit -- public entry of this folder.
//
// @unit      UF-21  (docs/spec/05-07-design.md, table T-075)
// @component RedoEdit, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-12
//
// One step forward through the history `EditHistory` holds (CP-12 -- "履歴を 1
// 段進める"). FR-031 asks for both directions in one sentence: "直前の編集を取り
// 消し、取り消した編集をやり直せるようにすること". This is the second half; the
// first is UndoEdit (CP-11), and the two are separate components, so the small
// mirror of each other's mechanics below is structural, not a copy that drifted.
//
// ⚠️ This unit decides WHAT the document becomes, and nothing else. Replacing
// the current value is WS-6 of table T-067 and belongs to ApplyDocumentChange
// alone (CP-8, and table T-042's MS-1 -- with two entrances "片方にしか掛から
// ない検証や履歴が生まれる"). So the answer is a value, and the caller joins
// the two like this:
//
//     const held = holder.read()        // CS-3: one read of the pair
//     const outcome = redoEdit(held)    // pure -- this unit
//     if (outcome.redone) { ...commit outcome.next through the one write path }
//
// Judging the moment (WS-2 / AG-9 -- mid-gesture, mid-edit, mid-delivery) and
// handing out notices (WS-7) belong to that commit, not here.
//
// ⛔ STOP -- the specification does not decide HOW `outcome.next` reaches WS-6.
// `applyDocumentChange` takes `DocumentCommand`s (PI-8) and table T-108 has no
// command that restores a whole document, so ApplyDocumentChange publishes no
// entry that commits a document computed elsewhere. FR-031 requires the redo to
// take effect and MS-1 forbids it taking effect through a second write path.
// This unit neither chooses an entry nor opens one; whoever closes this adds it
// to ApplyDocumentChange (CP-8), never here and never in the holder's owner.
//
// ⭐ WHAT STAMP THE REPLAYED DOCUMENT CARRIES IS SETTLED, and it is the one the
// step holds. A step holds a whole `Document`, stamp and all, so replaying it
// verbatim carries that stamp with it -- which FR-063 allows precisely because
// no judgement reads the stamp as an order any more (MUST NOT). AG-6 asks
// whether the schedule instant a watcher holds is the one the document carries,
// so a watcher is told about the replayed document either way round.
// ⚠️ What this unit answers is the document the history holds, exactly as it
// holds it -- an undo followed by a redo therefore lands on precisely the two
// documents that were current before and after that write.
//
// ⭐ What an entry of the history holds depends on which side it is on:
//
//     done    the document as it stood BEFORE that write  -- what undo restores
//     undone  the document as it stood AFTER that write   -- what redo restores
//
// So a redo takes the document off the entry it moves back onto the undo side,
// and that entry is then made to carry the document being left behind -- which
// is the state before that write, the thing a later undo has to answer with.
// ⚠️ Only the snapshot flips. The command kinds stay with the entry that
// recorded them, because they name the write, not the document.
//
// FR-031's boundary cases, both of them answers rather than errors:
//   - Every entry is a real step: a bundle whose commands are all outside table
//     T-027 was never recorded at all (AG-10, applied by WS-4), so there is no
//     empty step to skip here and this unit never reads table T-027 itself.
//   - Nothing to redo -- an untouched history, or a history where a new edit has
//     made the redo side unreachable (`historyWithStep` drops it) -- gives
//     `redone: false` and hands the pair straight back (R7.10 -- a failure is a
//     value, not a thrown error).
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
import { nextStep, type EditHistory } from '../../entity/document-model/edit-history/edit-history'
// LR-2: through the other component's public entry. `ChangeStep` and
// `HeldDocument` are declared there because WS-4 pushes the one and WS-6
// replaces the other; naming them here would be a second declaration of the
// same pair.
import type { ChangeStep, HeldDocument } from '../apply-document-change/apply-document-change'

/**
 * What one press of redo answers.
 *
 * `next` is present in both branches, and is the pair handed in when nothing
 * moved, so a caller that commits it unconditionally is still correct.
 */
export type RedoOutcome =
  | {
      /** Nothing was redone: the redo side held no step (FR-031, a defined answer). */
      readonly redone: false
      readonly next: HeldDocument
    }
  | {
      readonly redone: true
      /** The document and history the holder should hold next. */
      readonly next: HeldDocument
      /**
       * The table T-108 command kinds the redone step recorded, in the order
       * they were applied. ⚠️ The step's own list, unchanged -- FR-031 asks
       * this unit to interpret nothing.
       */
      readonly commands: readonly string[]
    }

/**
 * One step forward. `held` is what the holder holds -- read once (CS-3) and
 * passed in, because LY-5 leaves holding the current value to the Framework.
 *
 * @purity pure
 */
export function redoEdit(held: HeldDocument): RedoOutcome {
  const moved = nextStep(held.history)
  if (moved.step === null) return { redone: false, next: held }
  return {
    redone: true,
    next: {
      // The document the history holds, not one rebuilt from the command kinds:
      // those name the rows of table T-108, and a name cannot be replayed.
      document: moved.step.document,
      history: withDocumentLeftBehind(moved.history, held.document),
    },
    commands: moved.step.commands,
  }
}

/**
 * The history after the entry that just moved back onto the undo side has been
 * made to carry `leaving` -- the document redo is stepping away from, which is
 * the state before that write and therefore the state a later undo returns to.
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
  // `nextStep` appends to the end of the undo side, so that is the entry to fix.
  const last = history.done.length - 1
  const entry = history.done[last]
  // Unreachable: `nextStep` answered a step, so it put one there. Answering the
  // history untouched rather than throwing keeps R7.10 whole.
  if (entry === undefined) return history
  return {
    done: [
      ...history.done.slice(0, last),
      { ...entry, step: { ...entry.step, document: leaving } },
    ],
    undone: history.undone,
  }
}

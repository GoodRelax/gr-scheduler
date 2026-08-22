// PostDialogueMessage -- public entry of this folder.
//
// @unit      UF-26   (docs/spec/05-07-design.md, table T-075)
// @component PostDialogueMessage, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-16
//
// CP-16 in one line: "確定した発話を `DialogueLog` へ積み、配る。文書に保存し
// ない" -- append the settled utterance to the log, then hand it out, and never
// put it in the document.
//
// ⭐ THIS WRITES BESIDE `applyDocumentChange`, NOT THROUGH IT. The
// specification settles that; it is not a choice made here.
//
//   1. MS-1 of table T-042 and Chapter 5.1 make ONE path of 文書への書き込み --
//      a write TO THE DOCUMENT. An utterance is not one. FR-066 forbids keeping
//      the conversation in the document ("会話そのものを文書に保存してはならな
//      い（MUST NOT）"), and DR-1 of table T-052 lets the root hold the three
//      groups and nothing else -- so there is no field for an utterance to be
//      written into. `documentViolations` would report a `dialogueLog` key on
//      the root as a DR-1 violation. LY-1 of table T-060 files the settled
//      utterance where it actually belongs: 文書に保存しない実行時の値.
//   2. `applyDocumentChange` takes DocumentCommands and produces a Document.
//      Sending an utterance through it would mean inventing a command for it,
//      which is exactly the DR-1 breach above.
//   3. Appendix A (version 0.36) says it in as many words -- 「`AG-11`（発話は
//      版数を上げないので `WS-6` を通らない）」. That is why table T-078 needed
//      FT-5 at all: the frame that shows the utterance cannot be raised by FT-2
//      (the WS-6 swap), because there is no WS-6 swap.
//   4. The component graph agrees: `_source/components.json` gives this
//      component two outgoing edges, to `DialogueLog` and to
//      `NotifyChangeWatchers`, and none to `ApplyDocumentChange`.
//
// ⚠️ What follows from writing beside the one path, so that nobody looks for it
// here: no stamp is advanced (FR-063 moves the schedule instant for the schedule
// group and the other instant and 最後に書いた者 for either group -- an utterance is
// in NEITHER group, so the requirement does not reach it, and a reader's stamp
// stays valid across a post, which is what AG-2's lock wants); no history step
// (table T-027 is about editing the document); no WS-1 stamp match and no WS-2
// moment check (an utterance passes neither).
//
// ⚠️ And what does NOT follow: the notice still happens. AG-11 says the
// utterance 日程データの群の刻を動かさない and then 「それでも監視は起きること」(AG-6).
// Since the stamp cannot select it, the log counts in an order of its own, and
// `messagesSince` selects on that (PI-33). Picking WHICH watcher wakes is not
// this file's: table T-063's UT-3 puts that rule on the pure side of
// NotifyChangeWatchers (UF-25).
//
// ⚠️ AG-11's MUST NOT -- "確定していない入力途中の文字を読めてはならない" -- is
// honoured by what this file is handed, not by a check inside it. The half-typed
// buffer never reaches here: on the human side `dialogueMessageFromInput`
// (PI-37) produces the utterance only once it is settled, and on the AI side
// AM-18 of table T-107 posts a settled one.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type {
  DialogueLog,
  DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'
import { logWithMessage } from '../../entity/document-model/dialogue-log/dialogue-log'

/**
 * What the caller hands over: a `DialogueMessage` without its `sequence`, i.e.
 * `author`, `text` and `settledAt`.
 *
 * ⚠️ The sequence is deliberately NOT the caller's to choose -- `logWithMessage`
 * gives it, because two callers picking the same number would lose a message
 * from AG-6's selection.
 *
 * ⚠️ `author` and `settledAt` are VALUES, not something read here. Who is
 * speaking and what the clock says are outside (LY-5 of table T-060, and CS-1 of
 * table T-066 keeps the clock out of the inner layers) -- the same reason
 * `editedBy` and `updatedUtc` are arguments on the document write path. AG-6
 * selects on 自分以外の書き手, so `author` is the name a watcher compares
 * against its own.
 */
export type SettledUtterance = Omit<DialogueMessage, 'sequence'>

/**
 * What the caller holds and lets this component replace.
 *
 * ⚠️ The log is NOT in the document (FR-066's MUST NOT, and DR-1 of table
 * T-052), so it cannot be reached through the document at all. LY-5 leaves the
 * current value with the Framework, which is where this seam is implemented --
 * the same shape `DocumentHolder` has, for the same reason.
 */
export interface DialogueLogHolder {
  /** The log as it stands, read once before the append. @purity semi-pure-b */
  read(): DialogueLog
  /** One reference, replaced whole (LY-1: 丸ごと置き換える). @purity non-pure */
  replace(next: DialogueLog): void
}

/**
 * Who is told, once the log holds the utterance. This is the 配る of CP-16 and
 * the FT-5 trigger of table T-078 -- the watchers of AG-6 wake here although the
 * schedule instant did not move, and the frame that shows the dialogue field runs.
 *
 * ⚠️ Declared here rather than imported from NotifyChangeWatchers: the seam is
 * an interface the caller satisfies (LR-5 / R2.6), which is how `ChangeAudience`
 * is declared on the document write path as well.
 */
export interface DialogueAudience {
  /**
   * ⚠️ Given the WHOLE log, not just the new message: AG-6 wakes a watcher for
   * everything it has not received yet, which `messagesSince` selects from the
   * log by the watcher's remembered sequence. One message would not be enough
   * for a watcher that missed an earlier one.
   *
   * @purity non-pure
   */
  deliver(log: DialogueLog): void
}

// ---- non-pure from here on (R7.7) -----------------------------------------

/**
 * Append one settled utterance, then tell.
 *
 * Returns the log AFTER the append -- the same value the holder now holds. The
 * message just posted is its last entry, and the number it was given is the
 * order AG-11 requires the watchers to count in (版数とは別の順序), so a caller
 * can hand that number back to AG-6's selection as "what I have already seen"
 * (`latestSequence` and `messagesSince` in `dialogue-log.ts`). The log is
 * returned rather than the bare message because `logWithMessage` is what assigns
 * the sequence, and digging the entry back out of the array would add a branch
 * for a log that cannot be empty.
 *
 * ⚠️ Accepting is the only outcome this file has, because the specification
 * states no rule an utterance can fail: see the two STOP notes below.
 *
 * ⚠️ The order is append-then-deliver, and CP-16 fixes it in that word order
 * (積み、配る). The reason table T-067 gives for WS-6 before WS-7 holds
 * identically -- a subscriber told first would read the log it already had --
 * but T-067 governs the DOCUMENT, and this call reaches neither WS-6 nor WS-7,
 * so CP-16 is the row that binds here.
 *
 * @purity non-pure
 */
export function postDialogueMessage(
  utterance: SettledUtterance,
  holder: DialogueLogHolder,
  audience: DialogueAudience,
): DialogueLog {
  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: whether an EMPTY or
  // whitespace-only utterance is refused, and whether the text has any bound.
  // AG-11 and FR-066 state no rule on the text, table T-107's AM-18 says only
  // 確定した発話, and `_assets/tbl-settings.md` holds no dialogue row -- so there
  // is no value to take from DocumentSettings and none to receive as an argument
  // the way HistoryLimits and PointerSlop are received. This file therefore
  // posts what it is given and refuses nothing; refusing would be a rule made up
  // here. If a refusal is wanted, the rule and its value belong in the
  // specification first, and the return type grows a refusal branch shaped by
  // AG-9a at that point.

  // One read, then the append. R7.4: nothing further is read part way through,
  // so the log this call appends to is the log it delivers. This file adds no
  // scan of the log and no lookup inside a loop, which R5 / NFR-013 would not
  // have on a write path.
  const posted = logWithMessage(holder.read(), utterance)

  // Replace before delivering, as one reference (LY-1: 丸ごと置き換える), so no
  // subscriber can be handed a log that is half old and half new.
  holder.replace(posted)

  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION, and not chosen here.
  // Chapter 5.5 makes refusing a write DURING a delivery a MUST ("通知を配って
  // いるあいだの書き込みは拒否すること"), but it places the refusal at WS-2, and
  // an utterance reaches neither WS-2 nor WS-6 (Appendix A, version 0.36). So
  // nothing settles either direction of re-entry here:
  //   (a) an utterance posted from inside this `deliver` -- it would append and
  //       deliver again, and nothing bounds the nesting;
  //   (b) whether a DOCUMENT write from inside this `deliver` is one of the
  //       writes Chapter 5.5 refuses. It is not refused today: the flag WS-2
  //       reads is private to `apply-document-change.ts` and only WS-7 sets it.
  // No window is opened here and nothing is refused, because refusing would be
  // a rule this file made up.
  //
  // ⚠️ A subscriber that throws is not caught -- unlike WS-7 there is no window
  // a throw could leave open, so there is nothing for a `finally` to close.
  // FR-028's "例外を投げてはならない（MUST NOT）" binds the Agent API surface,
  // which is AgentApiEndpoint's (CP-17), not this seam.
  audience.deliver(posted)

  return posted
}

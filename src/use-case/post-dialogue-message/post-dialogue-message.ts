// PostDialogueMessage -- public entry of this folder.
//
// @unit      UF-26   (docs/spec/05-07-design.md, table T-075)
// @component PostDialogueMessage, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-16
//
// CP-16: append the settled utterance to the log, then hand it out; never put it
// in the document.
//
// This writes beside `applyDocumentChange`, not through it: an utterance is not a
// document write (FR-066, DR-1 of table T-052, LY-1 of table T-060), it does not
// pass WS-6 (AG-11), and the component graph gives this component no edge to
// ApplyDocumentChange.
//
// ⚠️ So, that nobody looks for them here: no stamp advances (FR-063 does not reach
// an utterance), no history step, no WS-1 or WS-2 check. The notice still happens
// (AG-6, AG-11), selected by the log's own order (`messagesSince`, PI-33); which
// watcher wakes is NotifyChangeWatchers' (UT-3 of table T-063).
//
// ⚠️ AG-11's MUST NOT on half-typed text is honoured by what this file is handed:
// `dialogueMessageFromInput` (PI-37) and AM-18 of table T-107 post settled
// utterances only.

import type {
  DialogueLog,
  DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'
import { logWithMessage } from '../../entity/document-model/dialogue-log/dialogue-log'

/**
 * What the caller hands over: a `DialogueMessage` without its `sequence`.
 *
 * ⚠️ `logWithMessage` gives the sequence, because two callers picking the same
 * number would lose a message from AG-6's selection.
 * ⚠️ `author` and `settledAt` are values from outside (LY-5, CS-1), as `editedBy`
 * and `updatedUtc` are on the document write path; `author` is the name AG-6
 * compares a watcher's own against.
 */
export type SettledUtterance = Omit<DialogueMessage, 'sequence'>

/**
 * What the caller holds and lets this component replace. The log is not in the
 * document (FR-066), so the Framework holds it (LY-5), as with `DocumentHolder`.
 */
export interface DialogueLogHolder {
  /** The log as it stands, read once before the append. @purity semi-pure-b */
  read(): DialogueLog
  /** One reference, replaced whole (LY-1: 丸ごと置き換える). @purity non-pure */
  replace(next: DialogueLog): void
}

/**
 * Who is told once the log holds the utterance: CP-16's hand-out, FT-5 of table
 * T-078.
 *
 * Declared here rather than imported from NotifyChangeWatchers: the caller
 * satisfies it (LR-5 / R2.6), as with `ChangeAudience`.
 */
export interface DialogueAudience {
  /**
   * ⚠️ Given the whole log, not the new message: `messagesSince` selects
   * everything a watcher has not received (AG-6), including missed earlier ones.
   *
   * @purity non-pure
   */
  deliver(log: DialogueLog): void
}

// ---- non-pure from here on (R7.7) -----------------------------------------

/**
 * Append one settled utterance, then tell.
 *
 * Returns the log after the append (what the holder now holds); its last entry's
 * sequence is what a caller hands back to AG-6's selection. The log rather than
 * the message, because `logWithMessage` assigns the sequence.
 *
 * ⚠️ Accepting is the only outcome: see the STOP notes below.
 * ⚠️ Append, then deliver (CP-16): a subscriber told first would read the old log.
 *
 * @purity non-pure
 */
export function postDialogueMessage(
  utterance: SettledUtterance,
  holder: DialogueLogHolder,
  audience: DialogueAudience,
): DialogueLog {
  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: whether an empty or
  // whitespace-only utterance is refused, and whether the text has a bound.
  // Looked in AG-11, FR-066, AM-18 of table T-107 and `_assets/tbl-settings.md`
  // (no row bounds the text). So nothing is refused; a refusal would need a rule
  // and a value in the specification first, and an AG-9a-shaped branch here.

  // One read, then the append (R7.4), so the log appended to is the log delivered.
  const posted = logWithMessage(holder.read(), utterance)

  // Replace before delivering, as one reference (LY-1), so no subscriber is handed
  // a half-old log.
  holder.replace(posted)

  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: re-entry from inside `deliver`.
  // Chapter 5.5 refuses writes during a delivery at WS-2, and an utterance reaches
  // neither WS-2 nor WS-6. Unsettled: (a) an utterance posted from inside this
  // `deliver` appends and delivers again, unbounded; (b) a document write from
  // inside it is not refused, because the flag WS-2 reads is private to
  // `apply-document-change.ts` and only WS-7 sets it. Nothing is refused here.
  //
  // ⚠️ A throwing subscriber is not caught: there is no window to close, and
  // FR-028 binds the Agent API surface (CP-17), not this seam.
  audience.deliver(posted)

  return posted
}

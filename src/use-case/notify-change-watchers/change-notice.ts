// NotifyChangeWatchers -- the pure half.
//
// @unit      UF-25  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    pure
//
// WHICH confirmed changes and utterances one watcher has not been told about
// yet (AG-6 of table T-035). Table T-063's UT-3 splits this away from the other
// half at the purity seam LY-3 draws -- "操作と検証は `pure`、確定と通知は
// `non-pure`" -- because choosing an audience reads two values and answers,
// while registering and delivering are effects.
//
// ⭐ AG-6 selects in TWO ways and the two are not interchangeable:
//
//     schedule data   by the revision          (raised by WS-5 only when the
//                                               schedule group moved, FR-063)
//     utterances      by the log's own order   (AG-11, never by the revision)
//
// ⚠️ The second rule is not a convenience. AG-11 says an utterance is not
// schedule data, so it does NOT raise the revision -- a watcher selected on the
// revision alone would never wake for 「待った」 or 「なぜそうしたか」, and
// UC-013 would stall between its step 2 and step 3. That is the whole reason
// DialogueLog counts in an order of its own.
//
// ⚠️ The utterance half is NOT re-implemented here: DialogueLog already
// publishes `messagesSince` with AG-6's selection inside it (table T-064's
// PI-33), and a second copy of a selection rule is a second place for it to
// drift from the requirement.
//
// ⚠️ Nothing here delivers, registers or remembers anything. The registry and
// the delivery are UF-24's, in `notify-change-watchers.ts`, and this file is
// not the component's public entry (Chapter 5.3, MUST NOT) -- tests of this
// unit import it directly, callers outside the folder do not.

import type { Document } from '../../entity/document-model/document/document'
import {
  latestSequence,
  messagesSince,
  type DialogueLog,
  type DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'

/**
 * How far one watcher has already been told, in the two counters AG-6 selects
 * on and in nothing else.
 *
 * ⚠️ Two counters and not one: the revision cannot order utterances (AG-11) and
 * the log's sequence cannot order schedule changes. Folding them into a single
 * number would lose whichever of the two moved last.
 */
export interface WatcherMark {
  /**
   * The revision of the last document this watcher was HANDED. It is not the
   * revision the watcher last read on its own -- AG-6 selects on what it has
   * received, so only a notice actually taken moves this.
   */
  readonly seenRevision: number
  /** The dialogue sequence (AG-11's own order) up to which it has been told. */
  readonly seenSequence: number
}

/**
 * What the two selections read at the instant a notice goes out.
 *
 * ⚠️ The log is NOT part of the document: FR-066 forbids saving the
 * conversation into it (MUST NOT), so the two arrive side by side. Whoever
 * holds the current values supplies both -- that is the Framework (LY-5 of
 * table T-060), which is also the only layer allowed to hold them.
 */
export interface ConfirmedChange {
  /** The document as WS-6 left it. Never a half-built one: WS-7 runs after. */
  readonly document: Document
  /** The settled utterances as they stand. AG-11 keeps drafts out of it. */
  readonly dialogue: DialogueLog
}

/**
 * What one watcher is told. Produced only when there is something in it, so a
 * notice existing at all IS the "wake up" -- AG-6 forbids waking a watcher for
 * its own write (MUST NOT), and that case is answered with no notice at all.
 */
export interface ChangeNotice {
  /** Who this notice is for. The same string AG-6 compares writers against. */
  readonly watcher: string
  /**
   * The confirmed document, and `null` when the schedule half selected nothing.
   *
   * ⚠️ `null` is not "no document" -- it is "nothing about the schedule is new
   * to you". It happens when the revision did not move past `seenRevision`
   * (an utterance never moves it, AG-11; neither does a write that touched the
   * presentation group alone, FR-063) or when this watcher was the writer.
   */
  readonly document: Document | null
  /** AG-6's other half, straight from `messagesSince` (PI-33). May be empty. */
  readonly messages: readonly DialogueMessage[]
  /**
   * The mark to hold once this notice has been taken. The registry stores it;
   * a caller that unwatches and comes back later passes it as `since` so it
   * resumes where it stopped rather than being told everything again.
   */
  readonly mark: WatcherMark
}

/** One allocation for every "nothing new was said" answer. */
const NO_MESSAGES: readonly DialogueMessage[] = []

/**
 * What `watcher` has not been told about yet, or `null` when it is not woken.
 *
 * `watcher` is the name that watcher writes under -- the string that lands in
 * `DocumentStamp.lastEditedBy` when it writes and in `DialogueMessage.author`
 * when it speaks. AG-6 compares against both, so an identity that does not
 * match those two fields would wake a writer with its own work.
 *
 * @purity pure
 */
export function changeNoticeFor(
  watcher: string,
  seen: WatcherMark,
  confirmed: ConfirmedChange,
): ChangeNotice | null {
  const stamp = confirmed.document.revisionStamp

  // ---- AG-6, first half: the schedule data, selected by the revision -------
  // ⚠️ `lastEditedBy` IS the writer of the change being announced, because a
  // notice is produced at WS-7 and WS-7 runs once per write, immediately after
  // the swap. So "the last writer is me" and "this change is mine" are the same
  // sentence here, which is what AG-6's MUST NOT is about.
  // ⚠️ Selected by the stamp and never by the undo history: AG-10 lets a call
  // that table T-027 excludes run and leave no step, and such a call is still a
  // confirmed change -- a history-driven selection would drop it silently.
  const changed = stamp.revision > seen.seenRevision && stamp.lastEditedBy !== watcher

  // ---- AG-6, second half: the utterances, selected by the log's own order --
  // The guard is not the selection -- `messagesSince` is (PI-33). It is there
  // because a notice goes out on EVERY write, and walking the whole log once
  // per watcher on a path that runs per write is the growth R5.1 refuses; the
  // log's own counter answers "is there anything at all" without a walk.
  const messages =
    latestSequence(confirmed.dialogue) > seen.seenSequence
      ? messagesSince(confirmed.dialogue, seen.seenSequence, watcher)
      : NO_MESSAGES

  // AG-6 notifies "だけ" -- only what is unseen and someone else's. With
  // neither half selecting anything there is nothing to notify, and the watcher
  // must not be woken.
  if (!changed && messages.length === 0) return null

  return {
    watcher,
    document: changed ? confirmed.document : null,
    messages,
    mark: {
      // ⚠️ The revision advances only when the document was actually handed
      // over. Advancing it for a notice that carried only utterances would
      // record a schedule change as received that the watcher never saw.
      seenRevision: changed ? stamp.revision : seen.seenRevision,
      // The sequence advances to the end of the log, not to the last message
      // taken: what was skipped was this watcher's own speech (AG-6), and its
      // own speech must never wake it later either.
      seenSequence: latestSequence(confirmed.dialogue),
    },
  }
}

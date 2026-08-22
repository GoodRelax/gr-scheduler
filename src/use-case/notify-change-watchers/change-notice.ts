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
//     schedule data   by WS-5's judgement, and by the equality of the schedule
//                     instant this watcher was last handed (FR-063)
//     utterances      by the log's own order   (AG-11, never by the stamp)
//
// ⚠️ The second rule is not a convenience. AG-11 says an utterance is not
// schedule data, so it does NOT move the schedule instant -- a watcher selected
// on the stamp alone would never wake for 「待った」 or 「なぜそうしたか」, and
// UC-013 would stall between its step 2 and step 3. That is the whole reason
// DialogueLog counts in an order of its own, and that order is NOT part of the
// stamp: the stamp answers only which document this is.
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
 * How far one watcher has already been told, in the two values AG-6 selects on
 * and in nothing else.
 *
 * ⚠️ Two and not one: the stamp says nothing about utterances (AG-11) and the
 * log's sequence says nothing about schedule changes. Folding them into a
 * single value would lose whichever of the two moved last.
 */
export interface WatcherMark {
  /**
   * The schedule-data group's instant on the last document this watcher was
   * HANDED. It is not what the watcher last read on its own -- AG-6 selects on
   * what it has received, so only a notice actually taken moves this.
   *
   * ⛔ Compared for EQUALITY and never for order (FR-063, MUST NOT). A watcher
   * holding an instant the document no longer carries has not received the
   * document it is looking at, whichever of the two was written first.
   */
  readonly seenScheduleUpdatedUtc: string
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
  /**
   * WS-5's judgement about the write being announced: it moved the
   * schedule-data group.
   *
   * ⭐ CARRIED, not derived. AG-6 selects a live watcher by exactly this (MUST)
   * and states that WS-5 has already made the call, so working it out again
   * here would be the same rule in two places (R2.7). It also could not be
   * worked out here: two writes inside one second leave `scheduleUpdatedUtc`
   * unchanged, and the second of them still moved the schedule.
   *
   * ⚠️ `false` for an utterance (AG-11): speaking is not a schedule change, and
   * the utterance half below is what wakes a watcher for it.
   */
  readonly hasMovedSchedule: boolean
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
   * to you". It happens when the write left the schedule-data group alone (an
   * utterance always does, AG-11; so does a write that touched the presentation
   * group alone, FR-063) and this watcher already holds the schedule instant
   * the document carries, or when this watcher was the writer.
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
  const stamp = confirmed.document.documentStamp

  // ---- AG-6, first half: the schedule data ---------------------------------
  // TWO ways in, and AG-6 states both (MUST):
  //
  //   live          the write moved the schedule-data group -- WS-5's own
  //                 judgement, carried here rather than re-derived
  //   re-subscribed the schedule instant this watcher was last handed is not
  //                 the one the document carries, so it never received the
  //                 document it is looking at
  //
  // ⛔ Both are equalities. Neither asks which of two instants is later:
  // FR-063 forbids that (MUST NOT), and an undo -- which restores an earlier
  // document stamp and all (FR-031) -- is exactly where an order gets it wrong
  // and leaves a watcher holding a document nobody has any more.
  //
  // ⚠️ A write that moved the presentation group ALONE must not wake a watcher
  // (MUST NOT), and it does not: such a write leaves the schedule instant where
  // it was, so a watcher that is up to date matches on it and is passed over.
  // A watcher that is BEHIND is woken on the next notice whatever moved -- what
  // it is being handed is the schedule change it never received, which is the
  // "だけ" AG-6 asks for, and it goes quiet again immediately afterwards.
  //
  // ⚠️ `lastEditedBy` IS the writer of the change being announced, because a
  // notice is produced at WS-7 and WS-7 runs once per write, immediately after
  // the swap. So "the last writer is me" and "this change is mine" are the same
  // sentence here, which is what AG-6's MUST NOT is about.
  // ⚠️ Never selected by the undo history: AG-10 lets a call that table T-027
  // excludes run and leave no step, and such a call is still a confirmed change
  // -- a history-driven selection would drop it silently.
  const isScheduleUnseen =
    confirmed.hasMovedSchedule || stamp.scheduleUpdatedUtc !== seen.seenScheduleUpdatedUtc
  const changed = isScheduleUnseen && stamp.lastEditedBy !== watcher

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
      // ⚠️ The instant moves only when the document was actually handed over.
      // Moving it for a notice that carried only utterances would record a
      // schedule change as received that the watcher never saw.
      seenScheduleUpdatedUtc: changed ? stamp.scheduleUpdatedUtc : seen.seenScheduleUpdatedUtc,
      // The sequence advances to the end of the log, not to the last message
      // taken: what was skipped was this watcher's own speech (AG-6), and its
      // own speech must never wake it later either.
      seenSequence: latestSequence(confirmed.dialogue),
    },
  }
}

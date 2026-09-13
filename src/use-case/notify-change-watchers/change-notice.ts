// NotifyChangeWatchers -- the pure half.
//
// @unit      UF-25  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    pure
//
// Which confirmed changes and utterances one watcher has not been told about yet
// (AG-6 of table T-035). UT-3 of table T-063 splits this from the registry at
// LY-3's purity seam.
//
// AG-6 selects in two ways that are not interchangeable:
//
//     schedule data   by WS-5's judgement, and by the equality of the schedule
//                     instant this watcher was last handed (FR-063)
//     utterances      by the log's own order   (AG-11, never by the stamp)
//
// ⚠️ An utterance does not move the schedule instant (AG-11), so a watcher
// selected on the stamp alone would never wake for one.
//
// The utterance half is `messagesSince` (PI-33), not re-implemented here.

import type { Document } from '../../entity/document-model/document/document'
import {
  latestSequence,
  messagesSince,
  type DialogueLog,
  type DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'

/**
 * How far one watcher has already been told, in the two values AG-6 selects on.
 * Folding them into one would lose whichever moved last.
 */
export interface WatcherMark {
  /**
   * The schedule instant on the last document this watcher was HANDED: AG-6
   * selects on what was received, not on what it read.
   *
   * ⛔ Compared for equality, never order (FR-063, MUST NOT).
   */
  readonly seenScheduleUpdatedUtc: string
  /** The dialogue sequence (AG-11's own order) up to which it has been told. */
  readonly seenSequence: number
}

/**
 * What the two selections read at the instant a notice goes out. The log arrives
 * beside the document because it is not in it (FR-066); the Framework supplies
 * both (LY-5).
 */
export interface ConfirmedChange {
  /** The document as WS-6 left it. Never a half-built one: WS-7 runs after. */
  readonly document: Document
  /**
   * WS-5's judgement: the write moved the schedule-data group.
   *
   * Carried, not derived (AG-6, R2.7): two writes inside one second leave
   * `scheduleUpdatedUtc` unchanged, yet the second still moved the schedule.
   * `false` for an utterance (AG-11).
   */
  readonly hasMovedSchedule: boolean
  /** The settled utterances as they stand. AG-11 keeps drafts out of it. */
  readonly dialogue: DialogueLog
}

/**
 * What one watcher is told. Produced only when there is something in it, so a
 * notice existing at all is the wake-up (AG-6).
 */
export interface ChangeNotice {
  /** Who this notice is for. The same string AG-6 compares writers against. */
  readonly watcher: string
  /**
   * The confirmed document, or `null` when nothing about the schedule is new to
   * this watcher (including when it was the writer) -- not "no document".
   */
  readonly document: Document | null
  /** AG-6's other half, straight from `messagesSince` (PI-33). May be empty. */
  readonly messages: readonly DialogueMessage[]
  /**
   * The mark to hold once this notice has been taken; a caller that unwatches and
   * returns passes it as `since` to resume where it stopped.
   */
  readonly mark: WatcherMark
}

/** One allocation for every "nothing new was said" answer. */
const NO_MESSAGES: readonly DialogueMessage[] = []

/**
 * What `watcher` has not been told about yet, or `null` when it is not woken.
 * `watcher` must be the name it writes and speaks under (see `ChangeWatcher`).
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
  // Live (WS-5's judgement) or re-subscribed (the instant last handed is not the
  // document's). ⛔ Both are equalities: an undo restores an earlier stamp
  // (FR-031), which is exactly where an order comparison leaves a watcher holding
  // a document nobody has any more (FR-063).
  //
  // A presentation-only write leaves the instant alone, so an up-to-date watcher
  // is passed over; a watcher that is behind is woken once with what it missed.
  //
  // `lastEditedBy` is the writer of this change, because WS-7 runs once per write
  // right after the swap.
  // ⚠️ Never selected by the undo history: AG-10 lets a call leave no step, and it
  // is still a confirmed change.
  const isScheduleUnseen =
    confirmed.hasMovedSchedule || stamp.scheduleUpdatedUtc !== seen.seenScheduleUpdatedUtc
  const changed = isScheduleUnseen && stamp.lastEditedBy !== watcher

  // ---- AG-6, second half: the utterances, selected by the log's own order --
  // The guard only skips the call: a notice goes out on every write, and the
  // log's counter answers "anything at all" without a walk (R5.1).
  const messages =
    latestSequence(confirmed.dialogue) > seen.seenSequence
      ? messagesSince(confirmed.dialogue, seen.seenSequence, watcher)
      : NO_MESSAGES

  // AG-6: neither half selected anything, so the watcher is not woken.
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

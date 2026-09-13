// NotifyChangeWatchers -- public entry of this folder.
//
// @unit      UF-24  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-15
//
// Registering a subscription, dropping one, and handing out what AG-6 selected
// (CP-15 of table T-062). The selection rule is the pure half's, in
// `change-notice.ts` (UT-3 of table T-063).
//
// Callers:
//   * ApplyDocumentChange at WS-7, after the swap, through its `ChangeAudience`
//     seam: the Framework wires it as `{ deliver: (document, hasMovedSchedule) =>
//     notifyChangeWatchers({ document, hasMovedSchedule, dialogue }) }` with the
//     log it holds (LY-5, FR-066).
//   * PostDialogueMessage, with `hasMovedSchedule` false (AG-11, AG-6).
//   * AgentApiEndpoint, for `watchChanges` / `unwatchChanges` (AM-17).
//
// ⛔ The write-refusing window (Chapter 5.5) is `apply-document-change.ts`'s flag
// and must never be passed in: a caller's boolean says only what that caller
// knows, and a subscriber writing back from `deliver` builds its own
// `WriteMoment` that answers false -- the MUST then silently stops holding.
//
// ⛔ NOT DECIDED: what a subscriber speaking from inside `deliver` means. An
// utterance is not a write, so PostDialogueMessage re-enters and starts a nested
// round; each round ends, but two subscribers answering each other would not.
// Looked in table T-035 and Chapter 5.5: no rule, so nothing here refuses it.

import {
  changeNoticeFor,
  type ChangeNotice,
  type ConfirmedChange,
  type WatcherMark,
} from './change-notice'

// Only the types PI-15's members name travel (R2.19). ⚠️ `changeNoticeFor`
// is UF-25's member and is not re-exported.
export type { ChangeNotice, ConfirmedChange, WatcherMark } from './change-notice'

/**
 * One subscription. `watcher` is AG-6's "self" and must be the name this
 * subscriber writes and speaks under (`DocumentStamp.lastEditedBy`,
 * `DialogueMessage.author`), or it is woken with its own work.
 */
export interface ChangeWatcher {
  readonly watcher: string
  /**
   * Everything strictly after this mark is delivered, subject to AG-6.
   *
   * ⛔ NOT DECIDED: what a fresh subscription is told -- read literally, AG-6
   * would replay the whole log. Looked in table T-035, AM-17 of table T-107 and
   * Chapter 6.1: no starting point, so the caller says. "From now on" is
   * `{ seenScheduleUpdatedUtc: document.documentStamp.scheduleUpdatedUtc,
   * seenSequence: latestSequence(log) }` (PI-3, PI-33).
   */
  readonly since: WatcherMark
  /**
   * Told once per notice, and only when there is something in it.
   *
   * ⚠️ Runs inside ApplyDocumentChange's delivery window: a write from here is
   * refused by WS-2 as a value, not a throw.
   *
   * @purity non-pure
   */
  deliver(notice: ChangeNotice): void
}

/** One subscriber that threw out of `deliver`. */
export interface DeliveryFailure {
  readonly watcher: string
  /** Whatever the subscriber threw. */
  readonly thrown: unknown
}

/**
 * What one round of delivery did.
 *
 * ⚠️ A throwing subscriber is reported as a value (R7.10): FR-028 forbids the
 * Agent API to throw and `applyCommands` (AM-7) sits downstream of WS-7, so one
 * bad subscriber would turn an accepted write into an exception and starve the
 * rest of the round.
 */
export interface NotifyOutcome {
  /** The watchers this round woke, in registration order. */
  readonly notified: readonly string[]
  /** The ones whose `deliver` threw. Their marks did NOT advance. */
  readonly failures: readonly DeliveryFailure[]
}

// ---- non-pure from here on (R7.7) -----------------------------------------

/** A subscription together with how far it has been told. */
interface Registration {
  readonly subscription: ChangeWatcher
  readonly mark: WatcherMark
}

// Keyed by the watcher name, AG-6's only identity for a watcher; a Map so
// unwatching and advancing a mark are one lookup each (R5.1).
// Module-scoped like ApplyDocumentChange's flag: one document, one set of
// watchers (CP-8).
const REGISTRATIONS = new Map<string, Registration>()

/**
 * Starts watching. Answers whether a subscription under this name was replaced.
 *
 * ⛔ NOT DECIDED: two subscriptions under one name (AG-6 gives one identity). The
 * newest wins, so a stale subscriber stops receiving after its owner
 * re-registers, and the answer reports it.
 *
 * @purity non-pure
 */
export function watchChanges(subscription: ChangeWatcher): boolean {
  const replaced = REGISTRATIONS.has(subscription.watcher)
  REGISTRATIONS.set(subscription.watcher, { subscription, mark: subscription.since })
  return replaced
}

/**
 * Stops watching. Answers whether there was a subscription under that name.
 *
 * @purity non-pure
 */
export function unwatchChanges(watcher: string): boolean {
  return REGISTRATIONS.delete(watcher)
}

/**
 * Hands every watcher what AG-6 selected for it, and nothing else.
 *
 * ⚠️ Must be called after the swap (WS-7); this file cannot enforce the order.
 *
 * @purity non-pure
 */
export function notifyChangeWatchers(confirmed: ConfirmedChange): NotifyOutcome {
  // The round is fixed before the first `deliver`, because a subscriber may
  // register or unregister from inside it: one registered mid-round would
  // otherwise be told about a change that was confirmed before it asked, and
  // one dropped mid-round could still be called.
  const round = [...REGISTRATIONS.values()]
  const notified: string[] = []
  const failures: DeliveryFailure[] = []

  for (const held of round) {
    const { watcher } = held.subscription
    const notice = changeNoticeFor(watcher, held.mark, confirmed)
    // AG-6: nothing unseen and not its own -- so this one is not woken at all.
    if (notice === null) continue

    try {
      held.subscription.deliver(notice)
    } catch (thrown) {
      // The mark stays: AG-6 selects on what was received, so the next notice
      // offers it again.
      failures.push({ watcher, thrown })
      continue
    }

    // ⚠️ Advance only if this registration is still the one held: an unwatched
    // subscriber is not resurrected, and a re-registered one keeps its new `since`.
    if (REGISTRATIONS.get(watcher) === held) {
      REGISTRATIONS.set(watcher, { subscription: held.subscription, mark: notice.mark })
    }
    notified.push(watcher)
  }

  return { notified, failures }
}

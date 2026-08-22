// NotifyChangeWatchers -- public entry of this folder.
//
// @unit      UF-24  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-15
//
// Registering a subscription, dropping one, and handing out what AG-6 selected
// (CP-15 of table T-062). WHICH changes and utterances a watcher has not seen
// is the pure half's, in `change-notice.ts` -- table T-063's UT-3 splits the
// two at LY-3's purity seam, so this file holds the mutable registry and the
// calls out, and holds no selection rule of its own.
//
// ⭐ WHO CALLS THIS, and with what:
//
//   * ApplyDocumentChange, at WS-7 of table T-067 -- after the swap, never
//     before. It reaches here through its own `ChangeAudience` seam, which
//     hands over the document and WS-5's judgement, so the Framework wires it
//     as `{ deliver: (document, hasMovedSchedule) =>
//     notifyChangeWatchers({ document, hasMovedSchedule, dialogue }) }` with
//     the dialogue log it holds (LY-5: only that layer holds current values,
//     and FR-066 keeps the log out of the document).
//   * PostDialogueMessage, after it has appended a settled utterance -- the
//     schedule instant did not move (AG-11), so `hasMovedSchedule` is false,
//     and the watchers must still wake (AG-6).
//   * AgentApiEndpoint, for `watchChanges` / `unwatchChanges` (AM-17 of table
//     T-107).
//
// ⛔ THE WINDOW IN WHICH WRITES ARE REFUSED IS NOT HERE, and must never be
// handed to this file. Chapter 5.5 makes refusing a write while notices are
// going out a MUST -- 「通知を配っているあいだの書き込みは拒否すること」 -- and
// that flag is owned by `apply-document-change.ts`: module-scoped there, set
// around WS-7, closed by `try`/`finally`, and read into WS-2's judgement. This
// unit is the AUDIENCE that runs inside that window. It must not take the flag
// as an argument and no caller may pass one: a boolean supplied by a caller
// says only what THAT caller knows, and the subscriber that writes back from
// inside `deliver` builds its own `WriteMoment` which answers false in perfect
// good faith. That exact mistake was made here once, and the MUST in Chapter
// 5.5 silently stopped holding while every test stayed green.
//
// ⛔ NOT DECIDED: what a subscriber SPEAKING from inside `deliver` should mean.
// Chapter 5.5 refuses writes during the delivery, and an utterance is not a
// write -- it never touches the document (FR-066) and never moves the schedule
// instant (AG-11) -- so PostDialogueMessage re-enters this file and starts a nested
// round. The round below is fixed before its first `deliver`, so each round
// ends; two subscribers answering each other's utterances would still not.
// Nothing in table T-035 or Chapter 5.5 rules on it, so nothing here refuses
// it, and no re-entry flag is invented to.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import {
  changeNoticeFor,
  type ChangeNotice,
  type ConfirmedChange,
  type WatcherMark,
} from './change-notice'

// The types the published signatures name travel with them, and no more:
// widening PI-15 past what its three members reach would put names on the
// component's face that R2.19 never declared. ⚠️ `changeNoticeFor` is NOT
// re-exported -- it is UF-25's member, not one of PI-15's three, and a caller
// outside this folder has no business selecting an audience for itself.
export type { ChangeNotice, ConfirmedChange, WatcherMark } from './change-notice'

/**
 * One subscription. AG-6's "自分" is the `watcher` string, and it must be the
 * SAME name this subscriber writes under -- the one that lands in
 * `DocumentStamp.lastEditedBy` when it writes and in `DialogueMessage.author`
 * when it speaks. AG-6 compares against those two fields, so a name that does
 * not match them wakes the subscriber with its own work (MUST NOT).
 */
export interface ChangeWatcher {
  readonly watcher: string
  /**
   * Where the subscription starts: everything strictly after this mark will be
   * delivered, subject to AG-6's two selections.
   *
   * ⛔ NOT DECIDED by the specification: what a FRESH subscription should be
   * told. AG-6 says only "自分がまだ受け取っていない" and a watcher that has
   * never received anything has, read literally, received nothing -- which
   * would replay the whole dialogue log at the first notice. Nothing in table
   * T-035, table T-107's AM-17 or Chapter 6.1 fixes the starting point, so this
   * unit does not choose: the caller says. "Only what happens from now on" is
   * spelled `{ seenScheduleUpdatedUtc:
   * document.documentStamp.scheduleUpdatedUtc, seenSequence:
   * latestSequence(log) }`, both values being public (PI-3, PI-33).
   */
  readonly since: WatcherMark
  /**
   * Told once per notice, and only when there is something in it.
   *
   * ⚠️ It runs inside ApplyDocumentChange's delivery window, so a write
   * attempted from in here is refused by WS-2 and comes back as a refusal
   * value, not as a throw.
   *
   * @purity non-pure
   */
  deliver(notice: ChangeNotice): void
}

/** One subscriber that threw out of `deliver`. */
export interface DeliveryFailure {
  readonly watcher: string
  /** Whatever the subscriber threw. `unknown`, because nothing constrains it. */
  readonly thrown: unknown
}

/**
 * What one round of delivery did.
 *
 * ⚠️ A subscriber that throws is reported as a VALUE (R7.10) and does not
 * escape: FR-028 forbids the Agent API to throw (MUST NOT), and `applyCommands`
 * (AM-7) sits downstream of WS-7 -- one bad subscriber would otherwise turn an
 * accepted write into an exception, and would also starve the subscribers after
 * it in the round. ⛔ The specification decides neither of those two things
 * directly; what it decides is that the call must answer with a value, and
 * swallowing the throw silently is the one option that answer rules out.
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

// The subscriptions, keyed by AG-6's identity.
//
// ⚠️ Keyed by the watcher NAME because that is the only identity table T-035
// gives a watcher: AG-6 judges "自分以外の書き手" by it, and `unwatchChanges`
// needs the same key to name what it removes. A Map and not an array, so
// unwatching and advancing a mark are one lookup each rather than a scan per
// watcher inside the delivery loop (R5.1).
//
// ⚠️ Module-scoped, like ApplyDocumentChange's own flag and for the same
// reason: Chapter 5.3 says no component makes instances, and a running app has
// one set of watchers because it has one document (CP-8).
const REGISTRATIONS = new Map<string, Registration>()

/**
 * Starts watching. Answers whether a subscription was already held under this
 * name and has been replaced by this one.
 *
 * ⛔ NOT DECIDED: what two subscriptions under one name should mean. AG-6 gives
 * a watcher exactly one identity, so a second registration under it is either a
 * replacement or a refusal, and nothing chooses. The newest wins -- a stale
 * subscriber cannot then keep receiving after its owner re-registered -- and
 * the answer says it happened rather than letting it pass unseen.
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
 * ⚠️ Called AFTER the confirmation, never before -- WS-7 of table T-067 makes
 * that a MUST, because a notice sent before the swap reaches a subscriber that
 * then reads the document it already had. This file cannot enforce the order;
 * the caller performs it.
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
      // The mark stays where it was: the watcher did not receive this notice,
      // and AG-6 selects on what has been received. The next notice offers it
      // again.
      failures.push({ watcher, thrown })
      continue
    }

    // ⚠️ Advance only if this very registration is still the one held. The
    // identity test covers both re-entrant cases at once: a subscriber that
    // unwatched itself from inside `deliver` is not resurrected, and one that
    // re-registered gets to keep the `since` it just asked for. One Map lookup,
    // not a search through the round (R5.1).
    if (REGISTRATIONS.get(watcher) === held) {
      REGISTRATIONS.set(watcher, { subscription: held.subscription, mark: notice.mark })
    }
    notified.push(watcher)
  }

  return { notified, failures }
}

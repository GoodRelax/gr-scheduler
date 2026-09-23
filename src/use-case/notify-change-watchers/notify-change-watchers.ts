// Registers change watchers and delivers each confirmed change to them.
// @unit      UF-24  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-15

import {
  changeNoticeFor,
  type ChangeNotice,
  type ConfirmedChange,
  type WatcherMark,
} from './change-notice'

export type { ChangeNotice, ConfirmedChange, WatcherMark } from './change-notice'

export interface ChangeWatcher {
  readonly watcher: string
  readonly since: WatcherMark
  deliver(notice: ChangeNotice): void
}

export interface DeliveryFailure {
  readonly watcher: string
  readonly thrown: unknown
}

export interface NotifyOutcome {
  readonly notified: readonly string[]
  readonly failures: readonly DeliveryFailure[]
}

interface Registration {
  readonly subscription: ChangeWatcher
  readonly mark: WatcherMark
}

// see SF-10, CP-15
// WHY: the shell holds these (CR-530 decision 6); the delivery window sits beside them, not in a
// flag parameter of its own, which would let a subscriber fake this window's edge (uf-24-25).
export interface ChangeWatchers {
  readonly byWatcher: Map<string, Registration>
  isDelivering: boolean
}

/** @purity pure */
export function emptyChangeWatchers(): ChangeWatchers {
  return { byWatcher: new Map<string, Registration>(), isDelivering: false }
}

// see AG-6, AM-17, ED-2, LM-16
/** @purity non-pure */
export function watchChanges(watchers: ChangeWatchers, subscription: ChangeWatcher): boolean {
  const replaced = watchers.byWatcher.has(subscription.watcher)
  watchers.byWatcher.set(subscription.watcher, { subscription, mark: subscription.since })
  return replaced
}

/** @purity non-pure */
export function unwatchChanges(watchers: ChangeWatchers, watcher: string): boolean {
  return watchers.byWatcher.delete(watcher)
}

// see AG-11, T-233
/** @purity semi-pure-b */
export function isDeliveringNotices(watchers: ChangeWatchers): boolean {
  return watchers.isDelivering
}

// see AG-6, WS-7
/** @purity non-pure */
export function notifyChangeWatchers(watchers: ChangeWatchers, confirmed: ConfirmedChange): NotifyOutcome {
  watchers.isDelivering = true
  try {
    // TRAP: walk a copy: deliver may watch or unwatch, which would change the Map mid-walk.
    const round = [...watchers.byWatcher.values()]
    const notified: string[] = []
    const failures: DeliveryFailure[] = []

    for (const held of round) {
      const { watcher } = held.subscription
      const notice = changeNoticeFor(watcher, held.mark, confirmed)
      if (notice === null) continue

      try {
        held.subscription.deliver(notice)
      } catch (thrown) {
        failures.push({ watcher, thrown })
        continue
      }

      // TRAP: advance only the registration still held, or an unwatched or re-registered one is overwritten.
      if (watchers.byWatcher.get(watcher) === held) {
        watchers.byWatcher.set(watcher, { subscription: held.subscription, mark: notice.mark })
      }
      notified.push(watcher)
    }

    return { notified, failures }
  } finally {
    watchers.isDelivering = false
  }
}

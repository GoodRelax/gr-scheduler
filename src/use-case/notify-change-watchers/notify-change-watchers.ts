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

const REGISTRATIONS = new Map<string, Registration>()

/** @purity non-pure */
export function watchChanges(subscription: ChangeWatcher): boolean {
  const replaced = REGISTRATIONS.has(subscription.watcher)
  REGISTRATIONS.set(subscription.watcher, { subscription, mark: subscription.since })
  return replaced
}

/** @purity non-pure */
export function unwatchChanges(watcher: string): boolean {
  return REGISTRATIONS.delete(watcher)
}

// see AG-6, WS-7
/** @purity non-pure */
export function notifyChangeWatchers(confirmed: ConfirmedChange): NotifyOutcome {
  // TRAP: walk a copy: deliver may watch or unwatch, which would change the Map mid-walk.
  const round = [...REGISTRATIONS.values()]
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
    if (REGISTRATIONS.get(watcher) === held) {
      REGISTRATIONS.set(watcher, { subscription: held.subscription, mark: notice.mark })
    }
    notified.push(watcher)
  }

  return { notified, failures }
}

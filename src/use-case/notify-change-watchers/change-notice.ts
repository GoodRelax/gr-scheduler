// NotifyChangeWatchers: what one watcher has not been told about yet.
// @unit      UF-25  (docs/spec/05-07-design.md, table T-075)
// @component NotifyChangeWatchers, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  latestSequence,
  messagesSince,
  type DialogueLog,
  type DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'

export interface WatcherMark {
  readonly seenScheduleUpdatedAt: string
  readonly seenSequence: number
}

export interface ConfirmedChange {
  readonly document: Document
  readonly hasUpdatedSchedule: boolean
  readonly dialogue: DialogueLog
}

// see AV-14, AG-6
// WHY: the stamp, never the document: the receiver reads again what it needs (AG-6).
export interface ChangeNotice {
  readonly watcher: string
  readonly stamp: Document['documentStamp']
  readonly messages: readonly DialogueMessage[]
  readonly mark: WatcherMark
}

const NO_MESSAGES: readonly DialogueMessage[] = []

// see AG-6, FR-063
/** @purity pure */
export function changeNoticeFor(
  watcher: string,
  seen: WatcherMark,
  confirmed: ConfirmedChange,
): ChangeNotice | null {
  const stamp = confirmed.document.documentStamp

  const isScheduleUnseen =
    confirmed.hasUpdatedSchedule || stamp.scheduleUpdatedAt !== seen.seenScheduleUpdatedAt
  const changed = isScheduleUnseen && stamp.lastEditedBy !== watcher

  const messages =
    latestSequence(confirmed.dialogue) > seen.seenSequence
      ? messagesSince(confirmed.dialogue, seen.seenSequence, watcher)
      : NO_MESSAGES

  if (!changed && messages.length === 0) return null

  return {
    watcher,
    stamp,
    messages,
    mark: {
      seenScheduleUpdatedAt: changed ? stamp.scheduleUpdatedAt : seen.seenScheduleUpdatedAt,
      seenSequence: latestSequence(confirmed.dialogue),
    },
  }
}

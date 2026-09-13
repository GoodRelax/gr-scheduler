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
  readonly seenScheduleUpdatedUtc: string
  readonly seenSequence: number
}

export interface ConfirmedChange {
  readonly document: Document
  readonly hasMovedSchedule: boolean
  readonly dialogue: DialogueLog
}

export interface ChangeNotice {
  readonly watcher: string
  readonly document: Document | null
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
    confirmed.hasMovedSchedule || stamp.scheduleUpdatedUtc !== seen.seenScheduleUpdatedUtc
  const changed = isScheduleUnseen && stamp.lastEditedBy !== watcher

  const messages =
    latestSequence(confirmed.dialogue) > seen.seenSequence
      ? messagesSince(confirmed.dialogue, seen.seenSequence, watcher)
      : NO_MESSAGES

  if (!changed && messages.length === 0) return null

  return {
    watcher,
    document: changed ? confirmed.document : null,
    messages,
    mark: {
      seenScheduleUpdatedUtc: changed ? stamp.scheduleUpdatedUtc : seen.seenScheduleUpdatedUtc,
      seenSequence: latestSequence(confirmed.dialogue),
    },
  }
}

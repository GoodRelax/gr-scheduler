// PostDialogueMessage: append one settled utterance to the log, then hand it out.
// @unit      UF-26   (docs/spec/05-07-design.md, table T-075)
// @component PostDialogueMessage, layer UseCase (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-16

import type {
  DialogueLog,
  DialogueMessage,
} from '../../entity/document-model/dialogue-log/dialogue-log'
import { logWithMessage } from '../../entity/document-model/dialogue-log/dialogue-log'

export type SettledUtterance = Omit<DialogueMessage, 'sequence'>

export interface DialogueLogHolder {
  /** @purity semi-pure-b */
  read(): DialogueLog
  /** @purity non-pure */
  replace(next: DialogueLog): void
}

export interface DialogueAudience {
  /** @purity non-pure */
  deliver(log: DialogueLog): void
}

// see CP-16, AG-11
/** @purity non-pure */
export function postDialogueMessage(
  utterance: SettledUtterance,
  holder: DialogueLogHolder,
  audience: DialogueAudience,
): DialogueLog {
  const posted = logWithMessage(holder.read(), utterance)

  holder.replace(posted)

  // TRAP: a subscriber that posts from inside deliver appends and delivers again, unbounded.
  audience.deliver(posted)

  return posted
}

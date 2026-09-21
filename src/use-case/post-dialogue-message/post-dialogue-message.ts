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
// STOP: spec does not decide whether an empty, blank or long utterance is refused. Looked in AG-11, AM-18, FR-066 (PND-455)
/** @purity non-pure */
export function postDialogueMessage(
  utterance: SettledUtterance,
  holder: DialogueLogHolder,
  audience: DialogueAudience,
): DialogueLog {
  const posted = logWithMessage(holder.read(), utterance)

  holder.replace(posted)

  // see AG-6, AG-11, WS-2, FT-5
  // WHY: the mid-delivery refusal sits one layer out, at AM-18 in
  // agent-api-members.ts -- the one caller reachable from inside `deliver`.
  audience.deliver(posted)

  return posted
}

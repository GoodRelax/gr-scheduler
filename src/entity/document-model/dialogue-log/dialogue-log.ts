// DialogueLog -- public entry of this folder.
//
// @unit      UF-56   (docs/spec/05-07-design.md, table T-075)
// @component DialogueLog, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-33
//
// The log counts in an order of its own, not in the stamp (AG-11 of table
// T-035); `messagesSince` selects on that counter.

export interface DialogueMessage {
  /** Rises by one per message. Not part of the stamp (AG-11). */
  readonly sequence: number
  /** AG-6 selects on it. */
  readonly author: string
  readonly text: string
  /** ISO 8601, UTC, to the second -- the spelling AT-129 uses for the stamp. */
  readonly settledAt: string
}

export interface DialogueLog {
  readonly messages: readonly DialogueMessage[]
  readonly nextSequence: number
}

const EMPTY: DialogueLog = { messages: [], nextSequence: 1 }

/** @purity pure */
export function emptyDialogueLog(): DialogueLog {
  return EMPTY
}

/**
 * The caller does not choose the sequence: two writers could pick the same one
 * and AG-6 would lose a message.
 *
 * @purity pure
 */
export function logWithMessage(
  log: DialogueLog,
  message: Omit<DialogueMessage, 'sequence'>,
): DialogueLog {
  const settled: DialogueMessage = { ...message, sequence: log.nextSequence }
  return { messages: [...log.messages, settled], nextSequence: log.nextSequence + 1 }
}

/**
 * What a watcher has not seen yet (AG-6).
 *
 * @purity pure
 */
export function messagesSince(
  log: DialogueLog,
  sequence: number,
  watcher: string,
): readonly DialogueMessage[] {
  return log.messages.filter(
    (message) => message.sequence > sequence && message.author !== watcher,
  )
}

/** The sequence a watcher should remember after taking the messages above. */
/** @purity pure */
export function latestSequence(log: DialogueLog): number {
  return log.nextSequence - 1
}

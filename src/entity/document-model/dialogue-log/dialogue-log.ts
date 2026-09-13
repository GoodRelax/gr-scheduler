// DialogueLog -- the settled dialogue messages, numbered apart from the stamp.
// @unit      UF-56   (docs/spec/05-07-design.md, table T-075)
// @component DialogueLog, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-33

export interface DialogueMessage {
  readonly sequence: number
  readonly author: string
  readonly text: string
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

/** @purity pure */
export function logWithMessage(
  log: DialogueLog,
  message: Omit<DialogueMessage, 'sequence'>,
): DialogueLog {
  const settled: DialogueMessage = { ...message, sequence: log.nextSequence }
  return { messages: [...log.messages, settled], nextSequence: log.nextSequence + 1 }
}

// see AG-6
/** @purity pure */
export function messagesSince(
  log: DialogueLog,
  sequence: number,
  watcher: string,
): readonly DialogueMessage[] {
  return log.messages.filter(
    (message) => message.sequence > sequence && message.author !== watcher,
  )
}

/** @purity pure */
export function latestSequence(log: DialogueLog): number {
  return log.nextSequence - 1
}

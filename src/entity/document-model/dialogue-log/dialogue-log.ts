// DialogueLog -- public entry of this folder.
//
// @unit      UF-56   (docs/spec/05-07-design.md, table T-075)
// @component DialogueLog, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-33
//
// AG-11 of table T-035 is the whole reason this unit exists as its own value:
// a settled utterance is not schedule data, so it does NOT raise the revision
// (FR-063) -- and yet a watcher still has to wake for it (AG-6). Since the
// revision cannot be used to pick what is new, the log counts in an order of
// its own. That counter is what `messagesSince` selects on.
//
// AG-11 also forbids reading input that has not been settled, so nothing here
// takes a half-typed line: a message enters the log only once it is settled.

export interface DialogueMessage {
  /** The log's own order, rising by one. Not the revision (AG-11). */
  readonly sequence: number
  /** Who settled it. AG-6 selects on "someone other than me". */
  readonly author: string
  readonly text: string
  /** ISO 8601, UTC, to the second -- the spelling AT-129 uses for the stamp. */
  readonly settledAt: string
}

export interface DialogueLog {
  readonly messages: readonly DialogueMessage[]
  /** The sequence the next message will take. */
  readonly nextSequence: number
}

const EMPTY: DialogueLog = { messages: [], nextSequence: 1 }

/** @purity pure */
export function emptyDialogueLog(): DialogueLog {
  return EMPTY
}

/**
 * Append one settled utterance, giving it the next sequence. The caller does
 * not choose the sequence: if it did, two writers could pick the same one and
 * AG-6 would lose a message.
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
 * What a watcher has not seen yet: everything settled after `sequence` by
 * someone other than the watcher (AG-6 -- "my own write does not wake me").
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

// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-68   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-68 fills exactly one member of `ScreenView` -- `dialogueField`, which is
// the U-44 `Dialogue Field` of table T-103 -- and reads none of the others. The
// signature is the one the "nine unit contracts" section of `screen-renderer.ts`
// fixes; this file does not own it.
//
// ⭐ WHY THE WHOLE FIELD CAN BE ABSENT. FR-066 puts the field up only while the
// `Agent API` is on, so `null` is the entire answer while it is off -- not an
// empty list, which would draw an empty conversation over a closed API. ⚠️ The
// flag is not in the document: FR-065 remembers the choice per document, but
// S-99b of table T-206 keeps that record in the environment, so it reaches this
// unit as `ScreenSession.isAgentApiEnabled` rather than through `Schedule`.
//
// ⭐ WHY THE ORDER IS MADE HERE rather than taken as the array came. AG-11 of
// table T-035 makes the log count in an order of its own, and FR-063 is the
// reason: an utterance is not schedule data, so it does not move the schedule
// instant, and the stamp therefore cannot tell one utterance from the next.
// `DialogueLog` (PI-33) publishes that counter as `DialogueMessage.sequence`,
// but it declares no order for its `messages` array -- so trusting the array
// order would be leaning on an invariant the entity never stated.
// ⛔ Neither of the other two candidates may stand in for the sequence:
//   - the stamp, for the reason above (FR-063), and because FR-063 forbids
//     reading it as an order at all (MUST NOT);
//   - `settledAt`, which is a clock reading from whatever machine settled the
//     utterance. AM-18 of table T-107 has the AI post one while a person posts
//     another, so two disagreeing clocks would reorder a conversation, and the
//     stamp is only to the second (AT-129), which makes a tie ordinary.
//
// ⛔ NOT AG-6's SELECTION, although it reads the same log. `messagesSince`
// (PI-33) drops what the watcher itself wrote, because AG-6 of table T-035 wakes
// a watcher only for the writers other than itself. That rule governs the
// `Agent API`'s watch, not this field: a person reading the conversation has to
// see their own utterances, and a field built from AG-6's selection would show
// one side of a dialogue. So this unit selects on nothing, and carries `author`
// through for the surface to attribute with.
//
// ⛔ THE HALF-TYPED LINE CANNOT ARRIVE HERE, which is why nothing filters for
// it. AG-11 forbids reading what has not been settled (MUST NOT), and the live
// contents of the entry travel a different path entirely --
// `ScreenSurface.readDialogueInput` hands them to `dialogueMessageFromInput`
// (PI-37), which refuses them until they are settled. What reaches `DialogueLog`
// is settled by construction, so a check here would guard nothing.

import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueField, ScreenSession } from './screen-renderer'

/**
 * The `Dialogue Field` (U-44) for this frame, or `null` while the `Agent API`
 * is off (FR-066).
 *
 * The settled utterances are carried oldest first, ordered by
 * `DialogueMessage.sequence` (AG-11). Every one the log holds goes across --
 * see the STOP note for what the specification leaves unbounded.
 *
 * @purity pure
 */
export function dialogueFieldFromLog(
  log: DialogueLog,
  session: ScreenSession,
): DialogueField | null {
  if (!session.isAgentApiEnabled) return null

  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: how many utterances the field
  // shows at once. FR-066 states only that the field is put up, AG-11 states
  // only the order to count them in, AM-6 of table T-107 reads them without a
  // count, and `_assets/tbl-settings.md` holds no dialogue row at all -- neither
  // among the saved groups nor among table T-206's not-stored ones. So there is
  // no bound to read from `DocumentSettings`, none in the generated constants,
  // and none to receive as an argument. All of them are carried: dropping any
  // would hide an utterance a person settled, and that is the one outcome which
  // cannot be right. If a bound is wanted, its value belongs in
  // `_assets/tbl-settings.md` first, and this unit then reads it from the
  // constant generated out of that manuscript.

  // Copied before sorting because `sort` writes in place, and the log is another
  // component's value (LY-1 holds it as an immutable value that is replaced
  // whole). A `pure` unit that reordered its caller's array would be a side
  // effect (R7.1).
  const oldestFirst = [...log.messages].sort(
    (earlier, later) => earlier.sequence - later.sequence,
  )

  return { messages: oldestFirst }
}

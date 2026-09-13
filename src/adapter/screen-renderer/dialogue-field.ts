// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-68   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Fills `ScreenView.dialogueField` (U-44 of table T-103) only; the signature is
// fixed in the unit contracts section of `screen-renderer.ts`.
//
// `null`, not an empty list, while the field is not shown: an empty list would
// draw an empty conversation over a closed API (FR-066). Both flags arrive in
// `ScreenSession`, not `Schedule`: they are kept outside the document (FR-065,
// S-99b and S-99i of table T-206).
//
// Ordered here by `DialogueMessage.sequence` (AG-11), because `DialogueLog`
// declares no order for `messages`. Not by the stamp, which FR-063 forbids
// reading as an order, nor by `settledAt`, which comes from different machines'
// clocks (AM-18 of table T-107) and ties at one second (AT-129).
//
// Not AG-6's selection: `messagesSince` drops the watcher's own writes, but a
// person reading the conversation must see both sides, so nothing is dropped and
// `author` is carried through.
//
// No filter for a half-typed line: that travels through
// `ScreenSurface.readDialogueInput` to `dialogueMessageFromInput` (PI-37), which
// refuses it until settled (AG-11).

import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueField, ScreenSession } from './screen-renderer'

/**
 * `null` while the `Agent API` is off or the field is put away with IC-18
 * (FR-066, S-99i). Oldest first; see the STOP note for the missing bound.
 *
 * @purity pure
 */
export function dialogueFieldFromLog(
  log: DialogueLog,
  session: ScreenSession,
): DialogueField | null {
  // FR-066; S-99i keeps the two apart. `app-header-items.ts` reads the same
  // pair for IC-18's drawn state.
  if (!session.isAgentApiEnabled || !session.isDialogueFieldVisible) return null

  // STOP -- not decided by the specification: how many utterances the field
  // shows. Looked in FR-066, AG-11, AM-6 of table T-107 and
  // `_assets/tbl-settings.md` (saved groups and table T-206): no row bounds the
  // count. All are carried, since dropping one would hide a settled utterance;
  // a bound belongs in `_assets/tbl-settings.md` first.

  // Copied: `sort` writes in place, and the log is another component's
  // immutable value (LY-1, R7.1).
  const oldestFirst = [...log.messages].sort(
    (earlier, later) => earlier.sequence - later.sequence,
  )

  return { messages: oldestFirst }
}

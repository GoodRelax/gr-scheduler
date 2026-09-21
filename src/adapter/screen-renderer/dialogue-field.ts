// ScreenRenderer: fills ScreenView.dialogueField (U-44 of table T-103).
// @unit      UF-68   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type { DialogueField, ScreenViewReadings } from './screen-renderer'

// see FR-066, AG-11
// STOP: spec does not decide how many utterances the Dialogue Field shows. Looked in FR-066, AG-11, AM-6, T-206
// @provisional PND-454
/** @purity pure */
export function dialogueFieldFromLog(
  log: DialogueLog,
  session: ScreenSession,
  readings: ScreenViewReadings,
): DialogueField | null {
  if (!readings.isAgentApiEnabled) return null
  if (session.screen.dialogueFieldDisplayState.kind === 'hidden') return null

  const oldestFirst = [...log.messages].sort(
    (earlier, later) => earlier.sequence - later.sequence,
  )

  return { messages: oldestFirst }
}

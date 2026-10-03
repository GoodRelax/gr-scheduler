// ScreenRenderer: fills ScreenView.dialogueField (U-44 of table T-103).
// @unit      UF-68   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import displayWords from './display-words.json'
import type { DialogueField, ScreenViewReadings } from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import { windowTitleEntriesOf } from './table-window'
import { DEFAULT_WINDOW_PLACE } from './window-box'

const DIALOGUE_FIELD = 'Dialogue Field'

const HEADING = displayWords.surfaces.find((entry) => entry.name === DIALOGUE_FIELD)?.heading

// see FR-066, AG-11, T-335
/** @purity pure */
export function dialogueFieldFromLog(
  log: DialogueLog,
  session: ScreenSession,
  readings: ScreenViewReadings,
  canvas: ScreenRect,
): DialogueField | null {
  const display = session.screen.dialogueFieldDisplayState
  if (!readings.isAgentApiEnabled || display.kind === 'hidden') return null
  const language = displayLanguageOf(session)
  const oldestFirst = [...log.messages].sort(
    (earlier, later) => earlier.sequence - later.sequence,
  )

  return {
    messages: oldestFirst,
    heading: HEADING === undefined ? '' : HEADING[language],
    shown: display.child.kind,
    titleEntries: windowTitleEntriesOf(display.child.kind, language),
    place: readings.windowPlaces?.dialogueField ?? DEFAULT_WINDOW_PLACE,
    canvas,
  }
}

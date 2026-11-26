// File: InputCommandTranslator: the Dual Cursor entry and chart presses by table T-029a.
// @unit      UF-95   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { textOfInstant } from '../../entity/document-model/schedule/schedule'
import { cursorInstantAtX } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenValuesEvent } from '../../use-case/advance-screen-session/advance-screen-session'
import {
  type InputContext,
  type PointerPress,
} from './input-command-translator'

// Spec: DC-1, DC-2, DC-3, T-378, TX-6, IMPS-1604
// Why: the instant the line stands on; on the day unit it is the day's 00:00, the text the day was placed as before.
/** @purity pure */
function cursorDateAtX(context: InputContext, x: number): string | null {
  const instant = cursorInstantAtX(context.layout, x, context.document.documentSettings)
  return instant === null ? null : textOfInstant(instant)
}

// Spec: IC-45, DC-1, DC-4, DC-7, T-280
/** @purity pure */
export function screenEventFromDualCursorEntry(context: InputContext): ScreenValuesEvent {
  const taskGroupArea = context.regions.taskGroupArea
  const atCenter = cursorDateAtX(context, taskGroupArea.x + taskGroupArea.width / 2)
  return {
    type: 'dualCursorEntryPressed',
    date: atCenter ?? '',
    hasDaysToPlace: atCenter !== null,
  }
}

// Spec: PTD-2, DC-2, T-280
/** @purity pure */
export function screenEventFromDualCursorPress(
  press: PointerPress,
  context: InputContext,
): ScreenValuesEvent | null {
  const date = cursorDateAtX(context, press.at.x)
  // Provisional: OPQ-6
  if (date === null) return null
  return { type: 'dualCursorPlaced', date }
}

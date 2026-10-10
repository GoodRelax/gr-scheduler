// InputCommandTranslator -- the Dual Cursor entry and chart presses by table T-029a.
// @unit      UF-95   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { textOfDay } from '../../entity/document-model/schedule/schedule'
import type { ScreenValuesEvent } from '../../use-case/advance-screen-session/advance-screen-session'
import {
  dayAtX,
  type InputContext,
  type PointerPress,
} from './input-command-translator'

// see IC-45, DC-1, DC-4, DC-7, T-280
/** @purity pure */
export function screenEventFromDualCursorEntry(context: InputContext): ScreenValuesEvent {
  const taskGroupArea = context.regions.taskGroupArea
  const atCenter = dayAtX(context.layout, taskGroupArea.x + taskGroupArea.width / 2)
  // STOP: spec does not decide IC-45 where the axis has no day. Looked in DC-1, BO-1
  // @provisional PND-313
  return {
    type: 'dualCursorEntryPressed',
    date: atCenter === null ? '' : textOfDay(atCenter),
    hasDaysToPlace: atCenter !== null,
  }
}

// see PTD-2, DC-2, T-280
/** @purity pure */
export function screenEventFromDualCursorPress(
  press: PointerPress,
  context: InputContext,
): ScreenValuesEvent | null {
  const day = dayAtX(context.layout, press.at.x)
  // STOP: spec does not decide a DC-2 click where the axis has no day. Looked in DC-2, PTD-2
  // @provisional PND-314
  if (day === null) return null
  return { type: 'dualCursorPlaced', date: textOfDay(day) }
}

// InputCommandTranslator -- the Dual Cursor entry and chart presses by table T-029a.
// @unit      UF-95   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { textOfDay } from '../../entity/document-model/schedule/schedule'
import {
  CONSUMED_ELSEWHERE,
  acted,
  dayAtX,
  type InputContext,
  type PointerPress,
  type SetDualCursor,
  type TranslatedInput,
} from './input-command-translator'

// see IC-45, DC-1, DC-4, DC-7
/** @purity pure */
export function commandFromDualCursorEntry(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  // TRAP: the Esc path in frame-loop.ts writes the same clearing; change both together.
  if (context.dualCursorFollowing !== null) {
    return acted({
      kind: 'setDualCursorFollowing',
      following: null,
      placed: { kind: 'clearDualCursor' },
    })
  }
  const standing = context.document.documentSettings.dualCursor
  if (standing !== null) {
    return acted({ kind: 'setDualCursorFollowing', following: 'date1', placed: null })
  }
  const rowArea = context.regions.rowArea
  const onPointer = dayAtX(context.layout, press.at.x)
  const atCentre = dayAtX(context.layout, rowArea.x + rowArea.width / 2)
  // STOP: spec does not decide IC-45 where the axis has no day. Looked in DC-1, IV-13, BO-1
  // @provisional PND-313
  if (onPointer === null || atCentre === null) return CONSUMED_ELSEWHERE
  return acted({
    kind: 'setDualCursorFollowing',
    following: 'date1',
    placed: {
      kind: 'setDualCursor',
      date1: textOfDay(onPointer),
      date2: textOfDay(atCentre),
    },
  })
}

// see PTD-2, DC-2
/** @purity pure */
export function commandFromDualCursorPress(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const following = context.dualCursorFollowing
  const standing = context.document.documentSettings.dualCursor
  const day = dayAtX(context.layout, press.at.x)
  // STOP: spec does not decide a DC-2 click where the axis has no day. Looked in DC-2, PTD-2
  // @provisional PND-314
  if (following === null || standing === null || day === null) return CONSUMED_ELSEWHERE
  const fixed = textOfDay(day)
  const placed: SetDualCursor = {
    kind: 'setDualCursor',
    date1: following === 'date1' ? fixed : standing.date1,
    date2: following === 'date2' ? fixed : standing.date2,
  }
  return acted({
    kind: 'setDualCursorFollowing',
    following: following === 'date1' ? 'date2' : 'date1',
    placed,
  })
}

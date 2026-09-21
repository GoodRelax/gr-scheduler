// InputCommandTranslator -- turns a wheel turn into a scroll or a zoom (MK-1 to MK-5, table T-023).
// @unit      UF-91   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { regionAtPointer } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { WheelInput } from './input-source'
import {
  CONSUMED_ELSEWHERE,
  UNASSIGNED,
  changed,
  isCombo,
  isScrollPositionInForce,
  rowAnchorIn,
  rowIndexAtTopEdge,
  scrollAreaTopOf,
  scrolledAnchor,
  scrollingRowsOf,
  type InputContext,
  type ScrollAnchor,
  type TranslatedInput,
} from './input-command-translator'
import {
  rowZoomAnswer,
  zoomTimes,
  zoomWrites,
} from './zoom-and-fit'

type RowAnchor = Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>

/** @purity pure */
function rowHeldOf(context: InputContext): RowAnchor {
  const settings = context.document.documentSettings
  return { scrollGroupId: settings.scrollGroupId, scrollGroupOffset: settings.scrollGroupOffset }
}

// see FR-016, MK-1, S-176
// TRAP: the device distance itself, never whole rows: a band taller than a notch never moved.
// STOP: spec does not decide where a turn past an end lands. Looked in MK-1, S-78, S-176, OP-10.
// @provisional PND-176
// @provisional PND-177
/** @purity pure */
function rowTurnedTo(context: InputContext, dy: number): RowAnchor {
  const held = rowHeldOf(context)
  const rows = scrollingRowsOf(context.layout)
  const areaTop = scrollAreaTopOf(context)
  if (dy === 0 || rowIndexAtTopEdge(rows, areaTop) === null) return held
  if (rowIndexAtTopEdge(rows, areaTop + dy) === null) {
    const first = rows[0]
    return dy < 0 && first !== undefined ? { scrollGroupId: first.groupId, scrollGroupOffset: 0 } : held
  }
  return rowAnchorIn(rows, areaTop + dy, held)
}

// STOP: spec does not decide which surfaces the wheel is read on. Looked in MK-1, T-023a, U-32
// @provisional PND-12
/** @purity pure */
function isWheelHere(context: InputContext, x: number, y: number): boolean {
  if (context.isSurfaceStanding) return false
  const region = regionAtPointer(context.regions, x, y)
  return region !== null && region !== 'appHeader'
}


// see MK-1, MK-2, MK-3, MK-4, MK-5, MK-10, FR-016
/** @purity pure */
export function commandFromWheel(input: WheelInput, context: InputContext): TranslatedInput {
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)
  const ctrlShift = isCombo(modifiers, true, true, false)

  const assigned = plain || ctrl || shiftOnly || altOnly || ctrlShift
  if (!assigned) return UNASSIGNED
  if (!isWheelHere(context, input.x, input.y)) return UNASSIGNED
  if (context.pressed !== null) return CONSUMED_ELSEWHERE

  // STOP: spec does not decide which way a wheel turn magnifies. Looked in MK-2, S-53, S-96
  // @provisional PND-13
  const factor = Math.pow(context.zoomStep, -input.notches)

  if (ctrl) {
    return changed(
      zoomWrites(
        context,
        zoomTimes(context, factor, 'x'),
        zoomTimes(context, factor, 'y'),
        input.x,
        input.y,
      ),
    )
  }
  if (shiftOnly) {
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, input.x, input.y))
  }
  if (altOnly) return rowZoomAnswer(context, factor, input.x, input.y)

  // TRAP: a wheel turn is reported on the vertical axis whatever keys are held, so x alone
  // reads zero for MK-5; a real sideways report is believed first.
  const sideways = input.scrollPx.x !== 0 ? input.scrollPx.x : input.scrollPx.y
  // TRAP: without this a plain turn with no vertical distance zeroes S-176.
  if (plain && input.scrollPx.y === 0) return UNASSIGNED
  const moved = plain
    ? scrolledAnchor(context, 0, input.scrollPx.y)
    : scrolledAnchor(context, sideways, 0)
  // TRAP: MK-5 moves no row, and a round trip through drawn px loses the rounding (DFC-615).
  const row = plain ? rowTurnedTo(context, input.scrollPx.y) : rowHeldOf(context)
  const to = {
    kind: 'setScrollPosition',
    scrollDate: moved.scrollDate,
    scrollDayOffset: moved.scrollDayOffset,
    ...row,
  } as const
  // WHY: the position in force is not written again: an accepted write marks unsaved edits even if nothing moved.
  return isScrollPositionInForce(context, to) ? CONSUMED_ELSEWHERE : changed([to])
}

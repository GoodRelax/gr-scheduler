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
  rowIndexAtTopEdge,
  scrollAreaTopOf,
  scrolledAnchor,
  scrollingRowsOf,
  type InputContext,
  type TranslatedInput,
} from './input-command-translator'
import {
  rowZoomAnswer,
  zoomTimes,
  zoomWrites,
} from './zoom-and-fit'

// STOP: spec does not decide a one-row floor per detent, nor where a turn past an end lands.
// Looked in MK-1, S-78, S-176, OP-10. @provisional PND-176
// @provisional PND-177
/** @purity pure */
function rowTurnedTo(context: InputContext, dy: number): string | null {
  const settings = context.document.documentSettings
  const rows = scrollingRowsOf(context.layout)
  const areaTop = scrollAreaTopOf(context)
  const standing = rowIndexAtTopEdge(rows, areaTop)
  if (dy === 0 || standing === null) return settings.scrollGroupId
  const landed = rowIndexAtTopEdge(rows, areaTop + dy)
  if (landed === null) return dy < 0 ? (rows[0]?.groupId ?? null) : settings.scrollGroupId
  const at = landed === standing ? standing + (dy > 0 ? 1 : -1) : landed
  const held = Math.min(rows.length - 1, Math.max(0, at))
  return rows[held]?.groupId ?? settings.scrollGroupId
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
  const to = {
    kind: 'setScrollPosition',
    scrollDate: moved.scrollDate,
    scrollDayOffset: moved.scrollDayOffset,
    // TRAP: MK-5 moves no row, and a round trip through drawn px loses the rounding (DFC-615).
    scrollGroupId: plain
      ? rowTurnedTo(context, input.scrollPx.y)
      : context.document.documentSettings.scrollGroupId,
    // TRAP: beside a floored row id, moved.scrollGroupOffset names a place nobody scrolled to.
    scrollGroupOffset: plain ? 0 : context.document.documentSettings.scrollGroupOffset,
  } as const
  // WHY: the position in force is not written again: an accepted write marks unsaved edits even if nothing moved.
  return isScrollPositionInForce(context, to) ? CONSUMED_ELSEWHERE : changed([to])
}

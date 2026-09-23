// InputCommandTranslator -- the schedule's zoom: one zoom step, and fitting the whole schedule.
// @unit      UF-92   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { dayOf, type Schedule } from '../../entity/document-model/schedule/schedule'
import {
  fitZoom,
  groupDepthLimit,
  rowPlacesAtZoomY,
  xFromDay,
  type RowPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import {
  CONSUMED_ELSEWHERE,
  NOT_STORED_ROW_BAND_CEILING_SEARCH,
  NOT_STORED_VISIBLE_DAY_FLOOR,
  changed,
  dayAnchorAt,
  isScrollPositionInForce,
  rowAnchorIn,
  rowsAtZoomY,
  scrolledAnchor,
  scrollingRowsOf,
  zoomYCeiling,
  type InputContext,
  type ScrollAnchor,
  type TranslatedInput,
} from './input-command-translator'

/** @purity pure */
export function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] {
  return [[fitCommand(context)], [{ kind: 'expandAllTaskGroups' }]]
}

// see S-53, FR-016
/** @purity pure */
export function keyZoomFactor(context: InputContext, isIn: boolean): number {
  const step = context.zoomStep
  return isIn ? step : 1 / step
}

// see FR-016, S-229
/** @purity pure */
function zoomXCeiling(context: InputContext): number | null {
  const width = context.regions.rowArea.width
  const drawnAt = zoomOnScreen(context).x
  const pxPerDayAt1x = context.layout.pxPerDay / drawnAt
  const ceiling = width / (NOT_STORED_VISIBLE_DAY_FLOOR['S-229'] * pxPerDayAt1x)
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

/** @purity pure */
function tallestBandOf(rows: readonly RowPlacement[]): number {
  let tallest = 0
  for (const row of rows) if (row.height > tallest) tallest = row.height
  return tallest
}

// see FR-016, FR-018, FR-094, PI-5
/** @purity pure */
function bandZoomKeyOf(measuredWith: DocumentSettings, zoomY: number): string {
  const reading = rowAxisReadingOf(measuredWith, zoomY)
  return `${reading.planHeight}|${reading.depthLimit}`
}

// see FR-016, FR-018, FR-094, ZE-1
/** @purity pure */
function rowAxisReadingOf(
  measuredWith: DocumentSettings,
  zoomY: number,
): { readonly planHeight: number; readonly depthLimit: number } {
  const drawn = drawnSettingsOf({ ...measuredWith, zoomY })
  return {
    planHeight: Math.max(drawn.actualMin / drawn.actualOfPlan, drawn.basePlanHeight * drawn.zoomY),
    depthLimit: groupDepthLimit(drawn),
  }
}

// see ZE-1, FR-094, FR-018, S-76
/** @purity pure */
function isRowZoomAtLowerEnd(context: InputContext): boolean {
  const on = zoomOnScreen(context)
  const measuredWith = { ...context.document.documentSettings, zoomX: on.x }
  const now = rowAxisReadingOf(measuredWith, on.y)
  const lowest = rowAxisReadingOf(measuredWith, context.zoomMin)
  if (now.planHeight !== lowest.planHeight) return false
  if (now.depthLimit === lowest.depthLimit) return true
  const drawnNow = rowsAtZoomY(context, measuredWith, on.y)
  const drawnLowest = rowsAtZoomY(context, measuredWith, context.zoomMin)
  return drawnNow.length === drawnLowest.length &&
    drawnNow.every((row, at) => row.groupId === drawnLowest[at]?.groupId)
}

// see FR-016, T-262, ZE-2, ZE-3, ZE-4, ZE-5, MK-4, SK-16a, SK-16c
// TRAP: never for MK-2; the date axis still moves there, so that input changes the picture.
/** @purity pure */
export function rowZoomAnswer(
  context: InputContext,
  factor: number,
  pointerX: number | null,
  pointerY: number | null,
): TranslatedInput {
  const drawnZoomY = zoomOnScreen(context).y
  if (factor < 1 && isRowZoomAtLowerEnd(context)) {
    return { ...CONSUMED_ELSEWHERE, rowZoomEndShown: { end: 'min', zoomY: drawnZoomY } }
  }
  const stepped = zoomWithinBounds(context, zoomTimes(context, factor, 'y'))
  if (factor > 1 && stepped === drawnZoomY) {
    return { ...CONSUMED_ELSEWHERE, rowZoomEndShown: { end: 'max', zoomY: drawnZoomY } }
  }
  return changed(zoomWrites(context, null, stepped, pointerX, pointerY))
}

// see ST-7
/** @purity pure */
function mayStopAtStackCap(schedule: Schedule, drawn: DocumentSettings): boolean {
  const members = new Map<string, number>()
  for (const one of schedule.taskGroupMembers) {
    const count = (members.get(one.groupId) ?? 0) + 1
    if (count > drawn.stackSafetyCap) return true
    members.set(one.groupId, count)
  }
  return false
}

// see FR-016, FR-018
// TRAP: void when ST-7 may cut the rows, or once one row's height reads another row.
/** @purity pure */
function deepestFloorZoomYOf(context: InputContext, measuredWith: DocumentSettings): number | null {
  const drawn = drawnSettingsOf(measuredWith)
  const floor = drawn.actualMin / drawn.actualOfPlan
  const top = floor / drawn.basePlanHeight
  if (!Number.isFinite(top) || !(top > 0) || drawn.basePlanHeight * top > floor) return null
  if (mayStopAtStackCap(context.document.schedule, drawn)) return null
  return top
}

// see FR-016, PI-5, BC-2
/** @purity pure */
function tallestBandAtZoomY(
  context: InputContext,
  drawnZoomX: number,
  height: number,
): (zoomY: number) => boolean {
  const measuredWith = { ...context.document.documentSettings, zoomX: drawnZoomX }
  const asked = new Map<string, number>()
  const tallestAt = (zoomY: number): number => {
    const key = bandZoomKeyOf(measuredWith, zoomY)
    const known = asked.get(key)
    if (known !== undefined) return known
    const tallest = tallestBandOf(rowsAtZoomY(context, measuredWith, zoomY))
    asked.set(key, tallest)
    return tallest
  }
  const deepestFloor = deepestFloorZoomYOf(context, measuredWith)
  return (zoomY: number): boolean => {
    if (deepestFloor !== null && zoomY <= deepestFloor && tallestAt(deepestFloor) < height) {
      return false
    }
    return tallestAt(zoomY) >= height
  }
}

// see FR-016, PI-18
// TRAP: never solve the band here; a second solver with its own interval or stop moves
// where the zoom stops with the zoom it started from (DFC-628).
/** @purity pure */
function zoomYWithinBand(context: InputContext, drawnZoomX: number, wanted: number, upTo: number): number {
  if (!(context.regions.rowArea.height > 0) || !Number.isFinite(wanted)) return wanted
  const remembered = context.rowBandCeiling?.(drawnZoomX, upTo)
  const ceiling =
    remembered !== undefined && Number.isFinite(remembered)
      ? remembered
      : bandCeilingUpTo(context, drawnZoomX, upTo)
  return Math.min(wanted, ceiling)
}

// see FR-016, T-253, PI-18
/** @purity pure */
export function rowBandCeilingOf(context: InputContext, upTo: number = Number.POSITIVE_INFINITY): number {
  return bandCeilingUpTo(context, zoomOnScreen(context).x, upTo)
}

// see FR-016, T-253, OC-10, PI-5, PI-18
/** @purity pure */
function bandCeilingUpTo(context: InputContext, drawnZoomX: number, upTo: number): number {
  const height = context.regions.rowArea.height
  if (!(height > 0)) return context.zoomMax
  const search = NOT_STORED_ROW_BAND_CEILING_SEARCH
  const reaches = tallestBandAtZoomY(context, drawnZoomX, height)
  let upper = context.zoomMin
  if (reaches(upper)) return upper
  let lower = upper
  for (;;) {
    if (upper >= context.zoomMax) return context.zoomMax
    if (upper >= upTo) return upper
    lower = upper
    const next = upper * search['S-238']
    upper = next >= context.zoomMax ? context.zoomMax : next
    if (reaches(upper)) break
  }
  while (upper - lower > search['S-239']) {
    if (lower >= upTo) return lower
    const middle = (lower + upper) / 2
    if (middle <= lower || middle >= upper) break
    if (reaches(middle)) upper = middle
    else lower = middle
  }
  return upper
}

// TRAP: rounding the stepped zoom breaks FR-018 silently (it can cross a detail threshold).
// see FR-016, FR-018
/** @purity pure */
export function zoomTimes(context: InputContext, factor: number, axis: 'x' | 'y'): number {
  const on = zoomOnScreen(context)
  const stepped = (axis === 'x' ? on.x : on.y) * factor
  const ceiling = axis === 'x' ? zoomXCeiling(context) : zoomYCeiling(context)
  const wanted = ceiling === null ? stepped : Math.min(stepped, ceiling)
  if (axis === 'x') return wanted
  return zoomYWithinBand(context, on.x, wanted, ceiling === null ? Number.POSITIVE_INFINITY : ceiling)
}

/** @purity pure */
function zoomCommand(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
): DocumentCommand {
  const on = zoomOnScreen(context)
  return {
    kind: 'setZoom',
    zoomX: zoomX === null ? on.x : zoomX,
    zoomY: zoomY === null ? on.y : zoomY,
  }
}

// TRAP: viewSettings in frame-loop.ts writes the same base half of OP-10's condition;
// change both together.
// see OP-10
/** @purity pure */
function namesAPlace(
  schedule: Schedule,
  scrollDate: string | null,
  scrollGroupId: string | null,
): boolean {
  if (scrollDate === null) return false
  return schedule.taskGroups.some((one) => one.id === scrollGroupId)
}

// see OP-10
/** @purity pure */
function placeSeated(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const settings = context.document.documentSettings
  if (namesAPlace(schedule, settings.scrollDate, settings.scrollGroupId)) return []
  const at = scrolledAnchor(context, 0, 0)
  if (!namesAPlace(schedule, at.scrollDate, at.scrollGroupId)) return []
  return [
    {
      kind: 'setScrollPosition',
      scrollDate: at.scrollDate,
      scrollDayOffset: at.scrollDayOffset,
      scrollGroupId: at.scrollGroupId,
      scrollGroupOffset: at.scrollGroupOffset,
    },
  ]
}

/** @purity pure */
function zoomCentreX(context: InputContext, pointerX: number | null): number {
  const area = context.regions.rowArea
  return pointerX === null ? area.x + area.width / 2 : pointerX
}

/** @purity pure */
function zoomCentreY(context: InputContext, pointerY: number | null): number {
  const area = context.regions.rowArea
  return pointerY === null ? area.y + area.height / 2 : pointerY
}

// TRAP: rowAnchorIn and scrollOffsetOf measure the same slab; change all three together.
/** @purity pure */
export function rowPointIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const at = rows.findIndex((row) => row.groupId === anchor.scrollGroupId)
  if (at < 0) return null
  const row = rows[at]
  if (row === undefined) return null
  const below = rows[at + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  const into = Number.isFinite(anchor.scrollGroupOffset) ? anchor.scrollGroupOffset : 0
  return row.y + into * slab
}

/** @purity pure */
export function topEdgeIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const marked = rowPointIn(rows, anchor)
  if (marked !== null) return marked
  const first = rows[0]
  return first === undefined ? null : first.y
}

// see S-75, S-76
/** @purity pure */
function zoomWithinBounds(context: InputContext, value: number): number {
  return Math.max(context.zoomMin, Math.min(context.zoomMax, value))
}

// see FR-016
/** @purity pure */
function dayHeldStill(
  context: InputContext,
  zoomX: number | null,
  centreX: number,
): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> | null {
  if (zoomX === null) return null
  const area = context.regions.rowArea
  const factor = zoomWithinBounds(context, zoomX) / zoomOnScreen(context).x
  if (!Number.isFinite(factor) || factor <= 0) return null
  return dayAnchorAt(context, centreX - (centreX - area.x) / factor)
}

// see FR-016, PI-5
/** @purity pure */
function rowHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreY: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> | null {
  if (zoomY === null) return null
  const on = zoomOnScreen(context)
  const willBe = zoomWithinBounds(context, zoomY)
  if (!(willBe > 0) || willBe === on.y) return null
  const seat = scrolledAnchor(context, 0, 0)
  const held = rowAnchorIn(scrollingRowsOf(context.layout), centreY, seat)
  // TRAP: lay the candidate out at the new zoomX too: lanes follow horizontal overlap (ST-2, ST-3).
  const after = rowPlacesAtZoomY(
    context.document.schedule,
    {
      ...context.document.documentSettings,
      zoomX: zoomX === null ? on.x : zoomWithinBounds(context, zoomX),
      scrollDate: seat.scrollDate,
      scrollDayOffset: seat.scrollDayOffset,
      scrollGroupId: seat.scrollGroupId,
      scrollGroupOffset: seat.scrollGroupOffset,
    },
    context.regions,
    willBe,
    context.isLevelZeroFolded,
    context.rowControlsHeightPx,
  ).filter((row) => row.isPinned !== true)
  const landed = rowPointIn(after, held)
  const topEdge = topEdgeIn(after, seat)
  if (landed === null || topEdge === null) return null
  return rowAnchorIn(after, topEdge + (landed - centreY), seat)
}

// see FR-016, OP-10
/** @purity pure */
function placeHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreX: number,
  centreY: number,
): readonly DocumentCommand[] {
  const day = dayHeldStill(context, zoomX, centreX)
  const row = rowHeldStill(context, zoomX, zoomY, centreY)
  if (day === null && row === null) return placeSeated(context)
  const seat = scrolledAnchor(context, 0, 0)
  const heldDay = day ?? seat
  const heldRow = row ?? seat
  const to = {
    kind: 'setScrollPosition',
    scrollDate: heldDay.scrollDate,
    scrollDayOffset: heldDay.scrollDayOffset,
    scrollGroupId: heldRow.scrollGroupId,
    scrollGroupOffset: heldRow.scrollGroupOffset,
  } as const
  if (!namesAPlace(context.document.schedule, to.scrollDate, to.scrollGroupId)) {
    return placeSeated(context)
  }
  return isScrollPositionInForce(context, to) ? [] : [to]
}

// see FR-016
/** @purity pure */
export function zoomWrites(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  pointerX: number | null,
  pointerY: number | null,
): readonly DocumentCommand[] {
  return [
    ...placeHeldStill(
      context,
      zoomX,
      zoomY,
      zoomCentreX(context, pointerX),
      zoomCentreY(context, pointerY),
    ),
    zoomCommand(context, zoomX, zoomY),
  ]
}

// TRAP: CM-72 (expandAllTaskGroups) writes the same predicate; change both together.
// see HF-8
/** @purity pure */
function collapsesDiscarded(schedule: Schedule): Schedule {
  return {
    ...schedule,
    taskGroups: schedule.taskGroups.map((one) =>
      one.isCollapsed === true || one.isKeptOpen
        ? { ...one, isCollapsed: one.isCollapsed === true ? false : one.isCollapsed, isKeptOpen: false }
        : one,
    ),
  }
}

// see FR-055, OP-10
// WHY: with no stored date the fit has no origin day and places no left edge; any date measures alike.
/** @purity pure */
function measuredSettings(context: InputContext): DocumentSettings {
  const settings = context.document.documentSettings
  if (dayOf(settings.scrollDate) !== null) return settings
  return { ...settings, scrollDate: scrolledAnchor(context, 0, 0).scrollDate ?? context.today }
}

// TRAP: do not move the discard into fitZoom: viewSettings in frame-loop.ts shares fitZoom,
// and HF-8 forbids the discard at startup.
// see FR-055, HF-8
/** @purity pure */
function fittedNow(context: InputContext) {
  return fitZoom(
    collapsesDiscarded(context.document.schedule),
    measuredSettings(context),
    context.regions,
    { step: context.zoomStep, min: context.zoomMin, max: context.zoomMax },
    context.rowControlsHeightPx,
  )
}

// see OP-10, FR-055
/** @purity pure */
export function zoomOnScreen(context: InputContext): { readonly x: number; readonly y: number } {
  const settings = context.document.documentSettings
  // TRAP: keep ?? and not === true: an absent flag falls back to OP-10's base half.
  const atStoredZoom =
    context.isPictureAtStoredZoom ??
    namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  if (atStoredZoom) {
    return { x: settings.zoomX, y: settings.zoomY }
  }
  const fitted = fittedNow(context)
  return { x: fitted.zoomX, y: Math.max(fitted.zoomY, fitted.floorZoomY) }
}

// see FR-046, IC-44
/** @purity pure */
export function statusLineWrites(context: InputContext): readonly DocumentCommand[] {
  if (context.document.schedule.project.statusDate !== null) return [{ kind: 'clearStatusDate' }]
  return [{ kind: 'setStatusDate', date: context.today }, ...statusLineCentred(context, context.today)]
}

// see FR-046, OP-10
// WHY: a picture drawn at the fit (OP-10) stores no zoom; the drawn zoom is written with the place so it stays.
/** @purity pure */
function statusLineCentred(context: InputContext, date: string): readonly DocumentCommand[] {
  const day = dayOf(date)
  if (day === null) return []
  const settings = context.document.documentSettings
  const isSeated = namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  const area = context.regions.rowArea
  const onDay = dayAnchorAt(context, xFromDay(context.layout, day) - area.width / 2)
  const rows = isSeated ? settings : scrolledAnchor(context, 0, 0)
  const to = {
    kind: 'setScrollPosition',
    scrollDate: onDay.scrollDate,
    scrollDayOffset: onDay.scrollDayOffset,
    scrollGroupId: rows.scrollGroupId,
    scrollGroupOffset: rows.scrollGroupOffset,
  } as const
  if (!(context.isPictureAtStoredZoom ?? isSeated)) return [zoomCommand(context, null, null), to]
  return isScrollPositionInForce(context, to) ? [] : [to]
}

// see SK-18, FR-055
/** @purity pure */
function fitCommand(context: InputContext): DocumentCommand {
  const schedule = context.document.schedule
  const fitted = fittedNow(context)
  const at = scrolledAnchor(context, 0, 0)
  const place =
    namesAPlace(schedule, fitted.scrollDate, fitted.scrollGroupId) ||
    !namesAPlace(schedule, at.scrollDate, at.scrollGroupId)
      ? fitted
      : at
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: place.scrollDate,
    scrollGroupId: place.scrollGroupId,
    scrollDayOffset: place.scrollDayOffset,
    scrollGroupOffset: 0,
  }
}

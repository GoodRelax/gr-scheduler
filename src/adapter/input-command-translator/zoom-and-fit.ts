// InputCommandTranslator -- the schedule's zoom: one zoom step, and fitting the whole schedule.
// @unit      UF-92   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import { dayOf, textOfDayStart, type Schedule } from '../../entity/document-model/schedule/schedule'
import {
  fitZoom,
  fixedFitSpanOf,
  groupDepthLimit,
  groupDepthThresholdOf,
  taskGroupAnchorIn,
  taskGroupPlacesAtZoomY,
  xFromDay,
  type TaskGroupPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { drawnSettingsOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type {
  DocumentSettings,
  DrawnSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  levelZeroWritesFor,
  treeStateWritesFor,
  type DocumentCommand,
} from '../../use-case/edit-document/edit-document'
import {
  CONSUMED_ELSEWHERE,
  NOT_STORED_ROW_BAND_CEILING_SEARCH,
  NOT_STORED_VISIBLE_DAY_FLOOR,
  changed,
  changedInOrder,
  dayAnchorAt,
  isScrollPositionInForce,
  taskGroupsAtZoomY,
  scrolledAnchor,
  scrollingTaskGroupsOf,
  zoomYCeiling,
  type InputContext,
  type ScrollAnchor,
  type TranslatedInput,
} from './input-command-translator'

// see FR-031, FR-055, HF-8, CM-72, CM-86, T-328
/** @purity pure */
export function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] {
  const levelZeroTreeState = context.document.documentSettings.levelZeroTreeState
  return [
    [fitCommand(context)],
    [
      { kind: 'resetTaskGroupTreeStates' },
      ...levelZeroWritesFor(levelZeroTreeState, { type: 'fitPressed' }),
    ],
  ]
}

// see FR-031, FR-018, T-328, ZE-2, ZE-4
/** @purity pure */
function verticalZoomShrinkWrites(
  context: InputContext,
  zoom: readonly DocumentCommand[],
): TranslatedInput {
  return changedInOrder([
    zoom,
    treeStateWritesFor(context.document.schedule, { type: 'verticalZoomShrinkPressed' }),
  ])
}

/** @purity pure */
export function zoomStepAnswer(
  context: InputContext,
  factor: number,
  zoom: readonly DocumentCommand[],
): TranslatedInput {
  return factor < 1 ? verticalZoomShrinkWrites(context, zoom) : changed(zoom)
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
  const width = context.regions.taskGroupArea.width
  const pxPerDayAt1x = drawnSettingsOf(context.document.documentSettings).pxPerDayAt1x
  const ceiling = width / (NOT_STORED_VISIBLE_DAY_FLOOR['S-229'] * pxPerDayAt1x)
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

/** @purity pure */
function tallestBandOf(taskGroups: readonly TaskGroupPlacement[]): number {
  let tallest = 0
  for (const taskGroup of taskGroups) if (taskGroup.height > tallest) tallest = taskGroup.height
  return tallest
}

// see FR-016, FR-018, FR-094, PI-5
/** @purity pure */
function bandZoomKeyOf(measuredWith: DocumentSettings, zoomY: number): string {
  const reading = verticalAxisReadingOf(measuredWith, zoomY)
  return `${reading.planHeight}|${reading.depthLimit}`
}

// see FR-016, FR-018, FR-094, ZE-1
/** @purity pure */
function verticalAxisReadingOf(
  measuredWith: DocumentSettings,
  zoomY: number,
): { readonly planHeight: number; readonly depthLimit: number } {
  const drawn = drawnSettingsOf({ ...measuredWith, zoomY })
  return {
    planHeight: Math.max(drawn.actualMin / drawn.actualOfPlan, drawn.basePlanHeight * drawn.zoomY),
    depthLimit: groupDepthLimit(drawn),
  }
}

// see ZE-1, ZE-6
/** @purity pure */
function measuredAtScreenZoomX(
  context: InputContext,
  on: { readonly x: number; readonly y: number },
): DocumentSettings {
  return { ...context.document.documentSettings, zoomX: on.x }
}

// see ZE-1, FR-094, FR-018, S-76
/** @purity pure */
function isVerticalZoomAtLowerEnd(context: InputContext, on: { readonly x: number; readonly y: number }): boolean {
  const measuredWith = measuredAtScreenZoomX(context, on)
  const now = verticalAxisReadingOf(measuredWith, on.y)
  const lowest = verticalAxisReadingOf(measuredWith, context.zoomMin)
  if (now.planHeight !== lowest.planHeight) return false
  if (now.depthLimit === lowest.depthLimit) return true
  return drawsSameTaskGroups(
    taskGroupsAtZoomY(context, measuredWith, on.y),
    taskGroupsAtZoomY(context, measuredWith, context.zoomMin),
  )
}

// see ZE-1, ZE-6, FR-018
/** @purity pure */
function drawsSameTaskGroups(one: readonly TaskGroupPlacement[], other: readonly TaskGroupPlacement[]): boolean {
  return one.length === other.length && one.every((taskGroup, at) => taskGroup.groupId === other[at]?.groupId)
}

// see ZE-6, ZE-1, FR-018, FR-094
/** @purity pure */
function nextTaskGroupPictureZoomYOf(
  context: InputContext,
  on: { readonly x: number; readonly y: number },
  stepped: number,
): number {
  const measuredWith = measuredAtScreenZoomX(context, on)
  const floorZoomY = floorZoomYOf(measuredWith)
  if (floorZoomY === null || !(on.y <= floorZoomY)) return stepped
  const drawn = drawnSettingsOf(measuredWith)
  const taskGroupsNow = taskGroupsAtZoomY(context, measuredWith, on.y)
  let target = floorZoomY * context.zoomStep
  for (let depth = 2; depth <= drawn.maxGroupDepth; depth++) {
    const threshold = groupDepthThresholdOf(depth, drawn)
    if (!(threshold > on.y) || !(threshold < target)) continue
    if (!drawsSameTaskGroups(taskGroupsNow, taskGroupsAtZoomY(context, measuredWith, threshold))) target = threshold
  }
  return Math.max(stepped, target)
}

// see FR-016, FR-031, T-262, ZE-2, ZE-3, ZE-4, ZE-5, MK-4, IC-14, IC-15, SK-16a, SK-16c
// TRAP: never for MK-2; the date axis still moves there, so that input changes the picture.
/** @purity pure */
export function verticalZoomAnswer(
  context: InputContext,
  factor: number,
  pointerX: number | null,
  pointerY: number | null,
): TranslatedInput {
  const on = zoomOnScreen(context)
  const drawnZoomY = on.y
  if (factor < 1 && isVerticalZoomAtLowerEnd(context, on)) {
    const ended = verticalZoomShrinkWrites(context, [])
    return { ...ended, verticalZoomEndShown: { end: 'min', zoomY: drawnZoomY } }
  }
  const stepped = verticalZoomStepOf(context, on, factor)
  if (factor > 1 && stepped === drawnZoomY) {
    return { ...CONSUMED_ELSEWHERE, verticalZoomEndShown: { end: 'max', zoomY: drawnZoomY } }
  }
  return zoomStepAnswer(context, factor, zoomWrites(context, null, stepped, pointerX, pointerY))
}

// see FR-016, ZE-3, ZE-6, S-76
/** @purity pure */
function verticalZoomStepOf(
  context: InputContext,
  on: { readonly x: number; readonly y: number },
  factor: number,
): number {
  const wanted =
    factor > 1
      ? zoomYWithinCeiling(context, on.x, nextTaskGroupPictureZoomYOf(context, on, on.y * factor))
      : zoomTimesFrom(context, on, factor, 'y')
  return zoomWithinBounds(context, wanted)
}

/** @purity pure */
function timeZoomStepOf(context: InputContext, on: { readonly x: number; readonly y: number }, factor: number): number {
  return zoomWithinBounds(context, zoomTimesFrom(context, on, factor, 'x'))
}

export interface ZoomEntranceEnds {
  readonly timeOut: boolean
  readonly timeIn: boolean
  readonly verticalOut: boolean
  readonly verticalIn: boolean
}

// see FR-029, IC-12, IC-13, IC-14, IC-15, ZE-1, ZE-3, S-75, S-76, S-229
// WHY: the steps the presses take (setZoom clamps zoomX alike), so faint and press never disagree.
/** @purity pure */
export function zoomEntranceEndsOf(context: InputContext): ZoomEntranceEnds {
  const on = zoomOnScreen(context)
  return {
    timeOut: timeZoomStepOf(context, on, keyZoomFactor(context, false)) === on.x,
    timeIn: timeZoomStepOf(context, on, keyZoomFactor(context, true)) === on.x,
    verticalOut: isVerticalZoomAtLowerEnd(context, on),
    verticalIn: verticalZoomStepOf(context, on, keyZoomFactor(context, true)) === on.y,
  }
}

// see ST-7
/** @purity pure */
function mayStopAtStackCap(schedule: Schedule, drawn: DrawnSettings): boolean {
  const members = new Map<string, number>()
  for (const one of schedule.taskGroupMembers) {
    const count = (members.get(one.groupId) ?? 0) + 1
    if (count > drawn.stackSafetyCap) return true
    members.set(one.groupId, count)
  }
  return false
}

// see FR-016, FR-018
// TRAP: void when ST-7 may cut the task groups, or once one task group's height reads another task group.
/** @purity pure */
function deepestFloorZoomYOf(context: InputContext, measuredWith: DocumentSettings): number | null {
  const top = floorZoomYOf(measuredWith)
  if (top === null || mayStopAtStackCap(context.document.schedule, drawnSettingsOf(measuredWith))) return null
  return top
}

// see FR-094, ZE-1
/** @purity pure */
function floorZoomYOf(measuredWith: DocumentSettings): number | null {
  const drawn = drawnSettingsOf(measuredWith)
  const floor = drawn.actualMin / drawn.actualOfPlan
  const top = floor / drawn.basePlanHeight
  if (!Number.isFinite(top) || !(top > 0) || drawn.basePlanHeight * top > floor) return null
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
    const tallest = tallestBandOf(taskGroupsAtZoomY(context, measuredWith, zoomY))
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
  if (!(context.regions.taskGroupArea.height > 0) || !Number.isFinite(wanted)) return wanted
  const remembered = context.taskGroupBandCeiling?.(drawnZoomX, upTo, wanted)
  const ceiling =
    remembered !== undefined && Number.isFinite(remembered)
      ? remembered
      : bandCeilingUpTo(context, drawnZoomX, upTo, wanted)
  return Math.min(wanted, ceiling)
}

// see FR-016, T-253, PI-18
/** @purity pure */
export function taskGroupBandCeilingOf(
  context: InputContext,
  upTo: number = Number.POSITIVE_INFINITY,
  enough: number = Number.POSITIVE_INFINITY,
): number {
  return bandCeilingUpTo(context, zoomOnScreen(context).x, upTo, enough)
}

// see FR-016, T-253, OC-10, PI-5, PI-18
// WHY: no answer is below the last probe short of the band, so min(enough, ceiling) is settled there.
/** @purity pure */
function bandCeilingUpTo(
  context: InputContext,
  drawnZoomX: number,
  upTo: number,
  enough: number = Number.POSITIVE_INFINITY,
): number {
  const height = context.regions.taskGroupArea.height
  if (!(height > 0)) return context.zoomMax
  const search = NOT_STORED_ROW_BAND_CEILING_SEARCH
  const reaches = tallestBandAtZoomY(context, drawnZoomX, height)
  let upper = context.zoomMin
  if (reaches(upper)) return upper
  let lower = upper
  for (;;) {
    if (upper >= enough) return upper
    if (upper >= context.zoomMax) return context.zoomMax
    if (upper >= upTo) return upper
    lower = upper
    const next = upper * search['S-238']
    upper = next >= context.zoomMax ? context.zoomMax : next
    if (reaches(upper)) break
  }
  while (upper - lower > search['S-239']) {
    if (lower >= upTo || lower >= enough) return lower
    const middle = (lower + upper) / 2
    if (middle <= lower || middle >= upper) break
    if (reaches(middle)) upper = middle
    else lower = middle
  }
  return upper
}

// see FR-016, FR-018
/** @purity pure */
export function zoomTimes(context: InputContext, factor: number, axis: 'x' | 'y'): number {
  return zoomTimesFrom(context, zoomOnScreen(context), factor, axis)
}

// TRAP: rounding the stepped zoom breaks FR-018 silently (it can cross a detail threshold).
// see FR-016, FR-018
/** @purity pure */
function zoomTimesFrom(
  context: InputContext,
  on: { readonly x: number; readonly y: number },
  factor: number,
  axis: 'x' | 'y',
): number {
  if (axis === 'y') return zoomYWithinCeiling(context, on.x, on.y * factor)
  const stepped = on.x * factor
  const ceiling = zoomXCeiling(context)
  return ceiling === null ? stepped : Math.min(stepped, ceiling)
}

// see FR-016, ZE-3
/** @purity pure */
function zoomYWithinCeiling(context: InputContext, drawnZoomX: number, stepped: number): number {
  const ceiling = zoomYCeiling(context)
  const wanted = ceiling === null ? stepped : Math.min(stepped, ceiling)
  return zoomYWithinBand(context, drawnZoomX, wanted, ceiling === null ? Number.POSITIVE_INFINITY : ceiling)
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

// TRAP: viewSettings in view-place.ts writes the same base half of OP-10's condition;
// change both together.
// see OP-10
/** @purity pure */
export function namesAPlace(
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
  const area = context.regions.taskGroupArea
  return pointerX === null ? area.x + area.width / 2 : pointerX
}

/** @purity pure */
function zoomCentreY(context: InputContext, pointerY: number | null): number {
  const area = context.regions.taskGroupArea
  return pointerY === null ? area.y + area.height / 2 : pointerY
}

// TRAP: taskGroupAnchorIn and scrollOffsetOf measure the same slab; change all three together.
/** @purity pure */
export function taskGroupPointIn(
  taskGroups: readonly TaskGroupPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const at = taskGroups.findIndex((taskGroup) => taskGroup.groupId === anchor.scrollGroupId)
  if (at < 0) return null
  const taskGroup = taskGroups[at]
  if (taskGroup === undefined) return null
  const below = taskGroups[at + 1]
  const slab = below === undefined ? taskGroup.height : below.y - taskGroup.y
  const into = Number.isFinite(anchor.scrollGroupOffset) ? anchor.scrollGroupOffset : 0
  return taskGroup.y + into * slab
}

/** @purity pure */
export function topEdgeIn(
  taskGroups: readonly TaskGroupPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const marked = taskGroupPointIn(taskGroups, anchor)
  if (marked !== null) return marked
  const first = taskGroups[0]
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
  const area = context.regions.taskGroupArea
  const factor = zoomWithinBounds(context, zoomX) / zoomOnScreen(context).x
  if (!Number.isFinite(factor) || factor <= 0) return null
  return dayAnchorAt(context, centreX - (centreX - area.x) / factor)
}

// see FR-016, PI-5
/** @purity pure */
function taskGroupHeldStill(
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
  const held = taskGroupAnchorIn(scrollingTaskGroupsOf(context.layout), centreY, seat)
  // TRAP: lay the candidate out at the new zoomX too: lanes follow horizontal overlap (ST-2, ST-3).
  const after = taskGroupPlacesAtZoomY(
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
    context.taskGroupControlsHeightPx,
  ).filter((taskGroup) => taskGroup.isPinned !== true)
  const landed = taskGroupPointIn(after, held)
  const topEdge = topEdgeIn(after, seat)
  if (landed === null || topEdge === null) return null
  return taskGroupAnchorIn(after, topEdge + (landed - centreY), seat)
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
  const row = taskGroupHeldStill(context, zoomX, zoomY, centreY)
  if (day === null && row === null) return placeSeated(context)
  const seat = scrolledAnchor(context, 0, 0)
  const heldDay = day ?? seat
  const heldTaskGroup = row ?? seat
  const to = {
    kind: 'setScrollPosition',
    scrollDate: heldDay.scrollDate,
    scrollDayOffset: heldDay.scrollDayOffset,
    scrollGroupId: heldTaskGroup.scrollGroupId,
    scrollGroupOffset: heldTaskGroup.scrollGroupOffset,
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

// TRAP: CM-72 (resetTaskGroupTreeStates) writes the same predicate; change both together.
// see HF-8, CM-72
/** @purity pure */
function treeStatesReset(schedule: Schedule): Schedule {
  return {
    ...schedule,
    taskGroups: schedule.taskGroups.map((one) =>
      one.treeState === 'hidden' || one.treeState === 'auto' ? one : { ...one, treeState: 'auto' },
    ),
  }
}

// see FR-055, OP-10
// WHY: with no stored date the fit has no origin day and places no left edge; any date measures alike.
/** @purity pure */
function datedSettings(context: InputContext): DocumentSettings {
  const settings = context.document.documentSettings
  if (dayOf(settings.scrollDate) !== null) return settings
  return { ...settings, scrollDate: scrolledAnchor(context, 0, 0).scrollDate ?? context.today }
}

// TRAP: keep the discard out of fitZoom: viewSettings in view-place.ts shares it; HF-8 forbids it at startup.
// TRAP: only the fit command passes the drawn filter (TV-1); fittedAsDrawn answers the zoom OP-10 drew, which knows no filter.
// see FR-055, HF-8, TV-1, S-418
/** @purity pure */
function fittedNow(context: InputContext, shownTaskUids: ReadonlySet<number> | null = null) {
  const settings: DocumentSettings = { ...datedSettings(context), levelZeroTreeState: 'auto' }
  return fitOf(context, treeStatesReset(context.document.schedule), settings, shownTaskUids)
}

/** @purity pure */
function fitOf(
  context: InputContext,
  schedule: Schedule,
  settings: DocumentSettings,
  shownTaskUids: ReadonlySet<number> | null,
) {
  const bounds = { step: context.zoomStep, min: context.zoomMin, max: context.zoomMax }
  return fitZoom(schedule, settings, context.regions, bounds, context.taskGroupControlsHeightPx, shownTaskUids)
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
  const fitted = fittedAsDrawn(context)
  return { x: fitted.zoomX, y: fitted.zoomY }
}

// TRAP: keep the folds as viewSettings in view-place.ts drew them; only the asked fit discards (HF-8).
/** @purity pure */
function fittedAsDrawn(context: InputContext) {
  return fitOf(context, context.document.schedule, datedSettings(context), null)
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
export function statusLineCentred(context: InputContext, date: string): readonly DocumentCommand[] {
  const day = dayOf(date)
  if (day === null) return []
  const settings = context.document.documentSettings
  const isSeated = namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  const area = context.regions.taskGroupArea
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
  const fitted = fittedNow(context, context.layout.shownTaskUids ?? null)
  const at = scrolledAnchor(context, 0, 0)
  const place =
    namesAPlace(schedule, fitted.scrollDate, fitted.scrollGroupId) ||
    !namesAPlace(schedule, at.scrollDate, at.scrollGroupId)
      ? fitted
      : at
  const fixed = fixedSpanAcrossOf(context)
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fixed?.zoomX ?? fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: fixed?.scrollDate ?? place.scrollDate,
    scrollGroupId: place.scrollGroupId,
    scrollDayOffset: fixed === null ? place.scrollDayOffset : 0,
    scrollGroupOffset: 0,
  }
}

// see FX-3, FX-1, S-75
/** @purity pure */
function fixedSpanAcrossOf(context: InputContext): { readonly zoomX: number; readonly scrollDate: string } | null {
  const settings = context.document.documentSettings
  const span = fixedFitSpanOf(settings)
  if (span === null) return null
  const zoomX = context.regions.taskGroupArea.width / span.days / drawnSettingsOf(settings).pxPerDayAt1x
  return { zoomX: Math.max(context.zoomMin, Math.min(context.zoomMax, zoomX)), scrollDate: textOfDayStart(span.start) }
}

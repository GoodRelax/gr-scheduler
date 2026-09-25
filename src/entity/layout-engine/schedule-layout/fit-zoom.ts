// ScheduleLayout -- the fit: the zooms and the view place that show the whole schedule (FR-055).
// @unit      UF-143  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { textOfDay, type CalendarDay, type Schedule } from '../../document-model/schedule/schedule'
import type { ScreenRegions } from '../screen-regions/screen-regions'
import { drawnGroups } from './drawn-rows'
import { groupDepthThresholdOf } from './group-level-of-detail'
import { layoutFromSchedule, type ScheduleLayout } from './schedule-layout'
import { zoomYAtPlanHeightFloor } from './shape-cross-sections'
import { dateAtX, xFromDay } from './time-axis'

// see FR-055, OP-10
export interface FitToScreen {
  readonly zoomX: number
  readonly zoomY: number
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupId: string | null
  readonly floorZoomY: number
}

export interface NotStoredZoom {
  readonly step: number
  readonly min: number
  readonly max: number
}

/** @purity pure */
function landingZoomY(depth: number, settings: DocumentSettings, step: number): number {
  if (depth <= 1) return groupDepthThresholdOf(2, settings) / step
  return groupDepthThresholdOf(depth, settings)
}

/** @purity pure */
function deepestDrawnDepth(schedule: Schedule, settings: DocumentSettings): number {
  let deepest = 0
  for (const row of drawnGroups(schedule, settings, false)) {
    if (row.depth > deepest) deepest = row.depth
  }
  return Math.min(deepest, settings.maxGroupDepth)
}

// see FR-016, FR-055, T-068
/** @purity pure */
function clampedZoom(value: number, zoom: NotStoredZoom): number {
  const lifted = Number.isFinite(zoom.min) ? Math.max(zoom.min, value) : value
  return Number.isFinite(zoom.max) ? Math.min(zoom.max, lifted) : lifted
}

const FIT_MARGIN_SIDES = 2

// WHY: the labels follow zoomY and not zoomX, so the extent is near-linear in zoomX and a few
// secant steps land it; a fixed count keeps a stepped extent from running on.
const FIT_SOLVE_STEPS = 6

// WHY: a width closer than half a pixel to the room draws the same picture.
const FIT_WIDTH_TOLERANCE_PX = 0.5

interface FitRun {
  readonly zoomX: number
  readonly run: ScheduleLayout
}

// see FR-055, LF-16
/** @purity pure */
function fitsRowArea(run: ScheduleLayout, regions: ScreenRegions): boolean {
  // STOP: spec does not decide whether a run stopped by ST-7 fits; here it never does. Looked in ST-7, FR-055
  // @provisional PND-479
  if (run.stackSafetyCapReached !== null) return false
  const remainderTop = run.scrollAreaY ?? regions.rowArea.y
  return run.contentHeight <= regions.rowArea.y + regions.rowArea.height - remainderTop
}

/** @purity pure */
function deepestFittingDepth(
  deepest: number,
  runAtCap: (cap: number) => ScheduleLayout,
  fits: (run: ScheduleLayout) => boolean,
): number {
  for (let candidate = deepest; candidate >= 1; candidate--) {
    if (fits(runAtCap(candidate))) return candidate
  }
  return 1
}

/** @purity pure */
function nextFitZoomX(last: FitRun, before: FitRun | undefined, room: number): number {
  const width = last.run.contentWidth
  if (width <= 0) return last.zoomX
  if (before !== undefined && before.zoomX !== last.zoomX) {
    const slope = (width - before.run.contentWidth) / (last.zoomX - before.zoomX)
    if (slope > 0) return last.zoomX + (room - width) / slope
  }
  return (last.zoomX * room) / width
}

/** @purity pure */
function isWidthSettled(run: ScheduleLayout, room: number): boolean {
  const spare = room - run.contentWidth
  return run.contentWidth <= 0 || (spare >= 0 && spare <= FIT_WIDTH_TOLERANCE_PX)
}

// see FR-055
// WHY: the widest run that fits; when none does (the labels alone are wider), the narrowest one.
/** @purity pure */
function widthFittedRun(
  runAtX: (zoomX: number) => ScheduleLayout,
  from: number,
  room: number,
  zoom: NotStoredZoom,
): FitRun {
  const tried: FitRun[] = [{ zoomX: from, run: runAtX(from) }]
  for (let step = 1; step < FIT_SOLVE_STEPS; step++) {
    const last = tried[tried.length - 1]!
    if (isWidthSettled(last.run, room)) break
    const next = clampedZoom(nextFitZoomX(last, tried[tried.length - 2], room), zoom)
    if (!(next > 0) || tried.some((one) => one.zoomX === next)) break
    tried.push({ zoomX: next, run: runAtX(next) })
  }
  const fitting = tried.filter((one) => one.run.contentWidth <= room)
  const pool = fitting.length > 0 ? fitting : tried
  const zoomX = (fitting.length > 0 ? Math.max : Math.min)(...pool.map((one) => one.zoomX))
  return pool.find((one) => one.zoomX === zoomX)!
}

// see FR-055
/** @purity pure */
function landedFit(
  deepestFitting: number,
  landingAt: (depth: number) => number,
  solveAt: (depth: number, zoomY: number) => FitRun,
  fits: (run: ScheduleLayout) => boolean,
): { readonly zoomY: number; readonly fitted: FitRun } {
  for (let depth = deepestFitting; ; depth--) {
    const zoomY = landingAt(depth)
    const fitted = solveAt(depth, zoomY)
    if (depth <= 1 || fits(fitted.run)) return { zoomY, fitted }
  }
}

// see FR-055, S-177
/** @purity pure */
function fittedLeftEdge(
  chosen: ScheduleLayout,
  margin: number,
): { readonly day: CalendarDay; readonly offset: number } | null {
  if (chosen.contentX0 === null || !(chosen.pxPerDay > 0)) return null
  const leftX = chosen.contentX0 - margin
  const day = dateAtX(chosen, leftX)
  if (day === null) return null
  const into = (leftX - xFromDay(chosen, day)) / chosen.pxPerDay
  return { day, offset: into > 0 && into < 1 ? into : 0 }
}

// see FR-055, S-332
// DEVIATION: spec clamps both axes to S-75/S-76 (FR-016); here only zoomX is (DFC-726)
/** @purity pure */
export function fitZoom(
  schedule: Schedule,
  settings: DocumentSettings,
  regions: ScreenRegions,
  zoom: NotStoredZoom,
  rowControlsHeightPx?: number,
): FitToScreen {
  const floorZoomY = zoomYAtPlanHeightFloor(settings)
  const deepest = deepestDrawnDepth(schedule, settings)
  const runAt = (zoomX: number, zoomY: number, cap: number): ScheduleLayout =>
    layoutFromSchedule(
      schedule, { ...settings, zoomX, zoomY }, regions, cap, undefined, rowControlsHeightPx,
    )

  const atUnity = runAt(1, floorZoomY, deepest)
  if (atUnity.rows.length === 0 && atUnity.stackSafetyCapReached === null) {
    const { scrollDate, scrollGroupId } = settings
    return { zoomX: 1, zoomY: 1, scrollDate, scrollDayOffset: 0, scrollGroupId, floorZoomY }
  }
  const margin = regions.rowArea.width * NOT_STORED_FIT_MARGIN['S-332']
  const room = regions.rowArea.width - FIT_MARGIN_SIDES * margin
  const from = atUnity.contentWidth <= 0 ? 1 : clampedZoom(room / atUnity.contentWidth, zoom)
  const fits = (run: ScheduleLayout): boolean => fitsRowArea(run, regions)
  const landed = landedFit(
    deepestFittingDepth(deepest, (cap) => runAt(from, floorZoomY, cap), fits),
    (depth) => landingZoomY(depth, settings, zoom.step),
    (depth, zoomY) =>
      widthFittedRun((zoomX) => runAt(zoomX, Math.max(zoomY, floorZoomY), depth), from, room, zoom),
    fits,
  )
  const chosen = landed.fitted.run
  const left = fittedLeftEdge(chosen, margin)
  return {
    zoomX: landed.fitted.zoomX,
    zoomY: landed.zoomY,
    scrollDate: left === null ? settings.scrollDate : textOfDay(left.day),
    scrollDayOffset: left === null ? 0 : left.offset,
    scrollGroupId:
      chosen.rows.find((row) => row.isPinned !== true)?.groupId ?? settings.scrollGroupId,
    floorZoomY,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_FIT_MARGIN: {
  readonly 'S-332': number
} = {
  'S-332': 0.025,
}
// </generated>

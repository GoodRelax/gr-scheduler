// SingleHtmlShell frame loop -- keeps the vertical-zoom ceiling (FR-016) while an input leaves every band unchanged.
// @unit      UF-167  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  taskGroupBandCeilingOf,
  type InputContext,
} from '../../adapter/input-command-translator/input-command-translator'

/** @purity pure */
function isSameBandSettings(a: DocumentSettings, b: DocumentSettings): boolean {
  if (a === b) return true
  // WHY: the scroll place moves every task group and every x alike, so no band changes height; a zoom
  // at the pointer rewrites scrollDayOffset in its last digits on every notch.
  const moveWithoutBand = new Set<string>([
    'zoomY', 'scrollDate', 'scrollDayOffset', 'scrollGroupId', 'scrollGroupOffset',
  ])
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (moveWithoutBand.has(key)) continue
    if ((a as unknown as Record<string, unknown>)[key] !==
        (b as unknown as Record<string, unknown>)[key]) return false
  }
  return true
}

interface HeldCeiling {
  readonly schedule: Document['schedule']
  readonly settings: DocumentSettings
  readonly drawnZoomX: number
  readonly taskGroupArea: ScreenRect
  readonly taskGroupControlsHeightPx: number | undefined
  readonly zoomMin: number
  readonly zoomMax: number
  readonly upTo: number
  readonly enough: number
  readonly ceiling: number
}

/** @purity pure */
function isSameBand(held: HeldCeiling, context: InputContext, drawnZoomX: number, upTo: number): boolean {
  const taskGroupArea = context.regions.taskGroupArea
  return (
    held.upTo >= upTo &&
    held.schedule === context.document.schedule &&
    isSameBandSettings(held.settings, context.document.documentSettings) &&
    held.drawnZoomX === drawnZoomX &&
    held.taskGroupArea.x === taskGroupArea.x &&
    held.taskGroupArea.y === taskGroupArea.y &&
    held.taskGroupArea.width === taskGroupArea.width &&
    held.taskGroupArea.height === taskGroupArea.height &&
    held.taskGroupControlsHeightPx === context.taskGroupControlsHeightPx &&
    held.zoomMin === context.zoomMin &&
    held.zoomMax === context.zoomMax
  )
}

// see FR-016, DFC-2314
// WHY: one zoom notch asks at the drawn zoomX and at the zoomX of each step it may take; one held
// answer was replaced by the next zoomX on every ask, so the band was solved again every frame.
const HELD_ZOOM_X_COUNT = 4

/** @purity non-pure */
export function taskGroupBandCeilingCacheOf() {
  // see FR-016
  // TRAP: keyed on all the band is laid out from but zoomY and the scroll place; the zoomX is
  // the one the translator measures at, never the stored zoomX, which OP-10 may not draw.
  let bandCeilingsFrom: readonly HeldCeiling[] = []

  /** @purity non-pure */
  function bandCeilingFor(
    context: InputContext,
    drawnZoomX: number,
    upTo: number,
    enough: number = Number.POSITIVE_INFINITY,
  ): number {
    const held = bandCeilingsFrom.find((one) => isSameBand(one, context, drawnZoomX, upTo))
    // WHY: a ceiling at or above what it was asked for is only a lower bound; asked for more, the
    // walk runs again at the held upTo, so the answer is the one an exact entry would have given.
    if (held !== undefined && (held.ceiling < held.enough || enough <= held.ceiling)) return held.ceiling
    const walkedUpTo = held !== undefined ? held.upTo : upTo
    const ceiling = taskGroupBandCeilingOf(context, walkedUpTo, enough)
    const others = bandCeilingsFrom.filter((one) => one !== held).slice(0, HELD_ZOOM_X_COUNT - 1)
    bandCeilingsFrom = [heldCeilingOf(context, drawnZoomX, walkedUpTo, enough, ceiling), ...others]
    return ceiling
  }

  return { bandCeilingFor }
}

/** @purity pure */
function heldCeilingOf(
  context: InputContext,
  drawnZoomX: number,
  upTo: number,
  enough: number,
  ceiling: number,
): HeldCeiling {
  return {
    schedule: context.document.schedule,
    settings: context.document.documentSettings,
    drawnZoomX,
    taskGroupArea: context.regions.taskGroupArea,
    taskGroupControlsHeightPx: context.taskGroupControlsHeightPx,
    zoomMin: context.zoomMin,
    zoomMax: context.zoomMax,
    upTo,
    enough,
    ceiling,
  }
}

export type TaskGroupBandCeilingCache = ReturnType<typeof taskGroupBandCeilingCacheOf>

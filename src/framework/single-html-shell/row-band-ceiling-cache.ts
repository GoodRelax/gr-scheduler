// SingleHtmlShell frame loop -- keeps the row-zoom ceiling (FR-016) while an input leaves every band unchanged.
// @unit      UF-167  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  rowBandCeilingOf,
  type InputContext,
} from '../../adapter/input-command-translator/input-command-translator'

/** @purity pure */
function isSameBandSettings(a: DocumentSettings, b: DocumentSettings): boolean {
  if (a === b) return true
  // WHY: the scroll place moves every row and every x alike, so no band changes height; a zoom
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
  readonly rowArea: ScreenRect
  readonly rowControlsHeightPx: number | undefined
  readonly zoomMin: number
  readonly zoomMax: number
  readonly upTo: number
  readonly enough: number
  readonly ceiling: number
}

/** @purity pure */
function isSameBand(held: HeldCeiling, context: InputContext, drawnZoomX: number, upTo: number): boolean {
  const rowArea = context.regions.rowArea
  return (
    held.upTo >= upTo &&
    held.schedule === context.document.schedule &&
    isSameBandSettings(held.settings, context.document.documentSettings) &&
    held.drawnZoomX === drawnZoomX &&
    held.rowArea.x === rowArea.x &&
    held.rowArea.y === rowArea.y &&
    held.rowArea.width === rowArea.width &&
    held.rowArea.height === rowArea.height &&
    held.rowControlsHeightPx === context.rowControlsHeightPx &&
    held.zoomMin === context.zoomMin &&
    held.zoomMax === context.zoomMax
  )
}

/** @purity non-pure */
export function rowBandCeilingCacheOf() {
  // see FR-016
  // TRAP: keyed on all the band is laid out from but zoomY and the scroll place; the zoomX is
  // the one the translator measures at, never the stored zoomX, which OP-10 may not draw.
  let bandCeilingFrom: HeldCeiling | null = null

  /** @purity non-pure */
  function bandCeilingFor(
    context: InputContext,
    drawnZoomX: number,
    upTo: number,
    enough: number = Number.POSITIVE_INFINITY,
  ): number {
    const held = bandCeilingFrom
    const same = held !== null && isSameBand(held, context, drawnZoomX, upTo)
    // WHY: a ceiling at or above what it was asked for is only a lower bound; asked for more, the
    // walk runs again at the held upTo, so the answer is the one an exact entry would have given.
    if (same && (held.ceiling < held.enough || enough <= held.ceiling)) return held.ceiling
    const walkedUpTo = same ? held.upTo : upTo
    const ceiling = rowBandCeilingOf(context, walkedUpTo, enough)
    bandCeilingFrom = {
      schedule: context.document.schedule,
      settings: context.document.documentSettings,
      drawnZoomX,
      rowArea: context.regions.rowArea,
      rowControlsHeightPx: context.rowControlsHeightPx,
      zoomMin: context.zoomMin,
      zoomMax: context.zoomMax,
      upTo: walkedUpTo,
      enough,
      ceiling,
    }
    return ceiling
  }

  return { bandCeilingFor }
}

export type RowBandCeilingCache = ReturnType<typeof rowBandCeilingCacheOf>

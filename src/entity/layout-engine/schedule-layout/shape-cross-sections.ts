// ScheduleLayout -- each shape's vertical cross-section at the vertical zoom (table T-271).
// @unit      UF-137  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { displayRatioOf, drawnSettingsOf } from '../screen-regions/screen-regions'
import { NOT_STORED_LABEL_SIZES, type ShapeKind } from './schedule-layout'

// see XS-5, XS-6
/** @purity pure */
export function thinEndHalfHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return (shapeKind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// see T-012, XS-5, XS-6
/** @purity pure */
export function shapeHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  if (!laidBelow(shapeKind)) return planHeightOf(shapeKind, settings)
  const stroke = settings.thinStrokeWidth
  return stroke + settings.actualGap + stroke / 2 + thinEndHalfHeightOf(shapeKind, settings)
}

// see OC-10, XS-4
// TRAP: the tier is the font size, never S-233; that ratio moves every stacked row.
/** @purity pure */
export function labelLiftOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  if (!laidBelow(shapeKind)) return 0
  return (
    labelFontSize(shapeKind, settings) +
    NOT_STORED_LABEL_SIZES['S-196'] * displayRatioOf(settings)
  )
}

/** @purity pure */
function reservedHeight(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return labelLiftOf(shapeKind, settings) + shapeHeightOf(shapeKind, settings)
}

/** @purity pure */
export function drawnEdgeOverhangOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return laidBelow(shapeKind) ? 0 : settings.planStroke / 2
}

/** @purity pure */
export function drawnExtentOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  return reservedHeight(shapeKind, settings) + drawnEdgeOverhangOf(shapeKind, settings) * 2
}

/** @purity pure */
export function laidBelow(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

/** @purity pure */
export function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return laidBelow(shapeKind) ? 'below' : 'inside'
}

/** @purity pure */
export function actualReachOf(
  shapeKind: ShapeKind,
  actual: { readonly x: number; readonly width: number },
  settings: DocumentSettings,
): number {
  if (actualPlacementOf(shapeKind) !== 'sideways') return actual.x + actual.width
  return actual.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
}

// TRAP: the one spelling of this floor; a second can land an ulp off the zoom the fit lands on.
/** @purity pure */
function planHeightFloor(settings: DocumentSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/** @purity pure */
export function zoomYAtPlanHeightFloor(settings: DocumentSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

// see FR-094
/** @purity pure */
export function planHeightOf(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
}

// see FR-094
/** @purity pure */
export function markerDiameterOf(shapeKind: ShapeKind, nameFontSize: number,
                                 settings: DocumentSettings): number {
  return laidBelow(shapeKind) ? nameFontSize : settings.markerSize
}

// see FR-077, FR-094
/** @purity pure */
export function labelFontSize(shapeKind: ShapeKind, settings: DocumentSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = laidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

// see FR-016, FR-077, FR-094, PI-5, T-252, DS-1
// WHY: the largest of three: below either floor the name does not grow, so the floor's release answers.
/** @purity pure */
export function zoomYAtRectangleLabelFont(fontPx: number, storedSettings: DocumentSettings): number {
  const settings = drawnSettingsOf(storedSettings)
  const fontPerZoom = settings.basePlanHeight * settings.shapeHeightOf.rectangle *
    settings.actualOfPlan * settings.fontOfActual
  return Math.max(fontPx / fontPerZoom, zoomYAtPlanHeightFloor(settings), settings.fontMin / fontPerZoom)
}

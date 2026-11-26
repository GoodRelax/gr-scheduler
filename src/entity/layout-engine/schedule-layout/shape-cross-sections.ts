// File: ScheduleLayout: each shape's vertical cross-section at the vertical zoom (table T-271).
// @unit      UF-137  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings, DrawnSettings } from '../../document-model/document-settings/document-settings'
import { displayRatioOf, drawnSettingsOf } from '../screen-regions/screen-regions'
import { NOT_STORED_LABEL_SIZES, type ShapeKind } from './schedule-layout'

// Spec: XS-5, XS-6
/** @purity pure */
export function thinEndHalfHeightOf(shapeKind: ShapeKind, settings: DrawnSettings): number {
  return (shapeKind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// Spec: T-012, XS-5, XS-6, IMPS-1681, IMPS-1684, IMPS-1697, IMPS-1700
/** @purity pure */
export function shapeHeightOf(shapeKind: ShapeKind, settings: DrawnSettings): number {
  if (!isLaidBelow(shapeKind)) return planHeightOf(shapeKind, settings)
  const stroke = settings.thinStrokeWidth
  return stroke + settings.actualGap + stroke / 2 + thinEndHalfHeightOf(shapeKind, settings)
}

// Spec: OC-10, XS-4, IMPS-1697, IMPS-1704, IMPS-1705
// Trap: the tier is the font size, never S-233; that ratio moves every stacked task group.
/** @purity pure */
export function labelLiftOf(shapeKind: ShapeKind, settings: DrawnSettings): number {
  if (!isLaidBelow(shapeKind)) return 0
  return (
    labelFontSize(shapeKind, settings) +
    NOT_STORED_LABEL_SIZES['S-196'] * displayRatioOf(settings)
  )
}

/** @purity pure */
function reservedHeight(shapeKind: ShapeKind, settings: DrawnSettings): number {
  return labelLiftOf(shapeKind, settings) + shapeHeightOf(shapeKind, settings)
}

// Spec: AT-104, CL-2, VG-5, S-39
// Why: a task's own outline width takes the display ratio S-39 takes (FR-039); null draws S-39 itself.
/** @purity pure */
export function outlineWidthOf(strokeWidthPx: number | null | undefined, settings: DrawnSettings): number {
  if (strokeWidthPx === null || strokeWidthPx === undefined) return settings.planStroke
  return strokeWidthPx * displayRatioOf(settings)
}

// Spec: VG-5, IMPS-1703
/** @purity pure */
export function drawnEdgeOverhangOf(shapeKind: ShapeKind, outlineWidth: number): number {
  return isLaidBelow(shapeKind) ? 0 : outlineWidth / 2
}

/** @purity pure */
export function drawnExtentOf(
  shapeKind: ShapeKind,
  settings: DrawnSettings,
  outlineWidth: number = settings.planStroke,
): number {
  return reservedHeight(shapeKind, settings) + drawnEdgeOverhangOf(shapeKind, outlineWidth) * 2
}

// Spec: IMPS-1687
/** @purity pure */
export function isLaidBelow(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

// Spec: IMPS-398
/** @purity pure */
export function actualPlacementOf(shapeKind: ShapeKind): 'inside' | 'below' | 'sideways' {
  if (shapeKind === 'milestone') return 'sideways'
  return isLaidBelow(shapeKind) ? 'below' : 'inside'
}

/** @purity pure */
export function actualReachOf(
  shapeKind: ShapeKind,
  actual: { readonly x: number; readonly width: number },
  settings: DrawnSettings,
): number {
  if (actualPlacementOf(shapeKind) !== 'sideways') return actual.x + actual.width
  return actual.x + (planHeightOf(shapeKind, settings) * settings.actualOfPlan) / 2
}

// Trap: the one spelling of this floor; a second can land an ulp off the zoom the fit lands on.
/** @purity pure */
function planHeightFloor(settings: DrawnSettings): number {
  return settings.actualMin / settings.actualOfPlan
}

/** @purity pure */
export function zoomYAtPlanHeightFloor(settings: DrawnSettings): number {
  return planHeightFloor(settings) / settings.basePlanHeight
}

// Spec: FR-094, IMPS-1898, DS-8
/** @purity pure */
export function planHeightOf(shapeKind: ShapeKind, settings: DrawnSettings): number {
  const ratio = settings.shapeHeightOf[shapeKind]
  return Math.max(planHeightFloor(settings), settings.basePlanHeight * settings.zoomY) * ratio
}

// Spec: FR-094, IMPS-1897, IMPS-1900
/** @purity pure */
export function markerDiameterOf(shapeKind: ShapeKind, nameFontSize: number,
                                 settings: DrawnSettings): number {
  return isLaidBelow(shapeKind) ? nameFontSize : settings.markerSize
}

// Spec: FR-077, FR-094, IMPS-1899, IMPS-800, IMPS-802
/** @purity pure */
export function labelFontSize(shapeKind: ShapeKind, settings: DrawnSettings): number {
  const actual = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  const scale = isLaidBelow(shapeKind) ? settings.thinFontScale : 1
  return Math.max(settings.fontMin, actual * settings.fontOfActual * scale)
}

// Spec: FR-016, FR-077, FR-094, PI-5, T-252, DS-1, IMPS-1470, IMPS-1471, IMPS-1473, IMPS-1472, IMPS-800
// Why: the largest of three: below either floor the name does not grow, so the floor's release answers.
/** @purity pure */
export function zoomYAtRectangleLabelFont(fontPx: number, storedSettings: DocumentSettings): number {
  const settings = drawnSettingsOf(storedSettings)
  const fontPerZoom = settings.basePlanHeight * settings.shapeHeightOf.rectangle *
    settings.actualOfPlan * settings.fontOfActual
  return Math.max(fontPx / fontPerZoom, zoomYAtPlanHeightFloor(settings), settings.fontMin / fontPerZoom)
}

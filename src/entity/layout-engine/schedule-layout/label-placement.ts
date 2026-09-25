// ScheduleLayout -- where the labels go: the reference, the name, the marker and the assignee (FR-109).
// @unit      UF-140  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleLayout, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import { planActualState, type Task } from '../../document-model/schedule/schedule'
import { dummyInkWidthOf, type ShapeKind } from './schedule-layout'
import { actualPlacementOf, laidBelow, planHeightOf } from './shape-cross-sections'

// see RF-1, RF-3
export interface LabelReference {
  readonly x: number
  readonly width: number
  readonly fitWidth: number
  readonly nameFloor: number
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
export interface LabelLayout {
  readonly fits: boolean
  readonly markerLeft: number | null
  readonly nameX: number
}

// see XS-10, GA-20
/** @purity pure */
export function standsUndecidedResume(task: Task, shapeKind: ShapeKind): boolean {
  return (
    shapeKind !== 'milestone' &&
    task.resume === null &&
    planActualState(task) === 'suspendedResumeUnknown'
  )
}

// see RF-1, RF-3
/** @purity pure */
export function labelReferenceOf(
  shapeKind: ShapeKind,
  plan: { readonly x: number; readonly width: number },
  fade: { readonly fadeIn: number; readonly fadeOut: number },
  actual: { readonly x: number; readonly width: number } | null,
  settings: DocumentSettings,
): LabelReference {
  const sideways = actualPlacementOf(shapeKind) === 'sideways'
  const side = planHeightOf(shapeKind, settings) * settings.actualOfPlan
  if (actual === null) {
    const flat = { x: plan.x, width: plan.width }
    return sideways
      ? { ...flat, fitWidth: plan.width, nameFloor: plan.x }
      : { ...flat, fitWidth: plan.width - fade.fadeIn - fade.fadeOut, nameFloor: plan.x + fade.fadeIn }
  }
  const band = sideways
    ? { x: actual.x - side / 2, width: side }
    : { x: actual.x, width: actual.width }
  return { ...band, fitWidth: band.width, nameFloor: band.x }
}

// see RF-1
/** @purity pure */
export function dummyBandOf(
  shapeKind: ShapeKind,
  plan: { readonly x: number; readonly width: number },
  markerDiameter: number,
): { readonly x: number; readonly width: number } {
  return actualPlacementOf(shapeKind) === 'sideways'
    ? { x: plan.x + plan.width / 2, width: 0 }
    : { x: plan.x, width: dummyInkWidthOf(markerDiameter) }
}

// see LP-2, LP-4, GA-20
/** @purity pure */
export function outwardStartOf(
  referenceEnd: number,
  task: Task,
  shapeKind: ShapeKind,
  markerDiameter: number,
): number {
  if (laidBelow(shapeKind) || !standsUndecidedResume(task, shapeKind)) return referenceEnd
  return referenceEnd + markerDiameter + NOT_STORED_SIZES['S-286']
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
/** @purity pure */
export function labelLayoutOf(
  shapeKind: ShapeKind,
  reference: LabelReference,
  textWidth: number,
  markerDiameter: number,
  marksShown: boolean,
  outwardStart: number,
  settings: DocumentSettings,
): LabelLayout {
  if (shapeKind === 'milestone') {
    const markerLeft = marksShown ? reference.x + reference.width : null
    const nameX = markerLeft === null
      ? reference.x + reference.width * settings.milestoneNameStartOfWidth
      : markerLeft + markerDiameter + settings.milestoneNameMarkerGap
    return { fits: true, markerLeft, nameX }
  }
  const lead = marksShown ? markerDiameter + settings.labelGap : settings.labelPad
  if (laidBelow(shapeKind)) {
    return {
      fits: true,
      markerLeft: marksShown ? reference.x : null,
      nameX: Math.max(reference.x + lead, reference.nameFloor),
    }
  }
  const fits = lead + textWidth + NOT_STORED_SIZES['S-260'] <= reference.fitWidth
  const outward = marksShown ? outwardStart : reference.x + reference.width
  const from = fits ? reference.x : outward
  return {
    fits,
    markerLeft: marksShown ? from : null,
    nameX: Math.max(from + lead, fits ? reference.nameFloor : from + lead),
  }
}

// see FR-109, OC-2
/** @purity pure */
export function assigneeAnchorOf(
  shapeKind: ShapeKind,
  reference: LabelReference,
  drawnStartX: number,
  settings: DocumentSettings,
): number {
  if (shapeKind === 'milestone') {
    return reference.x + reference.width * settings.milestoneNameStartOfWidth
  }
  return laidBelow(shapeKind) ? reference.x : drawnStartX
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_SIZES: {
  readonly 'S-250': number
  readonly 'S-251': number
  readonly 'S-252': number
  readonly 'S-253': number
  readonly 'S-254': number
  readonly 'S-255': number
  readonly 'S-256': number
  readonly 'S-257': number
  readonly 'S-258': number
  readonly 'S-259': number
  readonly 'S-260': number
  readonly 'S-261': number
  readonly 'S-262': number
  readonly 'S-263': number
  readonly 'S-264': number
  readonly 'S-265': number
  readonly 'S-266': number
  readonly 'S-267': number
  readonly 'S-268': number
  readonly 'S-269': number
  readonly 'S-270': number
  readonly 'S-271': number
  readonly 'S-272': number
  readonly 'S-273': number
  readonly 'S-274': number
  readonly 'S-275': number
  readonly 'S-276': number
  readonly 'S-277': number
  readonly 'S-278': number
  readonly 'S-279': number
  readonly 'S-280': number
  readonly 'S-281': number
  readonly 'S-282': number
  readonly 'S-283': number
  readonly 'S-284': number
  readonly 'S-285': number
  readonly 'S-286': number
  readonly 'S-287': number
  readonly 'S-288': number
  readonly 'S-289': number
  readonly 'S-290': number
  readonly 'S-137': number
  readonly 'S-230': number
  readonly 'S-293': number
  readonly 'S-291': number
  readonly 'S-292': number
} = {
  'S-250': 12,
  'S-251': 0,
  'S-252': 0,
  'S-253': 12,
  'S-254': 0,
  'S-255': 0,
  'S-256': 0,
  'S-257': 12,
  'S-258': 0,
  'S-259': 0,
  'S-260': 12,
  'S-261': 0,
  'S-262': 0,
  'S-263': 12,
  'S-264': 0,
  'S-265': 0,
  'S-266': 12,
  'S-267': 0,
  'S-268': 8,
  'S-269': 8,
  'S-270': 12,
  'S-271': 0,
  'S-272': 12,
  'S-273': 0,
  'S-274': 12,
  'S-275': 0,
  'S-276': 12,
  'S-277': 0,
  'S-278': 1.15,
  'S-279': 0,
  'S-280': 0,
  'S-281': 0,
  'S-282': 0,
  'S-283': 0,
  'S-284': 0,
  'S-285': 2,
  'S-286': 0,
  'S-287': 12,
  'S-288': 0,
  'S-289': 12,
  'S-290': 0,
  'S-137': 6,
  'S-230': 6,
  'S-293': 3,
  'S-291': 3,
  'S-292': 6,
}
// </generated>

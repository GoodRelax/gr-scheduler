/**
 * UseCase layer: the alignment constraint solver (ALIGN-L1-001 / ALIGN-L2-001).
 *
 * When an item is moved, the solver snaps its proposed position onto a nearby
 * shared baseline so that items starting on the same date line up on one vertical
 * baseline, and same-kind milestones share a lane/height. Snapping is "light":
 * it only engages within a small threshold and otherwise leaves the item at its
 * free position (verified by ALIGN-L2-001).
 *
 * The core snapper is a generic 1-D function so it can be applied to either axis
 * (start-date x baselines or lane-height y baselines). Pure and side-effect free;
 * the adapter supplies the candidate baselines it has collected from the model.
 */

import type { ScheduleItem } from '../model/schedule-model.js';
import { dateToWorldX } from './time-coordinate-mapper.js';

/** Default snap distance in CSS pixels. Small so snapping never feels sticky. */
export const DEFAULT_SNAP_THRESHOLD_PX = 6;

/** Result of a 1-D snap attempt. */
export interface SnapResult {
  /** The snapped value, or the unchanged proposed value when no baseline is near. */
  readonly value: number;
  /** True when a baseline within the threshold was found and applied. */
  readonly snapped: boolean;
  /** The baseline that was snapped to, or null when no snap occurred. */
  readonly baseline: number | null;
}

/**
 * Snap a proposed value to the nearest baseline within a threshold.
 *
 * @param proposed - The free (unsnapped) value, e.g. a candidate world x.
 * @param baselines - Candidate shared baselines to snap onto.
 * @param threshold - Maximum absolute distance at which snapping engages.
 * @returns The snapped value plus whether/where it snapped.
 */
export function snapToNearestBaseline(
  proposed: number,
  baselines: readonly number[],
  threshold: number = DEFAULT_SNAP_THRESHOLD_PX,
): SnapResult {
  let bestBaseline: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const baseline of baselines) {
    const distance = Math.abs(baseline - proposed);
    if (distance <= threshold && distance < bestDistance) {
      bestDistance = distance;
      bestBaseline = baseline;
    }
  }
  return bestBaseline === null
    ? { value: proposed, snapped: false, baseline: null }
    : { value: bestBaseline, snapped: true, baseline: bestBaseline };
}

/**
 * Collect the distinct start-date world-x baselines of every item except one.
 * These form the vertical alignment lines that "same start date" items share.
 *
 * @param items - All items in the document.
 * @param excludeItemId - The item being dragged (excluded from its own baselines).
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @returns Sorted, de-duplicated world-x baselines.
 */
export function collectStartDateBaselinesX(
  items: readonly ScheduleItem[],
  excludeItemId: string,
  epochDate: string,
  zoomX: number,
): number[] {
  const baselines = new Set<number>();
  for (const item of items) {
    if (item.id === excludeItemId) {
      continue;
    }
    baselines.add(dateToWorldX(item.startDate, epochDate, zoomX));
  }
  return [...baselines].sort((left, right) => left - right);
}

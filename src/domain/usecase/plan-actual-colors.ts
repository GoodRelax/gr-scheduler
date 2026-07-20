/**
 * UseCase layer: plan/actual display coloring.
 *
 * TODO(IM3): CR-002 Part 1 replaces the old fixed green(plan)/orange(actual) scheme
 * with a SATURATION-derived pair from the item's own base {@link ScheduleItem.fillColor}
 * (pale = plan, vivid = actual/progress) plus a line-WIDTH non-color redundancy code
 * (plan thin / actual thick; no dash). Until IM3 lands that logic, this module is
 * NEUTRALIZED: {@link displayFillColor} returns the item's own stored fill so the
 * canvas still renders in a single consistent color. The legacy
 * {@link PLAN_FILL_GREEN} / {@link ACTUAL_FILL_ORANGE} constants are retained only as
 * references for the IM3 restoration and are no longer applied.
 *
 * Pure and side-effect free.
 */

import type { ScheduleItem } from '../model/schedule-model.js';

/** TODO(IM3): legacy PLAN fill (green); retained for reference, no longer applied. */
export const PLAN_FILL_GREEN = '#2f9e5b';

/** TODO(IM3): legacy ACTUAL fill (orange); retained for reference, no longer applied. */
export const ACTUAL_FILL_ORANGE = '#e07c1a';

/**
 * The fill an item is drawn with on the canvas.
 *
 * TODO(IM3): restore CR-002 saturation-derived plan/actual coloring. For IM1 this is
 * neutralized to the item's own stored fill (the actual-date model no longer carries a
 * plan/actual discriminator; the Overlap saturation split is deferred to IM3).
 *
 * @param item - The item to color.
 * @returns The item's own stored {@link ScheduleItem.fillColor}.
 */
export function displayFillColor(item: Pick<ScheduleItem, 'fillColor'>): string {
  return item.fillColor;
}

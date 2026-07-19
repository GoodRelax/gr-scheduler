/**
 * UseCase layer: plan/actual display coloring (property-driven).
 *
 * The fill an item is DRAWN with on the canvas is derived from its
 * {@link ScheduleItem.planActualKind} PROPERTY -- never by parsing a category
 * name or label text:
 *
 * - `plan`   -> {@link PLAN_FILL_GREEN}
 * - `actual` -> {@link ACTUAL_FILL_ORANGE}
 * - neither  -> the item's own stored {@link ScheduleItem.fillColor}
 *
 * This is a purely presentational mapping: it does NOT mutate the stored
 * `fillColor`, so import validation, JSON round-trips and the property panel keep
 * seeing the document's own color while the canvas shows the plan/actual hue.
 * Green (plan) vs orange (actual) is paired with the non-color stroke-dash encoding
 * ({@link planActualStrokeDashArray}) so the two sides stay distinguishable for
 * color-blind users and in grayscale (WCAG 1.4.1).
 *
 * Pure and side-effect free.
 */

import type { ScheduleItem } from '../model/schedule-model.js';

/**
 * Fill for a PLAN item (green). A mid-tone green whose luminance is close to the
 * existing CUD palette so the #1a1a1a item label keeps its legibility (WCAG 1.4.3),
 * and clearly separated in hue from the actual orange for the paired display.
 */
export const PLAN_FILL_GREEN = '#2f9e5b';

/**
 * Fill for an ACTUAL item (orange). Chosen to read as distinct from the plan green
 * for the common protan/deutan color-vision deficiencies (green vs orange, not the
 * unsafe red vs green), and to keep the label legible on top of the bar.
 */
export const ACTUAL_FILL_ORANGE = '#e07c1a';

/**
 * The fill an item is drawn with, driven by its plan/actual PROPERTY.
 *
 * @param item - The item to color.
 * @returns The green (plan) / orange (actual) display fill, or the item's own
 *   stored fill when it carries no plan/actual semantics.
 */
export function displayFillColor(item: Pick<ScheduleItem, 'planActualKind' | 'fillColor'>): string {
  if (item.planActualKind === 'plan') {
    return PLAN_FILL_GREEN;
  }
  if (item.planActualKind === 'actual') {
    return ACTUAL_FILL_ORANGE;
  }
  return item.fillColor;
}

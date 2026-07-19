/**
 * UseCase layer: level-of-detail (LOD) selector (ARCH-C-010, ADR-005).
 *
 * Each item carries an `importance` weight in [0, 1]. Given the current zoom,
 * a visibility threshold is derived: an item is shown only when its importance
 * meets or exceeds the threshold. The threshold is monotonic in zoom -- zooming
 * out (smaller zoom) raises the threshold, so the visible set never grows as the
 * user zooms out. This guarantees a stable, non-arbitrary decluttering.
 *
 * Pure and side-effect free.
 */

import type { ScheduleItem } from '../model/schedule-model.js';

/**
 * Compute the importance threshold at a given effective zoom.
 *
 * threshold(zoom) = 1 / (1 + zoom), which is strictly decreasing in zoom:
 * - zoom -> 0     => threshold -> 1 (only the most important items survive)
 * - zoom -> +Inf  => threshold -> 0 (everything is shown)
 *
 * @param effectiveZoom - Non-negative effective zoom (e.g. min(zoomX, zoomY)).
 * @returns Visibility threshold in (0, 1].
 */
export function lodThreshold(effectiveZoom: number): number {
  const zoom = Math.max(0, effectiveZoom);
  return 1 / (1 + zoom);
}

/**
 * Decide whether a single item passes the LOD filter at the current zoom.
 *
 * @param importance - Item importance weight in [0, 1].
 * @param effectiveZoom - Effective zoom used for the threshold.
 * @returns True when the item should be rendered.
 */
export function isVisibleAtZoom(importance: number, effectiveZoom: number): boolean {
  return importance >= lodThreshold(effectiveZoom);
}

/**
 * Filter items to those that pass the LOD threshold at the current zoom.
 *
 * @param items - Candidate items (already viewport-culled by the caller).
 * @param effectiveZoom - Effective zoom used for the threshold.
 * @returns The subset of items that should be rendered.
 */
export function selectItemsByLod(
  items: readonly ScheduleItem[],
  effectiveZoom: number,
): ScheduleItem[] {
  const threshold = lodThreshold(effectiveZoom);
  return items.filter((item) => item.importance >= threshold);
}

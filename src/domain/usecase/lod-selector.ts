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

/**
 * Item-count ceiling below which a document is "small" enough that BOTH LOD culling
 * and viewport virtualization are bypassed: every item is rendered regardless of zoom
 * or scroll, so a small schedule always shows a complete overview.
 *
 * Rationale (startup-Fit under-render fix): the whole-schedule Fit resolves a very
 * small zoom for a multi-year span (e.g. zoomX ~= 0.13), at which the LOD threshold
 * `1 / (1 + zoom)` rises above ~0.88. With the fit not yet applied the view sits at
 * the default zoom = 1 and scroll = 0, where the (correct) viewport virtualization
 * culls every item past the first screen -- so a small schedule that should be fully
 * framed instead shows only its earliest items. Because a small document is never the
 * performance concern (the RISK-001 / ADR-009 virtualization exists for the ~1000-item
 * benchmark), rendering all of its items unconditionally is both safe and the robust
 * fix: the overview is always complete, independent of when Fit lands. The cap sits
 * well under the benchmark size, so large schedules keep the bounded live-node set.
 */
export const LOD_FULL_RENDER_ITEM_CAP = 200;

/**
 * Whether a document with `totalItemCount` items should render in FULL -- no LOD
 * threshold culling and no viewport virtualization -- so a small schedule always
 * shows every item (see {@link LOD_FULL_RENDER_ITEM_CAP}).
 *
 * @param totalItemCount - The document's total item count (before any culling).
 * @returns True when every item should be rendered regardless of zoom / scroll.
 */
export function shouldRenderAllItems(totalItemCount: number): boolean {
  return totalItemCount <= LOD_FULL_RENDER_ITEM_CAP;
}

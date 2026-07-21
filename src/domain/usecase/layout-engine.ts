/**
 * UseCase layer: multi-bar row layout (ARCH-C-011). Places multiple items on a
 * single row's y-band without overlap by stacking time-overlapping items into
 * separate sub-lanes. The row y is derived from the row index under zoomY,
 * keeping the vertical axis independent from the horizontal (anisotropic).
 *
 * Pure and side-effect free.
 */

import type { Row, ScheduleItem, ViewState } from '../model/schedule-model.js';
import { dateToWorldX } from './time-coordinate-mapper.js';

/** Base row band height in CSS pixels at zoomY = 1. */
export const BASE_ROW_HEIGHT = 44;

/** Vertical padding reserved above/below the lanes inside a row band. */
export const ROW_VERTICAL_PADDING = 4;

/** Height of a single sub-lane within a row band at zoomY = 1. */
export const BASE_LANE_HEIGHT = 18;

/** Placement of one item within the layout, in world-space pixels. */
export interface ItemPlacement {
  readonly itemId: string;
  readonly rowId: string;
  /** Sub-lane index within the row band (0 = top). */
  readonly laneIndex: number;
  /** World-space left x (start date). */
  readonly worldX: number;
  /** World-space rendered width (>= minimum glyph width). */
  readonly worldWidth: number;
  /** World-space top y of the item's lane. */
  readonly worldY: number;
  /** Rendered height of the item's lane. */
  readonly worldHeight: number;
}

/** Effective row band height under the current vertical zoom. */
export function rowBandHeight(zoomY: number): number {
  return BASE_ROW_HEIGHT * zoomY;
}

/**
 * World-space top y of a row band given its stacking index.
 *
 * @param rowIndex - Zero-based index of the row in vertical order.
 * @param zoomY - Vertical zoom multiplier.
 * @returns World y in CSS pixels.
 */
export function rowWorldY(rowIndex: number, zoomY: number): number {
  return rowIndex * rowBandHeight(zoomY);
}

/** Minimum rendered width so a zero/short-duration bar stays clickable. */
const MIN_ITEM_WIDTH = 8;

/**
 * Maximum stacked sub-lanes a single category row grows to accommodate
 * time-overlapping items (raised from the earlier implicit 2 that the fixed
 * {@link BASE_ROW_HEIGHT} band allowed). Rows with more overlapping items grow
 * their band height so up to this many lanes are fully visible; overlap beyond the
 * cap reuses the last lane rather than growing the band unbounded.
 */
export const MAX_STACK_LANES = 64;

/**
 * Fraction of a lane's height a stacked bar/glyph occupies. The ~10% gap leaves a
 * clearly visible boundary between two vertically-stacked items in the same lane band
 * so adjacent stacked rectangles never look fused -- widened from 0.95 to 0.90 so a
 * bar's own border no longer makes neighbours look cramped/overlapping (item: 90%
 * stacked bar height). Applied to every item so single-lane and multi-lane rows look
 * consistent.
 */
export const STACKED_BAR_HEIGHT_RATIO = 0.9;

/**
 * Estimate the RIGHTWARD pixel extent, measured from an item's start x, occupied by
 * its label (CR-003 Part 2 collision avoidance). Returns 0 for an item whose label
 * does not overflow to the right. Supplied by the adapter (which owns font metrics)
 * so the pure engine stays free of text measurement; absent in the pure default path
 * so existing callers keep the exact prior layout.
 *
 * @param item - The item whose label extent to estimate.
 * @param barHeightPx - The item's rendered bar height (sizes the font).
 * @returns The label's rightward extent in px from the item's start x.
 */
export type ItemLabelExtentEstimator = (item: ScheduleItem, barHeightPx: number) => number;

/**
 * Compute the total number of distinct start-to-end intervals that overlap; used
 * internally to assign non-overlapping lanes greedily. When a label-extent estimator
 * is provided (CR-003 Part 2), each item's OCCUPIED right edge includes its overflowing
 * label, so a later item whose bar starts inside an earlier item's label overflow is
 * pushed into a new (lower) lane -- the minimal deterministic vertical offset that
 * clears the label collision within the row's section band.
 */
function assignLanes(
  rowItems: readonly ScheduleItem[],
  epochDate: string,
  zoomX: number,
  barHeightPx: number,
  labelExtent?: ItemLabelExtentEstimator,
): Map<string, number> {
  // Sort by start x so a greedy sweep can reuse freed lanes. Ties break by id so the
  // "later" (higher-id / later-authored) colliding item is the one shifted down,
  // keeping the pass deterministic (CR-003 Part 2 recommended-spec choice).
  const sorted = [...rowItems].sort((left, right) => {
    const leftX = dateToWorldX(left.startDate, epochDate, zoomX);
    const rightX = dateToWorldX(right.startDate, epochDate, zoomX);
    return leftX !== rightX ? leftX - rightX : left.id.localeCompare(right.id);
  });
  const laneEndX: number[] = [];
  const laneByItemId = new Map<string, number>();

  for (const item of sorted) {
    const startX = dateToWorldX(item.startDate, epochDate, zoomX);
    const endIso = item.endDate ?? item.startDate;
    const barEndX = Math.max(dateToWorldX(endIso, epochDate, zoomX), startX + MIN_ITEM_WIDTH);
    // Extend the occupied right edge by any overflowing label so a colliding later
    // item is bumped to a new lane rather than drawn under the label.
    const labelEndX = startX + (labelExtent?.(item, barHeightPx) ?? 0);
    const endX = Math.max(barEndX, labelEndX);

    let assignedLane = -1;
    for (let lane = 0; lane < laneEndX.length; lane += 1) {
      const laneEnd = laneEndX[lane];
      if (laneEnd !== undefined && startX >= laneEnd) {
        assignedLane = lane;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = laneEndX.length;
      laneEndX.push(endX);
    } else {
      laneEndX[assignedLane] = endX;
    }
    laneByItemId.set(item.id, assignedLane);
  }
  // CR-004 Part 1 (ALIGN-L2-004): stack sub-lanes from the BOTTOM UP rather than the
  // top down. The greedy pass above assigns lane 0 to the earliest-placed item; we
  // then FLIP every index so that earliest-placed item sinks to the LOWEST (bottom)
  // sub-lane and later/colliding items (typically milestones and label-bumped bars)
  // rise to the TOPMOST sub-lane. This is a bijection over a row's lane indices, so
  // non-overlap within a lane is preserved and only the assignment ORIGIN flips --
  // the up/down/left/right alignment and the ALIGN-L2-003 label-overflow offset are
  // otherwise unchanged. A single-lane row is untouched.
  const laneCount = laneEndX.length;
  if (laneCount > 1) {
    for (const [itemId, lane] of laneByItemId) {
      laneByItemId.set(itemId, laneCount - 1 - lane);
    }
  }
  return laneByItemId;
}

/** Number of sub-lanes a row's assigned lanes occupy (0 for an empty row). */
function laneCountOf(laneByItemId: ReadonlyMap<string, number>): number {
  let maxLane = -1;
  for (const lane of laneByItemId.values()) {
    if (lane > maxLane) {
      maxLane = lane;
    }
  }
  return maxLane + 1;
}

/**
 * Unscaled (zoomY = 1) band height in CSS pixels for a row that stacks
 * `laneCount` overlapping sub-lanes. A row grows past {@link BASE_ROW_HEIGHT} once
 * it needs more than the two lanes the base height fits, up to {@link MAX_STACK_LANES}.
 *
 * @param laneCount - Number of stacked sub-lanes the row uses (>= 0).
 * @returns The band height at unit vertical zoom.
 */
export function rowBandUnitHeight(laneCount: number): number {
  const lanes = Math.max(1, Math.min(MAX_STACK_LANES, laneCount));
  const stackedHeight = lanes * BASE_LANE_HEIGHT + 2 * ROW_VERTICAL_PADDING;
  return Math.max(BASE_ROW_HEIGHT, stackedHeight);
}

/**
 * Per-row vertical geometry once rows may have DIFFERENT heights (a row grows to
 * fit its stacked sub-lanes, item: multi-lane stacking to 64). `rowTops[i]` is the
 * world-space top of row `i`'s band and `rowHeights[i]` its height (both scaled by
 * zoomY); `totalHeight` is the world-space bottom of the last row.
 */
export interface RowGeometry {
  readonly rowTops: readonly number[];
  readonly rowHeights: readonly number[];
  readonly laneCounts: readonly number[];
  readonly totalHeight: number;
}

/** An empty geometry (no rows), used as a safe initial/fallback value. */
export const EMPTY_ROW_GEOMETRY: RowGeometry = {
  rowTops: [],
  rowHeights: [],
  laneCounts: [],
  totalHeight: 0,
};

/**
 * World-space top of a row's band, from variable-height geometry; falls back to
 * the uniform {@link rowWorldY} for an out-of-range index or empty geometry.
 */
export function rowTopAt(geometry: RowGeometry, rowIndex: number, zoomY: number): number {
  return geometry.rowTops[rowIndex] ?? rowWorldY(rowIndex, zoomY);
}

/**
 * World-space band height of a row, from variable-height geometry; falls back to
 * the uniform {@link rowBandHeight} for an out-of-range index or empty geometry.
 */
export function rowHeightAt(geometry: RowGeometry, rowIndex: number, zoomY: number): number {
  return geometry.rowHeights[rowIndex] ?? rowBandHeight(zoomY);
}

/**
 * World-space y of the BOUNDARY between row `index - 1` and row `index` under
 * variable-height geometry: `boundary(0) = 0`, `boundary(count) = totalHeight`.
 * Used to draw category gridlines / section-band tops / rounded-box edges so they
 * follow the taller rows.
 */
export function rowBoundaryY(geometry: RowGeometry, index: number, zoomY: number): number {
  const count = geometry.rowTops.length;
  if (count === 0) {
    return rowWorldY(index, zoomY);
  }
  if (index <= 0) {
    return 0;
  }
  if (index >= count) {
    return geometry.totalHeight + (index - count) * rowBandHeight(zoomY);
  }
  return geometry.rowTops[index] ?? rowWorldY(index, zoomY);
}

/**
 * Row index whose band contains world y under variable-height geometry, clamped to
 * `[0, count - 1]`. Replaces the uniform `floor(worldY / bandHeight)` so hit-test /
 * create / move target-row resolution follows the taller rows.
 */
export function rowIndexAtWorldY(geometry: RowGeometry, worldY: number, zoomY: number): number {
  const count = geometry.rowTops.length;
  if (count === 0) {
    return Math.max(0, Math.floor(worldY / rowBandHeight(zoomY)));
  }
  for (let index = 0; index < count; index += 1) {
    const top = geometry.rowTops[index] ?? 0;
    const height = geometry.rowHeights[index] ?? 0;
    if (worldY < top + height) {
      return Math.max(0, index);
    }
  }
  return count - 1;
}

/** The full layout result: per-item placements plus the row-band geometry. */
export interface LayoutResult {
  readonly placements: ItemPlacement[];
  readonly geometry: RowGeometry;
}

/**
 * Lay out every item into world-space placements AND compute the per-row band
 * geometry. Items sharing a row are stacked into non-overlapping lanes; a row that
 * needs more than two lanes grows its band height (item: multi-lane stacking) so
 * every stacked lane is visible and the following rows shift down to make room.
 * Each bar/glyph is {@link STACKED_BAR_HEIGHT_RATIO} of its lane height so the
 * boundary between stacked items is visible.
 *
 * @param items - All items to place.
 * @param rows - Rows in vertical order (index = stacking order).
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoomX (horizontal) and zoomY (vertical).
 * @returns The placements and the row geometry.
 */
export function layoutRows(
  items: readonly ScheduleItem[],
  rows: readonly Row[],
  epochDate: string,
  viewState: ViewState,
  labelExtent?: ItemLabelExtentEstimator,
): LayoutResult {
  const itemsByRow = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const bucket = itemsByRow.get(item.rowId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByRow.set(item.rowId, [item]);
    }
  }

  const laneHeight = BASE_LANE_HEIGHT * viewState.zoomY;
  const barHeight = laneHeight * STACKED_BAR_HEIGHT_RATIO;

  // First pass: assign lanes per row and accumulate variable band tops/heights so
  // a tall (multi-lane) row pushes the rows below it down.
  const laneByRow = new Map<string, Map<string, number>>();
  const rowTopById = new Map<string, number>();
  const rowTops: number[] = [];
  const rowHeights: number[] = [];
  const laneCounts: number[] = [];
  let cursorY = 0;
  for (const row of rows) {
    const rowItems = itemsByRow.get(row.id);
    const laneMap =
      rowItems === undefined || rowItems.length === 0
        ? new Map<string, number>()
        : assignLanes(rowItems, epochDate, viewState.zoomX, barHeight, labelExtent);
    laneByRow.set(row.id, laneMap);
    const laneCount = laneCountOf(laneMap);
    const height = rowBandUnitHeight(laneCount) * viewState.zoomY;
    rowTopById.set(row.id, cursorY);
    rowTops.push(cursorY);
    rowHeights.push(height);
    laneCounts.push(laneCount);
    cursorY += height;
  }
  const geometry: RowGeometry = { rowTops, rowHeights, laneCounts, totalHeight: cursorY };

  const placements: ItemPlacement[] = [];
  for (const [rowId, rowItems] of itemsByRow) {
    const rowTop = rowTopById.get(rowId);
    if (rowTop === undefined) {
      continue;
    }
    const bandTop = rowTop + ROW_VERTICAL_PADDING * viewState.zoomY;
    const laneByItemId =
      laneByRow.get(rowId) ??
      assignLanes(rowItems, epochDate, viewState.zoomX, barHeight, labelExtent);

    for (const item of rowItems) {
      const laneIndex = laneByItemId.get(item.id) ?? 0;
      const startX = dateToWorldX(item.startDate, epochDate, viewState.zoomX);
      const endIso = item.endDate ?? item.startDate;
      const rawWidth = dateToWorldX(endIso, epochDate, viewState.zoomX) - startX;
      placements.push({
        itemId: item.id,
        rowId,
        laneIndex,
        worldX: startX,
        worldWidth: Math.max(rawWidth, MIN_ITEM_WIDTH),
        worldY: bandTop + laneIndex * laneHeight,
        worldHeight: barHeight,
      });
    }
  }

  return { placements, geometry };
}

/**
 * Lay out every item into world-space placements (see {@link layoutRows}).
 *
 * @param items - All items to place.
 * @param rows - Rows in vertical order (index = stacking order).
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoomX (horizontal) and zoomY (vertical).
 * @returns One placement per item, keyed for renderer consumption.
 */
export function layoutItems(
  items: readonly ScheduleItem[],
  rows: readonly Row[],
  epochDate: string,
  viewState: ViewState,
  labelExtent?: ItemLabelExtentEstimator,
): ItemPlacement[] {
  return layoutRows(items, rows, epochDate, viewState, labelExtent).placements;
}

/**
 * Compute only the per-row band geometry (variable heights) without allocating the
 * item placements. Used by the left classification pane so its rows align with the
 * canvas rows even when a category row has grown to stack many overlapping items.
 *
 * @param items - All items (drives per-row lane counts).
 * @param rows - Rows in vertical order.
 * @param epochDate - Time-axis origin.
 * @param viewState - Provides zoomX (lane assignment) and zoomY (heights).
 * @returns The row geometry.
 */
export function computeRowGeometry(
  items: readonly ScheduleItem[],
  rows: readonly Row[],
  epochDate: string,
  viewState: ViewState,
  labelExtent?: ItemLabelExtentEstimator,
): RowGeometry {
  return layoutRows(items, rows, epochDate, viewState, labelExtent).geometry;
}

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
 * Compute the total number of distinct start-to-end intervals that overlap; used
 * internally to assign non-overlapping lanes greedily.
 */
function assignLanes(rowItems: readonly ScheduleItem[], epochDate: string, zoomX: number): Map<string, number> {
  // Sort by start x so a greedy sweep can reuse freed lanes.
  const sorted = [...rowItems].sort(
    (left, right) =>
      dateToWorldX(left.startDate, epochDate, zoomX) -
      dateToWorldX(right.startDate, epochDate, zoomX),
  );
  const laneEndX: number[] = [];
  const laneByItemId = new Map<string, number>();

  for (const item of sorted) {
    const startX = dateToWorldX(item.startDate, epochDate, zoomX);
    const endIso = item.endDate ?? item.startDate;
    const endX = Math.max(dateToWorldX(endIso, epochDate, zoomX), startX + MIN_ITEM_WIDTH);

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
  return laneByItemId;
}

/**
 * Lay out every item into world-space placements. Items sharing a row are
 * stacked into non-overlapping lanes; items on different rows use the row index
 * for their y band.
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
): ItemPlacement[] {
  const rowIndexById = new Map<string, number>();
  rows.forEach((row, index) => rowIndexById.set(row.id, index));

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
  const placements: ItemPlacement[] = [];

  for (const [rowId, rowItems] of itemsByRow) {
    const rowIndex = rowIndexById.get(rowId);
    if (rowIndex === undefined) {
      continue;
    }
    const bandTop = rowWorldY(rowIndex, viewState.zoomY) + ROW_VERTICAL_PADDING;
    const laneByItemId = assignLanes(rowItems, epochDate, viewState.zoomX);

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
        worldHeight: laneHeight,
      });
    }
  }

  return placements;
}

/**
 * UseCase layer: plan/actual diff + illuminated (progress) line builder
 * (ARCH-C-014). All functions are pure and side-effect free.
 *
 * Three responsibilities:
 * 1. {@link filterByPlanActualDisplay} - pick the visible item subset for the
 *    plan-only / actual-only / both toggle (PLAN-L1-002).
 * 2. {@link buildIlluminatedLine} - build the zigzag progress-line vertices from
 *    a base date and each row's actual progress front (PLAN-L1-003 / L2-001).
 *    The line is a PLAIN polyline: this builder returns only vertices, and the
 *    renderer draws them with no terminal-emphasis dots (mock feedback).
 * 3. {@link collectPreviousPlanGhosts} - list the pre-change plan spans to draw
 *    as gray ghost bars (PLAN-L1-004).
 */

import type { IsoDate, PlanActualDisplay, ScheduleItem } from '../model/schedule-model.js';
import { dateToWorldX } from './time-coordinate-mapper.js';
import { rowBandHeight, rowWorldY } from './layout-engine.js';

/**
 * Select the items visible under a plan/actual display filter (PLAN-L1-002).
 *
 * TODO(IM2): the actual-date model has no per-item plan/actual discriminator, so the
 * `plan-only` / `actual-only` split (which side of each item to draw) is deferred to
 * IM2. For IM1 only `none` (hide all) vs show-all is honored.
 *
 * @param items - All items.
 * @param display - The active filter; `undefined` behaves as `both`.
 * @returns The subset to draw (a new array; input order preserved).
 */
export function filterByPlanActualDisplay(
  items: readonly ScheduleItem[],
  display: PlanActualDisplay | undefined,
): ScheduleItem[] {
  // TODO(IM2): re-derive the plan-only / actual-only split from the actual-date model
  // (an item is drawn plan-side from startDate/endDate and actual-side from
  // actualStart/actualEnd). There is no longer a per-item plan/actual discriminator, so
  // for IM1 only the `none` (hide all) and show-all cases are honored.
  if (display === 'none') {
    return [];
  }
  return [...items];
}

/** One row's reached actual-progress date, in the current vertical order. */
export interface RowProgressFront {
  /** Zero-based vertical order index of the row. */
  readonly rowIndex: number;
  /** Time-axis date the row's actual progress has reached. */
  readonly frontDate: IsoDate;
}

/** A vertex of the illuminated line in world space. */
export interface ProgressLineVertex {
  readonly worldX: number;
  readonly worldY: number;
}

/**
 * Build the illuminated (progress) line vertices (PLAN-L1-003 / L2-001).
 *
 * The line is anchored to the base date's vertical axis at the very top and
 * bottom, then routed through each row's actual-progress front in vertical
 * order. A front behind the base date (delayed row) sits to the PAST side
 * (smaller worldX than the base axis); a front ahead sits to the FUTURE side
 * (larger worldX); an on-time front sits exactly on the axis. The zig-zag of the
 * resulting polyline is what reveals bottlenecks.
 *
 * The returned polyline is PLAIN: vertices only, no terminal dots. Returns an
 * empty array when there are no fronts (nothing to draw).
 *
 * @param baseDate - The reference date (e.g. today) forming the vertical axis.
 * @param fronts - Per-row actual-progress fronts (any order; sorted here by rowIndex).
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom multiplier.
 * @param zoomY - Vertical zoom multiplier.
 * @param rowTopWorldY - Optional resolver for a row's world-space band top, so the
 *   line tracks variable-height rows (multi-lane stacking). Defaults to uniform.
 * @param rowBandHeightAt - Optional resolver for a row's world-space band height.
 *   Defaults to uniform {@link rowBandHeight}.
 * @param rowBendCenterWorldY - Optional resolver for the world-space y a row's BEND
 *   (per-row front vertex) sits at. It must return the vertical CENTER of the ITEM the
 *   progress touches on that row, NOT the row-band center, so the zig-zag connects at
 *   each item's mid-height rather than drifting below it (item 3). Defaults to the
 *   row-band center (`top + height / 2`) for callers with no item geometry.
 * @returns Ordered polyline vertices in world space (top axis -> rows -> bottom axis).
 */
export function buildIlluminatedLine(
  baseDate: IsoDate,
  fronts: readonly RowProgressFront[],
  epochDate: IsoDate,
  zoomX: number,
  zoomY: number,
  rowTopWorldY: (rowIndex: number) => number = (rowIndex) => rowWorldY(rowIndex, zoomY),
  rowBandHeightAt: (rowIndex: number) => number = () => rowBandHeight(zoomY),
  rowBendCenterWorldY: (rowIndex: number) => number = (rowIndex) =>
    rowTopWorldY(rowIndex) + rowBandHeightAt(rowIndex) / 2,
): ProgressLineVertex[] {
  if (fronts.length === 0) {
    return [];
  }
  const ordered = [...fronts].sort((left, right) => left.rowIndex - right.rowIndex);
  const baseWorldX = dateToWorldX(baseDate, epochDate, zoomX);

  const firstRowIndex = ordered[0]!.rowIndex;
  const lastRowIndex = ordered[ordered.length - 1]!.rowIndex;

  const vertices: ProgressLineVertex[] = [];
  // Top anchor: on the base axis, at the top edge of the first row's band.
  vertices.push({ worldX: baseWorldX, worldY: rowTopWorldY(firstRowIndex) });
  for (const front of ordered) {
    vertices.push({
      worldX: dateToWorldX(front.frontDate, epochDate, zoomX),
      // Bend at the touched ITEM's vertical center (item 3), not the band center.
      worldY: rowBendCenterWorldY(front.rowIndex),
    });
  }
  // Bottom anchor: back on the base axis, at the bottom edge of the last band.
  vertices.push({
    worldX: baseWorldX,
    worldY: rowTopWorldY(lastRowIndex) + rowBandHeightAt(lastRowIndex),
  });
  return vertices;
}

/** A pre-change plan span to render as a gray ghost bar (PLAN-L1-004). */
export interface PreviousPlanGhost {
  /** The item whose plan changed. */
  readonly itemId: string;
  /** Owning row (for vertical placement). */
  readonly rowId: string;
  /** Pre-change start date. */
  readonly startDate: IsoDate;
  /** Pre-change end date (null for a milestone). */
  readonly endDate: IsoDate | null;
}

/**
 * Collect the baseline (pre-change plan) ghost spans.
 *
 * TODO(IM3): CR-002 Part 3 moves the baseline OUT of the item (`previousPlan` field
 * removed) into a SEPARATELY-loaded reference document drawn as a gray, read-only
 * underlay matched by item `id`. Until IM3 wires that loader + underlay layer, this is
 * NEUTRALIZED to return no ghosts (nothing to draw from the item itself).
 *
 * @param _items - All items (unused until the baseline-reference loader lands in IM3).
 * @returns An empty array (IM1 neutralization).
 */
export function collectPreviousPlanGhosts(_items: readonly ScheduleItem[]): PreviousPlanGhost[] {
  return [];
}

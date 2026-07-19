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
 * Select the items visible under a plan/actual display filter (PLAN-L1-002). An
 * item with no `planActualKind` is treated as a plain plan item, so it stays
 * visible in `plan-only` and `both` and is hidden in `actual-only`.
 *
 * @param items - All items.
 * @param display - The active filter; `undefined` behaves as `both`.
 * @returns The subset to draw (a new array; input order preserved).
 */
export function filterByPlanActualDisplay(
  items: readonly ScheduleItem[],
  display: PlanActualDisplay | undefined,
): ScheduleItem[] {
  if (display === undefined || display === 'both') {
    return [...items];
  }
  if (display === 'none') {
    return [];
  }
  if (display === 'plan-only') {
    return items.filter((item) => item.planActualKind !== 'actual');
  }
  // actual-only
  return items.filter((item) => item.planActualKind === 'actual');
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
      worldY: rowTopWorldY(front.rowIndex) + rowBandHeightAt(front.rowIndex) / 2,
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
 * Collect the previous-plan ghost spans from the items that carry one
 * (PLAN-L1-004). The renderer draws these grayed, behind the current bars.
 *
 * @param items - All items.
 * @returns One ghost per item with a `previousPlan` (input order preserved).
 */
export function collectPreviousPlanGhosts(items: readonly ScheduleItem[]): PreviousPlanGhost[] {
  const ghosts: PreviousPlanGhost[] = [];
  for (const item of items) {
    const previous = item.previousPlan;
    if (previous === undefined) {
      continue;
    }
    ghosts.push({
      itemId: item.id,
      rowId: item.rowId,
      startDate: previous.startDate,
      endDate: previous.endDate,
    });
  }
  return ghosts;
}

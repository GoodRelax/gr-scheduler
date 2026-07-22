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
import { dateToWorldX, fromDayNumber, toDayNumber } from './time-coordinate-mapper.js';
import { rowBandHeight, rowWorldY } from './layout-engine.js';

/**
 * Whether the progress (illuminated / lightning) line should be drawn given the
 * view-state flag (PLAN-L1-003, CR-006 Part 5). The default is now HIDDEN: an
 * absent / undefined flag means the line is NOT drawn, so a fresh document starts
 * without the progress line and the palette toggle opts into it. Only an explicit
 * `true` shows it. Pure so the default can be asserted without a renderer.
 *
 * @param progressLineVisible - The `viewState.progressLineVisible` flag (or undefined).
 * @returns True only when the flag is explicitly `true`.
 */
export function isProgressLineVisible(progressLineVisible: boolean | undefined): boolean {
  return progressLineVisible === true;
}

/**
 * Whether an item carries recorded ACTUAL dates under the actual-date model
 * (CR-001 Part A). An item "has an actual side" as soon as its {@link
 * ScheduleItem.actualStart} is present; `actualEnd` may still be absent (work in
 * progress) or null (a milestone point).
 *
 * @param item - The item to test.
 * @returns True when the item records an actual start.
 */
export function itemHasActualDates(item: Pick<ScheduleItem, 'actualStart'>): boolean {
  return item.actualStart !== undefined;
}

/**
 * The date an item's ACTUAL starts at when one is first recorded (CR-013 Part 2):
 * its already-recorded {@link ScheduleItem.actualStart}, else its PLANNED
 * {@link ScheduleItem.startDate}. Adding an actual therefore means "started on plan,
 * not finished" -- `actualStart` only, with `actualEnd` left absent, which is a
 * first-class case of the PLAN-L2-001 four-case progress-front rule. The date comes
 * from the model, never from pixels, so it does not depend on the current zoom and
 * stays reproducible.
 *
 * @param item - The item an actual is being recorded for.
 * @returns The actual start date to record.
 */
export function defaultActualStartDate(
  item: Pick<ScheduleItem, 'actualStart' | 'startDate'>,
): IsoDate {
  return item.actualStart ?? item.startDate;
}

/**
 * Select the items visible under a plan/actual display filter (PLAN-L1-002).
 *
 * The actual-date model (CR-001 Part A) puts BOTH the planned span
 * (`startDate`/`endDate`) and the actual dates (`actualStart`/`actualEnd`) on ONE
 * item, so the filter picks which items are drawn per the requested side:
 *
 * - `both` / undefined - every item (plan and, where present, actual are overlaid).
 * - `plan-only`        - every item: they all carry a planned span.
 * - `actual-only`      - only items with recorded actual dates ({@link
 *                        itemHasActualDates}); items without an actual side have
 *                        nothing to draw and are dropped.
 * - `none`             - no item.
 *
 * @param items - All items.
 * @param display - The active filter; `undefined` behaves as `both`.
 * @returns The subset to draw (a new array; input order preserved).
 */
export function filterByPlanActualDisplay(
  items: readonly ScheduleItem[],
  display: PlanActualDisplay | undefined,
): ScheduleItem[] {
  const effectiveDisplay = display ?? 'both';
  switch (effectiveDisplay) {
    case 'none':
      return [];
    case 'actual-only':
      return items.filter((item) => itemHasActualDates(item));
    case 'plan-only':
    case 'both':
    default:
      return [...items];
  }
}

/**
 * Compute a single row's progress FRONT date from an item under the unified MECE
 * rule (PLAN-L2-001 / CR-001 Part A). The four cases are mutually exclusive and
 * exhaustive for tasks; milestones are a point special-case.
 *
 * Tasks:
 * 1. `actualStart` and `actualEnd` both present (completed): front =
 *    `actualStart + progressRatio * (actualEnd - actualStart)`.
 * 2. `actualStart` present, `actualEnd` null/absent (in progress): front =
 *    `actualStart + progressRatio * (endDate - actualStart)` (Formula A); when
 *    `endDate <= actualStart` the span degenerates and the front clamps to
 *    `actualStart`.
 * 3. no `actualStart`, `progressRatio > 0` (plan-only progress): front =
 *    `startDate + progressRatio * (endDate - startDate)`.
 * 4. no `actualStart`, `progressRatio` absent or 0 (not started): no vertex (null).
 *
 * Milestone special case ({@link ScheduleItem.itemKind} === `'milestone'`): the
 * front is a POINT (no interpolation) at `actualStart` when present, else
 * `startDate`.
 *
 * `progressRatio` is treated as 0 when absent; a present-but-zero ratio keeps a
 * task in case 4 (no vertex), matching the strict `> 0` boundary.
 *
 * @param item - The item whose progress front to compute.
 * @returns The front's ISO date, or null when the item contributes no vertex.
 */
export function computeProgressFrontDate(
  item: Pick<
    ScheduleItem,
    'itemKind' | 'startDate' | 'endDate' | 'actualStart' | 'actualEnd' | 'progressRatio'
  >,
): IsoDate | null {
  // Milestone: a point, never span-interpolated (PLAN-L1-007 / L2-001 special case).
  if (item.itemKind === 'milestone') {
    return item.actualStart ?? item.startDate;
  }

  const ratio = item.progressRatio ?? 0;
  const startDay = toDayNumber(item.startDate);
  const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);

  if (item.actualStart !== undefined) {
    const actualStartDay = toDayNumber(item.actualStart);
    // Case 1: completed actual span (actualEnd present and not null).
    if (item.actualEnd !== undefined && item.actualEnd !== null) {
      const actualEndDay = toDayNumber(item.actualEnd);
      return fromDayNumber(actualStartDay + Math.round(ratio * (actualEndDay - actualStartDay)));
    }
    // Case 2: in progress; endDate is the provisional actual end (Formula A).
    if (endDay <= actualStartDay) {
      // Degenerate span (delayed start past the planned end): clamp to actualStart.
      return item.actualStart;
    }
    return fromDayNumber(actualStartDay + Math.round(ratio * (endDay - actualStartDay)));
  }

  // No actualStart.
  if (ratio > 0) {
    // Case 3: plan-side progress (MSP PercentComplete equivalent).
    return fromDayNumber(startDay + Math.round(ratio * (endDay - startDay)));
  }
  // Case 4: not started -> no vertex.
  return null;
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
 * Collect the baseline (pre-change plan) ghost spans FROM THE ITEMS THEMSELVES.
 *
 * CR-002 Part 3 moved the baseline OUT of the item (the `previousPlan` field was
 * removed) into a SEPARATELY-loaded reference document (see
 * {@link collectBaselineGhosts}). No item carries its own pre-change plan any more,
 * so this returns no ghosts. Kept because the ghost layer and the item-list render
 * path still call it as the "baseline from the item" seam (always empty now).
 *
 * @param _items - All items (a plan-only item carries no self-baseline).
 * @returns An empty array.
 */
export function collectPreviousPlanGhosts(_items: readonly ScheduleItem[]): PreviousPlanGhost[] {
  return [];
}

/**
 * Collect the baseline ghost spans from a SEPARATELY-loaded reference document
 * (CR-002 Part 3 / PLAN-L1-004 / DATA-JSON-016).
 *
 * The reference document is a past-plan snapshot loaded "as baseline". Each of its
 * items is matched to a CURRENT item by `id` (matchKey = item id); only baseline
 * items whose id is still present in the live document contribute a ghost, so the
 * underlay is drawn at the current item's row/height. The reference document's
 * ACTUAL dates are ignored -- only its planned span (`startDate`/`endDate`) is used,
 * because the baseline expresses "what the plan USED to be", not its progress.
 *
 * @param baselineItems - The loaded reference document's items.
 * @param currentItemIds - The ids present in the live (edited) document.
 * @returns One ghost per id-matched baseline item, carrying its planned span; input
 *   order preserved.
 */
export function collectBaselineGhosts(
  baselineItems: readonly ScheduleItem[],
  currentItemIds: ReadonlySet<string>,
): PreviousPlanGhost[] {
  const ghosts: PreviousPlanGhost[] = [];
  for (const item of baselineItems) {
    if (!currentItemIds.has(item.id)) {
      continue; // No live item to underlay: drop this baseline entry.
    }
    ghosts.push({
      itemId: item.id,
      rowId: item.rowId,
      startDate: item.startDate,
      endDate: item.endDate,
    });
  }
  return ghosts;
}

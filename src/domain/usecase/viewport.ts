/**
 * UseCase layer: viewport virtualization inputs (ARCH-C-021, ADR-009).
 *
 * Computes the visible world-space window from ViewState + canvas size, then
 * culls item placements to those intersecting the window (plus an over-scan
 * margin so panning does not reveal blank gaps). This is the "only render the
 * visible set" contract that keeps SVG DOM node count bounded regardless of
 * total item count -- the core of the RISK-001 performance strategy.
 *
 * Pure and side-effect free. The renderer combines this with the LOD selector.
 */

import type {
  CanvasSize,
  IsoDate,
  Row,
  ScheduleItem,
  ViewState,
} from '../model/schedule-model.js';
import { BASE_ROW_HEIGHT, layoutItems, type ItemPlacement } from './layout-engine.js';
import { BASE_PIXELS_PER_DAY, toDayNumber } from './time-coordinate-mapper.js';

/** Visible world-space rectangle plus over-scan margins already applied. */
export interface ViewportWindow {
  readonly worldLeft: number;
  readonly worldRight: number;
  readonly worldTop: number;
  readonly worldBottom: number;
}

/**
 * Over-scan margin in CSS pixels added around the visible rect so that fast
 * panning keeps a ring of pre-rendered items ready off-screen.
 */
export const OVERSCAN_MARGIN = 96;

/**
 * Compute the visible world-space window for the current scroll and canvas.
 *
 * World coordinates relate to screen coordinates by
 * `screen = world - scroll`, so the visible world rect is
 * `[scroll, scroll + canvasSize]`, expanded by the over-scan margin.
 *
 * @param viewState - Provides scrollX/scrollY.
 * @param canvasSize - Pixel size of the drawing surface.
 * @returns The over-scanned visible world rectangle.
 */
export function computeViewportWindow(
  viewState: ViewState,
  canvasSize: CanvasSize,
): ViewportWindow {
  return {
    worldLeft: viewState.scrollX - OVERSCAN_MARGIN,
    worldRight: viewState.scrollX + canvasSize.widthPx + OVERSCAN_MARGIN,
    worldTop: viewState.scrollY - OVERSCAN_MARGIN,
    worldBottom: viewState.scrollY + canvasSize.heightPx + OVERSCAN_MARGIN,
  };
}

/**
 * Test whether a placement intersects the viewport window.
 *
 * @param placement - The item's world-space rectangle.
 * @param window - The visible world window.
 * @returns True when any part of the placement is inside the window.
 */
export function placementIntersectsWindow(
  placement: ItemPlacement,
  window: ViewportWindow,
): boolean {
  const itemRight = placement.worldX + placement.worldWidth;
  const itemBottom = placement.worldY + placement.worldHeight;
  return (
    itemRight >= window.worldLeft &&
    placement.worldX <= window.worldRight &&
    itemBottom >= window.worldTop &&
    placement.worldY <= window.worldBottom
  );
}

/**
 * Cull placements to those visible within the viewport window.
 *
 * @param placements - All laid-out item placements.
 * @param viewState - Current view state (scroll).
 * @param canvasSize - Drawing surface size.
 * @returns Only the placements intersecting the (over-scanned) viewport.
 */
export function cullPlacementsToViewport(
  placements: readonly ItemPlacement[],
  viewState: ViewState,
  canvasSize: CanvasSize,
): ItemPlacement[] {
  const window = computeViewportWindow(viewState, canvasSize);
  return placements.filter((placement) => placementIntersectsWindow(placement, window));
}

/** The whole-schedule extent, in DAY (time) and ROW units, that Fit must cover. */
export interface FitContentExtent {
  /** Earliest start day number across all items (inclusive). */
  readonly minStartDay: number;
  /** Latest end day number across all items (inclusive). */
  readonly maxEndDay: number;
  /** Number of display rows the schedule occupies (>= 1). */
  readonly rowCount: number;
  /** Time-axis origin day number (world x = 0 maps here). */
  readonly epochDay: number;
  /**
   * The true world-space content BOTTOM at zoomY = 1 (fix 7), i.e. the largest
   * `worldY + worldHeight` over every laid-out item at unit vertical zoom. When
   * provided it is used INSTEAD of `rowCount * BASE_ROW_HEIGHT` so multi-bar rows
   * (whose stacked sub-lanes overflow the nominal row band) are fully framed. Absent
   * falls back to the row-count estimate for callers that do not lay items out.
   */
  readonly contentBottomUnit?: number;
}

/** Inputs that bound the Fit computation to the visible drawing area. */
export interface FitViewportInputs {
  /** Full canvas size in CSS pixels. */
  readonly canvasSize: CanvasSize;
  /** Frozen left-pane width in CSS pixels (subtracted from the usable width). */
  readonly leftPaneWidth: number;
  /**
   * Fixed top offset in CSS pixels a candidate zoomX would push content down by
   * (the date-ruler height). Provided as a function of zoomX because the ruler
   * tier count -- and thus the offset -- depends on the horizontal zoom chosen.
   */
  readonly topOffsetForZoomX: (zoomX: number) => number;
}

/** The zoom + scroll a Fit produces (a partial view-state patch). */
export interface FitView {
  readonly zoomX: number;
  readonly zoomY: number;
  readonly scrollX: number;
  readonly scrollY: number;
}

/** Clamp a zoom multiplier to the renderer's supported operating range. */
function clampFitZoom(zoom: number): number {
  return Math.min(64, Math.max(0.02, zoom));
}

/**
 * Compute a zoomX / zoomY / scrollX / scrollY that frames the WHOLE schedule so
 * every row and the full date span are visible (fix 7 "Fit"). Pure and DOM-free
 * so it is unit-testable: both axes are solved independently in world units
 * (days x pixels-per-day, rows x row-height), then scroll is set to the top-left
 * of the content with a small margin so the first item and top row are on-screen.
 *
 * @param extent - The schedule's day/row extent.
 * @param inputs - The viewport size and its frozen offsets.
 * @param marginPx - Inner margin in CSS pixels kept around the content.
 * @returns The Fit view (zoom + scroll).
 */
export function computeFitView(
  extent: FitContentExtent,
  inputs: FitViewportInputs,
  marginPx = 24,
): FitView {
  const usableWidth = Math.max(1, inputs.canvasSize.widthPx - inputs.leftPaneWidth - marginPx * 2);
  const dayCount = Math.max(1, extent.maxEndDay - extent.minStartDay);
  const zoomX = clampFitZoom(usableWidth / (dayCount * BASE_PIXELS_PER_DAY));

  // The ruler height depends on the chosen zoomX, so resolve the vertical budget
  // only after zoomX is known.
  const topOffset = inputs.topOffsetForZoomX(zoomX);
  const usableHeight = Math.max(
    1,
    inputs.canvasSize.heightPx - topOffset - marginPx * 2,
  );
  const rowCount = Math.max(1, extent.rowCount);
  // Prefer the TRUE content bottom (which includes multi-bar sub-lane overflow) so
  // Fit frames every stacked item; fall back to the nominal row-count height.
  const contentHeightUnit = Math.max(
    1,
    extent.contentBottomUnit ?? rowCount * BASE_ROW_HEIGHT,
  );
  const zoomY = clampFitZoom(usableHeight / contentHeightUnit);

  // Anchor the top-left of the content just inside the margin.
  const firstItemWorldX = (extent.minStartDay - extent.epochDay) * BASE_PIXELS_PER_DAY * zoomX;
  const scrollX = Math.max(0, firstItemWorldX - marginPx);
  const scrollY = 0;
  return { zoomX, zoomY, scrollX, scrollY };
}

/** The world-space extent of a set of items, in day units and unit-zoom pixels. */
export interface ItemsFitExtent {
  readonly minStartDay: number;
  readonly maxEndDay: number;
  readonly rowCount: number;
  readonly epochDay: number;
  /** True content bottom at zoomY = 1 (includes multi-bar sub-lane stacking). */
  readonly contentBottomUnit: number;
  /**
   * Left-most RENDERED world x at the measured zoomX, i.e. the smallest edge over
   * every item once its milestone marker and left-side label overhang are added
   * (screen-space, zoom-invariant additions). Fit uses this so no label/marker is
   * clipped on the left.
   */
  readonly contentLeftPx: number;
  /**
   * Right-most RENDERED world x at the measured zoomX, including each bar's END, its
   * milestone marker, and its right-side label text width -- the true drawn right
   * edge, so the latest-dated content (whose label sits past its date) is framed.
   */
  readonly contentRightPx: number;
}

/**
 * Screen-space (zoom-invariant) label/marker allowances used to estimate an item's
 * RENDERED horizontal overhang beyond its date rectangle, so Fit reserves room for
 * it. `LABEL_CHAR_PX` mirrors the renderer's own label hit-box width factor
 * (fontSize 0.62 per char at the M scale) and `LABEL_GAP_PX` its 4px gap;
 * `MARKER_HALF_PX` conservatively covers a milestone glyph's half-width.
 */
const LABEL_CHAR_PX = 12 * 0.62;
const LABEL_GAP_PX = 4;
const MARKER_HALF_PX = 16;
const MIN_LABEL_PX = 8;

/** Estimated width in CSS pixels of an item's abbreviation label. */
function estimatedLabelWidthPx(abbrev: string): number {
  return Math.max(MIN_LABEL_PX, abbrev.length * LABEL_CHAR_PX);
}

/**
 * The RENDERED horizontal [left, right] world-x span of one placement, adding the
 * milestone marker half-width and the abbreviation label overhang on the side the
 * renderer draws it (default `auto`/`right` -> to the right).
 */
function renderedHorizontalSpan(
  item: ScheduleItem,
  placement: ItemPlacement,
): { left: number; right: number } {
  const barLeft = placement.worldX;
  const barRight = placement.worldX + placement.worldWidth;
  const centerX = placement.worldX + placement.worldWidth / 2;
  let left = barLeft;
  let right = barRight;
  if (item.itemKind === 'milestone') {
    left = Math.min(left, placement.worldX - MARKER_HALF_PX);
    right = Math.max(right, placement.worldX + MARKER_HALF_PX);
  }
  const labelWidth = estimatedLabelWidthPx(item.abbrev);
  switch (item.labelPosition ?? 'auto') {
    case 'left':
      left = Math.min(left, barLeft - LABEL_GAP_PX - labelWidth);
      break;
    case 'center':
    case 'top':
    case 'bottom':
      left = Math.min(left, centerX - labelWidth / 2);
      right = Math.max(right, centerX + labelWidth / 2);
      break;
    case 'right':
    case 'auto':
    default:
      right = Math.max(right, barRight + LABEL_GAP_PX + labelWidth);
      break;
  }
  return { left, right };
}

/**
 * Measure the true world-space extent of a document's items so Fit can frame ALL
 * of them: vertically including multi-bar sub-lane overflow, and horizontally
 * including each bar's END plus the milestone marker and abbreviation-label
 * overhang (which extend past an item's date). The measurement lays the items out
 * at the given `zoomX` (which fixes the sub-lane assignment and the day->x mapping)
 * and zoomY = 1, so the read-off bottom scales linearly to any final zoomY.
 *
 * @param items - All items to measure.
 * @param rows - The level-0 (finest) rows the items are placed on.
 * @param epochDate - Time-axis origin.
 * @param zoomX - Horizontal zoom the Fit will use (drives sub-lane assignment and x).
 * @returns The measured extent, or null when there are no items.
 */
export function measureItemsFitExtent(
  items: readonly ScheduleItem[],
  rows: readonly Row[],
  epochDate: IsoDate,
  zoomX: number,
): ItemsFitExtent | null {
  if (items.length === 0) {
    return null;
  }
  const epochDay = toDayNumber(epochDate);
  let minStartDay = Number.POSITIVE_INFINITY;
  let maxEndDay = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const startDay = toDayNumber(item.startDate);
    const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
    minStartDay = Math.min(minStartDay, startDay);
    maxEndDay = Math.max(maxEndDay, endDay);
  }
  if (!Number.isFinite(minStartDay) || !Number.isFinite(maxEndDay)) {
    return null;
  }
  // Lay out at the target zoomX with unit vertical zoom so the read-off bottom
  // scales linearly to any final zoomY (sub-lane count is zoomY-independent).
  const unitPlacements = layoutItems(items, rows, epochDate, {
    zoomX,
    zoomY: 1,
    scrollX: 0,
    scrollY: 0,
    fontScale: 'M',
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  let contentBottomUnit = 0;
  let contentLeftPx = Number.POSITIVE_INFINITY;
  let contentRightPx = Number.NEGATIVE_INFINITY;
  for (const placement of unitPlacements) {
    contentBottomUnit = Math.max(contentBottomUnit, placement.worldY + placement.worldHeight);
    const item = itemById.get(placement.itemId);
    if (item === undefined) {
      continue;
    }
    const span = renderedHorizontalSpan(item, placement);
    contentLeftPx = Math.min(contentLeftPx, span.left);
    contentRightPx = Math.max(contentRightPx, span.right);
  }
  if (!Number.isFinite(contentLeftPx) || !Number.isFinite(contentRightPx)) {
    contentLeftPx = (minStartDay - epochDay) * BASE_PIXELS_PER_DAY * zoomX;
    contentRightPx = (maxEndDay - epochDay) * BASE_PIXELS_PER_DAY * zoomX;
  }
  return {
    minStartDay,
    maxEndDay,
    rowCount: Math.max(1, rows.length),
    epochDay,
    contentBottomUnit: Math.max(1, contentBottomUnit),
    contentLeftPx,
    contentRightPx,
  };
}

/**
 * Compute a Fit view (zoom + scroll) that frames EVERY item of a document -- across
 * all rows, including multi-bar sub-lanes -- within the viewport with a margin on
 * both axes (fix 7). Solves zoomX from the date span first (so the sub-lane
 * assignment is known), then measures the true content height at that zoomX and
 * solves zoomY from it, guaranteeing that no stacked item is clipped at the bottom.
 *
 * @param items - All items to frame.
 * @param rows - The level-0 (finest) rows the items are placed on.
 * @param epochDate - Time-axis origin.
 * @param inputs - The viewport size and its frozen offsets.
 * @param marginPx - Inner margin in CSS pixels kept around the content.
 * @returns The Fit view, or null when there is nothing to frame.
 */
export function computeFitViewForItems(
  items: readonly ScheduleItem[],
  rows: readonly Row[],
  epochDate: IsoDate,
  inputs: FitViewportInputs,
  marginPx = 24,
): FitView | null {
  if (items.length === 0) {
    return null;
  }
  let minStartDay = Number.POSITIVE_INFINITY;
  let maxEndDay = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const startDay = toDayNumber(item.startDate);
    const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
    minStartDay = Math.min(minStartDay, startDay);
    maxEndDay = Math.max(maxEndDay, endDay);
  }
  if (!Number.isFinite(minStartDay) || !Number.isFinite(maxEndDay)) {
    return null;
  }
  const dayCount = Math.max(1, maxEndDay - minStartDay);
  const usableWidth = Math.max(
    1,
    inputs.canvasSize.widthPx - inputs.leftPaneWidth - marginPx * 2,
  );

  // Phase 1: a first zoomX from the date span alone (ignores label/marker overhang).
  const zoomX0 = clampFitZoom(usableWidth / (dayCount * BASE_PIXELS_PER_DAY));
  const probe = measureItemsFitExtent(items, rows, epochDate, zoomX0);
  if (probe === null) {
    return null;
  }
  // The screen-space (zoom-invariant) horizontal overhang: the rendered content
  // width at zoomX0 minus the pure day-span width. Reserving it shrinks zoomX just
  // enough that the widest bar's END and the latest milestone's marker + right-side
  // label are framed instead of clipped.
  const daySpanWidth0 = dayCount * BASE_PIXELS_PER_DAY * zoomX0;
  const overhangPx = Math.max(0, probe.contentRightPx - probe.contentLeftPx - daySpanWidth0);
  const zoomX = clampFitZoom(
    Math.max(1, usableWidth - overhangPx) / (dayCount * BASE_PIXELS_PER_DAY),
  );

  // Phase 2: re-measure at the final zoomX for the true rendered left/right and the
  // lane-inclusive content bottom, then anchor scroll so the leftmost RENDERED edge
  // (including a milestone marker's half-width and any left-side label) sits one
  // margin INSIDE the pane rather than flush at x = 0 -- so the earliest item (e.g. a
  // day-0 "Kickoff" diamond, whose marker overhangs to negative world x) is fully
  // visible with breathing room, symmetric with the right/top/bottom margins.
  //
  // The subtraction can yield a small NEGATIVE scrollX (the marker overhang lies left
  // of the epoch); that is the VALID regime -- the renderer's clampTimelineScrollX
  // permits panning back before the epoch (to the year 2000), and screenToWorld is the
  // exact inverse of the content transform for any scrollX, so the pointer->world
  // hit-box stays calibrated. This deliberately does NOT reintroduce the old
  // `Math.max(0, ...)` clamp, which pinned the leftmost content to x = 0 and clipped
  // the earliest item's left edge.
  const measured = measureItemsFitExtent(items, rows, epochDate, zoomX) ?? probe;
  const scrollX = measured.contentLeftPx - marginPx;

  const topOffset = inputs.topOffsetForZoomX(zoomX);
  const usableHeight = Math.max(1, inputs.canvasSize.heightPx - topOffset - marginPx * 2);
  const contentBottomUnit = Math.max(1, measured.contentBottomUnit);
  const zoomY = clampFitZoom(usableHeight / contentBottomUnit);
  const scrollY = 0;
  return { zoomX, zoomY, scrollX, scrollY };
}

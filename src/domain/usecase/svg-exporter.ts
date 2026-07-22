/**
 * UseCase layer: self-contained SVG exporter (IO-L1-003, DATA-SVG-001..003).
 * Pure string builder, no DOM. Unlike the on-screen renderer (which virtualizes
 * to the viewport for 60fps), export renders the FULL schedule -- every item on
 * every row -- because export is a one-shot path, not a per-frame path
 * (~1000 items is fine).
 *
 * Output is guaranteed self-contained (DATA-SVG-001): no external CDN/image
 * references; imported icons are embedded as `data:` URIs that were already
 * sanitized by the import sanitizer (§3.2). All text goes through XML escaping,
 * so an abbreviation or watermark carrying an XSS payload becomes inert text
 * (security-design §3.1, C-02/C-17) -- the export never concatenates raw markup.
 *
 * The watermark layer (DATA-SVG-002, TOOL-L1-007) is fully wired in M5b; this
 * module exposes a clean `watermark` option hook and renders a minimal diagonal
 * tiled layer when one is supplied.
 */

import type { ScheduleDocument, ScheduleItem } from '../model/schedule-model.js';
import {
  layoutItems,
  rowBandHeight,
  computeRowGeometry,
  rowTopAt,
  rowHeightAt,
  type ItemPlacement,
} from './layout-engine.js';
import { buildWatermarkLayer, type WatermarkContent } from './watermark-builder.js';
import { fadePointsToAttribute, fadeTrapezoidPoints, hasFade } from './fade-geometry.js';
import { pixelsPerDay, toDayNumber } from './time-coordinate-mapper.js';
import { filterByPlanActualDisplay } from './progress-line-builder.js';
import { actualDisplayFillColor, displayFillColor } from './plan-actual-colors.js';
import {
  resolvePlanActualStyle,
  type PlanActualBarRect,
} from './plan-actual-geometry.js';
import {
  computeItemPlanActualPaint,
  type ItemPlanActualPaint,
} from './plan-actual-paint.js';
import { planActualStrokeWidthPx } from './a11y-tokens.js';

/** Watermark parameters (DATA-SVG-002, TOOL-L2-001). */
export type SvgWatermark = WatermarkContent;

/** Options controlling SVG export. */
export interface SvgExportOptions {
  /** Draw the left classification label column (default true). */
  readonly includeLeftLabels?: boolean;
  /** Optional watermark overlay (DATA-SVG-002). Absent = no watermark. */
  readonly watermark?: SvgWatermark;
}

/** Outer margin around the drawing in CSS pixels. */
export const EXPORT_MARGIN = 16;

/** One item paired with the plan/actual rectangles the export paints for it. */
interface ExportedItemPaint {
  readonly item: ScheduleItem;
  readonly paint: ItemPlanActualPaint;
}

/** Escape text content / attribute values for safe SVG serialization (§3.1). */
function escapeSvg(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export the full schedule as a self-contained SVG string (IO-L1-003).
 *
 * @param scheduleDocument - The document to render in full.
 * @param options - Optional left-label and watermark controls.
 * @returns A standalone SVG document string.
 */
export function exportScheduleSvg(scheduleDocument: ScheduleDocument, options: SvgExportOptions = {}): string {
  const includeLeftLabels = options.includeLeftLabels ?? true;
  const leftPaneWidth = includeLeftLabels ? (scheduleDocument.viewState.leftPaneWidth ?? 200) : 0;

  const placements = layoutItems(scheduleDocument.items, scheduleDocument.rows, scheduleDocument.epochDate, scheduleDocument.viewState);
  const placementById = new Map<string, ItemPlacement>();
  for (const placement of placements) {
    placementById.set(placement.itemId, placement);
  }
  const bandHeight = rowBandHeight(scheduleDocument.viewState.zoomY);
  // Rows may have different heights (a row grows to stack overlapping items, item:
  // multi-lane stacking), so use the row geometry for band tops and the total height
  // instead of a uniform `rows.length * bandHeight`; otherwise a tall row's items
  // would fall outside the exported viewBox.
  const rowGeometry = computeRowGeometry(
    scheduleDocument.items,
    scheduleDocument.rows,
    scheduleDocument.epochDate,
    scheduleDocument.viewState,
  );
  const chartHeight = Math.max(bandHeight, rowGeometry.totalHeight);

  // Plan/actual rules, resolved exactly as the screen resolves them (DEF-011): the
  // item-level filter drops a side that has nothing to show, and the shared paint
  // decision says which rectangles each surviving item draws.
  const planActualDisplay = scheduleDocument.viewState.planActualDisplay;
  const planActualStyle = resolvePlanActualStyle(scheduleDocument.viewState.planActualStyle);
  const paintedItems: ExportedItemPaint[] = [];
  for (const item of filterByPlanActualDisplay(scheduleDocument.items, planActualDisplay)) {
    const placement = placementById.get(item.id);
    if (placement === undefined) {
      continue;
    }
    const paint = computeItemPlanActualPaint(
      item,
      placement,
      scheduleDocument.epochDate,
      scheduleDocument.viewState.zoomX,
      planActualStyle,
      planActualDisplay,
    );
    if (!paint.isDrawn) {
      continue;
    }
    paintedItems.push({ item, paint });
  }

  // The viewBox must contain every PAINTED rectangle, not just the laid-out plan
  // spans: a lone actual glyph moves onto the actual extent and an actual bar can end
  // past its plan bar, so both are folded into the content width.
  const planSpanRight = placements.reduce(
    (max, placement) => Math.max(max, placement.worldX + placement.worldWidth),
    240,
  );
  const contentRight = paintedItems.reduce(
    (max, painted) => Math.max(max, paintedRightEdge(painted.paint)),
    planSpanRight,
  );
  const totalWidth = leftPaneWidth + contentRight + EXPORT_MARGIN * 2;
  const totalHeight = chartHeight + EXPORT_MARGIN * 2;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(totalWidth)}" height="${Math.ceil(
      totalHeight,
    )}" viewBox="0 0 ${Math.ceil(totalWidth)} ${Math.ceil(totalHeight)}">`,
  );
  parts.push(`<rect x="0" y="0" width="${Math.ceil(totalWidth)}" height="${Math.ceil(
    totalHeight,
  )}" fill="#ffffff"/>`);

  const originX = leftPaneWidth + EXPORT_MARGIN;
  const originY = EXPORT_MARGIN;

  // Row bands + optional left labels.
  parts.push('<g data-layer="rows">');
  scheduleDocument.rows.forEach((row, rowIndex) => {
    const bandTop = originY + rowTopAt(rowGeometry, rowIndex, scheduleDocument.viewState.zoomY);
    const rowHeight = rowHeightAt(rowGeometry, rowIndex, scheduleDocument.viewState.zoomY);
    parts.push(
      `<line x1="${EXPORT_MARGIN}" y1="${bandTop}" x2="${Math.ceil(totalWidth) - EXPORT_MARGIN}" y2="${bandTop}" stroke="#e4e4e4" stroke-width="1"/>`,
    );
    if (includeLeftLabels) {
      parts.push(
        `<text x="${EXPORT_MARGIN}" y="${bandTop + rowHeight / 2}" font-family="system-ui, sans-serif" font-size="12" fill="#333333" data-row-id="${escapeSvg(
          row.id,
        )}">${escapeSvg(row.classificationLabel)}</text>`,
      );
    }
  });
  parts.push('</g>');

  // Dependency lines (straight leader between item box centers; best-effort).
  parts.push('<g data-layer="dependencies">');
  for (const dependency of scheduleDocument.dependencies ?? []) {
    const from = placementById.get(dependency.fromItemId);
    const to = placementById.get(dependency.toItemId);
    if (from === undefined || to === undefined) {
      continue;
    }
    const fx = originX + from.worldX + from.worldWidth / 2;
    const fy = originY + from.worldY + from.worldHeight / 2;
    const tx = originX + to.worldX + to.worldWidth / 2;
    const ty = originY + to.worldY + to.worldHeight / 2;
    parts.push(
      `<line x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}" stroke="#888888" stroke-width="1" data-dep-id="${escapeSvg(
        dependency.id,
      )}"/>`,
    );
  }
  parts.push('</g>');

  // Items: every painted item, in document order. Inside one item group the paint
  // order mirrors the screen (DEF-009): glyph(s) first, the abbreviation LAST, so the
  // label always reads above both the pale plan bar and the vivid actual bar.
  parts.push('<g data-layer="items">');
  for (const painted of paintedItems) {
    const { item, paint } = painted;
    const glyph = paint.primaryGlyphRect;
    const x = originX + glyph.x;
    const y = originY + glyph.y;
    const width = glyph.width;
    const height = glyph.height;
    // CR-002 Part 1: the plan side is the PALE shade derived from the item's own base
    // fill, the actual side the VIVID one -- identical to the on-screen derivation.
    const glyphFillColor =
      paint.primaryGlyphSide === 'actual' ? actualDisplayFillColor(item) : displayFillColor(item);
    parts.push(`<g data-item-id="${escapeSvg(item.id)}">`);

    if (item.itemKind === 'milestone') {
      // CR-002 Part 2: a milestone shows plan + actual as TWO point markers joined by
      // a thin leader, with no filled span between them. The leader goes first so the
      // markers paint over its endpoints.
      const actualCenterX = paint.milestoneActualCenterX;
      const milestoneActualFill = actualDisplayFillColor(item);
      if (actualCenterX !== null) {
        parts.push(
          `<line x1="${x + width / 2}" y1="${y + height / 2}" x2="${originX + actualCenterX}" y2="${
            y + height / 2
          }" stroke="${escapeSvg(
            milestoneActualFill,
          )}" stroke-width="1" stroke-dasharray="2 2" data-role="milestone-plan-actual-leader"/>`,
        );
      }
      parts.push(
        renderMilestone(x, y, width, height, glyphFillColor, item.strokeColor, paint.primaryGlyphSide),
      );
      if (actualCenterX !== null) {
        parts.push(
          renderMilestone(
            originX + actualCenterX - width / 2,
            y,
            width,
            height,
            milestoneActualFill,
            'none',
            'actual',
            'milestone-actual-marker',
          ),
        );
      }
    } else if (hasFade(item.fadeInDays, item.fadeOutDays)) {
      parts.push(
        renderFadedTask(item, x, y, height, scheduleDocument.viewState.zoomX, glyphFillColor),
      );
    } else {
      parts.push(renderTaskBar(item, { x, y, width, height }, glyphFillColor, paint));
    }

    // The second, vivid ACTUAL bar: overlaid on the plan bar under `overlap`, stacked
    // below it inside the grown row band under `separate` (PLAN-L1-005, CR-013 Part 1).
    if (paint.actualBarRect !== null) {
      parts.push(renderActualBar(paint.actualBarRect, actualDisplayFillColor(item), originX, originY));
    }

    parts.push(
      `<text x="${x + width + 4}" y="${y + height / 2 + 4}" font-family="system-ui, sans-serif" font-size="11" fill="#222222">${escapeSvg(
        item.abbrev,
      )}</text>`,
    );
    parts.push('</g>');
  }
  parts.push('</g>');

  if (options.watermark !== undefined) {
    parts.push(renderWatermark(options.watermark, Math.ceil(totalWidth), Math.ceil(totalHeight)));
  }

  parts.push('</svg>');
  return parts.join('');
}

/** The rightmost world-x any of an item's painted rectangles reaches. */
function paintedRightEdge(paint: ItemPlanActualPaint): number {
  const glyph = paint.primaryGlyphRect;
  const actualBarRight =
    paint.actualBarRect === null ? 0 : paint.actualBarRect.x + paint.actualBarRect.width;
  const milestoneActualRight =
    paint.milestoneActualCenterX === null
      ? 0
      : paint.milestoneActualCenterX + glyph.width / 2;
  return Math.max(glyph.x + glyph.width, actualBarRight, milestoneActualRight);
}

/**
 * Draw a plain rectangular task bar. While a plan bar and an actual bar coexist the
 * plan takes the THIN outline in the vivid actual shade and the actual the THICK one
 * (CR-002 Part 1), so the two sides stay distinguishable without hue (SC 1.4.1); a
 * lone actual glyph keeps the thick weight. A plain, non-plan/actual bar keeps its own
 * stored stroke color exactly as before.
 */
function renderTaskBar(
  item: ScheduleItem,
  rect: PlanActualBarRect,
  fillColor: string,
  paint: ItemPlanActualPaint,
): string {
  const geometry = `x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="2"`;
  if (paint.primaryGlyphSide === 'plan' && paint.actualBarRect !== null) {
    const actualFill = actualDisplayFillColor(item);
    return `<rect ${geometry} fill="${escapeSvg(fillColor)}" stroke="${escapeSvg(
      actualFill,
    )}" stroke-width="${planActualStrokeWidthPx('plan')}" data-plan-actual-side="plan"/>`;
  }
  if (paint.primaryGlyphSide === 'actual') {
    return `<rect ${geometry} fill="${escapeSvg(fillColor)}" stroke="${escapeSvg(
      fillColor,
    )}" stroke-width="${planActualStrokeWidthPx('actual')}" data-plan-actual-side="actual"/>`;
  }
  return `<rect ${geometry} fill="${escapeSvg(fillColor)}" stroke="${escapeSvg(
    item.strokeColor,
  )}" stroke-width="1"/>`;
}

/**
 * Draw the second, vivid ACTUAL bar of a plan/actual pair (PLAN-L1-005). Rectangle
 * coordinates arrive in world space and are shifted into the exported frame here.
 */
function renderActualBar(
  rect: PlanActualBarRect,
  actualFillColor: string,
  originX: number,
  originY: number,
): string {
  return `<rect x="${originX + rect.x}" y="${originY + rect.y}" width="${rect.width}" height="${
    rect.height
  }" rx="2" fill="${escapeSvg(actualFillColor)}" stroke="${escapeSvg(
    actualFillColor,
  )}" stroke-width="${planActualStrokeWidthPx('actual')}" data-role="actual-bar" data-plan-actual-side="actual"/>`;
}

/**
 * Draw a faded task as its 4-point trapezoid/parallelogram polygon (ITEM fade
 * cross-fade), matching the on-screen renderer. `x`/`y` are the exported top-left
 * of the item's start; `height` its lane height; `zoomX` the horizontal density;
 * `fillColor` the plan/actual-derived shade.
 */
function renderFadedTask(
  item: ScheduleItem,
  x: number,
  y: number,
  height: number,
  zoomX: number,
  fillColor: string,
): string {
  const startDay = toDayNumber(item.startDate);
  const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
  const perDay = pixelsPerDay(zoomX);
  const points = fadeTrapezoidPoints({
    startDay,
    endDay,
    fadeInDays: item.fadeInDays ?? 0,
    fadeOutDays: item.fadeOutDays ?? 0,
    top: y,
    bottom: y + height,
    dayToX: (day) => x + (day - startDay) * perDay,
  });
  return `<polygon points="${fadePointsToAttribute(points)}" fill="${escapeSvg(
    fillColor,
  )}" stroke="${escapeSvg(item.strokeColor)}" stroke-width="1"/>`;
}

/**
 * Draw a milestone glyph centered in its box (diamond as the neutral default).
 *
 * @param x - Exported left edge of the milestone's box.
 * @param y - Exported top edge of the box.
 * @param width - Box width.
 * @param height - Box height.
 * @param fillColor - The marker fill (pale plan / vivid actual shade).
 * @param strokeColor - The marker outline color.
 * @param planActualSide - Which plan/actual side this marker stands for, if any.
 * @param markerRole - Optional `data-role` tag (the actual marker carries one).
 * @returns The polygon markup.
 */
function renderMilestone(
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string,
  planActualSide: 'plan' | 'actual' | null = null,
  markerRole?: string,
): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const points = `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`;
  const sideAttribute = planActualSide === null ? '' : ` data-plan-actual-side="${planActualSide}"`;
  const roleAttribute = markerRole === undefined ? '' : ` data-role="${markerRole}"`;
  return `<polygon points="${points}" fill="${escapeSvg(fillColor)}" stroke="${escapeSvg(
    strokeColor,
  )}" stroke-width="1"${sideAttribute}${roleAttribute}/>`;
}

/**
 * Draw the diagonal tiled watermark (DATA-SVG-002, TOOL-L2-002) from the shared
 * builder so the exported mark matches the on-screen mark exactly. The label goes
 * through {@link escapeSvg}, so a user name carrying an XSS payload becomes inert
 * text (security-design §6, C-17).
 */
function renderWatermark(watermark: SvgWatermark, width: number, height: number): string {
  const layer = buildWatermarkLayer(watermark, width, height);
  const escapedLabel = escapeSvg(layer.label);
  const parts: string[] = [`<g data-layer="watermark" opacity="${layer.opacity}">`];
  for (const tile of layer.tiles) {
    parts.push(
      `<text x="${tile.x}" y="${tile.y}" transform="rotate(${tile.rotationDeg} ${tile.x} ${tile.y})" font-family="system-ui, sans-serif" font-size="${layer.fontSizePx}" fill="#888888">${escapedLabel}</text>`,
    );
  }
  parts.push('</g>');
  return parts.join('');
}

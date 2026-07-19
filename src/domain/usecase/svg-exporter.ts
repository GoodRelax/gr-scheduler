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

import type { ImportedAsset, ScheduleDocument, ScheduleItem } from '../model/schedule-model.js';
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
const EXPORT_MARGIN = 16;

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
  const assetById = new Map<string, ImportedAsset>();
  for (const asset of scheduleDocument.assets ?? []) {
    assetById.set(asset.id, asset);
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
  const contentRight = placements.reduce(
    (max, placement) => Math.max(max, placement.worldX + placement.worldWidth),
    240,
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

  // Items: every item, in document order.
  parts.push('<g data-layer="items">');
  for (const item of scheduleDocument.items) {
    const placement = placementById.get(item.id);
    if (placement === undefined) {
      continue;
    }
    const x = originX + placement.worldX;
    const y = originY + placement.worldY;
    const width = placement.worldWidth;
    const height = placement.worldHeight;
    parts.push(`<g data-item-id="${escapeSvg(item.id)}">`);

    const importedAsset = item.importedAssetId !== undefined ? assetById.get(item.importedAssetId) : undefined;
    if (importedAsset !== undefined) {
      // Embedded, sanitized data URI only -- never an external reference.
      parts.push(
        `<image x="${x}" y="${y}" width="${width}" height="${height}" href="${escapeSvg(
          importedAsset.sanitizedDataUri,
        )}" preserveAspectRatio="xMidYMid meet"/>`,
      );
    } else if (item.itemKind === 'milestone') {
      parts.push(renderMilestone(x, y, width, height, item.fillColor, item.strokeColor));
    } else if (hasFade(item.fadeInDays, item.fadeOutDays)) {
      parts.push(renderFadedTask(item, x, y, height, scheduleDocument.viewState.zoomX));
    } else {
      parts.push(
        `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="2" fill="${escapeSvg(
          item.fillColor,
        )}" stroke="${escapeSvg(item.strokeColor)}" stroke-width="1"/>`,
      );
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

/**
 * Draw a faded task as its 4-point trapezoid/parallelogram polygon (ITEM fade
 * cross-fade), matching the on-screen renderer. `x`/`y` are the exported top-left
 * of the item's start; `height` its lane height; `zoomX` the horizontal density.
 */
function renderFadedTask(
  item: ScheduleItem,
  x: number,
  y: number,
  height: number,
  zoomX: number,
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
    item.fillColor,
  )}" stroke="${escapeSvg(item.strokeColor)}" stroke-width="1"/>`;
}

/** Draw a milestone glyph centered in its box (diamond as the neutral default). */
function renderMilestone(
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string,
): string {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const radius = Math.min(width, height) / 2;
  const points = `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`;
  return `<polygon points="${points}" fill="${escapeSvg(fillColor)}" stroke="${escapeSvg(
    strokeColor,
  )}" stroke-width="1"/>`;
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

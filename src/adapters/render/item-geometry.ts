/**
 * Adapter layer: pure geometry helpers for item glyphs shared by the item render
 * layer and the item hit-tester (H-1 split). Moved verbatim so the drawn glyph,
 * its fade handles, its label box and the grab math are computed identically.
 */

import type { ItemPlacement } from '../../domain/usecase/layout-engine.js';
import type { ScheduleItem, ViewState } from '../../domain/model/schedule-model.js';
import {
  fadeTrapezoidPoints,
  type FadePoint,
} from '../../domain/usecase/fade-geometry.js';
import { pixelsPerDay, toDayNumber } from '../../domain/usecase/time-coordinate-mapper.js';
import {
  effectiveMilestoneShape,
  effectiveTaskShape,
  TASK_CONNECTOR_LABEL_Y_FRACTION,
  type TaskGlyphOptions,
} from '../../domain/usecase/task-glyph.js';

/** Font pixel size per font-scale step. */
export const FONT_SIZE_BY_SCALE: Record<ViewState['fontScale'], number> = { S: 10, M: 12, L: 14 };

/**
 * A task's abbreviation font-size is 90% of the RENDERED bar height (item 1) so it
 * reads as a big in-bar label that scales with the bar, not a fixed side caption.
 */
export const TASK_ABBREV_FONT_HEIGHT_RATIO = 0.9;

/** Floor for the task abbreviation font-size so an extremely thin bar stays legible. */
export const TASK_ABBREV_FONT_MIN_PX = 6;

/** Stroke width (px) of the line-style arrow glyph -- the thicker (thick) weight (item 3). */
export const TASK_LINE_ARROW_STROKE_PX = 3;

/**
 * The abbreviation font-size for a task: 90% of its rendered bar height, clamped up
 * to {@link TASK_ABBREV_FONT_MIN_PX} for a very thin bar (item 1).
 *
 * @param barHeightPx - The task's rendered bar (band) height in px.
 * @returns The abbreviation font-size in px.
 */
export function taskAbbrevFontSize(barHeightPx: number): number {
  return Math.max(TASK_ABBREV_FONT_MIN_PX, barHeightPx * TASK_ABBREV_FONT_HEIGHT_RATIO);
}

/**
 * The chevron fade extents (left concave depth / right point length) in world px,
 * derived from the item's fade-in / fade-out days and its rendered pixels-per-day.
 * Returns empty extents for a zero-length span (the glyph then uses its default
 * notch). Pure -- used by the renderer to draw a chevron's fade (item 5).
 *
 * @param item - The chevron task item.
 * @param placement - Its laid-out rectangle (world px).
 * @returns Fade extents in px for {@link taskGlyphPath}.
 */
export function chevronFadeExtentsPx(item: ScheduleItem, placement: ItemPlacement): TaskGlyphOptions {
  const startDay = toDayNumber(item.startDate);
  const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
  const lengthDays = endDay - startDay;
  if (lengthDays <= 0) {
    return {};
  }
  const perDay = placement.worldWidth / lengthDays;
  return {
    fadeInPx: (item.fadeInDays ?? 0) * perDay,
    fadeOutPx: (item.fadeOutDays ?? 0) * perDay,
  };
}

/**
 * Screen-pixel HALF-extent of the DRAWN corner handle square (side = 2x this).
 * Halved from the original 9 (18px square) to 4.5 (9px square) so the handles are
 * a discreet marker, not the oversized blocks the user reported; the larger grab
 * tolerance keeps them easy to grab.
 */
export const ANNOTATION_HANDLE_DRAW_HALF_PX = 4.5;

/**
 * Resolve an item's stroke color to an SVG `stroke` attribute value. A blank,
 * `transparent` or `none` color yields `'none'` so the item draws NO border by
 * default (item 2); any other color is returned verbatim (a solid border).
 */
export function resolveStrokeAttribute(strokeColor: string): string {
  const value = strokeColor.trim().toLowerCase();
  return value === '' || value === 'transparent' || value === 'none' ? 'none' : strokeColor;
}

/** Map a line-weight step to a stroke width in CSS pixels. */
export function strokeWidthPx(lineWeight: ScheduleItem['lineWeight']): number {
  switch (lineWeight) {
    case 'thin':
      return 1;
    case 'thick':
      return 3;
    case 'medium':
    default:
      return 2;
  }
}

/** Anchor position + text-anchor for an item's abbreviation label. */
export function labelAnchorPoint(
  item: ScheduleItem,
  placement: ItemPlacement,
): { x: number; y: number; textAnchor: string } {
  const centerX = placement.worldX + placement.worldWidth / 2;
  const centerY = placement.worldY + placement.worldHeight / 2;
  const right = placement.worldX + placement.worldWidth + 4;
  const position = item.labelPosition ?? 'auto';
  let base: { x: number; y: number; textAnchor: string };
  switch (position) {
    case 'center':
      base = { x: centerX, y: centerY, textAnchor: 'middle' };
      break;
    case 'top':
      base = { x: centerX, y: placement.worldY - 4, textAnchor: 'middle' };
      break;
    case 'bottom':
      base = { x: centerX, y: placement.worldY + placement.worldHeight + 10, textAnchor: 'middle' };
      break;
    case 'left':
      base = { x: placement.worldX - 4, y: centerY, textAnchor: 'end' };
      break;
    case 'right':
      base = { x: right, y: centerY, textAnchor: 'start' };
      break;
    case 'auto':
    default:
      base = autoLabelAnchor(item, placement, centerX, centerY, right);
      break;
  }
  const offset = item.labelOffset;
  return offset === undefined
    ? base
    : { x: base.x + offset.dx, y: base.y + offset.dy, textAnchor: base.textAnchor };
}

/**
 * The `auto` (default) label anchor. A TASK centers its abbreviation inside the bar
 * (item 2): a plain bar / chevron centers on both axes; an arrow / span moves the
 * connector line to the lower band and places the label in the UPPER part, so it
 * sits ABOVE the line (items 3 / 4). A MILESTONE keeps its side (right) label.
 */
function autoLabelAnchor(
  item: ScheduleItem,
  placement: ItemPlacement,
  centerX: number,
  centerY: number,
  right: number,
): { x: number; y: number; textAnchor: string } {
  if (item.itemKind !== 'task') {
    // Milestones keep a side label to the right of the point glyph.
    return { x: right, y: centerY, textAnchor: 'start' };
  }
  const shape = effectiveTaskShape(item);
  if (shape === 'arrow' || shape === 'span') {
    return {
      x: centerX,
      y: placement.worldY + placement.worldHeight * TASK_CONNECTOR_LABEL_Y_FRACTION,
      textAnchor: 'middle',
    };
  }
  return { x: centerX, y: centerY, textAnchor: 'middle' };
}

/** Approximate whether a world point falls on an item's abbreviation label. */
export function pointInLabelBox(
  item: ScheduleItem,
  placement: ItemPlacement,
  fontSize: number,
  worldX: number,
  worldY: number,
): boolean {
  const anchor = labelAnchorPoint(item, placement);
  const width = Math.max(8, item.abbrev.length * fontSize * 0.62);
  const left =
    anchor.textAnchor === 'middle'
      ? anchor.x - width / 2
      : anchor.textAnchor === 'end'
        ? anchor.x - width
        : anchor.x;
  const top = anchor.y - fontSize * 0.8;
  return (
    worldX >= left && worldX <= left + width && worldY >= top && worldY <= top + fontSize * 1.4
  );
}

/**
 * World-space vertices of a task's fade trapezoid, using the same day->x mapping
 * as the layout so the polygon tracks zoom/scroll exactly. `top` is the lane's
 * upper (smaller-y) edge; `bottom` its lower edge.
 */
export function taskFadePoints(
  item: ScheduleItem,
  placement: ItemPlacement,
  zoomX: number,
): readonly FadePoint[] {
  const startDay = toDayNumber(item.startDate);
  const endDay = item.endDate === null ? startDay : toDayNumber(item.endDate);
  const perDay = pixelsPerDay(zoomX);
  return fadeTrapezoidPoints({
    startDay,
    endDay,
    fadeInDays: item.fadeInDays ?? 0,
    fadeOutDays: item.fadeOutDays ?? 0,
    top: placement.worldY,
    bottom: placement.worldY + placement.worldHeight,
    dayToX: (day) => placement.worldX + (day - startDay) * perDay,
  });
}

/**
 * The two fade drag-handle centers of a selected task in world space: the
 * top-left vertex (drives fade-in) and the bottom-right vertex (drives fade-out).
 * Derived from {@link taskFadePoints} so the handles always sit on the drawn
 * corners, whether the bar is a rectangle, trapezoid or parallelogram.
 */
export function taskFadeHandleCenters(
  item: ScheduleItem,
  placement: ItemPlacement,
  zoomX: number,
): { readonly fadeIn: FadePoint; readonly fadeOut: FadePoint } {
  const points = taskFadePoints(item, placement, zoomX);
  // Vertex order: [bottom-left, bottom-right, top-right, top-left].
  return { fadeOut: points[1] as FadePoint, fadeIn: points[3] as FadePoint };
}

/** Build the SVG path `d` for a milestone glyph centered at (cx, cy). */
export function milestonePath(item: ScheduleItem, cx: number, cy: number, radius: number): string {
  const shape = effectiveMilestoneShape(item);
  switch (shape) {
    case 'circle': {
      // Two arcs form a full circle.
      return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
    }
    case 'square':
      return `M ${cx - radius} ${cy - radius} h ${radius * 2} v ${radius * 2} h ${-radius * 2} Z`;
    case 'triangle':
      return `M ${cx} ${cy - radius} L ${cx + radius} ${cy + radius} L ${cx - radius} ${cy + radius} Z`;
    case 'star':
      return starPath(cx, cy, radius);
    case 'diamond':
    default:
      return `M ${cx} ${cy - radius} L ${cx + radius} ${cy} L ${cx} ${cy + radius} L ${cx - radius} ${cy} Z`;
  }
}

/** Build a five-point star path centered at (cx, cy). */
export function starPath(cx: number, cy: number, radius: number): string {
  const points: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const currentRadius = index % 2 === 0 ? radius : radius * 0.5;
    const angle = (Math.PI / 5) * index - Math.PI / 2;
    const x = cx + currentRadius * Math.cos(angle);
    const y = cy + currentRadius * Math.sin(angle);
    points.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  return `${points.join(' ')} Z`;
}

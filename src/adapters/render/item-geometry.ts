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
import { effectiveMilestoneShape } from '../../domain/usecase/task-glyph.js';

/** Font pixel size per font-scale step. */
export const FONT_SIZE_BY_SCALE: Record<ViewState['fontScale'], number> = { S: 10, M: 12, L: 14 };

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
    case 'auto':
    default:
      base = { x: right, y: centerY, textAnchor: 'start' };
      break;
  }
  const offset = item.labelOffset;
  return offset === undefined
    ? base
    : { x: base.x + offset.dx, y: base.y + offset.dy, textAnchor: base.textAnchor };
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

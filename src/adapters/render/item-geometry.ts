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
 * Horizontal inset (px) of an `inner-left` label from the task bar's left edge, so the
 * left-aligned in-bar abbreviation is not flush against the border (CR-003 Part 2).
 */
export const INNER_LEFT_LABEL_PAD_PX = 4;

/**
 * Approximate per-character advance as a fraction of the font size, used to estimate
 * an abbreviation's rendered pixel WIDTH without a live text-measuring pass. Matches
 * the value {@link pointInLabelBox} already uses for its hit box.
 */
export const LABEL_CHAR_WIDTH_RATIO = 0.62;

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
    case 'inner-left':
      // Inside the bar, left-aligned (CR-003 Part 2): distinct from `left` (OUTSIDE
      // the bar). Overflow past the bar's right edge is allowed; the layout engine's
      // collision pass shifts a later colliding item down within its section band.
      base = {
        x: placement.worldX + INNER_LEFT_LABEL_PAD_PX,
        y: centerY,
        textAnchor: 'start',
      };
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
 * The `auto` (default) label anchor. A plain bar / chevron TASK pins its abbreviation
 * INSIDE the bar, LEFT-aligned (`inner-left`, the CR-003 Part 2 task default); an arrow
 * / span moves the connector line to the lower band and places the label in the UPPER
 * part, so it sits ABOVE the line (items 3 / 4). A MILESTONE keeps its side label to
 * the RIGHT of the point glyph (ITEM-L2-003).
 */
function autoLabelAnchor(
  item: ScheduleItem,
  placement: ItemPlacement,
  _centerX: number,
  centerY: number,
  right: number,
): { x: number; y: number; textAnchor: string } {
  if (item.itemKind !== 'task') {
    // Milestones keep a side label to the right of the point glyph (ITEM-L2-003).
    return { x: right, y: centerY, textAnchor: 'start' };
  }
  const shape = effectiveTaskShape(item);
  if (shape === 'arrow' || shape === 'span') {
    return {
      x: _centerX,
      y: placement.worldY + placement.worldHeight * TASK_CONNECTOR_LABEL_Y_FRACTION,
      textAnchor: 'middle',
    };
  }
  // Plain bar / chevron: inside the bar, left-aligned (CR-003 Part 2 default).
  return {
    x: placement.worldX + INNER_LEFT_LABEL_PAD_PX,
    y: centerY,
    textAnchor: 'start',
  };
}

/**
 * Whether a task's abbreviation is drawn INSIDE the bar, left-aligned -- either an
 * explicit `inner-left` or the plain bar / chevron default (`auto`). Arrow / span keep
 * the centered label above the connector line and never take the inner-left path.
 */
export function resolvesToInnerLeftLabel(item: ScheduleItem): boolean {
  if (item.itemKind !== 'task') {
    return false;
  }
  const position = item.labelPosition ?? 'auto';
  if (position === 'inner-left') {
    return true;
  }
  if (position !== 'auto') {
    return false;
  }
  const shape = effectiveTaskShape(item);
  return shape !== 'arrow' && shape !== 'span';
}

/**
 * Estimate the RIGHTWARD pixel extent, measured from the item's start x, occupied by a
 * task's `inner-left` abbreviation (CR-003 Part 2). This is the pad plus the estimated
 * label width; the label is allowed to overflow the bar's right edge, so this extent
 * feeds the layout engine's collision-avoidance pass (a later item whose bar starts
 * inside this extent is shifted down into a new lane). Returns 0 for any item whose
 * label is not an inner-left in-bar label, so only the overflow case perturbs layout.
 *
 * @param item - The item whose label extent to estimate.
 * @param barHeightPx - The item's rendered bar (band) height, which sizes the font.
 * @returns The rightward label extent in px from the item's start x (0 when N/A).
 */
export function estimateInnerLeftLabelExtentPx(item: ScheduleItem, barHeightPx: number): number {
  if (!resolvesToInnerLeftLabel(item)) {
    return 0;
  }
  const fontSize = taskAbbrevFontSize(barHeightPx);
  const labelWidth = item.abbrev.length * fontSize * LABEL_CHAR_WIDTH_RATIO;
  return INNER_LEFT_LABEL_PAD_PX + labelWidth;
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

/**
 * The special CR-004 Part 6c milestone shapes drawn as composite (multi-subpath)
 * SVG glyphs. Rendered with the `evenodd` fill-rule so an inner subpath (a floppy's
 * label window, a smiley's eyes / mouth, a cylinder rim) punches a hole through the
 * filled silhouette, keeping each glyph recognizable as a single-color path.
 */
const EVEN_ODD_MILESTONE_SHAPES: ReadonlySet<string> = new Set([
  'file',
  'box3d',
  'floppy',
  'cylinder',
  'person',
  'smiley',
  'beer',
]);

/**
 * Whether a milestone shape must fill with the `evenodd` rule so its inner subpaths
 * read as holes (the CR-004 Part 6c composite glyphs). The base shapes use the
 * default `nonzero` rule.
 */
export function milestoneShapeUsesEvenOdd(item: ScheduleItem): boolean {
  return EVEN_ODD_MILESTONE_SHAPES.has(effectiveMilestoneShape(item));
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
    case 'file':
      return fileGlyphPath(cx, cy, radius);
    case 'box3d':
      return box3dGlyphPath(cx, cy, radius);
    case 'floppy':
      return floppyGlyphPath(cx, cy, radius);
    case 'cylinder':
      return cylinderGlyphPath(cx, cy, radius);
    case 'person':
      return personGlyphPath(cx, cy, radius);
    case 'smiley':
      return smileyGlyphPath(cx, cy, radius);
    case 'beer':
      return beerGlyphPath(cx, cy, radius);
    case 'diamond':
    default:
      return `M ${cx} ${cy - radius} L ${cx + radius} ${cy} L ${cx} ${cy + radius} L ${cx - radius} ${cy} Z`;
  }
}

/** Round a glyph-path coordinate to 2 decimals so paths stay compact/ASCII. */
function roundCoord2(value: number): string {
  return (Math.round(value * 100) / 100).toString();
}

/**
 * File glyph (CR-004 Part 6c): a portrait sheet of paper with a folded top-right
 * corner -- the "drawing / document deadline" milestone. The dog-eared corner is a
 * second subpath so the fold reads even when filled (evenodd).
 */
function fileGlyphPath(cx: number, cy: number, r: number): string {
  const left = cx - r * 0.68;
  const right = cx + r * 0.68;
  const top = cy - r;
  const bottom = cy + r;
  const foldX = cx + r * 0.2;
  const foldY = cy - r * 0.5;
  const body =
    `M ${roundCoord2(left)} ${roundCoord2(top)} L ${roundCoord2(foldX)} ${roundCoord2(top)} L ${roundCoord2(right)} ${roundCoord2(foldY)} ` +
    `L ${roundCoord2(right)} ${roundCoord2(bottom)} L ${roundCoord2(left)} ${roundCoord2(bottom)} Z`;
  const fold = `M ${roundCoord2(foldX)} ${roundCoord2(top)} L ${roundCoord2(foldX)} ${roundCoord2(foldY)} L ${roundCoord2(right)} ${roundCoord2(foldY)} Z`;
  return `${body} ${fold}`;
}

/**
 * 3D box glyph (CR-004 Part 6c): an isometric cube (front / top / right faces) --
 * the "physical hardware deliverable" milestone. Three tiled face subpaths give the
 * cube its depth when filled with evenodd.
 */
function box3dGlyphPath(cx: number, cy: number, r: number): string {
  const front =
    `M ${roundCoord2(cx - r)} ${roundCoord2(cy - r * 0.4)} L ${roundCoord2(cx + r * 0.4)} ${roundCoord2(cy - r * 0.4)} ` +
    `L ${roundCoord2(cx + r * 0.4)} ${roundCoord2(cy + r)} L ${roundCoord2(cx - r)} ${roundCoord2(cy + r)} Z`;
  const top =
    `M ${roundCoord2(cx - r)} ${roundCoord2(cy - r * 0.4)} L ${roundCoord2(cx - r * 0.4)} ${roundCoord2(cy - r)} ` +
    `L ${roundCoord2(cx + r)} ${roundCoord2(cy - r)} L ${roundCoord2(cx + r * 0.4)} ${roundCoord2(cy - r * 0.4)} Z`;
  const side =
    `M ${roundCoord2(cx + r * 0.4)} ${roundCoord2(cy - r * 0.4)} L ${roundCoord2(cx + r)} ${roundCoord2(cy - r)} ` +
    `L ${roundCoord2(cx + r)} ${roundCoord2(cy + r * 0.4)} L ${roundCoord2(cx + r * 0.4)} ${roundCoord2(cy + r)} Z`;
  return `${front} ${top} ${side}`;
}

/**
 * Floppy-disk glyph (CR-004 Part 6c): a diskette with a clipped top-right corner, a
 * label window (bottom) and a shutter (top) -- the "software release" milestone. The
 * window and shutter are hole subpaths (evenodd).
 */
function floppyGlyphPath(cx: number, cy: number, r: number): string {
  const left = cx - r;
  const right = cx + r;
  const top = cy - r;
  const bottom = cy + r;
  const clip = r * 0.4;
  const outer =
    `M ${roundCoord2(left)} ${roundCoord2(top)} L ${roundCoord2(right - clip)} ${roundCoord2(top)} L ${roundCoord2(right)} ${roundCoord2(top + clip)} ` +
    `L ${roundCoord2(right)} ${roundCoord2(bottom)} L ${roundCoord2(left)} ${roundCoord2(bottom)} Z`;
  const label =
    `M ${roundCoord2(cx - r * 0.5)} ${roundCoord2(cy + r * 0.1)} L ${roundCoord2(cx + r * 0.5)} ${roundCoord2(cy + r * 0.1)} ` +
    `L ${roundCoord2(cx + r * 0.5)} ${roundCoord2(bottom)} L ${roundCoord2(cx - r * 0.5)} ${roundCoord2(bottom)} Z`;
  const shutter =
    `M ${roundCoord2(cx + r * 0.1)} ${roundCoord2(top)} L ${roundCoord2(cx + r * 0.5)} ${roundCoord2(top)} ` +
    `L ${roundCoord2(cx + r * 0.5)} ${roundCoord2(cy - r * 0.45)} L ${roundCoord2(cx + r * 0.1)} ${roundCoord2(cy - r * 0.45)} Z`;
  return `${outer} ${label} ${shutter}`;
}

/**
 * Cylinder / database glyph (CR-004 Part 6c): a vertical cylinder with an elliptical
 * top rim -- the "deploy to server" milestone. The visible front rim arc is a second
 * subpath so the top ellipse reads when filled.
 */
function cylinderGlyphPath(cx: number, cy: number, r: number): string {
  const rx = r * 0.8;
  const ry = r * 0.3;
  const topY = cy - r * 0.6;
  const bottomY = cy + r * 0.6;
  const body =
    `M ${roundCoord2(cx - rx)} ${roundCoord2(topY)} ` +
    `A ${roundCoord2(rx)} ${roundCoord2(ry)} 0 0 1 ${roundCoord2(cx + rx)} ${roundCoord2(topY)} ` +
    `L ${roundCoord2(cx + rx)} ${roundCoord2(bottomY)} ` +
    `A ${roundCoord2(rx)} ${roundCoord2(ry)} 0 0 1 ${roundCoord2(cx - rx)} ${roundCoord2(bottomY)} Z`;
  const rim =
    `M ${roundCoord2(cx - rx)} ${roundCoord2(topY)} ` +
    `A ${roundCoord2(rx)} ${roundCoord2(ry)} 0 0 0 ${roundCoord2(cx + rx)} ${roundCoord2(topY)} ` +
    `A ${roundCoord2(rx)} ${roundCoord2(ry)} 0 0 0 ${roundCoord2(cx - rx)} ${roundCoord2(topY)} Z`;
  return `${body} ${rim}`;
}

/**
 * Person glyph (CR-004 Part 6c): a simple head-and-shoulders silhouette -- the
 * "report to management" milestone. A head disc plus a shoulder hump (two subpaths).
 */
function personGlyphPath(cx: number, cy: number, r: number): string {
  const headR = r * 0.4;
  const headCy = cy - r * 0.45;
  const head =
    `M ${roundCoord2(cx - headR)} ${roundCoord2(headCy)} ` +
    `a ${roundCoord2(headR)} ${roundCoord2(headR)} 0 1 0 ${roundCoord2(headR * 2)} 0 ` +
    `a ${roundCoord2(headR)} ${roundCoord2(headR)} 0 1 0 ${roundCoord2(-headR * 2)} 0 Z`;
  const shoulders =
    `M ${roundCoord2(cx - r * 0.9)} ${roundCoord2(cy + r)} ` +
    `C ${roundCoord2(cx - r * 0.9)} ${roundCoord2(cy + r * 0.1)} ${roundCoord2(cx + r * 0.9)} ${roundCoord2(cy + r * 0.1)} ${roundCoord2(cx + r * 0.9)} ${roundCoord2(cy + r)} Z`;
  return `${head} ${shoulders}`;
}

/**
 * Smiley glyph (CR-004 Part 6c): a filled face disc with two eyes and a smile cut
 * out as holes (evenodd) -- the "fun event" milestone.
 */
function smileyGlyphPath(cx: number, cy: number, r: number): string {
  const face =
    `M ${roundCoord2(cx - r)} ${roundCoord2(cy)} a ${roundCoord2(r)} ${roundCoord2(r)} 0 1 0 ${roundCoord2(r * 2)} 0 ` +
    `a ${roundCoord2(r)} ${roundCoord2(r)} 0 1 0 ${roundCoord2(-r * 2)} 0 Z`;
  const eyeR = r * 0.14;
  const eye = (ex: number): string =>
    `M ${roundCoord2(ex - eyeR)} ${roundCoord2(cy - r * 0.3)} a ${roundCoord2(eyeR)} ${roundCoord2(eyeR)} 0 1 0 ${roundCoord2(eyeR * 2)} 0 ` +
    `a ${roundCoord2(eyeR)} ${roundCoord2(eyeR)} 0 1 0 ${roundCoord2(-eyeR * 2)} 0 Z`;
  const mouth =
    `M ${roundCoord2(cx - r * 0.5)} ${roundCoord2(cy + r * 0.12)} ` +
    `Q ${roundCoord2(cx)} ${roundCoord2(cy + r * 0.72)} ${roundCoord2(cx + r * 0.5)} ${roundCoord2(cy + r * 0.12)} ` +
    `Q ${roundCoord2(cx)} ${roundCoord2(cy + r * 0.42)} ${roundCoord2(cx - r * 0.5)} ${roundCoord2(cy + r * 0.12)} Z`;
  return `${face} ${eye(cx - r * 0.38)} ${eye(cx + r * 0.38)} ${mouth}`;
}

/**
 * Beer-tumbler glyph (CR-004 Part 6c): a tapered glass topped by a scalloped foam
 * head -- the "drinking party" milestone. Foam and glass are two filled subpaths.
 */
function beerGlyphPath(cx: number, cy: number, r: number): string {
  const glass =
    `M ${roundCoord2(cx - r * 0.6)} ${roundCoord2(cy - r * 0.35)} L ${roundCoord2(cx + r * 0.6)} ${roundCoord2(cy - r * 0.35)} ` +
    `L ${roundCoord2(cx + r * 0.45)} ${roundCoord2(cy + r)} L ${roundCoord2(cx - r * 0.45)} ${roundCoord2(cy + r)} Z`;
  const foam =
    `M ${roundCoord2(cx - r * 0.65)} ${roundCoord2(cy - r * 0.3)} ` +
    `Q ${roundCoord2(cx - r * 0.7)} ${roundCoord2(cy - r * 0.75)} ${roundCoord2(cx - r * 0.25)} ${roundCoord2(cy - r * 0.6)} ` +
    `Q ${roundCoord2(cx)} ${roundCoord2(cy - r)} ${roundCoord2(cx + r * 0.25)} ${roundCoord2(cy - r * 0.6)} ` +
    `Q ${roundCoord2(cx + r * 0.7)} ${roundCoord2(cy - r * 0.75)} ${roundCoord2(cx + r * 0.65)} ${roundCoord2(cy - r * 0.3)} Z`;
  return `${glass} ${foam}`;
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

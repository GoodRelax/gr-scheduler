/**
 * UseCase layer: task/milestone glyph-shape resolution and path geometry for the
 * `icon_shape_kind` property (item: task-type / icon-shape). Pure, no DOM.
 *
 * The renderer draws a task as one of four shapes -- a plain `bar` (rect / fade
 * trapezoid, handled by the fade geometry), a block `arrow`, a feather/ribbon
 * `chevron` (矢羽根), or a `span` `*--*` connector -- and a milestone as one of the
 * five milestone glyphs. This module resolves an item's EFFECTIVE shape from its
 * unified {@link ScheduleItem.iconShapeKind}, falling back to the legacy
 * `taskShape` / `milestoneShape` fields so pre-`icon_shape_kind` documents still
 * render, and builds the SVG path `d` for the non-bar task shapes.
 */

import type {
  IconShapeKind,
  MilestoneShape,
  ScheduleItem,
  TaskShape,
} from '../model/schedule-model.js';

/** An axis-aligned world-space rectangle a task glyph is drawn into. */
export interface GlyphRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The set of task shapes, used to discriminate an {@link IconShapeKind}. */
const TASK_SHAPE_SET: ReadonlySet<string> = new Set(['bar', 'arrow', 'chevron', 'span']);

/**
 * The effective task shape a task item renders as: its {@link ScheduleItem.
 * iconShapeKind} when that is a task shape, else the legacy {@link ScheduleItem.
 * taskShape}, else `bar`. A milestone's kind is ignored here (callers gate on
 * `itemKind === 'task'`).
 *
 * @param item - The item to resolve.
 * @returns The task shape driving rendering.
 */
export function effectiveTaskShape(item: ScheduleItem): TaskShape {
  const kind = item.iconShapeKind;
  if (kind !== undefined && TASK_SHAPE_SET.has(kind)) {
    return kind as TaskShape;
  }
  return item.taskShape ?? 'bar';
}

/**
 * The effective milestone shape a milestone item renders as: its {@link
 * ScheduleItem.iconShapeKind} when that is a milestone shape, else the legacy
 * {@link ScheduleItem.milestoneShape}, else `diamond`.
 *
 * @param item - The item to resolve.
 * @returns The milestone shape driving rendering.
 */
export function effectiveMilestoneShape(item: ScheduleItem): MilestoneShape {
  const kind = item.iconShapeKind;
  if (kind !== undefined && !TASK_SHAPE_SET.has(kind)) {
    return kind as MilestoneShape;
  }
  return item.milestoneShape ?? 'diamond';
}

/** True when a shape draws as an SVG `path` (arrow / chevron / span), not a rect. */
export function taskShapeUsesPath(shape: TaskShape): boolean {
  return shape === 'arrow' || shape === 'chevron' || shape === 'span';
}

/** True when a shape is a thin STROKED connector with no fill (the `span` `*--*`). */
export function taskShapeIsStroked(shape: TaskShape): boolean {
  return shape === 'span';
}

/**
 * How a task glyph paints:
 * - `fill`           -- a filled body drawn with the item's own border (bar / chevron).
 * - `line`           -- a stroked line + open arrowhead, no fill (arrow).
 * - `line-with-dots` -- a stroked connector whose filled dot terminals need a fill (span).
 */
export type TaskGlyphPaintMode = 'fill' | 'line' | 'line-with-dots';

/** The paint model for a task shape (drives fill/stroke in the renderer). */
export function taskGlyphPaintMode(shape: TaskShape): TaskGlyphPaintMode {
  switch (shape) {
    case 'arrow':
      return 'line';
    case 'span':
      return 'line-with-dots';
    case 'chevron':
    case 'bar':
    default:
      return 'fill';
  }
}

/**
 * Vertical position of the connector LINE for the line-style task glyphs
 * (arrow / span), as a fraction of the band height. Placed in the LOWER part so a
 * centered abbreviation sits ABOVE the line without overlapping it (items 3 / 4).
 */
export const TASK_CONNECTOR_LINE_Y_FRACTION = 0.72;

/**
 * Vertical position of a line-style task's ABBREVIATION, as a fraction of the band
 * height: in the UPPER part, above {@link TASK_CONNECTOR_LINE_Y_FRACTION}, so the
 * label fits above the arrow / span line.
 */
export const TASK_CONNECTOR_LABEL_Y_FRACTION = 0.34;

/**
 * Default fade-in / fade-out period (whole days) applied to a NEWLY CREATED chevron
 * (矢羽根): a 2-week feather on each end (item 5). Other task shapes start square.
 */
export const CHEVRON_DEFAULT_FADE_DAYS = 14;

/**
 * The default fade-in / fade-out days for a newly created task of the given shape.
 * A chevron gets a {@link CHEVRON_DEFAULT_FADE_DAYS}-day feather on each end so the
 * concave (fade-in) left and pointed (fade-out) right are visible immediately;
 * every other shape starts with square (0/0) ends.
 *
 * @param shape - The armed task shape being created.
 * @returns The default fade pair for the shape.
 */
export function defaultFadeDaysForTaskShape(shape: TaskShape): {
  readonly fadeInDays: number;
  readonly fadeOutDays: number;
} {
  return shape === 'chevron'
    ? { fadeInDays: CHEVRON_DEFAULT_FADE_DAYS, fadeOutDays: CHEVRON_DEFAULT_FADE_DAYS }
    : { fadeInDays: 0, fadeOutDays: 0 };
}

/** Tuning inputs for a non-bar task glyph path (chevron fade extents, in world px). */
export interface TaskGlyphOptions {
  /** Left concave depth for a chevron, in world px (derived from fade-in days). */
  readonly fadeInPx?: number;
  /** Right point length for a chevron, in world px (derived from fade-out days). */
  readonly fadeOutPx?: number;
}

/** The unified icon-shape kind for a newly created item of the given family. */
export function iconShapeKindForCreate(
  itemKind: 'milestone' | 'task',
  milestoneShape: MilestoneShape | undefined,
  taskShape: TaskShape | undefined,
): IconShapeKind {
  return itemKind === 'milestone' ? (milestoneShape ?? 'diamond') : (taskShape ?? 'bar');
}

/**
 * Build the SVG path `d` for a non-bar task shape inside a world-space rectangle.
 *
 * - `arrow`   -- a LINE arrow: a horizontal shaft ending in an open (V) arrowhead,
 *                drawn in the LOWER part of the band (stroked, no fill) so the
 *                centered abbreviation fits above it (item 3).
 * - `chevron` -- a feather/ribbon arrow (矢羽根): pointed right end (fade-out) and a
 *                concave left end (fade-in); the extents grow with the fade options
 *                so the glyph visualizes the fade (item 5).
 * - `span`    -- a `*---*` connector: a horizontal line spanning start->end with a
 *                small FILLED dot at BOTH ends, drawn in the LOWER part so the label
 *                sits above it (item 4).
 *
 * @param shape - The task shape (arrow / chevron / span; `bar` returns an empty string).
 * @param rect - The world-space rectangle the glyph fills.
 * @param options - Chevron fade extents in world px (ignored by arrow / span).
 * @returns The SVG path data string.
 */
export function taskGlyphPath(
  shape: TaskShape,
  rect: GlyphRect,
  options: TaskGlyphOptions = {},
): string {
  const { x, y, width, height } = rect;
  const right = x + width;
  switch (shape) {
    case 'arrow':
      return lineArrowPath(x, right, y, width, height);
    case 'chevron':
      return chevronPath(x, right, y, width, height, options);
    case 'span':
      return spanConnectorPath(x, right, y, width, height);
    case 'bar':
    default:
      return '';
  }
}

/** A line arrow: a shaft to the tip plus an open (two-stroke) arrowhead, in the lower band. */
function lineArrowPath(x: number, right: number, y: number, width: number, height: number): string {
  const lineY = y + height * TASK_CONNECTOR_LINE_Y_FRACTION;
  const headLen = Math.max(2, Math.min(width, height * 0.5));
  const headHalf = Math.min(height * 0.22, headLen);
  const backX = right - headLen;
  return (
    `M ${x} ${lineY} L ${right} ${lineY} ` +
    `M ${backX} ${lineY - headHalf} L ${right} ${lineY} L ${backX} ${lineY + headHalf}`
  );
}

/** A `*---*` connector: a shaft plus a small filled disc subpath at each end, in the lower band. */
function spanConnectorPath(x: number, right: number, y: number, width: number, height: number): string {
  const lineY = y + height * TASK_CONNECTOR_LINE_Y_FRACTION;
  const dotRadius = Math.max(1.5, Math.min(height * 0.14, width * 0.5, 5));
  return (
    `M ${x} ${lineY} L ${right} ${lineY} ` +
    `${circleSubpath(x, lineY, dotRadius)} ${circleSubpath(right, lineY, dotRadius)}`
  );
}

/** A full-circle subpath (two arcs) for a filled dot terminal. */
function circleSubpath(cx: number, cy: number, radius: number): string {
  return (
    `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 ` +
    `a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`
  );
}

/**
 * A feather/ribbon chevron whose LEFT concave depth grows with the fade-in extent
 * and RIGHT point length grows with the fade-out extent. With no fade a proportional
 * default notch keeps a fade-less chevron reading as a feather; the two extents are
 * clamped so the concave and the point never cross on a short bar.
 */
function chevronPath(
  x: number,
  right: number,
  y: number,
  width: number,
  height: number,
  options: TaskGlyphOptions,
): string {
  const centerY = y + height / 2;
  const bottom = y + height;
  const fallback = Math.max(2, Math.min(width * 0.5, height * 0.5));
  const requestedIn = options.fadeInPx ?? 0;
  const requestedOut = options.fadeOutPx ?? 0;
  const leftDepth = requestedIn > 0 ? requestedIn : fallback;
  const rightLen = requestedOut > 0 ? requestedOut : fallback;
  const total = leftDepth + rightLen;
  const scale = total > width && total > 0 ? width / total : 1;
  const notch = leftDepth * scale;
  const point = rightLen * scale;
  return (
    `M ${x} ${y} L ${right - point} ${y} L ${right} ${centerY} ` +
    `L ${right - point} ${bottom} L ${x} ${bottom} L ${x + notch} ${centerY} Z`
  );
}

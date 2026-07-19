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
 * - `arrow`   -- a block arrow: a rectangular body with a triangular head pointing
 *                right at the end edge.
 * - `chevron` -- a feather/ribbon arrow (矢羽根): pointed right end, notched (concave)
 *                left end.
 * - `span`    -- a `*--*` connector: a horizontal centre line spanning the full width
 *                with a vertical end-marker at BOTH ends (drawn stroked, fill none).
 *
 * @param shape - The task shape (arrow / chevron / span; `bar` returns an empty string).
 * @param rect - The world-space rectangle the glyph fills.
 * @returns The SVG path data string.
 */
export function taskGlyphPath(shape: TaskShape, rect: GlyphRect): string {
  const { x, y, width, height } = rect;
  const right = x + width;
  const centerY = y + height / 2;
  switch (shape) {
    case 'arrow': {
      const headLen = Math.max(2, Math.min(width, Math.min(height, width * 0.4)));
      const bodyRight = right - headLen;
      const bodyTop = y + height * 0.2;
      const bodyBottom = y + height * 0.8;
      return (
        `M ${x} ${bodyTop} L ${bodyRight} ${bodyTop} L ${bodyRight} ${y} ` +
        `L ${right} ${centerY} L ${bodyRight} ${y + height} L ${bodyRight} ${bodyBottom} ` +
        `L ${x} ${bodyBottom} Z`
      );
    }
    case 'chevron': {
      const notch = Math.max(2, Math.min(width * 0.5, height * 0.5));
      return (
        `M ${x} ${y} L ${right - notch} ${y} L ${right} ${centerY} ` +
        `L ${right - notch} ${y + height} L ${x} ${y + height} L ${x + notch} ${centerY} Z`
      );
    }
    case 'span': {
      const capTop = centerY - height * 0.35;
      const capBottom = centerY + height * 0.35;
      return (
        `M ${x} ${centerY} L ${right} ${centerY} ` +
        `M ${x} ${capTop} L ${x} ${capBottom} ` +
        `M ${right} ${capTop} L ${right} ${capBottom}`
      );
    }
    case 'bar':
    default:
      return '';
  }
}

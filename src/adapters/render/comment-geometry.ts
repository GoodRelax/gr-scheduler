/**
 * Adapter layer: screen-space geometry of comment annotations shared by the
 * comment render layer and the annotation hit-tester (H-1 split). The anchor and
 * body-box math must be identical for the drawn callout and its selectable region,
 * so both consume these helpers over the shared {@link RenderContext}.
 */

import type { IsoDate } from '../../domain/model/schedule-model.js';
import type { CommentAnnotation } from '../../domain/model/annotation.js';
import { dateToWorldX } from '../../domain/usecase/time-coordinate-mapper.js';
import { resolveItemAnchorPoint } from '../../domain/usecase/comment-layout.js';
import { placementRect } from './dependency-geometry.js';
import type { RenderContext } from './render-context.js';

/**
 * Screen-space anchor point of a comment (CURS-L1-005). When the comment is
 * ITEM-anchored (`anchorItemId` set and the item is placed), the anchor is the
 * 9-point {@link resolveItemAnchorPoint} on the item's live box, so it FOLLOWS
 * the item as it moves. Otherwise it is the free world point (`anchorDate` /
 * `anchorRowIndex`), which pans/zooms with the canvas.
 */
export function commentAnchorScreenPoint(
  ctx: RenderContext,
  comment: CommentAnnotation,
  epoch: IsoDate,
): { x: number; y: number } {
  if (comment.anchorItemId !== undefined) {
    const placement = ctx.placementById.get(comment.anchorItemId);
    if (placement !== undefined) {
      const world = resolveItemAnchorPoint(placementRect(placement), comment.anchorPoint);
      return { x: ctx.worldToContentX(world.x), y: ctx.worldToContentY(world.y) };
    }
  }
  const anchorWorldX = dateToWorldX(comment.anchorDate, epoch, ctx.viewState.zoomX);
  const rowBand = ctx.rowTop(comment.anchorRowIndex);
  return {
    x: ctx.worldToContentX(anchorWorldX),
    y: ctx.worldToContentY(rowBand + ctx.rowHeight(comment.anchorRowIndex) / 2),
  };
}

/** Screen-space bounding box of a comment's text body (for hit-testing/select). */
export function commentBodyRect(
  ctx: RenderContext,
  comment: CommentAnnotation,
  epoch: IsoDate,
): { x: number; y: number; width: number; height: number } {
  const anchor = commentAnchorScreenPoint(ctx, comment, epoch);
  const bodyX = anchor.x + comment.bodyOffsetPx.dx;
  const bodyY = anchor.y + comment.bodyOffsetPx.dy;
  const width = Math.max(24, comment.text.length * 7 + 10);
  const height = 20;
  return { x: bodyX, y: bodyY - height / 2, width, height };
}

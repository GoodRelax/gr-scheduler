/**
 * Adapter layer: comment annotations in screen space (CURS-L1-005/006, H-1 split).
 * A callout-box (rectangle + short leader) or a polyline leader, with the text at a
 * screen-space offset from its world-space anchor. Drawn after the item glyphs so
 * comments sit above the schedule; the selected comment gets a dashed outline.
 */

import type { CommentAnnotation } from '../../../domain/model/annotation.js';
import { commentLeaderEndpoints } from '../../../domain/usecase/comment-layout.js';
import {
  COMMENT_CALLOUT_FILL_HEX,
  COMMENT_CALLOUT_STROKE_HEX,
  COMMENT_LEADER_STROKE_HEX,
  CUD_BLUE_ACCENT_HEX,
} from '../../../domain/usecase/render-tokens.js';
import { ITEM_LABEL_HEX, SELECTION_DASH_ARRAY } from '../../../domain/usecase/a11y-tokens.js';
import { commentAnchorScreenPoint, commentBodyRect } from '../comment-geometry.js';
import { SVG_NS, type RenderContext } from '../render-context.js';
import { minorCategoryNameFontPx } from '../../../app/font-scale.js';

/** Draws comment callouts / leaders and their selection outline into the overlay. */
export class CommentLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /** Append every comment annotation (and the selected one's outline). */
  public render(ctx: RenderContext): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    for (const annotation of ctx.scheduleDocument.annotations ?? []) {
      if (annotation.annotationKind === 'rounded-box') {
        continue;
      }
      this.drawComment(ctx, annotation);
      // Draw a selection outline for EVERY selected comment (CR-007 Part 4), so a
      // multi-selection (Ctrl+A / marquee / Ctrl+click) highlights all of them. The
      // singly-selected comment is honored too (defensive against a context that only
      // set selectedAnnotationId).
      if (ctx.selectedCommentIds.has(annotation.id) || annotation.id === ctx.selectedAnnotationId) {
        const body = commentBodyRect(ctx, annotation, ctx.scheduleDocument.epochDate);
        const outline = document.createElementNS(SVG_NS, 'rect');
        outline.setAttribute('data-role', 'annotation-selection');
        outline.setAttribute('data-annotation-id', annotation.id);
        outline.setAttribute('x', String(body.x - 2));
        outline.setAttribute('y', String(body.y - 2));
        outline.setAttribute('width', String(body.width + 4));
        outline.setAttribute('height', String(body.height + 4));
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
        outline.setAttribute('stroke-width', '1.5');
        outline.setAttribute('stroke-dasharray', SELECTION_DASH_ARRAY);
        this.overlayGroup.appendChild(outline);
      }
      // The grabbable leader-ANCHOR handle is a single-comment interaction, so it is
      // only drawn for the singly-selected comment (CURS-L1-005, anchor drag).
      if (annotation.id === ctx.selectedAnnotationId) {
        this.drawAnchorHandle(ctx, annotation);
      }
    }
  }

  /**
   * Draw the small circular handle at a selected comment's leader anchor point so
   * the user can grab and drag the anchor to a new free world point (the leader
   * re-routes to it). Carries `data-role="comment-anchor-handle"` for hit-testing.
   */
  private drawAnchorHandle(ctx: RenderContext, comment: CommentAnnotation): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    const anchor = commentAnchorScreenPoint(ctx, comment, ctx.scheduleDocument.epochDate);
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.setAttribute('data-role', 'comment-anchor-handle');
    handle.setAttribute('data-annotation-id', comment.id);
    handle.setAttribute('cx', String(anchor.x));
    handle.setAttribute('cy', String(anchor.y));
    handle.setAttribute('r', '4');
    handle.setAttribute('fill', COMMENT_CALLOUT_FILL_HEX);
    handle.setAttribute('stroke', CUD_BLUE_ACCENT_HEX);
    handle.setAttribute('stroke-width', '1.5');
    // `cursor` as an SVG presentation attribute so the move affordance shows even
    // over the handle (also visible to getComputedStyle in the browser).
    handle.setAttribute('cursor', 'move');
    this.overlayGroup.appendChild(handle);
  }

  private drawComment(ctx: RenderContext, comment: CommentAnnotation): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    const epoch = ctx.scheduleDocument.epochDate;
    const anchor = commentAnchorScreenPoint(ctx, comment, epoch);
    const anchorX = anchor.x;
    const anchorY = anchor.y;
    const bodyX = anchorX + comment.bodyOffsetPx.dx;
    const bodyY = anchorY + comment.bodyOffsetPx.dy;
    const width = Math.max(24, comment.text.length * 7 + 10);
    const height = 20;

    // Cull comments whose leader+body bounding box is off-viewport (M-02).
    const boundLeft = Math.min(anchorX, bodyX);
    const boundTop = Math.min(anchorY, bodyY);
    const boundWidth = Math.abs(bodyX - anchorX) + width;
    const boundHeight = Math.abs(bodyY - anchorY) + height;
    if (!ctx.screenRectVisible(boundLeft, boundTop, boundWidth, boundHeight)) {
      return;
    }

    // The leader runs from the bubble box's nearest edge/corner to the anchor, so a
    // dragged bubble re-routes the leader while still pointing at the same anchor
    // (CURS-L1-006). The bubble box top-left is (bodyX, bodyY - height/2).
    const bubbleRect = { x: bodyX, y: bodyY - height / 2, width, height };
    const { fromBubble } = commentLeaderEndpoints(bubbleRect, { x: anchorX, y: anchorY });

    if (comment.annotationKind === 'callout-box') {
      const box = document.createElementNS(SVG_NS, 'rect');
      box.setAttribute('data-role', 'comment-bubble');
      box.setAttribute('data-annotation-id', comment.id);
      box.setAttribute('x', String(bodyX));
      box.setAttribute('y', String(bodyY - height / 2));
      box.setAttribute('width', String(width));
      box.setAttribute('height', String(height));
      box.setAttribute('rx', '3');
      box.setAttribute('fill', COMMENT_CALLOUT_FILL_HEX);
      box.setAttribute('stroke', COMMENT_CALLOUT_STROKE_HEX);
      box.setAttribute('stroke-width', '1');
      // A pointer (finger) cursor advertises that the bubble is selectable/draggable
      // (`cursor` presentation attribute so it also reads via getComputedStyle).
      box.setAttribute('cursor', 'pointer');
      const leader = document.createElementNS(SVG_NS, 'line');
      leader.setAttribute('data-role', 'comment-leader');
      leader.setAttribute('data-annotation-id', comment.id);
      leader.setAttribute('x1', String(fromBubble.x));
      leader.setAttribute('y1', String(fromBubble.y));
      leader.setAttribute('x2', String(anchorX));
      leader.setAttribute('y2', String(anchorY));
      leader.setAttribute('stroke', COMMENT_CALLOUT_STROKE_HEX);
      leader.setAttribute('stroke-width', '1');
      const text = this.buildCommentText(comment.text, bodyX + 5, bodyY, ctx.viewState.fontScale);
      this.overlayGroup.appendChild(leader);
      this.overlayGroup.appendChild(box);
      this.overlayGroup.appendChild(text);
      return;
    }

    // polyline leader: anchor -> elbow -> bubble edge, then the text at the body.
    const elbowX = (anchorX + fromBubble.x) / 2;
    const leader = document.createElementNS(SVG_NS, 'path');
    leader.setAttribute('data-role', 'comment-leader');
    leader.setAttribute('data-annotation-id', comment.id);
    leader.setAttribute(
      'd',
      `M ${anchorX} ${anchorY} L ${elbowX} ${anchorY} L ${fromBubble.x} ${fromBubble.y}`,
    );
    leader.setAttribute('fill', 'none');
    leader.setAttribute('stroke', COMMENT_LEADER_STROKE_HEX);
    leader.setAttribute('stroke-width', '1');
    const text = this.buildCommentText(comment.text, bodyX + 4, bodyY - 4, ctx.viewState.fontScale);
    this.overlayGroup.appendChild(leader);
    this.overlayGroup.appendChild(text);
  }

  private buildCommentText(
    content: string,
    x: number,
    y: number,
    fontScale: RenderContext['viewState']['fontScale'],
  ): SVGTextElement {
    const text = document.createElementNS(SVG_NS, 'text');
    text.textContent = content;
    text.setAttribute('x', String(x));
    text.setAttribute('y', String(y));
    text.setAttribute('dominant-baseline', 'middle');
    // The comment body follows the font scale and equals the minor-category name
    // size at that scale (CR-005 Part 4), from the SINGLE shared source.
    text.setAttribute('font-size', String(minorCategoryNameFontPx(fontScale)));
    text.setAttribute('fill', ITEM_LABEL_HEX);
    // Match the bubble's pointer (finger) cursor over the comment text (CURS-L1-005).
    text.setAttribute('cursor', 'pointer');
    return text;
  }
}

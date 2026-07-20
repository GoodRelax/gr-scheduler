/**
 * Adapter layer: the BASELINE reference underlay (CR-002 Part 3 / PLAN-L1-004,
 * H-1 split). A separately-loaded past-plan snapshot document is drawn as a grey,
 * read-only bar behind the live glyphs, id-matched to the current items and placed
 * at the SAME row height as the current item (no offset track). Only baseline
 * entries whose current item has a placement and intersect the viewport are drawn,
 * so the underlay node count stays bounded by the visible matched set.
 *
 * The visibility toggle ({@link RenderContext.baselineVisible}) is independent of
 * the plan/actual display filter: an invisible or unloaded baseline draws nothing.
 */

import type { ViewportWindow } from '../../../domain/usecase/viewport.js';
import { dateToWorldX } from '../../../domain/usecase/time-coordinate-mapper.js';
import { collectBaselineGhosts } from '../../../domain/usecase/progress-line-builder.js';
import {
  PREVIOUS_PLAN_GHOST_FILL_HEX,
  PREVIOUS_PLAN_GHOST_STROKE_HEX,
} from '../../../domain/usecase/render-tokens.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the baseline reference underlay bars into its own content-space group. */
export class GhostLayer {
  public constructor(private readonly ghostGroup: SVGGElement) {}

  /** Clear and redraw the baseline underlay for the current viewport. */
  public render(ctx: RenderContext, window: ViewportWindow): void {
    while (this.ghostGroup.firstChild !== null) {
      this.ghostGroup.removeChild(this.ghostGroup.firstChild);
    }
    if (ctx.scheduleDocument === null) {
      return;
    }
    // The underlay is only drawn when a baseline is loaded AND its toggle is on
    // (independent of the plan/actual display filter, CR-002 Part 3).
    if (!ctx.baselineVisible || ctx.baselineDocument === null) {
      return;
    }
    const epoch = ctx.scheduleDocument.epochDate;
    const zoomX = ctx.viewState.zoomX;
    // Match the baseline items to the current document by id (matchKey = item id).
    const currentItemIds = new Set(ctx.scheduleDocument.items.map((item) => item.id));
    for (const ghost of collectBaselineGhosts(ctx.baselineDocument.items, currentItemIds)) {
      const placement = ctx.placementById.get(ghost.itemId);
      if (placement === undefined) {
        continue; // current item culled (collapsed/filtered): drop its underlay too.
      }
      const startX = dateToWorldX(ghost.startDate, epoch, zoomX);
      const endX = dateToWorldX(ghost.endDate ?? ghost.startDate, epoch, zoomX);
      const width = Math.max(6, endX - startX);
      if (startX + width < window.worldLeft || startX > window.worldRight) {
        continue;
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
      // Placed at the SAME row height as the current item (no offset track), so the
      // grey baseline reads as "where this bar USED to be" directly under it.
      rect.setAttribute('data-role', 'baseline-underlay');
      rect.setAttribute('data-item-id', ghost.itemId);
      rect.setAttribute('x', String(startX));
      rect.setAttribute('y', String(placement.worldY));
      rect.setAttribute('width', String(width));
      rect.setAttribute('height', String(placement.worldHeight));
      rect.setAttribute('rx', '2');
      rect.setAttribute('fill', PREVIOUS_PLAN_GHOST_FILL_HEX);
      rect.setAttribute('fill-opacity', '0.55');
      rect.setAttribute('stroke', PREVIOUS_PLAN_GHOST_STROKE_HEX);
      rect.setAttribute('stroke-dasharray', '3 2');
      this.ghostGroup.appendChild(rect);
    }
  }
}

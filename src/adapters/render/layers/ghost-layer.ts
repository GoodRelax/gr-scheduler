/**
 * Adapter layer: the pre-change plan of each changed item drawn as a grayed ghost
 * bar in world space, behind the live glyphs (PLAN-L1-004, H-1 split). Only ghosts
 * for items that still have a current placement and intersect the viewport are
 * drawn, so the ghost node count stays bounded by the visible edited set.
 */

import type { ViewportWindow } from '../../../domain/usecase/viewport.js';
import { dateToWorldX } from '../../../domain/usecase/time-coordinate-mapper.js';
import { collectPreviousPlanGhosts } from '../../../domain/usecase/progress-line-builder.js';
import {
  PREVIOUS_PLAN_GHOST_FILL_HEX,
  PREVIOUS_PLAN_GHOST_STROKE_HEX,
} from '../../../domain/usecase/render-tokens.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the previous-plan ghost bars into its own content-space group. */
export class GhostLayer {
  public constructor(private readonly ghostGroup: SVGGElement) {}

  /** Clear and redraw the ghost bars for the current viewport. */
  public render(ctx: RenderContext, window: ViewportWindow): void {
    while (this.ghostGroup.firstChild !== null) {
      this.ghostGroup.removeChild(this.ghostGroup.firstChild);
    }
    if (ctx.scheduleDocument === null) {
      return;
    }
    const epoch = ctx.scheduleDocument.epochDate;
    const zoomX = ctx.viewState.zoomX;
    // TODO(IM3): collectPreviousPlanGhosts is neutralized to [] (CR-002 Part 3 moves the
    // baseline to a separately-loaded reference document + gray underlay layer), so this
    // loop draws nothing until the baseline-reference loader lands. Kept wired so the
    // layer is ready to render the IM3 underlay.
    for (const ghost of collectPreviousPlanGhosts(ctx.scheduleDocument.items)) {
      const placement = ctx.placementById.get(ghost.itemId);
      if (placement === undefined) {
        continue; // current item culled (collapsed/filtered): drop its ghost too.
      }
      const startX = dateToWorldX(ghost.startDate, epoch, zoomX);
      const endX = dateToWorldX(ghost.endDate ?? ghost.startDate, epoch, zoomX);
      const width = Math.max(6, endX - startX);
      if (startX + width < window.worldLeft || startX > window.worldRight) {
        continue;
      }
      const rect = document.createElementNS(SVG_NS, 'rect');
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

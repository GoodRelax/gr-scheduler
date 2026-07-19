/**
 * Adapter layer: the faint decorative gridlines behind everything (H-1 split).
 * VERTICAL lines at the current LOD date ticks and HORIZONTAL lines at every
 * category (middle/minor) row boundary. Both default ON (absent flag treated as
 * visible) and are togglable via the palette. Bounded by the visible tick/row
 * count so it never threatens the 60fps target; aria-hidden decorative content.
 */

import { buildDateRuler } from '../../../domain/usecase/date-ruler.js';
import type { ViewportWindow } from '../../../domain/usecase/viewport.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/**
 * Faint gridline stroke color + opacity (fix 5). "As faint as barely visible": a
 * dark hairline at ~0.08 alpha reads as a subtle grid on the white canvas without
 * competing with items. Decorative only (the group is aria-hidden).
 */
const GRID_LINE_STROKE = '#1e293b';
const GRID_LINE_OPACITY = '0.08';
const GRID_LINE_WIDTH = '1';

/** Draws the vertical date-tick and horizontal category-boundary gridlines. */
export class GridLayer {
  public constructor(private readonly gridGroup: SVGGElement) {}

  /**
   * Redraw the gridlines for the current viewport. Clears its own group then
   * appends the date and/or category lines per the view-state toggles.
   */
  public render(ctx: RenderContext, window: ViewportWindow): void {
    while (this.gridGroup.firstChild !== null) {
      this.gridGroup.removeChild(this.gridGroup.firstChild);
    }
    if (ctx.scheduleDocument === null) {
      return;
    }
    if (ctx.viewState.gridDateLinesVisible !== false) {
      this.renderDateGridlines(ctx, window);
    }
    if (ctx.viewState.gridCategoryLinesVisible !== false) {
      this.renderCategoryGridlines(ctx, window);
    }
  }

  /** Append one faint gridline to the grid group. */
  private appendGridLine(x1: number, y1: number, x2: number, y2: number): void {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    line.setAttribute('stroke', GRID_LINE_STROKE);
    line.setAttribute('stroke-opacity', GRID_LINE_OPACITY);
    line.setAttribute('stroke-width', GRID_LINE_WIDTH);
    this.gridGroup.appendChild(line);
  }

  /**
   * Faint VERTICAL hairlines at the finest visible date-ruler boundaries (year /
   * month / day, matching the current LOD), so the timeline reads as a grid. The
   * ruler cells are computed in screen space; each boundary is mapped back to world
   * x (the grid group is inside the scrolled content group) so the lines track zoom
   * and pan exactly and align with the ruler ticks above.
   */
  private renderDateGridlines(ctx: RenderContext, window: ViewportWindow): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    const leftPaneWidth = ctx.leftPaneWidth;
    const scheduleWidth = Math.max(0, ctx.canvasSize.widthPx - leftPaneWidth);
    const ruler = buildDateRuler(ctx.scheduleDocument.epochDate, ctx.viewState, scheduleWidth);
    const finestTier = ruler.tiers[ruler.tiers.length - 1];
    if (finestTier === undefined) {
      return;
    }
    for (const cell of finestTier.cells) {
      // Screen x -> world x: screen = world - scrollX + leftPaneWidth.
      const worldX = cell.startScreenX + ctx.viewState.scrollX - leftPaneWidth;
      this.appendGridLine(worldX, window.worldTop, worldX, window.worldBottom);
    }
  }

  /**
   * Faint HORIZONTAL hairlines at every display-row boundary. Each visible display
   * row is a leaf at the current vertical LOD, so a line at every row top draws the
   * middle/minor category boundaries as a grid. Bounded by the visible row count.
   */
  private renderCategoryGridlines(ctx: RenderContext, window: ViewportWindow): void {
    const rowCount = ctx.displayRows.length;
    for (let rowIndex = 0; rowIndex <= rowCount; rowIndex += 1) {
      // Boundary y between rows follows variable row heights (multi-lane stacking):
      // boundary(0) = top, boundary(rowCount) = bottom of the last (possibly tall) row.
      const worldY = ctx.rowBoundary(rowIndex);
      if (worldY < window.worldTop || worldY > window.worldBottom) {
        continue;
      }
      this.appendGridLine(window.worldLeft, worldY, window.worldRight, worldY);
    }
  }
}

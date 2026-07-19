/**
 * Adapter layer: the fixed top date-ruler (item25/26/50, H-1 split). The tiers
 * (year / year+month / month+day+weekday) follow the current horizontal zoom via
 * the ruler model. The whole band is screen-space at the top of the canvas, so it
 * stays visible on vertical scroll while its cells track horizontal scroll/zoom.
 */

import { buildDateRuler } from '../../../domain/usecase/date-ruler.js';
import {
  RULER_BACKGROUND_HEX,
  RULER_BORDER_HEX,
  RULER_LABEL_HEX,
  SECTION_LINE_HEX,
} from '../../../domain/usecase/render-tokens.js';
import { RULER_TIER_HEIGHT_PX, SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the fixed date ruler as the topmost overlay band. */
export class RulerLayer {
  public constructor(private readonly overlayGroup: SVGGElement) {}

  /** Append the date-ruler band (drawn LAST so it stays above the top strip). */
  public render(ctx: RenderContext): void {
    if (ctx.scheduleDocument === null) {
      return;
    }
    const leftPaneWidth = ctx.leftPaneWidth;
    const scheduleWidth = Math.max(0, ctx.canvasSize.widthPx - leftPaneWidth);
    const ruler = buildDateRuler(ctx.scheduleDocument.epochDate, ctx.viewState, scheduleWidth);
    const totalHeight = ruler.tiers.length * RULER_TIER_HEIGHT_PX;
    if (totalHeight === 0) {
      return;
    }
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-role', 'date-ruler');
    group.setAttribute('data-granularity', ruler.granularity);
    // Expose the tier count so tests/AT can see the stacked-tier structure without
    // parsing geometry (item26: year-month / day / weekday at the finest zoom).
    group.setAttribute('data-tier-count', String(ruler.tiers.length));
    group.setAttribute('pointer-events', 'none');

    // Opaque background so the timeline scrolls UNDER the ruler like a Gantt header.
    const background = document.createElementNS(SVG_NS, 'rect');
    background.setAttribute('x', String(leftPaneWidth));
    background.setAttribute('y', '0');
    background.setAttribute('width', String(scheduleWidth));
    background.setAttribute('height', String(totalHeight));
    background.setAttribute('fill', RULER_BACKGROUND_HEX);
    background.setAttribute('stroke', 'none');
    group.appendChild(background);

    const rightEdge = leftPaneWidth + scheduleWidth;
    ruler.tiers.forEach((tier, tierIndex) => {
      const bandTop = tierIndex * RULER_TIER_HEIGHT_PX;
      const bandBottom = bandTop + RULER_TIER_HEIGHT_PX;
      for (const cell of tier.cells) {
        // Cull cells fully outside the schedule strip (bounded node count, M-02).
        if (cell.endScreenX < leftPaneWidth || cell.startScreenX > rightEdge) {
          continue;
        }
        // Density-aware LOD: the day / weekday tiers thin their labels to an empty
        // string when a day cell is too narrow to hold text. Skip drawing both the
        // separator and the label for those cells so the tier never overlaps.
        if (cell.label.length === 0) {
          continue;
        }
        const separator = document.createElementNS(SVG_NS, 'line');
        const separatorX = Math.max(leftPaneWidth, cell.startScreenX);
        separator.setAttribute('x1', String(separatorX));
        separator.setAttribute('x2', String(separatorX));
        separator.setAttribute('y1', String(bandTop));
        separator.setAttribute('y2', String(bandBottom));
        separator.setAttribute('stroke', SECTION_LINE_HEX);
        separator.setAttribute('stroke-width', '1');
        group.appendChild(separator);

        // Center the label within the visible portion of the cell.
        const visibleLeft = Math.max(leftPaneWidth, cell.startScreenX);
        const visibleRight = Math.min(rightEdge, cell.endScreenX);
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('data-role', 'date-ruler-label');
        label.setAttribute('data-tier', String(tierIndex));
        label.setAttribute('data-unit', tier.unit);
        label.textContent = cell.label;
        label.setAttribute('x', String((visibleLeft + visibleRight) / 2));
        label.setAttribute('y', String(bandTop + RULER_TIER_HEIGHT_PX / 2));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'middle');
        label.setAttribute('font-size', '10');
        label.setAttribute('font-family', 'system-ui, sans-serif');
        label.setAttribute('fill', RULER_LABEL_HEX);
        group.appendChild(label);
      }
      // Bottom border of the tier band.
      const border = document.createElementNS(SVG_NS, 'line');
      border.setAttribute('x1', String(leftPaneWidth));
      border.setAttribute('x2', String(rightEdge));
      border.setAttribute('y1', String(bandBottom));
      border.setAttribute('y2', String(bandBottom));
      border.setAttribute('stroke', RULER_BORDER_HEX);
      border.setAttribute('stroke-width', '1');
      group.appendChild(border);
    });

    this.overlayGroup.appendChild(group);
  }
}

/**
 * Adapter layer: the thin horizontal classification (section) lines behind the
 * items (SECT-L1-001, H-1 split). One line at the top of each visible section
 * band; the line spans only the visible width so it never costs more than a
 * handful of nodes regardless of the total schedule extent.
 */

import type { ViewportWindow } from '../../../domain/usecase/viewport.js';
import { SECTION_LINE_HEX } from '../../../domain/usecase/render-tokens.js';
import { SVG_NS, type RenderContext } from '../render-context.js';

/** Draws the section-boundary lines into its own content-space group. */
export class ClassificationLayer {
  public constructor(private readonly classificationGroup: SVGGElement) {}

  /** Clear and redraw the classification lines for the current viewport. */
  public render(ctx: RenderContext, window: ViewportWindow): void {
    while (this.classificationGroup.firstChild !== null) {
      this.classificationGroup.removeChild(this.classificationGroup.firstChild);
    }
    for (const band of ctx.sectionBands) {
      const worldY = ctx.rowBoundary(band.startRowIndex);
      if (worldY < window.worldTop || worldY > window.worldBottom) {
        continue;
      }
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(window.worldLeft));
      line.setAttribute('x2', String(window.worldRight));
      line.setAttribute('y1', String(worldY));
      line.setAttribute('y2', String(worldY));
      line.setAttribute('stroke', SECTION_LINE_HEX);
      line.setAttribute('stroke-width', '1.5');
      this.classificationGroup.appendChild(line);
    }
  }
}
